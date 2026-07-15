# Context Snapshot

Fill this out before starting a context reset. Copy the completed snapshot
into `progress.md` under the current session entry, then write a fresh
`session-handoff.md`. Commit both before opening a new session.

The snapshot must be complete enough that a cold reader — with no access to
this chat — can continue the work without any guesswork.

---

## Snapshot Info

- **Date and time:**
- **Session number:**
- **Reason for reset:** Session too long / Switching tasks / End of day / Context degraded

---

## Repository State

- **Working directory:** (output of `pwd`)
- **Last commit:** (output of `git log --oneline -1`)
- **Uncommitted changes:** (output of `git status --short`)
- **`./init.sh` status:** Pass / Fail

If `./init.sh` fails, do not reset — run `debug-session` first.

---

## Active Work

- **Current feature ID:**
- **Current feature name:**
- **Feature status:** in_progress / blocked
- **How far along:** (e.g., "backend done, frontend not started")

---

## What Is Verified

List only things confirmed working by `./init.sh` or manual verification
this session. Do not include things that "should work" but were not checked.

-
-
-

---

## What Is Broken or Unverified

List known failures, untested paths, and risky areas.

-
-
-

---

## Blockers

Anything preventing the next step from starting immediately.

-

---

## Exact Next Action

The single most important thing the next session must do first.
Be specific — not "continue the feature" but "implement the POST /messages
endpoint handler in src/routes/messages.ts".

**Next action:**

**Why this first:**

**What must not change while doing it:**

---

## Commands for Next Session

- **Startup:** `./init.sh`
- **Verification:**
- **Focused debug (if needed):**

---

## Commit Message for This Snapshot

```
git add progress.md session-handoff.md feature_list.json
git commit -m "Context reset: [feature-id] [brief state description]"
```
