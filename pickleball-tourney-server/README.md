# Pickle Ball Tourney — Backend Server

Tiny Flask app that wraps a local SQLite file and exposes it over HTTP. The static frontend in [`../pickleball-tourney/`](../pickleball-tourney/) calls these endpoints instead of using browser-local SQLite.

## Endpoints

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET  | `/health` | no | Health check |
| POST | `/query` | no | Run a `SELECT` / `WITH` query. Body: `{ sql, params }` |
| POST | `/exec` | yes (`X-Auth-Token`) | Run an `INSERT` / `UPDATE` / `DELETE`. Body: `{ sql, params }` |
| GET  | `/backup` | no | Download the raw `.db` file |

## Run locally

```bash
cd pickleball-tourney-server
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python server.py
# → http://localhost:3000
```

The DB file is created on first run at `./tournament.db` (gitignored).

### Quick test

```bash
# Health
curl http://localhost:3000/health
# {"ok":true}

# Read
curl -X POST http://localhost:3000/query \
  -H 'Content-Type: application/json' \
  -d '{"sql":"SELECT * FROM teams"}'

# Write (requires token)
curl -X POST http://localhost:3000/exec \
  -H 'Content-Type: application/json' \
  -H 'X-Auth-Token: pickles' \
  -d '{"sql":"INSERT INTO teams (name, player1, player1_skill, player2, player2_skill) VALUES (?, ?, ?, ?, ?)", "params":["Test team","Alice",2,"Bob",2]}'

# Backup
curl -O http://localhost:3000/backup
```

## Configuration

Set via env vars (all optional):

| Var | Default | Notes |
|---|---|---|
| `PORT` | `3000` | HTTP port |
| `DB_PATH` | `./tournament.db` | Where to keep the SQLite file. **Use a mounted volume in production.** |
| `AUTH_TOKEN` | `pickles` | Required header value for write endpoints |

## Deploy options

### Fly.io (free tier with always-on)

```bash
brew install flyctl
fly auth signup
cd pickleball-tourney-server
fly launch                    # accept defaults; pick region near PH (sin/hkg)
fly volumes create tourney_data --size 1 --region <your-region>
```

Edit the generated `fly.toml` to mount the volume:

```toml
[[mounts]]
  source = "tourney_data"
  destination = "/data"
```

Then set the auth token as a secret and deploy:

```bash
fly secrets set AUTH_TOKEN=your-strong-secret
fly deploy
# → https://your-app.fly.dev
```

### Render

1. New → Web Service → connect this repo
2. Root directory: `pickleball-tourney-server`
3. Build command: `pip install -r requirements.txt gunicorn`
4. Start command: `gunicorn server:app --bind 0.0.0.0:$PORT`
5. Add a Persistent Disk (path: `/var/data`, size 1 GB)
6. Set env vars: `DB_PATH=/var/data/tournament.db`, `AUTH_TOKEN=...`

### Railway

Similar to Render. Add a Volume, point `DB_PATH` to its mount path.

### Your own VPS

```bash
# On the server
git clone <repo>
cd pickleball-tourney-server
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt gunicorn
gunicorn server:app --bind 0.0.0.0:3000 --workers 2 --daemon
```

Put nginx in front for TLS + a stable URL.

## Frontend wiring (when you're ready)

In `../pickleball-tourney/js/db.js`, replace the sql.js block with HTTP calls. Roughly:

```js
const SERVER = 'https://your-app.fly.dev';
const AUTH_TOKEN = 'pickles';  // or load from a setting

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

Then make all `queries.js` calls `async` and update the handlers in `app.js` to `await` them.

## Security notes

- The token is currently `pickles` — fine for a small internal tournament. For production, set `AUTH_TOKEN` as a deploy secret to a strong random value.
- The token will be visible in your frontend JS source if you hardcode it. If that's a concern, add a `/login` endpoint that exchanges a password for a short-lived session cookie.
- `flask-cors` is configured to allow all origins (`*`). Tighten this in production by passing `origins=["https://codebyvani.github.io"]` to the `CORS(app)` call.
