# Opus solo vs Sonnet-with-an-Opus-advisor, on Maths Trainer

Four waves, 36 sessions, two arms, two reps each, one frozen instrument.
Pre-registration in `PREREGISTRATION.md`; run log in `V2-RUN.md`; the v1
experiment that preceded this one is in `ARM_A.md` and `RUN_LOG.md`.

**The verdict is one section, and it is not the first one.** The findings below
came out of *building* the instrument rather than running it, and they are worth
more than the comparison was ever going to be.

---

# Part 1 — What the exercise actually found

## 1. Two tasks flipped from persistent failure to pass on one sentence each

**T1** failed six consecutive times. It passed the moment the prompt added:

> An answer containing `=` must still be graded rather than rejected: `x=3`
> offered where `3` is expected stays correct. Only the leak between the two
> sides is the bug.

**T3b** failed, then passed once the prompt said that settling `8 + 4 x 3` in one
tap as 20 must be accepted and as 36 must not.

Neither sentence revealed a mechanism. Each stated a requirement the task had
always had and had never said out loud. **The original 6-of-8 score was
substantially measuring prompt defects, not model capability** — and the same
defect class nearly recurred: an advisor reading the code found that T7's second
sentence ("the graded string is wrong in the same way") is **not true at base**,
because mathjs already parses `x^14` as `pow(x, 14)`.

If you take one thing from this: **before concluding a model cannot do a task,
check that the task says what you think it says.**

## 2. A non-terminating export that three green test suites never caught

`pairBank` failed to return on **two of three** v1 arm A attempts at t3a. Every
one of those branches had a passing suite and a silent typecheck. The scorer hung
at 180 seconds; the tests were green.

Binary pass/fail discarded this as INCONCLUSIVE. It was the only signal in the
entire v1 run that distinguished one attempt from another.

## 3. The secondary outcome outperformed the primary

The defect register was added as a *secondary* measure, explicitly not feeding
the verdict. It produced every informative result in the run. The primary metric
produced a verdict resting on one task.

**What was not being measured turned out to be the thing worth measuring.**

## 4. A ceiling made the original question unanswerable — and a better one possible

v1 arm A finished **22 of 22** conclusive trials. `EVAL_PROTOCOL.md` Rule 0 asked
whether arm B beat that by ≥4 trials of a maximum arm A already held. The
superiority test could only ever return "no switch", for every possible arm B,
including a better one.

The same ceiling is what makes **non-inferiority** measurable: against a perfect
baseline, any arm B failure is a detected difference. The question was
re-posed, re-frozen, and re-run — and it answered.

## 5. One frozen preamble produced opposite behaviour in the two arms

The v1 isolation block (`git remote remove origin`, ref deletion, `gc --prune`)
was:

- **refused by the harness permission classifier in all 27 v1 arm A sessions**,
  so it never executed for anyone; and
- **read as a prompt-injection attempt by seven of nine v1 arm B sessions**, six
  of which stopped before consulting their advisor at all.

A text that was inert in one arm and disabling in the other, achieving nothing in
either. Replacing it with a plain statement of the constraint — no commands —
fixed it in both arms, verified by a smoke test and then by all 36 v2 sessions,
none of which refused it.

**Isolation was never enforced by that block.** It is enforced by giving each
(arm, rep) its own repository containing nothing but the eight base branches.

## 6. Two cost calibrations were withdrawn, and the figures survive anyway

First: *Sonnet costs one fifth of Opus* — assumed, never checked.
Then: *Sonnet is exactly 0.4× Opus* — derived from six sessions that all shared
one token mix (cache-read/cache-write ≈ 1.8). One mix measured six times, not six
independent confirmations. The nine v2 arm B sessions span 22.9 to 103 on that
ratio and spread 0.369–0.550.

**Every dollar figure in Part 2 comes from `cost_usd` in session telemetry, not
from either withdrawn model.** That is why they survive the withdrawals. A reader
who does not know this history will trust them more than they should; one who
finds out later will trust them less. Hence its position here, beside the
numbers.

What the withdrawals *did* establish, via a matched pair and a direct probe: the
Opus advisor's cost **is** billed into the executor's session, and the per-call
`model: "opus"` override **does** beat `CLAUDE_CODE_SUBAGENT_MODEL: sonnet`.

## 7. The corrections outproduced the scorers

Worth counting rather than asserting. Over the whole exercise:

**The scorers produced** 32 pass/fail verdicts across four v2 waves. Two were
failures. Both were the same task. Every other task passed in every rep of both
arms. As an instrument for separating the arms, that is one bit of information.

**Checking produced**, in order:

