const API_BASE = 'http://localhost:8000';

const paperHeaders = () => {
  try {
    const isPaper = window.localStorage.getItem('paper_mode') === 'true';
    return isPaper ? { 'X-PAPER-TRADING': '1' } : {};
  } catch (e) {
    return {};
  }
};

export const fetchHealth = async () => {
  const response = await fetch(`${API_BASE}/health`);
  if (!response.ok) throw new Error('Failed to fetch health');
  return response.json();
};

export const fetchPortfolioValue = async () => {
  const response = await fetch(`${API_BASE}/portfolio/value`);
  if (!response.ok) throw new Error('Failed to fetch portfolio');
  return response.json();
};

export const fetchPrices = async () => {
  const response = await fetch(`${API_BASE}/prices/latest`);
  if (!response.ok) throw new Error('Failed to fetch prices');
  return response.json();
};

export const fetchTransactions = async () => {
  const response = await fetch(`${API_BASE}/transactions`);
  if (!response.ok) throw new Error('Failed to fetch transactions');
  return response.json();
};

export const fetchExchangeRates = async () => {
  const response = await fetch(`${API_BASE}/exchange-rates`);
  if (!response.ok) throw new Error('Failed to fetch exchange rates');
  return response.json();
};

export const fetchGainsLosses = async () => {
  const response = await fetch(`${API_BASE}/analytics/gains-losses`);
  if (!response.ok) throw new Error('Failed to fetch gains/losses');
  return response.json();
};

export const buyCrypto = async (asset, quantity) => {
  const response = await fetch(`${API_BASE}/buy/crypto`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...paperHeaders() },
    body: JSON.stringify({ asset, quantity })
  });
  if (!response.ok) throw new Error('Failed to buy');
  return response.json();
};

export const sellCrypto = async (asset, quantity) => {
  const response = await fetch(`${API_BASE}/sell/crypto`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...paperHeaders() },
    body: JSON.stringify({ asset, quantity })
  });
  if (!response.ok) throw new Error('Failed to sell');
  return response.json();
};

export const buyStock = async (symbol, quantity) => {
  const response = await fetch(`${API_BASE}/buy/stock`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...paperHeaders() },
    body: JSON.stringify({ asset: symbol, quantity })
  });
  if (!response.ok) throw new Error('Failed to buy stock');
  return response.json();
};

export const sellStock = async (symbol, quantity) => {
  const response = await fetch(`${API_BASE}/sell/stock`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...paperHeaders() },
    body: JSON.stringify({ asset: symbol, quantity })
  });
  if (!response.ok) throw new Error('Failed to sell stock');
  return response.json();
};

export const resetDatabase = async () => {
  const response = await fetch(`${API_BASE}/admin/reset-database`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  if (!response.ok) throw new Error('Failed to reset database');
  return response.json();
};

export const searchCrypto = async (query) => {
  const response = await fetch(`${API_BASE}/search/crypto?q=${encodeURIComponent(query)}`);
  if (!response.ok) throw new Error('Failed to search crypto');
  return response.json();
};

export const searchStocks = async (query) => {
  const response = await fetch(`${API_BASE}/search/stocks?q=${encodeURIComponent(query)}`);
  if (!response.ok) throw new Error('Failed to search stocks');
  return response.json();
};

export const simulateOrder = async ({ asset, quantity, side, leverage = 2, asset_type = 'crypto' }) => {
  const response = await fetch(`${API_BASE}/simulate/order`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...paperHeaders() },
    body: JSON.stringify({ asset, quantity, side, leverage, asset_type })
  });
  if (!response.ok) throw new Error('Failed to simulate order');
  return response.json();
};

export const getLiquidationPrice = async ({ entry_price, side = 'long', leverage = 2, maintenance_rate = undefined }) => {
  const params = new URLSearchParams();
  params.set('entry_price', entry_price);
  params.set('side', side);
  params.set('leverage', String(leverage));
  if (maintenance_rate) params.set('maintenance_rate', String(maintenance_rate));
  const response = await fetch(`${API_BASE}/simulate/liquidation?${params.toString()}`);
  if (!response.ok) throw new Error('Failed to compute liquidation price');
  return response.json();
};