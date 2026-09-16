<!-- Provenance: written by Fable 5.1 (`fable-planner`, effort: high), verbatim
except for this header. Task 5 of the week of real use; see ../WEEK.md and
../FLOW.md. -->

# Plan: task 5 — a counts reconciler that fails loudly when it has nothing to check

Task 5 of the week of real use, a **repair**. Executor starts cold; this text is the whole brief. Read alongside `/home/user/Maths-Trainer/eval/PREFLIGHT.md` (binding) and `/home/user/Maths-Trainer/CLAUDE.md` (binding). Nothing below is pinned to a commit hash: adding this plan file moves `main`.

## 0. The scoping decision (read this first)

**Build one script, `eval/bin/counts.sh`, that reads a plan and a report, extracts every count and id they claim, and asserts each against the tree — exiting non-zero on any disagreement and, separately, non-zero when a document yields nothing to check.** Three units, in order, each committed and pushed on its own. Nothing under `src/` changes.

**The fork, resolved: a hybrid, with exactly this split.**

- **Parsed (option A):** the four done-list sentence shapes already present in `eval/plans/TASK1-PLAN.md` to `TASK4-PLAN.md` — "`<course file>` has N lessons", a backticked comma-separated run of lesson ids on that line, "level checks (are) A/B/C" on that line, and "`npm test` N". Section 2.2 gives the grammar as regex constants; it was prototyped here against all four plans and yields 3 / 3 / 1 / 4 claims respectively (section 8, item 6). This is what gives the script four real test cases on the day it is written.
- **Emitted (option B):** a fenced block with info string `counts` (section 2.1), which every report from this task on and every plan from task 6 on carries. When a document has the block, the block is the whole claim set and the prose grammar is ignored; when it has none, the prose grammar is tried; when both yield nothing, the script exits 2. The block is what stops the parser rotting: the four legacy shapes are frozen as a fallback and never extended.

