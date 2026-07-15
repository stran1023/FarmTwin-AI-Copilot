# milestone-closer

## Gap it fills

When all features in a batch reach `passing`, there is no structured path from
"done" to "shipped." Agents either stop with no output or dive into unplanned
refactoring. A milestone closer prevents both.

## What it produces

- A `CHANGELOG.md` entry for this milestone
- Updated `quality-document.md` grades for each domain touched
- A completed deployment checklist
- An archived session log in `progress.md`
- A clean `feature_list.json` ready for the next milestone

## When to use

When a defined set of features all reach `passing` and the project is ready to
ship or move to the next phase.

## Core workflow

```
1. Confirm all milestone features are at status: passing
   - Any feature still in_progress or blocked stops this process

2. Run full verification one final time
   - ./init.sh must pass cleanly before proceeding

3. Write the CHANGELOG entry:
   - What features shipped? (list by name, not id)
   - What user-visible behavior changed?
   - What known limitations remain?

4. Update quality-document.md:
   - Grade each product domain touched this milestone (A / B / C / D)
   - Record what improved
   - Record any new gaps introduced

5. Run deployment steps (project-specific — define these in init.sh or a deploy script)

6. Archive this milestone in progress.md:
   - Mark the milestone as closed with a date
   - Record the final verification result

7. Reset feature_list.json for the next milestone:
   - Move completed features into an "archived" array at the bottom
   - Set last_updated to today
   - Add placeholder features for the next phase

8. Commit with a version tag:
   git tag v<milestone> -m "<milestone name>"
   git commit -m "Close milestone: <name>"
```

## Checklist before closing

- [ ] All milestone features at `passing`
- [ ] `./init.sh` passes
- [ ] CHANGELOG entry written
- [ ] `quality-document.md` updated
- [ ] Deployment completed (or explicitly deferred with a note)
- [ ] `progress.md` milestone entry archived
- [ ] `feature_list.json` reset for next milestone
- [ ] Commit and tag created

## Templates needed

- `changelog-entry.md` — format for one CHANGELOG milestone entry
- `deployment-checklist.md` — steps between "all passing" and "live"
- `milestone-archive.md` — format for archiving a milestone in `progress.md`

## Related

- [code-reviewer](../code-reviewer/SKILL.md) — run before any feature reaches `passing`
- [docs-sync](../docs-sync/SKILL.md) — run immediately after milestone-closer
- [feature-planner](../feature-planner/SKILL.md) — use to plan the next milestone's features
- [index](../companion-skills/index.md)
