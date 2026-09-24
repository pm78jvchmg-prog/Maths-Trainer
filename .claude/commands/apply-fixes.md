---
description: Apply chosen review findings via the fixer agent, re-check with the original reviewers, then open a PR
argument-hint: <finding IDs, e.g. M2 M5 C1>
---

Findings to fix: $ARGUMENTS

1. **Find them.** Use the latest /review-game report in this session. If it isn't here, ask me to paste it — don't reconstruct findings from memory. List the findings back to me in one short table and wait for "go".
2. **Branch.** Create `fix/<short-topic>-<date>` from latest `main`.
3. **Fix.** Launch the `fixer` agent with the exact finding text for each ID and the branch name.
4. **Re-check.** For each area touched, launch the original reviewer (`maths-content-reviewer` for M*, `code-reviewer` for C*, `player-experience-reviewer` for P*) on the changed files only. Ask it to:
   - confirm each finding is resolved, labelled Verified/Suspected with evidence;
   - report any new issue the change introduced.
5. **Retry once.** If any fix fails re-check, send it back to `fixer` once. If it fails again, drop that commit and report it.
6. **PR.** Open a pull request to `main` with a table: ID | Fixed? | Re-check result | Evidence. Do not merge.
7. Report back with the same table and the PR link.
