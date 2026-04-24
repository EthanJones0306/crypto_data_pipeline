import requests
import sqlite3
from datetime import datetime

# Set up the database 
conn = sqlite3.connect('crypto.db') # Connect project database
cursor = conn.cursor() # Create a table to store cryptocurrency data

# Create table if it doesn't exist yet 
cursor.execute('''
    CREATE TABLE IF NOT EXISTS crypto_prices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        coin TEXT,
        price_usd REAL,
        timestamp DATETIME
    )
''')