# Arm A run log

**Freeze: `0abf01e`** — 8 scorers + 9 task files, hashed in `eval/INSTRUMENT.sha256`. Re-verify before every scoring run.

## Step A — precheck

All eight bases pass: `8b756d6` (first commit adding `eval/scorers/`) is not an
ancestor of any `eval-base-tN`. No base carries the scorers in its own history.

## Step B/C — task files

`eval/tasks/` did not exist; task prompts lived as blockquotes in `BASELINE.md`.
Created it and extracted all nine.

**Deviations, both for standalone coherence, neither touching a locked decision:**

1. **t1** — the appended sentence wrapped mid-clause when concatenated. Re-wrapped.
   Wording is verbatim as specified.
2. **t3b** — the second paragraph opens *"While you are there:"*, which has no
   antecedent once split from the first. Replaced that clause with the original
   report's opening line so the task states which expression it is about:
   *"Reported from a lesson. The line is `(3^2 x 4)^(1/2) + 2^2 - cbrt(27)`. If I
   settle the whole rest of the line in one tap…"*. No requirement added or
   removed; without it the task is not solvable as written.

## Step C — scorer split, Rule 1c

`t3.pair.scorer.ts` split at its own describe boundary into
`t3a.pair.scorer.ts` and `t3b.values.scorer.ts`. Assertions unchanged.

| | base `eval-base-t3` | `eval/t3` (A r1) | `eval/t3-r2` | `eval/t3-r3` |
| --- | --- | --- | --- | --- |
| t3a | **red** | — | green | green |
| t3b | **red** | **green** | red | red |

Both red on base, both green on at least one known-good fix. Rule 1c satisfied
in both directions. t3b's base failure message is behavioural —
`expected 'out-of-order' to be undefined` — not a name or signature assertion.

Incidentally this confirms the split was the right call: no single branch has
ever passed both halves. Reps 2 and 3 pass t3a only; rep 1 passes t3b only.

## Step D — boundary and freeze

Deny block added to `.claude/settings.json`, file parses.

**HALT — the deny block blocks Step F.**

`Bash(git fetch:*)` is denied repo-wide, which includes this driving session.
Verified directly:

```
$ git fetch origin main
Permission to use Bash with command git fetch origin main has been denied.
```

`git pull`, `git clone`, `git remote` and `git ls-remote` are denied too. Step F
requires fetching nine result branches per rep. With this block in force the run
can be launched but **not retrieved and not scored** — 27 Opus sessions whose
output is unreachable.

`settings.json` is repo-wide and cannot distinguish the driving session from a
task session, so there is no narrower placement that keeps the boundary for
tasks and leaves scoring possible.

Not continuing to Step E. Launching a rep that cannot be scored spends the
budget for nothing, which the instruction to "continue unless a HALT says
otherwise" cannot have intended.

Freeze manifest built (`eval/INSTRUMENT.sha256`, 8 scorers + 9 tasks) but the
freeze commit is deliberately NOT made, because the deny list is part of the
tree being frozen and is the open question.

## Step D resolved

`Bash(git fetch:*)` dropped from the deny list on the owner's instruction. The
other eight entries stand and are the boundary actually in force for arm A:

```
git remote, git ls-remote, git clone, git archive, git pull, curl, wget, gh
```

Harness-enforced, not agent compliance. Weaker than a repo boundary — a task
session can still `git fetch origin main` and reach the scorers in history —
and that exposure is accepted for arm A only, because it inflates the baseline
arm B must clear and therefore biases against switching.

Also removed `maths-trainer-eval-subject` from the repo root, a stray four-line
text file created by the web editor during subject-repo setup.
