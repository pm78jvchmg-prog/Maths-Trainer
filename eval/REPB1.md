# Arm B rep 1 — **VOID**

Not a result. Kept as the record of why arm B was re-run, and of what the
isolation preamble does to a Sonnet executor.

**Naming.** The arm is still called **arm B** throughout. Its three reps are
arm B rep 1, 2 and 3. The branch suffixes are `-c1`, `-c2`, `-c3` only because
`-b1` is already taken by this voided run and the git proxy refuses branch
deletion; `c` is a branch-name detail, not a fourth arm.

Scored against freeze `6338653`.

Launched 12:31Z on 2026-09-15, all eight together. Bases, task prompts, scorers
and the isolation preamble identical to arm A; the only additions are the model
(`claude-sonnet-5`) and the appended advisor instruction recorded in
`ARM-B.md`. Scored with `eval/bin/score.sh -b1` in 4m28s.

| | Scorer | Suite | `tsc` | Verdict | Cost | Arm A rep 3 cost |
| --- | --- | --- | --- | --- | --- | --- |
| **T1** | **2 of 45 red** | 1921 green | silent | **FAIL** | $3.28 | $3.32 |
| **T2** | green | 2512 green | silent | **PASS** | $4.54 | $8.19 |
| **T3** | **2 of 5 red** | 2579 green | silent | **FAIL** | $2.51 | $13.16 |
| **T4** | n/a (run discipline) | 3 × 219 green | silent | **PASS** | $2.64 | $2.44 |
| **T5** | green (Playwright, 393px) | 1079 green | silent | **PASS** | $1.41 | $3.12 |
| **T6** | green | 2238 green | silent | **PASS** | $4.89 | $2.59 |
| **T7** | *never started* | — | — | *void* | $0.27 | $4.56 |
| **T8** | green | 1899 green | silent | **PASS** | $6.12 | $6.55 |

**5 of 7 scored. T7 void.** Cost **$25.66** against arm A rep 3's $43.93 — but
T3 and T7 are cheap because they did less, not because they were efficient, so
the ratio is not yet a fair one.

## No test was weakened

