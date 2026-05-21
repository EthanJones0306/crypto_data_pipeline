import React, { useState, useEffect } from 'react';
import './App.css';
import PortfolioValue from './components/PortfolioValue';
import Prices from './components/Prices';
import Transactions from './components/Transactions';
import Trading from './components/Trading';

function App() {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [activeTab, setActiveTab] = useState('portfolio');

  // Save preference to localStorage
  useEffect(() => {
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  // Load preference on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
      setIsDarkMode(false);
    }
  }, []);

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
      default:
        return <PortfolioValue />;
    }
  };

  return (
    <div className={`App ${isDarkMode ? 'dark-mode' : 'light-mode'}`}>
      <header className="App-header">
        <div className="header-content">
          <h1>Portfolio Tracker</h1>
          <button 
            className="theme-toggle"
            onClick={() => setIsDarkMode(!isDarkMode)}
            title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDarkMode ? '☀️' : '🌙'}
          </button>
        </div>
      </header>
      <main>
        <div className="tabs">
          <button 
            className={`tab ${activeTab === 'portfolio' ? 'active' : ''}`}
            onClick={() => setActiveTab('portfolio')}
          >
            📊 Portfolio
          </button>
          <button 
            className={`tab ${activeTab === 'prices' ? 'active' : ''}`}
            onClick={() => setActiveTab('prices')}
          >
            💹 Prices
          </button>
          <button 
            className={`tab ${activeTab === 'transactions' ? 'active' : ''}`}
            onClick={() => setActiveTab('transactions')}
          >
            📝 Transactions
          </button>
          <button 
            className={`tab ${activeTab === 'trading' ? 'active' : ''}`}
            onClick={() => setActiveTab('trading')}
          >
            💱 Trading
          </button>
        </div>
        {renderContent()}
      </main>
    </div>
  );
}

export default App;