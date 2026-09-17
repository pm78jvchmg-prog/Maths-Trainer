# Report: task 5 — a counts reconciler that fails loudly when it has nothing to check

Task 5 of the week of real use, a repair. Plan: `eval/plans/TASK5-PLAN.md` (`ae1c0a1`
on `main`). Branch: `week/task5-counts`. Three units, each committed and pushed
separately, units 1 and 2 gated on a returned advisor consultation before their
commit, unit 3 (this report) bookkeeping per PREFLIGHT — mechanical checks, no
consultation.

## Launch and anchors

This session was relaunched after two prior task-5 sessions correctly refused on
unverifiable or falsified anchors (`eval/WEEK.md`, "Task 5 stopped itself on a
suspected prompt injection" through "Third refusal, and the decision to relaunch").
The relaunch brief's anchors were verified before any work started: `git rev-parse
--short HEAD` → `a3d44bc`, matching the brief's claimed head and commit subject
("Record the third refusal and relaunch task 5 with a correct brief"); all five
binding files present by `ls`; `git branch -r` showed only `origin/main` (expected —
single-branch clone, not a problem); the anchor commit's timestamp (`2026-09-17T
02:12:32Z`) predates the session clone, satisfying `FLOW.md` stage 4's rule that an
anchor must predate the clone rather than be written in the same breath as the
launch.

## Baseline, measured here

On `main` before branching: `npx vitest run` → **3086 passed (3086)**, 6 files,
78.80s, exit 0. `npx tsc --noEmit -p tsconfig.app.json` → silent, exit 0.
`npm run lint` → **0 errors, 25 warnings**. Matches the plan's stated baseline
exactly. (`npm install` was required first — `node_modules` was absent in this
container; `package-lock.json`'s post-install churn, npm normalising some
`libc` fields, was reverted with `git checkout -- package-lock.json` before any
unit's diff, keeping the diff boundary to exactly the files below.)

## Units and commits

| Unit | Commit | What |
| --- | --- | --- |
| 1 | `67c87f8` | `eval/bin/countsCore.ts` (parsers, reconciler, verdict) + `eval/bin/counts.test.ts` (19 tests) + `tsconfig.eval.json` |
| 2 | `1795c05` | `eval/bin/countsTree.ts`, `eval/bin/counts.ts`, `eval/bin/counts.sh`, three fixtures, `tree-snapshot.json`, 12 more tests (31 total) |
| 3 | *(this commit)* | This report, retro runs, `eval-advisor.log` entry — bookkeeping |

**Gate numbers per unit, all self-measured, not taken from any prior summary:**

| | Unit 1 | Unit 2 |
| --- | --- | --- |
| `npx vitest run eval/bin/counts.test.ts` | 19 passed | 31 passed |
| `npm test` | **3105** | **3117** |
| `npx tsc --noEmit -p tsconfig.eval.json` | silent | silent |
| `npx tsc --noEmit -p tsconfig.app.json` | silent | silent |
| `npm run lint` | 0 errors, 25 warnings | 0 errors, 25 warnings |
| `npx oxlint eval/bin` | 0 errors | 0 errors |
| `npm run build` | *(not required until unit 2)* | passes |

**The predicted counts (3100, 3111) were not what shipped — 3105 and 3117, and
the reason is known rather than a lost/duplicated test.** Both advisor
consultations found real gaps in the 14 + 11 tests the plan specified and I
added tests to close them before committing: 5 extra in unit 1 (a direct test
of `reconcile`'s per-document "nothing" fold, an empty-list-value rejection
test, an absolute-path-prefix normalisation test, a suite-log unequal-numbers
test, and a per-level/grand-total prose-membership test) and 1 extra in unit 2
(`scriptArgs()`'s two-layout coverage, added when the advisor suggested
deriving the argv split rather than hard-coding an index). 14+11=25 tests
predicted; 19+12=31 shipped. `3086 + 31 = 3117`, which is exactly the final
`npm test` count — the delta is fully accounted for by named, deliberate
additions, not by anything lost or double-counted.

## Advisor consultations

Two consultations, both **before** their unit's commit (both returned before
`git commit` ran), both self-reporting `claude-opus-5[1m]` — quoted verbatim
in `eval-advisor.log`. Full entries are in that file; summarised here:

**Unit 1** — found the CLI was going to layer a per-supplied-document "nothing"
check on top of `reconcile`'s own combined-claims check (two authorities over
the same status — the exact failure shape this task exists to close), a
`prose-lessons` MISMATCH message that matched its own sweep regex (would have
self-triggered on a later "quote the red run into the report" step), an
empty `generators:`/`lesson-ids:` value parsing as a trivially-passing empty
list, the `generators` claim dumping the full 224-id registry onto one line,
and a fragile `indexOf`-based line-number calculation. All five fixed before
commit; verified with the mutation harness afterward.

**Unit 2** — verified the `nothing`-outranks-`mismatch` property directly
against the real binary across all four supplied-document combinations before
finding two real bugs: `void main()` meant an uncaught rejection (e.g. a stray
non-course file under `src/content/courses/`) exited **1** — the code
`counts.sh` itself documents as "disagree" — rather than a clean error at exit
2, making a broken tool indistinguishable from disagreeing documents; and
`process.exit()` after a large `console.log` could truncate piped stdout
(measured near a ~64KB threshold), silently dropping the verdict line while
the exit code survived. Both fixed (`main().catch()`; `process.exitCode` +
`return` instead of `process.exit()` after output). Also: `countsTree.ts` now
errors on a course file exporting more than one course-shaped value instead of
silently picking the first (`.find()` → `.filter()` + length check), and the
`process.argv` split — see below — is now derived rather than hard-coded, with
both observed layouts under test.

## A discrepancy in the plan's own "verified" claims — reported, not silently fixed

TASK5-PLAN.md section 8 item 5 states, as something it verified: under `npx
vite-node script.ts args...`, `process.argv` is `[vite-node-bin, ...args]` —
the script's own arguments beginning at index 1. **Reproduced directly in this
container rather than trusted, and it does not hold here:**

```
$ npx vite-node /tmp/argv-probe.ts alpha --suite-log x.txt 2
["/opt/node22/bin/node","/root/.../vite-node","alpha","--suite-log","x.txt","2"]
```

`process.argv[0]` is node's own path here, so the script's own args begin at
index **2**, not 1. The unit-2 advisor consultation reproduced this
independently (byte-identical argv), and rather than hard-code either
container's index, `countsCore.ts` now exports `scriptArgs(argv)`, which
finds wherever the `vite-node` binary itself sits in `argv` (bounded to the
first two entries) and slices from there — the one thing both observed
layouts agree on. Both layouts are under unit test.

## Mutations — every one printed `mutant killed`, diffs read before continuing

**M1** (`eval/bin/countsCore.ts`, `if (claims.length === 0) return 'nothing';`
→ `return 'ok';`) — 3 tests failed (the direct `verdict()` callers: "yields
nothing for a plan with no done section", "...for a done section with no
recognisable claim", "...for a report with no block and no counted phrases").
`mutant killed: the command exited 1`.

**M2** (`HAS_LESSONS`'s `) lessons\/` → `) lessonz\/`) — printed diff touched
only the `HAS_LESSONS` regex line; 1 test failed ("reads the four legacy
done-list shapes"). `mutant killed: the command exited 1`.

**M3** (`same`'s `a === b;` → `true;`) — printed diff confirmed only the
`same` helper line changed (not `known`, which has the same `): boolean =>`
shape but different text); 3 tests failed, including "reports every kind of
mismatch with both sides" going from 5 mismatch lines to fewer. `mutant
killed: the command exited 1`.

**M4** (`known`'s `facts.generators.includes(id);` → `true;`) — 1 test failed
("reports every kind of mismatch...", mismatch count 5 → 4, the `generators`
claim wrongly agreeing). `mutant killed: the command exited 1`.

**M5** (`PROSE_LESSONS`'s `) lessons\\b` → `) lessonz\\b`) — printed diff
touched only the `PROSE_LESSONS` line (confirmed `PROSE_TESTS` on the
following line unchanged); 1 test failed ("sweeps report prose for lesson and
test counts", mismatch count 3 → 1). `mutant killed: the command exited 1`.

**M6** (`eval/bin/counts.ts`, `nothing: 2,` → `nothing: 0,`) — the
end-to-end spawn test ("exits non-zero from the command line when there is
nothing to check") failed: expected exit 2, got 0. `mutant killed: the
command exited 1`.

**M1 re-run against the whole file, post-unit-2, per the plan's instruction
to confirm test 23 reinforces it** — it does not, and the reason is worth
recording rather than glossing: `reconcile()`'s own `empty.length > 0` fold
(added responding to the unit-1 advisor finding) is a *second, independent*
guard over the supplied-document-empty case, so the end-to-end spawn test is
protected by that fold rather than by `verdict()`'s literal line. M1 is still
correctly killed — 3 failures, all direct `verdict()` callers (tests 6, 7,
14) — just not by test 23. This is a stronger design than the plan
anticipated (two independent guards instead of one for the CLI-level
"nothing" case) rather than a weaker one, but it is not what section 3.1
predicted, so it is stated rather than silently claimed as a match.

`git status --short` was empty after every mutation run (the harness's own
trap restored the file each time).

## Retro runs (unit 3 step 2), verbatim

```
=== TASK1-PLAN.md ===
plan  lessons  src/content/courses/differentiation.ts  11 = 11  ok
plan  lesson-ids  ...  ok
plan  level-checks  src/content/courses/differentiation.ts  15, 12, 14, 15 = 15, 12, 14, 15  ok
checked: plan 3 claims, report 0 claims
COUNTS AGREE
exit:0

