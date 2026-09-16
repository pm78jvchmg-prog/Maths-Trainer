<!-- Provenance: written by Fable 5.1 (built-in Plan agent, model override
`fable`, default effort — the high-effort frontmatter did not load, since agent
definitions are read at session start). Verbatim, except for this header and the
override at the end. Task 1 of the week of real use; see ../WEEK.md. -->

# Plan: more lessons — Differentiation only, four lessons, four generators, staged

## 0. The scoping decision (read this first)

**Do one course properly: Differentiation.** Add four lessons, each built around one new generator, in a fixed priority order, committing and pushing after each one passes every gate. Do not touch the other seven courses this session.

Why Differentiation and not "one lesson in each of eight":

- It is the visibly thin course: 7 lessons against 10–13 everywhere else, and its Level 3 (The Chain Rule) has a single lesson. Four lessons brings it to 11, level with the rest.
- It is the cheapest course to extend *correctly*. Its generators share four tiny formatters in `src/content/generators/calculus.ts` (`termTex`, `termAnswer`, `sumTex`, `sumAnswer`), and it is the one course where the oracle test (`mathjs.derivative` of `source`) independently proves each new answer right. Eight courses means eight idioms (`fracTermTex`, tiles templates, `Expr` trees, plane SVG, wave figures) and eight different ways to fail the property tests.
- "More lessons for each topic" is honoured across sessions, not in one. This plan is the template: the same shape (one new generator + reused generators per lesson, commit per lesson) applied to the next-thinnest course (Complex Numbers, 10 lessons) in a follow-up session.

Where breadth is traded for completability: no new courses, no new levels, no new slide kinds, no new tests, no changes to `registry.ts`, `index.ts`, `types.ts`, or `generators.test.ts`. Two files change: `src/content/generators/differentiation.ts` and `src/content/courses/differentiation.ts` (plus one exported keypad constant in `src/content/generators/calculus.ts`).

**Stop rule.** Pairs are ordered by value. Complete = 4 pairs. Acceptable = 2 pairs. Never start a pair you cannot finish and push; each pushed commit deploys to production and must be a whole lesson, green on every gate.

## 1. Before writing anything

1. `command -v node || export PATH="$HOME/.local/node/bin:$HOME/.local/gh/bin:$PATH"` (harmless no-op in a cloud container).
2. Read `CLAUDE.md` in full and `PITFALLS.md` Part 2 (section 2.2 especially: the oracle test skips silently if you forget `source`).
3. Read all of `src/content/generators/differentiation.ts` (1097 lines: the idiom you are copying — `powerRule`, `chainRule`, `trigDerivative`, `evaluateDerivative`, `bank4`, `nonZero`), `src/content/generators/calculus.ts` (75 lines: the formatters and keypads), `src/content/courses/differentiation.ts` (648 lines: `teach`/`ask`/`graph` helpers and the lesson voice), and `src/content/choiceVariant.ts` (`options()` dedups distractors by `tex` only).
4. Run `npm test` and `npx tsc --noEmit -p tsconfig.app.json` once on a clean tree so you know the baseline is green (the oracle test is slow; it carries its own 60 s budget — do not touch it).

## 2. What to change, file by file, in order

### 2.1 `src/content/generators/calculus.ts` — one addition

After `EXP_KEYS`, export a keypad for root questions:

```ts
export const ROOT_KEYS: KeypadKey[] = [...ALGEBRA_KEYS, { insert: 'sqrt(' }];
```

(`'sin('` and `'ln('` keys already exist, so a function-call insert is an established pattern.)

### 2.2 `src/content/generators/differentiation.ts` — four new generators

Add each in the section order below, between `chooseRule` and the `differentiationGenerators` export, and append each to that array. Import `ROOT_KEYS` alongside the existing imports from `./calculus`. Every generator: `render` and `solution` take the same params; `*Tex` strings are what the learner reads, `answer`/`source` are mathjs-only and never displayed; every backslash doubled in source; written directly in the file, never via a heredoc or script.

Two small local helpers, added once near `bank4`:

