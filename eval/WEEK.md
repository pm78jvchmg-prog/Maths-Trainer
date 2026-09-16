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

| # | Task | Session | Cost | Abandoned→Opus | Interventions | Files touched |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | More lessons for each topic | `session_016YooUFk7TeXipKoCffFb2u` | *running* | — | — | *pending* |

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
