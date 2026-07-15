# Milestone Archive

Add one of these blocks to `progress.md` under the Session Log section each
time a milestone is closed. Keep archives in reverse chronological order
(newest at top).

---

## Format

```markdown
---
### Milestone: [name] — CLOSED [YYYY-MM-DD]

**Features shipped:**
- [feat-id]: [feature name] — passing
- [feat-id]: [feature name] — passing

**Features deferred:**
- [feat-id]: [feature name] — reason for deferral

**Final verification:** `./init.sh` passed [YYYY-MM-DD HH:MM]

**Deployed:** Yes — [version/environment] / No — [reason]

**Quality snapshot:** `quality-document.md` updated [YYYY-MM-DD]

**Known gaps carried into next milestone:**
- [gap or limitation noted at close]

**Next milestone starts with:**
- First feature: [feat-id] — [feature name]
---
```

---

## Example

```markdown
---
### Milestone: v0.2.0 Core Messaging — CLOSED 2026-06-26

**Features shipped:**
- feat-001: Create new conversation — passing
- feat-002: Send message in conversation — passing
- feat-003: Persist conversation list — passing

**Features deferred:**
- feat-004: Message search — scope too large, moved to v0.3.0

**Final verification:** `./init.sh` passed 2026-06-26 14:32

**Deployed:** Yes — v0.2.0 to production

**Quality snapshot:** `quality-document.md` updated 2026-06-26

**Known gaps carried into next milestone:**
- Search is not yet implemented
- Attachment support not started

**Next milestone starts with:**
- First feature: feat-005 — Message search (basic)
---
```

---

## Where to put it in `progress.md`

Add the archive block directly below the "## Session Log" heading, above any
individual session entries. This keeps the milestone view at the top and the
session-level detail below it.

## Resetting `feature_list.json` after archiving

After adding the milestone archive to `progress.md`:

1. Copy completed features into an `"archived"` array at the bottom of `feature_list.json`
2. Remove them from the `"features"` array
3. Update `"last_updated"` to today
4. Add the first features for the next milestone to `"features"` as `not_started`
