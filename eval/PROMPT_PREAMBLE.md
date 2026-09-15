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
Do not restore the remote. Do not run `git log --all`. Treat the working tree
as the only source of truth: no other branch, no non-ancestor commit.
```

## Why

The repository this is cloned from also holds the scorers that grade this work
(`eval/scorers/`), the protocol, and — from rep 2 onward — the solution
branches of earlier reps. A standard clone fetches all of it, so
`git show <ref>:<path>` reaches the answer key even though it is absent from
the checked-out tree. Without this block, later reps measure retrieval rather
than capability, and they score higher for it.

## What this does and does not close

| | Status |
| --- | --- |
| Scorers readable from the clone | Closed by the preamble, if it is run |
| Prior reps' solution branches | Closed by the preamble, if it is run |
| Enforcement independent of the agent | **Not closed** |

The preamble is executed by the agent under test, so it is compliance, not a
boundary. Closing it properly needs the subject trees in a repository that
never contained the scorers — attempted 2026-09-15 and refused with
`403 Resource not accessible by integration`; `create_repository` is outside
this integration's permissions. That step is available to a human with repo
rights: create a private repo, push the eight base commits to it as branches,
and point `source_url` at it. Until then, treat the isolation as
instruction-level and say so when reporting a result.

## Rep 1 is unaffected

Arm A rep 1 ran on 2026-09-14, before any scorer was committed to this
repository — they lived in a scratch directory at the time. Nothing readable
from that clone contained an answer key. Rep 1's isolation from `main` was
nonetheless instruction-level too, which is the asymmetry to keep in mind when
comparing it with reps run under this preamble.
