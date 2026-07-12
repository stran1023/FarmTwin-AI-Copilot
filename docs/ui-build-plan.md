# UI build plan — Climate-adaptive rice cooperative copilot

Scope: one real end-to-end loop, three screens, built only after the FastAPI
endpoint returns real Snowflake/Cortex Agent data. Do not start frontend work
before the backend route exists — see `/coco-prompts.md` and backend stubs
first.

## Demo narrative (say this out loud during judging)

> "Open-Meteo feeds weather data every hour → Snowflake stores it → Cortex
> Agent reasons over it and writes a risk assessment + work order → this
> screen is generated from that row, not scripted."

Keep the demo to **one plot, one risk event** (e.g. a salinity intrusion
scenario). One dramatic, real scenario beats a busy multi-plot dashboard.

---

## Screen 1 — Cooperative dashboard

**Purpose:** establish the problem. A coop manager opens the app and sees
which plots are at risk today.

- List or simple map of plots, each as a card
- Each card: plot name/location, risk level badge (low / medium / high),
  one-line risk summary
- Clicking a card opens Screen 2 for that plot
- Data source: `GET /plots` — returns plot id, name, location, latest risk
  level from Snowflake

Keep this screen simple: a vertical list of cards is enough. Don't build
map tiles or GPS overlays unless there's spare time after Screens 2 and 3
work end-to-end.

## Screen 2 — Risk alert + AI-generated work order

**Purpose:** the core "wow" moment — show the agent's reasoning next to the
action it recommends.

Two stacked panels inside one card:

1. **Risk assessment panel**
   - Icon + label: "Cortex Agent risk assessment"
   - 2–4 sentence natural-language explanation of *why* this plot is at risk
     (pulled verbatim from the Cortex Agent's response, not hand-written)
2. **Work order panel**
   - Icon + label: "Recommended work order"
   - One-sentence recommended action
   - Assigned worker name + due date/time

Below both panels: **Approve** / **Reject** / **More detail** buttons.

- Data source: `GET /plots/{id}/risk` — returns risk narrative + generated
  work order (both written by Cortex Agent, read from Snowflake)
- Approve action: `POST /workorders/{id}/approve` — writes an approval
  status + timestamp back to Snowflake. This write-back is what proves the
  loop is real, so don't skip it even if it's just one status column.

## Screen 3 — Approval history + daily briefing

**Purpose:** the payoff — show that approved actions roll up into something
a human actually reads each morning.

- A short list of today's approved/rejected work orders (plot, action,
  status, who approved it)
- A generated "daily briefing" block: 3–5 sentence natural-language summary
  of the day's risks and actions across all plots (Cortex Agent output)
- Data source: `GET /briefing/today` — aggregates approved work orders +
  generates the summary

---

## Component notes (Next.js)

- Build Screen 2 first — it's the one screen judges will spend the most
  time on and it proves the whole architecture in one view
- Reuse one card component across all three screens (risk badge, panel
  layout, button row) rather than building three separate designs
- Poll or refetch on approve/reject rather than building websockets —
  not worth the complexity for a demo
- Label simulated data clearly if any screen falls back to it (e.g. a
  small "simulated" tag on IoT-derived fields), per the scope-trim decision
  to keep simulated vs. real data visually distinct

## Data contract summary (confirm with backend before building)

| Endpoint | Method | Returns |
|---|---|---|
| `/plots` | GET | list of plots with latest risk level |
| `/plots/{id}/risk` | GET | risk narrative + generated work order |
| `/workorders/{id}/approve` | POST | updates status in Snowflake |
| `/workorders/{id}/reject` | POST | updates status in Snowflake |
| `/briefing/today` | GET | approved/rejected list + generated summary |

## Build order

1. Confirm `/plots/{id}/risk` returns real data end-to-end (backend + Snowflake + Cortex Agent)
2. Build Screen 2 against that real endpoint
3. Build Screen 1 (simpler, depends on `/plots`)
4. Build Screen 3 last — it depends on approvals existing, so there must be
   at least one approved work order to demo it meaningfully
5. Wire approve/reject buttons to actually write back before polishing visuals
