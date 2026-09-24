# fix-lin-story-most-timeout: The Regions story test runs past its time limit

Status: claimed
Branch: `claude/fix-lin-story-most-timeout-rjjrxj`

`regions.test.ts > lin-story-most > claims only what the screen shows` takes about 5.1 s even alone on main, over vitest's 5 s default, so every full-suite run shows it red. The cost is `sameRegion` putting 1,922 probe points through mathjs for every relation of every option of every draw.
