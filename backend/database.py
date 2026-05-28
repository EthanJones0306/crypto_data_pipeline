import sqlite3
from datetime import datetime
import logging
from .api_status import log_api_call

logger = logging.getLogger(__name__)

def initialise_db():
    """Create all required tables if they don't exist"""
    conn = sqlite3.connect('crypto.db')
    cursor = conn.cursor()
    
    # Create crypto_prices table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS crypto_prices (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            coin TEXT,
            price_usd REAL,
            timestamp DATETIME
        )
    ''')
    
    # Create stock_prices table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS stock_prices (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            symbol TEXT,
            price REAL,
            timestamp DATETIME
        )
    ''')
    
    # Create exchange_rates table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS exchange_rates (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            currency TEXT,
            zar_rate REAL,
            timestamp DATETIME
        )
    ''')
    
    # Create transactions table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            asset TEXT,
            transaction_type TEXT,
            quantity REAL,
            price REAL,
            timestamp DATETIME,
            is_paper INTEGER DEFAULT 0
        )
    ''')

    # Create paper accounts for simulation
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS paper_accounts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT DEFAULT 'paper',
            cash REAL DEFAULT 100000,
            available_cash REAL DEFAULT 100000,
            maintenance_rate REAL DEFAULT 0.25,
            created_at DATETIME
        )
    ''')

    # Create positions table to track holdings (including paper positions)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS positions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            account_id INTEGER DEFAULT 1,
            asset TEXT,
            quantity REAL,
            avg_price REAL,
            is_paper INTEGER DEFAULT 0
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
        logger.info(f"Stored: {coin_name} - ${price_usd} at {current_time}")
    
    conn.commit()
    conn.close()

def store_stock_prices(stock_data):
    """Store stock prices in the database"""
    conn = sqlite3.connect('crypto.db')
    cursor = conn.cursor()
    
    # Create table if it doesn't exist
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS stock_prices (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            symbol TEXT,
            price REAL,
            timestamp DATETIME
        )
    ''')
    
    current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    # Parse Alpha Vantage response structure (now dict with symbols as keys)
    for symbol, quote in stock_data.items():
        if quote:  # Make sure quote isn't empty
            price = float(quote['05. price'])
            cursor.execute('''
                INSERT INTO stock_prices (symbol, price, timestamp)
                VALUES (?, ?, ?)
            ''', (symbol, price, current_time))
            logger.info(f"Stored: {symbol} - ${price} at {current_time}")
    
    conn.commit()
    conn.close()

