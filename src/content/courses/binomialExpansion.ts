/**
 * Binomial Expansion.
 *
 * Level 1 builds Pascal's triangle and expands with it: rows and their
 * patterns, (1 + x)^n, brackets with numbers in them, the signs a negative part
 * brings when both parts carry a number, and one term picked out on its own.
 * Level 2 names the triangle's entries: factorials and nCr, nCr as the
 * coefficient of a term and the general term that follows, estimating a power
 * from the first three terms, and a bracket multiplied by an expansion.
 * Level 3 works backwards to the unknowns: n and k from two coefficients,
 * neighbouring coefficients equal or in a ratio, the sum of the coefficients,
 * and the number in front of x.
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
  category: 'advanced-algebra',
  position: 40,
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
              prose('Row $6$:'),
              maths('1 \\quad 6 \\quad 15 \\quad 20 \\quad 15 \\quad 6 \\quad 1'),
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
              maths('\\begin{aligned} (1 + x)^{4} &= 1 + 4x + 6x^{2} \\\\ &\\quad + 4x^{3} + x^{4} \\end{aligned}'),
              prose(
                'Multiplying out gives the same. Each term picks $1$ or $x$ from each bracket, and the triangle counts the ways to pick.',
              ),
            ),
            ask('bin-one-x-tiles'),
            ask('bin-one-x-coeff'),
            ask('bin-row-facts'),
            teach(
              prose('In $(1 - x)^n$ the second part is $-x$. An even power of it is positive and an odd power negative, so the signs alternate.'),
              maths('\\begin{aligned} (1 - x)^{4} &= 1 - 4x + 6x^{2} \\\\ &\\quad - 4x^{3} + x^{4} \\end{aligned}'),
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
              maths('\\begin{aligned} (a + b)^{3} &= a^{3} + 3a^{2}b \\\\ &\\quad + 3ab^{2} + b^{3} \\end{aligned}'),
              prose('Put $x$ for $a$ and $2$ for $b$, and raise the $2$ to its power:'),
              maths('\\begin{aligned} (x + 2)^{3} &= x^{3} + 3x^{2}(2) \\\\ &\\quad + 3x(2)^{2} + 2^{3} \\\\ &=x^{3} + 6x^{2} + 12x + 8 \\end{aligned}'),
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
              maths('\\begin{aligned} (x - 2)^{3} &= x^{3} + 3x^{2}(-2) \\\\ &\\quad + 3x(-2)^{2} + (-2)^{3} \\\\ &=x^{3} - 6x^{2} + 12x - 8 \\end{aligned}'),
              prose('And a number stuck to $x$ is raised with it: the $x^2$ term of $(1 + 2x)^3$ is $3(2x)^2 = 12x^2$.'),
            ),
            ask('bin-term-reduce+choice'),
            ask('bin-expand-tiles'),
          ],
          skillCheck: [ask('bin-term-tiles', 2), ask('bin-coeff', 2), ask('bin-term-reduce', 2)],
        },
        {
          id: 'be-l1-signs',
          title: 'Signs and Powers',
          slides: [
            teach(
              prose('When both parts carry a number, both numbers are raised to their powers. The $x^2$ term of $(2x - 3)^4$:'),
              maths('\\begin{aligned} & 6 \\times (2x)^{2} \\times (-3)^{2} \\\\ &= 6 \\times 4x^{2} \\times 9 \\\\ &= 216x^{2} \\end{aligned}'),
              prose('Two slips to avoid: $(2x)^2$ is $4x^2$, not $2x^2$, and the $-3$ takes its sign into the power.'),
            ),
            ask('bin-split-tree'),
            ask('bin-sign-flow', 2),
            ask('bin-expand-tiles', 2),
            teach(
              prose(
                'The sign of a term depends only on the power of the negative part: even gives positive, odd gives negative. So the signs of $(2x - 3)^n$ alternate, starting with $+$.',
              ),
              maths('\\begin{aligned} (2x - 3)^{3} &= 8x^{3} - 36x^{2} \\\\ &\\quad + 54x - 27 \\end{aligned}'),
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
              prose('In $(1 + kx)^5$ the $x^2$ term is'),
              maths('10(kx)^{2} = 10k^{2}x^{2}'),
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
    {
      id: 'be-l2',
      title: 'nCr and the General Term',
      lessons: [
        {
          id: 'be-l2-ncr',
          title: 'Factorials and nCr',
          slides: [
            teach(
              prose('$n!$, read "$n$ factorial", multiplies every whole number from $n$ down to $1$:'),
              maths('5! = 5 \\times 4 \\times 3 \\times 2 \\times 1 = 120'),
              prose('$0!$ is defined to be $1$. A quotient of factorials cancels down:'),
              maths('\\frac{7!}{5!} = 7 \\times 6 = 42'),
            ),
            ask('bin-factorial'),
            ask('bin-ncr-row'),
            ask('bin-factorial+choice'),
            teach(
              prose(
                'The number in place $r$ of row $n$ is called ${}^{n}C_{r}$, counting places from $0$. It counts the ways to choose $r$ things from $n$, and it has a formula:',
              ),
              maths('{}^{n}C_{r} = \\frac{n!}{r! \\, (n - r)!}'),
              maths('{}^{6}C_{2} = \\frac{6!}{2! \\times 4!} = \\frac{6 \\times 5}{2} = 15'),
              prose('Choosing $2$ to take is choosing $4$ to leave, so ${}^{6}C_{4} = 15$ too: the row is symmetrical.'),
            ),
            ask('bin-ncr-reduce'),
            ask('bin-ncr-facts'),
            ask('bin-ncr-row'),
            teach(
              prose('The ends of every row: ${}^{n}C_{0} = {}^{n}C_{n} = 1$, and ${}^{n}C_{1} = n$.'),
              prose('And the triangle\'s own rule, two neighbours adding to the number below them:'),
              maths('{}^{n}C_{r} + {}^{n}C_{r + 1} = {}^{n + 1}C_{r + 1}'),
            ),
            ask('bin-ncr-reduce'),
            ask('bin-ncr-facts+choice'),
          ],
          skillCheck: [ask('bin-factorial', 2), ask('bin-ncr-reduce', 2), ask('bin-ncr-facts', 2)],
        },
        {
          id: 'be-l2-coefficient',
          title: 'nCr as the Coefficient',
          slides: [
            teach(
              prose('With nCr the expansion can be written for any $n$, without the row:'),
              maths(
                '\\begin{aligned} (a + b)^{n} &= a^{n} + {}^{n}C_{1}a^{n - 1}b \\\\ &\\quad + {}^{n}C_{2}a^{n - 2}b^{2} \\\\ &\\quad + \\dots + b^{n} \\end{aligned}',
              ),
              prose('The term with $b^r$ is the **general term**:'),
              maths('{}^{n}C_{r} \\, a^{n - r} \\, b^{r}'),
            ),
            ask('bin-which-r-flow'),
            ask('bin-general-tiles'),
            ask('bin-coeff-ncr'),
            teach(
              prose(
                '$r$ is the power of the second part. If $x$ sits in the first part, as in $(x + 2)^7$, then $x^6$ needs $7 - r = 6$, so $r = 1$.',
              ),
              prose('If it sits in the second, as in $(2 + x)^7$, then $x^6$ needs $r = 6$.'),
            ),
            ask('bin-general-reduce'),
            ask('bin-which-r-flow'),
            ask('bin-coeff-ncr+choice'),
            teach(
              prose('nCr does not have to come from a row you know: cancel the factorials, then multiply by the powers.'),
              maths('{}^{8}C_{3} = \\frac{8 \\times 7 \\times 6}{6} = 56'),
              prose('So the $x^5$ term of $(x + 2)^8$ is'),
              maths('56 \\times x^{5} \\times 2^{3} = 448x^{5}'),
            ),
            ask('bin-general-tiles'),
            ask('bin-general-reduce+choice'),
          ],
          skillCheck: [ask('bin-which-r-flow', 2), ask('bin-general-tiles', 2), ask('bin-coeff-ncr', 2)],
        },
        {
          id: 'be-l2-general',
          title: 'The General Term',
          slides: [
            teach(
              prose('The general term finds a term by its power of $x$, even when $x$ is in both parts:'),
              prose('In $\\left(x + \\frac{2}{x}\\right)^6$ the general term is'),
              maths('\\begin{aligned} & {}^{6}C_{r} \\, x^{6 - r} \\left(\\frac{2}{x}\\right)^{r} \\\\ &= {}^{6}C_{r} \\, 2^{r} \\, x^{6 - 2r} \\end{aligned}'),
              prose('The term **independent** of $x$ has power $0$: $6 - 2r = 0$, so $r = 3$, and the term is $20 \\times 2^3 = 160$.'),
            ),
            ask('bin-free-term'),
            ask('bin-general-tiles', 2),
            ask('bin-coeff-ncr', 2),
            teach(
              prose('Any power works the same way. For $x^2$ in the same expansion, $6 - 2r = 2$, so $r = 2$:'),
              maths('{}^{6}C_{2} \\times 2^{2} = 15 \\times 4 = 60'),
              prose('If the equation for $r$ has no whole-number answer, there is no such term.'),
            ),
            ask('bin-free-term+choice'),
            ask('bin-which-r-flow', 2),
            ask('bin-coeff-ncr+choice', 2),
            teach(
              prose('Working back to $n$ uses ${}^{n}C_{1} = n$ and ${}^{n}C_{2} = \\frac{n(n - 1)}{2}$.'),
              prose('If $(1 + x)^n$ has $x^2$ coefficient $28$, then $n(n - 1) = 56 = 8 \\times 7$, so $n = 8$.'),
            ),
            ask('bin-find-n'),
            ask('bin-find-n+choice'),
          ],
          skillCheck: [ask('bin-free-term', 2), ask('bin-coeff-ncr', 2), ask('bin-find-n', 2)],
        },
        {
          id: 'be-l2-approx',
          title: 'Estimating with Three Terms',
          slides: [
            teach(
              prose('When $x$ is small its higher powers are tiny, so the first few terms of $(1 + x)^n$ give a good estimate.'),
              maths('(1 + x)^{5} \\approx 1 + 5x + 10x^{2}'),
              prose('For $1.02^5$ put $x = 0.02$: $1 + 0.1 + 0.004 = 1.104$. The true value is $1.10408\\dots$'),
            ),
            ask('bin-approx-tiles'),
            ask('bin-three-terms-steps'),
            ask('bin-approx'),
            teach(
              prose('A number in front of $x$ is raised to the power with it, so it is squared in the third term:'),
              maths('(1 - 3x)^{7} \\approx 1 - 21x + 189x^{2}'),
              prose('$7 \\times (-3x) = -21x$, and $21 \\times (-3x)^2 = 21 \\times 9x^2 = 189x^2$.'),
            ),
            ask('bin-approx-tiles', 2),
            ask('bin-approx+choice'),
            ask('bin-three-terms-steps', 2),
            teach(
              prose('To estimate a power from a given bracket, choose $x$ to make the bracket equal the number:'),
              prose('For $(0.98)^6$ from $(1 - 2x)^6$:'),
              maths('1 - 2x = 0.98, \\quad x = 0.01'),
              prose('A number below $1$ needs a negative change: $0.98 = 1 + (-0.02)$.'),
            ),
            ask('bin-approx-x'),
            ask('bin-approx-x+choice'),
          ],
          skillCheck: [ask('bin-approx', 2), ask('bin-approx-tiles', 2), ask('bin-approx-x', 2)],
        },
        {
          id: 'be-l2-product',
          title: 'A Bracket Times an Expansion',
          slides: [
            teach(
              prose(
                'A term of $(1 + 2x)(1 + x)^5$ does not need the whole product. The $x^3$ term comes two ways: $1$ times the expansion\'s $x^3$ term, and $2x$ times its $x^2$ term.',
              ),
              maths('1 \\times 10x^{3} + 2x \\times 10x^{2} = 30x^{3}'),
            ),
            ask('bin-pair-flow'),
            ask('bin-product-coeff'),
            ask('bin-two-bracket-tree'),
            teach(
              prose('Signs come along. In $(1 - 2x)(1 + x)^7$ the $x^4$ coefficient is'),
              maths('1 \\times 35 + (-2) \\times 35 = -35'),
              prose('For the first few terms of the product, multiply the first bracket into the start of the expansion and collect.'),
            ),
            ask('bin-product-expand'),
            ask('bin-pair-flow'),
            ask('bin-product-coeff+choice'),
            teach(
              prose(
                'When the expansion has a number of its own, find its two coefficients first. For the $x^3$ term of $(1 + 3x)(1 + 2x)^4$ they are $32$ and $24$:',
              ),
              maths('1 \\times 32 + 3 \\times 24 = 104'),
            ),
            ask('bin-two-bracket-tree', 2),
            ask('bin-product-expand', 2),
          ],
          skillCheck: [ask('bin-product-coeff', 2), ask('bin-two-bracket-tree', 2), ask('bin-product-expand', 2)],
        },
      ],
      levelCheck: [
        ask('bin-factorial', 2),
        ask('bin-ncr-reduce', 2),
        ask('bin-ncr-facts+choice', 2),
        ask('bin-ncr-row', 2),
        ask('bin-which-r-flow', 2),
        ask('bin-general-tiles', 2),
        ask('bin-general-reduce+choice', 2),
        ask('bin-coeff-ncr', 2),
        ask('bin-free-term', 2),
        ask('bin-find-n', 2),
        ask('bin-approx', 2),
        ask('bin-approx-tiles', 2),
        ask('bin-approx-x+choice', 2),
        ask('bin-product-coeff', 2),
        ask('bin-two-bracket-tree', 2),
      ],
    },
    {
      id: 'be-l3',
      title: 'Unknowns and Conditions',
      lessons: [
        {
          id: 'be-l3-two',
          title: 'Two Unknowns, Two Coefficients',
          slides: [
            teach(
              prose('In $(1 + kx)^n$ the first two terms after the $1$ are'),
              maths('nkx + \\frac{n(n - 1)}{2}k^{2}x^{2}'),
              prose('So when both coefficients are given, there are two equations for $n$ and $k$. If they are $12$ and $60$:'),
              maths('\\begin{aligned} nk &= 12 \\\\ \\frac{n(n - 1)}{2}k^{2} &= 60 \\end{aligned}'),
            ),
            ask('bin-two-unknowns-flow'),
            ask('bin-n-then-k-tree'),
            ask('bin-two-unknowns'),
            teach(
              prose('The first gives $k = \\frac{12}{n}$, so $k^2 = \\frac{144}{n^2}$. Put that into the second and one $n$ cancels:'),
              maths('\\begin{aligned} \\frac{144(n - 1)}{2n} &= 60 \\\\ 144(n - 1) &= 120n \\\\ 24n &= 144 \\end{aligned}'),
              prose('So $n = 6$, and then $k = \\frac{12}{6} = 2$.'),
            ),
            ask('bin-n-then-k-tree', 2),
            ask('bin-two-unknowns+choice'),
            ask('bin-next-coeff-steps'),
            teach(
              prose('With $n$ and $k$ found, every other term follows. The $x^3$ coefficient of $(1 + 2x)^6$ is'),
              maths('{}^{6}C_{3} \\times 2^{3} = 20 \\times 8 = 160'),
              prose('A negative $x$ coefficient means a negative $k$: the sign comes through $nk$, since $n$ is positive.'),
            ),
            ask('bin-two-unknowns-flow', 2),
            ask('bin-next-coeff-steps', 2),
          ],
          skillCheck: [ask('bin-two-unknowns', 2), ask('bin-n-then-k-tree', 2), ask('bin-next-coeff-steps', 2)],
        },
        {
          id: 'be-l3-equal',
          title: 'Equal Coefficients',
          slides: [
            teach(
              prose('Two neighbouring numbers in a row of Pascal\'s triangle are equal only in the middle of an odd row: $35, 35$ in row $7$.'),
              prose('Setting ${}^{n}C_{r} = {}^{n}C_{r + 1}$ and cancelling the factorials says the same thing:'),
              maths('r + 1 = n - r, \\quad n = 2r + 1'),
              prose('So if $x^3$ and $x^4$ have equal coefficients in $(1 + x)^n$, then $n = 7$.'),
            ),
            ask('bin-equal-tiles'),
            ask('bin-equal-coeff'),
            ask('bin-equal-which'),
            teach(
              prose('With $k$ in the bracket, the power of $k$ matches the power of $x$. In $(1 + kx)^7$, equal $x^2$ and $x^3$ coefficients say'),
              maths('21k^{2} = 35k^{3}'),
              prose('Divide by $k^2$, which is allowed because $k \\neq 0$:'),
              maths('k = \\frac{21}{35} = \\frac{3}{5}'),
            ),
            ask('bin-equal-flow'),
            ask('bin-equal-tiles', 2),
            ask('bin-equal-coeff+choice'),
            teach(
              prose(
                'To find which pair is equal, compare neighbours. In $(a + bx)^n$ the $x^{r + 1}$ coefficient is the $x^r$ one multiplied by',
              ),
              maths('\\frac{b(n - r)}{a(r + 1)}'),
              prose('They are equal when that is $1$. In $(1 + 2x)^5$: $2(5 - r) = r + 1$, so $r = 3$, and the $x^3$ and $x^4$ coefficients are both $80$.'),
            ),
            ask('bin-equal-which', 2),
            ask('bin-equal-flow', 2),
          ],
          skillCheck: [ask('bin-equal-tiles', 2), ask('bin-equal-coeff', 2), ask('bin-equal-which', 2)],
        },
        {
          id: 'be-l3-ratio',
          title: 'Coefficients in a Ratio',
          slides: [
            teach(
              prose('Divide the $x^2$ coefficient of $(1 + kx)^n$ by the $x$ coefficient:'),
              maths('\\frac{n(n - 1)k^{2}}{2} \\div nk = \\frac{(n - 1)k}{2}'),
              prose('If the $x^2$ coefficient of $(1 + kx)^5$ is $6$ times the $x$ coefficient, then $\\frac{4k}{2} = 6$, so $k = 3$.'),
            ),
            ask('bin-ratio-tiles'),
            ask('bin-ratio-reduce'),
            ask('bin-ratio-coeff'),
            teach(
              prose('The same works for any neighbouring pair: the $x^{r + 1}$ coefficient over the $x^r$ one is'),
              maths('\\frac{(n - r)k}{r + 1}'),
              prose('The multiple can be a fraction. If the $x^2$ coefficient of $(1 + kx)^4$ is $\\frac{9}{2}$ times the $x$ one:'),
              maths('\\frac{3k}{2} = \\frac{9}{2}, \\quad k = 3'),
            ),
            ask('bin-ratio-n-steps'),
            ask('bin-ratio-reduce', 2),
            ask('bin-ratio-tiles', 2),
            teach(
              prose('When $k$ is given and $n$ is not, the same equation is solved for $n$.'),
              prose('In $(1 + 2x)^n$, if the $x^2$ coefficient is $5$ times the $x$ coefficient:'),
              maths('\\frac{2(n - 1)}{2} = 5, \\quad n = 6'),
              prose('Check: $12$ and $15 \\times 4 = 60$.'),
            ),
            ask('bin-ratio-coeff+choice'),
            ask('bin-ratio-n-steps', 2),
          ],
          skillCheck: [ask('bin-ratio-coeff', 2), ask('bin-ratio-reduce', 2), ask('bin-ratio-tiles', 2)],
        },
        {
          id: 'be-l3-sum',
          title: 'The Sum of the Coefficients',
          slides: [
            teach(
              prose('Put $x = 1$ and every term of an expansion becomes its coefficient, so the coefficients of $(a + kx)^n$ add up to $(a + k)^n$.'),
              maths('(2 + 3x)^{4}: \\quad 5^{4} = 625'),
              prose('Row sums of $2^n$ are the case $a = k = 1$. Worked backwards: if $(1 + kx)^5$ has coefficients adding to $243 = 3^5$, then $1 + k = 3$ and $k = 2$.'),
            ),
            ask('bin-sum-coeff'),
            ask('bin-sum-which'),
            ask('bin-sum-slider'),
            teach(
              prose('Put $x = -1$ and the odd powers turn negative: that gives the coefficients with alternating signs.'),
              maths('(2 - 3)^{4} = 1'),
              prose('and indeed $16 - 96 + 216 - 216 + 81 = 1$.'),
              prose('Add the two and the odd-power coefficients cancel, leaving the even ones twice:'),
              maths('\\frac{625 + 1}{2} = 313'),
              prose('which is $16 + 216 + 81$.'),
            ),
            ask('bin-sum-tree'),
            ask('bin-sum-coeff', 2),
            ask('bin-sum-which', 2),
            teach(
              prose('An even power hides a sign. If the coefficients of $(1 + kx)^4$ add up to $81$, then $1 + k = 3$ or $1 + k = -3$:'),
              maths('k = 2 \\quad \\text{or} \\quad k = -4'),
              prose('So a question says $k > 0$, or asks for both.'),
            ),
            ask('bin-sum-slider', 2),
            ask('bin-sum-tree', 2),
          ],
          skillCheck: [ask('bin-sum-coeff', 2), ask('bin-sum-tree', 2), ask('bin-sum-which', 2)],
        },
        {
          id: 'be-l3-front',
          title: 'The Unknown in Front',
          slides: [
            teach(
              prose('In $(a + x)^n$ the constant term is $a^n$, and the $x^{n - 1}$ term is $na\\,x^{n - 1}$.'),
              prose('If the $x^4$ coefficient of $(a + x)^5$ is $15$, then $5a = 15$ and $a = 3$.'),
              prose('If the constant term of $(a + x)^3$ is $-8$, then $a^3 = -8$ and $a = -2$: an odd power keeps the sign.'),
            ),
            ask('bin-front-a'),
            ask('bin-front-sign'),
            ask('bin-front-tiles'),
            teach(
              prose('A middle term brings nCr and the number on $x$ along. The $x^2$ coefficient of $(a + 2x)^4$ is $216$:'),
              maths('\\begin{aligned} 6 \\times a^{2} \\times 4 &= 216 \\\\ a^{2} &= 9 \\end{aligned}'),
              prose('An even power loses the sign: $a = 3$ and $a = -3$ both work, unless the question says $a > 0$.'),
            ),
            ask('bin-front-tiles', 2),
            ask('bin-front-a+choice'),
            ask('bin-front-sign', 2),
            teach(
              prose('With $a$ and $n$ both unknown, two coefficients are needed. In $(a + x)^n$ the constant is $81$ and the $x$ coefficient is $108$:'),
              maths('\\frac{na^{n - 1}}{a^{n}} = \\frac{n}{a} = \\frac{108}{81} = \\frac{4}{3}'),
              prose('And $a^n = 81$: $a = 3$, $n = 4$ fits both.'),
            ),
            ask('bin-front-flow'),
            ask('bin-front-flow', 2),
          ],
          skillCheck: [ask('bin-front-a', 2), ask('bin-front-sign', 2), ask('bin-front-flow', 2)],
        },
      ],
      levelCheck: [
        ask('bin-two-unknowns', 2),
        ask('bin-n-then-k-tree', 2),
        ask('bin-next-coeff-steps', 2),
        ask('bin-equal-coeff', 2),
        ask('bin-equal-tiles', 2),
        ask('bin-equal-which', 2),
        ask('bin-ratio-reduce', 2),
        ask('bin-ratio-coeff+choice', 2),
        ask('bin-ratio-tiles', 2),
        ask('bin-sum-coeff', 2),
        ask('bin-sum-tree', 2),
        ask('bin-sum-which', 2),
        ask('bin-front-a', 2),
        ask('bin-front-sign', 2),
        ask('bin-front-flow', 2),
      ],
    },
  ],
};
