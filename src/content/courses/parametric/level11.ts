/**
 * Parametric & Implicit, level 11: Implicit Curves and their Sketches.
 *
 * Reading a curve's shape off its equation: symmetry, where it meets the
 * axes, where it can go, where its tangents are flat or vertical, and the
 * four standard curves recognised from those facts. Generators are in
 * `generators/implicitSketch.ts`.
 */
import type { Level } from '../../types';
import { curvesSvg, sketchGridSvg } from '../../generators/implicitSketch';
import { ask, askAfter, diagram, display, figure, prose, teach } from './blocks';

const DYDX = '\\frac{dy}{dx}';

/** x^2 + xy + y^2 = 3, traced: the ellipse turned through a half right angle. */
const tilted = (t: number): [number, number] => [
  Math.cos(t) + Math.sqrt(3) * Math.sin(t),
  Math.cos(t) - Math.sqrt(3) * Math.sin(t),
];

export const level11: Level = {
  id: 'pi-l11',
  title: 'Implicit Curves and their Sketches',
  lessons: [
    {
      id: 'pi-l11-symmetry',
      title: 'Symmetry',
      slides: [
        teach(
          prose(
            'A sketch starts with symmetry. A curve is **symmetric in the $x$-axis** when $(x, y)$ on it means $(x, -y)$ is on it too.',
          ),
          prose(
            'To test it, replace $y$ with $-y$. An even power keeps its sign, $(-y)^{2} = y^{2}$; an odd power changes it, $(-y)^{3} = -y^{3}$. If the equation comes out the same, the curve is symmetric in the $x$-axis.',
          ),
          display('x^{2} + y^{2} - 4x = 5'),
          prose('Only $y^{2}$ appears, so replacing $y$ with $-y$ changes nothing: it is symmetric in the $x$-axis.'),
          prose('Replacing $x$ with $-x$ tests the $y$-axis. Here it gives'),
          display('x^{2} + y^{2} + 4x = 5'),
          prose(
            'which is a different equation, so there is no symmetry in the $y$-axis. If both tests leave the equation the same, the curve is symmetric in both axes; if neither does, in neither.',
          ),
          figure((t) => [2 + 3 * Math.cos(t), 3 * Math.sin(t)], {
            span: 6,
            tMin: 0,
            tMax: 2 * Math.PI,
            marks: [[2, 0]],
            label: 'A circle of radius 3 centred at (2, 0): symmetric in the x-axis but not the y-axis',
          }),
        ),
        ask('isk-symmetry'),
        askAfter(
          [
            prose('Take each term in turn. For'),
            display('y^{3} + xy = 4'),
            prose('replacing $y$ with $-y$ turns both terms over:'),
            display('-y^{3} - xy = 4'),
            prose('That is a different equation, so this curve is not symmetric in the $x$-axis.'),
          ],
          'isk-symmetry-flow',
        ),
        ask('isk-symmetry', 2),
        teach(
          prose(
            'Replacing **both** $x$ with $-x$ and $y$ with $-y$ tests a half-turn about the origin: $(x, y)$ on the curve means $(-x, -y)$ is too.',
          ),
          display('x^{2} + xy + y^{2} = 3'),
          prose(
            'Neither single test works, since $xy$ changes sign each time. Together, $(-x)(-y) = xy$, so the equation is unchanged.',
          ),
          figure(tilted, {
            span: 3,
            tMin: 0,
            tMax: 2 * Math.PI,
            marks: [
              [1, 1],
              [-1, -1],
            ],
            label: 'The tilted oval x squared plus xy plus y squared equals 3, with the points (1, 1) and (-1, -1) marked',
          }),
          prose(
            'So $(1, 1)$ on it means $(-1, -1)$ is on it too. In the same way, symmetry in the $x$-axis sends $(p, q)$ to $(p, -q)$, and symmetry in the $y$-axis sends it to $(-p, q)$.',
          ),
        ),
        ask('isk-mirror-point'),
        ask('isk-symmetry-flow', 2),
        teach(
          prose('A mirrored point can be checked by putting it in. The curve'),
          display('x^{3} + y^{2} = 12'),
          prose('passes through $(2, 2)$:'),
          display('8 + 4 = 12'),
          prose('Only $y^{2}$ appears, so it is symmetric in the $x$-axis, and $(2, -2)$ is on it too: it gives $8 + 4$ again.'),
          prose('But $(-2, 2)$ is not: it gives $-8 + 4$, which is $-4$. The $x^{3}$ rules out the $y$-axis.'),
        ),
        ask('isk-mirror-point+choice', 2),
      ],
      skillCheck: [ask('isk-symmetry', 2), ask('isk-symmetry-flow', 2), ask('isk-mirror-point', 2)],
    },
    {
      id: 'pi-l11-intercepts',
      title: 'Meeting the Axes',
      slides: [
        teach(
          prose(
            'On the $x$-axis, $y = 0$. Put $y = 0$ into the equation: every term with a $y$ in it vanishes, $xy$ included, and a quadratic in $x$ is left.',
          ),
          display('x^{2} + xy + y^{2} - 2x + 2y = 8'),
          prose('Put $y = 0$:'),
          display('x^{2} - 2x - 8 = 0'),
          display('(x - 4)(x + 2) = 0'),
          prose('So it meets the $x$-axis at $x = 4$ and $x = -2$. Put $x = 0$ for the $y$-axis:'),
          display('y^{2} + 2y - 8 = 0'),
          display('(y + 4)(y - 2) = 0'),
          prose('It meets the $y$-axis at $y = 2$ and $y = -4$.'),
          figure((t) => [2 + 2 * Math.cos(t) + 2 * Math.sqrt(3) * Math.sin(t), -2 + 2 * Math.cos(t) - 2 * Math.sqrt(3) * Math.sin(t)], {
            span: 7,
            tMin: 0,
            tMax: 2 * Math.PI,
            marks: [
              [4, 0],
              [-2, 0],
              [0, 2],
              [0, -4],
            ],
            label: 'A tilted oval crossing the x-axis at 4 and -2 and the y-axis at 2 and -4',
          }),
        ),
        ask('isk-intercepts'),
        ask('isk-meet-flow'),
        ask('isk-intercepts+choice', 2),
        teach(
          prose(
            'The quadratic left on an axis can have two roots, one repeated root or none. The discriminant $b^{2} - 4ac$ says which: positive, the curve crosses that axis twice; zero, it touches it once; negative, it never meets it.',
          ),
          display('x^{2} + y^{2} - 6x = -5'),
          prose('Put $x = 0$:'),
          display('y^{2} + 5 = 0'),
          display('b^{2} - 4ac = 0 - 4 \\times 1 \\times 5 = -20'),
          prose('Negative, so it never meets the $y$-axis. With $y = 0$ instead,'),
          display('x^{2} - 6x + 5 = 0'),
          prose('gives $x = 1$ and $x = 5$.'),
          figure((t) => [3 + 2 * Math.cos(t), 2 * Math.sin(t)], {
            span: 6,
            tMin: 0,
            tMax: 2 * Math.PI,
            marks: [
              [1, 0],
              [5, 0],
            ],
            label: 'A circle crossing the x-axis at 1 and 5 and never reaching the y-axis',
          }),
        ),
        ask('isk-axis-count'),
        ask('isk-meet-flow', 2),
        teach(
          prose('Move everything to one side before working out the discriminant. On'),
          display('x^{2} + xy + y^{2} + 4y = -4'),
          prose('putting $x = 0$ gives'),
          display('y^{2} + 4y + 4 = 0'),
          display('b^{2} - 4ac = 16 - 16 = 0'),
          prose('Zero: it touches the $y$-axis once, at $y = -2$. Using $c = -4$ instead of $4$ would have given $32$, and two crossings that are not there.'),
        ),
        ask('isk-axis-count', 2),
      ],
      skillCheck: [ask('isk-intercepts', 2), ask('isk-meet-flow', 2), ask('isk-axis-count', 2)],
    },
    {
      id: 'pi-l11-extent',
      title: 'Where the Curve Can Go',
      slides: [
        teach(
          prose('A square is never negative. That fences a curve in.'),
          display('x^{2} + 4y^{2} = 36'),
          prose('$4y^{2} \\ge 0$, so $x^{2}$ can be at most $36$:'),
          display('x^{2} \\le 36'),
          display('-6 \\le x \\le 6'),
          prose('In the same way $x^{2} \\ge 0$ leaves $4y^{2} \\le 36$, so $y^{2} \\le 9$ and $-3 \\le y \\le 3$.'),
          diagram(
            curvesSvg([{ f: (t) => [6 * Math.cos(t), 3 * Math.sin(t)], tMin: 0, tMax: 2 * Math.PI }], {
              span: 7,
              marks: [
                { x: 6, y: 0, text: '6' },
                { x: -6, y: 0, text: '−6' },
                { x: 0, y: 3, text: '3' },
                { x: 0, y: -3, text: '−3' },
              ],
              label: 'The ellipse x squared plus 4 y squared equals 36, reaching 6 either side and 3 up and down',
            }),
          ),
        ),
        ask('isk-bounds'),
        askAfter(
          [
            prose('On'),
            display('y^{2} = 12 - 3x'),
            prose('the left side is never negative, so neither is the right:'),
            display('12 - 3x \\ge 0'),
            display('x \\le 4'),
            prose('The largest $x$ is $4$, where $y = 0$. On'),
            display('y^{2} = 3x - 12'),
            prose('the same step gives $x \\ge 4$, the smallest $x$.'),
          ],
          'isk-furthest',
        ),
        ask('isk-bounds+choice', 2),
        teach(
          prose('When the right-hand side is a product, find where it is negative. On'),
          display('y^{2} = x(x - 3)'),
          prose(
            'it is zero at $x = 0$ and $x = 3$. Between them $x > 0$ and $x - 3 < 0$, so the product is negative and there are no points.',
          ),
          prose('Outside them both factors have the same sign, so the curve lives in'),
          display('x \\le 0 \\quad \\text{or} \\quad x \\ge 3'),
          diagram(
            curvesSvg(
              [
                { f: (u) => [1.5 + 1.5 * Math.cosh(u), 1.5 * Math.sinh(u)], tMin: -1.76, tMax: 1.76 },
                { f: (u) => [1.5 - 1.5 * Math.cosh(u), 1.5 * Math.sinh(u)], tMin: -2.09, tMax: 2.09 },
              ],
              {
                span: 6,
                marks: [{ x: 0, y: 0 }, { x: 3, y: 0, text: '3' }],
                label: 'The curve y squared equals x times (x minus 3): two branches, with a gap between x = 0 and x = 3',
              },
            ),
          ),
          prose('On a number line, shade out from $0$ to the left and from $3$ to the right, with filled dots: $y = 0$ puts both ends on the curve.'),
        ),
        ask('isk-gap-line'),
        ask('isk-furthest', 2),
        teach(
          prose('A factor written the other way round turns this over. On'),
          display('y^{2} = (x + 1)(3 - x)'),
          prose(
            'both brackets are positive between $-1$ and $3$, and one is negative outside, so the curve lives in',
          ),
          display('-1 \\le x \\le 3'),
          figure((t) => [1 + 2 * Math.cos(t), 2 * Math.sin(t)], {
            span: 4,
            tMin: 0,
            tMax: 2 * Math.PI,
            marks: [
              [-1, 0],
              [3, 0],
            ],
            label: 'A closed curve running from x = -1 to x = 3',
          }),
          prose('A closed curve: shade between the two dots.'),
        ),
        ask('isk-gap-line', 2),
      ],
      skillCheck: [ask('isk-bounds', 2), ask('isk-furthest', 2), ask('isk-gap-line', 2)],
    },
    {
      id: 'pi-l11-flat',
      title: 'Flat and Vertical Tangents',
      slides: [
        teach(
          prose('Differentiating implicitly, as in Implicit Differentiation, works for any curve'),
          display('px^{2} + qxy + ry^{2} = c'),
          prose('and gives'),
          display(DYDX + ' = -\\frac{2px + qy}{qx + 2ry}'),
          prose(
            'The tangent is **horizontal** where the top is zero and **vertical** where the bottom is zero. Each of those is a straight line through the origin.',
          ),
          prose('On'),
          display('x^{2} + xy + y^{2} = 3'),
          prose('$p$, $q$ and $r$ are all $1$, so'),
          display(DYDX + ' = -\\frac{2x + y}{x + 2y}'),
          prose('Horizontal where the top is zero,'),
          display('2x + y = 0'),
          prose('which is the line $y = -2x$.'),
        ),
        ask('isk-flat-line'),
        askAfter(
          [
            prose('To find the points, put $y = -2x$ into the curve:'),
            display('x^{2} + x(-2x) + (-2x)^{2} = 3'),
            display('x^{2} - 2x^{2} + 4x^{2} = 3'),
            display('3x^{2} = 3 \\qquad x = \\pm 1'),
            prose('Then $y = -2x$ gives the points $(1, -2)$ and $(-1, 2)$.'),
          ],
          'isk-sub-tree',
        ),
        ask('isk-flat-points'),
        teach(
          prose('Vertical tangents come from the bottom. On'),
          display('x^{2} + xy + y^{2} = 3'),
          prose('the bottom, $x + 2y$, is zero on the line $x = -2y$. Write it as $x = \\ldots$ and put it in for $x$:'),
          display('(-2y)^{2} + (-2y)y + y^{2} = 3'),
          display('4y^{2} - 2y^{2} + y^{2} = 3'),
          display('3y^{2} = 3 \\qquad y = \\pm 1'),
          prose('So the vertical tangents touch at $(-2, 1)$ and $(2, -1)$.'),
          figure(tilted, {
            span: 3,
            tMin: 0,
            tMax: 2 * Math.PI,
            marks: [
              [1, -2],
              [-1, 2],
              [-2, 1],
              [2, -1],
            ],
            label: 'The tilted oval x squared plus xy plus y squared equals 3, with its two highest and lowest points and its two furthest left and right points marked',
          }),
        ),
        ask('isk-flat-line+choice', 2),
        ask('isk-sub-tree', 2),
        teach(
          prose(
            'Check the other part of the fraction is not zero at the point as well, or the gradient is not defined there at all. At $(1, -2)$ the bottom is $1 - 4$, which is $-3$, so the tangent there really is horizontal.',
          ),
        ),
        ask('isk-flat-points', 2),
      ],
      skillCheck: [ask('isk-flat-line', 2), ask('isk-sub-tree', 2), ask('isk-flat-points', 2)],
    },
    {
      id: 'pi-l11-match',
      title: 'Putting a Sketch Together',
      slides: [
        teach(
          prose('Four curves come up again and again. Each is known by its symmetry, where it meets the axes, and where it can go.'),
          diagram(
            sketchGridSvg([
              { shape: 'circle', r: 3 },
              { shape: 'ellipse', a: 4, b: 2 },
              { shape: 'hyperbola', a: 2, b: 3 },
              { shape: 'parabola', k: 4, axis: 'x' },
            ]),
          ),
          prose('A is a **circle**:'),
          display('x^{2} + y^{2} = 9'),
          prose('symmetric in both axes, meeting each axis at $\\pm 3$.'),
          prose('B is an **ellipse**:'),
          display('\\frac{x^{2}}{16} + \\frac{y^{2}}{4} = 1'),
          prose('$y = 0$ gives $x = \\pm 4$ and $x = 0$ gives $y = \\pm 2$, so it is wider than it is tall.'),
          prose('C is a **hyperbola**:'),
          display('\\frac{x^{2}}{4} - \\frac{y^{2}}{9} = 1'),
          prose(
            'it meets the $x$-axis at $\\pm 2$ and never the $y$-axis, and $x^{2} \\ge 4$, so it comes in two branches.',
          ),
          prose('D is a **parabola**:'),
          display('y^{2} = 4x'),
          prose('symmetric in the $x$-axis only, through the origin, and $x \\ge 0$, so it opens to the right.'),
        ),
        ask('isk-match'),
        ask('isk-sketch-flow'),
        ask('isk-match-sketch'),
        teach(
          prose('Two curves of the same kind are told apart by their crossings.'),
          display('\\frac{x^{2}}{9} + \\frac{y^{2}}{25} = 1'),
          prose(
            'meets the axes at $x = \\pm 3$ and $y = \\pm 5$: taller than it is wide. Swapping the $9$ and the $25$ gives the wider one.',
          ),
          prose('Written without fractions it is'),
          display('25x^{2} + 9y^{2} = 225'),
          prose('and the bounds come out the same way. $9y^{2} \\ge 0$, so'),
          display('25x^{2} \\le 225'),
          display('x^{2} \\le 9 \\qquad -3 \\le x \\le 3'),
          prose('A parabola is told apart by which way it opens: $y^{2} = -4x$ needs $x \\le 0$, so it opens to the left, and $x^{2} = 4y$ needs $y \\ge 0$, so it opens upwards.'),
        ),
        ask('isk-match', 2),
        ask('isk-bounds', 2),
        ask('isk-sketch-flow', 2),
        teach(
          prose('For a hyperbola only the number under $x^{2}$ shows on the axis. These two meet it at $\\pm 3$ and $\\pm 2$:'),
          display('\\frac{x^{2}}{9} - \\frac{y^{2}}{4} = 1 \\qquad \\frac{x^{2}}{4} - \\frac{y^{2}}{9} = 1'),
        ),
        ask('isk-match-sketch', 2),
      ],
      skillCheck: [ask('isk-match', 2), ask('isk-sketch-flow', 2), ask('isk-match-sketch', 2)],
    },
  ],
  levelCheck: [
    ask('isk-symmetry', 2),
    ask('isk-intercepts', 2),
    ask('isk-bounds', 2),
    ask('isk-flat-line', 2),
    ask('isk-match', 2),
    ask('isk-mirror-point', 2),
    ask('isk-meet-flow', 2),
    ask('isk-gap-line', 2),
    ask('isk-sub-tree', 2),
    ask('isk-sketch-flow', 2),
    ask('isk-symmetry-flow', 2),
    ask('isk-axis-count', 2),
    ask('isk-furthest', 2),
    ask('isk-flat-points', 2),
    ask('isk-match-sketch', 2),
  ],
};
