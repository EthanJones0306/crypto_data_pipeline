import React, { useState, useEffect } from 'react';
import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';
import { fetchGainsLosses } from '../services/api';
import StatCard from './StatCard';

function Analytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const response = await fetchGainsLosses();
      setData(response);
      setError(null);
    } catch (err) {
      setError('Failed to load analytics data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="analytics-loading">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          style={{ fontSize: '2.5em' }}
        >
          ◉
        </motion.div>
        <p>Analyzing portfolio...</p>
      </div>
    );
  }

  if (error || data?.status === 'error') {
    return (
      <div className="analytics-error">
        <h3>⚠️ Unable to Load Analytics</h3>
        <p>{error || data?.message}</p>
        <button onClick={loadData} className="retry-btn">Retry</button>
      </div>
    );
  }

  const summary = data?.summary || {};
  const holdings = data?.holdings || [];
  
  const isPositive = summary.total_gains_losses >= 0;
  const isGain = summary.total_gains_losses > 0;

  // Prepare data for charts
  const holdingsForChart = holdings.sort((a, b) => Math.abs(b.unrealized_gain) - Math.abs(a.unrealized_gain));
  const gainsLossesData = holdingsForChart.map(h => ({
    asset: h.asset,
    gain: h.unrealized_gain > 0 ? h.unrealized_gain : 0,
    loss: h.unrealized_gain < 0 ? Math.abs(h.unrealized_gain) : 0,
    total: h.unrealized_gain
  }));
  
  const pieData = holdings.map(h => ({
    name: h.asset,
    value: parseFloat(h.current_value.toFixed(2))
  })).filter(item => item.value > 0);

  const COLORS = ['#4aa8e0', '#17b89a', '#fcb900', '#ff6b6b', '#a78bfa', '#06b6d4', '#ec4899'];

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="analytics-tooltip">
          <p className="tooltip-label">{label || payload[0].payload.name}</p>
          <p className="tooltip-value">${payload[0].value?.toFixed(2)}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <motion.div
      className="portfolio-container analytics-container"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <div className="analytics-header">
        <h2>💼 Performance Analytics</h2>
        <button onClick={loadData} className="refresh-btn" title="Refresh data">↻</button>
      </div>

      {/* Summary Stats */}
      <div className="stats-grid">
        <StatCard
          label="Total Invested"
          value={`$${summary.total_invested?.toFixed(2)}`}
          icon="💰"
        />
        <StatCard
          label="Current Value"
          value={`$${summary.current_portfolio_value?.toFixed(2)}`}
          icon="📊"
        />
        <StatCard
          label="Unrealized Gains"
          value={`$${Math.abs(summary.total_unrealized_gains || 0)?.toFixed(2)}`}
          subtitle={`${summary.total_unrealized_gains >= 0 ? '+' : '-'}${Math.abs(summary.total_unrealized_gains || 0)?.toFixed(2)}`}
          icon={summary.total_unrealized_gains >= 0 ? '📈' : '📉'}
        />
        <StatCard
          label="ROI"
          value={`${summary.roi_percent?.toFixed(2)}%`}
          icon={summary.roi_percent >= 0 ? '🚀' : '⚠️'}
        />
      </div>

      {/* Total Gains/Losses Highlight */}
      <motion.div
        className={`analytics-highlight ${isPositive ? 'gain-highlight' : 'loss-highlight'}`}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <div className="highlight-label">
          {isGain ? '🎉 Total Gains' : isPositive ? '💤 Neutral' : '⚠️ Total Losses'}
        </div>
        <div className="highlight-value">
          {isPositive ? '+' : ''} ${summary.total_gains_losses?.toFixed(2)}
        </div>
        <div className="highlight-percent">
          {isPositive ? '+' : ''} {summary.roi_percent?.toFixed(2)}% return
        </div>
      </motion.div>

      {/* Charts Section */}
      <div className="analytics-charts">
        {/* Holdings by Value - Pie Chart */}
        <motion.div
          className="chart-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <h3>📍 Portfolio Allocation</h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={320}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => `$${value.toFixed(2)}`}
                  contentStyle={{
                    background: 'rgba(20, 30, 48, 0.95)',
                    border: '1px solid rgba(74, 168, 224, 0.3)',
                    borderRadius: '8px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-chart">No holdings to display</div>
          )}
        </motion.div>

        {/* Gains/Losses by Asset - Bar Chart */}
        <motion.div
          className="chart-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <h3>📊 Gains/Losses by Asset</h3>
          {gainsLossesData.length > 0 ? (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={gainsLossesData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(74, 168, 224, 0.2)" />
                <XAxis dataKey="asset" stroke="#c8d8e8" />
                <YAxis stroke="#c8d8e8" />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar dataKey="gain" fill="#17b89a" name="Gains" radius={[8, 8, 0, 0]} />
                <Bar dataKey="loss" fill="#c0444b" name="Losses" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-chart">No data to display</div>
          )}
        </motion.div>
      </div>

      {/* Holdings Table */}
      <motion.div
        className="holdings-section"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.4 }}
      >
        <h3>📋 Holdings Detail</h3>
        {holdings.length > 0 ? (
          <div className="table-wrapper">
            <table className="analytics-table">
              <thead>
                <tr>
                  <th>Asset</th>
                  <th>Quantity</th>
                  <th>Entry Price</th>
                  <th>Current Price</th>
                  <th>Current Value</th>
                  <th>Gain/Loss ($)</th>
                  <th>Return (%)</th>
                </tr>
              </thead>
              <tbody>
                {holdings.map((holding, idx) => (
                  <motion.tr
                    key={idx}
                    className={holding.unrealized_gain >= 0 ? 'gain-row' : 'loss-row'}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + idx * 0.05 }}
                  >
                    <td className="asset-name">{holding.asset}</td>
                    <td>{holding.quantity.toFixed(4)}</td>
                    <td>${holding.avg_entry_price?.toFixed(2)}</td>
                    <td>${holding.current_price?.toFixed(2)}</td>
                    <td>${holding.current_value?.toFixed(2)}</td>
                    <td className={holding.unrealized_gain >= 0 ? 'gain-value' : 'loss-value'}>
                      {holding.unrealized_gain >= 0 ? '+' : ''}${holding.unrealized_gain?.toFixed(2)}
                    </td>
                    <td className={holding.unrealized_gain_percent >= 0 ? 'gain-value' : 'loss-value'}>
                      {holding.unrealized_gain_percent >= 0 ? '+' : ''}{holding.unrealized_gain_percent?.toFixed(2)}%
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-section">
            <p>No holdings yet. Start trading to see performance analytics.</p>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

export default Analytics;
