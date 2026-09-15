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
suites, `SEEDS` still 200, no test removed).

T5's scorer is a Playwright script run against a dev server at 393x852. Node
resolves its `playwright-core` import from the script's own location, so copy
it next to an installed `playwright-core` and run it from there — running it by
absolute path out of this directory fails module resolution, not the check.

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
  behaviour. The predicate is deliberately wide (Rule 1c corollary): every
  exported function is tried under three call shapes — `f(doc)`, `f(doc, '^')`,
  `f(doc, {insert: '^'})` — alongside the no-new-export case of typing `^`
  through the existing insert path. Filtering by arity, as the first version
  did, asserts a signature and would miss a correct fix shaped as
  `applyKey(doc, key)`. Every name it does assert is present at the base.
- **t8** finds the generator the task asked for by what its slide *answers*
  (an expression slide whose answer carries a fractional index), then uses that
  slide's own declared `domain` rather than naming a value. **Widened again on
  2026-09-15**: the first version matched one optional open paren, and the house
  style over-brackets `answer` because mathjs parses it and nobody reads it —
  `x^((3)/(2))`. Rep 2's generator was invisible to it and scored a false FAIL.
  The predicate now tolerates any bracketing. Re-checked in both directions:
  red on base `96cf78e`, green on rep 1 and rep 2.

Both were confirmed to fail on their untouched bases and to pass on the
branches from arm A rep 1 (Rule 1c, both directions). Every assertion in t7
states the same behavioural precondition, so a missing action reports as
`nothing in the editor turns typed digits into a stacked exponent` rather than
cascading as `power is not a function` — a `not a function` failure would mean
the scorer was testing vocabulary.

## Isolation

The boundary is the harness's clone, not the preamble. A remote session given
`source_revision: eval-base-tN` receives a **single-branch** clone: that
branch's history and nothing else. Probed 2026-09-15 against `eval-base-t4`
(session `session_01Jkzo3usgWEXZFQVgcG8Ruz`, Haiku, throwaway):
`git rev-list --count HEAD` and `git log --oneline --all | wc -l` both report
11 — the base's own history — the repository is not shallow, and
`git cat-file -t` on an object from the freeze commit reports it **missing**.
`main` is never fetched, so the scorers, the protocol and every other
`eval-base-*` and `eval/tN-*` branch are absent from the clone as objects, not
merely absent from the checked-out tree. Verified against the local repo: the
freeze commit `2a557fa` is not an ancestor of any base, and `eval/scorers/`
first appears in `8b756d6`, which is likewise not an ancestor.

`PROMPT_PREAMBLE.md` holds the block every task prompt opens with, which strips
the remote and the non-base refs. Given the above it is **defence-in-depth**,
not the mitigation: it removes a remote that carries nothing the agent could
fetch, and deletes refs the clone does not have. It stays in the instrument
because it is frozen — removing it would invalidate the reps before it — and
because it costs one command and would catch a harness change back to a
full-mirror clone.

One thing to watch rather than assume: the probe ran with no `outcome_branch`.
If the harness fetches an existing outcome branch, a rep whose branch name
collides with a completed rep's could see it. Rep 2 and rep 3 use fresh
suffixes (`-r2`, `-r3`), so no outcome branch exists at clone time.
