<!-- Provenance: written by Fable 5.1 (planner), verbatim except for this header.
Task 7 of the week of real use; see ../WEEK.md and ../FLOW.md. Anchor: `0b780bb`
on `main`, "Record task 6: a prediction that landed, and the class moving somewhere
unchecked". Every number below marked "measured here" was produced in this checkout
at that commit, with the command named in section 10. -->

# Plan: task 7 — Complex Numbers: new question shapes, surd answers, and a skill check that only tests what was practised

Task 7 of the week of real use. Executor starts cold; this text is the whole brief. Read alongside `/home/user/Maths-Trainer/eval/PREFLIGHT.md` (binding), `/home/user/Maths-Trainer/CLAUDE.md` (binding) and `/home/user/Maths-Trainer/PITFALLS.md` (binding: Part 2 §2.6, Part 3 §3.9, §3.10, §3.11, §3.12, and the pre-flight checklists). The anchor above must be an ancestor of your checkout's `HEAD` (`git merge-base --is-ancestor 0b780bb HEAD` exits 0). If it is not, stop and report rather than adapt.

This is the first task of the week that comes from the owner using the app rather than from a backlog. Their report, verbatim, is the thing every unit below answers to:

> "the questions are still too similar in nature. And also some lessons have questions about topics that aren't even practiced in that lesson. For example, the 'modulus' lesson has a question about conjugates in it's skill check, but that technique isn't practiced at all anywhere else throughout that lesson. But the lesson contains ~8 questions on calculating the modulus using Pythagoras's Theorem, and these are repetitive in nature, only changing the numbers, but not the style of the question/answer format. The figures are also unrealistic for mental calculation (35^2 + 12^2)^(1/2) is not something that is realistically calculable without the use of a calculator, or the ability to enter the answer in that format c=sqrt(a^2+b^2) without needing to calculate the exact number answer"

## 0. The scoping decision (read this first)

**Four owner decisions are settled. Do not re-open them.**

1. **Scope of the variety work: all of Complex Numbers** (14 lessons, 4 levels). Not the whole repository.
2. **A skill check that tests a skill the lesson never practised is always a defect.** It becomes a test, repo-wide.
3. **Surd answers are allowed:** `|2 + 3i| = √13`. This is the root-cause fix for the arithmetic complaint.
4. **"Variety" means new question shapes for the same skill** — working backwards, comparing, applying — not more numbers and not fewer questions.

**Two things I am adding, both scoped deliberately:**

- **Fix every stray skill check repo-wide, but do the variety work only in Complex Numbers.** The containment test (unit 0) fails on 17 lessons at the anchor, six in Complex Numbers and eleven outside it. The eleven outside are **id swaps only** — one `ask(...)` replaced per lesson, twelve lines in all (`df-l4-exp` has two strays) — and they are all in unit 0 so the test is green from its first commit. Their decks are not otherwise touched.
- **Make the repetition outside Complex Numbers countable, not fixed.** Measured here, **83 of 105 lessons** have one generator family supplying at least 70% of at least five guided questions (the brief said 82; the family rule in section 2 is the one that gives 83 — the scan is the canonical count from now on). Unit 0 ships `eval/bin/variety.sh`, a report the owner can re-run, and its numbers go in the report before and after. The 73-odd lessons outside this course stay as they are.

**One hard constraint splits the surd change.** `modulus-steps` is a `reduce` slide over `src/content/expr.ts`, whose `valueOf` rounds every root, log and trig value to a whole number on purpose (lines 137–139, 149–151, 155–158, each commented "every value in these questions is meant to be whole"), and the suite asserts every bank value is whole. **So `modulus` (the typed slide) takes surds and `modulus-steps` keeps `TRIPLES` unchanged.** That is not a compromise: the steps slide is the one place where a clean triple still earns its place, because its point is the order of operations — square, square, add, *then* root — and a whole-number root is what lets the last tap land on a bank of integers. The lesson keeps one `modulus-steps` ask for exactly that reason (section 3.1).

**Files that change**, all under `/home/user/Maths-Trainer/`:

| File | Units |
| --- | --- |
| `src/content/generators/generators.test.ts` | 0 only — **one `it` added**, nothing else ever |
| `src/content/choiceVariant.ts` | 0 only — one exported function, `familyOf` |
| `eval/bin/variety.ts`, `eval/bin/variety.sh` | 0 only — new |
| `src/content/courses/differentiation.ts`, `trigonometricFunctions.ts`, `vectors.ts` | 0 only — id swaps in `skillCheck` arrays |
| `src/content/courses/complexNumbers.ts` | 0 (swaps), then 1–6 (decks) |
| `src/content/generators/format.ts` | 1 — surd helpers |
| `src/content/generators/complexPlane.ts` | 1, 2, 3, 6 |
| `src/content/generators/complexArithmetic.ts` | 2, 4 |
| `eval-advisor.log` | every commit, append only |
| `eval/reports/TASK7-REPORT.md` | final bookkeeping commit only |

Nothing else. In particular: nothing under `src/engine/`, `src/ui/`, `src/store/`, `src/content/expr.ts`, `src/content/registry.ts` (new generators register through the existing arrays), no level check anywhere, no other course's guided deck, no `eval/*.md`, no `CLAUDE.md`/`PITFALLS.md`, and this plan is never edited. `git diff --stat $(git merge-base HEAD origin/main)` before every commit must list only files in the table.

**One destination.** `week/task7-complex-variety`, branched from `main` at the anchor. `git branch --show-current` must print it, and must not print `main`, before the first push. Every unit is `git push origin week/task7-complex-variety`. Never `main`, never a pull request. Nothing deploys from this branch.

**Stop rule.** Units run in the fixed order 0, 1, 2, 3, 4, 5, 6. **Complete = all seven. Acceptable = 0 through 3.** Unit 5 depends on unit 3 (it reuses `power-reverse`); if 3 is dropped, 5 is dropped. Unit 6 is independent. Never start a unit you cannot finish, gate, prove and push. Fewer lessons reshaped properly beats seven half-done; if the session ends after unit 3, the report says so and the frozen counts block in section 7 is explained, not amended.

**Deferred, on purpose, and to be named in the report:**

- **Level checks are untouched**, so every stored best survives (no F1-class retirement) and the owner's `cn-l3:check` will now serve surd-answer `modulus` questions — that is the surd decision applied, not a regression, and the report should say it. Measured here: 16 level-check questions across `tf-l2`, `tf-l3`, `df-l2`, `df-l3`, `df-l4` ask a family no lesson in that level practises (section 10, item 4). Whether a level check may draw on earlier levels is the owner's call, not this task's; the scan reports the number.
- `SQRT_KEYS` in `complexPlane.ts` still offers a `)` key beside `√(`. Since `applyKey` in `src/ui/slides.tsx:149` turns `sqrt(` into a root *template*, the `)` key inserts a stray atom that would make `sqrt(13))` unparseable. Not changed here (it is a visible-surface change with no browser in this container); flagged for the owner.
- The 73-odd repetitive lessons outside Complex Numbers.

## 1. Before writing anything

