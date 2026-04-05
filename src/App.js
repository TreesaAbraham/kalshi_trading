import { useEffect, useMemo, useState } from 'react';
import './App.css';

const API_URL =
  'https://api.elections.kalshi.com/trade-api/v2/markets?status=open&limit=24&mve_filter=exclude';

function formatMoney(value) {
  const num = Number(value);
  if (Number.isNaN(num)) return 'N/A';
  return `$${num.toFixed(2)}`;
}

function formatVolume(value) {
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

function App() {
  const [markets, setMarkets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTicker, setSelectedTicker] = useState('');
  const [lastUpdated, setLastUpdated] = useState('');

  async function loadMarkets(isManualRefresh = false) {
    try {
      setError('');

      if (isManualRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const response = await fetch(API_URL);

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const data = await response.json();
      const fetchedMarkets = Array.isArray(data.markets) ? data.markets : [];

      setMarkets(fetchedMarkets);
      setLastUpdated(new Date().toLocaleString());

      if (fetchedMarkets.length > 0) {
        setSelectedTicker((currentTicker) => {
          const stillExists = fetchedMarkets.some(
            (market) => market.ticker === currentTicker
          );
          return stillExists ? currentTicker : fetchedMarkets[0].ticker;
        });
      } else {
        setSelectedTicker('');
      }
    } catch (err) {
      setError(err.message || 'Something went wrong while fetching markets.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadMarkets();
  }, []);

  const filteredMarkets = useMemo(() => {
    return markets.filter((market) => {
      const title = market.title?.toLowerCase() || '';
      const ticker = market.ticker?.toLowerCase() || '';
      const query = searchTerm.toLowerCase();

      return title.includes(query) || ticker.includes(query);
    });
  }, [markets, searchTerm]);

  const selectedMarket =
    filteredMarkets.find((market) => market.ticker === selectedTicker) ||
    filteredMarkets[0] ||
    null;

  const activeCount = markets.filter((market) => market.status === 'open').length;
  const highVolumeCount = markets.filter(
    (market) => Number(market.volume_fp) >= 1000
  ).length;
  const yesAboveHalfCount = markets.filter(
    (market) => Number(market.yes_ask_dollars) >= 0.5
  ).length;

  return (
    <div className="dashboard-page">
      <div className="dashboard-shell">
        <header className="topbar">
          <div>
            <p className="eyebrow">Kalshi Trading</p>
            <h1>Market Monitoring Dashboard</h1>
            <p className="subtext">
              This proves the React frontend can fetch public Kalshi market data
              directly and render it in a dashboard view.
            </p>
          </div>

          <button
            className="ghost-button"
            type="button"
            onClick={() => loadMarkets(true)}
            disabled={refreshing}
          >
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </header>

        <section className="summary-grid">
          <article className="summary-card">
            <span className="summary-label">Markets loaded</span>
            <strong>{loading ? '...' : markets.length}</strong>
          </article>

          <article className="summary-card">
            <span className="summary-label">Open markets</span>
            <strong>{loading ? '...' : activeCount}</strong>
          </article>

          <article className="summary-card">
            <span className="summary-label">High volume</span>
            <strong>{loading ? '...' : highVolumeCount}</strong>
          </article>

          <article className="summary-card">
            <span className="summary-label">Yes ask ≥ $0.50</span>
            <strong>{loading ? '...' : yesAboveHalfCount}</strong>
          </article>
        </section>

        <section className="toolbar">
          <div className="control-group">
            <label htmlFor="search">Search markets</label>
            <input
              id="search"
              type="text"
              placeholder="Search by title or ticker"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="status-box">
            <span className="summary-label">Last updated</span>
            <p>{lastUpdated || 'Waiting for first fetch...'}</p>
          </div>
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
                      <span>Yes ask: {formatMoney(market.yes_ask_dollars)}</span>
                      <span>Volume: {formatVolume(market.volume_fp)}</span>
                    </div>
                  </button>
                ))}

                {filteredMarkets.length === 0 && (
                  <div className="empty-state">
                    No markets match your search.
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
                      <span className="detail-label">Close time</span>
                      <p>{formatDate(selectedMarket.close_time)}</p>
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
                      <span className="detail-label">Last price</span>
                      <p>{formatMoney(selectedMarket.last_price_dollars)}</p>
                    </div>

                    <div className="detail-block">
                      <span className="detail-label">Volume</span>
                      <p>{formatVolume(selectedMarket.volume_fp)}</p>
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