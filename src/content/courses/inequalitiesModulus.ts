/**
 * Inequalities & the Modulus Function.
 *
 * Level 1 solves inequalities. It starts from the picture — an inequality's
 * answer is a stretch of the number line, not a number — and the one rule
 * that makes them different from equations, that multiplying or dividing by a
 * negative turns the sign round. Then two inequalities joined by "and" or
 * "or", quadratics whose critical values are surds (Quadratics `qd-l5` covers
 * the ones that factorise), rational inequalities from a sign table, and the
 * notations a solution set is written in.
 *
 * Level 2 is the modulus function: $|x|$ as a distance from zero and
 * $|x - a|$ as a distance from $a$, the V-shaped graph of $y = |ax + b|$,
 * modulus equations and the roots they produce that do not work, modulus
 * inequalities, and the V moved and stretched.
 *
 * Level 3 puts a modulus on both sides: $|ax + b| = |cx + d|$ by cases and by
 * squaring, the two Vs on one graph and how many times they meet,
 * $|ax + b| < |cx + d|$ from the factorised square, and when squaring is safe
 * at all.
 *
 * Level 4 puts a modulus on curves: $y = |f(x)|$ and $y = f(|x|)$ for a
 * quadratic, $|f(x)| = c$ solved from the graph and by two cases, the same
 * reflection for cubics, and $|f(x)| < c$ read off the picture.
 *
 * Level 5 takes the modulus onto the plane: $y \ge |x - a|$ as the region
 * above a V, $y < k - |x|$ as the region under an upside-down V, the
 * rectangle, square or kite between the two, reading a region's inequalities
 * off its picture, and the lattice points, highest point and width of a
 * region.
 *
 * Level 6 is piecewise functions, starting from the modulus: evaluating a rule
 * in pieces and which piece owns a join, writing $|ax + b|$ and
 * $|x - p| + |x - q|$ in pieces, sketching from the pieces, continuity and
 * jumps at the joins, and solving $f(x) = c$ one piece at a time. Evaluating
 * a rule in general is Functions & Transformations' `fn-l4-piecewise`.
 *
 * Linear inequalities on their own are Linear Equations' `le-l4`; this
 * course's first lesson keeps to the number-line picture of them. Later
 * levels are in `docs/roadmap/levels/inequalities-modulus.md`.
 *
 * Each level closes with a level check: fifteen questions, no teaching
 * slides, one attempt each.
 */
import type { Block, Course, SlideRef } from '../types';
import type { Piece } from '../numberLine';
import { plotSvg } from '../figures';
import {
  modRegionSvg,
  numberLineSvg,
  piecewiseSvg,
  type ModEdge,
  type Piecewise,
} from '../generators/inequalitiesModulus';

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

const piece = (lo: number, hi: number, loClosed: boolean, hiClosed: boolean): Piece => ({ lo, hi, loClosed, hiClosed });

/** A solution set on a number line, for a teaching slide. */
const line = (min: number, max: number, pieces: Piece[], label: string): Block => ({
  kind: 'diagram',
  svg: numberLineSvg(min, max, pieces, label),
});

/** A V with its vertex at (a, c), and the side and sign of its region. */
const vee = (a: number, c: number, op: ModEdge['op'], m = 1): ModEdge => ({ s: 1, m, a, c, op, turned: false });

/** An upside-down V with its vertex, the top, at (a, c). */
const cap = (a: number, c: number, op: ModEdge['op'], m = 1): ModEdge => ({ s: -1, m, a, c, op, turned: false });

/** A region on squared paper, shaded, for a teaching slide. */
const region = (edges: ModEdge[], label: string, dot?: [number, number]): Block => ({
  kind: 'diagram',
  svg: modRegionSvg(edges, { label, dot, shade: true }),
});

/** A function in pieces on squared paper, dots at its jumps. */
const pieces = (f: Piecewise, label: string, horizontal?: number): Block => ({
  kind: 'diagram',
  svg: piecewiseSvg(f, { label, horizontal }),
});

/** Curves on one set of axes, for the slides about graphs. */
const graph = (
  curves: { f: (x: number) => number; dashed?: boolean; accent?: boolean; breaks?: boolean }[],
  window: { xMin: number; xMax: number; yMin: number; yMax: number },
  label: string,
  marks: { x: number; y: number; hollow?: boolean }[] = [],
): Block => ({
  kind: 'diagram',
  svg: plotSvg({ ...window, curves, marks, verticals: [{ x: 0, dashed: false }], label }),
});

