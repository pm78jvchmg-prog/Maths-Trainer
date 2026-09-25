/**
 * Trigonometric Identities & Equations.
 *
 * Trigonometric Functions already has the identities themselves —
 * sin^2 + cos^2 = 1 in its second level, tan = sin / cos and the two
 * reciprocal forms in its fifth — and, in its sixth, how one principal value
 * leads to every solution. This course puts them to work.
 *
 * Level 1 uses the identities to rewrite: to simplify, to find one value from
 * another without finding the angle, and to turn an equation into one it can
 * already solve — a quadratic in sin x or cos x, or tan x = k.
 *
 * Level 2 adds the compound-angle formulae, their exact values at 15 and 75
 * degrees, the tangent formula, and the double-angle formulae with the
 * equations they unlock.
 *
 * Level 3 runs the compound-angle formula the other way: a sin x + b cos x is
 * one wave, R sin(x + alpha), and once it is written so, its greatest and
 * least values and its equations are the ones Trigonometric Functions already
 * solves for A sin(bx + c) + d.
 *
 * Level 4 halves and triples the angle: cos 2A read with A = x/2 gives the
 * half-angle formulae, with values from cos x and exact values at 15 and 22.5
 * degrees; sin(2x + x) gives the triple-angle formulae; and equations in x/2
 * and 3x are solved for the bracket over its own range.
 *
 * Level 5 proves identities: start from one side and rewrite it, one move
 * at a time, until it is the other side, through fractions, squares and double
 * angles; and it tells an identity from an equation, which one angle can
 * disprove but never prove.
 *
 * Level 6 adds the factor formulae: sin P + sin Q and its three siblings as a
 * product of half sums and half differences, derived by adding two compound
 * angle expansions, run back from a product to a sum, used for exact values
 * of angles off the table, and used to solve an equation such as
 * sin 5x + sin x = 0 by factorising it, over a stated range.
 *
 * Level 7 writes every solution at once: alpha + 360n or 180 - alpha + 360n
 * for a sine, plus or minus alpha + 360n for a cosine, alpha + 180n for a
 * tangent, and the same in radians, where Trigonometric Functions (tf-l6)
 * stopped at the partner in one turn. Then a bracket, divided through turn and
 * all; harder equations, where an identity, a double angle or a factor formula
 * comes first; and which route an equation wants, what dividing by sin x or
 * cos x loses, and how many solutions a range holds.
 *
 * Each level closes with a level check: twelve to fifteen questions, no
 * teaching slides, one attempt each.
 */
import type { Block, Course, SlideRef } from '../types';

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
 * A question with a worked example riding on it. Every question in this
 * course asks only what an earlier line of the same lesson has worked through
 * with numbers; where that example would make a teach slide too long to read
 * on a phone, it sits here, above the question it sets up.
 */
const lead = (generatorId: string, difficulty: number, ...blocks: Block[]): SlideRef => ({
  type: 'generated',
  generatorId,
  difficulty,
  leadIn: blocks,
});

const prose = (text: string): Block => ({ kind: 'prose', text });

const maths = (tex: string): Block => ({ kind: 'display', tex });

