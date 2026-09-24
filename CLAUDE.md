# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Toolchain

**This differs between the owner's machine and a cloud container. Check which
you are on before assuming either.**

*On the owner's machine*, Node and the GitHub CLI are user-local installs and
are not on the default PATH in a non-interactive shell. Prefix any command that
needs `node`, `npm`, `npx` or `gh`:

```bash
export PATH="$HOME/.local/node/bin:$HOME/.local/gh/bin:$PATH"
```

Without it you get `command not found: node`, which looks like a missing install
rather than a PATH problem. There is no Homebrew, system Node, or Xcode there;
install further tools the same way (user-local tarball) rather than reaching for
a package manager.

*In a Claude Code cloud container*, none of that holds. Node lives at
`/opt/node22/bin` and is already on PATH, `$HOME/.local/node` does not exist,
and the export above is a harmless no-op. `gh` is absent entirely — GitHub work
goes through the MCP tools (`mcp__github__*`), not the CLI.

One line settles it:

```bash
command -v node || export PATH="$HOME/.local/node/bin:$HOME/.local/gh/bin:$PATH"
```

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Vite dev server on http://localhost:5173 |
| `npm test` | Full suite (session reducer, equivalence, math input, generator properties) |
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

**Never stop a dev server with `pkill -f vite` (or any `pkill -f` matching a
command you yourself ran).** The pattern matches the agent's own shell process
and kills the session's command mid-flight, losing whatever it was doing. This
has happened twice. Kill it by port instead, or leave it running — the container
is torn down anyway:

```bash
fuser -k 5199/tcp 2>/dev/null || true
```

**`npm test` passing is not sufficient.** Vitest transforms TypeScript with
esbuild, which strips types without checking them; a file can have real type
errors and a green suite. Run the typecheck separately before committing.

## Three invariants that must not regress

All three are enforced in `src/engine/session.ts`, deliberately *not* in components,
so that a UI change cannot quietly break them. Anything that routes around the
reducer is a bug.

1. **A wrong answer never reveals the answer.** `submit` can only ever produce
   `incorrect`; reaching `revealed` requires a separate explicit `reveal`
   action. After a wrong answer the feedback bar offers only an opt-in
   *Show me*; retrying is a tap anywhere on the question, gated on the same
   `canRetry` the widgets read, so a level check cannot pick up a second
   attempt through it. In
   `ChoiceSlide`, only the chosen option is ever styled — never the correct one.
   The `edit` action is deliberately narrow for the same reason: it clears
   `incorrect` and `invalid` and nothing else, so changing an answer is a free
   retry but can neither undo a pass nor disclose anything.
2. **The skill check is sealed.** `back` is refused outside the guided phase and
   the phase transition is one-way. `LessonPlayer` removes the back control from
   the DOM rather than disabling it. **There is no router, by design** — routing
   lessons through the URL would hand the browser back gesture a way into the
   guided slides mid-assessment.
3. **A level check is one attempt per question.** A lesson with
   `assessment: true` refuses `tryAgain`, refuses `edit` on a graded answer,
   never reveals working, advances past a wrong answer instead of blocking on
   it, and reports a percentage. Widgets read `canRetry(session)` through the
   `canEdit` prop rather than deciding for themselves, so a component that
   forgets cannot hand back a second attempt. The one thing still editable is
   `invalid` input — nothing was graded, so refusing it would strand the
   learner on a typo.

A third property falls out of the design: slides are resolved **once**, at
`startSession`. *Try again* therefore re-presents the identical question rather
than redrawing parameters.

Resolution also **de-duplicates within a deck**. A generator draws from a finite
pool and a lesson may ask it eight or ten times, so the birthday problem makes a
repeat likely long before the pool runs out — ten draws from forty variants
collide almost every time, and five identical questions in one lesson shipped
before this was fixed. `resolveDeck` re-draws a generated slide that renders
identically to one already in the deck, bumping a salt on the per-slide seed so
the escape stays deterministic. Guided and skill check are de-duplicated
separately: a skill-check question matching a guided one is the assessment doing
its job.

Re-drawing only works while the generator has another question to give, so
`generators.test.ts` also holds a floor of **25 distinct questions per generator
per difficulty**. Widening a range is nearly always the right fix; where the
stem is fixed and the pool is a word list, vary the phrasing too — otherwise a
lesson reads as the same question five times even when no two are identical.

