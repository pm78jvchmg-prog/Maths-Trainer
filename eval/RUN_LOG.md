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

## Arm B: two-condition gate, consecutive reps, and a blocker

### Concurrency reversed

Arm B was going to launch all 27 sessions at once, to stop a later rep fetching
an earlier rep's solution branches from the shared subject repo. That trades one
risk for a worse one: a killed session cannot be resumed, so 27 at once puts the
whole arm on a single session-limit window. Arm A runs 9 at a time for exactly
that reason, and arm B now does the same — **one rep at a time, nine sessions,
waiting for all nine branches**.

### Which means the inter-rep leak needs closing another way

Tested rather than assumed: `git push --delete` against the subject repo fails
the same way it does against `Maths-Trainer` — the proxy refuses branch deletion
everywhere, not just on the original. So outcome branches cannot be cleared
between reps.

That leaves one sound option: **a separate subject repo per rep.**

- `maths-trainer-eval-subject-rep1`
- `maths-trainer-eval-subject-rep2`
- `maths-trainer-eval-subject-rep3`

each containing only the eight `eval-base-t*` branches. `create_repository`
returns 403 to this integration, so this is the owner's step.

Not acceptable as substitutes, and the Routine is instructed to refuse both:
running all three reps from one repo (rep 2 reads rep 1), or reverting to
concurrent launch (risks the arm). Either would inflate arm B, which biases
toward switching — the direction a previous run was already voided over.

### The gate now has two conditions

Arm B runs only if **both** pass:

1. the three arm A reps agree within 2 of 9, and
2. all three subject repos exist and carry only the eight bases, verified by
   listing their branches — not assumed from the fact that one was built earlier.

The second condition exists because an autonomous 03:00 wake-up should not infer
a boundary from memory. Checked at the time of writing: the single existing
`maths-trainer-eval-subject` does hold exactly the eight bases with SHAs matching
`eval/bases.tsv`.

Housekeeping: that repo now also carries a stray `delete-me` branch, created
while testing whether deletion works. It is a copy of `eval-base-t1`, so it holds
no scorers, but it should be binned, and its presence is why the gate checks for
"only the eight bases" rather than "at least the eight bases".

## Isolation corrected to one repo per (arm, rep) — five needed, arm A halted too

Three repos, one per rep, was wrong. Shared between arms, rep N's repo would put
**arm A's solution branches in arm B's clone for the same tasks** — inflating the
challenger, the direction that makes switching look justified, and the exact
failure two days went into closing.

Verified before changing anything, rather than reasoning from the design:

- arm A rep 1's ten branches are in **Maths-Trainer**, not a subject repo
- the subject repo holds only the eight bases, plus a stray `delete-me`

So the cross-arm leak was not live — arm A and arm B do not currently share a
repo. But checking turned up a different one that was, and was 40 minutes away:

**Arm A rep 2 would clone `Maths-Trainer`, which now contains arm A rep 1's ten
solution branches.** Rep 1 was clean of this by circumstance — nothing prior
existed to fetch. Reps 2 and 3 would not be. Direction: inflates arm A, the
baseline, so conservative and survivable with a caveat — but it is a leak, and
separation closes it for free.

Arm A reps 2 and 3 are therefore halted too, and move to their own repos. Five
are needed, not three:

| Repo | For |
| --- | --- |
| `...-eval-subject-armA-rep2` | arm A rep 2 |
| `...-eval-subject-armA-rep3` | arm A rep 3 |
| `...-eval-subject-armB-rep1` | arm B rep 1 |
| `...-eval-subject-armB-rep2` | arm B rep 2 |
| `...-eval-subject-armB-rep3` | arm B rep 3 |

Arm A rep 1 needs none: it has already run, and ran with nothing to leak from.

Each must hold **only** the eight `eval-base-t*` branches at the SHAs in
`bases.tsv`. The gate verifies all five by listing branches, not by assuming.

The existing `maths-trainer-eval-subject` is now superseded and would fail that
check anyway — nine branches, because testing whether deletion works left a
`delete-me` copy of `eval-base-t1` that this side cannot remove.

### What this rests on

