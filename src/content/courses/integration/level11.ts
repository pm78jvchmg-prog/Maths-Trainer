/**
 * Further Integration, level 11: Inverse Trigonometric and Hyperbolic
 * Integrals.
 *
 * The arcsine and arctangent read backwards as integrals, quadratics brought
 * to those shapes by completing the square, the hyperbolic functions and their
 * integrals (with the length of a hanging chain), and the two integrals that
 * give inverse hyperbolic functions, written as logarithms. Generators are in
 * `generators/integrationInverse.ts`.
 */
import type { Level } from '../../types';
import { ask, maths, prose, teach } from './blocks';

export const inverseIntegrals: Level = {
  id: 'in-l11',
  title: 'Inverse Trigonometric and Hyperbolic Integrals',
  lessons: [
    {
      id: 'in-l11-asin',
      title: 'The Arcsine Integral',
      slides: [
        teach(
          prose('Differentiating $\\arcsin\\frac{x}{a}$ gives $\\frac{1}{\\sqrt{a^{2} - x^{2}}}$. Read backwards, that is an integral:'),
          maths('\\int \\frac{1}{\\sqrt{a^{2} - x^{2}}} \\, dx = \\arcsin\\frac{x}{a} + C'),
          prose('So with $a = 4$:'),
          maths('\\int \\frac{3}{\\sqrt{16 - x^{2}}} \\, dx = 3\\arcsin\\frac{x}{4} + C'),
        ),
        ask('int-inv-asin-typed'),
        ask('int-inv-asin-typed+choice'),
        teach(
          prose('With a number in front of $x^{2}$, take it out of the root first. For $\\int \\frac{1}{\\sqrt{9 - 4x^{2}}} \\, dx$:'),
          maths('\\sqrt{9 - 4x^{2}} = 2\\sqrt{\\frac{9}{4} - x^{2}}'),
          prose('Now $a = \\frac{3}{2}$, and the $\\frac{1}{2}$ stays in front:'),
          maths('\\int \\frac{1}{\\sqrt{9 - 4x^{2}}} \\, dx = \\frac{1}{2}\\arcsin\\frac{2x}{3} + C'),
        ),
        ask('int-inv-asin-tiles'),
        teach(
          prose('With limits, the arcsine of a standard value is a standard angle:'),
          maths('\\int_{0}^{\\frac{5}{2}} \\frac{2}{\\sqrt{25 - x^{2}}} \\, dx = 2\\left[\\arcsin\\frac{x}{5}\\right]_{0}^{\\frac{5}{2}}'),
          maths('= 2\\left(\\frac{\\pi}{6} - 0\\right) = \\frac{\\pi}{3}'),
          prose('The angles to know:'),
          maths('\\arcsin\\frac{1}{2} = \\frac{\\pi}{6} \\qquad \\arcsin\\frac{1}{\\sqrt{2}} = \\frac{\\pi}{4} \\qquad \\arcsin\\frac{\\sqrt{3}}{2} = \\frac{\\pi}{3}'),
          prose('Arcsine is odd, so $\\arcsin\\left(-\\frac{1}{2}\\right) = -\\frac{\\pi}{6}$.'),
        ),
        ask('int-inv-asin-value'),
        ask('int-inv-asin-tiles', 2),
        ask('int-inv-asin-value', 2),
      ],
      skillCheck: [ask('int-inv-asin-typed', 2), ask('int-inv-asin-tiles', 2), ask('int-inv-asin-value', 2)],
    },
    {
      id: 'in-l11-atan',
      title: 'The Arctangent Integral',
      slides: [
        teach(
          prose('Differentiating $\\arctan\\frac{x}{a}$ gives $\\frac{a}{a^{2} + x^{2}}$, so this time there is a $\\frac{1}{a}$ in front:'),
          maths('\\int \\frac{1}{a^{2} + x^{2}} \\, dx = \\frac{1}{a}\\arctan\\frac{x}{a} + C'),
          prose('So with $a = 3$:'),
          maths('\\int \\frac{6}{9 + x^{2}} \\, dx = 2\\arctan\\frac{x}{3} + C'),
          prose('No root, and a plus sign: that is how to tell it from the arcsine.'),
        ),
        ask('int-inv-atan-typed'),
        ask('int-inv-atan-typed+choice'),
        teach(
          prose('With limits:'),
          maths('\\int_{0}^{3} \\frac{2}{9 + x^{2}} \\, dx = \\frac{2}{3}\\left[\\arctan\\frac{x}{3}\\right]_{0}^{3}'),
          maths('= \\frac{2}{3} \\times \\frac{\\pi}{4} = \\frac{\\pi}{6}'),
          prose('Standard values:'),
          maths('\\arctan 1 = \\frac{\\pi}{4} \\qquad \\arctan\\sqrt{3} = \\frac{\\pi}{3} \\qquad \\arctan\\frac{1}{\\sqrt{3}} = \\frac{\\pi}{6}'),
          prose('Arctangent is odd, so $\\arctan(-1) = -\\frac{\\pi}{4}$.'),
        ),
        ask('int-inv-atan-steps'),
        ask('int-inv-atan-value'),
        teach(
          prose('From $x = a$ to $x = a\\sqrt{3}$ the angles are $\\frac{\\pi}{4}$ and $\\frac{\\pi}{3}$, a difference of $\\frac{\\pi}{12}$.'),
          prose('A number in front of $x^{2}$ comes out first, as with the arcsine:'),
          maths('\\int \\frac{1}{4 + 9x^{2}} \\, dx = \\frac{1}{9}\\int \\frac{1}{\\frac{4}{9} + x^{2}} \\, dx'),
          maths('= \\frac{1}{6}\\arctan\\frac{3x}{2} + C'),
        ),
        ask('int-inv-atan-steps', 2),
        ask('int-inv-atan-value', 2),
      ],
      skillCheck: [ask('int-inv-atan-typed', 2), ask('int-inv-atan-steps', 2), ask('int-inv-atan-value', 2)],
    },
    {
      id: 'in-l11-square',
      title: 'Completing the Square',
      slides: [
        teach(
          prose('A quadratic with an $x$ term hides one of these shapes. Complete the square to find it:'),
          maths('x^{2} + 6x + 13 = (x + 3)^{2} + 4'),
          prose('Half of $6$ is $3$, and $3^{2} = 9$. Taking that from $13$ leaves $4$.'),
        ),
        ask('int-inv-square-tiles'),
        teach(
          prose('Now it is $\\frac{1}{u^{2} + a^{2}}$ with $u = x + 3$ and $a = 2$, so'),
          maths('\\int \\frac{1}{x^{2} + 6x + 13} \\, dx = \\frac{1}{2}\\arctan\\frac{x + 3}{2} + C'),
        ),
        ask('int-inv-square-typed'),
        teach(
          prose('With a minus in front of $x^{2}$, complete the square the other way round:'),
          maths('7 + 6x - x^{2} = 16 - (x - 3)^{2}'),
          prose('That is $\\frac{1}{\\sqrt{a^{2} - u^{2}}}$ with $u = x - 3$ and $a = 4$:'),
          maths('\\int \\frac{1}{\\sqrt{7 + 6x - x^{2}}} \\, dx = \\arcsin\\frac{x - 3}{4} + C'),
        ),
        ask('int-inv-square-flow'),
        ask('int-inv-square-tiles', 2),
        ask('int-inv-square-typed', 2),
        ask('int-inv-square-flow'),
      ],
      skillCheck: [ask('int-inv-square-tiles', 2), ask('int-inv-square-typed', 2), ask('int-inv-square-flow')],
    },
    {
      id: 'in-l11-hyper',
      title: 'Hyperbolic Functions',
      slides: [
        teach(
          prose('The **hyperbolic** functions are built from $e^{x}$:'),
          maths('\\cosh x = \\frac{e^{x} + e^{-x}}{2}'),
          maths('\\sinh x = \\frac{e^{x} - e^{-x}}{2}'),
          prose('At $x = \\ln 2$, $e^{x} = 2$ and $e^{-x} = \\frac{1}{2}$, so'),
          maths('\\cosh(\\ln 2) = \\frac{1}{2}\\left(2 + \\frac{1}{2}\\right) = \\frac{5}{4}'),
          maths('\\sinh(\\ln 2) = \\frac{1}{2}\\left(2 - \\frac{1}{2}\\right) = \\frac{3}{4}'),
          prose('With a number in front of the logarithm, $e^{2\\ln 3} = 3^{2} = 9$.'),
        ),
        ask('int-hyp-value-tree'),
        teach(
          prose('They differentiate into each other, with no minus sign anywhere:'),
          maths('\\frac{d}{dx}\\sinh x = \\cosh x'),
          maths('\\frac{d}{dx}\\cosh x = \\sinh x'),
          prose('So each integrates to the other:'),
          maths('\\int \\cosh x \\, dx = \\sinh x + C \\qquad \\int \\sinh x \\, dx = \\cosh x + C'),
          prose('With $kx$ inside, divide by $k$:'),
          maths('\\int 6\\cosh 3x \\, dx = 2\\sinh 3x + C'),
        ),
        ask('int-hyp-integral'),
        ask('int-hyp-integral+choice'),
        teach(
          prose('A hanging chain takes the shape $y = c\\cosh\\frac{x}{c}$. Its length is neat because $1 + \\sinh^{2} u = \\cosh^{2} u$:'),
          maths('\\frac{dy}{dx} = \\sinh\\frac{x}{c}'),
          maths('\\sqrt{1 + \\sinh^{2}\\frac{x}{c}} = \\cosh\\frac{x}{c}'),
          prose(
            'For $y = 3\\cosh\\frac{x}{3}$ from $0$ to $3\\ln 2$ the length is $\\left[3\\sinh\\frac{x}{3}\\right]_{0}^{3\\ln 2} = 3\\sinh(\\ln 2) = \\frac{9}{4}$. From $-3\\ln 2$ to $3\\ln 2$ it is twice that, by symmetry.',
          ),
        ),
        ask('int-hyp-catenary'),
        ask('int-hyp-value-tree', 2),
        ask('int-hyp-catenary', 2),
      ],
      skillCheck: [ask('int-hyp-value-tree', 2), ask('int-hyp-integral', 2), ask('int-hyp-catenary', 2)],
    },
    {
      id: 'in-l11-arhyp',
      title: 'Inverse Hyperbolic Integrals',
      slides: [
        teach(
          prose('Two more standard results, with the inverse hyperbolic functions:'),
          maths('\\int \\frac{1}{\\sqrt{x^{2} + a^{2}}} \\, dx = \\operatorname{arsinh}\\frac{x}{a} + C'),
          maths('\\int \\frac{1}{\\sqrt{x^{2} - a^{2}}} \\, dx = \\operatorname{arcosh}\\frac{x}{a} + C'),
          prose(
            'The second holds for $x > a$. Beside the arcsine and the arctangent, the shape under the root, or no root at all, says which result applies.',
          ),
        ),
        ask('int-inv-hyp-choice'),
        teach(
          prose('Each can be written as a logarithm:'),
          maths('\\operatorname{arsinh} u = \\ln\\left(u + \\sqrt{u^{2} + 1}\\right)'),
          maths('\\operatorname{arcosh} u = \\ln\\left(u + \\sqrt{u^{2} - 1}\\right)'),
          prose('At $u = \\frac{3}{4}$ the root is $\\frac{5}{4}$, so'),
          maths('\\operatorname{arsinh}\\frac{3}{4} = \\ln\\left(\\frac{3}{4} + \\frac{5}{4}\\right) = \\ln 2'),
        ),
        ask('int-inv-hyp-tree'),
        teach(
          prose('A definite integral comes out as a single logarithm:'),
          maths('\\int_{0}^{4} \\frac{1}{\\sqrt{x^{2} + 9}} \\, dx = \\left[\\ln\\left(x + \\sqrt{x^{2} + 9}\\right)\\right]_{0}^{4}'),
          maths('= \\ln 9 - \\ln 3 = \\ln 3'),
          prose('The $-\\ln a$ that turns $\\operatorname{arsinh}\\frac{x}{a}$ into this logarithm cancels between the limits.'),
        ),
        ask('int-inv-hyp-value'),
        ask('int-inv-hyp-choice'),
        ask('int-inv-hyp-tree'),
        ask('int-inv-hyp-value'),
      ],
      skillCheck: [ask('int-inv-hyp-choice'), ask('int-inv-hyp-tree'), ask('int-inv-hyp-value')],
    },
  ],
  levelCheck: [
    ask('int-inv-asin-typed', 2),
    ask('int-inv-asin-tiles', 2),
    ask('int-inv-asin-value', 2),
    ask('int-inv-atan-typed+choice', 2),
    ask('int-inv-atan-value', 2),
    ask('int-inv-atan-steps', 2),
    ask('int-inv-square-tiles', 2),
    ask('int-inv-square-typed', 2),
    ask('int-hyp-value-tree', 2),
    ask('int-hyp-integral', 2),
    ask('int-hyp-catenary', 2),
    ask('int-inv-hyp-choice'),
    ask('int-inv-hyp-tree'),
    ask('int-inv-hyp-value'),
  ],
};
