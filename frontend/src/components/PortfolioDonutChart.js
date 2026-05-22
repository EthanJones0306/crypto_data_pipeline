import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from 'recharts';
import { fetchPortfolioValue } from '../services/api';

function PortfolioDonutChart() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetchPortfolioValue();
      
      if (response.holdings && response.holdings.length > 0) {
        // Format data for the donut chart
        const chartData = response.holdings.map(holding => ({
          name: holding.asset,
          value: parseFloat(holding.value_usd) || 0
        }));
        
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

  // Generate colors based on the semantic palette
  const COLORS = [
    '#17b89a', // profit-green
    '#4aa8e0', // data-blue
    '#f0c040', // gold-signal
    '#0e7c6b', // emerald-tide
    '#162534', // midnight-slate
    '#c0444b', // loss-red
    '#1e3448', // ocean-floor
  ];

  const renderCustomLabel = ({ name, value, percent }) => {
    return `${(percent * 100).toFixed(0)}%`;
  };

  if (loading) {
    return <div className="chart-container loading">Loading portfolio chart...</div>;
  }

  if (error) {
    return <div className="chart-container error">{error}</div>;
  }

  if (data.length === 0) {
    return <div className="chart-container empty">No holdings to display</div>;
  }

  const totalValue = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="chart-container">
      <h3>💰 Portfolio Allocation</h3>
      <div className="chart-wrapper">
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={2}
              dataKey="value"
              label={renderCustomLabel}
              labelLine={false}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) => `$${value.toFixed(2)}`}
              contentStyle={{
                backgroundColor: 'rgba(15, 25, 35, 0.95)',
                border: '1px solid #1e3448',
                borderRadius: '8px',
                color: '#c8d8e8',
              }}
            />
            <Legend 
              verticalAlign="bottom"
              height={36}
              formatter={(value, entry) => {
                if (!entry || entry.index === undefined) return value;
                const item = data[entry.index];
                if (!item) return value;
                return `${item.name} - $${item.value.toFixed(2)}`;
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="chart-summary">
        <p className="total-portfolio">
          Total Portfolio Value: <span className="highlight">${totalValue.toFixed(2)}</span>
        </p>
      </div>
    </div>
  );
}

export default PortfolioDonutChart;
