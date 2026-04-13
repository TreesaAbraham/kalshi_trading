import { useEffect, useMemo, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
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

function isComboMarket(market) {
  const hasSelectedLegs =
    Array.isArray(market.mve_selected_legs) && market.mve_selected_legs.length > 0;

  const hasCollectionTicker =
    typeof market.mve_collection_ticker === 'string' &&
    market.mve_collection_ticker.trim() !== '';

  return hasSelectedLegs || hasCollectionTicker;
}

function parseTickerDate(token) {
  const match = token.match(/^(\d{2})([A-Z]{3})(\d{2})$/);
  if (!match) return '';

  const [, yy, mon, dd] = match;
  const monthMap = {
    JAN: 'Jan',
    FEB: 'Feb',
    MAR: 'Mar',
    APR: 'Apr',
    MAY: 'May',
    JUN: 'Jun',
    JUL: 'Jul',
    AUG: 'Aug',
    SEP: 'Sep',
    OCT: 'Oct',
    NOV: 'Nov',
    DEC: 'Dec',
  };

  const month = monthMap[mon];
  if (!month) return '';

  return `${month} ${Number(dd)}, 20${yy}`;
}

function humanizeTickerPrefix(prefix) {
  const known = [
    { key: 'KXSPOTIFYAUSTRALIAD', label: 'Spotify Australia daily chart market' },
    { key: 'KXSPOTIFYAUSTRALIA', label: 'Spotify Australia market' },
    { key: 'KXSPOTIFY', label: 'Spotify market' },
    { key: 'KXNBAGAME', label: 'NBA game winner market' },
    { key: 'KXNBAPTS', label: 'NBA player points market' },
    { key: 'KXNBAREB', label: 'NBA rebounds market' },
    { key: 'KXNBAAST', label: 'NBA assists market' },
    { key: 'KXNBATOTAL', label: 'NBA total points market' },
    { key: 'KXNBASPREAD', label: 'NBA spread market' },
    { key: 'KXNCAAMBGAME', label: 'NCAA men’s game winner market' },
    { key: 'KXNCAAWBGAME', label: 'NCAA women’s game winner market' },
    { key: 'KXUFCFIGHT', label: 'UFC fight winner market' },
    { key: 'KXATPMATCH', label: 'ATP match winner market' },
    { key: 'KXWTAMATCH', label: 'WTA match winner market' },
    { key: 'KXNHLGAME', label: 'NHL game winner market' },
  ];

  const match = known.find((item) => prefix.startsWith(item.key));
  if (match) return match.label;

  return prefix
    .replace(/^KX/, '')
    .replace(/([A-Z]+)(\d+)/g, '$1 $2')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .toLowerCase();
}

function getEventContextFromTicker(market) {
  const raw = market.event_ticker || market.ticker || '';
  if (!raw) return 'Single market';

  const parts = raw.split('-');
  if (parts.length === 0) return raw;

  const prefix = parts[0];
  const dateToken = parts.find((part) => /^\d{2}[A-Z]{3}\d{2}$/.test(part));
  const label = humanizeTickerPrefix(prefix);
  const parsedDate = dateToken ? parseTickerDate(dateToken) : '';

  if (parsedDate) {
    return `${label} · ${parsedDate}`;
  }

  return label;
}

function getOutcomeLabel(market) {
  return (
    market.subtitle ||
    market.title ||
    market.yes_sub_title ||
    market.no_sub_title ||
    'Untitled outcome'
  );
}

function getSuggestionLabel(market) {
  const context = getEventContextFromTicker(market);
  const outcome = getOutcomeLabel(market);
  return `${context} · ${outcome}`;
}

function matchesMarketScope(market, scope) {
  const combo = isComboMarket(market);

  if (scope === 'combo') return combo;
  if (scope === 'single') return !combo;

  return true;
}

function formatChartDate(tsSeconds) {
  const date = new Date(tsSeconds * 1000);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

function getCandlestickInterval(startMs, endMs) {
  const spanMs = endMs - startMs;
  const oneDay = 24 * 60 * 60 * 1000;
  const sevenDays = 7 * oneDay;

  if (spanMs <= oneDay) return 1;
  if (spanMs <= sevenDays) return 60;
  return 1440;
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
  const [draftMarketScope, setDraftMarketScope] = useState('single');

  const [appliedDateMode, setAppliedDateMode] = useState('all');
  const [appliedCreatedDate, setAppliedCreatedDate] = useState('');
  const [appliedCreatedMonth, setAppliedCreatedMonth] = useState('');
  const [appliedStatus, setAppliedStatus] = useState('all');
  const [appliedMarketScope, setAppliedMarketScope] = useState('single');

  const [showSuggestions, setShowSuggestions] = useState(false);

  const [historyData, setHistoryData] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');

  async function loadMarkets(
    cursorValue = '',
    dateModeValue = appliedDateMode,
    createdDateValue = appliedCreatedDate,
    createdMonthValue = appliedCreatedMonth,
    statusValue = appliedStatus,
    marketScopeValue = appliedMarketScope
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
        const visibleMarkets = marketList.filter((market) =>
          matchesMarketScope(market, marketScopeValue)
        );

        const stillExists = visibleMarkets.some(
          (market) => market.ticker === prevTicker
        );

        return stillExists ? prevTicker : visibleMarkets[0]?.ticker || '';
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

  async function loadMarketHistory(market) {
    if (!market?.ticker) {
      setHistoryData([]);
      setHistoryError('');
      return;
    }
  
    try {
      setHistoryLoading(true);
      setHistoryError('');
  
      const startMs = new Date(
        market.open_time || market.created_time || Date.now()
      ).getTime();
      const endMs = Date.now();
  
      const startTs = Math.floor(startMs / 1000);
      const endTs = Math.floor(endMs / 1000);
      const periodInterval = getCandlestickInterval(startMs, endMs);
  
      const rootUrl = BASE_URL.replace('/markets', '');
      let data = null;
  
      if (market.series_ticker) {
        const liveParams = new URLSearchParams({
          start_ts: String(startTs),
          end_ts: String(endTs),
          period_interval: String(periodInterval),
        });
  
        const liveUrl = `${rootUrl}/series/${market.series_ticker}/markets/${market.ticker}/candlesticks?${liveParams.toString()}`;
        const liveResponse = await fetch(liveUrl);
  
        if (liveResponse.ok) {
          data = await liveResponse.json();
        }
      }
  
      if (!data) {
        const batchParams = new URLSearchParams({
          market_tickers: market.ticker,
          start_ts: String(startTs),
          end_ts: String(endTs),
          period_interval: String(periodInterval),
        });
  
        const batchUrl = `${rootUrl}/markets/candlesticks?${batchParams.toString()}`;
        const batchResponse = await fetch(batchUrl);
  
        if (batchResponse.ok) {
          data = await batchResponse.json();
        }
      }
  
      if (!data) {
        const historicalParams = new URLSearchParams({
          start_ts: String(startTs),
          end_ts: String(endTs),
          period_interval: String(periodInterval),
        });
  
        const historicalUrl = `${rootUrl}/historical/markets/${market.ticker}/candlesticks?${historicalParams.toString()}`;
        const historicalResponse = await fetch(historicalUrl);
  
        if (historicalResponse.ok) {
          data = await historicalResponse.json();
        }
      }
  
      if (!data) {
        throw new Error('No candlestick source returned usable data.');
      }
  
      let candlesticks = [];
  
      if (Array.isArray(data.candlesticks)) {
        candlesticks = data.candlesticks;
      } else if (Array.isArray(data.markets) && data.markets.length > 0) {
        const batchMarket =
          data.markets.find(
            (item) =>
              item.ticker === market.ticker || item.market_ticker === market.ticker
          ) || data.markets[0];
  
        candlesticks = Array.isArray(batchMarket?.candlesticks)
          ? batchMarket.candlesticks
          : [];
      }
  
      const chartPoints = candlesticks.map((candle) => {
        const yesClose =
          Number(
            candle.price?.close_dollars ??
              candle.price?.close ??
              candle.yes_ask?.close_dollars ??
              candle.yes_ask?.close
          ) || 0;
  
        const clampedYes = Math.max(0, Math.min(1, yesClose));
        const noClose = 1 - clampedYes;
  
        return {
          ts: candle.end_period_ts,
          dateLabel: formatChartDate(candle.end_period_ts),
          yesPct: Number((clampedYes * 100).toFixed(2)),
          noPct: Number((noClose * 100).toFixed(2)),
        };
      });
  
      setHistoryData(chartPoints);
    } catch (err) {
      setHistoryData([]);
      setHistoryError(err.message || 'Failed to load market history.');
    } finally {
      setHistoryLoading(false);
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
      const matchesChosenScope = matchesMarketScope(market, appliedMarketScope);

      return matchesText && matchesChosenStatus && matchesChosenScope;
    });
  }, [markets, searchTerm, appliedStatus, appliedMarketScope]);

  const autocompleteSuggestions = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return [];

    const seen = new Set();
    const suggestions = [];

    for (const market of markets) {
      if (!matchesMarketScope(market, appliedMarketScope)) continue;
      if (!matchesStatus(market.status, appliedStatus)) continue;
      if (!matchesKeywordSearch(market, query)) continue;
      if (seen.has(market.ticker)) continue;

      suggestions.push({
        ticker: market.ticker,
        title: getSuggestionLabel(market),
        status: market.status || 'N/A',
      });
      seen.add(market.ticker);

      if (suggestions.length >= MAX_SUGGESTIONS) {
        break;
      }
    }

    return suggestions;
  }, [markets, searchTerm, appliedStatus, appliedMarketScope]);

  const selectedMarket = useMemo(() => {
    return filteredMarkets.find((market) => market.ticker === selectedTicker) || null;
  }, [filteredMarkets, selectedTicker]);

  useEffect(() => {
    if (!selectedMarket) {
      setHistoryData([]);
      setHistoryError('');
      return;
    }

    loadMarketHistory(selectedMarket);
  }, [selectedMarket]);

  const now = Date.now();

  const closingIn24HoursCount = filteredMarkets.filter((market) => {
    const closeTime = new Date(market.close_time).getTime();
    if (Number.isNaN(closeTime)) return false;
    return closeTime >= now && closeTime <= now + TWENTY_FOUR_HOURS_MS;
  }).length;

  const highVolumeCount = filteredMarkets.filter((market) => {
    return Number(market.volume_fp) >= HIGH_VOLUME_THRESHOLD;
  }).length;

  const highCertaintyCount = filteredMarkets.filter((market) => {
    const yesAsk = Number(market.yes_ask_dollars);
    return !Number.isNaN(yesAsk) && yesAsk >= HIGH_CERTAINTY_THRESHOLD;
  }).length;

  const lowCertaintyCount = filteredMarkets.filter((market) => {
    const yesAsk = Number(market.yes_ask_dollars);
    return (
      !Number.isNaN(yesAsk) &&
      yesAsk >= LOW_CERTAINTY_LOWER &&
      yesAsk <= LOW_CERTAINTY_UPPER
    );
  }).length;

  const hasEnoughHistory = historyData.length >= 2;

  function applyFilters() {
    setAppliedDateMode(draftDateMode);
    setAppliedCreatedDate(draftCreatedDate);
    setAppliedCreatedMonth(draftCreatedMonth);
    setAppliedStatus(draftStatus);
    setAppliedMarketScope(draftMarketScope);
    setCursorHistory([]);
    setCurrentCursor('');
    setShowSuggestions(false);

    loadMarkets(
      '',
      draftDateMode,
      draftCreatedDate,
      draftCreatedMonth,
      draftStatus,
      draftMarketScope
    );
  }

  function clearFilters() {
    setDraftDateMode('all');
    setDraftCreatedDate('');
    setDraftCreatedMonth('');
    setDraftStatus('all');
    setDraftMarketScope('single');

    setAppliedDateMode('all');
    setAppliedCreatedDate('');
    setAppliedCreatedMonth('');
    setAppliedStatus('all');
    setAppliedMarketScope('single');

    setSearchTerm('');
    setCursorHistory([]);
    setCurrentCursor('');
    setShowSuggestions(false);

    loadMarkets('', 'all', '', '', 'all', 'single');
  }

  function goToNextPage() {
    if (!nextCursor) return;
    setCursorHistory((prev) => [...prev, currentCursor]);
    setCurrentCursor(nextCursor);
    loadMarkets(nextCursor);
  }

  function goToPreviousPage() {
    if (cursorHistory.length === 0) return;

    const previousCursor = cursorHistory[cursorHistory.length - 1];
    const nextHistory = cursorHistory.slice(0, -1);

    setCursorHistory(nextHistory);
    setCurrentCursor(previousCursor);
    loadMarkets(previousCursor);
  }

  function handleSuggestionSelect(suggestion) {
    setSearchTerm(suggestion.title);
    setSelectedTicker(suggestion.ticker);
    setShowSuggestions(false);
  }

  return (
    <div className="App">
      <div className="app-shell">
        <header className="hero-section">
          <div>
            <p className="eyebrow">Kalshi Market Dashboard</p>
            <h1>Explore active prediction markets</h1>
            <p className="hero-copy">
              Filter by created date, keyword, status, and now market type so combo
              markets stop disappearing into the void.
            </p>
          </div>
        </header>

        <section className="controls-panel">
          <div className="control-row">
            <div className="control-group search-group">
              <label htmlFor="marketSearch">Search markets</label>
              <input
                id="marketSearch"
                type="text"
                placeholder="Search by title, ticker, or subtitle"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => {
                  setTimeout(() => setShowSuggestions(false), 150);
                }}
              />

              {showSuggestions && autocompleteSuggestions.length > 0 && (
                <div className="autocomplete-menu">
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

          <div className="control-group">
            <label htmlFor="marketScope">Market type</label>
            <select
              id="marketScope"
              value={draftMarketScope}
              onChange={(e) => setDraftMarketScope(e.target.value)}
            >
              <option value="single">Single markets only</option>
              <option value="combo">Combo markets only</option>
              <option value="all">All markets</option>
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
                  <p>Context first, contract outcome second</p>
                </div>

                <div className="market-list">
                  {filteredMarkets.map((market) => {
                    const isSelected = market.ticker === selectedMarket?.ticker;
                    const eventContext = getEventContextFromTicker(market);
                    const outcomeLabel = getOutcomeLabel(market);
                    const marketTypeLabel = isComboMarket(market) ? 'Combo' : 'Single';

                    return (
                      <button
                        key={market.ticker}
                        type="button"
                        className={`market-row ${isSelected ? 'selected' : ''}`}
                        onClick={() => setSelectedTicker(market.ticker)}
                      >
                        <div className="market-row-main">
                          <p className="ticker">{eventContext}</p>
                          <h3>{outcomeLabel}</h3>
                        </div>

                        <div className="market-row-meta">
                          <span>Status: {market.status || 'N/A'}</span>
                          <span>Type: {marketTypeLabel}</span>
                          <span>Created: {formatDate(market.created_time)}</span>
                          <span>Yes ask: {formatMoney(market.yes_ask_dollars)}</span>
                          <span>Volume: {formatNumber(market.volume_fp)}</span>
                        </div>
                      </button>
                    );
                  })}

                  {filteredMarkets.length === 0 && (
                    <div className="empty-state">
                      No single markets match the current keyword search.
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
                      <span className="detail-label">Market context</span>
                      <p>{getEventContextFromTicker(selectedMarket)}</p>
                    </div>

                    <div className="detail-block">
                      <span className="detail-label">Outcome</span>
                      <p>{getOutcomeLabel(selectedMarket)}</p>
                    </div>

                    <div className="detail-block">
                      <span className="detail-label">Ticker</span>
                      <p>{selectedMarket.ticker}</p>
                    </div>

                    <div className="detail-block">
                      <span className="detail-label">Badges</span>
                      <p>
                        {isComboMarket(selectedMarket) ? 'Combo market' : 'Single market'}
                        {!hasEnoughHistory && historyData.length > 0 ? ' · Sparse history' : ''}
                      </p>
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

                    <div className="detail-block">
                      <span className="detail-label">Price history</span>

                      {historyLoading ? (
                        <p>Loading chart...</p>
                      ) : historyError ? (
                        <p>{historyError}</p>
                      ) : historyData.length === 0 ? (
                        <p>No historical price data available.</p>
                      ) : !hasEnoughHistory ? (
                        <p>Only one historical data point is available for this market.</p>
                      ) : (
                        <div style={{ width: '100%', height: 300, minWidth: 0 }}>
                          <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={historyData}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="dateLabel" />
                              <YAxis domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
                              <Tooltip formatter={(value) => `${value}%`} />
                              <Line
                                type="monotone"
                                dataKey="yesPct"
                                name="Yes"
                                stroke="#10b981"
                                dot={false}
                                strokeWidth={2}
                              />
                              <Line
                                type="monotone"
                                dataKey="noPct"
                                name="No"
                                stroke="#2563eb"
                                dot={false}
                                strokeWidth={2}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      )}
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