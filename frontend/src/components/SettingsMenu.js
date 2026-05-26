import React, { useContext, useEffect, useRef, useState } from 'react';
import { ThemeContext } from '../contexts/ThemeContext';
import './SettingsMenu.css';

export default function SettingsMenu() {
  const { theme, resolvedTheme, setTheme } = useContext(ThemeContext);
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  const options = [
    { key: 'system', label: 'System Default', description: 'Follow your device appearance setting' },
    { key: 'dark', label: 'Dark', description: 'Deep slate theme for low-light work' },
    { key: 'light', label: 'Light', description: 'Bright clean theme for daytime use' },
    { key: 'solar', label: 'Solar', description: 'Warm amber theme with softer contrast' },
    { key: 'high-contrast', label: 'High Contrast', description: 'Maximum contrast for readability' }
  ];

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  return (
    <div className="settings-menu" ref={menuRef}>
      <button
        className="settings-toggle"
        onClick={() => setOpen(v => !v)}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label="Open settings"
        title="Settings"
      >
        ⚙
      </button>

      {open && (
        <div className="settings-dropdown">
          <div className="settings-dropdown-header">
            <div>
              <p className="settings-eyebrow">Appearance</p>
              <h4>Theme Settings</h4>
            </div>
            <button className="settings-close" onClick={() => setOpen(false)} aria-label="Close settings">
              ×
            </button>
          </div>
          <p className="settings-description">Choose how the app should look across the interface.</p>
          {options.map(opt => (
            <button
              key={opt.key}
              className={`settings-option ${theme === opt.key ? 'active' : ''} ${theme === 'system' && opt.key === 'system' ? `resolved-${resolvedTheme}` : ''}`}
              onClick={() => {
                setTheme(opt.key);
                setOpen(false);
              }}
              type="button"
            >
              <span className="settings-option-copy">
                <span className="settings-option-label">{opt.label}</span>
                <span className="settings-option-description">{opt.description}</span>
              </span>
              <span className="settings-option-status" aria-hidden="true">
                {theme === opt.key ? '✓' : ''}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}