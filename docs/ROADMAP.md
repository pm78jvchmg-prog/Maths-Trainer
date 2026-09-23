# Content roadmap

Where the library is today, where it needs to get to, and the order to do it in.

Written 2026-09-22 against `78f017c`. The counts in section 1 were measured from
`src/content/courses` rather than estimated; re-measure before trusting them
after a few batches have landed.

## The target

The owner's brief, restated as numbers:

- about **30 mathematical concepts**
- each concept **30–50 lessons**
- each lesson **8–10 exercises**
- exercises within a lesson vary in **shape**, not just in numbers
- a thread picking up the next piece of work should not have to ask which piece

That is roughly **1,000–1,500 lessons**. There are 105. This roadmap is
therefore not a list of everything; it is a queue with a rule for extending
itself, so that no thread ever has to stop and ask what is next.

## 1. What exists today

8 courses, 26 levels, 105 lessons, 147 generators (247 ids once the derived
`+choice` variants are counted). Written against those figures. Four phase A
batches have since landed — A5's eight logarithm shapes, A2's fifteen working
widgets, A7's seventeen complex-number ones and A10's fifteen vector and matrix
ones — so it now stands at **9 courses**, Vectors & Matrices having become two,
with **202 generators** and 316 ids.

| Concept | Category | Levels | Lessons | Toward 30 |
| --- | --- | --- | ---: | ---: |
| Exponents & Radicals | Algebra Fundamentals | 3 | 12 | 40% |
| Quadratics | Algebra Fundamentals | 3 | 12 | 40% |
| Trigonometric Functions | Advanced Algebra | 3 | 15 | 50% |
| Logarithms | Advanced Algebra | 3 | 12 | 40% |
| Complex Numbers | Advanced Maths | 4 | 14 | 47% |
| Differentiation | Advanced Maths | 4 | 11 | 37% |
| Integration | Advanced Maths | 3 | 17 | 57% |
| Vectors | Advanced Maths | 1 | 4 | 13% |
| Matrices & Linear Transformations | Advanced Maths | 2 | 8 | 27% |

Every level closes with a level check of 12–15 questions. All 26 have one.

### How many exercises a lesson actually has

This depends on what counts, and the two readings give opposite answers:

- **Counting every graded question**, guided practice plus the three sealed
  skill-check questions: the range is **9 to 11**, and the distribution is
  9 × 6 lessons, 10 × 81 lessons, 11 × 18 lessons. On this reading the library
  already sits inside the target, and only six lessons fall short.
- **Counting guided practice alone**: the range is **6 to 8** — 6 × 6 lessons,
  7 × 81, 8 × 18. On this reading **87 of 105 lessons are short by one or two**.

The six lessons that are short on either reading sit at 6 guided exercises where
every other course sits at 7. Five are in Differentiation — `df-l2-product`,
`df-l2-quotient`, `df-l3-chain`, `df-l4-trig`, `df-l4-exp` — and the sixth is
`cn-l4-argument` in Complex Numbers.

This roadmap assumes the **stricter reading** — 8 to 10 guided practice slides
before the skill check — because that is what makes the repetition problem below
worth fixing rather than worth padding. If the owner meant the looser one,
phase A shrinks from eight batches to one and phase B starts immediately.

### Where the repetition actually is

The owner's complaint about repetitive question styles is measurable, and it is
not about repeated numbers — deck resolution already de-duplicates identical
renderings within a lesson. It is about repeated **widgets**:

| Distinct widget kinds among a lesson's exercises | Lessons, as written | After A5 |
| ---: | ---: | ---: |
| 2 | 47 | 40 |
| 3 | 24 | 23 |
| 4 | 33 | 34 |
| 5 | 1 | 5 |
| 6 | 0 | 3 |

**Forty-seven lessons — nearly half — asked their questions through only two
widgets.** Worse, 22 lessons lean on a single generator for 5 of their 7
exercises; `qd-l1-expand`, `qd-l1-factorise`, `lg-l2-combine`, `in-l1-powers`,
`vm-l1-components` and `vm-l2-add` each ask one generator five times in a row.
Those lessons read as the same question five times even though no two questions
are numerically identical.

Batch A5 took all twelve Logarithms lessons off both counts, which is the
column on the right. The 12 lessons that now clear the repetition rule are
`lg-*` plus the three that already did.

The widget inventory is not the constraint. There are nine exercise widgets and
the generators use them very unevenly:

| Widget | Generators, as written | After A5 |
| --- | ---: | ---: |
| `choice` | 102 | 103 |
| `expression` | 85 | 86 |
| `tiles` | 19 | 22 |
| `reduce` | 16 | 16 |
| `evaluate` | 16 | 16 |
| `plot` | 3 | 3 |
| `flow` | 3 | 6 |
| `slider` | 2 | 3 |
| `steps` | 1 | 1 |
| `tree` | **0** | 1 |

