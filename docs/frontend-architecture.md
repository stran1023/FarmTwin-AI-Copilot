# Frontend architecture & UI/UX flow — FarmTwin AI Copilot

> **Status: as-built, v0 redesign (2026-07-16).** `frontend/` was fully
> replaced in Session 022 (`feat-039`) by a separately-built,
> v0.app-generated Next.js frontend (originally `farmtwin-ai-copilot-frontend/`),
> wired to the real backend. It supersedes the shadcn-free build described
> in earlier revisions of this doc (Sessions 011-021, `feat-015`-`feat-038`)
> — that evidence trail still lives in `progress.md` but no longer
> describes what's on disk. For original design intent (screens, data
> contract), see `docs/ui-build-plan.md` — still broadly accurate; this
> doc covers what changed in the redesign.

## Stack

- **Next.js 16 (App Router, Turbopack)**, React 19, TypeScript, Tailwind
  CSS v4, **shadcn/ui** (`components.json`, style `base-nova`), lucide-react
  icons, `@vercel/analytics`.
- Still no state-management library, no animation library, no isometric-map
  library, no websockets — animation is plain CSS/SVG, the digital twin map
  is hand-rolled SVG with a pan/zoom camera layered on top (new in this
  redesign), not a canvas/game engine.
- npm (the v0 export shipped with pnpm; switched to npm in Session 022 to
  match the rest of the repo — see `progress.md` Session 022).

## Directory layout

```
frontend/
  app/
    layout.tsx           root layout: TopNav + page content (no persistent copilot panel)
    page.tsx              "/" — <SplitFarmView/>
    assets/[id]/page.tsx   "/assets/{id}" — <SplitFarmView initialAssetId={id}/>
    copilot/page.tsx       "/copilot" — dedicated route, full-height <CopilotPanel/>
    briefing/page.tsx      "/briefing" — <BriefingView/>
  components/
    TopNav.tsx             top nav bar: Farm / Copilot / Briefing links
    SplitFarmView.tsx       shell: map left, dashboard-or-asset-detail right
    DigitalTwinMap.tsx       map composition + pan/zoom camera + zoom controls
    FarmTerrain.tsx          ground layer: grass grid, dirt paths, farmhouse, well, scenery
    MarkerFrame.tsx          shared marker container (size/shape/ring/selection)
    FishPondMarker.tsx, ChickenCoopMarker.tsx,
    RiceFieldMarker.tsx, FruitOrchardMarker.tsx   one SVG illustration per asset type
    StatusIndicators.tsx    topPriorityAssetId(), color-blind-safe StatusBadge
    WeatherAmbience.tsx      pointer-events-none sun/cloud/rain overlay
    DashboardPanel.tsx       right-panel default content (Screen 2)
    AssetDetailPanel.tsx     right-panel content when an asset is selected (Screen 3)
    CopilotPanel.tsx         chat UI — used standalone at /copilot, not a persistent overlay
    BriefingView.tsx         Daily Briefing screen (Screen 5)
    RecommendationCard.tsx   shared collapsed-by-default recommendation card
    HealthGauge.tsx, RiskBadge.tsx, Card.tsx   presentational primitives
    ui/button.tsx            shadcn/ui primitive
  lib/
    api.ts                 real backend calls + mapping onto this frontend's own types
    types.ts                this frontend's own data contract (Asset, Recommendation, ...)
    dataCache.ts             module-level fetch cache: dedup, TTL, cross-component invalidate()
    useApiData.ts            React hook over dataCache.ts via useSyncExternalStore
    iso.ts                   shared 2:1 isometric projection math (terrain + markers)
    utils.ts                 cn() class-merge helper (shadcn convention)
```

## Data flow: `lib/api.ts` is a mapping layer, not a passthrough

