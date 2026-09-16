/**
 * Complex Numbers, Level 1.
 *
 * Lesson rhythm follows the brief: a technique is taught, then practised three
 * times; a second technique is taught, then practised two or three times. Three
 * sealed skill-check questions close the lesson.
 */
import type { Block, Course, SlideRef } from '../types';
import { complexPlaneSvg, rangeFor, type PlanePoint } from '../generators/plane';

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
            ask('sqrt-negative', 2),
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
            ask('imaginary-sum'),
            ask('imaginary-sum+choice', 2),
            teach(
              { kind: 'prose', text: 'Multiplication is where $i$ stops behaving like $x$. Multiply the coefficients as usual, which leaves an $i^2$ behind, and then replace that $i^2$ with $-1$.' },
              { kind: 'display', tex: '3i \\times 2i = 6i^2 = -6' },
              { kind: 'prose', text: 'So a product of two imaginary numbers is *real*, and it is negative whenever the two coefficients have the same sign. That is the opposite of what multiplication normally does, and it is the whole reason $i$ is useful.' },
              { kind: 'prose', text: 'The step people skip is the second one. Stopping at $6i^2$ leaves the answer unsimplified; writing $6i$ loses the squaring altogether. Take the coefficients first, then deal with the $i^2$ as a separate move.' },
            ),
            ask('imaginary-product'),
            ask('imaginary-sum+choice'),
            ask('imaginary-product', 2),
            teach(
              { kind: 'prose', text: 'Watch the pattern: adding imaginary numbers keeps them imaginary, multiplying two of them makes them real. Addition stays in the imaginary world, multiplication steps out of it.' },
              { kind: 'display', tex: 'i^2 = -1 \\qquad i^3 = -i \\qquad i^4 = 1' },
              { kind: 'prose', text: 'Because $i^4 = 1$, the powers cycle with length four and then start again: $i^5 = i$, $i^6 = -1$, and so on for ever.' },
              { kind: 'prose', text: 'That makes any power easy. Divide the exponent by $4$ and keep only the remainder — $i^{23}$ has remainder $3$, so $i^{23} = i^3 = -i$. Only the remainder matters; the quotient contributes a factor of $1$ however large it is.' },
            ),
            ask('imaginary-sum', 2),
          ],
          skillCheck: [ask('imaginary-sum', 2), ask('imaginary-product', 2), ask('imaginary-square', 2)],
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
            ask('complex-part'),
            teach(
              { kind: 'prose', text: 'Complex numbers add component by component: real with real, imaginary with imaginary. The two parts never mix.' },
              { kind: 'display', tex: '(3 + 4i) + (1 + 2i) = 4 + 6i' },
              { kind: 'prose', text: 'Subtraction works the same way, provided the minus sign reaches both parts of the second bracket. $(3 + 4i) - (1 + 2i) = 2 + 2i$, but $(3 + 4i) - (1 - 2i) = 2 + 6i$ — the imaginary part goes *up*, because subtracting a negative adds.' },
              { kind: 'display', tex: '(3 + 4i) - (1 - 2i) = 2 + 6i' },
              { kind: 'prose', text: 'Dropping the sign on the second part of the bracket is the most common slip in the whole topic. Expand the bracket before combining anything and it cannot happen.' },
            ),
            ask('complex-add'),
            ask('complex-part'),
            ask('complex-add', 2),
            teach(
              { kind: 'prose', text: 'Because the parts stay separate, a complex number behaves like a point with two coordinates — which is exactly how it is drawn on the complex plane, real part across and imaginary part up.' },
              { kind: 'display', tex: '3 + 4i \\quad \\longleftrightarrow \\quad (3, 4)' },
              plane([{ re: 3, im: 4, highlight: true }]),
              { kind: 'prose', text: 'Three across, four up — the dot sits where those two rulings meet.' },
              { kind: 'prose', text: 'Adding complex numbers is then the same operation as adding vectors: add the across-parts, add the up-parts. That correspondence is why complex numbers turn up wherever rotation and oscillation do.' },
              { kind: 'prose', text: 'One thing the picture takes away. Points in a plane cannot be put in order, so there is no sensible way to say one complex number is larger than another. $3 + 4i < 5 + 2i$ is not false — it is meaningless.' },
            ),
            ask('complex-part'),
          ],
          skillCheck: [ask('complex-add', 2), ask('complex-part'), ask('imaginary-product', 2)],
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
            ask('complex-quadratic+choice'),
            ask('complex-quadratic'),
            teach(
              { kind: 'prose', text: 'The quadratic formula reaches the same place. The part under the root is negative, so its square root is imaginary rather than undefined.' },
              { kind: 'display', tex: 'x = \\frac{-2 \\pm \\sqrt{-16}}{2} = \\frac{-2 \\pm 4i}{2} = -1 \\pm 2i' },
              { kind: 'prose', text: 'The slip to watch for is dividing only the real part by $2$ and leaving the imaginary part untouched — the $2$ in the denominator divides the whole numerator, both parts alike.' },
              { kind: 'prose', text: 'Checking costs one substitution: $(-1 + 2i)^2 = -3 - 4i$, add $2(-1 + 2i) = -2 + 4i$, add $5$, and the total is zero.' },
            ),
            ask('complex-quadratic', 2),
            ask('sqrt-negative', 2),
            ask('complex-quadratic+choice', 2),
            teach(
              { kind: 'prose', text: 'The two roots are always a conjugate pair when every coefficient is real, because the $\\pm$ sits only on the imaginary part — the real part is fixed regardless of which sign is taken.' },
              { kind: 'display', tex: 'x = -1 + 2i \\quad\\text{and}\\quad x = -1 - 2i' },
              { kind: 'prose', text: 'That fixed real part is the axis of symmetry, $-b/2a$; on the plane the two roots sit mirror-image across the real axis, the same reflection conjugates always give.' },
              { kind: 'prose', text: 'So every quadratic with real coefficients has either two real roots, one repeated real root, or a conjugate pair — the discriminant says which. Level 2 makes more of that conjugate.' },
            ),
            ask('complex-quadratic', 2),
            ask('real-solutions', 2),
          ],
          skillCheck: [ask('complex-quadratic', 2), ask('complex-quadratic'), ask('sqrt-negative', 2)],
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
            ask('complex-multiply'),
            ask('complex-multiply+choice'),
            teach(
              { kind: 'prose', text: 'The same trick makes powers of $i$ cycle. Every fourth power returns to where it started, because multiplying by $i$ four times is multiplying by $i^4 = 1$.' },
              { kind: 'display', tex: 'i^1 = i \\quad i^2 = -1 \\quad i^3 = -i \\quad i^4 = 1' },
              { kind: 'prose', text: 'So for any power, only the remainder on division by $4$ matters. For $i^{31}$, note $31 = 4 \\times 7 + 3$, and the seven complete cycles contribute a factor of $1$.' },
              { kind: 'display', tex: 'i^{31} = i^{3} = -i' },
              { kind: 'prose', text: 'A remainder of $0$ means the power lands exactly on the end of a cycle, giving $1$ rather than $i$. That is the case people get wrong most often, because $i^0$ and $i^4$ both being $1$ feels like one case too few.' },
            ),
            ask('powers-of-i'),
            ask('complex-multiply+choice'),
            ask('powers-of-i', 2),
            teach(
              { kind: 'prose', text: 'Notice what multiplication does geometrically: it scales and rotates. Multiplying by $i$ alone is a quarter turn anticlockwise, which is why four of them return you to the start.' },
              { kind: 'display', tex: '1 \\to i \\to -1 \\to -i \\to 1' },
              { kind: 'prose', text: 'Follow $1$ round that cycle and it traces the four points of a square about the origin. Nothing is being scaled, because $i$ sits at distance $1$ from the origin; it is a pure rotation.' },
              { kind: 'prose', text: 'This is the idea the rest of the course builds on. Multiplying by any complex number scales by its distance from the origin and rotates by its angle, which is why complex numbers describe rotation more neatly than coordinates do.' },
            ),
            ask('complex-multiply', 2),
          ],
          skillCheck: [ask('complex-multiply', 2), ask('powers-of-i', 2), ask('complex-multiply')],
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
            ask('complex-conjugate'),
            ask('complex-conjugate+choice'),
            teach(
              { kind: 'prose', text: 'Multiplying a number by its own conjugate always gives a real result — the imaginary parts cancel exactly.' },
              { kind: 'display', tex: '(a + bi)(a - bi) = a^2 - b^2i^2 = a^2 + b^2' },
              { kind: 'prose', text: 'It is the difference of two squares, and then $i^2 = -1$ turns the subtraction into an addition. That is why the answer is $a^2 + b^2$ rather than the $a^2 - b^2$ you might expect.' },
              { kind: 'prose', text: 'The result is not merely real, it is real and never negative — a sum of two squares. It is zero only when both parts are zero, which is to say only for the number $0$ itself.' },
              { kind: 'prose', text: 'This is the single most useful fact about conjugates, and the next lesson depends on it entirely.' },
            ),
            ask('complex-conjugate', 2),
            ask('complex-conjugate', 2),
            ask('complex-conjugate+choice', 2),
            teach(
              { kind: 'prose', text: 'That real result is the square of the distance from the origin — which is where the next idea, the modulus, comes from.' },
              { kind: 'display', tex: '(3 + 4i)(3 - 4i) = 9 + 16 = 25 = 5^2' },
              { kind: 'prose', text: 'Read as Pythagoras it is obvious: $3$ across and $4$ up puts the point $5$ from the origin, and $25$ is that distance squared. Conjugation is doing geometry, not just tidying signs.' },
            ),
            ask('complex-conjugate'),
          ],
          skillCheck: [ask('complex-conjugate', 2), ask('complex-conjugate'), ask('complex-multiply', 2)],
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
            ask('complex-divide'),
            ask('complex-divide+choice'),
            teach(
              { kind: 'prose', text: 'This is the same move as rationalising a surd denominator. Both use a conjugate to clear something awkward from the bottom of a fraction, and both rely on the difference of two squares to do it.' },
              { kind: 'display', tex: '\\dfrac{1}{\\sqrt{2} + 1} \\times \\dfrac{\\sqrt{2} - 1}{\\sqrt{2} - 1}' },
              { kind: 'prose', text: 'If you can already rationalise a surd, you can divide complex numbers — it is the same technique pointed at a different nuisance.' },
              { kind: 'prose', text: 'Use the conjugate of the *denominator*, not the numerator. Multiplying by the wrong one clears nothing and leaves the fraction worse than it started.' },
            ),
            ask('complex-divide', 2),
            ask('complex-divide', 2),
            teach(
              { kind: 'prose', text: 'With division in hand, every arithmetic operation now works on complex numbers: add, subtract, multiply and divide, with the single exception of dividing by zero.' },
              { kind: 'prose', text: 'That is what makes them a number system rather than a curiosity. Everything from GCSE algebra — expanding, factorising, solving — carries over unchanged, with $i^2 = -1$ as the only addition.' },
              { kind: 'prose', text: 'More than that: every polynomial equation has a solution here. $x^2 = -1$ was the gap that started this, and closing it turns out to close every gap of that kind at once.' },
            ),
            ask('complex-divide+choice', 2),
          ],
          skillCheck: [ask('complex-divide', 2), ask('complex-divide'), ask('complex-conjugate', 2)],
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
            ask('identify-point'),
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
            ask('plot-point'),
            ask('identify-point'),
            ask('plot-point', 2),
            teach(
              { kind: 'prose', text: 'Adding complex numbers is now easy to picture: it shifts a point by the amount of the other, exactly like adding vectors.' },
              { kind: 'display', tex: '(3 + i) + (1 + 2i) = 4 + 3i' },
              { kind: 'prose', text: 'Go $3$ across and $1$ up, then a further $1$ across and $2$ up. Doing the two moves in the other order lands in the same place, which is addition being commutative, drawn.' },
              { kind: 'prose', text: 'Subtraction is the same idea reversed, and $z - w$ is the arrow *from* $w$ *to* $z$. That reading makes the modulus of a difference the distance between two points, which is worth holding on to for the next lesson.' },
            ),
            ask('identify-point', 2),
          ],
          skillCheck: [ask('identify-point', 2), ask('plot-point', 2), ask('identify-point')],
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
              { kind: 'prose', text: 'For a real number the bars mean exactly what they always did: $|{-3}|$ is $3$, whether you read it as absolute value or as distance from the origin along the real axis. The definition extends the old one rather than replacing it.' },
              { kind: 'prose', text: 'Square both parts before adding, and take the root only at the end. $|3 + 4i|$ is $5$, not $7$ — the parts do not simply add.' },
            ),
            ask('modulus'),
            ask('modulus'),
            ask('modulus+choice'),
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
            ask('modulus', 2),
            ask('modulus-steps', 2),
            teach(
              { kind: 'prose', text: 'This connects back to conjugates: multiplying a number by its conjugate gives the modulus squared.' },
              { kind: 'display', tex: 'z\\overline{z} = |z|^2' },
              { kind: 'prose', text: 'Which explains why the division trick works. Multiplying top and bottom by the conjugate turns the denominator into $|z|^2$, a positive real number, and dividing by that is straightforward.' },
              { kind: 'prose', text: 'Moduli also multiply: $|zw| = |z||w|$. Distances scale under multiplication, which is the other half of the "scale and rotate" picture from Level 2.' },
            ),
            ask('modulus-steps+choice', 2),
          ],
          skillCheck: [ask('modulus', 2), ask('modulus'), ask('complex-conjugate', 2)],
        },

        {
          id: 'cn-l3-sqrt',
          title: 'Square Roots of a Complex Number',
          slides: [
            teach(
              { kind: 'prose', text: 'A square root of $z$ is any $w$ with $w^2 = z$. Write $w = a + bi$, square it, and match parts — one complex equation becomes two real ones, the trick promised back in Level 1.' },
              { kind: 'display', tex: '(a + bi)^2 = a^2 - b^2 + 2ab\\,i \\qquad a^2 - b^2 = 3,\\ 2ab = 4' },
              { kind: 'prose', text: 'Two equations in two unknowns, for $z = 3 + 4i$. Guessing $a = 2, b = 1$ works here, but guessing is not a method.' },
            ),
            ask('complex-sqrt'),
            ask('complex-sqrt+choice'),
            ask('complex-sqrt'),
            teach(
              { kind: 'prose', text: 'Here is the method. Squaring a number squares its modulus, so $a^2 + b^2 = |z|$ — a third equation, for free. Add it to the first for $a^2$, subtract for $b^2$.' },
              { kind: 'display', tex: 'a^2 + b^2 = |3 + 4i| = 5 \\qquad a^2 = \\tfrac{5 + 3}{2} = 4,\\ b^2 = \\tfrac{5 - 3}{2} = 1' },
              { kind: 'prose', text: 'The sign of $b$ comes from $2ab$: positive means $a$ and $b$ agree. So $\\sqrt{3 + 4i} = 2 + i$ or $-2 - i$.' },
            ),
            ask('complex-sqrt', 2),
            ask('modulus', 2),
            ask('complex-sqrt+choice', 2),
            teach(
              { kind: 'prose', text: 'Every non-zero complex number has exactly two square roots, negatives of each other — the $\\pm$ of real arithmetic survives.' },
              { kind: 'display', tex: '\\sqrt{3 + 4i} = \\pm(2 + i)' },
              { kind: 'prose', text: '"The" square root, when one is wanted, is the one with positive real part; when the real part is zero, the one with positive imaginary part.' },
              { kind: 'prose', text: 'Check by squaring: $(2 + i)^2 = 4 + 4i + i^2 = 3 + 4i$.' },
              { kind: 'prose', text: 'The same move is what makes the quadratic formula work for complex coefficients, though that is beyond this course.' },
            ),
            ask('complex-sqrt', 2),
            ask('modulus+choice', 2),
          ],
          skillCheck: [ask('complex-sqrt', 2), ask('complex-sqrt'), ask('modulus', 2)],
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
            ask('argument'),
            ask('argument'),
            ask('argument+choice'),
            teach(
              { kind: 'prose', text: 'An angle is only fixed up to whole turns: adding $2\\pi$ points in exactly the same direction. To make the argument a single number rather than infinitely many, one of them is chosen as *the* answer.' },
              { kind: 'prose', text: 'By convention it is kept between $-\\pi$ and $\\pi$, so angles below the real axis are written as negative rather than as large positives.' },
              { kind: 'display', tex: '\\arg(1 - i) = -\\tfrac{\\pi}{4}, \\text{ not } \\tfrac{7\\pi}{4}' },
              { kind: 'prose', text: 'This is called the principal argument. If a calculation throws up an angle outside the range, add or subtract $2\\pi$ until it lands inside — that changes the written answer, not the direction.' },
              { kind: 'prose', text: 'The number $0$ has no argument at all. It sits at the origin and points nowhere, which is the one case the definition cannot cover.' },
            ),
            ask('argument', 2),
            ask('modulus-steps'),
            teach(
              { kind: 'prose', text: 'Scaling a number by a positive real moves it along its own ray, so the argument does not change. Modulus and argument really are independent: one can be altered without disturbing the other.' },
              { kind: 'display', tex: '\\arg(1 + i) = \\arg(5 + 5i) = \\tfrac{\\pi}{4}' },
              { kind: 'prose', text: 'Scaling by a *negative* real is different. It sends the point through the origin to the opposite side, which turns the direction by half a turn and so changes the argument by $\\pi$.' },
              { kind: 'prose', text: 'Between them, modulus and argument describe any complex number completely — and, as the next lesson shows, they are the pair that makes multiplication simple.' },
            ),
            ask('modulus-steps+choice', 2),
          ],
          skillCheck: [ask('argument', 2), ask('argument'), ask('modulus', 2)],
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
            ask('polar-form+choice'),
            ask('polar-form'),
            teach(
              { kind: 'prose', text: 'The other direction. Modulus by Pythagoras, argument from a sketch — never from the calculator alone, since $-2 + 2i$ and $2 - 2i$ share a tangent.' },
              { kind: 'display', tex: '|{-2 + 2i}| = \\sqrt{4 + 4} = 2\\sqrt{2} \\qquad \\arg(-2 + 2i) = \\tfrac{3\\pi}{4}' },
              { kind: 'prose', text: 'Keep the argument principal, between $-\\pi$ and $\\pi$. The two slips: adding the parts for the modulus ($4$, not $2\\sqrt{2}$), and taking the diagonal angle in the wrong quadrant.' },
            ),
            ask('polar-form', 2),
            ask('argument', 2),
            ask('polar-form+choice', 2),
            teach(
              { kind: 'prose', text: 'Why bother — because multiplication is easy in this form and hard in the other.' },
              { kind: 'display', tex: '|zw| = |z||w| \\qquad \\arg(zw) = \\arg z + \\arg w' },
              { kind: 'prose', text: 'Multiplying by $i$ (modulus $1$, argument $\\tfrac{\\pi}{2}$) is the quarter turn from Level 2, now as a formula.' },
              { kind: 'prose', text: 'Every number with the same modulus lies on one circle; every number with the same argument on one ray. The next lesson runs with this.' },
            ),
            ask('polar-form', 2),
            ask('modulus-steps'),
          ],
          skillCheck: [ask('polar-form', 2), ask('polar-form'), ask('argument', 2)],
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
            ),
            ask('complex-power'),
            ask('complex-power'),
            ask('complex-power+choice'),
            teach(
              { kind: 'prose', text: 'Seen in polar terms the pattern is simpler than the algebra suggests: powers multiply the modulus and add the argument.' },
              { kind: 'display', tex: '|z^n| = |z|^n \\qquad \\arg(z^n) = n\\arg(z)' },
              { kind: 'prose', text: 'This is De Moivre’s theorem, and it turns a messy expansion into one multiplication and one addition. It follows directly from multiplication scaling by the modulus and turning by the argument, applied $n$ times.' },
              { kind: 'display', tex: '(1 + i)^{10} = \\left(\\sqrt{2}\\right)^{10} \\text{ at angle } 10 \\times \\tfrac{\\pi}{4}' },
              { kind: 'prose', text: 'So the modulus is $32$ and the angle is $\\frac{10\\pi}{4}$, which is $\\frac{\\pi}{2}$ after removing a full turn. The answer is $32i$, reached without expanding anything.' },
              { kind: 'prose', text: 'The moduli multiply and the arguments add — never the other way round. Adding moduli is the commonest error here, and it comes from forgetting that the two coordinates are doing different jobs.' },
            ),
            ask('complex-power', 2),
            ask('complex-power', 2),
            teach(
              { kind: 'prose', text: 'Because arguments add, repeated powers walk around a circle at a constant angle. If the modulus is $1$ the walk stays on the unit circle for ever, stepping the same amount each time.' },
              { kind: 'display', tex: 'i^1 = i \\to i^2 = -1 \\to i^3 = -i \\to i^4 = 1' },
              { kind: 'prose', text: 'That is the cycle from Level 2, now with a reason attached: $i$ has argument $\\frac{\\pi}{2}$, so four steps make a full turn and land back at the start. The pattern was never a coincidence.' },
              { kind: 'prose', text: 'A modulus above $1$ spirals outwards and one below $1$ spirals inwards. Only on the circle itself do the powers repeat rather than drift.' },
            ),
            ask('complex-power+choice', 2),
          ],
          skillCheck: [ask('complex-power', 2), ask('complex-power'), ask('argument', 2)],
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
            ask('polar-power+choice'),
            ask('polar-power'),
            teach(
              { kind: 'prose', text: 'The argument this produces can leave the principal range, and must be brought back by whole turns of $2\\pi$.' },
              { kind: 'display', tex: '4 \\times \\tfrac{\\pi}{3} = \\tfrac{4\\pi}{3} \\quad\\Rightarrow\\quad \\tfrac{4\\pi}{3} - 2\\pi = -\\tfrac{2\\pi}{3}' },
              { kind: 'prose', text: 'Subtracting $2\\pi$ changes the label, not the direction. A remainder that lands exactly on $\\pi$ is written $\\pi$, not $-\\pi$.' },
            ),
            ask('polar-power', 2),
            ask('complex-power', 2),
            ask('polar-power+choice', 2),
            teach(
              { kind: 'prose', text: 'Check it against expansion once, then trust it.' },
              { kind: 'prose', text: '$(1 + i)^4$: expansion gives $(2i)^2 = -4$; De Moivre gives modulus $(\\sqrt{2})^4 = 4$ at angle $4 \\times \\tfrac{\\pi}{4} = \\pi$, which is $-4$.' },
              { kind: 'display', tex: '(1 + i)^4 = \\left(\\sqrt{2}\\right)^4\\left(\\cos\\pi + i\\sin\\pi\\right) = -4' },
              { kind: 'prose', text: 'When the angle is standard, De Moivre wins; when the number is small and the power is $2$, expanding is fine.' },
              { kind: 'prose', text: 'The $i^n$ cycle from Level 2 is De Moivre with $r = 1$ and $\\theta = \\tfrac{\\pi}{2}$.' },
            ),
            ask('polar-power', 2),
            ask('complex-power+choice', 2),
          ],
          skillCheck: [ask('polar-power', 2), ask('polar-power'), ask('complex-power', 2)],
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
  ],
};
