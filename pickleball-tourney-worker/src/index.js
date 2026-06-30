/**
 * Pickle Ball Tourney — Cloudflare Worker backend.
 *
 * Mirrors the Flask server in ../pickleball-tourney-server/ but runs as a
 * Worker on Cloudflare's edge, with the SQLite store managed by D1.
 *
 * Endpoints:
 *   GET  /health           health check
 *   POST /query            read-only (SELECT / WITH), no auth
 *   POST /exec             writes, requires X-Auth-Token header
 *
 * D1 backups are handled with the `wrangler d1 export` CLI rather than an
 * in-Worker route, since the DB is not a local file here.
 */

const ALLOWED_ORIGIN = '*'; // tighten to your Pages URL in production

const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Headers': 'Content-Type, X-Auth-Token',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

function corsPreflight() {
  return new Response(null, {
    headers: { ...corsHeaders, 'Access-Control-Max-Age': '86400' },
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') return corsPreflight();

    // ─── /health ───────────────────────────────────────────────
    if (request.method === 'GET' && url.pathname === '/health') {
      return json({ ok: true });
    }

    // ─── /query (read-only) ────────────────────────────────────
    if (request.method === 'POST' && url.pathname === '/query') {
      const body = await safeJson(request);
      if (!body) return json({ error: 'invalid JSON' }, 400);

      const sql = (body.sql || '').trim();
      const upper = sql.toUpperCase();
      if (!upper.startsWith('SELECT') && !upper.startsWith('WITH')) {
        return json({ error: 'only SELECT / WITH allowed on /query' }, 400);
      }

      try {
        const { results } = await env.DB
          .prepare(sql)
          .bind(...(body.params || []))
          .all();
        return json({ rows: results });
      } catch (err) {
        return json({ error: err.message }, 400);
      }
    }

    // ─── /exec (writes, auth required) ─────────────────────────
    if (request.method === 'POST' && url.pathname === '/exec') {
      const token = request.headers.get('X-Auth-Token');
      if (token !== env.AUTH_TOKEN) {
        return json({ error: 'unauthorized' }, 401);
      }

      const body = await safeJson(request);
      if (!body) return json({ error: 'invalid JSON' }, 400);

      try {
        const result = await env.DB
          .prepare(body.sql)
          .bind(...(body.params || []))
          .run();
        return json({
          changes: result.meta?.changes ?? 0,
          lastInsertRowid: result.meta?.last_row_id ?? 0,
        });
      } catch (err) {
        return json({ error: err.message }, 400);
      }
    }

    return json({ error: 'not found' }, 404);
  },
};

async function safeJson(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
