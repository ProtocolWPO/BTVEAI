import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const required = [
  "site/index.html",
  "site/markets.html",
  "site/styles.css",
  "site/app.js",
  "site/markets.js",
  "site/data/market.json",
  ".github/workflows/deploy-pages.yml",
  ".github/workflows/update-data.yml"
];

for (const file of required) await access(path.join(root, file));

const market = JSON.parse(await readFile(path.join(root, "site/data/market.json"), "utf8"));
if (!Array.isArray(market.bitcoin) || !market.bitcoin.length) throw new Error("Missing Bitcoin market data");
if (!Array.isArray(market.ai) || !market.ai.length) throw new Error("Missing AI market data");
console.log(`Validated ${market.bitcoin.length} Bitcoin assets, ${market.ai.length} AI assets, and all website files.`);

