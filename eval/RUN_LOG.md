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
