# Feature Breakdown Worksheet

Answer these questions before writing a single feature in `feature_list.json`.
A complete worksheet produces a feature list that is ordered, sized correctly,
and testable without ambiguity.

---

## 1. Project Overview

- **Project name:**
- **One-sentence purpose:** What does this do for the user?
- **Primary user:** Who uses it directly?
- **Deployment target:** Browser / desktop app / CLI / API / mobile?
- **Tech stack:** Language, framework, database (if known)?

---

## 2. Functional Areas

List the main domains of the project. Each area will produce one or more features.
Aim for 3–7 areas. If you have more than 7, some areas are probably the same thing.

| Area | Description |
|------|-------------|
| | |
| | |
| | |

---

## 3. Feature Breakdown (per area)

For each area, answer:

**Area name:**

- What is the smallest thing in this area that a user can observe working?
- What does the user see or do when it works correctly?
- What must already be working before this can be built? (dependencies)
- How long should one coding session need to implement it?
  - If more than one session: split it into two features

Repeat this block for each area.

---

## 4. Dependency Order

Draw the dependency DAG before numbering features. Features with no dependencies
come first. Features that depend on others come after.

```
[no dependencies]
  feat-001: ___________
  feat-002: ___________

[depends on feat-001]
  feat-003: ___________

[depends on feat-002 and feat-003]
  feat-004: ___________
```

Rules:
- No cycles — if A depends on B, B cannot depend on A
- A feature can only be `in_progress` after all its dependencies are `passing`
- Prefer short chains — long dependency chains delay the first working thing

---

## 5. Sizing Check

For each feature, confirm:

| Feature | Fits one session? | If no: split into |
|---------|------------------|-------------------|
| | Yes / No | |
| | Yes / No | |

A feature is too large if:
- It touches more than 2-3 files across different layers
- It requires both frontend and backend work in the same step
- It could have a partial state that is still useful

---

## 6. Verification Check

For each feature, draft the verification steps here before writing them into
`feature_list.json`. Each step must be:

- Something a human can do without reading source code
- Observable (you can see the result)
- Specific (pass/fail is unambiguous)

**Bad:** "The feature works correctly."
**Good:** "Open the app. Click New Chat. Verify a new empty conversation appears in the sidebar."

| Feature | Verification steps (draft) |
|---------|---------------------------|
| | 1. |
| | 2. |
| | 3. |

---

## 7. Output

Once this worksheet is complete, write `feature_list.json` using the template
from `harness-creator`. Each feature entry maps directly to one row in sections
3 and 6 above.
