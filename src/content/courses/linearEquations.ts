/**
 * Linear Equations & Inequalities.
 *
 * Level 1 solves one equation in one unknown. It starts from the smallest
 * idea — do the same to both sides — and reads the left-hand side as a recipe
 * for $x$, so undoing happens in the reverse order. Then the same idea meets
 * $x$ on both sides, brackets, fractions, and equations that arrive as words.
 * Level 2 solves two equations in two unknowns: what it means for a pair of
 * values to be a solution, elimination with and without scaling,
 * substitution, and pairs of equations built from words.
 * Level 3 rearranges formulae: the same undoing with letters where the
 * numbers were, then brackets and fractions, the subject on both sides,
 * squares and roots, and using the rearranged formula once it is found.
 *
 * Level 4 solves linear inequalities: drawn on a number line, turned round
 * on a negative, double, counted in integers, and as a region of the plane.
 *
 * Level 5 solves three equations in three unknowns by elimination: what a
 * solution triple is, removing one letter twice to leave a pair, finishing
 * off and checking, choosing which letter goes first, and three unknowns
 * from words. The matrix route is in Matrices.
 *
 * Level 6 takes several inequalities at once: the overlap of two
 * half-planes, a pictured region read back as its inequalities, the corners
 * where boundaries meet, the whole-number points inside, and regions from
 * words.
 *
 * Level 7 models stories with straight-line equations: naming the unknown
 * and writing every quantity from it, break-even, rates of travel and of
 * filling, mixtures blended to a target, and reading a model back — which
 * equation fits, an answer that makes no sense, a formula rearranged for
 * the story's unknown, and the effect of changing one number.
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

/**
 * An exercise with a short worked example above it, on the same slide, where
 * the question needs a step the lesson's teaching slides have not shown yet.
 */
const askAfter = (generatorId: string, difficulty: number, ...blocks: Block[]): SlideRef => ({
  type: 'generated',
  generatorId,
  difficulty,
  leadIn: blocks,
});

/** Straight lines on one set of axes, for the slides about graphs. */
const lines = (
  fs: ((x: number) => number)[],
  window: { xMin: number; xMax: number; yMin: number; yMax: number },
  label: string,
  horizontals: number[] = [],
): Block => ({
  kind: 'diagram',
  svg: plotSvg({
    ...window,
    curves: fs.map((f) => ({ f })),
    horizontals,
    verticals: [{ x: 0, dashed: false }],
    label,
  }),
});

/**
 * A number line with a solution set on it: a band along the line where the
 * set is, and a dot at each end, hollow where the end is left out.
 */
const numberLine = (
  window: { min: number; max: number },
  inSet: (x: number) => boolean,
  ends: { x: number; hollow: boolean }[],
  label: string,
): Block => ({
  kind: 'diagram',
  svg: plotSvg({
    xMin: window.min,
    xMax: window.max,
    yMin: -0.9,
    yMax: 0.9,
    height: 60,
    grid: true,
    curves: [{ f: (x) => (inSet(x) ? 0 : NaN), band: true, breaks: true }],
    marks: ends.map((end) => ({ x: end.x, y: 0, hollow: end.hollow })),
    label,
  }),
});

/** A boundary line on squared axes, dashed when it is left out, with a dot. */
const region = (f: (x: number) => number, dashed: boolean, dot: { x: number; y: number }, label: string): Block => ({
  kind: 'diagram',
  svg: plotSvg({
    xMin: -6,
    xMax: 6,
    yMin: -6,
    yMax: 6,
    height: 220,
    grid: true,
    curves: [{ f, dashed }],
    marks: [dot],
    label,
  }),
});

/** Several boundaries on squared axes, each dashed when it is left out, with dots where wanted. */
const boundaries = (
  sides: { f: (x: number) => number; dashed: boolean }[],
  dots: { x: number; y: number; hollow?: boolean }[],
  label: string,
): Block => ({
  kind: 'diagram',
  svg: plotSvg({
    xMin: -6,
    xMax: 6,
    yMin: -6,
    yMax: 6,
    height: 220,
    grid: true,
    curves: sides,
    marks: dots,
    label,
  }),
});

/** The region the level 6 teaching comes back to: $y \le x$, $y < -x + 2$ and $y \ge -2$. */
const TRIANGLE = [
  { f: (x: number) => x, dashed: false },
  { f: (x: number) => -x + 2, dashed: true },
  { f: () => -2, dashed: false },
];

