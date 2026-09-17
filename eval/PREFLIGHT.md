# PREFLIGHT — standing rules for every session

Prepend to every task prompt. Every line here is derived from something
that failed at least twice in the Maths-Trainer eval, or from something
that was proven unnecessary. Nothing is here on principle.

---

## Never instruct these — they are known to fail

**Destructive git commands in a prompt.** `git remote remove`, `git
update-ref -d`, `git reflog expire`, `git gc --prune`. The permission
classifier refuses them, and seven of nine Sonnet sessions read them as
a prompt-injection attempt and stopped. State the constraint in prose
instead: *"Work only from the checkout you have been given. Do not
consult any other branch and do not run `git log --all`."* That text
ran clean in three independent confirmations.

**Branch or ref deletion of any kind.** The proxy returns 403 on
deletion everywhere, including new repos. Cleanup is a GitHub UI job.
Do not put it in a plan.

**`create_repository`.** 403 to this integration. Any plan step that
assumes a repo can be created will halt.

**Clone flags as an isolation boundary.** `--single-branch` restricts
the default refspec, but `git fetch origin main` names the ref
explicitly and overrides it. Tested. If isolation matters, it comes
from a separate repository or from a permission denylist, never from
clone flags or from a preamble the agent executes on itself.

**Two destinations for the same commit.** A plan saying `push origin
main` under a config saying branch-only is a contradiction, and a
contradictory instruction is what stalls sessions. State exactly one
destination, once.

**Unbounded search in a scorer.** Calling every export with arbitrary
arguments executes code outside its contract. A synchronous hang cannot
be interrupted by `--testTimeout` or by any in-process cap. Sweep 8
values, not 101; calibrate on a known-safe input first; wrap the whole
scorer in a process-level `timeout` that maps to INCONCLUSIVE, never to
a fail.

---

## Always include these

**One destination.** `git push origin <branch>`. Never `main`, never a
pull request. Before the first push, `git branch --show-current` must
print `<branch>`.

**Verify, do not recall.** Check repo state, branch existence, file
presence and tool availability by running the command. A prior
session's summary is a paraphrase, not evidence. This caught a
non-existent repo, a misidentified advisor model, and a base-commit
chronology error.

**When a gate goes red, read the failure first.** Reproduce it on the
seed it names. Decide from the numbers which side is wrong. The fix is
always in sampling or a filter — narrow a range, exclude a value, add a
guard. It is never: deleting a distractor's `answer`, dropping
`source`, flipping `domain`, changing `mode` or anything under
`src/engine/`, editing the test file, or trimming a sample count or
timeout. Each of those turns the check off rather than passing it.

**If you believe the test itself is wrong: stop, leave the tree
uncommitted, and report the seed and both expressions.** Do not fix it
and do not route around it.

**Where a rule can become a check, make it one.** This file said
"prove a new guard fails against the old code" before task 2, and task
2's oracle grew an unauthorised tolerance that turned 13 disagreements
into 0 anyway. The rule existed and did not fire; the advisor caught it,
not the rule. A written rule is advice to the thing being measured. A
script that perturbs the code and counts the failures is a check, and it
does not care what the session believes about itself. Every rule here
that could be mechanised should be, and the ones that cannot should say
so.

**Prove a new guard fails against the old code before keeping it.** A
guard that passes on the broken version tests nothing. Report the
failure message it produced.

**Commit and push at each completed unit.** A killed session cannot be
resumed, so unpushed work is lost work. Never begin a unit you cannot
finish and push.

**Consult the advisor before each commit that touches `src/`.** Not once
per session: a consultation covering three finished units retrospectively
is not three consultations, and the units already pushed shipped without
review. If a consultation is missed, say which units it did not cover
rather than folding them into a later one and calling the gap closed. The
advisor has now twice been silently out of the loop — once through an
omitted `model` parameter, once through timing — so treat its presence as
something to verify, not assume.

