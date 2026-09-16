/**
 * Differentiation.
 *
 * Same rhythm as the complex course: a technique is taught, then practised
 * three times; a second technique is taught, then practised two or three
 * times. Three sealed skill-check questions close each lesson.
 */
import type { Block, Course, SlideRef } from '../types';
import { plotSvg, quadratic } from '../figures';

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
 * The curve a slide is talking about — a tangent, a gradient, a rate.
 *
 * This course teaches differentiation almost entirely in symbols: "the
 * tangent there has gradient 6" and "its gradient equals its height" both
 * describe a picture that was never drawn. Defaults suit a single curve with
 * a tangent line picked out.
 */
const graph = (
  opts: Omit<Parameters<typeof plotSvg>[0], 'label'> & { label?: string },
): Block => ({
  kind: 'diagram',
  svg: plotSvg({ label: 'A curve and its tangent', ...opts }),
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
              {
                kind: 'prose',
                text: 'So $3x^{4}$ becomes $12x^{3}$: the $4$ comes down to multiply the $3$, and the power drops to $3$. Two separate things happen to two separate parts, and doing only one of them is the usual error.',
              },
              {
                kind: 'prose',
                text: 'The rule replaces a limit calculation you would otherwise have to do from scratch every time. It is worth knowing that the limit is what sits underneath it, even though you will not compute one again in this course.',
              },
            ),
            ask('power-rule'),
            ask('power-rule'),
            ask('power-rule+choice'),
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
              {
                kind: 'prose',
                text: 'Fractional powers behave the same way, which is how roots are differentiated. Write $\\sqrt{x}$ as $x^{1/2}$ and the rule gives $\\frac{1}{2}x^{-1/2}$ without any special case.',
              },
              { kind: 'display', tex: '\\frac{d}{dx}\\sqrt{x} = \\tfrac{1}{2}x^{-1/2} = \\frac{1}{2\\sqrt{x}}' },
              {
                kind: 'prose',
                text: 'Converting to index form before differentiating is almost always the right first move. A root or a fraction that has not been rewritten is where most power-rule questions go wrong.',
              },
            ),
            ask('power-rule', 2),
            ask('df-evaluate-steps'),
            teach(
              {
                kind: 'prose',
                text: 'Two special cases fall straight out of the rule. Since $x = x^{1}$, differentiating gives $1x^{0}$, which is just $1$. And a constant is $ax^{0}$, so its derivative is $0$ — a flat line has no gradient.',
              },
              { kind: 'display', tex: '\\frac{d}{dx}(x) = 1 \\qquad \\frac{d}{dx}(c) = 0' },
              {
                kind: 'prose',
                text: 'Both agree with the picture. $y = x$ is a straight line of gradient $1$ everywhere, and $y = c$ is a horizontal line with no gradient at all.',
              },
              {
                kind: 'prose',
                text: 'Neither is a rule to memorise separately — they are the power rule applied to $x^{1}$ and $x^{0}$. Whenever a case looks special, check whether writing it as a power makes it ordinary.',
              },
            ),
            ask('power-rule+choice'),
            ask('df-evaluate-steps+choice'),
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
              {
                kind: 'prose',
                text: 'Subtraction is no different, since $a - b$ is $a + (-b)$. Deal with each term on its own and carry its sign along with it.',
              },
              {
                kind: 'prose',
                text: 'This independence is worth appreciating, because it is exactly what fails for products and quotients. There, the pieces genuinely interact, and the next two lessons exist to say how.',
              },
            ),
            ask('sum-rule'),
            ask('sum-rule'),
            ask('sum-rule+choice'),
            teach(
              {
                kind: 'prose',
                text: 'Constant terms vanish. Adding $7$ to a function shifts its graph up without changing its steepness anywhere, so it cannot change the gradient.',
              },
              { kind: 'display', tex: '\\frac{d}{dx}\\left(x^{2} + 7\\right) = 2x' },
              {
                kind: 'prose',
                text: 'Every curve $y = x^{2} + c$ therefore has the same derivative, whatever $c$ is. They are the same shape at different heights, and height is not steepness.',
              },
              {
                kind: 'prose',
                text: 'A constant *multiplier* is a different matter and does survive: $\\frac{d}{dx}(5x^{2}) = 10x$. Multiplying stretches the curve vertically and so does change its gradient, where adding merely lifts it.',
              },
            ),
            ask('sum-rule', 2),
            ask('sum-rule', 2),
            teach(
              {
                kind: 'prose',
                text: 'Because the derivative is itself a function of $x$, you can ask for the gradient at a particular point by substituting a value in afterwards.',
              },
              { kind: 'display', tex: "f(x) = x^{2} \\implies f'(x) = 2x \\implies f'(3) = 6" },
              {
                kind: 'prose',
                text: 'The order matters. Differentiate first, then substitute. Putting $x = 3$ in first gives the constant $9$, whose derivative is $0$ — a number has no gradient, so the information you wanted is destroyed before you can ask for it.',
              },
              {
                kind: 'prose',
                text: 'Read the answer as a rate: at $x = 3$ the curve $y = x^{2}$ is climbing six units of height for every one across. The tangent there has gradient $6$, and a moment later the gradient is something else.',
              },
              // f(x) = x^2, tangent at x = 3 has gradient 6 — the exact
              // numbers the paragraph above just computed.
              graph({
                xMin: -2,
                xMax: 5,
                curves: [
                  { f: quadratic(1, 0, 0) },
                  { f: (x) => 6 * x - 9, dashed: true, accent: true },
                ],
                marks: [{ x: 3, y: 9 }],
                yMin: -6,
                yMax: 18,
                label: 'y = x^2 with its tangent line at x = 3',
              }),
              {
                kind: 'prose',
                text: 'The dashed line is that tangent, touching the curve only at the ringed point $(3, 9)$ — its slope is the $6$ just calculated.',
              },
              {
                kind: 'prose',
                text: 'The sign carries meaning too. A negative derivative means the curve is falling at that point, and a derivative of zero means it is momentarily flat — which is how stationary points are found.',
              },
            ),
            ask('df-evaluate-steps'),
            ask('df-evaluate-steps+choice'),
          ],
          skillCheck: [ask('sum-rule', 2), ask('evaluate-derivative'), ask('sum-rule')],
        },

        {
          id: 'df-l1-index',
          title: 'Roots and Fractions',
          slides: [
            teach(
              {
                kind: 'prose',
                text: 'A fraction with $x$ underneath, and a root, are both powers of $x$ in disguise. The power rule already covers them — it just needs the expression rewritten first.',
              },
              { kind: 'display', tex: '\\frac{1}{x^{3}} = x^{-3} \\qquad \\sqrt{x} = x^{1/2}' },
              {
                kind: 'prose',
                text: 'Rewrite in index form, apply the rule, then write the result back the way it started. Skipping the first step is where most of these questions go wrong.',
              },
              {
                kind: 'prose',
                text: 'For example, $\\frac{4}{x^{3}} = 4x^{-3}$ differentiates to $-12x^{-4}$, which is $-\\frac{12}{x^{4}}$ written back as a fraction.',
              },
            ),
            ask('df-index-form'),
            ask('df-index-form'),
            ask('df-index-form+choice'),
            teach(
              {
                kind: 'prose',
                text: 'Watch the sign on a reciprocal. A negative power comes down as a negative multiplier, and the power itself becomes *more* negative, not less.',
              },
              { kind: 'display', tex: '\\frac{d}{dx}\\left(\\frac{2}{x^{3}}\\right) = -6x^{-4} = -\\frac{6}{x^{4}}' },
              {
                kind: 'prose',
                text: 'The power goes from $-3$ to $-4$, never to $-2$ — reducing by one always moves further from zero here. A positive answer for a reciprocal is wrong on sight: for positive $x$, $\\frac{1}{x^{n}}$ falls as $x$ grows, so its gradient there is negative.',
              },
            ),
            ask('df-index-form', 2),
            ask('df-index-form+choice', 2),
            teach(
              {
                kind: 'prose',
                text: 'Roots work the same way once rewritten. $\\sqrt{x} = x^{1/2}$ gives $\\tfrac{1}{2}x^{-1/2}$; $\\frac{1}{\\sqrt{x}} = x^{-1/2}$ gives $-\\tfrac{1}{2}x^{-3/2}$.',
              },
              { kind: 'display', tex: '\\frac{d}{dx}\\left(4\\sqrt{x}\\right) = 2x^{-1/2} = \\frac{2}{\\sqrt{x}}' },
              {
                kind: 'prose',
                text: 'Either the index-form answer or the answer written back as a fraction under a root is accepted — the checker compares values, not the shape they are written in.',
              },
            ),
            ask('df-index-form', 2),
            ask('power-rule', 2),
          ],
          skillCheck: [ask('df-index-form', 2), ask('df-index-form'), ask('power-rule', 2)],
        },
      ],
      levelCheck: [
        ask('power-rule', 2),
        ask('sum-rule', 2),
        ask('evaluate-derivative', 2),
        ask('df-index-form', 2),
        ask('power-rule', 2),
        ask('sum-rule', 2),
        ask('evaluate-derivative', 2),
        ask('df-index-form', 2),
        ask('power-rule', 2),
        ask('sum-rule', 2),
        ask('evaluate-derivative', 2),
        ask('df-index-form', 2),
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
                text: 'Instead, differentiate each factor in turn and keep the other one intact, then add the two results.',
              },
              { kind: 'display', tex: "\\frac{d}{dx}(uv) = u'v + uv'" },
              {
                kind: 'prose',
                text: 'Each term differentiates exactly one of the factors and leaves the other alone. Checking that every term contains one dashed and one undashed letter catches most mistakes on sight.',
              },
              { kind: 'display', tex: "\\frac{d}{dx}(uv) = u'v + uv'" },
            ),
            ask('product-rule'),
            ask('product-rule'),
            ask('product-rule+choice'),
            teach(
              {
                kind: 'prose',
                text: 'It helps to write down $u$, $v$, $u\'$ and $v\'$ before assembling anything. Most product-rule mistakes are bookkeeping, not calculus.',
              },
              {
                kind: 'display',
                tex: 'u = 2x + 1, \\quad v = x^{2}, \\quad u\' = 2, \\quad v\' = 2x',
              },
              {
                kind: 'prose',
                text: 'Then assemble: $u\'v + uv\'$ is $2x^{2} + (2x + 1)2x$, which tidies to $6x^{2} + 2x$.',
              },
              {
                kind: 'prose',
                text: 'Which factor you call $u$ makes no difference to the answer, since the rule is symmetric in the two. Choosing the messier one as $u$ sometimes keeps the algebra tidier, but nothing is riding on it.',
              },
            ),
            ask('product-rule', 2),
            ask('product-rule', 2),
            teach(
              {
                kind: 'prose',
                text: 'You could expand the brackets first and use the sum rule instead. For two short factors that is often quicker — but it stops being an option as soon as a factor is something like $\\sin x$.',
              },
              {
                kind: 'prose',
                text: 'When both routes are open they must agree, and checking that they do is a good way to catch a slip. Differentiate $(2x + 1)x^{2}$ both ways: expanding gives $2x^{3} + x^{2}$ and so $6x^{2} + 2x$, and the product rule gives $2x^{2} + (2x + 1)2x$, which is the same thing.',
              },
              { kind: 'display', tex: '2x^{2} + (2x + 1)2x = 6x^{2} + 2x' },
              {
                kind: 'prose',
                text: 'Expanding is not always possible and rarely stays quicker. Three factors, a fractional power, or anything transcendental and the product rule is the only route — so it is worth being fluent in it even where a shortcut exists.',
              },
            ),
            ask('product-rule+choice', 2),
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
              { kind: 'display', tex: "\\frac{d}{dx}\\left(\\frac{u}{v}\\right) = \\frac{u'v - uv'}{v^{2}}" },
              {
                kind: 'prose',
                text: 'Swapping them negates the whole answer, which is a hard error to spot afterwards because the expression still looks plausible. "Derivative of the top first" is the phrase worth fixing in memory.',
              },
            ),
            ask('quotient-rule'),
            ask('quotient-rule'),
            ask('quotient-rule+choice'),
            teach(
              {
                kind: 'prose',
                text: 'The denominator gets squared, so it is never negative. Any sign in the answer comes from the numerator alone.',
              },
              {
                kind: 'prose',
                text: 'Note also that the derivative is undefined wherever $v = 0$ — exactly where the original function has a vertical asymptote.',
              },
              {
                kind: 'prose',
                text: 'That is reassuring rather than awkward. The function has no value there, so it can hardly have a gradient, and a rule that produced one anyway would be the thing to worry about.',
              },
              {
                kind: 'prose',
                text: 'Do not expand $v^{2}$ unless something will cancel. Leaving the denominator factorised keeps the asymptotes visible and usually makes the next step shorter.',
              },
            ),
            ask('quotient-rule', 2),
            ask('quotient-rule', 2),
            teach(
              {
                kind: 'prose',
                text: 'A quotient is just a product with a negative power, so the product rule would work too. The quotient rule simply saves you from rearranging afterwards.',
              },
              { kind: 'display', tex: '\\frac{u}{v} = uv^{-1}' },
              {
                kind: 'prose',
                text: 'Differentiating that with the product and chain rules gives $u\'v^{-1} - uv\'v^{-2}$, and putting it over a common denominator of $v^{2}$ recovers the quotient rule exactly. It is not a separate fact to trust, but a rearrangement of two you already have.',
              },
              {
                kind: 'prose',
                text: 'Which route to take is a matter of what the answer is for. The quotient rule lands directly in the tidy single-fraction form; the product route often leaves something easier to differentiate again.',
              },
            ),
            ask('quotient-rule+choice', 2),
          ],
          skillCheck: [ask('quotient-rule', 2), ask('quotient-rule'), ask('product-rule', 2)],
        },
      ],
      levelCheck: [
        ask('product-rule', 2),
        ask('quotient-rule', 2),
        ask('sum-rule', 2),
        ask('product-rule', 2),
        ask('quotient-rule', 2),
        ask('sum-rule', 2),
        ask('product-rule', 2),
        ask('quotient-rule', 2),
        ask('sum-rule', 2),
        ask('product-rule', 2),
        ask('quotient-rule', 2),
        ask('sum-rule', 2),
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
              { kind: 'display', tex: '\\frac{d}{dx}(3x+2)^{4} = 4(3x+2)^{3} \\cdot 3 = 12(3x+2)^{3}' },
              {
                kind: 'prose',
                text: 'The reason is that the inside is changing three times as fast as $x$ is, so the whole function changes three times as fast too. The extra factor is a rate, not a bookkeeping artefact.',
              },
            ),
            ask('chain-rule'),
            ask('chain-rule'),
            ask('chain-rule+choice'),
            teach(
              {
                kind: 'prose',
                text: 'A useful check: if the inside is linear, the extra factor is just its coefficient. If the inside is a quadratic, the factor is itself a function of $x$.',
              },
              {
                kind: 'display',
                tex: '\\frac{d}{dx}\\left(x^{2}+1\\right)^{3} = 3\\left(x^{2}+1\\right)^{2} \\cdot 2x',
              },
              {
                kind: 'prose',
                text: 'Notice what stays untouched. The inside is copied into the answer exactly as it was — it is the *outer* function that loses a power, never the bracket contents.',
              },
              {
                kind: 'prose',
                text: 'Differentiating the inside as well as the outside, and writing $3(2x)^{2}\\cdot 2x$, is the other classic error. Bring the inside down as a multiplier; leave the copy inside the bracket alone.',
              },
            ),
            ask('chain-rule', 2),
            ask('chain-rule', 2),
            teach(
              {
                kind: 'prose',
                text: 'The chain rule is the one that unlocks everything else. Combined with the product and quotient rules, it handles essentially any function you can write down.',
              },
              {
                kind: 'prose',
                text: 'The way to use it is to name the layers before touching anything. For $\\sqrt{3x^{2} + 1}$ the outer layer is "square root of something" and the inner is $3x^{2} + 1$, so the derivative is $\\frac{1}{2\\sqrt{3x^{2}+1}}$ times $6x$.',
              },
              { kind: 'display', tex: '\\frac{d}{dx}\\sqrt{3x^{2}+1} = \\frac{6x}{2\\sqrt{3x^{2}+1}} = \\frac{3x}{\\sqrt{3x^{2}+1}}' },
              {
                kind: 'prose',
                text: 'Layers can nest more than two deep, and then the factors simply keep multiplying — one for each layer, working inwards. Peel them one at a time rather than trying to see the whole answer at once.',
              },
            ),
            ask('chain-rule+choice', 2),
          ],
          skillCheck: [ask('chain-rule', 2), ask('chain-rule'), ask('product-rule', 2)],
        },

        {
          id: 'df-l3-roots',
          title: 'Roots and Reciprocals of Brackets',
          slides: [
            teach(
              {
                kind: 'prose',
                text: 'A root of a bracket is that bracket to the power $\\tfrac{1}{2}$, so the chain rule applies exactly as it does anywhere else.',
              },
              {
                kind: 'display',
                tex: '\\frac{d}{dx}\\sqrt{2x + 3} = \\tfrac{1}{2}\\left(2x + 3\\right)^{-1/2} \\times 2 = \\frac{1}{\\sqrt{2x + 3}}',
              },
              {
                kind: 'prose',
                text: 'Two things have to appear: the $\\tfrac{1}{2}$ from differentiating the outer power, and the $2$ that is the derivative of what is inside. Dropping either one is the error to watch for.',
              },
            ),
            ask('df-chain-root'),
            ask('df-chain-root'),
            ask('df-chain-root+choice'),
            teach(
              {
                kind: 'prose',
                text: 'A reciprocal of a bracket to a power $n$ is that bracket to the power $-n$, so it differentiates the same way a negative power always has.',
              },
              {
                kind: 'display',
                tex: '\\frac{d}{dx}\\left(\\frac{1}{\\left(3x - 1\\right)^{2}}\\right) = -2\\left(3x - 1\\right)^{-3} \\times 3 = -\\frac{6}{\\left(3x - 1\\right)^{3}}',
              },
              {
                kind: 'prose',
                text: 'Watch two things: the minus sign that comes down with the power, and the power in the denominator, which goes *up* by one rather than down.',
              },
            ),
            ask('df-chain-root', 2),
            ask('df-chain-root', 2),
            teach(
              {
                kind: 'prose',
                text: 'If the coefficient inside the bracket were $1$, the chain rule factor would be $1$ too, and the step would look as though it were not there — which is why it is worth writing down even when it changes nothing.',
              },
              {
                kind: 'display',
                tex: '\\frac{d}{dx}\\left(\\frac{1}{2x + 3}\\right) = -\\frac{2}{\\left(2x + 3\\right)^{2}}',
              },
              {
                kind: 'prose',
                text: '$\\frac{1}{2x+3}$ can also be differentiated with the quotient rule, treating it as a quotient with numerator $1$ and denominator $2x+3$. The two routes must agree, and checking that they do is a good way to catch a slip.',
              },
            ),
            ask('df-chain-root+choice', 2),
            ask('chain-rule', 2),
          ],
          skillCheck: [ask('df-chain-root', 2), ask('df-chain-root'), ask('chain-rule', 2)],
        },
      ],
      levelCheck: [
        ask('chain-rule', 2),
        ask('df-chain-root', 2),
        ask('product-rule', 2),
        ask('quotient-rule', 2),
        ask('chain-rule', 2),
        ask('df-chain-root', 2),
        ask('product-rule', 2),
        ask('quotient-rule', 2),
        ask('chain-rule', 2),
        ask('df-chain-root', 2),
        ask('product-rule', 2),
        ask('quotient-rule', 2),
        ask('chain-rule', 2),
        ask('df-chain-root', 2),
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
                text: 'The minus sign on cosine is not arbitrary: at $x = 0$ the cosine curve is at its peak and about to fall, so its gradient must be negative just after.',
              },
              {
                kind: 'prose',
                text: 'The same reasoning fixes the other one. At $x = 0$ the sine curve is climbing at its steepest, and $\\cos 0 = 1$ is exactly that gradient — the largest value cosine ever takes.',
              },
              {
                kind: 'prose',
                text: 'If the sign will not stay in memory, sketch the curve and read the gradient off it. That takes a few seconds and is more reliable than a mnemonic.',
              },
              // cos peaks at x = 0; sin passes through 0 there with gradient
              // cos(0) = 1, its steepest — the two claims just made.
              graph({
                xMin: -3.2,
                xMax: 4.2,
                curves: [
                  { f: Math.cos, accent: true },
                  { f: Math.sin, dashed: true },
                ],
                verticals: [{ x: 0 }],
                marks: [
                  { x: 0, y: 1 },
                  { x: 0, y: 0 },
                ],
                yMin: -1.3,
                yMax: 1.3,
                label: 'cos x and sin x near x = 0',
              }),
              {
                kind: 'prose',
                text: 'The solid curve is $\\cos x$, at its peak exactly at $x = 0$. The dashed curve is $\\sin x$, crossing $0$ there as steeply as it ever climbs.',
              },
            ),
            ask('trig-derivative'),
            ask('trig-derivative'),
            ask('trig-derivative+choice'),
            teach(
              {
                kind: 'prose',
                text: 'With anything other than a bare $x$ inside, the chain rule applies as usual — multiply by the derivative of the inside.',
              },
              { kind: 'display', tex: '\\frac{d}{dx}\\sin(3x) = 3\\cos(3x)' },
              {
                kind: 'prose',
                text: 'The $3$ appears because $\\sin(3x)$ completes its cycle three times as fast, so it is three times as steep everywhere. Squashing a curve horizontally makes it steeper by the same factor.',
              },
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
              { kind: 'display', tex: '\\sin x \\to \\cos x \\to -\\sin x \\to -\\cos x \\to \\sin x' },
              {
                kind: 'prose',
                text: 'Two steps in, the function has become its own negative. That is the signature of oscillation: acceleration always pointing back towards the middle, which is exactly what a pendulum or a spring does.',
              },
              {
                kind: 'prose',
                text: 'Compare it with $e^{x}$, which returns to itself after *one* step and therefore grows rather than oscillates. The length of the cycle is what decides the behaviour.',
              },
            ),
            ask('trig-derivative+choice', 2),
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
              // Tangents at x = 0 and x = 1: slope matches height at both,
              // which is the claim the paragraph above just made.
              graph({
                xMin: -2,
                xMax: 1.8,
                curves: [
                  { f: Math.exp },
                  { f: (x) => x + 1, dashed: true, accent: true },
                  { f: (x) => Math.E * x, dashed: true, accent: true },
                ],
                marks: [
                  { x: 0, y: 1 },
                  { x: 1, y: Math.E },
                ],
                yMin: -1,
                yMax: 6,
                label: 'y = e^x with tangents at x = 0 and x = 1',
              }),
              {
                kind: 'prose',
                text: 'At $x = 0$ the curve has height $1$ and the tangent there has slope $1$; at $x = 1$ the height is $e \\approx 2.72$ and so is the slope. Height and gradient never separate.',
              },
              {
                kind: 'prose',
                text: 'That property is what $e$ is *for*. Other bases very nearly work: $2^{x}$ differentiates to about $0.69 \\times 2^{x}$, and $3^{x}$ to about $1.10 \\times 3^{x}$. Somewhere between $2$ and $3$ the stray constant is exactly $1$, and that number is $e$.',
              },
              {
                kind: 'prose',
                text: 'It is also why exponential growth models itself so neatly: a quantity growing in proportion to its own size is exactly a quantity whose derivative is itself.',
              },
              {
                kind: 'prose',
                text: 'The power rule does not apply here. In $x^{2}$ the variable is the base, in $e^{x}$ it is the exponent, and bringing the power down would be answering a different question.',
              },
            ),
            ask('exp-log-derivative'),
            ask('exp-log-derivative'),
            ask('exp-log-derivative+choice'),
            teach(
              {
                kind: 'prose',
                text: 'The natural logarithm is its inverse, and differentiates to something with no logarithm in it at all — which is the most surprising result in this lesson.',
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
              {
                kind: 'prose',
                text: 'The method for an unfamiliar function is always the same: identify how it is *built*, then apply the rule that matches the construction. A product of two things needs the product rule; a function inside a function needs the chain rule.',
              },
              {
                kind: 'prose',
                text: 'Most real expressions need more than one rule, nested. $x^{2}\\sin(3x)$ is a product whose second factor needs the chain rule, so both are used, outermost first.',
              },
              { kind: 'display', tex: '\\frac{d}{dx}\\left(x^{2}\\sin 3x\\right) = 2x\\sin 3x + 3x^{2}\\cos 3x' },
              {
                kind: 'prose',
                text: 'Differentiating is mechanical in a way that integrating is not: follow the structure and the answer comes out. That reliability is what makes it worth drilling until it is automatic.',
              },
            ),
            // The last slide of the course: every rule has now been taught,
            // so the last question is choosing between them rather than
            // running one that has already been named.
            ask('df-choose-rule'),
          ],
          skillCheck: [
            ask('exp-log-derivative', 2),
            ask('trig-derivative', 2),
            ask('evaluate-derivative'),
          ],
        },
      ],
      levelCheck: [
        ask('trig-derivative', 2),
        ask('exp-log-derivative', 2),
        ask('chain-rule', 2),
        ask('trig-derivative', 2),
        ask('exp-log-derivative', 2),
        ask('chain-rule', 2),
        ask('trig-derivative', 2),
        ask('exp-log-derivative', 2),
        ask('chain-rule', 2),
        ask('trig-derivative', 2),
        ask('exp-log-derivative', 2),
        ask('chain-rule', 2),
      ],
    },
  ],
};
