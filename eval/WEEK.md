# The week of real use — pre-registered 2026-09-16, before task 1

`COMPARISON.md` answered a bounded question: on eight tasks Opus solves
reliably, the cheaper configuration failed one, cost more, and read one task
differently. It could not answer the question that prompted the whole exercise,
because the task set contained no work Opus finds hard.

This is that question, asked of real work.

## What this is NOT

**It is not a controlled comparison, and the cost claim is therefore dropped.**
There is no matched Opus arm running the same tasks. Recording Sonnet costs
against no baseline is *cost versus memory* — the exact flaw named when this week
was first proposed, and then built into the first draft of this file anyway.

**A pre-registered Opus estimate was considered and rejected.** The obvious patch
is to guess each task's Opus cost before starting. But cost estimates are the
single least reliable thing produced in this project: Sonnet-is-Opus/5 (wrong),
Sonnet-is-exactly-0.4x-Opus (wrong), t1's ratio as corroboration (uninformative),
and the 0.57x premise (an artefact). **Nought for four.** Substituting a fifth
guess for a missing measurement would be the same mistake with more ceremony.

So: **`cost_usd` is still recorded, because it is free, but the week makes no
cost finding.** Cost was already answered under control, on comparable work, in
`COMPARISON.md`: $37.0961 against $37.8080 per nine-session rep — no advantage
shown. If a cost answer is wanted for *hard* work specifically, that needs
matched Opus pairs on a pre-registered subset, and that is a separate decision
with its own budget.

**What the week measures is the intervention rate and the quality of the
changes.** That is the finding. Cost is a column, not a conclusion.

**Its detector is attention.** A plausible-looking wrong fix that passes tests is
exactly what a downgrade costs, and exactly what does not get noticed while using
the app. The adversarial read at the end is the partial remedy, and it is partial.

Both limits are stated here, before any data, so they cannot be discovered
afterwards as caveats.

## Configuration — frozen

Every task in the week runs as a fresh remote session:

- model `claude-sonnet-5`
- the arm B advisor block appended verbatim as a system prompt, including the
  line requiring each log entry to record the advisor's self-reported model
- source `pm78jvchmg-prog/Maths-Trainer`, revision `main`
- work pushed to a branch, never straight to `main`

Identical config every time. If it changes, the week restarts.

### The appended block, verbatim — frozen here at task 1