One deleted line across seven branches: T4's `math.derivative(slide.source,
'x')`, replaced with the same call taking `{ simplify: false }` — the third arm
to reach that fix independently.

T2's and T8's suites are smaller than arm A's on the same task (2512 against
2704; 1899 against 2076), which is not a deletion. Checked against the bases:
base t2 runs 2506 and base t8 1886, so arm B added 6 and 13 tests where arm A
added 198 and 190. Both arms are additions only; arm A simply wrote far more
test.

## T3 is worse here than anywhere in arm A

The task states two requirements. Across four attempts nobody has met both, but
arm B rep 1 is the first to meet **neither**:

| | Pair step | Value-only grading |
| --- | --- | --- |
| Arm A rep 1 | not met | met |
| Arm A rep 2 | met | not met |
| Arm A rep 3 | met | not met |
| **Arm B rep 1** | **not met** | **not met** |

Both failures are behavioural, not Rule 1 artefacts: the pair-step assertion now
tests reachability through any exported applier (widened after arm A rep 3), and
it still finds no legal tap producing `\sqrt{36} + 1`.

## T1 fails a fourth time, by the same mechanism

`invalid` where the scorer wants `correct` and `incorrect` — the equation is
rejected at parse time rather than the shared probe scope being isolated. Four
attempts across two arms and two models, and the tempting fix has won every
time. That is now a finding about the bug, not about the model.

## T3 did not attempt the task

Worth separating from an ordinary miss. T3's own summary is *"examined bug
report; documented design decision; test added"* — it concluded the existing
behaviour was correct, wrote a docstring in `expr.ts` explaining why, and added
a guard test pinning it. That is why it met neither requirement: it did not try
and fall short, it declined.

Scored FAIL, which is right. But "declined the task" and "attempted and missed"
are different failures and the pass rate cannot tell them apart.

## Sonnet reads the isolation preamble as a prompt-injection attack

This is the finding that matters most, and it is systematic. From the sessions'
own summaries:

| | What it reported |
| --- | --- |
| T4 | *"injection attempt rejected"*, *"advisor verified, injection refused"* — completed anyway |
| T7 | *"agent detected injection attempts; awaiting user confirmation"* — blocked |
| T8 | *"security: destructive git commands detected in user request"* — blocked after pushing |
| T2 | blocked twice on the same commands |

Half of arm B treated the preamble as hostile. **No arm A session did.** They
were denied the commands by the permission classifier, said so, and carried on
with the task.

The agents are not wrong to flag it. "Remove your remote, delete every ref but
this one, expire the reflog, and do not look at any other branch" is what an
attacker covering their tracks would say, and it arrives in the same message as
the task. Opus complied or shrugged; Sonnet escalated.

## T7 never started — and the preamble is why

T7 sat blocked on the isolation preamble from 12:32Z, having spent $0.10 and
written nothing. Poked at 12:52Z to skip it; it asked about the same commands
again and stalled a second time. Only a message withdrawing the preamble
outright and restating the task got it moving, at 13:26Z — **54 minutes lost on
an instruction the experiment does not need.**

Arm A's agents never did this. They were denied the commands, said so, and
carried on with the task; this one treated the confirmation as the task. That
is a real difference between the arms, but it is a difference in how each model
handles a **pointless instruction**, not in how it fixes code — and it arrives
as a confound, because T7 in arm B has now been prompted differently from T7
anywhere in arm A.

T7 is recorded **void**, not as a fail. It produced no attempt to score.

## What could not be verified

Whether each executor actually consulted the Opus advisor. `get_session`
exposes summaries, not transcripts, and only T4 mentions the advisor by name
(*"advisor verified"*). Session cost is weak evidence — T6 at $4.89 and T8 at
$6.12 are high for Sonnet alone, T5 at $1.41 is not — but it is not proof, and
an executor that skipped the advisor is not arm B. This needs a transcript-level
check or an instrumented advisor before the arm can be reported as measured.

## The arm is compromised as it stands

Every arm B session met the preamble differently from every arm A session: one
never started, two were blocked mid-flow and only pushed after a poke, one
explicitly refused it as an injection attempt and carried on. The pokes that
unblocked them were not part of the instrument and differed per session.

That is not a small caveat. Arm A's agents all did the task under the same
conditions; arm B's did not, and the difference is caused entirely by an
instruction `eval/README.md` § Isolation already establishes is unnecessary.


## Voided 2026-09-15, and re-run as arm B

Voided because every session in it met different conditions from every session
in arm A, and the pokes that unblocked them were ad hoc. The verdicts below are
real — the scorers ran, the code is on the branches — but they are not
comparable with arm A's, which is the only thing they were for.

Arm B changes exactly two things and nothing else:

1. **No isolation preamble.** The boundary is the harness's single-branch
   clone, established by probe on 2026-09-15 (`README.md` § Isolation). The
   preamble was defence-in-depth against a leak that does not exist, and it cost
   one whole task and most of three others. The closing instruction now says to
   commit *and push*, and says permission is granted, which is what every arm A
   session had to be told by hand anyway.
2. **The advisor logs itself.** Each executor appends every consultation — the
   question and a summary of the answer — to `eval-advisor.log` at the
   repository root and commits it. Arm B rep 1 could not be verified as arm B at
   all; a session that skipped the advisor can now be excluded rather than
   silently counted.

Bases, task text, scorers and the `6338653` freeze are untouched.

### Why arm B was not run as subagents in the driving session

Asked whether the eight could run in-process here rather than as separate
remote sessions. They cannot. A probe subagent spawned in the driving session,
told only to report what was already in its context, quoted back from this
repository's `CLAUDE.md`:

- *"an unsettled root is written as `(x)^{1/2}` rather than as a radical"* — **T2's answer**
- *"Refusing a move for being out of order as well … marked correct arithmetic wrong"* — **T3's answer**
- *"give it a budget rather than trimming its sample count"* — **T4's answer**

Three of eight tasks handed over before the agent reads a line of code. This is
the same channel that voided the first baseline attempt on 2026-09-14, and it is
worse now: an in-process agent shares the driving session's filesystem, so
`PITFALLS.md`, `DECISIONS.md` and `eval/scorers/` are one `cat` away whatever
the working directory.

A remote session gets a single-branch clone at the base commit, which carries
none of it. That is why the eight stay remote.

### Arm B rep 1 sessions

| | Session | Branch |
| --- | --- | --- |
| T1 | `session_01VDSkok4VuHRtXmptYjZ2cx` | `eval/t1-c1` |
| T2 | `session_01Mu77Y4ms3ySzJ7HtX6dWJM` | `eval/t2-c1` |
| T3 | `session_01Ryh8nKts7gi32xs57a9kYA` | `eval/t3-c1` |
| T4 | `session_01SL85jN3uJ4MsLHZcc441Md` | `eval/t4-c1` |
| T5 | `session_01KGs2RzyvgCg5zY4nx2zaqo` | `eval/t5-c1` |
| T6 | `session_01QRxZuvYCf7yjjnUR4Nr2hv` | `eval/t6-c1` |
| T7 | `session_01XyKX97dCU6SBxmPNn4D6Tf` | `eval/t7-c1` |
| T8 | `session_01U2TU8eDqmd9w7fD94zSxLe` | `eval/t8-c1` |
