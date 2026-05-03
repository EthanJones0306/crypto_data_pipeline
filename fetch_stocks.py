import requests

def get_crypto_prices():
    """Fetch stock prices from Yahoo Finance API"""
    api_url = 'https://query1.finance.yahoo.com/v7/finance/quote?symbols=AAPL,GOOG,NVDA'
    
    try:
        response = requests.get(api_url)
        response.raise_for_status()
        data = response.json()
        return data
    except Exception as e:
        print(f"Error fetching stock prices: {e}")
        return None