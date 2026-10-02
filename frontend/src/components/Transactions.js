import React, { useMemo, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, Download, Receipt, Search } from 'lucide-react';
import { fetchTransactions } from '../services/api';
import useApi from '../hooks/useApi';
import { getAssetMeta } from '../lib/assets';
import { formatQty, parseTimestamp } from '../lib/format';
import { AssetAvatar, Card, EmptyState, ErrorState, PageHeader, Segmented, SkeletonRows, useApp } from './ui';

const dayLabel = (date) => {
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: date.getFullYear() === today.getFullYear() ? undefined : 'numeric' });
};

const exportCsv = (rows) => {
  const header = 'timestamp,asset,type,quantity,price_usd,total_usd';
  const lines = rows.map((t) => [t.timestamp, t.asset, t.type, t.quantity, t.price, (t.quantity * t.price).toFixed(2)].join(','));
  const blob = new Blob([[header, ...lines].join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `transactions-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

function Transactions() {
  const { money } = useApp();
  const { data, error, loading, reload } = useApi(() => fetchTransactions(500));
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');

  const all = useMemo(() => data?.transactions || [], [data]);

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = all.filter((t) => {
      if (filter !== 'all' && t.type !== filter) return false;
      if (!q) return true;
      const meta = getAssetMeta(t.asset);
      return meta.name.toLowerCase().includes(q) || meta.symbol.toLowerCase().includes(q);
    });
    const map = new Map();
    filtered.forEach((t) => {
      const date = parseTimestamp(t.timestamp) || new Date(0);
      const label = dayLabel(date);
      if (!map.has(label)) map.set(label, []);
      map.get(label).push({ ...t, date });
    });
    return [...map.entries()];
  }, [all, filter, query]);

  const totals = useMemo(
    () =>
      all.reduce(
        (acc, t) => {
          acc[t.type === 'BUY' ? 'bought' : 'sold'] += t.quantity * t.price;
          return acc;
        },
        { bought: 0, sold: 0 }
      ),
    [all]
  );

  return (
    <div className="page">
      <PageHeader
        title="Activity"
        subtitle={all.length ? `${all.length} orders · ${money(totals.bought)} bought · ${money(totals.sold)} sold` : 'Every order you place, in one place.'}
        actions={
          all.length > 0 && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => exportCsv(all)}>
              <Download size={15} /> Export CSV
            </button>
          )
        }
      />

      <div className="toolbar">
        <Segmented
          label="Transaction filter"
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: 'All' },
            { value: 'BUY', label: 'Buys' },
            { value: 'SELL', label: 'Sells' },
          ]}
        />
        <label className="toolbar-search">
          <Search size={15} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filter by asset" aria-label="Filter by asset" />
        </label>
      </div>

      {error && !data && <ErrorState message={error} onRetry={reload} />}

      {loading ? (
        <Card>
          <SkeletonRows rows={6} />
        </Card>
      ) : groups.length === 0 ? (
        <Card>
          <EmptyState icon={Receipt} title={all.length ? 'Nothing matches that filter' : 'No activity yet'} body={all.length ? 'Try a different filter.' : 'Your buys and sells will show up here.'} />
        </Card>
      ) : (
        groups.map(([label, items]) => (
          <section key={label} className="activity-group">
            <h2 className="activity-day">{label}</h2>
            <Card padded={false}>
              <ul className="activity-list">
                {items.map((t, i) => {
                  const meta = getAssetMeta(t.asset);
                  const buy = t.type === 'BUY';
                  return (
                    <li key={`${t.timestamp}-${i}`} className="activity-row">
                      <span className="activity-avatar">
                        <AssetAvatar asset={t.asset} size={38} />
                        <span className={`activity-badge ${buy ? 'tone-gain' : 'tone-loss'}`}>{buy ? <ArrowDownLeft size={11} /> : <ArrowUpRight size={11} />}</span>
                      </span>
                      <div className="activity-main">
                        <strong>
                          {buy ? 'Bought' : 'Sold'} {meta.name}
                        </strong>
                        <span className="muted small">
                          {t.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {money(t.price, { public: true })} each
                        </span>
                      </div>
                      <div className="activity-amount">
                        <span className={`num strong ${buy ? '' : 'text-gain'}`}>
                          {buy ? '−' : '+'}
                          {money(t.quantity * t.price)}
                        </span>
                        <span className="num muted small">
                          {buy ? '+' : '−'}
                          {formatQty(t.quantity)} {meta.symbol}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </Card>
          </section>
        ))
      )}
    </div>
  );
}

export default Transactions;
