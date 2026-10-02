import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppContext } from '../contexts/AppContext';

export default function useApi(fetcher, { interval = 0, deps = [] } = {}) {
  const { refreshKey } = useContext(AppContext);
  const [state, setState] = useState({ data: null, error: null, loading: true, updatedAt: null });
  const [refreshing, setRefreshing] = useState(false);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const mounted = useRef(true);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const data = await fetcherRef.current();
      if (mounted.current) setState({ data, error: null, loading: false, updatedAt: new Date() });
    } catch (error) {
      if (mounted.current) setState((s) => ({ ...s, error: error.message, loading: false }));
    } finally {
      if (mounted.current) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load, refreshKey, ...deps]);

  useEffect(() => {
    if (!interval) return undefined;
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') load();
    }, interval);
    return () => clearInterval(id);
  }, [interval, load]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') load();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [load]);

  return { ...state, refreshing, reload: load };
}
