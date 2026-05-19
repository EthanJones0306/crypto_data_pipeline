import os
import logging
from dotenv import load_dotenv
from fetch_crypto import get_crypto_prices
from currency_fetcher import get_zar_exchange_rates
from database import initialise_db, store_prices, store_rates, store_stock_prices
from fetch_stocks import get_stock_prices

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('pipeline.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

load_dotenv()
API_KEY_stocks = os.getenv('ALPHA_VANTAGE_API_KEY')

# Initialise database
initialise_db()

# Fetch all data
logger.info("Fetching cryptocurrency prices...")
crypto_prices = get_crypto_prices()

logger.info("Fetching stock prices...")
stock_prices = get_stock_prices(API_KEY_stocks)

logger.info("Fetching ZAR exchange rates...")
exchange_rates = get_zar_exchange_rates()


# Store data
if crypto_prices:
    store_prices(crypto_prices)
else:
    logger.warning("Failed to fetch crypto prices")

if stock_prices:
    store_stock_prices(stock_prices)  # Use new function
else:
    logger.warning("Failed to fetch stock prices")

if exchange_rates:
    store_rates(exchange_rates)
else:
    logger.warning("Failed to fetch exchange rates")

logger.info("All data fetched and stored successfully!")