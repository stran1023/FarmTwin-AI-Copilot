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

**Status: superseded.** Screens 1–3 (card-list version) shipped in
`feat-005` and are `passing`. The plan below (Screen 1 v2) replaces this
section's "keep it simple, skip map tiles" call — there's spare time now,
and the plots' `lat`/`lon` are real Mekong Delta coordinates already sitting
in Snowflake, not placeholders, so a real map is a legitimate scope increase
rather than a gold-plating detour.

---

## Screen 1 v2 — Interactive farm map (real geography)

**Decision (2026-07-13): real map, not a stylized layout.** Use
**Leaflet + OpenStreetMap** (`react-leaflet`), not Mapbox — it renders the
farms' actual lat/lon on a genuine OSM basemap of the real Mekong Delta
region, needs no API key/account signup, and is the most "real" option for
the least setup friction. The map becomes the primary Screen 1 view; the
existing card list is kept underneath as a scrollable panel (not dropped) —
both read from the same `GET /plots` call and both link to `/plots/{id}`.

### Why this needs a small backend change first

`GET /plots` (`backend/app/main.py:get_plots`) currently returns only
`plot_id, name, lat, lon, risk_level` — enough for a pin, not enough for
"farm crops with status and information on it." The `FARMS` table already
has the missing columns (seeded in `feat-001`, see
`snowflake/coco-prompts.md`'s schema table): `crop_type`, `planting_date`,
`area_hectares`. This is a Snowflake read of columns that already exist —
no new table, no new CoCo prompt.

- `backend/app/models/schemas.py`: add `crop_type: str`, `area_hectares:
  float`, `planting_date: datetime` (or `date`) to `Plot`.
- `backend/app/main.py::get_plots`: extend the existing `SELECT` to also
  pull `f.CROP_TYPE, f.PLANTING_DATE, f.AREA_HECTARES` from `FARMS`, and
  populate the three new `Plot` fields from those columns.
- No change to `/plots/{id}/risk` — the risk detail screen doesn't need
  these fields, the map/list does.

### Frontend architecture

- New packages: `leaflet`, `react-leaflet`, `@types/leaflet` (dev). No
  Mapbox token, no `.env` changes.
- **SSR gotcha:** Leaflet touches `window` at module-load time, which
  breaks Next.js's server render pass even inside a `'use client'` page.
  Isolate the map in its own component and load it via `next/dynamic` with
  `{ ssr: false }`:
  - `frontend/components/FarmMap.tsx` (`'use client'`) — owns the
    `MapContainer`/`TileLayer`/`Marker`/`Popup` tree.
  - `frontend/app/page.tsx` imports it as
    `dynamic(() => import('@/components/FarmMap'), { ssr: false })`.
- **Tile layer:** standard OSM tile URL
  `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png` with the required
  OSM attribution string in `TileLayer`'s `attribution` prop (OSM's usage
  policy requires visible attribution — don't drop it).
- **Map extent:** center on the Mekong Delta farm cluster (~lat 9.6–10.3,
  lon 105.4–106.2 per `coco-prompts.md`'s seed data) — either hardcode a
  center/zoom that fits all 15 seeded farms, or compute bounds from the
  fetched `Plot[]` via `L.latLngBounds(...)` + `map.fitBounds(...)` so it
  stays correct if farms are added later. Prefer `fitBounds` — it's not
  meaningfully more code and avoids a hardcoded assumption about farm count.
- **Markers:** skip Leaflet's default marker image assets (known
  Next.js/webpack bundling pain — the default icon PNG paths resolve
  wrong under bundlers). Use `L.divIcon` with a small colored circle
  instead, reusing the exact risk-level color mapping already defined in
  `components/RiskBadge.tsx` (`low`/`medium`/`high`/`critical` →
  emerald/amber/orange/red) so map pins and card badges agree visually.
- **Popup content** (on marker click): plot name, crop type + area
  (e.g. "IR 50404 · 3.2 ha"), the same `RiskBadge`, and a "View risk
  assessment →" link to `/plots/{id}` (reuse `next/link`, popups render
  React via `react-leaflet`'s `Popup` children).
- **Layout:** map on top (fixed height, e.g. `h-[420px]`, `w-full`,
  rounded corners to match the existing `Card` styling), existing card
  list rendered below it unchanged — no redesign of the list itself, just
  relocated under the map on the same page.

### Verification

- `npm run build` + `npm run lint` clean (watch for the SSR/`window`
  error specifically — it's the most likely first failure mode).
- Manual/Playwright walkthrough: load `/`, confirm the map renders real
  OSM tiles centered on the Mekong Delta with 15 pins, click a
  CRITICAL-risk pin, confirm the popup shows the real crop type/area from
  Snowflake and the risk badge matches the card list below, click through
  to `/plots/{id}` and confirm it's the same plot.
- Confirm `GET /plots`'s new fields via `curl` match `FARMS` table values
  directly (same cross-check pattern used for `feat-004`/`feat-005`).

### Build order (this increment)

1. Extend `Plot` schema + `GET /plots` query (backend) — small, no
   frontend dependency, verify via `curl` first.
2. Add `leaflet`/`react-leaflet`, build `FarmMap.tsx` against the now
   richer `/plots` response, dynamic-import it into `app/page.tsx` above
   the existing list.
3. Style markers/popups to match `RiskBadge`'s existing color system.
4. Full runtime verification (build/lint + browser walkthrough), same bar
   as `feat-005`.

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
| `/plots` | GET | list of plots with latest risk level (+ `crop_type`, `area_hectares`, `planting_date` once Screen 1 v2 lands, see below) |
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
