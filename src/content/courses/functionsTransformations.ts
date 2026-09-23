/**
 * Functions & Transformations.
 *
 * Level 1 is about a function as a rule: what $f(4)$ and $f(a)$ mean, which
 * inputs a rule can take and which outputs it can give, one function fed into
 * another, and a function undone. It closes on which functions can be undone
 * at all, and what the undoing looks like on a graph.
 *
 * Later levels — moving and stretching graphs, graphs of functions, even and
 * odd functions, and the rest — are in the level plan in `docs/ROADMAP.md`.
 *
 * Each level closes with a level check: twelve to fifteen questions, no
 * teaching slides, one attempt each.
 */
import type { Block, Course, SlideRef } from '../types';
import { plotSvg } from '../figures';

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

/**
 * An exercise with a line of teaching above it, on the same slide, where the
 * question turns in a new direction.
 */
const askWith = (generatorId: string, text: string, difficulty = 1): SlideRef => ({
  type: 'generated',
  generatorId,
  difficulty,
  leadIn: [prose(text)],
});

/** Curves on one set of axes, the first drawn in the accent colour. */
const graph = (
  fs: ((x: number) => number)[],
  window: { xMin: number; xMax: number; yMin: number; yMax: number },
  label: string,
  dashed: ((x: number) => number)[] = [],
): Block => ({
  kind: 'diagram',
  svg: plotSvg({
    ...window,
    curves: [
      ...fs.map((f, idx) => ({ f, accent: idx === 0 })),
      ...dashed.map((f) => ({ f, dashed: true })),
    ],
    verticals: [{ x: 0, dashed: false }],
    label,
  }),
});