`ARM-B.md` and `CHAIN.md` both record the advisor block, but **neither records
the extra line amendment A3 added to it**; `LAUNCHED-armB-rep1.md` only describes
that line ("each log entry now records the model the advisor reported for
itself"). So the sentence below is a reconstruction from the amendment's wording,
not a quotation from the v2 launch. It is written out here in full, at task 1,
so that every remaining task uses the same text and the week's config is fixed
rather than re-derived:

```
You have an advisor: a stronger model you can consult at any time.

Before you plan, consult it. Call the Agent tool with subagent_type "general-purpose" and model "opus", give it the full problem statement and everything you have found so far, and ask for its diagnosis and its recommended approach. Plan only after it has answered. If its guidance conflicts with your own plan, follow the advisor.

Consult it again whenever you are unsure, whenever your first fix does not work, and before you commit.

Keep a record of every consultation. Append to a file `eval-advisor.log` at the repository root: the question you put to the advisor and a short summary of its answer, one entry per consultation. Record in each entry the model the advisor reports for itself, quoted verbatim. Commit that file alongside your work. If you end up not consulting the advisor at all, say so in the file instead.
```

Only the fourth paragraph's third sentence is reconstructed. The rest is
byte-identical to `CHAIN.md`.

## The three measures

### 1. Cost

`cost_usd` from `get_session`, per task, recorded at completion. Reported as a
per-task distribution, not a mean against anything.

### 2. Reaching for Opus anyway — two counts, kept separate

| | |
| --- | --- |
| **Abandoned → Opus** | The Sonnet session was given up on and the task redone in Opus. |
| **Interventions** | The task completed, but needed correcting, unblocking or re-explaining to get there. |

Both are recorded per task. They answer different questions and neither
substitutes for the other: the first is failure, the second is friction.

### 3. The adversarial read — every change, not a sample

**Chosen before the week starts, per the rule pre-registered in
`COMPARISON.md`.** Every change is read — not a sample. The 12-task cap makes the
full set feasible and removes any question about how the sample was drawn.

**This is where the real answer lives, and it has a specific question.** Not *is
this good code*. The question is:

> **What does this change that no test asserts?**

`pairBank` is the template. It failed to terminate on ordinary input, on two of
three attempts, with a green suite and a silent typecheck every time. The suite
could not see it because nothing exercised those inputs. A change to
`src/engine/equivalence.ts` that silently loosens grading, or to
`src/content/expr.ts` that changes which taps are legal, has exactly that shape:
tests pass, behaviour moved, nobody notices until a learner meets it.

Procedure per change:

1. List every behaviour the diff alters.
2. For each, find the test that now pins it. **No test = a finding**, whether or
   not the behaviour looks correct.
3. Check the three invariants in `CLAUDE.md` directly — a wrong answer never
   reveals the answer, the skill check is sealed, a level check is one attempt.
4. Read deleted and rewritten test lines by hand, as every rep of the eval was.

**This is the one thing the eval proved the suite cannot do.** Green tests were
the constant across every branch in 36 sessions, including the ones that were
wrong.

## Stop rule

**Seven days or twelve tasks, whichever arrives first.** Day 1 is 2026-09-16, so
the time box closes 2026-09-23. Neither is extended; a quiet week reports a small
sample and says so.

## Log

Filled as tasks complete. Empty now.

| # | Task | Session | Cost | Abandoned→Opus | Interventions | **Advisor: model verified** | **Advisor: commits covered** | Files touched |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | More lessons for each topic | `session_016YooUFk7TeXipKoCffFb2u` | **$29.8693** | **0** | **1** | **0 of 5** — only one consultation self-reported at all, and it said Sonnet | **4 of 4** | 4 (`differentiation.ts` gen + course, `calculus.ts`, `eval-advisor.log`) |
| 2 | More lessons for each topic — Complex Numbers | `session_01KZdaxw3AtjHQw8C4HFx4vj` | **$14.0271** | **0** | **1** | **2 of 2** | **1 of 5** | 3 (`complex.ts`, `complexPlane.ts`, `complexNumbers.ts`) + `eval-advisor.log` |
| 3 | **Repair** — the shape guards, promised writings, and a mutation harness | `session_01K7Ey9XeyExj7mqiiEZDJKb` | **$15.1065** | **0** | **0** | **3 of 4** — 1 inconsistent | **4 of 4** | 5 (`mutate.sh`, `generators.test.ts`, `types.ts`, `differentiation.ts`, `eval-advisor.log`) |

### Task 1 — launched 2026-09-16 12:07 UTC

Request, verbatim: *"I want more lessons added for each topic."*

Planned separately by **Fable 5.1** before launch, at the owner's instruction.
The plan is committed at `eval/plans/TASK1-PLAN.md` and was given to the executor
by path rather than pasted into the prompt, so the executor reads the same text
that is on the record here.

**The plan's own scoping decision is the first data point of the week, and it was
made by the planner, not the executor:** *Differentiation only* — four lessons,
four new generators, committed and pushed one at a time — with the other seven
courses deferred to later sessions using the same plan as a template. Its reasons:
Differentiation is the thinnest course (7 lessons against 10–13), it is the one
course where the `mathjs.derivative` oracle test independently proves each new
answer right, and spreading one lesson across eight courses would mean eight
different generator idioms and no oracle for most of them. So "more lessons for
each topic" is being honoured across sessions rather than inside one.

Whether that is good scoping or a planner talking itself out of the request is
exactly the kind of judgement the adversarial read is for. Recorded now, before
the result is known.

Two caveats about the planning step, recorded because they weaken it:

- **The session was not compacted first**, as asked. `/compact` is typed by the
  owner, not called by the agent, and a subagent starts cold regardless — it sees
  only the prompt written for it.
- **High effort was not achieved.** A `fable-planner` agent definition with
  `effort: high` was written, but agent definitions load at session start, so it
  was not available. The fallback was the built-in `Plan` agent with
  `model: "fable"` at default effort. The plan is Fable 5.1's; the effort setting
  is not what was asked for.

Branch: `week/task1-differentiation`. The plan's step 6 pushes to `main`; an
override appended to the plan file forbids it, per the frozen configuration above.

#### Amended mid-task, 12:47–12:56 UTC — counts as an intervention

The owner read the plan and raised three points, so the session was interrupted
(after pair A had landed), the plan was corrected by the same planner at high
effort, and the session was resumed in place rather than replaced. The three:

1. **Verify the `domain: 'positive'` claim in this container**, not on the word of
   another one. It was verified and it holds — but its stated example was wrong.
   `sqrt(x)`, `1/sqrt(x)` and `1/(x*sqrt(x))` all agree with their index forms at
   negative x, so `3/(2*sqrt(x))` never needed it. The case that does is the
   `reciprocalRoot` answer written back as `-3/(2*sqrt(x^3))`, and a second
   disagreeing pair the plan missed, `1/sqrt(x^3)` vs `x^(-3/2)`, is the one the
   generators actually meet. Right rule, wrong reason.
2. **The plan said push to `main` and an appended override said not to.** A
   contradictory instruction is what stalled seven sessions in the v1 eval, so the
   override was folded into step 6 and the plan now names one destination.
3. **A red gate is read before anything is changed.** New block listing six ways
   to turn a check off rather than pass it — deleting a distractor's `answer`,
   dropping `source`, widening `domain`, touching `src/engine/`, editing
   `generators.test.ts`, trimming a budget — and the instruction to stop and report
   a test believed wrong rather than route around it.

Plan amendments are `a5af680` and `1f880e1` on `main`.

#### Advisor audit — consultation 1 ran on Sonnet, and 2–5 are unverified

Read from `eval-advisor.log` on the branch. **Five consultations.** The frozen
configuration requires each entry to record the advisor's self-reported model.
One entry does.

| # | `model: "opus"` passed | Self-reported model |
| --- | --- | --- |
| 1 | **no — parameter omitted** | *"I checked my own system context: I am Sonnet 5, not Opus."* |
| 2 | yes | not recorded — *"the agent did not restate its own identity this time (I did not ask it to)"* |
| 3–5 | yes | not recorded |

So the pre-planning consultation — the one the advisor block puts most weight on,
*"before you plan, consult it"* — was **Sonnet advising Sonnet**, and the four
that followed are Opus by configuration but not by evidence.

Two things to say plainly about this:

- **The executor caught and logged it against itself**, unprompted: *"Logging this
  honestly rather than claiming an Opus consultation that did not happen."* That
  is the behaviour the logging requirement was written to produce, and it worked.
- **It is the v2 `t1` question again, and this time the answer is not benign.**
  There the log said Sonnet and the advisor was Opus; here the advisor really was
  Sonnet, by an omitted parameter, and nothing but the log would have shown it.
  The lesson carried forward from that adjudication — that a per-call `model`
  override beats the env var — is intact; what failed is that the call has to
  actually pass one.

Recorded as a **configuration deviation, not a void**: the week is a usability
log, not a controlled arm, and there is nothing here to void. But when the
verdict is written, task 1's plan was sanity-checked by Sonnet, not Opus.

## What gets written at the end

A short verdict section appended here: the cost distribution, both counts, and
the adversarial read's findings. Plus the one thing this week can say that the
eval could not — whether the cheaper configuration is usable on the work that
actually matters, stated with its sample size attached.

#### Task 1 complete — four lessons, four generators, four commits

All four pairs landed on `week/task1-differentiation`, in the planned order:

| Commit | Lesson | Generator |
| --- | --- | --- |
| `8fd4b57` | `df-l1-index` — Roots and Fractions | `df-index-form` |
| `a35d9f0` | `df-l3-roots` — Roots and Reciprocals of Brackets | `df-chain-root` |
| `25bfff7` | `df-l4-combine` — Combining the Rules | `df-product-mixed` |
| `586bfcc` | `df-l1-tangent` — The Equation of a Tangent | `df-tangent-line` |

Differentiation is now 11 lessons; level checks 15 / 12 / 14 / 15. `+1263 − 7`
across four files. Nothing outside the plan's boundary was touched.

**Gates, run here rather than taken from the session's report** — a fresh worktree
of the branch head, this repo's `node_modules`:

| | |
| --- | --- |
| `npm test` | **2679 passed**, 6 files, 142 s, exit 0 |
| `npx tsc --noEmit -p tsconfig.app.json` | silent, exit 0 |
| `npm run lint` | 0 errors, **25 warnings — the same 25 as `main`**, so none are new |

**Interventions: 1.** The mid-task amendment (three points, session interrupted and
resumed in place). **Abandoned → Opus: 0.**

**Two process defects, neither fatal:**

- The session drafted all four lessons before committing any, against the plan's
  one-pair-at-a-time loop. Corrected on the intervention; it then pushed pair B and
  rebuilt C and D one at a time.
- **Its own final summary misnames its work** — "df-reciprocal, df-quotient,
  df-product". The code carries the planned ids. A post-turn summary is a
  paraphrase, and this is the second time in this project one has been treated as
  a verdict when it was not. Read the diff.
- Whether pair A's commit had the gates run against it on the branch before pair B
  began is **not evidenced** either way in the artefacts. The question is now moot
  for correctness — pair A's code is in the tree I ran the gates on above — but it
  is recorded rather than quietly dropped.

#### The adversarial read — "what does this change that no test asserts?"

All four commits read. Two findings.

**F1 — Level-check bests now mix two different assessments.** This change grows
three level checks (L1 12→15, L3 →14, L4 →15). Progress is keyed by lesson id
(`df-l1:check`), so an existing record survives the edit, and `bestCorrect` is
clamped only *downward* against the current total
(`src/store/progress.ts:41`). A learner who scored 12/12 on the old L1 check and
replays the new one scoring 9 stores `bestCorrect: 12, total: 15`, and the home
screen renders **"Best 12/15"** (`src/App.tsx:161`) — a score never achieved on this
check, and a 100% run redisplayed as 80%. `progress.test.ts` has two clamp tests
and **both are about the total shrinking**; growth is untested, which is why the
suite is green. The clamp's own comment anticipates "a skill check or level check
that shrank" and not one that grew.

**F2 — A teach slide now promises checker behaviour that only a `domain` field
keeps.** `df-l1-index`'s third teach slide tells the learner: *"Either the
index-form answer or the answer written back as a fraction under a root is
accepted — the checker compares values, not the shape they are written in."* That
is true only because `root` and `reciprocalRoot` carry `domain: 'positive'`. Flip
either to `'real'` and the sentence is false for a learner writing
`-a/(2\sqrt{x^{3}})`, **with every test still green**: the distractor test probes
without a domain, and the oracle checks the generator's own `answer`, not the
learner's alternative writings. Nothing ties the prose to the field. This is the
`pairBank` shape exactly — tests pass, behaviour moved, the learner meets it.

**The drift the read was told to hunt is not present.** `reciprocalRoot`'s
solution step 4 writes the answer as `-\frac{a}{2x\sqrt{x}}`, **not**
`-\frac{a}{2\sqrt{x^{3}}}`. Those two forms differ precisely where the probe said
they would: `1/(x*sqrt(x))` agrees with `x^(-3/2)` at negative x and
`1/sqrt(x^3)` does not. So the shipped teaching text is the form that grades
correct on either domain. Whether that was chosen or lucky cannot be told from the
diff — which is what F2 is about.

Neither finding blocks the branch. Both are recorded against the week's question,
not against this task.

#### Findings ledger — written before any of them is fixed

Recorded here first because a fixed bug leaves no trace of how it was found, and
how it was found is what this week measures.

**F1 — fix it. Logged as a finding of the week first.** *Introduced by task 1 and
caught by the adversarial read, not by 2679 tests.* That sentence is the data
point: the suite went green on every one of the four commits, the typecheck was
silent, lint was unchanged, and the defect is on the owner's own progress display.
Nothing in the gate stack could see it, because no test exercises a level check
whose total changed. It is roughly four lines to fix, and cheaper now than after
eleven more tasks have moved level-check totals again.

**F1 is worse than first reported, and an existing test pins the worse half.**
`progress.test.ts:33` — *"never persists a best score higher than the current
total"* — records 3/3, then 1/2, and asserts `bestCorrect: 2`. The learner scored
**one** of two; the screen reads **"Best 2/2"**, a perfect run that never happened.
The clamp's remedy for a shrinking check invents a score rather than retiring a
stale one. Growth (F1 as first reported) and shrinkage are the same root cause:
a best is carried across a change in what was being assessed. Resolving that
changes an existing test's expectation, which is not a thing to do quietly — put
to the owner before touching it.

**F2 — do not fix. Named as a class instead.** A teach slide asserting behaviour
that only a generator field upholds is the **second instance of this pattern in
two separate exercises**: `pairBank` asserted termination that nothing exercised;
`df-l1-index` asserts a grading promise that only `domain: 'positive'` keeps.
Patching this one instance would hide the pattern and leave the next one to be
discovered the same expensive way. The fix for the class — a test that renders
each teach slide's claims against the generators its lesson actually uses — is
real work and outside this week's scope. **Recorded as a candidate task, not done.**

**The sharpest thing the read found is not a bug.** `df-index-form`'s solution
step 4 writes `-\frac{a}{2x\sqrt{x}}`, which agrees with the index form at
negative x, rather than `-\frac{a}{2\sqrt{x^{3}}}`, which does not. The code is
correct and **nothing in it records why that form and not the other**, so the next
edit has no way to know it matters. That is F2 restated: correct behaviour with no
account of itself is one careless edit from being wrong behaviour with a green
suite.

**A self-report diverged from the code.** The session's own post-turn summary
names its generators *"df-reciprocal, df-quotient, df-product"*; the code carries
`df-index-form`, `df-chain-root`, `df-product-mixed`, `df-tangent-line`. Small in
itself, and worth a line because a self-report is exactly what gets trusted when
reading the diff starts to feel expensive. Reading the diff is the job.

#### What the one intervention on task 1 actually was

The count is the measure, so it needs to survive to task 12 as more than a digit.

> **Task 1, 1 intervention — owner-initiated plan correction, mid-run, after pair
> A had landed.** Not a rescue: the session was not stuck and its work to that
> point was sound. The owner read the plan and found three defects in it — an
> unverified environment claim, a self-contradictory push instruction, and a
> missing rule for a red gate. The session was interrupted, the plan was corrected
> by the planner, and the session was resumed in place. **Attributable to the
> plan, not to the executor.**

That distinction is the thing to keep: an intervention that corrects the *brief*
says nothing about whether the cheaper model could do the work, and an
intervention that unsticks the *executor* says everything. Both count as 1 here,
so each one gets a sentence saying which it was.

#### F1 fixed — `05c9032` on `week/task1-differentiation`

Fixed on the branch rather than on `main`, because the branch is what introduces
the growth; this way merging it never ships the defect, and nothing deploys until
the owner merges.

A best is now kept only when the stored total matches the run's, and retired
otherwise. Both directions go together, at the owner's call, because they are one
mistake: carrying a best across a change in what was being assessed.

**The existing test's expectation changed, 2 to 1, and that is the notable part.**
`progress.test.ts` asserted the shrink defect — 3/3 then 1/2 storing a best of 2 —
with a comment justifying it. The test was not wrong about the danger it named, it
was wrong about the remedy: it clamped a stale best onto the new total instead of
retiring it, and clamping is how the invented score got in. Renamed from *clamps*
to *retires*.

**Both new guards were confirmed to fail against the old line before being kept**,
per `CLAUDE.md`: the shrink guard reported *expected 2 to be 1* and the growth
guard *expected 12 to be 9* — the 12/15 case exactly. Restored and re-run clean.

Gates on the fix: **2681 passed** (two more than before, as expected), `tsc`
silent, lint 0 errors and the same 25 warnings.

The finding record above stands as written. The bug is gone; the fact that 2679
tests could not see it is the thing the week is measuring, and that does not get
edited out now that it is fixed.

#### Interventions need a second axis: whose artefact was defective

The first split is what the intervention did — corrected the brief, or unstuck the
executor. The second is **whose work was wrong**, and for task 1 that is not the
configuration under test.

**Task 1's plan was written by Fable 5.1, not by Sonnet.** All three defects the
owner found — a claim verified in another container, a self-contradictory push
instruction, a missing rule for a red gate — were in the *plan*. The executor
never authored them and, on the contradiction, did not even trip over it: it
pushed pair A to the branch rather than to `main`, correctly, before anyone
corrected the text.

So task 1's single intervention is **upstream of the configuration under test**.
It says nothing about whether Sonnet can do this work, in either direction. Every
task from here records which of the three it was:

| | Attributable to | Evidence about the cheap configuration? |
| --- | --- | --- |
| Plan defect | the planner | **none** — upstream |
| Brief correction by the owner | the owner's changing mind | none |
| Unsticking the executor | the executor | **yes — this is the measure** |

At task 12 a bare count of interventions would have been uninterpretable without
this. Task 1 stands at **1 intervention, 0 of them about the executor.**

#### The four lessons cannot reach the phone before the branch lands

Recorded because it defeats a check that ought to be free. There is no preview
deployment: `.github/workflows` does not exist, `wrangler.jsonc` names one
environment, and the Cloudflare build triggers on a push to `main`. So the only
routes to looking at the four lessons on the phone are to merge first, or to
check the branch out on the owner's own machine and run `npm run dev` on the LAN.

The check that matters is thirty seconds and is precisely F2's: open
`df-l1-index`, reach a `\frac{a}{\sqrt{x}}` question, and write the answer back
as a radical rather than in index form. The teach slide promises that is accepted.
Only `domain: 'positive'` makes it true, and no test ties the two together.

#### Headless pre-merge check — F2's claim tested rather than reasoned about

Run in this container against the branch head, since there is no preview deploy.
Chromium at 393×852, the dev server on the branch, and a probe against the repo's
own checker. **This is not the phone**: real iPhone rendering, touch targets and
offline behaviour remain unchecked, and that check is still worth doing — it need
not gate the merge.

**1. The claim, at engine level: 300 draws × 4 writings = 1200 checks, 0 failures.**
Every `df-index-form` draw across both difficulties, with four ways a learner might
write the same answer each time — index form, as a fraction, and two radical
writings. Draws by form: 156 reciprocal, 94 root, **50 reciprocalRoot**. The teach
slide's promise, *"the checker compares values, not the shape they are written
in"*, holds **as written**, not narrowly.

**2. The counterfactual, which is the point of F2.** The same reciprocal-root
answer written as a radical of a cube, graded over `domain: 'real'` instead of
`'positive'`:

```
checkAnswer('-3/(2*sqrt(x^3))', '((-3)/2) * x^(-3/2)', { domain: 'real' })
  -> incorrect
```

So the lesson's promise rests entirely on one field in one generator, and nothing
in the repository connects the two. That is F2, demonstrated rather than asserted.

**3. In the real widget: 16 of 16 typed writings accepted.** Driven through the
keypad as a learner would — no direct calls — across repeated sessions of
`df-l1-index`: reciprocal answers entered both in index form (`-24x^{-4}`) and as
a fraction (`\frac{-24}{x^{5}}`), and root answers entered as a radical
(`\frac{5}{2\times\sqrt{x}}`). Every one graded **Correct**.

**Not reached in the widget: `reciprocalRoot`.** It is a difficulty-2 draw that
appears later in the lesson than the automated walker reliably gets, so the
radical-of-a-cube writing is covered at engine level (50 draws × 4 writings) but
was never typed by hand. **Stated rather than glossed** — it is the single case
the whole domain question turns on.

**4. Render health, all four new lessons:** KaTeX errors **0**, horizontal
overflow **0 px** at phone width, on every slide captured. The keypad offers
`√` on root questions and not on integer-power ones, which is `ROOT_KEYS` versus
`ALGEBRA_KEYS` behaving as intended.

One artefact worth recording because it looked like an app fault and was not: the
first run reported dozens of 403s on KaTeX font files. That was the scratch
worktree's symlinked `node_modules` tripping Vite's `server.fs.allow`, not the
app. Fixed in the throwaway checkout; nothing in the repository changed.

#### The gap is closed — the radical of a cube, typed into the real widget

The previous section's 16 accepted writings were **the cases that pass on either
domain**. `sqrt(x)`, `1/sqrt(x)` and `1/(x*sqrt(x))` all agree with their index
forms at negative x, so none of them needed `domain: 'positive'`. The one writing
that does need it had never been typed, which meant the widget evidence did not
touch the claim at all. Stated at the time; now fixed.

**Driven, not waited for.** Walking the deck and hoping a `reciprocalRoot` came up
failed four times — it is a difficulty-2 draw deep in the lesson. Instead the
generator was called with the params required and its output fed to the real
widget as a `literal` SlideRef, through the real `LessonPlayer`:

```
gen.render({ form: 'reciprocalRoot', a: 3, n: 2 })  ->  y = \frac{3}{\sqrt{x}}
keypad: 21 keys, so ROOT_KEYS — the radical key is offered
typed through the keypad: -3 / (2 \times \sqrt{x^{3}})
verdict: CORRECT
```

Nothing under `src/engine/`, `src/ui/` or `src/content/` was modified to get this.
The scratch checkout carried two throwaway edits — a `server.fs.allow` entry for
the symlinked `node_modules`, and a probe entry point — and was deleted afterwards.

So the chain is now complete on the case that matters:

| | |
| --- | --- |
| The writing a learner would produce | `-3/(2√(x³))`, which the solution's step 4 leads them to |
| In the real widget, through the keypad | **Correct** |
| At engine level, 50 draws × 4 writings | 0 failures |
| The same writing over `domain: 'real'` | **incorrect** |

The last row is still the finding. One field in one generator is the whole reason
the first two rows read as they do, and nothing in the repository ties the teach
slide's promise to it.

**PREFLIGHT rule earned here:** *drive the case, do not wait for the draw.* Four
walker runs missed it; one forced render caught it in a minute.

## Task 2 — launched 2026-09-16 14:47 UTC

Complex Numbers, the thinnest remaining course at 10 lessons, and the successor
the task 1 plan named for itself. Planned again by **Fable 5.1**, this time
through the `fable-planner` definition at **effort: high** — the setting task 1
asked for and did not get. Plan committed at `eval/plans/TASK2-PLAN.md`.

Four units, in order: `complex-quadratic` (quadratics with complex roots),
`polar-form` (modulus-argument form), `polar-power` (De Moivre), `complex-sqrt`
(square roots by equating parts). 10 lessons become 14.

**The plan is materially better than task 1's on exactly the points that failed
there**, which is the first sign the week is producing anything cumulative:

- **Six claims about mathjs and the checker verified in this container**, with
  the command and its output written into the plan — against task 1's
  "verified" claim that was right for the wrong reason.
- **What was *not* verified is named** for the executor to check, rather than
  asserted.
- **One push destination, stated once.** No override to contradict it.
- **The blast radius is stated up front:** three level checks grow 12 → 15, so
  the F1 fix will retire the owner's stored bests on those checks the next time
  they are played. That is the fix working as designed, and it is in the plan
  rather than discovered afterwards.
- It also notes what task 1 had to establish headlessly: this course introduces
  **no new typed answer form and no new keypad**, so the widget question does not
  arise again.

### Amendment to the frozen configuration — flagged, not buried

`WEEK.md` freezes the advisor block as appended *verbatim*, and says the week
restarts if the configuration changes. **One sentence was added for task 2:**

> **Pass `model: "opus"` on every single Agent call.** Omitting it silently runs
> the advisor on this session's default subagent model, which is Sonnet — that
> happened on the previous task and was only caught because the advisor
> identified itself.

The reasoning for treating this as enforcing the frozen configuration rather than
changing it: the configuration under test is *"Sonnet executor with an Opus
advisor"*, and on task 1 the pre-planning consultation **was not that** — it was
Sonnet advising Sonnet, through an omitted parameter. The block failed to produce
the configuration it names. The added sentence changes no instruction about how to
do the work; it closes a hole through which the named configuration silently did
not happen.

**The counter-argument is real and is recorded here too:** task 1 ran under the
original text, so task 2 runs under a different prompt, and a week whose config
drifts task by task measures a moving target.

**Owner's ruling, 2026-09-16: keep the change, do not relaunch.** *"The frozen
block's purpose is to make every task run under 'Sonnet with an Opus advisor.' A
block that silently permits Sonnet-advising-Sonnet doesn't preserve that
configuration, it defeats it — freezing the words over the configuration would be
treating the artefact as the thing rather than the thing itself."* Two conditions
attached, both below.

### Condition 1 — task 1 ran under the unenforced block

**Recorded so it cannot be forgotten when the tasks are compared.** Task 1's
advisor block did not require the `model` parameter, and the omission was not
hypothetical: **consultation 1 of 5, the pre-planning one, ran Sonnet-on-Sonnet**
and said so — *"I checked my own system context: I am Sonnet 5, not Opus."*
Consultations 2–5 passed `model: "opus"` but recorded no self-reported model.

So **tasks 1 and 2 are not strictly comparable on advisor usage.** Any later
sentence of the form "task 2 went better than task 1" has to carry that, because
one of the two did not fully run the configuration under test. This is not a
reason to discard task 1 — the week is a usability log, not a controlled arm —
but it is a reason never to read the pair as a like-for-like.

### Condition 2 — standing from here: read the model line, every task

**The enforcement is a sentence in a prompt, not a mechanism.** It can be ignored
exactly as the original was, and nothing in the harness will say so.

So on every task from here, `eval-advisor.log` is read for the self-reported model
**on every entry**, not spot-checked, and the result goes in that task's log entry.
Precedent for why this is worth real attention rather than a glance: in the v2
eval, `t1`'s log line read "Sonnet 5" and it took three self-corrections to
establish that *that* one was a mislabel by an executor writing in its own voice,
not a real omission. The difference now is that the omission is known to be real
and to happen. A line saying Sonnet is no longer presumed to be a reporting defect.

### One thing the plan did that the eval could never have measured

Task 2's plan noticed, unprompted, that **this course has no oracle.**
Differentiation had `mathjs.derivative` independently proving every answer; the
Complex Numbers property tests would only have proved each generator agrees with
itself. The plan built a substitute — a mandatory per-unit scratch cross-check
against mathjs, run outside the repository, never committed, with its output
required in the final report — and made it a stop condition rather than a
suggestion.

Recorded because it is exactly the kind of thing the eval's eight fixed tasks
could not see: **noticing that the usual verification does not apply here, and
building the missing one.** No scorer would have rewarded it, and no test would
have caught its absence.

## Measure 4 — whether the advisor was actually in the loop

**Added after task 1, promoted to a column after the second instance.** It is not
a footnote about instrumentation; it is one of the things the week is for.

The configuration under test is *Sonnet executor with an Opus advisor*. If the
advisor is absent, the week is measuring Sonnet alone and calling it something
else — and the failure is silent, because the executor carries on and the work
still looks like work.

**It has now been absent twice, by two unrelated mechanisms:**

| | How | How it was caught |
| --- | --- | --- |
| Omitted `model` parameter | The Agent call ran on the session's default subagent model, which `.claude/settings.json` pins to Sonnet. Sonnet advising Sonnet. | The advisor said so about itself |
| Timing | A single consultation covering several finished units retrospectively. The units already committed and pushed had no review before they shipped. | The session's own report: *"Units A and B were committed and pushed on the strength of gates and my own diff review alone, without a per-unit consultation."* |

**Both were self-reported by the executor, and nothing structural would have
caught either.** Worth being exact about the source, because it is the thing this
column is about: the second absence was **not** observed by the owner and then
confirmed — the session volunteered it, unprompted, in its own final note. A
self-reported absence and an owner-observed absence are different instruments, and
**the first kind is all there is here.** There is no telemetry reachable from this session that records a
subagent's model per call — verified during the v2 eval, not assumed. So the log
is the only instrument, and the log is written by the thing being measured.

That is why this is a column. Per task, it records:

- consultations made, and how many units each actually covered **before** the
  commit rather than after;
- the advisor's self-reported model, **quoted, on every entry**;
- units that shipped with no consultation preceding them.

**Reading the log line by line is the measurement.** A precedent cuts against
being casual about it in either direction: in the v2 eval, `t1`'s log read
"Sonnet 5" and it took three self-corrections to establish that *that* one was a
mislabel by an executor writing in its own voice. Now the omission is known to be
real and to have happened. Neither reading — "it says Sonnet so it was Sonnet",
nor "it says Sonnet so it is probably a mislabel again" — is safe without looking
at what the entry actually says and what the consultation actually did.

Task 1's figure, `4 of 5`, is the honest one: five consultations, of which the
first — the pre-planning one the advisor block weights most — ran on Sonnet.

**But read it as a floor, not a count.** An advisor that was absent and did not
say so reads identically to one that was present. Every absence on record was
disclosed by the executor about its own work; nothing in the instrument would
have surfaced one that was not.

### The one structural check available — ordering, not content

There is a check that does not depend on trusting what any entry *says*:

> **Consultation count against commit count, by position.** The advisor block
> requires a consultation before each commit. So a commit with no `eval-advisor.log`
> entry preceding it in the log's own order is a gap, and it is mechanically
> detectable by reading the log's entry order against `git log` on the branch.

It is narrow, and its limits are worth stating alongside it: it would **not** have
caught the omitted `model` parameter, because that consultation happened and was
logged — it was simply the wrong model. It **would** have caught the timing gap on
the branch, from the artefacts, rather than waiting for a note to admit it.

So from task 2 on, the column carries both: what the log claims, and what the
ordering can be made to prove independently of the claim.

### Independent oracle run at 15:40Z — before the executor's report existed

Run against `week/task2-complex-numbers` at `ec83ba9`, while the session was still
working. **Deliberately before reading anything of theirs**: once you have seen
their script, yours checks the same ground, and the cases their approach cannot
see are precisely the ones yours should cover.

Script: `/tmp/claude-0/audit/oracle.ts`, written 15:09Z. It imports `registry`,
`makeRng` and `math` and **nothing else** — no `polarAnswer`, `angleAnswer`,
`principal`, `angleTex` or `complexAnswer`. Every expected value is obtained by
parsing the rendered TeX the learner sees and evaluating it with mathjs.

```
draws per generator: {"complex-quadratic":400,"polar-form":400,"polar-power":400,"complex-sqrt":400}
failures: 0
```

**It can fail, and that was proved rather than assumed.** Flipping the sign of
`polar-form`'s imaginary part (`complexAnswer(re, im)` → `complexAnswer(re, -im)`)
produced **254 failures**, naming the question and both values:

```
polar-form: answer != r(cos T + i sin T) read off the screen:
  z = 4\left(\cos \tfrac{\pi}{2} + i\sin \tfrac{\pi}{2}\right)
  -> expected 2.449e-16+4i, answer (0) + (-4)*i
```

Restored; tracked tree clean.

**Two defects in my own oracle, found by running it, worth recording because both
would have read as a pass:**

1. **It imported by absolute path**, so the first run loaded `main`'s registry
   rather than the branch's and found none of the four generators. It reported
   `NOT PRESENT in the registry` as four failures rather than quietly measuring
   nothing — which is the only reason it was caught. A version that had counted
   zero draws and printed "0 failures" would have been indistinguishable from
   success.
2. **Its TeX parser broke on nested braces:** `\tfrac{1}{\sqrt{2}}` needs
   `\sqrt` resolved before `\tfrac`, since a `[^{}]` class cannot see past the
   inner braces. 185 throws, all in the solution's cos/sin check.

Then one true negative: every remaining failure was `polar-power` reporting `\pi`
where mathjs's `arg` said `-\pi`. **The generator is right and mathjs is the
imprecise one** — the `(-\pi, \pi]` convention the question states makes `\pi`
correct, and mathjs returns `-\pi` whenever float error leaves a hair of negative
imaginary part on a point that lands on the negative real axis. Fixed by comparing
angles mod 2π, not by touching the generator.

**What this run does not cover, stated rather than left implied:** it checks that
each stated answer is right and that `polar-form`'s worked solution quotes true
values of `\cosθ` and `\sinθ`. It says nothing about distractors, lesson prose,
or anything the adversarial read is for.

### The ordering check, run — it flags four commits, not two

The structural check ran against `eval-advisor.log`'s entry order and `git log`
on the branch. **It disagrees with the session's own account, and the disagreement
is the useful part.**

| Commit | Unit | A consultation that had **returned** before it? |
| --- | --- | --- |
| `0301aba` 14:59 | A | no — none launched |
| `5bcd0cb` 15:06 | B | no — none launched |
| `3381b13` 15:15 | C | **no** — consultation 2 was *launched* before it but returned after |
| `cf604bb` 15:19 | D | no — none of its own; consultation 2 still in flight |
| `ec83ba9` 15:32 | fix | yes — this commit *is* consultation 2's finding |

**Four gaps, not two.** The session's note says *"Units A and B were committed and
pushed … without a per-unit consultation"*, counting C as covered because
consultation 2 was launched before C's commit. The log's own later entry contradicts
that reading in plain terms: *"This consultation … returned after Unit C
(`3381b13`) and Unit D (`cf604bb`) were already pushed."*

Neither statement is dishonest — they are the same facts under two definitions of
"covered". **The ordering check picks the one that matters:** launched-before is
not reviewed-before, and the proof is in this very branch, because consultation 2
came back with a real blocking defect *in Unit C*, which had already shipped, and
in Unit D behind it. A definition of coverage under which C counts as reviewed is
a definition under which a shipped defect counts as caught.

**So the task 2 figure is `1 of 5` on the strict reading**: five commits, one of
which had a completed consultation behind it. Recorded that way, with the session's
own `A and B` framing alongside it, because which number you quote depends entirely
on that definition and the definition should be visible.

### `polar-power`'s fix, verified here rather than taken on report

The session reproduced 3/225 collapses, fixed, and reported 0/225. Re-run
independently over the **whole** parameter space rather than a sample:

```
exhaustive combinations checked: 375
option-count histogram: {"3":63,"4":183,"5":75,"6":54}
minimum options: 3      violations: 0
```

Exactly one correct option everywhere, no duplicate labels, never fewer than three
options. **And the fix is load-bearing, which was proved rather than assumed** —
removing the added `ang(principal((n + 1) * k, d))` distractor reproduces exactly
three two-option collapses:

```
only 2 options: ask=argument r=1 index=3 n=2 -> \pi | \tfrac{\pi}{2}
only 2 options: ask=argument r=2 index=3 n=2 -> \pi | \tfrac{\pi}{2}
only 2 options: ask=argument r=3 index=3 n=2 -> \pi | \tfrac{\pi}{2}
```

Same shape the session reported, at `POLAR_ANGLES[3]` (θ = π/2) with `n = 2`, for
every `r`. Restored afterwards.

### Two of the run's three real findings came from the consultation that nearly did not happen

Worth stating as a result rather than a process note. Consultation 2 existed only
because the session noticed its own timing gap while writing the log and launched a
combined review to stop the gap reaching a third unit. That consultation found:

- the `polar-power` two-option collapse — a coin-flip multiple-choice question,
  already shipped in `3381b13`;
- **an unauthorised tolerance in the session's own scratch oracle** — a wraparound
  allowance with no basis in the plan, which turned 13 genuine disagreements into 0.

The second is the one the pre-launch worry was about, word for word: *a
self-written check that cannot fail*. It was caught by the advisor, not by any
gate, and not by the check itself.

**The session kept the raw 13/400 next to the clean 0/400.** That is the number a
report optimising for its own appearance deletes, and it is the single strongest
signal in the week so far about this configuration's honesty under self-report.

### Plan defect trend — the thing the week is actually for

| | Plan defects found | Kind |
| --- | --- | --- |
| Task 1 | **3** | reasoning — an unverified environment claim, a self-contradictory push instruction, a missing red-gate rule |
| Task 2 | **1** | **mechanical** — four literal backslashes before `left`/`cos`/`sin`/`right` in `TASK2-PLAN.md` section 2.2, confirmed with `cat -A` on the raw file rather than assumed to be a rendering artefact |

Three defects of judgement down to one of transcription, with the planner running
at the effort setting task 1 asked for and did not get. One task is not a trend,
and two is barely one — but this is the axis the week exists to watch, so it gets
recorded each time rather than reconstructed at the end.

### Correcting my own number: `4 of 5` was measuring something else

Before the two tasks sit in one column they have to be the same quantity, and
they were not. **This is my error, not a definitional subtlety.**

`4 of 5` for task 1 was *consultations that used an Opus advisor*. `1 of 5` for
task 2 is *commits with a completed consultation behind them*. They share a
denominator by coincidence. Read as one series they show a collapse that never
happened.

And `4 of 5` was loose on its own terms too: it counted "the call passed
`model: \"opus\"`" as verification. Only **one** of task 1's five consultations
recorded a self-reported model at all, and that one said *"I am Sonnet 5, not
Opus."* The other four state plainly that the advisor *"did not restate its own
identity this time"*. So nothing about task 1's advisor model was verified.

**Two measures, both axes, both tasks — the ordering check re-run against task 1
under the strict definition:**

| | Consultations with a **verified** Opus advisor | Unit commits with a **completed** consultation before them |
| --- | --- | --- |
| **Task 1** | **0 of 5 verified** — not 5 of 5 failed; see the caveat below | **4 of 4** — each of `8fd4b57`, `a35d9f0`, `25bfff7`, `586bfcc` has a consultation before it, and task 1's log contains no "returned after" language anywhere |
| **Task 2** | **2 of 2** — both quote `claude-opus-5[1m]` | **1 of 5** — only `ec83ba9` |

**Caveat on `0 of 5`, attached so the figure cannot be read as stronger than it
is.** Four of task 1's five consultations record that the advisor *"did not
restate its own identity this time"*. That is **absence of evidence, not evidence
of Sonnet.** The presumption leans that way — the one consultation that did report
said Sonnet, and the omitted `model` parameter was real — but the honest label is
*0 of 5 verified*, never *5 of 5 failed*. The difference will matter the moment
there is a task to compare against where the advisor is verified throughout, which
task 2 now is.

**The two tasks did not decline or improve. They traded.** Task 2 fixed the model
problem completely — the added prompt line worked, and every consultation now
carries a quoted identity — and regressed on timing, shipping four units before
any review returned. Task 1 was the mirror image: reviewed before every commit, by
an advisor whose identity was never established once.

Reported as a single number in either direction, that is a false story. It is the
clearest argument in the week so far for the rule that a bare count needs its
definition attached.

### Two sessions running, two claims checked over less ground than they cover

`polar-power`'s survival claim is *"at least three options survive every draw"*.
The session swept **225** combinations and reported 0 collapses after its fix; the
parameter space is **375**, and the exhaustive run here confirms the fix holds
across all of it. No defect resulted — but the check was narrower than the claim,
and that is now the second instance:

| | The claim | What was checked |
| --- | --- | --- |
| Task 1's widget evidence | "the checker compares values, not shapes" | 16 typed writings, **all of them forms that pass on either domain** — the one writing that needed `domain: 'positive'` was never typed |
| Task 2's option survival | "≥3 options survive every draw" | 225 of 375 combinations |

Both were caught, and neither turned out to hide a defect. The pattern is worth
naming before a third: **a sample is not a sweep, and when the claim is universal
the check should be exhaustive if the space is small enough to enumerate** — 375
combinations take under a second.

## The week's real output so far: one defect class, three instances

Three findings have been recorded separately. They are not three things. Grouping
them, because the fourth will be another instance and the point is to recognise it
as one rather than discover it again:

> ### Something that looks like verification and isn't

| # | Instance | What it looked like | What it actually checked |
| --- | --- | --- | --- |
| 1 | **Prose promising what only a field upholds** | A teach slide telling the learner *"the checker compares values, not the shape they are written in"* | Nothing. The promise is kept solely by `domain: 'positive'` on two generators, and no test connects the sentence to the field |
| 2 | **A check that cannot fail** | A scratch oracle reporting `0/400` | A wraparound tolerance with no basis in the plan, added by the thing being checked, turning 13 genuine disagreements into 0. My own oracle had the same shape twice — absolute imports loading the wrong branch, and a parser that threw rather than compared |
| 3 | **A sample presented as a sweep** | "≥3 options survive every draw", and "the checker accepts either writing" | 225 of 375 combinations; and 16 typed writings every one of which passes on either domain, so none of them tested the claim |

**The shape is identical each time: a result that is true, produced by a procedure
that could not have shown it false.** None of the three was a lie, and two of them
were self-reported by the thing that made them.

What separates the instances is only *what* could not fail — a sentence with
nothing tying it to code, a tolerance that absorbed the disagreements, a subspace
that excluded the hard cases. So the question that catches all three, and which
now goes to every claim in this project, is not *is this true* but:

> **What would this check have done if the thing were wrong?**

That question caught instance 2 (the advisor asked it of the oracle), caught
instance 3 twice (the widget writings, then the 225), and is the reason the F1
guards, the `polar-power` fix and my own oracle were each run against a deliberately
broken version before being trusted.

**It is also why the ordering check exists.** Of everything added this week it is
the only instrument that cannot be satisfied by the measured thing reporting well
of itself — and on its first run it contradicted a self-report that was otherwise
accurate and unusually candid.

### Task 2 verified here, and the adversarial read's finding

**Gates, run on a worktree of `ec83ba9` rather than taken from the report:**

| | |
| --- | --- |
| `npm test` | **2777 passed**, 6 files, exit 0 (`main` is 2681, so +96) |
| `npx tsc --noEmit -p tsconfig.app.json` | silent, exit 0 |
| `npm run lint` | 0 errors, **25 warnings — the same 25 as `main`** |

**Ids by grep, not from the report.** 14 lessons: `cn-l1-roots, cn-l1-arithmetic,
cn-l1-complex, cn-l1-quadratics, cn-l2-multiply, cn-l2-conjugates, cn-l2-division,
cn-l3-plane, cn-l3-modulus, cn-l3-sqrt, cn-l4-argument, cn-l4-polar, cn-l4-powers,
cn-l4-de-moivre`. Four new generators present: `complex-quadratic`, `polar-form`,
`polar-power`, `complex-sqrt`. Level checks 15 / 12 / 15 / 15. Scope is three
content files plus `eval-advisor.log`, whose diff is **+189 and additive** — task
1's 461 lines intact, so the overwrite really was repaired before pushing. No test
file touched; the 18 deletions are level-check arrays replaced wholesale, two
import lines extended, and the `ANGLES` table rewritten to carry its new fields.

The plan's own risk 6 held: **no teach slide in this course claims anything about
what the checker accepts.** That was the task 1 defect class, and it did not recur.

#### The finding: two shape guards are now blind to the generator they most need to see

> **`polar-form` is the first generator in this repository whose rendered *kind*
> depends on its parameters.** A `toCartesian` draw is an `expression`; a `toPolar`
> draw is a native `choice`. `toPolar` is only ever drawn at difficulty 2.

Both shape guards in `generators.test.ts` decide a generator's shape with
`g.render(g.sample(makeRng(1), 1)).kind` — **seed 1, difficulty 1, always**,
whatever difficulty the lesson actually asks at. Measured on the branch:

```
polar-form  difficulty 1: {"expression":400}
polar-form  difficulty 2: {"expression":196,"choice":204}
what the shape test sees (seed 1, difficulty 1): expression
```

So for every difficulty-2 `ask('polar-form', 2)` — and `cn-l4-polar` has four —
*"varies the shape of the questions inside a lesson"* and *"never runs 3 or more
identical-shape questions between teach slides"* are reasoning from a shape the
learner has a **51% chance of not seeing**.

**No violation ships today.** Re-running the run-length rule at the difficulty each
slide is actually asked at, across every lesson in every course and 120 seeds:

```
runs of 3+ identical shapes between teach slides, at the asked difficulty: 0
```

`cn-l4-polar` is safe because `argument` sits between its two difficulty-2
`polar-form` asks and is always an `expression`. **That is luck, not design** —
remove that slide, or add a second difficulty-dependent generator, and a run of
three choice slides ships with a green suite.

Recorded, not fixed: the fix is a change to `generators.test.ts`, which this task's
diff boundary forbids and which is the owner's call. It is a fourth instance of
the class above — a guard that looks like it checks lesson shape and checks a
shape no learner necessarily meets.

## Decision after task 2: repairs first, alternating

**Order: repair, lesson, repair.** Task 3 is a repair task, and repairs take
priority over lesson additions from here.

The reasoning, recorded because it is the week's first strategic choice rather
than a finding: lesson additions grow the app; repairs grow **the thing that lets
a cheaper model work unsupervised.** The two queued repairs are both instrument
fixes — shape guards that reason at a difficulty the learner may never meet, and
prose asserting what only a field upholds. Fixing them moves those two classes
from *"an advisor or an adversarial read might notice"* to *"the suite fails"*, on
every future task, for nobody's attention.

**A framing corrected before it propagated:** none of this trains anything. There
is no weight update, and a future session starts cold. The only thing that carries
is what is written down, so "making the advisor redundant" means **accumulating
artefacts that do its job** — which is what `PREFLIGHT.md` and the checks are.

### The lever: rules do not fire, checks do

`PREFLIGHT.md` already said *"prove a new guard fails against the old code before
keeping it"* **before task 2 ran**. Task 2's oracle grew an unauthorised tolerance
that turned 13 genuine disagreements into 0 regardless. The rule existed, was in
the session's context, and did not fire. **The advisor caught it; the rule did
not.**

More written rules will not close that. What worked twice this week was mechanical
and run from outside: the ordering check contradicted an otherwise candid
self-report, and the perturbation runs proved the F1 guards, the `polar-power` fix
and my own oracle could fail. So the standing principle, now in PREFLIGHT:
**where a rule can become a check, make it one.**

### Exit criterion for the advisor — evidence, not hope

The advisor stays indefinitely; it is cheap, and it has now earned its cost twice
in one task. But *whether it is still needed* becomes a tracked number rather than
a judgement call. **Per finding, from here: could a rule or a check have caught
this?**

Applied to everything the week has produced so far:

| Finding | Catchable mechanically? |
| --- | --- |
| F1 — a best score surviving a changed total | **yes** — and now is; the guard exists |
| F2 — prose promising what only `domain` upholds | **yes** — queued as repair 2 |
| Unit C's oracle tolerance | **yes** — a perturbation harness, queued below |
| Sample presented as a sweep (twice) | **yes** — exhaustive sweep where the space is enumerable |
| Shape guards reasoning at difficulty 1 | **yes** — queued as repair 1 |
| Advisor consulted after the commit | **yes** — the ordering check already catches it |
| `eval-advisor.log` overwritten | **yes** — assert the log's diff is insertions only |
| **Advisor silently running as Sonnet** | **no** — no telemetry reachable from a session records a subagent's model per call. Verified in the v2 eval, not assumed |

**Seven of eight are mechanisable; one is not.** That one is why the advisor's
self-report stays the instrument for its own identity, and why the column records
a floor rather than a count.

**The criterion:** when several consecutive tasks complete with *no* finding that a
rule or check could not have caught, the advisor is redundant on the evidence. Not
before. Today that count is not zero — task 2 produced two findings whose only
catcher was the advisor, and the mechanical replacements for both are what task 3
builds.

### Task 2's row, completed

`$14.0271`, **0 abandoned**, **1 intervention**, four units landed and merged.

**The intervention, characterised as the taxonomy requires:** a *brief addition*,
not an unsticking. Mid-run the session was asked to paste its scratch oracle
scripts verbatim into its final report, and to show one perturbed answer producing
a non-zero failure count — because those scripts are never committed and would
otherwise vanish, leaving a number the session produced about its own work as the
only evidence. **Attributable to the brief, not to the executor**, which was not
stuck and did not need correcting. Under the three-way split: **0 interventions
about the executor**, same as task 1.

That addition is also what surfaced the Unit C oracle tolerance, since the
instruction to show the check failing is what the advisor was asked to scrutinise.

**On cost, the week's rule holds: the number is recorded, no finding is drawn.**
$14.0271 against task 1's $29.8693 is less than half, and it would be easy and
wrong to read that as the configuration getting cheaper. The tasks are different
work on different courses — task 1 had a mid-run interrupt, a plan correction and
a rebuild of two units from clean checkouts; task 2 did not. `COMPARISON.md`
answered cost under control, on matched work, and this week was pre-registered to
make no cost claim. Two numbers in a column are not a trend, and cost estimates in
this project are still nought for four.

## Task 3 — launched 2026-09-16 16:20 UTC. First repair task.

Branch `week/task3-instrument-repairs`. Plan at `eval/plans/TASK3-PLAN.md`
(`b9cc3c4`). Three repairs as four units: a mutation harness, the shape guards,
and promised writings at generator and lesson level.

**The plan reversed one instruction of the brief, correctly.** The harness was
ranked last, "only if the first two leave room"; the plan builds it **first**,
because the other three units use it to prove their guards, and building it first
means it is exercised four times in this session rather than shipped untested.

**It also corrected an error of mine, and the correction is the important part.**
My brief said a changed guard must be shown *"failing against the unfixed code"*.
For a guard repair **the code is not what is broken — the guard is**, so that
instruction cannot be satisfied as written. The correct form, now in the plan and
the executor's prompt:

> A repaired guard is kept only on a **differential**: the same mutation, survived
> by the current suite, killed by the repaired one. Green on the unmutated tree is
> a **precondition, not a result**.

That belongs in `PREFLIGHT.md` eventually. **Deliberately deferred**, along with
the recommendation to move the four defect classes there from the planner
template: after task 3, two of those four classes will have automated checks
rather than rules, which changes what the section should say. Writing it now means
writing it twice, and the second version is the one informed by whether the checks
actually landed.

### Plan defect trend — and why the third number is not comparable

| | Plan defects | Kind |
| --- | --- | --- |
| Task 1 | **3** | judgement |
| Task 2 | **1** | mechanical |
| Task 3 | **0 that I found** | — |

**"None I found" is a weaker claim than the other two, and the wording is kept
deliberately.** Task 3's plan was checked differently from its predecessors: every
countable claim was verified independently before launch — 217 registered
generators, 97 lessons, exactly two "accept" sentences and both in
`differentiation.ts`, `.gitignore` covering only `eval/scorers/`, and
`makeRng(1), 1` at lines 445 / 872 / 894. All exact. That is stronger verification
than task 1 or task 2's plans received.

**But stronger checking making a defect less likely to be found is not the same as
there being none**, and a later reading will treat 3 / 1 / 0 as one series unless
this paragraph stops it. The first two numbers count defects the owner found by
reading; the third counts defects that survived a countable-claims audit. They are
not the same measurement.

### Next repair candidate, on the evidence

**Prose promising what only a field upholds is now three instances across two
courses.** The plan's own grep found a second in `df-l4-combine` — *"either the
expanded or the factorised form is accepted"* — alongside `df-l1-index`'s, and the
class was already recorded once from task 1's read. Task 3's units 3a and 3b
address it directly, so what happens to those two units decides whether this stays
the strongest candidate or is closed. If 3b is dropped under the stop rule, it is
the first thing the next repair task takes.

### Stage 6 on task 3, run at 17:10Z while the session was still on unit 3b

Units 1, 2 and 3a were pushed, so the mechanical checks ran before the report
existed — the same reason the task 2 oracle was run early.

#### Instance 5 of the class, resolved: anticipated and mechanised

*"The mutation was killed"* and *"the mutation never applied"* produce identical
green output. The refusal branches are the only thing between them, so they were
tested directly rather than read:

| Refusal | Result |
| --- | --- |
| sed expression matches nothing | `mutation did not change …: the sed expression matched nothing`, exit 2 |
| path does not exist | `no such file: … (path is relative to …)`, exit 2 |
| path untracked | `not tracked: …`, exit 2 |
| file already dirty | `refusing: … has uncommitted changes`, exit 2 |

All four fire; `git status --short` is empty after each, so the trap restores on
the refusal paths too. **The harness that exists to prove guards can fail cannot
itself report a kill for a mutation that never happened.**

**And the executor improved on the plan, in this exact class, unprompted.** The
plan specified `git diff --quiet` as the cleanliness check. `git diff --quiet`
**exits 0 for a nonexistent or untracked path**, so a mistyped path would have
passed the check, failed an empty `cp`, and had the EXIT trap write a **0-byte
file** back over it. The shipped script adds `[ -f ]` and
`git ls-files --error-unmatch` with a comment stating exactly that reasoning.
Two of the four refusals above exist only because it caught this.

#### The unit 2 differential, re-run here rather than read

Same mutation — `cn-l4-polar`'s `ask('argument', 2)` replaced by
`ask('polar-form', 2)`, the scenario this finding was first written up as — run
against both trees:

| Tree | Guard | Result |
| --- | --- | --- |
| `origin/main` (`fb3e9c9`) | the old `shapeOf` | **`MUTANT SURVIVED`**, `1 passed \| 2619 skipped` |
| branch (`71026be`) | the repaired rule | **`mutant killed`**, `cn-l4-polar: run of 3 questions can all be choice (polar-form@2, polar-form@2, polar-form+choice@2)` |

That is the repair proved as a differential by someone other than the thing that
made it. The offender message is word-for-word what the plan predicted.

**Test-file count corroborates unit 3a independently:** `generators.test.ts` holds
**2620** tests on `main` and **2837** on the branch. The delta is **+217, exactly
one per registered generator**, which is the plan's prediction for the
`alsoAccepts` test and rules out a test having been lost or duplicated alongside
it.

## Task 3 complete — four units, and the first task with no intervention

`$15.1065`, **0 abandoned**, **0 interventions**. All four units landed:
`ef10bc3` harness, `6fcdbb0` shape guards, `71026be` `alsoAccepts`, `5881397`
the promise guard.

**Gates, run here:** `npm test` **2995 passed** — exactly the plan's prediction
of 2777 → 2777 → 2994 → 2995, which rules out a test lost or duplicated — `tsc`
silent, lint 0 errors and the same 25 warnings, tree clean after every mutation.
Scope is the plan's four files plus the log; `eval-advisor.log` is **569
insertions, 0 deletions**, so the append rule held.

### Advisor: 4 of 4 on timing, and a third way the identity instrument fails

**The ordering check passes for the first time: 4 commits, 4 consultations, every
one returned before the commit it covers.** No "returned after" or "in flight"
language anywhere in the log. Against task 2's 1 of 5, that is the added prompt
line working — and it is the first evidence in the week that a written
instruction closed a gap rather than being present and not firing.

**But consultation 3's advisor contradicted its own harness label**, and the
executor logged it rather than tidying it:

> *"Advisor model identity: Claude Opus 4.5 (claude-opus-4-5-20251101). Note: the
> environment prompt in my context labels me 'Opus 5 (1M context) /
> claude-opus-5[1m]' — I have no such model in my own knowledge, so log both
> strings and treat the harness label as authoritative if you are recording the
> run's configured model."*

**This is a third distinct mechanism, and the most awkward of the three**, because
the first two were process faults and this one is the instrument itself:

| # | Mechanism | Parameter passed? | Returned before commit? |
| --- | --- | --- | --- |
| 1 | `model` omitted — ran Sonnet | **no** | yes |
| 2 | Consultation returned after the commits it covered | yes | **no** |
| 3 | **Self-report disagrees with the harness label** | **yes** | **yes** |

Everything procedural was right and the answer still cannot be read off. The
column has always recorded a floor; this is the reason it has to. **Task 3 is
logged as 3 of 4 verified, 1 inconsistent** — not 4 of 4, and not 3 of 4 failed.

The executor's handling is the part worth keeping: **both strings logged verbatim,
neither discarded, and the advisor's own explanation for the discrepancy recorded
as "its account, not independently confirmed here."** That is the correct posture
toward a self-report that has just demonstrated it can be internally inconsistent.

### The residual gap — found by the advisor, re-verified here, and it sets task 4

Unit 3b's guard asks **a per-generator question about a per-form promise**.
`declaresAlsoAccepts` is satisfied if *any* draw of *any* generator the lesson asks
declares *something*. The sentence in `df-l1-index` names a specific writing — "a
fraction under a root" — and nothing ties the sentence to that writing.

**Boundary established here in three runs, not taken from the report:**

| Declarations deleted from `df-index-form` | Result |
| --- | --- |
| 1 — the `root` form, the exact writing the sentence names | **`MUTANT SURVIVED`** |
| 2 — `reciprocal` + `root` | **`MUTANT SURVIVED`** |
| all 3 | **`mutant killed`**, the sentence quoted in the failure |

So the promise the lesson makes can lose the writing it names and the suite stays
green. **F2 is two-thirds closed by this task**: declaration → checker (3a) and
sentence → some-declaration-exists (3b) are mechanised; **sentence → the specific
writing named is not.**

**Task 4 is therefore determined, not open:** close the residual by making the
promise guard per-writing rather than per-generator. It is the same class, the
same lesson, and the gap is already demonstrated with a one-line mutation that
reproduces it.

### Findings, with the exit-criterion column

| Finding | Could a rule or check have caught it? |
| --- | --- |
| The 3b guard is per-generator where the promise is per-form | **Yes** — and task 4 is that check |
| Advisor self-report contradicts its harness label | **No.** Same reason as the original: no reachable telemetry records a subagent's model per call. This is the second entry in the not-mechanisable column, and it is the same root cause as the first |
| `git diff --quiet` returns 0 for a nonexistent or untracked path | **Yes** — and the executor built that check unprompted, into `mutate.sh`, before shipping it |

**Two of three are mechanisable and one already is.** The one that is not is the
advisor's own identity — now failing in three different ways, all invisible to
anything but the log.