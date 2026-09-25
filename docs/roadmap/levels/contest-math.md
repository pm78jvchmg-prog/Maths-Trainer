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

## Level 4: Geometry Fundamentals (`cm-l4`)

Generators in `src/content/generators/contestGeometryFundamentals.ts`.

| Lesson | Exercises | The idea |
|---|---|---|
| Measures | `cm-floor-tiles`, `cm-four-rectangles`, `cm-strip-square`, `cm-strip-square-tiles` | count along each side in one unit; diagonal products of a divided rectangle match; half a strip's perimeter is a length and a width |
| Angle Hunting | `cm-parallel-bend`, `cm-isosceles-chain`, `cm-isosceles-chain-tiles`, `cm-isosceles-cases` | a parallel line through each bend; isosceles triangles pass the apex angle along; the given angle could be either kind |
| Polygon Angle Hunting | `cm-star-tips`, `cm-missing-angle`, `cm-missing-angle-tiles`, `cm-polygon-seen-angle`, `cm-polygons-meet` | add up the turning; the full sum is the next multiple of 180; each side is seen at 180/n from any corner; angles round a point make 360 |
| Special Right Triangles | `cm-square-diagonal`, `cm-thirty-sixty`, `cm-thirty-sixty-tiles`, `cm-equilateral-height`, `cm-triple-scale` | 1 : 1 : √2 and 1 : √3 : 2; a square's area is half its diagonal squared; a triple in disguise |
| Creating Right Triangles | `cm-isosceles-area`, `cm-trapezium-area`, `cm-wide-angle`, `cm-glued-triangles`, `cm-glued-triangles-table` | drop a perpendicular; a rhombus's diagonals cross at right angles; a 150° angle leaves a 30° one outside; a shared height makes a difference of squares |

Level check: 14 questions across all five lessons.

## Level 5: Similarity and Scaling (`cm-l5`)

Generators in `src/content/generators/contestSimilarity.ts`.

| Lesson | Exercises | The idea |
|---|---|---|
| Similarity | `cm-parallel-cut`, `cm-similar-table`, `cm-hourglass`, `cm-similar-perimeter` | compare with the whole side, not the piece; multiply, never add; the hourglass ratio; perimeters scale like sides |
| Scaling | `cm-scale-percent`, `cm-statue-weight`, `cm-map-area`, `cm-map-tiles` | a percentage on every length is applied twice for area, three times for volume; weight goes with volume; square the map scale |
| Exploring Similarity | `cm-altitude-hyp`, `cm-altitude-tiles`, `cm-shared-height`, `cm-trapezium` | the altitude makes three similar triangles; same height, areas like bases; a trapezium's diagonals make an hourglass |
| Applying Similarity | `cm-shadow-height`, `cm-shadow-table`, `cm-mirror-height`, `cm-crossed-poles` | parallel rays; a lamp's rays measured from the post; angle in equals angle out; 1/h = 1/a + 1/b, whatever the gap |
| Coordinate Geometry | `cm-coord-distance`, `cm-parallelogram-vertex`, `cm-collinear`, `cm-coord-area` | Pythagoras; A + C = B + D; equal steps across, equal steps up; the shoelace |

Level check: 12 questions across all five lessons.

## Level 6: Composite Figures (`cm-l6`)

Generators in `src/content/generators/contestComposite.ts`.

