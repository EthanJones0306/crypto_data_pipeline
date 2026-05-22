# 📈 Portfolio Tracker

A full-stack investment portfolio tracker that lets you simulate buying and selling stocks and cryptocurrencies, track your P&L in real time, and monitor your portfolio across multiple currencies.

Built with a **React** frontend and a **FastAPI** Python backend, pulling live market data from CoinGecko, Finnhub, and Alpha Vantage.

---

## ✨ Features

- **Live price feeds** — Real-time crypto and stock prices via CoinGecko, Finnhub, and Alpha Vantage with automatic fallback and 24-hour caching
- **Trading simulation** — Buy and sell stocks and crypto at live market prices, stored in a local SQLite database
- **Portfolio analytics** — Unrealized gains/losses, ROI, average entry price, and per-asset performance breakdown
- **Multi-currency support** — Switch between USD, EUR, GBP, and ZAR instantly (preference persisted in localStorage)
- **Portfolio allocation chart** — Interactive donut chart showing holdings breakdown (Recharts)
- **Debounced asset search** — Search across 1000+ cryptocurrencies via CoinGecko's search API, or find stocks by ticker/name
- **API rate limit monitoring** — Live dashboard showing usage and remaining calls for each data provider
- **Dark / Light mode** — Toggle between themes, persisted across sessions
- **Automated data pipeline** — APScheduler runs the pipeline daily at midnight to keep prices updated

---

## 🛠️ Tech Stack

**Frontend**
- React 19
- Recharts (donut chart)
- CSS custom properties (design tokens)

**Backend**
- Python / FastAPI
- SQLite (via Python's built-in `sqlite3`)
- APScheduler (daily pipeline)

**Data Sources**
- [CoinGecko](https://www.coingecko.com/en/api) — Crypto prices & search (no key required)
- [Finnhub](https://finnhub.io/) — Stock prices (free API key required)
- [Alpha Vantage](https://www.alphavantage.co/) — Stock prices alternative (free API key required)
- [Frankfurter](https://www.frankfurter.app/) — Exchange rates (no key required)

---

## 📁 Project Structure
portfolio-tracker/
├── frontend/                   # React frontend
│   └── src/
│       ├── components/         # PortfolioValue, Trading, Analytics, Prices, etc.
│       ├── services/api.js     # All API calls to the backend
│       └── constants/          # Asset name mappings
├── api.py                      # FastAPI app & all REST endpoints
├── services.py                 # Trading service layer (buy/sell logic)
├── database.py                 # SQLite schema & all DB operations
├── fetch_crypto.py             # CoinGecko integration with caching & fallback
├── fetch_stocks.py             # Finnhub / Alpha Vantage integration with caching
├── currency_fetcher.py         # Frankfurter exchange rate fetcher
├── api_status.py               # API rate limit tracker
├── scheduler.py                # APScheduler daily pipeline runner
├── main.py                     # Manual pipeline entry point
├── visualise_data.py           # Terminal price table viewer
├── requirements.txt
└── .env                        # API keys (not committed — see below)

---

## 🚀 Getting Started

### Prerequisites

- Python 3.8+
- Node.js 16+
- A free [Finnhub](https://finnhub.io/) API key

---

### 1. Clone the repo

```bash
git clone https://github.com/EthanJones0306/crypto_data_pipeline.git
cd crypto_data_pipeline
```

---

### 2. Set up the backend

```bash
pip install -r requirements.txt
```

Create a `.env` file in the root directory:

```env
FINNHUB_API_KEY=your_finnhub_key_here
ALPHA_VANTAGE_API_KEY=your_alpha_vantage_key_here   # optional
STOCK_PRICE_PROVIDER=finnhub                         # or alphavantage
```

Get a free Finnhub key at [finnhub.io](https://finnhub.io/) — no credit card required.

Start the API server:

```bash
python api.py
```

The backend runs on `http://localhost:8000`. You can explore all endpoints at `http://localhost:8000/docs` (FastAPI's built-in Swagger UI).

---

### 3. Set up the frontend

```bash
cd frontend
npm install
npm start
```

The app opens at `http://localhost:3000`.

---

### 4. (Optional) Run the data pipeline manually

```bash
python main.py
```

Or start the automated daily scheduler:

```bash
python scheduler.py
```

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Database and API health check |
| GET | `/portfolio/value` | Current holdings with live prices |
| GET | `/analytics/gains-losses` | Unrealized P&L per asset |
| GET | `/prices/latest` | Latest crypto and stock prices |
| GET | `/transactions` | Transaction history |
| GET | `/exchange-rates` | USD → EUR, GBP, ZAR rates |
| POST | `/buy/crypto` | Simulate buying a cryptocurrency |
| POST | `/sell/crypto` | Simulate selling a cryptocurrency |
| POST | `/buy/stock` | Simulate buying a stock |
| POST | `/sell/stock` | Simulate selling a stock |
| GET | `/search/crypto?q=` | Search cryptocurrencies |
| GET | `/search/stocks?q=` | Search stocks |
| GET | `/api/status` | API provider rate limit usage |
| POST | `/admin/reset-database` | Clear all data and reset portfolio |

---

## ⚙️ How It Works

1. **Prices** are fetched from CoinGecko (crypto) and Finnhub/Alpha Vantage (stocks). Responses are cached locally for 24 hours to avoid hitting rate limits, with hardcoded fallback prices as a last resort.

2. **Trades** are recorded as transactions in SQLite. Portfolio value is computed by aggregating BUY/SELL quantities per asset and multiplying by the current live price.

3. **Gains/Losses** are calculated using the average cost basis method — total amount spent on buys divided by total quantity bought.

4. **Exchange rates** are fetched from the Frankfurter API (ZAR as base), then inverted to produce USD → other currency conversion rates.

5. **Rate limit monitoring** tracks API calls across providers in a local `api_status.json` file, resetting counts daily.

---

## 🔑 Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `FINNHUB_API_KEY` | Yes (if using Finnhub) | Stock price data |
| `ALPHA_VANTAGE_API_KEY` | Yes (if using Alpha Vantage) | Stock price data alternative |
| `STOCK_PRICE_PROVIDER` | No (default: `finnhub`) | Which stock provider to use |