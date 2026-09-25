/**
 * Series Expansions.
 *
 * A function written as a polynomial that never stops. Level 1 is Maclaurin
 * series: each coefficient is a derivative at 0 over a factorial, then the
 * standard series for e^x, sin x, cos x, ln(1 + x) and 1/(1 - x), where each
 * is valid, and new series made from them by substituting and multiplying.
 * Level 2 moves the centre: Taylor series about x = a, estimating a value and
 * the error from the first term left out, limits of the form 0/0, integrating
 * term by term, and finding the values of x a series is valid for.
 * Level 3 is error terms: the Lagrange form of the remainder, bounding it,
 * how that bound compares with the first term left out, choosing a degree
 * for a tolerance (and how far x may go for a given degree), and remainders
 * about a centre other than 0.
 * Level 4 is the radius of convergence: the ratio test on a power series,
 * reading the radius off the coefficients, checking each end on its own for
 * the interval of convergence, series in x^m and in (x - a), and the radius
 * as the distance to the nearest singularity, complex ones included.
 *
 * Differentiation, the sum to infinity and the binomial expansion are used
 * here, not taught again: the derivatives of e^x and ln x belong to
 * Differentiation's "Exponentials and Logarithms", those of sin and cos to its
 * "Trigonometric Functions", 1/(1 - x) is the sum to infinity from Sequences
 * and Series, and (1 + x)^n for a whole n is the Binomial Expansion's first
 * lesson. The binomial series for other n is only quoted. Each level closes
 * with a level check: questions only, no teaching slides, one attempt each.
 */
import type { Block, Course, SlideRef } from '../types';
import { plotSvg } from '../figures';

const teach = (...blocks: Block[]): SlideRef => ({
  type: 'literal',
  slide: { kind: 'teach', body: blocks },
});

const ask = (generatorId: string, difficulty = 1): SlideRef => ({
  type: 'generated',
  generatorId,
  difficulty,
});

/** A question with a worked example or a setup line shown above it, on the same slide. */
const asking = (generatorId: string, difficulty: number, ...leadIn: Block[]): SlideRef => ({
  type: 'generated',
  generatorId,
  difficulty,
  leadIn,
});

const prose = (text: string): Block => ({ kind: 'prose', text });
const display = (tex: string): Block => ({ kind: 'display', tex });

/** Lines of working stacked in one display and aligned on their `&`. */
const working = (...lines: string[]): Block => display(`\\begin{aligned} ${lines.join(' \\\\ ')} \\end{aligned}`);

const figure = (options: Parameters<typeof plotSvg>[0]): Block => ({ kind: 'diagram', svg: plotSvg(options) });

