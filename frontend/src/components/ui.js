import React, { useContext, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, ArrowDownRight, ArrowUpRight, Minus, RefreshCw } from 'lucide-react';
import { AppContext } from '../contexts/AppContext';
import { assetHue, getAssetMeta, hydrateAssetMeta, subscribeAssetMeta } from '../lib/assets';
import { formatPct, relativeTime } from '../lib/format';

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="page-header">
      <div>
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </div>
  );
}

export function Card({ title, action, children, className = '', padded = true, ...rest }) {
  return (
    <section className={`card ${padded ? 'card-padded' : ''} ${className}`} {...rest}>
      {(title || action) && (
        <header className="card-header">
          {title && <h2 className="card-title">{title}</h2>}
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

let metaVersion = 0;
subscribeAssetMeta(() => {
  metaVersion += 1;
});

export function AssetAvatar({ asset, size = 36, image }) {
  useSyncExternalStore(subscribeAssetMeta, () => metaVersion);
  const meta = getAssetMeta(asset);
  const [broken, setBroken] = useState(false);
  const src = image || meta.image;

  useEffect(() => {
    hydrateAssetMeta(asset);
  }, [asset]);

  const style = { width: size, height: size, fontSize: Math.max(10, size * 0.34) };
  if (src && !broken) {
    return <img className="avatar" src={src} alt="" style={style} onError={() => setBroken(true)} />;
  }
  return (
    <span className={`avatar avatar-mono hue-${assetHue(asset)}`} style={style} aria-hidden="true">
      {meta.symbol.slice(0, meta.kind === 'stock' ? 4 : 3)}
    </span>
  );
}

export function AssetLabel({ asset, size = 36, sub }) {
  const meta = getAssetMeta(asset);
  return (
    <div className="asset-label">
      <AssetAvatar asset={asset} size={size} />
      <div className="asset-label-text">
        <span className="asset-name">{meta.name}</span>
        <span className="asset-sub">{sub ?? meta.symbol}</span>
      </div>
    </div>
  );
}

export function Delta({ value, pct, money, size = 'md', subtle = false }) {
  const v = value ?? pct ?? 0;
  const dir = v > 0.0001 ? 'up' : v < -0.0001 ? 'down' : 'flat';
  const Icon = dir === 'up' ? ArrowUpRight : dir === 'down' ? ArrowDownRight : Minus;
  return (
    <span className={`delta delta-${dir} delta-${size} ${subtle ? 'delta-subtle' : ''}`}>
      <Icon size={size === 'lg' ? 16 : 13} strokeWidth={2.5} aria-hidden="true" />
      {value !== undefined && money ? money(Math.abs(value)) : null}
      {value !== undefined && pct !== undefined ? ' · ' : null}
      {pct !== undefined ? formatPct(Math.abs(pct), { sign: false }) : null}
      <span className="sr-only">{dir === 'up' ? 'gain' : dir === 'down' ? 'loss' : 'no change'}</span>
    </span>
  );
}

export function Segmented({ options, value, onChange, size = 'md', tone, full = false, label }) {
  return (
    <div className={`segmented segmented-${size} ${full ? 'segmented-full' : ''}`} role="radiogroup" aria-label={label}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            className={`segment ${active ? 'active' : ''}`}
            onClick={() => onChange(opt.value)}
          >
            {active && (
              <motion.span
                layoutId={`seg-${label || options.map((o) => o.value).join('-')}`}
                className={`segment-thumb ${tone ? `tone-${typeof tone === 'function' ? tone(opt.value) : tone}` : ''}`}
                transition={{ type: 'spring', stiffness: 500, damping: 38 }}
              />
            )}
            <span className="segment-label">
              {opt.icon}
              {opt.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function AnimatedNumber({ value, format, duration = 900 }) {
  const [display, setDisplay] = useState(value ?? 0);
  const from = useRef(value ?? 0);

  useEffect(() => {
    if (value === null || value === undefined) return undefined;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const start = from.current;
    if (reduce || start === value) {
      setDisplay(value);
      from.current = value;
      return undefined;
    }
    const t0 = performance.now();
    let raf;
    const tick = (now) => {
      const p = Math.min(1, (now - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 4);
      setDisplay(start + (value - start) * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
      else from.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      from.current = value;
    };
  }, [value, duration]);

  return <>{format(display)}</>;
}

export function Skeleton({ width = '100%', height = 14, radius = 8, style }) {
  return <span className="skeleton" style={{ width, height, borderRadius: radius, ...style }} aria-hidden="true" />;
}

export function SkeletonRows({ rows = 4 }) {
  return (
    <div className="skeleton-rows" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton-row">
          <Skeleton width={36} height={36} radius={999} />
          <div style={{ flex: 1, display: 'grid', gap: 6 }}>
            <Skeleton width="38%" />
            <Skeleton width="22%" height={10} />
          </div>
          <Skeleton width={80} />
        </div>
      ))}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, body, action }) {
  return (
    <div className="empty-state">
      {Icon && (
        <div className="empty-icon">
          <Icon size={22} strokeWidth={1.75} />
        </div>
      )}
      <h3>{title}</h3>
      {body && <p>{body}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="error-state" role="alert">
      <AlertTriangle size={18} />
      <span>{message}</span>
      {onRetry && (
        <button type="button" className="btn btn-ghost btn-sm" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}

export function UpdatedAgo({ at, refreshing, onRefresh }) {
  const [, force] = useState(0);
  useEffect(() => {
    const id = setInterval(() => force((n) => n + 1), 5000);
    return () => clearInterval(id);
  }, []);
  return (
    <button type="button" className="updated-ago" onClick={onRefresh} disabled={refreshing} title="Refresh">
      <RefreshCw size={13} className={refreshing ? 'spin' : ''} />
      <span>{refreshing ? 'Updating…' : `Updated ${relativeTime(at)}`}</span>
    </button>
  );
}

export function useApp() {
  return useContext(AppContext);
}
