from fetch_crypto import get_crypto_prices
from currency_fetcher import get_zar_exchange_rates
from database import initialise_db, store_prices, store_rates

# Initialise database
initialise_db()

# Fetch all data
print("Fetching cryptocurrency prices...")
crypto_prices = get_crypto_prices()

print("Fetching ZAR exchange rates...")
exchange_rates = get_zar_exchange_rates()

# Store data
if crypto_prices:
    store_prices(crypto_prices)
else:
    print("Failed to fetch crypto prices")

if exchange_rates:
    store_rates(exchange_rates)
else:
    print("Failed to fetch exchange rates")

print("All data fetched and stored successfully!")