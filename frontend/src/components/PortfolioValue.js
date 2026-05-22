import React, { useState, useEffect } from 'react';
import { fetchPortfolioValue, fetchHealth, fetchExchangeRates } from '../services/api';
import StatCard from './StatCard';
import PortfolioDonutChart from './PortfolioDonutChart';

function PortfolioValue() {
  const [portfolio, setPortfolio] = useState(null);
  const [health, setHealth] = useState(null);
  const [exchangeRates, setExchangeRates] = useState(null);
  const [currency, setCurrency] = useState(() => {
    return localStorage.getItem('selectedCurrency') || 'USD';
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    localStorage.setItem('selectedCurrency', currency);
  }, [currency]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [portfolioData, healthData, ratesData] = await Promise.all([
          fetchPortfolioValue(),
          fetchHealth(),
          fetchExchangeRates()
        ]);
        setPortfolio(portfolioData);
        setHealth(healthData);
        setExchangeRates(ratesData);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    loadData();
  }, []);

  if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading...</div>;
  if (error) return <div style={{ padding: '40px', color: '#ef4444' }}>Error: {error}</div>;

  // Get exchange rate for selected currency
  const rate = exchangeRates?.rates?.[currency] || 1;
  
  // Convert values
  const convertValue = (value) => value * rate;
  const formatCurrency = (value) => {
    const symbols = { USD: '$', EUR: '€', GBP: '£', ZAR: 'R' };
    return `${symbols[currency]}${convertValue(value).toFixed(2)}`;
  };

  // Calculate stats
  const totalAssets = portfolio?.holdings?.length || 0;
  const biggestHolding = portfolio?.holdings?.reduce((max, h) => 
    h.total_value > (max?.total_value || 0) ? h : max, null);
  const apiStatus = health?.status === 'healthy' ? 'Connected' : 'Disconnected';

  return (
    <div className="portfolio-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>Total Portfolio Value</h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          {['USD', 'EUR', 'GBP', 'ZAR'].map(c => (
            <button
              key={c}
              onClick={() => setCurrency(c)}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: currency === c ? '2px solid #60a5fa' : '1px solid #475569',
                backgroundColor: currency === c ? 'rgba(96, 165, 250, 0.1)' : 'transparent',
                color: currency === c ? '#60a5fa' : '#94a3b8',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s'
              }}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="total-value">
        {formatCurrency(portfolio?.total_portfolio_value)}
      </div>
      
      <div className="stats-grid">
        <StatCard 
          label="Total Assets" 
          value={totalAssets}
          icon="📦"
        />
        <StatCard 
          label="Biggest Holding" 
          value={biggestHolding?.asset}
          subtitle={formatCurrency(biggestHolding?.total_value)}
          icon="🏆"
        />
        <StatCard 
          label="API Status" 
          value={apiStatus}
          subtitle={`${health?.transactions_stored} transactions`}
          icon="🟢"
        />
        <StatCard 
          label="Assets Tracked" 
          value={`${portfolio?.holdings?.length}`}
          subtitle="Different positions"
          icon="📊"
        />
      </div>
      
      <PortfolioDonutChart />
      
      <h3>Holdings Breakdown</h3>
      <table>
        <thead>
          <tr>
            <th>Asset</th>
            <th>Quantity</th>
            <th>Price</th>
            <th>Value</th>
          </tr>
        </thead>
        <tbody>
          {portfolio?.holdings?.map((holding, idx) => (
            <tr key={idx}>
              <td>{holding.asset}</td>
              <td>{holding.quantity}</td>
              <td>{formatCurrency(holding.current_price)}</td>
              <td>{formatCurrency(holding.total_value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default PortfolioValue;