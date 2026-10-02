import React, { useMemo, useState } from 'react';
import { Bar, BarChart, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { motion } from 'framer-motion';
import { BarChart3, ChevronDown, ChevronUp } from 'lucide-react';
import { fetchGainsLosses } from '../services/api';
import useApi from '../hooks/useApi';
import { getAssetMeta } from '../lib/assets';
import { formatPct, formatQty, toneClass } from '../lib/format';
import PortfolioDonutChart from './PortfolioDonutChart';
import { AssetLabel, Card, Delta, EmptyState, ErrorState, PageHeader, Skeleton, UpdatedAgo, useApp } from './ui';

const COLUMNS = [
  { key: 'asset', label: 'Asset', align: 'left' },
  { key: 'quantity', label: 'Quantity' },
  { key: 'avg_entry_price', label: 'Avg entry' },
  { key: 'current_price', label: 'Price' },
  { key: 'current_value', label: 'Value' },
  { key: 'unrealized_gain', label: 'P&L' },
  { key: 'unrealized_gain_percent', label: 'Return' },
];

function PnlTooltip({ active, payload, money }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="chart-tooltip">
      <strong>{d.name}</strong>
      <span className={`num ${toneClass(d.pnl)}`}>
        {money(d.pnl, { sign: true })} ({formatPct(d.pct)})
      </span>
    </div>
  );
}

function Analytics() {
  const { money, navigate } = useApp();
  const { data, error, loading, refreshing, updatedAt, reload } = useApi(fetchGainsLosses, { interval: 120000 });
  const [sort, setSort] = useState({ key: 'current_value', dir: 'desc' });

  const holdings = useMemo(() => data?.holdings || [], [data]);

  const chartData = useMemo(
    () =>
      [...holdings]
        .sort((a, b) => b.unrealized_gain - a.unrealized_gain)
        .map((h) => ({ name: getAssetMeta(h.asset).symbol, full: getAssetMeta(h.asset).name, pnl: h.unrealized_gain, pct: h.unrealized_gain_percent })),
    [holdings]
  );

  const sorted = useMemo(() => {
    const dir = sort.dir === 'asc' ? 1 : -1;
    return [...holdings].sort((a, b) => {
      const av = a[sort.key];
      const bv = b[sort.key];
      return (typeof av === 'string' ? av.localeCompare(bv) : av - bv) * dir;
    });
  }, [holdings, sort]);

  const toggleSort = (key) => setSort((s) => ({ key, dir: s.key === key && s.dir === 'desc' ? 'asc' : 'desc' }));

  if (loading) {
    return (
      <div className="page">
        <PageHeader title="Analytics" />
        <div className="kpi-grid">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="kpi card">
              <Skeleton width="50%" height={11} />
              <Skeleton width="70%" height={26} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="page">
        <PageHeader title="Analytics" />
        <ErrorState message={error} onRetry={reload} />
      </div>
    );
  }

  const s = data.summary;

  if (holdings.length === 0) {
    return (
      <div className="page">
        <PageHeader title="Analytics" />
        <Card>
          <EmptyState
            icon={BarChart3}
            title="Nothing to analyse yet"
            body="Once you hold some assets you'll see returns, allocation and P&L by asset here."
            action={
              <button type="button" className="btn btn-primary" onClick={() => navigate('trade', { side: 'buy' })}>
                Start trading
              </button>
            }
          />
        </Card>
      </div>
    );
  }

  const kpis = [
    { label: 'Current value', value: money(s.current_portfolio_value) },
    { label: 'Total invested', value: money(s.total_invested) },
    { label: 'Unrealised P&L', value: money(s.total_unrealized_gains, { sign: true }), tone: s.total_unrealized_gains },
    { label: 'Realised P&L', value: money(s.total_realized_gains, { sign: true }), tone: s.total_realized_gains },
  ];

  const chartHeight = Math.max(160, chartData.length * 44);
  const pnls = chartData.map((d) => d.pnl);
  const lo = Math.min(0, ...pnls);
  const hi = Math.max(0, ...pnls);
  const pnlDomain = lo === hi ? [-1, 1] : [lo, hi];

  return (
    <div className="page">
      <PageHeader title="Analytics" subtitle="How your portfolio is performing." actions={<UpdatedAgo at={updatedAt} refreshing={refreshing} onRefresh={reload} />} />

      <motion.section className="card card-padded roi-banner" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <div>
          <span className="kpi-label">Total return</span>
          <div className={`roi-value num ${toneClass(s.total_gains_losses)}`}>{money(s.total_gains_losses, { sign: true })}</div>
        </div>
        <Delta pct={s.roi_percent} size="lg" />
      </motion.section>

      <div className="kpi-grid">
        {kpis.map((k) => (
          <div key={k.label} className="kpi card">
            <span className="kpi-label">{k.label}</span>
            <span className={`kpi-value num ${k.tone === undefined ? '' : toneClass(k.tone)}`}>{k.value}</span>
          </div>
        ))}
      </div>

      <div className="grid-dashboard">
        <Card title="Unrealised P&L by asset">
          <div style={{ height: chartHeight }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 4 }} barCategoryGap={10}>
                <XAxis type="number" hide domain={pnlDomain} />
                <YAxis type="category" dataKey="name" width={56} tickLine={false} axisLine={false} tick={{ fill: 'var(--text-3)', fontSize: 12 }} />
                <ReferenceLine x={0} stroke="var(--border-strong)" />
                <Tooltip cursor={{ fill: 'var(--hover)' }} content={<PnlTooltip money={money} />} />
                <Bar dataKey="pnl" radius={4} maxBarSize={22} isAnimationActive animationDuration={600}>
                  {chartData.map((d) => (
                    <Cell key={d.name} fill={d.pnl >= 0 ? 'var(--gain)' : 'var(--loss)'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Allocation">
          <PortfolioDonutChart holdings={holdings.map((h) => ({ asset: h.asset, total_value: h.current_value }))} />
        </Card>
      </div>

      <Card title="Holdings detail" padded={false}>
        <div className="table-scroll">
          <table className="table">
            <thead>
              <tr>
                {COLUMNS.map((c) => (
                  <th key={c.key} className={c.align === 'left' ? 'left' : ''} aria-sort={sort.key === c.key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
                    <button type="button" onClick={() => toggleSort(c.key)}>
                      {c.label}
                      {sort.key === c.key && (sort.dir === 'asc' ? <ChevronUp size={13} /> : <ChevronDown size={13} />)}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((h) => (
                <tr key={h.asset} onClick={() => navigate('trade', { asset: h.asset, side: 'sell' })}>
                  <td className="left">
                    <AssetLabel asset={h.asset} size={28} />
                  </td>
                  <td className="num">{formatQty(h.quantity)}</td>
                  <td className="num">{money(h.avg_entry_price, { public: true })}</td>
                  <td className="num">{money(h.current_price, { public: true })}</td>
                  <td className="num strong">{money(h.current_value)}</td>
                  <td className={`num ${toneClass(h.unrealized_gain)}`}>{money(h.unrealized_gain, { sign: true })}</td>
                  <td>
                    <Delta pct={h.unrealized_gain_percent} size="sm" subtle />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

export default Analytics;