| Lesson | Exercises | The idea |
|---|---|---|
| Composites | `cm-garden-path`, `cm-overlap-squares`, `cm-arch-area`, `cm-arch-tiles` | outer rectangle less the lawn, or paths less their crossing; a square turned about the centre always covers a quarter; a semicircle is half a circle, and two cut-out halves make one |
| Lunes and Leaves | `cm-leaf`, `cm-arbelos`, `cm-lune`, `cm-lune-table` | two quarter circles less the square; the arbelos is π/4 × AC × CB, and CD² = AC × CB; the semicircles cancel, so the lunes are the triangle |
| Inscribed Figures | `cm-incircle-right`, `cm-semicircle-square`, `cm-equilateral-circles`, `cm-ring-chord` | equal tangents give r = (a + b − c)/2; the centre is the middle of the square's base; the centre is a third of the way up, so R = 2r; the ring needs only half the chord |
| Ratios Meet Geometry | `cm-point-in-rectangle`, `cm-triangle-bands`, `cm-hexagon-table`, `cm-square-cevian` | opposite triangles make half; equal strips go 1 : 3 : 5 : 7; a hexagon is six equal triangles; the hourglass puts P a third of the way up |
| Working in 3D | `cm-painted-cube`, `cm-painted-table`, `cm-stacked-cubes`, `cm-drilled-cube` | corners, edges, face middles and core; from above the tops make the bottom face; the tunnel takes two openings and adds four walls |

Level check: 13 questions across all five lessons.

## Level 7: Combinatorics (`cm-l7`)

Generators in `src/content/generators/contestCounting.ts`.

| Lesson | Exercises | The idea |
|---|---|---|
| Counting | `cm-digit-choices`, `cm-stripes`, `cm-stripes-table`, `cm-odd-even-digits` | fill the most restricted place first; a choice that depends on the last one can still have a fixed count; the units digit decides odd or even; split into cases when 0 is both even and barred from the front |
| Venn Diagrams | `cm-venn-survey`, `cm-venn-count`, `cm-two-way-table`, `cm-venn-extremes` | fill from the middle out; adding the groups counts the overlap twice; a two-way table is the same four regions; the overlap is smallest with nobody outside, largest with one group inside the other |
| Branch Diagrams | `cm-stairs`, `cm-dice-total`, `cm-stamp-ways`, `cm-stamp-table` | split on the first move, so each count is the sum of the ones before; split on the red die; list the cases by the biggest stamp |
| Over-Counting | `cm-teams`, `cm-teams-tiles`, `cm-arrangements`, `cm-round-table` | count in order, divide by the orders of each group; divide by the orders of repeated letters; a circle counts each seating once per turn; glue a pair together, take together from all for apart |
| Symmetry | `cm-ahead-of`, `cm-dice-compare`, `cm-perm-sum`, `cm-perm-sum-tiles` | swap two people and the orders pair up; ties aside, a swap splits the rest in half; x to m + 1 − x pairs high totals with low; each digit sits in each place equally often |

Level check: 14 questions across all five lessons.

## Level 8: Probability (`cm-l8`)

Generators in `src/content/generators/contestProbability.ts`.

| Lesson | Exercises | The idea |
|---|---|---|
| Probability by Outcomes | `cm-pr-dice-sum`, `cm-pr-dice-table`, `cm-pr-order`, `cm-pr-coins` | count outcomes, never totals; a pair on two dice is two outcomes; the head-counts are a row of Pascal's triangle |
| PIE and Complements | `cm-pr-cards`, `cm-pr-pie-count`, `cm-pr-venn`, `cm-pr-at-least-one` | add the two and take off the overlap; both is a multiple of the LCM; neither is one minus either; at least one is one minus none |
| Choosing | `cm-pr-committee`, `cm-pr-committee-table`, `cm-pr-both-chosen`, `cm-pr-bag-tree`, `cm-pr-same-colour` | every set of k is equally likely; choose from each group and multiply; the named people take their places first; without putting back, the second branches change |
| Symmetry and Conditional | `cm-pr-line-up`, `cm-pr-beats`, `cm-pr-cond-dice`, `cm-pr-bags-tree`, `cm-pr-bags-bayes` | every place is as likely as every other; swap two people or two dice; turn a die over to mirror a total; given means throw the rest away; a red counter keeps only the red paths |

Level check: 13 questions across all four lessons.

## Level 9: Fast Problem-Solving (`cm-l9`)

Generators in `src/content/generators/contestFast.ts`.

