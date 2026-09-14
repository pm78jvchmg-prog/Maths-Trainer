# BASELINE

Eight tasks taken from this repository's own history, each one a real problem
that was actually hit. Every task runs against a **worktree at the commit before
the fix**, so the answer is not in the tree and neither are the explanatory
documents (`HANDOFF`, `DECISIONS`, `PITFALLS`, `EXECUTOR-PROMPT`), all of which
were written later.

Each task has a **mechanical pass criterion**: a scorer that was verified to
**fail on the untouched base** before the suite was used. A task whose scorer
passes on its own base is void; all eight were checked.

## Running it

**One session per task, rooted at that task's own base commit.** This is not a
convenience — it is the only arrangement that keeps the measurement honest:

```
create_session(
  source_url      = <this repo>,
  source_revision = <the task's base commit>,
  model           = claude-opus-5,
  outcome_branch  = eval/tN,
  prompt          = <the owner's bug report, verbatim>,
)
```

Rooting each session at its own base gives it exactly the `CLAUDE.md` a real
executor had at that moment, and none of the documents written later. Score by
fetching `eval/tN` afterwards.

### Two leaks that voided the first attempt

Both were harness faults, not task faults. Guard against them on every rerun.

1. **Project instructions come from the *session's* root, not the working
   directory.** In-process subagents launched from a checkout at `HEAD` receive
   the `HEAD` copy of `CLAUDE.md` regardless of which worktree they are told to
   work in — and this repo's `CLAUDE.md` documents the answers to T2 ("an
   unsettled root is written as `(x)^{1/2}`"), T3 ("offers its **pair**", "the
   value is the only test") and T4 ("a 60s timeout… give it a budget rather
   than trimming its sample count"). Those three tasks were unmeasurable before
   they began. A separate session per base commit is the fix; local worktrees
   under a `HEAD` checkout are not.

