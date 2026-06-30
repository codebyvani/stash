"""
Pickle Ball Tourney — backend server.

A tiny Flask app that wraps a local SQLite file and exposes it over HTTP.
The static frontend (pickleball-tourney/) talks to /query (reads) and
/exec (writes, token-protected).

Run locally:
    python3 -m venv .venv
    source .venv/bin/activate
    pip install -r requirements.txt
    python server.py
"""

import os
import sqlite3
from pathlib import Path

from flask import Flask, request, jsonify, g, send_file
from flask_cors import CORS

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = os.environ.get("DB_PATH", str(BASE_DIR / "tournament.db"))
AUTH_TOKEN = os.environ.get("AUTH_TOKEN", "pickles")
PORT = int(os.environ.get("PORT", 3000))

SCHEMA = """
CREATE TABLE IF NOT EXISTS teams (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    pool TEXT,
    seed_in_pool INTEGER,
    player1 TEXT,
    player1_skill INTEGER,
    player2 TEXT,
    player2_skill INTEGER
);
CREATE TABLE IF NOT EXISTS matches (
    id INTEGER PRIMARY KEY,
    stage TEXT NOT NULL,
    round INTEGER,
    pool TEXT,
    team_a_id INTEGER NOT NULL,
    team_b_id INTEGER NOT NULL,
    score_a INTEGER,
    score_b INTEGER,
    played_at TEXT,
    FOREIGN KEY (team_a_id) REFERENCES teams(id),
    FOREIGN KEY (team_b_id) REFERENCES teams(id)
);
CREATE TABLE IF NOT EXISTS meta (
    key TEXT PRIMARY KEY,
    value TEXT
);
"""

app = Flask(__name__)
CORS(app)  # static frontend on a different origin will call us


def get_db():
    """One connection per request, attached to flask.g."""
    if "db" not in g:
        g.db = sqlite3.connect(DB_PATH)
        g.db.row_factory = sqlite3.Row
        g.db.execute("PRAGMA journal_mode = WAL")
        g.db.execute("PRAGMA foreign_keys = ON")
    return g.db


@app.teardown_appcontext
def close_db(exc):
    db = g.pop("db", None)
    if db is not None:
        db.close()


def init_schema():
    """Run on startup — idempotent thanks to IF NOT EXISTS."""
    conn = sqlite3.connect(DB_PATH)
    conn.executescript(SCHEMA)
    conn.commit()
    conn.close()


def require_auth():
    token = request.headers.get("X-Auth-Token")
    if token != AUTH_TOKEN:
        return jsonify(error="unauthorized"), 401
    return None


@app.get("/health")
def health():
    return jsonify(ok=True)


@app.post("/query")
def query():
    """Read-only — anyone can run SELECT."""
    data = request.get_json(silent=True) or {}
    sql = data.get("sql", "")
    params = data.get("params", [])
    if not sql.strip().upper().startswith("SELECT") and not sql.strip().upper().startswith("WITH"):
        return jsonify(error="only SELECT / WITH allowed on /query"), 400
    try:
        cursor = get_db().execute(sql, params)
        rows = [dict(r) for r in cursor.fetchall()]
        return jsonify(rows=rows)
    except sqlite3.Error as e:
        return jsonify(error=str(e)), 400


@app.post("/exec")
def exec_route():
    """Writes — require X-Auth-Token header."""
    auth_err = require_auth()
    if auth_err:
        return auth_err
    data = request.get_json(silent=True) or {}
    sql = data.get("sql", "")
    params = data.get("params", [])
    try:
        db = get_db()
        cursor = db.execute(sql, params)
        db.commit()
        return jsonify(changes=cursor.rowcount, lastInsertRowid=cursor.lastrowid)
    except sqlite3.Error as e:
        return jsonify(error=str(e)), 400


@app.get("/backup")
def backup():
    """Download the raw SQLite file."""
    return send_file(DB_PATH, as_attachment=True, download_name="tournament.db")


if __name__ == "__main__":
    init_schema()
    print(f"Tournament server listening on http://localhost:{PORT}")
    print(f"DB at {DB_PATH}")
    app.run(host="0.0.0.0", port=PORT, debug=False)
