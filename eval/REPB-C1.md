# Arm B rep 1 (Sonnet executor, Opus advisor) — scored against freeze `6338653`

> **VOID.** Unverifiable: the scorers were fetchable from every task clone and
> compliance cannot be audited in this environment. See `eval/README.md`
> § Isolation. Kept as a record, not as a result.

Launched 13:33Z on 2026-09-15, all eight together; last branch landed 14:09Z.
Bases, task text and scorers identical to arm A. Two differences from arm A, and
only two: the model is `claude-sonnet-5` with an Opus advisor, and **there is no
isolation preamble** — it was removed after the voided attempt (`REPB1.md`)
showed it cost a whole task. Scored with `eval/bin/score.sh -c1` in 4m37s.

| | Scorer | Suite | `tsc` | Verdict | Cost | Arm A rep 3 |
| --- | --- | --- | --- | --- | --- | --- |
| **T1** | **2 of 45 red** | 1921 green | silent | **FAIL** | $3.20 | FAIL |
| **T2** | green | 2509 green | silent | **PASS** | $4.05 | PASS |
| **T3** | **2 of 5 red** | 2579 green | silent | **FAIL** | $3.58 | FAIL |
| **T4** | n/a (run discipline) | 3 × 219 green | silent | **PASS** | $3.28 | PASS |
| **T5** | green (Playwright, 393px) | 1079 green | silent | **PASS** | $2.10 | PASS |
| **T6** | green | 2237 green | silent | **PASS** | $3.30 | PASS |
| **T7** | green | 1920 green | silent | **PASS** | $2.27 | PASS |
| **T8** | green | 1915 green | silent | **PASS** | $3.13 | PASS |

## Arm B rep 1: 6 / 8 — the same six as every arm A rep

Cost **$24.91** against arm A rep 3's **$43.93** — 0.57×, on an identical
result. Note the shape: arm B's costs are flat ($2.10–$4.05), arm A's ranged
$2.44–$13.16. T3 alone cost arm A $13.16 and arm B $3.58.

## Removing the preamble fixed the run

Every session started immediately, none stalled, none flagged a prompt
injection, and seven of eight pushed without a poke. The voided attempt lost T7
entirely and needed five interventions. Zero were needed here.

## The advisor was verifiably consulted

Every branch carries `eval-advisor.log`, 29 to 89 lines:

| | Lines | | Lines |
| --- | --- | --- | --- |
| T1 | 43 | T5 | 29 |
| T2 | 56 | T6 | 53 |
| T3 | 89 | T7 | 48 |
| T4 | 38 | T8 | 71 |

These are real consultations, not box-ticking. T3's first entry sets out its own
reading of `expr.ts`, quotes the existing test its second requirement
contradicts, and asks five specific questions including whether to implement or
decline that requirement. This is the check arm B's voided attempt could not
pass; it passes cleanly.

## No test was weakened — six branches needed reading

Six branches delete test lines. All six are neutral or strengthenings:

| | Deleted | Verdict |
| --- | --- | --- |
| T2 | `renderExpr` → `displayExpr` on the *evaluate* line | **Correct.** An evaluate line is one whole string; the fragment renderer was the wrong one. Also **adds** a full solvability walk asserting every target has a fragment to tap at every step. |
| T3, T6 | an import line | no-op |
| T4 | the oracle line and its message | the `{ simplify: false }` fix, reached for the fourth time independently |
| T7 | a one-line comment | expanded to three lines |
| T8 | two `|x|`-trap assertions | **Strengthening.** Not removed — pinned to `{ domain: 'real' }`, with a new block documenting that `domain: 'positive'` deliberately gives that guard up, and a test proving the pair stays `incorrect` on the real line. |

T8's is the one worth reading. `CLAUDE.md` singles the `|x|` trap out as the
reason the agreement threshold cannot go below 0.5; a lesser answer would have
loosened `real` and broken it silently.

## T1 fails a fifth time, identically

`invalid` where the scorer wants `correct` and `incorrect`. Five trials now,
across two models and two arms, every one rejecting the equation at parse time
rather than isolating the shared probe scope. This is a fact about the task, not
about either model.

## T3 fails both halves, as the voided attempt did

Neither `\sqrt{36} + 1` is reachable by any legal tap, nor is a whole-line
settle accepted. The advisor log shows this was not an oversight: the executor
identified that the second requirement contradicts the existing test *refuses a
right value for a piece taken too early*, and explicitly asked the advisor
whether to implement or decline it. Arm A reps 2 and 3 removed that test's rule;
arm B kept it.

That is a defensible reading of an ambiguous task, which is the strongest
argument yet that T3 is two tasks wearing one name.
