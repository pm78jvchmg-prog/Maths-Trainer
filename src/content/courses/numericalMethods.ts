/**
 * Numerical Methods.
 *
 * Level 1 locates roots that cannot be found exactly: the change of sign and
 * the three ways it misleads, rearranging f(x) = 0 into x = g(x) and
 * iterating, the staircase and cobweb pictures of that iteration, and the
 * gradient test that says when it diverges. Level 2 is Newton-Raphson (the
 * tangent step, a root to a stated accuracy, and where it goes wrong) and the
 * trapezium rule, with whether it overestimates or underestimates. Level 3
 * is bounds and errors: absolute, relative and percentage error, the bounds
 * of a calculation on rounded values, and how an error in x_n is carried
 * through g, one step and then k. Level 4 is Simpson's rule: parabolas over
 * pairs of strips, why the number of strips is even, Simpson against the
 * trapezium rule on the same heights, exactness for cubics, and tables of
 * readings. Level 5 is Euler's method: one tangent step, stepping on in a
 * table, recomputing the gradient when f has y in it, the error against an
 * exact solution and which way it misses, and how the error follows h.
 * Level 6 is choosing a method: interval bisection, one root chased by
 * bisection, iteration and Newton-Raphson side by side, speed of
 * convergence, when each breaks, and which to reach for.
 *
 * The tangent's equation belongs to Differentiation (`df-l1-tangent`) and
 * rectangle sums to Integration (`in-l8`); both are pointed at, not taught
 * again. So is solving dy/dx = f(x) exactly (`de-l1-separate`,
 * `de-l1-particular`), which level 5 checks Euler against. Later levels are in `docs/roadmap/levels/numerical-methods.md`.
 *
 * Each level closes with a level check: fifteen questions, no teaching
 * slides, one attempt each.
 */
import type { Block, Course, SlideRef } from '../types';
import { plotSvg } from '../figures';
import { cobwebSvg } from '../generators/numericalMethods';

const teach = (...blocks: Block[]): SlideRef => ({
  type: 'literal',
  slide: { kind: 'teach', body: blocks },
});

const ask = (generatorId: string, difficulty = 1): SlideRef => ({
  type: 'generated',
  generatorId,
  difficulty,
});

/** A question with teaching shown above it on the same slide. */
const asking = (generatorId: string, difficulty: number, ...leadIn: Block[]): SlideRef => ({
  type: 'generated',
  generatorId,
  difficulty,
  leadIn,
});

const prose = (text: string): Block => ({ kind: 'prose', text });

const maths = (tex: string): Block => ({ kind: 'display', tex });

/** Lines of working stacked in one display and aligned on their `&`. */
const working = (...lines: string[]) => maths(`\\begin{aligned} ${lines.join(' \\\\ ')} \\end{aligned}`);

/** y = x^3 - 2x - 5 crossing the axis between 2 and 3. */
const signChange: Block = {
  kind: 'diagram',
  svg: plotSvg({
    xMin: 0,
    xMax: 3.5,
    yMin: -9,
    yMax: 20,
    curves: [{ f: (x) => x * x * x - 2 * x - 5 }],
    verticals: [{ x: 2 }, { x: 3 }],
    marks: [
      { x: 2, y: -1 },
      { x: 3, y: 16 },
    ],
    label: 'The curve y = x cubed minus 2x minus 5, below the axis at x = 2 and above it at x = 3',
  }),
};

/** 1/x: a change of sign across [-1, 1] with no root. */
const jumpPicture: Block = {
  kind: 'diagram',
  svg: plotSvg({
    xMin: -2,
    xMax: 2,
    yMin: -4,
    yMax: 4,
    curves: [{ f: (x) => 1 / x, breaks: true }],
    verticals: [{ x: -1 }, { x: 1 }],
    label: 'The curve y = 1 over x, negative at x = -1 and positive at x = 1, never meeting the axis',
  }),
};

const staircase: Block = {
  kind: 'diagram',
  svg: cobwebSvg((x) => (x * x + 3) / 5, {
    hi: 3,
    x0: 2.5,
    legs: 8,
    label: 'A staircase: the path steps down towards where y = g(x) meets y = x',
  }),
};

const cobweb: Block = {
  kind: 'diagram',
  svg: cobwebSvg((x) => 6 / (x + 1), {
    hi: 4,
    x0: 1,
    legs: 10,
    label: 'A cobweb: the path spirals in towards where y = g(x) meets y = x',
  }),
};

/** y = x^2 - 2 with its tangent at x = 2 meeting the axis at 1.5. */
const tangentStep: Block = {
  kind: 'diagram',
  svg: plotSvg({
    xMin: 0,
    xMax: 3,
    yMin: -3,
    yMax: 5,
    curves: [{ f: (x) => x * x - 2 }, { f: (x) => 2 + 4 * (x - 2), accent: true }],
    verticals: [{ x: 2 }],
    marks: [
      { x: 2, y: 2 },
      { x: 1.5, y: 0 },
    ],
    label: 'The curve y = x squared minus 2, with its tangent at x = 2 meeting the axis at x = 1.5',
  }),
};

/** y = x^2 + 1 over [0, 3] with the three trapezia shaded. */
const trapezia: Block = {
  kind: 'diagram',
  svg: plotSvg({
    xMin: -0.3,
    xMax: 3.3,
    yMin: 0,
    yMax: 11,
    curves: [
      { f: (x) => x * x + 1 },
      { f: (x) => (x < 1 ? 1 + x : x < 2 ? 2 + 3 * (x - 1) : 5 + 5 * (x - 2)), accent: true },
    ],
    shade: { f: (x) => (x < 1 ? 1 + x : x < 2 ? 2 + 3 * (x - 1) : 5 + 5 * (x - 2)), from: 0, to: 3 },
    verticals: [{ x: 0 }, { x: 1 }, { x: 2 }, { x: 3 }],
    label: 'The curve y = x squared plus 1 from 0 to 3, with three trapezia under straight chords',
  }),
};

/** y = 6/(x + 1) over [0, 2] with the one parabola through its three heights shaded. */
const parabolaFigure: Block = {
  kind: 'diagram',
  svg: plotSvg({
    xMin: -0.2,
    xMax: 2.2,
    yMin: 0,
    yMax: 7,
    curves: [{ f: (x) => 6 / (x + 1) }, { f: (x) => 6 - 4 * x + x * x, accent: true }],
    shade: { f: (x) => 6 - 4 * x + x * x, from: 0, to: 2 },
    verticals: [{ x: 0 }, { x: 1 }, { x: 2 }],
    marks: [
      { x: 0, y: 6 },
      { x: 1, y: 3 },
      { x: 2, y: 2 },
    ],
    label: 'The curve y = 6 over x plus 1 from 0 to 2, with a parabola through its heights at 0, 1 and 2',
  }),
};

/** x^3 - 2x - 5 on [2, 3], with the first two midpoints marked. */
const bisectionFigure: Block = {
  kind: 'diagram',
  svg: plotSvg({
    xMin: 1.8,
    xMax: 3.1,
    yMin: -3,
    yMax: 17,
    curves: [{ f: (x) => x * x * x - 2 * x - 5 }],
    verticals: [{ x: 2 }, { x: 3 }, { x: 2.5 }, { x: 2.25 }],
    marks: [
      { x: 2.5, y: 5.625 },
      { x: 2.25, y: 1.890625 },
    ],
    label: 'The curve y = x cubed minus 2x minus 5 between x = 2 and x = 3, with lines at the midpoints 2.5 and 2.25, where the curve is above the axis',
  }),
};

/** The solution of dy/dx = x + y through (0, 1), with its tangent there carried to x = 0.5. */
const eulerTangent: Block = {
  kind: 'diagram',
  svg: plotSvg({
    xMin: -0.2,
    xMax: 0.8,
    yMin: 0,
    yMax: 3,
    curves: [{ f: (x) => 2 * Math.exp(x) - x - 1 }, { f: (x) => 1 + x, accent: true }],
    verticals: [{ x: 0, dashed: true }, { x: 0.5, dashed: true }],
    marks: [
      { x: 0, y: 1 },
      { x: 0.5, y: 1.5 },
    ],
    label: 'The solution curve through (0, 1) and its tangent there, reaching 1.5 at x = 0.5 while the curve reaches about 1.8',
  }),
};

/** Euler's steps with h = 0.5 for dy/dx = 2x + 1 from (0, 1), under the curve y = x^2 + x + 1. */
const eulerSteps: Block = {
  kind: 'diagram',
  svg: plotSvg({
    xMin: 0,
    xMax: 1.5,
    yMin: 0,
    yMax: 5,
    curves: [
      { f: (x) => x * x + x + 1 },
      { f: (x) => (x < 0.5 ? 1 + x : x < 1 ? 1.5 + 2 * (x - 0.5) : 2.5 + 3 * (x - 1)), accent: true },
    ],
    marks: [
      { x: 0, y: 1 },
      { x: 0.5, y: 1.5 },
      { x: 1, y: 2.5 },
      { x: 1.5, y: 4 },
    ],
    label: "Euler's three steps from (0, 1), each a straight line, falling further below the curve y = x squared plus x plus 1",
  }),
};

