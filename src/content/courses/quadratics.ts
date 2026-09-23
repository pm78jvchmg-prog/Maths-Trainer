/**
 * Quadratics.
 *
 * Level 1 is the algebra: expanding two brackets, then running it backwards.
 * Level 2 solves, with the three methods in the order they should be reached
 * for — factorise if you can, complete the square to understand why, use the
 * formula when neither works. Level 3 is the graph, where every result from the
 * first two levels turns out to be a feature you can point at. Level 4 puts a
 * straight line on the same axes: substituting one equation into the other
 * gives a quadratic whose roots are where the two meet, and its discriminant
 * says whether they cross, touch or miss before anything is solved. Level 5
 * asks where a quadratic is positive or negative: the roots split the line,
 * and which way up the curve is says whether the answer is the piece between
 * them or the two pieces outside. Level 6 puts all of it to work in a
 * situation: a ball in flight, a fenced pen, a stall's profit, an arch. The
 * maths is the same; what is new is saying what each number means. Level 7
 * finds quadratics in disguise: $x^{4}$, $\sqrt{x}$, $\frac{1}{x}$ or a
 * bracket standing where $x$ usually does. Substitute $u$, solve, and go back,
 * where one root in $u$ can give two values of $x$, one, or none.
 *
 * Each level closes with a level check: twelve to fifteen questions, no
 * teaching slides, one attempt each.
 */
import type { Block, Course, SlideRef } from '../types';
import { parabolaSvg, plotSvg, quadratic } from '../figures';
import { signFigure } from '../generators/quadraticInequalities';
import { flightFigure } from '../generators/quadraticModelling';

type TeachBlock = Block;

const teach = (...blocks: TeachBlock[]): SlideRef => ({
  type: 'literal',
  slide: { kind: 'teach', body: blocks },
});

const ask = (generatorId: string, difficulty = 1): SlideRef => ({
  type: 'generated',
  generatorId,
  difficulty,
});

const prose = (text: string): Block => ({ kind: 'prose', text });

/**
 * An exercise with a line of teaching above it, on the same slide.
 *
 * Used where the question changes direction — a check by substitution after a
 * run of expansions, a decision after a run of arithmetic — so the lesson
 * reads as one thread rather than a quiz that keeps changing subject. The
 * continuity belongs to the lesson rather than to the generator, which is why
 * it is a property of the reference.
 */
const askWith = (generatorId: string, text: string, difficulty = 1): SlideRef => ({
  type: 'generated',
  generatorId,
  difficulty,
  leadIn: [prose(text)],
});

/**
 * The curve a teaching slide is talking about.
 *
 * Every slide in "The Line of Symmetry" describes a picture — a line through
 * the turning point, roots either side of it, where the curve crosses the
 * vertical axis — and described a picture that was never drawn. Words about a
 * graph are not a graph.
 */
const graph = (
  a: number,
  b: number,
  c: number,
  opts: Parameters<typeof parabolaSvg>[3],
): Block => ({
  kind: 'diagram',
  svg: parabolaSvg(a, b, c, opts),
});
const maths = (tex: string) => ({ kind: 'display' as const, tex });

/**
 * A curve and straight lines on the same axes, for level 4.
 *
 * The first line is drawn in the accent colour and any others dashed, so a
 * slide comparing three lines against one curve can say "the solid one" and
 * mean something. `curve` is `[a, b, c]` and each line `[m, k]`.
 */
const crossing = (
  curve: [number, number, number],
  lines: [number, number][],
  window: { xMin: number; xMax: number; yMin: number; yMax: number },
  marks: { x: number; y: number }[] = [],
): Block => ({
  kind: 'diagram',
  svg: plotSvg({
    ...window,
    curves: [
      { f: quadratic(...curve) },
      ...lines.map(([m, k], index) => ({
        f: (x: number) => m * x + k,
        accent: index === 0,
        dashed: index > 0,
      })),
    ],
    marks,
    label: lines.length === 1 ? 'A parabola and a straight line' : 'A parabola and three parallel lines',
  }),
});

/**
 * A parabola from its roots, for level 5, drawn the way its questions draw
 * one: the same window, hollow or solid rings, and the part of the curve an
 * inequality is about picked out in the accent colour.
 */
const signGraph = (
  a: number,
  p: number,
  q: number,
  opts: Parameters<typeof signFigure>[1],
): Block => ({ kind: 'diagram', svg: signFigure({ a, p, q }, opts) });

/**
 * The area of a pen, $A = x\left(n - x\right)$, for level 6: drawn only from
 * $x = 0$ to $x = n$, where the model has a pen to describe.
 */
const areaGraph = (n: number, marks: { x: number; y: number }[], label: string): Block => ({
  kind: 'diagram',
  svg: plotSvg({
    xMin: 0,
    xMax: n + 1,
    yMin: -(n * n) / 32,
    yMax: (n * n) / 4 * 1.2,
    curves: [{ f: (x: number) => (x <= n ? x * (n - x) : NaN), breaks: true }],
    verticals: [{ x: 0, dashed: false }],
    marks,
    label,
  }),
});

/**
 * A curve for level 7, with its crossings of the $x$-axis ringed. Any number
 * of curves, the first solid and the rest dashed, so a slide can show a
 * quadratic in $u$ beside the same curve slid along.
 */
const disguiseGraph = (
  fs: ((x: number) => number)[],
  window: { xMin: number; xMax: number; yMin: number; yMax: number },
  marks: number[],
  label: string,
): Block => ({
  kind: 'diagram',
  svg: plotSvg({
    ...window,
    curves: fs.map((f, index) => ({ f, breaks: true, dashed: index > 0 })),
    verticals: [{ x: 0, dashed: false }],
    marks: marks.map((x) => ({ x, y: 0 })),
    label,
  }),
});

/** A flight for level 6, from the throw to the landing. */
const flightGraph = (h0: number, v: number, opts: Parameters<typeof flightFigure>[2]): Block => ({
  kind: 'diagram',
  svg: flightFigure(h0, v, opts),
});

