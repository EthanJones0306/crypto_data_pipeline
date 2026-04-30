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

api_url = 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=usd' # API endpoint for fetching cryptocurrency prices
print("Fetching live crypto prices...")
response = requests.get(api_url) # Make GET request to the API

data = response.json() # Store the JSON response for debugging
print(data)