This is a single-player personal tool. It deliberately has no XP, leagues, or
multiplayer — do not add engagement mechanics. The reference app shows a
running XP total on almost every screen; that is the one part of it which is
deliberately **not** copied. A per-lesson score is fine, a persistent points
total is not.

The **daily streak** is the one exception, asked for by the owner. It lives in
`src/store/streak.ts` and is shown on the home screen only, never on a lesson
screen. It rises by one per consecutive local calendar day a lesson is
finished, and starting a streak banks a *charge*; a charge is spent
automatically to cover one missed day, and at most two are ever banked. Days
are the device's local calendar days held as `'YYYY-MM-DD'`, not 24-hour
windows, so two plays in one afternoon count once and 23:50 then 00:10 counts
twice. `resolveStreak` is pure and is the only place a gap is interpreted, so
what the home screen shows and what the next play builds on cannot drift; a
charge is deducted only when the play that needed it is recorded, never by
looking at the screen. That the streak is forgiving is the point — it should
not become a reason to feel bad about missing a morning.

**Topic mastery** replaces the XP the reference app runs on, and is the reason
a points total is still refused. Solo there is no leaderboard to give a running
score meaning, so `src/store/mastery.ts` measures *coverage and how well*
instead: marks earned over marks available across a whole course, where a
lesson offers its skill check's length and a level check offers its own. It is
**derived, never stored** — computed from the progress records and the content
as it stands today — which is what makes it fall back below 100% when lessons
are added to a course that was finished, rather than freezing a number that was
true about a smaller library. An old `bestCorrect` is capped against what the
check offers now, or a check that has since shrunk scores 4 out of 3. A course
counts as mastered at `MASTERED_AT` (90%); 100% would demand a perfect run of
every skill check and so would never be reached. The home screen carries one
quiet line ("6 of 30 topics started · 2 mastered") and each course card its
percentage beside the lessons-finished count — the pair being the point, since
you can finish every lesson in a course and still be some way off knowing it.

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
Category[] → Course[] → Level[] → Lesson[] → { slides: SlideRef[~10], skillCheck: SlideRef[3] }
                                  └─ levelCheck?: SlideRef[]
