# fix-course-count-timeout: The course-count test times out under load

Status: done
Branch: `claude/fix-course-count-timeout-9nilhf`

Three whole-library tests loaded or rendered every course and generator inside vitest's 5 s budget and crossed it alone on main: `eval/bin/counts.test.ts` "maps every course file…" (6.4 s) and the two registry sweeps in `src/ui/sliderValue.test.ts` (6.4 s and 4.7 s). The tree is now imported statically and the slider draws made once at collection, which is untimed; every assertion, seed and difficulty is kept.
Alone after: 51 ms, 225 ms, 230 ms. Full suite: 28m39s with one timeout before, 28m31s and 28m10s all green after (34,898 tests).
