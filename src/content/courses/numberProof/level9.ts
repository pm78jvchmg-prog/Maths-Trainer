/**
 * Number & Proof, level 9: Linear Congruences and Inverses. Shown on the
 * Number Theory card, after Euclid's Algorithm and Modular Arithmetic, and
 * built on both: the inverse of a modulo n, found from the row of multiples
 * and then by working Euclid's algorithm backwards; solving ax ≡ b by
 * multiplying by the inverse; what happens when HCF(a, n) is not 1; and why
 * cancelling a common factor is only safe when it is coprime to the modulus.
 * Simultaneous congruences are not here. Its generators are in
 * `generators/numberCongruence.ts`.
 */
import type { Level } from '../../types';
import { ask, maths, prose, teach } from './blocks';

export const npL9: Level = {
  id: 'np-l9',
  title: 'Linear Congruences and Inverses',
  lessons: [
    {
      id: 'np-l9-inverses',
      title: 'Inverses mod n',
      slides: [
        teach(
          prose(
            'Dividing by $3$ is multiplying by $\\tfrac{1}{3}$, the number that times $3$ makes $1$. Modulo $n$ there are no fractions, but a whole number can do the same job.',
          ),
          prose(
            'The **inverse** of $a$ modulo $n$ is the number $b$ from $1$ to $n - 1$ with ${ab \\equiv 1 \\pmod{n}}$. It is written $a^{-1}$.',
          ),
          prose('For a small $n$, go along the multiples of $a$, adding $a$ each time and reducing, until you reach $1$. For $3$ modulo $7$:'),
          maths('3, \\ 6, \\ 9 \\equiv 2, \\ 5, \\ 8 \\equiv 1'),
          prose('The $1$ is the fifth multiple, so $3 \\times 5 = 15 \\equiv 1$: the inverse of $3$ modulo $7$ is $5$.'),
        ),
        ask('lcong-inverse-row'),
        ask('lcong-inverse'),
        ask('lcong-inverse-table'),
        teach(
          prose('Not every number has an inverse. The multiples of $4$ modulo $6$ run'),
          maths('4, \\ 8 \\equiv 2, \\ 12 \\equiv 0, \\ 4, \\ 2, \\ \\dots'),
          prose(
            'and never reach $1$. Every multiple of $4$ is even, and so is every multiple of $6$, so $4b$ is never $1$ more than a multiple of $6$.',
          ),
          prose(
            'The same happens whenever $a$ and $n$ share a factor bigger than $1$. So $a$ has an inverse modulo $n$ exactly when $\\text{HCF}(a, n) = 1$; the next lesson shows how to find it then.',
          ),
        ),
        ask('lcong-has-inverse'),
        ask('lcong-inverse-flow'),
        ask('lcong-inverse+choice', 2),
        teach(
          prose(
            'Inverses come in pairs: $3 \\times 5 \\equiv 1 \\pmod{7}$ makes $3$ the inverse of $5$ just as much as $5$ is the inverse of $3$.',
          ),
          prose('Some numbers are their own inverse. $1$ always is, and so is $n - 1$:'),
          maths('\\begin{gathered} n - 1 \\equiv -1 \\\\ (-1) \\times (-1) = 1 \\end{gathered}'),
          prose('Modulo $7$, $6 \\times 6 = 36 = 5 \\times 7 + 1$.'),
          prose('So in a table of inverses, each one you find gives you a second.'),
        ),
        ask('lcong-inverse-table', 2),
        ask('lcong-has-inverse', 2),
      ],
      skillCheck: [ask('lcong-inverse', 2), ask('lcong-inverse-flow', 2), ask('lcong-inverse-table', 2)],
    },
    {
      id: 'np-l9-euclid-inverse',
      title: 'Inverses by Euclid',
      slides: [
        teach(
          prose(
            "For a bigger modulus the row of multiples is long. In Number Theory, Euclid's Algorithm, working a run backwards wrote the HCF as a combination of the two numbers. When $\\text{HCF}(a, n) = 1$ that gives",
          ),
          maths('1 = un + va'),
          prose('for whole numbers $u$ and $v$. Modulo $n$, $un \\equiv 0$, so $va \\equiv 1$: $v$ is the inverse. For $10$ modulo $43$:'),
          maths('\\begin{aligned} 43 &= 4 \\times 10 + 3 \\\\ 10 &= 3 \\times 3 + 1 \\end{aligned}'),
          maths('\\begin{aligned} 1 &= 10 - 3 \\times 3 \\\\ &= 10 - 3(43 - 4 \\times 10) \\\\ &= 13 \\times 10 - 3 \\times 43 \\end{aligned}'),
          prose('So $13 \\times 10 \\equiv 1 \\pmod{43}$: the inverse of $10$ is $13$. Check: $130 = 3 \\times 43 + 1$.'),
        ),
        ask('lcong-from-bezout'),
        ask('lcong-euclid-order'),
        ask('lcong-euclid-inverse'),
        teach(
          prose('The number beside $a$ can come out negative. For $10$ modulo $37$ the run takes three divisions:'),
          maths('\\begin{aligned} 37 &= 3 \\times 10 + 7 \\\\ 10 &= 1 \\times 7 + 3 \\\\ 7 &= 2 \\times 3 + 1 \\end{aligned}'),
          prose('and working back gives'),
          maths('1 = 3 \\times 37 - 11 \\times 10'),
          prose(
            'So $-11 \\times 10 \\equiv 1$. An inverse is given from $1$ to $n - 1$, so add $37$: $-11 + 37 = 26$. Check: $26 \\times 10 = 260 = 7 \\times 37 + 1$.',
          ),
        ),
        ask('lcong-reduce-flow'),
        ask('lcong-from-bezout', 2),
        ask('lcong-euclid-order', 2),
        teach(
          prose(
            "The working fits the table from Number Theory, Euclid's Algorithm, Working Backwards, and modulo $n$ only its $y$ column is needed: each $r$ is $nx + ay$, and $nx \\equiv 0$.",
          ),
          prose('Put $y = 0$ beside $n$ and $y = 1$ beside $a$. Each new $y$ is the $y$ two rows up, take $q$ times the $y$ one row up.'),
          maths('\\begin{array}{ccc} q & r & y \\\\ \\hline & 37 & 0 \\\\ & 10 & 1 \\\\ 3 & 7 & -3 \\\\ 1 & 3 & 4 \\\\ 2 & 1 & -11 \\end{array}'),
          prose('The row with $r = 1$ has $y = -11$, so the inverse is $-11 + 37 = 26$, as before.'),
        ),
        ask('lcong-euclid-table'),
        ask('lcong-euclid-inverse+choice', 2),
      ],
      skillCheck: [ask('lcong-euclid-inverse', 2), ask('lcong-euclid-table', 2), ask('lcong-reduce-flow', 2)],
    },
    {
      id: 'np-l9-solving',
      title: 'Solving ax ≡ b (mod n)',
      slides: [
        teach(
          prose(
            'A **linear congruence** is ${ax \\equiv b \\pmod{n}}$. When $a$ has an inverse, multiply both sides by it, as you would divide both sides of $3x = 5$ by $3$.',
          ),
          prose('For $3x \\equiv 5 \\pmod{7}$, the inverse of $3$ is $5$. Modulo $7$:'),
          maths('\\begin{aligned} 5 \\times 3x &\\equiv 5 \\times 5 \\\\ 15x &\\equiv 25 \\\\ x &\\equiv 4 \\end{aligned}'),
          prose('since $15 \\equiv 1$ and $25 \\equiv 4$. Check by putting it back in: $3 \\times 4 = 12 \\equiv 5$.'),
        ),
        ask('lcong-solve-tiles'),
        ask('lcong-solve'),
        ask('lcong-check-flow'),
        teach(
          prose('With a number added to $ax$, take it from both sides first, then reduce. For $4x + 5 \\equiv 2 \\pmod{9}$:'),
          maths('\\begin{aligned} 4x &\\equiv 2 - 5 = -3 \\\\ 4x &\\equiv 6 \\end{aligned}'),
          prose(
            'The inverse of $4$ is $7$, since $4 \\times 7 = 28 \\equiv 1$. So $x \\equiv 7 \\times 6 = 42 \\equiv 6$. Check: $4 \\times 6 + 5 = 29 \\equiv 2$.',
          ),
          prose('Every other solution, such as $15$, which is $6 + 9$, is congruent to it, so the answer is given from $0$ to $n - 1$.'),
        ),
        ask('lcong-shift'),
        ask('lcong-solve-order'),
        ask('lcong-solve-tiles', 2),
        teach(
          prose(
            'For a bigger modulus, find the inverse by Euclid first, as in Inverses by Euclid. For $10x \\equiv 7 \\pmod{37}$ that gave $10^{-1} \\equiv 26$, so',
          ),
          maths('\\begin{gathered} x \\equiv 26 \\times 7 = 182 \\\\ 182 = 4 \\times 37 + 34 \\end{gathered}'),
          prose('So $x \\equiv 34$. Check: $10 \\times 34 = 340 = 9 \\times 37 + 7$.'),
        ),
        ask('lcong-solve', 2),
        ask('lcong-solve-order', 2),
      ],
      skillCheck: [ask('lcong-solve', 2), ask('lcong-shift', 2), ask('lcong-check-flow', 2)],
    },
    {
      id: 'np-l9-hcf',
      title: 'When the HCF Is Not 1',
      slides: [
        teach(
          prose(
            '$ax \\equiv b \\pmod{n}$ means $ax - b = kn$ for a whole number $k$. Let ${d = \\text{HCF}(a, n)}$. It divides $ax$ and $kn$, so it has to divide $b$ too.',
          ),
          prose(
            "So there is no solution unless $d$ divides $b$, the rule from Number Theory, Euclid's Algorithm, Solving ax + by = c. $4x \\equiv 3 \\pmod{6}$ has none: $4x - 6k$ is always even.",
          ),
          prose('When $d$ does divide $b$, divide $a$, $b$ and the modulus all by $d$. Here ${d = 2}$:'),
          maths('\\begin{gathered} 4x - 2 = 6k \\\\ \\text{exactly when } 2x - 1 = 3k \\end{gathered}'),
          prose('So the congruence divides through too:'),
          maths('\\begin{gathered} 4x \\equiv 2 \\pmod{6} \\\\ \\text{becomes } 2x \\equiv 1 \\pmod{3} \\end{gathered}'),
          prose('Now $2$ is coprime to $3$, so solve as before: the inverse of $2$ is $2$, and $x \\equiv 2 \\pmod{3}$.'),
        ),
        ask('lcong-solvable'),
        ask('lcong-divide-tiles'),
        ask('lcong-hcf-solve'),
        teach(
          prose(
            '$x \\equiv 2 \\pmod{3}$ means ${x = 2, 5, 8, \\dots}$. Modulo $6$, the modulus you started with, that is **two** solutions from $0$ to $5$: $2$ and $5$. Check: $4 \\times 5 = 20 = 3 \\times 6 + 2$.',
          ),
          prose('In general, dividing by $d$ leaves one solution $x_0$ modulo $n \\div d$, and it comes round $d$ times before $n$:'),
          maths('x_0, \\ x_0 + \\tfrac{n}{d}, \\ \\dots, \\ x_0 + (d - 1)\\tfrac{n}{d}'),
          prose('So $ax \\equiv b \\pmod{n}$ has $d$ solutions from $0$ to $n - 1$ when $d$ divides $b$, and none when it does not.'),
        ),
        ask('lcong-all-table'),
        ask('lcong-hcf-flow'),
        ask('lcong-count'),
        teach(
          prose(
            'All of it together, for ${12x \\equiv 18 \\pmod{30}}$. $\\text{HCF}(12, 30)$ is $6$, which divides $18$, so there are $6$ solutions. Divide through by $6$:',
          ),
          maths('2x \\equiv 3 \\pmod{5}'),
          prose('The inverse of $2$ modulo $5$ is $3$, so $x \\equiv 9 \\equiv 4 \\pmod{5}$. Adding $5$ each time, up to $29$:'),
          maths('4, \\ 9, \\ 14, \\ 19, \\ 24, \\ 29'),
        ),
        ask('lcong-all-table', 2),
        ask('lcong-count+choice', 2),
      ],
      skillCheck: [ask('lcong-hcf-flow', 2), ask('lcong-divide-tiles', 2), ask('lcong-hcf-solve', 2)],
    },
    {
      id: 'np-l9-cancelling',
      title: 'Cancelling Safely',
      slides: [
        teach(
          prose(
            'In ordinary algebra $6x = 6$ gives $x = 1$. Modulo $9$ it does not: ${6x \\equiv 6 \\pmod{9}}$ is true for $x = 1$, $4$ and $7$.',
          ),
          maths('\\begin{gathered} 6 \\times 4 = 24 = 2 \\times 9 + 6 \\\\ 6 \\times 7 = 42 = 4 \\times 9 + 6 \\end{gathered}'),
          prose(
            'Cancelling $c$ is multiplying by its inverse, which exists only when $\\text{HCF}(c, n) = 1$. Then ${cx \\equiv cy \\pmod{n}}$ becomes ${x \\equiv y \\pmod{n}}$.',
          ),
          prose(
            'Otherwise divide the modulus by $g = \\text{HCF}(c, n)$ too: ${cx \\equiv cy \\pmod{n}}$ becomes $x \\equiv y \\pmod{n \\div g}$. Here $g = 3$, so $x \\equiv 1 \\pmod{3}$, which is $1$, $4$ and $7$.',
          ),
        ),
        ask('lcong-cancel-safe'),
        ask('lcong-cancel-tiles'),
        ask('lcong-cancel-flow'),
        teach(
          prose(
            'Counting problems often come down to a linear congruence. A counter moves $5$ squares at a time round a ring of $12$ squares, numbered $0$ to $11$, from square $0$. After $x$ moves it has gone $5x$ squares, so it is on square $7$ when',
          ),
          maths('5x \\equiv 7 \\pmod{12}'),
          prose(
            'The inverse of $5$ modulo $12$ is $5$, since $25 = 2 \\times 12 + 1$. So $x \\equiv 35 \\equiv 11$: it first lands on square $7$ after $11$ moves.',
          ),
          prose(
            'Packs work the same way: $x$ packs of $a$ cards dealt into $n$ equal piles with $b$ left over means ${ax \\equiv b \\pmod{n}}$. The answer is the smallest positive solution.',
          ),
        ),
        ask('lcong-story-setup'),
        ask('lcong-story'),
        ask('lcong-cancel-tiles', 2),
        teach(
          prose('The numbers in a story can share a factor. A timer beeps every $25$ minutes from $0$ past the hour. It beeps at $35$ past when'),
          maths('25x \\equiv 35 \\pmod{60}'),
          prose('$\\text{HCF}(25, 60)$ is $5$, which divides $35$, so divide through by $5$, modulus too:'),
          maths('5x \\equiv 7 \\pmod{12}'),
          prose(
            'That is the ring again: $x \\equiv 11$, the $11$th beep, at $275 = 4 \\times 60 + 35$ minutes. Keeping $60$ would give $5x \\equiv 7 \\pmod{60}$, which has no solutions at all. Hours on a $24$-hour clock work the same way, modulo $24$.',
          ),
        ),
        ask('lcong-story', 2),
        ask('lcong-story-setup', 2),
      ],
      skillCheck: [ask('lcong-cancel-flow', 2), ask('lcong-cancel-safe', 2), ask('lcong-story', 2)],
    },
  ],
  levelCheck: [
    ask('lcong-inverse', 2),
    ask('lcong-has-inverse', 2),
    ask('lcong-inverse-table', 2),
    ask('lcong-euclid-inverse', 2),
    ask('lcong-euclid-order', 2),
    ask('lcong-reduce-flow', 2),
    ask('lcong-solve+choice', 2),
    ask('lcong-shift', 2),
    ask('lcong-solve-tiles', 2),
    ask('lcong-hcf-flow', 2),
    ask('lcong-hcf-solve', 2),
    ask('lcong-all-table', 2),
    ask('lcong-cancel-safe', 2),
    ask('lcong-cancel-tiles', 2),
    ask('lcong-story', 2),
  ],
};