| # | Claim | What checking found |
| --- | --- | --- |
| 1 | The harness does a single-branch clone, so isolation holds | Retracted — the probe never fetched; absence of objects is not inability to fetch |
| 2 | The ceiling is a write-up caveat | Wrong category — it was already decisive at 15 of 16, and the experiment could not answer its question |
| 3 | Sonnet costs one fifth of Opus | Assumed, never checked. Withdrawn |
| 4 | Sonnet is exactly 0.4× Opus, from six sessions | One token mix measured six times, not six confirmations. Withdrawn |
| 5 | The smoke test passed | Called off a 28-second summary before it had done anything. The branch was always the pass condition |
| 6 | t1's low cost ratio corroborates its "Sonnet 5" log line | Not weak evidence — *uninformative*. The pure-Sonnet ratio is known at one mix; t1 sits at another |
| 7 | B1 is already over the cost threshold | True of B1 alone; the clause is about arm B's **mean**, which was not yet known |
| 8 | Arm B reads the task differently | Retired by criteria fixed before B2 ran, when B2 built arm A's mechanism and failed anyway |
| 9 | The 0.57× came from the refusal artefact | Wrong voided run. The real defect — preamble removed from the challenger only — is worse |

Nine corrections. **Every one came from running a command or reading a file, not
from thinking harder** — and at least four were caught against a claim made
earlier in the same exercise by the same reviewer. Several of those claims were
comfortable ones.

Items 3, 4, 6 and 9 all concern the cost evidence. That number was wrong, in one
form or another, four separate times, and it was the number the whole experiment
was designed around.

**This is the habit the `eval-checker` skill exists to encode, and on this run it
found more than the scorers did.** The skill's first rule is *verify, never
assert*, and its hardest clause is the one about re-testing your own earlier
claim rather than defending it. That clause did the work here.

---

# Part 2 — The verdict

## NO SWITCH. Both clauses fail.

Applying `PREREGISTRATION.md` amendments D1 and D2 exactly as frozen, before any
v2 number existed.

### Results

| | rep 1 | rep 2 | failures | cost mean |
| --- | --- | --- | --- | --- |
| **Arm A** — Opus, no advisor | 8/8 | 8/8 | **0 of 16** | **$37.0961** |
| **Arm B** — Sonnet + Opus advisor | 7/8 | 7/8 | **2 of 16** | **$37.8080** |

Per-rep: arm A $41.2024 and $32.9899; arm B $32.8967 and $42.7192.

### Clause 1 — quality (D1: *arm B fails no more trials than arm A*)

Arm A: **0** failures. Arm B: **2**. **FAILS.**

Both arm B failures are T3, and T3 alone. Every other task passed in every rep of
both arms.

### Clause 2 — cost (D2: *arm B mean ≤ 0.8 × arm A mean, same nine sessions*)

Threshold: 0.8 × $37.0961 = **$29.6769**. Arm B: **$37.8080**. **FAILS by 27.4%.**

**Arm B is 1.9% more expensive than arm A in absolute terms.** The premise of the
whole redesign — a 0.57× cost ratio observed in the voided v1 run — does not
survive contact with a controlled measurement. Sonnet-with-an-Opus-advisor is not
a cheaper configuration here. It is the same price, for worse results.

### Where the 0.57× came from, and why it was wrong

The figure that motivated this entire experiment is recorded in `REPB-C1.md`:
arm B rep 1 at **$24.91** against arm A rep 3's **$43.93**, on an identical
6-of-8 result. It was void, and the reason matters.

It was **not** the refusal artefact that produced B1's fake 0.164× later on. In
that run every session worked: *"Every session started immediately, none
stalled, none flagged a prompt injection, and seven of eight pushed without a
poke."*

The defect was **an arm-asymmetric instrument**. Arm B was run with the isolation
preamble **removed** — the same document says so plainly, and says why: *"it was
removed after the voided attempt showed it cost a whole task."* Arm A was carrying
that preamble. So arm B ran under materially easier conditions than its baseline:
no stalls, no interventions, no task lost, while arm A's comparable rep bore the
friction. **That inflates the challenger, which is the fatal direction.**

The tell was visible at the time and written down without being acted on:

> Arm B's costs are flat ($2.10–$4.05), arm A's ranged $2.44–$13.16. T3 alone
> cost arm A $13.16 and arm B $3.58.

A flat cost profile across tasks of very different difficulty is not a cheaper
model — it is a model not engaging with the hard one. In v2, under a common
instrument, **arm B's t3a cost $13.92** — arm A's expensive shape, arrived at
honestly, and it still failed.

**The portable lesson is not about scorers.** A number that pointed somewhere
convenient went unexamined for days, and the entire experiment was restructured
around it. The same class of artefact was caught within minutes when it produced
an *implausible* 0.164×. Convenience, not subtlety, is what kept the first one
alive.

