import React, { useEffect, useRef, useState } from 'react';
import { Loader2, Search } from 'lucide-react';
import { searchCrypto, searchStocks } from '../services/api';
import { getAssetMeta, rememberAsset } from '../lib/assets';
import { AssetAvatar } from './ui';

function SearchBar({ assetType = 'crypto', onSelect, placeholder = 'Search assets…', suggestions = [], autoFocus = false }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [searchError, setSearchError] = useState(null);
  const wrapRef = useRef(null);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults([]);
      setLoading(false);
      setSearchError(null);
      return undefined;
    }
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const response = assetType === 'crypto' ? await searchCrypto(q) : await searchStocks(q);
        setResults(
          (response.results || []).map((r) =>
            assetType === 'crypto' ? { key: r.id, name: r.name, symbol: r.symbol, image: r.image } : { key: r.symbol, name: r.name, symbol: r.symbol }
          )
        );
        setSearchError(null);
      } catch (err) {
        setResults([]);
        setSearchError(err.message);
      } finally {
        setLoading(false);
        setIndex(0);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [query, assetType]);

  useEffect(() => {
    const onDown = (e) => wrapRef.current && !wrapRef.current.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  const suggestionItems = suggestions.map((key) => ({ key, ...getAssetMeta(key) }));
  const items = query.trim() ? results : suggestionItems;

  const choose = (item) => {
    if (!item) return;
    if (assetType === 'crypto' && item.name) rememberAsset(item.key, { name: item.name, symbol: item.symbol, image: item.image, checked: true });
    onSelect(item.key);
    setQuery('');
    setOpen(false);
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setIndex((i) => Math.min(items.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setIndex((i) => Math.max(0, i - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      choose(items[index]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const showList = open && (items.length > 0 || (query.trim() && !loading));

  return (
    <div className="search" ref={wrapRef}>
      <div className="search-field">
        <Search size={16} className="search-icon" />
        <input
          type="text"
          value={query}
          autoFocus={autoFocus}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          role="combobox"
          aria-expanded={!!showList}
          aria-controls="search-listbox"
          aria-autocomplete="list"
          autoComplete="off"
          spellCheck={false}
        />
        {loading && <Loader2 size={16} className="spin muted" />}
      </div>

      {showList && (
        <ul className="search-list" id="search-listbox" role="listbox">
          {!query.trim() && items.length > 0 && <li className="search-list-label">Suggestions</li>}
          {items.map((item, i) => (
            <li
              key={item.key}
              role="option"
              aria-selected={i === index}
              className={`search-option ${i === index ? 'active' : ''}`}
              onMouseEnter={() => setIndex(i)}
              onMouseDown={(e) => {
                e.preventDefault();
                choose(item);
              }}
            >
              <AssetAvatar asset={item.key} image={item.image} size={28} />
              <span className="search-option-name">{item.name}</span>
              <span className="search-option-symbol">{item.symbol}</span>
            </li>
          ))}
          {query.trim() && !loading && items.length === 0 && (
            <li className="search-empty">{searchError || `No results for “${query.trim()}”`}</li>
          )}
        </ul>
      )}
    </div>
  );
}

export default SearchBar;
