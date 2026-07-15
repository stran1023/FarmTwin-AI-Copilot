# code-reviewer

## Gap it fills

Agents self-approve poorly. They identify issues then talk themselves into
accepting the work. The `evaluator-rubric.md` template exists in harness-creator
but there is no skill that drives the review process.

## What it produces

- A completed `evaluator-rubric.md` with scores and specific findings per category
- A verdict: Accept / Revise / Block
- A concrete list of required fixes before accepting

## When to use

After an agent session completes a feature. Before moving the feature status from
`in_progress` to `passing`. Never skip this for features that touch shared code.

## Core workflow

```
1. Load the feature's verification steps from feature_list.json
2. For each rubric category:
   a. Ask the specific question for that category (see table below)
   b. Score 0-2 based on observable evidence, not self-reported status
3. Flag any category scored 0 as a blocker — feature cannot move to passing
4. Output: filled evaluator-rubric.md + required-fixes list
```

## Six rubric categories

| Category | Key question | Score 0 means |
|----------|-------------|---------------|
| Correctness | Does the behavior match `user_visible_behavior`? | Feature does not work as described |
| Verification | Did the agent run every step in the `verification` array? | No evidence the steps were run |
| Scope discipline | Did the agent modify files outside the feature's scope? | Unrelated code was changed |
| Reliability | Does `./init.sh` pass cleanly with no workarounds? | Baseline is broken |
| Maintainability | Can a fresh session understand what was done from repo artifacts only? | Change is not legible without the chat |
| Handoff readiness | Is `progress.md` updated for the next session? | Next session cannot continue without this chat |

## Score interpretation

| Total (0–12) | Verdict |
|-------------|---------|
| 10–12 | Accept |
| 7–9 | Revise — fix flagged items and re-review |
| 0–6 | Block — do not accept; restart the feature |

Any single category scored 0 is a block regardless of the total.

## Templates needed

- `review-session.md` — structured prompt to run a review session
- `required-fixes.md` — format for the fix list handed back to the agent
- `evaluator-rubric.md` already in `../templates/` — copy into project, fill in

## Related

- [feature-planner](../feature-planner/SKILL.md) — defines what to review against
- [debug-session](../debug-session/SKILL.md) — use when review reveals a broken baseline
- [index](../companion-skills/index.md)
