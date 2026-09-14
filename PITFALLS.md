# PITFALLS

Where work on this repository goes wrong. Written for someone who will read the
code, make a reasonable-looking change, watch 2583 tests pass, and ship a
regression.

The risk is concentrated in three places, in this order:

1. **The rendering layer has no tests at all.** Every rule the reducer enforces
   is tested *at the reducer*. Whether a component obeys it is tested nowhere.
2. **Two of the strongest guards skip silently.** They only fire on generators
   that opt in, so the way to defeat them is to forget a field.
3. **Several correct-looking simplifications are live bugs.** They were each
   tried once already.

---

## Part 1 — Invariants that look safe to break

### 1.1 "I'll add a router / deep links / a back button"

**Looks like:** a missing feature. Every React app has routing.

**Actually:** it defeats the sealed skill check from *outside* the app. Once a
lesson has a URL, the browser's back gesture is a navigation the reducer never
sees and cannot refuse — the learner swipes back into the worked examples
mid-assessment. That is invariant 2, broken by a control no code in this repo
owns.

**Nothing catches this.** There is no test for the absence of a router.

`wrangler.jsonc` already sets `not_found_handling: "single-page-application"`, so
a stale Home Screen icon on an old path still opens the app. That is the only
URL handling the app needs.

### 1.2 "This widget can decide for itself whether to allow a retry"

**Looks like:** local state, trivially correct.

**Actually:** widgets must read `canRetry(session)` through the `canEdit` prop.
A component that computes it — or forgets to pass it — hands back a second
attempt inside a level check, which is invariant 3.

**Nothing catches this.** `session.test.ts` proves `canRetry` returns `false`
during an assessment. It cannot prove a component asked.

Same shape, same risk: `LessonPlayer` **removes** the back control from the DOM
rather than disabling it. Changing that to `disabled` looks equivalent and is
not — a disabled control is still a control.

### 1.3 "I'll show the correct option in green after a wrong answer"

**Looks like:** ordinary, helpful feedback. Every quiz app does it.

**Actually:** invariant 1. A wrong answer must never disclose the answer;
`reveal` is a separate, explicit, opt-in action. In `ChoiceSlide` **only the
chosen option is ever styled** — never the correct one.

**Partly caught.** The reducer refuses to produce `revealed` from `submit`, and
that is tested. Styling is a component concern and is tested nowhere.

### 1.4 "`edit` should just reset the slide"

**Looks like:** tidying a narrow action into a general one.

**Actually:** `edit` clears `incorrect` and `invalid` and *nothing else*, so
changing an answer is a free retry that can neither undo a pass nor disclose a
solution. Widening it re-opens both.

**Caught:** `session.test.ts` has "cannot undo a pass" and "leaves the worked
solution on screen once it has been shown".

### 1.5 "Try again should give a fresh question"

**Looks like:** more practice.

**Actually:** slides are resolved **once**, at `startSession`. A retry that
redraws parameters is a new question, not another attempt at the one you got
wrong — and the worked solution would then describe numbers the learner never
saw.

**Caught:** "keeps the generated parameters across an attempt".

### 1.6 "A per-lesson score already exists, so a total is a small step"

**Looks like:** an obvious product improvement.

**Actually:** deliberate absence. No XP, no streaks, no leagues, no persistent
points. The reference app shows a running XP total on almost every screen; that
is the one part of it not copied.

**Nothing catches this.**

### 1.7 "The level check can have its own simpler runtime"

**Looks like:** a level check is questions-only, so the lesson machinery is
overkill.

**Actually:** `levelCheckLesson()` wraps it as a `Lesson` with an empty guided
deck, and `startSession` opens any lesson with no guided slides straight into
the sealed phase. **There is no second code path**, which is precisely what stops
the seal being weaker here than in a lesson. A parallel runtime needs every rule
re-implemented, and the first one forgotten is a silent hole.

---

## Part 2 — What the tests do not cover

2583 tests is a misleading number. Here is where they are.

### 2.1 The entire rendering layer is untested

| File | Lines | Tests |
| --- | --- | --- |
| `src/ui/slides.tsx` | 617 | **none** |
| `src/ui/workingSlides.tsx` | 557 | **none** |
| `src/ui/reduceSlide.tsx` | 352 | **none** |
| `src/ui/LessonPlayer.tsx` | — | **none** |
| `src/ui/Math.tsx` | — | **none** |
| `src/ui/FeedbackBar.tsx` | — | **none** |
| `src/ui/figures.tsx`, `flow.ts` | — | **none** |
| `src/ui/mathInput.tsx` | 362 | `mathInput.test.ts` |

There are no component tests and no DOM rendering in the suite. A change to any
widget is verified by **looking at it in a browser** and by nothing else. This is
why the deployment rule says a browser pass is mandatory for anything with a
visible surface.

Practically: `npm test` passing tells you the *content and the engine* are fine.
It tells you nothing about what the learner sees.

### 2.2 The oracle tests skip silently

The two strongest guards in the repo are conditional:

```ts
if (slide.kind !== 'expression' || !slide.source) continue;      // differentiation
if (slide.kind !== 'expression' || !slide.integrand || slide.limits) continue;  // integration
```

A calculus generator that does not declare `source` (or `integrand`, plus
`limits` where definite) is **never independently checked**, and the suite stays
green. Every other property test only proves a generator agrees with *itself* —
they would all pass a question whose stated answer is the wrong derivative.

**If you add a calculus generator and forget the field, nothing will tell you.**
Grep for it before you commit:

```bash
grep -n "source:\|integrand:" src/content/generators/<yourfile>.ts
```

### 2.3 A course file not added to `index.ts` is invisible

Tests import `courses` from `src/content/courses/index.ts`. A new course file
that exists but is not listed there is absent from the app *and* from every
course-integrity check, with no failure anywhere.

### 2.4 Level-check references are only validated by accident

"references only generators that exist" iterates `lesson.slides` and
`lesson.skillCheck`. It does **not** walk `level.levelCheck`.

A typo'd generator id there is still caught — "never repeats a question inside a
level check" runs those refs through `startSession`, which throws on an unknown
generator — but the failure surfaces as a thrown error in a duplicate-detection
test, naming neither the lesson nor the typo. Do not spend twenty minutes
debugging the duplicate detector.

### 2.5 Lint checks almost nothing

`.oxlintrc.json` configures exactly two rules: `react/rules-of-hooks` (error) and
`react/only-export-components` (warn).

There are **25 pre-existing warnings and 0 errors**. The warnings are all Fast
Refresh niceties about files exporting both components and helpers. They are
expected. Do not "fix" them by splitting files — the co-location is deliberate
and the churn buys nothing. `npm run lint` is a check that the count of *errors*
is still zero.

### 2.6 Conventions carried only by comments

None of these is enforced by anything:

- **Display TeX vs parser strings.** `*Tex` helpers produce what the learner
  reads; `answer` is what mathjs parses and is never displayed. Nothing stops
  you rendering `answer` into a prompt, and it will read as `3 + -2i`.
- **Figures use `currentColor`.** A hard-coded colour will look right in the
  theme you tested and wrong in the other.
- **No runtime network dependency.** Nothing fails if you add a CDN link or a
  `fetch`; the app just stops working offline, which is where it is used.
- **`domain: 'positive'` is opt-in per slide.** Nothing stops you making it the
  default, and it would start accepting answers that differ where `x < 0`.
- **Difficulty 2 should be harder than difficulty 1.** Never checked.
- **A generator declaring `choices()` should have its `+choice` form used
  somewhere.** Never checked.

### 2.7 What *is* well covered

So you do not over-correct. These fire reliably, across every generator, with no
per-generator wiring:

- the checker accepts the generator's own answer and rejects a perturbed one
- ≥25 distinct questions per generator per difficulty
- every TeX fragment renders under KaTeX strict mode
- backslash-stripped commands (`overline{...}` — valid TeX that renders the
  wrong thing, so KaTeX raises nothing)
- reduce banks: every non-leaf node has one, ≥4 distinct whole values, including
  the node's own
- reduce solvability: the slide can actually be finished by tapping
- evaluate options: exactly one correct, all whole and distinct
- lesson shape: 9–11 guided slides, exactly 3 skill checks, 10–15 level-check
  questions
- no repeated question inside a lesson or a level check, across 40 seeds
- no three consecutive questions of the same widget shape

---

## Part 3 — Where the obvious fix is wrong

Each of these has been tried.

### 3.1 "A correct answer is being marked wrong — loosen the threshold"

**Obvious fix:** drop `agreementThreshold` below 0.9.

**Why it is wrong:** `|x|` and `x` agree at about half of all real points.
Anything at or below 0.5 marks `|x|` correct for `x`. There is a test for exactly
that, so you will see it fail — but the lesson is that the dial is squeezed from
*both* sides and is not the fix.

**Actual fix:** the answer is almost always the sampling domain. A question about
fractional indices needs `domain: 'positive'`; a complex-numbers question needs
`'complex'`. Check the slide before you touch `probePolicy()`.

### 3.2 "Both sides use the same scope — that's a redundant copy"

**Obvious fix:** `evaluateAt(user.node, scope)` and `evaluateAt(target.node, scope)`.

**Why it is wrong:** mathjs parses `x=0` as an `AssignmentNode` and evaluating it
**writes into the scope**. Sharing one object means a learner's answer containing
`=` rebinds the variable for the expected side too, and the comparison becomes
meaningless. Each side needs `{ ...scope }`.

### 3.3 "These brackets around the fraction are redundant"

**Obvious fix:** serialise a fraction as `(num)/(den)`.

**Why it is wrong:** mathjs binds implicit multiplication tighter than division,
so `(8)/(2)x^2` parses as `8/(2x²)`. The outer pair in `((num)/(den))` is what
makes a correct typed fraction grade correctly.

### 3.4 "Quadratics should use typed answers like the other courses"

**Obvious fix:** replace those `tiles` slides with `expression` slides.

