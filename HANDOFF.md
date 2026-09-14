# HANDOFF

Orientation for someone picking this repository up cold. Facts and procedures
only. `CLAUDE.md` carries the design reasoning; this file carries the map.

Baseline at the time of writing: commit `afc9853`, **2583 tests in 6 files**,
about 83 seconds. 8 courses, 89 lessons, ~127 question generators.

---

## 1. What the system does

**Maths Trainer** is a single-player maths practice web app. It is a PWA,
installed to the owner's iPhone Home Screen, and **must work offline** — the
service worker precaches everything including KaTeX fonts and mathjs. Do not add
any runtime network dependency.

A learner picks a course, plays a lesson of about ten slides — teaching slides
interleaved with questions — and finishes with three sealed *skill check*
questions. Each level also has a *level check*: 10–15 questions, no teaching, one
attempt each, scored as a percentage.

**Questions are generated, not hard-coded.** A course references a generator by
id and a difficulty; the generator draws parameters from a seeded RNG and builds
the slide. The same session seed always rebuilds the same lesson.

Stack: React + TypeScript + Vite, KaTeX for rendering, mathjs for parsing and
evaluating answers, Zustand for progress in `localStorage`, Vitest for tests.

**There is no router, deliberately.** Screens live in component state. Routing
lessons through the URL would let the browser back gesture into the guided slides
during a sealed assessment.

**No engagement mechanics.** No XP, no streaks, no leagues, no persistent points
total. A per-lesson score is fine. Do not add any of these.

---

## 2. Commands

Node is a user-local install and is **not** on `PATH` in a non-interactive shell.
Prefix every command:

```bash
export PATH="$HOME/.local/node/bin:$HOME/.local/gh/bin:$PATH"
```

Without it you get `command not found: node`, which looks like a missing install
but is a `PATH` problem.

| Command | Purpose |
| --- | --- |
| `npm run dev` | Dev server on http://localhost:5173 |
| `npm test` | Full suite (`vitest run`) |
| `npx tsc --noEmit -p tsconfig.app.json` | Typecheck alone |
| `npm run lint` | oxlint — warnings are expected, **errors are not** |
| `npm run build` | `tsc -b` then Vite build into `dist/`, service worker included |

One file, or one test:

```bash
npx vitest run src/engine/session.test.ts
npx vitest run -t 'branch'      # -t takes a REGEX, not a literal string
```

`-t` patterns are regular expressions. A test name containing `|` will alternate
rather than match; quote a distinctive substring instead.

**`npm test` passing is not sufficient.** Vitest strips types with esbuild
without checking them, so a file can have real type errors and a green suite.
Run the typecheck separately, every time.

---

## 3. The five files that matter most

### 1. `src/engine/session.ts` (~514 lines)

The lesson state machine. `startSession()` resolves a lesson's slides once;
`reduce(session, action)` handles every `submit`, `edit`, `tryAgain`, `reveal`,
`continue` and `back`.

**Every grading decision and every rule about what the learner may do lives
here, not in components.** That is deliberate: a UI change cannot break a rule it
does not implement. Anything that routes around this reducer is a bug.

### 2. `src/content/types.ts` (~469 lines)

The `Slide` union (11 kinds: `teach`, `choice`, `expression`, `plot`, `slider`,
`tiles`, `steps`, `tree`, `flow`, `reduce`, `evaluate`), the `Block` union for
prompt content, the `Generator` interface, and the `Category → Course → Level →
Lesson → SlideRef` content model. You cannot add a question type or a course
without reading this.

### 3. `src/content/generators/generators.test.ts` (~918 lines)

The safety net, and the reason changes here are survivable. It sweeps **every**
generator in the registry across 200 seeds × 2 difficulties and every course, with
no per-generator wiring — new generators are picked up automatically via
`src/content/registry.ts`. It asserts, among other things:

- the checker accepts the generator's own answer and rejects a perturbed one
- an independent oracle (`mathjs.derivative`, or quadrature) confirms calculus answers
- every generator can produce ≥25 distinct questions per difficulty
- every TeX fragment renders under KaTeX strict mode, with no backslash-stripped commands
- lesson shape: ~10 guided slides, 3 skill checks, 10–15 level-check questions
- no question repeats inside one lesson or level check

If you break something broadly, this file usually tells you exactly what.

### 4. `src/engine/equivalence.ts`

Grades typed answers by **numeric probing**, not symbolic simplification: both
expressions are evaluated at 24 randomised points and compared. `checkAnswer()`
returns `correct`, `incorrect`, `invalid` (unreadable input — surfaced
differently and costing no first-try credit) or `indeterminate` (too few usable
points).

Symbolic simplification was rejected because `mathjs.simplify` cannot show
`sin(x)^2 + cos(x)^2 === 1`, and every case it fails would mark a correct learner
wrong. The dial is `probePolicy()`; `agreementThreshold` is squeezed from both
sides and anything at or below 0.5 would accept `|x|` as equal to `x` (there is a
test for exactly that). Options: `mode: 'upToConstant'` for antiderivatives,
`domain: 'real' | 'complex' | 'positive'`.

### 5. `src/content/expr.ts` (~560 lines)

An arithmetic expression as a tree, behind the `reduce` and `evaluate` slides —
the newest and most intricate subsystem. Nodes: `num`, `binary`, `power`, `root`,
`log`, `trig`. It owns which pieces the learner may tap (`targets`), what a piece
is worth (`valueOf`), what the line becomes (`reduceAt`), how it renders
(`renderExpr`, `toTex`) and how a walk is graded (`replay`).

