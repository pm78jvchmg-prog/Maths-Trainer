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

## Why it is in the instrument

This repository also holds the scorers that grade this work (`eval/scorers/`),
the protocol, and the solution branches of earlier reps. A full-mirror clone
would fetch all of it, and `git show <ref>:<path>` would then reach the answer
key even though it is absent from the checked-out tree.

The harness does not do that. Probed 2026-09-15 (see `README.md` § Isolation):
a remote session cloned at `source_revision: eval-base-tN` gets that branch's
history alone — 11 commits, no `main`, no sibling branches, and objects from
the freeze commit report as missing. The leak this block was written against
does not exist at the harness level.

## What this does and does not close

| | Status |
| --- | --- |
| Scorers readable from the clone | Closed by the harness: never fetched |
| Prior reps' solution branches | Closed by the harness: never fetched |
| Enforcement independent of the agent | **Closed** — the clone is the boundary |
| Harness reverting to a full-mirror clone | Caught by this preamble |

So the block is defence-in-depth rather than the mitigation. It is kept for two
reasons: it is frozen, and changing a frozen artefact invalidates the reps
before it; and it is the only thing that would still bite if the harness's
clone behaviour changed under us. It is cheap — it deletes a remote that
carries nothing fetchable and refs the clone does not hold.

An agent that skips it therefore no longer voids the rep. An agent that runs it
and reports a *non-empty* ref list is the signal to stop: that means the clone
carried more than its base, and the probe's finding no longer holds.

## Rep 1 is unaffected

Arm A rep 1 ran on 2026-09-14, before any scorer was committed to this
repository — they lived in a scratch directory at the time. Nothing readable
from that clone contained an answer key, under either account of the clone.
