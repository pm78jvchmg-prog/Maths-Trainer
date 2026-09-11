# Maths Trainer — audit brief

You are auditing a finished-ish build against what the owner actually asked for,
across two sessions (one compacted). You have two jobs:

1. **Compliance** — for each requirement below, find the code that satisfies it
   and say whether it is fully done, partly done, or absent. Cite `file:line`.
2. **Improvement** — propose concrete, implementable changes, ranked by value to
   the learner per unit of work. Anything you propose must be small enough for a
   Sonnet agent to implement from your description alone.

Do not write code. Produce a report. Every finding needs a file:line anchor and
a one-line "what done looks like".

## The product

A single-player maths practice PWA the owner uses on their iPhone Home Screen.
React + TypeScript + Vite, deployed to Cloudflare Workers, must work offline.
It is modelled on Brilliant.org's lesson flow. `CLAUDE.md` at the repo root is
authoritative on architecture, invariants and house style — read it first, and
treat its three invariants and its "no engagement mechanics" rule as constraints
you may not propose breaking.

## Requirements, as stated by the owner

### From the opening brief (session 1)

- R1. Smoother gameplay UI. Slide-to-slide transitions were called out
  specifically as **abrupt** versus the reference app.
- R2. Slightly more explanation in non-question (teaching) slides.
- R3. **Re-attempt a wrong answer from inside the question's own UI**, via a
  selectable button in the question, rather than having to press "Try again" in
  the feedback bar.
- R4. Fill-in-the-blank questions that offer **incorrect options alongside the
  correct ones** — "here are all available options, as well as some incorrect
  options that should not be selected at all, place the correct options in their
  correct positions in this equation".
- R5. Multi-step working questions, and decision-tree / flowchart answers.
- R6. Progressive difficulty GCSE → A-level → Undergrad, as one course with more
  levels where a topic recurs. Target shape: ~12 levels, 5-8 courses per level.
- R7. Dark mode only. No light mode wanted.
- R8. Textbox/tile sizing was wrong on a 393px-wide phone screen; content hung
  off the side of its tile.
- R9. Subagents should run on a cheaper model than Opus where they can still do
  the job, escalating effort first, then model.
- R10. The owner wants changes to arrive as a **pull request**.

### From session 2

- R11. Question variety: consecutive questions between teaching slides were
  "quite similar" in shape. Wanted across all lessons, including future ones.
- R12. A full code audit for UI tidiness and smooth slide transitions.
- R13. Interactive figures: a **draggable slider** that the learner moves to
  determine an answer, with a live readout; and an **animated traversal** — a dot
  tracking a plotted curve left to right with a dotted drop-line, replayable via
  a Replay button. (Screenshots from the reference app; not yet built.)
- R14. A richer answer keypad: fraction input, decimal, equals, square root,
  exponent, and **cursor left/right so a typo can be fixed without deleting
  everything after it**. (Built — see `src/ui/mathInput.tsx`. Audit it.)
- R15. Because those keys exist, **broaden the question types each lesson asks**.
  This is the owner's next priority and work on it is starting now — check it is
  going the right way rather than duplicating it.
- R16. No XP, streaks, leagues, or multiplayer. A per-lesson score is fine, a
  persistent points total is not. This is a hard constraint, not a preference.

## Where to look

- `CLAUDE.md` — architecture, the three invariants, testing strategy, TeX hazards.
- `src/engine/` — `session.ts` (the reducer, where the invariants live),
  `equivalence.ts` (numeric-probing answer checking).
- `src/content/` — `types.ts`, `generators/` (question generators),
  `courses/` (the lesson decks), `registry.ts`.
- `src/ui/` — `LessonPlayer.tsx`, `slides.tsx`, `workingSlides.tsx`,
  `mathInput.tsx`, `Math.tsx`, and `src/index.css`.

## Ground rules

- Verify by reading code, not by trusting `CLAUDE.md` or this brief. Where the
  docs and the code disagree, that disagreement is itself a finding.
- `npm test` (~1886 tests) passing is not proof of correctness; the suite is
  mostly generator property tests. Say where coverage is thin.
- Do not propose engagement mechanics (R16), a router (invariant 2), or anything
  that moves an invariant out of `src/engine/session.ts` into a component.
- Rank ruthlessly. A short list that gets built beats a long list that doesn't.

## Output

Write your report to `AUDIT-REPORT.md` in the repository root:

1. **Compliance table** — requirement, verdict (done / partial / absent),
   evidence `file:line`, one line on the gap.
2. **Ranked improvements** — for each: what, why it matters to the learner,
   the files to touch, what done looks like, and a size estimate (S/M/L).
3. **Risks** — anything you found that is quietly broken or likely to break.


## How this audit gets used

Your report is the whole deliverable. It will be read back into a separate
Claude Code session that has the full history of this project, and every item in
your ranked list will be handed verbatim to a Sonnet agent to implement, with no
further human review. So each item must stand alone: name the files, say
precisely what to change, and say what "done" looks like in a way a fresh agent
with no memory of this audit can verify. An item a Sonnet agent could misread
into a large refactor is a bad item — split it or drop it.

Changes deploy straight to `main`, which publishes to the owner's phone within
minutes. There is no review gate. Weight your ranking accordingly: prefer
changes provably safe under the existing test suite, and explicitly flag any
recommendation whose failure mode would be visible to the learner mid-lesson.

When you are done, commit `AUDIT-REPORT.md` on a branch named `audit/report` and
push it, so the other session can read it:

```
git checkout -b audit/report
git add AUDIT-REPORT.md
git commit -m "Add full-project audit report"
git push -u origin audit/report
```
