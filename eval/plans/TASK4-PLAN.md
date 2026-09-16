<!-- Provenance: written by Fable 5.1 (`fable-planner`, effort: high), verbatim
except for this header. First plan written to the reviewed prompt template.
Task 4 of the week of real use; see ../WEEK.md and ../FLOW.md. -->

# Plan: task 4 — four Trigonometric Functions lessons, four generators, staged

Task 4 of the week of real use. Executor starts cold; this text is the whole brief. Read alongside `/home/user/Maths-Trainer/eval/PREFLIGHT.md` (binding) and `/home/user/Maths-Trainer/CLAUDE.md` (binding). Nothing below is pinned to a commit hash: adding this plan file moves `main`, and the plan depends only on task 3's four commits being present (they are — `eval/bin/mutate.sh` exists, `Slide` has `alsoAccepts?`, and `generators.test.ts` holds the tests named in section 2).

## 0. The scoping decision (read this first)

**Do one course properly: Trigonometric Functions.** Add four lessons, each built around one new generator, in a fixed priority order, committing and pushing after each one passes every gate. Do not touch the other seven courses. Do not re-open the choice of course or of lessons.

Why these four — each closes a gap the course itself opens:

- `tf-l2-speed` and `tf-l3-period-shift` both state that "$b$ divides the period" and no generator ever asks a learner to read the period out of $\sin(bt)$ or $b$ out of a period. **Unit A** closes that (Level 3).
- `tf-l2-sine` says $\sin(150^{\circ}) = \sin(30^{\circ})$ and nothing asks about the symmetry it is an instance of. **Unit B** closes that (Level 2), and its generator is the first new generator since `polar-form` whose rendered kind depends on difficulty — which is what makes it the real exercise of task 3's repaired shape guards (section 2).
- Level 2 never asks the reverse question — given a height, which angles — which is the standard "solve $\sin\theta = k$" skill. **Unit C** closes that.
- `tf-l2-cosine` states $\cos^2\theta + \sin^2\theta = 1$ and never uses it. **Unit D** closes that.

Result: 11 lessons (5/3/3) become 15 (5/6/4). Level checks `tf-l2` and `tf-l3` grow 12 → 15; `tf-l1` is untouched. **That growth retires two stored bests — section 4a.**

**Stop rule.** Units are ordered by value: A, B, C, D. Complete = 4 units. Acceptable = A and B. Drop D first, then C. Never start a unit you cannot finish, gate, prove and push. Each commit is one whole lesson, green on every gate. Fewer lessons done properly beats four half-done, and if only A and B land that is a legitimate result — say so in the report rather than rushing C.

**There is no oracle test for this course.** No trig generator declares `source` or `integrand`, so the two oracle tests in the suite skip every one of them and the generic property tests prove only that a generator agrees with itself. So every unit carries a mandatory scratch oracle (section 3, per unit) that is independent of the generator's own tables, **and each oracle is proved able to fail with `eval/bin/mutate.sh`** before the unit is pushed. The oracle is not committed; its command, its summary line and its kill line are part of the deliverable.

**What this task does not do.** It does not edit `generators.test.ts` or any file under `src/engine/`, `src/ui/`, `src/store/`, or `src/content/{expr,choiceVariant,registry,types,figures}.ts`. It does not edit any existing lesson, existing generator, or `tf-l1`'s level check. It does not edit `eval/WEEK.md` or `eval/PREFLIGHT.md` — findings go in the final report for the owner to log. It adds no slide kind and no keypad key.

**Files that change**, all under `/home/user/Maths-Trainer/`: `src/content/generators/trigonometry.ts`, `src/content/courses/trigonometricFunctions.ts`, plus `eval-advisor.log` (append only). Nothing else. `git diff --stat main` before every commit must list only these.

**One destination.** `week/task4-trigonometry`. `git branch --show-current` must print it, and must not print `main`, before the first push. Every unit is `git push origin week/task4-trigonometry`. Never `main`, never a pull request. Nothing deploys from this branch.

## 1. Before writing anything

