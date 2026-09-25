# Contest Math: level plan

Asked for by the owner on 2026-09-25, from a 23-level competition syllabus
(screenshots in the project files under `contest-math/`, sample lessons under
`contest-math/samples/`). The problems are ours; only the level outline and
the style are taken from it.

Contest Math has a home-screen band of its own, `contest-math`, the last of
the purple maths run: after Advanced Maths, before Statistics.

## What makes it contest maths

Each question is short to state and turns on one idea, and the difficulty
comes from spotting that idea, not from long working:

- **one move instead of many**: add every equation at once, subtract two
  weighings, factorise a difference of squares, pair the terms of a sum;
- **an invariant**: parity under a change of sign, a last digit's cycle, a
  perimeter that does not change when steps slide out;
- **counting carefully**: the extra fence post, the handshake counted twice,
  the missing digit that must be unique;
- **a trap answer**: every multiple-choice form offers the answer the naive
  method gives (5 cooks, 5 pies, 5 hours), so the trap is tested, not hoped for.

Each lesson has 8 to 9 exercises through at least three widgets: the answer
typed on the plain keypad, the same question as four options (`+choice`), and
a third shape that asks for the working the idea produces (tiles, a table, a
Venn diagram of counts). A method is taught by a worked example, on a teach
slide or as the lead-in above the exercise, before it is asked. The
syllabus's "Practice Quiz" lessons become each level's level check.

## Levels

Brilliant's levels 1 to 10 have a diagnostic lesson, four or five taught
lessons and two practice quizzes; levels 11 to 23 have three to seven taught
lessons. Diagnostics are folded into the first lesson of their level.

| # | Level | Lessons | Leans on |
|---|---|---|---|
| 1 | Mathematical Problem-Solving | Algebra, Geometry, Combinatorics, Number Theory, Math Requires Creativity | typed, choice, tiles, table, venn, figures |
| 2 | Equations and Ratios | Ratios and Percentages, Simple Equations, Sequences and Series, Equations with Ratios, Non-numeric Geometric Ratios | typed, choice, tiles |
| 3 | Basic Statistics | Data Measures, Changing Data Sets, Determine the Set, Multiple Possibilities | typed, choice, table, order |
| 4 | Geometry Fundamentals | Measures, Angle Hunting, Polygon Angle Hunting, Special Right Triangles, Creating Right Triangles | figures, typed, choice, tiles |
| 5 | Similarity and Scaling | Similarity, Scaling, Exploring Similarity, Applying Similarity, Coordinate Geometry | figures, typed, choice |
| 6 | Composite Figures | Composites, Lunes and Leaves, Inscribed Figures, Ratios Meet Geometry, Working in 3D | figures, typed, choice |
| 7 | Combinatorics | Counting, Venn Diagrams, Branch Diagrams, Over-Counting, Symmetry | venn, probTree (path), typed, choice |
| 8 | Probability | Probability by Outcomes, PIE and Complements, Choosing, Symmetry and Conditional | probTree, venn, typed (fractions), choice |
| 9 | Fast Problem-Solving | Efficiency, Calculations, Exponents, Roots, What's the Number? | typed, choice, steps |
| 10 | Factorization | Factorization, Number of Divisors, GCD and LCM, Factorials, Cryptograms | tiles, typed, choice, table |
| 11 | Reframing Problems | Reframing Problems, Key Strategies, Color Cube Assembly, Autobiographical Numbers | choice, typed, table |
| 12 | More Advanced Algebra | Systems of Equations, Rates and Ratios, Quadratics, Exponents, Special Functions, Logarithms | typed, tiles, choice |
| 13 | Inequalities | Basic Inequalities, AM-GM, Cauchy-Schwarz | typed, choice, numberLine |
| 14 | Polynomials | Roots, Equations, Vieta's Formulas, Transformations | typed, tiles, choice |
| 15 | Sequences and Series | Arithmetic Sequences, Geometric Sequences, Telescoping Series | table, typed (fractions), choice |
| 16 | Finding and Counting Factors | Prime Factorization, GCD/LCM, Counting Factors | tiles, typed, choice |
| 17 | Modular Arithmetic | System of Congruences, Fractions, Units Digit, Euler's Theorem | typed, table, choice |
| 18 | Synthetic Geometry | Pythagorean Theorem, Triangle Areas, Similar Triangles, Angle Bisector Theorem, Power of a Point, Cyclic Quadrilaterals, Circles | figures, typed, choice |
| 19 | Analytical Geometry | Coordinate Geometry, Conics, Mass Points, Complex Number Geometry | figures, typed, choice, plot |
| 20 | Trigonometry | Trigonometric Functions, Law of Cosines, Law of Sines, Trigonometric Identities, Roots of Unity | figures, typed, choice |
| 21 | More Advanced Combinatorics | Constructive Counting, Complementary Counting, Binomial Coefficients, Principle of Inclusion-Exclusion, Balls and Urns | typed, choice, venn, tiles |
| 22 | More Advanced Probability | Probability, Conditional Probability, Expected Value, Recursion, Linearity of Expectation, Events with States | typed (fractions), probTree, table, choice |
| 23 | Contest Problem Strategies | Casework, Extreme Cases and Invariants, Generalization, Using Symmetry, Eliminating Choices, Simplifications | mixed, from the levels before |

