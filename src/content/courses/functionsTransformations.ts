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
 * Level 4 asks what a rule does to $-x$ — even functions mirror in the
 * $y$-axis, odd ones turn a half turn about the origin — then what it does
 * after a whole period, and closes on rules that change from one stretch of
 * $x$ to the next.
 *
 * Level 5 reads $y = a\sin(bx + c) + d$, $x$ in degrees, as moves made to
 * $y = \sin x$: $a$ a stretch parallel to the $y$-axis, $d$ a translation up,
 * $b$ a stretch across by $\frac{1}{b}$, and $c$ a move across by
 * $\frac{c}{b}$ against its sign — then the rule back off a drawn wave, and
 * the order the moves are made in. Trigonometric Functions reads the same
 * graphs as amplitude, period and shift; here the lens is the transformation,
 * its factor, vector and order.
 *
 * Level 6 puts a function to work as a model: which family a situation
 * calls for, from a sentence, a table or a sketch; the rule built from the
 * story and what each number in it stands for; the inputs that make sense
 * and the outputs that follow; and a model's inverse and composite read back
 * into the story — what £55 buys, a conversion both ways, a voucher before
 * or after VAT. Level 1 taught those ideas as algebra, and Exponential
 * Models fits curves to data, so here exponentials are only recognised.
 * Later levels are in `docs/roadmap/levels/functions-transformations.md`.
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

/**
 * Curves with ringed points on them, the pen lifted wherever a curve has no
 * value — so a piece of a piecewise rule, `NaN` outside its stretch, stops
 * where it should.
 */
const markedGraph = (
  fs: ((x: number) => number)[],
  window: { xMin: number; xMax: number; yMin: number; yMax: number },
  marks: { x: number; y: number; hollow?: boolean }[],
  label: string,
): Block => ({
  kind: 'diagram',
  svg: plotSvg({
    ...window,
    curves: fs.map((f, idx) => ({ f, accent: idx === 0, breaks: true })),
    verticals: [{ x: 0, dashed: false }],
    marks,
    label,
  }),
});

/** A wave with x in degrees: a fn(bx + c) + d. */
const wave =
  (a: number, b: number, c: number, d: number, fn: 'sin' | 'cos' = 'sin') =>
  (x: number): number =>
    a * Math[fn](((b * x + c) * Math.PI) / 180) + d;

/** One turn of a wave, in degrees. */
const DEGREES = { xMin: 0, xMax: 360 };

/** A zigzag repeating every 4, peaking at 2: the teaching picture of a period. */
const zigzag = (x: number): number => {
  const along = ((x % 4) + 4) % 4;
  return along < 2 ? along : 4 - along;
};

