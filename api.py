from fastapi import FastAPI
from pydantic import BaseModel
import sqlite3
from datetime import datetime
from fetch_crypto import get_crypto_prices
from fetch_stocks import get_stock_prices
from database import initialise_db, store_prices, store_stock_prices, store_transactions 

app = FastAPI()

# Define the request models
class BuyRequest(BaseModel):
    asset: str
    quantity: float
    price: float

class SellRequest(BaseModel):
    asset: str
    quantity: float

@app.get("/")
def read_root(): 
    return {"message": "Welcome to the Crypto Data Pipeline API!"}

@app.post("/buy")
def buy_asset(request: BuyRequest):
    
    """Buy an asset and store transaction in database"""
    conn = sqlite3.connect('crypto.db')
    cursor = conn.cursor()
    
    current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    cursor.execute('''
        INSERT INTO transactions (asset, transaction_type, quantity, price, timestamp)
        VALUES (?, ?, ?, ?, ?)
    ''', (request.asset, 'BUY', request.quantity, request.price, current_time))
    
    conn.commit()
    conn.close()
    
    return {"status": "success", "message": f"Bought {request.quantity} {request.asset}"}

@app.post("/sell/crypto")
def sell_crypto(request: SellRequest):
    """Sell a cryptocurrency"""
    latest_prices = get_crypto_prices()
    store_prices(latest_prices)
    current_price = latest_prices[request.asset.lower()]['usd']
    
    # Store transaction
    conn = sqlite3.connect('crypto.db')
    cursor = conn.cursor()
    current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    cursor.execute('''
        INSERT INTO transactions (asset, transaction_type, quantity, price, timestamp)
        VALUES (?, ?, ?, ?, ?)
    ''', (request.asset, 'SELL', request.quantity, current_price, current_time))
    
    conn.commit()
    conn.close()
    
    return {"status": "success", "message": f"Sold {request.quantity} {request.asset} at ${current_price}"}

@app.post("/sell/stock")
def sell_stock(request: SellRequest):
    """Sell a stock"""
    import os
    api_key = os.getenv('ALPHA_VANTAGE_API_KEY')
    stock_data = get_stock_prices(api_key)
    store_stock_prices(stock_data)
    current_price = float(stock_data[request.asset]['05. price'])
    
    # Store transaction
    conn = sqlite3.connect('crypto.db')
    cursor = conn.cursor()
    current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    cursor.execute('''
        INSERT INTO transactions (asset, transaction_type, quantity, price, timestamp)
        VALUES (?, ?, ?, ?, ?)
    ''', (request.asset, 'SELL', request.quantity, current_price, current_time))
    
    conn.commit()
    conn.close()
    
    return {"status": "success", "message": f"Sold {request.quantity} {request.asset} at ${current_price}"}

    
@app.post("/sell")
def sell_asset(request: SellRequest):
    """First fetch latest price for the asset"""
    if request.asset.lower() in ['bitcoin', 'ethereum', 'solana']:
        latest_price = get_crypto_prices()
        store_prices(latest_price)  # Store the latest price in the database
    else:
        latest_price = get_stock_prices()  # Fetch latest stock price
        store_stock_prices(latest_price)  # Store the latest stock price in the database

    """Sell an asset and store transaction in database"""
    conn = sqlite3.connect('crypto.db')
    cursor = conn.cursor()
    
    # Get the latest price for this asset -- adjsut this later to fetch new price as soon as function is called 
    cursor.execute('''
        SELECT price FROM stock_prices WHERE symbol = ?
        ORDER BY timestamp DESC LIMIT 1
    ''', (request.asset,))
    
    result = cursor.fetchone() # Fetch the row containing the price
    if not result:
        conn.close()
        return {"status": "error", "message": f"No price found for {request.asset}"}
    
    current_price = result[0]
    current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    cursor.execute('''
        INSERT INTO transactions (asset, transaction_type, quantity, price, timestamp)
        VALUES (?, ?, ?, ?, ?)
    ''', (request.asset, 'SELL', request.quantity, current_price, current_time))
    
    conn.commit()
    conn.close()
    
    return {"status": "success", "message": f"Sold {request.quantity} {request.asset} at ${current_price}"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

