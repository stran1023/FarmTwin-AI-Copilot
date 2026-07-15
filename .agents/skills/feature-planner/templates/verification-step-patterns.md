# Verification Step Patterns

Verification steps are the single most important part of a feature entry.
A bad verification step lets agents claim done without proving anything.
A good one forces observable proof before the feature moves to `passing`.

---

## The Rule

Each step must answer: **"What does a human see or do, and what do they observe?"**

If the step can be "verified" without running the app or the tests, it is not
a verification step — it is a wishful thought.

---

## Good Patterns

### User-action → observable result

```
Open the app.
Click "New Chat" in the sidebar.
Verify: a new entry appears in the conversation list.
Verify: the main panel shows an empty conversation state with no messages.
```

```
Type "Hello" into the message input and press Enter.
Verify: the message appears in the thread within 2 seconds.
Verify: the input field is cleared after sending.
```

### Command → expected output

```
Run: npm test
Verify: all tests pass with exit code 0.
Verify: no test is marked as skipped or pending.
```

```
Run: ./init.sh
Verify: the script completes without errors.
Verify: the final line reads "Verification Complete".
```

### State persistence

```
Create two conversations.
Close and reopen the app.
Verify: both conversations still appear in the sidebar in the same order.
```

### Error handling

```
Submit the login form with an incorrect password.
Verify: an error message appears below the form.
Verify: the password field is cleared.
Verify: the user remains on the login page.
```

---

## Bad Patterns (and why they fail)

| Bad step | Problem | Fix |
|----------|---------|-----|
| "The feature works correctly." | Not observable — what does "correctly" mean? | Name the specific behavior |
| "The code handles edge cases." | Not runnable — no human action described | Write a specific edge case as an action + observation |
| "Tests pass." | Too vague — which tests? | "Run npm test — all tests pass with exit code 0" |
| "The UI looks right." | Subjective — "right" is undefined | Describe the exact element and state to verify |
| "No errors in the console." | Negative check only — doesn't confirm the feature works | Add a positive check first, then add the no-error check |
| "I manually tested it." | Not reproducible by the next session | Write out what "manually tested" means, step by step |

---

## How Many Steps per Feature

- Minimum: 2 steps (one for the happy path, one for persistence or error state)
- Typical: 3–5 steps
- Maximum: 7 steps (if you need more, the feature is too large)

If all steps are "run the tests," the verification is weak. Include at least one
manual user-action step for any feature with visible behavior.

---

## Template: One feature's verification block

```json
"verification": [
  "Open the app.",
  "[User action that exercises the feature].",
  "Verify: [observable result 1].",
  "Verify: [observable result 2].",
  "[Optional: edge case or error path]."
]
```