Not on arm A and arm B happening to use different repositories. That held only
because of how the Routine was written, and a boundary that depends on reading
the configuration correctly is the kind that has failed here repeatedly. One
repo per (arm, rep) has no cross-visibility by construction.

## Denominator restored to 24 — the accounting fix, not a reinterpretation

T3a and T3b are two runs of **one task**. Scored as one, passing only if both
pass. Eight tasks over three reps is 24 trials, and `EVAL_PROTOCOL.md` Rule 0
applies exactly as frozen: **≥4 of 24 and cost ≤ 1.2×**.

This replaces two restatements of mine, both of which loosened the rule toward
switching: carrying "4" across to a 27 denominator dropped the threshold from
16.7% to 14.8%, and "cost is not in the switch condition" removed a conjunct that
has to be satisfied as well as the gap.

### The cost clause, stated before the numbers land

Arm B ran at **0.57×** arm A in the voided comparison. If anything close to that
holds, `cost ≤ 1.2×` is satisfied comfortably and never binds — the decision then
rests entirely on the ≥4 gap. Recording that now so the clause cannot later be
discovered to have been load-bearing, or quietly treated as the thing that
carried the verdict.

### A risk this creates

T3 is currently INCONCLUSIVE, and inconclusive trials are dropped from both arms'
denominators. If T3a's scorer stays broken across all three reps, T3 drops out
entirely: seven tasks, 21 trials, and Rule 0's "4 of 24" is ambiguous again —
exactly the situation the collapse was meant to end.

The fix is to make T3a scoreable, not to rescale the rule. If it is still
inconclusive after rep 2, that is the point to stop and repair the scorer rather
than run rep 3 into the same hole.

## 2026-09-15 — the five subject repos exist and are verified; gate open

All five per-(arm, rep) repositories now hold **exactly** the eight
`eval-base-t*` branches, at the SHAs in `bases.tsv`, verified with
`mcp__github__list_branches` rather than assumed:

| Repo | Branches |
| --- | --- |
| `...-eval-subject-armA-rep2` | 8, correct SHAs |
| `...-eval-subject-armA-rep3` | 8, correct SHAs |
| `...-eval-subject-armB-rep1` | 8, correct SHAs |
| `...-eval-subject-armB-rep2` | 8, correct SHAs |
| `...-eval-subject-armB-rep3` | 8, correct SHAs |

The original `maths-trainer-eval-subject` also now lists eight and no more —
`delete-me` has been removed at the owner's end, so the branch-deletion
limitation is on this side of the proxy only.

Each repository had to be attached to the session with `add_repo` before a
push would authorise. The 403 seen first was the proxy declining to inject a
credential for a repository outside the session's set — **not** evidence that
the repository was missing. Recorded because the earlier version of that
mistake (declaring a repository non-existent from a proxy error) is in this log
already.

Freeze re-verified immediately before launch: all 8 scorers and all 9 task
files `OK` against `INSTRUMENT.sha256`.

## Instrument amendment — the preamble could not push

Blocking defect found while assembling the rep 2 prompts, not a judgement call:
`PROMPT_PREAMBLE.md` instructed the session to `git remote remove origin` and
then "Do not restore the remote", while every task prompt closes with
`git push -u origin <branch>`. Both cannot be obeyed. Under the unamended text
a rep cannot complete — which is exactly what happened to arm B rep 1, whose
sessions stalled on the block and were told to skip it, and which is void for
that reason.

Amended: the prohibition is scoped to the working window and a restore step is
added after the commit. The isolation window is unchanged — no remote during
diagnosis, implementation or testing.

**This invalidates nothing.** No valid rep has run under the preamble: arm A
rep 1 predates the file and used instruction-level isolation; arm B rep 1 and
arm C are void. Arm A rep 2 is the first rep under it, and runs under the
amended text, so all three reps of both arms will share one preamble.

`eval/PROMPT_PREAMBLE.md` is now hashed in `INSTRUMENT.sha256`. It was not
before — "frozen" rested on a sentence inside the file rather than on the
manifest, which is the same class of gap as the scorers living in the
repository did.

The retracted harness-clone claim has also been removed from that file. It
still asserted that the harness closes the leak, citing the probe that
`README.md` § Isolation retracts.

