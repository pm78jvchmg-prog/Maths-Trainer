<!-- Provenance: written by Fable 5.1 (planner), verbatim except for this header.
Task 6 of the week of real use; see ../WEEK.md and ../FLOW.md. Anchor: `6da9fc7`
on `main`, "Record the stale-log hole as instance six, and pin the tamper-evidence
property". Every number below marked "measured here" was produced in this checkout
at that commit, with the command named in section 10. -->

# Plan: task 6 — four Integration lessons, four generators, every one under a suite oracle

Task 6 of the week of real use. Executor starts cold; this text is the whole brief. Read alongside `/home/user/Maths-Trainer/eval/PREFLIGHT.md` (binding), `/home/user/Maths-Trainer/CLAUDE.md` (binding) and `/home/user/Maths-Trainer/PITFALLS.md` (binding: Part 2 §2.2, Part 3 §3.3, §3.7, §3.10, §3.12, and the pre-flight checklists). Nothing here is pinned to a commit hash beyond the anchor above, which must be an ancestor of your checkout's `HEAD` (`git merge-base --is-ancestor 6da9fc7 HEAD` exits 0). If it is not, stop and report rather than adapt.

Note on the brief you may have been given: it cites `eval/reports/TASK4-REPORT.md` as the record of task 4. **That file does not exist at the anchor** (`ls eval/reports/` shows only `TASK5-REPORT.md`); task 4's record is the section `## Task 4 complete` in `eval/WEEK.md` (line 1416 at the anchor). Read that instead. It is also where the two rules this plan leans on hardest were written down: *ids by grep, never from the report*, and *the entry ships in the commit it covers*.

## 0. The scoping decision (read this first)

**Do one course properly: Integration.** Add four lessons, each built around one new generator, in a fixed priority order, committing and pushing after each one passes every gate. Do not touch the other seven courses. Do not re-open the choice of course or of lessons.

**Why Integration, and why these four.** This is the one course whose generators carry independent verification inside the suite itself — three oracle tests in `src/content/generators/generators.test.ts`, each gated on a field the generator declares. Task 4 had to write a scratch oracle per unit because trigonometry declares nothing. Here the suite is the oracle, so **oracle coverage is a deliverable, not a side effect**: every new generator is placed under one of the three by construction, the plan says which and through what field, and a mutation proves the oracle fires on that generator (section 3, per unit). Section 2 explains the three oracles and why one runs in the differentiate direction.

Where the lessons go was my call, not the brief's. Level 3 is the thin level (3 lessons against 5 and 5) and it is also where the techniques the course exists to teach are only half-taught, so three of the four go there. One goes to Level 1, because an A-level integration course that cannot integrate $\sqrt{x}$ has a hole a learner meets in the first week — and it is the one place the brief's `domain: 'positive'` warning bites. Level 2 does not need the work: its one taught-but-unasked idea (area between two curves) needs whole-number intersections that shrink the pool below the floor, and its definite integrals of non-polynomials would answer with `(e^2 - 1)/2`, which the quadrature oracle reads as `NaN` and rejects. That is an honest scoping-out, not a deferral.

Each unit closes a gap the course itself opens:

- `in-l3-substitution` and the level have **no definite integral by substitution**, and the method's one real trap — changing the variable without changing the limits — is never met. **Unit A** closes that, under the quadrature oracle, which is exact on these polynomials.
- `in-l3-substitution` says *"look for an inner function whose derivative is already present"* and then only ever asks the one shape $ax(x^2+b)^n$. **Unit B** asks the general pattern — a cube inside, $xe^{x^2}$, $\cos x \sin^n x$ — under the differentiate-back oracle.
- `in-l1-negative` converts $\frac{1}{x^4}$ to $x^{-4}$ but nothing in the course ever integrates a root. **Unit D** closes that, under the differentiate-back oracle **and** the `alsoAccepts` test, because the root-form writing is exactly the case where `domain: 'positive'` is load-bearing (section 3.3).
- `in-l3-parts` states *"for a polynomial times an exponential or a trigonometric function, the polynomial is always $u$"* and stops there. The famous exception — $\ln x$ is $u$ against anything — is **Unit C**, under the differentiate-back oracle over the positive domain.

Result: 13 lessons (5/5/3) become 17 (6/5/6). Level checks `in-l1` and `in-l3` grow 12 → 15; `in-l2` is untouched. **That growth retires two stored bests — section 4a.**

**Stop rule.** Units are ordered A, B, D, C — by how much each closes and by how strong its oracle is, not by level. Complete = 4 units. Acceptable = A and B. Drop C first, then D. Never start a unit you cannot finish, gate, prove and push. Each commit is one whole lesson, green on every gate. Fewer lessons done properly beats four half-done; if only A and B land, say so in the report rather than rushing D.

**Deferred, on purpose, and worth recording in the report.** `∫ 1/x dx` and `∫ 1/(ax+b) dx` are taught in `in-l1-negative` and never asked. The header comment of `src/content/generators/integration.ts` (lines 10–14) says it is *"asked as a choice question instead"* — **it is not**: no generator in the file emits `ln`, and `grep -n "ln" src/content/generators/integration.ts` at the anchor matches only that comment. That is a stale comment describing a question that does not exist. It is not this task's to fix (it would be a fifth unit), but the report should name it as a finding, with the line numbers, so the owner can log it.

**What this task does not do.** It does not edit `generators.test.ts` or any file under `src/engine/`, `src/ui/`, `src/store/`, `eval/bin/`, or `src/content/{expr,choiceVariant,registry,types,figures}.ts`. It does not edit any existing lesson, any existing generator, or `in-l2`'s level check. It does not edit `eval/WEEK.md`, `eval/PREFLIGHT.md` or `eval/FLOW.md` — findings go in the report for the owner to log. It adds no slide kind and no keypad key. It does not amend this plan.

**Files that change**, all under `/home/user/Maths-Trainer/`: `src/content/generators/integration.ts`, `src/content/courses/integration.ts`, `eval-advisor.log` (append only), and — in the final bookkeeping commit only — `eval/reports/TASK6-REPORT.md`. Nothing else. `git diff --stat $(git merge-base HEAD origin/main)` before every commit must list only these. (Compare against the merge base, not a branch named `main`: task 5 found a local `main` several commits stale.)

**One destination.** `week/task6-integration`, branched from `main` at the anchor. `git branch --show-current` must print it, and must not print `main`, before the first push. Every unit is `git push origin week/task6-integration`. Never `main`, never a pull request. Nothing deploys from this branch.

## 1. Before writing anything

1. `command -v node || export PATH="$HOME/.local/node/bin:$HOME/.local/gh/bin:$PATH"` (no-op in a cloud container; here node was `/opt/node22/bin/node` v22.22.2).
2. Work only from the checkout you have been given. Do not consult any other branch and do not run `git log --all`.
3. `git status --short` is empty; `git rev-parse --short HEAD` and `git merge-base --is-ancestor 6da9fc7 HEAD` agree with the anchor; then `git checkout -b week/task6-integration` and `git branch --show-current` prints it.
4. If `node_modules` is absent, `npm install`, then `git checkout -- package-lock.json` before any diff (task 5 needed this; npm rewrites some `libc` fields on install and that churn must not enter a commit).
5. Read in full: `eval/PREFLIGHT.md`; `CLAUDE.md`; `PITFALLS.md` (the sections named above); `src/content/generators/integration.ts` (1366 lines — the file you are extending; note `INTEGRAL_KEYS`/`EXP_INTEGRAL_KEYS`/`TRIG_INTEGRAL_KEYS`, `reduce`, `fracTermTex`, `fracTermAnswer`, `integralTex`, `definiteTex`, `linearTex`, `nonZero`, `distinctOptions`, and that every generator object ends with `};` at column 0 — one mutation's sed range depends on it); `src/content/courses/integration.ts` (832 lines — the `teach`/`ask`/`askAfter`/`prose`/`maths`/`graph` helpers and the lesson voice: short paragraphs, British spelling, `**bold**` and `$maths$` only, `\\,` before `dx`, `\\left(`/`\\right)` around brackets in display TeX); `src/content/generators/calculus.ts` (77 lines — `termTex`, `termAnswer`, `sumTex`, `sumAnswer`, `ALGEBRA_KEYS`, `EXP_KEYS`, `TRIG_KEYS`, `ROOT_KEYS`); `src/content/choiceVariant.ts` (`options()` dedups distractors by `tex` and does **not** cap the count; `promptFrom` lifts the lead into the derived choice prompt); `src/engine/expression.ts` (the `ln → log` alias at line 15, and `samplePoint`'s note on why `positive` exists); `src/content/generators/generators.test.ts` lines 39–48 (`SEEDS`, `DIFFICULTIES`, `BARE_TEX_COMMAND`), 454–532 (self-consistency, perturbation, `alsoAccepts`), 534–621 (the three oracles — read every comment), 623–639 (the 25-question floor), 837–867 (the promise guard), 895–1082 (shape guards); `eval/bin/mutate.sh` in full (exit 0 killed / 1 survived / 2 harness error; refuses a dirty, untracked or missing file; prints the diff; refuses a no-op); `src/store/progress.ts` lines 36–47.
6. Measure the baseline yourself and record it in the report. Measured here on `main` at the anchor: `npx vitest run` → **3117 passed**, 7 files, 91.46 s, exit 0; `npx tsc --noEmit -p tsconfig.app.json` → silent, exit 0; `npm run lint` → **0 errors, 25 warnings** (count with `grep -c ' warning '`; do not "fix" them). Registry: **224** generators; **101** lessons. No count may drop below what you measure, and the test count must land on section 3's predictions exactly — a different delta means a test was lost or duplicated, **and is explained in the report, never absorbed by editing this plan** (section 7).
7. `sed --version` prints GNU sed (4.9 here); `npx vitest --version` runs (5.0.0 here); `npx vite-node --version` runs (6.0.0 here, cached under `~/.npm/_npx`). If any is missing, stop and report rather than adapt the harness.

## 2. The three oracles — what each proves, and which field puts a generator under it

All three live in `src/content/generators/generators.test.ts`, inside the per-generator `describe.each`, so a new generator is under them the moment it is exported. Each skips silently on a generator that does not declare its field (PITFALLS §2.2), which is why section 3 names the field per unit and section 3's mutations prove the oracle actually fires.

