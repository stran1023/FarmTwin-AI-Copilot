# Progress Log

## Current Verified State

- Last Updated: 2026-08-05
- **Session 038, yet another continuation (2026-08-05): implemented and
  live-verified feat-063 -- real conversational memory + a Clear
  conversation button for the Copilot chat.** User wanted Copilot to feel
  more like ChatGPT (an ongoing conversation, not one-shot Q&A), then
  raised a real concern themselves: carrying memory forward would drag
  stale context into an unrelated new question. Offered "plain discard" vs.
  "archive" (server-side, browsable past threads); user chose plain
  discard, keeping this a contained frontend+prompt change, no new
  Snowflake table.
  - Backend: schemas.py gained CopilotTurn + CopilotQuestion.history (backward
    compatible, defaults to []). cortex_agent_client.ask_agent() now accepts
    real prior turns and sends them as genuine alternating user/assistant
    messages in the Cortex Agents Run API's own multi-turn array -- verified
    the real documented schema via WebFetch first rather than assuming.
    main.py caps history server-side at the last 6 turns.
  - Frontend: CopilotPanel.tsx persists messages to sessionStorage (survives
    navigating away and back; fresh tab starts clean) using the same
    "render the fresh seed first, restore client-side in an effect" pattern
    this codebase already established to avoid SSR hydration mismatches. A
    new Clear conversation button (trash icon) discards everything back to
    the seed greeting.
  - **Real bug found and fixed during live verification, not assumed:** the
    very first live test's follow-up turn (carrying 1 real prior exchange)
    hit a genuine httpx.ReadTimeout at the existing 150s client timeout --
    confirmed via the backend's actual traceback that this was a real
    latency issue (conversation history genuinely makes the agent's own
    reasoning take longer), not a payload-shape bug, and well within
    Snowflake's own documented 15-minute allowance for this endpoint. Fixed
    by raising the httpx client timeout from 150s to 240s.
  - Live Playwright re-run after the fix (real backend + live Snowflake
    account): turn 1's real request carried history: []; turn 2's carried
    exactly 1 real prior turn with real content matching what the agent had
    actually said. Conversation survived navigating away to / and back.
    Clear conversation button confirmed to wipe all trace of the real prior
    answer, leaving just the seed + suggestion chips (the one test
    assertion that "failed" was a false alarm in the test itself -- it
    didn't account for one of the always-shown suggestion chips sharing
    exact wording with the test's chosen question).
  - Confirmed via GET /dashboard/summary that none of this touched real
    farm data (Copilot is read-only) -- still the clean healthy baseline
    from feat-062. tsc/lint/build clean; backend pytest suite (161/161)
    unaffected beyond the intended schema addition. Killed local uvicorn +
    next dev cleanly; both ports confirmed clear.
    feature_list.json's feat-063 status: passing.
- **Session 038 continued once more (2026-08-05): implemented and
  live-verified feat-062 -- a real percentage progress bar, expanded
  intro/outro status lines, and a renamed CTA.** User asked for more
  visible loading animation (a percent bar, more status words) and a more
  meaningful button name than "Run Farm Tick." Offered 3 button-name
  options via AskUserQuestion; user picked "Run AI Farm Analysis."
  - Progress bar is real, not a fake timer: each phase (intro/live/outro/
    refreshing/done) owns a fixed slice of 0-100, and within "live" the
    fill also reflects the real average completion fraction across every
    real asset's actual step (queued/observing/assessing/consulting_agent/
    done), not just "we're in this phase." The unavoidably-unknown-duration
    "refreshing" step (two real cache refetches) creeps toward its ceiling
    via a 250ms interval instead of sitting frozen.
  - Intro grew from 3 to 4 lines; outro grew from 1 line to 2 -- extracted
    a shared SequentialLines component instead of duplicating the
    checkmark/spinner/pending rendering.
  - Renamed the button and panel header text throughout.
  - Live Playwright (real backend + live Snowflake account), from the
    clean healthy baseline: confirmed the new button text and the old
    text gone; captured a real ~1.7-minute tick with progress values
    4% -> 11% -> 75% (exactly the live-phase ceiling, right as the real
    job stopped running) -> 88% (during the real refresh step) -- all
    strictly increasing, bar confirmed absent once the success banner
    appeared. That tick's real outcome (Tilapia Pond drifting into
    needs_attention) was a different real escalation path than feat-060/
    061's Chicken Coop runs -- further confirmation the simulation isn't
    scripted. Re-ran the reset script afterward to leave the clean
    healthy baseline in place. tsc/lint/build clean; backend pytest suite
    (161/161) unaffected (frontend-only). Killed local uvicorn + next dev
    cleanly; both ports confirmed clear.
    feature_list.json's feat-062 status: passing. Charts remains the one
    fully open item from the original demo-flow review, not started.
