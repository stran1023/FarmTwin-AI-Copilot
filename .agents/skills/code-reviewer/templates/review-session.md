# Review Session

Fill this out after an agent session completes a feature and before moving
its status from `in_progress` to `passing`.

---

## Feature Under Review

- **Feature ID:**
- **Feature name:**
- **Review date:**
- **Reviewer:**
- **Sessions taken to implement:**

---

## Evidence Collected Before Scoring

Before scoring each category, collect the following:

- [ ] Read the feature's `verification` steps from `feature_list.json`
- [ ] Read the feature's `user_visible_behavior` field
- [ ] Run `./init.sh` and record the result
- [ ] Check `git diff` for what files were changed
- [ ] Check `progress.md` for this session's entry

---

## Rubric

Score each category 0–2:
- **2** — fully met with evidence
- **1** — partially met or met without clear evidence
- **0** — not met; this is a blocker

### Correctness

Does the implemented behavior match the feature's `user_visible_behavior`?

Steps run:

Observations:

**Score: /2**

---

### Verification

Did the agent actually run every step in the feature's `verification` array?
Is there evidence (command output, screenshots, log entries) recorded?

Steps run:

Evidence found in `progress.md` or `feature_list.json`:

**Score: /2**

---

### Scope Discipline

Did the agent modify only files within the expected scope of this feature?
Run `git diff --name-only` and list unexpected files.

Files changed:

Files outside expected scope (if any):

**Score: /2**

---

### Reliability

Does `./init.sh` pass cleanly with no workarounds, skipped checks, or
manually suppressed errors?

`./init.sh` result:

Any suppressed or skipped steps:

**Score: /2**

---

### Maintainability

Can a fresh agent session understand what was changed and why, using only
repo artifacts (code, comments, commit messages, progress.md)?
No chat history should be required.

Commit message quality:

`progress.md` entry quality:

Code legibility notes:

**Score: /2**

---

### Handoff Readiness

Is `progress.md` updated with the session entry? Is `feature_list.json`
updated with evidence? Could the next session start cleanly from `./init.sh`?

`progress.md` session entry: Present / Missing
`feature_list.json` evidence field: Filled / Empty
Next session startup: Clean / Requires manual repair

**Score: /2**

---

## Summary

| Category | Score |
|----------|-------|
| Correctness | /2 |
| Verification | /2 |
| Scope Discipline | /2 |
| Reliability | /2 |
| Maintainability | /2 |
| Handoff Readiness | /2 |
| **Total** | **/12** |

---

## Verdict

- [ ] **Accept** — total 10–12, no category scored 0
- [ ] **Revise** — total 7–9, or one category scored 0
- [ ] **Block** — total below 7, or any critical category scored 0

Any single category scored 0 is an automatic Block, regardless of the total.

---

## Required Fixes

*(Complete this section if Verdict is Revise or Block. Copy into `required-fixes.md`.)*

| # | Category | What failed | What must change |
|---|----------|-------------|-----------------|
| 1 | | | |
| 2 | | | |

**Re-review trigger:** Feature may not move to `passing` until these items are resolved and re-reviewed.