```ts
/** c/2 · x^{power} with `power` a TeX exponent such as '-1/2'; whole halves lose the fraction. */
function halfTermTex(c: number, power: string): string {
  if (c % 2 === 0) {
    const h = c / 2;
    return `${h === 1 ? '' : h === -1 ? '-' : h}x^{${power}}`;
  }
  return `${c < 0 ? '-' : ''}\\frac{${Math.abs(c)}}{2}x^{${power}}`;
}

/** A straight line as the learner reads it; never the empty string. */
function lineTex(gradient: number, intercept: number): string {
  const tex = sumTex([termTex(gradient, 1), termTex(intercept, 0)]);
  return tex === '' ? '0' : tex;
}
```

(`sumTex(['0','0'])` returns `''` — a blank choice label — which is why `lineTex` exists.)

---

#### Generator A — `df-index-form` (priority 1)

Roots and fractions differentiated by rewriting them as powers. `interface IndexFormParams { form: 'reciprocal' | 'root' | 'reciprocalRoot'; a: number; n: number }`.

`sample(rng, difficulty)` — always draw `form`, `a`, `n` in that order so the stream is uniform:
- difficulty 1: `form = rng.pick(['reciprocal', 'reciprocal', 'root'])`, `a = rng.int(1, 9)`, `n = rng.int(1, 4)` (ignored for `root`). Distinct renders: 9×4 + 9 = 45 ≥ 25.
- difficulty 2: `form = rng.pick(['reciprocal', 'root', 'reciprocalRoot'])`, `a = rng.int(2, 12)`, `n = rng.int(2, 6)`. Distinct: 55 + 11 + 11 = 77.

`render` — `kind: 'expression'`, prompt `[{ kind: 'prose', text: 'Differentiate with respect to $x$.' }, { kind: 'display', tex: 'y = …' }]`, `lead: '\\frac{dy}{dx} ='`, `mode: 'exact'`:
- `reciprocal`: display `y = \\frac{a}{x^{n}}` (`n === 1` → `\\frac{a}{x}`); `answer: termAnswer(-a * n, -(n + 1))`; `source: termAnswer(a, -n)`; `domain: 'real'`; `keypad: ALGEBRA_KEYS`.
- `root`: display `y = ${a === 1 ? '' : a}\\sqrt{x}`; `answer: \`((${a})/2) * x^(-1/2)\``; `source: \`(${a}) * x^(1/2)\``; `domain: 'positive'`; `keypad: ROOT_KEYS`.
- `reciprocalRoot`: display `y = \\frac{a}{\\sqrt{x}}`; `answer: \`((${-a})/2) * x^(-3/2)\``; `source: \`(${a}) * x^(-1/2)\``; `domain: 'positive'`; `keypad: ROOT_KEYS`.

`domain: 'positive'` on the two root forms is deliberate and verified: `sqrt(x^3)` and `x^(3/2)` disagree at negative x under mathjs's principal branch, and a learner writing `3/(2*sqrt(x))` must not be marked wrong. Integer-power forms stay `'real'`.

`choices` (each option has both `tex` and `answer`, so the test proves every distractor wrong):
- reciprocal — correct `(−an, −(n+1))`; distractors `(an, −(n+1))` sign dropped, `(−an, −(n−1))` power went up, `(−a, −(n+1))` forgot to multiply. Use `termTex`/`termAnswer` for all four. When `n = 1` the last has identical tex to the correct answer and `options()` drops it — that is fine (three options remain).
- root — correct `halfTermTex(a, '-1/2')` / `((a)/2) * x^(-1/2)`; distractors `halfTermTex(a, '1/2')` / `((a)/2) * x^(1/2)`; `${a === 1 ? '' : a}x^{-1/2}` / `(a) * x^(-1/2)`; `halfTermTex(-a, '-1/2')` / `((-a)/2) * x^(-1/2)`. All differ from correct for every `a ≥ 1`.
- reciprocalRoot — correct `halfTermTex(-a, '-3/2')` / `((-a)/2) * x^(-3/2)`; distractors `halfTermTex(a, '-3/2')`; `halfTermTex(-a, '-1/2')` / `((-a)/2) * x^(-1/2)`; `-${a === 1 ? '' : a}x^{-3/2}` / `(-a) * x^(-3/2)`.

`solution` — four steps using the drawn numbers: (1) rewrite in index form (`\\frac{a}{x^{n}} = ax^{-n}` / `a\\sqrt{x} = ax^{1/2}` / `\\frac{a}{\\sqrt{x}} = ax^{-1/2}`); (2) the rule with the arithmetic shown (`a \\times (-n) = …, \\; -n - 1 = …`); (3) the result in index form; (4) the same result written back as a fraction or radical, with a one-line note: for reciprocals, that the power became *more* negative and the answer is negative because `1/x^n` falls as x grows; for roots, that either form is accepted.

