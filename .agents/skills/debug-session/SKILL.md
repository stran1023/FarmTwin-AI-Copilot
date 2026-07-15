# debug-session

## Gap it fills

When `./init.sh` fails or a feature is blocked, agents spiral. They try random
fixes, accumulate partial changes, and leave the baseline in a worse state than
when they started.

## What it produces

- A structured debug log capturing the failure, hypothesis, fix, and verification
- A restored clean baseline when debugging is complete
- A blocker note added to `feature_list.json` if the issue cannot be resolved

## When to use

- `./init.sh` fails at session start
- A feature has been `in_progress` for more than two sessions without reaching `passing`
- The same error keeps reappearing after fixes

## Core workflow

```
1. STOP all new feature work immediately

2. Record the exact failure:
   - What command failed?
   - What was the full error output?
   - What was the last working commit? (git log --oneline -10)

3. Isolate whether the failure is new or pre-existing:
   - git stash
   - ./init.sh
   - If it fails: failure pre-exists current work → do not unstash yet
   - If it passes: failure introduced by current work → git stash pop, isolate further

4. Form one hypothesis — do not try multiple fixes simultaneously

5. Make the smallest possible change to test the hypothesis

6. Run ./init.sh after the single change

7. If resolved:
   - Record the fix in progress.md under "Known risk / resolution"
   - Commit
   - Continue feature work

8. If not resolved after 3 hypotheses:
   - Mark the feature as blocked in feature_list.json
   - Write a blocker note (see template)
   - Stop — do not keep trying
```

## Blocker note format

Write this into the feature's `notes` field in `feature_list.json`:

```
BLOCKED [YYYY-MM-DD]: <one sentence describing what fails>
Hypothesis tried: <what was attempted>
Unresolved because: <why the fix did not work>
Needs: <what external input or information is required to unblock>
```

## Rules

- Never fix a broken baseline by working around it — fix it directly
- Never commit code that makes `./init.sh` fail
- One hypothesis at a time — parallel fixes make the cause impossible to isolate
- After 3 failed hypotheses, stop and document — more attempts deepen the hole

## Templates needed

- `debug-log.md` — captures failure, hypotheses tried, and resolution
- `blocker-note.md` — full blocker note format for feature_list.json

## Related

- [code-reviewer](../code-reviewer/SKILL.md) — a review can reveal the root cause before debugging starts
- [context-reset](../context-reset/SKILL.md) — if the session ran long before the failure, reset first
- [index](../companion-skills/index.md)
