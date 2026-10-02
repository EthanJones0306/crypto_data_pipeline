import React from 'react';
import { AlertOctagon, AlertTriangle, CheckCircle2, HelpCircle } from 'lucide-react';
import { fetchApiStatus, fetchHealth } from '../services/api';
import useApi from '../hooks/useApi';
import { relativeTime } from '../lib/format';
import { Card, ErrorState, PageHeader, Skeleton, UpdatedAgo } from './ui';

const PROVIDERS = {
  coingecko: { name: 'CoinGecko', role: 'Crypto prices & search' },
  finnhub: { name: 'Finnhub', role: 'Stock prices' },
  alphavantage: { name: 'Alpha Vantage', role: 'Stock prices (backup)' },
};

const STATUS = {
  ok: { label: 'Healthy', icon: CheckCircle2, tone: 'good' },
  warning: { label: 'Approaching limit', icon: AlertTriangle, tone: 'warning' },
  critical: { label: 'Rate limited', icon: AlertOctagon, tone: 'critical' },
  unknown: { label: 'No calls yet', icon: HelpCircle, tone: 'neutral' },
};

const loadStatus = async () => {
  const [status, health] = await Promise.all([fetchApiStatus(), fetchHealth().catch(() => null)]);
  return { providers: status.providers || {}, health };
};

function Status() {
  const { data, error, loading, refreshing, updatedAt, reload } = useApi(loadStatus, { interval: 30000 });
  const healthy = data?.health?.status === 'healthy';

  return (
    <div className="page">
      <PageHeader title="API Status" subtitle="Data providers and daily rate-limit usage." actions={<UpdatedAgo at={updatedAt} refreshing={refreshing} onRefresh={reload} />} />

      {error && !data && <ErrorState message={error} onRetry={reload} />}

      {data && (
        <Card className="status-hero">
          <span className={`status-orb ${healthy ? 'tone-good' : 'tone-critical'}`}>{healthy ? <CheckCircle2 size={20} /> : <AlertOctagon size={20} />}</span>
          <div>
            <strong>{healthy ? 'All systems go' : 'Backend database unavailable'}</strong>
            <p className="muted small">{healthy ? `Database connected · ${data.health.transactions_stored} transactions stored` : data?.health?.error || 'Check the backend logs.'}</p>
          </div>
        </Card>
      )}

      <div className="status-grid">
        {loading
          ? Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="card card-padded" style={{ display: 'grid', gap: 12 }}>
                <Skeleton width="50%" />
                <Skeleton height={8} />
                <Skeleton width="30%" height={10} />
              </div>
            ))
          : Object.entries(data?.providers || {}).map(([key, p]) => {
              const meta = PROVIDERS[key] || { name: key, role: '' };
              const st = STATUS[p.status] || STATUS.unknown;
              const Icon = st.icon;
              return (
                <Card key={key} className="provider-card">
                  <div className="provider-head">
                    <div>
                      <strong>{meta.name}</strong>
                      <p className="muted small">{meta.role}</p>
                    </div>
                    <span className={`status-pill tone-${st.tone}`}>
                      <Icon size={13} /> {st.label}
                    </span>
                  </div>
                  <div className="usage">
                    <div className="usage-row">
                      <span className="num strong">{p.calls_today.toLocaleString()}</span>
                      <span className="muted small num">of {p.rate_limit.toLocaleString()} calls today</span>
                    </div>
                    <div className="risk-track">
                      <span className={`usage-fill tone-${st.tone}`} style={{ width: `${Math.min(100, p.usage_percent)}%` }} />
                    </div>
                    <div className="usage-row small muted">
                      <span>{p.calls_remaining.toLocaleString()} remaining</span>
                      <span>Last call {p.last_call ? relativeTime(p.last_call) : 'never'}</span>
                    </div>
                  </div>
                </Card>
              );
            })}
      </div>
    </div>
  );
}

export default Status;
