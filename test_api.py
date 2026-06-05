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