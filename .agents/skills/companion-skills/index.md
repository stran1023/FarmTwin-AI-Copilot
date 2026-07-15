# Companion Skills

The harness-creator handles infrastructure: the instruction file, feature tracker,
progress log, verification script, and session handoff. That is the scaffolding —
it does not fill in the content or run the work.

These companion skills fill the gaps across the full project lifecycle.

## What harness-creator covers

| Phase | Covered by harness-creator |
|-------|---------------------------|
| Project setup | `create-harness.mjs` scaffolds all five files |
| Session start | `CLAUDE.md`/`AGENTS.md` startup workflow |
| Verification | `init.sh` + verification commands |
| Feature tracking | `feature_list.json` with status and evidence |
| Session handoff | `progress.md` + `session-handoff.md` |
| Harness audit | `validate-harness.mjs` five-subsystem score |

## What it does not cover

| Gap | What goes wrong without it |
|-----|---------------------------|
| Decomposing a project idea into real features | Agent gets generic placeholders and guesses the rest |
| Reviewing agent output quality | Agent self-approves; real issues pass into `passing` |
| Unblocking a stuck or failing session | Agent spirals trying random fixes |
| Closing a milestone and preparing to ship | No path from "all features passing" to "deployed" |
| Managing context when sessions run long | State fragments; next session loses the thread |
| Designing the architecture before coding | Agent dives in without a structural plan |
| Keeping docs in sync with what shipped | Docs describe a product that no longer exists |

## Skills

| Priority | Skill | When to use |
|----------|-------|-------------|
| 1 | [feature-planner](../feature-planner/SKILL.md) | Before the first coding session |
| 2 | [code-reviewer](../code-reviewer/SKILL.md) | Before any feature moves to `passing` |
| 3 | [debug-session](../debug-session/SKILL.md) | When `./init.sh` fails or a feature is stuck |
| 4 | [milestone-closer](../milestone-closer/SKILL.md) | When all milestone features reach `passing` |
| 5 | [context-reset](../context-reset/SKILL.md) | When a session runs too long |
| 6 | [architecture-planner](../architecture-planner/SKILL.md) | Before coding on a complex project |
| 7 | [docs-sync](../docs-sync/SKILL.md) | After each milestone, before shipping |

Start with `feature-planner` and `code-reviewer`. Those two eliminate the most
common failure modes immediately.

## How these skills connect

```
architecture-planner
       ↓
  feature-planner  ←──────────────────────┐
       ↓                                   │
  harness-creator                          │ new milestone
       ↓                                   │
  [coding sessions]                        │
       ↓                                   │
  code-reviewer ──→ debug-session (if blocked)
       ↓
  milestone-closer
       ↓
  docs-sync
       ↓
  context-reset (between long sessions, at any point)
```
