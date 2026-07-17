# BTVEAI â€” Bitcoin vs AI

Static bilingual website for the **Bitcoin vs AI** project, deployed with GitHub Pages.

## What is automated

- GitHub Actions publishes everything in `site/` to GitHub Pages.
- `scripts/update-data.mjs` refreshes the Bitcoin and AI market universes from CoinGecko categories.
- Anonymous daily voting is stored in each visitor's browser without requiring an account.
- Market snapshots are committed back to `site/data/` before deployment.

## Local preview

Serve the `site/` directory with any static web server. Opening the files directly also works for layout, but a local server is needed to load JSON data reliably.

## Voting

Visitors can vote once per local calendar day in each browser. The website stores the vote only in browser storage, never requests an account, and never exposes credentials. Because GitHub Pages has no database, clearing browser data or switching browsers resets this limit and tallies are local to that browser.

## Disclaimer

BTVEAI is an independent community project. It is not affiliated with Bitcoin, CoinGecko, GitHub, or any listed token. Market data is informational and not financial advice.

