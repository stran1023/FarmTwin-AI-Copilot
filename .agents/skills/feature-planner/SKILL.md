# feature-planner

## Gap it fills

harness-creator creates placeholder features. The hardest part of harness setup
is turning a vague project idea into a well-ordered `feature_list.json` with
right-sized scope, correct dependencies, and testable verification steps.

## What it produces

- A complete `feature_list.json` from a project description
- Features sized to fit one agent session (not too large, not too small)
- Explicit dependency ordering (nothing in `in_progress` before its dependencies `pass`)
- Verification steps written as observable user-facing actions, not code-level assertions

## When to use

At project start, before the first coding session. Also when a project grows and
new features need to be added without breaking the dependency order.

## Core workflow

```
1. User describes what the project should do
2. Skill decomposes into feature areas (auth, core, UI, data, etc.)
3. For each feature: write id, name, description, user_visible_behavior
4. Order by dependency — features with no dependencies come first
5. For each feature: write 3-5 manual verification steps
6. Output: feature_list.json ready to paste into the project
```

## Rules for good features

- One feature = one thing a user can observe working
- A feature that takes more than one session to implement is too large — split it
- Verification steps must be executable by a human with no special tools
- Dependencies must form a DAG — no cycles
- Every feature needs at least one verification step

## Templates needed

- `feature-breakdown-worksheet.md` — questions to answer before writing features
- `verification-step-patterns.md` — examples of good vs. bad verification steps

## Related

- [harness-creator SKILL.md](../harness-creator/SKILL.md) — the feature_list.json schema
- [code-reviewer](../code-reviewer/SKILL.md) — reviews features once implemented
- [index](../companion-skills/index.md)
