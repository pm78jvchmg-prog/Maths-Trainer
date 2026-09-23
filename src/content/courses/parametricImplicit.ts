/**
 * Parametric & Implicit Differentiation.
 *
 * Two ways a curve can be given without `y = f(x)`: both coordinates written
 * in terms of a third variable, or one equation tying x and y together. The
 * differentiation rules themselves are the Differentiation course's; this
 * course only teaches what changes when the curve is given like this.
 *
 * Same rhythm as the other courses: teach, practise three times, teach,
 * practise two or three times, then three sealed skill-check questions.
 */
import type { Block, Course, SlideRef } from '../types';
import { paramSvg } from '../generators/parametricImplicit';

const teach = (...blocks: Block[]): SlideRef => ({
  type: 'literal',
  slide: { kind: 'teach', body: blocks },
});

const ask = (generatorId: string, difficulty = 1): SlideRef => ({
  type: 'generated',
  generatorId,
  difficulty,
});

/** A generated question with the sentence that sets it up above it. */
const askAfter = (lead: Block[], generatorId: string, difficulty = 1): SlideRef => ({
  type: 'generated',
  generatorId,
  difficulty,
  leadIn: lead,
});

const prose = (text: string): Block => ({ kind: 'prose', text });
const display = (tex: string): Block => ({ kind: 'display', tex });

const figure = (
  f: (t: number) => [number, number],
  opts: Parameters<typeof paramSvg>[1],
): Block => ({ kind: 'diagram', svg: paramSvg(f, opts) });

const DYDX = '\\frac{dy}{dx}';

