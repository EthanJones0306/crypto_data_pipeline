import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowDownUp, Loader2, X } from 'lucide-react';
import { buyCrypto, buyStock, fetchPortfolioValue, fetchQuote, fetchTransactions, sellCrypto, sellStock } from '../services/api';
import useApi from '../hooks/useApi';
import { getAssetMeta, isStockKey } from '../lib/assets';
import { formatMoney, formatQty, parseTimestamp, relativeTime } from '../lib/format';
import SearchBar from './SearchBar';
import { AssetAvatar, AssetLabel, Card, EmptyState, PageHeader, Segmented, Skeleton, useApp } from './ui';

const POPULAR = { crypto: ['bitcoin', 'ethereum', 'solana'], stocks: ['AAPL', 'NVDA', 'MSFT', 'TSLA'] };
const BUY_PRESETS = { USD: [50, 100, 250, 1000], EUR: [50, 100, 250, 1000], GBP: [50, 100, 250, 1000], ZAR: [500, 1000, 5000, 10000] };
const SELL_PRESETS = [0.25, 0.5, 0.75, 1];

const trimNumber = (n, digits) => (Number.isFinite(n) ? String(parseFloat(n.toFixed(digits))) : '');

function Trading() {
  const { params, currency, rate, money, toast, refreshAll, navigate } = useApp();
  const [side, setSide] = useState(params.side === 'sell' ? 'sell' : 'buy');
  const [assetType, setAssetType] = useState(params.asset && isStockKey(params.asset) ? 'stocks' : 'crypto');
  const [asset, setAsset] = useState(params.asset || '');
  const [mode, setMode] = useState('fiat');
  const [input, setInput] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (params.side) setSide(params.side === 'sell' ? 'sell' : 'buy');
    if (params.asset) {
      setAsset(params.asset);
      setAssetType(isStockKey(params.asset) ? 'stocks' : 'crypto');
    }
  }, [params.side, params.asset]);

  const portfolio = useApi(fetchPortfolioValue);
  const recent = useApi(() => fetchTransactions(6));
  const quote = useApi(() => (asset ? fetchQuote(asset, assetType) : Promise.resolve(null)), { interval: 20000, deps: [asset, assetType] });

  const holdings = useMemo(() => portfolio.data?.holdings || [], [portfolio.data]);
  const holding = holdings.find((h) => h.asset === asset || h.asset.toLowerCase() === asset.toLowerCase());
  const price = quote.data?.asset === asset ? quote.data.price : null;
  const meta = getAssetMeta(asset);
  const kindHoldings = holdings.filter((h) => (assetType === 'stocks') === isStockKey(h.asset));

  const value = parseFloat(input);
  const hasValue = Number.isFinite(value) && value > 0;
  const qty = hasValue && price ? (mode === 'units' ? value : value / rate / price) : null;
  const totalUsd = hasValue && price ? (mode === 'units' ? value * price : value / rate) : null;
  const available = holding?.quantity || 0;

  let problem = null;
  if (side === 'sell' && asset && !holding) problem = `You don't own any ${meta.name} yet.`;
  else if (side === 'sell' && qty !== null && qty > available * 1.000001) problem = `You only have ${formatQty(available)} ${meta.symbol}.`;
  else if (asset && quote.error && !price) problem = 'Live price unavailable right now. Try again shortly.';

  const canSubmit = asset && hasValue && price && !problem && !submitting;

  const changeType = (t) => {
    setAssetType(t);
    setAsset('');
    setInput('');
  };

  const flipMode = () => {
    if (hasValue && price) {
      setInput(mode === 'fiat' ? trimNumber(value / rate / price, 8) : trimNumber(value * price * rate, 2));
    }
    setMode((m) => (m === 'fiat' ? 'units' : 'fiat'));
  };

  const applyPreset = (preset) => {
    if (side === 'buy') {
      setMode('fiat');
      setInput(String(preset));
    } else {
      setMode('units');
      setInput(trimNumber(available * preset, 8));
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    const stock = assetType === 'stocks';
    const fn = side === 'buy' ? (stock ? buyStock : buyCrypto) : stock ? sellStock : sellCrypto;
    try {
      if (mode === 'units') await fn(asset, value);
      else await fn(asset, totalUsd, 'USD');
      toast(`${side === 'buy' ? 'Bought' : 'Sold'} ${formatQty(qty)} ${meta.symbol} for ${formatMoney(totalUsd * rate, currency)}`, {
        title: side === 'buy' ? 'Order filled' : 'Sold',
        celebrate: side === 'buy',
      });
      setInput('');
      refreshAll();
    } catch (err) {
      toast(err.message, { type: 'error', title: 'Order failed' });
    } finally {
      setSubmitting(false);
    }
  };

  const fiatSymbol = formatMoney(0, currency).replace(/[\d.,\s]/g, '');

  return (
    <div className="page">
      <PageHeader title="Trade" subtitle="Buy and sell at live market prices with paper money." />

      <div className="grid-trade">
        <Card className="ticket">
          <form onSubmit={submit} className="ticket-form">
            <Segmented
              full
              label="Order side"
              value={side}
              onChange={(s) => {
                setSide(s);
                setInput('');
              }}
              tone={(v) => (v === 'buy' ? 'gain' : 'loss')}
              options={[
                { value: 'buy', label: 'Buy' },
                { value: 'sell', label: 'Sell' },
              ]}
            />

            <div className="field">
              <div className="field-row">
                <span className="field-label">Asset</span>
                <Segmented
                  size="sm"
                  label="Asset type"
                  value={assetType}
                  onChange={changeType}
                  options={[
                    { value: 'crypto', label: 'Crypto' },
                    { value: 'stocks', label: 'Stocks' },
                  ]}
                />
              </div>
              <AnimatePresence mode="wait" initial={false}>
                {asset ? (
                  <motion.div key="chip" className="asset-chip" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
                    <AssetAvatar asset={asset} size={40} />
                    <div className="asset-chip-text">
                      <strong>{meta.name}</strong>
                      <span className="num">
                        {price ? (
                          <>
                            {money(price, { public: true })} <span className="muted">per {meta.symbol}</span>
                          </>
                        ) : quote.loading || quote.refreshing ? (
                          <Skeleton width={90} height={12} />
                        ) : (
                          <span className="muted">Price unavailable</span>
                        )}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="icon-btn"
                      onClick={() => {
                        setAsset('');
                        setInput('');
                      }}
                      aria-label="Change asset"
                    >
                      <X size={16} />
                    </button>
                  </motion.div>
                ) : (
                  <motion.div key="search" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <SearchBar
                      assetType={assetType}
                      onSelect={setAsset}
                      suggestions={side === 'sell' ? kindHoldings.map((h) => h.asset) : [...new Set([...kindHoldings.map((h) => h.asset), ...POPULAR[assetType]])].slice(0, 6)}
                      placeholder={assetType === 'crypto' ? 'Search Bitcoin, Solana, Pepe…' : 'Search AAPL, NVDA, Tesla…'}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="field">
              <div className="field-row">
                <label className="field-label" htmlFor="trade-amount">
                  {mode === 'fiat' ? `Amount in ${currency}` : `Quantity in ${meta.symbol || 'units'}`}
                </label>
                {side === 'sell' && holding && (
                  <span className="field-hint num">
                    Available {formatQty(available)} {meta.symbol}
                  </span>
                )}
              </div>
              <div className={`amount-input ${problem && hasValue ? 'invalid' : ''}`}>
                {mode === 'fiat' && <span className="amount-prefix">{fiatSymbol}</span>}
                <input
                  id="trade-amount"
                  inputMode="decimal"
                  autoComplete="off"
                  placeholder="0"
                  value={input}
                  onChange={(e) => setInput(e.target.value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1'))}
                  disabled={!asset}
                />
                <button type="button" className="unit-toggle" onClick={flipMode} disabled={!asset} title="Switch between currency and quantity">
                  <ArrowDownUp size={14} />
                  {mode === 'fiat' ? currency : meta.symbol || 'Units'}
                </button>
              </div>
              <div className="chips">
                {side === 'buy'
                  ? (BUY_PRESETS[currency] || BUY_PRESETS.USD).map((p) => (
                      <button key={p} type="button" className="chip" onClick={() => applyPreset(p)} disabled={!asset}>
                        {formatMoney(p, currency, { digits: 0 })}
                      </button>
                    ))
                  : SELL_PRESETS.map((p) => (
                      <button key={p} type="button" className="chip" onClick={() => applyPreset(p)} disabled={!holding}>
                        {p === 1 ? 'Max' : `${p * 100}%`}
                      </button>
                    ))}
              </div>
            </div>

            <div className="summary">
              <div className="summary-row">
                <span>{mode === 'fiat' ? "You'll " + (side === 'buy' ? 'receive' : 'sell') : side === 'buy' ? "You'll pay" : "You'll receive"}</span>
                <span className="num strong">
                  {qty === null ? '—' : mode === 'fiat' ? `≈ ${formatQty(qty)} ${meta.symbol}` : `≈ ${formatMoney(totalUsd * rate, currency)}`}
                </span>
              </div>
              <div className="summary-row">
                <span>Market price</span>
                <span className="num">{price ? money(price, { public: true }) : '—'}</span>
              </div>
              <div className="summary-row">
                <span>Fees</span>
                <span className="num">{formatMoney(0, currency)}</span>
              </div>
            </div>

            <AnimatePresence>
              {problem && (asset || hasValue) && (
                <motion.p className="field-error" role="alert" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                  {problem}
                </motion.p>
              )}
            </AnimatePresence>

            <motion.button type="submit" className={`btn btn-xl ${side === 'buy' ? 'btn-gain' : 'btn-loss'}`} disabled={!canSubmit} whileTap={{ scale: 0.98 }}>
              {submitting ? <Loader2 size={18} className="spin" /> : null}
              {submitting ? 'Placing order…' : asset ? `${side === 'buy' ? 'Buy' : 'Sell'} ${meta.name}` : 'Choose an asset'}
            </motion.button>
          </form>
        </Card>

        <div className="stack">
          <Card title="Your holdings" padded={false}>
            {portfolio.loading ? (
              <div className="card-padded">
                <Skeleton height={40} />
              </div>
            ) : holdings.length === 0 ? (
              <p className="muted card-padded small">Nothing yet. Your first buy will show up here.</p>
            ) : (
              <ul className="mini-list">
                {holdings.map((h) => (
                  <li key={h.asset}>
                    <button
                      type="button"
                      className={`mini-row ${h.asset === asset ? 'active' : ''}`}
                      onClick={() => {
                        setAssetType(isStockKey(h.asset) ? 'stocks' : 'crypto');
                        setAsset(h.asset);
                        setSide('sell');
                        setInput('');
                      }}
                    >
                      <AssetLabel asset={h.asset} size={30} sub={`${formatQty(h.quantity)} ${getAssetMeta(h.asset).symbol}`} />
                      <span className="num">{money(h.total_value)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card
            title="Recent orders"
            padded={false}
            action={
              <button type="button" className="link-btn" onClick={() => navigate('activity')}>
                View all
              </button>
            }
          >
            {recent.data?.transactions?.length ? (
              <ul className="mini-list">
                {recent.data.transactions.map((tx, i) => (
                  <li key={`${tx.timestamp}-${i}`} className="mini-row static">
                    <AssetLabel asset={tx.asset} size={30} sub={relativeTime(parseTimestamp(tx.timestamp))} />
                    <span className={`pill ${tx.type === 'BUY' ? 'pill-gain' : 'pill-loss'}`}>{tx.type === 'BUY' ? 'Buy' : 'Sell'}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title="No orders yet" body="Your trades will appear here." />
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

export default Trading;