| Lesson | Exercises | The idea |
|---|---|---|
| Efficiency | `cm-friendly-product`, `cm-friendly-split-tiles`, `cm-regroup-sum`, `cm-divide-quick` | bring 25 and 4 together; split a number to free the partner; pair terms into hundreds, or round up and take off; dividing by 25 is × 4 ÷ 100 |
| Calculations | `cm-near-hundred`, `cm-five-square`, `cm-mid-square-steps`, `cm-distribute` | take one gap off the other number, then add (or take off) the gaps’ product; tens × next up, then the units’ product; a difference of squares around a number ending in 5; split 99 as 100 − 1, or take a shared factor out |
| Exponents | `cm-compare-powers`, `cm-units-sum`, `cm-power-digits`, `cm-power-digits-table` | give the powers a common exponent; last digits from their cycles, borrowing for a difference; each 2 with a 5 makes a 10, after rewriting 4, 8 and 25 |
| Roots | `cm-root-between`, `cm-root-product`, `cm-surd-sum-tiles`, `cm-nested-root` | the squares either side; multiply under one root, and n(n + 1)(n + 2)(n + 3) + 1 is a square; pull square factors out and collect; two numbers adding to the whole part and multiplying to the inner root |
| What’s the Number? | `cm-undo-number`, `cm-undo-table`, `cm-always-same`, `cm-place-value` | undo the steps, last first; follow n through and watch it cancel; swapping digits changes a number by 9(b − a); a digit written on the end makes 10N + d |

Level check: 14 questions across all five lessons.

## Level 10: Factorization (`cm-l10`)

Generators in `src/content/generators/contestFactorization.ts`.

| Lesson | Exercises | The idea |
|---|---|---|
| Factorization | `cm-fz-square-multiplier`, `cm-fz-square-multiplier-tiles`, `cm-fz-zeros-product`, `cm-fz-near-square` | top each power up to even, or to a multiple of 3; a zero is a 2 paired with a 5, so the scarcer prime decides; a number just below a square is a difference of squares |
| Number of Divisors | `cm-fz-divisor-count`, `cm-fz-divisor-table`, `cm-fz-divisor-sum`, `cm-fz-special-divisors` | one more choice than each power, multiplied; factorise a composite power first; multiply the brackets of powers for the sum; odd divisors drop the 2, square divisors take even powers only |
| GCD and LCM | `cm-fz-hcf-lcm-tiles`, `cm-fz-together`, `cm-fz-pieces`, `cm-fz-hcf-lcm-product` | lower power of shared primes, higher power of every prime; meeting again is an LCM, one more meeting than gaps; the largest equal piece is the HCF; HCF × LCM = a × b, and coprime parts take whole prime powers |
| Factorials | `cm-fz-factorial-zeros`, `cm-fz-factorial-table`, `cm-fz-factorial-power`, `cm-fz-factorial-smallest` | count the 5s, then the 25s and 125s; the scarcer prime of a composite base decides; run the count backwards along the multiples of p |
| Cryptograms | `cm-fz-crypt-reverse`, `cm-fz-crypt-place`, `cm-fz-crypt-divisible`, `cm-fz-crypt-block` | AB + BA = 11(A + B), ABC − CBA = 99(A − C); ABC + AB + A = 111A + 11B + C; split the divisor into tests that share no factor; ABCABC = ABC × 7 × 11 × 13 |

Level check: 13 questions across all five lessons.

## Level 11: Reframing Problems (`cm-l11`)

Generators in `src/content/generators/contestReframing.ts`.

| Lesson | Exercises | The idea |
|---|---|---|
| Reframing Problems | `cm-knockout`, `cm-chocolate`, `cm-grid-paths`, `cm-grid-table`, `cm-share-sweets` | count the players knocked out, not the rounds; each snap makes one more piece; a route is a word of R's and U's; each corner is the one to its left plus the one below; a share is a row of sweets and dividers |
| Key Strategies | `cm-work-backwards`, `cm-backwards-table`, `cm-queue`, `cm-snail`, `cm-count-squares` | undo the steps last first; add back, then double; draw the queue so nobody is counted twice; draw the last day, when it climbs out without slipping; count small squares first, and a rectangle is two lines each way |
| Color Cube Assembly | `cm-cube-shell`, `cm-shell-tiles`, `cm-dice-cube`, `cm-red-surface` | only the hidden core can be another colour; a corner die shows three faces meeting at a corner, never two opposite; put the red where the most shows, or hide it |
| Autobiographical Numbers | `cm-look-say`, `cm-look-say-table`, `cm-self-describing`, `cm-digital-root`, `cm-number-plus-digits` | read runs, not digits; back a term, read in pairs; the digits of a self-describing number add to its length, but every place must be checked; digit sums keep the remainder on division by 9; name the digits and let their size decide |

