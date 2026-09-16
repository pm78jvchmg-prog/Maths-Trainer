# v2 experiment — cost non-inferiority, both arms under one preamble

Rule frozen in `PREREGISTRATION.md` (amendments D1-D2): arm B fails no more
trials than arm A on the same tasks, **and** arm B's mean per-rep cost is at most
0.8x arm A's over the same nine sessions. Both parameters come from the v2 arm A;
only the formulas were fixed in advance.

## Smoke test — PASSED 2026-09-16 04:31

One Sonnet session, t7, under the exact v2 preamble plus the advisor block, in
the surplus `armB-rep3` repo. Every criterion met:

| Criterion | Result |
| --- | --- |
| Worked the task rather than querying the preamble | yes — no refusal, no injection language |
| Pushed its branch | `smoke-v2-t7` at `0919b1b` |
| Suite | 1919 passing |
| Advisor consulted | 1 consultation |
| Advisor model, verbatim from the log | `Model: Claude Opus 5 (1M context) (claude-opus-5[1m]).` |
| Cost / Opus-equivalent | 0.534 — **+33% over pure Sonnet**, so the advisor is billed in |

Against v1, where seven of nine Sonnet sessions were BLOCKED inside 30 seconds
with explicit prompt-injection wording. That failure mode did not reproduce.

Not scored, not counted, in either arm. `armB-rep3` is used for nothing else.

**A caution recorded against myself:** I called this test "passing" off a
28-second `task_summary` before it had done anything. It then read "incomplete
user message; task unclear" for several minutes before completing normally. A
single turn's summary is a paraphrase, not a verdict, and the pass condition was
always the branch — which is what settled it.

## Wave A1 — launched 2026-09-16 04:34

Nine Opus sessions, no advisor block, into `...-v2-armA-rep1`, verified before
launch to hold exactly the eight bases. Freeze verified `OK` at the same point.

| Task | Branch | Session |
| --- | --- | --- |
| t1 | `v2-armA-rep1-t1` | `session_01GzSsHteq5A2yAf5EVczjRm` |
| t2 | `v2-armA-rep1-t2` | `session_0191zfjMX83RrE4yeiQodCpV` |
| t3a | `v2-armA-rep1-t3a` | `session_01UVVWjKx7MBESakkq3Rx2sw` |
| t3b | `v2-armA-rep1-t3b` | `session_01KbAgYajV2dpT8CgFbRfqBu` |
| t4 | `v2-armA-rep1-t4` | `session_014UkC5HUXaxo1xChhpLzBmd` |
| t5 | `v2-armA-rep1-t5` | `session_01TSYtuV17nHxME65nB9Qk7Z` |
| t6 | `v2-armA-rep1-t6` | `session_011AuyS9LkNcmxv5oFTXCRgF` |
| t7 | `v2-armA-rep1-t7` | `session_01RyyWGSduW4LgKTvnmi1fFT` |
| t8 | `v2-armA-rep1-t8` | `session_01QMefAUosGa6NwWbkqKx7yP` |

## Remaining waves — one at a time, interleaved

| Wave | Arm | Repo | Branches |
| --- | --- | --- | --- |
| A1 | Opus, no advisor | `v2-armA-rep1` | **launched** |
| B1 | Sonnet + Opus advisor | `v2-armB-rep1` | `v2-armB-rep1-tN` |
| A2 | Opus, no advisor | `v2-armA-rep2` | `v2-armA-rep2-tN` |
| B2 | Sonnet + Opus advisor | `v2-armB-rep2` | `v2-armB-rep2-tN` |

Nine concurrent, never more. A killed session cannot be resumed, and per-repo
separation solved the leak, not the session limit. Interleaved so harness drift
across the night is not confounded with arm.

---

## Wave A1 scored — 2026-09-16 05:25. Freeze verified before and T5's scorer hash checked at use.

