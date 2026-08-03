# Demo video script

Target runtime: ~4:30 (within the 3-5 minute hackathon limit). Record against
the deployed instance (Render backend + Vercel frontend), not local dev, so
the video matches what judges click through — see `progress.md` deploy notes
for why local/deployed behavior can otherwise diverge (passcode gate, CORS).

---

**[0:00–0:20] Hook — the problem**

*Screen: Farm Overview map, live.*

VO: "A dissolved-oxygen reading of 2.0 mg/L means nothing to a farm manager —
unless something tells them it's below the crisis line, and what to do about
it tonight. FarmTwin is an AI Copilot that runs a living digital twin of a
mixed farm, so it does exactly that."

**[0:20–0:50] Built via Cortex Code CLI**

*Screen: terminal, CoCo CLI session (live or replayed from
`snowflake/coco-prompts.md`).*

VO: "Every Snowflake object powering this — 10 tables, a semantic view, and a
Cortex Agent with two distinct tools — was built interactively through the
CoCo CLI." *(Quick cut showing `DESCRIBE AGENT FARM_OPS_AGENT` or the table
list.)*

**[0:50–1:15] Input**

*Screen: app, click "Run Farm Tick" (passcode entered on camera or just
before, per the demo-gate flow).*

VO: "One trigger kicks off the real workflow — no mock data, no scripted
output."

**[1:15–2:15] Processing**

*Screen: split — sequence diagram or backend log tail, then Snowflake table
updating.*

VO walks the loop: "It fetches real weather from Open-Meteo, simulates the
next sensor reading, assesses risk against real thresholds, then hands the
facts — already computed — to `FARM_OPS_AGENT`, which grounds its answer in
two tools: live data via Cortex Analyst, and best-practice knowledge via
Cortex Search."

**[2:15–3:00] Output**

*Screen: recommendation card appears — Reason / Evidence / Priority /
Expected Impact / Confidence.*

VO: "Never a bare suggestion. A human approves or rejects it —" *(click
Approve)* "— and that decision writes back to Snowflake in real time."

**[3:00–4:00] Two more skills**

*Screen: asset detail page, Greenhouse or Fruit Orchard.*

Quick cuts: Harvest Planner ("ready in ~14 days"), Scenario Simulator (pick an
intervention, see the 24h projection), Yield Estimate.

VO: "The agent never does the math — every projection here is deterministic
Python, unit-tested, and the agent only explains it in plain language."

**[4:00–4:30] Close — free-form Copilot + wrap**

*Screen: `/copilot`, ask "What should I do today?"*

Show the grounded, farm-wide answer.

VO: "One agent, two tools, always a human in the loop. That's FarmTwin."
*(End card: architecture diagram, GitHub link.)*

---

## Recording checklist

- [ ] Deployment live (Render backend + Vercel frontend), not local dev
- [ ] `DEMO_PASSCODE` set and known ahead of recording (avoid fumbling on camera)
- [ ] Pre-warm the Render free instance before recording (hit `/health` once)
   so the first on-camera request isn't a 30-60s cold start
- [ ] Pick a moment where at least one asset is in a real non-healthy state
   (so the workflow tick produces a real recommendation, not a quiet no-op)
- [ ] After recording: fill in `README.md`'s `<DEMO_URL>`/`<VIDEO_URL>`/
   `<DEVPOST_URL>` placeholders
