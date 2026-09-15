# eval/

Scorers and base commits for the model-swap comparison. The protocol is
`../EVAL_PROTOCOL.md`; this directory is the frozen instrument it refers to.

## Layout

- `bases.tsv` — task, base commit, scorer, and where the scorer is copied to.
- `scorers/` — one per task. Named `*.scorer.ts`, **not** `*.test.ts`, so the
  project's own `npm test` does not glob them (vite.config.ts declares no
  `test.include`, so vitest uses its default `**/*.{test,spec}.*`). They are
  copied into the tree under test and renamed at scoring time.

## Running a scorer

```bash
git worktree add --detach /tmp/eval/tN origin/eval/tN
ln -s "$PWD/node_modules" /tmp/eval/tN/node_modules
cp eval/scorers/tN.<name>.scorer.ts /tmp/eval/tN/<copy_to>/tN.test.ts
cd /tmp/eval/tN && npx vitest run <copy_to>/tN.test.ts
```

A task passes only if **all three** hold: its scorer is green, the full suite is
green, and `npx tsc --noEmit -p tsconfig.app.json` is silent. Deleting,
skipping or weakening an existing test is an automatic fail — check with
`git diff eval-base-tN -- '*.test.ts'`.

T4 has no scorer file; its criterion is run discipline (three consecutive clean
suites, `SEEDS` still 200, no test removed). T5's scorer is a Playwright script
run against a dev server at 393x852.

## Rule 1b audit (2026-09-15)

Every identifier each scorer asserts was checked against that task's own base
commit. All resolve:

| Task | Base | Asserted | Result |
| --- | --- | --- | --- |
| t1 | `b4c0d91` | CheckOptions, checkAnswer, hashSeed, makeRng, probePolicy | all resolve |
| t2 | `f6c6b38` | Expr, Generator, makeRng, nodeAt, reduceAt, registeredGenerators, renderExpr, targets, toTex, valueOf | all resolve |
| t3 | `8554acb` | ROOT, bin, isSolved, num, pow, reduceAt, replay, root, targets, toTex | all resolve |
| t4 | `0de320a` | SEEDS, DIFFICULTIES | all resolve |
| t5 | `933009c` | `.course-card`, `.tab` | all resolve |
| t6 | `1ebb945` | bin, num, pow, renderExpr, toTex | all resolve |
| t7 | `c3e90b5` | checkAnswer; EMPTY_DOC, insertAtom, insertFraction, moveRight, toAnswer, toTex | all resolve |
| t8 | `96cf78e` | Generator, checkAnswer, makeRng, registry | all resolve |

T7 and T8 were rewritten to get here. Their first-run scorers asserted
`insertSup` and `domain: 'positive'`, neither of which exists at the relevant
base — both were logged as model failures and neither was one.

The rewrites discover rather than name:

- **t7** imports the editor as a namespace and finds the exponent action by
  behaviour — any unary `Doc -> Doc` export after which typed characters stack
  as one exponent. Every name it does assert is present at the base.
- **t8** finds the generator the task asked for by what its slide *answers*
  (an expression slide whose answer carries a fractional index), then uses that
  slide's own declared `domain` rather than naming a value.

Both were confirmed to fail on their untouched bases — `no export turns typed
digits into a stacked exponent` and `no expression slide answers with a
fractional index` — and to pass on the branches from arm A rep 1.
