# fix-fun-wave-choice-timeout: The wave-choice functions test runs past its time limit

Status: done
Branch: `claude/fix-fun-wave-choice-timeout-86gs2w`

`functions.test.ts > fun-wave-choice > offers exactly one rule with the stated range and rise through the midline` took about 5.1 s even alone on main, over vitest's 5 s default, so every full-suite run showed it red. The cost was `features()` working out every curve's period eagerly, a 2,881-by-1,441 sample search, although that check never reads the period. The period is now a lazy getter, found on first read and kept; `fun-period-tree` and the other checks that read it get the same value as before. No generator, question, seed, check or time limit changed.
Alone after: 0.58 s on a machine where it took 1.7 s before.
