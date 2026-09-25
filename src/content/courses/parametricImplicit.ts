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
import { areaSvg, paramSvg } from '../generators/parametricImplicit';
import { level8 } from './parametric/level8';
import { level9 } from './parametric/level9';
import { level10 } from './parametric/level10';
import { level11 } from './parametric/level11';

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

/** A curve with the region between it and the x-axis shaded. */
const shaded = (
  f: (t: number) => [number, number],
  opts: Parameters<typeof areaSvg>[1],
): Block => ({ kind: 'diagram', svg: areaSvg(f, opts) });

const DYDX = '\\frac{dy}{dx}';
const DXDT = '\\frac{dx}{dt}';
const DYDT = '\\frac{dy}{dt}';
const D2YDX2 = '\\frac{d^2y}{dx^2}';
const D2YDT2 = '\\frac{d^2y}{dt^2}';
const D2XDT2 = '\\frac{d^2x}{dt^2}';
const DDT_DYDX = '\\frac{d}{dt}\\left(\\frac{dy}{dx}\\right)';

export const parametricImplicit: Course = {
  id: 'parametric-implicit',
  title: 'Parametric & Implicit Differentiation',
  // Its first two levels are shown in Parametric & Implicit Basics; see placement.ts.
  blurb: 'Second derivatives, tangents and normals, related rates and areas for parametric and implicit curves.',
  category: 'advanced-maths',
  // Before Further Integration (30); the rules it uses are taught in Advanced Algebra.
  position: 25,
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
              [
                prose(
                  'Going backwards, from a point to $t$: solve the equation that has only one $t$ for each value. On $x = t^{2} - 3$, $y = 2t$, for the point $(1, 4)$:',
                ),
                display('2t = 4, \\quad t = 2'),
                prose('Check in the other equation: $t = 2$ gives $x = 4 - 3 = 1$. It matches.'),
              ],
              'param-find-t',
            ),
            ask('param-point+choice', 2),
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
            ask('param-find-t+choice', 2),
            teach(
              prose(
                'A curve crosses the $y$-axis where $x = 0$. Solve $x = 0$ for $t$, then put that $t$ into $y$. On $x = 2t - 6$, $y = t^{2} + 1$:',
              ),
              display('2t - 6 = 0, \\quad t = 3'),
              display('y = 3^{2} + 1 = 10'),
              prose('So it crosses at $(0, 10)$. Setting $t = 0$ is the common slip: it gives $(-6, 1)$, not on the axis at all.'),
              prose(
                'The $x$-axis is where $y = 0$. On $x = t^{2} + 1$, $y = 3t - 6$: $3t - 6 = 0$ gives $t = 2$, then $x = 4 + 1 = 5$, so it crosses at $(5, 0)$.',
              ),
            ),
            ask('param-axis-tree'),
            ask('param-on-curve', 2),
            ask('param-axis-tree', 2),
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
            ask('param-eliminate+choice', 2),
            teach(
              prose(
                'When $x$ and $y$ use $\\cos t$ and $\\sin t$, making $t$ the subject is no help. Instead make $\\cos t$ and $\\sin t$ the subjects, then use',
              ),
              display('\\cos^{2} t + \\sin^{2} t = 1'),
              prose(
                'For $x = 3\\cos t + 1$, $y = 3\\sin t - 2$: $\\cos t = \\frac{x - 1}{3}$ and $\\sin t = \\frac{y + 2}{3}$. Square both and add:',
              ),
              display('\\frac{(x - 1)^{2}}{9} + \\frac{(y + 2)^{2}}{9} = 1'),
              prose('Multiply by $9$:'),
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
            ask('param-eliminate-flow'),
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
              [
                prose(
                  'At a single value of $t$, put $t$ into both rates first, then divide the numbers. On $x = t^{2} + 1$, $y = t^{3} - 3t$ at $t = 3$:',
                ),
                display('\\frac{dy}{dt} = 27 - 3 = 24'),
                display('\\frac{dx}{dt} = 2 \\times 3 = 6'),
                display(DYDX + ' = 24 \\div 6 = 4'),
              ],
              'param-slope-tree',
            ),
            teach(
              prose('The same rule works with $\\sin$ and $\\cos$. For $x = 2\\cos t$ and $y = 5\\sin t$:'),
              display('\\frac{dx}{dt} = -2\\sin t \\quad \\frac{dy}{dt} = 5\\cos t'),
              display(DYDX + ' = -\\frac{5\\cos t}{2\\sin t}'),
              prose('The minus sign from differentiating $\\cos t$ is the one most often lost.'),
            ),
            ask('param-gradient-trig'),
            ask('param-ratio-tiles', 2),
            ask('param-gradient+choice', 2),
            teach(
              prose(
                'A negative $t$ works the same way; keep it in brackets when it is squared. On $x = t^{2} + 1$, $y = t^{3} - 3t$, at $t = -2$:',
              ),
              display('\\frac{dy}{dt} = 3(-2)^{2} - 3 = 9'),
              display('\\frac{dx}{dt} = 2 \\times (-2) = -4'),
              display(DYDX + ' = 9 \\div (-4) = -\\frac{9}{4}'),
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
              display('y - 18 = 4(x - 10)'),
              display('y = 4x - 22'),
              prose('Check: $x = 10$ gives $y = 40 - 22 = 18$, the point you started from.'),
            ),
            ask('param-point'),
            ask('param-slope-tree'),
            ask('param-tangent'),
            teach(
              prose(
                'At angles like $\\frac{\\pi}{4}$ or $\\frac{\\pi}{3}$ the trigonometric rates have exact values. On $x = 2\\cos t$, $y = 5\\sin t$ at $t = \\frac{\\pi}{4}$:',
              ),
              display(DYDX + ' = -\\frac{5\\cos\\frac{\\pi}{4}}{2\\sin\\frac{\\pi}{4}}'),
              display('= -\\frac{5 \\times \\frac{\\sqrt{2}}{2}}{2 \\times \\frac{\\sqrt{2}}{2}} = -\\frac{5}{2}'),
              prose('The surds cancel because $\\sin\\frac{\\pi}{4}$ and $\\cos\\frac{\\pi}{4}$ are equal.'),
            ),
            askAfter(
              [
                prose(
                  'Past $\\frac{\\pi}{2}$ the signs differ. At $t = \\frac{3\\pi}{4}$, $\\cos t = -\\frac{\\sqrt{2}}{2}$ and $\\sin t = \\frac{\\sqrt{2}}{2}$, so on the same curve',
                ),
                display(DYDX + ' = -\\frac{5 \\times \\left(-\\frac{\\sqrt{2}}{2}\\right)}{2 \\times \\frac{\\sqrt{2}}{2}}'),
                display('= \\frac{5}{2}'),
                prose(
                  'The two minus signs cancel. At $\\frac{5\\pi}{4}$ both are negative, so the signs work as at $\\frac{\\pi}{4}$. At $\\frac{7\\pi}{4}$ only $\\sin t$ is negative, so they work as at $\\frac{3\\pi}{4}$.',
                ),
              ],
              'param-trig-slope',
            ),
            ask('param-tangent', 2),
            ask('param-point+choice', 2),
            teach(
              prose('When the surds do not cancel, the gradient can still come out whole or as a fraction. On $x = 3t$, $y = 4\\sin t$ at $t = \\frac{\\pi}{3}$:'),
              display('\\frac{dy}{dt} = 4\\cos\\frac{\\pi}{3} = 2'),
              display('\\frac{dx}{dt} = 3 \\qquad ' + DYDX + ' = \\frac{2}{3}'),
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
              display('\\frac{d}{dx}\\left(x^{3}\\right) = 3x^{2}'),
              display('\\frac{d}{dx}\\left(y^{3}\\right) = 3y^{2}' + DYDX),
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
              display('\\frac{-2x - y}{x + 2y} = -\\frac{2x + y}{x + 2y}'),
              display('= \\frac{2x + y}{-x - 2y}'),
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
              display('4 + 5' + DYDX + ' = 0'),
              display(DYDX + ' = -\\frac{4}{5}'),
            ),
            ask('impl-at-steps', 2),
            ask('impl-grad+choice', 2),
            teach(
              prose(
                'The tangent then works as for any curve. On $x^{2} + y^{2} = 10$ at $(3, 1)$ the gradient is $-\\frac{3}{1} = -3$, so',
              ),
              display('y - 1 = -3(x - 3)'),
              display('y = -3x + 10'),
              prose('Check: $x = 3$ gives $y = -9 + 10 = 1$.'),
            ),
            ask('impl-tangent-tiles'),
            ask('impl-slope-tree', 2),
            ask('impl-tangent-tiles', 2),
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
            teach(
              prose('To find the points, put the line into the curve\'s equation. For $x^{2} + 2xy + 2y^{2} = 4$:'),
              display(DYDX + ' = -\\frac{2x + 2y}{2x + 4y}'),
              prose('The top is zero on $y = -x$. Put $y = -x$ into the curve:'),
              display('x^{2} + 2x(-x) + 2(-x)^{2} = 4'),
              display('x^{2} = 4, \\quad x = \\pm 2'),
              prose('Then $y = -x$ gives the points $(2, -2)$ and $(-2, 2)$. The line on its own is not the answer: it is only where to look.'),
            ),
            ask('impl-stationary-flow'),
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
    {
      id: 'pi-l3',
      title: 'Second Derivatives of Parametric & Implicit Curves',
      lessons: [
        {
          id: 'pi-l3-formula',
          title: 'The Second Derivative of a Parametric Curve',
          slides: [
            teach(
              prose(
                '$' +
                  D2YDX2 +
                  '$ is how fast the gradient changes as $x$ moves. The gradient is already known in terms of $t$, so differentiate **it** with respect to $t$, then divide by $' +
                  DXDT +
                  '$ to turn a rate per unit of $t$ into one per unit of $x$:',
              ),
              display(D2YDX2 + ' = ' + DDT_DYDX + ' \\div ' + DXDT),
              prose('For $x = 2t + 1$, $y = t^{3}$: the gradient is $\\frac{3t^{2}}{2}$, its derivative is $3t$, and dividing by $2$ gives'),
              display(D2YDX2 + ' = \\frac{3t}{2}'),
            ),
            ask('param-d2-flow'),
            ask('param-d2-tiles'),
            ask('param-d2'),
            teach(
              prose(
                'It is tempting to divide $\\frac{d^2y}{dt^2}$ by $\\frac{d^2x}{dt^2}$. On $x = 2t + 1$ that is dividing by $0$: $x$ changes at a steady rate, so its second derivative vanishes, yet the curve still bends.',
              ),
              prose(
                'The step most often lost is the last one. $' +
                  DDT_DYDX +
                  '$ is not the answer until it has been divided by $' +
                  DXDT +
                  '$.',
              ),
            ),
            ask('param-d2+choice', 2),
            ask('param-d2-tiles', 2),
            teach(
              prose('The same route works with sines and cosines. For $x = 2\\cos t$, $y = 3\\sin t$:'),
              display(DXDT + ' = -2\\sin t \\qquad ' + DYDT + ' = 3\\cos t'),
              display(DYDX + ' = -\\frac{3\\cos t}{2\\sin t} = -\\frac{3}{2}\\cot t'),
              prose('$\\cot t$ differentiates to $-\\operatorname{cosec}^{2} t$, which is $-\\frac{1}{\\sin^{2} t}$, so'),
              display(DDT_DYDX + ' = \\frac{3}{2\\sin^{2} t}'),
              prose('Dividing by $' + DXDT + ' = -2\\sin t$:'),
              display(D2YDX2 + ' = -\\frac{3}{4\\sin^{3} t}'),
            ),
            ask('param-d2-trig'),
            ask('param-d2-trig+choice', 2),
            ask('param-d2-flow', 2),
          ],
          skillCheck: [ask('param-d2', 2), ask('param-d2-tiles', 2), ask('param-d2-trig', 2)],
        },
        {
          id: 'pi-l3-value',
          title: 'The Second Derivative at a Point',
          slides: [
            teach(
              prose(
                'When $x$ is not linear, $' +
                  DYDX +
                  '$ is a fraction in $t$ and differentiating it needs the quotient rule. At a single value of $t$ it is easiest in numbers.',
              ),
              prose('For $x = t^{2}$, $y = t^{3} - 4t$ at $t = 1$: $' + DXDT + ' = 2$, $' + DYDT + ' = -1$, $' + D2XDT2 + ' = 2$, $' + D2YDT2 + ' = 6$.'),
              prose('The quotient rule on $' + DYDT + ' \\div ' + DXDT + '$ gives'),
              display('\\frac{6 \\times 2 - (-1) \\times 2}{2^{2}} = \\frac{7}{2}'),
              display(D2YDX2 + ' = \\frac{7}{2} \\div 2 = \\frac{7}{4}'),
            ),
            ask('param-d2-rates-tree'),
            ask('param-d2-quotient-steps'),
            ask('param-d2-at'),
            teach(
              prose('Both steps together give one formula, with $' + DXDT + '$ cubed underneath: squared from the quotient rule, once more for the last division.'),
              display(D2YDX2 + ' = \\frac{' + D2YDT2 + DXDT + ' - ' + DYDT + D2XDT2 + '}{\\left(' + DXDT + '\\right)^{3}}'),
              prose(
                'In terms of $t$ it often tidies up a lot. For $x = t^{2}$, $y = t^{3} + 5t$: $' +
                  DXDT +
                  ' = 2t$, $' +
                  DYDT +
                  ' = 3t^{2} + 5$, $' +
                  D2XDT2 +
                  ' = 2$ and $' +
                  D2YDT2 +
                  ' = 6t$.',
              ),
              display(D2YDX2 + ' = \\frac{6t \\times 2t - (3t^{2} + 5) \\times 2}{(2t)^{3}}'),
              display('= \\frac{6t^{2} - 10}{8t^{3}} = \\frac{3t^{2} - 5}{4t^{3}}'),
            ),
            ask('param-d2-general'),
            ask('param-d2-at+choice', 2),
            ask('param-d2-rates-tree', 2),
            teach(
              prose('The formula in $t$ and the numbers at one point agree. At $t = 1$ on the curve above:'),
              display(D2YDX2 + ' = \\frac{3 - 5}{4} = -\\frac{1}{2}'),
              prose('In numbers, at $t = 1$: $' + DXDT + ' = 2$, $' + DYDT + ' = 8$, $' + D2XDT2 + ' = 2$ and $' + D2YDT2 + ' = 6$, so'),
              display('\\frac{6 \\times 2 - 8 \\times 2}{2^{3}} = -\\frac{4}{8} = -\\frac{1}{2}'),
            ),
            ask('param-d2-quotient-steps', 2),
            ask('param-d2-general+choice', 2),
          ],
          skillCheck: [ask('param-d2-at', 2), ask('param-d2-rates-tree', 2), ask('param-d2-general', 2)],
        },
        {
          id: 'pi-l3-concavity',
          title: 'Concavity and Turning Points',
          slides: [
            teach(
              prose(
                'The sign of $' +
                  D2YDX2 +
                  '$ says which way the curve bends: positive is **concave up**, like a cup, and negative is **concave down**, like a cap.',
              ),
              prose(
                'Work it out with the formula from The Second Derivative at a Point. On $x = 2t + 1$, $y = t^{3} + t^{2}$ at $t = 1$: $' +
                  DXDT +
                  ' = 2$, $' +
                  DYDT +
                  ' = 5$, $' +
                  D2XDT2 +
                  ' = 0$ and $' +
                  D2YDT2 +
                  ' = 8$.',
              ),
              display(D2YDX2 + ' = \\frac{8 \\times 2 - 5 \\times 0}{2^{3}} = \\frac{16}{8} = 2'),
              prose('Positive, so the curve is concave up there.'),
            ),
            ask('param-concave-choice'),
            teach(
              prose(
                'At a horizontal tangent $' +
                  DYDT +
                  ' = 0$, so half of the quotient rule vanishes and what is left is',
              ),
              display(D2YDX2 + ' = ' + D2YDT2 + ' \\div \\left(' + DXDT + '\\right)^{2}'),
              prose(
                'On $x = 2t$, $y = t^{3} - 3t$: $' +
                  DYDT +
                  ' = 3t^{2} - 3$ is zero at $t = 1$ and $t = -1$, and $' +
                  D2YDT2 +
                  ' = 6t$.',
              ),
              display('t = 1: \\; 6 \\div 2^{2} = \\frac{3}{2}'),
              display('t = -1: \\; -6 \\div 2^{2} = -\\frac{3}{2}'),
              prose(
                'The square is positive, so the sign is the sign of $' +
                  D2YDT2 +
                  '$. This is the second-derivative test from Differentiation: concave up at $t = 1$, a minimum; concave down at $t = -1$, a maximum.',
              ),
            ),
            ask('param-turning-tree'),
            ask('param-lowest-slider'),
            ask('param-nature-flow'),
            ask('param-turning-tree', 2),
            teach(
              prose(
                'Away from a horizontal tangent the whole formula is needed. Its bottom is $\\left(' +
                  DXDT +
                  '\\right)^{3}$, which is negative wherever $x$ is decreasing, so the top alone does not decide the sign.',
              ),
              prose(
                'On $x = t^{2}$, $y = t^{3}$ at $t = -1$: $' +
                  DXDT +
                  ' = -2$, $' +
                  DYDT +
                  ' = 3$, $' +
                  D2XDT2 +
                  ' = 2$ and $' +
                  D2YDT2 +
                  ' = -6$.',
              ),
              display('\\text{top} = (-6)(-2) - (3)(2) = 6'),
              display('\\text{bottom} = (-2)^{3} = -8'),
              prose('So $' + D2YDX2 + ' = -\\frac{6}{8} = -\\frac{3}{4}$: concave down, though the top was positive.'),
            ),
            ask('param-concave-choice', 2),
            ask('param-lowest-slider', 2),
            ask('param-nature-flow', 2),
          ],
          skillCheck: [ask('param-concave-choice', 2), ask('param-turning-tree', 2), ask('param-nature-flow', 2)],
        },
        {
          id: 'pi-l3-implicit',
          title: 'The Second Derivative of an Implicit Curve',
          slides: [
            teach(
              prose(
                'For an implicit curve, differentiate $' +
                  DYDX +
                  '$ again with respect to $x$, remembering $y$ is a function of $x$. On the circle $x^{2} + y^{2} = 25$ the gradient is $-\\frac{x}{y}$, and the quotient rule gives',
              ),
              display(D2YDX2 + ' = -\\frac{y - x' + DYDX + '}{y^{2}}'),
              prose('A $' + DYDX + '$ is left in it, so put the gradient back in.'),
            ),
            ask('impl-d2-tiles'),
            teach(
              prose('Put in $' + DYDX + ' = -\\frac{x}{y}$:'),
              display(D2YDX2 + ' = -\\frac{y + \\frac{x^{2}}{y}}{y^{2}}'),
              prose('Multiply top and bottom by $y$:'),
              display(D2YDX2 + ' = -\\frac{y^{2} + x^{2}}{y^{3}}'),
              prose('The top is the circle\'s own left-hand side, so it is $25$:'),
              display(D2YDX2 + ' = -\\frac{25}{y^{3}}'),
            ),
            ask('impl-d2-sub-steps'),
            askAfter(
              [
                prose('The same steps on $2x^{2} + y^{2} = 6$, where $' + DYDX + ' = -\\frac{2x}{y}$:'),
                display(D2YDX2 + ' = -2 \\times \\frac{y - x' + DYDX + '}{y^{2}}'),
                display('= -2 \\times \\frac{y^{2} + 2x^{2}}{y^{3}} = -\\frac{12}{y^{3}}'),
                prose('At $(1, 2)$ that is $-\\frac{12}{8} = -\\frac{3}{2}$.'),
              ],
              'impl-d2-at',
            ),
            ask('impl-d2-point-tree'),
            ask('impl-d2-at+choice', 2),
            teach(
              prose(
                'The sign fits the picture. Above the $x$-axis $y > 0$, so $' +
                  D2YDX2 +
                  ' < 0$ and the top of the circle bends down; below it the bottom bends up.',
              ),
              prose('On an ellipse $Ax^{2} + By^{2} = C$ the same steps give $-\\frac{AC}{B^{2}y^{3}}$.'),
            ),
            ask('impl-d2-tiles', 2),
            ask('impl-d2-sub-steps', 2),
            ask('impl-d2-point-tree', 2),
          ],
          skillCheck: [ask('impl-d2-at', 2), ask('impl-d2-tiles', 2), ask('impl-d2-sub-steps', 2)],
        },
        {
          id: 'pi-l3-turning',
          title: 'Turning Points on Implicit Curves',
          slides: [
            teach(
              prose(
                'Differentiating once gives $N + D' +
                  DYDX +
                  ' = 0$, where $D$ is everything multiplying $' +
                  DYDX +
                  '$ and $N$ is the rest. Differentiate that again: every term that comes out carries a $' +
                  DYDX +
                  '$ except two, so where $' +
                  DYDX +
                  ' = 0$ only those two are left.',
              ),
              display('N_x + D' + D2YDX2 + ' = 0'),
              prose(
                'Here $N_x$ is $N$ differentiated with respect to $x$ with $y$ held still. So at a horizontal tangent',
              ),
              display(D2YDX2 + ' = -\\frac{N_x}{D}'),
            ),
            askAfter(
              [
                prose('On $x^{2} + xy + y^{2} = 3$, differentiating once gives'),
                display('(2x + y) + (x + 2y)' + DYDX + ' = 0'),
                prose(
                  'So $N = 2x + y$ and $D = x + 2y$. At $(1, -2)$, $N = 2 - 2 = 0$: a horizontal tangent. There $D = 1 - 4 = -3$, and holding $y$ still, $N_x = 2$:',
                ),
                display(D2YDX2 + ' = -\\frac{2}{-3} = \\frac{2}{3}'),
                prose('Positive: concave up, so $(1, -2)$ is a local minimum.'),
              ],
              'impl-turning-flow',
            ),
            ask('impl-turning-tree'),
            ask('impl-turning-value'),
            teach(
              prose(
                'A curve often has two horizontal tangents. $x^{2} + xy + y^{2} = 3$ has a second at $(-1, 2)$, where $N = -2 + 2 = 0$. Work each point out on its own:',
              ),
              display('(1, -2): \\; D = -3, \\quad ' + D2YDX2 + ' = \\frac{2}{3}'),
              display('(-1, 2): \\; D = 3, \\quad ' + D2YDX2 + ' = -\\frac{2}{3}'),
              prose('So $(1, -2)$ is a local minimum and $(-1, 2)$ a local maximum. The picture can be misleading on a tilted curve; the sign of $D$ is not.'),
            ),
            ask('impl-turning-kind'),
            ask('impl-turning-kind', 2),
            teach(
              prose(
                'When $N$ has a power of $x$, $N_x$ is not a plain number. On $x^{3} + 2xy + y^{2} = 20$ at $(2, -6)$:',
              ),
              display('N = 3x^{2} + 2y = 12 - 12 = 0'),
              display('D = 2x + 2y = 4 - 12 = -8'),
              prose('Holding $y$ still, $N_x = 6x = 12$. So $' + D2YDX2 + ' = -\\frac{12}{-8} = \\frac{3}{2}$: concave up, a local minimum.'),
            ),
            ask('impl-turning-value+choice', 2),
            ask('impl-turning-tree', 2),
            ask('impl-turning-flow', 2),
          ],
          skillCheck: [ask('impl-turning-value', 2), ask('impl-turning-tree', 2), ask('impl-turning-flow', 2)],
        },
      ],
      levelCheck: [
        ask('param-d2', 2),
        ask('param-d2-rates-tree', 2),
        ask('param-concave-choice', 2),
        ask('impl-d2-at', 2),
        ask('impl-turning-tree', 2),
        ask('param-d2-trig', 2),
        ask('param-d2-quotient-steps', 2),
        ask('param-lowest-slider', 2),
        ask('impl-d2-sub-steps', 2),
        ask('impl-turning-kind', 2),
        ask('param-d2-tiles', 2),
        ask('param-d2-at+choice', 2),
        ask('param-nature-flow', 2),
        ask('impl-d2-point-tree', 2),
      ],
    },
    {
      id: 'pi-l4',
      title: 'Tangents & Normals to Parametric & Implicit Curves',
      lessons: [
        {
          id: 'pi-l4-normal',
          title: 'The Normal at a Parametric Point',
          slides: [
            teach(
              prose(
                'The **normal** at a point is the line through it at right angles to the tangent. You found tangents in Parametric Curves; two lines are at right angles when their gradients multiply to $-1$, so where the tangent has gradient $m$ the normal has gradient $-\\frac{1}{m}$.',
              ),
              prose('On $x = t^{2} + 1$, $y = t^{3} - 3t$ at $t = 3$ the point is $(10, 18)$ and the tangent\'s gradient is $4$, so the normal\'s is $-\\frac{1}{4}$.'),
            ),
            ask('param-normal-tree'),
            ask('param-normal-grad'),
            ask('param-normal-grad+choice', 2),
            teach(
              prose('Write the normal through the point, then multiply by $4$ to clear the fraction:'),
              display('y - 18 = -\\frac{1}{4}(x - 10)'),
              display('4y - 72 = -x + 10'),
              display('x + 4y = 82'),
              prose('That is always the shape: with tangent gradient $m$ at $(x_1, y_1)$ the normal is $x + my = x_1 + my_1$.'),
            ),
            ask('param-normal-tiles'),
            ask('param-normal-flow'),
            ask('param-normal-tree', 2),
            teach(
              prose(
                'Check a normal the way you check a tangent: the point must satisfy it. $10 + 4 \\times 18 = 82$. And keep the two apart: the tangent is $y = 4x - 22$, gradient $4$; the normal is $x + 4y = 82$, gradient $-\\frac{1}{4}$.',
              ),
            ),
            ask('param-normal-tiles', 2),
            ask('param-normal-flow', 2),
          ],
          skillCheck: [ask('param-normal-grad', 2), ask('param-normal-tiles', 2), ask('param-normal-tree', 2)],
        },
        {
          id: 'pi-l4-implicit',
          title: 'Normals to Implicit Curves',
          slides: [
            teach(
              prose(
                'On an implicit curve the tangent\'s gradient at a point comes from differentiating implicitly, as in Implicit Differentiation. The normal\'s is $-1$ over it: the fraction turned over, with its sign changed.',
              ),
              prose('On the circle $x^{2} + y^{2} = 25$ at $(3, 4)$ the tangent has gradient $-\\frac{3}{4}$, so the normal has gradient $\\frac{4}{3}$.'),
              figure((t) => [5 * Math.cos(t), 5 * Math.sin(t)], {
                span: 7,
                tMin: 0,
                tMax: 2 * Math.PI,
                marks: [[3, 4]],
                label: 'The circle x squared plus y squared equals 25, with the point (3, 4) marked',
              }),
            ),
            askAfter(
              [
                prose(
                  'An $xy$ term needs the product rule: $xy$ gives $y + x' +
                    DYDX +
                    '$. On $x^{2} + xy + y^{2} = 7$ at $(1, 2)$, put the numbers in straight away:',
                ),
                display('2x + y + x' + DYDX + ' + 2y' + DYDX + ' = 0'),
                display('2 + 2 + ' + DYDX + ' + 4' + DYDX + ' = 0'),
                display(DYDX + ' = -\\frac{4}{5}'),
                prose('So the normal has gradient $\\frac{5}{4}$.'),
              ],
              'impl-normal-grad',
            ),
            ask('impl-normal-steps'),
            teach(
              prose('On $x^{2} - y^{2} = 32$ at $(6, 2)$:'),
              display('2x - 2y' + DYDX + ' = 0'),
              display(DYDX + ' = \\frac{x}{y} = \\frac{6}{2} = 3'),
              prose('The normal has gradient $-\\frac{1}{3}$. Through $(6, 2)$, then multiply by $3$:'),
              display('y - 2 = -\\frac{1}{3}(x - 6)'),
              display('3y - 6 = -x + 6'),
              display('x + 3y = 12'),
            ),
            ask('impl-normal-tiles'),
            ask('impl-normal-line'),
            ask('impl-normal-steps', 2),
            ask('impl-normal-grad+choice', 2),
            teach(
              prose(
                'Back on the circle, the normal at $(3, 4)$ is $y - 4 = \\frac{4}{3}(x - 3)$, which is $y = \\frac{4}{3}x$: it runs through the centre. Every normal to a circle does, because the radius meets the tangent at right angles.',
              ),
            ),
            ask('impl-normal-tiles', 2),
            ask('impl-normal-line', 2),
          ],
          skillCheck: [ask('impl-normal-grad', 2), ask('impl-normal-tiles', 2), ask('impl-normal-steps', 2)],
        },
        {
          id: 'pi-l4-general',
          title: 'The Tangent at a General Point',
          slides: [
            teach(
              prose(
                'Leave $t$ as a letter and one equation gives the tangent at every point at once. On $x = 3t^{2}$, $y = 6t$ the gradient is $\\frac{6}{6t} = \\frac{1}{t}$, so at the point with parameter $t$',
              ),
              display('y - 6t = \\frac{1}{t}(x - 3t^{2})'),
              prose('Multiply by $t$ and tidy:'),
              display('ty - 6t^{2} = x - 3t^{2}'),
              display('ty = x + 3t^{2}'),
              prose('One equation answers every point: at $t = 2$ it is $2y = x + 12$, which meets the $y$-axis, where $x = 0$, at $y = 6$.'),
            ),
            ask('param-line-in-t'),
            ask('param-tangent-t-steps'),
            ask('param-at-k-tree'),
            teach(
              prose('The normal\'s gradient in $t$ comes the same way. On $x = 2t$, $y = \\frac{2}{t}$:'),
              display(DXDT + ' = 2 \\qquad ' + DYDT + ' = -\\frac{2}{t^{2}}'),
              display(DYDX + ' = -\\frac{2}{t^{2}} \\div 2 = -\\frac{1}{t^{2}}'),
              prose('Turn it over and change the sign: the normal has gradient $t^{2}$. The tangent, multiplied by $t^{2}$ to clear the fraction:'),
              display('y - \\frac{2}{t} = -\\frac{1}{t^{2}}(x - 2t)'),
              display('t^{2}y - 2t = -x + 2t'),
              display('x + t^{2}y = 4t'),
            ),
            ask('param-normal-in-t'),
            ask('param-normal-in-t+choice', 2),
            teach(
              prose('The normal\'s equation in $t$ is built like the tangent\'s. On $x = 2t$, $y = t^{2}$ the gradient is $\\frac{2t}{2} = t$, so the normal\'s is $-\\frac{1}{t}$:'),
              display('y - t^{2} = -\\frac{1}{t}(x - 2t)'),
              prose('Multiply by $t$ and tidy:'),
              display('ty - t^{3} = -x + 2t'),
              display('x + ty = 2t + t^{3}'),
            ),
            ask('param-line-in-t', 2),
            ask('param-tangent-t-steps', 2),
            ask('param-at-k-tree', 2),
          ],
          skillCheck: [ask('param-line-in-t', 2), ask('param-normal-in-t', 2), ask('param-tangent-t-steps', 2)],
        },
        {
          id: 'pi-l4-meet',
          title: 'Meeting the Axes and the Curve Again',
          slides: [
            teach(
              prose(
                'A tangent or normal crosses the $x$-axis where $y = 0$ and the $y$-axis where $x = 0$. On $x = t^{2} + 1$, $y = t^{3} - 3t$ at $t = 3$ the point is $(10, 18)$ and the gradient $24 \\div 6 = 4$, so the tangent is',
              ),
              display('y - 18 = 4(x - 10)'),
              display('y = 4x - 22'),
              prose('$y = 0$ gives $4x = 22$, so $x = 5.5$. $x = 0$ gives $y = -22$.'),
              prose(
                'With the origin those make a right-angled triangle, whose area is half the base times the height: $\\frac{1}{2} \\times 5.5 \\times 22 = 60.5$. The normal there, $x + 4y = 82$, crosses at $(82, 0)$ and $(0, 20.5)$ the same way.',
              ),
            ),
            ask('param-cross-slider'),
            ask('param-triangle-area'),
            ask('param-triangle-area+choice', 2),
            teach(
              prose('A normal can cut the curve a second time. On $x = t^{2}$, $y = 2t$ the normal at $t = 1$ is $x + y = 3$. Put the curve into it:'),
              display('t^{2} + 2t - 3 = 0'),
              prose('$t = 1$ is a root, since the normal starts on the curve. For $pt^{2} + qt + r = 0$ the roots add up to $-\\frac{q}{p}$, here $-2$, so the other root is $-2 - 1 = -3$: the point $(9, -6)$.'),
              figure((t) => [t * t, 2 * t], {
                span: 10,
                tMin: -4,
                tMax: 4,
                marks: [
                  [1, 2],
                  [9, -6],
                ],
                label: 'The curve x equals t squared, y equals 2t, with the points (1, 2) and (9, -6) marked',
              }),
            ),
            ask('param-again-tree'),
            ask('param-meet-flow'),
            ask('param-cross-slider', 2),
            teach(
              prose(
                'Knowing one root is what makes this quick: there is no need to factorise. On $x = at^{2}$, $y = 2at$ the normal at $t = k$ always meets the curve again at $t = -k - \\frac{2}{k}$. At $k = 1$ that is $-1 - 2 = -3$, as above.',
              ),
            ),
            ask('param-again-tree', 2),
            ask('param-meet-flow', 2),
          ],
          skillCheck: [ask('param-triangle-area', 2), ask('param-again-tree', 2), ask('param-meet-flow', 2)],
        },
        {
          id: 'pi-l4-given',
          title: 'Tangents with a Given Gradient',
          slides: [
            teach(
              prose(
                'Parallel lines have equal gradients. To find where a tangent is parallel to $y = 3x + 1$, set $' + DYDX + ' = 3$, which is $' + DYDT + ' = 3' + DXDT + '$.',
              ),
              prose('On $x = t + 1$, $y = t^{2} - t$ that is $2t - 1 = 3$, so $t = 2$: the point $(3, 2)$, and the tangent there is $y = 3x - 7$.'),
            ),
            askAfter(
              [
                prose('A line written $ax + by = c$ has to be rearranged for $y$ to read its gradient. For $6x + 3y = 4$:'),
                display('3y = -6x + 4'),
                display('y = -2x + \\frac{4}{3}'),
                prose('So its gradient is $-2$. In one step, $ax + by = c$ has gradient $-\\frac{a}{b}$: here $-\\frac{6}{3} = -2$.'),
              ],
              'param-parallel-t',
            ),
            ask('param-parallel-steps'),
            ask('param-given-tiles'),
            teach(
              prose(
                'Perpendicular gradients multiply to $-1$. The line $x + 2y = 5$ is $y = -\\frac{1}{2}x + \\frac{5}{2}$, gradient $-\\frac{1}{2}$, so a tangent at right angles to it needs gradient $2$.',
              ),
              prose('On $x = t + 1$, $y = t^{2} - t$ that is $2t - 1 = 2$, so $t = \\frac{3}{2}$.'),
            ),
            ask('param-parallel-t+choice', 2),
            ask('param-parallel-steps', 2),
            ask('param-given-tiles', 2),
            teach(
              prose('On an implicit curve the same condition picks out points. On $x^{2} + 3y^{2} = 12$ the gradient is $-\\frac{x}{3y}$; it is $1$ where $x = -3y$.'),
              prose('Substitute: $9y^{2} + 3y^{2} = 12$, so $y = \\pm 1$, at $(-3, 1)$ and $(3, -1)$. On a circle or ellipse centred at the origin these points always come in a pair, each the other reflected through the origin.'),
            ),
            ask('impl-slope-points'),
            ask('impl-slope-points', 2),
          ],
          skillCheck: [ask('param-parallel-t', 2), ask('param-given-tiles', 2), ask('impl-slope-points', 2)],
        },
      ],
      levelCheck: [
        ask('param-normal-tree', 2),
        ask('impl-normal-grad', 2),
        ask('param-line-in-t', 2),
        ask('param-cross-slider', 2),
        ask('param-parallel-t', 2),
        ask('impl-normal-line', 2),
        ask('param-tangent-t-steps', 2),
        ask('param-again-tree', 2),
        ask('param-normal-tiles', 2),
        ask('param-triangle-area+choice', 2),
        ask('impl-normal-steps', 2),
        ask('param-normal-in-t', 2),
        ask('impl-slope-points', 2),
        ask('param-meet-flow', 2),
      ],
    },
    {
      id: 'pi-l5',
      title: 'Implicit Differentiation of Exponentials & Inverses',
      lessons: [
        {
          id: 'pi-l5-exponential',
          title: 'Exponentials with Any Base',
          slides: [
            teach(
              prose(
                'The power rule needs a constant power, so it cannot differentiate $y = 2^{x}$. Take logarithms instead: the power comes down, and $\\ln y$ differentiates as in Differentiating Terms in y.',
              ),
              display('\\ln y = x\\ln 2'),
              display('\\frac{1}{y}' + DYDX + ' = \\ln 2'),
              prose('$\\ln 2$ is only a number. Multiply by $y$:'),
              display(DYDX + ' = 2^{x}\\ln 2'),
              prose(
                'At $x = 3$, $y = 2^{3} = 8$, so the gradient is $8\\ln 2$, a little over $5.5$. $\\ln 2$ stays in the answer. The power rule used by mistake, $x \\times 2^{x - 1}$, would give $12$.',
              ),
            ),
            ask('impl-ax-at-tree'),
            teach(
              prose('A number times $x$ in the power comes down too. For $y = 3^{2x}$:'),
              display('\\ln y = 2x\\ln 3'),
              display('\\frac{1}{y}' + DYDX + ' = 2\\ln 3'),
              display(DYDX + ' = 2\\ln 3 \\times 3^{2x}'),
              prose(
                'It agrees with From b^t to e^kt: $3^{2x} = e^{2x\\ln 3}$, and Exponentials and Logarithms differentiates $e^{kx}$ to $ke^{kx}$ with $k = 2\\ln 3$.',
              ),
            ),
            ask('impl-ax-grad'),
            ask('impl-ax-log-steps'),
            ask('impl-ax-tiles'),
            ask('impl-ax-at-tree', 2),
            teach(
              prose('A number in front stays in front. For $y = 2 \\times 7^{x}$ the logarithm of the product is a sum:'),
              display('\\ln y = \\ln 2 + x\\ln 7'),
              prose('$\\ln 2$ is a constant, so it differentiates to $0$:'),
              display('\\frac{1}{y}' + DYDX + ' = \\ln 7'),
              display(DYDX + ' = 2 \\times 7^{x}\\ln 7'),
            ),
            ask('impl-ax-grad+choice', 2),
            ask('impl-ax-log-steps', 2),
            ask('impl-ax-tiles', 2),
          ],
          skillCheck: [ask('impl-ax-grad', 2), ask('impl-ax-tiles', 2), ask('impl-ax-at-tree', 2)],
        },
        {
          id: 'pi-l5-arcsin',
          title: 'The Inverse Sine',
          slides: [
            teach(
              prose(
                '$y = \\sin^{-1} x$ means $\\sin y = x$, with $y$ between $-\\frac{\\pi}{2}$ and $\\frac{\\pi}{2}$ (Undoing Sine). Differentiate both sides:',
              ),
              display('\\cos y\\,' + DYDX + ' = 1'),
              prose(
                'On that range $\\cos y$ is never negative, so $\\cos y = \\sqrt{1 - \\sin^2 y} = \\sqrt{1 - x^2}$, and',
              ),
              display(DYDX + ' = \\frac{1}{\\sqrt{1 - x^2}}'),
              figure((t) => [t, Math.asin(t)], {
                span: 2,
                tMin: -1,
                tMax: 1,
                marks: [[0.6, Math.asin(0.6)]],
                label: 'The curve y equals inverse sine of x, from x equals minus 1 to 1, with the point where x is 0.6 marked',
              }),
            ),
            ask('impl-arcsin-derive-steps'),
            ask('impl-arcsin-at-tree'),
            ask('impl-arcsin-grad'),
            teach(
              prose(
                '$y = \\cos^{-1} x$ means $\\cos y = x$, with $y$ between $0$ and $\\pi$. Differentiating gives $-\\sin y\\,' + DYDX + ' = 1$, and there $\\sin y$ is never negative:',
              ),
              display(DYDX + ' = -\\frac{1}{\\sqrt{1 - x^2}}'),
              prose('The two gradients are negatives of each other, since $\\sin^{-1} x + \\cos^{-1} x = \\frac{\\pi}{2}$ is a constant.'),
            ),
            ask('impl-inverse-sign-flow'),
            ask('impl-arcsin-grad+choice', 2),
            ask('impl-arcsin-at-tree', 2),
            teach(
              prose(
                'At $x = \\frac{3}{5}$, $1 - x^2 = \\frac{16}{25}$, a square, so the gradient is $\\frac{5}{4}$ exactly. Any $x$ from a Pythagorean triple works the same way: at $x = \\frac{5}{13}$ it is $\\frac{13}{12}$.',
              ),
              prose('The gradient is never less than $1$, and it grows without limit near $x = \\pm 1$, where the curve stands upright.'),
            ),
            ask('impl-arcsin-derive-steps', 2),
            ask('impl-inverse-sign-flow', 2),
          ],
          skillCheck: [ask('impl-arcsin-grad', 2), ask('impl-arcsin-at-tree', 2), ask('impl-inverse-sign-flow', 2)],
        },
        {
          id: 'pi-l5-arctan',
          title: 'The Inverse Tangent',
          slides: [
            teach(
              prose('$y = \\tan^{-1} x$ means $\\tan y = x$. Differentiate both sides:'),
              display('\\sec^2 y\\,' + DYDX + ' = 1'),
              prose('Use $1 + \\tan^2 y = \\sec^2 y$ (Reciprocal Graphs and Two Identities): $\\sec^2 y = 1 + x^2$, so'),
              display(DYDX + ' = \\frac{1}{1 + x^2}'),
              figure((t) => [t, Math.atan(t)], {
                span: 4,
                tMin: -4,
                tMax: 4,
                marks: [[0, 0]],
                label: 'The curve y equals inverse tangent of x, levelling off to the left and right, with the origin marked',
              }),
            ),
            ask('impl-arctan-grad'),
            ask('impl-arctan-sec-tiles'),
            ask('impl-arctan-at-tree'),
            teach(
              prose(
                'The gradient is always positive and never more than $1$: it is $1$ at the origin and falls away on both sides as $1 + x^2$ grows. So $y = 3\\tan^{-1} x$ has gradient $\\frac{3}{1 + x^2}$, never more than $3$.',
              ),
              prose('It has gradient $\\frac{3}{10}$ where $1 + x^2 = 10$: at $x = 3$ and at $x = -3$.'),
            ),
            ask('impl-arctan-where'),
            ask('impl-arctan-grad+choice', 2),
            ask('impl-arctan-at-tree', 2),
            teach(
              prose('The same working handles $\\tan y = 3x$. The right-hand side now differentiates to $3$:'),
              display('\\sec^2 y\\,' + DYDX + ' = 3'),
              prose('And $\\sec^2 y = 1 + \\tan^2 y = 1 + (3x)^2 = 1 + 9x^2$, so'),
              display(DYDX + ' = \\frac{3}{1 + 9x^2}'),
              prose('At $x = 1$: $\\tan y = 3$, $\\sec^2 y = 1 + 9 = 10$, and the gradient is $\\frac{3}{10}$.'),
            ),
            ask('impl-arctan-sec-tiles', 2),
            ask('impl-arctan-where', 2),
          ],
          skillCheck: [ask('impl-arctan-grad', 2), ask('impl-arctan-sec-tiles', 2), ask('impl-arctan-where', 2)],
        },
        {
          id: 'pi-l5-logdiff',
          title: 'Logarithmic Differentiation',
          slides: [
            teach(
              prose('A product of powers is quicker with logarithms than with the product rule. For $y = (x + 1)^3(x - 2)^2$:'),
              display('\\ln y = 3\\ln(x + 1) + 2\\ln(x - 2)'),
              prose('Differentiate both sides:'),
              display('\\frac{1}{y}' + DYDX + ' = \\frac{3}{x + 1} + \\frac{2}{x - 2}'),
              prose('Then multiply through by $y$.'),
            ),
            ask('impl-logdiff-ln-tiles'),
            ask('impl-logdiff-rate-steps'),
            ask('impl-logdiff-at-tree'),
            teach(
              prose(
                '$y = x^{x}$ has a moving power on a moving base, so neither the power rule nor the rule for $a^x$ fits. Logarithms give $\\ln y = x\\ln x$, and the product rule:',
              ),
              display('\\frac{1}{y}' + DYDX + ' = \\ln x + 1'),
              display(DYDX + ' = x^{x}(\\ln x + 1)'),
            ),
            ask('impl-logdiff-flow'),
            ask('impl-logdiff-flow', 2),
            teach(
              prose('The log of a quotient subtracts. For $y = \\frac{(x + 1)^3}{(x - 2)^2}$:'),
              display('\\ln y = 3\\ln(x + 1) - 2\\ln(x - 2)'),
              display('\\frac{1}{y}' + DYDX + ' = \\frac{3}{x + 1} - \\frac{2}{x - 2}'),
              prose('At $x = 3$ that makes $\\frac{1}{y}' + DYDX + ' = \\frac{3}{4} - \\frac{2}{1} = -\\frac{5}{4}$, and $y = \\frac{64}{1} = 64$, so the gradient is $64 \\times \\left(-\\frac{5}{4}\\right) = -80$.'),
            ),
            ask('impl-logdiff-ln-tiles', 2),
            ask('impl-logdiff-rate-steps', 2),
            ask('impl-logdiff-at-tree', 2),
          ],
          skillCheck: [ask('impl-logdiff-ln-tiles', 2), ask('impl-logdiff-at-tree', 2), ask('impl-logdiff-flow', 2)],
        },
        {
          id: 'pi-l5-chain',
          title: 'Inverses inside a Chain',
          slides: [
            teach(
              prose('Put $u = 3x$ in $y = \\sin^{-1}(3x)$ and use the chain rule from Composed Functions:'),
              display('\\frac{dy}{du} = \\frac{1}{\\sqrt{1 - u^2}}, \\quad \\frac{du}{dx} = 3'),
              display(DYDX + ' = \\frac{3}{\\sqrt{1 - 9x^2}}'),
              prose('The inside can be a division too, as in Inverses Inside Other Functions: $y = \\tan^{-1}\\left(\\frac{x}{2}\\right)$ gives $\\frac{1}{1 + \\frac{x^2}{4}} \\times \\frac{1}{2}$, which is $\\frac{2}{4 + x^2}$.'),
            ),
            ask('impl-inverse-chain-tiles'),
            ask('impl-arctan-chain-grad'),
            ask('impl-inverse-point-tree'),
            teach(
              prose(
                'Both curves pass through the origin, where $u = 0$ and both $\\sqrt{1 - u^2}$ and $1 + u^2$ are $1$. Only the chain factor is left: $\\sin^{-1}(kx)$ has gradient $k$ there, and $\\tan^{-1}\\left(\\frac{x}{a}\\right)$ has gradient $\\frac{1}{a}$.',
              ),
              prose('Cleared of the fraction inside, the two standard results are'),
              display('\\frac{d}{dx}\\sin^{-1}\\left(\\frac{x}{a}\\right) = \\frac{1}{\\sqrt{a^2 - x^2}}'),
              display('\\frac{d}{dx}\\tan^{-1}\\left(\\frac{x}{a}\\right) = \\frac{a}{a^2 + x^2}'),
            ),
            ask('impl-inverse-origin'),
            ask('impl-arctan-chain-grad+choice', 2),
            ask('impl-inverse-chain-tiles', 2),
            teach(
              prose(
                'At a point, work out $u$ first. For $y = \\sin^{-1}(2x)$ at $x = \\frac{3}{10}$, $u = \\frac{3}{5}$, so $\\frac{dy}{du} = \\frac{5}{4}$ and the gradient is $\\frac{5}{4} \\times 2 = \\frac{5}{2}$.',
              ),
            ),
            ask('impl-inverse-point-tree', 2),
            ask('impl-inverse-origin+choice', 2),
          ],
          skillCheck: [ask('impl-arctan-chain-grad', 2), ask('impl-inverse-chain-tiles', 2), ask('impl-inverse-point-tree', 2)],
        },
      ],
      levelCheck: [
        ask('impl-ax-grad', 2),
        ask('impl-arcsin-at-tree', 2),
        ask('impl-arctan-sec-tiles', 2),
        ask('impl-logdiff-flow', 2),
        ask('impl-inverse-origin+choice', 2),
        ask('impl-ax-log-steps', 2),
        ask('impl-arcsin-grad', 2),
        ask('impl-arctan-where', 2),
        ask('impl-logdiff-at-tree', 2),
        ask('impl-inverse-chain-tiles', 2),
        ask('impl-arctan-chain-grad', 2),
        ask('impl-inverse-sign-flow', 2),
        ask('impl-logdiff-ln-tiles', 2),
        ask('impl-ax-at-tree', 2),
      ],
    },
    {
      id: 'pi-l6',
      title: 'Related Rates & Motion along a Curve',
      lessons: [
        {
          id: 'pi-l6-moving',
          title: 'A Point Moving on a Curve',
          slides: [
            teach(
              prose(
                'In Differentiating Terms in y, $y$ depended on $x$. Now a point moves along $x^2 + y^2 = 25$, and both of its coordinates depend on the time $t$.',
              ),
              figure((t) => [5 * Math.cos(t), 5 * Math.sin(t)], {
                span: 7,
                tMin: 0,
                tMax: 2 * Math.PI,
                marks: [[3, 4]],
                label: 'The circle x squared plus y squared equals 25, with the point (3, 4) marked',
              }),
              prose(`Differentiate each term with respect to $t$. By the chain rule, $x^2$ gives $2x${DXDT}$ and $y^2$ gives $2y${DYDT}$:`),
              display(`2x${DXDT} + 2y${DYDT} = 0`),
              prose(
                `A term with both letters needs the product rule, each letter bringing its own rate: $xy$ gives $x${DYDT} + y${DXDT}$. So $x^2 + xy + y^2 = 7$ gives`,
              ),
              display(`(2x + y)${DXDT} + (x + 2y)${DYDT} = 0`),
            ),
            ask('impl-rate-tiles'),
            ask('impl-rate-t-steps'),
            teach(
              prose(`At $(3, 4)$ on the circle, suppose $x$ is increasing at $${DXDT} = 2$. Put the point and the rate in, then solve:`),
              display(`6 \\times 2 + 8${DYDT} = 0`),
              display(`${DYDT} = -\\frac{12}{8} = -\\frac{3}{2}`),
              prose(
                `It agrees with the chain rule the other way round: the gradient there is $${DYDX} = -\\frac{3}{4}$, and $${DYDT} = ${DYDX} \\times ${DXDT}$.`,
              ),
            ),
            ask('impl-rate-value'),
            ask('impl-rate-tree'),
            teach(
              prose(`Higher powers work the same way. $xy^{2}$ gives $y^{2}${DXDT} + 2xy${DYDT}$, so $xy^{2} + x^{2} = 12$ gives`),
              display(`(y^{2} + 2x)${DXDT} + 2xy${DYDT} = 0`),
              prose(`At $(2, 2)$ with $${DXDT} = 3$:`),
              display(`8 \\times 3 + 8${DYDT} = 0`),
              display(`${DYDT} = -3`),
            ),
            ask('impl-rate-tiles', 2),
            ask('impl-rate-value+choice', 2),
            ask('impl-rate-t-steps', 2),
            ask('impl-rate-tree', 2),
          ],
          skillCheck: [ask('impl-rate-value', 2), ask('impl-rate-tiles', 2), ask('impl-rate-tree', 2)],
        },
        {
          id: 'pi-l6-reading',
          title: 'Reading the Rates',
          slides: [
            teach(
              prose(
                `The sign of a rate says which way a coordinate is going. On $x^2 + y^2 = 25$ at $(3, 4)$ with $${DXDT} = 2$, $${DYDT} = -\\frac{3}{2}$: $x$ is increasing and $y$ is decreasing.`,
              ),
              prose(`Given $${DYDT}$ instead, solve the same line for $${DXDT}$. With $${DYDT} = 3$ at $(3, 4)$:`),
              display(`6${DXDT} + 8 \\times 3 = 0, \\quad ${DXDT} = -4`),
            ),
            ask('impl-rate-sign-flow'),
            ask('impl-rate-reverse+choice'),
            ask('impl-rate-sign-flow', 2),
            teach(
              prose(
                `$y$ stands still, however fast $x$ moves, where the bracket in front of $${DXDT}$ is zero. On the circle that bracket is $2x$, so at $(0, 5)$ and $(0, -5)$.`,
              ),
              prose('On $x^{2} + xy + y^{2} = 3$ the line is'),
              display(`(2x + y)${DXDT} + (x + 2y)${DYDT} = 0`),
              prose('$2x + y = 0$ on $y = -2x$. Put that into the curve:'),
              display('x^{2} - 2x^{2} + 4x^{2} = 3'),
              display('3x^{2} = 3, \\quad x = \\pm 1'),
              prose('So $y$ stands still at $(1, -2)$ and $(-1, 2)$.'),
            ),
            ask('impl-rate-still'),
            ask('impl-rate-reverse', 2),
            ask('impl-rate-still', 2),
            teach(
              prose(`Anything built from $x$ and $y$ has a rate too. The distance from the origin squared is $x^2 + y^2$, and a rectangle with a corner at the point has area $xy$:`),
              display(`\\frac{d}{dt}(x^2 + y^2) = 2x${DXDT} + 2y${DYDT}`),
              display(`\\frac{d}{dt}(xy) = x${DYDT} + y${DXDT}`),
              prose(`Find $${DYDT}$ from the curve first, then put both rates in.`),
            ),
            ask('impl-quantity-rate-tree'),
            ask('impl-quantity-rate-tree', 2),
          ],
          skillCheck: [ask('impl-rate-sign-flow', 2), ask('impl-rate-still', 2), ask('impl-quantity-rate-tree', 2)],
        },
        {
          id: 'pi-l6-velocity',
          title: 'Velocity along a Path',
          slides: [
            teach(
              prose(`When the parameter is time, a parametric curve is the path of a particle. Its **velocity** is the pair of rates $\\left(${DXDT}, ${DYDT}\\right)$.`),
              display('x = t^{2} - 3, \\quad y = 2t'),
              figure((t) => [t * t - 3, 2 * t], {
                span: 6,
                tMin: -2.9,
                tMax: 2.9,
                marks: [[-2, 2]],
                label: 'The path x equals t squared minus 3, y equals 2t, with the point at t equals 1 marked',
              }),
              prose(`Here $${DXDT} = 2t$ and $${DYDT} = 2$, so at $t = 1$ the velocity is $(2, 2)$. Both are positive: the particle is moving right and up.`),
            ),
            ask('param-velocity-tiles'),
            ask('param-direction'),
            ask('param-velocity-tiles', 2),
            teach(
              prose(
                `The particle moves along its tangent, so the gradient of its direction is the gradient of the curve from The Gradient of a Parametric Curve, $${DYDX} = ${DYDT} \\div ${DXDT}$.`,
              ),
              prose(`At $t = 1$ above that is $2 \\div 2 = 1$. At $t = -1$ the velocity is $(-2, 2)$ and the gradient $-1$: moving left and up.`),
            ),
            ask('param-direction-gradient'),
            ask('param-direction', 2),
            ask('param-direction-gradient+choice', 2),
            teach(
              prose(
                `Where $${DXDT} = 0$ the particle moves straight up or down, where its tangent stands upright. Where $${DYDT} = 0$ it moves straight across, where its tangent is flat.`,
              ),
              prose(`Above, $${DXDT} = 2t$ is zero at $t = 0$, and the velocity then is $(0, 2)$: straight up.`),
            ),
            ask('param-upright-flow'),
            ask('param-upright-flow', 2),
          ],
          skillCheck: [ask('param-velocity-tiles', 2), ask('param-direction-gradient', 2), ask('param-upright-flow', 2)],
        },
        {
          id: 'pi-l6-speed',
          title: 'Speed and the Slowest Moment',
          slides: [
            teach(
              prose("A particle's **speed** is the length of its velocity, by Pythagoras:"),
              display(`\\text{speed} = \\sqrt{\\left(${DXDT}\\right)^2 + \\left(${DYDT}\\right)^2}`),
              prose(`For $x = 3t$, $y = t^2$ at $t = 2$, the velocity is $(3, 4)$ and the speed is $\\sqrt{9 + 16} = 5$.`),
            ),
            ask('param-speed-parts-tree'),
            ask('param-speed'),
            ask('param-speed-parts-tree', 2),
            teach(
              prose(`The speed changes as the particle moves. Its square is easier to work with, because it has no root:`),
              display(`\\text{speed}^2 = 3^2 + (2t)^2 = 4t^2 + 9`),
              prose('When a rate is a bracket such as $2t - 4$, square it out and collect like terms.'),
            ),
            ask('param-speed-squared-tiles'),
            ask('param-speed+choice', 2),
            ask('param-speed-squared-tiles', 2),
            teach(
              prose(
                `The particle is slowest where the speed is least, and that is where its square is least. Differentiate the square and set it to zero: $4t^2 + 9$ gives $8t = 0$, so it is slowest at $t = 0$, moving at $3$.`,
              ),
              prose('Then put that $t$ into $x$ and $y$ to find where it is.'),
            ),
            ask('param-slowest-slider'),
            ask('param-slowest-slider', 2),
          ],
          skillCheck: [ask('param-speed', 2), ask('param-speed-squared-tiles', 2), ask('param-slowest-slider', 2)],
        },
        {
          id: 'pi-l6-when',
          title: 'When and Where',
          slides: [
            teach(
              prose('To find **when** a particle reaches an axis or a line, solve for $t$. To find **where**, put that $t$ back in.'),
              display('x = 3t - 6, \\quad y = t^{2} - 1'),
              prose('It crosses the $y$-axis when $x = 0$: $3t - 6 = 0$, so $t = 2$, and then $y = 4 - 1 = 3$. It is at $(0, 3)$.'),
              prose(`Its velocity then is the rates at that $t$: $${DXDT} = 3$ and $${DYDT} = 2t = 4$, so $(3, 4)$.`),
            ),
            ask('param-reach-tiles'),
            ask('param-crossing-tree'),
            ask('param-crossing-flow'),
            teach(
              prose(
                'When the equation for $t$ is a quadratic, it can have a root before the clock starts. For $x = t + 1$, $y = t^{2} - t$ reaching the line $y = 2$:',
              ),
              display('t^{2} - t - 2 = 0'),
              display('(t - 2)(t + 1) = 0'),
              prose(
                'The roots are $t = 2$ and $t = -1$. Only $t = 2$ comes after $t = 0$, so it is there at $t = 2$, at $(3, 2)$.',
              ),
            ),
            ask('param-reach-tiles', 2),
            ask('param-crossing-tree', 2),
            ask('param-crossing-flow', 2),
            teach(
              prose('How fast it is going then is the speed at that $t$. Crossing the $y$-axis above, the velocity is $(3, 4)$, so the speed is $5$.'),
            ),
            ask('param-crossing-speed'),
            ask('param-crossing-speed+choice', 2),
          ],
          skillCheck: [ask('param-reach-tiles', 2), ask('param-crossing-tree', 2), ask('param-crossing-speed', 2)],
        },
      ],
      levelCheck: [
        ask('impl-rate-value', 2),
        ask('param-velocity-tiles', 2),
        ask('param-speed-parts-tree', 2),
        ask('impl-rate-sign-flow', 2),
        ask('param-reach-tiles', 2),
        ask('param-direction-gradient+choice', 2),
        ask('impl-quantity-rate-tree', 2),
        ask('param-slowest-slider', 2),
        ask('param-crossing-flow', 2),
        ask('impl-rate-tiles', 2),
        ask('param-speed', 2),
        ask('impl-rate-still', 2),
        ask('param-upright-flow', 2),
        ask('param-crossing-speed', 2),
      ],
    },
    {
      id: 'pi-l7',
      title: 'Area under a Parametric Curve',
      lessons: [
        {
          id: 'pi-l7-setup',
          title: 'From dx to dt',
          slides: [
            teach(
              prose('The area under a curve, down to the $x$-axis, is $\\int y \\, dx$. When the curve is given in terms of $t$, write the whole integral in $t$.'),
              display('x = t^{2}, \\quad y = t + 1'),
              shaded((t) => [t * t, t + 1], {
                tMin: 0,
                tMax: 2.3,
                from: 1,
                to: 2,
                label: 'The curve x equals t squared, y equals t plus 1, with the region under it from t equals 1 to t equals 2 shaded',
              }),
              prose(`A small step $dx$ is $${DXDT} \\, dt$, so $\\int y \\, dx$ becomes $\\int y ${DXDT} \\, dt$. Here $${DXDT} = 2t$, so it is $\\int (t + 1)(2t) \\, dt$.`),
            ),
            ask('param-area-integrand-tiles'),
            ask('param-area-dx-flow'),
            ask('param-area-integrand'),
            teach(
              prose(`Why the rate: as $t$ moves on by $dt$, $x$ moves on by $${DXDT}$ times as much. A step in $t$ is only the same size as a step in $x$ when $${DXDT} = 1$.`),
              prose('Multiply the product out before integrating. For $x = 3t - 1$, $y = t^{2} + 2$:'),
              display(`y ${DXDT} = (t^{2} + 2)(3) = 3t^{2} + 6`),
            ),
            ask('param-area-substitute-steps'),
            ask('param-area-integrand-tiles', 2),
            ask('param-area-integrand+choice', 2),
            teach(
              prose(`Once $y$ and $dx$ are replaced, nothing of $x$ is left: the integral is in $t$ alone, and it is integrated with respect to $t$.`),
              prose(`A common slip is to multiply $y$ by $x$ itself. It is the rate $${DXDT}$ that goes in.`),
            ),
            ask('param-area-substitute-steps', 2),
            ask('param-area-dx-flow', 2),
          ],
          skillCheck: [ask('param-area-integrand', 2), ask('param-area-substitute-steps', 2), ask('param-area-dx-flow', 2)],
        },
        {
          id: 'pi-l7-limits',
          title: 'The Limits in t',
          slides: [
            teach(
              prose(
                'A region given between two values of $x$ needs its limits in $t$: solve for the $t$ at each end, as in When and Where. It is the same move as changing the limits in Substitution with Limits.',
              ),
              display('x = t^{2} + 1, \\quad y = t + 1'),
              prose('Take $t \\ge 0$. Between $x = 2$ and $x = 5$: $t^{2} + 1 = 2$ gives $t = 1$, and $t^{2} + 1 = 5$ gives $t = 2$.'),
              display(`\\text{area} = \\int_{1}^{2} (t + 1)(2t) \\, dt`),
            ),
            askAfter(
              [
                prose(
                  'The lower limit is always the $t$ at the **left** end, even when that $t$ is the bigger one. For $x = 4 - t$, $y = t$ between $x = 1$ and $x = 3$:',
                ),
                display('x = 1: \\; 4 - t = 1, \\; t = 3'),
                display('x = 3: \\; 4 - t = 3, \\; t = 1'),
                display('\\text{area} = \\int_{3}^{1} t \\times (-1) \\, dt'),
              ],
              'param-area-limits-tiles',
            ),
            ask('param-area-limit-t'),
            ask('param-area-limits-flow'),
            teach(
              prose('Worked out, that integral is positive, as an area should be:'),
              display('\\int_{3}^{1} -t \\, dt = \\left[-\\frac{t^{2}}{2}\\right]_{3}^{1}'),
              display('= -\\frac{1}{2} - \\left(-\\frac{9}{2}\\right) = 4'),
              prose(`Here $x$ falls as $t$ rises, so $${DXDT}$ is negative, and running the limits downwards turns the sign back.`),
            ),
            ask('param-area-limits-choice'),
            ask('param-area-limits-flow', 2),
            ask('param-area-limit-t+choice', 2),
            teach(
              prose(
                'Check each limit by putting it back into $x$: it should give the end it belongs to. On $x = 4 - t$, $t = 3$ gives $x = 1$, the left end. Putting the $x$-values themselves in as limits is the usual slip.',
              ),
            ),
            ask('param-area-limits-tiles', 2),
            ask('param-area-limits-choice', 2),
          ],
          skillCheck: [ask('param-area-limits-tiles', 2), ask('param-area-limits-flow', 2), ask('param-area-limit-t', 2)],
        },
        {
          id: 'pi-l7-working',
          title: 'Working It Out',
          slides: [
            teach(
              prose('With the integral set up, integrate term by term: raise each power by one and divide by the new power.'),
              display('\\int_{1}^{2} (2t^{2} + 2t) \\, dt'),
              display('= \\left[\\frac{2}{3}t^{3} + t^{2}\\right]_{1}^{2}'),
              prose('Then the value at the top take the value at the bottom:'),
              display('\\frac{28}{3} - \\frac{5}{3} = \\frac{23}{3}'),
            ),
            ask('param-area-terms-tiles'),
            ask('param-area-value-tree'),
            ask('param-area'),
            teach(
              prose(`The whole working, from the two equations to a number: find $${DXDT}$, multiply by $y$ and expand, integrate, then put in the limits.`),
              prose('Keep the value at the bottom in brackets when it is negative: taking away a negative adds.'),
            ),
            ask('param-area-working-steps'),
            ask('param-area-terms-tiles', 2),
            ask('param-area+choice', 2),
            teach(
              prose('Areas often come out as fractions. Leave them as fractions rather than rounding: $\\frac{23}{3}$, not $7.67$.'),
            ),
            ask('param-area-working-steps', 2),
            ask('param-area-value-tree', 2),
          ],
          skillCheck: [ask('param-area', 2), ask('param-area-working-steps', 2), ask('param-area-value-tree', 2)],
        },
        {
          id: 'pi-l7-sign',
          title: 'Sign and Direction',
          slides: [
            teach(
              prose(
                `As in Area Below the Axis, an integral can come out negative. Here there are two ways: the region is below the $x$-axis, so $y < 0$, or it is swept from right to left, so $${DXDT} < 0$.`,
              ),
              prose(`The integrand is $y$ times $${DXDT}$, so its sign is the two signs multiplied. The area is the size of the integral.`),
            ),
            ask('param-area-sign-flow'),
            teach(
              display('x = 4 - t^{2}, \\quad y = t + 1'),
              shaded((t) => [4 - t * t, t + 1], {
                tMin: 0,
                tMax: 2.3,
                from: 0,
                to: 2,
                arrow: true,
                label: 'The curve x equals 4 minus t squared, y equals t plus 1, swept right to left from t equals 0 to t equals 2, with the region under it shaded',
              }),
              prose('From $t = 0$ to $t = 2$ the curve runs right to left, above the axis:'),
              display('\\int_{0}^{2} (t + 1)(-2t) \\, dt'),
              display('= \\int_{0}^{2} (-2t^{2} - 2t) \\, dt'),
              display('= \\left[-\\frac{2}{3}t^{3} - t^{2}\\right]_{0}^{2} = -\\frac{28}{3}'),
              prose('So the area is the size, $\\frac{28}{3}$. Written as a positive integral, that is $-\\int_{0}^{2}$ or, with the limits swapped, $\\int_{2}^{0}$.'),
            ),
            ask('param-area-size'),
            ask('param-area-sign-tree'),
            ask('param-area-direction-choice'),
            ask('param-area-sign-flow', 2),
            teach(
              prose(
                'Below the axis **and** swept right to left, the two negatives cancel and the integral is positive again. On $x = 3 - t$, $y = -2$ from $t = 0$ to $t = 1$, the integrand is $(-2)(-1) = 2$, so the integral is $2$.',
              ),
              prose('Always check both signs before trusting the answer.'),
            ),
            ask('param-area-size+choice', 2),
            ask('param-area-sign-tree', 2),
            ask('param-area-direction-choice', 2),
          ],
          skillCheck: [ask('param-area-sign-flow', 2), ask('param-area-size', 2), ask('param-area-sign-tree', 2)],
        },
        {
          id: 'pi-l7-trig',
          title: 'Trigonometric Curves',
          slides: [
            teach(
              display('x = 3\\cos t, \\quad y = 2\\sin t'),
              shaded((t) => [3 * Math.cos(t), 2 * Math.sin(t)], {
                tMin: 0,
                tMax: 2 * Math.PI,
                from: Math.PI / 2,
                to: 0,
                label: 'An ellipse 3 wide and 2 tall about the origin, with the quarter in the first quadrant shaded',
              }),
              prose(`This is an ellipse. For the quarter from $x = 0$ to $x = 3$: $x = 0$ at $t = \\frac{\\pi}{2}$ and $x = 3$ at $t = 0$. With $${DXDT} = -3\\sin t$,`),
              display('\\int_{\\frac{\\pi}{2}}^{0} 2\\sin t \\times (-3\\sin t) \\, dt'),
              display('= -6\\int_{\\frac{\\pi}{2}}^{0} \\sin^2 t \\, dt'),
            ),
            ask('param-trig-area-tiles'),
            teach(
              prose('$\\sin^2 t$ has no direct antiderivative. Rewrite it with the double angle from The Double-Angle Formulae:'),
              display('\\sin^2 t = \\frac{1}{2}(1 - \\cos 2t)'),
              display('\\cos^2 t = \\frac{1}{2}(1 + \\cos 2t)'),
              prose('Integrating term by term, $\\sin^2 t$ gives $\\frac{t}{2} - \\frac{\\sin 2t}{4}$ and $\\cos^2 t$ gives $\\frac{t}{2} + \\frac{\\sin 2t}{4}$. For the quarter ellipse:'),
              display('-6\\left[\\frac{t}{2} - \\frac{\\sin 2t}{4}\\right]_{\\frac{\\pi}{2}}^{0}'),
              display('= -6\\left(0 - \\frac{\\pi}{4}\\right) = \\frac{3\\pi}{2}'),
            ),
            ask('param-trig-area-flow'),
            ask('param-trig-area'),
            ask('param-trig-double-steps'),
            teach(
              prose(
                'The top half needs the whole width. On $x = 2\\sin t$, $y = 3\\cos t$: $x = -2$ at $t = -\\frac{\\pi}{2}$ and $x = 2$ at $t = \\frac{\\pi}{2}$, with $y \\ge 0$ between. With $' +
                  DXDT +
                  ' = 2\\cos t$,',
              ),
              display('\\int_{-\\frac{\\pi}{2}}^{\\frac{\\pi}{2}} 6\\cos^2 t \\, dt'),
              display('= 6\\left[\\frac{t}{2} + \\frac{\\sin 2t}{4}\\right]_{-\\frac{\\pi}{2}}^{\\frac{\\pi}{2}}'),
              display('= 6 \\times \\frac{\\pi}{2} = 3\\pi'),
              prose(
                'With $x = a\\cos t$ instead, $x$ runs from $-a$ at $t = \\pi$ to $a$ at $t = 0$. The $\\sin 2t$ terms vanish at all these limits: a quarter of an ellipse is $\\frac{\\pi ab}{4}$ and the top half $\\frac{\\pi ab}{2}$.',
              ),
            ),
            ask('param-trig-area-tiles', 2),
            ask('param-trig-area+choice', 2),
            ask('param-trig-double-steps', 2),
            ask('param-trig-area-flow', 2),
          ],
          skillCheck: [ask('param-trig-area', 2), ask('param-trig-double-steps', 2), ask('param-trig-area-flow', 2)],
        },
      ],
      levelCheck: [
        ask('param-area-integrand', 2),
        ask('param-area-limits-tiles', 2),
        ask('param-area', 2),
        ask('param-area-sign-flow', 2),
        ask('param-trig-area', 2),
        ask('param-area-substitute-steps', 2),
        ask('param-area-limits-choice', 2),
        ask('param-area-value-tree', 2),
        ask('param-area-size', 2),
        ask('param-trig-double-steps', 2),
        ask('param-area-dx-flow', 2),
        ask('param-area-working-steps', 2),
        ask('param-area-direction-choice', 2),
        ask('param-trig-area-tiles', 2),
      ],
    },
    // Levels 8 to 11 are written under parametric/ and shown on the Basics card; see placement.ts.
    level8,
    level9,
    level10,
    level11,
  ],
};
