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
    <div className="search-shell">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => query.length > 0 && setShowDropdown(true)}
        placeholder={placeholder}
        className="search-input"
      />

      {loading && <div className="search-loading">🔄 Searching...</div>}

      {showDropdown && results.length > 0 && (
        <div className="search-results">
          {results.map((item, idx) => (
            <div
              key={idx}
              onClick={() => handleSelect(item)}
              className="search-result"
            >
              {assetType === 'crypto' ? (
                <>
                  {item.image && (
                    <img
                      src={item.image}
                      alt={item.name}
                      className="search-avatar"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  )}
                  <div className="search-copy">
                    <div className="search-title">
                      {item.name}
                    </div>
                    <div className="search-meta">
                      {item.symbol}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="search-copy">
                    <div className="search-title">
                      {item.symbol}
                    </div>
                    <div className="search-meta">
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
        <div className="search-empty">
          No results found for "{query}"
        </div>
      )}
    </div>
  );
}

export default SearchBar;
