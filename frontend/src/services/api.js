const API_BASES = [
  process.env.REACT_APP_API_BASE_URL,
  'http://localhost:8000',
  'http://localhost:8001'
].filter(Boolean);

const requestJson = async (path, options = {}) => {
  let lastError = null;

  for (const base of API_BASES) {
    try {
      const response = await fetch(`${base}${path}`, options);
      if (!response.ok) {
        lastError = new Error(`Request failed with status ${response.status}`);
        continue;
      }

      return response.json();
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error(`Failed to fetch ${path}`);
};

const paperHeaders = () => {
  try {
    const isPaper = window.localStorage.getItem('paper_mode') === 'true';
    return isPaper ? { 'X-PAPER-TRADING': '1' } : {};
  } catch (e) {
    return {};
  }
};

export const fetchHealth = async () => {
  return requestJson('/health');
};

export const fetchPortfolioValue = async () => {
  return requestJson('/portfolio/value');
};

export const fetchPrices = async () => {
  return requestJson('/prices/latest');
};

export const fetchTransactions = async () => {
  return requestJson('/transactions');
};

export const fetchExchangeRates = async () => {
  return requestJson('/exchange-rates');
};

export const fetchGainsLosses = async () => {
  return requestJson('/analytics/gains-losses');
};

export const buyCrypto = async (asset, quantity, currency = null) => {
  const body = currency 
    ? { asset, amount: quantity, currency }
    : { asset, quantity };
  
  return requestJson('/buy/crypto', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...paperHeaders() },
    body: JSON.stringify(body)
  });
};

export const sellCrypto = async (asset, quantity) => {
  return requestJson('/sell/crypto', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...paperHeaders() },
    body: JSON.stringify({ asset, quantity })
  });
};

export const buyStock = async (symbol, quantity) => {
  return requestJson('/buy/stock', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...paperHeaders() },
    body: JSON.stringify({ asset: symbol, quantity })
  });
};

export const sellStock = async (symbol, quantity) => {
  return requestJson('/sell/stock', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...paperHeaders() },
    body: JSON.stringify({ asset: symbol, quantity })
  });
};

export const resetDatabase = async () => {
  return requestJson('/admin/reset-database', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
};

export const searchCrypto = async (query) => {
  return requestJson(`/search/crypto?q=${encodeURIComponent(query)}`);
};

export const searchStocks = async (query) => {
  return requestJson(`/search/stocks?q=${encodeURIComponent(query)}`);
};

export const simulateOrder = async ({ asset, quantity, side, leverage = 2, asset_type = 'crypto' }) => {
  return requestJson('/simulate/order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...paperHeaders() },
    body: JSON.stringify({ asset, quantity, side, leverage, asset_type })
  });
};

export const getLiquidationPrice = async ({ entry_price, side = 'long', leverage = 2, maintenance_rate = undefined }) => {
  const params = new URLSearchParams();
  params.set('entry_price', entry_price);
  params.set('side', side);
  params.set('leverage', String(leverage));
  if (maintenance_rate) params.set('maintenance_rate', String(maintenance_rate));
  return requestJson(`/simulate/liquidation?${params.toString()}`);
};

export const getOpenPositions = async () => requestJson('/positions/leverage');

export const closePosition = async (positionId) => requestJson(`/positions/leverage/${positionId}/close`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' }
});

export const fetchApiStatus = async () => requestJson('/api/status');