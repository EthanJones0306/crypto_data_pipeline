import React, { useEffect, useState } from 'react';
import { fetchApiStatus as fetchApiStatusRequest } from '../services/api';

function Status() {
  const [apiStatus, setApiStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    fetchApiStatus();
    const interval = setInterval(fetchApiStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchApiStatus = async () => {
    try {
      setLoading(true);
      const data = await fetchApiStatusRequest();
      setApiStatus(data.providers);
      setLastUpdated(new Date(data.timestamp));
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'ok':
        return 'var(--accent-2)';
      case 'warning':
        return 'var(--warning)';
      case 'critical':
        return 'var(--danger)';
      default:
        return 'var(--muted)';
    }
  };

  const getProviderName = (provider) => {
    const names = {
      finnhub: 'Finnhub (Stocks)',
      alphavantage: 'Alpha Vantage (Stocks)',
      coingecko: 'CoinGecko (Crypto)',
    };
    return names[provider] || provider;
  };

  return (
    <div className="status-container">
      <h2>API Status</h2>

      {error && <div className="error-banner">⚠️ {error}</div>}

      {loading && !apiStatus ? (
        <div className="loading-panel">Loading API status...</div>
      ) : (
        <>
          <div className="status-grid">
            {apiStatus && Object.entries(apiStatus).map(([provider, data]) => (
              <div
                key={provider}
                className="status-card"
                style={{ borderLeftColor: getStatusColor(data.status) }}
              >
                <div className="status-header">
                  <h3>{getProviderName(provider)}</h3>
                  <span className="status-indicator">{data.indicator}</span>
                </div>

                <div className="status-details">
                  <div className="status-row">
                    <span className="label">Calls Today:</span>
                    <span className="value">{data.calls_today} / {data.rate_limit}</span>
                  </div>

                  <div className="status-row">
                    <span className="label">Remaining:</span>
                    <span className="value" style={{ color: getStatusColor(data.status) }}>
                      {data.calls_remaining}
                    </span>
                  </div>

                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${data.usage_percent}%`,
                        backgroundColor: getStatusColor(data.status),
                      }}
                    />
                  </div>
                  <div className="progress-label">{data.usage_percent.toFixed(1)}% used</div>

                  {data.last_call && (
                    <div className="status-row">
                      <span className="label">Last Call:</span>
                      <span className="value">{new Date(data.last_call).toLocaleTimeString()}</span>
                    </div>
                  )}
                </div>

                {data.status === 'critical' && (
                  <div className="status-warning">
                    🚨 Rate limit critical! API calls will be throttled.
                  </div>
                )}

                {data.status === 'warning' && (
                  <div className="status-warning warning">
                    ⚠️ Approaching rate limit
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="status-footer">
            <small>
              Last updated: {lastUpdated?.toLocaleTimeString() || 'Never'}
              <button onClick={fetchApiStatus} className="status-refresh">
                Refresh
              </button>
            </small>
          </div>
        </>
      )}
    </div>
  );
}

export default Status;
