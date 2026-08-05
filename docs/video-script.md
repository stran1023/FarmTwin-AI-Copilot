# Demo video script

Target runtime: ~4:30 (within the 3-5 minute hackathon limit). Record against
the deployed instance (Render backend + Vercel frontend), not local dev, so
the video matches what judges click through — see `progress.md` deploy notes
for why local/deployed behavior can otherwise diverge (passcode gate, CORS).

---

**[0:00–0:20] Hook — the problem**

*Screen: Farm Overview map, live — the farm opens healthy, green across the
board (the demo's default starting state, see `scripts/reset_demo_state.py`).*

VO: "Every reading on this farm looks fine right now — until it doesn't.
FarmTwin is an AI Copilot that runs a living digital twin of a mixed farm,
watching sensor data no human has time to check every hour, and telling you
exactly what to do the moment something crosses the line."

**[0:20–0:50] Built via Cortex Code CLI**

*Screen: terminal, CoCo CLI session (live or replayed from
`snowflake/coco-prompts.md`).*

VO: "Every Snowflake object powering this — 10+ tables, a semantic view, and a
Cortex Agent with two distinct tools — was built interactively through the
CoCo CLI." *(Quick cut showing `DESCRIBE AGENT FARM_OPS_AGENT` or the table
list.)*

**[0:50–1:15] Input**

*Screen: app, click "Run AI Farm Analysis" (passcode entered on camera or just
before, per the demo-gate flow — the same passcode also unlocks the Copilot
chat later, so it only needs entering once).*

VO: "One click kicks off the real workflow — no mock data, no scripted
output."

**[1:15–2:15] Processing**

*Screen: the live processing panel itself — sequential status lines ticking
off with checkmarks, a real percentage progress bar advancing, then the
per-asset list moving through real steps (Observing → Assessing → Consulting
the Cortex Agent) with real live metric values shown inline.*

VO walks the loop: "It fetches real weather from Open-Meteo, simulates the
next sensor reading, assesses risk against real thresholds, then hands the
facts — already computed — to `FARM_OPS_AGENT`, which grounds its answer in
two tools: live data via Cortex Analyst, and best-practice knowledge via
Cortex Search."

**[2:15–3:05] Output — the reveal**

*Screen: the moment the tick lands — the affected asset's marker glows on the
map, the farm health score shifts with a real delta, and the "Critical Farm
Changes Detected" banner appears naming exactly which asset needs attention.
Cut to that asset's recommendation card — Reason / Evidence / Priority /
Expected Impact / Confidence.*

VO: "And there it is — the farm just told us something changed, and exactly
which asset it is. Never a bare suggestion, either." *(click Approve)* "— a
human approves or rejects it, and that decision writes back to Snowflake in
real time."

**[3:05–4:00] Two more skills**

*Screen: asset detail page, Greenhouse or Fruit Orchard.*

Quick cuts: Harvest Planner ("ready in ~14 days"), Scenario Simulator (pick an
intervention, see the 24h projection), Yield Estimate.

VO: "The agent never does the math — every projection here is deterministic
Python, unit-tested, and the agent only explains it in plain language."

**[4:00–4:30] Close — free-form Copilot + wrap**

*Screen: `/copilot`, ask "What should I do today?"*

Show the grounded, farm-wide answer. *(If time allows: a quick natural
follow-up, e.g. "Why is that urgent?" — shows the conversation actually
remembers the previous answer, not just one-shot Q&A.)*

VO: "One agent, two tools, always a human in the loop. That's FarmTwin."
*(End card: architecture diagram, GitHub link.)*

---

## Recording checklist

- [ ] Deployment live (Render backend + Vercel frontend), not local dev
- [ ] `DEMO_PASSCODE` set and known ahead of recording (avoid fumbling on
   camera) — the same passcode unlocks both "Run AI Farm Analysis" and the
   Copilot chat, so enter it once, early, on whichever surface comes first
- [ ] Run `cd backend && venv/Scripts/python ../scripts/reset_demo_state.py`
   against the deployed Snowflake account before recording, so the farm opens
   on the clean healthy baseline this script's hook assumes
- [ ] Pre-warm the Render free instance before recording by hitting a real
   data endpoint (e.g. `GET /assets`), **not** `/health` — `/health` is a
   no-op that never touches Snowflake, so it only wakes the container, not
   the actual data path judges will exercise
- [ ] Do NOT pre-seed a crisis state — the healthy baseline is the intended
   "before." A live tick has a real (not scripted) chance of producing a
   genuine escalation; if the first click doesn't produce one, click "Run AI
   Farm Analysis" again — the Chicken Coop's feed level depletes every tick
   regardless of luck, so it's very likely within two clicks
- [ ] After recording: fill in `README.md`'s `<DEMO_URL>`/`<VIDEO_URL>`/
   `<DEVPOST_URL>` placeholders
