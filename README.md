# Maths Trainer

Single-player maths practice with Brilliant's lesson shape: short guided slides,
one idea at a time, immediate feedback. No XP, no streaks, no leagues.

Two behaviours are deliberate and enforced in the session reducer rather than the
UI, so no component can break them by accident:

- **A wrong answer never reveals the answer.** The bar offers *Try again* and an
  opt-in *Show me*. Nothing is disclosed unless you ask for it. Changing your
  answer is itself a retry — the wrong verdict clears as you edit — but that
  cannot undo a pass or bring back a solution you never asked to see.
- **The skill check is sealed.** The last three questions run with no route back
  to the guided examples. The back control is absent from the DOM, not merely
  disabled.

## Running it

Node lives at `~/.local/node` and is added to `PATH` in `~/.zshrc`.

```bash
npm install
npm run dev
```

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server on http://localhost:5173 |
| `npm test` | Vitest: equivalence engine, session reducer, generator properties |
| `npm run build` | Production build into `dist/`, including the service worker |
| `npm run preview` | Serve the production build locally |

## How it fits together

```
src/engine/     equivalence checking, seeded RNG, the lesson state machine
src/content/    slide types, question generators, course definitions
src/ui/         slide widgets, feedback bar, lesson player
src/store/      progress, persisted to localStorage
```

Courses are grouped into categories, which are the tabs on the home screen. Each
level ends with an optional **level check**: an assessment with no teaching
slides, sealed from the first question rather than only after the guided ones.

**Answer checking** (`src/engine/equivalence.ts`) evaluates both the learner's
expression and the expected one at 24 randomised points and compares the results,
rather than trying to prove them equal symbolically. `simplify` cannot show that
`sin(x)^2 + cos(x)^2` is `1`, and every case it fails on would mark a correct
answer wrong. Probing handles rearrangement, equivalent forms, complex arithmetic,
and — in `upToConstant` mode — any valid choice of `+ C`.

It is probabilistic rather than proof. A wrong answer matching at all 24 points
would be accepted; with points drawn off the integers that is vanishingly unlikely.

**Questions are generated, not hard-coded** (`src/content/generators/`). Each
generator draws parameters from a seeded RNG and derives both the answer and the
worked solution from them, so replaying a lesson gives fresh numbers and *Show me*
always describes the question actually on screen.

Slides resolve once, when a session starts. *Try again* therefore re-presents the
identical question rather than quietly swapping in a different one.

## Tests

`npm test` runs 100 checks. The generator suite is the important one: it runs
every generator across 200 seeds at two difficulties and asserts that the checker
accepts the answer the generator claims, rejects a perturbed one, and that tile
banks actually contain the tokens their answers need. A generator bug otherwise
surfaces as an unanswerable question halfway through a lesson.

## Adding content

Add a `Generator` in `src/content/generators/`, export it from the array at the
bottom of that file, then reference it by id from a lesson in
`src/content/courses/`. The property tests pick it up automatically.
