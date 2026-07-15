# architecture-planner

## Gap it fills

Agents that start coding without a structural plan tend to create files in wrong
locations, build the wrong abstractions, and require expensive refactoring later.
Architecture decisions made only in chat are not durable — they vanish when the
session ends.

## What it produces

- `ARCHITECTURE.md` — tech stack, folder structure, component boundaries, data flow
- Key decisions recorded with the reason they were made
- A list of architectural constraints the agent must not violate during implementation

## When to use

Before the first feature is implemented, or when the project is large enough that
different features touch different subsystems. Skip for single-file scripts or
trivial utilities.

## Core workflow

```
1. Define the tech stack:
   - Language and version
   - Framework (if any)
   - Database or storage layer
   - Build tools and package manager

2. Define the folder and module structure:
   - Where do the main modules live?
   - What naming conventions apply?
   - What goes in root vs. src/ vs. lib/?

3. Define component boundaries:
   - What are the main modules or services?
   - What can call what? (draw the allowed dependency direction)
   - What is explicitly forbidden? (e.g., "UI layer must not import DB layer directly")

4. Define the data model at a high level:
   - What are the main entities?
   - What are their key fields and relationships?
   - Where is the source of truth for each entity?

5. List 3-5 architectural invariants:
   - Constraints that must never be violated regardless of feature pressure
   - Example: "All database writes go through the repository layer"
   - Example: "No business logic in route handlers"

6. Write ARCHITECTURE.md to the project root

7. Reference ARCHITECTURE.md from AGENTS.md or AGENTS.md:
   - Add to the startup workflow: "Read ARCHITECTURE.md before implementing a new feature"
```

## What makes a good architectural invariant

A good invariant is:
- Specific enough to check by reading the code
- Relevant to more than one feature
- Likely to be violated under time pressure without the rule

A bad invariant is a general principle ("write clean code") or a one-off rule
that only applies to one file.

## ARCHITECTURE.md structure

```markdown
# Architecture

## Tech Stack
- Language:
- Framework:
- Database:
- Build:

## Folder Structure
[tree of key directories with one-line purpose each]

## Component Boundaries
[diagram or table of allowed/forbidden dependencies]

## Data Model
[key entities and their relationships]

## Invariants
1. [rule — reason]
2. [rule — reason]
3. [rule — reason]

## Decisions
| Decision | Reason | Date |
|----------|--------|------|
| | | |
```

## Templates needed

- `ARCHITECTURE.md` — standard architecture document template (above structure)
- `architecture-constraints.md` — standalone invariant list for agents to check during review

## Related

- [feature-planner](../feature-planner/SKILL.md) — features should respect the architecture boundaries
- [code-reviewer](../code-reviewer/SKILL.md) — review checks scope discipline against architecture
- [index](../companion-skills/index.md)
