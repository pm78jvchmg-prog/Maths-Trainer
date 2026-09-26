/**
 * Parametric & Implicit, level 8: sketching parametric curves.
 *
 * Shown on the Parametric & Implicit Basics card, after Parametric Curves and
 * Implicit Differentiation. It is about the picture a pair of equations
 * draws: a table of points joined in order of t, which way the point travels,
 * where a curve with a restricted t starts and ends and what it covers, its
 * extreme points, and matching equations to a sketch. Generators are in
 * `generators/paramSketch.ts`.
 */
import type { Level } from '../../types';
import { ask, askAfter, display, figure, prose, teach } from './blocks';

const DXDT = '\\frac{dx}{dt}';
const DYDT = '\\frac{dy}{dt}';

export const level8: Level = {
  id: 'pi-l8',
  title: 'Sketching Parametric Curves',
  lessons: [
    {
      id: 'pi-l8-table',
      title: 'Plotting from a Table',
      slides: [
        teach(
          prose(
            'To sketch a curve given by $x$ and $y$ in terms of $t$, choose some values of $t$ and work out a table of points.',
          ),
          display('x = t^{2} - 2 \\qquad y = t + 1'),
          display(
            '\\begin{array}{c|ccccc} t & -2 & -1 & 0 & 1 & 2 \\\\ \\hline x & 2 & -1 & -2 & -1 & 2 \\\\ y & -1 & 0 & 1 & 2 & 3 \\end{array}',
          ),
          prose('Keep a negative $t$ in brackets when you square it. At $t = -2$:'),
          display('x = (-2)^{2} - 2 = 2'),
          prose('Plot the points and join them **in order** of $t$, from $t = -2$ up to $t = 2$.'),
          figure((t) => [t * t - 2, t + 1], {
            span: 4,
            tMin: -2.2,
            tMax: 2.2,
            marks: [
              [2, -1],
              [-1, 0],
              [-2, 1],
              [-1, 2],
              [2, 3],
            ],
            label: 'The curve x = t squared minus 2, y = t + 1, through the five points of the table',
          }),
        ),
        ask('psk-table'),
        ask('param-point'),
        ask('psk-table', 2),
        teach(
          prose(
            'Points given out of order can be put back in order of $t$. For each point, solve the equation that has only one $t$ for each value: here the linear one. On the same curve:',
          ),
          display('x = t^{2} - 2 \\qquad y = t + 1'),
          prose('For $\\text{A}(2, 3)$, $t + 1 = 3$ gives $t = 2$. For $\\text{B}(-1, 0)$, $t = -1$. For $\\text{C}(-2, 1)$, $t = 0$.'),
          display('\\text{B} \\to \\text{C} \\to \\text{A}'),
          prose(
            'So $\\text{B}$ comes first. Joining them from left to right would give $\\text{C}$, $\\text{B}$, $\\text{A}$, which is not the order the curve is drawn in: $x$ turns at $t = 0$, so the curve doubles back.',
          ),
          prose('A listed point may not be on the curve at all. For $(2, 4)$, $t + 1 = 4$ gives $t = 3$, and then'),
          display('x = 3^{2} - 2 = 7'),
          prose('not $2$. So $(2, 4)$ is not on the curve, and it is left out.'),
        ),
        ask('psk-first'),
        ask('psk-order'),
        ask('psk-order+choice', 2),
        teach(
          prose(
            'Asked which point comes **last**, look for the largest $t$ instead. Above, $\\text{A}$ has $t = 2$, the largest, so the curve reaches it last.',
          ),
        ),
        ask('psk-first', 2),
      ],
      skillCheck: [ask('psk-table', 2), ask('psk-order', 2), ask('psk-first', 2)],
    },
    {
      id: 'pi-l8-direction',
      title: 'Which Way It Travels',
      slides: [
        teach(
          prose(
            `As $t$ increases, the sign of $${DXDT}$ says which way the point moves across: positive is to the right, negative to the left. The sign of $${DYDT}$ says up (positive) or down (negative).`,
          ),
          display('x = 3 - t \\qquad y = t^{2} - 2t'),
          display(`${DXDT} = -1 \\qquad ${DYDT} = 2t - 2`),
          prose(
            `$x$ is linear in $t$ with a negative coefficient, so $${DXDT}$ is always negative: the point always moves left. At $t = 3$, $${DYDT} = 4$ is positive, so there it moves left and up.`,
          ),
          figure((t) => [3 - t, t * t - 2 * t], {
            span: 5,
            tMin: -1.5,
            tMax: 3.9,
            marks: [[0, 3]],
            label: 'The curve x = 3 minus t, y = t squared minus 2t, with the point where t = 3 marked',
          }),
        ),
        ask('psk-heading'),
        askAfter(
          [
            prose('A circle can be traced with $\\cos t$ and $\\sin t$. Put in $t$ as for any curve, using'),
            display('\\cos 0 = 1 \\qquad \\sin 0 = 0'),
            display('\\cos\\frac{\\pi}{2} = 0 \\qquad \\sin\\frac{\\pi}{2} = 1'),
            display('\\cos \\pi = -1 \\qquad \\sin \\pi = 0'),
            display('\\cos\\frac{3\\pi}{2} = 0 \\qquad \\sin\\frac{3\\pi}{2} = -1'),
            prose('On the circle'),
            display('x = 1 + 3\\cos t \\qquad y = 2 + 3\\sin t'),
            prose('at $t = \\frac{\\pi}{2}$ the point is'),
            display('x = 1 + 3 \\times 0 = 1 \\qquad y = 2 + 3 \\times 1 = 5'),
          ],
          'psk-quarter',
        ),
        ask('psk-heading', 2),
        teach(
          prose(
            'On $x = r\\cos t$, $y = r\\sin t$ the point starts at $(r, 0)$ when $t = 0$. As $t$ increases, $\\sin t$ grows from $0$, so $y$ rises first: it goes round **anticlockwise**.',
          ),
          prose(
            'On $x = r\\sin t$, $y = r\\cos t$ it starts at $(0, r)$, and $x$ rises first, so it moves right from the top: **clockwise**.',
          ),
          figure((t) => [3 * Math.cos(t), 3 * Math.sin(t)], {
            span: 4,
            tMin: 0,
            tMax: 2 * Math.PI,
            marks: [
              [3, 0],
              [0, 3],
            ],
            label: 'A circle of radius 3 about the origin, with its start points (3, 0) and (0, 3) marked',
          }),
          prose('Moving the centre moves the start with it. The circle'),
          display('x = 2 + 3\\cos t \\qquad y = -1 + 3\\sin t'),
          prose('starts at $(5, -1)$, three to the right of its centre $(2, -1)$, and goes anticlockwise.'),
        ),
        ask('psk-circle-flow'),
        ask('psk-sense'),
        ask('psk-quarter+choice', 2),
        teach(
          prose(
            'A minus sign on the $\\sin t$ term turns the direction round. $x = 3\\cos t$, $y = -3\\sin t$ still starts at $(3, 0)$, but $y$ falls first, so it moves down: **clockwise**.',
          ),
          prose(
            'In the same way $x = -3\\sin t$, $y = 3\\cos t$ starts at $(0, 3)$ and moves left first: **anticlockwise**.',
          ),
        ),
        ask('psk-circle-flow', 2),
        ask('psk-sense', 2),
      ],
      skillCheck: [ask('psk-heading', 2), ask('psk-quarter', 2), ask('psk-sense', 2)],
    },
    {
      id: 'pi-l8-ends',
      title: 'A Curve with Ends',
      slides: [
        teach(
          prose(
            'When $t$ is restricted to an interval, the curve is a piece with two ends. It starts at the smallest $t$ and ends at the largest, whatever happens at $t = 0$.',
          ),
          display('x = t^{2} \\qquad y = t + 1'),
          display('-1 \\le t \\le 3'),
          display(
            '\\begin{array}{c|ccccc} t & -1 & 0 & 1 & 2 & 3 \\\\ \\hline x & 1 & 0 & 1 & 4 & 9 \\\\ y & 0 & 1 & 2 & 3 & 4 \\end{array}',
          ),
          prose('It starts at $(1, 0)$, where $t = -1$, and ends at $(9, 4)$, where $t = 3$.'),
          figure((t) => [t * t, t + 1], {
            span: 10,
            tMin: -1,
            tMax: 3,
            marks: [
              [1, 0],
              [9, 4],
            ],
            label: 'The piece of x = t squared, y = t + 1 from t = -1 to t = 3, with its two ends marked',
          }),
        ),
        ask('psk-ends'),
        ask('psk-table'),
        ask('psk-ends+choice', 2),
        teach(
          prose(
            'The values of $x$ the piece covers are **not** always the values between its ends. Above, $x$ is $1$ at the start and $9$ at the end, but the table shows $x = 0$ at $t = 0$.',
          ),
          prose(
            `$x$ turns where $${DXDT} = 2t = 0$, at $t = 0$. That is inside $-1 \\le t \\le 3$, so $x$ falls to $0$ before rising to $9$. It covers`,
          ),
          display('0 \\le x \\le 9'),
          prose(
            'So check for a turning point inside the interval and include its value. If the turning point is outside, the two ends give the smallest and largest values.',
          ),
        ),
        ask('psk-range'),
        ask('psk-table', 2),
        teach(
          prose('The same goes for $y$. Take'),
          display('y = t^{2} - 4t \\qquad 3 \\le t \\le 5'),
          display(`${DYDT} = 2t - 4 = 0 \\quad t = 2`),
          prose('$t = 2$ is outside the interval, so the ends decide it:'),
          display('y = -3 \\text{ at } t = 3 \\qquad y = 5 \\text{ at } t = 5'),
          display('-3 \\le y \\le 5'),
        ),
        ask('psk-range+choice', 2),
      ],
      skillCheck: [ask('psk-ends', 2), ask('psk-range', 2), ask('psk-table', 2)],
    },
    {
      id: 'pi-l8-shape',
      title: 'Reading the Shape',
      slides: [
        teach(
          prose(
            `The **leftmost** point of a curve is where $x$ is smallest, and the **rightmost** where it is largest. When $x$ is a quadratic in $t$, that is where $${DXDT} = 0$, as in Horizontal and Vertical Tangents: the tangent there is vertical.`,
          ),
          display('x = t^{2} - 4t + 1 \\qquad y = t + 2'),
          display(`${DXDT} = 2t - 4 = 0 \\quad t = 2`),
          prose('At $t = 2$:'),
          display('x = 4 - 8 + 1 = -3 \\qquad y = 4'),
          prose('The $t^{2}$ term is positive, so $x$ has a smallest value: $(-3, 4)$ is the leftmost point.'),
          figure((t) => [t * t - 4 * t + 1, t + 2], {
            span: 6,
            tMin: -1,
            tMax: 5.5,
            marks: [[-3, 4]],
            label: 'The curve x = t squared minus 4t + 1, y = t + 2, with its leftmost point (-3, 4) marked',
          }),
          prose(
            `In the same way, $${DYDT} = 0$ gives the **lowest** point when the $t^{2}$ term in $y$ is positive, and the **highest** when it is negative.`,
          ),
        ),
        ask('psk-turn'),
        ask('psk-extreme-slider'),
        ask('psk-turn+choice', 2),
        teach(
          prose('Completing the square finds the same value without differentiating. Halve the coefficient of $t$ for the bracket:'),
          display('x = t^{2} - 4t + 1'),
          display('x = (t - 2)^{2} - 4 + 1'),
          display('x = (t - 2)^{2} - 3'),
          prose('A square is never negative, so $x$ is never below $-3$, and $x = -3$ when $t = 2$.'),
          prose('With a negative $t^{2}$ term, take the minus sign out first:'),
          display('x = -t^{2} + 6t = -(t^{2} - 6t)'),
          display('x = -(t - 3)^{2} + 9'),
          prose('Minus a square is never positive, so $x$ is never more than $9$.'),
        ),
        ask('psk-square'),
        ask('psk-square+choice', 2),
        teach(
          prose(
            'Where the curve crosses the axes finishes a sketch. It crosses the $y$-axis where $x = 0$ and the $x$-axis where $y = 0$: solve for $t$, then put that $t$ into the other equation.',
          ),
          prose('On the same curve, $y = t + 2$ is $0$ when $t = -2$. Then'),
          display('x = (-2)^{2} - 4 \\times (-2) + 1 = 13'),
          prose('So it crosses the $x$-axis at $(13, 0)$.'),
        ),
        ask('param-axis-tree'),
        ask('psk-extreme-slider', 2),
      ],
      skillCheck: [ask('psk-turn', 2), ask('psk-square', 2), ask('psk-extreme-slider', 2)],
    },
    {
      id: 'pi-l8-match',
      title: 'Matching Equations to a Sketch',
      slides: [
        teach(
          prose(
            'To match equations to a sketch, work out a few key points from the equations and look for them on the picture. Three usually settle it: the point where $t = 0$, the leftmost or rightmost point, and where it meets an axis.',
          ),
          display('x = t^{2} - 2t \\qquad y = 2t + 2'),
          prose('At $t = 0$ it is at $(0, 2)$. The leftmost point is where'),
          display(`${DXDT} = 2t - 2 = 0 \\quad t = 1`),
          prose('which gives $(-1, 4)$. And $y = 0$ at $t = -1$, where $x = 3$.'),
          display(
            '\\begin{array}{c|cc} & x & y \\\\ \\hline t = 0 & 0 & 2 \\\\ \\text{leftmost} & -1 & 4 \\\\ \\text{on the } x\\text{-axis} & 3 & 0 \\end{array}',
          ),
          figure((t) => [t * t - 2 * t, 2 * t + 2], {
            span: 6,
            tMin: -3,
            tMax: 4,
            marks: [
              [0, 2],
              [-1, 4],
              [3, 0],
            ],
            label: 'The curve x = t squared minus 2t, y = 2t + 2, opening to the right, with its three key points marked',
          }),
          prose(
            'A sketch of a curve opening to the right, leftmost at $(-1, 4)$ and passing through $(0, 2)$ and $(3, 0)$, is this curve. On a sketch drawn on a grid, find the dot at $t = 0$ first, then check which way the curve opens.',
          ),
        ),
        ask('psk-features'),
        ask('psk-match'),
        ask('psk-features', 2),
        teach(
          prose('A wrong pair of equations often draws a reflection or a shift of the right curve.'),
          prose('Swapping the $x$ and $y$ equations reflects the curve in the line $y = x$. The swapped pair'),
          display('x = 2t + 2 \\qquad y = t^{2} - 2t'),
          prose('opens upwards instead of to the right.'),
          prose(
            'Changing the sign of the whole $x$ equation reflects it in the $y$-axis, and changing the sign of the whole $y$ equation reflects it in the $x$-axis. The reflection of the curve above in the $x$-axis is',
          ),
          display('x = t^{2} - 2t \\qquad y = -2t - 2'),
          prose('Changing a constant slides the curve: $x = t^{2} - 2t + 3$ is the same shape moved $3$ to the right.'),
          prose(
            'An ellipse $x = h + a\\cos t$, $y = k + b\\sin t$ has centre $(h, k)$, reaches $a$ either side of it across and $b$ above and below, and its dot at $t = 0$ is at $(h + a, k)$.',
          ),
        ),
        ask('psk-reflect'),
        ask('psk-match', 2),
        ask('psk-reflect+choice', 2),
        teach(
          prose(
            'The picture also fixes the numbers. On the first curve of this lesson, the leftmost point is at $x = -1$, so a line slid across to the leftmost point stops at $x = -1$. When $y$ is the quadratic, its lowest or highest point gives a height in the same way.',
          ),
        ),
        ask('psk-extreme-slider', 2),
      ],
      skillCheck: [ask('psk-features', 2), ask('psk-match', 2), ask('psk-reflect', 2)],
    },
  ],
  levelCheck: [
    ask('psk-table', 2),
    ask('psk-heading', 2),
    ask('psk-ends', 2),
    ask('psk-turn', 2),
    ask('psk-match', 2),
    ask('psk-order', 2),
    ask('psk-quarter+choice', 2),
    ask('psk-range', 2),
    ask('psk-extreme-slider', 2),
    ask('psk-features', 2),
    ask('psk-circle-flow', 2),
    ask('psk-square', 2),
    ask('psk-reflect', 2),
    ask('psk-sense', 2),
  ],
};