| Oracle | Test name | Gate | What it does |
| --- | --- | --- | --- |
| 1 | `matches an independent symbolic derivative, where the generator declares its source` | `slide.source` | `math.derivative(source)` compared to `answer` under the slide's `domain`/`mode`. **Not used by this task** — it is the differentiation direction, and no integration generator declares `source`. |
| 2 | `differentiates back to the integrand, where the generator declares one` | `slide.integrand` set **and `slide.limits` unset** | `math.derivative(answer)` compared to `integrand` under the slide's `domain` but in **`mode: 'exact'`**, deliberately not the slide's `upToConstant`. |
| 3 | `agrees with quadrature, where the generator declares limits` | `slide.integrand` **and** `slide.limits` | Simpson's rule, 1000 steps, over `[lower, upper]` of `integrand`, against `Number(answer)`; tolerance `1e-6 · max(1, |answer|)`; **`Number(answer)` must not be `NaN`**, so the answer string must be a plain number. |

Why oracle 2 runs the way it does — both points are in its comment and both bind this plan:

- **It differentiates our answer rather than integrating the integrand** because mathjs's symbolic integration is weak and, more to the point, would be *the same kind of machinery that produced the answer*. Differentiation is the direction in which the check is independent. Consequence for the executor: **the `answer` string must be something `math.derivative` can differentiate.** Verified here (section 10, item 6): `math.derivative('x*ln(x)', 'x')` **throws** — the `ln` alias exists only for evaluation — while `math.derivative('x*log(x)', 'x')` works. So unit C writes `log(x)` in `answer` and `integrand` (mathjs's `log` is the natural log), and the learner still types `ln(` from the keypad, which grades correct against it (verified, item 5).
- **It compares in `exact` mode, not the slide's `upToConstant`**, because a derivative has no arbitrary constant left in it; the looser mode would pass an answer that is wrong by a constant multiple of nothing — i.e. any answer differing from a true antiderivative by a constant would still differentiate to the integrand, so exact is *right*, and any answer differing by more would be caught only in exact. It excludes definite integrals because their answer is a number, whose derivative is zero: oracle 3 takes those.

**Coverage this task delivers**, stated up front so the report can be checked against it:

| Unit | Generator | Oracle | Field(s) | Also under |
| --- | --- | --- | --- | --- |
| A | `int-definite-substitution` | 3 (quadrature) | `integrand` + `limits` | — |
| B | `int-substitution-general` | 2 (differentiate back) | `integrand` | — |
| D | `int-root-power` | 2 | `integrand` | `accepts every other writing it promises` via `alsoAccepts`; the promise guard via one sentence |
| C | `int-parts-log` | 2, over `domain: 'positive'` | `integrand` | — |

Nothing new is left uncovered. The `+choice` form of each renders a `choice` slide and is skipped by all three oracles and by the `alsoAccepts` test — that is by design (the distractor test covers it), and the report must say the skip is a skip, not count it as a pass.

**The residual the oracles cannot see, stated now.** Oracle 2 and 3 check `answer` against `integrand`. Nothing checks that `integrand` describes the TeX the learner reads. A generator whose `lead` shows $4x(x^3+1)^2$ while its `integrand` says `4*x^2*(x^3+1)^2` passes everything. Unit B carries a deliberate mutation (M-B-tex) that is **expected to survive**, so the gap is on the record rather than assumed closed; the advisor consultation for every unit must check TeX ↔ `integrand` correspondence per form by eye, and the report says it did.

## 3. What to change, file by file, in order

Conventions for every generator: `render` and `solution` take the same params; `*Tex` strings are what the learner reads, `answer`/`integrand`/`alsoAccepts` strings are mathjs-only and never displayed; **every backslash doubled in source, exactly as written below**; written directly in the file, never through a heredoc or script (PITFALLS §3.12); `sample` draws in a fixed order. New ids checked here against the registry (224 ids, none collides): `int-definite-substitution`, `int-substitution-general`, `int-root-power`, `int-parts-log`, and their `+choice` forms. Each generator goes into `/home/user/Maths-Trainer/src/content/generators/integration.ts` immediately before `export const integrationGenerators`, in unit order, and is appended to that array after `chooseMethod` in the same order. Reuse the file's own `INTEGRAL_KEYS`, `EXP_INTEGRAL_KEYS`, `TRIG_INTEGRAL_KEYS`, `reduce`, `fracTermTex`, `fracTermAnswer`, `integralTex`, `definiteTex`, `nonZero`, and `options` from `../choiceVariant`. Add two module-level helpers once, above unit A's generator:

```ts
/** The algebra keys plus a root and the constant of integration. */
const ROOT_INTEGRAL_KEYS: KeypadKey[] = [...ROOT_KEYS, { insert: 'C' }];

/**
 * A coefficient in lowest terms in front of an arbitrary TeX factor: a bracket,
 * an exponential, a power of a trigonometric function. `fracTermTex` covers a
 * power of x; this covers everything else, and drops a coefficient of 1 so the
 * learner never reads "1(x^3 + 1)^4".
 */
function fracCoeffTex(num: number, den: number, factor: string): string {
  const { n, d } = reduce(num, den);
  if (d === 1) return `${n === 1 ? '' : n === -1 ? '-' : n}${factor}`;
  return `${n < 0 ? '-' : ''}\\frac{${Math.abs(n)}}{${d}}${factor}`;
}
```

(`ROOT_KEYS` is imported from `./calculus` alongside the keys already imported.) Where a lead or answer is built from a local in the pinned form below, **keep the local on a line of its own exactly as written** — section 3's mutations target those lines by full-line match.

Conventions for every lesson: use only the course file's own helpers (`teach`, `ask`, `prose`, `maths`; `askAfter` and `graph` are available but not required). Exactly 10 guided slides, the first a `teach`, three teach slides of 3–5 blocks, `skillCheck` of exactly 3. Prose below is given as the content each block must carry; write it in the file's voice, keep every `$…$` fragment and every `maths(...)` string exactly as given (all 97 were rendered here under KaTeX `strict: 'error'` and checked against `BARE_TEX_COMMAND` — section 10, item 7), and keep the one sentence marked PROMISE verbatim. Every difficulty-2 form a generator can draw is taught before the first difficulty-2 ask in its lesson; the deck orders below were built to that rule, so do not reorder them.

### 3.1 Unit A — `int-definite-substitution` and lesson `in-l3-definite-substitution` (priority 1)

**Generator.** `interface DefiniteSubstitutionParams { m: number; n: number; b: number; lower: number; upper: number }`. The integrand is $a x (x^2 + b)^n$ with $a = 2(n+1)m$, so the antiderivative is exactly $m(x^2+b)^{n+1}$ and every answer is whole without rounding — the same device `int-definite-power` uses.

`sample(rng, difficulty)`, in this order: `n = rng.pick([2, 3])`; `m = rng.int(1, difficulty > 1 ? 2 : 3)`; `b = difficulty > 1 ? nonZero(rng.int(-3, 4), 2) : rng.int(1, 4)`; `lower = rng.int(0, 1)`; `upper = lower + rng.int(1, difficulty > 1 ? 2 : 1)`. Distinct renders measured here on a prototype with exactly this sampling: **48 at difficulty 1, 112 at difficulty 2** (floor 25). Largest answer at difficulty 2 is 57122; at difficulty 1, 12288.

`render`: `const a = 2 * (n + 1) * m;` `const at = (t: number) => m * Math.pow(t * t + b, n + 1);` then, on its own line exactly: `    const total = at(upper) - at(lower);`. Returns `kind: 'expression'`; prompt one prose block `Evaluate, using the substitution $u = x^{2} + c$. The answer is a whole number.`; `lead: \`${definiteTex(\`${termTex(a, 1)}\\\\left(x^{2} ${b < 0 ? '-' : '+'} ${Math.abs(b)}\\\\right)^{${n}}\`, lower, upper)} =\`` (in the file that is `\\left(` and `\\right)` — doubled once); `keypad: []`; `` answer: `${total}` ``; `` integrand: `(${a}) * x * (x^2 + (${b}))^(${n})` ``; `limits: [lower, upper]`; `domain: 'real'`; `mode: 'exact'`.

`choices` (recompute `at` and `value = at(upper) - at(lower)` locally — do **not** name it `total`): `options({ tex: \`${value}\`, answer: \`${value}\` }, …)` with distractors, each with `answer` equal to its `tex`: `2 * value` (forgot that $a\,x\,dx$ is $\tfrac{a}{2}\,du$), `at(upper)` (dropped the lower term), `m * (Math.pow(upper, n + 1) - Math.pow(lower, n + 1))` (kept the $x$-limits on the $u$ antiderivative — the slip the lesson is about). `options()` drops a collision (at `lower = 1, b = -1` the lower term is 0 and the second distractor equals the answer), leaving three. Verified here over 400 draws: 1564 distractors, every one graded `incorrect`.

`solution`: (1) text `` `Put $u = x^{2} ${b < 0 ? '-' : '+'} ${Math.abs(b)}$, so $\\frac{du}{dx} = 2x$ and $${a}x \\, dx$ becomes $${(n + 1) * m} \\, du$. Change the limits with the variable: at $x = ${lower}$, $u = ${lower * lower + b}$; at $x = ${upper}$, $u = ${upper * upper + b}$.` ``; (2) tex `` `${(n + 1) * m}\\int_{${lower * lower + b}}^{${upper * upper + b}} u^{${n}} \\, du = \\left[${m === 1 ? '' : m}u^{${n + 1}}\\right]_{${lower * lower + b}}^{${upper * upper + b}}` ``; (3) tex `` `= ${at(upper)} - \\left(${at(lower)}\\right) = ${total}` ``; (4) text `Once the limits are $u$-values there is nothing to convert back. The answer is a number, and $x$ never reappears.`; (5) text `` `Putting the $x$-limits into the $u$ bracket instead gives $${m * (Math.pow(upper, n + 1) - Math.pow(lower, n + 1))}$ — the working looks right and the number is wrong. Change both, or change neither.` ``.

**Lesson** — id `in-l3-definite-substitution`, title `Substitution with Limits`, inserted in `in-l3.lessons` immediately after `in-l3-substitution` (unit B later inserts between them).

