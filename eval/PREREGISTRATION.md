# Pre-registration — cost non-inferiority, arm B

Written **2026-09-16, before any arm B session was launched** and before any arm
B number existed. Hashed into `eval/INSTRUMENT.sha256`. If this file's hash
changes after arm B runs, the result is void.

This replaces the superiority test, which is dead: arm A finished 22 PASS / 0
FAIL / 2 INCONCLUSIVE of 24, and `EVAL_PROTOCOL.md` Rule 0 needs arm B to exceed
arm A by 4 trials of a maximum it already holds. Rule 0 is not amended, rescaled
or reinterpreted — it is **retired as inapplicable**, and this is a different,
separately stated question.

## The question

Not "is arm B better". It never was. It is: **can this project switch to the
cheaper configuration without losing quality?** That is non-inferiority on
quality plus a cost threshold, and a ceiling is a good place to ask it — with arm
A at 22/22, any arm B failure is visible immediately.

## Arm B

Sonnet executor with an Opus advisor. **Two reps**, not three: cost converges
fast, but eight trials cannot separate 22/22 from 20/22, and quality is the
clause doing the work. Sixteen sessions.

Prompts byte-identical to arm A's, plus the advisor block appended as a system
prompt. Own subject repo per rep, holding the eight bases only.

## The switch rule — all three clauses, fixed now

Switch **only if all three hold**. Any one failing means no switch.

### 1. Quality — non-inferiority

**Arm B fails no more than 1 live trial.** Two failures: no switch, whatever the
cost does.

A task is **live** only if every scored trial of it, in both arms, is conclusive.
Applying that to arm A's closed record, before arm B runs:

| Task | Arm A trials | Live? |
| --- | --- | --- |
| T1, T2, T4, T5, T6, T7, T8 | 3 conclusive each | **live** |
| T3 | INCONCLUSIVE in reps 1 and 3 | **not live — excluded now** |

So the live set is **seven tasks**: arm A 21 trials with 0 FAIL, arm B 14 trials.

T3 is still run and still scored. It is excluded from the quality clause and
feeds the defect register, which is where it has actually been informative.

**One honesty note on the threshold, recorded before the data.** The instruction
was "no more than 1 of 22 live trials". Arm B has 14 live trials, not 22, so
taking "1 failure" as an absolute count is very slightly *looser* than the same
rate (1/22 of 14 is 0.64). I have **not** rescaled it, because rescaling a
frozen threshold is the exact error made three times in this project, and every
one of those loosened it toward switching. The absolute count of 1 stands, the
direction of the discrepancy is toward switching, and it is written here rather
than discovered afterwards. Tighten it to 0 before arm B is scored if you want
the strict reading; do not tighten it after.

### 2. Cost

**Arm B's mean cost per rep must be ≤ 0.8 × arm A's.**

Arm A's baseline, fixed now from the two reps whose per-task costs were captured
in full:

| | rep 2 | rep 3 | mean |
| --- | --- | --- | --- |
| Arm A, nine prompts | $47.0374785 | $41.674427 | **$44.3559528** |

**Threshold: arm B's mean per-rep total must not exceed $35.4848.**

Rep 1 is excluded from the baseline on two independent grounds: its per-task
costs were never captured, and it ran under the pre-rewrite T1 and T3b prompts.

0.8×, not Rule 0's 1.2×. That 1.2× was written for a superiority test, where a
cost premium could be bought with better work. Nothing is being bought here —
quality is only being held level — so the cost clause has to be the thing that
justifies the change on its own.

Both arms carry the same constant overhead from the harness refusing the
preamble's git commands. A constant added to both pushes a ratio toward 1, which
makes a 0.8× threshold **harder** to meet, not easier. That direction is
conservative and the clause is left as-is.

### 3. Defects — named secondary outcome

Hangs, non-terminating exports and unhandled throws on ordinary input, counted
per arm, reported separately from pass/fail. **Arm A: 2** (`pairBank` on
`armA-rep1-t3a` and `armA-rep3-t3a` — two of three attempts at one task, each
with a green suite and a silent typecheck).

This is promoted from a footnote because it was the only thing that
distinguished one attempt from another across the entire arm A run, and binary
scoring discarded it twice as INCONCLUSIVE. **Arm B scoring more than 2 is a
finding to report on its own**, and it does not need to change the verdict to
matter.

## Scoring

Same frozen instrument, same eight scorers, same procedure as arm A reps 2 and
3. Additionally: `eval-advisor.log` read per branch to confirm the advisor was
actually consulted — an arm B that never consulted Opus is not arm B.

Constraint calls that are close go to one pass over both arms' branches under
opaque names, not settled arm-by-arm. Clean-cut calls inline. Which was which
gets recorded.