`tree` was fully implemented in `src/ui/workingSlides.tsx`, graded by
`gradeSequence`, and **no generator produced one** until A5 wrote `log-tree`.
`steps` still has exactly one, which is A2's job. Two of the four widgets that
show working rather than a final answer were effectively unused, which is the
single cheapest source of shape variety available.

Six registered generator ids are also asked by no lesson:
`idx-evaluate-multiply`, `conjugate-recover+choice`, `divide-reverse+choice`,
`modulus-distance+choice`, `power-modulus+choice`, `idx-evaluate-multiply+choice`.

## 2. The thirty concepts

Nine exist (Vectors & Matrices counts as two — see the note). Twenty-one are new.
Categories map to the home-screen tab strip; two tabs are new.

### Algebra Fundamentals

| # | Concept | State |
| ---: | --- | --- |
| 1 | Exponents & Radicals | **12 lessons** |
| 2 | Quadratics | **12 lessons** |
| 3 | Linear Equations & Inequalities | **10 lessons** |
| 4 | Polynomials & the Factor Theorem | new |
| 5 | Algebraic Fractions & Partial Fractions | new |
| 6 | Sequences & Series | new |
| 7 | Functions & Transformations | new |
| 8 | Coordinate Geometry | new |
| 9 | Number & Proof | new |

### Advanced Algebra

| # | Concept | State |
| ---: | --- | --- |
| 10 | Trigonometric Functions | **15 lessons** |
| 11 | Trigonometric Identities & Equations | new |
| 12 | Logarithms | **12 lessons** |
| 13 | Exponential Models | **9 lessons** |
| 14 | Binomial Expansion | **10 lessons** |
| 15 | Inequalities & the Modulus Function | new |

### Advanced Maths

| # | Concept | State |
| ---: | --- | --- |
| 16 | Complex Numbers | **14 lessons** |
| 17 | Differentiation | **11 lessons** |
| 18 | Integration | **17 lessons** |
| 19 | Vectors | **4 lessons** (split out in A10) |
| 20 | Matrices & Linear Transformations | **8 lessons** (split out in A10) |
| 21 | Parametric & Implicit Differentiation | **9 lessons** |
| 22 | Differential Equations | new |
| 23 | Series Expansions | new |
| 24 | Numerical Methods | new |

### Statistics & Probability — new tab

| # | Concept | State |
| ---: | --- | --- |
| 25 | Probability | new |
| 26 | Data, Averages and Spread | new |
| 27 | Binomial & Normal Distributions | new |
| 28 | Hypothesis Testing | new |

### Mechanics — new tab

| # | Concept | State |
| ---: | --- | --- |
| 29 | Kinematics | new |
| 30 | Forces & Newton's Laws | new |

**Reserve bench**, for when a concept turns out to be too thin for 30 lessons or
the owner wants degree-level depth: Polar Coordinates, Hyperbolic Functions,
Eigenvalues & Diagonalisation, Multivariable Calculus, Group Theory, Graph
Theory, Modular Arithmetic. These are not in the thirty; they are the swap-ins.

### Two judgement calls made here

**Vectors & Matrices is split in two.** Its three levels are already two
subjects sharing a title, and neither half reaches 30 lessons while they share
one. Splitting is a content-file change, not a rewrite: the levels move to two
`Course` objects and `courses/index.ts` lists both.

**Statistics and Mechanics are included.** They are the obvious remaining halves
of A level maths, and reaching thirty concepts without them means padding pure
maths with topics the owner is less likely to want. They are also the two that
need the most new widget work — a `plot` variant for scatter and box plots, and
diagrams for force problems — which is why they sit at the back of the queue
rather than the front. If the owner does not want them, promote six from the
reserve bench.

## 3. Level plans

A level is 4–5 lessons plus a level check. Thirty lessons per concept is
therefore **six to seven levels**. Existing concepts have three or four.

For each existing concept, the levels it has and the levels it needs:

**Exponents & Radicals** — has: Index Laws, Roots & Fractional Indices, Surds.
Needs: Standard Form; Manipulating Surd Expressions; Index Equations & Substitution;
Growth by Repeated Multiplication.

**Quadratics** — has: Expanding & Factorising, Solving, Graphs. Needs:
Simultaneous Equations with a Quadratic; Quadratic Inequalities; Modelling with
Quadratics; Quadratics in Disguise (hidden quadratics).

