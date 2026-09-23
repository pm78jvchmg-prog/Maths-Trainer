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
 *
 * Later levels — inequalities, rearranging formulae, modelling — are in the
 * level plan in `docs/roadmap/levels/linear-equations.md`.
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

export const linearEquations: Course = {
  id: 'linear-equations',
  category: 'algebra-fundamentals',
  position: 30,
  title: 'Linear Equations & Inequalities',
  blurb: 'Undoing what was done to the unknown, for one equation and then for two at once.',
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
            ask('lin-undo-flow'),
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
                'Take $2x$ from both sides. The equation stays balanced, and now only the left has $x$.',
              ),
              maths('3x + 3 = 15'),
              prose('That is a two-step equation: take away $3$, then divide by $3$, giving $x = 4$.'),
            ),
            ask('lin-collect-flow'),
            ask('lin-collect-tiles'),
            ask('lin-both-sides-steps'),
            teach(
              prose(
                'Collect the $x$ terms on the side with **more** $x$, so the coefficient left over is positive. In $2x + 9 = 5x - 3$ that is the right.',
              ),
              maths('\\begin{gathered} 9 = 3x - 3 \\\\ 12 = 3x \\\\ x = 4 \\end{gathered}'),
              prose(
                'Each side is a straight line, and the solution is where they cross: there both sides have the same value.',
              ),
              lines(
                [(x) => 2 * x + 9, (x) => 5 * x - 3],
                { xMin: -1, xMax: 7, yMin: -6, yMax: 30 },
                'The lines y = 2x + 9 and y = 5x - 3 crossing at x = 4',
              ),
            ),
            ask('lin-both-sides'),
            ask('lin-meet-slider'),
            ask('lin-collect-tiles+choice'),
            teach(
              prose(
                'With negatives, "more $x$" means the larger coefficient, sign included: $-2x$ is less $x$ than $3x$, so in $-2x + 1 = 3x - 9$ the $x$ terms collect on the right.',
              ),
              prose(
                'Checking needs both sides now. Put the answer into each side separately; they must come to the same number.',
              ),
            ),
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
            ask('lin-bracket-flow'),
            ask('lin-brackets'),
            teach(
              prose(
                'When the bracket is alone on its side, dividing first is shorter. The whole bracket is multiplied by $4$, so divide both sides by $4$.',
              ),
              maths('\\begin{gathered} 4(x + 3) = 28 \\\\ x + 3 = 7 \\\\ x = 4 \\end{gathered}'),
              prose('Expanding gets the same answer, one step later: $4x + 12 = 28$, $4x = 16$.'),
            ),
            ask('lin-brackets-tree'),
            askWith('lin-check', 'Brackets make checking worth doing. Work out the inside of the bracket first.', 2),
            ask('lin-expand-tiles+choice'),
            teach(
              prose(
                'An $x$ outside the bracket means expanding first, so the $x$ terms can be collected.',
              ),
              maths('\\begin{gathered} 2(x + 5) = 4x - 2 \\\\ 2x + 10 = 4x - 2 \\\\ x = 6 \\end{gathered}'),
              prose(
                'A negative number outside changes every sign inside: $-3(x - 2) = -3x + 6$.',
              ),
            ),
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
            ask('lin-words-solve'),
            ask('lin-cost-slider', 2),
            ask('lin-words-solve', 2),
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
            ask('lin-elim-flow'),
            ask('lin-elim-combine'),
            ask('lin-elim-solve'),
            teach(
              prose('When the matching coefficients have **opposite** signs, add the equations instead.'),
              maths('\\begin{aligned} 2x + y &= 11 & \\quad (1) \\\\ 5x - y &= 17 & \\quad (2) \\end{aligned}'),
              maths('\\begin{gathered} 7x = 28 \\\\ x = 4 \\end{gathered}'),
              prose('Putting $x = 4$ into (1): $8 + y = 11$, so $y = 3$.'),
            ),
            askWith('lin-sim-back-sub', 'After eliminating, one value is known. Finish the pair.'),
            ask('lin-elim-combine+choice'),
            askWith('lin-sim-check', 'Check a pair found by elimination, one equation at a time.'),
            teach(
              prose(
                'The rule in four words: **same sign, subtract**; opposite signs, add. Subtracting a negative is the step that goes wrong, so take it one term at a time.',
              ),
            ),
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
            ask('lin-sub-collect'),
            ask('lin-sub'),
            teach(
              prose(
                'The bracket is where substitution goes wrong. The $2$ multiplies **both** terms of $2x - 1$.',
              ),
              maths('\\begin{gathered} 3x + 4x - 2 = 12 \\\\ 7x = 14 \\\\ x = 2 \\end{gathered}'),
              prose('Then (1) gives $y = 2 \\times 2 - 1 = 3$.'),
            ),
            ask('lin-sub-steps'),
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
            ask('lin-sim-words-solve'),
            ask('lin-method-flow', 2),
            teach(
              prose('Two numbers from their sum and difference is the quickest pair of all.'),
              maths('\\begin{aligned} x + y &= 23 \\\\ x - y &= 7 \\end{aligned}'),
              prose(
                'Adding gives $2x = 30$, so the larger is $15$; subtracting gives $2y = 16$, so the smaller is $8$. The larger is always half of sum plus difference.',
              ),
            ),
            ask('lin-sum-diff'),
            ask('lin-sim-words-setup+choice'),
            ask('lin-sum-diff+choice'),
            teach(
              prose(
                'Check the answer against the **words**, not only the equations. If the equations were written wrongly, the answer will satisfy them and still not fit the story.',
              ),
            ),
            ask('lin-sim-words-solve', 2),
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
  ],
};
