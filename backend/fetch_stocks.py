"""Stock prices, served from the local cache.

Finnhub (60 calls/min) is generous, so stale prices are refreshed on demand
with a short TTL. Alpha Vantage allows only 25 calls/day, so it gets a long
TTL and a hard daily budget. Either way, a failed call falls back to the last
real price rather than a made-up one.
"""
import logging
import os

import requests

from . import price_cache
from .api_status import load_status, log_api_call

logger = logging.getLogger(__name__)

DEFAULT_SYMBOLS = ['AAPL', 'GOOG', 'NVDA']
FINNHUB_TTL = int(os.getenv('FINNHUB_PRICE_TTL', '60'))
ALPHAVANTAGE_TTL = int(os.getenv('ALPHAVANTAGE_PRICE_TTL', str(6 * 3600)))
ALPHAVANTAGE_RESERVE = 3

FINNHUB_GATE = price_cache.RateGate('Finnhub', max_calls=50, period=60)
ALPHAVANTAGE_GATE = price_cache.RateGate('Alpha Vantage', max_calls=22, period=24 * 3600)


def _provider():
    return os.getenv('STOCK_PRICE_PROVIDER', 'finnhub').lower()


def _resolve_key(api_key):
    if api_key:
        return api_key
    return os.getenv('FINNHUB_API_KEY') if _provider() == 'finnhub' else os.getenv('ALPHA_VANTAGE_API_KEY')


def _fetch_finnhub(symbol, api_key):
    if not FINNHUB_GATE.try_acquire():
        return None
    try:
        response = requests.get('https://finnhub.io/api/v1/quote', params={'symbol': symbol, 'token': api_key}, timeout=6)
        remaining = response.headers.get('X-Ratelimit-Remaining')
        log_api_call('finnhub', int(remaining) if remaining else None, 60)
        if response.status_code == 429:
            FINNHUB_GATE.backoff(price_cache.retry_after(response, 60))
            return None
        response.raise_for_status()
        price = response.json().get('c')
        return float(price) if price else None
    except (requests.RequestException, ValueError) as e:
        logger.warning(f"Finnhub request for {symbol} failed: {e}")
        return None


def _alphavantage_budget_left():
    try:
        return load_status()['providers']['alphavantage']['calls_remaining'] > ALPHAVANTAGE_RESERVE
    except (KeyError, TypeError):
        return True


def _fetch_alphavantage(symbol, api_key):
    if not _alphavantage_budget_left() or not ALPHAVANTAGE_GATE.try_acquire():
        return None
    try:
        response = requests.get(
            'https://www.alphavantage.co/query',
            params={'function': 'GLOBAL_QUOTE', 'symbol': symbol, 'apikey': api_key},
            timeout=8,
        )
        log_api_call('alphavantage', rate_limit=25)
        response.raise_for_status()
        data = response.json()
        if 'Note' in data or 'Information' in data:
            logger.warning(f"Alpha Vantage limit reached: {data.get('Note') or data.get('Information')}")
            ALPHAVANTAGE_GATE.backoff(3600)
            return None
        price = data.get('Global Quote', {}).get('05. price')
        return float(price) if price else None
    except (requests.RequestException, ValueError) as e:
        logger.warning(f"Alpha Vantage request for {symbol} failed: {e}")
        return None


def _as_result(symbol, entry):
    return {'05. price': str(entry['price']), '02. name': symbol, 'as_of': price_cache.iso(entry)}


def get_stock_price(symbol, api_key=None):
    """Return {'05. price': str, '02. name': symbol, 'as_of': iso} or None."""
    symbol = symbol.upper()
    entry = price_cache.get('stock', symbol)
    finnhub = _provider() == 'finnhub'
    ttl = FINNHUB_TTL if finnhub else ALPHAVANTAGE_TTL

    if entry and price_cache.age(entry) < ttl:
        return _as_result(symbol, entry)

    key = _resolve_key(api_key)
    if key:
        price = _fetch_finnhub(symbol, key) if finnhub else _fetch_alphavantage(symbol, key)
        if price:
            price_cache.put_many('stock', {symbol: price})
            entry = price_cache.get('stock', symbol)
            logger.info(f"✅ {symbol}: ${price}")
    else:
        logger.warning(f"No stock API key configured; cannot refresh {symbol}")

    if entry:
        return _as_result(symbol, entry)
    logger.warning(f"❌ No price available for {symbol}")
    return None


def get_stock_prices(api_key=None, symbols=None):
    """Return {symbol: quote} for the tracked symbols we have prices for."""
    result = {}
    for symbol in symbols or DEFAULT_SYMBOLS:
        quote = get_stock_price(symbol, api_key)
        if quote:
            result[symbol] = quote
    return result or None
