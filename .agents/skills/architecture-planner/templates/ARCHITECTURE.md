# Architecture

This document is the durable record of technical decisions for this project.
Agents must read it before implementing any feature that touches more than one
module. It does not describe implementation details — it describes the structure
that implementations must respect.

---

## Tech Stack

| Layer | Choice | Version / Notes |
|-------|--------|----------------|
| Language | | |
| Runtime | | |
| Framework | | |
| Database / Storage | | |
| Build tool | | |
| Package manager | | |
| Test framework | | |
| Deployment target | | |

---

## Folder Structure

```
[project root]/
├── [folder]   — [one-line purpose]
├── [folder]   — [one-line purpose]
│   ├── [subfolder]   — [one-line purpose]
│   └── [subfolder]   — [one-line purpose]
└── [folder]   — [one-line purpose]
```

Rules:
- New files must be placed in the folder that matches their purpose
- Do not create new top-level folders without updating this document

---

## Component Boundaries

### Modules

| Module | Responsibility | Entry point |
|--------|---------------|-------------|
| | | |
| | | |

### Allowed dependencies

```
[Module A] → [Module B]   (A may call B)
[Module B] → [Module C]   (B may call C)
```

### Forbidden dependencies

```
[Module C] ✗→ [Module A]  (C must not import A)
[UI layer] ✗→ [DB layer]  (UI must not call DB directly)
```

---

## Data Model

### Entities

| Entity | Description | Source of truth |
|--------|-------------|----------------|
| | | |
| | | |

### Key relationships

```
[Entity A] has many [Entity B]
[Entity B] belongs to [Entity A]
```

---

## Invariants

These rules must not be violated regardless of feature pressure. Any change
that would require violating an invariant requires an explicit architecture
decision (add a row to the Decisions table below first).

1. **[Invariant]** — [reason this matters]
2. **[Invariant]** — [reason this matters]
3. **[Invariant]** — [reason this matters]

---

## Decisions

Record every significant architectural decision here. Include decisions that
were rejected and why — future sessions need to know what was considered.

| Decision | Options considered | Chosen | Reason | Date |
|----------|--------------------|--------|--------|------|
| | | | | |
| | | | | |

---

## How to Use This Document

- **Before implementing a feature:** check the folder structure and module
  boundaries to understand where new code belongs
- **During code review:** verify the changes respect the invariants and
  allowed dependencies
- **When an invariant must change:** add a row to the Decisions table first,
  then update the invariant — do not silently violate it
