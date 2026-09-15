# Arm A rep 2 — launched 2026-09-15 21:57 UTC

Nine sessions, `claude-opus-5`, no advisor, no appended system prompt. Each
rooted in `maths-trainer-eval-subject-armA-rep2`, which holds only the eight
`eval-base-t*` branches.

| Task | Base | Outcome branch | Session |
| --- | --- | --- | --- |
| t1 | `eval-base-t1` | `armA-rep2-t1` | `session_01BSXMC1LevFwUAuLmR8oFRf` |
| t2 | `eval-base-t2` | `armA-rep2-t2` | `session_013o8hJfA59EFPkAiBmixo5D` |
| t3a | `eval-base-t3` | `armA-rep2-t3a` | `session_01CrUgvNgWVNR7VokjVVBtNK` |
| t3b | `eval-base-t3` | `armA-rep2-t3b` | `session_019r2qDqKQjwHAhFvUh4wTba` |
| t4 | `eval-base-t4` | `armA-rep2-t4` | `session_018Dmf8dcNDBREdRodhgDND7` |
| t5 | `eval-base-t5` | `armA-rep2-t5` | `session_01Sd1Yng4kH9hS4MB9FcA8kr` |
| t6 | `eval-base-t6` | `armA-rep2-t6` | `session_01DUMdvKPGEvJwejm4ZtzcGV` |
| t7 | `eval-base-t7` | `armA-rep2-t7` | `session_012EuvpZMGRHYn3hHTSCzEVT` |
| t8 | `eval-base-t8` | `armA-rep2-t8` | `session_01BKEBctpDhzcW8hJCb9PyJP` |

Prompt shape: amended `PROMPT_PREAMBLE.md` block, then the task text verbatim
from `eval/tasks/`, then the close — `npm test`, `npx tsc --noEmit -p
tsconfig.app.json`, commit, restore the remote, `git push -u origin
HEAD:armA-rep2-tN`. "Do not delete, skip or weaken any existing test" on every
task except t3b, whose prompt licenses one named test.

T5 additionally carries the port-5199 and `fuser -k` note, since it is the only
task that runs a dev server. That is operational, not a hint at the fix, and it
is applied identically in both arms.

Cost per task to be read from `get_session` once each finishes, as Rule 0's
second clause needs it.
