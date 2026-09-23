/**
 * Numerical Methods.
 *
 * Level 1 locates roots that cannot be found exactly: the change of sign and
 * the three ways it misleads, rearranging f(x) = 0 into x = g(x) and
 * iterating, the staircase and cobweb pictures of that iteration, and the
 * gradient test that says when it diverges. Level 2 is Newton-Raphson (the
 * tangent step, a root to a stated accuracy, and where it goes wrong) and the
 * trapezium rule, with whether it overestimates or underestimates.
 *
 * The tangent's equation belongs to Differentiation (`df-l1-tangent`) and
 * rectangle sums to Integration (`in-l8`); both are pointed at, not taught
 * again. Later levels are in `docs/roadmap/levels/numerical-methods.md`.
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
  ],
};