export const parametricImplicit: Course = {
  id: 'parametric-implicit',
  title: 'Parametric & Implicit Differentiation',
  blurb: 'Curves traced by a parameter, and gradients of curves that never say y =.',
  levels: [
    {
      id: 'pi-l1',
      title: 'Parametric Curves',
      lessons: [
        {
          id: 'pi-l1-points',
          title: 'Curves Traced by a Parameter',
          slides: [
            teach(
              prose(
                'A curve can be drawn by giving $x$ and $y$ separately, each in terms of a third variable $t$, called the **parameter**. Each value of $t$ gives one point.',
              ),
              display('x = t^{2} - 3 \\qquad y = 2t'),
              display(
                '\\begin{array}{c|cccc} t & -1 & 0 & 1 & 2 \\\\ \\hline x & -2 & -3 & -2 & 1 \\\\ y & -2 & 0 & 2 & 4 \\end{array}',
              ),
              figure((t) => [t * t - 3, 2 * t], {
                span: 6,
                tMin: -2.9,
                tMax: 2.9,
                marks: [
                  [-2, -2],
                  [-3, 0],
                  [-2, 2],
                  [1, 4],
                ],
                label: 'The curve x = t squared minus 3, y = 2t, with the points for t from -1 to 2 marked',
              }),
              prose('To find a point, put the value of $t$ into **both** equations.'),
            ),
            ask('param-point'),
            askAfter(
              [prose('Going backwards, from a point to $t$: pick the equation that is easiest to solve for $t$.')],
              'param-find-t',
            ),
            ask('param-axis-tree'),
            teach(
              prose(
                'To test whether a point is on the curve, find the $t$ that one coordinate needs, then check that the **same** $t$ gives the other coordinate.',
              ),
              prose(
                'On $x = t^{2} - 3$, $y = 2t$: for the point $(6, 6)$, $y = 6$ needs $t = 3$, and $t = 3$ gives $x = 9 - 3 = 6$. It is on the curve.',
              ),
              prose(
                'For $(5, 6)$, $y = 6$ still forces $t = 3$, which gives $x = 6$, not $5$. That point is not on the curve.',
              ),
            ),
            ask('param-on-curve'),
            ask('param-point+choice', 2),
            ask('param-find-t+choice', 2),
            teach(
              prose(
                'A curve crosses the $y$-axis where $x = 0$. Solve $x = 0$ for $t$, then put that $t$ into $y$.',
              ),
              prose(
                'On $x = 2t - 6$, $y = t^{2} + 1$: $x = 0$ when $t = 3$, so it crosses at $(0, 10)$.',
              ),
              prose(
                'Setting $t = 0$ is the common slip. It gives $(-6, 1)$, which is not on the axis at all: it is $x$ that must be zero, not $t$.',
              ),
            ),
            ask('param-axis-tree', 2),
            ask('param-on-curve', 2),
          ],
          skillCheck: [ask('param-point', 2), ask('param-find-t', 2), ask('param-axis-tree', 2)],
        },
        {
          id: 'pi-l1-cartesian',
          title: 'From Parametric to Cartesian',
          slides: [
            teach(
              prose(
                'The **Cartesian equation** of a curve links $x$ and $y$ directly, with no $t$. To find it, make $t$ the subject of one equation and put that into the other.',
              ),
              display('x = t + 2 \\qquad y = t^{2} - 1'),
              prose('The first gives $t = x - 2$, so'),
              display('y = (x - 2)^{2} - 1'),
            ),
            ask('param-eliminate'),
            ask('param-eliminate-flow'),
            ask('param-eliminate+choice', 2),
            teach(
              prose(
                'When $x$ and $y$ use $\\cos t$ and $\\sin t$, making $t$ the subject is no help. Instead make $\\cos t$ and $\\sin t$ the subjects, then use',
              ),
              display('\\cos^{2} t + \\sin^{2} t = 1'),
              prose(
                'For $x = 3\\cos t + 1$, $y = 3\\sin t - 2$: $\\cos t = \\frac{x - 1}{3}$ and $\\sin t = \\frac{y + 2}{3}$. Squaring, adding and multiplying by $9$:',
              ),
              display('(x - 1)^{2} + (y + 2)^{2} = 9'),
              figure((t) => [3 * Math.cos(t) + 1, 3 * Math.sin(t) - 2], {
                span: 6,
                tMin: 0,
                tMax: 2 * Math.PI,
                marks: [[1, -2]],
                label: 'A circle of radius 3 centred at the point (1, -2)',
              }),
              prose('A circle with centre $(1, -2)$ and radius $3$.'),
            ),
            ask('param-circle-tiles'),
            ask('param-eliminate-flow', 2),
            ask('param-circle-tiles', 2),
            teach(
              prose(
                'Different multipliers on $\\cos t$ and $\\sin t$ give an **ellipse**. The same identity works:',
              ),
              display('x = 2\\cos t \\qquad y = 3\\sin t'),
              display('\\frac{x^{2}}{4} + \\frac{y^{2}}{9} = 1'),
              prose('Multiplying through by $36$ clears the fractions:'),
              display('9x^{2} + 4y^{2} = 36'),
            ),
            ask('param-ellipse-tiles'),
            ask('param-ellipse-tiles', 2),
          ],
          skillCheck: [ask('param-eliminate', 2), ask('param-circle-tiles', 2), ask('param-ellipse-tiles', 2)],
        },
        {
          id: 'pi-l1-gradient',
          title: 'The Gradient of a Parametric Curve',
          slides: [
            teach(
              prose(
                'The gradient $' +
                  DYDX +
                  '$ can be found without the Cartesian equation. Differentiate $x$ and $y$ separately with respect to $t$, then divide:',
              ),
              display(DYDX + ' = \\frac{dy}{dt} \\div \\frac{dx}{dt}'),
              prose('For $x = t^{2} + 1$ and $y = t^{3} - 3t$:'),
              display('\\frac{dx}{dt} = 2t \\qquad \\frac{dy}{dt} = 3t^{2} - 3'),
              display(DYDX + ' = \\frac{3t^{2} - 3}{2t}'),
              prose('Divide the $y$ rate by the $x$ rate, never the other way up.'),
            ),
            ask('param-ratio-tiles'),
            ask('param-gradient'),
            askAfter(
              [prose('At a single value of $t$, put $t$ into both rates first, then divide the numbers.')],
              'param-slope-tree',
            ),
            teach(
              prose('The same rule works with $\\sin$ and $\\cos$. For $x = 2\\cos t$ and $y = 5\\sin t$:'),
              display('\\frac{dx}{dt} = -2\\sin t \\qquad \\frac{dy}{dt} = 5\\cos t'),
              display(DYDX + ' = \\frac{5\\cos t}{-2\\sin t} = -\\frac{5\\cos t}{2\\sin t}'),
              prose('The minus sign from differentiating $\\cos t$ is the one most often lost.'),
            ),
            ask('param-gradient-trig'),
            ask('param-ratio-tiles', 2),
            ask('param-gradient+choice', 2),
            teach(
              prose(
                'The gradient at one point needs only numbers. On $x = t^{2} + 1$, $y = t^{3} - 3t$, at $t = 3$:',
              ),
              display('\\frac{dy}{dt} = 27 - 3 = 24 \\qquad \\frac{dx}{dt} = 6'),
              display(DYDX + ' = 24 \\div 6 = 4'),
            ),
            ask('param-slope-tree', 2),
            ask('param-gradient-trig+choice', 2),
          ],
          skillCheck: [ask('param-gradient', 2), ask('param-ratio-tiles', 2), ask('param-gradient-trig', 2)],
        },
        {
          id: 'pi-l1-tangents',
          title: 'Tangents to a Parametric Curve',
          slides: [
            teach(
              prose(
                'A tangent needs a point and a gradient, and both come from the same value of $t$. On $x = t^{2} + 1$, $y = t^{3} - 3t$ at $t = 3$:',
              ),
              prose('The point is $(10, 18)$, and the gradient there is $4$. Then'),
              display('y - 18 = 4(x - 10) \\quad\\Rightarrow\\quad y = 4x - 22'),
              prose('Check: $x = 10$ gives $y = 40 - 22 = 18$, the point you started from.'),
            ),
            ask('param-point'),
            ask('param-slope-tree'),
            ask('param-tangent'),
            teach(
              prose(
                'At angles like $\\frac{\\pi}{4}$ or $\\frac{\\pi}{3}$ the trigonometric rates have exact values. On $x = 2\\cos t$, $y = 5\\sin t$ at $t = \\frac{\\pi}{4}$:',
              ),
              display(
                DYDX +
                  ' = -\\frac{5\\cos\\frac{\\pi}{4}}{2\\sin\\frac{\\pi}{4}} = -\\frac{5 \\times \\frac{\\sqrt{2}}{2}}{2 \\times \\frac{\\sqrt{2}}{2}} = -\\frac{5}{2}',
              ),
              prose('The surds cancel whenever $\\sin t$ and $\\cos t$ are equal.'),
            ),
            ask('param-trig-slope'),
            ask('param-tangent', 2),
            ask('param-point+choice', 2),
            teach(
              prose('When the surds do not cancel, the gradient can still come out whole or as a fraction. On $x = 3t$, $y = 4\\sin t$ at $t = \\frac{\\pi}{3}$:'),
              display(
                '\\frac{dy}{dt} = 4\\cos\\frac{\\pi}{3} = 2 \\qquad \\frac{dx}{dt} = 3 \\qquad ' + DYDX + ' = \\frac{2}{3}',
              ),
            ),
            ask('param-trig-slope+choice', 2),
            ask('param-slope-tree', 2),
          ],
          skillCheck: [ask('param-tangent', 2), ask('param-trig-slope', 2), ask('param-slope-tree', 2)],
        },
        {
          id: 'pi-l1-turning',
          title: 'Horizontal and Vertical Tangents',
          slides: [
            teach(
              prose(
                'Since $' +
                  DYDX +
                  ' = \\frac{dy}{dt} \\div \\frac{dx}{dt}$, a tangent is **horizontal** where $\\frac{dy}{dt} = 0$ and **vertical** where $\\frac{dx}{dt} = 0$.',
              ),
              display('x = t^{2} - 2t \\qquad y = t^{2} - 4t'),
              prose(
                '$\\frac{dx}{dt} = 2t - 2$ is zero at $t = 1$: a vertical tangent at $(-1, -3)$. $\\frac{dy}{dt} = 2t - 4$ is zero at $t = 2$: a horizontal tangent at $(0, -4)$.',
              ),
              figure((t) => [t * t - 2 * t, t * t - 4 * t], {
                span: 6,
                tMin: -1.5,
                tMax: 4.5,
                marks: [
                  [-1, -3],
                  [0, -4],
                ],
                label: 'The curve x = t squared minus 2t, y = t squared minus 4t, with its vertical and horizontal tangent points marked',
              }),
            ),
            ask('param-tangent-kind'),
            ask('param-flat-t'),
            ask('param-flat-slider'),
            teach(
              prose(
                'The question usually wants the **point**, not the value of $t$. Solve the rate equal to zero for $t$, then put that $t$ into both $x$ and $y$.',
              ),
              prose('Mixing them up is the trap: a horizontal tangent comes from the $y$ rate, even though it is a height you end up reading off.'),
            ),
            ask('param-flat-flow'),
            ask('param-flat-t+choice', 2),
            ask('param-flat-slider', 2),
            teach(
              prose(
                'Check the other rate at the same $t$. If both are zero the rule gives $0 \\div 0$, which decides nothing: on $x = t^{2}$, $y = t^{3}$ at $t = 0$ the curve comes to a sharp point.',
              ),
              prose('So: $\\frac{dy}{dt} = 0$ with $\\frac{dx}{dt} \\ne 0$ is horizontal, and the other way round is vertical.'),
            ),
            ask('param-flat-flow', 2),
            ask('param-tangent-kind', 2),
          ],
          skillCheck: [ask('param-flat-t', 2), ask('param-flat-slider', 2), ask('param-flat-flow', 2)],
        },
      ],
      levelCheck: [
        ask('param-point', 2),
        ask('param-eliminate', 2),
        ask('param-gradient', 2),
        ask('param-axis-tree', 2),
        ask('param-circle-tiles', 2),
        ask('param-flat-slider', 2),
        ask('param-find-t', 2),
        ask('param-eliminate-flow', 2),
        ask('param-slope-tree', 2),
        ask('param-ellipse-tiles', 2),
        ask('param-gradient-trig+choice', 2),
        ask('param-flat-flow', 2),
        ask('param-ratio-tiles', 2),
        ask('param-tangent', 2),
      ],
    },

    {
      id: 'pi-l2',
      title: 'Implicit Differentiation',
      lessons: [
        {
          id: 'pi-l2-terms',
          title: 'Differentiating Terms in y',
          slides: [
            teach(
              prose(
                'Some curves are given by one equation in $x$ and $y$ that is never rearranged into $y = \\ldots$. The circle $x^{2} + y^{2} = 25$ is one.',
              ),
              figure((t) => [5 * Math.cos(t), 5 * Math.sin(t)], {
                span: 7,
                tMin: 0,
                tMax: 2 * Math.PI,
                marks: [[3, 4]],
                label: 'The circle x squared plus y squared equals 25, with the point (3, 4) marked',
              }),
              prose(
                'To differentiate it, treat $y$ as a function of $x$. Terms in $x$ go as usual. A term in $y$ is differentiated as if $y$ were the variable, then multiplied by $' +
                  DYDX +
                  '$, which is the chain rule:',
              ),
              display('\\frac{d}{dx}\\left(x^{3}\\right) = 3x^{2} \\qquad \\frac{d}{dx}\\left(y^{3}\\right) = 3y^{2}' + DYDX),
            ),
            ask('impl-chain-term'),
            ask('impl-term-tree'),
            askAfter(
              [
                prose(
                  'Every term with a $y$ brings a $' +
                    DYDX +
                    '$. For $x^{3} + 2y^{2} - 5y = 4$ the $y$ terms give $4y' +
                    DYDX +
                    ' - 5' +
                    DYDX +
                    '$, so $' +
                    DYDX +
                    '$ is multiplied by $4y - 5$ altogether.',
                ),
              ],
              'impl-coefficient',
            ),
            teach(
              prose(
                'A term with both $x$ and $y$ is a product, so it needs the product rule, with the $y$ part bringing its $' +
                  DYDX +
                  '$:',
              ),
              display('\\frac{d}{dx}(xy) = y + x' + DYDX),
              display('\\frac{d}{dx}\\left(x^{2}y^{3}\\right) = 2xy^{3} + 3x^{2}y^{2}' + DYDX),
              prose('Forgetting the first half, where only $x$ is differentiated, is the usual slip.'),
            ),
            ask('impl-product-tiles'),
            ask('impl-chain-term', 2),
            ask('impl-term-tree', 2),
            teach(
              prose('Put together, $x^{2}y + 3y^{2} = 7$ differentiates to'),
              display('2xy + x^{2}' + DYDX + ' + 6y' + DYDX + ' = 0'),
              prose(
                'The number on the right is a constant, so it goes to $0$. The terms with $' +
                  DYDX +
                  '$ collect to $\\left(x^{2} + 6y\\right)' +
                  DYDX +
                  '$.',
              ),
            ),
            ask('impl-coefficient', 2),
            ask('impl-product-tiles', 2),
          ],
          skillCheck: [ask('impl-chain-term', 2), ask('impl-product-tiles', 2), ask('impl-coefficient', 2)],
        },
        {
          id: 'pi-l2-dydx',
          title: 'Finding dy/dx Implicitly',
          slides: [
            teach(
              prose(
                'To find $' +
                  DYDX +
                  '$: differentiate every term, gather the $' +
                  DYDX +
                  '$ terms on one side, and divide. For the circle $x^{2} + y^{2} = 25$:',
              ),
              display('2x + 2y' + DYDX + ' = 0'),
              display(DYDX + ' = -\\frac{2x}{2y} = -\\frac{x}{y}'),
              prose('The gradient depends on both $x$ and $y$, which is normal for a curve given this way.'),
            ),
            ask('impl-derive-steps'),
            ask('impl-coefficient'),
            ask('impl-collect-tiles'),
            teach(
              prose('With a product term there is more to gather. For $x^{2} + xy + y^{2} = 7$:'),
              display('2x + y + x' + DYDX + ' + 2y' + DYDX + ' = 0'),
              display('(x + 2y)' + DYDX + ' = -2x - y'),
              display(DYDX + ' = \\frac{-2x - y}{x + 2y}'),
            ),
            ask('impl-diff'),
            ask('impl-derive-steps', 2),
            ask('impl-collect-tiles', 2),
            teach(
              prose('The same gradient can be written in more than one way. These are all equal:'),
              display('\\frac{-2x - y}{x + 2y} = -\\frac{2x + y}{x + 2y} = \\frac{2x + y}{-x - 2y}'),
              prose('Moving a minus sign between the top, the bottom and the front changes nothing. Swapping the top and bottom does.'),
            ),
            ask('impl-diff+choice', 2),
            ask('impl-coefficient', 2),
          ],
          skillCheck: [ask('impl-diff', 2), ask('impl-derive-steps', 2), ask('impl-collect-tiles', 2)],
        },
        {
          id: 'pi-l2-gradient',
          title: 'The Gradient at a Point',
          slides: [
            teach(
              prose('With $' + DYDX + '$ in terms of $x$ and $y$, the gradient at a point needs both coordinates. On the circle $x^{2} + y^{2} = 25$ at $(3, 4)$:'),
              display(DYDX + ' = -\\frac{x}{y} = -\\frac{3}{4}'),
              figure((t) => [5 * Math.cos(t), 5 * Math.sin(t)], {
                span: 7,
                tMin: 0,
                tMax: 2 * Math.PI,
                marks: [[3, 4]],
                label: 'The circle x squared plus y squared equals 25, with the point (3, 4) marked',
              }),
            ),
            ask('impl-slope-tree'),
            ask('impl-grad'),
            ask('impl-at-steps'),
            teach(
              prose(
                'For a single point it is often quicker to put the numbers in **before** rearranging. On $x^{2} + xy + y^{2} = 7$ at $(1, 2)$:',
              ),
              display('2x + y + x' + DYDX + ' + 2y' + DYDX + ' = 0'),
              display('2 + 2 + 1' + DYDX + ' + 4' + DYDX + ' = 0'),
              display('4 + 5' + DYDX + ' = 0 \\quad\\Rightarrow\\quad ' + DYDX + ' = -\\frac{4}{5}'),
            ),
            ask('impl-at-steps', 2),
            ask('impl-grad+choice', 2),
            ask('impl-tangent-tiles'),
            teach(
              prose(
                'The tangent then works as for any curve. On $x^{2} + y^{2} = 10$ at $(3, 1)$ the gradient is $-\\frac{3}{1} = -3$, so',
              ),
              display('y - 1 = -3(x - 3) \\quad\\Rightarrow\\quad y = -3x + 10'),
              prose('Check: $x = 3$ gives $y = -9 + 10 = 1$.'),
            ),
            ask('impl-tangent-tiles', 2),
            ask('impl-slope-tree', 2),
          ],
          skillCheck: [ask('impl-grad', 2), ask('impl-at-steps', 2), ask('impl-tangent-tiles', 2)],
        },
        {
          id: 'pi-l2-stationary',
          title: 'Horizontal and Vertical Tangents on Implicit Curves',
          slides: [
            teach(
              prose(
                'Where $' +
                  DYDX +
                  '$ is a fraction, the tangent is **horizontal** where the top is zero and **vertical** where the bottom is zero.',
              ),
              prose(
                'On $x^{2} + y^{2} = 25$, $' +
                  DYDX +
                  ' = -\\frac{x}{y}$: horizontal where $x = 0$, at $(0, 5)$ and $(0, -5)$, and vertical where $y = 0$, at $(5, 0)$ and $(-5, 0)$.',
              ),
              prose(
                'When the top is a sum such as $2x + 2y$, setting it to zero gives a line, $y = -x$. The horizontal tangents are where that line meets the curve.',
              ),
            ),
            ask('impl-tangent-kind'),
            ask('impl-flat-line'),
            ask('impl-stationary-flow'),
            teach(
              prose('To find the points, put the line into the curve\'s equation. For $x^{2} + 2xy + 2y^{2} = 4$:'),
              display(DYDX + ' = -\\frac{2x + 2y}{2x + 4y}'),
              prose('The top is zero on $y = -x$. Then $x^{2} - 2x^{2} + 2x^{2} = 4$, so $x^{2} = 4$ and the points are $(2, -2)$ and $(-2, 2)$.'),
              prose('The line on its own is not the answer: it is only where to look.'),
            ),
            ask('impl-flat-point'),
            ask('impl-stationary-flow', 2),
            ask('impl-tangent-kind', 2),
            teach(
              prose(
                'As with parametric curves, check the bottom is not zero at the same point. At $(2, -2)$ the bottom is $4 - 8 = -4$, so the tangent there really is horizontal.',
              ),
            ),
            ask('impl-flat-line+choice', 2),
            ask('impl-flat-point', 2),
          ],
          skillCheck: [ask('impl-flat-line', 2), ask('impl-stationary-flow', 2), ask('impl-flat-point', 2)],
        },
      ],
      levelCheck: [
        ask('impl-chain-term', 2),
        ask('impl-diff', 2),
        ask('impl-tangent-kind', 2),
        ask('impl-product-tiles', 2),
        ask('impl-at-steps', 2),
        ask('impl-coefficient', 2),
        ask('impl-stationary-flow', 2),
        ask('impl-term-tree', 2),
        ask('impl-collect-tiles', 2),
        ask('impl-grad+choice', 2),
        ask('impl-derive-steps', 2),
        ask('impl-tangent-tiles', 2),
        ask('impl-slope-tree', 2),
        ask('impl-flat-point', 2),
      ],
    },
  ],
};
