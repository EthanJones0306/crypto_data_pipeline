import os
import logging
from pathlib import Path
from dotenv import load_dotenv

# Ensure imports work when backend files live in `backend/` but the project
# is run from the repository root. 
# Load the project's .env and set the
# working directory to the repo root so relative cache/status files resolve
# consistently.
PROJECT_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(PROJECT_ROOT / '.env')
os.chdir(PROJECT_ROOT)

from .fetch_crypto import get_crypto_prices
from .currency_fetcher import get_zar_exchange_rates
from .database import initialise_db, store_prices, store_rates, store_stock_prices
from .fetch_stocks import get_stock_prices
from .api import get_stock_api_key
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


def run_pipeline():
    """Fetches all financial data and stores it in the database."""
    
    # Initialise database
    initialise_db()
    # Select stock API key according to configured provider
    API_KEY_stocks = get_stock_api_key()

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
        store_stock_prices(stock_prices)  
    else:
        logger.warning("Failed to fetch stock prices")

    if exchange_rates:
        store_rates(exchange_rates)
    else:
        logger.warning("Failed to fetch exchange rates")

    logger.info("All data fetched and stored successfully!")

if __name__ == "__main__":
    run_pipeline()