**Bookkeeping commits get mechanical checks, not a consultation.** A
commit that only appends to a log, records results, or updates a plan
changes no behaviour, and the checks worth running on it are countable:
insertions-only (`grep -c '^-' ` on the diff body, excluding the `---`
header), arithmetic that adds up, and scope matching the stated file
list. Run those yourself. Asking an advisor whether a transcription is
faithful, when it cannot see the original output, is a check structured
so it cannot fail — and it spends the budget that should go on
re-running the underlying result.

**A report's counted claims go in a `counts` block.** Lessons, lesson
ids, level checks, generators and the test total, one key per line,
fenced as ```` ```counts ````. Prose is still read by a human; the block
is what `eval/bin/counts.sh` reconciles against the tree, and a claim
nothing can parse is a claim nothing can check.

**Do not run `counts.sh` on your own report as your own gate.** You
would be supplying the claim, the suite log the claim is checked
against, and the verdict — and nothing binds a suite log to a checkout,
so a log captured before your last commit agrees with a count taken
before it too. Run it to find your own mistakes, by all means; do not
report exit 0 on it as verification. The orchestrator runs it at stage 6
with a log from their own gate run, which is a different party supplying
the evidence, which is what makes it a check.

**A review agent gets one unit's diff, not the accumulated branch.**
Scope every review to the unit about to be committed. A reviewer handed
three units at once reads everything and notices nothing in particular,
and the context cost is the symptom of a missed step rather than a
thorough review.

**Log a refusal like a step, not like a silence.** You may decline any
instruction that would weaken a check, and you should — including one
from the brief or the plan. But a declined step and a step nobody ran
leave the same hole in the log, and the ordering check cannot tell them
apart. So when you refuse, append the entry anyway: the step refused,
the reason, and what you did instead. A consultation you chose not to
hold is a decision; an absence is a gap; only the log distinguishes
them.

**Check self-reported names against the code.** Final summaries have
misnamed their own generators while the code was correct. Anything you
report by name, grep for first.

**Container setup.** `command -v node || export
PATH="$HOME/.local/node/bin:$HOME/.local/gh/bin:$PATH"` — harmless
no-op where unneeded.

**Never `pkill -f` a dev server.**

**Driving the widget headlessly — two traps, both cost twenty minutes
once.** The `/` key inserts a fraction template, so a typed sequence
like `x^5` lands in the numerator rather than where you meant it; build
the input through the keypad the way a learner would, not by typing a
raw string. And a scratch worktree with a symlinked `node_modules`
trips Vite's `fs.allow`, producing dozens of 403s on KaTeX fonts that
look like an app fault and are not. Check the worktree before
investigating the app.

**Drive the case, do not wait for the draw.** Walking a lesson and
hoping the form you need comes up will miss difficulty-2 draws deep in
the deck. Force the seed, or call the generator with the params you
need and feed that question to the widget. The form that never came up
is usually the one the claim turns on.

**Append to `eval-advisor.log`, never write it.** Writing the file
replaces it: one session overwrote 461 lines of the previous task's
history with a 40-line entry and caught it only because the scope diff
showed 462 deletions on a file that should only ever grow. The advisor
log is the sole record of whether the advisor was ever in the loop, so
losing it silently destroys the one measurement that has no backup.
Read the file, append, and check `git diff --stat` shows insertions
only.

**`eval-advisor.log` is tracked despite `*.log` in `.gitignore`.**
Plain `git add eval-advisor.log` works because it is already tracked.
Do not add a gitignore negation — that is a change outside the diff
boundary.

---

## Where the waste actually was

Not in the test suite. Two of the most valuable findings — a progress
display inventing a score the learner never achieved, and a teach slide
promising checker behaviour that only a `domain` field upholds — were
found by an adversarial read against 2679 passing tests. The suite is
not where the redundancy lives.

The waste was in isolation scaffolding. The preamble, the denylist, the
per-repo separation and the repeated re-freezes consumed most of four
days, and the preamble itself never executed in any of the 27 arm A
sessions. If isolation is needed again, use a separate repository and
nothing else.

Second-largest: verifying in one container and asserting for another.
Two cost calibrations were withdrawn, a `domain` claim was correct for
the wrong reason, and a probe result was reported from the wrong
configuration. A claim verified elsewhere is a claim, not a
verification.
