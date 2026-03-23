const fs = require("fs");
const path = require("path");

const CLOSED_DIR = path.join(__dirname, "..", "data", "kalshi_pages");
const OPEN_DIR = path.join(__dirname, "..", "data", "kalshi_open_pages");
const OUTPUT_FILE = path.join(__dirname, "..", "data", "kalshi_markets_filtered.json");

// Read every JSON file in a folder and return one big array of markets
function readMarketsFromDirectory(directoryPath, sourceLabel) {
  if (!fs.existsSync(directoryPath)) {
    console.warn(`Directory not found: ${directoryPath}`);
    return [];
  }

  const files = fs
    .readdirSync(directoryPath)
    .filter((file) => file.endsWith(".json"))
    .sort();

  const allMarkets = [];

  for (const file of files) {
    const fullPath = path.join(directoryPath, file);

    try {
      const rawText = fs.readFileSync(fullPath, "utf8");
      const parsed = JSON.parse(rawText);

      if (!Array.isArray(parsed)) {
        console.warn(`Skipping ${file}: file is not a market array`);
        continue;
      }

      for (const market of parsed) {
        allMarkets.push({
          ...market,
          source_file: file,
          source_type: sourceLabel,
        });
      }
    } catch (error) {
      console.error(`Failed to read ${file}:`, error.message);
    }
  }

  return allMarkets;
}

// Turn a raw Kalshi market object into a smaller frontend-friendly shape
function shapeMarket(market) {
  return {
    ticker: market.ticker ?? null,
    event_ticker: market.event_ticker ?? null,
    title: market.title ?? null,
    subtitle: market.subtitle ?? null,
    status: market.status ?? null,
    market_type: market.market_type ?? null,

    created_time: market.created_time ?? null,
    open_time: market.open_time ?? null,
    close_time: market.close_time ?? null,
    expiration_time: market.expiration_time ?? null,

    yes_bid_dollars: market.yes_bid_dollars ?? null,
    yes_ask_dollars: market.yes_ask_dollars ?? null,
    no_bid_dollars: market.no_bid_dollars ?? null,
    no_ask_dollars: market.no_ask_dollars ?? null,
    last_price_dollars: market.last_price_dollars ?? null,

    volume: market.volume ?? null,
    volume_24h: market.volume_24h ?? null,
    volume_fp: market.volume_fp ?? null,
    volume_24h_fp: market.volume_24h_fp ?? null,
    open_interest: market.open_interest ?? null,
    open_interest_fp: market.open_interest_fp ?? null,
    liquidity: market.liquidity ?? null,
    liquidity_dollars: market.liquidity_dollars ?? null,

    result: market.result ?? null,
    can_close_early: market.can_close_early ?? null,
    cap_strike: market.cap_strike ?? null,
    floor_strike: market.floor_strike ?? null,

    is_multileg: Array.isArray(market.mve_selected_legs) && market.mve_selected_legs.length > 0,
    has_custom_strike: market.custom_strike != null,
    source_type: market.source_type ?? null,
  };
}

// Remove duplicates by ticker
function dedupeMarkets(markets) {
  const seen = new Map();

  for (const market of markets) {
    if (!market.ticker) {
      continue;
    }

    // Last one wins if duplicates appear
    seen.set(market.ticker, market);
  }

  return Array.from(seen.values());
}

function main() {
  console.log("Reading closed market pages...");
  const closedMarkets = readMarketsFromDirectory(CLOSED_DIR, "closed");

  console.log("Reading open market pages...");
  const openMarkets = readMarketsFromDirectory(OPEN_DIR, "open");

  console.log(`Closed markets loaded: ${closedMarkets.length}`);
  console.log(`Open markets loaded: ${openMarkets.length}`);

  const combinedMarkets = [...closedMarkets, ...openMarkets];
  console.log(`Combined before dedupe: ${combinedMarkets.length}`);

  const dedupedMarkets = dedupeMarkets(combinedMarkets);
  console.log(`After dedupe: ${dedupedMarkets.length}`);

  const shapedMarkets = dedupedMarkets.map(shapeMarket);

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(shapedMarkets, null, 2), "utf8");

  console.log(`Wrote ${shapedMarkets.length} markets to: ${OUTPUT_FILE}`);
}

main();