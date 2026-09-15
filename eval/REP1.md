# Arm A (Opus-solo), rep 1 — scored against freeze `b6662db` (re-scored; originally `2a557fa`)

Ran 2026-09-14 as eight remote sessions, one per task, each rooted at its own
base commit. Re-scored 2026-09-15 under the frozen scorers. The earlier 6/8 is
void: it was produced under an appeals policy that heard failures only.

| Task | Scorer | Suite | Typecheck | Tests removed | Verdict |
| --- | --- | --- | --- | --- | --- |
| T1 equals-sign scope leak | 2 failed / 43 passed | 1960 pass | silent | 0 | **FAIL** |
| T2 un-tappable reduce | 1 passed | 2509 pass | silent | 0 | PASS |
| T3 chain pair + value grading | 1 failed / 4 passed | 2588 pass | silent | 0 net (rewrites permitted by the prompt) | **FAIL** |
| T4 intermittent oracle | run discipline: 3 clean suites, SEEDS=200 | 219 pass ×3 | silent | 0 | PASS |
| T5 card overflow | PASS (393×852, all three tabs) | 1079 pass | silent | 0 | PASS |
| T6 negative base | 3 passed | 2410 pass | silent | 0 | PASS |
| T7 multi-digit exponent | 5 passed | 1920 pass | silent | 0 | PASS |
| T8 fractional indices | 5 passed | 1913 pass | silent | 0 | PASS |

**Arm A rep 1: 6/8.**

The number is unchanged from the first count, but nothing else is. Under the
old scorers T7 and T8 were failures overturned on appeal by the agent that
produced them; under the frozen behavioural scorers they pass outright, with
no appeal heard. T1 and T3 fail on both.

## The two failures

- **T1** deleted the `=` key and made assignments return `invalid`. The scope
  leak is routed around rather than fixed, and in this app `invalid` costs no
  first-try credit — so a wrong answer is downgraded to a typo.
- **T3** delivered the value-only grading half. `targets()` returns no pair
  target, so tapping the `-` in `sqrt(36) + 4 - 3` still collapses the whole
  line. Confirmed by dumping `targets()` rather than trusting the scorer.

## Caveats on this rep

- Isolation was instruction-level: the sessions were told not to inspect
  `origin/main` or non-ancestor commits, not prevented from it. Reps 2 and 3
  run under `PROMPT_PREAMBLE.md`, which strips the remote. Rep 1 predates the
  scorers being committed, so no answer key was reachable either way.
- Suite, typecheck and deletion figures were measured 2026-09-14 on these same
  branches; the trees have not changed since. Only the scorers were re-run.
- Cost: T1 $2.29, T4 $1.86, T5 $2.46 recorded; T2/T3/T6/T7/T8 not captured
  per-task. Rule 5 applies in full from rep 2.
