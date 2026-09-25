/**
 * Polynomials level 11: Sums of Powers of Roots.
 *
 * Level 4 found α² + β², Σα² and Σ1/α from the coefficients. This level goes
 * on to cubes and higher powers, first through identities in the sums of the
 * roots and then through the fact that every root satisfies its equation,
 * which gives a recurrence for Sₙ, the sum of the nth powers. Generators are
 * in `generators/rootsPowerSums.ts`.
 */
import type { Level } from '../../types';
import { ask, asking, maths, prose, teach, working } from './blocks';

export const powerSums: Level = {
  id: 'pl-l11',
  title: 'Sums of Powers of Roots',
  lessons: [
    {
      id: 'pl-l11-two',
      title: 'Cubes of Two Roots',
      slides: [
        teach(
          prose('Roots and Coefficients found $\\alpha^{2} + \\beta^{2}$ from the coefficients. Cubes work the same way. Cubing the sum gives both cubes and some cross terms:'),
          working(
            '(\\alpha + \\beta)^{3} &= \\alpha^{3} + \\beta^{3}',
            '&\\quad + 3\\alpha^{2}\\beta + 3\\alpha\\beta^{2}',
            '&= \\alpha^{3} + \\beta^{3} + 3\\alpha\\beta(\\alpha + \\beta)',
          ),
          prose('So take the cross terms away:'),
          maths('\\alpha^{3} + \\beta^{3} = (\\alpha + \\beta)^{3} - 3\\alpha\\beta(\\alpha + \\beta)'),
          prose('For $x^{2} - 5x + 3 = 0$, $\\alpha + \\beta = 5$ and $\\alpha\\beta = 3$:'),
          working('\\alpha^{3} + \\beta^{3} &= 5^{3} - 3 \\times 3 \\times 5', '&= 125 - 45 = 80'),
          prose('The roots are not whole, but the answer is.'),
        ),
        ask('poly-pow-cube-two'),
        ask('poly-pow-cube-tree'),
        teach(
          prose('With a leading coefficient, read the sum and the product off first, dividing by $a$. For $2x^{2} - 6x - 8 = 0$:'),
          working('\\alpha + \\beta &= -\\tfrac{-6}{2} = 3', '\\alpha\\beta &= \\tfrac{-8}{2} = -4'),
          prose('Then the identity takes the numbers:'),
          working('\\alpha^{3} + \\beta^{3} &= 3^{3} - 3 \\times (-4) \\times 3', '&= 27 + 36 = 63'),
          prose('The roots are $4$ and $-1$, and $64 - 1 = 63$ agrees.'),
        ),
        ask('poly-pow-cube-two+choice', 2),
        ask('poly-pow-cube-tree', 2),
        teach(
          prose('Two more expressions come from the same two numbers. Taking out the common factor $\\alpha\\beta$:'),
          maths('\\alpha^{2}\\beta + \\alpha\\beta^{2} = \\alpha\\beta(\\alpha + \\beta)'),
          prose('And squaring the difference gives both squares less $2\\alpha\\beta$, so'),
          maths('(\\alpha - \\beta)^{2} = (\\alpha + \\beta)^{2} - 4\\alpha\\beta'),
          prose('For $x^{2} - 7x + 2 = 0$ these are $2 \\times 7 = 14$ and $49 - 8 = 41$.'),
        ),
        ask('poly-pow-two-sym'),
        ask('poly-pow-two-sym+choice', 2),
      ],
      skillCheck: [ask('poly-pow-cube-two', 2), ask('poly-pow-two-sym', 2), ask('poly-pow-cube-tree', 2)],
    },
    {
      id: 'pl-l11-satisfy',
      title: 'Every Root Satisfies the Equation',
      slides: [
        teach(
          prose('A root satisfies its equation. For a root $\\alpha$ of $x^{2} + bx + c = 0$,'),
          maths('\\alpha^{2} = -b\\alpha - c'),
          prose('Multiply by $\\alpha^{n}$, do the same for $\\beta$ and add. Writing $S_n$ for $\\alpha^{n} + \\beta^{n}$:'),
          maths('S_{n+2} = -bS_{n+1} - cS_n'),
          prose('Each coefficient changes sign on the way across. For $x^{2} - 3x + 1 = 0$ the rule is $S_{n+2} = 3S_{n+1} - S_n$.'),
        ),
        ask('poly-pow-recurrence'),
        asking(
          'poly-pow-quad-steps',
          1,
          prose('The rule starts from $S_0 = 1 + 1 = 2$, one for each root, and $S_1 = \\alpha + \\beta$. For $x^{2} - 3x + 1 = 0$, $S_1 = 3$:'),
          working('S_2 &= 3 \\times 3 - 1 \\times 2 = 7', 'S_3 &= 3 \\times 7 - 1 \\times 3 = 18'),
        ),
        teach(
          prose('Worked down a table, the rule gives every power in turn. For $x^{2} - x - 1 = 0$ it is $S_{n+2} = S_{n+1} + S_n$:'),
          working('S_0 &= 2, \\quad S_1 = 1', 'S_2 &= 1 + 2 = 3', 'S_3 &= 3 + 1 = 4', 'S_4 &= 4 + 3 = 7'),
          prose(
            'The roots, $\\frac{1 \\pm \\sqrt{5}}{2}$, are not whole, but every $S_n$ is. A monic equation with whole coefficients always gives whole power sums, because the rule only multiplies and adds whole numbers.',
          ),
        ),
        ask('poly-pow-quad-table'),
        asking(
          'poly-pow-cube-two',
          1,
          prose('$S_3$ is $\\alpha^{3} + \\beta^{3}$, so the identity from the last lesson gives it too. For $x^{2} - x - 1 = 0$, $\\alpha + \\beta = 1$ and $\\alpha\\beta = -1$:'),
          working('\\alpha^{3} + \\beta^{3} &= 1^{3} - 3 \\times (-1) \\times 1', '&= 4'),
          prose('That is $S_3$ from the table.'),
        ),
        teach(
          prose('Watch the signs when $b$ or $c$ is negative. For $x^{2} + 2x - 4 = 0$, $b = 2$ and $c = -4$, so'),
          maths('S_{n+2} = -2S_{n+1} + 4S_n'),
          prose('With $S_0 = 2$ and $S_1 = -2$:'),
          working(
            'S_2 &= -2 \\times (-2) + 4 \\times 2 = 12',
            'S_3 &= -2 \\times 12 + 4 \\times (-2) = -32',
            'S_4 &= -2 \\times (-32) + 4 \\times 12 = 112',
          ),
        ),
        ask('poly-pow-quad-steps', 2),
        ask('poly-pow-quad-table', 2),
      ],
      skillCheck: [ask('poly-pow-quad-steps', 2), ask('poly-pow-quad-table', 2), ask('poly-pow-cube-two', 2)],
    },
    {
      id: 'pl-l11-cubic',
      title: 'Powers of Three Roots',
      slides: [
        teach(
          prose('A cubic works the same way. Each root of $ax^{3} + bx^{2} + cx + d = 0$ satisfies it, and adding the three versions, $d$ comes in once per root:'),
          maths('aS_3 + bS_2 + cS_1 + 3d = 0'),
          prose('$S_1$ is $\\Sigma\\alpha$, and $S_2 = (\\Sigma\\alpha)^{2} - 2\\Sigma\\alpha\\beta$ from Roots and Coefficients. For $x^{3} - 2x^{2} - x + 1 = 0$, $S_1 = 2$ and $S_2 = 4 + 2 = 6$:'),
          working('S_3 - 2 \\times 6 - 1 \\times 2 + 3 &= 0', 'S_3 &= 11'),
        ),
        ask('poly-pow-cubic-s3'),
        asking(
          'poly-pow-s3-tree',
          1,
          prose('Divided through by $a$, the same equation reads in the sums of the roots:'),
          maths('S_3 = \\Sigma\\alpha S_2 - \\Sigma\\alpha\\beta S_1 + 3\\alpha\\beta\\gamma'),
          prose('For the cubic above, $\\Sigma\\alpha = 2$, $\\Sigma\\alpha\\beta = -1$ and $\\alpha\\beta\\gamma = -1$:'),
          working('S_3 &= 2 \\times 6 + 1 \\times 2 - 3', '&= 11'),
        ),
        teach(
          prose('With a leading coefficient, keep $a$ in front of $S_3$ and divide at the end. $2x^{3} - 4x^{2} - 2x + 4 = 0$ has $\\Sigma\\alpha = 2$ and $\\Sigma\\alpha\\beta = -1$, so $S_1 = 2$ and $S_2 = 6$:'),
          working('2S_3 - 4 \\times 6 - 2 \\times 2 + 12 &= 0', '2S_3 &= 16', 'S_3 &= 8'),
          prose('The roots are $2$, $1$ and $-1$, and $8 + 1 - 1 = 8$ agrees.'),
        ),
        ask('poly-pow-cubic-s3+choice', 2),
        ask('poly-pow-s3-tree', 2),
        teach(
          prose('For a monic cubic, $a = 1$ and the equation rearranges to one line:'),
          maths('S_3 = -bS_2 - cS_1 - 3d'),
          prose('For $x^{3} + x^{2} - 3x + 2 = 0$, $S_1 = -1$ and $S_2 = 1 + 6 = 7$:'),
          working('S_3 &= -1 \\times 7 + 3 \\times (-1) - 6', '&= -7 - 3 - 6 = -16'),
          prose(
            'Multiplying each root\'s equation by $\\alpha^{n}$ first gives a rule for every later power, the signs changing as for a quadratic: $S_{n+3} = -bS_{n+2} - cS_{n+1} - dS_n$. With $S_0 = 3$, one per root, $n = 0$ is the line above.',
          ),
        ),
        ask('poly-pow-cubic-steps'),
        ask('poly-pow-recurrence', 2),
      ],
      skillCheck: [ask('poly-pow-cubic-s3', 2), ask('poly-pow-s3-tree', 2), ask('poly-pow-cubic-steps')],
    },
    {
      id: 'pl-l11-higher',
      title: 'Higher Powers',
      slides: [
        teach(
          prose('The rule runs on to any power. For $ax^{3} + bx^{2} + cx + d = 0$:'),
          maths('aS_n + bS_{n-1} + cS_{n-2} + dS_{n-3} = 0'),
          prose('For a monic cubic that is $S_4 = -bS_3 - cS_2 - dS_1$ at $n = 4$. For $x^{3} - 2x^{2} - x + 1 = 0$, with $S_1 = 2$, $S_2 = 6$ and $S_3 = 11$:'),
          working('S_4 &= 2 \\times 11 + 1 \\times 6 - 1 \\times 2', '&= 26'),
        ),
        ask('poly-pow-cubic-steps', 2),
        asking(
          'poly-pow-higher',
          1,
          prose('A quadratic runs the same way from $S_0 = 2$, with $S_n = -bS_{n-1} - cS_{n-2}$. For $x^{2} - 2x - 2 = 0$:'),
          working(
            'S_0 &= 2, \\quad S_1 = 2',
            'S_2 &= 2 \\times 2 + 2 \\times 2 = 8',
            'S_3 &= 2 \\times 8 + 2 \\times 2 = 20',
            'S_4 &= 2 \\times 20 + 2 \\times 8 = 56',
          ),
        ),
        teach(
          prose('For a cubic, start the table from $S_0 = 3$, $S_1 = \\Sigma\\alpha$ and $S_2 = (\\Sigma\\alpha)^{2} - 2\\Sigma\\alpha\\beta$, then run the rule. For $x^{3} - x^{2} - 2x + 1 = 0$ it is $S_{n+3} = S_{n+2} + 2S_{n+1} - S_n$:'),
          working('S_0 &= 3, \\quad S_1 = 1, \\quad S_2 = 5', 'S_3 &= 5 + 2 - 3 = 4', 'S_4 &= 4 + 10 - 1 = 13'),
        ),
        ask('poly-pow-cubic-table'),
        ask('poly-pow-higher+choice', 2),
        teach(
          prose('The rule runs backwards as well. Put $n = 2$ into $aS_n + bS_{n-1} + cS_{n-2} + dS_{n-3} = 0$ and it gives $S_{-1}$, the sum of the reciprocals. For $x^{3} - x^{2} - 2x + 1 = 0$:'),
          working('S_2 - S_1 - 2S_0 + S_{-1} &= 0', '5 - 1 - 6 + S_{-1} &= 0', 'S_{-1} &= 2'),
          prose('That agrees with $\\Sigma\\frac{1}{\\alpha} = \\frac{\\Sigma\\alpha\\beta}{\\alpha\\beta\\gamma} = \\frac{-2}{-1}$. The tables here run forwards, for a cubic from $S_0 = 3$ and for a quadratic from $S_0 = 2$.'),
        ),
        ask('poly-pow-cubic-table', 2),
        ask('poly-pow-quad-table', 2),
      ],
      skillCheck: [ask('poly-pow-cubic-table', 2), ask('poly-pow-higher', 2), ask('poly-pow-cubic-steps', 2)],
    },
    {
      id: 'pl-l11-mixed',
      title: 'Other Symmetric Expressions',
      slides: [
        teach(
          prose('Other symmetric expressions come from the same three sums. $\\Sigma\\alpha^{2}\\beta$ is the six terms $\\alpha^{2}\\beta$, $\\alpha^{2}\\gamma$, $\\beta^{2}\\alpha$, $\\beta^{2}\\gamma$, $\\gamma^{2}\\alpha$ and $\\gamma^{2}\\beta$ added.'),
          prose('Multiplying $\\Sigma\\alpha$ by $\\Sigma\\alpha\\beta$ gives each of those once, and $\\alpha\\beta\\gamma$ three times, so'),
          maths('\\Sigma\\alpha^{2}\\beta = \\Sigma\\alpha\\,\\Sigma\\alpha\\beta - 3\\alpha\\beta\\gamma'),
          prose('For $x^{3} - 2x^{2} - x + 1 = 0$, $\\Sigma\\alpha = 2$, $\\Sigma\\alpha\\beta = -1$ and $\\alpha\\beta\\gamma = -1$:'),
          working('\\Sigma\\alpha^{2}\\beta &= 2 \\times (-1) - 3 \\times (-1)', '&= 1'),
        ),
        ask('poly-pow-sq-beta-tree'),
        ask('poly-pow-sq-beta', 2),
        teach(
          prose('For the squares of the reciprocals, square $\\Sigma\\frac{1}{\\alpha}$. Each square comes once and each pair twice:'),
          maths('\\Big(\\Sigma\\frac{1}{\\alpha}\\Big)^{2} = \\Sigma\\frac{1}{\\alpha^{2}} + 2\\Sigma\\frac{1}{\\alpha\\beta}'),
          prose('Over $\\alpha\\beta\\gamma$, $\\Sigma\\frac{1}{\\alpha}$ is $\\Sigma\\alpha\\beta$ on top and $\\Sigma\\frac{1}{\\alpha\\beta}$ is $\\Sigma\\alpha$ on top. So'),
          maths('\\Sigma\\frac{1}{\\alpha^{2}} = \\frac{(\\Sigma\\alpha\\beta)^{2} - 2\\alpha\\beta\\gamma\\Sigma\\alpha}{(\\alpha\\beta\\gamma)^{2}}'),
          prose('For the same cubic:'),
          working('\\Sigma\\frac{1}{\\alpha^{2}} &= \\frac{(-1)^{2} - 2 \\times (-1) \\times 2}{(-1)^{2}}', '&= 5'),
        ),
        ask('poly-pow-recip-squares'),
        ask('poly-pow-recip-squares+choice', 2),
        teach(
          prose('A product of shifted roots is a value of the polynomial. A monic cubic is $p(x) = (x - \\alpha)(x - \\beta)(x - \\gamma)$, so'),
          working('p(-1) &= (-1 - \\alpha)(-1 - \\beta)(-1 - \\gamma)', '&= -(\\alpha + 1)(\\beta + 1)(\\gamma + 1)'),
          prose('For $p(x) = x^{3} - 2x^{2} - x + 1$, $p(-1) = -1$, so the product is $1$. Multiplying out instead gives $1 + \\Sigma\\alpha + \\Sigma\\alpha\\beta + \\alpha\\beta\\gamma = 1 + 2 - 1 - 1$, the same. For $(\\alpha + 2)(\\beta + 2)(\\gamma + 2)$, use $-p(-2)$.'),
          prose('Every expression in this level comes from the three sums. The work is picking the identity that fits.'),
        ),
        ask('poly-pow-shift-product'),
        ask('poly-pow-which-flow', 2),
      ],
      skillCheck: [ask('poly-pow-sq-beta', 2), ask('poly-pow-recip-squares', 2), ask('poly-pow-which-flow', 2)],
    },
  ],
  levelCheck: [
    ask('poly-pow-cube-two', 2),
    ask('poly-pow-two-sym', 2),
    ask('poly-pow-cube-tree', 2),
    ask('poly-pow-recurrence', 2),
    ask('poly-pow-quad-steps', 2),
    ask('poly-pow-quad-table', 2),
    ask('poly-pow-cubic-s3', 2),
    ask('poly-pow-s3-tree', 2),
    ask('poly-pow-cubic-steps', 2),
    ask('poly-pow-cubic-table', 2),
    ask('poly-pow-higher', 2),
    ask('poly-pow-sq-beta', 2),
    ask('poly-pow-recip-squares', 2),
    ask('poly-pow-shift-product', 2),
    ask('poly-pow-which-flow', 2),
  ],
};
