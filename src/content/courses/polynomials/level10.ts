/**
 * Polynomials level 10: Complex Conjugate Roots.
 *
 * Builds on Complex Numbers (i, the conjugate, quadratics with complex roots)
 * and on the sums of the roots from Roots and Coefficients. Generators are in
 * `generators/rootsConjugate.ts`.
 */
import type { Level } from '../../types';
import { ask, maths, prose, teach, working } from './blocks';

export const conjugateRoots: Level = {
  id: 'pl-l10',
  title: 'Complex Conjugate Roots',
  lessons: [
    {
      id: 'pl-l10-pairs',
      title: 'Conjugate Pairs',
      slides: [
        teach(
          prose(
            'If a polynomial with real coefficients has a non-real root $z$, its conjugate $\\overline{z}$ is a root too. Conjugating $p(z) = 0$ changes none of the real coefficients, so $p(\\overline{z}) = 0$.',
          ),
          prose('On an Argand diagram the pair are reflections of each other in the real axis. If ${2 + 3i}$ is a root, so is ${2 - 3i}$. The pair add and multiply to real numbers:'),
          working('(2 + 3i) + (2 - 3i) &= 4', '(2 + 3i)(2 - 3i) &= 2^{2} + 3^{2}', '&= 13'),
          prose('In general, for ${a \\pm bi}$, the sum is $2a$ and the product is $a^{2} + b^{2}$, since $i^{2} = -1$.'),
        ),
        ask('poly-conj-partner-plot'),
        ask('poly-conj-pair-sum'),
        teach(
          prose('Together the pair give a quadratic factor with real coefficients. Multiply out the two brackets:'),
          working('&(x - z)(x - \\overline{z})', '=\\;&x^{2} - (z + \\overline{z})x + z\\overline{z}'),
          prose('So it is minus the sum in front of $x$ and the product at the end. For ${2 \\pm 3i}$ the sum is $4$ and the product $13$:'),
          maths('x^{2} - 4x + 13'),
        ),
        ask('poly-conj-factor-tree'),
        ask('poly-conj-quad-factor-tiles'),
        ask('poly-conj-pair-sum+choice', 2),
        teach(
          prose('Watch the signs when the parts are negative. For the root ${-1 - 2i}$ the partner is ${-1 + 2i}$:'),
          working('z + \\overline{z} &= 2 \\times (-1) = -2', 'z\\overline{z} &= (-1)^{2} + (-2)^{2} = 5'),
          prose('So the factor is $x^{2} + 2x + 5$. The product is always positive. The quadratic formula agrees:'),
          maths('\\frac{-2 \\pm \\sqrt{-16}}{2} = -1 \\pm 2i'),
        ),
        ask('poly-conj-quad-factor-tiles+choice', 2),
        ask('poly-conj-partner-plot', 2),
      ],
      skillCheck: [ask('poly-conj-partner-plot', 2), ask('poly-conj-quad-factor-tiles', 2), ask('poly-conj-pair-sum', 2)],
    },
    {
      id: 'pl-l10-cubic',
      title: 'A Cubic with a Complex Root',
      slides: [
        teach(
          prose('A real cubic with one non-real root has its conjugate as a second, and the third root must be real. The sum of the roots finds it. Take this cubic:'),
          maths('x^{3} - 5x^{2} + 11x - 15 = 0'),
          prose('It has the root ${1 + 2i}$, so ${1 - 2i}$ as well, and that pair adds to $2$:'),
          working('\\Sigma\\alpha &= -\\tfrac{-5}{1} = 5', '2 + \\gamma &= 5', '\\gamma &= 3'),
        ),
        ask('poly-conj-cubic-real-root'),
        ask('poly-conj-quad-factor-tiles', 2),
        teach(
          prose('The product checks it. The pair multiply to $5$, and the product of all three roots is $-\\frac{d}{a}$:'),
          working('5\\gamma &= -\\tfrac{-15}{1} = 15', '\\gamma &= 3'),
          prose('So the cubic factorises:'),
          maths('(x^{2} - 2x + 5)(x - 3)'),
          prose('With a leading coefficient, divide by it as usual. Doubled, the cubic has the same roots:'),
          maths('2x^{3} - 10x^{2} + 22x - 30 \\qquad \\Sigma\\alpha = -\\tfrac{-10}{2} = 5'),
        ),
        ask('poly-conj-cubic-flow'),
        ask('poly-conj-cubic-real-root+choice', 2),
        teach(
          prose('Going the other way, a real root and one complex root fix the whole cubic. For a real root $2$ and a root ${1 + i}$, the pair give $x^{2} - 2x + 2$; multiply by $x - 2$:'),
          working('&(x^{2} - 2x + 2)(x - 2)', '=\\;&x^{3} - 2x^{2} + 2x', '&- 2x^{2} + 4x - 4', '=\\;&x^{3} - 4x^{2} + 6x - 4'),
        ),
        ask('poly-conj-cubic-build-tiles'),
        ask('poly-conj-cubic-flow', 2),
        ask('poly-conj-cubic-build-tiles+choice', 2),
      ],
      skillCheck: [ask('poly-conj-cubic-real-root', 2), ask('poly-conj-cubic-flow', 2), ask('poly-conj-cubic-build-tiles', 2)],
    },
    {
      id: 'pl-l10-quartic',
      title: 'Quartics with Complex Roots',
      slides: [
        teach(
          prose('A real quartic with a root ${1 + 2i}$ has the factor $x^{2} - 2x + 5$ from the pair. Call the other factor $x^{2} + ux + v$:'),
          working('&x^{4} - 3x^{3} + 5x^{2} - x - 10', '=\\;&(x^{2} - 2x + 5)(x^{2} + ux + v)'),
          prose('Compare the $x^{3}$ terms, then the constants:'),
          working('u - 2 &= -3, \\quad u = -1', '5v &= -10, \\quad v = -2'),
          prose('So the other factor is $x^{2} - x - 2$.'),
        ),
        ask('poly-conj-quartic-factor-tiles'),
        ask('poly-conj-quad-factor-tiles', 2),
        teach(
          prose('Then solve the other factor:'),
          maths('x^{2} - x - 2 = (x - 2)(x + 1)'),
          prose('So the four roots are ${1 \\pm 2i}$, $2$ and $-1$.'),
          prose('It may not factorise. If the other factor were $x^{2} + 2x + 10$, its discriminant is $-36$, so its roots are another pair:'),
          maths('\\frac{-2 \\pm 6i}{2} = -1 \\pm 3i'),
        ),
        ask('poly-conj-quartic-flow'),
        ask('poly-conj-quartic-factor-tiles+choice', 2),
        teach(
          prose('Two conjugate pairs build a quartic. If one pair has sum $s_1$ and product $m_1$, and the other $s_2$ and $m_2$:'),
          working(
            '&(x^{2} - s_1x + m_1)',
            '&\\quad \\times (x^{2} - s_2x + m_2)',
            '=\\;&x^{4} - (s_1 + s_2)x^{3}',
            '&+ (m_1 + m_2 + s_1s_2)x^{2}',
            '&- (s_1m_2 + s_2m_1)x + m_1m_2',
          ),
          prose('For ${1 \\pm i}$, $s_1 = 2$ and $m_1 = 2$. For ${2 \\pm i}$, $s_2 = 4$ and $m_2 = 5$. So the quartic is:'),
          working('&x^{4} - 6x^{3} + 15x^{2}', '&- 18x + 10'),
        ),
        ask('poly-conj-two-pairs-tree'),
        ask('poly-conj-quartic-flow', 2),
        ask('poly-conj-two-pairs-tree', 2),
      ],
      skillCheck: [ask('poly-conj-quartic-factor-tiles', 2), ask('poly-conj-quartic-flow', 2), ask('poly-conj-two-pairs-tree', 2)],
    },
    {
      id: 'pl-l10-unknown',
      title: 'Unknown Coefficients',
      slides: [
        teach(
          prose('Take this cubic, with $p$ and $q$ real:'),
          maths('x^{3} + px + q = 0'),
          prose('It has a root ${1 + 2i}$, so the pair has sum $2$ and product $5$. Start from the identity with no unknown in it. There is no $x^{2}$ term, so the roots add to $0$:'),
          working('2 + \\gamma &= 0', '\\gamma &= -2'),
          prose('The pairs are $z\\overline{z}$, then $\\gamma$ with each of $z$ and $\\overline{z}$, which come to $5 + 2\\gamma$:'),
          working('p &= 5 + (-2) \\times 2 = 1', 'q &= -z\\overline{z}\\gamma = -5 \\times (-2) = 10'),
        ),
        ask('poly-conj-identity-flow'),
        ask('poly-conj-unknown-coeff'),
        teach(
          prose('If the constant is the known coefficient, start from the product instead. This cubic has a root ${2 + i}$, a pair with sum $4$ and product $5$:'),
          maths('x^{3} + px^{2} + qx + 15 = 0'),
          working('5\\gamma &= -15', '\\gamma &= -3', 'p &= -(4 - 3) = -1', 'q &= 5 + (-3) \\times 4 = -7'),
        ),
        ask('poly-conj-unknown-tree', 2),
        ask('poly-conj-cubic-real-root'),
        ask('poly-conj-identity-flow', 2),
        teach(
          prose('With a pair of sum $s$ and product $m$ and a real root $\\gamma$, the three identities are:'),
          working('\\Sigma\\alpha &= s + \\gamma', '\\Sigma\\alpha\\beta &= m + s\\gamma', '\\alpha\\beta\\gamma &= m\\gamma'),
          prose('Say the cubic is $x^{3} - 2x^{2} + px + q$, with a root ${-1 + 3i}$. Then $s = -2$ and $m = 10$:'),
          working('-2 + \\gamma &= 2', '\\gamma &= 4', 'p &= 10 + (-2) \\times 4 = 2', 'q &= -10 \\times 4 = -40'),
        ),
        ask('poly-conj-unknown-tree'),
        ask('poly-conj-unknown-coeff+choice', 2),
      ],
      skillCheck: [ask('poly-conj-identity-flow', 2), ask('poly-conj-unknown-coeff', 2), ask('poly-conj-unknown-tree', 2)],
    },
    {
      id: 'pl-l10-count',
      title: 'How Many Real Roots',
      slides: [
        teach(
          prose('A polynomial of degree $n$ has exactly $n$ roots once complex roots are allowed, counting a repeated root as many times as it repeats. With real coefficients the non-real ones come in conjugate pairs, reflections in the real axis, so they use up an even number of the $n$.'),
          prose('So a real cubic has $1$ or $3$ real roots, and a real quartic $0$, $2$ or $4$. A real quintic with the roots ${2 + i}$ and ${1 - 3i}$ also has ${2 - i}$ and ${1 + 3i}$: four non-real roots, one left, so exactly $1$ real root.'),
        ),
        ask('poly-conj-count-flow'),
        ask('poly-conj-partner-plot'),
        teach(
          prose('Given some roots of a real polynomial, the ones it must also have are the missing conjugates. A real quartic with the roots ${1 - 2i}$ and $3$ must also have ${1 + 2i}$.'),
          prose('${-1 + 2i}$ or $-3$ might be roots too, but nothing forces them. And a pair already given, such as ${2 + i}$ and ${2 - i}$, forces nothing new.'),
        ),
        ask('poly-conj-must-include'),
        ask('poly-conj-count-flow', 2),
        ask('poly-conj-must-include', 2),
        teach(
          prose('A list can be every root of a real polynomial only if each non-real root in it has its conjugate there too. For a cubic, ${1 + i}$, ${1 - i}$ and $4$ works.'),
          prose('${1 + i}$, ${-1 + i}$ and $4$ does not: ${-1 + i}$ is the reflection in the imaginary axis, not the conjugate. Nor does $2i$, $-2i$, ${1 + i}$, since ${1 + i}$ has no partner.'),
        ),
        ask('poly-conj-possible-sets'),
        ask('poly-conj-partner-plot', 2),
        ask('poly-conj-possible-sets', 2),
      ],
      skillCheck: [ask('poly-conj-count-flow', 2), ask('poly-conj-must-include', 2), ask('poly-conj-possible-sets', 2)],
    },
  ],
  levelCheck: [
    ask('poly-conj-partner-plot', 2),
    ask('poly-conj-pair-sum', 2),
    ask('poly-conj-quad-factor-tiles', 2),
    ask('poly-conj-cubic-real-root', 2),
    ask('poly-conj-cubic-flow', 2),
    ask('poly-conj-cubic-build-tiles', 2),
    ask('poly-conj-quartic-factor-tiles', 2),
    ask('poly-conj-quartic-flow', 2),
    ask('poly-conj-two-pairs-tree', 2),
    ask('poly-conj-unknown-coeff', 2),
    ask('poly-conj-unknown-tree', 2),
    ask('poly-conj-identity-flow', 2),
    ask('poly-conj-must-include', 2),
    ask('poly-conj-count-flow', 2),
    ask('poly-conj-possible-sets', 2),
  ],
};
