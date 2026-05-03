import sqlite3
from tabulate import tabulate

conn = sqlite3.connect('crypto.db')
cursor = conn.cursor()

print("\n=== Latest Cryptocurrency Prices ===")
cursor.execute('SELECT coin, price_usd, timestamp FROM crypto_prices ORDER BY timestamp DESC LIMIT 3')
print(tabulate(cursor.fetchall(), headers=['Coin', 'Price (USD)', 'Time'], tablefmt='grid'))

print("\n=== Latest Stock Prices ===")
cursor.execute('SELECT symbol, price, timestamp FROM stock_prices ORDER BY timestamp DESC LIMIT 3')
print(tabulate(cursor.fetchall(), headers=['Symbol', 'Price (USD)', 'Time'], tablefmt='grid'))

print("\n=== Latest Exchange Rates ===")
cursor.execute('SELECT currency, zar_rate, timestamp FROM exchange_rates ORDER BY timestamp DESC LIMIT 3')
print(tabulate(cursor.fetchall(), headers=['Currency', 'ZAR Rate', 'Time'], tablefmt='grid'))

conn.close()