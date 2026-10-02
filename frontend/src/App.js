import React, { useContext, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Command, Eye, EyeOff, MoreHorizontal, Moon, RefreshCw, Sun, X } from 'lucide-react';
import './App.css';
import { AppContext } from './contexts/AppContext';
import { ThemeContext } from './contexts/ThemeContext';
import { NAV_GROUPS, NAV_ITEMS } from './components/navItems';
import { CommandPalette, ConfirmDialog, Toasts } from './components/Overlays';
import PortfolioValue from './components/PortfolioValue';
import Trading from './components/Trading';
import LeverageTrading from './components/LeverageTrading';
import Positions from './components/Positions';
import Prices from './components/Prices';
import Transactions from './components/Transactions';
import Analytics from './components/Analytics';
import Status from './components/Status';
import Settings from './components/Settings';

const PAGES = {
  dashboard: PortfolioValue,
  trade: Trading,
  leverage: LeverageTrading,
  positions: Positions,
  markets: Prices,
  activity: Transactions,
  analytics: Analytics,
  status: Status,
  settings: Settings,
};

const isTyping = (el) => el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);

function Brand() {
  return (
    <div className="brand">
      <span className="brand-mark" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="18" height="18">
          <path d="M4 16.5 9 11l3.5 3.5L20 7" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="brand-name">Portfolio Tracker</span>
    </div>
  );
}

function Sidebar({ page, navigate }) {
  return (
    <aside className="sidebar">
      <Brand />
      <nav className="side-nav" aria-label="Main">
        {NAV_GROUPS.map((group) => (
          <div key={group} className="side-group">
            <p className="side-group-label">{group}</p>
            {NAV_ITEMS.filter((n) => n.group === group).map((item) => {
              const Icon = item.icon;
              const active = page === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  className={`side-link ${active ? 'active' : ''}`}
                  onClick={() => navigate(item.key)}
                  aria-current={active ? 'page' : undefined}
                >
                  {active && <motion.span layoutId="side-active" className="side-active" transition={{ type: 'spring', stiffness: 500, damping: 40 }} />}
                  <Icon size={17} strokeWidth={2} />
                  <span>{item.label}</span>
                  <kbd className="side-kbd">{item.hint}</kbd>
                </button>
              );
            })}
          </div>
        ))}
      </nav>
      <div className="side-footer">
        <span className="paper-badge">
          <span className="live-dot" /> Paper trading
        </span>
        <p>Simulated orders at live market prices.</p>
      </div>
    </aside>
  );
}

