# Progress Log

## Current Verified State

- Last Updated: 2026-07-16
- **Session 025 (2026-07-16): fixed the second narration-leak shape
  Session 024 had flagged.** `backend/app/main.py`'s
  `_strip_narration_prefix` was rewritten from a prefix-only phrase
  match into a content classifier (`_looks_like_narration`): first-
  person process language, references to "the user"/"my filter", or a
  leaked raw snake_case field name (e.g. `approved_at`), scanned across
  a bounded window of the first 4 sentences and cutting at the LAST
  match in that window (not just the first non-matching sentence) --
  necessary because a plain-looking sentence can sit between two
  narration sentences. Verified against 3 freshly-captured live raw
  Cortex Agent samples, a faithful reconstruction of the reported leak,
  idempotency against 3 real already-clean captured answers, and one
  final live `/briefing/today` call. See `feat-042`.
- **Session 024 (2026-07-16): redesigned the Daily Briefing Overview
  card** per a detailed user-supplied rendering/UI brief (explicitly
  scoped to rendering, not content generation). New
  `frontend/lib/markdown.tsx` (bold-only markdown render + sentence
  splitter) and `frontend/components/BriefingOverview.tsx` (a real-data
  badge banner for the primary affected asset + sentence-paragraph prose
  + a separated "rest of the farm" strip). See `feat-041`. Verification
  surfaced a *second*, different narration-leak shape (not glued, no
  recognized lead-in phrase) in a separate live Cortex Agent call --
  flagged, not fixed (out of this session's declared scope).
- **Session 023 (2026-07-16): fixed the narration-leak bug Session 022
  had flagged but left out of scope.** The user reported it live (a
  leaked "Only one recommendation matched today's date exactly. Let me
  broaden..." preamble ahead of the real Daily Briefing summary).
  `backend/app/main.py`'s `_clean_agent_answer`/`_strip_narration_prefix`
  now strips narration at the last "glued" punctuation-to-capital seam
  (no space after `.`/`!`/`?`) rather than only matching known lead-in
  phrases -- a more general fix than the phrase-list approach used in
  Sessions 011-014. See `feat-040`.
- **Session 022 (2026-07-16): the frontend was fully replaced.** The user
  supplied a separately-built, v0-generated Next.js frontend
  (`farmtwin-ai-copilot-frontend/` -- shadcn/ui, pan/zoom digital twin
  map, dedicated `/copilot` route) and asked for it to be integrated with
  the real backend. Per explicit user decision, the old `frontend/` was
  removed entirely and the new project moved into its place; package
  manager switched pnpm -> npm to match the rest of the repo. See
  `feat-039` in `feature_list.json` and the Session 022 entry below for
  full detail -- `docs/frontend-architecture.md` (written in Session 021)
  now describes the **removed** frontend and needs a rewrite.
- Repository root: `D:\Snowflake Hackathon\climate-agriculture-copilot`
- Current Objective: **Project pivoted 2026-07-14** to `docs/FarmTwin-AI-Copilot.md`
  (single farm, 4 heterogeneous Farm Assets — Fish Pond/Chicken Coop/Rice
  Field/Fruit Orchard — isometric digital twin, AI-Copilot-centric UI,
  structured 6-field recommendations). See `docs/architecture.md` and
  `docs/ui-build-plan.md` for the current target design and the
  schema/API mapping from old to new.
- **`feature_list.json` contains only the active roadmap** —
  `feat-008` through `feat-029` (the full FarmTwin pivot, the
  performance/split-screen-UX batch, and the visual-overhaul batch, all
  `passing`) were removed from it 2026-07-15 at the user's explicit
  request, since they were done and cluttering the list of upcoming
  work. Nothing was lost: their full evidence trail lives in this
  file's Session 011 through Session 019 entries below, and
  `feature_list.json`'s own `completed_note` field points back here.
  Same precedent as the 2026-07-14 pivot, which did the same thing for
  the original `feat-001`–`feat-007` (see "Legacy" section below).
- **`feat-030` through `feat-038` (all 9 features from the UX design
  review) reached `passing` in Session 021 (2026-07-15)** with real
  `npm run build`/`npm run lint` + live Playwright evidence against the
  running dev server and real Snowflake-backed data. `feature_list.json`
  is fully `passing` end-to-end again — no `not_started`/`in_progress`
  features remain in the active list as of this session.
- Standard startup path: `./init.sh`
- Standard verification path: `cd backend && python -m compileall app`
  (syntax-only). A real venv exists at `backend/venv` with
  `requirements.txt` installed, so runtime verification is also possible.
  Frontend verification: `cd frontend && npm run build && npm run lint`.
- Highest-priority unfinished feature: none — the active roadmap in
  `feature_list.json` is empty of pending work as of Session 021. Next
  session should ask the user what to prioritize next, or resume the
  UX-review backlog if more points surface.
- Blockers: none currently known.
- Recommended Next Step: none queued — awaiting the user's next
  direction.

## Session 015 — new roadmap: performance + split-screen UX + visual polish

- Date: 2026-07-14
- The FarmTwin pivot (`feat-008`–`feat-019`) reached feature-complete at
  the end of Session 014. The user then requested 3 improvements: (1)
  the dashboard loads slowly — cache or use hooks; (2) restructure the
  home screen into a split view (map left, dashboard-or-selected-asset
  right, with a back button) instead of separate map/dashboard/
  asset-detail pages; (3) make the UI look more like real farm
  infrastructure with better graphics/animation, and build a feature
  list for it.
- Before drafting the list, investigated #1 rather than taking the
  user's diagnosis (frontend caching) at face value: read
  `backend/app/services/snowflake_client.py` and `GET /dashboard/summary`
  in `backend/app/main.py`. Found `get_connection()` opens a brand-new
  Snowflake connection (full auth + session-init + warehouse-resume
  handshake) for *every single query*, and `/dashboard/summary` alone
  issues 4 sequential queries — so one dashboard load pays that full
  handshake cost 4 times. This is almost certainly the dominant cause of
  "slow," not a lack of frontend caching. Both are now on the roadmap:
  `feat-020` (backend connection reuse — the real primary fix) and
  `feat-021` (frontend shared-cache hook — the user's original ask,
  still valuable for repeat-navigation latency, not a substitute for
  feat-020).
- Asked the user 3 clarifying questions via `AskUserQuestion` before
  scoping #2 and #3 (per the user's own "ask me if you need more
  information" and this repo's precedent from the original pivot
  session). Answers, all confirmed 2026-07-14:
  1. **Split-screen layout scope:** replace the home page (`/`) entirely
     — map docked left, right panel defaults to dashboard content and
     swaps in-place to asset detail on click, `/assets/{id}` stays a
     working deep-link, `/dashboard` redirects to `/`. (Not a new
     parallel route, not dropping `/assets/{id}` as a URL.)
  2. **Animation approach:** stay dependency-free — plain CSS/SVG
     animation, no new library (no Framer Motion, no canvas/game
     engine). Matches this project's established minimal-dependency
     bias from every prior frontend session.
  3. **Visual style:** cute/cartoon farm-sim, Stardew-Valley/Hay-Day
     adjacent — warm, friendly, illustrated look, not photorealistic or
     a leveled-up version of the current minimal isometric style.
- Wrote 10 new features into `feature_list.json` (`feat-020` through
  `feat-029`, all `not_started`), continuing the existing structure/
  rigor (dependencies, verification steps, notes) rather than a separate
  document:
  - `feat-020`: backend connection reuse (the perf root-cause fix).
  - `feat-021`: shared frontend data-fetch cache/hook, hand-rolled, no
    new dependency.
  - `feat-022`: the split-screen Farm view itself (map + dashboard/
    asset-detail panel + back button), replacing `/` and `/dashboard`.
  - `feat-023`: cartoon terrain redesign (grass/paths/sky/landmarks) —
    the foundational visual pass the per-asset graphics sit on top of.
  - `feat-024`–`feat-027`: one feature per asset type (fish pond pond+
    fish+water-tint, chicken coop+chickens, rice paddy+growth-stage
    visuals, orchard trees+fruit-ripeness visuals), each CSS/SVG
    animated and tied to real backend data (risk level, growth_stage,
    harvest_readiness_pct) rather than purely decorative.
  - `feat-028`: weather ambience overlay (rain/clouds/sun tint driven by
    real `WEATHER_READINGS`) — flagged as lowest-priority/droppable if
    time-constrained, since it's atmosphere-only, no status information.
  - `feat-029`: expressive per-status animation (pulse on the top-risk
    asset, alert bubble, healthy sparkle) replacing the current static
    colored ring, closing the loop on `ui-build-plan.md`'s original
    "should read as alive" note.
- No code changed yet this session — planning/scoping only, matching
  this repo's precedent (Session 010's pivot was also planning-only
  before implementation began).
- Next best step: `feat-020` (backend connection-reuse fix) — highest
  priority, smallest/lowest-risk change, and the correct fix for the
  originally reported "dashboard loads slowly" complaint.

## Session 011

- Date: 2026-07-14
- Goal: Run and verify `feat-008` (Snowflake schema rebuild) and `feat-009`
  (semantic view + Cortex Agent rebuild) — both require the user to run
  CoCo interactively, per `CLAUDE.md`; this agent cannot run CoCo itself.
- User ran all 4 Part 2 prompts in `snowflake/coco-prompts.md` against the
  live account: schema rebuild, seed data, semantic view, Cortex Agent.
  Results recorded in that file by the user.
- Verified `feat-008` independently (not just trusting CoCo's self-report),
  same rigor as the original build's sessions: queried the live account via
  `backend/venv` — `FARM_ASSETS`=4 rows (one per asset_type, with real
  `grid_x`/`grid_y`/`install_date`), `ASSET_READINGS`=120 rows (30 days x 4
  assets, type-specific columns populated, irrelevant columns NULL per
  type), `ASSET_RISK_ASSESSMENTS`=22 rows (confirmed the fish pond's DO
  escalation to `critical`), `ASSET_HISTORY`=12 rows (confirmed the Q4-2024
  biomass crash 310kg -> 145kg). `DESCRIBE TABLE RECOMMENDATIONS` confirmed
  all 12 planned columns. Noted `asset_id`/`recommendation_id` are string
  codes (e.g. `FP-001`), not auto-incrementing numbers, for `feat-010`'s ID
  design.
- Verified `feat-009` independently: called the rebuilt `FARM_OPS_AGENT`
  directly via a Python script using `backend/app/services/
  cortex_agent_client.py`'s endpoint (no code change needed — CoCo rebuilt
  the agent under the same name/schema). First call hit a transient
  `httpx.ReadTimeout` at 90s (same known flakiness as the prior build's
  feat-006 session); retried with a longer client-side timeout and got a
  real response: correctly identified FP-001's critical DO emergency,
  cited exact current sensor values and the Jul 6-12 decline trend,
  cross-referenced the Q4-2024 historical crash from `ASSET_HISTORY`, and
  produced 4 recommendations each containing all 6 required fields
  (Recommendation/Reason/Evidence/Priority/Expected Impact/Confidence)
  with real data citations — not generic advice.
- Result: `feat-008` and `feat-009` both moved to `passing` in
  `feature_list.json` with the above evidence recorded.
- Files updated: `feature_list.json`, `progress.md`. (`snowflake/
  coco-prompts.md`'s Result lines were filled in by the user, not this
  agent.)
- Note for `feat-012` (next backend feature that calls the agent for
  real): the agent emits structured-but-parseable markdown prose (bolded
  field labels), not JSON — parsing needs to extract the 6 fields from
  that format. Keep the 90s+ httpx timeout given the observed flakiness.
- Next best step at the time: `feat-010` (completed later in this same
  session — see below).

### Session 011 (continued) — feat-010

- Goal: Implement `feat-010` — new Pydantic models + Snowflake read layer
  for the asset schema, now that `feat-008`/`feat-009` are `passing`.
- Implemented:
  - `backend/app/models/schemas.py`: replaced `Plot`/`PlotRisk`/
    `WorkOrder`/`RiskAssessment` with `FarmAsset`, `AssetReading` (15
    nullable type-specific fields mirroring `ASSET_READINGS` exactly),
    `AssetRisk`, `AssetHistory`, `Recommendation` (6-field structured
    format + status/approval fields), `ApprovalRequest`, `DailyBriefing`
    v2, `BriefingToday` v2. `WeatherReading` updated to drop `farm_id`
    (table is farm-wide now).
  - `backend/app/main.py`: removed the dead `/plots`, `/plots/{id}/risk`,
    `/workorders/{id}/approve`, `/workorders/{id}/reject` endpoints and
    their helpers (`_overall_risk_level`, `_work_order_from_row`,
    `_set_work_order_status`) — their backing tables no longer exist.
    Stubbed `/workflow/run` and `/briefing/today` with explicit
    `TODO(feat-011/012/013)` comments and placeholder v2 responses,
    matching this repo's existing stub convention.
- Verified (runtime, not just syntax):
  - `python -m compileall app` — clean.
  - Ran a standalone script (scratchpad, not committed) against the live
    account: real `SELECT`s against `FARM_ASSETS` (all 4 rows),
    `ASSET_READINGS`, `ASSET_RISK_ASSESSMENTS`, and `ASSET_HISTORY` for
    `FP-001`, constructing `FarmAsset`/`AssetReading`/`AssetRisk`/
    `AssetHistory` instances from each row — all succeeded, field values
    matched the raw rows exactly, irrelevant nullable columns correctly
    came back `None`.
  - Checked port 8000 was clear, started `uvicorn` against the live
    account, curled `/health`, `/workflow/run`, `/briefing/today` — all
    three returned valid JSON matching the new v2 schemas with clear
    "stubbed pending feat-0XX" summaries. Confirms zero import errors
    against the rewritten models (the real risk this feature could have
    introduced, since the old `main.py` imported classes that no longer
    exist). Killed the uvicorn process afterward.
- Result: `feat-010` moved to `passing` in `feature_list.json` with the
  above evidence recorded.
- Files updated: `backend/app/models/schemas.py`, `backend/app/main.py`,
  `feature_list.json`, `progress.md`.
- Next best step at the time: `feat-011` (completed later in this same
  session — see below).

### Session 011 (continued) — feat-011

- Goal: Implement `feat-011` — a simulation engine for per-asset sensor
  data, since no physical IoT exists for this build.
