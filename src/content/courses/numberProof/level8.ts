/**
 * Number & Proof, level 8: Algebraic Proof.
 *
 * The next step after Proof and the odd, even and multiples lesson of
 * Divisibility & Primes: writing a described number as an expression, then
 * expanding, collecting and factorising until the result can be read off.
 * Sums of consecutive numbers, differences of squares, odd and even
 * products, and "show that", ending on finding the faulty line of a short
 * proof. Its generators are in `generators/algebraicProof.ts`.
 */
import type { Level } from '../../types';
import { ask, askAfter, maths, prose, teach } from './blocks';

export const npL8: Level = {
  id: 'np-l8',
  title: 'Algebraic Proof',
  lessons: [
    {
      id: 'np-l8-writing',
      title: 'Writing Numbers in Algebra',
      slides: [
        teach(
          prose(
            'In Proof, an even number was $2n$ and an odd number $2n + 1$, with $n$ any whole number. Other kinds of number have forms of their own.',
          ),
          prose(
            'A multiple of $5$ is $5n$. A number $3$ more than a multiple of $5$ is $5n + 3$: it leaves remainder $3$ when divided by $5$. Check a form by trying ${n = 0, 1, 2}$:',
          ),
          maths('5n + 3\\colon\\ 3, \\ 8, \\ 13'),
          prose('To find the $n$ that gives a number, undo the form. For $5n + 3 = 48$, take away $3$, then divide by $5$:'),
          maths('\\begin{gathered} 5n = 45 \\\\ n = 9 \\end{gathered}'),
        ),
        ask('aprf-write'),
        ask('aprf-list-table'),
        ask('aprf-find-n'),
        teach(
          prose('Consecutive whole numbers go up in ones: $n$, $n + 1$, $n + 2$.'),
          prose(
            'Consecutive even numbers go up in twos: $2n$, $2n + 2$, $2n + 4$. So do consecutive odd numbers: $2n + 1$, $2n + 3$, $2n + 5$. Adding $1$ would turn odd into even.',
          ),
          prose(
            'So the next odd number after $2n + 5$ is $2n + 7$, and the one just before $2n + 1$ is $2n - 1$. Consecutive multiples of $4$ go up in fours: $4n$, $4n + 4$, $4n + 8$.',
          ),
        ),
        ask('aprf-consec-tiles'),
        ask('aprf-write', 2),
        ask('aprf-list-table', 2),
        teach(
          prose(
            'A list can be written around any of its numbers. Three consecutive odd numbers with $2n + 3$ in the middle are $2n + 1$, $2n + 3$, $2n + 5$.',
          ),
          prose('A form can take away too: $4n - 3$ is $3$ less than a multiple of $4$. To solve $4n - 3 = 57$, add $3$ first:'),
          maths('\\begin{gathered} 4n = 60 \\\\ n = 15 \\end{gathered}'),
        ),
        ask('aprf-consec-tiles', 2),
        ask('aprf-find-n+choice', 2),
      ],
      skillCheck: [ask('aprf-write', 2), ask('aprf-consec-tiles', 2), ask('aprf-find-n', 2)],
    },
    {
      id: 'np-l8-consecutive',
      title: 'Sums of Consecutive Numbers',
      slides: [
        teach(
          prose(
            'In Proof, three consecutive whole numbers added up to $3(n + 1)$, a multiple of $3$. Any sum goes the same way: add the $n$ terms, add the numbers, then take out the largest number going into both.',
          ),
          prose('Four consecutive whole numbers:'),
          maths(
            '\\begin{aligned} &n + (n + 1) \\\\ &\\quad + (n + 2) + (n + 3) \\\\ &= 4n + 6 \\\\ &= 2(2n + 3) \\end{aligned}',
          ),
          prose(
            '$2n + 3$ is a whole number, so the sum is always a multiple of $2$. And $2$ is the largest: at $n = 0$ the sum is $6$, at $n = 1$ it is $10$, and no number bigger than $2$ goes into both.',
          ),
        ),
        ask('aprf-sum-steps'),
        ask('aprf-sum-multiple'),
        ask('aprf-sum-order'),
        teach(
          prose('Consecutive odd numbers work the same way. Three of them:'),
          maths(
            '\\begin{aligned} &(2n + 1) + (2n + 3) \\\\ &\\quad + (2n + 5) \\\\ &= 6n + 9 \\\\ &= 3(2n + 3) \\end{aligned}',
          ),
          prose(
            'So three consecutive odd numbers always add to a multiple of $3$. Four of them make $8n + 16$, which is $8(n + 2)$: a multiple of $8$. For multiples of $5$, the numbers are $5n$, $5n + 5$, $5n + 10$, and so on.',
          ),
        ),
        ask('aprf-sum-steps', 2),
        ask('aprf-sum-multiple+choice', 2),
        ask('aprf-sum-order', 2),
        teach(
          prose(
            'Is the sum of four consecutive whole numbers always a multiple of $4$? It is $2(2n + 3)$, and $4$ does not go into $2$. One value settles it: at $n = 0$ the sum is $6$, not a multiple of $4$.',
          ),
          prose('When the number does go into the one taken out, the answer is yes: $2(2n + 3)$ is always a multiple of $2$.'),
        ),
        ask('aprf-sum-flow'),
        ask('aprf-sum-flow', 2),
      ],
      skillCheck: [ask('aprf-sum-steps', 2), ask('aprf-sum-flow', 2), ask('aprf-sum-multiple', 2)],
    },
    {
      id: 'np-l8-squares',
      title: 'Differences of Squares',
      slides: [
        teach(
          prose('Squaring a bracket gives three terms. The middle one is twice the product of the two parts:'),
          maths('(n + a)^2 = n^2 + 2an + a^2'),
          maths('\\begin{gathered} (n - 3)^2 = n^2 - 6n + 9 \\\\ (2n + 3)^2 = 4n^2 + 12n + 9 \\end{gathered}'),
          prose('The last term is a square, so it is positive either way.'),
        ),
        ask('aprf-square-tiles'),
        ask('aprf-square-tiles', 2),
        teach(
          prose(
            'To take one square from another, expand both and subtract. The minus changes the sign of every term of the second square, so the $n^2$ terms cancel:',
          ),
          maths('\\begin{aligned} (n + 4)^2 &= n^2 + 8n + 16 \\\\ (n + 2)^2 &= n^2 + 4n + 4 \\end{aligned}'),
          maths('\\begin{aligned} &(n + 4)^2 - (n + 2)^2 \\\\ &= 4n + 12 \\\\ &= 4(n + 3) \\end{aligned}'),
          prose(
            'So it is always a multiple of $4$. Numbers the same distance either side of $n$ leave no constant: $(n + 3)^2 - (n - 3)^2 = 12n$. Squares next to each other differ by an odd number: $(n + 4)^2 - (n + 3)^2 = 2n + 7$, which is $2(n + 3) + 1$.',
          ),
        ),
        ask('aprf-square-tree'),
        askAfter(
          'aprf-square-order',
          1,
          prose('Two consecutive odd numbers are $2n + 1$ and $2n + 3$. Their squares differ by'),
          maths('\\begin{aligned} &(2n + 3)^2 - (2n + 1)^2 \\\\ &= 8n + 8 \\\\ &= 8(n + 1) \\end{aligned}'),
          prose('$n + 1$ is a whole number, so the difference is always a multiple of $8$.'),
        ),
        ask('aprf-square-tree', 2),
        teach(
          prose(
            'Two consecutive even numbers: $(2n + 2)^2 - (2n)^2 = 8n + 4$, which is $4(2n + 1)$. That is always a multiple of $4$, but not always of $8$: at $n = 0$ it is $4$.',
          ),
          prose(
            'The largest number that always divides $An + B$ is the largest going into both $A$ and $B$, since at $n = 0$ the value is $B$ and at $n = 1$ it is $A + B$. With no constant, $12n$ is $12$ at $n = 1$, so its largest is $12$.',
          ),
        ),
        ask('aprf-square-order', 2),
        ask('aprf-square-divides'),
        ask('aprf-square-divides+choice', 2),
      ],
      skillCheck: [ask('aprf-square-tree', 2), ask('aprf-square-order', 2), ask('aprf-square-divides', 2)],
    },
    {
      id: 'np-l8-products',
      title: 'Odd and Even Products',
      slides: [
        teach(
          prose(
            'Two odd numbers need two letters, since they need not be equal: ${2m + 1}$ and ${2n + 1}$. Multiply out, then take $2$ out of everything but the $1$:',
          ),
          maths('\\begin{aligned} &(2m + 1)(2n + 1) \\\\ &= 4mn + 2m + 2n + 1 \\\\ &= 2(2mn + m + n) + 1 \\end{aligned}'),
          prose(
            'The bracket is a whole number, so odd times odd is odd. With $2m + 3$ and $2n + 5$ the last term is $15$, which is $14 + 1$, so the bracket ends in $+ 7$.',
          ),
          prose(
            'An even number is $2k$, and $2k$ times any $m$ is $2(km)$: even times anything is even. So a product is odd only when both numbers are odd, and $mn$ on its own can be either.',
          ),
        ),
        ask('aprf-product-tiles'),
        askAfter(
          'aprf-product-order',
          1,
          prose('When the numbers are already called $m$ and $n$, write them with two new letters:'),
          maths('\\begin{gathered} m = 2j + 1 \\\\ n = 2k + 1 \\end{gathered}'),
          prose('Then, for example, $mn + 4$ is'),
          maths('\\begin{aligned} &4jk + 2j + 2k + 5 \\\\ &= 2(2jk + j + k + 2) + 1 \\end{aligned}'),
          prose('which is odd.'),
        ),
        ask('aprf-parity-choice'),
        teach(
          prose(
            'Of $n$ and $n + 1$, one is even, so $n(n + 1)$ is always even. The same goes for $n(n + 3)$: $3$ is odd, so $n$ and $n + 3$ are one odd and one even.',
          ),
          prose('Factorise to find such a product:'),
          maths('n^2 + 5n = n(n + 5)'),
          prose('That is always even, so $n^2 + 5n + 3$ is always odd.'),
        ),
        ask('aprf-parity-flow'),
        askAfter(
          'aprf-product-tiles',
          2,
          prose('The square of an odd number works the same way:'),
          maths('\\begin{aligned} &(2n + 3)^2 \\\\ &= 4n^2 + 12n + 9 \\\\ &= 2(2n^2 + 6n + 4) + 1 \\end{aligned}'),
          prose('A negative last term splits the same way: $-3$ is $-4 + 1$.'),
        ),
        ask('aprf-parity-choice', 2),
        teach(
          prose(
            'When the number in the bracket is even, $n$ and $n + 4$ are both odd or both even. Then $n(n + 4)$ is odd when $n$ is odd and even when $n$ is even.',
          ),
          prose('So $n^2 + 4n + 1$ is neither always odd nor always even: at $n = 1$ it is $6$, and at $n = 2$ it is $13$.'),
        ),
        ask('aprf-parity-flow', 2),
        ask('aprf-product-order', 2),
      ],
      skillCheck: [ask('aprf-product-order', 2), ask('aprf-parity-flow', 2), ask('aprf-product-tiles', 2)],
    },
    {
      id: 'np-l8-show-that',
      title: 'Show That',
      slides: [
        teach(
          prose(
            '"Show that ${6n + 15}$ is a multiple of $3$" asks for it as $3 \\times$ a whole number. Take $3$ out of every term:',
          ),
          maths('6n + 15 = 3(2n + 5)'),
          prose(
            '$2n + 5$ is a whole number, so ${6n + 15}$ is always a multiple of $3$. Expanding the bracket again checks it.',
          ),
          prose('A minus sign stays with its term: $12n - 8$ is $4(3n - 2)$.'),
          prose('The factor has to go into every term: $6n + 16$ is not always a multiple of $3$, since at $n = 0$ it is $16$.'),
        ),
        ask('aprf-factor-tiles'),
        ask('aprf-which-multiple'),
        teach(
          prose('Expand any brackets first, then collect, then take out the factor:'),
          maths('\\begin{aligned} &4(2n + 3) + 2(n + 5) \\\\ &= 8n + 12 + 2n + 10 \\\\ &= 10n + 22 \\\\ &= 2(5n + 11) \\end{aligned}'),
          prose('Taking a bracket away changes the sign of both its terms: $-2(n + 5)$ is $-2n - 10$.'),
          prose(
            'With two letters, take the factor out of all three terms: $6m + 9n + 12$ is $3(2m + 3n + 4)$. And ${(2n + 3)^2 - (2n - 3)^2}$ comes to $24n$, a multiple of $24$.',
          ),
        ),
        ask('aprf-show-steps'),
        ask('aprf-show-steps', 2),
        ask('aprf-factor-tiles', 2),
        ask('aprf-which-multiple', 2),
        teach(
          prose('To check a proof, test each line against the one before it. The usual slips:'),
          prose('A bracket multiplied into its first term only: $3(2n + 5)$ is $6n + 15$, not $6n + 5$.'),
          prose('A square missing its middle term, or its last term given a minus: $(n - 3)^2$ is $n^2 - 6n + 9$.'),
          prose('A factor taken out of one term only: $2(5n + 22)$ is $10n + 44$, not ${10n + 22}$. And numbers that are not consecutive at all, such as $n$, $n + 2$, $n + 4$.'),
        ),
        ask('aprf-find-error'),
        ask('aprf-find-error', 2),
      ],
      skillCheck: [ask('aprf-show-steps', 2), ask('aprf-find-error', 2), ask('aprf-factor-tiles', 2)],
    },
  ],
  levelCheck: [
    ask('aprf-write', 2),
    ask('aprf-consec-tiles', 2),
    ask('aprf-find-n', 2),
    ask('aprf-sum-steps', 2),
    ask('aprf-sum-multiple', 2),
    ask('aprf-sum-flow', 2),
    ask('aprf-square-tree', 2),
    ask('aprf-square-order', 2),
    ask('aprf-square-divides', 2),
    ask('aprf-product-tiles', 2),
    ask('aprf-parity-flow', 2),
    ask('aprf-product-order', 2),
    ask('aprf-factor-tiles', 2),
    ask('aprf-show-steps', 2),
    ask('aprf-find-error', 2),
  ],
};