---

#### Generator B — `df-chain-root` (priority 2)

Chain rule on `\sqrt{ax+b}` and `1/(ax+b)^n`. `interface ChainRootParams { form: 'root' | 'reciprocal'; a: number; b: number; n: number }`.

`sample`: `form = rng.pick(['root', 'reciprocal'])`; `a = rng.int(2, difficulty >= 2 ? 7 : 5)` — **never 1**, so the chain factor is always visible and the "forgot the chain factor" distractor is always wrong; `b = form === 'root' ? rng.int(1, 9) : nonZero(rng.int(-9, 9), difficulty >= 2 ? -4 : 3)` (root keeps `ax+b > 0` on the positive domain); `n = difficulty >= 2 ? rng.pick([2, 3]) : 1` (ignored for root). Distinct at difficulty 1: 36 + 72; at 2: 54 + 216.

Shared strings: `linear = sumTex([termTex(a, 1), termTex(b, 0)])`, `linearAnswer = sumAnswer([termAnswer(a, 1), termAnswer(b, 0)])`, `bracket = (p) => p === 1 ? \`\\\\left(${linear}\\\\right)\` : \`\\\\left(${linear}\\\\right)^{${p}}\``.

`render` — prompt 'Differentiate with respect to $x$.' + display, lead `\\frac{dy}{dx} =`, `mode: 'exact'`:
- root: display `y = \\sqrt{${linear}}`; `answer: \`((${a})/2) * (${linearAnswer})^(-1/2)\``; `source: \`(${linearAnswer})^(1/2)\``; `domain: 'positive'`; `keypad: ROOT_KEYS`.
- reciprocal: display `y = \\frac{1}{${n === 1 ? linear : bracket(n)}}`; `answer: \`(${-a * n}) * (${linearAnswer})^(${-(n + 1)})\``; `source: \`(${linearAnswer})^(${-n})\``; `domain: 'real'`; `keypad: ALGEBRA_KEYS`. (Verified: mathjs gives `-(4 / (2 * x + 3) ^ 3)` for `(2*x+3)^(-2)`, which the checker matches.)

`choices`:
- root — correct `\\frac{a}{2\\sqrt{linear}}`; distractors `\\frac{1}{2\\sqrt{linear}}` / `(1/2) * (linearAnswer)^(-1/2)` (forgot chain factor), `\\frac{a}{\\sqrt{linear}}` / `(a) * (linearAnswer)^(-1/2)` (forgot the half), `\\frac{a}{2}\\sqrt{linear}` / `((a)/2) * (linearAnswer)^(1/2)` (power went up).
- reciprocal — correct `-\\frac{an}{bracket(n+1)}`; distractors `\\frac{an}{bracket(n+1)}` (sign), `-\\frac{n}{bracket(n+1)}` / `(-n) * (…)^(-(n+1))` (forgot chain factor), `-\\frac{an}{bracket(n)}` / `(-a*n) * (…)^(-n)` (power not increased). All always wrong given `a ≥ 2`.

`solution`: (1) rewrite as a power of the bracket; (2) chain rule: outer derivative, then `\\frac{du}{dx} = a`; (3) multiply the two coefficients, shown; (4) written back as a radical/fraction, with the note that a coefficient of 1 inside would hide the chain factor, which is why none of these questions has one.

---

#### Generator C — `df-product-mixed` (priority 3)

Product rule where one factor needs the chain rule: `a x^n · sin(kx) | cos(kx) | e^{kx}`. `interface ProductMixedParams { fn: 'sin' | 'cos' | 'exp'; a: number; n: number; k: number }`.

`sample`: `fn = rng.pick(['sin', 'cos', 'exp'])`; difficulty 1: `a = 1`, `n = rng.int(1, 3)`, `k = rng.int(2, 5)` (36 distinct); difficulty 2: `a = rng.int(2, 5)`, `n = rng.int(2, 4)`, `k = rng.int(2, 6)` (180). `k ≥ 2` always, so "forgot the chain factor" is always wrong.

