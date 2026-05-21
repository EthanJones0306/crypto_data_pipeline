import requests
import time
import logging
import json

logger = logging.getLogger(__name__)

def get_stock_prices(api_key):
    """Fetch stock prices from Alpha Vantage API"""
    symbols = ['AAPL', 'GOOG', 'NVDA']
    stock_data = {}
    
    if not api_key:
        logger.warning("No Alpha Vantage API key configured")
        return None
    
    for symbol in symbols:
        api_url = f'https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol={symbol}&apikey={api_key}'
        
        try:
            response = requests.get(api_url, timeout=10)
            response.raise_for_status()
            data = response.json()
            
            # Log full response for debugging
            logger.info(f"Alpha Vantage raw response for {symbol}: {json.dumps(data)}")
            
            # Check for error message in response
            if 'Error Message' in data:
                logger.error(f"Alpha Vantage error for {symbol}: {data['Error Message']}")
            elif 'Note' in data:
                logger.warning(f"Alpha Vantage rate limit/note: {data['Note']}")
            else:
                quote = data.get('Global Quote', {})
                if quote and quote.get('05. price'):
                    stock_data[symbol] = quote
                    logger.info(f"✓ Successfully fetched {symbol}: ${quote.get('05. price')}")
                else:
                    logger.warning(f"✗ Empty quote data for {symbol}. Full response: {json.dumps(data)}")
            
            time.sleep(1)  # Wait 1 second between requests to avoid rate limiting
        except Exception as e:
            logger.error(f"Exception fetching {symbol}: {e}")
    
    return stock_data if stock_data else None

