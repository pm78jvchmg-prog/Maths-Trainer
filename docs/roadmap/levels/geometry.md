# Geometry: level plan

Asked for by the owner on 2026-09-25 ("YES please!", after the coordinator
reported that no shape-geometry course existed). The owner attached a zip of
Brilliant "Geometry & Measurement" screenshots as inspiration, kept in the
project files under `geometry/` with a `CONTENTS.md`: a lesson on angles in
regular polygons (how many hexagons fit round a point, 60° and 120° with every
angle labelled) and one on arc length (an arc as a fraction of the
circumference, then the angle at the centre that cuts it). The problems and
wording here are ours; the style is taken from those. A second zip (19:24,
"also here are some ideas", `geometry/set2/`) shows Brilliant's level map for
the course, and the levels below follow it, with one change: Angles is taught
before Polygons, since a polygon's angle sum is built from the triangle's.

The owner's one rule for this course: **every formula is given, and every
diagram that needs a measurement or an angle has it labelled.** So a formula
sits on a teaching slide (or a lead-in) before any question uses it, and a
figure marks each side, radius and angle the question needs, with the unknown
drawn and named `x` or `?`, never left for the learner to guess at.

It is a Fundamentals course (owner, 19:20): modest difficulty that climbs
gently through each level, and no proofs; results such as Pythagoras are
stated and used, never proved.

Placement: Algebra Fundamentals, `position: 75`, just before Coordinate
Geometry (80). The owner can move it.

Id prefix `geo-` (levels `geo-l1` to `geo-l8`); no other course uses it.

## Levels

Eight levels, 28 lessons and 8 level checks: 36 on the home-screen card.
Slide kinds are abbreviated: expr (typed), choice, tiles, table, tree, slider.

### Level 1: Angles (`geo-l1`)

| Lesson | Teaches | Leans on |
| --- | --- | --- |
| Angles Made by Lines | degrees, acute to reflex, 180° on a straight line, 360° round a point, angles written with x | choice, expr, tiles |
| Parallel Lines | vertically opposite; corresponding, alternate and co-interior; a triangle between parallel lines | expr, choice, table |
| Triangle Sides and Angles | 180° in a triangle, isosceles and equilateral, the exterior angle | expr, choice, tiles |

### Level 2: Polygons (`geo-l2`)

| Lesson | Teaches | Leans on |
| --- | --- | --- |
| Angles in Polygons | (n − 2) × 180° by triangles, a missing angle in a quadrilateral and beyond | table, expr, choice |
| Exterior and Interior Angles | regular polygons: exterior 360° ÷ n, interior 180° − exterior, and backwards to n | tree, expr, choice |
| Polygon Angle Relationships | which regular polygons fit round a point (owner's first sample), the gap left by others | expr, choice |

### Level 3: Lengths (`geo-l3`)

| Lesson | Teaches | Leans on |
| --- | --- | --- |
| Perimeters | adding sides, missing sides of L-shapes | expr, choice, table |
| Circumference | radius, diameter, C = πd = 2πr, answers in π | expr, choice, tiles |
| Arc Length | arc = fraction of C, then θ/360 × 2πr (owner's second sample) | slider, expr, choice |

### Level 4: Scaling (`geo-l4`)

| Lesson | Teaches | Leans on |
| --- | --- | --- |
| Scaling Shapes | similar shapes: equal angles, one scale factor | choice, expr, table |
| Scaling Lengths | a missing side from the scale factor, map scales | expr, choice, tree |

### Level 5: Areas (`geo-l5`)

| Lesson | Teaches | Leans on |
| --- | --- | --- |
| Reasoning About Area | counting squares, rectangles, cm² and m² | expr, choice, table |
| Polygon Areas | ½bh, bh, ½(a + b)h, compound shapes | expr, choice, tree |
| Circle Areas | πr², from a diameter, sectors | expr, choice, tiles |
| Scaling Areas | area scale factor k² | expr, choice, tree |

### Level 6: Pythagoras' Geometry (`geo-l6`)

Pythagoras is stated and used, never proved (owner, 19:20).

| Lesson | Teaches | Leans on |
| --- | --- | --- |
| The Pythagorean Theorem | a² + b² = c² for the hypotenuse | expr, choice, tiles |
| Pythagorean Triples | 3-4-5, 5-12-13 and their multiples | choice, expr, table |
| Squares and Roots | a shorter side, and answers left as roots | expr, choice, tree |
| Special Right Triangles | half a square, half an equilateral triangle | expr, choice |
| Applications | ladders, diagonals, distance between points | expr, choice, tree |

### Level 7: Surface Area (`geo-l7`)

| Lesson | Teaches | Leans on |
| --- | --- | --- |
| Surface Area | nets, cuboids face by face | table, expr, choice |
| Surface Area Shortcut | a prism: two ends plus perimeter × length; cylinders | expr, choice, tree |
| Pyramids and Cones | triangle faces, πrl (formula given) | expr, choice |

### Level 8: Volume (`geo-l8`)

| Lesson | Teaches | Leans on |
| --- | --- | --- |
| Volume | cuboids, prisms, cylinders, volume scale factor k³ | expr, choice, tree |
| Pyramids and Cones | ⅓ × base × height, spheres ⁴⁄₃πr³ (formulas given) | expr, choice |

Pacing (the owner's rule for new courses): Level 1 on its own first, later
levels in bigger batches.
