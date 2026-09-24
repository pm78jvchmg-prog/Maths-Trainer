# fix-fun-wave-choice-timeout: The wave-choice functions test runs past its time limit

Status: claimed
Branch: `claude/fix-fun-wave-choice-timeout-86gs2w`

`functions.test.ts > fun-wave-choice > offers exactly one rule with the stated range and rise through the midline` takes about 5.1 s even alone on main, over vitest's 5 s default.
