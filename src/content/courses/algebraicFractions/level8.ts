/**
 * Algebraic Fractions, level 8: factorising to simplify.
 *
 * Level 1 cancels brackets already in view. This level does the factorising
 * that has to come first: a number and a power of x out together, a
 * difference of two squares with a number in front, a quadratic with a number
 * in front by the ac method, cubics by a common x or by grouping, and then all
 * of it used to shrink a product, a quotient or a sum before working it out.
 * Generators are in `generators/fractionsLevel8.ts`.
 */
import type { Level } from '../../types';
import { ask, askAfter, maths, prose, teach, working } from './blocks';

export const level8: Level = {
  id: 'af-l8',
  title: 'Factorising to Simplify',
  lessons: [
    {
      id: 'af-l8-common',
      title: 'Common Factors First',
      slides: [
        teach(
          prose(
            'Nothing cancels until both lines are factorised. Start with the highest common factor: the largest number that divides every coefficient, times the lowest power of $x$ in every term.',
          ),
          working('&6x^{2} + 9x', '=\\;&3x(2x + 3)'),
          prose('$3$ is the largest number dividing $6$ and $9$, and every term has at least one $x$. Divide each term by $3x$ to fill the bracket.'),
          working('&4x^{3} - 10x^{2}', '=\\;&2x^{2}(2x - 5)'),
          prose('Here every term has at least $x^{2}$, so $x^{2}$ comes out.'),
        ),
        ask('af8-hcf-tiles'),
        askAfter(
          'af8-hcf-simplify',
          1,
          prose('Take the common factor out of each line, then cancel what the lines share:'),
          working('&\\frac{6x^{2} + 9x}{3x^{2} - 12x}', '=\\;&\\frac{3x(2x + 3)}{3x(x - 4)}', '=\\;&\\frac{2x + 3}{x - 4}'),
        ),
        ask('af8-hcf-flow'),
        teach(
          prose(
            'The two lines need not share all of their common factor. Cancel the largest number dividing both and the lower power of $x$; what is left over stays.',
          ),
          working(
            '&\\frac{4x^{3} + 8x^{2}}{6x^{2} - 9x}',
            '=\\;&\\frac{4x^{2}(x + 2)}{3x(2x - 3)}',
            '=\\;&\\frac{4x(x + 2)}{3(2x - 3)}',
          ),
          prose('$4$ and $3$ share no factor, so both stay. $x^{2}$ over $x$ leaves one $x$ on top.'),
          prose('When the numbers do share a factor, it cancels as in a number fraction: $6$ over $4$ leaves $3$ over $2$.'),
        ),
        ask('af8-hcf-tiles', 2),
        ask('af8-hcf-simplify+choice', 2),
        ask('af8-hcf-flow', 2),
        teach(
          prose(
            'Cancelling $x$ changes nothing, except at $x = 0$. There the original fraction is $\\frac{0}{0}$, which is undefined, but the simplified form still has a value.',
          ),
          working('&\\frac{2x^{2} - 8x}{x^{2} + 2x}', '=\\;&\\frac{2x(x - 4)}{x(x + 2)}', '=\\;&\\frac{2(x - 4)}{x + 2}'),
          prose('At $x = 0$ the simplified form is $\\frac{2 \\times (-4)}{2} = -4$. On the graph that is a single missing point, a hole.'),
        ),
        ask('af8-hcf-hole'),
        ask('af8-hcf-hole', 2),
      ],
      skillCheck: [ask('af8-hcf-simplify', 2), ask('af8-hcf-flow', 2), ask('af8-hcf-hole', 2)],
    },
    {
      id: 'af-l8-squares',
      title: 'Differences of Two Squares',
      slides: [
        teach(
          prose(
            'A difference of two squares factorises as $A^{2} - B^{2} = (A - B)(A + B)$. The first square can have a number in front of $x^{2}$, as long as that number is a square too:',
          ),
          working('&4x^{2} - 9', '=\\;&(2x)^{2} - 3^{2}', '=\\;&(2x - 3)(2x + 3)'),
          prose('The two brackets are the same except for the sign, and their order does not matter.'),
        ),
        ask('af8-dots-tiles'),
        askAfter(
          'af8-dots-simplify+choice',
          1,
          prose('Factorise both lines, then cancel the bracket they share:'),
          working('&\\frac{4x^{2} - 9}{2x^{2} + 3x}', '=\\;&\\frac{(2x - 3)(2x + 3)}{x(2x + 3)}', '=\\;&\\frac{2x - 3}{x}'),
        ),
        ask('af8-dots-chain-steps'),
        teach(
          prose('Take out a common factor first. What is left is often a difference of two squares:'),
          working('&2x^{2} - 18', '=\\;&2(x^{2} - 9)', '=\\;&2(x - 3)(x + 3)'),
          prose('Then simplify as before:'),
          working('&\\frac{2x^{2} - 18}{x^{2} + 3x}', '=\\;&\\frac{2(x - 3)(x + 3)}{x(x + 3)}', '=\\;&\\frac{2(x - 3)}{x}'),
        ),
        ask('af8-dots-tiles', 2),
        ask('af8-dots-simplify', 2),
        ask('af8-dots-chain-steps', 2),
        teach(
          prose(
            'Where the cancelled bracket is zero, the original fraction is undefined, but the simplified form has a value there.',
          ),
          working('&\\frac{4x^{2} - 9}{2x - 3}', '=\\;&\\frac{(2x - 3)(2x + 3)}{2x - 3}', '=\\;&2x + 3'),
          prose('The bottom is zero at $x = \\frac{3}{2}$. There $2x = 3$, so the simplified form is $3 + 3 = 6$.'),
          prose(
            'With something left on the bottom, work out the top and the bottom separately. At $x = \\frac{3}{2}$, $\\frac{2x + 3}{x}$ is $6 \\div \\frac{3}{2} = 4$.',
          ),
        ),
        ask('af8-dots-hole'),
        ask('af8-dots-hole', 2),
      ],
      skillCheck: [ask('af8-dots-simplify', 2), ask('af8-dots-chain-steps', 2), ask('af8-dots-hole', 2)],
    },
    {
      id: 'af-l8-number-in-front',
      title: 'Quadratics with a Number in Front',
      slides: [
        teach(
          prose(
            'To factorise $ax^{2} + bx + c$ when $a$ is not $1$, find two numbers that multiply to $ac$ and add to $b$. Use them to split the middle term, then factorise in pairs.',
          ),
          working('&2x^{2} + 5x + 3', '=\\;&2x^{2} + 2x + 3x + 3', '=\\;&2x(x + 1) + 3(x + 1)', '=\\;&(2x + 3)(x + 1)'),
          prose(
            'Here $ac = 2 \\times 3 = 6$, and $2$ and $3$ multiply to $6$ and add to $5$. Both pairs leave the same bracket, $(x + 1)$, and that is what lets it come out.',
          ),
        ),
        ask('af8-ac-tree'),
        ask('af8-ac-tiles'),
        askAfter(
          'af8-ac-simplify+choice',
          1,
          prose('Once the top is factorised, cancel as before:'),
          working('&\\frac{2x^{2} + 5x + 3}{x^{2} - x - 2}', '=\\;&\\frac{(2x + 3)(x + 1)}{(x + 1)(x - 2)}', '=\\;&\\frac{2x + 3}{x - 2}'),
          prose('A bottom such as $4x + 6$ or $2x^{2} + 3x$ has a common factor: ${2(2x + 3)}$ and ${x(2x + 3)}$.'),
        ),
        teach(
          prose('When $ac$ is negative, the two numbers have opposite signs.'),
          working('&3x^{2} - 5x - 2', '=\\;&3x^{2} - 6x + x - 2', '=\\;&3x(x - 2) + 1(x - 2)', '=\\;&(3x + 1)(x - 2)'),
          prose('Here $ac = -6$, and $-6$ and $1$ multiply to $-6$ and add to $-5$. The method is the same when both brackets have a number in front:'),
          working('&6x^{2} + x - 2', '=\\;&6x^{2} + 4x - 3x - 2', '=\\;&2x(3x + 2) - 1(3x + 2)', '=\\;&(2x - 1)(3x + 2)'),
        ),
        ask('af8-ac-tree', 2),
        ask('af8-ac-tiles', 2),
        ask('af8-ac-flow'),
        teach(
          prose('With a number in front on both lines, factorise each by the $ac$ method, then cancel:'),
          working(
            '&\\frac{2x^{2} + 5x + 3}{2x^{2} + x - 3}',
            '=\\;&\\frac{(2x + 3)(x + 1)}{(2x + 3)(x - 1)}',
            '=\\;&\\frac{x + 1}{x - 1}',
          ),
          prose('A bottom like $4x^{2} - 9$ is a difference of two squares instead: ${(2x - 3)(2x + 3)}$.'),
        ),
        ask('af8-ac-simplify', 2),
        ask('af8-ac-flow', 2),
      ],
      skillCheck: [ask('af8-ac-tiles', 2), ask('af8-ac-simplify', 2), ask('af8-ac-flow', 2)],
    },
    {
      id: 'af-l8-cubics',
      title: 'Grouping and Cubics',
      slides: [
        teach(
          prose('A cubic with no number term has $x$ as a common factor. Take it out, then factorise what is left.'),
          working('&x^{3} - 4x', '=\\;&x(x^{2} - 4)', '=\\;&x(x - 2)(x + 2)'),
          working('&x^{3} + x^{2} - 6x', '=\\;&x(x^{2} + x - 6)', '=\\;&x(x + 3)(x - 2)'),
          prose('When every coefficient shares a number, take it out with the $x$:'),
          working('&2x^{3} - 18x', '=\\;&2x(x^{2} - 9)', '=\\;&2x(x - 3)(x + 3)'),
        ),
        ask('af8-cubic-tiles'),
        askAfter(
          'af8-cubic-simplify+choice',
          1,
          prose('Factorise the cubic fully and the bottom too, then cancel:'),
          working('&\\frac{x^{3} - 4x}{x^{2} + 5x + 6}', '=\\;&\\frac{x(x - 2)(x + 2)}{(x + 2)(x + 3)}', '=\\;&\\frac{x(x - 2)}{x + 3}'),
        ),
        askAfter(
          'af8-cubic-hole',
          1,
          prose('Where the cancelled bracket is zero the fraction is undefined, but the simplified form has a value. For this fraction, undefined at $x = 3$:'),
          working('&\\frac{x^{3} - 9x}{x - 3}', '=\\;&\\frac{x(x - 3)(x + 3)}{x - 3}', '=\\;&x(x + 3)'),
          prose('At $x = 3$ that is $3 \\times 6 = 18$.'),
        ),
        teach(
          prose(
            'Four terms can often be factorised in pairs. Take a common factor out of each pair. If the same bracket is left in both, it is a factor of the whole.',
          ),
          working('&x^{3} + 2x^{2} - x - 2', '=\\;&x^{2}(x + 2) - (x + 2)', '=\\;&(x^{2} - 1)(x + 2)', '=\\;&(x - 1)(x + 1)(x + 2)'),
          prose('Watch the sign in the second pair: $-x - 2$ is $-1$ times $(x + 2)$. What is left, $x^{2} - 1$, is a difference of two squares.'),
        ),
        ask('af8-group-steps'),
        ask('af8-cubic-tiles', 2),
        ask('af8-cubic-simplify', 2),
        teach(
          prose('With a number in front of $x^{3}$ the pairs work the same way:'),
          working(
            '&2x^{3} + 3x^{2} - 8x - 12',
            '=\\;&x^{2}(2x + 3) - 4(2x + 3)',
            '=\\;&(x^{2} - 4)(2x + 3)',
            '=\\;&(x - 2)(x + 2)(2x + 3)',
          ),
          prose('On top of a fraction, a cubic like this is factorised fully first; then the bottom’s bracket can be found and cancelled.'),
        ),
        ask('af8-group-steps', 2),
        ask('af8-cubic-hole', 2),
      ],
      skillCheck: [ask('af8-group-steps', 2), ask('af8-cubic-simplify', 2), ask('af8-cubic-hole', 2)],
    },
    {
      id: 'af-l8-combine',
      title: 'Simplify, Then Combine',
      slides: [
        teach(
          prose(
            'Before multiplying fractions, factorise every line and cancel. Use every tool of this level: a common factor, a difference of two squares, the $ac$ method. What is left is far smaller than the product multiplied out.',
          ),
          working(
            '&\\frac{4x^{2} - 9}{x^{2} - 1} \\times \\frac{x + 1}{2x + 3}',
            '=\\;&\\frac{(2x - 3)(2x + 3)}{(x - 1)(x + 1)}',
            '&\\times \\frac{x + 1}{2x + 3}',
            '=\\;&\\frac{2x - 3}{x - 1}',
          ),
          prose('To find its value at, say, $x = 3$, substitute into the simplified form: $\\frac{6 - 3}{3 - 1} = \\frac{3}{2}$.'),
        ),
        ask('af8-combo-multiply'),
        ask('af8-combo-value'),
        askAfter(
          'af8-combo-divide-steps',
          1,
          prose('To divide, turn the second fraction over and multiply, then factorise and cancel:'),
          working(
            '&\\frac{2x^{2} + 5x + 3}{x^{2} - 4} \\div \\frac{2x + 3}{x + 2}',
            '=\\;&\\frac{2x^{2} + 5x + 3}{x^{2} - 4} \\times \\frac{x + 2}{2x + 3}',
            '=\\;&\\frac{(2x + 3)(x + 1)}{(x - 2)(x + 2)} \\times \\frac{x + 2}{2x + 3}',
            '=\\;&\\frac{x + 1}{x - 2}',
          ),
        ),
        teach(
          prose('The fraction you divide by may need factorising too. Turn it over, then factorise all four lines before cancelling:'),
          working(
            '&\\frac{x^{2} - 9}{2x^{2} + x - 1} \\div \\frac{3x + 9}{x^{2} + x}',
            '=\\;&\\frac{x^{2} - 9}{2x^{2} + x - 1} \\times \\frac{x^{2} + x}{3x + 9}',
            '=\\;&\\frac{(x - 3)(x + 3)}{(2x - 1)(x + 1)}',
            '&\\times \\frac{x(x + 1)}{3(x + 3)}',
            '=\\;&\\frac{x(x - 3)}{3(2x - 1)}',
          ),
        ),
        ask('af8-combo-divide-steps', 2),
        ask('af8-combo-multiply+choice', 2),
        ask('af8-combo-value', 2),
        teach(
          prose('Simplify each fraction before adding. Often they then share a bottom, and the tops add straight away.'),
          maths('\\frac{2x^{2} + 7x + 3}{x^{2} + 5x + 6} + \\frac{4x - 4}{x^{2} + x - 2}'),
          working('\\frac{(2x + 1)(x + 3)}{(x + 2)(x + 3)} &= \\frac{2x + 1}{x + 2}', '\\frac{4(x - 1)}{(x + 2)(x - 1)} &= \\frac{4}{x + 2}'),
          prose('Both are over $x + 2$ now, so the sum is $\\frac{2x + 5}{x + 2}$. Subtracting works the same way, taking away the whole of the second top.'),
        ),
        ask('af8-combo-add-tree'),
        ask('af8-combo-add-tree', 2),
      ],
      skillCheck: [ask('af8-combo-multiply', 2), ask('af8-combo-divide-steps', 2), ask('af8-combo-add-tree', 2)],
    },
  ],
  levelCheck: [
    ask('af8-hcf-simplify', 2),
    ask('af8-dots-tiles', 2),
    ask('af8-ac-tree', 2),
    ask('af8-group-steps', 2),
    ask('af8-combo-multiply+choice', 2),
    ask('af8-hcf-hole', 2),
    ask('af8-dots-simplify+choice', 2),
    ask('af8-ac-tiles', 2),
    ask('af8-cubic-tiles', 2),
    ask('af8-combo-divide-steps', 2),
    ask('af8-hcf-flow', 2),
    ask('af8-dots-hole', 2),
    ask('af8-ac-simplify', 2),
    ask('af8-cubic-hole', 2),
    ask('af8-combo-add-tree', 2),
  ],
};
