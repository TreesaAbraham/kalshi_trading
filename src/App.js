import { useEffect, useMemo, useState } from 'react';
import './App.css';

const BASE_URL = 'https://api.elections.kalshi.com/trade-api/v2/markets';

function formatMoney(value) {
  const num = Number(value);
  if (Number.isNaN(num)) return 'N/A';
  return `$${num.toFixed(2)}`;
}

function formatNumber(value) {
  const num = Number(value);
  if (Number.isNaN(num)) return 'N/A';
  return num.toLocaleString();
}

function formatDate(value) {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleString();
}

function getUtcDayRange(dateString) {
  if (!dateString) return null;

  const start = new Date(`${dateString}T00:00:00Z`);
  const end = new Date(`${dateString}T23:59:59Z`);

  return {
    minTs: Math.floor(start.getTime() / 1000),
    maxTs: Math.floor(end.getTime() / 1000),
  };
}

function normalizeStatus(status) {
  return (status || '').toLowerCase();
}

function matchesStatus(marketStatus, selectedStatus) {
  if (selectedStatus === 'all') return true;

  const normalized = normalizeStatus(marketStatus);

  if (selectedStatus === 'open') {
    return normalized === 'open' || normalized === 'active';
  }

  return normalized === selectedStatus;
}

function App() {
  const [markets, setMarkets] = useState([]);
  const [selectedTicker, setSelectedTicker] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const [draftCreatedDate, setDraftCreatedDate] = useState('');
  const [draftStatus, setDraftStatus] = useState('all');

  const [appliedCreatedDate, setAppliedCreatedDate] = useState('');
  const [appliedStatus, setAppliedStatus] = useState('all');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState('');
  const [nextCursor, setNextCursor] = useState('');
  const [cursorHistory, setCursorHistory] = useState([]);
  const [currentCursor, setCurrentCursor] = useState('');

  async function loadMarkets(cursorValue = '', createdDateValue = appliedCreatedDate, statusValue = appliedStatus) {
    try {
      setLoading(true);
      setError('');

      const params = new URLSearchParams();
      params.set('limit', '200');
      params.set('mve_filter', 'exclude');

      const dayRange = getUtcDayRange(createdDateValue);

      if (dayRange) {
        params.set('min_created_ts', String(dayRange.minTs));
        params.set('max_created_ts', String(dayRange.maxTs));
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
      const matchesText =
        (market.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (market.ticker || '').toLowerCase().includes(searchTerm.toLowerCase());

      const matchesChosenStatus = matchesStatus(market.status, appliedStatus);

      return matchesText && matchesChosenStatus;
    });
  }, [markets, searchTerm, appliedStatus]);

  const selectedMarket =
    filteredMarkets.find((market) => market.ticker === selectedTicker) ||
    filteredMarkets[0] ||
    null;

  function applyFilters() {
    setAppliedCreatedDate(draftCreatedDate);
    setAppliedStatus(draftStatus);
    setCursorHistory([]);
    setCurrentCursor('');
    loadMarkets('', draftCreatedDate, draftStatus);
  }

  function clearFilters() {
    setDraftCreatedDate('');
    setDraftStatus('all');
    setAppliedCreatedDate('');
    setAppliedStatus('all');
    setSearchTerm('');
    setCursorHistory([]);
    setCurrentCursor('');
    loadMarkets('', '', 'all');
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
    const newHistory = cursorHistory.slice(0, -1);

    setCursorHistory(newHistory);
    setCurrentCursor(previousCursor);
    loadMarkets(previousCursor);
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-shell">
        <header className="topbar">
          <div>
            <p className="eyebrow">Kalshi Trading</p>
            <h1>Market Monitoring Dashboard</h1>
            <p className="subtext">
              Filter by created date, search loaded results, and inspect market status without
              trying to dump every Kalshi market into your browser.
            </p>
          </div>
        </header>

        <section className="toolbar">
          <div className="control-group">
            <label htmlFor="search">Search loaded results</label>
            <input
              id="search"
              type="text"
              placeholder="Search by title or ticker"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="control-group">
            <label htmlFor="createdDate">Created on (UTC date)</label>
            <input
              id="createdDate"
              type="date"
              value={draftCreatedDate}
              onChange={(e) => setDraftCreatedDate(e.target.value)}
            />
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
            <span className="summary-label">Loaded this page</span>
            <strong>{loading ? '...' : markets.length}</strong>
          </article>

          <article className="summary-card">
            <span className="summary-label">Shown after filters</span>
            <strong>{loading ? '...' : filteredMarkets.length}</strong>
          </article>

          <article className="summary-card">
            <span className="summary-label">Created date</span>
            <strong>{appliedCreatedDate || 'Any'}</strong>
          </article>

          <article className="summary-card">
            <span className="summary-label">Last updated</span>
            <strong className="small-strong">{lastUpdated || 'Waiting...'}</strong>
          </article>
        </section>

        <section className="paging-bar">
          <button
            type="button"
            className="ghost-button"
            onClick={goToPreviousPage}
            disabled={loading || cursorHistory.length === 0}
          >
            Previous page
          </button>

          <button
            type="button"
            className="ghost-button"
            onClick={goToNextPage}
            disabled={loading || !nextCursor}
          >
            Next page
          </button>
        </section>

        {loading && <div className="message-box">Loading markets...</div>}

        {error && !loading && (
          <div className="error-box">
            <strong>Fetch failed.</strong>
            <p>{error}</p>
          </div>
        )}

        {!loading && !error && (
          <main className="content-grid">
            <section className="panel">
              <div className="panel-header">
                <h2>Market list</h2>
                <p>{filteredMarkets.length} shown</p>
              </div>

              <div className="market-list">
                {filteredMarkets.map((market) => (
                  <button
                    key={market.ticker}
                    type="button"
                    className={
                      selectedMarket?.ticker === market.ticker
                        ? 'market-row selected'
                        : 'market-row'
                    }
                    onClick={() => setSelectedTicker(market.ticker)}
                  >
                    <div className="market-row-main">
                      <p className="ticker">{market.ticker}</p>
                      <h3>{market.title}</h3>
                    </div>

                    <div className="market-row-meta">
                      <span>Status: {market.status || 'N/A'}</span>
                      <span>Created: {formatDate(market.created_time)}</span>
                      <span>Yes ask: {formatMoney(market.yes_ask_dollars)}</span>
                      <span>Volume: {formatNumber(market.volume_fp)}</span>
                    </div>
                  </button>
                ))}

                {filteredMarkets.length === 0 && (
                  <div className="empty-state">No markets match the current filters.</div>
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
        )}
      </div>
    </div>
  );
}

export default App;