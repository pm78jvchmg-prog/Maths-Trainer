# Arm A — Opus, no advisor. Freeze `0abf01e`

Nine tasks. Scored locally from `../eval-private/scorers/`; instrument verified
against `eval/INSTRUMENT.sha256` before scoring (8 scorers + 9 task files, all
OK). Arm and rep labels stripped at scoring time — scored by branch.

## Rep 1 — launched 15:38Z, all nine branches landed by 16:40Z

| | Scorer | Suite | `tsc` | Verdict |
| --- | --- | --- | --- | --- |
| **T1** | green | 1920 | silent | **PASS** |
| **T2** | green | 2509 | silent | **PASS** |
| **T3a** | **scorer does not terminate** | — | — | **INCOMPLETE** |
| **T3b** | **1 of 4 red** | 2583 | silent | **FAIL** |
| **T4** | green (3/3, SEEDS 200) | 219 | silent | **PASS** |
| **T5** | green (Playwright, 393px) | 1079 | silent | **PASS** |
| **T6** | green | 2238 | silent | **PASS** |
| **T7** | green | 1922 | silent | **PASS** |
| **T8** | green | 1914 | silent | **PASS** |

**7 PASS, 1 FAIL, 1 INCOMPLETE — and the run is HALTED. See below.**

## T1 passes for the first time

T1 failed five consecutive trials across both arms of the previous, voided
comparison, every one by rejecting the equation at parse time so valid answers
read `invalid`. Under the rewritten prompt — which states that an answer
containing `=` must still be graded, without naming the mechanism — it passes.

That is evidence the task was underspecified rather than hard, which was the
reason given for rewriting it. It is one trial; reps 2 and 3 will say whether it
holds.

## Disputes — logged, not appealed

Per the run rules, scoring continued and no appeal was heard.

### Dispute 1 — the T3a scorer does not terminate in reasonable time

`t3a.pair.scorer.ts` finds the pair step by *reachability*: it calls every
exported function of `expr.ts` in two argument shapes, against every legal
target, across 101 candidate values. That predicate was widened deliberately,
after an earlier version pinned `reduceAt` and marked a correct fix wrong.

The cost is combinatorial in the number of exports, and this branch adds eight
(`basePath`, `beforeRegroup`, `isLit`, `isPairPath`, `landingPath`, `pairBank`,
`pairOf`, `pairPath`). The run exceeded 600s, then 240s again under
`--testTimeout=20000` — the timeout does not fire because the work is
synchronous and vitest cannot interrupt it. Re-running with a 30-minute budget.

It did not resolve. Given a 30-minute test budget it ran **57 minutes** without
completing and was killed. T3a is recorded **INCOMPLETE**, not failed: scoring a
task red because the scorer cannot finish would measure the scorer.

This is a defect in the instrument, not in the work under test.

### Dispute 2 — T3b implemented a narrower rule than the scorer tests

The task asks that settling "the whole rest of the line in one tap" with the
right number should count. The branch edits the named test, as the task
licenses, and replaces it with a rule for a **run of one level of arithmetic**:
`6 + 4 - 3` taken as 7 is accepted, on the reasoning that nothing in that run
binds tighter than anything else.

The scorer asserts a mixed-precedence case — `8 + 4 x 3` settled in one tap as
20 — which the branch still refuses. So the scorer is red and the verdict is
FAIL.

Whether "the whole rest of the line" was meant to include mixed precedence is
genuinely arguable: the reported line was `(3^2 x 4)^(1/2) + 4 - 3`, whose tail
is a same-precedence run, which is exactly what the branch implemented. Logged
for adjudication after the run, by someone who did not produce the work.

## Test-line deletions — all read

| | Deleted | Verdict |
| --- | --- | --- |
| T2 | an import line | no-op |
| T3b | the named test `refuses a right value for a piece taken too early`, replaced by two new tests | **licensed** — the task states updating that test is part of the work |
| T4 | the oracle line, replaced by the `{ simplify: false }` form | the same fix reached independently again |

No other branch deletes a test line. Nothing weakened.


## HALTED after rep 1 — Rule 2

Rule 2: *"If a scorer is found broken mid-run, stop, fix, and re-run **both**
arms from scratch. Partial re-runs are not comparable."*

The T3a scorer is broken. Not slow — unusable: 57 minutes on one assertion, and
unbounded in the number of exports a solution happens to add, so a *better*
solution makes it slower. Rep 2 and rep 3 would reproduce the same gap, and the
gate and the ≥4-of-27 comparison both assume nine scored tasks.

The autorun Routine is deleted. Reps 2 and 3 were not launched. Rep 1's nine
branches stand and are re-scoreable once the scorer is fixed.

### How the defect got in

It is the third Rule 1 failure in the same family, and it was caused by fixing
the second.

1. The original scorer applied every candidate tap through `reduceAt`, pinning a
   signature. A correct solution using its own applier was invisible.
2. Fixed by widening to *reachability*: try every exported function of `expr.ts`
   in two argument shapes, against every legal target, over 101 values.
3. That cost is `exports x object-returning-exports x values x targets`. This
   branch adds eight exports, and the product stopped terminating.

Widening a predicate to avoid asserting a signature made it unbounded. The
lesson is narrower than "do not pin names": a discovery predicate needs a
**bounded** search whose cost does not grow with the solution's shape.

### Options, none taken

1. **Bound the search.** Run each candidate application in a subprocess with a
   hard wall-clock limit; exhaustion reports *inconclusive*, never *fail*. Sound,
   because a synchronous loop cannot be interrupted in-process — which is why
   `--testTimeout` did nothing here. Slowest to write.
2. **Ask the widget's question instead.** T3a is about what a learner can tap, so
   drive the same path `reduceSlide.tsx` drives — `targets` plus the one applier
   the component actually calls — rather than enumerating the module. Narrow and
   fast, and it tests the real surface, but it re-couples the scorer to the UI.
3. **Drop T3a.** The pair step is already covered incidentally by the solvability
   sweep in `generators.test.ts`. Eight tasks, threshold becomes ≥4 of 24.

Whichever is chosen: it changes the instrument, so the freeze re-hashes and rep
1 is re-scored against the new hash before reps 2 and 3 run.
