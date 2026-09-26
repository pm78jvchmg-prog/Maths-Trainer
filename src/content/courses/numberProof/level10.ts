/**
 * Number & Proof, level 10: Fermat's Little Theorem.
 *
 * Shown on the Number Theory card, after Modular Arithmetic and Linear
 * Congruences and Inverses. The theorem itself, seen in a table of powers and
 * in the row a, 2a, ..., (p - 1)a coming back as 1 to p - 1 in a new order;
 * cutting big powers down by p - 1; a^(p - 2) as an inverse and a^p ≡ a; the
 * theorem turned round as a test for composites, with 341 as the number that
 * fools it; and Wilson's theorem from pairing inverses. Euler's totient is
 * left to Contest Maths. Generators are in `generators/numberFermat.ts`.
 */
import type { Level } from '../../types';
import { ask, maths, prose, teach } from './blocks';

export const npL10: Level = {
  id: 'np-l10',
  title: "Fermat's Little Theorem",
  lessons: [
    {
      id: 'np-l10-statement',
      title: 'The Theorem',
      slides: [
        teach(
          prose("**Fermat's little theorem**: if $p$ is prime and $p$ does not divide $a$, then"),
          maths('a^{p - 1} \\equiv 1 \\pmod{p}'),
          prose('The powers of $3$ modulo $7$, reduced as you go, show it. $7$ is prime and does not divide $3$, and the sixth power is $1$:'),
          maths(
            '\\begin{array}{c|cccccc} k & 1 & 2 & 3 & 4 & 5 & 6 \\\\ \\hline 3^k \\equiv & 3 & 2 & 6 & 4 & 5 & 1 \\end{array}',
          ),
        ),
        ask('flt-power-table'),
        ask('flt-true'),
        ask('flt-applies'),
        teach(
          prose('Both conditions matter. If $p$ divides $a$, every power of $a$ is a multiple of $p$, so $14^{6} \\equiv 0 \\pmod{7}$, not $1$.'),
          prose('And $p$ has to be prime. Modulo $9$ the powers of $2$ run'),
          maths('2, \\ 4, \\ 8, \\ 7, \\ 5, \\ 1, \\ 2, \\ 4'),
          prose(
            'so $2^{8} \\equiv 4 \\pmod{9}$, not $1$. When the theorem does not apply, work the power out as in Modular Arithmetic.',
          ),
        ),
        ask('flt-residue'),
        ask('flt-applies', 2),
        ask('flt-residue+choice', 2),
        teach(
          prose('Why it holds: multiply each of $1$ to $6$ by $3$ and reduce modulo $7$.'),
          maths(
            '\\begin{array}{c|cccccc} k & 1 & 2 & 3 & 4 & 5 & 6 \\\\ \\hline 3k \\equiv & 3 & 6 & 2 & 5 & 1 & 4 \\end{array}',
          ),
          prose(
            'Reduced, the bottom row is $1$ to $6$ again in a new order, so it multiplies to $6!$. Unreduced, it is $3$ times each of $1$ to $6$, and those multiply to $3^{6} \\times 6!$. So',
          ),
          maths('3^{6} \\times 6! \\equiv 6! \\pmod{7}'),
          prose(
            'So $7$ divides $(3^{6} - 1) \\times 6!$. A prime that divides a product divides one of its factors, and $7$ divides none of $1$ to $6$, so it divides $3^{6} - 1$. Any prime and any base it does not divide work the same way.',
          ),
        ),
        ask('flt-row-table'),
        ask('flt-true', 2),
      ],
      skillCheck: [ask('flt-applies', 2), ask('flt-residue', 2), ask('flt-power-table', 2)],
    },
    {
      id: 'np-l10-big-powers',
      title: 'Reducing Big Powers',
      slides: [
        teach(
          prose('Since $a^{p - 1} \\equiv 1$, every block of $p - 1$ in the power can be dropped. For $3^{200}$ modulo $7$, $p - 1 = 6$:'),
          maths('\\begin{gathered} 200 = 33 \\times 6 + 2 \\\\ 3^{200} = (3^{6})^{33} \\times 3^{2} \\\\ 3^{200} \\equiv 1 \\times 9 \\equiv 2 \\end{gathered}'),
          prose('Only the remainder of the power on division by $p - 1$ matters. Dividing by $p$, here $7$, is the usual slip.'),
        ),
        ask('flt-big'),
        ask('flt-big-tiles'),
        ask('flt-exp-table'),
        teach(
          prose('A base bigger than $p$ is reduced first. For $30^{123}$ modulo $13$, $30 \\equiv 4$ and $p - 1 = 12$:'),
          maths('\\begin{gathered} 123 = 10 \\times 12 + 3 \\\\ 30^{123} \\equiv 4^{3} = 64 \\equiv 12 \\end{gathered}'),
          prose('If the remainder is $0$, the power is a whole number of blocks and the residue is $1$.'),
        ),
        ask('flt-big-flow'),
        ask('flt-big+choice', 2),
        ask('flt-big-tiles', 2),
        teach(
          prose(
            'In Modular Arithmetic you found the cycle of powers first. Modulo a prime there is no need: the length of the cycle always divides $p - 1$, so cutting down by $p - 1$ is always safe.',
          ),
          prose('Modulo $7$ the powers of $2$ run $2, 4, 1$, a cycle of $3$, and $6 = 2 \\times 3$. Cutting $2^{100}$ down by $6$ or by $3$ gives the same:'),
          maths('\\begin{gathered} 100 = 16 \\times 6 + 4 \\\\ 2^{4} = 16 \\equiv 2 \\\\ 100 = 33 \\times 3 + 1 \\\\ 2^{1} = 2 \\end{gathered}'),
        ),
        ask('flt-exp-table', 2),
        ask('flt-big-flow', 2),
      ],
      skillCheck: [ask('flt-big', 2), ask('flt-big-tiles', 2), ask('flt-exp-table', 2)],
    },
    {
      id: 'np-l10-inverses',
      title: 'Inverses from Fermat',
      slides: [
        teach(
          prose(
            'As in Linear Congruences and Inverses, an **inverse** of $a$ modulo $p$ is a number $b$ with $ab \\equiv 1 \\pmod{p}$.',
          ),
          prose('Fermat gives one at once. $a \\times a^{p - 2} = a^{p - 1} \\equiv 1$, so $a^{p - 2}$ is an inverse of $a$. For $3$ modulo $7$ that is $3^{5}$:'),
          maths('\\begin{gathered} 3^{2} = 9 \\equiv 2 \\\\ 3^{4} \\equiv 2^{2} = 4 \\\\ 3^{5} \\equiv 4 \\times 3 = 12 \\equiv 5 \\end{gathered}'),
          prose('Check: $3 \\times 5 = 15 = 2 \\times 7 + 1$. A base bigger than $p$ is reduced first, as before.'),
        ),
        ask('flt-inverse-power'),
        ask('flt-inverse'),
        ask('flt-inverse-order'),
        teach(
          prose('For a bigger prime, square repeatedly, as in Modular Arithmetic. The inverse of $5$ modulo $13$ is $5^{11}$, and $11 = 8 + 2 + 1$:'),
          maths('\\begin{aligned} 5^{2} &= 25 \\equiv 12 \\\\ 5^{4} &\\equiv 12^{2} = 144 \\equiv 1 \\\\ 5^{8} &\\equiv 1^{2} = 1 \\end{aligned}'),
          prose('So $5^{11} \\equiv 1 \\times 12 \\times 5 = 60 \\equiv 8$. Check: $5 \\times 8 = 40 = 3 \\times 13 + 1$.'),
        ),
        ask('flt-inverse-squaring'),
        ask('flt-inverse+choice', 2),
        ask('flt-inverse-order', 2),
        teach(
          prose('Multiply both sides of $a^{p - 1} \\equiv 1$ by $a$:'),
          maths('a^{p} \\equiv a \\pmod{p}'),
          prose(
            'This one holds for **every** $a$: when $p$ divides $a$, both sides are $\\equiv 0$. So $20^{7} \\equiv 20 \\equiv 6 \\pmod{7}$, and $21^{7} \\equiv 0$.',
          ),
          prose('One more power is one more factor of $a$. Modulo $7$:'),
          maths('\\begin{gathered} 20^{8} = 20^{7} \\times 20 \\\\ 20^{8} \\equiv 6 \\times 6 = 36 \\equiv 1 \\end{gathered}'),
        ),
        ask('flt-power-p'),
        ask('flt-power-p+choice', 2),
      ],
      skillCheck: [ask('flt-inverse', 2), ask('flt-inverse-squaring', 2), ask('flt-power-p', 2)],
    },
    {
      id: 'np-l10-composite',
      title: 'Spotting Composites',
      slides: [
        teach(
          prose(
            'Turn the theorem round. A prime $n$ that does not divide $a$ gives $a^{n - 1} \\equiv 1 \\pmod{n}$. So if $n$ does not divide $a$ and $a^{n - 1}$ is **not** $1$ modulo $n$, then $n$ is not prime.',
          ),
          prose('Test $15$ with base $2$. $2^{4} = 16 \\equiv 1$, so the powers of $2$ repeat every $4$:'),
          maths('\\begin{gathered} 14 = 3 \\times 4 + 2 \\\\ 2^{14} \\equiv 2^{2} = 4 \\pmod{15} \\end{gathered}'),
          prose('$4$ is not $1$, so $15$ is not prime, and the test never needed a factor of it.'),
        ),
        ask('flt-test-residue'),
        ask('flt-test-flow'),
        ask('flt-verdict'),
        teach(
          prose('The test only works one way: a residue of $1$ does not prove $n$ prime. $341 = 11 \\times 31$, yet with base $2$:'),
          maths('\\begin{gathered} 2^{10} = 1024 = 3 \\times 341 + 1 \\\\ 2^{340} = (2^{10})^{34} \\equiv 1 \\pmod{341} \\end{gathered}'),
          prose('So a $1$ says only that $n$ **might** be prime. A residue other than $1$ proves that $n$ is not.'),
        ),
        ask('flt-verdict', 2),
        ask('flt-test-flow', 2),
        teach(
          prose('For a longer cycle, square repeatedly. Test $21$ with base $2$, where $20 = 16 + 4$:'),
          maths('\\begin{aligned} 2^{4} &= 16 \\\\ 2^{8} &\\equiv 16^{2} = 256 \\equiv 4 \\\\ 2^{16} &\\equiv 4^{2} = 16 \\end{aligned}'),
          prose('So $2^{20} \\equiv 16 \\times 16 = 256 \\equiv 4 \\pmod{21}$. That is not $1$, so $21$ is not prime.'),
        ),
        ask('flt-test-squaring'),
        ask('flt-test-residue+choice', 2),
      ],
      skillCheck: [ask('flt-test-flow', 2), ask('flt-verdict', 2), ask('flt-test-squaring', 2)],
    },
    {
      id: 'np-l10-wilson',
      title: "Wilson's Theorem",
      slides: [
        teach(
          prose('Modulo a prime, every number from $1$ to $p - 1$ has an inverse. Modulo $7$ they pair off:'),
          maths('\\begin{gathered} 2 \\times 4 = 8 \\equiv 1 \\\\ 3 \\times 5 = 15 \\equiv 1 \\end{gathered}'),
          prose('Only $1$ and $6$ are their own inverses: $6 \\times 6 = 36 \\equiv 1$. So in $6!$ each pair makes $1$:'),
          maths('\\begin{gathered} 6! = (2 \\times 4)(3 \\times 5) \\times 6 \\\\ 6! \\equiv 1 \\times 1 \\times 6 = 6 \\end{gathered}'),
          prose('And $6 \\equiv -1$, so $6! \\equiv -1 \\pmod{7}$.'),
        ),
        ask('flt-wilson-table'),
        ask('flt-wilson-true'),
        ask('flt-wilson'),
        teach(
          prose(
            'The pairing works for every prime. If $x \\times x \\equiv 1$, then $p$ divides $(x - 1)(x + 1)$, so $x \\equiv 1$ or $x \\equiv -1$: only $1$ and $p - 1$ are their own inverses. That is **Wilson\'s theorem**:',
          ),
          maths('(p - 1)! \\equiv -1 \\pmod{p}'),
          prose('It gives the factorial one below too. $16! = 16 \\times 15!$ and $16 \\equiv -1 \\pmod{17}$, so'),
          maths('\\begin{gathered} -1 \\equiv 16! \\equiv -1 \\times 15! \\\\ 15! \\equiv 1 \\pmod{17} \\end{gathered}'),
        ),
        ask('flt-wilson-flow'),
        ask('flt-wilson-table', 2),
        teach(
          prose('Two below, the factor $(-1)(-2) = 2$ is left over. Modulo $17$:'),
          maths(
            '\\begin{gathered} 16! = 16 \\times 15 \\times 14! \\\\ 16 \\times 15 \\equiv (-1)(-2) = 2 \\\\ 2 \\times 14! \\equiv -1 \\equiv 16 \\\\ 14! \\equiv 8 \\end{gathered}',
          ),
          prose(
            'For a number $n$ above $4$ that is not prime, $(n - 1)!$ is a multiple of $n$: for $6$, $5! = 120 = 20 \\times 6$, and $8!$ holds both $3$ and $6$, so it is a multiple of $9$. Then $(n - 1)! \\equiv 0 \\pmod{n}$, so only a prime gives $-1$.',
          ),
        ),
        ask('flt-wilson-flow', 2),
        ask('flt-wilson+choice', 2),
      ],
      skillCheck: [ask('flt-wilson', 2), ask('flt-wilson-flow', 2), ask('flt-wilson-table', 2)],
    },
  ],
  levelCheck: [
    ask('flt-power-table', 2),
    ask('flt-applies', 2),
    ask('flt-residue+choice', 2),
    ask('flt-big', 2),
    ask('flt-big-tiles', 2),
    ask('flt-exp-table', 2),
    ask('flt-inverse-power', 2),
    ask('flt-inverse', 2),
    ask('flt-inverse-order', 2),
    ask('flt-power-p+choice', 2),
    ask('flt-test-flow', 2),
    ask('flt-verdict', 2),
    ask('flt-test-squaring', 2),
    ask('flt-wilson', 2),
    ask('flt-wilson-true', 2),
  ],
};
