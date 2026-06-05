import pytest
import os
from backend.api import get_stock_api_key

# ==========================================
# UNIT TESTS
# ==========================================

def test_get_stock_api_key_finnhub(mocker):
    """Test API key selection for Finnhub."""
    mocker.patch.dict(os.environ, {"STOCK_PRICE_PROVIDER": "finnhub", "FINNHUB_API_KEY": "fake_finnhub_key"})
    assert get_stock_api_key() == "fake_finnhub_key"

def test_get_stock_api_key_alpha_vantage(mocker):
    """Test API key selection for Alpha Vantage."""
    mocker.patch.dict(os.environ, {"STOCK_PRICE_PROVIDER": "alphvantage", "ALPHA_VANTAGE_API_KEY": "fake_alpha_key"})
    assert get_stock_api_key() == "fake_alpha_key"


# ==========================================
# INTEGRATION TESTS (API Endpoints)
# ==========================================

def test_read_root(client):
    """Test the root endpoint returns a 200 OK."""
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "Welcome to the Crypto Data Pipeline API!"}

def test_health_check_mocked_db(client, mocker):
    """Test the health check endpoint with a mocked database connection."""
    # Mock the sqlite3.connect chain
    mock_conn = mocker.MagicMock()
    mock_cursor = mocker.MagicMock()
    mock_conn.cursor.return_value = mock_cursor
    mock_cursor.fetchone.return_value = [42]  # Fake transaction count
    
    mocker.patch("sqlite3.connect", return_value=mock_conn)
    
    response = client.get("/health")
    
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["database"] == "connected"
    assert data["transactions_stored"] == 42

def test_buy_crypto_success(client, mocker):
    """Test the /buy/crypto endpoint with mocked trading service."""
    # Mock the trading service to prevent actual database/API calls
    mocker.patch(
        "backend.api.trading_service.buy_crypto", 
        return_value={"price": 50000.0, "total_cost": 50000.0}
    )
    
    payload = {
        "asset": "bitcoin",
        "quantity": 1.0
    }
    
    response = client.post("/buy/crypto", json=payload)
    
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert "Bought 1.0000 bitcoin" in data["message"]

def test_buy_stock_with_zar_amount(client, mocker):
    """Test that buying a stock with a ZAR amount converts correctly."""
    mocker.patch(
        "backend.api.trading_service.buy_stock",
        return_value={"price": 627.57, "total_cost": 33.01}
    )
    mocker.patch(
        "backend.fetch_stocks.get_stock_price",
        return_value={"05. price": "627.57"}
    )
    # R1000 ZAR at ~18.5 ZAR/USD = ~$54, which at $627.57/share = ~0.086 shares
    mocker.patch(
        "backend.database.get_latest_exchange_rate",
        side_effect=lambda c: 18.5 if c == 'USD' else 1.0
    )

    response = client.post("/buy/stock", json={
        "asset": "META",
        "amount": 1000,
        "currency": "ZAR"
    })

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    # Should be a fraction of a share, not 1000 shares
    assert "0." in data["message"]

def test_sell_crypto_with_usd_amount(client, mocker):
    """Test that selling crypto with a USD amount converts to quantity."""
    mocker.patch(
        "backend.fetch_crypto.get_crypto_price",
        return_value={"usd": 50000.0},
    )
    mocker.patch(
        "backend.api.trading_service.sell_crypto",
        return_value={"price": 50000.0, "total_proceeds": 100.0},
    )

    response = client.post("/sell/crypto", json={
        "asset": "bitcoin",
        "amount": 100,
        "currency": "USD",
    })

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert "0.0020" in data["message"]


def test_sell_stock_with_zar_amount(client, mocker):
    """Test that selling a stock with a ZAR amount converts correctly."""
    mocker.patch(
        "backend.fetch_stocks.get_stock_price",
        return_value={"05. price": "627.57"},
    )
    mocker.patch(
        "backend.api.trading_service.sell_stock",
        return_value={"price": 627.57, "total_proceeds": 54.0},
    )
    mocker.patch(
        "backend.database.get_latest_exchange_rate",
        side_effect=lambda c: 18.5 if c == 'USD' else 1.0,
    )

    response = client.post("/sell/stock", json={
        "asset": "META",
        "amount": 1000,
        "currency": "ZAR",
    })

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert "0." in data["message"]


