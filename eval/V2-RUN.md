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

---

## Wave B1 scored — 2026-09-16 06:30. Freeze verified; T5 scorer hash checked at use.

| | Scorer | Suite | `tsc` | Verdict |
| --- | --- | --- | --- | --- |
| **T1** | green | 1914 | silent | **PASS** |
| **T2** | green | 2506 | silent | **PASS** |
| **T3** | **t3a RED**, t3b green | 2578 / 2578 | silent | **FAIL** |
| **T4** | green (3/3, SEEDS 200) | 219 | silent | **PASS** |
| **T5** | green (Playwright, 393px) | 1079 | silent | **PASS** |
| **T6** | green | 2237 | silent | **PASS** |
| **T7** | green | 1922 | silent | **PASS** |
| **T8** | green | 1900 | silent | **PASS** |

**7 PASS, 1 FAIL, 0 INCONCLUSIVE of 8.** Cost over the fixed nine-session
basket: **$32.8967**.

**No B1 session refused the v2 preamble** — third independent confirmation after
the smoke test and all of wave A1.

### The T3 failure is clean and behavioural

    FAIL src/content/t3a.test.ts > offers a step that collapses 4 - 3 and leaves the root alone
    AssertionError: no legal tap produces sqrt(36) + 1: expected false to be true

No legal tap produces the pair step, which is exactly what the task asks for.
Not a scorer artefact, not a timeout — the behaviour is absent.

Constraint checks clean: t2/t6 import rewrites, t4's oracle call, t3b's licensed
rewrite with wrong-value guards rebuilt (`value: 36`, `value: 21`, `value: 6`,
`value: 3` all → `wrong-value`). No branch loses tests.

### CORRECTION — "Sonnet is exactly 0.4x Opus" was wrong, and I over-claimed it

Amendment C1 said six v1 sessions at exactly 0.400 gave an exact Sonnet
calibration, and described them as "six independent sessions, differing token
mixes, one ratio". **The mixes were not differing.** All six had
cache_read/cache_write ≈ 1.8. It was one mix measured six times.

These nine sessions have cache_read/cache_write from 22.9 to 103, and their
ratios spread **0.369 to 0.550**. A single scalar does not describe the
Sonnet:Opus relationship — the ratio depends on token mix, so 0.400 is withdrawn
as a universal constant.

That is the second time I have overstated this cost evidence. The first was
assuming Sonnet = Opus/5; the correction to it introduced a different error of
the same kind.

### What still establishes that the advisor's cost is billed in

Not a constant — a **matched pair**:

| | cache_read | cr/cw | cost | ratio |
| --- | --- | --- | --- | --- |
| `t1`, log records advisor as **"Sonnet 5"** | 2.88M | 22.9 | $1.2272 | **0.369** |
| `t5`, log records advisor as **"Claude Opus 5"** | 2.80M | 25.7 | $1.6486 | **0.539** |

Near-identical scale and mix; the Opus-advised session costs 34% more. Advisor
cost is therefore reaching the session's `cost_usd`. This is weaker than a fitted
rate model and it is stated as what it is.

### FLAG — `v2-armB-rep1-t1` may not have run arm B at all

Its `eval-advisor.log` line 3 reads, verbatim:

    Model: Sonnet 5

Every other branch that recorded a model reports Opus 5 (`t2`, `t3a`, `t3b`,
`t4`, `t5`, `t6`, `t7`). `t8`'s advisor did not self-identify and its log says so
honestly.

Two independent signals agree on t1: the log text, and the lowest cost ratio of
the nine at a mix matched to `t5`. If its advisor really was Sonnet, t1 is
Sonnet-advising-Sonnet — a different configuration, and the **cheapest session of
the wave at $1.23**, which understates arm B's cost. That is the fatal direction.

Against that: a model asked to name itself is not a reliable witness, which is
part of why the cost check exists as a second signal. Certainty is not available
from what is recorded.

**Not resolved unilaterally.** `PREREGISTRATION.md` B2 covers zero-consultation
branches; t1 consulted, but plausibly the wrong model, which the text does not
cover. Applying B2's spirit voids rep 1; keeping t1 accepts a branch that may not
be arm B. The owner decides. Wave B1's numbers above stand as recorded either
way.

### Advisor audit — all nine branches