## The headline limitation: n=2 per arm

This is not a caveat at the bottom. It is the main thing to know about every
number above.

Each arm ran **two reps**. Arm A's own two reps differ by **20%** on cost
($41.2024, $32.9899). Arm B's differ by **30%** ($32.8967, $42.7192).

So **nobody should read $37.0961 versus $37.8080 as a measured 1.9% difference.**
Those are two samples per arm, either side of a wide band. The honest statement is
that arm B showed **no cost advantage** — not that it costs 1.9% more.

The verdict is directionally sound because both clauses fail and the cost gap to
the *threshold* is large: $37.81 against $29.68 is 27.4% adrift, far outside the
spread. A 1.9% difference between arms is not.

The same applies to quality. Two reps per arm, eight tasks, one of which
separated them.

### What the verdict licenses — and what it does not

> On eight tasks Opus solves reliably, the cheaper configuration failed one, cost
> more than 0.8× of a two-rep baseline, and read one task differently.

It does **not** extend to harder work, because **the task set contains none**.
Arm A passed 16 of 16. The ceiling that made non-inferiority measurable is the
same ceiling that bounds what the answer covers.

It is also not "Sonnet with an Opus advisor is worse." On T5 it produced a fix
arm A did not; on t3a in rep 1 it found a latent rendering trap — a
same-precedence right child that prints unbracketed but evaluates nested, so
`10 - (4 + 3)` would render as `10 - 4 + 3` and come to 3 — that **five arm A
attempts missed**, and shipped a guard for it. A configuration that reframes
tasks is a behavioural difference with costs *and* benefits.

### How thin is each clause?

**Cost: not thin.** 27.4% over the threshold, and arm B is absolutely more
expensive. An earlier note in `V2-RUN.md` observed that had arm A's rep 2 matched
its rep 1, B1 alone would have cleared the threshold by six pence. That was true
of B1 alone and is now moot.

**Quality: thin, and it should be read that way.** It rests on **one task**, T3,
at n=2 per arm. Seven of eight tasks show no difference at all.

And the two arm B failures are **not the same failure**:

| | shape |
| --- | --- |
| B1 t3a | never opened `expr.ts`; restricted the generator so the tree shape never arises |
| B2 t3a | built the pair mechanism in `expr.ts` — arm A's approach — and got it wrong, at $13.92, the most expensive session of the exercise |

Classified against criteria fixed before B2 ran. **The divergence does not
replicate.** "Arm B reads the task differently" is n=1 and describes B1 only.
What replicates is the *outcome*: arm B failed t3a twice, arm A passed it twice,
for different reasons each time.

Meanwhile five arm A attempts across two prompt versions converged on the same
design — an address for the pair in `expr.ts`. That convergence is the solid
finding; it establishes the natural reading of the task, and says nothing about
how often arm B departs from it.

### What the number cannot distinguish

- Whether arm B would hold up on work arm A finds hard. Untested; no such task
  here.
- Whether T3 is a fair test at all. It has been the least stable task throughout:
  two INCONCLUSIVEs in v1, a non-terminating export on two of three attempts, a
  scorer rebuilt twice.
- Whether the cost result generalises beyond nine sessions per rep. Arm A's own
  two reps differ by 20%.

---

# Part 3 — If you want a better answer

The verdict is correct and narrow. Two things would widen it, and neither is a
rerun:

1. **A task set arm A actually fails.** A ceiling of 5-6 of 8 leaves headroom for
   a real gap. The hazard is now known and documented: two of the original
   "failures" were prompt defects, so distinguishing a hard task from a badly
   specified one is the part to get right.
2. **A period of real use.** Run the cheaper configuration on live Maths Trainer
   work for a week, watching cost and how often Opus gets reached for anyway. It
   tests the tasks that matter rather than eight built to be difficult. Its
   weakness is that the detector is your attention: a plausible-looking wrong fix
   that passes tests is exactly what a downgrade costs you, and exactly what does
   not get noticed while using the app.

The eval gives a defensible number on easy work. A week of real use gives a
better-founded decision on the work that matters. They answer different questions
and neither substitutes for the other.

---

## Pre-registered, for the week of real use

If the week runs, one thing is fixed now rather than at the end.

**Choose the sample of fixes to read adversarially before knowing which ones went
well.** Pick them by a rule set in advance — every third change, or every change
touching the grading engine — not by which ones look interesting afterwards.

The week's weakness is that its detector is attention, and a plausible wrong fix
that passes tests is exactly what a downgrade costs and exactly what does not get
noticed in use. Reading a blind sample the way the constraint checks were read
here partly restores that detector. Choosing the sample after the fact does not.