```

`Category` is the difficulty banding and the tab strip on the home screen. A
topic met at both A level and degree level is **one course with more levels**,
not two courses fighting over the same name.

A `levelCheck` is a questions-only assessment closing a level, 10-15 questions
drawn across the level. It is played through the same `LessonPlayer` as
everything else: `levelCheckLesson()` wraps it as a `Lesson` with an empty
guided deck and `assessment: true`, and `startSession` opens any lesson with no
guided slides straight into the sealed phase. There is no second code path,
which is what stops the seal from being weaker here than in a lesson.

The lesson-end skill check and the level check are different things and should
stay that way: the skill check is three questions you may retry, closing a
lesson you have just been taught; the level check is a graded assessment of a
whole level with no retries and no worked solutions.

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

### Slide kinds

`teach`, `choice`, `expression`, `plot` and `tiles` are the originals. Two more
show *working* rather than a final answer, and both live in
`src/ui/workingSlides.tsx`:

- **`steps`** reduces an expression one operation at a time. The line is held as
  an array of TeX fragments rather than one string, because each fragment is an
  independent tap target and KaTeX offers no handle on a sub-expression once it
  has rendered a whole formula. Only the *next* reduction's span is offered, so
  the slide grades evaluation rather than choice of order — which operation
  comes first is a different skill, and a `choice` slide asks it directly.
- **`tree`** fills in the intermediate values of an evaluation tree. Nodes are
  listed in evaluation order naming the nodes that feed them; rows and
  connectors fall out of that, so no content author positions anything. The
  connectors are measured from the laid-out DOM rather than a fixed grid, so a
  row that wraps on a narrow screen still joins up.

Both answer as `string[]` and are graded by `gradeSequence` in the reducer.

Four more came later. `slider` is a drag-to-a-value widget with an optional
figure the marker tracks; `flow` walks a decision tree one branch at a time.
The other two share `src/content/expr.ts`, an arithmetic expression held as a
tree, and both live in `src/ui/reduceSlide.tsx`:

- **`reduce`** evaluates an expression one piece at a time, in two graded taps:
  a piece of the line, then its value from a bank. **Every operator is offered
  whether or not its operands are settled** — taking `8 + 4` before `4 x 3` has
  to be possible, or the order is not being asked about. Nothing about the tap
  says whether it was the right piece; that is the first invariant.

  Grading is `replay`, and **the value is the only test**. A move is wrong when
  the number given is not what the piece comes to, and that is enough: taking
  `8 + 4 x 3` left to right produces 36 rather than 20, so the order mistake is
  already in the answer. Refusing a move for being out of order as well — which
  is what this used to do — marked correct arithmetic wrong, because a learner
  who settles a chunk in one tap and gets it right has not made a mistake.

  A `+`/`-` operator whose left child is another `+` offers its **pair** — the
  two terms either side of it — rather than its whole sub-tree, addressed as
  `<path>~`. `a + b - c` parses as `(a + b) - c`, so the `-` owns the entire
  line, and tapping it used to blank the lot; `b - c` first is ordinary
  arithmetic and is now its own step. Not offered where the left child is a
  `-`, since `a - b + c` regroups as `a - (b - c)` and flips the operator the
  learner just tapped. A pair is not a node, so no generator authors a bank for
  one — `bankFor` derives it from the shape.
- **`evaluate`** is the same expression with every support removed: four
  options, no working, no tap targets. Derived automatically by
  `choiceVariant` from any `reduce` generator that declares `choices()`, under
  the usual `<id>+choice`.

**`transform`** (`src/ui/transformSlide.tsx`, model in `src/content/transform.ts`)
moves a live copy of a base curve with steppers and flips until it is the target:
`apply` names the target equation, `match` draws it as a band. It is graded by
comparing *curves* at thirteen fixed points, never parameter tuples, so `f(-x)`
for an even `f` or `2^(x - 1)` for `\tfrac{1}{2}2^x` is marked right. The draft
starts at the identity but holds `''` until a control is tapped, and a generator
may never target the identity curve (`generators.test.ts` checks both). Its
controls stop their click at the button, because the question area's
tap-to-retry would otherwise wipe the curve the learner is adjusting.

Two rendering rules in `expr.ts` are load-bearing and were each arrived at the
hard way:

- **A `reduce` line is a list of independent fragments, one KaTeX call each.**
  So `\left(` with no `\right)` *in the same fragment* prints as literal text
  rather than raising — use plain brackets. And a node that renders as one
  fragment has nothing inside it tappable, which is why an unsettled root is
  written as `(x)^{1/2}` rather than as a radical, and an unsettled logarithm
  splits into `\log_{b}(`, its argument, and `)`. A test walks each slide the
  way the widget does and fails if the line cannot be finished; it caught three
  shipped generators that were dead ends.
- **An `evaluate` line is one whole string**, since nothing on it is tappable.
  That is what lets it keep a proper radical where the tappable form cannot.

The tree's nodes are `num`, `binary`, `power`, `root`, `log` and `trig`. Adding
one means touching `nodeAt`, `valueOf`, `isReducible`, `targets`, `reduceAt`,
`renderExpr` and `toTex` — and `valueOf` must round, because `sin(180)` and
`log_2(8)` both come back a hair off a whole number through floats. **Every
value in these questions is whole**, banks included; a bank of halves turns an
order question into an arithmetic-with-fractions question, and there is a test
for it.

**`numberLine`** (batch C8-widget) draws a solution set, every tap on the
line itself: a tap at a number places a filled dot and *chooses* it, the chosen
dot grows an arrow either side, and an arrow shades (or clears) the stretch on
that side, running off the edge as a ray beyond the outermost dot. Tapping the
chosen dot again makes it hollow, and once more removes it. The owner asked for
this in place of numbers under the line for dots and the line for shading. The model is `src/content/numberLine.ts`, the widget
`src/ui/numberLineSlide.tsx`. The draft is one string (`-1c,2o/-1:2`) so
`Answer` did not grow; `answer` is the set written canonically
(`(-inf,2]|[5,inf)`), and the reducer compares both after sorting and merging,
so the order pieces were shaded in cannot matter. Nothing shaded never scores.
A line holds at most **twelve steps** (`step` 1, or 0.5 with a six-unit
window), which is what keeps each tick's tap target 24 px wide at 393 px, and
every end must sit on a tick strictly inside the window. `nl-linear` and
`nl-modulus` in `generators/numberLine.ts` are demonstrations no lesson asks
yet.
A filled blank in any bank widget (`table`, `order`, `iterate`, `forces` fill,
`probTree`, `venn`) can be **dragged** to another blank: `src/ui/slotDrag.ts`,
swapping for fixed blanks and re-inserting for proof steps. A drag starts only
after the finger moves, so a tap still empties the blank, and the click that
ends a drag is swallowed so it can never count as the question's retry tap.

**`iterate`** (batch C15-widget) runs a numerical scheme by hand: an `n | x_n`
table with `x_0` given, one blank per iterate, and a last blank for the
conclusion (`conclusion: 'limit'` or `'bracket'`, the bracket one token such as
`1.8 < \alpha < 1.9`). Values come from a sorted bank and blanks fill in any
order; graded by `gradeSequence` on exact tokens. That is only safe because
`generators/iterationTable.ts` refuses any draw where a written value sits
within 0.05 of a unit of a rounding boundary, prints as `-0.000`, or comes out
differently for a learner who carries the rounded value forward — copy
`written()` and `carriedRounded()` for any new iterate generator. The limit
comes from iterating to convergence and the bracket from a sign change of `f`,
never from `x_4`. The widget (`src/ui/iterateSlide.tsx`) pins its bank to the
bottom of the slide while it is live, since a filled table runs past the fold.
`iterate-fixed-point` and `iterate-newton-raphson` are demonstrations no lesson
asks yet.

**`probTree`** (batch C16-widget) is a two-stage probability tree drawn root on
the left: at most three first-stage branches and two under each. Branches carry
a TeX label and a TeX probability or `null` for a blank. `mode: 'fill'` fills
the blanks from a sorted bank in any order, `answer` listing them first stage
then second, top to bottom; `mode: 'path'` shows every probability and has the
learner tap one branch per stage, `answer` being the two labels. Both are graded
by `gradeSequence`, so a slide writes every value one way: the counters write
the unsimplified fraction of what is left in the bag, the decimal families
decimals, and `generators.test.ts` refuses a bank holding one value under two
spellings. It also checks every point's branches sum to 1 and a path's second
label sits under its first. The widget (`src/ui/probTreeSlide.tsx`) draws lines
in SVG scaled to the frame and lays every label and value over them as HTML at
the same proportional position, so fractions render through KaTeX; the overlay
lets taps through to the branch hit lines except on its buttons.

**`venn`** (same batch) is two labelled circles in a rectangle with four regions
in a fixed order: only the first set, both, only the second, neither. A region
is TeX or `null`, filled from a sorted bank; `total` (counts only) is shown in
the corner as `n(\xi)`, and the checks require whole counts summing to it, or
probabilities summing to 1. `src/ui/vennSlide.tsx` shares its bank logic with
the tree through `src/ui/bankFill.ts`. `ptree-fill`, `ptree-path`,
`venn-counts` and `venn-probabilities` are demonstrations no lesson asks yet;
`probTree.test.ts` rebuilds every branch from the parameters and `venn.test.ts`
works every region out again from the numbers the prompt states.

**`forces`** (batch C21-widget) is a free-body diagram: a box on a level
floor, on a slope drawn at its stated angle, or hanging from a string, with
arrows from its centre. The model is `src/content/forces.ts` (geometry, the SVG
string, the grade), the widget `src/ui/forcesSlide.tsx`. **An arrow's id is its
direction** (`up`, `downSlope`, …), and no two arrows on a diagram share one.
Two modes: `pick` draws every candidate faint and dashed and the learner taps
heads on and off; the draft is one string, the chosen ids sorted and joined by
`|` (`down|outOfSlope|upSlope`), so `Answer` did not grow, and `forcesMatch`
sorts both sides, so tap order cannot matter. `fill` draws every arrow that
acts and lists each beneath the picture with its magnitude, some blanks filled
from a sorted bank as `iterate` does, graded by `gradeSequence` in arrow order.
Labels are TeX laid over the SVG as HTML, since KaTeX cannot render in SVG
text. Page arrows reach 92 from the centre and slope arrows 56, so heads that
are only the slope's angle apart still sit a thumb apart; `headsClash` checks
it on every draw, which is why slopes run 25 to 40 degrees. `fd-pick` and
`fd-fill` in `generators/forceDiagram.ts` are demonstrations no lesson asks
yet.

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

The oracle test carries an explicit 60s timeout. It is the slowest test by far
— symbolic differentiation plus 24 probes per draw — and overruns vitest's 5s
default once the other files compete for CPU, which shows up as an intermittent
failure that passes when the file is run alone. If you add a slow sweep here,
give it a budget rather than trimming its sample count.

When adding a guard test, **verify it can fail** — reintroduce the bug, watch it
go red, then restore. Several guards here were confirmed that way, and one
proposed replacement was rejected precisely because it turned out not to fire.

## Adding content

1. Write a `Generator` in `src/content/generators/`, export it from that file's
   array, and it is registered automatically. A new generator *file* needs no
   wiring either: `registry.ts` collects every exported array whose name ends in
   `Generators` from every file in that folder (`import.meta.glob`), keeps an
   object found twice once, and throws on two different generators sharing an id.
2. Reference it by id from a lesson in `src/content/courses/`. A new course file
   is found the same way by `courses/index.ts`; it exports exactly one `Course`,
   whose `category` names its home-screen tab and whose `position` places it in
   that tab (smallest first, spaced in tens, a tie broken by id).
3. Run `npm test` — the property tests pick it up with no wiring.

Neither list is written out by hand on purpose. With several content branches
open at once, each adding an import and an entry to the same two lists, every
landing put the others into a merge conflict. The roadmap's batch record is one
file per batch under `docs/roadmap/batches/` for the same reason.

## Deployment

Pushing to `main` triggers a Cloudflare **Workers** build (not Pages), deploying
to https://maths-trainer.pm78jvchmg.workers.dev. Dashboard settings: build
command `npm run build`, deploy command `npx wrangler deploy`, **root directory
`/`** (that is where the build runs; the output path lives in `wrangler.jsonc`,
never in the dashboard).

Every push to `main` deploys straight to production, and that is deliberate:
the owner wants a change on their phone a couple of minutes after it is made,
so commits land on `main` directly rather than going through a pull request.
There is no branch-protection backstop either (the repo is private on a plan
where GitHub's branch-protection API returns 403).

The cost of that choice is that nothing catches a bad change before the learner
meets it, so the checks have to happen before the push, not after: typecheck,
full suite, lint, and — for anything with a visible surface — the change
actually exercised in a browser. A test suite cannot tell you that a dot is
clipped in half by the edge of its viewBox.

The app is installed to an iPhone Home Screen and must work offline — the
service worker precaches everything including KaTeX fonts and mathjs. Do not add
runtime network dependencies.


## Subagents and cost

Subagents default to Sonnet, set in `.claude/settings.json`:

```json
{ "env": { "CLAUDE_CODE_SUBAGENT_MODEL": "sonnet" } }
```

`.claude/settings.json` is committed (most of `.claude/` is not) so that
cloud sessions pick the policy up — a remote container has no `~/.claude` to
read a user-level setting from, and remote sessions are where the cost actually
lands.

`.claude/skills/` is committed for the same reason, and the `.gitignore` carries
a negation for each. It currently holds two skills:

- **`eval-checker`** — an adversarial reviewer for model-comparison experiments,
  written from the defects that voided the first comparison in this repo. It
  audits scorers, isolation boundaries, adjudication and freeze discipline, and
  its organising question is which *direction* a defect biases: one that inflates
  the baseline is conservative and can be logged, one that inflates the
  challenger is fatal. Invoke it before launching an eval run, before recording a
  verdict, and before acting on a comparison.


- **`i-have-adhd`** — an output-style skill from
  [ayghri/i-have-adhd](https://github.com/ayghri/i-have-adhd) (MIT), vendored at
  upstream commit `6f1f982`. `SKILL.md` is a byte-for-byte copy, so re-vendoring
  is a straight overwrite from `skills/i-have-adhd/SKILL.md` upstream. Its
  frontmatter sets `disable-model-invocation: true`, so it does nothing until
  invoked with `/i-have-adhd`, and stays on until "stop adhd mode". Only the
  skill is vendored — the upstream plugin's opt-in `SessionStart` hook is not.

Escalate deliberately rather than starting high: raise **effort** first, then
the model, then effort again on the new model. Per-agent overrides go in
`.claude/agents/<name>.md` frontmatter (`model:`, `effort:`), and a single call
can be overridden with the Agent tool's `model` parameter.

Note two things about the env var:

- It does **not** reach the built-in `Explore` and `Plan` agents, which inherit
  the main conversation's model. `CLAUDE_CODE_SUBAGENT_MODEL_FORCE=1` would
  catch those too, but it also overrides per-agent frontmatter and per-call
  choices — which is the whole escalation ladder — so it is left off.
- Values in an `env` block apply only once the folder is trusted.