- Implemented `backend/app/services/asset_simulator.py`:
  `next_reading(asset_type, previous)` — a persisted-last-value + bounded
  random walk per numeric metric (metric-specific min/max/step/drift
  table), plus dedicated logic for `growth_stage` (ordered, one step per
  tick), `irrigation_status` (derived from `soil_moisture_pct`), and
  `egg_count` (small walk around the previous count).
  `dissolved_oxygen_mg_l` gets one extra directional-drift rule (keeps
  declining below 4.0, gently recovers above 6.0) so the fish pond's
  seeded crisis continues realistically across future `/workflow/run`
  calls instead of randomly snapping back to healthy — the one asset the
  demo narrative is built around, not a general framework applied to
  every metric (per the feature's own "don't over-engineer" note).
- Verified (not just syntax):
  - `python -m compileall app` — clean.
  - Ran a 4-scenario seeded-RNG script (scratchpad, not committed): (A)
    fish_pond from the real seeded critical DO (3.5 mg/L) declined
    continuously over 8 ticks to the 2.0 floor, every delta <= 0.39 —
    bounded and trending, not noise; (B) fish_pond from a healthy DO (7.0)
    stayed healthy/rose slightly over 5 ticks; (C) rice_field
    `growth_stage` advanced exactly one stage at a time or held over 20
    ticks, never skipped/reversed; (D) chicken_coop egg count/feed/water
    all evolved smoothly.
- Result: `feat-011` moved to `passing` in `feature_list.json` with the
  above evidence recorded.
- Files updated: `backend/app/services/asset_simulator.py` (new),
  `feature_list.json`, `progress.md`.
- Next best step at the time: `feat-012` (completed later in this same
  session — see below).

### Session 011 (continued) — feat-012

- Goal: Implement `feat-012` — rewrite `/workflow/run` as Observe ->
  Understand -> Recommend -> Predict, wiring `asset_simulator.py`
  (`feat-011`) and the real `FARM_OPS_AGENT` call (`feat-009`) together.
- Implemented:
  - `backend/app/services/risk_engine.py`: `assess_risk()` (Understand —
    rule-based thresholds per asset type, mirroring what the agent itself
    was instructed to use) and `predict_trend()` (Predict — one-sentence
    linear projection when the driving metric is moving in the worsening
    direction since the previous reading).
  - `backend/app/services/recommendation_parser.py`: `parse_recommendations()`
    — line-based regex extraction of the agent's 6 bolded field labels,
    tolerant of formatting variance.
  - `backend/app/main.py`: `/workflow/run` rewritten as Observe (simulate
    + write `ASSET_READINGS`; fetch + write farm-wide `WEATHER_READINGS`)
    -> Understand (write `ASSET_RISK_ASSESSMENTS`) -> Recommend (real
    `FARM_OPS_AGENT` call for medium+ risk assets only, parsed into
    `RECOMMENDATIONS` rows) -> Predict (`ASSET_RISK_ASSESSMENTS` row
    suffixed `_forecast_24h`).
  - `backend/app/config.py`: added `farm_lat`/`farm_lon` — `FARM_ASSETS`
    has no lat/lon post-pivot (one physical farm, not many geo-distributed
    plots), so weather ingestion needs one configured location.
  - `backend/app/services/weather_client.py`: extended
    `get_today_reading()` to also pull `wind_speed_10m_max` (new
    `WEATHER_READINGS.wind_speed_kmh` column).
- Verified (runtime, iteratively, against the live account — not just
  syntax):
  - Ran `/workflow/run` 4 times total while iterating, checking port 8000
    was clear and cleanly killing `uvicorn` between restarts each time.
  - Run 1 (200, 89.6s): `assets_assessed=4`, `high_risk_assets=['FP-001']`
    (only the seeded crisis asset flagged — correct), 3 real
    `RECOMMENDATIONS` rows written. Found the `summary` field leaked the
    agent's raw tool-call narration ahead of an `<answer>` tag.
  - Run 2 hit a genuine `httpx.ReadTimeout` at the 90s client timeout
    (same known flakiness as feat-006/feat-009) — bumped
    `cortex_agent_client.py`'s timeout 90s -> 150s.
  - Discovered the narration-wrapper format isn't consistent across
    calls (sometimes an explicit `<answer>` tag, sometimes narration runs
    straight into the first markdown heading with no tag at all) — fixed
    `_clean_agent_answer()` to handle both shapes plus a no-heading
    fallback, verified against 3 fixture shapes.
  - Runs 3 and 4 (both 200, ~100s) produced clean summaries with zero
    narration leakage. Cross-checked Snowflake directly: correct
    alternating current/forecast `ASSET_RISK_ASSESSMENTS` rows each tick,
    9 total `RECOMMENDATIONS` rows across 3 successful runs (all
    `pending_approval`), table counts grew as expected.
- Result: `feat-012` moved to `passing` in `feature_list.json` with the
  above evidence recorded.
- Files updated: `backend/app/main.py`, `backend/app/config.py`,
  `backend/app/services/risk_engine.py` (new),
  `backend/app/services/recommendation_parser.py` (new),
  `backend/app/services/weather_client.py`,
  `backend/app/services/cortex_agent_client.py`, `feature_list.json`,
  `progress.md`.
- Known non-blocking limitation (documented, not fixed — matches this
  repo's precedent of accepting hackathon-scale limits rather than
  over-engineering): the per-asset loop has no cross-asset
  transaction/rollback. If the agent call for one at-risk asset fails,
  assets later in `ASSET_ID` order simply catch up on the next
  `/workflow/run` call. Each real Cortex Agent call can take 60-150s;
  fine for the demo's one-asset-crisis scope, would serialize badly with
  multiple simultaneous incidents.
- Next best step at the time: `feat-013` (completed later in this same
  session — see below).

### Session 011 (continued) — feat-013

- Goal: Implement `feat-013` — asset read endpoints, recommendation
  approve/reject, dashboard summary, and rebuild `/briefing/today` for
  real (it had been stubbed since `feat-010`).
- Implemented:
  - `backend/app/models/schemas.py`: `AssetOverview`, `AssetDetail`,
    `AssetStatusSummary`, `DashboardSummary`.
  - `backend/app/main.py`: `GET /assets`, `GET /assets/{id}` (404 if
    missing), `GET /assets/{id}/recommendations`, `POST
    /recommendations/{id}/approve|reject` (404 if missing), `GET
    /dashboard/summary` (farm-wide health score, active alerts, tasks due
    today, top recommendations, weather, asset overview), and a real `GET
    /briefing/today` against `RECOMMENDATIONS`. Health score/status are
    derived from `risk_level` via a fixed severity mapping (no stored
    score column).
- Verified (runtime, against the live account):
  - Every new route curled and cross-checked: `/assets` showed FP-001
    correctly critical/10/critical from the real seeded crisis and the
    other 3 healthy/90; `/assets/FP-001` returned the correct reading,
    current risk, `_forecast_24h` prediction, and all 3 history periods;
    `/assets/DOES-NOT-EXIST` correctly 404'd; `/dashboard/summary`'s
    `farm_health_score` was exactly `(90+90+10+90)/4=70` as expected.
  - Approved one FP-001 recommendation (custom `approved_by`) and
    rejected another (default `approved_by`) — both updated correctly;
    approving a non-existent id 404'd. `/briefing/today` then correctly
    reflected both.
  - Found and fixed a real bug: `/briefing/today`'s summary leaked a
    3rd narration shape `_clean_agent_answer` (from `feat-012`) didn't yet
    handle — no `<answer>` tag, no markdown heading, just tool-planning
    sentences joined with zero whitespace flowing straight into the real
    answer. Added `_strip_narration_prefix()` (cuts leading sentences
    starting with known planning lead-ins at the first sentence-ending
    punctuation, looping until clean), verified against the exact
    captured real text plus a negative case (a sentence containing a
    decimal number, correctly left untouched), then re-verified live —
    the next `/briefing/today` call came back with zero narration leakage.
- Result: `feat-013` moved to `passing` in `feature_list.json` with the
  above evidence recorded.
- Files updated: `backend/app/main.py`, `backend/app/models/schemas.py`,
  `feature_list.json`, `progress.md`.
- Next best step at the time: `feat-014` (completed later in this same
  session — see below).

### Session 011 (continued) — feat-014

- Goal: Implement `feat-014` — `POST /copilot/ask`, the free-form Q&A
  endpoint. Last backend feature; frontend work starts after this.
- Implemented `CopilotQuestion`/`CopilotAnswer` in `schemas.py` and `POST
  /copilot/ask` in `main.py` — wraps the user's question with grounding +
  "end with a concrete next step" instructions, calls `FARM_OPS_AGENT`,
  cleans the response with the shared `_clean_agent_answer`.
- Verified live against 3 of the vision doc's example questions
  (representative sample across question shapes, not all 8, given each
  call takes 40-100s): "What should I do today?" correctly triaged all 4
  assets by urgency with real data and a concrete next step; "Should I
  feed the fish?" correctly answered "No," grounded in the real DO trend
  and Q4-2024 history; "How healthy is the farm?" correctly summarized
  all 4 assets by health status. All 3 cleared the vision doc's explicit
  good-vs-bad example bar.
- Found and fixed a 4th narration-leak shape during this verification:
  "I have the data model. Let me pull..." didn't match any existing
  lead-in phrase, so stripping never started. Extended the lead-in list,
  verified against the captured text, then re-ran a question live to
  confirm zero leakage.
- Result: `feat-014` moved to `passing` in `feature_list.json`. **All 7
  backend features (`feat-008`–`feat-014`) are now `passing`** — the
  entire FarmTwin backend pipeline is real and Snowflake/Cortex-backed
  end to end.
- Files updated: `backend/app/main.py`, `backend/app/models/schemas.py`,
  `feature_list.json`, `progress.md`.
- Noted, not acted on: two new untracked files appeared mid-session that
  this agent did not create — `docs/challenge.md` (hackathon judging
  criteria for the Domain-Specific AI Copilot track) and
  `docs/project-structure.md` (a much more elaborate proposed repo layout
  — 20 numbered docs, `prompts/`, `sample-data/`, `tasks/` directories —
  that doesn't match the current structure). Flagged to the user; not
  incorporated into the plan without explicit direction, per the
  one-feature-at-a-time / stay-in-scope rule.
- Next best step at the time: `feat-015` (completed later in this same
  session — see below).

### Session 011 (continued) — feat-015

- Goal: Implement `feat-015` — the isometric Digital Twin home screen
  (first frontend feature), replacing the real Leaflet/OSM Screen 1.
- User confirmed via `AskUserQuestion` mid-session: ignore
  `docs/project-structure.md` (a much larger proposed repo layout that
  appeared as an untracked file — treated as reference material, not a
  directive) and proceed straight to `feat-015`.
- Implemented:
  - `frontend/components/DigitalTwinMap.tsx` (new): plain CSS isometric
    rendering (11x11 diamond ground grid via `clip-path`, standard 2:1
    coordinate transform from `grid_x`/`grid_y`) — no new library, per the
    open decision in `ui-build-plan.md` and matching the prior build's
    bias toward minimal dependencies. One marker per asset (emoji in a
    colored ring), hover popover, click links to `/assets/{id}`.
  - `frontend/lib/api.ts`: full rewrite for the new backend contract.
  - Removed `frontend/components/FarmMap.tsx`, `frontend/app/plots/[id]/`
    (both dead), `npm uninstall leaflet react-leaflet @types/leaflet`.
  - `frontend/app/page.tsx` rewritten as the Digital Twin home.
    `frontend/app/briefing/page.tsx` got a minimal field-rename compat
    patch (not a redesign — that's `feat-019`) to keep the build green.
- Verified (runtime, via Playwright + real backend, not just build):
  - `npm run build` hit a stale generated Next.js typegen file referencing
    the deleted route — cleared `.next/` and rebuilt clean.
    `npm run build` and `npm run lint` both clean after.
  - Installed Playwright fresh into the session scratchpad, ran against
    live `uvicorn` + `next dev`. First attempt (against `127.0.0.1:3000`)
    showed 0 markers — root-caused to a CORS origin mismatch (backend
    defaults to allowing `localhost:3000`), fixed by testing against the
    matching origin. All 4 markers rendered correctly with real data;
    FP-001 showed the correct critical/red ring and real live alert text.
  - Found and fixed a real bug: a hovered tooltip could render partially
    behind a neighboring marker with a higher z-index, clipping text.
    Fixed (hovered marker's z-index bumped above all others), re-verified
    via screenshot.
  - Verified click-through: FP-001 correctly navigates to `/assets/
    FP-001`, which correctly 404s (expected — `feat-017` hasn't landed)
    with no crash.
- Result: `feat-015` moved to `passing` in `feature_list.json`.
- Files updated: `frontend/lib/api.ts`, `frontend/app/page.tsx`,
  `frontend/app/layout.tsx`, `frontend/app/briefing/page.tsx`,
  `frontend/components/DigitalTwinMap.tsx` (new),
  `frontend/package.json` + `package-lock.json`, `feature_list.json`,
  `progress.md`. Deleted `frontend/components/FarmMap.tsx`,
  `frontend/app/plots/[id]/page.tsx`.
- Next best step at the time: `feat-016` (completed later in this same
  session — see below).

### Session 011 (continued) — feat-016

- Goal: Implement `feat-016` — the Farm Dashboard screen.
- Implemented `frontend/components/RecommendationCard.tsx` (reusable
  6-field card, per `ui-build-plan.md`'s explicit "reuse one card
  component" guidance — will be reused by `feat-017`/`feat-018`) and
  `frontend/app/dashboard/page.tsx`: health score, active alerts, tasks
  due today, weather, top 5 recommendations, asset status grid. Added a
  Dashboard nav link and widened the main content area
  (`max-w-3xl` -> `max-w-5xl`) for the richer grid layouts.
- Verified: `npm run build`/`npm run lint` clean. Playwright walkthrough
  (localhost origin) — zero errors, all 5 sections render. Cross-checked
  every number against the direct `GET /dashboard/summary` values
  captured during `feat-013`'s verification: health score 70, 1 active
  alert, 7 tasks due (9 pending minus the 2 approved/rejected in
  `feat-013`), exact weather match, correctly sorted top-5
  recommendations, correct per-asset scores/status.
- Result: `feat-016` moved to `passing` in `feature_list.json`.
- Files updated: `frontend/components/RecommendationCard.tsx` (new),
  `frontend/app/dashboard/page.tsx` (new), `frontend/app/layout.tsx`,
  `feature_list.json`, `progress.md`.
- Next best step: `feat-017` — the asset detail screen. This is the one
  that finally makes `/assets/{id}` a real route instead of 404ing.

## Session 012

- Date: 2026-07-14
- Goal: Implement `feat-017` — the asset detail screen (Screen 3), the
  next unfinished feature per `feature_list.json`.
- Found on session start that `frontend/app/assets/[id]/page.tsx` and a
  supporting `ApiError` class in `frontend/lib/api.ts` already existed,
  uncommitted, in the working tree from an interrupted prior session (not
  recorded in `progress.md`/`feature_list.json`). Reviewed the code
  rather than discarding it — it was substantially complete (type-specific
  sensor readings, AI analysis, prediction, recommendation cards with
  approve/reject, today's tasks, history) but had leftover `DEBUG`
  `console.log` calls and, per this session's live verification, two real
  bugs (see below).
- Cleaned up: removed the debug logging; found and deleted 3 leftover
  `*-TEST-*` `RECOMMENDATIONS` rows in the live Snowflake account (labeled
  "race-condition debugging" in their own text) left over from that
  interrupted session — real demo data pollution, not legitimate content.
- Verified (runtime, against the live account, not just build):
  - `npm run build` / `npm run lint` clean.
  - Ran `POST /workflow/run` live (91.9s) to generate 4 fresh real
    `RECOMMENDATIONS` for FP-001 (still in its critical DO crisis).
    Playwright walkthrough (localhost origin, per `feat-015`'s known CORS
    finding) confirmed: home page click-through to `/assets/FP-001`; real
    sensor values, critical risk badge, prediction card, all 4
    recommendation cards with full 6-field content; `/assets/DOES-NOT-EXIST`
    404s cleanly.
  - **Bug 1 (found + fixed):** `handleDecision()` called `load()` without
    awaiting it, then cleared `pendingId` in a `finally` block immediately
    after — re-enabling the Approve/Reject buttons on the stale
    pre-refresh card during the ~4-5s Snowflake round-trip for the
    refetch. A first walkthrough pass (run via a sub-agent) misread the
    UI as unresponsive and rapid-double-clicked, unintentionally approving
    all 4 fresh FP-001 recommendations. Root-caused with a scripted
    Playwright click-and-poll test (confirmed the POST and refetch GETs
    were correct; only the button's disabled window was too short). Fixed
    by making `load()` return its promise and awaiting it before clearing
    `pendingId`. Re-verified with the same script: button now stays
    disabled through the whole refresh; a fresh approve (2->1 pending) and
    reject (1->0 pending) each worked correctly with zero console errors.
  - **Bug 2 (found + fixed):** `READING_FIELDS_BY_TYPE` didn't match
    `asset_simulator.py`'s actual per-type fields or
    `docs/FarmTwin-AI-Copilot.md`'s "Simulated Data" spec: `chicken_coop`
    was missing `water_l` (a real chicken metric); `rice_field` wrongly
    listed `water_l` (chicken-only, always null for rice); `fruit_orchard`
    was missing `growth_stage` (which the simulator *does* generate for
    orchards) and wrongly listed `air_temp_c`/`humidity_pct` (chicken-only,
    always null for orchard). Fixed all three lists to match the vision
    doc and simulator exactly. Re-verified live: a scripted pass over all
    4 asset ids confirmed the exact expected field-label set per type with
    zero `—` placeholder dashes remaining (e.g. FO-001 correctly showed
    real growth stage `harvest ready`, consistent with `feat-014`'s
    evidence of the orchard's harvest-ready recommendation).
  - Stopped `uvicorn` and `next dev` cleanly after verification.
- Result: `feat-017` moved to `passing` in `feature_list.json` with the
  above evidence recorded.
- Files updated: `frontend/app/assets/[id]/page.tsx` (debug cleanup + 2
  bug fixes), `frontend/lib/api.ts` (picked up the pre-existing `ApiError`
  addition, no further change), `feature_list.json`, `progress.md`. Also
  deleted 3 stray test rows directly from the live `RECOMMENDATIONS` table
  (not a file change, but a live-data cleanup worth recording).
- Known side effect: FP-001's recommendation backlog was fully drained
  (all approved/rejected) as a result of live-testing the approve/reject
  flow — the next `/workflow/run` call will regenerate fresh ones since
  the pond is still critical. Not a regression; just means a fresh demo
  run should call `/workflow/run` once before showing the asset detail
  screen if pending recommendations are wanted on screen.
- Next best step: `feat-018` — the AI Copilot panel (persistent
  cross-screen recommendation feed + free-form question box wired to
  `POST /copilot/ask`), then `feat-019` (daily briefing screen rebuild).

## Session 013

- Date: 2026-07-14
- Goal: Implement `feat-018` — the AI Copilot panel (Screen 4), the
  vision doc's explicit centerpiece requirement.
- Design decision: a persistent floating-action-button + slide-over panel
  (`frontend/components/CopilotPanel.tsx`), mounted once in
  `frontend/app/layout.tsx` (the root layout, not remounted by App Router
  on client-side navigation) rather than a dedicated `/copilot` route.
  This makes conversation state genuinely survive navigating between
  screens, which is what "persistent surface... not a screen you visit
  occasionally" actually requires, not just a floating button that resets
  every time. Two sections: a read-only "Today's priorities" feed
  (reuses `RecommendationCard`, sourced from `GET /dashboard/summary`'s
  already priority-sorted `top_recommendations` -- no inline
  approve/reject, matching the existing Dashboard screen's precedent for
  the same shared component and avoiding duplicating `feat-017`'s
  action-handling logic in a second place) and a chat-style "Ask a
  question" box wired to `POST /copilot/ask`, with the vision doc's 3
  example questions as quick-select chips.
- Verified (runtime, against the live account, not just build):
  - `npm run build` / `npm run lint` clean.
  - Playwright walkthrough against live `uvicorn` + `next dev`: from `/`,
    opened the panel, confirmed the correct empty-state message when 0
    recommendations were pending (real state at the time, drained during
    `feat-017`'s live testing), asked "What should I do today?" and got a
    real grounded multi-asset answer (FP-001 critical DO crisis with full
    6-field recommendations and Q4-2024 history citations, FO-001
    correctly flagged harvest-ready, CC-001/RF-001 correctly healthy)
    ending with a concrete next step.
  - Closed the panel, used a **real client-side nav-link click** (not
    `page.goto`, which triggers a full reload and would unfairly reset
    state) to navigate to `/dashboard`, reopened the panel, and confirmed
    the prior Q&A exchange was still there -- proves true cross-screen
    persistence, not per-page state. Asked "Should I feed the fish?" from
    the dashboard screen and got a real grounded "No" answer with the
    same live data, ending with a concrete next step.
  - Triggered a fresh `POST /workflow/run` (77.4s) to generate 5 real
    pending recommendations, then confirmed the "Today's priorities"
    section renders all 5 as real `RecommendationCard`s matching
    `GET /dashboard/summary` exactly. (A first check with too short a
    wait misread this as 0 cards -- a test-script timing issue on the
    live Snowflake round-trip, not a real bug; confirmed correct on
    rechecking with a longer wait.)
  - Zero console/page errors throughout. Stopped `uvicorn`/`next dev`
    cleanly after verification.
- Result: `feat-018` moved to `passing` in `feature_list.json` with the
  above evidence recorded. **All backend features and 4 of 5 frontend
  features (`feat-008`–`feat-018`) are now `passing`** -- only `feat-019`
  (daily briefing rebuild) remains.
- Files updated: `frontend/components/CopilotPanel.tsx` (new),
  `frontend/app/layout.tsx`, `feature_list.json`, `progress.md`.
- Next best step: `feat-019` — rebuild `frontend/app/briefing/page.tsx`
  against the real `GET /briefing/today` (it currently has only the
  minimal feat-015 compat patch, not a real redesign).

## Session 014

- Date: 2026-07-14
- Goal: Implement `feat-019` — rebuild the daily briefing screen (Screen
  5), the last unfinished feature in `feature_list.json`.
- Found the data-source swap (`GET /briefing/today` against
  `RECOMMENDATIONS`) had already been done as a minimal compat patch back
  in `feat-015`. The remaining work was the deferred "proper design
  pass": replaced the bespoke compact `RecommendationRow` with the shared
  `RecommendationCard` component (full 6-field detail, consistent with
  Screens 2/3/4) plus a small approved/rejected-by-whom-and-when line via
  its existing `children` slot. Removed the stale placeholder comment.
- Verified (runtime, against the live account):
  - `npm run build` / `npm run lint` clean.
  - Approved one real pending FP-001 recommendation and rejected another
    via live API calls, then a Playwright walkthrough of `/briefing`
    confirmed correct real counts ("Approved (12)" / "Rejected (11)"),
    both just-actioned recommendations visible in the right section with
    correct decision metadata, 23 total real recommendation cards, a real
    Cortex-generated summary, and zero console errors.
  - **False-alarm investigation (documented for the record since it took
    real verification effort):** mid-session, curl/JSON terminal output
    appeared to show double-UTF-8-encoded mojibake (e.g. `â€”` instead of
    an em-dash) in some recommendation text, which looked like a real
    backend/Cortex-Agent-client encoding bug. Root-caused via three
    independent checks that bypassed the terminal-display layer (a
    direct Snowflake execute()/run_query() round-trip written to a file,
    a fresh isolated `ask_agent()` call written to a file, and a final
    Playwright DOM-text extraction of the live rendered briefing page) --
    all three showed correctly encoded characters (real em-dashes,
    degree signs, arrows) with zero corruption. The apparent corruption
    was purely an artifact of how curl's UTF-8 output renders back
    through this Windows terminal/Bash-tool pipeline in this environment,
    not a real defect anywhere in the app or stored data. One demo
    recommendation row was deleted mid-investigation based on the
    since-disproven theory (regenerable test content, not seed data --
    no real loss).
- Result: `feat-019` moved to `passing` in `feature_list.json` with the
  above evidence recorded. **All 12 roadmap features (`feat-008` through
  `feat-019`) are now `passing`** -- the FarmTwin pivot is
  feature-complete.
- Files updated: `frontend/app/briefing/page.tsx`, `feature_list.json`,
  `progress.md`.
- Next best step: no unfinished feature remains in `feature_list.json`.
  If continuing: `docs/FarmTwin-AI-Copilot.md`'s "Future Features"
  section, a fresh full end-to-end demo walkthrough across all 5 screens
  in one sitting, or hardening the per-asset transaction-rollback
  limitation noted under `feat-012`.

## Session 016 — feat-020

- Date: 2026-07-14
- Goal: Implement `feat-020` — reuse Snowflake connections instead of
  opening a fresh one per query, the root-caused fix for "dashboard
  loads slowly" from Session 015's investigation.
- Implemented: `backend/app/services/snowflake_client.py`'s
  `get_connection()` now returns a `threading.local()`-scoped
  connection, created lazily and reused across queries/requests on that
  thread (recreated only if `is_closed()`), instead of a fresh
  `connect()` + `close()` on every single call. `run_query`/`execute`/
  `execute_many` no longer close the connection after use.
- Verified (runtime, against the live account, with a genuine
  before/after comparison per the feature's own verification bar):
  - `python -m compileall app` clean.
  - Measured `GET /dashboard/summary` (4 sequential queries/request), 5
    calls each: used `git stash` to get a true baseline on the
    unmodified code, timed it, then `git stash pop` to restore the fix
    and re-timed. **Before:** 4.36s / 3.76s / 3.24s / 3.85s / 2.89s
    (consistently 3-4.4s). **After:** 1.46s on the first (cold-thread)
    call, then 0.34s / 0.46s / 0.33s / 0.34s once warm -- roughly an
    85%+ reduction after warm-up, ~3x faster even on the first cold
    call.
  - Correctness: `GET /assets` cross-checked field-for-field against a
    direct `run_query()` SELECT -- exact match. A live approve
    immediately followed by a re-fetch on the same reused connection
    correctly showed the pending count drop (2 -> 1), confirming writes
    commit and are visible immediately, no transaction leakage. Fired 8
    concurrent `GET /assets` requests and confirmed all 8 returned
    identical correct data -- the thread-local design is safe under
    concurrency.
- Result: `feat-020` moved to `passing` in `feature_list.json` with the
  above evidence recorded.
- Files updated: `backend/app/services/snowflake_client.py`,
  `feature_list.json`, `progress.md`.
- Known, documented scope limit (not fixed, matching this repo's
  precedent of accepting hackathon-scale limits): no retry/backoff if a
  connection expires server-side after a long idle period -- would
  surface as a query error on next use rather than silently recovering.
  Well outside a demo session's timespan, not worth the added
  complexity.
- Next best step: `feat-021` — shared frontend data-fetch cache/hook.

## Session 017 — feat-021

- Date: 2026-07-14
- Goal: Implement `feat-021` — the shared frontend data-fetch cache/hook
  (the user's original "cache or hooks" ask), complementary to
  `feat-020`'s backend fix.
- Implemented `frontend/lib/dataCache.ts` (module-level cache keyed by
  string: value+timestamp, in-flight de-dup, 20s TTL, `invalidate(key)`
  that clears and immediately re-fetches in the background using the
  last-registered fetcher) and `frontend/lib/useApiData.ts` (a hook on
  top of it via React 18+'s built-in `useSyncExternalStore` — no new
  dependency, per the earlier `AskUserQuestion` answer). Wired
  `dashboard/page.tsx` and `CopilotPanel.tsx` to the same
  `'dashboard-summary'` cache key, and `assets/[id]/page.tsx`'s
  approve/reject handler to call `invalidate('dashboard-summary')`.
- Hit and fixed two React 19 lint errors on the first pass (ref written
  during render; `setState` called synchronously at the top of an
  effect, ahead of the async call) — both are stricter-than-expected
  hook rules `frontend/AGENTS.md` already warns this Next.js/React
  version has. Fixed by moving the ref write into its own
  no-deps `useEffect` and moving all `setState` calls inside the
  `load()` promise chain.
- Verified (runtime, against the live account):
  - `npm run build` / `npm run lint` clean.
  - Playwright: loading `/dashboard` (which mounts both the Dashboard
    page and the globally-mounted `CopilotPanel`, both requesting the
    same cache key) fired exactly 1 `GET /dashboard/summary` call, not
    2. Opening the Copilot panel afterward fired 0 additional calls
    (cache hit). Recorded "Tasks due today" = 5, approved one real
    pending recommendation from the `/assets/FP-001` page, navigated
    back to `/dashboard`, and "Tasks due today" correctly read 4 —
    proving `invalidate()` on one screen makes a different,
    independently-mounted screen show fresh data automatically. Zero
    console errors.
  - Caught and resolved a measurement false-alarm mid-verification: an
    unscoped Playwright locator counted 10 "View asset" links with the
    panel open against an API count of 5, which looked like a
    duplicate-render bug. Rescoping the locator to just the panel's own
    container showed exactly 5 — the extra 5 were the Dashboard page's
    own "Daily recommendations" section still mounted underneath the
    modal overlay, not a real bug.
- Result: `feat-021` moved to `passing` in `feature_list.json` with the
  above evidence recorded.
- Files updated: `frontend/lib/dataCache.ts` (new),
  `frontend/lib/useApiData.ts` (new), `frontend/app/dashboard/page.tsx`,
  `frontend/components/CopilotPanel.tsx`,
  `frontend/app/assets/[id]/page.tsx`, `feature_list.json`,
  `progress.md`.
- Next best step: `feat-022` — the split-screen Farm view (map left,
  dashboard/asset-detail panel right).

## Session 018 — feat-022

- Date: 2026-07-14
- Goal: Implement `feat-022` — the split-screen Farm view (map left,
  dashboard-or-asset-detail right, with a back button), replacing the
  separate `/` and `/dashboard` pages per the user's explicit request
  and the earlier `AskUserQuestion` decision to replace the home page
  entirely.
- Implemented:
  - `frontend/components/DashboardPanel.tsx` and
    `frontend/components/AssetDetailPanel.tsx`: extracted feat-016's and
    feat-017's page content into reusable panels taking callback props
    (`onSelectAsset`, `onBack`, `assetId`) instead of `<Link>`
    navigation / `useParams()`.
  - `frontend/components/SplitFarmView.tsx`: the shell -- map docked
    left, right column swaps between the two panels via local React
    state (`selectedAssetId`), keyed by asset id so switching assets
    resets cleanly via remount rather than manual state-reset calls
    (which would have hit the same synchronous-setState-in-effect lint
    rule `feat-021` ran into).
  - `frontend/app/page.tsx` and `frontend/app/assets/[id]/page.tsx` both
    now just render `<SplitFarmView>`; `frontend/app/dashboard/page.tsx`
    is now a server-side `redirect("/")`. `layout.tsx` dropped the
    redundant "Dashboard" nav link and widened to `max-w-7xl`.
  - Key design decision: avoided using `router.push()`/`replace()` for
    the click-to-select interaction, since Next.js App Router remounts
    a route's whole tree when switching between different route files
    (`/` vs `/assets/[id]`), which would flicker/reload the map on every
    click -- the opposite of "swap in-place". Instead, clicks only
    update local state, and a small `syncUrl()` helper calls
    `window.history.replaceState()` directly (bypassing Next's router)
    to keep the address bar accurate for sharing/reload without
    triggering a remount.
  - `DigitalTwinMap.tsx`: markers are now `<button onClick>` instead of
    `<Link href>`, with a new `selectedAssetId` prop that draws a blue
    outline on the currently-open asset.
- Verified (runtime, against the live account):
  - `npm run build` / `npm run lint` clean.
  - Playwright walkthrough confirmed every point in the feature's
    verification list: map+dashboard both visible on load; all 4
    markers correctly swap the right panel in place (URL updating via
    `history.replaceState`, zero page reload); approving a real pending
    FP-001 recommendation from the panel worked exactly as feat-017's
    standalone page did (4 -> 3 pending); "Back to dashboard" correctly
    reverted the right panel and URL; a fresh direct load of
    `/assets/FO-001` correctly opened the split view pre-selected;
    `/dashboard` correctly redirected to `/`. Zero console errors.
    Screenshots captured of both states.
  - Found and fixed a real, previously-latent bug: a hovered marker's
    tooltip could visually/functionally overlap a neighboring marker
    closely enough to block its click (Playwright reported "element
    intercepts pointer events") -- present since `feat-015` but never
    exercised because prior verification only ever clicked one marker
    per page load. Fixed with `pointer-events-none` on the tooltip.
- Result: `feat-022` moved to `passing` in `feature_list.json` with the
  above evidence recorded.
- Files updated: `frontend/components/DashboardPanel.tsx` (new),
  `frontend/components/AssetDetailPanel.tsx` (new),
  `frontend/components/SplitFarmView.tsx` (new),
  `frontend/components/DigitalTwinMap.tsx`, `frontend/app/page.tsx`,
  `frontend/app/assets/[id]/page.tsx`, `frontend/app/dashboard/page.tsx`,
  `frontend/app/layout.tsx`, `feature_list.json`, `progress.md`.
- Known, accepted tradeoff (documented, not fixed): switching assets
  while already in the split view doesn't push a new browser-history
  entry (only the initial load / explicit deep-links do), so the
  browser back button doesn't step back through each asset selection.
  Matches this repo's precedent of accepting reasonable UX tradeoffs
  over the complexity of manual history-stack management.
- Next best step: `feat-023` — the cartoon terrain redesign, first of
  the visual-overhaul features.

## Session 019 — visual overhaul batch (feat-023 through feat-029)

- Date: 2026-07-14
- Goal: user said "continue to automate from feat-023 to feat-029" --
  working through the whole visual-overhaul batch in one session,
  committing each feature separately with real verification (build,
  lint, live Playwright screenshot against real data) per this repo's
  standard rigor, but with more compact evidence entries than earlier
  sessions to keep pace across 7 features.
- Kept one backend + one frontend dev server running for the whole
  batch (restarting only if something crashed) rather than
  starting/stopping per feature, to move faster across 7 similar
  verification passes.

### feat-023 — cartoon terrain redesign

- Added `frontend/components/FarmTerrain.tsx`: 3-shade textured grass
  (deterministic per-tile hash, not flat color), dirt paths computed
  from a fixed central farmhouse position (5,5) out to each real
  asset's grid_x/grid_y (asset-driven, not hardcoded), a farmhouse
  emoji landmark, 4 corner trees, a soft sun-glow. Exported the shared
  tile constants so `DigitalTwinMap.tsx` stopped duplicating them.
- `npm run build`/`npm run lint` clean. Playwright screenshot against
  live data confirmed correct rendering, real asset positions
  unaffected, zero console errors, marker click-through/hover
  unaffected (terrain layers are `pointer-events-none`).
- Result: `passing`.

### feat-024 — fish pond marker

- `frontend/components/FishPondMarker.tsx`: gradient water oval, dock
  plank, shimmer + 2 independent fish-swim CSS keyframes (globals.css),
  water tint/ring shifting per real status -- murky/still when critical
  (fish hidden), bright/clear with visible fish when healthy.
- Verified live: FP-001 (real critical DO state) renders murky with a
  pulsing red ring, no fish. Healthy branch verified by code inspection
  only -- FP-001 is the farm's only fish_pond and is intentionally kept
  critical for the demo narrative, so no live healthy fish-pond data
  exists to screenshot against.
- Result: `passing`.

### feat-025 — chicken coop marker

- `frontend/components/ChickenCoopMarker.tsx`: red-roofed coop over a
  fenced yard, 2 chickens with independent bob/peck keyframes, a
  decorative egg (not wired to the exact egg_count reading -- that
  field isn't in the map's AssetOverview data model, and fetching it
  per-asset just for map decoration would work against feat-021's
  performance goals for a purely cosmetic touch).
- Verified live (full screenshot + cropped closeup): CC-001 renders
  correctly with a healthy emerald ring.
- Result: `passing`.

### feat-026 — rice paddy marker with real growth-stage visuals

- Unlike feat-025's egg_count, growth_stage/irrigation_status are the
  actual point of this feature, so extended `GET /assets`
  (`backend/app/main.py`) with a second CTE joining each asset's latest
  reading alongside the existing latest-risk CTE -- still one query, no
  N+1 pattern. Added the 3 new fields to `AssetOverview` (backend
  Pydantic model + frontend TS interface): growth_stage,
  irrigation_status, harvest_readiness_pct.
- `frontend/components/RiceFieldMarker.tsx`: 6 swaying CSS blades whose
  height/color come from a STAGE_STYLE table keyed by the real
  growth_stage; a water-shimmer overlay when irrigation_status ===
  'active'.
- Verified rigorously: drove 2 real `/workflow/run` ticks, observed
  RF-001 advance growth_stage 'vegetative' -> 'reproductive', confirmed
  via the asset detail panel, then inspected the marker's actual
  computed DOM styles and confirmed all 6 blades were exactly
  height:18px / bg-emerald-600 -- precisely matching
  STAGE_STYLE.reproductive, not just a plausible-looking screenshot.
- Result: `passing`.

### feat-027 — fruit orchard marker with real harvest-readiness visuals

- `frontend/components/FruitOrchardMarker.tsx`: 2 swaying round-canopy
  trees (tree-sway keyframe) with fruit-dot count/color scaling
  directly from the real harvest_readiness_pct (already available from
  feat-026's backend extension, no further backend change needed).
- All 4 asset types now have dedicated markers; the original generic
  emoji-in-ring fallback is unreachable for real data but intentionally
  kept for any future new asset_type.
- Verified live: FO-001 (real ~93% harvest readiness) rendered 5 fruit
  dots in deep-orange 'ripe' color, matching fruitCount(93)=5 and
  fruitColor(93)='orange-600' exactly.
- Result: `passing`.

### feat-028 — weather ambience layer

- `frontend/components/WeatherAmbience.tsx`: a pointer-events-none
  overlay -- sun-tint opacity scaled by real temp_c, 2 drifting clouds,
  animated rain shown only when rainfall_mm > 0.5. Wired via
  `SplitFarmView.tsx` reusing the same `'dashboard-summary'` cache key
  DashboardPanel/CopilotPanel already use (feat-021) -- zero extra
  network calls.
- Verified live: real weather was rainfall_mm=5.3, confirmed animated
  raindrops rendered; clicked through all 4 markers afterward to
  confirm the overlay doesn't block interaction.
- Result: `passing`.

### feat-029 — expressive status indicators

- `frontend/components/StatusIndicators.tsx`: `topPriorityAssetId()`
  picks the single worst-status asset farm-wide (severity-ranked,
  health-score tie-break) for a pulsing spotlight halo; every critical
  asset gets a bouncing alert badge; every healthy asset gets a gentle
  sparkle. Layers on top of feat-024-027's graphics, doesn't replace
  them.
- Verified live with a precise DOM-count check (not just a screenshot,
  since the animation's mid-cycle state isn't reliably visible in a
  static capture): exactly 1 spotlight halo + 1 alert badge (both on
  FP-001, the sole critical asset) and exactly 3 sparkles (one per
  healthy asset).
- Result: `passing`. **All 22 features in feature_list.json are now
  `passing`** -- the visual-overhaul batch (feat-023-029) and the
  earlier performance/UX batch (feat-020-022) are both complete,
  closing out every improvement the user requested this session.
- Next best step: none required. Future direction would come from
  `docs/FarmTwin-AI-Copilot.md`'s "Future Features" section or general
  hardening.

## Session 020 — UX design review: new roadmap feat-030 through feat-038

- Date: 2026-07-15
- The user gave a detailed 9-point UX design review across 3 areas
  (Layout & Scale; Farm digital twin map; Farm dashboard info panel)
  and asked for the code to be checked for weak points and a feature
  list drafted.
- Verified every point against the actual code (not just taken at face
  value) before planning: read `layout.tsx`, `SplitFarmView.tsx`,
  `RecommendationCard.tsx`, `DashboardPanel.tsx`, `DigitalTwinMap.tsx`,
  `StatusIndicators.tsx`, `FishPondMarker.tsx`, `ChickenCoopMarker.tsx`,
  `AssetDetailPanel.tsx`, `Card.tsx`. All 9 points confirmed accurate:
  - `layout.tsx`'s shared `max-w-7xl` container does cause dead space
    on wide screens (#1); right panel scrolling uses the stock browser
    scrollbar (#2); `FarmTerrain.tsx` only has a farmhouse + 4 corner
    trees (#3); `FishPondMarker` really does use a different container
    shape (`rounded-[50%]`) than the other 3 markers'
    (`rounded-2xl`) (#4); `StatusIndicators.tsx` gives critical and
    healthy their own icon but `needs_attention` has none at all --
    color-only (#5); `DashboardPanel`'s alert rows have no hover
    connection to the map (#6); `RecommendationCard.tsx` always renders
    full Reason/Evidence/Expected-impact/Confidence with no collapse
    (#7, and confirmed this affects `AssetDetailPanel` and the briefing
    screen too, not just the dashboard); health score is a bare number
    with no gauge/trend (#8); the weather row is 4 equal-weight
    icons (#9).
  - Also found during this review, not separately requested: map marker
    buttons have no `aria-label` for screen readers, and the 4 marker
    components each duplicate their own container/ring styling with
    nothing stopping further shape drift as more markers get added.
- Wrote 9 new features into `feature_list.json` (`feat-030` through
  `feat-038`, all `not_started`), one per user-reported point plus the
  aria-label gap folded into the color-blind-icon feature since it
  touches the same code:
  - `feat-030`/`feat-031`: full-width split layout, themed scrollbar.
  - `feat-032`: more decorative (non-interactive) farm scenery.
  - `feat-033`: extract a shared `MarkerFrame` component so all 4
    marker types share one container shape instead of independently
    duplicating it (directly fixes the fish-pond-oval inconsistency and
    prevents future drift).
  - `feat-034`: a 3rd status badge for `needs_attention` (currently
    the only unmarked state) plus aria-labels on marker buttons.
  - `feat-035`: hover-highlight linking sidebar alerts/recommendations
    to their map marker (click-to-open already existed).
  - `feat-036`: collapsible recommendation cards, applied to the one
    shared `RecommendationCard` component everywhere it's used.
  - `feat-037`: health score gauge + session-scoped trend arrow (no
    backend history table exists for this derived metric, so trend is
    necessarily session-scoped -- documented as an accepted limit).
  - `feat-038`: weather row redesigned around one primary metric.
- No code changed yet this session -- planning only, matching this
  repo's precedent for scope additions (Session 010's pivot, Session
  015's performance/UX roadmap).
- **Follow-up same session:** the user then explicitly asked to delete
  the "generated code features" from the feature list; asked
  `AskUserQuestion` to confirm scope (rejected the structured tool, but
  answered directly in text: "features before feat-030"). Removed
  `feat-008` through `feat-029` (22 entries, all `passing`) from
  `feature_list.json`'s active `features` array via a script (clean
  JSON rewrite, not a manual/error-prone hand-edit of 22 nested
  entries), added a `completed_note` field pointing back to this file's
  Session 011-019 entries for their full evidence trail, bumped
  `last_updated` to 2026-07-15. Nothing was deleted from the repository
  or from progress.md -- only removed from feature_list.json's active
  list, exactly mirroring the 2026-07-14 pivot_note's precedent for the
  original feat-001-007.
- Next best step: `feat-030` (full-width layout) -- smallest, most
  foundational change, unblocks `feat-031`.

## Session 021 — implement feat-030 through feat-038 (UX design review batch)

- Date: 2026-07-15
- The user asked to automate implementation of all 9 features from
  Session 020's UX design review (`feat-030`–`feat-038`) in one pass,
  mirroring Session 019's precedent of working through a whole batch
  autonomously without stopping for a check-in after each feature.
- Implemented all 9, in priority order:
  - **feat-030** (full-width split layout): removed `mx-auto w-full
    max-w-7xl` from `layout.tsx`'s shared `<main>`; added `mx-auto flex
    w-full max-w-3xl` to `/briefing`'s own top-level wrapper so it keeps
    a readable width while the Farm split view now fills the viewport.
  - **feat-031** (themed scrollbar): added `.themed-scrollbar`
    (`scrollbar-color`/`scrollbar-width` + `::-webkit-scrollbar` rules,
    light+dark) to `globals.css`; applied the class to `SplitFarmView`'s
    right panel.
  - **feat-032** (decorative terrain): added `EXTRA_TREES`, `BUSHES`,
    `WELL_POS`, `VEHICLE_POS`, `PERSON_POSITIONS`, and sparse fence-post
    pairs along paths to `FarmTerrain.tsx`, all filtered against real
    asset/farmhouse grid positions before rendering so nothing ever sits
    on an interactive marker. Purely decorative, `pointer-events-none`,
    no new fake data-backed assets (matches feat-024/025 precedent).
  - **feat-033** (shared MarkerFrame): new `components/MarkerFrame.tsx`
    (fixed 64x56 rounded-2xl frame, status ring, selected-outline); all
    4 marker components (`FishPondMarker`, `ChickenCoopMarker`,
    `RiceFieldMarker`, `FruitOrchardMarker`) now render through it,
    replacing `FishPondMarker`'s old `rounded-[50%]` oval.
  - **feat-034** (status iconography + a11y): `StatusIndicators.tsx`
    gained a `needs_attention` badge (amber circle, triangle glyph, new
    `attention-pulse` keyframe) and the old ambiguous sparkle on
    `healthy` was replaced with a checkmark-in-circle badge — all 3
    statuses now differ by glyph *and* color, not color alone. Added
    real `aria-label`s (name, type, status) to marker buttons in
    `DigitalTwinMap.tsx`.
  - **feat-035** (hover-highlight linking): `highlightedAssetId` state
    added to `SplitFarmView.tsx`; hover handlers on `DashboardPanel`'s
    Active Alert rows and recommendation cards set it; `DigitalTwinMap`
    renders a new `highlight-pulse` halo (distinct color/speed from both
    the top-priority spotlight and the selected outline) on the matching
    marker.
  - **feat-036** (collapsible recommendation cards): `RecommendationCard`
    rewritten with local `expanded` state — Reason/Evidence/
    Expected-impact/Confidence collapsed by default behind a "View
    details" toggle; Approve/Reject and the asset link stay always
    visible since they're actions, not explanatory text. Applies
    globally (Dashboard, asset detail, briefing, Copilot panel all share
    this one component).
  - **feat-037** (health gauge + trend): new `components/HealthGauge.tsx`
    (SVG radial gauge, 0-100) plus `healthScoreTrend()` in
    `lib/dataCache.ts` — a module-level, session-scoped previous-score
    comparison (no backend history table exists for this derived metric;
    documented accepted scope limit, resets on a hard page reload but
    persists across in-app navigation). Wired into `DashboardPanel` via
    a microtask-deferred `setState` inside the effect, mirroring
    `useApiData.ts`'s existing fix for the same
    `react-hooks/set-state-in-effect` lint rule.
  - **feat-038** (compressed weather row): `DashboardPanel`'s Weather
    card redesigned — temperature large/bold as the primary metric,
    humidity/rainfall/wind as smaller secondary text.
- Verification, in order:
  1. `npm run build` and `npm run lint` in `frontend/` — both clean
     (0 errors/warnings) after one fix: a `react-hooks/set-state-in-effect`
     error in the new health-score-trend effect, fixed by deferring the
     `setTrend` call through a `Promise.resolve().then()` microtask
     (same pattern `useApiData.ts` already used for the identical rule).
  2. Started the real backend (`backend/venv`, `uvicorn app.main:app`)
     against the live Snowflake account, and the real frontend
     (`npm run dev`), and ran a single comprehensive Playwright script
     against both, driving real DOM/computed-style assertions (not just
     screenshots) for all 9 features against real data: CC-001 (healthy),
     FO-001 (healthy), FP-001 (critical, real DO alert), RF-001
     (healthy) — no asset was in `needs_attention` status at verification
     time, so that one badge was confirmed via a static check instead
     (grepped the compiled dev JS bundle for the `needs_attention`
     branch, its `ring-amber` mapping, and the `attention-pulse` keyframe
     reference — all present, not dead-code-eliminated).
  3. For feat-037's trend logic specifically, did a live temporal test:
     confirmed no trend arrow/marker on a fresh session's first load,
     then waited out the 20s `dataCache` TTL and forced a real refetch
     (navigate to an asset detail and back, which remounts
     `DashboardPanel` without a hard page reload) — the gauge correctly
     showed the "flat" trend marker because the live `farm_health_score`
     genuinely had not changed (70 → 70) between the two fetches,
     confirming the logic reads real data rather than a fixed value.
  4. Full evidence for all 9 features recorded directly in
     `feature_list.json`'s `evidence` arrays; all 9 flipped from
     `not_started` to `passing`.
- One debugging detour worth recording: an initial Playwright run
  reported feat-031's `scrollbar-color` as still `auto` (looked like a
  real bug). Root-caused as a test-harness artifact, not an app defect —
  traced through 3 checks: (a) the on-disk compiled `.next` CSS output
  already contained all 8 expected `.themed-scrollbar` rule occurrences,
  (b) a fresh cache-busted `curl` fetch of the served CSS chunk confirmed
  the same, (c) switching the DOM check from filtering only inline
  `<style>` tag text (which misses externally-linked `<link
  rel="stylesheet">` sheets entirely) to properly iterating
  `document.styleSheets` fixed the check immediately on a live page. Did
  a full dev-server + `.next` cache restart along the way as an extra
  precaution; the real fix was the test's DOM-inspection method, not
  anything in the app. A second false alarm (`markerCount=5` instead of
  4) was Next.js's own dev-mode "Open Next.js Dev Tools" overlay button
  incidentally matching a `button[aria-label]` selector — excluded it
  from the test query, not an app defect either.
- Installed `playwright` locally in `frontend/` via `npm install --no-save
  playwright` purely as a verification tool (not a runtime dependency —
  `node_modules/` is gitignored, `package.json`/`package-lock.json`
  untouched). Consistent with this repo's established no-new-dependency
  rule for shipped application code; this is test tooling only, same as
  every prior session's Playwright-based verification.
- Not yet pushed to `origin/main` — awaiting an explicit push request.

## Session 022 — swap in the v0-generated frontend redesign, wire to the real backend

- Date: 2026-07-16
- Goal: the user supplied a separately-built Next.js frontend at
  `farmtwin-ai-copilot-frontend/` (v0.app-generated: shadcn/ui, a
  pan/zoom digital twin map, dedicated `/copilot` route) and asked for it
  to be integrated with the real FastAPI backend. It shipped wired only
  to an in-memory `lib/mockData.ts`, with its own `lib/types.ts` contract
  that does not match `backend/app/models/schemas.py` field-for-field
  (e.g. `asset.id` vs `asset_id`, `confidence` 0-1 vs `confidence_pct`
  0-100, `growth_stage` as a 0-4 index vs the backend's string enum,
  `Task`/`Alert`/`Weather` shapes with no backend equivalent).
- Before writing any code, read the entire new frontend (`app/`,
  `components/`, `lib/`) end to end and cross-referenced every field
  against the real backend contract (re-derived from the old, still
  passing, `frontend/lib/api.ts` and `backend/app/models/schemas.py` /
  `backend/app/main.py`) to design a mapping layer rather than guessing.
  Confirmed via grep that no component hardcodes a mock asset id, so a
  pure `lib/api.ts` rewrite (no component changes needed) was safe.
- Asked the user two `AskUserQuestion`s before touching anything
  destructive, since this meant deleting the old, fully-`passing`
  `frontend/` directory: (1) replace `frontend/` entirely vs. run both
  side by side — user chose **replace entirely**; (2) the new project
  shipped with `pnpm-lock.yaml` while this repo's docs/precedent use
  npm — user chose **switch to npm**.
- Implemented:
  - Confirmed `git status` was clean under `frontend/` before removing
    it (`git rm -rq frontend`), then moved
    `farmtwin-ai-copilot-frontend/` into its place. (First attempt
    nested the new content one level too deep because `git rm` doesn't
    remove gitignored leftovers like `node_modules/`/`.next/`, which
    left the target directory non-empty for `mv` — caught immediately
    and corrected.) Removed the stale old `node_modules/`/`.next/`;
    kept the old `.env.local` (`NEXT_PUBLIC_API_URL=http://localhost:8000`),
    already exactly correct. Removed `pnpm-lock.yaml`, ran `npm install`,
    set `package.json`'s `name` back to `"frontend"`.
  - Rewrote `frontend/lib/api.ts` in full: every function now calls the
    real backend (`fetch` against `backend/app/main.py`'s endpoints)
    instead of `lib/mockData.ts`, through a mapping layer that converts
    each backend response shape onto the new frontend's own
    `lib/types.ts` contract -- `growth_stage` string -> 0-4 index
    (matching `asset_simulator.py`'s `GROWTH_STAGES` order exactly),
    `confidence_pct / 100`, `pending_approval` -> `pending`, a
    module-level asset-name cache (several backend endpoints return a
    recommendation/alert keyed only by `asset_id`, with no name
    attached), and per-reading `tone` coloring mirrored from
    `backend/app/services/risk_engine.py`'s own real thresholds (DO
    <3.5/<6.0, feed <15%, soil moisture <30%/>90%, disease >20%/>40%,
    etc.) rather than an invented judgment call. "Today's tasks" on the
    asset detail panel is built from that asset's pending
    recommendations (already filtered server-side to
    `pending_approval` by `/assets/{id}/recommendations`), matching
    `docs/ui-build-plan.md` Screen 3's original spec exactly. Deleted
    the now-dead `lib/mockData.ts`.
  - Deleted the old `frontend/components/AssetDetailPanel.tsx`'s
    `READING_FIELDS_BY_TYPE` table by way of reference (read it before
    the directory was removed) so the new `api.ts`'s per-type reading
    fields carry forward `feat-017`'s Session 012 field-correctness fix
    exactly, rather than re-deriving it from scratch.
- Verified (build/type/lint, then live runtime against the real
  backend + live Snowflake account -- not just a clean build):
  - `npm run build` passed, but `next.config.mjs` has
    `typescript: { ignoreBuildErrors: true }` (carried over from the v0
    export), which would silently hide real type errors -- ran
    `npx tsc --noEmit` directly instead of trusting the build. Found
    and fixed one real pre-existing type error unrelated to the api.ts
    rewrite (`components/BriefingView.tsx`: `{error && (...)}` where
    `error` is typed `unknown`, not narrowable to a renderable boolean
    -- fixed with `Boolean(error)`).
  - `npm run lint` initially failed with "'eslint' is not recognized"
    -- the v0 export has no ESLint installed or configured at all (no
    `eslint.config.mjs`, no eslint deps), so `npm run lint` had never
    actually run even before this session's changes. Recovered the old
    frontend's `eslint.config.mjs` via `git show HEAD:frontend/
    eslint.config.mjs` before it was gone, installed
    `eslint`/`eslint-config-next`, and got a real lint pass running for
    the first time on this codebase. That surfaced 4 real, pre-existing
    problems in the v0-generated components (none introduced by the
    api.ts rewrite): a `react-hooks/purity` error in `CopilotPanel.tsx`
    (`Date.now()` used for message ids -- fixed with a ref-based
    counter), two `react-hooks/set-state-in-effect` errors
    (`HealthGauge.tsx`, `WeatherAmbience.tsx` -- fixed with the same
    microtask-deferred-setState pattern `lib/useApiData.ts` already
    established), and one unused-variable warning (`DashboardPanel.tsx`'s
    dead `STATUS_TEXT` -- deleted). `npx tsc --noEmit` and `npm run
    lint` both clean after.
  - Started the real backend (`backend/venv`, live Snowflake account)
    and `npm run dev`, then ran a fresh Playwright install into the
    session scratchpad (not a project dependency) for live verification,
    matching this repo's established pattern:
    - `/`: 4 real asset markers rendered (`CC-001`/`FO-001`/`FP-001`/
      `RF-001`), dashboard showed the real farm health score (70) and 1
      real active alert.
    - Clicking Tilapia Pond A opened real sensor readings, a real
      Critical risk badge, and a real dissolved-oxygen value.
    - **Found and fixed a real bug live**: clicking a recommendation
      card on the dashboard threw a hydration/HTML-validity error --
      `DashboardPanel.tsx` wrapped each shared `RecommendationCard` in
      an outer `<button>`, but `RecommendationCard` itself renders its
      own `<button>`s (the "View details" toggle, Approve/Reject) --
      invalid nested-button HTML. Fixed by changing the outer wrapper
      to a `role="button"` `<div>` with keyboard support, and adding
      `e.stopPropagation()` to `RecommendationCard`'s internal buttons
      so clicking them doesn't also trigger the outer row's navigation.
    - **Found and fixed a second, subtler real bug live**: even after
      the button-nesting fix, a hydration mismatch still intermittently
      appeared on direct loads of `/assets/{id}` (reproduced 1-in-a-few
      reloads) -- traced to `lib/useApiData.ts` passing the same
      `getSnapshot` function as both the client-side AND server-side
      snapshot argument to `useSyncExternalStore`. `dataCache.ts`'s
      store is a module-level singleton that persists across requests
      within the same long-running Next dev server process, so SSR
      could read a stale value left over from a *previous* request,
      while the client's genuine first render (before its own fetch
      resolves) is always `undefined` -- a real mismatch, not a
      Playwright/timing artifact. Fixed by making the server snapshot
      always return `undefined`. Re-verified with 5 repeated fresh
      browser-context reloads of `/assets/FP-001` specifically:
      0 console/page errors on all 5, versus the intermittent failures
      before the fix.
    - Approved a real, live FP-001 recommendation through the UI (View
      details -> Approve) and cross-checked directly against
      `GET /assets/FP-001/recommendations`: pending count dropped
      13 -> 12, confirming a genuine Snowflake write-back through the
      new frontend, not a UI-only state change.
    - `/briefing` loaded in 40.2s (a real live Cortex Agent call, not
      cached) with a real generated summary citing exact real data (DO
      3.1 -> 2.0 mg/L across specific dates, the Q4-2024 crash
      cross-reference). One early check timed out at a too-short wait
      and looked like a hang -- re-ran with a realistic ~150s timeout
      per this repo's own documented Cortex Agent latency
      (60-150s/call) and got a clean real result; a test-timing false
      alarm, not an app bug, same category as prior sessions' findings.
    - `/copilot` answered a real free-form question ("Should I feed the
      fish?") in 37.5s with a real grounded "No", citing the live 2.0
      mg/L DO reading and 33.4°C water temperature -- not a canned
      string (the mock's `answerCopilot()` function no longer exists).
    - Zero console/page errors across every one of the above checks.
      Stopped the backend and `next dev` processes cleanly after
      verification.
  - `feat-039` recorded in `feature_list.json` with the full evidence
    trail above.
- Known, not fixed this session (out of scope -- pre-existing, backend-
  side, unrelated to the frontend swap itself): the live `/briefing`
  summary contained one leaked agent-planning sentence ("Let me broaden
  to recent days to ensure I capture...") -- the same class of
  narration-leak issue `backend/app/main.py`'s `_clean_agent_answer`/
  `_strip_narration_prefix` has repeatedly needed extending for (see
  Sessions 011-014 above); this is a new, unhandled phrasing shape, a
  backend fix, not a frontend integration bug. Flagged to the user,
  not fixed, per this repo's stay-in-scope rule.
- Files updated: `frontend/` replaced wholesale (old directory removed,
  new project moved in); within it: `lib/api.ts` (rewritten),
  `lib/useApiData.ts`, `components/DashboardPanel.tsx`,
  `components/RecommendationCard.tsx`, `components/BriefingView.tsx`,
  `components/HealthGauge.tsx`, `components/WeatherAmbience.tsx`,
  `components/CopilotPanel.tsx`, `package.json`, `eslint.config.mjs`
  (new), `pnpm-lock.yaml` (removed), `lib/mockData.ts` (removed).
  `feature_list.json`, `progress.md` updated.
- `docs/frontend-architecture.md` (written in Session 021 for the now-
  removed old frontend) was rewritten later in this same session to
  describe the new frontend -- see the doc itself for the full as-built
  writeup, including the same known issues list captured in the evidence
  above. `frontend/README.md` was also written (it had none before).
- Next best step: no unfinished feature was queued at the end of this
  session -- see Session 023 below for what came next.

## Session 023 — fix a new Cortex Agent narration-leak shape (feat-040)

- Date: 2026-07-16
- Goal: the user pasted a live, broken Daily Briefing overview directly
  into chat: a leaked agent-planning preamble ("Only one recommendation
  matched today's date exactly. Let me broaden to recent recommendations
  with approved/rejected statuses to ensure I capture all of \"today's\"
  decisions, and pull the driving risks.") glued directly ahead of the
  real summary text, with no separating space
  ("...risks.Today's recommendation activity..."). This is exactly the
  known, out-of-scope issue flagged (not fixed) at the end of Session
  022 -- the user hit it live before it was addressed.
- Root cause: `backend/app/main.py`'s `_strip_narration_prefix` only
  stripped narration whose first sentence began with one of a fixed list
  of lead-in phrases (`"I'll "`, `"Let me "`, ...) -- extended
  repeatedly across Sessions 011-014 as new phrasings appeared. This
  narration's opening sentence ("Only one recommendation matched...")
  didn't match any of them, so the whole function was a no-op here, even
  though a second, later sentence in the same narration block did start
  with "Let me ".
- Implemented a more general fix in `backend/app/main.py`: added
  `_strip_glued_narration()`, using the observation (consistent across
  every narration-leak shape documented in this repo's history, going
  back to Session 011) that the actual narration/answer seam is always a
  sentence-ending punctuation mark immediately followed by a capital
  letter or markdown bold marker with **no space** -- real prose always
  has a space there. Cuts at the *last* such seam (since narration
  itself can span multiple normally-spaced sentences before the final
  glued handoff into the real answer), and requires the punctuation be
  followed by `[A-Z*]` specifically (not a digit), so it never fires on
  a decimal number like "3.5". Wired into `_clean_agent_answer()` ahead
  of the existing phrase-based `_strip_narration_prefix()`, which is
  kept as a fallback for narration that survives with normal spacing
  throughout.
- Verified:
  - `python -m compileall app` — clean.
  - Wrote a scripted regression test (scratchpad, not committed) calling
    `_clean_agent_answer()` directly against 6 cases: (1) the exact
    reported leaked text -- correctly stripped down to "Today's
    recommendation activity is entirely concentrated on..."; (2) the
    `<answer>`-tag shape; (3) narration-into-heading; (4) a properly-
    spaced lead-in-phrase narration ("I have the data model. Let me
    pull..." -- the exact feat-014 shape); (5) a decimal-number sentence
    (negative case -- must be untouched); (6) already-clean text
    (negative case). All 6 passed, confirming the new heuristic fixes
    the reported bug with zero regressions against every previously-
    documented shape.
  - Live verification (not just the scripted test): started `uvicorn`
    against the live Snowflake account, called `GET /briefing/today` for
    real (34.5s, a genuine Cortex Agent call, not cached). The real
    response's summary began cleanly: "Every approved and rejected
    recommendation across the farm today concerns a single asset —
    **Tilapia Pond A (FP-001)**..." -- zero leaked narration, confirming
    the fix holds against genuine live agent output. Stopped `uvicorn`
    cleanly after verification.
- Result: `feat-040` added directly as `passing` in `feature_list.json`
  with the above evidence (this was a direct bug-fix request, not
  planned roadmap work, so it was implemented and verified in one pass
  rather than staged through `not_started`/`in_progress`).
- Files updated: `backend/app/main.py`, `feature_list.json`,
  `progress.md`.
- Note: `_clean_agent_answer()` is shared by `/workflow/run`'s
  recommendation summaries, `/briefing/today`, and `POST /copilot/ask`
  -- this fix applies to all three call sites, not just the briefing
  screen where it was reported.
- Next best step: none queued -- ask the user what to prioritize next.

## Session 024 — redesign the Daily Briefing Overview card (feat-041)

- Date: 2026-07-16
- Goal: the user supplied a detailed rendering/UI design brief for the
  Overview card, explicitly scoped to rendering only ("improve the
  rendering/UI, not the content generation"): render `**bold**` as real
  bold, break the single wall-of-text paragraph into short scannable
  paragraphs, ~1.6-1.8 line height, a constrained line length, sparing
  and *real* (not invented) badges for priority/status/confidence/risk,
  visual separation between the primary incident and the rest of the
  farm, and a clean dashboard aesthetic.
- Implemented:
  - `frontend/lib/markdown.tsx` (new): `renderInlineMarkdown()` -- a
    bold-only markdown renderer (splits on `**...**`, no new dependency,
    matches this repo's established minimal-dependency bias; the agent
    never emits headings/lists/links in this context, so a full
    markdown library isn't warranted) -- and `splitIntoSentences()`, a
    sentence-boundary regex requiring whitespace before the next capital
    letter or bold marker, so it never splits mid-decimal (e.g. "3.5
    mg/L" stays intact) while still splitting cleanly at real sentence
    boundaries. Verified by hand against 2 real captured summaries that
    this naturally produces sensible paragraph-per-logical-unit breaks
    (main incident / approved actions / rejected items / risk context)
    without needing to parse the content itself.
  - `frontend/components/BriefingOverview.tsx` (new): derives a
    "primary asset" from the real `Briefing.decisions` array (the
    asset_id referenced by the most decisions, not parsed out of the
    prose) and renders a badge banner above the prose -- the asset's
    real current `RiskBadge` status (via a newly-added `getAssets()`
    fetch sharing the app's existing `"assets"` cache key, so this is a
    free cache hit if the user already visited the Farm view this
    session), a real `PriorityBadge`, a real confidence-percent chip,
    and real approved/rejected count chips. Below that, the summary
    prose renders one short paragraph per sentence (via
    `splitIntoSentences`) with real bold text (via
    `renderInlineMarkdown`), `leading-[1.7]` and a `max-w-[68ch]`
    constraint. Below that, a visually separate "Rest of the farm" strip
    shows every other real asset as a small status dot-chip (reusing the
    same colored-dot visual language `DigitalTwinMap.tsx`'s legend
    already established elsewhere in the app).
  - `frontend/components/BriefingView.tsx`: now also fetches
    `getAssets()` and passes both `briefing` and `assets` into the new
    `BriefingOverview`, replacing the old single `<p>{briefing.summary}</p>`.
- Verified:
  - `npx tsc --noEmit`, `npm run lint`, `npm run build`: all clean.
  - Live Playwright, real backend + live Snowflake account + real Cortex
    Agent (not mocked): loaded `/briefing` (40.7s, a genuine live
    `/briefing/today` call). Confirmed zero occurrences of raw `**` in
    the page text; the Overview card rendered 6 real `<p>` paragraphs
    and 2 real `<strong>` elements; a "% confidence" chip, an
    "approved"/"rejected" chip, and the "Rest of the farm" section were
    all present; zero console/page errors.
  - Screenshots at 1280px (desktop) and 820px (tablet) viewports: badge
    banner showed "Tilapia Pond A", a red "Critical" risk badge, a
    "High priority" badge, "96% confidence", and "1 approved" -- an
    exact real-data match for the kind of badges the design brief asked
    for (High Priority / Approved / Confidence / Critical Risk). 6-8
    short, well-spaced, readable paragraphs at both widths, with real
    bold rendering (e.g. "**rejected**" rendered as actual bold text,
    confirmed visually, not literal asterisks). The "Rest of the farm"
    strip correctly listed the other 3 real assets (Layer House North,
    Mango Grove West, Paddy Block East) as status dot-chips, reflowing
    correctly at both widths.
  - Stopped `uvicorn`/`next dev` cleanly after verification.
- Found, not fixed (explicitly out of this session's scope): the second
  live `/briefing/today` call used for the tablet screenshot happened to
  contain a *different* narration-leak shape than the one fixed in
  Session 023's `feat-040` -- properly-spaced sentences ("Filtering to
  items actually approved/rejected today... so I'll summarize the
  decisions made in this active FP-001 crisis window.") that don't
  start with a recognized lead-in phrase and aren't glued to the next
  sentence, so neither of `_clean_agent_answer`'s current heuristics
  catches them. This is a content-generation-cleaning issue
  (`backend/app/main.py`), not a rendering bug -- the redesigned card
  still rendered that leaked text as clean, readable paragraphs,
  confirming the rendering fix itself is correct independent of input
  quality. Flagged to the user as a candidate follow-up, not actioned,
  since this session's task was explicitly rendering-only.
- Result: `feat-041` added directly as `passing` in `feature_list.json`.
- Files updated: `frontend/lib/markdown.tsx` (new),
  `frontend/components/BriefingOverview.tsx` (new),
  `frontend/components/BriefingView.tsx`, `feature_list.json`,
  `progress.md`.
- Next best step: none queued -- ask the user what to prioritize next.
  If continuing: fix the newly-found second narration-leak shape
  (backend), or extend `renderInlineMarkdown`/similar treatment to
  `CopilotPanel.tsx`'s chat messages and the Decision Log's
  recommendation text, both of which render raw Cortex Agent text
  without markdown parsing today (same latent issue class, not yet
  reported by the user or fixed).

## Session 025 — fix the second (non-glued) narration-leak shape (feat-042)

- Date: 2026-07-16
- Goal: the user asked to fix the second narration-leak shape flagged
  (not fixed) at the end of Session 024 -- some raw Cortex Agent
  responses have no glued (no-space) boundary anywhere, so `feat-040`'s
  fix has nothing to cut at, and the leading narration sentences don't
  necessarily start with a recognized lead-in phrase either.
- Before writing a fix, captured 3 fresh *raw* (uncleaned)
  `cortex_agent_client.ask_agent()` responses directly, using
  `/briefing/today`'s exact prompt, to study real narration shapes
  instead of guessing from the one rendered example available. All 3
  turned out to already be glued (i.e. already handled by `feat-040`) --
  useful negative-confirmation, but didn't reproduce the reported second
  shape on its own. Reconstructed that shape faithfully from the
  originally-reported rendered text instead (Session 024's tablet
  screenshot): "Every decided recommendation belongs to Tilapia Pond A
  (FP-001). Filtering to items actually approved/rejected *today*
  (approved_at on 2026-07-15) yields the single approved item; but the
  user asked about \"today's\" decisions broadly, so I'll summarize the
  decisions made in this active FP-001 crisis window. All approved and
  rejected recommendations today concern..." -- every sentence break
  here is a normal, properly-spaced one.
- Implemented in `backend/app/main.py`: replaced the old prefix-only
  phrase list (`_NARRATION_LEAD_INS`, matched only against the very
  start of the remaining text) with a content classifier,
  `_looks_like_narration(sentence)`: true if the sentence uses first-
  person process language (`I'll`/`I will`/`I'm going to`/`Let me`/
  `Let's`/`I have`/`I've`), references `"the user"`/`"my filter"`/
  `"my query"`, describes a filtering/querying step, or contains a raw
  snake_case field name (e.g. `approved_at`) -- a Snowflake column name
  leaking through, something genuine natural-language farm advice never
  does.
  - First attempt: stop stripping at the first sentence that doesn't
    match. **Failed** against the reconstructed case -- its first
    sentence ("Every decided recommendation belongs to...") reads as
    plausible content and doesn't itself trip any signal, even though
    the second sentence clearly is narration, so the loop gave up
    immediately without stripping anything.
  - Fix: scan a bounded window of the first 4 sentences (narration has
    only ever been observed as 1-2 sentences across every real sample
    in this project) and cut everything up to and including the LAST
    matching sentence in that window -- the same "cut at the last
    match" strategy `feat-040`'s glued-boundary fix already uses,
    applied to content signals instead of typography. This correctly
    carries along a plain-looking sentence sandwiched between two
    narration sentences.
- Verified:
  - `python -m compileall app` -- clean.
  - Scripted regression test (scratchpad, not committed), 10 cases: the
    original `feat-040` glued bug, the reconstructed second shape (now
    correctly stripped down to "All approved and rejected
    recommendations today concern..."), all 3 freshly-captured live raw
    samples (still handled correctly -- no regression), the
    `<answer>`-tag and heading shapes, a decimal-number negative case, an
    already-clean negative case, and a "filtration" negative case
    (confirms `"filtering to/for"` doesn't over-match unrelated real
    vocabulary like "mechanical filtration system") -- all 10 passed.
  - Separate idempotency test: 3 real, already-clean answers captured
    live in earlier sessions (a copilot "should I feed the fish" answer,
    a real briefing summary, a copilot multi-asset triage answer) all
    passed through `_clean_agent_answer` completely unchanged --
    confirms the new classifier doesn't false-positive on genuine
    multi-sentence prose.
  - Live verification: started `uvicorn` against the live Snowflake
    account, called `GET /briefing/today` for real (29.8s, a genuine
    Cortex Agent call). Real response summary began cleanly: "Today's
    activity is dominated entirely by **Tilapia Pond A (FP-001)**..." --
    zero leaked narration. Stopped `uvicorn` cleanly after verification.
- Result: `feat-042` added directly as `passing` in `feature_list.json`.
- Files updated: `backend/app/main.py`, `feature_list.json`,
  `progress.md`.
- Next best step: none queued -- ask the user what to prioritize next.
  The other item flagged in Session 024 (raw-markdown rendering in
  `CopilotPanel.tsx`'s chat messages and the Decision Log's
  recommendation text) remains unactioned.

## Legacy: rice-cooperative build (superseded 2026-07-14)

The original build (15 rice farms in the Mekong Delta, real Leaflet/OSM
map, single free-text Cortex narrative, `WORK_ORDERS` approve/reject) was
fully implemented and verified — all 7 features (`feat-001`–`feat-007`)
reached `passing` with real runtime evidence (Snowflake writes, live
Cortex Agent calls, Playwright browser walkthroughs). That full evidence
trail is preserved unedited in the "Session Log" below (sessions 001–009).
`feature_list.json` no longer lists those features — the file was rewritten
around the FarmTwin pivot per the user's explicit decision (see the
2026-07-14 pivot entry above and in `docs/architecture.md`). The old
Snowflake schema (`FARMS`, `SENSOR_READINGS`, `RISK_ASSESSMENTS`,
`WORK_ORDERS`, `CROP_HISTORY`) will be dropped/replaced by `feat-008`.

## Session Log

### Session 010

- Date: 2026-07-14
- Goal: Sync project docs and the feature roadmap to
  `docs/FarmTwin-AI-Copilot.md`, which the user added to the repo as a new
  product vision doc, and flag anything ambiguous before touching
  `feature_list.json` (per the user's explicit "ask me if something make
  you confused" instruction).
- Compared the new vision doc against the current, fully-`passing` build
  (read `progress.md`, `feature_list.json`, `docs/architecture.md`,
  `docs/ui-build-plan.md`, `snowflake/coco-prompts.md`,
  `backend/app/main.py`, `backend/app/models/schemas.py`) and found 4
  direct conflicts, not additions: (1) many identical rice farms vs. one
  farm with 4 heterogeneous asset types, (2) a real Leaflet/OpenStreetMap
  Screen 1 (`feat-007`, verified working) vs. the doc's isometric
  digital-twin map, (3) free-text Cortex narratives vs. the doc's mandatory
  6-field structured recommendation format, (4) whether to keep
  `feat-001`–`feat-007` as the active feature list or rewrite it.
- Asked the user via `AskUserQuestion` rather than guessing, since these are
  high-blast-radius architectural decisions (one touches a live Snowflake
  schema, another discards verified working frontend code). User decisions,
  all confirmed 2026-07-14:
  1. **Full pivot** — rebuild around a single farm with heterogeneous
     `FARM_ASSETS` (not additive, not a hybrid).
  2. **Switch to isometric digital twin** — drop the real OSM map in favor
     of the doc's isometric asset map.
  3. **Restructure recommendations now** — Cortex Agent output must be
     parsed/returned as the 6 required fields (Recommendation/Reason/
     Evidence/Priority/Expected Impact/Confidence), not free text.
  4. **Rewrite `feature_list.json`** around FarmTwin, moving the old
     feature evidence into `progress.md` as preserved history (this
     section) rather than keeping it as the active roadmap.
- Implemented (docs/planning only — no backend or frontend code touched
  this session, per the user's request to "sync docs, create new feature
  list"):
  - Rewrote `docs/architecture.md`: new target Snowflake schema table
    (`FARM_ASSETS`, `ASSET_READINGS`, `ASSET_RISK_ASSESSMENTS`,
    `RECOMMENDATIONS`, `ASSET_HISTORY`, `WEATHER_READINGS` now farm-wide),
    explicit old-table -> new-table mapping, the Observe/Understand/
    Recommend/Predict flow diagram, and a recorded scope decision to derive
    Alerts/Tasks rather than storing them in separate tables.
  - Rewrote `docs/ui-build-plan.md`: 5 target screens (Digital Twin home,
    Farm Dashboard, Asset detail, AI Copilot panel, Daily briefing),
    the new API data contract table, and an explicitly flagged open
    technical decision (isometric rendering approach — CSS/SVG vs. a
    library) left for the implementing session rather than guessed here.
  - Rewrote `feature_list.json`: 12 new features (`feat-008`–`feat-019`),
    ordered Snowflake schema -> agent -> backend models -> simulation ->
    workflow rewrite -> endpoints -> copilot endpoint -> 5 frontend
    screens, each with dependencies and verification steps in the same
    evidence-required style as the superseded feat-001-007. Added a
    top-level `pivot_note` field explaining the rewrite and pointing back
    to this progress.md section.
  - Added "Part 2: FarmTwin asset-model rebuild" to
    `snowflake/coco-prompts.md` — draft CoCo prompts for the new schema,
    seed data, semantic view, and agent, with empty "Result" lines (not run
    yet — that's `feat-008`/`feat-009`). Kept "Part 1" (the original 5
    prompts) intact and labeled superseded, since it's a true record of
    what was actually run against the account.
  - Added a superseded banner to the top of
    `docs/Climate-Adaptive-Agriculture-Copilot-Summary.md` pointing to
    `docs/FarmTwin-AI-Copilot.md` as the new authoritative vision doc
    (kept the file itself — useful history of the pivot, not deleted).
  - Updated `README.md`'s project description and repo framing to FarmTwin
    (setup instructions unchanged — CoCo/Python/Node prerequisites still
    apply identically).
- Verification run: `python -c "import json; json.load(open('feature_list.json'))"`
  confirms the rewritten file is still valid JSON. No backend/frontend code
  changed this session, so `python -m compileall app` / `npm run build`
  were not re-run (nothing to verify at runtime yet — `feat-008` is
  `not_started`).
- Files updated: `docs/architecture.md`, `docs/ui-build-plan.md`,
  `docs/Climate-Adaptive-Agriculture-Copilot-Summary.md`, `README.md`,
  `snowflake/coco-prompts.md`, `feature_list.json`, `progress.md`.
- Known risk: the new Snowflake schema in `feat-008` has not been run
  against the live account yet — everything in `docs/architecture.md`'s
  schema table is a plan, not yet-verified reality, until `feat-008`'s
  CoCo prompts are executed and their "Result" lines filled in.
- Next best step: `feat-008` — run the Part 2 CoCo prompts against the
  live Snowflake account (this drops the old rice-farm tables; confirm
  with the user immediately before executing, since it's destructive on a
  live account) and record results in `snowflake/coco-prompts.md`.

### Session 009

- Date: 2026-07-13
- Goal: Implement `feat-007` — turn Screen 1 into a real interactive farm
  map (Leaflet + OpenStreetMap) per the user's "as real as possible"
  direction, plotting each farm at its actual lat/lon with crop/status
  info in a popup, per the new "Screen 1 v2" section written into
  `docs/ui-build-plan.md` this session before implementation began.
- Design decision (recorded in `docs/ui-build-plan.md` and confirmed with
  the user): Leaflet + OpenStreetMap, not Mapbox (no API key/account
  needed, renders the farms' real seeded coordinates) and not a stylized
  non-geo layout (explicitly rejected — user wants real geography). Map
  supplements, does not replace, the existing card list.
- Implemented:
  - Confirmed exact `FARMS` columns via a live `DESCRIBE TABLE` (not just
    trusting `coco-prompts.md`'s schema doc): `CROP_TYPE VARCHAR`,
    `PLANTING_DATE DATE`, `AREA_HECTARES FLOAT`.
  - `backend/app/models/schemas.py`: added `crop_type`, `area_hectares`,
    `planting_date` to `Plot`.
  - `backend/app/main.py::get_plots`: extended the `SELECT` to pull those
    three columns from `FARMS` and populate the new `Plot` fields.
  - `frontend`: installed `leaflet@1.9.4` + `react-leaflet@5.0.0` (the
    React-19-compatible major version) + `@types/leaflet`.
  - `frontend/components/FarmMap.tsx` (new, `'use client'`):
    `MapContainer` with `bounds`/`boundsOptions` computed via
    `L.latLngBounds` from the fetched plots (not a hardcoded center/zoom —
    stays correct if farms are added), real OSM `TileLayer` with required
    attribution, `L.divIcon` markers colored by risk level (reusing
    `RiskBadge`'s color families at higher saturation for map visibility),
    and `Popup`s showing name/crop_type/area_hectares/`RiskBadge`/a
    `next/link` to `/plots/{id}`.
  - `frontend/app/page.tsx`: wired `FarmMap` in via `next/dynamic` with
    `{ ssr: false }` (Leaflet touches `window` at module-load time, which
    breaks Next's server render pass even inside a `'use client'` page)
    plus a loading fallback matching the map's fixed height. Existing card
    list kept unchanged below the map.
- Verified (runtime, not just build):
  - `curl GET /plots` showed real values (e.g. farm 1: `"Rice - IR
    50404"`, 3.2 ha, `2026-06-01`) and a direct `SELECT` against `FARMS`
    for farms 1-3 matched the API response exactly, field for field.
  - `npm run build` and `npm run lint` both clean on the first try — no
    SSR/`window` error, confirming the dynamic-import isolation worked.
  - Playwright (chromium headless) walkthrough against live `uvicorn` +
    `next dev`: loaded `/`, confirmed 15 `leaflet-marker-icon` elements
    rendered over real OpenStreetMap tiles of the Mekong Delta/Can Tho
    region, colors matching each farm's `risk_level` (4 red/critical,
    others amber/green). Clicked a marker: popup showed "Tran Van Minh
    Farm / Rice - IR 50404 - 3.2 ha / CRITICAL / View risk assessment
    ->", exactly matching that farm's `GET /plots` data and its card-list
    entry below. Clicked the popup link and landed on `/plots/1` with the
    real Cortex risk narrative rendered. Zero console/page errors
    throughout. Screenshots captured (full page + isolated popup element,
    since the popup didn't land inside the first full-viewport crop).
  - Checked `netstat -ano | grep`-style port checks before starting both
    `uvicorn` and `next dev` this session (per session 008's note) — both
    ports were clean, no stray processes this time.
- Result: `feat-007` added to `feature_list.json` (new feature, not in
  the original 6) and moved straight to `passing` with the above evidence.
- Files updated: `docs/ui-build-plan.md` (new "Screen 1 v2" section,
  written and confirmed with the user before implementation),
  `backend/app/models/schemas.py`, `backend/app/main.py`,
  `frontend/package.json` + `package-lock.json`,
  `frontend/components/FarmMap.tsx` (new), `frontend/app/page.tsx`,
  `frontend/lib/api.ts`, `feature_list.json`, `progress.md`.
- Next best step: no unfinished feature remains in `feature_list.json`.

### Session 008

- Date: 2026-07-13
- Goal: Implement `feat-005` — scaffold `frontend/` and build the 3 screens
  from `docs/ui-build-plan.md` against the now fully-real backend.
- Read `frontend/node_modules/next/dist/docs/` first per the
  auto-generated `frontend/AGENTS.md` warning that this Next.js version
  (16.2.10) has breaking API changes vs. training data — confirmed `params`
  is a Promise in server components (not used here) and that
  `useParams()` is the correct client-component hook for the `[id]` dynamic
  segment, avoiding an async-params mistake.
- Implemented:
  - Scaffolded `frontend/` via `create-next-app` (TypeScript, Tailwind,
    App Router, ESLint). Moved the old placeholder `frontend/README.md`
    aside during scaffolding (create-next-app refuses a non-empty
    directory), then rewrote it to describe the actual 3 screens instead
    of the stale single-screen/mapbox-gl plan it previously described.
  - `frontend/lib/api.ts`: typed fetch client (`Plot`, `WorkOrder`,
    `PlotRisk`, `BriefingToday` types mirroring `backend/app/models/
    schemas.py` exactly) for all 5 endpoints, reading
    `NEXT_PUBLIC_API_URL` (`.env.local`/`.env.example` added, `.env.local`
    gitignored by the scaffold's default `.gitignore`).
  - `frontend/components/Card.tsx` + `RiskBadge.tsx`: shared across all 3
    screens per `ui-build-plan.md`'s "reuse one card component" guidance.
  - `frontend/app/plots/[id]/page.tsx` (Screen 2, built first per the
    build order): risk narrative panel + work order panel with
    Approve/Reject, calling the approve/reject endpoints and refetching.
  - `frontend/app/page.tsx` (Screen 1): plot list from `GET /plots`.
  - `frontend/app/briefing/page.tsx` (Screen 3): `GET /briefing/today`
    rendered as summary + approved/rejected lists.
  - `frontend/app/layout.tsx`: added a nav header (Plots / Daily Briefing)
    since 3 screens now need cross-navigation the default layout didn't
    have.
  - Deliberately did not install `mapbox-gl`/`recharts` from the old
    `frontend/README.md` — not needed by the actual 3-screen contract, and
    `ui-build-plan.md` explicitly says skip map tiles for this scope.
- Verified (runtime, not just build):
  - `npm run build` — clean, all 4 routes compile (`/`, `/briefing`,
    `/plots/[id]` dynamic, `/_not-found`).
  - `npm run lint` — one `react-hooks/set-state-in-effect` error from a
    newer eslint-plugin-react-hooks rule on the standard fetch-on-mount
    pattern in `plots/[id]/page.tsx`; fixed with a targeted
    `eslint-disable-next-line` (the pattern itself is intentional and
    correct). Lint clean after.
  - Found a stray `uvicorn` process (PID from an earlier, not-fully-
    stopped session) already bound to port 8000 serving a stale pre-
    feat-004 build (no `/plots` route, 404). Killed it, started a fresh
    `uvicorn` against the real Snowflake account, confirmed `/plots`
    responded correctly.
  - Installed Playwright + Chromium into the session scratchpad (not a
    project dependency) and drove the full user flow headlessly against
    the live `next dev` + `uvicorn` servers: loaded `/` (all 15 plots
    rendered with correct risk badges), opened `/plots/4` (a fresh
    pending work order from a new `POST /workflow/run`), clicked Reject,
    confirmed the panel updated in place to "REJECTED ... by
    coop_manager" with a timestamp, navigated to `/briefing` and
    confirmed Plot 4's rejected order appears in the Rejected(3) list next
    to the real Cortex-generated summary text. Zero console/page errors
    across all three screens. Cross-checked via direct `curl` that
    Snowflake's `WORK_ORDERS` row actually flipped status — matches the
    UI exactly.
  - Screenshots taken at each step (plot list, risk detail before/after
    reject, briefing) confirm correct rendering in both light styling and
    layout terms.
- Result: `feat-005` moved to `passing` in `feature_list.json` with the
  above evidence recorded. All 6 features in `feature_list.json` are now
  `passing`.
- Files updated: `frontend/` (new — scaffold + `lib/`, `components/`,
  `app/page.tsx`, `app/layout.tsx`, `app/plots/[id]/page.tsx`,
  `app/briefing/page.tsx`, `.env.example`, `README.md`), `feature_list.json`,
  `progress.md`.
- Known non-blocking wart (pre-existing, not introduced this session): all
  work orders created in a single `/workflow/run` share one combined agent
  narrative as their `action` text (feat-004's known limitation) — the
  Cortex Agent itself flagged this as corrupted-looking free text when
  asked to summarize the day's work orders for `/briefing/today`. Cosmetic
  only; every field the frontend reads and displays is still real
  Snowflake data.
- Next best step: no unfinished feature remains in `feature_list.json`.

### Session 007

- Date: 2026-07-13
- Goal: Implement `feat-006` — real daily-briefing summary in
  `run_daily_workflow` step 5, plus `GET /briefing/today`.
- Implemented:
  - `backend/app/models/schemas.py`: added `BriefingToday` (date,
    approved_work_orders, rejected_work_orders, summary).
  - `backend/app/main.py`: step 5's `summary` now leads with a factual
    sentence derived from the real `farms_assessed`/`high_risk_farms`/
    `work_orders_created` counts, then the step-3 agent narrative (those
    counts themselves were already real as of feat-002/003/004 — only the
    summary text needed to change). Added `GET /briefing/today`: queries
    `WORK_ORDERS` for today's approved/rejected rows, and — when at least
    one exists — asks `FARM_OPS_AGENT` to summarize them (the semantic
    view already joins `work_orders` to `farms`, so the agent can reason
    over real approval state, not just risk data). Returns a canned
    "no work orders" message when the list is empty.
  - `backend/app/services/cortex_agent_client.py`: bumped the httpx
    timeout 60s->90s after hitting one `ReadTimeout` during verification —
    a narrow reliability fix found while testing this feature.
- Verified (runtime, not just syntax):
  - `python -m compileall app` — clean.
  - Ran uvicorn against the live account. `GET /briefing/today` (before
    any new action) already reflected the prior session's approve/reject
    (work orders 5 approved, 6 rejected — same day) with a real grounded
    narrative naming both farms. Approved work order 7 mid-session and
    re-called the endpoint: approved list correctly became `['7','5']`.
  - `POST /workflow/run`: response was `farms_assessed=15,
    high_risk_farms=['3'], work_orders_created` length 1, summary leading
    with the real counts. Queried `WORK_ORDERS` directly afterward and
    confirmed the new row (id 9, farm 3, `pending_approval`) matched the
    response exactly.
  - Hit one transient `503` from the Open-Meteo API and one `ReadTimeout`
    from the Cortex Agent during testing — both resolved on retry, neither
    is a regression in this session's code.
  - Stopped the background uvicorn process after verification.
- Result: `feat-006` moved to `passing` in `feature_list.json` with the
  above evidence recorded. All backend features (`feat-001` through
  `feat-004`, `feat-006`) are now passing.
- Files updated: `backend/app/main.py`, `backend/app/models/schemas.py`,
  `backend/app/services/cortex_agent_client.py`, `feature_list.json`,
  `progress.md`.
- Next best step: `feat-005` — scaffold `frontend/` and build the 3
  screens against the now fully-real backend.

### Session 006

- Date: 2026-07-13
- Goal: Implement `feat-004` — create `WORK_ORDERS` rows for high-risk
  farms in step 4 of `run_daily_workflow`, and add the `/plots`,
  `/plots/{id}/risk`, `/workorders/{id}/approve`, `/workorders/{id}/reject`
  endpoints per `docs/ui-build-plan.md`'s contract.
- Inspected live Snowflake schema first (`DESCRIBE TABLE`) to confirm
  column types before writing SQL: `WORK_ORDER_ID`/`FARM_ID` are
  `NUMBER(38,0)` with no identity/sequence; `RISK_ASSESSMENTS` risk columns
  use `LOW`/`MEDIUM`/`HIGH`/`CRITICAL` (uppercase, including `CRITICAL`
  which the existing `RiskAssessment` pydantic model's `Literal` doesn't
  cover) — used plain `str` fields on the new `Plot`/`PlotRisk` models
  instead of reusing that Literal.
- Implemented:
  - `backend/app/services/snowflake_client.py`: added `execute()` (single
    statement, returns rowcount) alongside the existing `execute_many()`.
  - `backend/app/models/schemas.py`: added `Plot`, `PlotRisk`,
    `ApprovalRequest` models.
  - `backend/app/main.py`: step 4 of `run_daily_workflow` now bulk-inserts
    a `WORK_ORDERS` row per high-risk farm (ID assigned via
    `MAX(WORK_ORDER_ID)+1` client-side, since there's no sequence). Added
    `GET /plots` (latest `RISK_ASSESSMENTS` row per farm via `QUALIFY`,
    overall risk = max severity of flood/drought/disease), `GET
    /plots/{id}/risk` (latest narrative + latest work order, 404 if no
    assessment exists), `POST /workorders/{id}/approve` and `/reject`
    (404 if the id doesn't exist).
- Verified (runtime, not just syntax):
  - `python -m compileall app` — clean.
  - Ran uvicorn against the live account. `WORK_ORDERS` went 0->4 rows
    (ids 5-8, one per farm 1-4) after `POST /workflow/run`, all
    `pending_approval`.
  - `GET /plots` returned all 15 farms; farms 1-4 correctly showed
    `risk_level: "critical"`, others `low`/`medium`.
  - `GET /plots/1/risk` returned the real `RISK_ASSESSMENTS` narrative +
    work order 5. `GET /plots/999/risk` correctly 404'd.
  - `POST /workorders/5/approve` (custom `approved_by`) and
    `/workorders/6/reject` (default `approved_by`) both updated
    status/approved_by/approved_at; confirmed via a follow-up `GET
    /plots/1/risk` showing the updated status. `POST
    /workorders/9999/approve` correctly 404'd.
  - Stopped the background uvicorn process after verification.
- Result: `feat-004` moved to `passing` in `feature_list.json` with the
  above evidence recorded.
- Files updated: `backend/app/main.py`, `backend/app/models/schemas.py`,
  `backend/app/services/snowflake_client.py`, `feature_list.json`,
  `progress.md`.
- Next best step: `feat-006` (daily briefing + `/briefing/today`), then
  `feat-005` (frontend), per `feat-005`'s stated dependency on `feat-006`.

### Session 005

- Date: 2026-07-13
- Goal: Implement `feat-003` — replace the `cortex_agent_client.py`
  placeholder with a real Cortex Agents REST API call, and wire step 3 of
  `run_daily_workflow` to populate `high_risk_farms` from the agent's
  actual assessment.
- Researched (WebSearch + WebFetch against docs.snowflake.com):
  - Confirmed the real Cortex Agents Run API shape for a named agent
    object: `POST /api/v2/databases/{database}/schemas/{schema}/agents/
    {name}:run`, headers `Authorization: Bearer <PAT>` +
    `Content-Type/Accept: application/json`, request body
    `{"messages":[{"role":"user","content":[{"type":"text","text":...}]}],
    "stream": false}`, non-streaming response
    `{"content":[{"type":"text","text":...}, ...], "status": "completed",
    ...}`.
- Implemented:
  - `backend/app/services/cortex_agent_client.py`: replaced the placeholder
    endpoint/payload with the confirmed real shape; `ask_agent()` now joins
    all `type: "text"` content items from the response.
  - `backend/app/main.py`: step 3 now queries `FARM_ID, NAME` (name needed
    to match against the agent's free-text response), calls
    `ask_agent()` with a risk-assessment prompt, and builds
    `high_risk_farms` by matching each farm's `NAME` as a substring of the
    narrative. `summary` in the returned `DailyBriefing` is now the agent's
    real narrative instead of a hardcoded string.
- Verified (runtime, not just syntax):
  - `python -m compileall app` — clean.
  - Called `ask_agent()` directly against the live `FARM_OPS_AGENT` with
    "Which farms are at high flood risk this week?" — got a real
    1099-character response correctly identifying the same 4 CRITICAL
    flood-risk farms documented in `snowflake/coco-prompts.md` step 5.
  - Ran `uvicorn` against the live account and `curl -X POST
    /workflow/run`: response was `high_risk_farms: ['1','2','3','4']` with
    a real narrative in `summary` — matches the seeded flood-risk farms
    exactly. `WEATHER_READINGS` also grew 465->480 in the same run
    (feat-002 wiring still intact).
  - Stopped the background uvicorn process after verification.
- Result: `feat-003` moved to `passing` in `feature_list.json` with the
  above evidence recorded.
- Files updated: `backend/app/main.py`,
  `backend/app/services/cortex_agent_client.py`, `feature_list.json`,
  `progress.md`.
- Next best step: `feat-004` — add `WORK_ORDERS` creation for high-risk
  farms and the plot/risk/approve/reject endpoints.

### Session 004

- Date: 2026-07-13
- Goal: Implement `feat-002` — wire real weather ingestion + Snowflake
  writes into `run_daily_workflow`.
- Implemented:
  - `backend/app/services/weather_client.py`: added `get_today_reading(lat,
    lon)`, which calls the existing `fetch_forecast` and reduces the
    Open-Meteo response to today's `rainfall_mm`, `temp_c` (avg of daily
    max/min), and `humidity_pct` (avg of today's 24 hourly readings).
  - `backend/app/services/snowflake_client.py`: added `execute_many(sql,
    seq_of_params)`, a thin `cursor.executemany()` + commit wrapper for bulk
    inserts (the existing `run_query` is read-only).
  - `backend/app/main.py`: `run_daily_workflow` steps 1-2 now query `FARMS`
    for `farm_id/lat/lon`, fetch a live forecast per farm, and bulk-insert
    into `WEATHER_READINGS`. `farms_assessed` and `summary` in the returned
    `DailyBriefing` reflect the real farm count; steps 3-5 (risk, work
    orders, real summary) are still explicitly stubbed with a TODO comment.
- Verified (runtime, not just syntax):
  - `python -m compileall app` — clean.
  - Activated `backend/venv`, ran `uvicorn app.main:app --host 127.0.0.1
    --port 8000` against the real Snowflake account.
  - `SELECT COUNT(*) FROM WEATHER_READINGS` was 450 before, 465 after one
    `curl -X POST http://127.0.0.1:8000/workflow/run` (+15, one per seeded
    farm) — response `{"farms_assessed":15,...}`.
  - Queried the 5 newest rows directly: real Open-Meteo values with today's
    timestamp and `source='open-meteo'` (e.g. farm 15: rainfall_mm=16.2,
    temp_c=26.65, humidity_pct=92.08).
  - Stopped the background uvicorn process after verification.
- Result: `feat-002` moved to `passing` in `feature_list.json` with the
  above evidence recorded.
- Files updated: `backend/app/main.py`,
  `backend/app/services/weather_client.py`,
  `backend/app/services/snowflake_client.py`, `feature_list.json`,
  `progress.md`.
- Next best step: `feat-003` — confirm the real Cortex Agents REST API
  shape and wire `ask_agent()`/step 3 of `run_daily_workflow` for real.

### Session 003

- Date: 2026-07-13
- Goal: Verify `feat-001` (Snowflake objects built via CoCo), which the user
  reported as done, and confirm `backend/.env` is populated.
- Verified:
  - All 5 prompts in `snowflake/coco-prompts.md` have "Result" lines filled
    in (db/tables, seed data, semantic view, Cortex Agent, verification
    queries).
  - `backend/.env` has real (non-empty) values for `SNOWFLAKE_ACCOUNT`,
    `SNOWFLAKE_USER`, `SNOWFLAKE_ROLE`, `SNOWFLAKE_WAREHOUSE`,
    `SNOWFLAKE_DATABASE`, `SNOWFLAKE_SCHEMA`, `SNOWFLAKE_PAT` (checked
    presence only, not contents — file is gitignored).
  - Created `backend/venv`, ran `pip install -r requirements.txt`
    (succeeded cleanly), then ran a live query via
    `app.services.snowflake_client.run_query()` against the real Snowflake
    account for each table: `FARMS`=15, `WEATHER_READINGS`=450,
    `SENSOR_READINGS`=450, `RISK_ASSESSMENTS`=72, `CROP_HISTORY`=45 rows —
    all match the counts recorded in `coco-prompts.md`. `WORK_ORDERS`=0,
    which is expected (that table is populated by app logic in feat-004,
    not by CoCo seed data).
- Result: `feat-001` moved to `passing` in `feature_list.json` with the
  above evidence recorded.
- Files updated: `feature_list.json`, `progress.md`.
- Next best step: `feat-002` — wire real weather ingestion + Snowflake
  writes into `run_daily_workflow`.

### Session 002

- Date: 2026-07-13
- Goal: Reconcile inconsistencies across `docs/` (no product code touched).
- Found and resolved, per user decisions:
  - `architecture.md` claimed a single-screen dashboard while
    `ui-build-plan.md` planned 3 screens — confirmed 3 screens is current;
    updated `architecture.md`'s scope table/flow diagram and
    `feature_list.json` feat-004/005/006 to match `ui-build-plan.md`'s
    endpoint contract (`/plots`, `/plots/{id}/risk`,
    `/workorders/{id}/approve`, `/workorders/{id}/reject`,
    `/briefing/today`), which previously existed only in that one doc.
  - `Climate-Adaptive-Agriculture-Copilot-Idea.md` and `...-Summary.md`
    were near-duplicates with drifting details (agent names, crop scope,
    LangGraph). Folded Idea.md's unique "Farm Onboarding" section into
    Summary.md, reconciled crop scope to rice-only MVP (multi-crop is
    future direction), removed LangGraph from the stated stack (no
    LangGraph dependency exists anywhere in the actual build), marked the
    multi-agent pipeline and rich dashboard sections in Summary.md as
    future direction (MVP is one Cortex Agent + 3 screens). Deleted
    Idea.md.
  - Fixed a stale repo-folder name in `README.md`'s layout tree
    (`climate-ag-copilot/` → `climate-agriculture-copilot/`).
- Verification run: `python -c "import json; json.load(open('feature_list.json'))"`
  confirms feature_list.json is still valid JSON after edits. No code
  changed, so `python -m compileall app` was not re-run.
- Files updated: `docs/architecture.md`,
  `docs/Climate-Adaptive-Agriculture-Copilot-Summary.md`,
  `feature_list.json`, `README.md`; deleted
  `docs/Climate-Adaptive-Agriculture-Copilot-Idea.md`.
- Next best step: unchanged — `feat-001` (run the Snowflake CoCo CLI
  prompts) is still the highest-priority unfinished feature.

### Session 001

- Date: 2026-07-08
- Goal: Set up a minimal agent harness (CLAUDE.md, feature_list.json,
  progress.md, session-handoff.md, init.sh) for this hackathon repo.
- Completed: Generated harness files via
  `.claude/skills/harness-creator/scripts/create-harness.mjs`, then
  replaced placeholder content with real features derived from
  `docs/architecture.md`, `README.md`, and the existing TODOs in
  `backend/app/main.py` and `backend/app/services/cortex_agent_client.py`.
- Verification run: `bash init.sh` — `python -m compileall app` succeeded
  (syntax-only, all backend files compile).
- Evidence captured: init.sh output showing all backend/app/**/*.py files
  compiled cleanly.
- Commits: `aef504a` Initial commit: hackathon scaffold + agent harness.
- Files or artifacts updated: `CLAUDE.md`, `feature_list.json`,
  `progress.md`, `session-handoff.md`, `init.sh` (all new).
- Known risk or unresolved issue: verification is syntax-only; no
  dependencies are installed so import errors would not be caught.
- Next best step: Work `feat-001` — run the Snowflake CoCo CLI prompts and
  record results.
