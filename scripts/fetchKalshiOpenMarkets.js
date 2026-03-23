const fs = require('fs');
const path = require('path');

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithRetry(url, maxRetries = 6) {
  let attempt = 0;

  while (true) {
    const response = await fetch(url);

    if (response.ok) {
      return response;
    }

    if (response.status === 429 && attempt < maxRetries) {
      const waitMs = Math.min(1000 * 2 ** attempt, 15000);
      console.log(`Hit rate limit (429). Waiting ${waitMs}ms before retry...`);
      await sleep(waitMs);
      attempt++;
      continue;
    }

    throw new Error(`HTTP ${response.status} ${response.statusText}`);
  }
}

async function fetchOpenMarketsByPage() {
  let cursor = '';
  let page = 1;
  let totalSaved = 0;

  const outputDir = path.join(__dirname, '..', 'data', 'kalshi_open_pages');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // March 17, 2025 at 00:00:00 UTC in Unix seconds
  const minCreatedTs = Math.floor(new Date('2025-03-17T00:00:00Z').getTime() / 1000);

  try {
    while (true) {
      let url =
        `https://api.elections.kalshi.com/trade-api/v2/markets` +
        `?limit=100` +
        `&status=open` +
        `&min_created_ts=${minCreatedTs}`;

      if (cursor) {
        url += `&cursor=${encodeURIComponent(cursor)}`;
      }

      const response = await fetchWithRetry(url);
      const data = await response.json();

      const markets = Array.isArray(data.markets) ? data.markets : [];

      const pageFile = path.join(
        outputDir,
        `open_markets_page_${String(page).padStart(4, '0')}.json`
      );
      fs.writeFileSync(pageFile, JSON.stringify(markets, null, 2));

      totalSaved += markets.length;

      console.log(
        `Page ${page}: saved ${markets.length} open markets to ${path.basename(pageFile)} | total saved ${totalSaved}`
      );

      if (!data.cursor) {
        break;
      }

      cursor = data.cursor;
      page += 1;

      await sleep(350);
    }

    console.log(`Finished. Saved ${totalSaved} open markets across ${page} pages.`);
  } catch (error) {
    console.error('Error while paginating open Kalshi markets:', error.message);
    throw error;
  }
}

fetchOpenMarketsByPage().catch(err => {
  console.error('Failed to fetch open Kalshi markets:', err.message);
});