import React, { useState, useEffect } from 'react';
import { fetchGainsLosses } from '../services/api';
import StatCard from './StatCard';

function Analytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await fetchGainsLosses();
        setData(response);
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

  const summary = data?.summary || {};
  const holdings = data?.holdings || [];
  const isPositive = summary.total_gains_losses >= 0;

  return (
    <div className="portfolio-container">
      <h2>Performance Analytics</h2>

      <div className="stats-grid">
        <StatCard
          label="Total Invested"
          value={`$${summary.total_invested?.toFixed(2)}`}
          icon="💰"
        />
        <StatCard
          label="Current Value"
          value={`$${summary.current_portfolio_value?.toFixed(2)}`}
          icon="📈"
        />
        <StatCard
          label="Unrealized Gains"
          value={`$${summary.total_unrealized_gains?.toFixed(2)}`}
          subtitle={`${summary.total_unrealized_gains >= 0 ? '+' : ''}${summary.total_unrealized_gains?.toFixed(2)}`}
          icon={summary.total_unrealized_gains >= 0 ? '🟢' : '🔴'}
        />
        <StatCard
          label="ROI"
          value={`${summary.roi_percent?.toFixed(2)}%`}
          icon={summary.roi_percent >= 0 ? '🚀' : '📉'}
        />
      </div>

      <div style={{
        backgroundColor: isPositive ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
        border: `2px solid ${isPositive ? '#10b981' : '#ef4444'}`,
        borderRadius: '12px',
        padding: '20px',
        marginTop: '30px',
        marginBottom: '30px'
      }}>
        <div style={{
          color: isPositive ? '#10b981' : '#ef4444',
          fontSize: '1.2em',
          fontWeight: '700',
          marginBottom: '8px'
        }}>
          {isPositive ? '🎉 ' : '⚠️ '} Total Gains/Losses
        </div>
        <div style={{
          color: isPositive ? '#10b981' : '#ef4444',
          fontSize: '2.5em',
          fontWeight: '700',
          fontFamily: 'Courier New, monospace'
        }}>
          {isPositive ? '+' : ''} ${summary.total_gains_losses?.toFixed(2)}
        </div>
      </div>

      <h3>Holdings Performance</h3>
      <table>
        <thead>
          <tr>
            <th>Asset</th>
            <th>Qty</th>
            <th>Entry Price</th>
            <th>Current Price</th>
            <th>Current Value</th>
            <th>Gain/Loss</th>
            <th>Return %</th>
          </tr>
        </thead>
        <tbody>
          {holdings.map((holding, idx) => (
            <tr key={idx}>
              <td style={{ fontWeight: '600' }}>{holding.asset}</td>
              <td>{holding.quantity}</td>
              <td>${holding.avg_entry_price?.toFixed(2)}</td>
              <td>${holding.current_price?.toFixed(2)}</td>
              <td>${holding.current_value?.toFixed(2)}</td>
              <td style={{
                color: holding.unrealized_gain >= 0 ? '#10b981' : '#ef4444',
                fontWeight: '600'
              }}>
                {holding.unrealized_gain >= 0 ? '+' : ''} ${holding.unrealized_gain?.toFixed(2)}
              </td>
              <td style={{
                color: holding.unrealized_gain_percent >= 0 ? '#10b981' : '#ef4444',
                fontWeight: '600'
              }}>
                {holding.unrealized_gain_percent >= 0 ? '+' : ''} {holding.unrealized_gain_percent?.toFixed(2)}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {holdings.length === 0 && (
        <div style={{ padding: '40px', textAlign: 'center', opacity: 0.6 }}>
          No holdings yet. Start trading to see performance analytics.
        </div>
      )}
    </div>
  );
}

export default Analytics;
