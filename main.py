import os
from dotenv import load_dotenv
from fetch_crypto import get_crypto_prices
from currency_fetcher import get_zar_exchange_rates
from database import initialise_db, store_prices, store_rates, store_stock_prices
from fetch_stocks import get_stock_prices

load_dotenv()
API_KEY_stocks = os.getenv('ALPHA_VANTAGE_API_KEY')

# Initialise database
initialise_db()

# Fetch all data
print("Fetching cryptocurrency prices...")
crypto_prices = get_crypto_prices()

print("Fetching stock prices...")
stock_prices = get_stock_prices(API_KEY_stocks)

print("Fetching ZAR exchange rates...")
exchange_rates = get_zar_exchange_rates()


# Store data
if crypto_prices:
    store_prices(crypto_prices)
else:
    print("Failed to fetch crypto prices")

if stock_prices:
    store_stock_prices(stock_prices)  # Use new function
else:
    print("Failed to fetch stock prices")

if exchange_rates:
    store_rates(exchange_rates)
else:
    print("Failed to fetch exchange rates")

print("All data fetched and stored successfully!")