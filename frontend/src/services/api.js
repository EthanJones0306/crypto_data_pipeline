const devBase = () =>
  typeof window === 'undefined' ? 'http://localhost:8000' : `${window.location.protocol}//${window.location.hostname}:8000`;

// In production nginx proxies /api to the backend, so the app works from any device that can reach the frontend.
const API_BASES = [
  process.env.REACT_APP_API_BASE_URL,
  process.env.NODE_ENV === 'production' ? '/api' : devBase(),
  'http://localhost:8000',
].filter((base, i, all) => base && all.indexOf(base) === i);

export class ApiError extends Error {}

const requestJson = async (path, options = {}) => {
  let lastError = null;

  for (const base of API_BASES) {
    let data;
    try {
      const response = await fetch(`${base}${path}`, options);
      if (!response.ok) {
        lastError = new Error(`Request failed with status ${response.status}`);
        continue;
      }
      data = await response.json();
    } catch (error) {
      lastError = error;
      continue;
    }
    if (data && data.status === 'error') {
      throw new ApiError(data.message || 'Something went wrong');
    }
    return data;
  }

  throw new Error(
    lastError?.message === 'Failed to fetch' || lastError instanceof SyntaxError
      ? "Can't reach the server. Is the backend running?"
      : lastError?.message || `Failed to fetch ${path}`
  );
};

const post = (path, body) =>
  requestJson(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

const tradeBody = (asset, value, currency) =>
  currency ? { asset, amount: value, currency } : { asset, quantity: value };

export const fetchHealth = () => requestJson('/health');
export const fetchPortfolioValue = () => requestJson('/portfolio/value');
export const fetchPrices = () => requestJson('/prices/latest');
export const fetchTransactions = (limit = 500) => requestJson(`/transactions?limit=${limit}`);
export const fetchExchangeRates = () => requestJson('/exchange-rates');
export const fetchGainsLosses = () => requestJson('/analytics/gains-losses');
export const fetchApiStatus = () => requestJson('/api/status');

export const fetchQuote = (asset, assetType = 'crypto') =>
  requestJson(`/quote?asset=${encodeURIComponent(asset)}&asset_type=${assetType}`);

export const buyCrypto = (asset, value, currency = null) => post('/buy/crypto', tradeBody(asset, value, currency));
export const sellCrypto = (asset, value, currency = null) => post('/sell/crypto', tradeBody(asset, value, currency));
export const buyStock = (symbol, value, currency = null) => post('/buy/stock', tradeBody(symbol, value, currency));
export const sellStock = (symbol, value, currency = null) => post('/sell/stock', tradeBody(symbol, value, currency));

export const resetDatabase = () => post('/admin/reset-database');

export const searchCrypto = (query) => requestJson(`/search/crypto?q=${encodeURIComponent(query)}`);
export const searchStocks = (query) => requestJson(`/search/stocks?q=${encodeURIComponent(query)}`);

export const simulateOrder = ({ asset, quantity, side, leverage = 2, asset_type = 'crypto' }) =>
  post('/simulate/order', { asset, quantity, side, leverage, asset_type });

export const getOpenPositions = () => requestJson('/positions/leverage');
export const closePosition = (positionId) => post(`/positions/leverage/${positionId}/close`);
