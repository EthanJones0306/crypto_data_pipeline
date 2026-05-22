import requests
import json
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

# Fallback prices (last known good prices as safety net)
FALLBACK_PRICES = {
    'bitcoin': {'usd': 42500},
    'ethereum': {'usd': 2250},
    'solana': {'usd': 98}
}

def load_cached_crypto_prices():
    """Load cached crypto prices if within 24-hour TTL"""
    try:
        with open('crypto_prices_cache.json', 'r') as f:
            cache = json.load(f)
            
        # Check if cache is still valid (within 24 hours)
        cached_time = datetime.fromisoformat(cache.get('timestamp', ''))
        time_diff = (datetime.now() - cached_time).total_seconds()
        
        if time_diff < 86400:  # 24 hours in seconds
            logger.info(f"Using cached crypto prices (age: {time_diff/3600:.1f} hours)")
            return cache.get('data')
        else:
            logger.info("Crypto price cache expired")
            return None
    except Exception as e:
        logger.debug(f"No valid crypto cache: {e}")
        return None

def save_cached_crypto_prices(data):
    """Save crypto prices to cache with timestamp"""
    try:
        cache = {
            'timestamp': datetime.now().isoformat(),
            'data': data
        }
        with open('crypto_prices_cache.json', 'w') as f:
            json.dump(cache, f)
        logger.info("Cached crypto prices saved")
    except Exception as e:
        logger.warning(f"Failed to cache crypto prices: {e}")

def get_crypto_prices():
    """
    Fetch cryptocurrency prices with fallback strategy:
    1. Primary: CoinGecko API
    2. Fallback 1: Cached prices (24-hour TTL)
    3. Fallback 2: Last known prices
    """
    api_url = 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=usd'
    
    # Try CoinGecko API first
    try:
        logger.info("Attempting to fetch crypto prices from CoinGecko...")
        response = requests.get(api_url, timeout=5)  # 5 second timeout
        response.raise_for_status()
        data = response.json()
        logger.info(f"✅ Successfully fetched from CoinGecko: {list(data.keys())}")
        
        # Save to cache on success
        save_cached_crypto_prices(data)
        return data
        
    except requests.exceptions.Timeout:
        logger.warning("⏱️ CoinGecko API timeout (rate limited or slow)")
    except requests.exceptions.ConnectionError:
        logger.warning("❌ Connection error to CoinGecko API")
    except requests.exceptions.HTTPError as e:
        logger.warning(f"❌ HTTP error from CoinGecko: {e.response.status_code}")
    except Exception as e:
        logger.warning(f"❌ Error fetching from CoinGecko: {e}")
    
    # Fallback 1: Try cached prices
    logger.info("Trying cached prices...")
    cached_data = load_cached_crypto_prices()
    if cached_data:
        logger.info(f"📦 Using cached prices for: {list(cached_data.keys())}")
        return cached_data
    
    # Fallback 2: Use last known prices
    logger.warning(f"⚠️ Using fallback prices (may be stale)")
    return FALLBACK_PRICES