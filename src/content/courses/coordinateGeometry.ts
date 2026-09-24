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
 * bisectors, chords and tangents together, and choosing between them.
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
            ask('coord-missing-coordinate'),
            teach(
              prose(
                'The same formula runs backwards. If $A(1, 3)$ and $B(4, k)$ are on a line of gradient $2$, write the gradient with $k$ in it and solve:',
              ),
              maths('\\begin{aligned} \\frac{k - 3}{4 - 1} &= 2 \\\\ k - 3 &= 6 \\\\ k &= 9 \\end{aligned}'),
              prose('With a fractional gradient the unknown may be on the bottom. Multiply up first, then solve as usual.'),
            ),
            ask('coord-gradient-slider', 2),
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
            ask('coord-form-flow'),
            teach(
              prose('A line with gradient $m$ through $(x_1, y_1)$ can be written straight down in **point-gradient form**:'),
              maths('y - y_1 = m(x - x_1)'),
              prose('Gradient $2$ through $(4, 3)$ is $y - 3 = 2(x - 4)$. Multiply out and add $3$ to get $y = mx + c$:'),
              maths('\\begin{aligned} y - 3 &= 2x - 8 \\\\ y &= 2x - 5 \\end{aligned}'),
            ),
            ask('coord-point-gradient-steps'),
            ask('coord-intercept+choice'),
            ask('coord-line-tiles', 2),
            teach(
              prose('Which way in depends on what you are told:'),
              prose(
                'The gradient and where it crosses the $y$-axis: write $y = mx + c$ at once. The gradient and some other point: point-gradient form. Two points: find the gradient from them first, then use either point.',
              ),
              prose('One point on its own is not enough, since lines of every gradient pass through it.'),
            ),
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
            ),
            ask('coord-general-tiles'),
            ask('coord-on-line'),
            ask('coord-general-gradient'),
            teach(
              prose(
                'The general form hides the gradient. To see it, get $y$ on its own: keep the $y$ term on one side, move the rest across, then divide.',
              ),
              maths('\\begin{aligned} 4x + 2y - 6 &= 0 \\\\ 2y &= -4x + 6 \\\\ y &= -2x + 3 \\end{aligned}'),
              prose('In general the gradient of $ax + by + c = 0$ is $-\\frac{a}{b}$.'),
            ),
            ask('coord-make-y-steps'),
            ask('coord-general-gradient+choice'),
            ask('coord-general-tiles', 2),
            teach(
              prose(
                'A point lies on a line when its coordinates make the equation true. Is $(3, 1)$ on $2x - 5y = 1$? $2 \\times 3 - 5 \\times 1 = 1$: yes.',
              ),
              prose('This works in any form, and it is the quickest check of an equation you have just found: the points you built it from must fit.'),
            ),
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
            ),
            ask('coord-perp-through-tree'),
            ask('coord-perp-gradient+choice'),
            ask('coord-relation-flow', 2),
            teach(
              prose(
                'A line through $(2, 1)$ perpendicular to $y = 2x + 5$: the gradient is $-\\frac{1}{2}$, and then $c$ comes from the point, just as before.',
              ),
              maths('\\begin{aligned} 1 &= -\\tfrac{1}{2} \\times 2 + c \\\\ c &= 2 \\end{aligned}'),
              prose('So the line is $y = -\\frac{1}{2}x + 2$.'),
            ),
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
            ask('coord-endpoint'),
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
              prose('Every point on it is the same distance from $A$ as from $B$.'),
            ),
            ask('coord-bisector-flow'),
            ask('coord-bisector-gradient-steps'),
            ask('coord-bisector-tiles'),
            teach(
              prose('For $A(-3, -2)$ and $B(1, 2)$, the recipe is three steps:'),
              maths('\\begin{aligned} M &= (-1, 0) \\\\ m_{AB} &= \\tfrac{4}{4} = 1, \\quad m = -1 \\\\ 0 &= -1 \\times (-1) + c, \\quad c = -1 \\end{aligned}'),
              prose('So the bisector is $y = -x - 1$.'),
            ),
            ask('coord-equidistant'),
            ask('coord-bisector-tiles', 2),
            ask('coord-bisector-flow', 2),
            teach(
              prose(
                'A point the same distance from $A$ and $B$ satisfies $PA^2 = PB^2$. Squared distances avoid square roots, and when you multiply out, the squared terms cancel and a linear equation is left.',
              ),
              prose('That is why the answer lies on the perpendicular bisector: it is where the bisector meets whatever line $P$ is on.'),
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
            ),
            ask('coord-circle-tiles'),
            ask('coord-centre'),
            ask('coord-radius-squared'),
            teach(
              prose(
                'Reading an equation back, the signs in the brackets are the **opposite** of the centre\'s: $(x + 4)^2$ is $(x - (-4))^2$, so $a = -4$.',
              ),
              prose('The right-hand side is $r^2$, not $r$: $(x + 4)^2 + y^2 = 16$ has radius $4$.'),
              prose('A point is on the circle exactly when putting it into the left-hand side gives $r^2$.'),
            ),
            ask('coord-on-circle-tree'),
            ask('coord-centre', 2),
            ask('coord-circle-tiles', 2),
            teach(
              prose(
                'Often the radius is not given but a point is. The radius is the distance from the centre to that point, and only its square is needed.',
              ),
              prose('If the two ends of a **diameter** are given, the centre is their midpoint, and the radius runs from there to either end.'),
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
              prose('This only works once $x^2$ and $y^2$ stand alone: divide through first if every term is doubled.'),
            ),
            ask('coord-inside-flow'),
            ask('coord-expanded-radius+choice'),
            ask('coord-expanded-tiles', 2),
            teach(
              prose(
                'To tell whether a point is inside, on or outside a circle, compare its squared distance from the centre with $r^2$: less is inside, equal is on, more is outside.',
              ),
              prose('Squares keep the numbers whole, and comparing squares gives the same answer as comparing the distances.'),
            ),
            ask('coord-inside-flow', 2),
            ask('coord-complete-steps', 2),
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
            ),
            ask('coord-tangent-gradient'),
            ask('coord-tangent-tiles'),
            ask('coord-tangent-slider'),
            teach(
              prose(
                'A **chord** joins two points on a circle. The perpendicular from the centre to a chord cuts it in half, so the radius, half the chord and the distance from the centre make a right-angled triangle.',
              ),
              maths('r^2 = \\left(\\tfrac{1}{2}\\text{chord}\\right)^2 + d^2'),
              prose('A radius-$5$ circle with a chord $3$ from the centre: half the chord is $4$, so the chord is $8$.'),
            ),
            ask('coord-chord'),
            ask('coord-tangent-gradient+choice'),
            ask('coord-tangent-tiles', 2),
            teach(
              prose(
                'When the centre is not the origin, take the radius from the centre to the point, not from the origin. Differentiation finds tangents to other curves; for a circle the right angle is all you need.',
              ),
              prose('The line from the centre through the midpoint of a chord is the chord\'s perpendicular bisector, so it always passes through the centre.'),
            ),
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
            ask('coord-meet-circle-x'),
            teach(
              prose(
                'With the centre away from the origin, both brackets carry a number. Into $(x - a)^2 + (y - b)^2 = r^2$ the line puts $mx + c - b$ in the second bracket:',
              ),
              maths('\\begin{aligned} &(x - a)^2 + (mx + c - b)^2 \\\\ &\\quad = r^2 \\end{aligned}'),
              prose('For $y = 2x - 1$ and $(x - 1)^2 + (y - 2)^2 = 5$ the second bracket is $(2x - 3)^2$. The rest is the same: multiply out, collect, divide through.'),
            ),
            ask('coord-substitute-steps', 2),
            ask('coord-meet-quadratic-tiles', 2),
            ask('coord-meet-circle-x+choice', 2),
            teach(
              prose(
                'Solving the quadratic, as in Quadratics, gives the $x$-coordinates: $x^2 + x - 12 = 0$ factorises. Put each back into the **line** for its $y$, not into the circle, which gives two values of $y$ for most $x$ and only one of them is on the line.',
              ),
              maths('(x + 4)(x - 3) = 0'),
              prose('So $x = -4$ gives $y = -3$ and $x = 3$ gives $y = 4$: the line meets the circle at $(-4, -3)$ and $(3, 4)$.'),
            ),
            ask('coord-root-point-tree'),
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
            ),
            ask('coord-meet-count-flow'),
            ask('coord-meet-discriminant'),
            ask('coord-which-line'),
            teach(
              prose('Does $y = 2x + 5$ meet $x^2 + y^2 = 5$? Substitute and collect:'),
              maths('\\begin{aligned} x^2 + (2x + 5)^2 &= 5 \\\\ 5x^2 + 20x + 20 &= 0 \\end{aligned}'),
              prose(
                'Here $b^2 - 4ac = 400 - 400 = 0$, so the line touches. A repeated root is $x = -\\frac{b}{2a} = -2$, and the line gives $y = 1$: they touch at $(-2, 1)$.',
              ),
            ),
            ask('coord-touch-point-slider'),
            ask('coord-meet-count-flow', 2),
            ask('coord-meet-discriminant+choice', 2),
            teach(
              prose(
                'Only the sign matters. Dividing through by a positive number shrinks the discriminant but never changes its sign, so the quadratic can be tidied first if that is easier.',
              ),
              prose('When a question asks for the discriminant itself, give it for the quadratic before dividing, the one that starts $(1 + m^2)x^2$.'),
            ),
            ask('coord-which-line', 2),
            ask('coord-touch-point-slider', 2),
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
              prose('and in $b^2 - 4ac = 0$ the $c^2$ terms nearly cancel, leaving the **tangent condition**:'),
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
              prose('Solve for $k$, then $c = k + b - ma$. At the origin $k$ is just $c$.'),
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
                'The radius to the point of contact $T$ meets the tangent at a right angle, so $C$, $T$ and $P$ make a right-angled triangle with $CP$ as its hypotenuse: $PT^2 = CP^2 - r^2$.',
              ),
            ),
            ask('coord-outside-count'),
            ask('coord-tangent-length'),
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
            ask('coord-outside-count', 2),
            teach(
              prose(
                'With the centre at $C(a, b)$, measure $P$ from the centre as well: if $P$ is $X$ across and $Y$ up from $C$, a line through it is $k = Y - mX$ above the centre, and the condition is $k^2 = r^2(1 + m^2)$ as before.',
              ),
              prose('If the circle comes multiplied out, complete the square first, as in level 2, to find $C$ and $r^2$.'),
            ),
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
                'The perpendicular from the centre to a chord meets it at its midpoint $M$, as in level 2. So the radius, half the chord and $CM$ make a right-angled triangle:',
              ),
              maths('\\left(\\tfrac{1}{2}AB\\right)^2 = r^2 - CM^2'),
              grid(6, [segment(-4, 3, 4, 3)], [{ x: -4, y: 3 }, { x: 4, y: 3 }, { x: 0, y: 3 }, { x: 0, y: 0, hollow: true }], 'The circle x^2 + y^2 = 25 with a chord from (-4, 3) to (4, 3) and its midpoint (0, 3)', [{ h: 0, k: 0, r2: 25 }]),
              prose('In $x^2 + y^2 = 25$ the chord with midpoint $(0, 3)$ has $CM^2 = 9$, so half of it is $\\sqrt{16} = 4$ and the chord is $8$.'),
            ),
            ask('coord-chord-half-tree'),
            ask('coord-chord-radius'),
            teach(
              prose(
                'When a line cuts the chord off, its midpoint comes straight from the quadratic. The roots of $x^2 + px + q = 0$ add to $-p$, so the midpoint\'s $x$ is half of $-p$, and the line gives its $y$.',
              ),
              prose('$y = -x + 4$ into $x^2 + y^2 = 10$ gives $2x^2 - 8x + 6 = 0$, that is $x^2 - 4x + 3 = 0$:'),
              maths('\\begin{aligned} x_M &= \\frac{4}{2} = 2 \\\\ y_M &= -2 + 4 = 2 \\end{aligned}'),
            ),
            ask('coord-chord-midpoint-steps'),
            ask('coord-chord-slider'),
            ask('coord-chord-radius+choice', 2),
            teach(
              prose(
                'A check on a midpoint: the line from the centre to $M$ is perpendicular to the chord, so its gradient is $-\\frac{1}{m}$. From $(0, 0)$ to $(2, 2)$ is gradient $1$, and the chord\'s is $-1$.',
              ),
              prose('It is also a second way in: $M$ is where that perpendicular meets the chord, two lines meeting as in level 1.'),
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
              prose('On axes a right angle is two gradients that multiply to $-1$, as in level 1. With $A(-5, 0)$, $B(5, 0)$ and $P(3, 4)$:'),
              maths('\\begin{aligned} m_{AP} &= \\frac{4}{8} = \\frac{1}{2} \\\\ m_{BP} &= \\frac{4}{-2} = -2 \\end{aligned}'),
              prose('and $\\frac{1}{2} \\times (-2) = -1$.'),
            ),
            ask('coord-semicircle-tree'),
            ask('coord-right-angle-point'),
            ask('coord-semicircle-tree', 2),
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
            ask('coord-three-points-r2'),
            ask('coord-three-bisector-steps', 2),
            teach(
              prose('Where the bisectors cross, both equations hold at once:'),
              maths('\\begin{aligned} -2x + 3 &= x \\\\ x &= 1, \\quad y = 1 \\end{aligned}'),
              prose(
                'So the centre is $C(1, 1)$, and $r^2 = CP^2 = 3^2 + 1^2 = 10$. The circle is $(x - 1)^2 + (y - 1)^2 = 10$. Measuring to $Q$ or $R$ instead gives $10$ too, which is a check.',
              ),
            ),
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
            ask('coord-chord-fact-flow', 2),
            teach(
              prose(
                'Run it the other way to find a chord from its midpoint: the chord is the line through $M$ perpendicular to $CM$.',
              ),
              prose('In $x^2 + y^2 = 25$ the chord with midpoint $M(3, -1)$: $CM$ has gradient $-\\frac{1}{3}$, so the chord has gradient $3$.'),
              maths('\\begin{aligned} -1 &= 3 \\times 3 + c \\\\ c &= -10 \\end{aligned}'),
              prose('So the chord is $y = 3x - 10$.'),
            ),
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
            ask('coord-which-theorem', 2),
            ask('coord-other-end-steps', 2),
            teach(
              prose(
                'When the circle comes multiplied out, complete the square first, as in level 2, to find the centre and $r^2$. After that every fact works as before.',
              ),
              prose('$x^2 + y^2 - 2x - 2y - 8 = 0$ is $(x - 1)^2 + (y - 1)^2 = 10$: the same circle as above.'),
            ),
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
  ],
};