**Trigonometric Functions** — has: Periodic Phenomena, Circular Motion,
Graphs of Sine & Cosine. Needs: Radians; Tangent & the Reciprocal Functions;
Inverse Trigonometric Functions; Modelling with Trigonometric Functions.

**Logarithms** — has: What a Logarithm Is, The Laws, Solving with Logarithms.
Needs: Change of Base; Logarithmic Graphs; Linearising a Model (log-log plots);
Compound Log Equations.

**Complex Numbers** — has: Introducing, Arithmetic, The Complex Plane, Angles &
Powers. Needs: Roots of Unity; Loci in the Complex Plane; The Exponential Form;
Complex Numbers and Trigonometric Identities.

**Differentiation** — has: Power Rule, Products & Quotients, Chain Rule,
Standard Derivatives. Needs: Stationary Points & the Second Derivative; Curve
Sketching; Rates of Change & Related Rates; Optimisation.

**Integration** — has: Reversing Differentiation, Definite Integrals & Area,
Techniques. Needs: Area Between Curves; Volumes of Revolution; Partial Fractions
in Integration; Improper Integrals; Integration as a Limit of a Sum.

**Vectors** (after the split) — has: Vectors. Needs: Vector Geometry; Lines in
Vector Form; Planes & the Cross Product; Vectors in Mechanics; The Angle Between
Two Vectors.

**Matrices & Linear Transformations** (after the split) — has: Matrices,
Determinants & Inverses. Needs: Matrices as Transformations; Composing
Transformations; Systems of Equations; Invariant Lines & Points.