Strings: `kx = termTex(k, 1)`; `inner = \`(${k}) * x\``; display factor `fn === 'exp' ? \`e^{${kx}}\` : \`\\\\${fn}\\\\left(${kx}\\\\right)\``; the differentiated factor is `cos` for sin, `sin` for cos (with the sign carried in the coefficient), `e^{kx}` for exp; `s = fn === 'cos' ? -1 : 1`.

`render`: display `y = ${termTex(a, n)}${factorTex}`; lead `\\frac{dy}{dx} =`; `keypad: fn === 'exp' ? EXP_KEYS : TRIG_KEYS`; `answer: sumAnswer([\`${termAnswer(a * n, n - 1)} * ${fAnswer}\`, \`${termAnswer(s * a * k, n)} * ${fdAnswer}\`])` where `fAnswer` is `sin(inner)` / `cos(inner)` / `e^(inner)` and `fdAnswer` is `cos(inner)` / `sin(inner)` / `e^(inner)`; `source: \`${termAnswer(a, n)} * ${fAnswer}\``; `domain: 'real'`; `mode: 'exact'`. (`termAnswer(c, 0)` returns `(c)`, so `n = 1` is safe. Verified: mathjs differentiates `x^(2) * sin((3) * x)` to `2 * x * sin(3 * x) + 3 * x ^ 2 * cos(3 * x)`.)

`choices` — build each option as a pair of coefficients `(c1, c2)` for the two terms, tex `sumTex([\`${termTex(c1, n - 1)}${factorTex}\`, \`${termTex(c2, n)}${otherFactorTex}\`])` (a negative `termTex` starts with `-`, which `sumTex` folds into ` - `), answer via `sumAnswer` the same way:
- correct `(an, s·ak)`; "product of the derivatives" as a single term `${termTex(s * a * n * k, n - 1)}${otherFactorTex}` / `${termAnswer(s*a*n*k, n-1)} * ${fdAnswer}`; "forgot the chain factor" `(an, s·a)`; "sign slip" `(an, −s·ak)`. All four survive every draw.

`solution`: (1) the product rule; (2) `u = …, v = …, u' = …, v' = …` with the chain factor already inside `v'`; (3) assemble; (4) for `exp`, the factorised form `x^{n-1}e^{kx}(n + kx)` as a check that both forms are accepted; for trig, where the minus sign lands.

---

#### Generator D — `df-tangent-line` (priority 4)

The equation of the tangent to `y = ax² + bx + c` at `x = at`. `interface TangentParams { a: number; b: number; c: number; at: number }`. Derived in render/solution/choices: `m = 2*a*at + b`, `height = a*at*at + b*at + c`, `k = height - m*at`.

`sample` — a `for (;;)` loop like `quotientRule`, returning only when `2*a*at + b !== 0` (a horizontal tangent makes the "forgot to shift" distractor equal to the answer):
- difficulty 1: `a = 1`, `b = rng.int(-4, 4)`, `c = rng.int(-5, 5)`, `at = nonZero(rng.int(-3, 3), 2)` — 594 combinations before the filter.
- difficulty 2: `a = nonZero(rng.int(-3, 3), 2)`, `b = rng.int(-6, 6)`, `c = rng.int(-9, 9)`, `at = nonZero(rng.int(-4, 4), -2)`.

`render`: prompt `[{ kind: 'prose', text: \`Find the equation of the tangent to the curve at $x = ${at}$. Give the answer as an expression in $x$.\` }, { kind: 'display', tex: \`y = ${sumTex([termTex(a, 2), termTex(b, 1), termTex(c, 0)])}\` }]`; `lead: 'y ='`; `keypad: ALGEBRA_KEYS`; `answer: sumAnswer([termAnswer(m, 1), termAnswer(k, 0)])`; **no `source`** (the answer is not a derivative of anything — say so in a comment, since PITFALLS 2.2 tells a reader to grep for it); `domain: 'real'`; `mode: 'exact'`. The lead `y =` strips to a bare `y` in the choice variant; `choiceVariant.promptFrom` already guards that case and falls back to the prompt, so the "bare single-letter display" test passes.

`choices` — candidates as `(gradient, intercept)` pairs, tex via `lineTex`, answer via `sumAnswer([termAnswer(g, 1), termAnswer(i, 0)])`; **filter out any pair equal to `(m, k)` before passing to `options()`**: correct `(m, k)`; `(m, height)` right gradient, forgot to shift (never equals correct since `m·at ≠ 0`); `(0, height)` substituted before differentiating (never equals correct); `(height, height − height·at)` used the height as the gradient (equals correct exactly when `height === m`, which the filter removes). At least three options always survive.

