import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, Loader2, TrendingDown, TrendingUp, X } from 'lucide-react';
import { fetchQuote, simulateOrder } from '../services/api';
import useApi from '../hooks/useApi';
import { getAssetMeta, isStockKey } from '../lib/assets';
import { formatMoney, formatPct } from '../lib/format';
import SearchBar from './SearchBar';
import { AssetAvatar, Card, PageHeader, Segmented, Skeleton, useApp } from './ui';

// Matches TradingService.simulate_order on the backend.
const MAINTENANCE_RATE = 0.004;
const LEVERAGE_MARKS = [2, 5, 10, 20];
const MARGIN_PRESETS = { USD: [50, 100, 500, 1000], EUR: [50, 100, 500, 1000], GBP: [50, 100, 500, 1000], ZAR: [500, 1000, 5000, 10000] };

const liquidationPrice = (entry, side, lev) =>
  side === 'long' ? entry * (1 + MAINTENANCE_RATE - 1 / lev) : entry * (1 - MAINTENANCE_RATE + 1 / lev);

export default function LeverageTrading() {
  const { params, currency, rate, money, toast, refreshAll, navigate, confirm } = useApp();
  const [side, setSide] = useState('long');
  const [assetType, setAssetType] = useState('crypto');
  const [asset, setAsset] = useState(params.asset || '');
  const [margin, setMargin] = useState('');
  const [leverage, setLeverage] = useState(5);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (params.asset) {
      setAsset(params.asset);
      setAssetType(isStockKey(params.asset) ? 'stocks' : 'crypto');
    }
  }, [params.asset]);

  const backendType = assetType === 'stocks' ? 'stock' : 'crypto';
  const quote = useApi(() => (asset ? fetchQuote(asset, backendType) : Promise.resolve(null)), { interval: 15000, deps: [asset, backendType] });
  const price = quote.data?.asset === asset ? quote.data.price : null;
  const meta = getAssetMeta(asset);

  const marginFiat = parseFloat(margin);
  const hasMargin = Number.isFinite(marginFiat) && marginFiat > 0;
  const marginUsd = hasMargin ? marginFiat / rate : null;
  const sizeUsd = marginUsd ? marginUsd * leverage : null;
  const liq = price ? liquidationPrice(price, side, leverage) : null;
  const distancePct = price && liq ? (Math.abs(price - liq) / price) * 100 : null;
  const risk = distancePct === null ? null : distancePct < 5 ? 'high' : distancePct < 15 ? 'medium' : 'low';
  const canSubmit = asset && price && hasMargin && !submitting;

  const open = async () => {
    if (!canSubmit) return;
    const ok = await confirm({
      title: `Open ${leverage}× ${side} on ${meta.name}?`,
      body: (
        <dl className="dialog-summary">
          <div>
            <dt>Margin</dt>
            <dd>{formatMoney(marginFiat, currency)}</dd>
          </div>
          <div>
            <dt>Position size</dt>
            <dd>{formatMoney(sizeUsd * rate, currency)}</dd>
          </div>
          <div>
            <dt>Liquidation price</dt>
            <dd className="text-loss">{money(liq, { public: true })}</dd>
          </div>
        </dl>
      ),
      confirmLabel: `Open ${side}`,
    });
    if (!ok) return;
    setSubmitting(true);
    try {
      const resp = await simulateOrder({ asset, quantity: marginUsd / price, side, leverage, asset_type: backendType });
      toast(`${leverage}× ${side} on ${meta.name} filled at ${money(resp.result.filled_price, { public: true })}`, { title: 'Position opened', celebrate: true });
      setMargin('');
      refreshAll();
      navigate('positions');
    } catch (err) {
      toast(err.message, { type: 'error', title: "Couldn't open position" });
    } finally {
      setSubmitting(false);
    }
  };

  const fiatSymbol = formatMoney(0, currency).replace(/[\d.,\s]/g, '');
  const sliderPct = ((leverage - 1) / 19) * 100;

  return (
    <div className="page">
      <PageHeader title="Leverage" subtitle="Open simulated long or short positions with up to 20× leverage." />

      <div className="grid-trade">
        <Card className="ticket">
          <div className="ticket-form">
            <Segmented
              full
              label="Position side"
              value={side}
              onChange={setSide}
              tone={(v) => (v === 'long' ? 'gain' : 'loss')}
              options={[
                { value: 'long', label: 'Long', icon: <TrendingUp size={15} /> },
                { value: 'short', label: 'Short', icon: <TrendingDown size={15} /> },
              ]}
            />

            <div className="field">
              <div className="field-row">
                <span className="field-label">Market</span>
                <Segmented
                  size="sm"
                  label="Market type"
                  value={assetType}
                  onChange={(t) => {
                    setAssetType(t);
                    setAsset('');
                  }}
                  options={[
                    { value: 'crypto', label: 'Crypto' },
                    { value: 'stocks', label: 'Stocks' },
                  ]}
                />
              </div>
              {asset ? (
                <div className="asset-chip">
                  <AssetAvatar asset={asset} size={40} />
                  <div className="asset-chip-text">
                    <strong>{meta.name}</strong>
                    <span className="num">{price ? money(price, { public: true }) : quote.loading || quote.refreshing ? <Skeleton width={90} height={12} /> : <span className="muted">Price unavailable</span>}</span>
                  </div>
                  <button type="button" className="icon-btn" onClick={() => setAsset('')} aria-label="Change market">
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <SearchBar
                  assetType={assetType}
                  onSelect={setAsset}
                  suggestions={assetType === 'crypto' ? ['bitcoin', 'ethereum', 'solana'] : ['AAPL', 'NVDA', 'TSLA']}
                  placeholder="Search a market…"
                />
              )}
            </div>

            <div className="field">
              <label className="field-label" htmlFor="lev-margin">
                Margin in {currency}
              </label>
              <div className="amount-input">
                <span className="amount-prefix">{fiatSymbol}</span>
                <input
                  id="lev-margin"
                  inputMode="decimal"
                  autoComplete="off"
                  placeholder="0"
                  value={margin}
                  onChange={(e) => setMargin(e.target.value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1'))}
                />
              </div>
              <div className="chips">
                {(MARGIN_PRESETS[currency] || MARGIN_PRESETS.USD).map((p) => (
                  <button key={p} type="button" className="chip" onClick={() => setMargin(String(p))}>
                    {formatMoney(p, currency, { digits: 0 })}
                  </button>
                ))}
              </div>
            </div>

            <div className="field">
              <div className="field-row">
                <label className="field-label" htmlFor="lev-slider">
                  Leverage
                </label>
                <motion.span key={leverage} className="leverage-value num" initial={{ scale: 1.25 }} animate={{ scale: 1 }}>
                  {leverage}×
                </motion.span>
              </div>
              <input
                id="lev-slider"
                type="range"
                min="1"
                max="20"
                step="1"
                value={leverage}
                onChange={(e) => setLeverage(Number(e.target.value))}
                className={`slider risk-${leverage >= 10 ? 'high' : leverage >= 5 ? 'medium' : 'low'}`}
                style={{ '--fill': `${sliderPct}%` }}
              />
              <div className="chips">
                {LEVERAGE_MARKS.map((m) => (
                  <button key={m} type="button" className={`chip ${leverage === m ? 'active' : ''}`} onClick={() => setLeverage(m)}>
                    {m}×
                  </button>
                ))}
              </div>
            </div>

            <motion.button type="button" className={`btn btn-xl ${side === 'long' ? 'btn-gain' : 'btn-loss'}`} disabled={!canSubmit} onClick={open} whileTap={{ scale: 0.98 }}>
              {submitting && <Loader2 size={18} className="spin" />}
              {asset ? `Open ${leverage}× ${side === 'long' ? 'Long' : 'Short'}` : 'Choose a market'}
            </motion.button>
          </div>
        </Card>

        <div className="stack">
          <Card title="Position preview">
            <div className="summary summary-flush">
              <div className="summary-row">
                <span>Entry price</span>
                <span className="num">{price ? money(price, { public: true }) : '—'}</span>
              </div>
              <div className="summary-row">
                <span>Position size</span>
                <span className="num strong">{sizeUsd ? formatMoney(sizeUsd * rate, currency) : '—'}</span>
              </div>
              <div className="summary-row">
                <span>Liquidation price</span>
                <span className="num text-loss">{liq ? money(liq, { public: true }) : '—'}</span>
              </div>
              <div className="summary-row">
                <span>Distance to liquidation</span>
                <span className={`num risk-text-${risk || 'none'}`}>{distancePct !== null ? formatPct(distancePct, { sign: false }) : '—'}</span>
              </div>
              <div className="summary-row">
                <span>If price moves 1% your way</span>
                <span className="num text-gain">{sizeUsd ? `+${formatMoney(sizeUsd * rate * 0.01, currency)}` : '—'}</span>
              </div>
            </div>
            {distancePct !== null && (
              <div className="risk-meter" aria-label={`Liquidation risk ${risk}`}>
                <div className="risk-track">
                  <motion.span className={`risk-fill risk-${risk}`} animate={{ width: `${Math.max(4, 100 - Math.min(100, distancePct * 2))}%` }} transition={{ type: 'spring', stiffness: 200, damping: 30 }} />
                </div>
                <span className="risk-label">
                  {risk === 'high' ? 'High risk' : risk === 'medium' ? 'Moderate risk' : 'Lower risk'} · a {formatPct(distancePct, { sign: false, digits: 1 })} move {side === 'long' ? 'down' : 'up'} liquidates
                </span>
              </div>
            )}
          </Card>
          <AnimatePresence>
            {leverage >= 10 && (
              <motion.div className="callout callout-warning" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <AlertTriangle size={16} />
                <span>At {leverage}× a small move against you wipes out the margin. Positions are liquidated automatically.</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
