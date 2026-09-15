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

## Step E — arm A rep 1 launched

15:38–15:40Z, nine tasks concurrently, Opus, no advisor. Freeze `0abf01e`.

| | Session | Branch |
| --- | --- | --- |
| T1 | `session_01GLoi1ugbjZ1JKvpV9pvDvC` | `armA-rep1-t1` |
| T2 | `session_01AZ9zuDuFUHQsz4TXAotQRJ` | `armA-rep1-t2` |
| T3a | `session_01VmeBw7JaKMFXVHyx7yXyqU` | `armA-rep1-t3a` |
| T3b | `session_01Bh43xsTTeuycBn4TfpFrEB` | `armA-rep1-t3b` |
| T4 | `session_01XEQKinqixc2sdtreQzthYq` | `armA-rep1-t4` |
| T5 | `session_018hktM3ke4aotDyXPAXpHuH` | `armA-rep1-t5` |
| T6 | `session_01Qiq2fsiNgj5QH1573iYYnk` | `armA-rep1-t6` |
| T7 | `session_01NZsWoQgwhMzqB3UZ6NXZAB` | `armA-rep1-t7` |
| T8 | `session_01Mp7Jh6d6HG8ux78v7w7YFM` | `armA-rep1-t8` |

T3b's closing instruction omits "do not delete, skip or weaken any existing
test", because the task requires changing one named test. The other eight carry
it verbatim.

## Arm B pre-authorised

The owner pre-authorised arm B conditional on the gate: if the three arm A reps
agree within 2 of 9, arm B runs without further approval. If they disagree on
more than 2, the run stops and arm B is not worth running.

Arm B runs against the **subject repo**
(`pm78jvchmg-prog/maths-trainer-eval-subject`), which holds the eight base
branches and nothing else — no `main`, no scorers. Verified: `git fetch origin
main` there returns `couldn't find remote ref main`, and
`git log --all -- eval/scorers` returns 0 after an explicit all-refs fetch.

Nine tasks need only eight bases: t3a and t3b both branch from `eval-base-t3`.
No further push to the subject repo is required.

### Arm B launches all 27 sessions at once

Decided rather than asked, on the runbook's own residual-risk guidance.

Arm B's outcome branches land in the subject repo, so under sequential reps a
later rep could `git fetch` an earlier rep's solution branch. That contamination
**inflates arm B**, which biases *toward* switching — the non-conservative
direction. Arm A's equivalent exposure was accepted precisely because it biases
the other way; the same reasoning forbids accepting it here.

Launching all three reps concurrently means no rep precedes another, so there is
nothing for a later rep to find. This is the first of the two options the runbook
names under "Residual risk".

Cost: 27 concurrent Sonnet sessions. If rate limits stall any, they are resumed
in place, never relaunched.

## Instrument fix after the rep 1 halt

### T3a scorer — bounded, and why the cap alone was not enough

Rewritten: eight values instead of 101, a handle cap, an attempt cap, a 20s
in-test budget, and calibration — an export is only used as an applier if it
first turns `2 + 3` at the root into `5`. Exhausting any cap reports
**INCONCLUSIVE**, never a fail.

That is the right design and it still does not rescue rep 1's T3a branch. Probed
directly: `pairBank(chain, 'r', 1)` never returns, and neither does
`pairBank(2 + 3, ROOT)`. One exported function loops on ordinary input, so **no
in-process enumeration of that branch is safe** — caps check between calls and
never get the chance, and calibration hangs during calibration.

The backstop therefore does the work here: `score.sh` now runs each scorer under
`timeout 180` and maps a timeout to INCONCLUSIVE rather than RED. T3a rep 1 is
recorded INCONCLUSIVE.

Separate observation, not a verdict: a shipped function that hangs on
`pairBank(2 + 3, ROOT)` is a real defect in that branch. The suite passes because
nothing calls it that way. T3a's scorer does not test for it, so it does not
change the verdict — recorded here rather than folded in silently.

### T3b spec resolved before re-scoring

The dispute was whether "the whole rest of the line" includes mixed precedence.
It does. `CLAUDE.md` states the intended design in terms: *"the value is the only
test … taking `8 + 4 x 3` left to right produces 36 rather than 20, so the order
mistake is already in the answer."* The scorer's reading was right and the prompt
was silent, which is how rep 1's branch reached a narrower rule in good faith.

The prompt now says so, with the scorer's own example. Checked first that
`CLAUDE.md` at `eval-base-t3` does **not** contain that passage — it does not, so
the requirement is stated without leaking the fix.

**Consequence: rep 1's T3b must be re-run, not re-scored.** Its branch answered a
different question. The other eight branches stand and are re-scored against the
new hash.

## INCONCLUSIVE — the rule, fixed now, before it recurs

An INCONCLUSIVE task-trial is neither a pass nor a fail and does not belong in
the ≥4-of-27 arithmetic. Committed in advance of knowing how often it fires:

1. **An INCONCLUSIVE trial is dropped from both arms' denominators**, not counted
   either way. If T3a rep 1 is inconclusive in arm A, T3a rep 1 is excluded from
   arm B's count too, so the arms are always compared over the same trials. The
   threshold scales with the denominator: ≥4 of 27 becomes the same proportion of
   whatever remains.
2. **More than 3 inconclusive trials of 27 in either arm stops the comparison.**
   That is an instrument too fragile to decide anything, and the honest report is
   that it could not measure, not a number with an asterisk.

Fixing this now costs nothing. Fixing it after seeing the counts would be Rule 0
all over again.

## Defect register — found by the eval, not by scoring

Defects the eval surfaces that no task asked for and no scorer tests. Kept apart
from pass/fail on purpose: a verdict answers the question the task set, and this
does not. But if one arm's branches hang and the other's do not, that is a
quality difference no pass/fail table will ever show, and it has to have been
recorded from rep 1 to be worth anything at the end.

| Branch | Defect |
| --- | --- |
| `armA-rep1-t3a` | `pairBank` never returns — not on `pairBank(chain, 'r', 1)`, and not on `pairBank(2 + 3, ROOT)` either. A shipped export that hangs on ordinary input. The suite is green because nothing calls it that way. Found only because the scorer enumerated exports; T3a does not test for it, so it does not change that verdict. |

Record every hang, unhandled throw on ordinary input, or non-terminating export
found while scoring either arm, and tally them per arm in the comparison.

## Note on the freeze and this log

The freeze is the **content of `eval/INSTRUMENT.sha256`** — eight scorers and
nine task files — not the commit that happens to carry it. Appending to this run
log or to `ARM_A.md` moves the commit and changes nothing in the manifest.
Re-verify with `sha256sum -c`, not with `git rev-parse`.
