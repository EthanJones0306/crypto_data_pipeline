import React, { useState, useEffect } from 'react';
import { fetchPortfolioValue } from '../services/api';

function PortfolioValue() {
  const [portfolio, setPortfolio] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadPortfolio = async () => {
      try {
        const data = await fetchPortfolioValue();
        setPortfolio(data);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    loadPortfolio();
    // Refresh every 10 seconds
    const interval = setInterval(loadPortfolio, 10000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="portfolio-container">
      <h2>Total Portfolio Value</h2>
      <div className="total-value">
        ${portfolio?.total_portfolio_value?.toFixed(2)}
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