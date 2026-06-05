import React, { useState } from 'react';
import { buyCrypto, sellCrypto, buyStock, sellStock } from '../services/api';
import SearchBar from './SearchBar';
import { getDisplayName } from '../constants/assetNames';

function Trading() {
  const [asset, setAsset] = useState('');
  const [assetType, setAssetType] = useState('crypto');
  const [quantity, setQuantity] = useState('');
  const [type, setType] = useState('buy');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [inputMode, setInputMode] = useState('quantity'); // 'quantity' or 'amount'
  const [currency, setCurrency] = useState('USD');

  const handleTrade = async (e) => {
    e.preventDefault();
    
    if (!asset) {
      setMessage({ type: 'error', text: 'Please select an asset' });
      return;
    }
    
    if (!quantity || quantity <= 0 || isNaN(quantity)) {
      setMessage({ type: 'error', text: 'Enter a valid ' + (inputMode === 'quantity' ? 'quantity' : 'amount') });
      return;
    }

    setLoading(true);
    try {
      if (assetType === 'crypto') {
        if (type === 'buy') {
          if (inputMode === 'quantity') {
            await buyCrypto(asset, parseFloat(quantity));
          } else {
            await buyCrypto(asset, parseFloat(quantity), currency);
          }
        } else {
          await sellCrypto(asset, parseFloat(quantity));
        }
      } else {
          if (type === 'buy') {
            if (inputMode === 'quantity') {
              await buyStock(asset, parseFloat(quantity));
          } else {
              await buyStock(asset, parseFloat(quantity), currency);  // pass currency
          }
          } else {
            await sellStock(asset, parseFloat(quantity));
          }
      }

      setMessage({ 
        type: 'success', 
        text: `Successfully ${type === 'buy' ? 'bought' : 'sold'} ${inputMode === 'quantity' ? quantity + ' ' + getDisplayName(asset) : currency + ' ' + quantity + ' worth of ' + getDisplayName(asset)}!` 
      });
      setQuantity('');
      setAsset('');
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
    setLoading(false);
  };

  const handleAssetSelect = (selectedAsset) => {
    setAsset(selectedAsset);
  };

  return (
    <div className="portfolio-container">
      <h2>Trade Assets</h2>

      <form onSubmit={handleTrade} className="trade-form">
        <div className="trade-field">
          <label className="trade-label">Asset Type</label>
          <div className="trade-segmented">
            <button
              type="button"
              onClick={() => {
                setAssetType('crypto');
                setAsset('');
              }}
              className={`trade-option ${assetType === 'crypto' ? 'active' : ''}`}
            >
              💰 Crypto
            </button>
            <button
              type="button"
              onClick={() => {
                setAssetType('stocks');
                setAsset('');
              }}
              className={`trade-option ${assetType === 'stocks' ? 'active' : ''}`}
            >
              📈 Stocks
            </button>
          </div>
        </div>

        <div className="trade-field">
          <label className="trade-label">Search {assetType === 'crypto' ? 'Cryptocurrency' : 'Stock'}</label>
          <SearchBar
            assetType={assetType}
            onSelect={handleAssetSelect}
            placeholder={assetType === 'crypto' ? 'Search for crypto (e.g., Bitcoin, Ethereum)...' : 'Search for stock (e.g., AAPL, GOOG)...'}
          />
          {asset && (
            <div className="selected-asset">
              Selected: {getDisplayName(asset)}
            </div>
          )}
        </div>

        <div className="trade-field">
          <label className="trade-label">Type</label>
          <div className="trade-segmented">
            <button
              type="button"
              onClick={() => setType('buy')}
              className={`trade-option ${type === 'buy' ? 'active' : ''}`}
            >
              🟢 Buy
            </button>
            <button
              type="button"
              onClick={() => setType('sell')}
              className={`trade-option ${type === 'sell' ? 'active' : ''}`}
            >
              🔴 Sell
            </button>
          </div>
        </div>

        <div className="trade-field">
          <label className="trade-label">Input Mode</label>
          <div className="trade-segmented">
            <button
              type="button"
              onClick={() => setInputMode('quantity')}
              className={`trade-option ${inputMode === 'quantity' ? 'active' : ''}`}
            >
              📊 By Quantity
            </button>
            <button
              type="button"
              onClick={() => setInputMode('amount')}
              className={`trade-option ${inputMode === 'amount' ? 'active' : ''}`}
            >
              💵 By Amount
            </button>
          </div>
        </div>

        {inputMode === 'amount' && (
          <div className="trade-field">
            <label className="trade-label">Currency</label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="trade-input"
              style={{ cursor: 'pointer' }}
            >
              <option value="USD">USD</option>
              <option value="GBP">GBP</option>
              <option value="ZAR">ZAR</option>
            </select>
          </div>
        )}

        <div className="trade-field">
          <label className="trade-label">
            {inputMode === 'quantity' ? 'Quantity' : `Amount (${currency})`}
          </label>
          <input
            type="number"
            step={inputMode === 'quantity' ? "0.0001" : "0.01"}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder={inputMode === 'quantity' ? "Enter quantity" : `Enter amount in ${currency}`}
            className="trade-input"
          />
        </div>

        <button
          type="submit"
          disabled={loading || !asset}
          className={`primary-action ${type === 'buy' ? 'buy' : 'sell'}`}
        >
          {loading ? 'Processing...' : `${type.toUpperCase()} ${getDisplayName(asset)}`}
        </button>
      </form>

      {message && (
        <div className={`message-banner ${message.type}`}>
          {message.text}
        </div>
      )}
    </div>
  );
}

export default Trading;