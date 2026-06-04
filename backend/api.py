from fastapi import FastAPI
from pydantic import BaseModel
from typing import Optional
import sqlite3
from datetime import datetime
import logging
from .database import initialise_db, reset_database
from .services import TradingService
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from .api_status import get_status_summary, initialize_status

import os

# Load environment variables
load_dotenv()

# Initialize API status tracking
initialize_status()

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

# Add CORS middleware BEFORE anything else
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins (fine for local development)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

trading_service = TradingService()

# Initialize database on startup
@app.on_event("startup")
def startup_event():
    initialise_db()

def get_stock_api_key() -> str:
    """Get the configured stock price API key"""
    provider = os.getenv('STOCK_PRICE_PROVIDER', 'finnhub').lower()
    return (
        os.getenv('FINNHUB_API_KEY')
        if provider == 'finnhub'
        else os.getenv('ALPHA_VANTAGE_API_KEY')
    )

# Define request models
class SellRequest(BaseModel):
    asset: str
    quantity: float


class BuyRequest(BaseModel):
    asset: str
    quantity: Optional[float] = None
    amount: Optional[float] = None
    currency: Optional[str] = None  # 'USD', 'GBP', 'ZAR'


class SimulateRequest(BaseModel):
    asset: str
    quantity: float
    side: str  # 'long' or 'short'
    leverage: float = 2.0
    asset_type: str = 'crypto'  # 'crypto' or 'stock'
    account_id: int = 1

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
    """Buy cryptocurrency at current market price (supports both quantity and amount-based purchases)"""
    try:
        quantity = request.quantity
        
        # If amount and currency are provided, convert to quantity
        if request.amount is not None and request.currency is not None:
            from .fetch_crypto import get_crypto_price
            from .database import get_latest_exchange_rate
            
            # Get current crypto price
            price_data = get_crypto_price(request.asset)
            if not price_data:
                return {"status": "error", "message": f"Unable to fetch price for {request.asset}"}
            
            crypto_price_usd = price_data['usd']
            
            # Convert currency amount to USD if needed
            amount_usd = request.amount
            if request.currency.upper() != 'USD':
                # Get exchange rates (stored as ZAR per unit of currency)
                usd_rate = get_latest_exchange_rate('USD')
                currency_rate = get_latest_exchange_rate(request.currency.upper())
                
                if not usd_rate or not currency_rate:
                    return {"status": "error", "message": f"Exchange rates not available"}
                
                # Convert currency to USD: amount_currency * (currency_rate / usd_rate)
                amount_usd = request.amount * (currency_rate / usd_rate)
            
            # Calculate quantity from amount
            quantity = amount_usd / crypto_price_usd
        
        if not quantity or quantity <= 0:
            return {"status": "error", "message": "Invalid quantity or amount"}
        
        result = trading_service.buy_crypto(request.asset, quantity)
        return {"status": "success", "message": f"Bought {quantity:.4f} {request.asset} at ${result['price']} (Total: ${result['total_cost']:.2f})"}
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
    from .fetch_crypto import get_crypto_prices
    from .fetch_stocks import get_stock_prices
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
    from .fetch_crypto import get_crypto_price
    from .fetch_stocks import get_stock_price, get_stock_prices
    import os
    
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
        
        # Get API keys
        provider = os.getenv('STOCK_PRICE_PROVIDER', 'finnhub').lower()
        if provider == 'finnhub':
            api_key = os.getenv('FINNHUB_API_KEY')
        else:
            api_key = os.getenv('ALPHA_VANTAGE_API_KEY')
        
        # Get cached stock prices for reference
        stock_prices_raw = get_stock_prices(api_key) or {}
        
        portfolio_value = 0
        holdings_breakdown_dict = {}
        
        for asset, quantity in holdings:
            if quantity <= 0:
                continue
            
            current_price = 0
            
            # Check if it's a stock (uppercase, commonly looks like a stock ticker)
            if len(asset) <= 5 and asset.isupper():
                # Try to fetch as stock
                stock_data = get_stock_price(asset, api_key)
                if stock_data:
                    try:
                        current_price = float(stock_data.get('05. price', 0))
                    except:
                        pass
            
            # If not a stock or stock fetch failed, try as crypto
            if current_price == 0:
                price_data = get_crypto_price(asset)
                if price_data:
                    current_price = price_data['usd']
            
            asset_value = quantity * current_price
            portfolio_value += asset_value
            
            # Store holding
            if asset in holdings_breakdown_dict:
                holdings_breakdown_dict[asset]['quantity'] += quantity
                holdings_breakdown_dict[asset]['total_value'] += asset_value
            else:
                holdings_breakdown_dict[asset] = {
                    "asset": asset,
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
        logger = logging.getLogger(__name__)
        logger.error(f"Error in get_portfolio_value: {e}")
        return {"status": "error", "message": str(e)}


@app.post('/simulate/order')
def simulate_order(request: SimulateRequest):
    """Simulate opening a leveraged position (paper trading only)."""
    try:
        result = trading_service.simulate_order(request.asset, request.side, request.quantity, request.leverage, request.asset_type, request.account_id)
        return {"status": "success", "result": result}
    except Exception as e:
        return {"status": "error", "message": str(e)}


@app.get('/simulate/liquidation')
def get_liquidation_price(entry_price: float, side: str = 'long', leverage: float = 2.0, maintenance_rate: Optional[float] = None, asset: Optional[str] = None):
    """Return computed liquidation price for given parameters. `asset` is optional.
    If `maintenance_rate` omitted, use paper account default.
    """
    try:
        acct = None
        if maintenance_rate is None:
            # try to read from paper account default
            from .database import get_or_create_paper_account
            acct = get_or_create_paper_account(1)
            maintenance_rate = acct.get('maintenance_rate', 0.25)

        liq = trading_service.compute_liquidation_price(entry_price, side, leverage, maintenance_rate)
        return {"status": "success", "liquidation_price": liq}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get('/positions/leverage')
def get_leverage_positions():
    """Get all open leverage/perpetual positions"""
    try:
        from .database import get_open_leverage_positions
        from .fetch_crypto import get_crypto_price
        from .fetch_stocks import get_stock_price
        import os
        
        positions = get_open_leverage_positions(account_id=1)
        
        # Enrich with current prices and P&L
        api_key = os.getenv('ALPHA_VANTAGE_API_KEY') if os.getenv('STOCK_PRICE_PROVIDER', 'finnhub').lower() == 'alpha' else os.getenv('FINNHUB_API_KEY')
        
        enriched = []
        for pos in positions:
            current_price = 0
            if pos['asset_type'] == 'stock':
                stock_data = get_stock_price(pos['asset'], api_key)
                current_price = float(stock_data.get('05. price', 0)) if stock_data else 0
            else:
                price_data = get_crypto_price(pos['asset'])
                current_price = price_data['usd'] if price_data else 0
            
            if current_price == 0:
                continue
            
            # Calculate P&L
            position_value = pos['quantity'] * current_price
            entry_value = pos['quantity'] * pos['entry_price']
            entry_price = pos['entry_price']
            leverage = pos['leverage']
            
            if pos['side'].lower() == 'long':
                pnl = position_value - entry_value
                pnl_percent = (current_price - entry_price) / entry_price * 100 * leverage if entry_price > 0 else 0
            else:  # short
                pnl = entry_value - position_value
                pnl_percent = ((entry_price - current_price) / entry_price * 100 * leverage if entry_price > 0 else 0)
            
            # Check if position has been liquidated
            is_liquidated = trading_service.check_liquidation_status(current_price, pos['liquidation_price'], pos['side'])
            
            enriched.append({
                **pos,
                'current_price': current_price,
                'position_value': position_value,
                'pnl': pnl,
                'pnl_percent': pnl_percent,
                'distance_to_liquidation': abs(current_price - pos['liquidation_price']),
                'liquidation_distance_percent': (abs(current_price - pos['liquidation_price']) / current_price * 100) if current_price > 0 else 0,
                'is_liquidated': is_liquidated,
                'liquidation_status': 'LIQUIDATED' if is_liquidated else 'ACTIVE'
            })
        
        return {"status": "success", "positions": enriched}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.post('/positions/leverage/{position_id}/close')
def close_leverage_position(position_id: int):
    """Close a leverage position and return margin"""
    try:
        from .database import close_leverage_position, get_open_leverage_positions, get_or_create_paper_account, update_paper_account_cash
        
        # Get the position to find required margin
        positions = get_open_leverage_positions(account_id=1)
        position = next((p for p in positions if p['id'] == position_id), None)
        
        if not position:
            return {"status": "error", "message": "Position not found"}
        
        # Return the margin to available cash
        update_paper_account_cash(1, position['required_margin'])
        
        # Close the position
        close_leverage_position(position_id)
        
        return {"status": "success", "message": f"Position closed. Margin returned: ${position['required_margin']:.2f}"}
    except Exception as e:
        return {"status": "error", "message": str(e)}


@app.get("/exchange-rates")
def get_exchange_rates():
    """Get exchange rates for USD, EUR, GBP, ZAR"""
    from .currency_fetcher import get_zar_exchange_rates
    
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
    from .fetch_crypto import get_crypto_price
    from .fetch_stocks import get_stock_price
    
    logger = logging.getLogger(__name__)
    
    try:
        conn = sqlite3.connect('crypto.db')
        cursor = conn.cursor()
        
        # Get all transactions
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
        
        # Calculate per-asset gains/losses
        asset_data = {}
        total_invested = 0
        total_realized_gains = 0
        
        for asset, trans_type, quantity, price in transactions:
            if asset not in asset_data:
                asset_data[asset] = {
                    'buys': [],
                    'sells': [],
                    'total_bought': 0,
                    'total_sold': 0,
                    'cost_basis': 0,
                    'proceeds': 0
                }
            
            if trans_type == 'BUY':
                asset_data[asset]['buys'].append({'quantity': quantity, 'price': price})
                asset_data[asset]['total_bought'] += quantity
                asset_data[asset]['cost_basis'] += quantity * price
                total_invested += quantity * price
            else:  # SELL
                asset_data[asset]['sells'].append({'quantity': quantity, 'price': price})
                asset_data[asset]['total_sold'] += quantity
                asset_data[asset]['proceeds'] += quantity * price
                total_realized_gains += (quantity * price) - (quantity * (asset_data[asset]['cost_basis'] / asset_data[asset]['total_bought'] if asset_data[asset]['total_bought'] > 0 else 0))
        
        # Calculate unrealized gains per asset
        holdings_analysis = []
        total_current_value = 0
        total_unrealized_gains = 0
        
        for asset, data in asset_data.items():
            current_quantity = data['total_bought'] - data['total_sold']
            
            if current_quantity <= 0:
                continue
            
            # Get current price with error handling
            current_price = 0
            
            try:
                if len(asset) <= 5 and asset.isupper():
                    # Try to fetch as stock
                    stock_data = get_stock_price(asset)
                    if stock_data:
                        current_price = float(stock_data.get('05. price', 0))
                
                # If not a stock or stock fetch failed, try as crypto
                if current_price == 0:
                    price_data = get_crypto_price(asset.lower())
                    if price_data:
                        current_price = float(price_data.get('usd', 0))
            except Exception as price_err:
                logger.warning(f"Could not fetch price for {asset}: {price_err}")
                current_price = 0
            
            avg_entry_price = data['cost_basis'] / data['total_bought'] if data['total_bought'] > 0 else 0
            current_value = current_quantity * current_price if current_price > 0 else 0
            unrealized_gain = current_value - (current_quantity * avg_entry_price) if current_price > 0 else -(current_quantity * avg_entry_price)
            
            total_current_value += current_value
            total_unrealized_gains += unrealized_gain
            
            holdings_analysis.append({
                "asset": asset,
                "quantity": round(current_quantity, 4),
                "avg_entry_price": round(avg_entry_price, 2),
                "current_price": round(current_price, 2) if current_price > 0 else 0,
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
        logger = logging.getLogger(__name__)
        logger.error(f"Error in get_gains_losses: {e}", exc_info=True)
        return {"status": "error", "message": "Failed to fetch analytics data"}

@app.post("/admin/reset-database")
def reset_db():
    """Reset database - clear all transactions and portfolio data"""
    try:
        success = reset_database()
        if success:
            return {
                "status": "success",
                "message": "Database reset successfully - all data cleared",
                "timestamp": datetime.now().isoformat()
            }
        else:
            return {
                "status": "error",
                "message": "Failed to reset database"
            }
    except Exception as e:
        return {
            "status": "error",
            "message": f"Error resetting database: {str(e)}"
        }

@app.get("/search/crypto")
def search_crypto(q: str = ""):
    """Search for cryptocurrencies by name or symbol"""
    import requests
    
    logger = logging.getLogger(__name__)
    
    if not q or len(q) < 1:
        return {"status": "error", "message": "Search query too short"}
    
    try:
        # Use CoinGecko search API
        search_url = f"https://api.coingecko.com/api/v3/search?query={q}"
        response = requests.get(search_url, timeout=5)
        response.raise_for_status()
        data = response.json()
        
        # Extract coins from search results
        coins = data.get('coins', [])[:10]  # Limit to 10 results
        
        results = [
            {
                "id": coin['id'],
                "name": coin['name'],
                "symbol": coin['symbol'].upper(),
                "image": coin.get('large', '')
            }
            for coin in coins
        ]
        
        logger.info(f"🔍 Crypto search for '{q}': found {len(results)} results")
        return {
            "status": "success",
            "query": q,
            "results": results
        }
    except requests.exceptions.Timeout:
        logger.warning(f"⏱️ CoinGecko search timeout for query: {q}")
        return {"status": "error", "message": "Search timeout - try again"}
    except Exception as e:
        logger.error(f"❌ Error searching crypto: {e}")
        return {"status": "error", "message": str(e)}

@app.get("/search/stocks")
def search_stocks(q: str = ""):
    """Search for stock symbols"""
    logger = logging.getLogger(__name__)
    
    # Common US stocks database
    STOCKS_DATABASE = {
        'AAPL': 'Apple Inc.',
        'MSFT': 'Microsoft Corporation',
        'GOOGL': 'Alphabet Inc.',
        'GOOG': 'Alphabet Inc.',
        'AMZN': 'Amazon.com Inc.',
        'NVDA': 'NVIDIA Corporation',
        'META': 'Meta Platforms Inc.',
        'TSLA': 'Tesla Inc.',
        'JPM': 'JPMorgan Chase & Co.',
        'JNJ': 'Johnson & Johnson',
        'V': 'Visa Inc.',
        'WMT': 'Walmart Inc.',
        'PG': 'Procter & Gamble',
        'UNH': 'UnitedHealth Group',
        'HD': 'Home Depot Inc.',
        'DIS': 'Disney Corporation',
        'VZ': 'Verizon Communications',
        'KO': 'Coca-Cola Company',
        'INTC': 'Intel Corporation',
        'AMD': 'Advanced Micro Devices',
        'BA': 'Boeing Company',
        'GS': 'Goldman Sachs',
        'IBM': 'IBM Corporation',
        'ORCL': 'Oracle Corporation',
        'CSCO': 'Cisco Systems',
    }
    
    if not q or len(q) < 1:
        return {"status": "error", "message": "Search query too short"}
    
    try:
        query_upper = q.upper()
        results = []
        
        # Search by symbol or name
        for symbol, name in STOCKS_DATABASE.items():
            if query_upper in symbol or query_upper in name.upper():
                results.append({
                    "symbol": symbol,
                    "name": name
                })
        
        logger.info(f"🔍 Stock search for '{q}': found {len(results)} results")
        return {
            "status": "success",
            "query": q,
            "results": results[:10]  # Limit to 10 results
        }
    except Exception as e:
        logger.error(f"❌ Error searching stocks: {e}")
        return {"status": "error", "message": str(e)}

@app.get("/api/status")
def get_api_status():
    """Get API usage status for all providers"""
    logger = logging.getLogger(__name__)
    try:
        status_summary = get_status_summary()
        
        # Add color-coded status indicators
        status_with_indicators = {}
        for provider, data in status_summary['providers'].items():
            indicator = "🟢"  # Green
            if data['status'] == 'warning':
                indicator = "🟡"  # Yellow
            elif data['status'] == 'critical':
                indicator = "🔴"  # Red
            elif data['status'] == 'unknown':
                indicator = "⚪"  # Gray
            
            status_with_indicators[provider] = {
                **data,
                'indicator': indicator
            }
        
        # Create status log string
        status_parts = [f"{k}({v['indicator']})" for k, v in status_with_indicators.items()]
        logger.info(f"📊 API Status: {', '.join(status_parts)}")
        
        return {
            "status": "success",
            "timestamp": status_summary['timestamp'],
            "providers": status_with_indicators
        }
    except Exception as e:
        logger.error(f"Error getting API status: {e}")
        return {"status": "error", "message": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)