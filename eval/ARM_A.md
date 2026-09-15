# Arm A — Opus, no advisor. Freeze = content of `eval/INSTRUMENT.sha256`

**Eight tasks, not nine.** T3a and T3b are two runs of one task: T3 split only
because its two requirements were unsatisfiable together, and the task count must
not inherit that split. **T3 passes only if both halves pass.** Eight tasks over
three reps is 24 trials, so `EVAL_PROTOCOL.md` Rule 0 applies verbatim — ≥4 of 24
**and** cost ≤ 1.2× — with no restatement and no rescaling.

## Rep 1 — re-scored 2026-09-15 under the corrected instrument

| | Scorer | Suite | `tsc` | Verdict |
| --- | --- | --- | --- | --- |
| **T1** | green | 1920 | silent | **PASS** |
| **T2** | green | 2509 | silent | **PASS** |
| **T3** | t3a INCONCLUSIVE, t3b green | 2591 / 2580 | silent | **INCONCLUSIVE** |
| **T4** | green (3/3, SEEDS 200) | 219 | silent | **PASS** |
| **T5** | green (Playwright, 393px) | 1079 | silent | **PASS** |
| **T6** | green | 2238 | silent | **PASS** |
| **T7** | green | 1922 | silent | **PASS** |
| **T8** | green | 1914 | silent | **PASS** |

**7 PASS, 0 FAIL, 1 INCONCLUSIVE of 8.**

### What changed from the first scoring, and why

- **T3b was FAIL, now green.** Not a re-score — a re-run. Its prompt was silent
  on whether "the whole rest of the line" included mixed precedence, and the
  first branch implemented a same-precedence rule in good faith. Told explicitly
  that `8 + 4 x 3` as 20 must be accepted and as 36 must not, the re-run
  delivered it. Second task in this set to turn on a sentence stating a
  requirement rather than revealing a mechanism.
- **T3a was pending, now INCONCLUSIVE.** Its scorer still cannot terminate
  against that branch; see the defect register.
- **T3 as a whole is INCONCLUSIVE**, because one half is.

### T3b constraint check — passes

The scorer only tests behaviour, so the diff was read against the prompt's
constraints separately. The branch deletes far more than the one test it was
licensed to change — but every further deletion is that change's entailment, and
the guards that matter survive:

| | |
| --- | --- |
| `out-of-order` assertions | 0 remain — entailed; the rule itself was removed |
| wrong-value guards | **preserved and strengthened** — 5 assertions, including `value: 36` refused, which is what the prompt required |
| solvability walk in `generators.test.ts` | still present |
| net test count | 21 → 23 |

Nothing weakened. Had the wrong-value guards gone with the ordering ones, this
would be a constraint failure the green scorer would never have shown.

### Blinding — what this re-score is and is not

Scored mechanically from the branches, with the collapsed-T3 rule and the fixed
scorers. It is **not** blind, and cannot be made so retrospectively: the first
scoring was run in this session and its verdicts are already known here. What the
re-score establishes is that the verdicts reproduce under the corrected
instrument, which is reproducibility, not independence.

Blinding applies from arm A rep 2 onward: branches are copied to opaque names
before scoring and the mapping withheld until every verdict is written. Note the
limit — the **task** cannot be hidden, because the scorer is chosen per task.
Only arm and rep are concealed, which is what adjudication independence actually
requires.

### Cost

Not yet recorded per task for rep 1. Being captured from `get_session` for reps 2
and 3 and for all of arm B, as Rule 0's second clause needs it.
