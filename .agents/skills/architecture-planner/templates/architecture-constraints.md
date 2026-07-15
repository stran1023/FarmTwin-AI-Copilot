# Architecture Constraints

A focused checklist of invariants for agents to check during implementation
and code review. Derived from `ARCHITECTURE.md` — update both files together.

---

## Invariants

These must not be violated. Check each one before marking a feature `passing`.

- [ ] **[Constraint]** — [brief reason]
- [ ] **[Constraint]** — [brief reason]
- [ ] **[Constraint]** — [brief reason]

---

## Allowed Import Directions

Only these dependency directions are permitted:

```
[Layer / Module] → [Layer / Module]
```

If a new import would go in the opposite direction, stop. Add an architecture
decision to `ARCHITECTURE.md` before proceeding.

---

## Protected Paths

Files and directories that must not be modified without an explicit architecture
decision recorded in `ARCHITECTURE.md`:

| Path | Protected because |
|------|------------------|
| | |
| | |

---

## File Placement Rules

New files must follow these rules:

| File type | Must go in |
|-----------|-----------|
| | |
| | |

---

## How to Use During Review

For each feature being reviewed, answer:

1. Did any new file land in the wrong folder?
2. Does any new import violate the allowed directions?
3. Was any protected path modified without a decision recorded?
4. Was any invariant violated?

If any answer is "yes," the feature cannot move to `passing` until the
violation is resolved or a decision is recorded in `ARCHITECTURE.md`.
