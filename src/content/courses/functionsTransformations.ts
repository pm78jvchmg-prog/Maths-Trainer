/**
 * Functions & Transformations.
 *
 * Level 1 is about a function as a rule: what $f(4)$ and $f(a)$ mean, which
 * inputs a rule can take and which outputs it can give, one function fed into
 * another, and a function undone. It closes on which functions can be undone
 * at all, and what the undoing looks like on a graph.
 *
 * Level 2 moves graphs, on the `transform` widget: translations, stretches,
 * reflections, then several at once, in order, and a transformation said in
 * words. Which reflection a curve has had is asked through the algebra rather
 * than the widget, since the widget grades curves and for a symmetrical curve
 * the two reflections draw the same thing.
 *
 * Level 3 sketches graphs from their features: where a curve crosses the
 * axes, the asymptotes of $\frac{a}{x - h} + k$, what happens at the ends,
 * and $f(x) = k$ read as a horizontal line meeting the curve. It closes by
 * moving $\frac{1}{x}$ onto a rule and reading a rule back off a sketch.
 *
 * Later levels — even and odd functions, and the rest — are in
 * `docs/roadmap/levels/functions-transformations.md`.
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

/** A curve with a dashed horizontal line across it: the line y = k. */
const diagram = (
  fs: ((x: number) => number)[],
  window: { xMin: number; xMax: number; yMin: number; yMax: number },
  horizontals: number[],
  label: string,
): Block => ({
  kind: 'diagram',
  svg: plotSvg({
    ...window,
    curves: fs.map((f, idx) => ({ f, accent: idx === 0 })),
    verticals: [{ x: 0, dashed: false }],
    horizontals,
    label,
  }),
});

/**
 * A reciprocal-type curve in its two pieces, with its asymptotes dashed. The
 * pen lifts at the vertical asymptote so no stroke joins the arms.
 */
const brokenGraph = (
  f: (x: number) => number,
  window: { xMin: number; xMax: number; yMin: number; yMax: number },
  asymptotes: { x: number; y: number },
  label: string,
  dashed: ((x: number) => number)[] = [],
): Block => ({
  kind: 'diagram',
  svg: plotSvg({
    ...window,
    curves: [{ f, accent: true, breaks: true }, ...dashed.map((g) => ({ f: g, dashed: true, breaks: true }))],
    verticals: [{ x: 0, dashed: false }, { x: asymptotes.x }],
    horizontals: [asymptotes.y],
    label,
  }),
});