```
teach(T1), ask('int-definite-substitution'), ask('int-definite-substitution+choice'), ask('int-definite-substitution'),
teach(T2), ask('int-definite-substitution', 2), ask('int-definite-steps', 2), ask('int-definite-substitution+choice', 2),
teach(T3), ask('int-definite-substitution', 2), ask('int-substitution', 2)
skillCheck: [ask('int-definite-substitution', 2), ask('int-definite-substitution+choice', 2), ask('int-definite-substitution', 2)]
```

- T1 (5 blocks): prose — a definite integral by substitution can be done two ways and one is a trap; the safe way changes the limits along with the variable: once $u$ replaces $x$, the numbers on the integral sign must be $u$-values too. `maths('\\int_{0}^{2} 6x\\left(x^{2} + 1\\right)^{2} \\, dx')`. prose — put $u = x^{2} + 1$, so $\\frac{du}{dx} = 2x$ and $6x \\, dx$ becomes $3 \\, du$; then convert the limits: at $x = 0$, $u = 1$; at $x = 2$, $u = 5$. `maths('\\int_{0}^{2} 6x\\left(x^{2} + 1\\right)^{2} \\, dx = 3\\int_{1}^{5} u^{2} \\, du = \\left[u^{3}\\right]_{1}^{5} = 125 - 1 = 124')`. prose — no converting back: the limits are now $u$-values and the answer is a number, so $x$ never reappears.
- T2 (4 blocks): prose — the trap is to write the antiderivative in $u$ and then use the $x$ limits on it; the working looks fine and the number is wrong. `maths('\\left[u^{3}\\right]_{0}^{2} = 8 \\qquad \\left[u^{3}\\right]_{1}^{5} = 124')`. prose — the first is the error, the second the answer; two habits prevent it: write the new limits on the integral sign the moment $u$ appears, and check that the final bracket is a $u$ bracket with $u$ limits or an $x$ bracket with $x$ limits, never a mixture. prose — a negative constant inside the bracket changes nothing about the method: $x^{2} - 2$ at $x = 1$ is $-1$, and an odd power of a negative number is negative, so carry the sign through the subtraction.
- T3 (3 blocks): prose — converting back is still allowed: leave the limits as $x$-values, write the antiderivative in terms of $x$, and substitute those; it is the same arithmetic in a different order. `maths('\\left[\\left(x^{2} + 1\\right)^{3}\\right]_{0}^{2} = 125 - 1 = 124')`. prose — both routes must give the same number, which makes the pair a useful check when there is time; but do one or the other, because changing the variable without changing the limits is the error, and it is the one to watch for.

**Level check** `in-l3.levelCheck`, replaced wholesale, 15 entries all difficulty 2, in this order: `int-linear-bracket, int-substitution, int-by-parts, int-definite-substitution, int-linear-bracket, int-substitution, int-by-parts, int-definite-substitution, int-linear-bracket, int-substitution, int-by-parts, int-definite-substitution, int-linear-bracket, int-substitution, int-by-parts`.

**Expected on the unmutated tree:** `npx vitest run src/content/generators/generators.test.ts -t 'int-definite-substitution'` → 26 passed; oracle 3 runs 200 draws × 2 difficulties on the base generator and skips the `+choice` form. Ran here on the prototype with the suite's own Simpson loop: 400 draws, 0 disagreements.

**Test count after A: 3117 + 26 = 3143** (13 per registered generator; base and `+choice`). Commit message: `Evaluate a definite integral by substitution, changing the limits with the variable`.

**Mutation, run after the commit and before the push (section 6 explains the ordering), from the repository root:**

- M-A-oracle (must be killed): `eval/bin/mutate.sh src/content/generators/integration.ts 's/^ *const total = at(upper) - at(lower);$/    const total = at(upper) + at(lower);/' -- npx vitest run src/content/generators/generators.test.ts -t 'int-definite-substitution > agrees with quadrature'` — selects exactly one test (the `' > '` join is how vitest names a test under its describe; verified here, section 10 item 4). Applied to the prototype here: 400 quadrature disagreements, e.g. `seed 51: quadrature gives 19.000000000002 , generator claims 35`. The file's only other `const total` line (`int-definite-steps`, `= upperTerm - lowerTerm`) does not match the pattern.

### 3.2 Unit B — `int-substitution-general` and lesson `in-l3-shapes` (priority 2)

**Generator.** `type SubstitutionForm = 'cube' | 'exp' | 'sinPower' | 'cosPower'`; `interface GeneralSubstitutionParams { form: SubstitutionForm; a: number; b: number; n: number }` (`b` and `n` are 0 where the form has none).

`sample`, in order: `form = difficulty > 1 ? rng.pick(['cube', 'exp', 'sinPower', 'cosPower'] as const) : 'cube'`; then by form — cube: `a = rng.int(2, 9)`, `b = difficulty > 1 ? nonZero(rng.int(-4, 4), 2) : rng.int(1, 4)`, `n = rng.int(2, 4)`; exp: `a = rng.int(1, 9)`, `b = 0`, `n = 0`; sinPower/cosPower: `a = rng.int(1, 6)`, `b = 0`, `n = rng.int(2, 4)`. Distinct measured here: **96 at difficulty 1, 139 at difficulty 2** (difficulty 2 over 200 seeds: cube 57, exp 42, sinPower 58, cosPower 43 — all four forms well above the 86/200 rarest-branch note in the test file). Difficulty 1 is cube only, deliberately: it is the only form T1 has taught when the first three asks arrive.

`render`, with prompt one prose block `Integrate by substitution, choosing $u$ yourself.` on every form and `domain: 'real'`, `mode: 'upToConstant'` on every form:

- cube: inside `if (form === 'cube') { … }`, two locals on their own lines exactly: `      const scale = 3 * (n + 1);` and `      const shown = termTex(a, 2);`. Then `lead: \`${integralTex(\`${shown}\\\\left(x^{3} ${b < 0 ? '-' : '+'} ${Math.abs(b)}\\\\right)^{${n}}\`)} =\``, `keypad: INTEGRAL_KEYS`, `` answer: `((${a})/(${scale})) * (x^3 + (${b}))^(${n + 1})` ``, `` integrand: `(${a}) * x^2 * (x^3 + (${b}))^(${n})` ``.
- exp: `lead: \`${integralTex(\`${a === 1 ? '' : a}xe^{x^{2}}\`)} =\``, `keypad: EXP_INTEGRAL_KEYS`, `` answer: `((${a})/2) * e^(x^2)` ``, `` integrand: `(${a}) * x * e^(x^2)` ``.
- sinPower: `lead: \`${integralTex(\`${a === 1 ? '' : a}\\\\cos(x)\\\\sin^{${n}}(x)\`)} =\``, `keypad: TRIG_INTEGRAL_KEYS`, `` answer: `((${a})/(${n + 1})) * sin(x)^(${n + 1})` ``, `` integrand: `(${a}) * cos(x) * sin(x)^(${n})` ``.
- cosPower: `lead: \`${integralTex(\`${a === 1 ? '' : a}\\\\sin(x)\\\\cos^{${n}}(x)\`)} =\``, same keypad, `` answer: `((${-a})/(${n + 1})) * cos(x)^(${n + 1})` ``, `` integrand: `(${a}) * sin(x) * cos(x)^(${n})` ``.

