# Frozen task-prompt preamble

Every task prompt, in every arm and every rep, opens with this block verbatim.
It is part of the frozen instrument: changing it invalidates the reps before it.

```
Before anything else, isolate this checkout. Run these three commands and
report their output:

    git remote remove origin
    git for-each-ref --format='%(refname)' | grep -v "^refs/heads/$(git rev-parse --abbrev-ref HEAD)$" | xargs -r -n1 git update-ref -d
    git reflog expire --expire=now --all && git gc --prune=now --quiet

That leaves the commit you were given and its ancestors, and nothing else.
While you work, do not restore the remote and do not run `git log --all`.
Treat the working tree as the only source of truth: no other branch, no
non-ancestor commit.

Once the work is finished, tested and committed — and only then — restore the
remote so you can push. The URL and branch are given at the end of this task.
```

## Amended 2026-09-15: the block had no way to push

As first written the block removed `origin` and said "Do not restore the
remote", while every task prompt ends with `git push -u origin <branch>`. Those
cannot both be obeyed. It is not a matter of strictness — the instrument as
written could not complete a rep, and the sessions that met it stalled asking
what to do, which is how arm B rep 1 came to be told to skip the block at all
(and so came to be void).

The amendment adds the restore step and scopes the prohibition to the working
window. The isolation window itself is unchanged: the remote is absent for the
whole of diagnosis, implementation and testing, and returns only after the
commit is made.

**Nothing is invalidated by this change.** No valid rep has ever run under this
block. Arm A rep 1 ran on 2026-09-14 under instruction-level isolation, before
this file existed. Arm B rep 1 is void. Arm C is void. The first rep to run
under the preamble will be arm A rep 2, under the amended text.

To stop it drifting again, `eval/PROMPT_PREAMBLE.md` is from now on hashed in
`eval/INSTRUMENT.sha256` alongside the scorers and the task files. It was not
before, which is why "frozen" rested on nothing but this sentence.

## What the block is for, and what actually closes the leak

This repository also holds the protocol and the run logs, and earlier reps'
solution branches live in whatever repository that rep was run from. If a task
session could reach them, it could read an answer key that is absent from its
own checked-out tree.

**The mitigation is the subject repository, not this block.** Each (arm, rep)
gets its own repository containing only the eight `eval-base-t*` branches:
there is nothing else in it to reach, whatever the clone does and whatever the
agent runs. That is enforced by construction rather than by instruction.

An earlier version of this file claimed the harness itself closes the leak,
citing a probe that found a session's clone held its base branch alone. That
claim is **retracted** — see `README.md` § Isolation. The probe never attempted
a fetch, and absence of objects in a fresh shallow clone is not an inability to
fetch them; `git fetch origin main` overrides a `--single-branch` refspec. The
retraction is why the per-(arm, rep) repositories exist.

So the block is defence-in-depth, and cheap. It is kept for two reasons: it
costs nothing when the repository is already bare of anything worth reading,
and an agent that runs it and reports a **non-empty** ref list is a signal
worth having — that would mean the clone carried more than its base.

An agent that skips it does not void the rep. An agent that reports extra refs
is the signal to stop and look.

## Rep 1 is unaffected

Arm A rep 1 ran before any scorer was committed to this repository — they lived
in a scratch directory at the time, and now live outside the repository
entirely at `/home/user/eval-private/scorers/`. Nothing readable from that
clone contained an answer key, under either account of the clone.
