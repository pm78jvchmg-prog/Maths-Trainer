/**
 * Binomial Expansion.
 *
 * Level 1 builds Pascal's triangle and expands with it: rows and their
 * patterns, (1 + x)^n, brackets with numbers in them, the signs a negative part
 * brings when both parts carry a number, and one term picked out on its own.
 * Level 2 names the triangle's entries: factorials and nCr, nCr as the
 * coefficient of a term and the general term that follows, estimating a power
 * from the first three terms, and a bracket multiplied by an expansion.
 *
 * Every n here is a whole number. The series for negative and fractional n,
 * with its range of validity, is a later level of this course.
 *
 * Each level closes with a level check: twelve to fifteen questions, no
 * teaching slides, one attempt each.
 */
import type { Block, Course, SlideRef } from '../types';

const teach = (...blocks: Block[]): SlideRef => ({
  type: 'literal',
  slide: { kind: 'teach', body: blocks },
});

const ask = (generatorId: string, difficulty = 1): SlideRef => ({
  type: 'generated',
  generatorId,
  difficulty,
});

const prose = (text: string): Block => ({ kind: 'prose', text });
const maths = (tex: string): Block => ({ kind: 'display', tex });

export const binomialExpansion: Course = {
  id: 'binomial-expansion',
  title: 'Binomial Expansion',
  blurb: "Pascal's triangle and nCr: expanding a bracket to a power, picking out one term, and estimating powers.",
  levels: [
    {
      id: 'be-l1',
      title: "Pascal's Triangle and (a + b)ⁿ",
      lessons: [
        {
          id: 'be-l1-triangle',
          title: "Building Pascal's Triangle",
          slides: [
            teach(
              prose(
                "Pascal's triangle starts with a single $1$, called row $0$. Every row starts and ends with $1$, and every other number is the sum of the two above it.",
              ),
              maths(
                '\\begin{array}{c} 1 \\\\ 1 \\quad 1 \\\\ 1 \\quad 2 \\quad 1 \\\\ 1 \\quad 3 \\quad 3 \\quad 1 \\\\ 1 \\quad 4 \\quad 6 \\quad 4 \\quad 1 \\end{array}',
              ),
              prose(
                'Row $n$ holds the numbers in the expansion of $(a + b)^n$. Row $2$ is $1 \\; 2 \\; 1$, and $(a + b)^2 = a^2 + 2ab + b^2$.',
              ),
            ),
            ask('bin-pascal-row'),
            ask('bin-pascal-tree'),
            ask('bin-row-facts'),
            teach(
              prose('Two patterns check a row. It reads the same from either end, and it adds up to a power of $2$.'),
              maths('1 + 4 + 6 + 4 + 1 = 16 = 2^{4}'),
              prose(
                'Every number is added into two below it, so each row adds to twice the one above. Row $n$ adds to $2^n$, and $(a + b)^n$ has $n + 1$ terms.',
              ),
            ),
            ask('bin-pascal-error'),
            ask('bin-pascal-tree'),
            ask('bin-row-facts+choice'),
            teach(
              prose('The second number in row $n$ is always $n$, and the numbers rise to the middle and fall again.'),
              maths('\\text{row } 6: \\quad 1 \\quad 6 \\quad 15 \\quad 20 \\quad 15 \\quad 6 \\quad 1'),
            ),
            ask('bin-pascal-row'),
            ask('bin-pascal-error'),
          ],
          skillCheck: [ask('bin-pascal-row', 2), ask('bin-pascal-tree', 2), ask('bin-pascal-error', 2)],
        },
        {
          id: 'be-l1-one-x',
          title: 'Expanding (1 + x)ⁿ',
          slides: [
            teach(
              prose('$(1 + x)^n$ expands with row $n$ as its coefficients, and the power of $x$ rising by one each term.'),
              maths('(1 + x)^{3} = 1 + 3x + 3x^{2} + x^{3}'),
              maths('(1 + x)^{4} = 1 + 4x + 6x^{2} + 4x^{3} + x^{4}'),
              prose(
                'Multiplying out gives the same. Each term picks $1$ or $x$ from each bracket, and the triangle counts the ways to pick.',
              ),
            ),
            ask('bin-one-x-tiles'),
            ask('bin-one-x-coeff'),
            ask('bin-row-facts'),
            teach(
              prose('In $(1 - x)^n$ the second part is $-x$. An even power of it is positive and an odd power negative, so the signs alternate.'),
              maths('(1 - x)^{4} = 1 - 4x + 6x^{2} - 4x^{3} + x^{4}'),
              prose('The same goes for any negative part: its power decides the sign.'),
            ),
            ask('bin-sign-flow'),
            ask('bin-one-x-tiles'),
            ask('bin-one-x-coeff+choice'),
            teach(
              prose(
                'The coefficient of $x^k$ is the number in place $k$ of the row, counting from $0$. In $(1 + x)^6$ the $x^2$ term takes place $2$ of $1 \\; 6 \\; 15 \\; 20 \\; 15 \\; 6 \\; 1$: $15x^2$.',
              ),
              prose('Put $x = 1$ and every term becomes its coefficient: they add to $2^n$.'),
            ),
            ask('bin-sign-flow'),
            ask('bin-row-facts+choice'),
          ],
          skillCheck: [ask('bin-one-x-tiles', 2), ask('bin-one-x-coeff', 2), ask('bin-sign-flow', 2)],
        },
        {
          id: 'be-l1-numbers',
          title: 'Brackets with Numbers',
          slides: [
            teach(
              prose(
                'The triangle works for any two-part bracket. In $(a + b)^n$ each term is a number from row $n$, times $a$ to one power and $b$ to another, the powers adding to $n$.',
              ),
              maths('(a + b)^{3} = a^{3} + 3a^{2}b + 3ab^{2} + b^{3}'),
              prose('Put $x$ for $a$ and $2$ for $b$, and raise the $2$ to its power:'),
              maths('\\begin{aligned} (x + 2)^{3} &= x^{3} + 3x^{2}(2) + 3x(2)^{2} + 2^{3} \\\\ &= x^{3} + 6x^{2} + 12x + 8 \\end{aligned}'),
            ),
            ask('bin-term-tiles'),
            ask('bin-expand-tiles'),
            ask('bin-coeff'),
            teach(
              prose('The powers of the number are where the size comes from. The $x^2$ term of $(x + 3)^4$:'),
              maths('6 \\times x^{2} \\times 3^{2} = 54x^{2}'),
              prose('The $6$ is place $2$ of row $4$, and the $3$ is squared because $x$ has taken the other two of the four.'),
            ),
            ask('bin-term-reduce'),
            ask('bin-term-tiles'),
            ask('bin-coeff+choice'),
            teach(
              prose('A negative number keeps its sign inside the power, so odd powers of it are negative:'),
              maths('\\begin{aligned} (x - 2)^{3} &= x^{3} + 3x^{2}(-2) + 3x(-2)^{2} + (-2)^{3} \\\\ &= x^{3} - 6x^{2} + 12x - 8 \\end{aligned}'),
              prose('And a number stuck to $x$ is raised with it: the $x^2$ term of $(1 + 2x)^3$ is $3(2x)^2 = 12x^2$.'),
            ),
            ask('bin-term-reduce+choice'),
            ask('bin-expand-tiles'),
          ],
          skillCheck: [ask('bin-term-tiles', 2), ask('bin-coeff', 2), ask('bin-term-reduce', 2)],
        },
        {
          id: 'be-l1-signs',
          title: 'Signs and Powers: (2x − 3)ⁿ',
          slides: [
            teach(
              prose('When both parts carry a number, both numbers are raised to their powers. The $x^2$ term of $(2x - 3)^4$:'),
              maths('6 \\times (2x)^{2} \\times (-3)^{2} = 6 \\times 4x^{2} \\times 9 = 216x^{2}'),
              prose('Two slips to avoid: $(2x)^2$ is $4x^2$, not $2x^2$, and the $-3$ takes its sign into the power.'),
            ),
            ask('bin-split-tree'),
            ask('bin-sign-flow', 2),
            ask('bin-expand-tiles', 2),
            teach(
              prose(
                'The sign of a term depends only on the power of the negative part: even gives positive, odd gives negative. So the signs of $(2x - 3)^n$ alternate, starting with $+$.',
              ),
              maths('(2x - 3)^{3} = 8x^{3} - 36x^{2} + 54x - 27'),
            ),
            ask('bin-pick-term+choice', 2),
            ask('bin-term-reduce', 2),
            ask('bin-split-tree', 2),
            teach(
              prose('Check a whole expansion by putting $x = 1$. The terms must add to the bracket at $x = 1$:'),
              maths('(2 - 3)^{4} = 1'),
              maths('16 - 96 + 216 - 216 + 81 = 1'),
            ),
            ask('bin-expand-tiles', 2),
            ask('bin-sign-flow', 2),
          ],
          skillCheck: [ask('bin-split-tree', 2), ask('bin-expand-tiles', 2), ask('bin-sign-flow', 2)],
        },
        {
          id: 'be-l1-one-term',
          title: 'Picking Out One Term',
          slides: [
            teach(
              prose(
                'One term does not need the rest. Decide the powers first: in $(x + 2)^6$ the $x^4$ term has $x$ to the power $4$, so $2$ to the power $2$.',
              ),
              prose('Then take the number from row $6$ in place $2$, the power of the second part, counting from $0$:'),
              maths('15 \\times x^{4} \\times 2^{2} = 60x^{4}'),
            ),
            ask('bin-pick-term'),
            ask('bin-term-tiles', 2),
            ask('bin-coeff', 2),
            teach(
              prose(
                'Which part carries $x$ changes the count. In $(2 + x)^6$ the $x^4$ term has $x$ to the power $4$ as the second part, so it takes place $4$ of the row, and $2^2$:',
              ),
              maths('15 \\times 2^{2} \\times x^{4} = 60x^{4}'),
              prose('The row is symmetrical, so places $2$ and $4$ hold the same number anyway.'),
            ),
            ask('bin-split-tree'),
            ask('bin-find-k'),
            ask('bin-pick-term+choice'),
            teach(
              prose('Working backwards: when a coefficient is given, write it in terms of the unknown and solve.'),
              maths('(1 + kx)^{5}: \\quad x^{2} \\text{ term} = 10(kx)^{2} = 10k^{2}x^{2}'),
              prose('If that coefficient is $90$, then $k^2 = 9$ and $k = 3$, taking $k > 0$.'),
            ),
            ask('bin-find-k+choice'),
            ask('bin-coeff+choice', 2),
          ],
          skillCheck: [ask('bin-pick-term', 2), ask('bin-find-k', 2), ask('bin-coeff', 2)],
        },
      ],
      levelCheck: [
        ask('bin-pascal-row', 2),
        ask('bin-pascal-tree', 2),
        ask('bin-pascal-error', 2),
        ask('bin-row-facts+choice', 2),
        ask('bin-one-x-tiles', 2),
        ask('bin-one-x-coeff', 2),
        ask('bin-sign-flow', 2),
        ask('bin-term-tiles', 2),
        ask('bin-term-reduce+choice', 2),
        ask('bin-expand-tiles', 2),
        ask('bin-split-tree', 2),
        ask('bin-coeff', 2),
        ask('bin-pick-term', 2),
        ask('bin-find-k', 2),
      ],
    },
  ],
};
