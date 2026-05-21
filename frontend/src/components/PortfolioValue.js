import React, { useState, useEffect } from 'react';
import { fetchPortfolioValue, fetchHealth } from '../services/api';
import StatCard from './StatCard';

function PortfolioValue() {
  const [portfolio, setPortfolio] = useState(null);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [portfolioData, healthData] = await Promise.all([
          fetchPortfolioValue(),
          fetchHealth()
        ]);
        setPortfolio(portfolioData);
        setHealth(healthData);
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

  // Calculate stats
  const totalAssets = portfolio?.holdings?.length || 0;
  const biggestHolding = portfolio?.holdings?.reduce((max, h) => 
    h.total_value > (max?.total_value || 0) ? h : max, null);
  const apiStatus = health?.status === 'healthy' ? 'Connected' : 'Disconnected';

  return (
    <div className="portfolio-container">
      <h2>Total Portfolio Value</h2>
      <div className="total-value">
        ${portfolio?.total_portfolio_value?.toFixed(2)}
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
          subtitle={`$${biggestHolding?.total_value?.toFixed(2)}`}
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
              <td>${holding.current_price}</td>
              <td>${holding.total_value?.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default PortfolioValue;