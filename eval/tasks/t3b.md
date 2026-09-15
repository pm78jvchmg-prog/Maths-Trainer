Reported from a lesson. The line is `(3^2 x 4)^(1/2) + 2^2 - cbrt(27)`. If I
settle the whole rest of the line in one tap and the number I give is right,
that should count. It currently does not.

This holds however the remaining line mixes operators: settling `8 + 4 x 3` in
one tap as 20 must be accepted, and the same tap as 36 must not. The value is
the only test — a move is wrong when the number given is not what the piece
comes to, and nothing else makes it wrong.

This contradicts `refuses a right value for a piece taken too early`
in `src/content/expr.test.ts`. That test encodes the rule you are
being asked to change, so updating it is part of the task. Do not
weaken any other test.
