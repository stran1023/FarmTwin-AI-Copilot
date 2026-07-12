# Climate-Adaptive Agriculture Copilot

This is the authoritative pitch/vision doc for the project (supersedes an
earlier draft, `Climate-Adaptive-Agriculture-Copilot-Idea.md`, which has
been retired). For the actual hackathon build scope, see
`docs/architecture.md` (what's real vs. stubbed) and `docs/ui-build-plan.md`
(the 3 screens actually being built).

## Vision

An AI Operations Copilot for Vietnamese agricultural cooperatives that
transforms weather, sensor, and farm data into intelligent operational
decisions through workflow automation.

**Hackathon Track:** Domain-Specific AI Copilot

**Differentiator:** 80% of the engineering demonstrates Intelligent
Workflow Automation.

------------------------------------------------------------------------

## Problem

Vietnamese agriculture is increasingly affected by: - Floods - Drought -
Salinity intrusion - Unpredictable weather

Farm managers need actionable decisions, not dashboards.

------------------------------------------------------------------------

## Initial Scope

**Vietnam first, rice-only for the hackathon MVP.** Every operational doc
(README, architecture.md, ui-build-plan.md, feature_list.json) scopes the
actual build to rice cooperatives only — no multi-crop logic is planned
for this build.

Future expansion (not in MVP scope): - Coffee - Mango - Pepper - Durian -
Other ASEAN countries

## Farm Onboarding

Required: - Farm name - Location - Area - Crop - Planting date

Optional: - Variety - Soil type - Irrigation method - Historical yield

------------------------------------------------------------------------

## Core Value

Instead of answering questions, the AI performs work.

Workflow:

Weather + Farm Data + Crop History + Forecasts → Analyze → Predict risks
→ Recommend actions → Create work orders → Request approval → Generate
daily report

------------------------------------------------------------------------

## Daily Workflow

1.  Ingest latest weather.
2.  Update Snowflake.
3.  Assess flood, drought, and disease risks.
4.  Generate irrigation/fertilizer recommendations.
5.  Create work orders.
6.  Request manager approval.
7.  Notify stakeholders.
8.  Produce a daily briefing.

------------------------------------------------------------------------

## Key Data Sources

-   Weather API
-   Historical weather
-   Farm metadata
-   Crop growth stage
-   Simulated IoT sensor data
-   Historical yields
-   Optional satellite imagery

------------------------------------------------------------------------

## Recommended Tech Stack

### Frontend

-   Next.js
-   React
-   Mapbox or Leaflet
-   Charts

### Backend

-   FastAPI (Python)

### AI

-   Snowflake Cortex Agent (single `FARM_OPS_AGENT`, built interactively via
    the CoCo CLI — see `docs/architecture.md`). No LangGraph or separate
    orchestration layer in the MVP; the backend calls the agent directly
    over REST.

### Database

-   Snowflake

### External APIs

-   Open-Meteo
-   Optional satellite providers

------------------------------------------------------------------------

## AI Agent Architecture (future direction)

The roles below were the original pitch framing. In the actual MVP build
(`docs/architecture.md`), there is **one** Cortex Agent (`FARM_OPS_AGENT`)
that does risk assessment + recommendations; weather ingestion, work order
creation, and briefing assembly are plain FastAPI backend logic, not
separate agents. Splitting these into a multi-agent pipeline is a possible
post-hackathon direction, not current scope:

Planner Agent → Weather Agent → Risk Assessment Agent → Crop Planning
Agent → Task Generator → Report Generator

------------------------------------------------------------------------

## Dashboard (future direction)

The richer dashboard below was the original pitch framing. The actual MVP
build is 3 focused screens (plot list, risk + work order detail, approval
history/briefing) — see `docs/ui-build-plan.md` for the real scope:

-   Farm map
-   Risk heatmap
-   Today's recommendations
-   Approval center
-   Workflow timeline
-   Reports

------------------------------------------------------------------------

## Demo Story

"Every morning before managers arrive, the system automatically:

-   Collects weather forecasts
-   Updates Snowflake
-   Evaluates every field
-   Detects climate risks
-   Plans daily operations
-   Generates work orders
-   Requests approvals
-   Produces an operational briefing"

This demonstrates an AI teammate rather than a chatbot.

------------------------------------------------------------------------

## Why This Fits the Hackathon

-   Domain-specific AI Copilot
-   Intelligent workflow automation
-   Enterprise data with Snowflake
-   Real business value
-   End-to-end autonomous workflow
