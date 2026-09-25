# Changes

A short, dated record of what landed and why. Newest first. Each entry names
its pull request; the PR description holds the evidence.

## 2026-09-25

- **Wrong options are now checked by value (#204).** The sweep reads every
  choice option's label as a value and fails when a wrong option equals the
  right one or another wrong one. It found four questions with a second right
  answer (`mat-det-property` at a determinant of 1 or -1, `frac-lcd`,
  `fun-composite-order`, and `bin-sum-which` at `a + k = -2`) and eleven with
  two wrong options worth the same; all fixed. Eleven form questions are
  exempt, each with its reason.
- **Complex square roots are taught before they are asked.** The Square Roots
  lesson now works an example of squaring, then finds a root step by step with
  no guessing, then practises gently: square a number, pick which candidate is
  a root, fill in the method as a table (new `sqrt-check`, `sqrt-method`),
  before typing a root alone. `complex-sqrt`'s worked solution is split into
  short lines so it no longer scrolls sideways (#201).
- **Streak no longer counts a day twice after travelling west (#196).** A play dated
  a day or two before the last one is a day already counted and changes
  nothing, and the home screen reads it as done. A day the calendar skipped
  going east costs no charge, and a clock set far wrong and put right keeps
  the streak (the day it replaced is remembered). `src/store/streak.ts`.
- **Home-screen colours: the seams were an old copy (this PR).** The current
  build already runs one unbroken purple from Algebra Fundamentals to Advanced
  Maths and orange from the Statistics heading down (#180); the iPad was still
  showing an older version. The app now checks for a new version every time it
  is brought back to the front, so one close and reopen picks it up. The purple now melts through rose into
  the orange above Statistics instead of meeting it in a hard line.
- **Checker: `+ C` and `2e-1`.** An integral answer's `C` was probed as 0, so
  `x^2/2 + C*x` passed as the integral of x; `C` now takes a fixed non-zero
  value, so only an added constant is forgiven (`2C` and `ln(C)` still pass).
  A typed `2e-1` was read as 0.2; a digit before `e` is now read as a product,
  so it is 2e − 1.
- **Going back onto a slide finished with Show me no longer asks for it again
  (#194).** It comes back showing the answer it showed, and Continue moves
  on. A slide solved (first try or after a wrong answer) still comes back idle
  with Continue beside Check. `canPassSolved` is now `canPassFinished`.
- **Two grading bugs fixed (this PR).** `vec-parallel` could offer two
  parallel options, marking a correct pick wrong (~10% of draws). A negative
  base was shown unbracketed (`-1^{4}`) while the answer meant `(-1)^{4}`, in
  `complex-power`, `power-reverse`, `complex-conjugate`, `df-second-derivative`
  and `quad-choose-method`. Guard tests added for both.
- **CLAUDE.md** gains the rules against waiting on a `pgrep -f` pattern and for
  stopping a background waiter once its result is in (they had sat on an
  unmerged branch since 2026-09-23).
- **Coefficient-1 display slips (#191).** `1e^{2x}`, `-1\cos x`, `1i^2`,
  `x + 0` and the like removed across ~180 generators; stray `x^{0}` removed
  from integration answer options; several garbled solution lines fixed. No
  typed answer changed.
- **Fast checks is now a required check.** Every PR waits for it as well as
  the Cloudflare build (proved on #190).
- **Docs (#190).** HANDOFF and DECISIONS no longer say commits land on `main`
  directly.

## 2026-09-24

- **Review fixes (#189).** Fixes from the first `/review-game` run, all
  re-checked by the reviewer that raised them: the `mat-missing` answer bug;
  `x(x+1)` and `i√3` now graded; empty template boxes no longer accepted;
  screen-reader names on every maths-only button; verdict announced; exit
  confirmation on skill and level checks; Continue after going back; keyboard
  access to the complex plane; Linear Equations before Quadratics; repeat
  questions de-duplicated; test suite split into 24 shards (55 → ~30 min, all
  green); new **Fast checks** CI job; mathjs and KaTeX in their own cached
  chunks plus a loading screen; lint warnings 30 → 6. H3 (pinch-zoom lock)
  left as designed; L5 (streak clock change) reverted after failing re-check.
- **Review tooling (#182–#188).** Three reviewer agents, `/review-game`, the
  `fixer` agent and `/apply-fixes` in `.claude/`; `.gitignore` lets
  `.claude/agents/` and `.claude/commands/` be committed.

## 2026-09-22

- **Complex Numbers (task 7).** Surd answers accepted, skill checks only ask
  what their lesson taught, more varied question shapes; the modulus keypad
  gained a power key.
