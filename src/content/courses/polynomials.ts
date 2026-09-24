/**
 * Polynomials & the Factor Theorem.
 *
 * Starts at degree 3, where Quadratics leaves off: what a polynomial is and
 * what its parts are called; adding, subtracting and multiplying them;
 * evaluating one; dividing by a linear factor. Then the two theorems division
 * leads to — the remainder on dividing by (x - a) is p(a), and (x - a) is a
 * factor exactly when p(a) = 0 — and what they are for: finding a factor by
 * trial, factorising a cubic fully, and solving it. Then the graph: where a
 * factorised curve meets the axis, whether it crosses or touches, where its
 * arms go, its y-intercept and sign, and back from a sketch to a formula.
 * Then roots to coefficients: the sums and products of the roots, a cubic
 * built from them, a missing root, and symmetric functions of the roots.
 * Then quartics: dividing by a quadratic, two factors at once, repeated
 * factors, quartics in x², and solving a quartic by dividing twice. Then
 * inequalities: the sign diagram, cubic sets on a number line, the hole or
 * lone point a squared factor leaves, rearranging and factorising first, and
 * reading a set back off a sketch or a shaded line. Then modelling: the
 * open box folded from a sheet as a cubic, its values and the largest in a
 * table, the cuts that give a stated volume, a cubic fitted through its roots
 * and a point, and what a model's roots, values and signs say.
 *
 * Each level closes with a level check: fifteen questions, no teaching
 * slides, one attempt each.
 */
import type { Block, Course, SlideRef } from '../types';
import { plotSvg } from '../figures';

const teach = (...body: Block[]): SlideRef => ({ type: 'literal', slide: { kind: 'teach', body } });

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

/**
 * A sketch of y = f(x) on squared paper with the roots ringed, for a teach
 * slide. `f` is already scaled to fit three squares up and down; the grid
 * clips the arms at its edge.
 */
const graph = (f: (x: number) => number, roots: number[], label: string): Block => ({
  kind: 'diagram',
  svg: plotSvg({
    xMin: -5,
    xMax: 5,
    yMin: -3,
    yMax: 3,
    height: 178,
    grid: true,
    curves: [{ f: (x) => Math.max(-9, Math.min(9, f(x))) }],
    marks: roots.map((x) => ({ x, y: 0 })),
    label,
  }),
});

/**
 * The volume of a box against its cut, for a teach slide: from 0 to where the
 * base runs out, with head-room over the top of the hill.
 */
const volume = (f: (x: number) => number, end: number, top: number, label: string): Block => ({
  kind: 'diagram',
  svg: plotSvg({ xMin: 0, xMax: end, yMin: -top * 0.08, yMax: top * 1.2, height: 160, curves: [{ f }], verticals: [{ x: 0, dashed: false }], label }),
});

/** The 20 by 16 sheet with a square dashed in at each corner, for the first box. */
const sheet: Block = {
  kind: 'diagram',
  svg: [
    '<svg viewBox="0 0 240 200" width="100%" role="img" aria-label="A 20 by 16 sheet of card with a square of side x marked at each corner">',
    '<rect x="20" y="24" width="200" height="160" fill="none" stroke="currentColor" stroke-width="1.5" />',
    ...[
      [20, 24],
      [190, 24],
      [20, 154],
      [190, 154],
    ].map(([x, y]) => `<rect x="${x}" y="${y}" width="30" height="30" fill="currentColor" fill-opacity="0.12" stroke="currentColor" stroke-dasharray="4 3" />`),
    '<path d="M 50 54 H 190 V 154 H 50 Z" fill="none" stroke="currentColor" stroke-dasharray="2 3" opacity="0.6" />',
    '<text x="120" y="16" text-anchor="middle" font-size="13" fill="currentColor">20 cm</text>',
    '<text x="12" y="108" text-anchor="middle" font-size="13" fill="currentColor" transform="rotate(-90 12 108)">16 cm</text>',
    '<text x="35" y="44" text-anchor="middle" font-size="13" font-style="italic" fill="currentColor">x</text>',
    '<text x="120" y="108" text-anchor="middle" font-size="12" fill="currentColor">base</text>',
    '</svg>',
  ].join(''),
};

