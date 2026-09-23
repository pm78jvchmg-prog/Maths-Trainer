/**
 * Complex Numbers, Level 1.
 *
 * Lesson rhythm follows the brief: a technique is taught, then practised three
 * times; a second technique is taught, then practised two or three times. Three
 * sealed skill-check questions close the lesson.
 */
import type { Block, Course, SlideRef } from '../types';
import { complexPlaneSvg, rangeFor, type PlanePoint } from '../generators/plane';
import { locusSvg, unityCircleSvg } from '../generators/complexPlane';

const teach = (...blocks: Block[]): SlideRef => ({
  type: 'literal',
  slide: { kind: 'teach', body: blocks },
});

const ask = (generatorId: string, difficulty = 1): SlideRef => ({
  type: 'generated',
  generatorId,
  difficulty,
});

/**
 * The same question with a line or two of teaching carried on its own slide.
 *
 * Widening these lessons to four skills apiece introduced techniques the three
 * teaching slides never mentioned, and a new technique meeting the learner as
 * a bare question is the worst of both. A whole extra teach slide is not the
 * answer either — a lesson is capped at eleven slides, and every one spent
 * explaining is one not spent practising. So the setup rides on the question
 * it sets up, which is what `leadIn` is for.
 */
const asking = (generatorId: string, difficulty: number, ...lines: string[]): SlideRef => ({
  type: 'generated',
  generatorId,
  difficulty,
  leadIn: lines.map((text) => ({ kind: 'prose', text })),
});

/**
 * A specific complex number or two, plotted on the plane.
 *
 * This course spends four levels describing points, corners and circles on
 * the complex plane in words. `complexPlaneSvg` already draws the grid and
 * both axes, so it is used directly rather than composing a plotter of our
 * own — `plotSvg` has no notion of this plane at all.
 */
const plane = (points: PlanePoint[]): Block => ({
  kind: 'diagram',
  svg: complexPlaneSvg(
    rangeFor(...points.flatMap((p) => [p.re, p.im])),
    points,
  ),
});