Unlike the prior build (whose `lib/api.ts` types mirrored
`backend/app/models/schemas.py` field-for-field), **this frontend has its
own internal data contract** (`lib/types.ts`: `Asset`, `AssetDetail`,
`Recommendation`, `DashboardSummary`, `Briefing`, `CopilotAnswer`, ...),
designed independently (originally against `lib/mockData.ts`, an in-memory
mock — now deleted). `lib/api.ts` fetches the real backend and maps every
response onto that internal contract:

```
backend (FastAPI, localhost:8000, schemas in backend/app/models/schemas.py)
        │  fetch, cache: "no-store"
        ▼
lib/api.ts's private Backend* interfaces (mirror schemas.py exactly)
        │  mapping functions (mapAsset, mapRecommendation, mapAlert, ...)
        ▼
lib/types.ts's Asset / AssetDetail / Recommendation / DashboardSummary / Briefing
        ▼
lib/dataCache.ts (TTL + dedup + invalidate) → lib/useApiData.ts → components
```

Notable mapping decisions (see `lib/api.ts` for the full implementation):

- **`growth_stage`**: backend gives a string enum (`asset_simulator.py`'s
  `GROWTH_STAGES = ["seedling", "vegetative", "reproductive", "ripening",
  "harvest_ready"]`); the frontend's `Asset.visual.growth_stage` wants a
  0-4 index for blade-height interpolation — mapped via array index
  lookup, not re-derived.
- **`confidence`**: backend's `confidence_pct` (0-100) → frontend's
  `confidence` (0-1), divided by 100.
- **Recommendation status**: backend's `pending_approval` → frontend's
  `pending`; `approved`/`rejected` pass through unchanged.
- **Asset names on recommendations/alerts**: several backend endpoints
  (`active_alerts`, `top_recommendations`, `tasks_due_today`) return rows
  keyed only by `asset_id`, with no name attached. A module-level
  `assetNameCache` in `lib/api.ts` gets primed whenever an asset list or
  detail response is mapped, so later lookups in the same
  `getDashboardSummary()` call are cache hits; a cold lookup (e.g. a
  direct `/assets/{id}` deep link before the asset list has ever loaded)
  falls back to one extra `GET /assets/{id}` call.
- **Reading `tone` (good/warn/bad) coloring**: mirrors
  `backend/app/services/risk_engine.py`'s own real thresholds (DO < 3.5
  critical / < 6.0 stress, feed < 15%, soil moisture < 30% or > 90%,
  disease > 20%/40%, water/air temp > 32°C) — grounded in the backend's
  own rule engine, not an invented per-field judgment call.
- **"Today's tasks" on the asset detail panel**: `/assets/{id}/
  recommendations` already filters to `pending_approval` server-side
  (`backend/app/main.py`), so every row returned is genuinely still due —
  mapped directly into `Task`s, matching `docs/ui-build-plan.md` Screen 3's
  "this asset's pending recommendations, task-framed" spec exactly.
- **Water clarity** (fish pond marker tint): no direct backend field;
  derived from the asset's own `status` (critical → murky, healthy →
  clear), same logic the prior build's `FishPondMarker` used.

## Screen-by-screen (as built)

Screens 1-3 remain merged into one split-screen shell exactly as in the
prior build (`SplitFarmView.tsx`: map docked left, right panel swaps
in-place between dashboard and asset detail via local state + `history.
replaceState`, not `router.push`, so the map never remounts/flickers).
What's different in this redesign:

- **Digital twin map**: adds a real pan/zoom camera (`useMapCamera` in
  `DigitalTwinMap.tsx` — wheel-zoom around the cursor, drag-to-pan, +/-/
  reset controls) and a fixed-size "world stage" (`lib/iso.ts`'s
  `WORLD_W`/`WORLD_H`) that scales to fit its container, so terrain and
  markers stay proportional at any viewport size instead of being laid
  out directly in DOM percentage coordinates.
