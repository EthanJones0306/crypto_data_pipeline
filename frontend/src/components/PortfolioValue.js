import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowDownLeft, ArrowUpRight, ChevronRight, Gauge, Sparkles, Wallet, Zap } from 'lucide-react';
import { fetchGainsLosses, fetchPortfolioValue, getOpenPositions } from '../services/api';
import useApi from '../hooks/useApi';
import { formatPct, formatQty } from '../lib/format';
import { getDisplayName } from '../lib/assets';
import PortfolioDonutChart from './PortfolioDonutChart';
import { AnimatedNumber, AssetLabel, Card, Delta, EmptyState, ErrorState, Segmented, Skeleton, SkeletonRows, UpdatedAgo, useApp } from './ui';

const greeting = () => {
  const h = new Date().getHours();
  if (h < 5) return 'Up late';
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
};

const loadDashboard = async () => {
  const [portfolio, analytics, positions] = await Promise.all([
    fetchPortfolioValue(),
    fetchGainsLosses().catch(() => null),
    getOpenPositions().catch(() => null),
  ]);
  return { portfolio, analytics, positions: positions?.positions || [], liquidated: positions?.recently_liquidated || [] };
};

function PortfolioValue() {
  const { money, navigate, privacy, toast } = useApp();
  const { data, error, loading, refreshing, updatedAt, reload } = useApi(loadDashboard, { interval: 60000 });
  const [sort, setSort] = useState('value');

  useEffect(() => {
    (data?.liquidated || []).forEach((n) =>
      toast(`${getDisplayName(n.asset)} ${n.side} was liquidated. Margin lost: ${money(n.margin_lost)}`, { type: 'error', title: 'Position liquidated', duration: 9000 })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.liquidated]);

  const holdings = useMemo(() => {
    const perf = Object.fromEntries((data?.analytics?.holdings || []).map((h) => [h.asset, h]));
    const total = data?.portfolio?.total_portfolio_value || 0;
    const rows = (data?.portfolio?.holdings || []).map((h) => ({
      ...h,
      share: total > 0 ? (h.total_value / total) * 100 : 0,
      gain: perf[h.asset]?.unrealized_gain ?? null,
      gainPct: perf[h.asset]?.unrealized_gain_percent ?? null,
    }));
    const by = {
      value: (a, b) => b.total_value - a.total_value,
      performance: (a, b) => (b.gainPct ?? -Infinity) - (a.gainPct ?? -Infinity),
      name: (a, b) => a.asset.localeCompare(b.asset),
    };
    return rows.sort(by[sort]);
  }, [data, sort]);

  if (loading) return <DashboardSkeleton />;
  if (error && !data) return <ErrorState message={error} onRetry={reload} />;

  const total = data.portfolio.total_portfolio_value || 0;
  const summary = data.analytics?.summary;
  const positions = data.positions;
  const positionsPnl = positions.reduce((s, p) => s + (p.pnl || 0), 0);
  const empty = holdings.length === 0;

  return (
    <div className="page">
      <motion.section className="hero card" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
        <div className="hero-main">
          <p className="hero-greeting">{greeting()}</p>
          <p className="hero-label">
            <Wallet size={14} /> Total balance
          </p>
          <div className={`hero-value ${privacy ? 'is-private' : ''}`}>
            {privacy ? money(total) : <AnimatedNumber value={total} format={(v) => money(v)} />}
          </div>
          {summary && summary.total_invested > 0 ? (
            <div className="hero-delta">
              <Delta value={summary.total_gains_losses} pct={summary.roi_percent} money={money} size="lg" />
              <span className="hero-delta-label">all time · {money(summary.total_invested)} invested</span>
            </div>
          ) : (
            <p className="hero-delta-label">Make a trade to start tracking performance.</p>
          )}
        </div>
        <div className="hero-side">
          <UpdatedAgo at={updatedAt} refreshing={refreshing} onRefresh={reload} />
          <div className="quick-actions">
            <button type="button" className="quick-action" onClick={() => navigate('trade', { side: 'buy' })}>
              <span className="quick-icon tone-gain">
                <ArrowDownLeft size={18} />
              </span>
              Buy
            </button>
            <button type="button" className="quick-action" onClick={() => navigate('trade', { side: 'sell' })} disabled={empty}>
              <span className="quick-icon tone-loss">
                <ArrowUpRight size={18} />
              </span>
              Sell
            </button>
            <button type="button" className="quick-action" onClick={() => navigate('leverage')}>
              <span className="quick-icon tone-accent">
                <Zap size={18} />
              </span>
              Leverage
            </button>
          </div>
        </div>
      </motion.section>

      {positions.length > 0 && (
        <button type="button" className="banner-link card" onClick={() => navigate('positions')}>
          <span className="banner-icon">
            <Gauge size={18} />
          </span>
          <span className="banner-text">
            <strong>
              {positions.length} open leveraged position{positions.length > 1 ? 's' : ''}
            </strong>
            <span>Unrealised P&L</span>
          </span>
          <Delta value={positionsPnl} money={money} />
          <ChevronRight size={18} className="muted" />
        </button>
      )}

      {empty ? (
        <Card>
          <EmptyState
            icon={Sparkles}
            title="Your portfolio is a blank canvas"
            body="Buy your first asset at live market prices. It's paper money, so experiment freely."
            action={
              <button type="button" className="btn btn-primary" onClick={() => navigate('trade', { side: 'buy' })}>
                Make your first trade
              </button>
            }
          />
        </Card>
      ) : (
        <div className="grid-dashboard">
          <Card
            title="Holdings"
            padded={false}
            action={
              <Segmented
                size="sm"
                label="Sort holdings"
                value={sort}
                onChange={setSort}
                options={[
                  { value: 'value', label: 'Value' },
                  { value: 'performance', label: 'P&L' },
                  { value: 'name', label: 'A–Z' },
                ]}
              />
            }
          >
            <ul className="holdings-list">
              {holdings.map((h, i) => (
                <motion.li key={h.asset} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                  <button type="button" className="holding-row" onClick={() => navigate('trade', { asset: h.asset, side: 'sell' })}>
                    <AssetLabel asset={h.asset} sub={`${formatQty(h.quantity)} · ${money(h.current_price, { public: true })}`} />
                    <div className="holding-share hide-mobile">
                      <div className="share-bar">
                        <motion.span initial={{ width: 0 }} animate={{ width: `${h.share}%` }} transition={{ duration: 0.6, delay: 0.1 + i * 0.03 }} />
                      </div>
                      <span className="num muted">{formatPct(h.share, { sign: false, digits: 1 })}</span>
                    </div>
                    <div className="holding-value">
                      <span className="num strong">{money(h.total_value)}</span>
                      {h.gainPct !== null ? <Delta pct={h.gainPct} size="sm" subtle /> : <span className="muted small">—</span>}
                    </div>
                  </button>
                </motion.li>
              ))}
            </ul>
          </Card>

          <Card title="Allocation">
            <PortfolioDonutChart holdings={data.portfolio.holdings} />
          </Card>
        </div>
      )}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="page">
      <section className="hero card">
        <div className="hero-main" style={{ display: 'grid', gap: 12 }}>
          <Skeleton width={120} height={12} />
          <Skeleton width={260} height={48} radius={12} />
          <Skeleton width={200} height={14} />
        </div>
      </section>
      <div className="grid-dashboard">
        <Card title="Holdings">
          <SkeletonRows rows={4} />
        </Card>
        <Card title="Allocation">
          <Skeleton height={220} radius={999} width={220} style={{ margin: '0 auto', display: 'block' }} />
        </Card>
      </div>
    </div>
  );
}

export default PortfolioValue;
