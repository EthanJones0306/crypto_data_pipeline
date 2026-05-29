import React, { useState, useEffect } from 'react';
import { getOpenPositions, closePosition } from '../services/api';
import { getDisplayName } from '../constants/assetNames';

export default function Positions() {
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [closingId, setClosingId] = useState(null);

  useEffect(() => {
    fetchPositions();
    const interval = setInterval(fetchPositions, 5000); // Refresh every 5s
    return () => clearInterval(interval);
  }, []);

  const fetchPositions = async () => {
    try {
      const resp = await getOpenPositions();
      if (resp.status === 'success') {
        setPositions(resp.positions || []);
        setError(null);
      } else {
        setError(resp.message || 'Failed to fetch positions');
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = async (positionId) => {
    setClosingId(positionId);
    try {
      const resp = await closePosition(positionId);
      if (resp.status === 'success') {
        setPositions(positions.filter(p => p.id !== positionId));
      } else {
        setError(resp.message || 'Failed to close position');
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setClosingId(null);
    }
  };

  if (loading) {
    return (
      <div className="portfolio-container">
        <h2>Open Perpetual Positions</h2>
        <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '40px' }}>Loading positions...</div>
      </div>
    );
  }

  if (positions.length === 0) {
    return (
      <div className="portfolio-container">
        <h2>Open Perpetual Positions</h2>
        <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '40px' }}>
          No open positions. Open one in the Leverage tab to get started.
        </div>
      </div>
    );
  }

  return (
    <div className="portfolio-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2>Open Perpetual Positions</h2>
        <button onClick={fetchPositions} className="secondary-action" style={{ fontSize: '14px', padding: '8px 12px' }}>
          ↻ Refresh
        </button>
      </div>

      {error && (
        <div className="message-banner error" style={{ marginBottom: '16px' }}>
          {error}
        </div>
      )}

      <div style={{ display: 'grid', gap: '16px' }}>
        {positions.map((pos) => (
          <div key={pos.id} className="shell-card" style={{ padding: '18px', borderRadius: '12px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '20px', marginBottom: '16px' }}>
              {/* Asset & Side */}
              <div>
                <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '4px', textTransform: 'uppercase', fontWeight: '600', letterSpacing: '0.05em' }}>
                  Asset & Side
                </div>
                <div style={{ fontSize: '16px', fontWeight: '600' }}>
                  {getDisplayName(pos.asset)}
                </div>
                <div style={{ fontSize: '12px', color: pos.side === 'long' ? '#4aa8e0' : '#ff6b6b', marginTop: '2px', textTransform: 'uppercase', fontWeight: '600' }}>
                  {pos.side} • {pos.leverage}x
                </div>
              </div>

              {/* Entry Price & Current */}
              <div>
                <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '4px', textTransform: 'uppercase', fontWeight: '600', letterSpacing: '0.05em' }}>
                  Entry / Current
                </div>
                <div style={{ fontFamily: 'IBM Plex Mono', fontSize: '14px' }}>
                  <span style={{ color: 'var(--accent-2)' }}>${pos.entry_price?.toFixed(4)}</span>
                  <span style={{ color: 'var(--muted)', margin: '0 6px' }}>/</span>
                  <span style={{ color: pos.current_price > pos.entry_price ? '#4aa8e0' : '#ff6b6b' }}>
                    ${pos.current_price?.toFixed(4)}
                  </span>
                </div>
              </div>

              {/* P&L */}
              <div>
                <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '4px', textTransform: 'uppercase', fontWeight: '600', letterSpacing: '0.05em' }}>
                  P&L
                </div>
                <div style={{ fontFamily: 'IBM Plex Mono', fontSize: '14px', color: pos.pnl >= 0 ? '#4aa8e0' : '#ff6b6b', fontWeight: '600' }}>
                  ${pos.pnl?.toFixed(2)}
                </div>
                <div style={{ fontSize: '12px', color: pos.pnl_percent >= 0 ? '#4aa8e0' : '#ff6b6b', marginTop: '2px' }}>
                  {pos.pnl_percent >= 0 ? '+' : ''}{pos.pnl_percent?.toFixed(2)}%
                </div>
              </div>

              {/* Liquidation Safety */}
              <div>
                <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '4px', textTransform: 'uppercase', fontWeight: '600', letterSpacing: '0.05em' }}>
                  Liq Distance
                </div>
                <div style={{ fontFamily: 'IBM Plex Mono', fontSize: '14px' }}>
                  ${pos.distance_to_liquidation?.toFixed(4)}
                </div>
                <div style={{ fontSize: '12px', color: pos.liquidation_distance_percent > 10 ? '#4aa8e0' : pos.liquidation_distance_percent > 5 ? '#fcb900' : '#ff6b6b', marginTop: '2px' }}>
                  {pos.liquidation_distance_percent?.toFixed(2)}% away
                </div>
              </div>
            </div>

            {/* Liquidation Price Bar */}
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '6px', textTransform: 'uppercase', fontWeight: '600', letterSpacing: '0.05em' }}>
                Liquidation Price: <span style={{ color: '#ff6b6b' }}>${pos.liquidation_price?.toFixed(4)}</span>
              </div>
              <div style={{ height: '4px', background: 'rgba(255, 107, 107, 0.2)', borderRadius: '2px', overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    background: pos.pnl >= 0 ? '#4aa8e0' : '#ff6b6b',
                    width: Math.min(100, Math.max(5, (pos.liquidation_distance_percent / (pos.liquidation_distance_percent + 50)) * 100)) + '%'
                  }}
                />
              </div>
            </div>

            {/* Close Button */}
            <button
              onClick={() => handleClose(pos.id)}
              disabled={closingId === pos.id}
              className="secondary-action"
              style={{ width: '100%', marginTop: '8px' }}
            >
              {closingId === pos.id ? '⏳ Closing...' : '✕ Close Position'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
