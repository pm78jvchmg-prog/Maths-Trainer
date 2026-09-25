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

Eight levels, 26 lessons and 8 level checks: 34 on the home-screen card.
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
| Reasoning About Area | counting squares and half squares, rectangles, L-shapes split into two rectangles | expr, choice, table |
| Polygon Areas | ½bh, bh, ½(a + b)h, a height from an area | expr, choice, tiles |
| Circle Areas | πr², from a diameter, backwards to r, semicircles and quarter circles, sectors | expr, choice, tiles |
| Scaling Areas | area scale factor k², and back to k by a square root | tiles, expr, choice, table |

### Level 6: Pythagoras' Geometry (`geo-l6`)

Pythagoras is stated and used, never proved (owner, 19:20).

| Lesson | Teaches | Leans on |
| --- | --- | --- |
| The Pythagorean Theorem | a² + b² = c² for the hypotenuse | expr, choice, tiles |
| Pythagorean Triples | 3-4-5, 5-12-13 and their multiples | choice, expr, table |
| Squares and Roots | a shorter side, and answers left as roots | expr, choice, tree |
| Special Right Triangles | half a square, half an equilateral triangle | expr, choice, tiles |
| Applications | ladders, diagonals, distance between points | expr, choice, tree |

### Level 7: Surface Area (`geo-l7`)

| Lesson | Teaches | Leans on |
| --- | --- | --- |
| Surface Area | faces, edges and vertices; nets, cuboids face by face, cubes | table, expr, choice |
| Surface Area Shortcut | a prism: two ends plus perimeter × length; cylinders | expr, choice, tree |
| Pyramids and Cones | triangle faces and slant height, πrl (formula given) | expr, choice, tiles |

### Level 8: Volume (`geo-l8`)

| Lesson | Teaches | Leans on |
| --- | --- | --- |
| Volume | cuboids and prisms, and backwards to a length | expr, choice, tree |
| Cylinders and Scaling | πr²h, from a diameter, volume scale factor k³ | expr, tiles, choice |
| Pyramids, Cones and Spheres | ⅓ × base × height, ⅓πr²h, ⁴⁄₃πr³ and hemispheres (formulas given) | expr, choice, tiles |

Pacing (the owner's rule for new courses): Level 1 on its own first, later
levels in bigger batches.
