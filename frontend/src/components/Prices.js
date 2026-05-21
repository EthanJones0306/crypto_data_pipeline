import React, { useState, useEffect } from 'react';
import { fetchPrices } from '../services/api';

function Prices() {
  const [prices, setPrices] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadPrices = async () => {
      try {
        const data = await fetchPrices();
        setPrices(data);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    loadPrices();
  }, []);

  if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading...</div>;
  if (error) return <div style={{ padding: '40px', color: '#ef4444' }}>Error: {error}</div>;

  return (
    <div className="portfolio-container">
      <h2>Current Prices</h2>
      
      <h3>Cryptocurrencies</h3>
      <table>
        <thead>
          <tr>
            <th>Asset</th>
            <th>Price (USD)</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(prices?.crypto_prices || {}).map(([coin, price]) => (
            <tr key={coin}>
              <td style={{ textTransform: 'capitalize' }}>{coin}</td>
              <td>${price?.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3 style={{ marginTop: '40px' }}>Stocks</h3>
      <table>
        <thead>
          <tr>
            <th>Symbol</th>
            <th>Price (USD)</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(prices?.stock_prices || {}).map(([symbol, price]) => (
            <tr key={symbol}>
              <td>{symbol}</td>
              <td>${price?.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ marginTop: '20px', opacity: 0.6, fontSize: '0.9em' }}>
        Last updated: {new Date(prices?.timestamp).toLocaleString()}
      </div>
    </div>
  );
}

export default Prices;