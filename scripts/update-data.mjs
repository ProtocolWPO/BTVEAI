import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(root, "site", "data");
const marketPath = path.join(dataDir, "market.json");

const universes = {
  bitcoin: ["bitcoin-ecosystem", "bitcoin-layer-2", "bitcoin-fork", "brc-20", "runes", "bitcoin-meme"],
  ai: ["artificial-intelligence", "ai-agents", "ai-applications", "ai-framework", "ai-agent-launchpad", "ai-meme-coins"]
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function requestJson(url, options = {}, retries = 4) {
  for (let attempt = 0; attempt < retries; attempt += 1) {
    const response = await fetch(url, {
      ...options,
      headers: { accept: "application/json", "user-agent": "BTVEAI-GitHub-Pages/1.0", ...(options.headers || {}) }
    });
    if (response.ok) return response.json();
    if (![429, 500, 502, 503, 504].includes(response.status) || attempt === retries - 1) {
      throw new Error(`${response.status} ${response.statusText}: ${url}`);
    }
    await sleep((attempt + 1) * 5000);
  }
}

function normalizeAsset(asset, categories) {
  return {
    id: asset.id,
    symbol: String(asset.symbol || "").toUpperCase(),
    name: asset.name,
    image: asset.image,
    price: Number(asset.current_price || 0),
    marketCap: Number(asset.market_cap || 0),
    volume24h: Number(asset.total_volume || 0),
    change24h: Number(asset.price_change_percentage_24h || 0),
    rank: asset.market_cap_rank || null,
    categories: [...categories].sort()
  };
}

async function fetchUniverse(categoryIds) {
  const assets = new Map();
  const successfulCategories = [];

  for (const category of categoryIds) {
    let categorySucceeded = false;
    for (let page = 1; page <= 4; page += 1) {
      const url = new URL("https://api.coingecko.com/api/v3/coins/markets");
      url.searchParams.set("vs_currency", "usd");
      url.searchParams.set("category", category);
      url.searchParams.set("order", "market_cap_desc");
      url.searchParams.set("per_page", "250");
      url.searchParams.set("page", String(page));
      url.searchParams.set("sparkline", "false");
      url.searchParams.set("price_change_percentage", "24h");

      try {
        const batch = await requestJson(url);
        categorySucceeded = true;
        for (const item of batch) {
          const existing = assets.get(item.id);
          const categories = new Set(existing?.categories || []);
          categories.add(category);
          assets.set(item.id, normalizeAsset(item, categories));
        }
        if (batch.length < 250) break;
      } catch (error) {
        console.warn(`Skipped ${category}: ${error.message}`);
        break;
      }
      await sleep(6500);
    }
    if (categorySucceeded) successfulCategories.push(category);
    await sleep(6500);
  }

  return {
    assets: [...assets.values()].sort((a, b) => {
      if (a.rank && b.rank) return a.rank - b.rank;
      return b.marketCap - a.marketCap;
    }),
    successfulCategories
  };
}

async function updateMarkets() {
  const bitcoin = await fetchUniverse(universes.bitcoin);
  await sleep(6500);
  const ai = await fetchUniverse(universes.ai);
  if (!bitcoin.assets.length || !ai.assets.length) {
    throw new Error("CoinGecko returned an empty market universe; keeping the previous snapshot.");
  }
  const next = {
    updatedAt: new Date().toISOString(),
    source: "CoinGecko category snapshots",
    methodology: { bitcoin: bitcoin.successfulCategories, ai: ai.successfulCategories },
    bitcoin: bitcoin.assets,
    ai: ai.assets
  };
  await writeFile(marketPath, `${JSON.stringify(next, null, 2)}\n`);
  console.log(`Markets: ${next.bitcoin.length} Bitcoin-related, ${next.ai.length} AI-related.`);
}

try { await updateMarkets(); } catch (error) { console.warn(`Market refresh failed: ${error.message}`); }

