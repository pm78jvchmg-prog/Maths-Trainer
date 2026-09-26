/**
 * Polynomials level 9: Transforming the Roots.
 *
 * Roots and Coefficients built a cubic with roots 2α or α + 1 from the new
 * sums of the roots. This level does it by substitution, which goes further:
 * scaled roots multiply the coefficients by powers of k, shifted roots are
 * p(x - k) multiplied out, reciprocal roots reverse the coefficients, squared
 * roots come from the sums of squares or from x → √x, and the last lesson
 * chooses the substitution and uses the new equation to find a value without
 * the roots. Generators: `generators/rootsTransform.ts`.
 */
import type { Level } from '../../types';
import { ask, asking, maths, prose, teach, working } from './blocks';

export const transformingRoots: Level = {
  id: 'pl-l9',
  title: 'Transforming the Roots',
  lessons: [
    {
      id: 'pl-l9-scale',
      title: 'Scaling the Roots',
      slides: [
        teach(
          prose(
            'Roots and Coefficients built a cubic with roots $2\\alpha$ from the sums of the roots. A substitution does it in one move. If $y = 2\\alpha$, then $\\alpha = \\frac{y}{2}$ is a root of $p$, so the new roots solve $p\\left(\\frac{x}{2}\\right) = 0$. For ${x^{2} - 3x + 5}$, that is:',
          ),
          working('&\\left(\\tfrac{x}{2}\\right)^{2} - 3\\left(\\tfrac{x}{2}\\right) + 5 = 0', '&\\tfrac{x^{2}}{4} - \\tfrac{3x}{2} + 5 = 0', '&x^{2} - 6x + 20 = 0'),
          prose(
            'Multiplying by $4$ cleared the fractions, so the coefficients, highest first, were multiplied by $1,$ $2$ and $4$. For roots $k\\alpha$ of a cubic the multipliers are $1,$ $k,$ $k^{2}$ and $k^{3}$, and the leading coefficient never changes. A negative $k$ works the same way: for roots $-\\alpha$ they are $1,$ $-1,$ $1$ and $-1$.',
          ),
        ),
        ask('poly-tr-scale-tiles'),
        ask('poly-tr-scale-value'),
        teach(
          prose('For ${x^{3} + 2x^{2} - x + 3}$ and roots $-2\\alpha,$ $-2\\beta$ and $-2\\gamma$, the multipliers are $1,$ $-2,$ $4$ and $-8$:'),
          working('2 \\times (-2) &= -4', '-1 \\times 4 &= -4', '3 \\times (-8) &= -24'),
          maths('x^{3} - 4x^{2} - 4x - 24 = 0'),
          prose('With a leading coefficient of $2$ the working is the same, and the new equation starts $2x^{3}$ too.'),
        ),
        ask('poly-tr-scale-tree'),
        ask('poly-tr-scale-tiles+choice', 2),
        teach(
          prose(
            'Dividing the roots runs the other way. For roots $\\frac{\\alpha}{2}$, an old root is $2$ times a new one, so substitute ${x \\to 2x}$. The multipliers are $8,$ $4,$ $2$ and $1$:',
          ),
          working('p(x) &= x^{3} - x^{2} + 4x - 2', 'p(2x) &= 8x^{3} - 4x^{2} + 8x - 2'),
          prose('Halving gives the same roots, so this is just as good:'),
          maths('4x^{3} - 2x^{2} + 4x - 1 = 0'),
          prose('When a question asks about $p(2x)$ itself, give its coefficients before any halving.'),
        ),
        ask('poly-tr-scale-value', 2),
        ask('poly-tr-scale-tree', 2),
      ],
      skillCheck: [ask('poly-tr-scale-tiles', 2), ask('poly-tr-scale-tree', 2), ask('poly-tr-scale-value', 2)],
    },
    {
      id: 'pl-l9-shift',
      title: 'Shifting the Roots',
      slides: [
        teach(
          prose('For roots $\\alpha + 2$: if $y = \\alpha + 2$ then $\\alpha = y - 2$, so substitute ${x \\to x - 2}$. Multiplying out needs the binomial pattern:'),
          working('(x - k)^{2} &= x^{2} - 2kx + k^{2}', '(x - k)^{3} &= x^{3} - 3kx^{2}', '&\\quad + 3k^{2}x - k^{3}'),
          prose('For ${x^{2} + 3x - 1}$ and roots $\\alpha + 2$ and $\\beta + 2$:'),
          working('&(x - 2)^{2} + 3(x - 2) - 1', '=\\;&x^{2} - 4x + 4 + 3x - 6 - 1', '=\\;&x^{2} - x - 3'),
        ),
        ask('poly-tr-shift-steps'),
        ask('poly-tr-shift-tiles'),
        teach(
          prose('For roots $\\alpha - 1$, $\\alpha = y + 1$, so substitute ${x \\to x + 1}$. For ${x^{3} - 2x^{2} + x + 4}$, one bracket at a time:'),
          working('(x + 1)^{3} &= x^{3} + 3x^{2}', '&\\quad + 3x + 1', '-2(x + 1)^{2} &= -2x^{2} - 4x - 2', '(x + 1) &= x + 1'),
          prose('Adding, with the constant $4$:'),
          maths('x^{3} + x^{2} + 4 = 0'),
          prose('A leading coefficient multiplies its bracket like any other coefficient, so it stays in front.'),
        ),
        ask('poly-tr-shift-steps', 2),
        ask('poly-tr-shift-tiles+choice', 2),
        teach(
          prose('The constant term of $p(x - k)$ is its value at $x = 0$, which is $p(-k)$. For the roots $\\alpha - 1$ above, it is $p(1)$:'),
          maths('1 - 2 + 1 + 4 = 4'),
          prose(
            'Shifting is not scaling. Starting again from ${x^{2} + 3x - 1}$, roots $2\\alpha$ come from ${x \\to \\frac{x}{2}}$ and roots $\\alpha + 2$ from ${x \\to x - 2}$:',
          ),
          working('2\\alpha &: \\; x^{2} + 6x - 4 = 0', '\\alpha + 2 &: \\; x^{2} - x - 3 = 0'),
        ),
        ask('poly-tr-shift-value'),
        ask('poly-tr-scale-tiles', 2),
        ask('poly-tr-shift-value', 2),
      ],
      skillCheck: [ask('poly-tr-shift-steps', 2), ask('poly-tr-shift-tiles', 2), ask('poly-tr-shift-value', 2)],
    },
    {
      id: 'pl-l9-reciprocal',
      title: 'Reciprocal Roots',
      slides: [
        teach(
          prose('For roots $\\frac{1}{\\alpha}$, $\\alpha = \\frac{1}{y}$, so substitute ${x \\to \\frac{1}{x}}$ and multiply through by $x^{3}$. For ${2x^{3} - 3x^{2} + x + 5}$:'),
          working('&\\tfrac{2}{x^{3}} - \\tfrac{3}{x^{2}} + \\tfrac{1}{x} + 5 = 0', '&2 - 3x + x^{2} + 5x^{3} = 0', '&5x^{3} + x^{2} - 3x + 2 = 0'),
          prose('Written highest power first, those are the same coefficients in reverse order.'),
        ),
        ask('poly-tr-recip-tiles'),
        asking(
          'poly-tr-recip-value',
          1,
          prose('The reversed equation has roots $\\frac{1}{\\alpha},$ $\\frac{1}{\\beta}$ and $\\frac{1}{\\gamma}$, so the sum of its roots is $\\Sigma\\frac{1}{\\alpha}$. For ${5x^{3} + x^{2} - 3x + 2}$ that is $-\\frac{b}{a}$:'),
          maths('\\Sigma\\frac{1}{\\alpha} = -\\frac{1}{5}'),
        ),
        teach(
          prose('For roots $\\frac{2}{\\alpha}$, $\\alpha = \\frac{2}{y}$: substitute ${x \\to \\frac{2}{x}}$ and multiply by $x^{3}$. The coefficients reverse, then are multiplied by $1,$ $2,$ $4$ and $8$. For ${2x^{3} - 3x^{2} + x + 5}$ again:'),
          working('&5,\\;\\; 1,\\;\\; -3,\\;\\; 2', '&5,\\;\\; 2,\\;\\; -12,\\;\\; 16'),
          maths('5x^{3} + 2x^{2} - 12x + 16 = 0'),
        ),
        ask('poly-tr-recip-tree'),
        ask('poly-tr-recip-tiles+choice', 2),
        teach(
          prose('If the constant term is $0$, then $0$ is a root and has no reciprocal: reversing loses the top term, and the new equation has one root fewer.'),
          prose('The other sums of the reversed equation give more values. From ${5x^{3} + x^{2} - 3x + 2}$:'),
          working('\\Sigma\\frac{1}{\\alpha\\beta} &= \\frac{c}{a} = -\\frac{3}{5}', '\\frac{1}{\\alpha\\beta\\gamma} &= -\\frac{d}{a} = -\\frac{2}{5}'),
        ),
        ask('poly-tr-recip-value', 2),
        ask('poly-tr-recip-tree', 2),
      ],
      skillCheck: [ask('poly-tr-recip-tiles', 2), ask('poly-tr-recip-tree', 2), ask('poly-tr-recip-value', 2)],
    },
    {
      id: 'pl-l9-squares',
      title: 'Squared Roots',
      slides: [
        teach(
          prose('For roots $\\alpha^{2}$ and $\\beta^{2}$, work out their sum and product from the old ones:'),
          working('\\alpha^{2} + \\beta^{2} &= (\\alpha + \\beta)^{2} - 2\\alpha\\beta', '\\alpha^{2}\\beta^{2} &= (\\alpha\\beta)^{2}'),
          prose('For ${x^{2} - 3x + 1}$, ${\\alpha + \\beta = 3}$ and ${\\alpha\\beta = 1}$, so the new sum is ${9 - 2 = 7}$ and the new product is $1$:'),
          maths('x^{2} - 7x + 1 = 0'),
        ),
        ask('poly-tr-square-sums-tree'),
        ask('poly-tr-square-value'),
        teach(
          prose('For a cubic there are three sums to find:'),
          working('\\Sigma\\alpha^{2} &= (\\Sigma\\alpha)^{2} - 2\\Sigma\\alpha\\beta', '\\Sigma\\alpha^{2}\\beta^{2} &= (\\Sigma\\alpha\\beta)^{2} - 2\\alpha\\beta\\gamma\\Sigma\\alpha', '\\alpha^{2}\\beta^{2}\\gamma^{2} &= (\\alpha\\beta\\gamma)^{2}'),
          prose('For ${x^{3} + x^{2} - 2x + 3}$, ${\\Sigma\\alpha = -1}$, ${\\Sigma\\alpha\\beta = -2}$ and ${\\alpha\\beta\\gamma = -3}$:'),
          working('\\Sigma\\alpha^{2} &= 1 + 4 = 5', '\\Sigma\\alpha^{2}\\beta^{2} &= 4 - 2(-3)(-1)', '&= -2', '(\\alpha\\beta\\gamma)^{2} &= 9'),
          prose('Minus, plus, minus:'),
          maths('x^{3} - 5x^{2} - 2x - 9 = 0'),
        ),
        ask('poly-tr-square-sums-tree', 2),
        ask('poly-tr-square-value+choice', 2),
        teach(
          prose('Or substitute ${x \\to \\sqrt{x}}$. To avoid square roots, put the odd powers on one side, square, then write $x$ for $x^{2}$. For ${x^{2} - 3x + 1}$:'),
          working('x^{2} + 1 &= 3x', '(x^{2} + 1)^{2} &= 9x^{2}', '(x + 1)^{2} &= 9x', 'x^{2} - 7x + 1 &= 0'),
          prose('For ${x^{3} + x^{2} - 2x + 3}$:'),
          working('x^{3} - 2x &= -(x^{2} + 3)', 'x^{2}(x^{2} - 2)^{2} &= (x^{2} + 3)^{2}', 'x(x - 2)^{2} &= (x + 3)^{2}'),
          prose('Multiplied out, that is what the sums gave:'),
          maths('x^{3} - 5x^{2} - 2x - 9 = 0'),
        ),
        ask('poly-tr-square-sub-steps'),
        ask('poly-tr-square-sub-steps', 2),
      ],
      skillCheck: [ask('poly-tr-square-sums-tree', 2), ask('poly-tr-square-sub-steps', 2), ask('poly-tr-square-value', 2)],
    },
    {
      id: 'pl-l9-using',
      title: 'Choosing a Substitution',
      slides: [
        teach(
          prose('Every transformation is one move: write the new root $y$ in terms of $\\alpha$, solve for $\\alpha$, and substitute that for $x$.'),
          working(
            '2\\alpha &: \\; x \\to \\tfrac{x}{2}',
            '\\alpha + 3 &: \\; x \\to x - 3',
            '\\tfrac{1}{\\alpha} &: \\; x \\to \\tfrac{1}{x}',
            '\\alpha^{2} &: \\; x \\to \\sqrt{x}',
            '\\tfrac{1}{\\alpha + 1} &: \\; x \\to \\tfrac{1 - x}{x}',
          ),
          prose('Getting it backwards gives the wrong roots: ${x \\to 2x}$ gives roots $\\frac{\\alpha}{2}$. For ${x^{2} + x - 4}$ and roots $\\alpha - 2$, substitute ${x \\to x + 2}$:'),
          working('&(x + 2)^{2} + (x + 2) - 4', '=\\;&x^{2} + 5x + 2'),
        ),
        ask('poly-tr-sub-flow'),
        ask('poly-tr-shift-tiles'),
        teach(
          prose('For roots $\\frac{1}{\\alpha + 1}$, solve for $\\alpha$:'),
          maths('\\alpha = \\frac{1}{y} - 1 = \\frac{1 - y}{y}'),
          prose('For ${x^{2} - 2x + 3}$, substitute ${x \\to \\frac{1 - x}{x}}$ and multiply by $x^{2}$:'),
          working('&(1 - x)^{2} - 2x(1 - x) + 3x^{2}', '=\\;&6x^{2} - 4x + 1'),
          prose(
            'Or in two steps: roots $\\alpha + 1$ give ${x^{2} - 4x + 6}$, and reversing that gives the same answer. Either way, without finding $\\alpha$ or $\\beta$:',
          ),
          maths('\\frac{1}{\\alpha + 1} + \\frac{1}{\\beta + 1} = \\frac{4}{6} = \\frac{2}{3}'),
        ),
        ask('poly-tr-using-value'),
        ask('poly-tr-sub-flow', 2),
        teach(
          prose('For ${x^{3} + x^{2} - 2x + 3}$, substitute ${x \\to x - 1}$ and multiply out one bracket at a time. The result has roots $\\alpha + 1,$ $\\beta + 1$ and $\\gamma + 1$:'),
          maths('x^{3} - 2x^{2} - x + 5 = 0'),
          prose('Its product of roots and sum in pairs are:'),
          working('(\\alpha + 1)(\\beta + 1)(\\gamma + 1) &= -5', '\\Sigma(\\alpha + 1)(\\beta + 1) &= -1'),
          prose('The sum of the reciprocals is the sum in pairs over the product:'),
          maths('\\Sigma\\frac{1}{\\alpha + 1} = \\frac{-1}{-5} = \\frac{1}{5}'),
        ),
        ask('poly-tr-using-value', 2),
        ask('poly-tr-shift-tiles', 2),
      ],
      skillCheck: [ask('poly-tr-sub-flow', 2), ask('poly-tr-using-value', 2), ask('poly-tr-shift-tiles', 2)],
    },
  ],
  levelCheck: [
    ask('poly-tr-scale-tiles', 2),
    ask('poly-tr-shift-steps', 2),
    ask('poly-tr-recip-tree', 2),
    ask('poly-tr-square-sums-tree', 2),
    ask('poly-tr-scale-value', 2),
    ask('poly-tr-shift-tiles', 2),
    ask('poly-tr-recip-value', 2),
    ask('poly-tr-square-sub-steps', 2),
    ask('poly-tr-sub-flow', 2),
    ask('poly-tr-scale-tree', 2),
    ask('poly-tr-shift-value', 2),
    ask('poly-tr-recip-tiles', 2),
    ask('poly-tr-square-value', 2),
    ask('poly-tr-using-value', 2),
  ],
};