export const polynomials: Course = {
  id: 'polynomials',
  category: 'algebra-fundamentals',
  position: 40,
  // Roots and Coefficients is shown in Roots of Polynomials; see placement.ts.
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
    {
      id: 'pl-l3',
      title: 'Polynomial Graphs',
      lessons: [
        {
          id: 'pl-l3-roots',
          title: 'Roots from the Factors',
          slides: [
            teach(
              prose(
                'A curve $y = p(x)$ meets the $x$-axis where $y = 0$. Written as factors, that is easy to read: a product is $0$ exactly when one of its factors is.',
              ),
              working('&y = (x - 1)(x + 2)(x - 3)', '&x = 1, \\; -2 \\text{ or } 3'),
              prose('Each sign flips: $(x + 2)$ is $0$ at $x = -2$. So this curve crosses the $x$-axis three times, at $-2$, $1$ and $3$.'),
            ),
            ask('poly-graph-roots-tiles'),
            ask('poly-root-flow'),
            ask('poly-graph-root-slider'),
            teach(
              prose('A bracket can be written other ways round. Its root is still the value that makes it $0$:'),
              working('(3 - x) &= 0 \\;\\Rightarrow\\; x = 3', '(2x + 4) &= 0 \\;\\Rightarrow\\; x = -2'),
              prose(
                'A number in front, like the $2$ in $2(x - 1)(x + 3)(x - 4)$, is never $0$, so it adds no point. A squared bracket, like $(x - 1)^{2}$, still gives just one.',
              ),
            ),
            ask('poly-root-flow', 2),
            ask('poly-graph-roots-tiles', 2),
            ask('poly-graph-root-slider', 2),
            teach(
              prose(
                'Going the other way, a curve that crosses at $x = -3$, $1$ and $2$ has the factors $(x + 3)(x - 1)(x - 2)$: read each crossing, then flip its sign into the bracket.',
              ),
              working('&y = (x + 3)(x - 1)(x - 2)', '&y = -(x + 3)(x - 1)(x - 2)'),
              prose(
                'Both of these cross at the same three points. The minus sign turns the curve upside down: the first rises to the right, the second falls. So check the arms as well as the crossings.',
              ),
            ),
            ask('poly-graph-form'),
            ask('poly-graph-form', 2),
          ],
          skillCheck: [ask('poly-graph-roots-tiles', 2), ask('poly-root-flow', 2), ask('poly-graph-form', 2)],
        },
        {
          id: 'pl-l3-ends',
          title: 'End Behaviour',
          slides: [
            teach(
              prose(
                'Far from the origin, the leading term swamps the rest. So where the arms of $y = p(x)$ go depends only on the degree and the sign of the leading coefficient.',
              ),
              maths('y = x^{3} \\qquad y = x^{4}'),
              prose(
                'The cubic goes down on the left and up on the right; the quartic goes up on both sides. An odd degree sends the arms opposite ways and an even degree sends them the same way. A negative leading coefficient turns either picture upside down.',
              ),
            ),
            ask('poly-ends-flow'),
            ask('poly-ends-tiles'),
            ask('poly-ends-graph'),
            teach(
              prose(
                'For a factorised polynomial, the leading term comes from the $x$ in every bracket, times the number in front. The powers add to give the degree.',
              ),
              working('&-2(x - 1)(3 - x)(x + 4)', '&(-2)(1)(-1)(1) = 2'),
              prose('That is degree $3$. Watch for $(3 - x)$, which brings a $-1$, and for $(2x + 4)$, which brings a $2$. Here the leading coefficient is $2$: positive, despite the minus sign in front.'),
            ),
            ask('poly-lead-coefficient'),
            ask('poly-ends-flow', 2),
            ask('poly-ends-tiles', 2),
            teach(
              prose(
                'A sketch can be read backwards. Arms going opposite ways mean an odd degree, the same way an even one; the right arm going up means a positive leading coefficient.',
              ),
              prose(
                'Counting crossings is not enough to find the degree: a curve that only touches the axis at a squared root meets it once for two factors.',
              ),
            ),
            ask('poly-ends-graph', 2),
            ask('poly-lead-coefficient+choice', 2),
          ],
          skillCheck: [ask('poly-ends-flow', 2), ask('poly-lead-coefficient', 2), ask('poly-ends-graph', 2)],
        },
        {
          id: 'pl-l3-repeated',
          title: 'Repeated Roots',
          slides: [
            teach(
              prose('A squared bracket changes what the curve does at its root. In'),
              maths('y = (x - 2)^{2}(x + 1)'),
              prose(
                'the curve crosses at $x = -1$ but only touches at $x = 2$. $(x - 2)^{2}$ is never negative, so the curve has the same sign on both sides of $2$: it comes down to the axis and turns back.',
              ),
            ),
            ask('poly-touch-cross'),
            ask('poly-repeat-tree'),
            ask('poly-touch-graph'),
            teach(
              prose(
                'The rule is the power of the bracket. An odd power changes sign, so the curve crosses; an even power does not, so it touches.',
              ),
              working('(x - 1)&\\!: \\;\\; \\text{crosses}', '(x - 1)^{2}&\\!: \\;\\; \\text{touches}', '(x - 1)^{3}&\\!: \\;\\; \\text{crosses flat}'),
              prose('A cube crosses, but it flattens out as it goes through its root, like $y = x^{3}$ at the origin.'),
            ),
            ask('poly-touch-cross', 2),
            ask('poly-repeat-tree', 2),
            ask('poly-sketch-form-tiles'),
            teach(
              prose(
                'To write the equation of a sketch: square the bracket of each root where it touches, keep single brackets where it crosses, and put a minus sign in front if it falls to the right.',
              ),
              prose('A cubic that touches at $3$, crosses at $-1$ and falls to the right is'),
              maths('y = -(x - 3)^{2}(x + 1)'),
            ),
            ask('poly-touch-graph', 2),
            ask('poly-sketch-form-tiles'),
          ],
          skillCheck: [ask('poly-touch-cross', 2), ask('poly-repeat-tree', 2), ask('poly-touch-graph', 2)],
        },
        {
          id: 'pl-l3-intercept',
          title: 'The y-Intercept and the Sign',
          slides: [
            teach(
              prose(
                'The curve crosses the $y$-axis where $x = 0$. Put $0$ into every bracket and each leaves just its number:',
              ),
              maths('y = 2(x - 1)(x + 3)(x - 4)'),
              prose('At $x = 0$:'),
              maths('y = 2(-1)(3)(-4) = 24'),
              prose('That is $p(0)$, which is the constant term of the expanded polynomial, found without expanding anything.'),
            ),
            ask('poly-intercept'),
            ask('poly-intercept-slider'),
            ask('poly-intercept-slider', 2),
            teach(
              prose(
                'Between two neighbouring roots the curve cannot change sides of the axis, since it would have to cross it at a root to do so. So one test point settles the sign of a whole stretch.',
              ),
              prose('For $y = (x + 2)(x - 1)(x - 4)$, test $x = 2$ between the roots $1$ and $4$:'),
              maths('y = (4)(1)(-2) = -8'),
              prose('Negative, so the curve is below the axis all the way from $x = 1$ to $x = 4$.'),
            ),
            ask('poly-test-point-steps'),
            ask('poly-sign-flow'),
            ask('poly-intercept+choice', 2),
            teach(
              prose(
                'Take every piece into account. A number in front multiplies the sign, a squared bracket is never negative, and a bracket written $(r - x)$ is negative for $x$ larger than $r$.',
              ),
              prose('For $y = -(x - 3)^{2}(x + 1)$ at $x = 1$:'),
              maths('y = -(-2)^{2}(2) = -8'),
            ),
            ask('poly-sign-flow', 2),
            ask('poly-test-point-steps', 2),
          ],
          skillCheck: [ask('poly-intercept', 2), ask('poly-sign-flow', 2), ask('poly-test-point-steps', 2)],
        },
        {
          id: 'pl-l3-formula',
          title: 'From Sketch to Formula',
          slides: [
            teach(
              prose(
                'The roots give the brackets, but not the number in front: $a(x + 1)(x - 2)(x - 3)$ crosses at the same three points for every $a$. One more point on the curve fixes it.',
              ),
              prose('For $y = a(x + 1)(x - 2)(x - 3)$ with a $y$-intercept of $12$, put $x = 0$ and $y = 12$:'),
              working('12 &= a(1)(-2)(-3)', '12 &= 6a', 'a &= 2'),
            ),
            ask('poly-find-lead'),
            ask('poly-describe-graph'),
            ask('poly-sketch-form-tiles', 2),
            teach(
              prose('To write the formula out in full, expand two brackets, then the third, then multiply by $a$:'),
              working(
                '&2(x + 1)(x - 2)(x - 3)',
                '=\\;&2(x^{2} - x - 2)(x - 3)',
                '=\\;&2(x^{3} - 4x^{2} + x + 6)',
                '=\\;&2x^{3} - 8x^{2} + 2x + 12',
              ),
              prose('The constant term is $12$, the $y$-intercept, which is a quick check on the working.'),
            ),
            ask('poly-sketch-expand-steps'),
            ask('poly-describe-graph', 2),
            ask('poly-sketch-form-tiles', 2),
            teach(
              prose(
                'A touch in the sketch is a squared bracket, and the point that fixes $a$ need not be on the $y$-axis. Through $(1, 8)$, with the curve touching at $3$ and crossing at $-1$:',
              ),
              prose('So $y = a(x - 3)^{2}(x + 1)$, and at $x = 1$:'),
              working('8 &= a(-2)^{2}(2)', '8 &= 8a', 'a &= 1'),
            ),
            ask('poly-sketch-expand-steps', 2),
            ask('poly-find-lead', 2),
          ],
          skillCheck: [ask('poly-find-lead', 2), ask('poly-sketch-form-tiles', 2), ask('poly-sketch-expand-steps', 2)],
        },
      ],
      levelCheck: [
        ask('poly-graph-roots-tiles', 2),
        ask('poly-graph-form', 2),
        ask('poly-root-flow', 2),
        ask('poly-ends-flow', 2),
        ask('poly-lead-coefficient', 2),
        ask('poly-ends-graph', 2),
        ask('poly-touch-cross', 2),
        ask('poly-repeat-tree', 2),
        ask('poly-touch-graph', 2),
        ask('poly-intercept', 2),
        ask('poly-sign-flow', 2),
        ask('poly-test-point-steps', 2),
        ask('poly-find-lead', 2),
        ask('poly-sketch-form-tiles', 2),
        ask('poly-describe-graph', 2),
      ],
    },
    {
      id: 'pl-l4',
      title: 'Roots and Coefficients',
      lessons: [
        {
          id: 'pl-l4-two',
          title: 'Sum and Product of Two Roots',
          slides: [
            teach(
              prose('Polynomials & the Factor Theorem went from a polynomial to its roots. This level goes the other way. Multiply out a quadratic with roots $\\alpha$ and $\\beta$:'),
              working('&(x - \\alpha)(x - \\beta)', '=\\;&x^{2} - (\\alpha + \\beta)x + \\alpha\\beta'),
              prose(
                'So in $x^{2} + bx + c$, the $x$ coefficient is minus the sum of the roots and the constant is their product. $x^{2} - 5x + 6$ has roots adding to $5$ and multiplying to $6$: they are $2$ and $3$.',
              ),
            ),
            ask('poly-roots-sum-product'),
            ask('poly-root-signs'),
            ask('poly-quad-coeffs-tree'),
            teach(
              prose('With a leading coefficient $a$, the quadratic is $a(x - \\alpha)(x - \\beta)$, so divide through by $a$ first:'),
              working('\\alpha + \\beta &= -\\frac{b}{a}', '\\alpha\\beta &= \\frac{c}{a}'),
              prose(
                'For $2x^{2} + 6x - 8 = 0$ the roots add to $-\\frac{6}{2} = -3$ and multiply to $\\frac{-8}{2} = -4$. The minus belongs to the sum only; the product keeps the sign of $\\frac{c}{a}$.',
              ),
            ),
            ask('poly-roots-sum-product+choice', 2),
            ask('poly-quad-coeffs-tree', 2),
            ask('poly-root-signs', 2),
            teach(
              prose('Read backwards, a sum and a product give the quadratic: minus the sum in front of $x$, the product at the end.'),
              maths('x^{2} - (\\text{sum})x + (\\text{product}) = 0'),
              prose('Roots adding to $1$ and multiplying to $-6$ give $x^{2} - x - 6 = 0$, whose roots are $3$ and $-2$. With a leading coefficient, multiply every term by it.'),
            ),
            ask('poly-sum-product-tiles'),
            ask('poly-sum-product-tiles', 2),
          ],
          skillCheck: [ask('poly-roots-sum-product', 2), ask('poly-sum-product-tiles', 2), ask('poly-quad-coeffs-tree', 2)],
        },
        {
          id: 'pl-l4-three',
          title: 'Three Roots',
          slides: [
            teach(
              prose('A cubic with roots $\\alpha$, $\\beta$ and $\\gamma$ multiplies out the same way, with three sums instead of two:'),
              working(
                '&(x - \\alpha)(x - \\beta)(x - \\gamma)',
                '=\\;&x^{3} - (\\alpha + \\beta + \\gamma)x^{2}',
                '&+ (\\alpha\\beta + \\beta\\gamma + \\gamma\\alpha)x',
                '&- \\alpha\\beta\\gamma',
              ),
              prose(
                'These are written $\\Sigma\\alpha$, the sum of the roots, $\\Sigma\\alpha\\beta$, the sum of their products in pairs, and $\\alpha\\beta\\gamma$, the product of all three.',
              ),
            ),
            ask('poly-cubic-sums-tree'),
            ask('poly-cubic-vieta'),
            ask('poly-cubic-identity-tiles'),
            teach(
              prose('For $ax^{3} + bx^{2} + cx + d = 0$, divide by $a$ first. The signs alternate, minus, plus, minus:'),
              working('\\Sigma\\alpha &= -\\frac{b}{a}', '\\Sigma\\alpha\\beta &= \\frac{c}{a}', '\\alpha\\beta\\gamma &= -\\frac{d}{a}'),
              prose('For $2x^{3} - 4x^{2} - 22x + 24 = 0$:'),
              working('\\Sigma\\alpha &= -\\tfrac{-4}{2} = 2', '\\Sigma\\alpha\\beta &= \\tfrac{-22}{2} = -11', '\\alpha\\beta\\gamma &= -\\tfrac{24}{2} = -12'),
            ),
            ask('poly-vieta-flow'),
            ask('poly-cubic-vieta+choice', 2),
            ask('poly-cubic-identity-tiles', 2),
            teach(
              prose(
                'The slip to watch for is the sign of the product. For a quadratic it is $+\\frac{c}{a}$, but for a cubic it is $-\\frac{d}{a}$: the roots of that cubic are $1$, $-3$ and $4$, and $1 \\times (-3) \\times 4 = -12$, not $12$.',
              ),
              prose('Each extra root flips it again, so the constant term of a monic cubic is minus the product of its roots.'),
            ),
            ask('poly-vieta-flow', 2),
            ask('poly-cubic-sums-tree', 2),
          ],
          skillCheck: [ask('poly-cubic-vieta', 2), ask('poly-vieta-flow', 2), ask('poly-cubic-sums-tree', 2)],
        },
        {
          id: 'pl-l4-build',
          title: 'A Cubic from its Roots',
          slides: [
            teach(
              prose('To build a cubic from its roots, work out the three sums and put them in with the signs alternating:'),
              working('&x^{3} - (\\Sigma\\alpha)x^{2}', '&+ (\\Sigma\\alpha\\beta)x - \\alpha\\beta\\gamma'),
              prose('For roots $-1$, $2$ and $3$: $\\Sigma\\alpha = 4$, $\\Sigma\\alpha\\beta = -2 + 6 - 3 = 1$ and $\\alpha\\beta\\gamma = -6$, so the cubic is'),
              maths('x^{3} - 4x^{2} + x + 6'),
            ),
            ask('poly-roots-to-cubic-tiles'),
            ask('poly-cubic-coeffs-tree'),
            ask('poly-sums-to-cubic'),
            teach(
              prose('A cubic with a leading coefficient is the monic one times that number: with leading coefficient $2$ and the same roots,'),
              maths('2x^{3} - 8x^{2} + 2x + 12'),
              prose(
                'The roots themselves are not needed, only their sums. If $\\Sigma\\alpha = 3$, $\\Sigma\\alpha\\beta = -1$ and $\\alpha\\beta\\gamma = -3$, the monic cubic is $x^{3} - 3x^{2} - x + 3$.',
              ),
            ),
            ask('poly-roots-to-cubic-tiles+choice', 2),
            ask('poly-cubic-coeffs-tree', 2),
            ask('poly-sums-to-cubic', 2),
            teach(
              prose('That is how to find a cubic whose roots are related to another\'s, without ever solving it. For roots $2\\alpha$, $2\\beta$ and $2\\gamma$, each sum picks up a $2$ per root in it:'),
              working(
                '\\Sigma 2\\alpha &= 2\\Sigma\\alpha',
                '\\Sigma (2\\alpha)(2\\beta) &= 4\\Sigma\\alpha\\beta',
                '(2\\alpha)(2\\beta)(2\\gamma) &= 8\\alpha\\beta\\gamma',
              ),
              prose(
                'For roots $\\alpha + 1$, $\\beta + 1$ and $\\gamma + 1$, multiplying out gives $\\Sigma\\alpha + 3$, then $\\Sigma\\alpha\\beta + 2\\Sigma\\alpha + 3$, then $\\alpha\\beta\\gamma + \\Sigma\\alpha\\beta + \\Sigma\\alpha + 1$.',
              ),
            ),
            ask('poly-new-roots-steps'),
            ask('poly-new-roots-steps+choice', 2),
          ],
          skillCheck: [ask('poly-roots-to-cubic-tiles', 2), ask('poly-cubic-coeffs-tree', 2), ask('poly-new-roots-steps', 2)],
        },
        {
          id: 'pl-l4-missing',
          title: 'A Missing Root',
          slides: [
            teach(
              prose('Knowing two roots of a cubic, the sum of the roots gives the third. $x^{3} - 2x^{2} - 5x + 6 = 0$ has roots $1$ and $3$, and'),
              maths('1 + 3 + \\gamma = -\\tfrac{-2}{1} = 2'),
              prose('so $\\gamma = -2$. No division, and no trial.'),
            ),
            ask('poly-third-root'),
            ask('poly-missing-coeff-steps'),
            ask('poly-which-identity-flow'),
            teach(
              prose(
                'When a coefficient is unknown, use an identity that does not need it. $x^{3} + kx^{2} - 5x + 6 = 0$ has roots $1$ and $3$; the sum needs $k$, but the product does not:',
              ),
              working('1 \\times 3 \\times \\gamma &= -6', '\\gamma &= -2'),
              prose('Then the sum gives $k$: $1 + 3 - 2 = -k$, so $k = -2$.'),
            ),
            ask('poly-which-identity-flow', 2),
            ask('poly-third-root', 2),
            ask('poly-missing-coeff-steps', 2),
            teach(
              prose('Roots in arithmetic progression are written $\\alpha - d$, $\\alpha$ and $\\alpha + d$, so the $d$s cancel in the sum:'),
              maths('(\\alpha - d) + \\alpha + (\\alpha + d) = 3\\alpha'),
              prose(
                'For $x^{3} - 6x^{2} + 3x + 10 = 0$: $3\\alpha = 6$, so $\\alpha = 2$. The product is $\\alpha(\\alpha^{2} - d^{2}) = -10$, so $4 - d^{2} = -5$ and $d = 3$. The roots are $-1$, $2$ and $5$.',
              ),
            ),
            ask('poly-ap-roots-tree'),
            ask('poly-ap-roots-tree', 2),
          ],
          skillCheck: [ask('poly-third-root', 2), ask('poly-which-identity-flow', 2), ask('poly-ap-roots-tree', 2)],
        },
        {
          id: 'pl-l4-symmetric',
          title: 'Symmetric Functions',
          slides: [
            teach(
              prose('Some expressions in the roots can be found from the coefficients without knowing the roots at all. Squaring the sum gives each square once and the product twice:'),
              maths('(\\alpha + \\beta)^{2} = \\alpha^{2} + \\beta^{2} + 2\\alpha\\beta'),
              prose('so $\\alpha^{2} + \\beta^{2} = (\\alpha + \\beta)^{2} - 2\\alpha\\beta$. For $x^{2} - 5x + 3 = 0$, whose roots are not whole, that is still $5^{2} - 2 \\times 3 = 19$.'),
            ),
            ask('poly-sum-squares'),
            ask('poly-square-identity-tiles'),
            ask('poly-reciprocal-sum'),
            teach(
              prose('Reciprocals go over a common denominator, the product of the roots:'),
              working('\\frac{1}{\\alpha} + \\frac{1}{\\beta} &= \\frac{\\alpha + \\beta}{\\alpha\\beta}', '\\Sigma\\frac{1}{\\alpha} &= \\frac{\\Sigma\\alpha\\beta}{\\alpha\\beta\\gamma}'),
              prose('For $x^{3} - 4x^{2} + x + 6 = 0$, $\\Sigma\\alpha\\beta = 1$ and $\\alpha\\beta\\gamma = -6$, so $\\Sigma\\frac{1}{\\alpha} = -\\frac{1}{6}$.'),
            ),
            ask('poly-recip-divide-steps'),
            ask('poly-reciprocal-sum+choice', 2),
            ask('poly-symmetric-tree'),
            teach(
              prose('For three roots, squaring the sum gives every square once and every pair product twice, so'),
              maths('\\Sigma\\alpha^{2} = (\\Sigma\\alpha)^{2} - 2\\Sigma\\alpha\\beta'),
              prose('For $x^{3} - 4x^{2} + x + 6$ that is $16 - 2 = 14$, and the roots $-1$, $2$ and $3$ agree: $1 + 4 + 9 = 14$.'),
            ),
            ask('poly-sum-squares+choice', 2),
            ask('poly-symmetric-tree', 2),
          ],
          skillCheck: [ask('poly-sum-squares', 2), ask('poly-reciprocal-sum', 2), ask('poly-symmetric-tree', 2)],
        },
      ],
      levelCheck: [
        ask('poly-roots-sum-product', 2),
        ask('poly-cubic-sums-tree', 2),
        ask('poly-root-signs', 2),
        ask('poly-sum-product-tiles', 2),
        ask('poly-vieta-flow', 2),
        ask('poly-cubic-vieta', 2),
        ask('poly-roots-to-cubic-tiles', 2),
        ask('poly-new-roots-steps', 2),
        ask('poly-sums-to-cubic', 2),
        ask('poly-third-root', 2),
        ask('poly-ap-roots-tree', 2),
        ask('poly-which-identity-flow', 2),
        ask('poly-missing-coeff-steps', 2),
        ask('poly-sum-squares', 2),
        ask('poly-reciprocal-sum', 2),
      ],
    },
    {
      id: 'pl-l5',
      title: 'Quartics and Repeated Factors',
      lessons: [
        {
          id: 'pl-l5-divide',
          title: 'Dividing by a Quadratic',
          slides: [
            teach(
              prose('Level 2 divided by $(x - a)$ one term at a time. Dividing by a quadratic works the same way: take away the multiple of the divisor that clears the first term, and repeat. Each step now changes the two terms after the first.'),
              working('&x^{3} - 7x^{2} + 5x + 15', '&\\quad - x(x^{2} - 3x - 3)', '=\\;&-4x^{2} + 8x + 15'),
              prose('Then take away $-4(x^{2} - 3x - 3)$ to clear the $-4x^{2}$, which leaves $-4x + 3$. That has no $x^{2}$ term, so it is the remainder.'),
            ),
            ask('poly-long-quad-steps'),
            ask('poly-quad-quotient-tiles'),
            ask('poly-quad-remainder'),
            teach(
              prose('A remainder always has a lower power than the divisor. Dividing by a quadratic it can keep an $x$ term, so it is written $rx + s$:'),
              working('&x^{3} - 7x^{2} + 5x + 15', '=\\;&(x^{2} - 3x - 3)(x - 4)', '&\\quad - 4x + 3'),
              prose('The same answer comes from comparing coefficients. Write the quotient with unknowns, $ax^{2} + bx + c$ for a quartic, and match the powers from the top down: $a$ from $x^{4}$, then $b$, then $c$. What is left over in the $x$ and constant terms is $r$ and $s$.'),
            ),
            ask('poly-quad-quotient-tree'),
            ask('poly-long-quad-steps', 2),
            ask('poly-quad-remainder+choice', 2),
            teach(
              prose('A quartic divided by a quadratic leaves a quadratic quotient, and the remainder is still no more than $rx + s$. When the remainder is $0$, the divisor is a factor.'),
            ),
            ask('poly-quad-quotient-tree', 2),
            ask('poly-quad-quotient-tiles', 2),
          ],
          skillCheck: [ask('poly-long-quad-steps', 2), ask('poly-quad-quotient-tiles', 2), ask('poly-quad-remainder', 2)],
        },
        {
          id: 'pl-l5-pairs',
          title: 'Two Factors at Once',
          slides: [
            teach(
              prose('If $p(a) = 0$ and $p(b) = 0$, the factor theorem makes both $(x - a)$ and $(x - b)$ factors, so their product is a factor too.'),
              prose('$p(-3) = 0$ and $p(-2) = 0$, so $(x + 3)(x + 2)$ divides $p(x)$:'),
              maths('(x + 3)(x + 2) = x^{2} + 5x + 6'),
              prose('Dividing a quartic by that quadratic leaves another quadratic, which may factorise again.'),
            ),
            ask('poly-pair-flow'),
            ask('poly-two-roots-tree'),
            ask('poly-other-factor-tiles'),
            teach(
              prose('The other factor can be found without dividing, by comparing coefficients.'),
              prose('For $p(x) = x^{4} + 2x^{3} - 11x^{2} - 28x - 12$, with the factor $x^{2} + 5x + 6$, write $p(x)$ as'),
              maths('(x^{2} + 5x + 6)(x^{2} + ex + f)'),
              prose('The $x^{3}$ terms give $5 + e = 2$, so $e = -3$. The constants give $6f = -12$, so $f = -2$.'),
            ),
            ask('poly-two-roots-tree', 2),
            ask('poly-other-factor-tiles', 2),
            ask('poly-pair-flow', 2),
            teach(
              prose('With unknown coefficients, each known factor gives one equation, so two factors are enough for two unknowns. If $(x - 1)$ and $(x + 2)$ are factors of $f(x) = x^{4} + px^{3} - 3x^{2} + qx + 6$:'),
              working('f(1) = 0: &\\quad p + q = -4', 'f(-2) = 0: &\\quad 4p + q = 5'),
              prose('Taking one from the other, $3p = 9$, so $p = 3$ and $q = -7$.'),
            ),
            ask('poly-pair-unknown'),
            ask('poly-pair-unknown+choice', 2),
          ],
          skillCheck: [ask('poly-pair-flow', 2), ask('poly-other-factor-tiles', 2), ask('poly-pair-unknown', 2)],
        },
        {
          id: 'pl-l5-repeated',
          title: 'Repeated Factors',
          slides: [
            teach(
              prose('Level 3 showed a curve touching the axis at a repeated root. To test for one, divide by $(x - a)$, then check whether the quotient is still zero at $a$.'),
              prose('$p(x) = x^{3} + 5x^{2} + 3x - 9$ has $p(-3) = 0$. Dividing by $(x + 3)$ leaves $q(x) = x^{2} + 2x - 3$, and $q(-3) = 0$ too, so $(x + 3)^{2}$ is a factor.'),
              prose('The number of times $(x - a)$ divides $p(x)$ is how often the root $a$ is repeated.'),
            ),
            ask('poly-twice-tree'),
            ask('poly-repeat-flow'),
            ask('poly-multiplicity'),
            teach(
              prose('Synthetic division makes the second test quick: run the quotient row through again with the same $a$.'),
              maths('\\begin{array}{r|rrrr} -3 & 1 & 5 & 3 & -9 \\\\ & & -3 & -6 & 9 \\\\ \\hline & 1 & 2 & -3 & 0 \\end{array}'),
              prose('Again with $-3$: $1$, then $2 - 3 = -1$, then $-3 + 3 = 0$. A second zero, so $(x + 3)$ is repeated. Gathering the brackets, $p(x) = (x + 3)^{2}(x - 1)$.'),
            ),
            ask('poly-repeat-factor-steps'),
            ask('poly-twice-tree', 2),
            ask('poly-multiplicity+choice', 2),
            teach(
              prose('In a quartic a root can repeat three times: the cubic left after one division is zero at $a$, and so is the quadratic left after the next. Keep dividing until the value at $a$ is not $0$.'),
            ),
            ask('poly-repeat-flow', 2),
            ask('poly-repeat-factor-steps', 2),
          ],
          skillCheck: [ask('poly-twice-tree', 2), ask('poly-repeat-flow', 2), ask('poly-multiplicity', 2)],
        },
        {
          id: 'pl-l5-even',
          title: 'Quartics in x²',
          slides: [
            teach(
              prose('Quadratics in Disguise solved $x^{4} - 5x^{2} + 4 = 0$ as a quadratic in $u = x^{2}$. The same substitution factorises it:'),
              working('&x^{4} - 5x^{2} + 4', '=\\;&u^{2} - 5u + 4', '=\\;&(u - 1)(u - 4)', '=\\;&(x^{2} - 1)(x^{2} - 4)'),
              prose('Each positive $u$ gives two values of $x$, $\\pm\\sqrt{u}$. A negative $u$ gives none, since a square is never negative.'),
            ),
            ask('poly-biquad-tiles'),
            ask('poly-in-u-tree'),
            ask('poly-biquad-count'),
            teach(
              prose('To factorise fully, look at each bracket. $x^{2} - m^{2}$ is a difference of two squares and splits again. $x^{2} + m$, or $x^{2} - n$ with $n$ not a square, does not split with whole numbers.'),
              working('&(x^{2} - 1)(x^{2} - 4)', '=\\;&(x - 1)(x + 1)', '&\\quad \\times (x - 2)(x + 2)'),
            ),
            ask('poly-biquad-flow'),
            ask('poly-biquad-tiles', 2),
            ask('poly-in-u-tree', 2),
            teach(
              prose('Counting real solutions needs only the values of $u$: two for each positive $u$, one for $u = 0$ and none for a negative $u$. If the quadratic in $u$ has no real roots at all, neither has the quartic.'),
            ),
            ask('poly-biquad-count', 2),
            ask('poly-biquad-flow', 2),
          ],
          skillCheck: [ask('poly-biquad-tiles', 2), ask('poly-in-u-tree', 2), ask('poly-biquad-count', 2)],
        },
        {
          id: 'pl-l5-solve',
          title: 'Solving a Quartic',
          slides: [
            teach(
              prose('A quartic with whole-number roots falls to the level 2 method used twice. Find a root by trying divisors of the constant, divide, then do the same to the cubic that is left.'),
              prose('$p(x) = x^{4} - x^{3} - 11x^{2} + 9x + 18$ has $p(3) = 0$, and the cubic left is zero at $x = 2$:'),
              working('&(x - 3)(x^{3} + 2x^{2} - 5x - 6)', '=\\;&(x - 3)(x - 2)(x^{2} + 4x + 3)'),
              prose('The quadratic factorises too, $x^{2} + 4x + 3 = (x + 1)(x + 3)$, so the solutions are $x = -3,\\ -1,\\ 2,\\ 3$.'),
            ),
            ask('poly-quartic-flow'),
            ask('poly-quartic-divide-steps'),
            ask('poly-quartic-tiles'),
            teach(
              prose('The division is the level 2 layout with one more column. A missing power gets a $0$, so every column lines up:'),
              working('&x^{4} - 10x^{2} + 9', '=\\;&x^{4} + 0x^{3} - 10x^{2} + 0x + 9'),
            ),
            ask('poly-quartic-root'),
            ask('poly-quartic-divide-steps', 2),
            ask('poly-quartic-flow', 2),
            teach(
              prose('A leading coefficient stays in front: $-x^{4} + \\dots$ factorises as $-(x - a)(x - b)(x - c)(x - d)$. A root found twice is a repeated factor, written with a square, and it is one solution, not two.'),
            ),
            ask('poly-quartic-root+choice', 2),
            ask('poly-quartic-tiles', 2),
          ],
          skillCheck: [ask('poly-quartic-flow', 2), ask('poly-quartic-tiles', 2), ask('poly-quartic-root', 2)],
        },
      ],
      levelCheck: [
        ask('poly-long-quad-steps', 2),
        ask('poly-quad-quotient-tree', 2),
        ask('poly-quad-remainder', 2),
        ask('poly-pair-flow', 2),
        ask('poly-two-roots-tree', 2),
        ask('poly-pair-unknown', 2),
        ask('poly-twice-tree', 2),
        ask('poly-repeat-flow', 2),
        ask('poly-multiplicity', 2),
        ask('poly-biquad-tiles', 2),
        ask('poly-in-u-tree', 2),
        ask('poly-biquad-count', 2),
        ask('poly-quartic-flow', 2),
        ask('poly-quartic-tiles', 2),
        ask('poly-quartic-root', 2),
      ],
    },
    {
      id: 'pl-l6',
      title: 'Polynomial Inequalities',
      lessons: [
        {
          id: 'pl-l6-diagram',
          title: 'The Sign Diagram',
          slides: [
            teach(
              prose('$(x + 2)(x - 1)(x - 3) > 0$ asks where a product is positive. A product can only change sign where one of its factors is zero, so the places to look are $x = -2$, $1$ and $3$: the critical values.'),
              prose('They cut the number line into four stretches. Inside a stretch no factor is zero, so every factor keeps its sign, and one test value tells you the sign all along it. At $x = 0$:'),
              working('p(0) &= (2)(-1)(-3)', '&= 6'),
              prose('Positive, so $p(x) > 0$ on the whole of $-2 < x < 1$.'),
            ),
            ask('poly-critical-tiles'),
            ask('poly-stretch-sign-flow'),
            ask('poly-sign-table'),
            teach(
              prose('A sign diagram records every stretch at once. For large $x$ every bracket is positive, so the far right has the sign of the leading coefficient, here $+$. Moving left, the sign changes at each critical value:'),
              maths('{-}\\quad{+}\\quad{-}\\quad{+}'),
              graph((x) => ((x + 2) * (x - 1) * (x - 3)) / 4, [-2, 1, 3], 'The cubic y = (x + 2)(x - 1)(x - 3), below the axis left of -2, above it from -2 to 1, below from 1 to 3 and above after 3'),
              prose('The sketch agrees: below, above, below, above.'),
            ),
            ask('poly-sign-pattern'),
            ask('poly-critical-tiles', 2),
            ask('poly-stretch-sign-flow', 2),
            teach(
              prose('A number in front, or a bracket written the other way round, can make the leading coefficient negative. $3 - x$ is $-(x - 3)$, so'),
              working('&(x + 2)(x - 1)(3 - x)', '=\\;&-(x + 2)(x - 1)(x - 3)'),
              prose('and every sign in its diagram is turned round: $+\\;-\\;+\\;-$. A positive number in front, such as $2$, changes no sign at all.'),
            ),
            ask('poly-sign-table', 2),
            ask('poly-sign-pattern', 2),
          ],
          skillCheck: [ask('poly-critical-tiles', 2), ask('poly-sign-table', 2), ask('poly-sign-pattern', 2)],
        },
        {
          id: 'pl-l6-cubic',
          title: 'Solving a Cubic Inequality',
          slides: [
            teach(
              prose('With the sign diagram done, the inequality picks the stretches. $(x + 2)(x - 1)(x - 3) > 0$ asks for positive, and the signs are $-\\;+\\;-\\;+$, so'),
              maths('-2 < x < 1 \\quad\\text{or}\\quad x > 3'),
              prose('On a number line, shade those two stretches. At the critical values $p(x) = 0$, which is not greater than $0$, so the dots there are hollow.'),
            ),
            ask('poly-cubic-line'),
            ask('poly-cubic-set-tiles'),
            ask('poly-ineq-flow'),
            teach(
              prose('Strict or not decides only the ends. $<$ and $>$ leave the critical values out: hollow dots. $\\le$ and $\\ge$ let $p(x) = 0$ in: filled dots.'),
              maths('(x + 2)(x - 1)(x - 3) \\le 0'),
              prose('has the negative stretches and the critical values themselves:'),
              maths('x \\le -2 \\quad\\text{or}\\quad 1 \\le x \\le 3'),
              prose('The largest whole number in that set is $3$; with $< 0$ instead it would be $2$. The set runs off to the left, so it has no smallest.'),
            ),
            ask('poly-ineq-integer'),
            ask('poly-cubic-line', 2),
            ask('poly-cubic-set-tiles', 2),
            teach(
              prose('A cubic with a negative leading coefficient is negative on the far right, so its signs start from the other end. For $-(x + 1)(x - 2)(x - 4) \\ge 0$ the signs are $+\\;-\\;+\\;-$, and'),
              maths('x \\le -1 \\quad\\text{or}\\quad 2 \\le x \\le 4'),
              prose('Its set runs off to the left instead, so it has a largest whole number, $4$, and no smallest.'),
            ),
            ask('poly-ineq-flow', 2),
            ask('poly-ineq-integer+choice', 2),
          ],
          skillCheck: [ask('poly-cubic-line', 2), ask('poly-cubic-set-tiles', 2), ask('poly-ineq-integer', 2)],
        },
        {
          id: 'pl-l6-repeated',
          title: 'Touching Roots',
          slides: [
            teach(
              prose('A squared factor such as $(x - 1)^{2}$ is never negative: it is $0$ at $x = 1$ and positive either side. So it never changes the sign of a product, and the curve touches the axis there instead of crossing.'),
              graph((x) => ((x - 1) ** 2 * (x + 2)) / 2, [-2, 1], 'The cubic y = (x - 1) squared times (x + 2), crossing at -2 and touching the axis at 1'),
              prose('$(x - 1)^{2}(x + 2)$ is negative left of $-2$ and positive on both sides of $1$. Only a factor to an odd power makes a sign change.'),
            ),
            ask('poly-sign-changes'),
            ask('poly-hole-flow'),
            ask('poly-touch-line'),
            teach(
              prose('A touching root leaves a hole or a lone point in a set. $(x - 1)^{2}(x + 2) > 0$ is positive for all $x > -2$ except at $x = 1$, where it is $0$:'),
              maths('x > -2 \\quad\\text{and}\\quad x \\ne 1'),
              prose('That is shading from $-2$ onwards with a hollow dot at $1$. With $\\ge 0$ the point is back in, and the set is simply $x \\ge -2$.'),
            ),
            ask('poly-touch-tiles'),
            ask('poly-sign-changes+choice', 2),
            ask('poly-hole-flow', 2),
            teach(
              prose('The other way round, $(x - 1)^{2}(x + 2) \\le 0$ wants negative or zero. Left of $-2$ it is negative, and at $x = 1$ it is zero, though positive either side:'),
              maths('x \\le -2 \\quad\\text{or}\\quad x = 1'),
              prose('A lone filled dot at $1$. With $< 0$ that point drops out, and only $x < -2$ is left.'),
            ),
            ask('poly-touch-line', 2),
            ask('poly-touch-tiles', 2),
          ],
          skillCheck: [ask('poly-touch-line', 2), ask('poly-hole-flow', 2), ask('poly-touch-tiles', 2)],
        },
        {
          id: 'pl-l6-rearrange',
          title: 'Rearranging First',
          slides: [
            teach(
              prose('A sign diagram needs $0$ on one side. Subtracting from both sides never turns an inequality round:'),
              working('x^{3} + 2x^{2} &> 5x + 6', 'x^{3} + 2x^{2} - 5x - 6 &> 0'),
              prose('Then factorise as level 2 did. Call the cubic $f(x)$: $f(2) = 8 + 8 - 10 - 6 = 0$, so $(x - 2)$ is a factor, and dividing leaves $x^{2} + 4x + 3 = (x + 1)(x + 3)$.'),
            ),
            ask('poly-one-side-steps'),
            ask('poly-rearrange-flow'),
            ask('poly-rearrange-line'),
            teach(
              prose('Now it is a factorised cubic against $0$:'),
              maths('(x + 3)(x + 1)(x - 2) > 0'),
              prose('with critical values $-3$, $-1$ and $2$, and the set $-3 < x < -1$ or $x > 2$. Never divide both sides by a bracket to simplify: its sign changes with $x$, so you cannot tell whether to turn the inequality round.'),
            ),
            ask('poly-flip-choice'),
            ask('poly-one-side-steps', 2),
            ask('poly-rearrange-line', 2),
            teach(
              prose('If the cubic leads with $-x^{3}$, take the minus out and multiply by $-1$, which turns the inequality round:'),
              working('-(x + 1)(x - 2)(x - 4) &\\ge 0', '(x + 1)(x - 2)(x - 4) &\\le 0'),
              prose('A bracket written $3 - x$ is $-(x - 3)$ and counts the same way. Two minuses make a plus, so with an even number of them nothing turns round.'),
            ),
            ask('poly-flip-choice', 2),
            ask('poly-rearrange-flow', 2),
          ],
          skillCheck: [ask('poly-one-side-steps', 2), ask('poly-rearrange-line', 2), ask('poly-flip-choice', 2)],
        },
        {
          id: 'pl-l6-reading',
          title: 'Reading and Counting',
          slides: [
            teach(
              prose('A sketch answers an inequality at a glance: $p(x) > 0$ is where the curve is above the $x$-axis, and $p(x) < 0$ where it is below.'),
              graph((x) => ((x + 3) * (x + 1) * (x - 1) * (x - 3)) / 6, [-3, -1, 1, 3], 'The quartic y = (x + 3)(x + 1)(x - 1)(x - 3), below the axis between -3 and -1 and between 1 and 3'),
              prose('This quartic is below the axis for $-3 < x < -1$ and for $1 < x < 3$, so that is where $p(x) < 0$. A shaded line reads back the same way: the dots are the roots, and which stretches are shaded gives the sign.'),
            ),
            ask('poly-read-graph'),
            ask('poly-read-line-tiles'),
            ask('poly-quartic-line'),
            teach(
              prose('A quartic has up to four critical values and five stretches. With a positive leading coefficient it is positive at both ends, so $p(x) < 0$ or $p(x) \\le 0$ stops at both ends, and its whole numbers can be counted:'),
              working('&(x + 3)(x + 1)', '&\\quad \\times (x - 1)(x - 3) \\le 0'),
              prose('is solved by'),
              working('&-3 \\le x \\le -1', '\\text{or }\\; &1 \\le x \\le 3'),
              prose('That holds $-3, -2, -1, 1, 2$ and $3$: six whole numbers. With $< 0$ the ends go, leaving only $-2$ and $2$.'),
            ),
            ask('poly-integer-count'),
            ask('poly-read-graph', 2),
            ask('poly-quartic-line', 2),
            teach(
              prose('Reading a shaded line back needs the leading coefficient. If it is negative, the far right is negative, so shading on the far right means the inequality asks for $< 0$ or $\\le 0$. Filled dots mean $\\le$ or $\\ge$; hollow ones mean $<$ or $>$.'),
            ),
            ask('poly-read-line-tiles', 2),
            ask('poly-integer-count+choice', 2),
          ],
          skillCheck: [ask('poly-read-graph', 2), ask('poly-integer-count', 2), ask('poly-read-line-tiles', 2)],
        },
      ],
      levelCheck: [
        ask('poly-critical-tiles', 2),
        ask('poly-sign-table', 2),
        ask('poly-sign-pattern', 2),
        ask('poly-cubic-line', 2),
        ask('poly-cubic-set-tiles', 2),
        ask('poly-ineq-integer', 2),
        ask('poly-touch-line', 2),
        ask('poly-hole-flow', 2),
        ask('poly-touch-tiles', 2),
        ask('poly-one-side-steps', 2),
        ask('poly-rearrange-line', 2),
        ask('poly-flip-choice', 2),
        ask('poly-read-graph', 2),
        ask('poly-integer-count', 2),
        ask('poly-quartic-line', 2),
      ],
    },
    {
      id: 'pl-l7',
      title: 'Modelling with Polynomials',
      lessons: [
        {
          id: 'pl-l7-box',
          title: 'The Open Box',
          slides: [
            teach(
              prose('Take a sheet of card $20$ cm by $16$ cm, cut a square of side $x$ cm from each corner, and fold up the flaps. That makes an open box $x$ cm tall.'),
              sheet,
              prose('Each side of the base loses a square at both ends, so the base is $20 - 2x$ by $16 - 2x$. Volume is height times length times width:'),
              maths('V = x(20 - 2x)(16 - 2x)'),
            ),
            ask('poly-box-sides-tiles'),
            ask('poly-box-expand-steps'),
            ask('poly-box-domain-flow'),
            teach(
              prose('Multiplied out, the model is a cubic. The base first, then every term times the height:'),
              working('V &= x(320 - 72x + 4x^{2})', '&= 4x^{3} - 72x^{2} + 320x'),
              prose('The $4x^{3}$ is $x$ times $-2x$ times $-2x$. There is no constant term, since every term carries the height $x$.'),
            ),
            ask('poly-box-coefficient'),
            ask('poly-box-sides-tiles', 2),
            ask('poly-box-expand-steps', 2),
            teach(
              prose('The formula gives a number for any $x$, but only some $x$ make a box. Every length has to be positive:'),
              working('x &> 0', '20 - 2x > 0 &\\implies x < 10', '16 - 2x > 0 &\\implies x < 8'),
              prose('The narrower side runs out first, so the model describes a box only for $0 < x < 8$.'),
            ),
            ask('poly-box-domain-flow', 2),
            ask('poly-box-coefficient+choice', 2),
          ],
          skillCheck: [ask('poly-box-sides-tiles', 2), ask('poly-box-expand-steps', 2), ask('poly-box-domain-flow', 2)],
        },
        {
          id: 'pl-l7-table',
          title: 'Values and the Table',
          slides: [
            teach(
              prose('A volume at one cut comes straight from the brackets. For the $20$ by $16$ sheet at $x = 2$, the base is $16$ by $12$:'),
              maths('V = 2 \\times 16 \\times 12 = 384'),
              prose('So a $2$ cm cut makes a box holding $384$ cm³.'),
            ),
            ask('poly-box-volume'),
            ask('poly-box-value-tree'),
            ask('poly-box-table'),
            teach(
              prose('A row for each whole-number cut shows how the volume changes:'),
              maths('\\begin{array}{c|cccc} x & 1 & 2 & 3 & 4 \\\\ \\hline V & 252 & 384 & 420 & 384 \\end{array}'),
              maths('\\begin{array}{c|ccc} x & 5 & 6 & 7 \\\\ \\hline V & 300 & 192 & 84 \\end{array}'),
              prose('It rises, peaks and falls. A small cut makes a shallow box, a big one a narrow box, and the largest in the table is $420$, at $x = 3$.'),
            ),
            ask('poly-box-best-slider'),
            ask('poly-box-volume+choice', 2),
            ask('poly-box-value-tree', 2),
            teach(
              volume((x) => x * (20 - 2 * x) * (16 - 2 * x), 8, 420, 'Volume against the cut for the 20 by 16 sheet: a hill from zero at x = 0, highest near x = 3, back to zero at x = 8'),
              prose('The graph is a hill from $0$ at $x = 0$ back to $0$ at $x = 8$. Finding its exact top means differentiating, which Differentiation does; for a whole-number cut, the table or the graph is enough.'),
            ),
            ask('poly-box-table', 2),
            ask('poly-box-best-slider', 2),
          ],
          skillCheck: [ask('poly-box-volume', 2), ask('poly-box-table', 2), ask('poly-box-best-slider', 2)],
        },
        {
          id: 'pl-l7-target',
          title: 'A Given Volume',
          slides: [
            teach(
              prose('Which cut makes the $20$ by $16$ box hold $384$ cm³? Set $V = 384$ and bring everything to one side:'),
              working('4x^{3} - 72x^{2} + 320x - 384 &= 0', 'x^{3} - 18x^{2} + 80x - 96 &= 0'),
              prose('Every coefficient was a multiple of $4$, so the second line divides through by $4$. Smaller numbers are easier to try roots with.'),
            ),
            ask('poly-box-cubic-steps'),
            ask('poly-box-divide-tree'),
            ask('poly-box-root-flow'),
            teach(
              prose('Call it $f(x)$ and try small whole numbers. $f(1) = 1 - 18 + 80 - 96 = -33$, but $f(2) = 8 - 72 + 160 - 96 = 0$, so $(x - 2)$ is a factor. Dividing leaves a quadratic, which factorises:'),
              working('&(x - 2)(x^{2} - 16x + 48)', '=\\;&(x - 2)(x - 4)(x - 12)'),
            ),
            ask('poly-box-other-root'),
            ask('poly-box-cubic-steps', 2),
            ask('poly-box-divide-tree', 2),
            teach(
              prose('So $x = 2$, $4$ or $12$. A box needs $0 < x < 8$, so $x = 12$ is thrown out: two $12$ cm cuts cannot come off a $16$ cm side.'),
              prose('Both $2$ cm and $4$ cm make a box holding $384$ cm³, one either side of the peak in the table. A volume below the largest usually has two cuts like this.'),
            ),
            ask('poly-box-root-flow', 2),
            ask('poly-box-other-root+choice', 2),
          ],
          skillCheck: [ask('poly-box-cubic-steps', 2), ask('poly-box-root-flow', 2), ask('poly-box-other-root', 2)],
        },
        {
          id: 'pl-l7-fit',
          title: 'Fitting a Curve',
          slides: [
            teach(
              prose('A model can also be fitted to what is known about a curve. If a cubic crosses the $x$-axis at $x = -1$, $2$ and $4$, each root gives a bracket, and a number $a$ in front moves none of them:'),
              maths('y = a(x + 1)(x - 2)(x - 4)'),
              prose('One more point fixes $a$. If the curve meets the $y$-axis at $y = 16$, then $16 = a(1)(-2)(-4) = 8a$, so $a = 2$.'),
            ),
            ask('poly-fit-tiles'),
            ask('poly-fit-coefficient'),
            ask('poly-fit-flow'),
            teach(
              prose('A point off the axes works the same way. The same curve passes through $(3, -8)$: the brackets at $x = 3$ are $(4)(1)(-1) = -4$, so $-8 = -4a$, and again $a = 2$.'),
              prose('Multiplied out, it is $y = 2x^{3} - 10x^{2} + 4x + 16$, and its constant term is the $y$-intercept, $16$.'),
            ),
            ask('poly-find-lead', 2),
            ask('poly-fit-tiles', 2),
            ask('poly-fit-coefficient+choice', 2),
            teach(
              prose('A model written out with one unknown coefficient is fitted the same way: put the point in and solve. For $y = x^{3} + kx^{2} - 4x + 12$ through $(2, 8)$:'),
              working('8 &= 8 + 4k - 8 + 12', '4k &= -4', 'k &= -1'),
            ),
            ask('poly-sketch-expand-steps'),
            ask('poly-fit-flow', 2),
          ],
          skillCheck: [ask('poly-fit-tiles', 2), ask('poly-fit-coefficient', 2), ask('poly-fit-flow', 2)],
        },
        {
          id: 'pl-l7-reading',
          title: 'Reading a Model',
          slides: [
            teach(
              prose('Every part of a model says something. For the box $V = x(20 - 2x)(16 - 2x)$:'),
              prose('A root is a cut that leaves no box: at $x = 0$ nothing folds up, which is also the intercept $V(0) = 0$, and at $x = 8$ the base has no width. A value such as $V(3) = 420$ says a $3$ cm cut makes a box of $420$ cm³.'),
            ),
            ask('poly-model-meaning'),
            ask('poly-model-sense-flow'),
            ask('poly-model-count'),
            teach(
              prose('A model stops making sense outside its range. At $x = 9$, $V = 9 \\times 2 \\times (-2) = -36$: a negative width, and no box.'),
              prose('At $x = 11$, $V = 11 \\times (-2) \\times (-6) = 132$, which is positive, yet both sides of the base are negative. The sign alone cannot say the model still applies; only the range $0 < x < 8$ can.'),
            ),
            ask('poly-model-which'),
            ask('poly-model-meaning', 2),
            ask('poly-model-sense-flow', 2),
            teach(
              prose('To pick a cubic from a table, the zeros in the $y$ row give roots, and one more point gives the number in front. Two different cubics agree at three points at most, so five points settle it: check each candidate against the table until only one fits.'),
            ),
            ask('poly-model-which', 2),
            ask('poly-model-count', 2),
          ],
          skillCheck: [ask('poly-model-meaning', 2), ask('poly-model-sense-flow', 2), ask('poly-model-which', 2)],
        },
      ],
      levelCheck: [
        ask('poly-box-sides-tiles', 2),
        ask('poly-box-expand-steps', 2),
        ask('poly-box-domain-flow', 2),
        ask('poly-box-volume', 2),
        ask('poly-box-table', 2),
        ask('poly-box-best-slider', 2),
        ask('poly-box-cubic-steps', 2),
        ask('poly-box-root-flow', 2),
        ask('poly-box-other-root', 2),
        ask('poly-fit-tiles', 2),
        ask('poly-fit-coefficient', 2),
        ask('poly-fit-flow', 2),
        ask('poly-model-meaning', 2),
        ask('poly-model-sense-flow', 2),
        ask('poly-model-which', 2),
      ],
    },
  ],
};
