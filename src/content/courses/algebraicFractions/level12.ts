/**
 * Level 12: turning points and ranges of rational functions.
 *
 * Shown in Partial Fractions & Rational Functions straight after Graphs of
 * Rational Functions, whose asymptotes, holes and intercepts it builds on.
 * Setting y = k gives a quadratic in x; its discriminant says which heights
 * the curve reaches, and where it is zero the curve turns. Then the slant
 * asymptote of a top one degree higher, which asymptotes a curve can cross,
 * and all of it in one sketch. Generators are in
 * `generators/fractionsLevel12.ts`.
 */
import { plotSvg } from '../../figures';
import type { Block, Level } from '../../types';
import { ask, askAfter, maths, prose, teach, working } from './blocks';

/**
 * A curve with its asymptotes dashed and the pen lifted at a pole: a vertical
 * line, a slant line or a level, and any turning points marked.
 */
const graph = (
  f: (x: number) => number,
  window: { xMin: number; xMax: number; yMin: number; yMax: number },
  asymptotes: { x?: number; slant?: (x: number) => number; y?: number },
  label: string,
  marks: { x: number; y: number }[] = [],
): Block => ({
  kind: 'diagram',
  svg: plotSvg({
    ...window,
    curves: [{ f, accent: true, breaks: true }, ...(asymptotes.slant ? [{ f: asymptotes.slant, dashed: true }] : [])],
    verticals: asymptotes.x === undefined ? [] : [{ x: asymptotes.x }],
    horizontals: asymptotes.y === undefined ? [] : [asymptotes.y],
    marks,
    label,
  }),
});

/** The running example: y = (x^2 + x + 2)/(x - 1) = x + 2 + 4/(x - 1). */
const example = (x: number) => (x * x + x + 2) / (x - 1);
const exampleGraph = (label: string, marks: { x: number; y: number }[] = []): Block =>
  graph(example, { xMin: -5, xMax: 7, yMin: -6, yMax: 12 }, { x: 1, slant: (x) => x + 2 }, label, marks);

/** The bounded example: y = (x^2 - 4x + 1)/(x^2 + 1), between -1 and 3. */
const bounded = (x: number) => (x * x - 4 * x + 1) / (x * x + 1);
const boundedGraph = (label: string, marks: { x: number; y: number }[] = []): Block =>
  graph(bounded, { xMin: -6, xMax: 6, yMin: -2, yMax: 4 }, { y: 1 }, label, marks);

