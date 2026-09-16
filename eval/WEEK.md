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
| | | | | | | |

## What gets written at the end

A short verdict section appended here: the cost distribution, both counts, and
the adversarial read's findings. Plus the one thing this week can say that the
eval could not — whether the cheaper configuration is usable on the work that
actually matters, stated with its sample size attached.
