# Arm B rep 1 (Sonnet executor, Opus advisor) — scored against freeze `6338653`

Launched 12:31Z on 2026-09-15, all eight together. Bases, task prompts, scorers
and the isolation preamble identical to arm A; the only additions are the model
(`claude-sonnet-5`) and the appended advisor instruction recorded in
`ARM-B.md`. Scored with `eval/bin/score.sh -b1` in 4m28s.

| | Scorer | Suite | `tsc` | Verdict |
| --- | --- | --- | --- | --- |
| **T1** | **2 of 45 red** | 1921 green | silent | **FAIL** |
| **T2** | green | 2512 green | silent | **PASS** |
| **T3** | **2 of 5 red** | 2579 green | silent | **FAIL** |
| **T4** | n/a (run discipline) | 3 × 219 green | silent | **PASS** |
| **T5** | green (Playwright, 393px) | 1079 green | silent | **PASS** |
| **T6** | green | 2238 green | silent | **PASS** |
| **T7** | *never started* | — | — | *pending* |
| **T8** | green | 1899 green | silent | **PASS** |

**5 of 7 scored. T7 outstanding.**

## No test was weakened

One deleted line across seven branches: T4's `math.derivative(slide.source,
'x')`, replaced with the same call taking `{ simplify: false }` — the third arm
to reach that fix independently.

T2's and T8's suites are smaller than arm A's on the same task (2512 against
2704; 1899 against 2076), which is not a deletion. Checked against the bases:
base t2 runs 2506 and base t8 1886, so arm B added 6 and 13 tests where arm A
added 198 and 190. Both arms are additions only; arm A simply wrote far more
test.

## T3 is worse here than anywhere in arm A

The task states two requirements. Across four attempts nobody has met both, but
arm B rep 1 is the first to meet **neither**:

| | Pair step | Value-only grading |
| --- | --- | --- |
| Arm A rep 1 | not met | met |
| Arm A rep 2 | met | not met |
| Arm A rep 3 | met | not met |
| **Arm B rep 1** | **not met** | **not met** |

Both failures are behavioural, not Rule 1 artefacts: the pair-step assertion now
tests reachability through any exported applier (widened after arm A rep 3), and
it still finds no legal tap producing `\sqrt{36} + 1`.

## T1 fails a fourth time, by the same mechanism

`invalid` where the scorer wants `correct` and `incorrect` — the equation is
rejected at parse time rather than the shared probe scope being isolated. Four
attempts across two arms and two models, and the tempting fix has won every
time. That is now a finding about the bug, not about the model.

## T7 never started — and the preamble is why

T7 sat blocked on the isolation preamble from 12:32Z, having spent $0.10 and
written nothing. Poked at 12:52Z to skip it; it asked about the same commands
again and stalled a second time. Only a message withdrawing the preamble
outright and restating the task got it moving, at 13:26Z — **54 minutes lost on
an instruction the experiment does not need.**

Arm A's agents never did this. They were denied the commands, said so, and
carried on with the task; this one treated the confirmation as the task. That
is a real difference between the arms, but it is a difference in how each model
handles a **pointless instruction**, not in how it fixes code — and it arrives
as a confound, because T7 in arm B has now been prompted differently from T7
anywhere in arm A.

T7's result will be recorded with that caveat attached. It is the clearest
possible argument for `EVAL_PROTOCOL.md` Rule 2b: drop the preamble before the
next experiment.
