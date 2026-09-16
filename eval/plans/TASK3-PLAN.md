<!-- Provenance: written by Fable 5.1 (`fable-planner`, effort: high). Verbatim
except for this header and the removal of a trailing addendum reviewing the
planner-prompt template, which is not part of the plan. Task 3 of the week of
real use; see ../WEEK.md and ../FLOW.md. -->

# Plan: task 3, repair the instruments (three repairs, four units, staged)

Task 3 of the week of real use. Executor starts cold; this text is the whole brief. Read alongside `/home/user/Maths-Trainer/eval/PREFLIGHT.md` (binding) and `/home/user/Maths-Trainer/CLAUDE.md` (binding). Written against `main` at `7587222`; nothing below is pinned to that hash.

## 0. The scoping decision (read this first)

**Do all three repairs, in this order, as four units — and build the perturbation harness first, because the other three units use it for their proof.** The brief ranked the harness last, "only if the first two leave room". Reversing that is the one judgement call here, and the reason is mechanical: every unit in this task has to demonstrate a guard going red on a mutated tree and green on the real one, then restore the tree. Done by hand that is a copy, an edit, a run, a restore, and a forgotten restore leaves a mutation committed. The harness is about thirty lines of bash, it is the thing PREFLIGHT says a rule should become ("prove a new guard fails against the old code"), and building it first means it is exercised for real four times in this session rather than shipped untested. If it cannot be made to work in twenty minutes, fall back to hand mutation with a `cp`/`cp` restore and drop the harness — do not let it block the repairs.

**Stop rule.** Units are ordered: 1 (harness), 2 (shape guards), 3a (promised writings, generator level), 3b (promised writings, lesson level). Complete = all four. Acceptable = 1, 2 and 3a. Unit 3b is the heuristic half of repair 2 and is the one to drop if time is short; say so in the report if it is dropped. Never start a unit you cannot finish, gate and push.

**What this task does not do.** It does not touch lesson content except `alsoAccepts` declarations on two generators (unit 3a), which are the data the repair needs. It does not add shape checks to skill checks or level checks. It does not edit `eval/WEEK.md` or `eval/PREFLIGHT.md` — findings go in the final report for the owner to log. It does not touch `src/engine/`, `src/ui/`, `src/content/expr.ts`, `src/content/choiceVariant.ts`, `src/content/registry.ts`, or any course file (the course file is mutated only through the harness, which restores it).

**Files that change**, all under `/home/user/Maths-Trainer/`: `eval/bin/mutate.sh` (new), `src/content/generators/generators.test.ts`, `src/content/types.ts`, `src/content/generators/differentiation.ts`, plus `eval-advisor.log` (append only).

**One destination.** The branch the session was created with. `git branch --show-current` must print it, and it must not be `main`, before the first push. Every unit is `git push origin <that branch>`. Never `main`, never a pull request.

## 1. Before writing anything

