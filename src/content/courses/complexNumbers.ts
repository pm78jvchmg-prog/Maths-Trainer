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
  ],
};
