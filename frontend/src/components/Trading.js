import React, { useState } from 'react';
import { buyCrypto, sellCrypto, buyStock, sellStock, fetchPrices, simulateOrder, getLiquidationPrice } from '../services/api';
import SearchBar from './SearchBar';
import { getDisplayName } from '../constants/assetNames';

function Trading() {
  const [asset, setAsset] = useState('');
  const [assetType, setAssetType] = useState('crypto');
  const [quantity, setQuantity] = useState('');
  const [type, setType] = useState('buy');
  const [leverage, setLeverage] = useState(2);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [liquidationPrice, setLiquidationPrice] = useState(null);

  const handleTrade = async (e) => {
    e.preventDefault();
    
    if (!asset) {
      setMessage({ type: 'error', text: 'Please select an asset' });
      return;
    }
    
    if (!quantity || quantity <= 0 || isNaN(quantity)) {
      setMessage({ type: 'error', text: 'Enter a valid quantity' });
      return;
    }

    setLoading(true);
    try {
      const isPaper = typeof window !== 'undefined' && window.localStorage.getItem('paper_mode') === 'true';
      if (isPaper) {
        // use simulation endpoint
        const side = type === 'buy' ? 'long' : 'short';
        await simulateOrder({ asset, quantity: parseFloat(quantity), side, leverage, asset_type: assetType === 'crypto' ? 'crypto' : 'stock' });
      } else {
        if (assetType === 'crypto') {
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
      }

      setMessage({ 
        type: 'success', 
        text: `Successfully ${type === 'buy' ? 'bought' : 'sold'} ${quantity} ${getDisplayName(asset)}!` 
      });
      setQuantity('');
      setAsset('');
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
    setLoading(false);
  };

  const handleSimulate = async () => {
    if (!asset) return setMessage({ type: 'error', text: 'Select an asset first' });
    try {
      const prices = await fetchPrices();
      let entryPrice = 0;
      if (assetType === 'crypto') {
        entryPrice = prices.crypto_prices[asset] || prices.crypto_prices[asset.toLowerCase()];
      } else {
        entryPrice = prices.stock_prices[asset] || prices.stock_prices[asset.toUpperCase()];
      }
      if (!entryPrice) return setMessage({ type: 'error', text: 'Unable to fetch current price for this asset' });
      const side = type === 'buy' ? 'long' : 'short';
      const resp = await getLiquidationPrice({ entry_price: entryPrice, side, leverage });
      if (resp.status === 'success') {
        setLiquidationPrice(resp.liquidation_price);
        setMessage({ type: 'success', text: `Liquidation price: ${resp.liquidation_price.toFixed(4)}` });
      } else {
        setMessage({ type: 'error', text: resp.message || 'Failed to compute liquidation price' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
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
          <label className="trade-label">Quantity</label>
          <input
            type="number"
            step="0.0001"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="Enter amount"
            className="trade-input"
          />
        </div>

        <div className="trade-field">
          <label className="trade-label">Leverage</label>
          <input
            type="number"
            min="1"
            step="0.1"
            value={leverage}
            onChange={(e) => setLeverage(parseFloat(e.target.value))}
            className="trade-input"
          />
        </div>

        <div className="trade-actions">
          <button type="button" onClick={handleSimulate} className="secondary-action">
            Simulate Liquidation Price
          </button>
        </div>

        {liquidationPrice && (
          <div className="message-banner">
            Estimated liquidation price: {liquidationPrice.toFixed(4)}
          </div>
        )}

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