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
  category: 'advanced-algebra',
  // Straight after Trigonometric Functions, whose identities it puts to work.
  position: 15,
  title: 'Trigonometric Identities & Equations',
  blurb: 'Rewriting with identities to solve equations, compound and double angles, and the form R sin(x + α).',
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
            ask('tid-simplify-steps'),
            ask('tid-simplify-choice'),
            teach(
              prose(
                'To simplify, look for a piece that matches one side of an identity and swap in the other side. For example',
              ),
              maths('\\begin{aligned} \\frac{3(1 - \\cos^2 x)}{\\sin x} &= \\frac{3\\sin^2 x}{\\sin x} \\\\ &= 3\\sin x \\end{aligned}'),
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
              maths('\\begin{aligned} \\sin x &= \\sqrt{3}\\cos x \\\\ \\tan x &= \\sqrt{3} \\end{aligned}'),
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
              maths('\\tan x = 1 \\;\\Rightarrow\\; x = \\frac{\\pi}{4} \\text{ or } \\frac{5\\pi}{4}'),
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
            ask('tid-expand-tiles'),
            ask('tid-expand-tiles', 2),
            teach(
              prose('Read backwards, the formulae collapse two products into one function of one angle:'),
              maths(
                '\\begin{aligned} &\\cos 25^{\\circ}\\cos 35^{\\circ} \\\\ &\\quad - \\sin 25^{\\circ}\\sin 35^{\\circ} \\\\ &= \\cos 60^{\\circ} = \\frac{1}{2} \\end{aligned}',
              ),
              prose(
                'Cosine times cosine first means cosine, and the minus means the angles add. Sine times cosine first means sine, with the same sign in the bracket.',
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
            ask('tid-formula-choice', 2),
            ask('tid-tan-compound'),
            teach(
              prose('When one angle is a table angle, its tangent goes straight in. With $\\tan 45^{\\circ} = 1$,'),
              maths('\\tan(x + 45^{\\circ}) = \\frac{\\tan x + 1}{1 - \\tan x}'),
              prose(
                'With $\\tan 30^{\\circ} = \\frac{1}{\\sqrt{3}}$, multiply top and bottom by $\\sqrt{3}$ to clear the fraction inside the fraction.',
              ),
            ),
            ask('tid-tan-expand-tiles'),
            ask('tid-formula-choice', 2),
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
            ask('tid-exact-tiles'),
            ask('tid-collapse-tiles', 2),
            teach(
              prose(
                'Any angle between table angles can be split this way: $15^{\\circ} = 45^{\\circ} - 30^{\\circ}$, $105^{\\circ} = 60^{\\circ} + 45^{\\circ}$, $165^{\\circ} = 120^{\\circ} + 45^{\\circ}$.',
              ),
              prose(
                'Past $90^{\\circ}$ some table values are negative, and the sign has to go in with the value. Every answer is a quarter of $\\sqrt{6}$ and $\\sqrt{2}$, added or subtracted.',
              ),
            ),
            ask('tid-exact-tiles+choice', 2),
            ask('tid-exact-steps', 2),
            ask('tid-collapse-tiles', 2),
            teach(
              prose('The tangent formula does the same for tangents:'),
              maths(
                '\\begin{aligned} \\tan 15^{\\circ} &= \\frac{1 - \\frac{1}{\\sqrt{3}}}{1 + \\frac{1}{\\sqrt{3}}} = \\frac{\\sqrt{3} - 1}{\\sqrt{3} + 1} \\\\ &= 2 - \\sqrt{3} \\end{aligned}',
              ),
              prose('The last step multiplies top and bottom by $\\sqrt{3} - 1$. In the same way $\\tan 75^{\\circ} = 2 + \\sqrt{3}$.'),
            ),
            ask('tid-tan-exact-choice'),
            ask('tid-tan-exact-choice', 2),
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
            ask('tid-double-collapse-choice'),
            ask('tid-double-tiles', 2),
            teach(
              prose('Backwards, they collapse an expression to one function of twice the angle:'),
              maths('2\\sin 15^{\\circ}\\cos 15^{\\circ} = \\sin 30^{\\circ} = \\frac{1}{2}'),
              prose(
                'They also simplify. Pick the form of $\\cos 2x$ that cancels what is there: $1 - \\cos 2x = 2\\sin^2 x$, and $\\frac{\\sin 2x}{\\sin x} = 2\\cos x$.',
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
                'Outside the first quadrant, take the triangle for the sizes and the quadrant for the signs.',
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
            ask('tid-double-eq-flow'),
            ask('tid-double-eq-slider'),
            ask('tid-double-eq-flow', 2),
            teach(
              prose(
                'With $\\cos 2x$, choose the form that leaves one function. Next to $\\cos x$, use $2\\cos^2 x - 1$:',
              ),
              maths('\\begin{aligned} \\cos 2x - 3\\cos x + 2 &= 0 \\\\ 2\\cos^2 x - 3\\cos x + 1 &= 0 \\end{aligned}'),
              prose('Next to $\\sin x$, use $1 - 2\\sin^2 x$. Either way it is a quadratic you already know how to finish.'),
            ),
            ask('tid-double-quadratic-tiles'),
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
            ask('tid-r-match-tiles+choice'),
            ask('tid-r-expand-tiles', 2),
            teach(
              prose('To write $3\\sin x + 4\\cos x$ as $R\\sin(x + \\alpha)$, match the numbers in front of each function:'),
              maths('\\begin{aligned} R\\cos\\alpha &= 3 \\\\ R\\sin\\alpha &= 4 \\end{aligned}'),
              prose(
                'Pick the form whose signs fit. A minus needs $R\\sin(x - \\alpha)$ or $R\\cos(x + \\alpha)$, and the minus lives in the form, so both matched numbers stay positive and $\\alpha$ is acute. Two added terms fit $R\\sin(x + \\alpha)$ or $R\\cos(x - \\alpha)$, so a question always says which it wants.',
              ),
            ),
            ask('tid-r-form-flow'),
            ask('tid-r-match-tiles', 2),
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
            ask('tid-r-alpha-steps'),
            ask('tid-r-tan-alpha'),
            teach(
              prose(
                "With $R\\cos\\alpha$ and $R\\sin\\alpha$ both positive, $\\alpha$ is acute, so it is exactly the angle a calculator's $\\tan^{-1}$ gives:",
              ),
              maths('\\alpha = \\tan^{-1}\\tfrac{4}{3} = 53.1^{\\circ}'),
              maths('\\begin{aligned} &3\\sin x + 4\\cos x \\\\ &= 5\\sin(x + 53.1^{\\circ}) \\end{aligned}'),
              prose('Flip the fraction and you get $36.9^{\\circ}$, the other angle of the 3, 4, 5 triangle: the commonest slip here.'),
            ),
            ask('tid-r-convert-choice'),
            ask('tid-r-value+choice', 2),
            ask('tid-r-alpha-steps', 2),
            teach(
              prose('The other forms work the same way. In $R\\cos(x - \\alpha)$, the number in front of $\\cos x$ is $R\\cos\\alpha$:'),
              maths('\\begin{aligned} &R\\cos(x - \\alpha) \\\\ &= R\\cos\\alpha\\,\\cos x \\\\ &\\quad + R\\sin\\alpha\\,\\sin x \\end{aligned}'),
              prose(
                "So $4\\cos x + 3\\sin x = 5\\cos(x - 36.9^{\\circ})$, with $\\tan\\alpha = \\frac{3}{4}$. Always match against the form's own expansion.",
              ),
            ),
            ask('tid-r-tan-alpha', 2),
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
            ask('tid-r-exact-tiles'),
            ask('tid-r-exact-alpha'),
            ask('tid-r-expand-exact-choice'),
            teach(
              prose('A $1$ and a $\\sqrt{3}$ give $30^{\\circ}$ or $60^{\\circ}$, with $R = \\sqrt{3 + 1} = 2$:'),
              maths('\\begin{aligned} &\\sqrt{3}\\sin x + \\cos x \\\\ &= 2\\sin(x + 30^{\\circ}) \\end{aligned}'),
              prose(
                '$\\tan\\alpha = \\frac{1}{\\sqrt{3}}$ gives $30^{\\circ}$; swap the numbers and $\\tan\\alpha = \\sqrt{3}$ gives $60^{\\circ}$. Backwards, $2\\sin(x + 60^{\\circ})$ expands to $\\sin x + \\sqrt{3}\\cos x$.',
              ),
            ),
            ask('tid-r-squared-tree', 2),
            ask('tid-r-exact-tiles', 2),
            ask('tid-r-exact-alpha', 2),
            teach(
              prose('In radians the same angles are $\\frac{\\pi}{6}$, $\\frac{\\pi}{4}$ and $\\frac{\\pi}{3}$:'),
              maths('\\begin{aligned} &\\sin x - \\cos x \\\\ &= \\sqrt{2}\\sin\\left(x - \\frac{\\pi}{4}\\right) \\end{aligned}'),
              prose('Only the unit of $\\alpha$ changes; $R$ is the same either way.'),
            ),
            ask('tid-r-expand-exact-choice', 2),
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
              prose('A sine or cosine never leaves $-1$ to $1$, so $R\\sin(x + \\alpha)$ never leaves $-R$ to $R$:'),
              maths('-5 \\le 3\\sin x + 4\\cos x \\le 5'),
              prose(
                'The greatest value, $5$, comes where $x + \\alpha = 90^{\\circ}$; the least, $-5$, where $x + \\alpha = 270^{\\circ}$.',
              ),
            ),
            ask('tid-r-max-value'),
            ask('tid-r-max-tiles'),
            ask('tid-r-peak-slider'),
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
            ask('tid-r-peak-slider', 2),
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
              prose('Solve for the whole bracket $x + 30^{\\circ}$, then take $30^{\\circ}$ off each answer.'),
            ),
            ask('tid-r-solve-steps'),
            ask('tid-r-solve-angle'),
            ask('tid-r-solve-slider'),
            teach(
              prose(
                'The bracket runs over a shifted range. For $0^{\\circ} \\le x < 360^{\\circ}$, $x + 30^{\\circ}$ runs from $30^{\\circ}$ to $390^{\\circ}$, so',
              ),
              maths('\\begin{aligned} x + 30^{\\circ} &= 30^{\\circ}, 150^{\\circ} \\\\ x &= 0^{\\circ}, 120^{\\circ} \\end{aligned}'),
              prose(
                'A table angle that falls below the range comes back $360^{\\circ}$ later: with $x + 60^{\\circ}$, the $30^{\\circ}$ becomes $390^{\\circ}$.',
              ),
            ),
            ask('tid-r-count-flow'),
            ask('tid-r-solve-steps', 2),
            ask('tid-r-solve-angle+choice', 2),
            teach(
              prose(
                'Compare $c$ with $R$ before solving. $\\sin(x + \\alpha) = \\frac{c}{R}$ has two solutions a turn when $c$ is between $-R$ and $R$, one when $c = \\pm R$, and none beyond.',
              ),
              maths('3\\sin x + 4\\cos x = 6'),
              prose('has no solutions at all: $R = 5$, and the wave never reaches $6$.'),
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
  ],
};
