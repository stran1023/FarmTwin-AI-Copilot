# Project Workflow

A concrete, step-by-step guide for applying the harness to any project — from first setup through long-running multi-session development.

---

## Phase 1 — Project Initialization (One Time)

Do this once when starting a new project or adopting the harness into an existing one.

### Step 1: Scaffold the harness

For Claude Code projects:

```bash
node skills/harness-creator/scripts/create-harness.mjs \
  --target /path/to/your/project \
  --agent-file CLAUDE.md
```

For Codex or generic agents:

```bash
node skills/harness-creator/scripts/create-harness.mjs \
  --target /path/to/your/project
```

This creates five files in your project root:

| File | Purpose |
|------|---------|
| `CLAUDE.md` or `AGENTS.md` | Agent operating rules — what to do, how to verify, when to stop |
| `feature_list.json` | Machine-readable list of features with status and verification steps |
| `progress.md` | Session log and single source of truth for current state |
| `session-handoff.md` | Compact end-of-session note for the next session |
| `init.sh` | Standard startup and verification script |

### Step 2: Customize the scaffold

Open each file and replace the placeholders with real project information.

**`CLAUDE.md` or `AGENTS.md`** — review the generated verification commands. If the script missed something (a lint step, a type-check, a custom test command), add it to the Verification Commands section now. Keep the file short.

**`feature_list.json`** — replace the three placeholder features with your actual features. For each one, fill in:
- `id` — short unique key, e.g. `auth-001`
- `name` — a short label
- `description` — one sentence on what it does
- `user_visible_behavior` — what the user sees when it works
- `verification` — exact steps to manually confirm it works
- `dependencies` — IDs of features that must pass first (can be `[]`)

**`progress.md`** — fill in the Current Verified State section: repo root, startup path, verification path. Leave session log blank for now.

**`init.sh`** — run it once to confirm it works end to end:

```bash
chmod +x init.sh
./init.sh
```

Fix any errors before moving on.

### Step 3: Make the baseline commit

```bash
git add CLAUDE.md feature_list.json progress.md session-handoff.md init.sh
git commit -m "Add agent harness scaffold"
```

This is the clean starting point every future session can return to.

### Step 4: Verify the harness score (optional)

```bash
node skills/harness-creator/scripts/validate-harness.mjs \
  --target /path/to/your/project
```

A score of 70+ means the harness has the structure agents need. Fix any FAIL items before starting feature work.

---

## Phase 2 — Session Start (Every Session)

Run this exact sequence at the beginning of every coding session, every time.

```
1. pwd                              → confirm you are in the right directory
2. Read progress.md                 → what is the current verified state?
3. Read feature_list.json           → what is unfinished? what is the priority order?
4. git log --oneline -5             → what changed most recently?
5. ./init.sh                        → run the standard startup and verification
```

**If `./init.sh` fails:** stop. Do not start new feature work on a broken baseline. Fix the failing check first, then continue.

**If `./init.sh` passes:** pick exactly one unfinished feature — the highest-priority one with all dependencies at `passing` — and work only on that feature.

---

## Phase 3 — During Work

### Rules

- **One feature at a time.** Do not start a second feature while the first is in progress. Change the selected feature's status to `in_progress` in `feature_list.json`.
- **Stay in scope.** If you hit a problem that requires touching another feature's code, document the blocker first. Fix the blocker narrowly, then return to the original feature.
- **Run verification often.** Do not wait until the end to find out something is broken. Run `./init.sh` after each meaningful change.
- **Do not self-declare done.** A feature is not done because the code was written. It is done when verification passes and evidence is recorded.

### When you finish implementing

Before claiming the feature is complete, run the full verification:

```bash
./init.sh
```

Then manually confirm each step in the feature's `verification` array in `feature_list.json`. Record what you did and what you observed in the `evidence` field.

---

## Phase 4 — Feature Completion Gate

A feature can move to `passing` only when all four are true:

- [ ] The target behavior is implemented
- [ ] `./init.sh` passes with no errors
- [ ] You ran the manual verification steps and they passed
- [ ] Evidence is recorded in `feature_list.json` or `progress.md`

