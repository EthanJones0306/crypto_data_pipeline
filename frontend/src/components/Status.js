import React, { useState, useEffect } from 'react';

function Status() {
  const [apiStatus, setApiStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    fetchApiStatus();
    // Refresh every 30 seconds
    const interval = setInterval(fetchApiStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchApiStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:8000/api/status');
      if (!response.ok) throw new Error('Failed to fetch API status');
      
      const data = await response.json();
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
        return 'var(--profit-green)';
      case 'warning':
        return 'var(--gold-signal)';
      case 'critical':
        return 'var(--loss-red)';
      default:
        return 'var(--muted-text)';
    }
  };

  const getProviderName = (provider) => {
    const names = {
      'finnhub': 'Finnhub (Stocks)',
      'alphavantage': 'Alpha Vantage (Stocks)',
      'coingecko': 'CoinGecko (Crypto)'
    };
    return names[provider] || provider;
  };

  return (
    <div className="status-container">
      <h2>🔌 API Status</h2>
      
      {error && (
        <div className="error-banner" style={{ color: 'var(--loss-red)' }}>
          ⚠️ {error}
        </div>
      )}

      {loading && !apiStatus ? (
        <div style={{ textAlign: 'center', padding: '20px', color: 'var(--muted-text)' }}>
          Loading API status...
        </div>
      ) : (
        <>
          <div className="status-grid">
            {apiStatus && Object.entries(apiStatus).map(([provider, data]) => (
              <div key={provider} className="status-card" style={{ borderLeftColor: getStatusColor(data.status) }}>
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
                        backgroundColor: getStatusColor(data.status)
                      }}
                    />
                  </div>
                  <div className="progress-label">{data.usage_percent.toFixed(1)}% used</div>

                  {data.last_call && (
                    <div className="status-row">
                      <span className="label">Last Call:</span>
                      <span className="value">
                        {new Date(data.last_call).toLocaleTimeString()}
                      </span>
                    </div>
                  )}
                </div>

                {data.status === 'critical' && (
                  <div className="status-warning">
                    🚨 Rate limit critical! API calls will be throttled.
                  </div>
                )}
                {data.status === 'warning' && (
                  <div className="status-warning" style={{ backgroundColor: 'rgba(240, 192, 64, 0.1)', borderColor: 'var(--gold-signal)' }}>
                    ⚠️ Approaching rate limit
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="status-footer">
            <small style={{ color: 'var(--muted-text)' }}>
              Last updated: {lastUpdated?.toLocaleTimeString() || 'Never'}
              <button 
                onClick={fetchApiStatus} 
                style={{
                  marginLeft: '10px',
                  padding: '4px 12px',
                  backgroundColor: 'var(--emerald-tide)',
                  border: 'none',
                  borderRadius: '4px',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                Refresh
              </button>
            </small>
          </div>
        </>
      )}

      <style jsx>{`
        .status-container {
          padding: 20px;
          background-color: var(--midnight-slate);
          border-radius: 8px;
          color: var(--data-blue);
        }

        .status-container h2 {
          margin-top: 0;
          margin-bottom: 20px;
          color: var(--emerald-tide);
        }

        .error-banner {
          padding: 12px;
          background-color: rgba(192, 68, 75, 0.1);
          border-left: 3px solid var(--loss-red);
          border-radius: 4px;
          margin-bottom: 20px;
        }

        .status-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 16px;
          margin-bottom: 20px;
        }

        .status-card {
          background-color: var(--ocean-floor);
          border: 1px solid var(--data-blue);
          border-left: 4px solid var(--data-blue);
          border-radius: 6px;
          padding: 16px;
          transition: all 0.3s ease;
        }

        .status-card:hover {
          background-color: rgba(78, 168, 224, 0.05);
          border-color: var(--emerald-tide);
        }

        .status-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }

        .status-header h3 {
          margin: 0;
          font-size: 16px;
          color: var(--emerald-tide);
        }

        .status-indicator {
          font-size: 24px;
        }

        .status-details {
          font-size: 14px;
        }

        .status-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 0;
          border-bottom: 1px solid rgba(78, 168, 224, 0.1);
        }

        .status-row:last-child {
          border-bottom: none;
        }

        .status-row .label {
          color: var(--muted-text);
          font-weight: 500;
        }

        .status-row .value {
          color: var(--data-blue);
          font-weight: bold;
          font-family: monospace;
        }

        .progress-bar {
          height: 8px;
          background-color: rgba(78, 168, 224, 0.1);
          border-radius: 4px;
          margin: 12px 0 4px 0;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          transition: width 0.3s ease;
        }

        .progress-label {
          font-size: 12px;
          color: var(--muted-text);
          text-align: right;
        }

        .status-warning {
          margin-top: 12px;
          padding: 8px;
          background-color: rgba(192, 68, 75, 0.1);
          border-left: 3px solid var(--loss-red);
          border-radius: 4px;
          font-size: 12px;
          color: var(--loss-red);
        }

        .status-footer {
          text-align: center;
          padding-top: 16px;
          border-top: 1px solid rgba(78, 168, 224, 0.1);
        }
      `}</style>
    </div>
  );
}

export default Status;
