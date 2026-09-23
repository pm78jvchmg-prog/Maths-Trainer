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
 * says whether they cross, touch or miss before anything is solved.
 *
 * Each level closes with a level check: twelve to fourteen questions, no
 * teaching slides, one attempt each.
 */
import type { Block, Course, SlideRef } from '../types';
import { parabolaSvg, plotSvg, quadratic } from '../figures';

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

export const quadratics: Course = {
  id: 'quadratics',
  title: 'Quadratics',
  blurb: 'Expanding, factorising, three ways to solve, the parabola, and where a line meets it.',
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
  ],
};