Level check: 14 questions across all four lessons.

## Level 12: More Advanced Algebra (`cm-l12`)

Generators in `src/content/generators/contestAdvancedAlgebra.ts`.

| Lesson | Exercises | The idea |
|---|---|---|
| Systems of Equations | `cm-aa-sum-diff`, `cm-aa-swap`, `cm-aa-swap-tiles`, `cm-aa-cyclic` | x² − y² is (x + y)(x − y), so divide; swapped coefficients: add for the sum, subtract for the difference; add every equation when each holds the same letters |
| Rates and Ratios | `cm-aa-avg-speed`, `cm-aa-avg-speed-tiles`, `cm-aa-meet`, `cm-aa-fill-drain` | average speed is total distance over total time, never the average of the speeds; time the dog, don't follow it; a chase closes at the difference of the speeds; rates add, times do not |
| Quadratics | `cm-aa-complete-square`, `cm-aa-square-tiles`, `cm-aa-shared-root`, `cm-aa-nested-root` | complete the square, and a square is never negative; subtract the quadratics so x² cancels, then the product of the roots; an endless root contains a copy of itself |
| Exponents | `cm-aa-power-equation`, `cm-aa-power-equation-tiles`, `cm-aa-power-sum`, `cm-aa-factor-power` | put both sides over one base, a fraction being a negative power; k copies of bˣ make k × bˣ; take the smallest power out of the top and the bottom |
| Special Functions | `cm-aa-floor-sum`, `cm-aa-floor-table`, `cm-aa-abs-sum`, `cm-aa-functional`, `cm-aa-pair-sum` | ⌊√n⌋ = k for 2k + 1 values of n; absolute values are distances on the number line; substitute x and c − x; f(x) + f(1 − x) = 1 pairs the ends |
| Logarithms | `cm-aa-log-chain`, `cm-aa-log-tiles`, `cm-aa-log-equation`, `cm-aa-log-power` | change of base makes a chain cancel; logs add by multiplying inside; a log to base bᵉ is 1/e of one to base b; b^(log_b c) = c |

Level check: 13 questions across all six lessons.

## Level 13: Inequalities (`cm-l13`)

Generators in `src/content/generators/contestInequalities.ts`.

| Lesson | Exercises | The idea |
|---|---|---|
| Basic Inequalities | `cm-in-flip`, `cm-in-count-integers`, `cm-in-bounds`, `cm-in-square-min` | dividing by a negative turns the sign round, in all three parts at once; count from the first integer inside to the last, and a square has two roots; a difference is least with the first low and the second high, a product needs all four corners; a square is never negative |
| AM-GM | `cm-in-amgm-min`, `cm-in-product-table`, `cm-in-pen-tiles`, `cm-in-fixed-sum` | a fixed product makes the sum least when the parts are equal, after splitting a fraction to find it; the closest factor pair has the smallest sum; a fixed area is fenced least by equal parts, against a wall $2x$ and the far side; a fixed sum makes the product greatest, so the wall pen is twice as long as deep |
| Cauchy-Schwarz | `cm-in-cs-max`, `cm-in-cs-table`, `cm-in-cs-min`, `cm-in-titu` | $(ax + by)^2 \le (a^2 + b^2)(x^2 + y^2)$ caps a line on a circle; equality is in step with the coefficients; turned round it is the least sum of squares on a line; the fractions form for a fixed sum of bottoms |

Level check: 12 questions across all three lessons.

## Level 14: Polynomials (`cm-l14`)

Generators in `src/content/generators/contestPolynomials.ts`.