export const inequalitiesModulus: Course = {
  id: 'inequalities-modulus',
  category: 'advanced-algebra',
  position: 60,
  title: 'Inequalities & the Modulus Function',
  blurb: 'Solution sets on a number line, and the distance from zero that the modulus measures.',
  levels: [
    {
      id: 'im-l1',
      title: 'Inequalities',
      lessons: [
        {
          id: 'im-l1-linear',
          title: 'The Number-Line Picture',
          slides: [
            teach(
              prose(
                'An equation has an answer; an inequality has a **solution set**, every number that makes it true. $x > 2$ is true for $3$, for $2.5$, for $100$: a whole stretch of the number line.',
              ),
              line(-2, 7, [piece(2, Infinity, false, false)], 'x greater than 2: a hollow dot at 2 and shading to the right'),
              prose(
                'A **hollow** dot means the end is left out, as in $x > 2$. A **filled** dot means it is included, as in $x \\ge 2$. The shading runs off the edge of the line in the direction the sign points.',
              ),
              prose(
                'Solving works like an equation: $2x + 3 > 7$ becomes $2x > 4$, then $x > 2$.',
              ),
            ),
            ask('ineq-linear-line'),
            ask('ineq-linear-steps'),
            ask('ineq-flip-flow'),
            teach(
              prose(
                'One move is different. $-2 < 3$ is true, but multiply both sides by $-1$ and you get $2$ and $-3$, where $2$ is the **bigger**. Multiplying or dividing by a negative number reverses the order of the line, so the sign turns round.',
              ),
              maths('\\begin{gathered} -3x \\le 12 \\\\ x \\ge -4 \\end{gathered}'),
              prose(
                'Check with a number: $x = 0$ is in $x \\ge -4$, and $-3 \\times 0 = 0 \\le 12$ is true. $x = -5$ is not, and $15 \\le 12$ is false. A quick check catches a missed flip every time.',
              ),
            ),
            ask('ineq-read-line'),
            ask('ineq-greatest-integer'),
            ask('ineq-linear-line', 2),
            teach(
              prose(
                'With $x$ on both sides, collect the $x$ terms first. It is the coefficient **left after collecting** whose sign decides the flip.',
              ),
              maths('\\begin{gathered} 2x + 5 < 5x - 7 \\\\ -3x < -12 \\\\ x > 4 \\end{gathered}'),
              prose(
                'The greatest whole number below a bound is found from the solved form. $x < \\frac{13}{3}$ allows $4$ but not $5$; $x < 5$ also allows $4$, while $x \\le 5$ allows $5$ itself.',
              ),
            ),
            ask('ineq-linear-steps', 2),
            askWith('ineq-greatest-integer+choice', 'Watch which way the sign points once it is solved.', 2),
          ],
          skillCheck: [ask('ineq-linear-line', 2), ask('ineq-linear-steps', 2), ask('ineq-greatest-integer', 2)],
        },
        {
          id: 'im-l1-combined',
          title: 'And, Or and Double Inequalities',
          slides: [
            teach(
              prose(
                'Two inequalities can be joined. **And** keeps only the numbers that pass both: the overlap. **Or** keeps every number that passes either one.',
              ),
              line(-4, 6, [piece(-1, 3, false, true)], 'x greater than -1 and x at most 3: one interval'),
              prose('$x > -1$ and $x \\le 3$ overlap between $-1$ and $3$, so the answer is one interval.'),
              line(-4, 6, [piece(-Infinity, -1, false, false), piece(3, Infinity, false, true)], 'x less than -1 or x at least 3: two rays'),
              prose('$x < -1$ or $x \\ge 3$ is two rays pointing apart, with the gap between them left unshaded.'),
            ),
            ask('ineq-andor-line'),
            ask('ineq-double-tiles'),
            ask('ineq-combine-flow'),
            teach(
              prose(
                'A **double inequality** is an "and" written in one line: $-3 < 2x + 1 \\le 7$ says $2x + 1$ is above $-3$ **and** at most $7$. Solve it by doing the same thing to all three parts at once.',
              ),
              maths('\\begin{gathered} -3 < 2x + 1 \\le 7 \\\\ -4 < 2x \\le 6 \\\\ -2 < x \\le 3 \\end{gathered}'),
              prose(
                'Divide by a negative and **both** signs turn round, so rewrite it with the smaller number on the left: $-6 \\le -2x < 4$ gives $3 \\ge x > -2$, which is $-2 < x \\le 3$.',
              ),
            ),
            ask('ineq-or-tiles'),
            ask('ineq-double-line'),
            ask('ineq-combine-flow', 2),
            teach(
              prose(
                'Two rays pointing the **same** way behave differently. $x > 1$ and $x > 4$ is just $x > 4$, the stricter one. $x > 1$ or $x > 4$ is just $x > 1$, the wider one.',
              ),
              prose(
                'And two rays can fail to meet at all: $x < 1$ and $x > 4$ has no solution, while $x > 1$ or $x < 4$ is every real number.',
              ),
            ),
            ask('ineq-andor-line', 2),
            ask('ineq-or-tiles', 2),
          ],
          skillCheck: [ask('ineq-andor-line', 2), ask('ineq-or-tiles', 2), ask('ineq-double-tiles', 2)],
        },
        {
          id: 'im-l1-quadratic',
          title: 'Critical Values That Are Not Whole',
          slides: [
            teach(
              prose(
                'Quadratic inequalities that factorise are in the Quadratics course: find the roots, the **critical values**, then read off whether the answer is between them or outside them.',
              ),
              graph([{ f: (x) => x * x - 4 * x + 1, accent: true }], { xMin: -2, xMax: 6, yMin: -4, yMax: 8 }, 'y = x^2 - 4x + 1 dipping below the axis between its two roots'),
              prose(
                'A U-shaped curve is below the axis **between** its critical values and above it **outside** them. That does not change when the critical values are not whole numbers; only finding them does.',
              ),
              prose(
                'Completing the square finds them either way. $x^2 - 4x - 5 < 0$ is $(x - 2)^2 < 9$, so $x - 2$ is within $3$ of zero: $-1 < x < 5$.',
              ),
            ),
            ask('ineq-square-line'),
            ask('ineq-surd-set'),
            ask('ineq-method-flow'),
            teach(
              prose('When $b^2 - 4ac$ is positive but not a square number, the quadratic does not factorise and the critical values are surds.'),
              maths('\\begin{gathered} x^2 - 4x + 1 < 0 \\\\ (x - 2)^2 < 3 \\\\ 2 - \\sqrt{3} < x < 2 + \\sqrt{3} \\end{gathered}'),
              prose(
                'The two critical values are always the same distance either side of the line of symmetry $x = -\\frac{b}{2a}$, here $x = 2$. If $b^2 - 4ac$ is negative there are none: the curve is wholly above or below the axis.',
              ),
            ),
            ask('ineq-centre-slider'),
            ask('ineq-critical-tiles'),
            ask('ineq-square-line', 2),
            teach(
              prose(
                'Rearrange first when the inequality is not against $0$, and make the $x^2$ term positive, turning the sign round if you multiply by $-1$.',
              ),
              maths('\\begin{gathered} 3 - x^2 + 2x \\ge 0 \\\\ x^2 - 2x - 3 \\le 0 \\\\ -1 \\le x \\le 3 \\end{gathered}'),
            ),
            ask('ineq-surd-set', 2),
            ask('ineq-method-flow', 2),
          ],
          skillCheck: [ask('ineq-square-line', 2), ask('ineq-surd-set', 2), ask('ineq-critical-tiles', 2)],
        },
        {
          id: 'im-l1-rational',
          title: 'Rational Inequalities',
          slides: [
            teach(
              prose(
                'An inequality with $x$ in a denominator, like $\\frac{x - 1}{x - 4} > 0$, is a **rational inequality**. The tempting move is to multiply through by $x - 4$, and it is wrong.',
              ),
              prose(
                'Multiplying by $x - 4$ turns the sign round wherever $x - 4$ is negative and not where it is positive. There is no single answer to "does it flip?", so do not multiply through at all.',
              ),
              prose(
                'Instead, find the **critical values**: where the top is zero, and where the bottom is zero. They split the line into regions, and the fraction keeps one sign across each region.',
              ),
            ),
            ask('ineq-sign-flow'),
            ask('ineq-test-tree'),
            ask('ineq-excluded-pole'),
            teach(
              prose(
                'A **sign table** tests one value in each region. For $f(x) = \\frac{x - 1}{x - 4}$, the critical values are $1$ and $4$.',
              ),
              maths(
                '\\begin{array}{c|cc|c} & x{-}1 & x{-}4 & f \\\\ \\hline x{<}1 & - & - & + \\\\ 1{<}x{<}4 & + & - & - \\\\ x{>}4 & + & + & + \\end{array}',
              ),
              prose('So $\\frac{x - 1}{x - 4} > 0$ for $x < 1$ or $x > 4$.'),
              line(-2, 7, [piece(-Infinity, 1, false, false), piece(4, Infinity, false, false)], 'x less than 1 or x greater than 4'),
            ),
            ask('ineq-rational-line'),
            ask('ineq-sign-flow', 2),
            ask('ineq-test-tree', 2),
            teach(
              prose(
                'The bottom being zero is different from the top being zero. At $x = 4$ the fraction has **no value**, so $4$ is never in the set, even with $\\ge$: its dot is always hollow.',
              ),
              maths('\\begin{gathered} \\frac{x - 1}{x - 4} \\ge 0 \\\\ \\iff x \\le 1 \\text{ or } x > 4 \\end{gathered}'),
              prose('The top being zero makes the fraction $0$, which $\\ge 0$ includes, so $1$ gets a filled dot.'),
            ),
            ask('ineq-rational-line', 2),
            ask('ineq-excluded-pole', 2),
          ],
          skillCheck: [ask('ineq-rational-line', 2), ask('ineq-sign-flow', 2), ask('ineq-excluded-pole', 2)],
        },
        {
          id: 'im-l1-notation',
          title: 'Writing Solution Sets',
          slides: [
            teach(
              prose(
                'A solution set can be written three ways. As inequalities, $-2 < x \\le 5$. In **interval notation**, $(-2, 5]$. In **set notation**, $\\{x : -2 < x \\le 5\\}$.',
              ),
              prose(
                'In interval notation a **square** bracket means the end is included, a **round** one that it is not, the same as filled and hollow dots.',
              ),
              line(-4, 7, [piece(-2, 5, false, true)], 'The interval from -2, left out, to 5, included'),
              prose('Beside $\\infty$ the bracket is always round, since infinity is never reached: $x \\ge 3$ is $[3, \\infty)$.'),
            ),
            ask('ineq-interval-tiles'),
            ask('ineq-read-region'),
            ask('ineq-bracket-flow'),
            teach(
              prose(
                'A set in two pieces is joined with $\\cup$, "union", the notation for "or".',
              ),
              maths('\\begin{gathered} x < -1 \\text{ or } x \\ge 4 \\\\ \\text{is} \\quad (-\\infty, -1) \\cup [4, \\infty) \\end{gathered}'),
              prose(
                'In set notation that is $\\{x : x < -1\\} \\cup \\{x : x \\ge 4\\}$.',
              ),
            ),
            ask('ineq-interval-line'),
            ask('ineq-integers-count'),
            ask('ineq-interval-tiles', 2),
            teach(
              prose(
                'Counting whole-number solutions needs the ends exactly. $-3 < 2x + 1 \\le 8$ gives $-2 < x \\le 3.5$, so the whole numbers are $-1, 0, 1, 2, 3$: five of them.',
              ),
              prose('A bound that is not whole is never itself a solution, so the strictness only matters when the bound is whole.'),
            ),
            ask('ineq-read-region', 2),
            askWith('ineq-integers-count+choice', 'Solve first, then count.', 2),
          ],
          skillCheck: [ask('ineq-interval-tiles', 2), ask('ineq-read-region', 2), ask('ineq-interval-line', 2)],
        },
      ],
      levelCheck: [
        ask('ineq-linear-line', 2),
        ask('ineq-read-line', 2),
        ask('ineq-greatest-integer', 2),
        ask('ineq-andor-line', 2),
        ask('ineq-double-tiles', 2),
        ask('ineq-combine-flow', 2),
        ask('ineq-square-line', 2),
        ask('ineq-surd-set', 2),
        ask('ineq-critical-tiles', 2),
        ask('ineq-rational-line', 2),
        ask('ineq-sign-flow', 2),
        ask('ineq-excluded-pole', 2),
        ask('ineq-interval-tiles', 2),
        ask('ineq-read-region', 2),
        ask('ineq-integers-count', 2),
      ],
    },
    {
      id: 'im-l2',
      title: 'The Modulus Function',
      lessons: [
        {
          id: 'im-l2-distance',
          title: 'The Modulus as a Distance',
          slides: [
            teach(
              prose(
                'The **modulus** of a number, written $\\lvert x \\rvert$, is its distance from zero. Distance is never negative, so the modulus drops any minus sign.',
              ),
              maths('\\lvert 5 \\rvert = 5 \\qquad \\lvert -5 \\rvert = 5'),
              prose(
                'Work inside the bars first, then take the modulus: $\\lvert 3 - 8 \\rvert = \\lvert -5 \\rvert = 5$, which is not the same as $\\lvert 3 \\rvert - \\lvert 8 \\rvert = -5$.',
              ),
            ),
            ask('mod-evaluate'),
            ask('mod-as-distance'),
            ask('mod-distance-line'),
            teach(
              prose(
                '$\\lvert x - a \\rvert$ is the distance between $x$ and $a$. So $\\lvert x - 2 \\rvert = 3$ asks for the numbers exactly $3$ away from $2$: $x = 5$ or $x = -1$.',
              ),
              line(-3, 6, [piece(-1, -1, true, true), piece(5, 5, true, true)], 'The two points -1 and 5, each 3 away from 2'),
              prose(
                'Watch the sign: $\\lvert x + 4 \\rvert$ is $\\lvert x - (-4) \\rvert$, the distance from $-4$.',
              ),
            ),
            ask('mod-points-tiles'),
            ask('mod-evaluate-tree'),
            ask('mod-distance-line', 2),
            teach(
              prose(
                '$\\lvert x - 2 \\rvert < 3$ is every $x$ **within** $3$ of $2$: one interval. $\\lvert x - 2 \\rvert > 3$ is every $x$ **further** than $3$ away: two rays pointing apart.',
              ),
              line(-3, 7, [piece(-1, 5, false, false)], 'Within 3 of 2: between -1 and 5'),
              prose('$\\lvert 2 - x \\rvert$ is the same distance as $\\lvert x - 2 \\rvert$.'),
            ),
            ask('mod-as-distance', 2),
            ask('mod-points-tiles', 2),
          ],
          skillCheck: [ask('mod-evaluate', 2), ask('mod-distance-line', 2), ask('mod-points-tiles', 2)],
        },
        {
          id: 'im-l2-graphs',
          title: 'The Graph of y = |ax + b|',
          slides: [
            teach(
              prose(
                'To draw $y = \\lvert 2x - 4 \\rvert$, start from the straight line $y = 2x - 4$. Wherever it is below the axis, reflect it up. The modulus keeps every height and drops the sign.',
              ),
              graph(
                [
                  { f: (x) => 2 * x - 4, dashed: true },
                  { f: (x) => Math.abs(2 * x - 4), accent: true },
                ],
                { xMin: -2, xMax: 6, yMin: -5, yMax: 8 },
                'The line y = 2x - 4, dashed, and the V of y = |2x - 4| reflected up from it',
                [{ x: 2, y: 0 }],
              ),
              prose('The result is a V. It turns where the inside is zero: $2x - 4 = 0$, at $x = 2$.'),
            ),
            ask('mod-vertex-slider'),
            ask('mod-match-graph'),
            ask('mod-intercepts-tiles'),
            teach(
              prose(
                'Where it meets the axes: the $x$-axis only at the vertex, $\\left(-\\frac{b}{a}, 0\\right)$, and the $y$-axis at $\\lvert b \\rvert$, since at $x = 0$ the inside is $b$.',
              ),
              prose(
                'The two arms are straight lines. The right arm has the line\'s steepness, gradient $\\lvert a \\rvert$; the left arm is its reflection, gradient $-\\lvert a \\rvert$.',
              ),
              prose('For $y = \\lvert 2x - 4 \\rvert$ the right arm has gradient $2$ and the left arm $-2$.'),
            ),
            ask('mod-arm-gradient'),
            ask('mod-vertex-slider', 2),
            ask('mod-match-graph', 2),
            teach(
              prose(
                'A number outside the bars moves the whole V: $y = \\lvert 2x - 4 \\rvert + 1$ has its vertex at $(2, 1)$. A minus in front turns it upside down: $y = -\\lvert 2x - 4 \\rvert$ is an upside-down V with its vertex still at $(2, 0)$.',
              ),
              prose(
                'And a number in front scales both arms: $y = 3\\lvert x - 1 \\rvert$ has arms of gradient $3$ and $-3$.',
              ),
            ),
            ask('mod-intercepts-tiles', 2),
            askWith('mod-arm-gradient+choice', 'Which arm, and is there anything in front of the bars?', 2),
          ],
          skillCheck: [ask('mod-vertex-slider', 2), ask('mod-match-graph', 2), ask('mod-arm-gradient', 2)],
        },
        {
          id: 'im-l2-equations',
          title: 'Solving Modulus Equations',
          slides: [
            teach(
              prose(
                '$\\lvert 2x - 3 \\rvert = 7$ says the inside is $7$ away from zero, so it is $7$ or $-7$. That splits into two ordinary equations.',
              ),
              maths('\\begin{aligned} 2x - 3 = 7 &\\quad\\Rightarrow\\quad x = 5 \\\\ 2x - 3 = -7 &\\quad\\Rightarrow\\quad x = -2 \\end{aligned}'),
              prose('Get the modulus alone first: $\\lvert 2x - 3 \\rvert + 4 = 11$ is $\\lvert 2x - 3 \\rvert = 7$.'),
            ),
            ask('mod-linear-roots'),
            ask('mod-cases-steps'),
            ask('mod-reject-flow'),
            teach(
              prose(
                'When the right-hand side has $x$ in it too, the cases still work: $\\lvert x - 1 \\rvert = 2x + 5$ gives $x - 1 = 2x + 5$ or $x - 1 = -(2x + 5)$. The bracket matters: the minus goes on **every** term.',
              ),
              prose(
                'But a case can produce a root that does not solve the original equation. The first case gives $x = -6$, where the right-hand side is $2(-6) + 5 = -7$, and a modulus can never be negative.',
              ),
              prose('The second case gives $x = -\\frac{4}{3}$, where both sides are $\\frac{7}{3}$. **Always check each root.**'),
            ),
            ask('mod-equation-root'),
            ask('mod-linear-roots', 2),
            ask('mod-reject-flow', 2),
            teach(
              prose(
                'On a graph the check is visible. The solutions are where the line $y = dx + e$ meets the V, and the V is never below the axis. A root found where the line is below the axis is a meeting with the part of $y = ax + b$ that was reflected away.',
              ),
              graph(
                [
                  { f: (x) => Math.abs(x - 1), accent: true },
                  { f: (x) => 2 * x + 5 },
                ],
                { xMin: -7, xMax: 4, yMin: -8, yMax: 9 },
                'The V of y = |x - 1| and the line y = 2x + 5, meeting once',
                [{ x: -4 / 3, y: 7 / 3 }],
              ),
            ),
            ask('mod-cases-steps', 2),
            askWith('mod-equation-root+choice', 'Two cases, two roots: which one survives the check?', 2),
          ],
          skillCheck: [ask('mod-linear-roots', 2), ask('mod-equation-root', 2), ask('mod-reject-flow', 2)],
        },
        {
          id: 'im-l2-inequalities',
          title: 'Modulus Inequalities',
          slides: [
            teach(
              prose(
                'A modulus inequality compares a distance with a bound, so it splits the same way the distance lesson did.',
              ),
              maths('\\begin{aligned} \\lvert u \\rvert < c &\\iff -c < u < c \\\\ \\lvert u \\rvert > c &\\iff u < -c \\\\ & \\quad \\text{or } u > c \\end{aligned}'),
              prose(
                'Less than: the inside is close to zero, one interval. Greater than: the inside is far from zero on either side, two rays. If $c$ is negative, "less than" has no solutions and "greater than" is every number.',
              ),
            ),
            ask('mod-ineq-shape-flow'),
            ask('mod-ineq-split'),
            ask('mod-ineq-line'),
            teach(
              prose('With a coefficient on $x$, split first and then solve the double inequality.'),
              maths('\\begin{gathered} \\lvert 2x - 3 \\rvert \\le 5 \\\\ -5 \\le 2x - 3 \\le 5 \\\\ -2 \\le 2x \\le 8 \\\\ -1 \\le x \\le 4 \\end{gathered}'),
              line(-3, 6, [piece(-1, 4, true, true)], 'From -1 to 4, both ends included'),
            ),
            ask('mod-ineq-tiles'),
            ask('mod-ineq-line', 2),
            ask('mod-ineq-count'),
            teach(
              prose(
                'The graph says the same thing. $\\lvert 2x - 3 \\rvert \\le 5$ is where the V is at or below the line $y = 5$: between the two places they meet.',
              ),
              graph(
                [{ f: (x) => Math.abs(2 * x - 3), accent: true }, { f: () => 5, dashed: true }],
                { xMin: -3, xMax: 6, yMin: -1, yMax: 9 },
                'The V of y = |2x - 3| under the line y = 5 between x = -1 and x = 4',
                [
                  { x: -1, y: 5 },
                  { x: 4, y: 5 },
                ],
              ),
            ),
            ask('mod-ineq-split', 2),
            ask('mod-ineq-tiles', 2),
          ],
          skillCheck: [ask('mod-ineq-line', 2), ask('mod-ineq-tiles', 2), ask('mod-ineq-split', 2)],
        },
        {
          id: 'im-l2-transform',
          title: 'Transforming Modulus Graphs',
          slides: [
            teach(
              prose(
                'Every graph in this level is $y = \\lvert x \\rvert$ moved and stretched. In $y = \\lvert x - h \\rvert + k$ the vertex moves from the origin to $(h, k)$.',
              ),
              graph(
                [
                  { f: (x) => Math.abs(x), dashed: true },
                  { f: (x) => Math.abs(x - 2) + 1, accent: true },
                ],
                { xMin: -4, xMax: 6, yMin: -1, yMax: 6 },
                'y = |x|, dashed, and y = |x - 2| + 1 with its vertex at (2, 1)',
                [{ x: 2, y: 1 }],
              ),
              prose(
                'Inside the bars works the opposite way to how it reads: $x - 2$ moves the graph **right** by $2$. Outside works the way it reads: $+ 1$ moves it **up** by $1$.',
              ),
            ),
            ask('mod-shift-slider'),
            ask('mod-transform-match'),
            ask('mod-transform-flow'),
            teach(
              prose(
                'A number in front of the bars stretches the graph vertically: $y = 2\\lvert x \\rvert$ is twice as steep. A negative one reflects it in the $x$-axis, so $y = -\\lvert x \\rvert$ is an upside-down V.',
              ),
              graph(
                [
                  { f: (x) => Math.abs(x), dashed: true },
                  { f: (x) => -2 * Math.abs(x + 1) + 3, accent: true },
                ],
                { xMin: -5, xMax: 4, yMin: -4, yMax: 5 },
                'y = |x|, dashed, and y = -2|x + 1| + 3, an upside-down V with its vertex at (-1, 3)',
                [{ x: -1, y: 3 }],
              ),
              prose(
                '$y = -2\\lvert x + 1 \\rvert + 3$: stretch by $2$, reflect, move left $1$ and up $3$. The vertex is at $(-1, 3)$, and the stretch never moves it.',
              ),
            ),
            ask('mod-transform-tiles'),
            ask('mod-shift-slider', 2),
            ask('mod-transform-match', 2),
            teach(
              prose(
                'Order matters when you write the equation: stretch or reflect first, then translate. Written out, the stretch multiplies the modulus and the translation adds after it.',
              ),
              maths('\\begin{aligned} & y = \\lvert x \\rvert \\\\ \\to \\quad & y = -2\\lvert x \\rvert \\\\ \\to \\quad & y = -2\\lvert x + 1 \\rvert + 3 \\end{aligned}'),
            ),
            ask('mod-transform-flow', 2),
            ask('mod-transform-tiles', 2),
          ],
          skillCheck: [ask('mod-shift-slider', 2), ask('mod-transform-match', 2), ask('mod-transform-tiles', 2)],
        },
      ],
      levelCheck: [
        ask('mod-evaluate', 2),
        ask('mod-distance-line', 2),
        ask('mod-points-tiles', 2),
        ask('mod-vertex-slider', 2),
        ask('mod-match-graph', 2),
        ask('mod-arm-gradient', 2),
        ask('mod-linear-roots', 2),
        ask('mod-equation-root', 2),
        ask('mod-reject-flow', 2),
        ask('mod-ineq-line', 2),
        ask('mod-ineq-tiles', 2),
        ask('mod-ineq-split', 2),
        ask('mod-shift-slider', 2),
        ask('mod-transform-match', 2),
        ask('mod-transform-tiles', 2),
      ],
    },
    {
      id: 'im-l3',
      title: 'Modulus on Both Sides and Squaring',
      lessons: [
        {
          id: 'im-l3-equal',
          title: 'Two Moduli Equal',
          slides: [
            teach(
              prose(
                '$\\lvert 2x + 1 \\rvert = \\lvert x - 4 \\rvert$ says two distances from zero are equal. That happens when the insides are equal, or when they are opposite.',
              ),
              prose('Equal: $2x + 1 = x - 4$, so $x = -5$. Opposite: $2x + 1 = -(x - 4)$, which is $2x + 1 = -x + 4$, so $x = 1$.'),
              prose('Check: at $x = -5$ both sides are $9$, and at $x = 1$ both are $3$.'),
            ),
            ask('mod-both-cases'),
            ask('mod-both-negative-steps'),
            ask('mod-both-root'),
            teach(
              prose(
                'In The Modulus Function, $\\lvert x - 1 \\rvert = 2x + 5$ gave a root that failed, because the right-hand side could be negative there.',
              ),
              prose(
                'With bars on **both** sides that cannot happen. Both sides are distances, so neither is ever negative, and every root the two cases give is a solution.',
              ),
            ),
            ask('mod-both-flow'),
            ask('mod-both-cases', 2),
            ask('mod-both-negative-steps', 2),
            teach(
              prose(
                'The opposite case is where slips happen. In $\\lvert 3x - 2 \\rvert = \\lvert x + 6 \\rvert$ it is $3x - 2 = -(x + 6)$, which is $3x - 2 = -x - 6$: the minus reaches **both** terms.',
              ),
              maths('4x = -4 \\quad\\Rightarrow\\quad x = -1'),
              prose('The equal case, $3x - 2 = x + 6$, gives $x = 4$. At $x = -1$ both sides are $5$; at $x = 4$ both are $10$.'),
            ),
            ask('mod-both-flow', 2),
            askWith('mod-both-root+choice', 'Both cases, then pick the one asked for.', 2),
          ],
          skillCheck: [ask('mod-both-cases', 2), ask('mod-both-root', 2), ask('mod-both-negative-steps', 2)],
        },
        {
          id: 'im-l3-squaring',
          title: 'Squaring Both Sides',
          slides: [
            teach(
              prose(
                'Both sides of $\\lvert u \\rvert = \\lvert v \\rvert$ are never negative, and for numbers that are not negative, squaring keeps equal things equal and unequal things unequal. So it holds exactly when $u^2 = v^2$.',
              ),
              maths('u^2 - v^2 = (u - v)(u + v) = 0'),
              prose(
                'For $\\lvert 2x + 1 \\rvert = \\lvert x - 4 \\rvert$: the difference is $x + 5$ and the sum $3x - 3$, so $(x + 5)(3x - 3) = 0$. That is $x = -5$ or $x = 1$, with no cases.',
              ),
            ),
            ask('mod-square-factor'),
            ask('mod-square-tree'),
            ask('mod-expand-steps'),
            teach(
              prose('Multiplying the squares out works too, and lands on the same roots with more arithmetic. $(2x + 1)^2 = (x - 4)^2$ becomes'),
              maths('\\begin{aligned} & 4x^2 + 4x + 1 \\\\ & \\quad = x^2 - 8x + 16 \\\\ & 3x^2 + 12x - 15 = 0 \\\\ & (x + 5)(x - 1) = 0 \\end{aligned}'),
              prose('Watch the middle terms: $(x - 4)^2$ has $-8x$ in it. Forgetting it is the usual slip.'),
            ),
            ask('mod-square-root'),
            ask('mod-square-factor', 2),
            ask('mod-square-tree', 2),
            teach(
              prose(
                'Squares can come in disguise. $4(x + 1)^2$ is $(2x + 2)^2$, since $4 = 2^2$, so $4(x + 1)^2 = (x - 5)^2$ is $\\lvert 2x + 2 \\rvert = \\lvert x - 5 \\rvert$.',
              ),
              prose('The difference is $x + 7$ and the sum $3x - 3$, so $x = -7$ or $x = 1$.'),
            ),
            ask('mod-expand-steps', 2),
            askWith('mod-square-root+choice', 'Two squares equal: the things squared are equal or opposite.', 2),
          ],
          skillCheck: [ask('mod-square-factor', 2), ask('mod-square-tree', 2), ask('mod-square-root', 2)],
        },
        {
          id: 'im-l3-graphs',
          title: 'Two Vs on One Graph',
          slides: [
            teach(
              prose(
                'The solutions of $\\lvert 2x + 1 \\rvert = \\lvert x - 4 \\rvert$ are where the two Vs cross. Each crossing is at the same height on both graphs.',
              ),
              graph(
                [
                  { f: (x) => Math.abs(2 * x + 1), accent: true },
                  { f: (x) => Math.abs(x - 4), dashed: true },
                ],
                { xMin: -7, xMax: 6, yMin: -1, yMax: 12 },
                'The Vs of y = |2x + 1| and y = |x - 4| crossing at (-5, 9) and (1, 3)',
                [
                  { x: -5, y: 9 },
                  { x: 1, y: 3 },
                ],
              ),
              prose('They cross at $(-5, 9)$ and $(1, 3)$. Arms of different steepness always cross twice.'),
            ),
            ask('mod-cross-slider'),
            ask('mod-cross-points'),
            ask('mod-cross-count'),
            teach(
              prose(
                'Equally steep arms are different. In $\\lvert x - 1 \\rvert = \\lvert x + 3 \\rvert$ the equal case, $x - 1 = x + 3$, loses its $x$ and says $-1 = 3$, which is false.',
              ),
              graph(
                [
                  { f: (x) => Math.abs(x - 1), accent: true },
                  { f: (x) => Math.abs(x + 3), dashed: true },
                ],
                { xMin: -6, xMax: 5, yMin: -1, yMax: 7 },
                'The Vs of y = |x - 1| and y = |x + 3|, with parallel arms, crossing once at (-1, 2)',
                [{ x: -1, y: 2 }],
              ),
              prose('Only the opposite case gives a root, $x - 1 = -x - 3$, so $x = -1$: the parallel arms meet once.'),
            ),
            ask('mod-cross-flow'),
            ask('mod-cross-slider', 2),
            ask('mod-cross-points', 2),
            teach(
              prose(
                'One more way to meet once: a shared vertex. $\\lvert 2x - 4 \\rvert$ and $\\lvert x - 2 \\rvert$ are both zero at $x = 2$, and either side of it the steeper V is above, so they only touch there.',
              ),
              graph(
                [
                  { f: (x) => Math.abs(2 * x - 4), accent: true },
                  { f: (x) => Math.abs(x - 2), dashed: true },
                ],
                { xMin: -2, xMax: 6, yMin: -1, yMax: 7 },
                'The Vs of y = |2x - 4| and y = |x - 2| sharing their vertex at (2, 0)',
                [{ x: 2, y: 0 }],
              ),
            ),
            ask('mod-cross-count', 2),
            ask('mod-cross-flow', 2),
          ],
          skillCheck: [ask('mod-cross-slider', 2), ask('mod-cross-points', 2), ask('mod-cross-count', 2)],
        },
        {
          id: 'im-l3-inequalities',
          title: 'Inequalities with Two Moduli',
          slides: [
            teach(
              prose(
                'Squaring keeps an inequality the right way round when both sides are never negative. So $\\lvert u \\rvert < \\lvert v \\rvert$ exactly when $u^2 - v^2 < 0$, that is $(u - v)(u + v) < 0$.',
              ),
              maths('\\begin{gathered} \\lvert 2x + 1 \\rvert < \\lvert x - 4 \\rvert \\\\ (x + 5)(3x - 3) < 0 \\\\ -5 < x < 1 \\end{gathered}'),
              line(-7, 3, [piece(-5, 1, false, false)], 'Between -5 and 1, both ends left out'),
            ),
            ask('mod-both-ineq-line'),
            ask('mod-test-tree'),
            ask('mod-ends-tiles'),
            teach(
              prose(
                'Whether the set is between the roots or outside them can be read off the graph. The steeper V is below the flatter one between the crossings, and above it outside them.',
              ),
              graph(
                [
                  { f: (x) => Math.abs(2 * x + 1), accent: true },
                  { f: (x) => Math.abs(x - 4), dashed: true },
                ],
                { xMin: -7, xMax: 6, yMin: -1, yMax: 12 },
                'The steeper V of y = |2x + 1| is below y = |x - 4| between x = -5 and x = 1',
                [
                  { x: -5, y: 9 },
                  { x: 1, y: 3 },
                ],
              ),
              prose(
                'So less than with the steeper V on the left is between; with it on the right, outside. Greater than turns both round: $\\lvert 2x + 1 \\rvert > \\lvert x - 4 \\rvert$ is $x < -5$ or $x > 1$.',
              ),
            ),
            ask('mod-region-flow'),
            ask('mod-both-ineq-line', 2),
            ask('mod-test-tree', 2),
            teach(
              prose(
                'With $\\le$ or $\\ge$ the critical values are solutions too, since both sides are equal there: filled dots.',
              ),
              prose(
                'If in doubt, test a point. At $x = 0$, $\\lvert 1 \\rvert < \\lvert -4 \\rvert$, so $0$ is in the set of $\\lvert 2x + 1 \\rvert < \\lvert x - 4 \\rvert$, and so is the whole stretch between the roots.',
              ),
            ),
            ask('mod-ends-tiles', 2),
            ask('mod-region-flow', 2),
          ],
          skillCheck: [ask('mod-both-ineq-line', 2), ask('mod-ends-tiles', 2), ask('mod-region-flow', 2)],
        },
        {
          id: 'im-l3-safe',
          title: 'When Squaring is Safe',
          slides: [
            teach(
              prose(
                'Squaring both sides is safe when neither side can be negative. A modulus never is, and nor is a positive number, so $\\lvert u \\rvert = \\lvert v \\rvert$, $\\lvert u \\rvert < \\lvert v \\rvert$ and $\\lvert u \\rvert < 5$ can all be squared.',
              ),
              maths('\\begin{gathered} \\lvert x - 3 \\rvert < 5 \\\\ (x - 3)^2 < 25 \\end{gathered}'),
              prose('When one side can be negative, squaring throws its sign away, and with it the thing that ruled a root out.'),
            ),
            ask('mod-safe-flow'),
            ask('mod-safe-choice'),
            ask('mod-false-root'),
            teach(
              prose(
                'Square $\\lvert x - 1 \\rvert = 2x + 5$ from The Modulus Function and factorise the difference of two squares:',
              ),
              maths('\\begin{gathered} (x - 1)^2 = (2x + 5)^2 \\\\ (-x - 6)(3x + 4) = 0 \\\\ x = -6 \\text{ or } x = -\\tfrac{4}{3} \\end{gathered}'),
              prose(
                'At $x = -6$ the right-hand side is $-7$, so it is rejected: the same root the two cases rejected. Squaring is quicker, but the check is still needed.',
              ),
            ),
            ask('mod-square-check-steps'),
            ask('mod-safe-flow', 2),
            ask('mod-safe-choice', 2),
            teach(
              prose(
                'A negative right-hand side is the extreme case. $\\lvert x + 2 \\rvert = -3$ has no solutions at all, since a modulus is never $-3$.',
              ),
              prose(
                'Yet squaring gives $(x + 2)^2 = 9$, so $x = 1$ or $x = -5$, and both fail. Whenever the right-hand side could be negative, **check every root in the original**.',
              ),
            ),
            ask('mod-false-root', 2),
            ask('mod-square-check-steps', 2),
          ],
          skillCheck: [ask('mod-safe-choice', 2), ask('mod-false-root', 2), ask('mod-square-check-steps', 2)],
        },
      ],
      levelCheck: [
        ask('mod-both-cases', 2),
        ask('mod-both-root', 2),
        ask('mod-both-flow', 2),
        ask('mod-square-factor', 2),
        ask('mod-square-tree', 2),
        ask('mod-square-root', 2),
        ask('mod-cross-slider', 2),
        ask('mod-cross-count', 2),
        ask('mod-both-ineq-line', 2),
        ask('mod-ends-tiles', 2),
        ask('mod-region-flow', 2),
        ask('mod-test-tree', 2),
        ask('mod-safe-choice', 2),
        ask('mod-false-root', 2),
        ask('mod-square-check-steps', 2),
      ],
    },
    {
      id: 'im-l4',
      title: 'Modulus of Quadratics',
      lessons: [
        {
          id: 'im-l4-abs-quad',
          title: 'Reflecting a Quadratic',
          slides: [
            teach(
              prose(
                '$y = \\lvert f(x) \\rvert$ keeps every point of $y = f(x)$ on or above the $x$-axis and reflects every point below it: the height becomes the distance from the axis. Sketching the quadratic itself is in Quadratics, The Turning Point and Roots on the Graph.',
              ),
              graph(
                [
                  { f: (x) => x * x - 2 * x - 3, dashed: true },
                  { f: (x) => Math.abs(x * x - 2 * x - 3), accent: true },
                ],
                { xMin: -3, xMax: 5, yMin: -5, yMax: 7 },
                'The dashed parabola y = x squared - 2x - 3 and its modulus, with the dip between -1 and 3 reflected up to a vertex at (1, 4)',
                [
                  { x: -1, y: 0 },
                  { x: 3, y: 0 },
                  { x: 1, y: 4 },
                ],
              ),
              prose(
                'For $y = \\lvert x^2 - 2x - 3 \\rvert$ the roots $x = -1$ and $x = 3$ stay put, and the dip between them flips up: the vertex $(1, -4)$ becomes $(1, 4)$.',
              ),
            ),
            ask('mod-abs-quad-match'),
            ask('mod-abs-vertex-slider'),
            ask('mod-abs-values-tree'),
            teach(
              prose(
                'Point by point, the modulus just makes the value positive. At $x = 0$, $f(0) = -3$, so $y = \\lvert f(x) \\rvert$ is at $3$; at $x = 4$, $f(4) = 5$ and it stays $5$.',
              ),
              graph(
                [
                  { f: (x) => 4 - x * x, dashed: true },
                  { f: (x) => Math.abs(4 - x * x), accent: true },
                ],
                { xMin: -4, xMax: 4, yMin: -6, yMax: 7 },
                'The dashed upside-down parabola y = 4 - x squared and its modulus, with both arms beyond -2 and 2 reflected up',
                [
                  { x: -2, y: 0 },
                  { x: 2, y: 0 },
                ],
              ),
              prose(
                'Which part flips depends on the curve. A U through the axis flips its dip; an upside-down U through the axis, like $4 - x^2$, flips both arms; a curve that never goes below the axis does not change.',
              ),
            ),
            ask('mod-abs-sketch-flow'),
            ask('mod-abs-quad-match', 2),
            ask('mod-abs-vertex-slider', 2),
            teach(
              prose('A curve that is below the axis everywhere is reflected whole, so its modulus is $-f(x)$:'),
              maths('\\lvert -x^2 - 2 \\rvert = x^2 + 2'),
              prose(
                'Written out in full, complete the square to find the vertex first. $x^2 - 6x + 5 = (x - 3)^2 - 4$, so the vertex $(3, -4)$ is below the axis and $y = \\lvert x^2 - 6x + 5 \\rvert$ has its vertex at $(3, 4)$.',
              ),
            ),
            ask('mod-abs-values-tree', 2),
            ask('mod-abs-sketch-flow', 2),
          ],
          skillCheck: [ask('mod-abs-vertex-slider', 2), ask('mod-abs-values-tree', 2), ask('mod-abs-sketch-flow', 2)],
        },
        {
          id: 'im-l4-f-abs',
          title: 'Mirroring the Right Half',
          slides: [
            teach(
              prose(
                '$y = f(\\lvert x \\rvert)$ works on the input instead. Where $x \\ge 0$, $\\lvert x \\rvert = x$, so the right half is $y = f(x)$ unchanged. Where $x < 0$, it is $f(-x)$: the right half reflected in the $y$-axis, as in Functions & Transformations, Reflections.',
              ),
              graph(
                [
                  { f: (x) => x * x - 4 * x + 3, dashed: true },
                  { f: (x) => x * x - 4 * Math.abs(x) + 3, accent: true },
                ],
                { xMin: -5, xMax: 5, yMin: -2, yMax: 8 },
                'The dashed parabola y = x squared - 4x + 3 and the graph of f of |x|, its right half mirrored, crossing the axis at -3, -1, 1 and 3',
                [
                  { x: -3, y: 0 },
                  { x: -1, y: 0 },
                  { x: 1, y: 0 },
                  { x: 3, y: 0 },
                ],
              ),
              prose('The left half of the original is thrown away, and the graph is always symmetric about the $y$-axis.'),
            ),
            ask('mod-fabs-match'),
            ask('mod-fabs-arm-tiles'),
            ask('mod-inside-out-tree'),
            teach(
              prose(
                'Written out, $\\lvert x \\rvert$ goes where $x$ was, and since $\\lvert x \\rvert^2 = x^2$ only the $x$ term changes: $f(\\lvert x \\rvert) = x^2 - 4\\lvert x \\rvert + 3$. On the left that is $x^2 + 4x + 3$.',
              ),
              prose(
                'Compare $\\lvert f(x) \\rvert$, which works on the output. At $x = -2$, $f(\\lvert -2 \\rvert) = f(2) = -1$, but $\\lvert f(-2) \\rvert = \\lvert 15 \\rvert = 15$.',
              ),
            ),
            ask('mod-fabs-count-flow'),
            ask('mod-fabs-match', 2),
            ask('mod-fabs-arm-tiles', 2),
            teach(
              prose(
                'The roots of $f(\\lvert x \\rvert) = 0$ are the numbers whose modulus is a root of $f$. A positive root $r$ gives two, $x = \\pm r$; a root at $0$ gives $x = 0$; a negative root gives nothing, since $\\lvert x \\rvert$ is never negative.',
              ),
              maths('\\begin{gathered} (\\lvert x \\rvert - 3)(\\lvert x \\rvert + 2) = 0 \\\\ x = \\pm 3 \\end{gathered}'),
            ),
            ask('mod-inside-out-tree', 2),
            ask('mod-fabs-count-flow', 2),
          ],
          skillCheck: [ask('mod-fabs-match', 2), ask('mod-fabs-arm-tiles', 2), ask('mod-fabs-count-flow', 2)],
        },
        {
          id: 'im-l4-solve',
          title: 'Solving from the Graph',
          slides: [
            teach(
              prose(
                'For a positive $c$, $\\lvert f(x) \\rvert = c$ means $f(x) = c$ or $f(x) = -c$. On the graph it is where $y = \\lvert f(x) \\rvert$ meets the line $y = c$.',
              ),
              graph(
                [
                  { f: (x) => Math.abs(x * x - 5), accent: true },
                  { f: () => 4, dashed: true },
                ],
                { xMin: -4, xMax: 4, yMin: -1, yMax: 8 },
                'The graph of y = |x squared - 5| meeting the dashed line y = 4 at x = -3, -1, 1 and 3',
                [
                  { x: -3, y: 4 },
                  { x: -1, y: 4 },
                  { x: 1, y: 4 },
                  { x: 3, y: 4 },
                ],
              ),
              maths('\\begin{gathered} \\lvert x^2 - 5 \\rvert = 4 \\\\ x^2 = 9 \\quad \\text{or} \\quad x^2 = 1 \\\\ x = \\pm 3 \\text{ or } x = \\pm 1 \\end{gathered}'),
            ),
            ask('mod-crossing-slider'),
            ask('mod-two-cases-tree'),
            ask('mod-quad-eq-root'),
            teach(
              prose(
                'How many roots depends on where the line is against the reflected hump. The dip of $x^2 - 5$ goes down to $-5$, so the top of the hump is at $5$.',
              ),
              graph(
                [
                  { f: (x) => Math.abs(x * x - 5), accent: true },
                  { f: () => 5, dashed: true },
                ],
                { xMin: -4, xMax: 4, yMin: -1, yMax: 8 },
                'The graph of y = |x squared - 5| with the dashed line y = 5 touching the top of its hump at (0, 5)',
                [{ x: 0, y: 5 }],
              ),
              prose(
                'A line below $5$ cuts four times; $y = 5$ touches the top, three; above $5$ only the two arms, two. A negative $c$ gives none, since a modulus is never negative.',
              ),
            ),
            ask('mod-quad-count'),
            ask('mod-crossing-slider', 2),
            ask('mod-two-cases-tree', 2),
            teach(
              prose('Written out in full, complete the square first to see the hump.'),
              maths('\\begin{gathered} x^2 - 4x - 1 = (x - 2)^2 - 5 \\\\ \\lvert x^2 - 4x - 1 \\rvert = 4 \\\\ (x - 2)^2 = 9 \\quad \\text{or} \\quad (x - 2)^2 = 1 \\end{gathered}'),
              prose('So $x = -1$ or $5$ from the first case, and $x = 1$ or $3$ from the second: four roots.'),
            ),
            askWith('mod-quad-eq-root+choice', 'Two cases, up to four roots: pick the one asked for.', 2),
            ask('mod-quad-count', 2),
          ],
          skillCheck: [ask('mod-two-cases-tree', 2), ask('mod-quad-eq-root', 2), ask('mod-quad-count', 2)],
        },
        {
          id: 'im-l4-cubics',
          title: 'Cubics with a Modulus',
          slides: [
            teach(
              prose(
                'The same reflection works for any curve. $y = (x + 2)(x - 1)(x - 3)$ crosses the axis at its three roots, as in Polynomials, Roots from the Factors, and $y = \\lvert f(x) \\rvert$ touches the axis there and bounces back up.',
              ),
              graph(
                [
                  { f: (x) => (x + 2) * (x - 1) * (x - 3), dashed: true },
                  { f: (x) => Math.abs((x + 2) * (x - 1) * (x - 3)), accent: true },
                ],
                { xMin: -3, xMax: 4, yMin: -8, yMax: 10 },
                'The dashed cubic through -2, 1 and 3, and its modulus with the stretches below the axis reflected up',
                [
                  { x: -2, y: 0 },
                  { x: 1, y: 0 },
                  { x: 3, y: 0 },
                ],
              ),
              prose('Every stretch where the cubic is below the axis is flipped: here $x < -2$ and $1 < x < 3$.'),
            ),
            ask('mod-cubic-match'),
            ask('mod-cubic-sign-flow'),
            ask('mod-cubic-reflect-line'),
            teach(
              prose(
                'To tell whether a point is on a flipped stretch, count the negative brackets. At $x = 2$ the brackets are $4$, $1$ and $-1$: one negative, so $f(2) = -4$ and the graph is flipped there.',
              ),
              prose(
                'An even number of negative brackets makes the product positive, an odd number negative. A minus sign in front of the whole product turns every stretch over.',
              ),
            ),
            ask('mod-cubic-count'),
            ask('mod-cubic-match', 2),
            ask('mod-cubic-sign-flow', 2),
            teach(
              prose(
                'For $\\lvert f(x) \\rvert = c$, compare the line with the humps. The outer arms rise for ever, so each meets the line once; a hump meets it twice if the line is below its top, and not at all above it.',
              ),
              graph(
                [
                  { f: (x) => Math.abs((x - 1) * (x - 1) * (x - 4)), accent: true },
                  { f: () => 2, dashed: true },
                ],
                { xMin: -1, xMax: 5, yMin: -1, yMax: 8 },
                'The graph of y = |(x - 1) squared (x - 4)|, touching the axis at 1 and 4 with one hump of height 4, and the dashed line y = 2',
                [{ x: 3, y: 4 }],
              ),
              prose(
                'A double root, as in $(x - 1)^2(x - 4)$, is where the curve touches the axis and turns back, so there is only one hump, here $4$ high. The line $y = 2$ meets this graph four times.',
              ),
            ),
            ask('mod-cubic-reflect-line', 2),
            ask('mod-cubic-count', 2),
          ],
          skillCheck: [ask('mod-cubic-match', 2), ask('mod-cubic-reflect-line', 2), ask('mod-cubic-count', 2)],
        },
        {
          id: 'im-l4-inequalities',
          title: 'Inequalities from the Graph',
          slides: [
            teach(
              prose(
                '$\\lvert f(x) \\rvert < c$ is where the curve is **below** the line $y = c$, and $\\lvert f(x) \\rvert > c$ where it is above. The critical values are the crossings, from $\\lvert f(x) \\rvert = c$.',
              ),
              maths('\\begin{gathered} \\lvert x^2 - 5 \\rvert < 4 \\\\ -3 < x < -1 \\text{ or } 1 < x < 3 \\end{gathered}'),
              line(-5, 5, [piece(-3, -1, false, false), piece(1, 3, false, false)], 'Two stretches: -3 to -1 and 1 to 3, all four ends left out'),
              prose('Between $-1$ and $1$ the reflected hump rises above the line, which is why the set has a gap in it.'),
            ),
            ask('mod-quad-ineq-line'),
            ask('mod-quad-ineq-flow'),
            ask('mod-critical-tree'),
            teach(
              prose(
                'The hump decides the shape. With the line below its top, less than is two stretches and greater than three pieces. With the line above it, less than is one stretch and greater than two rays.',
              ),
              maths('\\begin{gathered} \\lvert x^2 - 1 \\rvert < 3 \\\\ x^2 = 4 \\text{ or } x^2 = -2 \\\\ -2 < x < 2 \\end{gathered}'),
              line(-4, 4, [piece(-2, 2, false, false)], 'One stretch from -2 to 2, both ends left out'),
            ),
            ask('mod-quad-ineq-tiles'),
            ask('mod-quad-ineq-line', 2),
            ask('mod-quad-ineq-flow', 2),
            teach(
              prose(
                'With $\\le$ or $\\ge$ the critical values are included: filled dots. Written out in full, complete the square first: $x^2 + 2x - 4 = (x + 1)^2 - 5$, a hump $5$ high.',
              ),
              maths('\\begin{gathered} \\lvert x^2 + 2x - 4 \\rvert \\ge 4 \\\\ x \\le -4 \\text{ or } -2 \\le x \\le 0 \\\\ \\text{or } x \\ge 2 \\end{gathered}'),
            ),
            ask('mod-critical-tree', 2),
            ask('mod-quad-ineq-tiles', 2),
          ],
          skillCheck: [ask('mod-quad-ineq-line', 2), ask('mod-critical-tree', 2), ask('mod-quad-ineq-tiles', 2)],
        },
      ],
      levelCheck: [
        ask('mod-abs-vertex-slider', 2),
        ask('mod-fabs-arm-tiles', 2),
        ask('mod-quad-eq-root', 2),
        ask('mod-cubic-match', 2),
        ask('mod-quad-ineq-line', 2),
        ask('mod-abs-sketch-flow', 2),
        ask('mod-inside-out-tree', 2),
        ask('mod-crossing-slider', 2),
        ask('mod-cubic-count', 2),
        ask('mod-quad-ineq-tiles', 2),
        ask('mod-abs-quad-match', 2),
        ask('mod-fabs-count-flow', 2),
        ask('mod-two-cases-tree', 2),
        ask('mod-cubic-sign-flow', 2),
        ask('mod-critical-tree', 2),
      ],
    },
    {
      id: 'im-l5',
      title: 'Regions with Modulus',
      lessons: [
        {
          id: 'im-l5-above',
          title: 'Above or Below a V',
          slides: [
            teach(
              prose(
                'An inequality in $x$ and $y$ is a **region** of the plane: every point $(x, y)$ that makes it true. $y \\ge \\lvert x - 2 \\rvert$ is every point on or above the V of $y = \\lvert x - 2 \\rvert$.',
              ),
              region([vee(2, 0, '>=')], 'A solid V with its vertex at (2, 0), the region above it shaded'),
              prose(
                'The V turns where the inside is zero, at $(2, 0)$. Points **on** the V make the two sides equal, and $\\ge$ lets them in, so the V is drawn **solid**.',
              ),
            ),
            ask('mod-region-vertex-tiles'),
            ask('mod-region-test-tree'),
            ask('mod-region-point-choice'),
            teach(
              prose(
                '$y > \\lvert x + 1 \\rvert - 2$ leaves the V itself out, so it is drawn **dashed**. The number outside the bars moves the vertex down to $(-1, -2)$.',
              ),
              region([vee(-1, -2, '>')], 'A dashed V with its vertex at (-1, -2), the region above it shaded', [1, 1]),
              prose(
                'To test a point, work out the V\'s height at its $x$. At $(1, 1)$ the height is $\\lvert 2 \\rvert - 2 = 0$, and $1 > 0$ is true: the point is in. On the line $x = 1$ the lowest whole $y$ in the region is $1$, since $0$ itself is on the dashed V.',
              ),
            ),
            ask('mod-region-lowest-slider'),
            ask('mod-region-vertex-tiles', 2),
            ask('mod-region-test-tree', 2),
            teach(
              prose(
                'With $<$ or $\\le$ the region is **below** the V. Written the other way round, $\\lvert x - 1 \\rvert + 2 < y$ still has $y$ on the bigger side: it is the region above.',
              ),
              region([vee(1, -4, '<=', 2)], 'A solid V of steepness 2 with its vertex at (1, -4), the region below it shaded'),
              prose(
                'A number in front makes the V steeper: $y \\le 2\\lvert x - 1 \\rvert - 4$ has arms of gradient $2$ and $-2$, but its vertex is found the same way, at $(1, -4)$.',
              ),
            ),
            ask('mod-region-point-choice', 2),
            ask('mod-region-lowest-slider', 2),
          ],
          skillCheck: [
            ask('mod-region-vertex-tiles', 2),
            ask('mod-region-test-tree', 2),
            ask('mod-region-lowest-slider', 2),
          ],
        },
        {
          id: 'im-l5-below',
          title: 'Under an Upside-Down V',
          slides: [
            teach(
              prose(
                '$y \\le 4 - \\lvert x \\rvert$ is the region under an **upside-down V**, the V of $y = \\lvert x \\rvert$ turned over and lifted so its top is at $(0, 4)$.',
              ),
              region([cap(0, 4, '<=')], 'A solid upside-down V with its vertex at (0, 4), the region below it shaded'),
              prose(
                'It crosses the $x$-axis where $4 - \\lvert x \\rvert = 0$, so $\\lvert x \\rvert = 4$: at $x = -4$ and $x = 4$, the height of the vertex either side of it.',
              ),
            ),
            ask('mod-cap-intercepts-tiles'),
            ask('mod-origin-flow'),
            ask('mod-region-highest-slider'),
            teach(
              prose(
                '$y < 3 - \\lvert x - 1 \\rvert$ has its vertex at $(1, 3)$ and crosses the axis $3$ either side, at $x = -2$ and $x = 4$. The sign is strict, so the boundary is dashed.',
              ),
              region([cap(1, 3, '<')], 'A dashed upside-down V with its vertex at (1, 3), the region below it shaded', [0, 0]),
              prose(
                'Is the origin in? At $x = 0$ the boundary is at $3 - \\lvert -1 \\rvert = 2$, above the origin, and the region is below the boundary: yes.',
              ),
            ),
            ask('mod-cap-test-tree'),
            ask('mod-cap-intercepts-tiles', 2),
            ask('mod-origin-flow', 2),
            teach(
              prose(
                'A $2$ in front makes the arms steeper, so they reach the axis sooner. $y \\le 6 - 2\\lvert x + 1 \\rvert$ has its vertex at $(-1, 6)$, but $2\\lvert x + 1 \\rvert = 6$ gives $\\lvert x + 1 \\rvert = 3$: it crosses at $x = -4$ and $x = 2$.',
              ),
              region([cap(-1, 6, '<=', 2)], 'A solid upside-down V of steepness 2 with its vertex at (-1, 6), the region below it shaded'),
            ),
            ask('mod-region-highest-slider', 2),
            ask('mod-cap-test-tree', 2),
          ],
          skillCheck: [
            ask('mod-cap-intercepts-tiles', 2),
            ask('mod-origin-flow', 2),
            ask('mod-region-highest-slider', 2),
          ],
        },
        {
          id: 'im-l5-between',
          title: 'Between Two Graphs',
          slides: [
            teach(
              prose(
                'Where $y \\ge \\lvert x \\rvert - 2$ **and** $y \\le 2 - \\lvert x \\rvert$ both hold is above the V and under the upside-down V at once: a closed region.',
              ),
              region([vee(0, -2, '>='), cap(0, 2, '<=')], 'A solid V with its vertex at (0, -2) and a solid upside-down V with its vertex at (0, 2), the square between them shaded'),
              prose(
                'Its corners are the two vertices and the two places the graphs cross, found as the crossings of two Vs were: where the heights are equal. Every arm has gradient $1$ or $-1$, so the sides meet at right angles: a **rectangle**, and a **square** like this one when the vertices are one above the other. A top vertex too low to reach over the V gives no region at all.',
              ),
            ),
            ask('mod-cross-points'),
            ask('mod-cross-slider'),
            ask('mod-between-shape'),
            teach(
              prose(
                'With the vertices apart the region is a rectangle, and its side corners are where the arms on each side cross. For $y \\ge \\lvert x - 1 \\rvert - 3$ and $y \\le 3 - \\lvert x + 1 \\rvert$ the right arms are $y = x - 4$ and $y = 2 - x$.',
              ),
              region([vee(1, -3, '>='), cap(-1, 3, '<=')], 'A solid V with its vertex at (1, -3) and a solid upside-down V with its vertex at (-1, 3), the rectangle between them shaded'),
              maths('\\begin{gathered} x - 4 = 2 - x \\\\ x = 3, \\quad y = -1 \\end{gathered}'),
              prose('The left arms, $y = -x - 2$ and $y = x + 4$, meet at $(-3, 1)$. The other two corners are the vertices, $(1, -3)$ and $(-1, 3)$.'),
            ),
            ask('mod-between-corners-tiles'),
            ask('mod-between-corner-slider'),
            teach(
              prose(
                'A steeper V under the same vertex makes a **kite**. $y \\ge 2\\lvert x \\rvert - 3$ with $y \\le 3 - \\lvert x \\rvert$ has corners $(0, -3)$, $(0, 3)$, $(-2, 1)$ and $(2, 1)$: the arms no longer meet at right angles.',
              ),
              region([vee(0, -3, '>=', 2), cap(0, 3, '<=')], 'A solid V of steepness 2 with its vertex at (0, -3) and a solid upside-down V with its vertex at (0, 3), the kite between them shaded'),
              prose('A dashed boundary changes none of the corners, only whether the points on that edge are in.'),
            ),
            ask('mod-between-shape', 2),
            ask('mod-between-corners-tiles', 2),
            ask('mod-between-corner-slider', 2),
          ],
          skillCheck: [
            ask('mod-between-corners-tiles', 2),
            ask('mod-between-shape', 2),
            ask('mod-between-corner-slider', 2),
          ],
        },
        {
          id: 'im-l5-reading',
          title: 'Reading a Region',
          slides: [
            teach(
              prose(
                'Now the other way: from a picture to its inequality. Read three things. Which way up the boundary is and where its vertex is; which side of it the region is on; and whether the line is solid or dashed.',
              ),
              region([cap(1, 3, '<')], 'A dashed upside-down V with its vertex at (1, 3), the region below it shaded, and a dot at (1, 0)', [1, 0]),
              prose(
                'An upside-down V with its vertex at $(1, 3)$, the dot below it, and the line dashed: $y < 3 - \\lvert x - 1 \\rvert$.',
              ),
            ),
            ask('mod-read-region-tiles'),
            ask('mod-region-picture-check'),
            ask('mod-read-region-flow'),
            teach(
              prose('With two boundaries, read each one against the dot, which is in the region.'),
              region([vee(0, -3, '>'), cap(0, 3, '<=')], 'A dashed V with its vertex at (0, -3) and a solid upside-down V with its vertex at (0, 3), the square between them shaded, and a dot at the origin', [0, 0]),
              maths('\\begin{gathered} y > \\lvert x \\rvert - 3 \\\\ y \\le 3 - \\lvert x \\rvert \\end{gathered}'),
            ),
            ask('mod-read-region-match'),
            ask('mod-read-region-tiles', 2),
            ask('mod-region-picture-check', 2),
            teach(
              prose(
                'To check a picture against its rules, take one feature at a time: each vertex, then solid or dashed, then put the dot into every inequality. A picture with one of these wrong shows a different region.',
              ),
            ),
            ask('mod-read-region-flow', 2),
            ask('mod-read-region-match', 2),
          ],
          skillCheck: [
            ask('mod-read-region-tiles', 2),
            ask('mod-read-region-match', 2),
            ask('mod-region-picture-check', 2),
          ],
        },
        {
          id: 'im-l5-points',
          title: 'Points in a Region',
          slides: [
            teach(
              prose(
                'A point is in a region when it makes **every** inequality true. For $y \\ge \\lvert x \\rvert - 2$ and $y < 2 - \\lvert x \\rvert$: $(1, 0)$ gives $0 \\ge -1$ and $0 < 1$, both true, so it is in. $(2, 0)$ is on the dashed upside-down V, so it is out.',
              ),
              region([vee(0, -2, '>='), cap(0, 2, '<')], 'A solid V with its vertex at (0, -2) and a dashed upside-down V with its vertex at (0, 2), the square between them shaded, and a dot at (1, 0)', [1, 0]),
            ),
            ask('mod-pair-point-choice'),
            ask('mod-region-count'),
            ask('mod-region-highest-tiles'),
            teach(
              prose(
                'Count the points with whole-number coordinates column by column. In that square, $x = -1$ allows $y = -1$ and $0$; $x = 0$ allows $-2$ to $1$; $x = 1$ allows $-1$ and $0$.',
              ),
              maths('2 + 4 + 2 = 8'),
              prose(
                'The top vertex $(0, 2)$ is on a dashed line, so the highest point in the region is $(0, 1)$. A solid vertex would be the highest point itself.',
              ),
            ),
            ask('mod-region-width'),
            ask('mod-region-count+choice'),
            ask('mod-region-highest-tiles', 2),
            teach(
              prose(
                'The width at a height: the V allows a stretch around its vertex and the upside-down V another, and the region is where they overlap. For $y \\ge \\lvert x - 1 \\rvert - 2$ and $y \\le 4 - \\lvert x + 1 \\rvert$ at $y = 0$:',
              ),
              maths('\\begin{gathered} \\lvert x - 1 \\rvert \\le 2: \\; -1 \\le x \\le 3 \\\\ \\lvert x + 1 \\rvert \\le 4: \\; -5 \\le x \\le 3 \\end{gathered}'),
              prose('Both hold from $-1$ to $3$, a width of $4$.'),
            ),
            ask('mod-pair-point-choice', 2),
            ask('mod-region-width', 2),
          ],
          skillCheck: [
            ask('mod-pair-point-choice', 2),
            ask('mod-region-count', 2),
            ask('mod-region-width', 2),
          ],
        },
      ],
      levelCheck: [
        ask('mod-region-vertex-tiles', 2),
        ask('mod-cap-intercepts-tiles', 2),
        ask('mod-between-shape', 2),
        ask('mod-read-region-match', 2),
        ask('mod-region-count', 2),
        ask('mod-region-test-tree', 2),
        ask('mod-origin-flow', 2),
        ask('mod-between-corner-slider', 2),
        ask('mod-read-region-tiles', 2),
        ask('mod-region-width', 2),
        ask('mod-region-lowest-slider', 2),
        ask('mod-cap-test-tree', 2),
        ask('mod-between-corners-tiles', 2),
        ask('mod-region-picture-check', 2),
        ask('mod-pair-point-choice', 2),
      ],
    },
    {
      id: 'im-l6',
      title: 'Piecewise Functions',
      lessons: [
        {
          id: 'im-l6-evaluate',
          title: 'Defining and Evaluating',
          slides: [
            teach(
              prose(
                'A **piecewise** function uses different rules on different stretches of $x$. You met them in Functions & Transformations; here they are the tool that takes a modulus apart.',
              ),
              maths('f(x) = \\begin{cases} 3 - x & x < 1 \\\\ 2x & x \\ge 1 \\end{cases}'),
              prose(
                'First find the stretch $x$ is in, then use that row\'s rule. $-2$ is in $x < 1$, so $f(-2) = 3 - (-2) = 5$; $4$ is in $x \\ge 1$, so $f(4) = 2 \\times 4 = 8$.',
              ),
            ),
            ask('mod-piece-owner-flow'),
            ask('mod-piece-value'),
            ask('mod-piece-sum-tree'),
            teach(
              prose(
                'Where the rule changes is a **join**. Exactly one row owns it: the one whose sign includes equality, $\\le$ or $\\ge$.',
              ),
              maths('f(x) = \\begin{cases} x + 3 & x < 1 \\\\ 2x - 3 & x \\ge 1 \\end{cases}'),
              pieces(
                { pieces: [{ m: 1, q: 3 }, { m: 2, q: -3 }], cuts: [1], leftOwns: [false] },
                'Two straight pieces jumping at x = 1: a hollow dot at (1, 4) and a filled dot at (1, -1)',
              ),
              prose(
                'So $f(1) = 2 \\times 1 - 3 = -1$. On the graph the owner\'s end is a **filled** dot and the other a **hollow** one: $x + 3$ comes up towards $4$ but never gets there.',
              ),
            ),
            ask('mod-join-dot-choice'),
            ask('mod-piece-value+choice', 2),
            ask('mod-piece-owner-flow', 2),
            teach(
              prose(
                'Three pieces work the same way, with two joins to watch. In a sum such as $f(-3) + f(2)$, each value comes from its own row, so the two halves may use different rules.',
              ),
              prose('Here $f(x)$ is:'),
              maths('\\begin{cases} x + 4 & x < -1 \\\\ 1 - x & -1 \\le x \\le 2 \\\\ 2x - 5 & x > 2 \\end{cases}'),
              prose('$f(-3) = 1$ from the first row and $f(2) = -1$ from the second, which owns $x = 2$: the sum is $0$.'),
            ),
            ask('mod-piece-sum-tree', 2),
            ask('mod-join-dot-choice', 2),
          ],
          skillCheck: [ask('mod-piece-value', 2), ask('mod-piece-owner-flow', 2), ask('mod-piece-sum-tree', 2)],
        },
        {
          id: 'im-l6-modulus',
          title: 'Writing a Modulus in Pieces',
          slides: [
            teach(
              prose(
                '$\\lvert 2x - 6 \\rvert$ is two rules. Where the inside is zero or positive the bars change nothing; where it is negative they turn its sign round.',
              ),
              maths('\\lvert 2x - 6 \\rvert = \\begin{cases} 6 - 2x & x < 3 \\\\ 2x - 6 & x \\ge 3 \\end{cases}'),
              prose(
                'The split is where the inside is zero: $2x - 6 = 0$ at $x = 3$, and $x = -\\frac{b}{a}$ for $\\lvert ax + b \\rvert$ in general. The negative side is minus the **whole** inside, $-(2x - 6) = 6 - 2x$, never $-2x - 6$.',
              ),
            ),
            ask('mod-split-sign-flow'),
            ask('mod-split-tiles'),
            ask('mod-abs-cases-choice'),
            teach(
              prose(
                'Two moduli split in two places. $\\lvert x - 1 \\rvert + \\lvert x + 2 \\rvert$ splits at $x = -2$ and $x = 1$, making three stretches, and in each one every modulus comes out by the sign of its own inside. In pieces it is:',
              ),
              maths('\\begin{cases} -2x - 1 & x < -2 \\\\ 3 & -2 \\le x < 1 \\\\ 2x + 1 & x \\ge 1 \\end{cases}'),
              prose(
                'In the middle, $(1 - x) + (x + 2) = 3$: the $x$ terms cancel, and the distances to $1$ and to $-2$ always add up to the gap between them.',
              ),
            ),
            ask('mod-two-abs-tiles'),
            ask('mod-split-sign-flow', 2),
            ask('mod-split-tiles', 2),
            teach(
              prose(
                'A number outside the bars goes on every piece: $\\lvert x + 1 \\rvert - 2$ is $-x - 3$ for $x < -1$ and $x - 1$ for $x \\ge -1$.',
              ),
              prose(
                'For a **difference** of two moduli the $x$ terms cancel on the outside instead: $\\lvert x - 1 \\rvert - \\lvert x - 4 \\rvert$ is level at $-3$ on the left and at $3$ on the right, and $2x - 5$ in between.',
              ),
            ),
            ask('mod-two-abs-tiles', 2),
            ask('mod-abs-cases-choice', 2),
          ],
          skillCheck: [ask('mod-split-tiles', 2), ask('mod-two-abs-tiles', 2), ask('mod-abs-cases-choice', 2)],
        },
        {
          id: 'im-l6-sketching',
          title: 'Sketching in Pieces',
          slides: [
            teach(
              prose(
                'Sketch a piecewise function one piece at a time: each piece is a straight line, drawn only over its own stretch.',
              ),
              maths('f(x) = \\begin{cases} 1 - x & x < 2 \\\\ 2x - 5 & x \\ge 2 \\end{cases}'),
              pieces(
                { pieces: [{ m: -1, q: 1 }, { m: 2, q: -5 }], cuts: [2], leftOwns: [false] },
                'A falling piece and a steeper rising piece meeting at (2, -1)',
              ),
              prose(
                'The left piece falls with gradient $-1$ and the right rises with gradient $2$. Both give $-1$ at $x = 2$, so they meet at $(2, -1)$: a V like that of $y = \\lvert x - 2 \\rvert - 1$, but with arms of different steepness.',
              ),
            ),
            ask('mod-piece-sketch-flow'),
            ask('mod-piece-gradients-tiles'),
            ask('mod-piece-rule-read'),
            teach(
              prose(
                'Where the pieces do not meet there is a jump. Draw the owner\'s end as a filled dot and the other end as a hollow one.',
              ),
              maths('f(x) = \\begin{cases} x + 2 & x \\le 0 \\\\ 3 - x & x > 0 \\end{cases}'),
              pieces(
                { pieces: [{ m: 1, q: 2 }, { m: -1, q: 3 }], cuts: [0], leftOwns: [true] },
                'A rising piece ending in a filled dot at (0, 2), and a falling piece starting from a hollow dot at (0, 3)',
              ),
              prose(
                'The left piece owns $x = 0$, so $(0, 2)$ is filled. The right piece starts just after it, from a hollow dot at $(0, 3)$.',
              ),
            ),
            ask('mod-piece-start-slider'),
            ask('mod-piece-sketch-flow', 2),
            ask('mod-piece-gradients-tiles', 2),
            teach(
              prose(
                'The V of $y = \\lvert ax + b \\rvert$ is the case where two pieces of gradient $-a$ and $a$ meet on the axis. Three pieces make a sketch with two joins, and a level piece is a flat line.',
              ),
              pieces(
                { pieces: [{ m: -2, q: -1 }, { m: 0, q: 3 }, { m: 2, q: 1 }], cuts: [-2, 1], leftOwns: [false, false] },
                'y = |x - 1| + |x + 2|: falling, then level at 3 between x = -2 and 1, then rising',
              ),
            ),
            ask('mod-piece-rule-read', 2),
            ask('mod-piece-start-slider', 2),
          ],
          skillCheck: [
            ask('mod-piece-rule-read', 2),
            ask('mod-piece-gradients-tiles', 2),
            ask('mod-piece-start-slider', 2),
          ],
        },
        {
          id: 'im-l6-continuity',
          title: 'Continuity at the Joins',
          slides: [
            teach(
              prose(
                'A piecewise function is **continuous** at a join when the pieces meet there: both rules give the same value. Otherwise the graph **jumps**.',
              ),
              maths('f(x) = \\begin{cases} 2x + 1 & x < 1 \\\\ 5 - x & x \\ge 1 \\end{cases}'),
              pieces(
                { pieces: [{ m: 2, q: 1 }, { m: -1, q: 5 }], cuts: [1], leftOwns: [false] },
                'A rising piece up to a hollow dot at (1, 3), and a falling piece from a filled dot at (1, 4)',
              ),
              prose('At $x = 1$ the left rule gives $3$ and the right gives $4$. They differ, so the graph jumps up by $1$.'),
            ),
            ask('mod-join-meet-flow'),
            ask('mod-jump'),
            ask('mod-join-dots-tiles'),
            teach(
              prose('An unknown in one piece can be chosen to close the gap. Put the join into both pieces and make them equal.'),
              maths('f(x) = \\begin{cases} 3x - 2 & x < 2 \\\\ x + k & x \\ge 2 \\end{cases}'),
              maths('\\begin{gathered} 3 \\times 2 - 2 = 2 + k \\\\ 4 = 2 + k \\\\ k = 2 \\end{gathered}'),
            ),
            ask('mod-continuous-k'),
            ask('mod-k-solve-steps'),
            ask('mod-join-meet-flow', 2),
            teach(
              prose(
                'The size of a jump is the gap between the two values at the join, whichever is higher. Which end is filled has nothing to do with which is higher: it is decided only by which row owns the join.',
              ),
            ),
            ask('mod-jump+choice', 2),
            ask('mod-continuous-k', 2),
          ],
          skillCheck: [ask('mod-jump', 2), ask('mod-continuous-k', 2), ask('mod-join-dots-tiles', 2)],
        },
        {
          id: 'im-l6-solving',
          title: 'Solving with Pieces',
          slides: [
            teach(
              prose(
                'To solve $f(x) = c$, set **each** piece equal to $c$, then keep a root only if it lies in that piece\'s own stretch.',
              ),
              maths('f(x) = \\begin{cases} x + 4 & x < 0 \\\\ 2x - 1 & x \\ge 0 \\end{cases}'),
              prose(
                'For $f(x) = 5$: $x + 4 = 5$ gives $x = 1$, but $1$ is not in $x < 0$, so it is thrown out. $2x - 1 = 5$ gives $x = 3$, which is in $x \\ge 0$. One solution, $x = 3$.',
              ),
            ),
            ask('mod-piece-root'),
            ask('mod-piece-reject-flow'),
            ask('mod-piece-count'),
            teach(
              prose(
                'The sketch says how many to expect: each place the line $y = c$ meets the graph is one solution. A hollow dot on the line is not a point of the graph, so it does not count.',
              ),
              pieces(
                { pieces: [{ m: 1, q: 4 }, { m: 2, q: -1 }], cuts: [0], leftOwns: [false] },
                'Two rising pieces with a jump at x = 0, and a dashed line at y = 3 meeting both',
                3,
              ),
              prose('$y = 3$ meets both pieces: $x + 4 = 3$ at $x = -1$ and $2x - 1 = 3$ at $x = 2$, two solutions.'),
            ),
            ask('mod-piece-roots-tiles'),
            ask('mod-piece-root+choice', 2),
            ask('mod-piece-reject-flow', 2),
            teach(
              prose(
                'With three pieces, solve all three and keep what survives. A root landing exactly on a join belongs only to the piece that owns it, so check the $\\le$ and $<$ as well.',
              ),
            ),
            ask('mod-piece-count', 2),
            ask('mod-piece-roots-tiles', 2),
          ],
          skillCheck: [ask('mod-piece-root', 2), ask('mod-piece-roots-tiles', 2), ask('mod-piece-count', 2)],
        },
      ],
      levelCheck: [
        ask('mod-piece-value', 2),
        ask('mod-abs-cases-choice', 2),
        ask('mod-piece-rule-read', 2),
        ask('mod-jump', 2),
        ask('mod-piece-owner-flow', 2),
        ask('mod-two-abs-tiles', 2),
        ask('mod-piece-start-slider', 2),
        ask('mod-continuous-k', 2),
        ask('mod-piece-count', 2),
        ask('mod-piece-sum-tree', 2),
        ask('mod-split-tiles', 2),
        ask('mod-join-meet-flow', 2),
        ask('mod-piece-root', 2),
        ask('mod-piece-gradients-tiles', 2),
        ask('mod-piece-roots-tiles', 2),
      ],
    },
  ],
};
