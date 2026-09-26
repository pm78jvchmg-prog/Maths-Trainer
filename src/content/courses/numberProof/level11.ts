/**
 * Number & Proof, level 11: Divisors and Unique Factorisation. Shown in
 * Number Theory (see placement.ts).
 *
 * Divisibility & Primes factorised numbers and counted their factors. This
 * level reads everything else off the same powers: whether one number divides
 * another and what the quotient is, squares and cubes and their roots, the sum
 * of the divisors sigma(n) and why its formula works, perfect, abundant and
 * deficient numbers, and divisors in pairs d and n / d. Its generators are in
 * `numberDivisors.ts`.
 */
import type { Level } from '../../types';
import { ask, askAfter, maths, prose, teach } from './blocks';

export const npL11: Level = {
  id: 'np-l11',
  title: 'Divisors and Unique Factorisation',
  lessons: [
    {
      id: 'np-l11-dividing',
      title: 'Divides, from the Powers',
      slides: [
        teach(
          prose(
            'Every whole number above $1$ is a product of primes in exactly one way: its **prime factorisation**. So a number can be described entirely by the power of each prime in it.',
          ),
          prose(
            '$a$ divides $b$ exactly when $b = a \\times c$ for a whole number $c$. Multiplying adds powers, so $a$ divides $b$ exactly when **each prime’s power in $a$ is at most its power in $b$**.',
          ),
          maths('\\begin{gathered} b = 2^3 \\times 3^2 \\times 5 \\\\ 2^2 \\times 3 \\text{ divides } b \\\\ 2^4 \\text{ does not} \\end{gathered}'),
          prose('$b$ has only three $2$s, so $2^4$ cannot divide it. A prime that is not in $b$ at all, such as $7$, rules a number out too.'),
        ),
        ask('dvf-divides'),
        ask('dvf-divides-flow'),
        ask('dvf-divides', 2),
        teach(
          prose(
            'When $a$ divides $b$, the quotient $b \\div a$ has each prime’s power in $b$ take away its power in $a$. Nothing needs multiplying out.',
          ),
          maths('\\begin{aligned} b &= 2^3 \\times 3^2 \\times 5 \\\\ a &= 2^2 \\times 3 \\end{aligned}'),
          prose('The $2$s go from $3$ to $3 - 2 = 1$, the $3$s from $2$ to $1$, and the $5$ stays, since $a$ has none:'),
          maths('b \\div a = 2 \\times 3 \\times 5 = 30'),
        ),
        ask('dvf-quotient-table'),
        ask('dvf-quotient'),
        ask('dvf-quotient-table', 2),
        teach(
          prose(
            'When $a$ does not divide $b$, the smallest $k$ for which $a$ divides $b \\times k$ supplies just what $b$ is short of, prime by prime.',
          ),
          maths('\\begin{aligned} a &= 2^3 \\times 3^2 \\\\ b &= 2 \\times 3^2 \\times 5 \\end{aligned}'),
          prose('$b$ has one $2$ where $a$ needs three, so it is two $2$s short. It has the $3$s it needs. So $k = 2^2 = 4$.'),
        ),
        ask('dvf-missing'),
        ask('dvf-missing+choice', 2),
      ],
      skillCheck: [ask('dvf-divides-flow', 2), ask('dvf-quotient', 2), ask('dvf-missing', 2)],
    },
    {
      id: 'np-l11-squares-cubes',
      title: 'Squares and Cubes',
      slides: [
        teach(
          prose(
            'Squaring a number doubles every power in it, and cubing trebles them. By unique factorisation it works back the other way: a **perfect square** has every power even, and a **perfect cube** every power a multiple of $3$.',
          ),
          maths('\\begin{gathered} N = 2^4 \\times 3^2 \\times 5^2 \\\\ \\sqrt{N} = 2^2 \\times 3 \\times 5 = 60 \\end{gathered}'),
          prose('Halve every power for the square root. For a cube root, divide every power by $3$: $\\sqrt[3]{2^6 \\times 5^3} = 2^2 \\times 5 = 20$.'),
        ),
        ask('dvf-is-square'),
        ask('dvf-root'),
        ask('dvf-is-square', 2),
        teach(
          prose('To make a square by multiplying, give each odd power one more of its prime. Factorise first:'),
          maths('\\begin{gathered} 360 = 2^3 \\times 3^2 \\times 5 \\\\ k = 2 \\times 5 = 10 \\end{gathered}'),
          prose(
            '$360 \\times 10 = 2^4 \\times 3^2 \\times 5^2 = 60^2$. To make a square by **dividing** instead, take one of each of those primes away: $360 \\div 10 = 36 = 6^2$.',
          ),
        ),
        ask('dvf-multiplier'),
        ask('dvf-power-table'),
        ask('dvf-divide'),
        teach(
          prose('For a cube, top each power up to the next multiple of $3$. With $360 = 2^3 \\times 3^2 \\times 5$:'),
          maths('\\begin{gathered} 3 + 0 = 3, \\quad 2 + 1 = 3, \\quad 1 + 2 = 3 \\\\ k = 3 \\times 5^2 = 75 \\end{gathered}'),
          prose(
            'To divide down to a cube, take each power down to the multiple of $3$ below it: $d = 3^2 \\times 5 = 45$, and $360 \\div 45 = 8 = 2^3$.',
          ),
        ),
        ask('dvf-multiplier', 2),
        ask('dvf-root+choice', 2),
      ],
      skillCheck: [ask('dvf-multiplier', 2), ask('dvf-power-table', 2), ask('dvf-root', 2)],
    },
    {
      id: 'np-l11-sum',
      title: 'Sum of Divisors',
      slides: [
        teach(
          prose(
            '$\\sigma(n)$, read "sigma of $n$", is the sum of all the positive divisors of $n$, with $1$ and $n$ itself included.',
          ),
          maths('\\begin{aligned} \\sigma(12) &= 1 + 2 + 3 + 4 + 6 + 12 \\\\ &= 28 \\end{aligned}'),
          prose('A prime $p$ has just the divisors $1$ and $p$, so $\\sigma(p) = p + 1$.'),
        ),
        ask('dvf-sigma-list'),
        ask('dvf-sigma-list+choice', 2),
        teach(
          prose(
            'Each divisor of $12$ is a power of $2$ times a power of $3$. Multiply out one bracket for each prime:',
          ),
          maths('\\begin{aligned} &(1 + 2 + 4)(1 + 3) \\\\ &= 1 + 3 + 2 + 6 + 4 + 12 \\end{aligned}'),
          prose(
            'Each term picks one power of $2$ and one of $3$, so every divisor comes out exactly once. So $\\sigma(12) = 7 \\times 4 = 28$, and in general, for $n = p^a \\times q^b$,',
          ),
          maths('\\begin{gathered} \\sigma(n) = (1 + p + \\dots + p^a) \\\\ \\times (1 + q + \\dots + q^b) \\end{gathered}'),
          prose('with one bracket for each prime when there are more.'),
        ),
        ask('dvf-divisor-grid'),
        ask('dvf-sigma-tree'),
        ask('dvf-divisor-grid', 2),
        teach(
          prose(
            'The brackets for $72 = 8 \\times 9$ are $\\sigma(8)$ and $\\sigma(9)$, so $\\sigma(72) = 15 \\times 13 = 195$. When $a$ and $b$ **share no prime**, $\\sigma(ab) = \\sigma(a) \\times \\sigma(b)$.',
          ),
          prose(
            'Not otherwise: $\\sigma(4) = 7$, but $\\sigma(2) \\times \\sigma(2) = 9$. Multiplying the brackets of $2$ by themselves counts the divisor $2$ twice.',
          ),
        ),
        ask('dvf-sigma-tiles'),
        ask('dvf-sigma+choice', 2),
      ],
      skillCheck: [ask('dvf-sigma', 2), ask('dvf-divisor-grid', 2), ask('dvf-sigma-tiles', 2)],
    },
    {
      id: 'np-l11-perfect',
      title: 'Perfect, Abundant and Deficient',
      slides: [
        teach(
          prose(
            'The **proper divisors** of $n$ are all its divisors except $n$ itself, so they add to $\\sigma(n) - n$. Compare that with $n$:',
          ),
          prose(
            'Equal to $n$: **perfect**, as $6 = 1 + 2 + 3$. More than $n$: **abundant**, as $12$, with $1 + 2 + 3 + 4 + 6 = 16$. Less than $n$: **deficient**, as $8$, with $1 + 2 + 4 = 7$.',
          ),
        ),
        ask('dvf-classify'),
        ask('dvf-proper-sum'),
        ask('dvf-classify-flow'),
        teach(
          prose('For a prime, $\\sigma(p) - p = 1$, so every prime is deficient.'),
          prose('A power of $2$ falls short by exactly one. For $16$:'),
          maths('\\begin{gathered} 1 + 2 + 4 + 8 = 15 \\\\ 15 = 16 - 1 \\end{gathered}'),
          prose(
            'For a bigger number, use the brackets from Sum of Divisors: $\\sigma(100) = 7 \\times 31 = 217$, so the proper divisors of $100$ add to $117$ and $100$ is abundant.',
          ),
        ),
        ask('dvf-proper-sum+choice', 2),
        ask('dvf-which-abundant'),
        teach(
          prose(
            'The perfect numbers under $1000$ are $6$, $28$ and $496$. Each is a power of $2$ times a prime one less than the next power of $2$:',
          ),
          maths('\\begin{gathered} 6 = 2 \\times 3, \\quad 28 = 4 \\times 7 \\\\ 496 = 16 \\times 31 \\end{gathered}'),
          prose('For $496 = 2^4 \\times 31$, the brackets give'),
          maths('\\begin{gathered} \\sigma(16) = 31, \\quad \\sigma(31) = 32 \\\\ \\sigma(496) = 31 \\times 32 = 992 \\end{gathered}'),
          prose('and $992 - 496 = 496$. With any other odd prime in place of $31$, the same working decides the kind.'),
        ),
        ask('dvf-two-power-tree'),
        ask('dvf-classify-flow', 2),
      ],
      skillCheck: [ask('dvf-classify', 2), ask('dvf-two-power-tree', 2), ask('dvf-proper-sum', 2)],
    },
    {
      id: 'np-l11-pairs',
      title: 'Pairing Divisors',
      slides: [
        teach(
          prose(
            'If $d$ divides $n$, so does $n \\div d$, and the two multiply to $n$. So divisors come in pairs, one of each pair at most $\\sqrt{n}$. For $60$:',
          ),
          maths('\\begin{gathered} 1 \\times 60, \\quad 2 \\times 30, \\quad 3 \\times 20 \\\\ 4 \\times 15, \\quad 5 \\times 12, \\quad 6 \\times 10 \\end{gathered}'),
          prose(
            'That is $12$ divisors, found by checking only up to $\\sqrt{60}$. For $36$, the last pair is $6 \\times 6$: $6$ pairs with itself, and $36$ has $9$ divisors, an odd number.',
          ),
        ),
        ask('dvf-pair-table'),
        ask('dvf-odd-count'),
        ask('dvf-pair-table', 2),
        teach(
          prose(
            'A divisor pairs with itself only when $d = n \\div d$, that is $d^2 = n$. So if $n$ is not a square, the divisors split into pairs of two different numbers and there is an even number of them.',
          ),
          prose(
            'So a number has an **odd** number of divisors exactly when it is a square. From $1$ to $50$ those are $1^2, 2^2, \\dots, 7^2$, since $7^2 = 49$ and $8^2 = 64$: $7$ numbers.',
          ),
          prose(
            'From Squares and Cubes, a square is a number with every power even. So $2^2 \\times 3^4$ has an odd number of divisors, and $2^3 \\times 3^4$ an even number.',
          ),
        ),
        ask('dvf-pair-order'),
        ask('dvf-upto'),
        ask('dvf-odd-count', 2),
        teach(
          prose(
            'The pairs also give the product of all the divisors. From Number & Proof, Divisibility & Primes: add one to each power and multiply to count them. $12 = 2^2 \\times 3$ has $3 \\times 2 = 6$ divisors, so $3$ pairs, each making $12$:',
          ),
          maths('1 \\times 2 \\times 3 \\times 4 \\times 6 \\times 12 = 12^3'),
          prose(
            'A square has one divisor left over. $36 = 2^2 \\times 3^2$ has $9$ divisors: $4$ pairs making $36 = 6^2$, and $6$ alone. So the product is $(6^2)^4 \\times 6 = 6^9$.',
          ),
        ),
        askAfter(
          'dvf-product-power',
          1,
          prose('Count the divisors, then halve: $n$ with $t$ divisors, not a square, has product $n^{t/2}$.'),
        ),
        ask('dvf-product-power+choice', 2),
      ],
      skillCheck: [ask('dvf-pair-order', 2), ask('dvf-upto', 2), ask('dvf-product-power', 2)],
    },
  ],
  levelCheck: [
    ask('dvf-divides-flow', 2),
    ask('dvf-quotient', 2),
    ask('dvf-quotient-table', 2),
    ask('dvf-missing', 2),
    ask('dvf-root', 2),
    ask('dvf-multiplier', 2),
    ask('dvf-divide', 2),
    ask('dvf-sigma', 2),
    ask('dvf-sigma-tree', 2),
    ask('dvf-sigma-tiles', 2),
    ask('dvf-classify', 2),
    ask('dvf-two-power-tree', 2),
    ask('dvf-pair-table', 2),
    ask('dvf-upto', 2),
    ask('dvf-product-power', 2),
  ],
};