- **Markers**: same one-SVG-illustration-per-asset-type approach
  (fish pond water/dock, coop/chickens, rice blades, orchard trees), now
  behind a shared `MarkerFrame` from the start (no separate
  standardization pass needed, unlike the prior build's `feat-033`).
- **AI Copilot**: **not a persistent floating panel** — a dedicated
  `/copilot` route rendering `CopilotPanel` full-height. This is a real
  deviation from `docs/ui-build-plan.md`'s "persistent surface... not a
  screen you visit occasionally" requirement and from the prior build's
  explicit design choice (Session 013, `feat-018`) to mount the panel in
  the root layout specifically so conversation state survives
  navigation. In this redesign, navigating away from `/copilot` resets
  the chat. This was not changed during the Session 022 backend
  integration (out of scope — data wiring only); flagged here for a
  future decision, not fixed silently.
- **Recommendation cards**: ship collapsed-by-default (`feat-036`'s
  progressive-disclosure behavior from the prior build) from the start,
  via `RecommendationCard.tsx`'s own local `expanded` state.
- **Daily briefing**: `BriefingView.tsx` renders the summary plus a
  timeline-styled "Decision Log" (visually new; same underlying data —
  approved + rejected recommendations, real Cortex-generated summary).

## Known, pre-existing issues found during the Session 022 integration

Fixed as part of getting real data flowing (see `progress.md` Session 022
and `feature_list.json` `feat-039` for full evidence) — not introduced by
the backend rewrite, but only surfaced once real (non-mock) async timing
and multiple recommendation cards were exercised live:

- **Nested `<button>` HTML** (`DashboardPanel.tsx` wrapped each shared
  `RecommendationCard` in an outer `<button>`, but the card renders its
  own internal buttons) — fixed: outer wrapper is now a `role="button"`
  `<div>` with keyboard support, inner buttons call `stopPropagation()`.
- **SSR/hydration mismatch** (`lib/useApiData.ts` passed the same
  snapshot function as both the client and server argument to
  `useSyncExternalStore`, letting `dataCache.ts`'s module-level singleton
  leak a stale value from a *previous* request into SSR output during
  Next dev's long-running process) — fixed: the server snapshot always
  returns `undefined`, matching the client's genuinely-empty first render.
- **React 19 hook-purity/set-state-in-effect lint errors**
  (`CopilotPanel.tsx`'s `Date.now()`-based ids, `HealthGauge.tsx`/
  `WeatherAmbience.tsx`'s synchronous `setState` in an effect body) —
  same class of stricter-than-expected rule this repo's `lib/
  useApiData.ts` already had to work around; fixed with a ref-based id
  counter and the established microtask-deferred-setState pattern.
- **No ESLint at all in the v0 export** — `npm run lint` failed outright
  (`eslint` not installed, no config). Recovered the prior frontend's
  `eslint.config.mjs`, installed `eslint`/`eslint-config-next`, so lint
  actually runs now (previously a silent no-op).
- **`next.config.mjs` has `typescript: { ignoreBuildErrors: true }`** —
  `npm run build` alone will not catch type errors; run `npx tsc
  --noEmit` for real type-checking (this is what caught a real
  `BriefingView.tsx` type error during Session 022).

## Resolved since the swap (backend-side)

The live `/briefing/today` summary was observed to leak an agent-planning
sentence ahead of the real answer ("Let me broaden to recent days to
ensure I capture..."). Flagged as backend-side/out-of-scope when this doc
was first written; the user hit it live and it was fixed in Session 023
(`feat-040`) — `backend/app/main.py`'s narration-stripping now cuts at the
last "glued" punctuation-to-capital seam (no space after `.`/`!`/`?`, the
consistent signature of every narration-leak shape seen across this
project's history) instead of matching a fixed list of lead-in phrases.

## Where to look for more detail

- `docs/ui-build-plan.md` — original screen-by-screen intent and data
  contract table (endpoint list still accurate).
- `progress.md` Session 022 — full integration history and real
  verification evidence (Playwright + live Snowflake + live Cortex Agent
  calls) for this redesign.
- `feature_list.json` `feat-039` — exact acceptance criteria and evidence.
