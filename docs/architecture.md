# Architecture & scope decisions

> **2026-07-14 pivot:** this project rebuilt around `docs/FarmTwin-AI-Copilot.md`
> — a single mixed farm with heterogeneous **Farm Assets** (Fish Pond, Chicken
> Coop, Rice Field, Fruit Orchard) rendered as an isometric digital twin, with
> an AI Copilot as the primary product surface. This replaces the prior
> rice-cooperative build (15 separate rice farms on a real OpenStreetMap,
> `feat-001` through `feat-007`, all previously `passing`). That build's full
> evidence trail is preserved in `progress.md` under "Legacy: rice-cooperative
> build (superseded 2026-07-14)" — nothing was deleted, the roadmap just moved
> forward. See `feature_list.json` for the current active features.
>
> **Refreshed 2026-07-26:** everything below "What's real vs. planned" and
> the schema table were written at pivot time and describe a target, not
> the shipped system — updated in place to reflect what's actually live
> today (5 asset types, 10 Snowflake tables, 2 Cortex Agent tools, 12
> endpoints). The pivot narrative and the ALERTS/TASKS scope decision
> below are unchanged history and still accurate as written.

## Why the pivot

The original build proved the real, end-to-end loop (weather → Snowflake →
Cortex Agent → work order → approval → briefing) across many identical rice
farms. `docs/FarmTwin-AI-Copilot.md` asks for a different shape: **one** farm
with **heterogeneous** assets, framed explicitly as "decision intelligence,"
not monitoring — every AI output must carry Recommendation / Reason /
Evidence / Priority / Expected Impact / Confidence, not a free-text
narrative. The two data models (many identical rice plots vs. one farm with
four different asset types) don't reconcile without a schema rewrite, so this
is a full pivot rather than an additive layer. Decisions below were confirmed
with the user on 2026-07-14.

## What's real (as of 2026-07-26)

Everything in the original pivot table has shipped, plus substantially
more built across `feat-030`-`feat-055`. Current state, not a plan:

| Piece                              | Status                                       |
|-------------------------------------|-----------------------------------------------|
| Weather ingestion (Open-Meteo)      | Real — farm-wide, written to `WEATHER_READINGS` every `/workflow/run` tick |
| Snowflake tables + writes           | Real — 10 tables, see schema below |
| Cortex Agent, structured output     | Real — `FARM_OPS_AGENT`, 6-field recommendation format, 2 tools (`query_farm_ops`, `search_agronomy`) |
| Simulated per-asset sensor data     | Real — `backend/app/services/asset_simulator.py`, bounded random-walk per metric, evolves across ticks |
| Recommendation approve/reject       | Real — `POST /recommendations/{id}/approve|reject`, writes back to `RECOMMENDATIONS` |
| Isometric digital twin map          | Real — hand-rolled SVG, pan/zoom camera; see `docs/frontend-architecture.md` |
| AI Copilot as centerpiece           | Real — dedicated `/copilot` route + `POST /copilot/ask` |
| Inventory/stock-aware recommendations (`feat-043`) | Real — `INVENTORY` table, `stock_availability` on every recommendation |
| Regulatory withdrawal-period compliance (`feat-044`) | Real — `WITHDRAWAL_RULES`/`TREATMENTS`, agent surfaces real computed earliest-safe-harvest dates |
| Second, distinct Cortex Agent tool (`feat-053`) | Real — `search_agronomy`, Cortex Search over `AGRONOMY_NOTES` (best-practice knowledge, not live data) |
| Harvest Planner (`feat-054`)        | Real — deterministic readiness-trend ETA (`backend/app/services/harvest_planner.py`) for crop assets, agent narrates |
| Scenario Simulator (`feat-055`)     | Real — deterministic what-if intervention projection (`backend/app/services/scenario_engine.py`), agent narrates |

## Farm Assets (replaces the 15-rice-farm model)

One farm, **five** asset instances (Greenhouse added `feat-048`,
2026-07-19 — the "future assets addable without a schema change" claim
below was exercised for real, not just planned):

- Fish Pond
- Chicken Coop
- Rice Field
- Fruit Orchard
- Greenhouse

Future assets should be addable without a schema change to the core tables
(new `asset_type` value + new nullable columns on `ASSET_READINGS` as
needed) — see `docs/FarmTwin-AI-Copilot.md`'s "Roadmap."

## Snowflake schema (live, `CLIMATE_AG_COPILOT.OPS` — see `snowflake/coco-prompts.md` for the CoCo prompts and real run results)