| Lesson | Exercises | The idea |
|---|---|---|
| Roots | `cm-po-remainder`, `cm-po-find-k`, `cm-po-sum-coeffs`, `cm-po-integer-roots` | the remainder on dividing by x − a is p(a), and x + a means p(−a); a factor or a remainder fixes k; p(1) adds the coefficients, and p(1) + p(−1) doubles the even ones; whole-number roots divide the constant term |
| Equations | `cm-po-quartic`, `cm-po-shared-root`, `cm-po-shared-root-tiles`, `cm-po-reciprocal`, `cm-po-fixed-values` | only even powers make a quadratic in y = x², and a negative y gives no real x; subtract to cancel x² and leave the shared root; divide by x for x + 1/x, then square or cube; p(x) − c or p(x) − x has the given points as roots |
| Vieta's Formulas | `cm-po-vieta-quad`, `cm-po-vieta-cubic`, `cm-po-vieta-table`, `cm-po-root-ratio` | the roots add to −b and multiply to c; squares, reciprocals and cubes of the roots from the sum and product; a cubic's signs alternate once the leading coefficient is divided out; name the roots r and kr, or r and r + d |
| Transformations | `cm-po-shift-product`, `cm-po-roots-sum-sub`, `cm-po-new-roots-table`, `cm-po-squared-roots-tiles` | (k − r)(k − s)(k − t) is p(k), and (r + k)(s + k)(t + k) is −p(−k); p(ax + b) has roots (r − b)/a, the shift counted once per root; scaling the roots by k scales the coefficients by k, k², k³; roots r² and s² from Vieta |

Level check: 14 questions across all four lessons.

## Level 15: Sequences and Series (`cm-l15`)

Generators in `src/content/generators/contestSequencesSeries.ts`.

| Lesson | Exercises | The idea |
|---|---|---|
| Arithmetic Sequences | `cm-ss-index-pairs`, `cm-ss-insert-tiles`, `cm-ss-symmetric-three`, `cm-ss-sum-rule`, `cm-ss-sum-rule-table`, `cm-ss-block-sums` | terms whose places add to the same number add to the same total, and the middle term is the mean; k numbers put in make k + 1 gaps; name three terms a − d, a, a + d; a term is the gap between two sums; block sums are arithmetic, so the third block is 2B₂ − B₁ |
| Geometric Sequences | `cm-ss-geo-middle`, `cm-ss-geo-table`, `cm-ss-geo-shift-sum`, `cm-ss-geo-shift-tiles`, `cm-ss-geo-infinite`, `cm-ss-bounce` | the middle term is the geometric mean, not the average; a gap of k steps is r to the k; multiply by r and subtract, and only the ends survive; a series that goes on for ever holds a copy of itself; the first fall once, every bounce twice |
| Telescoping Series | `cm-ss-tele-unit`, `cm-ss-tele-table`, `cm-ss-tele-gap`, `cm-ss-tele-roots`, `cm-ss-tele-factorial` | 1/(k(k + 1)) = 1/k − 1/(k + 1), even when the bottoms are multiplied out; a gap of g puts 1/g in front, and k(k + 2) leaves two at each end; multiply by the conjugate; k × k! = (k + 1)! − k! and k/(k + 1)! = 1/k! − 1/(k + 1)! |

## Level 16: Finding and Counting Factors (`cm-l16`)

Generators in `src/content/generators/contestFactors.ts`.

