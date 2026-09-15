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

## Isolation — RETRACTED, and the instrument is void

**What this section used to say was wrong.** It claimed the harness gives a
single-branch clone, that `main` is never fetched, and that the boundary was
therefore closed by the harness with no agent compliance involved. That claim
was built on one probe, and the probe never tested the thing that mattered.

### The reasoning error

The first probe (2026-09-15, `eval-base-t4`, no `outcome_branch`) reported 11
commits, no sibling branches, and the freeze commit's objects **missing**. I read
that as "the remote is restricted". It is not what it shows. A fresh clone simply
has not fetched anything else *yet*. Absence of objects in a working copy is not
inability to obtain them, and I never ran `git fetch origin main` to find out.

A second probe with arm B's exact configuration (`eval-base-t1`, `outcome_branch`
set) reported 26 commits and 20 `eval/*` branches. That is not a contradiction of
the first — it is the same remote, seen after more had been fetched. Both probes
are consistent with an ordinary, fully reachable remote.

So `git fetch origin main` followed by `git show FETCH_HEAD:eval/scorers/...`
was available to every task session, in both arms, the whole time.

### What follows

The preamble was never defence-in-depth. It was the **only** mitigation, and it
was always compliance-based — an instruction the agent under test could ignore,
with no way to check afterwards whether it had. Removing it from arm B removed
the only thing standing between an agent and the answer key.

And compliance cannot be audited here: this environment exposes no transcript
reader for `create_session` children. `get_session` returns a self-written
one-line summary, not a log. So "did this session fetch the scorers?" is
**unobservable**, in both arms.

Capability proven, behaviour unobservable: every rep that ran after the scorers
were committed is void by default. Not because it leaked — because it cannot be
shown not to have.

| | Ran | Scorers existed? | Verdict |
| --- | --- | --- | --- |
| Arm A rep 1 | 2026-09-14 | **no** — `8b756d6` is dated 2026-09-15 | **survives** |
| Arm A rep 2 | 2026-09-15 | yes | void |
| Arm A rep 3 | 2026-09-15 | yes | void |
| Arm B (voided attempt) | 2026-09-15 | yes | void, already |
| Arm B rep 1 | 2026-09-15 | yes | void |

Arm A rep 1 survives on a different basis from the others: not compliance, but
**absence of a target**. Nothing readable from its clone contained an answer key,
because the key did not exist yet. Verified: `8b756d6`, the commit that first
adds `eval/scorers/`, is not an ancestor of any rep 1 solution branch, and its
commit date is a day later than the branches.

One surviving rep decides nothing. The comparison has no result.

### The fix, and why it is not mine to apply

Enforce the boundary with git rather than with instructions: clone
`--single-branch --branch eval-base-tN`, or pin
`remote.origin.fetch` to that one ref, so a bare `git fetch` reaches nothing
else. That is a property of the repository and the clone, not of the agent's
willingness to comply, and it retires the preamble properly.

`create_session` exposes no clone flags, so this cannot be set harness-side from
here. The available route is a **separate private subject repository that never
contained the scorers**, with `source_url` pointed at it. `create_repository`
returns `403 Resource not accessible by integration` to this integration, so
that is a human's step. Everything downstream is blocked on it.

**One thing to get right when building it:** `outcome_branch` pushes land in the
source repository. If solution branches accumulate in the subject repo, rep 2 can
fetch rep 1's answers and the same hole reopens one rep later. Either move the
outcome branches out of the subject repo between reps, or give each rep its own
subject repo.
