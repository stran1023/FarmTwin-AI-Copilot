# docs-sync

## Gap it fills

Agents implement features but rarely update user-facing documentation. After
several milestones, the docs describe a product that no longer exists. New agents
reading the docs start with a false picture of the system.

## What it produces

- Updated documentation files that reflect what actually shipped
- A `docs-gap.md` listing features with no corresponding documentation

## When to use

- After each `milestone-closer` run, before the next milestone starts
- When a feature's `user_visible_behavior` changed from what is documented
- When onboarding a new agent to the project (use docs-gap as a checklist)

## Core workflow

```
1. List all features at status: passing in feature_list.json

2. For each feature:
   a. Read its user_visible_behavior field
   b. Search the docs directory for matching content
   c. If no documentation exists: add the feature to docs-gap.md
   d. If documentation exists but is outdated: update it

3. For each item in docs-gap.md:
   a. Write the minimum documentation that describes the behavior
   b. Remove the item from docs-gap.md once written

4. Run ./init.sh to confirm docs changes did not break any build step

5. Commit:
   git add docs/ docs-gap.md
   git commit -m "Sync docs with milestone: <name>"
```

## What counts as documentation

For each feature, the minimum documentation is one of:
- A section in a README that describes the behavior from a user's perspective
- An API reference entry if the feature exposes an API endpoint
- A usage example if the feature has a non-obvious interface

Do not document implementation details — document observable behavior.

## docs-gap.md format

```markdown
# Documentation Gaps

Features shipped but not yet documented:

| Feature ID | Name | user_visible_behavior | Priority |
|------------|------|-----------------------|----------|
| feat-001 | Feature name | What it does | high |

Last updated: YYYY-MM-DD
```

## Rules

- Do not skip docs-sync to ship faster — undocumented features become orphaned
- Write docs from the user's perspective, not the implementer's
- A doc that describes removed behavior is worse than no doc — delete it
- Keep docs in the same repo as code so they are versioned together

## Templates needed

- `docs-gap.md` — tracks documentation debt between milestones
- `api-reference-entry.md` — standard format for one API endpoint or feature

## Related

- [milestone-closer](../milestone-closer/SKILL.md) — run docs-sync immediately after milestone-closer
- [feature-planner](../feature-planner/SKILL.md) — user_visible_behavior is the source of truth for what to document
- [index](../companion-skills/index.md)
