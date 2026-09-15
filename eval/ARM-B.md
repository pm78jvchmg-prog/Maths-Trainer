# Arm B — Sonnet executor with an Opus advisor

Design decisions, fixed before arm B rep 1 launched at 12:31Z on 2026-09-15.
Bases, task prompts, scorers and the isolation preamble are all unchanged from
arm A (freeze `6338653`). Branches are `eval/tN-b1`, `-b2`, `-b3`.

## The advisor is an Opus subagent, not the advisor tool

The `advisor_20260301` beta is an API-level tool. A remote Claude Code session
cannot call `advisor()`, so the nearest available analogue is used instead: the
executor is Sonnet 5, and it is told to consult a `general-purpose` subagent
spawned with `model: "opus"` before planning and whenever it is stuck.

`.claude/settings.json` pins subagents to Sonnet, but the Agent tool's per-call
`model` parameter overrides that, so nothing had to be added to the base
commits. That matters: every base is byte-identical to the one arm A ran on.

## The executor prompt is the advisor instruction and nothing else

`EXECUTOR-PROMPT.md` was drafted for this arm, and it cannot be used. Lines
111–124 give away three of the eight tasks outright:

| Line | Task it answers |
| --- | --- |
| "Remove the 'redundant' `{ ...scope }` copy … mathjs evaluates `x=0` as an assignment that *writes into scope*" | **T1** |
| "cannot be split across fragments, so nothing inside it becomes tappable" | **T2** |
| "Fractional indices need `domain: 'positive'`" | **T8** |

It also points at `PITFALLS.md`, which answers those three and T3's
`out-of-order` fault as well. Handing either to arm B would measure retrieval,
which is exactly what voided the first baseline attempt on 2026-09-14.

Neither file is reachable from a task clone — both were committed to `main`
long after the bases, and the clone is single-branch — so the leak could only
have come through the system prompt. It does not. The appended prompt is:

> You have an advisor: a stronger model you can consult at any time.
>
> Before you plan, consult it. Call the Agent tool with subagent_type
> "general-purpose" and model "opus", give it the full problem statement and
> everything you have found so far, and ask for its diagnosis and its
> recommended approach. Plan only after it has answered. If its guidance
> conflicts with your own plan, follow the advisor.
>
> Consult it again whenever you are unsure, whenever your first fix does not
> work, and before you commit.

Everything else an executor might need — the three invariants, the toolchain,
the TeX escaping hazard, the testing strategy — is in the repository's own
`CLAUDE.md`, which is in every base clone and which arm A's agents read too.
So the single variable between the arms is the model and its advisor.

## What this does and does not measure

It compares **Opus alone** against **Sonnet with an Opus advisor**. It does not
separate the model change from the advisor's contribution: a Sonnet-solo arm
would be needed for that, and was considered and set aside as 24 more sessions.
If arm B matches arm A, the open question is whether the advisor did the work
or Sonnet did — worth one extra arm before acting on the result.

## Rep 1 sessions

| | Session | Branch |
| --- | --- | --- |
| T1 | `session_012nY1jF4JiBL22P5uet36QW` | `eval/t1-b1` |
| T2 | `session_01HMuJYvoReZkbUfKrVV8fyq` | `eval/t2-b1` |
| T3 | `session_01A9oR53RQiMrgXAYXhLXnpm` | `eval/t3-b1` |
| T4 | `session_01Pu7StwDTkFFz9cmfnnT2Ke` | `eval/t4-b1` |
| T5 | `session_01Cc7u12ydeH1tvRrAQ299VY` | `eval/t5-b1` |
| T6 | `session_01Y8rVfF6Do7CEZNqP9Udb7K` | `eval/t6-b1` |
| T7 | `session_0131YPQmxg364z95Amvk6TXu` | `eval/t7-b1` |
| T8 | `session_01W2veqqmFEUiCGs9JTSTMyD` | `eval/t8-b1` |

Watch T1 and T3: arm A failed both in all three reps, each time by satisfying
one of the task's two requirements and stopping.