export const trigIdentities: Course = {
  id: 'trig-identities',
  category: 'advanced-algebra',
  // Straight after Trigonometric Functions, whose identities it puts to work.
  position: 15,
  title: 'Trigonometric Identities & Equations',
  blurb: 'Rewriting with identities to solve equations; compound, double, half and triple angles; the form R sin(x + α); proving identities; and the factor formulae.',
  levels: [
    {
      id: 'ti-l1',
      title: 'Using Identities',
      lessons: [
        {
          id: 'ti-l1-rewrite',
          title: 'Rewriting with Identities',
          slides: [
            teach(
              prose(
                'An **identity** is true at every angle, not just at a few. You have met the main one already:',
              ),
              maths('\\sin^2 x + \\cos^2 x = 1'),
              prose(
                'Because it always holds, either side can replace the other in any expression. Rearranging it gives two forms you will use constantly:',
              ),
              maths('\\begin{aligned} \\sin^2 x &= 1 - \\cos^2 x \\\\ \\cos^2 x &= 1 - \\sin^2 x \\end{aligned}'),
            ),
            ask('tid-rearrange-tiles'),
            lead(
              'tid-simplify-steps',
              1,
              prose(
                'To simplify, look for a piece that matches one side of an identity and swap in the other side, then cancel. For example',
              ),
              maths('\\begin{aligned} \\frac{3(1 - \\cos^2 x)}{\\sin x} &= \\frac{3\\sin^2 x}{\\sin x} \\\\ &= 3\\sin x \\end{aligned}'),
            ),
            ask('tid-simplify-choice'),
            teach(
              prose(
                'The reciprocal functions have identities of their own: $1 + \\tan^2 x = \\sec^2 x$ and $1 + \\cot^2 x = \\operatorname{cosec}^2 x$. Take $1$ from both sides of each:',
              ),
              maths('\\begin{aligned} \\sec^2 x - 1 &= \\tan^2 x \\\\ \\operatorname{cosec}^2 x - 1 &= \\cot^2 x \\end{aligned}'),
              prose('So a square minus $1$ collapses to one term, and then it cancels:'),
              maths(
                '\\begin{aligned} \\frac{4(\\operatorname{cosec}^2 x - 1)}{\\cot x} &= \\frac{4\\cot^2 x}{\\cot x} \\\\ &= 4\\cot x \\end{aligned}',
              ),
            ),
            ask('tid-simplify-steps', 2),
            ask('tid-rearrange-tiles', 2),
            lead(
              'tid-simplify-choice',
              2,
              prose(
                'Take $\\cot^2 x$ from both sides of $1 + \\cot^2 x = \\operatorname{cosec}^2 x$ instead, and the difference of the squares is $1$:',
              ),
              maths('\\operatorname{cosec}^2 x - \\cot^2 x = 1'),
              prose('So $3(\\operatorname{cosec}^2 x - \\cot^2 x) = 3 \\times 1 = 3$.'),
              prose('In the same way $\\sec^2 x - \\tan^2 x = 1$.'),
            ),
            teach(
              prose(
                'An identity also finds one value from another without ever finding the angle. If $\\sin \\theta = \\frac{2}{3}$, then',
              ),
              maths('\\cos^2 \\theta = 1 - \\left(\\frac{2}{3}\\right)^2 = \\frac{5}{9}'),
              prose('No calculator, and no rounding: the answer comes out exact.'),
            ),
            ask('tid-value-from-identity'),
            ask('tid-value-from-identity+choice'),
          ],
          skillCheck: [
            ask('tid-simplify-steps', 2),
            ask('tid-rearrange-tiles', 2),
            ask('tid-value-from-identity'),
          ],
        },
        {
          id: 'ti-l1-choose',
          title: 'Choosing an Identity',
          slides: [
            teach(
              prose('The skill is spotting which identity an expression is asking for:'),
              prose(
                '$\\sin^2$ and $\\cos^2$ together, or $1$ minus either of them, point to $\\sin^2 x + \\cos^2 x = 1$. A sine over a cosine is $\\tan x$.',
              ),
              prose(
                '$\\sec^2 x - 1$ is $\\tan^2 x$, and $\\operatorname{cosec}^2 x - 1$ is $\\cot^2 x$, from the two identities with the reciprocal functions.',
              ),
            ),
            ask('tid-which-identity-flow'),
            ask('tid-simplify-steps', 2),
            ask('tid-which-identity-flow', 2),
            teach(
              prose(
                'Some expressions come to the same number at every angle. That is why an angle with no exact value is no obstacle:',
              ),
              maths(
                '\\begin{aligned} &5\\sin^2 37^{\\circ} + 5\\cos^2 37^{\\circ} \\\\ &= 5(\\sin^2 37^{\\circ} + \\cos^2 37^{\\circ}) \\\\ &= 5 \\end{aligned}',
              ),
              prose('Take out the common factor first, so the identity can be seen.'),
            ),
            ask('tid-constant-value'),
            ask('tid-rearrange-tiles', 2),
            ask('tid-constant-value+choice', 2),
            teach(
              prose(
                'You can check a simplification by trying one angle. At $x = 30^{\\circ}$, $1 - \\cos^2 x = 1 - \\frac{3}{4} = \\frac{1}{4}$, and $\\sin^2 30^{\\circ} = \\frac{1}{4}$ too.',
              ),
              prose(
                'One agreeing angle does not prove an identity, but a disagreeing one shows straight away that a step went wrong.',
              ),
            ),
            lead(
              'tid-simplify-choice',
              2,
              prose(
                'Two identities can work one after the other. $1 + \\tan^2 x$ is $\\sec^2 x$, and $\\sec x = \\frac{1}{\\cos x}$, so a $\\cos^2 x$ beside it cancels:',
              ),
              maths(
                '\\begin{aligned} &4(1 + \\tan^2 x)\\cos^2 x \\\\ &= 4\\sec^2 x\\cos^2 x \\\\ &= 4 \\times \\frac{1}{\\cos^2 x} \\times \\cos^2 x \\\\ &= 4 \\end{aligned}',
              ),
            ),
            lead(
              'tid-value-from-identity',
              2,
              prose(
                'An identity finds one value from another without finding the angle. Given $\\sin A = \\frac{2}{3}$, find $4\\cos^2 A$:',
              ),
              maths(
                '\\begin{aligned} \\cos^2 A &= 1 - \\sin^2 A \\\\ &= 1 - \\left(\\frac{2}{3}\\right)^2 = \\frac{5}{9} \\\\ 4\\cos^2 A &= 4 \\times \\frac{5}{9} = \\frac{20}{9} \\end{aligned}',
              ),
            ),
          ],
          skillCheck: [
            ask('tid-which-identity-flow', 2),
            ask('tid-constant-value', 2),
            ask('tid-simplify-steps', 2),
          ],
        },
        {
          id: 'ti-l1-quadratic',
          title: 'Equations that Become Quadratics',
          slides: [
            teach(
              prose('This is a quadratic, with $\\sin x$ where the unknown usually goes:'),
              maths('\\begin{aligned} 2\\sin^2 x - \\sin x - 1 &= 0 \\\\ (2\\sin x + 1)(\\sin x - 1) &= 0 \\end{aligned}'),
              prose(
                'So $\\sin x = -\\frac{1}{2}$ or $\\sin x = 1$. Each value then gives its own angles: from $0^{\\circ}$ to $360^{\\circ}$, $\\sin x = 1$ at $90^{\\circ}$, and $\\sin x = -\\frac{1}{2}$ at $210^{\\circ}$ and $330^{\\circ}$.',
              ),
              prose(
                'Sine never goes beyond $1$ or below $-1$, so a factor such as $\\sin x - 3$ gives no angle at all.',
              ),
            ),
            ask('tid-quadratic-tree'),
            ask('tid-solution-count'),
            ask('tid-solution-slider'),
            teach(
              prose(
                'Often the quadratic is disguised by a $\\cos^2 x$. Swap it for $1 - \\sin^2 x$ and everything is in sines:',
              ),
              maths('\\begin{aligned} 2\\cos^2 x + 3\\sin x &= 3 \\\\ 2(1 - \\sin^2 x) + 3\\sin x &= 3 \\end{aligned}'),
              maths('2\\sin^2 x - 3\\sin x + 1 = 0'),
              prose('Collect everything on one side, then multiply through by $-1$ so the squared term is positive.'),
            ),
            ask('tid-disguised-tiles'),
            ask('tid-quadratic-tree', 2),
            lead(
              'tid-solution-count',
              2,
              prose(
                'A quadratic in $\\tan x$ counts differently. Tangent takes **every** value, and each one twice in a turn, $180^{\\circ}$ apart:',
              ),
              maths(
                '\\begin{aligned} \\tan^2 x - 1 &= 0 \\\\ (\\tan x - 1)(\\tan x + 1) &= 0 \\end{aligned}',
              ),
              prose(
                '$\\tan x = 1$ at $45^{\\circ}$ and $225^{\\circ}$; $\\tan x = -1$ at $135^{\\circ}$ and $315^{\\circ}$. Two values, two angles each: four solutions.',
              ),
            ),
            teach(
              prose(
                'The same works the other way round: a $\\sin^2 x$ in an equation about $\\cos x$ becomes $1 - \\cos^2 x$.',
              ),
              prose(
                'And a $\\sec^2 x$ next to $\\tan x$ becomes $1 + \\tan^2 x$, which makes a quadratic in $\\tan x$.',
              ),
            ),
            ask('tid-disguised-tiles', 2),
            ask('tid-solution-slider', 2),
          ],
          skillCheck: [
            ask('tid-quadratic-tree', 2),
            ask('tid-disguised-tiles', 2),
            ask('tid-solution-slider', 2),
          ],
        },
        {
          id: 'ti-l1-tan',
          title: 'Equations that Become tan x = k',
          slides: [
            teach(
              prose('An equation with one sine and one cosine becomes a tangent equation when you divide by $\\cos x$:'),
              maths('\\begin{aligned} \\sin x &= \\sqrt{3}\\cos x \\\\ \\tan x &= \\sqrt{3} \\end{aligned}'),
              prose(
                'That is safe here: where $\\cos x = 0$, $\\sin x$ is $\\pm 1$, so no solution is lost.',
              ),
              prose(
                'Tangent repeats every $180^{\\circ}$, so from $0^{\\circ}$ to $360^{\\circ}$ there are two answers, $180^{\\circ}$ apart: $60^{\\circ}$ and $240^{\\circ}$.',
              ),
            ),
            lead(
              'tid-tan-solve',
              1,
              prose('A negative tangent works the same way. Bring the cosine across first, then divide:'),
              maths('\\begin{aligned} \\sin x + \\cos x &= 0 \\\\ \\sin x &= -\\cos x \\\\ \\tan x &= -1 \\end{aligned}'),
              prose(
                '$\\tan 45^{\\circ} = 1$, and a tangent is negative in the second quadrant, so the angle is $180^{\\circ} - 45^{\\circ} = 135^{\\circ}$. Add $180^{\\circ}$ for the next one: $315^{\\circ}$.',
              ),
            ),
            ask('tid-tan-slider'),
            lead(
              'tid-tan-solve-tiles',
              1,
              prose('Numbers in front come along when you divide:'),
              maths(
                '\\begin{aligned} 2\\sin x + 2\\sqrt{3}\\cos x &= 0 \\\\ 2\\sin x &= -2\\sqrt{3}\\cos x \\\\ \\tan x &= \\frac{-2\\sqrt{3}}{2} = -\\sqrt{3} \\end{aligned}',
              ),
              prose(
                '$\\tan 60^{\\circ} = \\sqrt{3}$, so $x = 180^{\\circ} - 60^{\\circ} = 120^{\\circ}$, and $120^{\\circ} + 180^{\\circ} = 300^{\\circ}$.',
              ),
            ),
            teach(
              prose(
                'Dividing is only safe when the thing you divide by cannot be zero at a solution. Here it can:',
              ),
              maths('2\\sin x\\cos x = \\cos x'),
              prose(
                'Dividing by $\\cos x$ loses every angle where $\\cos x = 0$. Instead bring everything to one side and take out the factor: $\\cos x(2\\sin x - 1) = 0$, so $\\cos x = 0$ or $\\sin x = \\frac{1}{2}$.',
              ),
            ),
            ask('tid-divide-flow'),
            ask('tid-tan-slider', 2),
            teach(
              prose(
                'In radians nothing changes but the numbers: tangent repeats every $\\pi$, so the second answer is the first plus $\\pi$.',
              ),
              maths('\\tan x = 1 \\;\\Rightarrow\\; x = \\frac{\\pi}{4} \\text{ or } \\frac{5\\pi}{4}'),
              prose('To turn a degree answer into radians, multiply by $\\frac{\\pi}{180^{\\circ}}$ and simplify the fraction:'),
              maths('\\begin{aligned} \\tan x &= -\\sqrt{3} \\\\ x &= 120^{\\circ} \\\\ &= \\tfrac{120}{180}\\pi = \\tfrac{2\\pi}{3} \\end{aligned}'),
            ),
            ask('tid-tan-solve+choice', 2),
            ask('tid-tan-solve-tiles', 2),
            ask('tid-divide-flow', 2),
          ],
          skillCheck: [
            ask('tid-tan-solve', 2),
            ask('tid-tan-solve-tiles', 2),
            ask('tid-divide-flow', 2),
          ],
        },
      ],
      levelCheck: [
        ask('tid-rearrange-tiles', 2),
        ask('tid-simplify-steps', 2),
        ask('tid-simplify-choice', 2),
        ask('tid-value-from-identity', 2),
        ask('tid-which-identity-flow', 2),
        ask('tid-constant-value+choice', 2),
        ask('tid-quadratic-tree', 2),
        ask('tid-disguised-tiles', 2),
        ask('tid-solution-count', 2),
        ask('tid-solution-slider', 2),
        ask('tid-tan-solve', 2),
        ask('tid-tan-solve-tiles', 2),
        ask('tid-divide-flow', 2),
        ask('tid-tan-slider', 2),
      ],
    },
    {
      id: 'ti-l2',
      title: 'Compound and Double Angles',
      lessons: [
        {
          id: 'ti-l2-compound',
          title: 'The Compound-Angle Formulae',
          slides: [
            teach(
              prose(
                'The sine of a sum is not the sum of the sines: $\\sin(30^{\\circ} + 60^{\\circ}) = 1$, but $\\sin 30^{\\circ} + \\sin 60^{\\circ}$ is more than $1$. The true formulae are',
              ),
              maths('\\begin{aligned} \\sin(A \\pm B) &= \\sin A\\cos B \\\\ &\\quad \\pm \\cos A\\sin B \\end{aligned}'),
              maths('\\begin{aligned} \\cos(A \\pm B) &= \\cos A\\cos B \\\\ &\\quad \\mp \\sin A\\sin B \\end{aligned}'),
              prose('Sine keeps the sign and mixes the functions. Cosine flips the sign and keeps them paired.'),
            ),
            ask('tid-formula-choice'),
            lead(
              'tid-expand-tiles',
              1,
              prose('With a table angle for $B$, its sine and cosine go straight in. With $A = x$ and $B = 60^{\\circ}$:'),
              maths(
                '\\begin{aligned} \\sin(x + 60^{\\circ}) &= \\sin x\\cos 60^{\\circ} \\\\ &\\quad + \\cos x\\sin 60^{\\circ} \\\\ &= \\frac{1}{2}\\sin x + \\frac{\\sqrt{3}}{2}\\cos x \\end{aligned}',
              ),
            ),
            lead(
              'tid-expand-tiles',
              2,
              prose(
                'Past $90^{\\circ}$ a table value can be negative, and its sign goes in with it. $\\cos 120^{\\circ} = -\\frac{1}{2}$ and $\\sin 120^{\\circ} = \\frac{\\sqrt{3}}{2}$:',
              ),
              maths(
                '\\begin{aligned} \\cos(x + 120^{\\circ}) &= \\cos x\\cos 120^{\\circ} \\\\ &\\quad - \\sin x\\sin 120^{\\circ} \\\\ &= -\\frac{1}{2}\\cos x - \\frac{\\sqrt{3}}{2}\\sin x \\end{aligned}',
              ),
            ),
            teach(
              prose('Read backwards, the formulae collapse two products into one function of one angle:'),
              maths(
                '\\begin{aligned} &\\cos 25^{\\circ}\\cos 35^{\\circ} \\\\ &\\quad - \\sin 25^{\\circ}\\sin 35^{\\circ} \\\\ &= \\cos(25^{\\circ} + 35^{\\circ}) \\\\ &= \\cos 60^{\\circ} = \\frac{1}{2} \\end{aligned}',
              ),
              prose(
                'Cosine times cosine first means cosine, and the minus means the angles add. Sine times cosine first means sine, with the same sign in the bracket:',
              ),
              maths(
                '\\begin{aligned} &\\sin 50^{\\circ}\\cos 20^{\\circ} \\\\ &\\quad - \\cos 50^{\\circ}\\sin 20^{\\circ} \\\\ &= \\sin(50^{\\circ} - 20^{\\circ}) \\\\ &= \\sin 30^{\\circ} = \\frac{1}{2} \\end{aligned}',
              ),
            ),
            ask('tid-collapse-tiles'),
            ask('tid-formula-choice', 2),
            ask('tid-collapse-tiles', 2),
            teach(
              prose(
                'The formulae need all four of $\\sin A$, $\\cos A$, $\\sin B$ and $\\cos B$. Given one, find its partner from $\\sin^2 + \\cos^2 = 1$. If $\\sin A = \\frac{3}{5}$ and $A$ is acute,',
              ),
              maths('\\cos A = \\sqrt{1 - \\tfrac{9}{25}} = \\frac{4}{5}'),
              prose('Acute means the positive root; the 3, 4, 5 triangle is doing the work.'),
            ),
            ask('tid-compound-tree'),
            ask('tid-compound-tree', 2),
          ],
          skillCheck: [
            ask('tid-expand-tiles', 2),
            ask('tid-collapse-tiles', 2),
            ask('tid-compound-tree', 2),
          ],
        },
        {
          id: 'ti-l2-tan',
          title: 'The Tangent Formula',
          slides: [
            teach(
              prose('Dividing $\\sin(A + B)$ by $\\cos(A + B)$, then top and bottom by $\\cos A\\cos B$, gives'),
              maths('\\begin{aligned} &\\tan(A \\pm B) \\\\ &= \\frac{\\tan A \\pm \\tan B}{1 \\mp \\tan A\\tan B} \\end{aligned}'),
              prose(
                'The top keeps the sign, the bottom flips it. With $\\tan A = 2$ and $\\tan B = 3$, $\\tan(A + B) = \\frac{5}{1 - 6} = -1$.',
              ),
            ),
            ask('tid-tan-compound-tree'),
            lead(
              'tid-formula-choice',
              2,
              prose(
                'The tangent formula is built from the sine one, so keep that to hand. Sine mixes the functions and keeps the sign:',
              ),
              maths(
                '\\begin{aligned} \\sin(A \\pm B) &= \\sin A\\cos B \\\\ &\\quad \\pm \\cos A\\sin B \\end{aligned}',
              ),
              prose('So $\\sin(x + 30^{\\circ}) = \\sin x\\cos 30^{\\circ} + \\cos x\\sin 30^{\\circ}$.'),
            ),
            ask('tid-tan-compound'),
            teach(
              prose('When one angle is a table angle, its tangent goes straight in. With $\\tan 45^{\\circ} = 1$,'),
              maths('\\tan(x + 45^{\\circ}) = \\frac{\\tan x + 1}{1 - \\tan x}'),
              prose(
                'With $\\tan 30^{\\circ} = \\frac{1}{\\sqrt{3}}$ there is a fraction inside the fraction. Multiply top and bottom by $\\sqrt{3}$ to clear it:',
              ),
              maths(
                '\\begin{aligned} \\tan(x + 30^{\\circ}) &= \\frac{\\tan x + \\frac{1}{\\sqrt{3}}}{1 - \\frac{1}{\\sqrt{3}}\\tan x} \\\\ &= \\frac{\\sqrt{3}\\tan x + 1}{\\sqrt{3} - \\tan x} \\end{aligned}',
              ),
            ),
            ask('tid-tan-expand-tiles'),
            lead(
              'tid-formula-choice',
              2,
              prose('And the cosine one, which keeps the functions paired and flips the sign:'),
              maths(
                '\\begin{aligned} \\cos(A \\pm B) &= \\cos A\\cos B \\\\ &\\quad \\mp \\sin A\\sin B \\end{aligned}',
              ),
              prose('Read backwards, a plus between the pairs means the angles take away:'),
              maths(
                '\\begin{aligned} &\\cos 70^{\\circ}\\cos 10^{\\circ} \\\\ &\\quad + \\sin 70^{\\circ}\\sin 10^{\\circ} \\\\ &=\\cos(70^{\\circ} - 10^{\\circ}) = \\cos 60^{\\circ} \\end{aligned}',
              ),
            ),
            ask('tid-tan-expand-tiles', 2),
            teach(
              prose('Run the formula backwards to solve. Write $t$ for $\\tan x$:'),
              maths('\\begin{aligned} \\tan(x + 45^{\\circ}) &= 3 \\\\ \\frac{t + 1}{1 - t} &= 3 \\end{aligned}'),
              prose('Multiply out: $t + 1 = 3 - 3t$, so $4t = 2$ and $\\tan x = \\frac{1}{2}$.'),
            ),
            ask('tid-tan-shift-solve'),
            ask('tid-tan-shift-solve+choice', 2),
          ],
          skillCheck: [
            ask('tid-tan-compound', 2),
            ask('tid-tan-expand-tiles', 2),
            ask('tid-tan-shift-solve', 2),
          ],
        },
        {
          id: 'ti-l2-exact',
          title: 'Exact Values from Compound Angles',
          slides: [
            teach(
              prose(
                '$75^{\\circ}$ is not in the table, but $45^{\\circ} + 30^{\\circ}$ is two angles that are, so the formula gives an exact value:',
              ),
              maths(
                '\\begin{aligned} \\sin 75^{\\circ} &= \\sin 45^{\\circ}\\cos 30^{\\circ} \\\\ &\\quad + \\cos 45^{\\circ}\\sin 30^{\\circ} \\\\ &= \\frac{\\sqrt{2}}{2} \\cdot \\frac{\\sqrt{3}}{2} + \\frac{\\sqrt{2}}{2} \\cdot \\frac{1}{2} \\\\ &= \\frac{\\sqrt{6} + \\sqrt{2}}{4} \\end{aligned}',
              ),
            ),
            ask('tid-exact-steps'),
            lead(
              'tid-exact-tiles',
              1,
              prose(
                'Angles past $180^{\\circ}$ have negative table values, and each sign goes in with its value. Take $15^{\\circ} = 225^{\\circ} - 210^{\\circ}$ for the sine:',
              ),
              maths(
                '\\begin{aligned} \\sin 15^{\\circ} &= \\sin 225^{\\circ}\\cos 210^{\\circ} \\\\ &\\quad - \\cos 225^{\\circ}\\sin 210^{\\circ} \\\\ &= \\left(-\\tfrac{\\sqrt{2}}{2}\\right)\\left(-\\tfrac{\\sqrt{3}}{2}\\right) \\\\ &\\quad - \\left(-\\tfrac{\\sqrt{2}}{2}\\right)\\left(-\\tfrac{1}{2}\\right) \\\\ &= \\frac{\\sqrt{6}}{4} - \\frac{\\sqrt{2}}{4} \\end{aligned}',
              ),
              prose('Two negatives multiply to a positive, in each product.'),
            ),
            lead(
              'tid-collapse-tiles',
              2,
              prose('Read backwards, sine times cosine first is a sine, with the same sign in the bracket:'),
              maths(
                '\\begin{aligned} &\\sin 80^{\\circ}\\cos 20^{\\circ} \\\\ &\\quad - \\cos 80^{\\circ}\\sin 20^{\\circ} \\\\ &=\\sin(80^{\\circ} - 20^{\\circ}) \\\\ &= \\sin 60^{\\circ} = \\frac{\\sqrt{3}}{2} \\end{aligned}',
              ),
            ),
            teach(
              prose(
                'Any angle between table angles can be split this way: $15^{\\circ} = 45^{\\circ} - 30^{\\circ}$, $105^{\\circ} = 60^{\\circ} + 45^{\\circ}$, $165^{\\circ} = 120^{\\circ} + 45^{\\circ}$.',
              ),
              prose('Past $90^{\\circ}$ some table values are negative. With $\\cos 120^{\\circ} = -\\frac{1}{2}$:'),
              maths(
                '\\begin{aligned} \\cos 165^{\\circ} &= \\cos 120^{\\circ}\\cos 45^{\\circ} \\\\ &\\quad - \\sin 120^{\\circ}\\sin 45^{\\circ} \\\\ &= -\\frac{1}{2} \\cdot \\frac{\\sqrt{2}}{2} - \\frac{\\sqrt{3}}{2} \\cdot \\frac{\\sqrt{2}}{2} \\\\ &= -\\frac{\\sqrt{2}}{4} - \\frac{\\sqrt{6}}{4} \\end{aligned}',
              ),
            ),
            ask('tid-exact-tiles+choice', 2),
            ask('tid-exact-steps', 2),
            lead(
              'tid-collapse-tiles',
              2,
              prose('Cosine times cosine with a plus is a cosine with the angles taken away:'),
              maths(
                '\\begin{aligned} &\\cos 100^{\\circ}\\cos 40^{\\circ} \\\\ &\\quad + \\sin 100^{\\circ}\\sin 40^{\\circ} \\\\ &=\\cos(100^{\\circ} - 40^{\\circ}) \\\\ &= \\cos 60^{\\circ} = \\frac{1}{2} \\end{aligned}',
              ),
            ),
            teach(
              prose('The tangent formula does the same for tangents, with $15^{\\circ} = 45^{\\circ} - 30^{\\circ}$:'),
              maths(
                '\\begin{aligned} \\tan 15^{\\circ} &= \\frac{1 - \\frac{1}{\\sqrt{3}}}{1 + \\frac{1}{\\sqrt{3}}} = \\frac{\\sqrt{3} - 1}{\\sqrt{3} + 1} \\end{aligned}',
              ),
              prose(
                'That used $\\times \\sqrt{3}$ top and bottom. To clear the root from the bottom, multiply top and bottom by $\\sqrt{3} - 1$, the bottom with its sign flipped:',
              ),
              maths(
                '\\begin{aligned} &= \\frac{(\\sqrt{3} - 1)^2}{(\\sqrt{3} + 1)(\\sqrt{3} - 1)} \\\\ &= \\frac{3 - 2\\sqrt{3} + 1}{3 - 1} \\\\ &= \\frac{4 - 2\\sqrt{3}}{2} = 2 - \\sqrt{3} \\end{aligned}',
              ),
            ),
            lead(
              'tid-tan-exact-choice',
              1,
              prose(
                'An angle in radians is turned into degrees first: $\\pi$ is $180^{\\circ}$, so $\\frac{\\pi}{12} = 15^{\\circ}$ and $\\frac{7\\pi}{12} = 7 \\times 15^{\\circ} = 105^{\\circ}$.',
              ),
              prose('And $\\cot \\theta = \\frac{1}{\\tan \\theta}$, rationalised the same way:'),
              maths(
                '\\begin{aligned} \\cot 15^{\\circ} &= \\frac{1}{2 - \\sqrt{3}} \\\\ &= \\frac{2 + \\sqrt{3}}{(2 - \\sqrt{3})(2 + \\sqrt{3})} \\\\ &= \\frac{2 + \\sqrt{3}}{4 - 3} = 2 + \\sqrt{3} \\end{aligned}',
              ),
            ),
            lead(
              'tid-tan-exact-choice',
              2,
              prose('When the bottom comes out negative, the minus stays with it. With $\\tan 120^{\\circ} = -\\sqrt{3}$:'),
              maths(
                '\\begin{aligned} \\tan 165^{\\circ} &= \\tan(120^{\\circ} + 45^{\\circ}) \\\\ &= \\frac{-\\sqrt{3} + 1}{1 + \\sqrt{3}} \\\\ &= \\frac{(1 - \\sqrt{3})^2}{(1 + \\sqrt{3})(1 - \\sqrt{3})} \\\\ &= \\frac{4 - 2\\sqrt{3}}{1 - 3} = -2 + \\sqrt{3} \\end{aligned}',
              ),
            ),
          ],
          skillCheck: [
            ask('tid-exact-tiles', 2),
            ask('tid-exact-steps', 2),
            ask('tid-tan-exact-choice', 2),
          ],
        },
        {
          id: 'ti-l2-double',
          title: 'The Double-Angle Formulae',
          slides: [
            teach(
              prose('Put $B = A$ in the compound-angle formulae:'),
              maths('\\begin{aligned} \\sin 2A &= 2\\sin A\\cos A \\\\ \\tan 2A &= \\frac{2\\tan A}{1 - \\tan^2 A} \\end{aligned}'),
              maths('\\begin{aligned} \\cos 2A &= \\cos^2 A - \\sin^2 A \\\\ &= 2\\cos^2 A - 1 \\\\ &= 1 - 2\\sin^2 A \\end{aligned}'),
              prose('The three forms of $\\cos 2A$ come from swapping $\\sin^2 A$ or $\\cos^2 A$ with $\\sin^2 + \\cos^2 = 1$.'),
            ),
            ask('tid-double-tiles'),
            lead(
              'tid-double-collapse-choice',
              1,
              prose('Backwards, they collapse an expression to one function of twice the angle:'),
              maths('2\\sin 15^{\\circ}\\cos 15^{\\circ} = \\sin 30^{\\circ} = \\frac{1}{2}'),
              prose('Radians work the same way. Double the angle, then use the table:'),
              maths(
                '\\begin{aligned} 2\\sin \\tfrac{\\pi}{12}\\cos \\tfrac{\\pi}{12} &= \\sin \\left(2 \\times \\tfrac{\\pi}{12}\\right) \\\\ &= \\sin \\tfrac{\\pi}{6} = \\frac{1}{2} \\end{aligned}',
              ),
            ),
            ask('tid-double-tiles', 2),
            teach(
              prose('They also simplify. Pick the form of $\\cos 2x$ that cancels what is there:'),
              maths(
                '\\begin{aligned} 1 + \\cos 2x &= 1 + (2\\cos^2 x - 1) \\\\ &= 2\\cos^2 x \\\\ 1 - \\cos 2x &= 1 - (1 - 2\\sin^2 x) \\\\ &= 2\\sin^2 x \\end{aligned}',
              ),
              prose('Then cancel:'),
              maths(
                '\\begin{aligned} \\frac{3(1 + \\cos 2x)}{\\cos x} &= \\frac{6\\cos^2 x}{\\cos x} \\\\ &= 6\\cos x \\\\ \\frac{\\sin 2x}{\\sin x} &= \\frac{2\\sin x\\cos x}{\\sin x} \\\\ &= 2\\cos x \\end{aligned}',
              ),
            ),
            ask('tid-double-collapse-choice', 2),
            ask('tid-double-steps'),
            ask('tid-double-steps', 2),
            teach(
              prose(
                'Given $\\cos x = \\frac{3}{5}$ with $x$ acute, $\\sin x = \\frac{4}{5}$ from the 3, 4, 5 triangle, so',
              ),
              maths('\\sin 2x = 2 \\cdot \\frac{4}{5} \\cdot \\frac{3}{5} = \\frac{24}{25}'),
              prose(
                'Outside the first quadrant, take the triangle for the sizes and the quadrant for the signs. If $\\cos x = \\frac{5}{13}$ with $270^{\\circ} < x < 360^{\\circ}$, the 5, 12, 13 triangle gives $\\frac{12}{13}$, and sine is negative there:',
              ),
              maths(
                '\\begin{aligned} \\sin x &= -\\tfrac{12}{13} \\\\ \\sin 2x &= 2 \\cdot \\left(-\\tfrac{12}{13}\\right) \\cdot \\tfrac{5}{13} = -\\tfrac{120}{169} \\\\ \\cos 2x &= \\tfrac{25}{169} - \\tfrac{144}{169} = -\\tfrac{119}{169} \\end{aligned}',
              ),
            ),
            ask('tid-double-value'),
            ask('tid-double-value+choice', 2),
          ],
          skillCheck: [
            ask('tid-double-tiles', 2),
            ask('tid-double-steps', 2),
            ask('tid-double-value', 2),
          ],
        },
        {
          id: 'ti-l2-double-eq',
          title: 'Double-Angle Equations',
          slides: [
            teach(
              prose('An equation mixing $2x$ and $x$ needs one angle only. Expand the double angle:'),
              maths('\\begin{aligned} \\sin 2x &= \\sin x \\\\ 2\\sin x\\cos x - \\sin x &= 0 \\end{aligned}'),
              maths('\\sin x(2\\cos x - 1) = 0'),
              prose(
                'So $\\sin x = 0$ or $\\cos x = \\frac{1}{2}$. Dividing by $\\sin x$ instead would have lost every angle where $\\sin x = 0$.',
              ),
            ),
            ask('tid-double-eq-slider'),
            teach(
              prose(
                'With $\\cos 2x$, choose the form that leaves one function. Next to $\\cos x$, use $2\\cos^2 x - 1$:',
              ),
              maths('\\begin{aligned} \\cos 2x - 3\\cos x + 2 &= 0 \\\\ (2\\cos^2 x - 1) - 3\\cos x + 2 &= 0 \\\\ 2\\cos^2 x - 3\\cos x + 1 &= 0 \\end{aligned}'),
              prose('Next to $\\sin x$, use $1 - 2\\sin^2 x$:'),
              maths('\\begin{aligned} \\cos 2x + \\sin x &= 0 \\\\ (1 - 2\\sin^2 x) + \\sin x &= 0 \\\\ 2\\sin^2 x - \\sin x - 1 &= 0 \\end{aligned}'),
              prose('Either way it is a quadratic you already know how to finish.'),
            ),
            ask('tid-double-eq-flow'),
            ask('tid-double-quadratic-tiles'),
            ask('tid-double-eq-flow', 2),
            ask('tid-double-eq-slider', 2),
            ask('tid-double-quadratic-tiles', 2),
            teach(
              prose(
                'When the equation is in $2x$ alone, solve for $2x$ first, over the doubled range, then halve. For $0^{\\circ} \\le x < 360^{\\circ}$, $2x$ runs from $0^{\\circ}$ to $720^{\\circ}$:',
              ),
              maths('\\begin{aligned} \\sin 2x &= \\tfrac{1}{2} \\\\ 2x &= 30^{\\circ}, 150^{\\circ}, 390^{\\circ}, 510^{\\circ} \\end{aligned}'),
              prose('So $x = 15^{\\circ}, 75^{\\circ}, 195^{\\circ}, 255^{\\circ}$: twice as many solutions as $\\sin x = \\frac{1}{2}$ has.'),
            ),
            ask('tid-double-eq-tree'),
            ask('tid-double-eq-tree', 2),
          ],
          skillCheck: [
            ask('tid-double-eq-flow', 2),
            ask('tid-double-quadratic-tiles', 2),
            ask('tid-double-eq-tree', 2),
          ],
        },
      ],
      levelCheck: [
        ask('tid-expand-tiles', 2),
        ask('tid-collapse-tiles', 2),
        ask('tid-compound-tree', 2),
        ask('tid-tan-compound+choice', 2),
        ask('tid-tan-expand-tiles', 2),
        ask('tid-tan-shift-solve', 2),
        ask('tid-exact-tiles', 2),
        ask('tid-exact-steps', 2),
        ask('tid-tan-exact-choice', 2),
        ask('tid-double-value', 2),
        ask('tid-double-collapse-choice', 2),
        ask('tid-double-steps', 2),
        ask('tid-double-eq-flow', 2),
        ask('tid-double-quadratic-tiles', 2),
        ask('tid-double-eq-tree', 2),
      ],
    },
    {
      id: 'ti-l3',
      title: 'The Form R sin(x + α)',
      lessons: [
        {
          id: 'ti-l3-match',
          title: 'Matching the Expansion',
          slides: [
            teach(
              prose(
                'Any $a\\sin x + b\\cos x$ is one wave in disguise: $R\\sin(x + \\alpha)$, for the right $R$ and $\\alpha$. Expanding shows why:',
              ),
              maths('\\begin{aligned} &R\\sin(x + \\alpha) \\\\ &= R\\cos\\alpha\\,\\sin x \\\\ &\\quad + R\\sin\\alpha\\,\\cos x \\end{aligned}'),
              prose('$R\\cos\\alpha$ and $R\\sin\\alpha$ are just two numbers, one in front of $\\sin x$ and one in front of $\\cos x$.'),
            ),
            ask('tid-r-expand-tiles'),
            lead(
              'tid-r-match-tiles+choice',
              1,
              prose('To write $3\\sin x + 4\\cos x$ as $R\\sin(x + \\alpha)$, set it beside the expansion and match the numbers in front of each function:'),
              maths(
                '\\begin{aligned} &3\\sin x + 4\\cos x \\\\ &= R\\cos\\alpha\\,\\sin x + R\\sin\\alpha\\,\\cos x \\\\[6pt] &R\\cos\\alpha = 3 \\qquad R\\sin\\alpha = 4 \\end{aligned}',
              ),
            ),
            ask('tid-r-expand-tiles', 2),
            teach(
              prose(
                'Two added terms fit $R\\sin(x + \\alpha)$ or $R\\cos(x - \\alpha)$, so a question always says which it wants. A minus needs a form with a minus in it:',
              ),
              maths(
                '\\begin{aligned} &R\\sin(x - \\alpha) \\\\ &= R\\cos\\alpha\\,\\sin x - R\\sin\\alpha\\,\\cos x \\\\[6pt] &R\\cos(x + \\alpha) \\\\ &= R\\cos\\alpha\\,\\cos x - R\\sin\\alpha\\,\\sin x \\end{aligned}',
              ),
              prose(
                'Pick the one whose minus falls where yours does. In $5\\sin x - 2\\cos x$ the minus is in front of the $\\cos x$, so it is $R\\sin(x - \\alpha)$ with $R\\cos\\alpha = 5$ and $R\\sin\\alpha = 2$. The minus lives in the form, so both numbers stay positive and $\\alpha$ is acute.',
              ),
            ),
            ask('tid-r-form-flow'),
            lead(
              'tid-r-match-tiles',
              2,
              prose('The fourth form, $R\\cos(x - \\alpha)$, expands with a plus. Match against its own expansion, cosine term first:'),
              maths(
                '\\begin{aligned} &R\\cos(x - \\alpha) \\\\ &= R\\cos\\alpha\\,\\cos x + R\\sin\\alpha\\,\\sin x \\end{aligned}',
              ),
              prose('So $4\\cos x + 3\\sin x$ has $R\\cos\\alpha = 4$ and $R\\sin\\alpha = 3$.'),
            ),
            ask('tid-r-form-flow', 2),
            teach(
              prose('Square both and add. Since $\\cos^2\\alpha + \\sin^2\\alpha = 1$, the $\\alpha$ drops out:'),
              maths('\\begin{aligned} R^2 &= 3^2 + 4^2 = 25 \\\\ R &= 5 \\end{aligned}'),
              prose('Divide one by the other and $R$ drops out instead: $\\tan\\alpha = \\frac{4}{3}$.'),
            ),
            ask('tid-r-squared-tree'),
            ask('tid-r-squared-tree', 2),
          ],
          skillCheck: [
            ask('tid-r-match-tiles', 2),
            ask('tid-r-form-flow', 2),
            ask('tid-r-squared-tree', 2),
          ],
        },
        {
          id: 'ti-l3-find',
          title: 'Finding R and α',
          slides: [
            teach(
              prose('For $a\\sin x + b\\cos x$ written as $R\\sin(x + \\alpha)$, matching gives both at once:'),
              maths('\\begin{aligned} R &= \\sqrt{a^2 + b^2} \\\\ \\tan\\alpha &= \\frac{b}{a} \\end{aligned}'),
              prose(
                'So $12\\sin x + 5\\cos x$ has $R = \\sqrt{144 + 25} = 13$. The top of $\\tan\\alpha$ is always the $R\\sin\\alpha$ number.',
              ),
            ),
            ask('tid-r-value'),
            teach(
              prose(
                "With $R\\cos\\alpha$ and $R\\sin\\alpha$ both positive, $\\alpha$ is acute, so it is exactly the angle a calculator's $\\tan^{-1}$ gives:",
              ),
              maths('\\begin{aligned} R\\cos\\alpha &= 3, \\quad R\\sin\\alpha = 4 \\\\ \\tan\\alpha &= \\tfrac{4}{3} \\\\ \\alpha &= \\tan^{-1}\\tfrac{4}{3} = 53.1^{\\circ} \\end{aligned}'),
              maths('\\begin{aligned} &3\\sin x + 4\\cos x \\\\ &= 5\\sin(x + 53.1^{\\circ}) \\end{aligned}'),
              prose('Flip the fraction and you get $36.9^{\\circ}$, the other angle of the 3, 4, 5 triangle: the commonest slip here.'),
            ),
            ask('tid-r-alpha-steps'),
            ask('tid-r-tan-alpha'),
            ask('tid-r-convert-choice'),
            ask('tid-r-alpha-steps', 2),
            teach(
              prose('The other forms work the same way. In $R\\cos(x - \\alpha)$, the number in front of $\\cos x$ is $R\\cos\\alpha$:'),
              maths('\\begin{aligned} &R\\cos(x - \\alpha) \\\\ &= R\\cos\\alpha\\,\\cos x \\\\ &\\quad + R\\sin\\alpha\\,\\sin x \\end{aligned}'),
              prose(
                "So $4\\cos x + 3\\sin x = 5\\cos(x - 36.9^{\\circ})$, with $\\tan\\alpha = \\frac{3}{4}$. Always match against the form's own expansion.",
              ),
            ),
            ask('tid-r-value+choice', 2),
            lead(
              'tid-r-tan-alpha',
              2,
              prose('With a minus in front of the $\\cos x$, use $R\\sin(x - \\alpha)$ and match against its expansion:'),
              maths(
                '\\begin{aligned} &R\\sin(x - \\alpha) \\\\ &= R\\cos\\alpha\\,\\sin x - R\\sin\\alpha\\,\\cos x \\end{aligned}',
              ),
              prose(
                'So $12\\sin x - 5\\cos x$ has $R\\cos\\alpha = 12$ and $R\\sin\\alpha = 5$: $R = \\sqrt{144 + 25} = 13$, $\\tan\\alpha = \\frac{5}{12}$ and $\\alpha = 22.6^{\\circ}$.',
              ),
            ),
            ask('tid-r-convert-choice', 2),
          ],
          skillCheck: [
            ask('tid-r-value', 2),
            ask('tid-r-alpha-steps', 2),
            ask('tid-r-convert-choice', 2),
          ],
        },
        {
          id: 'ti-l3-table',
          title: 'Table Angles',
          slides: [
            teach(
              prose('When the two numbers are equal, $\\tan\\alpha = 1$ and $\\alpha = 45^{\\circ}$ exactly. $R$ is then a surd:'),
              maths('\\begin{aligned} &\\sin x + \\cos x \\\\ &= \\sqrt{2}\\sin(x + 45^{\\circ}) \\end{aligned}'),
              prose('Here $R = \\sqrt{1^2 + 1^2} = \\sqrt{2}$. Keep it as a surd: that is exact, and a decimal is not.'),
            ),
            lead(
              'tid-r-exact-alpha',
              1,
              prose(
                'A $1$ and a $\\sqrt{3}$ give $30^{\\circ}$ or $60^{\\circ}$. With a minus in front of the $\\cos x$, use $R\\sin(x - \\alpha)$:',
              ),
              maths(
                '\\begin{aligned} &\\sqrt{3}\\sin x - \\cos x \\\\ &R\\cos\\alpha = \\sqrt{3}, \\quad R\\sin\\alpha = 1 \\\\ &R = \\sqrt{3 + 1} = 2 \\\\ &\\tan\\alpha = \\tfrac{1}{\\sqrt{3}}, \\quad \\alpha = 30^{\\circ} \\\\ &\\text{so } 2\\sin(x - 30^{\\circ}) \\end{aligned}',
              ),
              prose('Swap the numbers and $\\tan\\alpha = \\sqrt{3}$ gives $60^{\\circ}$.'),
            ),
            ask('tid-r-exact-tiles'),
            lead(
              'tid-r-expand-exact-choice',
              1,
              prose('Backwards, expand and put in $\\cos 45^{\\circ} = \\sin 45^{\\circ} = \\frac{\\sqrt{2}}{2}$:'),
              maths(
                '\\begin{aligned} &2\\sqrt{2}\\sin(x + 45^{\\circ}) \\\\ &= 2\\sqrt{2}\\cos 45^{\\circ}\\,\\sin x \\\\ &\\quad + 2\\sqrt{2}\\sin 45^{\\circ}\\,\\cos x \\\\ &= 2\\sqrt{2} \\cdot \\tfrac{\\sqrt{2}}{2}\\sin x \\\\ &\\quad + 2\\sqrt{2} \\cdot \\tfrac{\\sqrt{2}}{2}\\cos x \\\\ &= 2\\sin x + 2\\cos x \\end{aligned}',
              ),
            ),
            teach(
              prose('The cosine forms match against their own expansions. A minus in front of the $\\sin x$ fits $R\\cos(x + \\alpha)$:'),
              maths(
                '\\begin{aligned} &R\\cos(x + \\alpha) \\\\ &= R\\cos\\alpha\\,\\cos x - R\\sin\\alpha\\,\\sin x \\end{aligned}',
              ),
              prose(
                'So $\\sqrt{3}\\cos x - \\sin x$ has $R\\cos\\alpha = \\sqrt{3}$ and $R\\sin\\alpha = 1$: $R = 2$ and $\\alpha = 30^{\\circ}$, giving $2\\cos(x + 30^{\\circ})$. With a plus it is $R\\cos(x - \\alpha)$, matched the same way.',
              ),
            ),
            ask('tid-r-squared-tree', 2),
            ask('tid-r-exact-tiles', 2),
            teach(
              prose('In radians the same angles are $\\frac{\\pi}{6}$, $\\frac{\\pi}{4}$ and $\\frac{\\pi}{3}$:'),
              maths('\\begin{aligned} &\\sin x - \\cos x \\\\ &= \\sqrt{2}\\sin\\left(x - \\frac{\\pi}{4}\\right) \\end{aligned}'),
              prose('Only the unit of $\\alpha$ changes; $R$ is the same either way.'),
            ),
            ask('tid-r-exact-alpha', 2),
            lead(
              'tid-r-expand-exact-choice',
              2,
              prose('A cosine form expands with its own formula, minus and all:'),
              maths(
                '\\begin{aligned} &2\\sqrt{2}\\cos(x + 45^{\\circ}) \\\\ &= 2\\sqrt{2}\\cos 45^{\\circ}\\,\\cos x \\\\ &\\quad - 2\\sqrt{2}\\sin 45^{\\circ}\\,\\sin x \\\\ &= 2\\cos x - 2\\sin x \\end{aligned}',
              ),
            ),
            ask('tid-r-squared-tree', 2),
          ],
          skillCheck: [
            ask('tid-r-exact-tiles', 2),
            ask('tid-r-exact-alpha', 2),
            ask('tid-r-expand-exact-choice', 2),
          ],
        },
        {
          id: 'ti-l3-extremes',
          title: 'Greatest and Least Values',
          slides: [
            teach(
              prose('A sine or cosine never leaves $-1$ to $1$, so $R\\sin(x + \\alpha)$ never leaves $-R$ to $R$. For $3\\sin x + 4\\cos x$, find $R$ first:'),
              maths('R = \\sqrt{3^2 + 4^2} = \\sqrt{25} = 5'),
              maths('-5 \\le 3\\sin x + 4\\cos x \\le 5'),
              prose(
                'The greatest value, $5$, comes where $x + \\alpha = 90^{\\circ}$; the least, $-5$, where $x + \\alpha = 270^{\\circ}$. The same holds whichever form it is written in: only $R$ matters for the values.',
              ),
            ),
            ask('tid-r-max-value'),
            ask('tid-r-max-tiles'),
            lead(
              'tid-r-peak-slider',
              1,
              prose('To find **where**, convert first. $\\sqrt{3}\\sin x - \\cos x$ has $R = \\sqrt{3 + 1} = 2$ and $\\tan\\alpha = \\frac{1}{\\sqrt{3}}$:'),
              maths('\\sqrt{3}\\sin x - \\cos x = 2\\sin(x - 30^{\\circ})'),
              prose('A sine is least, $-1$, when its angle is $270^{\\circ}$:'),
              maths('\\begin{aligned} x - 30^{\\circ} &= 270^{\\circ} \\\\ x &= 300^{\\circ} \\end{aligned}'),
            ),
            teach(
              prose('A constant added just lifts or drops the whole wave. With $R = 5$:'),
              maths('\\begin{aligned} &2 + 3\\sin x + 4\\cos x \\\\ &\\text{runs from } -3 \\text{ to } 7 \\end{aligned}'),
              prose(
                'For where it happens, solve for the bracket: $5\\sin(x + 30^{\\circ})$ is greatest when $x + 30^{\\circ} = 90^{\\circ}$, at $x = 60^{\\circ}$. A cosine is greatest when its bracket is $0^{\\circ}$ or $360^{\\circ}$.',
              ),
            ),
            ask('tid-r-max-value+choice', 2),
            ask('tid-r-extreme-flow'),
            ask('tid-r-max-tiles', 2),
            teach(
              prose(
                'Under a fraction it turns round. The bottom of $\\frac{10}{7 + 3\\sin x + 4\\cos x}$ runs from $7 - 5 = 2$ to $7 + 5 = 12$, so',
              ),
              maths('\\begin{aligned} \\text{greatest} &= \\tfrac{10}{2} = 5 \\\\ \\text{least} &= \\tfrac{10}{12} = \\tfrac{5}{6} \\end{aligned}'),
              prose('The greatest value of the fraction comes with the least value of the bottom.'),
            ),
            ask('tid-r-extreme-flow', 2),
            lead(
              'tid-r-peak-slider',
              2,
              prose('A cosine form is least where its bracket is $180^{\\circ}$. $\\sqrt{3}\\cos x - \\sin x$ is $R\\cos(x + \\alpha)$ with $R\\cos\\alpha = \\sqrt{3}$ and $R\\sin\\alpha = 1$:'),
              maths('\\sqrt{3}\\cos x - \\sin x = 2\\cos(x + 30^{\\circ})'),
              prose('A cosine is least, $-1$, when its angle is $180^{\\circ}$:'),
              maths('\\begin{aligned} x + 30^{\\circ} &= 180^{\\circ} \\\\ x &= 150^{\\circ} \\end{aligned}'),
            ),
          ],
          skillCheck: [
            ask('tid-r-max-value', 2),
            ask('tid-r-max-tiles', 2),
            ask('tid-r-extreme-flow', 2),
          ],
        },
        {
          id: 'ti-l3-solve',
          title: 'Solving a sin x + b cos x = c',
          slides: [
            teach(
              prose('Convert first, and the equation has only one trig function in it:'),
              maths(
                '\\begin{aligned} \\sqrt{3}\\sin x + \\cos x &= 1 \\\\ 2\\sin(x + 30^{\\circ}) &= 1 \\\\ \\sin(x + 30^{\\circ}) &= \\tfrac{1}{2} \\end{aligned}',
              ),
              prose(
                'Solve for the whole bracket over its own range. For $0^{\\circ} \\le x < 360^{\\circ}$, $x + 30^{\\circ}$ runs from $30^{\\circ}$ to $390^{\\circ}$, so',
              ),
              maths('\\begin{aligned} x + 30^{\\circ} &= 30^{\\circ}, 150^{\\circ} \\\\ x &= 0^{\\circ}, 120^{\\circ} \\end{aligned}'),
            ),
            ask('tid-r-solve-angle'),
            teach(
              prose('With a minus the bracket takes away, and its range starts below $0^{\\circ}$:'),
              maths(
                '\\begin{aligned} \\sqrt{3}\\sin x - \\cos x &= 1 \\\\ 2\\sin(x - 30^{\\circ}) &= 1 \\\\ \\sin(x - 30^{\\circ}) &= \\tfrac{1}{2} \\end{aligned}',
              ),
              prose(
                'As $x$ runs from $0^{\\circ}$ to $360^{\\circ}$, $x - 30^{\\circ}$ runs from $-30^{\\circ}$ to $330^{\\circ}$. The table gives $30^{\\circ}$ and $150^{\\circ}$, both inside, so $x = 60^{\\circ}$ or $180^{\\circ}$.',
              ),
              prose(
                'A table angle that falls outside the range moves by $360^{\\circ}$ to come in: with $x - 60^{\\circ}$, running from $-60^{\\circ}$ to $300^{\\circ}$, a $330^{\\circ}$ becomes $-30^{\\circ}$.',
              ),
            ),
            ask('tid-r-solve-steps'),
            ask('tid-r-solve-slider'),
            teach(
              prose(
                'Compare $c$ with $R$ before solving. $\\sin(x + \\alpha) = \\frac{c}{R}$ has two solutions a turn when $c$ is between $-R$ and $R$, one when $c = \\pm R$, and none beyond.',
              ),
              maths('\\begin{aligned} 3\\sin x + 4\\cos x &= 2 \\\\ 5\\sin(x + \\alpha) &= 2 \\\\ \\sin(x + \\alpha) &= \\tfrac{2}{5} \\end{aligned}'),
              prose(
                '$\\frac{2}{5}$ is between $-1$ and $1$: two solutions. But $3\\sin x + 4\\cos x = 6$ gives $\\sin(x + \\alpha) = \\frac{6}{5}$, beyond $1$: none at all, since the wave never reaches $6$.',
              ),
            ),
            ask('tid-r-count-flow'),
            lead(
              'tid-r-solve-steps',
              2,
              prose('A cosine form is solved the same way, with the cosine table:'),
              maths(
                '\\begin{aligned} \\sqrt{3}\\cos x - \\sin x &= 1 \\\\ 2\\cos(x + 30^{\\circ}) &= 1 \\\\ \\cos(x + 30^{\\circ}) &= \\tfrac{1}{2} \\end{aligned}',
              ),
              prose(
                '$x + 30^{\\circ}$ runs from $30^{\\circ}$ to $390^{\\circ}$, and $\\cos = \\frac{1}{2}$ at $60^{\\circ}$ and $300^{\\circ}$. Take $30^{\\circ}$ off: $x = 30^{\\circ}$ or $270^{\\circ}$.',
              ),
            ),
            lead(
              'tid-r-solve-angle+choice',
              2,
              prose(
                'For an answer in radians, solve in degrees, then multiply by $\\frac{\\pi}{180^{\\circ}}$: $60^{\\circ} = \\frac{60}{180}\\pi = \\frac{\\pi}{3}$, and $165^{\\circ} = \\frac{165}{180}\\pi = \\frac{11\\pi}{12}$.',
              ),
            ),
            ask('tid-r-count-flow', 2),
            ask('tid-r-solve-slider', 2),
          ],
          skillCheck: [
            ask('tid-r-solve-steps', 2),
            ask('tid-r-solve-angle', 2),
            ask('tid-r-count-flow', 2),
          ],
        },
      ],
      levelCheck: [
        ask('tid-r-match-tiles', 2),
        ask('tid-r-form-flow', 2),
        ask('tid-r-squared-tree', 2),
        ask('tid-r-value', 2),
        ask('tid-r-alpha-steps', 2),
        ask('tid-r-convert-choice', 2),
        ask('tid-r-exact-tiles', 2),
        ask('tid-r-exact-alpha', 2),
        ask('tid-r-expand-exact-choice', 2),
        ask('tid-r-max-value', 2),
        ask('tid-r-max-tiles', 2),
        ask('tid-r-extreme-flow', 2),
        ask('tid-r-solve-steps', 2),
        ask('tid-r-count-flow', 2),
        ask('tid-r-solve-angle', 2),
      ],
    },
    {
      id: 'ti-l4',
      title: 'Half-Angle and Multiple-Angle Formulae',
      lessons: [
        {
          id: 'ti-l4-half',
          title: 'The Half-Angle Formulae',
          slides: [
            teach(
              prose('Both double-angle forms of the cosine hold for any angle $A$:'),
              maths('\\begin{aligned} \\cos 2A &= 1 - 2\\sin^2 A \\\\ &= 2\\cos^2 A - 1 \\end{aligned}'),
              prose('Put $A = \\tfrac{x}{2}$, so $2A = x$, and each rearranges to a square of a half angle:'),
              maths('\\begin{aligned} \\sin^2 \\tfrac{x}{2} &= \\tfrac{1 - \\cos x}{2} \\\\ \\cos^2 \\tfrac{x}{2} &= \\tfrac{1 + \\cos x}{2} \\end{aligned}'),
            ),
            ask('tid-half-tiles'),
            teach(
              prose('Read the other way, they clear a $1$ from beside a cosine. And $\\sin 2A = 2\\sin A\\cos A$ with $A = \\tfrac{x}{2}$ gives the third:'),
              maths('\\begin{aligned} 1 - \\cos x &= 2\\sin^2 \\tfrac{x}{2} \\\\ 1 + \\cos x &= 2\\cos^2 \\tfrac{x}{2} \\\\ \\sin x &= 2\\sin \\tfrac{x}{2}\\cos \\tfrac{x}{2} \\end{aligned}'),
              prose('So a number times $1 - \\cos x$ becomes a square, and a sine cancels:'),
              maths(
                '\\begin{aligned} 3 - 3\\cos x &= 3(1 - \\cos x) \\\\ &= 6\\sin^2 \\tfrac{x}{2} \\\\ \\frac{1 - \\cos x}{\\sin x} &= \\frac{2\\sin^2 \\frac{x}{2}}{2\\sin \\frac{x}{2}\\cos \\frac{x}{2}} \\\\ &= \\tan \\tfrac{x}{2} \\end{aligned}',
              ),
            ),
            lead(
              'tid-half-simplify-steps',
              1,
              prose('Rewrite the whole angle in the half angle, then cancel:'),
              maths(
                '\\begin{aligned} \\frac{6\\sin x}{\\cos \\frac{x}{2}} &= \\frac{12\\sin \\frac{x}{2}\\cos \\frac{x}{2}}{\\cos \\frac{x}{2}} \\\\ &= 12\\sin \\tfrac{x}{2} \\end{aligned}',
              ),
            ),
            ask('tid-half-rewrite-flow'),
            lead(
              'tid-half-tiles',
              2,
              prose(
                'The tangent has a second form. Multiply the top and bottom of $\\frac{\\sin \\frac{x}{2}}{\\cos \\frac{x}{2}}$ by $2\\cos \\tfrac{x}{2}$:',
              ),
              maths(
                '\\begin{aligned} \\tan \\tfrac{x}{2} &= \\frac{2\\sin \\frac{x}{2}\\cos \\frac{x}{2}}{2\\cos^2 \\frac{x}{2}} \\\\ &= \\frac{\\sin x}{1 + \\cos x} \\end{aligned}',
              ),
              prose(
                'Check at $x = 60^{\\circ}$: $\\frac{\\sqrt{3}/2}{1 + 1/2} = \\frac{1}{\\sqrt{3}}$, which is $\\tan 30^{\\circ}$.',
              ),
            ),
            ask('tid-half-simplify-steps', 2),
            teach(
              prose('Taking the square root leaves a choice of sign:'),
              maths('\\sin \\tfrac{x}{2} = \\pm\\sqrt{\\tfrac{1 - \\cos x}{2}}'),
              prose(
                'The sign comes from where the **half** angle lies, not $x$. If $180^{\\circ} < x < 360^{\\circ}$ then $90^{\\circ} < \\tfrac{x}{2} < 180^{\\circ}$, where the sine is positive and the cosine negative, so',
              ),
              maths('\\begin{aligned} \\sin \\tfrac{x}{2} &= +\\sqrt{\\tfrac{1 - \\cos x}{2}} \\\\ \\cos \\tfrac{x}{2} &= -\\sqrt{\\tfrac{1 + \\cos x}{2}} \\end{aligned}'),
            ),
            ask('tid-half-sign-choice'),
            ask('tid-half-rewrite-flow', 2),
            ask('tid-half-sign-choice', 2),
          ],
          skillCheck: [
            ask('tid-half-tiles', 2),
            ask('tid-half-simplify-steps', 2),
            ask('tid-half-rewrite-flow', 2),
          ],
        },
        {
          id: 'ti-l4-value',
          title: 'Half-Angle Values',
          slides: [
            teach(
              prose('Knowing $\\cos x$ is enough for every ratio of $\\tfrac{x}{2}$. With $\\cos x = \\tfrac{7}{25}$ and $0^{\\circ} < x < 90^{\\circ}$:'),
              maths('\\begin{aligned} \\sin^2 \\tfrac{x}{2} &= \\tfrac{1 - \\frac{7}{25}}{2} = \\tfrac{9}{25} \\\\ \\cos^2 \\tfrac{x}{2} &= \\tfrac{1 + \\frac{7}{25}}{2} = \\tfrac{16}{25} \\end{aligned}'),
              prose('So $\\sin \\tfrac{x}{2} = \\tfrac{3}{5}$, $\\cos \\tfrac{x}{2} = \\tfrac{4}{5}$ and $\\tan \\tfrac{x}{2} = \\tfrac{3}{4}$.'),
            ),
            ask('tid-half-value'),
            ask('tid-half-root-steps'),
            ask('tid-half-square-tree'),
            teach(
              prose('The signs come from halving the range. With $270^{\\circ} < x < 360^{\\circ}$:'),
              maths('135^{\\circ} < \\tfrac{x}{2} < 180^{\\circ}'),
              prose('That is the second quadrant, so $\\sin \\tfrac{x}{2}$ is positive while $\\cos \\tfrac{x}{2}$ and $\\tan \\tfrac{x}{2}$ are negative.'),
            ),
            ask('tid-half-sign-flow'),
            lead(
              'tid-half-value+choice',
              2,
              prose('A negative range halves the same way. With $\\cos x = \\tfrac{7}{25}$ and $-180^{\\circ} < x < 0^{\\circ}$:'),
              maths(
                '\\begin{aligned} -90^{\\circ} &< \\tfrac{x}{2} < 0^{\\circ} \\\\ \\sin^2 \\tfrac{x}{2} &= \\tfrac{1 - \\frac{7}{25}}{2} = \\tfrac{9}{25} \\end{aligned}',
              ),
              prose('Below $0^{\\circ}$ is the fourth quadrant, where the sine is negative: $\\sin \\tfrac{x}{2} = -\\tfrac{3}{5}$.'),
            ),
            ask('tid-half-root-steps', 2),
            teach(
              prose(
                'Given $\\sin x$ instead, find $\\cos x$ first, with its sign from where $x$ lies. If $\\sin x = \\tfrac{24}{25}$ and $x$ is obtuse, $\\cos x = -\\tfrac{7}{25}$, and then',
              ),
              maths('\\sin^2 \\tfrac{x}{2} = \\tfrac{1 + \\frac{7}{25}}{2} = \\tfrac{16}{25}'),
              prose('Two signs to settle, then: the sign of $\\cos x$ from $x$, and the sign of the root from $\\tfrac{x}{2}$.'),
            ),
            ask('tid-half-square-tree', 2),
            ask('tid-half-sign-flow', 2),
          ],
          skillCheck: [
            ask('tid-half-value', 2),
            ask('tid-half-square-tree', 2),
            ask('tid-half-sign-flow', 2),
          ],
        },
        {
          id: 'ti-l4-exact',
          title: 'Exact Values at 15° and 22.5°',
          slides: [
            teach(
              prose('$15^{\\circ}$ is half of $30^{\\circ}$, whose cosine is exact:'),
              maths('\\begin{aligned} \\cos^2 15^{\\circ} &= \\tfrac{1 + \\frac{\\sqrt{3}}{2}}{2} = \\tfrac{2 + \\sqrt{3}}{4} \\\\ \\sin^2 15^{\\circ} &= \\tfrac{1 - \\frac{\\sqrt{3}}{2}}{2} = \\tfrac{2 - \\sqrt{3}}{4} \\end{aligned}'),
              prose(
                'Multiplying top and bottom by $2$ clears the fraction inside the fraction. Then take the root, top and bottom separately. $15^{\\circ}$ is acute, so the root is positive:',
              ),
              maths('\\begin{aligned} \\sin 15^{\\circ} &= \\sqrt{\\tfrac{2 - \\sqrt{3}}{4}} = \\tfrac{\\sqrt{2 - \\sqrt{3}}}{\\sqrt{4}} \\\\ &= \\tfrac{1}{2}\\sqrt{2 - \\sqrt{3}} \\end{aligned}'),
            ),
            ask('tid-half-exact-tiles'),
            ask('tid-half-surd-tree'),
            lead(
              'tid-half-exact-choice',
              1,
              prose(
                'An angle in radians is turned into degrees first, with $\\pi = 180^{\\circ}$: $\\frac{\\pi}{12} = 15^{\\circ}$, half of $\\frac{\\pi}{6} = 30^{\\circ}$, and $\\frac{\\pi}{8} = 22.5^{\\circ}$, half of $\\frac{\\pi}{4} = 45^{\\circ}$.',
              ),
              maths('\\begin{aligned} \\cos^2 \\tfrac{\\pi}{12} &= \\tfrac{1 + \\frac{\\sqrt{3}}{2}}{2} = \\tfrac{2 + \\sqrt{3}}{4} \\\\ \\cos \\tfrac{\\pi}{12} &= \\tfrac{1}{2}\\sqrt{2 + \\sqrt{3}} \\end{aligned}'),
            ),
            teach(
              prose('When the whole angle is past $90^{\\circ}$, its cosine is negative and the sign goes in with it. $75^{\\circ}$ is half of $150^{\\circ}$, where $\\cos 150^{\\circ} = -\\frac{\\sqrt{3}}{2}$:'),
              maths('\\begin{aligned} \\sin^2 75^{\\circ} &= \\tfrac{1 - (-\\frac{\\sqrt{3}}{2})}{2} = \\tfrac{2 + \\sqrt{3}}{4} \\\\ \\sin 75^{\\circ} &= \\tfrac{1}{2}\\sqrt{2 + \\sqrt{3}} \\end{aligned}'),
              prose(
                'An obtuse half angle takes the negative root where its ratio is negative. $157.5^{\\circ}$ is half of $315^{\\circ}$, with $\\cos 315^{\\circ} = \\frac{\\sqrt{2}}{2}$, and a cosine is negative in the second quadrant:',
              ),
              maths('\\begin{aligned} \\cos^2 157.5^{\\circ} &= \\tfrac{1 + \\frac{\\sqrt{2}}{2}}{2} = \\tfrac{2 + \\sqrt{2}}{4} \\\\ \\cos 157.5^{\\circ} &= -\\tfrac{1}{2}\\sqrt{2 + \\sqrt{2}} \\end{aligned}'),
            ),
            ask('tid-half-exact-tiles', 2),
            ask('tid-half-surd-tree', 2),
            lead(
              'tid-half-exact-choice',
              2,
              prose('Run it backwards to find the angle. Which acute angle has $\\sin \\theta = \\tfrac{1}{2}\\sqrt{2 - \\sqrt{3}}$? Square it and read the formula:'),
              maths(
                '\\begin{aligned} \\sin^2 \\theta &= \\tfrac{2 - \\sqrt{3}}{4} = \\tfrac{1 - \\frac{\\sqrt{3}}{2}}{2} \\\\ &= \\tfrac{1 - \\cos 30^{\\circ}}{2} = \\sin^2 15^{\\circ} \\end{aligned}',
              ),
              prose('So $\\theta = 15^{\\circ}$: the whole angle is $30^{\\circ}$, and the angle asked for is half of it.'),
            ),
            teach(
              prose('A tangent needs no root at all:'),
              maths('\\tan \\tfrac{x}{2} = \\tfrac{1 - \\cos x}{\\sin x}'),
              prose('Multiply top and bottom by $2$, then clear the root from the bottom by multiplying by $\\sqrt{2}$:'),
              maths(
                '\\begin{aligned} \\tan 22.5^{\\circ} &= \\frac{1 - \\frac{\\sqrt{2}}{2}}{\\frac{\\sqrt{2}}{2}} = \\frac{2 - \\sqrt{2}}{\\sqrt{2}} \\\\ &= \\frac{(2 - \\sqrt{2})\\sqrt{2}}{2} \\\\ &= \\frac{2\\sqrt{2} - 2}{2} = \\sqrt{2} - 1 \\end{aligned}',
              ),
              prose(
                'With $\\sin 30^{\\circ} = \\frac{1}{2}$ the bottom is $1$ after doubling, so nothing is left to clear: $\\tan 15^{\\circ} = \\frac{2 - \\sqrt{3}}{1} = 2 - \\sqrt{3}$.',
              ),
            ),
            ask('tid-half-exact-steps'),
            ask('tid-half-exact-steps', 2),
          ],
          skillCheck: [
            ask('tid-half-exact-tiles', 2),
            ask('tid-half-exact-steps', 2),
            ask('tid-half-exact-choice', 2),
          ],
        },
        {
          id: 'ti-l4-triple',
          title: 'The Triple-Angle Formulae',
          slides: [
            teach(
              prose('Split $3x$ as $2x + x$, expand, then write the double angles in $x$:'),
              maths(
                '\\begin{aligned} \\sin 3x &= \\sin 2x\\cos x \\\\ &\\quad + \\cos 2x\\sin x \\\\ &= 2\\sin x\\cos^2 x \\\\ &\\quad + \\sin x - 2\\sin^3 x \\\\ &= 3\\sin x - 4\\sin^3 x \\end{aligned}',
              ),
              prose('The last line used $\\cos^2 x = 1 - \\sin^2 x$, so only sines are left.'),
            ),
            lead(
              'tid-triple-choice',
              1,
              prose('The cosine goes the same way, keeping only cosines:'),
              maths(
                '\\begin{aligned} \\cos 3x &= \\cos 2x\\cos x - \\sin 2x\\sin x \\\\ &= (2\\cos^2 x - 1)\\cos x \\\\ &\\quad - 2\\sin^2 x\\cos x \\\\ &= 2\\cos^3 x - \\cos x \\\\ &\\quad - 2(1 - \\cos^2 x)\\cos x \\\\ &= 4\\cos^3 x - 3\\cos x \\end{aligned}',
              ),
            ),
            teach(
              prose('Rearranged, they turn a cube into single angles. Move the cube to one side and the rest to the other:'),
              maths(
                '\\begin{aligned} \\sin 3x &= 3\\sin x - 4\\sin^3 x \\\\ 4\\sin^3 x &= 3\\sin x - \\sin 3x \\end{aligned}',
              ),
              prose('In the same way $4\\cos^3 x = \\cos 3x + 3\\cos x$. Divided by the single angle, each term loses one power:'),
              maths('\\begin{aligned} \\frac{\\sin 3x}{\\sin x} &= \\frac{3\\sin x - 4\\sin^3 x}{\\sin x} \\\\ &= 3 - 4\\sin^2 x \\end{aligned}'),
            ),
            ask('tid-triple-tiles'),
            lead(
              'tid-triple-steps',
              1,
              prose(
                'Any angle can be the single one. With $2\\theta$ in place of $x$, split $6\\theta$ as $4\\theta + 2\\theta$ and write $4\\theta$ as the double of $2\\theta$, exactly as above:',
              ),
              maths(
                '\\begin{aligned} \\cos 4\\theta &= 2\\cos^2 2\\theta - 1 \\\\ \\sin 4\\theta &= 2\\sin 2\\theta\\cos 2\\theta \\\\ \\sin^2 2\\theta &= 1 - \\cos^2 2\\theta \\end{aligned}',
              ),
              prose('The same lines as $\\cos 3x$ then give $\\cos 6\\theta = 4\\cos^3 2\\theta - 3\\cos 2\\theta$.'),
            ),
            ask('tid-triple-tiles', 2),
            ask('tid-triple-steps', 2),
            teach(
              prose('With one ratio known, the formula gives the triple angle without finding $x$. If $\\sin x = \\tfrac{3}{5}$:'),
              maths('\\sin 3x = 3 \\cdot \\tfrac{3}{5} - 4 \\cdot \\tfrac{27}{125} = \\tfrac{117}{125}'),
              prose(
                'Given the other ratio, find this one first, with its sign from the quadrant. If $\\cos x = \\tfrac{4}{5}$ with $270^{\\circ} < x < 360^{\\circ}$, the 3, 4, 5 triangle and a negative sine there give $\\sin x = -\\tfrac{3}{5}$:',
              ),
              maths(
                '\\begin{aligned} \\sin 3x &= 3 \\cdot \\left(-\\tfrac{3}{5}\\right) - 4 \\cdot \\left(-\\tfrac{3}{5}\\right)^3 \\\\ &= -\\tfrac{225}{125} + \\tfrac{108}{125} = -\\tfrac{117}{125} \\end{aligned}',
              ),
            ),
            ask('tid-triple-value'),
            ask('tid-triple-value+choice', 2),
            ask('tid-triple-choice', 2),
          ],
          skillCheck: [
            ask('tid-triple-tiles', 2),
            ask('tid-triple-value', 2),
            ask('tid-triple-choice', 2),
          ],
        },
        {
          id: 'ti-l4-equations',
          title: 'Equations in x/2 and 3x',
          slides: [
            teach(
              prose(
                'Solve for the whole bracket over **its** range, then undo. For $0^{\\circ} \\le x < 360^{\\circ}$, $3x$ runs over three turns, so $\\sin 3x = \\tfrac{1}{2}$ has a pair in each:',
              ),
              maths(
                '\\begin{aligned} 3x &= 30^{\\circ}, 150^{\\circ} \\\\ 3x &= 390^{\\circ}, 510^{\\circ} \\\\ 3x &= 750^{\\circ}, 870^{\\circ} \\end{aligned}',
              ),
              prose(
                'Divide each by $3$: $x = 10^{\\circ}$, $50^{\\circ}$, $130^{\\circ}$, $170^{\\circ}$, $250^{\\circ}$, $290^{\\circ}$. A tangent repeats every $180^{\\circ}$ instead: $\\tan 3x = 0$ gives $3x = 0^{\\circ}, 180^{\\circ}, 360^{\\circ}, \\ldots$, up to $900^{\\circ}$.',
              ),
            ),
            lead(
              'tid-multi-eq-flow',
              1,
              prose('A half angle goes the other way. For $0^{\\circ} \\le x < 360^{\\circ}$, $\\tfrac{x}{2}$ covers only $0^{\\circ}$ to $180^{\\circ}$:'),
              maths('\\begin{aligned} \\cos \\tfrac{x}{2} &= \\tfrac{1}{2} \\\\ \\tfrac{x}{2} &= 60^{\\circ} \\\\ x &= 2 \\times 60^{\\circ} = 120^{\\circ} \\end{aligned}'),
              prose('The other table angle, $300^{\\circ}$, lies beyond the half range, so there is one solution. Undo a half by doubling.'),
            ),
            ask('tid-multi-eq-slider'),
            ask('tid-multi-eq-steps'),
            teach(
              prose('Count before listing: $3x$ meets each level three times as often as $x$, and a tangent repeats every $180^{\\circ}$. For $0^{\\circ} \\le x < 180^{\\circ}$, $3x$ runs up to $540^{\\circ}$:'),
              maths('\\begin{aligned} \\tan 3x &= 1 \\\\ 3x &= 45^{\\circ}, 225^{\\circ}, 405^{\\circ} \\\\ x &= 15^{\\circ}, 75^{\\circ}, 135^{\\circ} \\end{aligned}'),
              prose('A wider range for $x$ widens the bracket\'s too: for $0^{\\circ} \\le x < 720^{\\circ}$, $\\tfrac{x}{2}$ runs over a whole turn.'),
            ),
            ask('tid-multi-eq-angle'),
            ask('tid-multi-eq-flow', 2),
            ask('tid-multi-eq-slider', 2),
            teach(
              prose('In radians a turn is $2\\pi$. For $0 \\le \\theta < 2\\pi$, $\\tfrac{\\theta}{2}$ runs from $0$ to $\\pi$:'),
              maths('\\begin{aligned} \\tan \\tfrac{\\theta}{2} &= \\sqrt{3} \\\\ \\tfrac{\\theta}{2} &= \\tfrac{\\pi}{3} \\\\ \\theta &= \\tfrac{2\\pi}{3} \\end{aligned}'),
              prose('$\\frac{\\pi}{3}$ is $60^{\\circ}$; the next tangent value, $\\frac{4\\pi}{3}$, is beyond $\\pi$.'),
            ),
            ask('tid-multi-eq-steps', 2),
            ask('tid-multi-eq-angle+choice', 2),
          ],
          skillCheck: [
            ask('tid-multi-eq-flow', 2),
            ask('tid-multi-eq-steps', 2),
            ask('tid-multi-eq-angle', 2),
          ],
        },
      ],
      levelCheck: [
        ask('tid-half-tiles', 2),
        ask('tid-half-sign-flow', 2),
        ask('tid-half-value', 2),
        ask('tid-half-simplify-steps', 2),
        ask('tid-half-sign-choice', 2),
        ask('tid-half-square-tree', 2),
        ask('tid-half-exact-tiles', 2),
        ask('tid-half-exact-steps', 2),
        ask('tid-half-exact-choice', 2),
        ask('tid-triple-value', 2),
        ask('tid-triple-tiles', 2),
        ask('tid-triple-choice', 2),
        ask('tid-multi-eq-flow', 2),
        ask('tid-multi-eq-steps', 2),
        ask('tid-multi-eq-angle', 2),
      ],
    },
    {
      id: 'ti-l5',
      title: 'Proving Identities',
      lessons: [
        {
          id: 'ti-l5-what',
          title: 'What a Proof Is',
          slides: [
            teach(
              prose(
                'An identity is true at every angle. To prove one, start from one side and rewrite it, one step at a time, until it is the other side:',
              ),
              maths('\\begin{aligned} &\\tan x \\cos x \\\\ &= \\frac{\\sin x}{\\cos x} \\cos x \\\\ &= \\sin x \\end{aligned}'),
              prose('Every line equals the one above it, using an identity you already know or plain algebra.'),
            ),
            ask('tid-proof-basic-steps'),
            teach(
              prose(
                'Start from the busier side: it has more to rewrite. In $1 = \\sin x \\operatorname{cosec} x$ the right side has two functions and the left none, so start on the right, and write it in $\\sin$ and $\\cos$:',
              ),
              maths('\\begin{aligned} &\\sin x \\operatorname{cosec} x \\\\ &= \\sin x \\times \\frac{1}{\\sin x} \\\\ &= 1 \\end{aligned}'),
              prose(
                'Never work across the equals sign. "Divide both sides by $\\cos x$" treats the identity as already true, which is the very thing being proved.',
              ),
            ),
            ask('tid-proof-start-flow'),
            ask('tid-proof-basic-steps', 2),
            ask('tid-proof-start-flow', 2),
            ask('tid-proof-basic-choice'),
            ask('tid-proof-basic-order'),
            teach(
              prose('Written out, a proof is a chain of lines, each one move on from the last, ending on the other side:'),
              maths('\\begin{aligned} &\\sec^2 x - \\tan^2 x \\\\ &= (1 + \\tan^2 x) - \\tan^2 x \\\\ &= 1 \\end{aligned}'),
              prose('Checking one angle is not part of it: agreeing at one angle proves nothing about the rest.'),
            ),
            ask('tid-proof-basic-order', 2),
            ask('tid-proof-basic-choice', 2),
          ],
          skillCheck: [
            ask('tid-proof-basic-steps', 2),
            ask('tid-proof-start-flow', 2),
            ask('tid-proof-basic-order', 2),
          ],
        },
        {
          id: 'ti-l5-fractions',
          title: 'Fractions in a Proof',
          slides: [
            teach(
              prose('Swap $\\sec$ and $\\operatorname{cosec}$ for fractions, then put everything over one denominator:'),
              maths(
                '\\begin{aligned} &\\sec x - \\cos x \\\\ &= \\frac{1}{\\cos x} - \\cos x \\\\ &= \\frac{1 - \\cos^2 x}{\\cos x} \\end{aligned}',
              ),
              prose('The top is now a Pythagorean identity in disguise: $1 - \\cos^2 x = \\sin^2 x$.'),
            ),
            ask('tid-proof-fraction-steps'),
            lead(
              'tid-proof-fraction-tiles',
              1,
              prose('Dividing by a fraction multiplies by it upside down:'),
              maths(
                '\\begin{aligned} &\\sin x \\div \\tan x \\\\ &= \\sin x \\div \\frac{\\sin x}{\\cos x} \\\\ &= \\sin x \\times \\frac{\\cos x}{\\sin x} \\\\ &= \\cos x \\end{aligned}',
              ),
            ),
            teach(
              prose('To finish, split the fraction into the pieces the other side is made of:'),
              maths('\\begin{aligned} \\frac{\\sin^2 x}{\\cos x} &= \\sin x \\times \\frac{\\sin x}{\\cos x} \\\\ &= \\sin x \\tan x \\end{aligned}'),
              prose('Keep the target in view: it tells you which pieces to aim for.'),
            ),
            ask('tid-proof-fraction-choice'),
            ask('tid-proof-fraction-order'),
            ask('tid-proof-fraction-steps', 2),
            ask('tid-proof-fraction-tiles', 2),
            teach(
              prose('Two fractions with different bottoms go over their product. For $\\tan x + \\cot x$:'),
              maths('\\begin{aligned} &\\frac{\\sin x}{\\cos x} + \\frac{\\cos x}{\\sin x} \\\\ &= \\frac{\\sin^2 x + \\cos^2 x}{\\sin x \\cos x} \\\\ &= \\frac{1}{\\sin x \\cos x} \\end{aligned}'),
              prose('Dividing by a fraction multiplies by it upside down.'),
            ),
            ask('tid-proof-fraction-choice', 2),
            ask('tid-proof-fraction-order', 2),
          ],
          skillCheck: [
            ask('tid-proof-fraction-steps', 2),
            ask('tid-proof-fraction-tiles', 2),
            ask('tid-proof-fraction-order', 2),
          ],
        },
        {
          id: 'ti-l5-squares',
          title: 'Squares and Brackets',
          slides: [
            teach(
              prose('A bracket times its partner is a difference of two squares, so the middle terms cancel:'),
              maths('\\begin{aligned} &(1 - \\sin x)(1 + \\sin x) \\\\ &= 1 - \\sin^2 x \\\\ &= \\cos^2 x \\end{aligned}'),
              prose('Multiplying out is plain algebra; the last line needs $\\sin^2 x + \\cos^2 x = 1$.'),
            ),
            lead(
              'tid-proof-square-steps',
              1,
              prose(
                'The reciprocal functions work the same way. Take $1$ from both sides of $1 + \\tan^2 x = \\sec^2 x$ to get $\\sec^2 x - 1 = \\tan^2 x$, then',
              ),
              maths('\\begin{aligned} &(\\sec x - 1)(\\sec x + 1) \\\\ &= \\sec^2 x - 1 \\\\ &= \\tan^2 x \\end{aligned}'),
              prose('And $1 + \\cot^2 x = \\operatorname{cosec}^2 x$ gives $\\operatorname{cosec}^2 x - 1 = \\cot^2 x$ in the same way.'),
            ),
            ask('tid-proof-square-tiles'),
            ask('tid-proof-identity-flow'),
            teach(
              prose('Each Pythagorean identity rearranges to cover a square minus one:'),
              maths('\\begin{aligned} 1 - \\sin^2 x &= \\cos^2 x \\\\ \\sec^2 x - 1 &= \\tan^2 x \\\\ \\operatorname{cosec}^2 x - 1 &= \\cot^2 x \\end{aligned}'),
              prose(
                'Or take the other square across: $\\operatorname{cosec}^2 x - \\cot^2 x = 1$. So $(\\operatorname{cosec} x - \\cot x)(\\operatorname{cosec} x + \\cot x) = \\operatorname{cosec}^2 x - \\cot^2 x = 1$.',
              ),
            ),
            ask('tid-proof-square-order'),
            ask('tid-proof-identity-flow', 2),
            lead(
              'tid-proof-square-steps',
              2,
              prose('Two identities can meet in one proof, and then cancel:'),
              maths(
                '\\begin{aligned} &(1 + \\tan^2 x)\\cos^2 x \\\\ &= \\sec^2 x \\cos^2 x \\\\ &= \\frac{1}{\\cos^2 x} \\cos^2 x \\\\ &= 1 \\end{aligned}',
              ),
            ),
            teach(
              prose('A squared sum has a middle term. Collect the squares, and the identity tidies them to $1$:'),
              maths('\\begin{aligned} &(\\sin x + \\cos x)^2 \\\\ &= \\sin^2 x + 2\\sin x \\cos x \\\\ &\\quad + \\cos^2 x \\\\ &= 1 + 2\\sin x \\cos x \\end{aligned}'),
            ),
            ask('tid-proof-square-tiles', 2),
            ask('tid-proof-square-order', 2),
          ],
          skillCheck: [
            ask('tid-proof-square-steps', 2),
            ask('tid-proof-square-tiles', 2),
            ask('tid-proof-identity-flow', 2),
          ],
        },
        {
          id: 'ti-l5-double',
          title: 'Double Angles in a Proof',
          slides: [
            teach(
              prose('A double angle on one side and single angles on the other: swap the double ones out first.'),
              maths('\\begin{aligned} \\sin 2x &= 2\\sin x \\cos x \\\\ \\cos 2x &= 1 - 2\\sin^2 x \\\\ &= 2\\cos^2 x - 1 \\end{aligned}'),
              prose('Of the forms of $\\cos 2x$, pick the one that cancels the $1$ beside it.'),
            ),
            ask('tid-proof-double-steps'),
            ask('tid-proof-double-choice'),
            ask('tid-proof-sides-tree'),
            teach(
              prose('With $1 + \\cos 2x$, the form $2\\cos^2 x - 1$ cancels the $1$:'),
              maths(
                '\\begin{aligned} \\frac{\\sin 2x}{1 + \\cos 2x} &= \\frac{2\\sin x \\cos x}{2\\cos^2 x} \\\\ &= \\frac{\\sin x}{\\cos x} \\\\ &= \\tan x \\end{aligned}',
              ),
              prose('With $1 - \\cos 2x$, the form $1 - 2\\sin^2 x$ does the same job.'),
            ),
            ask('tid-proof-double-order'),
            ask('tid-proof-double-steps', 2),
            ask('tid-proof-sides-tree', 2),
            teach(
              prose(
                'The third form, $\\cos 2x = \\cos^2 x - \\sin^2 x$, is a difference of two squares, so it factorises:',
              ),
              maths(
                '\\begin{aligned} \\frac{\\cos 2x}{\\cos x - \\sin x} &= \\frac{\\cos^2 x - \\sin^2 x}{\\cos x - \\sin x} \\end{aligned}',
              ),
              prose('The top is $(\\cos x - \\sin x)(\\cos x + \\sin x)$, and the $\\cos x - \\sin x$ cancels with the bottom:'),
              maths('\\frac{\\cos 2x}{\\cos x - \\sin x} = \\cos x + \\sin x'),
              prose(
                'Putting a table angle into both sides is a quick check on your working. If they agree, that is reassuring, but it is still not a proof.',
              ),
            ),
            ask('tid-proof-double-choice', 2),
            lead(
              'tid-proof-double-order',
              2,
              prose('Fourth powers are squares of squares, so they factorise the same way:'),
              maths(
                '\\begin{aligned} &\\cos^4 x - \\sin^4 x \\\\ &= (\\cos^2 x - \\sin^2 x)(\\cos^2 x + \\sin^2 x) \\\\ &= (\\cos^2 x - \\sin^2 x) \\times 1 \\\\ &= \\cos 2x \\end{aligned}',
              ),
            ),
          ],
          skillCheck: [
            ask('tid-proof-double-steps', 2),
            ask('tid-proof-double-order', 2),
            ask('tid-proof-sides-tree', 2),
          ],
        },
        {
          id: 'ti-l5-check',
          title: 'Identity or Not',
          slides: [
            teach(
              prose('One angle where the two sides differ disproves a claimed identity. At $x = 90^{\\circ}$:'),
              maths('\\begin{aligned} \\sin 2x &= \\sin 180^{\\circ} = 0 \\\\ 2\\sin x &= 2\\sin 90^{\\circ} = 2 \\end{aligned}'),
              prose('So $\\sin 2x = 2\\sin x$ is not an identity. But no number of angles where the sides agree can prove one.'),
            ),
            ask('tid-proof-side-value'),
            teach(
              prose('A claim is one of three things:'),
              prose(
                'An **identity**, true at every angle. An **equation**, true at some angles only: $\\sin 2x = 2\\sin x$ fails at $90^{\\circ}$, but at $x = 0^{\\circ}$ both sides are $0$. Or **never** true: $\\sin^2 x + \\cos^2 x = 2$ holds nowhere, since the left side is always $1$.',
              ),
              prose(
                'So test an angle first. If the sides differ there, it is not an identity; then ask whether any angle makes them agree.',
              ),
            ),
            ask('tid-proof-verdict-flow'),
            ask('tid-proof-side-value', 2),
            ask('tid-proof-disprove-order'),
            ask('tid-proof-verdict-flow', 2),
            ask('tid-proof-wrong-choice'),
            teach(
              prose('A proof fails at its first line that does not equal the one above. Common slips:'),
              prose('$1 - \\cos^2 x$ written as $\\cos^2 x$; a fraction turned upside down; a middle term lost when squaring a bracket.'),
            ),
            ask('tid-proof-wrong-choice', 2),
            ask('tid-proof-disprove-order', 2),
          ],
          skillCheck: [
            ask('tid-proof-side-value', 2),
            ask('tid-proof-verdict-flow', 2),
            ask('tid-proof-disprove-order', 2),
          ],
        },
      ],
      levelCheck: [
        ask('tid-proof-basic-steps', 2),
        ask('tid-proof-start-flow', 2),
        ask('tid-proof-basic-order', 2),
        ask('tid-proof-fraction-steps', 2),
        ask('tid-proof-fraction-tiles', 2),
        ask('tid-proof-fraction-order', 2),
        ask('tid-proof-square-steps', 2),
        ask('tid-proof-square-tiles', 2),
        ask('tid-proof-identity-flow', 2),
        ask('tid-proof-double-steps', 2),
        ask('tid-proof-double-order', 2),
        ask('tid-proof-sides-tree', 2),
        ask('tid-proof-side-value', 2),
        ask('tid-proof-verdict-flow', 2),
        ask('tid-proof-wrong-choice', 2),
      ],
    },
    {
      id: 'ti-l6',
      title: 'Sum-to-Product (Factor Formulae)',
      lessons: [
        {
          id: 'ti-l6-origin',
          title: 'Where the Formulae Come From',
          slides: [
            teach(
              prose('Write out both expansions of $\\sin(A \\pm B)$:'),
              maths('\\begin{aligned} & \\sin(A + B) \\\\ &= \\sin A \\cos B + \\cos A \\sin B \\\\[6pt] & \\sin(A - B) \\\\ &= \\sin A \\cos B - \\cos A \\sin B \\end{aligned}'),
              prose('Add them. The $\\cos A \\sin B$ terms cancel, and what is left is one product:'),
              maths('\\begin{aligned} & \\sin(A + B) + \\sin(A - B) \\\\ &= 2\\sin A \\cos B \\end{aligned}'),
            ),
            lead(
              'tid-factor-add-steps',
              1,
              prose('Cosines add the same way. This time the $\\sin A \\sin B$ terms cancel:'),
              maths(
                '\\begin{aligned} & \\cos(A + B) + \\cos(A - B) \\\\ &= (\\cos A \\cos B - \\sin A \\sin B) \\\\ &\\quad + (\\cos A \\cos B + \\sin A \\sin B) \\\\ &= 2\\cos A \\cos B \\end{aligned}',
              ),
            ),
            teach(
              prose('Take one expansion from the other instead, and a different pair cancels:'),
              maths(
                '\\begin{aligned} & \\sin(A + B) - \\sin(A - B) \\\\ &= (\\sin A \\cos B + \\cos A \\sin B) \\\\ &\\quad - (\\sin A \\cos B - \\cos A \\sin B) \\\\ &= 2\\cos A \\sin B \\end{aligned}',
              ),
              prose('The cosines give the fourth. The $\\cos A \\cos B$ terms cancel, and the minus inside $\\cos(A + B)$ puts a minus in front:'),
              maths('\\begin{aligned} & \\cos(A + B) - \\cos(A - B) \\\\ &= -\\sin A \\sin B - \\sin A \\sin B \\\\ &= -2\\sin A \\sin B \\end{aligned}'),
            ),
            ask('tid-factor-origin-choice'),
            ask('tid-factor-add-steps', 2),
            lead(
              'tid-factor-origin-choice',
              2,
              prose('Take them the other way round and every sign flips:'),
              maths(
                '\\begin{aligned} & \\sin(A - B) - \\sin(A + B) \\\\ &= (\\sin A \\cos B - \\cos A \\sin B) \\\\ &\\quad - (\\sin A \\cos B + \\cos A \\sin B) \\\\ &= -2\\cos A \\sin B \\end{aligned}',
              ),
            ),
            teach(
              prose('Now name the angles the other way round: $P = A + B$ and $Q = A - B$. Adding and taking away gives'),
              maths('A = \\frac{P + Q}{2} \\qquad B = \\frac{P - Q}{2}'),
              prose('So a sum turns into a product of half the sum and half the difference:'),
              maths('\\begin{aligned} & \\sin P + \\sin Q \\\\ &= 2\\sin \\frac{P + Q}{2} \\cos \\frac{P - Q}{2} \\end{aligned}'),
            ),
            ask('tid-factor-halves-tree'),
            ask('tid-factor-derive-order'),
            lead(
              'tid-factor-halves-tree',
              2,
              prose(
                'A difference comes from the subtraction above: $\\sin P - \\sin Q = 2\\cos \\frac{P + Q}{2} \\sin \\frac{P - Q}{2}$. When $Q$ is the larger, $B$ comes out negative, and $\\sin(-\\theta) = -\\sin \\theta$. For $\\sin 3x - \\sin 7x$:',
              ),
              maths(
                '\\begin{aligned} A &= \\tfrac{3x + 7x}{2} = 5x \\\\ B &= \\tfrac{3x - 7x}{2} = -2x \\\\ \\sin 3x - \\sin 7x &= 2\\cos 5x \\sin(-2x) \\\\ &= -2\\cos 5x \\sin 2x \\end{aligned}',
              ),
            ),
            ask('tid-factor-derive-order', 2),
          ],
          skillCheck: [
            ask('tid-factor-add-steps', 2),
            ask('tid-factor-halves-tree', 2),
            ask('tid-factor-derive-order', 2),
          ],
        },
        {
          id: 'ti-l6-sum',
          title: 'Sum to Product',
          slides: [
            teach(
              prose('The four factor formulae turn a sum of two sines, or of two cosines, into a product:'),
              maths(
                '\\begin{aligned} & \\sin P + \\sin Q \\\\ &= 2\\sin \\tfrac{P + Q}{2} \\cos \\tfrac{P - Q}{2} \\\\[6pt] & \\sin P - \\sin Q \\\\ &= 2\\cos \\tfrac{P + Q}{2} \\sin \\tfrac{P - Q}{2} \\\\[6pt] & \\cos P + \\cos Q \\\\ &= 2\\cos \\tfrac{P + Q}{2} \\cos \\tfrac{P - Q}{2} \\\\[6pt] & \\cos P - \\cos Q \\\\ &= -2\\sin \\tfrac{P + Q}{2} \\sin \\tfrac{P - Q}{2} \\end{aligned}',
              ),
              prose('Half the sum goes in the first function, half the difference in the second.'),
            ),
            lead(
              'tid-factor-sum-tiles',
              1,
              prose('For $\\sin 5x + \\sin 3x$, $P = 5x$ and $Q = 3x$:'),
              maths('\\begin{aligned} & \\sin 5x + \\sin 3x \\\\ &= 2\\sin \\frac{5x + 3x}{2} \\cos \\frac{5x - 3x}{2} \\\\ &= 2\\sin 4x \\cos x \\end{aligned}'),
              prose('Half of $8x$ is $4x$, and half of $2x$ is $x$. The other three work the same way with their own formula.'),
            ),
            ask('tid-factor-sum-choice'),
            ask('tid-factor-sum-steps'),
            teach(
              prose('Two places the sign goes wrong. A difference of cosines has a minus in front: $\\cos 7x - \\cos 3x = -2\\sin 5x \\sin 2x$.'),
              prose('And when $Q$ is the larger, half the difference is negative. $\\sin(-\\theta) = -\\sin \\theta$ turns the sign; $\\cos(-\\theta) = \\cos \\theta$ does not:'),
              maths('\\begin{aligned} & \\cos 3x - \\cos 7x \\\\ &= -2\\sin 5x \\sin(-2x) \\\\ &= 2\\sin 5x \\sin 2x \\end{aligned}'),
            ),
            ask('tid-factor-sign-flow'),
            ask('tid-factor-sum-steps', 2),
            ask('tid-factor-sum-tiles', 2),
            ask('tid-factor-sum-choice', 2),
            ask('tid-factor-sign-flow', 2),
          ],
          skillCheck: [
            ask('tid-factor-sum-tiles', 2),
            ask('tid-factor-sum-steps', 2),
            ask('tid-factor-sign-flow', 2),
          ],
        },
        {
          id: 'ti-l6-product',
          title: 'Product to Sum',
          slides: [
            teach(
              prose('Read the other way, the same results turn a product into a sum:'),
              maths(
                '\\begin{aligned} & 2\\sin A \\cos B \\\\ &= \\sin(A + B) + \\sin(A - B) \\\\[6pt] & 2\\cos A \\sin B \\\\ &= \\sin(A + B) - \\sin(A - B) \\\\[6pt] & 2\\cos A \\cos B \\\\ &= \\cos(A + B) + \\cos(A - B) \\\\[6pt] & 2\\sin A \\sin B \\\\ &= \\cos(A - B) - \\cos(A + B) \\end{aligned}',
              ),
              prose('In the last one the $A - B$ term comes first. For example, $2\\sin 4x \\cos x = \\sin 5x + \\sin 3x$.'),
            ),
            ask('tid-factor-product-tiles'),
            ask('tid-factor-product-choice'),
            teach(
              prose('Each formula starts from twice the product. Without the $2$, halve the sum; with another number, take a $2$ out first:'),
              maths(
                '\\begin{aligned} & \\sin 4x \\cos x = \\tfrac{1}{2}(\\sin 5x + \\sin 3x) \\\\[6pt] & 6\\cos 5x \\cos x \\\\ &= 3 \\times 2\\cos 5x \\cos x \\\\ &= 3(\\cos 6x + \\cos 4x) \\end{aligned}',
              ),
              prose('It finds values too. Neither $75^{\\circ}$ nor $15^{\\circ}$ is on the table, but their sum and difference are:'),
              maths('\\begin{aligned} & 2\\cos 75^{\\circ} \\cos 15^{\\circ} \\\\ &= \\cos 90^{\\circ} + \\cos 60^{\\circ} \\\\ &= 0 + \\tfrac{1}{2} = \\tfrac{1}{2} \\end{aligned}'),
            ),
            ask('tid-factor-product-tiles', 2),
            ask('tid-factor-product-choice', 2),
            ask('tid-factor-product-value'),
            teach(
              prose('When $B$ is the larger angle, $A - B$ is negative. That is fine: $\\sin(-60^{\\circ}) = -\\sin 60^{\\circ}$.'),
              maths('\\begin{aligned} & 2\\sin 15^{\\circ} \\cos 75^{\\circ} \\\\ &= \\sin 90^{\\circ} + \\sin(-60^{\\circ}) \\\\ &= 1 - \\frac{\\sqrt{3}}{2} \\end{aligned}'),
              prose('An angle past $360^{\\circ}$ is fine too: take a whole turn off, so $\\cos 450^{\\circ} = \\cos 90^{\\circ} = 0$.'),
            ),
            ask('tid-factor-product-steps'),
            ask('tid-factor-product-value+choice', 2),
            ask('tid-factor-product-steps', 2),
          ],
          skillCheck: [
            ask('tid-factor-product-tiles', 2),
            ask('tid-factor-product-value', 2),
            ask('tid-factor-product-steps', 2),
          ],
        },
        {
          id: 'ti-l6-exact',
          title: 'Exact Values',
          slides: [
            teach(
              prose('Two angles off the table can have a half sum and a half difference on it. For $\\sin 75^{\\circ} + \\sin 15^{\\circ}$ they are $45^{\\circ}$ and $30^{\\circ}$:'),
              maths(
                '\\begin{aligned} & \\sin 75^{\\circ} + \\sin 15^{\\circ} \\\\ &= 2\\sin 45^{\\circ} \\cos 30^{\\circ} \\\\ &= 2 \\times \\frac{\\sqrt{2}}{2} \\times \\frac{\\sqrt{3}}{2} = \\frac{\\sqrt{6}}{2} \\end{aligned}',
              ),
            ),
            lead(
              'tid-factor-exact-tiles',
              1,
              prose('Mind the minus in front of a difference of cosines, and the sign of an obtuse half sum. For $\\cos 165^{\\circ} - \\cos 75^{\\circ}$, half the sum is $120^{\\circ}$ and half the difference $45^{\\circ}$:'),
              maths(
                '\\begin{aligned} & \\cos 165^{\\circ} - \\cos 75^{\\circ} \\\\ &= -2\\sin 120^{\\circ} \\sin 45^{\\circ} \\\\ &= -2 \\times \\frac{\\sqrt{3}}{2} \\times \\frac{\\sqrt{2}}{2} = -\\frac{\\sqrt{6}}{2} \\end{aligned}',
              ),
            ),
            ask('tid-factor-exact-tree'),
            ask('tid-factor-exact-choice'),
            teach(
              prose('Order matters. In $\\sin 15^{\\circ} - \\sin 75^{\\circ}$, half the difference is $-30^{\\circ}$, and $\\sin(-30^{\\circ}) = -\\tfrac{1}{2}$:'),
              maths(
                '\\begin{aligned} & \\sin 15^{\\circ} - \\sin 75^{\\circ} \\\\ &= 2\\cos 45^{\\circ} \\sin(-30^{\\circ}) \\\\ &= 2 \\times \\frac{\\sqrt{2}}{2} \\times \\left(-\\frac{1}{2}\\right) = -\\frac{\\sqrt{2}}{2} \\end{aligned}',
              ),
            ),
            ask('tid-factor-exact-steps'),
            ask('tid-factor-exact-tiles', 2),
            ask('tid-factor-exact-choice', 2),
            teach(
              prose('A product runs the other way, into a sum: $2\\cos A \\sin B = \\sin(A + B) - \\sin(A - B)$. With $A = 105^{\\circ}$ and $B = 15^{\\circ}$:'),
              maths(
                '\\begin{aligned} & 2\\cos 105^{\\circ} \\sin 15^{\\circ} \\\\ &= \\sin 120^{\\circ} - \\sin 90^{\\circ} \\\\ &= \\frac{\\sqrt{3}}{2} - 1 \\end{aligned}',
              ),
              prose(
                'Without the $2$ in front, halve it. An angle below $0^{\\circ}$ or past $360^{\\circ}$ is fine: $\\sin(-180^{\\circ}) = 0$, and $\\sin 510^{\\circ} = \\sin 150^{\\circ}$, a whole turn less.',
              ),
            ),
            lead(
              'tid-factor-product-value',
              1,
              prose('The other products turn round the same way:'),
              maths(
                '\\begin{aligned} & 2\\sin A \\cos B \\\\ &= \\sin(A + B) + \\sin(A - B) \\\\[6pt] & 2\\cos A \\cos B \\\\ &= \\cos(A + B) + \\cos(A - B) \\\\[6pt] & 2\\sin A \\sin B \\\\ &= \\cos(A - B) - \\cos(A + B) \\end{aligned}',
              ),
              prose('So $2\\cos 75^{\\circ} \\cos 15^{\\circ} = \\cos 90^{\\circ} + \\cos 60^{\\circ} = 0 + \\frac{1}{2} = \\frac{1}{2}$.'),
            ),
            ask('tid-factor-product-value', 2),
          ],
          skillCheck: [
            ask('tid-factor-exact-tiles', 2),
            ask('tid-factor-exact-tree', 2),
            ask('tid-factor-exact-steps', 2),
          ],
        },
        {
          id: 'ti-l6-equations',
          title: 'Equations by Factorising',
          slides: [
            teach(
              prose('To solve $\\sin 3x + \\sin x = 0$, factorise the left side:'),
              maths('2\\sin 2x \\cos x = 0'),
              prose(
                'A product is zero only when one of its factors is. For $0^{\\circ} \\le x < 360^{\\circ}$, $\\sin 2x = 0$ gives $0^{\\circ}$, $90^{\\circ}$, $180^{\\circ}$ and $270^{\\circ}$, and $\\cos x = 0$ gives $90^{\\circ}$ and $270^{\\circ}$.',
              ),
              prose('A difference uses its own formula: $\\sin 3x - \\sin x = 2\\cos 2x \\sin x$.'),
            ),
            ask('tid-factor-eq-steps'),
            teach(
              prose('Count each angle once. Above, $90^{\\circ}$ and $270^{\\circ}$ solve both factors, so there are four solutions, not six:'),
              maths('x = 0^{\\circ}, 90^{\\circ}, 180^{\\circ}, 270^{\\circ}'),
              prose('And solve each factor over the whole range: $\\sin 2x$ repeats every $180^{\\circ}$, so it has twice as many zeros as $\\sin x$.'),
            ),
            ask('tid-factor-eq-flow'),
            lead(
              'tid-factor-eq-slider',
              1,
              prose('A difference of cosines keeps its minus in front:'),
              maths(
                '\\begin{aligned} \\cos 5x - \\cos x &= 0 \\\\ -2\\sin 3x \\sin 2x &= 0 \\end{aligned}',
              ),
              prose('The $-2$ is never zero, so $\\sin 3x = 0$ or $\\sin 2x = 0$, each solved over the whole range.'),
            ),
            ask('tid-factor-eq-angle'),
            teach(
              prose('With a term on each side, as in $\\sin 5x = \\sin x$, bring both to one side first:'),
              maths('\\begin{aligned} \\sin 5x - \\sin x &= 0 \\\\ 2\\cos 3x \\sin 2x &= 0 \\end{aligned}'),
              prose('Never cancel the sines or divide by one: that loses the solutions where it is zero.'),
            ),
            ask('tid-factor-eq-flow', 2),
            ask('tid-factor-eq-slider', 2),
            ask('tid-factor-eq-steps', 2),
            ask('tid-factor-eq-angle+choice', 2),
          ],
          skillCheck: [
            ask('tid-factor-eq-flow', 2),
            ask('tid-factor-eq-steps', 2),
            ask('tid-factor-eq-angle', 2),
          ],
        },
      ],
      levelCheck: [
        ask('tid-factor-add-steps', 2),
        ask('tid-factor-halves-tree', 2),
        ask('tid-factor-origin-choice', 2),
        ask('tid-factor-sum-tiles', 2),
        ask('tid-factor-sign-flow', 2),
        ask('tid-factor-sum-steps', 2),
        ask('tid-factor-product-choice', 2),
        ask('tid-factor-product-value', 2),
        ask('tid-factor-product-tiles', 2),
        ask('tid-factor-exact-tree', 2),
        ask('tid-factor-exact-choice', 2),
        ask('tid-factor-exact-tiles', 2),
        ask('tid-factor-eq-flow', 2),
        ask('tid-factor-eq-steps', 2),
        ask('tid-factor-eq-angle', 2),
      ],
    },
    {
      id: 'ti-l7',
      title: 'General Solutions & Harder Equations',
      lessons: [
        {
          id: 'ti-l7-sine-cosine',
          title: 'Every Solution of sin x = k and cos x = k',
          slides: [
            teach(
              prose('Trigonometric Functions found both solutions of $\\sin x = \\tfrac{1}{2}$ in one turn: $30^{\\circ}$ and its partner $150^{\\circ}$. Every other solution is one of those plus a whole number of turns:'),
              maths('\\begin{aligned} x &= 30^{\\circ} + 360^{\\circ} n \\\\ \\text{or} \\quad x &= 150^{\\circ} + 360^{\\circ} n \\end{aligned}'),
              prose('Here $n$ is any whole number: $n = 1$ gives $390^{\\circ}$ and $n = -1$ gives $-330^{\\circ}$. For $\\sin x = k$ with principal value $\\alpha$, the general solution is'),
              maths('\\begin{aligned} x &= \\alpha + 360^{\\circ} n \\\\ \\text{or} \\quad x &= 180^{\\circ} - \\alpha + 360^{\\circ} n \\end{aligned}'),
            ),
            lead(
              'tid-general-sincos-tiles',
              1,
              prose('A cosine is the same either side of $0$, since $\\cos(-x) = \\cos x$. So the partner of $\\alpha$ is $-\\alpha$:'),
              maths('x = \\pm \\alpha + 360^{\\circ} n'),
              prose('For $2\\cos x = \\sqrt{2}$: $\\cos x = \\frac{\\sqrt{2}}{2}$, $\\alpha = 45^{\\circ}$, so $x = \\pm 45^{\\circ} + 360^{\\circ} n$.'),
            ),
            teach(
              prose('A negative $k$ works the same way, with a principal value outside the first quadrant.'),
              prose(
                'For $\\sin x = -\\tfrac{1}{2}$ the principal value is $-30^{\\circ}$, and the partner is $180^{\\circ} - (-30^{\\circ}) = 210^{\\circ}$:',
              ),
              maths('\\begin{aligned} x &= -30^{\\circ} + 360^{\\circ} n \\\\ \\text{or} \\quad x &= 210^{\\circ} + 360^{\\circ} n \\end{aligned}'),
              prose(
                'For $\\cos x = -\\tfrac{1}{2}$ the principal value is $180^{\\circ} - 60^{\\circ} = 120^{\\circ}$, so $x = \\pm 120^{\\circ} + 360^{\\circ} n$.',
              ),
            ),
            ask('tid-general-partner-flow'),
            ask('tid-general-values-table'),
            ask('tid-general-in-range'),
            ask('tid-general-partner-flow'),
            ask('tid-general-sincos-tiles', 2),
            teach(
              prose('To list the solutions in a range, put $n = \\ldots, -1, 0, 1, \\ldots$ into each family and keep what lands inside. For $\\sin x = \\tfrac{1}{2}$ with $-360^{\\circ} \\le x < 360^{\\circ}$:'),
              maths('x = -330^{\\circ}, -210^{\\circ}, 30^{\\circ}, 150^{\\circ}'),
              prose('Mind each end: $\\le$ keeps an end that is a solution, and $<$ leaves it out.'),
            ),
            ask('tid-general-in-range+choice'),
            ask('tid-general-values-table', 2),
          ],
          skillCheck: [
            ask('tid-general-sincos-tiles', 2),
            ask('tid-general-values-table', 2),
            ask('tid-general-in-range'),
          ],
        },
        {
          id: 'ti-l7-tan-radians',
          title: 'tan x = k, and Radians',
          slides: [
            teach(
              prose('A tangent repeats every half turn, so its principal value alone gives every solution:'),
              maths('\\begin{aligned} \\tan x &= k \\\\ \\Rightarrow \\quad x &= \\alpha + 180^{\\circ} n \\end{aligned}'),
              prose('For $\\tan x = -1$ the principal value is $-45^{\\circ}$, so $x = -45^{\\circ} + 180^{\\circ} n$: that is $135^{\\circ}$, $315^{\\circ}$, and so on. Doubling the turn to $360^{\\circ}$ would lose half of them.'),
            ),
            ask('tid-general-tan-tiles'),
            ask('tid-tan-solve'),
            teach(
              prose('In radians the turn is $2\\pi$ and the half turn is $\\pi$, and the principal value is a fraction of $\\pi$. For a sine:'),
              maths('\\begin{aligned} x &= \\alpha + 2n\\pi \\\\ \\text{or} \\quad x &= \\pi - \\alpha + 2n\\pi \\end{aligned}'),
              prose('For a cosine, $x = \\pm \\alpha + 2n\\pi$. For a tangent, $x = \\alpha + n\\pi$.'),
              prose('For $2\\cos x = \\sqrt{3}$, $\\alpha = \\tfrac{\\pi}{6}$, so $x = \\pm \\tfrac{\\pi}{6} + 2n\\pi$.'),
            ),
            ask('tid-general-radian-choice'),
            ask('tid-general-radian-steps'),
            ask('tid-general-tan-tiles', 2),
            teach(
              prose('Convert the turn along with the angle. $360^{\\circ} n$ is $2n\\pi$ and $180^{\\circ} n$ is $n\\pi$; writing $n\\pi$ for a sine or cosine adds solutions that are not there.'),
              prose('So $\\sin x = \\tfrac{1}{2}$ gives'),
              maths('\\begin{aligned} x &= \\tfrac{\\pi}{6} + 2n\\pi \\\\ \\text{or} \\quad x &= \\tfrac{5\\pi}{6} + 2n\\pi \\end{aligned}'),
            ),
            lead(
              'tid-general-partner-flow',
              2,
              prose(
                'A negative $k$ gives a negative principal value for a sine. For $\\sin x = -\\frac{\\sqrt{2}}{2}$ it is $-45^{\\circ}$, and the partner is $180^{\\circ} - (-45^{\\circ}) = 225^{\\circ}$:',
              ),
              maths('\\begin{aligned} x &= -45^{\\circ} + 360^{\\circ} n \\\\ \\text{or} \\quad x &= 225^{\\circ} + 360^{\\circ} n \\end{aligned}'),
              prose('For a cosine the principal value stays between $0^{\\circ}$ and $180^{\\circ}$: $\\cos x = -\\frac{\\sqrt{3}}{2}$ gives $x = \\pm 150^{\\circ} + 360^{\\circ} n$.'),
            ),
            ask('tid-general-radian-steps', 2),
            ask('tid-general-radian-choice', 2),
          ],
          skillCheck: [
            ask('tid-general-tan-tiles', 2),
            ask('tid-general-radian-steps', 2),
            ask('tid-general-radian-choice', 2),
          ],
        },
        {
          id: 'ti-l7-brackets',
          title: 'Equations with a Bracket',
          slides: [
            teach(
              prose('For $\\sin(2x + 30^{\\circ}) = \\tfrac{1}{2}$, solve for the whole bracket first, every family of it:'),
              maths('\\begin{aligned} 2x + 30^{\\circ} &= 30^{\\circ} + 360^{\\circ} n \\\\ \\text{or} \\quad 2x + 30^{\\circ} &= 150^{\\circ} + 360^{\\circ} n \\end{aligned}'),
              prose('Take $30^{\\circ}$ from both sides, then divide by $2$, the turn as well:'),
              maths('\\begin{aligned} x &= 180^{\\circ} n \\\\ \\text{or} \\quad x &= 60^{\\circ} + 180^{\\circ} n \\end{aligned}'),
            ),
            ask('tid-general-bracket-divide-steps'),
            lead(
              'tid-general-bracket-families-tree',
              1,
              prose('A negative $k$ gives the bracket a negative principal value. For $\\sin(2x + 60^{\\circ}) = -\\tfrac{1}{2}$ it is $-30^{\\circ}$, with partner $210^{\\circ}$:'),
              maths(
                '\\begin{aligned} 2x + 60^{\\circ} &= -30^{\\circ} + 360^{\\circ} n \\\\ \\text{or} \\quad 2x + 60^{\\circ} &= 210^{\\circ} + 360^{\\circ} n \\\\ 2x &= -90^{\\circ} + 360^{\\circ} n \\\\ \\text{or} \\quad 2x &= 150^{\\circ} + 360^{\\circ} n \\\\ x &= -45^{\\circ} + 180^{\\circ} n \\\\ \\text{or} \\quad x &= 75^{\\circ} + 180^{\\circ} n \\end{aligned}',
              ),
            ),
            ask('tid-double-eq-tree'),
            teach(
              prose('Dividing the turn is the step most often missed. A whole turn of $2x$ is only half a turn of $x$, so each family repeats every $180^{\\circ}$.'),
              prose('That also says how many solutions a turn holds: two families, each landing twice in $0^{\\circ} \\le x < 360^{\\circ}$, make four. With $3x$ the turn is $120^{\\circ}$, and each family lands three times.'),
            ),
            ask('tid-general-bracket-count'),
            teach(
              prose('A bracket that takes away works the same way, and a cosine gives $\\pm$ the principal value. For $\\cos(3x - 45^{\\circ}) = \\tfrac{\\sqrt{2}}{2}$:'),
              maths('\\begin{aligned} 3x - 45^{\\circ} &= \\pm 45^{\\circ} + 360^{\\circ} n \\\\ 3x &= 90^{\\circ} + 360^{\\circ} n \\\\ \\text{or} \\quad 3x &= 360^{\\circ} n \\end{aligned}'),
              prose('Add $45^{\\circ}$ to both sides first, then divide by $3$, the turn as well: $x = 30^{\\circ} + 120^{\\circ} n$ or $x = 120^{\\circ} n$.'),
            ),
            ask('tid-general-bracket-families-tree', 2),
            ask('tid-general-bracket-divide-steps', 2),
            ask('tid-general-bracket-count+choice', 2),
          ],
          skillCheck: [
            ask('tid-general-bracket-families-tree', 2),
            ask('tid-general-bracket-divide-steps', 2),
            ask('tid-general-bracket-count', 2),
          ],
        },
        {
          id: 'ti-l7-harder',
          title: 'Harder Equations',
          slides: [
            teach(
              prose('A harder equation needs an identity before it can be solved. In $2\\cos^2 x + 3\\sin x - 3 = 0$, write $\\cos^2 x = 1 - \\sin^2 x$ and it becomes a quadratic in $\\sin x$:'),
              maths('\\begin{aligned} 2\\sin^2 x - 3\\sin x + 1 &= 0 \\\\ (2\\sin x - 1)(\\sin x - 1) &= 0 \\end{aligned}'),
              prose('Then each factor gives its own families: $x = 30^{\\circ} + 360^{\\circ} n$ or $150^{\\circ} + 360^{\\circ} n$ from the first, and $x = 90^{\\circ} + 360^{\\circ} n$ from the second. A factor such as $\\sin x = 2$ gives nothing.'),
            ),
            ask('tid-general-factor-flow'),
            ask('tid-general-harder-angle'),
            ask('tid-quadratic-tree'),
            teach(
              prose('A double angle comes out with $\\sin 2x = 2\\sin x \\cos x$. For $\\sin 2x = \\cos x$, bring everything to one side and take out the common factor:'),
              maths('\\begin{aligned} 2\\sin x \\cos x - \\cos x &= 0 \\\\ \\cos x(2\\sin x - 1) &= 0 \\end{aligned}'),
              prose('So $x = 90^{\\circ} + 180^{\\circ} n$, or $30^{\\circ} + 360^{\\circ} n$, or $150^{\\circ} + 360^{\\circ} n$. Dividing by $\\cos x$ would have lost the first family.'),
            ),
            ask('tid-general-factor-flow', 2),
            ask('tid-double-eq-flow'),
            ask('tid-double-quadratic-tiles'),
            teach(
              prose('A factor formula does the same for $\\sin 3x + \\sin x = 0$:'),
              maths('2\\sin 2x \\cos x = 0'),
              prose('$\\sin 2x = 0$ gives $x = 90^{\\circ} n$, and $\\cos x = 0$ gives $90^{\\circ} + 180^{\\circ} n$, which the first family already holds. With $-180^{\\circ} < x \\le 180^{\\circ}$ that is $-90^{\\circ}$, $0^{\\circ}$, $90^{\\circ}$ and $180^{\\circ}$.'),
            ),
            ask('tid-factor-eq-steps', 2),
            lead(
              'tid-general-harder-angle+choice',
              2,
              prose('In radians the families are the same with $\\pi$ for $180^{\\circ}$. $\\sin 3x + \\sin x = 0$ factorises to $2\\sin 2x \\cos x = 0$, and $\\sin 2x = 0$ gives'),
              maths('2x = n\\pi \\quad \\Rightarrow \\quad x = \\tfrac{n\\pi}{2}'),
              prose(
                'Over $-\\pi \\le x < \\pi$ that is $-\\pi, -\\tfrac{\\pi}{2}, 0, \\tfrac{\\pi}{2}$. $\\cos x = 0$ gives $\\pm\\tfrac{\\pi}{2}$, already there, so four solutions and the largest is $\\tfrac{\\pi}{2}$.',
              ),
            ),
          ],
          skillCheck: [
            ask('tid-general-factor-flow', 2),
            ask('tid-general-harder-angle', 2),
            ask('tid-double-eq-flow', 2),
          ],
        },
        {
          id: 'ti-l7-route',
          title: 'Choosing the Route',
          slides: [
            teach(
              prose('The shape of an equation says which route it wants:'),
              prose(
                'A sine and a cosine of $x$ and nothing else: divide by $\\cos x$. $\\sqrt{3}\\sin x = \\cos x$ gives $\\tan x = \\frac{1}{\\sqrt{3}}$, so $x = 30^{\\circ} + 180^{\\circ} n$.',
              ),
              prose('A sine and a cosine with a number, such as $\\sin x + \\sqrt{3}\\cos x = 1$: write it as $R\\sin(x + \\alpha)$.'),
              prose(
                'A square beside the other function: an identity makes a quadratic. $2\\cos^2 x + \\sin x - 1 = 0$ becomes $2(1 - \\sin^2 x) + \\sin x - 1 = 0$, that is $2\\sin^2 x - \\sin x - 1 = 0$.',
              ),
              prose('Two sines or two cosines of different angles: a factor formula.'),
            ),
            ask('tid-tan-solve'),
            lead(
              'tid-r-solve-angle',
              1,
              prose('The $R$ route, worked. $\\sin x + \\sqrt{3}\\cos x$ has $R = \\sqrt{1 + 3} = 2$ and $\\tan\\alpha = \\sqrt{3}$, so $\\alpha = 60^{\\circ}$:'),
              maths(
                '\\begin{aligned} 2\\sin(x + 60^{\\circ}) &= 1 \\\\ \\sin(x + 60^{\\circ}) &= \\tfrac{1}{2} \\end{aligned}',
              ),
              prose(
                'For $0^{\\circ} \\le x < 360^{\\circ}$ the bracket runs from $60^{\\circ}$ to $420^{\\circ}$, so it is $150^{\\circ}$ or $390^{\\circ}$, and $x = 90^{\\circ}$ or $330^{\\circ}$.',
              ),
            ),
            lead(
              'tid-general-route-flow',
              1,
              prose('The factor route, worked, then counted over $0^{\\circ} \\le x < 360^{\\circ}$:'),
              maths('\\begin{aligned} \\cos 3x - \\cos x &= 0 \\\\ -2\\sin 2x \\sin x &= 0 \\end{aligned}'),
              prose(
                '$\\sin 2x = 0$ gives $x = 90^{\\circ} n$: $0^{\\circ}, 90^{\\circ}, 180^{\\circ}, 270^{\\circ}$. $\\sin x = 0$ gives $0^{\\circ}$ and $180^{\\circ}$, already counted. Four solutions.',
              ),
            ),
            teach(
              prose('Dividing by $\\sin x$ or $\\cos x$ is safe only where it is not zero. Dividing $\\sin 2x = \\sqrt{3}\\cos x$ by $\\cos x$ leaves $2\\sin x = \\sqrt{3}$, and silently drops $90^{\\circ}$ and $270^{\\circ}$.'),
              prose('Take the common factor out instead: $\\cos x(2\\sin x - \\sqrt{3}) = 0$ keeps every solution.'),
            ),
            ask('tid-general-lost-choice'),
            lead(
              'tid-general-route-flow',
              2,
              prose('The quadratic route, finished and counted over $-180^{\\circ} < x \\le 180^{\\circ}$:'),
              maths('\\begin{aligned} 2\\sin^2 x - \\sin x - 1 &= 0 \\\\ (2\\sin x + 1)(\\sin x - 1) &= 0 \\end{aligned}'),
              prose(
                '$\\sin x = -\\frac{1}{2}$ gives $-30^{\\circ} + 360^{\\circ} n$ or $210^{\\circ} + 360^{\\circ} n$; in range, $-30^{\\circ}$ and $210^{\\circ} - 360^{\\circ} = -150^{\\circ}$. $\\sin x = 1$ gives $90^{\\circ}$. Three solutions.',
              ),
            ),
            teach(
              prose('The general solution also counts solutions without listing them. A family with a turn of $120^{\\circ}$ lands three times in any $360^{\\circ}$ range, so $\\sin 3x = \\tfrac{1}{2}$ has $2 \\times 3 = 6$ solutions in $0^{\\circ} \\le x < 360^{\\circ}$.'),
              prose('Check the ends, and check that no angle sits in two families: count it once.'),
            ),
            ask('tid-general-lost-choice', 2),
            ask('tid-general-in-range', 2),
            lead(
              'tid-general-bracket-count',
              2,
              prose('A cosine bracket, counted over $-180^{\\circ} \\le x < 180^{\\circ}$. For $\\cos(2x - 30^{\\circ}) = \\tfrac{1}{2}$:'),
              maths(
                '\\begin{aligned} 2x - 30^{\\circ} &= \\pm 60^{\\circ} + 360^{\\circ} n \\\\ 2x &= 90^{\\circ} + 360^{\\circ} n \\\\ \\text{or} \\quad 2x &= -30^{\\circ} + 360^{\\circ} n \\\\ x &= 45^{\\circ} + 180^{\\circ} n \\\\ \\text{or} \\quad x &= -15^{\\circ} + 180^{\\circ} n \\end{aligned}',
              ),
              prose('In range: $45^{\\circ}$ and $-135^{\\circ}$ from the first, $-15^{\\circ}$ and $165^{\\circ}$ from the second. Four solutions.'),
            ),
          ],
          skillCheck: [
            ask('tid-general-route-flow', 2),
            ask('tid-general-lost-choice', 2),
            ask('tid-general-in-range', 2),
          ],
        },
      ],
      levelCheck: [
        ask('tid-general-sincos-tiles', 2),
        ask('tid-general-partner-flow', 2),
        ask('tid-general-values-table', 2),
        ask('tid-general-in-range', 2),
        ask('tid-general-tan-tiles', 2),
        ask('tid-general-radian-choice', 2),
        ask('tid-general-radian-steps', 2),
        ask('tid-general-bracket-families-tree', 2),
        ask('tid-general-bracket-divide-steps', 2),
        ask('tid-general-bracket-count', 2),
        ask('tid-general-factor-flow', 2),
        ask('tid-general-harder-angle', 2),
        ask('tid-general-route-flow', 2),
        ask('tid-general-lost-choice', 2),
      ],
    },
  ],
};