`choices`, four per form, every option with `answer` equal in value to its `tex` (use `fracCoeffTex` for the coefficient and, for cube, `bracket = \`\\\\left(x^{3} ${b < 0 ? '-' : '+'} ${Math.abs(b)}\\\\right)\``, `inner = \`(x^3 + (${b}))\``): cube — correct `fracCoeffTex(a, 3 * (n + 1), \`${bracket}^{${n + 1}}\`) + C`; divided by $n+1$ only (forgot the 3 from $du = 3x^2\,dx$); divided by 3 only; correct coefficient on the *old* power. exp — `fracCoeffTex(a, 2, 'e^{x^{2}}')`; no halving; `x^{2}e^{x^{2}}` halved; `e^{x^{3}}` over 3. sinPower/cosPower — with `fn` the powered function and `sign` $+1$ for sinPower, $-1$ for cosPower: correct `fracCoeffTex(sign * a, n + 1, \`\\\\${fn}^{${n + 1}}(x)\`)`; sign flipped; not divided; power not raised. (Write `3 * (n + 1)` inline in `choices` — the local `scale` is `render`'s alone, so the mutation below changes the answer and nothing else.) Verified here: 1124 distractors over 400 draws, all `incorrect`; no label collisions.

`solution`, by form: (1) text naming $u$ and its derivative — cube: `` `Inside the bracket is $x^{3} ${b < 0 ? '-' : '+'} ${Math.abs(b)}$, whose derivative is $3x^{2}$, and there is an $x^{2}$ outside. Put $u = x^{3} ${…}$, so $${a}x^{2} \\, dx$ becomes $\\frac{${a}}{3} \\, du$.` ``; exp: `` `The derivative of $x^{2}$ is $2x$, and there is an $x$ outside the exponential. Put $u = x^{2}$, so $${a}x \\, dx$ becomes $\\frac{${a}}{2} \\, du$.` ``; sinPower: `` `The derivative of $\\sin(x)$ is $\\cos(x)$, which is sitting alongside it. Put $u = \\sin(x)$, so $\\cos(x) \\, dx$ becomes $du$.` ``; cosPower: the same with $u = \\cos(x)$ and `$\\sin(x) \\, dx$ becomes $-du$` (the minus is the point). (2) tex the integral rewritten in $u$: cube `` `\\frac{${a}}{3}\\int u^{${n}} \\, du = \\frac{${a}}{3} \\times \\frac{u^{${n + 1}}}{${n + 1}}` ``; exp `` `\\frac{${a}}{2}\\int e^{u} \\, du = \\frac{${a}}{2}e^{u}` ``; sinPower `` `${a === 1 ? '' : a}\\int u^{${n}} \\, du = ${fracCoeffTex(a, n + 1, \`u^{${n + 1}}\`)}` ``; cosPower the same with a leading minus. (3) tex the result back in $x$: `` `= ${<correct option tex>}` `` (the same string as the correct choice, plus ` + C`). (4) text — cube/exp: `The constant factor is no obstacle; it just sits outside. An $x$ left over after the substitution would be, and would mean the wrong $u$ was chosen.`; sinPower: `A power of $\\sin(x)$ next to $\\cos(x)$ is a power of $u$ next to $du$: it integrates exactly like $u^{n}$.`; cosPower: `Differentiating $\\cos(x)$ gives $-\\sin(x)$, so the $\\sin(x)$ in the integrand is $-\\frac{du}{dx}$ and the answer picks up a minus sign. Forgetting it is the characteristic slip with cosine.`

**Lesson** — id `in-l3-shapes`, title `Spotting the Substitution`, inserted in `in-l3.lessons` immediately after `in-l3-substitution` and before `in-l3-definite-substitution`.

```
teach(T1), ask('int-substitution-general'), ask('int-substitution-general+choice'), ask('int-substitution-general'),
teach(T2), ask('int-substitution-general', 2), ask('int-choose-method', 2), ask('int-substitution-general+choice', 2),
teach(T3), ask('int-substitution-general', 2), ask('int-substitution', 2)
skillCheck: [ask('int-substitution-general', 2), ask('int-substitution-general+choice', 2), ask('int-substitution-general', 2)]
```

- T1 (5 blocks): prose — the last lesson used one shape, $x$ outside a bracket containing $x^{2}$; the pattern is more general: substitution works whenever the integrand contains a function of $x$ alongside its derivative, up to a constant factor. `maths('\\int 4x^{2}\\left(x^{3} + 1\\right)^{2} \\, dx')`. prose — inside the bracket is $x^{3} + 1$, whose derivative is $3x^{2}$; the $x^{2}$ outside is that derivative up to the constant $3$, so $u = x^{3} + 1$, $\\frac{du}{dx} = 3x^{2}$, and $4x^{2} \\, dx = \\frac{4}{3} \\, du$. `maths('\\int 4x^{2}\\left(x^{3} + 1\\right)^{2} \\, dx = \\frac{4}{3}\\int u^{2} \\, du = \\frac{4u^{3}}{9} + C = \\frac{4\\left(x^{3} + 1\\right)^{3}}{9} + C')`. prose — the division by $3$ is the new step; it comes from $\\frac{du}{dx}$, so a cube inside the bracket means dividing by $3$ where a square meant dividing by $2$.
- T2 (5 blocks): prose — the bracket need not be a bracket: any function with its derivative alongside will do, and two cases turn up constantly. `maths('\\int xe^{x^{2}} \\, dx = \\frac{e^{x^{2}}}{2} + C')`. prose — here $u = x^{2}$: the derivative $2x$ is there up to a factor of $2$, and $\\int e^{u} \\, du$ is just $e^{u}$. `maths('\\int \\cos(x)\\sin^{3}(x) \\, dx = \\frac{\\sin^{4}(x)}{4} + C')`. prose — here $u = \\sin(x)$, because $\\cos(x)$ is its derivative, and a power of $\\sin(x)$ integrates like a power of $u$; with the roles swapped, $u = \\cos(x)$ has derivative $-\\sin(x)$, so a minus sign appears in the answer. (Keep it at five blocks; the cosine case is stated in that last sentence, before any difficulty-2 ask, and needs no display of its own.)
- T3 (3 blocks): prose — the test is always the same: pick the inner function, differentiate it, and look for that derivative in what is left over; a constant factor is no obstacle, a missing power of $x$ is fatal. prose — $\\int \\left(x^{3} + 1\\right)^{2} \\, dx$ has no $x^{2}$ outside the bracket, so substitution leaves an $x^{2}$ stranded and gains nothing; for that one, multiply the bracket out. prose — which $u$ to try is the only judgement here, and the worked solutions on every question name it; if the substitution you choose leaves any $x$ behind, it was the wrong one.

**Level check** `in-l3.levelCheck`, replaced wholesale, 15 entries all difficulty 2: `int-linear-bracket, int-substitution, int-by-parts, int-definite-substitution, int-substitution-general, int-linear-bracket, int-substitution, int-by-parts, int-definite-substitution, int-substitution-general, int-linear-bracket, int-substitution, int-by-parts, int-definite-substitution, int-substitution-general`.

**Expected on the unmutated tree:** `-t 'int-substitution-general'` → 26 passed. Note that from this unit on, `-t 'int-substitution'` matches **four** ids (52 tests); scope with the `' > '` form or the full id. Oracle 2 on the prototype here: 400 draws, 0 disagreements — including every `e^(x^2)` and `sin(x)^(n)` draw, so mathjs's derivative handles all four forms.

**Test count after B: 3143 + 26 = 3169.** Commit message: `Spot the substitution: a cube, an exponential, a power of sine or cosine`.

**Mutations after the commit:**

- M-B-oracle (must be killed): `eval/bin/mutate.sh src/content/generators/integration.ts 's/^ *const scale = 3 \* (n + 1);$/      const scale = n + 1;/' -- npx vitest run src/content/generators/generators.test.ts -t 'int-substitution-general > differentiates back'` — on the prototype: every cube draw fails, e.g. `seed 9: d/dx(((8)/(5)) * (x^3 + (-3))^(5)) is 24 * x ^ 2 * (x ^ 3 - 3) ^ 4, integrand is (8) * x^2 * (x^3 + (-3))^(4)`.
- M-B-tex (**expected to SURVIVE** — record, do not fix): `eval/bin/mutate.sh src/content/generators/integration.ts 's/^ *const shown = termTex(a, 2);$/      const shown = termTex(a, 1);/' -- npx vitest run src/content/generators/generators.test.ts -t 'int-substitution-general'` — the learner now reads $ax(x^3+b)^n$ while `answer` and `integrand` still describe $ax^2(x^3+b)^n$. All 26 tests pass on the prototype (0 failures). This is the residual of section 2, on the record; the report quotes `MUTANT SURVIVED` and says why. Do not attempt to close it here.

### 3.3 Unit D — `int-root-power` and lesson `in-l1-roots` (priority 3)

**Generator.** Module-level:

```ts
type RootForm = 'sqrt' | 'invSqrt' | 'index' | 'xSqrt' | 'invXSqrt' | 'index5';
/**
 * The index of x over 2, per form: the question is a·x^{p/2}. A table rather
 * than a derivation, so a mistyped row fails a test instead of shipping.
 */
const HALF_INDEX: Record<RootForm, number> = { sqrt: 1, invSqrt: -1, index: 3, xSqrt: 3, invXSqrt: -3, index5: 5 };
const ROOT_FORMS_1: RootForm[] = ['sqrt', 'invSqrt', 'index'];
const ROOT_FORMS_2: RootForm[] = ['sqrt', 'invSqrt', 'index', 'xSqrt', 'invXSqrt', 'index5'];
```

`interface RootPowerParams { form: RootForm; a: number }`. `sample`: `form = rng.pick(difficulty > 1 ? ROOT_FORMS_2 : ROOT_FORMS_1)`; `a = rng.int(difficulty > 1 ? 2 : 1, 12)`. Distinct measured here: **36 / 66** (every form appears at least 28/200 at difficulty 2).

Two local helpers: `shownTex(form, a)` returning, with `c = a === 1 ? '' : \`${a}\``: sqrt `\`${c}\\\\sqrt{x}\``, invSqrt `\`\\\\frac{${a}}{\\\\sqrt{x}}\``, index `\`${c}x^{3/2}\``, xSqrt `\`${c}x\\\\sqrt{x}\``, invXSqrt `\`\\\\frac{${a}}{x\\\\sqrt{x}}\``, index5 `\`${c}x^{5/2}\``; and `halfPowTex(num, den, p) = fracCoeffTex(num, den, \`x^{${p}/2}\`)`.

`render`: `const p = HALF_INDEX[form];` then on its own line exactly `    const newIndex = p + 2;` then on its own line exactly ``    const rootWriting = newIndex > 0 ? `((${2 * a})/(${newIndex})) * sqrt(x^(${newIndex}))` : `(${-2 * a})/sqrt(x)`;``. Returns `kind: 'expression'`; prompt `Integrate, for $x > 0$. Write the root as a power first.`; `lead: \`${integralTex(shownTex(form, a))} =\``; `keypad: ROOT_INTEGRAL_KEYS`; `` answer: `((${2 * a})/(${newIndex})) * x^((${newIndex})/2)` ``; on its own line exactly `      alsoAccepts: [rootWriting],`; `` integrand: `(${a}) * x^((${p})/2)` ``; `domain: 'positive'`; `mode: 'upToConstant'`. The `positive` domain is load-bearing twice over: `sqrt(x^3)` and `x^(3/2)` take different branches at negative $x$, so the promised root writing is accepted only because of this field (M-D-domain below proves it), and the question is only posed for $x > 0$ in the first place.

`choices` (recompute `q = p + 2` locally — do not name it `newIndex`): correct `halfPowTex(2 * a, q, q)` with answer `((2a)/(q)) * x^((q)/2)`; divided by the old index `halfPowTex(2 * a, p, q)`; not divided `halfPowTex(a, 1, q)`; index lowered instead of raised `halfPowTex(a * p, 2, p - 2)` — every option with its `answer`. All four distinct for every form (enumerated: `p ≠ p + 2`, `2a/(p+2) = a` only at `p = 0`, which no form has). Verified here: 1200 distractors, all `incorrect`.

`solution`: (1) text `` `Write the root as a power: $${shownTex(form, a)}$ is $${a === 1 ? '' : a}x^{${p}/2}$. Then the rule is the usual one — raise the index by one, divide by the new index.` ``; (2) tex `` `\\int ${a === 1 ? '' : a}x^{${p}/2} \\, dx = \\frac{${a === 1 ? '' : a}x^{${newIndex}/2}}{${newIndex}/2} + C` ``; (3) tex `` `= ${halfPowTex(2 * a, newIndex, newIndex)} + C = ${<root form>} + C` `` where the root form is `` `${fracCoeffTex(2 * a, newIndex, \`\\\\sqrt{x^{${newIndex}}}\`)}` `` for `newIndex > 0` (use `\\sqrt{x}` rather than `\\sqrt{x^{1}}` when `newIndex === 1`) and `` `-\\frac{${2 * a}}{\\sqrt{x}}` `` for `newIndex === -1`; (4) text — for `p > 0`: `Dividing by a fraction is multiplying by its reciprocal: dividing by $\\frac{3}{2}$ multiplies by $\\frac{2}{3}$. Check by differentiating, and the two fractions cancel back to the original coefficient.`; for `p < 0`: `` `Adding one to a negative fraction moves it towards zero, so $${p}/2$ becomes $${newIndex}/2$, and dividing by that ${newIndex < 0 ? 'negative fraction flips the sign' : 'fraction doubles the coefficient'}. Differentiate the answer to check the sign.` ``.

**Lesson** — id `in-l1-roots`, title `Roots and Fractional Powers`, inserted in `in-l1.lessons` between `in-l1-negative` and `in-l1-standard`.

```
teach(T1), ask('int-root-power'), ask('int-root-power+choice'), ask('int-root-power'),
teach(T2), ask('int-root-power', 2), ask('int-power', 2), ask('int-root-power+choice', 2),
teach(T3), ask('int-root-power', 2), ask('int-sum', 2)
skillCheck: [ask('int-root-power', 2), ask('int-root-power+choice', 2), ask('int-root-power', 2)]
```

- T1 (5 blocks): prose — the power rule was derived without assuming the index was a whole number, and it is not; a root is a fractional power, and the rule integrates it as soon as it is written that way. `maths('\\sqrt{x} = x^{1/2} \\qquad \\frac{1}{\\sqrt{x}} = x^{-1/2} \\qquad x\\sqrt{x} = x^{3/2}')`. prose — then raise the index by one and divide by the new index, exactly as before; adding one to $\\frac{1}{2}$ gives $\\frac{3}{2}$, and dividing by $\\frac{3}{2}$ is multiplying by $\\frac{2}{3}$. `maths('\\int \\sqrt{x} \\, dx = \\int x^{1/2} \\, dx = \\frac{x^{3/2}}{3/2} + C = \\frac{2}{3}x^{3/2} + C')`. prose — convert first, every time; trying to integrate a root while it is still written as a root is where the guessing starts, just as it was for fractions.
- T2 (5 blocks): prose — a root underneath a fraction is a negative fractional power and both negatives have to be carried: $\\frac{1}{\\sqrt{x}}$ is $x^{-1/2}$, adding one gives $\\frac{1}{2}$, and dividing by $\\frac{1}{2}$ doubles the coefficient. `maths('\\int \\frac{4}{\\sqrt{x}} \\, dx = \\int 4x^{-1/2} \\, dx = \\frac{4x^{1/2}}{1/2} + C = 8\\sqrt{x} + C')`. prose — $x$ multiplied by its own root is $x^{3/2}$, and $x$ under a root under a fraction is $x^{-3/2}$; adding one to $-\\frac{3}{2}$ gives $-\\frac{1}{2}$, and dividing by $-\\frac{1}{2}$ flips the sign. `maths('\\int \\frac{6}{x\\sqrt{x}} \\, dx = \\int 6x^{-3/2} \\, dx = \\frac{6x^{-1/2}}{-1/2} + C = -\\frac{12}{\\sqrt{x}} + C')`. **PROMISE, verbatim as one prose block:** `Either the index-form answer or the answer written back under a square root is accepted — the checker compares values, not the shape they are written in. So $\\frac{2}{3}x^{3/2}$ and $\\frac{2}{3}\\sqrt{x^{3}}$ are the same answer.`
- T3 (3 blocks): prose — check by differentiating, as always: $-12x^{-1/2}$ differentiates to $6x^{-3/2}$, the minus from the index cancelling the minus in front, and when the signs are right the check says so at once. prose — the index that cannot be reached is still $-1$, and $-\\frac{1}{2}$ is not it; every fractional index goes through the power rule, and $x^{5/2}$ is no different from $x^{3/2}$ except in the arithmetic of the fraction. prose — the arithmetic is the whole difficulty here; write the division by the new index out as a fraction before simplifying, and the coefficient takes care of itself.

No other new teach slide, in any unit, may contain the word `accepted`. `grep -n accepted src/content/courses/integration.ts` is empty before this unit and shows exactly one line, in `in-l1-roots`, after it.

**Level check** `in-l1.levelCheck`, replaced wholesale, 15 entries, difficulty 2 except where the current file asks `int-power` at 1: `int-antiderivative-family, int-power@1, int-power, int-sum, int-root-power, int-exponential, int-trig, int-sum, int-root-power, int-power@1, int-trig, int-exponential, int-power, int-root-power, int-antiderivative-family`.

**Expected on the unmutated tree:** `-t 'int-root-power'` → 26 passed. `accepts every other writing it promises` grades 400 writings `correct` and 400 perturbations `incorrect` on the base generator and **skips** the `+choice` form (it renders `choice`); the report says the skip is a skip. The promise guard finds **4** promises after this unit (two in `differentiation.ts`, one in `trigonometricFunctions.ts`, this one), all backed. Oracle 2 on the prototype: 400 draws, 0 disagreements; `alsoAccepts`: 400 writings, 0 failures.

**Test count after D: 3169 + 26 = 3195.** Commit message: `Integrate roots and fractional powers, converting to index form first`.

**Mutations after the commit:**

- M-D-oracle (killed): `eval/bin/mutate.sh src/content/generators/integration.ts 's/^ *const newIndex = p + 2;$/    const newIndex = p + 1;/' -- npx vitest run src/content/generators/generators.test.ts -t 'int-root-power > differentiates back'` — on the prototype every draw fails, e.g. `seed 8: d/dx(((16)/(2)) * x^((2)/2)) is 8, integrand is (8) * x^((1)/2)`. (The `alsoAccepts` writing is built from the same `newIndex`, so it stays consistent with the wrong answer and that test would **not** catch this — the kill has to come from the oracle, which is the point.)
- M-D-writing (killed by the `alsoAccepts` test): `eval/bin/mutate.sh src/content/generators/integration.ts 's/sqrt(x^(${newIndex}))/sqrt(x^(${newIndex + 1}))/' -- npx vitest run src/content/generators/generators.test.ts -t 'int-root-power > accepts every other writing'` — message of the form `seed N: promised writing ((16)/(3)) * sqrt(x^(4)) is not accepted against ((16)/(3)) * x^((3)/2) over positive`. Single quotes: the `${…}` is sed text, not shell.
- M-D-domain (killed by the `alsoAccepts` test — this is the F2-class check, prose backed by a field): `eval/bin/mutate.sh src/content/generators/integration.ts "/id: 'int-root-power'/,/^};/ s/domain: 'positive'/domain: 'real'/" -- npx vitest run src/content/generators/generators.test.ts -t 'int-root-power > accepts every other writing'` — on the prototype, every `sqrt(x^(q))` writing is rejected `over real` while oracle 2 stays green (the derivative comparison agrees on the complex values both sides take at negative $x$). Read the printed diff: exactly one `domain:` line must change, and it is inside `int-root-power`.
- M-D-promise (killed by the promise guard): `eval/bin/mutate.sh src/content/generators/integration.ts '/^ *alsoAccepts: \[rootWriting\],$/d' -- npx vitest run src/content/generators/generators.test.ts -t 'backs every promise'` — expected message quoting the PROMISE sentence and listing `int-root-power@1, int-root-power+choice@1, int-root-power@2, int-power@2, int-root-power+choice@2, int-root-power@2, int-sum@2`. The unit declares on every draw of its one form-set, so the per-form residual task 4 recorded (M-A-residual) has no analogue here: there is one declaration line, and deleting it is the whole mutation.

### 3.4 Unit C — `int-parts-log` and lesson `in-l3-parts-log` (priority 4)

**Generator.** `interface PartsLogParams { form: 'power' | 'plain'; a: number; n: number }`. `sample`, in order: `if (difficulty > 1 && rng.chance(0.3)) return { form: 'plain', a: rng.int(1, 9), n: 0 }`; else `{ form: 'power', a: rng.int(1, difficulty > 1 ? 9 : 12), n: rng.int(1, difficulty > 1 ? 4 : 3) }`. Distinct measured here: **36 / 45** (difficulty 2 over 200 seeds: plain 68, power 132). The plain form ($\int \ln x\,dx$, the $\frac{dv}{dx} = 1$ trick) is difficulty 2 only and is taught in T2, before the first difficulty-2 ask.

**`answer` and `integrand` use `log(x)`, never `ln(x)`** — `math.derivative` throws on `ln` (section 2; section 10 item 6) and oracle 2 would fail with `Cannot process function "ln" in derivative` on every draw. The learner types `ln(` from `EXP_INTEGRAL_KEYS`, which the checker evaluates through the alias; `x^2/2*ln(x) - x^2/4` grades `correct` against the `log` answer (verified, item 5).

`render`, prompt `Integrate by parts, for $x > 0$.`, `keypad: EXP_INTEGRAL_KEYS`, `domain: 'positive'`, `mode: 'upToConstant'` on both forms:

- plain: `lead: \`${integralTex(\`${a === 1 ? '' : a}\\\\ln x\`)} =\``; `` answer: `(${a}) * x * log(x) - (${a}) * x` ``; `` integrand: `(${a}) * log(x)` ``.
- power: `const m = n + 1;` then on its own line exactly `    const square = m * m;`; `lead: \`${integralTex(\`${termTex(a, n)}\\\\ln x\`)} =\``; `` answer: `((${a})/(${m})) * x^(${m}) * log(x) - ((${a})/(${square})) * x^(${m})` ``; `` integrand: `(${a}) * x^(${n}) * log(x)` ``.

`choices` (use `sq = m * m` locally, not `square`): power — `first = \`${fracTermTex(a, m, m)}\\\\ln x\``; correct `` `${first} - ${fracTermTex(a, sq, m)} + C` `` with answer as in `render`; sign flipped on the second term; `uv` only (`${first} + C`); second term divided by $m$ rather than $m^2$. plain — correct `` `${termTex(a, 1)}\\ln x - ${termTex(a, 1)} + C` ``; plus instead of minus; `uv` only; `\\frac{a}{x} + C` (differentiated instead). Every option with its `answer`. Verified here: 1200 distractors, all `incorrect`.

`solution`: (1) text `` `The logarithm is $u$: it has no standard integral to be $\\frac{dv}{dx}$, and its derivative $\\frac{1}{x}$ is as simple as a function gets. So $u = \\ln x$ and $\\frac{dv}{dx} = ${form === 'plain' ? (a === 1 ? '1' : \`${a}\`) : termTex(a, n)}$.` ``; (2) tex `` `u = \\ln x \\quad v = ${form === 'plain' ? termTex(a, 1) : fracTermTex(a, m, m)} \\quad \\frac{du}{dx} = \\frac{1}{x}` ``; (3) tex the formula applied — power: `` `${fracTermTex(a, m, m)}\\ln x - \\int ${fracTermTex(a, m, n)} \\, dx` `` (since $v \cdot \frac{1}{x} = \frac{a}{m}x^{n}$); plain: `` `${termTex(a, 1)}\\ln x - \\int ${a} \\, dx` ``; (4) tex `` `= ${<correct option tex>}` ``; (5) text — power: `` `The denominator of the second term is the square of the first, $${m}$ and $${sq}$. Writing $${m}$ for both is the common slip, and differentiating the answer catches it: the $\\ln x$ terms only cancel when the second denominator is the square.` ``; plain: `Taking $\\frac{dv}{dx} = 1$ looks like cheating and is not: $v = x$, and the $x$ cancels the $\\frac{1}{x}$ from the logarithm, leaving an integral of a constant.`

Also in this unit: append one sentence to the header comment of `src/content/generators/integration.ts`, at the end of the `∫ 1/x dx` bullet (lines 10–14), so the file's stated rule stays true: `` `int-parts-log` puts `ln x` into a typed answer, under `domain: 'positive'`, where the concern does not arise: the question is only posed for x > 0 and the probe never leaves it. `` Do not otherwise edit that comment, and in particular do not delete its (stale) claim that `∫ 1/x` is asked as a choice — that is reported, not fixed, in this task (section 0).

**Lesson** — id `in-l3-parts-log`, title `By Parts with a Logarithm`, appended to `in-l3.lessons` after `in-l3-parts`. (`in-l3-parts` ends with a comment calling its last slide "the last slide of the level"; that comment becomes stale with this lesson after it. Do not edit it — it is an existing lesson — and name it in the report as a one-line follow-up for the owner.)

```
teach(T1), ask('int-parts-log'), ask('int-parts-log+choice'), ask('int-parts-log'),
teach(T2), ask('int-parts-log', 2), ask('int-by-parts', 2), ask('int-parts-log+choice', 2),
teach(T3), ask('int-parts-log', 2), ask('int-choose-method', 2)
skillCheck: [ask('int-parts-log', 2), ask('int-parts-log+choice', 2), ask('int-parts-log', 2)]
```

- T1 (5 blocks): prose — the last lesson said the polynomial is always $u$; that rule has one famous exception, the logarithm: $\\ln x$ has no standard integral to be $\\frac{dv}{dx}$, but its derivative $\\frac{1}{x}$ is about as simple as a function gets. `maths('u = \\ln x \\quad \\frac{dv}{dx} = x \\quad \\frac{du}{dx} = \\frac{1}{x} \\quad v = \\frac{x^{2}}{2}')`. prose — so for $\\int x\\ln x \\, dx$ the logarithm is $u$ and the power of $x$ is the part to integrate, the opposite of the choice for $xe^{2x}$. `maths('\\int x\\ln x \\, dx = \\frac{x^{2}}{2}\\ln x - \\int \\frac{x^{2}}{2} \\times \\frac{1}{x} \\, dx = \\frac{x^{2}}{2}\\ln x - \\frac{x^{2}}{4} + C')`. prose — the $\\frac{1}{x}$ from differentiating the logarithm cancels a power of $x$ in the second integral, which is what makes it easy; every question here works the same way.
- T2 (5 blocks): prose — a higher power changes only the numbers: with $x^{n}$, $v$ is $\\frac{x^{n+1}}{n+1}$, and the second integral is $\\frac{1}{n+1}\\int x^{n} \\, dx$, which is $\\frac{x^{n+1}}{(n+1)^{2}}$. `maths('\\int x^{2}\\ln x \\, dx = \\frac{x^{3}}{3}\\ln x - \\frac{x^{3}}{9} + C')`. prose — the denominator of the second term is the square of the first: $3$ and $9$, $4$ and $16$; writing $\\frac{x^{3}}{3}$ for both is the common slip, and differentiating the answer catches it, because the $\\ln x$ terms cancel only when the second denominator is the square. `maths('\\int \\ln x \\, dx = x\\ln x - \\int x \\times \\frac{1}{x} \\, dx = x\\ln x - x + C')`. prose — even $\\ln x$ on its own goes by parts, with the trick of taking $\\frac{dv}{dx} = 1$; nothing else integrates $\\ln x$, and the result is worth remembering as a standard one.
- T3 (3 blocks): prose — differentiate $x\\ln x - x$ to see that it works: the product rule gives $\\ln x + 1$, and the $-x$ takes the $1$ away. prose — so the choice of $u$ has two rules, not one: a polynomial is $u$ against an exponential or a trigonometric function; a logarithm is $u$ against anything; both say the same thing, choose the factor that differentiates into something simpler. prose — these questions are only posed for $x > 0$, where $\\ln x$ is defined. (That is a statement about the mathematics, true whatever any field says; do **not** write a sentence about where "the checker probes" — that would be prose true only because of `domain`, the F2 class, with no test to back it.)

**Level check** `in-l3.levelCheck`, replaced wholesale, 15 entries all difficulty 2: `int-linear-bracket, int-substitution, int-by-parts, int-definite-substitution, int-substitution-general, int-parts-log, int-linear-bracket, int-substitution, int-by-parts, int-definite-substitution, int-substitution-general, int-parts-log, int-linear-bracket, int-definite-substitution, int-substitution-general`.

**Expected on the unmutated tree:** `-t 'int-parts-log'` → 26 passed; oracle 2 runs 400 draws on the base generator (0 disagreements on the prototype here, including every `plain` draw).

**Test count after C: 3195 + 26 = 3221.** Commit message: `Integrate a power of x times ln x by parts, with the logarithm as u`.

**Mutation after the commit:**

- M-C-oracle (killed): `eval/bin/mutate.sh src/content/generators/integration.ts 's/^ *const square = m \* m;$/    const square = m;/' -- npx vitest run src/content/generators/generators.test.ts -t 'int-parts-log > differentiates back'` — on the prototype every power draw fails, e.g. `seed 25: d/dx(((8)/(4)) * x^(4) * log(x) - ((8)/(4)) * x^(4)) is x ^ 3 * (8 * log(x) - 6), integrand is (8) * x^(3) * log(x)`.

## 4. Reused versus new

Reused, unchanged: `int-definite-steps` (reduce) and `int-definite-steps+choice` (evaluate), `int-substitution` (expression), `int-choose-method` (flow), `int-by-parts` (expression), `int-power` and `int-sum` (expression), and every generator already in the two level checks. Every reused reference's kind set at its asked difficulty was computed here from the registry (section 10, item 8).

New: `int-definite-substitution` (+choice), `int-substitution-general` (+choice), `int-root-power` (+choice), `int-parts-log` (+choice). Eight new registry ids; 224 → 232. Typed answer forms: a whole number (as `int-definite-power`), a coefficient-and-power expression through `^`, `/` and `sqrt(` (the fraction and root templates serialise as `((2)/(3))` and `sqrt(x^3)`, which grade correct against the index-form answers — verified, section 10 item 5), `e^(x^2)`, `sin(x)^4`, and `ln(x)` from the `ln(` key.

### 4a. Blast radius of the level-check growth — stated explicitly

`in-l3:check` grows 12 → 15 with unit A and `in-l1:check` grows 12 → 15 with unit D. Progress is keyed by those ids, so the owner's stored best on each is **retired** the next time that check is played — the home screen shows only the new run, never "11/15". That is `src/store/progress.ts` doing what its test `retires a best set against a smaller total when the check grows` asserts, and it is visible to the owner on exactly those two checks. Units B and C change the contents of `in-l3:check` but not its total, so cause no further retirement. `in-l2:check` and every existing lesson's skill check are untouched; the four new lessons have no stored record to retire. Say all of this in the final report.

## 5. Constraints and the tests that catch each

All in `/home/user/Maths-Trainer/src/content/generators/generators.test.ts` unless stated.

| Constraint | Caught by |
| --- | --- |
| The answer is *right*, not merely self-consistent | **Oracle 3** (`agrees with quadrature`) for unit A; **oracle 2** (`differentiates back to the integrand`) for B, D, C. M-A/B/C/D-oracle prove each fires on its generator |
| `answer` is something `math.derivative` can differentiate (no `ln`) | Oracle 2 itself: it throws, and a throw is a failing test, on the first draw |
| A definite answer is a plain number | Oracle 3's `non-numeric answer with limits` assertion |
| The promised root writing is accepted, and its perturbation is not | `accepts every other writing it promises` (unit D; skips A, B, C and every `+choice`) |
| That promise is true because of `domain: 'positive'`, not by luck | The same test under M-D-domain (killed) |
| Every `accepted` sentence has a declaring generator behind it | `backs every promise that another writing is accepted` (M-D-promise) |
| Every backslash doubled; every fragment valid TeX | `renders every piece of TeX it emits` (generated), `renders every authored TeX fragment without error` (lessons, `strict: 'error'`) |
| No backslash-stripped `sin`, `cos`, `ln`, `frac`, `sqrt`, `left`, `right`, `times`, `quad` inside maths | `never lets a TeX command lose its backslash` and the `BARE_TEX_COMMAND` check in the generated sweep |
| Prose markup paired; no `\uXXXX` | the two prose guards |
| The answer is what the checker accepts and a perturbed one is rejected | `produces an answer its own checker accepts`, `rejects a perturbed answer` (perturbs by `+ x` in `upToConstant`) |
| Distractors wrong, labels distinct, exactly one correct | `offers exactly one correct option, and distractors that are really wrong` |
| ≥25 distinct questions per difficulty | `can ask more distinct questions than a lesson has slides` — predicted 48/112, 96/139, 36/66, 36/45 |
| Solutions exist and vary | `always offers a worked solution`, `varies its worked solution with the question` |
| 9–11 guided slides, first a teach, exactly 3 skill-check, no teach in a skill check | the four lesson-shape tests |
| Level check 10–15, valid ids, no repeats across 40 seeds | `gives every level check 10 to 15 questions`, `never repeats a question inside a level check` (an unknown id throws inside it — PITFALLS §2.4) |
| No repeated question in a lesson | `never asks the same question twice in one sitting` |
| No run of 3 with a common kind; ≥2 kinds per lesson | the two shape guards — all four decks simulated green here (section 10, item 8) |
| Display TeX matches the declared `integrand` | **No test.** M-B-tex survives to say so; the advisor checks it by eye per form, and the report records that it did |
| Stored bests retire on a changed total | `src/store/progress.test.ts` |
| Real type errors | `npx tsc --noEmit -p tsconfig.app.json` after every unit |
| Lint | `npm run lint`: 0 errors, 25 warnings, unchanged |
| Test count moves by exactly +26 per unit | the count itself: 3143 → 3169 → 3195 → 3221 |
| Diff confined to the two content files plus the log (plus the report, last commit only) | Nothing catches this; `git diff --stat $(git merge-base HEAD origin/main)` before each commit |
| `eval-advisor.log` only grows | `git diff --stat` shows insertions only (PREFLIGHT) |

## 6. Working loop per unit (A, then B, then D, then C)

`mutate.sh` refuses a file with uncommitted changes (exit 2), and every mutation in section 3 targets one of the two files the unit itself edits. So **the mutation proofs run after the unit's commit and before its push**. A surviving gate mutation blocks the push, not the commit.

1. Write the generator; append it to `integrationGenerators`. `npx vitest run src/content/generators/generators.test.ts -t '<generator id>'` green at 26 (the `-t` regex matches the `+choice` form too; never put `+choice` in a `-t` pattern — `+` is a quantifier there; and after unit B, `-t 'int-substitution'` matches four ids).
2. Write the lesson and its level-check edit.
3. `npm test` (count exactly as predicted), `npx tsc --noEmit -p tsconfig.app.json` (silent), `npm run lint` (0 errors, 25 warnings). After the last unit only: `npm run build`.
4. `git diff --stat $(git merge-base HEAD origin/main)` shows only `src/content/generators/integration.ts`, `src/content/courses/integration.ts`, `eval-advisor.log`.
5. Consult the advisor on this unit's diff only, with `model: "opus"` passed on the Agent call, and wait for it to **return** before committing. Ask it specifically to check, per form, that the lead TeX and the `integrand` string describe the same function (section 2's residual). Read `eval-advisor.log`, append (question, summary, the advisor's self-reported model quoted verbatim — and both strings if it disagrees with its harness label — gate numbers, and the previous unit's mutation outputs where they are not yet logged); never write the file. `git diff --stat -- eval-advisor.log` shows insertions only.
6. `git add src/content/generators/integration.ts src/content/courses/integration.ts eval-advisor.log` **in one command**, so the consultation's entry is inside the commit it covers. Commit with the message given, ending with the attribution lines your session's system reminder specifies.
7. Run every mutation listed for the unit, from the repository root. Each gate mutation must print `mutant killed`; M-B-tex must print `MUTANT SURVIVED` and is recorded, not fixed. Read each printed diff and confirm it changed only the intended line. `git status --short` is empty after each. Save every harness output verbatim for the report.
8. If every gate mutation was killed: `git push origin week/task6-integration`. If one survived, do not push: the check could not fail. If the generator or lesson is at fault, fix it in a new commit with its own consultation, re-run, then push.
9. After the last unit, one final **bookkeeping** commit: `eval/reports/TASK6-REPORT.md`, plus an append to `eval-advisor.log` carrying the last unit's mutation outputs and a logged statement that no consultation was held for this commit and why (PREFLIGHT: bookkeeping commits get mechanical checks — insertions-only on the log, arithmetic that adds up, scope matching the file list — not a consultation, and the absence is logged so it is distinguishable from a gap). Push it.

