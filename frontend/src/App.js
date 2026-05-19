import React from 'react';
import './App.css';
import PortfolioValue from './components/PortfolioValue';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>Portfolio Tracker</h1>
      </header>
      <main>
        <PortfolioValue />
      </main>
    </div>
  );
}

export default App;