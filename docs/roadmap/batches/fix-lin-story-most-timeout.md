# fix-lin-story-most-timeout: The Regions story test runs past its time limit

Status: done
Branch: `claude/fix-lin-story-most-timeout-rjjrxj`

`regions.test.ts > lin-story-most > claims only what the screen shows` took about 5.1 s even alone on main, over vitest's 5 s default, so every full-suite run showed it red; `lin-story-system` sat just under at 4.97 s. The cost was `sameRegion` putting 1,922 probe points through mathjs for every relation of every option of every draw, and mathjs's `node.evaluate` recompiling the expression on every call. Each relation is now compiled once, its truth across the probes worked out once per relation as written, and the draws made once at collection and shared by both checks. Every seed, difficulty, probe and assertion is kept; the two region checks were confirmed still to fire by breaking each generator on purpose.
Alone after: `lin-story-most` 0.23 s (was 5.07 s), `lin-story-system` 0.51 s (was 4.97 s), the whole file 14 s (was 34 s).
