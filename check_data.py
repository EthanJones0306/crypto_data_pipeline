import sqlite3

conn = sqlite3.connect('crypto.db') # Connect to the database
cursor = conn.cursor() # Create a cursor object to interact with the database

cursor.execute('SELECT * FROM crypto_prices') # Execute SQL query to select all data from the crypto_prices table
rows = cursor.fetchall() # Fetch all rows returned by the query

for row in rows: # Loop through each row and print it to the console
    print(row)

conn.close() # Close the database connection to free up resources