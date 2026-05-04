from fastapi import FastAPI
from pydantic import BaseModel
import sqlite3
from datetime import datetime

app = FastAPI()

# Define the request model
class BuyRequest(BaseModel):
    asset: str
    quantity: float
    price: float

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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
