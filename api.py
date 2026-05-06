from fastapi import FastAPI
from pydantic import BaseModel
import sqlite3
from datetime import datetime
from fetch_crypto import get_crypto_prices
from fetch_stocks import get_stock_prices
from database import initialise_db, store_prices, store_stock_prices, store_transactions, store_buy_transaction

app = FastAPI()

class SellRequest(BaseModel):
    asset: str
    quantity: float

# Define the request models
class BuyRequest(BaseModel):
    asset: str
    quantity: float

@app.get("/")
def read_root(): 
    return {"message": "Welcome to the Crypto Data Pipeline API!"}

@app.post("/buy/crypto")
def buy_crypto(request: BuyRequest):
    """Buy cryptocurrency at current market price"""
    latest_prices = get_crypto_prices()
    store_prices(latest_prices)
    current_price = latest_prices[request.asset.lower()]['usd']
    total_cost = request.quantity * current_price
    
    store_buy_transaction(request.asset, request.quantity, current_price)
    
    return {"status": "success", "message": f"Bought {request.quantity} {request.asset} at ${current_price} (Total: ${total_cost:.2f})"}

@app.post("/buy/stock")
def buy_stock(request: BuyRequest):
    """Buy stock at current market price"""
    import os
    api_key = os.getenv('ALPHA_VANTAGE_API_KEY')
    stock_data = get_stock_prices(api_key)
    store_stock_prices(stock_data)
    current_price = float(stock_data[request.asset]['05. price'])
    total_cost = request.quantity * current_price
    
    conn = sqlite3.connect('crypto.db')
    cursor = conn.cursor()
    current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    cursor.execute('''
        INSERT INTO transactions (asset, transaction_type, quantity, price, timestamp)
        VALUES (?, ?, ?, ?, ?)
    ''', (request.asset, 'BUY', request.quantity, current_price, current_time))
    
    conn.commit()
    conn.close()
    
    return {"status": "success", "message": f"Bought {request.quantity} {request.asset} at ${current_price} (Total: ${total_cost:.2f})"}

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

@app.get("/portfolio")
def get_portfolio():
    """Get current portfolio holdings and total value"""
    conn = sqlite3.connect('crypto.db')
    cursor = conn.cursor()
    
    # Get all holdings (buys minus sells grouped by asset)
    cursor.execute('''
        SELECT 
            asset,
            SUM(CASE WHEN transaction_type = 'BUY' THEN quantity 
                     ELSE -quantity END) as total_quantity
        FROM transactions
        GROUP BY asset
    ''')
    
    holdings = cursor.fetchall()
    conn.close()
    
    portfolio = []
    for asset, quantity in holdings:
        if quantity > 0:  # Only include positive holdings
            portfolio.append({"asset": asset, "quantity": quantity})
    
    return {"status": "success", "holdings": portfolio}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)