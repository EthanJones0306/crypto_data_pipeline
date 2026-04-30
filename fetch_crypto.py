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


try:
    response = requests.get(api_url) # Make GET request to the API
    response.raise_for_status() # Check if request was successful
    data = response.json() # Parse JSON response

    current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S") # Get current timestamp in string format

    for coin_name, price_info in data.items(): # Loop through all coins in response data
        price_usd = price_info['usd'] # Assign price in USD to variable

        cursor.execute('''
            INSERT INTO crypto_prices (coin, price_usd, timestamp)
            VALUES (?, ?, ?) 
        ''', (coin_name, price_usd, current_time)) # Insert coin name, price, and timestamp into database
        print(f"Stored: {coin_name} - ${price_usd} at {current_time}") # Print stored data to console 


    conn.commit() # Commit changes to the database to ensure data is saved

    
except Exception as e:
    print(f"Error fetching data: {e}") # Print error message if request fails

finally:
    conn.close() # Close database connection to free up resources

print("Fetch complete. Database connection closed.")