Why not pure A: a prose parser that has to keep up with how future plans are phrased will silently stop matching, and "silently stop matching" is exactly the exit-0-on-nothing hole. Why not pure B: a check with no failing case until task 6 is the class this task exists to close. The hybrid is testable today (plans 1–4, task 4's summary transcribed) and does not rot (the block).

**The report is a committed file.** Task 4's plan and tree agreed; the *summary* is what claimed 55 lessons. So the executor writes `/home/user/Maths-Trainer/eval/reports/TASK5-REPORT.md` carrying the block, runs the script on it before the final push, and the session's closing message copies its numbers from the script's output — not the other way round. From task 6, every executor does the same, and the orchestrator's stage 6 runs the script on the branch before reading anything.

**How this relates to PREFLIGHT's bookkeeping rule.** PREFLIGHT says a bookkeeping commit (a log append, a report, a results record) gets mechanical checks — insertions-only, arithmetic that adds up, scope matching the file list — rather than a consultation. This script *is* the "arithmetic that adds up" check, made mechanical. So: the report commit in unit 3 is a bookkeeping commit, gets no consultation, and is gated on `counts.sh` exiting 0, on `git diff --stat` showing insertions only for `eval-advisor.log`, and on the scope list. Units 1 and 2 change behaviour (they add a check whose failure mode — permissive — is the fatal direction) and each gets a consultation before its commit, even though PREFLIGHT's `src/`-scoped rule does not strictly require one. Say in the log which is which.

**How this relates to FLOW stage 6.** It mechanises "ids by grep, never from the report" and the test count. It does not replace the scope check, the ordering check, or the advisor-model check; those stay as they are. Do not edit `eval/FLOW.md`, `eval/PREFLIGHT.md` or `eval/WEEK.md`; the report proposes the one-line additions for the owner (section 3.3).

**Stop rule.** Complete = units 1, 2, 3. Acceptable = units 1 and 2, with the self-run and mutation outputs in the session's final message instead of a committed report. Within unit 2, the spawn tests may be reduced to the found-nothing spawn alone if the budget is short — that one is mandatory. Never start a unit you cannot finish, gate, prove and push.

**Files that change**, all under `/home/user/Maths-Trainer/`: `eval/bin/countsCore.ts` (new), `eval/bin/countsTree.ts` (new), `eval/bin/counts.ts` (new), `eval/bin/counts.sh` (new), `eval/bin/counts.test.ts` (new), `eval/bin/fixtures/counts/tree-snapshot.json` (new, generated), `eval/bin/fixtures/counts/task4-summary-block.md` (new), `eval/bin/fixtures/counts/task4-summary-prose.md` (new), `eval/bin/fixtures/counts/task1-summary-block.md` (new), `tsconfig.eval.json` (new), `eval/reports/TASK5-REPORT.md` (new), `eval-advisor.log` (append only). Nothing else. Not `package.json`, not `tsconfig.json`, not `vite.config.ts`, not `.gitignore`, nothing under `src/`.

**One destination.** `week/task5-counts`. `git branch --show-current` must print it, and must not print `main`, before the first push. Every unit is `git push origin week/task5-counts`. Never `main`, never a pull request.

## 1. Before writing anything

1. `command -v node || export PATH="$HOME/.local/node/bin:$HOME/.local/gh/bin:$PATH"` (no-op in a cloud container).
2. Work only from the checkout you have been given. Do not consult any other branch and do not run `git log --all`.
3. `git status --short` is empty; `git branch --show-current` prints `week/task5-counts`.
4. Read in full: `/home/user/Maths-Trainer/eval/PREFLIGHT.md`; `/home/user/Maths-Trainer/CLAUDE.md`; `/home/user/Maths-Trainer/eval/WEEK.md` from the heading "A second defect class — the account of the work diverging from the work" to the end; `/home/user/Maths-Trainer/eval/bin/mutate.sh` in full (the shell conventions, the exit codes, and the refusal branches — you copy that shape); `/home/user/Maths-Trainer/eval/bin/score.sh` lines 81–84 (how the suite's summary line is already grepped in this repo); the `## 6. Done` / `## 7. Done` sections of `/home/user/Maths-Trainer/eval/plans/TASK1-PLAN.md` (line 262), `TASK2-PLAN.md` (327), `TASK3-PLAN.md` (164) and `TASK4-PLAN.md` (318) — these are the corpus; `/home/user/Maths-Trainer/src/content/courses/index.ts` (`courses`, `lessonCount`); `/home/user/Maths-Trainer/src/content/registry.ts` (`registry`, keyed by id); `/home/user/Maths-Trainer/tsconfig.app.json` and `tsconfig.node.json` (you extend the first); `/home/user/Maths-Trainer/.gitignore` (note `*.log` — see risk 7).
5. Measure the baseline yourself and record it in the report. Measured here on `main`: `npx vitest run` → **Tests 3086 passed (3086)**, 6 files, 143.02 s, exit 0; `npx tsc --noEmit -p tsconfig.app.json` → silent, exit 0; `npm run lint` → **0 errors, 25 warnings** (count with `grep -c ' warning '`; do not "fix" them). No count may drop, and the test count must land on section 3's predictions exactly (3100 after unit 1, 3111 after unit 2); a different delta means a test was lost, duplicated, or not collected.
6. `npx vite-node --version` prints `vite-node/6.0.0` (it is not in `node_modules/.bin`; it runs from the npx cache here, fetched once through the proxy). `sed --version` prints GNU sed 4.9. If either is missing, stop and report rather than adapt.

## 2. The contract — what the script reads, what it asserts, how it exits

### 2.1 The `counts` block (emitted form; reports from now, plans from task 6)

A fenced code block whose opening line is three backticks immediately followed by `counts`, unindented, at the start of a line; closed by three backticks on their own line. The example below is indented four spaces so that this plan does not itself contain one — a document with two such blocks is an error (exit 2), and the only unindented block in this plan is in section 6.

    ```counts
    course: src/content/courses/trigonometricFunctions.ts
    lessons: 15
    lesson-ids: tf-l1-periodic, tf-l1-period, tf-l1-shift, tf-l1-midline, tf-l1-amplitude, tf-l2-sine, tf-l2-cosine, tf-l2-symmetry, tf-l2-solve, tf-l2-identity, tf-l2-speed, tf-l3-amplitude-shift, tf-l3-period-shift, tf-l3-period-formula, tf-l3-together
    level-checks: 12/15/15
    generators: trig-period-from-b, trig-related-angle, trig-solve-height, trig-pythagorean
    tests: 3086
    ```

Rules, each a parse error (status `error`, exit 2, message naming the line) when broken:

- Lines are `key: value`. Blank lines and lines starting with `#` are ignored.
- Keys are exactly `course`, `lessons`, `lesson-ids`, `level-checks`, `generators`, `tests`. Any other key is an error — a typo must not silently drop a claim.
- `lessons`, `lesson-ids`, `level-checks` attach to the most recent `course:` line; one before any `course:` is an error. A `course:` value is normalised to its `src/content/courses/<name>.ts` suffix (an absolute prefix is tolerated).
- `generators` and `tests` are document-level and may appear at most once each.
- `lessons` and `tests` are non-negative integers; `level-checks` matches `\d+(/\d+)*`; the two lists are comma-separated, spaces optional.
- More than one block in a document is an error.

### 2.2 The legacy Done-section grammar (parsed form; plans 1–4 and any plan without a block)

Write these constants in `countsCore.ts` exactly as given, each on its own line, with the comments — the mutations in section 3 target these lines by their text.

```ts
/** A lesson id: course prefix, level, slug — `tf-l2-symmetry`. */
const LESSON_ID = '[a-z0-9]+-l[0-9]+-[a-z0-9-]+';
/** The Done section: from a `## N. Done` heading to the next `## ` heading or the end of the file. */
const DONE_SECTION = /^## \d+\. Done\s*$([\s\S]*?)(?=^## |(?![\s\S]))/m;
/** "`src/content/courses/x.ts` has 15 lessons"; an absolute prefix before src/ is tolerated. */
const HAS_LESSONS = /`(?:[^`]*\/)?(src\/content\/courses\/[A-Za-z]+\.ts)` has (\d+) lessons/;
/** The first backticked comma-separated run of lesson ids on the same line as HAS_LESSONS. */
const ID_LIST = new RegExp('`(' + LESSON_ID + '(?:, ' + LESSON_ID + ')*)`');
/** "level checks are 15/12/14/15" or "level checks 12/15/15", on the same line as HAS_LESSONS. */
const LEVEL_CHECKS = /level checks (?:are )?(\d+(?:\/\d+)+)/;
/** "`npm test` 3086" — the complete-case count; a trailing "(or …)" list of stop-rule alternatives is ignored. */
const NPM_TEST = /`npm test` (\d{3,5})\b/;
```

Parsing a plan: if a `counts` block is present, use it and emit the line `plan: counts block found; Done-section prose ignored`. Otherwise find `DONE_SECTION`; if absent, the plan yields no claims (message: `no counts block and no "## N. Done" section`). Otherwise, per line of the section: a `HAS_LESSONS` match yields a `lessons` claim; on that same line `ID_LIST` yields `lesson-ids` and `LEVEL_CHECKS` yields `level-checks`; an `NPM_TEST` match anywhere in the section yields `tests`. Every claim records its line number.

Measured here on the four plans with exactly this grammar: TASK1 → lessons 11, 11 ids, 15/12/14/15 (`differentiation.ts`); TASK2 → 14, 14 ids, 15/12/15/15 (`complexNumbers.ts`); TASK3 → tests 2995 only; TASK4 → 15, 15 ids, 12/15/15 (`trigonometricFunctions.ts`), tests 3086.

### 2.3 The report prose sweep (reports only)

Reports are parsed for the block as in 2.1 (no Done-section fallback — a report is a new document and must carry the block). In addition, whether or not a block is present, two phrasings are swept from the whole report text, because they are the exact shapes that have lied:

```ts
/** Report prose: "55 lessons" — every such number must be a lesson count the tree actually has. */
const PROSE_LESSONS = /\b(\d+) lessons\b/g;
/** Report prose: "all 3034 tests pass" — must equal the suite total. */
const PROSE_TESTS = /\b(\d+) tests? (?:pass|passed|passing)\b/g;
```

