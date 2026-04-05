import './App.css';

const featureCards = [
  {
    title: 'Market browsing',
    text: 'A real landing page for exploring Kalshi markets instead of the default React placeholder.',
  },
  {
    title: 'Frontend-first proof',
    text: 'This shell is built so the next step can plug directly into public market-data fetching.',
  },
  {
    title: 'No browser auth',
    text: 'Private keys stay out of the frontend. We are not doing anything reckless for the sake of speed.',
  },
];

function App() {
  return (
    <div className="app-shell">
      <header className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Kalshi Trading</p>
          <h1>Explore prediction markets without the starter-app garbage.</h1>
          <p className="hero-text">
            This is the first real frontend shell for the project. Today’s goal is simple:
            stop looking like a demo app and start looking like a market explorer.
          </p>

          <div className="hero-actions">
            <button type="button" className="primary-btn">
              Market browser coming next
            </button>
            <button type="button" className="secondary-btn">
              Public API wiring is step 2
            </button>
          </div>
        </div>

        <aside className="hero-panel">
          <div className="status-card">
            <p className="status-label">Current status</p>
            <h2>Frontend shell ready</h2>
            <p>
              No authentication in the browser. No backend detour. Just a clean UI foundation
              for public market data.
            </p>
          </div>

          <div className="mini-grid">
            <div className="mini-card">
              <span className="mini-label">Data source</span>
              <strong>Kalshi market data</strong>
            </div>
            <div className="mini-card">
              <span className="mini-label">Auth</span>
              <strong>Not in frontend</strong>
            </div>
            <div className="mini-card">
              <span className="mini-label">Phase</span>
              <strong>Step 1 of 5</strong>
            </div>
          </div>
        </aside>
      </header>

      <main className="main-content">
        <section className="section-block">
          <div className="section-heading">
            <p className="section-kicker">What this version does</p>
            <h2>It gives the project a real face</h2>
          </div>

          <div className="card-grid">
            {featureCards.map((card) => (
              <article key={card.title} className="feature-card">
                <h3>{card.title}</h3>
                <p>{card.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section-block two-column">
          <article className="info-card">
            <p className="section-kicker">Today’s win</p>
            <h3>We are deleting the default demo vibe</h3>
            <p>
              When this page loads, it should feel like the beginning of a real product, not a
              tutorial somebody forgot to close.
            </p>
          </article>

          <article className="info-card">
            <p className="section-kicker">Next up</p>
            <h3>Public market fetch</h3>
            <p>
              Once this shell is in place, the next step is wiring in direct frontend fetching
              from public endpoints and showing actual market data.
            </p>
          </article>
        </section>
      </main>
    </div>
  );
}

export default App;