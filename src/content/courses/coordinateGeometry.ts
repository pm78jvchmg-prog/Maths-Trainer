/**
 * Coordinate Geometry.
 *
 * Level 1 is the straight line: the gradient between two points, its equation
 * in `y = mx + c` and point-gradient form, the general form `ax + by + c = 0`,
 * parallel and perpendicular lines, and where two lines meet. Level 2 puts
 * points and circles on the same axes: the midpoint and the distance, the
 * perpendicular bisector, the circle's equation, its centre and radius from
 * the expanded form, and tangents and chords. Level 3 puts a line into a
 * circle: the quadratic that substituting gives, the discriminant deciding
 * whether the line cuts, touches or misses, the tangent condition, the two
 * tangents from a point outside, and chords cut off by a line. Level 4 is
 * circle theorems on axes: the angle in a semicircle, a circle from its
 * diameter, the circle through three points from two perpendicular
 * bisectors, chords and tangents together, and choosing between them. Level 5
 * is coordinate proof: a parallelogram from parallel sides or bisecting
 * diagonals, a rectangle from a right angle or equal diagonals, a rhombus
 * and a square from equal sides or perpendicular diagonals, right-angled and
 * isosceles triangles, and the proof written out in order. Level 6 is areas
 * and loci: a triangle's area from a level base and its height, from the box
 * round it and by the shoelace, a polygon split into triangles, a corner
 * found from an area, and a locus written as an equation, from words and
 * from a condition such as PA = 2PB or PA perpendicular to PB.
 *
 * Several things this course leans on are taught elsewhere and only pointed
 * at here: solving two equations at once (Linear Equations `le-l2`),
 * completing the square (Quadratics `qd-l2-square`), a line meeting a curve
 * (`qd-l4`), a tangent found by differentiating (`df-l1-tangent`) and a
 * midpoint by vectors (`vm-l4`). The normal and the perpendicular gradient
 * are taught here.
 *
 * Later levels are in the level plan in
 * `docs/roadmap/levels/coordinate-geometry.md`.
 *
 * Each level closes with a level check: fifteen questions, no teaching
 * slides, one attempt each.
 */
import type { Block, Course, SlideRef } from '../types';
import type { Curve, Mark } from '../figures';
import { plotWithCircles, type CircleShape } from '../generators/coordinateGeometry';

const teach = (...blocks: Block[]): SlideRef => ({
  type: 'literal',
  slide: { kind: 'teach', body: blocks },
});

const ask = (generatorId: string, difficulty = 1): SlideRef => ({
  type: 'generated',
  generatorId,
  difficulty,
});

/** A question with a short worked example just above it, on the same slide. */
const askWith = (generatorId: string, difficulty: number, ...leadIn: Block[]): SlideRef => ({
  type: 'generated',
  generatorId,
  difficulty,
  leadIn,
});

const prose = (text: string): Block => ({ kind: 'prose', text });

const maths = (tex: string): Block => ({ kind: 'display', tex });

/**
 * A figure on squared paper with the same span both ways, so a right angle
 * looks like one and a circle is round.
 */
const grid = (span: number, curves: Curve[], marks: Mark[], label: string, circles: CircleShape[] = []): Block => ({
  kind: 'diagram',
  svg: plotWithCircles({ xMin: -span, xMax: span, yMin: -span, yMax: span, curves, marks, label }, circles),
});

const line = (m: number, c: number, accent = false): Curve => ({ f: (x) => m * x + c, accent });

/** A segment from one point to another; the pen lifts beyond its ends. */
const segment = (x1: number, y1: number, x2: number, y2: number): Curve => ({
  f: (x) =>
    x >= Math.min(x1, x2) - 1e-9 && x <= Math.max(x1, x2) + 1e-9 ? y1 + ((y2 - y1) * (x - x1)) / (x2 - x1) : NaN,
  breaks: true,
  accent: true,
});

