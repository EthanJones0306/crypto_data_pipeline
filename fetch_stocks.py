import requests
import time
import logging
import json
import os
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)
CACHE_FILE = 'stock_prices_cache.json'

def load_cached_prices():
    """Load stock prices from cache if available and not expired"""
    if not os.path.exists(CACHE_FILE):
        return None
    
    try:
        with open(CACHE_FILE, 'r') as f:
            cache = json.load(f)
        
        # Check if cache is less than 24 hours old
        timestamp = datetime.fromisoformat(cache.get('timestamp'))
        if datetime.now() - timestamp < timedelta(hours=24):
            logger.info(f"Using cached stock prices from {timestamp}")
            return cache.get('data')
        else:
            logger.info("Cache expired, will fetch fresh data")
    except Exception as e:
        logger.warning(f"Error reading cache: {e}")
    
    return None

def save_cached_prices(data):
    """Save stock prices to cache with timestamp"""
    try:
        cache = {
            'timestamp': datetime.now().isoformat(),
            'data': data
        }
        with open(CACHE_FILE, 'w') as f:
            json.dump(cache, f, indent=2)
        logger.info("Cached stock prices saved")
    except Exception as e:
        logger.error(f"Error saving cache: {e}")

def get_finnhub_prices(api_key):
    """Fetch stock prices from Finnhub API"""
    symbols = ['AAPL', 'GOOG', 'NVDA']
    stock_data = {}
    
    for symbol in symbols:
        api_url = f'https://finnhub.io/api/v1/quote?symbol={symbol}&token={api_key}'
        
        try:
            response = requests.get(api_url, timeout=10)
            response.raise_for_status()
            data = response.json()
            
            logger.debug(f"Finnhub response for {symbol}: {json.dumps(data)}")
            
            if 'error' in data:
                logger.error(f"Finnhub error for {symbol}: {data['error']}")
            elif data.get('c'):  # 'c' is current price in Finnhub
                # Convert Finnhub format to match Alpha Vantage format for compatibility
                stock_data[symbol] = {
                    '05. price': str(data['c']),
                    '02. name': symbol,
                    '10. volume': str(int(data.get('v', 0)))
                }
                logger.info(f"✓ Fetched {symbol} from Finnhub: ${data['c']}")
            else:
                logger.warning(f"✗ No price data for {symbol} from Finnhub")
            
            time.sleep(0.1)  # Minimal delay, Finnhub allows 60 calls/min
        except Exception as e:
            logger.error(f"Exception fetching {symbol} from Finnhub: {e}")
    
    return stock_data if stock_data else None

def get_alphavantage_prices(api_key):
    """Fetch stock prices from Alpha Vantage API"""
    symbols = ['AAPL', 'GOOG', 'NVDA']
    stock_data = {}
    
    for symbol in symbols:
        api_url = f'https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol={symbol}&apikey={api_key}'
        
        try:
            response = requests.get(api_url, timeout=10)
            response.raise_for_status()
            data = response.json()
            
            logger.debug(f"Alpha Vantage response for {symbol}: {json.dumps(data)}")
            
            if 'Error Message' in data:
                logger.error(f"Alpha Vantage error for {symbol}: {data['Error Message']}")
            elif 'Note' in data:
                logger.warning(f"Alpha Vantage rate limit: {data['Note']}")
            elif 'Information' in data:
                logger.warning(f"Alpha Vantage info: {data['Information']}")
            else:
                quote = data.get('Global Quote', {})
                if quote and quote.get('05. price'):
                    stock_data[symbol] = quote
                    logger.info(f"✓ Fetched {symbol} from Alpha Vantage: ${quote.get('05. price')}")
                else:
                    logger.warning(f"✗ No quote data for {symbol} from Alpha Vantage")
            
            time.sleep(1)  # Alpha Vantage requires 1 second between requests
        except Exception as e:
            logger.error(f"Exception fetching {symbol} from Alpha Vantage: {e}")
    
    return stock_data if stock_data else None

def get_stock_prices(api_key):
    """Fetch stock prices using configured provider (Finnhub or Alpha Vantage)"""
    if not api_key:
        logger.warning("No stock price API key configured")
        cached = load_cached_prices()
        if cached:
            logger.info("No API key, using cached prices")
            return cached
        return None
    
    # Check which provider to use (default: finnhub)
    provider = os.getenv('STOCK_PRICE_PROVIDER', 'finnhub').lower()
    
    logger.info(f"Using stock price provider: {provider}")
    
    # Try cache first
    cached = load_cached_prices()
    if cached:
        logger.info("Using cached stock prices")
        return cached
    
    # Fetch fresh data
    stock_data = None
    
    if provider == 'finnhub':
        stock_data = get_finnhub_prices(api_key)
    elif provider == 'alphavantage':
        stock_data = get_alphavantage_prices(api_key)
    else:
        logger.error(f"Unknown stock price provider: {provider}")
        cached = load_cached_prices()
        if cached:
            return cached
        return None
    
    # Save successful result to cache
    if stock_data:
        save_cached_prices(stock_data)
        return stock_data
    
    # Fall back to cache if fresh fetch failed
    cached = load_cached_prices()
    if cached:
        logger.warning("Fresh fetch failed, using cached prices")
        return cached
    
    return None

