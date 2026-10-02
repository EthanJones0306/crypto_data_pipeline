"""CoinGecko prices, served from the local cache.

CoinGecko's free tier rate-limits aggressively, so requests never wait on it
for a price we already have. Stale prices trigger one batched background
refresh covering every coin in use; only a never-seen coin is fetched inline.
"""
import logging
import os
import threading
import time

import requests

from . import price_cache
from .api_status import log_api_call

logger = logging.getLogger(__name__)

SIMPLE_PRICE_URL = 'https://api.coingecko.com/api/v3/simple/price'
DEFAULT_IDS = ['bitcoin', 'ethereum', 'solana']
TTL_SECONDS = int(os.getenv('CRYPTO_PRICE_TTL', '60'))
TRACK_WINDOW = 24 * 3600
MAX_BATCH = 100

_API_KEY = os.getenv('COINGECKO_API_KEY')
# Shared with /search/crypto, which hits the same per-IP limit.
GATE = price_cache.RateGate('CoinGecko', max_calls=25 if _API_KEY else 8, period=60)

_last_requested = {}
_refresh_lock = threading.Lock()


def coingecko_headers():
    return {'x-cg-demo-api-key': _API_KEY} if _API_KEY else {}


def _tracked_ids(extra=()):
    cutoff = time.time() - TRACK_WINDOW
    recent = [cid for cid, ts in _last_requested.items() if ts > cutoff]
    ids = list(dict.fromkeys([*extra, *DEFAULT_IDS, *recent]))
    return ids[:MAX_BATCH]


def _fetch(ids):
    if not ids or not GATE.try_acquire():
        return False
    try:
        response = requests.get(
            SIMPLE_PRICE_URL,
            params={'ids': ','.join(ids), 'vs_currencies': 'usd'},
            headers=coingecko_headers(),
            timeout=8,
        )
        log_api_call('coingecko', rate_limit=1000)
        if response.status_code == 429:
            GATE.backoff(price_cache.retry_after(response))
            return False
        response.raise_for_status()
        prices = {cid: v['usd'] for cid, v in response.json().items() if isinstance(v, dict) and 'usd' in v}
        price_cache.put_many('crypto', prices)
        logger.info(f"✅ CoinGecko refreshed {len(prices)} prices in one call")
        return True
    except requests.RequestException as e:
        logger.warning(f"CoinGecko request failed: {e}")
        GATE.backoff(30)
        return False


def _refresh_in_background(ids):
    if not _refresh_lock.acquire(blocking=False):
        return

    def run():
        try:
            _fetch(ids)
        finally:
            _refresh_lock.release()

    threading.Thread(target=run, daemon=True).start()


def _as_result(entry):
    return {'usd': entry['price'], 'as_of': price_cache.iso(entry)}


def get_crypto_prices(asset_ids=None):
    """Return {coin_id: {'usd': price, 'as_of': iso}} for coins we have prices for."""
    ids = list(dict.fromkeys(asset_ids or DEFAULT_IDS))
    now = time.time()
    for cid in ids:
        _last_requested[cid] = now

    entries = {cid: price_cache.get('crypto', cid) for cid in ids}
    missing = [cid for cid, e in entries.items() if e is None]

    if missing:
        with _refresh_lock:
            if _fetch(_tracked_ids(missing)):
                entries = {cid: price_cache.get('crypto', cid) for cid in ids}
    elif any(price_cache.age(e) > TTL_SECONDS for e in entries.values()):
        _refresh_in_background(_tracked_ids(ids))

    return {cid: _as_result(e) for cid, e in entries.items() if e}


def get_crypto_price(crypto_id):
    """Return {'usd': price, 'as_of': iso} or None if we have never seen a price for this coin."""
    result = get_crypto_prices([crypto_id]).get(crypto_id)
    if result is None:
        logger.warning(f"❌ No price available for {crypto_id}")
    return result
