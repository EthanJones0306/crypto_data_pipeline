from fastapi import FastAPI
from pydantic import BaseModel
import sqlite3
from database import initialise_db
from services import TradingService

app = FastAPI()
trading_service = TradingService()


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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)