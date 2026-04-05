import { useMemo, useState } from 'react';
import './App.css';

const MOCK_MARKETS = [
  {
    ticker: 'KXPOLL-TRUMP2028',
    title: 'Will Trump run for president in 2028?',
    status: 'active',
    yes_ask_dollars: '0.41',
    no_ask_dollars: '0.61',
    volume_fp: '15234.00',
    close_time: '2028-11-05T00:00:00Z',
    liquidity_dollars: '8700.00',
  },
  {
    ticker: 'KXSPRT-NBAFINALS',
    title: 'Will the Lakers win the NBA Finals?',
    status: 'active',
    yes_ask_dollars: '0.27',
    no_ask_dollars: '0.74',
    volume_fp: '9832.00',
    close_time: '2026-06-20T00:00:00Z',
    liquidity_dollars: '6300.00',
  },
  {
    ticker: 'KXECON-RECESSION26',
    title: 'Will the US enter a recession in 2026?',
    status: 'active',
    yes_ask_dollars: '0.58',
    no_ask_dollars: '0.43',
    volume_fp: '22011.00',
    close_time: '2026-12-31T00:00:00Z',
    liquidity_dollars: '12100.00',
  },
  {
    ticker: 'KXCULT-OSCARBESTPIC',
    title: 'Will Dune win Best Picture?',
    status: 'inactive',
    yes_ask_dollars: '0.18',
    no_ask_dollars: '0.83',
    volume_fp: '4100.00',
    close_time: '2026-03-15T00:00:00Z',
    liquidity_dollars: '1900.00',
  },
  {
    ticker: 'KXTECH-AIIPO',
    title: 'Will OpenAI go public before 2027?',
    status: 'active',
    yes_ask_dollars: '0.32',
    no_ask_dollars: '0.69',
    volume_fp: '17654.00',
    close_time: '2026-12-31T00:00:00Z',
    liquidity_dollars: '9400.00',
  },
  {
    ticker: 'KXCRYPTO-BTC150K',
    title: 'Will Bitcoin hit $150k in 2026?',
    status: 'active',
    yes_ask_dollars: '0.36',
    no_ask_dollars: '0.65',
    volume_fp: '28765.00',
    close_time: '2026-12-31T00:00:00Z',
    liquidity_dollars: '15800.00',
  },
];

function formatMoney(value) {
  const num = Number(value);
  if (Number.isNaN(num)) return 'N/A';
  return `$${num.toFixed(2)}`;
}

function formatWholeMoney(value) {
  const num = Number(value);
  if (Number.isNaN(num)) return 'N/A';
  return `$${num.toLocaleString()}`;
}

function formatDate(dateString) {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleString();
}

function App() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedTicker, setSelectedTicker] = useState(MOCK_MARKETS[0].ticker);

  const filteredMarkets = useMemo(() => {
    return MOCK_MARKETS.filter((market) => {
      const matchesSearch =
        market.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        market.ticker.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        statusFilter === 'all' ? true : market.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [searchTerm, statusFilter]);

  const selectedMarket =
    filteredMarkets.find((market) => market.ticker === selectedTicker) ||
    filteredMarkets[0] ||
    null;

  const activeCount = MOCK_MARKETS.filter((market) => market.status === 'active').length;
  const highVolumeCount = MOCK_MARKETS.filter(
    (market) => Number(market.volume_fp) >= 15000
  ).length;
  const aboveFiftyYesCount = MOCK_MARKETS.filter(
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
              First useful interface. Built to monitor markets, not to win awards for
              pretending to be finished.
            </p>
          </div>

          <div className="topbar-actions">
            <button className="ghost-button" type="button">
              Refresh later
            </button>
          </div>
        </header>

        <section className="summary-grid">
          <article className="summary-card">
            <span className="summary-label">Total markets</span>
            <strong>{MOCK_MARKETS.length}</strong>
          </article>

          <article className="summary-card">
            <span className="summary-label">Active markets</span>
            <strong>{activeCount}</strong>
          </article>

          <article className="summary-card">
            <span className="summary-label">High volume</span>
            <strong>{highVolumeCount}</strong>
          </article>

          <article className="summary-card">
            <span className="summary-label">Yes ask ≥ $0.50</span>
            <strong>{aboveFiftyYesCount}</strong>
          </article>
        </section>

        <section className="toolbar">
          <div className="control-group">
            <label htmlFor="search">Search</label>
            <input
              id="search"
              type="text"
              placeholder="Search by title or ticker"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="control-group">
            <label htmlFor="status">Status</label>
            <select
              id="status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </section>

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
                    <span>{market.status}</span>
                    <span>Yes: {formatMoney(market.yes_ask_dollars)}</span>
                    <span>Vol: {formatWholeMoney(market.volume_fp)}</span>
                  </div>
                </button>
              ))}

              {filteredMarkets.length === 0 && (
                <div className="empty-state">
                  No markets match this filter.
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
                    <p>{selectedMarket.status}</p>
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
                    <span className="detail-label">Volume</span>
                    <p>{formatWholeMoney(selectedMarket.volume_fp)}</p>
                  </div>

                  <div className="detail-block">
                    <span className="detail-label">Liquidity</span>
                    <p>{formatWholeMoney(selectedMarket.liquidity_dollars)}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="empty-state">Select a market to inspect it.</div>
            )}
          </aside>
        </main>
      </div>
    </div>
  );
}

export default App;