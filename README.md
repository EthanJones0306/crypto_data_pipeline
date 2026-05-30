# � Crypto Portfolio Tracker

> A production-ready full-stack investment portfolio application showcasing modern React and Python development practices, real-time data integration, and professional UI/UX design.

[![React](https://img.shields.io/badge/React-19.2.6-61dafb?logo=react)](https://react.dev)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.109-009485?logo=fastapi)](https://fastapi.tiangolo.com)
[![Python](https://img.shields.io/badge/Python-3.11-3776ab?logo=python)](https://www.python.org)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## 🎯 Overview

A sophisticated full-stack application for managing and analysing multi-asset investment portfolios. Track real-time positions in stocks and cryptocurrencies, simulate leverage trading with liquidation calculations, analyse gains/losses with interactive visualisations, and monitor market data from multiple providers with intelligent caching and fallback strategies.

**Perfect for:** Investment simulation, portfolio analysis, learning full-stack development patterns, API integration, and building sophisticated data-driven interfaces.

---

## ✨ Core Features

### 📊 Portfolio Management
- **Real-time portfolio value** — Aggregated across crypto and stock holdings
- **Live price feeds** — CoinGecko (crypto), Finnhub (stocks), with automatic fallback and 24-hour caching
- **Transaction history** — Complete buy/sell audit log with timestamps and execution prices
- **Multi-currency support** — USD, EUR, GBP, ZAR with live exchange rates

### 📈 Advanced Analytics  
- **Gains/losses analysis** — Per-asset P&L with percentage returns (color-coded gains in green, losses in red)
- **Interactive charts** — Pie chart for allocation breakdown, bar chart for performance comparison
- **Holdings breakdown** — Detailed table with entry prices, current prices, and unrealised gains
- **Portfolio health metrics** — Total invested, current value, ROI percentage, cost basis tracking

### 🎮 Trading Features
- **Paper trading simulation** — Risk-free trading at live market prices
- **Leverage trading** — Simulate leveraged positions with liquidation price calculations
- **Smart asset search** — Debounced search across 1000+ cryptocurrencies and stock database
- **Real-time price quotes** — Current prices displayed during trading workflow

### 💎 Professional UI/UX
- **Glassmorphism design** — Modern frosted glass aesthetic with backdrop blur effects
- **Aurora animations** — Smooth, elegant entry animations and transitions
- **Dark/Light modes** — Theme persistence with CSS variables and semantic colors
- **Responsive layout** — Optimised for desktop, tablet, and mobile views
- **Interactive components** — Hover effects, loading states, success/error messaging

### 🔌 System Features
- **CORS-enabled REST API** — All endpoints properly configured for cross-origin requests
- **Error resilience** — Sequential API fallback (Finnhub → Alpha Vantage), graceful price fetching
- **Data persistence** — SQLite database with 8 optimised tables
- **Live API monitoring** — Dashboard showing API health status and rate limit usage

---

## 🛠️ Technology Stack

### Frontend Architecture
```
React 19.2.6 + React DOM
├── Framer Motion — Premium animations & transitions
├── Recharts 3.8.1 — Interactive data visualisations (pie, bar, line charts)
├── CSS Variables — Design tokens, semantic theming
└── Local Storage — Session persistence
```

### Backend Architecture
```
FastAPI + Uvicorn
├── SQLite3 — 8-table relational schema
├── APScheduler — Daily automated data pipeline
├── Pydantic — Request/response validation
└── CORS Middleware — Secure cross-origin requests
```

### Data Sources
| Source | Data | Cache | Key Required |
|--------|------|-------|--------------|
| [CoinGecko](https://www.coingecko.com/en/api) | Crypto prices, search | 24h | ❌ No |
| [Finnhub](https://finnhub.io/) | Stock prices, quotes | 24h | ✅ Yes |
| [Alpha Vantage](https://www.alphavantage.co/) | Stock data (backup) | 24h | ✅ Yes |
| [Frankfurter](https://www.frankfurter.app/) | Exchange rates | 24h | ❌ No |

---

## 📁 Project Architecture

```
crypto_data_pipeline/
├── 📂 frontend/                          # React Single Page Application
│   ├── public/                           # Static assets
│   ├── src/
│   │   ├── components/
│   │   │   ├── PortfolioValue.js        # Portfolio summary cards
│   │   │   ├── PortfolioDonutChart.js   # Animated allocation visualisation
│   │   │   ├── Analytics.js             # Gains/losses analysis dashboard
│   │   │   ├── Trading.js               # Buy/sell interface
│   │   │   ├── Positions.js             # Leverage positions tracker
│   │   │   ├── Prices.js                # Live price quotes
│   │   │   ├── Transactions.js          # Transaction history table
│   │   │   └── Status.js                # API health monitoring
│   │   ├── services/
│   │   │   └── api.js                   # REST client with resilience layer
│   │   ├── App.js                       # Main app routing & tabs
│   │   └── App.css                      # 2250+ lines of glassmorphism design
│   └── package.json
│
├── 📂 backend/                           # FastAPI Python Application
│   ├── api.py                            # REST endpoints (15+ routes)
│   ├── services.py                       # Trading service layer
│   ├── database.py                       # SQLite operations & schema
│   ├── fetch_crypto.py                   # CoinGecko integration with caching
│   ├── fetch_stocks.py                   # Finnhub/Alpha Vantage integration
│   ├── api_status.py                     # Rate limit tracking
│   ├── scheduler.py                      # Automated pipeline tasks
│   ├── crypto.db                         # SQLite database (auto-initialised)
│   ├── requirements.txt                  # Python dependencies
│   └── .env.example                      # Configuration template
│
├── README.md                             # This file
└── .gitignore
```

---

## 🚀 Getting Started

### Prerequisites
- **Python** 3.11+
- **Node.js** 18+
- **npm** 9+
- A free [Finnhub API key](https://finnhub.io/) (takes 30 seconds to get)

### Setup Steps

#### 1️⃣ Clone & Navigate
```bash
git clone https://github.com/EthanJones0306/crypto_data_pipeline.git
cd crypto_data_pipeline
```

#### 2️⃣ Backend Setup
```bash
cd backend
pip install -r requirements.txt
```

Create a `.env` file in the backend directory:
```env
FINNHUB_API_KEY=your_finnhub_key_here
ALPHA_VANTAGE_API_KEY=your_alpha_vantage_key_here   # optional
STOCK_PRICE_PROVIDER=finnhub                         # or alphavantage
```

**Get a Finnhub key:** Visit [finnhub.io](https://finnhub.io/register), sign up, and copy your API key. It's free and instant—no credit card required.

Start the API server:
```bash
python -m uvicorn backend.api:app --host 127.0.0.1 --port 8000 --reload
```

✅ Backend running at `http://localhost:8000`  
📖 API Docs at `http://localhost:8000/docs` (Swagger UI)

#### 3️⃣ Frontend Setup
```bash
cd frontend
npm install
npm start
```

✅ Frontend running at `http://localhost:3000`

---

## 📖 Usage Guide

### 🎯 Portfolio Dashboard
View your total portfolio value broken down by asset, with real-time prices. The interactive donut chart shows allocation percentages.

### 📊 Analytics
- **Portfolio Allocation** — Pie chart showing which assets represent what % of total value
- **Gains/Losses Breakdown** — Bar chart comparing unrealised P&L per asset
- **Holdings Table** — Detailed view with entry prices, current prices, quantity, and ROI %

### 🛒 Trading
1. Select asset type (Crypto or Stocks)
2. Search for an asset (e.g., "Bitcoin" or "AAPL")
3. Choose Buy or Sell
4. Enter quantity
5. Execute trade

Transactions are recorded instantly and reflected in portfolio value.

### ⚡ Leverage Trading (Advanced)
Switch to the **Leverage** or **Perps** tabs to:
- Simulate long/short positions with custom leverage (1–10x)
- Calculate liquidation prices automatically
- Track active positions with P&L percentages
- Close positions at current market prices

### 🔍 Live Prices
View real-time quotes for crypto and stocks in the **Prices** tab.

### 📋 Transaction History
Complete audit log of all trades with timestamps, execution prices, and total value.

---

## 🏗️ Architecture & Design Decisions

### Frontend (React)
- **Component-based:** Each feature (Portfolio, Analytics, Trading) is a reusable, isolated React component
- **Framer Motion:** Smooth entry/exit animations and interactive transitions for professional feel
- **Recharts:** Declarative, composable charting library for complex data visualisations
- **CSS Variables:** Design tokens (colors, spacing, fonts) defined once and reused across the app
- **Local Storage:** User preferences (theme, currency) persist across sessions
- **API Resilience:** `requestJson()` tries multiple endpoints sequentially to handle server downtime

### Backend (FastAPI)
- **Service Layer:** `TradingService` class encapsulates all buy/sell business logic (DRY principle)
- **Type Hints:** Pydantic models validate all requests and responses
- **Structured Logging:** All operations logged with timestamps and context for debugging
- **Database Abstraction:** `database.py` handles all SQLite operations, cleanly separating data layer
- **Error Handling:** Try/catch blocks prevent crashes from missing prices or API failures

### Data Caching Strategy
- **Problem:** External APIs have rate limits; CoinGecko/Finnhub allow ~10–50 calls/minute
- **Solution:** Cache all prices for 24 hours in JSON files, check cache before calling APIs
- **Fallback:** If API fails during trading, use cached price from last successful fetch
- **Last Resort:** If no cache, use hardcoded fallback prices (ensures app never crashes)

### Database Schema (SQLite)
8 tables for clean data organisation:
- `transactions` — Buy/sell audit log
- `crypto_prices` — Historical crypto prices
- `stock_prices` — Historical stock prices
- `exchange_rates` — Currency conversion rates
- `positions` — Current holdings (qty, avg price)
- `paper_accounts` — Paper trading account state
- `leverage_positions` — Active leveraged positions
- `api_status` — Rate limit tracking

---

## 📡 API Reference

### Authentication
No authentication required for local development. All endpoints are public within `127.0.0.1:8000`.

### Core Endpoints

**Portfolio**
```http
GET /portfolio/value
```
Returns current holdings and total portfolio value with live prices.

**Analytics**
```http
GET /analytics/gains-losses
```
Returns unrealised P&L, ROI %, and per-asset performance breakdown.

**Trading**
```http
POST /buy/crypto
POST /sell/crypto
POST /buy/stock
POST /sell/stock
```
Execute trades. Request body: `{ "asset": "bitcoin", "quantity": 0.1 }`

**Search**
```http
GET /search/crypto?q=bit
GET /search/stocks?q=aapl
```
Search for assets across 1000+ cryptocurrencies and stock database.

**Data**
```http
GET /prices/latest          # Crypto and stock prices
GET /transactions           # Transaction history
GET /exchange-rates         # Currency rates
GET /health                 # API health check
```

---

## 🎓 Key Learning Outcomes

This project demonstrates:

✅ **Frontend Development**
- React hooks (useState, useEffect, useContext)
- Component composition and reusability
- CSS-in-JS patterns and design systems
- Animation libraries for UX enhancement
- HTTP client design with error handling

✅ **Backend Development**
- FastAPI framework and Pydantic validation
- SQLite database design and operations
- RESTful API design principles
- Third-party API integration
- Error handling and logging

✅ **Full-Stack Integration**
- Client-server communication
- CORS configuration and security
- Asynchronous request handling
- Caching strategies for performance
- Deployment-ready code structure

✅ **Software Engineering**
- Clean code principles (DRY, SOLID)
- Type safety with Python type hints
- Separation of concerns (models, services, data layers)
- Documentation and code comments
- Git workflow and version control

---
