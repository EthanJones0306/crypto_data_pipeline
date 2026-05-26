import os
import logging
from .fetch_crypto import get_crypto_price, get_crypto_prices
from .fetch_stocks import get_stock_price, get_stock_prices
from .database import store_prices, store_stock_prices, store_buy_transaction, store_sell_transaction
from .utils import normalize_crypto_asset

logger = logging.getLogger(__name__)


class TradingService:
    """Service layer for trading operations"""
    
    def buy_crypto(self, asset: str, quantity: float) -> dict:
        """Buy cryptocurrency at current market price"""
        logger.info(f"Attempting to buy {quantity} {asset}")
        
        # Try to fetch price for the specific asset (handles any CoinGecko ID)
        price_data = get_crypto_price(asset)
        if not price_data:
            raise ValueError(f"Unable to fetch price for {asset}")
        
        current_price = price_data['usd']
        store_buy_transaction(asset, quantity, current_price)
        logger.info(f"Successfully bought {quantity} {asset} at ${current_price}")
        return {"price": current_price, "total_cost": quantity * current_price}
    
    def buy_stock(self, symbol: str, quantity: float) -> dict:
        """Buy stock at current market price"""
        logger.info(f"Attempting to buy {quantity} {symbol}")
        
        # Get API key
        provider = os.getenv('STOCK_PRICE_PROVIDER', 'finnhub').lower()
        if provider == 'finnhub':
            api_key = os.getenv('FINNHUB_API_KEY')
        else:
            api_key = os.getenv('ALPHA_VANTAGE_API_KEY')
        
        # Fetch price for this specific stock
        stock_data = get_stock_price(symbol, api_key)
        if not stock_data:
            raise ValueError(f"Unable to fetch price for {symbol}")
        
        current_price = float(stock_data['05. price'])
        store_buy_transaction(symbol, quantity, current_price)
        logger.info(f"Successfully bought {quantity} {symbol} at ${current_price}")
        return {"price": current_price, "total_cost": quantity * current_price}
    
    def sell_crypto(self, asset: str, quantity: float) -> dict:
        """Sell cryptocurrency at current market price"""
        logger.info(f"Attempting to sell {quantity} {asset}")
        
        # Try to fetch price for the specific asset (handles any CoinGecko ID)
        price_data = get_crypto_price(asset)
        if not price_data:
            raise ValueError(f"Unable to fetch price for {asset}")
        
        current_price = price_data['usd']
        store_sell_transaction(asset, quantity, current_price)
        logger.info(f"Successfully sold {quantity} {asset} at ${current_price}")
        return {"price": current_price, "total_proceeds": quantity * current_price}
    
    def sell_stock(self, symbol: str, quantity: float) -> dict:
        """Sell stock at current market price"""
        logger.info(f"Attempting to sell {quantity} {symbol}")
        
        # Get API key
        provider = os.getenv('STOCK_PRICE_PROVIDER', 'finnhub').lower()
        if provider == 'finnhub':
            api_key = os.getenv('FINNHUB_API_KEY')
        else:
            api_key = os.getenv('ALPHA_VANTAGE_API_KEY')
        
        # Fetch price for this specific stock
        stock_data = get_stock_price(symbol, api_key)
        if not stock_data:
            raise ValueError(f"Unable to fetch price for {symbol}")
        
        current_price = float(stock_data['05. price'])
        store_sell_transaction(symbol, quantity, current_price)
        logger.info(f"Successfully sold {quantity} {symbol} at ${current_price}")
        return {"price": current_price, "total_proceeds": quantity * current_price}
