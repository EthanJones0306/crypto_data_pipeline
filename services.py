import os
import logging
from fetch_crypto import get_crypto_prices
from fetch_stocks import get_stock_prices
from database import store_prices, store_stock_prices, store_buy_transaction, store_sell_transaction
from utils import normalize_crypto_asset

logger = logging.getLogger(__name__)


class TradingService:
    """Service layer for trading operations"""
    
    def buy_crypto(self, asset: str, quantity: float) -> dict:
        """Buy cryptocurrency at current market price"""
        logger.info(f"Attempting to buy {quantity} {asset}")
        crypto_key = normalize_crypto_asset(asset)
        latest_prices = get_crypto_prices()
        store_prices(latest_prices)
        current_price = latest_prices[crypto_key]['usd']
        store_buy_transaction(asset, quantity, current_price)
        logger.info(f"Successfully bought {quantity} {asset} at ${current_price}")
        return {"price": current_price, "total_cost": quantity * current_price}
    
    def buy_stock(self, symbol: str, quantity: float) -> dict:
        """Buy stock at current market price"""
        logger.info(f"Attempting to buy {quantity} {symbol}")
        api_key = os.getenv('ALPHA_VANTAGE_API_KEY')
        stock_data = get_stock_prices(api_key)
        store_stock_prices(stock_data)
        current_price = float(stock_data[symbol]['05. price'])
        store_buy_transaction(symbol, quantity, current_price)
        logger.info(f"Successfully bought {quantity} {symbol} at ${current_price}")
        return {"price": current_price, "total_cost": quantity * current_price}
    
    def sell_crypto(self, asset: str, quantity: float) -> dict:
        """Sell cryptocurrency at current market price"""
        logger.info(f"Attempting to sell {quantity} {asset}")
        crypto_key = normalize_crypto_asset(asset)
        latest_prices = get_crypto_prices()
        store_prices(latest_prices)
        current_price = latest_prices[crypto_key]['usd']
        store_sell_transaction(asset, quantity, current_price)
        logger.info(f"Successfully sold {quantity} {asset} at ${current_price}")
        return {"price": current_price, "total_proceeds": quantity * current_price}
    
    def sell_stock(self, symbol: str, quantity: float) -> dict:
        """Sell stock at current market price"""
        logger.info(f"Attempting to sell {quantity} {symbol}")
        api_key = os.getenv('ALPHA_VANTAGE_API_KEY')
        stock_data = get_stock_prices(api_key)
        store_stock_prices(stock_data)
        current_price = float(stock_data[symbol]['05. price'])
        store_sell_transaction(symbol, quantity, current_price)
        logger.info(f"Successfully sold {quantity} {symbol} at ${current_price}")
        return {"price": current_price, "total_proceeds": quantity * current_price}
