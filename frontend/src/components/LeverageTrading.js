import React, { useState } from 'react';
import { fetchPrices, simulateOrder, getLiquidationPrice } from '../services/api';
import SearchBar from './SearchBar';
import { getDisplayName } from '../constants/assetNames';

export default function LeverageTrading() {
  const [asset, setAsset] = useState('');
  const [assetType, setAssetType] = useState('crypto');
  const [quantity, setQuantity] = useState('');
  const [side, setSide] = useState('long');
  const [leverage, setLeverage] = useState(2);
  const [message, setMessage] = useState(null);
  const [liqPrice, setLiqPrice] = useState(null);
  const [simResult, setSimResult] = useState(null);

  const handleSelect = (a) => setAsset(a);

  const handleSimulate = async () => {
    setMessage(null);
    setSimResult(null);
    try {
      const prices = await fetchPrices();
      let entry = 0;
      if (assetType === 'crypto') entry = prices.crypto_prices[asset] || prices.crypto_prices[asset?.toLowerCase()];
      else entry = prices.stock_prices[asset] || prices.stock_prices[asset?.toUpperCase()];

      if (!entry) return setMessage({ type: 'error', text: 'Unable to fetch current price' });

      const liqResp = await getLiquidationPrice({ entry_price: entry, side, leverage });
      if (liqResp.status === 'success') {
        setLiqPrice(liqResp.liquidation_price);
        setMessage({ type: 'success', text: `Liquidation price: ${liqResp.liquidation_price}` });
      } else {
        setMessage({ type: 'error', text: liqResp.message || 'Failed to compute liquidation price' });
      }
    } catch (e) {
      setMessage({ type: 'error', text: e.message });
    }
  };

  const handleOpen = async () => {
    setMessage(null);
    setSimResult(null);
    try {
      const qty = parseFloat(quantity);
      if (!asset || !qty || qty <= 0) return setMessage({ type: 'error', text: 'Select asset and valid quantity' });
      const resp = await simulateOrder({ asset, quantity: qty, side, leverage, asset_type: assetType });
      if (resp.status === 'success') {
        setSimResult(resp.result);
        setLiqPrice(resp.result.liquidation_price);
        setMessage({ type: 'success', text: `Position opened at ${resp.result.filled_price.toFixed(4)}` });
      } else {
        setMessage({ type: 'error', text: resp.message || 'Simulation failed' });
      }
    } catch (e) {
      setMessage({ type: 'error', text: e.message });
    }
  };

  return (
    <div className="portfolio-container">
      <h2>Leverage Simulator</h2>

      <div className="trade-form">
        <div className="trade-field">
          <label className="trade-label">Type</label>
          <div className="trade-segmented">
            <button onClick={() => setAssetType('crypto')} className={`trade-option ${assetType === 'crypto' ? 'active' : ''}`}>Crypto</button>
            <button onClick={() => setAssetType('stock')} className={`trade-option ${assetType === 'stock' ? 'active' : ''}`}>Stock</button>
          </div>
        </div>

        <div className="trade-field">
          <label className="trade-label">Search</label>
          <SearchBar assetType={assetType === 'crypto' ? 'crypto' : 'stocks'} onSelect={handleSelect} />
          {asset && <div className="selected-asset">Selected: {getDisplayName(asset)}</div>}
        </div>

        <div className="trade-field">
          <label className="trade-label">Quantity</label>
          <input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} className="trade-input" />
        </div>

        <div className="trade-field">
          <label className="trade-label">Side</label>
          <div className="trade-segmented">
            <button onClick={() => setSide('long')} className={`trade-option ${side === 'long' ? 'active' : ''}`}>Long</button>
            <button onClick={() => setSide('short')} className={`trade-option ${side === 'short' ? 'active' : ''}`}>Short</button>
          </div>
        </div>

        <div className="trade-field">
          <label className="trade-label">Leverage</label>
          <input type="number" min="1" step="0.1" value={leverage} onChange={e => setLeverage(parseFloat(e.target.value))} className="trade-input" />
        </div>

        <div className="trade-actions">
          <button onClick={handleSimulate} className="secondary-action">Simulate Liquidation</button>
          <button onClick={handleOpen} className="primary-action buy">Open Simulated Position</button>
        </div>

        {message && (
          <div className={`message-banner ${message.type}`}>
            {message.text}
          </div>
        )}

        {simResult && (
          <div className="result-panel">
            <div style={{ marginBottom: '12px', fontWeight: '600' }}>Position Details:</div>
            <div style={{ display: 'grid', gap: '8px', fontSize: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--stroke)', paddingBottom: '8px' }}>
                <span>Entry Price (Current):</span>
                <span style={{ color: 'var(--accent-2)', fontFamily: 'IBM Plex Mono' }}>${simResult.filled_price?.toFixed(4)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--stroke)', paddingBottom: '8px' }}>
                <span>Liquidation Price:</span>
                <span style={{ color: 'var(--danger)', fontFamily: 'IBM Plex Mono' }}>${simResult.liquidation_price?.toFixed(4)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--stroke)', paddingBottom: '8px' }}>
                <span>Required Margin:</span>
                <span style={{ color: 'var(--muted)', fontFamily: 'IBM Plex Mono' }}>${simResult.required_margin?.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--stroke)', paddingBottom: '8px' }}>
                <span>Position Value:</span>
                <span style={{ color: 'var(--accent)', fontFamily: 'IBM Plex Mono' }}>${simResult.position_value?.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px' }}>
                <span>Qty Controlled:</span>
                <span style={{ color: 'var(--accent)', fontFamily: 'IBM Plex Mono' }}>{simResult.actual_quantity?.toFixed(4)}</span>
              </div>
            </div>
          </div>
        )}

        {liqPrice && (
          <div className="message-banner">
            Liquidation price: {liqPrice.toFixed(4)}
          </div>
        )}

      </div>
    </div>
  );
}
