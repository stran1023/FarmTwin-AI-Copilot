# Required Fixes

This document is handed to the agent after a Revise or Block verdict.
It is the authoritative list of what must change before the feature can
move to `passing`. Do not modify this list during implementation — add a
new review session instead.

---

## Feature

- **Feature ID:**
- **Feature name:**
- **Review date:**
- **Verdict:** Revise / Block

---

## Fixes Required

| # | Category | What failed | What must change | How to verify the fix |
|---|----------|-------------|-----------------|----------------------|
| 1 | | | | |
| 2 | | | | |
| 3 | | | | |

---

## Constraints

These must remain unchanged during the fix session:

- Do not change the feature's `verification` steps
- Do not modify any file outside this feature's scope
- Do not mark the feature `passing` until a new review session is run

---

## Completion Gate

- [ ] All fixes in the table above are applied
- [ ] `./init.sh` passes
- [ ] Each fix verified using the "How to verify" column
- [ ] A new `review-session.md` is completed and returns Accept

**The feature must not move to `passing` until a new review session returns Accept.**
