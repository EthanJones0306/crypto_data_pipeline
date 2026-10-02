import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, CheckCircle2, CornerDownLeft, Info, Search, X, XCircle } from 'lucide-react';
import { AppContext } from '../contexts/AppContext';
import { ThemeContext } from '../contexts/ThemeContext';
import { NAV_ITEMS } from './navItems';

const TOAST_ICONS = { success: CheckCircle2, error: XCircle, info: Info, warning: AlertTriangle };
const CONFETTI_COLORS = ['var(--series-1)', 'var(--series-2)', 'var(--series-3)', 'var(--series-4)', 'var(--series-5)', 'var(--series-7)'];

function Confetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 18 }).map((_, i) => ({
        x: (Math.random() - 0.5) * 220,
        y: -40 - Math.random() * 90,
        r: Math.random() * 360,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        delay: Math.random() * 0.08,
      })),
    []
  );
  return (
    <span className="confetti" aria-hidden="true">
      {pieces.map((p, i) => (
        <motion.span
          key={i}
          className="confetti-piece"
          style={{ background: p.color }}
          initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 0.6 }}
          animate={{ x: p.x, y: [0, p.y, p.y + 120], opacity: [1, 1, 0], rotate: p.r, scale: 1 }}
          transition={{ duration: 1.3, delay: p.delay, ease: 'easeOut' }}
        />
      ))}
    </span>
  );
}

export function Toasts() {
  const { toasts, dismissToast } = useContext(AppContext);
  const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  return (
    <div className="toast-region" role="status" aria-live="polite">
      <AnimatePresence initial={false}>
        {toasts.map((t) => {
          const Icon = TOAST_ICONS[t.type] || Info;
          return (
            <motion.div
              key={t.id}
              layout
              className={`toast toast-${t.type}`}
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.96, transition: { duration: 0.18 } }}
              transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            >
              {t.celebrate && !reduce && <Confetti />}
              <motion.span
                className="toast-icon"
                initial={{ scale: 0.4, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 18, delay: 0.05 }}
              >
                <Icon size={18} />
              </motion.span>
              <div className="toast-body">
                {t.title && <strong>{t.title}</strong>}
                <span>{t.message}</span>
              </div>
              <button type="button" className="icon-btn icon-btn-sm" onClick={() => dismissToast(t.id)} aria-label="Dismiss">
                <X size={14} />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

export function ConfirmDialog() {
  const { dialog } = useContext(AppContext);
  const confirmRef = useRef(null);

  useEffect(() => {
    if (!dialog) return undefined;
    confirmRef.current?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') dialog.resolve(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dialog]);

  return (
    <AnimatePresence>
      {dialog && (
        <motion.div
          className="overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(e) => e.target === e.currentTarget && dialog.resolve(false)}
        >
          <motion.div
            className="dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="dialog-title"
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 420, damping: 34 }}
          >
            {dialog.tone === 'danger' && (
              <div className="dialog-icon danger">
                <AlertTriangle size={20} />
              </div>
            )}
            <h2 id="dialog-title">{dialog.title}</h2>
            {dialog.body && <div className="dialog-body">{dialog.body}</div>}
            <div className="dialog-actions">
              <button type="button" className="btn btn-ghost" onClick={() => dialog.resolve(false)}>
                {dialog.cancelLabel || 'Cancel'}
              </button>
              <button
                ref={confirmRef}
                type="button"
                className={`btn ${dialog.tone === 'danger' ? 'btn-danger' : 'btn-primary'}`}
                onClick={() => dialog.resolve(true)}
              >
                {dialog.confirmLabel || 'Confirm'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function CommandPalette() {
  const { paletteOpen, setPaletteOpen, navigate, togglePrivacy, privacy, setCurrency, refreshAll } = useContext(AppContext);
  const { setTheme } = useContext(ThemeContext);
  const [query, setQuery] = useState('');
  const [index, setIndex] = useState(0);

  const commands = useMemo(
    () => [
      ...NAV_ITEMS.map((n) => ({ id: `go-${n.key}`, label: `Go to ${n.label}`, hint: n.hint, icon: n.icon, run: () => navigate(n.key) })),
      { id: 'buy', label: 'Buy an asset', icon: NAV_ITEMS[1].icon, run: () => navigate('trade', { side: 'buy' }) },
      { id: 'sell', label: 'Sell an asset', icon: NAV_ITEMS[1].icon, run: () => navigate('trade', { side: 'sell' }) },
      { id: 'privacy', label: privacy ? 'Show balances' : 'Hide balances', hint: 'H', run: togglePrivacy },
      { id: 'refresh', label: 'Refresh all data', hint: 'R', run: refreshAll },
      ...['USD', 'EUR', 'GBP', 'ZAR'].map((c) => ({ id: `cur-${c}`, label: `Show values in ${c}`, run: () => setCurrency(c) })),
      ...['system', 'dark', 'light', 'solar', 'high-contrast'].map((t) => ({ id: `theme-${t}`, label: `Theme: ${t.replace('-', ' ')}`, run: () => setTheme(t) })),
    ],
    [navigate, privacy, togglePrivacy, refreshAll, setCurrency, setTheme]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? commands.filter((c) => c.label.toLowerCase().includes(q)) : commands;
  }, [commands, query]);

  useEffect(() => {
    if (paletteOpen) {
      setQuery('');
      setIndex(0);
    }
  }, [paletteOpen]);

  useEffect(() => setIndex(0), [query]);

  const run = (cmd) => {
    setPaletteOpen(false);
    cmd?.run();
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIndex((i) => Math.min(filtered.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setIndex((i) => Math.max(0, i - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      run(filtered[index]);
    } else if (e.key === 'Escape') {
      setPaletteOpen(false);
    }
  };

  return (
    <AnimatePresence>
      {paletteOpen && (
        <motion.div
          className="overlay overlay-top"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(e) => e.target === e.currentTarget && setPaletteOpen(false)}
        >
          <motion.div
            className="palette"
            role="dialog"
            aria-modal="true"
            aria-label="Command palette"
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 480, damping: 36 }}
          >
            <div className="palette-search">
              <Search size={16} />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Type a command or page…"
                aria-label="Search commands"
              />
              <kbd>esc</kbd>
            </div>
            <ul className="palette-list" role="listbox">
              {filtered.length === 0 && <li className="palette-empty">No matches</li>}
              {filtered.map((cmd, i) => {
                const Icon = cmd.icon;
                return (
                  <li
                    key={cmd.id}
                    role="option"
                    aria-selected={i === index}
                    className={`palette-item ${i === index ? 'active' : ''}`}
                    onMouseEnter={() => setIndex(i)}
                    onClick={() => run(cmd)}
                  >
                    <span className="palette-item-icon">{Icon ? <Icon size={15} /> : null}</span>
                    <span className="palette-item-label">{cmd.label}</span>
                    {i === index ? <CornerDownLeft size={13} className="palette-enter" /> : cmd.hint && <kbd>{cmd.hint}</kbd>}
                  </li>
                );
              })}
            </ul>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