export const coordinateGeometry: Course = {
  id: 'coordinate-geometry',
  category: 'algebra-fundamentals',
  position: 80,
  title: 'Coordinate Geometry',
  blurb: 'Lines and circles written as equations, and the points where they meet.',
  levels: [
    {
      id: 'cg-l1',
      title: 'Straight Lines',
      lessons: [
        {
          id: 'cg-l1-gradient',
          title: 'The Gradient Between Two Points',
          slides: [
            teach(
              prose(
                'The **gradient** of a line is how steep it is: how far it rises for each $1$ it goes across. Between two points it is the rise divided by the run.',
              ),
              grid(6, [line(2, -2, true)], [{ x: 1, y: 0 }, { x: 3, y: 4 }], 'The line through (1, 0) and (3, 4)'),
              maths('m = \\frac{y_2 - y_1}{x_2 - x_1} = \\frac{4 - 0}{3 - 1} = 2'),
              prose('From $(1, 0)$ to $(3, 4)$ the line goes $2$ across and $4$ up, so each step across climbs $2$.'),
              prose(
                'Negative numbers go in with their signs. From $A(5, -1)$ to $B(3, 3)$ the run is $3 - 5 = -2$, a step to the left, and the rise is $3 - (-1) = 4$:',
              ),
              maths('m = \\frac{3 - (-1)}{3 - 5} = \\frac{4}{-2} = -2'),
            ),
            ask('coord-rise-run-tree'),
            ask('coord-gradient'),
            ask('coord-gradient+choice'),
            teach(
              prose(
                'A line that falls from left to right has a **negative** gradient: the rise is a fall. A horizontal line has gradient $0$.',
              ),
              prose('From $A(-2, 5)$ to $B(4, 1)$:'),
              maths('m = \\frac{1 - 5}{4 - (-2)} = \\frac{-4}{6} = -\\frac{2}{3}'),
              prose(
                'Which point you call the first does not matter, as long as the top and the bottom start from the **same** one. Mixing them flips the sign.',
              ),
            ),
            ask('coord-gradient-slider'),
            ask('coord-rise-run-tree', 2),
            ask('coord-gradient-slider', 2),
            teach(
              prose(
                'The same formula runs backwards. If $A(1, 3)$ and $B(4, k)$ are on a line of gradient $2$, write the gradient with $k$ in it and solve:',
              ),
              maths('\\begin{aligned} \\frac{k - 3}{4 - 1} &= 2 \\\\ k - 3 &= 6 \\\\ k &= 9 \\end{aligned}'),
              prose(
                'The unknown may be on the bottom, with a fractional gradient. $A(2, 1)$ and $B(k, 4)$ with gradient $\\frac{3}{2}$: multiply both sides by $2$ and by $k - 2$ to clear the fractions, then solve as usual.',
              ),
              maths('\\begin{aligned} \\frac{4 - 1}{k - 2} &= \\frac{3}{2} \\\\ 2 \\times 3 &= 3(k - 2) \\\\ 6 &= 3k - 6 \\\\ k &= 4 \\end{aligned}'),
            ),
            ask('coord-missing-coordinate'),
            ask('coord-missing-coordinate', 2),
          ],
          skillCheck: [ask('coord-gradient', 2), ask('coord-missing-coordinate', 2), ask('coord-rise-run-tree', 2)],
        },
        {
          id: 'cg-l1-equation',
          title: 'The Equation of a Line',
          slides: [
            teach(
              prose(
                'Every straight line that is not vertical can be written $y = mx + c$. The number in front of $x$ is the gradient, and $c$ is where the line crosses the $y$-axis, since $x = 0$ there.',
              ),
              grid(6, [line(2, 1, true)], [{ x: 0, y: 1 }], 'The line y = 2x + 1 crossing the y-axis at 1'),
              prose(
                'To find $c$ from a point on the line, put the point in. Gradient $3$ through $(2, 5)$: $5 = 3 \\times 2 + c$, so $c = -1$ and the line is $y = 3x - 1$.',
              ),
            ),
            ask('coord-intercept'),
            ask('coord-line-tiles'),
            teach(
              prose('A line with gradient $m$ through $(x_1, y_1)$ can be written straight down in **point-gradient form**:'),
              maths('y - y_1 = m(x - x_1)'),
              prose('Gradient $2$ through $(4, 3)$ is $y - 3 = 2(x - 4)$. Multiply out and add $3$ to get $y = mx + c$:'),
              maths('\\begin{aligned} y - 3 &= 2x - 8 \\\\ y &= 2x - 5 \\end{aligned}'),
              prose(
                '**Parallel** lines have the same gradient, so the line through $(4, 3)$ parallel to $y = 2x + 7$ has gradient $2$ as well: it is this same line, $y = 2x - 5$.',
              ),
            ),
            ask('coord-point-gradient-steps'),
            ask('coord-intercept+choice'),
            teach(
              prose(
                'Which way in depends on what you are told. The gradient and where it crosses the $y$-axis: write $y = mx + c$ at once. The gradient (or a parallel line) and some other point: point-gradient form. One point on its own is not enough, since lines of every gradient pass through it.',
              ),
              prose('Two points: find the gradient from them first, then $c$ from either point. Through $A(-3, 1)$ and $B(3, 5)$:'),
              maths('\\begin{aligned} m &= \\frac{5 - 1}{3 - (-3)} = \\frac{4}{6} = \\frac{2}{3} \\\\ 5 &= \\tfrac{2}{3} \\times 3 + c \\\\ c &= 3 \\end{aligned}'),
              prose('So the line is $y = \\frac{2}{3}x + 3$.'),
            ),
            ask('coord-form-flow'),
            ask('coord-line-tiles', 2),
            ask('coord-form-flow', 2),
            ask('coord-point-gradient-steps', 2),
          ],
          skillCheck: [ask('coord-line-tiles', 2), ask('coord-intercept', 2), ask('coord-form-flow', 2)],
        },
        {
          id: 'cg-l1-general',
          title: 'The General Form',
          slides: [
            teach(
              prose(
                'A line can also be written with everything on one side, as $ax + by + c = 0$ with $a$, $b$ and $c$ whole numbers. Fractions are cleared by multiplying through.',
              ),
              maths('\\begin{aligned} y &= \\tfrac{2}{3}x - 1 \\\\ 3y &= 2x - 3 \\\\ 0 &= 2x - 3y - 3 \\end{aligned}'),
              prose('So the line is $2x - 3y - 3 = 0$. By convention the $x$ term is made positive, multiplying through by $-1$ if need be.'),
              prose(
                'A point lies on a line when its coordinates make the equation true. Is $(3, 1)$ on $2x - 3y - 3 = 0$? $2 \\times 3 - 3 \\times 1 - 3 = 0$: yes.',
              ),
            ),
            ask('coord-general-tiles'),
            ask('coord-on-line'),
            teach(
              prose(
                'The general form hides the gradient. To see it, get $y$ on its own: keep the $y$ term on one side, move the rest across, then divide.',
              ),
              maths('\\begin{aligned} 4x + 2y - 6 &= 0 \\\\ 2y &= -4x + 6 \\\\ y &= -2x + 3 \\end{aligned}'),
              prose('In general the gradient of $ax + by + c = 0$ is $-\\frac{a}{b}$.'),
            ),
            ask('coord-general-gradient'),
            ask('coord-make-y-steps'),
            ask('coord-general-gradient+choice'),
            teach(
              prose(
                'A point lies on a line when its coordinates make the equation true. Is $(3, 1)$ on $2x - 5y = 1$? $2 \\times 3 - 5 \\times 1 = 1$: yes.',
              ),
              prose('This works in any form, and it is the quickest check of an equation you have just found: the points you built it from must fit.'),
            ),
            ask('coord-general-tiles', 2),
            ask('coord-on-line', 2),
            ask('coord-make-y-steps', 2),
          ],
          skillCheck: [ask('coord-general-tiles', 2), ask('coord-general-gradient', 2), ask('coord-make-y-steps', 2)],
        },
        {
          id: 'cg-l1-parallel',
          title: 'Parallel and Perpendicular Lines',
          slides: [
            teach(
              prose('**Parallel** lines have the same gradient. **Perpendicular** lines, meeting at a right angle, have gradients that multiply to $-1$:'),
              maths('m_1 m_2 = -1'),
              grid(6, [line(2, 1, true), line(-0.5, 1)], [{ x: 0, y: 1 }], 'The lines y = 2x + 1 and y = -x/2 + 1 crossing at a right angle'),
              prose('Here $y = 2x + 1$ and $y = -\\frac{1}{2}x + 1$: $2 \\times \\left(-\\frac{1}{2}\\right) = -1$, and the lines cross square on.'),
            ),
            ask('coord-perp-line-tiles'),
            ask('coord-perp-gradient'),
            ask('coord-relation-flow'),
            teach(
              prose(
                'To find a perpendicular gradient, turn the gradient upside down and change its sign: the **negative reciprocal**.',
              ),
              maths('3 \\to -\\tfrac{1}{3}, \\qquad -\\tfrac{2}{5} \\to \\tfrac{5}{2}'),
              prose('Check by multiplying the pair: the answer must be $-1$. A line perpendicular to a tangent is called a **normal**, and its gradient is found the same way.'),
              prose('A line in the general form needs $y$ on its own first. For $x - 2y + 6 = 0$:'),
              maths('\\begin{aligned} 2y &= x + 6 \\\\ y &= \\tfrac{1}{2}x + 3 \\end{aligned}'),
              prose('Its gradient is $\\frac{1}{2}$, so a perpendicular line has gradient $-2$.'),
            ),
            ask('coord-perp-gradient+choice'),
            ask('coord-relation-flow', 2),
            teach(
              prose(
                'A line through $C(2, 1)$ perpendicular to $AB$, where $A(0, 1)$ and $B(2, 5)$. First the gradient of $AB$, then its negative reciprocal:',
              ),
              maths('m_{AB} = \\frac{5 - 1}{2 - 0} = 2, \\qquad m = -\\tfrac{1}{2}'),
              prose('Then $c$ comes from the point $C$, just as before:'),
              maths('\\begin{aligned} 1 &= -\\tfrac{1}{2} \\times 2 + c \\\\ c &= 2 \\end{aligned}'),
              prose('So the line is $y = -\\frac{1}{2}x + 2$.'),
            ),
            ask('coord-perp-through-tree'),
            ask('coord-perp-line-tiles', 2),
            ask('coord-perp-through-tree', 2),
          ],
          skillCheck: [ask('coord-perp-gradient', 2), ask('coord-perp-line-tiles', 2), ask('coord-relation-flow', 2)],
        },
        {
          id: 'cg-l1-meet',
          title: 'Where Two Lines Meet',
          slides: [
            teach(
              prose(
                'Where two lines cross, the point lies on **both**, so both equations give the same $y$. Set their right-hand sides equal and solve for $x$:',
              ),
              maths('\\begin{aligned} 3x - 1 &= x + 3 \\\\ 2x &= 4 \\\\ x &= 2 \\end{aligned}'),
              grid(6, [line(3, -1, true), line(1, 3)], [{ x: 2, y: 5 }], 'The lines y = 3x - 1 and y = x + 3 crossing at (2, 5)'),
              prose('Then $y$ from either line: $y = 2 + 3 = 5$. They meet at $(2, 5)$.'),
            ),
            ask('coord-meet-tree'),
            ask('coord-meet-slider'),
            ask('coord-meet-y'),
            teach(
              prose(
                'When one line is in the general form, substitute: put the other line\'s expression for $y$ into it. This is solving simultaneous equations, as in Linear Equations.',
              ),
              prose('For $y = 2x - 1$ and $3x + y = 9$:'),
              maths('\\begin{aligned} 3x + (2x - 1) &= 9 \\\\ 5x &= 10 \\\\ x &= 2 \\end{aligned}'),
              prose('and then $y = 2 \\times 2 - 1 = 3$.'),
            ),
            ask('coord-meet-point'),
            ask('coord-meet-y', 2),
            ask('coord-meet-slider', 2),
            teach(
              prose(
                'The crossing is a **point**, so the answer needs both coordinates, and it has to fit both equations. A point that fits only one of them lies on that line somewhere else.',
              ),
              prose('Lines with equal gradients never meet: setting them equal leaves no $x$ at all.'),
            ),
            ask('coord-meet-point', 2),
            ask('coord-meet-tree', 2),
          ],
          skillCheck: [ask('coord-meet-y', 2), ask('coord-meet-point', 2), ask('coord-meet-tree', 2)],
        },
      ],
      levelCheck: [
        ask('coord-gradient', 2),
        ask('coord-rise-run-tree', 2),
        ask('coord-gradient-slider', 2),
        ask('coord-missing-coordinate', 2),
        ask('coord-line-tiles', 2),
        ask('coord-intercept+choice', 2),
        ask('coord-point-gradient-steps', 2),
        ask('coord-general-tiles', 2),
        ask('coord-general-gradient', 2),
        ask('coord-make-y-steps', 2),
        ask('coord-perp-line-tiles', 2),
        ask('coord-relation-flow', 2),
        ask('coord-perp-gradient+choice', 2),
        ask('coord-meet-y', 2),
        ask('coord-meet-point', 2),
      ],
    },
    {
      id: 'cg-l2',
      title: 'Midpoints, Distances and Circles',
      lessons: [
        {
          id: 'cg-l2-midpoint',
          title: 'Midpoint and Distance',
          slides: [
            teach(
              prose('The **midpoint** of two points is halfway along in both directions: average the $x$-coordinates, then the $y$-coordinates.'),
              maths('M = \\left(\\frac{x_1 + x_2}{2}, \\frac{y_1 + y_2}{2}\\right)'),
              grid(6, [segment(-4, -1, 2, 3)], [{ x: -4, y: -1 }, { x: 2, y: 3 }, { x: -1, y: 1 }], 'A segment from (-4, -1) to (2, 3) with its midpoint (-1, 1)'),
              prose('From $(-4, -1)$ to $(2, 3)$ the midpoint is $(-1, 1)$.'),
            ),
            ask('coord-midpoint-tiles'),
            ask('coord-midpoint-slider'),
            askWith(
              'coord-endpoint',
              1,
              prose(
                'Backwards: $M(1, 2)$ is the midpoint and one end is $A(-2, 5)$. From $A$ to $M$ is $3$ across and $3$ down, and the same step again from $M$ reaches the other end:',
              ),
              maths('\\begin{aligned} x_B &= 1 + 3 = 4 \\\\ y_B &= 2 - 3 = -1 \\end{aligned}'),
            ),
            teach(
              prose(
                'The **distance** between two points is the hypotenuse of a right-angled triangle whose other sides are the change in $x$ and the change in $y$. So it is Pythagoras:',
              ),
              maths('d = \\sqrt{(x_2 - x_1)^2 + (y_2 - y_1)^2}'),
              prose('From $(1, 2)$ to $(4, 6)$ the changes are $3$ and $4$:'),
              maths('d = \\sqrt{3^2 + 4^2} = \\sqrt{25} = 5'),
            ),
            ask('coord-distance-tree'),
            ask('coord-endpoint+choice'),
            ask('coord-midpoint-tiles', 2),
            teach(
              prose(
                'Squaring makes the signs of the changes stop mattering: $(-3)^2 = 3^2$. Only a root taken of the **total** gives the distance; $\\sqrt{3^2 + 4^2}$ is $5$, not $3 + 4$.',
              ),
              prose('Vectors reach the midpoint another way, halfway along $\\overrightarrow{AB}$, and get the same answer.'),
            ),
            ask('coord-distance'),
            ask('coord-midpoint-slider', 2),
          ],
          skillCheck: [ask('coord-distance', 2), ask('coord-midpoint-tiles', 2), ask('coord-endpoint', 2)],
        },
        {
          id: 'cg-l2-bisector',
          title: 'The Perpendicular Bisector',
          slides: [
            teach(
              prose(
                'The **perpendicular bisector** of $AB$ cuts it in half at a right angle. It passes through the midpoint of $AB$, and its gradient is the negative reciprocal of $AB$\'s.',
              ),
              grid(6, [segment(-3, -2, 1, 2), line(-1, -1)], [{ x: -3, y: -2 }, { x: 1, y: 2 }, { x: -1, y: 0 }], 'A segment and its perpendicular bisector through the midpoint'),
              prose('For $A(-3, -2)$ and $B(1, 2)$, the recipe is three steps: the midpoint, the gradient, then $c$ from the midpoint.'),
              maths('\\begin{aligned} M &= (-1, 0) \\\\ m_{AB} &= \\tfrac{4}{4} = 1, \\quad m = -1 \\\\ 0 &= -1 \\times (-1) + c, \\quad c = -1 \\end{aligned}'),
              prose('So the bisector is $y = -x - 1$. Every point on it is the same distance from $A$ as from $B$.'),
            ),
            ask('coord-bisector-flow'),
            ask('coord-bisector-gradient-steps'),
            ask('coord-bisector-tiles'),
            teach(
              prose(
                'A point $P$ the same distance from $A$ and $B$ satisfies $PA^2 = PB^2$. Squared distances avoid square roots, and when you multiply out, the squared terms cancel and a linear equation is left.',
              ),
              prose('$P(k, 0)$ on the $x$-axis, the same distance from $A(1, 3)$ as from $B(5, 1)$:'),
              maths(
                '\\begin{aligned} (k - 1)^2 + 3^2 &= (k - 5)^2 + 1^2 \\\\ k^2 - 2k + 10 &= k^2 - 10k + 26 \\\\ 8k &= 16 \\\\ k &= 2 \\end{aligned}',
              ),
            ),
            ask('coord-equidistant'),
            ask('coord-bisector-tiles', 2),
            ask('coord-bisector-flow', 2),
            teach(
              prose('The same works for a point on the $y$-axis, $P(0, k)$. From $A(2, 1)$ and $B(-4, 3)$:'),
              maths(
                '\\begin{aligned} 2^2 + (k - 1)^2 &= 4^2 + (k - 3)^2 \\\\ k^2 - 2k + 5 &= k^2 - 6k + 25 \\\\ 4k &= 20 \\\\ k &= 5 \\end{aligned}',
              ),
              prose('The answer always lies on the perpendicular bisector: it is where the bisector meets whatever line $P$ is on.'),
            ),
            ask('coord-equidistant+choice', 2),
            ask('coord-bisector-gradient-steps', 2),
          ],
          skillCheck: [ask('coord-bisector-tiles', 2), ask('coord-equidistant', 2), ask('coord-bisector-gradient-steps', 2)],
        },
        {
          id: 'cg-l2-circle',
          title: 'The Equation of a Circle',
          slides: [
            teach(
              prose(
                'A circle is every point at the same distance, the radius $r$, from its centre $(a, b)$. Write that distance by Pythagoras and square it:',
              ),
              maths('(x - a)^2 + (y - b)^2 = r^2'),
              grid(6, [], [{ x: 2, y: 1 }], 'A circle with centre (2, 1) and radius 3', [{ h: 2, k: 1, r2: 9 }]),
              prose('Centre $(2, 1)$ and radius $3$ is $(x - 2)^2 + (y - 1)^2 = 9$.'),
              prose('A negative coordinate flips the sign in its bracket. Centre $(-4, 3)$ and radius $5$:'),
              maths('\\begin{aligned} (x - (-4))^2 + (y - 3)^2 &= 25 \\\\ (x + 4)^2 + (y - 3)^2 &= 25 \\end{aligned}'),
              prose('Reading one back, the signs in the brackets are the **opposite** of the centre\'s: $(x + 5)^2 + (y - 2)^2 = 9$ has centre $(-5, 2)$.'),
            ),
            ask('coord-circle-tiles'),
            ask('coord-centre'),
            teach(
              prose(
                'The right-hand side is $r^2$, not $r$: $(x + 4)^2 + y^2 = 16$ has radius $4$. Often the radius is not given but a point on the circle is, and then $r^2$ is the squared distance from the centre to it. Centre $C(1, -2)$ through $P(4, 2)$:',
              ),
              maths('\\begin{aligned} r^2 &= (4 - 1)^2 + (2 - (-2))^2 \\\\ &= 9 + 16 = 25 \\end{aligned}'),
              prose(
                'A point is on the circle exactly when putting it into the left-hand side gives $r^2$; less means inside, more outside. $(3, 0)$ in $(x - 1)^2 + (y + 2)^2$ gives $2^2 + 2^2 = 8$, less than $25$: inside.',
              ),
            ),
            ask('coord-radius-squared'),
            ask('coord-on-circle-tree'),
            ask('coord-centre', 2),
            ask('coord-circle-tiles', 2),
            teach(
              prose(
                'If the two ends of a **diameter** are given, the centre is their midpoint, and the radius runs from there to either end. For $A(-1, 2)$ and $B(5, 10)$:',
              ),
              maths('\\begin{aligned} C &= \\left(\\tfrac{-1 + 5}{2}, \\tfrac{2 + 10}{2}\\right) = (2, 6) \\\\ r^2 &= CB^2 = 3^2 + 4^2 = 25 \\end{aligned}'),
            ),
            ask('coord-radius-squared', 2),
            ask('coord-on-circle-tree', 2),
          ],
          skillCheck: [ask('coord-circle-tiles', 2), ask('coord-centre', 2), ask('coord-radius-squared', 2)],
        },
        {
          id: 'cg-l2-expanded',
          title: 'Centre and Radius from the Expanded Form',
          slides: [
            teach(
              prose('Multiplied out, a circle looks like this:'),
              maths('x^2 + y^2 - 6x + 4y - 12 = 0'),
              prose(
                'Completing the square on $x$ and on $y$, as in Quadratics, brings back the centre and radius. Halve the coefficient for each bracket, and take its square away again:',
              ),
              maths('\\begin{aligned} (x - 3)^2 - 9 + (y + 2)^2 - 4 &= 12 \\\\ (x - 3)^2 + (y + 2)^2 &= 25 \\end{aligned}'),
            ),
            ask('coord-complete-steps'),
            ask('coord-expanded-tiles'),
            ask('coord-expanded-radius'),
            teach(
              prose(
                'The pattern gives a shortcut: in $x^2 + y^2 + Dx + Ey + F = 0$ the centre is half of $D$ and $E$ with the signs changed, and $r^2$ is what completing the square leaves:',
              ),
              maths('\\begin{aligned} (a, b) &= \\left(-\\tfrac{D}{2}, -\\tfrac{E}{2}\\right) \\\\ r^2 &= a^2 + b^2 - F \\end{aligned}'),
              prose('This only works once $x^2$ and $y^2$ stand alone. When every term carries the same number, divide through by it first:'),
              maths(
                '\\begin{aligned} 2x^2 + 2y^2 - 8x + 4y - 8 &= 0 \\\\ x^2 + y^2 - 4x + 2y - 4 &= 0 \\end{aligned}',
              ),
              prose('So the centre is $(2, -1)$ and $r^2 = 2^2 + (-1)^2 - (-4) = 9$: the radius is $3$.'),
            ),
            ask('coord-expanded-radius+choice'),
            ask('coord-expanded-tiles', 2),
            teach(
              prose(
                'To tell whether a point is inside, on or outside a circle, compare its squared distance from the centre with $r^2$: less is inside, equal is on, more is outside.',
              ),
              prose('The circle $x^2 + y^2 - 6x + 4y - 12 = 0$ has centre $(3, -2)$ and $r^2 = 25$. For $P(6, 1)$:'),
              maths('(6 - 3)^2 + (1 + 2)^2 = 9 + 9 = 18'),
              prose('That is less than $25$, so $P$ is inside. Squares keep the numbers whole, and comparing them gives the same answer as comparing the distances.'),
            ),
            ask('coord-inside-flow'),
            ask('coord-complete-steps', 2),
            ask('coord-inside-flow', 2),
          ],
          skillCheck: [ask('coord-expanded-tiles', 2), ask('coord-expanded-radius', 2), ask('coord-inside-flow', 2)],
        },
        {
          id: 'cg-l2-tangent',
          title: 'Tangents and Chords',
          slides: [
            teach(
              prose(
                'A **tangent** touches a circle at one point, and there it is perpendicular to the radius. So its gradient is the negative reciprocal of the radius\'s gradient.',
              ),
              grid(
                7,
                [{ f: (x) => (25 - 3 * x) / 4, accent: true }],
                [{ x: 3, y: 4 }, { x: 0, y: 0, hollow: true }],
                'The circle x^2 + y^2 = 25 with its tangent at (3, 4)',
                [{ h: 0, k: 0, r2: 25 }],
              ),
              prose('At $(3, 4)$ on $x^2 + y^2 = 25$ the radius has gradient $\\frac{4}{3}$, so the tangent has gradient $-\\frac{3}{4}$.'),
              prose('For its equation, use point-gradient form, multiply by $4$ to clear the fraction, and gather everything on one side:'),
              maths('\\begin{aligned} y - 4 &= -\\tfrac{3}{4}(x - 3) \\\\ 4y - 16 &= -3x + 9 \\\\ 3x + 4y - 25 &= 0 \\end{aligned}'),
            ),
            ask('coord-tangent-gradient'),
            ask('coord-tangent-tiles'),
            teach(
              prose(
                'When the centre is not the origin, take the radius from the centre to the point, not from the origin. On $(x - 1)^2 + (y - 1)^2 = 5$ at $P(3, 2)$:',
              ),
              maths('\\begin{aligned} m_{CP} &= \\frac{2 - 1}{3 - 1} = \\tfrac{1}{2}, \\quad m = -2 \\\\ y - 2 &= -2(x - 3) \\\\ y &= -2x + 8 \\end{aligned}'),
              prose(
                'It crosses the $y$-axis at $8$, and the $x$-axis where $y = 0$: $0 = -2x + 8$, so $x = 4$. Differentiation finds tangents to other curves; for a circle the right angle is all you need.',
              ),
            ),
            ask('coord-tangent-slider'),
            ask('coord-tangent-tiles', 2),
            ask('coord-tangent-gradient+choice'),
            teach(
              prose(
                'A **chord** joins two points on a circle. The perpendicular from the centre to a chord cuts it in half, so the radius, half the chord and the distance from the centre make a right-angled triangle.',
              ),
              maths('r^2 = \\left(\\tfrac{1}{2}\\text{chord}\\right)^2 + d^2'),
              prose('A radius-$5$ circle with a chord $3$ from the centre: half the chord is $\\sqrt{25 - 9} = 4$, so the chord is $8$.'),
              prose('Backwards, a chord of $16$ in a circle of radius $10$: half the chord is $8$, so'),
              maths('d^2 = 10^2 - 8^2 = 36, \\quad d = 6'),
            ),
            ask('coord-chord'),
            ask('coord-chord+choice', 2),
            ask('coord-tangent-slider', 2),
          ],
          skillCheck: [ask('coord-tangent-gradient', 2), ask('coord-tangent-tiles', 2), ask('coord-chord', 2)],
        },
      ],
      levelCheck: [
        ask('coord-midpoint-tiles', 2),
        ask('coord-distance', 2),
        ask('coord-midpoint-slider', 2),
        ask('coord-bisector-tiles', 2),
        ask('coord-equidistant', 2),
        ask('coord-bisector-flow', 2),
        ask('coord-circle-tiles', 2),
        ask('coord-centre', 2),
        ask('coord-radius-squared', 2),
        ask('coord-complete-steps', 2),
        ask('coord-expanded-tiles', 2),
        ask('coord-inside-flow', 2),
        ask('coord-tangent-gradient', 2),
        ask('coord-chord+choice', 2),
        ask('coord-tangent-slider', 2),
      ],
    },
    {
      id: 'cg-l3',
      title: 'Lines Meeting Circles',
      lessons: [
        {
          id: 'cg-l3-substitute',
          title: 'Where a Line Meets a Circle',
          slides: [
            teach(
              prose(
                'Where a line meets a circle, both equations hold at once. Put the line\'s $mx + c$ in place of $y$ in the circle, and a quadratic in $x$ is left: its roots are the $x$-coordinates of the meeting points.',
              ),
              grid(6, [line(1, 1, true)], [{ x: -4, y: -3 }, { x: 3, y: 4 }], 'The circle x^2 + y^2 = 25 cut by the line y = x + 1 at two marked points', [{ h: 0, k: 0, r2: 25 }]),
              prose('For $y = x + 1$ and $x^2 + y^2 = 25$, multiply out, collect everything on one side, then divide through by the number in front of $x^2$:'),
              maths('\\begin{aligned} x^2 + (x + 1)^2 &= 25 \\\\ 2x^2 + 2x - 24 &= 0 \\\\ x^2 + x - 12 &= 0 \\end{aligned}'),
            ),
            ask('coord-substitute-steps'),
            ask('coord-meet-quadratic-tiles'),
            teach(
              prose(
                'Solving the quadratic, as in Quadratics, gives the $x$-coordinates: $x^2 + x - 12 = 0$ factorises. Put each back into the **line** for its $y$, not into the circle, which gives two values of $y$ for most $x$ and only one of them is on the line.',
              ),
              maths('(x + 4)(x - 3) = 0'),
              prose('So $x = -4$ gives $y = -3$ and $x = 3$ gives $y = 4$: the line meets the circle at $(-4, -3)$ and $(3, 4)$.'),
              prose('Told one meeting point already, say $(3, 4)$, the bracket $(x - 3)$ is one factor, and the other bracket gives the second point.'),
            ),
            ask('coord-meet-circle-x'),
            ask('coord-root-point-tree'),
            teach(
              prose(
                'With the centre away from the origin, both brackets carry a number. Into $(x - a)^2 + (y - b)^2 = r^2$ the line puts $mx + c - b$ in the second bracket:',
              ),
              maths('\\begin{aligned} &(x - a)^2 + (mx + c - b)^2 \\\\ &\\quad = r^2 \\end{aligned}'),
              prose('For $y = x + 1$ and $(x - 1)^2 + (y - 2)^2 = 8$ the second bracket is $x + 1 - 2 = x - 1$. Multiply out, collect, divide through:'),
              maths(
                '\\begin{aligned} (x - 1)^2 + (x - 1)^2 &= 8 \\\\ 2x^2 - 4x + 2 &= 8 \\\\ x^2 - 2x - 3 &= 0 \\end{aligned}',
              ),
              prose('That is $(x - 3)(x + 1) = 0$, and the line gives the points $(3, 4)$ and $(-1, 0)$.'),
            ),
            ask('coord-substitute-steps', 2),
            ask('coord-meet-quadratic-tiles', 2),
            ask('coord-meet-circle-x+choice', 2),
            ask('coord-root-point-tree', 2),
          ],
          skillCheck: [ask('coord-substitute-steps', 2), ask('coord-meet-quadratic-tiles', 2), ask('coord-root-point-tree', 2)],
        },
        {
          id: 'cg-l3-discriminant',
          title: 'Cuts, Touches or Misses',
          slides: [
            teach(
              prose(
                'The quadratic from substituting has two roots, one or none, and so does the meeting: the line **cuts** the circle at two points, **touches** it at one, or **misses** it. The discriminant $b^2 - 4ac$, from Quadratics, says which without solving anything.',
              ),
              grid(
                8,
                [
                  { f: () => 2, accent: true },
                  { f: () => 5, accent: true },
                  { f: () => 7, accent: true },
                ],
                [{ x: 0, y: 5 }],
                'The circle x^2 + y^2 = 25 with the lines y = 2, y = 5 and y = 7: one cuts it, one touches it, one misses it',
                [{ h: 0, k: 0, r2: 25 }],
              ),
              maths('\\begin{aligned} b^2 - 4ac > 0 &\\quad \\text{cuts} \\\\ b^2 - 4ac = 0 &\\quad \\text{touches} \\\\ b^2 - 4ac < 0 &\\quad \\text{misses} \\end{aligned}'),
              prose('Does $y = x + 3$ meet $x^2 + y^2 = 5$? Substitute and collect:'),
              maths('\\begin{aligned} x^2 + (x + 3)^2 &= 5 \\\\ 2x^2 + 6x + 4 &= 0 \\end{aligned}'),
              prose('Here $b^2 - 4ac = 6^2 - 4 \\times 2 \\times 4 = 36 - 32 = 4$. That is positive, so the line cuts the circle at two points.'),
            ),
            ask('coord-meet-count-flow'),
            ask('coord-meet-discriminant'),
            teach(
              prose('Does $y = 2x + 5$ meet $x^2 + y^2 = 5$? Substitute and collect:'),
              maths('\\begin{aligned} x^2 + (2x + 5)^2 &= 5 \\\\ 5x^2 + 20x + 20 &= 0 \\end{aligned}'),
              prose(
                'Here $b^2 - 4ac = 400 - 400 = 0$, so the line touches. A repeated root is $x = -\\frac{b}{2a} = -2$, and the line gives $y = 1$: they touch at $(-2, 1)$.',
              ),
              prose(
                'Only the sign decides. Dividing through by a positive number shrinks the discriminant but never changes its sign, so tidy first if that is easier; but when a question asks for the discriminant itself, give it for the quadratic before dividing.',
              ),
            ),
            ask('coord-touch-point-slider'),
            ask('coord-meet-count-flow', 2),
            ask('coord-meet-discriminant+choice', 2),
            teach(
              prose(
                'When several lines share a gradient, there is a shortcut. For $y = mx + c$ and $x^2 + y^2 = r^2$ the quadratic is $(1 + m^2)x^2 + 2mcx + c^2 - r^2 = 0$, and its discriminant tidies up:',
              ),
              maths(
                '\\begin{aligned} b^2 - 4ac &= 4m^2c^2 \\\\ &\\quad - 4(1 + m^2)(c^2 - r^2) \\\\ &= 4m^2c^2 - 4c^2 - 4m^2c^2 \\\\ &\\quad + 4r^2 + 4m^2r^2 \\\\ &= 4\\left[r^2(1 + m^2) - c^2\\right] \\end{aligned}',
              ),
              prose(
                'So the line touches when $c^2 = r^2(1 + m^2)$, cuts when $c^2$ is less and misses when it is more. With the centre at $(a, b)$, slide the picture so the centre is at the origin: the line becomes $y = mx + k$ with $k = ma + c - b$, and $k$ takes the place of $c$.',
              ),
            ),
            askWith(
              'coord-which-line',
              1,
              prose('The circle $(x - 1)^2 + (y - 3)^2 = 5$ and lines of gradient $2$: $r^2(1 + m^2) = 5 \\times 5 = 25$, and $k = 2 \\times 1 + c - 3$.'),
              maths(
                '\\begin{aligned} y &= 2x + 6: & k &= 2 + 6 - 3 = 5 \\\\ y &= 2x + 2: & k &= 2 + 2 - 3 = 1 \\\\ y &= 2x + 9: & k &= 2 + 9 - 3 = 8 \\end{aligned}',
              ),
              prose('Their squares are $25$, $1$ and $64$: the first touches, the second cuts and the third misses.'),
            ),
            ask('coord-touch-point-slider', 2),
            ask('coord-which-line', 2),
          ],
          skillCheck: [ask('coord-meet-count-flow', 2), ask('coord-meet-discriminant', 2), ask('coord-which-line', 2)],
        },
        {
          id: 'cg-l3-tangent-condition',
          title: 'The Tangent Condition',
          slides: [
            teach(
              prose('A line is a **tangent** exactly when it touches: the discriminant is zero. For $y = mx + c$ and $x^2 + y^2 = r^2$ the quadratic is'),
              maths('\\begin{aligned} &(1 + m^2)x^2 + 2mcx \\\\ &\\quad + c^2 - r^2 = 0 \\end{aligned}'),
              prose('The discriminant is zero when $b^2 = 4ac$. Divide both sides by $4$, multiply out, and the $m^2c^2$ on each side cancels:'),
              maths(
                '\\begin{aligned} (2mc)^2 &= 4(1 + m^2)(c^2 - r^2) \\\\ m^2c^2 &= (1 + m^2)(c^2 - r^2) \\\\ m^2c^2 &= c^2 + m^2c^2 - r^2 - m^2r^2 \\\\ 0 &= c^2 - r^2 - m^2r^2 \\end{aligned}',
              ),
              prose('That leaves the **tangent condition**:'),
              maths('c^2 = r^2(1 + m^2)'),
            ),
            ask('coord-touch-condition-steps'),
            ask('coord-touch-c'),
            ask('coord-touch-lines-tiles'),
            teach(
              prose('Two values of $c$ come out, one of each sign: two parallel tangents, either side of the circle. For $x^2 + y^2 = 20$ and gradient $2$:'),
              maths('c^2 = 20 \\times 5 = 100, \\quad c = \\pm 10'),
              grid(10, [line(2, 10, true), line(2, -10, true)], [{ x: -4, y: 2 }, { x: 4, y: -2 }], 'The circle x^2 + y^2 = 20 with its two tangents of gradient 2', [{ h: 0, k: 0, r2: 20 }]),
              prose('Run it backwards to find a radius: $y = 3x + 10$ touches a circle centred at the origin with $r^2 = 100 \\div 10 = 10$.'),
            ),
            ask('coord-touch-radius-tree'),
            ask('coord-touch-c+choice'),
            teach(
              prose(
                'With the centre at $(a, b)$, measure from the centre instead. Where $x = a$ the line is at height $ma + c$, so it is $k = ma + c - b$ above the centre, and the condition becomes',
              ),
              maths('k^2 = r^2(1 + m^2)'),
              prose('Solve for $k$, then $c = k + b - ma$. At the origin $k$ is just $c$. For $(x - 1)^2 + (y - 4)^2 = 5$ and gradient $2$:'),
              maths('\\begin{aligned} k^2 &= 5 \\times 5 = 25, \\quad k = \\pm 5 \\\\ c &= 5 + 4 - 2 = 7 \\\\ c &= -5 + 4 - 2 = -3 \\end{aligned}'),
              prose('So the tangents are $y = 2x + 7$ and $y = 2x - 3$.'),
            ),
            ask('coord-touch-condition-steps', 2),
            ask('coord-touch-lines-tiles', 2),
            ask('coord-touch-radius-tree', 2),
          ],
          skillCheck: [ask('coord-touch-lines-tiles', 2), ask('coord-touch-radius-tree', 2), ask('coord-touch-c', 2)],
        },
        {
          id: 'cg-l3-from-outside',
          title: 'Tangents from a Point Outside',
          slides: [
            teach(
              prose(
                'From a point $P$ outside a circle, two tangents can be drawn, and they are the same length. From a point on the circle there is one; from inside, none, since every line through it cuts the circle.',
              ),
              grid(6, [line(2, 5, true), line(-2, 5, true)], [{ x: 0, y: 5 }, { x: -2, y: 1 }, { x: 2, y: 1 }], 'The circle x^2 + y^2 = 5 with the two tangents from (0, 5)', [{ h: 0, k: 0, r2: 5 }]),
              prose(
                'To tell which, compare $CP^2$ with $r^2$. On $x^2 + y^2 = 5$: $P(0, 5)$ has $CP^2 = 25$, more than $5$, so it is outside with two tangents; $(1, 2)$ has $CP^2 = 5$, on the circle, one; $(1, 1)$ has $CP^2 = 2$, inside, none.',
              ),
            ),
            ask('coord-outside-count'),
            askWith(
              'coord-tangent-length',
              1,
              prose(
                'The radius to the point of contact $T$ meets the tangent at a right angle, so $C$, $T$ and $P$ make a right-angled triangle with $CP$ as its hypotenuse. From $P(5, 2)$ to $(x - 1)^2 + (y + 1)^2 = 9$:',
              ),
              maths('\\begin{aligned} CP^2 &= 4^2 + 3^2 = 25 \\\\ PT^2 &= CP^2 - r^2 = 25 - 9 = 16 \\\\ PT &= 4 \\end{aligned}'),
            ),
            ask('coord-tangent-length-tree'),
            teach(
              prose(
                'To find the tangents themselves, take every line through $P$ at once: through $P(1, 3)$ a line of gradient $m$ has $c = 3 - m$. Put that into the tangent condition for $x^2 + y^2 = 2$:',
              ),
              maths('\\begin{aligned} (3 - m)^2 &= 2(1 + m^2) \\\\ m^2 + 6m - 7 &= 0 \\\\ m = -7 &\\text{ or } m = 1 \\end{aligned}'),
              prose('So the tangents are $y = x + 2$ and $y = -7x + 10$.'),
            ),
            ask('coord-outside-gradient-steps'),
            ask('coord-outside-tangent-tiles'),
            teach(
              prose(
                'With the centre at $C(a, b)$, measure $P$ from the centre as well: if $P$ is $X$ across and $Y$ up from $C$, a line through it is $k = Y - mX$ above the centre, and the condition is $k^2 = r^2(1 + m^2)$ as before.',
              ),
              prose('If the circle comes multiplied out, complete the square first, as in Midpoints, Distances and Circles, to find $C$ and $r^2$. For $x^2 + y^2 - 2x - 4y - 4 = 0$, move the number across first:'),
              maths(
                '\\begin{aligned} x^2 - 2x + y^2 - 4y &= 4 \\\\ (x - 1)^2 - 1 + (y - 2)^2 - 4 &= 4 \\\\ (x - 1)^2 + (y - 2)^2 &= 9 \\end{aligned}',
              ),
              prose('So $C(1, 2)$ and $r^2 = 9$. For $P(4, 6)$, $CP^2 = 3^2 + 4^2 = 25$, more than $9$: two tangents.'),
            ),
            ask('coord-outside-count', 2),
            ask('coord-outside-gradient-steps', 2),
            ask('coord-outside-tangent-tiles', 2),
          ],
          skillCheck: [ask('coord-tangent-length', 2), ask('coord-outside-tangent-tiles', 2), ask('coord-outside-count', 2)],
        },
        {
          id: 'cg-l3-chords',
          title: 'Chords',
          slides: [
            teach(
              prose(
                'The perpendicular from the centre to a chord meets it at its midpoint $M$, as in Midpoints, Distances and Circles. So the radius, half the chord and $CM$ make a right-angled triangle:',
              ),
              maths('\\left(\\tfrac{1}{2}AB\\right)^2 = r^2 - CM^2'),
              grid(6, [segment(-4, 3, 4, 3)], [{ x: -4, y: 3 }, { x: 4, y: 3 }, { x: 0, y: 3 }, { x: 0, y: 0, hollow: true }], 'The circle x^2 + y^2 = 25 with a chord from (-4, 3) to (4, 3) and its midpoint (0, 3)', [{ h: 0, k: 0, r2: 25 }]),
              prose('In $x^2 + y^2 = 25$ the chord with midpoint $(0, 3)$ has $CM^2 = 9$, so half of it is $\\sqrt{16} = 4$ and the chord is $8$.'),
            ),
            ask('coord-chord-half-tree'),
            ask('coord-chord-radius'),
            teach(
              prose(
                'When a line cuts the chord off, its midpoint comes straight from the quadratic. If the roots of $x^2 + px + q = 0$ are $\\alpha$ and $\\beta$, it factorises as $(x - \\alpha)(x - \\beta)$, and multiplying out shows the $x$ coefficient:',
              ),
              maths('\\begin{aligned} &(x - \\alpha)(x - \\beta) \\\\ &= x^2 - (\\alpha + \\beta)x + \\alpha\\beta \\end{aligned}'),
              prose(
                'So $\\alpha + \\beta = -p$, and the midpoint\'s $x$ is half of $-p$. $y = -x + 4$ into $x^2 + y^2 = 10$ gives $2x^2 - 8x + 6 = 0$, that is $x^2 - 4x + 3 = 0$, which is $(x - 1)(x - 3) = 0$: the roots $1$ and $3$ do add to $4$.',
              ),
              maths('\\begin{aligned} x_M &= \\frac{4}{2} = 2 \\\\ y_M &= -2 + 4 = 2 \\end{aligned}'),
            ),
            ask('coord-chord-midpoint-steps'),
            ask('coord-chord-slider'),
            askWith(
              'coord-chord-radius+choice',
              2,
              prose(
                'With the circle multiplied out and its number unknown, find $r^2$ first, then multiply out. A chord of $6$ with midpoint $M(4, -1)$ in $x^2 + y^2 - 4x + 6y + k = 0$: the centre is $C(2, -3)$, so $CM^2 = 2^2 + 2^2 = 8$.',
              ),
              maths(
                '\\begin{aligned} r^2 &= 3^2 + 8 = 17 \\\\ (x - 2)^2 + (y + 3)^2 &= 17 \\end{aligned}',
              ),
              prose('Multiplying out, $(x - 2)^2$ gives $+4$ and $(y + 3)^2$ gives $+9$, and the 17 comes across. So $k = 4 + 9 - 17 = -4$.'),
            ),
            teach(
              prose(
                'A check on a midpoint: the line from the centre to $M$ is perpendicular to the chord, so its gradient is $-\\frac{1}{m}$. From $(0, 0)$ to $(2, 2)$ is gradient $1$, and the chord\'s is $-1$.',
              ),
              prose('It is also a second way in: $M$ is where that perpendicular meets the chord, two lines meeting as in Straight Lines.'),
            ),
            ask('coord-chord-half-tree', 2),
            ask('coord-chord-midpoint-steps', 2),
            ask('coord-chord-slider', 2),
          ],
          skillCheck: [ask('coord-chord-half-tree', 2), ask('coord-chord-midpoint-steps', 2), ask('coord-chord-radius', 2)],
        },
      ],
      levelCheck: [
        ask('coord-substitute-steps', 2),
        ask('coord-meet-quadratic-tiles', 2),
        ask('coord-root-point-tree', 2),
        ask('coord-meet-count-flow', 2),
        ask('coord-meet-discriminant', 2),
        ask('coord-touch-point-slider', 2),
        ask('coord-touch-c', 2),
        ask('coord-touch-lines-tiles', 2),
        ask('coord-touch-radius-tree', 2),
        ask('coord-tangent-length', 2),
        ask('coord-outside-tangent-tiles', 2),
        ask('coord-outside-count', 2),
        ask('coord-chord-half-tree', 2),
        ask('coord-chord-midpoint-steps', 2),
        ask('coord-chord-radius+choice', 2),
      ],
    },
    {
      id: 'cg-l4',
      title: 'Circle Theorems on Axes',
      lessons: [
        {
          id: 'cg-l4-semicircle',
          title: 'The Angle in a Semicircle',
          slides: [
            teach(
              prose(
                'If $AB$ is a **diameter** of a circle and $P$ is any other point on the circle, the angle $APB$ is a right angle. This is the **angle in a semicircle**.',
              ),
              grid(
                6,
                [segment(-5, 0, 3, 4), segment(5, 0, 3, 4)],
                [{ x: -5, y: 0 }, { x: 5, y: 0 }, { x: 3, y: 4 }, { x: 0, y: 0, hollow: true }],
                'The circle x^2 + y^2 = 25 with the diameter from (-5, 0) to (5, 0) and lines from both ends to P(3, 4)',
                [{ h: 0, k: 0, r2: 25 }],
              ),
              prose('On axes a right angle is two gradients that multiply to $-1$, as in Straight Lines. With $A(-5, 0)$, $B(5, 0)$ and $P(3, 4)$:'),
              maths('\\begin{aligned} m_{AP} &= \\frac{4}{8} = \\frac{1}{2} \\\\ m_{BP} &= \\frac{4}{-2} = -2 \\end{aligned}'),
              prose('and $\\frac{1}{2} \\times (-2) = -1$.'),
            ),
            ask('coord-semicircle-tree'),
            ask('coord-right-angle-point'),
            askWith(
              'coord-semicircle-tree',
              2,
              prose(
                'Given the circle and only one end $A$, the other end $B$ is as far past the centre as $A$ is short of it. On $x^2 + (y - 1)^2 = 10$ with $A(-1, -2)$, the centre is $C(0, 1)$, $1$ across and $3$ up from $A$:',
              ),
              maths('\\begin{aligned} x_B &= 0 + 1 = 1 \\\\ y_B &= 1 + 3 = 4 \\end{aligned}'),
            ),
            teach(
              prose(
                'It works backwards as well. If the gradients of $AP$ and $BP$ multiply to $-1$, then $P$ is on the circle with diameter $AB$; if they multiply to anything else, it is not.',
              ),
              prose('With the same $A$ and $B$, try $P(4, 2)$:'),
              maths('\\begin{aligned} m_{AP} &= \\frac{2}{9} \\\\ m_{BP} &= \\frac{2}{-1} = -2 \\\\ m_{AP} m_{BP} &= -\\frac{4}{9} \\end{aligned}'),
              prose('That is not $-1$, so $P$ is not on the circle. The distance agrees: $4^2 + 2^2 = 20$, not $25$.'),
            ),
            ask('coord-right-angle-flow'),
            ask('coord-right-angle-point', 2),
            ask('coord-right-angle-flow', 2),
            teach(
              prose(
                'The right angle can find a missing coordinate. Say $A(-5, 0)$ and $B(5, k)$ are the ends of a diameter and $P(3, 4)$ is on the circle. The centre depends on $k$, but the right angle at $P$ does not:',
              ),
              maths('\\begin{aligned} m_{AP} &= \\tfrac{1}{2}, \\quad m_{BP} = -2 \\\\ \\frac{k - 4}{5 - 3} &= -2 \\\\ k &= 0 \\end{aligned}'),
            ),
            ask('coord-semicircle-missing'),
            ask('coord-semicircle-missing+choice', 2),
          ],
          skillCheck: [ask('coord-semicircle-tree', 2), ask('coord-right-angle-flow', 2), ask('coord-semicircle-missing', 2)],
        },
        {
          id: 'cg-l4-diameter',
          title: 'A Circle from Its Diameter',
          slides: [
            teach(
              prose(
                'Given the two ends of a **diameter**, the whole circle follows. The centre is the midpoint of $AB$, and the radius is half of $AB$, so $r^2$ is a **quarter** of $AB^2$.',
              ),
              grid(
                8,
                [segment(-1, -2, 5, 6)],
                [{ x: -1, y: -2 }, { x: 5, y: 6 }, { x: 2, y: 2, hollow: true }],
                'A circle with centre (2, 2) and the diameter from (-1, -2) to (5, 6)',
                [{ h: 2, k: 2, r2: 25 }],
              ),
              prose('For $A(-1, -2)$ and $B(5, 6)$ the centre is $(2, 2)$ and $AB^2 = 6^2 + 8^2 = 100$:'),
              maths('r^2 = \\frac{100}{4} = 25'),
              prose('So the circle is $(x - 2)^2 + (y - 2)^2 = 25$.'),
            ),
            ask('coord-diameter-tiles'),
            ask('coord-diameter-slider'),
            ask('coord-diameter-r2'),
            teach(
              prose(
                'The slip to watch is using $AB^2$ itself as $r^2$. That is the circle of radius $AB$, twice the size. Halving the length quarters its square:',
              ),
              maths('r^2 = \\left(\\tfrac{1}{2}AB\\right)^2 = \\tfrac{1}{4}AB^2'),
              prose('Another way in is to find the centre first and then measure from it to either end: $CB^2 = 3^2 + 4^2 = 25$, the same answer.'),
            ),
            ask('coord-diameter-steps'),
            ask('coord-diameter-tiles', 2),
            ask('coord-diameter-slider', 2),
            teach(
              prose('Multiplied out, the circle carries the centre in its $x$ and $y$ terms and $r^2$ inside its number:'),
              maths('\\begin{aligned} (x - 2)^2 + (y - 2)^2 &= 25 \\\\ x^2 + y^2 - 4x - 4y - 17 &= 0 \\end{aligned}'),
              prose('The number is $a^2 + b^2 - r^2 = 4 + 4 - 25 = -17$.'),
            ),
            ask('coord-diameter-r2+choice', 2),
            ask('coord-diameter-steps', 2),
          ],
          skillCheck: [ask('coord-diameter-tiles', 2), ask('coord-diameter-r2', 2), ask('coord-diameter-steps', 2)],
        },
        {
          id: 'cg-l4-three-points',
          title: 'A Circle Through Three Points',
          slides: [
            teach(
              prose(
                'The perpendicular bisector of **any** chord passes through the centre, since every point on it is as far from one end of the chord as from the other. So two chords give two bisectors, and the centre is where they cross.',
              ),
              grid(
                6,
                [line(-2, 3), line(1, 0), segment(-2, 2, 2, 4), segment(2, 4, 4, 2)],
                [{ x: -2, y: 2 }, { x: 2, y: 4 }, { x: 4, y: 2 }, { x: 1, y: 1, hollow: true }],
                'A circle through P(-2, 2), Q(2, 4) and R(4, 2), with the bisectors of PQ and QR crossing at its centre (1, 1)',
                [{ h: 1, k: 1, r2: 10 }],
              ),
              prose(
                'For $P(-2, 2)$, $Q(2, 4)$ and $R(4, 2)$: $PQ$ has gradient $\\frac{1}{2}$, so its bisector has gradient $-2$ through the midpoint $(0, 3)$, which is $y = -2x + 3$. $QR$ has gradient $-1$, so its bisector is $y = x$.',
              ),
            ),
            ask('coord-three-bisector-steps'),
            ask('coord-three-bisector-steps', 2),
            teach(
              prose('Where the bisectors cross, both equations hold at once:'),
              maths('\\begin{aligned} -2x + 3 &= x \\\\ x &= 1, \\quad y = 1 \\end{aligned}'),
              prose(
                'So the centre is $C(1, 1)$, and $r^2 = CP^2 = 3^2 + 1^2 = 10$. The circle is $(x - 1)^2 + (y - 1)^2 = 10$. Measuring to $Q$ or $R$ instead gives $10$ too, which is a check.',
              ),
            ),
            ask('coord-three-points-r2'),
            ask('coord-circumcentre-tree'),
            ask('coord-three-points-r2+choice', 2),
            ask('coord-circumcentre-tree', 2),
            teach(
              prose(
                'A chord straight across has a straight-up bisector, $x$ equal to its midpoint\'s $x$; a chord straight up has a level one. When two of the chords are like that, the centre can be read off at once.',
              ),
              prose(
                'Then the angle between those two chords is a right angle, so by the angle in a semicircle the third side is a **diameter**: the centre is its midpoint too.',
              ),
            ),
            ask('coord-three-points-tiles'),
            ask('coord-three-points-tiles', 2),
          ],
          skillCheck: [ask('coord-three-points-tiles', 2), ask('coord-circumcentre-tree', 2), ask('coord-three-points-r2', 2)],
        },
        {
          id: 'cg-l4-chord-tangent',
          title: 'Chords and Tangents Together',
          slides: [
            teach(
              prose(
                'Three right angles do most of the work on a circle: a **tangent** meets the radius square on, the line from the centre to the **midpoint of a chord** meets the chord square on, and a **diameter** is seen at a right angle from the circle. Each turns one gradient into the negative reciprocal of another.',
              ),
              grid(
                6,
                [segment(-3, 4, 5, 0), segment(0, 0, 1, 2)],
                [{ x: -3, y: 4 }, { x: 5, y: 0 }, { x: 1, y: 2 }, { x: 0, y: 0, hollow: true }],
                'The circle x^2 + y^2 = 25 with a chord from (-3, 4) to (5, 0) and the line from the centre to its midpoint (1, 2)',
                [{ h: 0, k: 0, r2: 25 }],
              ),
              prose(
                'The chord from $A(-3, 4)$ to $B(5, 0)$ has midpoint $M(1, 2)$. $CM$ has gradient $2$ and $AB$ has gradient $-\\frac{1}{2}$. The distance from the centre to the chord is $CM = \\sqrt{5}$.',
              ),
            ),
            ask('coord-chord-fact-flow'),
            ask('coord-chord-distance'),
            teach(
              prose(
                'Run it the other way to find a chord from its midpoint: the chord is the line through $M$ perpendicular to $CM$.',
              ),
              prose('In $x^2 + y^2 = 25$ the chord with midpoint $M(3, -1)$: $CM$ has gradient $-\\frac{1}{3}$, so the chord has gradient $3$.'),
              maths('\\begin{aligned} -1 &= 3 \\times 3 + c \\\\ c &= -10 \\end{aligned}'),
              prose('So the chord is $y = 3x - 10$. When the circle comes multiplied out, complete the square first to find its centre. For $x^2 + y^2 - 4x + 2y - 20 = 0$, move the number across first:'),
              maths(
                '\\begin{aligned} x^2 - 4x + y^2 + 2y &= 20 \\\\ (x - 2)^2 - 4 + (y + 1)^2 - 1 &= 20 \\\\ (x - 2)^2 + (y + 1)^2 &= 25 \\end{aligned}',
              ),
              prose('The centre is $C(2, -1)$, and every fact then works from there.'),
            ),
            ask('coord-chord-fact-flow', 2),
            ask('coord-chord-from-midpoint-tree'),
            ask('coord-chord-distance+choice', 2),
            ask('coord-chord-from-midpoint-tree', 2),
            teach(
              prose(
                'When the centre is not given, a chord still points to it. If the centre is known to lie on a line, such as the $y$-axis, call it $C(0, t)$: it is as far from $A$ as from $B$, and $CA^2 = CB^2$ is linear in $t$.',
              ),
              prose('For $A(3, 4)$ and $B(-1, 6)$:'),
              maths('\\begin{aligned} 9 + (4 - t)^2 &= 1 + (6 - t)^2 \\\\ 4t &= 12 \\\\ t &= 3 \\end{aligned}'),
              prose('The radius $CA$ from $C(0, 3)$ has gradient $\\frac{1}{3}$, so the tangent at $A$ has gradient $-3$: it is $y = -3x + 13$.'),
            ),
            ask('coord-chord-tangent-tiles'),
            ask('coord-chord-tangent-tiles', 2),
          ],
          skillCheck: [ask('coord-chord-fact-flow', 2), ask('coord-chord-tangent-tiles', 2), ask('coord-chord-distance', 2)],
        },
        {
          id: 'cg-l4-together',
          title: 'Putting It Together',
          slides: [
            teach(
              prose('Four facts, and the question each one answers:'),
              prose(
                'The **angle in a semicircle** is a right angle: is $P$ on the circle with diameter $AB$? A **chord\'s perpendicular bisector** passes through the centre: where is the centre? The **tangent** is perpendicular to the radius: what is its gradient? The **centre is the midpoint** of a diameter: where is the other end?',
              ),
              prose('For the last one, $B$ is as far past the centre as $A$ is short of it, so $B = 2C - A$. On $(x - 1)^2 + (y - 1)^2 = 10$ with $A(-2, 0)$:'),
              maths('\\begin{aligned} x_B &= 2 \\times 1 + 2 = 4 \\\\ y_B &= 2 \\times 1 - 0 = 2 \\end{aligned}'),
            ),
            ask('coord-which-theorem'),
            ask('coord-other-end-steps'),
            ask('coord-other-end-slider'),
            teach(
              prose(
                'The tangents at the two ends of a diameter are both perpendicular to it, so they are **parallel**: the same gradient, a different $c$.',
              ),
              grid(
                6,
                [segment(-2, 0, 4, 2), line(-3, -6, true), line(-3, 14, true)],
                [{ x: -2, y: 0 }, { x: 4, y: 2 }, { x: 1, y: 1, hollow: true }],
                'The circle centred at (1, 1) with the diameter from (-2, 0) to (4, 2) and the parallel tangents at its ends',
                [{ h: 1, k: 1, r2: 10 }],
              ),
              prose(
                'The radius to $A(-2, 0)$ has gradient $\\frac{1}{3}$, so both tangents have gradient $-3$. At $A$ it is $y = -3x - 6$; through $B(4, 2)$, $2 = -12 + c$, so the other is $y = -3x + 14$.',
              ),
            ),
            ask('coord-parallel-tangent'),
            teach(
              prose(
                'When the circle comes multiplied out, complete the square first, as in Midpoints, Distances and Circles, to find the centre and $r^2$. After that every fact works as before. For $x^2 + y^2 - 2x - 2y - 8 = 0$, move the number across first:',
              ),
              maths(
                '\\begin{aligned} x^2 - 2x + y^2 - 2y &= 8 \\\\ (x - 1)^2 - 1 + (y - 1)^2 - 1 &= 8 \\\\ (x - 1)^2 + (y - 1)^2 &= 10 \\end{aligned}',
              ),
              prose('That is the same circle as above: centre $(1, 1)$ and $r^2 = 10$.'),
            ),
            ask('coord-which-theorem', 2),
            ask('coord-other-end-steps', 2),
            ask('coord-parallel-tangent+choice', 2),
            ask('coord-other-end-slider', 2),
          ],
          skillCheck: [ask('coord-other-end-steps', 2), ask('coord-parallel-tangent', 2), ask('coord-which-theorem', 2)],
        },
      ],
      levelCheck: [
        ask('coord-semicircle-tree', 2),
        ask('coord-right-angle-flow', 2),
        ask('coord-semicircle-missing', 2),
        ask('coord-diameter-tiles', 2),
        ask('coord-diameter-r2', 2),
        ask('coord-diameter-slider', 2),
        ask('coord-three-bisector-steps', 2),
        ask('coord-circumcentre-tree', 2),
        ask('coord-three-points-tiles', 2),
        ask('coord-chord-fact-flow', 2),
        ask('coord-chord-distance', 2),
        ask('coord-chord-tangent-tiles', 2),
        ask('coord-which-theorem', 2),
        ask('coord-other-end-steps', 2),
        ask('coord-parallel-tangent+choice', 2),
      ],
    },
    /* ---------- Level 5: coordinate proof ----------
     * A quadrilateral or a triangle named from its gradients and squared
     * lengths: a parallelogram, a rectangle, a rhombus or a square, a
     * right-angled or an isosceles triangle, and then the proof written out.
     * Nothing here is calculus, so no slide declares `source`, `integrand` or
     * `limits`. */
    {
      id: 'cg-l5',
      title: 'Coordinate Proof',
      lessons: [
        {
          id: 'cg-l5-parallel',
          title: 'Parallel Sides',
          slides: [
            teach(
              prose(
                'A **parallelogram** is a quadrilateral whose opposite sides are parallel. On axes, parallel lines have equal gradients, so $ABCD$ is a parallelogram when $m_{AB} = m_{DC}$ **and** $m_{AD} = m_{BC}$.',
              ),
              grid(
                5,
                [segment(-3, -2, 1, -1), segment(1, -1, 3, 2), segment(3, 2, -1, 1), segment(-1, 1, -3, -2)],
                [{ x: -3, y: -2 }, { x: 1, y: -1 }, { x: 3, y: 2 }, { x: -1, y: 1 }],
                'The parallelogram with corners A(-3, -2), B(1, -1), C(3, 2) and D(-1, 1)',
              ),
              prose('For $A(-3, -2)$, $B(1, -1)$, $C(3, 2)$ and $D(-1, 1)$:'),
              maths(
                '\\begin{aligned} m_{AB} &= \\tfrac{1}{4}, \\quad m_{DC} = \\tfrac{1}{4} \\\\ m_{AD} &= \\tfrac{3}{2}, \\quad m_{BC} = \\tfrac{3}{2} \\end{aligned}',
              ),
              prose('Both pairs match. If only one pair matched, $ABCD$ would be a **trapezium**.'),
            ),
            ask('coord-para-flow'),
            teach(
              prose(
                'A second test: the diagonals of a parallelogram **bisect each other**, so $AC$ and $BD$ have the same midpoint. And a quadrilateral whose diagonals share a midpoint is a parallelogram.',
              ),
              prose(
                'Average the ends of each diagonal. For $AC$: $\\tfrac{-3 + 3}{2} = 0$ and $\\tfrac{-2 + 2}{2} = 0$. For $BD$: $\\tfrac{1 + (-1)}{2} = 0$ and $\\tfrac{-1 + 1}{2} = 0$.',
              ),
              maths('M_{AC} = M_{BD} = (0, 0)'),
              prose('One point, so the diagonals bisect each other. Two different points would mean it is not a parallelogram.'),
            ),
            ask('coord-para-diagonal-steps'),
            ask('coord-para-flow', 2),
            teach(
              prose(
                'Opposite sides are equal as well as parallel, so the step from $B$ to $A$ is the same as the step from $C$ to $D$. That finds a missing corner: $D = A + C - B$.',
              ),
              maths('\\begin{aligned} x_D &= -3 + 3 - 1 = -1 \\\\ y_D &= -2 + 2 - (-1) = 1 \\end{aligned}'),
              prose(
                'The equal gradients run backwards too. If $AB \\parallel DC$ with $A(1, 1)$, $B(3, 2)$, $C(4, 5)$ and $D(0, k)$, write the gradient of $DC$ with $k$ in it and set it equal to $m_{AB} = \\frac{1}{2}$:',
              ),
              maths('\\begin{aligned} \\frac{5 - k}{4 - 0} &= \\frac{1}{2} \\\\ 5 - k &= 2 \\\\ k &= 3 \\end{aligned}'),
            ),
            ask('coord-para-slider'),
            ask('coord-para-fourth-tiles'),
            ask('coord-parallel-k'),
            ask('coord-para-diagonal-steps', 2),
            ask('coord-parallel-k+choice', 2),
          ],
          skillCheck: [ask('coord-para-flow', 2), ask('coord-para-diagonal-steps', 2), ask('coord-parallel-k', 2)],
        },
        {
          id: 'cg-l5-right-angles',
          title: 'Right Angles',
          slides: [
            teach(
              prose(
                'A **rectangle** is a parallelogram with a right angle. One is enough: the opposite angles of a parallelogram are equal and neighbouring ones add to $180^\\circ$, so one right angle makes four.',
              ),
              grid(
                5,
                [segment(-2, -1, 0, 0), segment(0, 0, -2, 4), segment(-2, 4, -4, 3), segment(-4, 3, -2, -1)],
                [{ x: -2, y: -1 }, { x: 0, y: 0 }, { x: -2, y: 4 }, { x: -4, y: 3 }],
                'The rectangle with corners A(-2, -1), B(0, 0), C(-2, 4) and D(-4, 3)',
              ),
              prose('For the parallelogram $A(-2, -1)$, $B(0, 0)$, $C(-2, 4)$, $D(-4, 3)$:'),
              maths('\\begin{aligned} m_{AB} &= \\tfrac{1}{2} \\\\ m_{BC} &= -2 \\\\ m_{AB} \\times m_{BC} &= -1 \\end{aligned}'),
              prose('So the angle at $B$ is a right angle, and $ABCD$ is a rectangle.'),
            ),
            ask('coord-rect-flow'),
            ask('coord-rect-flow', 2),
            teach(
              prose('A second test: a parallelogram is a rectangle exactly when its **diagonals are equal**. Compare the squared lengths, so nothing needs a square root:'),
              maths('\\begin{aligned} AC^2 &= 0^2 + 5^2 = 25 \\\\ BD^2 &= (-4)^2 + 3^2 = 25 \\end{aligned}'),
              prose(
                'Equal diagonals prove a rectangle only for a **parallelogram**; a kite-like shape can have equal diagonals too. So show it is a parallelogram first: its diagonals share a midpoint.',
              ),
              maths('\\begin{aligned} M_{AC} &= \\left(\\tfrac{-2 + (-2)}{2}, \\tfrac{-1 + 4}{2}\\right) \\\\ &= (-2, 1.5) \\\\ M_{BD} &= \\left(\\tfrac{0 + (-4)}{2}, \\tfrac{0 + 3}{2}\\right) \\\\ &= (-2, 1.5) \\end{aligned}'),
            ),
            ask('coord-diagonals-tree'),
            ask('coord-para-diagonal-steps'),
            ask('coord-diagonals-tree', 2),
            teach(
              prose(
                'The right angle can find a missing coordinate. If $ABCD$ is a rectangle with $A(-2, -1)$, $B(0, 0)$ and $C(-2, k)$, then $BC$ is perpendicular to $AB$:',
              ),
              maths('\\begin{aligned} m_{BC} &= -1 \\div \\tfrac{1}{2} = -2 \\\\ \\frac{k - 0}{-2 - 0} &= -2 \\\\ k &= 4 \\end{aligned}'),
              prose(
                'The other parallelogram test is gradients: both pairs of opposite sides must have equal gradients. Here $m_{AB} = m_{DC} = \\frac{1}{2}$ and $m_{AD} = m_{BC} = -2$. If only one pair matched, it would be a **trapezium**.',
              ),
            ),
            ask('coord-rect-k'),
            ask('coord-rect-k+choice', 2),
            ask('coord-para-flow', 2),
          ],
          skillCheck: [ask('coord-rect-flow', 2), ask('coord-diagonals-tree', 2), ask('coord-rect-k', 2)],
        },
        {
          id: 'cg-l5-equal-sides',
          title: 'Equal Sides',
          slides: [
            teach(
              prose(
                'A **rhombus** is a parallelogram with all four sides equal. Opposite sides of a parallelogram are already equal, so two sides that meet are enough: show $AB^2 = BC^2$.',
              ),
              grid(
                5,
                [segment(-3, -1, 0, 0), segment(0, 0, 1, 3), segment(1, 3, -2, 2), segment(-2, 2, -3, -1)],
                [{ x: -3, y: -1 }, { x: 0, y: 0 }, { x: 1, y: 3 }, { x: -2, y: 2 }],
                'The rhombus with corners A(-3, -1), B(0, 0), C(1, 3) and D(-2, 2)',
              ),
              prose('For $A(-3, -1)$, $B(0, 0)$, $C(1, 3)$, $D(-2, 2)$:'),
              maths('\\begin{aligned} AB^2 &= 3^2 + 1^2 = 10 \\\\ BC^2 &= 1^2 + 3^2 = 10 \\end{aligned}'),
            ),
            ask('coord-side-lengths-tiles'),
            teach(
              prose('A second test: a parallelogram is a rhombus exactly when its **diagonals are perpendicular**. Here:'),
              maths(
                '\\begin{aligned} m_{AC} &= \\tfrac{4}{4} = 1 \\\\ m_{BD} &= \\tfrac{2}{-2} = -1 \\\\ m_{AC} \\times m_{BD} &= -1 \\end{aligned}',
              ),
              prose('The diagonals cross at a right angle, so $ABCD$ is a rhombus.'),
            ),
            ask('coord-rhombus-flow'),
            ask('coord-side-lengths-tiles', 2),
            ask('coord-rhombus-flow', 2),
            teach(
              prose(
                'A **square** is both a rectangle and a rhombus: a right angle **and** equal sides. Give a parallelogram the most exact name it earns:',
              ),
              prose(
                'Neither test: a parallelogram. A right angle only: a rectangle. Equal sides only: a rhombus. Both: a square. For $A(-1, -1)$, $B(1, 0)$, $C(0, 2)$, $D(-2, 1)$, $AB^2 = BC^2 = 5$ and $m_{AB} \\times m_{BC} = \\tfrac{1}{2} \\times (-2) = -1$, so it is a square.',
              ),
            ),
            ask('coord-name-quad'),
            ask('coord-square-steps'),
            ask('coord-name-quad', 2),
            ask('coord-square-steps', 2),
          ],
          skillCheck: [ask('coord-square-steps', 2), ask('coord-rhombus-flow', 2), ask('coord-name-quad', 2)],
        },
        {
          id: 'cg-l5-triangles',
          title: 'Triangles',
          slides: [
            teach(
              prose(
                'A triangle is **right-angled** at a corner when the two sides meeting there are perpendicular: their gradients multiply to $-1$.',
              ),
              grid(
                5,
                [segment(-1, 0, 1, -1), segment(1, -1, 3, 3), segment(3, 3, -1, 0)],
                [{ x: -1, y: 0 }, { x: 1, y: -1 }, { x: 3, y: 3 }],
                'The triangle with corners P(-1, 0), Q(1, -1) and R(3, 3), right-angled at Q',
              ),
              prose('For $P(-1, 0)$, $Q(1, -1)$ and $R(3, 3)$:'),
              maths('m_{QP} \\times m_{QR} = -\\tfrac{1}{2} \\times 2 = -1'),
              prose('So the angle at $Q$ is a right angle.'),
              prose(
                'Run it backwards for a missing coordinate. If the triangle is right-angled at $Q$ but $P$ is $(-1, k)$: $m_{QR} = 2$, so $m_{QP}$ must be $-\\frac{1}{2}$.',
              ),
              maths('\\begin{aligned} \\frac{k - (-1)}{-1 - 1} &= -\\tfrac{1}{2} \\\\ k + 1 &= 1 \\\\ k &= 0 \\end{aligned}'),
            ),
            ask('coord-tri-right-tree'),
            ask('coord-tri-right-k'),
            teach(
              prose(
                'Pythagoras works backwards as well: if the two shorter squared lengths add to the longest, the angle opposite the longest side is a right angle. No gradients, and no square roots:',
              ),
              maths('\\begin{aligned} PQ^2 &= 5 \\\\ QR^2 &= 20 \\\\ RP^2 &= 25 \\end{aligned}'),
              prose('The two shorter add to the longest: $5 + 20 = 25$.'),
              prose('$RP$ is the longest side, so the right angle is opposite it, at $Q$.'),
            ),
            ask('coord-tri-vertex-choice'),
            ask('coord-tri-right-tree', 2),
            ask('coord-tri-vertex-choice', 2),
            teach(
              prose('A triangle is **isosceles** when two of its sides are equal. Compare all three squared lengths; the equal pair meet at the apex.'),
              prose('For $P(0, 3)$, $Q(-1, 1)$ and $R(1, 1)$:'),
              maths('\\begin{aligned} PQ^2 &= 1 + 4 = 5 \\\\ QR^2 &= 4 + 0 = 4 \\\\ RP^2 &= 1 + 4 = 5 \\end{aligned}'),
              prose('$PQ = RP$, so $PQR$ is isosceles with its apex at $P$.'),
            ),
            ask('coord-isosceles-flow'),
            ask('coord-isosceles-flow', 2),
            ask('coord-tri-right-k+choice', 2),
          ],
          skillCheck: [ask('coord-tri-right-tree', 2), ask('coord-tri-vertex-choice', 2), ask('coord-isosceles-flow', 2)],
        },
        {
          id: 'cg-l5-proof',
          title: 'Writing the Proof',
          slides: [
            teach(
              prose(
                'A proof is the facts in order, each leaning on the one before. To show $ABCD$ is a rectangle: first that it is a parallelogram, then that it has a right angle, then the name.',
              ),
              prose(
                'For $A(-2, -1)$, $B(0, 0)$, $C(-2, 4)$ and $D(-4, 3)$: $m_{AB} = m_{DC} = \\tfrac{1}{2}$ and $m_{AD} = m_{BC} = -2$, so both pairs of opposite sides are parallel and $ABCD$ is a parallelogram. In it, $\\tfrac{1}{2} \\times (-2) = -1$, so the angle at $B$ is a right angle. A parallelogram with a right angle is a rectangle.',
              ),
              prose(
                'A rhombus goes the same way through the diagonals. For $A(-3, -1)$, $B(0, 0)$, $C(1, 3)$ and $D(-2, 2)$: the midpoints of $AC$ and $BD$ are one point, $M_{AC} = M_{BD} = (-1, 1)$, so the diagonals bisect each other and $ABCD$ is a parallelogram. In it, $m_{AC} \\times m_{BD} = 1 \\times (-1) = -1$, so the diagonals are perpendicular. A parallelogram with perpendicular diagonals is a rhombus.',
              ),
            ),
            ask('coord-proof-order'),
            teach(
              prose('Which facts are **enough**? Each name needs a parallelogram and then its own tests:'),
              prose(
                'A rectangle: one right angle, or equal diagonals. A rhombus: two equal sides that meet, or perpendicular diagonals. A square: one test from each. A square that is missing one test is a rectangle, a rhombus, or not a parallelogram at all.',
              ),
              prose(
                'The rectangle above passes two of the three tests for a square: its opposite sides are parallel and it has a right angle at $B$. But $AB^2 = 2^2 + 1^2 = 5$ and $BC^2 = 2^2 + 4^2 = 20$, so it fails $AB = BC$. For $A(-1, -1)$, $B(1, 0)$, $C(0, 2)$, $D(-2, 1)$, $AB^2 = BC^2 = 5$ and $\\tfrac{1}{2} \\times (-2) = -1$: both tests pass, so it is a square.',
              ),
            ),
            ask('coord-square-steps', 2),
            ask('coord-fails-one-choice'),
            ask('coord-proof-order', 2),
            teach(
              prose(
                'To complete a named shape from three corners, every one of them is a parallelogram, so $D = A + C - B$. Then check the name: the right angle, the equal sides, or both.',
              ),
              prose('For the square with $A(-1, -1)$, $B(1, 0)$ and $C(0, 2)$:'),
              maths('\\begin{aligned} x_D &= -1 + 0 - 1 = -2 \\\\ y_D &= -1 + 2 - 0 = 1 \\end{aligned}'),
            ),
            ask('coord-complete-choice'),
            ask('coord-fails-one-choice', 2),
            ask('coord-complete-choice', 2),
            ask('coord-rhombus-flow', 2),
          ],
          skillCheck: [ask('coord-proof-order', 2), ask('coord-complete-choice', 2), ask('coord-fails-one-choice', 2)],
        },
      ],
      levelCheck: [
        ask('coord-para-flow', 2),
        ask('coord-para-diagonal-steps', 2),
        ask('coord-para-fourth-tiles', 2),
        ask('coord-rect-flow', 2),
        ask('coord-diagonals-tree', 2),
        ask('coord-rect-k', 2),
        ask('coord-side-lengths-tiles', 2),
        ask('coord-rhombus-flow', 2),
        ask('coord-name-quad', 2),
        ask('coord-tri-vertex-choice', 2),
        ask('coord-isosceles-flow', 2),
        ask('coord-tri-right-k', 2),
        ask('coord-proof-order', 2),
        ask('coord-complete-choice', 2),
        ask('coord-fails-one-choice', 2),
      ],
    },
    /* ---------- Level 6: areas and loci ----------
     * The area of a triangle from a level base and its height, from the box
     * round it, and by the shoelace; a polygon split into triangles and a
     * corner found from its area; then a locus written as an equation, from
     * words and from a condition such as PA = 2PB. Nothing here is calculus,
     * so no slide declares `source`, `integrand` or `limits`. */
    {
      id: 'cg-l6',
      title: 'Areas and Loci',
      lessons: [
        {
          id: 'cg-l6-base-height',
          title: 'Base and Height',
          slides: [
            teach(
              prose(
                'The area of a triangle is **half the base times the height**, the height measured square on to the base. On axes a **level** side makes the easiest base: its length is a change in $x$ alone, and the height is a change in $y$ alone.',
              ),
              grid(
                5,
                [segment(-3, -2, 3, -2), segment(3, -2, 1, 3), segment(1, 3, -3, -2)],
                [{ x: -3, y: -2 }, { x: 3, y: -2 }, { x: 1, y: 3 }],
                'The triangle with corners A(-3, -2), B(3, -2) and C(1, 3)',
              ),
              prose('For $A(-3, -2)$, $B(3, -2)$ and $C(1, 3)$, $AB$ lies on the line $y = -2$:'),
              maths('\\begin{aligned} b &= 3 - (-3) = 6 \\\\ h &= 3 - (-2) = 5 \\\\ \\text{Area} &= \\tfrac{1}{2} \\times 6 \\times 5 = 15 \\end{aligned}'),
            ),
            ask('coord-base-height-tree'),
            ask('coord-tri-area'),
            ask('coord-half-base-choice'),
            teach(
              prose(
                'The third corner need not sit over the base. The height is still its distance from the line the base is on, measured straight up or down; a slanted side is never the height.',
              ),
              prose(
                'A side straight **up** works as well, with the roles swapped: the base is a change in $y$ and the height a change in $x$. For $A(1, -3)$, $B(1, 3)$ and $C(-4, 5)$, $AB$ is on $x = 1$:',
              ),
              maths('\\begin{aligned} b &= 3 - (-3) = 6 \\\\ h &= |-4 - 1| = 5 \\\\ \\text{Area} &= \\tfrac{1}{2} \\times 6 \\times 5 = 15 \\end{aligned}'),
            ),
            ask('coord-base-height-tree', 2),
            ask('coord-tri-area', 2),
            teach(
              prose(
                'The formula runs backwards: from the area to the height, then to the corner. If $A(-2, 1)$ and $B(4, 1)$ are two corners, the area is $12$, and $C(3, k)$ is **above** $AB$:',
              ),
              maths('\\begin{aligned} \\tfrac{1}{2} \\times 6 \\times h &= 12 \\\\ h &= 4 \\\\ k &= 1 + 4 = 5 \\end{aligned}'),
              prose(
                'Below $AB$ it would be $k = 1 - 4 = -3$ instead, so read which side the question puts it on. With a side straight up the height runs across: $4$ to the left of $x = 2$ is $x = -2$.',
              ),
            ),
            ask('coord-apex-slider'),
            ask('coord-apex-k'),
            ask('coord-apex-k+choice', 2),
          ],
          skillCheck: [ask('coord-base-height-tree', 2), ask('coord-tri-area', 2), ask('coord-apex-k', 2)],
        },
        {
          id: 'cg-l6-shoelace',
          title: 'The Box and the Shoelace',
          slides: [
            teach(
              prose(
                'When no side is level, draw the **box** round the triangle: the smallest rectangle with its sides on the grid lines. The triangle is the box less three right-angled triangles in its corners, and each of those has level sides.',
              ),
              grid(
                5,
                [segment(-2, -2, 3, 0), segment(3, 0, 0, 2), segment(0, 2, -2, -2)],
                [{ x: -2, y: -2 }, { x: 3, y: 0 }, { x: 0, y: 2 }],
                'The triangle with corners A(-2, -2), B(3, 0) and C(0, 2)',
              ),
              prose(
                'For $A(-2, -2)$, $B(3, 0)$ and $C(0, 2)$, the box runs from $x = -2$ to $3$ and from $y = -2$ to $2$: $5$ by $4$. Its corners are $\\tfrac{1}{2} \\times 5 \\times 2$, $\\tfrac{1}{2} \\times 3 \\times 2$ and $\\tfrac{1}{2} \\times 2 \\times 4$.',
              ),
              maths('\\text{Area} = 20 - 5 - 3 - 4 = 8'),
            ),
            ask('coord-box-flow'),
            ask('coord-box-steps'),
            ask('coord-box-area'),
            teach(
              prose(
                'The **shoelace** gets the same number with no box. Go round the corners in order and, for each side, multiply across and take away: $x_Ay_B - x_By_A$, then $x_By_C - x_Cy_B$, then $x_Cy_A - x_Ay_C$. The area is half the size of their total.',
              ),
              maths('\\begin{aligned} (-2)(0) - (3)(-2) &= 6 \\\\ (3)(2) - (0)(0) &= 6 \\\\ (0)(-2) - (-2)(2) &= 4 \\end{aligned}'),
              prose(
                'They add to $16$, so the area is $8$, as before. Going round the other way gives $-16$: the sign only says which way round you went, so take its size.',
              ),
            ),
            ask('coord-shoelace-tree'),
            ask('coord-box-steps', 2),
            ask('coord-box-flow', 2),
            teach(
              prose(
                'Two ways, one number. The box is the one to picture; the shoelace is the one to reach for when the numbers are big or the shape has more corners. Each checks the other.',
              ),
              prose(
                'Corners on the grid always give an area that is whole or ends in a half, because twice the area is a sum of whole numbers.',
              ),
            ),
            ask('coord-shoelace-tree', 2),
            ask('coord-box-area+choice', 2),
          ],
          skillCheck: [ask('coord-box-steps', 2), ask('coord-shoelace-tree', 2), ask('coord-box-area', 2)],
        },
        {
          id: 'cg-l6-polygons',
          title: 'Polygons',
          slides: [
            teach(
              prose('A diagonal splits a quadrilateral into two triangles, and its area is theirs added.'),
              grid(
                5,
                [
                  segment(-3, -2, 2, -2),
                  segment(2, -2, 3, 2),
                  segment(3, 2, -1, 3),
                  segment(-1, 3, -3, -2),
                  { ...segment(-3, -2, 3, 2), accent: false, dashed: true },
                ],
                [{ x: -3, y: -2 }, { x: 2, y: -2 }, { x: 3, y: 2 }, { x: -1, y: 3 }],
                'The quadrilateral with corners A(-3, -2), B(2, -2), C(3, 2) and D(-1, 3), split by the diagonal AC',
              ),
              prose('For $A(-3, -2)$, $B(2, -2)$, $C(3, 2)$ and $D(-1, 3)$, split along $AC$:'),
              maths('\\begin{aligned} ABC &= 10 \\\\ ACD &= 11 \\\\ ABCD &= 10 + 11 = 21 \\end{aligned}'),
              prose('The shoelace also runs straight round all four corners, one cross-product for each side, the last one back to $A$:'),
              maths(
                '\\begin{aligned} (-3)(-2) - (2)(-2) &= 10 \\\\ (2)(2) - (3)(-2) &= 10 \\\\ (3)(3) - (-1)(2) &= 11 \\\\ (-1)(-2) - (-3)(3) &= 11 \\end{aligned}',
              ),
              prose('They add to $42$, and half of that is $21$, as before.'),
            ),
            ask('coord-quad-split-tree'),
            ask('coord-poly-shoelace-steps'),
            teach(
              prose(
                'A **parallelogram** is two equal triangles, since its opposite sides are equal and parallel. So its area is twice triangle $ABC$, which is the shoelace sum for $ABC$ before it is halved.',
              ),
              prose('For $A(-2, -1)$, $B(2, 0)$, $C(3, 3)$ and $D(-1, 2)$:'),
              maths('\\begin{aligned} (-2)(0) - (2)(-1) &= 2 \\\\ (2)(3) - (3)(0) &= 6 \\\\ (3)(-1) - (-2)(3) &= 3 \\end{aligned}'),
              prose('They add to $11$, so $ABC$ has area $5.5$ and the parallelogram $11$.'),
            ),
            ask('coord-para-area'),
            ask('coord-quad-split-tree', 2),
            ask('coord-para-area+choice', 2),
            teach(
              prose(
                'Working backwards, a corner with one unknown coordinate has **two** places to be, one each side of the opposite side. For $A(-2, 1)$, $B(4, 1)$ and $C(3, k)$ with area $9$:',
              ),
              maths('\\begin{aligned} \\tfrac{1}{2} \\times 6 \\times |k - 1| &= 9 \\\\ k - 1 &= 3 \\text{ or } -3 \\\\ k &= 4 \\text{ or } -2 \\end{aligned}'),
            ),
            ask('coord-area-k-tiles'),
            askWith(
              'coord-area-k-tiles',
              2,
              prose(
                'With no level side, run the shoelace with $k$ in it. For $A(1, 2)$, $B(3, 5)$ and $C(k, -1)$ with area $6$, the sum must have size $12$:',
              ),
              maths('\\begin{aligned} (1)(5) - (3)(2) &= -1 \\\\ (3)(-1) - (k)(5) &= -3 - 5k \\\\ (k)(2) - (1)(-1) &= 2k + 1 \\end{aligned}'),
              prose('They add to $-3 - 3k$. So $-3 - 3k = 12$, giving $k = -5$, or $-3 - 3k = -12$, giving $k = 3$.'),
            ),
            ask('coord-poly-shoelace-steps', 2),
          ],
          skillCheck: [ask('coord-quad-split-tree', 2), ask('coord-poly-shoelace-steps', 2), ask('coord-area-k-tiles', 2)],
        },
        {
          id: 'cg-l6-locus-equation',
          title: 'A Locus as an Equation',
          slides: [
            teach(
              prose(
                'A **locus** is the path of a point that moves by a rule. On axes the rule becomes an equation in $x$ and $y$: a point is on the locus exactly when its coordinates satisfy it.',
              ),
              grid(
                8,
                [],
                [{ x: 1, y: -2 }, { x: 4, y: 2 }],
                'The circle of points 5 from C(1, -2), passing through (4, 2)',
                [{ h: 1, k: -2, r2: 25 }],
              ),
              prose(
                'Always $5$ from $C(1, -2)$: $P(x, y)$ is on it when $CP^2 = 25$, so the locus is the circle $(x - 1)^2 + (y + 2)^2 = 25$. The point $(4, 2)$ is on it, since $3^2 + 4^2 = 25$.',
              ),
            ),
            ask('coord-locus-on-choice'),
            ask('coord-locus-circle-tiles'),
            teach(
              prose(
                'Always as far from $A$ as from $B$: set $PA^2 = PB^2$ and multiply out. The $x^2$ and $y^2$ cancel, so the locus is a straight line, the perpendicular bisector of $AB$. For $A(-1, 2)$ and $B(3, 4)$:',
              ),
              maths(
                '\\begin{aligned} PA^2 &= (x + 1)^2 + (y - 2)^2 \\\\ PB^2 &= (x - 3)^2 + (y - 4)^2 \\end{aligned}',
              ),
              prose('Multiplied out, $PA^2 = x^2 + y^2 + 2x - 4y + 5$ and $PB^2 = x^2 + y^2 - 6x - 8y + 25$.'),
              prose('Set them equal. The squares cancel and the rest collects to $8x + 4y - 20 = 0$; divide by $4$:'),
              maths('2x + y - 5 = 0'),
              prose('The midpoint of $AB$, $(1, 3)$, is on it: $2 + 3 - 5 = 0$.'),
            ),
            ask('coord-locus-bisector-steps'),
            ask('coord-locus-equidistant-slider'),
            ask('coord-locus-circle-tiles', 2),
            teach(
              prose(
                'Always a fixed distance from a **line** is two lines parallel to it, one either side. Always $2$ from the line $y = 1$: the lines $y = 1 + 2 = 3$ and $y = 1 - 2 = -1$. Always $3$ from the line $x = 1$: the lines $x = 4$ and $x = -2$.',
              ),
              prose('So three rules, three shapes: from a point, a circle; from two points, a straight line; from a line, a pair of parallel lines.'),
            ),
            ask('coord-locus-lines-tiles'),
            ask('coord-locus-name-flow'),
            ask('coord-locus-name-flow', 2),
          ],
          skillCheck: [ask('coord-locus-circle-tiles', 2), ask('coord-locus-bisector-steps', 2), ask('coord-locus-name-flow', 2)],
        },
        {
          id: 'cg-l6-locus-condition',
          title: 'Loci from a Condition',
          slides: [
            teach(
              prose(
                'A rule such as $PA = 2PB$ is squared first, so no square roots appear: $PA^2 = 4PB^2$. Multiply out, collect everything on one side, and divide by the number in front of $x^2$. For $A(-3, 0)$ and $B(3, 0)$:',
              ),
              maths(
                '\\begin{aligned} PA^2 &= (x + 3)^2 + y^2 \\\\ 4PB^2 &= 4\\left[(x - 3)^2 + y^2\\right] \\end{aligned}',
              ),
              prose('Multiplied out, $PA^2 = x^2 + y^2 + 6x + 9$ and $4PB^2 = 4x^2 + 4y^2 - 24x + 36$.'),
              prose('Take $PA^2$ from $4PB^2$ to get $3x^2 + 3y^2 - 30x + 27 = 0$, and divide by $3$:'),
              maths('x^2 + y^2 - 10x + 9 = 0'),
              prose('Equal numbers in front of $x^2$ and $y^2$, and no $xy$: that is a circle, multiplied out.'),
            ),
            ask('coord-locus-ratio-steps'),
            teach(
              prose(
                'An expanded circle gives up its centre and radius by completing the square, as in Midpoints, Distances and Circles: halve each coefficient for its bracket, and take its square away again. For $x^2 + y^2 - 10x + 9 = 0$:',
              ),
              maths('\\begin{aligned} (x - 5)^2 - 25 + y^2 + 9 &= 0 \\\\ (x - 5)^2 + y^2 &= 16 \\end{aligned}'),
              prose(
                'A circle with centre $(5, 0)$ and radius $4$. A $y$ term goes the same way: $+6y$ becomes $(y + 3)^2 - 9$. Check a point: $(9, 0)$ is on the circle, and it is $12$ from $A(-3, 0)$ and $6$ from $B(3, 0)$, so $PA = 2PB$ holds there.',
              ),
            ),
            ask('coord-locus-centre-tiles'),
            ask('coord-locus-ratio-r2'),
            ask('coord-locus-ratio-steps', 2),
            teach(
              prose(
                '$PA$ perpendicular to $PB$ makes the angle at $P$ a right angle, so by the angle in a semicircle $P$ is on the circle with **diameter** $AB$. Its centre is the midpoint of $AB$ and its radius half of $AB$.',
              ),
              grid(
                6,
                [segment(-1, -2, 3, 4)],
                [{ x: -1, y: -2 }, { x: 3, y: 4 }, { x: 1, y: 1 }],
                'The circle with diameter from A(-1, -2) to B(3, 4), centre (1, 1)',
                [{ h: 1, k: 1, r2: 13 }],
              ),
              prose(
                'For $A(-1, -2)$ and $B(3, 4)$ the centre is $(1, 1)$ and $r^2 = \\tfrac{1}{4} \\times 52 = 13$. Written straight from the rule, $(x + 1)(x - 3) + (y + 2)(y - 4) = 0$ multiplies out to $x^2 + y^2 - 2x - 2y - 11 = 0$, the same circle.',
              ),
            ),
            ask('coord-locus-diameter-flow'),
            ask('coord-locus-perp-choice'),
            ask('coord-locus-ratio-r2+choice', 2),
            ask('coord-locus-diameter-flow', 2),
          ],
          skillCheck: [ask('coord-locus-ratio-steps', 2), ask('coord-locus-diameter-flow', 2), ask('coord-locus-ratio-r2', 2)],
        },
      ],
      levelCheck: [
        ask('coord-tri-area', 2),
        ask('coord-apex-k', 2),
        ask('coord-apex-slider', 2),
        ask('coord-box-steps', 2),
        ask('coord-shoelace-tree', 2),
        ask('coord-box-area', 2),
        ask('coord-quad-split-tree', 2),
        ask('coord-para-area', 2),
        ask('coord-area-k-tiles', 2),
        ask('coord-locus-circle-tiles', 2),
        ask('coord-locus-bisector-steps', 2),
        ask('coord-locus-name-flow', 2),
        ask('coord-locus-ratio-steps', 2),
        ask('coord-locus-centre-tiles', 2),
        ask('coord-locus-diameter-flow', 2),
      ],
    },
  ],
};
