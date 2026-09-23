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

const prose = (text: string): Block => ({ kind: 'prose', text });

const maths = (tex: string): Block => ({ kind: 'display', tex });

export const trigIdentities: Course = {
  id: 'trig-identities',
  title: 'Trigonometric Identities & Equations',
  blurb: 'Rewriting with identities to solve equations, then compound and double angles.',
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
              maths('\\sin^2 x = 1 - \\cos^2 x \\qquad \\cos^2 x = 1 - \\sin^2 x'),
            ),
            ask('tid-rearrange-tiles'),
            ask('tid-simplify-steps'),
            ask('tid-simplify-choice'),
            teach(
              prose(
                'To simplify, look for a piece that matches one side of an identity and swap in the other side. For example',
              ),
              maths('\\frac{3(1 - \\cos^2 x)}{\\sin x} = \\frac{3\\sin^2 x}{\\sin x} = 3\\sin x'),
              prose(
                'The other two are $\\tan x = \\frac{\\sin x}{\\cos x}$ and $1 + \\tan^2 x = \\sec^2 x$, so $\\sec^2 x - 1$ is $\\tan^2 x$ and $\\tan x\\cos x$ is $\\sin x$.',
              ),
            ),
            ask('tid-simplify-steps', 2),
            ask('tid-rearrange-tiles', 2),
            ask('tid-simplify-choice', 2),
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
              maths('5\\sin^2 37^{\\circ} + 5\\cos^2 37^{\\circ} = 5(\\sin^2 37^{\\circ} + \\cos^2 37^{\\circ}) = 5'),
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
            ask('tid-simplify-choice', 2),
            ask('tid-value-from-identity', 2),
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
              maths('2\\sin^2 x - \\sin x - 1 = 0 \\quad \\Rightarrow \\quad (2\\sin x + 1)(\\sin x - 1) = 0'),
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
              maths('2\\cos^2 x + 3\\sin x = 3 \\quad \\Rightarrow \\quad 2 - 2\\sin^2 x + 3\\sin x - 3 = 0'),
              maths('2\\sin^2 x - 3\\sin x + 1 = 0'),
              prose('Collect everything on one side, then multiply through by $-1$ so the squared term is positive.'),
            ),
            ask('tid-disguised-tiles'),
            ask('tid-quadratic-tree', 2),
            ask('tid-solution-count', 2),
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
              maths('\\sin x = \\sqrt{3}\\cos x \\quad \\Rightarrow \\quad \\tan x = \\sqrt{3}'),
              prose(
                'That is safe here: where $\\cos x = 0$, $\\sin x$ is $\\pm 1$, so no solution is lost.',
              ),
              prose(
                'Tangent repeats every $180^{\\circ}$, so from $0^{\\circ}$ to $360^{\\circ}$ there are two answers, $180^{\\circ}$ apart: $60^{\\circ}$ and $240^{\\circ}$.',
              ),
            ),
            ask('tid-tan-solve'),
            ask('tid-tan-slider'),
            ask('tid-tan-solve-tiles'),
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
            ask('tid-tan-solve+choice', 2),
            ask('tid-tan-slider', 2),
            teach(
              prose(
                'In radians nothing changes but the numbers: tangent repeats every $\\pi$, so the second answer is the first plus $\\pi$.',
              ),
              maths('\\tan x = 1 \\quad \\Rightarrow \\quad x = \\frac{\\pi}{4} \\text{ or } \\frac{5\\pi}{4}'),
            ),
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
  ],
};
