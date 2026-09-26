/**
 * Polynomials level 11: Sums of Powers of Roots.
 *
 * Level 4 found α² + β², Σα² and Σ1/α from the coefficients. This level goes
 * on to cubes and higher powers, first through identities in the sums of the
 * roots and then through the fact that every root satisfies its equation,
 * which gives a recurrence for Sₙ, the sum of the nth powers. Generators are
 * in `generators/rootsPowerSums.ts`.
 *
 * Prose never runs an equation mid-sentence: `liftBlocks` would put it on a
 * line of its own and leave the sentence in two pieces. An example polynomial
 * is named without its "= 0" (which stays in the sentence), and a rule with
 * its numbers goes at the head of the working block.
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
          prose('Like the squares in Roots and Coefficients, the cubes come from the sum and the product. Cubing the sum gives both cubes and some cross terms:'),
          working('(\\alpha + \\beta)^{3} &= \\alpha^{3} + \\beta^{3}', '&\\quad + 3\\alpha^{2}\\beta + 3\\alpha\\beta^{2}'),
          prose('The cross terms are $3\\alpha\\beta(\\alpha + \\beta)$, so take them away:'),
          working('\\alpha^{3} + \\beta^{3} &= (\\alpha + \\beta)^{3}', '&\\quad - 3\\alpha\\beta(\\alpha + \\beta)'),
          prose('For ${x^{2} - 5x + 3}$, $\\alpha + \\beta = 5$ and $\\alpha\\beta = 3$:'),
          working('\\alpha^{3} + \\beta^{3} &= 5^{3} - 3 \\times 3 \\times 5', '&= 125 - 45 = 80'),
        ),
        ask('poly-pow-cube-two'),
        ask('poly-pow-cube-tree'),
        teach(
          prose('With a leading coefficient, divide by $a$ as you read the sum and the product off. For ${2x^{2} - 6x - 8}$:'),
          working(
            '\\alpha + \\beta &= -\\frac{-6}{2} = 3',
            '\\alpha\\beta &= \\frac{-8}{2} = -4',
            '\\alpha^{3} + \\beta^{3} &= 3^{3} - 3 \\times (-4) \\times 3',
            '&= 27 + 36 = 63',
          ),
          prose('The roots are $4$ and $-1$, whose cubes add to $64 - 1$, so it agrees.'),
        ),
        ask('poly-pow-cube-two+choice', 2),
        ask('poly-pow-cube-tree', 2),
        teach(
          prose('Two more expressions come from the same two numbers. Taking out the common factor $\\alpha\\beta$:'),
          maths('\\alpha^{2}\\beta + \\alpha\\beta^{2} = \\alpha\\beta(\\alpha + \\beta)'),
          prose('And squaring the difference gives both squares less $2\\alpha\\beta$, so'),
          maths('(\\alpha - \\beta)^{2} = (\\alpha + \\beta)^{2} - 4\\alpha\\beta'),
          prose('For ${x^{2} - 7x + 2}$, with sum $7$ and product $2$:'),
          working('\\alpha^{2}\\beta + \\alpha\\beta^{2} &= 2 \\times 7 = 14', '(\\alpha - \\beta)^{2} &= 7^{2} - 4 \\times 2 = 41'),
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
          prose('A root satisfies its equation. So a root $\\alpha$ of ${x^{2} + bx + c}$ has'),
          maths('\\alpha^{2} = -b\\alpha - c'),
          prose('Multiply by $\\alpha^{n}$, do the same for $\\beta$ and add. Writing $S_n$ for $\\alpha^{n} + \\beta^{n}$:'),
          maths('S_{n+2} = -bS_{n+1} - cS_n'),
          prose('Each coefficient changes sign on the way across. The roots of ${x^{2} - 3x + 1}$ follow this rule:'),
          maths('S_{n+2} = 3S_{n+1} - S_n'),
        ),
        ask('poly-pow-recurrence'),
        asking(
          'poly-pow-quad-steps',
          1,
          prose('The rule starts from $S_0 = 2$, one for each root, and $S_1$, the sum of the roots. For ${x^{2} - 3x + 1}$, $S_1 = 3$:'),
          working('S_2 &= 3 \\times 3 - 1 \\times 2 = 7', 'S_3 &= 3 \\times 7 - 1 \\times 3 = 18'),
        ),
        teach(
          prose('Worked down a table, the rule gives every power in turn. For ${x^{2} - x - 1}$:'),
          working('S_{n+2} &= S_{n+1} + S_n', 'S_0 &= 2, \\quad S_1 = 1', 'S_2 &= 1 + 2 = 3', 'S_3 &= 3 + 1 = 4', 'S_4 &= 4 + 3 = 7'),
          prose(
            'The roots, $\\frac{1 \\pm \\sqrt{5}}{2}$, are not whole, but every $S_n$ is. A monic equation with whole coefficients always gives whole power sums, because the rule only multiplies and adds whole numbers.',
          ),
        ),
        ask('poly-pow-quad-table'),
        asking(
          'poly-pow-cube-two',
          1,
          prose('$S_3$ is $\\alpha^{3} + \\beta^{3}$, so the identity from the last lesson gives it too. For ${x^{2} - x - 1}$, $\\alpha + \\beta = 1$ and $\\alpha\\beta = -1$:'),
          working('\\alpha^{3} + \\beta^{3} &= 1^{3} - 3 \\times (-1) \\times 1', '&= 4'),
          prose('That is $S_3$ from the table.'),
        ),
        teach(
          prose('Watch the signs when $b$ or $c$ is negative. For ${x^{2} + 2x - 4}$, $b = 2$ and $c = -4$, so the rule and the table start:'),
          working(
            'S_{n+2} &= -2S_{n+1} + 4S_n',
            'S_0 &= 2, \\quad S_1 = -2',
            'S_2 &= -2 \\times (-2) + 4 \\times 2',
            '&= 12',
            'S_3 &= -2 \\times 12 + 4 \\times (-2)',
            '&= -32',
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
          prose('A cubic works the same way. Each root of ${ax^{3} + bx^{2} + cx + d}$ makes it zero, and adding the three versions, $d$ comes in once per root:'),
          maths('aS_3 + bS_2 + cS_1 + 3d = 0'),
          prose('Here $S_1$ is $\\Sigma\\alpha$, and from Roots and Coefficients:'),
          maths('S_2 = (\\Sigma\\alpha)^{2} - 2\\Sigma\\alpha\\beta'),
          prose('For ${x^{3} - 2x^{2} - x + 1}$, $\\Sigma\\alpha = 2$ and $\\Sigma\\alpha\\beta = -1$, so $S_1 = 2$ and $S_2 = 6$:'),
          working('S_3 - 2 \\times 6 - 1 \\times 2 + 3 &= 0', 'S_3 &= 11'),
        ),
        ask('poly-pow-cubic-s3'),
        asking(
          'poly-pow-s3-tree',
          1,
          prose('Divided through by $a$, the same equation reads in the sums of the roots:'),
          maths('S_3 = \\Sigma\\alpha\\,S_2 - \\Sigma\\alpha\\beta\\,S_1 + 3\\alpha\\beta\\gamma'),
          prose('For ${x^{3} - 2x^{2} - x + 1}$, $\\Sigma\\alpha = 2$, $\\Sigma\\alpha\\beta = -1$ and $\\alpha\\beta\\gamma = -1$:'),
          working('S_3 &= 2 \\times 6 + 1 \\times 2 - 3', '&= 11'),
        ),
        teach(
          prose('With a leading coefficient, keep $a$ in front of $S_3$ and divide at the end. For ${2x^{3} - 4x^{2} - 2x + 4}$, $\\Sigma\\alpha = 2$ and $\\Sigma\\alpha\\beta = -1$, so $S_1 = 2$ and $S_2 = 6$:'),
          working('2S_3 - 4 \\times 6 - 2 \\times 2 + 12 &= 0', '2S_3 &= 16', 'S_3 &= 8'),
          prose('The roots are $2$, $1$ and $-1$, whose cubes add to $8 + 1 - 1$, so it agrees.'),
        ),
        ask('poly-pow-cubic-s3+choice', 2),
        ask('poly-pow-s3-tree', 2),
        teach(
          prose('For a monic cubic, $a = 1$ and the equation rearranges to one line:'),
          maths('S_3 = -bS_2 - cS_1 - 3d'),
          prose('For ${x^{3} + x^{2} - 3x + 2}$, $\\Sigma\\alpha = -1$ and $\\Sigma\\alpha\\beta = -3$:'),
          working('S_1 &= -1', 'S_2 &= (-1)^{2} - 2 \\times (-3) = 7', 'S_3 &= -1 \\times 7 + 3 \\times (-1) - 6', '&= -16'),
          prose('Multiplying by $\\alpha^{n}$ first gives a rule for every power, the signs changing as before:'),
          working('S_{n+3} &= -bS_{n+2} - cS_{n+1}', '&\\quad - dS_n'),
          prose('With $S_0 = 3$, one per root, $n = 0$ is the line above.'),
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
          prose('The rule runs on to any power. For a cubic with coefficients $a$, $b$, $c$ and $d$:'),
          maths('{aS_n + bS_{n-1}} + {cS_{n-2} + dS_{n-3} = 0}'),
          prose('At $n = 4$, for a monic cubic, that is:'),
          maths('S_4 = -bS_3 - cS_2 - dS_1'),
          prose('For ${x^{3} - 2x^{2} - x + 1}$, with $S_1 = 2$, $S_2 = 6$ and $S_3 = 11$:'),
          working('S_4 &= 2 \\times 11 + 1 \\times 6 - 1 \\times 2', '&= 26'),
        ),
        ask('poly-pow-cubic-steps', 2),
        asking(
          'poly-pow-higher',
          1,
          prose('A quadratic runs the same way, from $S_0 = 2$. For ${x^{2} - 2x - 2}$:'),
          working(
            'S_{n+2} &= 2S_{n+1} + 2S_n',
            'S_0 &= 2, \\quad S_1 = 2',
            'S_2 &= 2 \\times 2 + 2 \\times 2 = 8',
            'S_3 &= 2 \\times 8 + 2 \\times 2 = 20',
            'S_4 &= 2 \\times 20 + 2 \\times 8 = 56',
          ),
        ),
        teach(
          prose('For a cubic, start the table from $S_0 = 3$, $S_1 = \\Sigma\\alpha$ and $S_2$ from the sums, then run the rule. For ${x^{3} - x^{2} - 2x + 1}$:'),
          working('S_{n+3} &= S_{n+2} + 2S_{n+1} - S_n', 'S_0 &= 3, \\quad S_1 = 1, \\quad S_2 = 5', 'S_3 &= 5 + 2 - 3 = 4', 'S_4 &= 4 + 10 - 1 = 13'),
        ),
        ask('poly-pow-cubic-table'),
        ask('poly-pow-higher+choice', 2),
        teach(
          prose('The rule runs backwards as well. Putting $n = 2$ into the rule at the start of this lesson gives $S_{-1}$, the sum of the reciprocals. For ${x^{3} - x^{2} - 2x + 1}$:'),
          working('S_2 - S_1 - 2S_0 + S_{-1} &= 0', '5 - 1 - 6 + S_{-1} &= 0', 'S_{-1} &= 2'),
          prose('That agrees with Roots and Coefficients:'),
          maths('\\Sigma\\frac{1}{\\alpha} = \\frac{\\Sigma\\alpha\\beta}{\\alpha\\beta\\gamma} = \\frac{-2}{-1} = 2'),
          prose('The tables here run forwards, from $S_0 = 3$ for a cubic and $S_0 = 2$ for a quadratic.'),
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
          prose('For ${x^{3} - 2x^{2} - x + 1}$, $\\Sigma\\alpha = 2$, $\\Sigma\\alpha\\beta = -1$ and $\\alpha\\beta\\gamma = -1$:'),
          working('\\Sigma\\alpha^{2}\\beta &= 2 \\times (-1) - 3 \\times (-1)', '&= 1'),
        ),
        ask('poly-pow-sq-beta-tree'),
        ask('poly-pow-sq-beta', 2),
        teach(
          prose('For the squares of the reciprocals, square $\\Sigma\\frac{1}{\\alpha}$. Each square comes once and each pair twice:'),
          maths('\\Big(\\Sigma\\frac{1}{\\alpha}\\Big)^{2} = \\Sigma\\frac{1}{\\alpha^{2}} + 2\\Sigma\\frac{1}{\\alpha\\beta}'),
          prose('Over $\\alpha\\beta\\gamma$, $\\Sigma\\frac{1}{\\alpha}$ is $\\Sigma\\alpha\\beta$ on top and $\\Sigma\\frac{1}{\\alpha\\beta}$ is $\\Sigma\\alpha$ on top. So'),
          maths('\\Sigma\\frac{1}{\\alpha^{2}} = \\frac{(\\Sigma\\alpha\\beta)^{2} - 2\\alpha\\beta\\gamma\\,\\Sigma\\alpha}{(\\alpha\\beta\\gamma)^{2}}'),
          prose('For the same cubic:'),
          working('\\Sigma\\frac{1}{\\alpha^{2}} &= \\frac{(-1)^{2} - 2 \\times (-1) \\times 2}{(-1)^{2}}', '&= 5'),
          prose('With two complex roots, this sum of squares can come out negative.'),
        ),
        ask('poly-pow-recip-squares'),
        ask('poly-pow-recip-squares+choice', 2),
        teach(
          prose('A product of shifted roots is a value of the polynomial. A monic cubic is ${(x - \\alpha)(x - \\beta)(x - \\gamma)}$, and at ${x = -1}$ every bracket changes sign:'),
          maths('{(\\alpha + 1)(\\beta + 1)(\\gamma + 1)} = {-p(-1)}'),
          prose('Multiplied out, the same product is'),
          maths('{(\\alpha + 1)(\\beta + 1)(\\gamma + 1)} = {1 + \\Sigma\\alpha + \\Sigma\\alpha\\beta + \\alpha\\beta\\gamma}'),
          prose('For ${x^{3} - 2x^{2} - x + 1}$ both give $1$. Taking $k$ away from each root instead gives $-p(k)$, so ${(\\alpha - 1)(\\beta - 1)(\\gamma - 1)}$ is $-p(1)$, also $1$ here.'),
        ),
        ask('poly-pow-shift-product'),
        ask('poly-pow-shift-product', 2),
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
