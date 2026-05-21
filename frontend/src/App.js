import React, { useState, useEffect } from 'react';
import './App.css';
import PortfolioValue from './components/PortfolioValue';

function App() {
  const [isDarkMode, setIsDarkMode] = useState(true);

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
        <PortfolioValue />
      </main>
    </div>
  );
}

export default App;