export const linearEquations: Course = {
  id: 'linear-equations',
  category: 'algebra-fundamentals',
  position: 20,
  title: 'Linear Equations & Inequalities',
  blurb: 'Undoing what was done to the unknown, for one equation, for two at once, and for any letter in a formula.',
  levels: [
    {
      id: 'le-l1',
      title: 'Solving Linear Equations',
      lessons: [
        {
          id: 'le-l1-steps',
          title: 'One and Two Steps',
          slides: [
            teach(
              prose(
                'An equation is a balance: both sides have the same value. Do the same thing to both sides and it stays balanced.',
              ),
              maths('x + 7 = 12'),
              prose(
                'Here $7$ is added to $x$. Take $7$ from both sides and $x$ is left on its own.',
              ),
              maths('x = 12 - 7 = 5'),
              prose(
                'Every operation has an opposite that undoes it: adding and subtracting undo each other, and so do multiplying and dividing. So $4x = 20$ is solved by dividing by $4$, and $\\frac{x}{3} = 6$ by multiplying by $3$.',
              ),
            ),
            ask('lin-one-step'),
            ask('lin-one-step+choice'),
            teach(
              prose(
                'Read the left-hand side of $3x + 4 = 19$ as a recipe that starts with $x$: multiply by $3$, **then** add $4$.',
              ),
              maths('x \\xrightarrow{\\times 3} 3x \\xrightarrow{+4} 19'),
              prose(
                'To get back to $x$, undo the steps in the **reverse** order, like taking off shoes before socks: take away $4$, then divide by $3$.',
              ),
              maths('\\begin{gathered} 3x = 15 \\\\ x = 5 \\end{gathered}'),
              prose(
                'Check by putting it back in: $3 \\times 5 + 4 = 19$. If the left-hand side does not come to the right-hand side, something went wrong.',
              ),
            ),
            ask('lin-undo-flow'),
            ask('lin-two-step-steps'),
            ask('lin-check'),
            ask('lin-two-step'),
            teach(
              prose(
                'The same equation as a picture. $y = 3x + 4$ is a straight line, and $3x + 4 = 19$ asks where that line reaches the height $19$.',
              ),
              lines([(x) => 3 * x + 4], { xMin: -2, xMax: 7, yMin: -4, yMax: 26 }, 'The line y = 3x + 4 crossing the height 19 at x = 5', [19]),
              prose('It gets there at $x = 5$ — the same answer the algebra gave.'),
            ),
            ask('lin-graph-slider'),
            askWith('lin-undo-flow', 'One more on order: which operation comes off first?'),
          ],
          skillCheck: [ask('lin-two-step', 2), ask('lin-one-step', 2), ask('lin-undo-flow')],
        },
        {
          id: 'le-l1-both',
          title: 'Unknowns on Both Sides',
          slides: [
            teach(
              prose('When $x$ appears on both sides, first gather all the $x$ terms on one side.'),
              maths('5x + 3 = 2x + 15'),
              prose(
                'The left has more $x$ ($5x$ against $2x$), so take $2x$ from both sides. The equation stays balanced, and now only the left has $x$.',
              ),
              maths('\\begin{gathered} 3x + 3 = 15 \\\\ 3x = 12 \\\\ x = 4 \\end{gathered}'),
              prose('After collecting it is a two-step equation: take away $3$, then divide by $3$.'),
            ),
            ask('lin-both-sides-steps'),
            teach(
              prose(
                'Collect the $x$ terms on the side with **more** $x$, so the coefficient left over is positive. In $2x + 9 = 5x - 3$ that is the right, so take $2x$ from both sides.',
              ),
              maths('\\begin{gathered} 2x + 9 = 5x - 3 \\\\ 9 = 3x - 3 \\\\ 12 = 3x \\\\ x = 4 \\end{gathered}'),
              prose(
                'Each side is a straight line, and the solution is where they cross: there both sides have the same value.',
              ),
              lines(
                [(x) => 2 * x + 9, (x) => 5 * x - 3],
                { xMin: -1, xMax: 7, yMin: -6, yMax: 30 },
                'The lines y = 2x + 9 and y = 5x - 3 crossing at x = 4',
              ),
            ),
            ask('lin-collect-flow'),
            ask('lin-collect-tiles'),
            ask('lin-both-sides'),
            teach(
              prose(
                'With negatives, "more $x$" means the larger coefficient, sign included: $-2x$ is less $x$ than $3x$. So in $-2x + 1 = 3x - 9$ the $x$ terms collect on the right, and taking $-2x$ away means **adding** $2x$ to both sides.',
              ),
              maths('\\begin{gathered} -2x + 1 = 3x - 9 \\\\ 1 = 5x - 9 \\\\ 10 = 5x \\\\ x = 2 \\end{gathered}'),
              prose(
                'Check both sides separately: the left is $-4 + 1 = -3$ and the right is $6 - 9 = -3$. They match, so $x = 2$ is right.',
              ),
            ),
            ask('lin-meet-slider'),
            ask('lin-collect-tiles+choice'),
            ask('lin-collect-flow', 2),
            ask('lin-meet-slider', 2),
          ],
          skillCheck: [ask('lin-both-sides', 2), ask('lin-collect-tiles', 2), ask('lin-collect-flow', 2)],
        },
        {
          id: 'le-l1-brackets',
          title: 'Brackets',
          slides: [
            teach(
              prose(
                'A number in front of a bracket multiplies **everything** inside it. Expanding writes that out.',
              ),
              maths('3(x - 2) = 12'),
              maths('3x - 6 = 12'),
              prose(
                'Now it is a two-step equation: add $6$, then divide by $3$, so $x = 6$. Writing $3x - 2$ multiplies only the $x$ — the most common slip with brackets.',
              ),
            ),
            ask('lin-expand-tiles'),
            ask('lin-expand-tiles+choice'),
            teach(
              prose(
                'When the bracket is alone on its side, dividing first is shorter. The whole bracket is multiplied by $4$, so divide both sides by $4$.',
              ),
              maths('\\begin{gathered} 4(x + 3) = 28 \\\\ x + 3 = 7 \\\\ x = 4 \\end{gathered}'),
              prose('Expanding gets the same answer, one step later: $4x + 12 = 28$, $4x = 16$.'),
            ),
            ask('lin-brackets-tree'),
            askWith('lin-check', 'Brackets make checking worth doing. Work out the inside of the bracket first.', 2),
            teach(
              prose(
                'An $x$ outside the bracket means expanding first, so the $x$ terms can be collected. Then take $2x$ from both sides, since the right has more $x$.',
              ),
              maths('\\begin{gathered} 2(x + 5) = 4x - 2 \\\\ 2x + 10 = 4x - 2 \\\\ 12 = 2x \\\\ x = 6 \\end{gathered}'),
              prose(
                'So: a bracket alone on its side, divide first; an $x$ on the other side, expand first. A negative number outside changes every sign inside: $-3(x - 2) = -3x + 6$.',
              ),
            ),
            ask('lin-bracket-flow'),
            ask('lin-brackets'),
            ask('lin-bracket-flow', 2),
            ask('lin-check+choice', 2),
          ],
          skillCheck: [ask('lin-brackets', 2), ask('lin-expand-tiles', 2), ask('lin-bracket-flow', 2)],
        },
        {
          id: 'le-l1-fractions',
          title: 'Clearing Fractions',
          slides: [
            teach(
              prose(
                'A fraction bar divides the **whole** top. To undo it, multiply both sides by the bottom.',
              ),
              maths('\\begin{gathered} \\frac{x + 4}{3} = 5 \\\\ x + 4 = 15 \\\\ x = 11 \\end{gathered}'),
              prose(
                'The top stays together: multiplying by $3$ gives $x + 4$, not $x + 12$. If a number sits outside the fraction, take it off first, as in any two-step equation.',
              ),
            ),
            ask('lin-fraction-steps'),
            ask('lin-fraction'),
            ask('lin-undo-flow', 2),
            teach(
              prose(
                'With two fractions, multiply **every** term by one number that both bottoms divide into. The smallest is their lowest common multiple.',
              ),
              maths('\\frac{x}{4} + \\frac{x}{6} = 5'),
              prose('Both $4$ and $6$ go into $12$, so multiply every term by $12$.'),
              maths('\\begin{gathered} 3x + 2x = 60 \\\\ 5x = 60 \\\\ x = 12 \\end{gathered}'),
            ),
            ask('lin-multiplier'),
            ask('lin-two-fractions-tree'),
            ask('lin-multiplier', 2),
            teach(
              prose('With one fraction on each side, multiply by both bottoms at once.'),
              maths('\\frac{x + 1}{2} = \\frac{x + 5}{3}'),
              prose(
                'Multiplying by $6$ cancels the $2$ on the left, leaving $3$; it cancels the $3$ on the right, leaving $2$. Each top ends up multiplied by the **other** bottom.',
              ),
              maths('\\begin{gathered} 3(x + 1) = 2(x + 5) \\\\ 3x + 3 = 2x + 10 \\\\ x = 7 \\end{gathered}'),
            ),
            ask('lin-cross-tiles'),
            ask('lin-cross-tiles+choice'),
          ],
          skillCheck: [ask('lin-fraction', 2), ask('lin-multiplier', 2), ask('lin-cross-tiles', 2)],
        },
        {
          id: 'le-l1-words',
          title: 'Equations from Words',
          slides: [
            teach(
              prose(
                'Words become an equation once the unknown has a letter. Then read the words in order, as a recipe.',
              ),
              prose('"I think of a number, multiply it by $4$ and then subtract $7$. The answer is $21$."'),
              maths('4x - 7 = 21'),
              prose(
                'Order matters. "Subtract $7$ and **then** multiply by $4$" takes the $7$ off $x$ first, so it needs a bracket: $4(x - 7) = 21$.',
              ),
            ),
            ask('lin-words'),
            ask('lin-cost-slider'),
            ask('lin-words+choice'),
            teach(
              prose(
                'When a problem has two quantities, call one $x$ and write the other in terms of it.',
              ),
              prose(
                'A rectangle is $3$ cm longer than it is wide, with perimeter $26$ cm. Width $x$, length $x + 3$, and the perimeter goes round each twice:',
              ),
              maths('\\begin{gathered} 2(x + x + 3) = 26 \\\\ 4x + 6 = 26 \\\\ x = 5 \\end{gathered}'),
              prose('Answer the question that was asked: the width is $5$ cm.'),
            ),
            askAfter(
              'lin-words-solve',
              1,
              prose(
                'Whole numbers in a row: call the smallest $x$, and each next one is $1$ more. Three in a row adding up to $48$:',
              ),
              maths('\\begin{gathered} x + (x + 1) + (x + 2) = 48 \\\\ 3x + 3 = 48 \\\\ 3x = 45 \\\\ x = 15 \\end{gathered}'),
              prose('The numbers are $15$, $16$ and $17$. Four in a row are $x$, $x + 1$, $x + 2$ and $x + 3$, which add up to $4x + 6$.'),
            ),
            ask('lin-cost-slider', 2),
            askAfter(
              'lin-words-solve',
              2,
              prose(
                'One amount can be a multiple of the other and then more. £$32$ is shared so that one person gets twice as much as the other, and then £$5$ more. Call the smaller share $x$; the other is $2x + 5$:',
              ),
              maths('\\begin{gathered} x + 2x + 5 = 32 \\\\ 3x + 5 = 32 \\\\ 3x = 27 \\\\ x = 9 \\end{gathered}'),
            ),
            teach(
              prose(
                'Two ways of paying, and when they cost the same: write each total with the same letter and set them equal. Plan A: £$10$ plus £$4$ a month. Plan B: £$22$ plus £$2$ a month.',
              ),
              maths('\\begin{gathered} 10 + 4n = 22 + 2n \\\\ 2n = 12 \\\\ n = 6 \\end{gathered}'),
              prose('That is unknowns on both sides, met in the wild.'),
            ),
            ask('lin-plans'),
            ask('lin-plans+choice'),
          ],
          skillCheck: [ask('lin-words', 2), ask('lin-words-solve', 2), ask('lin-plans', 2)],
        },
      ],
      levelCheck: [
        ask('lin-two-step', 2),
        ask('lin-undo-flow', 2),
        ask('lin-graph-slider', 2),
        ask('lin-both-sides', 2),
        ask('lin-collect-tiles', 2),
        ask('lin-meet-slider', 2),
        ask('lin-brackets', 2),
        ask('lin-expand-tiles', 2),
        ask('lin-brackets-tree', 2),
        ask('lin-fraction', 2),
        ask('lin-cross-tiles', 2),
        ask('lin-two-fractions-tree', 2),
        ask('lin-words', 2),
        ask('lin-plans', 2),
      ],
    },
    {
      id: 'le-l2',
      title: 'Simultaneous Linear Equations',
      lessons: [
        {
          id: 'le-l2-solutions',
          title: 'What a Solution Is',
          slides: [
            teach(
              prose(
                'Two equations, two unknowns. On its own, $x + y = 7$ has endless solutions: $(1, 6)$, $(2, 5)$, $(4, 3)$ and so on. A second equation narrows them down.',
              ),
              maths('\\begin{aligned} x + y &= 7 & \\quad (1) \\\\ 2x - y &= 5 & \\quad (2) \\end{aligned}'),
              prose(
                'A **solution** is a pair of values that makes **both** true. $(4, 3)$ works: $4 + 3 = 7$ and $8 - 3 = 5$. $(5, 2)$ satisfies (1) but gives $8$ in (2), so it is not a solution.',
              ),
            ),
            ask('lin-sim-check'),
            ask('lin-sim-satisfies-flow'),
            ask('lin-sim-which-pair'),
            teach(
              prose(
                'Each equation is a straight line, and every point on a line satisfies its equation. The one point on **both** lines is where they cross — the solution.',
              ),
              lines(
                [(x) => 7 - x, (x) => 2 * x - 5],
                { xMin: -1, xMax: 7, yMin: -5, yMax: 9 },
                'The lines x + y = 7 and 2x - y = 5 crossing at (4, 3)',
              ),
              prose(
                'Once one value is known, the other comes from putting it back into either equation. With $x = 4$, (1) gives $4 + y = 7$, so $y = 3$.',
              ),
            ),
            ask('lin-sim-back-sub'),
            ask('lin-sim-y-slider'),
            ask('lin-sim-check+choice'),
            teach(
              prose(
                'So a check always has two parts: put the pair into (1), then into (2). Failing either one means it is not a solution.',
              ),
              prose('The next lessons find the pair; this check is how to be sure it is right.'),
            ),
            ask('lin-sim-satisfies-flow', 2),
            ask('lin-sim-y-slider', 2),
          ],
          skillCheck: [ask('lin-sim-check', 2), ask('lin-sim-which-pair', 2), ask('lin-sim-back-sub', 2)],
        },
        {
          id: 'le-l2-eliminate',
          title: 'Elimination',
          slides: [
            teach(
              prose(
                'Equal things added to or taken from equal things stay equal, so one whole equation can be taken from another. Look for a letter with the same coefficient in both.',
              ),
              maths('\\begin{aligned} 3x + 2y &= 16 & \\quad (1) \\\\ 3x - y &= 10 & \\quad (2) \\end{aligned}'),
              prose('Both have $3x$. Subtract (2) from (1), term by term, and the $x$ terms cancel.'),
              maths('\\begin{gathered} 2y - (-y) = 16 - 10 \\\\ 3y = 6 \\\\ y = 2 \\end{gathered}'),
              prose('Then (1) gives $3x + 4 = 16$, so $x = 4$.'),
            ),
            askWith('lin-sim-back-sub', 'After eliminating, one value is known. Finish the pair.'),
            askWith('lin-sim-check', 'Check a pair found by elimination, one equation at a time.'),
            teach(
              prose(
                'When the matching coefficients have **opposite** signs, add the equations instead: $y$ and $-y$ add to nothing.',
              ),
              maths('\\begin{aligned} 2x + y &= 11 & \\quad (1) \\\\ 5x - y &= 17 & \\quad (2) \\end{aligned}'),
              prose('$(1) + (2)$, term by term:'),
              maths('\\begin{gathered} 2x + 5x = 11 + 17 \\\\ 7x = 28 \\\\ x = 4 \\end{gathered}'),
              prose('Putting $x = 4$ into (1): $8 + y = 11$, so $y = 3$.'),
            ),
            ask('lin-elim-flow'),
            ask('lin-elim-combine'),
            ask('lin-elim-solve'),
            teach(
              prose(
                'The rule in four words: **same sign, subtract**; opposite signs, add. Subtracting a negative is the step that goes wrong, so take it one term at a time.',
              ),
            ),
            ask('lin-elim-combine+choice'),
            ask('lin-elim-flow'),
            ask('lin-elim-solve+choice'),
          ],
          skillCheck: [ask('lin-elim-solve', 2), ask('lin-elim-combine', 2), ask('lin-elim-flow')],
        },
        {
          id: 'le-l2-scale',
          title: 'Elimination with Scaling',
          slides: [
            teach(
              prose('When no letter matches, multiply one equation until one does.'),
              maths('\\begin{aligned} 2x + 3y &= 13 & \\quad (1) \\\\ 4x - y &= 5 & \\quad (2) \\end{aligned}'),
              prose(
                'The $x$ coefficient in (2) is twice the one in (1). Multiply **every** term of (1) by $2$, the right-hand side included.',
              ),
              maths('4x + 6y = 26 \\quad (1\')'),
              prose('Now subtract (2): $7y = 21$, so $y = 3$, and then $x = 2$.'),
            ),
            ask('lin-scale-choice'),
            ask('lin-scale-equation'),
            ask('lin-scale-solve'),
            teach(
              prose(
                'Sometimes neither coefficient divides the other. Then scale **both** equations, each by the other one\'s coefficient.',
              ),
              maths('\\begin{aligned} 2x + 3y &= 12 & \\quad (1) \\\\ 3x + 2y &= 13 & \\quad (2) \\end{aligned}'),
              prose('Multiply (1) by $3$ and (2) by $2$, so both have $6x$.'),
              maths('\\begin{aligned} 6x + 9y &= 36 \\\\ 6x + 4y &= 26 \\end{aligned}'),
              prose('Subtracting leaves $5y = 10$, so $y = 2$ and $x = 3$.'),
            ),
            ask('lin-scale-tree'),
            ask('lin-elim-flow', 2),
            ask('lin-scale-equation+choice'),
            teach(
              prose(
                'Choose the letter that needs the least scaling, and check the pair in the **original** equations, not the scaled ones — a slip in the scaling would pass a check against itself.',
              ),
            ),
            ask('lin-scale-tree', 2),
            ask('lin-scale-solve+choice'),
          ],
          skillCheck: [ask('lin-scale-solve', 2), ask('lin-scale-equation', 2), ask('lin-scale-choice', 2)],
        },
        {
          id: 'le-l2-substitute',
          title: 'Substitution',
          slides: [
            teach(
              prose(
                'When one equation already says what $y$ is, put that expression into the other in place of $y$.',
              ),
              maths('\\begin{aligned} y &= 2x - 1 & \\quad (1) \\\\ 3x + 2y &= 12 & \\quad (2) \\end{aligned}'),
              maths('3x + 2(2x - 1) = 12'),
              prose(
                'That is one equation in $x$ alone. If no equation starts $y =$, make $y$ the subject of one first: $4x + y = 9$ becomes $y = 9 - 4x$.',
              ),
            ),
            ask('lin-sub-rearrange'),
            teach(
              prose(
                'The bracket is where substitution goes wrong. In $3x + 2(2x - 1) = 12$ the $2$ multiplies **both** terms of $2x - 1$. Expand, collect the $x$ terms, then solve.',
              ),
              maths('\\begin{gathered} 3x + 4x - 2 = 12 \\\\ 7x - 2 = 12 \\\\ 7x = 14 \\\\ x = 2 \\end{gathered}'),
              prose('That is only $x$. Put it back into (1) for $y$: $y = 2 \\times 2 - 1 = 3$.'),
            ),
            ask('lin-sub-collect'),
            ask('lin-sub-steps'),
            askAfter(
              'lin-sub',
              1,
              prose(
                'A negative number outside the bracket changes both signs inside. Putting $y = -2x + 1$ into $5x - 3y = 19$:',
              ),
              maths('\\begin{gathered} 5x - 3(-2x + 1) = 19 \\\\ 5x + 6x - 3 = 19 \\\\ 11x = 22 \\\\ x = 2 \\end{gathered}'),
              prose('Then $y = -2 \\times 2 + 1 = -3$.'),
            ),
            ask('lin-sub-collect+choice'),
            askWith('lin-sim-y-slider', 'The same pair as a picture: where do the two lines cross?'),
            teach(
              prose('Every method gives the same answer; the question is which is quickest.'),
              prose(
                'A letter with a coefficient of $1$ or $-1$ comes out cleanly, so substitute. A letter with matching coefficients cancels at once, so eliminate. Otherwise scale, then eliminate.',
              ),
            ),
            ask('lin-method-flow'),
            ask('lin-method-flow', 2),
          ],
          skillCheck: [ask('lin-sub', 2), ask('lin-sub-collect', 2), ask('lin-sub-rearrange', 2)],
        },
        {
          id: 'le-l2-words',
          title: 'Simultaneous Equations from Words',
          slides: [
            teach(
              prose(
                'Two unknowns need two letters and two facts. Say what each letter stands for, then write each fact as an equation.',
              ),
              prose(
                'Let $x$ be the price of an adult ticket and $y$ the price of a child ticket. "$2$ adult and $3$ child tickets cost £$31$" is',
              ),
              maths('2x + 3y = 31'),
              prose('Keep the letters in the same order in both equations, whatever order the words use.'),
            ),
            ask('lin-sim-words-setup'),
            ask('lin-sim-words-setup+choice'),
            teach(
              prose(
                'Then solve the pair as in Simultaneous Linear Equations. "$3$ coffees and $2$ cakes cost £$19$; $2$ coffees and $3$ cakes cost £$16$", with $x$ for a coffee and $y$ for a cake:',
              ),
              maths('\\begin{aligned} 3x + 2y &= 19 & \\quad (1) \\\\ 2x + 3y &= 16 & \\quad (2) \\end{aligned}'),
              prose('No letter matches, so scale both: (1) by $3$ and (2) by $2$, so both have $6y$.'),
              maths('\\begin{aligned} 9x + 6y &= 57 \\\\ 4x + 6y &= 32 \\end{aligned}'),
              prose(
                'Subtracting leaves $5x = 25$, so $x = 5$. Then (1) gives $15 + 2y = 19$, so $y = 2$: a coffee is £$5$ and a cake £$2$.',
              ),
            ),
            ask('lin-sim-words-solve'),
            askAfter(
              'lin-method-flow',
              2,
              prose(
                'Pick the quickest route. In $x + 3y = 5$ the $x$ has coefficient $1$, so $x = 5 - 3y$ substitutes cleanly. In $3x + 2y = 34$ with $7x - 2y = 26$ the $y$ terms already match, so add. With neither, scale and then eliminate, as above.',
              ),
            ),
            teach(
              prose('Two numbers from their sum and difference is the quickest pair of all.'),
              maths('\\begin{aligned} x + y &= 23 \\\\ x - y &= 7 \\end{aligned}'),
              prose(
                'Adding gives $2x = 30$, so the larger is $15$; subtracting gives $2y = 16$, so the smaller is $8$. The larger is always half of sum plus difference.',
              ),
            ),
            ask('lin-sum-diff'),
            ask('lin-sum-diff+choice'),
            askWith(
              'lin-sim-words-solve',
              'Check the answer against the **words**, not only the equations: with the coffees above, $3 \\times 5 + 2 \\times 2 = 19$. If the equations were written wrongly, the answer will satisfy them and still not fit the story.',
              2,
            ),
            ask('lin-method-flow'),
          ],
          skillCheck: [ask('lin-sim-words-solve', 2), ask('lin-sim-words-setup', 2), ask('lin-sum-diff', 2)],
        },
      ],
      levelCheck: [
        ask('lin-sim-check', 2),
        ask('lin-sim-which-pair', 2),
        ask('lin-sim-satisfies-flow', 2),
        ask('lin-sim-back-sub', 2),
        ask('lin-sim-y-slider', 2),
        ask('lin-elim-combine', 2),
        ask('lin-elim-solve', 2),
        ask('lin-elim-flow', 2),
        ask('lin-scale-equation', 2),
        ask('lin-scale-tree', 2),
        ask('lin-scale-solve', 2),
        ask('lin-sub-collect', 2),
        ask('lin-sub', 2),
        ask('lin-sim-words-solve', 2),
        ask('lin-sum-diff', 2),
      ],
    },
    {
      id: 'le-l3',
      title: 'Rearranging Formulae',
      lessons: [
        {
          id: 'le-l3-subject',
          title: 'Changing the Subject',
          slides: [
            teach(
              prose(
                'A formula links quantities with letters. $v = u + at$ gives a speed $v$ from $u$, $a$ and $t$. Making $t$ the **subject** means rearranging it into $t = \\ldots$, with $t$ alone on one side.',
              ),
              prose('That is solving an equation, with letters where the numbers were. The same two steps, with numbers and then with letters:'),
              maths('\\begin{aligned} 17 &= 5 + 3t \\\\ 12 &= 3t \\\\ t &= 4 \\end{aligned}'),
              maths('\\begin{aligned} v &= u + 3t \\\\ v - u &= 3t \\\\ t &= \\frac{v - u}{3} \\end{aligned}'),
              prose('Undo in the reverse order, as before: the $3$ multiplied $t$ first and the $u$ was added last, so the $u$ comes off first.'),
            ),
            ask('lin-subject-flow'),
            ask('lin-first-undo-tiles'),
            ask('lin-subject'),
            teach(
              prose('A letter can be the multiplier. In $v = u + at$ divide by $a$ exactly as you would divide by $3$.'),
              maths('v - u = at \\implies t = \\frac{v - u}{a}'),
              prose(
                'When the subject\'s term is taken **away**, dividing by the negative turns the signs round. From $h = b - kt$:',
              ),
              maths('h - b = -kt \\implies t = \\frac{b - h}{k}'),
            ),
            askAfter(
              'lin-rearrange-steps',
              1,
              prose(
                'A letter underneath is cleared by multiplying, just as a number would be. From $p = \\frac{x}{k} + 2$, take off the $2$, then multiply both sides by $k$:',
              ),
              maths('\\begin{aligned} p - 2 &= \\frac{x}{k} \\\\ k(p - 2) &= x \\end{aligned}'),
            ),
            ask('lin-subject+choice', 2),
            ask('lin-first-undo-tiles', 2),
            teach(
              prose(
                'Check a rearrangement by putting numbers in. With $u = 5$, $a = 3$ and $t = 4$ the formula gives $v = 17$; then $\\frac{v - u}{a} = \\frac{17 - 5}{3} = 4$ leads back to $t$.',
              ),
              prose('An answer is marked right whenever it has the same value, so $\\frac{v}{a} - \\frac{u}{a}$ is as good as $\\frac{v - u}{a}$.'),
            ),
            ask('lin-rearrange-steps'),
            ask('lin-subject-flow'),
          ],
          skillCheck: [ask('lin-subject', 2), ask('lin-first-undo-tiles', 2), ask('lin-subject-flow')],
        },
        {
          id: 'le-l3-brackets',
          title: 'Brackets and Fractions',
          slides: [
            teach(
              prose(
                'When the subject is inside a bracket, the multiplier outside was applied **last**, so it comes off first. Keep the bracket whole and divide.',
              ),
              maths('\\begin{aligned} P &= 2(l + w) \\\\ \\frac{P}{2} &= l + w \\\\ w &= \\frac{P}{2} - l \\end{aligned}'),
              prose('A fraction bar is a division done last, so multiply both sides by the denominator first.'),
              maths('\\begin{aligned} A &= \\frac{b + h}{3} \\\\ 3A &= b + h \\\\ h &= 3A - b \\end{aligned}'),
            ),
            ask('lin-bracket-subject'),
            ask('lin-clear-fraction-tiles'),
            ask('lin-bracket-subject+choice'),
            teach(
              prose('Both at once: clear the fraction, then divide by the number outside the bracket, then undo what is inside.'),
              maths('\\begin{aligned} C &= \\frac{5(F - 32)}{9} \\\\ 9C &= 5(F - 32) \\\\ \\frac{9C}{5} &= F - 32 \\\\ F &= \\frac{9C}{5} + 32 \\end{aligned}'),
              prose(
                'In $A = \\frac{(a + b)h}{2}$ the bracket multiplies $h$, so once the $2$ is cleared the **whole** bracket divides: $h = \\frac{2A}{a + b}$.',
              ),
            ),
            ask('lin-rearrange-steps', 2),
            ask('lin-subject-flow', 2),
            ask('lin-clear-fraction-tiles', 2),
            teach(
              prose(
                'Expanding first also works: $P = 2l + 2w$ gives $w = \\frac{P - 2l}{2}$, the same as $\\frac{P}{2} - l$. Dividing first is usually shorter, because the bracket never has to be multiplied out.',
              ),
            ),
            ask('lin-rearrange-steps', 2),
            ask('lin-subject-flow', 2),
          ],
          skillCheck: [ask('lin-bracket-subject', 2), ask('lin-clear-fraction-tiles', 2), ask('lin-rearrange-steps', 2)],
        },
        {
          id: 'le-l3-both',
          title: 'The Subject on Both Sides',
          slides: [
            teach(
              prose(
                'In $ax + 3 = cx + 10$ the subject $x$ appears twice, so there is no single order to undo. Collect the $x$ terms on one side instead, then take $x$ out as a factor.',
              ),
              maths('\\begin{aligned} ax - cx &= 7 \\\\ x(a - c) &= 7 \\\\ x &= \\frac{7}{a - c} \\end{aligned}'),
              prose('The bracket is one number whatever $a$ and $c$ are, so dividing by it is the last step.'),
            ),
            ask('lin-twice-next'),
            ask('lin-factor-out-tiles'),
            ask('lin-twice-subject'),
            teach(
              prose(
                'A subject in the denominator: multiply it out first. Then it is on both sides, and the same collect, factorise, divide finishes it.',
              ),
              maths('\\begin{aligned} y &= \\frac{x + 1}{x - 2} \\\\ y(x - 2) &= x + 1 \\\\ xy - 2y &= x + 1 \\\\ xy - x &= 2y + 1 \\\\ x(y - 1) &= 2y + 1 \\\\ x &= \\frac{2y + 1}{y - 1} \\end{aligned}'),
            ),
            ask('lin-twice-next', 2),
            ask('lin-factor-out-tiles', 2),
            ask('lin-twice-value-tree', 2),
            teach(
              prose(
                'The rearranged formula answers the question the other way round. With $x = \\frac{7}{a - c}$, $a = 10$ and $c = 3$ give $x = \\frac{7}{7} = 1$ with no equation to solve.',
              ),
              prose('Work the top and the bottom out first, then divide.'),
            ),
            ask('lin-twice-value-tree'),
            ask('lin-twice-subject+choice', 2),
          ],
          skillCheck: [ask('lin-twice-subject', 2), ask('lin-factor-out-tiles', 2), ask('lin-twice-next', 2)],
        },
        {
          id: 'le-l3-roots',
          title: 'Squares and Roots',
          slides: [
            teach(
              prose(
                'Squaring and taking a square root undo each other. In $A = \\pi r^2$ the square was done first and the $\\pi$ last, so the $\\pi$ comes off first and the root last.',
              ),
              maths('\\begin{aligned} A &= \\pi r^2 \\\\ \\frac{A}{\\pi} &= r^2 \\\\ r &= \\sqrt{\\frac{A}{\\pi}} \\end{aligned}'),
              prose('A radius is never negative, so only the positive root.'),
            ),
            ask('lin-root-sign'),
            askAfter(
              'lin-root-flow',
              1,
              prose(
                'A square root is undone by squaring, but only once the root is the whole of its side. Here it is, so square both sides first:',
              ),
              maths('\\begin{aligned} W &= \\sqrt{k - 3} \\\\ W^2 &= k - 3 \\\\ k &= W^2 + 3 \\end{aligned}'),
              prose(
                'With something else beside the root, take that off first: from $W = \\sqrt{k} + 3$, $W - 3 = \\sqrt{k}$, so $k = (W - 3)^2$.',
              ),
            ),
            askAfter(
              'lin-root-subject',
              1,
              prose(
                'When a number multiplies the root, divide it off first so the root is alone. Then square the **whole** of each side, so the number is squared too:',
              ),
              maths('\\begin{aligned} V &= 5\\sqrt{h} \\\\ \\frac{V}{5} &= \\sqrt{h} \\\\ \\frac{V^2}{25} &= h \\end{aligned}'),
            ),
            teach(
              prose(
                'Square or root only once the square or the root is the **whole** of its side. In $T = 2\\pi\\sqrt{\\frac{l}{g}}$ divide by $2\\pi$ first, then square, and the $2\\pi$ is squared too.',
              ),
              maths('\\begin{aligned} \\frac{T}{2\\pi} &= \\sqrt{\\frac{l}{g}} \\\\ \\frac{T^2}{4\\pi^2} &= \\frac{l}{g} \\\\ l &= \\frac{gT^2}{4\\pi^2} \\end{aligned}'),
              prose(
                'A root covers the whole side, never term by term: from $v^2 = u^2 + 2as$, $u = \\sqrt{v^2 - 2as}$, which is **not** $v - \\sqrt{2as}$.',
              ),
            ),
            ask('lin-root-steps'),
            ask('lin-root-subject+choice', 2),
            ask('lin-root-flow', 2),
            teach(
              prose(
                'Every positive number has two square roots: $3^2$ and $(-3)^2$ are both $9$. When the letter can be negative, keep both and write $\\pm$. From $y = x^2 + 5$:',
              ),
              maths('\\begin{aligned} x^2 &= y - 5 \\\\ x &= \\pm\\sqrt{y - 5} \\end{aligned}'),
              prose('A length, a speed or a time cannot be negative, so there only the positive root is kept.'),
            ),
            ask('lin-root-steps', 2),
            ask('lin-root-sign', 2),
          ],
          skillCheck: [ask('lin-root-subject', 2), ask('lin-root-steps', 2), ask('lin-root-sign', 2)],
        },
        {
          id: 'le-l3-using',
          title: 'Using the New Subject',
          slides: [
            teach(
              prose(
                'A formula gives its subject from the other letters. To find a different letter, rearrange first, then put the numbers in.',
              ),
              prose('How long does a car starting at $u = 5$ take to reach $v = 35$ if $a = 6$? Rearrange $v = u + at$, then substitute.'),
              maths('t = \\frac{v - u}{a} = \\frac{35 - 5}{6} = 5'),
            ),
            ask('lin-use-formula'),
            ask('lin-which-rearrangement'),
            ask('lin-formula-words'),
            teach(
              prose(
                'On a graph of $v$ against $t$, the rearranged formula is reading **backwards**: across from the speed to the line, then down to the time.',
              ),
              lines([(t) => 5 + 6 * t], { xMin: 0, xMax: 8, yMin: 0, yMax: 55 }, 'The line v = 5 + 6t reaching the height 35 at t = 5', [35]),
              prose('Words become a formula the same way: "£$3$ to start and £$2$ a mile" is $C = 3 + 2m$, and then $m = \\frac{C - 3}{2}$.'),
            ),
            ask('lin-use-slider'),
            ask('lin-use-formula+choice', 2),
            teach(
              prose(
                'A shape counts its letter more than once. A rectangle $5$ cm longer than it is wide, width $w$, has perimeter $P = 2(w + w + 5)$:',
              ),
              maths('\\begin{aligned} P &= 4w + 10 \\\\ P - 10 &= 4w \\\\ w &= \\frac{P - 10}{4} \\end{aligned}'),
              prose(
                'A quantity that goes **down** takes its letter term away. A $30$ cm candle burning $2$ cm an hour is $h = 30 - 2t$. Add $2t$ to both sides and take $h$ from both, so the letter term is positive:',
              ),
              maths('\\begin{aligned} 2t &= 30 - h \\\\ t &= \\frac{30 - h}{2} \\end{aligned}'),
            ),
            ask('lin-formula-words', 2),
            askWith(
              'lin-which-rearrangement',
              'Test an option with numbers. For $v = u + 3t$, pick $u = 5$ and $t = 4$, so $v = 17$. The option $\\frac{v + u}{3}$ gives $\\frac{22}{3}$, not $4$, so it is wrong; $\\frac{v - u}{3} = \\frac{12}{3} = 4$ gives $t$ back.',
            ),
            ask('lin-use-slider', 2),
          ],
          skillCheck: [ask('lin-use-formula', 2), ask('lin-formula-words', 2), ask('lin-which-rearrangement')],
        },
      ],
      levelCheck: [
        ask('lin-subject', 2),
        ask('lin-first-undo-tiles', 2),
        ask('lin-subject-flow', 2),
        ask('lin-bracket-subject', 2),
        ask('lin-clear-fraction-tiles', 2),
        ask('lin-rearrange-steps', 2),
        ask('lin-twice-subject', 2),
        ask('lin-factor-out-tiles', 2),
        ask('lin-twice-next', 2),
        ask('lin-root-subject', 2),
        ask('lin-root-sign', 2),
        ask('lin-root-steps', 2),
        ask('lin-use-formula', 2),
        ask('lin-which-rearrangement', 2),
        ask('lin-formula-words', 2),
      ],
    },
    {
      id: 'le-l4',
      title: 'Linear Inequalities',
      lessons: [
        {
          id: 'le-l4-solve',
          title: 'Solving and Drawing',
          slides: [
            teach(
              prose(
                'An inequality compares two sides that need not be equal: $<$ is "less than", $\\le$ is "less than or equal to", and $>$ and $\\ge$ are the same the other way. Its solution is a whole range of numbers, not one.',
              ),
              prose('Solve it like an equation, doing the same to both sides and undoing in reverse order.'),
              maths('\\begin{gathered} 3x + 4 \\le 13 \\\\ 3x \\le 9 \\\\ x \\le 3 \\end{gathered}'),
              prose(
                'Every number up to and including $3$ works. Taking away and dividing by a positive number leave the sign exactly as it was.',
              ),
            ),
            ask('lin-ineq-steps'),
            teach(
              prose(
                'On a number line the solution is a dot at the boundary and shading along the line. A **filled** dot means the boundary is included ($\\le$ or $\\ge$); a **hollow** dot means it is left out ($<$ or $>$).',
              ),
              numberLine({ min: -2, max: 8 }, (x) => x <= 3, [{ x: 3, hollow: false }], 'x at most 3: a filled dot at 3, shaded to the left'),
              prose(
                'That is $x \\le 3$: filled at $3$, shaded left. $x > 1$ would be hollow at $1$ and shaded right. To draw one here, tap a number for a dot, tap the dot to make it hollow, then tap the line on the side to shade.',
              ),
            ),
            ask('lin-ineq-line'),
            ask('lin-ineq-picture'),
            ask('lin-ineq-steps'),
            ask('lin-ineq-line'),
            ask('lin-ineq-picture'),
            teach(
              prose(
                'With $x$ on both sides, collect the $x$ terms on the side with **more** $x$, just as for equations: $5x - 2 > 2x + 7$ gives $3x > 9$, so $x > 3$.',
              ),
              prose(
                'Check with a test value from the answer. $x = 4$ is in $x > 3$, and it gives $18 > 15$, which is true. $x = 3$ gives $13 > 13$, which is false, so $3$ is rightly left out.',
              ),
            ),
            ask('lin-ineq-test-flow'),
            ask('lin-ineq-test-flow', 2),
          ],
          skillCheck: [ask('lin-ineq-line', 2), ask('lin-ineq-picture', 2), ask('lin-ineq-test-flow')],
        },
        {
          id: 'le-l4-flip',
          title: 'Flipping on a Negative',
          slides: [
            teach(
              prose('$2 < 5$. Multiply both sides by $-1$ and the order reverses: $-2$ is **bigger** than $-5$.'),
              maths('2 < 5 \\quad \\text{but} \\quad -2 > -5'),
              prose(
                'So multiplying or dividing both sides by a **negative** number turns the sign round. Adding or subtracting never does, whatever the numbers, and neither does multiplying or dividing by a positive.',
              ),
            ),
            ask('lin-flip-flow'),
            ask('lin-flip-steps'),
            ask('lin-flip-line'),
            teach(
              prose('Solve $5 - 2x > 1$. Taking away $5$ leaves the sign alone.'),
              maths('-2x > -4'),
              prose('Dividing by $-2$ turns it round.'),
              maths('x < 2'),
              prose(
                'Test it with $x = 0$, which is in $x < 2$: $5 - 0 > 1$ is true. Had the sign not turned, $x > 2$ would claim $0$ fails, and the test would catch it.',
              ),
            ),
            ask('lin-flip-tiles'),
            ask('lin-ineq-test-flow', 2),
            ask('lin-flip-flow', 2),
            teach(
              prose(
                'With $x$ on both sides there is a way round the negative: collect the $x$ terms on the side with more $x$.',
              ),
              maths('\\begin{gathered} 2x + 5 < 5x - 7 \\\\ 12 < 3x \\\\ 4 < x \\end{gathered}'),
              prose(
                'That is $x > 4$. Collecting on the left instead gives $-3x < -12$, and dividing by $-3$ turns the sign round to the same $x > 4$.',
              ),
            ),
            ask('lin-flip-steps', 2),
            ask('lin-flip-line', 2),
          ],
          skillCheck: [ask('lin-flip-tiles', 2), ask('lin-flip-line', 2), ask('lin-flip-flow', 2)],
        },
        {
          id: 'le-l4-double',
          title: 'Double Inequalities',
          slides: [
            teach(
              prose(
                '$-3 < 2x + 1 \\le 7$ says two things at once: $2x + 1$ is more than $-3$ **and** at most $7$. Solve all three parts together, doing the same to each.',
              ),
              maths('\\begin{gathered} -3 < 2x + 1 \\le 7 \\\\ -4 < 2x \\le 6 \\\\ -2 < x \\le 3 \\end{gathered}'),
              prose('The solution is a stretch between two ends: hollow at $-2$, filled at $3$, shaded between.'),
              numberLine(
                { min: -4, max: 5 },
                (x) => x > -2 && x <= 3,
                [
                  { x: -2, hollow: true },
                  { x: 3, hollow: false },
                ],
                'A hollow dot at -2, a filled dot at 3, shaded between',
              ),
            ),
            ask('lin-double-steps'),
            ask('lin-double-line'),
            ask('lin-double-ends'),
            teach(
              prose('With a negative coefficient in the middle, dividing turns **both** signs round.'),
              maths('\\begin{gathered} -5 \\le 3 - 2x < 7 \\\\ -8 \\le -2x < 4 \\\\ 4 \\ge x > -2 \\end{gathered}'),
              prose(
                'Read it from the smaller end: $-2 < x \\le 4$. The sign that was written on the left now belongs to the right-hand end.',
              ),
            ),
            ask('lin-double-steps', 2),
            ask('lin-double-tiles'),
            ask('lin-double-ends', 2),
            teach(
              prose(
                'Test the answer with a number in the middle of the stretch: it should pass both parts. Then look at each end on its own: it is in the solution only where its sign has "or equal to".',
              ),
            ),
            ask('lin-double-line', 2),
            ask('lin-double-tiles', 2),
          ],
          skillCheck: [ask('lin-double-line', 2), ask('lin-double-tiles', 2), ask('lin-double-ends', 2)],
        },
        {
          id: 'le-l4-integers',
          title: 'Integer Solutions',
          slides: [
            teach(
              prose(
                'Sometimes only whole numbers are wanted. The integers that satisfy $-2 \\le x < 3$ are the whole numbers in that stretch:',
              ),
              maths('-2, \\; -1, \\; 0, \\; 1, \\; 2'),
              prose('$-2$ is in, because its sign has "or equal to". $3$ is out, because $x < 3$ leaves it out.'),
            ),
            ask('lin-int-list'),
            ask('lin-int-count'),
            ask('lin-int-slider'),
            teach(
              prose('With one inequality, solve it first and then step in from the boundary.'),
              maths('\\begin{gathered} 3x - 2 < 13 \\\\ 3x < 15 \\\\ x < 5 \\end{gathered}'),
              prose(
                'The largest integer is $4$, since $5$ is left out. For $x \\le 5$ it would be $5$ itself. A solution pointing up, like $x > 5$, has a smallest integer instead, $6$.',
              ),
            ),
            ask('lin-int-extreme'),
            askAfter(
              'lin-double-line',
              2,
              prose(
                'Dividing all three parts by a **negative** number turns both signs round:',
              ),
              maths('\\begin{gathered} -7 < 3 - 2x \\le 5 \\\\ -10 < -2x \\le 2 \\\\ 5 > x \\ge -1 \\end{gathered}'),
              prose('Read from the smaller end, that is $-1 \\le x < 5$: filled at $-1$, hollow at $5$.'),
            ),
            ask('lin-int-list', 2),
            teach(
              prose(
                'To count without listing: from the smallest integer to the largest, both included, is the difference **plus one**. From $-4$ to $6$ is $6 - (-4) + 1 = 11$ integers.',
              ),
              prose('Find the smallest and largest first, stepping in from any end that is left out.'),
            ),
            ask('lin-int-count', 2),
            ask('lin-int-slider', 2),
          ],
          skillCheck: [ask('lin-int-count', 2), ask('lin-int-list', 2), ask('lin-int-extreme', 2)],
        },
        {
          id: 'le-l4-regions',
          title: 'Inequalities in Two Variables',
          slides: [
            teach(
              prose(
                'With two letters the solution is a region of the plane. The line $y = 2x + 1$ splits the plane in two, and $y < 2x + 1$ is every point **below** it.',
              ),
              region((x) => 2 * x + 1, true, { x: 2, y: -2 }, 'A dashed line y = 2x + 1 with a dot below it at (2, -2)'),
              prose(
                'The boundary is **dashed** when the sign is strict, since its points are left out, and **solid** for $\\le$ or $\\ge$. To find the side, test one point off the line: $(0, 0)$ gives $0 < 1$, true, so the side with the origin is shaded.',
              ),
            ),
            ask('lin-region-flow'),
            ask('lin-region-test'),
            ask('lin-region-choice'),
            teach(
              prose(
                'To draw the boundary, find where it crosses the axes. For $y = 2x - 4$, put $y = 0$: $2x = 4$, so it crosses the $x$-axis at $2$.',
              ),
              prose(
                'The form $2x + 3y \\le 12$ is quickest this way. Put $y = 0$: $x = 6$. Put $x = 0$: $y = 4$. Join $(6, 0)$ to $(0, 4)$ with a solid line.',
              ),
            ),
            ask('lin-region-slider'),
            ask('lin-region-slider', 2),
            ask('lin-region-test', 2),
            teach(
              prose(
                'In the form $ax + by$, "less than" is not always "below". $2x - 3y < 6$ is the region **above** its line, because the $y$ term is negative.',
              ),
              prose('A test point never gets this wrong, so test one rather than guessing from the sign.'),
            ),
            ask('lin-region-choice', 2),
            ask('lin-region-flow', 2),
          ],
          skillCheck: [ask('lin-region-choice', 2), ask('lin-region-flow', 2), ask('lin-region-slider', 2)],
        },
      ],
      levelCheck: [
        ask('lin-ineq-line', 2),
        ask('lin-ineq-picture', 2),
        ask('lin-flip-steps', 2),
        ask('lin-ineq-test-flow', 2),
        ask('lin-flip-tiles', 2),
        ask('lin-flip-line', 2),
        ask('lin-flip-flow', 2),
        ask('lin-double-steps', 2),
        ask('lin-double-ends', 2),
        ask('lin-double-line', 2),
        ask('lin-int-list', 2),
        ask('lin-int-count', 2),
        ask('lin-int-slider', 2),
        ask('lin-region-choice', 2),
        ask('lin-region-flow', 2),
      ],
    },
    {
      id: 'le-l5',
      title: 'Simultaneous Equations in Three Unknowns',
      lessons: [
        {
          id: 'le-l5-solutions',
          title: 'What a Solution Is',
          slides: [
            teach(
              prose(
                'Three unknowns need three equations. A **solution** is a triple $(x, y, z)$ that makes all three true at once.',
              ),
              maths('\\begin{aligned} x + y + z &= 6 & \\quad (1) \\\\ 2x - y + z &= 3 & \\quad (2) \\\\ x + 2y - z &= 2 & \\quad (3) \\end{aligned}'),
              prose(
                '$(1, 2, 3)$ works: $1 + 2 + 3 = 6$, $2 - 2 + 3 = 3$ and $1 + 4 - 3 = 2$. $(3, 3, 0)$ satisfies (1) and (2), but gives $9$ in (3), so it is **not** a solution.',
              ),
            ),
            ask('lin-tri-which'),
            ask('lin-tri-check-flow'),
            ask('lin-tri-lhs-tree'),
            teach(
              prose(
                'Once two values are known, the third comes from any one equation. With $x = 1$ and $y = 2$, (3) gives $1 + 4 - z = 2$, so $z = 3$.',
              ),
              prose(
                'Each equation is a flat plane in space, and the solution is the one point on all three planes. Two planes meet along a whole line, which is why passing two equations out of three proves nothing.',
              ),
            ),
            ask('lin-tri-third'),
            ask('lin-tri-which', 2),
            ask('lin-tri-check-flow', 2),
            teach(
              prose('So a check has three parts, and failing any one of them settles it.'),
              prose('The next lessons find the triple; this check is how to be sure it is right.'),
            ),
            ask('lin-tri-lhs-tree', 2),
            ask('lin-tri-third+choice'),
          ],
          skillCheck: [ask('lin-tri-third', 2), ask('lin-tri-which', 2), ask('lin-tri-lhs-tree', 2)],
        },
        {
          id: 'le-l5-drop',
          title: 'Dropping One Letter',
          slides: [
            teach(
              prose(
                'The plan: remove one letter to leave two equations in two letters, a pair you already know how to solve from Simultaneous Linear Equations.',
              ),
              maths('\\begin{aligned} x + y + z &= 6 & \\quad (1) \\\\ 2x - y + z &= 3 & \\quad (2) \\\\ x + 2y - z &= 2 & \\quad (3) \\end{aligned}'),
              prose(
                'Every $z$ coefficient is $1$ or $-1$. In (1) and (2) the signs match, so subtract; in (1) and (3) they are opposite, so add. That gives (4) from $(2) - (1)$ and (5) from $(1) + (3)$.',
              ),
              maths('\\begin{aligned} x - 2y &= -3 & \\quad (4) \\\\ 2x + 3y &= 8 & \\quad (5) \\end{aligned}'),
            ),
            ask('lin-tri-drop-flow'),
            ask('lin-tri-combine'),
            ask('lin-tri-drop-steps'),
            teach(
              prose(
                'Take away **every** term, the right-hand sides too, and watch the signs: $(2x - y + z) - (x + y + z) = 3 - 6$ is $x - 2y = -3$.',
              ),
              prose(
                'Adding or subtracting true equations gives a true equation, so the solution $(1, 2, 3)$ satisfies (4) and (5) as well: $1 - 4 = -3$ and $2 + 6 = 8$.',
              ),
            ),
            ask('lin-tri-drop-check'),
            ask('lin-tri-combine+choice'),
            ask('lin-tri-drop-flow', 2),
            teach(
              prose(
                'Pair (1) with **each** of the others, not (1) with (2) twice: the same pairing gives the same equation, and one equation cannot pin down two letters.',
              ),
            ),
            ask('lin-tri-drop-steps', 2),
            ask('lin-tri-drop-check+choice'),
          ],
          skillCheck: [ask('lin-tri-combine', 2), ask('lin-tri-drop-steps', 2), ask('lin-tri-drop-flow', 2)],
        },
        {
          id: 'le-l5-finish',
          title: 'Finishing Off',
          slides: [
            teach(
              prose('Removing $z$ from this system leaves the pair (4), from $(2) - (1)$, and (5), from $(1) + (3)$.'),
              maths('\\begin{aligned} x + 2y + z &= 8 & \\quad (1) \\\\ 2x + y + z &= 7 & \\quad (2) \\\\ x - y - z &= -4 & \\quad (3) \\end{aligned}'),
              maths('\\begin{aligned} x - y &= -1 & \\quad (4) \\\\ 2x + y &= 4 & \\quad (5) \\end{aligned}'),
              prose(
                'Solve the pair as in level 2: $(4) + (5)$ gives $3x = 3$, so $x = 1$. Then put back one letter at a time: (4) gives $1 - y = -1$, so $y = 2$, and (1) gives $1 + 4 + z = 8$, so $z = 3$.',
              ),
            ),
            ask('lin-tri-back-steps'),
            ask('lin-tri-finish-tree'),
            ask('lin-tri-solve'),
            teach(
              prose(
                'Then check in an **original** equation you did not use to put back. (2): $2 + 2 + 3 = 7$, so $(1, 2, 3)$ is right.',
              ),
              prose('A check against (4) or (5) would pass a slip made while building them, so it proves nothing.'),
            ),
            ask('lin-tri-verify'),
            ask('lin-tri-back-steps', 2),
            ask('lin-tri-solve+choice'),
            teach(
              prose(
                'The whole route: remove one letter twice, solve the pair, put back to find the third, check in an original.',
              ),
            ),
            ask('lin-tri-finish-tree', 2),
            ask('lin-tri-verify+choice'),
          ],
          skillCheck: [ask('lin-tri-solve', 2), ask('lin-tri-back-steps', 2), ask('lin-tri-finish-tree', 2)],
        },
        {
          id: 'le-l5-choose',
          title: 'Choosing the Letter',
          slides: [
            teach(
              prose('Any letter can go first, but some are quicker. Check in this order.'),
              prose(
                '**Missing** from one equation? Then that equation is already free of it, and one combination of the other two finishes the pair.',
              ),
              maths('\\begin{aligned} 2x - y + z &= 5 & \\quad (1) \\\\ 3x + 2z &= 14 & \\quad (2) \\\\ 4x + y + z &= 15 & \\quad (3) \\end{aligned}'),
              prose(
                '$y$ is missing from (2). $(1) + (3)$ gives $6x + 2z = 20$, and with (2) that is a pair in $x$ and $z$. Otherwise, a letter the **same size** in all three; otherwise scale.',
              ),
            ),
            ask('lin-tri-letter-flow'),
            ask('lin-tri-letter-choice'),
            ask('lin-tri-letter-flow', 2),
            teach(
              prose(
                'To scale, find a letter whose coefficient in one equation divides its coefficient in another. If (1) has $x$ and (3) has $3x$, multiply **every** term of (1) by $3$.',
              ),
              maths('\\begin{aligned} x + 2y - z &= 2 \\\\ 3x + 6y - 3z &= 6 \\end{aligned}'),
              prose('Now subtracting (3) removes $x$, exactly as before.'),
            ),
            ask('lin-tri-multiplier'),
            ask('lin-tri-scale-tiles'),
            ask('lin-tri-multiplier+choice'),
            teach(
              prose(
                'Missing beats matching, and matching beats scaling. When you do scale, scale the equation with the smaller coefficient, by a whole number.',
              ),
            ),
            ask('lin-tri-scale-tiles+choice'),
            ask('lin-tri-letter-choice', 2),
          ],
          skillCheck: [ask('lin-tri-letter-choice', 2), ask('lin-tri-scale-tiles', 2), ask('lin-tri-multiplier', 2)],
        },
        {
          id: 'le-l5-words',
          title: 'Three Unknowns from Words',
          slides: [
            teach(
              prose(
                'Three unknowns need three letters and three facts. Say what each letter stands for, then write each fact as an equation.',
              ),
              prose(
                'With $x$, $y$ and $z$ the prices of an adult, a child and a senior ticket, "$3$ child, $2$ adult and $1$ senior ticket cost £$37$" is',
              ),
              maths('2x + 3y + z = 37'),
              prose(
                'Each count stays with its own item, whatever order the sentence uses. "Ana gets $2$ more than Ben" is $x = y + 2$: start from Ben and add.',
              ),
            ),
            ask('lin-tri-words-tiles'),
            ask('lin-tri-words-fact'),
            ask('lin-tri-words-tiles+choice'),
            teach(
              prose(
                'When every fact is the total of a pair, add all three: each letter then appears twice.',
              ),
              maths('\\begin{aligned} x + y &= 70 & \\quad (1) \\\\ y + z &= 50 & \\quad (2) \\\\ x + z &= 60 & \\quad (3) \\end{aligned}'),
              prose(
                '$2x + 2y + 2z = 180$, so $x + y + z = 90$. Take away (1) and $z = 20$; take away (2) and $x = 40$; take away (3) and $y = 30$.',
              ),
            ),
            ask('lin-tri-sum-all-steps'),
            ask('lin-tri-words-fact', 2),
            ask('lin-tri-sum-all-steps', 2),
            teach(
              prose(
                'A share with a difference and a multiple: write everything in one letter. Ana, Ben and Cal share $30$ sweets, Ana gets $2$ more than Ben and Cal twice what Ben gets.',
              ),
              maths('\\begin{gathered} (y + 2) + y + 2y = 30 \\\\ 4y = 28 \\\\ y = 7 \\end{gathered}'),
              prose('So Ben has $7$, Ana $9$ and Cal $14$. Check against the **words**: $9 + 7 + 14 = 30$.'),
            ),
            ask('lin-tri-words-solve'),
            ask('lin-tri-words-solve+choice', 2),
          ],
          skillCheck: [ask('lin-tri-words-solve', 2), ask('lin-tri-words-tiles', 2), ask('lin-tri-sum-all-steps', 2)],
        },
      ],
      levelCheck: [
        ask('lin-tri-which', 2),
        ask('lin-tri-third', 2),
        ask('lin-tri-check-flow', 2),
        ask('lin-tri-combine', 2),
        ask('lin-tri-drop-steps', 2),
        ask('lin-tri-drop-flow', 2),
        ask('lin-tri-finish-tree', 2),
        ask('lin-tri-back-steps', 2),
        ask('lin-tri-solve', 2),
        ask('lin-tri-letter-flow', 2),
        ask('lin-tri-scale-tiles', 2),
        ask('lin-tri-multiplier', 2),
        ask('lin-tri-words-tiles', 2),
        ask('lin-tri-words-solve', 2),
        ask('lin-tri-sum-all-steps', 2),
      ],
    },
    {
      id: 'le-l6',
      title: 'Inequalities in Two Variables & Regions',
      lessons: [
        {
          id: 'le-l6-overlap',
          title: 'Two at Once',
          slides: [
            teach(
              prose(
                'Each inequality in $x$ and $y$ is a half-plane, as in Linear Inequalities. With two at once, the region is where **both** hold: the overlap.',
              ),
              boundaries(
                [
                  { f: (x) => x - 1, dashed: false },
                  { f: (x) => -x + 3, dashed: true },
                ],
                [{ x: 0, y: 1 }],
                'A solid line y = x - 1 and a dashed line y = -x + 3 crossing at (2, 1), with a dot at (0, 1)',
              ),
              maths('\\begin{gathered} y \\ge x - 1 \\\\ y < -x + 3 \\end{gathered}'),
              prose(
                'A point is in only if it passes both tests. $(0, 1)$ gives $1 \\ge -1$ and $1 < 3$, so it is in. $(3, 3)$ passes the first but gives $3 < 0$ in the second, so it is out.',
              ),
            ),
            ask('lin-overlap-flow'),
            ask('lin-overlap-which'),
            ask('lin-overlap-tree'),
            teach(
              prose(
                'Test the first; only if it passes is the second worth doing. In the form $ax + by$, work out the left-hand side and compare it with the right.',
              ),
              maths('\\begin{gathered} 2x + y \\le 6 \\\\ x - 3y > -3 \\end{gathered}'),
              prose(
                'At $(1, 2)$: $2 + 2 = 4$, and $4 \\le 6$ is true. Then $1 - 6 = -5$, and $-5 > -3$ is false. So $(1, 2)$ is not in the region.',
              ),
            ),
            ask('lin-overlap-side'),
            ask('lin-overlap-flow', 2),
            ask('lin-overlap-which', 2),
            teach(
              prose(
                'A point on a boundary passes when the sign has "or equal to" and fails when it is strict. $(2, 1)$ is where the lines of the first example cross: $y \\ge x - 1$ gives $1 \\ge 1$, true, but $y < -x + 3$ gives $1 < 1$, false, so it is left out.',
              ),
            ),
            ask('lin-overlap-tree', 2),
            ask('lin-overlap-side', 2),
          ],
          skillCheck: [ask('lin-overlap-which', 2), ask('lin-overlap-flow', 2), ask('lin-overlap-tree', 2)],
        },
        {
          id: 'le-l6-read',
          title: 'Reading a Region',
          slides: [
            teach(
              prose(
                'To read a pictured region, write one inequality per boundary. A dashed line is strict; a solid one has "or equal to". The dot shows the side.',
              ),
              boundaries(TRIANGLE, [{ x: 1, y: -1 }], 'A triangle: solid y = x, dashed y = -x + 2, solid y = -2, with a dot at (1, -1)'),
              prose(
                'The dot $(1, -1)$ is below $y = x$ and below $y = -x + 2$, and above $y = -2$. So the region is',
              ),
              maths('\\begin{gathered} y \\le x \\\\ y < -x + 2 \\\\ y \\ge -2 \\end{gathered}'),
            ),
            ask('lin-read-flow'),
            ask('lin-read-signs'),
            ask('lin-read-system'),
            teach(
              prose(
                'In the form $ax + by$, "below" need not mean "less". $y \\le x$ is also $x - y \\ge 0$: at the dot, $1 - (-1) = 2$, which is more than $0$.',
              ),
              prose('So put the dot in and compare, rather than reading the side from the sign.'),
            ),
            ask('lin-read-flow', 2),
            ask('lin-read-signs', 2),
            ask('lin-read-system', 2),
            teach(
              prose(
                'To name a boundary, read it off the grid as $y = mx + c$: $c$ is where it crosses the $y$-axis, $m$ how far it rises for each $1$ across.',
              ),
              prose(
                'The dashed line crosses the $y$-axis at $2$ and drops $1$ for each $1$ across, so it is $y = -x + 2$.',
              ),
            ),
            ask('lin-read-line'),
            ask('lin-read-line', 2),
          ],
          skillCheck: [ask('lin-read-signs', 2), ask('lin-read-system', 2), ask('lin-read-flow', 2)],
        },
        {
          id: 'le-l6-corners',
          title: 'Corners',
          slides: [
            teach(
              prose(
                'A corner of a region is where two boundaries meet, found as in Simultaneous Linear Equations. Where $y = x$ meets $y = -x + 2$ the two $y$ values are equal:',
              ),
              maths('\\begin{gathered} x = -x + 2 \\\\ 2x = 2 \\\\ x = 1 \\end{gathered}'),
              boundaries(TRIANGLE, [{ x: 1, y: 1 }], 'The same triangle with its top corner, (1, 1), marked'),
              prose('Either line then gives $y = 1$, so the corner is $(1, 1)$.'),
            ),
            ask('lin-corner-steps'),
            ask('lin-corner-value'),
            ask('lin-corner-slider'),
            teach(
              prose(
                'Check a corner in **both** boundaries. At $x = 1$, $y = x$ gives $1$ and $y = -x + 2$ gives $-1 + 2 = 1$. They agree, so $(1, 1)$ is on both.',
              ),
              prose('A point that fits one line only is somewhere else along it, not the corner.'),
            ),
            ask('lin-corner-check-tree'),
            ask('lin-corner-steps', 2),
            teach(
              prose(
                'In the form $ax + by$, eliminate a letter, as in Simultaneous Linear Equations. With opposite signs, add: $x + y = 6$ and $x - y = 2$ give $2x = 8$, so $x = 4$ and $y = 2$.',
              ),
              prose('When no coefficient matches, scale one line first.'),
              maths('\\begin{aligned} 2x + 3y &= 12 & \\quad (1) \\\\ x - y &= 1 & \\quad (2) \\end{aligned}'),
              prose('Multiply every term of (2) by $2$, so both have $2x$: $2x - 2y = 2$. Subtract it from (1):'),
              maths('\\begin{gathered} 3y - (-2y) = 12 - 2 \\\\ 5y = 10 \\\\ y = 2 \\end{gathered}'),
              prose('Then (2) gives $x - 2 = 1$, so $x = 3$. The corner is $(3, 2)$.'),
            ),
            ask('lin-corner-slider', 2),
            ask('lin-corner-value', 2),
            ask('lin-corner-check-tree', 2),
          ],
          skillCheck: [ask('lin-corner-value', 2), ask('lin-corner-steps', 2), ask('lin-corner-slider', 2)],
        },
        {
          id: 'le-l6-points',
          title: 'Whole-Number Points',
          slides: [
            teach(
              prose(
                'The points with whole-number coordinates in a region are found column by column, as the integers in a set were in Linear Inequalities.',
              ),
              boundaries(TRIANGLE, [], 'The triangle: solid y = x, dashed y = -x + 2, solid y = -2'),
              prose(
                'In the column $x = 0$: $y \\ge -2$, $y \\le 0$ and $y < 2$, so $y = -2, -1, 0$. A point on a solid line counts; one on a dashed line does not.',
              ),
            ),
            ask('lin-lattice-which'),
            ask('lin-lattice-column'),
            ask('lin-lattice-count'),
            teach(
              prose(
                'Corners are whole points on two lines at once, so check them with care. $(1, 1)$ is on the dashed $y = -x + 2$, so it is out. $(-2, -2)$ is on two solid lines and passes the third, so it counts.',
              ),
            ),
            ask('lin-lattice-flow'),
            ask('lin-lattice-which', 2),
            ask('lin-lattice-column', 2),
            teach(
              prose('Then add the columns. From $x = -2$ to $x = 3$ this triangle has'),
              maths('1 + 2 + 3 + 3 + 2 + 1 = 12'),
              prose('points. The column $x = 4$ is empty, since its only candidate, the corner $(4, -2)$, is on the dashed line.'),
            ),
            ask('lin-lattice-count', 2),
            ask('lin-lattice-flow', 2),
          ],
          skillCheck: [ask('lin-lattice-count', 2), ask('lin-lattice-which', 2), ask('lin-lattice-flow', 2)],
        },
        {
          id: 'le-l6-words',
          title: 'Regions from Words',
          slides: [
            teach(
              prose(
                'In a story, say what $x$ and $y$ count, then write each sentence as an inequality: "at most" is $\\le$, "at least" is $\\ge$, "less than" and "more than" are $<$ and $>$.',
              ),
              prose(
                'Adult tickets cost £$3$ and child tickets £$2$. With $x$ adults and $y$ children, spending at most £$24$ and taking at least $3$ children is',
              ),
              maths('\\begin{gathered} 3x + 2y \\le 24 \\\\ y \\ge 3 \\end{gathered}'),
              prose('A count cannot be negative, so $x \\ge 0$ and $y \\ge 0$ come with it.'),
            ),
            ask('lin-story-tiles'),
            ask('lin-story-system'),
            ask('lin-story-meet-steps'),
            teach(
              prose(
                'The corners are where the boundaries meet. $y = 3$ meets the $y$-axis at $(0, 3)$, and $3x + 2y = 24$ meets it at $(0, 12)$. The last is where $3x + 2y = 24$ meets $y = 3$:',
              ),
              maths('\\begin{gathered} 3x + 2 \\times 3 = 24 \\\\ 3x = 18 \\\\ x = 6 \\end{gathered}'),
              prose('So the corners are $(0, 3)$, $(0, 12)$ and $(6, 3)$.'),
            ),
            ask('lin-story-most'),
            ask('lin-story-tiles', 2),
            ask('lin-story-system', 2),
            teach(
              prose(
                'The most tickets altogether, $x + y$, is at a corner: $3$, $12$ and $9$ at the three. So $12$ is the most, all of them child tickets.',
              ),
            ),
            ask('lin-story-meet-steps', 2),
            ask('lin-story-most', 2),
          ],
          skillCheck: [ask('lin-story-tiles', 2), ask('lin-story-system', 2), ask('lin-story-most', 2)],
        },
      ],
      levelCheck: [
        ask('lin-overlap-flow', 2),
        ask('lin-overlap-which', 2),
        ask('lin-overlap-side', 2),
        ask('lin-read-signs', 2),
        ask('lin-read-system', 2),
        ask('lin-read-line', 2),
        ask('lin-corner-steps', 2),
        ask('lin-corner-slider', 2),
        ask('lin-corner-check-tree', 2),
        ask('lin-lattice-count', 2),
        ask('lin-lattice-column', 2),
        ask('lin-lattice-flow', 2),
        ask('lin-story-tiles', 2),
        ask('lin-story-most', 2),
        ask('lin-story-meet-steps', 2),
      ],
    },
    {
      id: 'le-l7',
      title: 'Modelling with Linear Equations',
      lessons: [
        {
          id: 'le-l7-naming',
          title: 'Naming the Unknown',
          slides: [
            teach(
              prose(
                'A story becomes an equation once one quantity has a letter. Pick the one the others are described **from**, so every other quantity can be written from it without fractions.',
              ),
              prose('"Ben has $3$ more than twice as many as Amy, and Cara has $4$ fewer than Amy." Both are described from Amy, so Amy has $x$:'),
              maths('\\begin{gathered} \\text{Amy: } x \\\\ \\text{Ben: } 2x + 3 \\\\ \\text{Cara: } x - 4 \\end{gathered}'),
            ),
            ask('lin-name-letter'),
            ask('lin-name-express'),
            ask('lin-name-letter', 2),
            teach(
              prose('The sentence with the total gives the equation. Add the quantities, then collect like terms. If together they have $39$:'),
              maths('\\begin{gathered} x + (2x + 3) + (x - 4) = 39 \\\\ 4x - 1 = 39 \\end{gathered}'),
              prose('Keep the brackets while adding, so each sign stays with its number.'),
            ),
            ask('lin-name-total'),
            ask('lin-name-express', 2),
            ask('lin-name-tree'),
            teach(
              prose('Solving gives $x$, but $x$ is only what the letter stood for. From $4x - 1 = 39$, $x = 10$: Amy has $10$, Ben $23$ and Cara $6$.'),
              prose(
                "Answer the question that was asked, in the story's units. If it asked for Ben's, the answer is $23$, not $10$. And check it against the words: $10 + 23 + 6 = 39$.",
              ),
            ),
            ask('lin-name-solve'),
            ask('lin-name-solve+choice', 2),
          ],
          skillCheck: [ask('lin-name-express', 2), ask('lin-name-total', 2), ask('lin-name-solve', 2)],
        },
        {
          id: 'le-l7-break-even',
          title: 'Break-Even',
          slides: [
            teach(
              prose(
                'A seller pays a **fixed cost** once, whatever they sell, and a **cost per item** for each one made. The **income** is the price times the number sold.',
              ),
              prose('A stall pays £$36$ to hire a table. Each cake costs £$2$ to make and sells for £$5$. With $n$ cakes sold:'),
              maths('\\begin{gathered} \\text{income} = 5n \\\\ \\text{costs} = 36 + 2n \\end{gathered}'),
              prose('It **breaks even** when the two are equal: no profit and no loss.'),
            ),
            ask('lin-even-tiles'),
            ask('lin-even-table'),
            teach(
              prose(
                'Solve it like any equation with the unknown on both sides, as in Solving Linear Equations: take $2n$ from both sides, then divide by $3$.',
              ),
              maths('\\begin{gathered} 5n = 36 + 2n \\\\ 3n = 36 \\\\ n = 12 \\end{gathered}'),
              prose(
                'The $3$ is what each cake makes over its own cost, and $12$ lots of £$3$ pay back the £$36$. On a graph, break-even is where the income line crosses the cost line.',
              ),
            ),
            ask('lin-even-count'),
            ask('lin-even-slider'),
            ask('lin-even-count+choice', 2),
            ask('lin-even-tiles', 2),
            teach(
              prose('Sell more than the break-even number and the income wins: a **profit**. Sell fewer and the costs win: a **loss**.'),
              prose(
                'At $20$ cakes the income is £$100$ and the costs £$76$, a profit of £$24$. At $10$ it is £$50$ against £$56$, a loss of £$6$. Each cake either side of $12$ moves it by £$3$.',
              ),
            ),
            ask('lin-even-flow'),
            ask('lin-even-flow', 2),
          ],
          skillCheck: [ask('lin-even-count', 2), ask('lin-even-tiles', 2), ask('lin-even-flow', 2)],
        },
        {
          id: 'le-l7-rates',
          title: 'Rates',
          slides: [
            teach(
              prose('Distance is speed times time. With the time as the unknown $t$, each traveller covers their speed times $t$.'),
              prose('Two walkers $18$ km apart head towards each other at $4$ km/h and $5$ km/h. Between them they cover the whole gap:'),
              maths('\\begin{gathered} 4t + 5t = 18 \\\\ 9t = 18 \\\\ t = 2 \\end{gathered}'),
              prose('The gap closes at $4 + 5 = 9$ km/h, which is why the speeds add.'),
            ),
            ask('lin-rate-tiles'),
            ask('lin-rate-meet'),
            ask('lin-rate-where-tree'),
            teach(
              prose('Catching up goes the same way, so the gap closes at the **difference** of the speeds.'),
              prose('Asha starts $6$ km ahead at $4$ km/h and Ben follows at $7$ km/h. Ben catches her when they are the same distance along:'),
              maths('\\begin{gathered} 7t = 6 + 4t \\\\ 3t = 6 \\\\ t = 2 \\end{gathered}'),
              prose('On a distance-time graph, the catch is where the two lines cross.'),
            ),
            ask('lin-rate-catch'),
            askAfter(
              'lin-rate-meet+choice',
              2,
              prose(
                'When one sets off first, count what they cover alone, then close the rest of the gap. Ana and Bo are $62$ km apart. Ana sets off at $6$ km/h, and Bo follows $1$ hour later at $8$ km/h, towards her.',
              ),
              prose(
                'In that first hour Ana covers $6$ km. After that the gap closes at $6 + 8 = 14$ km/h, for $t$ hours after Bo sets off:',
              ),
              maths('\\begin{gathered} 6 + 14t = 62 \\\\ 14t = 56 \\\\ t = 4 \\end{gathered}'),
            ),
            ask('lin-rate-tiles', 2),
            teach(
              prose(
                'A rate can fill as well as move. A tank with $20$ litres in it, filling at $7$ litres a minute while $3$ drain out, rises by $7 - 3 = 4$ litres a minute:',
              ),
              maths('\\begin{gathered} 20 + (7 - 3)t = 60 \\\\ 4t = 40 \\\\ t = 10 \\end{gathered}'),
              prose('If more drains out than flows in, the net rate is negative and the level falls.'),
            ),
            ask('lin-rate-tank'),
            askAfter(
              'lin-rate-catch',
              2,
              prose(
                'A later start works like a head start in time. Cy cycles at $12$ km/h, and Di leaves the same place $1$ hour later at $16$ km/h. After $t$ hours from Cy\'s start, Di has had $t - 1$ hours. She catches him when they have gone the same distance:',
              ),
              maths('\\begin{gathered} 16(t - 1) = 12t \\\\ 16t - 16 = 12t \\\\ 4t = 16 \\\\ t = 4 \\end{gathered}'),
            ),
          ],
          skillCheck: [ask('lin-rate-meet', 2), ask('lin-rate-tiles', 2), ask('lin-rate-tank', 2)],
        },
        {
          id: 'le-l7-mixtures',
          title: 'Mixtures',
          slides: [
            teach(
              prose(
                'A mixture has two unknowns, how much of each goes in, so it needs two letters and two facts: one about the **amounts** and one about the **cost**. This is Simultaneous Linear Equations again, from a new kind of story.',
              ),
              prose('Cashews at £$12$ per kg and peanuts at £$4$ per kg make $8$ kg of mix at £$7$ per kg. With $x$ kg of cashews and $y$ kg of peanuts:'),
              maths('\\begin{gathered} x + y = 8 \\\\ 12x + 4y = 56 \\end{gathered}'),
              prose(
                'The $56$ is the whole mix: $8$ kg at £$7$. Leaving it as $7$ is the usual slip. As the cashews go from none to all $8$ kg, the price per kg runs in a straight line from £$4$ to £$12$.',
              ),
            ),
            ask('lin-mix-pair'),
            ask('lin-mix-tiles'),
            teach(
              prose('Solve by substitution: $y = 8 - x$, so'),
              maths('\\begin{gathered} 12x + 4(8 - x) = 56 \\\\ 8x + 32 = 56 \\\\ 8x = 24 \\\\ x = 3 \\end{gathered}'),
              prose('So $3$ kg of cashews and $5$ kg of peanuts. Check: $36 + 20 = 56$.'),
            ),
            ask('lin-mix-substitute-steps'),
            ask('lin-mix-solve'),
            ask('lin-mix-slider'),
            ask('lin-mix-tiles', 2),
            teach(
              prose(
                'A **strength** works the same way. A $40\\%$ acid and a $10\\%$ acid make $30$ litres at $20\\%$. Counting per cent times litres, $40x + 10y = 20 \\times 30 = 600$, with $x + y = 30$. Substitute $y = 30 - x$:',
              ),
              maths('\\begin{gathered} 40x + 10(30 - x) = 600 \\\\ 30x + 300 = 600 \\\\ 30x = 300 \\\\ x = 10 \\end{gathered}'),
              prose('So $10$ litres of the strong acid and $y = 30 - 10 = 20$ litres of the weak.'),
            ),
            askWith(
              'lin-mix-flow',
              'Compare the target with each ingredient. The acid target $20$ is $10$ from the weak $10\\%$ and $20$ from the strong $40\\%$, and the answer was $20$ litres weak to $10$ strong. Like a seesaw, each amount times its distance balances: $20 \\times 10 = 10 \\times 20$. So the target sits nearer the one there is more of. The nuts agree: £$7$ is $3$ from the peanuts and $5$ from the cashews, with $5$ kg of peanuts and $3$ of cashews, and $5 \\times 3 = 3 \\times 5$.',
            ),
            ask('lin-mix-solve+choice', 2),
          ],
          skillCheck: [ask('lin-mix-tiles', 2), ask('lin-mix-solve', 2), ask('lin-mix-substitute-steps', 2)],
        },
        {
          id: 'le-l7-reading',
          title: 'Reading the Model Back',
          slides: [
            teach(
              prose('Before solving, check the equation says what the story says, reading each part back in words.'),
              prose('A plumber charges £$40$ to call out plus £$30$ an hour. The fee is paid once and the rate once per hour, so a £$130$ bill for $h$ hours is'),
              maths('40 + 30h = 130'),
              prose(
                'Not $(40 + 30)h = 130$, which charges the fee every hour. After solving, read the answer back too: half a cake cannot be sold, a time cannot be negative, and one part of a mix cannot weigh more than the whole.',
              ),
            ),
            ask('lin-back-which'),
            ask('lin-back-sense-flow'),
            ask('lin-back-which', 2),
            teach(
              prose("A formula can be turned round to give the story's unknown straight away. Undo in reverse order, as in Rearranging Formulae:"),
              maths('\\begin{gathered} C = 40 + 30h \\\\ C - 40 = 30h \\\\ h = (C - 40) \\div 30 \\end{gathered}'),
              prose('Then any bill gives its hours at once: a £$130$ bill is $(130 - 40) \\div 30 = 3$ hours.'),
            ),
            ask('lin-back-rearrange'),
            ask('lin-back-sense-flow', 2),
            askAfter(
              'lin-back-rearrange',
              2,
              prose(
                'When the letter term is taken away, add it to both sides first so it is positive. A tank holding $100$ litres that drains at $5$ litres a minute has $V = 100 - 5t$:',
              ),
              maths('\\begin{gathered} V + 5t = 100 \\\\ 5t = 100 - V \\\\ t = (100 - V) \\div 5 \\end{gathered}'),
            ),
            teach(
              prose(
                'Changing one number moves the answer in a way you can predict. A fixed cost of £$60$ with £$4$ made on each sale breaks even at $60 \\div 4 = 15$.',
              ),
              prose(
                'Put the price up by £$2$ and each sale makes £$6$, so $60 \\div 6 = 10$ are enough. A bigger fixed cost goes the other way: £$80$ at £$4$ a sale needs $20$.',
              ),
            ),
            ask('lin-back-change'),
            ask('lin-back-change+choice', 2),
          ],
          skillCheck: [ask('lin-back-which', 2), ask('lin-back-change', 2), ask('lin-back-rearrange', 2)],
        },
      ],
      levelCheck: [
        ask('lin-name-total', 2),
        ask('lin-name-solve', 2),
        ask('lin-name-tree', 2),
        ask('lin-even-count', 2),
        ask('lin-even-slider', 2),
        ask('lin-even-flow', 2),
        ask('lin-rate-meet', 2),
        ask('lin-rate-catch', 2),
        ask('lin-rate-tank', 2),
        ask('lin-mix-tiles', 2),
        ask('lin-mix-solve', 2),
        ask('lin-mix-substitute-steps', 2),
        ask('lin-back-which', 2),
        ask('lin-back-sense-flow', 2),
        ask('lin-back-change', 2),
      ],
    },
  ],
};
