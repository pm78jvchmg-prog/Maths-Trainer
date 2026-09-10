# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Toolchain

Node and the GitHub CLI are user-local installs, not on the default PATH in a
non-interactive shell. Prefix any command that needs `node`, `npm`, `npx` or `gh`:

```bash
export PATH="$HOME/.local/node/bin:$HOME/.local/gh/bin:$PATH"
```

Without it you get `command not found: node`, which looks like a missing install
rather than a PATH problem. There is no Homebrew, system Node, or Xcode on this
machine; install further tools the same way (user-local tarball) rather than
reaching for a package manager.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Vite dev server on http://localhost:5173 |
| `npm test` | Full suite (~220 tests) |
| `npm run build` | `tsc -b` then Vite build into `dist/`, including the service worker |
| `npm run lint` | oxlint |
| `npx tsc --noEmit -p tsconfig.app.json` | Typecheck alone |

Running one file or one test:

```bash
npx vitest run src/engine/session.test.ts     # one file
npx vitest run -t 'branch'                    # -t takes a REGEX, not a literal
```

`-t` patterns are regular expressions, so a test name containing `|` (e.g. "the
|x| trap") will alternate rather than match — quote a distinctive substring instead.

**`npm test` passing is not sufficient.** Vitest transforms TypeScript with
esbuild, which strips types without checking them; a file can have real type
errors and a green suite. Run the typecheck separately before committing.

## Two invariants that must not regress

Both are enforced in `src/engine/session.ts`, deliberately *not* in components,
so that a UI change cannot quietly break them. Anything that routes around the
reducer is a bug.

1. **A wrong answer never reveals the answer.** `submit` can only ever produce
   `incorrect`; reaching `revealed` requires a separate explicit `reveal`
   action. The feedback bar offers *Try again* and an opt-in *Show me*. In
   `ChoiceSlide`, only the chosen option is ever styled — never the correct one.
2. **The skill check is sealed.** `back` is refused outside the guided phase and
   the phase transition is one-way. `LessonPlayer` removes the back control from
   the DOM rather than disabling it. **There is no router, by design** — routing
   lessons through the URL would hand the browser back gesture a way into the
   guided slides mid-assessment.

A third property falls out of the design: slides are resolved **once**, at
`startSession`. *Try again* therefore re-presents the identical question rather
than redrawing parameters.

This is a single-player personal tool. It deliberately has no XP, streaks,
leagues, or multiplayer — do not add engagement mechanics.

## Answer checking

`src/engine/equivalence.ts` grades by **numeric probing**, not symbolic
simplification: both expressions are evaluated at 24 randomised points and
compared. `mathjs.simplify` cannot show `sin(x)^2 + cos(x)^2 === 1`, and every
case it fails would mark a correct learner wrong.

Consequences worth knowing before changing anything here:

- It is **probabilistic, not proof**. A wrong answer agreeing at all 24 points
  would be accepted; with points drawn off the integers that is vanishingly rare.
- `probePolicy()` holds the accuracy dial. `agreementThreshold` is squeezed from
  both sides: below 1.0 to absorb float noise near poles, but anything at or
  below 0.5 would accept `|x|` as equal to `x` (there is a test for exactly this).
- `mode: 'upToConstant'` compares *differences* across sample points, so any
  valid antiderivative passes regardless of `+ C`.
- `domain: 'complex'` samples off the negative real axis to avoid evaluating on
  the branch cut. It does **not** paper over identities that genuinely fail off
  the principal branch: `log(z^2)` vs `2log(z)` is correctly marked different.
- Unreadable input returns `invalid`, which is surfaced distinctly from a wrong
  answer and does not cost the learner their first-try credit.
- `ln` is aliased to natural log in the mathjs instance (`src/engine/expression.ts`),
  and an unknown function name is reported as invalid input rather than failing
  silently at every sample point.

## Content model

```
Course → Level[] → Lesson[] → { slides: SlideRef[~10], skillCheck: SlideRef[3] }
```

Lesson rhythm: teach → practise ×3 → teach → practise ×2-3, then three sealed
skill-check questions.

Questions are **generated, not hard-coded**. A `Generator` has `sample(rng,
difficulty)`, `render(params)` and `solution(params)`. `render` and `solution`
receive the *same* params, which is the whole point — the worked steps describe
the learner's actual numbers rather than a generic template, and there is a test
asserting solutions vary with the question.

Two string audiences are kept strictly apart, and mixing them is the most common
content bug:

- `*Tex` helpers produce what the learner reads — `3 - 2i`, never `3 + -2i`.
- `answer` is what mathjs parses. It is never displayed, so it can be
  unambiguous rather than pretty (`(3) + (-2)*i`).

`src/content/generators/format.ts` (complex) and `calculus.ts` (differentiation)
own the shared formatters. Check them before writing a new one.

## TeX escaping — the recurring hazard

TeX lives inside JavaScript string literals, so **every backslash must be
doubled in source**: `'\\frac'` to get `\frac` at runtime. A single backslash
collapses (`'\q'` → `q`) and KaTeX renders the literal word "quad" into the
slide. This has bitten twice.

Do **not** author TeX through nested escaping layers — a Python heredoc or an
intermediate script will eat a level silently. Write the file directly.

Three guards in `src/content/generators/generators.test.ts` cover this, and they are
complementary rather than redundant:

- KaTeX strict-mode rendering catches genuinely invalid TeX.
- A command-name denylist catches backslash-stripped commands, which KaTeX
  accepts happily because `overline{3+4i}` *is* valid TeX — it just renders the
  wrong thing. Scoped to TeX fragments only, so English prose containing the
  word "times" does not trip it.
- A prose check catches raw `\uXXXX` escapes reaching the reader as literal text.

## Testing strategy

`src/content/generators/generators.test.ts` holds the **generic** generator
property tests and course-integrity checks for *every* course. New generators
and courses are picked up automatically via `src/content/registry.ts` and
`src/content/courses/index.ts` — there is nothing to register in the test file.

Per generator, across 200 seeds × 2 difficulties:

- the checker accepts the answer the generator claims, and rejects a perturbed one
- tile banks actually contain the tokens their answers need
- choice options are unique and include the correct id
- solutions exist and vary with the parameters

**The oracle test is the important one.** The above only prove a generator agrees
with *itself* — they would pass a question whose stated answer is the wrong
derivative. Expression slides may declare `source`, the function the question is
about; the test differentiates it with `mathjs.derivative` and compares against
the generator's answer. Populate `source` on any new calculus generator.

When adding a guard test, **verify it can fail** — reintroduce the bug, watch it
go red, then restore. Several guards here were confirmed that way, and one
proposed replacement was rejected precisely because it turned out not to fire.

## Adding content

1. Write a `Generator` in `src/content/generators/`, export it from that file's
   array, and it is registered automatically.
2. Reference it by id from a lesson in `src/content/courses/`, then add the
   course to `src/content/courses/index.ts`.
3. Run `npm test` — the property tests pick it up with no wiring.

## Deployment

Pushing to `main` triggers a Cloudflare **Workers** build (not Pages), deploying
to https://maths-trainer.pm78jvchmg.workers.dev. Dashboard settings: build
command `npm run build`, deploy command `npx wrangler deploy`, **root directory
`/`** (that is where the build runs; the output path lives in `wrangler.jsonc`,
never in the dashboard).

The app is installed to an iPhone Home Screen and must work offline — the
service worker precaches everything including KaTeX fonts and mathjs. Do not add
runtime network dependencies.
