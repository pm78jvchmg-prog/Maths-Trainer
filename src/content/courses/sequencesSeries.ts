/**
 * Sequences & Series.
 *
 * Level 1 is sequences. It starts from the two ways a rule can give a
 * sequence — from a term's position, or from the term before — then builds
 * the two families with a formula, arithmetic and geometric, reads what the
 * differences between terms say about a sequence, and ends on recurrence
 * relations. Level 2 adds the terms up: sigma notation, the arithmetic and
 * geometric sums, the sum to infinity, and series met in words.
 *
 * Level 3 asks where a sequence goes: increasing, decreasing or periodic,
 * the limit L = pL + q of a recurrence and when it is really there, limits of
 * position-to-term rules, and how fast the gap to a limit closes.
 *
 * Level 4 adds up powers: the standard results for Σr, Σr² and Σr³, sums
 * built from them, sums that do not start at 1, and the method of
 * differences, finite and to infinity, with the split always given.
 *
 * Level 5 proves sum formulae by induction: the step S_{k+1} = S_k + u_{k+1},
 * the standard results tidied by their common factor (k + 1), arithmetic and
 * geometric sums, the closed form of a recurrence, and reading and checking
 * a proof: a claim tested on its first terms, the base case where the claim
 * starts, and a step that assumes what it has to show.
 *
 * Level 6 puts series to work on money: savings paid in each year, whose
 * balance is a geometric series; a loan grown by interest and cut by a
 * repayment until it clears, and the interest paid; the first year a balance
 * passes a target and the payment that reaches one; whether a story adds the
 * same amount or multiplies by the same factor; and two pay plans, a fixed
 * rise against a percentage one.
 *
 * The next level, harder arithmetic and geometric problems, is in the level
 * plan in `docs/roadmap/levels/sequences-series.md`.
 *
 * Each level closes with a level check: fifteen questions, no teaching
 * slides, one attempt each.
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

/** The partial sums of 8 + 4 + 2 + … as dots, closing in on 16. */
const partialSums: Block = {
  kind: 'diagram',
  svg: plotSvg({
    xMin: 0,
    xMax: 8,
    yMin: -1,
    yMax: 18,
    curves: [],
    marks: [1, 2, 3, 4, 5, 6, 7].map((n) => ({ x: n, y: 16 * (1 - 0.5 ** n) })),
    horizontals: [16],
    label: 'Partial sums 8, 12, 14, 15 and on, closing in on a dashed line at 16',
  }),
};