| Lesson | Exercises | The idea |
|---|---|---|
| Prime Factorization | `cm-fc-perfect-power`, `cm-fc-digit-product`, `cm-fc-exponent-match`, `cm-fc-exponent-match-tiles`, `cm-fc-root-table` | the largest k is the HCF of the powers, after factorising the bases; pack the primes into the largest digits, 9s first; the powers of each prime must match on both sides; halve (or third) the powers, never multiply out |
| GCD/LCM | `cm-fc-euclid`, `cm-fc-remainder-lcm`, `cm-fc-lcm-pairs`, `cm-fc-lcm-pairs-table`, `cm-fc-gcd-sum` | a common divisor divides the difference, and 2^m − 1 runs Euclid on its exponents; take the remainder away (or add one) for a multiple of the LCM; 2e + 1 pairs of powers for each prime, one pair with a = b; divide out the gcd and split the sum into coprime parts |
| Counting Factors | `cm-fc-few-divisors`, `cm-fc-divisor-product`, `cm-fc-square-pairs`, `cm-fc-multiple-divisors`, `cm-fc-multiple-divisors-table` | divisors pair d with n/d, so only squares have an odd count and three divisors means a prime squared; the pairs multiply to N^{t/2}; the divisors of N² pair around N; a multiple of m is m times a divisor of N/m |

Level check: 12 questions across all three lessons.

## Level 17: Modular Arithmetic (`cm-l17`)

Generators in `src/content/generators/contestModular.ts`.

| Lesson | Exercises | The idea |
|---|---|---|
| System of Congruences | `cm-md-remainder-shift`, `cm-md-crt-sieve`, `cm-md-crt-table`, `cm-md-same-gap` | put the remainder in place of N, then reduce once more; list the larger divisor's numbers and test the other, then step by the product for a third; every remainder the same distance short makes N + g a common multiple, so the LCM, not the product |
| Fractions | `cm-md-inverse`, `cm-md-inverse-table`, `cm-md-linear`, `cm-md-decimal-digit` | add the modulus until the division comes out; a shared factor divides the modulus too and leaves several answers; a far decimal digit is its place modulo the block, after any digits before the repeat |
| Units Digit | `cm-md-tower`, `cm-md-tower-table`, `cm-md-power-sum`, `cm-md-last-two` | a tower needs its exponent modulo 4, with 3 as −1; powers add a block of ten at a time, 45 or 33 a block; (10t + 1)^n is 1 + 10tn, and other bases repeat once a power ends in 01 |
| Euler's Theorem | `cm-md-fermat`, `cm-md-cycle-table`, `cm-md-euler-tower`, `cm-md-phi` | cut the power down by p − 1, or by φ(n) for a composite modulus; the cycle's length divides p − 1; cut a tower's top down by p − 1 first; φ(n) keeps the same share for each prime |

Level check: 13 questions across all four lessons.

## Level 18: Synthetic Geometry (`cm-l18`)

Generators in `src/content/generators/contestSyntheticGeometry.ts`.

| Lesson | Exercises | The idea |
|---|---|---|
| Pythagorean Theorem | `cm-sg-british-flag`, `cm-sg-broken-pole`, `cm-sg-pole-tiles`, `cm-sg-unfold` | opposite corners' squares add to the same; the fallen part is the hypotenuse and the squares cancel; unfold the faces, or unroll the cylinder, and the path is straight |
| Triangle Areas | `cm-sg-heron`, `cm-sg-heron-table`, `cm-sg-inradius`, `cm-sg-extended-sides` | Heron from three sides; the longest side has the shortest height; area is r times half the perimeter, and any inside point splits it the same way; triangles on equal bases under one height have equal area |
| Similar Triangles | `cm-sg-inscribed-square`, `cm-sg-angle-similar`, `cm-sg-angle-similar-tiles`, `cm-sg-parallel-area` | the triangle above the square is similar; one equal angle plus a shared one makes AB squared equal AD times AC; areas go by the square of the ratio to the whole side |
| Angle Bisector Theorem | `cm-sg-bisector-split`, `cm-sg-bisector-length`, `cm-sg-bisector-tiles`, `cm-sg-incentre-ratio` | the bisector splits the far side as the near sides; AD squared is AB times AC less BD times DC; the incentre cuts AD in the ratio (AB + AC) to BC |
| Power of a Point | `cm-sg-chords`, `cm-sg-secants`, `cm-sg-power-radius`, `cm-sg-power-table` | every chord through P has the same product of pieces; from outside, measure both lengths from P, and a tangent squared is that product; the diameter gives (r - d)(r + d) |
| Cyclic Quadrilaterals | `cm-sg-cyclic-angles`, `cm-sg-cyclic-table`, `cm-sg-ptolemy`, `cm-sg-brahmagupta` | angles on one arc are equal and opposite angles add to 180; the diagonals multiply to the sum of opposite products; Brahmagupta is Heron for four sides, and with a circle inside it is the square root of abcd |
| Circles | `cm-sg-pitot`, `cm-sg-tangent-table`, `cm-sg-parallel-chords`, `cm-sg-tangent-angle` | two tangents from a point are equal, so opposite sides add to the same; half-chord, distance and radius make a right triangle; the angle at the centre is 180 less the angle between the tangents |

