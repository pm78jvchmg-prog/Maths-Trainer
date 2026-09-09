/**
 * Differentiation.
 *
 * Same rhythm as the complex course: a technique is taught, then practised
 * three times; a second technique is taught, then practised two or three
 * times. Three sealed skill-check questions close each lesson.
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

export const differentiation: Course = {
  id: 'differentiation',
  title: 'Differentiation',
  blurb: 'Rates of change, from the power rule to the chain rule.',
  levels: [
    {
      id: 'df-l1',
      title: 'The Power Rule',
      lessons: [
        {
          id: 'df-l1-power',
          title: 'Differentiating Powers',
          slides: [
            teach(
              {
                kind: 'prose',
                text: 'A derivative measures how fast something changes. For a curve, it is the gradient of the tangent at a point — and unlike a straight line, that gradient is different everywhere.',
              },
              {
                kind: 'prose',
                text: 'Rather than compute a limit every time, one rule handles every power of $x$: bring the power down as a multiplier, then reduce the power by one.',
              },
              { kind: 'display', tex: '\\frac{d}{dx}\\left(ax^{n}\\right) = anx^{n-1}' },
            ),
            ask('power-rule'),
            ask('power-rule'),
            ask('power-rule'),
            teach(
              {
                kind: 'prose',
                text: 'The rule does not care whether the power is large, or negative. A negative power still comes down as a multiplier and still decreases by one — which makes it more negative.',
              },
              { kind: 'display', tex: '\\frac{d}{dx}\\left(x^{-2}\\right) = -2x^{-3}' },
              {
                kind: 'prose',
                text: 'Watch the sign: differentiating $x^{-2}$ gives a negative result, because increasing $x$ makes $x^{-2}$ smaller.',
              },
            ),
            ask('power-rule', 2),
            ask('power-rule', 2),
            teach(
              {
                kind: 'prose',
                text: 'Two special cases fall straight out of the rule. Since $x = x^{1}$, differentiating gives $1x^{0}$, which is just $1$. And a constant is $ax^{0}$, so its derivative is $0$ — a flat line has no gradient.',
              },
              { kind: 'display', tex: '\\frac{d}{dx}(x) = 1 \\qquad \\frac{d}{dx}(c) = 0' },
            ),
            ask('power-rule'),
            ask('power-rule', 2),
          ],
          skillCheck: [ask('power-rule', 2), ask('power-rule'), ask('power-rule', 2)],
        },

        {
          id: 'df-l1-sums',
          title: 'Sums and Constants',
          slides: [
            teach(
              {
                kind: 'prose',
                text: 'Differentiation works term by term. To differentiate a sum, differentiate each piece and add the results — nothing interacts.',
              },
              {
                kind: 'display',
                tex: '\\frac{d}{dx}\\left(3x^{2} + 5x\\right) = 6x + 5',
              },
            ),
            ask('sum-rule'),
            ask('sum-rule'),
            ask('sum-rule'),
            teach(
              {
                kind: 'prose',
                text: 'Constant terms vanish. Adding $7$ to a function shifts its graph up without changing its steepness anywhere, so it cannot change the gradient.',
              },
              { kind: 'display', tex: '\\frac{d}{dx}\\left(x^{2} + 7\\right) = 2x' },
            ),
            ask('sum-rule', 2),
            ask('sum-rule', 2),
            teach(
              {
                kind: 'prose',
                text: 'Because the derivative is itself a function of $x$, you can ask for the gradient at a particular point by substituting a value in afterwards.',
              },
              { kind: 'display', tex: "f(x) = x^{2} \\implies f'(3) = 6" },
            ),
            ask('evaluate-derivative'),
            ask('evaluate-derivative'),
          ],
          skillCheck: [ask('sum-rule', 2), ask('evaluate-derivative'), ask('sum-rule')],
        },
      ],
    },

    {
      id: 'df-l2',
      title: 'Products and Quotients',
      lessons: [
        {
          id: 'df-l2-product',
          title: 'The Product Rule',
          slides: [
            teach(
              {
                kind: 'prose',
                text: 'The derivative of a product is *not* the product of the derivatives. That guess fails on the simplest example: $x \\times x$ would give $1 \\times 1 = 1$, when the answer is $2x$.',
              },
              {
                kind: 'prose',
                text: 'Instead, differentiate each factor in turn and keep the other one intact.',
              },
              { kind: 'display', tex: "\\frac{d}{dx}(uv) = u'v + uv'" },
            ),
            ask('product-rule'),
            ask('product-rule'),
            ask('product-rule'),
            teach(
              {
                kind: 'prose',
                text: 'It helps to write down $u$, $v$, $u\'$ and $v\'$ before assembling anything. Most product-rule mistakes are bookkeeping, not calculus.',
              },
              {
                kind: 'display',
                tex: 'u = 2x + 1, \\quad v = x^{2}, \\quad u\' = 2, \\quad v\' = 2x',
              },
            ),
            ask('product-rule', 2),
            ask('product-rule', 2),
            teach(
              {
                kind: 'prose',
                text: 'You could expand the brackets first and use the sum rule instead. For two short factors that is often quicker — but it stops being an option as soon as a factor is something like $\\sin x$.',
              },
            ),
            ask('product-rule', 2),
          ],
          skillCheck: [ask('product-rule', 2), ask('product-rule'), ask('sum-rule', 2)],
        },

        {
          id: 'df-l2-quotient',
          title: 'The Quotient Rule',
          slides: [
            teach(
              {
                kind: 'prose',
                text: 'For a fraction, the numerator and denominator play different roles, so unlike the product rule the order matters and there is a minus sign.',
              },
              {
                kind: 'display',
                tex: "\\frac{d}{dx}\\left(\\frac{u}{v}\\right) = \\frac{u'v - uv'}{v^{2}}",
              },
              {
                kind: 'prose',
                text: 'The numerator starts with the derivative of the top. Swapping those two terms is the most common slip.',
              },
            ),
            ask('quotient-rule'),
            ask('quotient-rule'),
            ask('quotient-rule'),
            teach(
              {
                kind: 'prose',
                text: 'The denominator gets squared, so it is never negative. Any sign in the answer comes from the numerator alone.',
              },
              {
                kind: 'prose',
                text: 'Note also that the derivative is undefined wherever $v = 0$ — exactly where the original function has a vertical asymptote.',
              },
            ),
            ask('quotient-rule', 2),
            ask('quotient-rule', 2),
            teach(
              {
                kind: 'prose',
                text: 'A quotient is just a product with a negative power, so the product rule would work too. The quotient rule simply saves you from rearranging afterwards.',
              },
            ),
            ask('quotient-rule', 2),
          ],
          skillCheck: [ask('quotient-rule', 2), ask('quotient-rule'), ask('product-rule', 2)],
        },
      ],
    },

    {
      id: 'df-l3',
      title: 'The Chain Rule',
      lessons: [
        {
          id: 'df-l3-chain',
          title: 'Composed Functions',
          slides: [
            teach(
              {
                kind: 'prose',
                text: 'When one function sits inside another, differentiate the outer function as usual, then multiply by the derivative of what was inside.',
              },
              { kind: 'display', tex: "\\frac{d}{dx}f(g(x)) = f'(g(x)) \\cdot g'(x)" },
              {
                kind: 'prose',
                text: 'That final multiplier is what people forget. Without it, $(3x+2)^{4}$ would differentiate as though the inside were plain $x$.',
              },
            ),
            ask('chain-rule'),
            ask('chain-rule'),
            ask('chain-rule'),
            teach(
              {
                kind: 'prose',
                text: 'A useful check: if the inside is linear, the extra factor is just its coefficient. If the inside is a quadratic, the factor is itself a function of $x$.',
              },
              {
                kind: 'display',
                tex: '\\frac{d}{dx}\\left(x^{2}+1\\right)^{3} = 3\\left(x^{2}+1\\right)^{2} \\cdot 2x',
              },
            ),
            ask('chain-rule', 2),
            ask('chain-rule', 2),
            teach(
              {
                kind: 'prose',
                text: 'The chain rule is the one that unlocks everything else. Combined with the product and quotient rules, it handles essentially any function you can write down.',
              },
            ),
            ask('chain-rule', 2),
          ],
          skillCheck: [ask('chain-rule', 2), ask('chain-rule'), ask('product-rule', 2)],
        },
      ],
    },

    {
      id: 'df-l4',
      title: 'Standard Derivatives',
      lessons: [
        {
          id: 'df-l4-trig',
          title: 'Trigonometric Functions',
          slides: [
            teach(
              {
                kind: 'prose',
                text: 'Sine and cosine differentiate into each other, in a four-step cycle that returns to where it started.',
              },
              {
                kind: 'display',
                tex: '\\frac{d}{dx}\\sin x = \\cos x \\qquad \\frac{d}{dx}\\cos x = -\\sin x',
              },
              {
                kind: 'prose',
                text: 'The minus sign on cosine is not arbitrary: at $x = 0$ the cosine curve is turning downwards, so its gradient must be negative just after.',
              },
            ),
            ask('trig-derivative'),
            ask('trig-derivative'),
            ask('trig-derivative'),
            teach(
              {
                kind: 'prose',
                text: 'With anything other than a bare $x$ inside, the chain rule applies as usual — multiply by the derivative of the inside.',
              },
              { kind: 'display', tex: '\\frac{d}{dx}\\sin(3x) = 3\\cos(3x)' },
              {
                kind: 'prose',
                text: 'These formulas hold only in radians. In degrees an awkward constant appears, which is the practical reason radians are the default in calculus.',
              },
            ),
            ask('trig-derivative', 2),
            ask('trig-derivative', 2),
            teach(
              {
                kind: 'prose',
                text: 'Differentiating four times returns you to the original function, which is why sine and cosine describe things that oscillate forever.',
              },
            ),
            ask('trig-derivative', 2),
          ],
          skillCheck: [ask('trig-derivative', 2), ask('trig-derivative'), ask('chain-rule', 2)],
        },

        {
          id: 'df-l4-exp',
          title: 'Exponentials and Logarithms',
          slides: [
            teach(
              {
                kind: 'prose',
                text: '$e^{x}$ is the function that is its own derivative. Its gradient at every point equals its height at that point, which is what makes $e$ the natural base.',
              },
              { kind: 'display', tex: '\\frac{d}{dx}e^{x} = e^{x}' },
            ),
            ask('exp-log-derivative'),
            ask('exp-log-derivative'),
            ask('exp-log-derivative'),
            teach(
              {
                kind: 'prose',
                text: 'The natural logarithm is its inverse, and differentiates to something with no logarithm in it at all.',
              },
              { kind: 'display', tex: '\\frac{d}{dx}\\ln x = \\frac{1}{x}' },
              {
                kind: 'prose',
                text: 'A surprising consequence: $\\ln(kx)$ also differentiates to $\\frac{1}{x}$, whatever $k$ is — multiplying inside a log only adds a constant, and constants vanish.',
              },
            ),
            ask('exp-log-derivative', 2),
            ask('exp-log-derivative', 2),
            teach(
              {
                kind: 'prose',
                text: 'With powers, products, quotients, chains, trigonometric functions, exponentials and logarithms, you can now differentiate essentially anything built from them.',
              },
            ),
            ask('exp-log-derivative', 2),
          ],
          skillCheck: [
            ask('exp-log-derivative', 2),
            ask('trig-derivative', 2),
            ask('evaluate-derivative'),
          ],
        },
      ],
    },
  ],
};
