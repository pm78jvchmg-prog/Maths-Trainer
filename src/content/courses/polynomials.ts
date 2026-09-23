/**
 * Polynomials & the Factor Theorem.
 *
 * Starts at degree 3, where Quadratics leaves off: what a polynomial is and
 * what its parts are called; adding, subtracting and multiplying them;
 * evaluating one; dividing by a linear factor. Then the two theorems division
 * leads to — the remainder on dividing by (x - a) is p(a), and (x - a) is a
 * factor exactly when p(a) = 0 — and what they are for: finding a factor by
 * trial, factorising a cubic fully, and solving it.
 *
 * Each level closes with a level check: fifteen questions, no teaching
 * slides, one attempt each.
 */
import type { Course, SlideRef } from '../types';

const teach = (
  ...blocks: { kind: 'prose' | 'display'; text?: string; tex?: string }[]
): SlideRef => ({
  type: 'literal',
  slide: {
    kind: 'teach',
    body: blocks.map((b) =>
      b.kind === 'prose'
        ? ({ kind: 'prose', text: b.text ?? '' } as const)
        : ({ kind: 'display', tex: b.tex ?? '' } as const),
    ),
  },
});

const ask = (generatorId: string, difficulty = 1): SlideRef => ({
  type: 'generated',
  generatorId,
  difficulty,
});

const prose = (text: string) => ({ kind: 'prose' as const, text });
const maths = (tex: string) => ({ kind: 'display' as const, tex });

/**
 * Lines of working stacked in one display and aligned on their `&`. A chain
 * of equals signs on one line runs off a phone screen after about three terms.
 */
const working = (...lines: string[]) =>
  maths(`\\begin{aligned} ${lines.join(' \\\\ ')} \\end{aligned}`);