Level check: 14 questions across all seven lessons.

## Level 19: Analytical Geometry (`cm-l19`)

Generators in `src/content/generators/contestAnalyticGeometry.ts`.

| Lesson | Exercises | The idea |
|---|---|---|
| Coordinate Geometry | `cm-ag-river`, `cm-ag-lattice`, `cm-ag-pick`, `cm-ag-line-distance` | reflect the far end in each wall and walk straight; the gcd of the steps counts the lattice points; Pick's theorem, with each side counted by its gcd; the height is twice the area over the long side, and parallel lines differ in c over the root |
| Conics | `cm-ag-ellipse`, `cm-ag-circle-centre`, `cm-ag-circle-chord`, `cm-ag-parabola` | the distances to the foci add to 2a, and c² = a² − b²; complete both squares, dividing through first; the roots' difference from their sum and product; the focal distance is the distance to the directrix |
| Mass Points | `cm-ag-mass-cevians`, `cm-ag-mass-table`, `cm-ag-mass-reverse`, `cm-ag-mass-ceva` | masses go against the lengths and a balance point carries both; work back from AP : PD to A's mass; the third cevian balances too |
| Complex Number Geometry | `cm-ag-rotate`, `cm-ag-turn-area`, `cm-ag-modulus`, `cm-ag-reach` | times i turns 90° about 0, so move the centre there first; z, iz, −z, −iz make a square of area 2\|z\|²; moduli multiply, and an even power never needs the root; the nearest and farthest points lie on the line through the centre |

Level check: 13 questions across all four lessons.

## Level 20: Trigonometry (`cm-l20`)

Generators in `src/content/generators/contestTrigonometry.ts`.

| Lesson | Exercises | The idea |
|---|---|---|
| Trigonometric Functions | `cm-tr-other-ratio`, `cm-tr-exact-table`, `cm-tr-big-angle`, `cm-tr-square-sum` | a triple gives every ratio and the quadrant gives the sign; measure from the nearer side of the axis; whole turns change nothing; sin²x pairs with sin²(90° − x) to make 1 |
| Law of Cosines | `cm-tr-cos-side`, `cm-tr-cos-angle`, `cm-tr-cos-table`, `cm-tr-parallelogram` | cos 60° = 1/2 takes ab off, cos 120° = −1/2 adds it; the law turned round gives the angle, and (a + b + c)(a + b − c) = k ab is its top in disguise; a parallelogram's cosines cancel, and a median is half a diagonal |
| Law of Sines | `cm-tr-circumradius`, `cm-tr-sine-table`, `cm-tr-sine-side`, `cm-tr-ssa` | a/sin A is the diameter, and 150° has the sine of 30°; the third angle first; the height decides two, one or no triangles, and the two lengths multiply to b² − a² |
| Trigonometric Identities | `cm-tr-sum-product`, `cm-tr-tan-ratio`, `cm-tr-double-table`, `cm-tr-max-value` | square sin θ + cos θ; divide by cos θ, or by cos² θ over sin² θ + cos² θ; the double angles from the triangle; a sin x + b cos x reaches √(a² + b²), not a + b |
| Roots of Unity | `cm-tr-common-roots`, `cm-tr-unity-count-table`, `cm-tr-root-polygon`, `cm-tr-unity-product` | common roots are the gcd-th roots; count the angles in a window; the roots of z^n = c are a regular polygon of n triangles; z^n − 1 over z − 1 is the product over the other roots |