export const complexNumbers: Course = {
  id: 'complex-numbers',
  category: 'advanced-maths',
  position: 10,
  title: 'Complex Numbers',
  blurb: 'Work with imaginary and complex numbers, from first principles.',
  levels: [
    {
      id: 'cn-l1',
      title: 'Introducing Complex Numbers',
      lessons: [
        {
          id: 'cn-l1-roots',
          title: 'The Square Root of −1',
          slides: [
            teach(
              { kind: 'prose', text: 'Squaring a real number never gives a negative result. A positive times a positive is positive, and a negative times a negative is positive too, so there is nothing left over to land below zero.' },
              { kind: 'display', tex: '3^2 = 9 \\qquad (-3)^2 = 9' },
              { kind: 'prose', text: 'So an equation like $x^2 = -1$ has no real solution at all. Not a difficult one, not an irrational one — none.' },
              { kind: 'prose', text: 'This is worth sitting with, because it is the reason the rest of this course exists. Every other equation of this shape has answers: $x^2 = 9$ gives $3$ and $-3$, and $x^2 = 2$ gives $\\sqrt{2}$ and $-\\sqrt{2}$. Only a negative right-hand side breaks the pattern.' },
            ),
            ask('real-solutions'),
            ask('both-roots'),
            teach(
              { kind: 'prose', text: 'Rather than stop there, we define a new number whose square *is* negative. Call it $i$.' },
              { kind: 'display', tex: 'i = \\sqrt{-1} \\qquad i^2 = -1' },
              { kind: 'prose', text: 'Nothing is being discovered here — $i$ is being *defined*, in the same way that $\\sqrt{2}$ was once defined to fill a gap the fractions could not. The test of such a definition is whether the arithmetic that follows is consistent, and this one passes.' },
              { kind: 'prose', text: '$i$ might not be a real number, but it obeys the ordinary rules: you may add it, multiply it, collect like terms, and expand brackets exactly as usual. The single new fact is that $i^2$ may be replaced by $-1$.' },
              { kind: 'prose', text: 'One rule does *not* survive. $\\sqrt{a}\\times\\sqrt{b} = \\sqrt{ab}$ holds only when $a$ and $b$ are not both negative. Applying it anyway gives $i \\times i = \\sqrt{-1}\\times\\sqrt{-1} = \\sqrt{1} = 1$, which contradicts the definition. Reach for $i^2 = -1$ instead, always.' },
            ),
            ask('imaginary-square'),
            ask('imaginary-square', 2),
            teach(
              { kind: 'prose', text: 'That one definition unlocks the square root of every negative number: split off the $-1$ and take the root of what remains.' },
              { kind: 'display', tex: '\\sqrt{-25} = \\sqrt{25}\\times\\sqrt{-1} = 5i' },
              { kind: 'prose', text: 'The general form is $\\sqrt{-n} = i\\sqrt{n}$ for positive $n$. Splitting off exactly one factor of $-1$ is the whole technique; what is left is an ordinary square root you already know how to take.' },
              { kind: 'prose', text: 'When the number inside is not a perfect square, leave the surd: $\\sqrt{-12} = 2i\\sqrt{3}$. Writing $i$ in front rather than after the surd is the usual convention, because $\\sqrt{3}i$ invites the reader to wonder whether the $i$ is under the root.' },
            ),
            ask('sqrt-negative'),
            asking('imaginary-surd', 1, 'That one came out whole because the number under the root was a perfect square. Most are not, and whatever is left over then stays under the root.'),
            ask('sqrt-negative', 2),
            asking('root-method', 1, 'Three routes, and which one an equation needs is decided before any of them is run. Work down the questions.'),
          ],
          skillCheck: [ask('imaginary-square', 2), ask('sqrt-negative', 2), ask('real-solutions')],
        },

        {
          id: 'cn-l1-arithmetic',
          title: 'Imaginary Arithmetic',
          slides: [
            teach(
              { kind: 'prose', text: 'Imaginary terms add and subtract exactly like terms in algebra. Treat $i$ the way you would treat $x$: collect the coefficients and leave the symbol alone.' },
              { kind: 'display', tex: '5i - 2i = 3i \\qquad 4i + 9i = 13i' },
              { kind: 'prose', text: 'Nothing new is needed for this. If you can simplify $5x - 2x$, you can do these, and the answer is imaginary because every term was.' },
              { kind: 'prose', text: 'Only *like* terms combine. $3 + 4i$ is already as simple as it gets — there is no way to fold a real number and an imaginary one into a single term, in the same way that $3 + 4x$ will not collapse.' },
            ),
            ask('imaginary-sum'),
            asking('imaginary-collect', 1, 'Three terms now, so the working is worth seeing in stages. Fill in the line after the first pair, then the total.'),
            ask('imaginary-sum+choice', 2),
            teach(
              { kind: 'prose', text: 'Multiplication is where $i$ stops behaving like $x$. Multiply the coefficients as usual, which leaves an $i^2$ behind, and then replace that $i^2$ with $-1$.' },
              { kind: 'display', tex: '3i \\times 2i = 6i^2 = -6' },
              { kind: 'prose', text: 'So a product of two imaginary numbers is *real*, and it is negative whenever the two coefficients have the same sign. That is the opposite of what multiplication normally does, and it is the whole reason $i$ is useful.' },
              { kind: 'prose', text: 'The step people skip is the second one. Stopping at $6i^2$ leaves the answer unsimplified; writing $6i$ loses the squaring altogether. Take the coefficients first, then deal with the $i^2$ as a separate move.' },
            ),
            ask('imaginary-product'),
            asking('imaginary-missing+choice', 1, 'The same fact read backwards: the product is known and one factor is missing.'),
            ask('imaginary-product', 2),
            teach(
              { kind: 'prose', text: 'Watch the pattern: adding imaginary numbers keeps them imaginary, multiplying two of them makes them real. Addition stays in the imaginary world, multiplication steps out of it.' },
              { kind: 'display', tex: 'i^2 = -1 \\qquad i^3 = -i \\qquad i^4 = 1' },
              { kind: 'prose', text: 'Because $i^4 = 1$, the powers cycle with length four and then start again: $i^5 = i$, $i^6 = -1$, and so on for ever.' },
              { kind: 'prose', text: 'That makes any power easy. Divide the exponent by $4$ and keep only the remainder — $i^{23}$ has remainder $3$, so $i^{23} = i^3 = -i$. Only the remainder matters; the quotient contributes a factor of $1$ however large it is.' },
            ),
            ask('imaginary-collect', 2),
            ask('imaginary-missing', 2),
          ],
          skillCheck: [ask('imaginary-sum', 2), ask('imaginary-product', 2), ask('imaginary-collect', 2)],
        },

        {
          id: 'cn-l1-complex',
          title: 'Complex Numbers',
          slides: [
            teach(
              { kind: 'prose', text: 'Add a real number to an imaginary one and you get a complex number, written $a + bi$. The two pieces will not merge, so the sum simply stays as it is.' },
              { kind: 'display', tex: '3 + 4i' },
              { kind: 'prose', text: 'Here $3$ is the real part and $4$ is the imaginary part. The imaginary part is the coefficient of $i$, not $4i$ — it is a real number, despite the name.' },
              { kind: 'prose', text: 'Every number you have met so far is already a complex number with $b = 0$, and every imaginary number is one with $a = 0$. Nothing has been replaced; the number line has been widened.' },
              { kind: 'prose', text: 'Two complex numbers are equal only when both parts match. $a + bi = c + di$ means $a = c$ *and* $b = d$, which turns one complex equation into two real ones — a trick worth remembering.' },
            ),
            ask('complex-part'),
            ask('complex-add'),
            ask('complex-part', 2),
            teach(
              { kind: 'prose', text: 'Complex numbers add component by component: real with real, imaginary with imaginary. The two parts never mix.' },
              { kind: 'display', tex: '(3 + 4i) + (1 + 2i) = 4 + 6i' },
              { kind: 'prose', text: 'Subtraction works the same way, provided the minus sign reaches both parts of the second bracket. $(3 + 4i) - (1 + 2i) = 2 + 2i$, but $(3 + 4i) - (1 - 2i) = 2 + 6i$ — the imaginary part goes *up*, because subtracting a negative adds.' },
              { kind: 'display', tex: '(3 + 4i) - (1 - 2i) = 2 + 6i' },
              { kind: 'prose', text: 'Dropping the sign on the second part of the bracket is the most common slip in the whole topic. Expand the bracket before combining anything and it cannot happen.' },
            ),
            ask('complex-add', 2),
            asking('complex-subtract', 1, 'Subtraction works the same way, with one thing to watch: the minus sign belongs to the whole bracket, so it reaches the imaginary part too.'),
            ask('complex-subtract+choice', 2),
            teach(
              { kind: 'prose', text: 'Because the parts stay separate, a complex number behaves like a point with two coordinates — which is exactly how it is drawn on the complex plane, real part across and imaginary part up.' },
              { kind: 'display', tex: '3 + 4i \\quad \\longleftrightarrow \\quad (3, 4)' },
              plane([{ re: 3, im: 4, highlight: true }]),
              { kind: 'prose', text: 'Three across, four up — the dot sits where those two rulings meet.' },
              { kind: 'prose', text: 'Adding complex numbers is then the same operation as adding vectors: add the across-parts, add the up-parts. That correspondence is why complex numbers turn up wherever rotation and oscillation do.' },
              { kind: 'prose', text: 'One thing the picture takes away. Points in a plane cannot be put in order, so there is no sensible way to say one complex number is larger than another. $3 + 4i < 5 + 2i$ is not false — it is meaningless.' },
            ),
            asking('complex-equate', 1, 'One complex equation is really two real ones. Nothing real can cancel an i, so the real parts have to match each other and the imaginary parts have to match each other.'),
            ask('complex-equate', 2),
          ],
          skillCheck: [ask('complex-subtract', 2), ask('complex-part'), ask('complex-equate', 2)],
        },

        {
          id: 'cn-l1-quadratics',
          title: 'Quadratics with Complex Roots',
          slides: [
            teach(
              { kind: 'prose', text: 'Every quadratic with a negative discriminant has looked, until now, like a dead end. It is not: completing the square goes through exactly as before, and the equation this course opened with finally has an answer.' },
              { kind: 'display', tex: 'x^2 + 2x + 5 = (x + 1)^2 + 4 \\qquad (x + 1)^2 = -4' },
              { kind: 'prose', text: 'A square equal to $-4$ has no real solution — but since Level 1, it does have an imaginary one.' },
              { kind: 'display', tex: 'x + 1 = \\pm 2i \\qquad x = -1 \\pm 2i' },
              { kind: 'prose', text: 'Two roots, exactly as every quadratic has. They are simply not real.' },
            ),
            ask('complex-quadratic'),
            ask('sqrt-negative'),
            ask('real-solutions'),
            teach(
              { kind: 'prose', text: 'The quadratic formula reaches the same place. The part under the root is negative, so its square root is imaginary rather than undefined.' },
              { kind: 'display', tex: 'x = \\frac{-2 \\pm \\sqrt{-16}}{2} = \\frac{-2 \\pm 4i}{2} = -1 \\pm 2i' },
              { kind: 'prose', text: 'The slip to watch for is dividing only the real part by $2$ and leaving the imaginary part untouched — the $2$ in the denominator divides the whole numerator, both parts alike.' },
              { kind: 'prose', text: 'Checking costs one substitution: $(-1 + 2i)^2 = -3 - 4i$, add $2(-1 + 2i) = -2 + 4i$, add $5$, and the total is zero.' },
            ),
            ask('complex-quadratic+choice', 2),
            ask('sqrt-negative', 2),
            asking('root-pair', 1, 'Notice that the two roots above were a conjugate pair. That is not a coincidence: a quadratic with real coefficients can never have just one complex root.'),
            teach(
              { kind: 'prose', text: 'The two roots are always a conjugate pair when every coefficient is real, because the $\\pm$ sits only on the imaginary part — the real part is fixed regardless of which sign is taken.' },
              { kind: 'display', tex: 'x = -1 + 2i \\quad\\text{and}\\quad x = -1 - 2i' },
              { kind: 'prose', text: 'That fixed real part is the axis of symmetry, $-b/2a$; on the plane the two roots sit mirror-image across the real axis, the same reflection conjugates always give.' },
              { kind: 'prose', text: 'So every quadratic with real coefficients has either two real roots, one repeated real root, or a conjugate pair — the discriminant says which. Level 2 makes more of that conjugate.' },
            ),
            ask('root-pair', 2),
            ask('complex-discriminant-tree', 2),
          ],
          skillCheck: [ask('complex-quadratic', 2), ask('root-pair', 2), ask('sqrt-negative', 2)],
        },
      ],
      levelCheck: [
        ask('imaginary-square', 2),
        ask('sqrt-negative', 2),
        ask('imaginary-sum', 2),
        ask('imaginary-product', 2),
        ask('complex-add', 2),
        ask('complex-part', 2),
        ask('complex-quadratic', 2),
        ask('imaginary-square', 2),
        ask('sqrt-negative', 2),
        ask('imaginary-sum', 2),
        ask('imaginary-product', 2),
        ask('complex-add', 2),
        ask('complex-part', 2),
        ask('complex-quadratic', 2),
        ask('complex-quadratic', 2),
      ],
    },

    {
      id: 'cn-l2',
      title: 'Complex Arithmetic',
      lessons: [
        {
          id: 'cn-l2-multiply',
          title: 'Multiplication',
          slides: [
            teach(
              { kind: 'prose', text: 'Multiplying complex numbers is ordinary bracket expansion, with one extra step at the end. Every term in the first bracket meets every term in the second, exactly as with $(a + b)(c + d)$.' },
              { kind: 'display', tex: '(a + bi)(c + di) = ac + adi + bci + bd\\,i^2' },
              { kind: 'prose', text: 'That last term carries $i^2$, which is $-1$ — so it becomes real and joins the real part, arriving with its sign flipped.' },
              { kind: 'display', tex: '(a + bi)(c + di) = (ac - bd) + (ad + bc)i' },
              { kind: 'prose', text: 'The minus sign in $ac - bd$ is not a typo and not a rule to memorise. It is $i^2 = -1$ showing up, and it is the only place the answer differs from ordinary algebra.' },
              { kind: 'prose', text: 'Expand fully before collecting. Trying to jump straight to the two-part form is where the sign gets lost.' },
            ),
            ask('complex-multiply'),
            ask('complex-multiply+choice', 2),
            asking('complex-square', 1, 'A squared bracket is still two brackets, so the middle term appears twice. Squaring the two parts on their own is the mistake this one is for.'),
            teach(
              { kind: 'prose', text: 'The same trick makes powers of $i$ cycle. Every fourth power returns to where it started, because multiplying by $i$ four times is multiplying by $i^4 = 1$.' },
              { kind: 'display', tex: 'i^1 = i \\quad i^2 = -1 \\quad i^3 = -i \\quad i^4 = 1' },
              { kind: 'prose', text: 'So for any power, only the remainder on division by $4$ matters. For $i^{31}$, note $31 = 4 \\times 7 + 3$, and the seven complete cycles contribute a factor of $1$.' },
              { kind: 'display', tex: 'i^{31} = i^{3} = -i' },
              { kind: 'prose', text: 'A remainder of $0$ means the power lands exactly on the end of a cycle, giving $1$ rather than $i$. That is the case people get wrong most often, because $i^0$ and $i^4$ both being $1$ feels like one case too few.' },
            ),
            ask('powers-of-i'),
            asking('multiply-by-i', 1, 'Multiplying by i does something you can see: it swings the point a quarter turn about the origin. Plot where it lands.'),
            ask('powers-of-i', 2),
            teach(
              { kind: 'prose', text: 'Notice what multiplication does geometrically: it scales and rotates. Multiplying by $i$ alone is a quarter turn anticlockwise, which is why four of them return you to the start.' },
              { kind: 'display', tex: '1 \\to i \\to -1 \\to -i \\to 1' },
              { kind: 'prose', text: 'Follow $1$ round that cycle and it traces the four points of a square about the origin. Nothing is being scaled, because $i$ sits at distance $1$ from the origin; it is a pure rotation.' },
              { kind: 'prose', text: 'This is the idea the rest of the course builds on. Multiplying by any complex number scales by its distance from the origin and rotates by its angle, which is why complex numbers describe rotation more neatly than coordinates do.' },
            ),
            ask('complex-square', 2),
            ask('multiply-by-i', 2),
          ],
          skillCheck: [ask('complex-multiply', 2), ask('powers-of-i', 2), ask('complex-square', 2)],
        },

        {
          id: 'cn-l2-conjugates',
          title: 'Conjugates',
          slides: [
            teach(
              { kind: 'prose', text: 'The conjugate of a complex number flips the sign of its imaginary part, and leaves the real part alone. It is written with a bar over the top.' },
              { kind: 'display', tex: '\\overline{3 + 4i} = 3 - 4i \\qquad \\overline{-2 - 5i} = -2 + 5i' },
              { kind: 'prose', text: 'On the plane it is a reflection in the real axis: the same distance out, the same distance up or down, on the other side. Conjugating twice therefore returns the number you started with.' },
              { kind: 'prose', text: 'Only the imaginary part changes sign. Flipping both parts gives $-z$, which is a different number entirely — that is a rotation by half a turn, not a reflection.' },
            ),
            ask('complex-conjugate'),
            ask('complex-conjugate+choice', 2),
            ask('conjugate-plot'),
            teach(
              { kind: 'prose', text: 'Multiplying a number by its own conjugate always gives a real result — the imaginary parts cancel exactly.' },
              { kind: 'display', tex: '(a + bi)(a - bi) = a^2 - b^2i^2 = a^2 + b^2' },
              { kind: 'prose', text: 'It is the difference of two squares, and then $i^2 = -1$ turns the subtraction into an addition. That is why the answer is $a^2 + b^2$ rather than the $a^2 - b^2$ you might expect.' },
              { kind: 'prose', text: 'The result is not merely real, it is real and never negative — a sum of two squares. It is zero only when both parts are zero, which is to say only for the number $0$ itself.' },
              { kind: 'prose', text: 'Turned round, the fact is a tool: if you know $z\\overline{z}$ and the real part, the imaginary part is one subtraction and a root away — $z\\overline{z} = 25$ with real part $3$ gives $b^2 = 16$, so $b = 4$ or $-4$.' },
              { kind: 'prose', text: 'This is the single most useful fact about conjugates, and the next lesson depends on it entirely.' },
            ),
            asking('conjugate-sum', 1, 'Adding a number to its conjugate kills the imaginary part; subtracting kills the real one. That is the whole reason a conjugate can clear an i out of a denominator.'),
            ask('conjugate-recover'),
            ask('conjugate-sum+choice', 2),
            teach(
              { kind: 'prose', text: 'That real result is the square of the distance from the origin — which is where the next idea, the modulus, comes from.' },
              { kind: 'display', tex: '(3 + 4i)(3 - 4i) = 9 + 16 = 25 = 5^2' },
              { kind: 'prose', text: 'Read as Pythagoras it is obvious: $3$ across and $4$ up puts the point $5$ from the origin, and $25$ is that distance squared. Conjugation is doing geometry, not just tidying signs.' },
            ),
            ask('conjugate-recover+choice', 2),
            ask('conjugate-plot', 2),
          ],
          skillCheck: [ask('complex-conjugate', 2), ask('conjugate-recover', 2), ask('conjugate-plot', 2)],
        },

        {
          id: 'cn-l2-division',
          title: 'Division',
          slides: [
            teach(
              { kind: 'prose', text: 'You cannot divide by a complex number directly, because there is no way to read off the real and imaginary parts while one sits underneath a fraction bar. The trick is to make the denominator real first.' },
              { kind: 'prose', text: 'Multiply top and bottom by the conjugate of the denominator. The bottom becomes a real number by the fact from the last lesson, and dividing by a real number is something you can already do.' },
              { kind: 'display', tex: '\\dfrac{1}{1 + i} \\times \\dfrac{1 - i}{1 - i} = \\dfrac{1 - i}{2}' },
              { kind: 'prose', text: 'Nothing has changed value: $\\frac{1 - i}{1 - i}$ is $1$, so the number is the same one written differently. That is the licence for the whole manoeuvre.' },
              { kind: 'prose', text: 'Finish by splitting the fraction across both parts, so $\\frac{1 - i}{2}$ becomes $\\frac{1}{2} - \\frac{1}{2}i$. Leaving it over a single bar is not wrong, but the two parts are no longer readable, which was the point of doing this.' },
            ),
            ask('complex-divide'),
            ask('divide-which-multiplier'),
            ask('complex-divide+choice', 2),
            teach(
              { kind: 'prose', text: 'This is the same move as rationalising a surd denominator. Both use a conjugate to clear something awkward from the bottom of a fraction, and both rely on the difference of two squares to do it.' },
              { kind: 'display', tex: '\\dfrac{1}{\\sqrt{2} + 1} \\times \\dfrac{\\sqrt{2} - 1}{\\sqrt{2} - 1}' },
              { kind: 'prose', text: 'If you can already rationalise a surd, you can divide complex numbers — it is the same technique pointed at a different nuisance.' },
              { kind: 'prose', text: 'Use the conjugate of the *denominator*, not the numerator. Multiplying by the wrong one clears nothing and leaves the fraction worse than it started.' },
              { kind: 'prose', text: 'Division is multiplication run backwards: if $\\dfrac{z}{w} = u$ then $z = uw$. So a quotient can always be checked, and a missing $z$ recovered, by multiplying.' },
            ),
            asking('reciprocal', 1, 'With 1 on top there is nothing to expand, so the method shows through: everything lands over the sum of two squares, and only the imaginary part changes sign.'),
            ask('divide-reverse'),
            ask('reciprocal', 2),
            teach(
              { kind: 'prose', text: 'With division in hand, every arithmetic operation now works on complex numbers: add, subtract, multiply and divide, with the single exception of dividing by zero.' },
              { kind: 'prose', text: 'That is what makes them a number system rather than a curiosity. Everything from GCSE algebra — expanding, factorising, solving — carries over unchanged, with $i^2 = -1$ as the only addition.' },
              { kind: 'prose', text: 'More than that: every polynomial equation has a solution here. $x^2 = -1$ was the gap that started this, and closing it turns out to close every gap of that kind at once.' },
            ),
            ask('divide-reverse+choice', 2),
            ask('divide-which-multiplier', 2),
          ],
          skillCheck: [ask('complex-divide', 2), ask('divide-reverse', 2), ask('divide-which-multiplier', 2)],
        },
      ],
      levelCheck: [
        ask('complex-multiply', 2),
        ask('powers-of-i', 2),
        ask('complex-conjugate', 2),
        ask('complex-divide', 2),
        ask('complex-multiply', 2),
        ask('powers-of-i', 2),
        ask('complex-conjugate', 2),
        ask('complex-divide', 2),
        ask('complex-multiply', 2),
        ask('powers-of-i', 2),
        ask('complex-conjugate', 2),
        ask('complex-divide', 2),
      ],
    },

    {
      id: 'cn-l3',
      title: 'The Complex Plane',
      lessons: [
        {
          id: 'cn-l3-plane',
          title: 'Plotting Complex Numbers',
          slides: [
            teach(
              { kind: 'prose', text: 'A complex number has two independent parts, so it needs two axes to draw. The real part runs horizontally, the imaginary part vertically.' },
              { kind: 'prose', text: 'Every complex number is then a single point on this plane, and every point is a complex number. The correspondence is exact in both directions, which is what makes the picture worth having.' },
              { kind: 'prose', text: 'The real numbers are still there — they are the horizontal axis, the points with no height. Widening from a line to a plane is precisely what admitting $i$ did.' },
              { kind: 'prose', text: 'Both coordinates are real numbers. The vertical axis is labelled with $i$, but the number you read off it is $b$, not $bi$.' },
            ),
            ask('identify-point'),
            ask('plot-point'),
            ask('identify-point+choice', 2),
            teach(
              { kind: 'prose', text: 'It works the other way too: given a number, you can place it. Move along the real axis first, then up or down the imaginary axis.' },
              { kind: 'display', tex: '-2 + 3i \\quad \\longleftrightarrow \\quad (-2, 3)' },
              { kind: 'prose', text: 'So $-2 + 3i$ means two to the left and three up. The order of the two moves does not matter for the destination, but doing the real part first keeps the habit consistent with how the number is written.' },
              { kind: 'prose', text: 'Watch the signs on both axes. $-2 + 3i$ and $2 - 3i$ sit in opposite corners of the plane, and they are easy to confuse when reading quickly.' },
              plane([
                { re: -2, im: 3, highlight: true },
                { re: 2, im: -3 },
              ]),
              { kind: 'prose', text: 'The highlighted dot is $-2 + 3i$; the other is $2 - 3i$, straight through the origin from it.' },
            ),
            asking('quadrant', 1, 'Which quarter of the plane a number sits in is decided by two signs and nothing else. It matters more than it looks: it is what tells you the angle later.'),
            ask('plot-point', 2),
            ask('quadrant', 2),
            teach(
              { kind: 'prose', text: 'Adding complex numbers is now easy to picture: it shifts a point by the amount of the other, exactly like adding vectors.' },
              { kind: 'display', tex: '(3 + i) + (1 + 2i) = 4 + 3i' },
              { kind: 'prose', text: 'Go $3$ across and $1$ up, then a further $1$ across and $2$ up. Doing the two moves in the other order lands in the same place, which is addition being commutative, drawn.' },
              { kind: 'prose', text: 'Subtraction is the same idea reversed, and $z - w$ is the arrow *from* $w$ *to* $z$. That reading makes the modulus of a difference the distance between two points, which is worth holding on to for the next lesson.' },
            ),
            ask('plot-sum'),
            ask('plot-sum', 2),
          ],
          skillCheck: [ask('identify-point', 2), ask('plot-point', 2), ask('plot-sum', 2)],
        },

        {
          id: 'cn-l3-modulus',
          title: 'Modulus',
          slides: [
            teach(
              { kind: 'prose', text: 'Now the number is a point, it has a distance from the origin. That distance is called the modulus, written with vertical bars.' },
              { kind: 'display', tex: '|a + bi| = \\sqrt{a^2 + b^2}' },
              { kind: 'prose', text: 'It is Pythagoras, using the real and imaginary parts as the two shorter sides of a right-angled triangle with the number at its far corner.' },
              { kind: 'display', tex: '|3 + 4i| = \\sqrt{9 + 16} = \\sqrt{25} = 5' },
              { kind: 'display', tex: '|2 + 3i| = \\sqrt{4 + 9} = \\sqrt{13}' },
              { kind: 'prose', text: 'Most moduli are not whole numbers, and $\\sqrt{13}$ is the exact answer — the one to give. Do not reach for a decimal.' },
              { kind: 'prose', text: 'Where a surd simplifies, write it either way: $\\sqrt{20}$ and $2\\sqrt{5}$ are the same number, and both are accepted.' },
              { kind: 'prose', text: 'For a real number the bars mean exactly what they always did: $|{-3}|$ is $3$, whether you read it as absolute value or as distance from the origin along the real axis. The definition extends the old one rather than replacing it.' },
              { kind: 'prose', text: 'Square both parts before adding, and take the root only at the end. $|3 + 4i|$ is $5$, not $7$ — the parts do not simply add.' },
            ),
            ask('modulus'),
            ask('modulus-which'),
            ask('modulus-steps', 2),
            teach(
              { kind: 'prose', text: 'Because both parts get squared, the signs disappear. A number and its conjugate have the same modulus, and the modulus is never negative.' },
              { kind: 'display', tex: '|3 + 4i| = |3 - 4i| = |-3 + 4i| = 5' },
              { kind: 'prose', text: 'All four numbers with parts $\\pm 3$ and $\\pm 4$ sit on the same circle about the origin. The modulus says how far out a number is and nothing whatever about which direction.' },
              plane([
                { re: 3, im: 4, highlight: true },
                { re: 3, im: -4 },
                { re: -3, im: 4 },
                { re: -3, im: -4 },
              ]),
              { kind: 'prose', text: 'Only $0$ has modulus $0$. Everything else is a genuine distance from the origin, which is what lets you divide by any non-zero complex number.' },
            ),
            asking('modulus-product', 1, 'The modulus of a product is the product of the moduli, so there is no need to multiply the two numbers out first.'),
            ask('modulus-compare'),
            ask('modulus-product+choice', 2),
            teach(
              { kind: 'prose', text: 'This connects back to conjugates: multiplying a number by its conjugate gives the modulus squared.' },
              { kind: 'display', tex: 'z\\overline{z} = |z|^2' },
              { kind: 'prose', text: 'Which explains why the division trick works. Multiplying top and bottom by the conjugate turns the denominator into $|z|^2$, a positive real number, and dividing by that is straightforward.' },
              { kind: 'prose', text: 'Moduli also multiply: $|zw| = |z||w|$. Distances scale under multiplication, which is the other half of the "scale and rotate" picture from Level 2.' },
              { kind: 'display', tex: '|z - w| = \\text{the distance from } w \\text{ to } z' },
              { kind: 'prose', text: 'The plane lesson said $z - w$ is the arrow from $w$ to $z$. Its modulus is therefore the distance between the two points — subtract, then Pythagoras on what is left.' },
            ),
            ask('modulus-distance'),
            ask('modulus-distance+choice', 2),
          ],
          skillCheck: [ask('modulus', 2), ask('modulus-distance', 2), ask('modulus-which', 2)],
        },

        {
          id: 'cn-l3-sqrt',
          title: 'Square Roots of a Complex Number',
          slides: [
            teach(
              { kind: 'prose', text: 'A square root of $z$ is any $w$ with $w^2 = z$. Write $w = a + bi$, square it, and match parts — one complex equation becomes two real ones, the trick promised back in Level 1.' },
              { kind: 'display', tex: '(a + bi)^2 = a^2 - b^2 + 2ab\\,i \\qquad a^2 - b^2 = 3,\\ 2ab = 4' },
              { kind: 'prose', text: 'Two equations in two unknowns, for $z = 3 + 4i$. Guessing $a = 2, b = 1$ works here, but guessing is not a method.' },
              { kind: 'prose', text: 'Checking a candidate is one multiplication: square it and compare with $z$. $(2 + i)^2 = 3 + 4i$, so $2 + i$ is a square root of $3 + 4i$ — and $-2 - i$ is the other.' },
            ),
            ask('complex-sqrt'),
            ask('complex-sqrt+choice', 2),
            ask('power-reverse'),
            teach(
              { kind: 'prose', text: 'Here is the method. Squaring a number squares its modulus, so $a^2 + b^2 = |z|$ — a third equation, for free. Add it to the first for $a^2$, subtract for $b^2$.' },
              { kind: 'display', tex: 'a^2 + b^2 = |3 + 4i| = 5 \\qquad a^2 = \\tfrac{5 + 3}{2} = 4,\\ b^2 = \\tfrac{5 - 3}{2} = 1' },
              { kind: 'prose', text: 'The sign of $b$ comes from $2ab$: positive means $a$ and $b$ agree. So $\\sqrt{3 + 4i} = 2 + i$ or $-2 - i$.' },
            ),
            asking('sqrt-pair', 1, 'Every complex number has two square roots, and the second is the first with both signs turned over. Give both.'),
            ask('modulus', 2),
            ask('sqrt-pair', 2),
            teach(
              { kind: 'prose', text: 'Every non-zero complex number has exactly two square roots, negatives of each other — the $\\pm$ of real arithmetic survives.' },
              { kind: 'display', tex: '\\sqrt{3 + 4i} = \\pm(2 + i)' },
              { kind: 'prose', text: '"The" square root, when one is wanted, is the one with positive real part; when the real part is zero, the one with positive imaginary part.' },
              { kind: 'prose', text: 'Check by squaring: $(2 + i)^2 = 4 + 4i + i^2 = 3 + 4i$.' },
              { kind: 'prose', text: 'The same move is what makes the quadratic formula work for complex coefficients, though that is beyond this course.' },
            ),
            ask('modulus+choice', 2),
            ask('power-reverse'),
          ],
          skillCheck: [ask('complex-sqrt', 2), ask('power-reverse'), ask('modulus', 2)],
        },
      ],
      levelCheck: [
        ask('identify-point', 2),
        ask('plot-point', 2),
        ask('modulus', 2),
        ask('complex-sqrt', 2),
        ask('identify-point', 2),
        ask('plot-point', 2),
        ask('modulus', 2),
        ask('complex-sqrt', 2),
        ask('identify-point', 2),
        ask('plot-point', 2),
        ask('modulus', 2),
        ask('complex-sqrt', 2),
        ask('identify-point', 2),
        ask('modulus', 2),
        ask('complex-sqrt', 2),
      ],
    },

    {
      id: 'cn-l4',
      title: 'Angles and Powers',
      lessons: [
        {
          id: 'cn-l4-argument',
          title: 'Argument',
          slides: [
            teach(
              { kind: 'prose', text: 'A point on the plane needs two numbers to pin it down. So far those have been the real and imaginary parts, but distance and direction do the job just as well — and for multiplication they do it far better.' },
              { kind: 'prose', text: 'The modulus gives the distance. The argument gives the direction: the angle from the positive real axis, measured anticlockwise in radians.' },
              { kind: 'display', tex: '\\arg(1 + i) = \\tfrac{\\pi}{4}' },
              { kind: 'prose', text: 'That one is a quarter of the way to the top, because $1 + i$ is equally far across and up, so it sits on the diagonal at $45^{\\circ}$.' },
              plane([{ re: 1, im: 1, highlight: true }]),
              { kind: 'prose', text: 'Equally far across and up: the dot sits exactly on the diagonal running out of the origin.' },
              { kind: 'prose', text: 'In general $\\tan(\\arg z) = \\frac{b}{a}$, but do not reach straight for a calculator: the inverse tangent cannot tell $-2 - 2i$ from $2 + 2i$, since both give the same ratio. Sketch the point first and check which quadrant the answer belongs in.' },
            ),
            asking('quadrant', 1, 'Before any angle is worked out, say which quarter of the plane the number is in. That is what decides whether the arctangent needs correcting.'),
            ask('argument'),
            ask('argument+choice'),
            teach(
              { kind: 'prose', text: 'An angle is only fixed up to whole turns: adding $2\\pi$ points in exactly the same direction. To make the argument a single number rather than infinitely many, one of them is chosen as *the* answer.' },
              { kind: 'prose', text: 'By convention it is kept between $-\\pi$ and $\\pi$, so angles below the real axis are written as negative rather than as large positives.' },
              { kind: 'display', tex: '\\arg(1 - i) = -\\tfrac{\\pi}{4}, \\text{ not } \\tfrac{7\\pi}{4}' },
              { kind: 'prose', text: 'This is called the principal argument. If a calculation throws up an angle outside the range, add or subtract $2\\pi$ until it lands inside — that changes the written answer, not the direction.' },
              { kind: 'prose', text: 'The number $0$ has no argument at all. It sits at the origin and points nowhere, which is the one case the definition cannot cover.' },
            ),
            asking('argument-turns', 1, 'Now say where the angle is rather than what it is called, counted in eighths of a turn from the positive real axis.'),
            ask('modulus-steps'),
            ask('quadrant', 2),
            teach(
              { kind: 'prose', text: 'Scaling a number by a positive real moves it along its own ray, so the argument does not change. Modulus and argument really are independent: one can be altered without disturbing the other.' },
              { kind: 'display', tex: '\\arg(1 + i) = \\arg(5 + 5i) = \\tfrac{\\pi}{4}' },
              { kind: 'prose', text: 'Scaling by a *negative* real is different. It sends the point through the origin to the opposite side, which turns the direction by half a turn and so changes the argument by $\\pi$.' },
              { kind: 'prose', text: 'Between them, modulus and argument describe any complex number completely — and, as the next lesson shows, they are the pair that makes multiplication simple.' },
            ),
            ask('argument-turns', 2),
            ask('modulus-steps+choice', 2),
          ],
          // `modulus-steps`, not `modulus`: unit 1 gave `modulus` a typed surd
          // answer on a root keypad, and this lesson teaches nothing about
          // surds — it practises the reduce form only. `familyOf` counts the
          // two as one skill, correctly, but the answer format is the thing a
          // learner meets, and asking for a format the lesson never showed is
          // the defect this task exists to remove.
          skillCheck: [ask('argument', 2), ask('argument-turns', 2), ask('modulus-steps', 2)],
        },

        {
          id: 'cn-l4-polar',
          title: 'Modulus-Argument Form',
          slides: [
            teach(
              { kind: 'prose', text: 'Modulus and argument fix a point as surely as real and imaginary parts do, and there is a way of writing the number that uses them directly.' },
              { kind: 'display', tex: 'z = r\\left(\\cos\\theta + i\\sin\\theta\\right) \\qquad r = |z|,\\ \\theta = \\arg z' },
              { kind: 'prose', text: 'Reading it back: $r\\cos\\theta$ across, $r\\sin\\theta$ up. For the standard angles the cosine and sine are $0$, $\\pm 1$ or $\\pm\\tfrac{1}{\\sqrt{2}}$, so the arithmetic is small.' },
              { kind: 'display', tex: '2\\sqrt{2}\\left(\\cos\\tfrac{3\\pi}{4} + i\\sin\\tfrac{3\\pi}{4}\\right) = 2\\sqrt{2}\\left(-\\tfrac{1}{\\sqrt{2}}\\right) + 2\\sqrt{2}\\left(\\tfrac{1}{\\sqrt{2}}\\right)i = -2 + 2i' },
              plane([{ re: -2, im: 2, highlight: true }]),
              { kind: 'prose', text: 'The same point, described by distance and direction instead of across and up.' },
            ),
            ask('polar-form'),
            ask('polar-form+choice', 2),
            ask('argument'),
            teach(
              { kind: 'prose', text: 'The other direction. Modulus by Pythagoras, argument from a sketch — never from the calculator alone, since $-2 + 2i$ and $2 - 2i$ share a tangent.' },
              { kind: 'display', tex: '|{-2 + 2i}| = \\sqrt{4 + 4} = 2\\sqrt{2} \\qquad \\arg(-2 + 2i) = \\tfrac{3\\pi}{4}' },
              { kind: 'prose', text: 'Keep the argument principal, between $-\\pi$ and $\\pi$. The two slips: adding the parts for the modulus ($4$, not $2\\sqrt{2}$), and taking the diagonal angle in the wrong quadrant.' },
            ),
            asking('polar-multiply', 1, 'This form earns its keep on multiplication: the moduli multiply and the arguments add, with no brackets to expand at all.'),
            ask('modulus-steps'),
            ask('polar-multiply', 2),
            teach(
              { kind: 'prose', text: 'Why bother — because multiplication is easy in this form and hard in the other.' },
              { kind: 'display', tex: '|zw| = |z||w| \\qquad \\arg(zw) = \\arg z + \\arg w' },
              { kind: 'prose', text: 'Multiplying by $i$ (modulus $1$, argument $\\tfrac{\\pi}{2}$) is the quarter turn from Level 2, now as a formula.' },
              { kind: 'prose', text: 'Every number with the same modulus lies on one circle; every number with the same argument on one ray. The next lesson runs with this.' },
            ),
            ask('modulus', 2),
            ask('argument', 2),
          ],
          skillCheck: [ask('polar-form', 2), ask('polar-multiply', 2), ask('argument', 2)],
        },

        {
          id: 'cn-l4-powers',
          title: 'Powers',
          slides: [
            teach(
              { kind: 'prose', text: 'Raising a complex number to a power means repeated multiplication — and each multiplication rotates and scales.' },
              { kind: 'display', tex: '(1 + i)^2 = 1 + 2i + i^2 = 2i' },
              { kind: 'prose', text: 'Expanding works, and for a square it is quick enough. The real and imaginary parts of the answer bear no obvious relation to those of the original, which is the first sign that this is the wrong way to look at it.' },
              { kind: 'prose', text: 'Try $(1 + i)^{10}$ by expansion and the point makes itself. The binomial coefficients get large, the powers of $i$ cycle, and the whole thing is an exercise in bookkeeping rather than understanding.' },
              { kind: 'prose', text: 'Turned round: given $w$, which $z$ has $z^2 = w$? Raise each candidate and see — $(1 + i)^2 = 2i$, so $1 + i$ is a square root of $2i$, and so is $-(1 + i)$.' },
            ),
            ask('complex-power'),
            ask('complex-power+choice', 2),
            ask('power-reverse'),
            teach(
              { kind: 'prose', text: 'Seen in polar terms the pattern is simpler than the algebra suggests: powers multiply the modulus and add the argument.' },
              { kind: 'display', tex: '|z^n| = |z|^n \\qquad \\arg(z^n) = n\\arg(z)' },
              { kind: 'prose', text: 'The modulus half works on its own, for any angle: $|2 + i| = \\sqrt{5}$, so $|(2 + i)^3| = (\\sqrt{5})^3 = 5\\sqrt{5}$, with no need to find the argument at all.' },
              { kind: 'prose', text: 'This is De Moivre’s theorem, and it turns a messy expansion into one multiplication and one addition. It follows directly from multiplication scaling by the modulus and turning by the argument, applied $n$ times.' },
              { kind: 'display', tex: '(1 + i)^{10} = \\left(\\sqrt{2}\\right)^{10} \\text{ at angle } 10 \\times \\tfrac{\\pi}{4}' },
              { kind: 'prose', text: 'So the modulus is $32$ and the angle is $\\frac{10\\pi}{4}$, which is $\\frac{\\pi}{2}$ after removing a full turn. The answer is $32i$, reached without expanding anything.' },
              { kind: 'prose', text: 'The moduli multiply and the arguments add — never the other way round. Adding moduli is the commonest error here, and it comes from forgetting that the two coordinates are doing different jobs.' },
            ),
            ask('powers-of-i-steps', 2),
            ask('power-modulus'),
            asking('power-argument', 1, 'The angle behaves the same way the modulus just did, with one extra step: multiplying by the power usually pushes it past a half turn, and it has to come back inside.'),
            teach(
              { kind: 'prose', text: 'Because arguments add, repeated powers walk around a circle at a constant angle. If the modulus is $1$ the walk stays on the unit circle for ever, stepping the same amount each time.' },
              { kind: 'display', tex: 'i^1 = i \\to i^2 = -1 \\to i^3 = -i \\to i^4 = 1' },
              { kind: 'prose', text: 'That is the cycle from Level 2, now with a reason attached: $i$ has argument $\\frac{\\pi}{2}$, so four steps make a full turn and land back at the start. The pattern was never a coincidence.' },
              { kind: 'prose', text: 'A modulus above $1$ spirals outwards and one below $1$ spirals inwards. Only on the circle itself do the powers repeat rather than drift.' },
            ),
            ask('power-modulus+choice', 2),
            ask('power-argument', 2),
          ],
          skillCheck: [ask('complex-power', 2), ask('power-modulus', 2), ask('power-reverse', 2)],
        },

        {
          id: 'cn-l4-de-moivre',
          title: 'De Moivre’s Theorem',
          slides: [
            teach(
              { kind: 'prose', text: 'A power is repeated multiplication, and multiplication multiplies moduli and adds arguments — so a power raises the modulus to that power and multiplies the argument.' },
              { kind: 'display', tex: '|z^n| = |z|^n \\qquad \\arg(z^n) = n\\arg z' },
              { kind: 'prose', text: 'Worked example: $|z| = 2$ and $\\arg z = \\tfrac{\\pi}{6}$, so $|z^3| = 8$ and $\\arg(z^3) = \\tfrac{\\pi}{2}$. Nothing was expanded.' },
              { kind: 'prose', text: 'The commonest error is adding the moduli instead of raising, or multiplying the argument by the wrong thing.' },
            ),
            ask('polar-power'),
            ask('polar-power+choice', 2),
            ask('complex-power', 2),
            teach(
              { kind: 'prose', text: 'The argument this produces can leave the principal range, and must be brought back by whole turns of $2\\pi$.' },
              { kind: 'display', tex: '4 \\times \\tfrac{\\pi}{3} = \\tfrac{4\\pi}{3} \\quad\\Rightarrow\\quad \\tfrac{4\\pi}{3} - 2\\pi = -\\tfrac{2\\pi}{3}' },
              { kind: 'prose', text: 'Subtracting $2\\pi$ changes the label, not the direction. A remainder that lands exactly on $\\pi$ is written $\\pi$, not $-\\pi$.' },
            ),
            asking('polar-multiply', 1, 'De Moivre is this rule used over and over: multiplying moduli and adding arguments, with both numbers the same.'),
            ask('power-modulus'),
            ask('power-modulus+choice', 2),
            teach(
              { kind: 'prose', text: 'Check it against expansion once, then trust it.' },
              { kind: 'prose', text: '$(1 + i)^4$: expansion gives $(2i)^2 = -4$; De Moivre gives modulus $(\\sqrt{2})^4 = 4$ at angle $4 \\times \\tfrac{\\pi}{4} = \\pi$, which is $-4$.' },
              { kind: 'display', tex: '(1 + i)^4 = \\left(\\sqrt{2}\\right)^4\\left(\\cos\\pi + i\\sin\\pi\\right) = -4' },
              { kind: 'prose', text: 'When the angle is standard, De Moivre wins; when the number is small and the power is $2$, expanding is fine.' },
              { kind: 'prose', text: 'The $i^n$ cycle from Level 2 is De Moivre with $r = 1$ and $\\theta = \\tfrac{\\pi}{2}$.' },
            ),
            ask('polar-multiply', 2),
            ask('complex-power+choice', 2),
          ],
          skillCheck: [ask('polar-power', 2), ask('polar-multiply', 2), ask('complex-power', 2)],
        },
      ],
      levelCheck: [
        ask('argument', 2),
        ask('complex-power', 2),
        ask('polar-form', 2),
        ask('polar-power', 2),
        ask('argument', 2),
        ask('complex-power', 2),
        ask('polar-form', 2),
        ask('polar-power', 2),
        ask('argument', 2),
        ask('complex-power', 2),
        ask('polar-form', 2),
        ask('polar-power', 2),
        ask('argument', 2),
        ask('complex-power', 2),
        ask('polar-power', 2),
      ],
    },

    {
      id: 'cn-l5',
      title: 'Roots of Unity',
      lessons: [
        {
          id: 'cn-l5-unity',
          title: 'The nth Roots of Unity',
          slides: [
            teach(
              { kind: 'prose', text: 'A root of unity is a number that comes out as $1$ when raised to some power. $z^n = 1$ has exactly $n$ of them, and De Moivre says where they are.' },
              { kind: 'display', tex: '|z|^n = 1 \\qquad n\\arg z = 2k\\pi' },
              { kind: 'prose', text: 'The modulus must be $1$, since no other positive number stays at $1$ when raised to a power. And $n$ times the argument must be a whole number of turns, so the argument is a multiple of $\\tfrac{2\\pi}{n}$.' },
              { kind: 'display', tex: 'z = \\cos\\tfrac{2k\\pi}{n} + i\\sin\\tfrac{2k\\pi}{n}' },
              { kind: 'prose', text: 'Only $k = 0, 1, \\ldots, n - 1$ give different roots; $k = n$ is back at $1$. Call the $k = 1$ root $\\omega$. The rest are its powers, each a further $\\tfrac{2\\pi}{n}$ round:' },
              { kind: 'diagram', svg: unityCircleSvg(6, 2) },
              { kind: 'prose', text: 'The sixth roots of unity, with $\\omega^{2}$ highlighted, two steps anticlockwise from $1$.' },
            ),
            ask('unity-argument'),
            ask('unity-which'),
            ask('unity-slider'),
            teach(
              { kind: 'prose', text: 'For $n = 3, 4, 6, 8$ and $12$ the roots sit at angles whose sine and cosine you know exactly, so they can be written as $a + bi$.' },
              { kind: 'display', tex: '\\omega = \\cos\\tfrac{2\\pi}{3} + i\\sin\\tfrac{2\\pi}{3}' },
              { kind: 'display', tex: '= -\\tfrac{1}{2} + \\tfrac{\\sqrt{3}}{2}i' },
              { kind: 'prose', text: 'With modulus $1$ there is nothing to multiply by: the real part is the cosine and the imaginary part the sine. A root in the lower half has a negative sine, and it is the conjugate of its partner above.' },
            ),
            ask('unity-cartesian'),
            ask('unity-which', 2),
            ask('unity-cartesian+choice', 2),
            teach(
              { kind: 'prose', text: '$\\tfrac{2k\\pi}{n}$ counts anticlockwise the whole way round, but a principal argument lies in $(-\\pi, \\pi]$. Past halfway, take a whole turn off. With $n = 6$:' },
              { kind: 'display', tex: '\\arg\\left(\\omega^{5}\\right) = \\tfrac{10\\pi}{6} - 2\\pi = -\\tfrac{\\pi}{3}' },
              { kind: 'prose', text: 'That is one step clockwise from $1$: $\\omega^{5}$ and $\\omega^{-1}$ are the same root.' },
            ),
            ask('unity-argument+choice', 2),
            ask('unity-slider'),
          ],
          skillCheck: [ask('unity-argument', 2), ask('unity-cartesian', 2), ask('unity-which', 2)],
        },

        {
          id: 'cn-l5-diagram',
          title: 'On the Argand Diagram',
          slides: [
            teach(
              { kind: 'prose', text: 'Plotted, the $n$th roots of unity are the corners of a regular $n$-sided polygon inside the unit circle, with one corner always at $1$.' },
              { kind: 'diagram', svg: unityCircleSvg(8, -1) },
              { kind: 'prose', text: 'Some facts can be read straight off the picture. $-1$ is a corner exactly when $n$ is even, and $\\pm i$ exactly when $n$ is a multiple of $4$.' },
              { kind: 'prose', text: 'The polygon is symmetric about the real axis, so the conjugate of a root is another root: $\\overline{\\omega^{k}} = \\omega^{n - k}$, the same number of steps clockwise.' },
            ),
            ask('unity-count'),
            ask('unity-conjugate'),
            ask('unity-count+choice', 2),
            teach(
              { kind: 'prose', text: 'Multiplying by $\\omega$ turns a point by $\\tfrac{2\\pi}{n}$ without stretching it, so it moves each corner on to the next. Multiplying by $\\omega^{k}$ moves $k$ corners on.' },
              { kind: 'display', tex: '\\omega^{a} \\times \\omega^{b} = \\omega^{a + b} \\qquad \\omega^{n} = 1' },
              { kind: 'prose', text: 'Going past $1$ starts another lap, so a power of $\\omega$ can always lose whole laps of $n$. With $n = 5$: $\\omega^{3} \\times \\omega^{4} = \\omega^{7} = \\omega^{2}$.' },
            ),
            ask('unity-power'),
            ask('unity-conjugate', 2),
            ask('unity-power+choice', 2),
            teach(
              { kind: 'prose', text: 'Nothing makes $\\omega$ special except being the first corner round. Label a different root $\\omega$ and its powers still land on corners, with a longer stride.' },
              { kind: 'diagram', svg: unityCircleSvg(5, 1, 2) },
              { kind: 'prose', text: 'Here $\\omega$ is two corners round, so $\\omega^{2}$ is four and $\\omega^{3}$ is six: one lap and one more corner, the highlighted one. Count the strides, then take off whole laps.' },
            ),
            ask('unity-slider', 2),
            ask('unity-slider', 2),
          ],
          skillCheck: [ask('unity-conjugate', 2), ask('unity-power', 2), ask('unity-slider', 2)],
        },

        {
          id: 'cn-l5-sum',
          title: 'The Sum of the Roots',
          slides: [
            teach(
              { kind: 'prose', text: 'Add all $n$ roots of unity and you get $0$. On the diagram, the polygon balances on the origin.' },
              { kind: 'display', tex: '1 + \\omega + \\omega^{2} + \\cdots + \\omega^{n - 1} = 0' },
              { kind: 'prose', text: 'Algebraically it is a geometric series with ratio $\\omega \\neq 1$. Its sum is $\\tfrac{\\omega^{n} - 1}{\\omega - 1}$, and $\\omega^{n} = 1$ makes the top zero.' },
              { kind: 'prose', text: 'So leave any roots out and the rest add up to minus what was left out. With $n = 3$: $\\omega + \\omega^{2} = -1$. Reduce any power past $n - 1$ first, as in the last lesson.' },
            ),
            ask('unity-sum-except'),
            ask('unity-power', 2),
            ask('unity-sum-except', 2),
            teach(
              { kind: 'prose', text: 'Raise every root to the power $p$ and add. Each $\\omega^{k}$ becomes $\\omega^{pk}$, another root, so the question is which roots you land on.' },
              { kind: 'display', tex: '1 + \\omega^{p} + \\omega^{2p} + \\cdots + \\omega^{(n - 1)p}' },
              { kind: 'prose', text: 'If $p$ is a multiple of $n$, every term is $1$, and there are $n$ of them: the sum is $n$. Otherwise it is a geometric series with ratio $\\omega^{p} \\neq 1$, and the same argument gives $0$.' },
            ),
            ask('unity-sum-power'),
            ask('unity-power+choice', 2),
            ask('unity-sum-power+choice', 2),
            teach(
              { kind: 'prose', text: 'The roots of $z^{n} = w$ are one root $z_0$ times each root of unity, so they add up to $z_0(1 + \\omega + \\cdots + \\omega^{n - 1}) = 0$ as well, whatever $w$ is.' },
              plane([{ re: 1, im: 2 }, { re: -2, im: 1 }, { re: -1, im: -2 }, { re: 2, im: -1, highlight: true }]),
              { kind: 'prose', text: 'The fourth roots of $-7 - 24i$. Given three, the last is minus their sum: $(1 + 2i) + (-2 + i) + (-1 - 2i) = -2 + i$, so the fourth is $2 - i$.' },
            ),
            ask('roots-missing-plot'),
            ask('roots-missing-plot', 2),
          ],
          skillCheck: [ask('unity-sum-except', 2), ask('unity-sum-power', 2), ask('roots-missing-plot', 2)],
        },

        {
          id: 'cn-l5-general',
          title: 'Roots of z^n = w',
          slides: [
            teach(
              { kind: 'prose', text: 'The same method solves $z^{n} = w$ for any $w$. Write $w = R(\\cos\\varphi + i\\sin\\varphi)$ and match both sides of De Moivre.' },
              { kind: 'display', tex: '|z|^{n} = R' },
              { kind: 'display', tex: 'n\\arg z = \\varphi + 2k\\pi' },
              { kind: 'prose', text: 'Every root has modulus $\\sqrt[n]{R}$, the real $n$th root, and for $k = 0, 1, \\ldots, n - 1$ the arguments are' },
              { kind: 'display', tex: '\\theta_k = \\frac{\\varphi + 2k\\pi}{n}' },
              { kind: 'prose', text: 'For $z^{3} = 8i$: $R = 8$ and $\\varphi = \\tfrac{\\pi}{2}$, so $|z| = 2$ and $\\theta_k = \\tfrac{\\pi}{6} + \\tfrac{2k\\pi}{3}$.' },
            ),
            ask('root-modulus'),
            ask('root-argument'),
            ask('root-modulus+choice', 2),
            teach(
              { kind: 'prose', text: 'To list all $n$ arguments, start at $\\tfrac{\\varphi}{n}$ and add $\\tfrac{2\\pi}{n}$ each time. Any that pass $\\pi$ come back by a whole turn.' },
              { kind: 'display', tex: 'z^{3} = 8i: \\quad \\tfrac{\\pi}{6},\\ \\tfrac{5\\pi}{6},\\ \\tfrac{3\\pi}{2} \\to -\\tfrac{\\pi}{2}' },
              { kind: 'prose', text: 'The usual slip is dividing $\\varphi$ by $n$ but stepping by $2\\pi$, which lands on the same root every time. The step is $\\tfrac{2\\pi}{n}$.' },
            ),
            ask('root-args-tiles'),
            ask('root-argument+choice', 2),
            ask('root-args-tiles', 2),
            teach(
              { kind: 'prose', text: 'The roots still make a regular $n$-gon, now of radius $\\sqrt[n]{R}$ and turned so that one corner is at $\\tfrac{\\varphi}{n}$. Each root is the one before times $\\omega$.' },
              { kind: 'prose', text: 'For $n = 4$ that factor is $i$, a quarter turn, which takes $a + bi$ to $-b + ai$. The fourth roots of $-4$ are $1 + i$ and its three quarter turns:' },
              plane([{ re: 1, im: 1, highlight: true }, { re: -1, im: 1 }, { re: -1, im: -1 }, { re: 1, im: -1 }]),
            ),
            ask('root-rotate-plot'),
            ask('root-rotate-plot', 2),
          ],
          skillCheck: [ask('root-modulus', 2), ask('root-argument', 2), ask('root-rotate-plot', 2)],
        },
      ],
      levelCheck: [
        ask('unity-argument', 2),
        ask('unity-count', 2),
        ask('roots-missing-plot', 2),
        ask('root-modulus', 2),
        ask('unity-cartesian', 2),
        ask('unity-conjugate', 2),
        ask('unity-sum-power', 2),
        ask('root-args-tiles', 2),
        ask('unity-which', 2),
        ask('unity-power', 2),
        ask('root-rotate-plot', 2),
        ask('unity-sum-except', 2),
        ask('root-argument', 2),
        ask('unity-slider', 2),
      ],
    },

    {
      id: 'cn-l6',
      title: 'Loci in the Complex Plane',
      lessons: [
        {
          id: 'cn-l6-circles',
          title: 'Circles',
          slides: [
            teach(
              { kind: 'prose', text: 'A locus is the set of points that obey a rule. $|z - a|$ is the distance from $z$ to $a$, so $|z - a| = r$ picks out every point exactly $r$ from $a$: a circle with centre $a$ and radius $r$.' },
              { kind: 'display', tex: '|z - (1 + i)| = 2' },
              { kind: 'diagram', svg: locusSvg({ range: 4, circles: [{ re: 1, im: 1, r: 2 }], points: [{ re: 1, im: 1, label: 'a' }] }) },
            ),
            ask('locus-circle-centre'),
            ask('locus-circle-radius'),
            ask('locus-circle-tiles'),
            teach(
              { kind: 'prose', text: 'Loci usually arrive with the bracket multiplied out. Put it back before reading the centre, because the minus sign belongs to the whole of $a$:' },
              { kind: 'display', tex: '|z + 2 - i| = |z - (-2 + i)|' },
              { kind: 'prose', text: 'So that circle is centred on $-2 + i$, not $2 - i$. Written $|a - z|$ it is the same distance the other way round, and the same circle.' },
              { kind: 'prose', text: 'The radius is a distance too. If the circle passes through $b$, then $r = |b - a|$.' },
            ),
            ask('locus-circle-through'),
            ask('locus-circle-centre', 2),
            ask('locus-circle-through+choice', 2),
            teach(
              { kind: 'prose', text: 'A number multiplying $z$ comes out of the modulus as a factor, since $|kw| = k|w|$ for positive $k$. Take it out before reading the radius:' },
              { kind: 'display', tex: '|2z - 4 + 6i| = 8' },
              { kind: 'display', tex: '2|z - (2 - 3i)| = 8' },
              { kind: 'display', tex: '|z - (2 - 3i)| = 4' },
            ),
            ask('locus-circle-radius', 2),
            ask('locus-circle-tiles', 2),
          ],
          skillCheck: [ask('locus-circle-centre', 2), ask('locus-circle-tiles', 2), ask('locus-circle-through', 2)],
        },

        {
          id: 'cn-l6-bisectors',
          title: 'Perpendicular Bisectors',
          slides: [
            teach(
              { kind: 'prose', text: '$|z - a| = |z - b|$ asks for the points exactly as far from $a$ as from $b$. That is a straight line, the perpendicular bisector of the segment from $a$ to $b$.' },
              {
                kind: 'diagram',
                svg: locusSvg({
                  range: 4,
                  segments: [[[-1, -1], [3, 1]]],
                  lines: [{ re: 1, im: 0, dx: -1, dy: 2 }],
                  points: [{ re: -1, im: -1, label: 'a' }, { re: 3, im: 1, label: 'b' }, { re: 1, im: 0, highlight: true }],
                }),
              },
              { kind: 'prose', text: 'Here $|z + 1 + i| = |z - 3 - i|$. The line meets the segment at right angles at its midpoint, $1$. Every point off the line is nearer one of $a$ and $b$: compare the squared distances to tell which.' },
            ),
            ask('locus-bisector-midpoint'),
            ask('locus-bisector-side'),
            ask('locus-bisector-midpoint', 2),
            teach(
              { kind: 'prose', text: 'For a Cartesian equation you need a point and a gradient. The point is the midpoint. The gradient is perpendicular to the segment: minus one over its gradient.' },
              { kind: 'display', tex: 'a = -1 - i, \\quad b = 3 + i' },
              { kind: 'display', tex: 'm_{ab} = \\tfrac{2}{4} = \\tfrac{1}{2} \\;\\Rightarrow\\; m = -2' },
              { kind: 'display', tex: 'y = -2(x - 1) = -2x + 2' },
            ),
            ask('locus-bisector-line'),
            ask('locus-bisector-side', 2),
            ask('locus-bisector-line+choice', 2),
            teach(
              { kind: 'prose', text: 'Where does the line cross the real axis? There $z = x$, a real number as far from $a$ as from $b$:' },
              { kind: 'display', tex: '(x + 1)^2 + 1 = (x - 3)^2 + 1' },
              { kind: 'prose', text: 'The $x^2$ terms always cancel, leaving a linear equation. Here $2x + 1 = -6x + 9$, so $x = 1$.' },
            ),
            ask('locus-bisector-crossing'),
            ask('locus-bisector-crossing', 2),
          ],
          skillCheck: [ask('locus-bisector-midpoint', 2), ask('locus-bisector-line', 2), ask('locus-bisector-side', 2)],
        },

        {
          id: 'cn-l6-half-lines',
          title: 'Half-Lines',
          slides: [
            teach(
              { kind: 'prose', text: '$\\arg(z - a) = \\theta$ asks for the points whose direction from $a$ is $\\theta$. That is a half-line: it starts at $a$ and runs off at angle $\\theta$ to the positive real direction.' },
              { kind: 'display', tex: '\\arg(z - (1 - i)) = \\tfrac{3\\pi}{4}' },
              { kind: 'diagram', svg: locusSvg({ range: 4, rays: [{ re: 1, im: -1, dx: -1, dy: 1 }], points: [{ re: 1, im: -1, open: true, label: 'a' }] }) },
              { kind: 'prose', text: 'The start is drawn open: $\\arg 0$ has no value, so $a$ itself is not on the locus.' },
            ),
            ask('locus-halfline-turns'),
            ask('locus-halfline-point'),
            ask('locus-halfline-tiles'),
            teach(
              { kind: 'prose', text: 'It is only half a line. Points behind $a$ are on the same straight line, but their direction from $a$ is the opposite angle.' },
              { kind: 'prose', text: 'And the start matters: $\\arg z = \\theta$ is the half-line from the origin, a different locus. As with circles, gather the bracket before reading the start. $\\arg(z + 2 - i)$ starts at $-2 + i$.' },
            ),
            ask('locus-halfline-through'),
            ask('locus-halfline-point', 2),
            ask('locus-halfline-tiles', 2),
            teach(
              { kind: 'prose', text: 'Given a point the half-line passes through, its angle is the argument of the step from the start to that point. From $1$ through $3 + 2i$:' },
              { kind: 'display', tex: '\\arg(2 + 2i) = \\tfrac{\\pi}{4}' },
            ),
            ask('locus-halfline-turns', 2),
            ask('locus-halfline-through', 2),
          ],
          skillCheck: [ask('locus-halfline-point', 2), ask('locus-halfline-through', 2), ask('locus-halfline-turns', 2)],
        },

        {
          id: 'cn-l6-regions',
          title: 'Regions',
          slides: [
            teach(
              { kind: 'prose', text: 'Swap the $=$ for an inequality and a curve becomes a region. $|z - a| < r$ is every point closer than $r$ to $a$, the inside of the circle; $|z - a| > r$ is the outside.' },
              { kind: 'diagram', svg: locusSvg({ range: 4, discs: [{ re: 1, im: 0, r: 2 }], circles: [{ re: 1, im: 0, r: 2, dashed: true }], points: [{ re: 1, im: 0 }] }) },
              { kind: 'prose', text: '$|z - 1| < 2$. A strict inequality leaves the circle out, drawn dashed; with $\\le$ or $\\ge$ it is included and drawn solid. In $|z - a| \\le r$ the real part reaches at most $r$ past the centre\'s.' },
            ),
            ask('locus-region-flow'),
            ask('locus-region-match'),
            ask('locus-region-extreme'),
            teach(
              { kind: 'prose', text: '$|z - a| < |z - b|$ is every point nearer $a$ than $b$: the side of the perpendicular bisector that $a$ is on.' },
              {
                kind: 'diagram',
                svg: locusSvg({
                  range: 4,
                  halves: [{ re: 1, im: 0, dx: -1, dy: 2, toward: [-1, -1] }],
                  lines: [{ re: 1, im: 0, dx: -1, dy: 2, dashed: true }],
                  points: [{ re: -1, im: -1, label: 'a' }, { re: 3, im: 1, label: 'b' }],
                }),
              },
            ),
            ask('locus-region-flow', 2),
            ask('locus-region-match', 2),
            ask('locus-region-extreme+choice', 2),
            teach(
              { kind: 'prose', text: 'Between two arguments is a wedge, with its point at $a$ and its edges two half-lines.' },
              { kind: 'display', tex: '\\tfrac{\\pi}{4} < \\arg z < \\tfrac{3\\pi}{4}' },
              {
                kind: 'diagram',
                svg: locusSvg({
                  range: 4,
                  wedges: [{ re: 0, im: 0, from: 1, to: 3 }],
                  rays: [{ re: 0, im: 0, dx: 1, dy: 1, dashed: true }, { re: 0, im: 0, dx: -1, dy: 1, dashed: true }],
                  points: [{ re: 0, im: 0, open: true }],
                }),
              },
              { kind: 'prose', text: 'To test a number, measure its direction from $a$, not from the origin.' },
            ),
            ask('locus-region-wedge'),
            ask('locus-region-wedge', 2),
          ],
          skillCheck: [ask('locus-region-flow', 2), ask('locus-region-match', 2), ask('locus-region-wedge', 2)],
        },

        {
          id: 'cn-l6-cartesian',
          title: 'Loci in Cartesian Form',
          slides: [
            teach(
              { kind: 'prose', text: 'Writing $z = x + iy$ turns a locus into an equation in $x$ and $y$. A modulus is Pythagoras on the two parts, so square both sides:' },
              { kind: 'display', tex: '|z - (2 - i)| = 3' },
              { kind: 'display', tex: '(x - 2)^2 + (y + 1)^2 = 9' },
              { kind: 'prose', text: 'The centre\'s signs flip inside the brackets, and the radius is squared.' },
            ),
            ask('locus-cartesian-tiles'),
            ask('locus-cartesian-centre'),
            ask('locus-cartesian-radius'),
            teach(
              { kind: 'prose', text: 'Going back, a circle that has been multiplied out needs its squares completed first:' },
              { kind: 'display', tex: 'x^2 + y^2 - 4x + 2y = 4' },
              { kind: 'prose', text: 'Here $x^2 - 4x = (x - 2)^2 - 4$ and $y^2 + 2y = (y + 1)^2 - 1$, so the $4$ and $1$ move across:' },
              { kind: 'display', tex: '(x - 2)^2 + (y + 1)^2 = 9' },
              { kind: 'prose', text: 'Centre $2 - i$, radius $3$.' },
            ),
            ask('locus-cartesian-centre', 2),
            ask('locus-cartesian-tiles', 2),
            ask('locus-cartesian-radius', 2),
            teach(
              { kind: 'prose', text: '$|z|$ is the distance from the origin. The nearest and furthest points of a circle lie on the line through the origin and its centre, so they are $|a| - r$ and $|a| + r$ away.' },
              {
                kind: 'diagram',
                svg: locusSvg({
                  range: 7,
                  circles: [{ re: 3, im: 4, r: 2 }],
                  segments: [[[0, 0], [4.2, 5.6]]],
                  points: [{ re: 0, im: 0 }, { re: 3, im: 4, label: 'a' }, { re: 1.8, im: 2.4, highlight: true }, { re: 4.2, im: 5.6, highlight: true }],
                }),
              },
              { kind: 'prose', text: 'For $|z - (3 + 4i)| = 2$, $|a| = 5$, so $|z|$ runs from $3$ to $7$. If the origin is inside the circle, the least is $r - |a|$ instead.' },
            ),
            ask('locus-modulus-range'),
            ask('locus-modulus-range+choice', 2),
          ],
          skillCheck: [ask('locus-cartesian-centre', 2), ask('locus-cartesian-tiles', 2), ask('locus-modulus-range', 2)],
        },
      ],
      levelCheck: [
        ask('locus-circle-centre', 2),
        ask('locus-bisector-line', 2),
        ask('locus-halfline-through', 2),
        ask('locus-region-flow', 2),
        ask('locus-cartesian-tiles', 2),
        ask('locus-circle-through', 2),
        ask('locus-bisector-side', 2),
        ask('locus-halfline-point', 2),
        ask('locus-region-match', 2),
        ask('locus-modulus-range', 2),
        ask('locus-circle-tiles', 2),
        ask('locus-bisector-midpoint', 2),
        ask('locus-halfline-turns', 2),
        ask('locus-region-wedge', 2),
        ask('locus-cartesian-centre', 2),
      ],
    },

    {
      id: 'cn-l7',
      title: 'The Exponential Form',
      lessons: [
        {
          id: 'cn-l7-euler',
          title: 'Euler’s Formula',
          slides: [
            teach(
              { kind: 'prose', text: 'Euler\'s formula joins the exponential function to the circle. For any angle $\\theta$ in radians:' },
              { kind: 'display', tex: 'e^{i\\theta} = \\cos\\theta + i\\sin\\theta' },
              { kind: 'prose', text: 'The right-hand side is the point at angle $\\theta$ on the unit circle, so $e^{i\\theta}$ has modulus 1 and argument $\\theta$. With $\\theta = \\tfrac{\\pi}{3}$ it is the marked point, $\\tfrac{1}{2} + \\tfrac{\\sqrt{3}}{2}i$.' },
              {
                kind: 'diagram',
                svg: locusSvg({
                  range: 2,
                  circles: [{ re: 0, im: 0, r: 1 }],
                  segments: [[[0, 0], [0.5, 0.866]]],
                  points: [{ re: 0.5, im: 0.866, highlight: true }],
                }),
              },
              { kind: 'prose', text: 'A number in front stretches it: $re^{i\\theta}$ is $r$ from the origin in the same direction.' },
            ),
            ask('expform-euler-cartesian'),
            ask('expform-euler-plot'),
            ask('expform-euler-flow'),
            teach(
              { kind: 'prose', text: 'Some angles are worth knowing on sight. A quarter turn lands on $i$ and a half turn on $-1$:' },
              { kind: 'display', tex: 'e^{i\\frac{\\pi}{2}} = i \\qquad e^{i\\pi} = -1' },
              { kind: 'prose', text: 'A whole turn of $2\\pi$ comes back to where it started, so adding or taking off $2\\pi$ never changes the number. $e^{i\\frac{7\\pi}{3}}$ is $e^{i\\frac{\\pi}{3}}$ again.' },
            ),
            ask('expform-euler-flow', 2),
            ask('expform-euler-parts'),
            ask('expform-euler-cartesian+choice', 2),
            teach(
              { kind: 'prose', text: 'A negative angle turns clockwise. Cosine ignores the sign and sine flips it, so $e^{-i\\theta}$ is the conjugate of $e^{i\\theta}$:' },
              { kind: 'display', tex: 'e^{-i\\theta} = \\cos\\theta - i\\sin\\theta' },
              { kind: 'prose', text: 'On a diagonal, a modulus of $k\\sqrt{2}$ is $k$ across and $k$ up or down, so $3\\sqrt{2}e^{-i\\frac{\\pi}{4}} = 3 - 3i$.' },
            ),
            ask('expform-euler-plot', 2),
            ask('expform-euler-parts', 2),
          ],
          skillCheck: [ask('expform-euler-cartesian', 2), ask('expform-euler-flow', 2), ask('expform-euler-plot', 2)],
        },

        {
          id: 'cn-l7-form',
          title: 'Writing z = re^(iθ)',
          slides: [
            teach(
              { kind: 'prose', text: 'Euler\'s formula turns modulus-argument form into something much shorter, the exponential form:' },
              { kind: 'display', tex: 'r(\\cos\\theta + i\\sin\\theta) = re^{i\\theta}' },
              { kind: 'prose', text: 'The number in front is the modulus and the angle in the exponent is an argument. $4e^{-i\\frac{2\\pi}{3}}$ has modulus $4$ and argument $-\\tfrac{2\\pi}{3}$.' },
            ),
            ask('expform-read'),
            ask('expform-swap'),
            asking(
              'expform-principal',
              1,
              'Any whole number of turns can be added to the angle, but the principal argument is the one in $(-\\pi, \\pi]$. Take turns of $2\\pi$ off, or add them, until it lands inside.',
            ),
            teach(
              { kind: 'prose', text: 'Going the other way, from $a + bi$, needs the modulus and an argument. The modulus is Pythagoras; the argument comes from the quadrant and the sizes of the parts.' },
              { kind: 'display', tex: 'z = -2\\sqrt{3} + 2i' },
              { kind: 'display', tex: 'r = \\sqrt{12 + 4} = 4' },
              { kind: 'prose', text: 'The parts are $4 \\times (-\\tfrac{\\sqrt{3}}{2})$ and $4 \\times \\tfrac{1}{2}$, the cosine and sine of $\\tfrac{5\\pi}{6}$. So $z = 4e^{i\\frac{5\\pi}{6}}$.' },
            ),
            ask('expform-convert'),
            ask('expform-swap', 2),
            ask('expform-principal', 2),
            teach(
              { kind: 'prose', text: 'A modulus is never negative. A minus sign in front is $-1 = e^{i\\pi}$, a half turn, so it belongs in the angle:' },
              { kind: 'display', tex: '-2e^{i\\frac{\\pi}{3}} = 2e^{i\\frac{4\\pi}{3}}' },
              { kind: 'display', tex: '= 2e^{-i\\frac{2\\pi}{3}}' },
            ),
            ask('expform-read', 2),
            ask('expform-convert', 2),
          ],
          skillCheck: [ask('expform-read', 2), ask('expform-convert', 2), ask('expform-principal', 2)],
        },

        {
          id: 'cn-l7-multiply',
          title: 'Multiplying and Dividing',
          slides: [
            teach(
              { kind: 'prose', text: 'In exponential form, multiplying is an index law. Multiply the moduli and add the angles:' },
              { kind: 'display', tex: 'r_1e^{i\\theta_1} \\times r_2e^{i\\theta_2} = r_1r_2\\,e^{i(\\theta_1 + \\theta_2)}' },
              { kind: 'prose', text: 'Dividing divides the moduli and subtracts the angles. If the new angle leaves $(-\\pi, \\pi]$, take a whole turn off or add one on:' },
              { kind: 'display', tex: '2e^{i\\frac{3\\pi}{4}} \\times 3e^{i\\frac{\\pi}{2}} = 6e^{i\\frac{5\\pi}{4}}' },
              { kind: 'display', tex: '= 6e^{-i\\frac{3\\pi}{4}}' },
            ),
            ask('expform-product'),
            ask('expform-quotient-tree'),
            ask('expform-product', 2),
            teach(
              { kind: 'prose', text: 'Multiplying by $e^{i\\theta}$ changes no length, because its modulus is 1. All it does is turn the number about the origin by $\\theta$.' },
              { kind: 'display', tex: 'e^{i\\frac{\\pi}{2}} = i' },
              { kind: 'prose', text: 'So multiplying by $i$ is a quarter turn anticlockwise, taking $a + bi$ to $-b + ai$. Multiplying by $e^{i\\pi} = -1$ is a half turn.' },
            ),
            ask('expform-turn'),
            ask('expform-quotient-tree', 2),
            ask('expform-turn', 2),
            teach(
              { kind: 'prose', text: 'The reciprocal and the conjugate both turn the angle the other way. Only the reciprocal changes the modulus:' },
              { kind: 'display', tex: '\\frac{1}{re^{i\\theta}} = \\tfrac{1}{r}e^{-i\\theta}' },
              { kind: 'display', tex: '\\overline{re^{i\\theta}} = re^{-i\\theta}' },
            ),
            ask('expform-reciprocal'),
            ask('expform-reciprocal', 2),
          ],
          skillCheck: [ask('expform-product', 2), ask('expform-quotient-tree', 2), ask('expform-reciprocal', 2)],
        },

        {
          id: 'cn-l7-powers',
          title: 'Powers in Exponential Form',
          slides: [
            teach(
              { kind: 'prose', text: 'A power of $re^{i\\theta}$ follows the same index laws: raise the modulus to the power and multiply the angle by it. This is De Moivre\'s theorem, written short.' },
              { kind: 'display', tex: '(re^{i\\theta})^n = r^ne^{in\\theta}' },
              { kind: 'display', tex: '(2e^{i\\frac{\\pi}{3}})^4 = 16e^{i\\frac{4\\pi}{3}}' },
              { kind: 'prose', text: 'Then bring the angle into $(-\\pi, \\pi]$: $16e^{-i\\frac{2\\pi}{3}}$. Euler\'s formula turns it into $-8 - 8\\sqrt{3}i$.' },
            ),
            ask('expform-power'),
            ask('expform-power-plot'),
            ask('expform-power-steps'),
            teach(
              { kind: 'prose', text: 'The law holds for negative powers too. The modulus becomes a fraction and the angle turns the other way:' },
              { kind: 'display', tex: 'z^{-n} = \\tfrac{1}{r^n}e^{-in\\theta}' },
              { kind: 'prose', text: 'With $z = 2e^{i\\frac{\\pi}{6}}$, $z^{-2} = \\tfrac{1}{4}e^{-i\\frac{\\pi}{3}}$.' },
            ),
            ask('expform-negative-power'),
            ask('expform-power-plot', 2),
            ask('expform-negative-power', 2),
            teach(
              { kind: 'prose', text: 'When is $z^n$ real? When its angle $n\\theta$ is a whole number of half turns. For $\\theta = \\tfrac{3\\pi}{8}$ that first happens at $n = 8$, where $n\\theta = 3\\pi$.' },
              { kind: 'prose', text: 'For a positive real number $n\\theta$ must be whole turns instead, and for a purely imaginary one an odd number of quarter turns.' },
            ),
            ask('expform-least-power'),
            ask('expform-least-power', 2),
          ],
          skillCheck: [ask('expform-power', 2), ask('expform-power-plot', 2), ask('expform-least-power', 2)],
        },

        {
          id: 'cn-l7-forms',
          title: 'Choosing a Form',
          slides: [
            teach(
              { kind: 'prose', text: 'Each form has its job. $a + bi$ adds and subtracts, real part with real part. $re^{i\\theta}$ multiplies, divides and takes powers, moduli with moduli and angles with angles.' },
              { kind: 'prose', text: 'So the first question with any calculation is which form suits it, and the second is whether the numbers are in that form yet.' },
            ),
            ask('expform-method-flow'),
            ask('expform-match-point'),
            ask('expform-sum'),
            teach(
              { kind: 'prose', text: 'There is no rule for adding moduli and angles, so a sum of two numbers in exponential form is converted first:' },
              { kind: 'display', tex: '2e^{i\\frac{\\pi}{2}} + 3e^{i\\pi} = 2i - 3' },
              { kind: 'prose', text: 'That is $-3 + 2i$. Its modulus is $\\sqrt{13}$, not $2 + 3$.' },
            ),
            ask('expform-sum+choice', 2),
            ask('expform-method-flow', 2),
            ask('expform-match-point', 2),
            teach(
              { kind: 'prose', text: 'A high power of $a + bi$ is the other way round: multiplying it out takes many steps, and exponential form takes three.' },
              { kind: 'display', tex: '1 + i = \\sqrt{2}e^{i\\frac{\\pi}{4}}' },
              { kind: 'display', tex: '(1 + i)^8 = 16e^{2\\pi i} = 16' },
            ),
            ask('expform-cartesian-power'),
            ask('expform-cartesian-power', 2),
          ],
          skillCheck: [ask('expform-sum', 2), ask('expform-match-point', 2), ask('expform-cartesian-power', 2)],
        },
      ],
      levelCheck: [
        ask('expform-euler-flow', 2),
        ask('expform-read', 2),
        ask('expform-product', 2),
        ask('expform-power-steps', 2),
        ask('expform-convert', 2),
        ask('expform-euler-plot', 2),
        ask('expform-least-power', 2),
        ask('expform-quotient-tree', 2),
        ask('expform-sum', 2),
        ask('expform-reciprocal', 2),
        ask('expform-power-plot', 2),
        ask('expform-method-flow', 2),
        ask('expform-euler-cartesian', 2),
        ask('expform-principal', 2),
        ask('expform-cartesian-power', 2),
      ],
    },
  ],
};
