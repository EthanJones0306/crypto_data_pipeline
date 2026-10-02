import { searchCrypto } from '../services/api';

const META_KEY = 'asset_meta_v1';

const KNOWN = {
  bitcoin: { name: 'Bitcoin', symbol: 'BTC' },
  ethereum: { name: 'Ethereum', symbol: 'ETH' },
  solana: { name: 'Solana', symbol: 'SOL' },
  cardano: { name: 'Cardano', symbol: 'ADA' },
  ripple: { name: 'XRP', symbol: 'XRP' },
  dogecoin: { name: 'Dogecoin', symbol: 'DOGE' },
  'binancecoin': { name: 'BNB', symbol: 'BNB' },
  AAPL: { name: 'Apple', symbol: 'AAPL' },
  GOOG: { name: 'Alphabet', symbol: 'GOOG' },
  GOOGL: { name: 'Alphabet', symbol: 'GOOGL' },
  MSFT: { name: 'Microsoft', symbol: 'MSFT' },
  NVDA: { name: 'NVIDIA', symbol: 'NVDA' },
  TSLA: { name: 'Tesla', symbol: 'TSLA' },
  AMZN: { name: 'Amazon', symbol: 'AMZN' },
  META: { name: 'Meta', symbol: 'META' },
};

const readStore = () => {
  try {
    return JSON.parse(window.localStorage.getItem(META_KEY)) || {};
  } catch {
    return {};
  }
};

let store = readStore();
const listeners = new Set();
const inflight = new Map();

const persist = () => {
  try {
    window.localStorage.setItem(META_KEY, JSON.stringify(store));
  } catch {}
  listeners.forEach((fn) => fn());
};

export const subscribeAssetMeta = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

// Mirrors the backend's heuristic: short all-caps keys are stock tickers, everything else is a CoinGecko id.
export const isStockKey = (asset) => !!asset && asset.length <= 5 && asset === asset.toUpperCase() && /[A-Z]/.test(asset);

const titleCase = (id) => id.split(/[-_]/).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

export const rememberAsset = (id, meta) => {
  if (!id) return;
  store = { ...store, [id]: { ...store[id], ...meta } };
  persist();
};

export const getAssetMeta = (asset) => {
  if (!asset) return { name: '', symbol: '', image: null, kind: 'crypto' };
  const kind = isStockKey(asset) ? 'stock' : 'crypto';
  const saved = store[asset] || {};
  const known = KNOWN[asset] || KNOWN[asset.toLowerCase()] || {};
  return {
    name: saved.name || known.name || (kind === 'stock' ? asset : titleCase(asset)),
    symbol: saved.symbol || known.symbol || (kind === 'stock' ? asset : asset.slice(0, 4).toUpperCase()),
    image: saved.image || null,
    kind,
  };
};

export const getDisplayName = (asset) => getAssetMeta(asset).name;

// One-time lookup of a coin's logo/symbol; results are cached forever in localStorage.
export const hydrateAssetMeta = (asset) => {
  if (!asset || isStockKey(asset) || store[asset]?.checked || inflight.has(asset)) return;
  const promise = searchCrypto(asset)
    .then((resp) => {
      const match = resp.results?.find((r) => r.id === asset);
      rememberAsset(asset, match ? { name: match.name, symbol: match.symbol, image: match.image, checked: true } : { checked: true });
    })
    .catch(() => {})
    .finally(() => inflight.delete(asset));
  inflight.set(asset, promise);
};

export const assetHue = (asset = '') => {
  let h = 0;
  for (let i = 0; i < asset.length; i += 1) h = (h * 31 + asset.charCodeAt(i)) >>> 0;
  return h % 8;
};
