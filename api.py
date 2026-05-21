from fastapi import FastAPI
from pydantic import BaseModel
import sqlite3
from datetime import datetime
import logging
from database import initialise_db
from services import TradingService
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('api.log'),
        logging.StreamHandler()
    ]
)

app = FastAPI()
trading_service = TradingService()


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins (fine for local development)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
class SellRequest(BaseModel):
    asset: str
    quantity: float

# Define the request models
class BuyRequest(BaseModel):
    asset: str
    quantity: float

@app.get("/")
def read_root(): 
    return {"message": "Welcome to the Crypto Data Pipeline API!"}

@app.get("/health")
def health_check():
    """Check API and database health"""
    try:
        conn = sqlite3.connect('crypto.db')
        cursor = conn.cursor()
        cursor.execute('SELECT COUNT(*) FROM transactions')
        transaction_count = cursor.fetchone()[0]
        conn.close()
        
        return {
            "status": "healthy",
            "database": "connected",
            "transactions_stored": transaction_count
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "database": "disconnected",
            "error": str(e)
        }

@app.post("/buy/crypto")
def buy_crypto(request: BuyRequest):
    """Buy cryptocurrency at current market price"""
    try:
        result = trading_service.buy_crypto(request.asset, request.quantity)
        return {"status": "success", "message": f"Bought {request.quantity} {request.asset} at ${result['price']} (Total: ${result['total_cost']:.2f})"}
    except ValueError as e:
        return {"status": "error", "message": str(e)}
    except KeyError:
        return {"status": "error", "message": "Crypto price data not available. Try again later."}

@app.post("/buy/stock")
def buy_stock(request: BuyRequest):
    """Buy stock at current market price"""
    try:
        result = trading_service.buy_stock(request.asset, request.quantity)
        return {"status": "success", "message": f"Bought {request.quantity} {request.asset} at ${result['price']} (Total: ${result['total_cost']:.2f})"}
    except KeyError:
        return {"status": "error", "message": "Stock price data not available. Try again later."}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.post("/sell/crypto")
def sell_crypto(request: SellRequest):
    """Sell a cryptocurrency"""
    try:
        result = trading_service.sell_crypto(request.asset, request.quantity)
        return {"status": "success", "message": f"Sold {request.quantity} {request.asset} at ${result['price']}"}
    except ValueError as e:
        return {"status": "error", "message": str(e)}
    except KeyError:
        return {"status": "error", "message": "Crypto price data not available. Try again later."}

@app.post("/sell/stock")
def sell_stock(request: SellRequest):
    """Sell a stock"""
    try:
        result = trading_service.sell_stock(request.asset, request.quantity)
        return {"status": "success", "message": f"Sold {request.quantity} {request.asset} at ${result['price']}"}
    except KeyError:
        return {"status": "error", "message": "Stock price data not available. Try again later."}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/portfolio")
def get_portfolio():
    """Get current portfolio holdings and total value"""
    # Asset name normalization mapping
    CRYPTO_MAPPING = {
        'bitcoin': 'bitcoin', 'btc': 'bitcoin', 'BTC': 'bitcoin',
        'ethereum': 'ethereum', 'eth': 'ethereum', 'ETH': 'ethereum',
        'solana': 'solana', 'sol': 'solana', 'SOL': 'solana'
    }
    STOCK_SYMBOLS = ['AAPL', 'GOOG', 'NVDA']
    
    def normalize_asset(asset):
        """Normalize asset name to canonical form"""
        if asset in CRYPTO_MAPPING:
            return CRYPTO_MAPPING[asset]
        if asset.upper() in STOCK_SYMBOLS:
            return asset.upper()
        return asset
    
    conn = sqlite3.connect('crypto.db')
    cursor = conn.cursor()
    
    # Get all holdings (buys minus sells grouped by asset)
    cursor.execute('''
        SELECT 
            asset,
            SUM(CASE WHEN transaction_type = 'BUY' THEN quantity 
                     ELSE -quantity END) as total_quantity
        FROM transactions
        GROUP BY asset
    ''')
    
    holdings = cursor.fetchall()
    conn.close()
    
    portfolio = {}
    for asset, quantity in holdings:
        if quantity > 0:  # Only include positive holdings
            normalized = normalize_asset(asset)
            if normalized in portfolio:
                portfolio[normalized] += quantity
            else:
                portfolio[normalized] = quantity
    
    return {"status": "success", "holdings": [{'asset': k, 'quantity': v} for k, v in portfolio.items()]}

