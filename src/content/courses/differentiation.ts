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
 * A generated question with the sentence that sets it up above it.
 *
 * Widening these decks meant bringing in questions the teaching slide before
 * them was not written for — a sum dropped into the product-rule lesson to
 * ask whether the product rule is needed at all, a gradient at a point in the
 * middle of the power rule. The setting-up sentence belongs with the question
 * rather than on a slide of its own, so the lesson still reads as one thread.
 * Plain `ask` stays the default.
 */
const askAfter = (lead: Block[], generatorId: string, difficulty = 1): SlideRef => ({
  type: 'generated',
  generatorId,
  difficulty,
  leadIn: lead,
});

const prose = (text: string): Block => ({ kind: 'prose', text });

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
  blurb: 'Rates of change, from the power rule to sketching curves.',
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
            ask('df-power-tiles'),
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
            ask('df-power-tiles', 2),
            askAfter(
              [
                prose(
                  'A derivative is a function in its own right, so a number can be put into it. Doing that gives the gradient at that one point rather than everywhere.',
                ),
              ],
              'evaluate-derivative',
            ),
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
            ask('evaluate-derivative', 2),
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
            ask('sum-rule+choice'),
            askAfter(
              [
                prose(
                  'Term by term means every term is a power-rule question in its own right. Here is one of them on its own, in two pieces.',
                ),
              ],
              'df-power-tiles',
            ),
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
            ask('df-power-tiles', 2),
            askAfter(
              [
                prose(
                  'With no constant term to lose, this is the whole of what the sum rule leaves behind.',
                ),
              ],
              'df-gradient-tree',
            ),
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
            ask('df-gradient-tree', 2),
            ask('df-evaluate-steps+choice'),
          ],
          skillCheck: [ask('sum-rule', 2), ask('sum-rule+choice', 2), ask('sum-rule')],
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
            ask('df-index-rewrite'),
            ask('df-index-form'),
            askAfter(
              [
                prose(
                  'Once it has been rewritten, it is an ordinary power and nothing about the rule changes. Here is that step on its own.',
                ),
              ],
              'df-power-tiles',
            ),
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
            ask('df-index-rewrite', 2),
            askAfter(
              [
                prose(
                  'The same sign to watch, with no fraction in the way: a negative power comes down as a negative multiplier and then gets one more negative.',
                ),
              ],
              'power-rule',
              2,
            ),
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
            ask('df-index-form+choice', 2),
            ask('df-power-tiles', 2),
            ask('power-rule', 2),
          ],
          skillCheck: [ask('df-index-form', 2), ask('df-index-form'), ask('power-rule', 2)],
        },

        {
          id: 'df-l1-tangent',
          title: 'The Equation of a Tangent',
          slides: [
            teach(
              {
                kind: 'prose',
                text: 'A tangent is a straight line, and a straight line is fixed by a gradient and a point on it. The derivative supplies the gradient; the curve itself supplies the point.',
              },
              { kind: 'display', tex: 'y - y_{1} = m\\left(x - x_{1}\\right)' },
              {
                kind: 'prose',
                text: 'Three steps, always in this order: differentiate to get the gradient function, substitute the given $x$-value into it for $m$, then substitute the same value into the original curve for the point.',
              },
            ),
            ask('evaluate-derivative'),
            ask('df-tangent-line'),
            ask('df-tangent-line+choice'),
            teach(
              {
                kind: 'prose',
                text: 'Worked in full: for $f(x) = x^{2} + 1$ at $x = 2$, the derivative is $f\'(x) = 2x$, so $m = 4$. The point is $f(2) = 5$, giving $(2, 5)$.',
              },
              {
                kind: 'display',
                tex: 'y - 5 = 4\\left(x - 2\\right) \\implies y = 4x - 3',
              },
              graph({
                xMin: -1,
                xMax: 4,
                curves: [
                  { f: quadratic(1, 0, 1) },
                  { f: (x) => 4 * x - 3, dashed: true, accent: true },
                ],
                marks: [{ x: 2, y: 5 }],
                yMin: -4,
                yMax: 12,
                label: 'y = x^2 + 1 with its tangent line at x = 2',
              }),
              {
                kind: 'prose',
                text: 'The dashed line is that tangent, touching the curve only at the ringed point $(2, 5)$.',
              },
            ),
            ask('evaluate-derivative', 2),
            ask('df-evaluate-steps'),
            ask('df-stationary-slider'),
            teach(
              {
                kind: 'prose',
                text: 'Two traps produce a plausible-looking wrong line. Substituting the point into the curve *before* differentiating gives a constant, whose derivative is $0$ — a horizontal line, which is only ever the actual tangent at a turning point.',
              },
              {
                kind: 'prose',
                text: 'The other is using the curve\'s height as if it were the gradient. A quick check catches both: the point you found must actually satisfy the line you write down.',
              },
              { kind: 'display', tex: "m = f'(x_{1}) \\qquad c = f(x_{1}) - m x_{1}" },
            ),
            ask('df-stationary-slider', 2),
            ask('df-evaluate-steps+choice'),
          ],
          skillCheck: [ask('df-tangent-line', 2), ask('df-tangent-line'), ask('evaluate-derivative', 2)],
        },
      ],
      levelCheck: [
        ask('power-rule', 2),
        ask('sum-rule', 2),
        ask('evaluate-derivative', 2),
        ask('df-index-form', 2),
        ask('df-tangent-line', 2),
        ask('power-rule', 2),
        ask('sum-rule', 2),
        ask('evaluate-derivative', 2),
        ask('df-index-form', 2),
        ask('df-tangent-line', 2),
        ask('power-rule', 2),
        ask('sum-rule', 2),
        ask('evaluate-derivative', 2),
        ask('df-index-form', 2),
        ask('df-tangent-line', 2),
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
            ask('df-product-tiles'),
            ask('product-rule-tree'),
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
            askAfter(
              [
                prose(
                  'The two terms stay apart until the very end, so each one can be worked out on its own.',
                ),
              ],
              'df-product-tree',
            ),
            ask('df-product-tiles', 2),
            ask('df-product-tree', 2),
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
            askAfter(
              [
                prose(
                  'Here is the other route, on an expression that has already been expanded: no product rule needed, just the sum rule term by term.',
                ),
              ],
              'sum-rule',
              2,
            ),
            ask('sum-rule+choice', 2),
          ],
          skillCheck: [ask('product-rule', 2), ask('product-rule'), ask('product-rule+choice', 2)],
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
            ask('df-quotient-tiles'),
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
            ask('df-quotient-tiles', 2),
            askAfter(
              [
                prose(
                  'The product rule\'s two terms can be written either way round and the quotient rule\'s cannot. Here is the symmetric one again, to feel the difference.',
                ),
              ],
              'df-product-tiles',
            ),
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
            ask('product-rule', 2),
            ask('df-product-tiles', 2),
            ask('product-rule+choice', 2),
          ],
          skillCheck: [ask('quotient-rule', 2), ask('quotient-rule'), ask('quotient-rule+choice', 2)],
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
            ask('df-chain-tiles'),
            ask('chain-rule-steps'),
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
            askAfter(
              [
                prose(
                  'Each layer has to be finished before the next one can start, which is what the tree below is showing.',
                ),
              ],
              'df-chain-tree',
            ),
            ask('df-chain-tiles', 2),
            ask('df-chain-tree', 2),
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
            askAfter(
              [
                prose(
                  'Picking the right rule is now a question in its own right. Work down the questions and commit to a reason at each fork.',
                ),
              ],
              'df-choose-rule',
            ),
            ask('df-choose-rule', 2),
          ],
          skillCheck: [ask('chain-rule', 2), ask('chain-rule'), ask('chain-rule+choice', 2)],
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
            ask('df-chain-tiles'),
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
            askAfter(
              [
                prose(
                  'The same rewrite, with plain $x$ inside instead of a bracket — which is the case where the chain rule factor is $1$ and disappears from view.',
                ),
              ],
              'df-index-rewrite',
              2,
            ),
            ask('df-chain-tiles', 2),
            ask('chain-rule', 2),
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
            ask('df-chain-tree', 2),
            ask('chain-rule+choice', 2),
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
            ask('df-standard-tiles'),
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
            ask('df-standard-tiles', 2),
            askAfter(
              [
                prose(
                  'That extra multiplier is the chain rule, and it behaves the same way with a bracket on the outside as it does with a sine.',
                ),
              ],
              'chain-rule',
              2,
            ),
            ask('chain-rule+choice', 2),
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
            askAfter(
              [
                prose(
                  'Trigonometric functions join everything else that has been met, so the first question about one is which rule it needs at all.',
                ),
              ],
              'df-choose-rule',
            ),
            ask('df-choose-rule', 2),
          ],
          skillCheck: [ask('trig-derivative', 2), ask('trig-derivative'), ask('trig-derivative+choice', 2)],
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
            ask('df-standard-tiles'),
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
            ask('df-standard-tiles', 2),
            askAfter(
              [
                prose(
                  'The $k$ that appears in front of $e^{kx}$ is the chain rule\'s inner derivative — the same factor a bracket raised to a power produces.',
                ),
              ],
              'chain-rule',
              2,
            ),
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
            // The last three slides of the lesson: every rule has now been
            // taught, so the closing questions are about choosing between
            // them rather than running one that has already been named.
            ask('df-choose-rule'),
            ask('df-choose-rule', 2),
            ask('chain-rule+choice', 2),
          ],
          skillCheck: [
            ask('exp-log-derivative', 2),
            ask('exp-log-derivative+choice', 2),
            ask('exp-log-derivative'),
          ],
        },

        {
          id: 'df-l4-combine',
          title: 'Combining the Rules',
          slides: [
            teach(
              {
                kind: 'prose',
                text: 'Most real expressions need more than one rule. The first step is naming the outermost structure: is it a product, a quotient, or one function wrapped around another?',
              },
              { kind: 'display', tex: '\\frac{d}{dx}\\left(x^{2}\\sin 3x\\right) = 2x\\sin 3x + 3x^{2}\\cos 3x' },
              {
                kind: 'prose',
                text: '$x^{2}\\sin 3x$ is a product of two factors, so it needs the product rule at the outer level. Its second factor is not just $x$, so differentiating *it* needs the chain rule. Write $u$, $v$, $u\'$ and $v\'$ down first, with the chain rule factor already sitting inside $v\'$, then assemble as usual.',
              },
            ),
            ask('df-product-mixed'),
            ask('df-standard-tiles'),
            ask('df-product-mixed+choice'),
            teach(
              {
                kind: 'prose',
                text: 'When the chain-ruled factor is $e^{kx}$, both terms of the product-rule answer share the same exponential, so the result can be factorised back down.',
              },
              {
                kind: 'display',
                tex: '\\frac{d}{dx}\\left(x^{3}e^{2x}\\right) = 3x^{2}e^{2x} + 2x^{3}e^{2x} = x^{2}e^{2x}\\left(3 + 2x\\right)',
              },
              {
                kind: 'prose',
                text: 'Either the expanded or the factorised form is accepted — the checker compares values, not the shape they are written in. With cosine instead, the same assembly puts the minus sign on the second term only, exactly where cosine was differentiated.',
              },
            ),
            ask('df-standard-tiles', 2),
            askAfter(
              [
                prose(
                  'The two terms of a product-rule answer never meet until the last step, whatever is inside them.',
                ),
              ],
              'df-product-tree',
              2,
            ),
            ask('df-choose-rule'),
            teach(
              {
                kind: 'prose',
                text: 'A quick structural check catches most slips here without redoing the algebra: exactly one factor is differentiated in each term, and $k$ appears as an extra *multiplier* only in the term where the trig or exponential factor was the one differentiated — it is of course still inside every $\\sin(kx)$, $\\cos(kx)$ or $e^{kx}$ regardless.',
              },
              {
                kind: 'prose',
                text: '"The product of the two derivatives" is always wrong — but not because it is a single term; a factorised answer is one too, and is still correct. It is wrong because that is not what the product rule says to do: each real term keeps one factor undifferentiated, and multiplying two derivatives together does neither.',
              },
              {
                kind: 'prose',
                text: 'With every rule now taught, the skill left to practise is recognising which one — or which combination — a fresh expression calls for.',
              },
              { kind: 'display', tex: "\\frac{d}{dx}(uv) = u'v + uv'" },
            ),
            ask('df-choose-rule', 2),
            askAfter(
              [
                prose(
                  'And one where the outer structure is all there is: two ordinary factors, so the product rule on its own finishes it.',
                ),
              ],
              'product-rule',
              2,
            ),
          ],
          skillCheck: [ask('df-product-mixed', 2), ask('df-product-mixed'), ask('df-product-mixed+choice', 2)],
        },
      ],
      levelCheck: [
        ask('trig-derivative', 2),
        ask('exp-log-derivative', 2),
        ask('chain-rule', 2),
        ask('df-product-mixed', 2),
        ask('trig-derivative', 2),
        ask('exp-log-derivative', 2),
        ask('chain-rule', 2),
        ask('df-product-mixed', 2),
        ask('trig-derivative', 2),
        ask('exp-log-derivative', 2),
        ask('chain-rule', 2),
        ask('df-product-mixed', 2),
        ask('trig-derivative', 2),
        ask('exp-log-derivative', 2),
        ask('df-product-mixed', 2),
      ],
    },
    {
      id: 'df-l5',
      title: 'Stationary Points & the Second Derivative',
      lessons: [
        {
          id: 'df-l5-stationary',
          title: 'Finding Stationary Points',
          slides: [
            teach(
              prose(
                'A curve is **stationary** wherever its gradient is zero. For an instant it is neither rising nor falling, and its tangent is horizontal.',
              ),
              graph({
                xMin: -3,
                xMax: 5,
                yMin: -28,
                yMax: 16,
                curves: [{ f: (x) => x ** 3 - 3 * x ** 2 - 9 * x + 5 }],
                marks: [
                  { x: -1, y: 10 },
                  { x: 3, y: -22 },
                ],
                label: 'A cubic curve with its two stationary points marked',
              }),
              prose(
                'So finding stationary points is solving one equation: differentiate, then set the derivative equal to zero.',
              ),
              { kind: 'display', tex: '\\frac{dy}{dx} = 0' },
              prose(
                'For a cubic the derivative is a quadratic, so there are usually two answers, and factorising is the quickest way to both.',
              ),
            ),
            ask('df-sp-roots'),
            ask('df-sp-slider'),
            ask('df-sp-roots', 2),
            teach(
              prose(
                'A stationary point is a *point*, so it needs a $y$-coordinate too. That comes from the curve: put the $x$ you found back into $y$, not into $\\frac{dy}{dx}$.',
              ),
              { kind: 'display', tex: 'y = x^{3} - 3x^{2} - 9x + 5' },
              prose('At $x = 3$ that gives $y = 27 - 27 - 27 + 5 = -22$, so the point is $(3, -22)$.'),
              prose(
                'Putting it into the derivative instead gives $0$ every time. That is how the point was found in the first place, and it says nothing about its height.',
              ),
            ),
            ask('df-sp-y'),
            ask('df-sp-y-tree'),
            ask('df-sp-slider', 2),
            teach(
              prose(
                'You can say how many stationary points a cubic has before solving anything. Its derivative is a quadratic, and a quadratic\'s discriminant counts its roots.',
              ),
              { kind: 'display', tex: 'y = ax^{3} + bx^{2} + cx + d' },
              { kind: 'display', tex: '\\frac{dy}{dx} = 3ax^{2} + 2bx + c' },
              prose(
                'A positive discriminant means two stationary points, zero means one, and negative means none at all: the curve runs the same way from end to end.',
              ),
              prose(
                'Take the discriminant of the *derivative*. The cubic\'s own roots are where it crosses the axis, which is a different question.',
              ),
            ),
            ask('df-sp-count'),
            ask('df-sp-count', 2),
          ],
          skillCheck: [ask('df-sp-roots', 2), ask('df-sp-y+choice'), ask('df-sp-count', 2)],
        },

        {
          id: 'df-l5-second',
          title: 'The Second Derivative',
          slides: [
            teach(
              prose(
                'Differentiating the derivative gives the **second derivative**, written $f\'\'(x)$ or $\\frac{d^{2}y}{dx^{2}}$. It measures how fast the gradient itself is changing.',
              ),
              { kind: 'display', tex: 'y = x^{3} - 3x^{2}' },
              { kind: 'display', tex: '\\frac{dy}{dx} = 3x^{2} - 6x' },
              { kind: 'display', tex: '\\frac{d^{2}y}{dx^{2}} = 6x - 6' },
              prose('Nothing new is needed: the same rules, used twice.'),
            ),
            ask('df-second-derivative'),
            ask('df-second-derivative+choice', 2),
            ask('df-sp-roots'),
            teach(
              prose(
                'At a stationary point the gradient is zero, and the second derivative says which way it is heading as it passes through.',
              ),
              prose(
                'If $f\'\'(x) < 0$ the gradient is falling: the curve rises, flattens and falls, which is a local **maximum**. If $f\'\'(x) > 0$ the gradient is rising, which is a local **minimum**.',
              ),
              graph({
                xMin: -3,
                xMax: 5,
                yMin: -28,
                yMax: 16,
                curves: [{ f: (x) => x ** 3 - 3 * x ** 2 - 9 * x + 5 }],
                marks: [
                  { x: -1, y: 10 },
                  { x: 3, y: -22 },
                ],
                label: 'A cubic with a maximum on the left and a minimum on the right',
              }),
              { kind: 'display', tex: 'f\'\'(-1) = -12, \\quad f\'\'(3) = 12' },
            ),
            ask('df-second-at'),
            ask('df-nature-flow'),
            ask('df-second-at+choice', 2),
            teach(
              prose(
                'When $f\'\'(x) = 0$ at a stationary point, the test says nothing at all. It does not mean a point of inflection.',
              ),
              prose(
                '$y = x^{4}$ and $y = x^{3}$ both have $f\'(0) = 0$ and $f\'\'(0) = 0$, yet the first has a minimum there and the second does not. The next lesson has a test that always works.',
              ),
            ),
            ask('df-nature-flow', 2),
            ask('df-sp-y+choice', 2),
          ],
          skillCheck: [ask('df-second-derivative', 2), ask('df-second-at'), ask('df-nature-flow', 2)],
        },

        {
          id: 'df-l5-sign',
          title: 'Nature by Sign Change',
          slides: [
            teach(
              prose(
                'The second derivative is quick, but one test never fails: look at the sign of the gradient just before and just after the point.',
              ),
              prose(
                'Positive then negative is rising then falling: a **maximum**. Negative then positive is a **minimum**. The same sign on both sides means the curve only pauses, which is a **stationary point of inflection**.',
              ),
              prose(
                'Test close enough to the point that no other stationary point lies in between, or the sign you find belongs to a different stretch of the curve.',
              ),
            ),
            ask('df-sign-tiles'),
            ask('df-factored-nature'),
            ask('df-sign-tiles', 2),
            teach(
              prose(
                'Here are $y = x^{4}$ and $y = x^{3}$ (dashed). Both are flat at $x = 0$, and both have $f\'\'(0) = 0$.',
              ),
              graph({
                xMin: -1.6,
                xMax: 1.6,
                yMin: -2.5,
                yMax: 3,
                curves: [{ f: (x) => x ** 4 }, { f: (x) => x ** 3, dashed: true }],
                marks: [{ x: 0, y: 0 }],
                label: 'The curves x to the fourth and x cubed, both flat at the origin',
              }),
              prose(
                '$x^{4}$ has gradient $4x^{3}$, negative before $0$ and positive after: a minimum. $x^{3}$ has gradient $3x^{2}$, positive on both sides: it pauses and carries on climbing.',
              ),
            ),
            ask('df-nature-flow', 2),
            ask('df-factored-nature', 2),
            ask('df-second-at'),
            teach(
              prose(
                'When the derivative comes factorised, the signs can be read without substituting. A factor raised to an **odd** power changes sign at its root; one raised to an **even** power does not.',
              ),
              { kind: 'display', tex: '\\frac{dy}{dx} = (x - 2)^{2}(x + 1)' },
              prose(
                'At $x = 2$ the squared bracket keeps its sign, so the gradient does too: a stationary point of inflection. At $x = -1$ the single bracket flips from negative to positive: a minimum.',
              ),
            ),
            ask('df-sp-slider'),
            ask('df-second-at+choice', 2),
          ],
          skillCheck: [ask('df-sign-tiles'), ask('df-factored-nature', 2), ask('df-sign-tiles', 2)],
        },

        {
          id: 'df-l5-increasing',
          title: 'Increasing and Decreasing',
          slides: [
            teach(
              prose(
                'A function is **increasing** where its gradient is positive and **decreasing** where it is negative. One substitution into $f\'(x)$ settles it at any point.',
              ),
              prose(
                'Only the sign matters, so once you can see which way the arithmetic will come out there is no need to finish it.',
              ),
              prose(
                'Where $f\'(x) = 0$ the function is doing neither: it is stationary.',
              ),
            ),
            ask('df-increasing-at'),
            askAfter(
              [
                prose(
                  'The number itself, this time. Its sign is the whole of the answer to "going up or going down?".',
                ),
              ],
              'evaluate-derivative',
            ),
            ask('df-increasing-at', 2),
            teach(
              prose(
                'A smooth function can only switch direction where its gradient is zero. So the stationary points cut the number line into stretches, and the gradient keeps one sign along each.',
              ),
              { kind: 'display', tex: 'f\'(x) = 3(x + 1)(x - 3)' },
              prose(
                'This is positive for $x < -1$ and for $x > 3$, and negative for $-1 < x < 3$. The function rises, falls, then rises again.',
              ),
            ),
            ask('df-sp-roots'),
            ask('df-increasing-tiles'),
            ask('df-sp-slider', 2),
            teach(
              prose(
                'Some functions never turn at all. If $f\'(x)$ is positive everywhere, the function is increasing everywhere.',
              ),
              { kind: 'display', tex: 'f(x) = x^{3} + 3x' },
              { kind: 'display', tex: 'f\'(x) = 3x^{2} + 3' },
              prose(
                'A square is never negative, so $f\'(x)$ is always at least $3$: no stationary points, and the curve climbs from left to right without a pause.',
              ),
            ),
            ask('df-increasing-tiles', 2),
            ask('df-sp-count', 2),
          ],
          skillCheck: [ask('df-increasing-at', 2), ask('df-increasing-tiles', 2), ask('df-increasing-at')],
        },

        {
          id: 'df-l5-inflection',
          title: 'Points of Inflection',
          slides: [
            teach(
              prose(
                'The second derivative describes how a curve bends. Where $f\'\'(x) > 0$ the gradient is increasing and the curve is **convex**, bending upwards like a bowl.',
              ),
              prose(
                'Where $f\'\'(x) < 0$ the gradient is decreasing and the curve is **concave**, bending downwards like an arch.',
              ),
              graph({
                xMin: -0.5,
                xMax: 4.5,
                yMin: -1.5,
                yMax: 6,
                curves: [{ f: (x) => x ** 3 - 6 * x ** 2 + 9 * x }],
                marks: [{ x: 2, y: 2 }],
                label: 'A cubic that bends downwards on the left and upwards on the right',
              }),
            ),
            ask('df-concavity'),
            ask('df-second-derivative', 2),
            ask('df-concavity', 2),
            teach(
              prose(
                'A **point of inflection** is where the bend changes over: $f\'\'(x) = 0$, *and* it changes sign there.',
              ),
              { kind: 'display', tex: 'y = x^{3} - 6x^{2} + 9x' },
              { kind: 'display', tex: '\\frac{d^{2}y}{dx^{2}} = 6x - 12' },
              prose(
                'That is zero at $x = 2$ and changes sign there, so $(2, 2)$ is the point of inflection marked above. On a cubic it always sits exactly halfway between the turning points, here at $x = 1$ and $x = 3$.',
              ),
            ),
            ask('df-inflection-x'),
            ask('df-inflection-flow'),
            ask('df-inflection-x+choice', 2),
            teach(
              prose(
                'Both conditions matter. $y = x^{4}$ has $f\'\'(0) = 0$ but bends upwards on both sides, so it has no inflection at all.',
              ),
              prose(
                'And an inflection may or may not be flat. If $f\'(x) = 0$ there too, it is a **stationary** point of inflection, like $x^{3}$ at $0$. Otherwise it is non-stationary, like the cubic above at $x = 2$.',
              ),
            ),
            ask('df-inflection-flow', 2),
            ask('df-second-derivative+choice', 2),
          ],
          skillCheck: [ask('df-inflection-x', 2), ask('df-concavity', 2), ask('df-inflection-flow', 2)],
        },
      ],
      levelCheck: [
        ask('df-sp-roots', 2),
        ask('df-second-at', 2),
        ask('df-increasing-tiles', 2),
        ask('df-nature-flow', 2),
        ask('df-sp-y+choice', 2),
        ask('df-concavity', 2),
        ask('df-sign-tiles', 2),
        ask('df-second-derivative', 2),
        ask('df-factored-nature', 2),
        ask('df-inflection-x', 2),
        ask('df-sp-slider', 2),
        ask('df-increasing-at', 2),
        ask('df-inflection-flow', 2),
        ask('df-sp-count', 2),
      ],
    },
    {
      id: 'df-l6',
      title: 'Curve Sketching',
      lessons: [
        {
          id: 'df-l6-axes',
          title: 'Where a Curve Meets the Axes',
          slides: [
            teach(
              prose(
                'A sketch starts where the curve meets the axes. In factorised form the $x$-axis crossings are printed on the brackets: $y = 0$ exactly when one bracket is zero.',
              ),
              { kind: 'display', tex: 'y = (x + 2)(x - 1)(x - 3)' },
              graph({
                xMin: -3.5,
                xMax: 4.5,
                yMin: -14,
                yMax: 11,
                curves: [{ f: (x) => (x + 2) * (x - 1) * (x - 3) }],
                verticals: [{ x: 0, dashed: false }],
                marks: [
                  { x: -2, y: 0 },
                  { x: 1, y: 0 },
                  { x: 3, y: 0 },
                  { x: 0, y: 6 },
                ],
                label: 'A cubic crossing the x-axis three times and the y-axis once',
              }),
              prose(
                'So $x = -2$, $1$ and $3$: each bracket\'s number with its sign flipped. The $y$-axis is $x = 0$, and putting $0$ into every bracket gives $(2)(-1)(-3) = 6$.',
              ),
            ),
            ask('df-cs-roots'),
            ask('df-cs-y-int'),
            ask('df-cs-roots', 2),
            teach(
              prose(
                'Between two roots a curve cannot change sign, so the roots cut the number line into stretches that are wholly above or wholly below the axis.',
              ),
              prose(
                'Far to the right every bracket is positive, so the last stretch takes the sign of the number in front. Moving left, the sign flips at each root.',
              ),
              { kind: 'display', tex: 'y = -2(x + 1)(x - 2)(x - 4)' },
              { kind: 'display', tex: '+ \\quad - \\quad + \\quad -' },
            ),
            ask('df-cs-signs'),
            ask('df-cs-y-int+choice', 2),
            ask('df-cs-signs', 2),
            teach(
              prose(
                'A squared bracket is never negative, so $y$ does not change sign there: the curve **touches** the axis and turns back. A cubed bracket does change sign, but the curve flattens as it **crosses**.',
              ),
              graph({
                xMin: -3,
                xMax: 3,
                yMin: -3,
                yMax: 7,
                curves: [{ f: (x) => (x - 1) ** 2 * (x + 2) }],
                verticals: [{ x: 0, dashed: false }],
                marks: [
                  { x: -2, y: 0 },
                  { x: 1, y: 0 },
                ],
                label: 'A cubic that crosses the axis at minus 2 and touches it at 1',
              }),
              { kind: 'display', tex: 'y = (x - 1)^{2}(x + 2)' },
              prose(
                'Whether a touch is a dip or a hump depends on the rest of the product. Here $(x + 2)$ is positive near $x = 1$, so the curve touches from above.',
              ),
            ),
            ask('df-cs-touch'),
            ask('df-cs-touch', 2),
          ],
          skillCheck: [ask('df-cs-roots', 2), ask('df-cs-signs', 2), ask('df-cs-touch', 2)],
        },

        {
          id: 'df-l6-turning',
          title: 'Placing the Turning Points',
          slides: [
            teach(
              prose(
                'The roots are the skeleton of a sketch; the turning points are its humps. Find them as before: solve $f\'(x) = 0$, then let $f\'\'(x)$ say which is which.',
              ),
              { kind: 'display', tex: 'y = x^{3} - 6x^{2} + 9x + 1' },
              { kind: 'display', tex: 'f\'(x) = 3(x - 1)(x - 3)' },
              prose(
                'So the curve is flat at $x = 1$ and $x = 3$. Putting those back into $y$ gives the points $(1, 5)$ and $(3, 1)$, and $f\'\'(1) = -6$ makes the first a maximum.',
              ),
            ),
            ask('df-cs-turn'),
            ask('df-sp-y'),
            ask('df-nature-flow'),
            teach(
              prose(
                'Mark the turning points first, then join them up. A cubic with a positive $x^{3}$ term comes up from below, over its maximum, down through its minimum, and away upwards.',
              ),
              graph({
                xMin: -0.8,
                xMax: 4.2,
                yMin: -2,
                yMax: 7,
                curves: [{ f: (x) => x ** 3 - 6 * x ** 2 + 9 * x + 1 }],
                verticals: [{ x: 0, dashed: false }],
                marks: [
                  { x: 1, y: 5 },
                  { x: 3, y: 1 },
                ],
                label: 'A cubic with both of its turning points above the x-axis',
              }),
              prose(
                'Both turning points here are above the axis, so the curve never dips below it between them: it crosses the axis once, on its left arm.',
              ),
            ),
            ask('df-cs-turn', 2),
            ask('df-sp-slider'),
            ask('df-cs-crossings'),
            teach(
              prose(
                'A turning point can sit on the axis itself. That is a root the curve only touches, and it is where a squared bracket comes from.',
              ),
              { kind: 'display', tex: 'y = x^{3} - 3x + 2' },
              { kind: 'display', tex: '= (x - 1)^{2}(x + 2)' },
              prose(
                'Its minimum is $(1, 0)$, on the axis, and its maximum is $(-1, 4)$. The curve crosses at $x = -2$ and touches at $x = 1$: two meetings, not three.',
              ),
            ),
            ask('df-cs-crossings', 2),
            ask('df-nature-flow', 2),
          ],
          skillCheck: [ask('df-cs-turn', 2), ask('df-cs-crossings', 2), ask('df-nature-flow', 2)],
        },

        {
          id: 'df-l6-asymptotes',
          title: 'Asymptotes and Large x',
          slides: [
            teach(
              prose(
                'Some curves have lines they approach but never meet: **asymptotes**. A reciprocal curve has two.',
              ),
              { kind: 'display', tex: 'y = \\frac{2}{x - 1} + 1' },
              graph({
                xMin: -4,
                xMax: 6,
                yMin: -6,
                yMax: 8,
                curves: [{ f: (x) => 2 / (x - 1) + 1, breaks: true }],
                verticals: [{ x: 1 }],
                horizontals: [1],
                label: 'A reciprocal curve on either side of its two dashed asymptotes',
              }),
              prose(
                'There is no $y$ where the denominator is zero, so there is a vertical asymptote at $x = 1$. Far out the fraction shrinks to nothing, so $y$ levels out towards $1$: a horizontal asymptote at $y = 1$.',
              ),
            ),
            ask('df-cs-asymptotes'),
            ask('df-cs-rational-y'),
            ask('df-cs-asymptotes+choice', 2),
            teach(
              prose('The curve still meets the axes like any other. For the $y$-axis put $x = 0$:'),
              { kind: 'display', tex: 'y = \\frac{2}{-1} + 1 = -1' },
              prose('For the $x$-axis put $y = 0$, and the fraction has to cancel the $1$:'),
              { kind: 'display', tex: '\\frac{2}{x - 1} = -1' },
              prose('So $x - 1 = -2$, and the curve crosses at $x = -1$.'),
            ),
            ask('df-cs-rational-root'),
            ask('df-cs-rational-y', 2),
            ask('df-cs-rational-root', 2),
            teach(
              prose(
                'A polynomial has no asymptotes. Far out, its highest power outweighs everything else, so that one term decides which way the ends go.',
              ),
              { kind: 'display', tex: 'y = 3x^{2} + 5x - 2x^{3}' },
              { kind: 'display', tex: 'y \\approx -2x^{3}' },
              prose(
                'An odd power sends the two ends opposite ways; an even power sends them the same way. The sign in front says which: here the right end goes down and the left end up.',
              ),
            ),
            ask('df-cs-ends'),
            ask('df-cs-ends', 2),
          ],
          skillCheck: [ask('df-cs-asymptotes', 2), ask('df-cs-rational-root', 2), ask('df-cs-ends', 2)],
        },

        {
          id: 'df-l6-sketch',
          title: 'Sketching from Start to Finish',
          slides: [
            teach(
              prose(
                'A sketch from factorised form is a checklist: the roots, and whether each is crossed or touched; the $y$-intercept; and which way the ends go. Then join them up.',
              ),
              { kind: 'display', tex: 'y = -(x + 2)(x - 1)^{2}' },
              graph({
                xMin: -3,
                xMax: 2.5,
                yMin: -5,
                yMax: 6,
                curves: [{ f: (x) => -(x + 2) * (x - 1) ** 2 }],
                verticals: [{ x: 0, dashed: false }],
                marks: [
                  { x: -2, y: 0 },
                  { x: 1, y: 0 },
                  { x: 0, y: -2 },
                ],
                label: 'An upside-down cubic crossing at minus 2 and touching at 1',
              }),
              prose(
                'It crosses at $x = -2$ and touches at $x = 1$; it meets the $y$-axis at $-(2)(1) = -2$; and with $-x^{3}$ leading it comes down from the top left and leaves at the bottom right.',
              ),
            ),
            ask('df-cs-roots', 2),
            ask('df-cs-ends'),
            ask('df-cs-y-int', 2),
            teach(
              prose(
                'Between two places where the curve crosses, it has to turn round, so every gap between crossings holds a hump or a dip. For a sketch its rough place is enough; its exact place is where $f\'(x) = 0$.',
              ),
              prose(
                'A touch is a turning point already, sitting on the axis. A flattened crossing is a stationary point of inflection, which is not a turn at all.',
              ),
            ),
            ask('df-cs-touch', 2),
            ask('df-cs-spot-error'),
            ask('df-sp-slider', 2),
            teach(
              prose(
                'Check a finished sketch one feature at a time. Is each root on the right side of the $y$-axis? Does it touch at the squared bracket and cross at the others? Do the ends go the right way?',
              ),
              prose(
                'A sketch can have every feature but one right, so stop only when all three checks pass.',
              ),
            ),
            ask('df-cs-spot-error', 2),
            ask('df-cs-crossings', 2),
          ],
          skillCheck: [ask('df-cs-spot-error', 2), ask('df-cs-roots', 2), ask('df-cs-ends', 2)],
        },

        {
          id: 'df-l6-reading',
          title: 'Reading a Sketch',
          slides: [
            teach(
              prose(
                'Reading a sketch runs the checklist backwards. Each root gives a bracket; a touch means that bracket is squared; the ends give the sign in front.',
              ),
              graph({
                xMin: -2.5,
                xMax: 4,
                yMin: -12,
                yMax: 6,
                curves: [{ f: (x) => (x + 1) ** 2 * (x - 3) }],
                verticals: [{ x: 0, dashed: false }],
                marks: [
                  { x: -1, y: 0 },
                  { x: 3, y: 0 },
                ],
                label: 'A cubic touching the axis at minus 1 and crossing at 3',
              }),
              prose(
                'This touches at $x = -1$ and crosses at $x = 3$, and its right end goes up:',
              ),
              { kind: 'display', tex: 'y = (x + 1)^{2}(x - 3)' },
            ),
            ask('df-cs-match'),
            ask('df-cs-touch'),
            ask('df-cs-match', 2),
            teach(
              prose(
                'The graph of the **gradient function** $y = f\'(x)$ can be read straight off $y = f(x)$. It is zero at every turning point, positive where the curve rises and negative where it falls.',
              ),
              graph({
                xMin: -2.4,
                xMax: 2.4,
                yMin: -4,
                yMax: 6,
                curves: [{ f: (x) => x ** 3 - 3 * x }, { f: (x) => 3 * x * x - 3, dashed: true }],
                marks: [
                  { x: -1, y: 0 },
                  { x: 1, y: 0 },
                ],
                label: 'A cubic with its gradient function dashed, crossing zero under each turning point',
              }),
              prose(
                'Here $y = x^{3} - 3x$ turns at $x = -1$ and $x = 1$, so its gradient (dashed) crosses the axis there: positive, then negative, then positive. A cubic\'s gradient is always a parabola.',
              ),
            ),
            ask('df-cs-gradient-shape'),
            ask('df-cs-read-gradient'),
            ask('df-cs-gradient-shape', 2),
            teach(
              prose(
                'The gradient graph has a turning point of its own, and it means something too: that is where the original curve is steepest.',
              ),
              prose(
                'For $y = x^{3} - 3x$ the dashed parabola is lowest at $x = 0$, so the curve falls most steeply there. It is also where $f\'\'(x) = 0$: the point of inflection.',
              ),
            ),
            ask('df-cs-steepest'),
            ask('df-cs-read-gradient', 2),
          ],
          skillCheck: [ask('df-cs-match', 2), ask('df-cs-read-gradient', 2), ask('df-cs-gradient-shape', 2)],
        },
      ],
      levelCheck: [
        ask('df-cs-roots', 2),
        ask('df-cs-y-int+choice', 2),
        ask('df-cs-touch', 2),
        ask('df-cs-asymptotes', 2),
        ask('df-cs-crossings', 2),
        ask('df-cs-rational-root', 2),
        ask('df-cs-turn', 2),
        ask('df-cs-ends', 2),
        ask('df-cs-rational-y', 2),
        ask('df-cs-spot-error', 2),
        ask('df-cs-signs', 2),
        ask('df-cs-steepest', 2),
        ask('df-cs-match', 2),
        ask('df-cs-read-gradient', 2),
        ask('df-cs-gradient-shape', 2),
      ],
    },
    {
      id: 'df-l7',
      title: 'Rates of Change & Related Rates',
      lessons: [
        {
          id: 'df-l7-rate',
          title: 'A Derivative Is a Rate',
          slides: [
            teach(
              prose(
                'A derivative measures how fast one thing changes as another does. When a quantity changes with **time**, its derivative is a **rate**: so many units of it for every second, minute or hour.',
              ),
              { kind: 'display', tex: 'V = 2t^{3} + 5t' },
              { kind: 'display', tex: '\\frac{dV}{dt} = 6t^{2} + 5' },
              graph({
                xMin: -0.2,
                xMax: 2.2,
                yMin: -4,
                yMax: 28,
                curves: [
                  { f: (t) => 2 * t ** 3 + 5 * t },
                  { f: (t) => 11 * t - 4, dashed: true, accent: true },
                ],
                verticals: [{ x: 0, dashed: false }],
                marks: [{ x: 1, y: 7 }],
                label: 'The volume in a tank against time, with its tangent at t = 1',
              }),
              prose(
                'If $V$ is the water in a tank in $\\text{cm}^{3}$ after $t$ seconds, then at $t = 1$ it is filling at $\\frac{dV}{dt} = 11$ $\\text{cm}^{3}$ per second: the steepness of the graph there.',
              ),
            ),
            ask('df-rc-rate-fn'),
            ask('df-rc-rate-fn+choice', 2),
            ask('df-rc-read-units'),
            teach(
              prose(
                'For the rate at one moment, **differentiate first**, then put the time in. At $t = 2$ the tank above is filling at $29$ $\\text{cm}^{3}$ per second:',
              ),
              { kind: 'display', tex: '\\frac{dV}{dt} = 6(2)^{2} + 5 = 29' },
              prose(
                'Putting $t = 2$ into $V$ instead gives $26$ $\\text{cm}^{3}$. That is how much water there is, not how fast it is arriving, and its unit has no "per second" in it.',
              ),
            ),
            ask('df-rc-rate-at'),
            ask('df-rc-rate-slider'),
            ask('df-rc-rate-at+choice', 2),
            teach(
              prose(
                'A rate can be negative: the quantity is going **down**. A ball thrown upwards is $h = 20t - 5t^{2}$ metres high, so its height changes at',
              ),
              { kind: 'display', tex: '\\frac{dh}{dt} = 20 - 10t' },
              graph({
                xMin: -0.2,
                xMax: 4.2,
                yMin: -3,
                yMax: 24,
                curves: [{ f: (t) => 20 * t - 5 * t * t }],
                verticals: [{ x: 0, dashed: false }],
                marks: [{ x: 2, y: 20 }],
                label: 'The height of a ball against time, rising to a peak at t = 2 and falling',
              }),
              prose(
                'Positive before $t = 2$, so it rises; zero at $t = 2$, the top; negative after, so it falls. The number is the speed and the sign is the direction.',
              ),
            ),
            ask('df-rc-rate-slider', 2),
            ask('df-rc-read-units', 2),
          ],
          skillCheck: [ask('df-rc-rate-fn', 2), ask('df-rc-rate-at', 2), ask('df-rc-rate-slider', 2)],
        },

        {
          id: 'df-l7-connect',
          title: 'Connecting Rates',
          slides: [
            teach(
              prose(
                'When one quantity depends on another, their rates are linked. A cube\'s volume depends on its edge, and the edge on time, so the rates **multiply**:',
              ),
              { kind: 'display', tex: '\\frac{dV}{dt} = \\frac{dV}{dx} \\times \\frac{dx}{dt}' },
              prose(
                'This is the chain rule read as rates: $\\text{cm}^{3}$ per cm, times cm per second, gives $\\text{cm}^{3}$ per second. With $V = x^{3}$, an edge of $4$ cm growing at $2$ cm per second:',
              ),
              { kind: 'display', tex: '\\frac{dV}{dt} = 3(4)^{2} \\times 2' },
              { kind: 'display', tex: '= 48 \\times 2 = 96' },
            ),
            ask('df-rc-chain-tiles'),
            ask('df-rc-which-rate'),
            ask('df-rc-chain-tiles', 2),
            teach(
              prose(
                'The middle of the chain can be moving too. If $y = x^{2}$ and $x = 3t + 1$, find $x$ at the moment first, then use it. At $t = 1$, $x = 4$ and $\\frac{dx}{dt} = 3$, so $\\frac{dy}{dx} = 2x = 8$ and',
              ),
              { kind: 'display', tex: '\\frac{dy}{dt} = 8 \\times 3 = 24' },
              prose('$\\frac{dy}{dx}$ is evaluated at $x = 4$, not at $t = 1$. The two are different numbers.'),
            ),
            ask('df-rc-link-tree'),
            ask('df-rc-which-rate', 2),
            ask('df-rc-link-tree', 2),
            teach(
              prose(
                'When $x$ changes at a steady rate, the chain gives $\\frac{dy}{dt}$ as a function of $x$: every term of $\\frac{dy}{dx}$ multiplied by that rate. For $y = x^{3} - 4x$ with $\\frac{dx}{dt} = 2$:',
              ),
              { kind: 'display', tex: '\\frac{dy}{dt} = (3x^{2} - 4) \\times 2' },
              { kind: 'display', tex: '= 6x^{2} - 8' },
            ),
            ask('df-rc-rate-in-x'),
            ask('df-rc-rate-in-x+choice', 2),
          ],
          skillCheck: [ask('df-rc-chain-tiles', 2), ask('df-rc-link-tree', 2), ask('df-rc-rate-in-x', 2)],
        },

        {
          id: 'df-l7-shapes',
          title: 'Related Rates in Shapes',
          slides: [
            teach(
              prose(
                'Most related-rates questions are about a shape. Write the formula that links the two quantities, differentiate it, then chain. A circle with radius $5$ cm growing at $3$ cm per second:',
              ),
              { kind: 'display', tex: 'A = \\pi r^{2}' },
              { kind: 'display', tex: '\\frac{dA}{dr} = 2\\pi r = 10\\pi' },
              { kind: 'display', tex: '\\frac{dA}{dt} = 10\\pi \\times 3 = 30\\pi' },
              prose(
                'That is $30\\pi$ $\\text{cm}^{2}$ per second, and the $\\pi$ stays in because it is exact. A shape with two lengths is tied down to one first, so a cone that is always three times as tall as its radius has $V = \\frac{1}{3}\\pi r^{2}(3r) = \\pi r^{3}$. A length that is shrinking has a negative rate.',
              ),
            ),
            ask('df-rc-shape-k'),
            ask('df-rc-shape-flow'),
            ask('df-rc-shape-k+choice', 2),
            teach(
              prose(
                'The chain works backwards too. Knowing how fast the **size** changes, divide by $\\frac{dV}{dr}$ to get the length\'s rate. A balloon gaining $288\\pi$ $\\text{cm}^{3}$ per second when its radius is $6$ cm:',
              ),
              { kind: 'display', tex: '\\frac{dV}{dr} = 4\\pi r^{2} = 144\\pi' },
              { kind: 'display', tex: '\\frac{dr}{dt} = 288\\pi \\div 144\\pi = 2' },
              prose('That is $2$ cm per second. The $\\pi$ on top cancels the $\\pi$ underneath, which is why the answer is a plain number.'),
            ),
            ask('df-rc-shape-back'),
            ask('df-rc-shape-flow', 2),
            ask('df-rc-shape-back', 2),
            teach(
              prose(
                'A cube or a box has no $\\pi$, and the numbers come out whole. A cube-shaped crystal gaining $96$ $\\text{cm}^{3}$ per second when its edge is $4$ cm has $\\frac{dV}{dx} = 3x^{2}$, so',
              ),
              { kind: 'display', tex: '\\frac{dx}{dt} = 96 \\div 3 \\div 4^{2} = 2' },
              prose('Dividing by $3x^{2}$ is dividing by $3$, then by $x^{2}$: left to right, one step at a time.'),
            ),
            ask('df-rc-block-back'),
            ask('df-rc-block-back+choice', 2),
          ],
          skillCheck: [ask('df-rc-shape-k', 2), ask('df-rc-shape-back', 2), ask('df-rc-shape-flow', 2)],
        },

        {
          id: 'df-l7-reading',
          title: 'Reading a Rate',
          slides: [
            teach(
              prose(
                'The **sign** of a rate says which way a quantity is going: positive, increasing; negative, decreasing; zero, still for an instant.',
              ),
              { kind: 'display', tex: 'V = -t^{3} + 6t^{2} + 20' },
              { kind: 'display', tex: '\\frac{dV}{dt} = 3t(4 - t)' },
              graph({
                xMin: -0.3,
                xMax: 6.2,
                yMin: 0,
                yMax: 60,
                curves: [{ f: (t) => -(t ** 3) + 6 * t * t + 20 }],
                verticals: [{ x: 0, dashed: false }],
                marks: [{ x: 4, y: 52 }],
                label: 'A quantity that rises until t = 4 and then falls',
              }),
              prose(
                'Between $t = 0$ and $t = 4$ both factors are positive, so $V$ rises. At $t = 4$ the rate is zero and $V$ stops increasing; after that it falls.',
              ),
            ),
            ask('df-rc-sign'),
            ask('df-rc-method-flow'),
            ask('df-rc-sign', 2),
            teach(
              prose(
                'The rate is a function too, so it has its own peak: where **its** derivative is zero. Here the rate is an upside-down parabola, greatest halfway between its zeros.',
              ),
              { kind: 'display', tex: '\\frac{d^{2}V}{dt^{2}} = -6t + 12 = 0' },
              graph({
                xMin: -0.3,
                xMax: 5.2,
                yMin: -16,
                yMax: 16,
                curves: [{ f: (t) => -3 * t * t + 12 * t, accent: true }],
                verticals: [{ x: 0, dashed: false }],
                marks: [
                  { x: 2, y: 12 },
                  { x: 4, y: 0 },
                ],
                label: 'The rate against time: zero at t = 0 and t = 4, greatest at t = 2',
              }),
              prose('That gives $t = 2$: $V$ increases fastest there, and stops increasing at $t = 4$.'),
            ),
            ask('df-rc-peak-tiles'),
            ask('df-rc-method-flow', 2),
            ask('df-rc-peak-tiles', 2),
            teach(
              prose(
                'Over a **small** change $\\delta x$, a curve is almost straight, so the change in $y$ is about the gradient times the change:',
              ),
              { kind: 'display', tex: '\\delta y \\approx \\frac{dy}{dx} \\times \\delta x' },
              prose(
                'For $y = x^{3}$ moving from $x = 2$ to $x = 2.1$: $\\frac{dy}{dx} = 12$, so $\\delta y \\approx 12 \\times 0.1 = 1.2$. The exact change is $1.261$, and the estimate gets closer as the nudge gets smaller.',
              ),
            ),
            ask('df-rc-small-change'),
            ask('df-rc-small-change+choice', 2),
          ],
          skillCheck: [ask('df-rc-sign', 2), ask('df-rc-peak-tiles', 2), ask('df-rc-small-change', 2)],
        },
      ],
    },
  ],
};