`solution`: (1) `f'(x) = 2ax + b`; (2) gradient at `at`: `m = …`; (3) the point: `f(at) = height`; (4) `y - height = m(x - at)` rearranged to `y = mx + k`; (5) the order trap, in one line.

---

### 2.3 `src/content/courses/differentiation.ts` — four lessons and three level checks

Use only the file's own helpers (`teach`, `ask`, `graph`); do not introduce `askAfter`/`leadIn`. Each lesson: exactly 10 guided slides, first one `teach`, three teach slides of 3–5 blocks in the existing voice (short paragraphs, British spelling, no emoji, `**bold**` and `$maths$` only, apostrophes inside single-quoted strings as `\'` or use double-quoted strings as the file does for `f'` lines), `skillCheck` of exactly 3. Display TeX below is written as it must appear in source (backslashes doubled).

**Lesson 1 — id `df-l1-index`, title `Roots and Fractions`**, inserted in `df-l1.lessons` after `df-l1-sums`.
```
teach(T1), ask('df-index-form'), ask('df-index-form'), ask('df-index-form+choice'),
teach(T2), ask('df-index-form', 2), ask('df-index-form+choice', 2),
teach(T3), ask('df-index-form', 2), ask('power-rule', 2)
skillCheck: [ask('df-index-form', 2), ask('df-index-form'), ask('power-rule', 2)]
```
- T1: a fraction with x underneath and a root are both powers in disguise; the rule wants index form first, then the rule, then write it back. Display `'\\frac{1}{x^{3}} = x^{-3} \\qquad \\sqrt{x} = x^{1/2}'`. Worked: `4/x³ = 4x⁻³ → −12x⁻⁴ = −12/x⁴`.
- T2: the sign — a negative power comes down as a negative multiplier and the power goes *more* negative. Display `'\\frac{d}{dx}\\left(\\frac{2}{x^{3}}\\right) = -6x^{-4} = -\\frac{6}{x^{4}}'`. "−3 to −4, not to −2" is the slip; a positive answer for a reciprocal is wrong on sight because `1/xⁿ` falls as x grows.
- T3: roots — `√x = x^{1/2}` gives `½x^{-1/2}`; `1/√x = x^{-1/2}` gives `−½x^{-3/2}`. Display `'\\frac{d}{dx}\\left(4\\sqrt{x}\\right) = 2x^{-1/2} = \\frac{2}{\\sqrt{x}}'`. Either form of the answer is accepted.

**Lesson 2 — id `df-l1-tangent`, title `The Equation of a Tangent`**, inserted after `df-l1-index`.
```
teach(T1), ask('evaluate-derivative'), ask('df-tangent-line'), ask('df-tangent-line+choice'),
teach(T2), ask('df-tangent-line'), ask('df-tangent-line', 2),
teach(T3), ask('df-tangent-line+choice', 2), ask('df-evaluate-steps')
skillCheck: [ask('df-tangent-line', 2), ask('df-tangent-line'), ask('evaluate-derivative', 2)]
```
- T1: a tangent is a straight line, so a gradient and a point fix it; the derivative supplies the gradient, the curve supplies the point. Display `'y - y_{1} = m\\left(x - x_{1}\\right)'`. Three steps: differentiate; substitute `x₁` into `f'` for the gradient and into `f` for the height; assemble.
- T2: worked example `f(x) = x² + 1` at `x = 2`: `f'(x) = 2x`, `m = 4`, point `(2, 5)`, `y − 5 = 4(x − 2)`. Display `'y - 5 = 4\\left(x - 2\\right) \\implies y = 4x - 3'`. Then the figure, copying the `df-l1-sums` pattern exactly: `graph({ xMin: -1, xMax: 4, curves: [{ f: quadratic(1, 0, 1) }, { f: (x) => 4 * x - 3, dashed: true, accent: true }], marks: [{ x: 2, y: 5 }], yMin: -4, yMax: 12, label: 'y = x^2 + 1 with its tangent line at x = 2' })`, followed by one prose line saying the dashed line touches only at the ringed point `(2, 5)`.
- T3: two traps — substituting before differentiating gives gradient 0 and a horizontal line; using the height as the gradient. The check: the point must satisfy the line. Display (double-quoted string, because of the primes) `"m = f'(x_{1}) \\qquad c = f(x_{1}) - m x_{1}"`.

