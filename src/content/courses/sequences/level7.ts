/**
 * Sequences & Series, level 7: Harder Arithmetic and Geometric Problems.
 *
 * Two facts fix a sequence: two terms some way apart, two sums, or a term
 * and a sum, each written as an equation and solved together. Then an
 * unknown k inside three consecutive terms, the arithmetic mean giving a
 * linear equation and the geometric one a quadratic with a root to rule out;
 * the sum to infinity run backwards, and S_2n = S_n(1 + r^n). The level ends
 * on the least n for which a sum or a term passes a value: logarithms for a
 * geometric series, flipping the inequality when ln r < 0, and a quadratic
 * for an arithmetic one, always rounded to the next whole n and checked.
 *
 * Generators: `generators/sequencesHarder.ts`.
 */
import type { Level } from '../../types';
import { ask, maths, prose, teach } from './blocks';

export const harderProblems: Level = {
  id: 'sq-l7',
  title: 'Harder Arithmetic and Geometric Problems',
  lessons: [
    {
      id: 'sq-l7-two-terms',
      title: 'Two Terms Given',
      slides: [
        teach(
          prose('Two terms that are not next to each other still fix an arithmetic sequence. Write each with the $n$th term formula:'),
          maths('u_n = a + (n - 1)d'),
          prose('Then take one from the other: the $a$ cancels.'),
          prose('For $u_5 = 23$ and $u_{12} = 51$:'),
          maths('\\begin{aligned} a + 4d &= 23 \\\\ a + 11d &= 51 \\\\ 7d &= 28 \\\\ d &= 4 \\end{aligned}'),
          prose('Then the first term, and any term after it:'),
          maths('\\begin{aligned} a &= 23 - 4 \\times 4 = 7 \\\\ u_{30} &= 7 + 29 \\times 4 = 123 \\end{aligned}'),
        ),
        ask('seq-l7-ap-two-tree'),
        ask('seq-l7-fill-table'),
        ask('seq-l7-ap-two'),
        teach(
          prose('For a geometric sequence, write both terms with the $n$th term formula:'),
          maths('u_n = ar^{n-1}'),
          prose('Divide the later by the earlier. The $a$ cancels and leaves a power of $r$. For $u_2 = 6$ and $u_5 = 162$:'),
          maths('\\begin{aligned} ar &= 6 \\\\ ar^4 &= 162 \\\\ r^3 &= 27 \\\\ r &= 3 \\end{aligned}'),
          prose('So $a = 6 \\div 3 = 2$.'),
          prose('An even power has two roots. With $u_3 = 12$ and $u_5 = 48$:'),
          maths('\\begin{aligned} r^2 &= 48 \\div 12 = 4 \\\\ r &= 2 \\text{ or } r = -2 \\end{aligned}'),
          prose('Both fit:'),
          maths('\\begin{gathered} 3, \\; 6, \\; 12, \\; 24, \\; 48 \\\\ 3, \\; -6, \\; 12, \\; -24, \\; 48 \\end{gathered}'),
          prose('A question with an even power says which it means, such as "its common ratio is positive".'),
        ),
        ask('seq-l7-gp-two-tree'),
        ask('seq-l7-gp-sign'),
        teach(
          prose(
            '"The ratio is positive" or "all its terms are positive" picks the positive root. "The ratio is negative" or "its terms alternate in sign" picks the negative one. An odd power never needs telling: $r^3 = -8$ has the one real root $r = -2$.',
          ),
          prose('With $r = -2$ in the second example above:'),
          maths('\\begin{aligned} a &= 12 \\div (-2)^2 = 3 \\\\ u_8 &= 3 \\times (-2)^7 = -384 \\end{aligned}'),
        ),
        ask('seq-l7-gp-sign', 2),
        ask('seq-l7-gp-two', 2),
        ask('seq-l7-fill-table', 2),
      ],
      skillCheck: [ask('seq-l7-ap-two', 2), ask('seq-l7-gp-two', 2), ask('seq-l7-gp-sign', 2)],
    },
    {
      id: 'sq-l7-two-sums',
      title: 'Conditions on Sums',
      slides: [
        teach(
          prose(
            'Two facts about an arithmetic series give two equations in $a$ and $d$. A term gives $a + (n - 1)d$. A sum gives $\\frac{n}{2}(2a + (n - 1)d)$: multiply by $2$ and divide by $n$ to leave the bracket.',
          ),
          prose('For $S_5 = 40$ and $S_{10} = 155$:'),
          maths(
            '\\begin{aligned} \\tfrac{5}{2}(2a + 4d) &= 40 \\\\ 2a + 4d &= 16 \\\\ 5(2a + 9d) &= 155 \\\\ 2a + 9d &= 31 \\end{aligned}',
          ),
        ),
        ask('seq-l7-fact-equation'),
        ask('seq-l7-sum-tiles'),
        teach(
          prose('Take one equation from the other and the $2a$ cancels:'),
          maths('\\begin{aligned} 5d &= 31 - 16 = 15 \\\\ d &= 3 \\\\ 2a &= 16 - 4 \\times 3 = 4 \\\\ a &= 2 \\end{aligned}'),
          prose('Check against the facts given:'),
          maths('S_5 = \\tfrac{5}{2}(4 + 12) = 40 \\qquad S_{10} = 5(4 + 27) = 155'),
        ),
        ask('seq-l7-two-sums-tree'),
        ask('seq-l7-two-sums'),
        ask('seq-l7-sum-tiles', 2),
        teach(
          prose('A term and a sum work the same way. For $u_4 = 11$ and $S_{10} = 125$, double the term\'s equation so that the $2a$ cancels:'),
          maths('\\begin{aligned} a + 3d &= 11 \\\\ 2a + 6d &= 22 \\\\ 2a + 9d &= 25 \\\\ 3d &= 3 \\end{aligned}'),
          prose('So $d = 1$, and then $a$:'),
          maths('a = 11 - 3 \\times 1 = 8'),
          prose('Any later term or sum then follows:'),
          maths('S_{20} = 10(16 + 19) = 350'),
        ),
        ask('seq-l7-term-sum'),
        ask('seq-l7-fact-equation', 2),
        ask('seq-l7-term-sum+choice', 2),
      ],
      skillCheck: [ask('seq-l7-two-sums', 2), ask('seq-l7-term-sum', 2), ask('seq-l7-sum-tiles', 2)],
    },
    {
      id: 'sq-l7-consecutive',
      title: 'Unknowns in Consecutive Terms',
      slides: [
        teach(
          prose('Three consecutive terms of an arithmetic sequence go up by the same step, so the middle one is the mean of the other two:'),
          maths('2u_2 = u_1 + u_3'),
          prose('For $k + 1$, $3k - 2$ and $4k + 1$:'),
          maths('\\begin{aligned} 2(3k - 2) &= (k + 1) + (4k + 1) \\\\ 6k - 4 &= 5k + 2 \\\\ k &= 6 \\end{aligned}'),
          prose('The terms are $7, 16, 25$, so $d = 9$ and the next term is $34$.'),
        ),
        ask('seq-l7-middle-tiles'),
        ask('seq-l7-ap-unknown'),
        ask('seq-l7-ap-unknown-tree'),
        teach(
          prose('In a geometric sequence the ratios agree, so the middle term squared is the product of the other two:'),
          maths('\\frac{u_2}{u_1} = \\frac{u_3}{u_2} \\qquad u_2^2 = u_1u_3'),
          prose('With $k$ in the terms, that is usually a quadratic. For $k + 4$, $k$ and $2k - 15$:'),
          maths('\\begin{aligned} k^2 &= (k + 4)(2k - 15) \\\\ k^2 &= 2k^2 - 7k - 60 \\\\ 0 &= k^2 - 7k - 60 \\\\ 0 &= (k - 12)(k + 5) \\end{aligned}'),
          prose(
            'Both roots make a geometric sequence. $k = 12$ gives $16, 12, 9$ with $r = \\frac{3}{4}$, and $k = -5$ gives $-1, -5, -25$ with $r = 5$. The question\'s condition picks one: "it has a sum to infinity" or "all its terms are positive" both mean $k = 12$.',
          ),
        ),
        ask('seq-l7-root-flow'),
        ask('seq-l7-middle-tiles', 2),
        teach(
          prose('Once $k$ is known, so is the sequence. With $k = 12$ above, $a = 16$ and $r = \\frac{3}{4}$:'),
          maths('S_\\infty = \\frac{16}{1 - \\frac{3}{4}} = 64'),
          prose(
            'Any condition works the same way, "its common ratio is negative" included: find both roots, write out each set of terms, and keep the one that fits.',
          ),
        ),
        ask('seq-l7-gp-unknown'),
        ask('seq-l7-gp-unknown+choice', 2),
        ask('seq-l7-root-flow', 2),
      ],
      skillCheck: [ask('seq-l7-ap-unknown', 2), ask('seq-l7-gp-unknown', 2), ask('seq-l7-middle-tiles', 2)],
    },
    {
      id: 'sq-l7-gp-conditions',
      title: 'Geometric Conditions',
      slides: [
        teach(
          prose('The sum to infinity runs backwards to give $r$:'),
          maths('S_\\infty = \\frac{a}{1 - r}'),
          prose('With first term $12$ and $S_\\infty = 30$:'),
          maths('\\begin{aligned} \\frac{12}{1 - r} &= 30 \\\\ 1 - r &= \\tfrac{2}{5} \\\\ r &= \\tfrac{3}{5} \\end{aligned}'),
          prose('When the sum to infinity is a multiple of the first term, the $a$ cancels. For $4$ times the first term:'),
          maths('\\begin{aligned} \\frac{a}{1 - r} &= 4a \\\\ 1 - r &= \\tfrac{1}{4} \\\\ r &= \\tfrac{3}{4} \\end{aligned}'),
          prose('A multiple below $1$ means a negative ratio. For $\\frac{2}{3}$ of the first term:'),
          maths('\\begin{aligned} 1 - r &= \\tfrac{3}{2} \\\\ r &= -\\tfrac{1}{2} \\end{aligned}'),
        ),
        ask('seq-l7-inf-ratio'),
        ask('seq-l7-inf-ratio+choice', 2),
        teach(
          prose('Given the second term instead, write $a$ in terms of $r$. With $S_\\infty = 8$ and $u_2 = -6$, $ar = -6$ gives $a = -\\frac{6}{r}$:'),
          maths(
            '\\begin{aligned} -\\frac{6}{r(1 - r)} &= 8 \\\\ 8r - 8r^2 &= -6 \\\\ 4r^2 - 4r - 3 &= 0 \\\\ (2r + 1)(2r - 3) &= 0 \\end{aligned}',
          ),
          prose('So $r = -\\frac{1}{2}$ or $r = \\frac{3}{2}$. Only $|r| < 1$ has a sum to infinity, so $r = -\\frac{1}{2}$ and $a = 12$.'),
          prose(
            'With a positive second term both roots can fit. $S_\\infty = 9$ and $u_2 = 2$ give $r = \\frac{1}{3}$ or $r = \\frac{2}{3}$: two different series, starting at $6$ and at $3$.',
          ),
        ),
        ask('seq-l7-inf-flow'),
        ask('seq-l7-inf-second'),
        ask('seq-l7-inf-flow', 2),
        teach(
          prose('Two sums of a geometric series are linked. Terms $n + 1$ to $2n$ are the first $n$ terms each multiplied by $r^n$, so:'),
          maths('S_{2n} = S_n(1 + r^n)'),
          prose('With $S_3 = 26$ and $S_6 = 728$:'),
          maths(
            '\\begin{aligned} 1 + r^3 &= \\tfrac{728}{26} = 28 \\\\ r^3 &= 27 \\\\ r &= 3 \\\\ \\frac{a(3^3 - 1)}{3 - 1} &= 26 \\\\ 13a &= 26 \\\\ a &= 2 \\end{aligned}',
          ),
          prose('With an even $n$, $r^n$ has two roots again, and the question says which.'),
        ),
        ask('seq-l7-sum-ratio-tree'),
        ask('seq-l7-sum-ratio', 2),
        ask('seq-l7-inf-second', 2),
      ],
      skillCheck: [ask('seq-l7-inf-ratio', 2), ask('seq-l7-inf-second', 2), ask('seq-l7-sum-ratio', 2)],
    },
    {
      id: 'sq-l7-least-n',
      title: 'The Least n',
      slides: [
        teach(
          prose('When does a geometric sum first pass a value? For $5 + 15 + 45 + \\dots$, the least $n$ with $S_n > 2000$:'),
          maths('\\begin{gathered} \\frac{5(3^n - 1)}{2} > 2000 \\\\ 3^n - 1 > 800 \\\\ 3^n > 801 \\end{gathered}'),
          prose('Take logs. $\\ln 3$ is positive, so the inequality keeps its direction:'),
          maths('\\begin{gathered} n > \\frac{\\ln 801}{\\ln 3} \\\\ n > 6.09 \\end{gathered}'),
          prose(
            '$n$ is whole, so round **up**: $n = 7$. Check: $S_6 = 1820$ is short and $S_7 = 5465$ is past. A single term works the same way, except that $u_n$ has the power $n - 1$: solve for $n - 1$, then add $1$.',
          ),
        ),
        ask('seq-l7-log-tiles'),
        ask('seq-l7-least-gp'),
        ask('seq-l7-least-table'),
        teach(
          prose('With $0 < r < 1$ the terms shrink. The first term of $400, 320, 256, \\dots$ below $1$:'),
          maths('\\begin{gathered} 400 \\times 0.8^{n-1} < 1 \\\\ 0.8^{n-1} < \\tfrac{1}{400} \\end{gathered}'),
          prose('$\\ln 0.8$ is negative, and dividing by a negative number **flips** the inequality:'),
          maths('\\begin{gathered} n - 1 > \\frac{\\ln\\left(\\frac{1}{400}\\right)}{\\ln 0.8} \\\\ n - 1 > 26.85 \\end{gathered}'),
          prose(
            'So $n - 1 = 27$ and $n = 28$. Check: $u_{27} \\approx 1.21$ and $u_{28} \\approx 0.97$. For the **largest** $n$ with $u_n$ still above a value, the flipped inequality reads $n - 1 < \\dots$, and you round down instead.',
          ),
        ),
        ask('seq-l7-flip-flow'),
        ask('seq-l7-least-gp', 2),
        teach(
          prose('An arithmetic sum is a quadratic in $n$. For $4 + 7 + 10 + \\dots$, the least $n$ with $S_n > 200$:'),
          maths('\\begin{gathered} \\tfrac{n}{2}(8 + 3(n - 1)) > 200 \\\\ n(3n + 5) > 400 \\\\ 3n^2 + 5n - 400 > 0 \\end{gathered}'),
          prose('The quadratic is positive beyond its larger root, so find that root:'),
          maths('\\begin{gathered} n = \\frac{-5 + \\sqrt{4825}}{6} \\\\ n \\approx 10.74 \\end{gathered}'),
          prose('Round up: $n = 11$. Check: $S_{10} = 175$ and $S_{11} = 209$.'),
        ),
        ask('seq-l7-least-ap'),
        ask('seq-l7-flip-flow', 2),
        ask('seq-l7-least-table', 2),
      ],
      skillCheck: [ask('seq-l7-least-gp', 2), ask('seq-l7-least-ap', 2), ask('seq-l7-flip-flow', 2)],
    },
  ],
  levelCheck: [
    ask('seq-l7-ap-two', 2),
    ask('seq-l7-gp-sign', 2),
    ask('seq-l7-fill-table', 2),
    ask('seq-l7-gp-two+choice', 2),
    ask('seq-l7-sum-tiles', 2),
    ask('seq-l7-term-sum', 2),
    ask('seq-l7-two-sums-tree', 2),
    ask('seq-l7-ap-unknown', 2),
    ask('seq-l7-root-flow', 2),
    ask('seq-l7-gp-unknown', 2),
    ask('seq-l7-flip-flow', 2),
    ask('seq-l7-inf-second', 2),
    ask('seq-l7-least-ap+choice', 2),
    ask('seq-l7-sum-ratio', 2),
    ask('seq-l7-least-gp', 2),
  ],
};
