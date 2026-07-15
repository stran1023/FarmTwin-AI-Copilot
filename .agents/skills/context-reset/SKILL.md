# context-reset

## Gap it fills

Long sessions accumulate stale tool outputs, repeated re-reads of the same files,
and abandoned reasoning chains. The context window fills with noise. The next
session inherits a bloated starting state and performs worse than a clean one.

## What it produces

- A compressed session summary written to `progress.md`
- A fresh `session-handoff.md` capturing only what matters
- A committed clean state the next session can start from safely

## When to use

- A session has been running a long time (many tool calls, long chat history)
- The agent is re-deriving things it already established earlier in the session
- The model starts giving inconsistent or contradictory answers
- You are about to switch to a different task and want to preserve state

## Core workflow

```
1. Stop all active work — do not start anything new

2. Write the current state to progress.md:
   - Last Updated: today's date
   - Current Objective: what you were working on
   - What is verified: what ./init.sh confirms as working
   - What is broken or unverified: known failures or untested paths
   - Blockers: anything preventing the next step
   - Recommended Next Step: the single most important action for the next session

3. Write a fresh session-handoff.md:
   - Verified Now: one paragraph on what is confirmed working
   - Next Session: the exact first action the next session should take
   - Commands: startup, verification, and any focused debug command

4. Update feature_list.json:
   - Set the in_progress feature status to reflect actual state
   - Add any new evidence discovered this session

5. Run ./init.sh — the repo must be in a passing state before closing
   - If it fails: fix the baseline before committing (see debug-session)

6. Commit everything:
   git add progress.md session-handoff.md feature_list.json
   git commit -m "Context reset: [current feature] [current status]"

7. Start a fresh session:
   - Open a new chat window or session
   - Read only: progress.md, session-handoff.md, feature_list.json
   - Do not load the old chat history
   - Run ./init.sh before doing anything else
```

## What to put in the session summary

The summary in `progress.md` must answer these five questions for a cold reader:

1. What is the working directory and how do you start the project?
2. What is verified and passing right now?
3. What is the current active feature?
4. What is the exact next action?
5. What is the biggest risk for the next session?

If you cannot answer all five from what you wrote, the summary is incomplete.

## Templates needed

- `context-snapshot.md` — compact format for capturing session state before reset
- Reuses `session-handoff.md` from `../templates/`

## Related

- [debug-session](../debug-session/SKILL.md) — if the baseline is broken, fix it before resetting
- [index](../companion-skills/index.md)
