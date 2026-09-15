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

Batch 1: **2 / 4**. Batch 2 (T5–T8) launched 10:29Z, pending.

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

## Operational note

All four finished their work and then stopped, committed but unpushed, asking
for a push go-ahead. Sessions were unblocked with a session-bound Routine
(`create_trigger` with `persistent_session_id`, then `fire_trigger`), which
delivers a prompt into a named running session. `SendMessage` does not reach
cloud sessions — they do not appear in `ListAgents` — so this is the working
mechanism for resuming or steering a remote eval session, and it is what should
have been used instead of relaunching the two batches killed by rate limits on
2026-09-14.
