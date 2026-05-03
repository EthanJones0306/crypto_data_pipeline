import sqlite3

conn = sqlite3.connect('crypto.db') # Connect to the database
cursor = conn.cursor() # Create a cursor object to interact with the database

# View crypto prices
print("=== Cryptocurrency Prices ===")
cursor.execute('SELECT * FROM crypto_prices')
rows = cursor.fetchall()
for row in rows:
    print(row)

# View exchange rates
print("\n=== Exchange Rates (ZAR) ===")
cursor.execute('SELECT * FROM exchange_rates')
rows = cursor.fetchall()
for row in rows:
    print(row)

conn.close() # Close the database connection to free up resources