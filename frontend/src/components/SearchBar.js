import React, { useState, useEffect, useRef } from 'react';
import { searchCrypto, searchStocks } from '../services/api';

function SearchBar({ assetType = 'crypto', onSelect, placeholder = 'Search assets...' }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const debounceTimer = useRef(null);

  // Debounced search function
  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    if (query.length < 1) {
      setResults([]);
      setShowDropdown(false);
      return;
    }

    setLoading(true);
    debounceTimer.current = setTimeout(async () => {
      try {
        const response = assetType === 'crypto'
          ? await searchCrypto(query)
          : await searchStocks(query);

        if (response.status === 'success') {
          setResults(response.results);
          setShowDropdown(true);
        } else {
          setResults([]);
        }
      } catch (err) {
        console.error('Search error:', err);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300); // 300ms debounce

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [query, assetType]);

  const handleSelect = (item) => {
    const value = assetType === 'crypto' ? item.id : item.symbol;
    onSelect(value);
    setQuery('');
    setResults([]);
    setShowDropdown(false);
  };

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => query.length > 0 && setShowDropdown(true)}
        placeholder={placeholder}
        style={{
          width: '100%',
          padding: '10px',
          borderRadius: '8px',
          border: '1px solid #475569',
          fontSize: '1em',
          boxSizing: 'border-box',
          backgroundColor: 'rgba(15, 25, 35, 0.5)'
        }}
      />

      {loading && (
        <div style={{
          position: 'absolute',
          right: '10px',
          top: '50%',
          transform: 'translateY(-50%)',
          color: '#94a3b8',
          fontSize: '0.8em'
        }}>
          🔄 Searching...
        </div>
      )}

      {showDropdown && results.length > 0 && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            backgroundColor: '#162534',
            border: '1px solid #1e3448',
            borderRadius: '8px',
            marginTop: '5px',
            maxHeight: '300px',
            overflowY: 'auto',
            zIndex: 1000,
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
          }}
        >
          {results.map((item, idx) => (
            <div
              key={idx}
              onClick={() => handleSelect(item)}
              style={{
                padding: '10px 12px',
                borderBottom: idx < results.length - 1 ? '1px solid #1e3448' : 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(14, 124, 107, 0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              {assetType === 'crypto' ? (
                <>
                  {item.image && (
                    <img
                      src={item.image}
                      alt={item.name}
                      style={{ width: '24px', height: '24px', borderRadius: '50%' }}
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  )}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '600', color: '#e2e8f0' }}>
                      {item.name}
                    </div>
                    <div style={{ fontSize: '0.85em', color: '#94a3b8' }}>
                      {item.symbol}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '600', color: '#e2e8f0' }}>
                      {item.symbol}
                    </div>
                    <div style={{ fontSize: '0.85em', color: '#94a3b8' }}>
                      {item.name}
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {showDropdown && query.length > 0 && results.length === 0 && !loading && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            backgroundColor: '#162534',
            border: '1px solid #1e3448',
            borderRadius: '8px',
            marginTop: '5px',
            padding: '12px',
            color: '#94a3b8',
            textAlign: 'center',
            fontSize: '0.9em'
          }}
        >
          No results found for "{query}"
        </div>
      )}
    </div>
  );
}

export default SearchBar;