| Table | Columns | Notes |
|---|---|---|
| `FARM_ASSETS` | `asset_id` PK, `asset_type`, `name`, `grid_x`, `grid_y`, `install_date` | `grid_x`/`grid_y` position the asset on the isometric map. 5 asset types live. |
| `WEATHER_READINGS` | `ts`, `rainfall_mm`, `temp_c`, `humidity_pct`, `wind_speed_kmh`, `source` | Farm-wide (one location). |
| `ASSET_READINGS` | `asset_id`, `ts`, + per-type nullable columns: `water_temp_c`/`ph`/`dissolved_oxygen_mg_l`/`feed_level_pct`/`biomass_kg` (fish pond), `air_temp_c`/`humidity_pct`/`water_l`/`egg_count` (chicken coop), `growth_stage`/`soil_moisture_pct`/`nitrogen_ppm`/`irrigation_status` (rice field), `growth_stage`/`soil_moisture_pct`/`disease_risk_pct`/`harvest_readiness_pct` (orchard), `co2_ppm` (greenhouse, `feat-048`) | One wide table so the semantic view can join asset readings uniformly regardless of type. |
| `ASSET_RISK_ASSESSMENTS` | `asset_id`, `ts`, `risk_type`, `risk_level`, `notes` | `risk_type` is free-form per asset (`dissolved_oxygen`, `heat_stress`, `drought`, `flood`, `nutrient_deficiency`, `disease`, `co2_depletion`, ...); a `{risk_type}_forecast_24h` row alongside the real one carries `risk_engine.predict_trend`'s baseline projection. |
| `RECOMMENDATIONS` | `recommendation_id` PK, `asset_id`, `created_at`, `recommendation`, `reason`, `evidence`, `priority`, `expected_impact`, `confidence_pct`, `status`, `approved_by`, `approved_at`, `stock_availability` (`feat-043`) | Structured 6-field format; `status`/`approved_by`/`approved_at` carry the real approve/reject write-back loop. |
| `ASSET_HISTORY` | `asset_id`, `period_label`, `metric_name`, `metric_value`, `notes` | Any asset (rice/orchard yield, chicken egg production, fish harvest biomass). |
| `INVENTORY` (`feat-043`) | `item_name`, `category`, `unit`, `qty_on_hand`, `reorder_threshold`, `last_restocked` | Backs `RECOMMENDATIONS.stock_availability` (`in_stock`/`low_stock`/`out_of_stock`). |
| `WITHDRAWAL_RULES` (`feat-044`) | `treatment_name`, `asset_type`, `withdrawal_days` | Mandatory-wait period per regulated treatment. |
| `TREATMENTS` (`feat-044`) | `asset_id`, `treatment_name`, `administered_at` | Written by the approve flow when an approved recommendation involves a regulated treatment. |
| `AGRONOMY_NOTES` (`feat-053`) | `note_id`, `asset_type`, `title`, `body`, `tags`, `created_at` | General best-practice knowledge base (not this farm's own event log — `ASSET_HISTORY` covers that). Backing table for the `search_agronomy` Cortex Search tool. |
| `HARVEST_RULES` (`feat-054`) | `asset_type`, `ready_growth_stage`, `min_readiness_pct`, `description` | Static readiness threshold per crop asset type; the agent may state this but is explicitly instructed not to project an ETA from it (see `feat-054`'s notes). |

All ten tables are joined into one semantic view, `FARM_OPS_VIEW`, queried
by `FARM_OPS_AGENT`'s `query_farm_ops` (Cortex Analyst text-to-SQL) tool.
`AGRONOMY_NOTES` is additionally indexed by a Cortex Search service behind
the agent's second tool, `search_agronomy`. Intervention effect rates for
the Scenario Simulator (`feat-055`) are deliberately **not** a Snowflake
table — they're Python constants in `backend/app/services/
scenario_engine.py`, mirroring `risk_engine.py`'s own existing
threshold-as-Python-constant precedent (see `feat-055`'s notes for the
full reasoning).

**Scope decision — no separate `ALERTS` or `TASKS` tables.** The vision doc
lists Alerts and Tasks alongside Recommendations as things "Snowflake
stores," but for this build both are derived rather than stored
separately, to avoid duplicating state that already lives in
`ASSET_RISK_ASSESSMENTS` and `RECOMMENDATIONS`:

- **Active Alerts** = latest `ASSET_RISK_ASSESSMENTS` rows at `high`/`critical`.
- **Tasks Due Today** = `RECOMMENDATIONS` rows with `status = 'pending_approval'`.

Revisit this if a future session finds a real need for alert/task state that
doesn't map cleanly to those two tables (e.g. non-AI-generated routine
chores).

## Flow

```
Simulation engine (per-asset realistic time-series) + Open-Meteo (farm weather)
        │
        ▼
FastAPI /workflow/run — Observe → Understand → Recommend → Predict
        │
        ▼
Snowflake OPS schema (10 tables — see schema above)
        │
        ▼
FARM_OPS_AGENT — query_farm_ops (live data) + search_agronomy (best-practice
knowledge), structured recommendation: Recommendation/Reason/Evidence/
Priority/Expected Impact/Confidence, stock-availability- and
withdrawal-period-aware
        │
        ▼
RECOMMENDATIONS (pending_approval)
        │
        ▼
Next.js: isometric digital twin home (5 assets) → asset detail (readings,
recommendations, Harvest Planner, Scenario Simulator) → AI Copilot →
approve/reject
        │
        ▼
GET /briefing/today → daily briefing
```

12 endpoints total (`backend/app/main.py`): `/health`, `/workflow/run`,
`/briefing/today`, `/assets`, `/assets/{id}`, `/assets/{id}/harvest-plan`,
`/assets/{id}/simulate`, `/assets/{id}/recommendations`,
`/recommendations/{id}/approve`, `/recommendations/{id}/reject`,
`/dashboard/summary`, `/copilot/ask`.

Full screen-by-screen breakdown lives in `docs/ui-build-plan.md`;
as-built frontend detail (directory layout, data-mapping conventions) in
`docs/frontend-architecture.md`.

## Why this scope

Per `docs/FarmTwin-AI-Copilot.md`'s "Principles & Success Criteria": the AI is
always the main feature, and every feature should belong to one of Observe /
Understand / Recommend / Predict. The five-asset digital twin gives the demo
visual variety (pond/coop/field/orchard/greenhouse) without the complexity of
a multi-tenant or multi-farm model. One real farm, five real asset types,
fully simulated sensor data, one Cortex Agent (two distinct tool types)
producing structured, explainable recommendations — that beats a wide
dashboard for judging, same reasoning as the original build's scope call.
