<!-- Provenance: written by Fable 5.1 (the `fable-planner` agent, effort: high -
this time the definition loaded, unlike task 1's). Verbatim except for this
header. Task 2 of the week of real use; see ../WEEK.md.

Note on section 1 step 3: the plan pins `main` at 580f719, which was HEAD when
it was written. Adding this file moved it. The plan anticipates that and says
to work from wherever `main` is, needing only the F1 progress fix present. -->

# Plan: more lessons — Complex Numbers only, four lessons, four generators, staged

Task 2 of the week of real use. Executor starts cold; this text is the whole brief. Read alongside `/home/user/Maths-Trainer/eval/PREFLIGHT.md` (binding) and `/home/user/Maths-Trainer/CLAUDE.md` (binding).

## 0. The scoping decision (read this first)

**Do one course properly: Complex Numbers.** Add four lessons, each built around one new generator, in a fixed priority order, committing and pushing after each one passes every gate. Do not touch the other seven courses. Do not re-open the choice of course.

Why these four and not others — the course as shipped has a founding gap and a promised-but-never-asked gap:

- Lesson 1 of the course says `x^2 = -1` "is the reason the rest of this course exists", and no lesson ever solves a quadratic with complex roots. **Unit A** closes that.
- Level 4 is titled "Angles and Powers"; its `cn-l4-argument` lesson ends "as the next lesson shows, [modulus and argument] are the pair that makes multiplication simple", and `cn-l4-powers` states De Moivre's theorem in prose — but no generator asks a question in modulus-argument form or applies De Moivre. **Units B and C** close that.
- Square roots of a complex number by equating parts is standard Further Maths and uses the modulus, which Level 3 teaches and then never applies. **Unit D** closes that.

Result: 10 lessons (3/3/2/2) become 14 (4/3/3/4). Level checks for L1, L3 and L4 grow 12 → 15; L2 is untouched. **That growth has a stated blast radius — see section 4a.**

Where breadth is traded for completability: no new courses, levels, slide kinds, or tests; no changes to `registry.ts`, `index.ts`, `types.ts`, `format.ts`, `plane.ts`, `generators.test.ts`, or anything under `src/engine/` or `src/ui/`. **Three content files change**: `/home/user/Maths-Trainer/src/content/generators/complex.ts`, `/home/user/Maths-Trainer/src/content/generators/complexPlane.ts`, `/home/user/Maths-Trainer/src/content/courses/complexNumbers.ts` — plus `/home/user/Maths-Trainer/eval-advisor.log`, which the session's advisor block requires committed alongside the work.

**Stop rule.** Units are ordered by value: A, B, C, D. Complete = 4 units. Acceptable = 2 units (A and B). Never start a unit you cannot finish, gate and push. Each commit is one whole lesson, green on every gate. Fewer lessons done properly beats four half-done.

**There is no oracle test for this course.** Differentiation had `mathjs.derivative`; here the generic property tests prove only that a generator agrees with itself. So every unit carries a mandatory *scratch* cross-check against mathjs (section 5, step 3) whose output goes in the final report. It is not committed — it is the substitute for the oracle, not a new test.

## 1. Before writing anything

1. `command -v node || export PATH="$HOME/.local/node/bin:$HOME/.local/gh/bin:$PATH"` (no-op in a cloud container; Node 22 is at `/opt/node22/bin`).
2. Work only from the checkout you have been given. Do not consult any other branch and do not run `git log --all`.
3. Confirm state: `git rev-parse main origin/main` should both print `580f7194355e4d06e830d9bae6be5701de5925a0` (the `main` this plan was written against). If `main` has moved, work from wherever it is — the plan does not depend on the exact commit, only that the F1 progress fix (`src/store/progress.ts` line ~40, "a best set against a different total is retired") is present. Check that line exists.
4. Create the outcome branch: `git switch -c week/task2-complex-numbers`. `git branch --show-current` must print `week/task2-complex-numbers` before the first push. **This branch is the only place commits go. Never push to `main`, never merge into it, do not open a pull request.** Nothing deploys from this branch; the Cloudflare build triggers on `main` only.
5. Read in full: `/home/user/Maths-Trainer/CLAUDE.md`; `/home/user/Maths-Trainer/PITFALLS.md` (Part 2 and 3.10, 3.12 especially); `/home/user/Maths-Trainer/src/content/generators/format.ts` (67 lines: `I_KEY`, `coeffTex`, `complexTex`, `complexAnswer`, `bracketedTex`, `mulComplex`, `powersOf`, `nonZero(rng, max)`); `/home/user/Maths-Trainer/src/content/generators/complex.ts` (301 lines; the L1 idiom); `/home/user/Maths-Trainer/src/content/generators/complexArithmetic.ts` (233 lines; `complexConjugate` is the pattern for a generator whose `render` and `choices` both branch on a flag); `/home/user/Maths-Trainer/src/content/generators/complexPlane.ts` (390 lines; `ANGLES`, `ANGLE_KEYS`, `argument.choices`, `modulus`); `/home/user/Maths-Trainer/src/content/courses/complexNumbers.ts` (476 lines; the `teach`/`ask`/`plane` helpers and the lesson voice); `/home/user/Maths-Trainer/src/content/choiceVariant.ts` (`options()` dedups distractors by `tex` only; `promptFrom` lifts an expression's `lead` into the choice prompt and falls back to the prompt when the lead strips to a single letter).
6. Run `npm test` and `npx tsc --noEmit -p tsconfig.app.json` once on the clean tree and **record the passing test count** (expected around 2681). It must never drop.

## 2. What to change, file by file, in order

Conventions for every generator: `render` and `solution` take the same params; `*Tex` strings are what the learner reads, `answer` strings are mathjs-only and never displayed; **every backslash doubled in source**; written directly in the file, never through a heredoc or script; `sample` draws in a fixed order so the stream is uniform. New ids are checked against the registry: none of `complex-quadratic`, `polar-form`, `polar-power`, `complex-sqrt` exists today (grep of every `id: '` in `src/content/generators/*.ts`).

A small helper used by three generators, defined once **in `complexPlane.ts`** near the top (it is a TeX helper, not a formatter of values, so it stays local rather than going into `format.ts`):

```ts
/** Wraps a TeX fragment that starts with a minus sign, so it survives being multiplied or squared. */
const paren = (tex: string): string => (tex.startsWith('-') ? `\\left(${tex}\\right)` : tex);
```

(Unit A lives in `complex.ts` and needs no `paren`.)

---

### 2.1 Unit A — `complex-quadratic` in `/home/user/Maths-Trainer/src/content/generators/complex.ts` (priority 1)

Add `nonZero` to the import from `./format`. Insert the section after `complexPart` and append `complexQuadratic` to `complexGenerators`.

Monic quadratics with complex roots `p ± qi`, i.e. `x^2 - 2p x + (p^2 + q^2) = 0`. `interface QuadraticParams { p: number; q: number }`, `q ≥ 1` always (the root asked for has positive imaginary part), `p ≠ 0` always (so the sign-of-real-part distractor is always wrong and the question is never the `both-roots` shape `x^2 = -n^2`).

Local helper:

```ts
/** x^2 + bx + c as the learner reads it; b is always even here, c always positive. */
function monicTex(b: number, c: number): string {
  const bx = b === 0 ? '' : b > 0 ? ` + ${b === 1 ? '' : b}x` : ` - ${b === -1 ? '' : -b}x`;
  return `x^2${bx} + ${c}`;
}
```

`sample(rng, difficulty)`: `p = nonZero(rng, difficulty >= 2 ? 5 : 3)`, then `q = rng.int(1, difficulty >= 2 ? 6 : 5)`. Distinct renders: difficulty 1 = 6 × 5 = 30 ≥ 25; difficulty 2 = 10 × 6 = 60. (Do not narrow `q` to 1..4 at difficulty 1: that is 24 and fails the floor.)

`render` — derive `b = -2 * p`, `c = p * p + q * q`. `kind: 'expression'`; `prompt: [{ kind: 'prose', text: 'Solve the equation. Give the root with positive imaginary part, in the form $a + bi$.' }, { kind: 'display', tex: \`${monicTex(b, c)} = 0\` }]`; `lead: 'x ='`; `keypad: I_KEY`; `answer: complexAnswer(p, q)`; `domain: 'complex'`; `mode: 'exact'`. No `source` — add a one-line comment saying the answer is not a derivative, so a reader grepping per PITFALLS 2.2 knows it was not forgotten. The lead `x =` strips to bare `x` in the choice variant; `promptFrom` already falls back to the prompt for that case.

`choices` — `opt = (x, y) => ({ tex: complexTex(x, y), answer: complexAnswer(x, y) })`; `options(opt(p, q), opt(-p, q), opt(p, -q), opt(2 * p, 2 * q))`. The three distractors: sign of the real part lost (`x = -b/2 ± …` with `b = -2p` mis-signed), the other root (negative imaginary part — a misread of the question), and forgetting to halve `(2p ± 2qi)/2`. All differ from the correct pair for every `p ≠ 0, q ≥ 1`, and from each other.

`solution` (four steps, the learner's numbers throughout):
1. text: 'Complete the square: half the coefficient of $x$ goes inside the bracket, and what is left over is positive.' tex: `` `${monicTex(b, c)} = (x ${p > 0 ? '-' : '+'} ${Math.abs(p)})^2 + ${q * q}` ``
2. text: 'A square that equals a negative number has no real solution, but it does have an imaginary one.' tex: `` `(x ${p > 0 ? '-' : '+'} ${Math.abs(p)})^2 = -${q * q} \\quad\\Rightarrow\\quad x ${p > 0 ? '-' : '+'} ${Math.abs(p)} = \\pm ${coeffTex(q)}` ``
3. text: 'So there are two roots, and they are a conjugate pair — the imaginary parts differ only in sign.' tex: `` `x = ${complexTex(p, q)} \\quad\\text{or}\\quad x = ${complexTex(p, -q)}` ``
4. text: `` `The root with positive imaginary part is $${complexTex(p, q)}$. The discriminant is $${b * b} - ${4 * c} = ${b * b - 4 * c}$, negative, which is what said there were no real roots.` ``

Verified here (section 8, probe 1): a learner writing `-1+2i` or `2i` grades `correct` against `complexAnswer`, and `-1-2i` grades `incorrect` — the typed form this question needs is the one every L1 generator already uses.

---

### 2.2 Unit B — `polar-form` in `/home/user/Maths-Trainer/src/content/generators/complexPlane.ts` (priority 2)

Two additive edits to the existing `ANGLES` table, then a new generator inserted after `argument` and appended to `planeGenerators`.

**Extend `ANGLES`** with two fields per row, `cosTex` and `sinTex`, and widen its type annotation accordingly. `argument` ignores them. Values, by row index:

| index | (re, im) | cosTex | sinTex |
| --- | --- | --- | --- |
| 0 | (1, 0) | `'1'` | `'0'` |
| 1 | (1, 1) | `'\\tfrac{1}{\\sqrt{2}}'` | `'\\tfrac{1}{\\sqrt{2}}'` |
| 2 | (0, 1) | `'0'` | `'1'` |
| 3 | (-1, 1) | `'-\\tfrac{1}{\\sqrt{2}}'` | `'\\tfrac{1}{\\sqrt{2}}'` |
| 4 | (-1, 0) | `'-1'` | `'0'` |
| 5 | (-1, -1) | `'-\\tfrac{1}{\\sqrt{2}}'` | `'-\\tfrac{1}{\\sqrt{2}}'` |
| 6 | (0, -1) | `'0'` | `'-1'` |
| 7 | (1, -1) | `'\\tfrac{1}{\\sqrt{2}}'` | `'-\\tfrac{1}{\\sqrt{2}}'` |

`interface PolarParams { index: number; scale: number; direction: 'toCartesian' | 'toPolar' }`.

Shared derivations (a small function `polarParts(params)` returning them, used by `render`, `choices` and `solution`):
- `angle = ANGLES[index]`, `re = angle.re * scale`, `im = angle.im * scale`
- `diagonal = angle.re !== 0 && angle.im !== 0`
- `rTex = diagonal ? \`${scale === 1 ? '' : scale}\\\\sqrt{2}\` : \`${scale}\``; `rAnswer = diagonal ? \`${scale}*sqrt(2)\` : \`${scale}\``
- `rWrongTex/rWrongAnswer` = the *other* kind's modulus: diagonal → `` `${2 * scale}` `` (added the parts); axis → `` `${scale === 1 ? '' : scale}\\sqrt{2}` `` / `` `${scale}*sqrt(2)` `` (applied the diagonal rule)
- `polarTex = (r: string, a: { tex: string }) => \`${r}\\\\left(\\\\cos ${paren(a.tex)} + i\\\\sin ${paren(a.tex)}\\\\right)\`` (note the space after `\\cos` / `\\sin`, so a distractor angle of `0` renders as `\cos 0`)
- `polarAnswer = (r: string, a: { value: string }) => \`${r}*(cos(${a.value}) + i*sin(${a.value}))\``

`sample(rng, difficulty)`, in this order: `index = rng.int(1, 7)` (row 0, `θ = 0`, is excluded — `3(\cos 0 + i\sin 0)` is a degenerate question); `scale = rng.int(1, difficulty >= 2 ? 8 : 5)`; `direction = difficulty >= 2 && rng.chance(0.5) ? 'toPolar' : 'toCartesian'`. Distinct: difficulty 1 = 7 × 5 = 35; difficulty 2 = 7 × 8 × 2 = 112.

`polarOptions(params): ChoiceOption[]` — a standalone function, used by both `choices` and the `toPolar` render:
- `toCartesian`: `opt = (x, y) => ({ tex: complexTex(x, y), answer: complexAnswer(x, y) })`; `options(opt(re, im), opt(im, re), opt(re, -im), opt(-re, im))`. Collisions (`re = im` makes the swap equal the answer; `im = 0` makes the sign flip equal it) are tex-identical and dropped by `options()`; at least three options always survive since `(−re, im)` differs whenever `re ≠ 0`, and when `re = 0` the swap `(im, 0)` differs.
- `toPolar`: `at = (i) => ANGLES[((i % 8) + 8) % 8]`; `options({ tex: polarTex(rTex, angle), answer: polarAnswer(rAnswer, angle) }, { …at(index + 2) at rTex }, { …at(index + 4) at rTex }, { tex: polarTex(rWrongTex, angle), answer: polarAnswer(rWrongAnswer, angle) })`. Two different directions at the right modulus, and the right direction at the wrong modulus: every distractor is a different point, so the distractor test (numeric compare of the mathjs strings, no variables, single evaluation) marks each `incorrect`.

`render`:
- `toCartesian` → `kind: 'expression'`; `prompt: [{ kind: 'prose', text: 'Write this number in the form $a + bi$.' }, { kind: 'display', tex: \`z = ${polarTex(rTex, angle)}\` }]`; `lead: 'z ='`; `keypad: I_KEY`; `answer: complexAnswer(re, im)`; `domain: 'complex'`; `mode: 'exact'`. No diagram (it would show the answer).
- `toPolar` → `kind: 'choice'`, rendered natively: `prompt: [{ kind: 'prose', text: 'Write $z$ in modulus-argument form $r(\\cos\\theta + i\\sin\\theta)$, with $-\\pi < \\theta \\leq \\pi$.' }, { kind: 'display', tex: \`z = ${complexTex(re, im)}\` }, { kind: 'diagram', svg: complexPlaneSvg(rangeFor(re, im), [{ re, im, highlight: true }]) }]`; options = `polarOptions(params)` **sorted by `tex` with `localeCompare`** (deterministic, so one question renders one way — PITFALLS 3.10; do not `rng.shuffle`), mapped to `{ id: \`opt${idx}\`, label: option.tex, tex: true }`; `correctId` = the id of the option with `correct: true` after sorting.

`choices: (params) => polarOptions(params)`. The registry then derives `polar-form+choice`; for a `toPolar` draw that variant is also a choice slide with `promptFrom(base) = base.prompt`, which is fine — `choiceVariant.render` only special-cases `reduce`. This is the first generator in the repo whose native render can be `choice` while it also declares `choices()`; it follows the code as read, but if it misbehaves in any test, the documented fallback is to drop `direction` entirely (one-directional `polar-form`, `toCartesian` only, 35/56 distinct) and let `modulus` + `argument` carry the reverse direction in the lesson. Do not invent a third design.

`solution` (shared by both directions and the derived variant):
- `toCartesian`: (1) text 'Read off the cosine and sine of the angle.' tex `` `\\cos ${paren(angle.tex)} = ${angle.cosTex}, \\quad \\sin ${paren(angle.tex)} = ${angle.sinTex}` ``; (2) text 'Multiply each by the modulus. On a diagonal the $\\sqrt{2}$ cancels.' tex `` `${rTex} \\times ${paren(angle.cosTex)} = ${re}, \\quad ${rTex} \\times ${paren(angle.sinTex)} = ${im}` ``; (3) tex `` `z = ${complexTex(re, im)}` ``.
- `toPolar`: (1) text 'The modulus is the distance from the origin.' tex `` `|z| = \\sqrt{${re * re + im * im}} = ${rTex}` ``; (2) text 'The argument comes from the sketch: which quadrant, then which of the standard angles.' tex `` `\\arg z = ${angle.tex}` ``; (3) tex `` `z = ${polarTex(rTex, angle)}` ``.

Verified here (section 8, probe 2): `2*sqrt(2)*(cos(3*pi/4) + i*sin(3*pi/4))` grades `correct` against `(-2) + (2)*i` and the same at `pi/4` grades `incorrect`, so the mathjs `answer` strings above are parsed and compared as intended. Also verified: `2*(cos(pi) + i*sin(pi))` equals `2*(cos(-pi) + i*sin(-pi))` — which is why no distractor is ever built by *negating* an angle.

---

### 2.3 Unit C — `polar-power` in `/home/user/Maths-Trainer/src/content/generators/complexPlane.ts` (priority 3)

De Moivre for powers: given `|z| = r` and `arg z = kπ/d`, ask either `|z^n|` or the principal argument of `z^n`. Insert after `polar-form`, append to `planeGenerators`.

Helpers, local to the file:

```ts
function gcd(a: number, b: number): number { return b === 0 ? Math.abs(a) : gcd(b, a % b); }
/** m·π/d in lowest terms, as the learner reads it. Canonical: equal values give equal strings. */
function angleTex(m: number, d: number): string {
  if (m === 0) return '0';
  const g = gcd(m, d);
  const num = Math.abs(m) / g;
  const den = d / g;
  const top = num === 1 ? '\\pi' : `${num}\\pi`;
  return `${m < 0 ? '-' : ''}${den === 1 ? top : `\\tfrac{${top}}{${den}}`}`;
}
/** The same angle for mathjs; `-2*pi/3`, `3*pi/1` and `0` all parse. */
function angleAnswer(m: number, d: number): string {
  if (m === 0) return '0';
  const g = gcd(m, d);
  return `${m / g}*pi/${d / g}`;
}
/** m·π/d brought into (−π, π] by removing whole turns; returns the new numerator over the same d. */
function principal(m: number, d: number): number {
  const turn = 2 * d;
  let r = ((m % turn) + turn) % turn;
  if (r > d) r -= turn;
  return r;
}
const POLAR_ANGLES: { k: number; d: number }[] = [
  { k: 1, d: 6 }, { k: 1, d: 4 }, { k: 1, d: 3 }, { k: 1, d: 2 }, { k: 2, d: 3 }, { k: 3, d: 4 }, { k: 5, d: 6 }, { k: 1, d: 1 },
  { k: -1, d: 6 }, { k: -1, d: 4 }, { k: -1, d: 3 }, { k: -1, d: 2 }, { k: -2, d: 3 }, { k: -3, d: 4 }, { k: -5, d: 6 },
];
```

`interface PolarPowerParams { r: number; index: number; n: number; ask: 'modulus' | 'argument' }`.

`sample`, in order: `ask = rng.pick(['modulus', 'argument'] as const)`; `r = ask === 'modulus' ? rng.int(2, 3) : rng.int(1, 3)` (modulus 1 makes `|z^n| = 1` trivial); `index = rng.int(0, POLAR_ANGLES.length - 1)`; `n = rng.int(2, difficulty >= 2 ? 6 : 4)`. Distinct at difficulty 1: modulus 2 × 15 × 3 = 90, argument 3 × 15 × 3 = 135 (the angle and `r` both appear in the prompt).

`render` — `{ k, d } = POLAR_ANGLES[index]`, `m = principal(n * k, d)`: `kind: 'expression'`; `prompt: [{ kind: 'prose', text: \`A complex number $z$ has modulus $${r}$ and argument $${angleTex(k, d)}$.\` }, { kind: 'prose', text: ask === 'modulus' ? \`What is $|z^{${n}}|$?\` : \`What is the principal argument of $z^{${n}}$, between $-\\\\pi$ and $\\\\pi$?\` }]`; `lead: ask === 'modulus' ? \`|z^{${n}}| =\` : \`\\\\arg\\\\left(z^{${n}}\\\\right) =\``; `keypad: ANGLE_KEYS` (the `/` and `π` keys; harmless on the modulus form, whose answer is typed on the base digits); `answer: ask === 'modulus' ? \`${r ** n}\` : angleAnswer(m, d)`; `domain: 'real'`; `mode: 'exact'`. No `source` (comment as in A).

`choices`:
- modulus: `num = (v: number) => ({ tex: \`${v}\`, answer: \`${v}\` })`; `options(num(r ** n), num(n * r), num(r ** (n - 1)), num(r ** (n + 1)))` — multiplied instead of powered, one power short, one power over. `n·r = r^(n−1)` at `r = 2, n = 4` is tex-identical and dropped; three options remain.
- argument: `ang = (mm: number) => ({ tex: angleTex(mm, d), answer: angleAnswer(mm, d) })`; `options(ang(m), ang(n * k), ang(principal(k, d)), ang(principal(-m, d)), ang(principal((n - 1) * k, d)))` — the angle left unreduced (outside the principal range), the argument not multiplied at all, the sign flipped, and off by one multiple. Every option except the unreduced one passes through `principal` and the canonical `angleTex`, so any value-equal pair is tex-equal and `options()` drops it; the unreduced one is either tex-identical to the correct answer (already in range → dropped) or a numerically different real number, which the distractor test — a plain numeric comparison, verified in probe 3 — marks `incorrect`. At least three options survive every draw (worst case `θ = π`, `n` odd: correct `\pi`, unreduced `3\pi`, off-by-one `0`).

`solution`:
1. text "De Moivre's theorem: raising to the power $n$ raises the modulus to the power $n$ and multiplies the argument by $n$." tex `` `|z^{${n}}| = |z|^{${n}} = ${r}^{${n}} = ${r ** n}` ``
2. tex `` `\\arg\\left(z^{${n}}\\right) = ${n} \\times ${paren(angleTex(k, d))} = ${angleTex(n * k, d)}` ``
3. if `angleTex(n * k, d) !== angleTex(m, d)`: `j = (n * k - m) / (2 * d)` (an integer); text 'That is outside $(-\\pi, \\pi]$, so remove whole turns of $2\\pi$ until it lands inside — the direction is unchanged, only the label.' tex `` `${angleTex(n * k, d)} ${j > 0 ? '-' : '+'} ${Math.abs(j) === 1 ? '' : `${Math.abs(j)} \\times `}2\\pi = ${angleTex(m, d)}` ``; else text 'That is already between $-\\pi$ and $\\pi$, so it is the principal argument as it stands.'
4. text `` `So $|z^{${n}}| = ${r ** n}$ and $\\arg(z^{${n}}) = ${angleTex(m, d)}$.` ``

Verified here (probe 4): `principal()` agrees with mathjs's own `arg((cos θ + i sin θ)^n)` on six cases spanning both signs, `θ = π`, and a wrap past `2π`.

---

### 2.4 Unit D — `complex-sqrt` in `/home/user/Maths-Trainer/src/content/generators/complexPlane.ts` (priority 4)

The square root of `z = (p + qi)^2 = (p^2 - q^2) + 2pq·i` with positive real part. Insert after `modulusSteps` (it uses the modulus), append to `planeGenerators`. Import `nonZero` from `./format` (not currently imported in this file).

`interface SqrtParams { p: number; q: number }`, `p ≥ 1`, `q ≠ 0`. `sample`: `p = rng.int(1, difficulty >= 2 ? 7 : 5)`, then `q = nonZero(rng, difficulty >= 2 ? 6 : 3)`. Distinct: 5 × 6 = 30; 7 × 12 = 84. Derived: `x = p * p - q * q`, `y = 2 * p * q`, `mod = p * p + q * q` (which is exactly `|z|`, since `x^2 + y^2 = (p^2 + q^2)^2` — say so in a comment; it is why every number in the working is whole).

`render`: `kind: 'expression'`; `prompt: [{ kind: 'prose', text: 'Find the square root of $z$ that has a positive real part.' }, { kind: 'display', tex: \`z = ${complexTex(x, y)}\` }]`; `lead: '\\sqrt{z} ='`; `keypad: I_KEY`; `answer: complexAnswer(p, q)`; `domain: 'complex'`; `mode: 'exact'`. No `source` (comment).

`choices`: `opt` as in A; `options(opt(p, q), opt(p, -q), opt(Math.abs(q), Math.sign(q) * p), opt(-p, -q))` — sign of the imaginary part, the magnitudes swapped (the two equations added and subtracted the wrong way round), and the other root. The swap equals the answer only when `q = p`, where it is tex-identical and dropped.

`solution`:
1. text 'Let $\\sqrt{z} = a + bi$ with $a$ and $b$ real, square it, and match real parts and imaginary parts.' tex `` `(a + bi)^2 = a^2 - b^2 + 2ab\\,i \\quad\\Rightarrow\\quad a^2 - b^2 = ${x}, \\quad 2ab = ${y}` ``
2. text 'Squaring a number squares its modulus, so $a^2 + b^2 = |z|$ — a third equation for free.' tex `` `a^2 + b^2 = \\sqrt{${paren(`${x}`)}^2 + ${paren(`${y}`)}^2} = \\sqrt{${x * x + y * y}} = ${mod}` ``
3. text 'Add and subtract the first and third equations.' tex `` `a^2 = \\tfrac{${mod} + ${paren(`${x}`)}}{2} = ${p * p}, \\qquad b^2 = \\tfrac{${mod} - ${paren(`${x}`)}}{2} = ${q * q}` ``
4. text `` `$2ab = ${y}$ is ${y > 0 ? 'positive, so $a$ and $b$ have the same sign' : 'negative, so $a$ and $b$ have opposite signs'}. Taking $a > 0$:` `` tex `` `\\sqrt{z} = ${complexTex(p, q)}, \\quad\\text{and the other root is}\\quad ${complexTex(-p, -q)}` ``

Verified here (probe 5): mathjs's principal `sqrt` of `3+4i`, `3-4i`, `-5+12i`, `-24-10i` grades `correct` against `complexAnswer(2,1)`, `(2,-1)`, `(2,3)`, `(1,-5)` — its principal root has non-negative real part, so `sqrt(<z as mathjs>)` is a genuine independent oracle for this generator (section 5, step 3).

---

### 2.5 `/home/user/Maths-Trainer/src/content/courses/complexNumbers.ts` — four lessons and three level-check edits

Use only the file's own helpers (`teach`, `ask`, `plane`). Each lesson: exactly 10 guided slides, first one `teach`, three teach slides of 3–5 blocks in the existing voice (short paragraphs, British spelling, no emoji, `**bold**` and `$maths$` only; the file uses a typographic apostrophe `’` inside single-quoted strings — copy that rather than `\'` or `’`), `skillCheck` of exactly 3. Display TeX below is written as it must appear in source (backslashes doubled). Shape runs between teach slides never exceed two of one widget; `shapeOf` in the test samples seed 1 at difficulty 1, so `polar-form` and `polar-power` count as `expression` and their `+choice` forms as `choice` regardless of the difficulty asked.

**Lesson A — id `cn-l1-quadratics`, title `Quadratics with Complex Roots`**, inserted in `cn-l1.lessons` after `cn-l1-complex`.
```
teach(T1), ask('complex-quadratic'), ask('complex-quadratic+choice'), ask('complex-quadratic'),
teach(T2), ask('complex-quadratic', 2), ask('sqrt-negative', 2), ask('complex-quadratic+choice', 2),
teach(T3), ask('complex-quadratic', 2), ask('real-solutions', 2)
skillCheck: [ask('complex-quadratic', 2), ask('complex-quadratic'), ask('sqrt-negative', 2)]
```
- T1: the equation the course opened with, now solved. `x^2 + 2x + 5 = 0` has a negative discriminant, so completing the square leaves a square equal to a negative number — which since lesson one has a solution. Display `'x^2 + 2x + 5 = (x + 1)^2 + 4 \\qquad (x + 1)^2 = -4'`. Then `x + 1 = \pm 2i`, `x = -1 \pm 2i`. Two roots, as every quadratic has; they are simply not real.
- T2: the same by the formula — the `\sqrt{b^2 - 4ac}` is the square root of a negative, which is `i` times an ordinary root; then halve. Display `'x = \\frac{-2 \\pm \\sqrt{-16}}{2} = \\frac{-2 \\pm 4i}{2} = -1 \\pm 2i'`. The slip is forgetting to divide the imaginary part by 2 as well as the real part. Checking: substitute `-1 + 2i` back — `(-1 + 2i)^2 = -3 - 4i`, add `2(-1 + 2i) = -2 + 4i`, add 5: zero.
- T3: the two roots are always a conjugate pair when the coefficients are real, because the `\pm` sits only on the imaginary part. Display `'x = -1 + 2i \\quad\\text{and}\\quad x = -1 - 2i'`. The real part is the axis of symmetry `-b/2a`; on the plane the two roots sit mirror-image across the real axis. So every quadratic with real coefficients has either two real roots, one repeated, or a conjugate pair — the discriminant says which, and Level 2 will make more of the conjugate.

**Lesson B — id `cn-l4-polar`, title `Modulus-Argument Form`**, inserted in `cn-l4.lessons` between `cn-l4-argument` and `cn-l4-powers`.
```
teach(T1), ask('polar-form'), ask('polar-form+choice'), ask('polar-form'),
teach(T2), ask('polar-form', 2), ask('argument', 2), ask('polar-form+choice', 2),
teach(T3), ask('polar-form', 2), ask('modulus-steps')
skillCheck: [ask('polar-form', 2), ask('polar-form'), ask('argument', 2)]
```
- T1: modulus and argument fix a point as surely as real and imaginary parts do, and there is a way of writing the number that uses them directly. Display `'z = r\\left(\\cos\\theta + i\\sin\\theta\\right) \\qquad r = |z|,\\ \\theta = \\arg z'`. Reading it back: `r\cos\theta` across, `r\sin\theta` up. For the standard angles the cosine and sine are `0`, `\pm 1` or `\pm\tfrac{1}{\sqrt{2}}`, so the arithmetic is small. Display `'2\\sqrt{2}\\left(\\cos\\tfrac{3\\pi}{4} + i\\sin\\tfrac{3\\pi}{4}\\right) = 2\\sqrt{2}\\left(-\\tfrac{1}{\\sqrt{2}}\\right) + 2\\sqrt{2}\\left(\\tfrac{1}{\\sqrt{2}}\\right)i = -2 + 2i'`. Then `plane([{ re: -2, im: 2, highlight: true }])` and one prose line: the same point, described by distance and direction instead of across and up.
- T2: the other direction. Modulus by Pythagoras, argument from a sketch — never from the calculator alone, since `-2 + 2i` and `2 - 2i` share a tangent. Display `'|{-2 + 2i}| = \\sqrt{4 + 4} = 2\\sqrt{2} \\qquad \\arg(-2 + 2i) = \\tfrac{3\\pi}{4}'`. Keep the argument principal, between `-\pi` and `\pi`. The two slips: adding the parts for the modulus (`4`, not `2\sqrt{2}`), and taking the diagonal angle in the wrong quadrant.
- T3: why bother — because multiplication is easy in this form and hard in the other. Display `'|zw| = |z||w| \\qquad \\arg(zw) = \\arg z + \\arg w'`. Multiplying by `i` (modulus 1, argument `\tfrac{\pi}{2}`) is the quarter turn from Level 2, now as a formula. Every number with the same modulus lies on one circle; every number with the same argument on one ray. The next lesson runs with this.

**Lesson C — id `cn-l4-de-moivre`, title `De Moivre’s Theorem`** (typographic apostrophe, as `cn-l4-powers` already writes it), appended to `cn-l4.lessons` after `cn-l4-powers` — it becomes the last lesson of the course.
```
teach(T1), ask('polar-power'), ask('polar-power+choice'), ask('polar-power'),
teach(T2), ask('polar-power', 2), ask('complex-power', 2), ask('polar-power+choice', 2),
teach(T3), ask('polar-power', 2), ask('complex-power+choice', 2)
skillCheck: [ask('polar-power', 2), ask('polar-power'), ask('complex-power', 2)]
```
- T1: a power is repeated multiplication, and multiplication multiplies moduli and adds arguments — so a power raises the modulus to that power and multiplies the argument. Display `'|z^n| = |z|^n \\qquad \\arg(z^n) = n\\arg z'`. Worked: `|z| = 2`, `\arg z = \tfrac{\pi}{6}`, so `|z^3| = 8` and `\arg(z^3) = \tfrac{\pi}{2}`. Nothing expanded. The commonest error is adding moduli or multiplying by `n` in the wrong place.
- T2: the argument can leave the principal range and must be brought back by whole turns. Display `'4 \\times \\tfrac{\\pi}{3} = \\tfrac{4\\pi}{3} \\quad\\Rightarrow\\quad \\tfrac{4\\pi}{3} - 2\\pi = -\\tfrac{2\\pi}{3}'`. Subtracting `2\pi` changes the label, not the direction. A remainder that lands exactly on `\pi` is written `\pi`, not `-\pi`.
- T3: check it against expansion once, then trust it. `(1 + i)^4`: expansion gives `(2i)^2 = -4`; De Moivre gives modulus `(\sqrt{2})^4 = 4` at angle `4 \times \tfrac{\pi}{4} = \pi`, which is `-4`. Display `'(1 + i)^4 = \\left(\\sqrt{2}\\right)^4\\left(\\cos\\pi + i\\sin\\pi\\right) = -4'`. When the angle is standard, De Moivre wins; when the number is small and the power is 2, expanding is fine. The `i^n` cycle of Level 2 is De Moivre with `r = 1` and `\theta = \tfrac{\pi}{2}`.

**Lesson D — id `cn-l3-sqrt`, title `Square Roots of a Complex Number`**, appended to `cn-l3.lessons` after `cn-l3-modulus`.
```
teach(T1), ask('complex-sqrt'), ask('complex-sqrt+choice'), ask('complex-sqrt'),
teach(T2), ask('complex-sqrt', 2), ask('modulus', 2), ask('complex-sqrt+choice', 2),
teach(T3), ask('complex-sqrt', 2), ask('modulus+choice', 2)
skillCheck: [ask('complex-sqrt', 2), ask('complex-sqrt'), ask('modulus', 2)]
```
- T1: a square root of `z` is any `w` with `w^2 = z`. Write `w = a + bi`, square, and match parts — one complex equation becomes two real ones, the trick promised in Level 1. Display `'(a + bi)^2 = a^2 - b^2 + 2ab\\,i \\qquad a^2 - b^2 = 3,\\ 2ab = 4'` for `z = 3 + 4i`. Two equations in two unknowns; guessing `a = 2, b = 1` works here, but guessing is not a method.
- T2: the method. Squaring squares the modulus, so `a^2 + b^2 = |z|` — a third equation. Add it to the first for `a^2`, subtract for `b^2`. Display `'a^2 + b^2 = |3 + 4i| = 5 \\qquad a^2 = \\tfrac{5 + 3}{2} = 4,\\ b^2 = \\tfrac{5 - 3}{2} = 1'`. The sign of `b` comes from `2ab`: positive means `a` and `b` agree. So `\sqrt{3 + 4i} = 2 + i` or `-2 - i`.
- T3: every non-zero complex number has exactly two square roots, negatives of each other — the `\pm` of real arithmetic survives. Display `'\\sqrt{3 + 4i} = \\pm(2 + i)'`. "The" square root, when one is wanted, is the one with positive real part; when the real part is zero, the one with positive imaginary part. Check by squaring: `(2 + i)^2 = 4 + 4i + i^2 = 3 + 4i`. The same move is what makes the quadratic formula work for complex coefficients, though that is beyond this course.

**Level checks** (replace the arrays wholesale; all difficulty 2; interleaved as the file does now). Do only the edit belonging to the unit being landed:
- With A — `cn-l1.levelCheck` (15): `imaginary-square, sqrt-negative, imaginary-sum, imaginary-product, complex-add, complex-part, complex-quadratic` twice, then `complex-quadratic`.
- With B — `cn-l4.levelCheck` (15): `argument, complex-power, polar-form` five times.
- With C — `cn-l4.levelCheck` (15, total unchanged from B): `argument, complex-power, polar-form, polar-power` three times, then `argument, complex-power, polar-power`.
- With D — `cn-l3.levelCheck` (15): `identify-point, plot-point, modulus, complex-sqrt` three times, then `identify-point, modulus, complex-sqrt`.

## 3. Reused versus new

Reused, unchanged: `sqrt-negative`, `real-solutions` (choice), `argument`, `modulus`, `modulus+choice`, `modulus-steps` (reduce), `complex-power`, `complex-power+choice`, and the `+choice` forms the registry derives from the four new generators. Each new lesson gets two shapes from its own generator (`expression` + `choice`) and a third from a reused one.

New: `complex-quadratic`, `polar-form`, `polar-power`, `complex-sqrt`. Every typed answer form these need already ships in this course: `a + bi` (`complex-add`, `identify-point`), a whole number (`modulus`), `kπ/d` (`argument`). The plan introduces no new keypad and no new typed form, which removes the widget question task 1 had to answer headlessly.

## 4. Constraints and the tests that catch each

All in `/home/user/Maths-Trainer/src/content/generators/generators.test.ts` unless stated:

| Constraint | Test |
| --- | --- |
| Every backslash doubled; no `\left` without `\right`; nothing invalid | "renders every piece of TeX it emits" (generated, incl. choice labels with `tex: true`), "renders every authored TeX fragment without error" (lessons; KaTeX `strict: 'error'`) |
| No backslash-stripped command (`frac{`, `sqrt{`, `pi`, `cos`, `arg`, `left`, `text`…) | "never lets a TeX command lose its backslash" and the `BARE_TEX_COMMAND` check inside the generated sweep — note `pi`, `arg`, `cos`, `sin`, `text` are on the denylist, so an inline `$…$` fragment must never contain them bare |
| Prose: `**` and `$` paired; no stray `*`; no `\uXXXX` | "leaves no inline markup the reader would see as punctuation", "never leaves a raw escape sequence in prose" |
| Answer is what the checker accepts; a perturbed one is rejected | "produces an answer its own checker accepts", "rejects a perturbed answer" |
| Answer is *right*, not merely self-consistent | **No test.** The scratch oracle in section 5 step 3 is the substitute; its output is reported, and the plan's probes (section 8) are the evidence it works |
| Distractors genuinely wrong; labels distinct; exactly one correct | "offers exactly one correct option, and distractors that are really wrong" (probes without a domain; every option here is variable-free so that is a single numeric/complex evaluation) |
| ≥25 distinct questions per difficulty | "can ask more distinct questions than a lesson has slides" |
| Solutions exist and vary with the numbers | "always offers a worked solution", "varies its worked solution with the question" |
| Choice lead does not strip to a single letter | "never shows a bare single-letter display in a derived choice prompt" (`x =`, `z =` are guarded by `promptFrom`; `\sqrt{z}`, `|z^{4}|` are not single letters) |
| Native `choice` slides: ≥2 options, unique ids and labels, correctId present | "renders a well-formed slide for every seed" |
| 9–11 guided slides, first is teach, exactly 3 skill-check, no teach in skill check | "gives every lesson about ten guided slides…", "opens each lesson by teaching before asking", "never puts a teaching slide in a skill check" |
| Level check 10–15, no repeats across 40 seeds, valid ids | "gives every level check 10 to 15 questions", "never repeats a question inside a level check" (an unknown id there throws inside this test naming neither lesson nor id — PITFALLS 2.4) |
| No repeated question in a lesson across 40 seeds | "never asks the same question twice in one sitting" |
| ≥2 widget shapes per lesson; no run of 3 same-shape questions between teach slides | "varies the shape of the questions inside a lesson", "never runs 3 or more identical-shape questions between teach slides" |
| `TRIPLES` untouched | "holds a genuine Pythagorean triple in every modulus row" |
| Real type errors (vitest strips types unchecked) | `npx tsc --noEmit -p tsconfig.app.json` — run it every time |
| Diff confined to the three content files plus `eval-advisor.log`; no engagement mechanics; nothing under `src/engine/` or `src/ui/` | Nothing catches this; it is a rule. Check `git diff --stat main` before each commit |

### 4a. Blast radius of the level-check growth — stated explicitly

`cn-l1:check`, `cn-l3:check` and `cn-l4:check` grow from 12 to 15 questions. Progress is keyed by that id, so an existing record survives the edit. With the F1 fix now on `main` (`src/store/progress.ts`, "a best set against a different total is retired, not carried"), a stored best of, say, 11/12 is **retired** the next time the owner plays that check — the home screen shows only the new run, never "11/15". This is the intended behaviour of the fix, but it is a visible change for the owner on three checks: say so in the final report. `cn-l2:check` and every existing lesson skill check are unchanged, so no other record is affected. (Unit C changes the *contents* of `cn-l4`'s check but not its total, so it causes no further retirement beyond B's.)

## 5. Working loop per unit (A, then B, then C, then D)

1. Write the generator; append it to its file's exported array.
2. `npx vitest run src/content/generators/generators.test.ts -t 'complex-quadratic'` (the `-t` argument is a regex and matches the `+choice` form too; likewise `'polar-form'`, `'polar-power'`, `'complex-sqrt'`). Iterate until green, following "When a gate goes red" below.
3. **Scratch oracle, mandatory, not committed.** Write a small script in the session scratchpad (never inside the repo) that imports `checkAnswer` from `/home/user/Maths-Trainer/src/engine/equivalence`, `math` from `/home/user/Maths-Trainer/src/engine/expression`, `makeRng` from `/home/user/Maths-Trainer/src/engine/rng` and the generator, draws 200 seeds × 2 difficulties, and checks an *independent* mathjs computation against `slide.answer`, counting failures. Run it with `npx vite-node <path>` — verified here: that command ran a script of exactly this shape against this repo's sources (it fetched `vite-node@6.0.0` once through the proxy). Per generator:
   - A: `math.evaluate(\`x^2 + (${b})*x + (${c})\`, { x: math.complex(p, q) })` has `|value| < 1e-9` (float noise of ~1e-14 was seen here on `p = -3, q = 5`, so compare with a tolerance, not `=== 0`).
   - B (`toCartesian` draws only): `checkAnswer(polarAnswer(rAnswer, angle), slide.answer, { domain: 'complex' })` is `correct` — i.e. mathjs evaluating the displayed polar form lands on the cartesian answer. For `toPolar` draws: `checkAnswer(<correct option's answer>, complexAnswer(re, im), { domain: 'complex' })` is `correct`.
   - C: modulus draws — `math.abs(math.pow(z, n))` with `z = math.complex({ r, phi: k*π/d })` is within `1e-6` of `Number(slide.answer)`; argument draws — `math.arg(math.pow(z, n))` is within `1e-6` of `math.evaluate(slide.answer)`.
   - D: `checkAnswer(\`sqrt(${complexAnswer(x, y)})\`, slide.answer, { domain: 'complex' })` is `correct`.
   Report the command and its summary line (draws, failures) in the final report. Zero failures is the bar; a failure means the generator is wrong, and the fix follows the red-gate rule.
4. Write the lesson and its level-check edit.
5. `npm test` && `npx tsc --noEmit -p tsconfig.app.json` && `npm run lint` (0 errors; 25 pre-existing warnings are expected — do not "fix" them). The test count must be ≥ the baseline from section 1 step 6.
6. `git diff --stat main` shows only the files named in section 0. `git add` **by explicit path** (`src/content/generators/complex.ts`, `src/content/generators/complexPlane.ts`, `src/content/courses/complexNumbers.ts`, `eval-advisor.log` — the log is gitignored by `*.log` but already tracked, so a plain `git add` works; do not add a `.gitignore` negation) and commit with a one-line imperative message in the repo's style — `Solve quadratics with complex roots`; `Write complex numbers in modulus-argument form`; `Raise a complex number to a power with De Moivre's theorem`; `Find the square roots of a complex number` — ending with the attribution lines your session's system reminder specifies. Never commit `dist/` or any scratch file.
7. `git push -u origin week/task2-complex-numbers` (plain `git push` after the first). This is the one destination. If the proxy refuses the push, use the GitHub MCP `push_files` tool with `branch: "week/task2-complex-numbers"` and the same files.
8. After the final unit, `npm run build` once, as the command Cloudflare will run.

### When a gate goes red

Read the failure before changing anything. Every message in `generators.test.ts` names the seed and both expressions (or the fragment and where it came from); reproduce it on that seed and decide from the numbers which side is wrong. The fix is always in the generator's *sampling* or a *filter* or a *canonical formatter*: narrow a range, exclude a value, route an option through the same canonical `angleTex`/`complexTex` so value-equal options become tex-equal and drop. It is never any of the following, each of which turns the test off rather than passing it:

- deleting or blanking a distractor's `answer`;
- changing `domain` on any slide to make a check pass (`'complex'` on complex-valued answers and `'real'` on real ones is the rule, and every answer here is variable-free so the domain only matters for the perturbed-answer probe);
- changing `mode`, the probe policy, or anything under `src/engine/`;
- editing, skipping, or adding to `generators.test.ts` (including `BARE_TEX_COMMAND`);
- trimming a sample count or a timeout;
- editing `TRIPLES` or any existing row of `ANGLES` other than adding the two new fields.

If, having read the failure, you believe the test itself is wrong: stop the unit there, leave the tree uncommitted, and report the seed and both expressions. Do not fix the test and do not route around it.

## 6. Done

- `/home/user/Maths-Trainer/src/content/courses/complexNumbers.ts` has 14 lessons with ids `cn-l1-roots, cn-l1-arithmetic, cn-l1-complex, cn-l1-quadratics, cn-l2-multiply, cn-l2-conjugates, cn-l2-division, cn-l3-plane, cn-l3-modulus, cn-l3-sqrt, cn-l4-argument, cn-l4-polar, cn-l4-powers, cn-l4-de-moivre`; level checks are 15/12/15/15.
- `complexGenerators` exports one more generator (`complex-quadratic`); `planeGenerators` exports three more (`polar-form`, `polar-power`, `complex-sqrt`). `grep -n "id: '" ` on both files confirms those exact ids — report names from the grep, not from memory.
- Four scratch-oracle runs reported with zero failures (or two, at minimum, for A and B).
- `npm test` (count ≥ baseline), `npx tsc --noEmit -p tsconfig.app.json`, `npm run lint` (0 errors), `npm run build` all pass on the pushed tree; `git status` clean; `origin/week/task2-complex-numbers` == local; `main`, local and remote, still at the commit the session started from.
- Four commits (or two, at minimum), each a whole lesson, each on `week/task2-complex-numbers` and pushed there.
- Nothing changed outside `src/content/generators/{complex,complexPlane}.ts`, `src/content/courses/complexNumbers.ts` and `eval-advisor.log`.
- The final report states the level-check retirement in 4a, and that the owner should open the four lessons on the phone once merged — the suite renders every TeX string but cannot see layout, and a choice label as long as `2\sqrt{2}\left(\cos\tfrac{3\pi}{4} + i\sin\tfrac{3\pi}{4}\right)` at 393 px is the one thing here most likely to wrap badly.

## 7. Risks and handling

1. **No oracle.** The property tests prove self-consistency only. Handled by the mandatory scratch check per unit (5.3), whose independence is real: mathjs evaluating a root into the quadratic, mathjs's own `arg`/`abs` of a power, mathjs's principal `sqrt`. Its output is part of the deliverable.
2. **Value-equal, tex-different options.** The distractor test fails on these, and angles are the danger (`4π/3` and `-2π/3` are one direction). Every angle option except the deliberately unreduced one goes through `principal` then the canonical `angleTex`; every complex option goes through `complexTex`. If a seed still fails, read the two expressions and add the missing canonicalisation — do not drop the `answer`.
3. **`polar-form` renders `choice` natively and declares `choices()`.** First of its kind here; by code reading it is fine. Fallback stated in 2.2: one-directional generator, no third design.
4. **Editing `ANGLES`.** Additive fields only. `argument`'s 12 tests re-run on every unit and will catch a damaged row.
5. **TeX escaping.** Write the file directly. `\\tfrac`, `\\sqrt`, `\\left(`, `\\right)`, `\\cos`, `\\sin`, `\\pi`, `\\arg`, `\\pm`, `\\Rightarrow`, `\\text`, `\\,` all appear above with doubled backslashes; `pi`, `arg`, `cos`, `sin`, `text`, `left`, `right` are on the denylist so a single slip is caught, but only in TeX fragments — keep maths inside `$…$`.
6. **Prose promising checker behaviour.** No teach slide above claims what the checker accepts; the only typed forms are ones already shipped. Keep it that way: if you add a sentence like "either form is accepted", delete it.
7. **Level-check growth retires bests** (4a). Not a bug — the F1 fix working as designed — but say it in the report.
8. **Session budget.** Fixed order A → B → C → D, commit and push after each, never begin a unit without room to finish it. Two units is acceptable; fewer is a failed session.
9. **Untestable surface.** Lesson layout on the phone, and long choice labels in B. Nothing to do in the container beyond the render sweep; flag for the owner.

## 8. Verified in this container (mathjs 15.2.0, Node v22.22.2), with the command

All via `npx vite-node <scratchpad>/probe.ts` importing `checkAnswer` from `/home/user/Maths-Trainer/src/engine/equivalence` and `math` from `/home/user/Maths-Trainer/src/engine/expression`. Default options were `{ domain: 'complex' }` unless shown.

1. `checkAnswer('2i', '(0) + (2)*i')` → `correct`; `checkAnswer('-1+2i', '(-1) + (2)*i')` → `correct`; `checkAnswer('-1-2i', '(-1) + (2)*i')` → `incorrect`.
2. `checkAnswer('2*sqrt(2)*(cos(3*pi/4) + i*sin(3*pi/4))', '(-2) + (2)*i')` → `correct`; same with `pi/4` → `incorrect`; `checkAnswer('2*(cos(pi) + i*sin(pi))', '2*(cos(-pi) + i*sin(-pi))')` → `correct` (so never build a distractor by negating an angle).
3. `checkAnswer('4*pi/3', '-2*pi/3', { domain: 'real' })` → `incorrect`; `checkAnswer('-2*pi/3', '-2*pi/3', { domain: 'real' })` → `correct`; `checkAnswer('8', '2^3', { domain: 'real' })` → `correct`.
4. `principal()` as written in 2.3 versus `math.arg((cos(kπ/d) + i sin(kπ/d))^n)`: `(k,d,n) = (3,4,3) → π/4`, `(1,3,4) → -2π/3`, `(1,1,3) → π`, `(-5,6,5) → -π/6`, `(1,2,2) → π`, `(-3,4,2) → π/2` — all six agree to 6 d.p.
5. `checkAnswer('sqrt(3+4*i)', '(2) + (1)*i')`, `('sqrt(3-4*i)', '(2) + (-1)*i')`, `('sqrt(-5+12*i)', '(2) + (3)*i')`, `('sqrt(-24-10*i)', '(1) + (-5)*i')` → all `correct`.
6. `math.evaluate('x^2 + (b)*x + (c)', { x: math.complex(p, q) })` for `(p,q) = (1,2), (-3,5), (2,1), (-1,6)` → `0`, `-1.42e-14`, `0`, `0` (hence the tolerance in 5.3).

**Not verified here, for the executor to check:** that `npx vite-node` fetches in the executing container (it did here); that a native `choice` render coexisting with `choices()` passes the sweep (code reading only — fallback in 2.2); the keypad face of `ANGLE_KEYS` on a modulus question (cosmetic; the `/` key inserts a fraction template, which a learner typing `64` never presses).

### Critical files
- /home/user/Maths-Trainer/src/content/generators/complex.ts
- /home/user/Maths-Trainer/src/content/generators/complexPlane.ts
- /home/user/Maths-Trainer/src/content/courses/complexNumbers.ts
- /home/user/Maths-Trainer/src/content/generators/format.ts (read only)
- /home/user/Maths-Trainer/src/content/choiceVariant.ts (read only)
- /home/user/Maths-Trainer/src/content/generators/generators.test.ts (read only, never edited)
- /home/user/Maths-Trainer/eval/PREFLIGHT.md
- /home/user/Maths-Trainer/eval-advisor.log
