# 🥒 SGDC Pickle Ball mini Tourney

Static page for tournament info + live scoring, deployable to GitHub Pages. All data lives in a SQLite database running in the browser via `sql.js`, persisted to `localStorage`.

## Run locally

Open `index.html` in a browser. That's it — no build step.

If you hit CORS errors loading the WASM, serve the directory instead:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

## Deploy to GitHub Pages

1. `git init`, commit, push to a GitHub repo
2. Settings → Pages → Source: deploy from `main` branch, root folder
3. Site lives at `https://<username>.github.io/<repo-name>/`

## Structure

```
.
├── index.html       Single-page app with tabbed sections
├── styles.css       Custom styles
├── js/
│   ├── db.js        SQLite init, schema, save/load, clear, export
│   ├── seed.js      Placeholder teams + matchup schedule (edit after signups close)
│   ├── queries.js   Standings + seeding SQL
│   ├── ui.js        DOM rendering helpers
│   └── app.js       Tab routing + score-change handlers
└── README.md
```

## Updating teams after signup closes

Edit `js/seed.js` and replace the placeholder `TBD` players + `Team A1`/etc. names with the real signups.

After editing, you'll need to clear the existing database (Admin tab → "Clear database") so the new seed data takes effect.

## Format reference

- 12 teams, 3 pools of 4, round-robin Group Stage → 6-team knockout bracket
- Group Stage: single game to 11, side-out scoring, win by 2
- Tiebreakers (in order): record → point differential (blowouts capped at +7) → total points
- Knockout: QF to 11, SF to 15, 3rd-place to 11, Final best-of-3 to 11

## Admin tools

- **Export .sqlite snapshot** — download a portable backup
- **Clear database** — wipe everything (requires typing `CLEAR` to confirm)

## License

Internal use.