**Why it is wrong:** the checker compares *values*. It cannot tell
`(x + 3)(x - 5)` from `x^2 - 2x - 15` — they are the same function. Every
question in that topic asks the learner to rewrite an expression into an equal
one, so a typed slide accepts the question copied straight back. Tiles grade the
*form*, which is the skill being taught.

The same trap sits under any "simplify this" or "factorise this" question in any
course.

### 3.5 "This `(x)^{1/2}` should be a proper radical"

**Obvious fix:** render the root as `\sqrt{...}` in the reduce line.

**Why it is wrong:** a reduce line is a list of independent fragments, one KaTeX
call each, and a radical cannot be split across them — `\sqrt{` alone is not
valid TeX. One fragment for the whole root leaves **nothing inside it tappable**,
which was a live dead end in three shipped generators. It turns back into a
radical the moment its inside is a number, and the `evaluate` form — where
nothing is tappable — keeps the radical throughout.

The solvability test will catch this one. Read its failure rather than working
around it.

### 3.6 "`\left(` is the correct way to write a bracket"

**Obvious fix:** use `\left(` / `\right)` in reduce fragments and tiles
templates.

**Why it is wrong:** with each fragment rendered by its own KaTeX call, a
`\left(` whose `\right)` is in a different fragment **prints as literal text**
rather than raising. KaTeX runs with `throwOnError: false` in the app, so nothing
reports it. Use plain brackets.

The sibling trap in tiles templates: the template is split on `{n}`, so `x^{2}`
has its `{2}` taken for a blank marker. Write `x^2`.

### 3.7 "This test is failing intermittently — reduce its sample count"

**Obvious fix:** trim the seeds in the oracle test.

**Why it is wrong:** it is not flaky, it is slow. Symbolic differentiation plus
24 probes per draw overruns vitest's 5s default once the other files compete for
CPU, which is why it carries an explicit `60_000` budget. Give a slow sweep a
budget; do not weaken its coverage.

### 3.8 "The learner took the operator early — that's an order mistake, refuse it"

**Obvious fix:** reject a reduce move on a piece whose operands are not settled.

**Why it is wrong:** it marks *correct arithmetic* wrong. A learner who works
`6 + 4 - 3` out and enters 7 has not made a mistake. The value alone catches the
real error: taking `8 + 4 x 3` left to right produces 36, not 20. The
`out-of-order` fault was removed for exactly this reason.

### 3.9 "I'll write a multiple-choice twin of this generator"

**Obvious fix:** a second generator in the same file.

**Why it is wrong:** it is the same content written twice and it falls out of
step. Declare `choices(params)` on the existing generator and the registry
derives `<id>+choice` automatically; a lesson references that id like any other.

### 3.10 "The options should be shuffled"

**Obvious fix:** `rng.shuffle(options)`.

**Why it is wrong:** a shuffle seeded per draw makes one question render two
ways, and the deck de-duplicator compares *rendered* slides — so the same
question can appear twice in one lesson with the options moved around. The
rotation is hashed from the option labels instead. Tile banks are sorted for the
same reason.

### 3.11 "Deriving this value is cleaner than a lookup table"

**Obvious fix:** `Math.hypot(a, b)` instead of the Pythagorean triples table.

**Why it is wrong:** it rounds a float back to the integer already known, and it
lets a mistyped row produce a plausible wrong answer instead of failing a test.
The table is the check.

### 3.12 "I'll generate this TeX with a script"

**Obvious fix:** a Python heredoc or a small codegen step for repetitive TeX.

**Why it is wrong:** every backslash must be doubled in source (`'\\frac'`), and
an intermediate layer eats one level silently. `'\q'` collapses to `q` and KaTeX
renders the literal word "quad" into the slide. This has bitten twice. Edit the
file directly.

---

## Pre-flight, by task

**Adding a generator**
- [ ] Exported from its file's array (registration is automatic)
- [ ] Calculus? `source`, or `integrand` (+ `limits` if definite) — or the oracle skips it
- [ ] `domain` matches the maths, not the default
- [ ] Can it produce ≥25 distinct questions per difficulty?
- [ ] Consider `choices()` rather than a second generator

**Adding or editing a course**
- [ ] Listed in `src/content/courses/index.ts`, or it does not exist
- [ ] 9–11 guided slides, exactly 3 skill checks
- [ ] Level check 10–15 questions
- [ ] No three consecutive questions through the same widget

**Touching the reducer**
- [ ] Which of the three invariants does this touch?
- [ ] Does any component now need to be re-checked by hand? (Nothing tests them.)

**Touching anything in `src/ui/`**
- [ ] Opened it in a browser at 393×852 — the suite covers none of this
- [ ] Checked for `.katex-error` elements and horizontal overflow
- [ ] If it renders TeX in fragments: plain brackets, and every fragment valid alone

**Before every commit**
```bash
export PATH="$HOME/.local/node/bin:$PATH"
npx tsc --noEmit -p tsconfig.app.json   # types are NOT checked by npm test
npm test                                # note the count; it must not drop
npm run lint                            # 25 warnings expected, 0 errors
npm run build
```

A push to `main` deploys straight to production. There is no review step to
catch what these miss.