**Lesson 3 — id `df-l3-roots`, title `Roots and Reciprocals of Brackets`**, inserted in `df-l3.lessons` after `df-l3-chain`.
```
teach(T1), ask('df-chain-root'), ask('df-chain-root'), ask('df-chain-root+choice'),
teach(T2), ask('df-chain-root', 2), ask('df-chain-root', 2),
teach(T3), ask('df-chain-root+choice', 2), ask('chain-rule', 2)
skillCheck: [ask('df-chain-root', 2), ask('df-chain-root'), ask('chain-rule', 2)]
```
- T1: `√(bracket)` is `(bracket)^{1/2}`; the chain rule gives `½(…)^{-1/2}` times the inside's derivative. Display `'\\frac{d}{dx}\\sqrt{2x + 3} = \\tfrac{1}{2}\\left(2x + 3\\right)^{-1/2} \\times 2 = \\frac{1}{\\sqrt{2x + 3}}'`. The `½` is the outer derivative, the `2` is the chain factor; both must appear.
- T2: `1/(bracket)ⁿ` is `(bracket)^{-n}`; `−n(…)^{-n-1}` times the inside's derivative. Display `'\\frac{d}{dx}\\left(\\frac{1}{\\left(3x - 1\\right)^{2}}\\right) = -2\\left(3x - 1\\right)^{-3} \\times 3 = -\\frac{6}{\\left(3x - 1\\right)^{3}}'`. The sign, and the power in the denominator going *up* by one.
- T3: with a coefficient of 1 inside, the chain factor is invisible — which is why every question here has one of at least 2. `1/(ax+b)` can also be done by the quotient rule and the two must agree; use that as a check. Display `'\\frac{d}{dx}\\left(\\frac{1}{2x + 3}\\right) = -\\frac{2}{\\left(2x + 3\\right)^{2}}'`.

**Lesson 4 — id `df-l4-combine`, title `Combining the Rules`**, appended to `df-l4.lessons` after `df-l4-exp` (it becomes the last lesson of the course).
```
teach(T1), ask('df-product-mixed'), ask('df-product-mixed'), ask('df-product-mixed+choice'),
teach(T2), ask('df-product-mixed', 2), ask('df-product-mixed', 2),
teach(T3), ask('df-product-mixed+choice', 2), ask('df-choose-rule', 2)
skillCheck: [ask('df-product-mixed', 2), ask('df-product-mixed'), ask('product-rule', 2)]
```
- T1: most real expressions need two rules; name the outermost structure first. `x² sin 3x` is a product whose second factor needs the chain rule. Display `'\\frac{d}{dx}\\left(x^{2}\\sin 3x\\right) = 2x\\sin 3x + 3x^{2}\\cos 3x'`. Write `u, v, u', v'` with the chain factor already inside `v'`.
- T2: with `e^{kx}` both terms share the exponential, so the answer factorises. Display `'\\frac{d}{dx}\\left(x^{3}e^{2x}\\right) = 3x^{2}e^{2x} + 2x^{3}e^{2x} = x^{2}e^{2x}\\left(3 + 2x\\right)'`. Either form is accepted. With cosine the minus sign lands in the second term.
- T3: checking by structure — exactly one factor differentiated per term; the `k` appears only in the term where the trig or exponential was differentiated; "the product of the derivatives" has one term and is wrong. Then: the course in one question, choosing the rule. Display `"\\frac{d}{dx}(uv) = u'v + uv'"`.

Also in `df-l4-exp`: change the comment above its final `ask('df-choose-rule')` from "The last slide of the course" to "The last slide of the lesson" — it is no longer the end of the course.

**Level checks** (replace the arrays wholesale; all difficulty 2; 10–15 entries; interleaved as the file does now):
- `df-l1.levelCheck` (15): `power-rule, sum-rule, evaluate-derivative, df-index-form, df-tangent-line` repeated three times in that order.
- `df-l3.levelCheck` (14): `chain-rule, df-chain-root, product-rule, quotient-rule, chain-rule, df-chain-root, product-rule, quotient-rule, chain-rule, df-chain-root, product-rule, quotient-rule, chain-rule, df-chain-root`.
- `df-l4.levelCheck` (15): `trig-derivative, exp-log-derivative, chain-rule, df-product-mixed` repeated three times, then `trig-derivative, exp-log-derivative, df-product-mixed`.