- **Session 038 continued again (2026-08-05): implemented and live-verified
  feat-061 -- critical-outcome variant of the Run Farm Tick success
  banner.** Two open follow-ups were left after feat-060 (charts, and a
  bad-news banner variant); asked the user via AskUserQuestion which to
  build next, since they're very different scope (charts needs a new
  backend endpoint + a chart component from scratch, nothing like either
  exists yet). User picked the banner variant.
  - WorkflowProgressPanel.tsx's SuccessSummary now branches on
    result.highRiskCount > 0 (the backend's own real count of
    currently-at-risk assets after the tick, from main.py's
    _run_workflow) -- shows a red 'Critical Farm Changes Detected'
    banner with a real 'Needs attention: <names>' line when true,
    otherwise the existing positive banner from feat-059, unchanged.
  - Live Playwright (real backend + live Snowflake account), starting
    from feat-060's clean healthy baseline: a real tick escalated the
    Chicken Coop into critical risk again (same real mechanism as
    feat-060's verification), and the panel correctly showed 'Critical
    Farm Changes Detected' / 'Needs attention: Layer House North' --
    cross-checked in the same test against a direct GET /assets call,
    which independently confirmed only CC-001 was at risk. Assertion
    (banner variant) === (real at-risk count > 0) passed.
  - Re-ran reset_demo_state.py afterward to restore the clean healthy
    baseline as the state left behind; re-verified via GET
    /dashboard/summary. Killed local uvicorn + next dev cleanly; both
    ports confirmed clear. tsc/lint/build clean; backend pytest suite
    (161/161) unaffected (frontend-only change).
    feature_list.json's feat-061 status: passing. Charts remain the one
    open item, not started.
- **Session 038 continued (2026-08-05): implemented and live-verified
  feat-060 -- replaced the default demo reset state with a genuinely
  healthy baseline, tuned for a real single-tick escalation, per the
  user's explicit "replace the default" decision.** Before writing any
  code, checked the real math in asset_simulator.py/risk_engine.py rather
  than assuming a dramatic healthy->critical flip was achievable in one
  tick: given the simulator's real bounded per-tick step sizes vs. each
  threshold's real distance from a healthy value, NO metric can cross
  from genuinely healthy to critical severity in a single tick without
  fabricating data. The one exception found: chicken_coop's
  feed_level_pct carries a constant -2.0/tick drift (feed genuinely
  depletes, not a random walk) against a 15.0 threshold that maps to a
  real UI-critical (red) status -- seeded at 17.0 (still real "low" risk
  at rest) gives a real ~50% chance of a genuine critical flip on the
  first live click.
  - Added asset_simulator.default_seed() (public accessor, same pattern
    as risk_engine.py's existing trend_metric()) and rewrote
    scripts/reset_demo_state.py (previously fish-pond-crisis-only) to
    seed a healthy reading for all 5 real assets, with the one deliberate
    near-threshold override, and to compute each seeded risk row via the
    real risk_engine.assess_risk() rather than a hand-typed guess.
  - Found and fixed a real, pre-existing bug during live verification:
    GET /dashboard/summary's active_alerts query picked the latest row
    PER ASSET AMONG ONLY high/critical rows, so a resolved issue kept
    surfacing as "active" forever even after a newer low-risk reading
    superseded it. Fixed to resolve each asset's true current row first,
    then filter to high/critical -- necessary for the new healthy
    baseline's "zero active alerts" requirement to actually hold.
  - Live verification against the real Snowflake account: dry-run
    confirmed risk=low for all 5 real assets including the tuned Chicken
    Coop override; a real (non-dry-run) run then confirmed via GET
    /assets and GET /dashboard/summary: all 5 healthy/90, farm_health_score=90,
    active_alerts=0 (was 2 stale entries before the SQL fix), tasks_due_today=0.
    A real POST /workflow/run against that fresh baseline then genuinely
    escalated: Chicken Coop's feed dropped from 17.0% to 12.6% (crossed
    15.0 as designed) with 3 real new Cortex Agent recommendations.
  - **Also found, live, that the original claim ("only the chicken coop
    can flip in one tick") was incomplete** -- the Tilapia Pond's
    dissolved_oxygen_mg_l real-walked from its 6.0 seed into real
    "medium" risk (yellow) too, because that seed sits exactly at
    risk_engine.py's 6.0 threshold, which hadn't been checked precisely
    enough beforehand. Corrected to the user live rather than glossed
    over -- a net positive for the demo (two independent real chances of
    visible change), not a defect, but a real example of "verify against
    live data before trusting your own math."
  - Re-ran the reset script after verification to leave the live account
    in the clean healthy baseline as the actual end-of-session state.
    Killed local uvicorn cleanly; port 8000 confirmed clear.
  - Explicitly flagged as out of scope, not actioned without the user's
    confirmation: charts (still nothing in this codebase), and a distinct
    "Critical Farm Changes Detected" variant of feat-059's success banner
    (currently always positive-framed regardless of outcome).
    feature_list.json's feat-060 status: passing.
- **Session 038 (2026-08-05): implemented and live-verified feat-058
  (before/after value-diff highlight for Run Farm Tick), following a
  demo-flow review.** User described a hackathon demo flow (dashboard opens
  on old data, Run Farm Tick simulates a new cycle, before/after should be
  visually obvious) and asked whether it was feasible. Reviewed the actual
  code first rather than assuming: found the "old data" step already true
  (dashboard is a live view over Snowflake) with scripts/reset_demo_state.py
  already covering a deterministic "before" state, and feat-057's progress
  panel already covering the "processing" animation -- the one real gap was
  no before/after diffing anywhere, and no charts exist in the frontend at
  all (out of scope, no reading-history endpoint either). User agreed with
  scoping to just the diff/highlight, added as feat-058, then asked to start
  it in the same turn.
  - Added lib/tickDiff.ts (computeTickDiff), lib/useTickDiff.ts, and
    dataCache.ts's invalidateAndWait<T>()/setValue<T>() (the latter for
    keys with no fetcher, e.g. a derived diff value). DemoTriggerButton's
    handleJobDone is now async: snapshots "assets"/"dashboard-summary" via
    getSnapshot before the tick's refetch, invalidateAndWait's both, diffs,
    and publishes under a "tick-diff" cache key that auto-clears after 6s.
  - Marker treatment: MarkerFrame.tsx gained a `changed` prop rendering a
    fixed-amber changed-flash halo (new keyframe in globals.css), distinct
    from the existing status-colored spotlight-pulse and hover-driven
    highlight-ring. DashboardPanel's health-score Card gained a real +/-
    delta chip plus a brief value-flash background (Card.tsx needed a new
    `style` prop to support it) -- left HealthGauge's own feat-037
    session-scoped trend arrow untouched.
  - **Real mid-session design correction, not assumption-driven:** the
    first version diffed only Asset.status/health_score before vs. after.
    A real local tick against the live Snowflake account showed FP-001
    sitting at critical/health_score=10 across two consecutive ticks (the
    demo's crisis narrative is deliberately steady) while still generating
    3 brand-new real recommendations each time -- the status/health-only
    diff would have shown zero highlight for an asset the tick had clearly
    just acted on. Fixed by unioning in real asset ids the finished job
    reported a nonzero recommendations_count for (already computed by the
    same job, from feat-057's WorkflowAssetProgress), which required
    threading the resolved WorkflowJobStatus through
    WorkflowProgressPanel's onDone callback instead of calling it with no
    arguments.
  - Live Playwright verification (real local backend + live Snowflake
    account, ad hoc script, deleted after): ran a real ~4.4-minute tick (3
    sequential live Cortex Agent calls). Real before/after via GET /assets:
    CC-001 healthy(90)->critical(35) [status changed], FP-001
    critical(10)->critical(10) [unchanged bucket, 3 new recs], GH-001
    needs_attention(60)->needs_attention(60) [unchanged bucket, 4 new
    recs]. Result: exactly 3 changed-flash markers rendered (CC-001,
    FP-001, GH-001), confirming the recommendedAssetIds fix was both
    necessary and correct -- 2 of the 3 real highlighted assets would have
    been missed by a status/health-only diff. npx tsc --noEmit, npm run
    lint, npm run build all clean throughout. Full details and exact
    real numbers in feature_list.json's feat-058 evidence.
  - Not independently re-verified live: the 6s auto-clear timer (same
    window.setTimeout(setValue, ms) pattern already proven live elsewhere
    in this codebase) -- judged not worth a 4th multi-minute live Cortex
    Agent run just to watch a timer fire.
  - Killed local uvicorn + next dev cleanly after verification; both ports
    confirmed clear. feature_list.json's feat-058 status: passing.
  - **Same session, direct follow-up -- feat-059 (cinematic multi-phase
    processing sequence + success transformation):** user asked to replace
    the plain "Starting..." spinner with a richer sequence (their own
    suggested lines included "Connecting to CoCo...", "Running Cortex
    analysis...", etc.) plus a clear success transformation at the end.
    Flagged to the user before building: "Connecting to CoCo" is factually
    false about this app's runtime (CoCo only builds the Snowflake objects
    at dev time -- see CLAUDE.md and Session 037's explicit decision not to
    fabricate a runtime CoCo dependency; cortex_agent_client.py calls the
    Cortex Agents REST API directly). Substituted "Connecting to the Cortex
    Agent..." instead, and merged "Evaluating crop health"/"Generating AI
    recommendations" into the pre-existing real per-asset list (which
    already shows exactly that, per asset) rather than duplicating them as
    fake global lines.
  - Rewrote WorkflowProgressPanel.tsx as an explicit phase state machine:
    intro (3 simulated, clearly-decorative lines, ~650ms cadence with
    checkmarks) -> live (the existing real per-asset polling list, now with
    a staggered fade-in) -> outro (one decorative "Saving..." beat) ->
    refreshing (REAL -- awaits the same onDone(job) promise that drives
    feat-058's real diff computation, so "Refreshing dashboard insights..."
    is on screen exactly as long as that real work takes) -> done (real
    success screen with real stats from job.result + feat-058's TickDiff,
    or the existing error box). onDone's signature changed from () => void
    to (job) => Promise<void> so the panel can genuinely await the refresh.
  - Hit and fixed 2 react-hooks/set-state-in-effect lint errors using this
    codebase's existing queueMicrotask(() => setState(...)) pattern.
  - Live Playwright (real backend + live Snowflake account, ad hoc script,
    deleted after), a genuine ~4.6-minute tick: confirmed the 3 intro
    checkmarks accumulate one at a time on the real ~650ms cadence (0 right
    after click, 1 at ~700ms, 2 at ~1400ms) rather than all at once, and
    confirmed the success screen only appears after the real per-asset
    list -> "Saving..." -> "Refreshing dashboard insights..." sequence --
    with 2 real changed-flash map markers already present the moment the
    success screen appeared, confirming the panel and feat-058's map
    highlight are now genuinely synchronized rather than racing each other.
    tsc/lint/build clean; backend pytest suite (161/161) unaffected (no
    backend change). feature_list.json's feat-059 status: passing.
- **Session 037 (2026-08-04): completed the actual Render + Vercel go-live
  Session 036 prepped but didn't execute, found and fixed 2 real deploy-only
  bugs, and shipped feat-057 (live per-asset progress panel) in response to
  user feedback that the deployed demo looked broken.** User asked to assess
  hackathon-requirement fit (video length, "workflow executed via CoCo CLI,"
  1+ working workflow, 2-3 skills demonstrated), then to draft a video
  script and actually deploy, with one hard constraint: zero hosting cost.
  - Recommended (agreed by user): frame CoCo CLI as the tool that built the
    Snowflake-side objects the workflow runs against (matches
    docs/challenge.md's "effective CoCo CLI orchestration" judging
    criterion), rather than fabricating a fake runtime CoCo dependency this
    app's real architecture doesn't have (`cortex_agent_client.py` calls the
    Cortex Agents REST API directly, confirmed by reading it live). Saved
    `docs/video-script.md` (shot-by-shot, ~4:30 runtime, recording checklist
    at the end including "deployment live, not local dev" and "pre-warm
    Render's free instance first").
  - Generated a random `DEMO_PASSCODE` for the user to store outside the
    repo (never written to any file here).
  - **Render deploy, hit and fixed 2 real bugs neither showed up locally:**
    (1) Render's GitHub App wasn't granted repo access -- a permissions fix
    on GitHub's side, not code. (2) `render.yaml`'s `PYTHON_VERSION: 3.11.2`
    built successfully at the `pip install` step but then failed at
    container start with the interpreter binary missing entirely
    (`/opt/.../Python-3.11.2/bin/python3.11: No such file or directory`) --
    root-caused via Render's own docs (WebFetch): Render claims support for
    "any released version from 3.7.3 onward" but only pre-caches a subset of
    patch builds; less-common ones silently fail to actually install. Fixed
    by switching to `3.11.9`, a version Render's docs explicitly list as
    pre-built. Added `plan: free` to `render.yaml` explicitly (was unset,
    risking a default to a paid tier in Render's Blueprint UI).
  - **Vercel deploy:** root directory set to `frontend/`,
    `NEXT_PUBLIC_API_URL` pointed at the real Render URL. Once both were
    live, updated `render.yaml`'s `FRONTEND_URL` (was still the localhost
    placeholder) to the real Vercel URL for CORS.
  - **Live-verified the deploy without ever spending a real Cortex Agent
    call from a script:** confirmed `/health` live; confirmed the demo gate
    itself (`/demo/unlock` wrong/right passcode, `/workflow/run` with no
    token) via curl -- deliberately left the one real gated action (Run Farm
    Tick) for the user to trigger once, on purpose, through the real UI,
    matching this repo's standing precedent of never spending real credits
    from an automated check.
  - **Bug 1 (found live via the user's own click): `POST /workflow/run`
    500'd on a `429 Too Many Requests` from Open-Meteo.** Real root cause,
    confirmed via WebSearch against Render's own community forum: free-tier
    outbound IPs are shared across every other free customer in the same
    region, and Open-Meteo rate-limits by IP -- so this can happen
    independent of this app's own call volume, not fixable by "call it
    less." Two-part fix: (a) `weather_client.fetch_forecast` now retries up
    to 3 attempts with backoff on a 429 specifically (new
    `tests/test_weather_client.py`, 4 cases, `httpx.MockTransport` --
    caught and fixed a real self-reference bug in the test's own mock setup
    along the way: patching `httpx.AsyncClient` and then constructing the
    replacement via `httpx.AsyncClient(transport=...)` from inside itself
    recurses into the patched version). (b) More importantly: confirmed
    `weather` is never read anywhere past its own `WEATHER_READINGS` insert,
    so `main.py`'s `run_daily_workflow` now wraps just that step in
    `try/except httpx.HTTPError`, logs, and continues -- a flaky third-party
    call no longer sinks the whole tick's real asset simulation + Cortex
    Agent recommendations (new `tests/test_workflow_weather_resilience.py`).
    148/148 backend tests passing after this fix.
  - **feat-057, same session: user reported the (now-working) Run Farm Tick
    button gave zero feedback for its full ~3-5 minute runtime and asked to
    visualize the process "so judges can understand deeply."** Put one
    design fork to the user via `AskUserQuestion` (step-name-only vs.
    step-name-plus-live-metric-snippet) -- user chose the richer option.
    Chose polling over SSE/streaming specifically because this same
    session had already hit two unrelated real infra rough edges on
    Render's free tier + Cloudflare (the Python version bug, the weather
    429), so a long-lived streaming connection through that same stack was
    judged a needless new risk versus a plain poll-every-2s GET.
    - Backend: new `backend/app/services/workflow_jobs.py` (in-memory job
      store -- safe since Render's own deploy log confirms
      `WEB_CONCURRENCY=1`, a single worker). `main.py`'s
      `run_daily_workflow` loop body refactored into a shared
      `_run_workflow(job_id)` core that optionally reports progress via
      `workflow_jobs.update_asset()` at each Observe/Understand/Recommend
      transition, plus a new `_metric_snippet()` helper reusing
      `risk_engine.trend_metric()`'s existing risk_type->field mapping (the
      panel's live numbers are the same real values risk_engine itself
      already computes, not an invented display). Original
      `POST /workflow/run` kept contract-identical (`job_id=None`) for
      backward compat -- confirmed via the full pre-existing test suite
      passing unchanged. New `POST /workflow/run/start` (gated, returns a
      `job_id` immediately, runs the real workflow via
      `asyncio.create_task`) and `GET /workflow/run/status/{job_id}`
      (ungated -- read-only, never triggers a Cortex call). New
      `tests/test_workflow_jobs.py` (6 cases, pure in-memory logic) and
      `tests/test_metric_snippet.py` (4 cases, including a monkeypatched
      fallback-label case for a future risk_type/field pair not yet in
      `_METRIC_LABELS`), plus 2 new gate/404 cases added to
      `test_demo_gate.py`. 161/161 backend tests passing.
    - Frontend: new `components/WorkflowProgressPanel.tsx` -- polls via a
      self-scheduling `setTimeout` (not `setInterval`, to avoid overlapping
      requests if a poll is slow) every 2s; caught and fixed a real
      stale-closure bug in an earlier draft (checking React state directly
      inside a `setInterval` callback never sees updates, since the closure
      captures the value from when the effect first ran). `lib/api.ts`
      gained `startWorkflow()`/`getWorkflowStatus()`, replacing the old
      blocking `runWorkflow()` (removed, no longer called anywhere).
      `DemoTriggerButton.tsx` now starts the job and hands off to the panel
      instead of blocking. `npx tsc --noEmit`, `npm run lint`,
      `npm run build`: all clean.
    - **Live-verified against the real local backend + live Snowflake
      account** (ad hoc Playwright, deleted after -- seeded a local demo
      token via `localStorage` to reach the button without a passcode
      prompt, safe since the local backend has no `DEMO_PASSCODE` set and
      the gate is a documented no-op regardless of token value): captured a
      full real ~190s run start to finish. t=0.0s all 5 assets "Waiting...";
      t=6.2s Layer House North/Mango Grove West already "Low risk -- no
      action needed" (correctly skipped the Cortex call) while Tilapia Pond
      A shows "Consulting Cortex Agent (DO: 2.0 mg/L)..." with a real live
      sensor value; t=93.0s Tilapia Pond A "4 recommendation(s) ready (DO:
      2.0 mg/L)", Greenhouse A now "Consulting Cortex Agent (Disease risk:
      33.66 %)..."; t=189.1s all 5 done, "Tick complete -- 5 assets
      assessed, 2 at risk," Close button appears. Zero console errors.
      Screenshot confirmed the panel's final tally exactly matches the
      map's own independently-computed status pill (Critical 1 / Attention
      1 / Healthy 3). Killed the local uvicorn + next dev processes and
      confirmed both ports clear afterward.
    - `feat-057` added directly to `passing` in `feature_list.json` (full
      evidence trail, 5 entries) -- implemented and live-verified in one
      continuous session, not staged across sessions like most other
      features here.
  - Still open: (1) the completed weather-resilience + progress-panel
    commits need to be pushed and Render/Vercel need to pick up the latest
    deploy; (2) a live end-to-end re-verification of feat-057 specifically
    *against the deployed* Render+Vercel stack (not just local) hasn't run
    yet -- local verification proves the mechanism works, but the deployed
    stack's own quirks (cold starts, shared-IP weather 429s) haven't been
    exercised against this specific new code path; (3) `README.md`'s
    `<DEMO_URL>`/`<VIDEO_URL>`/`<DEVPOST_URL>` placeholders are still
    unfilled; (4) the optional free uptime-pinger (UptimeRobot/cron-job.org
    hitting `/health`) was discussed but not set up; (5) no demo video has
    been recorded yet.