| branch | consultations | advisor model as logged |
| --- | --- | --- |
| t1 | 1 | **Sonnet 5** ← flagged |
| t2 | 1 | Opus 5 (1M context) |
| t3a | 1 | I am Claude Opus 5 (1M context) |
| t3b | 1 | claude-opus-5[1m] |
| t4 | 1 | Claude Opus 5 (1M context) |
| t5 | 1 | I'm Claude Opus 5 (1M context) |
| t6 | 1 | Claude Opus 5 (1M context) |
| t7 | 1 | I'm Claude Opus 5 (1M context) |
| t8 | 1 | did not self-identify; log records the omission |

**Zero branches with zero consultations**, so B2's >2-of-16 void rule does not
fire on that count.

---

## t1 RESOLVED — the advisor was Opus; the log line is a mislabel. B1 stands at 7/8.

The telemetry that would have settled this by a field no model wrote — a
per-iteration `advisor_message` type carrying a `model` — **is not reachable from
this session.** `list_events` is named in `create_session`'s own description but
is not among this session's tools, and `get_session`'s `usage` is a flat object
(`cache_read_tokens`, `cache_write_tokens`, `cost_usd`, `input_tokens`,
`output_tokens`) with no iteration breakdown. Verified, not assumed.

So the question was resolved from three things instead.

### 1. My cost signal was not weak — it was uninformative, and I misused it

I know the pure-Sonnet cost ratio at **one** token mix: cache_read/cache_write
≈ 1.8, where it is 0.400. `t1` sits at cr/cw = 22.9. I have no Sonnet rate model
at that mix, so **0.369 cannot be compared to anything.** I was treating an
unknown as evidence, one amendment after withdrawing a scalar for the same
reason.

### 2. The `Model: Sonnet 5` line is not the verbatim quotation the prompt demanded

Every other branch that captured it quotes the advisor directly — *"I'm Claude
Opus 5 (1M context)"*, *"I am Claude Opus 5 (1M context)"*, *"claude-opus-5[1m]"*.
`t1`'s is a bare label in the executor's own voice, in a log that elsewhere
writes *"Corrected one detail in **my** framing"*. **The executor is Sonnet 5.**
The natural reading is that it labelled the consultation with its own model
rather than recording the advisor's line.

Its recorded advisor answer also *corrects the executor's premise* on a subtle
point — that `x=3` vs `3` does not take a separate no-variable branch — which is
the same pattern the Opus advisor showed on t7, t8 and the smoke test.

### 3. A direct probe of the mechanism

Run in this repository, which carries the identical `.claude/settings.json` the
bases carry (`CLAUDE_CODE_SUBAGENT_MODEL: sonnet`, `_FORCE` unset): an Agent call
with `model: "opus"` replied

    I am Claude Opus 5 (model ID: claude-opus-5).

**The per-call override beats the env var.** That is the mechanism amendment A3
Check 2 was written to test, and it holds.

### Verdict and residual risk

`v2-armB-rep1-t1` ran arm B. Its log line is a reporting defect, not a
configuration failure. **Wave B1 stands at 7 PASS / 1 FAIL of 8, $32.8967.**

The probe tested this session's container, not t1's. A per-call intermittent
failure cannot be excluded from what is recorded — but seven sibling sessions in
that same repository did get Opus, so the mechanism demonstrably works there.
Logged as residual, not resolved away.

## The quality clause is now load-bearing, and the amendment decides the verdict

Arm A rep 1: **8/8**. Arm B rep 1: **7/8**. Cost ratio for the single rep:
**$32.8967 / $41.2024 = 0.798**.

Read against the rules as they stand and as they stood:

| Rule | Quality | Cost | Verdict |
| --- | --- | --- | --- |
| Original (B1): "at most 1 failure" | 1 failure — **passes** | 0.798 <= 0.8 — **passes** | **SWITCH** |
| Amended (D1): "fails no more than arm A" | 1 > 0 — **fails** | never read | **NO SWITCH** |

0.798 clears the 0.8 threshold by a quarter of a percent. Under the rule I had
written, arm B would have switched on that margin. Under the amendment — quality
relative to the measured baseline rather than an absolute tolerance — it does
not, and cost is never reached.

Not a verdict: two waves remain and both thresholds are evaluated only after all
four. Recorded now, before A2 and B2 produce numbers, so it cannot be read back
as a post-hoc rationalisation of whichever way they land.

### T3 is the first real signal in the exercise

Arm A passed t3a in rep 1. Arm B failed it on a clean behavioural assertion.
Under non-inferiority, one failure against a baseline of zero is a detected
difference — which is precisely what a ceiling makes measurable and superiority
did not.

