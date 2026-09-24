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
  blurb: 'Functions as never-ending polynomials: Maclaurin and Taylor series, the standard series, estimates and their errors, limits, and where a series is valid.',
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
            ),
            ask('ser-coef-tree'),
            ask('ser-first-terms-tiles'),
            ask('ser-coef-typed'),
            teach(
              prose('So the whole series comes from the derivatives at $0$:'),
              working("f(x) &= f(0) + f'(0)x", "&\\quad + \\frac{f''(0)}{2!}x^{2}", "&\\quad + \\frac{f'''(0)}{3!}x^{3} + \\cdots"),
              prose(
                'For $f(x) = e^{2x}$ every derivative at $0$ is a power of $2$, so the coefficients are $\\frac{2^{n}}{n!}$. Keep them as exact fractions:',
              ),
              working('e^{2x} &= 1 + 2x + 2x^{2}', '&\\quad + \\frac{4}{3}x^{3} + \\cdots'),
            ),
            ask('ser-which-flow'),
            ask('ser-coef-tree', 2),
            ask('ser-first-terms-tiles', 2),
            teach(
              prose(
                'This needs $f(0)$ and **every** derivative at $0$ to exist. $\\ln x$ and $\\frac{1}{x}$ are not defined at $0$, and $\\sqrt{x}$ is, but its gradient there is infinite: none of them has a Maclaurin series.',
              ),
              prose('A derivative that comes to $0$ just means that power of $x$ is missing. "The first three terms" means the first three that are not zero.'),
            ),
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
            ask('ser-exp-tiles'),
            ask('ser-exp-steps'),
            ask('ser-exp-term'),
            teach(
              prose('For $e^{kx}$, put $u = kx$ into the series for $e^{u}$. The whole of $kx$ is raised to the power, not just the $x$:'),
              working(
                'e^{3x} &= 1 + 3x + \\frac{(3x)^{2}}{2!}',
                '&\\quad + \\frac{(3x)^{3}}{3!} + \\cdots',
                '&= 1 + 3x + \\frac{9}{2}x^{2}',
                '&\\quad + \\frac{9}{2}x^{3} + \\cdots',
              ),
              prose('A number in front multiplies every term.'),
            ),
            ask('ser-exp-slider'),
            ask('ser-exp-tiles', 2),
            ask('ser-exp-steps', 2),
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
            ask('ser-exp-term+choice', 2),
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
            ),
            ask('ser-trig-cycle-tree'),
            ask('ser-trig-tiles'),
            ask('ser-trig-pick'),
            teach(
              prose('Cosine starts one step on in the same cycle, at $1$, so it keeps the even powers:'),
              display('\\cos x = 1 - \\frac{x^{2}}{2!} + \\frac{x^{4}}{4!} - \\cdots'),
              prose('Both hold for every $x$. For $\\sin 3x$ put $u = 3x$ in, so $\\frac{u^{3}}{3!}$ becomes $\\frac{27x^{3}}{6} = \\frac{9}{2}x^{3}$.'),
            ),
            ask('ser-trig-sign-flow'),
            ask('ser-trig-cycle-tree', 2),
            ask('ser-trig-tiles', 2),
            teach(
              prose(
                'The sign of a term needs no working out: count which non-zero term it is. The first is $+$, the second $-$, the third $+$, and so on.',
              ),
              prose(
                'Then allow for the function itself. $\\sin(-x) = -\\sin x$ flips every sign, and a minus in front does too; $\\cos(-x) = \\cos x$ changes nothing, since every power in it is even.',
              ),
            ),
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
            ask('ser-log-tiles', 2),
            teach(
              prose(
                'The other one to know is the sum to infinity of a geometric series (Sequences and Series, "The Sum to Infinity"), read backwards:',
              ),
              display('\\frac{1}{1 - x} = 1 + x + x^{2} + \\cdots'),
              prose(
                'These two are **not** valid for every $x$. The geometric series only converges for $-1 < x < 1$; the one for $\\ln(1 + x)$ for $-1 < x \\le 1$.',
              ),
            ),
            ask('ser-log-range'),
            ask('ser-log-valid-flow'),
            ask('ser-log-coef+choice', 2),
            teach(
              prose(
                'With $u$ in place of $x$, the range is on $u$. $\\ln(1 - 3x)$ is $\\ln(1 + u)$ with $u = -3x$, so it needs $-1 < -3x \\le 1$:',
              ),
              display('-\\frac{1}{3} \\le x < \\frac{1}{3}'),
              prose('Dividing by $-3$ turned both inequalities round, so the included end moved to the other side.'),
            ),
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
            ask('ser-sub-tiles', 2),
            teach(
              prose('**Multiply** two series like two long brackets, keeping only the pairs of terms whose powers add up to the one you want. For the $x^{2}$ term of $e^{x}\\cos x$:'),
              working('e^{x} &= 1 + x + \\frac{1}{2}x^{2} + \\cdots', '\\cos x &= 1 - \\frac{1}{2}x^{2} + \\cdots'),
              prose('The pairs are $1$ with $-\\frac{1}{2}x^{2}$, $x$ with the $x$ term of $\\cos x$ (there is none, so $0$), and $\\frac{1}{2}x^{2}$ with $1$:'),
              display('1 \\cdot (-\\tfrac{1}{2}) + 1 \\cdot 0 + \\tfrac{1}{2} \\cdot 1 = 0'),
            ),
            ask('ser-multiply-steps'),
            ask('ser-product-coef'),
            ask('ser-sub-tree', 2),
            teach(
              prose(
                'A quotient is a product in disguise: $\\frac{\\sin x}{1 - x}$ is $\\sin x$ times $1 + x + x^{2} + \\cdots$ And the binomial series is one more to quote, for any $n$ when $-1 < x < 1$:',
              ),
              working('(1 + x)^{n} &= 1 + nx', '& {} + \\frac{n(n - 1)}{2!}x^{2} + \\cdots'),
              prose('For a whole $n$ it stops, and it is the expansion from the Binomial Expansion course.'),
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
            ask('ser-taylor-tree'),
            ask('ser-taylor-coef'),
            ask('ser-taylor-tiles'),
            teach(
              prose('$\\ln x$ has no series about $0$, but about $x = 1$ it does. Its derivatives there are $1, -1, 2$, so'),
              working('\\ln x &= (x - 1) - \\frac{1}{2}(x - 1)^{2}', '&\\quad + \\frac{1}{3}(x - 1)^{3} - \\cdots'),
              prose(
                'Pick $a$ where the function is easy to work out exactly and close to where you want it: $\\sqrt{x}$ about $4$ or $9$, $\\sin x$ about $\\pi$.',
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
                'Turned round, a bound on the first term left out says how far from $0$ the estimate stays good: $\\frac{x^{3}}{3!} \\le 0.001$ holds up to about $x = 0.18$.',
              ),
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
            ask('ser-leading-term'),
            ask('ser-limit-flow'),
            ask('ser-limit'),
            teach(
              prose(
                'What matters is the first power the top starts with. For $1 - \\cos x = \\frac{1}{2}x^{2} - \\cdots$, divide by $x^{2}$ and the limit is $\\frac{1}{2}$; divide by $x$ and it is $0$.',
              ),
              prose('A top starting with a lower power than the bottom has no limit: it grows without bound.'),
            ),
            ask('ser-limit-sum-steps'),
            ask('ser-leading-term', 2),
            ask('ser-limit-flow', 2),
            teach(
              prose('When the top is several functions, expand each one. The low powers cancel, and the first power left decides the limit:'),
              display('e^{x} - 1 - x = \\tfrac{1}{2}x^{2} + \\tfrac{1}{6}x^{3} + \\cdots'),
              display('\\frac{e^{x} - 1 - x}{x^{2}} = \\tfrac{1}{2} + \\tfrac{1}{6}x + \\cdots'),
              prose('So as $x \\to 0$ the limit is $\\frac{1}{2}$.'),
            ),
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
            ),
            ask('ser-valid-tiles'),
            ask('ser-range-flow'),
            ask('ser-valid-line'),
            teach(
              prose('For $\\ln(4 - 3x)$, take the $4$ out first so the standard series fits:'),
              working('\\ln(4 - 3x) &= \\ln 4 + \\ln(1 + u)', 'u &= -\\tfrac{3}{4}x'),
              prose('So it needs $-1 < u \\le 1$, that is $-1 < -\\frac{3}{4}x \\le 1$, which is'),
              display('-\\tfrac{4}{3} \\le x < \\tfrac{4}{3}'),
            ),
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
  ],
};
