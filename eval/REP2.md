# Arm A (Opus-solo), rep 2 — scored against freeze `2a557fa`

Run 2026-09-15. Bases and scorers unchanged from rep 1; the frozen instrument
is byte-identical (verified: every file under `eval/scorers/` and the verbatim
block in `PROMPT_PREAMBLE.md` match `2a557fa`). Prompts are identical to rep 1
in every respect, including the isolation preamble.

Isolation is now a property of the harness rather than of agent compliance —
see `README.md` § Isolation. Three of the four sessions in batch 1 had the
preamble's `git remote remove origin` refused by the permission classifier and
ran without it; that no longer affects the result, because the clone is
single-branch and carries neither the scorers nor rep 1's branches.

## Batch 1 — T1 to T4

| | Head | Scorer | Suite | `tsc` | Verdict | Cost |
| --- | --- | --- | --- | --- | --- | --- |
| **T1** | `d19c0e4` | **2 of 45 red** | 1926 green | silent | **FAIL** | $2.76 |
| **T2** | `9f25466` | green | 2703 green | silent | **PASS** | $8.73 |
| **T3** | `c44605e` | **1 of 5 red** | 2595 green | silent | **FAIL** | $11.40 |
| **T4** | `2236ed9` | n/a (run discipline) | 3 × 219 green | silent | **PASS** | $2.80 |

Batch 1: **2 / 4**.

## Batch 2 — T5 to T8

| | Head | Scorer | Suite | `tsc` | Verdict | Cost |
| --- | --- | --- | --- | --- | --- | --- |
| **T5** | `23ea2d3` | green (Playwright, 393px) | 1079 green | silent | **PASS** | $2.94 |
| **T6** | `62b2e3c` | green | 2237 green | silent | **PASS** | $2.64 |
| **T7** | `36ac78b` | green | 1928 green | silent | **PASS** | $3.94 |
| **T8** | `35f04e3` | green **after a scorer fix** | 1915 green | silent | **PASS** | $6.89 |

No test was deleted, skipped or `.only`'d on any of the eight branches; every
`git diff eval-base-tN -- '*.test.ts'` is additions only, bar T3's rewrite of
the solvability walk and T4's `simplify: false` line, both read in full.

## Rep 2 total: 6 / 8

| | Rep 1 | Rep 2 |
| --- | --- | --- |
| T1 | FAIL | FAIL |
| T2 | PASS | PASS |
| T3 | FAIL | FAIL |
| T4 | PASS | PASS |
| T5 | PASS | PASS |
| T6 | PASS | PASS |
| T7 | PASS | PASS |
| T8 | PASS | PASS |

**Eight of eight agree.** Rule 4's stability bar (reps disagreeing on more than
2 of 8 means the tasks are wrong) is met with room to spare. T1 and T3 failing
identically twice is the stronger result: both are tasks stating two
requirements, and both times the agent satisfied one and stopped.

Rep 2 cost **$42.11** across the eight sessions, from $2.64 (T6) to $11.40
(T3).

## Why T1 failed

The fix rejects an equation at parse time, so `checkAnswer` returns `invalid`
for anything containing `=`. That closes the hole, but it is the failure mode
the task was written around: the scorer requires `check('x=3', '3')` and
`check('y=2x', '2x')` to stay `correct`, and both now come back `invalid`. The
assignment-leak assertions fail for the same reason — they expect `incorrect`,
not `invalid`, because `invalid` does not cost the learner their first-try
credit.

Not a vocabulary artefact (Rule 1b): the scorer calls only `checkAnswer`, which
is present and unchanged at the base, and asserts return values rather than
identifiers.

## Why T3 failed

Half the task landed. The pair step works — `sqrt(36) + 4 - 3` can be taken as
`4 - 3` and yields `\sqrt{36} + 1`. The second half did not: `replay` still
raises `out-of-order`, so settling the whole line in one tap with the right
number (`8 + 4 x 3` as 20) is refused. The task states that requirement
explicitly in its second paragraph.

Also behavioural, not vocabulary: `replay` and the `out-of-order` fault both
exist at the base, and the assertion reads the fault the base already produces.

## Agreement with rep 1

| | Rep 1 | Rep 2 |
| --- | --- | --- |
| T1 | FAIL | FAIL |
| T2 | PASS | PASS |
| T3 | FAIL | FAIL |
| T4 | PASS | PASS |

Four for four so far, so nothing yet against the Rule 4 stability bar (reps
disagreeing on more than 2 of 8 tasks means the tasks are wrong, not the
model). T1 and T3 failing identically twice is the stronger signal: both are
tasks with two requirements where the agent satisfied one.

## T4 took a different route to the same verdict

Rep 1 raised the oracle test's budget to 60s. Rep 2 removed the cost instead —
`math.derivative(..., { simplify: false })`, on the grounds that the oracle is
consumed by numeric probing so a tidier string buys nothing. The suite drops
from ~21s to ~4s. Both pass the criterion: `SEEDS` is still 200, both
difficulties still sweep, no test was deleted, skipped or `.only`'d, and the
oracle is still a real symbolic derivative. Worth noting because the criterion
was written expecting the timeout fix, and a narrower one phrased as "the
timeout is raised" would have marked a better answer wrong.

## T8 exposed a second Rule 1 failure in the instrument

T8 first scored FAIL: `fractionalIndexSlide()` returned `undefined`, so four of
its five assertions died on `Cannot destructure property 'slide' of 'found'`.

The generator was there. `idx-root-as-index` answers `x^((3)/(2))`, and the
discovery regex was

```
/\^\s*\(?\s*-?\d+\s*\/\s*\d+/
```

— one optional open paren, where the answer has two. The repo's own convention
is the reason: `answer` is parsed by mathjs and never displayed, so it is
deliberately over-bracketed for unambiguity (CLAUDE.md, "Two string
audiences"). The scorer was asserting a *spelling* of the answer, which is the
same mistake as rep 1's `domain: 'positive'` one level down — naming was fixed,
bracketing was not.

Widened to `/\^\s*\(*\s*-?\s*\(*\s*-?\d+\s*\)*\s*\/\s*\(*\s*\d+/`
and re-checked in both directions (Rule 1c):

| | Verdict |
| --- | --- |
| Base `96cf78e` | **red** — on "accepts a root written as an index", which is the bug |
| Arm A rep 1 `eval/t8` | green, 5 of 5 — **verdict unchanged** |
| Arm A rep 2 `eval/t8-r2` | green, 5 of 5 — FAIL → **PASS** |

Rule 2 requires a mid-run scorer fix to re-run both arms. Arm B has not
started, and re-scoring is not re-running: the branches already exist, so both
arm A reps were re-scored against the fixed scorer at no compute cost. Rep 1's
six other verdicts are untouched — the change is confined to `t8`'s own file.

The freeze is re-hashed accordingly. Rep 1 and rep 2 are both scored against
the new hash.

## Operational note

All four finished their work and then stopped, committed but unpushed, asking
for a push go-ahead. Sessions were unblocked with a session-bound Routine
(`create_trigger` with `persistent_session_id`, then `fire_trigger`), which
delivers a prompt into a named running session. `SendMessage` does not reach
cloud sessions — they do not appear in `ListAgents` — so this is the working
mechanism for resuming or steering a remote eval session, and it is what should
have been used instead of relaunching the two batches killed by rate limits on
2026-09-14.