## What this cannot tell you — to be written into the conclusion, not around it

**These eight tasks are ones Opus solves reliably — 22 of 22.** So a
non-inferiority result here means precisely:

> On work Opus finds easy, Sonnet with an Opus advisor is also fine.

It says **nothing** about the cases where a downgrade would actually hurt,
because this task set contains none of them. The set was built two days ago to
be difficult and turned out not to be; two of its apparent failures were prompt
defects rather than hard problems.

A "switch" verdict is therefore a statement about the easy end of the work, and
any conclusion that omits this sentence is misreporting the result.

The untested question — whether that transfers to work Opus finds hard — is not
answerable by adding reps. It needs either a task set on which arm A genuinely
fails, or a period of real use on live Maths-Trainer work watching cost and how
often Opus gets reached for anyway.

---

# Amendments from the adversarial audit — still before any arm B session ran

Three defects, all found by auditing this document against the arm A record
before launch. Two biased toward switching.

## A1. A conclusive FAIL by arm B on T3 counts against the quality clause

Excluding T3 was forced — arm A is inconclusive on it in two of three reps, so
there is no baseline to compare against. But T3 is the hardest task in the set
and the only one where attempts visibly differed. Removing it deletes arm B's
most likely failure from the clause.

**Direction: inflates arm B. Fatal, and fixed rather than logged.**

So, asymmetrically and deliberately: an arm B **INCONCLUSIVE** on T3 is excluded
as before, and an arm B **conclusive FAIL** on T3 counts as a failure against the
quality clause. The asymmetry can only ever make switching harder, which is the
direction an unavoidable exclusion should lean.

## A2. Zero-consultation branches — decided now, not after the data

An arm B branch that never consults the advisor is not arm B. It is Sonnet solo:
a different configuration, and a cheaper one. Leaving the handling undefined
would leave a free parameter to be settled once the numbers are visible.

**Direction: undefined now means decided later, which biases toward whatever the
result wants. Fixed before launch.**

- A branch whose `eval-advisor.log` records **zero consultations** is
  **INCONCLUSIVE for quality** — it did not run the configuration — and is
  **excluded from the cost mean**, because its cheapness is not arm B's
  cheapness.
- If **more than 2 of the 16 branches** show zero consultations, arm B did not
  run the intended configuration and **no switch verdict is issued** at all.

## A3. Two cost-validity checks that must pass before any arm B branch is scored

The cost clause is the only thing that would justify this switch, so the cost
figure has to be shown to be measuring the right quantity. Neither check can be
run against arm A, which had no subagents.

**Check 1 — is the advisor's cost counted at all?** Arm B spawns its Opus
advisor through the Agent tool. If `get_session`'s `cost_usd` excludes in-process
subagent tokens, arm B's measured cost omits every advisor call.
*Direction: understates the challenger. Fatal.*
Settled by: taking the first completed arm B session, reading its consultation
count from `eval-advisor.log`, and checking whether `cost_usd` is consistent with
its own reported tokens at Sonnet rates alone. Sonnet-only pricing alongside
several substantive Opus consultations means the advisor is uncounted, and the
cost clause is void until it is counted.

**Check 2 — is the advisor actually Opus?** Verified during this audit:
`.claude/settings.json` is present in **every base tree** and sets
`CLAUDE_CODE_SUBAGENT_MODEL: sonnet`. Arm B's prompt asks for `model: "opus"` on
the Agent call. The repo's own `CLAUDE.md` says the per-call parameter wins and
that `CLAUDE_CODE_SUBAGENT_MODEL_FORCE` is deliberately left unset — but that is
documentation, not evidence. If the env var wins, "arm B" is Sonnet advising
Sonnet: cheaper, and not the configuration named.
*Direction: understates the challenger and tests the wrong thing. Fatal.*
Settled by: arm B's advisor block requires each log entry to record the model the
advisor reported for itself. A log showing Sonnet advising Sonnet voids the arm.

This adds a line to the **advisor block only**, which arm A never saw, so no
shared prompt text changes and arm A is untouched.

## Verified clean during the audit

- **No eval leakage in the bases.** `git ls-tree` on `eval-base-t3` shows no
  `eval/` directory at all — no tasks, no protocol, no run log, no arm A results.
  `.claude/` carries only `settings.json` and the unrelated `i-have-adhd` skill.
- **Freeze current**: all 8 scorers, 9 task files and the preamble verify `OK`.
- **Cost arithmetic confirmed** from the recorded per-task figures: rep 2
  $47.037478, rep 3 $41.674427, mean $44.355953, threshold **$35.4848**.
- **Isolation** is per (arm, rep) by separate repository — enforced by
  construction, the strongest class available — and arm B's three repos hold the
  eight bases and nothing else.
