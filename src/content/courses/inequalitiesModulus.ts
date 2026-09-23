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
import { numberLineSvg } from '../generators/inequalitiesModulus';

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
  ],
};