Adding a node kind means touching `nodeAt`, `valueOf`, `isReducible`, `targets`,
`reduceAt`, `renderExpr` and `toTex`. `valueOf` must round: `sin(180)` and
`log_2(8)` both come back a hair off a whole number through floats.

---

## 4. Everything else, briefly

```
src/engine/      session.ts, equivalence.ts, expression.ts (mathjs setup), rng.ts
src/content/     types.ts, expr.ts, registry.ts, choiceVariant.ts, figures.ts
  generators/    one file per topic; each exports an array of Generator
  courses/       one file per course; index.ts groups them into categories
src/ui/          slides.tsx (widget dispatch), LessonPlayer.tsx, Math.tsx (KaTeX),
                 mathInput.tsx (the answer editor), reduceSlide.tsx, workingSlides.tsx
src/store/       progress.ts (Zustand + localStorage)
```

`src/content/choiceVariant.ts` derives a multiple-choice twin of any generator
that declares `choices()`, registered as `<id>+choice`. A lesson references that
id like any other; there is no second generator to maintain.

---

## 5. Rules that must not regress

All three are enforced in `src/engine/session.ts`.

1. **A wrong answer never reveals the answer.** `submit` can only ever produce
   `incorrect`; reaching `revealed` needs a separate explicit `reveal` action.
   In `ChoiceSlide`, only the chosen option is ever styled — never the correct
   one. Retrying is a tap anywhere on the question, gated on `canRetry`.
2. **The skill check is sealed.** `back` is refused outside the guided phase and
   the phase transition is one-way. `LessonPlayer` removes the back control from
   the DOM rather than disabling it.
3. **A level check is one attempt per question.** A lesson with
   `assessment: true` refuses `tryAgain`, refuses `edit` on a graded answer,
   never reveals working, and advances past a wrong answer. Widgets read
   `canRetry(session)` through the `canEdit` prop rather than deciding for
   themselves.

Two consequences worth knowing: slides are resolved **once**, at `startSession`,
so *Try again* re-presents the identical question; and `resolveDeck`
**de-duplicates within a deck** by re-drawing with a bumped seed salt.

---

## 6. How to verify a change is correct

Run all four, in this order, before committing. They are cheap next to shipping a
broken lesson.

```bash
export PATH="$HOME/.local/node/bin:$PATH"
npx tsc --noEmit -p tsconfig.app.json     # must be silent
npm test                                  # 6 files; count must not drop
npm run lint                              # warnings fine, zero errors
npm run build                             # must complete
```

Note the test **count** before and after. A count that falls means a test
disappeared, which is a regression even when the suite is green.

**For anything with a visible surface, that is still not enough.** Open it in a
browser and look at it. A test suite cannot tell you that a dot is clipped by the
edge of its viewBox or that a bracket printed as the literal word "left".

```bash
npm run dev     # then open http://localhost:5173 and play the lesson you changed
```

Chromium is installed under `/opt/pw-browsers/` (currently
`chromium-1194/chrome-linux/chrome`; `ls` it rather than assuming the version)
and `playwright-core` is available, so this can be driven headlessly. Use a
393×852 viewport — the app is used on a phone. Check for `.katex-error` elements
and for `document.body.scrollWidth > window.innerWidth`.

**When you add a guard test, verify it can fail.** Reintroduce the bug, watch the
test go red, then restore the fix. A guard that cannot fire is worse than none,
because it reads like coverage.

### Adding a generator

1. Write it in `src/content/generators/<topic>.ts` and add it to that file's
   exported array. Registration is automatic.
2. Reference it by id from a lesson in `src/content/courses/`.
3. Run `npm test` — the property tests pick it up with no wiring.

Populate `source` on a differentiation generator and `integrand` (plus `limits`
where definite) on an integration one, or the independent oracle test cannot
check it and will only confirm the generator agrees with itself.

---

## 7. Failure modes that have actually happened

| Symptom | Cause |
| --- | --- |
| `command not found: node` | `PATH` not exported (§2) |
| Green suite, broken build | Types never checked — run `tsc --noEmit` |
| KaTeX renders the literal word "quad" or "times" | A single backslash in a TS string literal. Every backslash must be **doubled** in source: `'\\frac'` |
| TeX loses a backslash after an edit | Authored through a nested escaping layer. Do not write TeX through a Python heredoc or an intermediate script — edit the file directly |
| `\left(` printed as text instead of rendering | A `reduce` line is a list of independent fragments, one KaTeX call each. `\left(` with no matching `\right)` *in the same fragment* prints literally rather than raising. Use plain brackets |
| A correct typed fraction marked wrong | mathjs binds implicit multiplication tighter than division. Bracket whole fractions when building the answer string |
| An answer containing `=` grades wrongly | mathjs `AssignmentNode` mutates the shared scope. Each side must get its own `{ ...scope }` |
| Intermittent failure in the oracle test that passes when run alone | It is the slowest test by far and carries an explicit 60s timeout. Give any slow sweep a budget rather than trimming its sample count |
| Change deployed but the phone shows the old version | Stale service-worker cache. Fully quit and reopen the app |

---

## 8. Deployment

Pushing to `main` triggers a Cloudflare **Workers** build (not Pages) that
deploys to https://maths-trainer.pm78jvchmg.workers.dev. Build command
`npm run build`, deploy command `npx wrangler deploy`, root directory `/`. The
output path lives in `wrangler.jsonc`, never in the dashboard.

**Every push to `main` deploys straight to production**, deliberately — the owner
wants a change on their phone a couple of minutes after it is made, so commits
land on `main` directly rather than through a pull request. There is no
branch-protection backstop.

The cost of that is that nothing catches a bad change before the learner meets
it. The checks in §6 have to happen **before** the push, not after.
