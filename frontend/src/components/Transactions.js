import React, { useState, useEffect } from 'react';
import { fetchTransactions } from '../services/api';

function Transactions() {
  const [transactions, setTransactions] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadTransactions = async () => {
      try {
        const data = await fetchTransactions();
        setTransactions(data);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    loadTransactions();
  }, []);

  if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading...</div>;
  if (error) return <div style={{ padding: '40px', color: '#ef4444' }}>Error: {error}</div>;

  return (
    <div className="portfolio-container">
      <h2>Transaction History</h2>
      
      <table>
        <thead>
          <tr>
            <th>Asset</th>
            <th>Type</th>
            <th>Quantity</th>
            <th>Price</th>
            <th>Total Value</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          {transactions?.transactions?.map((tx, idx) => (
            <tr key={idx}>
              <td style={{ fontWeight: 600 }}>{tx.asset}</td>
              <td>
                <span style={{
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: '0.9em',
                  fontWeight: 600,
                  backgroundColor: tx.type === 'BUY' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                  color: tx.type === 'BUY' ? '#10b981' : '#ef4444'
                }}>
                  {tx.type}
                </span>
              </td>
              <td>{tx.quantity}</td>
              <td>${tx.price?.toFixed(2)}</td>
              <td>${(tx.quantity * tx.price)?.toFixed(2)}</td>
              <td style={{ fontSize: '0.9em', opacity: 0.8 }}>{tx.timestamp}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {(!transactions?.transactions || transactions.transactions.length === 0) && (
        <div style={{ padding: '40px', textAlign: 'center', opacity: 0.6 }}>
          No transactions yet
        </div>
      )}
    </div>
  );
}

export default Transactions;