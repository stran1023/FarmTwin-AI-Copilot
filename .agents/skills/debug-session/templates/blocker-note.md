# Blocker Note

Use this when a feature cannot be resolved after three hypotheses, or when
an external dependency prevents progress. Copy the filled-out block into
the feature's `notes` field in `feature_list.json` and set `status` to
`"blocked"`.

---

## Format

```
BLOCKED [YYYY-MM-DD]: <one sentence describing what fails>

Hypotheses tried:
  1. <what was attempted> → <why it did not work>
  2. <what was attempted> → <why it did not work>
  3. <what was attempted> → <why it did not work>

Unresolved because: <the fundamental reason progress is stuck>

Needs: <what must happen externally before this can be unblocked>
  - Decision needed from: <person or team>
  - Information needed: <what is missing>
  - Dependency: <external system or feature that must exist first>

Last good state: <git SHA where ./init.sh last passed>
Debug log: debug-log.md (session dated YYYY-MM-DD)
```

---

## Example

```
BLOCKED [2026-06-26]: OAuth callback returns 400 after redirect from provider.

Hypotheses tried:
  1. Incorrect redirect URI in .env → updated to match provider settings, still 400
  2. Missing state parameter in request → added PKCE state, still 400
  3. Provider sandbox vs production mismatch → confirmed sandbox, same error

Unresolved because: provider dashboard shows correct config but error persists;
  suspect rate limiting or an account-level flag on the provider side.

Needs:
  - Information needed: provider support ticket response
  - Decision needed: whether to switch to a different OAuth library

Last good state: a3f92c1 (login page renders, OAuth not yet wired)
Debug log: debug-log.md (session dated 2026-06-26)
```

---

## Unblocking Checklist

When the external dependency is resolved, before resuming the feature:

- [ ] Update the blocker note with what resolved it
- [ ] Change feature status from `blocked` back to `in_progress`
- [ ] Run `./init.sh` to confirm the baseline is still clean
- [ ] Start a fresh debug-session if the original failure needs to be re-verified