| | Scorer | Suite | `tsc` | Deletions read | Verdict |
| --- | --- | --- | --- | --- | --- |
| **T1** | green | 1916 | silent | 0 | **PASS** |
| **T2** | green | 2519 | silent | import rewrite only | **PASS** |
| **T3** | t3a green, t3b green | 2588 / 2583 | silent | see below | **PASS** |
| **T4** | green (3/3, SEEDS 200) | 219 | silent | oracle call only | **PASS** |
| **T5** | green (Playwright, 393px) | 1079 | silent | 0 | **PASS** |
| **T6** | green | 2241 | silent | import rewrite only | **PASS** |
| **T7** | green | 1924 | silent | 0 | **PASS** |
| **T8** | green | 2101 | silent | 0 | **PASS** |

**8 PASS, 0 FAIL, 0 INCONCLUSIVE of 8.**

**No session refused the v2 preamble.** All nine went to their tasks directly.
Together with the Sonnet smoke test, the replacement text is clean in both arms —
which is the point of re-running arm A rather than dropping the block from arm B.

### Constraint checks — every deleted line read

- **t2, t6** — one line each, the `import` statement widened.
- **t4** — the oracle call, replaced by the same call with `{ simplify: false }`.
- **t3a** — import rewrite plus one relocated line inside a rewritten walk;
  `it(` count 163 → 173.
- **t3b** — its licensed rewrite. The `out-of-order` assertions go as entailments
  of removing the rule; the guards that matter are rebuilt as value tests
  (`value: 36 → wrong-value` in `expr.test.ts`, `'r=36'` in `session.test.ts`).

`it(` counts, base → branch: t1 104→108, t2 163→168, t3a 163→173, t3b 163→168,
t4 60→60, t5 84→84, t6 156→162, t7 106→116, t8 100→106. **No branch ends with
fewer tests than its base.**

### Cost — the basket is all nine sessions, fixed

| t1 | t2 | t3a | t3b | t4 | t5 | t6 | t7 | t8 | **total** |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| $1.68 | $9.42 | $6.63 | $4.92 | $2.09 | $2.44 | $4.73 | $3.18 | $6.11 | **$41.2024** |

For reference only, not as a baseline: v1 arm A ran $47.04 and $41.67. The v2
threshold is computed from v2 arm A alone, after A2.

### Timing note

`t2` was still running at both the 05:02 and 05:21 checks — actively working, not
stalled — and finished unaided at 05:08 with the most expensive session of the
wave at $9.42. It was never resumed. The resume rule fires on failure or on idle
with nothing pushed, and neither held.

### Recorded: stale footer in `score.sh`

The script still prints "Rule 0 ... 24 trials over three reps" after each run.
That is v1 text and no longer describes this experiment, which is two reps per
arm under the pre-registered non-inferiority rule. It is display only — it feeds
no verdict — and `score.sh` is deliberately not edited mid-run. Ignore that line.

---

## Wave B1 — launched 2026-09-16 05:28

Nine Sonnet sessions with the Opus advisor, into `...-v2-armB-rep1`, verified at
launch to hold exactly the eight bases. Task text and v2 preamble byte-identical
to A1; the only additions are the model and the advisor block.

| Task | Branch | Session |
| --- | --- | --- |
| t1 | `v2-armB-rep1-t1` | `session_017rLhPXUR2vnT5cDVJQ39Wa` |
| t2 | `v2-armB-rep1-t2` | `session_01W9jZqiZCPj15rTFr4pUbMf` |
| t3a | `v2-armB-rep1-t3a` | `session_01Ex7e4Q4Q3jfp3xmyTzTjbj` |
| t3b | `v2-armB-rep1-t3b` | `session_01Ns63pbFXQ7wzWFLQtRysJQ` |
| t4 | `v2-armB-rep1-t4` | `session_01YTAwnT3hg3TBsQ9TLF9BCu` |
| t5 | `v2-armB-rep1-t5` | `session_01BtczAzC1CogABGaPaW4WXj` |
| t6 | `v2-armB-rep1-t6` | `session_017tyiDkE6gc9JeYYFTKN6X6` |
| t7 | `v2-armB-rep1-t7` | `session_014fKFFwhiybtRTHQmGANa9a` |
| t8 | `v2-armB-rep1-t8` | `session_01WQCZcofRwmYNoKXVjfSiGL` |

Waves A2 and B2 follow, one at a time. No verdict until all four are scored.

