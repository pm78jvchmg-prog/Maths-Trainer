# DECISIONS

Every non-obvious decision in this project, with the reasoning and the
alternative that was rejected.

**⚠ marks a decision a fresh reader would plausibly reverse** — one that looks
like an oversight, an over-complication, or a missing feature until you know
why it is there. Read those before changing anything in that area.

---

## The ten most reversible

| # | Decision | What happens if you reverse it |
| --- | --- | --- |
| [C1](#c1) | Quadratics uses `tiles`, not typed answers | The checker accepts the question copied straight back |
| [S3](#s3) | No router, anywhere | The browser back gesture opens a route into a sealed assessment |
| [G1](#g1) | Numeric probing, not symbolic simplification | Correct answers get marked wrong |
| [C3](#c3) | Display TeX and parser strings kept apart | Learners read `3 + -2i`, or the parser gets ambiguous input |
| [U3](#u3) | Fractions serialised with outer brackets | `(8)/(2)x^2` parses as `8/(2x²)` — correct answers marked wrong |
| [G2](#g2) | `agreementThreshold` is 0.9, not 1.0 | Float noise near poles marks correct answers wrong |
| [E6](#e6) | Unsettled roots render as `(x)^{1/2}` | Nothing inside the root is tappable; the slide is a dead end |
| [E4](#e4) | Reduce grading tests the value only | Correct arithmetic in fewer taps gets marked wrong |
| [P1](#p1) | No XP, streaks or leagues | The one part of the reference app deliberately not copied |
| [C5](#c5) | Choice rotation is hashed, not random | One question renders two ways and the de-duplicator stops working |

---

## Answer checking (`src/engine/`)

### G1 ⚠ Grade by numeric probing, not symbolic simplification {#g1}

**Decision.** Both expressions are evaluated at 24 randomised points and
compared. No rearranging of symbols.

**Why.** `mathjs.simplify` cannot reliably show that `sin(x)^2 + cos(x)^2` is 1,
nor that two integration-by-parts results agree. Every near-miss it fails on
would be a learner who was actually right, marked wrong.

**Rejected.** Symbolic simplification. It is what you reach for first and it
does not work well enough at this job.

**Note.** This is probabilistic, not proof. A wrong answer coincidentally
matching at all 24 points would be accepted; with points drawn off the integers
that is vanishingly unlikely. That trade is the point, not an oversight.

### G2 ⚠ `agreementThreshold: 0.9` — squeezed from both sides {#g2}

**Decision.** Two outliers in 24 are tolerated.

**Why.** Below 1.0 because floating-point noise near poles and removable
singularities is real: `(x^2-1)/(x-1)` is algebraically `x+1`, but sampled very
close to `x = 1` the subtraction cancels nearly every significant digit. Not
much lower, because `|x|` and `x` agree at about half of all real points — so
anything at or below 0.5 marks `|x|` correct for `x`. There is a test for
exactly that.

**Rejected.** Exact agreement (too brittle) and a loose threshold (unsound).

### G3 Sample points avoid 0, ±1 and small integers ⚠ {#g3}

**Decision.** Values are drawn from `±[0.35, 2.6]`, off the integers.

**Why.** At `x = 1` the expressions `x`, `x^2` and `sqrt(x)` all agree.
Integer-heavy sampling invents false matches.

**Rejected.** Sampling integers, which looks simpler and is wrong.

### G4 `indeterminate` is a fourth verdict

**Decision.** Below `minValidPoints: 8` usable points, the checker refuses to
decide.

**Why.** Points where either side hits a domain hole (`1/x` at 0, `log` of a
negative) are discarded, so a check can end up with far fewer usable points than
it drew. A verdict resting on two lucky points is worse than no verdict.

**Rejected.** Deciding anyway from whatever survived.

### G5 ⚠ Each side of a comparison gets its own scope copy {#g5}

**Decision.** `evaluateAt(user.node, { ...scope })` and
`evaluateAt(target.node, { ...scope })` — two copies, not one shared object.

**Why.** mathjs parses `x=0` as an `AssignmentNode`, and evaluating it *writes
into the scope*. With a shared object, a learner's answer containing `=`
rebinds the variable for the expected side too, and the comparison is
meaningless.

**Rejected.** Passing one scope to both. It looks like the obvious
de-duplication and is a live grading hole.

### G6 `domain: 'positive'` is opt-in per slide, never the default ⚠

**Decision.** A third sampling domain that drops the sign flip, used only where
a slide asks for it.

**Why.** `sqrt(x^3)` and `x^(3/2)` are the same function for `x ≥ 0` and every
textbook writes them as equal — but mathjs reads both through the principal
branch at negative `x` and they differ for three powers in four. Probing the
whole real line marks a correct indices answer wrong.

**Rejected.** Making it global. It also accepts answers that differ only where
`x < 0` — `sqrt(x^2)` for `x` among them — which is right for a question about
indices and wrong for most other questions.

### G7 The complex domain avoids the branch cut but does not hide it

**Decision.** Complex samples keep `|Im|` clear of zero, so no point lands on
the negative real axis.

**Why.** That is the branch cut of `log` and `sqrt`, where evaluation either
side is unstable. Avoiding sampling *at* the discontinuity is not the same as
papering over it: `log(z^2)` and `2log(z)` differ over half the plane and are
still correctly marked different.

**Rejected.** Normalising branches, which would accept genuinely different
functions.

### G8 `invalid` is distinct from `incorrect`, and costs no first-try credit

**Decision.** Unreadable input is surfaced as "that isn't a complete
expression", not as a wrong answer.

**Why.** A typo is not a misconception. Charging a learner their first-try
credit for one punishes the keyboard, not the maths.

**Rejected.** Treating unparseable input as wrong.

### G9 `ln` is aliased to mathjs `log`

**Decision.** `math.import({ ln: math.log })`.

**Why.** Without it `ln(x)` *parses* — it looks like a function call — and then
fails at every sample point, so the learner is told their answer could not be
checked rather than that it was right.

**Rejected.** Leaving it. The failure mode is silent and misleading.

### G10 `i`, `e`, `pi` and friends are excluded from free variables

**Decision.** A built-in symbol set the probe never assigns values to.

**Why.** Without excluding `i`, the expression `3+4i` looks like it has a free
variable named `i`, and the checker starts handing it random values.

---

## Session rules (`src/engine/session.ts`)

### S1 All three invariants live in the reducer, never in components

**Decision.** A wrong answer never reveals; the skill check is sealed; a level
check is one attempt. All enforced in `reduce()`.

**Why.** A UI change cannot break a rule it does not implement. Anything that
routes around the reducer is a bug by definition.

**Rejected.** Enforcing in the feedback bar and the widgets, where every new
component is a fresh chance to forget.

### S2 The back control is removed from the DOM, not disabled

**Decision.** `LessonPlayer` does not render it during an assessment.

**Why.** A disabled control is still a control. Removal makes the seal a fact
about the page rather than a property someone can toggle.

**Rejected.** `disabled={true}`.

### S3 ⚠ There is no router, by design {#s3}

**Decision.** Screens live in component state. Every URL is `/`.

**Why.** Routing lessons through the URL hands the browser back gesture a way
into the guided slides mid-assessment — which defeats the seal from outside the
app, where no reducer can refuse it.

**Rejected.** React Router, or any URL-driven navigation. This is the single
most likely thing a fresh reader adds "for free", and it breaks invariant 2.

`wrangler.jsonc` sets `not_found_handling: "single-page-application"` so a stale
Home Screen icon pointing at an old path still opens the app.

### S4 Slides are resolved once, at `startSession` ⚠

**Decision.** *Try again* re-presents the identical question.

**Why.** A retry that redraws parameters is a new question, not another attempt
at the one you got wrong.

**Rejected.** Re-sampling on retry.

### S5 The `edit` action is deliberately narrow

**Decision.** `edit` clears `incorrect` and `invalid` and nothing else.

**Why.** Changing your answer should be a free retry. It must not be able to
undo a pass or disclose anything, so it is given exactly the power it needs.

**Rejected.** A general "reset slide" action.

### S6 Deck de-duplication re-draws with a seed salt, capped at 24 tries ⚠

**Decision.** A generated slide that renders identically to one already in the
deck is re-drawn with a bumped salt; after 24 attempts it gives up.

**Why.** A generator draws from a finite pool and a lesson may ask it ten times,
so the birthday problem makes a repeat likely long before the pool runs out —
ten draws from forty variants collide almost every time. Five identical
questions in one lesson shipped before this existed. The salt is part of the
seed key, so the escape is itself deterministic.

**Rejected.** Widening every pool until luck suffices (not achievable for "what
is `i` squared"), and looping until distinct (hangs on a small generator).

### S7 Guided and skill-check decks are de-duplicated separately

**Decision.** Two `seen` sets, not one.

**Why.** A skill-check question matching a guided one is the assessment doing
its job. Two identical guided slides are a wasted slide.

### S8 A level check reuses `Lesson` rather than inventing a second shape ⚠

**Decision.** `levelCheckLesson()` wraps a level check as a `Lesson` with an
empty guided deck and `assessment: true`; `startSession` opens any lesson with
no guided slides straight into the sealed phase.

**Why.** There is no second code path, which is what stops the seal being weaker
here than in a lesson.

**Rejected.** A dedicated assessment runtime, which would need every rule
re-implemented and re-tested.

### S9 A plotted point is a real union member, not a `"re,im"` string

**Decision.** `Answer = string | string[] | PlotAnswer`.

**Why.** Grading is a field comparison; nothing has to parse a convention back
out of text.

### S10 Sequence answers are compared element-wise, not by joining

**Decision.** No `answer.join(',') === expected.join(',')`.

**Why.** Any separator character can appear inside a token.

---

## Content model (`src/content/`)

### C1 ⚠ Quadratics is almost entirely `tiles`, not typed expressions {#c1}

**Decision.** The learner places tokens into blanks rather than typing an
expression.

**Why.** The checker compares *values*, so it cannot tell `(x + 3)(x - 5)` from
`x^2 - 2x - 15` — they are the same function. Every question in this topic asks
the learner to rewrite an expression into an equal one, so a typed slide would
accept the question copied straight back. Tiles grade the *form*, which is the
actual skill.

**Rejected.** Expression slides, which look simpler and grade nothing. Where an
answer genuinely is a new number — a discriminant, a root, a line of symmetry —
a typed slide *is* used.

### C2 Questions are generated, not authored

**Decision.** A `Generator` has `sample(rng, difficulty)`, `render(params)` and
`solution(params)`.

**Why.** `render` and `solution` receive the *same* params, so the worked steps
describe the learner's actual numbers rather than a generic template. There is a
test asserting solutions vary with the question.

**Rejected.** Hand-written question banks.

### C3 ⚠ Display TeX and parser strings are two separate audiences {#c3}

**Decision.** `*Tex` helpers produce what the learner reads (`3 - 2i`, never
`3 + -2i`). `answer` is what mathjs parses, is never displayed, and may be
unambiguous rather than pretty (`(3) + (-2)*i`).

**Why.** They have different requirements. Pretty output is ambiguous to a
parser; unambiguous input is ugly to a reader.

**Rejected.** One string for both. Mixing them is the most common content bug in
this repo, and DRY-ing them is the reversal that causes it.

### C4 `+choice` variants are derived, not written

**Decision.** Any generator declaring `choices()` is automatically registered
again under `<id>+choice`.

**Why.** A lesson asking one generator seven times reads as the same question
seven times even when no two draws are alike. A second *shape* fixes that; a
second generator is the same content written twice, and falls out of step.

**Rejected.** Hand-writing a multiple-choice twin per lesson.

### C5 ⚠ Choice rotation is hashed from the option labels, not shuffled {#c5}

**Decision.** The answer's position is decided by hashing the option text.

**Why.** A shuffle seeded per draw makes one question render two ways — and the
deck de-duplicator compares rendered slides, so the same question could appear
twice in one lesson with the options moved around.

**Rejected.** `rng.shuffle(options)`, which is what it looks like it should be.

The same reasoning applies to tile banks: **sorted, not shuffled**. A bank built
answers-first would give the game away; a shuffled one defeats de-duplication.

### C6 Choice options are identified by index, not by label

**Why.** An option's text is the thing being tested; it is not an identifier.

### C7 A topic met at two levels is one course with more levels

**Decision.** `Category` carries the difficulty banding, not the course.

**Why.** Otherwise A-level and undergraduate versions of a topic become two
entries competing for the same name.

### C8 A lesson's lead-in prose belongs to the `SlideRef`, not the generator

**Decision.** Teaching text is prepended to a generated question's prompt.

**Why.** A lesson reads as one thread rather than a teaching block followed by a
quiz block. "Let's think about what we just did in reverse" belongs with the
question it sets up, not on a slide the learner has to remember across a tap.

### C9 Pythagorean triples are listed, not computed

**Decision.** A literal table of `[leg, leg, hypotenuse]`.

**Why.** Deriving with `Math.hypot` means rounding a float back to the integer we
already know — and would let a mistyped row produce a plausible wrong answer
instead of failing a test.

---

## Tiles (`src/content/generators/quadratics.ts`)

### T1 ⚠ Tiles templates avoid `x^{2}` and `\left(` {#t1}

**Decision.** Templates are written `x^2` with plain parentheses.

**Why.** A template is split on `{n}` and each literal piece is rendered as TeX
on its own. Braces around a digit — `x^{2}` — have their `{2}` taken for a blank
marker. `\left` or `\right` spanning a blank leaves each half unmatched and
renders as an error. Both forms render identically anyway.

**Rejected.** Conventional TeX, which a reader will "correct" it to.

### T2 The tile bank keeps answers with multiplicity

**Why.** A perfect-square trinomial factorises into two identical brackets, and
that answer needs two identical tiles to place. De-duplicating the bank leaves
the question unanswerable.

### T3 Distractors are padded from just beside the answer

**Why.** Padding at random lets a learner spot the outlier without doing the
maths.

### T4 The sign is part of the tile, not the template

**Why.** Which sign a term carries is half of what is being tested.

### T5 The discriminant is deliberately never a perfect square

**Why.** If it were, the roots would be rational and the check would be one
evaluation rather than a probe.

---

## The expression tree (`src/content/expr.ts`)

Behind the `reduce` and `evaluate` slides.

### E1 An expression tree, not a flat array of TeX fragments

**Decision.** `num | binary | power | root | log | trig`, addressed by path.

**Why.** The `steps` slide holds its line as a flat array and names a
sub-expression as a span. That can ask "what does this come to" but not "which
of these comes first" — which pieces are reducible is a fact about the
expression's *shape*, not about where its characters sit. And in `8 + 4 x 3` the
two candidate spans overlap on the `4`.

**Rejected.** Extending the span model.

### E2 Paths, not generated ids

**Why.** A path stays stable across a re-render and means the same thing to the
widget, the grader and a test, with nothing stored alongside the tree.

### E3 Operators are offered even when their operands are not settled

**Decision.** `targets()` returns every operator, flagged legal or not.

**Why.** Taking `8 + 4` before `4 x 3` has to be *possible*. A mistake that
cannot be made is a mistake that cannot be taught.

**Rejected.** Offering only legal moves, which turns the slide into a guided
walk. Powers, roots and logs are the exception — offered only once reducible,
because `(5 - 3)^2` collapsing in one tap skips the bracket rather than getting
it wrong.

### E4 ⚠ A walk is graded on values alone, with no order check {#e4}

**Decision.** `replay` marks a move wrong only when the number given is not what
the piece comes to.

**Why.** That is sufficient: taking `8 + 4 x 3` left to right produces 36, not
20, so the order mistake is already in the answer. Refusing out-of-order moves
as well marked *correct arithmetic* wrong — a learner who settles a chunk in one
tap and gets it right has not made a mistake.

**Rejected.** An `out-of-order` fault, which this used to have. It looks like
rigour and fails honest learners.

### E5 `+`/`-` chains offer a **pair** target, addressed `<path>~` ⚠

**Decision.** An operator whose left child is another `+` offers the two terms
either side of it, not its whole sub-tree.

**Why.** `a + b - c` parses as `(a + b) - c`, so the `-` owns the entire line —
tapping it blanked everything, which is not what the line looks like, and `b - c`
first is ordinary arithmetic.

**Rejected.** Whole-subtree collapse. Also rejected: offering the pair when the
left child is a `-`, because `a - b + c` regroups as `a - (b - c)` and flips the
operator the learner just tapped.

A pair is not a node, so no generator authors a bank for it — `bankFor` derives
one from the shape.

### E6 ⚠ An unsettled root renders as `(x)^{1/2}`, not as a radical {#e6}

**Decision.** A root turns back into `\sqrt{}` the moment its inside is a number.

**Why.** A `reduce` line is a list of independent fragments, one KaTeX call
each, and a radical cannot be split across them — `\sqrt{` alone is not valid
TeX. Rendering the whole root as one fragment leaves *nothing inside it
tappable*, which was a live dead end in three shipped generators. A logarithm
splits cleanly, since `\log_{3}(` is valid on its own.

**Rejected.** One fragment with the radical intact. It looks better and the
slide cannot be finished.

A test walks every reduce slide the way the widget does and fails if the line
cannot be completed. It went red on all three before the fix.

### E7 An `evaluate` line is rendered as one whole string

**Why.** Nothing on it is tappable, so it needs no fragments — and that is what
lets it keep a proper radical where the tappable form cannot.

### E8 Plain brackets, never `\left(`, inside reduce fragments

**Why.** Each fragment is its own KaTeX call, and `\left(` with no matching
`\right)` in the same call prints the command as literal text rather than
raising. The tiles templates fell into the same trap.

### E9 The trig node takes degrees, at quadrantal angles only

**Why.** Degrees because the angle is a number the learner reads and picks a
value for, and `sin(\pi)` would put an irrational number in a bank of whole ones.
Quadrantal angles because half values would turn an order question into a
question about fractions.

**Rejected.** Radians, and the richer angle set.

### E10 `valueOf` rounds roots, logs and trig to whole numbers

**Why.** `log(8)/log(2)` through floats is `2.9999999999999996` and `sin(180)` is
`1.2e-16`. Every value in these questions is meant to be whole.

### E11 Highlighting is by fragment ownership, not position

**Why.** Tapping the `x` in `8 + 4 x 3` lights all three of `4 x 3` without
anything computing where that sub-expression starts and ends.

---

## UI (`src/ui/`)

### U1 KaTeX is bundled with its fonts, never loaded from a CDN ⚠

**Why.** The app is installed to a Home Screen and must render maths with no
network at all. Same reasoning rules out any runtime network dependency.

### U2 The answer editor is a tree of nodes with a caret inside the formula

**Decision.** `src/ui/mathInput.tsx` exists for this and nothing else.

**Why.** Typing used to append to a string and backspace removed the last
character, so correcting a typo in the middle meant deleting everything after it
and retyping. A caret has to sit *inside* the expression — and KaTeX renders a
formula as an opaque block with no handle on a sub-expression, while splitting
the string to make one gives two fragments that are usually invalid TeX. The
answer is a tree whose every node renders as valid TeX alone. (The `steps` slide
and the tiles templates reached the same conclusion independently.)

**Rejected.** A string plus a couple of extra keypad buttons.

### U3 ⚠ A fraction serialises as `((num)/(den))` — outer brackets included {#u3}

**Why.** mathjs binds implicit multiplication tighter than division, so
`(8)/(2)x^2` parses as `8/(2x²)`. Without the outer pair, a correct typed
fraction is marked wrong.

**Rejected.** `(num)/(den)`, which looks sufficient and is not.

### U4 A second `^` nests inside the first

**Why.** A sibling `^` gives KaTeX a "Double superscript" error, which reaches
the learner as red text where their answer should be. Nesting also matches
mathjs, where `^` is right-associative.

### U5 `throwOnError: false` in the app, `throwOnError: true` in the tests

**Why.** Malformed TeX must never blank the screen mid-lesson; it must also
never ship. Different requirements, different settings.

### U6 KaTeX `trust` is opt-in per call

**Decision.** Enabled only for the answer slot, which uses exactly one trusted
command: `\htmlClass`, so the caret can be styled.

**Why.** There is no free-text input anywhere in the app, so the set of commands
that can reach the renderer is the set this code puts there — but the narrow
grant costs nothing.

### U7 Figures are inline SVG, not a charting library

**Why.** These are a curve, an axis and a couple of marks. A chart dependency
would cost more than the rest of the bundle, and every byte is precached for
offline use. Colours come from `currentColor`, so a figure follows the app's
theme instead of carrying its own.

### U8 A parabola's y-window is built from the vertex, with the arms clipped ⚠

**Why.** Fitting the window to what the curve does across the whole x range
sounds right and is wrong: `y = x^2 - 6x + 4` reaches 59 at `x = -5`, so fitting
that squashes the vertex — the one feature the question is about — flat against
the bottom edge. A curve leaving the picture still reads as a curve.

### U9 Tree connectors are measured from the laid-out DOM

**Why.** A fixed grid breaks when a row wraps on a narrow screen.

### U10 The traversal dot is moved by writing SVG attributes directly

**Why.** React state per animation frame is the wrong tool for a 60fps path
traversal.

### U11 Slider details

- The readout sits **above the track**, not beside the handle — a value that
  moves with your thumb is under your thumb.
- The marker is drawn by the **widget**, not baked into the SVG, so the figure
  stays a static string.
- Position is measured from **`origin`**, not zero, because a slider's answer is
  often a size rather than a position: a period of 6 means six *after a peak*.

---

## Product shape

### P1 ⚠ No XP, streaks, leagues or persistent points {#p1}

**Decision.** A per-lesson score is fine. A running total is not.

**Why.** This is a single-player personal tool. The reference app shows a
running XP total on almost every screen; that is the one part of it deliberately
**not** copied. A streak counter only adds a reason to feel bad about missing a
morning.

**Rejected.** Every engagement mechanic. Do not add them.

### P2 Progress is device-local

**Decision.** Zustand + `localStorage`. Which lessons are finished and how the
skill check went. No account, no sync.

### P3 The skill check and the level check stay different things

**Decision.** Skill check: three questions closing a lesson, retryable. Level
check: 10–15 questions closing a level, one attempt each, no worked solutions,
scored as a percentage.

**Why.** One is practice immediately after teaching; the other is assessment.
Merging them loses both.

---

## Testing and process

### X1 Property tests are generic and auto-discover generators

**Decision.** `generators.test.ts` sweeps every generator in the registry —
derived `+choice` variants included — with nothing to register per generator.

**Why.** New content is covered the moment it exists. "Derived" is no reason to
trust a generator: it is what a lesson actually asks.

**Rejected.** A test file per generator, which goes stale the day someone is in
a hurry.

### X2 An independent oracle checks calculus answers

**Decision.** Expression slides may declare `source` (differentiation) or
`integrand` + `limits` (integration). The test differentiates with
`mathjs.derivative`, or runs quadrature, and compares.

**Why.** Every other property test only proves a generator agrees with *itself*
— they would all pass a question whose stated answer is the wrong derivative.

**Note.** `integrand` is declared rather than reusing `source` so the oracle
always points the same way: mathjs differentiates, we check. Symbolic
integration would be marking its own homework.

### X3 The oracle test carries an explicit 60s timeout

**Why.** It is the slowest test by far and overruns vitest's 5s default once the
other files compete for CPU — which appears as an intermittent failure that
passes when the file is run alone.

**Rejected.** Trimming its sample count. Give a slow sweep a budget instead.

### X4 Three complementary TeX guards, not one ⚠

**Decision.** KaTeX strict-mode rendering **and** a command-name denylist **and**
a raw-escape check.

**Why.** They catch different things. KaTeX catches invalid TeX. It does *not*
catch a backslash-stripped command: `overline{3+4i}` is perfectly valid TeX — it
renders the literal letters — so KaTeX raises nothing and the learner just sees a
wrong slide. Only a name check finds that, and it is scoped to TeX fragments so
English prose containing the word "times" does not trip it.

**Rejected.** Relying on KaTeX alone, which looks like enough.

### X5 A guard test must be verified to fail

**Decision.** Reintroduce the bug, watch it go red, then restore.

**Why.** A guard that cannot fire reads like coverage and is worse than none.
One proposed replacement here was rejected precisely because it turned out not
to fire.

### X6 A 25-distinct-questions floor per generator per difficulty

**Why.** Deck de-duplication only works while the generator has another question
to give. Widening a range is nearly always the right fix; where the stem is fixed
and the pool is a word list, vary the phrasing too.

### X7 ⚠ Never author TeX through a nested escaping layer

**Decision.** Edit the file directly. No Python heredocs, no intermediate
scripts.

**Why.** Every backslash must be doubled in source (`'\\frac'`), and an
intermediate layer eats one level silently. `'\q'` collapses to `q`, and KaTeX
renders the literal word "quad" into the slide. This has bitten twice.

### X8 The typecheck is a separate step from the tests

**Why.** Vitest transforms TypeScript with esbuild, which strips types without
checking them. A file can have real type errors and a green suite.

### X9 Commits go straight to `main`, with no pull request

**Decision.** Every push to `main` deploys to production.

**Why.** The owner wants a change on their phone a couple of minutes after it is
made. There is no branch-protection backstop either — the repo is private on a
plan where GitHub's branch-protection API returns 403.

**Rejected.** A PR workflow, deliberately. The cost is that nothing catches a bad
change before the learner meets it, so the checks happen **before** the push:
typecheck, full suite, lint, and — for anything with a visible surface — the
change actually exercised in a browser. A test suite cannot tell you that a dot
is clipped in half by the edge of its viewBox.

### X10 Subagents default to Sonnet via a committed `.claude/settings.json`

**Decision.** `CLAUDE_CODE_SUBAGENT_MODEL: sonnet`, committed (most of
`.claude/` is not, and `.gitignore` carries a negation for it).

**Why.** A remote container has no `~/.claude` to read a user-level setting from,
and remote sessions are where the cost lands.

**Rejected.** `CLAUDE_CODE_SUBAGENT_MODEL_FORCE=1`. It would also catch the
built-in `Explore` and `Plan` agents, but it overrides per-agent frontmatter and
per-call choices — which is the whole escalation ladder.
