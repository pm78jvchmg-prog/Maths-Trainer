# Changes

A short, dated record of what landed and why. Newest first. Each entry names
its pull request; the PR description holds the evidence.

## 2026-09-25

- **Home-screen colours: the seams were an old copy (this PR).** The current
  build already runs one unbroken purple from Algebra Fundamentals to Advanced
  Maths and orange from the Statistics heading down (#180); the iPad was still
  showing an older version. The app now checks for a new version every time it
  is brought back to the front, so one close and reopen picks it up.
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
