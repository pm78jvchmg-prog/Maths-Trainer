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
  blurb: 'Roots and areas you cannot find exactly, pinned down by sign changes, iteration, tangents and trapezia.',
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
            ask('numer-fail-picture'),
            ask('numer-fail-flow'),
            ask('numer-touch-tiles'),
            teach(
              prose(
                'Second, a touch. $f(x) = (x - 2)^{2}$ is $1$ at both $x = 1$ and $x = 3$, but it has a root at $x = 2$, where the curve touches the axis and turns back.',
              ),
              prose(
                'A squared factor makes a repeated root, and the curve touches rather than crosses there, so $f$ keeps the same sign either side of it.',
              ),
            ),
            ask('numer-split-value'),
            ask('numer-fail-picture', 2),
            ask('numer-fail-flow', 2),
            teach(
              prose('Third, two roots close together. Both ends can have the same sign while the curve dips below the axis and back.'),
              working('f(x) &= 16x^{2} - 48x + 35', 'f(1) &= 3, \\quad f(2) = 3', 'f(1.5) &= -1'),
              prose(
                'The ends agree, but the middle is negative: a change of sign on $[1, 1.5]$ and another on $[1.5, 2]$, so two roots. Testing a point inside is how you find out.',
              ),
            ),
            ask('numer-touch-tiles', 2),
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
            ask('numer-rearrange-tiles', 2),
            ask('numer-scheme-equation', 2),
            teach(
              prose('One equation has many rearrangements. $x^{3} - 3x - 5 = 0$ also gives'),
              working('x &= \\frac{x^{3} - 5}{3}', 'x &= \\frac{5}{x^{2} - 3}'),
              prose(
                'All three have the same roots, but they do not all behave the same when iterated. Some close in on the root and some run away from it, which is the next two lessons.',
              ),
            ),
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
            ask('numer-fixed-limit'),
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
                'To give the root to a set accuracy, iterate until two values in a row agree to that many decimal places. With a cobweb the values straddle the root, so the last two trap it between them.',
              ),
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
            ask('numer-which-converges'),
            ask('numer-diverge-flow'),
            teach(
              prose('$x^{3} - 3x - 5 = 0$ has a root $\\alpha \\approx 2.28$. Test two rearrangements. For $g(x) = \\sqrt[3]{3x + 5}$:'),
              maths("g'(\\alpha) = \\frac{1}{\\alpha^{2}} \\approx 0.19"),
              prose('For $g(x) = \\frac{x^{3} - 5}{3}$:'),
              maths("g'(\\alpha) = \\alpha^{2} \\approx 5.2"),
              prose('The first converges; the second throws every value further away than the last.'),
            ),
            ask('numer-fixed-limit'),
            ask('numer-gprime', 2),
            ask('numer-which-converges', 2),
            teach(
              prose(
                'A rearrangement that diverges says nothing against the root: $\\alpha$ is still there, and a different rearrangement of the same equation may find it. It is the recipe that failed, not the equation.',
              ),
            ),
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
            ask('numer-newton-tree'),
            teach(
              prose('For $f(x) = x^{3} - 2x - 5$ from $x_0 = 2$: $f\'(x) = 3x^{2} - 2$.'),
              working("f(2) &= -1, \\quad f'(2) = 10", 'x_1 &= 2 - \\frac{-1}{10} = 2.1'),
              prose('Then do it again from $2.1$, and again, keeping full accuracy between steps.'),
            ),
            ask('iterate-newton-raphson'),
            ask('numer-newton-derivative', 2),
            ask('numer-newton-formula-tiles', 2),
            teach(
              prose(
                'Close to a root Newton-Raphson is fast: the number of correct decimal places roughly doubles each step. Three or four steps from a sensible start usually settle a root to four places.',
              ),
            ),
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
            ask('numer-nr-fail-picture', 2),
            teach(
              prose(
                'Start close to the root you want, where the curve is steep, and away from turning points. Now and then a start sends the values back and forth between two points for ever, and a different start is the only cure.',
              ),
            ),
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
                "Integration's rectangle sums (level 8) estimate an area with rectangles. The trapezium rule uses trapezia instead: split $[a, b]$ into $n$ strips of width $h = \\frac{b - a}{n}$ and join the heights with straight lines.",
              ),
              maths('\\begin{gathered} \\int_a^b y\\,dx \\approx \\frac{h}{2}\\big[y_0 + y_n \\\\ + 2(y_1 + \\cdots + y_{n-1})\\big] \\end{gathered}'),
              prose('The two end heights count once. Every height in the middle is shared by two trapezia, so it counts twice.'),
            ),
            ask('numer-trapezium-tiles'),
            ask('numer-ordinates-tree'),
            ask('numer-trapezium-estimate'),
            teach(
              prose('$\\int_0^3 (x^{2} + 1)\\,dx$ with 3 strips: $h = 1$, and the heights at $x = 0, 1, 2, 3$ are $1, 2, 5, 10$.'),
              trapezia,
              maths('\\frac{1}{2}\\big[1 + 10 + 2(2 + 5)\\big] = 12.5'),
              prose('The exact value is $12$, so the estimate is close but not exact: it is an estimate, not the integral.'),
            ),
            ask('numer-trapezium-steps'),
            ask('numer-trapezium-tiles', 2),
            ask('numer-ordinates-tree', 2),
            teach(
              prose(
                'More strips give a better estimate, since shorter chords hug the curve more closely. Halving $h$ cuts the error to about a quarter.',
              ),
            ),
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
            ask('numer-over-under-flow'),
            ask('numer-abs-error', 2),
            ask('numer-abs-size-steps', 2),
            teach(
              prose(
                'A value correctly rounded to 2 decimal places is never out by more than $0.005$, half a unit in the last place; level 2, A Root to a Set Accuracy, turned that into bounds. An estimate out by more than that is not the correctly rounded value, however many places it shows.',
              ),
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
              prose('Times $100$, it is the **percentage error**.'),
            ),
            ask('numer-rel-error'),
            ask('numer-rel-tiles'),
            ask('numer-rel-slider'),
            teach(
              prose('A length of exactly $40$ cm, measured as $41$ cm:'),
              working('\\text{error} &= 41 - 40 = 1', '\\text{relative} &= \\tfrac{1}{40} = 0.025', '\\text{percentage} &= 2.5\\%'),
              prose('Always divide by the exact value, never the estimate.'),
            ),
            ask('numer-rel-compare'),
            ask('numer-rel-error', 2),
            ask('numer-rel-tiles', 2),
            teach(
              prose(
                'Relative error is what makes different measurements comparable. $2$ g out on $1$ kg is $0.2\\%$; $0.3$ g out on $10$ g is $3\\%$. The second error is smaller, and the first measurement is better.',
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
                'A value rounded to 1 decimal place could be anywhere within $0.05$ of it (level 2, A Root to a Set Accuracy): $a = 3.4$ means $3.35 \\le a < 3.45$. Calculate with rounded values and the result is uncertain too.',
              ),
              prose('With $b = 2.7$ as well, the least sum takes both lower bounds and the greatest both upper bounds:'),
              working('3.35 + 2.65 &= 6.0', '3.45 + 2.75 &= 6.2'),
            ),
            ask('numer-bound-tree'),
            ask('numer-bound-value'),
            ask('numer-bound-ends'),
            teach(
              prose(
                'Taking away or dividing turns an input round. The least $a - b$ is the least $a$ minus the greatest $b$; the least $\\frac{a}{b}$ is the least $a$ over the greatest $b$.',
              ),
              prose('With the same $a$ and $b$, the least and greatest $a - b$:'),
              working('3.35 - 2.75 &= 0.6', '3.45 - 2.65 &= 0.8'),
            ),
            ask('numer-bound-accuracy-flow'),
            ask('numer-bound-tree', 2),
            ask('numer-bound-value', 2),
            teach(
              prose(
                'Bounds say how far a result can be trusted. If both bounds round to the same value at some accuracy, the result is known to that accuracy. $a + b$ above runs from $6.0$ to $6.2$: those differ at 1 decimal place but agree as $6$, so $a + b = 6$ to the nearest whole number.',
              ),
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
            ask('numer-carry-error'),
            ask('numer-carry-slider'),
            teach(
              prose("Near the root each step multiplies the error by about $g'(\\alpha)$ (level 1, When Iteration Fails):"),
              maths("x_{n+1} - \\alpha \\approx g'(\\alpha)(x_n - \\alpha)"),
              prose("Above, $g'(x) = \\frac{1}{2\\sqrt{x + 3}}$ and $g'(\\alpha) \\approx 0.22$, so a gap of $0.01$ becomes about $0.002$."),
            ),
            ask('numer-shrink-flow'),
            ask('numer-carry-tree', 2),
            ask('numer-carry-error', 2),
            teach(
              prose(
                "When $g$ is decreasing, $g'(\\alpha) < 0$: the error changes sign each step, and the upper bound of $x_n$ gives the lower bound of $x_{n+1}$. Its size still shrinks while $|g'(\\alpha)| < 1$.",
              ),
            ),
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
              prose('To be sure of an accuracy $\\varepsilon$, find the first $k$ with $r^{k}\\delta < \\varepsilon$.'),
            ),
            ask('numer-k-count'),
            ask('numer-k-tiles'),
            ask('numer-k-logs-steps'),
            teach(
              prose('With $r = 0.4$, $\\delta = 0.5$ and $\\varepsilon = 0.001$:'),
              working('0.4^{k} \\times 0.5 &< 0.001', '0.4^{k} &< 0.002', 'k &> \\frac{\\ln 0.002}{\\ln 0.4} = 6.78'),
              prose('$\\ln 0.4$ is negative, so dividing by it turns the inequality round. So $k = 7$.'),
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
                "The trapezium rule joins the heights with straight lines (level 2, The Trapezium Rule). **Simpson's rule** takes the strips two at a time and runs a parabola through each three heights, which follows a bending curve far more closely.",
              ),
              parabolaFigure,
              prose('For two strips of width $h$, with heights $y_0$, $y_1$, $y_2$:'),
              maths('A \\approx \\frac{h}{3}(y_0 + 4y_1 + y_2)'),
            ),
            ask('numer-parabola-tree'),
            ask('numer-simpson-tiles'),
            ask('numer-weights-choice'),
            teach(
              prose('$\\int_0^2 (3x^{2} + 1)\\,dx$ with $h = 1$ has heights $1$, $4$ and $13$:'),
              working('\\tfrac{1}{3}(1 + 4 \\times 4 + 13) &= \\tfrac{1}{3} \\times 30', '&= 10'),
              prose('Integrating gives $\\big[x^{3} + x\\big]_0^2 = 10$ too: the parabola through three points of a parabola is the curve itself.'),
            ),
            ask('numer-simpson-steps'),
            ask('numer-parabola-tree', 2),
            ask('numer-simpson-tiles', 2),
            teach(
              prose(
                'The weights $1, 4, 1$ add up to $6$, and $\\frac{h}{3} \\times 6 = 2h$, the width of the pair. So on a flat line every height is the same and the rule gives width times height, as it should. The middle height counts most because it sits in the middle of the parabola.',
              ),
            ),
            ask('numer-weights-choice', 2),
            ask('numer-simpson-steps', 2),
          ],
          skillCheck: [ask('numer-parabola-tree', 2), ask('numer-simpson-steps', 2), ask('numer-weights-choice', 2)],
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
              prose('Four strips weight the heights $1, 4, 2, 4, 1$.'),
            ),
            ask('numer-strips-tree'),
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
              prose('Heights $3, 5, 9, 15, 23$ at $x = 0, 3, 6, 9, 12$, so $h = 3$:'),
              working('3 + 23 &= 26', '4(5 + 15) &= 80', '2 \\times 9 &= 18', '\\tfrac{3}{3}(26 + 80 + 18) &= 124'),
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
                'The same heights give two estimates. The trapezium rule joins them with straight chords, which cut across a bend (level 2, Over or Under); the parabolas follow it.',
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
              prose(
                'And which way the estimate moved tells you the bend: if $T_2 < T_1$, the chords were sitting above the curve, so it bends upward.',
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
            ask('numer-euler-step-tree'),
            ask('numer-euler-formula-tiles'),
            ask('numer-euler-point-choice'),
            teach(
              prose('$\\frac{dy}{dx} = x + y$ with $y = 1$ when $x = 0$, and $h = 0.5$:'),
              working('f(0, 1) &= 0 + 1 = 1', 'y_1 &= 1 + 0.5 \\times 1 = 1.5'),
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
            ask('numer-euler-formula-tiles', 2),
            ask('numer-euler-point-choice', 2),
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
            ask('numer-euler-count-flow'),
            teach(
              prose('$\\frac{dy}{dx} = 2x + 1$ with $y = 1$ when $x = 0$, and $h = 0.5$:'),
              maths(
                '\\begin{array}{c|c|c|c} n & x_n & y_n & f(x_n) \\\\ \\hline 0 & 0 & 1 & 1 \\\\ 1 & 0.5 & 1.5 & 2 \\\\ 2 & 1 & 2.5 & 3 \\\\ 3 & 1.5 & 4 & \\end{array}',
              ),
              eulerSteps,
              prose('Each step is a straight line with the gradient at its own start, so the path is a chain of tangents.'),
            ),
            ask('numer-euler-reach-value'),
            ask('numer-euler-table', 2),
            ask('numer-euler-chain-steps', 2),
            teach(
              prose(
                'To estimate $y$ at a given $x$, count the steps first: from $x_0$ to $X$ in steps of $h$ is $\\frac{X - x_0}{h}$ of them, and the answer is the last $y$. From $0$ to $1.5$ with $h = 0.5$ is three steps, so $y(1.5) \\approx y_3 = 4$.',
              ),
            ),
            ask('numer-euler-count-flow', 2),
            ask('numer-euler-reach-value', 2),
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
                'When $\\frac{dy}{dx}$ is in $x$ alone, the equation can be solved exactly by integrating and fixing the constant from the starting point (Differential Equations level 1, A Particular Solution). Then the estimate can be checked.',
              ),
              prose('$\\frac{dy}{dx} = 2x + 1$ with $y = 1$ at $x = 0$ gives $y = x^{2} + x + 1$. At $x = 1.5$:'),
              working('y(1.5) &= 2.25 + 1.5 + 1', '&= 4.75', '\\text{error} &= 4 - 4.75', '&= -0.75'),
              prose('As in level 3, the error is the estimate minus the true value, so a negative error means the estimate is too low.'),
            ),
            ask('numer-euler-exact-steps'),
            ask('numer-euler-error-tree'),
            ask('numer-euler-miss-flow'),
            teach(
              prose(
                'Which way Euler misses comes from the bend. If the gradient rises as $x$ grows, the curve bends upward, each tangent runs below it, and every step lands low: an **underestimate**. If the gradient falls, the curve bends down and Euler overshoots.',
              ),
              eulerSteps,
              prose('$2x + 1$ rises, so the steps fall further below $y = x^{2} + x + 1$ at every step.'),
            ),
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
            ask('numer-euler-halve-choice'),
            ask('numer-euler-size-slider'),
            teach(
              prose(
                'For a straight-line gradient like $2x + 1$ the halving is exact. For anything else it is roughly so, and closer the smaller $h$ already is. The estimate stays on the same side of the true value, since the curve still bends the same way.',
              ),
            ),
            ask('numer-euler-size-flow'),
            ask('numer-euler-needed-value'),
            ask('numer-euler-halve-table', 2),
            teach(
              prose(
                'So a target error sets the step. An error of $0.75$ wanted down to $0.05$ must shrink $15$ times, so $h$ must too: $\\frac{0.5}{15}$, which is $3 \\times 15 = 45$ steps instead of $3$.',
              ),
              prose('Every extra decimal place costs about ten times the steps. That is why better methods than Euler exist.'),
            ),
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
  ],
};
