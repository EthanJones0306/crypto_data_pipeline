import React, { useState } from 'react';
import { buyCrypto, sellCrypto, buyStock, sellStock } from '../services/api';
import { getDisplayName } from '../constants/assetNames';

function Trading() {
  const [asset, setAsset] = useState('bitcoin');
  const [quantity, setQuantity] = useState('');
  const [type, setType] = useState('buy');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const cryptoAssets = ['bitcoin', 'ethereum', 'solana'];
  const stockAssets = ['AAPL', 'GOOG', 'NVDA'];

  const handleTrade = async (e) => {
    e.preventDefault();
    if (!quantity || quantity <= 0 || isNaN(quantity)) {
      setMessage({ type: 'error', text: 'Enter a valid quantity' });
      return;
    }

    setLoading(true);
    try {
      if (cryptoAssets.includes(asset)) {
        if (type === 'buy') {
          await buyCrypto(asset, parseFloat(quantity));
        } else {
          await sellCrypto(asset, parseFloat(quantity));
        }
      } else {
        if (type === 'buy') {
          await buyStock(asset, parseFloat(quantity));
        } else {
          await sellStock(asset, parseFloat(quantity));
        }
      }

      setMessage({ 
        type: 'success', 
        text: `Successfully ${type === 'buy' ? 'bought' : 'sold'} ${quantity} ${getDisplayName(asset)}!` 
      });
      setQuantity('');
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
    setLoading(false);
  };

  return (
    <div className="portfolio-container">
      <h2>Trade Assets</h2>

      <form onSubmit={handleTrade} style={{ maxWidth: '400px', margin: '30px 0' }}>
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
            Select Asset
          </label>
          <select 
            value={asset} 
            onChange={(e) => setAsset(e.target.value)}
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: '8px',
              border: '1px solid #475569',
              fontSize: '1em'
            }}
          >
            <optgroup label="Cryptocurrencies">
              {cryptoAssets.map(a => (
                <option key={a} value={a}>{getDisplayName(a)}</option>
              ))}
            </optgroup>
            <optgroup label="Stocks">
              {stockAssets.map(a => (
                <option key={a} value={a}>{getDisplayName(a)}</option>
              ))}
            </optgroup>
          </select>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
            Type
          </label>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={() => setType('buy')}
              style={{
                flex: 1,
                padding: '10px',
                borderRadius: '8px',
                border: type === 'buy' ? '2px solid #10b981' : '1px solid #475569',
                backgroundColor: type === 'buy' ? 'rgba(16, 185, 129, 0.1)' : 'transparent',
                color: type === 'buy' ? '#10b981' : '#94a3b8',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              🟢 Buy
            </button>
            <button
              type="button"
              onClick={() => setType('sell')}
              style={{
                flex: 1,
                padding: '10px',
                borderRadius: '8px',
                border: type === 'sell' ? '2px solid #ef4444' : '1px solid #475569',
                backgroundColor: type === 'sell' ? 'rgba(239, 68, 68, 0.1)' : 'transparent',
                color: type === 'sell' ? '#ef4444' : '#94a3b8',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              🔴 Sell
            </button>
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>
            Quantity
          </label>
          <input
            type="number"
            step="0.0001"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="Enter amount"
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: '8px',
              border: '1px solid #475569',
              fontSize: '1em'
            }}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            padding: '12px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: type === 'buy' ? '#10b981' : '#ef4444',
            color: 'white',
            fontWeight: '600',
            fontSize: '1em',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1
          }}
        >
          {loading ? 'Processing...' : `${type.toUpperCase()} ${getDisplayName(asset)}`}
        </button>
      </form>

      {message && (
        <div style={{
          padding: '15px',
          borderRadius: '8px',
          marginTop: '20px',
          backgroundColor: message.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          color: message.type === 'success' ? '#10b981' : '#ef4444',
          border: `1px solid ${message.type === 'success' ? '#10b981' : '#ef4444'}`
        }}>
          {message.text}
        </div>
      )}
    </div>
  );
}

export default Trading;