## Level 1: Mathematical Problem-Solving (`cm-l1`)

Generators in `src/content/generators/contestProblemSolving.ts`, helpers in
`contestMath.ts`.

| Lesson | Exercises | The idea |
|---|---|---|
| Algebra | `cm-jar`, `cm-work-rate`, `cm-pair-sums`, `cm-pair-sums-tiles`, `cm-close-fractions` | subtract two weighings; worker-hours; add all three equations; compare what each fraction is short of 1 |
| Geometry | `cm-polygon-sides`, `cm-angle-ratio`, `cm-angle-ratio-tiles`, `cm-clock-angle`, `cm-staircase-perimeter`, `cm-tilted-square` | exterior angles sum to 360°; count ratio parts; the hour hand keeps moving; slide the steps out; big square minus four triangles |
| Combinatorics | `cm-handshakes`, `cm-fence-posts`, `cm-outfits`, `cm-count-multiples`, `cm-page-digits-table`, `cm-page-digits` | halve a double count; one more post than gaps; choices multiply; count up to the top, take off below the bottom; split by digit length |
| Number Theory | `cm-parity-signs`, `cm-last-digit`, `cm-missing-digit`, `cm-gcd-sum-factorial`, `cm-venn-multiples` | signs never change parity; last digits cycle; digit sums for 9 and alternating sums for 11; primes above n miss n!; overlap is the LCM |
| Math Requires Creativity | `cm-alternating-sum`, `cm-diff-squares`, `cm-diff-squares-tiles`, `cm-telescoping-product`, `cm-average-chain` | pair the terms; (A + B)(A − B); a product as a difference of squares; cancel down a row; shift so one number is 0 |

Level check: 12 questions across all five lessons.

## Level 2: Equations and Ratios (`cm-l2`)

Generators in `src/content/generators/contestEquationsRatios.ts`.

| Lesson | Exercises | The idea |
|---|---|---|
| Ratios and Percentages | `cm-percent-chain`, `cm-percent-swap`, `cm-reverse-percent`, `cm-ratio-share`, `cm-ratio-combine` | a change is a multiplier; x% of y is y% of x; divide to go back; the difference is a number of parts; match the shared quantity |
| Simple Equations | `cm-brackets-equation`, `cm-three-scores`, `cm-three-scores-tiles`, `cm-halfway-speeds`, `cm-mixture` | multiply out and collect; name the smallest; equal distances make times the inverse ratio; count the one thing mixed |
| Sequences and Series | `cm-arith-term`, `cm-sequence-table`, `cm-arith-sum`, `cm-odd-sums`, `cm-geo-past` | two terms give the step; pair first with last; odd numbers add to a square; write a geometric sequence out |
| Equations with Ratios | `cm-ratio-change`, `cm-age-ratio`, `cm-ratio-expression`, `cm-work-together`, `cm-ratio-combine` | amounts as parts of k; both ages rise together; only the ratio matters, so pick numbers; add rates, not times |
| Non-numeric Geometric Ratios | `cm-scale-factor`, `cm-scale-tiles`, `cm-half-rectangle`, `cm-midpoint-triangles`, `cm-nested-squares` | areas by k², volumes by k³; same base and height is half; midpoints make a quarter; a square in a circle in a square is half |

Level check: 12 questions across all five lessons.

## Level 3: Basic Statistics (`cm-l3`)

Generators in `src/content/generators/contestStatistics.ts`.

| Lesson | Exercises | The idea |
|---|---|---|
| Data Measures | `cm-stat-measures`, `cm-freq-median`, `cm-missing-score`, `cm-consecutive-mean` | sort before the median; a frequency table's median counts places, not columns; the total is the mean times the count; evenly spread numbers have the middle as their mean |
| Changing Data Sets | `cm-new-mean`, `cm-count-from-shift`, `cm-combined-mean`, `cm-combined-mean-tiles`, `cm-change-table` | compare totals before and after; run it backwards for the count; add totals, not means; gaps from the combined mean cancel; a shift, a stretch or one end moved each move the measures their own way |
| Determine the Set | `cm-set-from-measures`, `cm-set-tiles`, `cm-three-numbers`, `cm-four-set` | the mode fills both places on its side of the median, the range fixes the far end, the total the last gap; two numbers from their sum and difference; an even count's median is a pair |
| Multiple Possibilities | `cm-mean-median-cases`, `cm-mean-median-x`, `cm-count-sets`, `cm-extreme-value` | where x lands decides the median, so solve each case; count the lists by the one free number; make the rest as small as the facts allow |

Level check: 14 questions across all four lessons.
