/**
 * Algebraic & Partial Fractions.
 *
 * Builds on Polynomials: factorising is what makes an algebraic fraction
 * simplify, and the factor theorem is what splits a cubic bottom. Level 1 is
 * fractions as arithmetic — simplifying, multiplying and dividing, adding,
 * equations with fractions in them, and where a fraction is zero or
 * undefined. Level 2 runs addition backwards into partial fractions, over two
 * brackets, three, a repeated one, and after dividing out a whole part, and
 * ends with a look at what the split is for. Level 3 meets a quadratic factor
 * that will not split: its part takes an x on top, cover-up finds the linear
 * part's number, and comparing coefficients finds the rest.
 *
 * Each level closes with a level check: fifteen questions, no teaching
 * slides, one attempt each.
 */
import type { Course, SlideRef } from '../types';

const teach = (
  ...blocks: { kind: 'prose' | 'display'; text?: string; tex?: string }[]
): SlideRef => ({
  type: 'literal',
  slide: {
    kind: 'teach',
    body: blocks.map((b) =>
      b.kind === 'prose'
        ? ({ kind: 'prose', text: b.text ?? '' } as const)
        : ({ kind: 'display', tex: b.tex ?? '' } as const),
    ),
  },
});

const ask = (generatorId: string, difficulty = 1): SlideRef => ({
  type: 'generated',
  generatorId,
  difficulty,
});

const prose = (text: string) => ({ kind: 'prose' as const, text });
const maths = (tex: string) => ({ kind: 'display' as const, tex });

/**
 * Lines of working stacked in one display and aligned on their `&`. A chain
 * of equals signs on one line runs off a phone screen after about three terms.
 */
const working = (...lines: string[]) =>
  maths(`\\begin{aligned} ${lines.join(' \\\\ ')} \\end{aligned}`);