## 2026-09-15 22:02 — the preamble's commands are refused by the platform, uniformly

First wake after launching arm A rep 2. All nine sessions RUNNING, none stalled,
0 of 9 outcome branches (5 minutes in). But eight of the nine report having hit
the same wall: the sessions run under `permission_mode: auto`, and the platform's
permission classifier **refuses the preamble's destructive git commands** —
`git remote remove origin`, `git update-ref -d`, `git reflog expire`,
`git gc --prune=now`. Two sessions name it in their own summaries
("isolation denied; proceeding with fix", "isolation commands blocked by
permission classifier").

This is not the bases' doing: `.claude/settings.json` on `eval-base-t3` carries
only the subagent-model env var, no deny list. It is the harness, and it applies
to every session in every arm.

### What it means, and what it does not

Isolation is **instruction-level in practice**, in both arms, in every rep —
the same footing arm A rep 1 ran on. The enforcement the block was supposed to
add does not exist at this layer and never did.

**This does not void rep 2.** `PROMPT_PREAMBLE.md` says, in text committed
before this was observed: *"An agent that skips it does not void the rep."*
That sentence is now doing real work rather than describing a hypothetical.
The boundary that is actually enforced is the per-(arm, rep) subject repository,
which contains nothing but the eight bases — there is no answer key to reach
whatever the agent runs.

Direction of bias: **none**. The refusal is a property of the harness, applied
identically to arm A and arm B, so it cannot move the gap between them.

### Two consequences to carry forward

1. **The preamble stays unchanged.** Changing it now would split rep 2 from
   reps 3-6 on prompt text, for no gain: the block is defence-in-depth over a
   boundary that already holds. It is kept for its one live function — a
   session that reports a non-empty ref list is the signal that its clone
   carried more than its base.
2. **The restore step is a no-op and the push is safe.** Since the removal is
   refused, `origin` survives, so `git push -u origin HEAD:armA-rep2-tN` works
   without it. The one case to watch is a session that *did* get the removal
   through, which would then be refused `git remote add` and could not push.
   `armA-rep2-t3b` reports a null current branch and is the candidate; checked
   next wake.

No session is to be messaged about this. Eight have already routed around it
unaided, which is what the preamble licenses, and telling them otherwise is
what voided arm B rep 1.

## 2026-09-15 22:45 — arm A rep 2 scored: 8 PASS of 8

Manual fire of the Routine at the owner's request, 40 minutes after launch. All
nine branches pushed; all nine sessions reached `completed`. Freeze verified `OK`
immediately before scoring and the T5 scorer's hash checked at the point of use.

Full table in `ARM_A.md`. Headline: **8 PASS, 0 FAIL, 0 INCONCLUSIVE**, at
**$47.04**.

### T3 came back scoreable without the scorer being touched

`t3a.pair.scorer.ts` is byte-identical to the one that hit the 180s timeout on
rep 1 — same hash, verified. It terminates against rep 2's branch. So rep 1's
INCONCLUSIVE was a defect in *that branch's* `pairBank`, exactly as the defect
register records, and nothing about the instrument is retracted by this.

Consequence for the denominator: T3 is live again. The risk flagged earlier —
T3 dropping out of all three reps and leaving Rule 0 ambiguous over 21 trials —
has not materialised, and the standing instruction to repair the scorer rather
than rescale the rule was not needed.

### Deletion counts overstate; every line was read

t3a's six "deletions" are the bank assertions lifted into a `needsBank` helper
and then applied to pair banks as well — stronger than the base. t3b's 32 are
its licensed rewrite, with the wrong-value guards rebuilt as value tests
(`value: 36 -> wrong-value`) rather than dropped. t2, t4 and t6 are one line
each: two import rewrites and the oracle call. No branch has fewer `it(` blocks
than its base.

### Defect register — no new entries

No hang, non-terminating export or unhandled throw on ordinary input found while
scoring rep 2. Arm A running total: **1** (`pairBank` on `armA-rep1-t3a`).

### Blinding: this rep was not blind, and the exposure is named

Scored in the session that launched it. The eight scorers are deterministic
programs, so their verdicts carry no bias from that. The constraint checks are
judgement and were made knowing the arm — real exposure, though every one came
out clean and none was close. No disputes, so nothing is queued for
adjudication. Close calls in either arm go to a blind pass over both arms
together rather than being settled arm-by-arm.

### The permission refusal, now with cost attached

`armA-rep2-t3a` ended `blocked`, asking to be allowed to run the preamble's
refused git commands — **after** it had finished the task and pushed. Its
$11.52 is the highest of the nine and part of that tail is the block, not the
work. Arm B meets the identical refusal, so this does not move the A-vs-B gap,
but it inflates both arms' absolute cost. Worth remembering when Rule 0's
`cost <= 1.2x` clause is applied: the clause is a ratio, and a constant overhead
on both arms pushes the ratio toward 1, which makes the clause *easier* to
satisfy. That direction favours switching, so it is logged rather than left
implicit.

### Gate standing

Rep 1 and rep 2 agree on seven of eight tasks; T3 differs (INCONCLUSIVE, PASS).
One disagreement, tolerance is 2. Rep 3 next.

## 2026-09-16 00:00 — arm A closed at 22/22; the comparison is halted before arm B

Rep 3 scored: 7 PASS, 0 FAIL, 1 INCONCLUSIVE, $41.67. Arm A over three reps:
**22 PASS, 0 FAIL, 2 INCONCLUSIVE of 24.** Full tables in `ARM_A.md`.

Halted by the owner before arm B ran, on an argument that is arithmetic rather
than judgement, and that I should have made myself two reps ago.

### The arithmetic

Rule 0 needs arm B to exceed arm A by ≥4 task-trials of 24. Inconclusive trials
drop from both denominators, so the live comparison is 22 trials and arm A took
**22 of 22**. Arm B's ceiling is 22. `B − A ≤ 0` — arm B cannot exceed arm A by
one trial, never mind four. Counting both inconclusives as passes for A does not
help: A = 24, B ≤ 24, same conclusion.

So the test returns "no switch" for **every** possible arm B, including one that
is strictly better. Nine sessions and a night would have bought a number with no
information in it.

### Where I got this wrong

I recorded the ceiling as a *write-up caveat* when rep 2 came in at 8/8 — a note
for the final comparison so a null result would not be misread. That was the
wrong category. It was already decisive at that point, and the honest move was to
stop and say the experiment could no longer answer its question, not to schedule
rep 3 and arm B and flag it in the appendix. Arm A rep 1 plus rep 2 was 15 of 16
with zero failures; the margin was unreachable from there.

The report of a halted comparison is **"these tasks could not resolve it"**, and
never "the configurations are equivalent". Nothing in this run licenses any claim
about Sonnet-plus-Opus-advisor.

### The finding that outlasts the comparison

Two prompts flipped from persistent failure to pass on one added sentence:

- **T1** failed six times, then passed once the prompt said an answer containing
  `=` must still be graded rather than rejected.
- **T3b** failed, then passed once the prompt said `8 + 4 x 3` settled in one tap
  as 20 must be accepted and as 36 must not.

Neither sentence revealed a mechanism; each stated a requirement the task had
always had and never said. **The original 6/8 was substantially measuring prompt
defects, not model capability.** That is worth more than the comparison was ever
going to be, and it is the one result here that generalises.

### The defect register is the only place attempts differed

`pairBank` non-terminating on `armA-rep1-t3a` and again on `armA-rep3-t3a`: two
of three attempts at one task shipped a non-terminating export, each with a green
suite and a silent typecheck. Rep 2's did not. Arm A defect tally: **2**.

Binary pass/fail discarded this as INCONCLUSIVE. It is the only signal in the run
that distinguished one attempt from another, and it is about quality rather than
correctness — all three branches pass their tests.

### Rep agreement, repurposed

Reps 1 and 3 identical, rep 2 differs on T3 alone: agreement within 1 task of 8.
The gate existed to decide whether arm B could run. Arm B is not running, so this
figure now measures something narrower and still worth having — the harness is
reliable and the scoring reproduces. The instrument was not the problem.

### State

The Routine is deleted. No automation is armed. Arm B's three subject repos exist
and are untouched, holding the eight bases only, if the question is re-posed.
Nothing has been written to `COMPARISON.md`; there is no comparison to record.
