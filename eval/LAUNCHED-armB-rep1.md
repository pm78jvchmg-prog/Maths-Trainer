# Arm B rep 1 — launched 2026-09-16 00:15 UTC

Nine sessions, `claude-sonnet-5`, with the Opus advisor appended as a system
prompt. Rooted in `maths-trainer-eval-subject-armB-rep1`, verified immediately
before launch to hold only the eight `eval-base-t*` branches. Freeze, including
`PREREGISTRATION.md`, verified `OK` at the same point.

Task prompts byte-identical to arm A's. The only difference between the arms is
the model and the appended advisor block — which arm A never saw, so adding the
model-reporting line required by amendment A3 changes no shared text.

| Task | Base | Outcome branch | Session |
| --- | --- | --- | --- |
| t1 | `eval-base-t1` | `armB-rep1-t1` | `session_014pgFaLFGjLuKe3Df2yF1AW` |
| t2 | `eval-base-t2` | `armB-rep1-t2` | `session_015SvbedANczFFcpVqnDAdbf` |
| t3a | `eval-base-t3` | `armB-rep1-t3a` | `session_015KdwBpYuLy547RW1aB2qx1` |
| t3b | `eval-base-t3` | `armB-rep1-t3b` | `session_01SHRW5PVgzGAg95cRHfYhf3` |
| t4 | `eval-base-t4` | `armB-rep1-t4` | `session_01GvXXiFkUkNgAFHy2gLLoCA` |
| t5 | `eval-base-t5` | `armB-rep1-t5` | `session_012QHo7vpJMNTywrtcZ9sYEv` |
| t6 | `eval-base-t6` | `armB-rep1-t6` | `session_01F41EppVNBLpPuiaXcfbykV` |
| t7 | `eval-base-t7` | `armB-rep1-t7` | `session_018Ez1rBLoyrjErG2AdoWdnG` |
| t8 | `eval-base-t8` | `armB-rep1-t8` | `session_011oMZ1JvpS9qqhdkpY8uSF4` |

Nine concurrent, matching arm A exactly. Concurrency is a second way the arms
could have differed, and it does not.

## Before any branch of this arm is scored

The two cost-validity checks from amendment A3 run on the **first completed
session**, and no branch is scored until both pass:

1. Is the advisor's cost counted in `cost_usd` at all? Arm A had no subagents,
   so arm A cannot settle it. If the advisor is uncounted, arm B's cost is
   understated and the cost clause is void until it is fixed.
2. Is the advisor actually Opus? `.claude/settings.json` is in every base tree
   setting `CLAUDE_CODE_SUBAGENT_MODEL: sonnet`; the per-call `model: "opus"`
   is expected to win but that is documentation, not evidence. Each log entry
   now records the model the advisor reported for itself.

Both defects understate the challenger, which is the fatal direction. Neither
is assumed to be fine.