function TopBar() {
  const { currency, setCurrency, privacy, togglePrivacy, refreshAll, setPaletteOpen } = useContext(AppContext);
  const { resolvedTheme, setTheme } = useContext(ThemeContext);
  const [spinning, setSpinning] = useState(false);
  const isLight = resolvedTheme === 'light';
  const mac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

  const refresh = () => {
    refreshAll();
    setSpinning(true);
    setTimeout(() => setSpinning(false), 700);
  };

  return (
    <header className="topbar">
      <div className="topbar-brand">
        <Brand />
      </div>
      <button type="button" className="palette-trigger" onClick={() => setPaletteOpen(true)}>
        <Command size={14} />
        <span>Jump to…</span>
        <kbd>{mac ? '⌘K' : 'Ctrl K'}</kbd>
      </button>
      <div className="topbar-actions">
        <label className="currency-select">
          <span className="sr-only">Display currency</span>
          <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
            {['USD', 'EUR', 'GBP', 'ZAR'].map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className="icon-btn" onClick={togglePrivacy} aria-pressed={privacy} title={privacy ? 'Show balances (H)' : 'Hide balances (H)'}>
          {privacy ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
        <button type="button" className="icon-btn" onClick={() => setTheme(isLight ? 'dark' : 'light')} title="Toggle theme">
          {isLight ? <Moon size={17} /> : <Sun size={17} />}
        </button>
        <button type="button" className="icon-btn hide-mobile" onClick={refresh} title="Refresh all (R)">
          <RefreshCw size={17} className={spinning ? 'spin' : ''} />
        </button>
      </div>
    </header>
  );
}

function BottomNav({ page, navigate }) {
  const [moreOpen, setMoreOpen] = useState(false);
  const primary = NAV_ITEMS.filter((n) => n.mobile);
  const rest = NAV_ITEMS.filter((n) => !n.mobile);
  const moreActive = rest.some((n) => n.key === page);

  const go = (key) => {
    setMoreOpen(false);
    navigate(key);
  };

  return (
    <>
      <nav className="bottom-nav" aria-label="Main">
        {primary.map((item) => {
          const Icon = item.icon;
          const active = page === item.key;
          return (
            <button key={item.key} type="button" className={`bottom-link ${active ? 'active' : ''}`} onClick={() => go(item.key)} aria-current={active ? 'page' : undefined}>
              {active && <motion.span layoutId="bottom-active" className="bottom-active" transition={{ type: 'spring', stiffness: 500, damping: 40 }} />}
              <Icon size={20} strokeWidth={active ? 2.3 : 1.9} />
              <span>{item.label}</span>
            </button>
          );
        })}
        <button type="button" className={`bottom-link ${moreActive ? 'active' : ''}`} onClick={() => setMoreOpen(true)} aria-haspopup="dialog">
          {moreActive && <motion.span layoutId="bottom-active" className="bottom-active" />}
          <MoreHorizontal size={20} />
          <span>More</span>
        </button>
      </nav>

      <AnimatePresence>
        {moreOpen && (
          <motion.div className="overlay overlay-sheet" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMoreOpen(false)}>
            <motion.div
              className="sheet"
              role="dialog"
              aria-label="More pages"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 420, damping: 40 }}
              onClick={(e) => e.stopPropagation()}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.6 }}
              onDragEnd={(_, info) => info.offset.y > 80 && setMoreOpen(false)}
            >
              <div className="sheet-handle" />
              <div className="sheet-header">
                <h2>More</h2>
                <button type="button" className="icon-btn" onClick={() => setMoreOpen(false)} aria-label="Close">
                  <X size={18} />
                </button>
              </div>
              <div className="sheet-grid">
                {rest.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button key={item.key} type="button" className={`sheet-link ${page === item.key ? 'active' : ''}`} onClick={() => go(item.key)}>
                      <span className="sheet-link-icon">
                        <Icon size={20} />
                      </span>
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function App() {
  const { page, navigate, setPaletteOpen, togglePrivacy, refreshAll } = useContext(AppContext);
  const Page = PAGES[page] || PortfolioValue;

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((o) => !o);
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping(document.activeElement) || document.querySelector('.overlay')) return;
      const item = NAV_ITEMS.find((n) => n.hint === e.key);
      if (item) navigate(item.key);
      else if (e.key.toLowerCase() === 'h') togglePrivacy();
      else if (e.key.toLowerCase() === 'r') refreshAll();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [navigate, setPaletteOpen, togglePrivacy, refreshAll]);

  useEffect(() => {
    const item = NAV_ITEMS.find((n) => n.key === page);
    document.title = item && page !== 'dashboard' ? `${item.label} · Portfolio Tracker` : 'Portfolio Tracker';
  }, [page]);

  return (
    <div className="app">
      <div className="app-glow" aria-hidden="true" />
      <Sidebar page={page} navigate={navigate} />
      <div className="app-body">
        <TopBar />
        <main className="app-main">
          <motion.div key={page} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.24, ease: [0.2, 0.8, 0.2, 1] }}>
            <Page />
          </motion.div>
        </main>
      </div>
      <BottomNav page={page} navigate={navigate} />
      <Toasts />
      <ConfirmDialog />
      <CommandPalette />
    </div>
  );
}

export default App;
