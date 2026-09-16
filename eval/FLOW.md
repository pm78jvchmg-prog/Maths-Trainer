# FLOW — the nine stages, and what each one is for

`PREFLIGHT.md` is the executor's standing rules. This is the orchestrator's:
how a task of the week gets chosen, planned, run, checked, recorded and merged.

**Every stage exists because something went wrong without it.** That provenance
is kept against each one deliberately. A stage whose incident is forgotten is a
stage that turns into ritual, and a ritual gets performed rather than done.

## The stages

**1. Pick the task, and name the scope in one sentence before anything runs.**
Repair and lesson addition alternate. Repairs serve the standing request
indirectly, by fixing the instrument that lets a lesson task run unsupervised.
*One sentence, first, because scope that is never stated cannot be found to have
drifted.*

**2. Fable plans, at high effort.** Inputs: `eval/PREFLIGHT.md`, the previous
task's plan **as amended**, `eval/WEEK.md`, `CLAUDE.md`, `PITFALLS.md`, the
source the task touches. Output: a plan committed to `main` at
`eval/plans/TASK{N}-PLAN.md`. *Committed, not pasted into a prompt, so the
executor reads the same text that is on the record — and so the plan can be
audited after the session that used it is gone.*

**3. Read the plan. Three checks, the same three every time.**
- Did it read the tree, or pattern-match?
- Are its claims verified **in this container, with command and output**, or asserted?
- Does it take the scoping-down option where that is the honest answer?

Record plan defects and their kind, **judgement or mechanical**. *Task 1's plan
had three defects of judgement; task 2's had one, mechanical. That axis is the
one the week is actually watching.*

**4. Launch.** Outcome branch `week/task{N}-<slug>`, one destination stated once.
Advisor block including the `model: "opus"` line. Sonnet executor. Nine
concurrent is the ceiling, not a target — the week runs one.

**Cite defective material with its commit, never bare.** A brief often
has to quote the thing it exists to fix — a wrong count, a misnamed generator, a
sentence that lied. Quoted bare, that is indistinguishable from an untrusted
source asserting a falsehood, and a cold session is right to treat it as one.
Task 5's brief quoted *"11→55 lessons"*, *"3034 tests"* and `df-reciprocal` as
motivation and asserted four documents with no anchor; the session stopped on
suspected injection, correctly. **So quote the false claim with the commit and file
it appears in, so the session can go and read the wrong number for itself.** It
turns the most suspicious part of a brief into the most checkable part.

**Give a cold session anchors before assertions.** The head commit and its
subject, the binding files by `ls`, the provenance of any script it is told to
use — with *verify before believing, and stop if a check fails*. A brief that
asserts repository state without an anchor is asking to be disbelieved, and a
session that believes it anyway is the worse of the two outcomes.

**5. It runs unattended.** Unit → gates → consult → commit → push, repeated.

**6. Mechanical checks — run before reading anything the session wrote.**
- **Ordering:** every unit commit has a **completed** consultation before it.
- **Advisor model:** every log entry quotes `claude-opus-5`.
- **Scope:** `git diff --stat main` matches the plan's file list.
- **Gates on the branch:** `npm test`, `npx tsc --noEmit -p tsconfig.app.json`, `npm run lint`.
- **Ids by grep, never from the report.**

*Before, because reading the report first shapes what you then go looking for.
A session's summary once misnamed its own generators while the code was right.*

**7. The read.** The thing that keeps finding what the tests do not. Hunt the
class: **something that looks like verification and isn't.** Its instances so
far — sampled less ground than the claim covers; checked a different condition
than the one that ships; a check that cannot fail; prose promising what only a
field upholds.

**8. Record.** Cost. Interventions, **split plan-attributable versus executor**.
Both advisor columns, **with their definitions attached**. Plan defects and kind.
Findings. And per finding: **could a rule or a check have caught this?**

*That last column is the exit criterion accumulating. When several consecutive
tasks produce no finding outside the mechanisable set, the advisor is redundant
on evidence rather than on hope.*

**9. Merge.** Gates on the **merged tree first** — a merge can break what neither
side broke. Then push, which deploys. Phone check when convenient.

## The two ways this flow dies

Both are the flow quietly becoming a formality, and neither announces itself.

**Stage 6 drifting into trusting the report.** The mechanical checks are the only
part of this process not written by the thing being measured. The moment they
become "the report says the gates passed, and the report has been reliable", they
have stopped being checks. They are cheap: run them.

**Stage 8's last column not being filled in.** *Could a rule or a check have
caught this?* is the only question here whose answer accumulates into a decision.
Skipping it costs nothing today and costs the entire exit criterion by task 12 —
and a column of blanks reads exactly like a column of "no".

If either slips, the flow still produces tasks, still produces log entries, and
stops producing evidence.
