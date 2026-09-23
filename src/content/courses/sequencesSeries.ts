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
 * Later levels — limits of sequences, sums of powers and the method of
 * differences, series in context — are in the level plan in
 * `docs/roadmap/levels/sequences-series.md`.
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
  ],
};
