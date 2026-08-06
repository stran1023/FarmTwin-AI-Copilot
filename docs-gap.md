# Documentation Gaps

Features shipped but not yet documented:

_None currently open._ Sync completed 2026-08-06 against `feature_list.json`
(all 36 active features, `feat-030` through `feat-065`, status `passing`).

## What this sync found and fixed

`docs/FarmTwin-AI-Copilot.md` and `docs/architecture.md` were already synced
through `feat-057` (dated 2026-07-27); `docs/video-script.md` was already
current through `feat-064` (most recent commit). The real gaps were:

- **Undocumented features** (`feat-058`-`feat-064`): before/after tick-diff
  highlighting, the cinematic processing sequence + real progress bar, the
  "Run AI Farm Analysis" rename, the healthy-baseline demo default, the
  critical-outcome banner variant, real conversational memory + Clear
  button, and the Copilot passcode-gate recovery fix. Added to
  `docs/architecture.md`'s "What's real" table and `docs/frontend-architecture.md`'s
  component/lib listing and screen-by-screen notes; conversational-memory
  behavior also folded into `docs/FarmTwin-AI-Copilot.md`'s Memory model
  section (`feat-065`'s AI-Prediction-staleness fix folded into
  `docs/ui-build-plan.md`'s Screen 3 Prediction bullet, since it's a
  correctness fix to already-documented behavior, not a new feature).
- **Stale docs describing removed UI** (worse than no docs, per this
  skill's own rule): `docs/ui-build-plan.md`'s Screen 2 still listed
  "Active Alerts" and "Daily Recommendations" as Dashboard content, and
  Screen 3 still listed a separate "Today's tasks" card — both removed
  from the real app by `feat-045`/`feat-046`/`feat-047` back on
  2026-07-20. Rewrote both screens to describe what's actually on screen
  today (the map's Asset Status pill, full-width clickable Tasks Due
  Today, collapsible History). Also fixed `docs/FarmTwin-AI-Copilot.md`'s
  Memory model section, which flatly stated "there is no cross-session
  conversational memory... every `/copilot/ask` call is stateless" — no
  longer true after `feat-063`'s real per-session multi-turn history.
- **Missing endpoints**: `docs/ui-build-plan.md`'s data contract table
  didn't list `POST /workflow/run/start` / `GET /workflow/run/status/{job_id}`
  (`feat-057`).
- **Missing env var**: `DEMO_PASSCODE` existed in `.env.example` with a
  real comment explaining it, but was absent from `README.md`'s env var
  table entirely.

Last updated: 2026-08-06