**When a gate goes red** outside what section 3 predicts: read the failure, reproduce it on its seed, decide from the numbers which side is wrong. The fix is always in sampling or a filter — narrow a range, exclude a value, route an option through the same formatter. It is never: deleting or blanking a distractor's `answer`, dropping `integrand` or `limits`, changing `domain` or `mode`, editing anything under `src/engine/`, editing `generators.test.ts` in any way, trimming a sample count or timeout, or rewriting `answer` into a form the oracle cannot differentiate. If you believe the test itself is wrong: stop, leave the tree uncommitted, and report the seed and both expressions.

**Refusing or amending this plan.** You may decline any step here that you find wrong, and you should — a plan written cold can be wrong about the tree, and task 5's was. But an unlogged refusal is indistinguishable from a step nobody ran. So **log a refusal like a step**: append to `eval-advisor.log` the step refused, the reason, and what you did instead, in the commit where the deviation lands (or the final bookkeeping commit if it lands nowhere), and say the same in the report under its own heading. The plan file itself is never edited.

## 7. Done

- `src/content/courses/integration.ts` has 17 lessons; `grep -n "^          id: '"` lists them in the order in the block below (or the subset the stop rule allowed); level checks 15/12/15.
- `grep -n "id: 'int-" src/content/generators/integration.ts` shows the four new ids; the report names them from the grep, not from memory.
- `grep -n accepted src/content/courses/integration.ts` → exactly one line, in `in-l1-roots` (none if unit D was dropped).
- Every gate mutation killed by the named test, with the failing test's name and message quoted; M-B-tex survived and is reported as such, with why.
- Per unit, the oracle it is under and the field carrying it, as section 2's table states, confirmed from the code by grep (`grep -n "integrand:\|limits:\|alsoAccepts:" src/content/generators/integration.ts`), with the counts: 15 `integrand:` (11 + 4), 4 `limits:` (3 + 1), 1 `alsoAccepts:`.
- `npm test` 3221 (or 3143 / 3169 / 3195 per the stop rule), `tsc` silent, lint 0 errors / 25 warnings, `npm run build` passes on the pushed tree; `git status` clean; branch pushed; `main` untouched locally and remotely.
- The report states the two retirements of section 4a, the stale `ln` comment of section 0 with its line numbers, and the stale "last slide of the level" comment of section 3.4, and asks the owner to open the four lessons on the phone once merged: the $\cos(x)\sin^{n}(x)$ leads and the $\frac{a}{x\sqrt{x}}$ leads are the surfaces most likely to wrap badly at 393 px, and no test sees layout.
- The report carries its counted claims in a fenced ```counts``` block with the same six keys as the block below, and every "N lessons" in its prose is a number the tree actually has (a course total, a level total, or the grand total) — write "four new lessons" in words rather than digits, since the reconciler's prose sweep reads `4 lessons` as a claim. **Do not run `eval/bin/counts.sh` on your own report as a gate** (PREFLIGHT); you may run it to find your own mistakes, but its exit code is not evidence in the report. The orchestrator runs it at stage 6 with their own suite log.