A `PROSE_LESSONS` number is a `prose-lessons` claim, satisfied when it is in the set F = {every course's lesson total} ∪ {every level's lesson count} ∪ {the grand total}. A `PROSE_TESTS` number is a `prose-tests` claim, satisfied when it equals the suite total. Prose claims count towards "did this document yield anything" — a report with no block but with "55 lessons" in it yields one claim and goes red on it, *and* prints the no-block message. A red from a true sentence phrased unluckily ("the 97 lessons before this task") is fixed by rewording; that costs one edit and is visible, which is the right side of the trade.

### 2.4 The tree facts and the suite total

`countsTree.ts` exports `loadFacts(repoRoot: string): Promise<Facts>`:

```ts
export interface CourseFacts { id: string; lessons: number; perLevel: number[]; lessonIds: string[]; levelChecks: number[] }
export interface Facts { courses: Record<string, CourseFacts>; generators: string[]; totalLessons: number }
```

It lists `<repoRoot>/src/content/courses/*.ts` excluding `index.ts`, dynamically imports each by absolute path, takes the export whose value has an array `levels` (every course file has exactly one such export; verified here for all eight), and keys the record by `src/content/courses/<file>`. `lessonIds` is levels in order, lessons in order; `levelChecks[i]` is `levels[i].levelCheck?.length ?? 0`. `generators` is `Object.keys(registry)` sorted, imported from `<repoRoot>/src/content/registry`. Measured here (section 8, item 3): eight courses, `totalLessons` 101, 224 registry ids.

The suite total comes only from a file: `--suite-log <path>`, the captured output of `npx vitest run`. It must contain a line matching

```ts
/** vitest's summary line; only an all-green line yields a total. */
const SUITE_GREEN = /^\s*Tests\s+(\d+) passed \((\d+)\)\s*$/m;
/** A red suite must never be read as a total. */
const SUITE_RED = /^\s*Tests\s+.*\bfailed\b/m;
```

with both numbers equal; a `SUITE_RED` match, a missing line, or unequal numbers is an error (exit 2). If any document claims `tests` or `prose-tests` and no `--suite-log` was given, that is an error with the message `a tests claim needs --suite-log; run "npx vitest run > <file> 2>&1" on this checkout first`. Never accept a bare `--tests N` — the fact must come from a run.

### 2.5 Reconciliation, exit codes, output

`reconcile(claims: Claim[], facts: Facts, suiteTotal?: number): Result`, pure, no I/O.

```ts
export type Status = 'ok' | 'mismatch' | 'nothing' | 'error';
export interface Claim { source: 'plan' | 'report'; kind: 'lessons' | 'lesson-ids' | 'level-checks' | 'generators' | 'tests' | 'prose-lessons' | 'prose-tests'; course?: string; value: number | number[] | string[]; line: number }
export interface Result { status: Status; lines: string[]; claims: { plan: number; report: number } }
```

