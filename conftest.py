import pytest
from fastapi.testclient import TestClient
import os

# Set environment variables for testing before importing the app
os.environ["STOCK_PRICE_PROVIDER"] = "finnhub"
os.environ["FINNHUB_API_KEY"] = "test_finnhub_key"

from backend.main import app, get_stock_api_key  

@pytest.fixture
def client():
    """Provides a TestClient for the FastAPI app."""
    return TestClient(app)

@pytest.fixture(autouse=True)
def mock_db_init(mocker):
    """Prevent tests from initializing the real database."""
    mocker.patch("backend.main.initialise_db", return_value=None)