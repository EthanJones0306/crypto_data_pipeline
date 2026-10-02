import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { LineChart, Search } from 'lucide-react';
import { fetchPortfolioValue, fetchPrices } from '../services/api';
import useApi from '../hooks/useApi';
import { getAssetMeta } from '../lib/assets';
import { AssetAvatar, Card, EmptyState, ErrorState, PageHeader, Segmented, Skeleton, UpdatedAgo, useApp } from './ui';

const loadMarkets = async () => {
  const [prices, portfolio] = await Promise.all([fetchPrices(), fetchPortfolioValue().catch(() => null)]);
  return { prices, holdings: portfolio?.holdings || [] };
};

function Prices() {
  const { money, navigate } = useApp();
  const { data, error, loading, refreshing, updatedAt, reload } = useApi(loadMarkets, { interval: 60000 });
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');

  const markets = useMemo(() => {
    if (!data) return [];
    const owned = new Set(data.holdings.map((h) => h.asset));
    const rows = [
      ...Object.entries(data.prices.crypto_prices || {}).map(([key, price]) => ({ key, price, kind: 'crypto' })),
      ...Object.entries(data.prices.stock_prices || {}).map(([key, price]) => ({ key, price, kind: 'stocks' })),
    ].map((m) => ({ ...m, ...getAssetMeta(m.key), owned: owned.has(m.key) }));
    const q = query.trim().toLowerCase();
    return rows.filter((m) => (filter === 'all' || m.kind === filter) && (!q || m.name.toLowerCase().includes(q) || m.symbol.toLowerCase().includes(q)));
  }, [data, filter, query]);

  return (
    <div className="page">
      <PageHeader title="Markets" subtitle="Live prices for the assets you track." actions={<UpdatedAgo at={updatedAt} refreshing={refreshing} onRefresh={reload} />} />

      <div className="toolbar">
        <Segmented
          label="Market filter"
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: 'All' },
            { value: 'crypto', label: 'Crypto' },
            { value: 'stocks', label: 'Stocks' },
          ]}
        />
        <label className="toolbar-search">
          <Search size={15} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filter markets" aria-label="Filter markets" />
        </label>
      </div>

      {error && !data && <ErrorState message={error} onRetry={reload} />}

      {loading ? (
        <div className="market-grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card card-padded market-card">
              <Skeleton width={40} height={40} radius={999} />
              <Skeleton width="60%" />
              <Skeleton width="40%" height={22} />
            </div>
          ))}
        </div>
      ) : markets.length === 0 ? (
        <Card>
          <EmptyState
            icon={LineChart}
            title="No markets match"
            body="Looking for something else? Search any coin or stock from the trade screen."
            action={
              <button type="button" className="btn btn-primary" onClick={() => navigate('trade')}>
                Search all assets
              </button>
            }
          />
        </Card>
      ) : (
        <div className="market-grid">
          {markets.map((m, i) => (
            <motion.button
              key={m.key}
              type="button"
              className="card card-padded market-card interactive"
              onClick={() => navigate('trade', { asset: m.key, side: 'buy' })}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              whileHover={{ y: -2 }}
            >
              <div className="market-top">
                <AssetAvatar asset={m.key} size={40} />
                {m.owned && <span className="pill pill-accent">Owned</span>}
              </div>
              <div className="market-name">
                <strong>{m.name}</strong>
                <span>{m.symbol}</span>
              </div>
              <div className="market-price num">{money(m.price, { public: true })}</div>
              <span className="market-cta">Trade →</span>
            </motion.button>
          ))}
        </div>
      )}
    </div>
  );
}

export default Prices;
