import requests
import sqlite3
from datetime import datetime

# Set up the database 
conn = sqlite3.connect('crypto.db') # Connect project database
cursor = conn.cursor() # Create a table to store cryptocurrency data