export const functionsTransformations: Course = {
  id: 'functions-transformations',
  title: 'Functions & Transformations',
  blurb: 'A function as a rule to follow, combine and undo, and then as a graph to move.',
  category: 'algebra-fundamentals',
  // Straight after Linear Equations, whose undoing it builds on.
  position: 35,
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
              maths('\\begin{aligned} f(a + 1) &= 3(a + 1) - 2 \\\\ &= 3a + 1 \\end{aligned}'),
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
              maths('\\begin{aligned} f(x) &= 2x + 1 \\\\ g(x) &= x^2 \\end{aligned}'),
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
              maths('\\begin{aligned} f(x) &= 3x - 4 \\\\ g(x) &= 2x + 5 \\end{aligned}'),
              maths('\\begin{aligned} fg(x) &= 6x + 11 \\\\ gf(x) &= 6x - 3 \\end{aligned}'),
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
              prose('For $f(x) = 3x - 2$, add $2$ and then divide by $3$:'),
              maths('13 \\xrightarrow{+2} 15 \\xrightarrow{\\div 3} 5'),
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
    {
      id: 'fn-l2',
      title: 'Transformations',
      lessons: [
        {
          id: 'fn-l2-translate',
          title: 'Translations',
          slides: [
            teach(
              prose(
                'Change a function\'s equation and its graph moves. Adding a number **outside** the $f$ adds it to every output, so the whole curve moves up:',
              ),
              graph(
                [(x) => x * x + 2],
                { xMin: -4, xMax: 4, yMin: -2, yMax: 8 },
                'The parabola y = x squared, dashed, and the same curve two units higher',
                [(x) => x * x],
              ),
              maths('y = f(x) + 2'),
              prose(
                'In the questions that follow, the dashed curve is $y = f(x)$ and yours is the solid one. Move it with the buttons until it matches.',
              ),
            ),
            ask('fun-translate-apply'),
            ask('fun-shift-words'),
            ask('fun-shift-point'),
            teach(
              prose(
                'A number **inside** the bracket moves the curve across — and the opposite way to its sign. $f(x + 2)$ moves the curve $2$ to the **left**:',
              ),
              graph(
                [(x) => (x + 2) ** 2],
                { xMin: -5, xMax: 3, yMin: -2, yMax: 8 },
                'The parabola y = x squared, dashed, and the same curve two units to the left',
                [(x) => x * x],
              ),
              prose(
                'The new curve reaches each height when $x + 2$ is what $x$ used to be, which is $2$ sooner. So $f(x - 3)$ moves right $3$.',
              ),
            ),
            ask('fun-translate-match'),
            ask('fun-shift-words', 2),
            ask('fun-translate-apply', 2),
            teach(
              prose('Both at once: the inside moves across, the outside moves up or down.'),
              maths('y = f(x - 1) + 4'),
              prose('That is $1$ right and $4$ up. A point $(p, q)$ on $y = f(x)$ goes to $(p + 1, q + 4)$.'),
            ),
            ask('fun-shift-point', 2),
            ask('fun-translate-match', 2),
          ],
          skillCheck: [ask('fun-translate-apply', 2), ask('fun-shift-words', 2), ask('fun-shift-point', 2)],
        },
        {
          id: 'fn-l2-stretch',
          title: 'Stretches',
          slides: [
            teach(
              prose(
                'Multiplying **outside** the $f$ multiplies every output, so the curve is stretched upwards from the $x$-axis:',
              ),
              maths('y = 2f(x)'),
              prose(
                'That is a stretch parallel to the $y$-axis, scale factor $2$: every height doubles, and anything on the $x$-axis stays put.',
              ),
            ),
            ask('fun-stretch-apply'),
            ask('fun-stretch-words'),
            ask('fun-stretch-point'),
            teach(
              prose(
                'Multiplying $x$ **inside** stretches the curve across — by the **reciprocal**. $f(2x)$ gets to each height when $x$ is half as big, so the curve is squeezed to half its width:',
              ),
              graph(
                [(x) => Math.sin(2 * x)],
                { xMin: -3.5, xMax: 3.5, yMin: -1.6, yMax: 1.6 },
                'The sine curve, dashed, and the same curve squeezed to half its width',
                [(x) => Math.sin(x)],
              ),
              prose('So $y = f(2x)$ is a stretch parallel to the $x$-axis with scale factor $\\tfrac{1}{2}$.'),
            ),
            ask('fun-stretch-match'),
            ask('fun-stretch-words', 2),
            ask('fun-stretch-apply', 2),
            teach(
              prose(
                'For a point: outside, multiply the $y$-coordinate by the factor; inside, **divide** the $x$-coordinate by it.',
              ),
              prose('So $(4, 3)$ on $y = f(x)$ goes to $(2, 3)$ on $y = f(2x)$, and to $(4, 9)$ on $y = 3f(x)$.'),
            ),
            ask('fun-stretch-point', 2),
            ask('fun-stretch-match', 2),
          ],
          skillCheck: [ask('fun-stretch-apply', 2), ask('fun-stretch-words', 2), ask('fun-stretch-point', 2)],
        },
        {
          id: 'fn-l2-reflect',
          title: 'Reflections',
          slides: [
            teach(
              prose('A minus sign **outside** makes every output negative: $y = -f(x)$ is a reflection in the $x$-axis.'),
              prose('A minus sign **inside** swaps each $x$ for $-x$: $y = f(-x)$ is a reflection in the $y$-axis.'),
              graph(
                [(x) => 2 ** -x],
                { xMin: -4, xMax: 4, yMin: -1, yMax: 8 },
                'The curve y = 2 to the x, dashed, and its reflection in the y-axis',
                [(x) => 2 ** x],
              ),
            ),
            ask('fun-reflect-apply'),
            ask('fun-reflect-words'),
            ask('fun-reflect-point'),
            teach(
              prose(
                'Some curves look the same after a reflection. $x^2$ is symmetrical about the $y$-axis, so reflecting it in the $y$-axis changes nothing — and for $x^3$ the two reflections draw the same curve.',
              ),
              prose(
                'So to tell the reflections apart, read the equation: which terms changed sign? Outside, all of them; inside, only the odd powers of $x$.',
              ),
            ),
            ask('fun-reflect-match'),
            ask('fun-reflect-words', 2),
            ask('fun-reflect-apply', 2),
            teach(
              prose('For a point: a minus outside flips the $y$-coordinate, and a minus inside flips the $x$-coordinate.'),
              prose('So $(3, 5)$ goes to $(3, -5)$ on $y = -f(x)$, and to $(-3, 5)$ on $y = f(-x)$.'),
            ),
            ask('fun-reflect-point', 2),
            ask('fun-reflect-match', 2),
          ],
          skillCheck: [ask('fun-reflect-apply', 2), ask('fun-reflect-words', 2), ask('fun-reflect-point', 2)],
        },
        {
          id: 'fn-l2-combine',
          title: 'Combining Transformations',
          slides: [
            teach(
              prose('Changes can be combined. Read the outside from the $f$ outwards, in the order a number would meet them:'),
              maths('y = 2f(x) + 3'),
              prose('Each output is doubled **first**, then has $3$ added: stretch, then move up.'),
              maths('y = 2(f(x) + 3) = 2f(x) + 6'),
              prose('Here the $3$ is added first and then doubled too, so the curve ends up $6$ higher.'),
            ),
            ask('fun-combine-apply'),
            ask('fun-combine-order'),
            ask('fun-combine-point'),
            teach(
              prose(
                'Changes across and changes up do not get in each other\'s way, so they can happen in either order. Only two changes in the **same** direction have to be put in order.',
              ),
              maths('y = 3f(x - 2) - 1'),
              prose('Move right $2$ at any point; stretch by $3$ **before** moving down $1$.'),
            ),
            ask('fun-combine-match'),
            ask('fun-combine-order', 2),
            ask('fun-combine-apply', 2),
            teach(
              prose(
                'For a point, do each change to the coordinates in turn. On $y = 3f(x - 2) - 1$ the point $(1, 4)$ goes:',
              ),
              maths('\\begin{gathered} x: 1 + 2 = 3 \\\\ y: 3 \\times 4 - 1 = 11 \\end{gathered}'),
            ),
            ask('fun-combine-point', 2),
            ask('fun-combine-match', 2),
          ],
          skillCheck: [ask('fun-combine-match', 2), ask('fun-combine-order', 2), ask('fun-combine-point', 2)],
        },
        {
          id: 'fn-l2-describe',
          title: 'Describing Transformations',
          slides: [
            teach(
              prose('A full description names every change, with its size and direction:'),
              prose(
                '**translation** — how far, and which way; **stretch** — parallel to which axis, and the scale factor; **reflection** — in which axis.',
              ),
              prose(
                'To write the equation from the words, put each change where it acts: across goes inside the bracket with its sign turned round, up goes on the end, and a stretch upwards multiplies the $f$.',
              ),
            ),
            ask('fun-describe-form'),
            ask('fun-describe-words'),
            ask('fun-combine-match'),
            teach(
              prose(
                'Order matters when the move up happens **before** the stretch: the stretch then applies to the move as well.',
              ),
              prose('Move up $2$, then stretch upwards by $3$:'),
              maths('y = 3(f(x) + 2) = 3f(x) + 6'),
            ),
            ask('fun-describe-form+choice', 2),
            ask('fun-combine-apply', 2),
            ask('fun-describe-words', 2),
            teach(
              prose(
                'Going the other way, read the equation from the $f$ outwards and say each change in that order. Check by taking one point through every change.',
              ),
            ),
            ask('fun-combine-point', 2),
            ask('fun-combine-match', 2),
          ],
          skillCheck: [ask('fun-describe-form', 2), ask('fun-describe-words', 2), ask('fun-combine-match', 2)],
        },
      ],
      levelCheck: [
        ask('fun-translate-apply', 2),
        ask('fun-shift-words', 2),
        ask('fun-shift-point', 2),
        ask('fun-stretch-match', 2),
        ask('fun-stretch-words', 2),
        ask('fun-stretch-point', 2),
        ask('fun-reflect-apply', 2),
        ask('fun-reflect-words', 2),
        ask('fun-reflect-point', 2),
        ask('fun-combine-match', 2),
        ask('fun-combine-order', 2),
        ask('fun-combine-point', 2),
        ask('fun-describe-form', 2),
        ask('fun-describe-words', 2),
        ask('fun-combine-apply', 2),
      ],
    },
    {
      id: 'fn-l3',
      title: 'Graphs of Functions',
      lessons: [
        {
          id: 'fn-l3-intercepts',
          title: 'Intercepts',
          slides: [
            teach(
              prose('A curve crosses the $y$-axis where $x = 0$, so at the point $(0, f(0))$. Write $0$ for every $x$:'),
              maths('\\begin{gathered} f(x) = (x - 3)(x + 2) \\\\ f(0) = (-3)(2) = -6 \\end{gathered}'),
              graph(
                [(x) => (x - 3) * (x + 2)],
                { xMin: -4, xMax: 5, yMin: -8, yMax: 6 },
                'The parabola y = (x - 3)(x + 2), crossing the y-axis at -6 and the x-axis at -2 and 3',
              ),
            ),
            ask('fun-y-intercept'),
            ask('fun-root-slider'),
            ask('fun-intercepts'),
            teach(
              prose('It crosses the $x$-axis where $y = 0$, so solve $f(x) = 0$. A product is zero when one of its brackets is:'),
              maths('\\begin{gathered} (x - 3)(x + 2) = 0 \\\\ x = 3 \\text{ or } x = -2 \\end{gathered}'),
              prose('Each root is its bracket\'s number with the sign turned round. Read the other way, a root at $x = 3$ means a bracket $(x - 3)$.'),
            ),
            ask('fun-graph-rule'),
            ask('fun-y-intercept+choice', 2),
            ask('fun-root-slider', 2),
            teach(
              prose('The same two moves work on any rule. For $y = \\frac{6}{x - 3} + 1$:'),
              maths('x = 0: \\quad y = \\frac{6}{-3} + 1 = -1'),
              maths('\\begin{gathered} y = 0: \\quad \\frac{6}{x - 3} = -1 \\\\ x - 3 = -6 \\\\ x = -3 \\end{gathered}'),
              prose('So it meets the axes at $(0, -1)$ and $(-3, 0)$.'),
            ),
            ask('fun-intercepts', 2),
            ask('fun-graph-rule', 2),
          ],
          skillCheck: [ask('fun-y-intercept', 2), ask('fun-root-slider', 2), ask('fun-intercepts', 2)],
        },
        {
          id: 'fn-l3-reciprocal',
          title: 'Graphs of a/(x - h) + k',
          slides: [
            teach(
              prose('$y = \\frac{1}{x}$ comes in two pieces. There is no $\\frac{1}{0}$, so the curve never touches $x = 0$; and a fraction with $1$ on top is never $0$, so it never touches $y = 0$ either.'),
              brokenGraph(
                (x) => 1 / x,
                { xMin: -5, xMax: 5, yMin: -5, yMax: 5 },
                { x: 0, y: 0 },
                'The curve y = 1/x, in two pieces either side of the axes',
              ),
              prose('A line a curve gets closer and closer to without reaching is an **asymptote**. Here they are the two axes.'),
            ),
            ask('fun-asymptote-slider'),
            ask('fun-asymptote-tiles'),
            ask('fun-asymptote-flow'),
            teach(
              prose('$y = \\frac{a}{x - h} + k$ is the same shape moved. Its asymptotes move with it:'),
              prose('**vertical**, where the bottom is zero: $x = h$; **horizontal**, since the fraction heads for $0$ as $x$ grows: $y = k$.'),
              brokenGraph(
                (x) => 2 / (x - 1) + 2,
                { xMin: -4, xMax: 6, yMin: -4, yMax: 8 },
                { x: 1, y: 2 },
                'The curve y = 2/(x - 1) + 2, with dashed asymptotes x = 1 and y = 2',
              ),
            ),
            ask('fun-asymptote-k'),
            ask('fun-asymptote-slider', 2),
            ask('fun-asymptote-flow', 2),
            teach(
              prose('Find $h$ from the bottom, not from the number on show. In $y = \\frac{3}{2x - 6}$ the bottom is zero when $x = 3$, and in $y = \\frac{3}{4 - x}$ when $x = 4$.'),
              prose('A missing number comes from any point on the curve: put its coordinates in. If $y = \\frac{4}{x - 1} + k$ passes through $(3, 5)$, then $5 = 2 + k$, so $k = 3$.'),
            ),
            ask('fun-asymptote-tiles', 2),
            ask('fun-asymptote-k', 2),
          ],
          skillCheck: [ask('fun-asymptote-slider', 2), ask('fun-asymptote-tiles', 2), ask('fun-asymptote-k', 2)],
        },
        {
          id: 'fn-l3-ends',
          title: 'The Ends of a Graph',
          slides: [
            teach(
              prose('What a curve does far out to the left and right is part of its shape. Write $x \\to \\infty$ for "as $x$ grows without limit".'),
              prose('As $x \\to \\infty$: $x^2$ runs away, $y \\to \\infty$; $\\frac{1}{x}$ dies away, $y \\to 0$; and $\\frac{2x + 1}{x - 3}$ settles, $y \\to 2$.'),
              prose('A curve that settles on a number has a horizontal asymptote there.'),
            ),
            ask('fun-end-choice'),
            ask('fun-leading-flow'),
            ask('fun-limit-tiles'),
            teach(
              prose('For a fraction, only the highest powers matter once $x$ is large. Divide every term by $x$ to see it:'),
              maths('\\begin{gathered} \\frac{6x + 1}{2x - 3} = \\frac{6 + \\frac{1}{x}}{2 - \\frac{3}{x}} \\\\ \\to \\frac{6 + 0}{2 - 0} = 3 \\end{gathered}'),
              prose('So: the same highest power on top and bottom, $y$ heads for the ratio of their numbers; a higher power on the bottom, $y \\to 0$; on the top, $y$ runs away.'),
            ),
            ask('fun-divide-steps'),
            ask('fun-end-choice', 2),
            ask('fun-leading-flow', 2),
            teach(
              prose('The two ends need not agree. $x^3$ keeps the sign of $x$, so $y \\to -\\infty$ on the left and $y \\to \\infty$ on the right.'),
              prose('$2^x$ runs away on the right, but on the left it shrinks towards $0$ — so $2^x + 3$ heads for $3$ on the left and has a horizontal asymptote there only.'),
            ),
            ask('fun-limit-tiles', 2),
            ask('fun-divide-steps', 2),
          ],
          skillCheck: [ask('fun-end-choice', 2), ask('fun-limit-tiles', 2), ask('fun-leading-flow', 2)],
        },
        {
          id: 'fn-l3-meet',
          title: 'Solving f(x) = k with a Line',
          slides: [
            teach(
              prose('A solution of $f(x) = k$ is an $x$ where the curve is at height $k$. So draw the line $y = k$: each place it meets the curve is one solution.'),
              diagram(
                [(x) => (x - 1) ** 2 - 3],
                { xMin: -3, xMax: 5, yMin: -4, yMax: 6 },
                [2],
                'The parabola y = (x - 1)^2 - 3 and the dashed line y = 2, meeting twice',
              ),
              prose('Here $f(x) = 2$ has two solutions, one on each arm.'),
            ),
            ask('fun-meet-count'),
            ask('fun-meet-flow'),
            ask('fun-meet-solve'),
            teach(
              prose('$(x - h)^2 + c$ is lowest at its vertex, at height $c$. A line above the vertex meets it twice, a line through it once, a line below it not at all. With the square taken away, $c - (x - h)^2$, the curve opens downwards and that turns round.'),
              prose('To find them, undo the rule one step at a time — and a square root gives two answers:'),
              maths('\\begin{gathered} (x - 1)^2 - 3 = 6 \\\\ (x - 1)^2 = 9 \\\\ x - 1 = \\pm 3 \\end{gathered}'),
              prose('So $x = 4$ or $x = -2$.'),
            ),
            ask('fun-meet-tiles'),
            ask('fun-meet-count', 2),
            ask('fun-meet-flow', 2),
            teach(
              prose('When the rule is multiplied out, take $k$ across first so one side is $0$, then factorise:'),
              maths('\\begin{gathered} x^2 - 2x - 1 = 2 \\\\ x^2 - 2x - 3 = 0 \\\\ (x - 3)(x + 1) = 0 \\end{gathered}'),
              prose('Factorising $f(x)$ itself would find where the curve meets $y = 0$ — a different line.'),
            ),
            ask('fun-meet-solve+choice', 2),
            ask('fun-meet-tiles', 2),
          ],
          skillCheck: [ask('fun-meet-count', 2), ask('fun-meet-solve', 2), ask('fun-meet-tiles', 2)],
        },
        {
          id: 'fn-l3-sketch',
          title: 'Sketching and Reading Graphs',
          slides: [
            teach(
              prose('To sketch $y = \\frac{1}{x - 2} + 1$, start from $y = \\frac{1}{x}$ and move it $2$ right and $1$ up. The asymptotes go with it, to $x = 2$ and $y = 1$.'),
              brokenGraph(
                (x) => 1 / (x - 2) + 1,
                { xMin: -3, xMax: 6, yMin: -4, yMax: 5 },
                { x: 2, y: 1 },
                'The curve y = 1/x, dashed, and the same curve moved 2 right and 1 up',
                [(x) => 1 / x],
              ),
              prose('Draw the asymptotes first, then a branch in each of two opposite corners.'),
            ),
            ask('fun-sketch-apply'),
            ask('fun-sketch-rule'),
            ask('fun-features-tree'),
            teach(
              prose('Reading a sketch runs the other way: the dashed lines give $h$ and $k$, the vertical one with its sign turned round inside the bracket.'),
              prose('A number on top stretches the branches away from the corner: $\\frac{3}{x}$ is three times as far out as $\\frac{1}{x}$. A minus in front, $-\\frac{1}{x}$, flips them into the other two corners.'),
            ),
            ask('fun-sketch-match'),
            ask('fun-features-tree', 2),
            ask('fun-sketch-apply', 2),
            teach(
              prose('To find the number on top, take $k$ across:'),
              maths('\\begin{gathered} y - k = \\frac{a}{x - h} \\\\ a = (x - h)(y - k) \\end{gathered}'),
              prose('So at any point on the curve, $a$ is how far across it is from $x = h$ times how far up from $y = k$. Through $(4, 5)$ with asymptotes $x = 2$ and $y = 1$: $a = 2 \\times 4 = 8$.'),
            ),
            ask('fun-sketch-rule', 2),
            ask('fun-sketch-match', 2),
          ],
          skillCheck: [ask('fun-sketch-apply', 2), ask('fun-sketch-rule', 2), ask('fun-features-tree', 2)],
        },
      ],
      levelCheck: [
        ask('fun-y-intercept', 2),
        ask('fun-root-slider', 2),
        ask('fun-graph-rule', 2),
        ask('fun-intercepts', 2),
        ask('fun-asymptote-slider', 2),
        ask('fun-asymptote-k', 2),
        ask('fun-asymptote-flow', 2),
        ask('fun-end-choice', 2),
        ask('fun-limit-tiles', 2),
        ask('fun-leading-flow', 2),
        ask('fun-meet-count', 2),
        ask('fun-meet-solve', 2),
        ask('fun-meet-tiles', 2),
        ask('fun-sketch-match', 2),
        ask('fun-features-tree', 2),
      ],
    },
  ],
};