Do only the level-check edit that belongs to the pair you are landing (L1 for A and D, L3 for B, L4 for C) so each commit stays self-contained.

## 3. Reused versus new

Reused, unchanged: `power-rule`, `evaluate-derivative`, `df-evaluate-steps` (reduce shape), `chain-rule`, `product-rule`, `quotient-rule`, `trig-derivative`, `exp-log-derivative`, `df-choose-rule` (flow shape), and the `+choice` forms the registry derives. Each new lesson gets two shapes from its own generator (`expression` + `choice`) and a third from a reused one, which is what satisfies the shape-variety tests without a second new generator.

New: `df-index-form`, `df-chain-root`, `df-product-mixed`, `df-tangent-line`. The 25-distinct floor is met by the sampling ranges above (minimum pool 36 at difficulty 1, for `df-product-mixed`; the test renders 600 seeds and counts distinct slides). Three of the four declare `source`, so the oracle checks them; the fourth has no derivative to check and says so in a comment.

## 4. Constraints and the tests that catch each

All in `src/content/generators/generators.test.ts` unless stated:

| Constraint | Test |
| --- | --- |
| Every backslash doubled; no `\left` without `\right`; nothing invalid | "renders every piece of TeX it emits" (generated), "renders every authored TeX fragment without error" (lessons; KaTeX `strict: 'error'`) |
| No backslash-stripped command (`frac{…}`, `sqrt{…}`, `left(`) | "never lets a TeX command lose its backslash" and the same `BARE_TEX_COMMAND` check inside the generated sweep |
| Prose: `**` and `$` paired; no stray `*`; no `\uXXXX` | "leaves no inline markup the reader would see as punctuation", "never leaves a raw escape sequence in prose" |
| Answer is what the checker accepts; a perturbed one is rejected | "produces an answer its own checker accepts", "rejects a perturbed answer" |
| Answer is the *right* derivative | "matches an independent symbolic derivative, where the generator declares its source" (60 s budget; skips silently without `source` — PITFALLS 2.2) |
| Distractors genuinely wrong; labels distinct; exactly one correct | "offers exactly one correct option, and distractors that are really wrong" |
| ≥25 distinct questions per difficulty | "can ask more distinct questions than a lesson has slides" |
| Solutions exist and vary with the numbers | "always offers a worked solution", "varies its worked solution with the question" |
| Choice lead does not strip to a single letter | "never shows a bare single-letter display in a derived choice prompt" |
| 9–11 guided slides, first is teach, exactly 3 skill-check, no teach in skill check | "gives every lesson about ten guided slides…", "opens each lesson by teaching before asking", "never puts a teaching slide in a skill check" |
| Level check 10–15, no repeats across 40 seeds, valid generator ids | "gives every level check 10 to 15 questions", "never repeats a question inside a level check" (an unknown id surfaces here as a thrown error naming neither lesson nor id — PITFALLS 2.4) |
| No repeated question in a lesson across 40 seeds | "never asks the same question twice in one sitting" |
| ≥2 widget shapes per lesson; no run of 3 same-shape questions between teach slides | "varies the shape of the questions inside a lesson", "never runs 3 or more identical-shape questions between teach slides" |
| Unique lesson ids | "uses unique lesson ids" |
| Real type errors (vitest strips types unchecked) | `npx tsc --noEmit -p tsconfig.app.json` — not a test; run it every time |
| No XP/streaks/routers/engagement mechanics; nothing outside content touched | Nothing catches this; it is a rule. Diff must be confined to the three files named. |

Never fix a failing distractor test by removing a distractor's `answer` field: that silently disables the check. Fix the sampling range or the filter instead.

## 5. Working loop per pair (A, then B, then C, then D)