export const numericalMethods: Course = {
  id: 'numerical-methods',
  category: 'advanced-maths',
  position: 80,
  title: 'Numerical Methods',
  // Its first two levels are shown in Numerical Methods Basics; see placement.ts.
  blurb: "Bounds and errors, Simpson's rule, Euler's method, and choosing between methods.",
  levels: [
    {
      id: 'nm-l1',
      title: 'Locating Roots and Iteration',
      lessons: [
        {
          id: 'nm-l1-sign',
          title: 'The Change of Sign',
          slides: [
            teach(
              prose(
                'Most equations cannot be solved exactly. $x^{3} - 2x - 5 = 0$ has no neat formula, but its root can still be pinned down to any accuracy you like.',
              ),
              working('f(2) &= -1 < 0', 'f(3) &= 16 > 0'),
              signChange,
              prose(
                'The curve is below the axis at $x = 2$ and above it at $x = 3$. It is unbroken, so it must cross the axis in between: there is a root in $[2, 3]$.',
              ),
            ),
            ask('numer-sign-tree'),
            ask('numer-sign-interval'),
            ask('numer-sign-value'),
            teach(
              prose(
                'The rule: if $f$ is **continuous** on $[a, b]$, meaning its graph has no breaks or asymptotes there, and $f(a)$ and $f(b)$ have opposite signs, then $f(x) = 0$ has a root between $a$ and $b$. Every polynomial is continuous.',
              ),
              prose(
                'It only works one way. A change of sign proves a root; no change of sign proves nothing, since the curve may cross twice or not at all.',
              ),
            ),
            ask('numer-sign-flow'),
            ask('numer-sign-tree', 2),
            ask('numer-sign-interval', 2),
            teach(
              prose('To narrow the interval, test a point inside it. For $f(x) = x^{3} - 2x - 5$:'),
              working('f(2.5) &= 15.625 - 5 - 5', '&= 5.625 > 0'),
              prose(
                '$f(2) < 0$ and $f(2.5) > 0$, so the root is in $[2, 2.5]$. Keep halving and the interval shrinks as far as you need.',
              ),
            ),
            ask('numer-sign-value', 2),
            ask('numer-sign-flow', 2),
          ],
          skillCheck: [ask('numer-sign-tree', 2), ask('numer-sign-value', 2), ask('numer-sign-flow', 2)],
        },
        {
          id: 'nm-l1-failure',
          title: 'Where the Sign Test Fails',
          slides: [
            teach(
              prose('The test can mislead in three ways. First, an asymptote. $f(x) = \\frac{1}{x}$ has $f(-1) = -1$ and $f(1) = 1$:'),
              jumpPicture,
              prose(
                'The sign changes, yet $\\frac{1}{x}$ is never $0$: the graph jumps across the axis at $x = 0$. $f$ is not continuous on $[-1, 1]$, so the rule does not apply.',
              ),
            ),
            ask('numer-fail-flow'),
            teach(
              prose(
                'Second, a touch. $f(x) = (x - 2)^{2}$ is $1$ at both $x = 1$ and $x = 3$, but it has a root at $x = 2$, where the curve touches the axis and turns back.',
              ),
              prose(
                'A squared factor makes a repeated root, and the curve touches rather than crosses there, so $f$ keeps the same sign either side of it.',
              ),
              prose(
                'So a curve that touches the axis at $x = 2$ and crosses it at $x = -1$ has the factors $(x - 2)^{2}$ and $(x + 1)$: $y = (x - 2)^{2}(x + 1)$.',
              ),
            ),
            ask('numer-touch-tiles'),
            ask('numer-fail-flow', 2),
            teach(
              prose('Third, two roots close together. Both ends can have the same sign while the curve dips below the axis and back.'),
              working('f(x) &= 16x^{2} - 48x + 35', 'f(1) &= 3, \\quad f(2) = 3', 'f(1.5) &= -1'),
              prose(
                'The ends agree, but the middle is negative: a change of sign on $[1, 1.5]$ and another on $[1.5, 2]$, so two roots. Testing a point inside is how you find out.',
              ),
            ),
            ask('numer-fail-picture'),
            ask('numer-split-value'),
            ask('numer-touch-tiles', 2),
            ask('numer-fail-picture', 2),
            ask('numer-split-value', 2),
          ],
          skillCheck: [ask('numer-fail-picture', 2), ask('numer-touch-tiles', 2), ask('numer-split-value', 2)],
        },
        {
          id: 'nm-l1-rearrange',
          title: 'Rearranging to x = g(x)',
          slides: [
            teach(
              prose(
                'A second approach: rearrange $f(x) = 0$ into the form $x = g(x)$, then use it as a recipe. Start from a guess $x_0$ and keep putting the answer back in.',
              ),
              working('x^{3} - 3x - 5 &= 0', 'x^{3} &= 3x + 5', 'x &= \\sqrt[3]{3x + 5}'),
              maths('x_{n+1} = \\sqrt[3]{3x_n + 5}'),
              prose('If the values settle down, they settle on a root: at the limit, $x_{n+1}$ and $x_n$ are the same number.'),
            ),
            ask('numer-rearrange-tiles'),
            ask('numer-scheme-equation'),
            ask('numer-first-iterate-steps'),
            teach(
              prose('Each value comes from the one before. With $x_{n+1} = \\frac{x_n^{2} + 3}{5}$ and $x_0 = 2$:'),
              working('x_1 &= \\frac{2^{2} + 3}{5} = 1.4', 'x_2 &= \\frac{1.4^{2} + 3}{5} = 0.992', 'x_3 &= \\frac{0.992^{2} + 3}{5} \\approx 0.7968'),
              prose(
                'Keep every digit on your calculator between steps, and round only what you write down. When the values settle, a change of sign confirms the interval the root is in.',
              ),
            ),
            ask('iterate-fixed-point'),
            ask('numer-scheme-equation', 2),
            teach(
              prose('One equation has many rearrangements. $x^{3} - 3x - 5 = 0$ can also keep the $x$ term on its own and divide:'),
              working('3x &= x^{3} - 5', 'x &= \\frac{x^{3} - 5}{3}'),
              prose('Or take out a factor of $x$ and divide by the bracket:'),
              working('x(x^{2} - 3) &= 5', 'x &= \\frac{5}{x^{2} - 3}'),
              prose(
                'All three have the same roots, but they do not all behave the same when iterated. Some close in on the root and some run away from it, which is the next two lessons.',
              ),
            ),
            ask('numer-rearrange-tiles', 2),
            ask('numer-first-iterate-steps', 2),
            ask('iterate-fixed-point', 2),
          ],
          skillCheck: [ask('numer-rearrange-tiles', 2), ask('numer-first-iterate-steps', 2), ask('numer-scheme-equation', 2)],
        },
        {
          id: 'nm-l1-cobweb',
          title: 'Staircases and Cobwebs',
          slides: [
            teach(
              prose(
                'An iteration can be drawn. Plot $y = g(x)$ and $y = x$: they meet at the root. From $x_0$, go up to the curve, which is at height $g(x_0) = x_1$; then across to $y = x$, which puts you above $x_1$. Repeat.',
              ),
              staircase,
              prose('Here $g(x) = \\frac{x^{2} + 3}{5}$ from $x_0 = 2.5$. The path steps down towards the crossing: a **staircase**.'),
            ),
            ask('numer-cobweb-slider'),
            ask('numer-cobweb-choice'),
            asking(
              'numer-fixed-limit',
              1,
              prose(
                'To give the root to a set accuracy, iterate until two values in a row agree to that many decimal places. $x_{n+1} = \\sqrt[3]{3x_n + 5}$ from $x_0 = 2$, written to 2 decimal places:',
              ),
              working('x_1 &= \\sqrt[3]{11} = 2.2240\\ldots \\to 2.22', 'x_2 &= 2.2684\\ldots \\to 2.27', 'x_3 &= 2.2770\\ldots \\to 2.28', 'x_4 &= 2.2786\\ldots \\to 2.28'),
              prose('$x_3$ and $x_4$ agree, so the root is $2.28$ to 2 decimal places.'),
            ),
            teach(
              prose('When $g$ slopes downward at the root, the path swings from side to side instead: a **cobweb**. This is $g(x) = \\frac{6}{x + 1}$ from $x_0 = 1$:'),
              cobweb,
              prose(
                "Staircase or cobweb is the sign of $g'(\\alpha)$, the gradient at the root. Closing in or moving away is its size: each step is shorter than the last when $|g'(\\alpha)| < 1$.",
              ),
            ),
            ask('numer-cobweb-flow'),
            ask('numer-cobweb-slider', 2),
            ask('numer-cobweb-choice', 2),
            teach(
              prose(
                'With a cobweb the values land either side of the root in turn. $g(x) = \\frac{6}{x + 1}$ from $x_0 = 1$ gives $3$, $1.5$, $2.4$, $1.76$, $2.17$: over, under, over, under the root $2$.',
              ),
              prose('So the last two values always trap the root between them, here $1.76 < 2 < 2.17$.'),
            ),
            ask('numer-fixed-limit', 2),
            ask('numer-cobweb-flow', 2),
          ],
          skillCheck: [ask('numer-cobweb-choice', 2), ask('numer-cobweb-slider', 2), ask('numer-cobweb-flow', 2)],
        },
        {
          id: 'nm-l1-diverge',
          title: 'When Iteration Fails',
          slides: [
            teach(
              prose(
                "Near the root, $g$ is close to its tangent there, so each step multiplies the distance from $\\alpha$ by about $g'(\\alpha)$:",
              ),
              maths("x_{n+1} - \\alpha \\approx g'(\\alpha)(x_n - \\alpha)"),
              prose(
                "When $|g'(\\alpha)| < 1$ the distance shrinks every step and the iteration converges. When $|g'(\\alpha)| > 1$ it grows, and the iteration diverges however close you start.",
              ),
            ),
            ask('numer-gprime'),
            teach(
              prose('$x^{3} - 3x - 5 = 0$ has a root $\\alpha \\approx 2.28$. Test its three rearrangements. For $g(x) = \\sqrt[3]{3x + 5} = (3x + 5)^{1/3}$, the chain rule gives'),
              working("g'(x) &= \\tfrac{1}{3}(3x + 5)^{-2/3} \\times 3", '&= \\frac{1}{(3x + 5)^{2/3}}', "g'(2.28) &= \\frac{1}{11.84^{2/3}} \\approx 0.19"),
              prose('For $g(x) = \\frac{x^{3} - 5}{3}$ and $g(x) = \\frac{5}{x^{2} - 3} = 5(x^{2} - 3)^{-1}$:'),
              working("g'(x) &= x^{2}", "g'(2.28) &\\approx 5.2"),
              working("g'(x) &= \\frac{-10x}{(x^{2} - 3)^{2}}", "g'(2.28) &\\approx -4.7"),
              prose('Only the first has $|g\'(\\alpha)| < 1$, so only it converges; the other two throw every value further away than the last.'),
            ),
            ask('numer-which-converges'),
            ask('numer-diverge-flow'),
            ask('numer-fixed-limit'),
            ask('numer-gprime', 2),
            teach(
              prose(
                'A rearrangement that diverges says nothing against the root: $\\alpha$ is still there, and a different rearrangement of the same equation may find it. It is the recipe that failed, not the equation.',
              ),
            ),
            ask('numer-which-converges', 2),
            ask('numer-diverge-flow', 2),
            ask('numer-fixed-limit', 2),
          ],
          skillCheck: [ask('numer-gprime', 2), ask('numer-which-converges', 2), ask('numer-diverge-flow', 2)],
        },
      ],
      levelCheck: [
        ask('numer-sign-tree', 2),
        ask('numer-sign-interval', 2),
        ask('numer-sign-flow', 2),
        ask('numer-split-value', 2),
        ask('numer-fail-picture', 2),
        ask('numer-touch-tiles', 2),
        ask('numer-fail-flow', 2),
        ask('numer-rearrange-tiles', 2),
        ask('numer-scheme-equation', 2),
        ask('numer-first-iterate-steps', 2),
        ask('iterate-fixed-point', 2),
        ask('numer-cobweb-slider', 2),
        ask('numer-cobweb-choice', 2),
        ask('numer-gprime', 2),
        ask('numer-which-converges', 2),
      ],
    },
    {
      id: 'nm-l2',
      title: 'Newton-Raphson and the Trapezium Rule',
      lessons: [
        {
          id: 'nm-l2-newton',
          title: 'The Tangent Step',
          slides: [
            teach(
              prose(
                'Newton-Raphson finds a root with tangents. At $x_n$, draw the tangent to $y = f(x)$ (its equation is in Differentiation, level 1) and follow it down to the axis. Where it lands is $x_{n+1}$.',
              ),
              tangentStep,
              prose('The tangent drops $f(x_n)$ at a gradient of $f\'(x_n)$, so it meets the axis $\\frac{f(x_n)}{f\'(x_n)}$ along:'),
              maths("x_{n+1} = x_n - \\frac{f(x_n)}{f'(x_n)}"),
            ),
            ask('numer-newton-derivative'),
            ask('numer-newton-formula-tiles'),
            teach(
              prose('For $f(x) = x^{3} - 2x - 5$ from $x_0 = 2$: $f\'(x) = 3x^{2} - 2$.'),
              working("f(2) &= 8 - 4 - 5 = -1", "f'(2) &= 12 - 2 = 10", 'x_1 &= 2 - \\frac{-1}{10} = 2.1'),
              prose('Then do it again from $2.1$, and again, keeping full accuracy between steps.'),
            ),
            ask('numer-newton-tree'),
            ask('iterate-newton-raphson'),
            ask('numer-newton-derivative', 2),
            teach(
              prose(
                'Close to a root Newton-Raphson is fast: the number of correct decimal places roughly doubles each step. Three or four steps from a sensible start usually settle a root to four places.',
              ),
              prose('Carrying on from $2.1$, the root being $2.094551\\ldots$, with how far out each step is beside it:'),
              working('x_1 &= 2.1 & &0.005', 'x_2 &= 2.094568 & &0.00002', 'x_3 &= 2.094551 & &0.0000000002'),
            ),
            ask('numer-newton-formula-tiles', 2),
            ask('numer-newton-tree', 2),
            ask('iterate-newton-raphson', 2),
          ],
          skillCheck: [ask('numer-newton-formula-tiles', 2), ask('numer-newton-tree', 2), ask('numer-newton-derivative', 2)],
        },
        {
          id: 'nm-l2-accuracy',
          title: 'A Root to a Set Accuracy',
          slides: [
            teach(
              prose(
                '$\\alpha = 1.84$ to 2 decimal places means $\\alpha$ rounds to $1.84$: it is somewhere from $1.835$ up to $1.845$. Those halfway points are the **bounds**.',
              ),
              maths('1.835 \\le \\alpha < 1.845'),
              prose('To prove it, show that $f$ changes sign across $[1.835, 1.845]$. The interval between the neighbours, $[1.83, 1.85]$, is too wide to prove anything.'),
            ),
            ask('numer-accuracy-choice'),
            ask('numer-bounds-steps'),
            ask('numer-newton-root-iterate'),
            teach(
              prose(
                'So a root to a set accuracy takes two steps. Iterate until two values in a row agree to the places asked; then check the sign change across the bounds.',
              ),
              prose(
                'The check matters. Iterates can agree while the root sits just across a rounding boundary, and only the sign change catches that.',
              ),
            ),
            ask('numer-stop-flow'),
            ask('numer-accuracy-choice', 2),
            ask('numer-bounds-steps', 2),
            teach(
              prose('Newton-Raphson on $f(x) = x^{2} - N$ finds $\\sqrt{N}$, with a formula that needs nothing but arithmetic:'),
              maths('x_{n+1} = x_n - \\frac{x_n^{2} - N}{2x_n}'),
              prose('It is how calculators found square roots long before they had a button for it.'),
            ),
            ask('numer-newton-root-iterate', 2),
            ask('numer-stop-flow', 2),
          ],
          skillCheck: [ask('numer-accuracy-choice', 2), ask('numer-bounds-steps', 2), ask('numer-stop-flow', 2)],
        },
        {
          id: 'nm-l2-nr-fails',
          title: 'When Newton-Raphson Fails',
          slides: [
            teach(
              prose(
                "The formula divides by $f'(x_n)$. At a turning point $f'(x_n) = 0$: the tangent is flat, it never meets the axis, and there is no $x_{n+1}$.",
              ),
              prose("So before starting, find where $f'(x) = 0$ and keep $x_0$ away from those values."),
            ),
            ask('numer-flat-tiles'),
            ask('numer-nr-fail-picture'),
            ask('numer-tangent-slider'),
            teach(
              prose(
                "Near a turning point the tangent is shallow rather than flat. $\\frac{f(x_0)}{f'(x_0)}$ is then large, so $x_1$ lands a long way off, often closer to a different root than the one you wanted.",
              ),
              prose('Newton-Raphson finds a root. Which one depends on where you start.'),
            ),
            ask('numer-nr-fail-flow'),
            ask('numer-flat-tiles', 2),
            teach(
              prose(
                'Now and then a start sends the values back and forth between two points for ever. $f(x) = x^{3} - 2x + 2$ from $x_0 = 0$, with $f\'(x) = 3x^{2} - 2$:',
              ),
              working("x_1 &= 0 - \\frac{f(0)}{f'(0)} = 0 - \\frac{2}{-2} = 1", "x_2 &= 1 - \\frac{f(1)}{f'(1)} = 1 - \\frac{1}{1} = 0"),
              prose(
                'Back at $0$, so the next step gives $1$ again, and so on. A different start is the only cure: start close to the root you want, where the curve is steep, and away from turning points.',
              ),
            ),
            ask('numer-nr-fail-picture', 2),
            ask('numer-tangent-slider', 2),
            ask('numer-nr-fail-flow', 2),
          ],
          skillCheck: [ask('numer-nr-fail-picture', 2), ask('numer-tangent-slider', 2), ask('numer-nr-fail-flow', 2)],
        },
        {
          id: 'nm-l2-trapezium',
          title: 'The Trapezium Rule',
          slides: [
            teach(
              prose(
                "Rectangle sums (Further Integration, Integration as a Limit of a Sum) estimate an area with rectangles. The trapezium rule uses trapezia instead: split $[a, b]$ into $n$ strips of width $h = \\frac{b - a}{n}$ and join the heights with straight lines.",
              ),
              maths('\\begin{gathered} \\int_a^b y\\,dx \\approx \\frac{h}{2}\\big[y_0 + y_n \\\\ + 2(y_1 + \\cdots + y_{n-1})\\big] \\end{gathered}'),
              prose('The two end heights count once. Every height in the middle is shared by two trapezia, so it counts twice.'),
            ),
            ask('numer-trapezium-tiles'),
            teach(
              prose('$\\int_0^3 (x^{2} + 1)\\,dx$ with 3 strips: $h = \\frac{3 - 0}{3} = 1$, and the heights at $x = 0, 1, 2, 3$ are $1, 2, 5, 10$.'),
              trapezia,
              working('y_0 + y_3 &= 1 + 10 = 11', 'y_1 + y_2 &= 2 + 5 = 7', '\\tfrac{1}{2}(11 + 2 \\times 7) &= \\tfrac{1}{2} \\times 25 = 12.5'),
              prose('The exact value is $12$, so the estimate is close but not exact: it is an estimate, not the integral.'),
            ),
            ask('numer-ordinates-tree'),
            ask('numer-trapezium-estimate'),
            ask('numer-trapezium-steps'),
            ask('numer-trapezium-tiles', 2),
            teach(
              prose(
                'More strips give a better estimate, since shorter chords hug the curve more closely. Halving $h$ cuts the error to about a quarter.',
              ),
              prose(
                'For $\\int_0^3 (x^{2} + 1)\\,dx$, 3 strips gave $12.5$, out by $0.5$. Six strips of $h = 0.5$ give $12.125$, out by $0.125$: a quarter of the error.',
              ),
            ),
            ask('numer-ordinates-tree', 2),
            ask('numer-trapezium-estimate', 2),
            ask('numer-trapezium-steps', 2),
          ],
          skillCheck: [ask('numer-ordinates-tree', 2), ask('numer-trapezium-estimate', 2), ask('numer-trapezium-steps', 2)],
        },
        {
          id: 'nm-l2-over-under',
          title: 'Over or Under?',
          slides: [
            teach(
              prose(
                "Whether the estimate is too big or too small depends on which way the curve bends. If it bends upward ($f''(x) > 0$, concave up), each chord sits above the curve and the trapezia hold too much: an **overestimate**.",
              ),
              trapezia,
              prose("If it bends downward ($f''(x) < 0$), the chords sit below: an **underestimate**."),
            ),
            ask('numer-concavity-choice'),
            ask('numer-mean-height-slider'),
            ask('numer-concavity-flow'),
            teach(
              prose(
                "To decide without a picture, find $f''(x)$ and check its sign across the whole interval. If it changes sign inside, the curve bends both ways and the rule alone cannot say.",
              ),
              prose('For $f(x) = x^{3}$ on $[1, 3]$:'),
              maths("f''(x) = 6x > 0"),
            ),
            ask('numer-error-value'),
            ask('numer-concavity-choice', 2),
            ask('numer-mean-height-slider', 2),
            teach(
              prose(
                'When the exact value is known, the error is the estimate minus the exact value. Positive means an overestimate; for $\\int_0^3 (x^{2} + 1)\\,dx$ it was $12.5 - 12 = 0.5$.',
              ),
            ),
            ask('numer-concavity-flow', 2),
            ask('numer-error-value', 2),
          ],
          skillCheck: [ask('numer-concavity-choice', 2), ask('numer-concavity-flow', 2), ask('numer-error-value', 2)],
        },
      ],
      levelCheck: [
        ask('numer-newton-derivative', 2),
        ask('numer-newton-formula-tiles', 2),
        ask('numer-newton-tree', 2),
        ask('iterate-newton-raphson', 2),
        ask('numer-accuracy-choice', 2),
        ask('numer-bounds-steps', 2),
        ask('numer-stop-flow', 2),
        ask('numer-nr-fail-picture', 2),
        ask('numer-tangent-slider', 2),
        ask('numer-flat-tiles', 2),
        ask('numer-ordinates-tree', 2),
        ask('numer-trapezium-estimate', 2),
        ask('numer-concavity-choice', 2),
        ask('numer-mean-height-slider', 2),
        ask('numer-error-value', 2),
      ],
    },
    {
      id: 'nm-l3',
      title: 'Bounds and Errors',
      lessons: [
        {
          id: 'nm-l3-absolute',
          title: 'Absolute Error',
          slides: [
            teach(
              prose('An estimate is rarely exact. Its **error** is the estimate minus the exact value.'),
              prose('Positive means an overestimate, negative an underestimate. The **absolute error** is its size, with the sign dropped.'),
            ),
            ask('numer-abs-error'),
            ask('numer-abs-size-steps'),
            ask('numer-closest-choice'),
            teach(
              prose('$\\frac{5}{8} = 0.625$, estimated as $0.63$:'),
              working('\\text{error} &= 0.63 - 0.625', '&= 0.005'),
              prose('Positive, so an overestimate; its size, the absolute error, is also $0.005$.'),
            ),
            asking(
              'numer-over-under-flow',
              1,
              prose(
                'A value correctly rounded to 2 decimal places is never out by more than $0.005$, half a unit in the last place (Numerical Methods Basics, A Root to a Set Accuracy). An estimate out by more than that is not the correctly rounded value.',
              ),
              prose('$\\frac{2}{3} = 0.66666\\ldots$:'),
              working('0.67 - 0.66666\\ldots &\\approx 0.0033', '0.66 - 0.66666\\ldots &\\approx -0.0067'),
              prose('$0.67$ is within $0.005$, so it is $\\frac{2}{3}$ correctly rounded. $0.66$ is out by more, so it is not.'),
            ),
            ask('numer-abs-error', 2),
            ask('numer-abs-size-steps', 2),
            teach(
              prose(
                'Each extra decimal place makes that limit ten times smaller: to 3 decimal places it is $0.0005$. $\\sqrt{2} = 1.414213\\ldots$:',
              ),
              working('1.414 - 1.414213\\ldots &\\approx -0.00021', '1.415 - 1.414213\\ldots &\\approx 0.00079'),
              prose('$1.414$ is within $0.0005$, so it is $\\sqrt{2}$ correctly rounded; $1.415$ is not, however many places it shows.'),
            ),
            ask('numer-closest-choice', 2),
            ask('numer-over-under-flow', 2),
          ],
          skillCheck: [ask('numer-abs-error', 2), ask('numer-abs-size-steps', 2), ask('numer-over-under-flow', 2)],
        },
        {
          id: 'nm-l3-relative',
          title: 'Relative and Percentage Error',
          slides: [
            teach(
              prose(
                'An error of $1$ cm is huge in a $5$ cm pencil and nothing in a $100$ m track. The **relative error** measures the error against the size of the thing:',
              ),
              maths('\\frac{\\text{estimate} - \\text{exact value}}{\\text{exact value}}'),
              prose('Times $100$, it is the **percentage error**. A length of exactly $40$ cm, measured as $41$ cm:'),
              working('\\text{error} &= 41 - 40 = 1', '\\text{relative} &= \\tfrac{1}{40} = 0.025', '\\text{percentage} &= 0.025 \\times 100 = 2.5\\%'),
              prose('Always divide by the exact value, never the estimate.'),
            ),
            ask('numer-rel-error'),
            ask('numer-rel-tiles'),
            teach(
              prose(
                'Relative error is what makes different measurements comparable. $2$ g out on $1$ kg, which is $1000$ g, and $0.3$ g out on $10$ g:',
              ),
              working('\\tfrac{2}{1000} &= 0.002 = 0.2\\%', '\\tfrac{0.3}{10} &= 0.03 = 3\\%'),
              prose('The second error is smaller, but the first measurement is better: its error is a smaller share of the thing measured.'),
            ),
            ask('numer-rel-compare'),
            asking(
              'numer-rel-slider',
              1,
              prose(
                'Backwards: from the exact value and the percentage error to the estimate. The error is that percentage **of the exact value**. Exactly $40$, with a percentage error of $-5\\%$:',
              ),
              working('5\\% \\text{ of } 40 &= 0.05 \\times 40 = 2', '\\text{estimate} &= 40 - 2 = 38'),
              prose('A positive percentage adds instead: $+5\\%$ gives $40 + 2 = 42$.'),
            ),
            ask('numer-rel-error', 2),
            ask('numer-rel-tiles', 2),
            teach(
              prose(
                'From the estimate back to the exact value, divide. A percentage error of $+10\\%$ makes the estimate $110\\%$ of the exact value, so an estimate of $44$ gives',
              ),
              working('\\text{exact} &= 44 \\div 1.1 = 40'),
              prose(
                'Not $44 - 4.4$: the $10\\%$ is of the exact value, not of the estimate. With $-5\\%$ the estimate is $95\\%$ of it, so an estimate of $38$ gives $38 \\div 0.95 = 40$.',
              ),
            ),
            ask('numer-rel-slider', 2),
            ask('numer-rel-compare', 2),
          ],
          skillCheck: [ask('numer-rel-error', 2), ask('numer-rel-slider', 2), ask('numer-rel-compare', 2)],
        },
        {
          id: 'nm-l3-bounds',
          title: 'Bounds on a Result',
          slides: [
            teach(
              prose(
                'A value rounded to 1 decimal place could be anywhere within $0.05$ of it (Numerical Methods Basics, A Root to a Set Accuracy): $a = 3.4$ means $3.35 \\le a < 3.45$. To the nearest whole number it is within $0.5$: $12$ means $11.5$ to $12.5$. Calculate with rounded values and the result is uncertain too.',
              ),
              prose('With $b = 2.7$ as well, the least sum takes both lower bounds and the greatest both upper bounds:'),
              working('3.35 + 2.65 &= 6.0', '3.45 + 2.75 &= 6.2'),
              prose('A product of positive values works the same way, lower with lower and upper with upper, as for a rectangle $a$ by $b$:'),
              working('3.35 \\times 2.65 &= 8.8775', '3.45 \\times 2.75 &= 9.4875'),
            ),
            ask('numer-bound-value'),
            teach(
              prose(
                'Taking away or dividing turns an input round. The least $a - b$ is the least $a$ minus the greatest $b$; the least $\\frac{a}{b}$ is the least $a$ over the greatest $b$.',
              ),
              prose('With the same $a$ and $b$, the least and greatest $a - b$, then $\\frac{a}{b}$:'),
              working('3.35 - 2.75 &= 0.6', '3.45 - 2.65 &= 0.8'),
              working('\\tfrac{3.35}{2.75} &= 1.2181\\ldots', '\\tfrac{3.45}{2.65} &= 1.3018\\ldots'),
            ),
            ask('numer-bound-tree'),
            ask('numer-bound-ends'),
            teach(
              prose(
                'Bounds say how far a result can be trusted. If both bounds round to the same value at some accuracy, the result is known to that accuracy.',
              ),
              prose('$ab$ above runs from $8.8775$ to $9.4875$. To 1 decimal place those are $8.9$ and $9.5$, which differ; to the nearest whole number both are $9$. So $ab = 9$ to the nearest whole number.'),
            ),
            ask('numer-bound-accuracy-flow'),
            ask('numer-bound-tree', 2),
            asking(
              'numer-bound-value',
              2,
              prose(
                'With two operations, push each input to whichever end makes the whole thing smallest (or largest). Whatever is taken away, or sits on the bottom of a fraction, goes to the opposite end. With $c = 1.2$ as well:',
              ),
              prose('Least: $3.35 \\times 2.65 - 1.25$'),
              working('&= 8.8775 - 1.25', '&= 7.6275'),
              prose('Greatest: $3.45 \\times 2.75 - 1.15$'),
              working('&= 9.4875 - 1.15', '&= 8.3375'),
            ),
            ask('numer-bound-ends', 2),
            ask('numer-bound-accuracy-flow', 2),
          ],
          skillCheck: [ask('numer-bound-tree', 2), ask('numer-bound-value', 2), ask('numer-bound-ends', 2)],
        },
        {
          id: 'nm-l3-carry',
          title: 'An Error Carried Through g',
          slides: [
            teach(
              prose(
                'An iterate is only ever known to so many places, so every step starts from a value with an error in it. If $x_n$ lies between two bounds, run $g$ on both: $x_{n+1}$ lies between the results.',
              ),
              prose('For $x_{n+1} = \\sqrt{x_n + 3}$ with $x_n = 2.30$ to 2 decimal places:'),
              working('\\sqrt{2.295 + 3} &= 2.3011', '\\sqrt{2.305 + 3} &= 2.3033'),
              prose('The gap of $0.01$ in $x_n$ has shrunk to about $0.002$ in $x_{n+1}$.'),
            ),
            ask('numer-carry-tree'),
            ask('numer-carry-slider'),
            teach(
              prose("Near the root each step multiplies the error by about $g'(\\alpha)$ (Numerical Methods Basics, When Iteration Fails):"),
              maths("x_{n+1} - \\alpha \\approx g'(\\alpha)(x_n - \\alpha)"),
              prose('Above, the root of $x = \\sqrt{x + 3}$ is $\\alpha \\approx 2.30$:'),
              working("g'(x) &= \\frac{1}{2\\sqrt{x + 3}}", "g'(2.30) &= \\frac{1}{2\\sqrt{5.30}} \\approx 0.22", '0.22 \\times 0.01 &= 0.0022'),
              prose('So a gap of $0.01$ in $x_n$ becomes about $0.002$ in $x_{n+1}$, as the bounds showed.'),
            ),
            ask('numer-carry-error'),
            ask('numer-shrink-flow'),
            ask('numer-carry-tree', 2),
            teach(
              prose(
                "When $g$ is decreasing, $g'(\\alpha) < 0$: the error changes sign each step, and the upper bound of $x_n$ gives the lower bound of $x_{n+1}$. Its size still shrinks while $|g'(\\alpha)| < 1$.",
              ),
              prose('For $x_{n+1} = \\frac{6}{x_n + 1}$ with $x_n = 2.0$ to 1 decimal place:'),
              working('\\tfrac{6}{1.95 + 1} &= 2.034 \\quad \\text{(upper)}', '\\tfrac{6}{2.05 + 1} &= 1.967 \\quad \\text{(lower)}'),
            ),
            ask('numer-carry-error', 2),
            ask('numer-carry-slider', 2),
            ask('numer-shrink-flow', 2),
          ],
          skillCheck: [ask('numer-carry-tree', 2), ask('numer-carry-error', 2), ask('numer-shrink-flow', 2)],
        },
        {
          id: 'nm-l3-k-steps',
          title: 'The Error After k Steps',
          slides: [
            teach(
              prose("Each step multiplies the error by about $r = |g'(\\alpha)|$, so after $k$ steps a starting error of at most $\\delta$ is at most about"),
              maths('r^{k}\\delta'),
              prose('To be sure of an accuracy $\\varepsilon$, find the first $k$ with $r^{k}\\delta < \\varepsilon$. With $r = 0.4$, $\\delta = 0.5$ and $\\varepsilon = 0.001$:'),
              working('0.4^{k} \\times 0.5 &< 0.001', '0.4^{k} &< 0.002', 'k \\ln 0.4 &< \\ln 0.002', 'k &> \\frac{\\ln 0.002}{\\ln 0.4} = 6.78'),
              prose('$\\ln 0.4$ is negative, so dividing by it turns the inequality round. The first whole number past $6.78$ is $k = 7$.'),
            ),
            ask('numer-k-count'),
            ask('numer-k-tiles'),
            ask('numer-k-logs-steps'),
            teach(
              prose(
                'The same factor shows in a table. $x_{n+1} = \\sqrt[3]{3x_n + 5}$ from $x_0 = 2$, where $r \\approx 0.19$, written to 2 decimal places:',
              ),
              working('x_1 &= 2.2240\\ldots \\to 2.22', 'x_2 &= 2.2684\\ldots \\to 2.27', 'x_3 &= 2.2770\\ldots \\to 2.28'),
              prose(
                'The steps between rows, $0.224$, $0.044$, $0.009$, each shrink by about $0.2$, as the errors do. The values settle between $2.2$ and $2.3$, and a change of sign proves it:',
              ),
              working('f(x) &= x^{3} - 3x - 5', 'f(2.2) &= -0.952 < 0', 'f(2.3) &= 0.267 > 0'),
              prose('So $2.2 < \\alpha < 2.3$.'),
            ),
            ask('numer-error-iterate'),
            ask('numer-k-count', 2),
            ask('numer-k-tiles', 2),
            teach(
              prose(
                "The smaller $r$ is, the faster the error dies away: $r = 0.1$ gains a decimal place every step, while $r = 0.9$ takes about twenty-two steps for each one. A scheme with $|g'(\\alpha)|$ close to $1$ converges, but slowly.",
              ),
            ),
            ask('numer-k-logs-steps', 2),
            ask('numer-error-iterate', 2),
          ],
          skillCheck: [ask('numer-k-count', 2), ask('numer-k-tiles', 2), ask('numer-k-logs-steps', 2)],
        },
      ],
      levelCheck: [
        ask('numer-abs-error', 2),
        ask('numer-bound-tree', 2),
        ask('numer-rel-error+choice', 2),
        ask('numer-carry-slider', 2),
        ask('numer-k-tiles', 2),
        ask('numer-over-under-flow', 2),
        ask('numer-bound-ends', 2),
        ask('numer-rel-slider', 2),
        ask('numer-carry-tree', 2),
        ask('numer-k-count', 2),
        ask('numer-closest-choice', 2),
        ask('numer-shrink-flow', 2),
        ask('numer-bound-value', 2),
        ask('numer-rel-compare', 2),
        ask('numer-error-iterate', 2),
      ],
    },
    {
      id: 'nm-l4',
      title: "Simpson's Rule",
      lessons: [
        {
          id: 'nm-l4-parabola',
          title: 'A Parabola Through Three Points',
          slides: [
            teach(
              prose(
                "The trapezium rule joins the heights with straight lines (Numerical Methods Basics, The Trapezium Rule). **Simpson's rule** takes the strips two at a time and runs a parabola through each three heights, which follows a bending curve far more closely.",
              ),
              parabolaFigure,
              prose('For two strips of width $h$, with heights $y_0$, $y_1$, $y_2$:'),
              maths('A \\approx \\frac{h}{3}(y_0 + 4y_1 + y_2)'),
            ),
            ask('numer-parabola-tree'),
            asking(
              'numer-simpson-tiles',
              1,
              prose('When only the interval is given, find $h$ first: two strips share its width. Over $[1, 1.6]$:'),
              working('h &= \\frac{1.6 - 1}{2} = 0.3', '\\frac{h}{3} &= \\frac{0.3}{3} = 0.1'),
              prose('So $A \\approx 0.1(y_0 + 4y_1 + y_2)$, with the heights at $x = 1$, $1.3$ and $1.6$.'),
            ),
            ask('numer-weights-choice'),
            teach(
              prose('$\\int_0^2 (3x^{2} + 1)\\,dx$ with $h = 1$ has heights $1$, $4$ and $13$:'),
              working('\\tfrac{1}{3}(1 + 4 \\times 4 + 13) &= \\tfrac{1}{3} \\times 30', '&= 10'),
              prose('Integrating gives $\\big[x^{3} + x\\big]_0^2 = 10$ too: the parabola through three points of a parabola is the curve itself.'),
            ),
            ask('numer-simpson-steps'),
            ask('numer-parabola-tree', 2),
            ask('numer-simpson-tiles'),
            teach(
              prose(
                'The weights $1, 4, 1$ add up to $6$, and $\\frac{h}{3} \\times 6 = 2h$, the width of the pair. So on a flat line every height is the same and the rule gives width times height, as it should. The middle height counts most because it sits in the middle of the parabola.',
              ),
              prose('A flat line $y = 5$ over $[0, 2]$, $h = 1$: $\\tfrac{1}{3}(5 + 4 \\times 5 + 5) = \\tfrac{1}{3} \\times 30 = 10$, which is $2 \\times 5$.'),
            ),
            ask('numer-weights-choice'),
            ask('numer-simpson-steps'),
          ],
          // Difficulty 2 of these three uses four strips, which is the next lesson.
          skillCheck: [ask('numer-parabola-tree', 2), ask('numer-simpson-steps'), ask('numer-weights-choice')],
        },
        {
          id: 'nm-l4-strips',
          title: 'More Strips',
          slides: [
            teach(
              prose(
                'With more strips, take them in pairs, one parabola to a pair. Each pair weights its heights $1, 4, 1$, and a height where two pairs meet collects a $1$ from each: $2$.',
              ),
              working('A &\\approx \\tfrac{h}{3}[y_0 + y_n', '&\\quad + 4(y_1 + y_3 + \\cdots)', '&\\quad + 2(y_2 + y_4 + \\cdots)]'),
              prose('Four strips weight the heights $1, 4, 2, 4, 1$; six strips, $1, 4, 2, 4, 2, 4, 1$.'),
            ),
            asking(
              'numer-strips-tree',
              1,
              prose('Heights $3, 5, 9, 15, 23$ at $x = 0, 3, 6, 9, 12$: four strips, so $h = 3$.'),
              working('y_0 + y_4 &= 3 + 23 = 26', '4(y_1 + y_3) &= 4(5 + 15) = 80', '2y_2 &= 2 \\times 9 = 18', '\\tfrac{3}{3}(26 + 80 + 18) &= 124'),
            ),
            ask('numer-weights-tiles'),
            ask('numer-simpson-estimate'),
            teach(
              prose(
                'Pairs only work when the strips pair up, so $n$ must be **even**: an odd number of heights, since there is always one more height than strips.',
              ),
              prose(
                "Six heights make five strips. Use Simpson's rule on the first four and the trapezium rule on the last one, then add.",
              ),
            ),
            ask('numer-odd-flow'),
            ask('numer-strips-tree', 2),
            ask('numer-weights-tiles', 2),
            teach(
              prose('A check on the weights: they always add up to $3n$ for $n$ strips, so on a flat line the rule gives the whole width times the height.'),
              working('1 + 4 + 2 + 4 + 1 &= 12 = 3 \\times 4', '\\tfrac{h}{3} \\times 12 &= 4h'),
              prose('Four strips of width $h$ are $4h$ wide, as they should be. If your weights add up to anything else, one is wrong.'),
            ),
            ask('numer-simpson-estimate', 2),
            ask('numer-odd-flow', 2),
          ],
          skillCheck: [ask('numer-strips-tree', 2), ask('numer-weights-tiles', 2), ask('numer-simpson-estimate', 2)],
        },
        {
          id: 'nm-l4-compare',
          title: 'Simpson Against the Trapezium',
          slides: [
            teach(
              prose(
                'The same heights give two estimates. The trapezium rule joins them with straight chords, which cut across a bend (Numerical Methods Basics, Over or Under); the parabolas follow it.',
              ),
              working('T &= \\tfrac{h}{2}(y_0 + 2y_1 + y_2)', 'S &= \\tfrac{h}{3}(y_0 + 4y_1 + y_2)'),
            ),
            ask('numer-both-tree'),
            ask('numer-gap-value'),
            ask('numer-closer-choice'),
            teach(
              prose(
                "Simpson's rule is the trapezium rule corrected. With $T_1$ from one strip and $T_2$ from two, on the same three heights:",
              ),
              maths('S = \\frac{4T_2 - T_1}{3}'),
              prose('$y = 3x^{2}$ on $[0, 2]$ has heights $0, 3, 12$ at $x = 0, 1, 2$:'),
              working('T_1 &= \\tfrac{2}{2}(0 + 12) = 12', 'T_2 &= \\tfrac{1}{2}(0 + 2 \\times 3 + 12) = 9', 'S &= \\frac{4 \\times 9 - 12}{3} = 8'),
              prose(
                "That is $\\tfrac{1}{3}(0 + 4 \\times 3 + 12) = 8$, Simpson's rule. And which way the estimate moved tells you the bend: $T_2 < T_1$, so the chords were sitting above the curve, and it bends upward.",
              ),
            ),
            ask('numer-refine-flow'),
            ask('numer-both-tree', 2),
            ask('numer-gap-value', 2),
            teach(
              prose(
                "Halve the strip width and the trapezium rule's error falls to about a quarter, Simpson's to about a sixteenth. So Simpson's rule is usually far closer. Not always: on a quartic whose bend all but evens out, the trapezium rule can land nearer.",
              ),
            ),
            ask('numer-closer-choice', 2),
            ask('numer-refine-flow', 2),
          ],
          skillCheck: [ask('numer-both-tree', 2), ask('numer-gap-value', 2), ask('numer-refine-flow', 2)],
        },
        {
          id: 'nm-l4-exact',
          title: 'Exact for Cubics',
          slides: [
            teach(
              prose(
                "A parabola matches a quadratic exactly, so Simpson's rule is exact for quadratics. It is exact for **cubics** too: an $x^{3}$ term's error on one strip of a pair cancels on the other. From $x^{4}$ on, it is only an estimate.",
              ),
              prose('The exact value comes from integrating, as in Integration level 2, Definite Integrals.'),
            ),
            ask('numer-cubic-steps'),
            ask('numer-simpson-error'),
            ask('numer-exact-flow'),
            teach(
              prose('With 2 strips on $[0, 2]$:'),
              working('\\tfrac{1}{3}(0 + 4 \\times 1 + 8) &= 4', '\\textstyle\\int_0^2 x^{3}\\,dx &= 4'),
              prose('but for $x^{4}$ the rule gives $\\tfrac{1}{3}(0 + 4 + 16) = \\tfrac{20}{3}$, against $\\int_0^2 x^{4}\\,dx = 6.4$.'),
            ),
            ask('numer-exact-choice'),
            ask('numer-cubic-steps', 2),
            ask('numer-simpson-error', 2),
            teach(
              prose(
                "So the degree decides, and a product has to be counted: $(x - 1)^{2}(x + 3)$ has degree $3$, and Simpson's rule gets it exactly. Anything that is not a polynomial, such as $2^{x}$, $\\frac{k}{x}$ or $\\sqrt{x}$, gets an estimate however many strips are used.",
              ),
            ),
            ask('numer-exact-flow', 2),
            ask('numer-exact-choice', 2),
          ],
          skillCheck: [ask('numer-simpson-error', 2), ask('numer-exact-flow', 2), ask('numer-cubic-steps', 2)],
        },
        {
          id: 'nm-l4-readings',
          title: 'From a Table of Readings',
          slides: [
            teach(
              prose(
                "Simpson's rule needs only heights at equal steps, not a formula, so it works straight from measurements: a river's depth across it gives the area of its cross-section, and a car's speed every few seconds gives the distance it covers.",
              ),
              prose(
                'Divide the estimate by the width and you have the mean height: the rectangle that wide and that tall has the same area.',
              ),
            ),
            ask('numer-table-tree'),
            ask('numer-readings-estimate'),
            ask('numer-readings-slider'),
            teach(
              prose(
                "Count the strips first: one fewer than the readings. Seven readings make six strips, so Simpson's rule takes them all. Six readings make five, so use Simpson's rule on the first four strips and the trapezium rule on the last.",
              ),
            ),
            ask('numer-odd-choice'),
            ask('numer-table-tree', 2),
            ask('numer-readings-estimate', 2),
            teach(
              prose('Speeds $0, 6, 10, 12, 13$ m/s, read every $3$ seconds:'),
              working('0 + 13 &= 13', '4(6 + 12) &= 72', '2 \\times 10 &= 20', '\\tfrac{3}{3}(13 + 72 + 20) &= 105'),
              prose('About $105$ m in $12$ seconds, a mean speed of $8.75$ m/s.'),
            ),
            ask('numer-readings-slider', 2),
            ask('numer-odd-choice', 2),
          ],
          skillCheck: [ask('numer-table-tree', 2), ask('numer-readings-estimate', 2), ask('numer-odd-choice', 2)],
        },
      ],
      levelCheck: [
        ask('numer-simpson-tiles', 2),
        ask('numer-simpson-estimate', 2),
        ask('numer-both-tree', 2),
        ask('numer-exact-flow', 2),
        ask('numer-readings-estimate', 2),
        ask('numer-weights-choice', 2),
        ask('numer-odd-flow', 2),
        ask('numer-gap-value', 2),
        ask('numer-cubic-steps', 2),
        ask('numer-readings-slider', 2),
        ask('numer-strips-tree', 2),
        ask('numer-refine-flow', 2),
        ask('numer-exact-choice', 2),
        ask('numer-odd-choice', 2),
        ask('numer-simpson-error', 2),
      ],
    },
    {
      id: 'nm-l5',
      title: "Euler's Method",
      lessons: [
        {
          id: 'nm-l5-tangent',
          title: 'One Tangent Step',
          slides: [
            teach(
              prose(
                'Most differential equations cannot be solved exactly. $\\frac{dy}{dx} = f(x, y)$ still says one thing everywhere: the gradient of the solution through any point.',
              ),
              prose(
                "**Euler's method** starts at the known point $(x_0, y_0)$, finds the gradient there, and walks a short step $h$ along the tangent:",
              ),
              working('x_1 &= x_0 + h', 'y_1 &= y_0 + h\\,f(x_0, y_0)'),
            ),
            asking(
              'numer-euler-step-tree',
              1,
              prose('$\\frac{dy}{dx} = x + y$ with $y = 1$ when $x = 0$, and $h = 0.5$:'),
              working('x_1 &= 0 + 0.5 = 0.5', 'f(0, 1) &= 0 + 1 = 1', 'h\\,f(0, 1) &= 0.5 \\times 1 = 0.5', 'y_1 &= 1 + 0.5 = 1.5'),
            ),
            ask('numer-euler-formula-tiles'),
            ask('numer-euler-point-choice'),
            teach(
              prose('That first step, from $(0, 1)$ to $(0.5, 1.5)$, drawn with the true solution curve:'),
              eulerTangent,
              prose(
                'The tangent reaches $1.5$ at $x = 0.5$; the curve itself is at about $1.8$ by then. One step is an estimate, and it drifts off the curve as the curve bends away.',
              ),
            ),
            ask('numer-euler-tangent-slider'),
            ask('numer-euler-step-tree', 2),
            ask('numer-euler-first-value'),
            teach(
              prose(
                'Three slips to avoid. The rise is $h$ times the gradient, not the gradient itself. The gradient is taken where the step **starts**, not where it ends. And the step is added to $y_0$: $h\\,f(x_0, y_0)$ alone is how far $y$ climbs, not where it gets to.',
              ),
            ),
            // Difficulty 2 of these two takes a second step, which is Stepping On.
            ask('numer-euler-formula-tiles'),
            ask('numer-euler-point-choice'),
          ],
          skillCheck: [ask('numer-euler-step-tree', 2), ask('numer-euler-tangent-slider', 2), ask('numer-euler-first-value', 2)],
        },
        {
          id: 'nm-l5-stepping',
          title: 'Stepping On',
          slides: [
            teach(
              prose(
                'One step gets from $x_0$ to $x_1$. To go further, do it again from where the step landed, with the gradient worked out afresh each time:',
              ),
              working('x_{n+1} &= x_n + h', 'y_{n+1} &= y_n + h\\,f(x_n, y_n)'),
              prose('Keep the working in a table: $n$, $x_n$, $y_n$, and the gradient that takes you to the next row.'),
            ),
            ask('numer-euler-table'),
            ask('numer-euler-chain-steps'),
            teach(
              prose('$\\frac{dy}{dx} = 2x + 1$ with $y = 1$ when $x = 0$, and $h = 0.5$:'),
              maths(
                '\\begin{array}{c|c|c|c} n & x_n & y_n & f(x_n) \\\\ \\hline 0 & 0 & 1 & 1 \\\\ 1 & 0.5 & 1.5 & 2 \\\\ 2 & 1 & 2.5 & 3 \\\\ 3 & 1.5 & 4 & \\end{array}',
              ),
              eulerSteps,
              prose('Each step is a straight line with the gradient at its own start, so the path is a chain of tangents.'),
            ),
            asking(
              'numer-euler-reach-value',
              1,
              prose(
                'To estimate $y$ at a given $x$, count the steps first: from $x_0$ to $X$ in steps of $h$ is $\\frac{X - x_0}{h}$ of them, and the answer is the last $y$. In the table above:',
              ),
              working('\\frac{1.5 - 0}{0.5} &= 3 \\text{ steps}', 'y(1.5) &\\approx y_3 = 4'),
            ),
            ask('numer-euler-table', 2),
            ask('numer-euler-chain-steps', 2),
            teach(
              prose(
                'When $f$ has $y$ in it as well, each gradient uses the $y$ the last step reached. $\\frac{dy}{dx} = x + y$ with $y = 1$ when $x = 0$, estimating $y(1)$ with $h = 0.5$: $\\frac{1 - 0}{0.5} = 2$ steps, so the answer is $y_2$.',
              ),
              working('f(0, 1) &= 0 + 1 = 1', 'y_1 &= 1 + 0.5 \\times 1 = 1.5', 'f(0.5, 1.5) &= 0.5 + 1.5 = 2', 'y_2 &= 1.5 + 0.5 \\times 2 = 2.5'),
              prose('So $y(1) \\approx 2.5$. The next lesson, When f Has y in It, takes this further.'),
            ),
            ask('numer-euler-count-flow'),
            ask('numer-euler-reach-value', 2),
            ask('numer-euler-count-flow', 2),
          ],
          skillCheck: [ask('numer-euler-table', 2), ask('numer-euler-chain-steps', 2), ask('numer-euler-reach-value', 2)],
        },
        {
          id: 'nm-l5-with-y',
          title: 'When f Has y in It',
          slides: [
            teach(
              prose(
                'When $\\frac{dy}{dx}$ has $y$ in it, the gradient depends on how high the curve is as well as where. So each step needs the $y$ the last step reached before its gradient can be found.',
              ),
              prose('$\\frac{dy}{dx} = x + y$ with $y = 1$ when $x = 0$, and $h = 0.5$:'),
              working('f(0, 1) &= 1', 'y_1 &= 1 + 0.5(1) = 1.5'),
              working('f(0.5, 1.5) &= 2', 'y_2 &= 1.5 + 0.5(2)', '&= 2.5'),
            ),
            ask('numer-euler-ytable'),
            ask('numer-euler-frozen-choice'),
            ask('numer-euler-y-tree'),
            teach(
              prose(
                'The slip is to hold the first gradient: $y_2 = 1 + 2 \\times 0.5 \\times 1 = 2$, as if the curve kept its starting slope. Or to update $x$ but not $y$: $f(0.5, 1) = 1.5$ instead of $2$.',
              ),
              prose('Neither is Euler. The gradient at the start of every step uses both the $x$ and the $y$ of that step.'),
            ),
            ask('numer-euler-slip-flow'),
            ask('numer-euler-y-value'),
            ask('numer-euler-ytable', 2),
            teach(
              prose(
                'Products work the same way: for $\\frac{dy}{dx} = xy$, the gradient at $(1, 2)$ is $1 \\times 2 = 2$, and at $(1.5, 3)$ it is $4.5$. If $f$ has no $y$ in it at all, as with $2x + 1$, the $y$ reached makes no difference to the gradient.',
              ),
              prose('An equation with $y$ in it usually has no neat exact solution, which is exactly when Euler earns its keep.'),
            ),
            ask('numer-euler-y-tree', 2),
            ask('numer-euler-frozen-choice', 2),
          ],
          skillCheck: [ask('numer-euler-y-tree', 2), ask('numer-euler-slip-flow', 2), ask('numer-euler-y-value', 2)],
        },
        {
          id: 'nm-l5-exact',
          title: 'Against the Exact Answer',
          slides: [
            teach(
              prose(
                'When $\\frac{dy}{dx}$ is in $x$ alone, the equation can be solved exactly by integrating and fixing the constant from the starting point (Differential Equations Basics, A Particular Solution). Then the estimate can be checked.',
              ),
              prose('$\\frac{dy}{dx} = 2x + 1$ with $y = 1$ at $x = 0$ gives $y = x^{2} + x + 1$. At $x = 1.5$:'),
              working('y(1.5) &= 2.25 + 1.5 + 1', '&= 4.75', '\\text{error} &= 4 - 4.75', '&= -0.75'),
              prose('As in Bounds and Errors, the error is the estimate minus the true value, so a negative error means the estimate is too low.'),
            ),
            ask('numer-euler-exact-steps'),
            ask('numer-euler-error-tree'),
            teach(
              prose(
                'Which way Euler misses comes from the bend. If the gradient rises as $x$ grows, the curve bends upward, each tangent runs below it, and every step lands low: an **underestimate**. If the gradient falls, the curve bends down and Euler overshoots.',
              ),
              eulerSteps,
              prose(
                '$2x + 1$ is $1$ at $x = 0$ and $4$ at $x = 1.5$: it rises, so the steps fall further below $y = x^{2} + x + 1$ at every step, and the error, $-0.75$, is negative.',
              ),
            ),
            ask('numer-euler-miss-flow'),
            ask('numer-euler-error-value'),
            ask('numer-euler-miss-choice'),
            ask('numer-euler-exact-steps', 2),
            teach(
              prose(
                "Whether the gradient rises is a question about **its** gradient: for $\\frac{dy}{dx} = f(x)$ that is $f'(x)$. For $3x^{2} - 12$ on $[0.5, 1.5]$, $f'(x) = 6x$ is positive, so the gradient rises there even though it is negative throughout.",
              ),
            ),
            ask('numer-euler-error-tree', 2),
            ask('numer-euler-miss-flow', 2),
          ],
          skillCheck: [ask('numer-euler-error-value', 2), ask('numer-euler-miss-choice', 2), ask('numer-euler-error-tree', 2)],
        },
        {
          id: 'nm-l5-size',
          title: 'Step Size and Error',
          slides: [
            teach(
              prose('Smaller steps follow the curve more closely. The same journey from $x = 0$ to $x = 1.5$ for $\\frac{dy}{dx} = 2x + 1$:'),
              working('h = 0.5: \\quad y_3 &= 4', '\\text{error} &= -0.75', 'h = 0.25: \\quad y_6 &= 4.375', '\\text{error} &= -0.375'),
              prose('Halving the step halved the error. That is the rule of thumb for Euler: the error is roughly **proportional to $h$**.'),
            ),
            ask('numer-euler-halve-table'),
            teach(
              prose(
                'For a straight-line gradient like $2x + 1$ the halving is exact. For anything else it is roughly so, and closer the smaller $h$ already is. The estimate stays on the same side of the true value, since the curve still bends the same way.',
              ),
              prose('So from one estimate and the true value, the next can be foreseen. Above, the true $y(1.5)$ is $4.75$:'),
              prose('With $h = 0.5$ the error is $4 - 4.75 = -0.75$. With $h = 0.25$ it is roughly half that:'),
              working('\\text{error} &\\approx \\tfrac{1}{2}(-0.75) = -0.375', 'y_6 &\\approx 4.75 - 0.375 = 4.375'),
            ),
            ask('numer-euler-halve-choice'),
            ask('numer-euler-size-slider'),
            teach(
              prose('So a target error sets the step. The same journey, with an error of $0.75$ wanted down to $0.05$:'),
              working('\\frac{0.75}{0.05} &= 15', 'h &= \\frac{0.5}{15} = \\frac{1}{30}', '\\text{steps} &= 3 \\times 15 = 45'),
              prose(
                'The error must shrink $15$ times, so $h$ must too, and a step $15$ times shorter takes $15$ times as many steps over the same journey: $45$ instead of $3$. Every extra decimal place costs about ten times the steps, which is why better methods than Euler exist.',
              ),
            ),
            ask('numer-euler-size-flow'),
            ask('numer-euler-needed-value'),
            ask('numer-euler-halve-table', 2),
            ask('numer-euler-halve-choice', 2),
            ask('numer-euler-size-slider', 2),
          ],
          skillCheck: [ask('numer-euler-halve-table', 2), ask('numer-euler-needed-value', 2), ask('numer-euler-size-flow', 2)],
        },
      ],
      levelCheck: [
        ask('numer-euler-step-tree', 2),
        ask('numer-euler-table', 2),
        ask('numer-euler-frozen-choice', 2),
        ask('numer-euler-error-value', 2),
        ask('numer-euler-size-flow', 2),
        ask('numer-euler-tangent-slider', 2),
        ask('numer-euler-count-flow', 2),
        ask('numer-euler-y-value', 2),
        ask('numer-euler-miss-flow', 2),
        ask('numer-euler-halve-choice', 2),
        ask('numer-euler-point-choice', 2),
        ask('numer-euler-chain-steps', 2),
        ask('numer-euler-ytable', 2),
        ask('numer-euler-exact-steps', 2),
        ask('numer-euler-needed-value', 2),
      ],
    },
    {
      id: 'nm-l6',
      title: 'Choosing a Method',
      lessons: [
        {
          id: 'nm-l6-bisection',
          title: 'Interval Bisection',
          slides: [
            teach(
              prose(
                'A change of sign on $[a, b]$ traps a root (Numerical Methods Basics, The Change of Sign). **Bisection** tightens the trap: work out $f$ at the midpoint $m = \\frac{a + b}{2}$, and keep the half whose ends still differ in sign.',
              ),
              prose('$f(x) = x^{3} - 2x - 5$ with $f(2) = -1$ and $f(3) = 16$. The first midpoint is $2.5$, and $f(2.5) = 5.625$ is positive like $f(3)$, so keep $[2, 2.5]$. Then again:'),
              maths(
                '\\begin{array}{c|c|c|c|c} n & a & b & m & f(m) \\\\ \\hline 0 & 2 & 3 & 2.5 & + \\\\ 1 & 2 & 2.5 & 2.25 & + \\\\ 2 & 2 & 2.25 & 2.125 & + \\end{array}',
              ),
              prose('Every midpoint was positive, so $b$ moved in each time and the root is in $[2, 2.125]$.'),
            ),
            ask('numer-bisect-flow'),
            ask('numer-bisect-table'),
            ask('numer-bisect-choice'),
            teach(
              bisectionFigure,
              prose(
                'Each halving keeps the root trapped and halves the interval. After $k$ halvings the width is $\\frac{b - a}{2^{k}}$: above, $\\frac{1}{2^{3}} = \\frac{1}{8}$.',
              ),
              prose('To know how many halvings a job needs, solve that the other way. From width $1$ to below $0.001$:'),
              working('\\frac{1}{2^{k}} &< 0.001', '2^{k} &> 1000'),
              prose('$2^{9} = 512$ is not enough and $2^{10} = 1024$ is, so ten halvings.'),
            ),
            ask('numer-bisect-halvings'),
            ask('numer-bisect-table', 2),
            ask('numer-bisect-flow', 2),
            teach(
              prose(
                'The midpoint of the last interval is at most half its width from the root, so a midpoint within $\\varepsilon$ only needs a width below $2\\varepsilon$: one halving fewer.',
              ),
              prose('From width $1$, a midpoint within $0.001$ needs a width below $0.002$:'),
              working('\\frac{1}{2^{k}} &< 0.002', '2^{k} &> 500'),
              prose('$2^{9} = 512$ is enough, so nine halvings.'),
            ),
            ask('numer-bisect-halvings', 2),
            ask('numer-bisect-choice', 2),
          ],
          skillCheck: [ask('numer-bisect-table', 2), ask('numer-bisect-halvings', 2), ask('numer-bisect-choice', 2)],
        },
        {
          id: 'nm-l6-side',
          title: 'Side by Side',
          slides: [
            teach(
              prose(
                'Three ways to chase one root: bisection on a bracket, the iteration $x_{n+1} = g(x_n)$ (Numerical Methods Basics, Rearranging to x = g(x)), and Newton-Raphson, $x_{n+1} = x_n - \\frac{f(x_n)}{f\'(x_n)}$ (Numerical Methods Basics, The Tangent Step).',
              ),
              prose(
                'For $f(x) = x^{3} - 2x - 5$: bisection on $[2, 3]$, the iteration $x_{n+1} = \\sqrt[3]{2x_n + 5}$, and Newton-Raphson, both from $x_0 = 2$.',
              ),
            ),
            asking(
              'numer-side-flow',
              1,
              prose('The first step of each. Bisection: the midpoint of $[2, 3]$ is $2.5$. Iteration: put $x_0 = 2$ into $g$.'),
              working('x_1 &= \\sqrt[3]{2 \\times 2 + 5} = \\sqrt[3]{9} = 2.0801'),
              prose("Newton-Raphson: $f'(x) = 3x^{2} - 2$, then the formula at $x_0 = 2$."),
              working("f(2) &= 8 - 4 - 5 = -1", "f'(2) &= 12 - 2 = 10", 'x_1 &= 2 - \\frac{-1}{10} = 2.1'),
            ),
            ask('numer-side-steps'),
            teach(
              prose('Steps 1 to 3 of each:'),
              maths(
                '\\begin{array}{c|c|c} \\text{Bis.} & \\text{Iter.} & \\text{N-R} \\\\ \\hline 2.5 & 2.0801 & 2.1 \\\\ 2.25 & 2.0924 & 2.0946 \\\\ 2.125 & 2.0942 & 2.0946 \\end{array}',
              ),
              prose(
                'The root is $2.0946$ to four places. Newton-Raphson has it after two steps and stops moving; the iteration is still creeping up; bisection is still $0.03$ away.',
              ),
            ),
            ask('numer-side-table'),
            ask('numer-side-flow', 2),
            teach(
              prose(
                'Without knowing the root, how much a column is still moving is the clue. A value that has stopped changing to four places has settled; one still changing in the second place has not.',
              ),
              prose(
                'In the table above, Newton-Raphson went $2.0946$ to $2.0946$: no change. The iteration went $2.0924$ to $2.0942$, still moving in the third place. Bisection went $2.25$ to $2.125$: it only ever says which interval the root is in, so its midpoints jump by half the last width however close they are.',
              ),
            ),
            ask('numer-nearest-method'),
            ask('numer-side-steps', 2),
            ask('numer-side-table', 2),
            ask('numer-nearest-method', 2),
          ],
          skillCheck: [ask('numer-side-table', 2), ask('numer-side-flow', 2), ask('numer-nearest-method', 2)],
        },
        {
          id: 'nm-l6-speed',
          title: 'Speed of Convergence',
          slides: [
            teach(
              prose('The three methods close in at very different rates. Each step:'),
              prose('**Bisection** halves its error bound.'),
              prose("**Iteration** multiplies its error by about $|g'(\\alpha)|$."),
              prose('**Newton-Raphson** roughly doubles its correct decimal places.'),
              prose(
                'Halving is one binary place a step, so about $3.3$ steps for each decimal place. The iteration factor is in Bounds and Errors, The Error After k Steps.',
              ),
            ),
            ask('numer-speed-flow'),
            ask('numer-speed-table'),
            asking(
              'numer-k-count',
              1,
              prose(
                'How many iteration steps a job needs comes from logarithms. Each step multiplies the error by $0.5$, it starts at most $0.5$, and it must get below $0.001$:',
              ),
              working('0.5^{k} \\times 0.5 &< 0.001', '0.5^{k} &< 0.002', 'k \\ln 0.5 &< \\ln 0.002', 'k &> \\frac{\\ln 0.002}{\\ln 0.5} = 8.97'),
              prose('$\\ln 0.5$ is negative, so dividing by it turns the inequality round. The first whole number past $8.97$ is $k = 9$.'),
            ),
            teach(
              prose('From an error of $0.1$ to below $10^{-6}$:'),
              prose('Bisection: $\\frac{0.1}{2^{k}} < 10^{-6}$ needs $2^{k} > 100\\,000$; $2^{16} = 65\\,536$ is not enough and $2^{17} = 131\\,072$ is, so $k = 17$.'),
              prose(
                "Iteration with $|g'| = 0.2$: $0.2^{k} \\times 0.1 < 10^{-6}$ gives $0.2^{k} < 10^{-5}$, so $k > \\frac{\\ln 10^{-5}}{\\ln 0.2} = 7.15$ and $k = 8$.",
              ),
              prose('Newton-Raphson: $1, 2, 4, 8$ correct places, so $k = 3$.'),
              prose('A small $|g\'(\\alpha)|$ makes iteration quick; one near $1$ makes it slower than bisection.'),
            ),
            ask('numer-speed-tree'),
            ask('numer-speed-flow', 2),
            ask('numer-speed-table', 2),
            teach(
              prose(
                'Newton-Raphson squares the error, $e_{n+1} \\approx Ce_n^{2}$, which is why the places double. That only holds once it is close: from a poor start its first steps can wander.',
              ),
            ),
            ask('numer-k-count', 2),
            ask('numer-speed-tree', 2),
          ],
          skillCheck: [ask('numer-speed-table', 2), ask('numer-speed-tree', 2), ask('numer-speed-flow', 2)],
        },
        {
          id: 'nm-l6-breaks',
          title: 'When Each Breaks',
          slides: [
            teach(
              prose('Each method has its own way of failing:'),
              prose('**Bisection** cannot start without a change of sign on $[a, b]$.'),
              prose("**Iteration** runs away when $|g'(\\alpha)| > 1$."),
              prose("**Newton-Raphson** has no next value when $f'(x_0) = 0$: the tangent is flat."),
              prose(
                'These are Where the Sign Test Fails, When Iteration Fails and When Newton-Raphson Fails, all in Numerical Methods Basics. Here all three are set up on one $f$, and the question is which fails.',
              ),
            ),
            asking(
              'numer-breaks-flow',
              1,
              prose(
                "For the iteration, work out $g'(\\alpha)$. $f(x) = x^{3} - 12x + 5$ has a root $\\alpha \\approx 3.2$, and one rearrangement is $g(x) = \\sqrt[3]{12x - 5} = (12x - 5)^{1/3}$:",
              ),
              working("g'(x) &= \\tfrac{1}{3}(12x - 5)^{-2/3} \\times 12", '&= \\frac{4}{(12x - 5)^{2/3}}'),
              prose(
                "At the root $\\alpha^{3} = 12\\alpha - 5$, so $(12\\alpha - 5)^{2/3} = \\alpha^{2}$ and $g'(\\alpha) = \\frac{4}{\\alpha^{2}} = \\frac{4}{3.2^{2}} \\approx 0.39$. Below $1$, so it closes in.",
              ),
            ),
            ask('numer-breaks-tree'),
            ask('numer-breaks-picture'),
            teach(
              prose('$f(x) = x^{3} - 12x + 5$ turns at $x = \\pm 2$ and has roots near $-3.7$, $0.4$ and $3.2$. After the largest:'),
              working('f(0)\\,f(4) &= 5 \\times 21 > 0', "f'(2) &= 12 - 12 = 0"),
              prose('The other rearrangement, $g(x) = \\frac{x^{3} + 5}{12}$:'),
              working("g'(x) &= \\frac{3x^{2}}{12} = \\frac{x^{2}}{4}", "g'(3.2) &= \\frac{10.24}{4} \\approx 2.6"),
              prose('Bisection on $[0, 4]$ has no sign change though two roots are inside, that $g$ runs away, and $x_0 = 2$ gives a flat tangent. $[3, 4]$, $\\sqrt[3]{12x - 5}$ and $x_0 = 4$ all work.'),
            ),
            ask('numer-diverge-flow'),
            ask('numer-breaks-picture', 2),
            ask('numer-breaks-tree', 2),
            teach(
              prose(
                'Which rearrangement converges is decided at $\\alpha$, not at $x_0$: $\\sqrt[3]{12x - 5}$ has $g\'(\\alpha) = \\frac{4}{\\alpha^{2}}$, below $1$ for any root past $2$, while $\\frac{x^{3} + 5}{12}$ has $\\frac{\\alpha^{2}}{4}$, above it.',
              ),
            ),
            ask('numer-breaks-flow', 2),
            ask('numer-nr-fail-picture', 2),
          ],
          skillCheck: [ask('numer-breaks-flow', 2), ask('numer-breaks-picture', 2), ask('numer-breaks-tree', 2)],
        },
        {
          id: 'nm-l6-choosing',
          title: 'Which to Reach For',
          slides: [
            teach(
              prose('Reach for the fastest method that will work with what is in hand:'),
              prose('A formula for $f$ and a start where the tangent is steep: **Newton-Raphson**.'),
              prose("Otherwise, a rearrangement with $|g'| < 1$ near the root: **iteration**."),
              prose('Otherwise, a change of sign is all it takes: **bisection**.'),
            ),
            ask('numer-reach-flow'),
            ask('numer-reach-choice'),
            asking(
              'numer-reach-value',
              1,
              prose(
                "Once a plan is chosen, take its first step. For $f(x) = x^{3} - 12x + 5$ from $x_0 = 4$, with $f'(x) = 3x^{2} - 12$, Newton-Raphson gives",
              ),
              working("f(4) &= 64 - 48 + 5 = 21", "f'(4) &= 48 - 12 = 36", 'x_1 &= 4 - \\frac{21}{36} = 3.4167'),
              prose('The iteration $x_{n+1} = \\sqrt[3]{12x_n - 5}$ from the same start gives'),
              working('x_1 &= \\sqrt[3]{12 \\times 4 - 5} = \\sqrt[3]{43} = 3.5034'),
            ),
            teach(
              prose(
                'Newton-Raphson needs $f\'(x)$, so it is out when $f$ is only known from readings, or when the only start has a flat tangent. Iteration needs a rearrangement that converges. Bisection needs only the sign change, which is why it is the one that always works and the slowest.',
              ),
            ),
            ask('numer-reach-flow', 2),
            ask('numer-reach-choice', 2),
            teach(
              prose(
                'In practice they are used together: a few halvings to get close safely, then Newton-Raphson to finish in two or three steps, and a sign change either side of the answer to prove it is right (Numerical Methods Basics, A Root to a Set Accuracy).',
              ),
            ),
            ask('numer-reach-value', 2),
          ],
          skillCheck: [ask('numer-reach-flow', 2), ask('numer-reach-choice', 2), ask('numer-reach-value', 2)],
        },
      ],
      levelCheck: [
        ask('numer-bisect-table', 2),
        ask('numer-side-flow', 2),
        ask('numer-speed-tree', 2),
        ask('numer-breaks-flow', 2),
        ask('numer-reach-choice', 2),
        ask('numer-bisect-halvings', 2),
        ask('numer-side-table', 2),
        ask('numer-speed-flow', 2),
        ask('numer-breaks-picture', 2),
        ask('numer-reach-value', 2),
        ask('numer-bisect-choice', 2),
        ask('numer-nearest-method', 2),
        ask('numer-speed-table', 2),
        ask('numer-breaks-tree', 2),
        ask('numer-reach-flow', 2),
      ],
    },
  ],
};
