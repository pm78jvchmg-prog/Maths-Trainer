/**
 * Further Integration, level 10: Arc Length and Surface Area.
 *
 * The length of a curve from Pythagoras on a small piece, on curves chosen so
 * the root comes out: y = (2m/3)x^{3/2}, then curves made so that 1 + (dy/dx)²
 * is a perfect square, then curves given by a parameter, then the area of the
 * surface a curve sweeps out when turned about the x-axis, and last, picking
 * the right formula. Generators are in `generators/integrationArcLength.ts`.
 */
import type { Level } from '../../types';
import { ask, maths, prose, teach } from './blocks';

const DYDX = '\\left(\\frac{dy}{dx}\\right)^{2}';

export const arcLengthSurface: Level = {
  id: 'in-l10',
  title: 'Arc Length and Surface Area',
  lessons: [
    {
      id: 'in-l10-length',
      title: 'Length Along a Curve',
      slides: [
        teach(
          prose(
            'Zoom in on a curve and a short piece of it is almost straight. Across a small step $\\delta x$ it rises $\\delta y$, so by Pythagoras its length is',
          ),
          maths('\\delta s \\approx \\sqrt{(\\delta x)^{2} + (\\delta y)^{2}}'),
          maths('= \\sqrt{1 + \\left(\\frac{\\delta y}{\\delta x}\\right)^{2}} \\, \\delta x'),
          prose('Adding the pieces and letting them shrink gives the **arc length** from $x = a$ to $x = b$:'),
          maths(`s = \\int_{a}^{b} \\sqrt{1 + ${DYDX}} \\, dx`),
          prose('For $y = x^{3}$ from $0$ to $2$, $\\frac{dy}{dx} = 3x^{2}$, so'),
          maths('s = \\int_{0}^{2} \\sqrt{1 + 9x^{4}} \\, dx'),
        ),
        ask('int-arc-setup'),
        teach(
          prose('Most of these integrals cannot be done by hand, so the curves here are chosen so the root works out. For $y = \\frac{4}{3}x^{\\frac{3}{2}}$:'),
          maths('\\frac{dy}{dx} = 2\\sqrt{x}'),
          maths(`1 + ${DYDX} = 1 + 4x`),
          prose('A constant added to $y$ changes nothing, since it is gone once you differentiate. From $x = 0$ to $x = 2$:'),
          maths('s = \\int_{0}^{2} \\sqrt{1 + 4x} \\, dx'),
          maths('= \\left[\\frac{1}{6}(1 + 4x)^{\\frac{3}{2}}\\right]_{0}^{2}'),
          maths('= \\frac{1}{6}(27 - 1) = \\frac{13}{3}'),
        ),
        ask('int-arc-integrand-tiles'),
        ask('int-arc-three-halves'),
        teach(
          prose('When the lower limit is not $0$, work the bracket at both ends. For the same curve from $x = 2$ to $x = 6$, $1 + 4x$ runs from $9$ to $25$:'),
          maths('s = \\frac{1}{6}(125 - 27) = \\frac{49}{3}'),
        ),
        ask('int-arc-setup', 2),
        ask('int-arc-integrand-tiles'),
        ask('int-arc-three-halves', 2),
      ],
      skillCheck: [ask('int-arc-setup', 2), ask('int-arc-integrand-tiles'), ask('int-arc-three-halves', 2)],
    },
    {
      id: 'in-l10-square',
      title: 'Curves Made to Measure',
      slides: [
        teach(
          prose('Another family has a root that comes out exactly. Take $y = \\frac{1}{6}x^{3} + \\frac{1}{2x}$:'),
          maths('\\frac{dy}{dx} = \\frac{1}{2}x^{2} - \\frac{1}{2x^{2}}'),
          prose('Squaring this, the middle term takes away'),
          maths('2 \\times \\frac{1}{2}x^{2} \\times \\frac{1}{2x^{2}} = \\frac{1}{2}'),
          prose('Adding $1$ turns that $-\\frac{1}{2}$ into $+\\frac{1}{2}$, which is the same square with a plus sign:'),
          maths(`1 + ${DYDX} = \\left(\\frac{1}{2}x^{2} + \\frac{1}{2x^{2}}\\right)^{2}`),
        ),
        ask('int-arc-integrand-tiles', 2),
        teach(
          prose('Then the root is just the bracket. From $x = 1$ to $x = 3$:'),
          maths('s = \\int_{1}^{3} \\left(\\frac{1}{2}x^{2} + \\frac{1}{2x^{2}}\\right) dx'),
          maths('= \\left[\\frac{1}{6}x^{3} - \\frac{1}{2x}\\right]_{1}^{3}'),
          maths('= \\left(\\frac{27}{6} - \\frac{1}{6}\\right) - \\left(\\frac{1}{6} - \\frac{1}{2}\\right)'),
          maths('= \\frac{13}{3} + \\frac{1}{3} = \\frac{14}{3}'),
        ),
        ask('int-arc-square-steps'),
        ask('int-arc-square-value'),
        teach(
          prose('The same works for this curve:'),
          maths('y = \\frac{1}{8}x^{4} + \\frac{1}{4x^{2}}'),
          maths('\\frac{dy}{dx} = \\frac{1}{2}x^{3} - \\frac{1}{2x^{3}}'),
          prose('so the root is $\\frac{1}{2}x^{3} + \\frac{1}{2x^{3}}$.'),
          prose('Watch the sign when integrating: $\\frac{1}{2x^{3}}$ integrates to $-\\frac{1}{4x^{2}}$.'),
        ),
        ask('int-arc-square-steps', 2),
        ask('int-arc-square-value', 2),
        ask('int-arc-integrand-tiles', 2),
      ],
      skillCheck: [ask('int-arc-square-steps', 2), ask('int-arc-square-value', 2), ask('int-arc-integrand-tiles', 2)],
    },
    {
      id: 'in-l10-param',
      title: 'Parametric Arc Length',
      slides: [
        teach(
          prose(
            'When $x$ and $y$ are both given in terms of $t$, a small piece has $\\delta x \\approx \\frac{dx}{dt}\\delta t$ and $\\delta y \\approx \\frac{dy}{dt}\\delta t$. Pythagoras again:',
          ),
          maths('s = \\int_{t_{1}}^{t_{2}} \\sqrt{\\left(\\frac{dx}{dt}\\right)^{2} + \\left(\\frac{dy}{dt}\\right)^{2}} \\, dt'),
          prose('For $x = 2t^{2}$, $y = 3t^{3}$ from $t = 0$ to $t = 1$: $\\frac{dx}{dt} = 4t$ and $\\frac{dy}{dt} = 9t^{2}$, so'),
          maths('s = \\int_{0}^{1} \\sqrt{16t^{2} + 81t^{4}} \\, dt'),
        ),
        ask('int-arc-param-setup'),
        teach(
          prose('The root in this formula is the **speed**. Take this curve:'),
          maths('x = t^{2}, \\quad y = t - \\frac{1}{3}t^{3}'),
          maths('\\frac{dx}{dt} = 2t'),
          maths('\\frac{dy}{dt} = 1 - t^{2}'),
          maths('(2t)^{2} + (1 - t^{2})^{2} = (1 + t^{2})^{2}'),
          prose('So the speed is $1 + t^{2}$. At $t = 2$, $\\frac{dx}{dt} = 4$ and $\\frac{dy}{dt} = -3$, so the speed is $\\sqrt{16 + 9} = 5$.'),
          prose('Likewise, $3(1 + t^{2})$ is the speed along this curve:'),
          maths('x = t^{3} - 3t, \\quad y = 3t^{2}'),
        ),
        ask('int-arc-param-speed-tree'),
        teach(
          prose('Then the length is an ordinary integral. For the curve with speed $1 + t^{2}$, from $t = 0$ to $t = 3$:'),
          maths('s = \\int_{0}^{3} (1 + t^{2}) \\, dt'),
          maths('= \\left[t + \\frac{t^{3}}{3}\\right]_{0}^{3}'),
          maths('= 3 + 9 = 12'),
        ),
        ask('int-arc-param-value'),
        ask('int-arc-param-setup'),
        ask('int-arc-param-speed-tree'),
        ask('int-arc-param-value+choice', 2),
      ],
      skillCheck: [ask('int-arc-param-setup'), ask('int-arc-param-speed-tree'), ask('int-arc-param-value', 2)],
    },
    {
      id: 'in-l10-surface',
      title: 'Surface Area of Revolution',
      slides: [
        teach(
          prose(
            'Turn a curve once about the $x$-axis and it sweeps out a surface. A short piece of length $\\delta s$ at height $y$ sweeps a thin band of radius $y$, with area about $2\\pi y \\, \\delta s$. Adding the bands:',
          ),
          maths(`S = 2\\pi \\int_{a}^{b} y\\sqrt{1 + ${DYDX}} \\, dx`),
          prose('Compare the volume, $\\pi \\int y^{2} \\, dx$, which fills the inside rather than covering it.'),
          prose('For $y = x^{2}$ from $0$ to $1$:'),
          maths('S = 2\\pi \\int_{0}^{1} x^{2}\\sqrt{1 + 4x^{2}} \\, dx'),
        ),
        ask('int-surf-setup'),
        teach(
          prose(
            `Simplify $y\\sqrt{1 + ${DYDX}}$ before integrating. For the line $y = \\frac{3}{4}x$ the root is $\\sqrt{1 + \\frac{9}{16}} = \\frac{5}{4}$, so the product is $\\frac{15}{16}x$:`,
          ),
          maths('S = 2\\pi \\int_{0}^{4} \\frac{15}{16}x \\, dx = 15\\pi'),
          prose('For $y = 2x$ the root is $\\sqrt{5}$, so the product is $2\\sqrt{5}x$.'),
          prose(
            'For the circle $y = \\sqrt{25 - x^{2}}$ the product simplifies to the radius, $5$. So the band from $x = 1$ to $x = 3$ has area $2\\pi \\times 5 \\times 2 = 20\\pi$.',
          ),
        ),
        ask('int-surf-value'),
        ask('int-surf-setup', 2),
        teach(
          prose('For $y = 3\\sqrt{x}$:'),
          maths('\\frac{dy}{dx} = \\frac{3}{2\\sqrt{x}}'),
          maths(`1 + ${DYDX} = \\frac{4x + 9}{4x}`),
          prose('Times $y$, the $\\sqrt{x}$ cancels:'),
          maths(`y\\sqrt{1 + ${DYDX}} = \\frac{3}{2}\\sqrt{4x + 9}`),
          prose('From $x = 0$ to $x = 4$:'),
          maths('S = 3\\pi \\int_{0}^{4} \\sqrt{4x + 9} \\, dx'),
          maths('= \\frac{\\pi}{2}\\left[(4x + 9)^{\\frac{3}{2}}\\right]_{0}^{4} = 49\\pi'),
        ),
        ask('int-surf-integrand-tiles'),
        ask('int-surf-value', 2),
        ask('int-surf-integrand-tiles'),
      ],
      skillCheck: [ask('int-surf-setup', 2), ask('int-surf-value', 2), ask('int-surf-integrand-tiles')],
    },
    {
      id: 'in-l10-choose',
      title: 'Length or Area?',
      slides: [
        teach(
          prose('Four integrals, and the question says which one:'),
          prose('Length along $y = f(x)$:'),
          maths(`s = \\int \\sqrt{1 + ${DYDX}} \\, dx`),
          prose('Length along a curve given by $t$:'),
          maths('s = \\int \\sqrt{\\left(\\frac{dx}{dt}\\right)^{2} + \\left(\\frac{dy}{dt}\\right)^{2}} \\, dt'),
          prose('Area of the surface swept about the $x$-axis:'),
          maths(`S = 2\\pi \\int y\\sqrt{1 + ${DYDX}} \\, dx`),
          prose('Volume swept about the $x$-axis:'),
          maths('V = \\pi \\int y^{2} \\, dx'),
        ),
        ask('int-arc-which-flow'),
        ask('int-arc-three-halves', 2),
        ask('int-arc-param-value', 2),
        teach(prose('Always simplify what is under the root before integrating. These questions are set so that it comes out; if it does not, check the derivative.')),
        ask('int-surf-value', 2),
        ask('int-arc-square-value'),
        ask('int-arc-which-flow'),
        ask('int-arc-param-speed-tree'),
      ],
      skillCheck: [ask('int-arc-which-flow'), ask('int-surf-value', 2), ask('int-arc-param-speed-tree')],
    },
  ],
  levelCheck: [
    ask('int-arc-setup', 2),
    ask('int-arc-integrand-tiles', 2),
    ask('int-arc-three-halves', 2),
    ask('int-arc-square-steps', 2),
    ask('int-arc-square-value', 2),
    ask('int-arc-param-setup'),
    ask('int-arc-param-speed-tree'),
    ask('int-arc-param-value', 2),
    ask('int-surf-setup', 2),
    ask('int-surf-value', 2),
    ask('int-surf-integrand-tiles'),
    ask('int-arc-which-flow'),
  ],
};
