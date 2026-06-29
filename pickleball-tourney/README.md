# 🥒 SGDC Pickle Ball mini Tourney

Static page for tournament info + team management + live scoring, deployable to GitHub Pages. All data lives in a SQLite database running in the browser via `sql.js`, persisted to `localStorage`.

## Run locally

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

(Opening `index.html` directly via `file://` won't work — ES modules need HTTP.)

## Deploy to GitHub Pages

1. Push to a GitHub repo
2. Settings → Pages → Source: deploy from `main` branch, root folder
3. Site lives at `https://<username>.github.io/<repo-name>/` (or a subfolder if pushed inside another repo)

## Workflow

1. **Info** — read-only overview, plus a link to the Notion page where the full tournament details live
2. **Teams** — add approved teams as they roll in. Counter shows progress toward 12. Once full, click **Draw pools** to preview a snake-draft (balanced by skill points), then **Lock & start tournament** to commit
3. **Scoring** — per-pool standings + match scoring. Side-out scoring, game to 11, win by 2. Blowouts capped at +7 for point-differential
4. **Bracket** — visual 6-team knockout with QF → SF → Final + 3rd place. Auto-cascades winners. Unlocks once all 18 pool matches are scored
5. **Admin** — export `.sqlite` snapshot, clear database

## Structure

```
.
├── index.html       Single-page app with tabbed sections
├── styles.css       All styles
├── js/
│   ├── db.js        SQLite init, schema, save/load, clear, export
│   ├── seed.js      Pool matchup template (used after pool draw)
│   ├── queries.js   Team CRUD, pool draw, standings, bracket sync
│   ├── ui.js        DOM rendering helpers
│   └── app.js       Tab routing + event wiring
└── README.md
```

## Format reference

- 12 teams, 3 pools of 4, round-robin Group Stage → 6-team knockout bracket
- Group Stage: single game to 11, side-out scoring, win by 2
- Tiebreakers (in order): record → point differential (blowouts capped at +7) → total points
- Knockout: QF to 11, SF to 15, 3rd-place to 11, Final best-of-3 to 11
- Team balance rule: each team's combined skill points must equal 3 or 4
- Pool draw: snake-draft by total skill points to balance pools, with randomized order within each pool

## Admin tools

- **Export .sqlite snapshot** — download a portable backup; openable in any SQLite tool
- **Clear database** — wipe everything (requires typing `CLEAR` to confirm)
- **Reset pools** (Teams tab, after lock) — clears pool assignments and all scores, keeps the team roster

## License

Internal use.