export const sequencesSeries: Course = {
  id: 'sequences-series',
  category: 'algebra-fundamentals',
  position: 60,
  // Its further-maths levels are shown in Series & Induction; see placement.ts.
  title: 'Sequences & Series',
  blurb: 'Rules that build a list of numbers term by term, and what those terms add up to.',
  levels: [
    {
      id: 'sq-l1',
      title: 'Sequences',
      lessons: [
        {
          id: 'sq-l1-rules',
          title: 'Rules for Sequences',
          slides: [
            teach(
              prose(
                'A sequence is a list of numbers in order. The terms are called $u_1, u_2, u_3, \\dots$, and $u_n$ is the term in position $n$.',
              ),
              prose('A rule can give the terms in two ways. A **position-to-term** rule works out each term from its position $n$:'),
              maths('\\begin{gathered} u_n = 3n + 2 \\\\ 5, \\; 8, \\; 11, \\; 14, \\; \\dots \\end{gathered}'),
              prose(
                'A **term-to-term** rule works out each term from the one before: start at $5$, then add $3$ each time. Written with symbols, the next term is $u_{n+1} = u_n + 3$.',
              ),
            ),
            ask('seq-rule-table'),
            ask('seq-rule-kind'),
            ask('seq-term'),
            teach(
              prose(
                'To find a term far along, say $u_{50}$, the kind of rule matters. A position-to-term rule gets there in one step: put $n = 50$ in.',
              ),
              maths('\\begin{aligned} u_{50} &= 3 \\times 50 + 2 \\\\ &= 152 \\end{aligned}'),
              prose(
                'A term-to-term rule has no $n$ to put in. It only ever gives the next term, so reaching $u_{50}$ means working through all $49$ terms before it.',
              ),
              prose('Position-to-term rules need not be straight-line ones. $u_n = n^2 + 1$ gives $2, 5, 10, 17, \\dots$'),
            ),
            ask('seq-method-flow'),
            ask('seq-rule-table', 2),
            ask('seq-term+choice'),
            teach(
              prose(
                'Look at the **right-hand side** to tell the two apart, not the subscript on the left. If an earlier term such as $u_n$ appears there, the rule is term-to-term.',
              ),
              maths('u_{n+1} = 3n + 1'),
              prose('This is position-to-term: only $n$ is on the right.'),
              maths('u_n = u_{n-1} + 4'),
              prose('This is term-to-term: it needs $u_{n-1}$, the term before.'),
            ),
            ask('seq-rule-kind', 2),
            ask('seq-method-flow', 2),
          ],
          skillCheck: [ask('seq-term', 2), ask('seq-rule-table', 2), ask('seq-rule-kind', 2)],
        },
        {
          id: 'sq-l1-arithmetic',
          title: 'Arithmetic Sequences',
          slides: [
            teach(
              prose(
                'An **arithmetic** sequence adds the same number every time. That number is the common difference $d$; the first term is $a$.',
              ),
              maths('\\begin{gathered} 7, \\; 11, \\; 15, \\; 19, \\; \\dots \\\\ a = 7, \\; d = 4 \\end{gathered}'),
              prose(
                'To reach $u_n$ from $u_1$ takes $n - 1$ steps of $d$, not $n$: the first term has no $d$ added to it yet.',
              ),
              maths('\\begin{aligned} u_n &= a + (n - 1)d \\\\ &= 7 + 4(n - 1) \\\\ &= 4n + 3 \\end{aligned}'),
            ),
            ask('seq-ap-table'),
            ask('seq-ap-nth-tiles'),
            ask('seq-ap-term'),
            teach(
              prose(
                'Given two terms that are not next to each other, count the steps between them. From $u_3 = 11$ to $u_7 = 27$ is $4$ steps:',
              ),
              maths('\\begin{gathered} 4d = 27 - 11 = 16 \\\\ d = 4 \\end{gathered}'),
              prose('Then step back from $u_3$ to the start: $u_3 = a + 2d$, so $a = 11 - 8 = 3$.'),
            ),
            ask('seq-ap-tree'),
            ask('seq-ap-term+choice'),
            ask('seq-ap-nth-tiles', 2),
            teach(
              prose(
                'To find **which** term a number is, set the $n$th term equal to it and solve. For $3, 7, 11, \\dots$ the $n$th term is $4n - 1$:',
              ),
              maths('\\begin{gathered} 4n - 1 = 87 \\\\ n = 22 \\end{gathered}'),
              prose('If $n$ does not come out whole, the number is not in the sequence at all.'),
            ),
            ask('seq-which-term'),
            ask('seq-ap-tree', 2),
          ],
          skillCheck: [ask('seq-ap-nth-tiles', 2), ask('seq-ap-term', 2), ask('seq-which-term', 2)],
        },
        {
          id: 'sq-l1-geometric',
          title: 'Geometric Sequences',
          slides: [
            teach(
              prose(
                'A **geometric** sequence multiplies by the same number every time. That number is the common ratio $r$: divide any term by the one before it.',
              ),
              maths('\\begin{gathered} 3, \\; 6, \\; 12, \\; 24, \\; \\dots \\\\ a = 3, \\; r = 2 \\end{gathered}'),
              prose(
                'To reach $u_n$, $r$ is multiplied in $n - 1$ times, so $u_n = ar^{n-1}$. Here $u_n = 3 \\times 2^{n-1}$.',
              ),
              prose(
                'The ratio can be a fraction, as in $96, 48, 24, \\dots$ where $r = \\frac{1}{2}$, or negative, as in $2, -6, 18, \\dots$ where $r = -3$ and the signs alternate. Growth by a percentage is geometric too, which the growth lesson in Exponents & Radicals covers.',
              ),
            ),
            ask('seq-gp-table'),
            ask('seq-gp-term'),
            ask('seq-gp-nth-tiles'),
            teach(
              prose('Given two terms, divide one by the other. Next to each other, that gives $r$ at once.'),
              prose('Three apart, it gives $r^3$, since $r$ is multiplied in three times between them:'),
              maths('\\begin{gathered} u_2 = 6, \\; u_5 = 48 \\\\ r^3 = 48 \\div 6 = 8 \\\\ r = 2 \\end{gathered}'),
              prose('Then divide back down to the first term: $a = 6 \\div 2 = 3$.'),
            ),
            ask('seq-gp-tree'),
            ask('seq-gp-term+choice'),
            ask('seq-gp-table', 2),
            teach(
              prose(
                'With a negative or fractional ratio, the bracket in $ar^{n-1}$ matters: $(-2)^{n-1}$ and $\\left(\\frac{1}{2}\\right)^{n-1}$ raise the whole ratio to the power.',
              ),
              maths('\\begin{gathered} 5, \\; -10, \\; 20, \\; \\dots \\\\ u_n = 5 \\times (-2)^{n-1} \\end{gathered}'),
            ),
            ask('seq-gp-nth-tiles', 2),
            ask('seq-gp-tree', 2),
          ],
          skillCheck: [ask('seq-gp-term', 2), ask('seq-gp-nth-tiles', 2), ask('seq-gp-tree', 2)],
        },
        {
          id: 'sq-l1-differences',
          title: 'Terms and Differences',
          slides: [
            teach(
              prose(
                'Take each term from the next. If the differences are all the same, the sequence is arithmetic. If instead dividing each term by the one before always gives the same number, it is geometric. Otherwise it is neither.',
              ),
              maths('\\begin{aligned} \\text{terms} &: 2, \\; 5, \\; 10, \\; 17, \\; 26 \\\\ \\text{differences} &: 3, \\; 5, \\; 7, \\; 9 \\end{aligned}'),
              prose(
                'These differences are not equal, but they go up by $2$ each time: the **second difference** is constant. That is enough to carry on: the next difference is $11$, so the next term is $37$.',
              ),
            ),
            ask('seq-classify'),
            ask('seq-diff-table'),
            ask('seq-next-term'),
            teach(
              prose(
                'A constant difference $d$ means the $n$th term starts with $dn$. Compare the sequence with $dn$ to find what is left over.',
              ),
              maths('\\begin{aligned} u_n &: 5, \\; 8, \\; 11, \\; 14 \\\\ 3n &: 3, \\; 6, \\; 9, \\; 12 \\end{aligned}'),
              prose('Each term is $2$ more than $3n$, so $u_n = 3n + 2$.'),
            ),
            ask('seq-diff-steps'),
            ask('seq-classify', 2),
            ask('seq-next-term+choice'),
            teach(
              prose(
                'A constant **second** difference means an $n^2$ term, with coefficient half the second difference, since $an^2$ has second difference $2a$.',
              ),
              maths('\\begin{aligned} \\text{terms} &: 3, \\; 8, \\; 15, \\; 24 \\\\ \\text{1st} &: 5, \\; 7, \\; 9 \\\\ \\text{2nd} &: 2, \\; 2 \\end{aligned}'),
              prose('Take $n^2$ away: $2, 4, 6, 8$ is left, which is $2n$. So $u_n = n^2 + 2n$.'),
            ),
            ask('seq-diff-steps', 2),
            ask('seq-diff-table', 2),
          ],
          skillCheck: [ask('seq-next-term', 2), ask('seq-classify', 2), ask('seq-diff-steps', 2)],
        },
        {
          id: 'sq-l1-recurrence',
          title: 'Recurrence Relations',
          slides: [
            teach(
              prose(
                'A **recurrence relation** is a term-to-term rule in symbols. It says how to get $u_{n+1}$ from $u_n$, and it needs a first term to start from.',
              ),
              maths('\\begin{gathered} u_{n+1} = 2u_n - 1, \\quad u_1 = 3 \\\\ 3, \\; 5, \\; 9, \\; 17, \\; \\dots \\end{gathered}'),
              prose(
                'A sequence is **increasing** if every term is bigger than the one before, and **decreasing** if every term is smaller. It is **periodic** if it repeats: $u_{n+1} = 10 - u_n$ with $u_1 = 3$ gives $3, 7, 3, 7, \\dots$',
              ),
            ),
            ask('seq-rec-table'),
            ask('seq-rec-flow'),
            ask('seq-rec-tiles'),
            teach(
              prose(
                'In words, order matters. "Add $3$, then double" is $u_{n+1} = 2(u_n + 3) = 2u_n + 6$: the $3$ is doubled too. "Double, then add $3$" is $u_{n+1} = 2u_n + 3$.',
              ),
              prose(
                'A rule can also use $n$, as in $u_{n+1} = u_n + 2n$. To get $u_{n+1}$, use the $n$ of the term before it: $u_2 = u_1 + 2 \\times 1$, $u_3 = u_2 + 2 \\times 2$.',
              ),
            ),
            ask('seq-rec-tiles', 2),
            ask('seq-rec-table', 2),
            ask('seq-rec-flow', 2),
            teach(
              prose(
                'To find $p$ and $q$ in $u_{n+1} = pu_n + q$ from three terms, write the rule twice and subtract. The $q$ cancels:',
              ),
              maths('\\begin{aligned} u_3 &= pu_2 + q \\\\ u_2 &= pu_1 + q \\\\ u_3 - u_2 &= p(u_2 - u_1) \\end{aligned}'),
              prose('Divide to get $p$, then $q = u_2 - pu_1$.'),
            ),
            ask('seq-rec-tree'),
            ask('seq-rec-tree', 2),
          ],
          skillCheck: [ask('seq-rec-table', 2), ask('seq-rec-tiles', 2), ask('seq-rec-tree', 2)],
        },
      ],
      levelCheck: [
        ask('seq-rule-table', 2),
        ask('seq-term', 2),
        ask('seq-rule-kind', 2),
        ask('seq-ap-nth-tiles', 2),
        ask('seq-ap-term', 2),
        ask('seq-which-term', 2),
        ask('seq-ap-tree', 2),
        ask('seq-gp-table', 2),
        ask('seq-gp-term', 2),
        ask('seq-gp-nth-tiles', 2),
        ask('seq-classify', 2),
        ask('seq-diff-steps', 2),
        ask('seq-next-term', 2),
        ask('seq-rec-table', 2),
        ask('seq-rec-tree', 2),
      ],
    },
    {
      id: 'sq-l2',
      title: 'Series',
      lessons: [
        {
          id: 'sq-l2-sigma',
          title: 'Sigma Notation',
          slides: [
            teach(
              prose(
                'A **series** is the terms of a sequence added up. Sigma notation writes one compactly: put each value of $r$ from the bottom number to the top into the general term, then add.',
              ),
              maths('\\begin{gathered} \\sum_{r=1}^{5} (2r + 1) \\\\ = 3 + 5 + 7 + 9 + 11 = 35 \\end{gathered}'),
              prose(
                'A sum from $r = 1$ to $r = 5$ has $5$ terms. In general there are $\\text{top} - \\text{bottom} + 1$ of them: from $r = 3$ to $r = 10$ is $8$ terms, not $7$.',
              ),
            ),
            ask('seq-sigma-terms'),
            ask('seq-sigma-count'),
            ask('seq-sigma-reduce'),
            teach(
              prose(
                'To write a series in sigma form, find its general term the way you would find an $n$th term, with $r$ in place of $n$. $4 + 7 + 10 + \\dots$ goes up by $3$, so the general term is $3r + 1$.',
              ),
              prose('Then read the limits off the first and last terms. If the last term is $31$, then $3r + 1 = 31$ gives $r = 10$:'),
              maths('\\begin{gathered} 4 + 7 + 10 + \\dots + 31 \\\\ = \\sum_{r=1}^{10} (3r + 1) \\end{gathered}'),
            ),
            ask('seq-sigma-tiles'),
            ask('seq-sigma-count+choice'),
            ask('seq-sigma-reduce+choice'),
            teach(
              prose(
                'The bottom limit need not be $1$. Start wherever it says: the first term of $\\sum_{r=0}^{4} (3r + 2)$ is $2$, at $r = 0$.',
              ),
              prose('The general term need not be a straight line either:'),
              maths('\\sum_{r=1}^{4} 3 \\times 2^r = 6 + 12 + 24 + 48'),
            ),
            ask('seq-sigma-terms', 2),
            ask('seq-sigma-tiles', 2),
          ],
          skillCheck: [ask('seq-sigma-count', 2), ask('seq-sigma-tiles', 2), ask('seq-sigma-reduce', 2)],
        },
        {
          id: 'sq-l2-arithmetic-series',
          title: 'Arithmetic Series',
          slides: [
            teach(
              prose('To add $1 + 2 + \\dots + 100$, write it forwards and backwards and add the two lines in pairs:'),
              maths('\\begin{aligned} S &= 1 + 2 + \\dots + 100 \\\\ S &= 100 + 99 + \\dots + 1 \\\\ 2S &= 101 \\times 100 \\end{aligned}'),
              prose(
                'So $S = 5050$. The same works for any arithmetic series: $n$ pairs, each adding to the first term plus the last, $a + l$, and then halve.',
              ),
              maths('\\begin{aligned} S_n &= \\frac{n}{2}(a + l) \\\\ &= \\frac{n}{2}\\left(2a + (n - 1)d\\right) \\end{aligned}'),
            ),
            ask('seq-ap-series-steps'),
            ask('seq-ap-sum-table'),
            ask('seq-ap-total-tree'),
            teach(
              prose(
                'The second form comes from $l = a + (n - 1)d$. Use it when the last term is not given. The usual slip is $nd$ in place of $(n - 1)d$.',
              ),
              prose('For $3 + 7 + 11 + \\dots$ to $20$ terms, $a = 3$ and $d = 4$:'),
              maths('\\begin{aligned} S_{20} &= 10(6 + 19 \\times 4) \\\\ &= 820 \\end{aligned}'),
              prose('The running total $S_n$ also gives terms back: $u_n = S_n - S_{n-1}$.'),
            ),
            ask('seq-ap-sum'),
            ask('seq-ap-series-steps', 2),
            ask('seq-ap-sum-table', 2),
            teach(
              prose('When a series is given up to its last term, find how many terms it has first.'),
              maths('\\begin{gathered} 5 + 8 + 11 + \\dots + 62 \\\\ 5 + 3(n - 1) = 62 \\\\ n = 20 \\end{gathered}'),
              prose('Then $S_{20} = 10(5 + 62) = 670$.'),
            ),
            ask('seq-ap-sum', 2),
            ask('seq-ap-total-tree', 2),
          ],
          skillCheck: [ask('seq-ap-sum', 2), ask('seq-ap-total-tree', 2), ask('seq-ap-series-steps', 2)],
        },
        {
          id: 'sq-l2-geometric-series',
          title: 'Geometric Series',
          slides: [
            teach(
              prose('For a geometric series, multiply it by $r$ and subtract. Everything but two terms cancels:'),
              maths('\\begin{aligned} S &= a + \\dots + ar^{n-1} \\\\ rS &= ar + \\dots + ar^n \\\\ rS - S &= ar^n - a \\end{aligned}'),
              maths('S_n = \\frac{a(r^n - 1)}{r - 1}'),
            ),
            ask('seq-gp-formula-tiles'),
            ask('seq-gp-total-tree'),
            ask('seq-gp-series-steps'),
            teach(
              prose(
                'Work out the power first: $r^n$ before anything else. With a negative ratio, keep its bracket, $(-2)^5 = -32$, and the bottom $r - 1$ is negative too.',
              ),
              prose('For $2 - 4 + 8 - \\dots$ to $5$ terms, $a = 2$ and $r = -2$:'),
              maths('\\begin{aligned} S_5 &= \\frac{2\\left((-2)^5 - 1\\right)}{-2 - 1} \\\\ &= \\frac{-66}{-3} = 22 \\end{aligned}'),
            ),
            ask('seq-gp-sum'),
            ask('seq-gp-formula-tiles', 2),
            ask('seq-gp-total-tree', 2),
            teach(
              prose('Given a last term instead of a count, find $n$ from the powers of $r$ first. For $3 + 6 + 12 + \\dots + 384$:'),
              maths('\\begin{gathered} 3 \\times 2^{n-1} = 384 \\\\ 2^{n-1} = 128 \\\\ n = 8 \\end{gathered}'),
              prose('Then $S_8 = 3(2^8 - 1) = 765$.'),
            ),
            ask('seq-gp-sum', 2),
            ask('seq-gp-series-steps', 2),
          ],
          skillCheck: [ask('seq-gp-sum', 2), ask('seq-gp-total-tree', 2), ask('seq-gp-formula-tiles', 2)],
        },
        {
          id: 'sq-l2-infinity',
          title: 'The Sum to Infinity',
          slides: [
            teach(
              prose(
                'Add up $8 + 4 + 2 + 1 + \\dots$ and the totals go $8, 12, 14, 15, \\dots$, each time halving the gap to $16$. They never pass it, and get as close as you like.',
              ),
              partialSums,
              prose(
                'When $|r| < 1$ the $r^n$ in $S_n$ shrinks to nothing, which leaves the **sum to infinity**:',
              ),
              maths('S_\\infty = \\frac{a}{1 - r} = \\frac{8}{1 - \\frac{1}{2}} = 16'),
            ),
            ask('seq-partial-slider'),
            ask('seq-sum-infinity'),
            ask('seq-which-converges'),
            teach(
              prose(
                'When $|r| \\geq 1$ the terms do not shrink, the totals never settle, and there is no sum to infinity. Find $r$ carefully first: it is a term divided by the one **before** it, not after.',
              ),
              prose(
                'A negative ratio with $|r| < 1$ still converges. The totals land above and below the limit in turn, closing in from both sides.',
              ),
            ),
            ask('seq-converge-flow'),
            ask('seq-partial-slider', 2),
            ask('seq-which-converges', 2),
            teach(
              prose('The formula also runs backwards. A series with first term $6$ and sum to infinity $18$:'),
              maths('\\begin{aligned} \\frac{6}{1 - r} &= 18 \\\\ 1 - r &= \\tfrac{1}{3} \\\\ r &= \\tfrac{2}{3} \\end{aligned}'),
            ),
            ask('seq-sum-infinity', 2),
            ask('seq-converge-flow', 2),
          ],
          skillCheck: [ask('seq-sum-infinity', 2), ask('seq-which-converges', 2), ask('seq-converge-flow', 2)],
        },
        {
          id: 'sq-l2-context',
          title: 'Series in Context',
          slides: [
            teach(
              prose(
                'A problem in words asks two things of you. Does each step **add** the same amount (arithmetic) or **multiply** by the same number (geometric)?',
              ),
              prose(
                'And does it want **one value**, such as the salary in year $5$ (the $n$th term), or **a total**, such as everything earned over $5$ years (the sum)?',
              ),
              maths('\\text{one value: } u_n \\qquad \\text{a total: } S_n'),
            ),
            ask('seq-context-flow'),
            ask('seq-context-ap-tree'),
            ask('seq-context'),
            teach(
              prose(
                'Some questions ask when a total first passes a target. Work the running total along until it does: $S_n$ for one $n$, then the next.',
              ),
              prose('The answer is the first whole step past the target, not the one before it.'),
            ),
            ask('seq-first-exceed'),
            ask('seq-context-flow', 2),
            ask('seq-context-ap-tree', 2),
            teach(
              prose(
                'A bouncing ball dropped from $h$ falls $h$ once. Every rise after that is fallen again, so the rises count twice:',
              ),
              maths('\\text{distance} = h + 2 \\times \\frac{hr}{1 - r}'),
              prose('Dropped from $9$ m and rising to $\\frac{2}{3}$ each time: $9 + 2 \\times 18 = 45$ m.'),
            ),
            ask('seq-context', 2),
            ask('seq-first-exceed', 2),
          ],
          skillCheck: [ask('seq-context', 2), ask('seq-context-ap-tree', 2), ask('seq-context-flow', 2)],
        },
      ],
      levelCheck: [
        ask('seq-sigma-tiles', 2),
        ask('seq-sigma-reduce+choice', 2),
        ask('seq-sigma-count', 2),
        ask('seq-sigma-terms', 2),
        ask('seq-ap-total-tree', 2),
        ask('seq-ap-sum', 2),
        ask('seq-ap-sum-table', 2),
        ask('seq-gp-total-tree', 2),
        ask('seq-gp-sum', 2),
        ask('seq-gp-formula-tiles', 2),
        ask('seq-converge-flow', 2),
        ask('seq-sum-infinity', 2),
        ask('seq-which-converges', 2),
        ask('seq-context', 2),
        ask('seq-context-flow', 2),
      ],
    },
    {
      id: 'sq-l3',
      title: 'Sequences and their Limits',
      lessons: [
        {
          id: 'sq-l3-monotonic',
          title: 'Increasing, Decreasing and Periodic',
          slides: [
            teach(
              prose('To see whether a sequence goes up or down, look at the step from each term to the next, $u_{n+1} - u_n$.'),
              prose(
                'If it is positive for every $n$, the sequence is **increasing**. If it is negative for every $n$, it is **decreasing**. For $u_n = n^2 - 4n$:',
              ),
              maths('\\begin{aligned} u_{n+1} &= (n + 1)^2 - 4(n + 1) \\\\ &= n^2 - 2n - 3 \\end{aligned}'),
              prose('Taking $u_n$ away leaves $u_{n+1} - u_n = 2n - 3$. At $n = 1$ that is $-1$, and after that it is positive. The terms fall once, then rise: this sequence is neither.'),
            ),
            ask('seq-diff-tiles'),
            ask('seq-monotone-flow'),
            ask('seq-diff-tiles', 2),
            teach(
              prose('Some sequences come back to where they started. $u_{n+1} = \\frac{12}{u_n}$ from $u_1 = 3$ gives $3, 4, 3, 4, \\dots$'),
              prose(
                'A sequence is **periodic** when $u_{n+k} = u_n$ for every $n$, and the smallest such $k$ is its **period**; here it is $2$. $(-1)^n$ does the same: $u_n = 5 + 2(-1)^n$ gives $3, 7, 3, 7, \\dots$',
              ),
              prose('For a far-off term, use the period: $25 = 2 \\times 12 + 1$, so $u_{25} = u_1 = 3$.'),
            ),
            ask('seq-period-table'),
            ask('seq-period'),
            ask('seq-monotone-flow', 2),
            teach(
              prose('Some rules use the two terms before. $u_{n+2} = u_{n+1} - u_n$ with $u_1 = 2$ and $u_2 = 5$ gives:'),
              maths('\\begin{gathered} 2, \\; 5, \\; 3, \\; -2, \\\\ -5, \\; -3, \\; 2, \\; 5, \\; \\dots \\end{gathered}'),
              prose(
                'The pair $2, 5$ comes back at $u_7$ and $u_8$, so the period is $6$. Wait for the first **two** terms to come back together, not just one of them.',
              ),
            ),
            ask('seq-period-table', 2),
            ask('seq-period', 2),
          ],
          skillCheck: [ask('seq-diff-tiles', 2), ask('seq-monotone-flow', 2), ask('seq-period', 2)],
        },
        {
          id: 'sq-l3-limit',
          title: 'The Limit of a Recurrence',
          slides: [
            teach(
              prose('Run $u_{n+1} = \\frac{1}{2}u_n + 6$ from $u_1 = 28$:'),
              maths('28, \\; 20, \\; 16, \\; 14, \\; 13, \\; 12.5, \\; \\dots'),
              prose(
                'The terms close in on $12$, the **limit** $L$. Once they have settled, $u_{n+1}$ and $u_n$ are both $L$, so $L = \\frac{1}{2}L + 6$, which gives $\\frac{1}{2}L = 6$ and $L = 12$.',
              ),
            ),
            ask('seq-limit-table'),
            ask('seq-fixed-point-steps'),
            ask('seq-limit'),
            teach(
              prose('In general, a sequence $u_{n+1} = pu_n + q$ that settles does so at:'),
              maths('\\begin{aligned} L &= pL + q \\\\ L - pL &= q \\\\ L &= \\frac{q}{1 - p} \\end{aligned}'),
              prose(
                'A negative $p$ works the same way: for $p = -\\frac{1}{2}$, $1 - p = \\frac{3}{2}$. It runs backwards too: knowing $L$ and $p$, the missing $q$ is $L - pL$.',
              ),
            ),
            ask('seq-limit-back-tree'),
            ask('seq-limit-table', 2),
            ask('seq-fixed-point-steps', 2),
            teach(
              prose('A rule is not always written as $pu_n + q$. Put $L$ in for both terms and solve as it stands:'),
              maths('\\begin{aligned} u_{n+1} &= \\frac{u_n + 12}{3} \\\\ L &= \\frac{L + 12}{3} \\\\ 3L &= L + 12 \\\\ L &= 6 \\end{aligned}'),
              prose('Multiplied out it is $u_{n+1} = \\frac{1}{3}u_n + 4$, and $\\frac{4}{1 - \\frac{1}{3}} = 6$ agrees.'),
            ),
            ask('seq-limit+choice', 2),
            ask('seq-limit-back-tree', 2),
          ],
          skillCheck: [ask('seq-limit', 2), ask('seq-fixed-point-steps', 2), ask('seq-limit-back-tree', 2)],
        },
        {
          id: 'sq-l3-behaviour',
          title: 'Converge, Oscillate or Diverge',
          slides: [
            teach(
              prose('Why do the terms settle? Take $L = pL + q$ away from the rule $u_{n+1} = pu_n + q$:'),
              maths('u_{n+1} - L = p(u_n - L)'),
              prose(
                'Every step multiplies the gap to $L$ by $p$. When $|p| < 1$ the gap shrinks and the terms **converge**; a negative $p$ also flips its sign, so they land either side of $L$ in turn. When $|p| > 1$ the gap grows and the terms run away.',
              ),
            ),
            ask('seq-fate-table'),
            ask('seq-fate-flow'),
            ask('seq-fate-slider'),
            teach(
              prose('$L = pL + q$ has a solution for every $p$ except $1$, so finding $L$ proves nothing. Look at $p$ first:'),
              maths(
                '\\begin{aligned} |p| < 1 &: \\text{converges} \\\\ p = -1 &: \\text{period } 2 \\\\ p = 1 &: \\text{diverges} \\\\ |p| > 1 &: \\text{diverges} \\end{aligned}',
              ),
              prose('With $p = -1$ the terms flip between two values for ever. With $p = 1$ each step adds the same $q$, so they never settle.'),
            ),
            ask('seq-fate'),
            ask('seq-fate-table', 2),
            ask('seq-fate-slider', 2),
            teach(
              prose('A rule may hide its $p$. Multiply it out before deciding:'),
              maths('\\begin{aligned} u_{n+1} &= 2(5 - u_n) \\\\ &= -2u_n + 10 \\end{aligned}'),
              prose('Here $p = -2$: the terms swing either side of $L$, further each time, so they diverge. $\\frac{9 - u_n}{3}$ has $p = -\\frac{1}{3}$ and converges.'),
            ),
            ask('seq-fate-flow', 2),
            ask('seq-fate', 2),
          ],
          skillCheck: [ask('seq-fate', 2), ask('seq-fate-flow', 2), ask('seq-fate-slider', 2)],
        },
        {
          id: 'sq-l3-position',
          title: 'Limits of Position-to-Term Rules',
          slides: [
            teach(
              prose('A position-to-term rule can have a limit too. Try $u_n = \\frac{3n + 1}{n + 2}$ for large $n$:'),
              maths('\\begin{gathered} u_{10} = \\tfrac{31}{12} \\approx 2.58 \\\\ u_{100} = \\tfrac{301}{102} \\approx 2.95 \\\\ u_{1000} = \\tfrac{3001}{1002} \\approx 2.995 \\end{gathered}'),
              prose('Divide the top and the bottom by $n$. A number over $n$, or over $2^n$, heads for $0$ as $n$ grows:'),
              maths('u_n = \\frac{3 + \\frac{1}{n}}{1 + \\frac{2}{n}} \\to \\frac{3 + 0}{1 + 0} = 3'),
            ),
            ask('seq-divide-steps'),
            ask('seq-pos-limit'),
            ask('seq-divide-steps', 2),
            teach(
              prose('The highest powers of $n$ decide it. Divide the top and the bottom by the highest power on the bottom:'),
              maths(
                '\\begin{aligned} \\frac{5n^2 - 1}{2n^2 + n} &\\to \\tfrac{5}{2} \\\\ \\frac{4n + 3}{n^2 + 1} &\\to 0 \\\\ \\frac{n^2}{n + 1} &\\to \\text{no limit} \\end{aligned}',
              ),
              prose(
                'The same power on both: the ratio of the numbers in front. Higher on the bottom: $0$. Higher on the top: it grows without limit and **diverges**. Find the highest power wherever it is written: $\\frac{7 - 2n^2}{3n^2 + 1}$ heads for $-\\frac{2}{3}$.',
              ),
            ),
            ask('seq-power-flow'),
            ask('seq-pos-converge'),
            ask('seq-power-flow', 2),
            teach(
              prose(
                '$(-1)^n$ flips sign every step, so $3 + (-1)^n$ jumps between $2$ and $4$ and never settles: it diverges.',
              ),
              prose('But $\\frac{(-1)^n}{n}$ shrinks towards $0$ while it flips, so it converges, to $0$.'),
            ),
            ask('seq-pos-converge', 2),
            ask('seq-pos-limit', 2),
          ],
          skillCheck: [ask('seq-pos-limit', 2), ask('seq-power-flow', 2), ask('seq-pos-converge', 2)],
        },
        {
          id: 'sq-l3-gap',
          title: 'How Close, How Soon',
          slides: [
            teach(
              prose('Each step multiplies the gap to the limit by $p$, so the gap has a formula:'),
              maths('u_n - L = (u_1 - L)p^{n-1}'),
              prose(
                'For $u_{n+1} = \\frac{1}{2}u_n + 6$ from $u_1 = 28$, $L = 12$ and the gaps go $16, 8, 4, 2, \\dots$ The smaller $|p|$ is, the faster the gap shrinks.',
              ),
            ),
            ask('seq-gap-table'),
            ask('seq-rate-flow'),
            ask('seq-gap-tree'),
            teach(
              prose('How soon is that sequence within $0.1$ of $12$? The gap $16 \\times (\\frac{1}{2})^{n-1}$ has to drop below $0.1$:'),
              maths(
                '\\begin{aligned} \\left(\\tfrac{1}{2}\\right)^{n-1} &< \\tfrac{0.1}{16} \\\\ n - 1 &> \\frac{\\ln(0.1 \\div 16)}{\\ln \\frac{1}{2}} \\\\ &= 7.32 \\end{aligned}',
              ),
              prose(
                'So $n - 1 = 8$, and $u_9$ is the first term within $0.1$. Dividing by the log of a number below $1$ flips the inequality. A negative $p$ changes the sign of the gap, not its size, so use $|p|$.',
              ),
            ),
            ask('seq-gap-first'),
            ask('seq-rate-flow', 2),
            ask('seq-gap-table', 2),
            teach(
              prose('With $p = -\\frac{1}{2}$ the gap is divided by $-2$ each step, so after $4$ steps it has been divided by $(-2)^4 = 16$, and after $5$ by $(-2)^5 = -32$: it lands on the other side of $L$.'),
            ),
            ask('seq-gap-tree', 2),
            ask('seq-gap-first+choice', 2),
          ],
          skillCheck: [ask('seq-gap-first', 2), ask('seq-gap-tree', 2), ask('seq-rate-flow', 2)],
        },
      ],
      levelCheck: [
        ask('seq-diff-tiles', 2),
        ask('seq-period', 2),
        ask('seq-monotone-flow', 2),
        ask('seq-period-table', 2),
        ask('seq-limit', 2),
        ask('seq-fixed-point-steps', 2),
        ask('seq-limit-back-tree', 2),
        ask('seq-fate', 2),
        ask('seq-fate-slider', 2),
        ask('seq-fate-flow', 2),
        ask('seq-pos-limit', 2),
        ask('seq-pos-converge', 2),
        ask('seq-gap-table', 2),
        ask('seq-gap-first', 2),
        ask('seq-rate-flow', 2),
      ],
    },
    {
      id: 'sq-l4',
      title: 'Sums of Powers and the Method of Differences',
      lessons: [
        {
          id: 'sq-l4-standard',
          title: 'The Standard Results',
          slides: [
            teach(
              prose('Write $1 + 2 + \\dots + n$ forwards and backwards and add the two lines: every column makes $n + 1$, and there are $n$ columns. That is twice the sum, so:'),
              maths('\\sum_{r=1}^{n} r = \\frac{1}{2}n(n + 1)'),
              prose('Two more are worth knowing by heart:'),
              maths('\\begin{aligned} \\sum_{r=1}^{n} r^2 &= \\frac{1}{6}n(n + 1)(2n + 1) \\\\ \\sum_{r=1}^{n} r^3 &= \\frac{1}{4}n^2(n + 1)^2 \\end{aligned}'),
            ),
            ask('seq-power-sum-tiles'),
            ask('seq-power-sum'),
            ask('seq-power-sum-table'),
            teach(
              prose('Put the top of the sum in for $n$. For $\\sum_{r=1}^{10} r^2$, $n = 10$:'),
              maths('\\frac{1}{6} \\times 10 \\times 11 \\times 21 = 385'),
              prose('The sum of cubes is the square of the sum: $\\sum r^3 = \\left(\\sum r\\right)^2$. Up to $4$: $1 + 8 + 27 + 64 = 100 = 10^2$.'),
            ),
            ask('seq-formula-reduce'),
            ask('seq-power-sum-tiles', 2),
            ask('seq-power-sum-table', 2),
            teach(
              prose('The top of a sum can be an expression, and every $n$ in the result becomes it. For a sum to $2n$:'),
              maths('\\begin{aligned} \\sum_{r=1}^{2n} r &= \\frac{1}{2}(2n)(2n + 1) \\\\ &= n(2n + 1) \\end{aligned}'),
              prose('Check with $n = 2$: $1 + 2 + 3 + 4 = 10$, and $2 \\times 5 = 10$.'),
            ),
            ask('seq-formula-reduce', 2),
            ask('seq-power-sum', 2),
          ],
          skillCheck: [ask('seq-power-sum', 2), ask('seq-power-sum-table', 2), ask('seq-power-sum-tiles', 2)],
        },
        {
          id: 'sq-l4-built',
          title: 'Sums Built from the Standard Results',
          slides: [
            teach(
              prose('A sum splits the way its terms do, and a number in front comes out of the sigma:'),
              maths('\\sum_{r=1}^{n} (3r + 4) = 3\\sum_{r=1}^{n} r + \\sum_{r=1}^{n} 4'),
              prose('The $4$ is added once for each of the $n$ terms, so $\\sum_{r=1}^{n} 4 = 4n$, not $4$. Up to $10$: $3 \\times 55 + 40 = 205$.'),
            ),
            ask('seq-split-tiles'),
            ask('seq-split-tree'),
            ask('seq-built-sum'),
            teach(
              prose('Multiply the term out first, then split it:'),
              maths('\\begin{gathered} \\sum_{r=1}^{n} r(r + 2) \\\\ = \\sum_{r=1}^{n} r^2 + 2\\sum_{r=1}^{n} r \\end{gathered}'),
              prose('Up to $5$: $55 + 2 \\times 15 = 85$. Check: $3 + 8 + 15 + 24 + 35 = 85$.'),
            ),
            ask('seq-split-tree', 2),
            ask('seq-split-tiles', 2),
            ask('seq-built-sum', 2),
            teach(
              prose('To write the answer as one expression in $n$, take out what the parts share. Both $\\sum r^2$ and $\\sum r$ carry $\\frac{1}{6}n(n + 1)$, since $\\sum r = \\frac{1}{6}n(n + 1) \\times 3$:'),
              maths('\\begin{aligned} &\\sum_{r=1}^{n} (r^2 + r) \\\\ &= \\frac{1}{6}n(n + 1)\\big((2n + 1) + 3\\big) \\\\ &= \\frac{1}{6}n(n + 1)(2n + 4) \\end{aligned}'),
            ),
            ask('seq-factor-tiles'),
            ask('seq-factor-tiles', 2),
          ],
          skillCheck: [ask('seq-built-sum', 2), ask('seq-split-tree', 2), ask('seq-factor-tiles', 2)],
        },
        {
          id: 'sq-l4-from-m',
          title: 'Sums that Do Not Start at 1',
          slides: [
            teach(
              prose('The standard results all start at $r = 1$. For a sum starting later, add up everything to the top and take away the terms you did not want. Write $S_n$ for the sum from $1$ to $n$:'),
              maths('\\sum_{r=m}^{n} u_r = S_n - S_{m-1}'),
              prose('For $\\sum_{r=5}^{10} r^2$: $S_{10} - S_4 = 385 - 30 = 355$.'),
            ),
            ask('seq-subtract-flow'),
            ask('seq-drop-tree'),
            ask('seq-from-m'),
            teach(
              prose('The slip is taking away $S_m$. That removes the first term you wanted as well:'),
              maths('S_{10} - S_5 = 6^2 + \\dots + 10^2'),
              prose('which starts at $6$, not $5$. The terms to remove are the ones before the bottom of the sum, $r = 1$ to $m - 1$.'),
            ),
            ask('seq-from-m-slip'),
            ask('seq-drop-tree', 2),
            ask('seq-from-m', 2),
            teach(
              prose('The ends can be expressions too. The terms before $r = n + 1$ run up to $r = n$, so:'),
              maths('\\begin{aligned} \\sum_{r=n+1}^{2n} r &= S_{2n} - S_n \\\\ &= n(2n + 1) \\\\ &\\quad - \\frac{1}{2}n(n + 1) \\end{aligned}'),
            ),
            ask('seq-from-m-slip', 2),
            ask('seq-subtract-flow', 2),
          ],
          skillCheck: [ask('seq-from-m', 2), ask('seq-from-m-slip', 2), ask('seq-drop-tree', 2)],
        },
        {
          id: 'sq-l4-telescoping',
          title: 'The Method of Differences',
          slides: [
            teach(
              prose('Some terms split into a difference. You will be given the split here:'),
              maths('\\frac{1}{r(r + 1)} = \\frac{1}{r} - \\frac{1}{r + 1}'),
              prose('Write the sum out and each fraction taken away is added straight back by the next term:'),
              maths('\\begin{aligned} &\\left(1 - \\tfrac{1}{2}\\right) + \\left(\\tfrac{1}{2} - \\tfrac{1}{3}\\right) \\\\ &\\quad + \\dots + \\left(\\tfrac{1}{n} - \\tfrac{1}{n + 1}\\right) \\\\ &= 1 - \\frac{1}{n + 1} \\end{aligned}'),
            ),
            ask('seq-telescope-steps'),
            ask('seq-telescope-tiles'),
            ask('seq-telescope-table'),
            teach(
              prose('This is the **method of differences**: only the ends survive. So $\\sum_{r=1}^{n} \\frac{1}{r(r + 1)} = \\frac{n}{n + 1}$, and up to $9$ it is $\\frac{9}{10}$.'),
              prose('A sum starting at $r = 3$ keeps its first fraction, $\\frac{1}{3}$, instead of $1$.'),
            ),
            ask('seq-telescope-sum+choice'),
            ask('seq-telescope-steps', 2),
            ask('seq-telescope-table', 2),
            teach(
              prose('When the split jumps two places, a fraction comes back two terms later:'),
              maths('\\frac{2}{r(r + 2)} = \\frac{1}{r} - \\frac{1}{r + 2}'),
              prose('So **two** fractions survive at each end:'),
              maths('\\begin{aligned} &\\sum_{r=1}^{n} \\frac{2}{r(r + 2)} \\\\ &= 1 + \\frac{1}{2} - \\frac{1}{n + 1} - \\frac{1}{n + 2} \\end{aligned}'),
            ),
            ask('seq-telescope-tiles', 2),
            ask('seq-telescope-sum+choice', 2),
          ],
          skillCheck: [ask('seq-telescope-steps', 2), ask('seq-telescope-tiles', 2), ask('seq-telescope-sum+choice', 2)],
        },
        {
          id: 'sq-l4-infinity',
          title: 'Sums to Infinity by Differences',
          slides: [
            teach(
              prose('In $\\sum_{r=1}^{n} \\frac{1}{r(r + 1)} = 1 - \\frac{1}{n + 1}$, the leftover $\\frac{1}{n + 1}$ tends to $0$ as $n$ grows. So the sum to infinity is $1$.'),
              prose('Not every leftover dies. $\\sum_{r=1}^{n} \\left(\\sqrt{r + 1} - \\sqrt{r}\\right) = \\sqrt{n + 1} - 1$, and $\\sqrt{n + 1}$ grows without limit: that series has no sum to infinity.'),
            ),
            ask('seq-leftover-flow'),
            ask('seq-telescope-slider'),
            ask('seq-infinity-sum'),
            teach(
              prose('For a sum to infinity, find what survives at the front; the fractions at the far end all tend to $0$. With $\\frac{1}{(r + 1)(r + 3)} = \\frac{1}{2}\\left(\\frac{1}{r + 1} - \\frac{1}{r + 3}\\right)$, the front two, $\\frac{1}{2}$ and $\\frac{1}{3}$, never cancel:'),
              maths('\\begin{aligned} &\\sum_{r=1}^{\\infty} \\frac{1}{(r + 1)(r + 3)} \\\\ &= \\frac{1}{2}\\left(\\frac{1}{2} + \\frac{1}{3}\\right) = \\frac{5}{12} \\end{aligned}'),
            ),
            ask('seq-survivor-tree'),
            ask('seq-infinity-sum', 2),
            ask('seq-leftover-flow', 2),
            teach(
              prose('The partial sums can creep up very slowly. For $\\sum \\frac{7}{(r + 6)(r + 7)}$ the eighth is only just past half the limit, so read the limit from the algebra, not from the picture.'),
              prose('Proving a sum formula for every $n$ is Proof by Induction for Series, later in Series & Induction.'),
            ),
            ask('seq-survivor-tree', 2),
            ask('seq-telescope-slider', 2),
          ],
          skillCheck: [ask('seq-infinity-sum', 2), ask('seq-survivor-tree', 2), ask('seq-leftover-flow', 2)],
        },
      ],
      levelCheck: [
        ask('seq-power-sum-tiles', 2),
        ask('seq-power-sum', 2),
        ask('seq-power-sum-table', 2),
        ask('seq-split-tree', 2),
        ask('seq-built-sum', 2),
        ask('seq-factor-tiles', 2),
        ask('seq-subtract-flow', 2),
        ask('seq-from-m', 2),
        ask('seq-from-m-slip', 2),
        ask('seq-telescope-steps', 2),
        ask('seq-telescope-tiles', 2),
        ask('seq-telescope-table', 2),
        ask('seq-leftover-flow', 2),
        ask('seq-infinity-sum', 2),
        ask('seq-survivor-tree', 2),
      ],
    },
    {
      id: 'sq-l5',
      title: 'Proof by Induction for Series',
      lessons: [
        {
          id: 'sq-l5-step',
          title: 'The Step for a Series',
          slides: [
            teach(
              prose('To prove a sum formula for every $n$ by induction: show it holds at $n = 1$, then assume it holds at $n = k$ and show it holds at $n = k + 1$.'),
              prose('The step rests on one fact. The sum up to $k + 1$ is the sum up to $k$, which you have assumed, plus the next term:'),
              maths('\\sum_{r=1}^{k+1} u_r = \\sum_{r=1}^{k} u_r + u_{k+1}'),
            ),
            ask('seq-ind-added-term'),
            ask('seq-ind-step-check'),
            ask('seq-ind-running'),
            teach(
              prose('For $\\sum_{r=1}^{n} (2r - 1) = n^2$, assume the sum up to $k$ is $k^2$. The next term is $2(k + 1) - 1 = 2k + 1$, so the sum up to $k + 1$ is'),
              maths('k^2 + (2k + 1) = (k + 1)^2'),
              prose('which is the claim at $n = k + 1$. The right side has to grow by exactly $u_{k+1}$ each time, and here it does.'),
            ),
            ask('seq-ind-next-sum'),
            ask('seq-ind-order-sum'),
            ask('seq-ind-added-term', 2),
            teach(
              prose('A proof is written in four parts: the **base case**, the **assumption** at $n = k$, the **step** to $n = k + 1$, and a **conclusion**.'),
              prose('The conclusion ties them together: it holds at $n = 1$, and whenever it holds at $n = k$ it holds at $n = k + 1$, so it holds at $2$, then $3$, and so on for every $n \\ge 1$.'),
            ),
            ask('seq-ind-step-check', 2),
            ask('seq-ind-order-sum', 2),
          ],
          skillCheck: [ask('seq-ind-next-sum', 2), ask('seq-ind-added-term', 2), ask('seq-ind-step-check', 2)],
        },
        {
          id: 'sq-l5-standard',
          title: 'Proving the Standard Results',
          slides: [
            teach(
              prose('To prove $\\sum_{r=1}^{n} r^2 = \\frac16 n(n + 1)(2n + 1)$, the step starts from'),
              maths('\\frac16 k(k + 1)(2k + 1) + (k + 1)^2'),
              prose('Both parts have a factor $(k + 1)$. Take out $\\frac16(k + 1)$: the first part leaves $k(2k + 1)$ and the second $6(k + 1)$, which add to $2k^2 + 7k + 6$.'),
              maths('\\frac16(k + 1)(2k^2 + 7k + 6)'),
            ),
            ask('seq-ind-target'),
            ask('seq-ind-factor-out'),
            ask('seq-ind-standard-step'),
            teach(
              prose('Know where the step is going. The claim at $n = k + 1$ puts $k + 1$ in place of every $n$:'),
              maths('\\frac16(k + 1)(k + 2)(2k + 3)'),
              prose('So $2k^2 + 7k + 6$ should factorise as $(k + 2)(2k + 3)$, and it does. The target tells you which factors to look for.'),
            ),
            ask('seq-ind-order-standard'),
            ask('seq-ind-target', 2),
            ask('seq-ind-factor-out', 2),
            teach(
              prose('For $\\sum_{r=1}^{n} r^3 = \\frac14 n^2(n + 1)^2$ the common factor is $(k + 1)^2$:'),
              maths('\\begin{aligned} &\\frac14 k^2(k + 1)^2 + (k + 1)^3 \\\\ &= \\frac14(k + 1)^2\\big(k^2 + 4(k + 1)\\big) \\\\ &= \\frac14(k + 1)^2(k + 2)^2 \\end{aligned}'),
            ),
            ask('seq-ind-standard-step', 2),
            ask('seq-ind-order-standard', 2),
          ],
          skillCheck: [ask('seq-ind-target', 2), ask('seq-ind-factor-out', 2), ask('seq-ind-standard-step', 2)],
        },
        {
          id: 'sq-l5-ap-gp',
          title: 'Arithmetic and Geometric Sums',
          slides: [
            teach(
              prose('An arithmetic sum: $\\sum_{r=1}^{n} (3r + 2) = \\frac12 n(3n + 7)$. The next term is $3(k + 1) + 2 = 3k + 5$, so the step is'),
              maths('\\begin{aligned} &\\frac12 k(3k + 7) + (3k + 5) \\\\ &= \\frac12(3k^2 + 13k + 10) \\\\ &= \\frac12(k + 1)(3k + 10) \\end{aligned}'),
              prose('and $\\frac12(k + 1)(3(k + 1) + 7)$ is exactly that.'),
            ),
            ask('seq-ind-ap-close'),
            ask('seq-ind-series-step'),
            ask('seq-ind-next-flow'),
            teach(
              prose('A geometric sum: $\\sum_{r=1}^{n} 3 \\times 2^{r-1} = 3(2^n - 1)$. At $r = k + 1$ the power is $r - 1 = k$, so the next term is $3 \\times 2^k$:'),
              maths('\\begin{aligned} &3(2^k - 1) + 3 \\times 2^k \\\\ &= 3(2 \\times 2^k - 1) \\\\ &= 3(2^{k+1} - 1) \\end{aligned}'),
            ),
            ask('seq-ind-claim-value'),
            ask('seq-ind-order-series'),
            ask('seq-ind-ap-close', 2),
            teach(
              prose('Any whole ratio works the same way. In $\\sum_{r=1}^{n} 2 \\times 3^{r-1} = 3^n - 1$, the new term $2 \\times 3^k$ joins the $3^k$ already there:'),
              maths('\\begin{aligned} &3^k - 1 + 2 \\times 3^k \\\\ &= 3 \\times 3^k - 1 \\\\ &= 3^{k+1} - 1 \\end{aligned}'),
            ),
            ask('seq-ind-series-step', 2),
            ask('seq-ind-next-flow', 2),
          ],
          skillCheck: [ask('seq-ind-ap-close', 2), ask('seq-ind-series-step', 2), ask('seq-ind-next-flow', 2)],
        },
        {
          id: 'sq-l5-recurrence',
          title: "A Recurrence's Closed Form",
          slides: [
            teach(
              prose('$u_{n+1} = 2u_n + 1$ with $u_1 = 1$ gives $1, 3, 7, 15, \\dots$: each one less than a power of $2$. The claim is $u_n = 2^n - 1$.'),
              prose('Induction proves it. The base case is $u_1 = 2^1 - 1$. The step puts the assumed $u_k = 2^k - 1$ into the rule:'),
              maths('\\begin{aligned} u_{k+1} &= 2(2^k - 1) + 1 \\\\ &= 2^{k+1} - 1 \\end{aligned}'),
            ),
            ask('seq-ind-rec-table'),
            ask('seq-ind-rec-closed'),
            ask('seq-ind-rec-step'),
            teach(
              prose('To find the form for $u_{n+1} = pu_n + q$, try $u_n = c \\times p^n + d$. The constant $d$ is the value the rule leaves alone, $d = pd + q$; then $c$ comes from $u_1$.'),
              prose('For $u_{n+1} = 3u_n - 4$, $u_1 = 5$: $d = 3d - 4$ gives $d = 2$, and $3c + 2 = 5$ gives $c = 1$. So $u_n = 3^n + 2$.'),
            ),
            ask('seq-ind-order-rec'),
            ask('seq-ind-rec-term'),
            ask('seq-ind-rec-table', 2),
            teach(
              prose('Once proved, the formula goes straight to any term: $u_9 = 2^9 - 1 = 511$, without the eight terms before it.'),
              prose('It also runs backwards. Which term of $2^n - 1$ is $255$? $2^n = 256$, so $n = 8$.'),
            ),
            ask('seq-ind-rec-step', 2),
            ask('seq-ind-rec-closed', 2),
          ],
          skillCheck: [ask('seq-ind-rec-step', 2), ask('seq-ind-rec-closed', 2), ask('seq-ind-rec-term', 2)],
        },
        {
          id: 'sq-l5-checking',
          title: 'Reading and Checking a Proof',
          slides: [
            teach(
              prose('Test a claim on the first few terms before proving it. Is $\\sum_{r=1}^{n} r = n^2 - n + 1$?'),
              prose('At $n = 1$: $1$ and $1$. At $n = 2$: $3$ and $3$. At $n = 3$: $6$, but the claim gives $7$. A formula can fit the first few totals and still be wrong, so fitting is evidence, never proof.'),
            ),
            ask('seq-ind-test-table'),
            ask('seq-ind-verdict'),
            ask('seq-ind-flaw'),
            teach(
              prose('Both halves are needed. For $\\sum_{r=1}^{n} r = \\frac12 n(n + 1) + 2$ the step works: adding $k + 1$ to $\\frac12 k(k + 1) + 2$ gives $\\frac12(k + 1)(k + 2) + 2$.'),
              prose('But at $n = 1$ the sum is $1$ and the claim gives $3$. With no base case the step carries nothing forward, and the claim is false.'),
            ),
            ask('seq-ind-start'),
            ask('seq-ind-test-table', 2),
            ask('seq-ind-verdict', 2),
            teach(
              prose('Three slips to look for when reading a proof:'),
              prose('A base case in the wrong place. It goes where the claim starts: a sum from $r = 4$ starts at $n = 4$, where the sum is the single term $u_4$.'),
              prose('An assumption at $n = k + 1$, which assumes what the step has to show. And adding $u_k$ in the step, when the term added is $u_{k+1}$.'),
            ),
            ask('seq-ind-flaw', 2),
            ask('seq-ind-start', 2),
          ],
          skillCheck: [ask('seq-ind-verdict', 2), ask('seq-ind-flaw', 2), ask('seq-ind-start', 2)],
        },
      ],
      levelCheck: [
        ask('seq-ind-added-term', 2),
        ask('seq-ind-step-check', 2),
        ask('seq-ind-next-sum', 2),
        ask('seq-ind-target', 2),
        ask('seq-ind-factor-out', 2),
        ask('seq-ind-standard-step', 2),
        ask('seq-ind-ap-close', 2),
        ask('seq-ind-next-flow', 2),
        ask('seq-ind-order-series', 2),
        ask('seq-ind-rec-closed', 2),
        ask('seq-ind-rec-step', 2),
        ask('seq-ind-rec-term', 2),
        ask('seq-ind-test-table', 2),
        ask('seq-ind-verdict', 2),
        ask('seq-ind-flaw', 2),
      ],
    },
    {
      id: 'sq-l6',
      title: 'Series in Context',
      lessons: [
        {
          id: 'sq-l6-savings',
          title: 'Regular Savings',
          slides: [
            teach(
              prose('Pay £1000 into an account at the start of each year, and $10\\%$ interest is added at the end of each year. Adding $10\\%$ is multiplying by $1.1$.'),
              prose('Year 1 ends with $1000 \\times 1.1 = 1100$. Year 2 starts with $1100 + 1000 = 2100$ and ends with $2100 \\times 1.1 = 2310$.'),
            ),
            ask('seq-save-table'),
            ask('seq-save-series-tiles'),
            ask('seq-save-sum-steps'),
            teach(
              prose('Follow each payment on its own instead. The last one grows for one year, the one before it for two, and the first for all $n$:'),
              maths('\\begin{aligned} B_n = \\; &1000 \\times 1.1 \\\\ &+ 1000 \\times 1.1^2 \\\\ &+ \\dots + 1000 \\times 1.1^n \\end{aligned}'),
              prose('That is a geometric series, with first term $1000 \\times 1.1$ and common ratio $1.1$.'),
            ),
            ask('seq-save-balance'),
            ask('seq-save-table', 2),
            ask('seq-save-series-tiles', 2),
            teach(
              prose('Work each term out, then add. After three years:'),
              maths('\\begin{aligned} B_3 &= 1100 + 1210 + 1331 \\\\ &= 3641 \\end{aligned}'),
              prose('The sum formula agrees: $S_3 = \\frac{1100(1.1^3 - 1)}{1.1 - 1} = 3641$.'),
            ),
            ask('seq-save-sum-steps', 2),
            ask('seq-save-balance+choice', 2),
          ],
          skillCheck: [ask('seq-save-table', 2), ask('seq-save-series-tiles', 2), ask('seq-save-balance', 2)],
        },
        {
          id: 'sq-l6-loans',
          title: 'Paying Off a Loan',
          slides: [
            teach(
              prose('Borrow £1000 at $20\\%$ a year and repay £300 at the end of each year. Each year the debt is multiplied by $1.2$, then the payment comes off:'),
              maths('\\begin{gathered} u_{n+1} = 1.2u_n - 300 \\\\ u_0 = 1000 \\end{gathered}'),
              prose('Here $u_n$ is what is still owed after $n$ payments.'),
            ),
            ask('seq-loan-table'),
            ask('seq-loan-rule-tiles'),
            ask('seq-loan-clear'),
            teach(
              prose('Run it a year at a time:'),
              maths('\\begin{aligned} u_1 &= 1200 - 300 = 900 \\\\ u_2 &= 1080 - 300 = 780 \\\\ u_3 &= 936 - 300 = 636 \\end{aligned}'),
              prose('The debt falls, but slowly: at first most of each payment goes on interest.'),
            ),
            ask('seq-loan-interest-tree'),
            ask('seq-loan-table', 2),
            ask('seq-loan-rule-tiles', 2),
            teach(
              prose('The loan clears in the first year that what is owed, once the interest is on, is no more than the payment. That last payment is smaller.'),
              prose('Repay £600 a year on £1000 at $20\\%$: $1200 - 600 = 600$, then $720 - 600 = 120$, then a last payment of $144$ clears it.'),
              prose('The interest is everything repaid less the amount borrowed: $600 + 600 + 144 - 1000 = 344$.'),
            ),
            ask('seq-loan-clear', 2),
            ask('seq-loan-interest-tree', 2),
          ],
          skillCheck: [ask('seq-loan-table', 2), ask('seq-loan-clear', 2), ask('seq-loan-interest-tree', 2)],
        },
        {
          id: 'sq-l6-target',
          title: 'Years to a Target',
          slides: [
            teach(
              prose('How many years until savings pass a target? Run the balance a year at a time and stop at the first one over it.'),
              prose('£10 a year, doubled at the end of each year, ends the years on $20, 60, 140, 300$. A target of £200 is first passed in year $4$.'),
            ),
            ask('seq-target-table'),
            ask('seq-target-year'),
            ask('seq-target-payment'),
            teach(
              prose('Beside each balance, write how far it is above the target. The gap is negative until the target is passed, and the first positive gap marks the year.'),
            ),
            ask('seq-target-scale-tree'),
            ask('seq-target-table', 2),
            ask('seq-target-year', 2),
            teach(
              prose('To reach a target in a set number of years, use the fact that every balance is in proportion to the payment.'),
              prose('At $50\\%$, £40 a year ends the years on $60, 150, 285$. To have £1425 after three years, pay $1425 \\div 285 = 5$ times as much: £200 a year.'),
            ),
            ask('seq-target-payment+choice', 2),
            ask('seq-target-scale-tree', 2),
          ],
          skillCheck: [ask('seq-target-year', 2), ask('seq-target-payment', 2), ask('seq-target-scale-tree', 2)],
        },
        {
          id: 'sq-l6-models',
          title: 'Arithmetic or Geometric',
          slides: [
            teach(
              prose('A rent of £800 that rises by £80 a year adds the same amount each time: $800, 880, 960, \\dots$ is arithmetic, $u_n = 800 + 80(n - 1)$.'),
              prose('A rent of £800 that rises by $10\\%$ a year multiplies by $1.1$ each time: $800, 880, 968, \\dots$ is geometric, $u_n = 800 \\times 1.1^{n-1}$.'),
            ),
            ask('seq-model-pick'),
            ask('seq-model-check'),
            ask('seq-model-table'),
            teach(
              prose('The two start the same way, so look at the third value: $960$ against $968$.'),
              prose('Read the words closely. A rise of $10\\%$ of the first year\'s rent is still a fixed £80 each year. A rise of $10\\%$ of the previous year\'s rent grows with the rent.'),
            ),
            ask('seq-model-total-tiles'),
            ask('seq-model-pick', 2),
            ask('seq-model-check', 2),
            teach(
              prose('Once the model is right, the formula follows. A total is a series: the first formula for a fixed rise, the second for a percentage one.'),
              maths('\\begin{gathered} S_n = \\frac{n}{2}(2a + (n - 1)d) \\\\ S_n = \\frac{a(r^n - 1)}{r - 1} \\end{gathered}'),
            ),
            ask('seq-model-table', 2),
            ask('seq-model-total-tiles', 2),
          ],
          skillCheck: [ask('seq-model-check', 2), ask('seq-model-pick', 2), ask('seq-model-total-tiles', 2)],
        },
        {
          id: 'sq-l6-plans',
          title: 'Two Plans Compared',
          slides: [
            teach(
              prose('Plan A pays £500 in year 1 and £100 more each year. Plan B pays £320 in year 1 and $50\\%$ more each year.'),
              maths('\\begin{aligned} A &: 500, 600, 700, 800 \\\\ B &: 320, 480, 720, 1080 \\end{aligned}'),
              prose('A fixed rise wins at first, but a percentage rise grows its own rises: B pays more from year 3 on.'),
            ),
            ask('seq-plans-table'),
            ask('seq-plans-overtake'),
            ask('seq-plans-which'),
            teach(
              prose('Paying more in one year is not paying more overall. Over the first three years A pays $500 + 600 + 700 = 1800$ and B pays $320 + 480 + 720 = 1520$.'),
              prose('B pays more in year 3, and A is still ahead in total.'),
            ),
            ask('seq-plans-total-tree'),
            ask('seq-plans-table', 2),
            ask('seq-plans-overtake', 2),
            teach(
              prose('Totals come from the sum formulae. Over five years:'),
              maths('\\begin{aligned} S_A &= \\tfrac{5}{2}(1000 + 400) \\\\ &= 3500 \\\\ S_B &= \\frac{320(1.5^5 - 1)}{1.5 - 1} \\\\ &= 4220 \\end{aligned}'),
              prose('By year 5 the percentage plan is ahead in total too.'),
            ),
            ask('seq-plans-which', 2),
            ask('seq-plans-total-tree', 2),
          ],
          skillCheck: [ask('seq-plans-overtake', 2), ask('seq-plans-which', 2), ask('seq-plans-total-tree', 2)],
        },
      ],
      levelCheck: [
        ask('seq-save-series-tiles', 2),
        ask('seq-loan-rule-tiles', 2),
        ask('seq-target-year', 2),
        ask('seq-model-check', 2),
        ask('seq-plans-which', 2),
        ask('seq-save-balance', 2),
        ask('seq-loan-interest-tree', 2),
        ask('seq-target-payment', 2),
        ask('seq-model-table', 2),
        ask('seq-plans-overtake', 2),
        ask('seq-save-table', 2),
        ask('seq-loan-clear', 2),
        ask('seq-target-scale-tree', 2),
        ask('seq-model-total-tiles', 2),
        ask('seq-plans-total-tree', 2),
      ],
    },
  ],
};
