# Seed snapshots

SQLite snapshots used as the **shared starting state** for anyone visiting the page.

| File | Purpose |
|---|---|
| `current.db` | **Auto-loaded** on first visit (when localStorage is empty). Update this when you want everyone to pick up new state. |
| `2026-07-01-12-teams.db` | Historical snapshot — 12 approved teams, pool draw not yet done. |
| `2026-06-30-approved-teams.db` | Historical snapshot — 9 approved teams (initial batch from Notion). |

## How the file-as-source-of-truth flow works

```
First visit
  ──▶ Page checks localStorage → empty
  ──▶ Fetches seeds/current.db → loads as starting state
  ──▶ Saves to localStorage for subsequent visits

Subsequent visits (same browser)
  ──▶ localStorage has data → uses that, no fetch

Manual sync (Admin tab → 🔄 Load latest from repo)
  ──▶ Refetches seeds/current.db
  ──▶ Replaces localStorage with the latest committed snapshot
```

## How to share updates with the team

After a session of live scoring (changes only in your browser's localStorage):

1. **Admin → ⬇ Export backup** → downloads `pickleball-tourney-backup-YYYY-MM-DD.db`
2. Rename it to `current.db` (replacing this folder's file)
3. Commit + push

```bash
mv ~/Downloads/pickleball-tourney-backup-2026-XX-XX.db \
   ~/projects/stash/pickleball-tourney/seeds/current.db
cd ~/projects/stash
git add pickleball-tourney/seeds/current.db
git commit -m "Sync snapshot: session X"
git push
```

Anyone else on the site can then click **Admin → 🔄 Load latest from repo** to pick up the changes (replaces their localStorage).

## Limits of this approach

- ❌ Not real-time. Other devices see updates only after you commit + push.
- ❌ Manual. You have to remember to export + commit between sessions.
- ✅ No backend, no cost, no external dependencies.
- ✅ Snapshots are portable — open them in any SQLite tool.

For true real-time multi-device sync (live scoring across phones during a session), you'd need a hosted DB like Turso.
