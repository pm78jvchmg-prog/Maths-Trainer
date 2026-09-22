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
`+choice` variants are counted).

| Concept | Category | Levels | Lessons | Toward 30 |
| --- | --- | --- | ---: | ---: |
| Exponents & Radicals | Algebra Fundamentals | 3 | 12 | 40% |
| Quadratics | Algebra Fundamentals | 3 | 12 | 40% |
| Trigonometric Functions | Advanced Algebra | 3 | 15 | 50% |
| Logarithms | Advanced Algebra | 3 | 12 | 40% |
| Complex Numbers | Advanced Maths | 4 | 14 | 47% |
| Differentiation | Advanced Maths | 4 | 11 | 37% |
| Integration | Advanced Maths | 3 | 17 | 57% |
| Vectors & Matrices | Advanced Maths | 3 | 12 | 40% |

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

| Distinct widget kinds among a lesson's exercises | Lessons |
| ---: | ---: |
| 2 | 47 |
| 3 | 24 |
| 4 | 33 |
| 5 | 1 |

**Forty-seven lessons — nearly half — ask their questions through only two
widgets.** Worse, 22 lessons lean on a single generator for 5 of their 7
exercises; `qd-l1-expand`, `qd-l1-factorise`, `lg-l2-combine`, `in-l1-powers`,
`vm-l1-components` and `vm-l2-add` each ask one generator five times in a row.
Those lessons read as the same question five times even though no two questions
are numerically identical.

The widget inventory is not the constraint. There are nine exercise widgets and
the generators use them very unevenly:

| Widget | Generators |
| --- | ---: |
| `choice` | 102 |
| `expression` | 85 |
| `tiles` | 19 |
| `reduce` | 16 |
| `evaluate` | 16 |
| `plot` | 3 |
| `flow` | 3 |
| `slider` | 2 |
| `steps` | 1 |
| `tree` | **0** |

`tree` is fully implemented in `src/ui/workingSlides.tsx`, graded by
`gradeSequence`, and **no generator produces one**. `steps` has exactly one. Two
of the four widgets that show working rather than a final answer are effectively
unused, which is the single cheapest source of shape variety available.

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
| 3 | Linear Equations & Inequalities | new |
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
| 13 | Exponential Models | new |
| 14 | Binomial Expansion | new |
| 15 | Inequalities & the Modulus Function | new |

### Advanced Maths

| # | Concept | State |
| ---: | --- | --- |
| 16 | Complex Numbers | **14 lessons** |
| 17 | Differentiation | **11 lessons** |
| 18 | Integration | **17 lessons** |
| 19 | Vectors | **4 lessons** (split from Vectors & Matrices) |
| 20 | Matrices & Linear Transformations | **8 lessons** (split from Vectors & Matrices) |
| 21 | Parametric & Implicit Differentiation | new |
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
| A1 | Shape-variety report and guard | claimed | `npm test` reports per-lesson widget-kind counts and generator repetition, fails any lesson added after this batch that uses fewer than 3 widget kinds or repeats one generator more than twice, and carries an allowlist of the current 47 offenders that may only shrink |
| A2 | `tree` and `steps` generators | open | At least 8 `tree` generators and 6 more `steps` generators exist, registered, passing the property tests, and each is asked by at least one lesson |
| A3 | Widen Exponents & Radicals | claimed (`claude/roadmap-a3-vrqpoj`) | All 12 `er-` lessons have 8–10 guided exercises across ≥3 widget kinds, no generator asked more than twice, suite and typecheck green, one lesson checked in a browser |
| A4 | Widen Quadratics | open | Same bar, all 12 `qd-` lessons |
| A5 | Widen Logarithms | open | Same bar, all 12 `lg-` lessons |
| A6 | Widen Differentiation | open | Same bar, all 11 `df-` lessons; the five 6-exercise lessons reach 8 |
| A7 | Widen Complex Numbers | open | Same bar, all 14 `cn-` lessons; `cn-l4-argument` reaches 8; the 4 unused `+choice` complex generators are placed |
| A8 | Widen Trigonometric Functions | open | Same bar, all 15 `tf-` lessons |
| A9 | Widen Integration | open | Same bar, all 17 `in-` lessons |
| A10 | Split Vectors & Matrices, then widen both | open | Two courses in `courses/index.ts`, all 12 lessons at the same bar, home screen checked in a browser |
| A11 | Retire the allowlist | open | The A1 allowlist is empty and the guard is unconditional |

A1 landed as **two** allowlists in `src/content/shapeVariety.ts`, not one. The
47 counted above are the lessons below three widget kinds; the "no generator
more than twice" rule, counted by family, catches **102 of the 105** — a seven
exercise deck built from two or three generators breaks it by construction. A11
empties both.

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
