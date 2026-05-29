import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';
import { fetchPortfolioValue } from '../services/api';

function PortfolioDonutChart() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeIndex, setActiveIndex] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetchPortfolioValue();
      
      if (response.holdings && response.holdings.length > 0) {
        const chartData = response.holdings
          .map(holding => ({
            name: holding.asset,
            value: parseFloat(holding.total_value) || 0
          }))
          .filter(item => item.value > 0);
        
        setData(chartData);
      }
      setError(null);
    } catch (err) {
      setError('Failed to load portfolio data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Premium gradient color palette
  const COLORS = [
    { main: '#4aa8e0', glow: 'rgba(74, 168, 224, 0.3)' },
    { main: '#17b89a', glow: 'rgba(23, 184, 154, 0.3)' },
    { main: '#fcb900', glow: 'rgba(252, 185, 0, 0.3)' },
    { main: '#ff6b6b', glow: 'rgba(255, 107, 107, 0.3)' },
    { main: '#a78bfa', glow: 'rgba(167, 139, 250, 0.3)' },
    { main: '#06b6d4', glow: 'rgba(6, 182, 212, 0.3)' },
    { main: '#ec4899', glow: 'rgba(236, 72, 153, 0.3)' },
  ];

  const renderCustomLabel = ({ name, value, percent }) => {
    return `${(percent * 100).toFixed(1)}%`;
  };

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="chart-tooltip"
        >
          <p className="tooltip-asset">{payload[0].payload.name}</p>
          <p className="tooltip-value">${payload[0].value.toFixed(2)}</p>
        </motion.div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="chart-container loading">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          style={{ fontSize: '2em' }}
        >
          ◉
        </motion.div>
      </div>
    );
  }

  if (error) {
    return <div className="chart-container error">{error}</div>;
  }

  if (data.length === 0) {
    return <div className="chart-container empty">No holdings to display</div>;
  }

  const totalValue = data.reduce((sum, item) => sum + item.value, 0);
  const activeValue = activeIndex !== null ? data[activeIndex]?.value : null;

  return (
    <motion.div
      className="chart-container premium-donut"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
    >
      <div className="chart-header">
        <h3>💰 Portfolio Allocation</h3>
        <button onClick={fetchData} className="chart-refresh" title="Refresh data">↻</button>
      </div>

      <div className="chart-wrapper-premium">
        <div className="chart-glow-rings">
          <div className="glow-ring-outer"></div>
          <div className="glow-ring-middle"></div>
          <div className="glow-ring-inner"></div>
        </div>

        <ResponsiveContainer width="100%" height={560}>
          <PieChart>
            <defs>
              {COLORS.map((color, idx) => (
                <radialGradient key={`gradient-${idx}`} id={`gradient-${idx}`}>
                  <stop offset="0%" stopColor={color.main} stopOpacity={0.9} />
                  <stop offset="100%" stopColor={color.main} stopOpacity={0.7} />
                </radialGradient>
              ))}
            </defs>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={130}
              outerRadius={200}
              paddingAngle={3}
              dataKey="value"
              label={renderCustomLabel}
              labelLine={false}
              onMouseEnter={(_, index) => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={`url(#gradient-${index})`}
                  opacity={activeIndex === null || activeIndex === index ? 1 : 0.3}
                  style={{ transition: 'opacity 0.2s ease' }}
                  stroke={COLORS[index % COLORS.length].main}
                  strokeWidth={2}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>

        <div className="chart-center-display">
          <motion.div
            key={`center-${activeValue}`}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
            className="center-content"
          >
            <div className="center-label">{activeIndex !== null ? 'Asset Value' : 'Total Portfolio'}</div>
            <div className="center-value">
              ${(activeValue || totalValue).toFixed(2)}
            </div>
          </motion.div>
        </div>
      </div>

      <div className="chart-legend-premium">
        {data.map((item, index) => (
          <motion.div
            key={`legend-${index}`}
            className="legend-item"
            onMouseEnter={() => setActiveIndex(index)}
            onMouseLeave={() => setActiveIndex(null)}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
          >
            <div
              className="legend-color"
              style={{
                background: `linear-gradient(135deg, ${COLORS[index % COLORS.length].main}, ${COLORS[index % COLORS.length].main}dd)`,
                boxShadow: `0 0 16px ${COLORS[index % COLORS.length].glow}`,
              }}
            />
            <div className="legend-info">
              <div className="legend-name">{item.name}</div>
              <div className="legend-percent">
                ${item.value.toFixed(2)} • {((item.value / totalValue) * 100).toFixed(1)}%
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

export default PortfolioDonutChart;
