# UI build plan — FarmTwin AI Copilot

> **Status: original target design (2026-07-14), corrected in place
> 2026-07-26.** It replaces the prior 3-screen rice-cooperative plan (card
> list → risk/work-order detail → briefing, real Leaflet/OpenStreetMap
> Screen 1). That build shipped and passed (`feat-001`–`feat-007`); its
> evidence lives in `progress.md` under "Legacy: rice-cooperative build
> (superseded 2026-07-14)." The map approach explicitly changes here:
> **isometric digital twin, not real geography** — confirmed with the
> user on 2026-07-14 over the working Leaflet/OSM implementation. Screens
> 1-5 below shipped close to spec; the two corrections inline are a 5th
> asset type (Greenhouse) and the Screen 4 Copilot layout decision, which
> was actually resolved differently than "decide at implementation time"
> implied. For the as-built frontend (directory layout, real component
> list), see `docs/frontend-architecture.md` — that's the more current
> reference; this doc is still accurate for screen intent and the
> underlying data model.

Scope: one real farm, **five** heterogeneous assets (Fish Pond, Chicken
Coop, Rice Field, Fruit Orchard, Greenhouse — added `feat-048`,
2026-07-19), one Cortex Agent (two distinct tool types: live-data lookup
and best-practice search) producing structured recommendations. Per
`docs/FarmTwin-AI-Copilot.md`'s core philosophy: **the AI is the primary
product** — the digital twin and dashboard exist to give the AI context,
not the other way around. Don't build any screen that could ship as "just
a dashboard with a chatbot bolted on."

## Demo narrative (say this out loud during judging)

> "The farm is simulated end to end — weather, pond, coop, field, orchard —
> written to Snowflake every run. The Cortex Agent doesn't just read sensor
> values back to you: it observes the farm's state, understands the risk,
> recommends one prioritized action per asset with its reasoning and
> evidence, and predicts what happens next. This screen is generated from
> that agent output, not scripted."

Keep the demo to one dramatic risk event on one asset (e.g. dissolved oxygen
crashing in the Fish Pond, or a disease-risk spike in the Orchard) — one
clear story beats four simultaneous alerts.

---

## Screen 1 — Digital Twin home (isometric farm map)

**Purpose:** establish "this is a living farm," not a list of database rows.

- Isometric 2D layout, one interactive object per asset (Fish Pond, Chicken
  Coop, Rice Field, Fruit Orchard, Greenhouse), positioned via
  `FARM_ASSETS.grid_x/grid_y`
- Color-coded per asset: green (healthy) / yellow (needs attention) / red
  (critical) — driven by that asset's latest `ASSET_RISK_ASSESSMENTS.risk_level`
- **Hover:** asset name, health score, current status, latest alert (small
  popover, no navigation)
- **Click:** opens Screen 3 (asset detail) for that asset
- The AI may auto-highlight an asset that needs action (e.g. a pulsing
  border) independent of hover/click state
- Data source: `GET /assets` — asset id/type/name/grid position/health
  score/status/latest risk level

**Resolved (was "open technical decision"):** hand-rolled SVG, not a
library — `DigitalTwinMap.tsx` layers a real pan/zoom camera
(`useMapCamera`) and a fixed-size "world stage" (`lib/iso.ts`) over plain
SVG terrain/markers. No isometric-map library, no canvas/game engine. See
`docs/frontend-architecture.md` for the full as-built breakdown.

---

## Screen 2 — Farm Dashboard

**Purpose:** answer "How is my farm doing today?" within a few seconds, per
the vision doc's dashboard requirement.

Display:

- Overall Farm Health Score (aggregate across all 5 assets)
- Active Alerts (derived: latest `ASSET_RISK_ASSESSMENTS` at high/critical)
- Tasks Due Today (derived: `RECOMMENDATIONS` with `status = 'pending_approval'`)
- Farm Statistics (asset count, simple per-type summary)
- Simulated Weather + Weather Forecast (Open-Meteo, farm-wide)
- Daily Recommendations (top N structured recommendations, priority-sorted)
- Asset Status Overview (compact per-asset health/status row, links into
  Screen 3)

Data source: `GET /dashboard/summary` — aggregates across `FARM_ASSETS`,
`ASSET_RISK_ASSESSMENTS`, `RECOMMENDATIONS`, `WEATHER_READINGS`.

---

## Screen 3 — Asset detail

**Purpose:** the per-asset "wow" moment — same role the old Screen 2
(risk + work order) played, generalized to any asset type.

Panels:

1. **Simulated sensor values** — type-specific fields from `ASSET_READINGS`
   (full per-type field list: `docs/FarmTwin-AI-Copilot.md`'s "Farm Assets
   & Digital Twin" table), clearly labeled "simulated" per the existing
   convention for non-real data
2. **AI analysis** — the Cortex Agent's grounded explanation of this
   asset's current condition (not a repeated sensor dump)
3. **Recommendation card(s)** — one card per pending recommendation, full
   6-field structured format (see `docs/FarmTwin-AI-Copilot.md`'s
   "Recommendation Format") plus Approve / Reject buttons
4. **Today's tasks** — this asset's pending recommendations, task-framed
5. **Prediction** — short-horizon forecast for this asset (e.g. "if this
   trend continues, dissolved oxygen drops below safe levels within 18
   hours")
6. **Harvest Planner** (`feat-054`, crop assets only — rice field, orchard,
   greenhouse) — deterministic readiness-trend ETA ("ready now" or a real
   projected days-until-threshold), agent-narrated. Not shown for fish
   pond/chicken coop, which have no harvest-readiness concept.
7. **Scenario Simulator** (`feat-055`) — pick a real candidate
   intervention (or "do nothing") for this asset's current risk, see a
   6h/24h projected-outcome comparison, agent-narrated. Only renders when
   the asset has an active, trackable risk.
8. **Yield Estimate** (`feat-056`, all 5 asset types) — deterministic
   next-cycle yield estimate from this asset's real historical yield
   record, adjusted for current health, agent-narrated.
9. **History** — recent `ASSET_HISTORY` entries (yield, production,
   biomass, as applicable to the asset type)

Data source: `GET /assets/{id}` (readings + risk + history) and
`GET /assets/{id}/recommendations` (structured cards). Approve/reject:
`POST /recommendations/{id}/approve` / `/reject` — real Snowflake
write-back, same non-negotiable proof-of-loop requirement as the prior
build. Harvest Planner: `GET /assets/{id}/harvest-plan`. Scenario
Simulator: `POST /assets/{id}/simulate`. Yield Estimate: `GET
/assets/{id}/yield-estimate`.

---

## Screen 4 — AI Copilot panel

**Purpose:** the literal center of the application, per the vision doc's
core philosophy.

**Resolved (was "decide at implementation time"):** a dedicated `/copilot`
route (`CopilotPanel.tsx`), not a persistent side panel — conversation
state resets on navigation away. This is a known, deliberate deviation
from "not a screen you visit occasionally," documented (not silently
made) in `docs/frontend-architecture.md`, which flags it as open for a
future decision if it matters for the demo. The route:

- Surfaces a prioritized, farm-wide list of structured recommendations
  (same 6-field format as Screen 3, but cross-asset and priority-sorted)
- Answers free-form questions grounded in current farm state — the example
  questions in `docs/FarmTwin-AI-Copilot.md` ("What should I do today?",
  "Should I feed the fish?", "What happens if tomorrow reaches 37°C?") are
  the acceptance bar, not aspirational copy
- Every response ends with actionable next steps, per
  `docs/FarmTwin-AI-Copilot.md`'s decision-intelligence thesis: answer
  *what should I do*, not *what is happening*

Data source: `POST /copilot/ask` (free-form question → grounded Cortex
Agent answer) plus the same `GET /dashboard/summary` recommendation feed
used on Screen 2.

---

## Screen 5 — Daily briefing

**Purpose:** unchanged from the prior build's payoff screen — approved
actions roll up into something a human reads each morning.

- Today's approved/rejected recommendations across all assets
- Generated 3–5 sentence natural-language summary (Cortex Agent output)

Data source: `GET /briefing/today` (rebuilt on `RECOMMENDATIONS` instead of
`WORK_ORDERS`, same shape otherwise).

---

## Component notes (Next.js)

- Screen 1 (digital twin) is the entry point and should read as alive, not
  static — even a subtle idle animation (e.g. a slow pulse on the
  highest-priority asset) reinforces "this is not a dashboard"
- Reuse one recommendation-card component across Screens 2/3/4 (all three
  render the same 6-field structure)
- Poll or refetch on approve/reject rather than building websockets — same
  call as the prior build, still not worth the complexity for a demo
- Keep the "simulated" labeling convention from the prior build for any
  sensor-derived field

## Data contract summary (as-built — `backend/app/main.py`)

| Endpoint | Method | Returns |
|---|---|---|
| `/health` | GET | liveness check |
| `/workflow/run` | POST | the core Observe→Understand→Recommend→Predict tick: simulates + persists readings, assesses risk, calls the agent for at-risk assets, writes recommendations |
| `/assets` | GET | all farm assets with latest health/status/risk |
| `/assets/{id}` | GET | asset detail: readings, risk, prediction, history |
| `/assets/{id}/harvest-plan` | GET | Harvest Planner (`feat-054`) — crop assets only, 400s otherwise |
| `/assets/{id}/simulate` | POST | Scenario Simulator (`feat-055`) — `{action}` body, `is_available: false` (not an error) when the asset has no active trackable risk |
| `/assets/{id}/yield-estimate` | GET | Yield Estimation (`feat-056`) — all 5 asset types, `is_available: false` (not an error) when no historical yield data exists yet |
| `/assets/{id}/recommendations` | GET | structured recommendation cards for that asset |
| `/recommendations/{id}/approve` | POST | updates status in Snowflake, may write a `TREATMENTS` row (`feat-044`) |
| `/recommendations/{id}/reject` | POST | updates status in Snowflake |
| `/dashboard/summary` | GET | farm health score, alerts, tasks, weather, top recommendations, asset overview |
| `/copilot/ask` | POST | free-form question → grounded Cortex Agent answer |
| `/briefing/today` | GET | approved/rejected list + generated summary |

## Build order

1. Confirm the new Snowflake schema is live (`feat-008`/`feat-009` in
   `feature_list.json`) before any frontend work starts — same rule as the
   prior build.
2. Backend: models + read/write layer + `/workflow/run` rewrite +
   endpoints (`feat-010`–`feat-014`).
3. Frontend: digital twin home first (it's the entry point and the
   clearest visual proof of the pivot), then dashboard, then asset detail,
   then the AI Copilot panel, then briefing (`feat-015`–`feat-019`).
4. Wire every approve/reject and copilot-ask call to hit real Snowflake
   before polishing visuals — non-negotiable, matches the prior build's
   verification bar.