- **Session 036 (2026-08-03): closed the remaining Cortex-Agent cost leak
  and prepped deploy config.** User asked to plan the deploy; plan (saved
  at the time as a Claude Code plan-mode file) split into: (1) close the
  gap Session 035 flagged as a follow-up, (2) prep Render/Vercel config,
  (3) manual go-live steps the user still owns.
  - Root cause of the gap: `HarvestPlannerCard`, `ScenarioSimulatorCard`'s
    baseline, `YieldEstimateCard` (all in
    `frontend/components/AssetDetailPanel.tsx`), and `BriefingView.tsx`
    all auto-fetched via `useApiData` on mount, not on click -- so just
    browsing the 5 asset pages fired real Cortex Agent calls with zero
    passcode friction, a bigger leak than the `/workflow/run` gate alone
    closed.
  - New `frontend/lib/useGatedAction.ts` (click-to-reveal counterpart to
    `useApiData`: `reveal()`/`submitPasscode()`/`cancelPasscode()`, same
    401-clears-token-and-reprompts behavior `DemoTriggerButton` already
    had) and `frontend/components/PasscodePrompt.tsx` (markup extracted
    out of `DemoTriggerButton`, now shared). Converted Harvest
    Planner/Yield Estimate/Briefing to click-to-reveal using the hook;
    `DemoTriggerButton` itself now renders the shared component too (logic
    untouched, markup only).
  - Backend: added `dependencies=[Depends(require_demo_access)]` to
    `GET /assets/{id}/harvest-plan`, `GET /assets/{id}/yield-estimate`,
    `POST /copilot/ask`, `GET /briefing/today`.
  - One deliberate exception found while reading `main.py` before blanket-
    gating everything: `POST /assets/{id}/simulate`'s baseline call
    (`action: null`) was **already** built cost-free by design back in
    feat-055 -- its own docstring says so, and the code path skips the
    agent call entirely when `action` is falsy. Blanket-gating the whole
    route would have wrongly locked a call that never cost anything.
    Fixed by gating conditionally inside the handler
    (`if body.action: require_demo_access(x_demo_token)`) instead of a
    route-level dependency, and reverted `ScenarioSimulatorCard`'s
    baseline back to its original ungated `useApiData` mount-fetch --
    only the "Simulate" button (the one call that reaches the agent) is
    gated, with its own inline 401-triggered passcode prompt.
  - Verification: extended `backend/tests/test_demo_gate.py` with 6 new
    cases covering all 5 newly gated routes, including one that proves
    the simulate baseline is *not* gated (monkeypatches
    `snowflake_client.run_query` to fail fast against a
    `raise_server_exceptions=False` TestClient, so "not a 401" is provable
    without ever reaching live Snowflake). Full suite 143/143.
    `python -m compileall app`, `npx tsc --noEmit`, `npx eslint` all
    clean. Real-browser check (ad hoc Playwright, deleted after): on
    `/assets/GH-001`, Harvest Planner and Yield Estimate both show a
    locked reveal button (not auto-loaded data), clicking opens the
    passcode prompt, Cancel closes it; Scenario Simulator's baseline
    shows real content immediately, confirmed no lock button renders for
    it; `/briefing` shows a locked "Generate Today's Briefing" button.
    Re-ran the original `DemoTriggerButton` check too, to confirm the
    `PasscodePrompt` extraction didn't regress it -- still passes.
  - Added `render.yaml` (Blueprint config for an always-on Render Web
    Service under `backend/`, secrets marked `sync: false` so they're
    never in the repo) and flipped `vercel.json`'s `deploymentEnabled` to
    `true`.
  - Still not done -- needs the user's own Render/Vercel accounts, which
    this agent has no access to: (1) no real `DEMO_PASSCODE` has been
    chosen/set anywhere yet; (2) nothing is actually deployed; (3)
    `README.md`'s `<DEMO_URL>`/`<VIDEO_URL>`/`<DEVPOST_URL>` are still
    placeholders; (4) CORS (`FRONTEND_URL`) can't be pointed at a real
    frontend URL until Vercel deploy happens. Full plan/order is in this
    session's plan-mode file (deploy steps 6-9 unexecuted).

