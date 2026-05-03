import requests
import time

def get_stock_prices(api_key):
    """Fetch stock prices from Alpha Vantage API"""
    symbols = ['AAPL', 'GOOG', 'NVDA']
    stock_data = {}
    
    for symbol in symbols:
        api_url = f'https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol={symbol}&apikey={api_key}'
        
        try:
            response = requests.get(api_url)
            response.raise_for_status()
            data = response.json()
            stock_data[symbol] = data.get('Global Quote', {})
            time.sleep(1)  # Wait 1 second between requests to avoid rate limiting
        except Exception as e:
            print(f"Error fetching {symbol}: {e}")
    
    return stock_data if stock_data else None

