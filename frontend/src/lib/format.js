export const CURRENCIES = {
  USD: { symbol: '$', locale: 'en-US' },
  EUR: { symbol: '€', locale: 'de-DE' },
  GBP: { symbol: '£', locale: 'en-GB' },
  ZAR: { symbol: 'R', locale: 'en-ZA' },
};

const fractionDigits = (abs) => {
  if (abs === 0) return 2;
  if (abs < 0.01) return 6;
  if (abs < 1) return 4;
  return 2;
};

export const formatMoney = (value, currency = 'USD', { compact = false, sign = false, digits } = {}) => {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  const abs = Math.abs(value);
  const d = digits ?? fractionDigits(abs);
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    currencyDisplay: 'narrowSymbol',
    notation: compact && abs >= 100000 ? 'compact' : 'standard',
    minimumFractionDigits: compact && abs >= 100000 ? 0 : d,
    maximumFractionDigits: compact && abs >= 100000 ? 2 : d,
  }).format(abs);
  const prefix = value < 0 ? '−' : sign && value > 0 ? '+' : '';
  return `${prefix}${formatted}`;
};

export const formatQty = (value, max = 8) => {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  const abs = Math.abs(value);
  const digits = abs >= 1000 ? 2 : abs >= 1 ? 4 : max;
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: digits }).format(value);
};

export const formatPct = (value, { sign = true, digits = 2 } = {}) => {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  const prefix = value < 0 ? '−' : sign && value > 0 ? '+' : '';
  return `${prefix}${Math.abs(value).toFixed(digits)}%`;
};

export const relativeTime = (date) => {
  if (!date) return 'never';
  const seconds = Math.round((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 5) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(date).toLocaleDateString();
};

export const toneClass = (value) => (value > 0.004 ? 'text-gain' : value < -0.004 ? 'text-loss' : '');

// Backend timestamps are naive local "YYYY-MM-DD HH:MM:SS" strings.
export const parseTimestamp = (ts) => (ts ? new Date(String(ts).replace(' ', 'T')) : null);
