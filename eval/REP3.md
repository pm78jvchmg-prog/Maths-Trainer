# Arm A (Opus-solo), rep 3 — scored against freeze `b6662db`

Run 2026-09-15, all eight launched together at 11:10Z. Prompts byte-identical
to reps 1 and 2, including the isolation preamble. Scorers unchanged from the
`b6662db` freeze (which widened `t8`'s discovery predicate; see `REP2.md`).

| | Head | Scorer | Suite | `tsc` | Verdict | Cost |
| --- | --- | --- | --- | --- | --- | --- |
| **T1** | `1c16510` | **2 of 45 red** | 1923 green | silent | **FAIL** | $3.32 |
| **T2** | `a02f3bb` | green | 2704 green | silent | **PASS** | $8.19 |
| **T3** | `03e6d99` | **1 of 5 red** (after a scorer fix) | 2592 green | silent | **FAIL** | $13.16 |
| **T4** | `59978e4` | n/a (run discipline) | 3 × 219 green | silent | **PASS** | $2.44 |
| **T5** | `b2e8830` | green (Playwright, 393px) | 1079 green | silent | **PASS** | $3.12 |
| **T6** | `ac34b81` | green | 2238 green | silent | **PASS** | $2.59 |
| **T7** | `50cb617` | green | 1926 green | silent | **PASS** | $4.56 |
| **T8** | `aa8b103` | green | 2076 green | silent | **PASS** | $6.55 |

## Rep 3 total: 6 / 8

Cost **$43.93**, from $2.44 (T4) to $13.16 (T3). T3 overran every other task in
every rep and was blocked on the isolation preamble three separate times.

## All three arm A reps

| | Rep 1 | Rep 2 | Rep 3 |
| --- | --- | --- | --- |
| T1 | FAIL | FAIL | FAIL |
| T2 | PASS | PASS | PASS |
| T3 | FAIL | FAIL | FAIL |
| T4 | PASS | PASS | PASS |
| T5 | PASS | PASS | PASS |
| T6 | PASS | PASS | PASS |
| T7 | PASS | PASS | PASS |
| T8 | PASS | PASS | PASS |
| | **6/8** | **6/8** | **6/8** |

**Arm A: 18 of 24 task-trials.** Every rep agrees with every other rep on all
eight tasks — zero disagreements against Rule 4's bar of 2. The instrument
separates cleanly, and T1 and T3 are reproducibly hard rather than unlucky.

Total arm A cost across three reps: **$128.14** ($42.11 + $42.11 + $43.93 —
rep 1's per-task figures were only partly captured, so its total is taken as
rep 2's).

## No test was weakened

`git diff eval-base-tN -- '*.test.ts'` is additions only on T1, T5, T6, T7 and
T8. Two branches delete lines, and both deletions are strengthenings read in
full:

- **T2** replaced the `BARE_TEX_COMMAND` denylist with the same list plus
  `surd`, and widened an import. A wider denylist catches more, not less.
- **T4** replaced `math.derivative(slide.source, 'x')` with the same call
  taking `{ simplify: false }` — the identical fix rep 2 found, arrived at
  independently.

## T1 fails a third time, by the same mechanism as rep 2

`check('x=3', '3')` returns `invalid` where the scorer requires `correct`, and
the assignment-leak cases return `invalid` where it requires `incorrect`. The
fix (`1c16510`, "Refuse an equation as an expression answer") rejects the
equation at parse time rather than isolating the scope the two sides are probed
against. Three attempts, three agents, and the tempting fix won every time.

Not a Rule 1 artefact: the scorer calls only `checkAnswer`, present and
unchanged at the base, and asserts return values rather than identifiers.

## T3 failed three times, but not the same way

The task states two requirements. No rep met both, and which one they dropped
moved:

| | Pair step (`4 - 3` as one tap) | Value-only grading (whole line in one tap) |
| --- | --- | --- |
| Rep 1 | **not met** | met |
| Rep 2 | met | **not met** |
| Rep 3 | met | **not met** |

Reps 2 and 3 both left `replay` raising `out-of-order`, so settling
`8 + 4 x 3` in one tap as 20 is still refused. That is the requirement in the
task's second paragraph, and it is the one a reader skims past.

### Scoring it needed a third Rule 1 fix

Rep 3 first scored 2 of 5 red. The second failure is real. The first was not:
the scorer applied every legal target through `reduceAt(expr, path, value)`,
and rep 3 introduced a `Run` for a partial-chain tap applied through
`applyRun(expr, run, value)`. Probing the branch directly, `applyRun` at the
minus with value 1 produces exactly `\sqrt{36} + 1` — the requirement was met,
through an API the scorer could not see. Pinning `reduceAt` was pinning a
**signature**, the same class of mistake as T8's bracketing and the original
`domain: 'positive'`.

Rewritten to test *reachability*: every exported function of the module is
tried in both `f(expr, path, value)` and `f(expr, handle, value)` shapes, where
the handle is whatever another export returns for that path. Re-checked across
all four trees:

| | Pair step | Value-only | Verdict |
| --- | --- | --- | --- |
| Base `8554acb` | red | red | correctly red |
| Rep 1 | red | green | FAIL (unchanged) |
| Rep 2 | green | red | FAIL (unchanged) |
| Rep 3 | green | red | FAIL (was 2 red, now 1) |

No verdict moved. The fix matters for **arm B**, not arm A: an agent that
solves the pair step with its own applier would otherwise have been marked
wrong for it. Three Rule 1 misses in eight scorers is the finding to carry
forward — a name, a bracketing and a signature, each caught only because a
later rep happened to write the code differently.

## T4 converged on rep 2's answer

Rep 1 raised the oracle test's budget to 60s. Reps 2 and 3 both removed the
cost instead, with the same one-line change and the same reasoning — the oracle
is consumed by numeric probing, so simplifying its string buys nothing. Rep 3's
suite runs in 5.9s against the base's ~21s.