def store_rates(rates_data):
    """Store exchange rates in the database"""
    conn = sqlite3.connect('crypto.db')
    cursor = conn.cursor()
    
    # First create the table if it doesn't exist
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS exchange_rates (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            currency TEXT,
            zar_rate REAL,
            timestamp DATETIME
        )
    ''')
    
    current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    for currency, rate in rates_data.items():
        cursor.execute('''
            INSERT INTO exchange_rates (currency, zar_rate, timestamp)
            VALUES (?, ?, ?)
        ''', (currency, rate, current_time))
        logger.info(f"Stored: {currency} - {rate} ZAR at {current_time}")
    
    conn.commit()
    conn.close()

def store_transactions(transactions):
    """Store asset transactions in the database"""
    conn = sqlite3.connect('crypto.db')
    cursor = conn.cursor()

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            asset TEXT,
            transaction_type TEXT,
            quantity REAL,
            price REAL,
            timestamp DATETIME
        )
    ''')

    current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    try:
        for transaction in transactions:
            is_paper = int(transaction.get('is_paper', 0))
            cursor.execute('''
                INSERT INTO transactions (asset, transaction_type, quantity, price, timestamp, is_paper)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (transaction['asset'], transaction['type'], transaction['quantity'], transaction['price'], current_time, is_paper))
            logger.info(f"Stored: {transaction['type']} {transaction['quantity']} {transaction['asset']} @ ${transaction['price']}")
        
        conn.commit()
    except Exception as e:
        logger.error(f"Error storing transaction: {e}")
        conn.rollback()
    finally:
        conn.close()

def store_buy_transaction(asset, quantity, price):
    """Store a buy transaction in the database"""
    conn = sqlite3.connect('crypto.db')
    cursor = conn.cursor()
    current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    cursor.execute('''
        INSERT INTO transactions (asset, transaction_type, quantity, price, timestamp, is_paper)
        VALUES (?, ?, ?, ?, ?, 0)
    ''', (asset, 'BUY', quantity, price, current_time))
    
    conn.commit()
    conn.close()

def store_sell_transaction(asset, quantity, price):
    """Store a sell transaction in the database"""
    conn = sqlite3.connect('crypto.db')
    cursor = conn.cursor()
    current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    cursor.execute('''
        INSERT INTO transactions (asset, transaction_type, quantity, price, timestamp, is_paper)
        VALUES (?, ?, ?, ?, ?, 0)
    ''', (asset, 'SELL', quantity, price, current_time))
    
    conn.commit()
    conn.close()


def get_or_create_paper_account(account_id=1):
    conn = sqlite3.connect('crypto.db')
    cursor = conn.cursor()
    cursor.execute('SELECT id, cash, available_cash, maintenance_rate FROM paper_accounts WHERE id = ?', (account_id,))
    row = cursor.fetchone()
    if row:
        conn.close()
        return {'id': row[0], 'cash': row[1], 'available_cash': row[2], 'maintenance_rate': row[3]}

    now = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    cursor.execute('INSERT INTO paper_accounts (id, created_at) VALUES (?, ?)', (account_id, now))
    conn.commit()
    cursor.execute('SELECT id, cash, available_cash, maintenance_rate FROM paper_accounts WHERE id = ?', (account_id,))
    row = cursor.fetchone()
    conn.close()
    return {'id': row[0], 'cash': row[1], 'available_cash': row[2], 'maintenance_rate': row[3]}


def update_paper_account_cash(account_id, delta):
    conn = sqlite3.connect('crypto.db')
    cursor = conn.cursor()
    cursor.execute('UPDATE paper_accounts SET cash = cash + ?, available_cash = available_cash + ? WHERE id = ?', (delta, delta, account_id))
    conn.commit()
    conn.close()


def get_position(account_id, asset, is_paper=1):
    conn = sqlite3.connect('crypto.db')
    cursor = conn.cursor()
    cursor.execute('SELECT id, quantity, avg_price FROM positions WHERE account_id = ? AND asset = ? AND is_paper = ?', (account_id, asset, is_paper))
    row = cursor.fetchone()
    conn.close()
    if row:
        return {'id': row[0], 'quantity': row[1], 'avg_price': row[2]}
    return None


def update_position(account_id, asset, qty_delta, price, is_paper=1):
    conn = sqlite3.connect('crypto.db')
    cursor = conn.cursor()
    pos = get_position(account_id, asset, is_paper)
    if pos:
        # compute new avg price for increases only
        new_qty = pos['quantity'] + qty_delta
        if new_qty == 0:
            cursor.execute('DELETE FROM positions WHERE id = ?', (pos['id'],))
        else:
            if qty_delta > 0:
                # weighted avg
                total_cost = pos['avg_price'] * pos['quantity'] + price * qty_delta
                new_avg = total_cost / new_qty
            else:
                new_avg = pos['avg_price']
            cursor.execute('UPDATE positions SET quantity = ?, avg_price = ? WHERE id = ?', (new_qty, new_avg, pos['id']))
    else:
        cursor.execute('INSERT INTO positions (account_id, asset, quantity, avg_price, is_paper) VALUES (?, ?, ?, ?, ?)', (account_id, asset, qty_delta, price, is_paper))
    conn.commit()
    conn.close()

def reset_database():
    """Clear all tables and reset database to empty state"""
    try:
        conn = sqlite3.connect('crypto.db')
        cursor = conn.cursor()
        
        # Drop all tables
        cursor.execute('DROP TABLE IF EXISTS transactions')
        cursor.execute('DROP TABLE IF EXISTS crypto_prices')
        cursor.execute('DROP TABLE IF EXISTS stock_prices')
        cursor.execute('DROP TABLE IF EXISTS exchange_rates')
        
        conn.commit()
        conn.close()
        
        # Reinitialize database with empty tables
        initialise_db()
        logger.info("Database reset successfully - all tables cleared and reinitialized")
        return True
    except Exception as e:
        logger.error(f"Error resetting database: {e}")
        return False
    