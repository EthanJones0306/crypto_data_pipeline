import requests

def get_crypto_prices():
    """Fetch cryptocurrency prices from CoinGecko API"""
    api_url = 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=usd'
    
    try:
        response = requests.get(api_url)
        response.raise_for_status()
        data = response.json()
        return data
    except Exception as e:
        print(f"Error fetching crypto prices: {e}")
        return None