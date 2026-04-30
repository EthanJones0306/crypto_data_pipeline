import sqlite3

conn = sqlite3.connect('crypto.db') # Connect to the database
cursor = conn.cursor() # Create a cursor object to interact with the database