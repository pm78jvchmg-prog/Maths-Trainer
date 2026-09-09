/**
 * Complex Numbers, Level 1.
 *
 * Lesson rhythm follows the brief: a technique is taught, then practised three
 * times; a second technique is taught, then practised two or three times. Three
 * sealed skill-check questions close the lesson.
 */
import type { Course, SlideRef } from '../types';

const teach = (...blocks: { kind: 'prose' | 'display'; text?: string; tex?: string }[]): SlideRef => ({
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
              { kind: 'prose', text: 'Squaring a real number never gives a negative result. Positives and negatives alike square to something positive.' },
              { kind: 'display', tex: '3^2 = 9 \\qquad (-3)^2 = 9' },
              { kind: 'prose', text: 'So an equation like $x^2 = -1$ has no real solution at all.' },
            ),
            ask('real-solutions'),
            ask('real-solutions'),
            ask('both-roots'),
            teach(
              { kind: 'prose', text: 'Rather than stop there, we define a new number whose square *is* negative. Call it $i$.' },
              { kind: 'display', tex: 'i = \\sqrt{-1} \\qquad i^2 = -1' },
              { kind: 'prose', text: '$i$ might not be a real number, but it obeys the ordinary rules of arithmetic.' },
            ),
            ask('imaginary-square'),
            ask('imaginary-square', 2),
            teach(
              { kind: 'prose', text: 'That one definition unlocks the square root of every negative number: split off the $-1$ and take the root of what remains.' },
              { kind: 'display', tex: '\\sqrt{-25} = \\sqrt{25}\\times\\sqrt{-1} = 5i' },
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
              { kind: 'prose', text: 'Imaginary terms add and subtract exactly like terms in algebra. Treat $i$ the way you would treat $x$.' },
              { kind: 'display', tex: '5i - 2i = 3i' },
            ),
            ask('imaginary-sum'),
            ask('imaginary-sum'),
            ask('imaginary-sum', 2),
            teach(
              { kind: 'prose', text: 'Multiplication is where $i$ stops behaving like $x$. Multiply the coefficients, then replace $i^2$ with $-1$ — so a product of two imaginary numbers is real.' },
              { kind: 'display', tex: '3i \\times 2i = 6i^2 = -6' },
            ),
            ask('imaginary-product'),
            ask('imaginary-product'),
            ask('imaginary-product', 2),
            teach(
              { kind: 'prose', text: 'Watch the pattern: adding imaginary numbers keeps them imaginary, multiplying two of them makes them real.' },
              { kind: 'display', tex: 'i^2 = -1 \\qquad i^3 = -i \\qquad i^4 = 1' },
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
              { kind: 'prose', text: 'Add a real number to an imaginary one and you get a complex number, written $a + bi$.' },
              { kind: 'display', tex: '3 + 4i' },
              { kind: 'prose', text: 'Here $3$ is the real part and $4$ is the imaginary part. The imaginary part is the coefficient of $i$, not $4i$.' },
            ),
            ask('complex-part'),
            ask('complex-part'),
            ask('complex-part'),
            teach(
              { kind: 'prose', text: 'Complex numbers add component by component: real with real, imaginary with imaginary. The two parts never mix.' },
              { kind: 'display', tex: '(3 + 4i) + (1 + 2i) = 4 + 6i' },
            ),
            ask('complex-add'),
            ask('complex-add'),
            ask('complex-add', 2),
            teach(
              { kind: 'prose', text: 'Because the parts stay separate, a complex number behaves like a point with two coordinates — which is exactly how it is drawn on the complex plane.' },
            ),
            ask('complex-part'),
          ],
          skillCheck: [ask('complex-add', 2), ask('complex-part'), ask('imaginary-product', 2)],
        },
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
              { kind: 'prose', text: 'Multiplying complex numbers is ordinary bracket expansion, with one extra step at the end.' },
              { kind: 'display', tex: '(a + bi)(c + di) = ac + adi + bci + bd\\,i^2' },
              { kind: 'prose', text: 'That last term carries $i^2$, which is $-1$ — so it becomes real and joins the real part.' },
            ),
            ask('complex-multiply'),
            ask('complex-multiply'),
            ask('complex-multiply'),
            teach(
              { kind: 'prose', text: 'The same trick makes powers of $i$ cycle. Every fourth power returns to where it started.' },
              { kind: 'display', tex: 'i^1 = i \\quad i^2 = -1 \\quad i^3 = -i \\quad i^4 = 1' },
              { kind: 'prose', text: 'So for any power, only the remainder on division by 4 matters.' },
            ),
            ask('powers-of-i'),
            ask('powers-of-i'),
            ask('powers-of-i', 2),
            teach(
              { kind: 'prose', text: 'Notice what multiplication does geometrically: it scales and rotates. Multiplying by $i$ alone is a quarter turn, which is why four of them return you to the start.' },
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
              { kind: 'prose', text: 'The conjugate of a complex number flips the sign of its imaginary part. It is written with a bar over the top.' },
              { kind: 'display', tex: '\\overline{3 + 4i} = 3 - 4i' },
            ),
            ask('complex-conjugate'),
            ask('complex-conjugate'),
            ask('complex-conjugate'),
            teach(
              { kind: 'prose', text: 'Multiplying a number by its own conjugate always gives a real result — the imaginary parts cancel exactly.' },
              { kind: 'display', tex: '(a + bi)(a - bi) = a^2 + b^2' },
              { kind: 'prose', text: 'This is the single most useful fact about conjugates, and the next lesson depends on it.' },
            ),
            ask('complex-conjugate', 2),
            ask('complex-conjugate', 2),
            ask('complex-conjugate', 2),
            teach(
              { kind: 'prose', text: 'That real result is the square of the distance from the origin — which is where the next idea, the modulus, comes from.' },
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
              { kind: 'prose', text: 'You cannot divide by a complex number directly. The trick is to make the denominator real first.' },
              { kind: 'prose', text: 'Multiply top and bottom by the conjugate of the denominator. The bottom becomes a real number, and the rest is ordinary division.' },
              { kind: 'display', tex: '\\dfrac{1}{1 + i} \\times \\dfrac{1 - i}{1 - i} = \\dfrac{1 - i}{2}' },
            ),
            ask('complex-divide'),
            ask('complex-divide'),
            ask('complex-divide'),
            teach(
              { kind: 'prose', text: 'This is the same move as rationalising a surd denominator. Both use a conjugate to clear something awkward from the bottom of a fraction.' },
              { kind: 'display', tex: '\\dfrac{1}{\\sqrt{2} + 1} \\times \\dfrac{\\sqrt{2} - 1}{\\sqrt{2} - 1}' },
            ),
            ask('complex-divide', 2),
            ask('complex-divide', 2),
            teach(
              { kind: 'prose', text: 'With division in hand, every arithmetic operation now works on complex numbers. They form a complete number system.' },
            ),
            ask('complex-divide', 2),
          ],
          skillCheck: [ask('complex-divide', 2), ask('complex-divide'), ask('complex-conjugate', 2)],
        },
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
              { kind: 'prose', text: 'Every complex number is then a single point on this plane.' },
            ),
            ask('identify-point'),
            ask('identify-point'),
            ask('identify-point'),
            teach(
              { kind: 'prose', text: 'It works the other way too: given a number, you can place it. Move along the real axis first, then up or down the imaginary axis.' },
            ),
            ask('plot-point'),
            ask('plot-point'),
            ask('plot-point', 2),
            teach(
              { kind: 'prose', text: 'Adding complex numbers is now easy to picture: it shifts a point by the amount of the other, exactly like adding vectors.' },
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
              { kind: 'prose', text: 'It is Pythagoras, using the real and imaginary parts as the two shorter sides.' },
            ),
            ask('modulus'),
            ask('modulus'),
            ask('modulus'),
            teach(
              { kind: 'prose', text: 'Because both parts get squared, the signs disappear. A number and its conjugate have the same modulus, and the modulus is never negative.' },
              { kind: 'display', tex: '|3 + 4i| = |3 - 4i| = 5' },
            ),
            ask('modulus', 2),
            ask('modulus', 2),
            teach(
              { kind: 'prose', text: 'This connects back to conjugates: multiplying a number by its conjugate gives the modulus squared.' },
              { kind: 'display', tex: 'z\\overline{z} = |z|^2' },
            ),
            ask('modulus', 2),
          ],
          skillCheck: [ask('modulus', 2), ask('modulus'), ask('complex-conjugate', 2)],
        },
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
              { kind: 'prose', text: 'A point on the plane needs two numbers to pin it down. The modulus gives distance; the argument gives direction.' },
              { kind: 'prose', text: 'The argument is the angle from the positive real axis, measured anticlockwise in radians.' },
              { kind: 'display', tex: '\\arg(1 + i) = \\tfrac{\\pi}{4}' },
            ),
            ask('argument'),
            ask('argument'),
            ask('argument'),
            teach(
              { kind: 'prose', text: 'By convention the argument is kept between $-\\pi$ and $\\pi$, so angles below the real axis are written as negative rather than as large positives.' },
              { kind: 'display', tex: '\\arg(1 - i) = -\\tfrac{\\pi}{4}, \\text{ not } \\tfrac{7\\pi}{4}' },
            ),
            ask('argument', 2),
            ask('argument', 2),
            teach(
              { kind: 'prose', text: 'Scaling a number moves it along its own ray, so the argument does not change. Modulus and argument really are independent.' },
            ),
            ask('argument', 2),
          ],
          skillCheck: [ask('argument', 2), ask('argument'), ask('modulus', 2)],
        },

        {
          id: 'cn-l4-powers',
          title: 'Powers',
          slides: [
            teach(
              { kind: 'prose', text: 'Raising a complex number to a power means repeated multiplication — and each multiplication rotates and scales.' },
              { kind: 'display', tex: '(1 + i)^2 = 2i' },
            ),
            ask('complex-power'),
            ask('complex-power'),
            ask('complex-power'),
            teach(
              { kind: 'prose', text: 'Seen in polar terms the pattern is simpler than the algebra suggests: powers multiply the modulus and add the argument.' },
              { kind: 'display', tex: '|z^n| = |z|^n \\qquad \\arg(z^n) = n\\arg(z)' },
              { kind: 'prose', text: 'This is De Moivre’s theorem, and it turns a messy expansion into one multiplication and one addition.' },
            ),
            ask('complex-power', 2),
            ask('complex-power', 2),
            teach(
              { kind: 'prose', text: 'Because arguments add, repeated powers walk around a circle at a constant angle — which is why powers of a number on the unit circle eventually return to where they began.' },
            ),
            ask('complex-power', 2),
          ],
          skillCheck: [ask('complex-power', 2), ask('complex-power'), ask('argument', 2)],
        },
      ],
    },
  ],
};