export const polynomials: Course = {
  id: 'polynomials',
  category: 'algebra-fundamentals',
  position: 40,
  title: 'Polynomials & the Factor Theorem',
  blurb: 'Cubics and beyond: their arithmetic, dividing them, and the theorem that finds their factors.',
  levels: [
    {
      id: 'pl-l1',
      title: 'Polynomial Arithmetic',
      lessons: [
        {
          id: 'pl-l1-naming',
          title: 'Degree, Terms and Names',
          slides: [
            teach(
              prose(
                'A polynomial is a sum of terms, each a number times a whole-number power of $x$. The number in front of a term is its coefficient.',
              ),
              maths('p(x) = 4x^{3} - 2x^{2} + 7x - 5'),
              prose(
                'The highest power is the degree, and it names the polynomial: degree 1 is linear, 2 quadratic, 3 cubic, 4 quartic and 5 quintic. This one is a cubic. $\\frac{3}{x}$ is $3x^{-1}$ and $\\sqrt{x}$ is $x^{\\frac{1}{2}}$, which are not whole-number powers, so anything containing them is not a polynomial.',
              ),
            ),
            ask('poly-name-flow'),
            ask('poly-degree'),
            ask('poly-coefficient'),
            teach(
              prose(
                'The terms can come in any order. Descending order, highest power first, is the standard way to write one, and each term keeps the sign in front of it:',
              ),
              maths('5 + 2x^{3} - x = 2x^{3} - x + 5'),
              prose(
                'Here the coefficient of $x$ is $-1$, and there is no $x^{2}$ term, so the coefficient of $x^{2}$ is $0$. The first term, $2x^{3}$, is the leading term, and $5$ is the constant term.',
              ),
            ),
            ask('poly-standard-tiles'),
            ask('poly-coefficient+choice'),
            ask('poly-name-flow', 2),
            teach(
              prose('Terms with the same power of $x$ are like terms, and they collect into one:'),
              maths('3x^{2} - 5x^{2} = -2x^{2}'),
              prose(
                'When the highest terms cancel, the degree drops: $x^{4} + 3x - x^{4}$ is $3x$, which has degree 1, not 4. So collect before you read off the degree.',
              ),
            ),
            ask('poly-degree+choice', 2),
            ask('poly-standard-tiles', 2),
          ],
          skillCheck: [ask('poly-degree', 2), ask('poly-coefficient', 2), ask('poly-standard-tiles', 2)],
        },
        {
          id: 'pl-l1-add',
          title: 'Adding and Subtracting',
          slides: [
            teach(
              prose('To add polynomials, collect like terms: add the coefficients of each power of $x$ separately.'),
              working('&(2x^{3} + 5x^{2} - 3)', '+\\;&(x^{3} - 2x^{2} + 4x)', '=\\;&3x^{3} + 3x^{2} + 4x - 3'),
              prose(
                'The degree of a sum is the larger of the two degrees, unless the two share a degree and their leading terms cancel: $(2x^{3} + x) + (-2x^{3} + x^{2})$ is $x^{2} + x$, of degree 2.',
              ),
            ),
            ask('poly-add-tiles'),
            ask('poly-sum-degree-flow'),
            ask('poly-add-tiles+choice'),
            teach(
              prose(
                'Subtracting a bracket subtracts every term in it, so the minus sign changes the sign of each term inside, not only the first:',
              ),
              working('&-(x^{3} - 2x^{2} + 4x - 1)', '=\\;&-x^{3} + 2x^{2} - 4x + 1'),
              prose(
                'Then collect as before. Subtracting cancels equal leading terms, where adding cancels opposite ones.',
              ),
            ),
            ask('poly-subtract-steps'),
            ask('poly-sum-degree-flow', 2),
            ask('poly-subtract-steps', 2),
            teach(
              prose(
                'For one coefficient of a combination such as $2p(x) - 3q(x)$, only that power of $x$ in each matters. If $p(x)$ has $5x^{2}$ and $q(x)$ has $-2x^{2}$:',
              ),
              maths('2 \\times 5 - 3 \\times (-2) = 16'),
              prose('So $2p(x) - 3q(x)$ has $16x^{2}$, and nothing else needs working out.'),
            ),
            ask('poly-collect-coefficient'),
            ask('poly-collect-coefficient+choice', 2),
          ],
          skillCheck: [ask('poly-add-tiles', 2), ask('poly-subtract-steps', 2), ask('poly-collect-coefficient', 2)],
        },
        {
          id: 'pl-l1-multiply',
          title: 'Multiplying Polynomials',
          slides: [
            teach(
              prose(
                'To multiply a linear by a quadratic, multiply each term of the first bracket by each term of the second, which is $2 \\times 3 = 6$ products, then collect like terms.',
              ),
              working(
                '&(x + 2)(x^{2} - 3x + 4)',
                '=\\;&x^{3} - 3x^{2} + 4x',
                '&\\quad + 2x^{2} - 6x + 8',
                '=\\;&x^{3} - x^{2} - 2x + 8',
              ),
              prose('A linear times a quadratic is always a cubic: $x \\times x^{2}$ is the only way to make $x^{3}$.'),
            ),
            ask('poly-expand-tiles'),
            ask('poly-strands-tree'),
            ask('poly-product-coefficient'),
            teach(
              prose(
                'Each power comes from particular pairs. In $(2x - 1)(x^{2} + 5x + 3)$ the $x^{2}$ term comes from $2x \\times 5x$ and from $-1 \\times x^{2}$:',
              ),
              maths('10x^{2} - x^{2} = 9x^{2}'),
              prose(
                'So one coefficient needs only its pairs: those whose powers add to the power you want. With two quadratics, $x^{2}$ has three pairs: $x^{2} \\times$ number, $x \\times x$ and number $\\times\\, x^{2}$.',
              ),
            ),
            ask('poly-product-coefficient+choice', 2),
            ask('poly-strands-tree', 2),
            ask('poly-expand-tiles+choice', 2),
            teach(
              prose('Three brackets multiply two at a time: two into a quadratic, then that by the third.'),
              working('&(x - 1)(x + 2)(x - 3)', '=\\;&(x^{2} + x - 2)(x - 3)', '=\\;&x^{3} - 2x^{2} - 5x + 6'),
              prose('Notice the constant, $6$, is $(-1) \\times 2 \\times (-3)$: the three numbers in the brackets multiplied.'),
            ),
            ask('poly-triple-steps'),
            ask('poly-triple-steps', 2),
          ],
          skillCheck: [ask('poly-expand-tiles', 2), ask('poly-product-coefficient', 2), ask('poly-triple-steps', 2)],
        },
        {
          id: 'pl-l1-evaluate',
          title: 'Evaluating a Polynomial',
          slides: [
            teach(
              prose('$p(a)$ means put $a$ in place of every $x$. Powers first, then the multiplying, then adding and taking away.'),
              working('p(x) &= 2x^{3} - 5x + 1', 'p(2) &= 2 \\times 2^{3} - 5 \\times 2 + 1', '&= 16 - 10 + 1 = 7'),
              prose(
                'On the graph of $y = p(x)$, $p(a)$ is the height of the curve at $x = a$. Two shortcuts: $p(0)$ is just the constant term, and $p(1)$ is the coefficients added up.',
              ),
            ),
            ask('poly-value-reduce'),
            ask('poly-value-slider'),
            ask('poly-special-value'),
            teach(
              prose('A negative input needs its brackets. An odd power keeps the minus sign and an even power loses it:'),
              working('p(-2) &= 2(-2)^{3} - 5(-2) + 1', '&= -16 + 10 + 1', '&= -5'),
              prose('So $p(-1)$ is the coefficients added up with the odd-power ones given the opposite sign.'),
            ),
            ask('poly-value-reduce+choice', 2),
            ask('poly-special-value+choice', 2),
            ask('poly-value-slider', 2),
            teach(
              prose(
                'Knowing a value can pin down an unknown coefficient. If $p(x) = x^{3} + kx - 4$ and $p(2) = 10$, substitute and solve:',
              ),
              working('8 + 2k - 4 &= 10', '2k &= 6', 'k &= 3'),
            ),
            ask('poly-find-k'),
            ask('poly-find-k+choice'),
          ],
          skillCheck: [ask('poly-value-reduce', 2), ask('poly-special-value', 2), ask('poly-find-k')],
        },
        {
          id: 'pl-l1-divide',
          title: 'Dividing by a Linear Factor',
          slides: [
            teach(
              prose(
                'Dividing $p(x)$ by $(x - a)$ finds a quotient $q(x)$ and a remainder $r$ with $p(x) = (x - a)q(x) + r$. Long division clears the first term at each step:',
              ),
              working(
                'x^{3} + 4x^{2} - x^{2}(x - 1) &= 5x^{2}',
                '5x^{2} + x - 5x(x - 1) &= 6x',
                '6x - 6 - 6(x - 1) &= 0',
              ),
              prose(
                'What was taken away, $x^{2} + 5x + 6$, is the quotient, and what is left, $0$, is the remainder. Write a missing power with a $0$, as $+ 0x^{2}$, so that no term slips out of place.',
              ),
            ),
            ask('poly-divide-steps'),
            ask('poly-quotient-tiles'),
            ask('poly-rebuild'),
            teach(
              prose(
                'Synthetic division is the same working with only the numbers. Write $a$ and the coefficients, bring the first coefficient down, then multiply by $a$ and add the next:',
              ),
              maths(
                '\\begin{array}{r|rrrr} 1 & 1 & 4 & 1 & -6 \\\\ & & 1 & 5 & 6 \\\\ \\hline & 1 & 5 & 6 & 0 \\end{array}',
              ),
              prose(
                'The bottom row is the quotient, $x^{2} + 5x + 6$, then the remainder, $0$. To divide by $(x + 2)$, use $a = -2$.',
              ),
            ),
            ask('poly-synthetic-tree'),
            ask('poly-divide-steps', 2),
            ask('poly-synthetic-tree', 2),
            teach(
              prose(
                'When the division is not exact, the remainder goes on the end: dividing $x^{3} + x^{2} - 5x - 3$ by $(x - 2)$ gives',
              ),
              working('&x^{3} + x^{2} - 5x - 3', '=\\;&(x - 2)(x^{2} + 3x + 1) - 1'),
              prose('Multiplying back out is the check: divisor times quotient, plus the remainder, is the polynomial you started with.'),
            ),
            ask('poly-quotient-tiles', 2),
            ask('poly-rebuild', 2),
          ],
          skillCheck: [ask('poly-divide-steps', 2), ask('poly-quotient-tiles', 2), ask('poly-synthetic-tree', 2)],
        },
      ],
      levelCheck: [
        ask('poly-degree', 2),
        ask('poly-name-flow', 2),
        ask('poly-coefficient+choice', 2),
        ask('poly-standard-tiles', 2),
        ask('poly-add-tiles', 2),
        ask('poly-subtract-steps', 2),
        ask('poly-sum-degree-flow', 2),
        ask('poly-expand-tiles', 2),
        ask('poly-strands-tree', 2),
        ask('poly-triple-steps'),
        ask('poly-value-reduce+choice', 2),
        ask('poly-special-value', 2),
        ask('poly-find-k'),
        ask('poly-synthetic-tree', 2),
        ask('poly-quotient-tiles', 2),
      ],
    },
    {
      id: 'pl-l2',
      title: 'The Factor and Remainder Theorems',
      lessons: [
        {
          id: 'pl-l2-remainder',
          title: 'The Remainder Theorem',
          slides: [
            teach(
              prose('Dividing $p(x)$ by $(x - a)$ leaves $p(x) = (x - a)q(x) + r$. Now put $x = a$: the bracket is $0$, so'),
              maths('p(a) = 0 \\times q(a) + r = r'),
              prose(
                'The remainder on dividing by $(x - a)$ is $p(a)$, found with no division at all. It is also the last number synthetic division ends on.',
              ),
            ),
            ask('poly-remainder'),
            ask('poly-synthetic-tree'),
            ask('poly-substitute-flow'),
            teach(
              prose(
                'Use the value of $x$ that makes the divisor zero. $(x + 2)$ is zero at $x = -2$, so dividing by $(x + 2)$ leaves $p(-2)$, not $p(2)$.',
              ),
              working('p(x) &= x^{3} - 3x + 5', 'p(-2) &= -8 + 6 + 5 = 3'),
              prose('So $x^{3} - 3x + 5$ divided by $(x + 2)$ leaves a remainder of $3$.'),
            ),
            ask('poly-substitute-flow', 2),
            ask('poly-remainder+choice', 2),
            ask('poly-synthetic-tree', 2),
            teach(
              prose(
                'A remainder you are told gives an equation. Dividing $x^{3} + kx^{2} - 4$ by $(x - 2)$ leaves $8$, so $p(2) = 8$:',
              ),
              working('8 + 4k - 4 &= 8', '4k &= 4', 'k &= 1'),
            ),
            ask('poly-remainder-k'),
            ask('poly-remainder-k+choice', 2),
          ],
          skillCheck: [ask('poly-remainder', 2), ask('poly-substitute-flow', 2), ask('poly-remainder-k', 2)],
        },
        {
          id: 'pl-l2-factor',
          title: 'The Factor Theorem',
          slides: [
            teach(
              prose(
                'A factor divides exactly, leaving a remainder of $0$. With the remainder theorem, that gives the factor theorem: $(x - a)$ is a factor of $p(x)$ exactly when $p(a) = 0$.',
              ),
              working('p(x) &= x^{3} - 3x^{2} - 4x + 12', 'p(2) &= 8 - 12 - 8 + 12 = 0'),
              prose('So $(x - 2)$ is a factor of $p(x)$, and no division was needed to know it.'),
            ),
            ask('poly-factor-flow'),
            ask('poly-factor-tree'),
            ask('poly-is-factor'),
            teach(
              prose('For $(x + a)$, test $p(-a)$. With the same $p(x)$:'),
              working('p(-2) &= -8 - 12 + 8 + 12', '&= 0'),
              prose(
                'So $(x + 2)$ is a factor too. A value that is not $0$ is still useful: it is the remainder, and it rules that bracket out.',
              ),
            ),
            ask('poly-factor-tree', 2),
            ask('poly-is-factor', 2),
            ask('poly-factor-flow', 2),
            teach(
              prose(
                'Knowing a factor gives an equation. If $(x + 1)$ is a factor of $x^{3} + 2x^{2} + kx - 6$, then $p(-1) = 0$:',
              ),
              working('-1 + 2 - k - 6 &= 0', 'k &= -5'),
            ),
            ask('poly-find-k', 2),
            ask('poly-find-k+choice', 2),
          ],
          skillCheck: [ask('poly-factor-flow', 2), ask('poly-is-factor', 2), ask('poly-find-k', 2)],
        },
        {
          id: 'pl-l2-trial',
          title: 'Finding a Factor by Trial',
          slides: [
            teach(
              prose(
                'If $(x - r)$ is a factor of $x^{3} + \\dots + d$, then $r$ times the other factors\' numbers makes $d$, up to sign. So every whole-number root divides the constant term.',
              ),
              working('&x^{3} - 2x^{2} - 5x + 6:', '&\\pm 1, \\; \\pm 2, \\; \\pm 3, \\; \\pm 6'),
              prose('Those eight are the only whole numbers worth trying, negatives included.'),
            ),
            ask('poly-candidates'),
            ask('poly-trial-flow'),
            ask('poly-value-reduce', 2),
            teach(
              prose(
                'Try them in order, smallest first and both signs: $1, -1, 2, -2, \\dots$. $p(1)$ is quickest, since it is just the coefficients added up:',
              ),
              maths('p(1) = 1 - 2 - 5 + 6 = 0'),
              prose('So $(x - 1)$ is a factor. Had it not been $0$, $p(-1)$ would be next.'),
            ),
            ask('poly-trial-flow', 2),
            ask('poly-is-factor', 2),
            ask('poly-candidates', 2),
            teach(
              prose(
                'Stop at the first zero. One factor is all you need to start: dividing by it leaves a quadratic, and the next lesson factorises that.',
              ),
              prose('Each trial is only a substitution, so work carefully with the negatives: $(-2)^{3} = -8$ but $(-2)^{2} = 4$.'),
            ),
            ask('poly-value-reduce+choice', 2),
            ask('poly-is-factor'),
          ],
          skillCheck: [ask('poly-candidates', 2), ask('poly-trial-flow', 2), ask('poly-is-factor', 2)],
        },
        {
          id: 'pl-l2-factorise',
          title: 'Factorising a Cubic Fully',
          slides: [
            teach(
              prose(
                'To factorise a cubic fully: find one factor by trial, divide by it, then factorise the quadratic that is left.',
              ),
              working('&x^{3} - 2x^{2} - 5x + 6', '=\\;&(x - 1)(x^{2} - x - 6)', '=\\;&(x - 1)(x - 3)(x + 2)'),
              prose('Check by the constant: $(-1) \\times (-3) \\times 2 = 6$.'),
            ),
            ask('poly-factorise-tiles'),
            ask('poly-divide-steps'),
            ask('poly-factorise-tiles', 2),
            teach(
              prose(
                'Instead of dividing, you can compare coefficients. With $(x - 2)$ a factor of $x^{3} + x^{2} - 10x + 8$, write $(x - 2)(x^{2} + bx + c)$ and multiply out:',
              ),
              working('x^{2}\\!: \\;\\; b - 2 &= 1, \\;\\; b = 3', '\\text{number}\\!: \\;\\; -2c &= 8, \\;\\; c = -4'),
              prose('So the quadratic is $x^{2} + 3x - 4 = (x + 4)(x - 1)$.'),
            ),
            ask('poly-compare-tree'),
            ask('poly-divide-steps'),
            ask('poly-compare-tree', 2),
            teach(
              prose(
                'Sometimes the quadratic does not factorise. Two whole numbers would have to multiply to $c$ and add to $b$, and if $b^{2} - 4c$ is not a square number, none do.',
              ),
              working('&x^{3} - x^{2} - x - 2', '=\\;&(x - 2)(x^{2} + x + 1)'),
              prose('Here $b^{2} - 4c = -3$, so this is already fully factorised: two factors, not three.'),
            ),
            ask('poly-full-flow'),
            ask('poly-full-flow', 2),
          ],
          skillCheck: [ask('poly-factorise-tiles', 2), ask('poly-compare-tree', 2), ask('poly-full-flow', 2)],
        },
        {
          id: 'pl-l2-solve',
          title: 'Solving a Cubic',
          slides: [
            teach(
              prose('To solve $p(x) = 0$, factorise fully. A product is zero when one of its brackets is, so each bracket gives a solution:'),
              working('&(x - 1)(x - 3)(x + 2) = 0', '&x = 1, 3 \\text{ or } -2'),
              prose('Each sign flips: $(x + 2) = 0$ gives $x = -2$.'),
            ),
            ask('poly-solve-tiles'),
            ask('poly-solve-flow'),
            ask('poly-root-slider'),
            teach(
              prose(
                'A cubic can have fewer than three different solutions. A repeated bracket counts once, and a quadratic factor with $b^{2} - 4c < 0$ adds none:',
              ),
              working(
                '&(x - 2)(x - 2)(x + 1) = 0',
                '&\\quad x = 2 \\text{ or } -1',
                '&(x - 2)(x^{2} + x + 3) = 0',
                '&\\quad x = 2 \\text{ only}',
              ),
              prose('Every cubic has at least one real solution, so the count is 1, 2 or 3.'),
            ),
            ask('poly-count-roots'),
            ask('poly-solve-tiles', 2),
            ask('poly-count-roots', 2),
            teach(
              prose(
                'The solutions of $p(x) = 0$ are where the curve $y = p(x)$ crosses the $x$-axis. A cubic with three different solutions crosses it three times.',
              ),
              prose('So a sketch tells you how many solutions to expect and roughly where, and the algebra gives them exactly.'),
            ),
            ask('poly-root-slider', 2),
            ask('poly-solve-flow', 2),
          ],
          skillCheck: [ask('poly-solve-tiles', 2), ask('poly-count-roots', 2), ask('poly-solve-flow', 2)],
        },
      ],
      levelCheck: [
        ask('poly-remainder', 2),
        ask('poly-substitute-flow', 2),
        ask('poly-remainder-k', 2),
        ask('poly-factor-flow', 2),
        ask('poly-factor-tree', 2),
        ask('poly-is-factor', 2),
        ask('poly-find-k', 2),
        ask('poly-candidates', 2),
        ask('poly-trial-flow', 2),
        ask('poly-factorise-tiles', 2),
        ask('poly-compare-tree', 2),
        ask('poly-full-flow', 2),
        ask('poly-solve-tiles', 2),
        ask('poly-count-roots', 2),
        ask('poly-root-slider', 2),
      ],
    },
  ],
};
