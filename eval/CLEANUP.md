# Cleanup manifest — generated 2026-09-16

Branch and repository deletion is refused by this session's git proxy, and no
GitHub MCP tool exposes it (`create_branch` exists; there is no delete). Every
item below is a manual step in the GitHub UI.

## Before deleting anything: the archive

A `git bundle` of all 138 refs — every base, every solution branch, both arms,
both experiments — was created and verified (`The bundle records a complete
history`), 10 MB, and sent to the owner outside GitHub. The eight scorers and
the freeze manifest went with it as a separate 11 KB archive, since they live
outside the repository and would otherwise die with the container.

Restore with: `git clone eval-archive.bundle restored`

## Repositories to delete (10) — Settings -> Danger Zone -> Delete

- `maths-trainer-eval-subject`
- `maths-trainer-eval-subject-armA-rep2`
- `maths-trainer-eval-subject-armA-rep3`
- `maths-trainer-eval-subject-armB-rep1`
- `maths-trainer-eval-subject-armB-rep2`
- `maths-trainer-eval-subject-armB-rep3`
- `maths-trainer-eval-subject-v2-armA-rep1`
- `maths-trainer-eval-subject-v2-armA-rep2`
- `maths-trainer-eval-subject-v2-armB-rep1`
- `maths-trainer-eval-subject-v2-armB-rep2`

Each holds only the eight `eval-base-t*` branches plus that (arm, rep)'s
solution branches. The bases live in `Maths-Trainer`; nothing here is unique
once the bundle exists.

## Maths-Trainer branches

**Keep (10):** `main`, `eval-base-t1`..`eval-base-t8`,
`claude/maths-trainer-improvements-costs-8i4dqn`.

The eight bases are the task set and the only genuinely reusable artefact.

**Delete (52):**

```
armA-rep1-t1
armA-rep1-t2
armA-rep1-t3a
armA-rep1-t3b
armA-rep1-t3bv2
armA-rep1-t4
armA-rep1-t5
armA-rep1-t6
armA-rep1-t7
armA-rep1-t8
audit/report
eval/probe-leak
eval/t1
eval/t1-b1
eval/t1-c1
eval/t1-r2
eval/t1-r3
eval/t2
eval/t2-b1
eval/t2-c1
eval/t2-r2
eval/t2-r3
eval/t3
eval/t3-b1
eval/t3-c1
eval/t3-r2
eval/t3-r3
eval/t4
eval/t4-b1
eval/t4-c1
eval/t4-r2
eval/t4-r3
eval/t5
eval/t5-b1
eval/t5-c1
eval/t5-r2
eval/t5-r3
eval/t6
eval/t6-b1
eval/t6-c1
eval/t6-r2
eval/t6-r3
eval/t7
eval/t7-c1
eval/t7-r2
eval/t7-r3
eval/t8
eval/t8-b1
eval/t8-c1
eval/t8-r2
eval/t8-r3
maths-trainer-eval-subject
```

`maths-trainer-eval-subject` in that list is a *branch* of this name, not the
repository of the same name. Both go.
