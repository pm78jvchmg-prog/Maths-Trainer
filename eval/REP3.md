# Arm A (Opus-solo), rep 3 — scored against freeze `b6662db`

Run 2026-09-15, all eight launched together at 11:10Z. Prompts byte-identical
to reps 1 and 2, including the isolation preamble. Scorers unchanged from the
`b6662db` freeze (which widened `t8`'s discovery predicate; see `REP2.md`).

| | Head | Scorer | Suite | `tsc` | Verdict | Cost |
| --- | --- | --- | --- | --- | --- | --- |
| **T1** | `1c16510` | **2 of 45 red** | 1923 green | silent | **FAIL** | $3.32 |
| **T2** | `a02f3bb` | green | 2704 green | silent | **PASS** | $8.19 |
| **T3** | — | *pending* | — | — | *pending* | $12.19+ |
| **T4** | `59978e4` | n/a (run discipline) | 3 × 219 green | silent | **PASS** | $2.44 |
| **T5** | `b2e8830` | green (Playwright, 393px) | 1079 green | silent | **PASS** | $3.12 |
| **T6** | `ac34b81` | green | 2238 green | silent | **PASS** | $2.59 |
| **T7** | `50cb617` | green | 1926 green | silent | **PASS** | $4.56 |
| **T8** | `aa8b103` | green | 2076 green | silent | **PASS** | $6.55 |

Six of seven scored so far. T3 overran the others by a wide margin and is
still running.

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

## T4 converged on rep 2's answer

Rep 1 raised the oracle test's budget to 60s. Reps 2 and 3 both removed the
cost instead, with the same one-line change and the same reasoning — the oracle
is consumed by numeric probing, so simplifying its string buys nothing. Rep 3's
suite runs in 5.9s against the base's ~21s.
