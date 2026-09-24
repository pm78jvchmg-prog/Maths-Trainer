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
 * part's number, and comparing coefficients finds the rest. Level 4 solves
 * inequalities with a fraction in them: why the bottom cannot be multiplied
 * through, bringing everything to one side, multiplying by the bottom
 * squared, a fraction against a fraction, and reading the set at the end.
 * Level 5 draws the graph of a fraction: vertical asymptotes and which way
 * each arm goes, the horizontal asymptote from the degrees, holes where a
 * factor cancels, the intercepts, and all of them together in a sketch.
 * Level 6 is the method of differences: the split that makes a sum
 * telescope, a number taken out in front when the brackets are further apart,
 * three factors regrouped into two, sums from a later r and a top in r, and
 * the sum to infinity. Sequences & Series cancels such sums with the split
 * given; here the learner finds it.
 *
 * Each level closes with a level check: fifteen questions, no teaching
 * slides, one attempt each.
 */
import { plotSvg } from '../figures';
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

const prose = (text: string) => ({ kind: 'prose' as const, text });
const maths = (tex: string) => ({ kind: 'display' as const, tex });

/**
 * Lines of working stacked in one display and aligned on their `&`. A chain
 * of equals signs on one line runs off a phone screen after about three terms.
 */
const working = (...lines: string[]) =>
  maths(`\\begin{aligned} ${lines.join(' \\\\ ')} \\end{aligned}`);

/**
 * A curve with its asymptotes dashed and the pen lifted at each pole, the
 * y-axis drawn solid, and any hole or intercept ringed. Modelled on
 * `brokenGraph` in functionsTransformations.ts.
 */