Per claim kind, the comparison and the message on failure (every message carries both sides and the claim's source and line):

| kind | fact | agree when |
| --- | --- | --- |
| `lessons` | `facts.courses[course].lessons` | equal |
| `lesson-ids` | `facts.courses[course].lessonIds` | same sequence; message lists missing, extra, and "same set, different order" |
| `level-checks` | `facts.courses[course].levelChecks` | same sequence |
| `generators` | `facts.generators` | every claimed id is present; message lists the absent ones |
| `tests` | `suiteTotal` | equal |
| `prose-lessons` | F as in 2.3 | member |
| `prose-tests` | `suiteTotal` | equal |

A claim naming a course file absent from `facts.courses` is an `error`. Two helper lines must exist verbatim (mutation targets):

```ts
const same = (a: number, b: number): boolean => a === b;
const known = (id: string): boolean => facts.generators.includes(id);
```

The verdict, in `countsCore.ts`, contains this line verbatim:

```ts
if (claims.length === 0) return 'nothing';
```

and the precedence is: any parse or fact error → `error`; else any *supplied* document with zero claims → `nothing`; else any mismatch → `mismatch`; else `ok`. `nothing` outranks `mismatch` deliberately: a document that asserted nothing must be reported as such even when the other document went red, because the red one would otherwise carry the run.

Exit codes, in `counts.ts`, from this line verbatim: `const EXIT: Record<Status, number> = { ok: 0, mismatch: 1, nothing: 2, error: 2 };`

Output: one line per claim in the form `<source>  <kind>  <course or ->  <claimed> = <actual>  ok` or `… MISMATCH: <reason>`; the precedence/ignored notes; then `checked: plan N claims, report M claims` (or `report: not supplied`); then exactly one verdict line: `COUNTS AGREE`, `COUNTS DISAGREE: K mismatches`, `NOTHING TO CHECK: <document> yielded 0 claims (<why>)`, or `ERROR: <message>`. Everything to stdout except the error line, which also goes to stderr.

CLI: `eval/bin/counts.sh <plan.md> [<report.md>] [--suite-log <file>]` or `eval/bin/counts.sh --dump-facts` (prints the `Facts` JSON, two-space indented, and exits 0; no documents read). Document paths are resolved against the caller's working directory; the repository root comes from the wrapper (below). Under `npx vite-node`, `process.argv[1]` is the vite-node binary and the script's own arguments begin at index 1 (verified here) — do not assume `argv[2]` as under plain node.

## 3. What to change, file by file, in order

Conventions for every TypeScript file here: `import { … } from 'node:fs'` / `'node:path'` style; no enums, namespaces or parameter properties (`erasableSyntaxOnly` is inherited); `verbatimModuleSyntax` means type-only imports use `import type`; write the files directly, never through a heredoc. Test names must be plain substrings with no `|`, `+` or parentheses so `-t` can select them.

### 3.1 Unit 1 — `countsCore.ts` and the in-process tests (predicted suite 3086 → 3100)

**`/home/user/Maths-Trainer/eval/bin/countsCore.ts`** — pure functions, no `process`, no filesystem. Exports: the types of 2.5; `parseCountsBlock(text): { claims: Claim[]; error?: string; found: boolean }` (source is passed in); `parsePlan(text): { claims; notes: string[]; error? }` implementing 2.2's precedence; `parseReport(text): { claims; notes; error? }` implementing 2.1 + 2.3; `parseSuiteLog(text): number | { error: string }` implementing 2.4; `reconcile` and `verdict` per 2.5; `formatResult(result): string`. Header comment: purpose (task 4's summary claimed 55 lessons, 44 lessons and 3034 tests over a tree with 15, 4 and 3086; task 1's summary misnamed all four of its generators; both times the work was right and the account was wrong, and the only catcher was an orchestrator remembering to grep), the three sources it reconciles, and the rule that zero claims is a failure and why.

**`/home/user/Maths-Trainer/eval/bin/counts.test.ts`** — part 1, `describe('counts: parsing and reconciliation')`, using a small synthetic `Facts` literal (one course file `src/content/courses/x.ts` with `lessons: 3`, `perLevel: [2, 1]`, `lessonIds: ['x-l1-a', 'x-l1-b', 'x-l2-c']`, `levelChecks: [12, 0]`; `generators: ['g-one', 'g-one+choice']`; `totalLessons: 3`) and inline document strings. Fourteen `it` blocks, named so each is a distinct `-t` substring:

1. `parses every block key into claims` — a block with all six keys → 5 claims on the course plus `generators` and `tests`, each with its line number.
2. `rejects an unknown block key` — `lesson: 3` → error naming `lesson` and the line.
3. `rejects a course claim before any course line` — `lessons: 3` first → error.
4. `rejects two counts blocks in one document` → error.
5. `reads the four legacy done-list shapes` — a synthetic Done section containing the exact phrasings of TASK1 ("has 3 lessons (ids `…`); level checks are 12/0."), TASK2 ("has 3 lessons with ids `…`; level checks are 12/0."), TASK4 ("has 3 lessons; `grep -n "^          id: '" ` lists `…`; level checks 12/0.") and "`npm test` 3100 (or 3086 per the stop rule)" → the expected claims, with the grep span not mistaken for the id list and 3100 (not 3086) as the tests claim.
6. `yields nothing for a plan with no done section` → `verdict` is `nothing` and the note names the missing heading.
7. `yields nothing for a done section with no recognisable claim` → `nothing`.
8. `prefers the block over done-section prose` — a plan with both, block says `lessons: 99` → one mismatch naming 99 and 3, and the note that prose was ignored.
9. `reports every kind of mismatch with both sides` — a block claiming `lessons: 4`, ids in a different order, `level-checks: 12/1`, `generators: g-two`, `tests: 3000` against suite total 3100 → five MISMATCH lines, each containing both values (`4` and `3`; `different order`; `12/1` and `12/0`; `g-two`; `3000` and `3100`).
10. `agrees when every claim matches` → `ok`, `checked: plan 1 claims, report 5 claims` in the formatted output.
11. `errors on a tests claim without a suite total` → `error` with the `--suite-log` message.
12. `reads only an all-green suite line` — `Tests  3086 passed (3086)` → 3086; `Tests  1 failed | 3085 passed (3086)` → error; a log with neither → error.
13. `sweeps report prose for lesson and test counts` — "extended from 11→55 lessons", "4 units (44 lessons)", "all 3034 tests pass" → three prose claims, all mismatching; "3 lessons", "all 3100 tests pass", "26 passed" → the first two agree and the third is not a claim.
14. `yields nothing for a report with no block and no counted phrases` → `nothing`.

**Gates:** `npx vitest run eval/bin/counts.test.ts` → 14 passed; `npm test` → **3100**; `npx tsc --noEmit -p tsconfig.eval.json` (created in this unit — see 3.2 for its content; create it now, it is a four-line file) silent; `npx tsc --noEmit -p tsconfig.app.json` silent; `npm run lint` and `npx oxlint eval/bin` 0 errors. Commit message: `Add a counts reconciler core that treats zero claims as a failure`.

**Mutations, after the commit and before the push** (mutate.sh refuses a dirty file, so they run on the committed tree), each `-- npx vitest run eval/bin/counts.test.ts`, each must print `mutant killed`:

- M1 (found-nothing reads as ok): `eval/bin/mutate.sh eval/bin/countsCore.ts "s/if (claims.length === 0) return 'nothing';/if (claims.length === 0) return 'ok';/"` — killed by tests 6, 7, 14.
- M2 (legacy grammar stops matching): `eval/bin/mutate.sh eval/bin/countsCore.ts "s/) lessons\//) lessonz\//"` — hits only the `HAS_LESSONS` line (the prose regex ends `lessons\b`, not `lessons/`); killed by test 5 (and 8's note).
- M3 (scalar comparison always true): `eval/bin/mutate.sh eval/bin/countsCore.ts "s/): boolean => a === b;/): boolean => true;/"` — killed by tests 8, 9, 13.
- M4 (unknown generator accepted): `eval/bin/mutate.sh eval/bin/countsCore.ts "s/facts.generators.includes(id);/true;/"` — killed by test 9.
- M5 (prose sweep blind): `eval/bin/mutate.sh eval/bin/countsCore.ts "s/) lessons\\\\b/) lessonz\\\\b/"` — in the shell that is the sed expression `s/) lessons\\b/) lessonz\\b/`, matching the literal `\b`; check the printed diff shows only the `PROSE_LESSONS` line; killed by test 13.

Read each printed diff: a mutation that touched a line other than the one named is a wrong sed, not a result. `git status --short` empty after each.

### 3.2 Unit 2 — tree facts, the CLI, the wrapper, the retro tests (predicted 3100 → 3111)

**`/home/user/Maths-Trainer/tsconfig.eval.json`** (if not already created in unit 1):

```json
{
  "extends": "./tsconfig.app.json",
  "compilerOptions": { "types": ["vite/client", "node"], "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.eval.tsbuildinfo" },
  "include": ["eval/bin"]
}
```

Verified here that extending `tsconfig.app.json` with `types: ["node"]` typechecks a script importing `node:fs` and `src/content/courses/index` cleanly (section 8, item 9). Do **not** add it to `tsconfig.json`'s `references`: `npm run build` is the deploy path and must not depend on eval tooling. The gate is `npx tsc --noEmit -p tsconfig.eval.json`, run alongside the app typecheck in every unit.

**`/home/user/Maths-Trainer/eval/bin/countsTree.ts`** — `loadFacts` per 2.4. Course files by `readdirSync`, `await import(absolutePath)`, `Object.values(mod).find(v => v && Array.isArray(v.levels))`; throw with the file name if none. Registry from `<repoRoot>/src/content/registry`.

**`/home/user/Maths-Trainer/eval/bin/counts.ts`** — the CLI per 2.5. Repo root: `process.env.COUNTS_REPO`, else `process.cwd()`. Argument parsing by hand over `process.argv.slice(1)`; unknown flag → usage and exit 2; no plan and no `--dump-facts` → usage and exit 2. Reads files with a clear error (exit 2) for a missing path. Calls `loadFacts`, then `parsePlan`, `parseReport` (if supplied), `parseSuiteLog` (if supplied), `reconcile`, prints `formatResult`, `process.exit(EXIT[status])`.

**`/home/user/Maths-Trainer/eval/bin/counts.sh`** — `chmod +x`. `set -uo pipefail`; `REPO` from `BASH_SOURCE` as in `mutate.sh`; `export COUNTS_REPO="$REPO"`; `exec npx vite-node "$REPO/eval/bin/counts.ts" "$@"`. Header comment: purpose in two sentences, usage, exit codes (0 agree / 1 disagree / 2 nothing to check or harness error), the note that vite-node runs through npx (cached after first use; a failure to fetch is a non-zero exit, never a silent pass), and the two example invocations (the stage-6 form with `--suite-log`, and `--dump-facts`).

**`/home/user/Maths-Trainer/eval/bin/fixtures/counts/tree-snapshot.json`** — generated, not typed: `eval/bin/counts.sh --dump-facts > eval/bin/fixtures/counts/tree-snapshot.json` on a clean tree (`git status --short` empty except your new files). Eyeball against section 8, item 3: `trigonometricFunctions.ts` 15 lessons, perLevel 5/6/4, levelChecks 12/15/15; `differentiation.ts` 11, 4/2/2/3, 15/12/14/15; `complexNumbers.ts` 14, 4/3/3/4, 15/12/15/15; `totalLessons` 101; 224 generator ids. The retro tests run against this snapshot rather than the live tree so that a later task adding a twelfth Differentiation lesson does not turn a correct plan-1 test red; the live tree is exercised by tests 15 and 24, which are rot-proof by construction.

**`/home/user/Maths-Trainer/eval/bin/fixtures/counts/task4-summary-block.md`** — the task-4 session summary's three claims, transcribed from `eval/WEEK.md` lines 1459–1461, as a block plus the sentences: a `counts` block with `course: src/content/courses/trigonometricFunctions.ts`, `lessons: 55`, `tests: 3034`, followed by the prose *Trigonometric Functions course extended from 11→55 lessons. 4 units (44 lessons) added. All 3034 tests pass.* A header line states it is a transcription of quoted claims, not the original document. **`task4-summary-prose.md`** — the same three sentences with no block. **`task1-summary-block.md`** — a block with `generators: df-reciprocal, df-quotient, df-product` (the names task 1's summary used; `eval/WEEK.md` line 360) and nothing else. No fixture may be named `*.log` — `.gitignore` ignores that pattern and the file would silently not be committed; name suite-log fixtures `.txt` or build them in the test.

**`counts.test.ts`** — part 2, `describe('counts: the real plans, the real tree, and the command line')`. The snapshot is read with `readFileSync` and `JSON.parse`; the plans are read from `/home/user/Maths-Trainer/eval/plans/` by a path built from `import.meta.dirname` or `fileURLToPath(import.meta.url)`; suite-log text is inline (`'Tests  3086 passed (3086)\n'`). Eleven `it` blocks:

15. `maps every course file to the course it exports` — live `loadFacts`: eight courses; each `lessons` equals `lessonCount` of the course with the same `id` from `src/content/courses/index`; `totalLessons` equals the sum; `generators.length` equals `Object.keys(registry).length`. (Compares two live sources, so it cannot rot.)
16. `reconciles the task 1 plan against the tree` — TASK1-PLAN vs snapshot → `ok`, 3 plan claims.
17. `reconciles the task 2 plan against the tree` → `ok`, 3.
18. `reconciles the task 3 plan only through its test count` — 1 claim; with suite total 2995 → `ok`; with 3086 → `mismatch` whose line contains `2995` and `3086`.
19. `reconciles the task 4 plan against the tree` — with 3086 → `ok`, 4 claims.
20. `rejects the task 4 summary transcribed as a block` — `task4-summary-block.md` as report, TASK4-PLAN as plan, suite 3086 → `mismatch`; lines contain `55` and `15`, `3034` and `3086`, and the prose claims `44`.
21. `rejects the task 4 summary as prose` — `task4-summary-prose.md` → not `ok`; output contains the no-block note and flags `55`, `44` and `3034`.
22. `rejects the generator names the task 1 summary used` — `task1-summary-block.md` → `mismatch` naming `df-reciprocal`, `df-quotient`, `df-product` as absent.
23. `exits non-zero from the command line when there is nothing to check` — **mandatory.** Writes two temp files under `os.tmpdir()` (a plan with a `## 1. Done` heading and one sentence with no counts; a report with one sentence and no block), runs `execFileSync('/home/user/Maths-Trainer/eval/bin/counts.sh', [plan, report])` inside try/catch, asserts the caught `status` is 2 and stdout contains `NOTHING TO CHECK`. Timeout `{ timeout: 60_000 }` — a vite-node spawn took 2.5 s here and vitest's 5 s default overruns under CPU competition (CLAUDE.md's oracle-test note).
24. `exits zero from the command line when plan, report and tree agree` — builds a true report *from live facts* (block with the trig course's real `lessons`, `lessonIds`, `levelChecks`, the four task-4 generator ids, `tests: 3086`) into a temp file, a suite-log temp file with the green line, runs the wrapper with TASK4-PLAN, that report and `--suite-log` → exit 0 and stdout contains `COUNTS AGREE` and `checked: plan 4 claims, report 5 claims`. Timeout 60 s. (Rot-proof: the report is generated from the tree; the plan's numbers are fixed, so if the trig course ever changes this test goes red on the plan side — that is the plan being a stale claim, which is the correct verdict, and the test's comment says so.)
25. `exits one from the command line on a mismatch` — wrapper with TASK4-PLAN, `task4-summary-block.md`, the green suite-log temp file → status 1, stdout contains `COUNTS DISAGREE`. Timeout 60 s.

**Gates:** `npx vitest run eval/bin/counts.test.ts` → 25 passed; `npm test` → **3111**; both typechecks silent; lint 0 errors; `npm run build` passes (proves the deploy build is untouched by `tsconfig.eval.json`). Commit message: `Reconcile plan, report and tree from the command line, and fail when nothing was checked`.

**Mutation, after the commit, before the push:**

- M6 (found-nothing exits 0 — the literal bug this task exists to prevent): `eval/bin/mutate.sh eval/bin/counts.ts "s/nothing: 2,/nothing: 0,/" -- npx vitest run eval/bin/counts.test.ts -t 'nothing to check'` — killed by test 23. Also re-run M1 against the whole file to confirm test 23 reinforces it.

### 3.3 Unit 3 — the retro runs, the report, the self-run (bookkeeping; no consultation)

1. Capture the suite: `npx vitest run > /tmp/claude-0/suite.txt 2>&1` on the unit-2 tree (any scratch path; not committed).
2. Run and save verbatim: `eval/bin/counts.sh eval/plans/TASK1-PLAN.md`, `…TASK2-PLAN.md`, `…TASK3-PLAN.md --suite-log /tmp/claude-0/suite.txt` (expected exit 1: 2995 against 3111 — the plan is a stale claim and the tree is the fact), `…TASK4-PLAN.md --suite-log …` (expected exit 1 on `tests` 3086 vs 3111 and `ok` on the three course claims — say so), and `…TASK4-PLAN.md eval/bin/fixtures/counts/task4-summary-prose.md --suite-log …` (expected non-zero, flagging 55, 44, 3034).
3. Write `/home/user/Maths-Trainer/eval/reports/TASK5-REPORT.md`: the baseline you measured; the three units with their commit subjects; gate numbers per unit; every mutation's harness output verbatim (M1–M6, each `mutant killed`); the retro outputs from step 2; the section-8 items you could and could not confirm; the proposed one-line additions for the owner — for `eval/FLOW.md` stage 6: *"Counts: `eval/bin/counts.sh eval/plans/TASK{N}-PLAN.md eval/reports/TASK{N}-REPORT.md --suite-log <the gate run's output>` exits 0, run before reading the report"*; for `eval/PREFLIGHT.md`'s bookkeeping rule: *"A report's counts go in a `counts` block and `eval/bin/counts.sh` exits 0 on it before the report is committed"*; and, unindented, the block:

    ```counts
    tests: 3111
    ```

4. `npx vitest run > /tmp/claude-0/suite.txt 2>&1` again if anything under `eval/bin` changed since step 1, then `eval/bin/counts.sh eval/plans/TASK5-PLAN.md eval/reports/TASK5-REPORT.md --suite-log /tmp/claude-0/suite.txt` → exit 0, `checked: plan 1 claims, report 1 claims`, `COUNTS AGREE`. Append that output to the report. If it does not exit 0, the report is wrong or the count moved: fix the *report's* number to what the suite printed and say in the report why the plan's prediction missed — never edit the plan, never edit a test to move the count.
5. Append to `eval-advisor.log` (read first, append, never write): the unit-1 and unit-2 consultation entries if not already appended with their commits, and a short entry stating that the unit-3 commit is bookkeeping and was gated mechanically — the script's exit code, `git diff --stat eval-advisor.log` insertions-only, and the scope list — with no consultation, per PREFLIGHT.
6. Mechanical checks on the commit: `git diff --stat main` lists only section 0's files; `git diff --stat -- eval-advisor.log` shows 0 deletions. Commit message: `Record task 5: the reconciler run on its own report and on the four plans before it`. Push.

## 4. Constraints and the tests that catch each

| Constraint | Caught by |
| --- | --- |
| Zero extracted claims is a failure, never a pass | tests 6, 7, 14 (verdict), 23 (exit code); M1 and M6 prove both can fail |
| The four legacy done-list shapes parse, and parse only what they should (grep span not read as ids; stop-rule alternatives ignored) | test 5; tests 16, 17, 19 on the real plans; M2 |
| The block wins over prose, and a malformed block is an error rather than a dropped claim | tests 2, 3, 4, 8 |
| Every claim kind can disagree and the message names both sides | test 9; M3, M4 |
| The report's prose is swept for the two phrasings that lied | test 13, 21; M5 |
| A test count comes only from an all-green suite line | tests 11, 12 |
| The tree is the fact: the file-to-course mapping is complete and consistent with the index | test 15 |
| Task 4's summary goes red (the case that motivated the task) | tests 20, 21, 25 |
| Task 1's generator names go red | test 22 |
| The command line's three exit codes | tests 23, 24, 25 |
| Type errors in `eval/bin` | `npx tsc --noEmit -p tsconfig.eval.json` — not `tsconfig.app.json`, which includes only `src` |
| The deploy build is unaffected | `npm run build` after unit 2 |
| Test count moves by exactly +14 then +11 | the count itself: 3100, 3111 |
| Diff confined to section 0's files; `eval-advisor.log` only grows | nothing catches this; `git diff --stat main` and `git diff --stat -- eval-advisor.log` before each commit |

## 5. Working loop per unit (1, 2, 3)

1. Write the unit's files directly. For unit 1, write the regex constants and the three named helper lines exactly as section 2 gives them — the mutations depend on that text.
2. `npx vitest run eval/bin/counts.test.ts` green with the predicted count; `npm test` at the predicted total; `npx tsc --noEmit -p tsconfig.app.json` and `npx tsc --noEmit -p tsconfig.eval.json` silent; `npm run lint` 0 errors and the same 25 warnings; `npx oxlint eval/bin` 0 errors; after unit 2 only, `npm run build`.
3. `git diff --stat main` lists only this unit's files plus the log.
4. Units 1 and 2: consult the advisor on this unit's diff only, `model: "opus"` passed on the Agent call, and wait for it to **return** before committing. Append the entry (question, summary, the advisor's self-reported model quoted verbatim — both strings if it disagrees with its harness label — and the gate numbers) to `eval-advisor.log`; read first, append, never write; `git diff --stat -- eval-advisor.log` shows insertions only. Unit 3: no consultation; the mechanical checks of 3.3 step 6 instead, and the log entry says so.
5. `git add` by explicit path. Commit with the message given, ending with the attribution lines your session's system reminder specifies.
6. Run the unit's mutations from the repository root. Every one must print `mutant killed`; read each printed diff to confirm the sed touched only the named line; `git status --short` empty after each. Save every harness output verbatim for the report.
7. If every mutation was killed: `git push origin week/task5-counts`. If one survived, do not push — the check cannot fail; fix the check (never the test that should have caught it, never the mutation until it kills) in a new commit with its own consultation, re-run, then push.

**When a gate goes red** outside what section 3 predicts: read the failure first and reproduce it. The fix is in the script or the fixture, never in: editing an existing test under `src/`, trimming a timeout or a sample count, weakening a regex until a document happens to pass, adding `--tests N`, or making any status map to exit 0. If you believe a test in this file is asserting the wrong thing about the corpus (for example, that a plan's done list really says something different from what section 2.2 predicts), stop, leave the tree uncommitted, and report the line and both readings.

## 6. Done

- `eval/bin/counts.sh` exists, is executable, and `eval/bin/counts.sh --dump-facts` prints eight courses, `totalLessons` 101 and 224 generators on the pushed tree.
- `eval/bin/counts.test.ts` holds 25 tests; test 23 spawns the wrapper on two documents with no counts and asserts exit 2.
- Six mutations M1–M6, each `mutant killed`, outputs verbatim in the report and the log.
- The retro runs of 3.3 step 2 are in the report with their exit codes, including the two expected reds on stale test counts and the red on the task-4 prose fixture.
- `eval/reports/TASK5-REPORT.md` carries the block below and `counts.sh` exits 0 on this plan plus that report with the gate run's suite log.
- `npm test` 3111, both typechecks silent, lint 0 errors / 25 warnings, `npm run build` passes on the pushed tree; `git status` clean; `main` untouched locally and remotely.
- The session's closing message quotes counts only from `counts.sh` output, and names, from `grep`, the files it added.

```counts
tests: 3111
```

## 7. Risks, each classified — (a) caught by an existing check, (b) catchable by a check that does not yet exist, (c) rule only

| Risk | Handling | Class |
| --- | --- | --- |
| The script extracts nothing and exits 0 — the oldest defect class, in a new tool | `nothing` outranks everything but `error`; test 23 asserts the exit code; M1 and M6 prove the tests bite | (b) today; (a) after unit 2 |
| A future plan phrases its done list differently and the legacy grammar matches nothing | Exit 2, loud; the block is the forward format from task 6 and plans carry it | (a) — the found-nothing exit |
| The report's block is copied from the plan rather than measured | The block is compared with the tree, not the plan; a copied-but-wrong block goes red | (a) |
| The block is right and the prose still says 55 | Prose sweep for `N lessons` and `N tests pass`; other phrasings are not swept | (a) for those two shapes; (c) for any other |
| `--suite-log` comes from a different checkout than the tree being checked | The log is captured in the same loop step as the gates, on the same tree | (c) — nothing in a vitest log identifies the tree; a check would need the log to carry HEAD, which vitest does not print |
| Real type errors in `eval/bin` with a green suite (esbuild strips types) | `tsconfig.eval.json` in the loop; `npm run build` does not cover it by design | (a) once the gate is in the loop; (c) that it is run — and the orchestrator's stage 6 list should add it |
| A fixture named `*.log` is gitignored and silently missing from the push | Fixture suite logs are inline strings or `.txt`; the stage-6 run on a fresh worktree fails loudly if one were missing | (a) on a fresh checkout; (c) locally |
| `vite-node` unavailable in the executing container | The wrapper's `exec` propagates npx's failure as a non-zero exit — never a green | (a) for silence; (c) for availability: stop and report, do not substitute `tsx` |
| Spawn tests overrun vitest's 5 s default under CPU competition | Explicit 60 s timeout on tests 23–25, as the oracle test does | (a) |
| Retro tests rot as the tree grows | Snapshot fixture for plans 1–4; live-tree tests compare two live sources or generate their report from the tree | (a) |
| The snapshot was dumped from a mutated or dirty tree | Dumped with `git status --short` empty; values eyeballed against section 8 item 3 | (c) |
| This plan's own predicted count (3111) is missed | The plan's block goes red on the self-run; the report states the actual and why | (a) — a red, not a silent pass |
| A mutation's sed matches nothing, or more than the named line | Harness exit 2 on a no-op; the printed diff is read | (a) for a no-op; (c) for an over-match |
| The executor edits a test to make a mutation "kill" | PREFLIGHT's red-gate rule; the mutation list names the killing test so a changed test is visible in the diff | (c) |
| Two `counts` blocks in one document (a plan quoting the grammar) | Parse error, exit 2; this plan indents its example | (a) |
| Advisor consulted after the commit, or on an accumulated diff | One consultation per behaviour unit, returned before the commit; unit 3 explicitly unconsulted | (c) — the ordering check runs afterwards by the orchestrator |
| Session budget | Three units, the third bookkeeping; the spawn tests reducible to test 23 alone | (c) |

## 8. Verified in this container (Node v22.22.2, vitest 5.0.0, GNU sed 4.9, vite-node 6.0.0 via the npx cache), with the command

No repository file was modified; `git status --short` was empty throughout. Scratch scripts lived under the session scratchpad and imported only from `/home/user/Maths-Trainer/src/…`.

1. Baseline on `main`: `npx vitest run` → `Test Files 6 passed (6)`, `Tests 3086 passed (3086)`, `Duration 143.02s`, exit 0. `npx tsc --noEmit -p tsconfig.app.json` → silent, exit 0. `npm run lint` → 25 lines matching ` warning `, 0 matching ` error `.
2. Toolchain: `ls node_modules/.bin | grep vite` → `vite`, `vitest` only; `npx --no-install vite-node --version` → `vite-node/6.0.0 linux-x64 node-v22.22.2` (from `~/.npm/_npx/f2342a4b64a2bc92`, which holds `vite-node ^6.0.0`); a vite-node run importing the course index and registry took `real 0m2.487s`.
3. Tree facts by import (`courses` from `src/content/courses/index`, `registry`): exponents-radicals 12 (5/3/4) checks 12/12/12; quadratics 12 (4/4/4) 12/12/12; trigonometric-functions 15 (5/6/4) 12/15/15; logarithms 12 (4/4/4) 12/12/12; complex-numbers 14 (4/3/3/4) 15/12/15/15; differentiation 11 (4/2/2/3) 15/12/14/15; integration 13 (5/5/3) 12/12/12; vectors-matrices 12 (4/4/4) 12/12/12; total lessons 101; registry 224 ids. The three ids lists match plans 1, 2 and 4's done lists exactly.
4. Dynamic import by absolute path under vite-node of each of the eight files in `src/content/courses/` (excluding `index.ts`) yields exactly one export with an array `levels`, whose lesson total matches item 3.
5. `process.argv` under `npx vite-node script.ts alpha --suite-log x.txt 2` → `[".../.bin/vite-node","alpha","--suite-log","x.txt","2"]` (no script path; arguments from index 1); `process.exit(2)` → shell `exit=2`; `process.exit(0)` → `exit=0`.
6. The section 2.2 grammar, run as a script over the Done sections of the four plans: TASK1 → `lessons 11`, `lesson-ids` 11 entries, `level-checks 15/12/14/15` for `src/content/courses/differentiation.ts`; TASK2 → 14, 14, `15/12/15/15` for `complexNumbers.ts`; TASK3 → `tests 2995` only; TASK4 → 15, 15, `12/15/15` for `trigonometricFunctions.ts`, `tests 3086`. The TASK4 line's `grep -n "^          id: '"` span was not taken as the id list; TASK3/4's "(or …)" alternatives were not taken as tests claims.
7. The suite summary line format: `Tests  3086 passed (3086)`; `grep -Eo 'Tests +[0-9]+ passed \([0-9]+\)'` matches it, as `score.sh` line 83 already relies on.
8. Vitest configuration: no `vitest.config.*`; `vite.config.ts` has no `test` block (`grep -n "test:"` → nothing); `npx vitest list --filesOnly` → six files, all under `src/`. So the default include pattern (`**/*.{test,spec}.?(c|m)[jt]s?(x)`) is in force and would collect `eval/bin/counts.test.ts`.
9. Typechecking an `eval` script: a tsconfig extending `/home/user/Maths-Trainer/tsconfig.app.json` with `types: ["node"]`, including a script that imports `node:fs` and `src/content/courses/index`, → `npx tsc --noEmit -p …` exit 0. (The probe config sat outside the repo, so it also needed `typeRoots`; inside the repo `types: ["vite/client", "node"]` resolves without it — the probe with `vite/client` failed only for that location reason, TS2688.)
10. Corpus lines: `eval/WEEK.md` 272 and 360 quote `df-reciprocal, df-quotient, df-product`; 1459 quotes *"extended from 11→55 lessons"*, 1461 *"all 3034 tests pass"*, 1480 the 44. No file in the repository contains a `counts` fence today (`grep -rl` → none). No `eval/reports/` directory exists. `.gitignore` contains `*.log`. Local branches: `main`, `week/task1-differentiation`; no `week/task5-counts` locally (the launcher creates it).

**Not verified here — for the executor:** that vitest actually collects a test file under `eval/bin/` (reasoned from item 8; no file was added — the +14 count after unit 1 is the proof); that `npx oxlint` scans `eval/` when run bare (its summary line was not captured; run `npx oxlint eval/bin` explicitly); that `npx vite-node` fetches or is cached in the executing container (it was in this one and in tasks 2 and 4's); that `execFileSync` of the wrapper works from inside a vitest worker (nested npx; expected to, unverified); `import.meta.dirname` availability in vitest's transform (use `fileURLToPath(import.meta.url)` if not); the exact wording of vitest's failure output for each kill; and that 25 `it` blocks is what you end up with — if the count differs, say by how much and why rather than adjusting the plan's block.

### Critical files
- /home/user/Maths-Trainer/eval/bin/countsCore.ts (new — the parsers, the reconciler, the verdict)
- /home/user/Maths-Trainer/eval/bin/countsTree.ts (new — `loadFacts`)
- /home/user/Maths-Trainer/eval/bin/counts.ts (new — the CLI and exit codes)
- /home/user/Maths-Trainer/eval/bin/counts.sh (new — wrapper, executable)
- /home/user/Maths-Trainer/eval/bin/counts.test.ts (new — 25 tests)
- /home/user/Maths-Trainer/eval/bin/fixtures/counts/{tree-snapshot.json,task4-summary-block.md,task4-summary-prose.md,task1-summary-block.md} (new)
- /home/user/Maths-Trainer/tsconfig.eval.json (new; not referenced from tsconfig.json)
- /home/user/Maths-Trainer/eval/reports/TASK5-REPORT.md (new)
- /home/user/Maths-Trainer/eval-advisor.log (append only)
- /home/user/Maths-Trainer/eval/bin/mutate.sh (run, never edited)
- /home/user/Maths-Trainer/eval/plans/TASK1-PLAN.md … TASK4-PLAN.md (read only — the corpus)
- /home/user/Maths-Trainer/src/content/courses/index.ts, /home/user/Maths-Trainer/src/content/registry.ts (read only)
- /home/user/Maths-Trainer/eval/PREFLIGHT.md, /home/user/Maths-Trainer/CLAUDE.md (binding)
