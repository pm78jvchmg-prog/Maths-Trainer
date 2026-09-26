/**
 * Further Integration, level 9: Reduction Formulae.
 *
 * A family of integrals I_n linked to a smaller member by parts: powers times
 * an exponential, the same with limits running to infinity, powers of sine and
 * cosine over a quarter turn, and powers of a logarithm, then choosing the
 * parts for yourself. Generators are in `generators/integrationReduction.ts`.
 */
import type { Level } from '../../types';
import { ask, maths, prose, teach } from './blocks';

export const reductionFormulae: Level = {
  id: 'in-l9',
  title: 'Reduction Formulae',
  lessons: [
    {
      id: 'in-l9-exp',
      title: 'Stepping Down a Power',
      slides: [
        teach(
          prose(
            'Some integrals come in families, such as $I_{n} = \\int x^{n}e^{x} \\, dx$ for $n = 0, 1, 2, \\dots$. A **reduction formula** links one member to a smaller one, so the family can be worked out step by step.',
          ),
          prose('Integrate by parts with $u = x^{n}$ and $\\frac{dv}{dx} = e^{x}$:'),
          maths('\\frac{du}{dx} = nx^{n-1} \\qquad v = e^{x}'),
          prose('Put into the parts formula, they give'),
          maths('I_{n} = x^{n}e^{x} - \\int nx^{n-1}e^{x} \\, dx'),
          prose('The integral left is $n$ times the next one down:'),
          maths('I_{n} = x^{n}e^{x} - nI_{n-1}'),
        ),
        teach(
          prose('With $e^{kx}$ the same steps give $v = \\frac{1}{k}e^{kx}$, so both terms pick up $\\frac{1}{k}$:'),
          maths('I_{n} = \\frac{1}{k}x^{n}e^{kx} - \\frac{n}{k}I_{n-1}'),
          prose('For $I_{m} = \\int x^{m}e^{3x} \\, dx$, the line for $m = 5$ is'),
          maths('I_{5} = \\frac{1}{3}x^{5}e^{3x} - \\frac{5}{3}I_{4}'),
        ),
        ask('int-red-exp-relation'),
        ask('int-red-exp-tiles'),
        teach(
          prose('To integrate, step down to $I_{0}$, which has no power of $x$ left. For $\\int x^{2}e^{2x} \\, dx$:'),
          maths('I_{0} = \\frac{1}{2}e^{2x}'),
          maths('I_{1} = \\frac{1}{2}xe^{2x} - \\frac{1}{2}I_{0}'),
          maths('= \\frac{1}{2}xe^{2x} - \\frac{1}{4}e^{2x}'),
          maths('I_{2} = \\frac{1}{2}x^{2}e^{2x} - I_{1}'),
          maths('= e^{2x}\\biggl(\\frac{1}{2}x^{2} - \\frac{1}{2}x + \\frac{1}{4}\\biggr) + C'),
          prose('A number in front multiplies the whole answer. A negative $k$ uses the same formula: for $e^{-x}$, $k = -1$ and'),
          maths('I_{n} = -x^{n}e^{-x} + nI_{n-1}'),
        ),
        ask('int-red-exp-full'),
        ask('int-red-exp-relation', 2),
        ask('int-red-exp-tiles', 2),
        ask('int-red-exp-full', 2),
      ],
      skillCheck: [ask('int-red-exp-relation', 2), ask('int-red-exp-tiles', 2), ask('int-red-exp-full', 2)],
    },
    {
      id: 'in-l9-limits',
      title: 'Reduction Formulae with Limits',
      slides: [
        teach(
          prose(
            'With limits, the term outside the integral becomes a number, often $0$. Take $I_{n} = \\int_{0}^{\\infty} x^{n}e^{-2x} \\, dx$ and integrate by parts with $u = x^{n}$ and $v = -\\frac{1}{2}e^{-2x}$:',
          ),
          maths('I_{n} = \\left[-\\frac{1}{2}x^{n}e^{-2x}\\right]_{0}^{\\infty} + \\frac{n}{2}I_{n-1}'),
          prose(
            'At $0$ the bracket is $0$ because of the $x^{n}$. As $x \\to \\infty$ it tends to $0$, because $e^{-2x}$ shrinks faster than any power grows. So',
          ),
          maths('I_{n} = \\frac{n}{2}I_{n-1}'),
          prose('In general $e^{-kx}$ gives $I_{n} = \\frac{n}{k}I_{n-1}$, and $e^{-x/k}$ gives $I_{n} = knI_{n-1}$.'),
        ),
        ask('int-red-gamma-relation'),
        teach(
          prose('The chain starts at $I_{0}$, which has no power of $x$:'),
          maths('I_{0} = \\int_{0}^{\\infty} e^{-2x} \\, dx = \\frac{1}{2}'),
          prose('Each step multiplies by $\\frac{n}{2}$:'),
          maths('I_{1} = \\frac{1}{2} \\times \\frac{1}{2} = \\frac{1}{4}'),
          maths('I_{2} = 1 \\times \\frac{1}{4} = \\frac{1}{4}'),
          maths('I_{3} = \\frac{3}{2} \\times \\frac{1}{4} = \\frac{3}{8}'),
          prose('With $e^{-x/3}$ instead, $I_{0} = 3$ and each step multiplies by $3n$.'),
        ),
        ask('int-red-gamma-tree'),
        ask('int-red-gamma-value'),
        teach(
          prose(
            'Written out, the chain is a factorial: for $e^{-kx}$, $I_{n} = \\frac{n!}{k^{n+1}}$. That is a useful check, but the step-by-step route is the one the formula gives, and it works when no such pattern appears.',
          ),
        ),
        ask('int-red-gamma-relation', 2),
        ask('int-red-gamma-tree', 2),
        ask('int-red-gamma-value', 2),
      ],
      skillCheck: [ask('int-red-gamma-relation', 2), ask('int-red-gamma-tree', 2), ask('int-red-gamma-value', 2)],
    },
    {
      id: 'in-l9-wallis',
      title: 'Powers of Sine and Cosine',
      slides: [
        teach(
          prose(
            'Let $I_{n} = \\int_{0}^{\\frac{\\pi}{2}} \\sin^{n} x \\, dx$. Split off one $\\sin x$ and integrate by parts with',
          ),
          maths('u = \\sin^{n-1} x \\qquad \\frac{dv}{dx} = \\sin x'),
          prose('The bracket is $0$ at both limits, which leaves'),
          maths('I_{n} = (n - 1)\\int_{0}^{\\frac{\\pi}{2}} \\sin^{n-2} x\\cos^{2} x \\, dx'),
          prose('Write $\\cos^{2} x = 1 - \\sin^{2} x$. That makes the right side $(n - 1)(I_{n-2} - I_{n})$. Collect the $I_{n}$ terms:'),
          maths('nI_{n} = (n - 1)I_{n-2}'),
          maths('I_{n} = \\frac{n - 1}{n}I_{n-2}'),
          prose('Turned round, $I_{n-2} = \\frac{n}{n - 1}I_{n}$. The same holds for $\\cos^{n} x$ over the same limits.'),
        ),
        ask('int-red-wallis-tiles'),
        teach(
          prose('Each step drops the power by $2$, so the chain ends at $I_{0} = \\frac{\\pi}{2}$ or at $I_{1} = 1$:'),
          maths('I_{5} = \\frac{4}{5} \\cdot \\frac{2}{3} \\cdot 1 = \\frac{8}{15}'),
          maths('I_{4} = \\frac{3}{4} \\cdot \\frac{1}{2} \\cdot \\frac{\\pi}{2} = \\frac{3\\pi}{16}'),
          prose(
            'Even powers end at $\\frac{\\pi}{2}$, so their answers carry $\\pi$. Two steps at once multiply two factors: $I_{6} = \\frac{5}{6} \\cdot \\frac{3}{4}I_{2} = \\frac{5}{8}I_{2}$.',
          ),
          prose('A number in front multiplies the answer: $\\int_{0}^{\\frac{\\pi}{2}} 2\\sin^{5} x \\, dx = \\frac{16}{15}$.'),
        ),
        ask('int-red-wallis-tree'),
        ask('int-red-wallis-value'),
        teach(
          prose('For cosine the working swaps the roles of $\\sin$ and $\\cos$, but the numbers come out the same:'),
          maths('\\int_{0}^{\\frac{\\pi}{2}} \\cos^{4} x \\, dx = \\frac{3\\pi}{16}'),
        ),
        ask('int-red-wallis-tiles', 2),
        ask('int-red-wallis-tree', 2),
        ask('int-red-wallis-value', 2),
      ],
      skillCheck: [ask('int-red-wallis-tiles', 2), ask('int-red-wallis-tree', 2), ask('int-red-wallis-value', 2)],
    },
    {
      id: 'in-l9-log',
      title: 'Powers of a Logarithm',
      slides: [
        teach(
          prose(
            'For $I_{n} = \\int x^{m}(\\ln x)^{n} \\, dx$ the logarithm is the part to differentiate, since $\\ln x$ has no easy integral. Take $u = (\\ln x)^{n}$ and $\\frac{dv}{dx} = x^{m}$:',
          ),
          maths('\\frac{du}{dx} = \\frac{n(\\ln x)^{n-1}}{x}'),
          maths('v = \\frac{x^{m+1}}{m + 1}'),
          prose('The $x$ underneath cancels one power of $x$ from $v$, which leaves $x^{m}$ inside again:'),
          maths('I_{n} = \\frac{x^{m+1}(\\ln x)^{n}}{m + 1} - \\frac{n}{m + 1}I_{n-1}'),
          prose('For $\\int x^{2}(\\ln x)^{n} \\, dx$ that reads $I_{n} = \\frac{1}{3}x^{3}(\\ln x)^{n} - \\frac{n}{3}I_{n-1}$.'),
        ),
        ask('int-red-log-relation'),
        ask('int-red-log-tiles'),
        teach(
          prose('Worked down to $I_{0} = \\int x^{m} \\, dx$ and back up. For $\\int x(\\ln x)^{2} \\, dx$:'),
          maths('I_{0} = \\frac{1}{2}x^{2}'),
          maths('I_{1} = \\frac{1}{2}x^{2}\\ln x - \\frac{1}{4}x^{2}'),
          maths('I_{2} = \\frac{1}{2}x^{2}(\\ln x)^{2} - I_{1}'),
          maths('= x^{2}\\biggl(\\frac{1}{2}(\\ln x)^{2} - \\frac{1}{2}\\ln x + \\frac{1}{4}\\biggr) + C'),
          prose('Answers hold for $x > 0$, where $\\ln x$ is defined. A number in front multiplies everything.'),
        ),
        ask('int-red-log-full'),
        ask('int-red-log-relation', 2),
        ask('int-red-log-tiles', 2),
        teach(
          prose('With no power of $x$ at all, $m = 0$:'),
          maths('\\int (\\ln x)^{2} \\, dx = x(\\ln x)^{2} - 2x\\ln x + 2x + C'),
          prose('A negative power of $x$ works the same way, as long as it is not $x^{-1}$, where $m + 1$ would be $0$.'),
        ),
        ask('int-red-log-full', 2),
      ],
      skillCheck: [ask('int-red-log-relation', 2), ask('int-red-log-tiles', 2), ask('int-red-log-full', 2)],
    },
    {
      id: 'in-l9-choose',
      title: 'Choosing the Parts',
      slides: [
        teach(
          prose('Every reduction formula so far came from one choice: which part is $u$. Differentiate the part whose power should fall, and integrate the rest.'),
          prose('For $x^{n}e^{kx}$, take $u = x^{n}$.'),
          prose('For $x^{m}(\\ln x)^{n}$, take $u = (\\ln x)^{n}$.'),
          prose('For $\\sin^{n} x$, keep one $\\sin x$ to integrate and take $u$ as the rest, $\\sin^{n-1} x$.'),
        ),
        ask('int-red-parts-flow'),
        ask('int-red-exp-full', 2),
        teach(
          prose('Then use the formula until a plain integral is left, and work back up. The four formulae from this level:'),
          prose('For $x^{n}e^{kx}$:'),
          maths('I_{n} = \\frac{1}{k}x^{n}e^{kx} - \\frac{n}{k}I_{n-1}'),
          prose('For $x^{n}e^{-kx}$ from $0$ to $\\infty$:'),
          maths('I_{n} = \\frac{n}{k}I_{n-1}'),
          prose('For $\\sin^{n} x$ or $\\cos^{n} x$ from $0$ to $\\frac{\\pi}{2}$:'),
          maths('I_{n} = \\frac{n - 1}{n}I_{n-2}'),
          prose('For $x^{m}(\\ln x)^{n}$:'),
          maths('I_{n} = \\frac{x^{m+1}(\\ln x)^{n}}{m + 1} - \\frac{n}{m + 1}I_{n-1}'),
        ),
        ask('int-red-wallis-tree'),
        ask('int-red-log-full'),
        ask('int-red-gamma-tree', 2),
        ask('int-red-parts-flow', 2),
        ask('int-red-wallis-value', 2),
      ],
      skillCheck: [ask('int-red-parts-flow', 2), ask('int-red-wallis-value', 2), ask('int-red-log-full', 2)],
    },
  ],
  levelCheck: [
    ask('int-red-exp-relation', 2),
    ask('int-red-exp-tiles', 2),
    ask('int-red-exp-full', 2),
    ask('int-red-gamma-relation', 2),
    ask('int-red-gamma-tree', 2),
    ask('int-red-gamma-value', 2),
    ask('int-red-wallis-tiles', 2),
    ask('int-red-wallis-tree', 2),
    ask('int-red-wallis-value', 2),
    ask('int-red-log-relation', 2),
    ask('int-red-log-full', 2),
    ask('int-red-parts-flow', 2),
  ],
};