export const seriesExpansions: Course = {
  id: 'series-expansions',
  category: 'advanced-maths',
  // After Parametric and Implicit (25), Integration (30), Vectors (40) and Matrices (50); before Differential Equations (70).
  position: 60,
  title: 'Series Expansions',
  blurb: 'Functions as never-ending polynomials: Maclaurin and Taylor series, the standard series, estimates and their errors, limits, where a series is valid, and bounding the error.',
  levels: [
    {
      id: 'se-l1',
      title: 'Maclaurin Series',
      lessons: [
        {
          id: 'se-l1-coefficients',
          title: 'Coefficients from Derivatives',
          slides: [
            teach(
              prose(
                'A **Maclaurin series** writes a function as a polynomial that goes on for ever: $f(x) = a_{0} + a_{1}x + a_{2}x^{2} + a_{3}x^{3} + \\cdots$',
              ),
              prose(
                'Put $x = 0$ in and every term but the first vanishes, so $a_{0} = f(0)$. Differentiate once and put $x = 0$ in again: $a_{1} = f\'(0)$. Twice gives $2a_{2} = f\'\'(0)$, three times $3!\\,a_{3} = f\'\'\'(0)$.',
              ),
              display('a_{n} = \\frac{f^{(n)}(0)}{n!}'),
              prose(
                "For $f(x) = e^{2x}$, each derivative brings out another $2$: $f'(x) = 2e^{2x}$, $f''(x) = 4e^{2x}$, $f'''(x) = 8e^{2x}$. At $0$ they are $2, 4, 8$. Divide each by its factorial, keeping exact fractions:",
              ),
              working('a_{2} &= \\frac{4}{2!} = 2', 'a_{3} &= \\frac{8}{3!} = \\frac{4}{3}'),
              working('e^{2x} &= 1 + 2x + 2x^{2}', '&\\quad + \\frac{4}{3}x^{3} + \\cdots'),
            ),
            ask('ser-first-terms-tiles'),
            ask('ser-coef-typed'),
            teach(
              prose("A power of a bracket works the same way, by the chain rule. For $f(x) = (1 - 2x)^{-1}$:"),
              working(
                "f'(x) &= 2(1 - 2x)^{-2}",
                "f''(x) &= 8(1 - 2x)^{-3}",
                "f'''(x) &= 48(1 - 2x)^{-4}",
              ),
              prose('At $0$ the bracket is $1$, so the derivatives are $2, 8, 48$ and the coefficients $\\frac{2}{1!} = 2$, $\\frac{8}{2!} = 4$, $\\frac{48}{3!} = 8$:'),
              working('& (1 - 2x)^{-1}', '&= 1 + 2x + 4x^{2} + 8x^{3} + \\cdots'),
              prose("For $(1 + 2x)^{3}$ each derivative brings the power down and a $2$ out: $f'(0) = 6$, $f''(0) = 24$, $f'''(0) = 48$."),
            ),
            ask('ser-coef-tree'),
            ask('ser-first-terms-tiles', 2),
            ask('ser-coef-tree', 2),
            teach(
              prose(
                'This needs $f(0)$ and **every** derivative at $0$ to exist. $\\ln x$ and $\\frac{1}{x}$ are not defined at $0$, and $\\sqrt{x}$ is, but its gradient there is infinite: none of them has a Maclaurin series.',
              ),
              prose(
                '$|x|$ has a corner at $0$, so no gradient there either. So $3\\sqrt{x} + 1$ has no series. $e^{2x} + 1$ has one, and its constant term is $f(0) = e^{0} + 1 = 2$.',
              ),
              prose(
                'A derivative that comes to $0$ just means that power of $x$ is missing. "The first three terms" means the first three that are not zero.',
              ),
            ),
            ask('ser-which-flow'),
            ask('ser-coef-typed+choice', 2),
            ask('ser-which-flow', 2),
          ],
          skillCheck: [ask('ser-coef-typed', 2), ask('ser-first-terms-tiles', 2), ask('ser-coef-tree', 2)],
        },
        {
          id: 'se-l1-exp',
          title: 'The Exponential Series',
          slides: [
            teach(
              prose(
                'Every derivative of $e^{x}$ is $e^{x}$, which is $1$ at $x = 0$ (Differentiation, "Exponentials and Logarithms"). So every coefficient is $\\frac{1}{n!}$:',
              ),
              working('e^{x} &= 1 + x + \\frac{x^{2}}{2!}', '&\\quad + \\frac{x^{3}}{3!} + \\frac{x^{4}}{4!} + \\cdots'),
              prose('It holds for every value of $x$.'),
            ),
            asking(
              'ser-exp-tiles',
              1,
              prose('For $e^{kx}$, put $u = kx$ into the series for $e^{u}$. The whole of $kx$ is raised to the power, not just the $x$:'),
              working(
                'e^{3x} &= 1 + 3x + \\frac{(3x)^{2}}{2!}',
                '&\\quad + \\frac{(3x)^{3}}{3!} + \\cdots',
                '&= 1 + 3x + \\frac{9}{2}x^{2}',
                '&\\quad + \\frac{9}{2}x^{3} + \\cdots',
              ),
              prose('A number in front multiplies every term: $2e^{3x} = 2 + 6x + 9x^{2} + \\cdots$'),
            ),
            ask('ser-exp-steps'),
            ask('ser-exp-term'),
            teach(
              prose('A fraction or a minus in $k$ is raised to the power too. For $e^{-\\frac{x}{2}}$, $u = -\\frac{x}{2}$:'),
              working(
                '\\frac{u^{2}}{2!} &= \\frac{1}{2} \\times \\frac{x^{2}}{4} = \\frac{1}{8}x^{2}',
                '\\frac{u^{3}}{3!} &= \\frac{1}{6} \\times \\left(-\\frac{x^{3}}{8}\\right) = -\\frac{1}{48}x^{3}',
              ),
              prose('An odd power keeps the minus; an even power loses it.'),
            ),
            ask('ser-exp-tiles', 2),
            ask('ser-exp-steps', 2),
            ask('ser-exp-term+choice', 2),
            teach(
              prose(
                'Stop the series after a few terms and you have a polynomial that hugs the curve near $0$ and drifts away from it further out. More terms, and it hugs for longer.',
              ),
              figure({
                xMin: -2,
                xMax: 2,
                yMin: -1,
                yMax: 6,
                curves: [
                  { f: (x: number) => Math.exp(x), dashed: true },
                  { f: (x: number) => 1 + x },
                  { f: (x: number) => 1 + x + (x * x) / 2 },
                ],
                label: 'The dashed curve y = e to the x, with the line 1 + x and the parabola 1 + x + x squared over 2 both touching it at 0',
              }),
            ),
            ask('ser-exp-slider'),
            ask('ser-exp-slider', 2),
          ],
          skillCheck: [ask('ser-exp-tiles', 2), ask('ser-exp-term', 2), ask('ser-exp-steps', 2)],
        },
        {
          id: 'se-l1-trig',
          title: 'Sine and Cosine',
          slides: [
            teach(
              prose(
                'The derivatives of $\\sin x$ go round in a cycle of four: $\\sin x$, $\\cos x$, $-\\sin x$, $-\\cos x$, then back to $\\sin x$ (Differentiation, "Trigonometric Functions"). At $x = 0$ that is $0, 1, 0, -1, 0, 1, \\ldots$',
              ),
              prose('So only the odd powers survive, and their signs alternate. As always with calculus, $x$ is in radians.'),
              display('\\sin x = x - \\frac{x^{3}}{3!} + \\frac{x^{5}}{5!} - \\cdots'),
              prose('Cosine starts one step on in the same cycle, at $1$, so it keeps the even powers. Both hold for every $x$.'),
              display('\\cos x = 1 - \\frac{x^{2}}{2!} + \\frac{x^{4}}{4!} - \\cdots'),
            ),
            asking(
              'ser-trig-cycle-tree',
              1,
              prose(
                "Differentiating twice turns $\\sin 2x$ into $-4\\sin 2x$, and $\\cos 2x$ into $-4\\cos 2x$. For $f(x) = \\sin 2x + 3\\cos 2x$: $f(0) = 0 + 3 = 3$, and $f'(x) = 2\\cos 2x - 6\\sin 2x$ gives $f'(0) = 2$. Then each is $-4$ times the one two before:",
              ),
              working("f''(0) &= -4 \\times 3 = -12", "f'''(0) &= -4 \\times 2 = -8", 'f^{(4)}(0) &= -4 \\times (-12) = 48'),
            ),
            teach(
              prose('For $\\sin 3x$ put $u = 3x$ into the series for $\\sin u$. The $3$ is raised to each power along with the $x$:'),
              working(
                '\\sin 3x &= 3x - \\frac{(3x)^{3}}{3!}',
                '&\\quad + \\frac{(3x)^{5}}{5!} - \\cdots',
                '&= 3x - \\frac{9}{2}x^{3}',
                '&\\quad + \\frac{81}{40}x^{5} - \\cdots',
              ),
              prose('A fraction works the same way: in $\\cos\\frac{x}{3}$, $\\frac{u^{2}}{2!}$ becomes $\\frac{x^{2}}{9} \\div 2 = \\frac{1}{18}x^{2}$. A number in front multiplies every term.'),
            ),
            ask('ser-trig-tiles'),
            ask('ser-trig-pick'),
            ask('ser-trig-cycle-tree', 2),
            teach(
              prose(
                'The sign of a term needs no working out: count which non-zero term it is. The first is $+$, the second $-$, the third $+$, and so on.',
              ),
              prose(
                'Then allow for the function itself. $\\sin(-x) = -\\sin x$ flips every sign, and a minus in front does too; $\\cos(-x) = \\cos x$ changes nothing, since every power in it is even.',
              ),
              prose(
                'For the $x^{5}$ term of $\\sin(-2x)$: $x^{5}$ is the third term of $\\sin$, so $+$; $\\sin(-2x) = -\\sin 2x$ flips it, so it is negative. There is no $x^{4}$ term at all: $\\sin$ has only odd powers.',
              ),
            ),
            ask('ser-trig-sign-flow'),
            ask('ser-trig-tiles', 2),
            ask('ser-trig-pick', 2),
            ask('ser-trig-sign-flow', 2),
          ],
          skillCheck: [ask('ser-trig-tiles', 2), ask('ser-trig-sign-flow', 2), ask('ser-trig-pick', 2)],
        },
        {
          id: 'se-l1-log',
          title: 'Logarithms and 1/(1 − x)',
          slides: [
            teach(
              prose(
                '$\\ln x$ has no Maclaurin series, so shift it: $\\ln(1 + x)$ is $0$ at $x = 0$, and its derivatives there are $1, -1, 2, -6, \\ldots$ Over $n!$ they leave',
              ),
              working('\\ln(1 + x) &= x - \\frac{x^{2}}{2} + \\frac{x^{3}}{3}', '&\\quad - \\frac{x^{4}}{4} + \\cdots'),
              prose('No factorials this time: the denominators are just $1, 2, 3, 4$. For $\\ln(1 + 2x)$ put $u = 2x$ in, so $\\frac{u^{2}}{2}$ becomes $2x^{2}$.'),
            ),
            ask('ser-log-tiles'),
            ask('ser-log-coef'),
            teach(
              prose('The series needs $\\ln(1 + \\ldots)$. When the bracket starts with another number, take it out first, since the log of a product is a sum of logs:'),
              working(
                '\\ln(4 + 2x) &= \\ln\\big(4(1 + \\tfrac{x}{2})\\big)',
                '&= \\ln 4 + \\ln(1 + \\tfrac{x}{2})',
                '&= \\ln 4 + \\frac{x}{2} - \\frac{x^{2}}{8} + \\cdots',
              ),
              prose('The last line is $u - \\frac{u^{2}}{2}$ with $u = \\frac{x}{2}$: $\\frac{1}{2} \\times \\frac{x^{2}}{4} = \\frac{x^{2}}{8}$.'),
            ),
            ask('ser-log-tiles', 2),
            asking(
              'ser-log-coef+choice',
              2,
              prose('A product splits into a sum of logs, a quotient into a difference. Then each log has its own series. For the $x^{2}$ coefficient of $\\ln\\frac{1 + 2x}{1 - x}$:'),
              display('\\ln\\frac{1 + 2x}{1 - x} = \\ln(1 + 2x) - \\ln(1 - x)'),
              prose(
                'Their $x^{2}$ coefficients are $-\\frac{2^{2}}{2} = -2$ and $-\\frac{(-1)^{2}}{2} = -\\frac{1}{2}$, so the answer is $-2 - \\left(-\\frac{1}{2}\\right) = -\\frac{3}{2}$.',
              ),
            ),
            teach(
              prose(
                'The other one to know is the sum to infinity of a geometric series (Sequences and Series, "The Sum to Infinity"), read backwards:',
              ),
              display('\\frac{1}{1 - x} = 1 + x + x^{2} + \\cdots'),
              prose(
                'These two are **not** valid for every $x$. The geometric series only converges for $-1 < x < 1$; the one for $\\ln(1 + x)$ for $-1 < x \\le 1$.',
              ),
              prose(
                'With $u$ in place of $x$, the range is on $u$. $\\frac{1}{1 - 3x}$ is $\\frac{1}{1 - u}$ with $u = 3x$. At $x = \\frac{1}{2}$, $u = \\frac{3}{2}$: outside $-1 < u < 1$, so the series cannot be used there.',
              ),
            ),
            asking(
              'ser-log-range',
              1,
              prose('$\\ln(1 - 3x)$ is $\\ln(1 + u)$ with $u = -3x$, so it needs $-1 < -3x \\le 1$. Divide by $-3$, which turns both inequalities round:'),
              display('-\\frac{1}{3} \\le x < \\frac{1}{3}'),
              prose('The included end moved to the other side.'),
            ),
            ask('ser-log-valid-flow'),
            ask('ser-log-range', 2),
            ask('ser-log-valid-flow', 2),
          ],
          skillCheck: [ask('ser-log-tiles', 2), ask('ser-log-coef', 2), ask('ser-log-valid-flow', 2)],
        },
        {
          id: 'se-l1-combining',
          title: 'Combining Series',
          slides: [
            teach(
              prose(
                'New series come from the standard ones without differentiating again. **Substitute**: for $\\frac{1}{1 - x^{2}}$, put $u = x^{2}$ into the series for $\\frac{1}{1 - u}$.',
              ),
              working('\\frac{1}{1 - u} &= 1 + u + u^{2} + \\cdots', '\\frac{1}{1 - x^{2}} &= 1 + x^{2} + x^{4} + \\cdots'),
              prose('Every power doubles, so a series in $x^{2}$ has only even powers.'),
            ),
            ask('ser-sub-tiles'),
            ask('ser-sub-tree'),
            teach(
              prose('The binomial series is one more to quote, for any $n$ when $-1 < x < 1$:'),
              working('(1 + x)^{n} &= 1 + nx', '& {} + \\frac{n(n - 1)}{2!}x^{2} + \\cdots'),
              prose(
                'For a whole $n$ it stops, and it is the expansion from the Binomial Expansion course. With $n = 5$ the coefficients are $5$ and $\\frac{5 \\times 4}{2} = 10$. With $n = -1$ they are $-1$ and $\\frac{(-1)(-2)}{2} = 1$:',
              ),
              working('(1 + u)^{5} &= 1 + 5u + 10u^{2} + \\cdots', '\\frac{1}{1 + x} &= 1 - x + x^{2} - \\cdots'),
            ),
            ask('ser-sub-tiles', 2),
            ask('ser-sub-tree', 2),
            teach(
              prose('**Multiply** two series like two long brackets, keeping only the pairs of terms whose powers add up to the one you want. For the $x^{2}$ term of $e^{x}\\cos x$:'),
              working('e^{x} &= 1 + x + \\frac{1}{2}x^{2} + \\cdots', '\\cos x &= 1 - \\frac{1}{2}x^{2} + \\cdots'),
              prose('The pairs are $1$ with $-\\frac{1}{2}x^{2}$, $x$ with the $x$ term of $\\cos x$ (there is none, so $0$), and $\\frac{1}{2}x^{2}$ with $1$:'),
              display('1 \\cdot (-\\tfrac{1}{2}) + 1 \\cdot 0 + \\tfrac{1}{2} \\cdot 1 = 0'),
              prose('A quotient is a product in disguise: $\\frac{\\sin x}{1 - x}$ is $\\sin x$ times $1 + x + x^{2} + \\cdots$'),
            ),
            ask('ser-multiply-steps'),
            asking(
              'ser-product-coef',
              1,
              prose('A bracket to a whole power is the binomial with $u$ in place of $x$. For $(1 + 2x)^{3}$, $u = 2x$:'),
              working('& (1 + 2x)^{3}', '&= 1 + 3(2x) + 3(2x)^{2} + (2x)^{3}', '&= 1 + 6x + 12x^{2} + 8x^{3}'),
            ),
            ask('ser-multiply-steps', 2),
            ask('ser-product-coef+choice', 2),
          ],
          skillCheck: [ask('ser-sub-tiles', 2), ask('ser-multiply-steps', 2), ask('ser-product-coef', 2)],
        },
      ],
      levelCheck: [
        ask('ser-coef-tree', 2),
        ask('ser-exp-tiles', 2),
        ask('ser-trig-sign-flow', 2),
        ask('ser-log-coef', 2),
        ask('ser-sub-tree', 2),
        ask('ser-first-terms-tiles', 2),
        ask('ser-exp-slider', 2),
        ask('ser-trig-pick', 2),
        ask('ser-log-valid-flow', 2),
        ask('ser-multiply-steps', 2),
        ask('ser-exp-term', 2),
        ask('ser-trig-tiles', 2),
        ask('ser-which-flow', 2),
        ask('ser-product-coef', 2),
      ],
    },

    {
      id: 'se-l2',
      title: 'Taylor Series and Approximations',
      lessons: [
        {
          id: 'se-l2-taylor',
          title: 'Taylor Series about a Point',
          slides: [
            teach(
              prose(
                'A **Taylor series** is a Maclaurin series moved to another point $x = a$. It is written in powers of $x - a$, and the coefficients are the derivatives at $a$:',
              ),
              working("f(x) &= f(a) + f'(a)(x - a)", "& {} + \\frac{f''(a)}{2!}(x - a)^{2} + \\cdots"),
              prose('A Maclaurin series is the Taylor series with $a = 0$.'),
            ),
            asking(
              'ser-taylor-tree',
              1,
              prose(
                "$\\ln x$ has no series about $0$, but about $x = 1$ it does. $f'(x) = \\frac{1}{x}$, $f''(x) = -\\frac{1}{x^{2}}$, $f'''(x) = \\frac{2}{x^{3}}$, so at $1$ they are $1, -1, 2$. Over $1!, 2!, 3!$:",
              ),
              working('\\ln x &= (x - 1) - \\frac{1}{2}(x - 1)^{2}', '&\\quad + \\frac{1}{3}(x - 1)^{3} - \\cdots'),
            ),
            ask('ser-taylor-coef'),
            ask('ser-taylor-tiles'),
            teach(
              prose(
                'Pick $a$ where the function is easy to work out exactly and close to where you want it: $\\sqrt{x}$ about $4$ or $9$, $\\sin x$ about $\\pi$.',
              ),
              prose(
                "For $\\sqrt{4.2}$, expand $\\sqrt{x}$ about $4$: $f(4) = 2$ and $f'(x) = \\frac{1}{2\\sqrt{x}}$ gives $f'(4) = \\frac{1}{4}$. So $\\sqrt{4.2} \\approx 2 + \\frac{1}{4} \\times 0.2 = 2.05$.",
              ),
            ),
            ask('ser-taylor-centre'),
            ask('ser-taylor-tree', 2),
            ask('ser-taylor-tiles', 2),
            teach(
              prose('Keep $(x - a)$ as one bracket rather than multiplying it out. About $x = -3$ the bracket is $x + 3$:'),
              working('e^{x + 3} &= 1 + (x + 3)', '&\\quad + \\frac{1}{2}(x + 3)^{2} + \\cdots'),
              prose('That is the series for $e^{u}$ with $u = x + 3$.'),
            ),
            ask('ser-taylor-coef+choice', 2),
            ask('ser-taylor-centre', 2),
          ],
          skillCheck: [ask('ser-taylor-tiles', 2), ask('ser-taylor-coef', 2), ask('ser-taylor-tree', 2)],
        },
        {
          id: 'se-l2-estimate',
          title: 'Estimating with a Series',
          slides: [
            teach(
              prose('Put a small $x$ into the first few terms and you have an estimate. With $x = \\frac{1}{2}$ in the series for $\\ln(1 + x)$:'),
              display('\\ln \\tfrac{3}{2} \\approx \\frac{1}{2} - \\frac{1}{8} + \\frac{1}{24} = \\frac{5}{12}'),
              prose(
                'The first term **left out**, here $-\\frac{1}{64}$, estimates the error. When the signs alternate and the terms shrink, the error is smaller than it.',
              ),
            ),
            ask('ser-estimate-tree'),
            ask('ser-dropped-term'),
            ask('ser-estimate-tree', 2),
            teach(
              prose('The smaller $x$, the faster the terms shrink, and the fewer you need. Keep adding terms until the next one is smaller than the accuracy you want.'),
              prose(
                'Turned round, a bound on the first term left out says how far from $0$ the estimate stays good. For $\\frac{x^{3}}{3!} \\le 0.001$, set the term equal to the bound, multiply by $3! = 6$, then take the cube root:',
              ),
              working('\\frac{x^{3}}{6} &= 0.001', 'x^{3} &= 0.006', 'x &= \\sqrt[3]{0.006} \\approx 0.18'),
              prose('The term grows with $x$, so it stays under the bound for every $x$ up to there.'),
            ),
            ask('ser-estimate-pick'),
            ask('ser-estimate-slider'),
            ask('ser-dropped-term+choice', 2),
            teach(
              prose(
                'For $e^{x}$, where every term is positive, the first term left out is only a guide: the terms after it add a little more, so the true error is a bit larger.',
              ),
              prose('Either way, the estimate is only as good as $x$ is small.'),
            ),
            ask('ser-estimate-pick', 2),
            ask('ser-estimate-slider', 2),
          ],
          skillCheck: [ask('ser-estimate-tree', 2), ask('ser-dropped-term', 2), ask('ser-estimate-pick', 2)],
        },
        {
          id: 'se-l2-limits',
          title: 'Limits with Series',
          slides: [
            teach(
              prose(
                'Put $x = 0$ into $\\frac{\\sin x}{x}$ and you get $\\frac{0}{0}$, which says nothing. Write the top as a series instead:',
              ),
              working('\\frac{\\sin x}{x} &= \\frac{x - \\frac{1}{6}x^{3} + \\cdots}{x}', '&= 1 - \\frac{1}{6}x^{2} + \\cdots'),
              prose('As $x \\to 0$ everything after the $1$ vanishes, so the limit is $1$.'),
            ),
            asking(
              'ser-limit',
              1,
              prose('Terms taken off the top cancel the start of its series. For $\\frac{e^{2x} - 1}{x}$, put $u = 2x$ into $e^{u}$:'),
              working('e^{2x} - 1 &= 2x + 2x^{2} + \\cdots', '\\frac{e^{2x} - 1}{x} &= 2 + 2x + \\cdots \\to 2'),
            ),
            teach(
              prose('What matters is the first power the top starts with. Expand $\\cos 2x$ with $u = 2x$:'),
              display('1 - \\cos 2x = 2x^{2} - \\tfrac{2}{3}x^{4} + \\cdots'),
              prose(
                'Near $0$ it is roughly $2x^{2}$. Over $3x^{2}$ the powers match, so the limit is the ratio of the coefficients, $\\frac{2}{3}$. Over $x$ an $x$ is left on top, and the limit is $0$. Over $x^{3}$ an $x$ is left underneath, which grows without bound: there is no limit.',
              ),
            ),
            ask('ser-leading-term'),
            asking(
              'ser-limit-flow',
              1,
              prose('First check it is $\\frac{0}{0}$ at all. $\\frac{\\sin x}{x + 2}$ is $\\frac{0}{2}$ at $x = 0$: no series is needed, and the limit is $0$.'),
            ),
            teach(
              prose('When the top is several functions, expand each one. The low powers cancel, and the first power left decides the limit:'),
              working('e^{x} &= 1 + x + \\tfrac{1}{2}x^{2} + \\cdots', '\\cos x &= 1 - \\tfrac{1}{2}x^{2} + \\cdots', 'e^{x} - \\cos x - x &= x^{2} + \\cdots'),
              prose(
                'The $1$s cancel, the $x$ is taken off, and the $x^{2}$ coefficient is $\\frac{1}{2} - \\left(-\\frac{1}{2}\\right) = 1$. So $\\frac{e^{x} - \\cos x - x}{x^{2}} \\to 1$.',
              ),
            ),
            ask('ser-limit-sum-steps'),
            ask('ser-leading-term', 2),
            ask('ser-limit-flow', 2),
            ask('ser-limit+choice', 2),
            ask('ser-limit-sum-steps', 2),
          ],
          skillCheck: [ask('ser-limit', 2), ask('ser-limit-sum-steps', 2), ask('ser-limit-flow', 2)],
        },
        {
          id: 'se-l2-integrate',
          title: 'Integrating a Series',
          slides: [
            teach(
              prose('A series can be integrated term by term, like any polynomial. Each $t^{n}$ becomes $\\frac{x^{n + 1}}{n + 1}$ from $0$ to $x$:'),
              display('\\cos t = 1 - \\frac{1}{2}t^{2} + \\frac{1}{24}t^{4} - \\cdots'),
              working('\\int_0^x \\cos t\\,dt &= x - \\frac{1}{6}x^{3}', '&\\quad + \\frac{1}{120}x^{5} - \\cdots'),
              prose('That is the series for $\\sin x$, as it should be.'),
            ),
            ask('ser-int-terms-tree'),
            ask('ser-int-tiles'),
            ask('ser-int-coef'),
            teach(
              prose(
                'This is how to integrate what has no antiderivative in the usual functions, such as $e^{-t^{2}}$. Put $u = -t^{2}$ into the series for $e^{u}$, integrate, then put a number in:',
              ),
              working('\\int_0^x e^{-t^{2}}\\,dt &= x - \\frac{1}{3}x^{3}', '&\\quad + \\frac{1}{10}x^{5} - \\cdots'),
            ),
            ask('ser-int-steps'),
            ask('ser-int-terms-tree', 2),
            ask('ser-int-tiles', 2),
            teach(
              prose('Every power goes up by one, so the constant term becomes an $x$ term and a series in even powers integrates to one in odd powers.'),
              prose('With the limits $0$ and $x$ there is no $+ C$: at $x = 0$ every term is $0$.'),
            ),
            ask('ser-int-coef+choice', 2),
            ask('ser-int-steps', 2),
          ],
          skillCheck: [ask('ser-int-tiles', 2), ask('ser-int-steps', 2), ask('ser-int-coef', 2)],
        },
        {
          id: 'se-l2-validity',
          title: 'Where a Series is Valid',
          slides: [
            teach(
              prose(
                'A series is valid where its sums settle to a limit, as a sequence can (Sequences and Series, "The Limit of a Recurrence"). $e^{x}$, $\\sin x$ and $\\cos x$ settle for every $x$. The others need their $u$ in range:',
              ),
              display('\\frac{1}{1 - u}: \\; -1 < u < 1'),
              display('\\ln(1 + u): \\; -1 < u \\le 1'),
              prose('$\\frac{1}{1 + 2x}$ is $\\frac{1}{1 - u}$ with $u = -2x$. So $-1 < -2x < 1$, and dividing by $-2$ turns both round: $-\\frac{1}{2} < x < \\frac{1}{2}$.'),
            ),
            asking(
              'ser-valid-tiles',
              1,
              prose('A Taylor series about $x = a$ is in $h = x - a$. For $\\frac{1}{x - 1}$ about $x = 2$, put $x = 2 + h$:'),
              display('\\frac{1}{x - 1} = \\frac{1}{1 + h}, \\quad -1 < h < 1'),
              prose('Add the $2$ back on: $1 < x < 3$. For a logarithm the far end is included, just as $u = 1$ is.'),
            ),
            ask('ser-valid-line'),
            teach(
              prose('For $\\ln(4 - 3x)$, take the $4$ out first so the standard series fits:'),
              working('\\ln(4 - 3x) &= \\ln 4 + \\ln(1 + u)', 'u &= -\\tfrac{3}{4}x'),
              prose('So it needs $-1 < u \\le 1$, that is $-1 < -\\frac{3}{4}x \\le 1$, which is'),
              display('-\\tfrac{4}{3} \\le x < \\tfrac{4}{3}'),
            ),
            ask('ser-range-flow'),
            ask('ser-valid-pick'),
            ask('ser-valid-tiles', 2),
            ask('ser-range-flow', 2),
            teach(
              prose(
                'A Taylor series about $x = a$ is valid out to the nearest point where the function breaks. $\\ln(x + 3)$ breaks at $x = -3$, so about $x = -2$ it reaches $1$ each way:',
              ),
              display('-3 < x \\le -1'),
              prose('The far end is included for a logarithm, just as $u = 1$ is.'),
            ),
            ask('ser-valid-line', 2),
            ask('ser-valid-pick', 2),
          ],
          skillCheck: [ask('ser-valid-line', 2), ask('ser-range-flow', 2), ask('ser-valid-pick', 2)],
        },
      ],
      levelCheck: [
        ask('ser-taylor-tree', 2),
        ask('ser-estimate-tree', 2),
        ask('ser-limit-flow', 2),
        ask('ser-int-coef', 2),
        ask('ser-valid-line', 2),
        ask('ser-taylor-tiles', 2),
        ask('ser-dropped-term', 2),
        ask('ser-leading-term', 2),
        ask('ser-int-steps', 2),
        ask('ser-range-flow', 2),
        ask('ser-taylor-coef', 2),
        ask('ser-estimate-pick', 2),
        ask('ser-limit', 2),
        ask('ser-valid-tiles', 2),
      ],
    },
    {
      id: 'se-l3',
      title: 'Error Terms',
      lessons: [
        {
          id: 'se-l3-remainder',
          title: 'The Remainder',
          slides: [
            teach(
              prose('$P_{n}(x)$ is the series stopped at $x^{n}$. What it leaves out is the **remainder**, $R_{n}(x) = f(x) - P_{n}(x)$.'),
              prose(
                'Lagrange showed the remainder is the next term of the series with one change: the derivative is taken at some point $c$ between $0$ and $x$, not at $0$.',
              ),
              display('R_{n}(x) = \\frac{f^{(n+1)}(c)}{(n+1)!}x^{n+1}'),
            ),
            ask('ser-rem-tiles'),
            ask('ser-rem-flow'),
            teach(
              prose('For $e^{x}$ every derivative is $e^{x}$, so after $P_{3}$:'),
              display('R_{3}(x) = \\frac{e^{c}}{4!}x^{4}'),
              prose("For $\\sin x$ after $P_{2}$, the next derivative is $f'''(x) = -\\cos x$:"),
              display('R_{2}(x) = \\frac{-\\cos c}{3!}x^{3}'),
              prose('Nobody knows $c$ exactly. Knowing it lies between $0$ and $x$ is enough to put a bound on the error, which is the next lesson.'),
            ),
            ask('ser-rem-pick'),
            ask('ser-rem-tiles', 2),
            ask('ser-rem-flow', 2),
            teach(
              prose('A polynomial such as $(1 + x)^{4}$ is its own series, so its remainder is exact: just the terms after $x^{n}$.'),
              working('(1 + x)^{4} &= 1 + 4x + 6x^{2}', '&\\quad + 4x^{3} + x^{4}', 'R_{2}(x) &= 4x^{3} + x^{4}'),
              prose('At $x = \\frac{1}{2}$ that is $\\frac{1}{2} + \\frac{1}{16} = \\frac{9}{16}$.'),
            ),
            ask('ser-rem-exact'),
            ask('ser-rem-exact+choice', 2),
            ask('ser-rem-pick', 2),
          ],
          skillCheck: [ask('ser-rem-tiles', 2), ask('ser-rem-exact', 2), ask('ser-rem-flow', 2)],
        },
        {
          id: 'se-l3-bound',
          title: 'Bounding the Error',
          slides: [
            teach(
              prose('$c$ is unknown, so bound what it could do. If $|f^{(n+1)}(c)| \\le M$ for every $c$ between $0$ and $x$, then'),
              display('|R_{n}(x)| \\le M \\times \\frac{|x|^{n+1}}{(n+1)!}'),
              prose('For $\\sin x$ and $\\cos x$ take $M = 1$: every derivative is a sine or cosine, and those never pass $1$ in size. After $P_{3}$ at $x = \\frac{1}{2}$:'),
              display('|R_{3}| \\le \\frac{(\\frac{1}{2})^{4}}{4!} = \\frac{1}{384}'),
            ),
            ask('ser-bound-tree'),
            ask('ser-bound-m-flow'),
            ask('ser-bound-tiles'),
            teach(
              prose(
                '$e^{c}$ grows as $c$ grows, so for $0 \\le c \\le b$ it is largest at $c = b$: take $M = e^{b}$. For a negative $x$, $e^{c} \\le 1$, so $M = 1$.',
              ),
              prose('For $e^{0.5}$ by $P_{2}$, to 3 significant figures:'),
              display('|R_{2}| \\le e^{0.5} \\times \\frac{0.5^{3}}{3!} = 0.0343'),
            ),
            ask('ser-bound-dec'),
            teach(
              prose(
                "A multiplier and a $k$ carry through every derivative. For $2\\sin 3x$ after $P_{2}$, $f'(x) = 6\\cos 3x$, $f''(x) = -18\\sin 3x$, $f'''(x) = -54\\cos 3x$: so $M = 2 \\times 3^{3} = 54$.",
              ),
              prose(
                "For $3e^{\\frac{x}{2}}$ each derivative brings out $\\frac{1}{2}$, so $f'''(x) = \\frac{3}{8}e^{\\frac{x}{2}}$. For a negative $x$, $e^{\\frac{c}{2}} \\le 1$, so $M = \\frac{3}{8}$.",
              ),
              prose('Where $M$ is exact, give the bound as a fraction; where it holds an $e$, as a decimal.'),
            ),
            ask('ser-bound-m-flow', 2),
            ask('ser-bound-tree', 2),
            ask('ser-bound-tiles', 2),
            ask('ser-bound-dec+choice', 2),
          ],
          skillCheck: [ask('ser-bound-tree', 2), ask('ser-bound-dec', 2), ask('ser-bound-m-flow', 2)],
        },
        {
          id: 'se-l3-compare',
          title: 'Bound against Estimate',
          slides: [
            teach(
              prose(
                'Level 2 estimated the error by the first term left out; call its size $D$. The Lagrange bound $B$ is a guarantee. When the terms **alternate** and shrink, the two agree.',
              ),
              prose('For $e^{-x}$ at $x = \\frac{1}{2}$ after $P_{2}$, with $M = 1$:'),
              display('D = \\frac{(\\frac{1}{2})^{3}}{3!} = \\frac{1}{48}, \\quad B = \\frac{1}{48}'),
              prose('The true error, about $0.0185$, is below both.'),
            ),
            ask('ser-compare-flow'),
            ask('ser-compare-tree'),
            ask('ser-compare-exact'),
            teach(
              prose(
                'For $e^{x}$ with $x > 0$ every term is positive, so all the terms left out add up and the error is **more** than $D$. Only Lagrange covers it.',
              ),
              prose('At $x = \\frac{1}{2}$, $e^{c} < 2$, so $B = 2D = \\frac{1}{24}$. The true error, about $0.0237$, sits between $D$ and $B$.'),
            ),
            ask('ser-compare-pick'),
            ask('ser-compare-flow', 2),
            ask('ser-compare-tree', 2),
            teach(
              prose('$\\frac{1}{1 - x}$ can be checked exactly. After $P_{n}$ the error is the first term left out divided by $1 - x$:'),
              display('\\frac{1}{1 - x} - P_{n}(x) = \\frac{x^{n+1}}{1 - x}'),
              prose('For $0 < x < 1$ that is larger than $x^{n+1}$; for $-1 < x < 0$ it is smaller, as the terms alternate.'),
            ),
            ask('ser-compare-exact+choice', 2),
            ask('ser-compare-pick', 2),
          ],
          skillCheck: [ask('ser-compare-tree', 2), ask('ser-compare-flow', 2), ask('ser-compare-pick', 2)],
        },
        {
          id: 'se-l3-degree',
          title: 'Choosing a Degree',
          slides: [
            teach(
              prose('To reach an accuracy, find the smallest $n$ whose bound is under the tolerance. For $\\cos x$ at $x = 1$ to within $0.001$, $M = 1$:'),
              working('n = 5: &\\; \\frac{1}{6!} \\approx 0.00139', 'n = 6: &\\; \\frac{1}{7!} \\approx 0.000198'),
              prose('So $n = 6$ is the first that is small enough.'),
            ),
            ask('ser-degree-table'),
            ask('ser-degree-n'),
            ask('ser-degree-table', 2),
            teach(
              prose('Turned round: for a fixed $n$, how far can $x$ go? For $\\sin x$ with $P_{3}$ and a tolerance of $0.001$:'),
              working('\\frac{x^{4}}{4!} &\\le 0.001', 'x^{4} &\\le 0.024', 'x &\\le 0.39'),
              figure({
                xMin: 0,
                xMax: 0.6,
                yMin: 0,
                yMax: 0.002,
                curves: [{ f: (x: number) => x ** 4 / 24, accent: true }],
                horizontals: [0.001],
                label: 'The bound x to the fourth over 24 rising from 0 to meet a dashed line at 0.001 near x = 0.39',
              }),
            ),
            ask('ser-degree-reach'),
            ask('ser-degree-slider'),
            ask('ser-degree-n+choice', 2),
            teach(
              prose('For $e^{x}$ with $x > 0$, $M = e^{x}$ grows along with the power, so the bound $\\frac{e^{x}x^{n+1}}{(n+1)!}$ rises faster and the reach is shorter.'),
              prose('A multiplier or a $k$ in the function raises $M$ and shortens the reach too.'),
            ),
            ask('ser-degree-slider', 2),
            ask('ser-degree-reach', 2),
          ],
          skillCheck: [ask('ser-degree-n', 2), ask('ser-degree-reach', 2), ask('ser-degree-slider', 2)],
        },
        {
          id: 'se-l3-centre',
          title: 'Remainders about a Centre',
          slides: [
            teach(
              prose('About $x = a$ everything is in powers of $(x - a)$, and $c$ lies between $a$ and $x$:'),
              display('R_{n}(x) = \\frac{f^{(n+1)}(c)}{(n+1)!}(x - a)^{n+1}'),
              prose("For $\\ln x$ about $1$, $f'''(x) = \\frac{2}{x^{3}}$, so"),
              display('R_{2}(x) = \\frac{2}{c^{3}} \\times \\frac{(x - 1)^{3}}{3!}'),
            ),
            ask('ser-centre-tiles'),
            ask('ser-centre-tiles', 2),
            teach(
              prose(
                'The derivatives of $\\ln x$, $\\sqrt{x}$ and $\\frac{1}{x}$ are negative powers of $x$, so they shrink as $c$ grows: take $M$ at the end nearer $0$. $e^{x}$ is the other way round: $e^{c}$ grows, so take $M$ at the right-hand end.',
              ),
              prose('For $\\ln 1.2$ by $P_{2}$ about $1$, $c$ is between $1$ and $1.2$, and $f\'\'\'(c) = \\frac{2}{c^{3}}$ is largest at $c = 1$, so $M = 2$:'),
              display('|R_{2}| \\le 2 \\times \\frac{0.2^{3}}{3!} = \\frac{1}{375}'),
            ),
            ask('ser-centre-flow'),
            ask('ser-centre-tree'),
            ask('ser-centre-dec'),
            ask('ser-centre-flow', 2),
            teach(
              prose("Choose a centre where the function is easy: $4$ or $9$ for $\\sqrt{x}$. For $\\sqrt{4.5}$ by $P_{1}$ about $4$, $f''(x) = -\\frac{1}{4}x^{-\\frac{3}{2}}$, largest in size at $c = 4$:"),
              display('M = \\frac{1}{4} \\times \\frac{1}{8} = \\frac{1}{32}'),
              display('|R_{1}| \\le \\frac{1}{32} \\times \\frac{0.5^{2}}{2!} = \\frac{1}{256}'),
            ),
            ask('ser-centre-tree', 2),
            ask('ser-centre-dec+choice', 2),
          ],
          skillCheck: [ask('ser-centre-tiles', 2), ask('ser-centre-tree', 2), ask('ser-centre-dec', 2)],
        },
      ],
      levelCheck: [
        ask('ser-rem-tiles', 2),
        ask('ser-bound-tree', 2),
        ask('ser-compare-flow', 2),
        ask('ser-degree-n', 2),
        ask('ser-centre-tiles', 2),
        ask('ser-rem-exact', 2),
        ask('ser-bound-dec', 2),
        ask('ser-compare-tree', 2),
        ask('ser-degree-slider', 2),
        ask('ser-centre-dec', 2),
        ask('ser-rem-flow', 2),
        ask('ser-bound-m-flow', 2),
        ask('ser-compare-pick', 2),
        ask('ser-degree-reach', 2),
      ],
    },

    {
      id: 'se-l4',
      title: 'Radius of Convergence',
      lessons: [
        {
          id: 'se-l4-ratio',
          title: 'The Ratio Test',
          slides: [
            teach(
              prose(
                'A power series $\\sum a_{n}x^{n}$ only means something where its terms add up to a limit. The **ratio test** compares each term with the one before:',
              ),
              display('\\left|\\frac{a_{n + 1}x^{n + 1}}{a_{n}x^{n}}\\right| = \\left|\\frac{a_{n + 1}}{a_{n}}\\right| |x|'),
              prose('and $L$ is what $\\left|\\frac{a_{n + 1}}{a_{n}}\\right|$ tends to, so the ratio tends to $L|x|$.'),
              prose(
                'A power of a number gives a fixed factor. Anything in $n$, such as $\\frac{n}{n + 1}$, or $\\frac{n!}{(n + 1)!}$ which is $\\frac{1}{n + 1}$, is left to its limit as $n \\to \\infty$.',
              ),
              prose(
                'If $L|x| < 1$ the terms shrink like a geometric series and the series converges; if $L|x| > 1$ they grow and it diverges. So it converges for $|x| < \\frac{1}{L}$, and $R = \\frac{1}{L}$ is its **radius of convergence**.',
              ),
            ),
            asking(
              'ser-ratio-tiles',
              1,
              prose(
                'For $\\sum \\frac{1}{2^{n} \\cdot n}x^{n}$, going from $n$ to $n + 1$ turns the $2^{n}$ underneath into $2^{n + 1}$, a factor of $\\frac{1}{2}$, and $\\frac{1}{n}$ into $\\frac{1}{n + 1}$, a factor of $\\frac{n}{n + 1}$:',
              ),
              display('\\left|\\frac{a_{n + 1}x^{n + 1}}{a_{n}x^{n}}\\right| = \\frac{1}{2} \\times \\frac{n}{n + 1} \\times |x|'),
              prose('$\\frac{n}{n + 1} \\to 1$, so $L = \\frac{1}{2}$ and $R = 2$.'),
            ),
            ask('ser-ratio-flow'),
            ask('ser-ratio-limit'),
            teach(
              prose(
                'For $\\frac{1}{1 - 3x} = \\sum 3^{n}x^{n}$ the ratio is exactly $3|x|$, so $L = 3$ and the series converges for $|x| < \\frac{1}{3}$: the geometric series in $u = 3x$ again.',
              ),
              prose('For $\\ln(1 + 2x) = \\sum \\frac{(-1)^{n + 1}2^{n}}{n}x^{n}$ the signs drop out inside the size, and'),
              display('\\left|\\frac{a_{n + 1}}{a_{n}}\\right| = 2 \\times \\frac{n}{n + 1} \\to 2'),
              prose('so $R = \\frac{1}{2}$. The $\\frac{n}{n + 1}$ tends to $1$ and changes nothing.'),
            ),
            ask('ser-radius-slider'),
            ask('ser-ratio-tiles', 2),
            ask('ser-ratio-flow', 2),
            teach(
              prose(
                'The test only compares $L|x|$ with $1$. Where $L|x| = 1$, at $x = R$ and $x = -R$, it gives no answer at all: those two ends are checked on their own, in the third lesson.',
              ),
              prose('And if $L = 0$, as it is with a factorial underneath, then $L|x| < 1$ for every $x$: the series converges everywhere.'),
            ),
            ask('ser-ratio-limit+choice', 2),
            ask('ser-radius-slider', 2),
          ],
          skillCheck: [ask('ser-ratio-tiles', 2), ask('ser-ratio-limit', 2), ask('ser-ratio-flow', 2)],
        },
        {
          id: 'se-l4-coefficients',
          title: 'Radius from the Coefficients',
          slides: [
            teach(
              prose(
                'Most of the work is seeing what each part of $a_{n}$ does to $\\left|\\frac{a_{n + 1}}{a_{n}}\\right|$ as $n$ grows. A power $k^{n}$ gives $|k|$. A factor of $n$ or $\\frac{1}{n}$ gives $\\frac{n + 1}{n}$ or its flip, which tends to $1$. A factorial underneath gives $\\frac{1}{n + 1}$, which tends to $0$.',
              ),
              prose(
                'So $k^{n}$ gives $R = \\frac{1}{|k|}$, an extra $n$ or $\\frac{1}{n}$ leaves $R$ alone, and a factorial underneath makes $R$ infinite.',
              ),
              prose(
                'A power underneath is a power too. In $\\sum \\frac{1}{4^{n} \\cdot n}x^{n}$, $4^{n}$ becomes $4^{n + 1}$, so the ratio is $\\frac{1}{4} \\times \\frac{n}{n + 1} \\to \\frac{1}{4}$: $L = \\frac{1}{4}$ and $R = 4$.',
              ),
            ),
            ask('ser-radius-typed'),
            ask('ser-ratio-steps'),
            ask('ser-radius-flow'),
            teach(
              prose(
                'Powers on top and underneath combine. In $\\sum \\frac{2^{n}}{3^{n}}x^{n}$ the powers together are $\\left(\\frac{2}{3}\\right)^{n}$, so $L = \\frac{2}{3}$ and $R = \\frac{3}{2}$.',
              ),
              prose('A sign that alternates, $(-1)^{n}$, has size $1$ and changes nothing: the ratio test only looks at sizes.'),
            ),
            ask('ser-radius-match'),
            ask('ser-ratio-steps', 2),
            ask('ser-radius-flow', 2),
            teach(
              prose(
                'A factorial beats any power: $\\frac{5^{n}}{n!}$ has ratio $\\frac{5}{n + 1} \\to 0$, so $\\sum \\frac{5^{n}}{n!}x^{n}$ converges for every $x$, just as $e^{5x}$ does.',
              ),
              prose("Two series with the same powers but different $n$'s in front share the same radius. Where they can differ is at the ends."),
            ),
            ask('ser-radius-typed+choice', 2),
            ask('ser-radius-match', 2),
          ],
          skillCheck: [ask('ser-radius-typed', 2), ask('ser-ratio-steps', 2), ask('ser-radius-flow', 2)],
        },
        {
          id: 'se-l4-ends',
          title: 'Checking the Ends',
          slides: [
            teach(
              prose(
                'At $x = R$ and $x = -R$ the ratio test gives $L|x| = 1$ and says nothing, so each end is tried on its own: put the end in, and look at the series of numbers it gives.',
              ),
              prose(
                'If those terms do not shrink to $0$, it diverges. $\\sum x^{n}$ at $x = 1$ is $1 + 1 + 1 + \\cdots$, and at $x = -1$ it is $1 - 1 + 1 - \\cdots$: neither settles.',
              ),
            ),
            teach(
              prose(
                'Terms shrinking to $0$ is not enough by itself. The **harmonic series** $1 + \\frac{1}{2} + \\frac{1}{3} + \\cdots$ grows without bound, however slowly. The **alternating harmonic series** $1 - \\frac{1}{2} + \\frac{1}{3} - \\cdots$ converges, to $\\ln 2$: shrinking terms with alternating signs always settle.',
              ),
              prose('So $\\sum \\frac{x^{n}}{n}$ diverges at $x = 1$ and converges at $x = -1$:'),
              display('-1 \\le x < 1'),
              prose('The **interval of convergence** has a filled dot at an end that is included and a hollow one at an end that is not.'),
            ),
            ask('ser-end-flow'),
            ask('ser-interval-line'),
            ask('ser-interval-tiles'),
            teach(
              prose(
                'Which end is included depends on the signs. $\\sum \\frac{(-2)^{n}}{n}x^{n}$ has $R = \\frac{1}{2}$. At $x = \\frac{1}{2}$ the terms are $\\frac{(-1)^{n}}{n}$, which converges; at $x = -\\frac{1}{2}$ they are $\\frac{1}{n}$, which does not: $-\\frac{1}{2} < x \\le \\frac{1}{2}$.',
              ),
              prose('Squares underneath, as in $\\sum \\frac{x^{n}}{n^{2}}$, shrink fast enough for both ends to be included, and a series with a factorial underneath has no ends at all.'),
            ),
            ask('ser-interval-pick'),
            ask('ser-end-flow', 2),
            ask('ser-interval-line', 2),
            ask('ser-interval-tiles', 2),
            ask('ser-interval-pick', 2),
          ],
          skillCheck: [ask('ser-interval-line', 2), ask('ser-end-flow', 2), ask('ser-interval-tiles', 2)],
        },
        {
          id: 'se-l4-shifted',
          title: 'Substituted and Shifted Series',
          slides: [
            teach(
              prose('A series in $x^{2}$ is a series in $u = kx^{2}$. Find where it converges in $u$, then turn that into $x$:'),
              display('\\sum 4^{n}x^{2n} = \\sum (4x^{2})^{n}'),
              prose(
                'It needs $|u| < 1$, so $4x^{2} < 1$ and $|x| < \\frac{1}{2}$. In general $u = kx^{m}$ gives $R = \\left(\\frac{1}{|k|}\\right)^{\\frac{1}{m}}$: a square root for $x^{2}$, a cube root for $x^{3}$.',
              ),
              prose('The root need not come out whole: $\\sum 2^{n}x^{2n}$ needs $2x^{2} < 1$, so $R = \\frac{1}{\\sqrt{2}}$.'),
            ),
            ask('ser-sub-radius'),
            ask('ser-sub-pick'),
            teach(
              prose(
                'A series in powers of $(x - a)$ is centred on $x = a$ instead of $0$. The ratio test works just the same, with $|x - a|$ in place of $|x|$, and $|x - a| < R$ means',
              ),
              display('a - R < x < a + R'),
              prose('So $\\sum \\frac{(x - 3)^{n}}{2^{n}}$, with $R = 2$, converges for $1 < x < 5$.'),
            ),
            ask('ser-shift-tree'),
            teach(
              prose(
                'The ends of a shifted series are checked as before, putting each one in. For $\\sum \\frac{(x - 3)^{n}}{2^{n} \\cdot n}$ at $x = 1$ the terms are $\\frac{(-2)^{n}}{2^{n} \\cdot n} = \\frac{(-1)^{n}}{n}$, which converges; at $x = 5$ they are $\\frac{1}{n}$, which does not:',
              ),
              display('1 \\le x < 5'),
            ),
            ask('ser-shift-line'),
            ask('ser-sub-radius+choice', 2),
            ask('ser-sub-pick', 2),
            ask('ser-shift-tree', 2),
            ask('ser-shift-line', 2),
          ],
          skillCheck: [ask('ser-sub-radius', 2), ask('ser-shift-tree', 2), ask('ser-shift-line', 2)],
        },
        {
          id: 'se-l4-singularity',
          title: 'The Nearest Singularity',
          slides: [
            teach(
              prose(
                'There is a quicker way to a radius. A Taylor series about $x = a$ converges out to the **nearest point where the function breaks**, and no further, so $R$ is the distance from $a$ to that point.',
              ),
              prose(
                '$\\frac{1}{1 - x}$ breaks at $x = 1$, so its Maclaurin series has $R = 1$. $\\ln(1 + x)$ breaks at $x = -1$: $R = 1$ again. Both agree with the ratio test.',
              ),
            ),
            ask('ser-singular-flow'),
            ask('ser-singular-typed'),
            ask('ser-singular-slider'),
            teach(
              prose('Measure from the centre, not from $0$. $\\frac{1}{x^{2} - 4}$ breaks at $x = 2$ and $x = -2$:'),
              display('\\begin{aligned} \\text{about } 0: \\; R &= 2 \\\\ \\text{about } 1: \\; R &= |2 - 1| = 1 \\end{aligned}'),
              prose('Only the nearest break counts: the series cannot reach past it, however far away the other one is.'),
            ),
            ask('ser-singular-typed+choice', 2),
            ask('ser-singular-flow', 2),
            ask('ser-singular-slider', 2),
            teach(
              prose(
                '$\\frac{1}{1 + x^{2}}$ never breaks on the real line, yet its series $1 - x^{2} + x^{4} - \\cdots$ has $R = 1$. The break is off the line: the bottom is $0$ at $x = \\pm i$.',
              ),
              prose(
                'A power series converges inside a circle in the complex plane, centred on its centre. The circle grows until it meets a singularity, real or complex, and $i$ is a distance $1$ from $0$.',
              ),
            ),
            ask('ser-complex-pick'),
            ask('ser-complex-pick', 2),
          ],
          skillCheck: [ask('ser-singular-typed', 2), ask('ser-singular-flow', 2), ask('ser-complex-pick', 2)],
        },
      ],
      levelCheck: [
        ask('ser-ratio-tiles', 2),
        ask('ser-radius-flow', 2),
        ask('ser-interval-line', 2),
        ask('ser-sub-radius', 2),
        ask('ser-singular-slider', 2),
        ask('ser-ratio-limit', 2),
        ask('ser-radius-match', 2),
        ask('ser-end-flow', 2),
        ask('ser-shift-tree', 2),
        ask('ser-complex-pick', 2),
        ask('ser-radius-typed', 2),
        ask('ser-interval-tiles', 2),
        ask('ser-sub-pick', 2),
        ask('ser-singular-flow', 2),
      ],
    },
  ],
};