=== TASK2-PLAN.md ===
plan  lessons  src/content/courses/complexNumbers.ts  14 = 14  ok
plan  lesson-ids  ...  ok
plan  level-checks  src/content/courses/complexNumbers.ts  15, 12, 15, 15 = 15, 12, 15, 15  ok
checked: plan 3 claims, report 0 claims
COUNTS AGREE
exit:0

=== TASK3-PLAN.md ===
plan  tests  -  2995 = 3117  MISMATCH: expected 2995, suite has 3117 (line 171)
checked: plan 1 claims, report 0 claims
COUNTS DISAGREE: 1 mismatches
exit:1

=== TASK4-PLAN.md ===
plan  lessons  src/content/courses/trigonometricFunctions.ts  15 = 15  ok
plan  lesson-ids  ...  ok
plan  level-checks  src/content/courses/trigonometricFunctions.ts  12, 15, 15 = 12, 15, 15  ok
plan  tests  -  3086 = 3117  MISMATCH: expected 3086, suite has 3117 (line 325)
checked: plan 4 claims, report 0 claims
COUNTS DISAGREE: 1 mismatches
exit:1

=== TASK4-PLAN.md + task4-summary-prose.md ===
report: no counts block found; prose sweep only
plan  lessons  src/content/courses/trigonometricFunctions.ts  15 = 15  ok
plan  lesson-ids  ...  ok
plan  level-checks  src/content/courses/trigonometricFunctions.ts  12, 15, 15 = 12, 15, 15  ok
plan  tests  -  3086 = 3117  MISMATCH: expected 3086, suite has 3117 (line 325)
report  prose-lessons  -  55 = [tree lesson counts]  MISMATCH: 55 is not a lesson count the tree has (no course total, level total or grand total) (line 5)
report  prose-lessons  -  44 = [tree lesson counts]  MISMATCH: 44 is not a lesson count the tree has (no course total, level total or grand total) (line 5)
report  prose-tests  -  3034 = 3117  MISMATCH: expected 3034, suite has 3117 (line 5)
checked: plan 4 claims, report 3 claims
COUNTS DISAGREE: 4 mismatches
exit:1
```

(Lesson-id lists elided with `...` above for length; the full lines were
printed and read during the run — every id matched exactly.)

TASK1 and TASK2 agree, TASK3 and TASK4 correctly disagree only on their now-stale
`tests` count (both plans predate the eval tooling's own +31 tests, which is
expected and not a defect) — exactly the shape section 3.3 step 2 predicted.
The task-4 prose fixture flags all three numbers the real task-4 summary
invented (55, 44, 3034), which is the incident this whole task exists to
catch.

## The self-run — this plan's own prediction goes red, and that is reported rather than hidden

TASK5-PLAN.md's own `## 6. Done` section carries a frozen `counts` block
claiming `tests: 3111`. The actual final count is **3117** (see "predicted
counts" above — both advisor consultations found gaps worth six extra tests
combined). Reconciling the plan against the tree therefore mismatches on its
own `tests` claim, **regardless of what this report says**, because a plan's
claim and a report's claim are each checked independently against the tree —
not against each other:

```
$ eval/bin/counts.sh eval/plans/TASK5-PLAN.md eval/reports/TASK5-REPORT.md --suite-log /tmp/claude-0/task5/suite-final.txt
plan: counts block found; Done-section prose ignored
report: counts block found
plan  tests  -  3111 = 3117  MISMATCH: expected 3111, suite has 3117 (line 303)
report  tests  -  3117 = 3117  ok
checked: plan 1 claims, report 1 claims
COUNTS DISAGREE: 1 mismatches
exit:1
```

**This is not fixed by editing the plan.** PREFLIGHT and both advisor
consultations are explicit on this: a red gate is read and reported, never
routed around by editing the frozen prediction to match reality after the
fact — that is exactly the "check that cannot fail" class this whole project
has been trying to close. The report's own `tests: 3117` claim (below) is
correct and agrees with the tree; the plan's `3111` is a stale prediction from
before either advisor consultation ran, and this divergence, caught by the
tool checking its own plan, is the strongest single piece of evidence that
the tool works as designed — it does not special-case its own authoring
task.

## Section 8 (plan verification items), confirmed or not, in this container

- **Confirmed:** baseline exactly as stated (3086/silent/0-errors-25-warnings);
  toolchain (`vite-node/6.0.0`, GNU sed 4.9); tree facts (8 courses, 101 total
  lessons, 224 registry ids, and every named course's figures) — all matched
  the plan's item 3 exactly; the section 2.2 grammar's readings of plans 1–4
  (item 6) matched exactly, including the TASK4 grep-span/stop-rule-alternative
  exclusions; `tsconfig.eval.json` typechecks `eval/bin` cleanly (item 9);
  vitest does collect a test file under `eval/bin/` (the +19/+12 counts are
  the proof, as the plan itself anticipated when flagging this unverified).
- **Not confirmed as claimed — corrected:** item 5's `process.argv` layout
  (see the dedicated section above). `npx oxlint eval/bin` was run explicitly
  (not bare `oxlint`) and returns 0 errors, confirming the item-marked-unverified
  claim that oxlint scans `eval/`.
- **Confirmed:** `execFileSync` of the wrapper works from inside a vitest
  worker (all three spawn tests pass, including nested `npx vite-node`
  inside the vitest process).
- **Not separately re-verified:** `import.meta.dirname` vs
  `fileURLToPath(import.meta.url)` — used the latter throughout, since it is
  unconditionally available rather than version-gated, and it worked.

## Proposed one-line additions for the owner (not applied — outside this task's file scope)

For `eval/FLOW.md` stage 6: *"Counts: `eval/bin/counts.sh eval/plans/TASK{N}-PLAN.md
eval/reports/TASK{N}-REPORT.md --suite-log <the gate run's output>` exits 0,
run before reading the report."*

For `eval/PREFLIGHT.md`'s bookkeeping rule: *"A report's counts go in a
`counts` block and `eval/bin/counts.sh` exits 0 on it before the report is
committed."* (Note from this task's own self-run above: that step checks the
*report's* claim against the tree, not the plan's — a plan whose own
prediction has since gone stale, as this one's has, will still show a
mismatch on the plan side, correctly.)