export const functionsTransformations: Course = {
  id: 'functions-transformations',
  title: 'Functions & Transformations',
  blurb: 'A function as a rule to follow, combine and undo, and then as a graph to move.',
  levels: [
    {
      id: 'fn-l1',
      title: 'Functions',
      lessons: [
        {
          id: 'fn-l1-notation',
          title: 'Function Notation',
          slides: [
            teach(
              prose(
                'A **function** is a rule that turns each input into exactly one output. We give it a name, usually $f$, and write what it does to $x$.',
              ),
              maths('f(x) = 3x - 2'),
              prose(
                '$f(4)$ means the output when the input is $4$: write $4$ wherever $x$ was, and work it out.',
              ),
              maths('f(4) = 3 \\times 4 - 2 = 10'),
              prose('The brackets hold the input. They do **not** mean multiply: $f(4)$ is not $f \\times 4$.'),
            ),
            ask('fun-evaluate'),
            ask('fun-machine-tree'),
            ask('fun-evaluate+choice'),
            teach(
              prose('The input need not be a number. $f(a)$ is the rule with $a$ written in place of $x$:'),
              maths('f(a) = 3a - 2'),
              prose(
                'Whatever sits in the bracket replaces **every** $x$, so put it in brackets of its own and then tidy up:',
              ),
              maths('f(a + 1) = 3(a + 1) - 2 = 3a + 1'),
            ),
            ask('fun-substitute'),
            ask('fun-machine-tree', 2),
            ask('fun-substitute', 2),
            teach(
              prose(
                'The question can also run backwards. $f(x) = 10$ gives the **output** and asks for the input, so it is an equation to solve:',
              ),
              maths('\\begin{gathered} 3x - 2 = 10 \\\\ x = 4 \\end{gathered}'),
              prose('Working out $f(10)$ instead is the usual slip — that answers a different question.'),
            ),
            ask('fun-solve'),
            ask('fun-solve+choice', 2),
          ],
          skillCheck: [ask('fun-evaluate', 2), ask('fun-substitute', 2), ask('fun-solve', 2)],
        },
        {
          id: 'fn-l1-domain',
          title: 'Domain and Range',
          slides: [
            teach(
              prose(
                'The **domain** of a function is the set of inputs it is allowed to take. Most rules take any number, but two things break a rule:',
              ),
              prose('a square root of a negative number, and division by zero.'),
              maths('f(x) = \\sqrt{x - 3} \\quad \\Rightarrow \\quad x \\geq 3'),
              maths('g(x) = \\frac{1}{x + 2} \\quad \\Rightarrow \\quad x \\neq -2'),
              prose('A root may be of $0$, so the boundary is included. A fraction just loses one value.'),
            ),
            ask('fun-domain-flow'),
            ask('fun-domain'),
            ask('fun-domain+choice'),
            teach(
              prose(
                'The **range** is the set of outputs the function actually gives. On a graph, the domain runs across and the range runs up.',
              ),
              graph(
                [(x) => (x - 1) ** 2 + 2],
                { xMin: -3, xMax: 5, yMin: -2, yMax: 10 },
                'The parabola y = (x - 1) squared plus 2, lowest at height 2',
                [() => 2],
              ),
              prose(
                '$f(x) = (x - 1)^2 + 2$: a square is never negative, so $f$ is never less than $2$. Its range is $f(x) \\geq 2$ — the height of the lowest point.',
              ),
            ),
            ask('fun-range-slider'),
            ask('fun-range'),
            ask('fun-range-slider', 2),
            teach(
              prose(
                'A function can be given a smaller domain on purpose. Then the range comes from the ends of that domain — for a straight line, the two ends.',
              ),
              maths('f(x) = 2x + 1, \\quad 0 \\leq x \\leq 4'),
              maths('1 \\leq f(x) \\leq 9'),
              prose(
                'If the line **falls**, the left end gives the top. And a curve can turn round inside the domain, so check where it is lowest, not only its ends.',
              ),
            ),
            ask('fun-range', 2),
            ask('fun-domain-flow', 2),
          ],
          skillCheck: [ask('fun-domain', 2), ask('fun-range-slider', 2), ask('fun-domain-flow', 2)],
        },
        {
          id: 'fn-l1-composite',
          title: 'Composite Functions',
          slides: [
            teach(
              prose('Functions can be chained: the output of one becomes the input of the next.'),
              maths('f(x) = 2x + 1, \\quad g(x) = x^2'),
              prose(
                '$fg(x)$ means $f(g(x))$: $g$ acts **first**, because it is nearest the $x$, and its output goes into $f$.',
              ),
              maths('fg(3) = f(g(3)) = f(9) = 19'),
            ),
            ask('fun-composite-value'),
            ask('fun-chain-tree'),
            ask('fun-composite-value+choice'),
            teach(
              prose('The other way round is a different function. $gf(3)$ puts $3$ into $f$ first:'),
              maths('gf(3) = g(f(3)) = g(7) = 49'),
              prose('For the whole rule, write all of $g(x)$ in place of $x$ in $f$:'),
              maths('fg(x) = 2(x^2) + 1 = 2x^2 + 1'),
              maths('gf(x) = (2x + 1)^2'),
              prose('$fg$ never means $f$ times $g$.'),
            ),
            ask('fun-composite-order'),
            ask('fun-composite-form'),
            ask('fun-chain-tree', 2),
            teach(
              prose(
                'With two straight lines the composite is another straight line. The $x$ coefficient is the same either way round; the number on the end is not.',
              ),
              maths('f(x) = 3x - 4, \\quad g(x) = 2x + 5'),
              maths('fg(x) = 6x + 11, \\quad gf(x) = 6x - 3'),
            ),
            ask('fun-composite-form', 2),
            ask('fun-composite-order', 2),
          ],
          skillCheck: [ask('fun-composite-value', 2), ask('fun-composite-form', 2), ask('fun-composite-order', 2)],
        },
        {
          id: 'fn-l1-inverse',
          title: 'Inverse Functions',
          slides: [
            teach(
              prose(
                'The **inverse** of $f$, written $f^{-1}$, undoes it: if $f$ sends $2$ to $7$, then $f^{-1}$ sends $7$ back to $2$.',
              ),
              prose('To find it, write $y = f(x)$, swap $x$ and $y$, and make $y$ the subject again.'),
              maths('\\begin{gathered} y = 3x - 2 \\\\ x = 3y - 2 \\\\ y = \\frac{x + 2}{3} \\end{gathered}'),
              maths('f^{-1}(x) = \\frac{x + 2}{3}'),
            ),
            ask('fun-inverse-steps'),
            ask('fun-inverse-form'),
            ask('fun-inverse-value'),
            teach(
              prose(
                'For one value, the whole inverse is not needed. $f^{-1}(13)$ is the input $f$ turns into $13$ — solve $f(x) = 13$ by undoing each step of $f$ in **reverse** order.',
              ),
              maths('f(x) = 3x - 2: \\quad 13 \\xrightarrow{+2} 15 \\xrightarrow{\\div 3} 5'),
              prose('So $f^{-1}(13) = 5$. The $-1$ is not a power: $f^{-1}(x)$ is not $\\frac{1}{f(x)}$.'),
            ),
            ask('fun-undo-tree'),
            ask('fun-inverse-value+choice'),
            ask('fun-inverse-steps', 2),
            teach(
              prose(
                'Undoing a square needs a square root, and a square root gives only the positive answer. So a function with a square only has an inverse when its domain keeps $x$ on one side of the turning point:',
              ),
              maths('f(x) = (x - 1)^2 + 3, \\quad x \\geq 1'),
              maths('f^{-1}(x) = 1 + \\sqrt{x - 3}'),
            ),
            ask('fun-undo-tree', 2),
            ask('fun-inverse-form', 2),
          ],
          skillCheck: [ask('fun-inverse-form', 2), ask('fun-inverse-value', 2), ask('fun-undo-tree', 2)],
        },
        {
          id: 'fn-l1-one-to-one',
          title: 'One-to-One Functions',
          slides: [
            teach(
              prose('A **mapping** sends inputs to outputs. There are four kinds:'),
              prose(
                '**one-to-one** — each output comes from one input; **many-to-one** — two inputs can share an output; **one-to-many** — one input has two outputs; **many-to-many** — both.',
              ),
              prose(
                'Only the first two are **functions**: a function gives each input exactly one output. $y = x^2$ is many-to-one, since $2$ and $-2$ both give $4$.',
              ),
            ),
            ask('fun-mapping'),
            ask('fun-mapping-flow'),
            ask('fun-mapping', 2),
            teach(
              prose(
                'Only a **one-to-one** function has an inverse. If $f(2)$ and $f(-2)$ were both $4$, the inverse would have to send $4$ back to two places — and then it would not be a function.',
              ),
              prose(
                'A many-to-one function can be made one-to-one by cutting its domain down: $f(x) = x^2$ with $x \\geq 0$ has the inverse $\\sqrt{x}$.',
              ),
            ),
            ask('fun-mapping-flow', 2),
            ask('fun-inverse-point'),
            ask('fun-inverse-meet'),
            teach(
              prose(
                'The inverse swaps inputs and outputs, so the point $(2, 7)$ on $y = f(x)$ becomes $(7, 2)$ on $y = f^{-1}(x)$. Swapping coordinates is a reflection in the line $y = x$:',
              ),
              graph(
                [(x) => 2 * x + 1, (x) => (x - 1) / 2],
                { xMin: -5, xMax: 5, yMin: -5, yMax: 5 },
                'The line y = 2x + 1 and its inverse, reflections of each other in the dashed line y = x',
                [(x) => x],
              ),
              prose('A line and its inverse meet on $y = x$ — where $f(x) = x$.'),
            ),
            ask('fun-inverse-point', 2),
            askWith('fun-inverse-meet', 'Steeper lines this time, so the crossing is harder to judge by eye.', 2),
          ],
          skillCheck: [ask('fun-mapping-flow', 2), ask('fun-inverse-point', 2), ask('fun-inverse-meet', 2)],
        },
      ],
      levelCheck: [
        ask('fun-evaluate', 2),
        ask('fun-domain', 2),
        ask('fun-composite-value', 2),
        ask('fun-inverse-steps', 2),
        ask('fun-mapping-flow', 2),
        ask('fun-substitute', 2),
        ask('fun-range-slider', 2),
        ask('fun-composite-order', 2),
        ask('fun-undo-tree', 2),
        ask('fun-solve+choice', 2),
        ask('fun-range', 2),
        ask('fun-domain-flow', 2),
        ask('fun-composite-form', 2),
        ask('fun-inverse-value', 2),
        ask('fun-inverse-point', 2),
      ],
    },
  ],
};
