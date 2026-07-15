# Deployment Checklist

Complete this checklist in order. Do not skip steps. If any step fails,
stop and resolve it before continuing — a partial deployment is worse than
no deployment.

---

## Pre-Deployment

### Harness verification

- [ ] All milestone features are at `status: passing` in `feature_list.json`
- [ ] No feature is at `status: in_progress` or `blocked`
- [ ] `./init.sh` passes cleanly (run it now, paste result below)

```
./init.sh result:
```

### Documentation

- [ ] `CHANGELOG.md` entry written for this milestone
- [ ] `quality-document.md` grades updated for all domains touched
- [ ] `docs-sync` run: no items left in `docs-gap.md` from this milestone

### Final review

- [ ] `progress.md` current state section is accurate
- [ ] `feature_list.json` `last_updated` set to today

---

## Deployment

*(Replace these steps with your project's actual deployment commands.)*

- [ ] Step 1: `[deployment command]`
- [ ] Step 2: `[deployment command]`
- [ ] Step 3: `[deployment command]`

Deployment completed at: ___________

---

## Post-Deployment Verification

Run the verification steps for at least the two highest-priority features
in the deployed environment (not localhost).

- [ ] Feature `[id]` verified in deployed environment
- [ ] Feature `[id]` verified in deployed environment
- [ ] No unexpected errors in deployment logs

---

## Close

- [ ] Milestone archived in `progress.md` (use `milestone-archive.md` format)
- [ ] `feature_list.json` reset for next milestone (completed features moved to archived array)
- [ ] Commit created:

```bash
git add .
git commit -m "Close milestone: [name]"
git tag v[version] -m "[milestone name]"
```

- [ ] Commit SHA: ___________
- [ ] Tag: ___________

---

## If Deployment Fails

1. Do not force the deployment
2. Record the failure in `progress.md` under this session's entry
3. Revert if the failed state is live: `git revert HEAD`
4. Open a `debug-log.md` and treat the deployment failure as a blocked feature
5. Do not close the milestone until deployment succeeds
