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
    try {
      const qty = parseFloat(quantity);
      if (!asset || !qty || qty <= 0) return setMessage({ type: 'error', text: 'Select asset and valid quantity' });
      const resp = await simulateOrder({ asset, quantity: qty, side, leverage, asset_type: assetType });
      if (resp.status === 'success') {
        setSimResult(resp.result);
        setMessage({ type: 'success', text: 'Simulated position opened' });
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

      <div style={{ maxWidth: 600 }}>
        <label style={{ display: 'block', margin: '10px 0', fontWeight: 600 }}>Type</label>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <button onClick={() => setAssetType('crypto')} style={{ flex: 1 }}>Crypto</button>
          <button onClick={() => setAssetType('stock')} style={{ flex: 1 }}>Stock</button>
        </div>

        <label style={{ display: 'block', margin: '10px 0', fontWeight: 600 }}>Search</label>
        <SearchBar assetType={assetType === 'crypto' ? 'crypto' : 'stocks'} onSelect={handleSelect} />
        {asset && <div style={{ marginTop: 8 }}>Selected: {getDisplayName(asset)}</div>}

        <label style={{ display: 'block', margin: '10px 0', fontWeight: 600 }}>Quantity</label>
        <input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} style={{ width: '100%', padding: 8, borderRadius: 6 }} />

        <label style={{ display: 'block', margin: '10px 0', fontWeight: 600 }}>Side</label>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <button onClick={() => setSide('long')} style={{ flex: 1, background: side === 'long' ? '#10b981' : undefined }}>Long</button>
          <button onClick={() => setSide('short')} style={{ flex: 1, background: side === 'short' ? '#ef4444' : undefined }}>Short</button>
        </div>

        <label style={{ display: 'block', margin: '10px 0', fontWeight: 600 }}>Leverage</label>
        <input type="number" min="1" step="0.1" value={leverage} onChange={e => setLeverage(parseFloat(e.target.value))} style={{ width: '100%', padding: 8, borderRadius: 6 }} />

        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <button onClick={handleSimulate} style={{ flex: 1, padding: 10 }}>Simulate Liquidation</button>
          <button onClick={handleOpen} style={{ flex: 1, padding: 10 }}>Open Simulated Position</button>
        </div>

        {message && (
          <div style={{ marginTop: 12, padding: 10, borderRadius: 8, background: message.type === 'success' ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.06)' }}>
            {message.text}
          </div>
        )}

        {simResult && (
          <pre style={{ marginTop: 12, background: '#0f172a', color: '#fff', padding: 12, borderRadius: 8 }}>{JSON.stringify(simResult, null, 2)}</pre>
        )}

      </div>
    </div>
  );
}
