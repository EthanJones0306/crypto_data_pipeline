import requests
import json
import logging
from datetime import datetime
from api_status import log_api_call

logger = logging.getLogger(__name__)

# Expanded fallback prices database
FALLBACK_PRICES = {
    'bitcoin': {'usd': 42500},
    'ethereum': {'usd': 2250},
    'solana': {'usd': 98},
    'dogecoin': {'usd': 0.18},
    'cardano': {'usd': 0.50},
    'polkadot': {'usd': 6.50},
    'ripple': {'usd': 2.10},
    'litecoin': {'usd': 95},
    'chainlink': {'usd': 14.50},
    'uniswap': {'usd': 9.50},
    'avalanche-2': {'usd': 26},
    'fantom': {'usd': 0.65},
    'polygon': {'usd': 0.65},
    'arbitrum': {'usd': 1.20},
    'optimism': {'usd': 2.80},
    'monero': {'usd': 185},
    'zcash': {'usd': 47},
    'cosmos': {'usd': 8.50},
    'tron': {'usd': 0.110},
    'stellar': {'usd': 0.11}
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
            logger.info(f"📦 Using cached crypto prices (age: {time_diff/3600:.1f} hours)")
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

def get_crypto_price(crypto_id):
    """
    Fetch price for a single cryptocurrency with fallback strategy:
    1. Primary: CoinGecko API
    2. Fallback 1: Cached price
    3. Fallback 2: Last known price
    
    Args:
        crypto_id: CoinGecko cryptocurrency ID (e.g., 'bitcoin', 'ethereum', 'dogecoin')
    
    Returns:
        dict with 'usd' key, or None if not found
    """
    try:
        # Try CoinGecko API first
        url = f"https://api.coingecko.com/api/v3/simple/price?ids={crypto_id}&vs_currencies=usd"
        response = requests.get(url, timeout=5)
        response.raise_for_status()
        data = response.json()
        
        # Log the API call (CoinGecko doesn't have strict rate limits in headers)
        log_api_call('coingecko', rate_limit=1000)
        
        if crypto_id in data:
            logger.info(f"✅ Fetched price for {crypto_id}: ${data[crypto_id]['usd']}")
            return data[crypto_id]
    except Exception as e:
        logger.debug(f"Could not fetch {crypto_id} from CoinGecko: {e}")
        log_api_call('coingecko', rate_limit=1000)
    
    # Fallback: Use hardcoded price
    if crypto_id in FALLBACK_PRICES:
        logger.warning(f"⚠️ Using fallback price for {crypto_id}: ${FALLBACK_PRICES[crypto_id]['usd']}")
        return FALLBACK_PRICES[crypto_id]
    
    logger.error(f"❌ No price available for {crypto_id}")
    return None

def get_crypto_prices(asset_ids=None):
    """
    Fetch cryptocurrency prices with fallback strategy:
    1. Primary: CoinGecko API (for specified assets or defaults)
    2. Fallback 1: Cached prices (24-hour TTL)
    3. Fallback 2: Last known prices
    
    Args:
        asset_ids: List of CoinGecko IDs to fetch (default: bitcoin, ethereum, solana)
    
    Returns:
        dict of {asset_id: {'usd': price}}
    """
    if asset_ids is None:
        asset_ids = ['bitcoin', 'ethereum', 'solana']
    
    api_url = f"https://api.coingecko.com/api/v3/simple/price?ids={','.join(asset_ids)}&vs_currencies=usd"
    
    # Try CoinGecko API first
    try:
        logger.info(f"Attempting to fetch crypto prices from CoinGecko for: {asset_ids}...")
        response = requests.get(api_url, timeout=5)  # 5 second timeout
        response.raise_for_status()
        data = response.json()
        
        # Log the API call
        log_api_call('coingecko', rate_limit=1000)
        
        logger.info(f"✅ Successfully fetched from CoinGecko: {list(data.keys())}")
        
        # Save to cache on success
        save_cached_crypto_prices(data)
        return data
        
    except requests.exceptions.Timeout:
        logger.warning("⏱️ CoinGecko API timeout (rate limited or slow)")
        log_api_call('coingecko', rate_limit=1000)
    except requests.exceptions.ConnectionError:
        logger.warning("❌ Connection error to CoinGecko API")
        log_api_call('coingecko', rate_limit=1000)
    except requests.exceptions.HTTPError as e:
        logger.warning(f"❌ HTTP error from CoinGecko: {e.response.status_code}")
        log_api_call('coingecko', rate_limit=1000)
    except Exception as e:
        logger.warning(f"❌ Error fetching from CoinGecko: {e}")
        log_api_call('coingecko', rate_limit=1000)
    
    # Fallback 1: Try cached prices
    logger.info("Trying cached prices...")
    cached_data = load_cached_crypto_prices()
    if cached_data:
        logger.info(f"📦 Using cached prices for: {list(cached_data.keys())}")
        return cached_data
    
    # Fallback 2: Use hardcoded prices for requested assets
    logger.warning(f"⚠️ Using fallback prices for available assets")
    fallback_result = {}
    for asset_id in asset_ids:
        if asset_id in FALLBACK_PRICES:
            fallback_result[asset_id] = FALLBACK_PRICES[asset_id]
    
    return fallback_result if fallback_result else FALLBACK_PRICES