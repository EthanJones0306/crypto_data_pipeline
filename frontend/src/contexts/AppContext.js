import React, { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { fetchExchangeRates } from '../services/api';
import { formatMoney } from '../lib/format';

export const AppContext = createContext({ refreshKey: 0 });

const readPref = (key, fallback) => {
  try {
    const value = window.localStorage.getItem(key);
    return value === null ? fallback : JSON.parse(value);
  } catch {
    return fallback;
  }
};

const writePref = (key, value) => {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {}
};

const PAGES = ['dashboard', 'trade', 'leverage', 'positions', 'markets', 'activity', 'analytics', 'status', 'settings'];

const parseHash = () => {
  const [page, query = ''] = window.location.hash.replace(/^#\/?/, '').split('?');
  return {
    page: PAGES.includes(page) ? page : 'dashboard',
    params: Object.fromEntries(new URLSearchParams(query)),
  };
};

export function AppProvider({ children }) {
  const [route, setRoute] = useState(parseHash);
  const [currency, setCurrencyState] = useState(() => readPref('currency', 'USD'));
  const [privacy, setPrivacy] = useState(() => readPref('privacy', false));
  const [rates, setRates] = useState({ USD: 1 });
  const [refreshKey, setRefreshKey] = useState(0);
  const [toasts, setToasts] = useState([]);
  const [dialog, setDialog] = useState(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const toastId = useRef(0);

  useEffect(() => {
    const onHash = () => setRoute(parseHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    fetchExchangeRates()
      .then((resp) => resp.rates && setRates(resp.rates))
      .catch(() => {});
  }, [refreshKey]);

  const navigate = useCallback((page, params = {}) => {
    const query = new URLSearchParams(params).toString();
    window.location.hash = `/${page}${query ? `?${query}` : ''}`;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const setCurrency = useCallback((c) => {
    setCurrencyState(c);
    writePref('currency', c);
  }, []);

  const togglePrivacy = useCallback(() => {
    setPrivacy((p) => {
      writePref('privacy', !p);
      return !p;
    });
  }, []);

  const refreshAll = useCallback(() => setRefreshKey((k) => k + 1), []);

  const dismissToast = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const toast = useCallback(
    (message, { type = 'success', title, duration = 4200, celebrate = false } = {}) => {
      toastId.current += 1;
      const id = toastId.current;
      setToasts((t) => [...t.slice(-3), { id, message, type, title, celebrate }]);
      setTimeout(() => dismissToast(id), duration);
    },
    [dismissToast]
  );

  const confirm = useCallback(
    (options) =>
      new Promise((resolve) => {
        setDialog({
          ...options,
          resolve: (value) => {
            setDialog(null);
            resolve(value);
          },
        });
      }),
    []
  );

  const rate = rates[currency] || 1;

  const money = useCallback(
    (usd, opts = {}) => {
      if (privacy && !opts.public) return `${formatMoney(0, currency).charAt(0)}••••`;
      return formatMoney(usd === null || usd === undefined ? usd : usd * rate, currency, opts);
    },
    [currency, rate, privacy]
  );

  const value = useMemo(
    () => ({
      page: route.page,
      params: route.params,
      navigate,
      currency,
      setCurrency,
      rate,
      rates,
      money,
      privacy,
      togglePrivacy,
      refreshKey,
      refreshAll,
      toasts,
      toast,
      dismissToast,
      dialog,
      confirm,
      paletteOpen,
      setPaletteOpen,
    }),
    [route, navigate, currency, setCurrency, rate, rates, money, privacy, togglePrivacy, refreshKey, refreshAll, toasts, toast, dismissToast, dialog, confirm, paletteOpen]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
