# AGENTS.md

Climate-Adaptive Agriculture Copilot — FastAPI + Snowflake Cortex + Next.js,
built for the Snowflake CoCo CLI Hackathon 2026. See `README.md` for setup
and `docs/architecture.md` for what's real vs. stubbed in this build.

You are working in a repository designed for long-running implementation work.
Prioritize reliable completion, continuity across sessions, and explicit
verification over speed.

## Repo shape

- `backend/` — FastAPI app (`app/main.py`). Currently a stub: `/workflow/run`
  returns a hardcoded `DailyBriefing` — see the TODO comments in
  `backend/app/main.py`.
- `frontend/` — intentionally **not scaffolded** in version control (see
  `frontend/README.md`). Run `npx create-next-app` there before starting
  frontend work.
- `snowflake/` — tables, semantic view, and the `FARM_OPS_AGENT` Cortex Agent
  are built interactively via the CoCo CLI, not by this agent. Prompts live
  in `snowflake/coco-prompts.md`; check the "Result" line under each prompt
  to see what has actually been run against the real Snowflake account
  before assuming a table or agent exists.
- This repo is a git repository. Run `git status` and `git log --oneline -5`
  at session start to confirm current branch and recent history before
  relying on assumptions from prior sessions.

## Operating Loop

At the start of every session:

1. Run `pwd` and confirm you are in the expected repository root.
2. Read `progress.md`.
3. Read `feature_list.json`.
4. If `.git` exists, review recent commits with `git log --oneline -5`.
5. Run `./init.sh`.
6. Check whether the baseline smoke or end-to-end path is already broken.

Then select exactly one unfinished feature and work only on that feature until
you either verify it or document why it is blocked.

## Verification Commands

Run these before claiming any feature complete:

- `cd backend && python -m compileall app`

This is a **syntax-only** smoke check — it does not install dependencies or
verify imports/runtime behavior (no venv is assumed to exist). Before marking
a backend feature `passing`, also actually run it: `pip install -r
backend/requirements.txt` into a venv, then `uvicorn app.main:app --reload`
and hit the endpoint with `curl`. Update `init.sh` to include real tests once
any exist (there are none yet).

The primary verification entrypoint is `./init.sh`.

## Rules

- One feature at a time. Stay in scope.
- Do not claim completion without runnable evidence.
- Do not rewrite the feature list to hide unfinished work.
- Do not remove or weaken tests just to make the task look complete.
- Use repository artifacts as the system of record.

## Required Files

- `feature_list.json`
- `progress.md`
- `init.sh`
- `session-handoff.md` when a compact handoff is useful

## Completion Gate

A feature can move to `passing` only after the required verification succeeds
and the result is recorded.

## Before You Stop

1. Update the progress log.
2. Update the feature state.
3. Record what is still broken or unverified.
4. Commit once the repository is safe to resume.
5. Leave a clean restart path for the next session.