@app.get("/prices/latest")
def get_latest_prices():
    """Get latest cryptocurrency and stock prices"""
    from fetch_crypto import get_crypto_prices
    from fetch_stocks import get_stock_prices
    import os
    import logging
    
    logger = logging.getLogger(__name__)
    
    try:
        # Get crypto prices
        crypto_prices = get_crypto_prices()
        crypto_data = {coin: price['usd'] for coin, price in crypto_prices.items()} if crypto_prices else {}
        
        # Get stock prices with correct API key based on provider
        provider = os.getenv('STOCK_PRICE_PROVIDER', 'finnhub').lower()
        if provider == 'finnhub':
            api_key = os.getenv('FINNHUB_API_KEY')
        else:
            api_key = os.getenv('ALPHA_VANTAGE_API_KEY')
        
        stock_data_raw = get_stock_prices(api_key)
        
        logger.debug(f"Raw stock data: {stock_data_raw}")
        
        stock_data = {}
        if stock_data_raw:
            for symbol, quote in stock_data_raw.items():
                price = float(quote.get('05. price', 0))
                stock_data[symbol] = price
                logger.info(f"Fetched {symbol}: ${price}")
        
        return {
            "status": "success",
            "crypto_prices": crypto_data,
            "stock_prices": stock_data,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Error in get_latest_prices: {e}")
        return {"status": "error", "message": str(e)}

@app.get("/transactions")
def get_transactions(limit: int = 50):
    """Get recent transactions"""
    conn = sqlite3.connect('crypto.db')
    cursor = conn.cursor()
    
    try:
        cursor.execute('''
            SELECT asset, transaction_type, quantity, price, timestamp
            FROM transactions
            ORDER BY timestamp DESC
            LIMIT ?
        ''', (limit,))
        
        transactions = cursor.fetchall()
        conn.close()
        
        result = []
        for asset, trans_type, quantity, price, timestamp in transactions:
            result.append({
                "asset": asset,
                "type": trans_type,
                "quantity": quantity,
                "price": price,
                "timestamp": timestamp
            })
        
        return {"status": "success", "transactions": result}
    except Exception as e:
        conn.close()
        return {"status": "error", "message": str(e)}

@app.get("/portfolio/value")
def get_portfolio_value():
    """Get current portfolio value with asset breakdown"""
    from fetch_crypto import get_crypto_prices
    from fetch_stocks import get_stock_prices
    import os
    
    # Asset name normalization mapping
    CRYPTO_MAPPING = {
        'bitcoin': 'bitcoin', 'btc': 'bitcoin', 'BTC': 'bitcoin',
        'ethereum': 'ethereum', 'eth': 'ethereum', 'ETH': 'ethereum',
        'solana': 'solana', 'sol': 'solana', 'SOL': 'solana'
    }
    STOCK_SYMBOLS = ['AAPL', 'GOOG', 'NVDA']
    
    def normalize_asset(asset):
        """Normalize asset name to canonical form"""
        if asset in CRYPTO_MAPPING:
            return CRYPTO_MAPPING[asset]
        if asset.upper() in STOCK_SYMBOLS:
            return asset.upper()
        return asset
    
    conn = sqlite3.connect('crypto.db')
    cursor = conn.cursor()
    
    try:
        # Get holdings
        cursor.execute('''
            SELECT 
                asset,
                SUM(CASE WHEN transaction_type = 'BUY' THEN quantity 
                         ELSE -quantity END) as total_quantity
            FROM transactions
            GROUP BY asset
        ''')
        
        holdings = cursor.fetchall()
        conn.close()
        
        # Get current prices
        crypto_prices = get_crypto_prices() or {}
        provider = os.getenv('STOCK_PRICE_PROVIDER', 'finnhub').lower()
        if provider == 'finnhub':
            api_key = os.getenv('FINNHUB_API_KEY')
        else:
            api_key = os.getenv('ALPHA_VANTAGE_API_KEY')
        stock_prices_raw = get_stock_prices(api_key) or {}
        
        portfolio_value = 0
        holdings_breakdown_dict = {}
        
        for asset, quantity in holdings:
            if quantity <= 0:
                continue
            
            normalized = normalize_asset(asset)
            current_price = 0
            
            # Try to get crypto price
            if normalized in crypto_prices:
                current_price = crypto_prices[normalized]['usd']
            # Try to get stock price
            elif normalized.upper() in stock_prices_raw and stock_prices_raw[normalized.upper()]:
                current_price = float(stock_prices_raw[normalized.upper()].get('05. price', 0))
            
            asset_value = quantity * current_price
            portfolio_value += asset_value
            
            # Aggregate normalized holdings
            if normalized in holdings_breakdown_dict:
                holdings_breakdown_dict[normalized]['quantity'] += quantity
                holdings_breakdown_dict[normalized]['total_value'] += asset_value
            else:
                holdings_breakdown_dict[normalized] = {
                    "asset": normalized,
                    "quantity": quantity,
                    "current_price": current_price,
                    "total_value": asset_value
                }
        
        holdings_breakdown = list(holdings_breakdown_dict.values())
        
        return {
            "status": "success",
            "total_portfolio_value": portfolio_value,
            "holdings": holdings_breakdown,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/exchange-rates")
def get_exchange_rates():
    """Get exchange rates for USD, EUR, GBP, ZAR"""
    from currency_fetcher import get_zar_exchange_rates
    
    try:
        rates = get_zar_exchange_rates()
        if rates:
            usd_to_zar = rates.get("USD", 1)  # How many ZAR per 1 USD
            return {
                "status": "success",
                "rates": {
                    "USD": 1.0,  # Base currency
                    "EUR": usd_to_zar / rates.get("EUR", 1),  # USD to EUR
                    "GBP": usd_to_zar / rates.get("GBP", 1),  # USD to GBP
                    "ZAR": usd_to_zar  # USD to ZAR
                },
                "base_currency": "USD"
            }
        else:
            return {"status": "error", "message": "Failed to fetch exchange rates"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/analytics/gains-losses")
def get_gains_losses():
    """Get gains/losses analysis for the portfolio"""
    from fetch_crypto import get_crypto_prices
    from fetch_stocks import get_stock_prices
    import os
    
    # Asset name normalization mapping
    CRYPTO_MAPPING = {
        'bitcoin': 'bitcoin', 'btc': 'bitcoin', 'BTC': 'bitcoin',
        'ethereum': 'ethereum', 'eth': 'ethereum', 'ETH': 'ethereum',
        'solana': 'solana', 'sol': 'solana', 'SOL': 'solana'
    }
    STOCK_SYMBOLS = ['AAPL', 'GOOG', 'NVDA']
    
    def normalize_asset(asset):
        """Normalize asset name to canonical form"""
        if asset in CRYPTO_MAPPING:
            return CRYPTO_MAPPING[asset]
        if asset.upper() in STOCK_SYMBOLS:
            return asset.upper()
        return asset
    
    conn = sqlite3.connect('crypto.db')
    cursor = conn.cursor()
    
    try:
        # Get all transactions grouped by asset
        cursor.execute('''
            SELECT 
                asset,
                transaction_type,
                quantity,
                price
            FROM transactions
            ORDER BY asset, timestamp
        ''')
        
        transactions = cursor.fetchall()
        conn.close()
        
        # Get current prices
        crypto_prices = get_crypto_prices() or {}
        provider = os.getenv('STOCK_PRICE_PROVIDER', 'finnhub').lower()
        if provider == 'finnhub':
            api_key = os.getenv('FINNHUB_API_KEY')
        else:
            api_key = os.getenv('ALPHA_VANTAGE_API_KEY')
        stock_prices_raw = get_stock_prices(api_key) or {}
        
        # Calculate per-asset gains/losses, normalized
        asset_data = {}
        total_invested = 0
        total_realized_gains = 0
        
        for asset, trans_type, quantity, price in transactions:
            # Normalize asset name
            normalized_asset = normalize_asset(asset)
            
            if normalized_asset not in asset_data:
                asset_data[normalized_asset] = {
                    'buys': [],
                    'sells': [],
                    'total_bought': 0,
                    'total_sold': 0,
                    'cost_basis': 0,
                    'proceeds': 0
                }
            
            if trans_type == 'BUY':
                asset_data[normalized_asset]['buys'].append({'quantity': quantity, 'price': price})
                asset_data[normalized_asset]['total_bought'] += quantity
                asset_data[normalized_asset]['cost_basis'] += quantity * price
                total_invested += quantity * price
            else:  # SELL
                asset_data[normalized_asset]['sells'].append({'quantity': quantity, 'price': price})
                asset_data[normalized_asset]['total_sold'] += quantity
                asset_data[normalized_asset]['proceeds'] += quantity * price
                total_realized_gains += (quantity * price) - (quantity * (asset_data[normalized_asset]['cost_basis'] / asset_data[normalized_asset]['total_bought'] if asset_data[normalized_asset]['total_bought'] > 0 else 0))
        
        # Calculate unrealized gains per asset
        holdings_analysis = []
        total_current_value = 0
        total_unrealized_gains = 0
        
        for asset, data in asset_data.items():
            current_quantity = data['total_bought'] - data['total_sold']
            
            if current_quantity <= 0:
                continue
            
            # Get current price (asset is already normalized at this point)
            current_price = 0
            
            if asset in crypto_prices:
                current_price = crypto_prices[asset]['usd']
            elif asset.upper() in stock_prices_raw and stock_prices_raw[asset.upper()]:
                current_price = float(stock_prices_raw[asset.upper()].get('05. price', 0))
            
            avg_entry_price = data['cost_basis'] / data['total_bought'] if data['total_bought'] > 0 else 0
            current_value = current_quantity * current_price
            unrealized_gain = current_value - (current_quantity * avg_entry_price)
            
            total_current_value += current_value
            total_unrealized_gains += unrealized_gain
            
            holdings_analysis.append({
                "asset": asset,
                "quantity": current_quantity,
                "avg_entry_price": round(avg_entry_price, 2),
                "current_price": current_price,
                "current_value": round(current_value, 2),
                "unrealized_gain": round(unrealized_gain, 2),
                "unrealized_gain_percent": round((unrealized_gain / (current_quantity * avg_entry_price) * 100) if avg_entry_price > 0 else 0, 2)
            })
        
        total_gains_losses = total_unrealized_gains + total_realized_gains
        total_roi = (total_gains_losses / total_invested * 100) if total_invested > 0 else 0
        
        return {
            "status": "success",
            "summary": {
                "total_invested": round(total_invested, 2),
                "current_portfolio_value": round(total_current_value, 2),
                "total_realized_gains": round(total_realized_gains, 2),
                "total_unrealized_gains": round(total_unrealized_gains, 2),
                "total_gains_losses": round(total_gains_losses, 2),
                "roi_percent": round(total_roi, 2)
            },
            "holdings": holdings_analysis,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)