export const functionsTransformations: Course = {
  id: 'functions-transformations',
  // Transformations of Trigonometric Graphs is shown in Trigonometric
  // Functions; see placement.ts.
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
              prose(
                'With $x$ taken away inside the root, the inside shrinks as $x$ grows, so the sign turns round:',
              ),
              maths('\\begin{gathered} \\sqrt{5 - x}: \\quad 5 - x \\geq 0 \\\\ x \\leq 5 \\end{gathered}'),
              prose('To test one input, put it in: for $\\sqrt{x - 3}$ at $x = 1$, $1 - 3 = -2$ is negative, so $1$ is not in the domain.'),
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
                '$f(x) = (x - 1)^2 + 2$: a square is never negative, so $f$ is never less than $2$. Its range is $f(x) \\geq 2$ — the height of the lowest point. With the square taken away, $5 - (x - 1)^2$, the top is $5$: $f(x) \\leq 5$.',
              ),
              prose(
                'Multiplied out, complete the square first: halve the $x$ number, square that bracket, and take off what it adds.',
              ),
              maths(
                '\\begin{aligned} & x^2 - 6x + 11 \\\\ &= (x - 3)^2 - 9 + 11 \\\\ &= (x - 3)^2 + 2 \\end{aligned}',
              ),
              prose(
                'So its range is $f(x) \\geq 2$. With $-x^2$, take the minus out first: $-x^2 + 6x - 7 = -\\big((x - 3)^2 - 2\\big) = 2 - (x - 3)^2$, so $f(x) \\leq 2$.',
              ),
            ),
            ask('fun-range-slider'),
            ask('fun-range-slider', 2),
            teach(
              prose(
                'A function can be given a smaller domain on purpose. Then the range comes from the ends of that domain — for a straight line, the two ends.',
              ),
              maths('\\begin{gathered} f(x) = 2x + 1, \\quad 0 \\leq x \\leq 4 \\\\ f(0) = 1, \\quad f(4) = 9 \\\\ 1 \\leq f(x) \\leq 9 \\end{gathered}'),
              prose(
                'If the line **falls**, the left end gives the top: $f(x) = 7 - 2x$ on $0 \\leq x \\leq 3$ runs from $f(0) = 7$ down to $f(3) = 1$, so $1 \\leq f(x) \\leq 7$.',
              ),
              prose(
                'A curve can turn round inside the domain: $x^2 + 1$ on $-2 \\leq x \\leq 3$ is lowest at $x = 0$, $f(0) = 1$, and highest at the end further from $0$, $f(3) = 10$. So $1 \\leq f(x) \\leq 10$.',
              ),
              prose(
                'Both rules at once: on the bottom of a fraction a root cannot be $0$ either, so $\\frac{1}{\\sqrt{x + 4}}$ needs $x + 4 > 0$, that is $x > -4$. And with a number in front, solve: $\\sqrt{2x - 6}$ needs $2x - 6 \\geq 0$, so $x \\geq 3$.',
              ),
            ),
            ask('fun-range'),
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
            teach(
              prose(
                'The inverse swaps inputs and outputs, so the point $(3, 7)$ on $y = f(x)$ becomes $(7, 3)$ on $y = f^{-1}(x)$. Swapping coordinates is a reflection in the line $y = x$:',
              ),
              graph(
                [(x) => 2 * x + 1, (x) => (x - 1) / 2],
                { xMin: -5, xMax: 5, yMin: -5, yMax: 5 },
                'The line y = 2x + 1 and its inverse, reflections of each other in the dashed line y = x',
                [(x) => x],
              ),
              prose('A line and its inverse meet on $y = x$ — where $f(x) = x$. For $f(x) = 2x + 1$:'),
              maths('\\begin{gathered} 2x + 1 = x \\\\ x = -1 \\end{gathered}'),
              prose(
                'Given only the $x$ of a point on $y = f^{-1}(x)$, say $x = 11$, its $y$ is the input $f$ sends to $11$: $2x + 1 = 11$ gives $5$, so the point is $(11, 5)$.',
              ),
            ),
            ask('fun-inverse-point'),
            ask('fun-inverse-meet'),
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
                'Change a function\'s equation and its graph moves. A number **outside** the $f$ is added to every output, so the curve moves **up**: $y = f(x) + 2$ is $2$ higher.',
              ),
              prose(
                'A number **inside** the bracket moves it **across** — the opposite way to its sign. $y = f(x + 2)$ is $2$ to the **left**:',
              ),
              graph(
                [(x) => (x + 2) ** 2],
                { xMin: -5, xMax: 3, yMin: -2, yMax: 8 },
                'The parabola y = x squared, dashed, and the same curve two units to the left',
                [(x) => x * x],
              ),
              prose(
                'It reaches each height when $x + 2$ is what $x$ used to be, which is $2$ sooner. So $f(x - 3)$ moves right $3$.',
              ),
              prose(
                'In the questions that follow, the dashed curve is $y = f(x)$ and yours is the solid one. Move it with the buttons until it matches.',
              ),
            ),
            ask('fun-translate-apply'),
            ask('fun-shift-words'),
            ask('fun-translate-match'),
            teach(
              prose(
                'A point moves with its curve. A number inside changes the $x$-coordinate, the opposite way to its sign; a number outside changes the $y$-coordinate. Take $(3, 5)$ on $y = f(x)$; on each new curve it goes to',
              ),
              maths(
                '\\begin{aligned} f(x + 2)&: \; (3 - 2, 5) = (1, 5) \\\\ f(x) - 4&: \; (3, 5 - 4) = (3, 1) \\end{aligned}',
              ),
              prose('Both at once: the inside moves across, the outside moves up or down.'),
              maths('y = f(x - 1) + 4'),
              prose('That is $1$ right and $4$ up, so $(3, 5)$ goes to $(3 + 1, 5 + 4) = (4, 9)$.'),
            ),
            ask('fun-shift-point'),
            ask('fun-shift-words', 2),
            ask('fun-translate-apply', 2),
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
                'Multiplying **outside** the $f$ multiplies every output: $y = 2f(x)$ is a stretch parallel to the $y$-axis, scale factor $2$. Every height doubles, and anything on the $x$-axis stays put.',
              ),
              prose(
                'Multiplying $x$ **inside** stretches the curve across — by the **reciprocal**. $f(2x)$ gets to each height when $x$ is half as big, so the curve is squeezed to half its width:',
              ),
              graph(
                [(x) => Math.sin(2 * x)],
                { xMin: -3.5, xMax: 3.5, yMin: -1.6, yMax: 1.6 },
                'The sine curve, dashed, and the same curve squeezed to half its width',
                [(x) => Math.sin(x)],
              ),
              prose(
                'So $y = f(2x)$ is a stretch parallel to the $x$-axis with scale factor $\\tfrac{1}{2}$, and $y = f(\\tfrac{1}{3}x)$ one with scale factor $3$.',
              ),
            ),
            ask('fun-stretch-apply'),
            ask('fun-stretch-words'),
            ask('fun-stretch-match'),
            teach(
              prose(
                'For a point: outside, multiply the $y$-coordinate by the factor; inside, **divide** the $x$-coordinate by it. Take $(4, 3)$ on $y = f(x)$:',
              ),
              maths(
                '\\begin{aligned} 3f(x)&: \; (4, 3 \\times 3) = (4, 9) \\\\ f(2x)&: \; (4 \\div 2, 3) = (2, 3) \\\\ f(\\tfrac{1}{2}x)&: \; (4 \\times 2, 3) = (8, 3) \\end{aligned}',
              ),
              prose('Both ways at once, do each: $y = 3f(2x)$ sends $(4, 3)$ to $(2, 9)$ — squeezed across by $\\tfrac{1}{2}$ and stretched up by $3$.'),
            ),
            ask('fun-stretch-point'),
            ask('fun-stretch-words', 2),
            ask('fun-stretch-point', 2),
            teach(
              prose(
                'A stretch can come with a translation. Outside, read from the $f$ outwards: $y = 2f(x) + 1$ stretches up by $2$, then moves up $1$.',
              ),
              prose(
                'Inside, the bracket is the move: $y = f(\\tfrac{1}{2}(x - 3))$ stretches across by $2$, then moves right $3$ — the $3$ against its sign, as always.',
              ),
            ),
            ask('fun-stretch-apply', 2),
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
              prose(
                'A reflection can come with a move, read from the $f$ outwards: $y = -f(x) + 3$ flips in the $x$-axis, then moves up $3$; $y = -f(x - 2)$ flips, and moves right $2$.',
              ),
            ),
            ask('fun-reflect-apply'),
            ask('fun-reflect-match'),
            teach(
              prose(
                'Some curves look the same after a reflection. $x^2$ is symmetrical about the $y$-axis, so reflecting it in the $y$-axis changes nothing — and for $x^3$ the two reflections draw the same curve.',
              ),
              prose(
                'So to tell the reflections apart, read the equation: which terms changed sign? Outside, all of them; inside, only the odd powers of $x$. With $f(x) = x^2 + 3x - 1$:',
              ),
              maths(
                '\\begin{aligned} f(-x) &= x^2 - 3x - 1 \\\\ -f(x) &= -x^2 - 3x + 1 \\end{aligned}',
              ),
              prose('Only the $3x$ changed in $f(-x)$; every term changed in $-f(x)$.'),
            ),
            ask('fun-reflect-words'),
            ask('fun-reflect-words', 2),
            teach(
              prose('For a point: a minus outside flips the $y$-coordinate, and a minus inside flips the $x$-coordinate.'),
              prose('So $(3, 5)$ goes to $(3, -5)$ on $y = -f(x)$, and to $(-3, 5)$ on $y = f(-x)$.'),
              prose('Both minus signs and a move, one change at a time — the flips first, the move last:'),
              maths(
                '\\begin{gathered} y = -f(-x) - 3 \\\\ (3, 5) \\to (-3, -5) \\to (-3, -8) \\end{gathered}',
              ),
            ),
            ask('fun-reflect-point'),
            ask('fun-reflect-apply', 2),
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
              prose(
                'Inside, the bracket is the move: $y = f(\\tfrac{1}{2}(x - 3))$ stretches across by $2$, then moves right $3$.',
              ),
            ),
            ask('fun-combine-apply'),
            ask('fun-combine-order'),
            ask('fun-combine-match'),
            teach(
              prose(
                'Changes across and changes up do not get in each other\'s way, so they can happen in either order. Only two changes in the **same** direction have to be put in order.',
              ),
              prose(
                'For a point, do each change to the coordinates in turn. On $y = 3f(x - 2) - 1$ the point $(1, 4)$ goes:',
              ),
              maths('\\begin{gathered} x: 1 + 2 = 3 \\\\ y: 3 \\times 4 - 1 = 11 \\end{gathered}'),
              prose('On $y = -3f(x - 2) - 1$ the minus flips the height too, before the move: $y = -3 \\times 4 - 1 = -13$.'),
              prose('Across, stretch before the move too. On $y = f(\\tfrac{1}{2}(x - 2)) + 1$ the point $(3, 4)$ goes:'),
              maths('\\begin{gathered} x: 3 \\times 2 + 2 = 8 \\\\ y: 4 + 1 = 5 \\end{gathered}'),
            ),
            ask('fun-combine-point'),
            ask('fun-combine-order', 2),
            ask('fun-combine-apply', 2),
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
              prose('Translated $2$ left, stretched parallel to the $y$-axis by $3$, then translated $1$ down:'),
              maths('y = 3f(x + 2) - 1'),
              prose(
                'Read back, $y = 2f(x - 4) + 5$ is a stretch upwards by $2$, then a move $4$ right and $5$ up; $y = \\tfrac{1}{2}f(x)$ is a stretch upwards by $\\tfrac{1}{2}$, a squash.',
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
                'Going the other way, read the equation from the $f$ outwards and say each change in that order. Check by taking one point through every change. On $y = -2f(\\tfrac{1}{2}(x - 1)) + 1$, the point $(3, 4)$:',
              ),
              maths(
                '\\begin{aligned} x&: \\quad 3 \\times 2 + 1 = 7 \\\\ y&: \\quad -2 \\times 4 + 1 = -7 \\end{aligned}',
              ),
              prose('Across: stretch by $2$, then right $1$. Up: stretch by $2$ and flip, then up $1$. So $(3, 4)$ goes to $(7, -7)$.'),
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
              prose('It crosses the $x$-axis where $y = 0$, so solve $f(x) = 0$. A product is zero when one of its brackets is:'),
              maths('\\begin{gathered} (x - 3)(x + 2) = 0 \\\\ x = 3 \\text{ or } x = -2 \\end{gathered}'),
              prose('For a line, solve too: $y = 2x - 6$ is $0$ when $2x = 6$, at $x = 3$.'),
            ),
            ask('fun-y-intercept'),
            ask('fun-root-slider'),
            ask('fun-intercepts'),
            teach(
              prose('Each root is its bracket\'s number with the sign turned round. Read the other way, a root at $x = 3$ means a bracket $(x - 3)$.'),
              prose(
                'Multiplied out, factorise first: find two numbers that multiply to the number on the end and add to the $x$ number. For $x^2 - 5x + 6$ they are $-2$ and $-3$:',
              ),
              maths('\\begin{gathered} x^2 - 5x + 6 = (x - 2)(x - 3) \\\\ x = 2 \\text{ or } x = 3 \\end{gathered}'),
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
              prose('A line a curve gets closer and closer to without reaching is an **asymptote**. $y = \\frac{a}{x - h} + k$ is the same shape moved, and its asymptotes move with it:'),
              prose('**vertical**, where the bottom is zero: $x = h$; **horizontal**, since the fraction heads for $0$ as $x$ grows: $y = k$.'),
              brokenGraph(
                (x) => 2 / (x - 1) + 2,
                { xMin: -4, xMax: 6, yMin: -4, yMax: 8 },
                { x: 1, y: 2 },
                'The curve y = 2/(x - 1) + 2, with dashed asymptotes x = 1 and y = 2',
              ),
              prose('So $y = \\frac{2}{x - 1} + 2$ has asymptotes $x = 1$ and $y = 2$, and a minus in front changes neither.'),
            ),
            ask('fun-asymptote-slider'),
            ask('fun-asymptote-tiles'),
            ask('fun-asymptote-flow'),
            teach(
              prose('Find $h$ from the bottom, not from the number on show: set the bottom to zero and solve.'),
              maths('\\begin{gathered} \\frac{3}{2x - 6}: \; 2x - 6 = 0, \; x = 3 \\\\ \\frac{3}{4 - x}: \; 4 - x = 0, \; x = 4 \\end{gathered}'),
              prose('The number added on is still the horizontal asymptote: $y = \\frac{1}{3x + 12} - 5$ has $x = -4$ and $y = -5$.'),
            ),
            ask('fun-asymptote-slider', 2),
            ask('fun-asymptote-flow', 2),
            ask('fun-asymptote-tiles', 2),
            teach(
              prose('A missing number comes from any point on the curve: put its coordinates in. If $y = \\frac{4}{x - 1} + k$ passes through $(3, 5)$:'),
              maths('\\begin{gathered} 5 = \\frac{4}{3 - 1} + k \\\\ 5 = 2 + k \\\\ k = 3 \\end{gathered}'),
              prose('Crossing the $x$-axis at $(p, 0)$ is a point too: put $y = 0$.'),
            ),
            ask('fun-asymptote-k'),
            ask('fun-asymptote-k', 2),
          ],
          skillCheck: [ask('fun-asymptote-slider', 2), ask('fun-asymptote-tiles', 2), ask('fun-asymptote-k', 2)],
        },
        {
          id: 'fn-l3-ends',
          title: 'The Ends of a Graph',
          slides: [
            teach(
              prose('What a curve does far out to the left and right is part of its shape. Write $x \\to \\infty$ for "as $x$ grows without limit", and $x \\to -\\infty$ for far out to the left.'),
              prose('For a fraction, only the highest powers matter once $x$ is large. Divide every term by $x$ to see it:'),
              maths('\\begin{gathered} \\frac{6x + 1}{2x - 3} = \\frac{6 + \\frac{1}{x}}{2 - \\frac{3}{x}} \\\\ \\to \\frac{6 + 0}{2 - 0} = 3 \\end{gathered}'),
              prose('So: the same highest power on top and bottom, $y$ heads for the ratio of their numbers; a higher power on the bottom, as in $\\frac{1}{x}$, $y \\to 0$; on the top, $y$ runs away. Far to the left a fraction does the same.'),
              prose('A curve that settles on a number has a horizontal asymptote there.'),
            ),
            ask('fun-end-choice'),
            ask('fun-leading-flow'),
            ask('fun-divide-steps'),
            teach(
              prose('A polynomial follows its highest power, which outgrows the rest. An even power is positive either side; an odd power keeps the sign of $x$. Then the number in front:'),
              prose('So $4x^2 - 3x$ heads for $\\infty$ at both ends. For $-2x^3 + x$: as $x \\to -\\infty$, $y \\to \\infty$; as $x \\to \\infty$, $y \\to -\\infty$.'),
              prose('On the left of $-2x^3$, the cube of a large negative number is negative, and $-2$ times that is positive.'),
            ),
            ask('fun-limit-tiles'),
            ask('fun-leading-flow', 2),
            teach(
              prose('The two ends need not agree. $x^3$ keeps the sign of $x$, so $y \\to -\\infty$ on the left and $y \\to \\infty$ on the right.'),
              prose('$2^x$ runs away on the right, but on the left it shrinks towards $0$: $2^{-10} = \\frac{1}{1024}$. So $2^x + 3$ heads for $3$ on the left, and has a horizontal asymptote there only; $5 \\times 2^x + 3$ does the same, since $5 \\times 0 = 0$.'),
            ),
            ask('fun-end-choice', 2),
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
              prose('Here $f(x) = 2$ has two solutions, one on each arm. $(x - 1)^2 - 3$ is lowest at its vertex, at height $-3$: a line above the vertex meets it twice, a line through it once, a line below it not at all.'),
              prose('With the square taken away, $c - (x - h)^2$, the curve opens downwards and that turns round.'),
            ),
            ask('fun-meet-count'),
            ask('fun-meet-flow'),
            teach(
              prose('To find them, undo the rule one step at a time — and a square root gives two answers:'),
              maths('\\begin{gathered} (x - 1)^2 - 3 = 6 \\\\ (x - 1)^2 = 9 \\\\ x - 1 = \\pm 3 \\end{gathered}'),
              prose('So $x = 4$ or $x = -2$. When the rule is multiplied out, take $k$ across first so one side is $0$, then factorise:'),
              maths('\\begin{gathered} x^2 - 2x - 1 = 2 \\\\ x^2 - 2x - 3 = 0 \\\\ (x - 3)(x + 1) = 0 \\end{gathered}'),
              prose('So $x = 3$ or $x = -1$. If $x^2$ has a minus in front, divide through by $-1$ before factorising. Factorising $f(x)$ itself would find where the curve meets $y = 0$ — a different line.'),
            ),
            ask('fun-meet-solve'),
            ask('fun-meet-tiles'),
            teach(
              prose('A multiplied-out rule that will not factorise can be undone once the square is completed: halve the $x$ number for the bracket.'),
              maths('\\begin{gathered} x^2 - 6x + 10 = 5 \\\\ (x - 3)^2 - 9 + 10 = 5 \\\\ (x - 3)^2 = 4 \\\\ x - 3 = \\pm 2 \\end{gathered}'),
              prose('So $x = 5$ or $x = 1$. And a curve $\\frac{a}{x - h} + k$ meets a line $y = c$ exactly once, on one branch — unless $c = k$, the asymptote, which it never reaches.'),
              prose('A cubic with a hump and a dip meets a line three times when the line is between their heights, twice when it passes through one of them, and once when it is above or below both.'),
            ),
            ask('fun-meet-count', 2),
            ask('fun-meet-flow', 2),
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
              prose('Draw the asymptotes first, then a branch in each of two opposite corners. Reading a sketch runs the other way: dashed lines at $x = -3$ and $y = 2$ give $y = \\frac{1}{x + 3} + 2$ — the vertical one with its sign turned round inside the bracket.'),
            ),
            ask('fun-sketch-apply'),
            ask('fun-sketch-rule'),
            ask('fun-sketch-match'),
            teach(
              prose('A number on top stretches the branches away from the corner: $\\frac{3}{x}$ is three times as far out as $\\frac{1}{x}$, a stretch parallel to the $y$-axis with scale factor $3$. A minus in front, $-\\frac{1}{x}$, flips them into the other two corners.'),
              prose('A number multiplying the bottom is a stretch too, by its reciprocal:'),
              maths('\\frac{1}{2(x - 4)} = \\tfrac{1}{2} \\times \\frac{1}{x - 4}'),
              prose('So $y = \\frac{1}{2(x - 4)}$ is $\\frac{1}{x}$ moved $4$ right and stretched parallel to the $y$-axis by $\\tfrac{1}{2}$.'),
            ),
            ask('fun-sketch-apply', 2),
            ask('fun-sketch-match', 2),
            teach(
              prose('To find the number on top, take $k$ across:'),
              maths('\\begin{gathered} y - k = \\frac{a}{x - h} \\\\ a = (x - h)(y - k) \\end{gathered}'),
              prose('So at any point on the curve, $a$ is how far across it is from $x = h$ times how far up from $y = k$. Through $(4, 5)$ with asymptotes $x = 2$ and $y = 1$:'),
              maths('a = (4 - 2)(5 - 1) = 2 \\times 4 = 8'),
              prose('A point below or to the left gives a negative distance, and the signs multiply as usual.'),
            ),
            ask('fun-features-tree'),
            ask('fun-features-tree', 2),
            ask('fun-sketch-rule', 2),
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
    {
      id: 'fn-l4',
      title: 'Even, Odd and Periodic Functions',
      lessons: [
        {
          id: 'fn-l4-even',
          title: 'Even Functions',
          slides: [
            teach(
              prose('A function is **even** when $f(-x) = f(x)$ for every $x$: the input $-2$ gives the same output as $2$, and $-1$ the same as $1$.'),
              markedGraph(
                [(x) => x ** 4 - 3 * x ** 2],
                { xMin: -3, xMax: 3, yMin: -4, yMax: 6 },
                [
                  { x: -2, y: 4 },
                  { x: 2, y: 4 },
                ],
                'The curve y = x^4 - 3x^2, the same either side of the y-axis, with the points (-2, 4) and (2, 4) ringed',
              ),
              prose('So its graph is its own mirror image in the $y$-axis: $x^4 - 3x^2$ is at $(2, 4)$, and so at $(-2, 4)$ too. $x^2$, $x^4$ and $|x|$ are all even.'),
            ),
            ask('fun-even-value'),
            teach(
              prose('To test a rule, write $(-x)$ in place of every $x$. An even power of $-x$ is positive and an odd power negative:'),
              maths('\\begin{gathered} (-x)^2 = x^2 \\\\ (-x)^3 = -x^3 \\\\ (-x)^4 = x^4 \\end{gathered}'),
              prose('So in $f(-x)$ the even powers stay as they were and the odd powers change sign. A constant stays too, and so does $|x|$, since $|-x| = |x|$. $f$ is even when nothing changes at all:'),
              maths('\\begin{aligned} f(x) &= 2x^4 + 5x - 1 \\\\ f(-x) &= 2(-x)^4 + 5(-x) - 1 \\\\ &= 2x^4 - 5x - 1 \\end{aligned}'),
              prose('The $5x$ changed, so this $f$ is not even. A bracket of even powers, such as $(x^2 + 3)^3$, is even as a whole. But a curve can mirror in some other line without being even: $(x - 2)^2$ is symmetrical about $x = 2$, not about the $y$-axis.'),
            ),
            ask('fun-even-pick'),
            ask('fun-negx-tiles'),
            ask('fun-even-flow'),
            ask('fun-negx-tiles', 2),
            ask('fun-even-pick', 2),
            teach(
              prose('An even function is fixed by its right-hand half. If $f$ is even and $f(x) = x^2 - 2x$ for $x \\geq 0$, then'),
              maths('f(-3) = f(3) = 9 - 6 = 3'),
              prose('Putting $-3$ straight into $x^2 - 2x$ gives $15$ — but that rule is only what $f$ does for $x \\geq 0$.'),
            ),
            ask('fun-even-value', 2),
            ask('fun-even-flow', 2),
          ],
          skillCheck: [ask('fun-even-value', 2), ask('fun-even-pick', 2), ask('fun-negx-tiles', 2)],
        },
        {
          id: 'fn-l4-odd',
          title: 'Odd Functions',
          slides: [
            teach(
              prose('A function is **odd** when $f(-x) = -f(x)$ for every $x$: the output at $-2$ is the output at $2$ with its sign changed.'),
              markedGraph(
                [(x) => x ** 3 - 3 * x],
                { xMin: -3, xMax: 3, yMin: -4, yMax: 4 },
                [
                  { x: -2, y: -2 },
                  { x: 2, y: 2 },
                ],
                'The curve y = x^3 - 3x with the points (2, 2) and (-2, -2) ringed, each a half turn of the other about the origin',
              ),
              prose('On a graph that is a half turn about the origin: $x^3 - 3x$ is at $(2, 2)$, and so at $(-2, -2)$. $x^3$, $\\frac{1}{x}$ and $\\sin x$ are odd.'),
            ),
            ask('fun-odd-sum-tree'),
            teach(
              prose('To test a rule, compare $f(-x)$ with $-f(x)$, which changes the sign of every term. If they match, $f$ is odd; if $f(-x)$ matches $f(x)$ instead, $f$ is even. Most rules are neither.'),
              maths('\\begin{aligned} f(x) &= 3x^3 + 2x \\\\ -f(x) &= -3x^3 - 2x \\\\ f(-x) &= 3(-x)^3 + 2(-x) \\\\ &= -3x^3 - 2x \\end{aligned}'),
              prose('They match, so $f$ is odd. A number added on spoils it: $x^3 + 1$ is $2$ at $x = 1$ but $0$ at $x = -1$, not $-2$ — the constant keeps its sign in $f(-x)$.'),
              prose('So an odd function defined at $0$ passes through the origin: $f(0) = -f(0)$ forces $f(0) = 0$. It only works one way: $x^3 + x^2$ passes through the origin too, and it is neither.'),
            ),
            ask('fun-odd-tiles'),
            ask('fun-parity-flow'),
            ask('fun-odd-sum-tree', 2),
            ask('fun-odd-tiles', 2),
            ask('fun-parity-flow', 2),
            teach(
              prose('Reflecting $y = f(x)$ in the $y$-axis draws $y = f(-x)$; reflecting it in the $x$-axis draws $y = -f(x)$. For an odd function those are the same curve, so either flip gets you there.'),
              graph(
                [(x) => -(x ** 3) + 3 * x],
                { xMin: -3, xMax: 3, yMin: -4, yMax: 4 },
                'The curve y = x^3 - 3x dashed, and its reflection, which is the same whichever axis it is reflected in',
                [(x) => x ** 3 - 3 * x],
              ),
              prose('The other moves work as before: $y = 2f(-x) + 1$ flips, stretches up by $2$, then moves up $1$.'),
            ),
            ask('fun-odd-apply'),
            ask('fun-odd-match', 2),
          ],
          skillCheck: [ask('fun-odd-sum-tree', 2), ask('fun-odd-tiles', 2), ask('fun-parity-flow', 2)],
        },
        {
          id: 'fn-l4-test',
          title: 'Testing a Rule',
          slides: [
            teach(
              prose('Term by term: in $f(-x)$ the even powers stay, the odd powers change sign, and a constant, being $x^0$, stays. So:'),
              maths('\\begin{gathered} x^4 - 3x^2 + 2 \\text{ is even} \\\\ x^3 + 2x \\text{ is odd} \\\\ x^3 + 1 \\text{ is neither} \\end{gathered}'),
              prose('Only even powers: even. Only odd powers: odd. Both: neither. To make a rule even, then, every odd power needs a coefficient of $0$; to make it odd, every even power and the constant do:'),
              maths('\\begin{gathered} x^3 + (k - 5)x^2 + 4x \\text{ odd:} \\\\ k - 5 = 0, \\; k = 5 \\\\ x^3 + x + k + 2 \\text{ odd:} \\\\ k + 2 = 0, \\; k = -2 \\end{gathered}'),
            ),
            ask('fun-negx-steps'),
            ask('fun-parity-choice'),
            ask('fun-parity-k'),
            teach(
              prose('Split a rule into its even-power terms and its odd-power terms. For $f(x) = x^3 + 2x^2 + x + 1$ at $x = 2$, the even ones, $2x^2 + 1$, come to $E = 9$ and the odd ones, $x^3 + x$, to $O = 10$.'),
              maths('\\begin{gathered} f(2) = E + O = 19 \\\\ f(-2) = E - O = -1 \\end{gathered}'),
              prose('At $-2$ the odd terms change sign and the even ones do not, so one piece of arithmetic gives both.'),
            ),
            ask('fun-split-tree'),
            ask('fun-negx-steps', 2),
            ask('fun-parity-k', 2),
            teach(
              prose('A product follows the signs. Odd times odd is even, like two minus signs; odd times even is odd; even times even is even.'),
              maths('\\begin{gathered} x(x^2 + 1) \\text{ is odd} \\\\ x(x^3 - x) = x^4 - x^2 \\text{ is even} \\end{gathered}'),
              prose('A factor that is neither, such as $x + 1$, makes the product neither.'),
            ),
            ask('fun-parity-choice', 2),
            ask('fun-split-tree', 2),
          ],
          skillCheck: [ask('fun-negx-steps', 2), ask('fun-parity-choice', 2), ask('fun-parity-k', 2)],
        },
        {
          id: 'fn-l4-period',
          title: 'Periodic Functions',
          slides: [
            teach(
              prose('A function is **periodic** when its graph repeats the same pattern over and over. If it repeats every $p$ units, $f(x + p) = f(x)$ for every $x$, and the smallest such $p$ is the **period**.'),
              graph(
                [zigzag],
                { xMin: -6, xMax: 6, yMin: -1, yMax: 3 },
                'A zigzag that rises to 2 and falls back to 0, repeating every 4 units',
              ),
              prose('This zigzag has period $4$. $\\sin x$ has period $360^{\\circ}$; $\\sin 3x$ runs three times as fast, so its period is $\\frac{360}{3} = 120^{\\circ}$. $\\cos x$ works the same way.'),
              prose('A number in front, or added on, changes the height of a wave but not how often it repeats: $2\\cos 5x + 1$ has period $\\frac{360}{5} = 72^{\\circ}$, the same as $\\cos 5x$.'),
            ),
            ask('fun-period-choice'),
            ask('fun-period-slider'),
            teach(
              prose('A whole number of periods along lands on the same value. If $f(x + 4) = f(x)$ and $f(1) = 5$, then $f(9) = 5$, since $9 - 1 = 8$ is two periods, and $f(-7) = 5$ too. $f(3)$ is half a period along, and $f(1)$ says nothing about it.'),
              prose('Measure a period from one point to the next point at the same stage of the pattern, not just at the same height.'),
              prose('For a wave, $\\sin bx$ has period $\\frac{360}{b}$ degrees and $\\sin \\frac{x}{b}$, which runs slower, has period $360b$.'),
            ),
            ask('fun-repeat-flow'),
            ask('fun-period-value'),
            ask('fun-period-choice', 2),
            ask('fun-repeat-flow', 2),
            teach(
              prose('With a slower wave the number in front still changes only the height: $3\\sin \\frac{x}{2} - 1$ has period $360 \\times 2 = 720^{\\circ}$, the same as $\\sin \\frac{x}{2}$.'),
              prose('Backwards: if $\\sin bx$ has period $40^{\\circ}$, then $\\frac{360}{b} = 40$, so $b = 9$.'),
              prose('Moving a wave across as well, $a\\sin(bx + c) + d$, is in Trigonometric Functions.'),
            ),
            ask('fun-period-slider', 2),
            ask('fun-period-value', 2),
          ],
          skillCheck: [ask('fun-period-choice', 2), ask('fun-repeat-flow', 2), ask('fun-period-value', 2)],
        },
        {
          id: 'fn-l4-piecewise',
          title: 'Piecewise-Defined Functions',
          slides: [
            teach(
              prose('A **piecewise** function uses a different rule on different stretches of $x$:'),
              maths('f(x) = \\begin{cases} x + 3 & x < 1 \\\\ 3 - x & x \\geq 1 \\end{cases}'),
              markedGraph(
                [(x) => (x < 1 ? x + 3 : Number.NaN), (x) => (x >= 1 ? 3 - x : Number.NaN)],
                { xMin: -4, xMax: 5, yMin: -3, yMax: 5 },
                [
                  { x: 1, y: 4, hollow: true },
                  { x: 1, y: 2 },
                ],
                'Two straight pieces: a line rising to a hollow dot at (1, 4), and a line falling from a filled dot at (1, 2)',
              ),
              prose('Find the stretch first, then use that rule only: $f(-2) = -2 + 3 = 1$ and $f(4) = 3 - 4 = -1$. The filled dot is on the graph and the hollow one is not, so $f(1) = 2$.'),
            ),
            ask('fun-piece-value'),
            ask('fun-piece-tiles'),
            teach(
              prose('Where two pieces meet, put the number into both rules. In the example, at $x = 1$ the first rule gives $1 + 3 = 4$ and the second $3 - 1 = 2$, so the graph jumps by $2 - 4 = -2$ there.'),
              prose('When the two agree, the pieces meet and the graph joins up. Either way, the $\\leq$ or $\\geq$ says which piece owns the join itself.'),
            ),
            ask('fun-join-tree'),
            ask('fun-piece-value', 2),
            ask('fun-piece-tiles', 2),
            teach(
              prose('Reading a sketch back to a rule: each straight piece is a line $y = mx + c$, with $m$ how far it rises for each square across and $c$ where it would cross the $y$-axis.'),
              prose('The filled dot says which piece gets the $\\leq$ or $\\geq$; the piece with the hollow dot gets $<$ or $>$.'),
              prose('In the first picture, the left piece rises $1$ for each square across and would cross the $y$-axis at $3$: $y = x + 3$. The right piece falls $1$ for each square and would cross at $3$: $y = 3 - x$. The filled dot at $x = 1$ is on the right piece, so it gets $x \\geq 1$ and the left piece $x < 1$.'),
            ),
            ask('fun-piece-choice'),
            ask('fun-piece-choice', 2),
            ask('fun-join-tree', 2),
          ],
          skillCheck: [ask('fun-piece-value', 2), ask('fun-join-tree', 2), ask('fun-piece-tiles', 2)],
        },
      ],
      levelCheck: [
        ask('fun-even-value', 2),
        ask('fun-even-pick', 2),
        ask('fun-negx-tiles', 2),
        ask('fun-odd-sum-tree', 2),
        ask('fun-parity-flow', 2),
        ask('fun-odd-match', 2),
        ask('fun-negx-steps', 2),
        ask('fun-parity-k', 2),
        ask('fun-parity-choice', 2),
        ask('fun-period-slider', 2),
        ask('fun-repeat-flow', 2),
        ask('fun-period-value', 2),
        ask('fun-join-tree', 2),
        ask('fun-piece-value', 2),
        ask('fun-piece-choice', 2),
      ],
    },
    {
      id: 'fn-l5',
      title: 'Transformations of Trigonometric Graphs',
      lessons: [
        {
          id: 'fn-l5-amplitude',
          title: 'Amplitude and Midline',
          slides: [
            teach(
              prose('Every change to $y = \\sin x$ in this level is a move from Functions & Transformations, with $x$ in degrees. A number **in front** multiplies every height, so $y = a\\sin x$ is a **stretch parallel to the $y$-axis** with scale factor $a$.'),
              graph(
                [wave(2, 1, 0, 1)],
                { ...DEGREES, yMin: -2, yMax: 4 },
                'The curve y = sin x dashed, and y = 2 sin x + 1 twice as tall and lifted by 1',
                [wave(1, 1, 0, 0)],
              ),
              prose('A number **added on** lifts every height, so $y = \\sin x + d$ is a **translation** by $\\begin{pmatrix} 0 \\\\ d \\end{pmatrix}$. The solid curve is $2\\sin x + 1$: stretched by $2$, then moved up $1$, so it swings about the line $y = 1$, its **midline**.'),
              prose('Its greatest and least values follow the same two moves. $\\sin x$ runs from $-1$ to $1$; the stretch by $2$ makes that $-2$ to $2$; the move up $1$ makes it $-1$ to $3$. The greatest is $1 + 2 = 3$ and the least $1 - 2 = -1$.'),
            ),
            ask('fun-amp-flow'),
            ask('fun-amp-apply'),
            teach(
              prose('$\\sin x$ runs from $-1$ to $1$. The stretch makes that $-a$ to $a$, and the translation adds $d$ to both:'),
              maths('\\begin{gathered} \\text{greatest} = d + a \\\\ \\text{least} = d - a \\end{gathered}'),
              prose('A number multiplying $x$ inside, as in $6\\cos 4x - 2$, only squeezes the wave across and changes no height, so the least value is still $-2 - 6 = -8$ and the greatest $-2 + 6 = 4$.'),
              prose('Backwards, the midline is halfway between the two and $a$ is half the distance between them:'),
              maths('\\begin{gathered} d = \\frac{\\text{greatest} + \\text{least}}{2} \\\\ a = \\frac{\\text{greatest} - \\text{least}}{2} \\end{gathered}'),
            ),
            ask('fun-wave-extremes'),
            ask('fun-amp-tiles'),
            ask('fun-amp-slider'),
            teach(
              prose('A **negative** number in front stretches and then reflects in the $x$-axis: $y = -3\\sin x$ is $3\\sin x$ turned upside down, setting off downwards.'),
              graph(
                [wave(-3, 1, 0, 0)],
                { ...DEGREES, yMin: -4, yMax: 4 },
                'The curve y = 3 sin x dashed, and y = -3 sin x, its reflection in the x-axis',
                [wave(3, 1, 0, 0)],
              ),
              prose('Its greatest value is still $3$, not $-3$: turning the wave over swaps where the top and bottom are, not how far they reach. So $-3\\sin x + 1$ runs from $1 - 3 = -2$ up to $1 + 3 = 4$.'),
            ),
            ask('fun-wave-extremes', 2),
            ask('fun-amp-tiles', 2),
            ask('fun-amp-flow', 2),
          ],
          skillCheck: [ask('fun-wave-extremes', 2), ask('fun-amp-tiles', 2), ask('fun-amp-flow', 2)],
        },
        {
          id: 'fn-l5-period',
          title: 'Period as a Stretch',
          slides: [
            teach(
              prose('A number multiplying $x$ changes the wave **across**. $y = \\sin 2x$ does at $x = 45$ what $\\sin x$ does at $90$: everything happens at half the $x$.'),
              graph(
                [wave(1, 2, 0, 0)],
                { ...DEGREES, yMin: -1.6, yMax: 1.6 },
                'The curve y = sin x dashed, and y = sin 2x, squeezed to fit two waves in the same room',
                [wave(1, 1, 0, 0)],
              ),
              prose('So $y = \\sin bx$ is $y = \\sin x$ **stretched parallel to the $x$-axis with scale factor $\\frac{1}{b}$**, and $y = \\sin \\tfrac{x}{2}$ is a stretch with scale factor $2$. The factor is the reciprocal of the number multiplying $x$.'),
            ),
            ask('fun-xstretch-choice'),
            ask('fun-xstretch-apply'),
            teach(
              prose('A stretch across multiplies every distance across by its factor, the length of one wave included. $\\sin x$ repeats every $360^{\\circ}$, so:'),
              maths('\\text{period of } \\sin bx = \\frac{360}{b}'),
              prose('Stretch $y = \\sin 10x$ across by $5$: its period of $36^{\\circ}$ becomes five times as long, $180^{\\circ}$, which is $y = \\sin 2x$, so $b$ is divided by the factor. Backwards, $b = \\frac{360}{\\text{period}}$:'),
              maths('\\begin{aligned} \\frac{360}{10} &= 36 \\\\ 36 \\times 5 &= 180 \\\\ b = \\frac{360}{180} &= 2 \\end{aligned}'),
            ),
            ask('fun-period-tree'),
            ask('fun-xstretch-choice', 2),
            ask('fun-period-tree', 2),
            teach(
              prose('To read a period off a graph, measure between two points at the same stage of the wave: a peak and the next peak.'),
              markedGraph(
                [wave(1, 3, 0, 0)],
                { ...DEGREES, yMin: -1.6, yMax: 1.6 },
                [
                  { x: 30, y: 1 },
                  { x: 90, y: -1 },
                  { x: 150, y: 1 },
                ],
                'The curve y = sin 3x with peaks ringed at 30 and 150 degrees and the trough between them at 90',
              ),
              prose('Here the peaks are at $30$ and $150$, a period of $120^{\\circ}$, so $b = \\frac{360}{120} = 3$. A peak and the **next trough** are only half a period apart: $30$ to $90$ is $60$, which has to be doubled.'),
            ),
            ask('fun-b-from-graph'),
            ask('fun-b-from-graph', 2),
            ask('fun-xstretch-match', 2),
          ],
          skillCheck: [ask('fun-xstretch-choice', 2), ask('fun-period-tree', 2), ask('fun-b-from-graph', 2)],
        },
        {
          id: 'fn-l5-phase',
          title: 'Phase Shift and the Sign Trap',
          slides: [
            teach(
              prose('A number added **inside** the bracket moves the curve across, against its sign. $y = \\sin(x - 60)$ reaches every value $60^{\\circ}$ later than $\\sin x$, so it is $\\sin x$ translated by $\\begin{pmatrix} 60 \\\\ 0 \\end{pmatrix}$, to the **right**.'),
              graph(
                [wave(1, 1, -60, 0)],
                { ...DEGREES, yMin: -1.6, yMax: 1.6 },
                'The curve y = sin x dashed, and y = sin(x - 60), the same wave 60 degrees to the right',
                [wave(1, 1, 0, 0)],
              ),
              prose('$\\sin(x + 60)$ moves $60^{\\circ}$ to the **left**. A cosine moves the same way: $\\cos(x - 30)$ has its first peak at $30$ rather than $0$.'),
            ),
            ask('fun-phase-choice'),
            ask('fun-phase-slider'),
            teach(
              prose('With a number multiplying $x$, take it out of the bracket before reading the move:'),
              maths('\\sin(2x + 60) = \\sin(2(x + 30))'),
              prose('That is $y = \\sin 2x$ moved $30^{\\circ}$ left, **not** $60^{\\circ}$: the $2$ multiplies the whole bracket, so the move inside has been doubled. $\\sin(bx + c)$ is $\\sin bx$ moved by $\\frac{c}{b}$, against the sign of $c$.'),
            ),
            ask('fun-phase-steps'),
            ask('fun-phase-flow'),
            ask('fun-phase-choice', 2),
            teach(
              prose('A cosine curve **is** a sine curve moved: $y = \\cos x$ is $y = \\sin x$ translated $90^{\\circ}$ to the left.'),
              maths('\\cos x = \\sin(x + 90)'),
              graph(
                [wave(1, 1, 0, 0, 'cos')],
                { ...DEGREES, yMin: -1.6, yMax: 1.6 },
                'The curve y = sin x dashed, and y = cos x, the same wave 90 degrees to the left',
                [wave(1, 1, 0, 0)],
              ),
              prose('So a moved cosine can be written as a moved sine: $\\cos(x - 30) = \\sin(x - 30 + 90) = \\sin(x + 60)$, which is $\\sin x$ moved $60^{\\circ}$ left.'),
            ),
            ask('fun-phase-slider', 2),
            ask('fun-phase-steps', 2),
            ask('fun-phase-flow', 2),
          ],
          skillCheck: [ask('fun-phase-choice', 2), ask('fun-phase-steps', 2), ask('fun-phase-flow', 2)],
        },
        {
          id: 'fn-l5-graph',
          title: 'The Equation from the Graph',
          slides: [
            teach(
              prose('To write the equation of a drawn wave, take the heights first: $d$ is halfway between the greatest and least values, and $a$ is half the distance between them.'),
              markedGraph(
                [wave(3, 1, 0, 1)],
                { ...DEGREES, yMin: -3, yMax: 5 },
                [
                  { x: 90, y: 4 },
                  { x: 270, y: -2 },
                ],
                'A sine wave with its maximum ringed at (90, 4) and its minimum at (270, -2)',
              ),
              prose('Here the top is $4$ and the bottom $-2$, so $d = \\frac{4 + (-2)}{2} = 1$ and $a = \\frac{4 - (-2)}{2} = 3$: $y = 3\\sin x + 1$.'),
            ),
            ask('fun-wave-parts-tree'),
            ask('fun-wave-read'),
            teach(
              prose('Then across. $b$ comes from the period: $b = \\frac{360}{\\text{period}}$. The move across comes from where the wave **starts**: a sine starts by rising through its midline, a cosine at its peak.'),
              prose('A sine rising through its midline at $x = 40$ rather than $0$ has moved $40^{\\circ}$ right, so $x$ becomes $x - 40$ and the curve is $y = \\sin(x - 40)$.'),
            ),
            ask('fun-graph-shift'),
            ask('fun-wave-choice'),
            ask('fun-wave-parts-tree', 2),
            teach(
              prose('With $b$ as well, write the move inside first and multiply out after. A sine with period $120^{\\circ}$ rising through its midline at $x = 20$ is:'),
              maths('\\begin{aligned} y &= \\sin(3(x - 20)) \\\\ &= \\sin(3x - 60) \\end{aligned}'),
              prose('So in $y = \\sin(3x - c)$, $c$ is $60$, not $20$. A wave that sets off downwards from its midline has a negative $a$.'),
            ),
            ask('fun-wave-read', 2),
            ask('fun-graph-shift', 2),
            ask('fun-wave-choice', 2),
          ],
          skillCheck: [ask('fun-wave-read', 2), ask('fun-graph-shift', 2), ask('fun-wave-choice', 2)],
        },
        {
          id: 'fn-l5-together',
          title: 'Putting It Together',
          slides: [
            teach(
              prose('Order matters when a stretch and a translation act in the same direction. Up and down: translate $y = \\sin x$ up $2$ and then stretch it by $3$, and the stretch triples the move as well:'),
              maths('3(\\sin x + 2) = 3\\sin x + 6'),
              prose('Stretch first and then translate, and it is $3\\sin x + 2$. So $a\\sin x + d$ reads as **stretch, then translate**.'),
            ),
            ask('fun-moves-tiles'),
            ask('fun-moves-choice'),
            ask('fun-amp-match', 2),
            teach(
              prose('Across, the moves act on $x$. Translate $30^{\\circ}$ right, then stretch across by $\\frac{1}{2}$: the translation writes $x - 30$ for $x$, then the stretch writes $2x$ for $x$:'),
              maths('\\begin{aligned} &\\sin x \\\\ \\to \\quad &\\sin(x - 30) \\\\ \\to \\quad &\\sin(2x - 30) \\end{aligned}'),
              prose('The stretch squeezed the move as well, to $15^{\\circ}$: $\\sin(2x - 30) = \\sin(2(x - 15))$. Stretch first and the move stays $30^{\\circ}$, which is $\\sin(2(x - 30)) = \\sin(2x - 60)$, a different curve.'),
            ),
            ask('fun-moves-tiles', 2),
            ask('fun-moves-choice', 2),
            ask('fun-xstretch-match'),
            teach(
              prose('All of $y = a\\sin(bx + c) + d$ from $y = \\sin x$, in order: stretch across by $\\frac{1}{b}$, translate across by $\\frac{c}{b}$ against its sign, stretch up by $a$, translate up by $d$.'),
              prose('Reading a graph runs the list backwards: the heights for $a$ and $d$, the period for $b$, and where the wave starts for the move across.'),
            ),
            ask('fun-wave-choice', 2),
            ask('fun-wave-parts-tree', 2),
          ],
          skillCheck: [ask('fun-moves-tiles', 2), ask('fun-moves-choice', 2), ask('fun-wave-choice', 2)],
        },
      ],
      levelCheck: [
        ask('fun-wave-extremes', 2),
        ask('fun-amp-tiles', 2),
        ask('fun-amp-flow', 2),
        ask('fun-xstretch-choice', 2),
        ask('fun-period-tree', 2),
        ask('fun-b-from-graph', 2),
        ask('fun-phase-choice', 2),
        ask('fun-phase-steps', 2),
        ask('fun-phase-slider', 2),
        ask('fun-wave-parts-tree', 2),
        ask('fun-wave-read', 2),
        ask('fun-graph-shift', 2),
        ask('fun-moves-tiles', 2),
        ask('fun-moves-choice', 2),
        ask('fun-wave-choice', 2),
      ],
    },
    {
      id: 'fn-l6',
      title: 'Functions in Modelling',
      lessons: [
        {
          id: 'fn-l6-family',
          title: 'Which Family Fits',
          slides: [
            teach(
              prose('A **model** is a function standing in for something real. The first job is to pick its family, from how the thing behaves as its input grows:'),
              prose('The same amount added every step, like £$4$ for every mile, is **linear**: $C = 15 + 4m$.'),
              prose('A fixed fence round a rectangle, its area against its width, is **quadratic**. With $20$ m of fence, width + length + width + length $= 20$, so width + length $= 10$ and the length is $10 - x$: $A = x(10 - x)$.'),
              prose('A fixed amount divided, like the time for a $120$ km journey against the speed, is **reciprocal**: $T = \\frac{120}{v}$.'),
              prose('The amount **multiplied** by the same number every step, like doubling, is **exponential**: $N = 5 \\times 2^t$.'),
            ),
            ask('fun-model-family'),
            ask('fun-family-next'),
            ask('fun-family-next', 2),
            teach(
              prose('A table with $x$ going up in ones shows the family in its differences. Take each $y$ from the next:'),
              maths('\\begin{array}{c|ccccc} x & 1 & 2 & 3 & 4 & 5 \\\\ \\hline y & 3 & 8 & 15 & 24 & 35 \\end{array}'),
              prose('The differences are $5, 7, 9, 11$: not the same, but they change by $2$ every time. A constant **second** difference means quadratic. Constant differences mean linear.'),
              prose('Divide instead: $3, 6, 12, 24$ is $\\times 2$ every time, the same **ratio**, so exponential. Multiply each pair instead: for $y = 60, 30, 20, 15$ at $x = 1, 2, 3, 4$, $x \\times y$ is $60$ every column, so reciprocal, $y = \\frac{60}{x}$.'),
            ),
            ask('fun-family-flow'),
            ask('fun-family-flow', 2),
            ask('fun-model-family', 2),
            teach(
              prose('A sketch shows the family too. A line is straight, and a parabola rises, turns and comes back down the same way. The two that fall and flatten are the ones to tell apart:'),
              markedGraph(
                [(x) => (x > 0 ? 12 / x : NaN), (x) => 10 * 0.7 ** x],
                { xMin: 0, xMax: 8, yMin: -1, yMax: 14 },
                [{ x: 0, y: 10 }],
                'Two falling curves: y = 12 over x climbing the y-axis without meeting it, and 10 times 0.7 to the x crossing the y-axis at 10',
              ),
              prose('The reciprocal climbs the $y$-axis without ever meeting it: there is nothing at $x = 0$. The exponential crosses it at its starting value, ringed; a growing one crosses there too and then climbs ever faster. Fitting an exponential to data is in Exponential Models; here it is enough to know one when you see it.'),
            ),
            ask('fun-family-sketch'),
            ask('fun-family-sketch', 2),
          ],
          skillCheck: [ask('fun-model-family', 2), ask('fun-family-flow', 2), ask('fun-family-sketch', 2)],
        },
        {
          id: 'fn-l6-rule',
          title: 'The Rule from the Story',
          slides: [
            teach(
              prose('To build the rule, ask what happens to each number in the story. A taxi charges £$15$ to start, plus £$4$ for every mile: the £$15$ is paid once, and the £$4$ once for every mile.'),
              maths('C(m) = 15 + 4m'),
              prose('Every letter is a quantity with a unit: $m$ is a number of miles, and $C(m)$ is the fare in pounds.'),
              prose('$20$ m of fencing round a rectangle $x$ m wide: width + length + width + length is $20$, so width + length is $10$ and the length is $10 - x$. Area is width times length:'),
              maths('A(x) = x(10 - x)'),
            ),
            ask('fun-model-rule'),
            ask('fun-model-meaning'),
            ask('fun-rule-machine'),
            teach(
              prose('Something that goes down each step takes the rate away: a candle $30$ cm tall burning $2$ cm an hour has $H(t) = 30 - 2t$.'),
              prose('A $120$ km journey at $v$ km/h takes $120 \\div v$ hours. The fixed amount goes on top:'),
              maths('T(v) = \\frac{120}{v}'),
              prose('To use a rule, write the number in: $T(40) = \\frac{120}{40} = 3$, so at $40$ km/h the journey takes $3$ hours; $A(4) = 4(10 - 4) = 24$ m².'),
            ),
            ask('fun-model-value'),
            ask('fun-model-rule', 2),
            ask('fun-model-value+choice', 2),
            teach(
              prose('Use a rule in the story\'s own order: the rate times the input first, then the fixed amount; the bracket first, then the width times it.'),
              maths('C(7) = 15 + 4 \\times 7 = 43'),
              prose('Then say it in the story\'s words: a $7$-mile ride costs £$43$. Each number means something too: in $H(t) = 30 - 2t$ the $30$ is the height at the start and the $2$ the cm burned each hour; in $x(10 - x)$ the $10 - x$ is the length.'),
            ),
            ask('fun-rule-machine', 2),
            ask('fun-model-meaning', 2),
          ],
          skillCheck: [ask('fun-model-rule', 2), ask('fun-model-value', 2), ask('fun-model-meaning', 2)],
        },
        {
          id: 'fn-l6-domain',
          title: 'The Domain That Makes Sense',
          slides: [
            teach(
              prose('A rule will take any number. A story will not. Level 1 gave a rule a domain because of the algebra; here the story decides.'),
              prose('An input that **counts** things is a whole number: $n$ T-shirts means $n = 0, 1, 2, \\ldots$. An input that **measures** can be any value in its stretch: $m$ miles means $m \\geq 0$.'),
              prose('Then find the ends. A $40$ litre tank draining $5$ litres a minute has $V = 40 - 5t$. It is empty when $40 - 5t = 0$, at $t = 8$, and both ends are real moments:'),
              maths('0 \\leq t \\leq 8'),
            ),
            ask('fun-model-domain'),
            ask('fun-sense-flow'),
            ask('fun-domain-line'),
            teach(
              prose('A pen from $20$ m of fence has $0 < x < 10$: a width of $0$ or of $10$ leaves no rectangle, so both ends are left out. A speed or a rate must be more than $0$: $v > 0$.'),
              prose('A count that runs out stops at a whole number: £$20$ spent £$4$ a week lasts until $20 - 4w = 0$, at $w = 5$, so $w = 0, 1, 2, \\ldots, 5$.'),
            ),
            ask('fun-model-domain', 2),
            ask('fun-domain-line', 2),
            ask('fun-sense-flow', 2),
            teach(
              prose('The outputs follow from the inputs. $C(n) = 15 + 4n$ for $0 \\leq n \\leq 20$ runs from $15$ up to $95$. A falling model swaps the ends: $T(v) = \\frac{120}{v}$ for $40 \\leq v \\leq 60$ runs from $2$ to $3$, the slowest speed taking the longest.'),
              markedGraph(
                [(x) => x * (10 - x)],
                { xMin: 0, xMax: 10, yMin: -2, yMax: 30 },
                [{ x: 5, y: 25 }],
                'The area x(10 - x) for widths from 0 to 10, greatest at 25 when the width is 5',
              ),
              prose('A rectangle\'s area is greatest at neither end: $x(10 - x)$ peaks at the square, $x = 5$, with an area of $25$.'),
            ),
            ask('fun-model-range'),
            ask('fun-model-range', 2),
          ],
          skillCheck: [ask('fun-model-domain', 2), ask('fun-domain-line', 2), ask('fun-model-range', 2)],
        },
        {
          id: 'fn-l6-inverse',
          title: 'The Inverse in Context',
          slides: [
            teach(
              prose('The inverse runs the story backwards. For the taxi, $C(m) = 15 + 4m$, $C^{-1}(55)$ is the ride that costs £$55$: what £$55$ buys.'),
              maths('55 \\xrightarrow{-15} 40 \\xrightarrow{\\div 4} 10'),
              prose('So £$55$ buys a $10$-mile ride. Undo each step in reverse order, as in Inverse Functions; working out $C(55)$ instead answers a different question. The whole inverse is the same undoing, done to $C$:'),
              maths('\\begin{gathered} C = 15 + 4m \\\\ C - 15 = 4m \\\\ m = (C - 15) \\div 4 \\end{gathered}'),
            ),
            ask('fun-model-inverse'),
            ask('fun-inverse-tiles'),
            teach(
              prose('A conversion both ways is a function and its inverse. Miles to kilometres is $k = 1.6m$, so kilometres to miles is $m = k \\div 1.6$. With a number added on, undo that first:'),
              maths('\\begin{gathered} F = 1.8C + 32 \\\\ C = (F - 32) \\div 1.8 \\end{gathered}'),
              prose('A falling model: £$20$ spent £$4$ a week leaves $S = 20 - 4w$, so $4w = 20 - S$ and $w = (20 - S) \\div 4$. A fixed amount divided: $\\frac{120}{v} = 3$ gives $v = \\frac{120}{3} = 40$.'),
            ),
            ask('fun-convert-table'),
            ask('fun-model-inverse+choice', 2),
            ask('fun-convert-table', 2),
            ask('fun-inverse-tiles', 2),
            teach(
              prose('Some models have no inverse over their whole domain. With $A(x) = x(10 - x)$, widths of $2$ and $8$ both give an area of $16$: the same rectangle turned round.'),
              diagram(
                [(x) => x * (10 - x)],
                { xMin: 0, xMax: 10, yMin: -2, yMax: 30 },
                [16],
                'The area x(10 - x) meeting the line at height 16 twice, at widths 2 and 8',
              ),
              prose('Knowing the area does not tell you the width. Cut the domain at the square, $0 < x \\leq 5$, and every area comes from one width.'),
            ),
            ask('fun-no-inverse-flow'),
            ask('fun-no-inverse-flow', 2),
          ],
          skillCheck: [ask('fun-model-inverse', 2), ask('fun-inverse-tiles', 2), ask('fun-no-inverse-flow', 2)],
        },
        {
          id: 'fn-l6-composite',
          title: 'The Composite in Context',
          slides: [
            teach(
              prose('Two changes to a price are two functions, one after the other. A £$10$ voucher and $20$% VAT:'),
              maths('\\begin{aligned} f(x) &= x - 10 \\\\ g(x) &= 1.2x \\end{aligned}'),
              prose('Voucher first, then VAT, is $g(f(x))$: as in Composite Functions, the change made first sits nearest the $x$.'),
              maths('gf(x) = 1.2(x - 10)'),
            ),
            ask('fun-price-tree'),
            ask('fun-order-choice'),
            ask('fun-price-value'),
            teach(
              prose('The other order is a different function. VAT first, then the voucher:'),
              maths('fg(x) = 1.2x - 10'),
              prose('On £$80$, $gf(80) = 84$ but $fg(80) = 86$. The VAT is charged on the £$10$ in one order and not the other, so the prices differ by $20$% of £$10$.'),
            ),
            ask('fun-composite-tiles'),
            ask('fun-price-tree', 2),
            ask('fun-price-value+choice', 2),
            teach(
              prose('So read the story for which change reaches the price **first**: its letter goes on the inside.'),
              prose('Only a mix makes the order matter. Two percentages give the same price either way round, since $1.2 \\times 0.8 = 0.8 \\times 1.2$, and so do two fixed amounts.'),
            ),
            ask('fun-order-choice', 2),
            ask('fun-composite-tiles', 2),
          ],
          skillCheck: [ask('fun-price-tree', 2), ask('fun-order-choice', 2), ask('fun-composite-tiles', 2)],
        },
      ],
      levelCheck: [
        ask('fun-model-family', 2),
        ask('fun-family-flow', 2),
        ask('fun-family-next', 2),
        ask('fun-model-rule', 2),
        ask('fun-model-value', 2),
        ask('fun-model-meaning', 2),
        ask('fun-model-domain', 2),
        ask('fun-domain-line', 2),
        ask('fun-model-range', 2),
        ask('fun-model-inverse', 2),
        ask('fun-convert-table', 2),
        ask('fun-no-inverse-flow', 2),
        ask('fun-price-tree', 2),
        ask('fun-order-choice', 2),
        ask('fun-composite-tiles', 2),
      ],
    },
  ],
};
