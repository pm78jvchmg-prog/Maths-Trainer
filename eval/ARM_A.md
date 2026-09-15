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

## Rep 2 — scored 2026-09-15 22:45, freeze verified immediately before

| | Scorer | Suite | `tsc` | Deletions read | Verdict |
| --- | --- | --- | --- | --- | --- |
| **T1** | green | 1916 | silent | 0 | **PASS** |
| **T2** | green | 2506 | silent | import rewrite only | **PASS** |
| **T3** | t3a green, t3b green | 2590 / 2582 | silent | see below | **PASS** |
| **T4** | green (3/3, SEEDS 200) | 219 | silent | oracle call only | **PASS** |
| **T5** | green (Playwright, 393px) | 1079 | silent | 0 | **PASS** |
| **T6** | green | 2240 | silent | import rewrite only | **PASS** |
| **T7** | green | 1923 | silent | 0 | **PASS** |
| **T8** | green | 2077 | silent | 0 | **PASS** |

**8 PASS, 0 FAIL, 0 INCONCLUSIVE of 8.**

### T3 is scoreable this rep, and not because the scorer changed

`t3a.pair.scorer.ts` is byte-identical to the one that timed out on rep 1 — the
freeze verifies `OK` before and after. It terminates here because *this* branch's
`pairBank` returns. The rep 1 INCONCLUSIVE was a property of that branch, which is
what the defect register already says; it is not a scoring artefact and it is not
now retracted.

### Constraint checks — read by hand, every deleted line

The raw deletion counts (t3a 6, t3b 32, t2/t4/t6 1 each) overstate the case
badly. Line by line:

- **t2, t6** — one deleted line each, both the `import` statement being widened.
- **t4** — one deleted line, the oracle call itself, replaced by the same call
  with `{ simplify: false }`. That is the fix.
- **t3a** — the five deleted lines are the bank assertions, **extracted into a
  `needsBank(key, node)` helper and then called twice**: once for the node, once
  for the new pair path. Strictly stronger than the base, not weaker. Its prompt
  forbids weakening a test and it does not.
- **t3b** — licensed by its own prompt to update the ordering test. The removed
  `out-of-order` assertions are entailments of removing the rule. The guards
  that matter were **rewritten rather than dropped**: `refuses the addition
  before the multiplication, as the wrong value it is` asserts
  `value: 36 -> wrong-value`, in both `expr.test.ts` and `session.test.ts`.
  That is precisely what the prompt demanded.

Net `it(` counts, base to branch: t1 104→108, t2 163→163, t3a 163→175,
t3b 163→167, t4 60→60, t5 84→84, t6 156→161, t7 106→115, t8 100→106. **No branch
ends with fewer tests than its base.**

### Cost

| t1 | t2 | t3a | t3b | t4 | t5 | t6 | t7 | t8 | **total** |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| $2.35 | $5.52 | $11.52 | $5.84 | $2.13 | $3.60 | $5.17 | $3.65 | $7.26 | **$47.04** |

t3a is the outlier at $11.52, and part of that is not task work: it finished and
pushed, then spent its tail blocked asking to be allowed to run the preamble's
refused git commands. Arm B will meet the same refusal, so the overhead is
symmetric, but it inflates both arms' absolute cost against Rule 0's ratio.

### Blinding — the honest limit on this rep

Not blind. Rep 2 was scored in the session that launched it, so arm and rep were
known throughout.

What that can and cannot have touched:

- The eight scorers are deterministic programs. Their output does not depend on
  what the person running them believes, so the eight green results carry no
  bias from this.
- The **constraint checks above are judgement**, and were made knowing this is
  arm A. That is real exposure, even though every one of them came out clean and
  none required a close call.

No disputes were raised, so nothing is queued for adjudication. When arm B rep 2
is scored, its constraint checks get read against these — and any call that is
close in either arm goes to a blind pass over the two together, not to whichever
arm I happen to be looking at.

### Rep 1 vs rep 2 — the gate so far

Seven of eight tasks agree outright. T3 differs: INCONCLUSIVE then PASS. One
disagreement of eight, inside the tolerance of 2. The gate needs rep 3 before it
can be called.
