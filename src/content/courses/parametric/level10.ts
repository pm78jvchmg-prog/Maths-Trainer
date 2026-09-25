/**
 * Parametric & Implicit, level 10: Parametrising a Curve.
 *
 * Cartesian to parametric, the reverse of Parametric Curves: a graph as
 * x = t, a line from two points, circles and ellipses with cos t and sin t,
 * the parabola y^2 = 4ax, and checking a proposed parametrisation by
 * substituting it back. Generators in `generators/paramBuild.ts`.
 */
import type { Level } from '../../types';
import { ask, askAfter, display, figure, prose, stacked, teach } from './blocks';

export const level10: Level = {
  id: 'pi-l10',
  title: 'Parametrising a Curve',
  lessons: [
    {
      id: 'pi-l10-graph',
      title: 'Graphs as Parametric Curves',
      slides: [
        teach(
          prose(
            'In Parametric Curves you started from $x$ and $y$ in terms of $t$ and removed $t$. This level goes the other way: from one equation in $x$ and $y$ to a pair of equations in $t$ that trace it. That is called **parametrising** the curve.',
          ),
          prose('Any graph $y = f(x)$ can be parametrised by letting $x = t$. Then $y = f(t)$. For'),
          display('y = x^{2} - 4x'),
          display('x = t \\qquad y = t^{2} - 4t'),
          prose('Other choices of $x$ work too. With $x = t + 2$, replace every $x$ with $(t + 2)$ and expand:'),
          stacked('y = (t + 2)^{2} - 4(t + 2)', 'y = t^{2} + 4t + 4 - 4t - 8', 'y = t^{2} - 4'),
          figure((t) => [t + 2, t * t - 4], {
            span: 6,
            tMin: -2.4,
            tMax: 2.4,
            marks: [
              [0, 0],
              [2, -4],
              [4, 0],
            ],
            label: 'The parabola y = x squared minus 4x, with the points for t = -2, 0 and 2 marked',
          }),
          prose(
            'Each $t$ gives one point: $t = 0$ gives $(2, -4)$. To find the $t$ of a point, solve the $x$ equation: for $(5, 5)$, $t + 2 = 5$ gives $t = 3$.',
          ),
        ),
        ask('ppar-graph'),
        ask('ppar-graph-tiles'),
        ask('ppar-graph-t'),
        teach(
          prose(
            'One curve has many parametrisations. $x = t$, $x = t + 2$ and $x = 2t$ all trace $y = x^{2} - 4x$. With $x = 2t$, replace $x$ with $(2t)$:',
          ),
          stacked('y = (2t)^{2} - 4(2t)', 'y = 4t^{2} - 8t'),
          prose(
            'They reach the same points at different values of $t$. The point $(6, 12)$ comes at $t = 6$ with $x = t$, at $t = 4$ with $x = t + 2$, and at $t = 3$ with $x = 2t$.',
          ),
          prose('With $x = 2t + 1$, the point where $x = 7$ has'),
          display('2t + 1 = 7, \\quad t = 3'),
        ),
        ask('ppar-graph-t+choice', 2),
        teach(
          prose('A number in front of $x^{2}$ multiplies the whole square. For $y = 2x^{2} + x - 3$ with $x = t - 1$:'),
          stacked('y = 2(t - 1)^{2} + (t - 1) - 3', 'y = 2t^{2} - 4t + 2 + t - 1 - 3', 'y = 2t^{2} - 3t - 2'),
        ),
        ask('ppar-graph+choice', 2),
        ask('ppar-graph-tiles', 2),
      ],
      skillCheck: [ask('ppar-graph', 2), ask('ppar-graph-tiles', 2), ask('ppar-graph-t', 2)],
    },
    {
      id: 'pi-l10-line',
      title: 'Lines through Two Points',
      slides: [
        teach(
          prose('A straight line can be traced from one point to another. Through $A(x_1, y_1)$ and $B(x_2, y_2)$:'),
          display('x = x_1 + (x_2 - x_1)t \\qquad y = y_1 + (y_2 - y_1)t'),
          prose(
            'At $t = 0$ the $t$ terms vanish and you are at $A$. At $t = 1$ you have added the whole step from $A$ to $B$, so you are at $B$.',
          ),
          prose('For $A(1, 2)$ and $B(4, -3)$ the steps are $4 - 1 = 3$ and $-3 - 2 = -5$:'),
          display('x = 1 + 3t \\qquad y = 2 - 5t'),
          figure((t) => [1 + 3 * t, 2 - 5 * t], {
            span: 6,
            tMin: -0.35,
            tMax: 1.35,
            marks: [
              [1, 2],
              [4, -3],
            ],
            label: 'The line through A(1, 2) and B(4, -3), with both points marked',
          }),
          prose(
            'Reading it back: the numbers on their own give $A(1, 2)$, and adding the numbers in front of $t$ gives $B(1 + 3, 2 - 5)$, which is $B(4, -3)$.',
          ),
        ),
        ask('ppar-line-tiles'),
        ask('ppar-line-ends'),
        ask('ppar-line-tiles+choice', 2),
        teach(
          prose('Other values of $t$ give other points of the line. On $x = 1 + 3t$, $y = 2 - 5t$, at $t = 2$:'),
          display('x = 1 + 3(2) = 7 \\qquad y = 2 - 5(2) = -8'),
          prose(
            'Between $t = 0$ and $t = 1$ the point is between $A$ and $B$, and $t = \\frac{1}{2}$ is the midpoint. Above $1$ it is beyond $B$; below $0$ it is before $A$, on the far side from $B$.',
          ),
          prose('From $A(2, 1)$ to $B(6, -3)$, $x = 2 + 4t$ and $y = 1 - 4t$, so $t = \\frac{1}{2}$ gives the midpoint:'),
          display('x = 2 + 4(\\tfrac{1}{2}) = 4 \\qquad y = 1 - 4(\\tfrac{1}{2}) = -1'),
          prose(
            'Going backwards, solve the $x$ equation for $t$. On $x = 1 + 3t$, $y = 2 - 5t$, the point $P(-5, 12)$ has $1 + 3t = -5$, so $t = -2$, and $y = 2 - 5(-2) = 12$ checks. $t$ is negative, so $P$ is before $A$.',
          ),
        ),
        ask('ppar-line-point'),
        ask('ppar-line-where-flow'),
        ask('ppar-line-point', 2),
        ask('ppar-line-where-flow', 2),
      ],
      skillCheck: [ask('ppar-line-tiles', 2), ask('ppar-line-point', 2), ask('ppar-line-where-flow', 2)],
    },
    {
      id: 'pi-l10-circle',
      title: 'Circles',
      slides: [
        teach(
          prose('A circle with centre $(a, b)$ and radius $r$ has equation'),
          display('(x - a)^{2} + (y - b)^{2} = r^{2}'),
          prose('and is traced by'),
          display('x = a + r\\cos t \\qquad y = b + r\\sin t'),
          prose('To check, substitute: $x - a = r\\cos t$ and $y - b = r\\sin t$, so'),
          display('(x - a)^{2} + (y - b)^{2} = r^{2}\\cos^{2} t + r^{2}\\sin^{2} t'),
          prose('which is $r^{2}$, since $\\cos^{2} t + \\sin^{2} t = 1$.'),
          prose(
            'For $(x - 2)^{2} + (y + 1)^{2} = 9$: the centre is $(2, -1)$, since the signs in the brackets turn over, and the radius is $\\sqrt{9} = 3$. So',
          ),
          display('x = 2 + 3\\cos t \\qquad y = -1 + 3\\sin t'),
          figure((t) => [2 + 3 * Math.cos(t), -1 + 3 * Math.sin(t)], {
            span: 6,
            tMin: 0,
            tMax: 2 * Math.PI,
            marks: [[2, -1]],
            label: 'A circle of radius 3 centred at the point (2, -1)',
          }),
        ),
        ask('ppar-circle-tiles'),
        ask('ppar-circle-flow'),
        askAfter(
          [
            prose(
              'Going the other way, as in Parametric Curves: from $x = 2 + 3\\cos t$, $y = -1 + 3\\sin t$, move the constants over, square and add to get back',
            ),
            display('(x - 2)^{2} + (y + 1)^{2} = 9'),
          ],
          'param-circle-tiles',
        ),
        teach(
          prose('The value of $t$ says where on the circle you are. It runs anticlockwise from the rightmost point:'),
          display(
            '\\begin{array}{c|cccc} t & 0 & \\frac{\\pi}{2} & \\pi & \\frac{3\\pi}{2} \\\\ \\hline \\cos t & 1 & 0 & -1 & 0 \\\\ \\sin t & 0 & 1 & 0 & -1 \\end{array}',
          ),
          prose(
            'On $x = 2 + 3\\cos t$, $y = -1 + 3\\sin t$: $t = 0$ gives $(2 + 3, -1)$, which is $(5, -1)$, the rightmost point. $t = \\frac{\\pi}{2}$ gives $(2, -1 + 3)$, which is $(2, 2)$, the top.',
          ),
          prose('$t = \\pi$ gives $(-1, -1)$ on the left, and $t = \\frac{3\\pi}{2}$ gives $(2, -4)$ at the bottom.'),
          figure((t) => [2 + 3 * Math.cos(t), -1 + 3 * Math.sin(t)], {
            span: 6,
            tMin: 0,
            tMax: 2 * Math.PI,
            marks: [
              [5, -1],
              [2, 2],
              [-1, -1],
              [2, -4],
            ],
            label: 'The same circle with the points for t = 0, a quarter turn, a half turn and three quarter turns marked',
          }),
        ),
        ask('ppar-circle-slider'),
        ask('ppar-circle-tiles', 2),
        ask('ppar-circle-slider+choice', 2),
        ask('ppar-circle-flow', 2),
      ],
      skillCheck: [ask('ppar-circle-tiles', 2), ask('ppar-circle-flow', 2), ask('ppar-circle-slider', 2)],
    },
    {
      id: 'pi-l10-ellipse',
      title: 'Ellipses',
      slides: [
        teach(
          prose('An ellipse centred at the origin, reaching $p$ across and $q$ up, has equation'),
          display('\\frac{x^{2}}{p^{2}} + \\frac{y^{2}}{q^{2}} = 1'),
          prose('and is traced by'),
          display('x = p\\cos t \\qquad y = q\\sin t'),
          prose(
            'To check, substitute: $\\frac{x^{2}}{p^{2}} = \\cos^{2} t$ and $\\frac{y^{2}}{q^{2}} = \\sin^{2} t$, which add to $1$.',
          ),
          prose('For $\\frac{x^{2}}{25} + \\frac{y^{2}}{9} = 1$, $p = 5$ and $q = 3$, so'),
          display('x = 5\\cos t \\qquad y = 3\\sin t'),
          figure((t) => [5 * Math.cos(t), 3 * Math.sin(t)], {
            span: 6,
            tMin: 0,
            tMax: 2 * Math.PI,
            marks: [
              [5, 0],
              [0, 3],
            ],
            label: 'An ellipse reaching 5 across and 3 up, with the points for t = 0 and a quarter turn marked',
          }),
          prose('As on a circle, $t = 0$ gives the rightmost point, $(5, 0)$, and $t = \\frac{\\pi}{2}$ gives the top, $(0, 3)$.'),
        ),
        ask('ppar-ellipse-tiles'),
        ask('ppar-ellipse-slider'),
        ask('ppar-ellipse-slider+choice'),
        teach(
          prose('An ellipse may be written with whole numbers. Divide both sides by the right-hand side first, so that it equals $1$:'),
          display('4x^{2} + 9y^{2} = 36'),
          display('\\frac{x^{2}}{9} + \\frac{y^{2}}{4} = 1'),
          prose('So $p = 3$ and $q = 2$, and the ellipse is traced by $x = 3\\cos t$, $y = 2\\sin t$.'),
          prose(
            'A moved centre $(a, b)$ is added on, as for a circle. For $\\frac{(x - 1)^{2}}{16} + \\frac{(y + 2)^{2}}{9} = 1$ the centre is $(1, -2)$, $p = 4$ and $q = 3$:',
          ),
          display('x = 1 + 4\\cos t \\qquad y = -2 + 3\\sin t'),
        ),
        ask('ppar-ellipse-flow'),
        ask('ppar-ellipse-tiles', 2),
        askAfter(
          [
            prose(
              'And back again, as in Parametric Curves: $x = 3\\cos t$, $y = 2\\sin t$ gives $\\frac{x^{2}}{9} + \\frac{y^{2}}{4} = 1$, and multiplying through by $36$ gives',
            ),
            display('4x^{2} + 9y^{2} = 36'),
          ],
          'param-ellipse-tiles',
        ),
        ask('ppar-ellipse-flow', 2),
      ],
      skillCheck: [ask('ppar-ellipse-tiles', 2), ask('ppar-ellipse-flow', 2), ask('ppar-ellipse-slider', 2)],
    },
    {
      id: 'pi-l10-check',
      title: 'Checking a Parametrisation',
      slides: [
        teach(
          prose(
            'To check that a pair of equations traces a curve, substitute them into its Cartesian equation. The two sides must agree for **every** $t$.',
          ),
          prose('Does $x = 3t^{2}$, $y = 6t$ trace $y^{2} = 12x$?'),
          display('y^{2} = (6t)^{2} = 36t^{2}'),
          display('12x = 12(3t^{2}) = 36t^{2}'),
          prose('They agree, so it does. For $x = 6t^{2}$, $y = 3t$ instead, $y^{2} = 9t^{2}$ but $12x = 72t^{2}$, so it does not.'),
          prose('In general, the parabola $y^{2} = 4ax$ is traced by'),
          display('x = at^{2} \\qquad y = 2at'),
          prose(
            'since $(2at)^{2} = 4a^{2}t^{2}$, which is $4a(at^{2})$. For $y^{2} = 12x$, $4a = 12$ gives $a = 3$. The $a$ may be negative: $y^{2} = -8x$ has $a = -2$, so $x = -2t^{2}$, $y = -4t$.',
          ),
          prose('Turned on its side, $x^{2} = 4ay$ is traced by $x = 2at$, $y = at^{2}$.'),
        ),
        ask('ppar-verify-flow'),
        ask('ppar-parabola-tiles'),
        askAfter(
          [
            prose(
              'Substitution also finds a missing number. If $x = 2t^{2}$, $y = 6t$ traces $y^{2} = kx$, then $y^{2} = 36t^{2}$ and $kx = 2kt^{2}$. They agree when',
            ),
            display('2k = 36, \\quad k = 18'),
          ],
          'ppar-parabola-k',
        ),
        teach(
          prose('To pick the right parametrisation from several, substitute each one. On $x^{2} + y^{2} = 16$:'),
          prose('$x = 4\\cos t$, $y = 4\\sin t$ gives $16\\cos^{2} t + 16\\sin^{2} t$, which is $16$. It works.'),
          prose('$x = 16\\cos t$, $y = 16\\sin t$ gives $256$, not $16$. It fails.'),
          prose(
            'Some pairs look different and still work. $x = 4\\sin t$, $y = 4\\cos t$ gives $16\\sin^{2} t + 16\\cos^{2} t = 16$ too: the same circle, started from the top and run the other way. Only substituting tells you.',
          ),
        ),
        ask('ppar-which'),
        ask('ppar-parabola-tiles', 2),
        ask('ppar-verify-flow', 2),
        ask('ppar-which', 2),
      ],
      skillCheck: [ask('ppar-parabola-tiles', 2), ask('ppar-verify-flow', 2), ask('ppar-which', 2)],
    },
  ],
  levelCheck: [
    ask('ppar-graph', 2),
    ask('ppar-graph-tiles', 2),
    ask('ppar-graph-t+choice', 2),
    ask('ppar-line-tiles', 2),
    ask('ppar-line-point', 2),
    ask('ppar-line-where-flow', 2),
    ask('ppar-circle-tiles', 2),
    ask('ppar-circle-slider', 2),
    ask('ppar-circle-flow', 2),
    ask('ppar-ellipse-tiles', 2),
    ask('ppar-ellipse-flow', 2),
    ask('ppar-ellipse-slider+choice', 2),
    ask('ppar-parabola-tiles', 2),
    ask('ppar-verify-flow', 2),
    ask('ppar-which', 2),
  ],
};