1. `command -v node || export PATH="$HOME/.local/node/bin:$HOME/.local/gh/bin:$PATH"` (no-op in a cloud container).
2. Work only from the checkout you have been given. Do not consult any other branch and do not run `git log --all`.
3. `git status --short` is empty; `git branch --show-current` prints `week/task4-trigonometry`.
4. Read in full: `eval/PREFLIGHT.md`; `CLAUDE.md`; `PITFALLS.md` (Part 2, 3.3, 3.10, 3.12 and the pre-flight checklists especially); `src/content/generators/trigonometry.ts` (990 lines — the file you are extending; note `NUMBER_KEYS`, `signedTex`, `nonZeroInt`, `SINE_ANGLES`, and the `waveSlider` render annotated `: Slide` because it branches); `src/content/courses/trigonometricFunctions.ts` (829 lines — the `teach`/`ask`/`prose`/`maths`/`graph` helpers and the lesson voice: short paragraphs, British spelling, no apostrophes needed, `**bold**` and `$maths$` only); `src/content/choiceVariant.ts` (`options()` dedups distractors by `tex`; `promptFrom` lifts an expression's `lead` into the choice prompt and falls back to the prompt when the lead strips to a single letter — `b =` will); `src/content/figures.ts` (`plotSvg` options; `wave(midline, amplitude, period, shift)` is `midline + amplitude·sin(2π(x − shift)/period)`, so `wave(0, 1, 360, 0)` is $\sin(x^{\circ})$); `src/content/generators/generators.test.ts` lines 39–60 (`SEEDS = 200`, `DIFFICULTIES = [1, 2]`, and `BARE_TEX_COMMAND` — `sin`, `cos`, `text`, `frac`, `tfrac`, `pi`, `quad` are on the denylist, so inside `$…$` they must always carry their backslash), 489–532 (the `alsoAccepts` test), 837–867 (the promise guard), 895–980 (`shapesOf`, `commonShape`, `declaresAlsoAccepts`) and 1023–1082 (the two repaired shape guards); `eval/bin/mutate.sh` header (exit codes 0 killed / 1 survived / 2 harness error; refuses a dirty, untracked or missing file); `src/store/progress.ts` lines 36–47 (a best set against a different total is retired).
5. Measure the baseline yourself and record it in the report. Measured here on `main`: `npx vitest run` → **2995 passed**, 6 files, 141.86 s, exit 0; `npx tsc --noEmit -p tsconfig.app.json` → silent, exit 0; `npm run lint` → **0 errors, 25 warnings** (count with `grep -c ' warning '`; do not "fix" them). No count may drop below what you measure, and the test count must land on the predictions in section 3 exactly — a different delta means a test was lost or duplicated.
6. `sed --version` prints GNU sed (4.9 here); `npx vite-node --version` runs (it fetched `vite-node@6` through the proxy once here and is cached under `~/.npm/_npx`). If either is missing, stop and report rather than adapt the harness.

## 2. The three new guards, meeting new content for the first time — what to expect, what to report

Task 3's guards have only ever been run against deliberate mutations. This is the first content written against them. For each, the plan states what it will do on the unmutated tree and on a named mutation; the executor reports, per guard, whether it fired and on what, quoting the failure message verbatim.

**2a. The two repaired shape guards** (`varies the shape of the questions inside a lesson`, `never runs 3 or more identical-shape questions between teach slides`). They now take the *set* of kinds a generator can render over 200 seeds at the difficulty the lesson asks, and flag a run when one kind is common to every reference in it. Unit B's `trig-related-angle` renders a native `choice` at difficulty 1 and either `choice` or `expression` at difficulty 2 (form drawn 50/50 — measured here on a prototype: 297 expression / 303 choice over 600 seeds), so its kind set is `{choice}@1` and `{choice, expression}@2`. **Expected on the unmutated tree: green on all four lessons** — simulated here with the same intersection rule (section 9, item 7). **Expected on mutation M-B (section 3.2): killed**, with the message `tf-l2-symmetry: run of 3 questions can all be expression (trig-related-angle@2, trig-sine-from-circle@2, trig-related-angle@2)`. That run is one the pre-repair guard would have passed: it read `trig-related-angle` once at difficulty 1 and saw `choice`, so the run looked like `choice, expression, choice`. Simulated here under both rules (section 9, item 7): old rule green, repaired rule red. That differential is the guard doing on new content exactly what task 3 repaired it to do, and the executor reports the message. Units A, C and D have kind-fixed generators; their shape mutations (M-A, M-C, M-D) are also killed but would have been under the old rule too — report them as kills, not as evidence about the repair.

**2b. `alsoAccepts` and "accepts every other writing it promises".** Unit A declares one alternative writing on each of its two forms (an unsimplified fraction: `360/3` for `120`, `360/120` for `3`). Expected on the unmutated tree: the test grades 400 writings `correct` and 400 perturbations `incorrect` for `trig-period-from-b` (and the same for `trig-period-from-b+choice`, which shares the render). On units B, C and D the test **skips** — no declaration — and the report must say so plainly rather than counting the skip as a pass. **Expected on mutation M-A-writing: killed**, message of the form `seed 0: promised writing 180/<b> is not accepted against <360/b> over real`.

**2c. The promise guard, "backs every promise that another writing is accepted".** It fires on any teach-slide prose containing the word `accepted`. Unit A's second teach slide contains that word once, deliberately, in a sentence that is true regardless of any field (two numbers compared by value — domain is irrelevant with no variable, and `mode: 'exact'` is what the slide declares; verified here that the checker grades `360/3` against `120` correct and `(360/3) + 1` incorrect). Expected on the unmutated tree: 3 promises found (the two existing ones in `differentiation.ts` plus this), all backed. **Expected on mutation M-A-promise (both declarations deleted): killed**, quoting the sentence and listing the lesson's references. **Expected on mutation M-A-residual (only the period form's declaration deleted): MUTANT SURVIVED** — the known per-generator limitation; the sentence covers both forms and the guard is satisfied by either. Run it, report it as survived, and do not attempt to close it: that is task 5. This plan designs around the limitation as the brief requires: **the sentence names both forms, and `alsoAccepts` is declared on both forms the sentence covers**, so nothing the sentence says is unbacked today.

No other new teach slide, in any unit, may contain the word `accepted`. `grep -n accepted src/content/courses/trigonometricFunctions.ts` must show exactly one line at the end of the task.

## 3. What to change, file by file, in order

Conventions for every generator: `render` and `solution` take the same params; `*Tex` strings are what the learner reads, `answer` strings are mathjs-only and never displayed; **every backslash doubled in source, exactly as written below**; written directly in the file, never through a heredoc or script; `sample` draws in a fixed order. New ids checked here against the registry (217 generators, no collision): `trig-period-from-b`, `trig-related-angle`, `trig-solve-height`, `trig-pythagorean`. Each new generator section goes into `/home/user/Maths-Trainer/src/content/generators/trigonometry.ts` immediately before `export const trigonometryGenerators`, in unit order, and is appended to that array after `evaluateExactTrig` in the same order. Reuse the file's `NUMBER_KEYS`, `signedTex`, `nonZeroInt`, `options`, and its `Slide` and `Generator` imports. Where a render branches between kinds, annotate it `(params): Slide =>` as `waveSlider` does.

Conventions for every lesson: use only the course file's own helpers (`teach`, `ask`, `prose`, `maths`, `graph`). Exactly 10 guided slides, the first a `teach`, three teach slides of 3–5 blocks, `skillCheck` of exactly 3. Prose below is given as the content each block must carry; write it in the file's voice, keep every `$…$` fragment exactly as given (they were rendered here under KaTeX `strict: 'error'` and checked against the denylist), and keep the one sentence marked PROMISE verbatim.

### 3.1 Unit A — `trig-period-from-b` and lesson `tf-l3-period-formula` (priority 1)

**Generator.** Module-level, above the generator:

```ts
/** Degrees in one full turn: the period of sin(t) and cos(t) when t is in degrees. */
const FULL_TURN = 360;
/** Values of b that divide a full turn, so every period is a whole number of degrees. */
const B_VALUES = [2, 3, 4, 5, 6, 8, 9, 10, 12];
/** An unsimplified fraction in mathjs syntax: a writing the lesson promises is accepted. Never displayed. */
const unsimplified = (numerator: number, denominator: number): string => `${numerator}/${denominator}`;
```

`const FULL_TURN = 360;` must be on a line of its own, exactly so — mutation M-A-oracle targets it. `interface PeriodFromBParams { a: number; b: number; d: number; fn: 'sin' | 'cos'; direction: 'period' | 'findB' }`.

`sample(rng, difficulty)`, in this order: `a = rng.int(1, difficulty > 1 ? 6 : 3)`; `b = rng.pick(B_VALUES)`; `d = difficulty > 1 ? nonZeroInt(rng, -6, 8) : 0`; `fn = rng.pick(['sin', 'cos'] as const)`; `direction = difficulty > 1 && rng.chance(0.5) ? 'findB' : 'period'`. Distinct renders measured here on a prototype with exactly this sampling: **54 at difficulty 1, 553 at difficulty 2** (floor is 25).

A local helper `scaledWaveTex(a, fn, inner, d)` returning `` `${a === 1 ? '' : a}\\${fn}(${inner})${d === 0 ? '' : ` ${signedTex(d)}`}` `` — `inner` is `` `${b}t` `` for the period form and `'bt'` for the findB form. Let `P = FULL_TURN / b`.

`render`, period form: `kind: 'expression'`; prompt one prose block `` `What is the period of $y = ${scaledWaveTex(a, fn, `${b}t`, d)}$? Here $t$ is in degrees.` ``; `lead: '\\text{period} ='`; `keypad: NUMBER_KEYS`; `` answer: `${P}` ``; on its own line, exactly: `alsoAccepts: [unsimplified(FULL_TURN, b)],`; `domain: 'real'`; `mode: 'exact'`.

`render`, findB form: prompt `` `The curve $y = ${scaledWaveTex(a, fn, 'bt', d)}$ has period $${P}^{\\circ}$. What is $b$?` `` (the oracle parses `has period $<digits>^` out of this — keep the wording); `lead: 'b ='` (strips to a bare letter, so `promptFrom` falls back to the prompt — which carries the question); `` answer: `${b}` ``; on its own line, exactly: `alsoAccepts: [unsimplified(FULL_TURN, P)],`; same keypad, domain, mode.

`choices`: every option carries `answer` equal to its `tex` so the distractor test compares numerically. Period form: `options({ tex: \`${P}\`, answer: \`${P}\` }, { tex: \`${2 * P}\`, … }, { tex: \`${b}\`, … }, { tex: \`${FULL_TURN}\`, … })` — halved $b$, $b$ read as the period, and the period of $\sin t$ itself; `2P = 360` only at `b = 2`, where `options()` drops it and three remain. FindB form: `options(b, P, 2 * b, FULL_TURN)` in the same shape — all four distinct for every `b` in `B_VALUES`.

`solution`, period form: (1) text `The $b$ inside the bracket is how many cycles fit into one turn. Sine and cosine repeat every $360^{\\circ}$, so $${b}$ cycles of this curve fit into $360^{\\circ}$.`; (2) tex `` `\\text{period} = \\frac{360^{\\circ}}{${b}} = ${P}^{\\circ}` ``; (3) text `The multiplier in front sets the height and anything added on the end moves the curve up or down; neither touches the period. Only what is inside the bracket does.` FindB form: (1) text `Period and $b$ are reciprocals across a full turn: the period is $360^{\\circ}$ divided by $b$, so $b$ is $360^{\\circ}$ divided by the period.`; (2) tex `` `b = \\frac{360^{\\circ}}{${P}^{\\circ}} = ${b}` ``; (3) text `` `So the curve completes $${b}$ full cycles between $0^{\\circ}$ and $360^{\\circ}$. A larger $b$ means a shorter period — the reversal that comes with living inside the bracket.` ``.

**Lesson** — id `tf-l3-period-formula`, title `Reading the Period from the Formula`, inserted in `tf-l3.lessons` between `tf-l3-period-shift` and `tf-l3-together`.

```
teach(T1), ask('trig-period-from-b'), ask('trig-period-from-b+choice'), ask('trig-period-from-b'),
teach(T2), ask('trig-period-from-b', 2), ask('trig-period-from-speed', 2), ask('trig-period-from-b+choice', 2),
teach(T3), ask('trig-period-from-b', 2), ask('trig-wave-range', 2)
skillCheck: [ask('trig-period-from-b', 2), ask('trig-period-from-b+choice', 2), ask('trig-read-parameters', 2)]
```

- T1: prose — the previous lesson said $b$ divides the period; with $t$ in degrees the arithmetic is concrete: $\\sin(t)$ repeats every $360^{\\circ}$, so $\\sin(bt)$ repeats every $360^{\\circ}$ divided by $b$. `maths('\\text{period of } \\sin(bt) = \\frac{360^{\\circ}}{b}')`. `graph({ xMin: 0, xMax: 360, curves: [{ f: wave(0, 1, 360, 0), dashed: true }, { f: wave(0, 1, 120, 0), accent: true }], verticals: [{ x: 120 }, { x: 240 }], label: 'sin t dashed against sin 3t, which fits three cycles into one turn' })`. prose — the dashed curve is $\\sin(t)$, the solid one $\\sin(3t)$; three complete cycles of the solid curve fit into one cycle of the dashed one, so each is a third as long: $360^{\\circ} \\div 3 = 120^{\\circ}$, and the dashed verticals mark where each cycle ends. prose — read $b$ as a count: how many cycles fit into one turn.
- T2: prose — only what is inside the bracket changes the period; in $y = 4\\sin(3t) + 2$ the $4$ sets the height and the $2$ lifts the curve, but the period is still $120^{\\circ}$. prose — the formula runs backwards just as easily: a curve known to repeat every $90^{\\circ}$ fits four cycles into a turn, so $b = 4$. `maths('b = \\frac{360^{\\circ}}{\\text{period}} = \\frac{360^{\\circ}}{90^{\\circ}} = 4')`. **PROMISE, verbatim as one prose block:** `You do not have to simplify. If the period is $360^{\\circ} \\div 3$, typing $\\frac{360}{3}$ is accepted just as $120$ is, because the checker compares the value rather than how it is written. The same holds the other way round: for $b$, typing $\\frac{360}{120}$ is accepted as $3$.`
- T3: prose — this is the wheel from Level 2 in a new coat: a wheel making more turns per second has a shorter period, and $b$ counts cycles per turn in exactly the same way. `maths('b \\times \\text{period} = 360^{\\circ}')`. prose — that product is a check worth a second: if $b$ and the period do not multiply to a full turn, one of them has been misread; and $\\sin(2t)$ is still not $2\\sin(t)$ — the first repeats twice as often, the second is twice as tall.

**Level check** `tf-l3.levelCheck`, replaced wholesale, 15 entries all difficulty 2, in this order: `trig-read-parameters, trig-wave-range, trig-evaluate-exact, trig-horizontal-shift, trig-period-from-speed, trig-period-from-b, trig-wave-range, trig-read-parameters, trig-evaluate-exact+choice, trig-period-from-b+choice, trig-amplitude, trig-midline, trig-wave-range, trig-evaluate-wave, trig-period-from-b`.

**Oracle A** (scratchpad, `oracle-a.ts`, run with `npx vite-node <absolute path>`; must `process.exit(1)` when failures > 0, else exit 0 — a script that only prints is a check that cannot fail). Import `makeRng` from `/home/user/Maths-Trainer/src/engine/rng` and `registry` from `/home/user/Maths-Trainer/src/content/registry`. For difficulty 1 and 2 and seeds 0–199: `params = g.sample(makeRng(seed), difficulty)`, `slide = g.render(params)`. Question data from params (`b`, `fn`); the claim from the slide: period form → `P = Number(slide.answer)`, `bClaim = params.b`; findB form (prompt matches `/has period \$(\d+)\^/`) → `P` from that regex, `bClaim = Number(slide.answer)`. Check with `Math.sin`/`Math.cos` in radians that `P` is a period of `fn(bClaim·t)` at `t ∈ {7, 19, 33, 51, 88}` (agreement within 1e-9) **and** `P / 2` is not (disagreement at some `t`). Print `<draws> draws, <failures> failures`. Ran here on the prototype: 400 draws, 0 failures. Both the answer and the `has period` figure derive from `FULL_TURN` in the generator, so M-A-oracle below breaks both forms while leaving the suite green — which is exactly why an oracle is needed.

**Test count after A: 2995 + 26 = 3021** (13 per registered generator; the base and its `+choice`). Commit message: `Read the period of a sine or cosine from its formula`.

**Mutations, run after the commit and before the push (section 6 explains the ordering), each from the repository root:**

- M-A-oracle (must be killed): `eval/bin/mutate.sh src/content/generators/trigonometry.ts "s/^const FULL_TURN = 360;$/const FULL_TURN = 180;/" -- npx vite-node <scratchpad>/oracle-a.ts`
- M-A-writing (must be killed by the `alsoAccepts` test): `eval/bin/mutate.sh src/content/generators/trigonometry.ts "s/unsimplified(FULL_TURN, b)/unsimplified(180, b)/" -- npx vitest run src/content/generators/generators.test.ts -t 'other writing it promises'` — dry-run here on a mock: changes only the period form's line (the findB line reads `unsimplified(FULL_TURN, P)` and does not match).
- M-A-promise (must be killed by the promise guard): `eval/bin/mutate.sh src/content/generators/trigonometry.ts "/^ *alsoAccepts: \[unsimplified/d" -- npx vitest run src/content/generators/generators.test.ts -t 'another writing'` — deletes exactly the two declaration lines (dry-run here).
- M-A-residual (expected to SURVIVE — record, do not fix): `eval/bin/mutate.sh src/content/generators/trigonometry.ts "/alsoAccepts: \[unsimplified(FULL_TURN, b)\]/d" -- npx vitest run src/content/generators/generators.test.ts -t 'another writing'`
- M-A-shape (must be killed): `eval/bin/mutate.sh src/content/courses/trigonometricFunctions.ts "/id: 'tf-l3-period-formula'/,/skillCheck: \[/ s/ask('trig-period-from-b+choice'),$/ask('trig-period-from-b'),/" -- npx vitest run src/content/generators/generators.test.ts -t 'identical-shape'` — the `'),$` anchor matches only the difficulty-1 line; expected message `tf-l3-period-formula: run of 3 questions can all be expression (trig-period-from-b@1, trig-period-from-b@1, trig-period-from-b@1)`.

### 3.2 Unit B — `trig-related-angle` and lesson `tf-l2-symmetry` (priority 2)

**Generator.** Module-level:

```ts
/** Base angles for the symmetry questions. 45 is left out: its sine and cosine coincide, so the cofunction distractor would equal the answer. */
const BASE_ANGLES = [10, 15, 20, 25, 30, 35, 40, 50, 55, 60, 65, 70, 75, 80];
type Relation = 'supplement' | 'halfTurn' | 'reflex' | 'negative';
const RELATIONS: Relation[] = ['supplement', 'halfTurn', 'reflex', 'negative'];
/** The related angle: 180 - a, 180 + a, 360 - a, -a. */
function relatedAngle(base: number, relation: Relation): number { … }
/**
 * Whether the function keeps its sign at the related angle, read off the circle:
 * sine is the height (positive above the centre), cosine the displacement (positive to the right).
 */
const KEEPS_SIGN: Record<'sin' | 'cos', Record<Relation, boolean>> = {
  sin: { supplement: true, halfTurn: false, reflex: false, negative: false },
  cos: { supplement: false, halfTurn: false, reflex: true, negative: true },
};
```

Keep each `KEEPS_SIGN` row on one line exactly as shown — mutation M-B-oracle targets the `sin:` row. `interface RelatedAngleParams { base: number; fn: 'sin' | 'cos'; relation: Relation; form: 'symbolic' | 'numeric' }`.

`sample`, in order: `base = rng.pick(BASE_ANGLES)`; `fn = rng.pick(['sin', 'cos'] as const)`; `relation = rng.pick(difficulty > 1 ? RELATIONS : RELATIONS.slice(0, 3))`; `form = difficulty > 1 && rng.chance(0.5) ? 'numeric' : 'symbolic'`. Distinct measured here: **84 at difficulty 1, 214 at difficulty 2**. Kind set `{choice}@1`, `{choice, expression}@2` — deliberate; see section 2a.

`render(params): Slide`. Let `angle = relatedAngle(base, relation)`, `keeps = KEEPS_SIGN[fn][relation]`, `co = fn === 'sin' ? 'cos' : 'sin'`.

- Symbolic → `kind: 'choice'`; prompt `` `Which of these is equal to $\\${fn}(${angle}^{\\circ})$?` ``; options, in this order before turning: `{ id: 'same', label: \`\\\\${fn}(${base}^{\\\\circ})\`, tex: true }`, `{ id: 'negated', label: \`-\\\\${fn}(${base}^{\\\\circ})\`, tex: true }`, `{ id: 'co', label: \`\\\\${co}(${base}^{\\\\circ})\`, tex: true }`, `{ id: 'coNegated', label: \`-\\\\${co}(${base}^{\\\\circ})\`, tex: true }` (in the file that is `` `\\${fn}(${base}^{\\circ})` `` etc. — doubled once); then turned by `turn = (base / 5) % 4` as `[...opts.slice(turn), ...opts.slice(0, turn)]` — deterministic from the params, never `rng.shuffle` (PITFALLS 3.10), so the answer is not always in one place; `correctId: keeps ? 'same' : 'negated'`.
- Numeric → `kind: 'expression'`; `shown = Math.abs((fn === 'sin' ? Math.sin : Math.cos)((base * Math.PI) / 180)).toFixed(3)`; prompt `` `Given that $\\${fn}(${base}^{\\circ}) \\approx ${shown}$, what is $\\${fn}(${angle}^{\\circ})$? Give it to three decimal places, with its sign.` ``; lead `` `\\${fn}(${angle}^{\\circ}) \\approx` ``; `keypad: NUMBER_KEYS`; `` answer: `${keeps ? '' : '-'}${shown}` ``; `domain: 'real'`; `mode: 'exact'`. No `alsoAccepts`.

No `choices()` on this generator, with a comment saying why: its symbolic form is already a native choice, and a derived `+choice` would render the same question twice.

`solution` (shared): (1) text `` `On the circle, $${angle}^{\\circ}$ and $${base}^{\\circ}$ are related by a symmetry: ${how}` `` where `how` by relation — supplement: `they are reflections of each other in the vertical axis, so the point is at the same height on the other side.`; halfTurn: `the point is diametrically opposite, so both the height and the displacement change sign.`; reflex: `they are reflections in the horizontal axis, so the displacement is the same and the height is flipped.`; negative: `a clockwise turn reflects the point in the horizontal axis: same displacement, flipped height.` (2) tex `` `\\${fn}(${angle}^{\\circ}) = ${keeps ? '' : '-'}\\${fn}(${base}^{\\circ})` `` with `` ` \\approx ${answer}` `` appended on the numeric form. (3) text — sin: `Sine is the height, so it keeps its sign across the vertical axis and flips it across the horizontal one.`; cos: `Cosine is the displacement, so it keeps its sign across the horizontal axis and flips it across the vertical one.`

**Lesson** — id `tf-l2-symmetry`, title `Angles with the Same Sine`, inserted in `tf-l2.lessons` after `tf-l2-cosine`, before `tf-l2-speed`.

```
teach(T1), ask('trig-related-angle'), ask('trig-sine-from-circle', 2), ask('trig-related-angle'),
teach(T2), ask('trig-related-angle', 2), ask('trig-cosine-from-circle+choice', 2), ask('trig-evaluate-exact'),
teach(T3), ask('trig-related-angle', 2), ask('trig-related-angle', 2)
skillCheck: [ask('trig-related-angle', 2), ask('trig-related-angle', 2), ask('trig-sine-from-circle', 2)]
```

(Every difficulty-2 relation and both forms are taught by the end of T2, and difficulty-2 asks begin after it.)

- T1: prose — the last two lessons said $\\sin(150^{\\circ})$ equals $\\sin(30^{\\circ})$; that is not a coincidence about one pair of angles but a symmetry of the circle, and it comes in three kinds. `graph({ xMin: 0, xMax: 360, curves: [{ f: wave(0, 1, 360, 0) }], marks: [{ x: 40, y: Math.sin((40 * Math.PI) / 180) }, { x: 140, y: Math.sin((40 * Math.PI) / 180) }], verticals: [{ x: 40 }, { x: 140 }], yMin: -1.4, yMax: 1.4, label: 'The sine curve, with the equal heights at 40 and 140 degrees ringed' })`. prose — the ringed points are $\\sin(40^{\\circ})$ and $\\sin(140^{\\circ})$, the same height because $40^{\\circ}$ and $140^{\\circ}$ are the same distance either side of the top of the circle at $90^{\\circ}$ — reflections of each other in the vertical axis. `maths('\\sin(180^{\\circ} - \\theta) = \\sin(\\theta) \\qquad \\cos(180^{\\circ} - \\theta) = -\\cos(\\theta)')`. prose — the reflection keeps the height and flips the displacement, so the sine is unchanged and the cosine changes sign.
- T2: prose — a half turn takes the point to the diametrically opposite side, so both coordinates change sign. `maths('\\sin(180^{\\circ} + \\theta) = -\\sin(\\theta) \\qquad \\cos(180^{\\circ} + \\theta) = -\\cos(\\theta)')`. prose — the third symmetry is reflection in the horizontal axis: $360^{\\circ} - \\theta$ sits just below the starting point rather than just above it, and a negative angle, a clockwise turn, lands in exactly the same place; same displacement, flipped height. `maths('\\sin(360^{\\circ} - \\theta) = \\sin(-\\theta) = -\\sin(\\theta) \\qquad \\cos(360^{\\circ} - \\theta) = \\cos(-\\theta) = \\cos(\\theta)')`. prose — given a value, the same rules hand over the answer: if $\\sin(40^{\\circ}) \\approx 0.643$ then $\\sin(220^{\\circ}) \\approx -0.643$; the digits are the same and only the sign needs deciding.
- T3: prose — rather than memorising six rules, picture the point: sine is the height, so ask whether the reflected point is above or below the centre; cosine is the displacement, so ask whether it is left or right. `maths('\\sin(220^{\\circ}) = -\\sin(40^{\\circ}) \\approx -0.643')`. prose — these symmetries are what make a table of values from $0^{\\circ}$ to $90^{\\circ}$ enough for every angle there is; the sine of $140^{\\circ}$, $220^{\\circ}$, $320^{\\circ}$ and $-40^{\\circ}$ are all $0.643$ in size, with the sign read off the circle.

**Level check** `tf-l2.levelCheck`, replaced wholesale, 15 entries, difficulty 2 except where the current file asks `trig-speed-comparison` at 1: `trig-sine-from-circle, trig-cosine-from-circle, trig-related-angle, trig-period-from-speed, trig-sine-from-circle, trig-speed-comparison@1, trig-cosine-from-circle, trig-period-from-speed, trig-related-angle, trig-sine-from-circle, trig-cosine-from-circle, trig-amplitude, trig-period-from-speed, trig-speed-comparison@1, trig-related-angle`.

**Oracle B** (`oracle-b.ts`, same shape as A). Question data from params (`base`, `fn`, `relation`); the oracle computes the related angle with its own arithmetic (`180 - base`, `180 + base`, `360 - base`, `-base`); the claim from the slide — choice: the label of the option whose id is `correctId`, sign = whether it starts with `-`; expression: `Number(slide.answer)`. Check with `Math.sin`/`Math.cos`: symbolic → `fn(related) ≈ sign · fn(base)` within 1e-9; numeric → `fn(related) ≈ Number(answer)` within 6e-4 (3-dp rounding; the checker itself rejects a rounding difference, verified here, so the oracle must use a tolerance and must not go through `checkAnswer`). Ran here on the prototype: 400 draws (92 numeric), 0 failures. `mathjs` also evaluates `sin(140 deg)` correctly (verified: 0.6427876…), so `math.evaluate` may be used instead of `Math` if preferred.

**Test count after B: 3021 + 13 = 3034** (one generator, no choice variant). Commit message: `Relate the sine and cosine of an angle to those of its reflections`.

**Mutations after the commit:**

- M-B-oracle (killed): `eval/bin/mutate.sh src/content/generators/trigonometry.ts "s/sin: { supplement: true,/sin: { supplement: false,/" -- npx vite-node <scratchpad>/oracle-b.ts`
- M-B (killed — the differential of section 2a): `eval/bin/mutate.sh src/content/courses/trigonometricFunctions.ts "/id: 'tf-l2-symmetry'/,/skillCheck: \[/ { s/ask('trig-cosine-from-circle+choice', 2),/ask('trig-sine-from-circle', 2),/; s/ask('trig-evaluate-exact'),/ask('trig-related-angle', 2),/ }" -- npx vitest run src/content/generators/generators.test.ts -t 'identical-shape'` — dry-run here on a mock: changes exactly the two run-2 lines. Expected message: `tf-l2-symmetry: run of 3 questions can all be expression (trig-related-angle@2, trig-sine-from-circle@2, trig-related-angle@2)`.

### 3.3 Unit C — `trig-solve-height` and lesson `tf-l2-solve` (priority 3)

**Generator.** Module-level:

```ts
/** The angles at which sine or cosine is +1/2 or -1/2, in [0, 360) and in (-180, 180]. */
const HALF_VALUE_ANGLES = {
  full: { sin: { positive: [30, 150], negative: [210, 330] }, cos: { positive: [60, 300], negative: [120, 240] } },
  signed: { sin: { positive: [30, 150], negative: [-30, -150] }, cos: { positive: [60, -60], negative: [120, -120] } },
} as const;
/** The bank, answer tokens first, sorted so one question renders one way (PITFALLS 3.10). */
const sortedBank = (answer: string[], distractors: string[]): string[] => [...answer, ...distractors.filter((t) => !answer.includes(t))].sort();
```

`interface SolveHeightParams { radius: number; fn: 'sin' | 'cos'; positive: boolean; form: 'circle' | 'equation'; signedRange: boolean }`. `sample`, in order: `radius = rng.int(1, 8) * 2`; `fn`; `positive = rng.chance(0.5)`; `form = rng.pick(['circle', 'equation'] as const)`; `signedRange = difficulty > 1 && rng.chance(0.5)`. Distinct measured here: **64 / 128**.

`render`: `half = radius / 2`; `value = positive ? half : -half`; `row = HALF_VALUE_ANGLES[signedRange ? 'signed' : 'full']`; `solutions = row[fn][positive ? 'positive' : 'negative']`; `wrongSign = row[fn][positive ? 'negative' : 'positive']`; `otherFn = row[fn === 'sin' ? 'cos' : 'sin'][positive ? 'positive' : 'negative']`; `rangeTex = signedRange ? '-180^{\\circ} < \\theta \\le 180^{\\circ}' : '0^{\\circ} \\le \\theta < 360^{\\circ}'`. `kind: 'tiles'`; prompt — circle form: `` `A point starts at the far right of a circle of radius $${radius}$ centred at the origin and turns anticlockwise through an angle $\\theta$. Find both values of $\\theta$ with $${rangeTex}$ at which the point is $${half}$ ${where} the centre.` `` with `where` = `above` / `below` for sin, `to the right of` / `to the left of` for cos; equation form: `` `Find both solutions of $${radius}\\${fn}(\\theta) = ${value}$ with $${rangeTex}$.` ``. `template: '\\theta = {0}^{\\circ} \\quad \\text{or} \\quad \\theta = {1}^{\\circ}'` (its three fragments, including the bare `^{\\circ} …` pieces, render under KaTeX with `throwOnError: true` — verified here); `bank: sortedBank(solutions.map(String), [...wrongSign, ...otherFn].map(String))` (six tiles; the three pairs are disjoint in every row); `answer: solutions.map(String)`; `unordered: true`.

`choices`: `pair = (p: readonly number[]) => ({ tex: \`${p[0]}^{\\\\circ} \\\\text{ and } ${p[1]}^{\\\\circ}\` })` (doubled once in the file); `options(pair(solutions), pair(wrongSign), pair(otherFn), pair([solutions[0], wrongSign[0]]))`. No `answer` fields — these are not expressions, so the distractor check is skipped by design.

`solution`: (1) text — circle form: `` `The ${fn === 'sin' ? 'height' : 'displacement'} is $${radius}\\${fn}(\\theta)$, so $${radius}\\${fn}(\\theta) = ${value}$. Dividing by $${radius}$ leaves $\\${fn}(\\theta) = ${positive ? '' : '-'}\\tfrac{1}{2}$.` ``; equation form: the second sentence only. (2) tex `` `\\${fn}(\\theta) = ${positive ? '' : '-'}\\tfrac{1}{2} \\quad \\Rightarrow \\quad \\theta = ${solutions[0]}^{\\circ} \\text{ or } ${solutions[1]}^{\\circ}` ``. (3) text, one string per (fn, sign, range) row, e.g. sin/positive/either range: `Sine is $\\tfrac{1}{2}$ at the reference angle $30^{\\circ}$; above the centre the other angle is its reflection in the vertical axis, $180^{\\circ} - 30^{\\circ} = 150^{\\circ}$.`; sin/negative/full: `Below the centre the two angles are $180^{\\circ} + 30^{\\circ} = 210^{\\circ}$ and $360^{\\circ} - 30^{\\circ} = 330^{\\circ}$.`; sin/negative/signed: `Below the centre, named by clockwise turns, they are $-30^{\\circ}$ and $-150^{\\circ}$: the reflections of $30^{\\circ}$ and $150^{\\circ}$ in the horizontal axis.`; cos/positive/full: `Cosine is $\\tfrac{1}{2}$ at $60^{\\circ}$; to the right of the centre the other angle is its reflection in the horizontal axis, $360^{\\circ} - 60^{\\circ} = 300^{\\circ}$.`; cos/positive/signed: `… which is $-60^{\\circ}$ when the lower half is named by clockwise turns.`; cos/negative/full: `To the left of the centre the two angles are $180^{\\circ} - 60^{\\circ} = 120^{\\circ}$ and $180^{\\circ} + 60^{\\circ} = 240^{\\circ}$.`; cos/negative/signed: `To the left of the centre they are $120^{\\circ}$ and $-120^{\\circ}$, reflections of each other in the horizontal axis.`

**Lesson** — id `tf-l2-solve`, title `Solving for the Angle`, inserted after `tf-l2-symmetry`.

```
teach(T1), ask('trig-solve-height'), ask('trig-related-angle', 2), ask('trig-solve-height'),
teach(T2), ask('trig-solve-height', 2), ask('trig-solve-height+choice', 2), ask('trig-solve-height', 2),
teach(T3), ask('trig-solve-height', 2), ask('trig-sine-from-circle', 2)
skillCheck: [ask('trig-solve-height', 2), ask('trig-solve-height+choice', 2), ask('trig-solve-height', 2)]
```

- T1: prose — so far the angle was given and the height asked for; turn it round: at which angles is a point on a circle of radius $6$ exactly $3$ above the centre? `maths('6\\sin(\\theta) = 3 \\quad \\Rightarrow \\quad \\sin(\\theta) = \\tfrac{3}{6} = \\tfrac{1}{2}')`. prose — dividing by the radius turns a question about a height into one about the sine alone; one answer is $30^{\\circ}$ from the table of exact values, but the previous lesson says $\\sin(150^{\\circ})$ is also $\\tfrac{1}{2}$, so there are two. `maths('\\sin(\\theta) = \\tfrac{1}{2} \\quad \\Rightarrow \\quad \\theta = 30^{\\circ} \\text{ or } 150^{\\circ}')`. prose — two, because the point passes every height twice in a turn, once going up and once coming down; giving only one is the standard slip.
- T2: prose — cosine works the same way with the other axis: a displacement of $\\tfrac{1}{2}$ happens at $60^{\\circ}$ and again at its reflection in the horizontal axis, $300^{\\circ}$. `maths('\\cos(\\theta) = \\tfrac{1}{2} \\quad \\Rightarrow \\quad \\theta = 60^{\\circ} \\text{ or } 300^{\\circ}')`. prose — a negative value moves both answers to the other half of the circle: for $\\sin(\\theta) = -\\tfrac{1}{2}$ the point is below the centre, at $210^{\\circ}$ and $330^{\\circ}$; for $\\cos(\\theta) = -\\tfrac{1}{2}$ it is to the left, at $120^{\\circ}$ and $240^{\\circ}$. prose — the range matters: between $0^{\\circ}$ and $360^{\\circ}$ every angle is an anticlockwise turn, but between $-180^{\\circ}$ and $180^{\\circ}$ the lower half of the circle is named by clockwise turns instead. `maths('\\sin(\\theta) = -\\tfrac{1}{2} \\quad \\Rightarrow \\quad \\theta = -30^{\\circ} \\text{ or } -150^{\\circ} \\qquad (-180^{\\circ} < \\theta \\le 180^{\\circ})')`.
- T3: prose — the method is always the same: find the reference angle in the table, decide from the sign which half of the circle the point is in, and take the two angles there by symmetry. prose — same two points, different labels: $-30^{\\circ}$ is $330^{\\circ}$ and $-150^{\\circ}$ is $210^{\\circ}$; always read the range before writing the answer. prose — check each answer by substituting it back: $6\\sin(330^{\\circ})$ is $-3$, so $330^{\\circ}$ answers the question about $-3$ and not the one about $3$; pairing $30^{\\circ}$ with $210^{\\circ}$ is the slip that check catches.

**Level check** `tf-l2.levelCheck`, 15 entries (total unchanged from B): `trig-sine-from-circle, trig-cosine-from-circle, trig-related-angle, trig-period-from-speed, trig-sine-from-circle, trig-speed-comparison@1, trig-cosine-from-circle, trig-period-from-speed, trig-related-angle, trig-solve-height, trig-cosine-from-circle, trig-amplitude, trig-period-from-speed, trig-solve-height, trig-related-angle`.

**Oracle C** (`oracle-c.ts`). Question from params (`radius`, `fn`, `positive`, `signedRange`); claim from `slide.answer`. Brute force: for every integer degree in the stated range (`0…359` or `-179…180`) collect those where `radius · fn(θ) ≈ (positive ? 1 : -1) · radius / 2` within 1e-9; the sorted numeric answer must equal that sorted set exactly. Ran here: 400 draws, 0 failures.

**Test count after C: 3034 + 26 = 3060.** Commit message: `Find both angles at which a point reaches a given height`.

**Mutations after the commit:**

- M-C-oracle (killed): `eval/bin/mutate.sh src/content/generators/trigonometry.ts "s/positive: \[30, 150\]/positive: [30, 120]/" -- npx vite-node <scratchpad>/oracle-c.ts` (matches the `full.sin` and `signed.sin` rows; read the printed diff).
- M-C-shape (killed): `eval/bin/mutate.sh src/content/courses/trigonometricFunctions.ts "/id: 'tf-l2-solve'/,/skillCheck: \[/ s/ask('trig-solve-height+choice', 2),$/ask('trig-solve-height', 2),/" -- npx vitest run src/content/generators/generators.test.ts -t 'identical-shape'` — expected `tf-l2-solve: run of 3 questions can all be tiles (…)`.

### 3.4 Unit D — `trig-pythagorean` and lesson `tf-l2-identity` (priority 4)

**Generator.** Module-level:

```ts
/** Pythagorean triples, so a sine given as a fraction has a cosine that is also a fraction. Exported for the scratch oracle. */
export const IDENTITY_TRIPLES: [number, number, number][] = [[3, 4, 5], [5, 12, 13], [8, 15, 17], [7, 24, 25], [20, 21, 29], [9, 40, 41]];
/** Sine is the height, positive in the upper half; cosine the displacement, positive on the right. */
const positiveIn = (fn: 'sin' | 'cos', quadrant: number): boolean => (fn === 'sin' ? quadrant <= 2 : quadrant === 1 || quadrant === 4);
const QUADRANT_RANGE = ['0^{\\circ} < \\theta < 90^{\\circ}', '90^{\\circ} < \\theta < 180^{\\circ}', '180^{\\circ} < \\theta < 270^{\\circ}', '270^{\\circ} < \\theta < 360^{\\circ}'];
```

`interface IdentityParams { index: number; givenLeg: 0 | 1; given: 'sin' | 'cos'; quadrant: number }`. `sample`, in order: `index = rng.int(0, 5)`; `givenLeg = rng.int(0, 1) as 0 | 1`; `given`; `quadrant = rng.int(1, difficulty > 1 ? 4 : 2)` — the lower half of the circle is difficulty 2. Distinct by enumeration: 6 × 2 × 2 × 2 = **48 at difficulty 1**, 96 at difficulty 2 (the prototype measured 48/96 on a same-sized space).

`render`: `[x, y, h] = IDENTITY_TRIPLES[index]`; `givenNum = givenLeg === 0 ? x : y`; `askedNum = givenLeg === 0 ? y : x`; `asked = given === 'sin' ? 'cos' : 'sin'`; `gs = positiveIn(given, quadrant)`; `as = positiveIn(asked, quadrant)`; `fracTex = (positive: boolean, n: number) => \`${positive ? '' : '-'}\\\\tfrac{${n}}{${h}}\`` (doubled once in the file). `kind: 'expression'`; prompt `` `$\\${given}(\\theta) = ${fracTex(gs, givenNum)}$ and $${QUADRANT_RANGE[quadrant - 1]}$. What is $\\${asked}(\\theta)$? Give it as a fraction.` ``; lead `` `\\${asked}(\\theta) =` ``; `keypad: NUMBER_KEYS`; `` answer: `${as ? '' : '-'}${askedNum}/${h}` ``; `domain: 'real'`; `mode: 'exact'`. No `alsoAccepts` and no promise: a learner typing `-0.8` for `-4/5` is accepted by value, but `-0.385` for `-5/13` is not (both verified here), so no sentence about decimals is true for every draw.

`choices`: `frac = (positive, n) => ({ tex: fracTex(positive, n), answer: \`${positive ? '' : '-'}${n}/${h}\` })`; `options(frac(as, askedNum), frac(!as, askedNum), frac(gs, givenNum), frac(as, h - givenNum))` — sign flipped, the given value handed back, and subtracted instead of squared. `h - givenNum ≠ askedNum` for all twelve (triple, leg) pairs (enumerated here), so four options survive every draw.

`solution`: (1) text `The point is on a circle of radius $1$, so its two coordinates satisfy $\\cos^2(\\theta) + \\sin^2(\\theta) = 1$. Square the value you have and subtract it from $1$.` (2) tex `` `\\${asked}^2(\\theta) = 1 - \\left(${fracTex(gs, givenNum)}\\right)^2 = 1 - \\tfrac{${givenNum * givenNum}}{${h * h}} = \\tfrac{${askedNum * askedNum}}{${h * h}}` ``. (3) text `` `Taking the square root gives $\\tfrac{${askedNum}}{${h}}$ up to sign, and the quadrant decides the sign: with $${QUADRANT_RANGE[quadrant - 1]}$ the point is ${where}, so $\\${asked}(\\theta)$ is ${as ? 'positive' : 'negative'}.` `` with `where` = `above the centre` / `below the centre` for sin, `to the right of the centre` / `to the left of the centre` for cos. (4) tex `` `\\${asked}(\\theta) = ${fracTex(as, askedNum)}` ``.

**Lesson** — id `tf-l2-identity`, title `The Pythagorean Identity`, inserted after `tf-l2-solve`, before `tf-l2-speed`.

```
teach(T1), ask('trig-pythagorean'), ask('trig-pythagorean+choice'), ask('trig-pythagorean'),
teach(T2), ask('trig-pythagorean', 2), ask('trig-cosine-from-circle', 2), ask('trig-pythagorean+choice', 2),
teach(T3), ask('trig-pythagorean', 2), ask('trig-evaluate-exact+choice', 2)
skillCheck: [ask('trig-pythagorean', 2), ask('trig-pythagorean+choice', 2), ask('trig-pythagorean', 2)]
```

- T1 (5 blocks): prose — the cosine lesson ended with $\\cos^2(\\theta) + \\sin^2(\\theta) = 1$, the circle equation with the coordinates renamed; it means knowing one of sine and cosine nearly pins down the other. `maths('\\cos^2(\\theta) = 1 - \\sin^2(\\theta) = 1 - \\tfrac{9}{25} = \\tfrac{16}{25}')`. prose — if $\\sin(\\theta) = \\tfrac{3}{5}$ then $\\cos(\\theta)$ is $\\tfrac{4}{5}$ or $-\\tfrac{4}{5}$: the square root leaves the sign open, and the sign comes from where the point is — sine is the height, positive in the upper half of the circle; cosine is the displacement, positive on the right. `maths('\\sin(\\theta) = \\tfrac{3}{5}, \\quad 90^{\\circ} < \\theta < 180^{\\circ} \\quad \\Rightarrow \\quad \\cos(\\theta) = -\\tfrac{4}{5}')`. prose — between $90^{\\circ}$ and $180^{\\circ}$ the point is above the centre and to its left, so the sine is positive and the cosine negative; the quarter of the circle the angle lies in is the only extra information needed.
- T2: prose — the lower half works the same way: between $180^{\\circ}$ and $270^{\\circ}$ the point is below and to the left, so both are negative; between $270^{\\circ}$ and $360^{\\circ}$ it is below and to the right. `maths('\\cos(\\theta) = \\tfrac{5}{13}, \\quad 270^{\\circ} < \\theta < 360^{\\circ} \\quad \\Rightarrow \\quad \\sin(\\theta) = -\\tfrac{12}{13}')`. prose — the fractions stay tidy because $5$, $12$ and $13$ are the sides of a right-angled triangle, like $3$, $4$ and $5$; every question here uses such a triple, so the arithmetic is never the hard part. prose — give the answer as a fraction, with its sign; the fraction is the exact value, and a decimal read off a calculator usually is not. (No `accepted` anywhere in this lesson.)
- T3: prose — the identity is a check as well as a tool: any pair of values claimed for the sine and cosine of one angle must have squares adding to $1$, and if they do not, one of them is wrong. `maths('\\left(\\tfrac{5}{13}\\right)^2 + \\left(\\tfrac{12}{13}\\right)^2 = \\tfrac{25}{169} + \\tfrac{144}{169} = 1')`. prose — it also says neither value can exceed $1$ in size and the two cannot both be large: when one is $1$ the other is $0$, the point at the top of the circle or the far right, never both.

**Level check** `tf-l2.levelCheck`, 15 entries (total unchanged): `trig-sine-from-circle, trig-cosine-from-circle, trig-related-angle, trig-period-from-speed, trig-sine-from-circle, trig-speed-comparison@1, trig-pythagorean, trig-period-from-speed, trig-related-angle, trig-solve-height, trig-cosine-from-circle, trig-amplitude, trig-pythagorean, trig-solve-height, trig-related-angle`.

**Oracle D** (`oracle-d.ts`). Question from params and `IDENTITY_TRIPLES` (the triple is the question; the oracle does not use `positiveIn`); claim from `slide.answer` via `math.evaluate` (import `math` from `/home/user/Maths-Trainer/src/engine/expression`). Locate θ: scan the stated quadrant `[(q−1)·90, q·90]` in steps of 0.0005° for the first θ where `given(θ) ≈ givenValue` within 2e-5, where `givenValue = ±givenNum/h` with the sign read from the rendered prompt (`-\\tfrac` present or not); then require `asked(θ) ≈ math.evaluate(slide.answer)` within 1e-4, and fail if no θ is found. Ran here: 400 draws, 0 failures.

**Test count after D: 3060 + 26 = 3086.** Commit message: `Find the cosine from the sine with the Pythagorean identity`.

**Mutations after the commit:**

- M-D-oracle (killed): `eval/bin/mutate.sh src/content/generators/trigonometry.ts "s/quadrant === 1 || quadrant === 4/quadrant === 1 || quadrant === 3/" -- npx vite-node <scratchpad>/oracle-d.ts`
- M-D-shape (killed): `eval/bin/mutate.sh src/content/courses/trigonometricFunctions.ts "/id: 'tf-l2-identity'/,/skillCheck: \[/ s/ask('trig-pythagorean+choice'),$/ask('trig-pythagorean'),/" -- npx vitest run src/content/generators/generators.test.ts -t 'identical-shape'`

## 4. Reused versus new

Reused, unchanged: `trig-period-from-speed` (expression), `trig-wave-range` (tiles), `trig-read-parameters` (expression), `trig-sine-from-circle` / `trig-cosine-from-circle` and their `+choice` forms, `trig-evaluate-exact` (reduce) and `trig-evaluate-exact+choice` (evaluate), and every generator already in the two level checks. Every reused reference's kind set at its asked difficulty was computed here from the registry (section 9, item 7).

New: `trig-period-from-b` (+choice), `trig-related-angle` (no choice variant, by design), `trig-solve-height` (+choice), `trig-pythagorean` (+choice). Six new registry ids. Typed answer forms: a whole number (as `trig-cycle-count`), a fraction through the `/` key (as `trig-period-from-speed` — the widget serialises a typed fraction as `((360)/(3))`, which grades correct against `120`, verified here), and a signed three-decimal number (new to this course; `.` is in `NUMBER_KEYS`, `-` is on the base keypad at `src/ui/slides.tsx:123`; `-0.643` and `-.643` both grade correct against `-0.643`, verified here).

### 4a. Blast radius of the level-check growth — stated explicitly

`tf-l3:check` grows 12 → 15 with unit A and `tf-l2:check` grows 12 → 15 with unit B. Progress is keyed by those ids, so the owner's stored best on each is **retired** the next time that check is played — the home screen shows only the new run, never "11/15". That is `src/store/progress.ts` doing what its test `retires a best set against a smaller total when the check grows` (`src/store/progress.test.ts`) asserts, and it is visible to the owner on exactly those two checks. Units C and D change the contents of `tf-l2:check` but not its total, so cause no further retirement. `tf-l1:check` and every existing lesson's skill check are untouched; the four new lessons have no stored record to retire. Say all of this in the final report.

## 5. Constraints and the tests that catch each

All in `/home/user/Maths-Trainer/src/content/generators/generators.test.ts` unless stated.

| Constraint | Caught by |
| --- | --- |
| Every backslash doubled; every fragment valid TeX, including each tiles-template piece rendered alone | "renders every piece of TeX it emits" (generated, incl. `tex: true` choice labels), "renders every authored TeX fragment without error" (lessons, `strict: 'error'`) |
| No backslash-stripped `sin`, `cos`, `text`, `tfrac`, `frac`, `quad` inside maths | "never lets a TeX command lose its backslash" and the `BARE_TEX_COMMAND` check in the generated sweep |
| Prose markup paired; no `\uXXXX` | "leaves no inline markup the reader would see as punctuation", "never leaves a raw escape sequence in prose" |
| The answer is what the checker accepts and a perturbed one is rejected | "produces an answer its own checker accepts", "rejects a perturbed answer" |
| The answer is *right*, not merely self-consistent | **No test.** The per-unit scratch oracle, gated on a printed `0 failures` and exit 0, and its `mutant killed` line under `mutate.sh` — both in the deliverable |
| A promised writing is accepted, and its perturbation is not | "accepts every other writing it promises" (unit A; skips B–D) |
| Every `accepted` sentence has a declaring generator behind it | "backs every promise that another writing is accepted" (fires on unit A's sentence; 3 promises after A) |
| Distractors wrong, labels distinct, exactly one correct | "offers exactly one correct option, and distractors that are really wrong" |
| Tiles bank holds every answer token plus a real distractor | "renders a well-formed slide for every seed" |
| ≥25 distinct questions per difficulty | "can ask more distinct questions than a lesson has slides" — predicted 54/553, 84/214, 64/128, 48/96 |
| Solutions exist and vary | "always offers a worked solution", "varies its worked solution with the question" |
| 9–11 guided slides, first a teach, exactly 3 skill-check, no teach in a skill check | the four lesson-shape tests |
| Level check 10–15, valid ids, no repeats across 40 seeds | "gives every level check 10 to 15 questions", "never repeats a question inside a level check" (an unknown id throws inside it — PITFALLS 2.4) |
| No repeated question in a lesson | "never asks the same question twice in one sitting" |
| No run of 3 with a common kind at the asked difficulty; ≥2 kinds per lesson | the two repaired shape guards — simulated green here; M-A/M-B/M-C/M-D-shape kill them |
| Stored bests retire on a changed total | `src/store/progress.test.ts` |
| Real type errors | `npx tsc --noEmit -p tsconfig.app.json` after every unit |
| Lint | `npm run lint`: 0 errors, 25 warnings, unchanged |
| Test count moves by exactly +26 / +13 / +26 / +26 | the count itself: 3021 → 3034 → 3060 → 3086 |
| Diff confined to the two content files plus the log; no test edits; nothing under `src/engine/` or `src/ui/` | Nothing catches this; `git diff --stat main` before each commit |
| `eval-advisor.log` only grows | `git diff --stat` shows insertions only (PREFLIGHT) |

## 6. Working loop per unit (A, then B, then C, then D)

`mutate.sh` refuses a file with uncommitted changes (exit 2, verified in task 3), and every mutation in section 3 targets one of the two files the unit itself edits. So **the mutation proofs run after the unit's commit and before its push**. A surviving mutant blocks the push, not the commit.

1. Write the generator; append it to `trigonometryGenerators`. `npx vitest run src/content/generators/generators.test.ts -t '<generator id>'` green (the `-t` regex matches the `+choice` form too; never put `+choice` in a `-t` pattern — `+` is a quantifier there).
2. Write the unit's scratch oracle in the session scratchpad (never inside the repo). `npx vite-node <absolute path>` prints `<N> draws, 0 failures` and exits 0. A failure means the generator is wrong; the fix follows the red-gate rule below.
3. Write the lesson and its level-check edit.
4. `npm test` (count exactly as predicted), `npx tsc --noEmit -p tsconfig.app.json` (silent), `npm run lint` (0 errors, 25 warnings). After the last unit only: `npm run build`.
5. `git diff --stat main` shows only `src/content/generators/trigonometry.ts`, `src/content/courses/trigonometricFunctions.ts`, `eval-advisor.log`.
6. Consult the advisor on this unit's diff only, with `model: "opus"` passed on the Agent call, and wait for it to **return** before committing. Read `eval-advisor.log`, append (question, summary, the advisor's self-reported model quoted verbatim — and both strings if it disagrees with its harness label — gate numbers, the oracle's summary line, and the previous unit's mutation outputs where they are not yet logged); never write the file. `git diff --stat eval-advisor.log` shows insertions only.
7. `git add` by explicit path (three files). Commit with the message given, ending with the attribution lines your session's system reminder specifies.
8. Run every mutation listed for the unit, from the repository root. Each gate mutation must print `mutant killed`; M-A-residual must print `MUTANT SURVIVED` and is recorded, not fixed. `git status --short` is empty after each. Save every harness output verbatim for the report.
9. If every gate mutation was killed: `git push origin week/task4-trigonometry`. If one survived, do not push: the check could not fail. If the oracle is at fault, fix the scratch script and re-run — no commit needed. If the generator or lesson is at fault, fix it in a new commit with its own consultation, re-run, then push.
10. The last unit's mutation outputs go into one final commit that appends them to `eval-advisor.log`, after a (short) consultation on that append, so the ordering check holds for every commit.

**When a gate goes red** outside what section 3 predicts: read the failure, reproduce it on its seed, decide from the numbers which side is wrong. The fix is always in sampling or a filter — narrow a range, exclude a value, route an option through the same canonical formatter. It is never: deleting or blanking a distractor's `answer`, changing `domain` or `mode`, editing anything under `src/engine/`, editing `generators.test.ts` in any way, trimming a sample count or timeout, or weakening an oracle's tolerance. If you believe the test itself is wrong: stop, leave the tree uncommitted, and report the seed and both expressions.

## 7. Done

- `src/content/courses/trigonometricFunctions.ts` has 15 lessons; `grep -n "^          id: '" ` lists `tf-l1-periodic, tf-l1-period, tf-l1-shift, tf-l1-midline, tf-l1-amplitude, tf-l2-sine, tf-l2-cosine, tf-l2-symmetry, tf-l2-solve, tf-l2-identity, tf-l2-speed, tf-l3-amplitude-shift, tf-l3-period-shift, tf-l3-period-formula, tf-l3-together` (or the subset the stop rule allowed); level checks 12/15/15.
- `grep -n "id: '" src/content/generators/trigonometry.ts` shows the four new ids; report names from the grep, not from memory.
- `grep -n accepted src/content/courses/trigonometricFunctions.ts` → exactly one line, in `tf-l3-period-formula`.
- Four scratch oracles reported with `0 failures`, and their kill lines under `mutate.sh`; every shape mutation killed; M-A-writing and M-A-promise killed; M-A-residual survived and is reported as such.
- Section 2's three reports: which guard fired, on what, message quoted.
- `npm test` 3086 (or 3021 / 3034 / 3060 per the stop rule), `tsc` silent, lint 0 errors / 25 warnings, `npm run build` passes on the pushed tree; `git status` clean; branch pushed; `main` untouched locally and remotely.
- The report states the two retirements of section 4a, and asks the owner to open the four lessons on the phone once merged: the tiles template `θ = □° or θ = □°` and the symbolic choice labels are the two surfaces most likely to wrap badly at 393 px, and no test sees layout.

## 8. Risks, each classified — (a) caught by an existing check, (b) catchable by a check that does not yet exist, (c) rule only

| Risk | Handling | Class |
| --- | --- | --- |
| A generator's answer is wrong but self-consistent | Per-unit oracle, gated on `0 failures` and proved able to fail by `mutate.sh` — a gated loop step whose output is in the deliverable | (a) as a gated step this task; **(b)** as a committed test: an optional `oracle` declaration for numeric trig answers (the angle and function the answer is about), swept like `source` is — candidate repair for a later task |
| An oracle that only prints, so `mutate.sh` reads exit 0 as a kill | Every oracle exits 1 on failures; the mutation runs prove it | (a) — the harness exit code, once the script exits non-zero |
| The promise sentence and the declared forms drift apart (a future edit removes one declaration) | The sentence covers both forms and both declare; M-A-residual shows the guard would not notice one going | **(b)** — the per-writing promise guard, which is task 5 |
| A run of three same-shape questions, at the asked difficulty | The repaired guards; lessons simulated green here | (a) |
| The de-duplicator runs out of draws | Pools 54–553; the floor test and the 40-seed duplicate sweep | (a) |
| TeX: a stripped backslash, an invalid fragment, `\left` without `\right` in a tiles piece | KaTeX strict sweep + denylist; the template uses only `^{\\circ}`, `\\quad`, `\\text`, verified here fragment by fragment | (a) |
| `-t` pattern with `+` matches nothing and reads as green | Never pass `+choice` to `-t`; vitest reports `no tests found`, which is not a pass, but read it | (c) |
| The learner types a rounded decimal on unit B's numeric form (`-0.64`) and is marked wrong | The prompt gives the value and asks for three decimal places; the checker rejects rounding differences (verified) | (c) — no check can assert a learner's habit; if it bites the owner, a tolerance field on the slide is the fix, not a probe-policy change |
| Unit B's symbolic options put the answer in a predictable slot | Turned by `(base / 5) % 4`, deterministic per draw | **(b)** — a test that a native `choice` generator's `correctId` index varies across seeds; cheap, not in scope here |
| A mutation's sed matches more or fewer lines than intended | Every expression dry-run here against a mock of the exact lines; the harness prints the diff and refuses a no-op | (a) for a no-op (exit 2); (c) for an over-match — read the printed diff |
| A mutation left in the tree | The harness's EXIT trap; `git status --short` after each run | (a) |
| Advisor consulted after the commit, or on an accumulated diff | One consultation per unit, returned before the commit, on that unit's diff | (c) — the ordering check runs afterwards by the orchestrator, not in the loop |
| `eval-advisor.log` overwritten | Append only; `git diff --stat` shows insertions only | (c) today; (b) trivially — a pre-commit assertion on the log's diff |
| Diff scope creep (a test-file "improvement", a helper moved into `format.ts`) | `git diff --stat main` before each commit; the file list in section 0 | (c) |
| The lower-half quadrants in unit D appear only at difficulty 2, and D's difficulty-1 pool is exactly 48 | Enumerated; the floor is 25 | (a) |
| Session budget | Fixed order; C and D droppable; each unit is one generator, one lesson, one oracle, a 142 s suite and two to five harness runs | (c) |
| Layout on the phone | Nothing in the container; flagged for the owner | (c) |

## 9. Defect classes from `eval/WEEK.md` ("something that looks like verification and isn't"), checked against this plan

1. **Prose promising what only a field upholds.** One promise is made, on purpose, in unit A; it is true by numeric value alone (no variable, so `domain` cannot matter; `mode` is `exact`), and it is backed on both forms it names. Two checks now cover the class — `backs every promise that another writing is accepted` and `accepts every other writing it promises` — and their outputs on M-A-promise and M-A-writing (killed) and M-A-residual (survived) are required in the deliverable. No other new sentence uses the word.
2. **A check that cannot fail.** Every scratch oracle exits non-zero on failure and is run under `eval/bin/mutate.sh` against a named mutation; the `mutant killed` line is required in the deliverable. This is the check for the class, and its output is required.
3. **A sample presented as a sweep.** The distinct-question floors were measured over 600 seeds (the test's own count) on prototypes with the exact sampling specified; the oracles sweep the same 200 × 2 draws the suite uses; the option-distinctness claims in units A and D are enumerations over the whole finite space (nine `b` values; twelve (triple, leg) pairs), not samples. No "survives every draw" claim rests on a subset.
4. **Checked a different condition than the one that ships.** The shape simulation used the repaired rule's intersection over kind sets at the asked difficulty, with the reused generators' sets computed from the registry; the oracles read the claim from the rendered slide and grade under the slide's own `domain` and `mode`. The two repaired shape guards are the check for this class; their output on M-B is required.

## 10. Verified in this container (Node v22.22.2, vitest 5.0.0, GNU sed 4.9, vite-node 6 via npx), with the command

Scratch scripts run with `npx vite-node <scratchpad>/…ts`, importing only from `/home/user/Maths-Trainer/src/…` and `katex` by absolute path under the repo's `node_modules`. No repository file was modified; `git status --short` was empty throughout.

1. Baseline: `npx vitest run` → `Tests 2995 passed (2995)`, 6 files, 141.86 s, exit 0. `npx tsc --noEmit -p tsconfig.app.json` → silent, exit 0. `npm run lint` → 25 lines matching ` warning `, 0 matching ` error `.
2. Per-generator test count: `npx vitest run src/content/generators/generators.test.ts -t 'trig-midline'` → `26 passed | 2812 skipped (2838)` — 13 per generator, base and `+choice`. Registry: 217 generators, 97 lessons; none of the four new ids collides.
3. Checker, all `{ domain: 'real', mode: 'exact' }`: `360/3` vs `120` → correct; `(360/3) + 1` → incorrect; `((360)/(3))` (the widget's fraction serialisation, `src/ui/mathInput.tsx:311`) → correct; `360/120` vs `3` → correct, perturbed → incorrect. `-0.643` and `-.643` vs `-0.643` → correct; `0.643`, `-0.6428`, `-0.64` → incorrect; `0.5` and `.5` vs `0.500` → correct. `-0.8` vs `-4/5` → correct; `-0.385` vs `-5/13` → incorrect; the full float `-0.38461538461538464` → correct; `4/5` vs `-4/5` → incorrect.
4. mathjs: `math.evaluate('sin(140 deg)')` → 0.6427876096865395 (degrees are available to an oracle).
5. KaTeX (`throwOnError: true, strict: false`, as the generated sweep renders): every fragment of the tiles template — `\theta = `, `^{\circ} \quad \text{or} \quad \theta = `, `^{\circ}` — plus `\text{period} =`, `b =`, `\sin(140^{\circ}) \approx`, `\sin(-40^{\circ})`, `-\sin(40^{\circ})`, `30^{\circ} \text{ and } 150^{\circ}` render. Under `strict: 'error'`, all twelve display strings quoted in section 3 render. None matches `BARE_TEX_COMMAND`.
6. Prototype generators with the exact sampling in section 3, 600 seeds per difficulty: `trig-period-from-b` 54 / 553 distinct (all expression); `trig-related-angle` 84 / 214 (difficulty 2: 297 expression, 303 choice); `trig-solve-height` 64 / 128; `trig-pythagorean` 48 / 96. Oracles A–D on the same prototypes, 200 seeds × 2 difficulties: 400 draws, 0 failures each (B: 92 numeric draws).
7. Shape guards, the repaired rule reimplemented over kind sets — reused generators' sets built from the registry over 200 seeds at the asked difficulty, new generators' sets as in section 3 — on all four planned lessons: green (varies and runs). M-A-shape → `run of 3 questions can all be expression (trig-period-from-b@1 ×3)`; M-B → `run of 3 questions can all be expression (trig-related-angle@2, trig-sine-from-circle@2, trig-related-angle@2)` under the repaired rule and **green under the old one-seed-at-difficulty-1 read** (`choice, expression, choice`).
8. Sed dry-runs against a mock of the target lines: M-A-promise deletes exactly the two `alsoAccepts` lines; M-A-writing changes only the period form's line; M-A-shape changes only the difficulty-1 `+choice` line; M-B changes exactly the two run-2 lines; ranges ending at `skillCheck: \[` stop before the skill check.
9. `src/store/progress.test.ts` contains `retires a best set against a smaller total when the check grows`.
10. `grep -rn accepted src/content/courses/*.ts` → exactly two lines today, both in `differentiation.ts`.

**Not verified here — for the executor:** the widget's serialisation of a typed signed decimal (`-0.643`) — `mathInput.tsx` serialises one atom per character and the checker accepts the string, but no test in `mathInput.test.ts` covers a decimal and nothing was driven headlessly; the exact wording of vitest's failure output for each kill (the messages above are the `expect` messages as written in the test file); that `npx vite-node` fetches in the executing container (it did here and in task 2's); that the real generators reproduce the prototype counts exactly (the sampling is specified to make them; the floor test decides); and the D oracle's scan cost on the executor's CPU (seconds here).

### Critical files
- /home/user/Maths-Trainer/src/content/generators/trigonometry.ts (edited: four generators)
- /home/user/Maths-Trainer/src/content/courses/trigonometricFunctions.ts (edited: four lessons, two level checks)
- /home/user/Maths-Trainer/eval-advisor.log (append only)
- /home/user/Maths-Trainer/eval/bin/mutate.sh (run, never edited)
- /home/user/Maths-Trainer/src/content/generators/generators.test.ts (read only, never edited)
- /home/user/Maths-Trainer/src/content/choiceVariant.ts, /home/user/Maths-Trainer/src/content/figures.ts, /home/user/Maths-Trainer/src/store/progress.ts (read only)
- /home/user/Maths-Trainer/eval/PREFLIGHT.md, /home/user/Maths-Trainer/CLAUDE.md, /home/user/Maths-Trainer/PITFALLS.md (binding)
