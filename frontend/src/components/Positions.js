import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Gauge, Loader2 } from 'lucide-react';
import { closePosition, getOpenPositions } from '../services/api';
import useApi from '../hooks/useApi';
import { getDisplayName } from '../lib/assets';
import { formatPct, formatQty, parseTimestamp, relativeTime, toneClass } from '../lib/format';
import { AssetLabel, Card, Delta, EmptyState, ErrorState, PageHeader, SkeletonRows, UpdatedAgo, useApp } from './ui';

const health = (pos) => {
  const initial = (1 / pos.leverage - (pos.maintenance_rate ?? 0.004)) * 100;
  if (initial <= 0) return 0;
  return Math.max(0, Math.min(100, (pos.liquidation_distance_percent / initial) * 100));
};

export default function Positions() {
  const { money, toast, confirm, refreshAll, navigate } = useApp();
  const { data, error, loading, refreshing, updatedAt, reload } = useApi(getOpenPositions, { interval: 5000 });
  const [closingId, setClosingId] = useState(null);

  useEffect(() => {
    (data?.recently_liquidated || []).forEach((n) =>
      toast(`${getDisplayName(n.asset)} ${n.side} was liquidated. Margin lost: ${money(n.margin_lost)}`, { type: 'error', title: 'Position liquidated', duration: 9000 })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.recently_liquidated]);

  const positions = data?.positions || [];
  const totalMargin = positions.reduce((s, p) => s + (p.required_margin || 0), 0);
  const totalPnl = positions.reduce((s, p) => s + (p.pnl || 0), 0);
  const exposure = positions.reduce((s, p) => s + (p.position_value || 0), 0);

  const handleClose = async (pos) => {
    const ok = await confirm({
      title: `Close ${getDisplayName(pos.asset)} ${pos.side}?`,
      body: (
        <p>
          You'll realise roughly <strong className={toneClass(pos.pnl)}>{money(pos.pnl, { sign: true })}</strong> at the current market price.
        </p>
      ),
      confirmLabel: 'Close position',
    });
    if (!ok) return;
    setClosingId(pos.id);
    try {
      const resp = await closePosition(pos.id);
      toast(`P&L ${money(resp.pnl, { sign: true })} · ${money(resp.cash_returned)} returned to your account`, {
        title: 'Position closed',
        type: resp.pnl >= 0 ? 'success' : 'info',
        celebrate: resp.pnl > 0,
      });
      refreshAll();
    } catch (err) {
      toast(err.message, { type: 'error', title: "Couldn't close position" });
    } finally {
      setClosingId(null);
    }
  };

  return (
    <div className="page">
      <PageHeader
        title="Positions"
        subtitle="Live leveraged positions, refreshed every few seconds."
        actions={<UpdatedAgo at={updatedAt} refreshing={refreshing} onRefresh={reload} />}
      />

      {error && !data && <ErrorState message={error} onRetry={reload} />}

      {loading ? (
        <Card>
          <SkeletonRows rows={3} />
        </Card>
      ) : positions.length === 0 && !error ? (
        <Card>
          <EmptyState
            icon={Gauge}
            title="No open positions"
            body="Go long or short with leverage. Everything here is simulated, so it's a safe place to learn."
            action={
              <button type="button" className="btn btn-primary" onClick={() => navigate('leverage')}>
                Open a position
              </button>
            }
          />
        </Card>
      ) : (
        <>
          <div className="kpi-grid">
            <div className="kpi card">
              <span className="kpi-label">Unrealised P&L</span>
              <span className={`kpi-value num ${toneClass(totalPnl)}`}>{money(totalPnl, { sign: true })}</span>
            </div>
            <div className="kpi card">
              <span className="kpi-label">Margin in use</span>
              <span className="kpi-value num">{money(totalMargin)}</span>
            </div>
            <div className="kpi card">
              <span className="kpi-label">Total exposure</span>
              <span className="kpi-value num">{money(exposure)}</span>
            </div>
          </div>

          <div className="positions-grid">
            <AnimatePresence initial={false}>
              {positions.map((pos) => {
                const h = health(pos);
                const tone = h < 25 ? 'high' : h < 55 ? 'medium' : 'low';
                return (
                  <motion.article
                    key={pos.id}
                    layout
                    className="card card-padded position-card"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.2 } }}
                  >
                    <header className="position-head">
                      <AssetLabel asset={pos.asset} sub={`Opened ${relativeTime(parseTimestamp(pos.opened_at))}`} />
                      <span className={`pill ${pos.side === 'long' ? 'pill-gain' : 'pill-loss'}`}>
                        {pos.side} {pos.leverage}×
                      </span>
                    </header>

                    <div className="position-pnl">
                      <span className={`position-pnl-value num ${toneClass(pos.pnl)}`}>{money(pos.pnl, { sign: true })}</span>
                      <Delta pct={pos.pnl_percent} size="sm" />
                    </div>

                    <dl className="position-stats">
                      <div>
                        <dt>Entry</dt>
                        <dd className="num">{money(pos.entry_price, { public: true })}</dd>
                      </div>
                      <div>
                        <dt>Mark</dt>
                        <dd className="num">{money(pos.current_price, { public: true })}</dd>
                      </div>
                      <div>
                        <dt>Liquidation</dt>
                        <dd className="num text-loss">{money(pos.liquidation_price, { public: true })}</dd>
                      </div>
                      <div>
                        <dt>Size</dt>
                        <dd className="num">{formatQty(pos.quantity)}</dd>
                      </div>
                    </dl>

                    <div className="health">
                      <div className="health-row">
                        <span>Position health</span>
                        <span className={`num risk-text-${tone}`}>{formatPct(pos.liquidation_distance_percent, { sign: false })} to liquidation</span>
                      </div>
                      <div className="risk-track">
                        <motion.span className={`risk-fill risk-${tone}`} animate={{ width: `${Math.max(3, h)}%` }} transition={{ type: 'spring', stiffness: 160, damping: 28 }} />
                      </div>
                    </div>

                    <button type="button" className="btn btn-ghost btn-block" onClick={() => handleClose(pos)} disabled={closingId === pos.id}>
                      {closingId === pos.id && <Loader2 size={16} className="spin" />}
                      {closingId === pos.id ? 'Closing…' : 'Close position'}
                    </button>
                  </motion.article>
                );
              })}
            </AnimatePresence>
          </div>
        </>
      )}
    </div>
  );
}
