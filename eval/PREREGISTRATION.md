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

