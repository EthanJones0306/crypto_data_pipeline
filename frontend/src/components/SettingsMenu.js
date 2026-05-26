import React, { useContext, useState } from 'react';
import { ThemeContext } from '../contexts/ThemeContext';
import './SettingsMenu.css'; // optional small styles

export default function SettingsMenu() {
  const { theme, setTheme } = useContext(ThemeContext);
  const [open, setOpen] = useState(false);

  const options = [
    { key: 'dark', label: 'Dark' },
    { key: 'light', label: 'Light' },
    { key: 'solar', label: 'Solar' },
    { key: 'high-contrast', label: 'High Contrast' }
  ];

  return (
    <div className="settings-menu" style={{ position: 'relative' }}>
      <button className="theme-toggle" onClick={() => setOpen(v => !v)} aria-haspopup="true" aria-expanded={open}>
        ⚙
      </button>

      {open && (
        <div className="settings-dropdown" style={{
          position: 'absolute',
          right: 0,
          top: '110%',
          background: 'var(--portfolio-container-bg, #fff)',
          border: '1px solid rgba(0,0,0,0.08)',
          borderRadius: 8,
          padding: 12,
          minWidth: 200,
          zIndex: 50
        }}>
          <h4 style={{ margin: '0 0 8px 0' }}>Appearance</h4>
          {options.map(opt => (
            <label key={opt.key} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, cursor: 'pointer' }}>
              <input
                type="radio"
                name="theme"
                value={opt.key}
                checked={theme === opt.key}
                onChange={() => setTheme(opt.key)}
              />
              <span>{opt.label}</span>
            </label>
          ))}
          <div style={{ marginTop: 8, textAlign: 'right' }}>
            <button onClick={() => setOpen(false)} style={{ padding: '6px 10px' }}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}