def test_buy_crypto_invalid_quantity(client):
    """Test that missing quantity fails at the Pydantic validation layer or logic layer."""
    payload = {
        "asset": "bitcoin",
        "quantity": -5.0 # Invalid quantity
    }
    
    response = client.post("/buy/crypto", json=payload)
    
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "error"
    assert data["message"] == "Invalid quantity or amount"

def test_simulate_liquidation(client, mocker):
    """Test the liquidation math endpoint with mocked DB."""
    # Mock the paper account fetch and liquidation price computation to isolate the test
    mocker.patch(
        "backend.api.trading_service.compute_liquidation_price", 
        return_value=45000.0
    )
    mocker.patch("backend.database.get_or_create_paper_account", return_value={"maintenance_rate": 0.25})
    response = client.get("/simulate/liquidation?entry_price=50000&side=long&leverage=2")
    
    assert response.status_code == 200
    assert response.json()["status"] == "success"
    assert response.json()["liquidation_price"] == 45000.0

def test_search_stocks_valid(client):
    """Test local dictionary stock search."""
    response = client.get("/search/stocks?q=aapl")
    
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert len(data["results"]) > 0
    assert data["results"][0]["symbol"] == "AAPL"

def test_search_stocks_too_short(client):
    """Test stock search with empty query."""
    response = client.get("/search/stocks?q=")
    
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "error"
    assert data["message"] == "Search query too short"


def test_close_leverage_position_returns_pnl(client, mocker):
    """Closing a position should return margin plus P&L."""
    mocker.patch(
        "backend.api.trading_service.close_leverage_position",
        return_value={"pnl": 25.0, "cash_returned": 125.0, "close_price": 52000.0, "close_reason": "close"},
    )

    response = client.post("/positions/leverage/1/close")

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["pnl"] == 25.0
    assert data["cash_returned"] == 125.0
    assert data["close_price"] == 52000.0


def test_close_liquidated_position_rejected(client, mocker):
    """Manual close should fail once a position is liquidated."""
    mocker.patch(
        "backend.api.trading_service.close_leverage_position",
        side_effect=ValueError("Position has been liquidated"),
    )

    response = client.post("/positions/leverage/1/close")

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "error"
    assert data["message"] == "Position has been liquidated"


def test_get_leverage_positions_auto_liquidates(client, mocker):
    """Positions past liquidation should be removed and reported."""
    sample_position = {
        "id": 7,
        "account_id": 1,
        "asset": "bitcoin",
        "asset_type": "crypto",
        "side": "long",
        "quantity": 2.0,
        "entry_price": 50000.0,
        "leverage": 2.0,
        "liquidation_price": 25200.0,
        "required_margin": 50000.0,
        "opened_at": "2026-01-01 00:00:00",
        "maintenance_rate": 0.004,
    }
    mocker.patch("backend.database.get_open_leverage_positions", return_value=[sample_position])
    mocker.patch("backend.api.trading_service._get_market_price", return_value=25000.0)
    mocker.patch(
        "backend.api.trading_service.check_liquidation_status",
        return_value=True,
    )
    mocker.patch(
        "backend.api.trading_service.liquidate_leverage_position",
        return_value={
            "position_id": 7,
            "asset": "bitcoin",
            "side": "long",
            "pnl": -50000.0,
            "margin_lost": 50000.0,
            "close_price": 25000.0,
            "close_reason": "liquidation",
        },
    )

    response = client.get("/positions/leverage")

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["positions"] == []
    assert len(data["recently_liquidated"]) == 1
    assert data["recently_liquidated"][0]["margin_lost"] == 50000.0


def test_compute_position_pnl_long_and_short():
    """P&L math should reflect side and price movement."""
    from backend.services import TradingService

    service = TradingService()
    position = {"side": "long", "quantity": 2.0, "entry_price": 100.0}

    assert service.compute_position_pnl(position, 110.0) == 20.0
    assert service.compute_position_pnl({**position, "side": "short"}, 90.0) == 20.0