- **Branch naming** encodes arm and rep without a footnote.
- **`score.sh` is prefix-generic**, so `armB-rep1` works unchanged.

## Logged, not blocking

- **`score.sh` prefers a `<prefix>-<task>v2` branch** where one exists. None do
  for arm B. If one is ever created the scorer silently retargets — a trapdoor,
  not a live defect.
- **Blocked-tail cost.** Arm A's sessions that stalled on the refused preamble
  carried that tail inside their recorded cost. Arm B's must be counted the same
  way, including any one-resume. Symmetric between arms.

---

# Amendments B1-B3 — 2026-09-16 00:35, before any arm B branch was scored

## B1. Quality tightened to zero failures

Was "at most 1 failure". Now: **arm B is non-inferior only if it fails zero live
trials.** Any conclusive failure is a detected difference.

The looseness was flagged in the original draft rather than fixed, which was the
wrong response to noticing it. Arm A scored 22 of 22 on exactly these tasks —
1-of-14 is a failure rate the baseline never demonstrated, so tolerating it would
concede a regression the data gives no warrant for. Changed before the first arm
B branch was scored, so it remains pre-registered rather than fitted.

## B2. Cost denominators must match task-for-task

Arm A's $44.355953 mean is over **nine sessions**, and includes t3a at $11.52 —
the single most expensive session in the arm. Any arm B mean computed over a
different basket is not comparable to it, and dropping an expensive task from one
side manufactures an apparent saving.

**Both means cover the same nine sessions: t1, t2, t3a, t3b, t4, t5, t6, t7, t8.**

Exclusions are therefore handled by **voiding the rep, never by shrinking the
basket**. If a session must be excluded for any reason — zero advisor
consultations, no branch pushed, anything else — its rep produces no cost figure
at all. The earlier wording, which dropped zero-consultation branches from the
cost mean, is **withdrawn**: it would have shrunk the basket, which is precisely
the defect this amendment forbids.

T3's exclusion from the **quality** clause stands, and does not touch cost: t3a
and t3b remain in the cost basket for both arms.

## B3. The two cost-validity checks are PASSED, on primary evidence

Both were run at 00:35 against live arm B telemetry and the two pushed branches,
rather than waiting for the arm to finish.

**Check 2 — the advisor is genuinely Opus.** Not inferred. Both pushed branches
record it verbatim in `eval-advisor.log`:

    armB-rep1-t5:  **Model:** I'm Claude Opus 5 (1M context).
    armB-rep1-t8:  Model: I'm Claude Opus 5 (1M context).

So the per-call `model: "opus"` does beat the base tree's
`CLAUDE_CODE_SUBAGENT_MODEL: sonnet`, as the repo's `CLAUDE.md` claimed and as
this had no evidence for until now.

**Check 1 — the advisor's cost is counted.** Arm A's 18 recorded sessions fit a
four-rate price model **exactly** (maximum residual $0.0000 across costs from
$2.05 to $11.52): cache-read $0.50/Mtok, cache-write $10.00/Mtok, output
$25.00/Mtok, input $5.00/Mtok.

Applying it to `armB-rep1-t8`'s tokens: the same work billed entirely at those
rates would be $9.1529. Pure Sonnet at the customary one-fifth would be $1.8306.
**Actual: $4.1127 — 2.25× the pure-Sonnet figure.** The excess is the advisor
being billed into the session. The conclusion survives a more conservative
one-third assumption for Sonnet ($3.05, still a 1.35× excess).

Both fatal-direction defects are therefore closed.

---

# Amendments C1-C3 — 2026-09-16 00:50

## C1. Correction: my "2.25x above pure Sonnet" was wrong, and the real
## calibration is better evidence than the claim it replaces

B3 inferred an Opus component in `armB-rep1-t8` by assuming Sonnet costs one
fifth of Opus. That assumption was never verified and it is wrong.

The six arm B sessions that refused the task give an exact calibration, because
they stopped before doing anything and so are pure executor with no subagent.
Against the Opus rate model fitted from arm A, all six land on the same ratio to
four figures:

| | t1 | t2 | t3a | t3b | t6 | t7 |
| --- | --- | --- | --- | --- | --- | --- |
| cost / Opus-equivalent | 0.400 | 0.400 | 0.400 | 0.400 | 0.400 | 0.400 |

**Sonnet is exactly 0.4x Opus.** Six independent sessions, differing token mixes,
one ratio. Anything above 0.400 therefore carries non-Sonnet cost.

The corrected excesses over pure Sonnet are:

| | t8 | t5 | t4 |
| --- | --- | --- | --- |
| ratio | 0.449 | 0.578 | 0.602 |
| above pure Sonnet | **+12%** | **+44%** | **+51%** |

