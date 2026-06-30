# Pickle Ball Tourney — Cloudflare Worker backend

Sibling of [`../pickleball-tourney-server/`](../pickleball-tourney-server/) (the Python Flask version). Same endpoints, same SQL, runs on Cloudflare Workers + D1 instead of a Python process. Free forever for the tournament's scale, no credit card required.

## Endpoints

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET  | `/health` | no | Health check |
| POST | `/query` | no | Run a `SELECT` / `WITH` query. Body: `{ sql, params }` |
| POST | `/exec` | yes (`X-Auth-Token`) | Run an `INSERT` / `UPDATE` / `DELETE`. Body: `{ sql, params }` |

D1 backups are handled with `wrangler d1 export` (see below) rather than an in-Worker route.

## One-time setup

```bash
cd pickleball-tourney-worker
npm install
npx wrangler login           # browser opens; sign up free, no CC

# 1. Create the D1 database
npm run db:create
# → prints database_id like "abc123-def4-..."
# → paste it into wrangler.toml under [[d1_databases]].database_id

# 2. Apply the schema (remote = production D1)
npm run db:schema

# 3. (Optional) Apply the 9-team seed
npm run db:seed

# 4. Deploy the Worker
npm run deploy
# → https://pickleball-tourney-api.<your-subdomain>.workers.dev
```

After this you have a public HTTPS endpoint that the static frontend can call.

## Local development

```bash
# Use --local D1 (a SQLite file in .wrangler/) for faster dev iteration
npm run db:schema:local
npm run db:seed:local
npm run dev
# → http://localhost:8787
```

Hit it like the production endpoint:

```bash
curl http://localhost:8787/health
curl -X POST http://localhost:8787/query \
  -H 'Content-Type: application/json' \
  -d '{"sql":"SELECT * FROM teams"}'
```

## Configuration

Set in `wrangler.toml` for dev, or via `wrangler secret put` for production:

| Var | Default (dev) | Notes |
|---|---|---|
| `AUTH_TOKEN` | `pickles` | Required header value for write endpoints. **Replace via `wrangler secret put AUTH_TOKEN` in production** — `[vars]` values get bundled into the worker. |

## Frontend wiring (same as the Flask version)

In `../pickleball-tourney/js/db.js`, replace the sql.js code with HTTP calls:

```js
const SERVER = 'https://pickleball-tourney-api.<your-subdomain>.workers.dev';
const AUTH_TOKEN = 'pickles';

export async function query(sql, params = []) {
  const r = await fetch(`${SERVER}/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sql, params }),
  });
  if (!r.ok) throw new Error(await r.text());
  return (await r.json()).rows;
}

export async function exec(sql, params = []) {
  const r = await fetch(`${SERVER}/exec`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Auth-Token': AUTH_TOKEN,
    },
    body: JSON.stringify({ sql, params }),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}
```

Then update `queries.js` calls to be `async` and `await` them in `app.js` handlers.

## Backups

D1 isn't a local file you can download. Use the CLI:

```bash
# Export the production DB to a SQL file
npx wrangler d1 export tournament --remote --output=backup-$(date +%Y-%m-%d).sql

# Restore from a SQL file
npx wrangler d1 execute tournament --remote --file=backup-2026-XX-XX.sql
```

## Free tier sanity check

- Workers: 100,000 requests/day. A 12-team tournament across 4 weeks will use ~1,000 requests at most.
- D1: 5 GB storage, 5 M reads/day, 100 K writes/day. Our data is < 1 MB.

You will not approach the free tier limits.

## Cost beyond free tier (FYI)

If you somehow exceed the free tier:
- Workers: $5/month for 10 million requests
- D1: $5/month for 25 GB storage + 25 M reads + 50 M writes

Effectively still free for your scale even if Cloudflare tightened limits.

## Security notes

- `[vars]` values in `wrangler.toml` ship to the Worker as plaintext in the bundle (visible if anyone inspects the deploy). Use `wrangler secret put AUTH_TOKEN` for the real token.
- CORS is open (`*`). Tighten to `https://codebyvani.github.io` in `src/index.js` for production.
- D1 prepared statements bind params safely — no SQL injection if you stick to the `prepare + bind` pattern, which the Worker enforces by design.
