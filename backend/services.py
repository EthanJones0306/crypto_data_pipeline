import os
import logging
from datetime import datetime
from .fetch_crypto import get_crypto_price, get_crypto_prices
from .fetch_stocks import get_stock_price, get_stock_prices
from .database import store_prices, store_stock_prices, store_buy_transaction, store_sell_transaction
from .database import get_or_create_paper_account, update_paper_account_cash, update_position, store_transactions
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

    # --- Paper trading helpers ---
    def compute_liquidation_price(self, entry_price: float, side: str, leverage: float, maintenance_rate: float = 0.25) -> float:
        """Compute a simple liquidation price for an isolated position.

        Long: L = E * (1 + m - 1/lev)
        Short: L = E * (1 - m + 1/lev)
        Where E is entry_price, m maintenance_rate
        """
        if leverage <= 0:
            raise ValueError('Leverage must be > 0')
        if side.lower() == 'long':
            return entry_price * (1 + maintenance_rate - 1.0 / leverage)
        else:
            return entry_price * (1 - maintenance_rate + 1.0 / leverage)

    def simulate_order(self, asset: str, side: str, quantity: float, leverage: float = 2.0, asset_type: str = 'crypto', account_id: int = 1) -> dict:
        """Simulate opening a long/short position with leverage for paper trading.

        Returns simulated fill price, required margin and liquidation price.
        """
        # fetch current price
        if asset_type == 'stock':
            # choose API key based on env (reuse existing fetch)
            from .fetch_stocks import get_stock_price
            provider = os.getenv('STOCK_PRICE_PROVIDER', 'finnhub').lower()
            if provider == 'finnhub':
                api_key = os.getenv('FINNHUB_API_KEY')
            else:
                api_key = os.getenv('ALPHA_VANTAGE_API_KEY')
            price_data = get_stock_price(asset, api_key)
            current_price = float(price_data['05. price']) if price_data else None
        else:
            price_data = get_crypto_price(asset)
            current_price = price_data['usd'] if price_data else None

        if not current_price:
            raise ValueError('Unable to fetch current price for simulation')

        # calculate required margin per unit and total
        position_value = quantity * current_price
        required_margin = abs(position_value) / leverage

        # ensure paper account exists and has funds
        acct = get_or_create_paper_account(account_id)
        if acct['available_cash'] < required_margin:
            raise ValueError('Insufficient paper account available cash for required margin')

        # store simulated transaction (mark as paper)
        now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        tx = {
            'asset': asset,
            'type': 'BUY' if side.lower() == 'long' else 'SELL',
            'quantity': quantity,
            'price': current_price,
            'is_paper': 1
        }
        store_transactions([tx])

        # reserve margin (subtract from available_cash)
        update_paper_account_cash(account_id, -required_margin)

        # update paper positions (long = positive qty, short = negative)
        signed_qty = quantity if side.lower() == 'long' else -quantity
        update_position(account_id, asset, signed_qty, current_price, is_paper=1)

        liq_price = self.compute_liquidation_price(current_price, side, leverage, acct.get('maintenance_rate', 0.25))

        return {
            'filled_price': current_price,
            'required_margin': required_margin,
            'liquidation_price': liq_price,
            'account': acct
        }
