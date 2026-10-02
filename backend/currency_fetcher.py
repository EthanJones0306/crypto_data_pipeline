import logging

import requests

from . import price_cache

logger = logging.getLogger(__name__)

RATES_TTL = 6 * 3600
CURRENCIES = ('USD', 'EUR', 'GBP')


def get_zar_exchange_rates():
    """Return ZAR per unit of USD/EUR/GBP. Rates only update daily, so they're cached for hours."""
    cached = {c: price_cache.get('fx', c) for c in CURRENCIES}
    if all(cached.values()) and max(price_cache.age(e) for e in cached.values()) < RATES_TTL:
        return {c: e['price'] for c, e in cached.items()}

    try:
        response = requests.get(
            'https://api.frankfurter.dev/v1/latest',
            params={'base': 'ZAR', 'symbols': ','.join(CURRENCIES)},
            timeout=8,
        )
        response.raise_for_status()
        rates_raw = response.json()['rates']
        rates = {c: round(1 / rates_raw[c], 2) for c in CURRENCIES}
        price_cache.put_many('fx', rates)
        return rates
    except (requests.RequestException, KeyError, ValueError, ZeroDivisionError) as e:
        logger.warning(f"Currency API error: {e}")

    if all(cached.values()):
        return {c: e['price'] for c, e in cached.items()}
    return None