1. `command -v node || export PATH="$HOME/.local/node/bin:$HOME/.local/gh/bin:$PATH"` (no-op in a cloud container).
2. Work only from the checkout you have been given. Do not consult any other branch and do not run `git log --all`.
3. `git status --short` is empty; `git branch --show-current` prints the session's branch and not `main`.
4. Read in full: `eval/PREFLIGHT.md`; `CLAUDE.md` (the "Testing strategy" and "TeX escaping" sections especially); `eval/WEEK.md` from the heading "The week's real output so far: one defect class, three instances" to the end (about 160 lines) — it is the origin of every unit below; `src/content/generators/generators.test.ts` in full (918 lines — you are editing it, and section 2 says what that means); `src/engine/session.ts` lines 105–139 (`resolveRef`: the one place a slide's difficulty is read, `ref.difficulty ?? 1`); `src/content/choiceVariant.ts` (the derived `+choice` form always renders `choice`, line 103 — so only a base generator can have a params-dependent kind); `src/content/generators/complexPlane.ts` lines 408–520 (`polar-form`: `direction` drawn only at difficulty 2, line 463, and the two renders); `src/content/generators/differentiation.ts` lines 1102–1261 (`df-index-form`) and 1408–1535 (`df-product-mixed`); `src/content/courses/differentiation.ts` lines 201–250 (`df-l1-index`) and 809–860 (`df-l4-combine`); `src/content/courses/complexNumbers.ts` lines 501–533 (`cn-l4-polar`); `eval/bin/score.sh` header (the shell conventions to copy: `set -uo pipefail`, `REPO` resolved from `BASH_SOURCE`).
5. Measure the baseline yourself and record it in the report: `npm test` (expected 2777 passed, 6 files, about 143 s), `npx tsc --noEmit -p tsconfig.app.json` (silent), `npm run lint` (0 errors, 25 warnings — count them with `grep -c ' warning '`; do not "fix" them). No count may drop below what you measure.
6. `sed --version` prints GNU sed (4.9 here). The harness uses `sed -i -e`; if this is not GNU sed, stop and report rather than adapt.

## 2. The line on editing the test file — read before touching it

PREFLIGHT says the fix for a red gate is never "editing the test file". That rule stands, unchanged, throughout this task. The distinction is:

- **Editing a test so that a failing gate passes is forbidden, always.** If anything in `generators.test.ts` goes red during this task other than in the ways section 3 predicts, stop, leave the tree uncommitted, and report the seed and both expressions. This includes reds caused by the harness's mutations that section 3 does not list as expected.
- **Editing a test because the test is the defect is this task's purpose.** Units 2, 3a and 3b change or add tests. Each such edit is named below with the mutation that proves it.
- **The proof obligation is reversed for a repaired guard.** The code is not broken; the guard is. So a repaired guard is not shown "failing against the old code" — it is shown, on one and the same mutation, to be **red where the current guard is green**. That differential is the only evidence that the repair does anything. It is produced by running the harness on the mutation twice: once before the test edit (expect `MUTANT SURVIVED`), once after (expect `mutant killed`). Both outputs go in the commit's advisor-log entry and the final report.
- **A repaired guard that is green on the current, unmutated tree has proved nothing by being green.** That is expected for every unit here — no violation ships today, verified in section 8 — and it is a *precondition*, not a result. The result is the differential.
- **For repair 1 specifically, the call is made: the repaired guards are expected to stay green on `cn-l4-polar` as it stands, so no content change accompanies them.** Verified in section 8: the repaired rule reports zero offenders across all 97 lessons; `cn-l4-polar` is safe because `argument` sits between its two difficulty-2 `polar-form` asks. If the repaired guard goes red on the real tree, that contradicts the measurement here — stop and report rather than edit content.

## 3. What to change, file by file, in order

### 3.1 Unit 1 — `eval/bin/mutate.sh`, the perturbation harness (repair 3, built first)

A committed script that applies one mutation to one file, runs one command, restores the file on every exit path, and **exits non-zero when the command passed** — a check that fails when a check cannot. Spec, not code; write it directly in the file with the conventions of `score.sh`.

Usage line: `eval/bin/mutate.sh <file> <sed-expression> -- <command> [args...]`. File path relative to the repository root.

Behaviour, in this order:

1. `set -uo pipefail` — no `-e`, because the command is *expected* to fail and its status must be read, not aborted on. `REPO` resolved as in `score.sh`; `cd "$REPO"`.
2. Refuse, exit 2, with a message, unless `git diff --quiet -- "$file"` — the file must be clean so the only change the script ever reverts is its own. (`git diff --quiet` is read-only; nothing in the script deletes refs, branches, or remotes.)
3. `backup="$(mktemp)"`; `cp "$file" "$backup"`; `trap 'cp "$backup" "$file"; rm -f "$backup"' EXIT` — restore on success, failure, and Ctrl-C alike. `cp` rather than `mv` so the file's mode and inode are untouched.
4. `sed -i -e "$expr" "$file"`. Then `cmp -s "$backup" "$file"` — if identical, print `mutation did not change <file>: the sed expression matched nothing` and exit 2. This is the guard against WEEK.md's instance 2 (a check that cannot fail): a mutation that did not apply would otherwise read as a kill.
5. Print the mutation on the record: `git --no-pager diff -- "$file"`.
6. Run the command (everything after `--`), streaming its output; capture its exit status.
7. Status 0 → print `MUTANT SURVIVED: the command passed with <file> mutated` and exit 1. Otherwise print `mutant killed: the command exited <status>` and exit 0.

Header comment states: purpose (PREFLIGHT's "prove a new guard fails against the old code", made mechanical after task 2's scratch oracle grew a tolerance that turned 13 disagreements into 0 with the rule in context); the three exit codes (0 killed, 1 survived, 2 harness error); GNU sed required; and the two example invocations below. `chmod +x`. `eval/bin/` is tracked (`.gitignore` ignores `eval/scorers/` only).

**Unit 1's own proof — both directions, both required before committing:**

- Killed (the existing suite catches a perturbed answer): 
  `eval/bin/mutate.sh src/content/generators/differentiation.ts "s/answer: termAnswer(-a \* n, -(n + 1)),$/answer: termAnswer(a * n, -(n + 1)),/" -- npx vitest run src/content/generators/generators.test.ts -t 'df-index-form'` 
  Verified here: the expression changes exactly line 1174 (the `reciprocal` render's answer, sign dropped) and nothing else; the oracle comparison rejects the sign-dropped answer in 16/16 simulated cases. Expected: `mutant killed`, with the test "matches an independent symbolic derivative" naming `d/dx((a) * x^(-n))`.
- Survived (the F2 finding, reproduced mechanically): 
  `eval/bin/mutate.sh src/content/generators/differentiation.ts "/id: 'df-index-form'/,/id: 'df-chain-root'/ s/domain: 'positive'/domain: 'real'/" -- npx vitest run src/content/generators/generators.test.ts -t 'df-index-form'` 
  Verified here: the expression changes exactly lines 1191 and 1205; under `domain: 'real'` the suite's three checks on `df-index-form` (accepts its own answer, rejects a perturbed one, matches the oracle) report 0 failures across 400 draws. Expected: `MUTANT SURVIVED`, exit 1. This is the run unit 3a turns into a kill.

After both: `git status --short` empty (the trap restored the file). Commit message: `Add a mutation runner that fails when a check cannot`.

### 3.2 Unit 2 — `generators.test.ts`, the two shape guards (repair 1)

Both guards decide a generator's shape with `g.render(g.sample(makeRng(1), 1)).kind` — one seed, difficulty 1 (lines 870–873 and 892–895). Lessons ask at `ref.difficulty`, and `polar-form` draws its direction — and so its widget — only at difficulty 2. Measured here: `polar-form` is the only registered generator whose kind set differs from a singleton, and only at difficulty 2 (`choice` and `expression`).

**The repaired rule.** A slide reference's shape is a *set*: every kind the generator renders over the file's `SEEDS` (200) seeds at the difficulty the reference asks. A run of three or more is an offender when there is one kind every reference in the run can take — the intersection of the sets is non-empty — because per-slide seeds are independent (`resolveRef`, session.ts:123), so every combination of kinds is reachable in some sitting. "Varies the shape" is the same rule over all of a lesson's generated references. This asserts *possibility* deterministically rather than sampling resolved decks for an *occurrence*, so a run that comes out one shape in one sitting in eight is flagged every time rather than when one of forty seeds happens to draw it. (The occurrence-sampling alternative through `startSession` was also measured here — zero offenders, 466 ms — and rejected for that reason.)

Edits, all inside `describe('course integrity')`:

- Extend the type import from `'../types'` with `Slide` and `SlideRef`.
- Next to `renderedDecks`, add: `type GeneratedRef = Extract<SlideRef, { type: 'generated' }>`; a `Map<string, Set<Slide['kind']>>` cache keyed `${generatorId}@${difficulty}`; `shapesOf(ref: GeneratedRef)` that fills the cache by rendering `SEEDS` draws at `ref.difficulty ?? 1` (comment: the `?? 1` mirrors `resolveRef` in `src/engine/session.ts`, the one place the default lives); `commonShape(refs: GeneratedRef[]): Slide['kind'] | undefined` returning a member of the intersection or `undefined`; and `describeRefs(refs)` producing `polar-form@2, argument@2, ...` for messages. Cost measured here: building every set for all 217 registered generators at both difficulties is 568 ms.
- "varies the shape of the questions inside a lesson": `asked` becomes the lesson's `GeneratedRef[]`; keep the `< 4` skip; offender when `commonShape(asked)` is defined, message `${lesson.id}: ${asked.length} questions can all be ${kind} (${describeRefs(asked)})`. Delete the inline `shapeOf`.
- "never runs 3 or more identical-shape questions between teach slides": runs typed `GeneratedRef[][]`, same split on literal refs, keep the `< 3` skip; offender when `commonShape(run)` is defined, message `${lesson.id}: run of ${run.length} questions can all be ${kind} (${describeRefs(run)})`. Delete the inline `shapeOf`.
- Rewrite both tests' comments to say what changed and why: the old read was one seed at difficulty 1; `polar-form` renders a typed answer one direction and a native choice the other and draws the direction only at difficulty 2, so the guard governed four difficulty-2 asks from a shape the learner had a 51% chance of not meeting; and what "can all be" means.
- **Keep both test names unchanged** — `WEEK.md`, the `-t` filters below, and the exit-criterion table refer to them.

**Proof, through the harness, both mutations, before and after the edit.** The "before" runs use the whole test file so the statement "nothing in the suite catches this" is literally what was run; the "after" runs may filter with `-t`.

- M1, the scenario in WEEK.md's finding ("remove that slide and a run of three choice slides ships with a green suite"): 
  `eval/bin/mutate.sh src/content/courses/complexNumbers.ts "/id: 'cn-l4-polar'/,/id: 'cn-l4-powers'/ s/^\( *\)ask('argument', 2),$/\1ask('polar-form', 2),/" -- npx vitest run src/content/generators/generators.test.ts` 
  Verified here: changes exactly line 521 (the guided `argument` ask; the skill-check line is untouched because it ends in `]`, not `,`). Before the edit: expected `MUTANT SURVIVED` (the old `shapeOf` sees `expression, expression, choice`; simulated here). After: `mutant killed`, message `cn-l4-polar: run of 3 questions can all be choice (polar-form@2, polar-form@2, polar-form+choice@2)` (simulated here on the repaired rule).
- M2, for the "varies" guard: 
  `eval/bin/mutate.sh src/content/courses/complexNumbers.ts "/id: 'cn-l4-polar'/,/id: 'cn-l4-powers'/ { s/ask('polar-form')/ask('polar-form', 2)/; s/ask('argument', 2)/ask('polar-form', 2)/; s/ask('modulus-steps')/ask('polar-form', 2)/ }" -- npx vitest run src/content/generators/generators.test.ts -t 'varies the shape'` 
  Verified here: changes lines 512, 514, 521, 530 and the skill-check line 532 (harmless: skill checks are not shape-checked, and `polar-form@2` has 112 distinct draws for the de-duplicator). Before: expected survived (old read: two distinct shapes). After: killed, `cn-l4-polar: 8 questions can all be choice (...)`. Use the full file for the before-run here too.
- Unmutated: the whole file green; `npm test` count unchanged at the baseline (no test added or removed).

Commit message: `Judge lesson shape at the difficulty the lesson asks`.

### 3.3 Unit 3a — promised writings, pinned at the generator (repair 2, the load-bearing half)

The claim in `df-l1-index` ("either the index-form answer or the answer written back as a fraction under a root is accepted") is true only because two renders in `df-index-form` carry `domain: 'positive'`. Verified here: `-3/(2*sqrt(x^3))` against `((-3)/2) * x^(-3/2)` is `correct` over `positive` and `incorrect` over `real`; the other three writings a learner is led to (`3/(2*sqrt(x))`, `-3/(2*x*sqrt(x))`, `-12/x^5`) pass over either domain, which is why WEEK.md's sixteen typed writings tested nothing. The repair: the generator states, on the slide, the writings it promises, and a generic test grades each exactly as the reducer grades a learner. Flipping the field then fails a test instead of a learner.

There is a **second promise the brief did not mention**, found by grep here: `df-l4-combine`'s second teach slide (courses/differentiation.ts:838), "either the expanded or the factorised form is accepted", about `df-product-mixed`. No field upholds that one — numeric probing does by design — but the sentence is the same shape and gets the same declaration, so unit 3b has two real cases rather than one. No other course prose contains "accept" (grep of `src/content/courses/*.ts`).

Edits:

- **`src/content/types.ts`**, in the `expression` variant of `Slide`, after `limits?`: `alsoAccepts?: string[];` with a doc comment: other ways the learner is told they may write this answer, in mathjs syntax, never displayed; a test grades each against `answer` under this slide's own `domain` and `mode`, as the reducer grades a typed answer; it exists because a teach slide or solution step saying "either form is accepted" is a promise about the checker that the checker keeps only through fields like `domain` — `-a/(2*sqrt(x^3))` agrees with `x^(-3/2)` for positive x and not on the real line — and declaring the writing here is what makes changing that field fail a test.
- **`src/content/generators/differentiation.ts`**, `df-index-form.render`, one `alsoAccepts` line per form, each on a single line (unit 3b's mutation deletes them by line):
  - reciprocal, after the `answer:` line (1174): `alsoAccepts: [`(${-a * n})/x^(${n + 1})`],` — the solution's step 4 written back as a fraction.
  - root, after line 1189: `alsoAccepts: [`(${a})/(2*sqrt(x))`],` — step 4's `\frac{a}{2\sqrt{x}}`.
  - reciprocalRoot, after line 1203: `alsoAccepts: [`(${-a})/(2*x*sqrt(x))`, `(${-a})/(2*sqrt(x^3))`],` with a comment above it: the second writing is the one `domain: 'positive'` exists for — over the real line it disagrees with the index form at negative x — which is the account of itself WEEK.md's adversarial read said this code lacked.
  Verified here: all four writings, generated per draw as above, grade `correct` on 461/461 checks over the slides' own domains, and 61/461 (every difficulty-2 `reciprocalRoot` draw, the `sqrt(x^3)` writing) grade `incorrect` when the domain is `real`.
- Same file, `df-product-mixed.render`: for `fn === 'exp'` only, the factorised form the solution's own last step promises (`a x^{n-1} e^{kx}(n + kx)`), written for mathjs as `(${a}) * x^(${n - 1}) * e^((${k})*x) * ((${n}) + (${k})*x)`. Populate with a conditional spread (`...(fn === 'exp' ? { alsoAccepts: [...] } : {})`) so the property is absent, not `undefined`, on trig draws. Verified here on the algebraically identical `x^(n-1) * e^(kx) * (an + akx)`: 400/400 draws `correct` (122 of them exp). Sine and cosine draws get no declaration: the prose's example and the solution's promise are the exponential case, and a trig "factorised form" only shares `x^{n-1}` — do not invent one.
- **`generators.test.ts`**, per-generator block, after "rejects a perturbed answer" (line 487): `it('accepts every other writing it promises', ...)` — for each case, skip unless `expression` with `alsoAccepts`; for each writing, `checkAnswer(writing, slide.answer, { domain: slide.domain, mode: slide.mode, seed })` must be `correct` (learner's text first, expected second — the reducer's order, session.ts:315), message `seed ${seed}: promised writing ${writing} is not accepted against ${slide.answer} over ${slide.domain}`. Comment: what the promise is, why the checker keeps it only under the slide's own domain, and that `invalid` is a failure too (a writing mathjs cannot parse is a promise nobody can keep).

**Proof.** The domain-flip run from unit 1, now with `-t 'other writing it promises'`: expected `mutant killed`, naming the first difficulty-2 `reciprocalRoot` draw (here: seed 2, `(-5)/(2*sqrt(x^3))` against `((-5)/2) * x^(-3/2)` over `real`). Also re-run the unit 1 "survived" invocation verbatim (full `-t 'df-index-form'`): it must now report killed — that is F2 closed. Unmutated: green; `npm test` count rises by exactly 217 (one new test per registered generator: 2620 − 16 = 2604 = 12 × 217 today, so 13 × 217 + 16 in this file after), so 2994 total from a 2777 baseline; `npx tsc --noEmit -p tsconfig.app.json` silent; `npm run build` once, since `types.ts` changed.

Commit message: `Pin promised alternative writings to the checker`.

### 3.4 Unit 3b — promised writings, tied to the lesson (repair 2, the heuristic half)

Unit 3a pins the promise to the generator. Nothing yet connects the *sentence* in the lesson to a generator that declares anything — move the sentence to a lesson whose generators declare nothing and it is unbacked again with a green suite. The narrow version worth building: a course-integrity test that finds every teach-slide sentence containing the word `accepted` and requires the lesson to ask at least one generator that declares `alsoAccepts` on some draw at the asked difficulty. The word is the marker rather than a field an author must remember to set, because forgetting is the failure being guarded against; today it matches exactly the two sentences above and nothing else. A future sentence using the word for something else fails with the sentence quoted, and the author declares what it promises or rewords — that is the guard doing its job, and the comment says so.

Edit, `generators.test.ts`, in `describe('course integrity')` after "never leaves a raw escape sequence in prose": `it('backs every promise that another writing is accepted', ...)` — for each lesson, each literal `teach` slide, each `prose` block matching `/\baccepted\b/i`: count it; `declared` = some generated ref in `lesson.slides` whose generator, over `SEEDS` seeds at `ref.difficulty ?? 1` (cache per `${id}@${difficulty}` as `shapesOf` does), renders an `expression` slide with non-empty `alsoAccepts`; `expect(declared, `${lesson.id} says "${text}" but none of ${describeRefs(asked)} declares alsoAccepts on any draw`).toBe(true)`. After the loop, `expect(promises, 'no promise found to check').toBeGreaterThan(0)` — the loud-pass guard the traversal test already uses. Expected today: 2 promises, both backed.

**Proof.** Before adding the test, on the whole file: 
`eval/bin/mutate.sh src/content/generators/differentiation.ts "/id: 'df-index-form'/,/id: 'df-chain-root'/ { /^ *alsoAccepts:/d }" -- npx vitest run src/content/generators/generators.test.ts` 
Expected `MUTANT SURVIVED` (unit 3a's test skips a slide with no declaration — that is the gap this unit closes). After: same mutation with `-t 'another writing'`: killed, naming `df-l1-index` and quoting its sentence; `df-l4-combine` stays green because `df-product-mixed`'s declaration is outside the range. Verified here only that the sed range is well-formed (it produces no diff today, since the lines do not exist yet — confirm it deletes exactly three lines after 3a by reading the harness's printed diff). Unmutated: green; count 2995.

Commit message: `Require a declaration behind every "accepted" promise`.

## 4. Constraints and the tests that catch each

All in `/home/user/Maths-Trainer/src/content/generators/generators.test.ts` unless stated.

| Constraint | Caught by |
| --- | --- |
| The two shape guards judge at the asked difficulty | Units 2's M1/M2 differential — the harness output is the evidence; nothing else asserts it |
| A repaired guard can go red | `eval/bin/mutate.sh` exit code — 1 (survived) fails the unit; and it refuses (exit 2) when a mutation did not apply |
| The harness restores the file | `git status --short` empty after every run; the `trap` on EXIT |
| Every promised writing grades `correct` under the slide's own domain and mode | "accepts every other writing it promises" (unit 3a) |
| Every "accepted" sentence in a teach slide has a declaring generator behind it | "backs every promise that another writing is accepted" (unit 3b) |
| `alsoAccepts` strings parse | Same test — `invalid` is not `correct` |
| Nothing else in the suite moves | Test count: 2777 → 2777 → 2994 → 2995; a different delta means a test was lost or duplicated |
| The three invariants | `src/engine/session.test.ts`, untouched; nothing here touches `src/engine/` |
| TeX escaping | Not in play: every string this task adds is mathjs syntax with no backslash. Keep it that way |
| Real type errors | `npx tsc --noEmit -p tsconfig.app.json` after every unit; `npm run build` after 3a |
| Lint | 0 errors, 25 warnings, unchanged |
| Diff confined to the four files plus `eval-advisor.log` | Nothing catches this; `git diff --stat` before each commit |
| `eval-advisor.log` only grows | `git diff --stat` shows insertions only (PREFLIGHT) |

## 5. Working loop per unit (1, 2, 3a, 3b)

1. Run the unit's "before" harness invocation(s) and save the output — for units 2, 3a, 3b this is the survived run that shows the current suite is blind.
2. Make the unit's edits, directly in the files, nothing through a heredoc or script.
3. Run the "after" harness invocation(s): expected `mutant killed` with the predicted message. If it survives, the guard does nothing — do not commit; read section 2 again.
4. `git status --short` empty except your edits (the harness restored its mutations).
5. `npm test` (count as predicted, never below baseline), `npx tsc --noEmit -p tsconfig.app.json`, `npm run lint`; `npm run build` after 3a.
6. Consult the advisor on this unit's diff only, with `model: "opus"` passed on the Agent call, and wait for it to **return** before committing; append the entry (question, summary, the advisor's self-reported model quoted verbatim, and the before/after harness outputs) to `eval-advisor.log`. Read the file first; append; never write it.
7. `git diff --stat` shows only the unit's files and the log. `git add` by explicit path. Commit with the message given, ending with the attribution lines your session's system reminder specifies. Push to the session's branch.

**When a gate goes red** outside what section 3 predicts: read the failure, reproduce it on its seed, and stop. The fixes PREFLIGHT forbids remain forbidden. The only test-file edits permitted in this task are the ones section 3 names.

## 6. Done

- `eval/bin/mutate.sh` exists, is executable, and its two self-proof runs are in the report: the sign-drop killed, the domain flip survived (unit 1) and later killed (after 3a).
- `generators.test.ts`: both shape tests keep their names, share one `shapesOf` over `SEEDS` seeds at `ref.difficulty ?? 1`, and no `makeRng(1), 1` remains in the course-integrity block (`grep -n "makeRng(1), 1"` shows only line 445, the per-generator single-letter check, deliberately untouched — it tests a generator property, not a lesson).
- M1 and M2: survived before, killed after, outputs in the report with the offender messages.
- `Slide` has `alsoAccepts?`; `df-index-form` declares it on all three forms and `df-product-mixed` on `exp`; the generic test exists; the domain flip is killed by it.
- Unit 3b's test finds 2 promises and both are backed; the delete mutation survived before and was killed after.
- `npm test` 2995 (or 2994 if 3b was dropped), `tsc` silent, lint 0 errors / 25 warnings, `npm run build` passes on the pushed tree; `git status` clean; branch pushed; `main` untouched locally and remotely.
- The report names, for the owner's exit-criterion table: F2 now mechanised (3a), the shape-guard blindness now mechanised (2), "prove a guard fails" now a script (1); and states the unverified items from section 9 as things it did or did not confirm.

## 7. Risks, with handling — and whether a check could catch each

| Risk | Handling | Catchable by a check? |
| --- | --- | --- |
| A "before" run is skipped and only the "after" kill is reported — the differential is then half a proof | The loop puts "before" first; the advisor-log entry has a slot for both outputs | Rule only, today. The harness could grow a `--expect survive|kill` flag so a wrong direction exits non-zero; not in this task's scope |
| The harness's mutation matches more lines than intended (e.g. M1 without the `,$` anchor also hits the skill check) | Every sed expression here was dry-run and its exact line numbers recorded; the harness prints the diff | Partly: the printed diff is on the record; only reading it catches an over-match |
| A sed expression matches nothing and the run reads as a pass | Harness exit 2 on an unchanged file | Yes — built into the harness |
| The forgotten-restore: a mutation left in the tree | The `trap`; `git status --short` in the loop | Yes — the trap; and the pre-commit `git diff --stat` |
| The kind-set sweep misses a shape drawn with probability under ~1/200 | 200 seeds; today the only multi-kind generator draws 50/50 | Rule: a future generator with a rare kind needs its own thought. A check would need to enumerate `sample`'s branches, which is not available |
| Unit 3b's regex misfires on a future sentence | The failure quotes the sentence; the comment says to declare or reword | Yes — the test itself is the check; the false positive costs one reword |
| `alsoAccepts` on `df-product-mixed` disagrees on some draw the sweep here did not see | 400 draws here on an equivalent form; the executor's own test sweeps 400 more on the exact form | Yes — the new generic test |
| Adding a property to `Slide` changes `JSON.stringify(slide)` used by the de-duplicator | It is deterministic per params, so equality is unchanged | Yes — "never asks the same question twice" would move if it were not |
| Vitest's `-t` with no matching test | Every `-t` here is a substring of an existing or newly added name; use the full file for before-runs | Rule |
| Session budget | Fixed order; 3b droppable; each unit under an hour with a 143 s full suite | Rule |

## 8. Verified in this container (Node v22.22.2, vitest 5.0.0, GNU sed 4.9), with the command

All scratch scripts run with `npx vite-node <scratchpad>/…ts`, importing only from `/home/user/Maths-Trainer/src/…`. No repository file was modified at any point; `git status --short` was empty at the end.

1. Baseline: `npx vitest run` → `Tests 2777 passed (2777)`, 6 files, 143.43 s, exit 0. `npm run lint` → 25 lines matching ` warning `, 0 matching ` error `. Course-integrity block alone: 16 tests, 3.38 s. `-t 'df-index-form'`: 24 tests, 4.81 s.
2. Kind sets, all 217 registered generators × difficulties 1 and 2 × 200 seeds: build time 568 ms; the only non-singleton is `polar-form` at difficulty 2 → `['choice', 'expression']`.
3. Repaired rule (intersection of kind sets at the asked difficulty) across all 97 lessons: 0 offenders for both the run rule and the varies rule. Resolved-deck rule through `startSession`, 40 seeds, all lessons: 0 offenders, 466 ms.
4. M1 simulated on `cn-l4-polar`: repaired run rule → `run of 3 can all be choice`; old `shapeOf` on the same lesson: `expression,choice,expression,expression,expression,choice,expression,reduce`. M2 simulated: repaired varies rule → `8 questions can all be choice`, plus two run offenders; old read: 2 distinct shapes (green).
5. Sed dry-runs (to stdout, diffed against the file): M1 anchored → line 521 only; M2 → lines 512, 514, 521, 530, 532; domain flip → lines 1191 and 1205; sign drop → line 1174 only; alsoAccepts delete → no change today (lines do not exist yet).
6. `checkAnswer` on the four writings: over `positive` all four `correct`; over `real`, `-3/(2*sqrt(x^3))` `incorrect`, the other three `correct`.
7. `df-index-form` with every domain forced to `real`, 400 draws (210 reciprocal / 129 root / 61 reciprocalRoot): the suite's accepts / rejects / oracle checks → 0 / 0 / 0 failures. So the flip is green today.
8. Promised-writing sweep for `df-index-form`, 461 checks: over the slides' own domains 0 failures; over `real` 61 failures, all `reciprocalRoot` at difficulty 2, first at seed 2 (`(-5)/(2*sqrt(x^3))` vs `((-5)/2) * x^(-3/2)`).
9. `df-product-mixed` factorised writing, 400 draws (142 sin / 136 cos / 122 exp): 0 failures on the equivalent form `x^(n-1) * e^(kx) * (an + akx)` (for trig, `x^(n-1) * (...)`).
10. Sign-dropped reciprocal answer against `math.derivative` of its source: rejected 16/16.
11. Grep for "accept" in `src/content/courses/*.ts`: exactly two hits, lines 243 (`df-l1-index`) and 838 (`df-l4-combine`) of `differentiation.ts`.

## 9. Not verified here — for the executor

- That the whole test file is green under M1 and M2 (only the shape rules and de-dup pool sizes were reasoned about); the before-runs in 3.2 establish it.
- The exact wording of vitest's failure output for each kill; the messages above are the `expect` messages as specified.
- The `mutate.sh` script itself, since none was written: its two self-proof runs are the verification.
- `exactOptionalPropertyTypes` in `tsconfig.app.json` (grep found nothing); the conditional spread in 3a is correct under either setting.
- That the domain-flip run is killed by unit 3a's test *at seed 2* specifically — the first difficulty-2 `reciprocalRoot` case in the test's iteration order.

### Critical files
- /home/user/Maths-Trainer/src/content/generators/generators.test.ts
- /home/user/Maths-Trainer/eval/bin/mutate.sh (new)
- /home/user/Maths-Trainer/src/content/types.ts
- /home/user/Maths-Trainer/src/content/generators/differentiation.ts
- /home/user/Maths-Trainer/src/content/courses/complexNumbers.ts (mutated by the harness only, never committed changed)
- /home/user/Maths-Trainer/src/engine/session.ts (read only, lines 105–139)
- /home/user/Maths-Trainer/eval/PREFLIGHT.md
- /home/user/Maths-Trainer/eval-advisor.log

---