## Level 21: More Advanced Combinatorics (`cm-l21`)

Generators in `src/content/generators/contestAdvancedCounting.ts`.

| Lesson | Exercises | The idea |
|---|---|---|
| Constructive Counting | `cm-ac-no-adjacent`, `cm-ac-gaps-table`, `cm-ac-increasing-digits`, `cm-ac-diagonal-crossings` | line up the others and choose gaps for the ones kept apart; a set of digits has one increasing order, and 0 can only end a decreasing one; four points make one crossing, and each chord adds one region plus its crossings |
| Complementary Counting | `cm-ac-contains-digit`, `cm-ac-grid-avoid`, `cm-ac-committee`, `cm-ac-committee-tiles` | at least one is all less none, at least two the same is all less all different; take off the routes through a closed corner, adding back those through both; all teams less the teams of one kind |
| Binomial Coefficients | `cm-ac-binom-coeff`, `cm-ac-expansion-table`, `cm-ac-hockey-stick`, `cm-ac-row-sum` | a coefficient is a choice of brackets times the other part's power; the constant term is where the powers cancel; a diagonal adds to the entry below it; a row adds to 2^n, and choosing the chair first gives n × 2^(n − 1) |
| Principle of Inclusion-Exclusion | `cm-ac-pie-multiples`, `cm-ac-pie-table`, `cm-ac-derangements`, `cm-ac-onto` | add singles, take off pairs, add back the triple, with LCMs for pairs; nobody right is n!/0! − n!/1! + n!/2! − …; exactly j right is a choice times a derangement; nobody left empty takes off the shares missing someone |
| Balls and Urns | `cm-ac-urns-minimum`, `cm-ac-urns-tiles`, `cm-ac-dice-cap`, `cm-ac-terms` | hand out the minimums, then balls and dividers; odd parts are 2a + 1; an upper limit is taken off by inclusion–exclusion; terms of an expansion are shares of the power, and a slack unknown turns at most into equal |

Level check: 14 questions across all five lessons.

## Level 22: More Advanced Probability (`cm-l22`)

Generators in `src/content/generators/contestAdvancedProbability.ts`.

| Lesson | Exercises | The idea |
|---|---|---|
| Probability | `cm-ap-geom-square`, `cm-ap-birthday`, `cm-ap-dice-max`, `cm-ap-dice-max-table` | two random numbers are a point in a square, so a probability is an area; multiply the shrinking chances for all different; exactly is at most less at most, and smallest and largest together is inclusion and exclusion |
| Conditional Probability | `cm-ap-test-bayes`, `cm-ap-test-table`, `cm-ap-cond-pair`, `cm-ap-coin-bag` | picture a crowd and count the positives; a second test multiplies both counts again; at least one is not the first one; weigh each coin by how likely its tosses were |
| Expected Value | `cm-ap-ev-table`, `cm-ap-ev-missing`, `cm-ap-ev-max`, `cm-ap-ev-respin` | value times chance, added; read it backwards for a missing prize or a fair payout; k tickets make k + 1 equal gaps, and a whole score is the sum of its tail chances; keep what beats a fresh spin, working backwards |
| Recursion | `cm-ap-wait`, `cm-ap-first-to-win`, `cm-ap-land-on`, `cm-ap-land-table` | after a miss it all starts again; both miss and the game comes back round; land on k from k − 1 or from k − 2 |
| Linearity of Expectation | `cm-ap-draw-sum`, `cm-ap-distinct`, `cm-ap-adjacent`, `cm-ap-adjacent-tiles` | each draw alone averages the middle, and expectations add; a count is a sum of one-or-nothing scores; every neighbouring pair is a random pair, and a circle has one more |
| Events with States | `cm-ap-streak`, `cm-ap-streak-table`, `cm-ap-pattern`, `cm-ap-ruin` | a run of j costs r(T + 1) from a run of j − 1; nothing is lost after the first half of a two-different pattern, and after a miss TH beats HH; the gambler's steps are equal, or in the ratio q : p |

Level check: 14 questions across all six lessons.