**The prediction below is frozen.** If the tree lands elsewhere — an advisor finding adds a generator test, a unit is dropped, a lesson id changes — the report explains the difference, line by line, and this file is left exactly as it is. Task 5's plan went stale by six tests and its report said so; that is the precedent. A plan edited green after the fact is a check that cannot fail.

```counts
course: src/content/courses/integration.ts
lessons: 17
lesson-ids: in-l1-antiderivatives, in-l1-powers, in-l1-sums, in-l1-negative, in-l1-roots, in-l1-standard, in-l2-definite, in-l2-lines, in-l2-area, in-l2-properties, in-l2-below, in-l3-brackets, in-l3-substitution, in-l3-shapes, in-l3-definite-substitution, in-l3-parts, in-l3-parts-log
level-checks: 15/12/15
generators: int-definite-substitution, int-definite-substitution+choice, int-substitution-general, int-substitution-general+choice, int-root-power, int-root-power+choice, int-parts-log, int-parts-log+choice
tests: 3221
```

## 8. Risks, each classified — (a) caught by an existing check, (b) catchable by a check that does not yet exist, (c) rule only

| Risk | Handling | Class |
| --- | --- | --- |
| A generator's answer is wrong but self-consistent | Oracle 2 or 3, gated on a field each unit declares; M-*-oracle proves each fires | (a) |
| A generator forgets `integrand`/`limits` and the oracle skips silently (PITFALLS §2.2) | Section 7's grep counts: 15 / 4 / 1 | (c) — **(b)** trivially: a test asserting every `int-*` expression slide declares `integrand`; not in scope, name it in the report |
| The display TeX and the `integrand` disagree | M-B-tex survives; advisor reads per form | **(b)** only by parsing TeX, which is not worth building; (c) in practice |
| Unit C's `answer` written with `ln` | Oracle 2 throws on the first draw | (a) |
| Unit D's promise true only through `domain` | M-D-domain: the `alsoAccepts` test kills the flip | (a) — the class WEEK.md calls F2, now with a check |
| A run of three same-shape questions, at the asked difficulty | The repaired guards; decks simulated green here | (a) |
| The de-duplicator runs out of draws | Pools 36–139; the floor test and the 40-seed duplicate sweep | (a) |
| TeX: a stripped backslash or an invalid fragment | KaTeX strict sweep + denylist; all 97 authored fragments verified here | (a) |
| `-t` pattern with `+` matches nothing and reads as green; `-t 'int-substitution'` now over-matches | Never pass `+choice` to `-t`; use the `' > '` form; vitest reports `no tests found`, which is not a pass, but read it | (c) |
| Difficulty-2 answers in unit A up to 57122 — large to type on a phone | Bounded by design (`upper ≤ 3`, `m ≤ 2`, `n ≤ 3` at difficulty 2); the lesson's arithmetic is powers of small integers | (c) — if it bites the owner, narrow `upper` at difficulty 2, a sampling fix |
| A mutation's sed matches more or fewer lines than intended | Every expression dry-run here against the prototype; the harness prints the diff and refuses a no-op; the `^};` range end for M-D-domain depends on generator objects closing at column 0 | (a) for a no-op (exit 2); (c) for an over-match — read the printed diff |
| A mutation left in the tree | The harness's EXIT trap; `git status --short` after each run | (a) |
| Advisor consulted after the commit, or on an accumulated diff, or its entry landed in a later commit | One consultation per unit, returned before the commit, entry `git add`ed with the code | (c) today; the commit-inclusion check at stage 6 is the instrument |
| `eval-advisor.log` overwritten | Append only; `git diff --stat` shows insertions only | (c) today; (b) trivially |
| Diff scope creep (a "fix" to the stale `ln` comment, a helper moved into `calculus.ts`, the "last slide" comment) | `git diff --stat` before each commit; the file list in section 0; the two comments reported, not fixed | (c) |
| The report's counts diverge from the tree (the second class in WEEK.md) | The `counts` block, reconciled at stage 6 by the orchestrator with their own log — not by the executor | (a), provided the executor does not self-gate |
| Session budget | Fixed order; C and D droppable; each unit is one generator, one lesson, a ~90–140 s suite and one to four scoped harness runs | (c) |
| Layout on the phone | Nothing in the container; flagged for the owner | (c) |