1. Write the generator; append to `differentiationGenerators`.
2. `npx vitest run src/content/generators/generators.test.ts -t 'df-index-form'` (the `-t` argument is a regex and matches the `+choice` form too). Iterate until green.
3. Write the lesson and its level-check edit.
4. `npm test` && `npx tsc --noEmit -p tsconfig.app.json` && `npm run lint` (0 errors; 25 pre-existing warnings are expected — do not "fix" them).
5. `git add src/content && git commit` with a one-line imperative message in the repo's style (e.g. `Differentiate roots and fractions by rewriting them as powers`, `Chain rule for roots and reciprocals of a bracket`, `Combine the product rule with the chain rule`, `Find the tangent to a curve at a point`), ending with the attribution lines your session's system reminder specifies. Never commit `dist/`.
6. `git push origin main` (the remote is reachable from the container; if the proxy refuses a push, use the GitHub MCP `push_files` tool with the changed files instead). Every push deploys to production, which is why step 4 must be green first.
7. After the final pair, run `npm run build` once as the same command Cloudflare will run.

## 6. Done

- `src/content/courses/differentiation.ts` has 11 lessons (ids `df-l1-power, df-l1-sums, df-l1-index, df-l1-tangent, df-l2-product, df-l2-quotient, df-l3-chain, df-l3-roots, df-l4-trig, df-l4-exp, df-l4-combine`); level checks are 15/12/14/15.
- `src/content/generators/differentiation.ts` exports four more generators; `grep -n "source:" src/content/generators/differentiation.ts` shows one for each of A, B, C and a comment explaining its absence in D.
- `npm test`, `npx tsc --noEmit -p tsconfig.app.json`, `npm run lint` (0 errors), `npm run build` all pass on the pushed tree; `git status` clean; `origin/main` == local `main`.
- Four commits (or two, at minimum), each a whole lesson, each pushed.
- Nothing changed outside `src/content/generators/{differentiation,calculus}.ts` and `src/content/courses/differentiation.ts`.

## 7. Risks and handling

1. **Fractional powers and the checker.** Retired by verification: mathjs differentiates `x^(1/2)`, `x^(-1/2)`, `(2x+3)^(1/2)` correctly, and half-integer forms agree at negative x — except `sqrt(x^3)` vs `x^(3/2)`, hence `domain: 'positive'` on every root form and `'real'` on integer powers. Do not make `'positive'` a default.
2. **Distractor collisions.** Canonical formatting (`termTex`, `lineTex`) makes value-equal options tex-equal, which `options()` drops; the remaining value-equal-but-tex-different case (tangent gradient equal to height) is filtered explicitly; `a ≥ 2` / `k ≥ 2` / `m ≠ 0` guarantee the "forgot a factor" distractors are always wrong. If the distractor test still fails on a seed, read its message — it names the seed and both expressions — and narrow the sampling; do not drop `answer`.
3. **Blank option label.** `sumTex` of two zero terms is `''`; `lineTex` guards it. Keep it.
4. **TeX escaping.** Write the file directly. The proposed labels were rendered under KaTeX strict mode and the denylist and all pass; keep to them and to the patterns already in the file.
5. **Session budget.** Fixed order A→B→C→D, commit and push after each, never begin a pair without room to finish it. Two pairs is acceptable; fewer is a failed session.
6. **Untestable surface.** The tangent figure and the four lessons' look cannot be browser-checked from a container; the figure copies a proven `graph()` call from the same file, and every TeX string is rendered by the sweep. Say in the final report that the owner should open the four lessons on the phone once deployed.
7. **Oracle test runtime.** Three more `source`-bearing generators add a few seconds inside a per-generator 60 s budget; if it ever overruns, raise the budget, never the sample count.
8. **Stale comment.** `df-l4-exp`'s "last slide of the course" comment — update it in pair C.

### Critical Files for Implementation
- /home/user/Maths-Trainer/src/content/generators/differentiation.ts
- /home/user/Maths-Trainer/src/content/courses/differentiation.ts
- /home/user/Maths-Trainer/src/content/generators/calculus.ts
- /home/user/Maths-Trainer/src/content/generators/generators.test.ts
- /home/user/Maths-Trainer/src/content/choiceVariant.ts

---

## Override — branch, not `main` (added by the launching session, not the planner)

Section 5 step 6 says `git push origin main`. **It is overridden.** The week of
real use freezes "work pushed to a branch, never straight to `main`"
(`eval/WEEK.md`, Configuration). Push every commit to the outcome branch this
session was created with, and do not push to `main`. Everything else in section
5 stands, including that each commit must be a whole lesson with every gate
green before it is pushed.

Section 6's "`origin/main` == local `main`" is read the same way: the outcome
branch is what must be pushed and current, not `main`.