1. `command -v node || export PATH="$HOME/.local/node/bin:$HOME/.local/gh/bin:$PATH"` (no-op in a cloud container; here node was `/opt/node22/bin/node` v22.22.2).
2. Work only from the checkout you have been given. Do not consult any other branch and do not run `git log --all`.
3. `git status --short` is empty; `git rev-parse --short HEAD` and `git merge-base --is-ancestor 0b780bb HEAD` agree with the anchor; then `git checkout -b week/task7-complex-variety` and `git branch --show-current` prints it.
4. If `node_modules` is absent, `npm install`, then `git checkout -- package-lock.json` before any diff.
5. Read in full: `eval/PREFLIGHT.md`; `CLAUDE.md`; `PITFALLS.md` (the sections named above); `src/content/generators/complexPlane.ts` (710 lines — you are extending it; note `RANGE`, `samplePlanePoint`, `SQRT_KEYS`, `paren`, `TRIPLES`, `polarForm`'s sort-by-tex choice pattern at lines 481–494, and `powersOf` from `./format`); `src/content/generators/complexArithmetic.ts` (234 lines); `src/content/generators/format.ts` (68 lines — `complexTex`, `complexAnswer`, `bracketedTex`, `mulComplex`, `powersOf`, `nonZero`, `I_KEY`); `src/content/generators/plane.ts` (`complexPlaneSvg(range, points)`, `rangeFor`); `src/content/courses/complexNumbers.ts` (623 lines — the `teach`/`ask`/`plane` helpers and the lesson voice: short paragraphs, British spelling, `**bold**` and `$maths$` only); `src/content/choiceVariant.ts` (`options()` dedups distractors by `tex` and does not cap the count; `promptFrom` lifts an expression lead into the derived choice prompt and drops a single-letter lead); `src/content/types.ts` (the `plot`, `choice`, `expression` slide shapes; `alsoAccepts`); `src/engine/rng.ts` (`int`, `pick`, `sample`, `shuffle`, `sign`, `chance` — `sample` is `shuffle(items).slice(0, n)` and throws when `n > items.length`); `src/content/generators/generators.test.ts` in full, especially lines 39–48, 408–437 (the distractor test), 489–532 (`alsoAccepts`), 623–640 (the 25-question floor), 669–1088 (course integrity — the new test goes here), 837–867 (the promise guard, which reads the word `accepted` in teach prose); `eval/bin/counts.sh`, `counts.ts` and `countsCore.ts` (`scriptArgs` is the argv helper `variety.ts` reuses); `eval/bin/mutate.sh` in full.
6. Measure the baseline yourself and record it in the report. Measured here on `main` at the anchor: `npx vitest run` → **3221 passed**, 7 files, 99.5 s, exit 0; `npx tsc --noEmit -p tsconfig.app.json` → silent; `npx tsc --noEmit -p tsconfig.eval.json` → silent; `npm run lint` → 0 errors, 25 warnings (do not "fix" them). Registry **232** ids; **105** lessons. No count may drop, and the test count must land on section 3's predictions exactly — a different delta is explained in the report, never absorbed by editing this plan.
7. `sed --version` prints GNU sed (4.9 here); `npx vitest --version` and `npx vite-node --version` run. If any is missing, stop and report.

## 2. The rules this task decides — stated once, so the executor does not have to

### 2.1 The containment rule (what "practised" means)

A skill-check reference is **practised** when some *generated* reference in the lesson's guided deck has the same **family**, where

```
familyOf(id) = id, with a trailing `+choice` removed, then a trailing `-steps` removed
```

so `modulus`, `modulus+choice`, `modulus-steps` and `modulus-steps+choice` are one family. Decisions, each made rather than left open:

- **`x+choice` in a skill check counts as practised when the deck asked bare `x`, and vice versa.** They are the same question through a different widget — that is what `choiceVariant.ts` exists to make cheap — and the point of the rule is *skill*, not widget.
- **`x-steps` counts as `x`.** The reduce slide is the same computation with the working shown; a skill check that then asks the bare form is the check doing its job. This is why `cn-l4-argument` (guided: `modulus-steps`, check: `modulus`) is **not** an offender, and `vm-l3-singular` (guided: `mat-determinant-steps`, check: `mat-determinant`) is not either. Under the stricter "strip `+choice` only" rule both would be flagged and the count would be 19 lessons; measured here, section 10 item 3.
- **Difficulty is not part of the family.** A check at difficulty 2 of a generator practised at 1 is the check being harder, which is what it is for. (Under a per-`id@difficulty` rule 176 pairs fail today — section 10, item 3 — which is the whole repository's convention of practising at 1 and checking at 2. Not a defect.)
- **"Taught but never asked" is invisible to the rule and is meant to be.** Teach slides are literal and name no generator; the owner's ruling is about what was *practised*, and only an `ask` is practice. If a lesson wants to check something, it asks it first.
- **Literal (non-generated) skill-check slides are ignored** by the rule; there are none today.
- **The rule covers `lesson.skillCheck` only.** Level checks are reported by the scan, not gated (section 0).

**The rule must fail on the anchor tree with exactly these 18 lines**, measured here (section 10, item 3), and the executor proves that by writing the test *before* touching any course file and running it red:

```
tf-l2-cosine -> trig-sine-from-circle
tf-l3-period-formula -> trig-read-parameters
cn-l1-arithmetic -> imaginary-square
cn-l1-complex -> imaginary-product
cn-l2-conjugates -> complex-multiply
cn-l2-division -> complex-conjugate
cn-l3-modulus -> complex-conjugate
cn-l4-powers -> argument
df-l1-sums -> evaluate-derivative
df-l2-product -> sum-rule
df-l2-quotient -> product-rule
df-l3-chain -> product-rule
df-l4-trig -> chain-rule
df-l4-exp -> trig-derivative
df-l4-exp -> evaluate-derivative
df-l4-combine -> product-rule
vm-l2-vector -> mat-multiply
vm-l3-solve -> mat-inverse
```

### 2.2 The surd policy for `modulus` and its relatives

- **`answer` is `sqrt(n)`** with `n = a*a + b*b` computed in integer arithmetic — no `Math.hypot`, no rounding, no table. PITFALLS §3.11 ("the table is the check") was about reading a *rounded float* back as the integer already known; with a surd there is nothing to round, and the table now serves `modulus-steps` alone. Update the `TRIPLES` comment to say so (section 3.1).
- **`alsoAccepts` carries the simplified form when it differs from `sqrt(n)`:** `2*sqrt(5)` for `sqrt(20)`, `5` for `sqrt(25)`. Declared only when it differs, so the negative control in `accepts every other writing it promises` is live and the declaration is never the trivial `[answer]`.
- **What the learner reads** comes from `surdTex(n)`: `5`, `\sqrt{13}`, `2\sqrt{5}`. The solution shows `\sqrt{a^2 + b^2} = \sqrt{n}` and then the simplified form when there is one.
- **Accepted behaviour, stated so nobody "fixes" it:** numeric probing cannot enforce surd *form*. Measured here (section 10, item 5): `13^(1/2)`, `2*sqrt(5)` vs `sqrt(20)` in both directions, `sqrt(3^2+2^2)`, `sqrt(9+4)`, and the decimal `3.6055513` (eight significant figures) all grade **correct** against `sqrt(13)`; `3.60555`, `3.6`, `13`, `5`, `sqrt(13)+1` and `sqrt(-13)` grade **incorrect**. A learner who types the modulus to eight figures has done the work, and `relativeTolerance: 1e-8` in `src/engine/equivalence.ts` is the documented dial. **Do not touch `probePolicy()`, `domain`, or `mode` to change this.**
- **The keypad already works.** `SQRT_KEYS` inserts a root template (`applyKey`, `src/ui/slides.tsx:149`); typing `2`, then the template with `5` inside, serialises as `2sqrt(5)`, which grades correct against `sqrt(20)` (measured, item 5). No new key is needed; `power-modulus` in unit 3 uses `SQRT_KEYS` too.
- **Every new `modulus`-shaped sampler excludes `|a| = |b| = 1`.** That is the one pair where the sum-of-parts distractor (`|a|+|b| = 2`) and the never-rooted distractor (`n = 2`) coincide, and where `\sqrt{|a|+|b|}` equals the answer; excluded rather than special-cased, and the exclusion is what mutation M-1-pair proves is load-bearing.
- **The promise sentence.** T1 of `cn-l3-modulus` will say that `√20` and `2√5` are both *accepted*. The word `accepted` in teach prose is what `backs every promise that another writing is accepted` keys on, and it is satisfied because `modulus@1` declares `alsoAccepts` on the draws where the surd simplifies. No other new or edited teach slide in this task may contain the word `accepted`; `grep -n accepted src/content/courses/complexNumbers.ts` is empty at the anchor and shows exactly one line after unit 1.

### 2.3 What the existing guards already give a new generator, and what they do not

Every new generator is under the 13 per-generator property tests the moment it is exported (section 5). **None of them is an oracle for this course** — they prove a generator agrees with itself, that its TeX renders, that its choice distractors differ in value from its correct option, that it has ≥25 distinct questions, and that a lesson's deck varies in widget shape. Task 2 met the same gap and wrote a scratch oracle; so does this task. **Section 6 specifies `oracle.ts`** — a scratch script, never committed, importing only `registry`, `makeRng` and `math`, which recomputes every new answer independently and checks each native `choice` slide has exactly one satisfying option. Its output goes in the report, per unit, and one mutation per unit proves it can fail.

## 3. What to change, file by file, in order

Conventions for every generator: `render` and `solution` take the same params; `*Tex` strings are what the learner reads, `answer`/`alsoAccepts` strings are mathjs-only; **every backslash doubled in source, exactly as written below**; written directly in the file, never through a heredoc or script (PITFALLS §3.12); `sample` draws in a fixed order. New ids checked here against the 232-id registry (none collides): `modulus-which`, `modulus-compare`, `modulus-distance`, `conjugate-plot`, `conjugate-recover`, `power-modulus`, `power-reverse`, `divide-reverse`, `divide-which-multiplier`, `plot-sum`, plus the derived `modulus-distance+choice`, `conjugate-recover+choice`, `power-modulus+choice`, `divide-reverse+choice`, `identify-point+choice`. `tsconfig.app.json` sets `noUnusedLocals`, so **add each helper in the unit that first uses it** (task 6's executor refused a plan that did otherwise, correctly).

Conventions for every lesson: use only the course file's own helpers (`teach`, `ask`, `plane`). Exactly 10 or 11 guided slides, the first a `teach`, three teach slides, `skillCheck` of exactly 3, every skill-check family asked in the deck. Prose below is the content each block must carry; write it in the file's voice and keep every `$…$` fragment as given. **Every difficulty-2 form a generator can draw is taught before the first difficulty-2 ask in its lesson**; the decks were built to that rule, so do not reorder them. Every deck below was checked here against both shape guards by hand (section 10, item 8): no run of three between teach slides has a common widget kind, and no lesson's asks share one kind.

### 3.0 Unit 0 — the containment test, the id swaps, and the variety scan (priority 1, mandatory)

**Order inside the unit matters: test first, red; then swaps, green; then the scan.**

**(a) `src/content/choiceVariant.ts`** — add, after `choiceId`:

```ts
/**
 * The skill a generator id practises, for the purpose of "did this lesson
 * practise what its skill check asks". `x`, `x+choice`, `x-steps` and
 * `x-steps+choice` are one family: the same computation through a different
 * widget, or with its working shown. Difficulty is deliberately not part of it.
 */
export function familyOf(generatorId: string): string {
  const bare = generatorId.endsWith(CHOICE_SUFFIX)
    ? generatorId.slice(0, -CHOICE_SUFFIX.length)
    : generatorId;
  return bare.replace(/-steps$/, '');
}
```

**(b) `src/content/generators/generators.test.ts`** — extend the existing import from `'../choiceVariant'` to `{ CHOICE_SUFFIX, familyOf }`, and add one test inside `describe('course integrity')`, immediately after `never puts a teaching slide in a skill check`:

```ts
  it('checks only skills the lesson practised', () => {
    // The owner met a conjugate question in the modulus lesson's skill check
    // and called it what it is: a check of something the lesson never asked.
    // Not interleaving, a defect — so it is a rule, over families rather than
    // ids, because `x`, `x+choice` and `x-steps` are one skill (familyOf).
    // Teach slides do not count: only an ask is practice.
    const offenders: string[] = [];
    for (const lesson of lessons) {
      const practised = new Set(
        lesson.slides
          .filter((ref): ref is GeneratedRef => ref.type === 'generated')
          .map((ref) => familyOf(ref.generatorId)),
      );
      for (const ref of lesson.skillCheck) {
        if (ref.type !== 'generated') continue;
        if (!practised.has(familyOf(ref.generatorId))) {
          offenders.push(`${lesson.id} -> ${ref.generatorId}`);
        }
      }
    }
    expect(offenders.join('\n')).toBe('');
  });
```

(`GeneratedRef` is a type alias declared later in the same `describe`; type aliases hoist, and the other tests already use it the same way.) Run `npx vitest run src/content/generators/generators.test.ts -t 'checks only skills'` **before any course edit**: it must fail with the 18 lines of section 2.1, in that order. **Save that output verbatim for the report** — it is the proof the guard fires on the old code, and it cannot be reproduced after the swaps without a mutation.

**(c) The id swaps — twelve lines, one `ask(...)` each.** Line numbers are at the anchor; confirm each by reading before editing. Every replacement is a family the same lesson's guided deck already asks (measured here, section 10 item 3).

| Lesson | File:line | Replace | With |
| --- | --- | --- | --- |
| `tf-l2-cosine` | `trigonometricFunctions.ts:573` | `ask('trig-sine-from-circle', 2)` | `ask('trig-cosine-from-circle+choice', 2)` |
| `tf-l3-period-formula` | `trigonometricFunctions.ts:1004` | `ask('trig-read-parameters', 2)` | `ask('trig-period-from-speed', 2)` |
| `df-l1-sums` | `differentiation.ts:197` | `ask('evaluate-derivative')` | `ask('sum-rule+choice', 2)` |
| `df-l2-product` | `differentiation.ts:398` | `ask('sum-rule', 2)` | `ask('product-rule+choice', 2)` |
| `df-l2-quotient` | `differentiation.ts:464` | `ask('product-rule', 2)` | `ask('quotient-rule+choice', 2)` |
| `df-l3-chain` | `differentiation.ts:547` | `ask('product-rule', 2)` | `ask('chain-rule+choice', 2)` |
| `df-l4-trig` | `differentiation.ts:714` | `ask('chain-rule', 2)` | `ask('trig-derivative+choice', 2)` |
| `df-l4-exp` | `differentiation.ts:804` | `ask('trig-derivative', 2)` | `ask('exp-log-derivative+choice', 2)` |
| `df-l4-exp` | `differentiation.ts:805` | `ask('evaluate-derivative')` | `ask('exp-log-derivative')` |
| `df-l4-combine` | `differentiation.ts:861` | `ask('product-rule', 2)` | `ask('df-product-mixed+choice', 2)` |
| `vm-l2-vector` | `vectors.ts:498` | `ask('mat-multiply', 2)` | `ask('mat-vector+choice', 2)` |
| `vm-l3-solve` | `vectors.ts:736` | `ask('mat-inverse', 2)` | `ask('mat-solve+choice', 2)` |
| `cn-l1-arithmetic` | `complexNumbers.ts:111` | `ask('imaginary-square', 2)` | `ask('imaginary-sum+choice', 2)` |
| `cn-l1-complex` | `complexNumbers.ts:148` | `ask('imaginary-product', 2)` | `ask('complex-add')` |
| `cn-l2-conjugates` | `complexNumbers.ts:275` | `ask('complex-multiply', 2)` | `ask('complex-conjugate+choice', 2)` |
| `cn-l2-division` | `complexNumbers.ts:307` | `ask('complex-conjugate', 2)` | `ask('complex-divide+choice', 2)` |
| `cn-l3-modulus` | `complexNumbers.ts:405` | `ask('complex-conjugate', 2)` | `ask('modulus+choice', 2)` |
| `cn-l4-powers` | `complexNumbers.ts:566` | `ask('argument', 2)` | `ask('complex-power+choice', 2)` |

The four Complex Numbers rows for conjugates, division, modulus and powers are superseded by units 2, 4, 1 and 3 respectively; they are done here so the test is green from unit 0 whatever the stop rule allows later. **These are the only edits to the three non-CN course files in the whole task.** The report names the eleven non-CN lessons and says they are id swaps only.

**(d) `eval/bin/variety.sh` and `eval/bin/variety.ts`** — a report, not a gate. `variety.sh` mirrors `counts.sh` exactly:

```bash
#!/usr/bin/env bash
# How repetitive each lesson's guided deck is, and which skill-check and
# level-check questions ask a family the deck never practised.
#
# A report, deliberately not a gate: at the time of writing 83 of 105 lessons
# lean on one generator family for 70% or more of their questions, and the
# owner has chosen to fix that course by course. This is what makes the rest
# a measured backlog rather than a number that lives in one conversation.
#
# Usage: eval/bin/variety.sh [--course <course id>] [--threshold 0.7] [--min 5]
# Exit codes: 0 report printed / 2 harness error, or nothing to measure.
set -uo pipefail
REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
exec npx vite-node "$REPO/eval/bin/variety.ts" "$@"
```

`variety.ts` imports `courses` from `../../src/content/courses`, `familyOf` from `../../src/content/choiceVariant`, and `scriptArgs` from `./countsCore` (it already handles both observed argv layouts — do not hard-code an index). It prints, for every lesson (filtered by `--course` when given), one tab-separated line `lesson id, questions, dominant family, share as a percentage, REPETITIVE or ok`, sorted by share descending, where **questions** are the generated references in `lesson.slides`, the **dominant family** is the most frequent `familyOf`, and a lesson is **REPETITIVE** when the dominant share is `>= threshold` (default 0.7) and questions `>= min` (default 5). Then three summary lines, exactly:

```
repetitive: <n> of <m> (dominant family >= 70% of >= 5 questions)
stray skill checks: <n>
stray level-check questions: <n>
```

followed by one `  <lesson id> -> <generator id>` line per stray skill check (same rule as the test) and one `  <level id> -> <generator id>` line per level-check question whose family no lesson in that level asks. If the tree yields zero generated references, print `nothing to measure` and exit 2 — a scan that silently counts nothing is the failure class `counts.ts` exists to close. `npx tsc --noEmit -p tsconfig.eval.json` must stay silent; it includes `eval/bin`.

**Expected on the anchor tree** (measured here, section 10 items 3–4): `repetitive: 83 of 105`, `stray skill checks: 18`, `stray level-check questions: 16`. Run it once *before* the swaps and once after; after, stray skill checks is 0 and the other two are unchanged. Both outputs go in the report.

**No test file for the scan.** It is a metric; the guard is the test in (b). A snapshot test would only pin today's 83, and the number is meant to move.

**Test count after unit 0: 3221 + 1 = 3222.** Commit message: `Refuse a skill check the lesson never practised, and count how repetitive each deck is`.

**Mutation after the commit, before the push:**

- M-0-swap (must be killed): `eval/bin/mutate.sh src/content/courses/differentiation.ts "s/^\( *skillCheck: \[ask('chain-rule', 2), ask('chain-rule'), \)ask('chain-rule+choice', 2)\],$/\1ask('product-rule', 2)],/" -- npx vitest run src/content/generators/generators.test.ts -t 'checks only skills'` — reintroduces the `df-l3-chain` stray on the one line that matches the full anchor. Expected message: `df-l3-chain -> product-rule`. Read the printed diff: exactly one line changes.

### 3.1 Unit 1 — Modulus: surd answers and three new shapes (priority 2)

**`src/content/generators/format.ts`** — add, after `powersOf`:

```ts
/**
 * n = k^2 * m with m square-free: the surd sqrt(n) in lowest terms. Integer
 * arithmetic only, so a modulus is never a float rounded back to the integer
 * it was meant to be.
 */
export function surdParts(n: number): { k: number; m: number } {
  let k = 1;
  let m = n;
  for (let p = 2; p * p <= m; p += 1) {
    while (m % (p * p) === 0) {
      m /= p * p;
      k *= p;
    }
  }
  return { k, m };
}

/** sqrt(n) as the learner reads it: 5, \sqrt{13}, 2\sqrt{5}. */
export function surdTex(n: number): string {
  const { k, m } = surdParts(n);
  if (m === 1) return `${k}`;
  return `${k === 1 ? '' : k}\\sqrt{${m}}`;
}

/** The same value for mathjs, simplified: 5, sqrt(13), 2*sqrt(5). */
export function surdAnswer(n: number): string {
  const { k, m } = surdParts(n);
  if (m === 1) return `${k}`;
  return k === 1 ? `sqrt(${m})` : `${k}*sqrt(${m})`;
}
```

Checked by hand here: 20 → `{2, 5}`, 72 → `{6, 2}`, 25 → `{5, 1}`, 13 → `{1, 13}`, 2 → `{1, 2}`.

**`src/content/generators/complexPlane.ts`:**

1. Rewrite the `TRIPLES` doc comment: the table now serves **`modulus-steps` only**, whose reduce banks must be whole numbers (`expr.ts` rounds every root on purpose); `modulus` answers with a surd and reads nothing from it. Keep the table, its export and every row unchanged — `generators.test.ts:869` imports it.
2. Add, above `modulus`, a shared sampler and a shared distractor builder:

```ts
/**
 * Two non-zero parts, never both ±1: (1, 1) is the one pair where the sum of
 * the parts, the never-rooted square and the answer all come to the same
 * number, so its distractors would collide with the answer.
 */
function samplePythagoreanParts(rng: Rng, difficulty: number): { a: number; b: number } {
  const top = difficulty >= 2 ? 8 : 6;
  let a = rng.int(1, top);
  let b = rng.int(1, top);
  while (a === 1 && b === 1) {
    a = rng.int(1, top);
    b = rng.int(1, top);
  }
  if (difficulty >= 2) {
    a *= rng.sign();
    b *= rng.sign();
  }
  return { a, b };
}

/**
 * The three ways a modulus is misread, as options: the parts added instead
 * of squared, the square never rooted, and the parts added and then rooted.
 * Shared by `modulus` and `modulus-distance`, since a distance is a modulus.
 */
function modulusChoices(a: number, b: number): ChoiceOption[] {
  const n = a * a + b * b;
  const sum = Math.abs(a) + Math.abs(b);
  return options(
    { tex: surdTex(n), answer: surdAnswer(n) },
    { tex: `${sum}`, answer: `${sum}` },
    { tex: `${n}`, answer: `${n}` },
    { tex: `\\sqrt{${sum}}`, answer: `sqrt(${sum})` },
  );
}
```

(Import `surdTex`, `surdAnswer` from `./format`; `ChoiceOption` is already imported.) Every pair of these four differs in value for every allowed `(a, b)`: sum = n only at (1, 1); sum = √n would need a Pythagorean triple with a + b = c, impossible; `sqrt(sum)` = √n only at (1, 1); n = √n only at n = 1.

3. **Rewrite `modulus`** to `interface ModulusParams { a: number; b: number }`:

- `choices: ({ a, b }) => modulusChoices(a, b)`.
- `sample: samplePythagoreanParts`.
- `render`: keep the prompt's diagram and the `lead`; prompt prose `What is $|${complexTex(a, b)}|$? Give the exact value — a surd where it is not a whole number.`; `keypad: SQRT_KEYS`; then, **on their own lines exactly**:
  ```ts
    const n = a * a + b * b;
    const simplified = surdAnswer(n);
  ```
  `answer: \`sqrt(${n})\``, `alsoAccepts: simplified === \`sqrt(${n})\` ? undefined : [simplified]`, `domain: 'real'`, `mode: 'exact'`.
- `solution`: (1) `The modulus is the distance from the origin, so it is Pythagoras on the two parts.` with tex `` `|${complexTex(a, b)}| = \\sqrt{${paren(`${a}`)}^2 + ${paren(`${b}`)}^2}` ``; (2) `Signs disappear when squared, which is why the modulus is never negative.` with tex `` `= \\sqrt{${a * a} + ${b * b}} = \\sqrt{${n}}` `` followed by `` ` = ${surdTex(n)}` `` **only when `surdTex(n) !== \`\\sqrt{${n}}\``**; (3) text: when `surdParts(n).m === 1`, `That happens to be a whole number. Most are not, and a surd is the exact answer — do not turn it into a decimal.`; otherwise `A surd is the exact answer and the one to give. It is not a whole number, and nothing is gained by making it one.`

4. **`modulus-which`** — native `choice`, working backwards. `interface WhichParams { a: number; b: number; v: number }`; `sample`: `a = rng.int(1, difficulty >= 2 ? 8 : 5)`, `b = rng.int(1, difficulty >= 2 ? 8 : 5)`, `v = rng.int(0, 7)`. A helper `variant(x, y, v)` returns `[v & 4 ? y : x, v & 4 ? x : y]` with the first negated when `v & 1` and the second when `v & 2` — the same variant applied to all four points, so no option stands out by its sign pattern. `render`: prompt one prose block `` `Exactly one of these has modulus $${surdTex(a * a + b * b)}$. Which?` ``; options built from `variant(a, b, v)` (correct), `variant(a + 1, b, v)`, `variant(a, b + 1, v)`, `variant(a + 1, b + 1, v)` as `ChoiceOption`s with `tex: complexTex(...)`, **sorted by `tex` with `localeCompare` and ids `opt0..opt3`, exactly the `polar-form` pattern at lines 481–494** (sorted, never shuffled — PITFALLS §3.10); `correctId` the sorted index of the correct one. Each distractor's modulus exceeds the target's strictly, so there is never a second right answer. `solution`: one tex line per option `|x + yi|^2 = x^2 + y^2 = …` and the text `Square and add each candidate's parts; only one comes to <n>. The root keeps the order, so comparing the squares is enough.`

5. **`modulus-compare`** — native `choice`, comparing. `interface CompareParams { points: { re: number; im: number }[] }` (always four). `sample`: `top = difficulty >= 2 ? 7 : 5`; enumerate every `(x, y)` with `1 ≤ x, y ≤ top`; `rng.shuffle` it; walk it keeping the first pair for each new value of `x*x + y*y` until four are kept; at difficulty 2 multiply each kept coordinate by `rng.sign()`. Shuffled in `sample`, not `render` (the `complex-part` pattern). `render`: prompt `Which of these is furthest from the origin?`; options `points.map((p, i) => ({ id: \`opt${i}\`, label: complexTex(p.re, p.im), tex: true }))`; `correctId` the index of the largest `re*re + im*im` (unique by construction). `solution`: the four squared moduli as tex, then `The largest sum of squares is the largest modulus — no roots needed to compare, because the root keeps the order.`

6. **`modulus-distance`** — `expression` with `choices`, applying. `interface DistanceParams { a: number; b: number; c: number; d: number }` (z = a + bi, w = c + di). `sample`: at difficulty 1 each coordinate `rng.int(0, 5)`; at difficulty 2 `rng.int(-4, 4)`; redraw until `a - c ≠ 0`, `b - d ≠ 0`, and not `|a - c| = |b - d| = 1`. `render`: `dx = a - c`, `dy = b - d`, then on their own lines exactly `    const n = dx * dx + dy * dy;` and `    const simplified = surdAnswer(n);`; prompt: prose `` `$z = ${complexTex(a, b)}$ and $w = ${complexTex(c, d)}$ are marked. How far apart are they? That distance is $|z - w|$.` `` and a diagram `complexPlaneSvg(rangeFor(a, b, c, d), [{ re: a, im: b, highlight: true }, { re: c, im: d, highlight: true }])`; `lead: '|z - w| ='`; `keypad: SQRT_KEYS`; `answer: \`sqrt(${n})\``; `alsoAccepts` as in `modulus`; `domain: 'real'`; `mode: 'exact'`. `choices: ({ a, b, c, d }) => modulusChoices(a - c, b - d)`. `solution`: (1) `Subtract first: z - w is the arrow from w to z.` tex `` `z - w = ${complexTex(dx, dy)}` ``; (2) `Then its modulus, which is Pythagoras on the difference.` tex `` `|z - w| = \\sqrt{${paren(`${dx}`)}^2 + ${paren(`${dy}`)}^2} = \\sqrt{${n}}` `` plus ` = simplified` when it differs; (3) `Subtracting the other way round gives w - z, the same distance: the modulus does not care which end you start from.`

7. Append `modulusWhich, modulusCompare, modulusDistance` to `planeGenerators` after `modulusSteps`.

Distinct questions, counted by enumeration (the floor test decides): `modulus` 35 / 252; `modulus-which` 200 / 512; `modulus-compare` far above 25 at both; `modulus-distance` far above 25 at both.

**Lesson `cn-l3-modulus`**, rewritten to 11 guided slides:

```
teach(T1), ask('modulus'), ask('modulus+choice'), ask('modulus-which'),
teach(T2), ask('modulus', 2), ask('modulus-compare'), ask('modulus-steps', 2),
teach(T3), ask('modulus-distance'), ask('modulus-distance', 2)
skillCheck: [ask('modulus', 2), ask('modulus-distance', 2), ask('modulus-which', 2)]
```

- T1 (existing five blocks, edited): keep blocks 1–3 (definition, `|a + bi| = \\sqrt{a^2 + b^2}`, Pythagoras). Replace the `|3 + 4i|` display with two: `maths('|3 + 4i| = \\sqrt{9 + 16} = \\sqrt{25} = 5')` and `maths('|2 + 3i| = \\sqrt{4 + 9} = \\sqrt{13}')`. Then prose: `Most moduli are not whole numbers, and $\\sqrt{13}$ is the exact answer — the one to give. Do not reach for a decimal.` Then **the PROMISE, verbatim as one prose block:** `Where a surd simplifies, write it either way: $\\sqrt{20}$ and $2\\sqrt{5}$ are the same number, and both are accepted.` Keep the closing block about `|3 + 4i|` being 5 not 7.
- T2 (existing, unchanged): signs disappear, the four points on a circle, only 0 has modulus 0.
- T3 (existing three blocks, plus two): keep `z\\overline{z} = |z|^2` and `|zw| = |z||w|`. Add `maths('|z - w| = \\text{the distance from } w \\text{ to } z')` and prose: `The plane lesson said $z - w$ is the arrow from $w$ to $z$. Its modulus is therefore the distance between the two points — subtract, then Pythagoras on what is left.`

**Expected on the unmutated tree:** `npx vitest run src/content/generators/generators.test.ts -t 'modulus'` matches every `modulus*` id (base, `+choice`, `-steps`, `-steps+choice`, `-which`, `-compare`, `-distance`, `-distance+choice`) — 8 × 13 = 104 passed. Scope single tests with the `' > '` form (`-t 'modulus > accepts every other writing'` selects only the base generator's test; `modulus-steps > …` does not contain that substring).

**Test count after unit 1: 3222 + 52 = 3274** (`modulus-which` 13, `modulus-compare` 13, `modulus-distance` and its `+choice` 26). Commit message: `Modulus: surd answers, and three new question shapes`.

**Mutations after the commit, before the push:**

- M-1-surd (killed by `accepts every other writing it promises`): `eval/bin/mutate.sh src/content/generators/complexPlane.ts 's/^ *const simplified = surdAnswer(n);$/    const simplified = `sqrt(${n + 1})`;/' -- npx vitest run src/content/generators/generators.test.ts -t 'modulus > accepts every other writing'`. The sed matches **two** lines (`modulus` and `modulus-distance`), which is intended; the `-t` scopes the kill to `modulus`. Expected message of the form `seed N: promised writing sqrt(M) is not accepted against sqrt(K) over real`.
- M-1-pair (killed by `offers exactly one correct option, and distractors that are really wrong`): `eval/bin/mutate.sh src/content/generators/complexPlane.ts 's/^ *while (a === 1 && b === 1) {$/  while (false) {/' -- npx vitest run src/content/generators/generators.test.ts -t 'modulus > offers exactly one'` — removes the (1, 1) exclusion; over 200 seeds at difficulty 1 the pair is drawn and the `\sqrt{2}` distractor grades correct against `sqrt(2)`. Expected message: `seed N: distractor \sqrt{2} (sqrt(2)) is not wrong against sqrt(2)`.
- M-1-value (**expected to SURVIVE the suite — record, do not fix**): `eval/bin/mutate.sh src/content/generators/complexPlane.ts 's/^ *const n = a \* a + b \* b;$/    const n = a * a + b;/' -- npx vitest run src/content/generators/generators.test.ts -t 'modulus > '` — the answer, the solution and every distractor derive from the same `n`, so the suite has nothing to compare it with. This is the residual of section 2.3 on the record. (If the `modulusChoices` helper's own `const n` line also matches, the harness prints both; that is fine — read the diff.)
- M-1-oracle (killed by the scratch oracle): the same sed as M-1-value with `-- npx vite-node <scratchpad>/oracle.ts modulus` as the command. The oracle recomputes `abs(complex(a, b))` with mathjs from the numbers in the prompt and must report disagreements on every draw. **This is the proof that the oracle can fail**, and it is what makes M-1-value's survival a recorded gap rather than an unchecked claim.

### 3.2 Unit 2 — Conjugates: plot the reflection, and recover z from z·z̄ (priority 3)

**`src/content/generators/complexPlane.ts`** — `conjugate-plot`, placed after `plotPoint` (it shares `RANGE` and the plot conventions):

```ts
interface ConjugatePlotParams { re: number; im: number }

export const conjugatePlot: Generator<ConjugatePlotParams> = {
  id: 'conjugate-plot',
  // The imaginary part is never zero, or the conjugate is the point itself.
  sample: (rng, difficulty) => ({
    re: difficulty >= 2 ? nonZero(rng, RANGE) : rng.int(1, RANGE),
    im: nonZero(rng, RANGE),
  }),
  render: ({ re, im }) => ({
    kind: 'plot',
    prompt: [{ kind: 'prose', text: `Plot $\\overline{z}$, the conjugate of $z = ${complexTex(re, im)}$.` }],
    range: RANGE,
    answer: { re, im: -im },
  }),
  solution: ({ re, im }) => [
    {
      text: 'The conjugate keeps the real part and flips the imaginary part: reflect $z$ in the real axis.',
      tex: `\\overline{${complexTex(re, im)}} = ${complexTex(re, -im)} \\rightarrow (${re},\\ ${-im})`,
    },
  ],
};
```

Distinct: 32 / 64. Append to `planeGenerators` after `plotPoint`.

**`src/content/generators/complexArithmetic.ts`** — `conjugate-recover`, after `complexConjugate`:

`interface RecoverParams { a: number; b: number }`; `sample`: `a = difficulty >= 2 ? nonZero(rng, 6) : rng.int(1, 6)`, `b = rng.int(2, difficulty >= 2 ? 7 : 6)` — **b starts at 2** because at b = 1 the "forgot the root" distractor `(a, b²)` is the answer. `render`: `n = a * a + b * b`; `kind: 'expression'`; prompt one prose block `` `$z$ has real part $${a}$ and $z\\overline{z} = ${n}$. Its imaginary part is positive. What is $z$?` ``; `lead: 'z ='`; `keypad: I_KEY`; `answer: complexAnswer(a, b)`; `domain: 'complex'`; `mode: 'exact'`. `choices`: with `opt` as in `complexConjugate`, `options(opt(a, b), opt(a, -b), opt(b, a), opt(a, b * b))` — the wrong sign, the parts swapped, the root forgotten; `opt(b, a)` collapses into the answer's `tex` when a = b and `options()` drops it, which is allowed. `solution`: (1) `$z\\overline{z} = a^2 + b^2$, and the real part is known, so the imaginary part is one subtraction away.` tex `` `b^2 = ${n} - ${paren(`${a}`)}^2 = ${n} - ${a * a} = ${b * b}` `` (add a local `paren` as in `complexPlane.ts`, or write the square as `(${a})^2` when `a < 0`); (2) `Two numbers square to that; the question says the imaginary part is positive.` tex `` `b = ${b}` ``; (3) tex `` `z = ${complexTex(a, b)}` ``; (4) `The other number with the same real part and the same $z\\overline{z}$ is the conjugate, $${complexTex(a, -b)}$ — which is why the sign had to be given.`

Distinct: 30 / 72. Append to `arithmeticGenerators` after `complexConjugate`. The derived `+choice` prompt drops the bare `z` lead (`promptFrom`), so the single-letter guard passes.

**Lesson `cn-l2-conjugates`**, rewritten to 11 guided slides:

```
teach(T1), ask('complex-conjugate'), ask('complex-conjugate+choice'), ask('conjugate-plot'),
teach(T2), ask('complex-conjugate', 2), ask('conjugate-recover'), ask('complex-conjugate+choice', 2),
teach(T3), ask('conjugate-recover', 2), ask('conjugate-plot', 2)
skillCheck: [ask('complex-conjugate', 2), ask('conjugate-recover', 2), ask('conjugate-plot', 2)]
```

- T1 (existing, unchanged — it already says "a reflection in the real axis", which is what `conjugate-plot` asks).
- T2 (existing five blocks, plus one prose block before the last): `Turned round, the fact is a tool: if you know $z\\overline{z}$ and the real part, the imaginary part is one subtraction and a root away — $z\\overline{z} = 25$ with real part $3$ gives $b^2 = 16$, so $b = 4$ or $-4$.` (Before `conjugate-recover@1` is asked.)
- T3 (existing, unchanged).

**Test count after unit 2: 3274 + 39 = 3313** (`conjugate-plot` 13; `conjugate-recover` and `+choice` 26). Commit message: `Conjugates: plot the reflection, and recover z from z times its conjugate`.

**Mutations after the commit:**

- M-2-root (killed by `offers exactly one correct option`): `eval/bin/mutate.sh src/content/generators/complexArithmetic.ts "/id: 'conjugate-recover'/,/^};/ s/b: rng.int(2, /b: rng.int(1, /" -- npx vitest run src/content/generators/generators.test.ts -t 'conjugate-recover > offers exactly one'` — at b = 1 the "forgot the root" option equals the answer. Read the diff: one line, inside `conjugate-recover`. (The `/^};/` range end relies on generator objects closing at column 0, which every generator in the file does — confirm from the diff.)
- M-2-oracle (killed by the scratch oracle): `eval/bin/mutate.sh src/content/generators/complexPlane.ts "/id: 'conjugate-plot'/,/^};/ s/answer: { re, im: -im },/answer: { re, im },/" -- npx vite-node <scratchpad>/oracle.ts conjugate-plot` — the suite's plot checks (integers, in range) cannot see this; the oracle compares the answer to `conj` of the number in the prompt.

### 3.3 Unit 3 — Powers: the modulus of a power, and which z has zⁿ = w (priority 4)

**`src/content/generators/complexPlane.ts`**, both after `complexPower`:

**`power-modulus`** — `expression` with `choices`, applying De Moivre to the modulus alone. `interface PowerModulusParams { a: number; b: number; k: number }`; `sample`: `a = rng.int(1, 4) * (difficulty >= 2 ? rng.sign() : 1)`, `b` likewise, `k = rng.int(2, difficulty >= 2 ? 5 : 3)`. `render`: on its own line exactly `    const n0 = a * a + b * b;` — the value is `n0^(k/2)`, which `surdTex(n0 ** k)` / `surdAnswer(n0 ** k)` produce in lowest terms (largest input 32⁵, well inside integer range); prompt `` `$z = ${complexTex(a, b)}$. What is $|z^{${k}}|$?` ``; `lead: \`|z^{${k}}| =\``; `keypad: SQRT_KEYS`; `answer: surdAnswer(n0 ** k)`; `domain: 'real'`; `mode: 'exact'`. `choices`: correct `{ tex: surdTex(n0 ** k), answer: surdAnswer(n0 ** k) }`; multiplied instead of powered `surdTex(k * k * n0)` / `surdAnswer(k * k * n0)` (since k·√n₀ = √(k²n₀)); one power short `surdTex(n0 ** (k - 1))`; never rooted `` `${n0 ** k}` ``. Checked here that no distractor equals the answer for any reachable `(n0, k)`: k²n₀ = n₀ᵏ would need n₀ = 4 (k = 2) or n₀ = 3 (k = 3), neither a sum of two non-zero squares; the others differ trivially. `solution`: (1) tex `` `|z| = \\sqrt{${a * a} + ${b * b}} = ${surdTex(n0)}` ``; (2) `De Moivre for the modulus alone: a power raises the modulus to that power, and the argument is not needed for this question.` tex `` `|z^{${k}}| = |z|^{${k}} = \\left(${surdTex(n0)}\\right)^{${k}} = ${surdTex(n0 ** k)}` ``; (3) `Multiplying the modulus by the power, instead of raising it, is the slip — that would be $${surdTex(k * k * n0)}$.`

Distinct: 32 / 256.

**`power-reverse`** — native `choice`, working backwards. Module-level:

```ts
/** Every a + bi with a, b in -2..2 except 0: small enough that any power is checkable by hand. */
const REVERSE_BASES: { re: number; im: number }[] = [];
for (let re = -2; re <= 2; re += 1) {
  for (let im = -2; im <= 2; im += 1) {
    if (re !== 0 || im !== 0) REVERSE_BASES.push({ re, im });
  }
}
```

`interface ReverseParams { re: number; im: number; n: number; distractors: { re: number; im: number }[] }`; `sample`: `n = difficulty >= 2 ? rng.int(2, 4) : 2`; `base = rng.pick(REVERSE_BASES)`; `target = powersOf(base.re, base.im, n)[n - 1]`; `eligible` = every other base whose n-th power differs from `target` in either component (this is what removes `-z` for even n and `±iz` for n = 4 — a second right answer would be a coin toss the suite cannot see, section 2.3); `distractors = rng.sample(eligible, 3)`. **Write the `eligible` filter on one line** — M-3-oracle below substitutes that whole line. `render`: prompt prose `` `Exactly one of these satisfies $z^{${n}} = w$. Which?` `` and display `` `w = ${complexTex(target...)}` ``; options from `[base, ...distractors]` as `ChoiceOption`s with `tex: complexTex(re, im)`, **sorted by tex, `polar-form` pattern**, ids `opt0..3`; `correctId`. `solution`: the correct base's powers via `powersOf`, as `complexPower`'s solution does (first three and the n-th), then one tex line per distractor `` `${bracketedTex(...)}^{${n}} = ${complexTex(...)}` `` and the text `Raising each candidate is the check; only one lands on $w$.` At n = 2 the prose adds `The other square root of $w$ is $-z$, which is not offered.`

Distinct: at difficulty 1, 24 bases × the distractor sample — well above 25 (the render includes the options).

Append `powerModulus, powerReverse` to `planeGenerators` after `complexPower`.

**Lesson `cn-l4-powers`**, rewritten to 11 guided slides:

```
teach(T1), ask('complex-power'), ask('complex-power+choice'), ask('power-reverse'),
teach(T2), ask('complex-power', 2), ask('power-modulus'), ask('complex-power+choice', 2),
teach(T3), ask('power-modulus', 2), ask('power-reverse', 2)
skillCheck: [ask('complex-power', 2), ask('power-modulus', 2), ask('power-reverse', 2)]
```

- T1 (existing four blocks, plus one): `Turned round: given $w$, which $z$ has $z^2 = w$? Raise each candidate and see — $(1 + i)^2 = 2i$, so $1 + i$ is a square root of $2i$, and so is $-(1 + i)$.` (Before `power-reverse@1`.)
- T2 (existing six blocks, plus one after the De Moivre display): `The modulus half works on its own, for any angle: $|2 + i| = \\sqrt{5}$, so $|(2 + i)^3| = (\\sqrt{5})^3 = 5\\sqrt{5}$, with no need to find the argument at all.` (Before `power-modulus@1`.)
- T3 (existing, unchanged).

**Test count after unit 3: 3313 + 39 = 3352** (`power-modulus` and `+choice` 26; `power-reverse` 13). Commit message: `Powers: the modulus of a power, and which z has z^n = w`.

**Mutations after the commit:**

- M-3-short (killed by `offers exactly one correct option, and distractors that are really wrong`): write the correct option in `choices` as one line, exactly `      { tex: surdTex(n0 ** k), answer: surdAnswer(n0 ** k) },` (the trailing ` },` is what keeps the pattern off `render`'s `answer:` line). Then `eval/bin/mutate.sh src/content/generators/complexPlane.ts 's/answer: surdAnswer(n0 \*\* k) },$/answer: surdAnswer(n0 ** (k - 1)) },/' -- npx vitest run src/content/generators/generators.test.ts -t 'power-modulus > offers exactly one'` — the correct option's value becomes the one-power-short distractor's, and the test reports that distractor as not wrong. (Mutating the distractor's `tex` instead would make `options()` drop it as a duplicate label and the mutant would survive — the guard here is the value comparison, so the mutation has to create a value collision under two different labels.) Read the diff: exactly one line.
- M-3-oracle (killed by the scratch oracle, **survives the suite**): `eval/bin/mutate.sh src/content/generators/complexPlane.ts 's/^ *const eligible = REVERSE_BASES.filter(.*$/    const eligible = REVERSE_BASES.filter((c) => c.re !== base.re || c.im !== base.im);/' -- npx vite-node <scratchpad>/oracle.ts power-reverse` — with the value filter gone, `-z` is offered for even n and the slide has two right answers. Record that the suite passes with this mutation applied (run it with `-t 'power-reverse'` too and quote `MUTANT SURVIVED`): a native `choice` slide's second correct option is invisible to every existing guard. This is the second residual on the record.

### 3.4 Unit 4 — Division: which multiplier, and division undone (priority 5)

**`src/content/generators/complexArithmetic.ts`**, both after `complexDivide`:

**`divide-reverse`** — `expression` with `choices`, working backwards. `interface DivideReverseParams { p: number; q: number; c: number; d: number }`, sampled exactly as `complexDivide` (`span = difficulty >= 2 ? 5 : 3`; `p, q = nonZero(rng, span)`; `c, d = nonZero(rng, 3)`). `render`: `const [zr, zi] = mulComplex(p, q, c, d);` on its own line; prompt: prose `Division undoes multiplication. If`, display `` `\\dfrac{z}{${complexTex(c, d)}} = ${complexTex(p, q)}` ``, prose `what is $z$?`; `lead: 'z ='`; `keypad: I_KEY`; `answer: complexAnswer(zr, zi)`; `domain: 'complex'`; `mode: 'exact'`. `choices`: correct `opt(zr, zi)`; the conjugate used `opt(...mulComplex(p, q, c, -d))` (differs since d ≠ 0 and p + qi ≠ 0); `i²` forgotten `opt(p * c + q * d, p * d + q * c)` (differs since qd ≠ 0); both signs lost `opt(-zr, -zi)` (differs since z ≠ 0). **No sum distractor** — `(p + qi) + (c + di)` equals the product at `p = q = 1, c = 1, d = -1`, and the distractor test would fail on that seed. `solution`: (1) `Multiply back up: $z = (p + qi)(c + di)$.` tex the expansion in `complexMultiply`'s style; (2) the collected result; (3) `Check by dividing again — multiply top and bottom by $${complexTex(c, -d)}$ — and $${complexTex(p, q)}$ returns.`

**`divide-which-multiplier`** — native `choice`, the method question T2 already names. `interface WhichMultiplierParams { a: number; b: number; c: number; d: number }`; `sample`: `c = nonZero(rng, 3)`, `d = nonZero(rng, 3)`, then `a, b = nonZero(rng, difficulty >= 2 ? 5 : 3)` redrawn until `(a, b)` is neither `(c, d)` nor `(c, -d)` — that is exactly the condition under which the four labels below are pairwise distinct. `render`: prompt prose `To write this in the form $a + bi$, what do you multiply the top and the bottom by?` and display `` `\\dfrac{${complexTex(a, b)}}{${complexTex(c, d)}}` ``; four options, **no `answer` fields** (every option's value is 1, and `types.ts` says to leave `answer` off an option that is not being compared as an expression): `` `\\dfrac{${X}}{${X}}` `` for `X` in `complexTex(c, -d)` (correct), `complexTex(c, d)`, `complexTex(a, -b)`, `complexTex(a, b)`; sorted by tex, `polar-form` pattern. `solution`: (1) `The conjugate of the denominator, and only that, makes the bottom real.` tex `` `(${complexTex(c, d)})(${complexTex(c, -d)}) = ${c * c + d * d}` ``; (2) `Multiplying by the denominator itself squares it and leaves it complex; the numerator's conjugate clears nothing at all.`

Append `divideReverse, divideWhichMultiplier` to `arithmeticGenerators` after `complexDivide`. Distinct: both far above 25 at each difficulty.

**Lesson `cn-l2-division`**, rewritten to 11 guided slides:

```
teach(T1), ask('complex-divide'), ask('divide-which-multiplier'), ask('complex-divide+choice'),
teach(T2), ask('complex-divide', 2), ask('divide-reverse'), ask('complex-divide+choice', 2),
teach(T3), ask('divide-reverse', 2), ask('divide-which-multiplier', 2)
skillCheck: [ask('complex-divide', 2), ask('divide-reverse', 2), ask('divide-which-multiplier', 2)]
```

- T1 (existing, unchanged — it already says "the conjugate of the denominator").
- T2 (existing four blocks, plus one): `Division is multiplication run backwards: if $\\dfrac{z}{w} = u$ then $z = uw$. So a quotient can always be checked, and a missing $z$ recovered, by multiplying.` (Before `divide-reverse@1`.)
- T3 (existing, unchanged).

**Test count after unit 4: 3352 + 39 = 3391** (`divide-reverse` and `+choice` 26; `divide-which-multiplier` 13). Commit message: `Division: which multiplier makes the bottom real, and division undone`.

**Mutations after the commit:**

- M-4-labels (killed by `renders a well-formed slide for every seed`, duplicate option label): `eval/bin/mutate.sh src/content/generators/complexArithmetic.ts "/id: 'divide-which-multiplier'/,/^};/ s/while (.*$/while (false) {/" -- npx vitest run src/content/generators/generators.test.ts -t 'divide-which-multiplier > renders a well-formed'` — with the exclusion gone, some seed draws `(a, b) = (c, d)` and two labels coincide. Write the redraw as a `while` loop so this single-line mutation applies; read the diff.
- M-4-oracle (killed by the scratch oracle): `eval/bin/mutate.sh src/content/generators/complexArithmetic.ts "/id: 'divide-reverse'/,/^};/ s/mulComplex(p, q, c, d);$/mulComplex(p, q, c, -d);/" -- npx vite-node <scratchpad>/oracle.ts divide-reverse` — the answer becomes the conjugate-used slip; the oracle divides its answer by `c + di` with mathjs and compares to `p + qi`.

### 3.5 Unit 5 — Square roots: check a candidate by squaring it (priority 6, lesson only, needs unit 3)

**Lesson `cn-l3-sqrt`**, 11 guided slides (from 11):

```
teach(T1), ask('complex-sqrt'), ask('complex-sqrt+choice'), ask('power-reverse'),
teach(T2), ask('complex-sqrt', 2), ask('modulus', 2), ask('complex-sqrt+choice', 2),
teach(T3), ask('complex-sqrt', 2), ask('modulus+choice', 2)
skillCheck: [ask('complex-sqrt', 2), ask('power-reverse'), ask('modulus', 2)]
```

`power-reverse` at difficulty 1 is always `n = 2`: "which of these squares to w" is the square-root check. `complex-sqrt` drops from 6 of 8 to 5 of 8 questions. T1 (existing three blocks, plus one): `Checking a candidate is one multiplication: square it and compare with $z$. $(2 + i)^2 = 3 + 4i$, so $2 + i$ is a square root of $3 + 4i$ — and $-2 - i$ is the other.` **No new generator; test count unchanged at 3391.** Commit message: `Square roots: check a candidate root by squaring it`. No mutation; the containment test and the shape guards are the gates.

### 3.6 Unit 6 — The plane: identify a point from four, and plot a sum (priority 7)

**`src/content/generators/complexPlane.ts`:**

1. Add `choices` to `identifyPoint`: `({ re, im }) => { const opt = (x, y) => ({ tex: complexTex(x, y), answer: complexAnswer(x, y) }); return options(opt(re, im), opt(im, re), opt(-re, im), opt(re, -im)); }` — the parts swapped, and each sign lost. When `re = 0` or `im = 0` (difficulty 2 only) a distractor's `tex` equals the answer's and `options()` drops it, leaving three; when `re = im` the swap is dropped likewise. `-0` renders as `0` through `complexTex` (`-0 === 0` is true, so the `a === 0` branch is taken). The derived `identify-point+choice` keeps the diagram (the prompt is lifted whole) and drops the bare `z` lead.

2. **`plot-sum`** — `plot`, applying the vector picture the third teach slide already draws. `interface PlotSumParams { a: number; b: number; c: number; d: number }`; `sample`: at difficulty 1 each of `a, b, c, d = rng.int(1, 3)`, redrawn until `a + c <= RANGE` and `b + d <= RANGE`; at difficulty 2 each `nonZero(rng, 3)`, redrawn until `|a + c| <= RANGE` and `|b + d| <= RANGE`. `render`: prompt `` `Plot $z + w$, where $z = ${complexTex(a, b)}$ and $w = ${complexTex(c, d)}$.` ``; `range: RANGE`; `answer: { re: a + c, im: b + d }`. `solution`: (1) `Add the real parts and the imaginary parts.` tex `` `(${complexTex(a, b)}) + (${complexTex(c, d)}) = ${complexTex(a + c, b + d)}` ``; (2) `On the plane: go to $z$, then move by $w$ — $${c}$ across and $${d}$ up — and the two routes to the same point are addition being commutative, drawn.` (Keep the `paren` treatment or a `${d < 0 ? 'down' : 'up'}` reading for negatives at difficulty 2, as `plotPoint`'s solution does.)

Distinct: `plot-sum` 36 / far above 25. Append `plotSum` after `plotPoint` (or after `conjugatePlot`).

**Lesson `cn-l3-plane`**, rewritten to 11 guided slides:

```
teach(T1), ask('identify-point'), ask('plot-point'), ask('identify-point+choice'),
teach(T2), ask('plot-point'), ask('identify-point'), ask('plot-point', 2),
teach(T3), ask('plot-sum'), ask('plot-sum', 2)
skillCheck: [ask('identify-point', 2), ask('plot-point', 2), ask('plot-sum', 2)]
```

All three teach slides unchanged: T3 already teaches addition as two moves on the plane and asked nothing about it.

**Test count after unit 6: 3391 + 26 = 3417** (`identify-point+choice` 13; `plot-sum` 13). Commit message: `The plane: identify a point from four, and plot a sum`.

**Mutation after the commit:**

- M-6-range (killed by `renders a well-formed slide for every seed`, plot answer outside the grid): `eval/bin/mutate.sh src/content/generators/complexPlane.ts "/id: 'plot-sum'/,/^};/ s/while (.*$/while (false) {/" -- npx vitest run src/content/generators/generators.test.ts -t 'plot-sum > renders a well-formed'` — with components up to 3 and no redraw, a sum of 6 leaves the range-4 grid within a few seeds. Write the redraws as `while` loops so the mutation applies; read the diff (two loops at difficulty 1 and 2 may both change — fine).

## 4. Reused versus new

Reused, unchanged: `modulus-steps` and `modulus-steps+choice` (reduce / evaluate — still on `TRIPLES`), `complex-conjugate` (both branches are `expression`), `complex-divide`, `complex-power`, `complex-sqrt`, `identify-point`'s typed form, `plot-point`, and every generator in the four level checks. Kind sets at the asked difficulties were computed here from the registry (section 10, item 8).

Changed: `modulus` (surd answers, `alsoAccepts`, `choices` via the shared builder; id unchanged, so `cn-l3-sqrt`, `cn-l4-argument` and the `cn-l3` level check pick up surds without an edit); `identify-point` (gains `choices`).

New: ten base generators and five derived forms (section 3 header). Registry 232 → **247**. Typed answer forms: a surd through the root template (`sqrt(13)`, `2sqrt(5)`), a complex number through `I_KEY` (as every existing complex slide), and nothing else — no new keypad key, no new slide kind.

## 5. Constraints and the tests that catch each

All in `/home/user/Maths-Trainer/src/content/generators/generators.test.ts` unless stated.

| Constraint | Caught by |
| --- | --- |
| Every skill-check family is asked in its lesson's guided deck — repo-wide | **`checks only skills the lesson practised`** (new, unit 0); M-0-swap proves it fires; its pre-fix run shows the 18 lines |
| Surd answers grade, and the simplified writing grades | `produces an answer its own checker accepts`; `accepts every other writing it promises` (M-1-surd) |
| A perturbed surd is rejected | `rejects a perturbed answer` (`(sqrt(13)) + 1`) |
| The `(1, 1)` exclusion is load-bearing | the distractor test under M-1-pair |
| The teach-slide promise about `√20` / `2√5` has a declaring generator behind it | `backs every promise that another writing is accepted` |
| Every backslash doubled; every fragment valid TeX; no bare `sqrt`/`dfrac`/`overline` | `renders every piece of TeX it emits`; `renders every authored TeX fragment without error`; `never lets a TeX command lose its backslash` |
| Native `choice` options unique in id and label | `renders a well-formed slide` (M-4-labels) |
| A plot answer is on the grid | `renders a well-formed slide` (M-6-range) |
| Distractors wrong, exactly one correct, labels distinct — on every `choices()` generator | `offers exactly one correct option, and distractors that are really wrong` (M-2-root, M-3-short) |
| ≥25 distinct questions per difficulty | `can ask more distinct questions than a lesson has slides` |
| Solutions exist and vary | the two solution tests |
| 9–11 guided slides, first a teach, exactly 3 skill-check, no teach in a skill check | the four lesson-shape tests |
| No repeated question in a lesson or level check across 40 seeds | the two duplicate sweeps |
| No run of 3 with a common kind; no lesson whose asks share one kind | the two shape guards — every rewritten deck checked here by hand (section 10, item 8) |
| `TRIPLES` stays a table of genuine triples | `holds a genuine Pythagorean triple in every modulus row` (unchanged; the import stays) |
| Reduce banks whole | the reduce sweep — untouched, since `modulus-steps` is untouched |
| **A new generator's answer is right, not merely self-consistent** | **No suite test.** The scratch oracle (section 6), proved able to fail by M-1-oracle, M-2-oracle, M-3-oracle, M-4-oracle; the suite's blindness recorded by M-1-value and M-3-oracle's survival |
| **A native `choice` slide has exactly one satisfying option** | **No suite test** (the distractor test needs `choices()`, and `modulus-which`, `modulus-compare`, `power-reverse`, `divide-which-multiplier` are native). The oracle checks it; M-3-oracle proves that |
| Real type errors | `npx tsc --noEmit -p tsconfig.app.json` and `-p tsconfig.eval.json` after every unit |
| Lint | `npm run lint`: 0 errors, 25 warnings, unchanged |
| Test count moves exactly as predicted | 3222 → 3274 → 3313 → 3352 → 3391 → 3391 → 3417 |
| Diff confined to section 0's table | nothing catches this; `git diff --stat $(git merge-base HEAD origin/main)` before each commit |
| `eval-advisor.log` only grows | `git diff --stat -- eval-advisor.log` shows insertions only |

## 6. The scratch oracle, and the working loop per unit

### 6.1 `oracle.ts` — written in unit 1, extended each unit, never committed

Lives in your scratchpad, run as `npx vite-node <path>/oracle.ts <generator id>`. It imports **only** `registry` from `src/content/registry`, `makeRng` from `src/engine/rng`, and `math` from `src/engine/expression` — never a generator file, never `format.ts` (task 2's precedent: an oracle that imports the helpers it is checking checks nothing). For each named generator it draws 200 seeds × 2 difficulties, renders, and checks with mathjs, exiting non-zero on any disagreement and printing `draws: N, failures: M` per generator:

| Generator | What the oracle recomputes, from the rendered slide |
| --- | --- |
| `modulus` | parse `a + bi` out of the prompt's `$|…|$`; `math.abs(math.complex(a, b))` must equal `math.evaluate(answer)` and every `alsoAccepts` entry |
| `modulus-distance` | the two numbers from the prompt; `abs(z - w)` likewise |
| `modulus-which` | parse the target modulus from the prompt and every option label; exactly one option has `abs` equal to it, and it is `correctId` |
| `modulus-compare` | parse the four labels; the unique maximum `abs` is `correctId` |
| `conjugate-plot` | the number in the prompt; `answer` equals `conj` of it |
| `conjugate-recover` | `a` and `n` from the prompt; `answer` has real part `a`, `abs²` = `n`, positive imaginary part |
| `power-modulus` | `z` and `k` from the prompt; `abs(z)^k` equals `evaluate(answer)` |
| `power-reverse` | `w` from the display block and every label; exactly one label's `n`-th power equals `w`, and it is `correctId` |
| `divide-reverse` | `c + di` and `p + qi` from the display; `evaluate(answer) / (c + di)` equals `p + qi` |
| `divide-which-multiplier` | the denominator from the display; the option labelled with its conjugate over itself is `correctId` |
| `plot-sum` | `z`, `w` from the prompt; `answer` equals `z + w` |
| `identify-point+choice` | the diagram is not parsed; instead the label at `correctId` must equal `complexTex` of the *typed* form's answer for the same seed and difficulty, obtained by rendering `identify-point` itself |

Parsing the TeX `complexTex` emits (`-3 + 2i`, `4 - i`, `5`, `-i`, `0`) is a twenty-line function; write it once and unit-check it on those five strings at the top of the file. Every oracle run's summary line goes in the report, and the four M-*-oracle mutations are the proof it can fail.

### 6.2 The loop, per unit

`mutate.sh` refuses a file with uncommitted changes (exit 2), so **mutations run after the unit's commit and before its push**. A surviving gate mutation blocks the push, not the commit.

1. Write the code and the deck. `npx vitest run src/content/generators/generators.test.ts -t '<id>'` green at the per-generator count (13, or 26 with a `+choice` form; never put `+choice` in a `-t` pattern — `+` is a quantifier; scope with the `' > '` form).
2. `npm test` (count exactly as predicted), `npx tsc --noEmit -p tsconfig.app.json`, `npx tsc --noEmit -p tsconfig.eval.json`, `npm run lint` (0 errors, 25 warnings). After the last unit only: `npm run build`.
3. Run the oracle on every generator the unit adds or changes; save its output.
4. `git diff --stat $(git merge-base HEAD origin/main)` lists only this unit's files.
5. **Consult the advisor on this unit's diff only**, `model: "opus"` on the Agent call. Ask it, specifically: for each new generator, whether the prose the learner reads and the `answer`/`correctId` describe the same question (the residual no test sees); whether any native `choice` slide can have two satisfying options; and whether the teach prose teaches every form asked after it. Read `eval-advisor.log`, **append** (question, summary, the advisor's self-reported model quoted verbatim, gate numbers, oracle summary, the previous unit's mutation outputs where not yet logged); never write the file. `git diff --stat -- eval-advisor.log` shows insertions only.
6. **Commit: `git add <this unit's files> eval-advisor.log` in one command**, so the consultation's entry is inside the commit it covers. This is the tamper-evidence instrument; a log commit at the end of the session would destroy it. Commit message as given, ending with the attribution lines your session's system reminder specifies.
7. **If the consultation has not returned and the environment is pressing you to stop, you may commit now** — task 6's worker restarted twice mid-run (`worker_epoch: 3`) and committing early was the right call. Log it as such in the entry you commit (*"committing with consultation N in flight"*), and when the consultation returns, append a follow-up entry and apply its findings in a fix-forward commit that carries that entry. **Do not push until the consultation has returned and its findings are applied.** That is the rule the week settled on after task 6 and it is not negotiable: a commit is local and revisable; a push is where work leaves the session.
8. Run every mutation listed for the unit. Gate mutations must print `mutant killed`; M-1-value and M-3-oracle-under-the-suite must print `MUTANT SURVIVED` and are recorded, not fixed. Read each printed diff and confirm it changed only the intended line(s); `git status --short` is empty after each. Save every harness output verbatim.
9. If every gate mutation was killed and the consultation has returned: `git push origin week/task7-complex-variety`. If a gate mutation survived, do not push; fix in a new commit with its own consultation, re-run, then push.
10. After the last unit, one **bookkeeping** commit: `eval/reports/TASK7-REPORT.md`, plus an append to `eval-advisor.log` carrying the last unit's mutation outputs and a logged statement that no consultation was held for this commit and why (PREFLIGHT: bookkeeping commits get mechanical checks, not a consultation). Push it.

**When a gate goes red** outside what section 3 predicts: read the failure, reproduce it on its seed, decide from the numbers which side is wrong. The fix is in sampling or a filter — narrow a range, exclude a value, redraw. It is never: deleting a distractor's `answer`, dropping `alsoAccepts`, changing `domain` or `mode` or `probePolicy()`, editing anything under `src/engine/` or `src/content/expr.ts`, editing `generators.test.ts` beyond the one test in unit 0, or trimming a sample count or timeout. If you believe the test itself is wrong: stop, leave the tree uncommitted, and report the seed and both expressions.

**Refusing or amending this plan.** You may decline any step here that you find wrong, and you should — a plan written cold can be wrong about the tree. But an unlogged refusal is indistinguishable from a step nobody ran. **Log a refusal like a step**: append to `eval-advisor.log` the step refused, the reason, and what you did instead, in the commit where the deviation lands, and say the same in the report under its own heading. The plan file itself is never edited.

### 6.3 What the report must contain, beyond the usual

- **A consultation-timing table, one row per unit commit and per fix-forward commit:** commit sha; whether the consultation had **returned before the commit**; whether it had **returned before the push**; the log entry heading it corresponds to. **Re-read `eval-advisor.log` from the top before writing this table**, and make each row match the log line for line. Task 6's report said two units committed with consultations in flight when its own log, in the commit immediately before the report, said three. The reconciler cannot see this; only you can, and only by reading what you wrote rather than remembering it.
- The pre-fix red run of the containment test (18 lines) and the two `variety.sh` outputs (before and after unit 0), verbatim.
- The eleven non-CN lessons touched, named, with the statement that each is an id swap only.
- Every oracle summary line and every mutation output, verbatim, including the two expected survivals with the sentence saying why each survives.
- The advisor's self-reported model on every entry, quoted.
- The deferred items of section 0 and the residuals of section 5, named for the owner.
- Its counted claims in a fenced ```counts``` block with the same six keys as section 7's. Write "fourteen lessons" in words in prose — the reconciler's prose sweep reads `14 lessons` as a claim. **Do not run `eval/bin/counts.sh` on your own report as a gate**; you may run it to find your own mistakes, but its exit code is not evidence. The orchestrator runs it at stage 6 with their own suite log.

## 7. Done

- `checks only skills the lesson practised` exists in `generators.test.ts`, was seen red with 18 lines before any course edit, and is green on the pushed tree; M-0-swap killed.
- `eval/bin/variety.sh` runs from the repository root on the pushed tree and prints `stray skill checks: 0`; its `repetitive:` line for `--course complex-numbers` is **5 of 14** if every unit landed (the note below says which five remain) — the report quotes the actual line.
- `grep -n "id: '" src/content/generators/complexPlane.ts src/content/generators/complexArithmetic.ts` shows the ten new base ids; the report names them from the grep.
- `grep -n accepted src/content/courses/complexNumbers.ts` → exactly one line, in `cn-l3-modulus`.
- `grep -c "TRIPLES" src/content/generators/complexPlane.ts` unchanged in meaning: the table, its export and all 30 rows intact; `modulus` no longer reads it.
- Every gate mutation killed by the named test with its message quoted; M-1-value and M-3-oracle's suite run survived and are reported as such, with why; every M-*-oracle killed.
- `npm test` **3417** (or 3222 / 3274 / 3313 / 3352 / 3391 / 3391 per the stop rule), both `tsc` silent, lint 0 errors / 25 warnings, `npm run build` passes on the pushed tree; `git status` clean; branch pushed; `main` untouched locally and remotely.
- The report asks the owner to open `cn-l3-modulus` and `cn-l2-division` on the phone once merged: a `\sqrt{}` in a four-option choice and a `\dfrac{c - di}{c - di}` label are the surfaces most likely to wrap or sit tall at 393 px, and no test sees layout.

Note on the `repetitive:` line: of the fourteen Complex Numbers lessons, the units above reshape six (`cn-l3-modulus`, `cn-l2-conjugates`, `cn-l4-powers`, `cn-l2-division`, `cn-l3-sqrt`, `cn-l3-plane`). Measured here, ten of fourteen are repetitive at the anchor; the four reshaped lessons that were counted (`cn-l2-conjugates`, `cn-l2-division`, `cn-l3-modulus`, `cn-l4-powers`) and `cn-l3-sqrt` (75%) drop below the threshold, so **the expected line is `repetitive: 5 of 14`** with `cn-l1-arithmetic` (71%), `cn-l1-quadratics` (75%), `cn-l2-multiply` (71%), `cn-l4-polar` (75%) and `cn-l4-de-moivre` (75%) remaining. They are the next task's list, and the report says so. The line is a prediction of the same standing as the block below: a different number is explained, not absorbed.

**The prediction below is frozen.** If the tree lands elsewhere — an advisor finding adds or removes a generator, a unit is dropped, a `choices()` is added or withdrawn — the report explains the difference, line by line, and this file is left exactly as it is. Task 6's block landed to zero; tasks 3–5 went stale and said so. Either is fine. Editing the plan green is not.

```counts
course: src/content/courses/complexNumbers.ts
lessons: 14
lesson-ids: cn-l1-roots, cn-l1-arithmetic, cn-l1-complex, cn-l1-quadratics, cn-l2-multiply, cn-l2-conjugates, cn-l2-division, cn-l3-plane, cn-l3-modulus, cn-l3-sqrt, cn-l4-argument, cn-l4-polar, cn-l4-powers, cn-l4-de-moivre
level-checks: 15/12/15/15
generators: modulus-which, modulus-compare, modulus-distance, modulus-distance+choice, conjugate-plot, conjugate-recover, conjugate-recover+choice, power-modulus, power-modulus+choice, power-reverse, divide-reverse, divide-reverse+choice, divide-which-multiplier, identify-point+choice, plot-sum
tests: 3417
```

## 8. Risks, each classified — (a) caught by an existing check, (b) catchable by a check that does not yet exist, (c) rule only

| Risk | Handling | Class |
| --- | --- | --- |
| A new generator's answer is wrong but self-consistent | The scratch oracle, proved live by four mutations; the advisor reads prompt ↔ answer per generator | (b) in principle — a `modulusOf`-style `source` field for the suite is real work and out of scope; (c) here, with the oracle as the instrument |
| A native `choice` slide has two satisfying options | Construction (strict inequalities in `modulus-which`; value filter in `power-reverse`; unique max in `modulus-compare`); the oracle checks it; M-3-oracle proves the suite cannot | (b) — a generic guard would need every native choice to declare its own oracle; named in the report as a candidate |
| The `(1, 1)` pair reaches `modulusChoices` | Excluded in the sampler; M-1-pair | (a) |
| `alsoAccepts` declared as the trivial `[answer]` | Declared only when the simplified string differs; the negative control in the `alsoAccepts` test | (a) |
| The promise sentence unbacked | The promise guard; `modulus@1` declares on the draws where the surd simplifies | (a) |
| A learner types the modulus as a decimal | Accepted at eight significant figures; documented in section 2.2 as intended | (c) — do not tighten the checker |
| `modulus-steps` handed a surd | It is untouched and still reads `TRIPLES`; the reduce bank sweep asserts whole values | (a) |
| Level-check bests retired | No level check changes; nothing retires | (a) — `progress.test.ts` pins the rule, and it is not triggered |
| A run of three same-kind questions | Decks checked here by hand against `commonShape`; the two guards | (a) |
| The de-duplicator runs out of draws | Pools ≥ 30 everywhere (the smallest is `conjugate-recover` at 30 / `power-modulus` at 32 at difficulty 1); the floor test and the 40-seed sweep | (a) |
| TeX: a stripped backslash or an invalid fragment | The strict sweep and the denylist; every display string above is written with doubled backslashes | (a) |
| `-t 'modulus'` over-matches eight ids; `-t` with `+` matches nothing | Use the `' > '` form; a `no tests found` line is not a pass — read it | (c) |
| A mutation's sed matches more or fewer lines than intended | Every pattern anchored to a line written "exactly" above, or ranged with `/id: '…'/,/^};/`; the harness prints the diff and refuses a no-op | (a) for a no-op; (c) for an over-match — read the diff |
| Advisor consulted after the push, or its entry landed in a later commit | One consultation per unit; the push gated on its return; the entry `git add`ed with the code | (c) today; the commit-inclusion check at stage 6 is the instrument |
| The report's timing table disagrees with the log | Section 6.3: re-read the log before writing it | (b) — counting the log's entry shapes is a candidate for a later repair task, named in WEEK.md; (c) here |
| Diff scope creep (a "fix" to `SQRT_KEYS`' `)` key; touching a level check; editing PITFALLS §3.11) | Section 0's table; the deferred list | (c) |
| Layout on the phone (`\sqrt{}` and `\dfrac` inside choice labels) | Nothing in the container; flagged for the owner | (c) |
| Session budget | Fixed order; 4, 5, 6 droppable; each unit is one or two generators, one deck, a ~100 s suite, one oracle run and two to four scoped harness runs | (c) |

## 9. Defect classes from `eval/WEEK.md`, checked against this plan

1. **Prose promising what only a field upholds.** One promise is made, in T1 of the modulus lesson, and it is true because `modulus` declares `alsoAccepts` — pinned by the promise guard and by M-1-surd. No other new sentence uses `accepted`; section 2.2 says the decimal behaviour is accepted behaviour without promising it to the learner.
2. **A check that cannot fail.** The containment test is run red on the anchor tree before any swap and killed again by M-0-swap after; the oracle is killed by four mutations; two suite survivals are *expected* and recorded so the record shows a gap where one exists.
3. **A sample presented as a sweep.** Distinct-question counts above are enumerations, not runs, and are labelled as such; the floor test over 600 seeds is the decider. The 18 stray pairs, the 83 repetitive lessons and the 16 level-check strays are exhaustive walks of the tree, not samples.
4. **Checked a different condition than the one that ships.** The checker probes in section 10 use `checkAnswer` with the slide's own `domain: 'real', mode: 'exact'`; the keypad claim was read from `applyKey` and `toAnswer`, and the serialised string `2sqrt(5)` was then graded — not driven headlessly (section 10, "not verified").
5. **The account diverging from the work.** Counted claims in the `counts` block; ids from grep; the plan frozen; and — the class that moved house in task 6 — the timing table written from the log, not from memory.

## 10. Verified in this container (Node v22.22.2, GNU sed 4.9, vitest 5.0.0, vite-node via `npx`), with the command

Scratch scripts were run with `npx vite-node <scratchpad>/…ts`, importing from `/home/user/Maths-Trainer/src/…` by absolute path. No repository file was modified; `git status --short` was empty throughout.

1. Baseline on `main` at `0b780bb`: `npx vitest run` → `Tests 3221 passed (3221)`, 7 files, 99.54 s, exit 0. Registry 232 ids, 105 lessons (a script importing `registry` and `courses`). None of the fifteen new registry ids exists.
2. `eval/bin/counts.test.ts` is one of the 7 suite files (there is no vitest config; every `*.test.ts` is collected) — which is why the scan gets no test file and why a unit's test delta is exactly 13 per registered generator plus the one course-integrity test.
3. Containment, from a script over `courses`: strip `+choice` and `-steps` → **18 pairs in 17 lessons**, the list in section 2.1; strip `+choice` only → 20 pairs (adds `cn-l4-argument -> modulus`, `vm-l3-singular -> mat-determinant`); per `id@difficulty` → 176 pairs. Every replacement in section 3.0(c) is a family asked in that lesson's guided deck at the anchor (the eleven decks were printed and read).
4. Repetition, same script: dominant family ≥ 70% of ≥ 5 guided questions → **83 of 105**; per course prefix `er 10/12, qd 9/12, tf 10/15, lg 8/12, cn 10/14, df 11/11, in 13/17, vm 12/12`; Complex Numbers by lesson: `roots 29%, arithmetic 71%, complex 57%, quadratics 75%, multiply 71%, conjugates 100%, division 100%, plane 57%, modulus 100%, sqrt 75%, argument 67%, polar 75%, powers 100%, de-moivre 75%`. Level-check families not asked in their level: **16** (`tf-l2 → trig-amplitude`; `tf-l3 → trig-amplitude, trig-midline`; `df-l2 → sum-rule ×4`; `df-l3 → product-rule ×3, quotient-rule ×3`; `df-l4 → chain-rule ×3`).
5. Checker, `checkAnswer(user, expected, { domain: 'real', mode: 'exact' })`: `sqrt(13)`, `13^(1/2)`, `sqrt(9+4)`, `sqrt(3^2+2^2)`, `sqrt((-3)^2+2^2)`, `3.605551275`, `3.6055513` → **correct** vs `sqrt(13)`; `3.60555`, `3.6`, `13`, `5`, `sqrt(13)+1`, `sqrt(-13)` → **incorrect**; `2*sqrt(5)` vs `sqrt(20)` and the reverse → correct; `sqrt(25)` vs `5` → correct; `2sqrt(5)` vs `sqrt(20)`, `5sqrt(5)` vs `sqrt(125)`, `sqrt(5)^3` vs `5*sqrt(5)` → correct (implicit multiplication parses). `domain: 'complex'` on `sqrt(13)` also correct. A constant answer takes the no-variable branch of `checkAnswer` (`equivalence.ts:148`), a single evaluation at `relativeTolerance: 1e-8`, which is where the eight-figure threshold comes from.
6. Keypad: `src/ui/slides.tsx:149` maps `insert: 'sqrt('` to `insertRoot` (a template), and `mathInput.tsx:312` serialises a root node as `sqrt(<arg>)`; `BASE_KEYS` are digits, `+`, `−`, `.`, `=`; no `×` key exists, so a coefficient before a root is typed as juxtaposition, which item 5 shows parses.
7. Kinds over 200 seeds per difficulty from the registry: `modulus` expression/expression; `modulus-steps` reduce/reduce; `complex-conjugate` expression/expression; `polar-form` expression at 1, choice+expression at 2; `complex-part` choice/choice; `identify-point` expression/expression. Native `choice` and `plot` slides have no `alsoAccepts`/oracle path and are skipped by the expression-only tests — that is a skip, not a pass, and the report says so.
8. Every deck in section 3 walked by hand against `commonShape`'s rule (intersection of kind sets per run between teach slides, and over the whole deck): no run of ≥3 with a common kind, no deck with one common kind. New generators' kinds are fixed by construction (`modulus-which`, `modulus-compare`, `power-reverse`, `divide-which-multiplier` → choice; `conjugate-plot`, `plot-sum` → plot; the rest expression, with their `+choice` forms choice).
9. `TRIPLES` is imported by `generators.test.ts:36` and used at 869–877; nothing else outside `complexPlane.ts` reads it. `rng.sample` is `shuffle(items).slice(0, n)` and throws when `n > items.length` (`rng.ts:71–76`) — `power-reverse`'s eligible list is never shorter than 20, so it cannot throw.
10. `tsconfig.eval.json` includes `eval/bin` and extends `tsconfig.app.json` (so `noUnusedLocals` applies to `variety.ts` too); `countsCore.ts` exports `scriptArgs`.

**Not verified here — for the executor:** the exact distinct-render counts of the new generators (enumerated on paper from the sampling specified; the floor test decides, and any generator that lands under 25 is widened in sampling, never by adding a cosmetic parameter); every sed pattern in section 3 (written against code that does not exist yet — read the harness's printed diff every time, and if a pattern matches nothing, fix the *pattern* to the line you wrote, not the line to the pattern, and log the amendment); vitest's exact failure wording for each kill (the messages above are the `expect` strings in the test file with plausible values substituted); that `String(-0)` renders as `0` through `complexTex` (a JavaScript fact I am confident of but did not execute); that `\\dfrac` inside a choice option label renders at a usable height on a phone; that `'sqrt('`'s template behaves the same when a learner types a digit *before* pressing it (read, not driven); and the advisor's self-reported model, which only the log can show.

### Critical files
- /home/user/Maths-Trainer/src/content/generators/generators.test.ts (edited once, unit 0: one test)
- /home/user/Maths-Trainer/src/content/choiceVariant.ts (edited once, unit 0: `familyOf`)
- /home/user/Maths-Trainer/eval/bin/variety.ts, /home/user/Maths-Trainer/eval/bin/variety.sh (new, unit 0)
- /home/user/Maths-Trainer/src/content/courses/complexNumbers.ts (units 0–6)
- /home/user/Maths-Trainer/src/content/courses/differentiation.ts, trigonometricFunctions.ts, vectors.ts (unit 0, id swaps only)
- /home/user/Maths-Trainer/src/content/generators/format.ts (unit 1: surd helpers)
- /home/user/Maths-Trainer/src/content/generators/complexPlane.ts (units 1, 2, 3, 6)
- /home/user/Maths-Trainer/src/content/generators/complexArithmetic.ts (units 2, 4)
- /home/user/Maths-Trainer/eval-advisor.log (append only, every commit)
- /home/user/Maths-Trainer/eval/reports/TASK7-REPORT.md (new, final bookkeeping commit)
- /home/user/Maths-Trainer/eval/bin/mutate.sh, /home/user/Maths-Trainer/eval/bin/counts.sh (run, never edited)
- /home/user/Maths-Trainer/src/content/expr.ts, /home/user/Maths-Trainer/src/engine/equivalence.ts, /home/user/Maths-Trainer/src/ui/slides.tsx, /home/user/Maths-Trainer/src/ui/mathInput.tsx (read only)
- /home/user/Maths-Trainer/eval/PREFLIGHT.md, /home/user/Maths-Trainer/eval/FLOW.md, /home/user/Maths-Trainer/CLAUDE.md, /home/user/Maths-Trainer/PITFALLS.md (binding)
