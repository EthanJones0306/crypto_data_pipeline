import React, { useContext, useState } from 'react';
import { Check, Loader2, Smartphone } from 'lucide-react';
import { ThemeContext } from '../contexts/ThemeContext';
import { resetDatabase } from '../services/api';
import { NAV_ITEMS } from './navItems';
import { Card, PageHeader, Segmented, useApp } from './ui';

const THEMES = [
  { key: 'system', label: 'System', description: 'Match your device' },
  { key: 'dark', label: 'Midnight', description: 'Deep and focused' },
  { key: 'light', label: 'Daylight', description: 'Crisp and bright' },
  { key: 'solar', label: 'Solar', description: 'Warm amber tones' },
  { key: 'high-contrast', label: 'High contrast', description: 'Maximum legibility' },
];

const SHORTCUTS = [
  { keys: ['⌘', 'K'], label: 'Command palette' },
  { keys: ['1–9'], label: 'Jump between pages' },
  { keys: ['H'], label: 'Hide / show balances' },
  { keys: ['R'], label: 'Refresh all data' },
];

export default function Settings() {
  const { theme, setTheme } = useContext(ThemeContext);
  const { currency, setCurrency, privacy, togglePrivacy, confirm, toast, refreshAll, navigate } = useApp();
  const [resetting, setResetting] = useState(false);

  const handleReset = async () => {
    const ok = await confirm({
      title: 'Reset all data?',
      body: <p>This permanently deletes every transaction and position and resets your paper account. It can't be undone.</p>,
      confirmLabel: 'Reset everything',
      tone: 'danger',
    });
    if (!ok) return;
    setResetting(true);
    try {
      await resetDatabase();
      toast('Your portfolio is back to a clean slate.', { title: 'Data reset' });
      refreshAll();
      navigate('dashboard');
    } catch (err) {
      toast(err.message, { type: 'error', title: 'Reset failed' });
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="page page-narrow">
      <PageHeader title="Settings" subtitle="Make it yours." />

      <Card title="Appearance">
        <div className="theme-grid">
          {THEMES.map((t) => (
            <button key={t.key} type="button" className={`theme-option ${theme === t.key ? 'active' : ''}`} onClick={() => setTheme(t.key)} aria-pressed={theme === t.key}>
              <span className={`theme-swatch swatch-${t.key}`}>
                <span />
                <span />
                <span />
              </span>
              <span className="theme-text">
                <strong>{t.label}</strong>
                <span>{t.description}</span>
              </span>
              {theme === t.key && (
                <span className="theme-check">
                  <Check size={13} strokeWidth={3} />
                </span>
              )}
            </button>
          ))}
        </div>
      </Card>

      <Card title="Display">
        <div className="setting-row">
          <div>
            <strong>Currency</strong>
            <p>All values are converted using live exchange rates.</p>
          </div>
          <Segmented
            size="sm"
            label="Display currency"
            value={currency}
            onChange={setCurrency}
            options={['USD', 'EUR', 'GBP', 'ZAR'].map((c) => ({ value: c, label: c }))}
          />
        </div>
        <div className="setting-row">
          <div>
            <strong>Hide balances</strong>
            <p>Mask amounts when you're checking your portfolio in public.</p>
          </div>
          <button type="button" role="switch" aria-checked={privacy} className={`switch ${privacy ? 'on' : ''}`} onClick={togglePrivacy}>
            <span />
          </button>
        </div>
      </Card>

      <Card title="Keyboard shortcuts" className="hide-mobile">
        <ul className="shortcut-list">
          {SHORTCUTS.map((s) => (
            <li key={s.label}>
              <span>{s.label}</span>
              <span>
                {s.keys.map((k) => (
                  <kbd key={k}>{k}</kbd>
                ))}
              </span>
            </li>
          ))}
          {NAV_ITEMS.slice(0, 4).map((n) => (
            <li key={n.key} className="muted">
              <span>{n.label}</span>
              <kbd>{n.hint}</kbd>
            </li>
          ))}
        </ul>
      </Card>

      <Card title="Use it on your phone">
        <div className="install-tip">
          <span className="install-icon">
            <Smartphone size={20} />
          </span>
          <p>
            Open this app in Safari or Chrome on your phone, then choose <strong>Share → Add to Home Screen</strong>. It launches full-screen like a native app.
          </p>
        </div>
      </Card>

      <Card title="Danger zone" className="danger-card">
        <div className="setting-row">
          <div>
            <strong>Reset all data</strong>
            <p>Delete all transactions and positions and start fresh.</p>
          </div>
          <button type="button" className="btn btn-danger-ghost" onClick={handleReset} disabled={resetting}>
            {resetting && <Loader2 size={15} className="spin" />}
            Reset
          </button>
        </div>
      </Card>
    </div>
  );
}