## Anything changed that no test asserts

- `package-lock.json`'s transient `npm install` churn was reverted before any
  commit (see "Baseline, measured here"); nothing in the pushed tree touches
  it.
- The `countsTree.ts` → B4 fix (erroring on >1 course-shaped export per file)
  changes behaviour for a hypothetical file this repository does not have
  today (every course file currently exports exactly one course); no test
  exercises the >1 branch directly, only the 0-exports branch (the stray-file
  case) and the exactly-1 branch (every real course file). Recorded as a gap
  rather than silently left implicit.
- `formatResult`'s exact wording (the `checked: ...` line's `report: not
  supplied` phrasing was considered and dropped — see `countsCore.ts`'s
  `formatResult`, which reports `report 0 claims` whether the report was
  omitted or supplied-but-empty; the CLI's `supplied` array to `reconcile`
  is what actually distinguishes those cases for the exit code, so the exit
  code is correct even though the printed count alone would not
  distinguish them). No test asserts the human-readable distinction; the
  exit code is what is tested, and is correct.

## Gates on the pushed tree (this commit)

```counts
tests: 3117
```

`npm test` **3117**, `npx tsc --noEmit -p tsconfig.app.json` and `-p
tsconfig.eval.json` both silent, `npm run lint` 0 errors / 25 warnings (same
25 as baseline), `npm run build` passes. `git status` clean. `main` untouched,
locally and remotely.