So **Check 1 still passes** — the advisor's cost is billed into the session — but
on +12% for t8, not the +125% I reported. I overstated the strength of that
evidence. The conclusion is unchanged and now rests on an exact calibration
rather than a guessed price ratio.

Keep the fit. Two exact recoveries — Opus rates from 18 sessions with zero
residual, Sonnet at 0.400x from six — are what make a 0.8x threshold a
meaningful quantity rather than a gesture.

## C2. Correction: the refusals were NOT the advisor doing its job

The appealing reading is that arm B's sessions consulted their advisor, and the
advisor flagged an anomalous instruction — which would make the refusal a
genuine property of the configuration under test.

**The telemetry says otherwise for six of the seven.** Those six sit at exactly
0.400, which is pure Sonnet with no subagent call. They refused **before
consulting the advisor at all**. Only `t4` (0.602) consulted and refused anyway.

So the refusal is a property of the **executor model reading the prompt**, not of
the advisor mechanism. That is still a property of the configuration under test —
arm B is the Sonnet-executor arm — so it must not be engineered away. But the
mechanism is not the one proposed, and acting on the advisor reading would have
drawn the wrong lesson from it.

## C3. Arm B rep 1 is void twice over

Independently of the cost confound, **six of nine branches had zero advisor
consultations**. B2's rule voids the arm at more than 2 of 16. Six in a single
rep of nine clears that on its own.

## C4. The preamble stays. Both arms re-run under one text.

Rejected: removing the preamble for arm B. The argument for it was that arm B's
effective condition would then match arm A's — but that rests on the preamble
being inert, and the same text has now been watched producing two completely
different behaviours across arms. Whatever it is doing, it is not inert, and
"the conditions would match" is the exact claim the evidence undermines.

So the isolation block is replaced for **both arms**, and **both arms re-run**
under the replacement. Arm A's 22 of 22 is not discarded — it becomes a prior on
a different prompt, and re-running it costs nine sessions rather than a rebuild.

The replacement states the constraint without issuing destructive commands:

```
Work only from the checkout you have been given. Do not consult any other
branch and do not run `git log --all`. Treat the working tree as the only
source of truth: no other branch, no non-ancestor commit.
```

Nothing else in any task prompt changes. This is a **new experiment** with a new
freeze; it does not amend or reinterpret anything already recorded, and arm A's
closed 22-of-22 result stands as the record of what happened under the old text.

---

# Amendments D1-D4 — 2026-09-16 01:05, before the v2 experiment runs

## D1. Quality becomes relative to the measured baseline, not the remembered one

"Zero failures" was derived from arm A scoring 22 of 22 **under v1 text**. The v2
arm A has not run. If it comes in at 21 of 22, demanding perfection from arm B
turns this into a superiority test by accident — the exact failure this whole
redesign was meant to escape.

**Re-registered: arm B is non-inferior if it fails no more trials than arm A, on
the same tasks.**

The formula is frozen here; the parameter comes from the v2 arm A. That is still
pre-registration — what arm B must beat is fixed before any number exists, and
nothing about the comparison is chosen after seeing it.

## D2. Cost likewise — freeze the rule, not the dollar figure

`$35.4848` was 0.8x a baseline now being replaced. It is **withdrawn as a
parameter** and survives only as the historical v1 figure.

**Re-registered: arm B's mean per-rep total must be <= 0.8x arm A's mean per-rep
total, both over the same nine sessions (t1, t2, t3a, t3b, t4, t5, t6, t7, t8),
both measured in the v2 run.**

0.8 is the frozen constant. B2's basket rule is unchanged: exclusions void the
rep, they never shrink the basket.

## D3. Smoke-test v2 on one session before anything else

Two consecutive arm B rep 1s have been voided by prompt text behaving differently
from prediction, and the prediction that v2 is milder is just another prediction
about the same classifier.

One Sonnet session, one task, under the exact v2 text plus the advisor block, in
`maths-trainer-eval-subject-armB-rep3` — surplus under the v2 design and never
used for a scored trial. It passes only if the session **works the task** rather
than querying the preamble. Not scored, not counted, in either arm.

If it queries the preamble, v2 is wrong too and nothing launches.

## D4. Nine at a time, four waves — interleaved

Per-repo separation solved the leak; it did nothing for the session limit, and a
killed session cannot be resumed. 36 at once risks the lot.

Wave order **A1, B1, A2, B2**, not both arm A reps then both arm B reps.
Interleaving controls for drift in harness load, routing and rate limits across
the night, which would otherwise be perfectly confounded with arm. It costs
nothing in rigour: both thresholds are frozen formulas evaluated at the end, so
arm B running before arm A's mean is known creates no freedom to choose.

Concurrency is nine in both arms, matching v1 arm A exactly.