- **Session 035 (2026-08-03): built the demo passcode gate + manual
  "Run Farm Tick" trigger for the public hackathon deployment.** Not a
  `feature_list.json` item -- deployment/ops work, triggered by the user
  asking how judges try a deployed link without a stranger with the URL
  being able to spend real Snowflake/Cortex trial credits (confirmed via
  Snowflake billing check: ~$292 of a ~$400 trial remaining, not a CoCo
  CLI quota as originally suspected).
  - Design agreed with user: link stays fully public and viewable by
    anyone; only actions that trigger a real Cortex Agent call require a
    shared passcode (given to judges via the Devpost submission notes,
    not the public page). `POST /workflow/run` had **zero existing
    caller** (frontend never invoked it) -- with no scheduler in this
    codebase, the live demo data would never move post-deployment
    without a manual trigger, so this doubled as the first real use of
    that endpoint.
  - Backend: `backend/app/services/demo_auth.py` (new) -- shared-secret
    HMAC-signed token, 12h TTL, `is_enabled()`/`check_passcode()`/
    `create_token()`/`verify_token()`. `Settings.demo_passcode` (env
    `DEMO_PASSCODE`, default `""`) -- **empty disables the gate
    entirely**, so local dev and every existing test are unaffected by
    default; only a real deployment setting a passcode turns it on.
    `POST /demo/unlock` issues a token from the passcode;
    `require_demo_access` (a `Depends()`) 401s on missing/bad
    `X-Demo-Token` and is wired only onto `/workflow/run` so far --
    `/copilot/ask`, Harvest Planner, Scenario Simulator (baseline), and
    Yield Estimate all still auto-fire an agent call on `AssetDetailPanel`
    mount (not click), so gating those would break "public can view"
    without restructuring them to click-to-reveal first. Left ungated,
    flagged as a follow-up, not fixed this session (scope was the
    trigger button, not a full audit).
  - Frontend: `frontend/lib/demoAuth.ts` (new, localStorage token),
    `DemoTriggerButton.tsx` (new, in `TopNav` next to the nav links) --
    passcode modal on first use, stores the token, calls `POST
    /workflow/run`, invalidates the `assets` and `dashboard-summary`
    cache keys on success so the map/dashboard refresh immediately.
    `lib/api.ts`'s `apiFetch` now attaches `X-Demo-Token` from storage on
    every request when present (harmless no-op against ungated routes).
  - Verification: `cd backend && python -m compileall app` clean. New
    `tests/test_demo_auth.py` (7 cases, pure HMAC logic) and
    `tests/test_demo_gate.py` (8 cases) -- full suite 137/137. One dead
    end worth recording: an early gate test let a disabled/valid-token
    request fall through into the real `/workflow/run` handler, which
    hung indefinitely -- it makes a real Snowflake + Open-Meteo call with
    no timeout configured. Fixed by calling `require_demo_access`
    directly for the "gate passes through" assertions instead of going
    through the full endpoint (same reason this repo's other pytest
    tests never touch live Snowflake). Live-server smoke test (`uvicorn`
    with `DEMO_PASSCODE=testpass`, real `curl`): wrong passcode -> 401,
    right passcode -> valid token issued, `/workflow/run` without/with a
    bad token -> 401 -- confirmed **without** ever calling the endpoint
    with a valid token against real Snowflake, since that would spend
    real credits just to test. `npx tsc --noEmit` and `npx eslint` clean
    on all changed/new frontend files. Real-browser check (Playwright,
    ad hoc script, deleted after): button renders in `TopNav`, click
    opens the passcode modal, Cancel closes it -- deliberately never
    submitted the real passcode in this check for the same
    credit-spend reason.
  - Still open / not done this session: (1) the four mount-time agent
    calls on the asset detail page noted above are still ungated; (2) no
    passcode has actually been chosen/set as a real deployment secret
    yet -- `DEMO_PASSCODE` is still unset everywhere; (3) actual
    deployment (Vercel for frontend, an always-on host for backend --
    Render/Railway/Fly.io, not serverless, since it holds a live
    Snowflake connection) hasn't happened -- `vercel.json` still has
    `deploymentEnabled: false` and `README.md`'s demo/video/devpost links
    are still placeholders.

- **Session 034 (2026-07-27): implemented and live-verified feat-056
  (Yield Estimation).** User asked whether to build the 6 items on
  `docs/FarmTwin-AI-Copilot.md`'s Roadmap. Triaged all 6: ruled out 5
  (disease prediction already covered by `predict_trend`/Scenario
  Simulator; cost optimization needs $ data the schema doesn't track and
  was already explicitly passed over once, `feat-053`'s notes; resource
  planning would just be `query_farm_ops` under a new name; water usage
  optimization needs volume data `irrigation_status` doesn't track;
  autonomous daily planning directly contradicts the human-approval-loop
  design this project is built around). Recommended Yield Estimation as
  the one genuinely new, non-redundant capability. User agreed to build
  it.
  - Key finding before scoping: `ASSET_HISTORY` already has 2-3 real
    per-cycle yield records for every one of the 5 asset types
    (`biomass_kg_harvested`, `eggs_produced`, `yield_tons_per_ha`,
    `fruit_production_tons`, `vegetable_yield_kg`) -- no new Snowflake
    data needed, unlike feat-054.
  - Design: `estimate = mean(asset's own historical yield records) *
    (current health_score / 100)` -- deliberately simple, not a fitted
    model (2-3 historical records per asset would make anything fancier
    overfitting). No `AskUserQuestion` needed this time (unlike feat-055)
    -- the formula was derivable from the data and this repo's now-
    established deterministic-Python-then-agent-narrates pattern, not an
    open judgment call.
  - Implemented `backend/app/services/yield_estimator.py`
    (`estimate_yield()`, `yield_metric_for()`), `schemas.py` gained
    `YieldEstimate`, `main.py` gained `GET /assets/{id}/yield-estimate`.
    No CoCo prompt needed (reuses real `ASSET_HISTORY` + the existing
    `_health_score()`). Proactively applied 2 lessons from feat-054's
    live bugs instead of rediscovering them: coerced `ASSET_HISTORY
    .METRIC_VALUE` with `float()` at the query boundary (the
    Decimal/float class of bug), and constrained the narration prompt to
    plain sentences, no markdown (the rendering-mismatch class of bug).
    `cd backend && python -m compileall app`: clean. New
    `tests/test_yield_estimator.py` (10 cases); full suite 122/122 (112
    pre-existing + 10 new).
  - Frontend: `lib/types.ts`/`lib/api.ts` gained `YieldEstimate`/
    `getYieldEstimate()`; `AssetDetailPanel.tsx` gained a
    `YieldEstimateCard`, mounted unconditionally for every asset type
    (backend returns `is_available: false` gracefully rather than
    400ing, same pattern as `ScenarioSimulatorCard`). `npx tsc --noEmit`,
    `npm run lint`, `npm run build`: all clean.
  - Live verification (real backend + live Snowflake account) across all
    5 real assets, each hand-cross-checked against the real
    `ASSET_HISTORY` rows: FP-001 (critical, health 10/100) -- baseline
    246.67 kg, estimated 24.67 kg, narrative correctly tied the collapse
    to the real Q4-2024 DO-crash precedent (310kg->145kg). CC-001
    (healthy, 90/100) -- baseline 3750.0 eggs, estimated 3375.0. RF-001
    (healthy, 90/100) -- baseline 4.6 tons/ha, estimated 4.14. FO-001
    (healthy, 90/100) -- baseline 5.7 tons, estimated 5.13. GH-001
    (needs_attention, 60/100) -- baseline 303.33 kg, estimated 182.0,
    narrative correctly connected it to the real live CO2/humidity/
    disease readings and the real historical Q1-2025 whitefly-outbreak
    yield dip (180kg) as a comparable precedent. Every estimate matched
    hand computation exactly; zero fabricated numbers across all 5.
  - Live Playwright: Yield Estimate card renders correctly on Tilapia
    Pond A's detail page below Scenario Simulator, real number + real
    confidence badge + clean narrated prose, zero console errors, zero
    regressions.
  - `feat-056` moved to `passing` in `feature_list.json` (4 evidence
    entries). `docs/FarmTwin-AI-Copilot.md`'s Roadmap section and
    `docs/architecture.md`'s "What's real" table updated to reflect the
    ship and the 5 ruled-out items' reasoning.
  - Files changed: `feature_list.json`, `backend/app/services/
    yield_estimator.py` (new), `backend/app/models/schemas.py`,
    `backend/app/main.py`, `backend/tests/test_yield_estimator.py` (new),
    `frontend/lib/types.ts`, `frontend/lib/api.ts`,
    `frontend/components/AssetDetailPanel.tsx`,
    `docs/FarmTwin-AI-Copilot.md`, `docs/architecture.md`.
  - Next best step: no unfinished feature currently queued in
    `feature_list.json`. All 6 original Roadmap items are now resolved
    (1 shipped, 5 explicitly ruled out with reasoning). Next session
    should pick a new direction with the user.
