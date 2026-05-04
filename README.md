# Crypto Data Pipeline

A daily automated data pipeline that fetches cryptocurrency prices, stock prices, and exchange rates, storing them in a local SQLite database for analysis.

## Features

- **Multi-source data collection**: Fetches data from CoinGecko, Alpha Vantage, and Frankfurter APIs
- **Daily automation**: Scheduled to run automatically at midnight using APScheduler
- **Multiple asset types**: Bitcoin, Ethereum, Solana, AAPL, GOOG, NVDA, and ZAR exchange rates
- **Data persistence**: Stores all data in SQLite for historical tracking
- **Clean data visualization**: Terminal-based table view of latest prices
- **Modular architecture**: Separate modules for fetching, storing, and scheduling

## Project Structure

```
crypto_data_pipeline/
├── main.py                 # Main pipeline orchestrator
├── scheduler.py            # Daily scheduler with APScheduler
├── fetch_crypto.py         # Fetches from CoinGecko
├── fetch_stocks.py         # Fetches from Alpha Vantage
├── currency_fetcher.py     # Fetches ZAR exchange rates
├── database.py             # SQLite database operations
├── visualise_data.py       # Display prices in table format
├── check_data.py           # View raw database
├── requirements.txt        # Python dependencies
├── .env                    # API keys (not in git)
├── .gitignore              # Git exclusions
└── crypto.db               # SQLite database
```

## Getting Started

### Requirements
- Python 3.8+
- pip

### Installation

1. Clone and navigate to the project:
```bash
git clone https://github.com/EthanJones0306/crypto_data_pipeline.git
cd crypto_data_pipeline
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Create a `.env` file and add your Alpha Vantage API key:
```
ALPHA_VANTAGE_API_KEY=your_key_here
```

Get a free key at https://www.alphavantage.co/

## Running the Pipeline

Manual run:
```bash
python main.py
```

View latest prices:
```bash
python visualise_data.py
```

Automated daily run:
```bash
python scheduler.py
```

The scheduler runs at midnight every day.

## APIs Used

- **CoinGecko** - Cryptocurrency prices (no key needed)
- **Alpha Vantage** - Stock prices (free API key required)
- **Frankfurter** - Exchange rates (no key needed)