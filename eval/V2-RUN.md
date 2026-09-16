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
