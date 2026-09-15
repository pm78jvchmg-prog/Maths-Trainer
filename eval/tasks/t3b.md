Reported from a lesson. The line is `(3^2 x 4)^(1/2) + 2^2 - cbrt(27)`. If I
settle the whole rest of the line in one tap and the number I give is right,
that should count. It currently does not.

This contradicts `refuses a right value for a piece taken too early`
in `src/content/expr.test.ts`. That test encodes the rule you are
being asked to change, so updating it is part of the task. Do not
weaken any other test.
