
"""
Daily cryptocurrency and stock price data fetching scheduler.

Runs the data pipeline automatically at 00:00 (midnight) every day,
fetching crypto prices, stock prices, and exchange rates.

Requires:
- apscheduler: pip install apscheduler
- python-dotenv: pip install python-dotenv
- .env file with ALPHA_VANTAGE_API_KEY
"""
import os
import time
import logging
from datetime import datetime

try:
    from apscheduler.schedulers.background import BackgroundScheduler
except ImportError:
    BackgroundScheduler = None

try:
    from dotenv import load_dotenv
except ImportError:
    def load_dotenv(): return False

from fetch_crypto import get_crypto_prices
from currency_fetcher import get_zar_exchange_rates
from database import initialise_db, store_prices, store_rates, store_stock_prices
from fetch_stocks import get_stock_prices

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

load_dotenv()


def run_pipeline():
    """Run the full data fetching pipeline"""
    logger.info("Running pipeline...")

    # Resolve API key at runtime so env changes are picked up
    provider = os.getenv('STOCK_PRICE_PROVIDER', 'finnhub').lower()
    api_key = (
        os.getenv('FINNHUB_API_KEY')
        if provider == 'finnhub'
        else os.getenv('ALPHA_VANTAGE_API_KEY')
    )

    if not api_key:
        key_name = 'FINNHUB_API_KEY' if provider == 'finnhub' else 'ALPHA_VANTAGE_API_KEY'
        logger.error(f"{key_name} not found — aborting pipeline run")
        return

    try:
        initialise_db()

        logger.info("Fetching cryptocurrency prices...")
        crypto_prices = get_crypto_prices()

        logger.info("Fetching stock prices...")
        stock_prices = get_stock_prices(api_key)

        logger.info("Fetching ZAR exchange rates...")
        exchange_rates = get_zar_exchange_rates()

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

        logger.info("Pipeline complete")

    except Exception as e:
        logger.error(f"Pipeline error: {e}", exc_info=True)

if __name__ == "__main__":
    if BackgroundScheduler is None:
        raise ImportError("APScheduler is not installed. Install it with: pip install apscheduler")
    
    scheduler = BackgroundScheduler() 
    scheduler.add_job(run_pipeline, 'cron', hour=0, minute=0)  # Run daily at midnight
    scheduler.start()
    
    logger.info("Scheduler started — pipeline runs daily at 00:00. Ctrl+C to stop.")

    try:
        while True:
            time.sleep(3600)
    except KeyboardInterrupt:
        logger.info("Scheduler stopped.")
        scheduler.shutdown()