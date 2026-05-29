import React, { useState, useContext } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import './App.css';
import PortfolioValue from './components/PortfolioValue';
import Prices from './components/Prices';
import Transactions from './components/Transactions';
import Trading from './components/Trading';
import LeverageTrading from './components/LeverageTrading';
import Positions from './components/Positions';
import Analytics from './components/Analytics';
import Status from './components/Status';
import { resetDatabase } from './services/api';
import { ThemeContext } from './contexts/ThemeContext';
import SettingsMenu from './components/SettingsMenu';

function App() {
  const [activeTab, setActiveTab] = useState('portfolio');
  const [isResetting, setIsResetting] = useState(false);
  const { resolvedTheme } = useContext(ThemeContext);

  const tabs = [
    { key: 'portfolio', label: 'Portfolio', icon: '◉' },
    { key: 'prices', label: 'Prices', icon: '↟' },
    { key: 'transactions', label: 'Transactions', icon: '▣' },
    { key: 'analytics', label: 'Analytics', icon: '◌' },
    { key: 'trading', label: 'Trading', icon: '⇄' },
    { key: 'leverage', label: 'Leverage', icon: '⟡' },
    { key: 'positions', label: 'Perps', icon: '◈' },
    { key: 'status', label: 'API Status', icon: '⟟' },
  ];

  const themeClass =
    resolvedTheme === 'light'
      ? 'light-mode'
      : resolvedTheme === 'solar'
        ? 'solar-mode'
        : resolvedTheme === 'high-contrast'
          ? 'high-contrast-mode'
          : 'dark-mode';

  const handleReset = async () => {
    const confirmed = window.confirm(
      '⚠️ Are you sure? This will permanently delete all transactions and reset your portfolio to $0. This action cannot be undone.'
    );
    
    if (!confirmed) return;

    setIsResetting(true);
    try {
      await resetDatabase();
      alert('✅ Database reset successfully! All data has been cleared.');
      window.location.reload(); // Reload to refresh all data
    } catch (error) {
      alert('❌ Error resetting database: ' + error.message);
    } finally {
      setIsResetting(false);
    }
  };

  const renderContent = () => {
    switch(activeTab) {
      case 'portfolio':
        return <PortfolioValue />;
      case 'prices':
        return <Prices />;
      case 'transactions':
        return <Transactions />;
      case 'trading':
        return <Trading />;
      case 'leverage':
        return <LeverageTrading />;
      case 'positions':
        return <Positions />;
      case 'analytics':
        return <Analytics />;
      case 'status':
        return <Status />;
      default:
        return <PortfolioValue />;
    }
  };

  return (
    <div className={`App ${themeClass}`}>
      <div className="app-background" aria-hidden="true">
        <span className="aurora aurora-a" />
        <span className="aurora aurora-b" />
        <span className="aurora aurora-c" />
        <span className="grid-overlay" />
      </div>

      <motion.header
        className="App-header"
        initial={{ opacity: 0, y: -18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: 'easeOut' }}
      >
        <div className="header-content shell-card">
          <div className="hero-copy">
            <p className="eyebrow">Private market cockpit</p>
            <h1>Portfolio Tracker</h1>
            <p className="hero-subtitle">
              A glass-style dashboard for prices, trading, leverage simulation, and API health.
            </p>
          </div>
          <div className="header-controls">
            <button
              className="reset-btn"
              onClick={handleReset}
              disabled={isResetting}
              title="Reset database and clear all data"
            >
              {isResetting ? '⏳ Resetting...' : '↺ Reset'}
            </button>
            <SettingsMenu />
          </div>
        </div>
      </motion.header>

      <main className="app-main">
        <motion.div
          className="tabs shell-card"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.05 }}
        >
          {tabs.map((tab) => (
            <motion.button
              key={tab.key}
              type="button"
              className={`tab ${activeTab === tab.key ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
            >
              <span className="tab-icon" aria-hidden="true">
                {tab.icon}
              </span>
              <span>{tab.label}</span>
            </motion.button>
          ))}
        </motion.div>

        <AnimatePresence mode="wait">
          <motion.section
            key={activeTab}
            className="content-stage"
            initial={{ opacity: 0, y: 16, filter: 'blur(8px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: 10, filter: 'blur(8px)' }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
          >
            {renderContent()}
          </motion.section>
        </AnimatePresence>
      </main>
    </div>
  );
}

export default App;