export const algebraicFractions: Course = {
  id: 'algebraic-fractions',
  category: 'algebra-fundamentals',
  position: 50,
  title: 'Algebraic & Partial Fractions',
  blurb: 'Fractions with x in them: simplifying, combining, solving, and splitting them back apart.',
  levels: [
    {
      id: 'af-l1',
      title: 'Algebraic Fractions',
      lessons: [
        {
          id: 'af-l1-simplify',
          title: 'Simplifying',
          slides: [
            teach(
              prose(
                'An algebraic fraction simplifies the way a number fraction does: divide the top and the bottom by a factor they share.',
              ),
              maths('\\frac{(x + 2)(x - 5)}{(x + 2)(x + 3)} = \\frac{x - 5}{x + 3}'),
              prose(
                'Only a factor can cancel: something that multiplies the whole top and the whole bottom. In $\\frac{x + 5}{x + 3}$ nothing cancels, because the $x$ is a term added on, not a factor.',
              ),
            ),
            ask('frac-cancel-which'),
            ask('frac-cancel'),
            ask('frac-cancel-flow'),
            teach(
              prose(
                'So factorise both lines fully before looking for anything to cancel. Look for a common number, a difference of two squares, or a quadratic’s two brackets:',
              ),
              working('&\\frac{3x + 6}{x^{2} + 5x + 6}', '=\\;&\\frac{3(x + 2)}{(x + 2)(x + 3)}', '=\\;&\\frac{3}{x + 3}'),
              prose('When the whole bottom cancels, nothing is left under the line: $\\frac{(x + 1)(x - 4)}{x + 1} = x - 4$.'),
            ),
            ask('frac-cancel', 2),
            ask('frac-cancel-flow', 2),
            ask('frac-cancel-which', 2),
            teach(
              prose('A bracket written backwards is the same factor with a minus sign: $3 - x = -(x - 3)$. So it still cancels, and leaves $-1$ behind.'),
              working('&\\frac{x^{2} - 9}{3 - x}', '=\\;&\\frac{(x - 3)(x + 3)}{-(x - 3)}', '=\\;&-(x + 3) = -x - 3'),
            ),
            ask('frac-flip-sign'),
            ask('frac-flip-sign+choice', 2),
          ],
          skillCheck: [ask('frac-cancel', 2), ask('frac-cancel-flow', 2), ask('frac-flip-sign', 2)],
        },
        {
          id: 'af-l1-multiply',
          title: 'Multiplying and Dividing',
          slides: [
            teach(
              prose(
                'Multiply fractions by multiplying the tops and multiplying the bottoms. Factorise and cancel before multiplying anything out, and there is far less to multiply.',
              ),
              working(
                '&\\frac{x + 1}{x + 4} \\times \\frac{(x + 4)(x - 2)}{(x + 1)(x + 5)}',
                '=\\;&\\frac{x - 2}{x + 5}',
              ),
              prose('Any factor on top can cancel with any factor below, even across the $\\times$.'),
            ),
            ask('frac-multiply'),
            ask('frac-product-value'),
            ask('frac-multiply', 2),
            teach(
              prose('To divide by a fraction, multiply by it upside down. Only the second fraction turns over.'),
              working(
                '&\\frac{x + 2}{x - 1} \\div \\frac{x + 2}{x + 3}',
                '=\\;&\\frac{x + 2}{x - 1} \\times \\frac{x + 3}{x + 2}',
                '=\\;&\\frac{x + 3}{x - 1}',
              ),
            ),
            ask('frac-flip-which'),
            ask('frac-divide-steps'),
            ask('frac-product-value', 2),
            teach(
              prose('When every factor of the bottom cancels, the answer is not a fraction at all:'),
              working(
                '&\\frac{x^{2} + 3x}{x - 1} \\div \\frac{x}{x^{2} - 1}',
                '=\\;&\\frac{x(x + 3)}{x - 1} \\times \\frac{(x - 1)(x + 1)}{x}',
                '=\\;&(x + 3)(x + 1)',
              ),
            ),
            ask('frac-divide-steps', 2),
            ask('frac-flip-which', 2),
          ],
          skillCheck: [ask('frac-multiply', 2), ask('frac-divide-steps', 2), ask('frac-product-value', 2)],
        },
        {
          id: 'af-l1-add',
          title: 'Adding and Subtracting',
          slides: [
            teach(
              prose(
                'To add fractions they need the same bottom. For two different brackets the simplest common bottom is their product, and each fraction is multiplied top and bottom by the bracket it is missing:',
              ),
              working(
                '&\\frac{2}{x + 1} + \\frac{3}{x - 2}',
                '=\\;&\\frac{2(x - 2) + 3(x + 1)}{(x + 1)(x - 2)}',
                '=\\;&\\frac{5x - 1}{(x + 1)(x - 2)}',
              ),
              prose('Never add the bottoms: a common denominator is something each bottom divides into.'),
            ),
            ask('frac-lcd'),
            ask('frac-add-tree'),
            ask('frac-sum-coefficient'),
            teach(
              prose('Subtracting works the same way, but the minus sign takes away the whole of the second top, both of its terms:'),
              working(
                '&\\frac{4}{x + 3} - \\frac{1}{x - 1}',
                '=\\;&\\frac{4(x - 1) - (x + 3)}{(x + 3)(x - 1)}',
                '=\\;&\\frac{3x - 7}{(x + 3)(x - 1)}',
              ),
            ),
            ask('frac-sum-tiles'),
            ask('frac-add-tree', 2),
            ask('frac-sum-coefficient+choice', 2),
            teach(
              prose(
                'When one bottom already contains the other, it is the common denominator by itself, and only the other fraction changes. Factorise a quadratic bottom first to see whether it does.',
              ),
              working(
                '&\\frac{3}{x + 1} - \\frac{2}{(x + 1)(x + 4)}',
                '=\\;&\\frac{3(x + 4) - 2}{(x + 1)(x + 4)}',
                '=\\;&\\frac{3x + 10}{(x + 1)(x + 4)}',
              ),
            ),
            ask('frac-lcd', 2),
            ask('frac-sum-tiles', 2),
          ],
          skillCheck: [ask('frac-add-tree', 2), ask('frac-sum-tiles', 2), ask('frac-sum-coefficient', 2)],
        },
        {
          id: 'af-l1-equations',
          title: 'Equations with Fractions',
          slides: [
            teach(
              prose(
                'To solve an equation with fractions in it, clear them: multiply both sides by every bottom. Each fraction’s own bottom cancels, and what is left has none.',
              ),
              working('&\\frac{3}{x + 1} = \\frac{2}{x - 4}', '&3(x - 4) = 2(x + 1)', '&3x - 12 = 2x + 2', '&x = 14'),
            ),
            ask('frac-clear-tiles'),
            ask('frac-equation-steps'),
            ask('frac-equation-solve'),
            teach(
              prose(
                'Clearing multiplies by something that can be zero. A solution that makes a bottom of the original equation zero is not a solution at all, so check each one and reject any that does.',
              ),
              working('&\\frac{x^{2}}{x - 2} = \\frac{4}{x - 2}', '&x^{2} = 4', '&x = 2 \\text{ or } x = -2'),
              prose('At $x = 2$ both bottoms are zero, so only $x = -2$ stands.'),
            ),
            ask('frac-reject-flow'),
            ask('frac-equation-steps', 2),
            ask('frac-clear-tiles', 2),
            teach(
              prose('With $x$ on both tops, the $x^{2}$ terms usually cancel once each side is multiplied out, and the equation is linear again:'),
              working(
                '\\frac{x + 1}{x - 3} &= \\frac{x + 4}{x + 2}',
                'x^{2} + 3x + 2 &= x^{2} + x - 12',
                '2x &= -14',
                'x &= -7',
              ),
            ),
            ask('frac-reject-flow', 2),
            ask('frac-equation-solve', 2),
          ],
          skillCheck: [ask('frac-equation-steps', 2), ask('frac-reject-flow', 2), ask('frac-equation-solve', 2)],
        },
        {
          id: 'af-l1-undefined',
          title: 'Zero or Undefined',
          slides: [
            teach(
              prose(
                'A fraction is undefined where its bottom is zero, since nothing can be divided by zero. On a graph the curve shoots off there, up on one side and down on the other.',
              ),
              maths('\\frac{x + 1}{x - 3} \\text{ is undefined at } x = 3'),
              prose('Find these by setting the bottom to zero. The top plays no part.'),
            ),
            ask('frac-pole-slider'),
            ask('frac-undefined-which'),
            ask('frac-pole-slider', 2),
            teach(
              prose('A fraction is zero where its top is zero, as long as its bottom is not.'),
              prose(
                'Where the top and the bottom share a factor, both are zero at once. The fraction is undefined there, but only at a single point, a hole, and everywhere else it equals its simplified form:',
              ),
              maths('\\frac{x^{2} - 4}{x - 2} = x + 2 \\text{ for } x \\neq 2'),
            ),
            ask('frac-zero-slider'),
            ask('frac-undefined-which', 2),
            ask('frac-hole-value'),
            teach(
              prose(
                'So to find where a fraction is zero, factorise first. $\\frac{(x - 1)(x + 3)}{(x - 1)(x + 2)}$ has a top that is zero at $x = 1$ and at $x = -3$, but at $x = 1$ the bottom is zero too, so that is a hole.',
              ),
              prose('Only $x = -3$ makes it zero. At the hole the simplified form, $\\frac{x + 3}{x + 2}$, gives the value the curve heads for: $\\frac{4}{3}$.'),
            ),
            ask('frac-zero-slider', 2),
            ask('frac-hole-value', 2),
          ],
          skillCheck: [ask('frac-pole-slider', 2), ask('frac-zero-slider', 2), ask('frac-hole-value', 2)],
        },
      ],
      levelCheck: [
        ask('frac-cancel', 2),
        ask('frac-cancel-flow', 2),
        ask('frac-flip-sign+choice', 2),
        ask('frac-multiply', 2),
        ask('frac-divide-steps', 2),
        ask('frac-product-value', 2),
        ask('frac-add-tree', 2),
        ask('frac-sum-tiles', 2),
        ask('frac-sum-coefficient', 2),
        ask('frac-equation-steps', 2),
        ask('frac-reject-flow', 2),
        ask('frac-equation-solve', 2),
        ask('frac-pole-slider', 2),
        ask('frac-zero-slider', 2),
        ask('frac-hole-value', 2),
      ],
    },
    {
      id: 'af-l2',
      title: 'Partial Fractions',
      lessons: [
        {
          id: 'af-l2-two',
          title: 'Two Linear Factors',
          slides: [
            teach(
              prose('Partial fractions run adding backwards: a fraction over two different brackets splits into one fraction over each.'),
              working('&\\frac{5x - 1}{(x + 1)(x - 2)}', '=\\;&\\frac{A}{x + 1} + \\frac{B}{x - 2}'),
              prose(
                'Over the common bottom the right side has top $A(x - 2) + B(x + 1)$, which must be $5x - 1$ for every $x$. So choose $x$ to make a bracket zero. At $x = 2$: $9 = 3B$, so $B = 3$. At $x = -1$: $-6 = -3A$, so $A = 2$.',
              ),
            ),
            ask('frac-split-which'),
            ask('frac-split-tree'),
            ask('frac-cover'),
            teach(
              prose(
                'Cover-up is the same thing done by eye: cover one bracket in the fraction and put in the $x$ that makes it zero. What comes out is that bracket’s numerator.',
              ),
              maths('A = \\frac{5(-1) - 1}{-1 - 2} = 2'),
              prose('A bottom given multiplied out has to be factorised first: $x^{2} - x - 2 = (x + 1)(x - 2)$.'),
            ),
            ask('frac-split-tiles'),
            ask('frac-cover+choice', 2),
            ask('frac-split-tree', 2),
            teach(
              prose('The other way is to compare coefficients: multiply out, then match the $x$ terms and the numbers.'),
              working('&5x - 1', '=\\;&A(x - 2) + B(x + 1)'),
              working('x \\text{ terms:} &\\;\\; A + B = 5', '\\text{numbers:} &\\;\\; -2A + B = -1'),
              prose('Subtract: $3A = 6$, so $A = 2$ and $B = 3$. It is slower here, but it still works when no value of $x$ isolates a letter.'),
            ),
            ask('frac-compare-tree'),
            ask('frac-split-tiles', 2),
          ],
          skillCheck: [ask('frac-split-tree', 2), ask('frac-cover', 2), ask('frac-split-tiles', 2)],
        },
        {
          id: 'af-l2-three',
          title: 'Three Linear Factors',
          slides: [
            teach(
              prose('Three different brackets give three parts, and cover-up finds each one: put in the $x$ that makes one bracket zero, and the other two parts vanish.'),
              working(
                '&\\frac{2x^{2} + 8x + 2}{(x - 1)(x + 2)(x + 3)}',
                '=\\;&\\frac{A}{x - 1} + \\frac{B}{x + 2} + \\frac{C}{x + 3}',
              ),
              prose('For $A$, cover $(x - 1)$ and put $x = 1$ into the rest: $\\frac{12}{3 \\times 4} = 1$.'),
            ),
            ask('frac-three-cover-tree'),
            ask('frac-three-tiles'),
            ask('frac-three-which'),
            teach(
              prose(
                'Each numerator is the top at that root, divided by the other two brackets there. Here $B$ comes from $x = -2$ and $C$ from $x = -3$. Work the brackets one at a time, since the signs are where it goes wrong:',
              ),
              working('B &= \\frac{-6}{(-3)(1)} = 2', 'C &= \\frac{-4}{(-4)(-1)} = -1'),
              prose(
                'When the bottom is a cubic multiplied out, factorise it first with the factor theorem: try the divisors of its constant term until one makes it zero.',
              ),
            ),
            ask('frac-three-steps'),
            ask('frac-three-tiles', 2),
            ask('frac-three-cover-tree', 2),
            teach(
              prose(
                'Check a split by putting a value of $x$ that is not a root into both sides; $x = 0$ is the easiest. The fraction above gives $\\frac{2}{(-1)(2)(3)} = -\\frac{1}{3}$, and the split gives $-1 + 1 - \\frac{1}{3}$, the same.',
              ),
            ),
            ask('frac-three-which', 2),
            ask('frac-three-steps', 2),
          ],
          skillCheck: [ask('frac-three-cover-tree', 2), ask('frac-three-tiles', 2), ask('frac-three-steps', 2)],
        },
        {
          id: 'af-l2-repeated',
          title: 'Repeated Factors',
          slides: [
            teach(
              prose('A repeated bracket needs a part over each power of it:'),
              maths('\\frac{3x + 5}{(x + 1)^{2}} = \\frac{A}{x + 1} + \\frac{B}{(x + 1)^{2}}'),
              prose(
                'Over $(x + 1)^{2}$ the top becomes $A(x + 1) + B$. The $x$ terms give $A = 3$, and the numbers give $A + B = 5$, so $B = 2$. Putting $x = -1$ finds $B$ at once: $3(-1) + 5 = 2$.',
              ),
            ),
            ask('frac-repeated-form'),
            ask('frac-repeated-tree'),
            ask('frac-repeated-value'),
            teach(
              prose('With another bracket as well there are three parts, and cover-up reaches two of them:'),
              working(
                '&\\frac{4x^{2} - 3x + 5}{(x - 1)^{2}(x + 2)}',
                '=\\;&\\frac{A}{x - 1} + \\frac{B}{(x - 1)^{2}} + \\frac{C}{x + 2}',
              ),
              prose(
                'Put $x = 1$: only $B$ survives, $6 = 3B$, so $B = 2$. Put $x = -2$: only $C$ survives, $27 = 9C$, so $C = 3$.',
              ),
            ),
            ask('frac-repeated-tiles'),
            ask('frac-repeated-form', 2),
            ask('frac-repeated-value', 2),
            teach(
              prose(
                'No value of $x$ isolates $A$, because $x = 1$ wipes it out along with $C$. So compare a coefficient instead: only $A$ and $C$ make an $x^{2}$ term, so $A + C = 4$, and $A = 1$.',
              ),
            ),
            ask('frac-repeated-tree', 2),
            ask('frac-repeated-tiles', 2),
          ],
          skillCheck: [ask('frac-repeated-tiles', 2), ask('frac-repeated-tree', 2), ask('frac-repeated-value', 2)],
        },
        {
          id: 'af-l2-improper',
          title: 'Improper Fractions',
          slides: [
            teach(
              prose(
                'Partial fractions only work on a proper fraction, one whose top has a lower degree than its bottom. If it does not, divide first: a whole part comes out, and a proper fraction is left.',
              ),
              working(
                '&\\frac{2x^{2} + x - 7}{(x + 1)(x - 2)}',
                '=\\;&2 + \\frac{3x - 3}{(x + 1)(x - 2)}',
              ),
              prose('The bottom is $x^{2} - x - 2$, and taking $2$ lots of it from the top leaves $3x - 3$.'),
            ),
            ask('frac-improper-flow'),
            ask('frac-improper-quotient'),
            ask('frac-improper-tiles'),
            teach(
              prose('Then split what is left over, exactly as before:'),
              working(
                '&2 + \\frac{3x - 3}{(x + 1)(x - 2)}',
                '=\\;&2 + \\frac{2}{x + 1} + \\frac{1}{x - 2}',
              ),
            ),
            ask('frac-improper-steps'),
            ask('frac-improper-flow', 2),
            ask('frac-improper-quotient+choice', 2),
            teach(
              prose(
                'A cubic over a quadratic leaves a linear whole part, $x + m$. Read $m$ with care: it is not the top’s next coefficient, because $x$ times the bottom has an $x^{2}$ term of its own, which has to be taken off first.',
              ),
            ),
            ask('frac-improper-tiles', 2),
            ask('frac-improper-steps', 2),
          ],
          skillCheck: [ask('frac-improper-flow', 2), ask('frac-improper-tiles', 2), ask('frac-improper-steps', 2)],
        },
        {
          id: 'af-l2-using',
          title: 'Using the Split',
          slides: [
            teach(
              prose(
                'Why split at all? Each part is simple where the whole fraction is not. One use is integrating: a part over a linear bracket integrates to a logarithm, and a part over a square to a power.',
              ),
              working(
                '\\int \\frac{k}{x + c} \\, dx &= k\\ln|x + c|',
                '\\int \\frac{k}{(x + c)^{2}} \\, dx &= -\\frac{k}{x + c}',
              ),
              prose('Each is plus a constant. The Integration course teaches both properly. Here they are given, so the split is the only work.'),
            ),
            ask('frac-integrate-tiles'),
            ask('frac-integrate-which'),
            ask('frac-integrate-tiles', 2),
            teach(
              prose(
                'The other use is series. For small $u$, $\\frac{1}{1 - u} = 1 + u + u^{2} + u^{3} + \\dots$, so a part over $1 - px$ becomes a series in powers of $x$:',
              ),
              working(
                '&\\frac{3}{1 - 2x}',
                '=\\;&3(1 + 2x + 4x^{2} + \\dots)',
                '=\\;&3 + 6x + 12x^{2} + \\dots',
              ),
              prose('The Binomial Expansion course derives this series, and when it is valid, in a later level. Here it is given.'),
            ),
            ask('frac-series-tiles'),
            ask('frac-series-coefficient'),
            ask('frac-integrate-which', 2),
            teach(
              prose(
                'Adding the parts’ series power by power gives the whole fraction’s. For $\\frac{A}{1 - px} + \\frac{B}{1 - qx}$ the coefficient of $x^{k}$ is $Ap^{k} + Bq^{k}$, which no amount of dividing the original fraction would find as quickly.',
              ),
            ),
            ask('frac-series-tiles', 2),
            ask('frac-series-coefficient+choice', 2),
          ],
          skillCheck: [ask('frac-integrate-tiles', 2), ask('frac-series-tiles', 2), ask('frac-series-coefficient', 2)],
        },
      ],
      levelCheck: [
        ask('frac-split-tiles', 2),
        ask('frac-cover', 2),
        ask('frac-split-which', 2),
        ask('frac-compare-tree', 2),
        ask('frac-three-steps', 2),
        ask('frac-three-tiles', 2),
        ask('frac-three-cover-tree', 2),
        ask('frac-repeated-form', 2),
        ask('frac-repeated-value', 2),
        ask('frac-repeated-tree', 2),
        ask('frac-improper-flow', 2),
        ask('frac-improper-tiles', 2),
        ask('frac-improper-steps', 2),
        ask('frac-integrate-tiles', 2),
        ask('frac-series-coefficient', 2),
      ],
    },
    {
      id: 'af-l3',
      title: 'Quadratic Factors in the Denominator',
      lessons: [
        {
          id: 'af-l3-irreducible',
          title: 'A Bracket That Will Not Split',
          slides: [
            teach(
              prose(
                'Some quadratics never factorise. $x^{2} + 4$ is at least $4$ for every $x$, so it is never zero: it has no real roots, and so no linear factors. In a split it stays whole.',
              ),
              working('&\\frac{5x^{2} + 3x + 13}{(x + 1)(x^{2} + 4)}', '=\\;&\\frac{Ax + B}{x^{2} + 4} + \\frac{C}{x + 1}'),
              prose(
                'Its part needs a top one degree lower than it, an $x$ term and a number: $Ax + B$. A number alone, $\\frac{A}{x^{2} + 4}$, is the usual slip. But check first: $x^{2} - 9 = (x - 3)(x + 3)$ does split, into two brackets with a number over each.',
              ),
            ),
            ask('frac-quad-parts-tiles'),
            ask('frac-quad-form-which'),
            ask('frac-quad-factorise-flow'),
            teach(
              prose(
                'For any quadratic $ax^{2} + bx + c$, the discriminant $b^{2} - 4ac$ settles it. Negative means no real roots, so it stays whole. A square means it factorises into brackets with whole numbers in.',
              ),
              working('x^{2} + 2x + 5: &\\quad 4 - 20 = -16', 'x^{2} + x - 6: &\\quad 1 + 24 = 25'),
              prose('So $x^{2} + 2x + 5$ stays whole, and $x^{2} + x - 6 = (x - 2)(x + 3)$ splits.'),
            ),
            ask('frac-discriminant-tree'),
            ask('frac-quad-factorise-flow', 2),
            ask('frac-discriminant-tree', 2),
            teach(
              prose('A quadratic that stays whole takes the same shape of part whatever its middle term:'),
              working('&\\frac{3x^{2} + 5x + 8}{(x - 1)(x^{2} + 2x + 5)}', '=\\;&\\frac{Ax + B}{x^{2} + 2x + 5} + \\frac{C}{x - 1}'),
              prose('Three letters, to match the three coefficients of a quadratic top.'),
            ),
            ask('frac-quad-form-which', 2),
            ask('frac-quad-parts-tiles', 2),
          ],
          skillCheck: [ask('frac-quad-parts-tiles', 2), ask('frac-discriminant-tree', 2), ask('frac-quad-factorise-flow', 2)],
        },
        {
          id: 'af-l3-linear-first',
          title: 'The Linear Part First',
          slides: [
            teach(
              prose('Multiply both sides by the bottom, and the tops agree for every $x$:'),
              working('&5x^{2} + 3x + 13', '=\\;&(Ax + B)(x + 1)', '&\\quad + C(x^{2} + 4)'),
              prose(
                'At $x = -1$ the first bracket is zero, so only $C$ survives: $15 = 5C$, and $C = 3$. That is cover-up, as before: cover $(x + 1)$ and put $x = -1$ into what is left, $\\frac{5 - 3 + 13}{(-1)^{2} + 4} = 3$.',
              ),
            ),
            ask('frac-quad-cover-steps'),
            ask('frac-quad-c-value'),
            teach(
              prose(
                'No value of $x$ makes $x^{2} + 4$ zero, so cover-up cannot reach $A$ or $B$. Compare coefficients instead: multiply out the right side and match each power of $x$.',
              ),
              prose('Multiplied out, $(Ax + B)(x + 1)$ is $Ax^{2} + (A + B)x + B$, and $C(x^{2} + 4)$ is $Cx^{2} + 4C$. So:'),
              working('x^{2} \\text{ terms:} &\\;\\; A + C = 5', 'x \\text{ terms:} &\\;\\; A + B = 3', '\\text{numbers:} &\\;\\; B + 4C = 13'),
              prose('The first says $A = 2$, since $C = 3$.'),
            ),
            ask('frac-quad-c-and-a-tree'),
            ask('frac-quad-coefficients-tiles'),
            ask('frac-quad-cover-steps', 2),
            teach(
              prose(
                'Two slips to watch. A negative squared is positive: at $x = -3$, $x^{2} + 4$ is $9 + 4 = 13$, not $-5$. And $5$ is the whole $x^{2}$ coefficient, $A + C$, so it is not $A$ itself.',
              ),
            ),
            ask('frac-quad-c-value+choice', 2),
            ask('frac-quad-c-and-a-tree', 2),
            ask('frac-quad-coefficients-tiles', 2),
          ],
          skillCheck: [ask('frac-quad-c-and-a-tree', 2), ask('frac-quad-cover-steps', 2), ask('frac-quad-c-value', 2)],
        },
        {
          id: 'af-l3-finding-b',
          title: 'Finding B',
          slides: [
            teach(
              prose('The numbers finish it. $(Ax + B)(x + 1)$ puts in $B$, and $C(x^{2} + 4)$ puts in $4C$, so'),
              working('B + 4C &= 13', 'B &= 13 - 12 = 1'),
              prose('Putting $x = 0$ into both sides gives the same equation, since every $x$ term vanishes. Either way, find $C$ first.'),
            ),
            ask('frac-quad-b-steps'),
            ask('frac-quad-substitute'),
            ask('frac-quad-b-value'),
            teach(
              prose('So all three come in order: $C$ by cover-up, $A$ from the $x^{2}$ terms, $B$ from the numbers.'),
              working('&\\frac{5x^{2} + 3x + 13}{(x + 1)(x^{2} + 4)}', '=\\;&\\frac{2x + 1}{x^{2} + 4} + \\frac{3}{x + 1}'),
              prose(
                'When $A$ comes out negative, write the part with its minus sign outside: $-\\frac{2x - 1}{x^{2} + 4}$ rather than $\\frac{-2x + 1}{x^{2} + 4}$.',
              ),
            ),
            ask('frac-quad-abc-tree'),
            ask('frac-quad-split-tiles'),
            ask('frac-quad-b-steps', 2),
            teach(
              prose(
                'The $x$ terms are left over, and they make a check: $A + B = 3$, and $2 + 1 = 3$. So does any other value of $x$. At $x = 1$ the left is $5 + 3 + 13 = 21$, and the right is',
              ),
              working('&(A + B)(1 + 1) + C(1 + 4)', '=\\;&2A + 2B + 5C'),
              prose('which is $4 + 2 + 15 = 21$ as well.'),
            ),
            ask('frac-quad-substitute', 2),
            ask('frac-quad-abc-tree', 2),
          ],
          skillCheck: [ask('frac-quad-abc-tree', 2), ask('frac-quad-b-steps', 2), ask('frac-quad-split-tiles', 2)],
        },
        {
          id: 'af-l3-over-x',
          title: 'When the Bracket Is x',
          slides: [
            teach(
              prose('When the linear factor is $x$ itself, cover-up uses $x = 0$:'),
              working('&\\frac{3x^{2} - x + 10}{x(x^{2} + 5)}', '=\\;&\\frac{Ax + B}{x^{2} + 5} + \\frac{C}{x}'),
              prose(
                'Multiply up: $3x^{2} - x + 10 = (Ax + B)x + C(x^{2} + 5)$. At $x = 0$ only $C$ survives, $10 = 5C$, so $C = 2$. Then the $x^{2}$ terms give $A + C = 3$, so $A = 1$.',
              ),
            ),
            ask('frac-x-quad-tree'),
            ask('frac-x-quad-order-flow'),
            teach(
              prose(
                'The rest is quicker than over $(x + a)$: $(Ax + B)x = Ax^{2} + Bx$ has no number in it, so the $x$ terms give $B$ straight away. Here $B = -1$:',
              ),
              working('&\\frac{3x^{2} - x + 10}{x(x^{2} + 5)}', '=\\;&\\frac{x - 1}{x^{2} + 5} + \\frac{2}{x}'),
              prose('A bottom given as $x^{3} + 5x$ factorises by taking out the $x$: $x(x^{2} + 5)$.'),
            ),
            ask('frac-x-quad-tiles'),
            ask('frac-x-quad-cover-steps'),
            ask('frac-x-quad-tree', 2),
            teach(
              prose(
                'Two slips. The number on top is $5C$, not $C$, so divide it by $5$. And $3$ is $A + C$, the whole $x^{2}$ coefficient, so $A$ is $3$ less $C$.',
              ),
            ),
            ask('frac-x-quad-order-flow', 2),
            ask('frac-x-quad-tiles', 2),
            ask('frac-x-quad-cover-steps', 2),
          ],
          skillCheck: [ask('frac-x-quad-tree', 2), ask('frac-x-quad-tiles', 2), ask('frac-x-quad-cover-steps', 2)],
        },
        {
          id: 'af-l3-improper',
          title: 'Improper, with a Quadratic Factor',
          slides: [
            teach(
              prose(
                'A cubic over $(x + 1)(x^{2} + 4)$ is improper, since the bottom multiplies out to a cubic too, $x^{3} + x^{2} + 4x + 4$. Divide first: the $x^{3}$ terms give the whole number.',
              ),
              working('&\\frac{2x^{3} + 7x^{2} + 11x + 21}{(x + 1)(x^{2} + 4)}', '=\\;&2 + \\frac{5x^{2} + 3x + 13}{(x + 1)(x^{2} + 4)}'),
              prose('Then split what is left exactly as before: $2 + \\frac{2x + 1}{x^{2} + 4} + \\frac{3}{x + 1}$.'),
            ),
            ask('frac-quad-degree-flow'),
            ask('frac-quad-improper-steps'),
            ask('frac-quad-whole-tiles'),
            teach(
              prose(
                'Cover-up works on the original top as well: at $x = -1$ the whole number times the bottom is zero too. The top there is $-2 + 7 - 11 + 21 = 15$, and $15 = 5C$ again.',
              ),
            ),
            ask('frac-quad-rest-tree'),
            ask('frac-quad-degree-flow', 2),
            ask('frac-quad-improper-steps', 2),
            teach(
              prose(
                'The $x^{2}$ terms need more care, because the whole number times the bottom puts in $2x^{2}$ of its own. So they say $2 + A + C = 7$. Forget that $2$ and $A$ comes out $4$ rather than $2$.',
              ),
            ),
            ask('frac-quad-whole-tiles', 2),
            ask('frac-quad-rest-tree', 2),
          ],
          skillCheck: [ask('frac-quad-degree-flow', 2), ask('frac-quad-whole-tiles', 2), ask('frac-quad-rest-tree', 2)],
        },
      ],
      levelCheck: [
        ask('frac-quad-form-which', 2),
        ask('frac-discriminant-tree', 2),
        ask('frac-quad-parts-tiles', 2),
        ask('frac-quad-cover-steps', 2),
        ask('frac-quad-c-value', 2),
        ask('frac-quad-coefficients-tiles', 2),
        ask('frac-quad-abc-tree', 2),
        ask('frac-quad-b-value+choice', 2),
        ask('frac-quad-split-tiles', 2),
        ask('frac-quad-b-steps', 2),
        ask('frac-x-quad-order-flow', 2),
        ask('frac-x-quad-tree', 2),
        ask('frac-quad-degree-flow', 2),
        ask('frac-quad-whole-tiles', 2),
        ask('frac-quad-improper-steps', 2),
      ],
    },
  ],
};
