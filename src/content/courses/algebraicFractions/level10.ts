/**
 * Algebraic Fractions, level 10: fractions within fractions. Numbers first,
 * then x in the small bottoms, a fraction divided by a fraction, a fraction
 * stacked inside another, and equations with one. Generators are in
 * `generators/fractionsLevel10.ts`.
 */
import type { Level } from '../../types';
import { ask, maths, prose, teach, working } from './blocks';

export const level10: Level = {
  id: 'af-l10',
  title: 'Fractions within Fractions',
  lessons: [
    {
      id: 'af-l10-numbers',
      title: 'Numbers First',
      slides: [
        teach(
          prose(
            'A fraction whose top or bottom holds fractions of its own is a compound fraction. One way to simplify it: write the top as one fraction, write the bottom as one fraction, then divide.',
          ),
          working(
            '&\\dfrac{1 + \\frac{1}{2}}{1 - \\frac{1}{3}}',
            '=\\;&\\dfrac{\\frac{3}{2}}{\\frac{2}{3}}',
            '=\\;&\\frac{3}{2} \\times \\frac{3}{2}',
            '=\\;&\\frac{9}{4}',
          ),
          prose('Dividing by $\\frac{2}{3}$ is multiplying by $\\frac{3}{2}$, the bottom turned upside down.'),
        ),
        ask('af10-num-tidy-tree'),
        ask('af10-num-value'),
        teach(
          prose(
            'A quicker way: multiply the top and the bottom by one number that every small bottom divides into. Each small fraction clears, and the value does not change, because the top and the bottom are multiplied by the same thing.',
          ),
          working('&\\dfrac{1 + \\frac{1}{2}}{1 - \\frac{1}{3}}', '=\\;&\\frac{6 + 3}{6 - 2}', '=\\;&\\frac{9}{4}'),
          prose(
            'Here $6$ is the smallest number both $2$ and $3$ divide into. Every term is multiplied by it, whole numbers included: on the top the $1$ becomes $6$ and the $\\frac{1}{2}$ becomes $3$.',
          ),
        ),
        ask('af10-num-lcd'),
        ask('af10-num-clear-tiles'),
        teach(
          prose(
            'With two fractions on the top, both ways still work. Clearing is usually quicker: find the smallest number every small bottom divides into.',
          ),
          working(
            '&\\dfrac{\\frac{1}{2} + \\frac{1}{3}}{1 - \\frac{1}{4}}',
            '=\\;&\\frac{6 + 4}{12 - 3}',
            '=\\;&\\frac{10}{9}',
          ),
          prose('The small bottoms are $2$, $3$ and $4$, and $12$ is the smallest number all three divide into. If the answer can be cancelled, cancel it.'),
        ),
        ask('af10-num-clear-tiles', 2),
        ask('af10-num-tidy-tree', 2),
        ask('af10-num-lcd+choice', 2),
        ask('af10-num-value', 2),
      ],
      skillCheck: [ask('af10-num-tidy-tree', 2), ask('af10-num-clear-tiles', 2), ask('af10-num-value', 2)],
    },
    {
      id: 'af-l10-common',
      title: 'Clearing with the Common Bottom',
      slides: [
        teach(
          prose(
            'The same clearing works with $x$ in the small bottoms. In the fraction below the only small bottom is $x$, so multiply the top and the bottom by $x$.',
          ),
          working('&\\dfrac{1 + \\frac{1}{x}}{1 - \\frac{1}{x}}', '=\\;&\\frac{x + 1}{x - 1}'),
          prose('Every term is multiplied: each $1$ becomes $x$, and each $\\frac{1}{x}$ becomes $1$.'),
        ),
        ask('af10-common-tiles'),
        ask('af10-common-flow'),
        ask('af10-common-which'),
        teach(
          prose('Forgetting to multiply a whole number is the usual slip. Here the $2$ becomes $2x$ and the $1$ becomes $x$:'),
          working('&\\dfrac{2 + \\frac{3}{x}}{1 - \\frac{4}{x}}', '=\\;&\\frac{2x + 3}{x - 4}'),
          prose(
            'Once it is one fraction, a value is quick to find. At $x = 5$ the top is $13$ and the bottom is $1$, so its value is $13$.',
          ),
        ),
        ask('af10-common-value'),
        ask('af10-common-tiles'),
        teach(
          prose(
            'When the small bottom is a bracket, multiply by the bracket. Expand and collect afterwards.',
          ),
          working(
            '&\\dfrac{2 + \\frac{3}{x + 1}}{1 - \\frac{3}{x + 1}}',
            '=\\;&\\frac{2(x + 1) + 3}{(x + 1) - 3}',
            '=\\;&\\frac{2x + 5}{x - 2}',
          ),
        ),
        ask('af10-common-flow', 2),
        ask('af10-common-which', 2),
        ask('af10-common-value', 2),
      ],
      skillCheck: [ask('af10-common-tiles', 2), ask('af10-common-flow', 2), ask('af10-common-value', 2)],
    },
    {
      id: 'af-l10-over',
      title: 'A Fraction over a Fraction',
      slides: [
        teach(
          prose(
            'A fraction over a fraction is the top fraction divided by the bottom one. Divide by turning the bottom fraction upside down and multiplying.',
          ),
          working(
            '&\\dfrac{\\frac{3}{x + 1}}{\\frac{2}{x - 4}}',
            '=\\;&\\frac{3}{x + 1} \\times \\frac{x - 4}{2}',
            '=\\;&\\frac{3(x - 4)}{2(x + 1)}',
          ),
          prose('Leave the brackets as they are. The factorised form shows at once that nothing cancels.'),
        ),
        ask('af10-over-steps'),
        ask('af10-over-tiles'),
        ask('af10-over-which'),
        teach(
          prose(
            'When one of the small bottoms is a quadratic, factorise it. A bracket then appears on the top and on the bottom, and cancels.',
          ),
          working(
            '&\\dfrac{\\frac{5}{x^{2} + 3x + 2}}{\\frac{2}{x + 1}}',
            '=\\;&\\frac{5}{(x + 1)(x + 2)} \\times \\frac{x + 1}{2}',
            '=\\;&\\frac{5}{2(x + 2)}',
          ),
        ),
        ask('af10-over-cancel-flow'),
        ask('af10-over-steps', 2),
        ask('af10-over-tiles', 2),
        teach(
          prose(
            'The quadratic can be in either small bottom. Turning the bottom fraction over carries its quadratic up to the top, and the cancelling works the same way:',
          ),
          working(
            '&\\dfrac{\\frac{4}{x - 3}}{\\frac{3}{x^{2} - x - 6}}',
            '=\\;&\\frac{4}{x - 3} \\times \\frac{(x - 3)(x + 2)}{3}',
            '=\\;&\\frac{4(x + 2)}{3}',
          ),
          prose('The slip to watch for is multiplying straight across without turning the bottom fraction over.'),
        ),
        ask('af10-over-which', 2),
        ask('af10-over-cancel-flow', 2),
      ],
      skillCheck: [ask('af10-over-steps', 2), ask('af10-over-tiles', 2), ask('af10-over-cancel-flow', 2)],
    },
    {
      id: 'af-l10-stacked',
      title: 'Stacked Fractions',
      slides: [
        teach(
          prose(
            'A fraction can sit inside the bottom of another fraction. Work from the inside out: write the deepest part as one fraction, divide by it, then add what is in front.',
          ),
          maths('1 + \\dfrac{1}{1 + \\frac{1}{x}}'),
          working(
            '1 + \\frac{1}{x} &= \\frac{x + 1}{x}',
            '\\dfrac{1}{\\frac{x + 1}{x}} &= \\frac{x}{x + 1}',
            '1 + \\frac{x}{x + 1} &= \\frac{2x + 1}{x + 1}',
          ),
          prose('Dividing $1$ by a fraction turns the fraction upside down. The last line writes $1$ as $\\frac{x + 1}{x + 1}$ and adds the tops.'),
        ),
        ask('af10-stack-flow'),
        ask('af10-stack-tree'),
        ask('af10-stack-tiles'),
        teach(
          prose('Minus signs change nothing about the order. Take care that a minus in front of the stacked fraction takes away its whole top.'),
          maths('2 - \\dfrac{3}{1 - \\frac{2}{x}}'),
          working(
            '1 - \\frac{2}{x} &= \\frac{x - 2}{x}',
            '\\dfrac{3}{\\frac{x - 2}{x}} &= \\frac{3x}{x - 2}',
            '2 - \\frac{3x}{x - 2} &= \\frac{2(x - 2) - 3x}{x - 2}',
            '&= \\frac{-x - 4}{x - 2}',
          ),
        ),
        ask('af10-stack-tree', 2),
        ask('af10-stack-tiles', 2),
        teach(
          prose('To find a value, simplify first and then substitute. The last example simplified like this:'),
          maths('2 - \\dfrac{3}{1 - \\frac{2}{x}} = \\frac{-x - 4}{x - 2}'),
          prose('At $x = 3$ the top is $-7$ and the bottom is $1$, so its value is $-7$.'),
          prose(
            'Substituting straight in gives the same: $1 - \\frac{2}{3}$ is $\\frac{1}{3}$, dividing $3$ by $\\frac{1}{3}$ gives $9$, and $2 - 9$ is $-7$. That route needs more arithmetic with fractions.',
          ),
        ),
        ask('af10-stack-value'),
        ask('af10-stack-flow', 2),
        ask('af10-stack-value+choice', 2),
      ],
      skillCheck: [ask('af10-stack-tree', 2), ask('af10-stack-tiles', 2), ask('af10-stack-value', 2)],
    },
    {
      id: 'af-l10-equations',
      title: 'Equations with a Fraction inside a Fraction',
      slides: [
        teach(
          prose('To solve an equation with a compound fraction in it, make that side one fraction first, then clear it as usual.'),
          working(
            '\\dfrac{1 + \\frac{1}{x}}{1 - \\frac{1}{x}} &= 3',
            '\\frac{x + 1}{x - 1} &= 3',
            'x + 1 &= 3(x - 1)',
            'x + 1 &= 3x - 3',
            'x &= 2',
          ),
          prose('Then check: at $x = 2$ neither $x$ nor $x - 1$ is zero, so $x = 2$ stands.'),
        ),
        ask('af10-eq-steps'),
        ask('af10-eq-solve'),
        ask('af10-eq-steps', 2),
        teach(
          prose(
            'Sometimes a quadratic appears, and one of its solutions is $0$. Every small fraction over $x$ is undefined there, so that solution must be rejected.',
          ),
          working(
            '\\dfrac{x + \\frac{5}{x}}{1 + \\frac{1}{x}} &= 5',
            '\\frac{x^{2} + 5}{x + 1} &= 5',
            'x^{2} + 5 &= 5(x + 1)',
            'x^{2} - 5x &= 0',
            'x(x - 5) &= 0',
          ),
          prose(
            'So $x = 0$ or $x = 5$. At $x = 0$ the small fractions are undefined, so reject it. At $x = 5$ no bottom is zero, so $x = 5$ is the solution.',
          ),
        ),
        ask('af10-eq-quad-tiles'),
        ask('af10-eq-reject-flow'),
        ask('af10-eq-solve', 2),
        teach(
          prose(
            'The main bottom can be zero too, so check it as well. Where it is zero the whole left side is undefined.',
          ),
          working(
            '\\dfrac{x - \\frac{9}{x}}{1 + \\frac{3}{x}} &= -1',
            '\\frac{x^{2} - 9}{x + 3} &= -1',
            'x^{2} - 9 &= -(x + 3)',
            'x^{2} + x - 6 &= 0',
            '(x + 3)(x - 2) &= 0',
          ),
          prose(
            'At $x = -3$ the main bottom, $1 + \\frac{3}{x}$, is zero, so reject it. $x = 2$ makes no bottom zero, so it is the solution. Sometimes neither is rejected, and both stand.',
          ),
        ),
        ask('af10-eq-reject-flow', 2),
        ask('af10-eq-quad-tiles', 2),
      ],
      skillCheck: [ask('af10-eq-steps', 2), ask('af10-eq-reject-flow', 2), ask('af10-eq-solve', 2)],
    },
  ],
  levelCheck: [
    ask('af10-num-tidy-tree', 2),
    ask('af10-num-clear-tiles', 2),
    ask('af10-num-value', 2),
    ask('af10-common-tiles', 2),
    ask('af10-common-flow', 2),
    ask('af10-common-value', 2),
    ask('af10-over-steps', 2),
    ask('af10-over-tiles', 2),
    ask('af10-over-cancel-flow', 2),
    ask('af10-stack-tree', 2),
    ask('af10-stack-value', 2),
    ask('af10-stack-tiles', 2),
    ask('af10-eq-steps', 2),
    ask('af10-eq-reject-flow', 2),
    ask('af10-eq-solve', 2),
  ],
};
