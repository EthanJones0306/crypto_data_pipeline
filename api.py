from fastapi import FastAPI
from pydantic import BaseModel
import sqlite3
from datetime import datetime
import logging
from database import initialise_db
from services import TradingService
from fastapi.middleware.cors import CORSMiddleware


# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('api.log'),
        logging.StreamHandler()
    ]
)

app = FastAPI()
trading_service = TradingService()


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins (fine for local development)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
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

@app.get("/health")
def health_check():
    """Check API and database health"""
    try:
        conn = sqlite3.connect('crypto.db')
        cursor = conn.cursor()
        cursor.execute('SELECT COUNT(*) FROM transactions')
        transaction_count = cursor.fetchone()[0]
        conn.close()
        
        return {
            "status": "healthy",
            "database": "connected",
            "transactions_stored": transaction_count
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "database": "disconnected",
            "error": str(e)
        }

@app.post("/buy/crypto")
def buy_crypto(request: BuyRequest):
    """Buy cryptocurrency at current market price"""
    try:
        result = trading_service.buy_crypto(request.asset, request.quantity)
        return {"status": "success", "message": f"Bought {request.quantity} {request.asset} at ${result['price']} (Total: ${result['total_cost']:.2f})"}
    except ValueError as e:
        return {"status": "error", "message": str(e)}
    except KeyError:
        return {"status": "error", "message": "Crypto price data not available. Try again later."}

@app.post("/buy/stock")
def buy_stock(request: BuyRequest):
    """Buy stock at current market price"""
    try:
        result = trading_service.buy_stock(request.asset, request.quantity)
        return {"status": "success", "message": f"Bought {request.quantity} {request.asset} at ${result['price']} (Total: ${result['total_cost']:.2f})"}
    except KeyError:
        return {"status": "error", "message": "Stock price data not available. Try again later."}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.post("/sell/crypto")
def sell_crypto(request: SellRequest):
    """Sell a cryptocurrency"""
    try:
        result = trading_service.sell_crypto(request.asset, request.quantity)
        return {"status": "success", "message": f"Sold {request.quantity} {request.asset} at ${result['price']}"}
    except ValueError as e:
        return {"status": "error", "message": str(e)}
    except KeyError:
        return {"status": "error", "message": "Crypto price data not available. Try again later."}

@app.post("/sell/stock")
def sell_stock(request: SellRequest):
    """Sell a stock"""
    try:
        result = trading_service.sell_stock(request.asset, request.quantity)
        return {"status": "success", "message": f"Sold {request.quantity} {request.asset} at ${result['price']}"}
    except KeyError:
        return {"status": "error", "message": "Stock price data not available. Try again later."}
    except Exception as e:
        return {"status": "error", "message": str(e)}

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

@app.get("/prices/latest")
def get_latest_prices():
    """Get latest cryptocurrency and stock prices"""
    from fetch_crypto import get_crypto_prices
    from fetch_stocks import get_stock_prices
    import os
    
    try:
        # Get crypto prices
        crypto_prices = get_crypto_prices()
        crypto_data = {coin: price['usd'] for coin, price in crypto_prices.items()} if crypto_prices else {}
        
        # Get stock prices
        api_key = os.getenv('ALPHA_VANTAGE_API_KEY')
        stock_data_raw = get_stock_prices(api_key)
        stock_data = {symbol: float(quote.get('05. price', 0)) for symbol, quote in stock_data_raw.items()} if stock_data_raw else {}
        
        return {
            "status": "success",
            "crypto_prices": crypto_data,
            "stock_prices": stock_data,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/transactions")
def get_transactions(limit: int = 50):
    """Get recent transactions"""
    conn = sqlite3.connect('crypto.db')
    cursor = conn.cursor()
    
    try:
        cursor.execute('''
            SELECT asset, transaction_type, quantity, price, timestamp
            FROM transactions
            ORDER BY timestamp DESC
            LIMIT ?
        ''', (limit,))
        
        transactions = cursor.fetchall()
        conn.close()
        
        result = []
        for asset, trans_type, quantity, price, timestamp in transactions:
            result.append({
                "asset": asset,
                "type": trans_type,
                "quantity": quantity,
                "price": price,
                "timestamp": timestamp
            })
        
        return {"status": "success", "transactions": result}
    except Exception as e:
        conn.close()
        return {"status": "error", "message": str(e)}

@app.get("/portfolio/value")
def get_portfolio_value():
    """Get current portfolio value with asset breakdown"""
    from fetch_crypto import get_crypto_prices
    from fetch_stocks import get_stock_prices
    import os
    
    conn = sqlite3.connect('crypto.db')
    cursor = conn.cursor()
    
    try:
        # Get holdings
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
        
        # Get current prices
        crypto_prices = get_crypto_prices() or {}
        api_key = os.getenv('ALPHA_VANTAGE_API_KEY')
        stock_prices_raw = get_stock_prices(api_key) or {}
        
        portfolio_value = 0
        holdings_breakdown = []
        
        for asset, quantity in holdings:
            if quantity <= 0:
                continue
                
            current_price = 0
            asset_lower = asset.lower()
            
            # Try to get crypto price
            if asset_lower in crypto_prices:
                current_price = crypto_prices[asset_lower]['usd']
            # Try to get stock price
            elif asset in stock_prices_raw and stock_prices_raw[asset]:
                current_price = float(stock_prices_raw[asset].get('05. price', 0))
            
            asset_value = quantity * current_price
            portfolio_value += asset_value
            
            holdings_breakdown.append({
                "asset": asset,
                "quantity": quantity,
                "current_price": current_price,
                "total_value": asset_value
            })
        
        return {
            "status": "success",
            "total_portfolio_value": portfolio_value,
            "holdings": holdings_breakdown,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/exchange-rates")
def get_exchange_rates():
    """Get exchange rates for USD, EUR, GBP, ZAR"""
    from currency_fetcher import get_zar_exchange_rates
    
    try:
        rates = get_zar_exchange_rates()
        if rates:
            usd_to_zar = rates.get("USD", 1)  # How many ZAR per 1 USD
            return {
                "status": "success",
                "rates": {
                    "USD": 1.0,  # Base currency
                    "EUR": usd_to_zar / rates.get("EUR", 1),  # USD to EUR
                    "GBP": usd_to_zar / rates.get("GBP", 1),  # USD to GBP
                    "ZAR": usd_to_zar  # USD to ZAR
                },
                "base_currency": "USD"
            }
        else:
            return {"status": "error", "message": "Failed to fetch exchange rates"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)