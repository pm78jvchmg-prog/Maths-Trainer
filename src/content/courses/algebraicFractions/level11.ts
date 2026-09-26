/**
 * Level 11: partial fractions with higher powers. Shown in Partial Fractions &
 * Rational Functions, after Quadratic Factors in the Denominator.
 *
 * Level 2 split over a squared bracket. This level takes a bracket cubed, a
 * squared bracket beside two single ones, powers of x, an improper fraction
 * with a repeated factor, and a bottom that mixes all of these with a
 * quadratic that will not split. Generators are in
 * `generators/fractionsLevel11.ts`.
 */
import type { Level } from '../../types';
import { ask, askAfter, maths, prose, teach, working } from './blocks';

export const level11: Level = {
  id: 'af-l11',
  title: 'Partial Fractions with Higher Powers',
  lessons: [
    {
      id: 'af-l11-cubed',
      title: 'A Cubed Factor',
      slides: [
        teach(
          prose('A bracket cubed needs a part over each power of it, up to the cube:'),
          working(
            '&\\frac{2x^{2} + 7x + 9}{(x + 2)^{3}}',
            '=\\;&\\frac{A}{x + 2} + \\frac{B}{(x + 2)^{2}}',
            '&\\quad + \\frac{C}{(x + 2)^{3}}',
          ),
          prose(
            'Three letters, to match the three coefficients of a quadratic top. Multiply both sides by $(x + 2)^{3}$, and the tops agree for every $x$:',
          ),
          working('&2x^{2} + 7x + 9', '=\\;&A(x + 2)^{2} + B(x + 2)', '&\\quad + C'),
        ),
        ask('af11-cubed-form'),
        askAfter(
          'af11-cubed-tree',
          1,
          prose('Put $x = -2$. Both brackets are zero, so only $C$ is left:'),
          working('C &= 2(-2)^{2} + 7(-2) + 9', '&= 8 - 14 + 9', '&= 3'),
          prose('Only $A(x + 2)^{2}$ makes an $x^{2}$ term, so $A = 2$. It also makes $4Ax$, which is $8x$, and $B$ makes up the rest of the $x$ terms:'),
          working('8 + B &= 7', 'B &= -1'),
        ),
        ask('af11-cubed-value'),
        teach(
          prose(
            'Another way: write the top in powers of $u = x + 2$. Then $x = u - 2$, and dividing by $u^{3}$ splits it at once.',
          ),
          working('&2(u - 2)^{2} + 7(u - 2) + 9', '=\\;&2u^{2} - 8u + 8', '&\\quad + 7u - 14 + 9', '=\\;&2u^{2} - u + 3'),
          prose('Divide each term by $u^{3}$:'),
          maths('\\frac{2}{u} - \\frac{1}{u^{2}} + \\frac{3}{u^{3}}'),
          prose('Put $u = x + 2$ back, and the numerators are $2$, $-1$ and $3$, as before.'),
        ),
        ask('af11-cubed-shift-steps'),
        ask('af11-cubed-tiles'),
        ask('af11-cubed-value+choice', 2),
        teach(
          prose(
            'Two slips to watch. At $x = -2$ every part but $C$ is zero, so the top there is $C$ itself: there is nothing to divide by.',
          ),
          prose(
            'And $(u - 2)^{2}$ has a middle term. It is $u^{2} - 4u + 4$, not $u^{2} + 4$, and its last term is $+4$ whatever the sign in the bracket.',
          ),
        ),
        ask('af11-cubed-tree', 2),
        ask('af11-cubed-shift-steps', 2),
      ],
      skillCheck: [ask('af11-cubed-tree', 2), ask('af11-cubed-tiles', 2), ask('af11-cubed-value', 2)],
    },
    {
      id: 'af-l11-four',
      title: 'A Squared Factor with Two Others',
      slides: [
        teach(
          prose('A squared bracket and two single ones make four parts: two for the square, and one for each of the others.'),
          working(
            '&\\frac{x^{3} - 5x^{2} + 3x - 11}{(x - 1)^{2}(x + 2)(x - 3)}',
            '=\\;&\\frac{A}{x - 1} + \\frac{B}{(x - 1)^{2}}',
            '&\\quad + \\frac{C}{x + 2} + \\frac{D}{x - 3}',
          ),
          prose(
            'Cover-up reaches three of them. For $B$, cover $(x - 1)^{2}$ and put $x = 1$ into the rest. The top there is $-12$, and the other brackets make $(3)(-2) = -6$:',
          ),
          working('B &= -12 \\div (-6)', '&= 2'),
        ),
        ask('af11-four-form'),
        askAfter(
          'af11-four-cover-tree',
          1,
          prose('For $C$, cover $(x + 2)$ and put $x = -2$. The top there is $-45$, and the square is $(-3)^{2} = 9$:'),
          working('C &= -45 \\div [9 \\times (-5)]', '&= 1'),
          prose('$D$ comes the same way from $x = 3$: $-20 \\div [4 \\times 5] = -1$.'),
          prose('No value of $x$ isolates $A$. Only $A$, $C$ and $D$ make an $x^{3}$ term, so compare those:'),
          working('A + C + D &= 1', 'A &= 1'),
        ),
        ask('af11-four-value'),
        teach(
          prose(
            'The squared bracket is where the signs go wrong. At $x = -2$, $(x - 1)^{2}$ is $(-3)^{2} = 9$: a square is never negative. Work it bracket by bracket, squaring before you multiply.',
          ),
        ),
        ask('af11-four-square-steps'),
        ask('af11-four-tiles'),
        ask('af11-four-value+choice', 2),
        teach(
          prose(
            'Check a split by putting in a value that is not a root, such as $x = 0$. The fraction gives $\\frac{-11}{(1)(2)(-3)} = \\frac{11}{6}$.',
          ),
          prose('The split gives the same:'),
          working('&\\frac{1}{-1} + \\frac{2}{1} + \\frac{1}{2} + \\frac{-1}{-3}', '=\\;&{-1} + 2 + \\frac{1}{2} + \\frac{1}{3}', '=\\;&\\frac{11}{6}'),
        ),
        ask('af11-four-cover-tree', 2),
        ask('af11-four-square-steps', 2),
      ],
      skillCheck: [ask('af11-four-cover-tree', 2), ask('af11-four-tiles', 2), ask('af11-four-value', 2)],
    },
    {
      id: 'af-l11-powers-of-x',
      title: 'Powers of x',
      slides: [
        teach(
          prose(
            'A power of $x$ is a repeated bracket like any other: $x^{2}$ is $x$ twice. So it needs a part over $x$ and a part over $x^{2}$.',
          ),
          working('&\\frac{3x^{2} + x - 6}{x^{2}(x + 2)}', '=\\;&\\frac{A}{x} + \\frac{B}{x^{2}} + \\frac{C}{x + 2}'),
          prose('Multiply both sides by $x^{2}(x + 2)$:'),
          working('&3x^{2} + x - 6', '=\\;&Ax(x + 2) + B(x + 2)', '&\\quad + Cx^{2}'),
        ),
        ask('af11-xpow-form'),
        askAfter(
          'af11-xpow-tree',
          1,
          prose('Put $x = 0$. Only $B(x + 2)$ is left:'),
          working('-6 &= 2B', 'B &= -3'),
          prose('Put $x = -2$. Only $Cx^{2}$ is left, and $x^{2}$ is $4$ there:'),
          working('3(4) - 2 - 6 &= 4C', 'C &= 1'),
          prose('The $x^{2}$ terms say $A + C = 3$, so $A = 2$.'),
        ),
        ask('af11-xpow-value'),
        teach(
          prose(
            'With $x^{3}$ there are three parts over powers of $x$, and $x = 0$ reaches only the one over $x^{3}$. The rest come from the coefficients, going up one power at a time.',
          ),
          working('&\\frac{3x^{3} + x^{2} - 5x + 3}{x^{3}(x - 1)}', '=\\;&\\frac{A}{x} + \\frac{B}{x^{2}} + \\frac{C}{x^{3}} + \\frac{D}{x - 1}'),
          prose('Multiplied up, the right side is ${Ax^{2}(x - 1)} + {Bx(x - 1)} + {C(x - 1)} + Dx^{3}$. Match from the numbers upwards:'),
          working(
            '\\text{numbers:} &\\;\\; -C = 3',
            'x \\text{ terms:} &\\;\\; C - B = -5',
            'x^{2} \\text{ terms:} &\\;\\; B - A = 1',
            'x^{3} \\text{ terms:} &\\;\\; A + D = 3',
          ),
          prose('So $C = -3$, $B = 2$, $A = 1$ and $D = 2$. Each line has one new letter, which is why the order matters.'),
        ),
        ask('af11-xpow-flow'),
        ask('af11-xpow-tiles'),
        ask('af11-xpow-tree', 2),
        teach(
          prose(
            'Two slips. At $x = 0$ the part over $x^{2}$ leaves $B$ times the bracket’s number, $2B$ above, so divide by it. And at $x = -2$, $x^{2}$ is $+4$ and $x^{3}$ is $-8$: an odd power keeps the sign.',
          ),
        ),
        ask('af11-xpow-value+choice', 2),
        ask('af11-xpow-flow', 2),
      ],
      skillCheck: [ask('af11-xpow-tree', 2), ask('af11-xpow-tiles', 2), ask('af11-xpow-value', 2)],
    },
    {
      id: 'af-l11-whole-part',
      title: 'Repeated Factors with a Whole Part',
      slides: [
        teach(
          prose(
            'A repeated factor does not change the first rule: if the top’s degree is at least the bottom’s, divide first.',
          ),
          working('&\\frac{2x^{2} + 7x + 4}{(x + 1)^{2}}', '=\\;&2 + \\frac{3x + 2}{(x + 1)^{2}}'),
          prose('The bottom multiplies out to $x^{2} + 2x + 1$. Taking $2$ lots of it from the top leaves $3x + 2$. Then split what is left as before:'),
          working('3x + 2 &= A(x + 1) + B'),
          prose('The $x$ terms give $A = 3$, and $x = -1$ gives $B = -1$.'),
        ),
        ask('af11-whole-flow'),
        ask('af11-whole-rest-tree'),
        ask('af11-whole-tiles'),
        teach(
          prose(
            'Cover-up works on the original top as well. At $x = -1$ the whole number times the bottom is zero too, so the top there is $B$:',
          ),
          working('B &= 2 - 7 + 4', '&= -1'),
        ),
        ask('af11-whole-value'),
        ask('af11-whole-steps'),
        teach(
          prose(
            'With a third bracket the bottom is a cubic. $(x - 1)^{2}(x + 2)$ multiplies out to $x^{3} - 3x + 2$, so a cubic top gives a whole number from the $x^{3}$ terms:',
          ),
          working(
            '&\\frac{x^{3} + x^{2} + 2x - 1}{(x - 1)^{2}(x + 2)}',
            '=\\;&1 + \\frac{x^{2} + 5x - 3}{(x - 1)^{2}(x + 2)}',
          ),
          prose(
            'Cover-up on the original top: at $x = 1$ it is $3$, and $(x + 2)$ is $3$, so $B = 1$. At $x = -2$ it is $-9$, and $(x - 1)^{2}$ is $9$, so $C = -1$. The $x^{2}$ terms of what is left give $A + C = 1$, so $A = 2$.',
          ),
        ),
        ask('af11-whole-tiles', 2),
        ask('af11-whole-value+choice', 2),
        ask('af11-whole-flow', 2),
      ],
      skillCheck: [ask('af11-whole-flow', 2), ask('af11-whole-tiles', 2), ask('af11-whole-rest-tree', 2)],
    },
    {
      id: 'af-l11-choosing',
      title: 'Choosing the Form',
      slides: [
        teach(
          prose('Each factor of the bottom brings its own parts:'),
          working(
            '(x + a) &: \\frac{A}{x + a}',
            '(x + a)^{2} &: \\frac{A}{x + a} + \\frac{B}{(x + a)^{2}}',
            'x^{2} + c &: \\frac{Ax + B}{x^{2} + c}',
          ),
          prose(
            'A cube takes three parts, one over each power, and a power of $x$ counts as a repeated bracket. A quadratic keeps $Ax + B$ on top only when it will not factorise.',
          ),
          prose(
            'Count the unknowns: one per letter. They always match the degree of the bottom, since a proper top has exactly that many coefficients to match.',
          ),
        ),
        ask('af11-choose-form'),
        ask('af11-choose-tiles'),
        ask('af11-choose-count'),
        teach(
          prose(
            'Check a quadratic factor before trusting it. Its discriminant $b^{2} - 4ac$ settles it: negative means it stays whole, and a square means it splits into brackets.',
          ),
          working('x^{2} + 2x + 5: &\\; 4 - 20 = -16', 'x^{2} + x - 6: &\\; 1 + 24 = 25'),
          prose('So $x^{2} + x - 6 = (x - 2)(x + 3)$ brings two single parts, not one part with $Ax + B$ on top.'),
        ),
        ask('af11-choose-flow'),
        ask('af11-choose-form', 2),
        ask('af11-choose-tiles', 2),
        teach(
          prose('Once the form is right, cover-up finds the number over the top power of each linear factor.'),
          working(
            '&\\frac{2x^{3} + 2x^{2} + 9x - 3}{(x - 1)^{2}(x^{2} + 4)}',
            '=\\;&\\frac{A}{x - 1} + \\frac{B}{(x - 1)^{2}}',
            '&\\quad + \\frac{Cx + D}{x^{2} + 4}',
          ),
          prose('For $B$, put $x = 1$. The top there is $10$, and $x^{2} + 4$ there is $5$:'),
          working('B &= 10 \\div 5', '&= 2'),
        ),
        ask('af11-choose-value'),
        ask('af11-choose-value+choice', 2),
      ],
      skillCheck: [ask('af11-choose-flow', 2), ask('af11-choose-tiles', 2), ask('af11-choose-value', 2)],
    },
  ],
  levelCheck: [
    ask('af11-cubed-tree', 2),
    ask('af11-cubed-value', 2),
    ask('af11-cubed-shift-steps', 2),
    ask('af11-four-cover-tree', 2),
    ask('af11-four-value', 2),
    ask('af11-four-tiles', 2),
    ask('af11-xpow-tree', 2),
    ask('af11-xpow-flow', 2),
    ask('af11-xpow-value', 2),
    ask('af11-whole-flow', 2),
    ask('af11-whole-tiles', 2),
    ask('af11-whole-value', 2),
    ask('af11-choose-form', 2),
    ask('af11-choose-value', 2),
    ask('af11-choose-tiles', 2),
  ],
};
