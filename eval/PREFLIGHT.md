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

**Prove a new guard fails against the old code before keeping it.** A
guard that passes on the broken version tests nothing. Report the
failure message it produced.

**Commit and push at each completed unit.** A killed session cannot be
resumed, so unpushed work is lost work. Never begin a unit you cannot
finish and push.

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
