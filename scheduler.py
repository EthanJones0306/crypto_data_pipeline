#!/opt/anaconda3/bin/python
try:
    from apscheduler.schedulers.background import BackgroundScheduler  # type: ignore[import]
except ImportError:
    BackgroundScheduler = None
from fetch_crypto import get_crypto_prices
from currency_fetcher import get_zar_exchange_rates
from database import initialise_db, store_prices, store_rates, store_stock_prices
from fetch_stocks import get_stock_prices
import time
from datetime import datetime

API_KEY_stocks = '79MC5EWVII5262UH'

def run_pipeline():
    """Run the full data fetching pipeline"""
    print(f"\n[{datetime.now()}] Running pipeline...")
    
    try:
        initialise_db()
        
        print("Fetching cryptocurrency prices...")
        crypto_prices = get_crypto_prices()
        
        print("Fetching stock prices...")
        stock_prices = get_stock_prices(API_KEY_stocks)
        
        print("Fetching ZAR exchange rates...")
        exchange_rates = get_zar_exchange_rates()
        
        if crypto_prices:
            store_prices(crypto_prices)
        else:
            print("Failed to fetch crypto prices")
            
        if stock_prices:
            store_stock_prices(stock_prices)
        else:
            print("Failed to fetch stock prices")
            
        if exchange_rates:
            store_rates(exchange_rates)
        else:
            print("Failed to fetch exchange rates")
        
        print(f"[{datetime.now()}] Pipeline complete!\n") # Log completion time
    except Exception as e:
        print(f"Pipeline error: {e}\n")

if __name__ == "__main__":
    if BackgroundScheduler is None:
        raise ImportError("APScheduler is not installed. Install it with: pip install apscheduler")
    
    scheduler = BackgroundScheduler() 
    scheduler.add_job(run_pipeline, 'cron', hour=0, minute=0)  # Run daily at midnight
    scheduler.start()
    
    print("Scheduler started. Pipeline runs daily at 00:00.")
    print("Press Ctrl+C to stop.")
    
    try:
        while True: # Keep the main thread alive to let the scheduler run
            time.sleep(1) # Sleep to reduce CPU usage, but can be interrupted with Ctrl+C
    except KeyboardInterrupt: # Gracefully shut down on Ctrl+C
        print("\nScheduler stopped.")
        scheduler.shutdown()