const graph = (
  f: (x: number) => number,
  window: { xMin: number; xMax: number; yMin: number; yMax: number },
  asymptotes: { x: number[]; y: number },
  label: string,
  marks: { x: number; y: number; hollow?: boolean }[] = [],
): Block => ({
  kind: 'diagram',
  svg: plotSvg({
    ...window,
    curves: [{ f, accent: true, breaks: true }],
    verticals: [{ x: 0, dashed: false }, ...asymptotes.x.map((x) => ({ x }))],
    horizontals: asymptotes.y === 0 ? [] : [asymptotes.y],
    marks,
    label,
  }),
});

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
    {
      id: 'af-l4',
      title: 'Inequalities with Fractions',
      lessons: [
        {
          id: 'af-l4-no-multiplying',
          title: 'Why You Cannot Multiply Through',
          slides: [
            teach(
              prose(
                'In an equation you can multiply both sides by the bottom. In an inequality you cannot, unless you know its sign: multiplying by a negative number turns the sign round, and $x - 2$ is negative for $x < 2$ and positive for $x > 2$.',
              ),
              working('\\frac{x + 4}{x - 2} &< 3', 'x + 4 &< 3(x - 2)', 'x &> 5'),
              prose('That working is wrong. Try $x = 0$: $\\frac{4}{-2} = -2$, which is less than $3$, so $0$ is in the set, and $x > 5$ missed it.'),
            ),
            ask('frac-ineq-cases-flow'),
            ask('frac-ineq-test-tree'),
            ask('frac-ineq-crossing'),
            teach(
              prose('One safe way is to take each side of the pole in turn. For $x > 2$ the bottom is positive, so the sign stays:'),
              working('x + 4 &< 3x - 6', 'x &> 5'),
              prose(
                'For $x < 2$ it is negative, so the sign turns: $x + 4 > 3x - 6$, which gives $x < 5$, and all of $x < 2$ fits that. Together: $x < 2$ or $x > 5$.',
              ),
            ),
            ask('frac-ineq-slip-which'),
            ask('frac-ineq-cases-flow', 2),
            ask('frac-ineq-test-tree', 2),
            teach(
              prose(
                'The answer can only change in two places: the pole, where the bottom is zero, and the crossing, where the fraction equals the number. Here those are $x = 2$ and $x = 5$.',
              ),
              prose('The pole is never in the set, since the fraction has no value there.'),
            ),
            ask('frac-ineq-crossing', 2),
            ask('frac-ineq-slip-which', 2),
          ],
          skillCheck: [ask('frac-ineq-cases-flow', 2), ask('frac-ineq-test-tree', 2), ask('frac-ineq-slip-which', 2)],
        },
        {
          id: 'af-l4-one-side',
          title: 'Bringing It to One Side',
          slides: [
            teach(
              prose('A tidier way: take the number over to the left, so the right side is $0$, and write the left as one fraction.'),
              working('&\\frac{x + 4}{x - 2} - 3', '=\\;&\\frac{x + 4 - 3(x - 2)}{x - 2}', '=\\;&\\frac{-2x + 10}{x - 2}'),
              prose(
                'Now it is a fraction against zero, which a sign table reads, as in the first level of Inequalities & the Modulus Function.',
              ),
            ),
            ask('frac-ineq-one-side-steps'),
            ask('frac-ineq-new-top-tiles'),
            ask('frac-ineq-critical-tree'),
            teach(
              prose(
                'The critical values are where the top is zero, $x = 5$, and where the bottom is zero, $x = 2$. Test a value in each region:',
              ),
              working('x = 0: &\\quad \\tfrac{10}{-2} \\text{ is negative}', 'x = 3: &\\quad \\tfrac{4}{1} \\text{ is positive}', 'x = 6: &\\quad \\tfrac{-2}{4} \\text{ is negative}'),
              prose('We want it negative, so $x < 2$ or $x > 5$, both dots hollow.'),
            ),
            ask('frac-ineq-line'),
            ask('frac-ineq-one-side-steps', 2),
            ask('frac-ineq-new-top-tiles', 2),
            teach(
              prose(
                'Mind the minus in front of the bracket: $-3(x - 2)$ is $-3x + 6$, not $-3x - 6$. And with $\\le$ or $\\ge$, the zero of the top is filled in, while the pole stays hollow.',
              ),
            ),
            ask('frac-ineq-critical-tree', 2),
            ask('frac-ineq-line', 2),
          ],
          skillCheck: [ask('frac-ineq-line', 2), ask('frac-ineq-one-side-steps', 2), ask('frac-ineq-critical-tree', 2)],
        },
        {
          id: 'af-l4-square',
          title: 'Multiplying by the Square',
          slides: [
            teach(
              prose('$(x - 2)^{2}$ is positive for every $x$ except $2$, so multiplying both sides by it never turns the sign:'),
              working('\\frac{x + 4}{x - 2} &< 3', '(x + 4)(x - 2) &< 3(x - 2)^{2}'),
              prose('Bring everything to the left and take out the common bracket:'),
              working('(x - 2)[x + 4 - 3(x - 2)] &< 0', '(x - 2)(-2x + 10) &< 0'),
            ),
            ask('frac-ineq-square-steps'),
            ask('frac-ineq-square-tiles'),
            ask('frac-ineq-shape-flow'),
            teach(
              prose(
                'That is $-2(x - 2)(x - 5) < 0$, a quadratic whose graph opens downwards, with roots $2$ and $5$. It is negative outside the roots: $x < 2$ or $x > 5$, the same answer as before.',
              ),
              prose('Take out the bracket rather than multiplying everything out: it hands you the pole as one of the roots.'),
            ),
            ask('frac-ineq-square-line'),
            ask('frac-ineq-square-steps', 2),
            ask('frac-ineq-square-tiles', 2),
            teach(
              prose(
                'One catch. With $\\le$ or $\\ge$ the quadratic is zero at the pole, so it counts the pole in. The fraction has no value there, so the pole is always a hollow dot. Only the crossing can be filled.',
              ),
            ),
            ask('frac-ineq-shape-flow', 2),
            ask('frac-ineq-square-line', 2),
          ],
          skillCheck: [ask('frac-ineq-square-steps', 2), ask('frac-ineq-shape-flow', 2), ask('frac-ineq-square-line', 2)],
        },
        {
          id: 'af-l4-two-fractions',
          title: 'Fraction against Fraction',
          slides: [
            teach(
              prose(
                'With a fraction on each side, take the right one over and put both over the product of the bottoms. For $\\frac{x + 1}{x - 1} - \\frac{x + 3}{x + 2}$ that is $(x - 1)(x + 2)$, and the top is $(x + 1)(x + 2) - (x + 3)(x - 1)$:',
              ),
              working('&x^{2} + 3x + 2', '-\\;&(x^{2} + 2x - 3)', '=\\;&x + 5'),
              prose('The $x^{2}$ terms cancel, so the top is linear.'),
            ),
            ask('frac-ineq-two-steps'),
            ask('frac-ineq-two-top-tree'),
            ask('frac-ineq-two-top-which'),
            teach(
              prose(
                'So $\\frac{x + 1}{x - 1} \\le \\frac{x + 3}{x + 2}$ is $\\frac{x + 5}{(x - 1)(x + 2)} \\le 0$. Three critical values now: $-5$ from the top, and $-2$ and $1$ from the bottom. Test each of the four regions:',
              ),
              working('x < -5: &\\quad \\text{negative}', '-5 < x < -2: &\\quad \\text{positive}', '-2 < x < 1: &\\quad \\text{negative}', 'x > 1: &\\quad \\text{positive}'),
              prose('So $x \\le -5$ or $-2 < x < 1$.'),
            ),
            ask('frac-ineq-two-line'),
            ask('frac-ineq-two-steps', 2),
            ask('frac-ineq-two-top-tree', 2),
            teach(
              prose(
                'Multiplying through by both bottoms fails for the same reason as before: their product changes sign at each pole. Two poles, so two hollow dots.',
              ),
            ),
            ask('frac-ineq-two-top-which', 2),
            ask('frac-ineq-two-line', 2),
          ],
          skillCheck: [ask('frac-ineq-two-line', 2), ask('frac-ineq-two-steps', 2), ask('frac-ineq-two-top-tree', 2)],
        },
        {
          id: 'af-l4-reading',
          title: 'Reading the Answer',
          slides: [
            teach(
              prose(
                'Each end of the set is settled by what happens there. At a pole the dot is always hollow. At the crossing it is filled for $\\le$ or $\\ge$, and hollow for $<$ or $>$.',
              ),
              prose(
                'Read whole numbers with care. $-2 < x \\le 3$ holds $-1, 0, 1, 2, 3$: the least is $-1$, since $-2$ is left out.',
              ),
            ),
            ask('frac-ineq-table-line'),
            ask('frac-ineq-member-flow'),
            ask('frac-ineq-least-whole'),
            teach(
              prose(
                'On a graph, $\\frac{x + 4}{x - 2} < 3$ is where the curve is below the line $y = 3$. The curve gets from one side of the line to the other only where it meets the line, at $x = 5$, or where it shoots off, at the pole $x = 2$.',
              ),
            ),
            ask('frac-ineq-graph-slider'),
            ask('frac-ineq-table-line', 2),
            ask('frac-ineq-member-flow', 2),
            teach(
              prose(
                'A piece of the set can hold no whole number at all: $-1 < x < 0$ is a real stretch of the line, but nothing whole sits in it. So look past it for the least or greatest whole number.',
              ),
            ),
            ask('frac-ineq-least-whole', 2),
            ask('frac-ineq-graph-slider', 2),
          ],
          skillCheck: [ask('frac-ineq-table-line', 2), ask('frac-ineq-least-whole', 2), ask('frac-ineq-member-flow', 2)],
        },
      ],
      levelCheck: [
        ask('frac-ineq-cases-flow', 2),
        ask('frac-ineq-test-tree', 2),
        ask('frac-ineq-crossing', 2),
        ask('frac-ineq-one-side-steps', 2),
        ask('frac-ineq-new-top-tiles', 2),
        ask('frac-ineq-line', 2),
        ask('frac-ineq-square-steps', 2),
        ask('frac-ineq-shape-flow', 2),
        ask('frac-ineq-square-line', 2),
        ask('frac-ineq-two-top-tree', 2),
        ask('frac-ineq-two-top-which', 2),
        ask('frac-ineq-two-line', 2),
        ask('frac-ineq-least-whole', 2),
        ask('frac-ineq-table-line', 2),
        ask('frac-ineq-graph-slider', 2),
      ],
    },
    {
      id: 'af-l5',
      title: 'Graphs of Rational Functions',
      lessons: [
        {
          id: 'af-l5-vertical',
          title: 'Vertical Asymptotes',
          slides: [
            teach(
              prose(
                'The curve $y = \\frac{x + 1}{(x - 2)(x + 3)}$ has no value where its bottom is zero. Close to there the bottom is tiny, so the fraction is huge, and the curve shoots off beside a vertical line it never touches: a **vertical asymptote**.',
              ),
              graph(
                (x) => (x + 1) / ((x - 2) * (x + 3)),
                { xMin: -7, xMax: 6, yMin: -5, yMax: 5 },
                { x: [2, -3], y: 0 },
                'The curve shooting off either side of two dashed vertical lines, at x = -3 and x = 2',
              ),
              prose(
                'So the vertical asymptotes are where the bottom is zero, here $x = 2$ and $x = -3$. Factorise first, and check nothing cancels: a factor on the top as well is a hole, which comes later in this level.',
              ),
            ),
            ask('frac-va-which'),
            ask('frac-va-slider'),
            teach(
              prose('Which way does each arm go? Near $x = 2$ only the bracket $(x - 2)$ changes sign. Put $x = 2$ into everything else:'),
              working('&\\frac{x + 1}{x + 3} \\text{ at } x = 2', '=\\;&\\tfrac{3}{5}, \\text{ positive}'),
              prose(
                'Just right of $2$, $(x - 2)$ is a tiny positive number, so $y$ is positive and huge. We write $y \\to +\\infty$ as $x \\to 2^{+}$, the $^{+}$ meaning from above. Just left, $(x - 2)$ is a tiny negative number, so $y \\to -\\infty$ as $x \\to 2^{-}$.',
              ),
            ),
            ask('frac-va-side-flow'),
            ask('frac-va-arms-tiles'),
            ask('frac-va-which', 2),
            teach(
              prose(
                'The same test at $x = -3$: everything but $(x + 3)$ gives $\\frac{-2}{-5}$, which is positive. So $y \\to +\\infty$ as $x \\to -3^{+}$, and $y \\to -\\infty$ as $x \\to -3^{-}$.',
              ),
              prose('One arm goes up and the other down whenever a bracket appears once. The rest of the fraction decides which is which.'),
            ),
            ask('frac-va-slider', 2),
            ask('frac-va-side-flow', 2),
            ask('frac-va-arms-tiles', 2),
          ],
          skillCheck: [ask('frac-va-which', 2), ask('frac-va-side-flow', 2), ask('frac-va-arms-tiles', 2)],
        },
        {
          id: 'af-l5-horizontal',
          title: 'Horizontal Asymptotes',
          slides: [
            teach(
              prose(
                'Far out, as $x$ grows large either way, a curve can settle towards a level line: its **horizontal asymptote**. Then only the highest power on each line matters.',
              ),
              graph(
                (x) => (2 * x - 2) / (x + 1),
                { xMin: -9, xMax: 7, yMin: -4, yMax: 8 },
                { x: [-1], y: 2 },
                'The curve flattening out towards a dashed level line at y = 2 on both sides',
              ),
              prose('In $\\frac{2x - 2}{x + 1}$ the top is about $2x$ and the bottom about $x$ when $x$ is huge, so $y$ settles towards $2$.'),
            ),
            ask('frac-ha-value'),
            ask('frac-ha-slider'),
            teach(
              prose(
                'Compare the highest powers. Bottom higher: the fraction shrinks, so $y = 0$. The same: the ratio of the leading coefficients. Top higher: the curve keeps climbing, so there is none.',
              ),
              working('\\frac{3x + 1}{x^2 - 4} &\\to 0', '\\frac{6x^2 + x}{2x^2 - 8} &\\to 3', '\\frac{x^2 + 1}{x - 2} &\\text{ has none}'),
            ),
            ask('frac-ha-flow'),
            ask('frac-ha-which'),
            ask('frac-ha-value', 2),
            teach(
              prose(
                'A factorised line hides its degree. $2(x - 1)(x + 3)$ has two brackets, so degree $2$, and multiplied out it starts $2x^2$. So count the brackets and read the number in front:',
              ),
              maths('\\frac{6(x + 1)(x - 2)}{2(x - 1)(x + 3)} \\to \\frac{6x^2}{2x^2} = 3'),
            ),
            ask('frac-ha-slider', 2),
            ask('frac-ha-flow', 2),
            ask('frac-ha-which', 2),
          ],
          skillCheck: [ask('frac-ha-value', 2), ask('frac-ha-flow', 2), ask('frac-ha-which', 2)],
        },
        {
          id: 'af-l5-holes',
          title: 'Holes',
          slides: [
            teach(
              prose(
                'When the top and bottom share a factor, it cancels. The fraction still has no value where that factor is zero, but everywhere else it is the simplified one:',
              ),
              working('&\\frac{(x - 1)(x + 3)}{(x - 1)(x - 3)}', '=\\;&\\frac{x + 3}{x - 3}, \\quad x \\neq 1'),
              graph(
                (x) => (x + 3) / (x - 3),
                { xMin: -6, xMax: 9, yMin: -5, yMax: 7 },
                { x: [3], y: 1 },
                'The curve with an asymptote at x = 3 and a single missing point, ringed, at x = 1',
                [{ x: 1, y: -2, hollow: true }],
              ),
              prose('So the curve has one missing point at $x = 1$: a **hole**, not an asymptote. Only $x = 3$ is an asymptote.'),
            ),
            ask('frac-hole-flow'),
            ask('frac-hole-slider'),
            teach(
              prose('The hole’s height comes from the simplified form, which is defined there:'),
              maths('\\frac{1 + 3}{1 - 3} = -2'),
              prose('So the hole is at $(1, -2)$. A drawing cannot show one missing point, so it is marked with a ring.'),
            ),
            ask('frac-hole-tree'),
            ask('frac-hole-tiles'),
            ask('frac-hole-flow', 2),
            teach(
              prose('Multiplied out, factorise both lines before deciding anything. And if the whole bottom cancels, what is left is not a fraction at all:'),
              maths('\\frac{(x - 2)(x + 4)}{x - 2} = x + 4'),
              prose('That holds for every $x$ except $2$, so it is a straight line with a hole at $(2, 6)$.'),
            ),
            ask('frac-hole-slider', 2),
            ask('frac-hole-tree', 2),
            ask('frac-hole-tiles', 2),
          ],
          skillCheck: [ask('frac-hole-tree', 2), ask('frac-hole-flow', 2), ask('frac-hole-tiles', 2)],
        },
        {
          id: 'af-l5-intercepts',
          title: 'Intercepts',
          slides: [
            teach(
              prose(
                'The curve meets the $x$-axis where $y = 0$: where the top is zero and the bottom is not. A root of the top that also makes the bottom zero is a hole, not a crossing.',
              ),
              maths('\\frac{(x + 2)(x - 1)}{(x - 1)(x - 4)}'),
              prose('This one crosses the $x$-axis only at $x = -2$. At $x = 1$ it has a hole.'),
            ),
            ask('frac-x-int-which'),
            ask('frac-y-int-tree'),
            teach(
              prose('It meets the $y$-axis at $x = 0$, so put $0$ in. Multiplied out, that leaves just each line’s number:'),
              working('&\\frac{x^2 + x - 6}{x^2 - 4x + 3} \\text{ at } x = 0', '=\\;&\\frac{-6}{3} = -2'),
              prose('If the bottom is zero at $x = 0$, the $y$-axis is an asymptote and there is no $y$-intercept.'),
            ),
            ask('frac-intercepts-flow'),
            ask('frac-y-int-slider'),
            ask('frac-x-int-which', 2),
            teach(
              prose('On a graph, $y = \\frac{x - 2}{x + 1}$ crosses the $x$-axis at $x = 2$ and the $y$-axis at $\\frac{-2}{1} = -2$:'),
              graph(
                (x) => (x - 2) / (x + 1),
                { xMin: -7, xMax: 7, yMin: -6, yMax: 6 },
                { x: [-1], y: 1 },
                'The curve crossing the x-axis at 2 and the y-axis at -2, both ringed',
                [
                  { x: 2, y: 0 },
                  { x: 0, y: -2 },
                ],
              ),
            ),
            ask('frac-y-int-tree', 2),
            ask('frac-intercepts-flow', 2),
            ask('frac-y-int-slider', 2),
          ],
          skillCheck: [ask('frac-x-int-which', 2), ask('frac-y-int-tree', 2), ask('frac-intercepts-flow', 2)],
        },
        {
          id: 'af-l5-sketch',
          title: 'The Sketch',
          slides: [
            teach(
              prose(
                'To sketch a fraction, find every feature first. $y = \\frac{2(x - 1)}{x + 2}$ has asymptotes $x = -2$ and $y = 2$, and meets the axes here:',
              ),
              working('x\\text{-axis: } & x = 1', 'y\\text{-axis: } & y = -1'),
              graph(
                (x) => (2 * (x - 1)) / (x + 2),
                { xMin: -9, xMax: 6, yMin: -4, yMax: 8 },
                { x: [-2], y: 2 },
                'The curve drawn from its features: asymptotes at x = -2 and y = 2, crossing the axes at x = 1 and y = -1',
              ),
            ),
            ask('frac-features-table'),
            ask('frac-sketch-which'),
            teach(
              prose(
                'A curve can cross its horizontal asymptote nearer in, just never far out. To check, set the fraction equal to that level. With equal degrees the $x^2$ terms cancel, leaving a linear equation.',
              ),
              prose('For $\\frac{(x - 1)(x - 5)}{(x + 1)(x - 3)} = 1$, multiply both sides by the bottom:'),
              working('x^2 - 6x + 5 &= x^2 - 2x - 3', '-4x &= -8'),
              prose('So it crosses $y = 1$ at $x = 2$. If the $x$ terms cancel too, nothing is left to solve, and it never crosses.'),
            ),
            ask('frac-cross-ha'),
            ask('frac-sketch-flow'),
            ask('frac-features-table', 2),
            teach(
              prose(
                'When the bottom has the higher degree, the level is $y = 0$, the $x$-axis itself. So the curve crosses it exactly at its $x$-intercepts, and a fraction with a plain number on top never does.',
              ),
            ),
            ask('frac-sketch-which', 2),
            ask('frac-cross-ha', 2),
            ask('frac-sketch-flow', 2),
          ],
          skillCheck: [ask('frac-features-table', 2), ask('frac-cross-ha', 2), ask('frac-sketch-which', 2)],
        },
      ],
      levelCheck: [
        ask('frac-va-which', 2),
        ask('frac-va-arms-tiles', 2),
        ask('frac-va-slider', 2),
        ask('frac-ha-flow', 2),
        ask('frac-ha-value', 2),
        ask('frac-ha-slider', 2),
        ask('frac-hole-tree', 2),
        ask('frac-hole-tiles', 2),
        ask('frac-hole-slider', 2),
        ask('frac-x-int-which', 2),
        ask('frac-y-int-tree', 2),
        ask('frac-y-int-slider', 2),
        ask('frac-features-table', 2),
        ask('frac-sketch-which', 2),
        ask('frac-cross-ha', 2),
      ],
    },
    {
      id: 'af-l6',
      title: 'The Method of Differences',
      lessons: [
        {
          id: 'af-l6-split',
          title: 'The Split That Telescopes',
          slides: [
            teach(
              prose(
                'The **method of differences** adds up a sum by splitting each term into two fractions that cancel along the sum. The split is found by cover-up, as in Partial Fractions.',
              ),
              prose('For $\\frac{1}{r(r + 1)}$, cover $r$ and put $r = 0$: $A = 1$. Cover $r + 1$ and put $r = -1$: $B = -1$.'),
              maths('\\frac{1}{r(r + 1)} = \\frac{1}{r} - \\frac{1}{r + 1}'),
            ),
            ask('frac-diff-cover'),
            ask('frac-diff-split-tiles'),
            ask('frac-diff-which'),
            teach(
              prose('The numerators are equal and opposite, so each term takes away the fraction the next term adds on. Written out, the middle cancels:'),
              working(
                '&\\left(1 - \\tfrac{1}{2}\\right) + \\left(\\tfrac{1}{2} - \\tfrac{1}{3}\\right)',
                '&+ \\dots + \\left(\\tfrac{1}{n} - \\tfrac{1}{n + 1}\\right)',
                '=\\;&1 - \\frac{1}{n + 1}',
              ),
              prose('Sequences & Series practises this cancelling with the split given. Here the work is finding the split.'),
            ),
            ask('frac-diff-partial-table'),
            ask('frac-diff-split-tiles', 2),
            ask('frac-diff-cover', 2),
            teach(
              prose('The brackets need not start at $r$. Cover-up splits $\\frac{1}{(r + 2)(r + 3)}$ into $\\frac{1}{r + 2} - \\frac{1}{r + 3}$, and from $r = 1$ the fraction that survives at the front is $\\frac{1}{3}$:'),
              working('&\\sum_{r=1}^{n} \\frac{1}{(r + 2)(r + 3)}', '=\\;&\\frac{1}{3} - \\frac{1}{n + 3}'),
              prose('When the bottom comes multiplied out, factorise it first: $r^2 + 5r + 6 = (r + 2)(r + 3)$.'),
            ),
            ask('frac-diff-partial-table', 2),
            ask('frac-diff-which', 2),
          ],
          skillCheck: [ask('frac-diff-split-tiles', 2), ask('frac-diff-cover', 2), ask('frac-diff-partial-table', 2)],
        },
        {
          id: 'af-l6-front',
          title: 'A Number in Front',
          slides: [
            teach(
              prose('When the brackets are two apart, cover-up gives numerators of $\\frac{1}{2}$ and $-\\frac{1}{2}$:'),
              maths('\\frac{1}{r(r + 2)} = \\frac{1}{2r} - \\frac{1}{2(r + 2)}'),
              prose('Take the $\\frac{1}{2}$ out in front, and what is left is a difference of two plain fractions:'),
              maths('\\frac{1}{r(r + 2)} = \\frac{1}{2}\\left(\\frac{1}{r} - \\frac{1}{r + 2}\\right)'),
            ),
            ask('frac-gap-cover-tree'),
            ask('frac-gap-factor-tiles'),
            teach(
              prose('Now a fraction taken away comes back **two** terms later, so two survive at each end:'),
              working(
                '&\\sum_{r=1}^{n} \\frac{1}{r(r + 2)}',
                '=\\;&\\frac{1}{2}\\left(1 + \\frac{1}{2}\\right)',
                '&- \\frac{1}{2}\\left(\\frac{1}{n + 1} + \\frac{1}{n + 2}\\right)',
              ),
              prose('The number in front is the top over the gap between the brackets. So $\\frac{5}{(r + 1)(r + 4)}$ has $\\frac{5}{3}$ in front, and three survive at each end.'),
            ),
            ask('frac-gap-ends-tiles'),
            ask('frac-gap-flow'),
            ask('frac-gap-cover-tree', 2),
            teach(
              prose('Keep the number in front outside the bracket to the very end. Multiplying it into only one of the fractions is the usual slip.'),
              working(
                '&\\sum_{r=1}^{n} \\frac{3}{(r + 1)(r + 3)}',
                '=\\;&\\frac{3}{2}\\left(\\frac{1}{2} + \\frac{1}{3}\\right)',
                '&- \\frac{3}{2}\\left(\\frac{1}{n + 2} + \\frac{1}{n + 3}\\right)',
              ),
            ),
            ask('frac-gap-factor-tiles', 2),
            ask('frac-gap-ends-tiles', 2),
            ask('frac-gap-flow', 2),
          ],
          skillCheck: [ask('frac-gap-factor-tiles', 2), ask('frac-gap-ends-tiles', 2), ask('frac-gap-flow', 2)],
        },
        {
          id: 'af-l6-three',
          title: 'Three Factors',
          slides: [
            teach(
              prose(
                'Three brackets in a row split three ways by cover-up. For $\\frac{2}{r(r + 1)(r + 2)}$, cover $r$ and put $r = 0$: the rest is $\\frac{2}{1 \\times 2} = 1$. The other two go the same way:',
              ),
              working('&\\frac{2}{r(r + 1)(r + 2)}', '=\\;&\\frac{1}{r} - \\frac{2}{r + 1} + \\frac{1}{r + 2}'),
            ),
            ask('frac-triple-numerator'),
            ask('frac-triple-cover-tree'),
            ask('frac-triple-tiles'),
            teach(
              prose('Three fractions cancel awkwardly. Pair the brackets instead: two neighbouring pairs differ by the term with $2$ on top.'),
              working(
                '&\\frac{1}{r(r + 1)} - \\frac{1}{(r + 1)(r + 2)}',
                '=\\;&\\frac{(r + 2) - r}{r(r + 1)(r + 2)}',
                '=\\;&\\frac{2}{r(r + 1)(r + 2)}',
              ),
              prose('So $\\frac{1}{r(r + 1)(r + 2)}$ is $\\frac{1}{2}$ of that difference, and it cancels like a pair one apart.'),
            ),
            ask('frac-triple-regroup-tiles'),
            ask('frac-triple-sum-which'),
            ask('frac-triple-tiles', 2),
            teach(
              prose('Summed from $r = 1$, one piece survives at each end:'),
              working(
                '&\\sum_{r=1}^{n} \\frac{1}{r(r + 1)(r + 2)}',
                '=\\;&\\frac{1}{2}\\left(\\frac{1}{2} - \\frac{1}{(n + 1)(n + 2)}\\right)',
              ),
            ),
            ask('frac-triple-regroup-tiles', 2),
            ask('frac-triple-cover-tree', 2),
          ],
          skillCheck: [ask('frac-triple-tiles', 2), ask('frac-triple-regroup-tiles', 2), ask('frac-triple-sum-which', 2)],
        },
        {
          id: 'af-l6-later',
          title: 'Starting Later, and a Top in r',
          slides: [
            teach(
              prose('A sum need not start at $r = 1$. From $r = 4$, the fraction that survives at the front is the term at $r = 4$:'),
              working('&\\sum_{r=4}^{n} \\left(\\frac{1}{r} - \\frac{1}{r + 1}\\right)', '=\\;&\\frac{1}{4} - \\frac{1}{n + 1}'),
              prose('Given the sum, the far piece gives $n$: if it comes to $\\frac{1}{4} - \\frac{1}{n + 1} = \\frac{3}{20}$, then $\\frac{1}{n + 1} = \\frac{1}{10}$ and $n = 9$.'),
            ),
            ask('frac-from-m-table'),
            ask('frac-find-n'),
            teach(
              prose('A top with $r$ in it can still cancel. Two squares side by side differ by $(r + 1)^2 - r^2 = 2r + 1$, so:'),
              maths('\\frac{2r + 1}{r^2(r + 1)^2} = \\frac{1}{r^2} - \\frac{1}{(r + 1)^2}'),
              prose('Check the top is the difference of the two squares; then it cancels like a split one apart.'),
            ),
            ask('frac-square-split-tiles'),
            ask('frac-square-which'),
            ask('frac-from-m-table', 2),
            teach(
              prose('To find $n$ from a sum, write what survives and solve for the far piece:'),
              working('1 - \\frac{1}{(n + 1)^2} &= \\frac{120}{121}', '(n + 1)^2 &= 121', 'n &= 10'),
            ),
            ask('frac-find-n', 2),
            ask('frac-square-split-tiles', 2),
            ask('frac-square-which', 2),
          ],
          skillCheck: [ask('frac-from-m-table', 2), ask('frac-find-n', 2), ask('frac-square-split-tiles', 2)],
        },
        {
          id: 'af-l6-infinity',
          title: 'The Sum to Infinity',
          slides: [
            teach(
              prose(
                'As $n$ grows, every piece with $n$ in it tends to $0$, so the sum to infinity is what survives at the front. Sequences & Series takes these limits with the split given:',
              ),
              working('&\\sum_{r=1}^{\\infty} \\frac{1}{r(r + 2)}', '=\\;&\\frac{1}{2}\\left(1 + \\frac{1}{2}\\right) = \\frac{3}{4}'),
            ),
            ask('frac-infinite-flow'),
            ask('frac-infinite-tree'),
            ask('frac-infinite-which'),
            teach(
              prose(
                'Give the limit as one fraction: add the front pieces over a common bottom, then multiply by the number in front. With three factors, $\\sum_{r=1}^{\\infty} \\frac{1}{r(r + 1)(r + 2)} = \\frac{1}{2} \\times \\frac{1}{2} = \\frac{1}{4}$.',
              ),
            ),
            ask('frac-within'),
            ask('frac-infinite-tree', 2),
            ask('frac-infinite-which', 2),
            teach(
              prose(
                'The partial sum falls short of the limit by exactly the pieces at the far end. For $\\sum \\frac{1}{r(r + 1)}$ that gap is $\\frac{1}{n + 1}$, so being within $0.01$ needs $n + 1 > 100$: $n = 100$.',
              ),
            ),
            ask('frac-within', 2),
            ask('frac-infinite-flow', 2),
          ],
          skillCheck: [ask('frac-infinite-tree', 2), ask('frac-infinite-which', 2), ask('frac-within', 2)],
        },
      ],
      levelCheck: [
        ask('frac-diff-split-tiles', 2),
        ask('frac-diff-cover', 2),
        ask('frac-diff-partial-table', 2),
        ask('frac-gap-factor-tiles', 2),
        ask('frac-gap-cover-tree', 2),
        ask('frac-gap-flow', 2),
        ask('frac-triple-numerator', 2),
        ask('frac-triple-regroup-tiles', 2),
        ask('frac-triple-sum-which', 2),
        ask('frac-square-split-tiles', 2),
        ask('frac-find-n', 2),
        ask('frac-from-m-table', 2),
        ask('frac-infinite-tree', 2),
        ask('frac-infinite-which', 2),
        ask('frac-within', 2),
      ],
    },
  ],
};
