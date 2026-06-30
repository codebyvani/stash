# Seed snapshots

SQLite snapshots of approved teams, importable via the Admin tab → **⬆ Import backup**.

| File | Date | Contents |
|---|---|---|
| `2026-06-30-approved-teams.db` | 2026-06-30 | 9 approved teams (Notion signups as of that date), no pools, no matches |

## How to use

1. Download the `.db` file from this folder (right-click the file on GitHub → "Save link as")
2. On the deployed site, go to **Admin → ⬆ Import backup**
3. Select the downloaded file, enter the password (`pickles`)
4. The teams populate the Teams tab; pool draw is unlocked since 12 teams aren't there yet

## Adding more teams

After importing the snapshot, continue adding remaining approved teams via the **+ Add team** form. Once you have 12, run the pool draw.
