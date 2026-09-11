/**
 * Quadratics.
 *
 * Level 1 is the algebra: expanding two brackets, then running it backwards.
 * Level 2 solves, with the three methods in the order they should be reached
 * for — factorise if you can, complete the square to understand why, use the
 * formula when neither works. Level 3 is the graph, where every result from the
 * first two levels turns out to be a feature you can point at.
 *
 * Each level closes with a level check: twelve questions, no teaching slides,
 * one attempt each.
 */
import type { Block, Course, SlideRef } from '../types';
import { parabolaSvg } from '../figures';

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

export const quadratics: Course = {
  id: 'quadratics',
  title: 'Quadratics',
  blurb: 'Expanding, factorising, three ways to solve, and the parabola.',
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
            ask('quad-expand'),
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
            ask('quad-expand'),
            ask('quad-expand'),
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
            ask('quad-expand+choice'),
            ask('quad-expand'),
          ],
          skillCheck: [ask('quad-expand', 2), ask('quad-expand', 2), ask('quad-expand', 2)],
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
            ask('quad-factorise'),
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
            ask('quad-factorise'),
            ask('quad-factorise'),
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
            ask('quad-factorise+choice'),
            ask('quad-factorise'),
          ],
          skillCheck: [ask('quad-factorise', 2), ask('quad-factorise', 2), ask('quad-factorise', 2)],
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
            ask('quad-difference-squares'),
            ask('quad-difference-squares+choice'),
            teach(
              prose('Both factors carry the square *root*, not the original number.'),
              maths('x^{2} - 49 = \\left(x - 7\\right)\\left(x + 7\\right)'),
              prose(
                'The 49 becomes 7 in each bracket. Writing $\\left(x - 49\\right)\\left(x + 49\\right)$ is the standard mistake, and expanding it gives $x^{2} - 2401$.',
              ),
              prose('A coefficient on $x^{2}$ is no obstacle provided it is a square too.'),
              maths('9x^{2} - 25 = \\left(3x - 5\\right)\\left(3x + 5\\right)'),
            ),
            ask('quad-difference-squares'),
            ask('quad-difference-squares', 2),
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
            ask('quad-difference-squares+choice', 2),
            ask('quad-difference-squares', 2),
          ],
          skillCheck: [
            ask('quad-difference-squares', 2),
            ask('quad-difference-squares', 2),
            ask('quad-difference-squares', 2),
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
            ask('quad-factorise-coefficient'),
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
            ask('quad-factorise-coefficient'),
            ask('quad-factorise-coefficient'),
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
            ask('quad-factorise-coefficient+choice'),
            ask('quad-factorise-coefficient'),
          ],
          skillCheck: [
            ask('quad-factorise-coefficient', 2),
            ask('quad-factorise-coefficient', 2),
            ask('quad-factorise-coefficient', 2),
          ],
        },
      ],
      levelCheck: [
        ask('quad-expand', 2),
        ask('quad-factorise', 2),
        ask('quad-difference-squares', 2),
        ask('quad-factorise-coefficient', 2),
        ask('quad-expand', 2),
        ask('quad-factorise', 2),
        ask('quad-difference-squares', 2),
        ask('quad-factorise-coefficient', 2),
        ask('quad-factorise', 2),
        ask('quad-factorise-coefficient', 2),
        ask('quad-expand', 2),
        ask('quad-difference-squares', 2),
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
            ask('quad-solve-factorise'),
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
            ask('quad-solve-factorise'),
            ask('quad-solve-factorise'),
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
            ask('quad-solve-factorise+choice'),
            ask('quad-solve-factorise'),
          ],
          skillCheck: [
            ask('quad-solve-factorise', 2),
            ask('quad-solve-factorise', 2),
            ask('quad-solve-factorise', 2),
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
            ask('quad-complete-square'),
            ask('quad-complete-square+choice'),
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
            ask('quad-complete-square'),
            ask('quad-complete-square'),
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
            ask('quad-complete-square+choice'),
            ask('quad-complete-square'),
          ],
          skillCheck: [
            ask('quad-complete-square', 2),
            ask('quad-complete-square', 2),
            ask('quad-complete-square', 2),
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
            ask('quad-formula'),
            ask('quad-formula'),
            ask('quad-formula+choice'),
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
            ask('quad-formula'),
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
            ask('quad-formula+choice'),
            ask('quad-formula'),
          ],
          skillCheck: [ask('quad-formula', 2), ask('quad-formula', 2), ask('quad-formula', 2)],
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
            ask('quad-discriminant'),
            ask('quad-discriminant'),
            ask('quad-root-count'),
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
            ask('quad-root-count'),
            ask('quad-discriminant'),
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
            ask('quad-root-count'),
            ask('quad-discriminant'),
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
        ask('quad-solve-factorise', 2),
        ask('quad-complete-square', 2),
        ask('quad-formula', 2),
        ask('quad-discriminant', 2),
        ask('quad-root-count', 2),
        ask('quad-solve-factorise', 2),
        ask('quad-complete-square', 2),
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
            ask('quad-symmetry-slider'),
            ask('quad-symmetry'),
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
            ask('quad-symmetry+choice'),
            ask('quad-symmetry'),
          ],
          skillCheck: [ask('quad-symmetry', 2), ask('quad-symmetry', 2), ask('quad-symmetry', 2)],
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
            ask('quad-turning-point'),
            ask('quad-turning-point+choice'),
            teach(
              prose('So the completed-square form can be read directly as a position.'),
              maths('y = \\left(x - p\\right)^{2} + q \\quad \\longrightarrow \\quad \\left(p, q\\right)'),
              prose(
                'Written with a minus inside, the $x$ coordinate reads off unchanged; written with a plus, it changes sign. The safest habit is to ask where the bracket equals zero rather than trying to remember which way round it goes.',
              ),
              prose('The $y$ coordinate is the constant outside, always unchanged.'),
            ),
            ask('quad-turning-point'),
            ask('quad-complete-square', 2),
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
            ask('quad-turning-point+choice'),
            ask('quad-turning-point'),
          ],
          skillCheck: [
            ask('quad-turning-point', 2),
            ask('quad-turning-point', 2),
            ask('quad-turning-point', 2),
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
            ask('quad-from-roots'),
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
            ask('quad-from-roots'),
            ask('quad-root-count'),
          ],
          skillCheck: [ask('quad-from-roots', 2), ask('quad-from-roots', 2), ask('quad-root-count', 2)],
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
        ask('quad-symmetry', 2),
        ask('quad-turning-point', 2),
        ask('quad-from-roots', 2),
        ask('quad-root-count', 2),
        ask('quad-symmetry', 2),
        ask('quad-turning-point', 2),
        ask('quad-from-roots', 2),
        ask('quad-complete-square', 2),
      ],
    },
  ],
};