export const quadratics: Course = {
  id: 'quadratics',
  title: 'Quadratics',
  blurb: 'Expanding, factorising, three ways to solve, the parabola, where a line meets it, and inequalities.',
  levels: [
    {
      id: 'qd-l1',
      title: 'Expanding and Factorising',
      lessons: [
        {
          id: 'qd-l1-expand',
          title: 'Expanding Two Brackets',
          slides: [
            teach(
              prose(
                'Multiplying two brackets means multiplying every term in the first by every term in the second. With two terms in each, that is four products.',
              ),
              maths('\\left(x + 3\\right)\\left(x + 5\\right) = x^{2} + 5x + 3x + 15'),
              prose('The two middle terms are both multiples of $x$, so they combine into one.'),
              maths('x^{2} + 8x + 15'),
              prose(
                'Two brackets of two terms always give three terms, which is why this shape — a **quadratic** — turns up everywhere.',
              ),
            ),
            ask('quad-expand'),
            ask('quad-expand-term'),
            ask('quad-expand+choice'),
            teach(
              prose(
                'Look at where the two final numbers went. The 3 and the 5 added to give the middle coefficient, and multiplied to give the constant.',
              ),
              maths('\\left(x + p\\right)\\left(x + q\\right) = x^{2} + \\left(p + q\\right)x + pq'),
              prose(
                'That is worth knowing by heart, because it turns expanding into arithmetic and, in the next lesson, factorising into a search for two numbers.',
              ),
              prose(
                'Swapping the sum and the product is the error to watch for. Both come from the same pair of numbers, so a wrong answer still looks plausible.',
              ),
            ),
            ask('quad-expand-square'),
            askWith('quad-evaluate-steps', 'Here is the check that costs nothing. Put a number in for $x$: the expanded form and the brackets must give the same value.'),
            ask('quad-expand-term+choice'),
            teach(
              prose('Negative numbers need no new rule, only care with signs.'),
              maths('\\left(x - 4\\right)\\left(x + 7\\right) = x^{2} + 3x - 28'),
              prose(
                'The sum is $-4 + 7 = 3$ and the product is $-4 \\times 7 = -28$. Carry each number with its own sign into both calculations.',
              ),
              prose(
                'A negative constant always means the two numbers had opposite signs. That is a useful check here, and the first thing to notice when factorising later.',
              ),
            ),
            ask('quad-expand-square+choice'),
            ask('quad-evaluate-steps+choice'),
          ],
          skillCheck: [
            ask('quad-expand', 2),
            ask('quad-expand-square', 2),
            ask('quad-expand-term', 2),
          ],
        },
        {
          id: 'qd-l1-factorise',
          title: 'Factorising',
          slides: [
            teach(
              prose(
                'Factorising is expanding run backwards: given $x^{2} + 8x + 15$, find the two brackets it came from.',
              ),
              prose(
                'The pattern from the last lesson says exactly what to look for. The two numbers multiply to the constant and add to the coefficient of $x$.',
              ),
              maths('x^{2} + 8x + 15 = \\left(x + 3\\right)\\left(x + 5\\right)'),
              prose(
                'Start from the constant rather than the middle term. It usually has fewer factor pairs, so there is less to check: 15 is only $1 \\times 15$ or $3 \\times 5$.',
              ),
              prose(
                'Then test each pair against the middle coefficient. $1 + 15 = 16$, which is wrong; $3 + 5 = 8$, which is right.',
              ),
            ),
            ask('quad-factorise'),
            ask('quad-factor-one'),
            ask('quad-factorise+choice'),
            teach(
              prose('The signs can be settled before any searching, which removes most of the work.'),
              prose(
                'A positive constant means both numbers share a sign, and the middle coefficient says which. A negative constant means they have opposite signs.',
              ),
              maths('x^{2} - 2x - 15 = \\left(x + 3\\right)\\left(x - 5\\right)'),
              prose(
                'Here the constant is negative, so the signs differ; the middle term is negative, so the larger of the two numbers is the negative one.',
              ),
            ),
            ask('quad-factorise-route'),
            askWith('quad-expand-term', 'Factorising is expanding run backwards, so expanding is how you check it. This one asks for the middle coefficient alone.'),
            ask('quad-factor-one+choice'),
            teach(
              prose(
                'Not every quadratic factorises with whole numbers, and there is nothing wrong with one that does not — Level 2 has two methods that work regardless.',
              ),
              maths('x^{2} + x + 1'),
              prose(
                'No pair of whole numbers multiplies to 1 and adds to 1, so this one does not factorise. Recognising that quickly is worth as much as factorising the ones that do.',
              ),
              prose(
                'Check by expanding, always. It takes seconds and catches a sign slip immediately.',
              ),
            ),
            askWith('quad-evaluate-steps', 'The other check: both forms must agree at every value of $x$, so pick one and work it out.'),
            ask('quad-expand-term+choice'),
          ],
          skillCheck: [
            ask('quad-factorise', 2),
            ask('quad-factorise', 2),
            ask('quad-factor-one', 2),
          ],
        },
        {
          id: 'qd-l1-squares',
          title: 'The Difference of Two Squares',
          slides: [
            teach(
              prose(
                'One quadratic shape factorises with no searching at all: a square minus a square.',
              ),
              maths('a^{2} - b^{2} = \\left(a - b\\right)\\left(a + b\\right)'),
              prose(
                'Expanding the right-hand side shows why. The two middle terms are $+ab$ and $-ab$, and they cancel, leaving no middle term behind.',
              ),
              maths('\\left(a - b\\right)\\left(a + b\\right) = a^{2} + ab - ab - b^{2}'),
              prose(
                'So a quadratic with *no* $x$ term and a negative constant is the one to test for this pattern first.',
              ),
            ),
            ask('quad-difference-squares'),
            askWith('quad-squares-arithmetic', 'The same identity, turned on numbers. Two squarings and a subtraction become one small multiplication.'),
            ask('quad-squares-spot'),
            teach(
              prose('Both factors carry the square *root*, not the original number.'),
              maths('x^{2} - 49 = \\left(x - 7\\right)\\left(x + 7\\right)'),
              prose(
                'The 49 becomes 7 in each bracket. Writing $\\left(x - 49\\right)\\left(x + 49\\right)$ is the standard mistake, and expanding it gives $x^{2} - 2401$.',
              ),
              prose('A coefficient on $x^{2}$ is no obstacle provided it is a square too.'),
              maths('9x^{2} - 25 = \\left(3x - 5\\right)\\left(3x + 5\\right)'),
            ),
            ask('quad-difference-squares+choice'),
            ask('quad-factorise-route'),
            ask('quad-squares-arithmetic+choice'),
            teach(
              prose(
                'A *sum* of two squares is a different matter. $x^{2} + 49$ does not factorise at all over the real numbers, and no amount of searching will help.',
              ),
              prose(
                'The pattern needs the subtraction, because that is what makes the two middle terms cancel.',
              ),
              maths('x^{2} + 49 \\neq \\left(x + 7\\right)\\left(x + 7\\right)'),
              prose(
                'Expanding the right-hand side gives $x^{2} + 14x + 49$, which has a middle term the original does not.',
              ),
            ),
            ask('quad-squares-spot'),
            ask('quad-factorise-route'),
          ],
          skillCheck: [
            ask('quad-difference-squares', 2),
            ask('quad-difference-squares', 2),
            ask('quad-squares-arithmetic', 2),
          ],
        },
        {
          id: 'qd-l1-coefficient',
          title: 'Factorising with a Coefficient',
          slides: [
            teach(
              prose(
                'When the coefficient of $x^{2}$ is larger than 1 the two brackets are no longer interchangeable, and the simple sum-and-product rule breaks down.',
              ),
              maths('3x^{2} + 11x + 6 = \\left(3x + 2\\right)\\left(x + 3\\right)'),
              prose(
                'One bracket has to start with $3x$ and the other with $x$, because 3 is prime. The two constants still multiply to 6.',
              ),
              prose(
                'But the middle term is no longer their sum. Each constant gets multiplied by the coefficient in the other bracket on its way to the middle.',
              ),
              maths('3 \\times 3 + 2 \\times 1 = 11'),
            ),
            ask('quad-factorise-coefficient'),
            ask('quad-expand-term', 2),
            ask('quad-factorise-coefficient+choice'),
            teach(
              prose('That means the order of the two constants matters, which is the extra difficulty.'),
              maths('\\left(3x + 3\\right)\\left(x + 2\\right) = 3x^{2} + 9x + 6'),
              prose(
                'Same constants, swapped over, and the middle term is 9 rather than 11. Both arrangements give the right constant, so only the middle term can tell them apart.',
              ),
              prose(
                'So expanding to check is not optional here. It is the only way to know which of the two arrangements is the right one.',
              ),
            ),
            askWith('quad-common-factor', 'Before any of that, look for a factor every term shares. Taking it out makes what is left smaller.'),
            ask('quad-evaluate-steps', 2),
            ask('quad-common-factor+choice'),
            teach(
              prose(
                'Take out a common factor first whenever there is one. It makes everything that follows easier.',
              ),
              maths(
                '2x^{2} + 10x + 12 = 2\\left(x^{2} + 5x + 6\\right) = 2\\left(x + 2\\right)\\left(x + 3\\right)',
              ),
              prose(
                'The 2 came out and left a quadratic with a leading coefficient of 1 — back to the simple case. Checking for a common factor costs nothing and often removes the difficulty entirely.',
              ),
            ),
            ask('quad-factorise-route'),
            ask('quad-expand-term+choice', 2),
          ],
          skillCheck: [
            ask('quad-factorise-coefficient', 2),
            ask('quad-factorise-coefficient', 2),
            ask('quad-common-factor', 2),
          ],
        },
      ],
      levelCheck: [
        ask('quad-expand', 2),
        ask('quad-factorise', 2),
        ask('quad-difference-squares', 2),
        ask('quad-factorise-coefficient', 2),
        ask('quad-expand-square', 2),
        ask('quad-common-factor', 2),
        ask('quad-factor-one', 2),
        ask('quad-squares-arithmetic', 2),
        ask('quad-expand-term', 2),
        ask('quad-factorise-route', 2),
        ask('quad-squares-spot', 2),
        ask('quad-evaluate-steps', 2),
      ],
    },
    {
      id: 'qd-l2',
      title: 'Solving Quadratic Equations',
      lessons: [
        {
          id: 'qd-l2-solve',
          title: 'Solving by Factorising',
          slides: [
            teach(
              prose(
                'Solving a quadratic means finding the values of $x$ that make it zero. Factorising first turns one hard equation into two easy ones.',
              ),
              maths('x^{2} - 2x - 15 = 0 \\implies \\left(x + 3\\right)\\left(x - 5\\right) = 0'),
              prose(
                'If a product of two things is zero then at least one of them is zero. There is no other way for a product to vanish.',
              ),
              maths('x + 3 = 0 \\quad \\text{or} \\quad x - 5 = 0'),
              prose(
                'So $x = -3$ or $x = 5$. A quadratic has up to two solutions and both are part of the answer.',
              ),
            ),
            ask('quad-solve-factorise'),
            askWith('quad-other-root', 'The two roots are tied together by the equation, so one of them hands you the other without any factorising at all.'),
            ask('quad-solve-factorise+choice'),
            teach(
              prose(
                'The signs flip between the bracket and the root, and this is the single most common place to go wrong.',
              ),
              maths('\\left(x + 3\\right) = 0 \\implies x = -3'),
              prose(
                'A factor of $\\left(x + 3\\right)$ gives a root of $-3$, not $+3$. Reading the numbers straight off the brackets without flipping gets both answers wrong.',
              ),
              prose(
                'Substituting back is the check: $\\left(-3\\right)^{2} - 2\\left(-3\\right) - 15 = 9 + 6 - 15 = 0$, so $-3$ is genuinely a root.',
              ),
            ),
            ask('quad-root-slider'),
            askWith('quad-evaluate-steps', 'Substituting is how a root is checked: a value that makes the whole expression zero is a root, and anything else is not.'),
            ask('quad-other-root+choice'),
            teach(
              prose(
                'The method needs the equation to equal zero first, so everything has to be moved to one side before factorising.',
              ),
              maths('x^{2} + 2x = 15 \\implies x^{2} + 2x - 15 = 0'),
              prose(
                'Factorising the left-hand side of $x^{2} + 2x = 15$ as it stands achieves nothing, because a product equal to 15 says nothing at all about either factor. Only zero has that property.',
              ),
              prose(
                'So rearrange first, every time. Skipping that step is what produces confidently wrong answers.',
              ),
            ),
            ask('quad-factorise'),
            ask('quad-evaluate-steps+choice'),
          ],
          skillCheck: [
            ask('quad-solve-factorise', 2),
            ask('quad-solve-factorise', 2),
            ask('quad-other-root', 2),
          ],
        },
        {
          id: 'qd-l2-square',
          title: 'Completing the Square',
          slides: [
            teach(
              prose(
                'Every quadratic can be written as a single squared bracket plus a constant, whether or not it factorises. That form is called **completed square**.',
              ),
              maths('x^{2} + 6x + 11 = \\left(x + 3\\right)^{2} + 2'),
              prose('The number inside the bracket is always half the coefficient of $x$: half of 6 is 3.'),
              prose(
                'But $\\left(x + 3\\right)^{2}$ expands to $x^{2} + 6x + 9$, whose constant is 9 rather than 11. The difference, $11 - 9 = 2$, is added on outside.',
              ),
              maths('\\left(x + 3\\right)^{2} + 2 = x^{2} + 6x + 9 + 2'),
            ),
            ask('quad-complete-square'),
            askWith('quad-min-value', 'Which is what the completed square is for: once $x$ appears only inside a square, the smallest the curve ever gets is in plain sight.'),
            ask('quad-complete-square-steps'),
            teach(
              prose('So the method is two steps: halve the middle coefficient, then correct the constant.'),
              maths(
                'x^{2} + bx + c = \\left(x + \\frac{b}{2}\\right)^{2} + c - \\frac{b^{2}}{4}',
              ),
              prose(
                'Forgetting the correction is the characteristic error, and it always leaves the answer wrong by exactly the square of the halved number.',
              ),
              prose('Expanding the bracket back is the check, and it takes one line.'),
            ),
            ask('quad-turning-point'),
            ask('quad-vertex-slider'),
            ask('quad-min-value+choice'),
            teach(
              prose('Why bother? Because this form answers questions the original cannot.'),
              maths('\\left(x + 3\\right)^{2} + 2 \\geq 2'),
              prose(
                'A square is never negative, so the smallest this expression can be is 2, reached when $x = -3$. The minimum value and where it happens both fall straight out.',
              ),
              prose(
                'It also solves the equation directly with no factorising: set it to zero, move the constant across, and take the square root of both sides.',
              ),
            ),
            ask('quad-turning-point+choice'),
            ask('quad-vertex-slider'),
          ],
          skillCheck: [
            ask('quad-complete-square', 2),
            ask('quad-complete-square', 2),
            ask('quad-min-value', 2),
          ],
        },
        {
          id: 'qd-l2-formula',
          title: 'The Quadratic Formula',
          slides: [
            teach(
              prose(
                'The formula solves every quadratic, including the ones that do not factorise with whole numbers.',
              ),
              maths('x = \\frac{-b \\pm \\sqrt{b^{2} - 4ac}}{2a}'),
              prose(
                'It comes from completing the square on the general equation $ax^{2} + bx + c = 0$, so it is not a separate idea — it is the same method, done once in advance with letters.',
              ),
              prose('The $\\pm$ is where the two roots come from: one for the plus, one for the minus.'),
              prose(
                'Write down $a$, $b$ and $c$ with their signs before substituting anything. Most errors here are sign errors made while reading the equation.',
              ),
            ),
            askWith('quad-formula-values', 'Start where the errors start. Name the three coefficients, with their signs, before anything goes into the formula.'),
            ask('quad-discriminant-steps'),
            ask('quad-formula-values+choice'),
            teach(
              prose('Work out the part under the root first, on its own, and then substitute.'),
              maths('x^{2} + 3x - 5 = 0 \\implies b^{2} - 4ac = 9 + 20 = 29'),
              maths('x = \\frac{-3 \\pm \\sqrt{29}}{2}'),
              prose(
                'Here $c$ is negative, so $-4ac$ came out positive and the two numbers added. Two sign changes in a row is where this most often goes wrong.',
              ),
              prose(
                '29 is not a perfect square, so the roots are irrational. Leaving the surd in place keeps the answer exact; turning it into a decimal rounds it.',
              ),
            ),
            ask('quad-formula'),
            ask('quad-discriminant-steps+choice'),
            ask('quad-formula+choice'),
            teach(
              prose('The larger root always comes from the plus branch, provided $a$ is positive.'),
              maths(
                'x = \\frac{-3 + \\sqrt{29}}{2} \\approx 1.19 \\qquad x = \\frac{-3 - \\sqrt{29}}{2} \\approx -4.19',
              ),
              prose(
                'Note that the whole numerator sits over $2a$, not just the root. Writing the $-b$ outside the fraction is a common slip and gives an answer wrong by a predictable amount.',
              ),
              prose(
                'Try factorising first. When it works it is faster, and when it does not, the formula is waiting.',
              ),
            ),
            ask('quad-choose-method'),
            ask('quad-root-count'),
          ],
          skillCheck: [
            ask('quad-discriminant-steps+choice', 2),
            ask('quad-choose-method', 2),
            ask('quad-formula', 2),
          ],
        },
        {
          id: 'qd-l2-discriminant',
          title: 'The Discriminant',
          slides: [
            teach(
              prose(
                'The quantity under the square root in the formula has a name of its own: the **discriminant**.',
              ),
              maths('\\Delta = b^{2} - 4ac'),
              prose(
                'Its sign alone decides how many real roots the equation has, because a square root behaves differently on positive, zero and negative inputs.',
              ),
              prose(
                'Positive means two distinct real roots. Zero means exactly one. Negative means none at all, since no real number squares to a negative.',
              ),
              prose(
                'So the discriminant answers "how many roots" without ever finding them, which is often all a question wants.',
              ),
            ),
            ask('quad-discriminant-tree'),
            ask('quad-root-count'),
            askWith('quad-formula-values', 'Everything in $b^{2} - 4ac$ comes from the three coefficients, so reading them off correctly is the whole battle.'),
            teach(
              prose('Each case has a graphical meaning, and it is worth holding both pictures at once.'),
              maths('\\Delta > 0 \\qquad \\Delta = 0 \\qquad \\Delta < 0'),
              prose(
                'A positive discriminant means the curve crosses the $x$-axis twice. Zero means it touches the axis at a single point, its turning point sitting exactly on the axis. Negative means the curve misses the axis entirely.',
              ),
              prose(
                'When the discriminant is zero the quadratic is a perfect square, which is useful in reverse: a perfect square always has a repeated root.',
              ),
            ),
            ask('quad-discriminant'),
            ask('quad-formula-values+choice'),
            ask('quad-root-count'),
            teach(
              prose(
                'Only the sign matters, never the size. A discriminant of 1 and a discriminant of 10000 both mean two distinct roots.',
              ),
              maths('\\Delta = \\left(-6\\right)^{2} - 4\\left(1\\right)\\left(9\\right) = 0'),
              prose(
                'Squaring $b$ always gives a positive number whatever the sign of $b$. Losing that is the most frequent arithmetic slip in this calculation.',
              ),
              prose(
                'Compute it, look at the sign, stop. Going on to find the roots when the question only asked how many is wasted work.',
              ),
            ),
            ask('quad-choose-method'),
            ask('quad-formula'),
          ],
          skillCheck: [
            ask('quad-discriminant', 2),
            ask('quad-root-count', 2),
            ask('quad-root-count', 2),
          ],
        },
      ],
      levelCheck: [
        ask('quad-solve-factorise', 2),
        ask('quad-complete-square', 2),
        ask('quad-formula', 2),
        ask('quad-discriminant', 2),
        ask('quad-root-count', 2),
        ask('quad-other-root', 2),
        ask('quad-min-value', 2),
        ask('quad-formula-values', 2),
        ask('quad-discriminant-tree', 2),
        ask('quad-root-slider', 2),
        ask('quad-vertex-slider', 2),
        ask('quad-choose-method', 2),
      ],
    },
    {
      id: 'qd-l3',
      title: 'Quadratic Graphs',
      lessons: [
        {
          id: 'qd-l3-symmetry',
          title: 'The Line of Symmetry',
          slides: [
            teach(
              prose(
                'The graph of a quadratic is a **parabola**, and every parabola is symmetric about a vertical line through its turning point.',
              ),
              // y = x^2 - 4x + 1, turning point at x = 2. Fold the picture along
              // the dashed line and the two halves land on each other.
              graph(1, -4, 1, { xMin: -2, xMax: 6, verticals: [{ x: 2 }], marks: [{ x: 2, y: -3 }] }),
              prose(
                'Fold the picture along that line and the two halves land exactly on top of each other. Everything else about the curve follows from where the line is.',
              ),
              maths('x = -\\frac{b}{2a}'),
              prose(
                'That formula is the completed-square result read off directly: completing the square on $ax^{2} + bx + c$ puts $\\frac{b}{2a}$ inside the bracket, and the line of symmetry is where the bracket is zero.',
              ),
              prose(
                'A positive coefficient on $x^{2}$ opens the curve upwards, so the turning point is a minimum. A negative one opens it downwards and the turning point is a maximum.',
              ),
              prose(
                'The sign of $b$ goes into the formula attached to the term. A negative $b$ gives a positive line of symmetry, and that double negative is where this goes wrong.',
              ),
            ),
            ask('quad-symmetry-slider'),
            ask('quad-symmetry'),
            ask('quad-symmetry+choice'),
            teach(
              prose(
                'The symmetry is genuinely useful rather than decorative: the two roots sit at equal distances either side of the line.',
              ),
              // y = x^2 - 8x + 7 crosses at 1 and 7; the line sits at 4, three
              // from each, which is the claim the slide is making.
              graph(1, -8, 7, {
                xMin: -1,
                xMax: 9,
                verticals: [{ x: 4 }],
                marks: [
                  { x: 1, y: 0 },
                  { x: 7, y: 0 },
                ],
              }),
              prose(
                'Here the curve crosses at $1$ and at $7$. Each is three units from the dashed line, so the line is at $4$ — halfway between them.',
              ),
              maths('x = 1 \\quad x = 7 \\quad \\longrightarrow \\quad x = 4'),
              prose(
                'So the line of symmetry is the average of the two roots, which is often the fastest way to find it when the roots are already known.',
              ),
              prose(
                'It works in the other direction too: one root plus the line of symmetry gives the other root immediately, with no factorising at all.',
              ),
            ),
            askWith('quad-other-root', 'The two roots sit at equal distances either side of that line, so one root and the equation fix the other.'),
            askWith('quad-complete-square', 'Completing the square puts the line of symmetry in plain sight: it runs through the value that makes the bracket zero.'),
            ask('quad-other-root+choice'),
            teach(
              prose(
                'The $y$-intercept needs no work at all. Setting $x = 0$ leaves only the constant term.',
              ),
              // The ringed point is where x = 0, sitting at the constant.
              graph(1, 6, 11, { xMin: -7, xMax: 1, marks: [{ x: 0, y: 11 }] }),
              maths('y = x^{2} + 6x + 11 \\implies y = 11 \\text{ when } x = 0'),
              prose(
                'So the constant is always where the curve crosses the vertical axis. Two features of the graph are therefore free on sight: the constant gives the $y$-intercept, and the sign of the $x^{2}$ coefficient gives the direction.',
              ),
            ),
            ask('quad-symmetry-slider'),
            ask('quad-complete-square+choice'),
          ],
          skillCheck: [
            ask('quad-symmetry', 2),
            ask('quad-symmetry', 2),
            ask('quad-other-root', 2),
          ],
        },
        {
          id: 'qd-l3-turning',
          title: 'The Turning Point',
          slides: [
            teach(
              prose(
                'Completing the square gives the turning point exactly, with no calculus and no guessing.',
              ),
              maths('y = \\left(x + 3\\right)^{2} + 2'),
              prose(
                'A square is never negative, so at best the bracket contributes nothing. The smallest $y$ can be is 2, and that happens when the bracket is zero.',
              ),
              prose(
                'The bracket is zero at $x = -3$, so the turning point is $\\left(-3, 2\\right)$.',
              ),
              prose(
                'The $x$ coordinate is the negative of the number inside the bracket. That sign flip is the one thing to get right here.',
              ),
            ),
            ask('quad-turning-point'),
            ask('quad-vertex-slider'),
            ask('quad-turning-point+choice'),
            teach(
              prose('So the completed-square form can be read directly as a position.'),
              maths('y = \\left(x - p\\right)^{2} + q \\quad \\longrightarrow \\quad \\left(p, q\\right)'),
              prose(
                'Written with a minus inside, the $x$ coordinate reads off unchanged; written with a plus, it changes sign. The safest habit is to ask where the bracket equals zero rather than trying to remember which way round it goes.',
              ),
              prose('The $y$ coordinate is the constant outside, always unchanged.'),
            ),
            ask('quad-complete-square', 2),
            ask('quad-evaluate-tree'),
            ask('quad-min-value'),
            teach(
              prose(
                'When the $x^{2}$ coefficient is negative the whole picture inverts and the turning point becomes a maximum.',
              ),
              maths('y = -\\left(x - 4\\right)^{2} + 9'),
              prose(
                'The bracket still contributes nothing at best, but now nothing is the *largest* it can be rather than the smallest. So $\\left(4, 9\\right)$ is a maximum, and 9 is the greatest value $y$ ever takes.',
              ),
              prose(
                'The same reading gives the point either way. Only the word — maximum or minimum — depends on the sign out front.',
              ),
            ),
            ask('quad-vertex-slider'),
            ask('quad-symmetry'),
          ],
          skillCheck: [
            ask('quad-turning-point', 2),
            ask('quad-turning-point', 2),
            ask('quad-min-value', 2),
          ],
        },
        {
          id: 'qd-l3-roots',
          title: 'Roots on the Graph',
          slides: [
            teach(
              prose(
                'A root of a quadratic is an $x$ value where $y$ is zero, which on the graph is a point where the curve meets the $x$-axis.',
              ),
              prose(
                'So solving, factorising and sketching are three views of one thing. The factors give the roots; the roots give the crossing points.',
              ),
              maths(
                'y = \\left(x + 3\\right)\\left(x - 5\\right) \\quad \\longrightarrow \\quad x = -3, \\; x = 5',
              ),
              prose(
                'Reading backwards works too: a curve crossing at $-3$ and 5 must have $\\left(x + 3\\right)$ and $\\left(x - 5\\right)$ among its factors.',
              ),
              prose(
                'The signs flip in both directions, which is worth saying twice because it catches people both ways round.',
              ),
            ),
            ask('quad-from-roots'),
            ask('quad-root-count'),
            ask('quad-root-slider'),
            teach(
              prose(
                'Going from roots to an equation: each root $r$ contributes a factor $\\left(x - r\\right)$.',
              ),
              maths(
                'x = 4, \\; x = -2 \\implies y = \\left(x - 4\\right)\\left(x + 2\\right) = x^{2} - 2x - 8',
              ),
              prose(
                'Any multiple of that has the same roots, so the answer is only unique once the question fixes the coefficient of $x^{2}$.',
              ),
              prose(
                'Expanding at the end is usually expected, but the factorised form is the one that shows the roots, so keep both.',
              ),
            ),
            ask('quad-from-roots'),
            ask('quad-discriminant-steps'),
            ask('quad-root-count'),
            teach(
              prose('The discriminant and the graph agree, as they must.'),
              prose(
                'Two roots means two crossings. One root means the curve touches the axis at its turning point. No real roots means the curve sits entirely on one side of the axis and never reaches it.',
              ),
              maths('\\Delta = 0 \\quad \\longrightarrow \\quad \\left(-\\frac{b}{2a}, \\; 0\\right)'),
              prose(
                'That last case is worth picturing. The curve still exists and still has a turning point; it simply has no real roots, which is a statement about the axis rather than about the curve.',
              ),
            ),
            ask('quad-root-slider'),
            ask('quad-discriminant-steps+choice'),
          ],
          skillCheck: [
            ask('quad-from-roots', 2),
            ask('quad-from-roots', 2),
            ask('quad-root-count', 2),
          ],
        },
        {
          id: 'qd-l3-sketch',
          title: 'Putting a Sketch Together',
          slides: [
            teach(
              prose(
                'A sketch needs four things, and all four have already been covered: the direction, the $y$-intercept, the roots, and the turning point.',
              ),
              prose(
                'Direction comes from the sign of the $x^{2}$ coefficient. The $y$-intercept is the constant term. The roots come from factorising or the formula. The turning point comes from completing the square, or from the line of symmetry.',
              ),
              maths('y = x^{2} - 2x - 8'),
              prose(
                'Positive coefficient, so it opens upwards. Constant $-8$, so it crosses the vertical axis there. Factorising gives $\\left(x - 4\\right)\\left(x + 2\\right)$, so the roots are 4 and $-2$.',
              ),
              prose(
                'The line of symmetry is the average of the roots, $x = 1$, and substituting gives $y = -9$. So the turning point is $\\left(1, -9\\right)$.',
              ),
            ),
            ask('quad-symmetry'),
            ask('quad-turning-point'),
            ask('quad-from-roots'),
            teach(
              prose('Work in that order and nothing has to be guessed — each step uses what the last one found.'),
              maths('x = \\frac{4 + \\left(-2\\right)}{2} = 1 \\qquad y = 1 - 2 - 8 = -9'),
              prose(
                'The average of the roots is the quickest route to the line of symmetry whenever the roots are known — quicker than completing the square and quicker than the formula.',
              ),
              prose(
                'When there are no real roots, completing the square is the only route to the turning point, and the sketch is simply the curve sitting clear of the axis.',
              ),
            ),
            ask('quad-root-count', 2),
            ask('quad-symmetry', 2),
            ask('quad-vertex-slider'),
            teach(
              prose(
                'A sketch is not a plot. It needs the right shape and the right labelled features, not accurate spacing.',
              ),
              prose(
                'Mark the axis crossings, the turning point, and the direction. That is enough to answer questions about maximum values, ranges, and where the curve is positive or negative.',
              ),
              maths('y > 0 \\quad \\text{for} \\quad x < -2 \\quad \\text{or} \\quad x > 4'),
              prose(
                'Reading inequalities off a sketch is far more reliable than reasoning about them algebraically, which is the real reason sketching is worth doing at all.',
              ),
            ),
            ask('quad-turning-point', 2),
            ask('quad-from-roots', 2),
          ],
          skillCheck: [
            ask('quad-turning-point', 2),
            ask('quad-symmetry', 2),
            ask('quad-from-roots', 2),
          ],
        },
      ],
      levelCheck: [
        ask('quad-symmetry', 2),
        ask('quad-turning-point', 2),
        ask('quad-root-count', 2),
        ask('quad-from-roots', 2),
        ask('quad-other-root', 2),
        ask('quad-min-value', 2),
        ask('quad-vertex-slider', 2),
        ask('quad-root-slider', 2),
        ask('quad-symmetry', 2),
        ask('quad-turning-point', 2),
        ask('quad-from-roots', 2),
        ask('quad-discriminant-steps', 2),
      ],
    },
    {
      id: 'qd-l4',
      title: 'Simultaneous Equations with a Quadratic',
      lessons: [
        {
          id: 'qd-l4-substitute',
          title: 'Substituting a Line into a Curve',
          slides: [
            teach(
              prose(
                'Two equations, two unknowns, and one of them has an $x^{2}$ in it. The solutions are the points that sit on both graphs at once: here, the two places where the line crosses the curve.',
              ),
              crossing([1, -2, -1], [[1, 3]], { xMin: -3, xMax: 6, yMin: -3, yMax: 10 }, [
                { x: -1, y: 2 },
                { x: 4, y: 7 },
              ]),
              maths('\\begin{aligned} y &= x^{2} - 2x - 1 \\\\ y &= x + 3 \\end{aligned}'),
              prose(
                'Elimination, which works for two straight lines, gets stuck here. **Substitution** does not: both equations say what $y$ is, so where they meet those two expressions are equal.',
              ),
              maths('x^{2} - 2x - 1 = x + 3'),
              prose(
                'That is one equation in one letter — a quadratic — and every root it has is the $x$ of a meeting point.',
              ),
            ),
            ask('quad-sim-subject'),
            ask('quad-sim-substitute'),
            ask('quad-sim-route'),
            teach(
              prose(
                'The line is not always handed over as $y = \\ldots$. Rearrange it first, then substitute.',
              ),
              maths('2x + y = 8 \\implies y = 8 - 2x'),
              maths('x^{2} + 4x + 1 = 8 - 2x'),
              prose(
                'Now collect everything on the side with the $x^{2}$. Each term that crosses the equals sign changes sign: $-2x$ arrives as $+2x$, and $8$ arrives as $-8$.',
              ),
              maths('x^{2} + 6x - 7 = 0'),
              prose(
                'Two curves work the same way. Set them equal and collect on the side with more $x^{2}$, so the leading term stays positive.',
              ),
            ),
            ask('quad-sim-two-curves'),
            ask('quad-sim-subject'),
            ask('quad-sim-substitute+choice'),
            teach(
              prose(
                'Which letter to free is a choice. $y$ is usual, because the curve is already written as $y = \\ldots$ — but not when it would mean fractions.',
              ),
              maths('x + 2y = 7'),
              prose(
                'Getting $y$ alone here means halving everything. Getting $x$ alone takes one step: $x = 7 - 2y$. Substituting that gives a quadratic in $y$ instead, which is solved exactly the same way.',
              ),
              prose(
                'So ask two questions before any algebra: do both equations already say what $y$ is, and if not, which letter comes out cleanly?',
              ),
            ),
            ask('quad-sim-route'),
            ask('quad-sim-two-curves'),
          ],
          skillCheck: [
            ask('quad-sim-substitute', 2),
            ask('quad-sim-subject', 2),
            ask('quad-sim-two-curves', 2),
          ],
        },
        {
          id: 'qd-l4-solve',
          title: 'Solving for the Meeting Points',
          slides: [
            teach(
              prose(
                'Substituting leaves an ordinary quadratic, and everything from the level on solving applies. Factorise if you can.',
              ),
              maths('x^{2} - 3x - 4 = 0'),
              maths('\\left(x - 4\\right)\\left(x + 1\\right) = 0'),
              prose(
                'So $x = 4$ or $x = -1$. Those are the $x$-coordinates of the two places the line crosses the curve — not the points themselves yet, which is the next lesson.',
              ),
              prose(
                'The roots flip sign from the brackets, exactly as before. $\\left(x + 1\\right)$ gives $x = -1$.',
              ),
            ),
            ask('quad-sim-x-values'),
            ask('quad-sim-other-x'),
            ask('quad-sim-substitute+choice'),
            teach(
              prose(
                'When one meeting point is already known, the other comes quicker than a full factorisation. The two roots of $ax^{2} + bx + c = 0$ always add to $-\\frac{b}{a}$.',
              ),
              maths('x^{2} + x - 6 = 0, \\quad x = 2'),
              prose(
                'The roots add to $-1$, so the other is $-1 - 2 = -3$. Factorising agrees: $\\left(x - 2\\right)\\left(x + 3\\right)$.',
              ),
              prose(
                'If every term shares a number, divide it out first. $2x^{2} - 2x - 4 = 0$ is $x^{2} - x - 2 = 0$ in disguise, and the smaller one is far easier to factorise.',
              ),
            ),
            ask('quad-sim-two-curves'),
            ask('quad-sim-other-x+choice'),
            ask('quad-solve-factorise+choice'),
            teach(
              prose(
                'A quadratic that will not factorise still has roots — the formula finds them. They are simply not whole numbers, so the meeting points sit between grid lines.',
              ),
              prose(
                'Whichever route you take, the check is the same: put each $x$ back into **both** original equations. If the two give different $y$ values, the substitution went wrong somewhere.',
              ),
              maths('\\text{curve: } 16 - 8 - 1 = 7'),
              maths('\\text{line: } 4 + 3 = 7'),
            ),
            ask('quad-sim-x-values', 2),
            ask('quad-sim-substitute', 2),
          ],
          skillCheck: [
            ask('quad-sim-x-values', 2),
            ask('quad-sim-other-x', 2),
            ask('quad-sim-substitute', 2),
          ],
        },
        {
          id: 'qd-l4-pair',
          title: 'Pairing the Solutions',
          slides: [
            teach(
              prose(
                'Solving for $x$ is half the job. A pair of equations in $x$ and $y$ is solved only when every solution has both.',
              ),
              prose('Put each $x$ back to find its own $y$. Use the **line**: it gives the same answer as the curve with less arithmetic.'),
              maths('x = 4: \\quad y = 4 + 3 = 7'),
              maths('x = -1: \\quad y = -1 + 3 = 2'),
              prose('So the solutions are $\\left(4, 7\\right)$ and $\\left(-1, 2\\right)$.'),
            ),
            ask('quad-sim-line-y'),
            ask('quad-sim-pair'),
            ask('quad-sim-which-point'),
            teach(
              prose(
                'Each $y$ belongs to the $x$ that made it. Swapping them gives $\\left(4, 2\\right)$, which is on neither graph — the mistake looks tidy and is completely wrong.',
              ),
              prose(
                'A point can be checked in both equations at once. $\\left(4, 7\\right)$ in the curve gives $16 - 8 - 1 = 7$, and in the line $4 + 3 = 7$. Both agree, so it is a solution.',
              ),
              prose(
                'Substituting into the curve is the longer check, since it has a square in it. It is worth doing once, as proof that the line was the easier choice.',
              ),
            ),
            ask('quad-evaluate-steps'),
            ask('quad-sim-x-values'),
            ask('quad-sim-line-y+choice'),
            teach(
              prose(
                'Write the answer as pairs, never as four loose numbers.',
              ),
              maths('x = 4, \\; y = 7'),
              prose('or'),
              maths('x = -1, \\; y = 2'),
              prose(
                'Two solutions, not four. The word **or** matters: each line is one solution, and the two cannot be mixed.',
              ),
            ),
            ask('quad-sim-pair', 2),
            ask('quad-sim-which-point', 2),
          ],
          skillCheck: [
            ask('quad-sim-pair', 2),
            ask('quad-sim-line-y', 2),
            ask('quad-sim-which-point', 2),
          ],
        },
        {
          id: 'qd-l4-meet',
          title: 'Where a Line Meets a Curve',
          slides: [
            teach(
              prose(
                'Every solution is a point on the picture. The roots of the combined quadratic are the $x$-coordinates of the crossings, so they can be read straight off the graph.',
              ),
              crossing([1, -2, -1], [[1, 3]], { xMin: -3, xMax: 6, yMin: -3, yMax: 10 }, [
                { x: -1, y: 2 },
                { x: 4, y: 7 },
              ]),
              prose(
                'The algebra says $x = -1$ and $x = 4$; the picture shows the line cutting the curve at exactly those two places. Each is a check on the other.',
              ),
            ),
            ask('quad-sim-meet-slider'),
            ask('quad-sim-x-values'),
            ask('quad-sim-which-point'),
            teach(
              prose(
                'The $y$ of a solution is how high the crossing sits. Following the level across from a crossing to the vertical axis reads it off.',
              ),
              prose(
                'In the picture that opened this lesson, the left-hand crossing is at height 2 and the right-hand one at 7 — the same two numbers the line gave in the last lesson.',
              ),
              prose(
                'A graph gives the rough answer and algebra the exact one. When a crossing falls between grid lines, only the algebra will do.',
              ),
            ),
            ask('quad-sim-height-slider'),
            ask('quad-sim-pair'),
            ask('quad-sim-other-x+choice'),
            teach(
              prose(
                'An upside-down curve changes nothing in the method. Collect on the side where $x^{2}$ is positive.',
              ),
              crossing([-1, 0, 4], [[1, 2]], { xMin: -4, xMax: 4, yMin: -4, yMax: 6 }, [
                { x: -2, y: 0 },
                { x: 1, y: 3 },
              ]),
              maths('-x^{2} + 4 = x + 2'),
              maths('x^{2} + x - 2 = 0'),
              prose('That factorises as $\\left(x + 2\\right)\\left(x - 1\\right)$, so the crossings are at $x = -2$ and $x = 1$.'),
            ),
            ask('quad-sim-meet-slider', 2),
            ask('quad-sim-height-slider', 2),
          ],
          skillCheck: [
            ask('quad-sim-meet-slider', 2),
            ask('quad-sim-height-slider', 2),
            ask('quad-sim-pair', 2),
          ],
        },
        {
          id: 'qd-l4-tangent',
          title: 'Tangents and the Discriminant',
          slides: [
            teach(
              prose(
                'A line can cross a curve twice, touch it once, or miss it. The same three lines, all with gradient 2, against $y = x^{2}$:',
              ),
              crossing([1, 0, 0], [[2, -1], [2, 3], [2, -4]], { xMin: -3, xMax: 4, yMin: -5, yMax: 10 }),
              prose(
                'Substituting each gives a quadratic, and its discriminant $b^{2} - 4ac$ says which case it is — before anything is solved.',
              ),
              maths('x^{2} - 2x - 3 = 0 \\quad \\Delta = 16'),
              maths('x^{2} - 2x + 1 = 0 \\quad \\Delta = 0'),
              maths('x^{2} - 2x + 4 = 0 \\quad \\Delta = -12'),
              prose(
                'Positive: two crossings. Zero: one repeated root, and the line — the solid one — is a **tangent**. Negative: no real roots, so no meeting at all.',
              ),
            ),
            ask('quad-sim-disc-tree'),
            ask('quad-sim-count'),
            ask('quad-sim-tangent-k'),
            teach(
              prose(
                'Run it backwards to find a tangent. Leave the unknown in, and set the discriminant to zero.',
              ),
              maths('x^{2} = 2x + k'),
              maths('x^{2} - 2x - k = 0'),
              maths('\\left(-2\\right)^{2} - 4 \\times 1 \\times \\left(-k\\right) = 0'),
              prose(
                'So $4 + 4k = 0$ and $k = -1$. The line $y = 2x - 1$ touches $y = x^{2}$; it is the solid line in the picture that opened this lesson.',
              ),
              prose(
                'The sign inside the bracket is where this goes wrong: $c$ is $-k$ here, not $k$, because $k$ crossed the equals sign.',
              ),
            ),
            ask('quad-sim-touch-slider'),
            ask('quad-sim-tangent-k+choice'),
            ask('quad-sim-disc-tree', 2),
            teach(
              prose(
                'Where does a tangent touch? At the repeated root. A zero discriminant means the quadratic is a perfect square.',
              ),
              maths('x^{2} - 2x + 1 = \\left(x - 1\\right)^{2} = 0'),
              prose(
                'So the line touches at $x = 1$, and the line gives $y = 2 - 1 = 1$. The point is $\\left(1, 1\\right)$ — one solution, where every other line of that gradient had two or none.',
              ),
            ),
            ask('quad-sim-count', 2),
            ask('quad-sim-touch-slider', 2),
          ],
          skillCheck: [
            ask('quad-sim-tangent-k', 2),
            ask('quad-sim-count', 2),
            ask('quad-sim-disc-tree', 2),
          ],
        },
      ],
      levelCheck: [
        ask('quad-sim-subject', 2),
        ask('quad-sim-substitute', 2),
        ask('quad-sim-which-point', 2),
        ask('quad-sim-x-values', 2),
        ask('quad-sim-meet-slider', 2),
        ask('quad-sim-pair', 2),
        ask('quad-sim-line-y', 2),
        ask('quad-sim-other-x', 2),
        ask('quad-sim-two-curves', 2),
        ask('quad-sim-height-slider', 2),
        ask('quad-sim-disc-tree', 2),
        ask('quad-sim-tangent-k', 2),
        ask('quad-sim-count', 2),
        ask('quad-sim-touch-slider', 2),
      ],
    },
    {
      id: 'qd-l5',
      title: 'Quadratic Inequalities',
      lessons: [
        {
          id: 'qd-l5-graph',
          title: 'Reading the Sign from a Graph',
          slides: [
            teach(
              prose(
                '$y = \\left(x + 2\\right)\\left(x - 3\\right)$ crosses the $x$-axis at $x = -2$ and $x = 3$. Between them the curve dips **below** the axis, shaded here, so there $y < 0$.',
              ),
              signGraph(1, -2, 3, {
                strict: true,
                region: 'between',
                label: 'The curve y = (x + 2)(x - 3), shaded where it is below the x-axis',
              }),
              maths('\\left(x + 2\\right)\\left(x - 3\\right) < 0'),
              maths('-2 < x < 3'),
              prose(
                'Check with any value in between: $x = 0$ gives $2 \\times \\left(-3\\right) = -6$, which is negative. That is a **test point**, and it backs up the picture.',
              ),
            ),
            ask('quad-ineq-read-graph'),
            ask('quad-ineq-test-point'),
            ask('quad-ineq-end-slider'),
            teach(
              prose(
                'Outside the roots the same curve is **above** the axis, so $y > 0$ there: two pieces, one on each side.',
              ),
              signGraph(1, -2, 3, {
                strict: true,
                region: 'outside',
                label: 'The curve y = (x + 2)(x - 3), with the two arms above the x-axis picked out',
              }),
              maths('\\left(x + 2\\right)\\left(x - 3\\right) > 0'),
              maths('x < -2 \\text{ or } x > 3'),
              prose(
                'The rings are **hollow** because the roots give $y = 0$, which is neither above nor below. With $\\le$ or $\\ge$ the roots count, and the rings are drawn **solid**.',
              ),
            ),
            ask('quad-ineq-count'),
            ask('quad-ineq-read-graph', 2),
            ask('quad-ineq-test-point+choice'),
            teach(
              prose(
                'An upside-down curve swaps the two. $y = -\\left(x + 1\\right)\\left(x - 4\\right)$ is **above** the axis between its roots and below it outside.',
              ),
              signGraph(-1, -1, 4, {
                strict: false,
                region: 'between',
                label: 'The upside-down curve y = -(x + 1)(x - 4), shaded where it is above the x-axis',
              }),
              maths('-\\left(x + 1\\right)\\left(x - 4\\right) \\ge 0'),
              maths('-1 \\le x \\le 4'),
              prose(
                'So the sign of the $x^{2}$ coefficient always matters: it decides which side of the axis the middle piece is on.',
              ),
            ),
            ask('quad-ineq-end-slider', 2),
            ask('quad-ineq-count+choice', 2),
          ],
          skillCheck: [
            ask('quad-ineq-read-graph', 2),
            ask('quad-ineq-end-slider', 2),
            ask('quad-ineq-count', 2),
          ],
        },
        {
          id: 'qd-l5-factorise',
          title: 'Solving Inequalities by Factorising',
          slides: [
            teach(
              prose(
                'Without a picture, solve in three moves: factorise to find the roots, think which way up the curve is, then read off the side the inequality asks for.',
              ),
              maths('x^{2} - x - 6 < 0'),
              maths('\\left(x + 2\\right)\\left(x - 3\\right) < 0'),
              prose(
                'The roots are $-2$ and $3$, the curve is U-shaped, and $< 0$ asks for below the axis: the piece **between** the roots.',
              ),
              maths('-2 < x < 3'),
            ),
            ask('quad-ineq-region-flow'),
            ask('quad-ineq-between-tiles'),
            ask('quad-ineq-endpoint'),
            teach(
              prose(
                'Turn the sign round and the answer moves outside: $x^{2} - x - 6 > 0$ asks for the two arms above the axis.',
              ),
              signGraph(1, -2, 3, {
                strict: true,
                region: 'outside',
                label: 'The curve y = x^2 - x - 6, with the two arms above the x-axis picked out',
              }),
              maths('x < -2 \\text{ or } x > 3'),
              prose(
                'The two pieces point away from each other: smaller than the smaller root, **or** bigger than the bigger one.',
              ),
            ),
            ask('quad-ineq-outside-tiles'),
            ask('quad-ineq-endpoint+choice'),
            ask('quad-ineq-region-flow', 2),
            teach(
              prose(
                'A positive leading coefficient changes nothing but the factorising. $2x^{2} - 2x - 12 = 2\\left(x + 2\\right)\\left(x - 3\\right)$ has the same roots and the same shape.',
              ),
              maths('2x^{2} - 2x - 12 \\le 0'),
              maths('-2 \\le x \\le 3'),
              prose('With $\\le$ the roots are included, so both signs in the answer are $\\le$ as well.'),
            ),
            ask('quad-ineq-between-tiles', 2),
            ask('quad-ineq-outside-tiles', 2),
          ],
          skillCheck: [
            ask('quad-ineq-between-tiles', 2),
            ask('quad-ineq-outside-tiles', 2),
            ask('quad-ineq-endpoint', 2),
          ],
        },
        {
          id: 'qd-l5-shapes',
          title: 'The Two Shapes of an Answer',
          slides: [
            teach(
              prose('Every answer has one of two shapes. Between the roots it is **one piece**, with $x$ in the middle:'),
              maths('p < x < q'),
              prose('Outside the roots it is **two pieces**, joined by "or":'),
              maths('x < p \\text{ or } x > q'),
              prose(
                'The one-piece form cannot stand in for two pieces: $3 < x < -2$ would need $x$ bigger than $3$ and smaller than $-2$ at once, and no number is.',
              ),
            ),
            ask('quad-ineq-which-set'),
            ask('quad-ineq-negate'),
            ask('quad-ineq-region-flow', 2),
            teach(
              prose(
                'When the $x^{2}$ coefficient is negative, multiply every term by $-1$ first. Multiplying by a negative number **turns the inequality round**:',
              ),
              maths('-x^{2} + x + 6 > 0'),
              maths('x^{2} - x - 6 < 0'),
              signGraph(-1, -2, 3, {
                strict: true,
                region: 'between',
                label: 'The upside-down curve y = -x^2 + x + 6, shaded where it is above the x-axis',
              }),
              prose(
                'Both say the same thing about $x$, and the second is a U-shaped curve: $-2 < x < 3$, the piece where the upside-down one is above the axis.',
              ),
            ),
            ask('quad-ineq-endpoint', 2),
            ask('quad-ineq-which-set', 2),
            ask('quad-ineq-negate', 2),
            teach(
              prose(
                '$\\le$ and $\\ge$ include the roots, where the curve is on the axis. The answer then uses $\\le$ and $\\ge$ too, and on a graph the rings are **solid**.',
              ),
              signGraph(1, -1, 4, {
                strict: false,
                region: 'outside',
                label: 'The curve y = x^2 - 3x - 4 with solid rings at its roots and the arms picked out',
              }),
              maths('x^{2} - 3x - 4 \\ge 0'),
              maths('x \\le -1 \\text{ or } x \\ge 4'),
            ),
            ask('quad-ineq-end-slider', 2),
            ask('quad-ineq-endpoint+choice', 2),
          ],
          skillCheck: [
            ask('quad-ineq-which-set', 2),
            ask('quad-ineq-negate', 2),
            ask('quad-ineq-endpoint', 2),
          ],
        },
        {
          id: 'qd-l5-rearrange',
          title: 'Rearranging First',
          slides: [
            teach(
              prose(
                'The roots and the shape belong to a quadratic compared with zero, so bring every term to one side first. Adding or taking away never turns the sign round.',
              ),
              maths('x^{2} > 3x + 4'),
              maths('x^{2} - 3x - 4 > 0'),
              maths('\\left(x + 1\\right)\\left(x - 4\\right) > 0'),
              prose(
                'U-shaped and asking for above the axis, so $x < -1$ or $x > 4$. Reading a direction off $x^{2} > 3x + 4$ as it stands is where this goes wrong.',
              ),
            ),
            ask('quad-ineq-rearrange'),
            ask('quad-ineq-which-set'),
            ask('quad-ineq-endpoint'),
            teach(
              prose(
                'Some curves never meet the axis. $x^{2} + 2x + 5$ has discriminant $2^{2} - 4 \\times 1 \\times 5 = -16$, so it has no roots at all.',
              ),
              graph(1, 2, 5, { xMin: -5, xMax: 3, label: 'The curve y = x^2 + 2x + 5, entirely above the x-axis' }),
              prose(
                'U-shaped and entirely above the axis, so $x^{2} + 2x + 5 > 0$ is true for **every** $x$, and $x^{2} + 2x + 5 < 0$ for **none**.',
              ),
            ),
            ask('quad-discriminant-tree'),
            ask('quad-ineq-always'),
            ask('quad-ineq-rearrange', 2),
            teach(
              prose(
                'Upside down, it goes the other way. $-x^{2} + 4x - 5$ has discriminant $16 - 20 = -4$ and sits entirely below the axis.',
              ),
              graph(-1, 4, -5, { xMin: -1, xMax: 5, label: 'The curve y = -x^2 + 4x - 5, entirely below the x-axis' }),
              prose(
                'So $-x^{2} + 4x - 5 < 0$ holds for every $x$, and $> 0$ for none. A negative discriminant makes the answer all or nothing.',
              ),
            ),
            ask('quad-ineq-always', 2),
            ask('quad-discriminant-tree', 2),
          ],
          skillCheck: [
            ask('quad-ineq-rearrange', 2),
            ask('quad-ineq-always', 2),
            ask('quad-ineq-which-set', 2),
          ],
        },
        {
          id: 'qd-l5-parameter',
          title: 'Inequalities on a Parameter',
          slides: [
            teach(
              prose(
                'The discriminant turns "how many roots" into an inequality. Two different roots needs $b^{2} - 4ac > 0$, none needs $< 0$, and "real roots" allows the repeated one, so $\\ge 0$.',
              ),
              prose('With an unknown constant, as in $x^{2} + 6x + k = 0$:'),
              maths('36 - 4k > 0'),
              maths('k < 9'),
              prose(
                'Dividing by $-4$ turned the sign round. So there are two different roots exactly when $k < 9$, one repeated root at $k = 9$, and none when $k > 9$.',
              ),
            ),
            ask('quad-ineq-param-critical'),
            ask('quad-sim-tangent-k'),
            ask('quad-ineq-param-critical+choice'),
            teach(
              prose(
                'When $k$ is the coefficient of $x$ the discriminant is quadratic in $k$. For $x^{2} + kx + 9 = 0$ to have two different roots:',
              ),
              maths('k^{2} - 36 > 0'),
              prose(
                'That is a quadratic inequality in its own right. Its critical values are $k = \\pm 6$ (square roots, not $\\pm 36$), and $k^{2} - 36$ is U-shaped:',
              ),
              signGraph(1, -6, 6, {
                strict: true,
                region: 'outside',
                label: 'The curve k^2 - 36 against k, with the two arms above the axis picked out',
              }),
              maths('k < -6 \\text{ or } k > 6'),
            ),
            ask('quad-ineq-param-disc'),
            ask('quad-ineq-param-range'),
            ask('quad-ineq-param-disc', 2),
            teach(
              prose(
                '"Always positive" is the same question in disguise. $x^{2} + kx + 9 > 0$ for every $x$ means the U never meets the axis, so the discriminant is negative:',
              ),
              maths('k^{2} - 36 < 0'),
              maths('-6 < k < 6'),
              prose(
                'The $x^{2}$ coefficient has to be positive as well: an upside-down curve with no roots is negative everywhere.',
              ),
            ),
            ask('quad-ineq-always', 2),
            ask('quad-ineq-param-range', 2),
          ],
          skillCheck: [
            ask('quad-ineq-param-disc', 2),
            ask('quad-ineq-param-range', 2),
            ask('quad-ineq-param-critical', 2),
          ],
        },
      ],
      levelCheck: [
        ask('quad-ineq-read-graph', 2),
        ask('quad-ineq-between-tiles', 2),
        ask('quad-ineq-test-point', 2),
        ask('quad-ineq-region-flow', 2),
        ask('quad-ineq-end-slider', 2),
        ask('quad-ineq-endpoint', 2),
        ask('quad-ineq-outside-tiles', 2),
        ask('quad-ineq-which-set', 2),
        ask('quad-ineq-count', 2),
        ask('quad-ineq-negate', 2),
        ask('quad-ineq-always', 2),
        ask('quad-ineq-rearrange', 2),
        ask('quad-ineq-param-range', 2),
        ask('quad-ineq-param-disc', 2),
        ask('quad-ineq-param-critical', 2),
      ],
    },
    {
      id: 'qd-l6',
      title: 'Modelling with Quadratics',
      lessons: [
        {
          id: 'qd-l6-build',
          title: 'Building a Model',
          slides: [
            teach(
              prose(
                'A ball thrown straight up from the ground at 20 m/s climbs $20t$ metres in $t$ seconds, while gravity pulls it back by $\\frac{1}{2}gt^{2}$. With $g = 10$ that is $5t^{2}$:',
              ),
              maths('h = 20t - 5t^{2}'),
              flightGraph(0, 20, { label: 'The height of the ball against time, rising and falling back to the ground' }),
              prose(
                'Thrown from a balcony 25 m up instead, every height is 25 m more: $h = 25 + 20t - 5t^{2}$. The constant is where it starts.',
              ),
            ),
            ask('quad-model-launch-tiles'),
            ask('quad-model-evaluate'),
            ask('quad-model-meaning'),
            teach(
              prose(
                'Models come from shapes too. A rectangle with a perimeter of 20 m and one side $x$ m has two sides of $x$, so the other two share $20 - 2x$ and each is $10 - x$:',
              ),
              maths('A = x(10 - x)'),
              areaGraph(10, [], 'The area of the pen against the side length, a hill from 0 to 10'),
              prose('Any correct way of writing it is the same model: $10x - x^{2}$ is just as right.'),
            ),
            ask('quad-model-area'),
            ask('quad-model-evaluate+choice'),
            ask('quad-model-meaning'),
            teach(
              prose(
                'A model only means something where the situation does. The pen needs both sides to be positive, so $0 < x < 10$.',
              ),
              prose(
                'The ball only counts from the throw, $t \\ge 0$, until it lands. Outside those limits the algebra still gives numbers, but they describe nothing.',
              ),
            ),
            ask('quad-model-launch-tiles', 2),
            ask('quad-model-area+choice', 2),
          ],
          skillCheck: [
            ask('quad-model-launch-tiles', 2),
            ask('quad-model-area', 2),
            ask('quad-model-evaluate', 2),
          ],
        },
        {
          id: 'qd-l6-graph',
          title: "Reading a Model's Graph",
          slides: [
            teach(
              prose(
                'The graph of $h = 25 + 20t - 5t^{2}$ starts at $t = 0$, since nothing happens before the throw, and stops when the ball lands.',
              ),
              flightGraph(25, 20, {
                marks: [
                  { x: 0, y: 25 },
                  { x: 2, y: 45 },
                  { x: 5, y: 0 },
                ],
                label: 'The height against time, with the start, the top and the landing ringed',
              }),
              prose(
                'Three points tell the story. Where it meets the $h$-axis is the start, 25 m. The top is the greatest height. Where it comes back to the $t$-axis is the landing.',
              ),
            ),
            ask('quad-model-feature'),
            ask('quad-model-land'),
            ask('quad-model-land-slider'),
            teach(
              prose('The landing is where $h = 0$. Divide by $-5$ and factorise:'),
              maths('t^{2} - 4t - 5 = 0'),
              maths('(t - 5)(t + 1) = 0'),
              prose(
                '$t = -1$ is before the throw, so it is thrown away: the ball lands after 5 seconds.',
              ),
              prose(
                'A parabola is symmetrical, so the top is halfway between the two roots, at $t = 2$, even though half the curve is off the picture. There $h = 25 + 40 - 20 = 45$.',
              ),
            ),
            ask('quad-model-peak-tree'),
            ask('quad-model-land+choice'),
            ask('quad-model-land-slider', 2),
            teach(
              prose(
                'The same reading works for any model. A stall making $P$ pounds profit at a price of $x$ pounds, with',
              ),
              maths('P = -x^{2} + 12x - 20'),
              prose(
                'breaks even where the curve meets the $x$-axis, at $x = 2$ and $x = 10$. Its best price is halfway, $x = 6$, and the loss at $x = 0$ is its fixed costs, 20 pounds.',
              ),
            ),
            ask('quad-model-feature', 2),
            ask('quad-model-peak-tree', 2),
          ],
          skillCheck: [
            ask('quad-model-land', 2),
            ask('quad-model-land-slider', 2),
            ask('quad-model-peak-tree', 2),
          ],
        },
        {
          id: 'qd-l6-max',
          title: 'Greatest and Least Values',
          slides: [
            teach(
              prose(
                'The pen $A = x(10 - x)$ has no area at $x = 0$ or $x = 10$. Halfway, $x = 5$, gives the greatest area: $5 \\times 5 = 25$.',
              ),
              areaGraph(10, [{ x: 5, y: 25 }], 'The area against the side length, with the top of the hill ringed'),
              prose('Completing the square shows it in one line:'),
              maths('A = 25 - (x - 5)^{2}'),
              prose('The square is never negative and it is taken away, so $A$ is never more than 25.'),
            ),
            ask('quad-model-vertex-tiles'),
            ask('quad-model-max-value'),
            ask('quad-model-best-slider'),
            teach(
              prose(
                'A cost is the other way up: it has a **least** value. Complete the square on $C = x^{2} - 8x + 20$:',
              ),
              maths('C = (x - 4)^{2} + 4'),
              prose(
                'Here the square is added, so it can only push $C$ up. The least cost is 4, when $x = 4$.',
              ),
            ),
            ask('quad-model-cost-steps'),
            ask('quad-model-max-value+choice'),
            ask('quad-model-vertex-tiles', 2),
            teach(
              prose('Keep the two answers apart.'),
              prose(
                'The **input** that does best (the side length, the price, the time) is how far along the turning point is.',
              ),
              prose(
                'The **best value** itself (the area, the profit, the height) is how high the turning point is.',
              ),
            ),
            ask('quad-model-best-slider', 2),
            ask('quad-model-cost-steps', 2),
          ],
          skillCheck: [
            ask('quad-model-vertex-tiles', 2),
            ask('quad-model-max-value', 2),
            ask('quad-model-cost-steps', 2),
          ],
        },
        {
          id: 'qd-l6-reach',
          title: 'Reaching a Given Height',
          slides: [
            teach(
              prose(
                'When is the ball from $h = 20t - 5t^{2}$ at 15 m? Set $h = 15$ and bring everything to one side:',
              ),
              maths('20t - 5t^{2} = 15'),
              maths('t^{2} - 4t + 3 = 0'),
              prose('Dividing by $-5$ changes every sign. It factorises as $(t - 1)(t - 3) = 0$.'),
              flightGraph(0, 20, {
                horizontal: 15,
                marks: [
                  { x: 1, y: 15 },
                  { x: 3, y: 15 },
                ],
                label: 'The height against time, crossing a dashed line at 15 m twice',
              }),
            ),
            ask('quad-model-reach-tiles'),
            ask('quad-model-reach-time'),
            ask('quad-model-reach-flow'),
            teach(
              prose(
                'Both answers are real: the ball passes 15 m after 1 second going up and after 3 seconds coming down. It spends $3 - 1 = 2$ seconds above 15 m.',
              ),
              prose(
                'From a cliff it can be different. One root can be negative, a time before the throw, and then only the positive one counts.',
              ),
            ),
            ask('quad-model-reach-flow', 2),
            ask('quad-model-reach-time+choice'),
            ask('quad-model-reach-tiles', 2),
            teach(
              prose('Check an answer by putting it back into the model. At $t = 3$:'),
              maths('20 \\times 3 - 5 \\times 3^{2} = 15'),
              prose('Square first, then multiply by 5: $5 \\times 9 = 45$, not $15^{2}$.'),
            ),
            ask('quad-model-evaluate', 2),
            ask('quad-model-evaluate+choice', 2),
          ],
          skillCheck: [
            ask('quad-model-reach-tiles', 2),
            ask('quad-model-reach-time', 2),
            ask('quad-model-reach-flow', 2),
          ],
        },
        {
          id: 'qd-l6-fit',
          title: 'Fitting a Quadratic',
          slides: [
            teach(
              prose(
                'Now the other way round: find the model from facts about the curve. An arch is highest, 18 m up, at $x = 3$, and one foot is at the origin.',
              ),
              prose('The turning point goes straight into the completed square:'),
              maths('y = a(x - 3)^{2} + 18'),
              prose('The foot $(0, 0)$ gives $0 = 9a + 18$, so $a = -2$.'),
            ),
            ask('quad-model-fit-vertex'),
            ask('quad-model-fit-span'),
            ask('quad-model-fit-vertex+choice'),
            teach(
              prose('Knowing the roots gives the brackets instead. Roots at 1 and 5, through the point $(3, 8)$:'),
              maths('y = a(x - 1)(x - 5)'),
              prose('At $x = 3$ the brackets make $2 \\times (-2) = -4$, so $-4a = 8$ and $a = -2$.'),
            ),
            ask('quad-model-fit-a-tree'),
            ask('quad-model-fit-span', 2),
            ask('quad-model-fit-a-tree', 2),
            teach(
              prose('To write it as $y = ax^{2} + bx + c$, expand the brackets and multiply every term by $a$:'),
              maths('y = -2(x^{2} - 6x + 5)'),
              maths('y = -2x^{2} + 12x - 10'),
              prose('Check with the point: $-18 + 36 - 10 = 8$.'),
            ),
            ask('quad-model-fit-abc'),
            ask('quad-model-fit-abc', 2),
          ],
          skillCheck: [
            ask('quad-model-fit-vertex', 2),
            ask('quad-model-fit-abc', 2),
            ask('quad-model-fit-a-tree', 2),
          ],
        },
      ],
      levelCheck: [
        ask('quad-model-launch-tiles', 2),
        ask('quad-model-land-slider', 2),
        ask('quad-model-max-value', 2),
        ask('quad-model-reach-flow', 2),
        ask('quad-model-fit-abc', 2),
        ask('quad-model-area', 2),
        ask('quad-model-peak-tree', 2),
        ask('quad-model-cost-steps', 2),
        ask('quad-model-reach-time', 2),
        ask('quad-model-fit-vertex', 2),
        ask('quad-model-meaning', 2),
        ask('quad-model-vertex-tiles', 2),
        ask('quad-model-best-slider', 2),
        ask('quad-model-reach-tiles', 2),
        ask('quad-model-feature', 2),
      ],
    },
    {
      id: 'qd-l7',
      title: 'Quadratics in Disguise',
      lessons: [
        {
          id: 'qd-l7-spot',
          title: 'Spotting the Disguise',
          slides: [
            teach(
              prose('Some equations are quadratics in disguise. Look at the powers in'),
              maths('x^{4} - 5x^{2} + 4 = 0'),
              prose('$x^{4}$ is $\\left(x^{2}\\right)^{2}$. Put $u = x^{2}$ and it becomes an ordinary quadratic:'),
              maths('u^{2} - 5u + 4 = 0'),
              prose('Solve that for $u$ first, then go back to $x$.'),
            ),
            ask('quad-disguise-spot'),
            ask('quad-disguise-u-tiles'),
            ask('quad-disguise-is-it-flow'),
            teach(
              prose(
                'The test is always the same: one term is exactly the square of another, and the third is a plain number. Some other disguises:',
              ),
              prose('$x - 5\\sqrt{x} + 6 = 0$ is a quadratic in $u = \\sqrt{x}$, since $x = \\left(\\sqrt{x}\\right)^{2}$.'),
              prose('$\\frac{6}{x^{2}} - \\frac{5}{x} + 1 = 0$ is a quadratic in $u = \\frac{1}{x}$.'),
              prose('$(x + 1)^{2} - 5(x + 1) + 6 = 0$ is a quadratic in $u = x + 1$.'),
            ),
            ask('quad-disguise-u-roots'),
            ask('quad-disguise-spot', 2),
            ask('quad-disguise-u-tiles', 2),
            teach(
              prose(
                'Look-alikes fail the test. In $x^{4} - 5x + 4 = 0$ the square of $x$ is $x^{2}$, not $x^{4}$, so no $u$ turns it into a quadratic.',
              ),
              prose(
                'The same idea turns up in other courses: $4^{x} - 5\\left(2^{x}\\right) + 4 = 0$ is a quadratic in $u = 2^{x}$ (Exponents and Radicals), and $\\left(\\log x\\right)^{2} - 3\\log x + 2 = 0$ is one in $u = \\log x$ (Logarithms).',
              ),
            ),
            ask('quad-disguise-is-it-flow', 2),
            ask('quad-disguise-u-roots+choice', 2),
          ],
          skillCheck: [
            ask('quad-disguise-spot', 2),
            ask('quad-disguise-u-tiles', 2),
            ask('quad-disguise-is-it-flow', 2),
          ],
        },
        {
          id: 'qd-l7-even',
          title: 'Even Powers',
          slides: [
            teach(
              prose('Solve $x^{4} - 5x^{2} + 4 = 0$. With $u = x^{2}$:'),
              maths('(u - 1)(u - 4) = 0'),
              prose(
                'So $u = 1$ or $u = 4$. Now go back: $x^{2} = 1$ gives $x = \\pm 1$, and $x^{2} = 4$ gives $x = \\pm 2$. Four solutions, one for each crossing:',
              ),
              disguiseGraph(
                [(x) => x ** 4 - 5 * x * x + 4],
                { xMin: -3, xMax: 3, yMin: -3, yMax: 6 },
                [-2, -1, 1, 2],
                'A W-shaped curve crossing the x-axis four times, at -2, -1, 1 and 2',
              ),
            ),
            ask('quad-disguise-even-steps'),
            ask('quad-disguise-split-tree'),
            ask('quad-disguise-count'),
            teach(
              prose('A negative $u$ gives nothing. In $x^{4} + 3x^{2} - 4 = 0$:'),
              maths('(u + 4)(u - 1) = 0'),
              prose(
                '$x^{2} = -4$ has no real solution, since a square is never negative. $x^{2} = 1$ gives $x = \\pm 1$, so there are only two.',
              ),
              disguiseGraph(
                [(x) => x ** 4 + 3 * x * x - 4],
                { xMin: -3, xMax: 3, yMin: -6, yMax: 8 },
                [-1, 1],
                'A U-shaped curve crossing the x-axis twice, at -1 and 1',
              ),
            ),
            ask('quad-disguise-even-slider'),
            ask('quad-disguise-count+choice'),
            ask('quad-disguise-even-steps', 2),
            teach(
              prose('$x^{6} - 7x^{3} - 8 = 0$ is a quadratic in $u = x^{3}$:'),
              maths('(u - 8)(u + 1) = 0'),
              prose(
                'A cube root keeps its sign, so $x^{3} = 8$ gives $x = 2$ and $x^{3} = -1$ gives $x = -1$. Each root in $u$ gives exactly one $x$, negative or not.',
              ),
            ),
            ask('quad-disguise-split-tree', 2),
            ask('quad-disguise-even-slider', 2),
          ],
          skillCheck: [
            ask('quad-disguise-even-steps', 2),
            ask('quad-disguise-split-tree', 2),
            ask('quad-disguise-count', 2),
          ],
        },
        {
          id: 'qd-l7-root',
          title: 'Square Roots',
          slides: [
            teach(
              prose('In $x - 5\\sqrt{x} + 6 = 0$, $x$ is the square of $\\sqrt{x}$. Put $u = \\sqrt{x}$:'),
              maths('u^{2} - 5u + 6 = 0'),
              maths('(u - 2)(u - 3) = 0'),
              prose('Going back means squaring: $\\sqrt{x} = 2$ gives $x = 4$, and $\\sqrt{x} = 3$ gives $x = 9$.'),
            ),
            ask('quad-disguise-root-back-flow'),
            ask('quad-disguise-root-tree'),
            ask('quad-disguise-root-solve'),
            teach(
              prose('A square root is never negative, so a negative $u$ is rejected. In $x - \\sqrt{x} - 6 = 0$:'),
              maths('(u + 2)(u - 3) = 0'),
              prose(
                '$\\sqrt{x} = -2$ is impossible, so the only solution is $x = 9$. Squaring $-2$ anyway gives $x = 4$, which does not work: $4 - 2 - 6 = -4$, not 0.',
              ),
            ),
            ask('quad-disguise-root-check'),
            ask('quad-disguise-root-solve+choice'),
            ask('quad-disguise-root-back-flow', 2),
            teach(
              prose('Checking is quick insurance. Put the answer back into the equation, taking the positive square root:'),
              maths('9 - \\sqrt{9} - 6 = 9 - 3 - 6 = 0'),
              prose('It comes to 0, so $x = 9$ stands. A rejected root never survives this check.'),
            ),
            ask('quad-disguise-root-tree', 2),
            askWith(
              'quad-disguise-root-check+choice',
              'The same check with no working shown: this is the left-hand side with a candidate put in. Pick what it comes to.',
              2,
            ),
          ],
          skillCheck: [
            ask('quad-disguise-root-tree', 2),
            ask('quad-disguise-root-solve', 2),
            ask('quad-disguise-root-check', 2),
          ],
        },
        {
          id: 'qd-l7-recip',
          title: 'Reciprocals',
          slides: [
            teach(
              prose(
                'In $\\frac{6}{x^{2}} - \\frac{5}{x} + 1 = 0$, $\\frac{1}{x^{2}}$ is the square of $\\frac{1}{x}$. Put $u = \\frac{1}{x}$:',
              ),
              maths('6u^{2} - 5u + 1 = 0'),
              maths('(2u - 1)(3u - 1) = 0'),
              prose('So $u = \\frac{1}{2}$ or $u = \\frac{1}{3}$. Flip each one to go back: $x = 2$ or $x = 3$.'),
            ),
            ask('quad-disguise-recip-tiles'),
            ask('quad-disguise-recip-solve'),
            ask('quad-disguise-flip-steps'),
            teach(
              prose(
                'There is a second route. $x$ cannot be 0 here, since $\\frac{1}{0}$ means nothing, so it is safe to multiply every term by $x^{2}$:',
              ),
              maths('6 - 5x + x^{2} = 0'),
              prose('That is $x^{2} - 5x + 6 = 0$, an ordinary quadratic with the same roots, 2 and 3.'),
              prose('For the same reason $u = \\frac{1}{x}$ is never 0, so a root of 0 in $u$ would have to be rejected.'),
            ),
            ask('quad-disguise-clear-tiles'),
            ask('quad-disguise-recip-solve+choice', 2),
            ask('quad-disguise-flip-steps', 2),
            teach(
              prose('Sometimes the number starts on the other side:'),
              maths('\\frac{6}{x^{2}} - \\frac{5}{x} = -1'),
              prose('Bring it over first, sign and all, so one side is zero. Then either route works.'),
            ),
            ask('quad-disguise-recip-tiles', 2),
            ask('quad-disguise-clear-tiles', 2),
          ],
          skillCheck: [
            ask('quad-disguise-recip-tiles', 2),
            ask('quad-disguise-recip-solve', 2),
            ask('quad-disguise-flip-steps', 2),
          ],
        },
        {
          id: 'qd-l7-bracket',
          title: 'A Bracket as u',
          slides: [
            teach(
              prose(
                '$(x + 1)^{2} - 5(x + 1) + 6 = 0$ could be expanded, but the bracket appears squared and on its own. Put $u = x + 1$:',
              ),
              maths('u^{2} - 5u + 6 = 0'),
              maths('(u - 2)(u - 3) = 0'),
              prose('So $x + 1 = 2$ or $x + 1 = 3$, giving $x = 1$ or $x = 2$. Take the 1 away; do not add it.'),
            ),
            ask('quad-disguise-bracket-steps'),
            ask('quad-disguise-bracket-solve'),
            ask('quad-disguise-shift-slider'),
            teach(
              prose(
                'As graphs, $y = (x + 1)^{2} - 5(x + 1) + 6$ is the dashed $y = x^{2} - 5x + 6$ moved 1 to the left, so both roots move 1 to the left too:',
              ),
              disguiseGraph(
                [(x) => (x + 1) ** 2 - 5 * (x + 1) + 6, (x) => x * x - 5 * x + 6],
                { xMin: -1, xMax: 5, yMin: -0.6, yMax: 2.5 },
                [1, 2],
                'Two identical parabolas, the solid one a step to the left of the dashed one, crossing at 1 and 2',
              ),
            ),
            ask('quad-disguise-count-flow'),
            ask('quad-disguise-bracket-solve+choice'),
            ask('quad-disguise-bracket-steps', 2),
            teach(
              prose(
                'Every disguise works the same way: find $u$, solve in $u$, go back to $x$. What changes is how many values of $x$ each root gives:',
              ),
              prose('$u = x^{2}$ gives two for a positive root and none for a negative one. $u = \\sqrt{x}$ gives one, or none for a negative root.'),
              prose('$u = x^{3}$, $u = \\frac{1}{x}$ and $u = x + k$ give exactly one each time.'),
            ),
            ask('quad-disguise-count-flow', 2),
            ask('quad-disguise-shift-slider', 2),
          ],
          skillCheck: [
            ask('quad-disguise-bracket-steps', 2),
            ask('quad-disguise-bracket-solve', 2),
            ask('quad-disguise-count-flow', 2),
          ],
        },
      ],
    },
  ],
};
