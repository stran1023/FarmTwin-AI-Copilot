# Changelog Entry

Copy this block into `CHANGELOG.md` at the top of the file when closing a
milestone. Use plain language — write from the user's perspective, not the
implementer's.

---

## Format

```markdown
## [version or milestone name] — YYYY-MM-DD

### Added
- Feature name: what users can now do that they could not do before.
- Feature name: what users can now do.

### Changed
- What existing behavior changed and how (if any).

### Fixed
- What was broken in a previous milestone and is now resolved (if any).

### Known Limitations
- What does not work yet that users might expect to work.
- What was deferred to the next milestone.
```

---

## Example

```markdown
## v0.2.0 — 2026-06-26

### Added
- Conversations: users can create new conversations and see them in the sidebar.
- Messaging: users can send messages in an open conversation and see replies.
- Persistence: conversations and messages survive an app restart.

### Changed
- Sidebar: conversation list is now sorted by most recent activity.

### Fixed
- (none)

### Known Limitations
- Search across conversations is not yet implemented.
- Attachments are not supported in this milestone.
```

---

## Rules

- List features by their `name` field, not their `id`
- Write every bullet from the user's perspective ("users can now...")
- Do not mention implementation details, file names, or internal functions
- "Known Limitations" must include everything still at `not_started` or `blocked`
  that a user might reasonably expect to exist
- If nothing changed in a section, omit the section header entirely
