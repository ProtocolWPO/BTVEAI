const DEFAULT_ORIGINS = [
  "https://btveai.com",
  "https://www.btveai.com",
  "https://protocolwpo.github.io"
];
const DAILY_IP_LIMIT = 50;
const VALID_VISITOR = /^[a-zA-Z0-9-]{16,80}$/;

function allowedOrigins(env) {
  return new Set((env.ALLOWED_ORIGINS || DEFAULT_ORIGINS.join(","))
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean));
}

function corsHeaders(origin, env) {
  const headers = {
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
    "Vary": "Origin"
  };
  if (origin && allowedOrigins(env).has(origin)) headers["Access-Control-Allow-Origin"] = origin;
  return headers;
}

function json(data, status, origin, env) {
  return new Response(JSON.stringify(data), {
    status,
    headers: corsHeaders(origin, env)
  });
}

async function sha256(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function todayUtc() {
  return new Date().toISOString().slice(0, 10);
}

async function counts(env, visitorHash, day) {
  const totals = { bitcoin: 0, ai: 0 };
  const grouped = await env.DB.prepare(
    "SELECT choice, COUNT(*) AS total FROM votes GROUP BY choice"
  ).all();
  for (const row of grouped.results || []) totals[row.choice] = Number(row.total || 0);

  const existing = await env.DB.prepare(
    "SELECT choice FROM votes WHERE vote_day = ? AND visitor_hash = ? LIMIT 1"
  ).bind(day, visitorHash).first();

  return {
    bitcoin: totals.bitcoin,
    ai: totals.ai,
    total: totals.bitcoin + totals.ai,
    votedToday: existing?.choice || null
  };
}

async function recordVote(env, visitorHash, ipHash, day, choice) {
  const existing = await env.DB.prepare(
    "SELECT choice FROM votes WHERE vote_day = ? AND visitor_hash = ? LIMIT 1"
  ).bind(day, visitorHash).first();
  if (existing) {
    return { status: 409, body: { status: "already_voted", ...await counts(env, visitorHash, day) } };
  }

  const ipVotes = await env.DB.prepare(
    "SELECT COUNT(*) AS total FROM votes WHERE vote_day = ? AND ip_hash = ?"
  ).bind(day, ipHash).first();
  if (Number(ipVotes?.total || 0) >= DAILY_IP_LIMIT) {
    return { status: 429, body: { status: "rate_limited", ...await counts(env, visitorHash, day) } };
  }

  try {
    await env.DB.prepare(
      "INSERT INTO votes (vote_day, visitor_hash, ip_hash, choice) VALUES (?, ?, ?, ?)"
    ).bind(day, visitorHash, ipHash, choice).run();
  } catch (error) {
    if (String(error).includes("UNIQUE")) {
      return { status: 409, body: { status: "already_voted", ...await counts(env, visitorHash, day) } };
    }
    throw error;
  }

  return { status: 201, body: { status: "recorded", ...await counts(env, visitorHash, day) } };
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const origins = allowedOrigins(env);

    if (request.method === "OPTIONS") {
      if (!origin || !origins.has(origin)) return json({ error: "origin_not_allowed" }, 403, origin, env);
      return new Response(null, { status: 204, headers: corsHeaders(origin, env) });
    }

    const url = new URL(request.url);
    if (url.pathname === "/health" && request.method === "GET") {
      return json({ ok: true, service: "btveai-vote-api" }, 200, origin, env);
    }

    if (url.pathname !== "/api/vote" || !["GET", "POST"].includes(request.method)) {
      return json({ error: "not_found" }, 404, origin, env);
    }
    if (!origin || !origins.has(origin)) return json({ error: "origin_not_allowed" }, 403, origin, env);

    let visitorId = url.searchParams.get("visitorId") || "";
    let choice = "";
    if (request.method === "POST") {
      let body;
      try {
        body = await request.json();
      } catch {
        return json({ error: "invalid_json" }, 400, origin, env);
      }
      visitorId = body.visitorId || "";
      choice = body.choice || "";
      if (!["bitcoin", "ai"].includes(choice)) return json({ error: "invalid_choice" }, 400, origin, env);
    }
    if (!VALID_VISITOR.test(visitorId)) return json({ error: "invalid_visitor" }, 400, origin, env);

    const day = todayUtc();
    const salt = env.VOTE_SECRET || "btveai-vote-service-v1";
    const ip = (request.headers.get("CF-Connecting-IP") || "unknown").trim();
    const [visitorHash, ipHash] = await Promise.all([
      sha256(`${salt}:visitor:${visitorId}`),
      sha256(`${salt}:ip:${ip}`)
    ]);

    if (request.method === "GET") {
      return json(await counts(env, visitorHash, day), 200, origin, env);
    }

    const result = await recordVote(env, visitorHash, ipHash, day, choice);
    return json(result.body, result.status, origin, env);
  }
};