- **Session 033 (2026-07-25): implemented and live-verified feat-055
  (Scenario Simulator), the last of the two Agent Skills scoped in
  Session 032 -- both feat-054 and feat-055 are now `passing`.** No CoCo
  prompt needed for this one: intervention effect rates
  (`emergency_aeration` on `dissolved_oxygen_mg_l`, etc.) are Python
  constants in a new `backend/app/services/scenario_engine.py`, per the
  design decision already made in Session 032.
  - Added public accessors instead of reaching into other modules'
    private state: `risk_engine.trend_metric()` (wraps `_TREND_METRIC`)
    and `asset_simulator.metric_bounds()` (wraps `_NUMERIC_METRICS`).
    `scenario_engine.simulate()` keys its intervention effects off
    `risk_type` (reusing `trend_metric()`'s existing risk_type ->
    (field, direction) mapping), so a what-if projection's target metric
    always matches what `predict_trend` already tracks for that risk.
  - Unlike `harvest_planner.py` (which treats one `/workflow/run` tick as
    one day -- fine for a multi-day ETA), this computes a real **hourly**
    rate from the actual elapsed time between the two most recent
    `ASSET_READINGS` timestamps (`main.py`'s `_recent_readings()`
    extended to include `ts`) -- ticks are demo-triggered, not a strict
    daily cadence, so an hourly "skip aeration tonight" what-if needs a
    real hourly rate, not an assumed one.
  - New `POST /assets/{id}/simulate`: called with no `action` to silently
    seed the frontend's picker (real candidate actions + baseline, no
    agent call yet, so page load isn't gated on a live LLM round trip);
    called again with a chosen action for the narrated with/without
    comparison. `cd backend && python -m compileall app`: clean. New
    `tests/test_scenario_engine.py` (12 cases); full suite 112/112
    (100 pre-existing + 12 new).
  - **Bug found and fixed during live verification, before it ever
    reached the frontend:** unbounded linear extrapolation over the 24h
    horizon projected a physically impossible **21.2 mg/L** dissolved
    oxygen for Tilapia Pond A with `emergency_aeration` -- the simulator's
    own realistic ceiling is ~8 mg/L (oxygen saturation). This would have
    rendered straight into the UI's projection table regardless of how
    the agent phrased its narrative. Fixed by clamping both projections
    to each metric's real bounds via the new `metric_bounds()` accessor;
    added 2 regression tests. Re-verified live: the same call now
    correctly clamps to 8.0 mg/L at 24h.
  - Live re-verification through the real REST path (real backend + live
    Snowflake account): `POST /assets/RF-001/simulate` (no active risk)
    correctly returned `is_available: false` with a clear reason, no
    fabricated data. `POST /assets/FP-001/simulate`
    (`dissolved_oxygen`, critical) with `emergency_aeration` returned
    correctly-directioned, clamped projections (2.0 -> 6.8 mg/L at 6h,
    2.0 -> 8.0 mg/L at 24h) with a narrative grounded in the real current
    value, the clamped numbers, and the real 2/3 aerator stock level --
    zero fabricated numbers. `POST /assets/GH-001/simulate` (`disease`,
    medium) with `apply_fungicide` showed the same pattern, including a
    correct 0.0% floor-clamp at 24h.
  - `cd frontend && npx tsc --noEmit && npm run lint && npm run build`:
    all clean. Live Playwright: selected "emergency aeration" on Tilapia
    Pond A's detail page, clicked Simulate, confirmed the projections
    grid and narrated prose render correctly (same
    `splitIntoSentences`/`renderInlineMarkdown` pattern feat-054
    established -- no raw markdown artifacts), zero console errors.
  - **Investigated, not fixed, and disclosed rather than hidden:** since
    this feature has no CoCo prompt, `FARM_OPS_AGENT`'s own instructions
    know nothing about the dedicated Scenario Simulator view (unlike
    feat-054's explicit guardrail). Live-tested `POST /copilot/ask "What
    happens if I skip emergency aeration on Tilapia Pond A tonight?"`
    through the real REST path: the agent did **not** fabricate a
    specific numeric projection -- it reasoned qualitatively from real
    thresholds and cited the real historical Q4-2024 DO-crash precedent
    (310kg -> 145kg, a real `ASSET_HISTORY` fact) instead. Reasonable,
    grounded behavior, but not a guaranteed guardrail the way feat-054
    has one. Flagged to the user as a possible future refinement (a
    lightweight, instructions-only CoCo prompt, no new tables) rather
    than unilaterally adding it, since that would reintroduce the CoCo
    dependency this feature was specifically designed to avoid.
  - `feat-055` moved to `passing` in `feature_list.json` (5 evidence
    entries). Files changed: `backend/app/services/scenario_engine.py`
    (new), `backend/app/services/risk_engine.py`,
    `backend/app/services/asset_simulator.py`, `backend/app/main.py`,
    `backend/app/models/schemas.py`, `backend/tests/test_scenario_engine.py`
    (new), `frontend/lib/types.ts`, `frontend/lib/api.ts`,
    `frontend/components/AssetDetailPanel.tsx`, `feature_list.json`.
  - Next best step: both of the two new Agent Skills scoped in Session
    032 are done. No unfinished feature is currently queued in
    `feature_list.json` -- next session should either pick a new
    direction with the user, or revisit the copilot-chat guardrail
    question flagged above if they want tighter defense-in-depth.
- **Session 032 (2026-07-25): fixed a UI overflow bug in the Farm overview
  weather widget (`frontend/components/DashboardPanel.tsx`).** User
  reported "the weather of farm overview has a UI bug" with no further
  detail, so reproduced it live rather than guessing: started the real
  backend (`uvicorn`, already-configured `backend/venv`) and used the
  already-running frontend dev server (`localhost:3000`), then drove it
  headlessly with a one-off Playwright script (project's existing
  `@playwright/test` devDependency) to screenshot the rendered page.
  - Root cause: `weather.humidity_pct` and `weather.rainfall_mm` come
    from Snowflake as raw unrounded floats (e.g. `89.041666...`,
    `14.66667`) and were interpolated directly into the small
    `WeatherStat` boxes with no rounding — unlike `temp_c`, which already
    had `Math.round()`. The long string overflowed its fixed-width box in
    the `grid-cols-3` stat row and visually collided with the adjacent
    "Rain" stat (screenshot showed literal overlapping text
    `89.041666614mm7%`).
  - Fix: round `humidity_pct`, `rainfall_mm`, and `wind_kph` to whole
    numbers on display (`Math.round`, matching `temp_c`'s existing
    treatment) — tried `.toFixed(1)` first but the unit suffix (`mm`/`kph`)
    still got clipped by `truncate` in the narrow box, so whole numbers
    were needed to fit. Also added `truncate` to `WeatherStat`'s `<dd>` as
    a defensive guard so any future long value degrades to an ellipsis
    instead of overflowing into the neighboring cell again.
  - Verification: re-screenshotted after the fix — humidity/rain/wind now
    render as `89%` / `14 mm` / `18 kph` with no overlap or clipping.
    `npx tsc --noEmit` clean, `cd backend && python -m compileall app`
    clean (backend untouched, re-ran per CLAUDE.md's verification list
    anyway). No feature_list.json entry matched this (not a listed
    feature, a reported bug), so no status flip there.
  - Files changed: `frontend/components/DashboardPanel.tsx`.
  - **Same session, continued: scoped and implemented feat-054 (Harvest
    Planner), scoped feat-055 (Scenario Simulator) for next session.**
    User asked which hackathon rubric category the project fit
    ("Domain-Specific AI Copilot" — confirmed via `docs/challenge.md`,
    which is literally titled that), then asked for an honest assessment
    of hackathon competitiveness, then proposed adding all 7 "Agent
    Skills" named in `docs/FarmTwin-AI-Copilot.md`'s vision doc. Pushed
    back on building all 7 as literal separate Cortex Agent tools: 4 of
    them (Livestock Advisor, Crop Advisor, Task Planner, Risk Assessment)
    just re-slice the existing unified `query_farm_ops`/`FARM_OPS_VIEW`
    tool, which already spans every asset type by design (per
    `docs/architecture.md`'s 2026-07-14 pivot) — building them as
    separate tools would fragment that unification and add Cortex Agent
    tool-selection risk for no new capability. A 5th (Weather Impact
    Analyzer) was also ruled out: weather-to-risk correlation already
    appears unprompted in real recommendation output (see Session 031's
    GH-001 fungicide recommendation citing humidity/temp directly), so
    there's no gap to fill. Recommended the 2 genuinely new capabilities
    instead: Harvest Planner and Scenario Simulator. User agreed to build
    both.
  - Used the `feature-planner` skill to scope both into `feature_list.json`
    (`feat-054`, `feat-055`, `not_started`/`blocked` per the harness's
    real status vocabulary — checked `.claude/skills/harness-creator/`
    since all 24 existing entries happen to be `passing` and don't show
    the non-passing convention).
  - Key design finding before scoping: `risk_engine.predict_trend()`
    already computes a one-tick "if this trend continues, no action
    taken" linear projection every `/workflow/run` tick (the
    `*_forecast_24h` risk rows) — so Scenario Simulator's real gap is
    only the "with a specific intervention" branch, not projection
    itself.
  - Put one genuine design fork to the user via `AskUserQuestion` before
    writing any CoCo prompt (since CoCo prompts run against the live,
    shared Snowflake account and are costly to redo): should Scenario
    Simulator's projection math be deterministic Python (agent only
    narrates) or agent-native reasoning over Snowflake-exposed data
    (matching feat-044's date-math-via-agent-reasoning precedent)? User
    chose deterministic Python, citing the same reasoning this agent
    raised — multi-step numeric extrapolation is a weaker LLM-reliability
    spot than feat-044's single-addition date math. This same reasoning
    was then extended to Harvest Planner's ETA (also a rate-based
    projection, not a single addition), for consistency.
  - **feat-054 (Harvest Planner) implemented this session, feat-055 not
    yet started (next session):**
    - Drafted CoCo prompt Part 8 in `snowflake/coco-prompts.md` (new
      `HARVEST_RULES` table + `FARM_OPS_VIEW` extension + an explicit
      Cortex Agent guardrail instruction telling it to state current
      readiness/threshold but NOT calculate its own ETA if asked via
      copilot chat) — drafted only, **not yet run** by the user.
    - Backend: new `backend/app/services/projection.py` (shared linear-
      projection helper, meant to be reused by `feat-055` too) and
      `backend/app/services/harvest_planner.py` (`plan_harvest()`: linear
      readiness-trend ETA for `fruit_orchard`/`greenhouse`, since
      `asset_simulator.py` only gives those two a continuous
      `harvest_readiness_pct`; expected-value growth-stage-transition ETA
      for `rice_field`, which has no `harvest_readiness_pct` column at
      all). `schemas.py` gained `HarvestPlan`; `main.py` gained
      `_recent_readings()` (refactored `_latest_reading` to reuse it) and
      `GET /assets/{asset_id}/harvest-plan`, which hands the deterministic
      numbers to a real `cortex_agent_client.ask_agent()` call to narrate
      (with an explicit "do not recalculate" instruction in the prompt).
      `cd backend && python -m compileall app`: clean. New
      `tests/test_harvest_planner.py` (11 cases, both projection shapes);
      full suite 100/100 pass (89 pre-existing + 11 new).
    - Frontend: `lib/types.ts`/`lib/api.ts` gained `HarvestPlan`/
      `getHarvestPlan()`; `AssetDetailPanel.tsx` gained a
      `HarvestPlannerCard` subcomponent, deliberately only *mounted* (not
      just conditionally hidden) for `rice_field`/`fruit_orchard`/
      `greenhouse` via `HARVEST_PLANNER_TYPES.includes(asset.type)` —
      calling the hook unconditionally would have cached a permanent
      `null` result before the asset type was even known, since
      `dataCache.ensure()` only fires a fetcher once per key while data
      is fresh. `npx tsc --noEmit` and `npm run lint`: both clean.
    - Live smoke test (real backend + live Snowflake account): `GET
      /assets/RF-001/harvest-plan` correctly 500s with `Object
      HARVEST_RULES does not exist or not authorized` — confirms the
      endpoint reaches the real query (asset lookup, type-check, 2-reading
      fetch all ran fine first) and fails exactly where expected, not from
      a code bug. Live Playwright: Paddy Block East (RF-001, real
      `growth_stage='harvest_ready'` today)'s asset detail page renders
      correctly, the Harvest Planner card shows its loading skeleton (this
      repo's `useApiData` convention has no component render an explicit
      error state, so a backend failure shows as a permanent skeleton,
      same as every other card here), zero crashes, zero regressions to
      the rest of the page.
    - `feat-054` moved to `blocked` (not `passing`) — all code is done and
      code-level-verified; the only remaining step is the user running
      `snowflake/coco-prompts.md` Part 8, then a live re-verification pass.
  - Files changed: `feature_list.json` (feat-054/feat-055 added),
    `snowflake/coco-prompts.md` (Part 8 drafted), `backend/app/services/
    projection.py` (new), `backend/app/services/harvest_planner.py` (new),
    `backend/app/models/schemas.py`, `backend/app/main.py`,
    `backend/tests/test_harvest_planner.py` (new), `frontend/lib/types.ts`,
    `frontend/lib/api.ts`, `frontend/components/AssetDetailPanel.tsx`.
  - **Same session, continued again: user ran `snowflake/coco-prompts.md`
    Part 8; live-verified feat-054 end to end and moved it to `passing`,
    finding and fixing 2 real bugs along the way.** CoCo's own
    verification (Snowsight/CoCo's interface) passed all tests: `HARVEST_RULES`
    seeded (3 rows -- rice_field/NULL, fruit_orchard/85%, greenhouse/80%),
    `FARM_OPS_VIEW` extended, agent guardrail instructions added. Per this
    repo's own hard-learned precedent (feat-053 passed CoCo's internal
    checks but broke this app's real `cortex_agent_client.py` calls for 5
    days on a gap CoCo's testing never exercised), re-verified everything
    through the actual app's REST endpoints, not just CoCo's report:
    - `GET /assets/RF-001/harvest-plan` (rice_field, `harvest_ready`) and
      `/assets/FO-001/harvest-plan` (fruit_orchard, 99.73% readiness) both
      correctly returned `is_ready: true` with clean, grounded narration.
      `/assets/FP-001/harvest-plan` (fish_pond) correctly 400s.
    - **Bug 1 (found live):** `GET /assets/GH-001/harvest-plan` — the one
      case that should hit the not-ready/projected-ETA branch — 500'd:
      `TypeError: unsupported operand type(s) for -: decimal.Decimal and
      float`. Root cause: `HARVEST_RULES.min_readiness_pct` is
      `NUMERIC(5,2)` in Snowflake, decoded by
      `snowflake-connector-python` as `decimal.Decimal`, incompatible with
      the plain `float` `ASSET_READINGS.harvest_readiness_pct` yields --
      a type mismatch neither CoCo's testing nor the earlier pre-CoCo
      smoke test could have caught (both never reached this arithmetic).
      Fixed by coercing to `float` at the Snowflake boundary in
      `main.py`'s `get_harvest_plan()`. Full pytest suite re-run: 100/100
      (unaffected, since `harvest_planner.py`'s own logic never changed).
    - Re-tested GH-001 after the fix: `eta_description` "approximately
      14.2 day(s) until the 80.0% threshold." Hand-verified against the
      real two most recent `ASSET_READINGS` rows queried directly
      (63.34% on 07-24, 62.17% on 07-23): `(80.0-63.34)/(63.34-62.17) =
      16.66/1.17 = 14.2` -- exact match.
    - **Bug 2 (found live, UX polish not a crash):** GH-001's narrative
      came back in the agent's full 6-field markdown/heading/bullet-list
      recommendation format (the prompt never constrained it), which
      `frontend/lib/markdown.tsx`'s `renderInlineMarkdown` (bold-only, no
      headings/lists, by its own documented scope) rendered as literal
      `###`/`**` characters -- a readability regression not present in
      RF-001/FO-001's shorter real responses. Fixed by constraining the
      harvest-plan prompt in `main.py` to "3-5 plain sentences, no
      markdown headings, no bullet lists, no 6-field format" (matching
      `/briefing/today`'s existing prompt style), and switched
      `AssetDetailPanel.tsx`'s `HarvestPlannerCard` to render with
      `splitIntoSentences` + `renderInlineMarkdown` -- the same helper
      `BriefingOverview.tsx` already uses for agent prose -- instead of a
      single raw `<p>`. Re-verified live: clean sentence-per-paragraph
      prose, real `<strong>` bold, no literal markdown characters.
    - Live `/copilot/ask` guardrail check through the real REST path (not
      just CoCo's own testing): "When will Greenhouse A be ready to
      harvest?" correctly cited the real 63.3%/80% gap, said NOT READY,
      and explicitly declined to project a date, pointing to the app's
      Harvest Planner view instead -- zero fabricated ETA.
    - `cd backend && python -m compileall app`, full pytest (100/100),
      `npx tsc --noEmit`, `npm run lint`, `npm run build`: all clean.
      Live Playwright screenshots across all 3 crop asset types: zero
      console errors.
    - Disclosed, not hidden: one live GH-001 capture (before the prompt
      fix) showed a single oddly-split sentence fragment ("7% [Live
      Data].") from non-deterministic LLM phrasing interacting with the
      sentence-splitter -- not reproduced in the 3 other captures, same
      known risk class this repo already documents elsewhere (feat-052's
      notes: "an LLM's adherence to a formatting instruction is a strong
      bias, not a hard guarantee").
    - `feat-054` moved to `passing` in `feature_list.json` (10 evidence
      entries). Files changed this round: `backend/app/main.py`,
      `frontend/components/AssetDetailPanel.tsx`,
      `snowflake/coco-prompts.md` (heading updated to reflect the run).
  - Next best step: feat-055 (Scenario Simulator) is `not_started` and
    reuses `backend/app/services/projection.py`. No CoCo prompt needed
    for it (intervention effect rates are Python constants per the
    2026-07-25 design decision) -- purely a backend + frontend session.
- **Session 031 (2026-07-24): live-verified feat-043 and feat-044 end to
  end against the real Snowflake account; found and fixed a live
  `</answer>`-tag leak bug along the way.** User connected the CoCo/`cortex`
  CLI (see prior turn's connection troubleshooting) and asked what prompts
  were still needed -- checked `snowflake/coco-prompts.md` and
  `feature_list.json` first: all of Part 6 (feat-043) and Part 7 (feat-044)
  had already been run in Session 029/030, so no new CoCo prompt was
  needed. Ran the actual live verification both features were still
  missing:
  - `cd backend && python -m compileall app` clean; `venv/bin/python -m
    pytest tests -q` 88/88 (89/89 after the bug fix below).
  - Started `uvicorn` against the live account, ran a real `POST
    /workflow/run` tick (3m18s): 6 real recommendations, `stock_availability`
    correctly `low_stock` for `aerator_unit` (2 on hand vs threshold 3,
    text says "reorder aerators today"), `out_of_stock` for
    `antibiotic_dose` (0 on hand, text says "reorder now"), `in_stock` for
    well-stocked items with no false positives. **feat-043 -> passing.**
  - `POST /copilot/ask` ("When is it safe to harvest Tilapia Pond A?")
    correctly cited the real computed **2026-08-01** earliest-safe-harvest
    date (July 18 antibiotic treatment + 14-day withdrawal), alongside the
    independent DO crisis, zero false positives.
  - **Bug found (live, not feat-043/044's fault):** the raw response ended
    in a stray `</answer>` tag with no matching opening tag visible in the
    cleaned output. Root-caused to `main.py`'s `_clean_agent_answer`
    (`_clean_agent_answer` at the time only ever stripped text *before*
    `<answer>`, never a trailing `</answer>`) -- `feat-052` (2026-07-19)
    made the agent always emit a closing tag, but the backend's own
    parsing was never updated to match, and `feat-052`'s own verification
    only checked the raw agent output via CoCo, never this app's cleaned
    output, so the gap went unnoticed for 5 days across every
    `/copilot/ask`, `/workflow/run` summary, and `/briefing/today` call.
    Asked the user whether to fix now or log it separately -- user chose
    fix now. Fixed by also splitting on `</answer>` when present; added
    `test_strips_closing_answer_tag_too` to
    `tests/test_clean_agent_answer.py` and corrected the now-stale comment
    in the adjacent test that claimed "real captured samples never
    included one." Restarted `uvicorn`, re-ran the same live question --
    confirmed clean output, no trailing tag. 89/89 backend tests pass.
  - Verified feat-044's approve-flow write-through (the one piece its own
    evidence had flagged as pending): inserted a clearly-tagged test
    `RECOMMENDATIONS` row for FP-001 whose text contained the literal
    phrase "antibiotic treatment" (today's real agent recommendations only
    say "antibiotic doses", which doesn't match `_maybe_log_treatment`'s
    substring check), approved it via the real `POST
    /recommendations/{id}/approve` endpoint, confirmed a fresh `TREATMENTS`
    row was written (`FP-001`, `antibiotic_treatment`, `administered_at` =
    just now) alongside the original July 18 row. Then deleted both the
    test recommendation and the newly-inserted test `TREATMENTS` row
    (same precedent as Session 012's stray-test-row cleanup) to restore
    the exact original demo state -- leaving a second, more-recent
    antibiotic treatment in place would have pushed the "safe to harvest"
    date past the Aug 1 the demo is built around. **feat-044 -> passing.**
  - Noted, not acted on: `~/.snowflake/connections.toml` now exists (the
    CoCo connection wizard succeeded this session) but has loose file
    permissions (`snowflake.connector` warns "Bad owner or permissions on
    ...connections.toml" on every connection) -- cosmetic, not blocking,
    outside this repo's scope to fix (it's a file in the user's home
    directory, not the repo), but worth a `chmod 0600` at some point.
  - Killed the `uvicorn` background process after verification; port 8000
    confirmed clear.
  - **Also fixed (found running `./init.sh` as the standard verification
    entrypoint before committing):** `init.sh` hardcoded a bare `python`
    for the `compileall` step; this machine (macOS) only has
    `python3`/`python3.12` on PATH, no plain `python` alias, so the
    harness's own primary verification entrypoint failed outright with
    "command not found: python" -- a pre-existing Windows-vs-Mac
    portability gap (the script's venv-detection branch below it already
    checks for both `venv/Scripts/python.exe` and `venv/bin/python`, but
    the `compileall` line never got the same treatment). Fixed by
    detecting `python` vs `python3` on PATH the same way, falling back
    cleanly, and erroring explicitly if neither exists. Re-ran `./init.sh`
    end to end after the fix: compileall clean, 89/89 pytest, e2e suite
    correctly skipped (backend not running at the time).
  - `feature_list.json` is now fully `passing` -- no `not_started`/
    `in_progress`/`blocked` features remain in the active list.
- **Session 030 (2026-07-24): implemented feat-043 and feat-044 application
  code.** Both features' CoCo prompts (Parts 6 and 7) had already been run
  and verified in Session 029. This session implemented the remaining backend
  + frontend application code:

  **feat-043 (inventory/stock-aware recommendations):**
  - `recommendation_parser.py`: added `Stock Availability` to `_LINE_RE` and
    `_LABEL_TO_KEY`; kept `_REQUIRED_KEYS` explicit (without `stock_availability`)
    for backward compat with older rows; added normalization to
    `in_stock`/`low_stock`/`out_of_stock` or None.
  - `schemas.py`: added `StockAvailability` type alias + optional
    `stock_availability` field on `Recommendation`.
  - `main.py`: `_recommendation_from_row` now includes `stock_availability`;
    `/workflow/run`'s RECOMMENDATIONS INSERT now writes `stock_availability`.
  - `frontend/lib/types.ts`: added `StockAvailability` type + optional field
    on `Recommendation` interface.
  - `frontend/lib/api.ts`: `BackendRecommendation` includes `stock_availability`;
    `mapRecommendation` maps it through.
  - `frontend/components/RecommendationCard.tsx`: new `StockBadge` component;
    `low_stock`/`out_of_stock` shown alongside priority badge (always visible),
    `in_stock` shown only in expanded detail section.
  - `tests/test_recommendation_parser.py`: 5 new `TestStockAvailabilityField`
    cases (low_stock, out_of_stock, in_stock, missing field backward-compat,
    unrecognized value -> None). 88/88 tests pass.

  **feat-044 (regulatory/withdrawal-period compliance check):**
  - `main.py`: new `_maybe_log_treatment` helper; `approve_recommendation`
    calls it after status update. Queries WITHDRAWAL_RULES joined to
    FARM_ASSETS to get treatments applicable to the approved recommendation's
    asset_type (withdrawal_days > 0 only), matches against the recommendation
    text, inserts a TREATMENTS row on match. One treatment logged per
    approval (first match wins).

  **Verification:** `python3 -m compileall app` clean; `venv/bin/python -m
  pytest tests -q` 88/88 pass; `node_modules/.bin/tsc --noEmit` clean;
  `npm run lint` clean; `npm run build` clean (all 5 routes compiled).
  Live end-to-end verification (live Snowflake account) not run this session
  -- both features require that to move to `passing` per their verification
  criteria.
- **Session 029 (continued, 2026-07-24): drafted CoCo prompts for feat-043
  and feat-044.** User asked to draft prompts for the two still-`not_started`
  features now that feat-048/052/053 are resolved. Added `snowflake/
  coco-prompts.md` Part 6 (feat-043, inventory/stock-aware recommendations --
  new `INVENTORY` table seeded with a deliberate story tied to FP-001's
  ongoing crisis: `antibiotic_dose` at 0 units, `aerator_unit` near its
  reorder threshold, everything else well-stocked; a new 7th bolded
  `**Stock Availability**` recommendation field) and Part 7 (feat-044,
  withdrawal-period compliance -- new `WITHDRAWAL_RULES` + `TREATMENTS`
  tables, pre-seeded with one real active withdrawal scenario -- a recent
  antibiotic treatment on FP-001 -- so the compliance warning is immediately
  live-demoable without needing the approve-flow write-through built first).
  Both are purely additive (no existing table touched). Neither prompt has
  been run -- `feat-043`/`feat-044` remain `not_started` in
  `feature_list.json`, now pointing at Part 6/Part 7 respectively. No
  application code changed this entry (drafting only).
- **Session 029 (2026-07-24): implemented feat-048 (Greenhouse asset) end to
  end; discovered and root-caused a live-breaking regression in
  FARM_OPS_AGENT that also blocks feat-052/feat-053 from being marked
  passing.** User asked to check `snowflake/coco-prompts.md` and implement
  whatever `not_started` features were now unblocked. Parts 3 and 4's CoCo
  prompts (`feat-048`, `feat-052`, `feat-053`) had all been run and verified
  by the user/CoCo already -- this session implemented the application code
  for `feat-048` (the only one needing any) and attempted live re-verification
  of all three.
  - **feat-048 (Greenhouse):** Backend -- `schemas.py` (AssetType +
    `co2_ppm`), `asset_simulator.py` (a full `greenhouse` entry in
    `_NUMERIC_METRICS`/`_DEFAULT_SEEDS`, `co2_ppm` in `ALL_READING_FIELDS`,
    greenhouse added to the growth-stage/irrigation-status asset-type lists),
    `risk_engine.py` (a greenhouse branch: co2<400=stress,
    humidity>80%+disease>20%=medium, disease>40%=critical, plus a
    `co2_depletion` trend metric). Added 16 new pytest cases mirroring this
    repo's existing per-type test pattern -- 83/83 backend tests pass.
    Frontend -- `lib/types.ts` AssetType, new `GreenhouseMarker.tsx` (SVG
    frame + real-growth_stage-driven plant rows, same pattern as
    `RiceFieldMarker`), wired into `MarkerFrame.tsx`, `DigitalTwinMap.tsx`,
    `AssetDetailPanel.tsx`, and `lib/api.ts`'s `READING_FIELDS_BY_TYPE` +
    tone rules. `tsc`/`lint`/`build` all clean.
  - **Bug found + fixed (pre-existing, not introduced by feat-048):**
    `GET /assets/{id}`'s `AssetOverview` never populated
    `growth_stage`/`irrigation_status`/`harvest_readiness_pct` (always null),
    unlike `GET /assets` (list) which does -- silently defaulting every
    per-type marker glyph on the Asset Detail page to a mid-scale look
    instead of the real value. Fixed in `main.py`'s `get_asset_detail()` by
    sourcing those 3 fields from the already-fetched `latest_reading`.
  - **Live-verified (real backend + live Snowflake account):**
    `GET /assets/GH-001` and `GET /assets` both return the real seeded
    compound-stress data (co2_ppm=260, humidity_pct=90, disease_risk_pct=34,
    risk_level=medium, status=needs_attention); Playwright confirmed the 5th
    marker's real aria-label ("Greenhouse A, greenhouse, needs attention"),
    the map's Asset Status pill ("Critical 1 / Attention 1 / Healthy 3"), and
    the Asset Detail readings panel rendering all 7 real values verbatim
    (including "CO₂ 260 ppm"), zero console errors.
  - **Live-breaking regression discovered (not feat-048's fault):** a real
    `POST /workflow/run` tick failed with a 500 -- every call to
    `FARM_OPS_AGENT` now 400s with `{"code":"399504","message":"The field
    \"search_service\" is not provided for Cortex Search tool resource"}`,
    **before the agent even runs**, for every asset and every question, not
    just greenhouse-related ones. Root-caused via `DESCRIBE AGENT
    CLIMATE_AG_COPILOT.OPS.FARM_OPS_AGENT`: `feat-053`'s CoCo prompt (Part 4
    prompt 3, already run) created the `search_agronomy` tool's
    `tool_resources` using the field name `cortex_search_service`, but the
    real Cortex Agents Run REST API
    (https://docs.snowflake.com/en/user-guide/snowflake-cortex/cortex-agents-run)
    expects `search_service`. Confirmed via 5 direct live request variants
    (no `tool_resources`; `search_service` nested/flat; `cortex_search_service`
    nested; a full mirror of the agent's own registered defaults) that this
    is **not** fixable from the REST client -- all 5 produced the identical
    error, meaning the platform validates the agent's own broken persisted
    default before ever inspecting what the caller sent. This means
    `feat-053`'s own CoCo-reported verification (querying the tools through
    Snowsight/CoCo's interface) never actually exercised this app's real
    integration path, so its "both tools work side by side" result didn't
    catch this. Updated `cortex_agent_client.py` to send the textbook-correct
    `search_service` field regardless (ready the moment the agent is fixed)
    and drafted the corrective CoCo prompt as `snowflake/coco-prompts.md`
    Part 5 (field-name fix only, nothing else touched).
  - **Result:** `feat-048` moved to `blocked` (all code implemented and
    live-verified except the one step this regression blocks -- a real
    Cortex Agent recommendation for GH-001). `feat-052` and `feat-053` moved
    from `not_started` to `blocked` as well: their CoCo prompts *did* run
    successfully and their own recorded verification is real, but neither
    can be independently re-verified through this app's actual REST
    integration right now, and `feat-053` specifically is the one that broke
    it. All three unblock together once `snowflake/coco-prompts.md` Part 5
    is run.
  - Killed all background uvicorn/next-dev/playwright processes after
    verification. Note: cleanup used `taskkill //F //IM node.exe`, which
    stops *all* Node processes system-wide, not just this session's dev
    servers -- worth knowing if anything else Node-based was expected to
    keep running.
- **Session 029 (continued, 2026-07-24): user ran Part 5, unblocking all
  three -- re-verified live and moved `feat-048`/`feat-052`/`feat-053` to
  `passing`.** The user reported CoCo's own Part 5 verification attempt
  hit two dead ends unrelated to the actual DDL fix: an org-account URL/auth
  mismatch on a raw `curl.exe` test (`390142` then `401`), then CoCo's own
  request rate limit ("reset in 5 hours"). Since Part 5's actual `ALTER
  AGENT` change had already landed and was confirmed in `coco-prompts.md`
  (`cortex_search_service` -> `search_service`), re-verified independently
  from this repo's own backend instead of waiting on CoCo or its rate limit:
  - Direct `ask_agent()` call: real response, no 400, citing GH-001's real
    live CO2/humidity/disease values.
  - Live `POST /workflow/run`: 200 OK (was 500). 6 real recommendations for
    FP-001, 3 for GH-001, every one correctly `[Live Data]`/`[Best Practice]`
    tagged and narration-free. `GET /assets/GH-001` immediately after showed
    `latest_risk.notes` exactly matching `risk_engine.py`'s new greenhouse
    format string with a fresh timestamp and fresh simulated values --
    confirms `feat-048`'s simulator/risk_engine code, not just old seed
    data, actually ran end-to-end against the live account.
  - Live `GET /briefing/today`: clean real answer, zero narration leak
    (`feat-052` holds).
  - Live `POST /copilot/ask` ("best way to prevent disease in my chickens"):
    real answer grounded in both tools side by side -- `[Live Data]` cited
    CC-001's actual current readings, `[Best Practice]` cited real
    `AGRONOMY_NOTES` content (footbaths at 1%/2% concentrations, Newcastle/
    infectious-bronchitis vaccination) -- proves `feat-053`'s search tool
    works through this app's real REST integration, not just CoCo's own
    interface (which is all its original verification had tested).
  - Filled in Part 5's `coco-prompts.md` verification "Result" with this
    transcript (documenting both CoCo's dead-end and the actual independent
    verification, since CoCo's own attempt never completed). Moved
    `feat-048`, `feat-052`, `feat-053` to `passing` in `feature_list.json`
    with full evidence. `feature_list.json` is back to fully `passing`
    except `feat-043`/`feat-044`, which still have no CoCo prompt drafted.
- **Session 028 (2026-07-19): built the automated test suites, a demo-reset
  script, and drafted CoCo prompts for 2 blocked "strengthen the project"
  items (`feat-049` through `feat-053`).** From a "what should we do to
  strengthen the project" discussion, the user asked to automate down a
  5-item prioritized list. Items #2/#3/#4 from that list (inventory-aware
  recommendations, regulatory withdrawal checks, root-causing the
  narration-leak whack-a-mole via agent instructions, and a second Cortex
  Search Agent Skill) all require Snowflake/Cortex objects only the user
  can create via CoCo (per `CLAUDE.md`) -- drafted those as new CoCo
  prompts (`snowflake/coco-prompts.md` Part 4) and new blocked
  `not_started` features (`feat-052`, `feat-053`; `feat-043`/`feat-044`
  were already queued from an earlier session) rather than attempting them.
  Fully implemented the 2 unblocked items:
  - `feat-049` (backend pytest suite): `backend/tests/` -- 67 tests across
    `test_risk_engine.py`, `test_recommendation_parser.py`,
    `test_asset_simulator.py` (seeded-RNG), and `test_clean_agent_answer.py`
    (a committed regression suite reconstructing every narration-leak shape
    from Sessions 011-014/`feat-040`/`feat-042`, previously only ever
    tested ad hoc). All 67 pass. Wired into `init.sh` (auto-skips
    gracefully if `backend/venv` doesn't exist).
  - `feat-050` (frontend Playwright e2e suite): `frontend/tests/e2e/` --
    7 tests (`map.spec.ts`, `tasks-due-today.spec.ts`, `asset-detail.spec.ts`)
    verifying the golden path against the real live backend + Snowflake
    account, each fetching ground truth via the API rather than hardcoding
    values. All 7 pass. Wired into `init.sh` (skips gracefully if
    `frontend/node_modules` is missing or the backend isn't reachable at
    `:8000`). Deliberately excluded an approve/reject test -- see
    `feat-050`'s notes for why (it would mutate live demo data on every
    automated run).
  - `feat-051` (`scripts/reset_demo_state.py`): restores every `fish_pond`
    asset to a fresh critical-DO reading + risk row, and clears only
    `pending_approval` `RECOMMENDATIONS` (never touches decided history).
    Verified via `--dry-run` against the real account only (found FP-001,
    correctly counted 12 real pending recommendations) -- the real
    destructive write path was deliberately not exercised this session, to
    avoid mutating live demo data without being explicitly asked to. Not
    wired into `init.sh` (opt-in admin tool, not routine verification).
  - Ran the full `./init.sh` chain end-to-end (compileall + 67 backend
    pytest + 7 frontend e2e) in one pass, all green.
- **Session 027 (2026-07-19): scoped `feat-048` -- add Greenhouse (vegetables)
  as a 5th real Farm Asset type -- in response to the user asking to "add
  more assets to make the project more amazing and engaging."** Planning
  only, no code changed. Used `AskUserQuestion` twice rather than guessing,
  since this was a genuinely ambiguous, high-blast-radius request: first,
  whether "assets" meant a new real Snowflake-backed asset type vs. more
  decorative scenery (feat-032 already covers the latter) -- user chose a
  new real asset type; second, which asset type -- user chose Greenhouse
  over Beehives/Dairy barn. Read `asset_simulator.py`, `risk_engine.py`,
  and the frontend's asset-type-keyed maps (`lib/types.ts`,
  `DigitalTwinMap.tsx`, `AssetDetailPanel.tsx`, `MarkerFrame.tsx`/marker
  components) to ground the design in the real per-type extension points
  rather than inventing a shape from scratch. Design: reuses most of
  `ASSET_READINGS`' existing columns (air_temp_c, humidity_pct,
  soil_moisture_pct, growth_stage, disease_risk_pct, harvest_readiness_pct,
  irrigation_status) and adds exactly one new column, `co2_ppm`, since CO2
  is a real, distinct greenhouse signal none of the other 4 types track.
  Seed data (drafted as a new, non-destructive Part 3 in
  `snowflake/coco-prompts.md` -- `ALTER TABLE ... ADD COLUMN` + `INSERT`s
  only, unlike Part 2's prompt 1 which dropped tables) gives the greenhouse
  a compound-risk story (reduced ventilation -> humidity climbs and
  co2_ppm depletes simultaneously -> disease risk climbs) landing it at
  `needs_attention` severity specifically -- deliberately chosen because no
  asset in the current live data has ever reached that state, so this will
  be the first time `feat-034`'s amber warning-triangle badge is exercised
  against real data rather than only verified statically against the
  compiled bundle. Added `feat-048` to `feature_list.json` (`not_started`,
  full backend+frontend extension points enumerated in its description)
  and the Part 3 CoCo prompt draft. Same blocking pattern as
  `feat-043`/`feat-044`: needs the user to run the CoCo prompt
  interactively before backend work can start, per `CLAUDE.md`.
- **Session 026 (2026-07-19), continued: Asset Detail cleanup (`feat-047`)
  -- removed the duplicate "Today's Tasks" card, collapsed History behind a
  header toggle.** Reading `lib/api.ts:392-397` confirmed `AssetDetail.tasks`
  was built from the exact same `/assets/{id}/recommendations` call as the
  `Recommendations` section right above it (label-only, `done` hardcoded
  `false`) -- a strict subset, not a distinct view, so it was removed
  outright rather than merged. `AssetDetailPanel.tsx`'s header `Card` now
  has a small "History" toggle button (reusing `RecommendationCard`'s
  existing `feat-036` expand/collapse pattern) that reveals the history
  timeline inline, collapsed by default; the old standalone always-visible
  History card is gone. Live Playwright: no "Today's Tasks" text, exactly 1
  History button, page text grows on expand (real Q4-2024 DO-crash history
  revealed) and shrinks back on collapse, zero console errors.
- **Session 026 (2026-07-19), continued: added click-to-navigate on Tasks
  Due Today rows (`feat-046`).** The user revisited `feat-045`'s deliberate
  "hover-only, no click" call and asked for direct click-through after all.
  `DashboardPanel.tsx`'s task rows with a real `asset_id` now render inside
  a real `<button>` (`onClick` -> `onSelectAsset`, keeping the existing
  hover-highlight handlers); rows with no `asset_id` stay a plain `<li>`.
  Live Playwright: clicking the first task row navigated
  `/` -> `/assets/FP-001` and the detail panel rendered the real asset name
  ("Tilapia Pond A"), zero console errors. `feat-045`'s own evidence trail
  was left as-is (correct at the time) with a forward-pointer note, rather
  than rewritten.
- **Session 026 (2026-07-19): consolidated Farm Overview and added the map's
  Asset Status pill (`feat-045`).** Per a user design discussion, replaced
  `DigitalTwinMap.tsx`'s static bottom-left color-key legend with a
  bottom-center pill showing real live per-status asset counts (computed
  client-side from the already-fetched assets list, no new API call), which
  also let `DashboardPanel.tsx` drop its now-redundant "Asset Status" card.
  Removed "Active Alerts" (duplicated by the map's own marker rings/badges)
  and "Daily Recommendations" (duplicated by each asset's own detail view)
  from Farm Overview entirely. Kept "Tasks Due Today" -- reasoned it's
  meaningfully different from Daily Recommendations (a lightweight one-line
  checklist vs. full Reason/Evidence/Confidence cards) and matches the
  user's explicit "general information, not too specific" bar for Overview
  -- and gave it the full-width row freed up by the Asset Status move. Wired
  hover-only (not click, since clicking the map marker directly already
  opens asset detail) on each task row to the existing `onHoverAsset`
  highlight callback via `Task.asset_id`, preserving the sidebar-to-map
  visual connection `feat-035` established, now that its two other sources
  (Active Alerts, Recommendations) are gone.
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
- **`feat-039` through `feat-042` (v0 frontend swap, briefing overview
  redesign, two narration-leak fixes) and `feat-045` (Farm Overview
  consolidation) are all `passing`** as of Session 026 (2026-07-19).
- `feat-043` (inventory/stock-aware recommendations) and `feat-044`
  (regulatory withdrawal-period compliance check) are queued in
  `feature_list.json`, both `not_started` — real-world-relevance additions
  scoped from a 2026-07-19 discussion on strengthening the hackathon's
  "Agent Skills" and "guardrails" judging bullets. Both are blocked on a
  new CoCo prompt (Snowflake schema: `INVENTORY` for feat-043,
  `WITHDRAWAL_RULES`/`TREATMENTS` for feat-044) that only the user can run
  interactively, per `CLAUDE.md`. Neither has a drafted CoCo prompt yet.
- **`feat-048`/`feat-052`/`feat-053` are all `passing` as of Session 029
  (2026-07-24)**, resolving a live-breaking regression discovered mid-session:
  `FARM_OPS_AGENT`'s `search_agronomy` tool had a wrong `tool_resources`
  field name (introduced by `feat-053`'s own CoCo prompt), making every call
  to the agent 400 before it ran, for every asset/question. Root-caused,
  fixed via `snowflake/coco-prompts.md` Part 5 (run by the user), and
  re-verified live end to end (`/workflow/run`, `/briefing/today`,
  `/copilot/ask` all confirmed working through this app's real REST
  integration) — see the Session 029 entries above for full detail.
- **`feat-043` and `feat-044` reached `passing` in Session 031 (2026-07-24)**
  after live end-to-end verification against the real Snowflake account
  (see Session 031 entry above for full detail) — `feature_list.json` is
  now fully `passing`, no `not_started`/`in_progress`/`blocked` features
  remain.
- Blockers: none currently known.
- Recommended Next Step: no queued feature work remains in
  `feature_list.json` — next session should either scope new work with the
  user or do a general health/regression pass (e.g. re-run `./init.sh` end
  to end) before picking a new direction.

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
