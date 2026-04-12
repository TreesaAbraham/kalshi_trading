import { useEffect, useMemo, useState } from 'react';
import './App.css';

const BASE_URL = 'https://api.elections.kalshi.com/trade-api/v2/markets';
const PAGE_SIZE = 500;

const HIGH_VOLUME_THRESHOLD = 1000;
const HIGH_CERTAINTY_THRESHOLD = 0.9;
const LOW_CERTAINTY_LOWER = 0.45;
const LOW_CERTAINTY_UPPER = 0.55;
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
const MAX_SUGGESTIONS = 8;

function formatDate(value) {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleString();
}

function formatMoney(value) {
  const num = Number(value);
  if (Number.isNaN(num)) return 'N/A';
  return `$${num.toFixed(3)}`;
}

function formatNumber(value) {
  const num = Number(value);
  if (Number.isNaN(num)) return 'N/A';
  return num.toLocaleString();
}

function matchesStatus(marketStatus, appliedStatus) {
  if (appliedStatus === 'all') return true;

  const normalized = (marketStatus || '').toLowerCase();

  if (appliedStatus === 'open') {
    return normalized === 'open' || normalized === 'active';
  }

  return normalized === appliedStatus;
}

function getUtcMonthRange(monthValue) {
  if (!monthValue) return null;

  const [yearStr, monthStr] = monthValue.split('-');
  const year = Number(yearStr);
  const monthIndex = Number(monthStr) - 1;

  if (
    Number.isNaN(year) ||
    Number.isNaN(monthIndex) ||
    monthIndex < 0 ||
    monthIndex > 11
  ) {
    return null;
  }

  const start = Date.UTC(year, monthIndex, 1, 0, 0, 0, 0);
  const end = Date.UTC(year, monthIndex + 1, 1, 0, 0, 0, 0) - 1;

  return {
    minTs: Math.floor(start / 1000),
    maxTs: Math.floor(end / 1000),
  };
}

function getUtcDayRange(dateValue) {
  if (!dateValue) return null;

  const [yearStr, monthStr, dayStr] = dateValue.split('-');
  const year = Number(yearStr);
  const monthIndex = Number(monthStr) - 1;
  const day = Number(dayStr);

  if (
    Number.isNaN(year) ||
    Number.isNaN(monthIndex) ||
    Number.isNaN(day) ||
    monthIndex < 0 ||
    monthIndex > 11
  ) {
    return null;
  }

  const start = Date.UTC(year, monthIndex, day, 0, 0, 0, 0);
  const end = Date.UTC(year, monthIndex, day + 1, 0, 0, 0, 0) - 1;

  return {
    minTs: Math.floor(start / 1000),
    maxTs: Math.floor(end / 1000),
  };
}

function getTimeRange(dateMode, createdDate, createdMonth) {
  if (dateMode === 'day') {
    return getUtcDayRange(createdDate);
  }

  if (dateMode === 'month') {
    return getUtcMonthRange(createdMonth);
  }

  return null;
}

