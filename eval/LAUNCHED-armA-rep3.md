# Arm A rep 3 — launched 2026-09-15 23:02 UTC

Nine sessions, `claude-opus-5`, no advisor, no appended system prompt. Rooted in
`maths-trainer-eval-subject-armA-rep3`, re-verified immediately before launch to
hold only the eight `eval-base-t*` branches at the frozen SHAs. Freeze verified
`OK` at the same point.

Prompts are byte-identical to rep 2's apart from the repository URL and the
branch name.

| Task | Base | Outcome branch | Session |
| --- | --- | --- | --- |
| t1 | `eval-base-t1` | `armA-rep3-t1` | `session_01HWeqpJ4rc4pYtvgVidxJoh` |
| t2 | `eval-base-t2` | `armA-rep3-t2` | `session_01A339JsPmGae9MpC8PvcxNL` |
| t3a | `eval-base-t3` | `armA-rep3-t3a` | `session_01CDs3nhfTmUYxTYobaPvxQX` |
| t3b | `eval-base-t3` | `armA-rep3-t3b` | `session_016rB9mHBkUs47BBqdsoG4FY` |
| t4 | `eval-base-t4` | `armA-rep3-t4` | `session_01MkCetBZDfEB1FRBHC7woM1` |
| t5 | `eval-base-t5` | `armA-rep3-t5` | `session_01LjTmhdvGRq7kbR7F1vbRcE` |
| t6 | `eval-base-t6` | `armA-rep3-t6` | `session_01JCsW2HbTnaVLhMRPUz6As6` |
| t7 | `eval-base-t7` | `armA-rep3-t7` | `session_01Pub4Wpp1CwWF5yK6qeLgeq` |
| t8 | `eval-base-t8` | `armA-rep3-t8` | `session_0141gWhxsSbSw85q6M9VBTC1` |

Expect the same permission refusal on the preamble's git commands as rep 2 —
symmetric across arms, does not void the rep, and no session is to be messaged
about it.

This rep closes arm A. Once scored, the gate is decided: reps 1, 2 and 3 must
agree within 2 tasks of 8, or the comparison stops before arm B runs.
