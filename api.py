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