function buildSearchBlob(market) {
  return [
    market.title,
    market.subtitle,
    market.ticker,
    market.event_ticker,
    market.series_ticker,
    market.yes_sub_title,
    market.no_sub_title,
    market.rules_primary,
    market.rules_secondary,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function matchesKeywordSearch(market, query) {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return true;

  const keywords = trimmed.split(/\s+/).filter(Boolean);
  const haystack = buildSearchBlob(market);

  return keywords.every((word) => haystack.includes(word));
}

function getSuggestionLabel(market) {
  return market.subtitle || market.title || market.ticker || 'Untitled market';
}

function getMarketDisplayQuestion(market) {
  return market.subtitle || market.title || 'Untitled market';
}

function App() {
  const [markets, setMarkets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTicker, setSelectedTicker] = useState('');
  const [nextCursor, setNextCursor] = useState('');
  const [currentCursor, setCurrentCursor] = useState('');
  const [cursorHistory, setCursorHistory] = useState([]);
  const [lastUpdated, setLastUpdated] = useState('');

  const [draftDateMode, setDraftDateMode] = useState('all');
  const [draftCreatedDate, setDraftCreatedDate] = useState('');
  const [draftCreatedMonth, setDraftCreatedMonth] = useState('');
  const [draftStatus, setDraftStatus] = useState('all');

  const [appliedDateMode, setAppliedDateMode] = useState('all');
  const [appliedCreatedDate, setAppliedCreatedDate] = useState('');
  const [appliedCreatedMonth, setAppliedCreatedMonth] = useState('');
  const [appliedStatus, setAppliedStatus] = useState('all');

  const [showSuggestions, setShowSuggestions] = useState(false);

  async function loadMarkets(
    cursorValue = '',
    dateModeValue = appliedDateMode,
    createdDateValue = appliedCreatedDate,
    createdMonthValue = appliedCreatedMonth,
    statusValue = appliedStatus
  ) {
    try {
      setLoading(true);
      setError('');

      const params = new URLSearchParams();
      params.set('limit', String(PAGE_SIZE));

      const timeRange = getTimeRange(
        dateModeValue,
        createdDateValue,
        createdMonthValue
      );

      if (timeRange) {
        params.set('min_created_ts', String(timeRange.minTs));
        params.set('max_created_ts', String(timeRange.maxTs));
      } else if (statusValue !== 'all') {
        params.set('status', statusValue);
      }

      if (cursorValue) {
        params.set('cursor', cursorValue);
      }

      const response = await fetch(`${BASE_URL}?${params.toString()}`);

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const data = await response.json();
      const marketList = Array.isArray(data.markets) ? data.markets : [];

      setMarkets(marketList);
      setNextCursor(data.cursor || '');
      setLastUpdated(new Date().toLocaleString());

      setSelectedTicker((prevTicker) => {
        const stillExists = marketList.some((market) => market.ticker === prevTicker);
        return stillExists ? prevTicker : marketList[0]?.ticker || '';
      });
    } catch (err) {
      setError(err.message || 'Something went wrong while loading markets.');
      setMarkets([]);
      setNextCursor('');
      setSelectedTicker('');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMarkets('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredMarkets = useMemo(() => {
    return markets.filter((market) => {
      const matchesText = matchesKeywordSearch(market, searchTerm);
      const matchesChosenStatus = matchesStatus(market.status, appliedStatus);
      return matchesText && matchesChosenStatus;
    });
  }, [markets, searchTerm, appliedStatus]);

  const autocompleteSuggestions = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return [];

    const suggestions = [];
    const seen = new Set();

    for (const market of markets) {
      if (!matchesStatus(market.status, appliedStatus)) continue;
      if (!matchesKeywordSearch(market, query)) continue;
      if (seen.has(market.ticker)) continue;

      suggestions.push({
        ticker: market.ticker,
        title: getSuggestionLabel(market),
        status: market.status || 'N/A',
      });

      seen.add(market.ticker);

      if (suggestions.length >= MAX_SUGGESTIONS) break;
    }

    return suggestions;
  }, [markets, searchTerm, appliedStatus]);

  const selectedMarket =
    filteredMarkets.find((market) => market.ticker === selectedTicker) ||
    filteredMarkets[0] ||
    null;

  const closingIn24HoursCount = markets.filter((market) => {
    if (!market.close_time) return false;

    const closeTime = new Date(market.close_time).getTime();
    if (Number.isNaN(closeTime)) return false;

    const timeUntilClose = closeTime - Date.now();
    return timeUntilClose >= 0 && timeUntilClose <= TWENTY_FOUR_HOURS_MS;
  }).length;

  const highVolumeCount = markets.filter((market) => {
    const volume = Number(market.volume_fp);
    return !Number.isNaN(volume) && volume >= HIGH_VOLUME_THRESHOLD;
  }).length;

  const highCertaintyCount = markets.filter((market) => {
    const yesPrice = Number(market.yes_ask_dollars);
    return (
      !Number.isNaN(yesPrice) &&
      (yesPrice >= HIGH_CERTAINTY_THRESHOLD ||
        yesPrice <= 1 - HIGH_CERTAINTY_THRESHOLD)
    );
  }).length;

  const lowCertaintyCount = markets.filter((market) => {
    const yesPrice = Number(market.yes_ask_dollars);
    return (
      !Number.isNaN(yesPrice) &&
      yesPrice >= LOW_CERTAINTY_LOWER &&
      yesPrice <= LOW_CERTAINTY_UPPER
    );
  }).length;

  function applyFilters() {
    setAppliedDateMode(draftDateMode);
    setAppliedCreatedDate(draftCreatedDate);
    setAppliedCreatedMonth(draftCreatedMonth);
    setAppliedStatus(draftStatus);
    setCursorHistory([]);
    setCurrentCursor('');
    setShowSuggestions(false);

    loadMarkets('', draftDateMode, draftCreatedDate, draftCreatedMonth, draftStatus);
  }

  function clearFilters() {
    setDraftDateMode('all');
    setDraftCreatedDate('');
    setDraftCreatedMonth('');
    setDraftStatus('all');

    setAppliedDateMode('all');
    setAppliedCreatedDate('');
    setAppliedCreatedMonth('');
    setAppliedStatus('all');

    setSearchTerm('');
    setCursorHistory([]);
    setCurrentCursor('');
    setShowSuggestions(false);

    loadMarkets('', 'all', '', '', 'all');
  }

  function goToNextPage() {
    if (!nextCursor) return;

    setCursorHistory((prev) => [...prev, currentCursor]);
    setCurrentCursor(nextCursor);
    setShowSuggestions(false);
    loadMarkets(nextCursor);
  }

  function goToPreviousPage() {
    if (cursorHistory.length === 0) return;

    const previousCursor = cursorHistory[cursorHistory.length - 1];
    const newHistory = cursorHistory.slice(0, -1);

    setCursorHistory(newHistory);
    setCurrentCursor(previousCursor);
    setShowSuggestions(false);
    loadMarkets(previousCursor);
  }

  function handleSuggestionSelect(suggestion) {
    setSearchTerm(suggestion.title);
    setSelectedTicker(suggestion.ticker);
    setShowSuggestions(false);
  }

  function handleSearchKeyDown(event) {
    if (event.key === 'Enter') {
      event.preventDefault();
      setShowSuggestions(false);

      if (filteredMarkets.length > 0) {
        setSelectedTicker(filteredMarkets[0].ticker);
      }
    }

    if (event.key === 'Escape') {
      setShowSuggestions(false);
    }
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-shell">
        <header className="topbar">
          <div>
            <p className="eyebrow">Kalshi Trading</p>
            <h1>Market Monitoring Dashboard</h1>
            <p className="subtext">
              Search by keyword, filter by UTC day or month, and inspect markets
              without manually digging through ticker soup.
            </p>
          </div>
        </header>

        <section className="toolbar">
          <div className="control-group search-group">
            <label htmlFor="search">Keyword search</label>
            <div className="autocomplete-wrap">
              <input
                id="search"
                type="text"
                placeholder="Try: trump, fed rates, bitcoin, hurricane"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => {
                  if (searchTerm.trim()) {
                    setShowSuggestions(true);
                  }
                }}
                onKeyDown={handleSearchKeyDown}
                autoComplete="off"
              />

              {showSuggestions && autocompleteSuggestions.length > 0 && (
                <div className="autocomplete-dropdown">
                  {autocompleteSuggestions.map((suggestion) => (
                    <button
                      key={suggestion.ticker}
                      type="button"
                      className="autocomplete-item"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => handleSuggestionSelect(suggestion)}
                    >
                      <div className="autocomplete-top">
                        <span className="autocomplete-ticker">
                          {suggestion.ticker}
                        </span>
                        <span className="autocomplete-status">
                          {suggestion.status}
                        </span>
                      </div>
                      <div className="autocomplete-title">
                        {suggestion.title}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="control-group">
            <label htmlFor="dateMode">Created filter (UTC)</label>
            <select
              id="dateMode"
              value={draftDateMode}
              onChange={(e) => setDraftDateMode(e.target.value)}
            >
              <option value="all">No date filter</option>
              <option value="day">Specific day</option>
              <option value="month">Entire month</option>
            </select>

            {draftDateMode === 'day' && (
              <input
                type="date"
                value={draftCreatedDate}
                onChange={(e) => setDraftCreatedDate(e.target.value)}
              />
            )}

            {draftDateMode === 'month' && (
              <input
                type="month"
                value={draftCreatedMonth}
                onChange={(e) => setDraftCreatedMonth(e.target.value)}
              />
            )}
          </div>

          <div className="control-group">
            <label htmlFor="status">Status</label>
            <select
              id="status"
              value={draftStatus}
              onChange={(e) => setDraftStatus(e.target.value)}
            >
              <option value="all">All</option>
              <option value="open">Open / Active</option>
              <option value="closed">Closed</option>
              <option value="settled">Settled</option>
              <option value="paused">Paused</option>
              <option value="unopened">Unopened</option>
            </select>
          </div>

          <div className="button-row">
            <button type="button" className="primary-button" onClick={applyFilters}>
              Apply filters
            </button>
            <button type="button" className="ghost-button" onClick={clearFilters}>
              Clear
            </button>
          </div>
        </section>

        <section className="summary-grid">
          <article className="summary-card">
            <p className="summary-label">Markets closing in 24h</p>
            <h2>{formatNumber(closingIn24HoursCount)}</h2>
          </article>

          <article className="summary-card">
            <p className="summary-label">High volume markets</p>
            <h2>{formatNumber(highVolumeCount)}</h2>
          </article>

          <article className="summary-card">
            <p className="summary-label">High certainty markets</p>
            <h2>{formatNumber(highCertaintyCount)}</h2>
          </article>

          <article className="summary-card">
            <p className="summary-label">Low certainty markets</p>
            <h2>{formatNumber(lowCertaintyCount)}</h2>
          </article>
        </section>

        <section className="status-row">
          <p>
            Showing <strong>{filteredMarkets.length}</strong> of{' '}
            <strong>{markets.length}</strong> loaded markets
          </p>
          <p>Last updated: {lastUpdated || 'N/A'}</p>
        </section>

        {loading ? (
          <div className="empty-state">Loading markets...</div>
        ) : error ? (
          <div className="empty-state error-state">{error}</div>
        ) : (
          <>
            <main className="dashboard-main">
              <section className="panel list-panel">
                <div className="panel-header">
                  <h2>Markets</h2>
                  <p>Keyword matches across loaded results</p>
                </div>

                <div className="market-list">
                  {filteredMarkets.map((market) => {
                    const isSelected = market.ticker === selectedMarket?.ticker;

                    return (
                      <button
                        key={market.ticker}
                        type="button"
                        className={`market-row ${isSelected ? 'selected' : ''}`}
                        onClick={() => setSelectedTicker(market.ticker)}
                      >
                        <div className="market-row-main">
                          <p className="ticker">{market.ticker}</p>
                          <h3>{getMarketDisplayQuestion(market)}</h3>
                        </div>

                        <div className="market-row-meta">
                          <span>Status: {market.status || 'N/A'}</span>
                          <span>Created: {formatDate(market.created_time)}</span>
                          <span>Yes ask: {formatMoney(market.yes_ask_dollars)}</span>
                          <span>Volume: {formatNumber(market.volume_fp)}</span>
                        </div>
                      </button>
                    );
                  })}

                  {filteredMarkets.length === 0 && (
                    <div className="empty-state">
                      No markets match the current keyword search.
                    </div>
                  )}
                </div>
              </section>

              <aside className="panel detail-panel">
                <div className="panel-header">
                  <h2>Selected market</h2>
                  <p>Detail view</p>
                </div>

                {selectedMarket ? (
                  <div className="detail-stack">
                    <div className="detail-block">
                      <span className="detail-label">Ticker</span>
                      <p>{selectedMarket.ticker}</p>
                    </div>

                    <div className="detail-block">
                      <span className="detail-label">Title</span>
                      <p>{selectedMarket.title}</p>
                    </div>

                    <div className="detail-grid">
                      <div className="detail-block">
                        <span className="detail-label">Status</span>
                        <p>{selectedMarket.status || 'N/A'}</p>
                      </div>

                      <div className="detail-block">
                        <span className="detail-label">Created time</span>
                        <p>{formatDate(selectedMarket.created_time)}</p>
                      </div>

                      <div className="detail-block">
                        <span className="detail-label">Close time</span>
                        <p>{formatDate(selectedMarket.close_time)}</p>
                      </div>

                      <div className="detail-block">
                        <span className="detail-label">Last price</span>
                        <p>{formatMoney(selectedMarket.last_price_dollars)}</p>
                      </div>

                      <div className="detail-block">
                        <span className="detail-label">Yes ask</span>
                        <p>{formatMoney(selectedMarket.yes_ask_dollars)}</p>
                      </div>

                      <div className="detail-block">
                        <span className="detail-label">No ask</span>
                        <p>{formatMoney(selectedMarket.no_ask_dollars)}</p>
                      </div>

                      <div className="detail-block">
                        <span className="detail-label">Volume</span>
                        <p>{formatNumber(selectedMarket.volume_fp)}</p>
                      </div>

                      <div className="detail-block">
                        <span className="detail-label">Liquidity</span>
                        <p>{formatMoney(selectedMarket.liquidity_dollars)}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="empty-state">No market selected.</div>
                )}
              </aside>
            </main>

            <section className="pagination-row">
              <button
                type="button"
                className="ghost-button"
                onClick={goToPreviousPage}
                disabled={cursorHistory.length === 0}
              >
                Previous
              </button>

              <button
                type="button"
                className="primary-button"
                onClick={goToNextPage}
                disabled={!nextCursor}
              >
                Next
              </button>
            </section>
          </>
        )}
      </div>
    </div>
  );
}

export default App;