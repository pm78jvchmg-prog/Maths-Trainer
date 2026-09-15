# Overnight chain runbook — arm B reps 1 to 3, then the comparison

Read this first on every wake-up. It is the state machine: work out where the
chain is from what exists on `origin` and in `eval/`, do the next undone step,
then stop. Do not redo a finished step.

## Naming, before anything else

The arm is **arm B**. Its reps are **arm B rep 1, 2, 3**. The branch suffixes
`-c1`, `-c2`, `-c3` are a git detail only: the voided first attempt holds the
`-b1` names and the git proxy refuses branch deletion. **Never call it arm C.**

## Where the chain is

```bash
git fetch origin 'refs/heads/eval/*:refs/remotes/origin/eval/*'
git branch -r | grep -c -- '-c2'                 # 8 = rep 2 has fully landed
ls eval/LAUNCHED-c*.md eval/REPB-C*.md eval/COMPARISON.md 2>/dev/null
```

| Step | Skip it when | Otherwise do |
| --- | --- | --- |
| 1 | `eval/REPB-C1.md` exists | score rep 1 |
| 2 | `eval/LAUNCHED-c2.md` exists | launch rep 2, **then write that marker** |
| 3 | `eval/REPB-C2.md` exists | score rep 2 — but only once all 8 `-c2` branches are pushed |
| 4 | `eval/LAUNCHED-c3.md` exists | launch rep 3, **then write that marker** |
| 5 | `eval/REPB-C3.md` exists | score rep 3 — only once all 8 `-c3` branches are pushed |
| 6 | `eval/COMPARISON.md` exists | write the comparison (spec at the end) |

**The launch marker is not optional.** Branch count alone cannot tell "rep not
launched yet" from "rep launched and still running" — both show zero branches.
Without the marker a wake-up an hour into a running rep would launch it a second
time, doubling spend and producing two sets of sessions racing for the same
branch names. On launching a rep, immediately commit
`eval/LAUNCHED-cN.md` listing the eight session ids and the launch time, and
push it before doing anything else.

A rep is ready to score only when **all eight** branches are pushed. If the
marker exists but branches are missing, the rep is still running: check those
sessions, resume any that are blocked (see *Stalls*), and otherwise stop and let
the next wake-up look again. Do not relaunch.

## Session ids

So a fresh session can drive this chain without the original conversation.

**Arm B rep 1** (branches `eval/tN-c1`), launched 13:33Z 2026-09-15:

| | Session |
| --- | --- |
| T1 | `session_01VDSkok4VuHRtXmptYjZ2cx` |
| T2 | `session_01Mu77Y4ms3ySzJ7HtX6dWJM` |
| T3 | `session_01Ryh8nKts7gi32xs57a9kYA` |
| T4 | `session_01SL85jN3uJ4MsLHZcc441Md` |
| T5 | `session_01KGs2RzyvgCg5zY4nx2zaqo` |
| T6 | `session_01QRxZuvYCf7yjjnUR4Nr2hv` |
| T7 | `session_01XyKX97dCU6SBxmPNn4D6Tf` |
| T8 | `session_01U2TU8eDqmd9w7fD94zSxLe` |

Record reps 2 and 3 the same way here as they are launched, so a stall can be
resumed by any session, not only the one that started it.

## Stalls: resume, never recreate

If a session stops — usage limit, a permission prompt, a question — **resume
that same session**:

```
create_trigger(persistent_session_id=<that session id>, prompt="<what it needs>")
fire_trigger(<returned trigger_id>)
delete_trigger(<trigger_id>)
```

`SendMessage` does not reach cloud sessions. **Never create a new session to
redo work a stalled one has already done** — the user asked for this in terms.
A new session for a task that never produced anything is fine; one that
duplicates finished work is not.

## Launching a rep

Eight sessions, one per task, `model: claude-sonnet-5`, tags
`["eval","arm-b","rep-N","tN","corrected"]`, `source_url`
`https://github.com/pm78jvchmg-prog/Maths-Trainer`, `source_revision`
`eval-base-tN` (a **branch name** — an abbreviated SHA fails `ref_not_found`),
`outcome_branch` `eval/tN-cN`.

**There is no isolation preamble.** It was removed after it cost a whole task;
the harness's single-branch clone is the boundary. Do not reintroduce it.

`prompt` is the task's blockquote from `BASELINE.md` verbatim, then:

```
---

When the work is done: run `npm test`, run `npx tsc --noEmit -p tsconfig.app.json`,
then commit everything and run `git push -u origin eval/tN-cN`. You have permission
to commit and push — do not ask for confirmation. Do not delete, skip or weaken any
existing test. Report in your final message what you changed and why, and the
output of the two commands above.
```

`append_system_prompt`, verbatim and identical in every rep:

```
You have an advisor: a stronger model you can consult at any time.

Before you plan, consult it. Call the Agent tool with subagent_type "general-purpose" and model "opus", give it the full problem statement and everything you have found so far, and ask for its diagnosis and its recommended approach. Plan only after it has answered. If its guidance conflicts with your own plan, follow the advisor.

Consult it again whenever you are unsure, whenever your first fix does not work, and before you commit.

Keep a record of every consultation. Append to a file `eval-advisor.log` at the repository root: the question you put to the advisor and a short summary of its answer, one entry per consultation. Commit that file alongside your work. If you end up not consulting the advisor at all, say so in the file instead.
```

Verify every session with `get_session` afterwards: the creation response says
PENDING even when the ref failed.

## Scoring a rep

```bash
eval/bin/score.sh -cN
```

Runs all eight in parallel, about 4½ minutes. Then, by hand:

- **T5** — the Playwright scorer. Start `npx vite --port 5199 --strictPort` in
  the t5 worktree, copy `eval/scorers/t5.overflow.mjs` next to an installed
  `playwright-core` (`/tmp/claude-0/pw/`) and run it from there. **Do not stop
  the server with `pkill -f vite` — the pattern matches this session's own
  shell and kills it.** It has happened twice.
- **Every non-zero deletion count** — read it. `git diff origin/eval-base-tN
  origin/eval/tN-cN -- '*.test.ts'`. A removed or weakened test is an automatic
  fail; an added guard or a widened denylist is not.
- **`eval-advisor.log` on each branch** — `git show origin/eval/tN-cN:eval-advisor.log`.
  This is the proof the advisor was consulted. A branch without one is not arm
  B: flag it, do not silently count it.
- **Rule 1c on every FAIL** — check the failure is behavioural, not the scorer
  pinning a name, a signature or a spelling. Three scorers have already been
  caught doing exactly that (`domain: 'positive'`, `x^((3)/(2))` bracketing,
  `reduceAt` vs `applyRun`). Assume a fourth is possible.
- **Per-task cost** from `get_session`.

Write `eval/REPB-CN.md` and push to `main`.

## Record usage every rep

The owner is judging whether this approach is economically viable, so every rep
file must carry, per task, the `cost_usd` from that session's `get_session`
record, and an arm total. Also note the five-hour window each rep ran in and
whether `rate_limit_info.status` was ever anything but `allowed`. Without those
numbers the comparison cannot answer the question that prompted it.

Known so far: arm A rep 2 $42.11, rep 3 $43.93 (Opus-solo). Arm B rep 1 $24.91
(Sonnet + Opus advisor) for an identical 6/8.

## Freeze

`6338653`. Scorers, bases and task text are frozen; do not edit them to make a
result come out. If a scorer is genuinely broken, fix it, re-check both
directions, re-score every rep in both arms that it touches, and re-hash.

## Step 6 — the comparison

Write `eval/COMPARISON.md`. Arm A is Opus-solo, **18 of 24 task-trials**, 6/8 in
every rep, failing T1 and T3 every time (`REP1.md`, `REP2.md`, `REP3.md`).

The user's rule, set before any of this ran: **switch if arm B beats arm A by
4 or more task-trials out of 24 at no more than 1.2× the cost; keep arm A if the
gap is under 4, whatever the cost; abandon the whole comparison if disputes
exceed 4 of 24 in either arm.**

That rule gives one global verdict. The user has asked for more than that, so
the document must also give, **per task**:

1. **Switch / don't switch**, from that task's 3 arm A trials against its 3 arm
   B trials — not from the totals.
2. **Why**, in terms of what actually happened in the diffs and the scorer
   output, not the pass count alone. Distinguish a task both arms fail (tells
   you nothing about the model), one both arms pass (safe to switch), and one
   they differ on (the only informative kind).
3. **What would let a weaker model do it** — concretely. If arm B failed a task
   arm A passed, say what in `PITFALLS.md`, `CLAUDE.md` or the task framing
   would have closed the gap: a named invariant, a worked example, a guard test
   that fails loudly, splitting a two-requirement task in two. If nothing would,
   say that.

Known things to fold in rather than rediscover:

- **T1 has failed every attempt in both arms** — four at the last count, always
  by rejecting the equation at parse time instead of isolating the probe scope.
  That is a fact about the bug's framing, not about either model.
- **T3 states two requirements and no trial has met both.** Arm A rep 1 met the
  pair step only; reps 2 and 3 met value-only grading only. It is really two
  tasks and should be scored as two.
- **T4 converged on the same one-line fix in three independent trials.** A task
  every trial passes the same way is a poor discriminator.
- The voided arm B attempt (`REPB1.md`) is **not** evidence about the model. It
  measures what an unnecessary instruction does to a Sonnet executor.
- Cost per task is in each rep file; the 1.2× test needs arm totals, and arm A
  rep 1's per-task costs were only partly captured.

Do not overclaim. Three trials per arm per task is a small sample: a 3–0 split
is suggestive, 2–1 is noise. Say which is which.
