import requests
from database import initialize_db, store_prices

initialize_db()

api_url = 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=usd'
print("Fetching live crypto prices...")

try:
    response = requests.get(api_url)
    response.raise_for_status()
    data = response.json()
    store_prices(data)
except Exception as e:
    print(f"Error fetching data: {e}")

print("Fetch complete.")