## 9. Defect classes from `eval/WEEK.md` ("something that looks like verification and isn't"), checked against this plan

1. **Prose promising what only a field upholds.** One promise is made, on purpose, in unit D, and it is true *because* of `domain: 'positive'` — which is exactly why it is declared through `alsoAccepts` and why M-D-domain is required in the deliverable: the field is now load-bearing under a test, not under luck. Unit C was drafted with a sentence about "where the checker probes" and it was **removed** for being this class with no test behind it; T3 states the mathematics instead. No other new sentence uses `accepted`.
2. **A check that cannot fail.** Every oracle is proved able to fail on its own generator by a named mutation, scoped with `' > '` to the single oracle test so the kill cannot come from a self-consistency test by accident. M-B-tex is included precisely because it *cannot* be caught, so the record shows a survival where one is expected rather than an absence.
3. **A sample presented as a sweep.** Distinct-question floors were measured over 600 seeds (the test's own count) on prototypes with the exact sampling specified; the oracle runs here sweep the same 200 × 2 draws the suite uses; option-distinctness claims in unit D are enumerations over the six forms; the shape simulation used the repaired rule's intersection over kind sets computed from the registry at the asked difficulty.
4. **Checked a different condition than the one that ships.** The prototype oracles here replicate the suite's own loops — `math.derivative` then `checkAnswer(..., mode: 'exact')`, and Simpson with 1000 steps and the `1e-6 · max(1, |c|)` tolerance — rather than a looser stand-in; and the executor's proof is the suite itself under `mutate.sh`, not the prototype.
5. **The account diverging from the work** (the second class). Counted claims go in the `counts` block; ids are reported from grep; the plan's prediction is frozen and any deviation is explained in the report.

## 10. Verified in this container (Node v22.22.2, vitest 5.0.0, vite-node 6.0.0, GNU sed 4.9), with the command

Scratch scripts were run with `npx vite-node <scratchpad>/…ts`, importing only from `/home/user/Maths-Trainer/src/…` and `katex` by absolute path under the repo's `node_modules`. No repository file was modified; `git status --short` was empty throughout.

1. Baseline on `main` at `6da9fc7`: `npx vitest run` → `Tests 3117 passed (3117)`, 7 files, 91.46 s, exit 0. `npx tsc --noEmit -p tsconfig.app.json` → silent, exit 0. `npm run lint` → 25 lines matching ` warning `, 0 errors. Registry 224, lessons 101 (a vite-node script importing `registeredGenerators` and `courses`). None of the eight new ids is in the registry.
2. Course facts: `grep -n "^          id: '" src/content/courses/integration.ts` → the 13 ids the brief lists, 5/5/3; `grep -c "integrand:"` → 11, `grep -c "limits:"` → 3, `grep -c "source:"` → 0 — the brief's numbers hold. The brief's "17 `int-*` generators" does not: `grep -n "id: 'int-"` → **15** base ids (the brief may have been counting something else; the registry has 15 base + their choice forms).
3. Per-generator test count: `npx vitest run src/content/generators/generators.test.ts -t 'int-power'` → `26 passed | 2903 skipped` — 13 per generator, base and `+choice`.
4. `-t` scoping: `-t 'int-power > differentiates back'` → **1 passed** (the base only; the `+choice` id does not match); `-t 'int-power.*differentiates back'` → 2; `-t 'int-power differentiates back'` (plain space) → **0 selected**, so do not use that form; `-t 'differentiates back'` → 224 (every generator). `-t 'int-substitution'` → 26 today.
5. Checker, on the strings the widget serialises (`src/ui/mathInput.tsx`: fraction `((a)/(b))`, root `sqrt(...)`; not driven headlessly — see below): `x^2/2*ln(x) - x^2/4` and `((x^2)/(2))*ln(x) - ((x^2)/(4)) + C` vs `((1)/(2)) * x^(2) * log(x) - ((1)/(4)) * x^(2)` over `positive`/`upToConstant` → correct; `x*ln(x) - x` vs `(1) * x * log(x) - (1) * x` → correct, `x*ln(x) + x` → incorrect; `sin(x)^4/4`, `((sin(x)^4)/(4))`, `-cos(x)^3/3`, `e^(x^2)/2`, `((e^(x^2))/(2))+C`, `((4*(x^3+1)^3)/(9))` → correct against the unit-B answers; `((2)/(3))*sqrt(x^3)`, `((2)/(3))*x^((3)/(2))`, `((2*x^(3/2))/(3))`, `8*sqrt(x)`, `-12/sqrt(x)` → correct against the unit-D answers over `positive`; **`((2)/(3))*sqrt(x^3)` over `real` → incorrect** (the domain is load-bearing); `124` vs `124` exact → correct, `-124` → incorrect.
6. mathjs: `math.derivative('x*ln(x)', 'x')` **throws** `Cannot process function "ln" in derivative`; `math.derivative('((3)/(3)) * x^(3) * log(x) - ((3)/(9)) * x^(3)', 'x')` → `3 * x ^ 2 * log(x)`.
7. KaTeX (`throwOnError: true, strict: 'error'`): all 17 display strings quoted in section 3 and 80 inline fragments render; none matches `BARE_TEX_COMMAND`. 97 fragments, 0 bad. Generated leads such as `\int 2\cos(x)\sin^{2}(x) \, dx =` and `\int \frac{5}{x\sqrt{x}} \, dx =` render under the same settings.
8. Prototype generators with the exact sampling in section 3, 600 seeds per difficulty: `int-definite-substitution` 48 / 112; `int-substitution-general` 96 / 139 (difficulty 2 forms over 200 seeds: cube 57, exp 42, sinPower 58, cosPower 43); `int-parts-log` 36 / 45 (plain 68 / power 132 at difficulty 2); `int-root-power` 36 / 66. All four render `expression` only at both difficulties; each `+choice` renders `choice`. Suite-identical oracle loops over 200 × 2 draws: A — 400 quadrature agreements; B, D, C — 400 differentiate-back agreements each; D — 400 promised writings accepted and 400 perturbations rejected; distractors 1564 / 1124 / 1200 / 1200 all `incorrect`; self-accept and `+ x` perturbation green throughout. Shape guards, the repaired rule reimplemented over kind sets (reused generators from the registry at the asked difficulty, new ones from the prototypes) on all four planned decks: no whole-lesson common kind, no run offender.
9. Mutations, applied by the exact sed expressions of section 3 to a copy of the prototype and run through the same loops: M-A-oracle → 400 quadrature failures; M-B-oracle → every cube draw fails oracle 2; **M-B-tex → 0 failures (survives, as intended)**; M-C-oracle → every power draw fails oracle 2; M-D-oracle → every draw fails oracle 2, none fails `alsoAccepts`; M-D-writing → every draw fails `alsoAccepts`; M-D-domain → every draw fails `alsoAccepts` and none fails oracle 2; M-D-promise → the sed deletes exactly one line (the harness here has no promise guard; the kill is by the suite's guard, which task 4's M-A-promise proved fires on exactly this shape). Each sed changed exactly the intended line. `grep -n "const total\|const scale\|const shown\|const square\|const newIndex\|rootWriting" src/content/generators/integration.ts` today matches only `const total = upperTerm - lowerTerm;` (line 608), which none of the anchored patterns match.
10. `src/store/progress.test.ts` contains `retires a best set against a smaller total when the check grows`. `grep -rn accepted src/content/courses/*.ts` → exactly three lines today (two in `differentiation.ts`, one in `trigonometricFunctions.ts`); none in `integration.ts`. `eval/bin/counts.test.ts` reconciles against a fixture snapshot, not the live tree, so adding lessons does not break it.

**Not verified here — for the executor:** the widget's serialisation of `ln(` and of the root template on a real keypad (`mathInput.tsx` was read, not driven; item 5 tested the strings it appears to produce); the exact wording of vitest's failure output for each kill (the messages above are the `expect` messages as written in the test file, with prototype values substituted); that `npx vite-node` and `npx vitest` behave identically in the executing container (they did here and in tasks 4 and 5); that the real generators reproduce the prototype counts exactly (the sampling is specified to make them; the floor test decides); that every generator object in the executor's file ends with `};` at column 0, which M-D-domain's range relies on (true of every generator in the file today — read the diff the harness prints); and the promise guard's exact message for M-D-promise.

### Critical files
- /home/user/Maths-Trainer/src/content/generators/integration.ts (edited: four generators, two helpers, one header-comment sentence)
- /home/user/Maths-Trainer/src/content/courses/integration.ts (edited: four lessons, two level checks)
- /home/user/Maths-Trainer/eval-advisor.log (append only)
- /home/user/Maths-Trainer/eval/reports/TASK6-REPORT.md (new, final bookkeeping commit)
- /home/user/Maths-Trainer/eval/bin/mutate.sh (run, never edited)
- /home/user/Maths-Trainer/src/content/generators/generators.test.ts (read only, never edited)
- /home/user/Maths-Trainer/src/content/generators/calculus.ts, /home/user/Maths-Trainer/src/content/choiceVariant.ts, /home/user/Maths-Trainer/src/engine/expression.ts, /home/user/Maths-Trainer/src/store/progress.ts (read only)
- /home/user/Maths-Trainer/eval/PREFLIGHT.md, /home/user/Maths-Trainer/eval/FLOW.md, /home/user/Maths-Trainer/CLAUDE.md, /home/user/Maths-Trainer/PITFALLS.md (binding)
