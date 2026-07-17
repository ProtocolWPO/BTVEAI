# BTVEAI vote API

Cloudflare Worker with a Cloudflare D1 SQLite database.

- Global Bitcoin vs AI totals.
- One accepted vote per browser identifier per UTC day.
- Daily IP abuse ceiling without storing raw IP addresses.
- CORS restricted to the production domains and GitHub Pages fallback.

Run `schema.sql` once in D1, deploy with Wrangler, then set `VOTE_SECRET`
with `wrangler secret put VOTE_SECRET`.
