# Architecture & scope decisions

## What's real vs. stubbed for the hackathon build

| Piece                          | Status for demo                          |
|---------------------------------|-------------------------------------------|
| Weather ingestion (Open-Meteo)  | Real                                       |
| Snowflake tables + writes       | Real                                       |
| Cortex Agent risk assessment    | Real (built via CoCo)                      |
| Work order creation + approval  | Real (approve/reject UI)                   |
| Sensor data (IoT)               | Simulated — generated via CoCo prompt      |
| Satellite imagery               | Cut for hackathon scope                    |
| Frontend dashboard              | Real — 3 focused screens, not a multi-tab dashboard. See `docs/ui-build-plan.md`. |

## Flow

```
Open-Meteo (weather)
        │
        ▼
FastAPI /workflow/run
        │
        ▼
Snowflake OPS schema (WEATHER_READINGS, SENSOR_READINGS)
        │
        ▼
Cortex Agent: FARM_OPS_AGENT (risk assessment + recommendations)
        │
        ▼
WORK_ORDERS (pending_approval)
        │
        ▼
Next.js dashboard (3 screens): plot list → risk + work order → approve/reject
        │
        ▼
GET /briefing/today → daily briefing
```

Full screen-by-screen breakdown and the API contract (`/plots`,
`/plots/{id}/risk`, `/workorders/{id}/approve`, `/workorders/{id}/reject`,
`/briefing/today`) live in `docs/ui-build-plan.md`.

## Why this scope

Judging emphasizes end-to-end execution over breadth. One real, complete
loop (weather → risk → work order → approval → briefing) demos better than
a sprawling dashboard. The frontend is scoped to three focused screens
(plot list, risk + work order detail, approval history/briefing) rather
than a multi-tab dashboard with a farm map, heatmap, and workflow timeline —
those richer dashboard ideas from the original pitch (see
`docs/Climate-Adaptive-Agriculture-Copilot-Summary.md`) are future
direction, not MVP scope.
