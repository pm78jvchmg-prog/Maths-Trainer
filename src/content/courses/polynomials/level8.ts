/**
 * Polynomials level 8: Roots of Quartics.
 *
 * Level 4's sums of the roots, carried to degree four: the four identities,
 * a quartic built from its roots (by the sums, or pair by pair), two missing
 * roots found from two known ones, roots in opposite pairs, and Σα² and
 * Σ1/α without solving. Generators in `generators/rootsQuartics.ts`.
 */
import type { Level } from '../../types';
import { ask, maths, prose, teach, working } from './blocks';

/** The four identities for ax^4 + bx^3 + cx^2 + dx + e = 0, one to a line. */
const identities = working(
  '\\Sigma\\alpha &= -\\frac{b}{a}',
  '\\Sigma\\alpha\\beta &= \\frac{c}{a}',
  '\\Sigma\\alpha\\beta\\gamma &= -\\frac{d}{a}',
  '\\alpha\\beta\\gamma\\delta &= \\frac{e}{a}',
);

export const rootsOfQuartics: Level = {
  id: 'pl-l8',
  title: 'Roots of Quartics',
  lessons: [
    {
      id: 'pl-l8-four',
      title: 'Four Roots',
      slides: [
        teach(
          prose('A quartic has four roots, $\\alpha$, $\\beta$, $\\gamma$ and $\\delta$. Multiplying out'),
          maths('(x - \\alpha)(x - \\beta)(x - \\gamma)(x - \\delta)'),
          prose('gives four sums:'),
          working('&x^{4} - (\\Sigma\\alpha)x^{3} + (\\Sigma\\alpha\\beta)x^{2}', '&- (\\Sigma\\alpha\\beta\\gamma)x + \\alpha\\beta\\gamma\\delta'),
          prose('$\\Sigma\\alpha\\beta$ adds the six products of two roots, and $\\Sigma\\alpha\\beta\\gamma$ the four products of three. The signs go minus, plus, minus, plus. So'),
          maths('x^{4} - 5x^{3} + 5x^{2} + 5x - 6 = 0'),
          working('\\Sigma\\alpha &= 5', '\\Sigma\\alpha\\beta &= 5', '\\Sigma\\alpha\\beta\\gamma &= -5', '\\alpha\\beta\\gamma\\delta &= -6'),
        ),
        ask('poly-q4-vieta'),
        teach(
          prose('From the roots, pair them up. Every product of two roots is $\\alpha\\beta$, $\\gamma\\delta$, or one root from each pair:'),
          working(
            '\\Sigma\\alpha\\beta &= \\alpha\\beta + \\gamma\\delta',
            '&\\quad + (\\alpha + \\beta)(\\gamma + \\delta)',
            '\\Sigma\\alpha\\beta\\gamma &= \\alpha\\beta(\\gamma + \\delta)',
            '&\\quad + \\gamma\\delta(\\alpha + \\beta)',
          ),
          prose('For roots $1$, $2$, $-1$ and $3$, in that order:'),
          working('\\alpha + \\beta &= 3 &\\quad \\alpha\\beta &= 2', '\\gamma + \\delta &= 2 &\\quad \\gamma\\delta &= -3'),
          working(
            '\\Sigma\\alpha &= 3 + 2 = 5',
            '\\Sigma\\alpha\\beta &= 2 - 3 + 3 \\times 2 = 5',
            '\\Sigma\\alpha\\beta\\gamma &= 2 \\times 2 - 3 \\times 3 = -5',
            '\\alpha\\beta\\gamma\\delta &= 2 \\times (-3) = -6',
          ),
        ),
        ask('poly-q4-sums-tree'),
        ask('poly-q4-sums-flow'),
        teach(
          prose('With a leading coefficient $a$, divide by it first. For the quartic'),
          maths('ax^{4} + bx^{3} + cx^{2} + dx + e = 0'),
          identities,
          prose('For example, with $a = 2$:'),
          working('&2x^{4} - 2x^{3} - 14x^{2}', '&\\quad + 2x + 12 = 0'),
          working(
            '\\Sigma\\alpha &= -\\tfrac{-2}{2} = 1',
            '\\Sigma\\alpha\\beta &= \\tfrac{-14}{2} = -7',
            '\\Sigma\\alpha\\beta\\gamma &= -\\tfrac{2}{2} = -1',
            '\\alpha\\beta\\gamma\\delta &= \\tfrac{12}{2} = 6',
          ),
          prose('The product of four roots is plus $\\frac{e}{a}$: each extra root flips the sign once more.'),
        ),
        ask('poly-q4-vieta+choice', 2),
        ask('poly-q4-sums-tree', 2),
        ask('poly-q4-sums-flow', 2),
      ],
      skillCheck: [ask('poly-q4-vieta', 2), ask('poly-q4-sums-tree', 2), ask('poly-q4-sums-flow', 2)],
    },
    {
      id: 'pl-l8-build',
      title: 'A Quartic from its Roots',
      slides: [
        teach(
          prose('To build a quartic from its roots, find the four sums and put them in with the signs alternating. For roots $-3$, $-1$, $1$ and $2$, pair them. The first pair adds to $-4$ and multiplies to $3$; the second adds to $3$ and multiplies to $2$.'),
          working(
            '\\Sigma\\alpha &= -4 + 3 = -1',
            '\\Sigma\\alpha\\beta &= 3 + 2 + (-4) \\times 3',
            '&= -7',
            '\\Sigma\\alpha\\beta\\gamma &= 3 \\times 3 + 2 \\times (-4)',
            '&= 1',
            '\\alpha\\beta\\gamma\\delta &= 3 \\times 2 = 6',
          ),
          prose('Minus, plus, minus, plus:'),
          maths('x^{4} + x^{3} - 7x^{2} - x + 6'),
        ),
        ask('poly-q4-build-tiles'),
        ask('poly-q4-sums-tree'),
        teach(
          prose('Or build it pair by pair. Two roots with sum $s$ and product $p$ are the roots of $x^{2} - sx + p$, so each pair gives a quadratic factor:'),
          working('-3, -1 &\\;\\to\\; x^{2} + 4x + 3', '1, 2 &\\;\\to\\; x^{2} - 3x + 2'),
          prose('Their product is the same quartic:'),
          working('&(x^{2} + 4x + 3)(x^{2} - 3x + 2)', '=\\;&x^{4} + x^{3} - 7x^{2} - x + 6'),
        ),
        ask('poly-q4-pairs-tiles'),
        ask('poly-q4-pairs-tiles', 2),
        teach(
          prose('A quartic with a leading coefficient is the monic one times that number. With leading coefficient $3$ and the same roots:'),
          maths('3x^{4} + 3x^{3} - 21x^{2} - 3x + 18'),
          prose('Every term is multiplied, the constant included.'),
        ),
        ask('poly-q4-build-tiles+choice', 2),
        ask('poly-q4-sums-tree', 2),
      ],
      skillCheck: [ask('poly-q4-build-tiles', 2), ask('poly-q4-pairs-tiles', 2), ask('poly-q4-sums-tree', 2)],
    },
    {
      id: 'pl-l8-missing',
      title: 'Two Missing Roots',
      slides: [
        teach(
          prose('For the quartic'),
          maths('ax^{4} + bx^{3} + cx^{2} + dx + e = 0'),
          identities,
          prose('Knowing two roots, $\\Sigma\\alpha$ and the product give the other two. This quartic has roots $\\alpha = 1$ and $\\beta = 2$:'),
          maths('x^{4} + x^{3} - 7x^{2} - x + 6 = 0'),
          prose('So for the known pair'),
          working('\\alpha + \\beta &= 3 &\\quad \\alpha\\beta &= 2'),
          prose('and from the coefficients'),
          working(
            '\\Sigma\\alpha &= -1',
            '\\gamma + \\delta &= -1 - 3 = -4',
            '\\alpha\\beta\\gamma\\delta &= 6',
            '\\gamma\\delta &= \\tfrac{6}{2} = 3',
          ),
        ),
        ask('poly-q4-other-pair-tree'),
        ask('poly-q4-vieta'),
        teach(
          prose('$\\gamma$ and $\\delta$ have sum $-4$ and product $3$, so they are the roots of'),
          working('x^{2} + 4x + 3 &= 0', '(x + 1)(x + 3) &= 0'),
          prose('They are $-1$ and $-3$. All four roots, found from two.'),
        ),
        ask('poly-q4-other-roots-flow'),
        teach(
          prose('With a leading coefficient, divide by it first. This quartic has the same roots:'),
          working('&2x^{4} + 2x^{3} - 14x^{2}', '&\\quad - 2x + 12 = 0'),
          working('\\Sigma\\alpha &= -\\tfrac{2}{2} = -1', '\\alpha\\beta\\gamma\\delta &= \\tfrac{12}{2} = 6'),
          prose('From there it is the same working:'),
          working('\\gamma + \\delta &= -4 &\\quad \\gamma\\delta &= 3'),
        ),
        ask('poly-q4-other-pair-tree', 2),
        ask('poly-q4-vieta+choice', 2),
        ask('poly-q4-other-roots-flow', 2),
      ],
      skillCheck: [ask('poly-q4-other-pair-tree', 2), ask('poly-q4-other-roots-flow', 2), ask('poly-q4-vieta', 2)],
    },
    {
      id: 'pl-l8-opposite',
      title: 'Roots in Opposite Pairs',
      slides: [
        teach(
          prose('Roots $\\pm 2$ come from one quadratic factor:'),
          maths('(x - 2)(x + 2) = x^{2} - 4'),
          prose('Likewise $\\pm\\sqrt{3}$ come from $x^{2} - 3$. So roots $\\pm 2$ and $\\pm\\sqrt{3}$ give'),
          working('&(x^{2} - 4)(x^{2} - 3)', '=\\;&x^{4} - 7x^{2} + 12'),
          prose('The $x^{2}$ coefficient is minus the sum of the squares, $4 + 3 = 7$, and the constant is their product, $12$. There is no $x^{3}$ and no $x$ term: the roots cancel in pairs, so $\\Sigma\\alpha = 0$ and $\\Sigma\\alpha\\beta\\gamma = 0$.'),
        ),
        ask('poly-q4-pm-tiles'),
        ask('poly-q4-pm-squares-tree'),
        teach(
          prose('A missing coefficient comes from the squares. This quartic has roots $\\pm 3$ and $\\pm q$:'),
          maths('x^{4} - 10x^{2} + k = 0'),
          prose('The squares add to $10$:'),
          working('9 + q^{2} &= 10', 'q^{2} &= 1', 'k &= 9 \\times 1 = 9'),
        ),
        ask('poly-q4-pm-unknown'),
        teach(
          prose('With a leading coefficient, multiply through. Roots $\\pm 1$ and $\\pm 2$ with leading coefficient $2$:'),
          working('&2(x^{2} - 1)(x^{2} - 4)', '=\\;&2x^{4} - 10x^{2} + 8'),
          prose('Going back, divide by the leading coefficient first. In the quartic below, the squares add to $5$, which is $\\tfrac{10}{2}$, and $k$ is $2$ times their product.'),
          maths('2x^{4} - 10x^{2} + k = 0'),
        ),
        ask('poly-q4-pm-tiles+choice', 2),
        ask('poly-q4-pm-squares-tree', 2),
        ask('poly-q4-pm-unknown+choice', 2),
      ],
      skillCheck: [ask('poly-q4-pm-tiles', 2), ask('poly-q4-pm-squares-tree', 2), ask('poly-q4-pm-unknown', 2)],
    },
    {
      id: 'pl-l8-symmetric',
      title: 'Symmetric Functions of Four Roots',
      slides: [
        teach(
          prose('Squaring $\\Sigma\\alpha$ gives each square once and each of the six pair products twice, so'),
          maths('\\Sigma\\alpha^{2} = (\\Sigma\\alpha)^{2} - 2\\Sigma\\alpha\\beta'),
          prose('This quartic has $\\Sigma\\alpha = 5$ and $\\Sigma\\alpha\\beta = 5$:'),
          maths('x^{4} - 5x^{3} + 5x^{2} + 5x - 6 = 0'),
          working('\\Sigma\\alpha^{2} &= 5^{2} - 2 \\times 5', '&= 15'),
          prose('Its roots are $1$, $-1$, $2$ and $3$, whose squares add to $15$ too.'),
        ),
        ask('poly-q4-squares-tree'),
        ask('poly-q4-symmetric'),
        teach(
          prose('Over the common denominator $\\alpha\\beta\\gamma\\delta$, each $\\frac{1}{\\alpha}$ has the other three roots on top, and each $\\frac{1}{\\alpha\\beta}$ the other two:'),
          working('\\Sigma\\frac{1}{\\alpha} &= \\frac{\\Sigma\\alpha\\beta\\gamma}{\\alpha\\beta\\gamma\\delta}', '\\Sigma\\frac{1}{\\alpha\\beta} &= \\frac{\\Sigma\\alpha\\beta}{\\alpha\\beta\\gamma\\delta}'),
          prose('For the same quartic, $\\Sigma\\alpha\\beta\\gamma = -5$ and $\\alpha\\beta\\gamma\\delta = -6$:'),
          working('\\Sigma\\frac{1}{\\alpha} &= \\frac{-5}{-6} = \\frac{5}{6}', '\\Sigma\\frac{1}{\\alpha\\beta} &= \\frac{5}{-6} = -\\frac{5}{6}'),
        ),
        ask('poly-q4-identity-flow'),
        teach(
          prose('With a leading coefficient, find the sums first. This quartic'),
          working('&2x^{4} - 2x^{3} - 14x^{2}', '&\\quad + 2x + 12 = 0'),
          prose('has sums'),
          working('\\Sigma\\alpha &= 1 &\\quad \\Sigma\\alpha\\beta &= -7', '\\Sigma\\alpha\\beta\\gamma &= -1 &\\quad \\alpha\\beta\\gamma\\delta &= 6'),
          prose('so'),
          working('\\Sigma\\alpha^{2} &= 1^{2} - 2 \\times (-7) = 15', '\\Sigma\\frac{1}{\\alpha} &= \\frac{-1}{6} = -\\frac{1}{6}'),
        ),
        ask('poly-q4-symmetric+choice', 2),
        ask('poly-q4-squares-tree', 2),
        ask('poly-q4-identity-flow', 2),
      ],
      skillCheck: [ask('poly-q4-symmetric', 2), ask('poly-q4-squares-tree', 2), ask('poly-q4-identity-flow', 2)],
    },
  ],
  levelCheck: [
    ask('poly-q4-vieta', 2),
    ask('poly-q4-sums-tree', 2),
    ask('poly-q4-sums-flow', 2),
    ask('poly-q4-build-tiles', 2),
    ask('poly-q4-pairs-tiles', 2),
    ask('poly-q4-other-pair-tree', 2),
    ask('poly-q4-other-roots-flow', 2),
    ask('poly-q4-pm-tiles', 2),
    ask('poly-q4-pm-squares-tree', 2),
    ask('poly-q4-pm-unknown', 2),
    ask('poly-q4-symmetric', 2),
    ask('poly-q4-squares-tree', 2),
    ask('poly-q4-identity-flow', 2),
    ask('poly-q4-build-tiles+choice', 2),
  ],
};