Update `feature_list.json`:

```json
{
  "status": "passing",
  "evidence": [
    "Ran ./init.sh — all checks passed (2026-06-26)",
    "Manually verified: opened app, clicked New Chat, saw empty conversation"
  ]
}
```

---

## Phase 5 — Session End (Every Session)

Run this sequence before closing every session, even if the feature is not done.

### 1. Run verification one final time

```bash
./init.sh
```

The repo must be in a state where `./init.sh` passes when the next session opens.

### 2. Update `feature_list.json`

Set the correct status for the feature you worked on:

| Status | When to use |
|--------|-------------|
| `in_progress` | Work started but not complete — you will continue next session |
| `blocked` | Cannot continue until a specific external dependency is resolved |
| `passing` | Verification passed and evidence is recorded |

Only one feature should be `in_progress` at a time.

### 3. Update `progress.md`

Add a new session entry:

```markdown
### Session NNN

- Date: YYYY-MM-DD
- Goal: what you planned to do
- Completed: what actually got done
- Verification run: what commands ran and what they returned
- Evidence captured: what proof was recorded
- Commits: short commit SHAs or messages
- Files or artifacts updated: list key files changed
- Known risk or unresolved issue: anything that could break next session
- Next best step: exactly what the next session should do first
```

Also update the Current Verified State section at the top.

### 4. Fill in `session-handoff.md`

Use this when the session was long or touched several areas. Answer:

- What is verified and working right now?
- What verification command confirms it?
- What is the highest-priority next action?
- What must not be changed during that action?

### 5. Commit

```bash
git add feature_list.json progress.md session-handoff.md
git commit -m "Update harness state: [feature-id] [status]"
```

The commit message should make the state obvious at a glance.

---

## Phase 6 — Multi-Session Continuity

When returning to a project after a break:

1. Read `progress.md` → what was the last verified state?
2. Read `session-handoff.md` → what is the exact next step?
3. Run `./init.sh` → does the baseline still hold?
4. Check `feature_list.json` → is the `in_progress` feature still the right one to work on?

If the baseline is broken after a break, fix it before anything else. Do not guess why it broke — read the last session log in `progress.md` for the "Known risk" entry.

---

## Quick Reference

### Startup (every session)
```bash
pwd
# read progress.md
# read feature_list.json
git log --oneline -5
./init.sh
```

### Check feature status
```bash
node skills/harness-creator/scripts/validate-harness.mjs --target .
```

### Generate HTML report
```bash
node skills/harness-creator/scripts/render-assessment-html.mjs --target . --output harness-assessment.html
```

### Run benchmark
```bash
node skills/harness-creator/scripts/run-benchmark.mjs --target . --html harness-benchmark.html
```

### Feature status values
| Value | Meaning |
|-------|---------|
| `not_started` | Not touched |
| `in_progress` | Currently active (only one allowed at a time) |
| `blocked` | Waiting on a documented external blocker |
| `passing` | Verification passed, evidence recorded |

### Definition of Done checklist
- [ ] `./init.sh` passes
- [ ] Manual verification steps from `feature_list.json` completed
- [ ] Evidence recorded in `feature_list.json`
- [ ] `progress.md` updated
- [ ] `session-handoff.md` updated
- [ ] Committed in a clean state

---

## Common Failure Modes and Fixes

| What you observe | Root cause | Fix |
|-----------------|-----------|-----|
| New session spends time rediscovering setup | `progress.md` not updated last session | Read the last git commit message; update progress.md now |
| Agent starts multiple features at once | No one-feature rule enforced | Set all but one to `not_started` or `blocked`; update instructions |
| Agent claims done but tests fail | No verification gate | Run `./init.sh`; do not accept the feature until it passes |
| Next session can't continue without repairs | Session ended with `./init.sh` failing | Fix the baseline now before ending; never commit a broken state |
| Feature keeps getting reopened | Evidence was never recorded | Fill in the `evidence` field before setting status to `passing` |

See `references/method-map.md` for the full failure-mode-to-fix mapping.
