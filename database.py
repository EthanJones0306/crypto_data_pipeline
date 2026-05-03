import sqlite3
from datetime import datetime

def initialise_db():
    """Create the crypto_prices table if it doesn't exist"""
    conn = sqlite3.connect('crypto.db')
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS crypto_prices (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            coin TEXT,
            price_usd REAL,
            timestamp DATETIME
        )
    ''')
    conn.commit()
    conn.close()

def store_prices(prices_data):
    """Store cryptocurrency prices in the database"""
    conn = sqlite3.connect('crypto.db')
    cursor = conn.cursor()
    
    current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    for coin_name, price_info in prices_data.items():
        price_usd = price_info['usd']
        cursor.execute('''
            INSERT INTO crypto_prices (coin, price_usd, timestamp)
            VALUES (?, ?, ?)
        ''', (coin_name, price_usd, current_time))
        print(f"Stored: {coin_name} - ${price_usd} at {current_time}")
    
    conn.commit()
    conn.close()