export const level12: Level = {
  id: 'af-l12',
  title: 'Turning Points and Ranges of Rational Functions',
  lessons: [
    {
      id: 'af-l12-range',
      title: 'Values a Curve Cannot Take',
      slides: [
        teach(
          prose('Does the curve $y = \\frac{x^2 + x + 2}{x - 1}$ ever reach the height $3$? Set it equal to $3$ and multiply by the bottom:'),
          working('x^2 + x + 2 &= 3(x - 1)', 'x^2 - 2x + 5 &= 0'),
          prose('Its discriminant is negative:'),
          maths('(-2)^2 - 4 \\times 5 = -16'),
          prose('No real $x$ solves it, so the curve never reaches $3$.'),
          prose('To test every height at once, write $k$ for the height instead of $3$:'),
          working('&x^2 + x + 2 = k(x - 1)', '&x^2 + (1 - k)x + (2 + k) = 0'),
          prose('The curve reaches $k$ exactly when this quadratic in $x$ has a real root: when its discriminant is at least $0$.'),
          working('&(1 - k)^2 - 4(2 + k)', '=\\;&k^2 - 6k - 7', '=\\;&(k + 1)(k - 7)'),
          prose('So the condition on $k$ is $(k + 1)(k - 7) \\geq 0$.'),
        ),
        ask('af12-k-quadratic'),
        ask('af12-k-disc'),
        teach(
          prose('A product of two brackets is at least $0$ outside its roots, since there both brackets have the same sign. So $k \\leq -1$ or $k \\geq 7$.'),
          prose('The curve takes every value $y \\leq -1$ or $y \\geq 7$, and misses every value strictly between $-1$ and $7$:'),
          exampleGraph('The curve in two branches, the left one never rising above y = -1 and the right one never falling below y = 7, with its asymptotes dashed', [
            { x: -1, y: -1 },
            { x: 3, y: 7 },
          ]),
          prose('On a number line the values it takes are two rays with filled ends at $-1$ and $7$, since both of those are reached.'),
        ),
        ask('af12-range-which'),
        ask('af12-range-line'),
        ask('af12-range-edge'),
        teach(
          prose('When the bottom is a quadratic that is never zero, the $x^2$ term has $k$ in it too. For $y = \\frac{x^2 - 4x + 1}{x^2 + 1}$:'),
          working('&x^2 - 4x + 1 = k(x^2 + 1)', '&(1 - k)x^2 - 4x', '&\\quad + (1 - k) = 0'),
          prose('Its discriminant, multiplied out and factorised:'),
          working('&(-4)^2 - 4(1 - k)^2', '=\\;&{-4k^2} + 8k + 12', '=\\;&{-4}(k + 1)(k - 3)'),
          prose('That must be at least $0$. Divide by $-4$, which turns the inequality round:'),
          maths('(k + 1)(k - 3) \\leq 0'),
          prose('A product is at most $0$ between its roots, so this curve takes only $-1 \\leq y \\leq 3$. A number in front of $x^2$, such as $2x^2$, is the $a$ in $b^2 - 4ac$: the discriminant is then $b^2 - 8c$.'),
        ),
        ask('af12-k-disc', 2),
        ask('af12-range-line', 2),
        ask('af12-range-which', 2),
      ],
      skillCheck: [ask('af12-k-quadratic', 2), ask('af12-range-line', 2), ask('af12-range-edge', 2)],
    },
    {
      id: 'af-l12-turning',
      title: 'Turning Points from the Discriminant',
      slides: [
        teach(
          prose('For $y = \\frac{x^2 + x + 2}{x - 1}$ the discriminant is zero at $k = -1$ and $k = 7$. There the quadratic in $x$ has one repeated root, so the line $y = 7$ meets the curve at a single point: it touches it at a turning point.'),
          prose('Put $k = 7$ back into $x^2 + (1 - k)x + (2 + k) = 0$:'),
          working('x^2 - 6x + 9 &= 0', '(x - 3)^2 &= 0'),
          prose('So $x = 3$, and $(3, 7)$ is a turning point. Put $k = -1$ back the same way:'),
          working('x^2 + 2x + 1 &= 0', '(x + 1)^2 &= 0'),
          prose('So $(-1, -1)$ is the other. If the $x^2$ term has a number in front, divide by it first: the square is what is left.'),
        ),
        ask('af12-tp-point'),
        ask('af12-tp-tree'),
        teach(
          prose('Which is the maximum? The curve takes no value between $-1$ and $7$, so each turning point is the edge of a branch.'),
          exampleGraph('The left branch rising to a maximum at (-1, -1) and the right branch falling to a minimum at (3, 7)', [
            { x: -1, y: -1 },
            { x: 3, y: 7 },
          ]),
          prose('The left branch never rises above $-1$, so $(-1, -1)$ is its **maximum**. The right branch never falls below $7$, so $(3, 7)$ is its **minimum**. The maximum is lower than the minimum because they are on different branches.'),
        ),
        ask('af12-tp-flow'),
        ask('af12-tp-slider'),
        ask('af12-tp-tree', 2),
        teach(
          prose('For $y = \\frac{x^2 - 4x + 1}{x^2 + 1}$ the curve takes only values from $-1$ to $3$, so $-1$ is its **minimum** and $3$ its **maximum**. Put $k = 3$ into $(1 - k)x^2 - 4x + (1 - k) = 0$:'),
          working('-2x^2 - 4x - 2 &= 0', '-2(x + 1)^2 &= 0'),
          prose('Dividing by $-2$ leaves $(x + 1)^2 = 0$, so the maximum is at $(-1, 3)$. The same with $k = -1$ gives $2(x - 1)^2 = 0$: the minimum is at $(1, -1)$.'),
          boundedGraph('A curve that stays between y = -1 and y = 3, rising to a maximum at (-1, 3) and dipping to a minimum at (1, -1), with its level y = 1 dashed', [
            { x: -1, y: 3 },
            { x: 1, y: -1 },
          ]),
        ),
        ask('af12-tp-slider', 2),
        ask('af12-tp-flow', 2),
        ask('af12-tp-point+choice', 2),
      ],
      skillCheck: [ask('af12-tp-tree', 2), ask('af12-tp-flow', 2), ask('af12-tp-point', 2)],
    },
    {
      id: 'af-l12-oblique',
      title: 'Oblique Asymptotes',
      slides: [
        teach(
          prose('When the top is one degree higher than the bottom there is no horizontal asymptote. Divide instead: write the top as the bottom times a line, plus what is left over.'),
          working('&x^2 + x + 2', '=\\;&(x + 2)(x - 1) + 4'),
          maths('y = x + 2 + \\frac{4}{x - 1}'),
          prose('As $x$ grows either way, $\\frac{4}{x - 1}$ shrinks to $0$, so the curve closes in on the slanted line $y = x + 2$: an **oblique asymptote**.'),
          exampleGraph('The curve closing in on the dashed slant line y = x + 2 far out on both sides, with the vertical asymptote x = 1 dashed'),
        ),
        ask('af12-oblique-divide'),
        ask('af12-oblique-line'),
        ask('af12-oblique-value'),
        teach(
          prose('Which side of the line is the curve? Look at the leftover, $\\frac{4}{x - 1}$.'),
          prose('Far to the right, $x - 1$ is large and positive, so the leftover is small and positive: the curve is just **above** the line.'),
          prose('Far to the left, $x - 1$ is large and negative, so the leftover is small and negative: the curve is just **below** the line. A negative number on top swaps both.'),
        ),
        ask('af12-oblique-flow'),
        ask('af12-oblique-divide', 2),
        teach(
          prose('A number in front of $x^2$ goes in front of $x$ in the line. For $y = \\frac{2x^2 + 5x + 1}{x + 2}$, start the line with $2x$:'),
          maths('(2x + 1)(x + 2) = 2x^2 + 5x + 2'),
          working('&2x^2 + 5x + 1', '=\\;&(2x + 1)(x + 2) - 1'),
          prose('So $y = 2x + 1 - \\frac{1}{x + 2}$. The oblique asymptote is $y = 2x + 1$, and the leftover has $-1$ on top, so the curve is below the line far to the right and above it far to the left.'),
        ),
        ask('af12-oblique-line', 2),
        ask('af12-oblique-value', 2),
        ask('af12-oblique-flow', 2),
      ],
      skillCheck: [ask('af12-oblique-divide', 2), ask('af12-oblique-flow', 2), ask('af12-oblique-value', 2)],
    },
    {
      id: 'af-l12-crossing',
      title: 'Crossing an Asymptote',
      slides: [
        teach(
          prose('A curve can never cross a vertical asymptote: it has no value there. It can cross a horizontal one nearer in, before settling towards it far out.'),
          prose('$y = \\frac{x^2 + x - 4}{x^2 - x - 2}$ settles towards $y = 1$. Set it equal to $1$ and multiply by the bottom:'),
          working('x^2 + x - 4 &= x^2 - x - 2', '2x &= 2', 'x &= 1'),
          prose('The $x^2$ terms cancel, which is why there is at most one crossing. Take the $x$ terms to the left and the numbers to the right. This curve crosses its asymptote at $(1, 1)$.'),
        ),
        ask('af12-cross-value'),
        ask('af12-cross-tree'),
        ask('af12-cross-slider'),
        teach(
          prose('If the $x$ terms cancel too, nothing is left to solve. For $y = \\frac{x^2 + 2x + 3}{x^2 + 2x - 3}$ set equal to $1$:'),
          maths('x^2 + 2x + 3 = x^2 + 2x - 3'),
          prose('That leaves $3 = -3$, which is never true, so this curve never crosses $y = 1$.'),
          prose('A slant asymptote of a quadratic over $x + d$ is never crossed either: $y = x + 2 + \\frac{4}{x - 1}$ equals $x + 2$ only if $\\frac{4}{x - 1} = 0$, and a fraction with $4$ on top is never $0$.'),
        ),
        ask('af12-cross-flow'),
        ask('af12-cross-value+choice'),
        teach(
          prose('A number in front of $x^2$ on top sets the level. $y = \\frac{2x^2 - 3x + 8}{x^2 + 1}$ settles towards $y = 2$, so multiply the bottom by $2$:'),
          working('2x^2 - 3x + 8 &= 2(x^2 + 1)', '2x^2 - 3x + 8 &= 2x^2 + 2', '-3x &= -6'),
          prose('So it crosses $y = 2$ at $x = 2$.'),
        ),
        ask('af12-cross-tree', 2),
        ask('af12-cross-slider', 2),
        ask('af12-cross-flow', 2),
      ],
      skillCheck: [ask('af12-cross-value', 2), ask('af12-cross-tree', 2), ask('af12-cross-flow', 2)],
    },
    {
      id: 'af-l12-together',
      title: 'Putting It Together',
      slides: [
        teach(
          prose('To sketch $y = \\frac{x^2 + x + 2}{x - 1}$, find every feature first:'),
          working(
            '\\text{Asymptotes: } & x = 1',
            '& y = x + 2',
            '\\text{Maximum: } & (-1, -1)',
            '\\text{Minimum: } & (3, 7)',
          ),
          prose('The asymptotes come from the bottom and the division; the turning points come from the discriminant. The curve misses every value between $-1$ and $7$.'),
          exampleGraph('The curve drawn from its features: dashed asymptotes x = 1 and y = x + 2, a maximum at (-1, -1) and a minimum at (3, 7)', [
            { x: -1, y: -1 },
            { x: 3, y: 7 },
          ]),
        ),
        ask('af12-features-table'),
        ask('af12-sketch-flow'),
        askAfter(
          'af12-sketch-which',
          1,
          prose('Now the other way: from a sketch back to its rule. Read the vertical asymptote off the grid: it gives the bottom. Read the slant line: it is the line the top divides into.'),
          prose('Then check the turning points. A curve of this shape with turning points has a positive leftover; with a negative leftover it has none, and each branch runs straight through every height.'),
        ),
        teach(
          prose('The range can be read off the sketch too. For $y = \\frac{x^2 + x + 2}{x - 1}$ the maximum is at height $-1$ and the minimum at $7$, so the gap between them is the values it misses:'),
          maths('y \\leq -1 \\text{ or } y \\geq 7'),
          prose('Both ends are reached, at the turning points, so on a number line both dots are filled.'),
        ),
        ask('af12-range-line', 2),
        ask('af12-features-table', 2),
        teach(
          prose('With a quadratic bottom that is never zero, as in $y = \\frac{x^2 - 4x + 1}{x^2 + 1}$, there is no vertical asymptote. The only one is the level $y = 1$, which it crosses where'),
          working('x^2 - 4x + 1 &= x^2 + 1', 'x &= 0'),
          prose('Its minimum is $(1, -1)$ and its maximum $(-1, 3)$, so it takes $-1 \\leq y \\leq 3$.'),
          boundedGraph('The curve rising from its level to a maximum at (-1, 3), crossing y = 1 at x = 0, and dipping to a minimum at (1, -1)', [
            { x: -1, y: 3 },
            { x: 1, y: -1 },
          ]),
        ),
        ask('af12-sketch-which', 2),
        ask('af12-sketch-flow', 2),
        ask('af12-cross-value', 2),
      ],
      skillCheck: [ask('af12-features-table', 2), ask('af12-sketch-which', 2), ask('af12-sketch-flow', 2)],
    },
  ],
  levelCheck: [
    ask('af12-k-quadratic', 2),
    ask('af12-k-disc', 2),
    ask('af12-range-which', 2),
    ask('af12-range-line', 2),
    ask('af12-tp-tree', 2),
    ask('af12-tp-flow', 2),
    ask('af12-tp-slider', 2),
    ask('af12-oblique-divide', 2),
    ask('af12-oblique-line', 2),
    ask('af12-oblique-flow', 2),
    ask('af12-cross-tree', 2),
    ask('af12-cross-slider', 2),
    ask('af12-cross-flow', 2),
    ask('af12-features-table', 2),
    ask('af12-sketch-which', 2),
  ],
};
