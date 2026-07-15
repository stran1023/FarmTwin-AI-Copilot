# Debug Log

Fill this out at the start of every debug session. Do not begin making changes
until sections 1 and 2 are complete — unrecorded debugging makes the problem
harder to isolate, not easier.

---

## Session Info

- **Date:**
- **Feature ID (if applicable):**
- **Triggered by:** Session start failure / Feature blocked / Regression

---

## 1. Failure Record

**Command that failed:**

```
(paste the exact command)
```

**Full error output:**

```
(paste the complete error — do not truncate)
```

**Last working commit:**

```
git log --oneline -5
(paste output here)
```

---

## 2. Isolation

Run these steps to determine whether the failure is new or pre-existing.

```bash
git stash
./init.sh
```

**Result after stash:**
- [ ] `./init.sh` passes → failure was introduced by current work
- [ ] `./init.sh` fails → failure pre-exists current work

**If the failure pre-exists current work:**
```bash
git log --oneline -10   # find the last commit where it worked
git bisect start        # optional: binary search for the breaking commit
```

Last commit where `./init.sh` passed (if known):

```
(paste SHA and message)
```

**Restore current work after isolation:**
```bash
git stash pop   # only if you need to continue with current work
```

---

## 3. Hypotheses

Work through one hypothesis at a time. Do not try two fixes simultaneously.

### Hypothesis 1

**What I think is wrong:**

**Smallest change to test it:**

**Result after change (`./init.sh` pass / fail):**

**Output:**

```

```

---

### Hypothesis 2

**What I think is wrong:**

**Smallest change to test it:**

**Result after change:**

**Output:**

```

```

---

### Hypothesis 3

**What I think is wrong:**

**Smallest change to test it:**

**Result after change:**

**Output:**

```

```

---

## 4. Resolution

**Resolved:** Yes / No

**Root cause (one sentence):**

**Fix applied:**

**`./init.sh` after fix:**

```

```

**Committed as:**

---

## 5. Blocker Note (if unresolved after 3 hypotheses)

Copy the following into the feature's `notes` field in `feature_list.json`
and set `status` to `"blocked"`:

```
BLOCKED [YYYY-MM-DD]: <one sentence describing what fails>
Hypotheses tried:
  1. <what was attempted and why it failed>
  2. <what was attempted and why it failed>
  3. <what was attempted and why it failed>
Unresolved because: <why none of the fixes worked>
Needs: <what external input, information, or decision is required>
Last good state: <git SHA where ./init.sh last passed>
```