2. **Never leave a scorer in the tree the agent can see.** Validating that a
   scorer fails on its base leaves the file behind; the T1 agent ran
   `cat src/engine/t1.equivalence.test.ts` before it touched any source. The
   scorer states the acceptance criteria, including the non-obvious half (that
   `check('x=3', '3')` must stay **correct**, which rules out "reject any
   answer containing `=`"). Copy a scorer in at scoring time and delete it
   again; never before the run.

Do **not** give the agent the pass criterion. Tell it the current checkout is
the only source of truth: `git log` on a detached base shows ancestors only,
but `git log --all` and `origin/main` would leak everything.

Score afterwards by copying the scorer in and running it, plus `npm test`
(suite green) and `npx tsc --noEmit -p tsconfig.app.json` (silent). **All three
are required to pass.** A task is failed if the agent weakens or deletes an
existing test to get there.

| Task | Base | Scorer | Verified failing on base |
| --- | --- | --- | --- |
| T1 equals-sign scope leak | `b4c0d91` | `t1.equivalence.test.ts` → `src/engine/` | `expected 'correct' to be 'incorrect'` |
| T2 un-tappable reduce slide | `f6c6b38` | `t2.solvable.test.ts` → `src/content/` | `nothing legal is tappable in \sqrt{15^{2} + 8^{2}}` |
| T3 chain pair + value grading | `8554acb` | `t3.pair.test.ts` → `src/content/` | `no legal tap produces sqrt(36) + 1` |
| T4 intermittent oracle failure | `0de320a` | run discipline (below) | `Test timed out in 5000ms`, 1 failed |
| T5 progress row overflow | `933009c` | `t5.overflow.mjs` (Playwright, 393px) | count at `right: 408`, card ends at `373` |
| T6 negative base rendering | `1ebb945` | `t6.negbase.test.ts` → `src/content/` | `got -3^{2}` |
| T7 multi-digit exponent | `c3e90b5` | `t7.mathInput.test.ts` → `src/ui/` | `insertSup is not a function` |
| T8 fractional-index grading | `96cf78e` | `t8.equivalence.test.ts` → `src/engine/` | `expected 'incorrect' to be 'correct'` |

---

## T1 — An equals sign makes a wrong answer correct

**Base** `b4c0d91` · **Category** silent grading hole

> A learner can get a wrong answer marked correct by typing an equals sign. On
> an expression slide whose expected answer is `2x`, typing `x=0` is graded
> correct. So is `x=1` against `x^2`. The `=` key is on every expression keypad,
> so this is two taps away. Find out why and fix it.

**Pass.** `t1.equivalence.test.ts` passes (7 assertions, including that
`check('x=3', '3')` and `check('y=2x', '2x')` stay **correct** — a fix that just
rejects any answer containing `=` fails). Suite green, typecheck silent.

**Why it is hard.** The symptom points at the checker; the cause is that mathjs
parses `x=0` as an assignment that *writes into the scope it is handed*, and
both sides were probed against one shared object.

---

## T2 — A reduce question cannot be started

**Base** `f6c6b38` · **Category** UI/model mismatch, invisible to the suite

> Play the Simplifying Surds lesson through to the question that says "Work this
> out one piece at a time." Nothing on the line can be tapped — there is no way
> to begin. The same is true of the magnitude question in Vectors & Matrices and
> the modulus one in Complex Numbers. Find out why and fix it.

**Pass.** `t2.solvable.test.ts` passes — for every generator, every reduce slide
it produces can be walked to a single number using only legal targets that are
rendered as handles. Suite green, typecheck silent.

**Why it is hard.** Three shipped generators are affected and no existing test
fires. The cause is that a `\sqrt{...}` cannot be split across KaTeX fragments,
so the whole root renders as one fragment with nothing inside it addressable.

---

## T3 — Half the question can be worked, then it demands the rest at once

**Base** `8554acb` · **Category** model and grading, from a user report

> Reported from a lesson. The line is `(3^2 x 4)^(1/2) + 2^2 - cbrt(27)`. I
> reduced the cube root to 3 and the `2^2` to 4, leaving
> `(3^2 x 4)^(1/2) + 4 - 3`. I then wanted to do `4 - 3`, which obeys the order
> of operations. Tapping the minus lit the whole line and offered me only the
> final answer of the entire expression — there was no 1 to choose. Fix it so I
> can take those two terms as a step.
>
> While you are there: if I do settle the whole rest of the line in one tap and
> the number I give is right, that should count. It currently does not.

**Pass.** `t3.pair.test.ts` passes — some legal tap on
`sqrt(36) + 4 - 3` yields exactly `\sqrt{36} + 1`; `8 + 4 x 3` settled in one tap
as 20 is accepted; the same tap as 36 is refused; a wrong value on a settled
piece is still refused. Suite green, typecheck silent.

**Why it is hard.** Two changes with opposite-looking risk. `a + b - c` parses
left-associatively so there is no node for `b - c`, and the grader's
`out-of-order` rule has to be recognised as wrong rather than defended.

---

## T4 — A test fails four runs in five, and passes alone

**Base** `0de320a` · **Category** test discipline

> `npm test` fails most of the time, in `generators.test.ts`. Running that file
> on its own passes every time. Diagnose it and fix it properly.

**Pass.** Three consecutive clean `npm test` runs, **and** the sweep's sample
count is unchanged (`SEEDS = 200`, both difficulties), **and** no test was
deleted, skipped or `.only`'d. Typecheck silent.

**Why it is hard.** It reads as flakiness. It is not: the test is genuinely slow
and overruns vitest's 5s default once other files compete for CPU. The tempting
fix — cutting the sample count — trades away the only check that the calculus is
correct rather than self-consistent.

---

## T5 — The course cards overflow on a phone

**Base** `933009c` · **Category** visual, invisible to the suite

> On my phone the course cards are wrong: the "0/15" progress count is pushed
> off the right-hand edge of the card and partly cut off. Fix it.

**Pass.** `t5.overflow.mjs` reports PASS — at a 393×852 viewport, across all
three tabs, no element laid out inside a `.course-card` extends past that card's
left or right edge, and the body does not scroll horizontally. Suite green,
typecheck silent.

**Why it is hard.** Nothing in the suite renders a component. The only way to
find it, or to confirm the fix, is to open a browser at phone width.

---

## T6 — A squared negative reads as its own negation

**Base** `1ebb945` · **Category** content rendering

> In a reduce question, a term that should read as negative three squared — and
> equal 9 — is displayed as `-3^2`. That reads as minus three squared, which is
> -9. The value the question grades is 9, so the line on screen contradicts the
> answer.

**Pass.** `t6.negbase.test.ts` passes — `toTex` and `renderExpr` both bracket a
negative base, and a positive base is still unbracketed (`3^{2}`). Suite green,
typecheck silent.

**Why it is hard.** It is a rendering bug that no value-based test can see, and
the fix has to be at the shared formatter rather than worked around in the one
generator where it was spotted.

---

## T7 — A two-digit exponent renders as one digit and a stray

**Base** `c3e90b5` · **Category** answer editor

> Typing `x`, then the exponent key, then `14` shows `x` with a superscript 1
> followed by a full-size 4. It should read as x to the fourteenth. The graded
> string is wrong in the same way.

**Pass.** `t7.mathInput.test.ts` passes — a multi-digit exponent renders
`x^{12}` and grades as `x^(12)`; a negative exponent and a fraction typed inside
an exponent both work. Suite green, typecheck silent.

**Why it is hard.** KaTeX stacks only the single character after `^`, so the
exponent has to become a structural template in the editor rather than a
character that gets appended.

---

## T8 — A correct fractional index is marked wrong

**Base** `96cf78e` · **Category** sampling domain

> I want a lesson asking roots as fractional indices — typing `x^(3/2)` as the
> answer to `sqrt(x^3)`. When I write the generator, the property test
> "produces an answer its own checker accepts" fails: the checker will not
> accept `x^(3/2)` for `sqrt(x^3)` even though they are the same thing. Make it
> work without making the checker looser for everything else.

**Pass.** `t8.equivalence.test.ts` passes — fractional indices grade correct in
the new mode; the same comparisons are still **incorrect** under `domain: 'real'`
(proving the fix is scoped, not a global loosening); and `sqrt(x^2)` vs `x` is
still refused under `real`. Suite green, typecheck silent.

**Why it is hard.** `sqrt(x^3)` and `x^(3/2)` agree for `x >= 0` and genuinely
differ at negative `x` through mathjs's principal branch, for three powers in
four. The answer is a third sampling domain, opted into per slide — not a looser
threshold.

---

## Result: Opus-solo, 6/8 (2026-09-14)

One remote session per task, each rooted at its own base commit, `claude-opus-5`.

| Task | Result | What happened |
| --- | --- | --- |
| T1 equals-sign scope leak | **FAIL** | Deleted the `=` key and made assignments `invalid`. `check('x=0','2x')` returns invalid not incorrect; `check('x=3','3')` returns invalid not correct. The scope leak is routed around, not fixed — and in this app `invalid` costs no first-try credit, so a wrong answer is treated as a typo. |
| T2 un-tappable reduce | PASS | Solved it differently from the original: kept the radical by emitting `\sqrt{\,}` as its own fragment, then the argument as separate tappable fragments. |
| T3 chain pair + value grading | **FAIL** | Delivered the value-only grading half. `targets()` still returns no pair target, so tapping the `-` in `sqrt(36) + 4 - 3` collapses the whole line. |
| T4 intermittent oracle | PASS | Better than the original fix: `math.derivative(..., {simplify: false})` removes ~7s of pointless simplification instead of raising the budget. Suite 3.7s. |
| T5 card overflow | PASS | `flex-shrink` + `min-width: 0` + `overflow: hidden`. Verified in-browser at 393px. |
| T6 negative base | PASS | Centralised the formatter in a new `src/content/tex.ts`. |
| T7 multi-digit exponent | PASS | Named the export `insertPower`, not `insertSup`. |
| T8 fractional indices | PASS | Introduced `domain: 'realValued'` with an off-domain retry factor, rather than `'positive'` — arguably more general, since it keeps sampling the whole real line and discards only non-real points. |

### The scorers were less neutral than intended

T7 and T8 both failed their scorers on **naming alone** and were re-scored
behaviourally. The historical-test scorers carry the original solution's API —
`insertSup`, `domain: 'positive'` — so a correct fix under another name reads as
a failure. Two of eight, which is a high enough rate to plan for.

When a scorer fails, check whether it is testing behaviour or vocabulary before
recording a fail. The neutral ones held up: T3's tries every legal target and
every value in a range and passes if any produces the expected line, and its
failure was confirmed genuine by dumping `targets()`.

### Rate limits, not tasks, are the binding constraint

Eight concurrent Opus sessions exhausted a five-hour window; four completed and
four were killed mid-work having each spent $2-4. Run four at a time, and note
that a killed remote session **cannot be resumed** — this toolset has
`create_session` but no message-delivery tool, so a retry is a fresh run and the
partial work is lost.

## Scoring

Per task: **1** if all three checks pass, **0** otherwise. No partial credit.
Record wall-clock and whether the agent ran a browser where the task needed one.

Report as `n/8`, and list which tasks failed — the mix matters more than the
total. T2 and T5 are the two that cannot be found without rendering something;
T4 and T8 are the two where the tempting fix is the wrong one.