**Linear Equations & Inequalities** — has: Solving Linear Equations,
Simultaneous Linear Equations. Needs: Rearranging Formulae; Linear Inequalities
(the number-line picture waits on C8's widget, so this level follows C8);
Simultaneous Equations in Three Unknowns (by elimination; the matrix route stays
in Matrices vm-l9); Inequalities in Two Variables & Regions; Modelling with
Linear Equations (break-even, rates, mixtures).

**Exponential Models** (new in C10) — has: The Continuous Model; Fitting and
Using Models. Needs: Rates in Models (the rate as ky read and compared, average
against instantaneous rate, when two models grow at the same rate); Comparing
Models (when one model overtakes another, sums and differences of exponentials);
Logistic Growth (a ceiling that slows growth, P = L / (1 + Ae^(-kt)), the
fastest growth at half the ceiling); Continuous Compounding (e as the limit of
(1 + 1/n)^n, effective annual rate against continuous rate); The
Limits of a Model (residuals, when a model stops fitting, choosing between two
fits). Solving dy/dt = ky belongs to Differential Equations (C13).

**Binomial Expansion** (new in C7) — has: Pascal's Triangle and (a + b)ⁿ; nCr and
the General Term. Needs: Unknowns and Conditions (finding n, k or a from given
coefficients, equal and in-ratio coefficients, the sum of the coefficients);
Products of Expansions ((a + bx)ᵐ(c + dx)ⁿ, (1 + x + x²)ⁿ, and pairing brackets
such as (1 + x)ⁿ(1 − x)ⁿ = (1 − x²)ⁿ); Estimates and Surds (choosing x to estimate
a power, how big the error is, (√2 + 1)ⁿ and conjugate pairs); The Binomial Series
for Rational n ((1 + x)ⁿ for negative and fractional n as an infinite series, valid
for |x| < 1, and (a + bx)ⁿ taken out as aⁿ(1 + bx/a)ⁿ with its own range);
Approximating with the Series (roots and reciprocals such as √1.02 and 1/(1 − x)²,
and the series of a partial-fraction split once C9 has landed). Rational n belongs
to this course: C14 Series Expansions builds on it and quotes the binomial series
as a special case of Maclaurin, rather than teaching it again.

**Parametric & Implicit Differentiation** — has: Parametric Curves, Implicit
Differentiation. Needs: Second Derivatives of Parametric & Implicit Curves
(d²y/dx² as the derivative of dy/dx with respect to t, divided by dx/dt; concavity
along the curve); Tangents & Normals to Parametric & Implicit Curves (after C3
Coordinate Geometry, which teaches the normal); Implicit Differentiation of
Exponentials & Inverses (a^x, arcsin, arctan, logarithmic differentiation);
Related Rates & Motion along a Curve (implicit related rates, velocity and speed
on a parametric path); Area under a Parametric Curve (the integral of y times
dx/dt with respect to t). This course owns parametric area: Integration's plan
does not include it, and it needs Integration's Techniques level first.

New concepts get their level plan written by the thread that starts them — the
first batch for a new concept is "levels 1 and 2 plus a level plan committed
into this file".

## 4. The batch queue

A batch is one thread on one branch. Take the **top row whose status is
`open`**, set it to `claimed` in this file as your first commit, and do it. No
owner input required to choose.

### Phase A — make what exists meet the bar

Phase A comes first because widening 105 existing lessons is cheaper per lesson
than writing new ones, and because building 900 more lessons on top of a
two-widget habit would multiply the problem the owner actually complained about.

| # | Batch | Status | Done when |
| ---: | --- | --- | --- |
| A1 | Shape-variety report and guard | done | `npm test` reports per-lesson widget-kind counts and generator repetition, fails any lesson added after this batch that uses fewer than 3 widget kinds or repeats one generator more than twice, and carries an allowlist of the current 47 offenders that may only shrink |
| A2 | `tree` and `steps` generators | done | At least 8 `tree` generators and 6 more `steps` generators exist, registered, passing the property tests, and each is asked by at least one lesson |
| A3 | Widen Exponents & Radicals | **done** (`claude/roadmap-a3-vrqpoj`) | All 12 `er-` lessons have 8–10 guided exercises across ≥3 widget kinds, no generator asked more than twice, suite and typecheck green, one lesson checked in a browser |
| A4 | Widen Quadratics | **done** (`claude/roadmap-a4-475hws`) | Same bar, all 12 `qd-` lessons |
| A5 | Widen Logarithms | **done** (`claude/roadmap-a5-9cli5g`) | Same bar, all 12 `lg-` lessons |
| A6 | Widen Differentiation | **done** (`claude/roadmap-a6-9g7v59`) | Same bar, all 11 `df-` lessons; the five 6-exercise lessons reach 8 |
| A7 | Widen Complex Numbers | done | Same bar, all 14 `cn-` lessons; `cn-l4-argument` reaches 8; the 4 unused `+choice` complex generators are placed |
| A8 | Widen Trigonometric Functions | **done** (`claude/roadmap-a8-23kraq`) | Same bar, all 15 `tf-` lessons |
| A9 | Widen Integration | **done** (`claude/roadmap-a9-slcm91`) | Same bar, all 17 `in-` lessons |
| A10 | Split Vectors & Matrices, then widen both | **done** (`claude/roadmap-a10-j23if4`) | Two courses in `courses/index.ts`, all 12 lessons at the same bar, home screen checked in a browser |
| A11 | Retire the allowlist | **done** (landed with A6, `claude/roadmap-a6-9g7v59`) | The A1 allowlist is empty and the guard is unconditional |

A1 landed as **two** allowlists in `src/content/shapeVariety.ts`, not one. The
47 counted above are the lessons below three widget kinds; the "no generator
more than twice" rule, counted by family, caught **102 of the 105** — a seven
exercise deck built from two or three generators breaks it by construction. A11
empties both. A3, A5, A7, A9 and A10 have each taken a course off both lists,
and A2 took ten lessons off the first. After those the lists stand at **12**
and **36**, with only Differentiation, Quadratics and Trigonometric Functions
left — A4, A6 and A8. Do not trust that pair of numbers, or any other written
down here: every one of them went stale the moment the next batch landed, and
`npm test` prints the current standing.

One thing A5 found that the later batches should budget for: a lesson at the
bar needs **at least four generator families**, since eight exercises at two
asks each is four. Every phase A batch is therefore partly a generator batch,
whatever its row says — Logarithms needed eight new ones to widen twelve
lessons, and Exponents & Radicals needed twelve.

A3 found the second constraint, which is arithmetic the rows do not state: the
suite caps a lesson at **11 slides in total**, so eight exercises leaves room
for exactly three teaching slides. A lesson that already has four has to fold
one into the `leadIn` of the question it sets up, or lose it.

A3 also found a trap in the `tiles` widget worth writing down once. Its
template is split on `{0}`, `{1}`, … so **any brace round a bare number is read
as a blank marker** — `x^{5}`, `\sqrt{9}` and `\frac{2}{3}` all tear the TeX in
half, and a blank cannot sit inside a superscript either, since the `x^`
fragment left behind is not valid on its own. The convention that survives all
of it: the question goes in the prompt, where braces are free, and the template
holds only whole tokens separated by literal text.

A2 then took the widget-kind list to **29**: giving fifteen lessons one
exercise through a `tree` or a `steps` slide put thirteen of them over the
three-kind bar without lengthening a single deck, eleven of which A5 had not
already retired. The repetition list does not move, and cannot — a swap changes
a lesson's shape, not how many families it asks, so emptying that list stays
A3 to A10's work.

A6 took all eleven Differentiation lessons off **both** lists. It confirms what
A5 found about generator families, and sharpens it: the eleven decks needed ten
new generators, and eight of the ten are `tiles` or `tree` rather than another
way of typing an answer, because the constraint that actually binds is the
second one. Three widget kinds is easy to reach with a choice question; four
families that are genuinely different questions is not.

A7 then took both lists down together: widening the fourteen Complex Numbers
lessons to eight exercises needed seventeen new generators, which is A5's "four families per lesson" arithmetic showing up
again. Worth knowing for the batches still to come is where those seventeen
went — a course that already had thirty-odd generators still had almost none
outside `expression` and `choice`, so the new ones were chosen by *widget*
first and topic second: two decision trees, four tile-assembly questions across
levels 3 and 4, a plane tap, and a slider. Asking what a lesson has no way of
asking is a faster route to the three-kind bar than another generator of the
kind it already has eight of.

Every figure above was true when its batch was written and was stale by the
time the next one merged, since the two lists shrank from several branches at
once. `npm test` prints the current standing, and that was always the number to
quote.

A11 owned no lessons of its own: A3–A10 covered all 105 between them, so every
allowlist entry belonged to one of those batches, and A11 was the **last** row
of phase A rather than a parallel one — the commit deleting the two lists,
their ceilings and the guard's use of them once the widening batches had
emptied them. It landed inside A6 rather than as a row of its own, because it
was A6's merge of A8 that emptied the second list: A8 took the last `tf-` rows
off it and A6 the last `df-` rows, so the two lists reached zero in a merge
neither branch could have reached alone. A1 had built the ratchet to fail the
suite the moment a list emptied, naming the deletion as the fix, so the batch
that got there did it rather than handing it on. Both bars are now
unconditional, and a lesson that cannot meet them is a lesson to widen —
there is nowhere left to record an exception.

A9 confirmed what A5 found about generator families, and adds one of its own:
the family a lesson borrows must be one the learner has already met. Two of
Integration's new shapes had to be split by difficulty so that "Negative
Powers" could not draw a root, and so that a decision tree asked four lessons
early did not name results still to come. A widening batch is partly a
*sequencing* job, not only a generator one.

A9 and A2 also collided, which the batches after them should expect. A2 made
`-tree` part of `familyOf`, so a `tree` form of a skill stopped counting as a
second family; seven of A9's decks had been built on the old reading and broke
the moment the two branches met. Bring `main` in and re-run the report before
opening the pull request, and again on every conflict notice — a branch can
merge cleanly and still be wrong, because these two batches changed the same
rule from different ends. Only the ceilings conflict textually; recount both
from the merged file rather than taking either side's number.

A10 took the twelve `vm-` lessons off both lists. It needed fifteen new
generators to do it, which says the same thing A5 found from the other
direction: a phase A batch is a generator batch first and a deck batch second.
Where A2 had already put a `tree` or a `steps` exercise into a `vm-` lesson, the
widened deck keeps it rather than the repeat it replaced, so both batches' gains
survive.

A4 emptied the twelve `qd-` rows in the same window, which with every batch
merged so far leaves the two lists at **7** and **25** — only Differentiation
and Trigonometric Functions are left on either, so A6 and A8 are the last two
widening batches between here and A11. Two things A4 learned are worth carrying
into them. First, `familyOf` strips `-steps` and `-tree` as well as `+choice`,
so `quad-discriminant` and `quad-discriminant-steps` count as one family — a
deck built from a generator and its worked-steps sibling is not two families,
and A4 had to rebuild one lesson after the guard said so. That cuts the other
way too, and deliberately: A4 named its substitution generator
`quad-evaluate-steps` so that it files with A2's `quad-evaluate-tree`, the same
skill asked through a second widget rather than a second skill. Second, eight
guided exercises at two per family needs **four** families per lesson, and only
three of the nine widgets are cheap to add to an existing topic; the rest of the
variety came from writing fourteen new generators, which is the real size of a
phase A batch.

A8 took every `tf-` lesson off both lists, so no Trigonometric Functions lesson
is allowlisted any more. Two things it found are worth the next batch knowing.
A lesson is capped at eleven
slides by `generators.test.ts`, teaching slides included, so the eighth exercise
has to come out of a teaching slide — merging its blocks into the slide above,
or moving them onto the question as a `leadIn`. And `eval/plans/TASK4-PLAN.md`
pins this course's three level-check lengths at 12/15/15, which `eval/bin/counts.ts`
checks: a level check may be re-spread over new generators but not grown.

### Phase B — take the nine existing concepts to 30 lessons

One batch = **one new level**: 4–5 lessons at the phase A bar, plus a level check
of 12–15 questions, plus whatever generators the lessons need.

Take levels in the order listed in section 3, and concepts in this rotation so
that no single course runs far ahead of the rest:

> Exponents & Radicals → Quadratics → Logarithms → Trigonometric Functions →
> Complex Numbers → Differentiation → Integration → Vectors →
> Matrices & Linear Transformations → repeat

So B1 is "Exponents & Radicals: Standard Form", B2 is "Quadratics: Simultaneous
Equations with a Quadratic", B3 is "Logarithms: Change of Base", and so on.
Thirty-eight batches in total bring all nine to 30 lessons.

**Done when**, for every phase B batch: the level has 4–5 lessons of 8–10
exercises across ≥3 widget kinds, a level check of 12–15 questions, every new
generator passes the property tests including the 25-distinct-questions floor,
`npx vitest run` and `npx tsc --noEmit -p tsconfig.app.json` and `npm run lint`
are green, and one new lesson has been played in a browser.

### Phase B batches

| # | Batch | Status |
| ---: | --- | --- |
| B1 | Exponents & Radicals: Standard Form | **done** (`claude/roadmap-b-exponents-radicals-8sklxv`): level `er-l4`, 5 lessons, a 14-question level check, 17 new generators |
| B2 | Quadratics: Simultaneous Equations with a Quadratic | **done** (`claude/roadmap-b-quadratics-sihaf2`): level `qd-l4`, 5 lessons, a 14-question level check, 15 new generators |
| B3 | Logarithms: Change of Base | **done** (`claude/roadmap-b-logarithms-4nxgsx`): level `lg-l4`, 4 lessons, a 14-question level check, 14 new generators |
| B4 | Trigonometric Functions: Radians | **done** (`claude/roadmap-b-trig-functions-dt6rsq`): level `tf-l4`, 4 lessons, a 15-question level check, 16 new generators |
| B8 | Vectors: Vector Geometry | **done** (`claude/roadmap-b-vectors-k0aou4`): level `vm-l4`, 5 lessons, a 14-question level check, 19 new generators |
| B9 | Matrices & Linear Transformations: Matrices as Transformations | **done** (`claude/roadmap-b-matrices-fcu036`): level `vm-l5`, 5 lessons, a 15-question level check, 15 new generators and a unit-square figure |
| B5 | Complex Numbers: Roots of Unity | **done** (`claude/roadmap-b-complex-numbers-ad1jwg`): level `cn-l5`, 4 lessons, a 14-question level check, 14 new generators and a unit-circle figure |
| B7 | Integration: Area Between Curves | **done** (`claude/roadmap-b-integration-azbiyz`): level `in-l4`, 4 lessons, a 14-question level check, 14 new generators and a two-curve shaded figure |
| B6 | Differentiation: Stationary Points & the Second Derivative | **done** (`claude/roadmap-b-differentiation-8b0n1s`): level `df-l5`, 5 lessons, a 14-question level check, 15 new generators and an independent mathjs check |
| B10 | Exponents & Radicals: Manipulating Surd Expressions | **done** (`claude/roadmap-b-exponents-2-ts8ccs`): level `er-l5`, 5 lessons, a 14-question level check, 19 new generators |
| B12 | Logarithms: Logarithmic Graphs | **done** (`claude/roadmap-b-logarithms-2-bl64ii`): level `lg-l5`, 4 lessons, a 14-question level check, 16 new generators and a logarithm-graph figure |
| B13 | Trigonometric Functions: Tangent & the Reciprocal Functions | **done** (`claude/roadmap-b-trig-2-147dx4`): level `tf-l5`, 5 lessons, a 15-question level check, 20 new generators and an asymptote-aware curve option in `figures.ts` |
| B17 | Vectors: Lines in Vector Form | **done** (`claude/roadmap-b-vectors-2-u0463t`): level `vm-l6`, 5 lessons, a 14-question level check, 17 new generators |
| B18 | Matrices & Linear Transformations: Composing Transformations | **done** (`claude/roadmap-b-matrices-2-taz4dj`): level `vm-l7`, 5 lessons, a 15-question level check, 19 new generators |
| B16 | Integration: Volumes of Revolution | **done** (`claude/roadmap-b-integration-2-ymjv6y`): level `in-l5`, 4 lessons, a 14-question level check, 17 new generators and a solid-of-revolution figure |
| B15 | Differentiation: Curve Sketching | **done** (`claude/roadmap-b-differentiation-2-66rw3b`): level `df-l6`, 5 lessons, a 15-question level check, 15 new generators |
| B22 | Trigonometric Functions: Inverse Trigonometric Functions | **done** (`claude/roadmap-b-trig-3-qrhb8h`): level `tf-l6`, 5 lessons, a 15-question level check, 19 new generators |
| B25 | Integration: Partial Fractions in Integration | **done** (`claude/roadmap-b-integration-3-nvi107`): level `in-l6`, 4 lessons, a 14-question level check, 17 new generators |
| B14 | Complex Numbers: Loci in the Complex Plane | **done** (`claude/roadmap-b-complex-numbers-2-3bbesx`): level `cn-l6`, 5 lessons, a 15-question level check, 20 new generators and a locus figure |
| B24 | Differentiation: Rates of Change & Related Rates | **done** (`claude/roadmap-b-differentiation-3-0ce49b`): level `df-l7`, 4 lessons, a 15-question level check, 16 new generators and an independent mathjs check |
| B19 | Exponents & Radicals: Index Equations & Substitution | **done** (`claude/roadmap-b-exponents-3-vgmwol`): level `er-l6`, 5 lessons, a 14-question level check, 20 new generators |
| B21 | Logarithms: Linearising a Model | **done** (`claude/roadmap-b-logarithms-3-j7zt1t`): level `lg-l6`, 4 lessons, a 15-question level check, 15 new generators and axis names on the logarithm-graph figure |
| B26 | Vectors: Planes & the Cross Product | **done** (`claude/roadmap-b-vectors-3-ke6n0q`): level `vm-l8`, 5 lessons, a 14-question level check, 21 new generators |
| B27 | Matrices & Linear Transformations: Systems of Equations | **done** (`claude/roadmap-b-matrices-3-eamxgf`): level `vm-l9`, 5 lessons, a 15-question level check, 22 new generators |
| B11 | Quadratics: Quadratic Inequalities | **done** (`claude/roadmap-b-quadratics-2-aoomzy`): level `qd-l5`, 5 lessons, a 15-question level check, 15 new generators |
| B35 | Vectors: Vectors in Mechanics | **done** (`claude/roadmap-b-vectors-4-kze9i1`): level `vm-l10`, 5 lessons, a 14-question level check, 23 new generators |
| B20 | Quadratics: Modelling with Quadratics | **done** (`claude/roadmap-b-quadratics-3-ii0cum`): level `qd-l6`, 5 lessons, a 15-question level check, 19 new generators |
| B28 | Exponents & Radicals: Growth by Repeated Multiplication | **done** (`claude/roadmap-b-exponents-4-te54kq`): level `er-l7`, 5 lessons, a 15-question level check, 20 new generators |
| B23 | Complex Numbers: The Exponential Form | **done** (`claude/roadmap-b-complex-numbers-3-ji4c6s`): level `cn-l7`, 5 lessons, a 15-question level check, 21 new generators |
| B30 | Logarithms: Compound Log Equations | **done** (`claude/roadmap-b-logarithms-4-j5p34b`): level `lg-l7`, 5 lessons, a 15-question level check, 19 new generators |
| B36 | Matrices & Linear Transformations: Invariant Lines & Points | **done** (`claude/roadmap-b-matrices-4-aeufej`): level `vm-l11`, 5 lessons, a 15-question level check, 21 new generators |
| B31 | Trigonometric Functions: Modelling with Trigonometric Functions | **done** (`claude/roadmap-b-trig-4-8mnjwv`): level `tf-l7`, 5 lessons, a 15-question level check, 16 new generators |
| B33 | Differentiation: Optimisation | **done** (`claude/roadmap-b-differentiation-4-3bxj6t`): level `df-l8`, 5 lessons, a 15-question level check, 17 new generators and an independent mathjs check |
| B44 | Vectors: The Angle Between Two Vectors | **done** (`claude/roadmap-b-vectors-5-coq1qw`): level `vm-l12`, 5 lessons, a 14-question level check, 22 new generators |
| B34 | Integration: Improper Integrals | **done** (`claude/roadmap-b-integration-4-gbuy3r`): level `in-l7`, 5 lessons, a 15-question level check, 17 new generators and an independent numeric check |
| B29 | Quadratics: Quadratics in Disguise | **done** (`claude/roadmap-b-quadratics-4-xwfezb`): level `qd-l7`, 5 lessons, a 15-question level check, 20 new generators |

### Phase C — the twenty-one new concepts

One batch = **one new concept's first two levels**, 8–10 lessons, plus its level
plan written into section 3 of this file. A concept then rejoins the phase B
rotation to grow to 30.

Order, by prerequisite and by how much new widget work each needs:

| # | Concept | Note |
| ---: | --- | --- |
| C1 | Linear Equations & Inequalities | Prerequisite for most of the rest; `reduce` and `flow` carry it with no new widgets |
| C2 | Functions & Transformations | Needs a graph-transformation widget; unlocks the graph work in C3, C8 |
| C3 | Coordinate Geometry | Reuses the C2 graph widget |
| C4 | Polynomials & the Factor Theorem | `tree` and `steps` from A2 carry the division algorithm |
| C5 | Sequences & Series | New widget: a term-by-term table |
| C6 | Trigonometric Identities & Equations | Depends on the Radians level in phase B |
| C7 | Binomial Expansion | `tiles` carries coefficient assembly |
| C8 | Inequalities & the Modulus Function | Needs a number-line widget |
| C9 | Algebraic Fractions & Partial Fractions | Depends on C4 |
| C10 | Exponential Models | Depends on the Logarithms phase B levels |
| C11 | Number & Proof | Needs a proof-step ordering widget |
| C12 | Parametric & Implicit Differentiation | Depends on the Differentiation phase B levels |
| C13 | Differential Equations | Depends on C12 and on Integration |
| C14 | Series Expansions | Depends on C5 and C12 |
| C15 | Numerical Methods | Needs an iteration-table widget |
| C16 | Probability | Opens the Statistics tab; needs a tree-diagram widget and a Venn widget |
| C17 | Data, Averages and Spread | Needs scatter, box and histogram plots |
| C18 | Binomial & Normal Distributions | Depends on C7, C16, C17 |
| C19 | Hypothesis Testing | Depends on C18 |
| C20 | Kinematics | Opens the Mechanics tab; reuses the C17 graph work for velocity–time |
| C21 | Forces & Newton's Laws | Needs a force-diagram widget; depends on C20 and on Vectors |

A concept whose note names a new widget should deliver that widget in its own
batch rather than waiting on a separate one.

### Phase C batches

| # | Batch | Status |
| ---: | --- | --- |
| C1 | Linear Equations & Inequalities | **done** (`claude/roadmap-c-linear-equations-0nml55`): course `linear-equations`, levels `le-l1` and `le-l2`, 10 lessons, level checks of 14 and 15 questions, 44 new generators |
| C7 | Binomial Expansion | **done** (`claude/roadmap-c-binomial-expansion-e9c0un`): course `binomial-expansion`, levels `be-l1` and `be-l2`, 10 lessons, level checks of 14 and 15 questions, 32 new generators |
| C10 | Exponential Models | **done** (`claude/roadmap-c-exponential-models-ew5yps`): course `exponential-models`, levels `em-l1` and `em-l2`, 9 lessons, level checks of 15 and 15 questions, 35 new generators |
| C8-widget | Number-line widget for C8 and the Linear Equations inequalities level | **done** (`claude/roadmap-c8-widget-number-line-6civa1`): slide kind `numberLine` (rays, bounded intervals, unions; open and closed ends; whole or half steps), 2 demo generators asked by no lesson yet |
| C12 | Parametric & Implicit Differentiation | **done** (`claude/roadmap-c-parametric-implicit-dz9d6c`): course `parametric-implicit`, levels `pi-l1` and `pi-l2`, 9 lessons, level checks of 14 and 14 questions, 33 new generators |

### When the queue empties

Phase A, then phases B and C interleaved — take a C batch whenever the concept
count is below thirty, a B batch otherwise. When all thirty concepts sit at 30
lessons, extend toward 50 by the same phase B rule, and pull from the reserve
bench only if the owner asks for more breadth.

## 5. Rules that apply to every batch

These come from `CLAUDE.md` and from what the inventory found; they are repeated
here because a thread taking a batch should not have to go looking.

1. **Shape before volume.** A lesson's exercises must use at least three widget
   kinds and must not ask one generator more than twice. This is the whole point
   of the exercise, not a nicety.
2. **Questions are generated, not hard-coded**, and a generator must clear the
   floor of 25 distinct questions per difficulty. Widening a range is almost
   always the right fix; where the stem is fixed, vary the phrasing too.
3. **The three invariants in `src/engine/session.ts` are not negotiable** — a
   wrong answer never reveals the answer, the skill check is sealed, a level
   check is one attempt per question. Content changes should never need to touch
   the reducer.
4. **Every level ends with a level check** of 12–15 questions drawn across it.
5. **Gate every commit**: `npx vitest run`, `npx tsc --noEmit -p tsconfig.app.json`,
   `npm run lint`. A green suite is not a typecheck — vitest strips types without
   checking them.
6. **Anything with a visible surface gets a browser pass** before it counts as
   done.
7. **Double every backslash** in TeX inside a source string, and never author TeX
   through a heredoc or generator script — write the file directly.
8. **No engagement mechanics** beyond the per-lesson score and the daily streak
   the owner specified. No XP, no leagues, no persistent points total.
9. **Update this file** as the first commit of a batch (claim the row) and the
   last (mark it done, correct any count that has drifted).
