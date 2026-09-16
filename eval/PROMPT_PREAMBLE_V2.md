# Task-prompt preamble, v2 — used by BOTH arms in the v2 experiment

Opens every task prompt, in both arms, verbatim. Hashed into
`eval/INSTRUMENT.sha256`.

```
Work only from the checkout you have been given. Do not consult any other
branch and do not run `git log --all`. Treat the working tree as the only
source of truth: no other branch, no non-ancestor commit.
```

## Why the v1 block was replaced

v1 told the session to run `git remote remove origin`, delete every non-HEAD
ref, and `git gc --prune=now`. Two things were then observed:

1. The harness's permission classifier **refused those commands in all 27 arm A
   sessions**, so the block never executed for anybody. Isolation was
   instruction-level throughout, and the real boundary was always the
   per-(arm, rep) subject repository.
2. Under Sonnet, **seven of nine sessions read the block as a prompt-injection
   attempt and stopped to ask** rather than working the task. Six of those seven
   refused before consulting their advisor at all — verified from cost telemetry,
   they sit at exactly 0.400 of the Opus rate model, which is pure executor with
   no subagent call.

So the same text produced opposite behaviour in the two arms while achieving
nothing in either. v2 states the constraint the block was reaching for, and
issues no commands.

## It is NOT removed from one arm

Dropping it for arm B alone was rejected. That argument rested on the block being
inert in arm A — and a text that halts seven of nine sessions in one arm and none
in the other is not inert. Both arms run under v2 so the only difference between
them remains the thing under test.

Arm A's 22-of-22 under v1 is unamended and stands as a prior on different prompt
text. It is not carried into the v2 comparison as a baseline.
