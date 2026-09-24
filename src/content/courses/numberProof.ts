/**
 * Number & Proof.
 *
 * Level 1 is proof itself: what separates a proof from a pile of examples,
 * then the four methods met at A level, each with a lesson of its own —
 * direct proof, exhaustion over cases, disproof by counterexample and proof
 * by contradiction — and a closing lesson on reading a proof, finding its
 * faulty line and choosing a method. Level 2 turns the same habits on whole
 * numbers: primes and prime factors, HCF and LCM, divisibility tests and
 * remainders, odd, even and multiples in algebra, and rational against
 * irrational numbers. Level 3 is the logic underneath both: what an
 * implication says and which way it runs, the converse, the contrapositive,
 * necessary against sufficient, and "if and only if" proved one half at a
 * time. Level 4 is proof by induction: the four parts of the proof, then
 * sums, divisibility and inequalities, and reading a proof for a missing or
 * misplaced base case or a step that assumes what it has to show. Level 5 is
 * Euclid's algorithm: the HCF by repeated division, reading a run, working it
 * backwards to write the HCF as ax + by, then solving ax + by = c and finding
 * every solution from one. Its generators are in `numberEuclid.ts`. Level 6
 * is modular arithmetic: congruence and residues, adding and multiplying
 * modulo n, powers through their cycles and by repeated squaring, last
 * digits, and a proof of why the digit-sum tests for 3 and 9 work, with
 * casting out nines. Its generators are in `numberModular.ts`.
 *
 * Surds and rationalising denominators are taught in Exponents & Radicals
 * (`er-l3`, `er-l5`), not here. Number Bases, and any level after it, is in
 * the level plan in `docs/roadmap/levels/number-proof.md`.
 *
 * Each level closes with a level check: fifteen questions, no teaching
 * slides, one attempt each.
 */
import type { Block, Course, SlideRef } from '../types';

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

export const numberProof: Course = {
  id: 'number-proof',
  category: 'algebra-fundamentals',
  position: 90,
  title: 'Number & Proof',
  blurb: 'Showing a claim holds for every number, not just the ones you tried, then primes, factors and remainders.',
  levels: [
    {
      id: 'np-l1',
      title: 'Proof',
      lessons: [
        {
          id: 'np-l1-direct',
          title: 'Direct Proof',
          slides: [
            teach(
              prose(
                'A proof shows a claim is true in **every** case, not only the ones you tried. Checking examples, however many, is not a proof.',
              ),
              prose(
                'Even numbers are $2k$ and odd numbers are $2k + 1$, for a whole number $k$. Most proofs about odd and even start by writing a number in one of those forms.',
              ),
              maths('\\begin{aligned} &(2a + 1) + (2b + 1) \\\\ &= 2a + 2b + 2 \\\\ &= 2(a + b + 1) \\end{aligned}'),
              prose(
                'That is two times a whole number, so the sum of two odd numbers is even. Two different numbers need two different letters: $2k + 1$ twice would only prove it for a number added to itself.',
              ),
            ),
            ask('prf-always'),
            ask('prf-parity'),
            ask('prf-proof-or-example'),
            teach(
              prose(
                'A direct proof starts from what you know and moves one step at a time to what you want, each step following from the one before.',
              ),
              prose('Three consecutive whole numbers are $n$, $n + 1$ and $n + 2$, so their sum is'),
              maths('\\begin{aligned} &n + (n + 1) + (n + 2) \\\\ &= 3n + 3 \\\\ &= 3(n + 1) \\end{aligned}'),
              prose(
                '$n + 1$ is a whole number, so the sum is a multiple of $3$. The last line always says **why** the form proves the claim.',
              ),
            ),
            ask('proof-order-direct'),
            ask('prf-parity-flow'),
            ask('prf-parity', 2),
            teach(
              prose(
                'To show a number is even, reach $2 \\times$ a whole number. To show it is odd, reach $2 \\times$ a whole number, plus $1$.',
              ),
              maths('\\begin{aligned} (2k + 1)^2 &= 4k^2 + 4k + 1 \\\\ &= 2(2k^2 + 2k) + 1 \\end{aligned}'),
              prose('$2k^2 + 2k$ is a whole number, so the square of an odd number is odd.'),
            ),
            ask('proof-order-direct', 2),
            ask('prf-always', 2),
          ],
          skillCheck: [ask('prf-parity', 2), ask('proof-order-direct', 2), ask('prf-parity-flow', 2)],
        },
        {
          id: 'np-l1-exhaustion',
          title: 'Proof by Exhaustion',
          slides: [
            teach(
              prose(
                'Proof by exhaustion splits the numbers into a short list of cases and proves the claim in each one. The cases must take in **every** number, with none left out.',
              ),
              prose(
                'Splitting by remainder does that. On division by $2$, every integer is $2k$ or $2k + 1$. On division by $3$, it is $3k$, $3k + 1$ or $3k + 2$.',
              ),
            ),
            ask('prf-case-split'),
            ask('prf-case-tiles'),
            ask('prf-cases-tree'),
            teach(
              prose('Claim: $n^2 + n$ is always even. Take the two cases in turn. If $n = 2k$:'),
              maths('\\begin{aligned} n^2 + n &= 4k^2 + 2k \\\\ &= 2(2k^2 + k) \\end{aligned}'),
              prose('If $n = 2k + 1$:'),
              maths('\\begin{aligned} n^2 + n &= 4k^2 + 6k + 2 \\\\ &= 2(2k^2 + 3k + 1) \\end{aligned}'),
              prose(
                'Even in both cases, and the two cases are every integer, so $n^2 + n$ is always even. The proof ends by saying the cases cover everything.',
              ),
            ),
            askWith(
              'proof-order-cases',
              'A claim about every number is settled by all its cases, or unsettled by one that fails. Put this one in order.',
            ),
            ask('prf-case-remainder'),
            ask('prf-case-split', 2),
            teach(
              prose('Only the remainder matters. If $n$ leaves remainder $2$ on division by $3$, then $n = 3k + 2$ and'),
              maths('\\begin{aligned} n^2 &= 9k^2 + 12k + 4 \\\\ &= 3(3k^2 + 4k + 1) + 1 \\end{aligned}'),
              prose(
                'So $n^2$ leaves remainder $1$, the same as $2^2 = 4$ does. Working with the remainder alone gets there faster.',
              ),
            ),
            ask('prf-case-tiles', 2),
            ask('prf-case-remainder', 2),
          ],
          skillCheck: [ask('prf-case-remainder', 2), ask('prf-cases-tree', 2), ask('prf-case-split', 2)],
        },
        {
          id: 'np-l1-counterexample',
          title: 'Disproof by Counterexample',
          slides: [
            teach(
              prose(
                'A claim about **every** number is false if it fails for just one. That one is a **counterexample**, and on its own it is a complete disproof.',
              ),
              prose('Claim: every prime is odd. $2$ is prime and even, so the claim is false.'),
              prose(
                'A counterexample must meet the claim\'s condition and break its conclusion: here, a prime that is even. $9$ is odd and not prime, so it breaks nothing.',
              ),
            ),
            ask('prf-counter-pick'),
            ask('prf-counter'),
            ask('prf-counter-flow'),
            teach(
              prose(
                'A formula that gives prime after prime tempts you to trust it. $n^2 + n + 41$ is prime for every $n$ from $0$ to $39$. It cannot last, though: at $n = 41$ every term is a multiple of $41$.',
              ),
              maths('\\begin{aligned} &41^2 + 41 + 41 \\\\ &= 41(41 + 1 + 1) \\\\ &= 41 \\times 43 \\end{aligned}'),
              prose('So look for the value that gives every term a common factor.'),
            ),
            ask('proof-order-cases'),
            ask('prf-counter-pick', 2),
            ask('prf-counter', 2),
            teach(
              prose(
                'Examples cannot prove a claim about every number, but one example can disprove it. So before trying to prove a claim, test a few values: if one fails, you are done.',
              ),
            ),
            ask('prf-counter-flow', 2),
            ask('proof-order-cases', 2),
          ],
          skillCheck: [ask('prf-counter', 2), ask('prf-counter-pick', 2), ask('prf-counter-flow', 2)],
        },
        {
          id: 'np-l1-contradiction',
          title: 'Proof by Contradiction',
          slides: [
            teach(
              prose(
                'To prove a claim by contradiction, assume it is **false** and show that leads to something impossible. The assumption was wrong, so the claim is true.',
              ),
              prose(
                'The assumption is the exact opposite of the claim. The opposite of irrational is "can be written as $\\frac{a}{b}$". The opposite of "$a \\ge 8$ or $b \\ge 8$" is "$a < 8$ and $b < 8$": **or** becomes **and**, and each part flips.',
              ),
              prose('For a claim of the form "if $P$, then $Q$", assume $P$ is true and $Q$ is false.'),
            ),
            ask('prf-assume'),
            ask('prf-negate'),
            ask('prf-contra-flow'),
            teach(
              prose(
                'The classic: $\\sqrt{2}$ is irrational. Suppose $\\sqrt{2} = \\frac{a}{b}$, with $a$ and $b$ whole numbers sharing no factor. Squaring,',
              ),
              maths('a^2 = 2b^2'),
              prose(
                'So $a^2$ is even, which makes $a$ even: $a = 2c$. Then $4c^2 = 2b^2$, so $b^2 = 2c^2$ and $b$ is even too. Both even contradicts "no common factor", so $\\sqrt{2}$ is irrational.',
              ),
            ),
            ask('prf-order-contradiction'),
            ask('prf-negate', 2),
            ask('prf-assume', 2),
            teach(
              prose(
                'There are infinitely many primes. Suppose not: then some list $p_1, p_2, \\dots, p_n$ holds every prime. Let',
              ),
              maths('N = p_1 p_2 \\cdots p_n + 1'),
              prose(
                'Dividing $N$ by any prime on the list leaves remainder $1$, so none of them divides it. But every whole number above $1$ has a prime factor, so some prime is missing from the list: a contradiction.',
              ),
            ),
            ask('prf-order-contradiction', 2),
            ask('prf-contra-flow', 2),
          ],
          skillCheck: [ask('prf-order-contradiction', 2), ask('prf-negate', 2), ask('prf-assume', 2)],
        },
        {
          id: 'np-l1-reading',
          title: 'Reading and Checking Proofs',
          slides: [
            teach(
              prose(
                'Reading a proof means checking that each line follows from the one before. The usual faults are algebra that does not multiply out, a step that assumes what it sets out to prove, and examples passed off as proof.',
              ),
              prose('Check every equals sign by expanding. $(2k + 1)^2$ is $4k^2 + 4k + 1$, not $4k^2 + 1$.'),
            ),
            ask('prf-find-flaw'),
            ask('prf-missing-line'),
            ask('prf-method-flow'),
            teach(
              prose('Choosing a method:'),
              prose('**Counterexample** when one failing value would settle it.'),
              prose('**Exhaustion** when the numbers split into a few natural cases, such as odd and even.'),
              prose('**Contradiction** when the claim says something cannot happen: irrational, or infinitely many.'),
              prose('**Direct** proof otherwise: from what you know, one step at a time.'),
            ),
            ask('proof-order-direct', 2),
            ask('prf-find-flaw', 2),
            ask('prf-missing-line', 2),
            teach(
              prose(
                'A finished proof ends by saying what it has shown and why: "$k^2 + k$ is a whole number, so $n^2 + n$ is even." Without that last line the working does not yet prove anything.',
              ),
            ),
            ask('prf-method-flow', 2),
            ask('prf-order-contradiction', 2),
          ],
          skillCheck: [ask('prf-find-flaw', 2), ask('prf-missing-line', 2), ask('prf-method-flow', 2)],
        },
      ],
      levelCheck: [
        ask('prf-parity', 2),
        ask('proof-order-direct', 2),
        ask('prf-always', 2),
        ask('prf-case-tiles', 2),
        ask('prf-cases-tree', 2),
        ask('prf-case-remainder', 2),
        ask('prf-counter', 2),
        ask('proof-order-cases', 2),
        ask('prf-counter-pick', 2),
        ask('prf-negate', 2),
        ask('prf-order-contradiction', 2),
        ask('prf-assume', 2),
        ask('prf-find-flaw', 2),
        ask('prf-missing-line', 2),
        ask('prf-method-flow', 2),
      ],
    },
    {
      id: 'np-l2',
      title: 'Divisibility & Primes',
      lessons: [
        {
          id: 'np-l2-primes',
          title: 'Primes and Prime Factors',
          slides: [
            teach(
              prose('A **prime** has exactly two factors, $1$ and itself. So $1$ is not prime, and $2$ is the only even prime.'),
              prose(
                'To test a number, divide by the primes up to its square root. If $n = a \\times b$, one of $a$ and $b$ is at most $\\sqrt{n}$, so any factor turns up by then.',
              ),
              maths('\\sqrt{91} < 10, \\quad 91 = 7 \\times 13'),
              prose('Powers of primes multiply out as usual: the powers first, then the product.'),
            ),
            ask('num-is-prime'),
            ask('num-factor-reduce'),
            ask('num-is-prime', 2),
            teach(
              prose(
                'Every whole number above $1$ splits into primes in exactly one way. Divide by $2$ as often as it goes, then by $3$, then $5$, and so on:',
              ),
              maths('\\begin{gathered} 360 \\to 180 \\to 90 \\to 45 \\\\ \\to 15 \\to 5 \\to 1 \\end{gathered}'),
              prose('That is three $2$s, two $3$s and one $5$. With powers, smallest prime first:'),
              maths('360 = 2^3 \\times 3^2 \\times 5'),
            ),
            ask('num-factorise'),
            ask('num-factor-reduce+choice', 2),
            ask('num-factorise', 2),
            teach(
              prose(
                'A factor of $360 = 2^3 \\times 3^2 \\times 5$ takes each prime from none of it up to all of it: $2$ appears $0$, $1$, $2$ or $3$ times, which is $4$ choices.',
              ),
              maths('(3 + 1)(2 + 1)(1 + 1) = 24'),
              prose('Add one to each power and multiply: $360$ has $24$ factors.'),
            ),
            ask('num-factor-count'),
            ask('num-factor-count', 2),
          ],
          skillCheck: [ask('num-factorise', 2), ask('num-factor-count', 2), ask('num-is-prime', 2)],
        },
        {
          id: 'np-l2-hcf-lcm',
          title: 'HCF and LCM',
          slides: [
            teach(
              prose(
                'The **HCF** (highest common factor) is the biggest number dividing both. The **LCM** (lowest common multiple) is the smallest number both divide into.',
              ),
              prose(
                'From the prime factors, the HCF takes the primes they share, each at the **smaller** power. The LCM takes every prime, each at the **larger** power.',
              ),
              maths('\\begin{aligned} 60 &= 2^2 \\times 3 \\times 5 \\\\ 40 &= 2^3 \\times 5 \\end{aligned}'),
              prose('So the HCF is $2^2 \\times 5 = 20$ and the LCM is $2^3 \\times 3 \\times 5 = 120$.'),
            ),
            ask('num-hcf-lcm-tiles'),
            ask('num-hcf'),
            ask('num-hcf-lcm-tiles', 2),
            teach(
              prose('Between them, the HCF and the LCM use every prime power of the two numbers exactly once, so'),
              maths('\\text{HCF} \\times \\text{LCM} = a \\times b'),
              prose('Once you know the HCF, the LCM is $a \\times b$ divided by it. For $60$ and $40$: $2400 \\div 20 = 120$.'),
            ),
            ask('num-lcm-tree'),
            ask('num-lcm-tree', 2),
            teach(
              prose('In a word problem, first decide which one is wanted.'),
              prose('Cutting into equal pieces, sharing into equal groups, the largest tile that fits: the **HCF**.'),
              prose('Things lining up again, such as buses, lights or laps: the **LCM**.'),
            ),
            ask('num-hcf-flow'),
            ask('num-hcf', 2),
            ask('num-hcf-flow', 2),
          ],
          skillCheck: [ask('num-hcf', 2), ask('num-lcm-tree', 2), ask('num-hcf-lcm-tiles', 2)],
        },
        {
          id: 'np-l2-divisibility',
          title: 'Divisibility and Remainders',
          slides: [
            teach(
              prose('Quick tests, from the digits alone:'),
              prose('$2$: the last digit is even. $5$: it ends in $0$ or $5$. $10$: it ends in $0$.'),
              prose('$4$: the last two digits make a multiple of $4$.'),
              prose('$3$: the digit sum is a multiple of $3$. $9$: the digit sum is a multiple of $9$.'),
              prose(
                'For $6$, $12$, $15$ or $18$, split it into two numbers sharing no factor and pass both tests: $12 = 4 \\times 3$. Not $2 \\times 6$, which share a $2$: $18$ passes both of those tests and is not a multiple of $12$.',
              ),
            ),
            ask('num-divisible'),
            ask('num-divis-flow'),
            ask('num-divisible', 2),
            teach(
              prose('Dividing $a$ by $d$ gives a quotient $q$ and a remainder $r$, somewhere from $0$ up to $d - 1$:'),
              maths('a = dq + r'),
              prose('So $117 \\div 4 = 29$ remainder $1$, because $117 = 4 \\times 29 + 1$. Rebuilding $a$ from the pieces is a quick check.'),
            ),
            ask('num-division-reduce'),
            ask('num-remainder'),
            ask('num-division-reduce+choice', 2),
            teach(
              prose(
                'Remainders combine. If $a$ and $b$ leave remainders $4$ and $2$ on division by $5$, write $a = 5j + 4$ and $b = 5k + 2$. Every term with $j$ or $k$ in it is a multiple of $5$, so only the remainders matter.',
              ),
              prose('$ab$ leaves the same remainder as $4 \\times 2 = 8$, which is $3$. The same goes for sums and powers.'),
            ),
            ask('num-remainder', 2),
            ask('num-divis-flow', 2),
          ],
          skillCheck: [ask('num-remainder', 2), ask('num-divisible', 2), ask('num-division-reduce', 2)],
        },
        {
          id: 'np-l2-parity',
          title: 'Odd, Even and Multiples in Algebra',
          slides: [
            teach(
              prose(
                'Of two consecutive whole numbers, one is even, so their product is even. Factorising shows when an expression is such a product:',
              ),
              maths('n^2 + n = n(n + 1)'),
              prose('So $n^2 + n$ is always even, and so is $n^2 + n + 8$: an even number plus $8$.'),
            ),
            ask('num-factorised'),
            ask('num-always-divides'),
            ask('num-order-multiples'),
            teach(
              prose(
                'Of three consecutive whole numbers, one is a multiple of $3$ and at least one is even, so their product is a multiple of $6$.',
              ),
              maths('n^3 - n = (n - 1)n(n + 1)'),
              prose(
                'That is why $n^3 - n$ is always a multiple of $6$. To find the largest number that always divides, factorise, then try small values of $n$: nothing bigger than their HCF can work.',
              ),
            ),
            ask('num-factorised', 2),
            ask('num-always-divides', 2),
            ask('num-order-multiples', 2),
            teach(
              prose('A difference of two squares hides a multiple too. Expand both brackets, subtract, then take out the common factor:'),
              maths('\\begin{aligned} &(n + 5)^2 - (n + 3)^2 \\\\ &= 4n + 16 \\\\ &= 4(n + 4) \\end{aligned}'),
              prose('The bracket is a whole number, so the result is always a multiple of $4$.'),
            ),
            ask('num-parity-steps'),
            ask('num-parity-steps', 2),
          ],
          skillCheck: [ask('num-order-multiples', 2), ask('num-factorised', 2), ask('num-parity-steps', 2)],
        },
        {
          id: 'np-l2-rational',
          title: 'Rational and Irrational Numbers',
          slides: [
            teach(
              prose(
                'A **rational** number is a fraction $\\frac{a}{b}$ of whole numbers, with $b \\ne 0$. Whole numbers count, since $-5 = \\frac{-5}{1}$, and so does every decimal that stops or repeats.',
              ),
              prose(
                'An **irrational** number cannot be written that way; its decimal never stops and never repeats. $\\sqrt{3}$ and $\\pi$ are irrational, and the square root of a whole number is rational only when the number is a perfect square.',
              ),
              prose('A repeating decimal gets a dot over the first and the last digit of the block that repeats:'),
              maths('\\frac{25}{37} = 0.675675\\ldots = 0.\\dot{6}7\\dot{5}'),
            ),
            ask('num-rational-choice'),
            ask('num-decimal-tiles'),
            ask('num-rational-choice', 2),
            teach(
              prose(
                'Which fractions stop? Write the fraction in lowest terms and look at the denominator. If its only prime factors are $2$ and $5$, the decimal terminates; any other prime factor makes it repeat.',
              ),
              maths('\\frac{9}{12} = \\frac{3}{4} = 0.75, \\quad \\frac{5}{12} = 0.41\\dot{6}'),
              prose('Cancel first: $12$ has a $3$ in it, but $\\frac{9}{12}$ loses it on the way to $\\frac{3}{4}$.'),
            ),
            ask('num-terminating'),
            ask('num-decimal-tiles', 2),
            ask('num-terminating', 2),
            teach(
              prose(
                'To turn a repeating decimal into a fraction, multiply by $10$ for each digit in the block, so the repeats line up, then subtract:',
              ),
              maths('\\begin{aligned} 10x &= 6.\\dot{6} \\\\ x &= 0.\\dot{6} \\\\ 9x &= 6 \\end{aligned}'),
              prose(
                'So $x = \\frac{6}{9} = \\frac{2}{3}$. A three-digit block takes $1000x$ and leaves $999x$. A fraction is typed with the / key.',
              ),
            ),
            ask('num-recurring-steps'),
            ask('num-recurring', 2),
          ],
          skillCheck: [ask('num-rational-choice', 2), ask('num-terminating', 2), ask('num-recurring', 2)],
        },
      ],
      levelCheck: [
        ask('num-is-prime', 2),
        ask('num-factorise', 2),
        ask('num-factor-count', 2),
        ask('num-factor-reduce+choice', 2),
        ask('num-hcf-lcm-tiles', 2),
        ask('num-lcm-tree', 2),
        ask('num-hcf', 2),
        ask('num-divisible', 2),
        ask('num-divis-flow', 2),
        ask('num-remainder', 2),
        ask('num-order-multiples', 2),
        ask('num-always-divides', 2),
        ask('num-parity-steps', 2),
        ask('num-rational-choice', 2),
        ask('num-recurring', 2),
      ],
    },
    {
      id: 'np-l3',
      title: 'Logic and Implication',
      lessons: [
        {
          id: 'np-l3-implication',
          title: 'Implication',
          slides: [
            teach(
              prose(
                '$P \\Rightarrow Q$ reads "$P$ implies $Q$", or "if $P$, then $Q$". It says that whenever $P$ is true, $Q$ is true as well.',
              ),
              maths('x = 3 \\Rightarrow x^2 = 9'),
              prose(
                'The arrow points from what you know to what follows. It does not run back: $x^2 = 9$ is also true when $x = -3$, so $x^2 = 9$ does not imply $x = 3$.',
              ),
            ),
            ask('prf-arrow'),
            ask('prf-assume-show'),
            ask('prf-implies-value'),
            teach(
              prose(
                'To prove $P \\Rightarrow Q$ directly, assume $P$ and work step by step until you reach $Q$. The "if" part is what you assume, wherever it sits in the sentence.',
              ),
              prose(
                '"$Q$ if $P$" and "$Q$ whenever $P$" both put the condition second, and both still mean $P \\Rightarrow Q$.',
              ),
            ),
            ask('prf-write-arrow'),
            ask('prf-assume-show', 2),
            ask('prf-implies-value', 2),
            teach(
              prose(
                'When the arrow runs both ways, write $\\Leftrightarrow$, read "if and only if". Solving a linear equation keeps it:',
              ),
              maths('2x + 1 = 7 \\Leftrightarrow x = 3'),
              prose(
                'Squaring does not, since it loses the sign. Before writing $\\Leftrightarrow$, check each direction on its own.',
              ),
            ),
            ask('prf-arrow', 2),
            ask('prf-write-arrow', 2),
          ],
          skillCheck: [ask('prf-arrow', 2), ask('prf-write-arrow', 2), ask('prf-assume-show', 2)],
        },
        {
          id: 'np-l3-converse',
          title: 'The Converse',
          slides: [
            teach(
              prose('The **converse** of $P \\Rightarrow Q$ swaps the two sides: $Q \\Rightarrow P$.'),
              maths('\\begin{gathered} x = 2 \\Rightarrow x^2 = 4 \\\\ x^2 = 4 \\Rightarrow x = 2 \\end{gathered}'),
              prose(
                'The first is true and its converse is false: $x = -2$ makes $x^2 = 4$ true and $x = 2$ false. A statement and its converse are two different claims, and each needs its own proof.',
              ),
            ),
            ask('prf-converse'),
            ask('prf-counter-converse'),
            ask('prf-converse-flow'),
            teach(
              prose(
                'One counterexample is enough to sink a converse: a value that makes $Q$ true and $P$ false.',
              ),
              prose(
                'Sometimes a whole stretch of values does it. $x > 5 \\Rightarrow x > 2$ is true, but its converse fails for every $x$ with $2 < x \\le 5$.',
              ),
            ),
            ask('prf-counter-line'),
            ask('prf-converse', 2),
            ask('prf-counter-converse', 2),
            teach(
              prose(
                'When the converse is true as well, the statement runs both ways and $\\Leftrightarrow$ fits:',
              ),
              maths('x = 4 \\Leftrightarrow x^3 = 64'),
              prose('$64$ has only one real cube root, so nothing but $x = 4$ gives $x^3 = 64$.'),
            ),
            ask('prf-converse-flow', 2),
            ask('prf-counter-line', 2),
          ],
          skillCheck: [ask('prf-converse', 2), ask('prf-counter-converse', 2), ask('prf-counter-line', 2)],
        },
        {
          id: 'np-l3-contrapositive',
          title: 'The Contrapositive',
          slides: [
            teach(
              prose('Three statements come from $P \\Rightarrow Q$. Write "not $P$" as $\\lnot P$:'),
              maths(
                '\\begin{aligned} &\\text{converse} && Q \\Rightarrow P \\\\ &\\text{inverse} && \\lnot P \\Rightarrow \\lnot Q \\\\ &\\text{contrapositive} && \\lnot Q \\Rightarrow \\lnot P \\end{aligned}',
              ),
              prose(
                'The **contrapositive** says the same as the statement. If $Q$ is false, $P$ cannot have been true, since $P$ would have made $Q$ true. So $x = 3 \\Rightarrow x^2 = 9$ and $x^2 \\ne 9 \\Rightarrow x \\ne 3$ stand or fall together.',
              ),
            ),
            ask('prf-contrapositive'),
            ask('prf-name-relative'),
            ask('prf-contrapositive', 2),
            teach(
              prose(
                'Claim: if $n^2$ is even, then $n$ is even. Starting from $n^2 = 2m$ gets stuck, since nothing turns it into a fact about $n$. Prove the contrapositive instead: if $n$ is odd, then $n^2$ is odd.',
              ),
              maths('\\begin{aligned} n &= 2k + 1 \\\\ n^2 &= 4k^2 + 4k + 1 \\\\ &= 2(2k^2 + 2k) + 1 \\end{aligned}'),
              prose('So $n^2$ is odd, the contrapositive is true, and with it the claim.'),
            ),
            ask('prf-contra-plan'),
            ask('prf-order-contrapositive'),
            ask('prf-name-relative', 2),
            teach(
              prose(
                'Reach for the contrapositive when the claim starts from something hard to use: a "not", or a fact about $n^2$ when you want one about $n$.',
              ),
              prose(
                'If $n^2$ is not a multiple of $5$, then neither is $n$. The contrapositive starts from $n = 5k$, and then $n^2 = 25k^2 = 5(5k^2)$.',
              ),
            ),
            ask('prf-order-contrapositive', 2),
            ask('prf-contra-plan', 2),
          ],
          skillCheck: [
            ask('prf-contrapositive', 2),
            ask('prf-order-contrapositive', 2),
            ask('prf-name-relative', 2),
          ],
        },
        {
          id: 'np-l3-necessary',
          title: 'Necessary and Sufficient',
          slides: [
            teach(
              prose(
                'When $P \\Rightarrow Q$, $P$ is **sufficient** for $Q$: $P$ is enough to guarantee $Q$. And $Q$ is **necessary** for $P$: $P$ cannot happen without $Q$.',
              ),
              maths('x > 3 \\Rightarrow x > 0'),
              prose(
                'So $x > 3$ is sufficient for $x > 0$. It is not necessary: $x = 1$ makes $x > 0$ true without $x > 3$.',
              ),
            ),
            ask('prf-nec-suff'),
            ask('prf-nec-arrow'),
            ask('prf-meets-tree'),
            teach(
              prose(
                'To sort a condition $P$ for a statement $Q$, test both arrows. $P \\Rightarrow Q$ makes it sufficient, $Q \\Rightarrow P$ makes it necessary.',
              ),
              prose(
                'Both arrows: necessary and sufficient, which is $P \\Leftrightarrow Q$. Neither: it is neither. "$P$ only if $Q$" is one more way of writing $P \\Rightarrow Q$.',
              ),
            ),
            ask('prf-nec-suff-flow'),
            ask('prf-nec-arrow', 2),
            ask('prf-meets-tree', 2),
            teach(
              prose(
                'One value settles each arrow. A value that meets $P$ but not $Q$ shows $P$ is not sufficient; one that meets $Q$ but not $P$ shows $P$ is not necessary.',
              ),
              prose(
                'For $x^2 > 9$ and $x > 3$: $x = -4$ meets the first only, so $x^2 > 9$ is not sufficient for $x > 3$, but it is necessary.',
              ),
            ),
            ask('prf-nec-suff', 2),
            ask('prf-nec-suff-flow', 2),
          ],
          skillCheck: [ask('prf-nec-suff', 2), ask('prf-nec-arrow', 2), ask('prf-meets-tree', 2)],
        },
        {
          id: 'np-l3-iff',
          title: 'If and Only If',
          slides: [
            teach(
              prose(
                '$P \\Leftrightarrow Q$, "$P$ if and only if $Q$", is two implications at once: $P \\Rightarrow Q$ and $Q \\Rightarrow P$.',
              ),
              prose(
                'So its proof has two halves, each proved on its own. The $\\Rightarrow$ half starts from $P$, or from not $Q$ if it goes through the contrapositive; the $\\Leftarrow$ half starts from $Q$, or from not $P$.',
              ),
            ),
            ask('prf-direction-choice'),
            ask('prf-order-iff'),
            ask('prf-arrow', 2),
            teach(
              prose('Claim: $n$ is even $\\Leftrightarrow$ $n^2$ is even.'),
              prose('($\\Rightarrow$) Assume $n$ is even, so $n = 2k$. Then $n^2 = 4k^2 = 2(2k^2)$, which is even.'),
              prose(
                '($\\Leftarrow$) By the contrapositive: assume $n$ is odd, so $n = 2k + 1$. Then $n^2 = 2(2k^2 + 2k) + 1$, which is odd. Both halves hold, so the claim does.',
              ),
            ),
            ask('prf-direction-flow'),
            ask('prf-order-iff', 2),
            ask('prf-direction-choice', 2),
            teach(
              prose(
                'Two slips to watch for: proving the same half twice, and assuming both sides at once. Each half assumes one side, or the negation of one, and reaches the other.',
              ),
            ),
            ask('prf-direction-flow', 2),
            ask('prf-nec-suff', 2),
          ],
          skillCheck: [ask('prf-order-iff', 2), ask('prf-direction-flow', 2), ask('prf-direction-choice', 2)],
        },
      ],
      levelCheck: [
        ask('prf-arrow', 2),
        ask('prf-write-arrow', 2),
        ask('prf-implies-value', 2),
        ask('prf-converse', 2),
        ask('prf-counter-line', 2),
        ask('prf-counter-converse', 2),
        ask('prf-contrapositive', 2),
        ask('prf-name-relative', 2),
        ask('prf-order-contrapositive', 2),
        ask('prf-nec-suff-flow', 2),
        ask('prf-meets-tree', 2),
        ask('prf-nec-arrow', 2),
        ask('prf-nec-suff', 2),
        ask('prf-order-iff', 2),
        ask('prf-direction-flow', 2),
      ],
    },
    {
      id: 'np-l4',
      title: 'Proof by Induction',
      lessons: [
        {
          id: 'np-l4-shape',
          title: 'The Shape of an Inductive Proof',
          slides: [
            teach(
              prose(
                'Proof by **induction** shows a claim for every whole number $n$ from some start, in two moves. The **base case** checks the first value. The **step** shows that whenever the claim holds at $n = k$, it also holds at $n = k + 1$.',
              ),
              prose(
                'Together they work like a row of dominoes: the base case knocks over the first, and the step says each one knocks over the next. With both, every one falls.',
              ),
            ),
            ask('prf-ind-covers'),
            ask('prf-ind-part-flow'),
            ask('prf-ind-skeleton'),
            teach(
              prose(
                'A written proof has four parts, in this order. **Base case:** check the first value. **Hypothesis:** assume the claim at $n = k$. **Step:** use that to reach the claim at $n = k + 1$. **Conclusion:** it holds for every $n$ from the start.',
              ),
              prose(
                'Assuming the claim at $n = k$ is not cheating. The step only says "if it holds at $k$, then it holds at $k + 1$", and the base case supplies the first "if".',
              ),
            ),
            ask('prf-ind-next-claim'),
            ask('prf-ind-part-flow', 2),
            ask('prf-ind-covers', 2),
            teach(
              prose('The step has to reach the claim at $n = k + 1$, so write that down first: put $k + 1$ in place of every $n$.'),
              prose(
                'For $1 + 3 + \\dots + (2n - 1) = n^2$ it is $1 + 3 + \\dots + (2k - 1) + (2k + 1) = (k + 1)^2$: one more term on the left, and $k + 1$ in the formula.',
              ),
            ),
            ask('prf-ind-skeleton', 2),
            ask('prf-ind-next-claim', 2),
          ],
          skillCheck: [ask('prf-ind-skeleton', 2), ask('prf-ind-next-claim', 2), ask('prf-ind-part-flow', 2)],
        },
        {
          id: 'np-l4-sums',
          title: 'Proving a Sum',
          slides: [
            teach(
              prose('Claim: $1 + 3 + 5 + \\dots + (2n - 1) = n^2$, the sum of the first $n$ odd numbers.'),
              prose(
                '**Base case:** at $n = 1$ both sides are $1$. **Hypothesis:** assume $1 + 3 + \\dots + (2k - 1) = k^2$.',
              ),
              prose(
                '**Step:** the sum up to $n = k + 1$ is the sum up to $n = k$ plus the next term, $2k + 1$. So it is $k^2 + (2k + 1) = (k + 1)^2$, the claim at $n = k + 1$.',
              ),
            ),
            ask('prf-ind-next-term'),
            ask('prf-ind-sum-check'),
            ask('prf-ind-order-sum'),
            teach(
              prose(
                'Claim: $1 + 2 + 3 + \\dots + n = \\tfrac{1}{2}n(n + 1)$. The step is the same move: the assumed sum plus the next term, $k + 1$.',
              ),
              maths(
                '\\begin{aligned} &\\tfrac{1}{2}k(k + 1) + (k + 1) \\\\ &= (k + 1)(\\tfrac{1}{2}k + 1) \\\\ &= \\tfrac{1}{2}(k + 1)(k + 2) \\end{aligned}',
              ),
              prose(
                'Take out the common factor $(k + 1)$ rather than multiplying out: it lands straight on the right side at $n = k + 1$.',
              ),
            ),
            ask('prf-ind-sum-steps'),
            ask('prf-ind-next-term', 2),
            ask('prf-ind-sum-check', 2),
            teach(
              prose(
                'Every sum is proved the same way: the sum at $n = k + 1$ is the assumed sum plus one more term, tidied into the formula at $k + 1$.',
              ),
              prose(
                'A multiple of either sum works just the same: $3 + 9 + 15 + \\dots + (6n - 3) = 3n^2$ is three times the odd numbers. Sigma notation and other series are in Sequences & Series.',
              ),
            ),
            ask('prf-ind-order-sum', 2),
            ask('prf-ind-sum-steps', 2),
          ],
          skillCheck: [ask('prf-ind-order-sum', 2), ask('prf-ind-sum-steps', 2), ask('prf-ind-next-term', 2)],
        },
        {
          id: 'np-l4-divisibility',
          title: 'Proving Divisibility',
          slides: [
            teach(
              prose('Claim: $3^n - 1$ is a multiple of $2$ for every $n \\ge 1$. The base case: $3^1 - 1 = 2$.'),
              prose(
                'For the hypothesis, write "is a multiple of $2$" as an equation: $3^k - 1 = 2m$ for some whole number $m$. An equation is something the algebra can use.',
              ),
            ),
            ask('prf-ind-quotient'),
            ask('prf-ind-rewrite'),
            ask('prf-ind-divides-steps'),
            teach(
              prose('The step needs $3^k - 1$ inside $3^{k+1} - 1$. Since $3^{k+1} = 3 \\times 3^k$,'),
              maths('\\begin{aligned} 3^{k+1} - 1 &= 3(3^k - 1) + 2 \\\\ &= 3(2m) + 2 \\\\ &= 2(3m + 1) \\end{aligned}'),
              prose(
                'which is a multiple of $2$. The same rewrite shows $b^n - 1$ is a multiple of $b - 1$: $b^{k+1} - 1 = b(b^k - 1) + (b - 1)$.',
              ),
            ),
            ask('prf-ind-order-divides'),
            ask('prf-ind-quotient', 2),
            ask('prf-ind-rewrite', 2),
            teach(
              prose(
                'A different constant leaves a different remainder. For $4^n + 2$ and $3$: $4^{k+1} + 2 = 4(4^k + 2) - 6$.',
              ),
              prose('Both parts have to be multiples of $3$. $4(3m)$ is, and so is $6$, so $4^{k+1} + 2 = 3(4m - 2)$.'),
            ),
            ask('prf-ind-divides-steps', 2),
            ask('prf-ind-order-divides', 2),
          ],
          skillCheck: [ask('prf-ind-order-divides', 2), ask('prf-ind-rewrite', 2), ask('prf-ind-divides-steps', 2)],
        },
        {
          id: 'np-l4-inequalities',
          title: 'Proving an Inequality',
          slides: [
            teach(
              prose('Claim: $2^n > 2n$. At $n = 1$ and $n = 2$ the two sides are equal, so it fails. At $n = 3$, $8 > 6$.'),
              prose(
                'So the base case is $n = 3$, and what gets proved is "for every $n \\ge 3$". A base case goes where the claim starts holding for good, and you find that by checking.',
              ),
            ),
            ask('prf-ind-first-n'),
            ask('prf-ind-base-choice'),
            ask('prf-ind-ineq-flow'),
            teach(
              prose('The step for an inequality is a chain. Assume $2^k > 2k$ for some $k \\ge 3$. Then'),
              maths('\\begin{aligned} 2^{k+1} &= 2 \\times 2^k \\\\ &> 4k = 2k + 2k \\\\ &\\ge 2k + 2 = 2(k + 1) \\end{aligned}'),
              prose('Split off one factor, use the hypothesis, then finish with a fact about $k$: here $2k \\ge 2$.'),
            ),
            ask('prf-ind-order-inequality'),
            ask('prf-ind-first-n', 2),
            ask('prf-ind-ineq-flow', 2),
            teach(
              prose(
                'Factorials go the same way. For $n! > 2^n$, true from $n = 4$: $(k + 1)! = (k + 1) \\times k! > (k + 1) \\times 2^k$, and $k + 1 > 2$ finishes it.',
              ),
              prose(
                'Watch for a claim that holds early, stops, then holds for good. $2^n > n^2$ is true at $n = 1$, false at $2$, $3$ and $4$, and true from $5$ on. Its base case is $n = 5$.',
              ),
            ),
            ask('prf-ind-base-choice', 2),
            ask('prf-ind-order-inequality', 2),
          ],
          skillCheck: [ask('prf-ind-order-inequality', 2), ask('prf-ind-ineq-flow', 2), ask('prf-ind-base-choice', 2)],
        },
        {
          id: 'np-l4-reading',
          title: 'Reading an Inductive Proof',
          slides: [
            teach(
              prose(
                'A step on its own proves nothing. Claim: $1 + 3 + \\dots + (2n - 1) = n^2 + 1$. The step works: $k^2 + 1 + (2k + 1) = (k + 1)^2 + 1$.',
              ),
              prose(
                'But at $n = 1$ the left side is $1$ and the right side is $2$, and the claim is false for every $n$. Without a base case the dominoes never start.',
              ),
            ),
            ask('prf-ind-flaw'),
            ask('prf-ind-test-tree'),
            ask('prf-ind-read-flow'),
            teach(
              prose(
                'Two more slips. A step that assumes the claim at $n = k + 1$ is circular: that is exactly what it had to show.',
              ),
              prose(
                'And a base case at the wrong $n$ proves less than the claim says. A base case at $n = 3$ covers $n \\ge 3$ only, whatever the claim promises.',
              ),
            ),
            ask('prf-ind-skeleton'),
            ask('prf-ind-flaw', 2),
            ask('prf-ind-test-tree', 2),
            teach(
              prose(
                'To read a proof by induction, check three things in turn: is there a base case, is it where the claim starts, and does the step assume only the case $n = k$?',
              ),
              prose('The habits from reading any proof still apply too, such as looking for a slip in the algebra.'),
            ),
            ask('prf-ind-read-flow', 2),
            ask('prf-ind-skeleton', 2),
          ],
          skillCheck: [ask('prf-ind-flaw', 2), ask('prf-ind-read-flow', 2), ask('prf-ind-test-tree', 2)],
        },
      ],
      levelCheck: [
        ask('prf-ind-covers', 2),
        ask('prf-ind-next-claim', 2),
        ask('prf-ind-part-flow', 2),
        ask('prf-ind-next-term', 2),
        ask('prf-ind-order-sum', 2),
        ask('prf-ind-sum-steps', 2),
        ask('prf-ind-quotient', 2),
        ask('prf-ind-rewrite', 2),
        ask('prf-ind-order-divides', 2),
        ask('prf-ind-first-n', 2),
        ask('prf-ind-ineq-flow', 2),
        ask('prf-ind-base-choice', 2),
        ask('prf-ind-order-inequality', 2),
        ask('prf-ind-test-tree', 2),
        ask('prf-ind-flaw', 2),
      ],
    },
    {
      id: 'np-l5',
      title: "Euclid's Algorithm",
      lessons: [
        {
          id: 'np-l5-algorithm',
          title: 'The Algorithm',
          slides: [
            teach(
              prose(
                'Dividing $a$ by $b$ gives a **quotient** $q$ and a **remainder** $r$, with $a = q \\times b + r$ and $0 \\le r < b$.',
              ),
              maths('247 = 4 \\times 52 + 39'),
              prose(
                'Any number dividing both $a$ and $b$ also divides $r = a - q \\times b$. And any number dividing $b$ and $r$ divides $a = q \\times b + r$.',
              ),
              prose('So $a$ and $b$ have exactly the same common factors as $b$ and $r$, and the same HCF.'),
            ),
            ask('euc-divide'),
            ask('euc-same-hcf'),
            ask('euc-order-hcf'),
            teach(
              prose(
                "**Euclid's algorithm** makes that swap again and again: divide, then divide the divisor by the remainder, until the remainder is $0$.",
              ),
              maths('\\begin{aligned} 247 &= 4 \\times 52 + 39 \\\\ 52 &= 1 \\times 39 + 13 \\\\ 39 &= 3 \\times 13 + 0 \\end{aligned}'),
              prose('The last remainder that is not $0$ is the HCF: the HCF of $247$ and $52$ is $13$.'),
            ),
            ask('euc-run-table'),
            ask('euc-hcf'),
            ask('euc-divide', 2),
            teach(
              prose(
                'In level 2 the HCF came from prime factors. That is quick for numbers such as $60$ and $40$, which are built from small primes.',
              ),
              prose(
                'For $221$ and $323$ it is slow: their smallest prime factors are $13$ and $17$, so you would try every prime up to those. Euclid needs three divisions:',
              ),
              maths('\\begin{aligned} 323 &= 1 \\times 221 + 102 \\\\ 221 &= 2 \\times 102 + 17 \\\\ 102 &= 6 \\times 17 + 0 \\end{aligned}'),
              prose('Division never needs the factors, so it wins whenever the numbers, or their primes, are large.'),
            ),
            ask('euc-hcf', 2),
            ask('euc-order-hcf', 2),
          ],
          skillCheck: [ask('euc-hcf', 2), ask('euc-order-hcf', 2), ask('euc-run-table', 2)],
        },
        {
          id: 'np-l5-reading',
          title: 'Reading a Run',
          slides: [
            teach(
              prose(
                'A run can be read as a chain: $a$, $b$, then each remainder in turn. Every number after the first two is what is left from dividing the two before it.',
              ),
              maths('247,\\ 52,\\ 39,\\ 13,\\ 0'),
              prose('The chain ends at $0$, and the HCF is the number just before it. Each step along it is one division, so this run takes three.'),
            ),
            ask('euc-remainder-tree'),
            ask('euc-count'),
            ask('euc-run-table', 2),
            teach(
              prose(
                'Remainders shrink fast: two steps along the chain always at least halve the number. So even numbers near $1000$ take only a handful of divisions.',
              ),
              prose(
                'If the number before the $0$ is $1$, the HCF is $1$ and the two numbers share no factor but $1$: they are **coprime**.',
              ),
            ),
            ask('euc-read-flow'),
            ask('euc-remainder-tree', 2),
            ask('euc-count+choice', 2),
            teach(
              prose(
                'To check a run, multiply each line back out: $q \\times b + r$ has to come to $a$, and $r$ has to be less than $b$.',
              ),
              prose(
                'A slip does not stop the run. Every line after it divides the wrong numbers, carries on quite happily and ends on the wrong HCF, so look for the **first** line that fails.',
              ),
            ),
            ask('euc-slip'),
            ask('euc-read-flow', 2),
          ],
          skillCheck: [ask('euc-slip', 2), ask('euc-remainder-tree', 2), ask('euc-read-flow', 2)],
        },
        {
          id: 'np-l5-backwards',
          title: 'Working Backwards',
          slides: [
            teach(
              prose('Every line of a run can be turned round so that its remainder stands alone:'),
              maths('\\begin{aligned} 39 &= 247 - 4 \\times 52 \\\\ 13 &= 52 - 39 \\end{aligned}'),
              prose(
                'So every remainder is a combination of the two numbers above it, and working back up the run makes the HCF a combination of $a$ and $b$: here $13 = 5 \\times 52 - 247$.',
              ),
            ),
            ask('euc-rearrange'),
            ask('euc-check-reduce'),
            ask('euc-rearrange', 2),
            teach(
              prose(
                'Start from the line whose remainder is the HCF, then put in the remainders above it one at a time, tidying as you go:',
              ),
              maths('\\begin{aligned} 13 &= 52 - 39 \\\\ &= 52 - (247 - 4 \\times 52) \\\\ &= 5 \\times 52 - 247 \\end{aligned}'),
              prose('So $13 = 247x + 52y$ with $x = -1$ and $y = 5$. Check: $260 - 247 = 13$.'),
            ),
            ask('euc-back-order'),
            ask('euc-find-y'),
            teach(
              prose(
                'The same working fits a table. The rows for $a$ and $b$ are $x = 1, y = 0$ and $x = 0, y = 1$. Each new row is the row two above it, take $q$ times the row above.',
              ),
              maths(
                '\\begin{array}{cccc} q & r & x & y \\\\ \\hline & 247 & 1 & 0 \\\\ & 52 & 0 & 1 \\\\ 4 & 39 & 1 & -4 \\\\ 1 & 13 & -1 & 5 \\end{array}',
              ),
              prose('The last row is the HCF: $13 = -1 \\times 247 + 5 \\times 52$.'),
            ),
            ask('euc-back-table'),
            ask('euc-back-order', 2),
            ask('euc-find-y', 2),
          ],
          skillCheck: [ask('euc-back-order', 2), ask('euc-find-y', 2), ask('euc-back-table', 2)],
        },
        {
          id: 'np-l5-solvable',
          title: 'Solving ax + by = c',
          slides: [
            teach(
              prose(
                'Whatever whole numbers $x$ and $y$ are, $ax + by$ is a multiple of $h$, the HCF of $a$ and $b$, because $h$ divides both terms.',
              ),
              prose(
                'So $ax + by = c$ can only have whole-number solutions when $h$ divides $c$. $6x + 9y = 20$ has none: the left side is always a multiple of $3$.',
              ),
            ),
            ask('euc-solvable'),
            ask('euc-solvable-flow'),
            ask('euc-solvable', 2),
            teach(
              prose(
                'When $h$ does divide $c$, there are solutions: scale the backwards run. From $13 = 247 \\times (-1) + 52 \\times 5$, multiply by $3$:',
              ),
              maths('39 = 247 \\times (-3) + 52 \\times 15'),
              prose('So $x = -3$, $y = 15$ solves $247x + 52y = 39$.'),
            ),
            ask('euc-scale'),
            ask('euc-scale', 2),
            teach(
              prose(
                'In a story, $x$ and $y$ count things, so both have to be positive. To make $38$p from $5$p and $7$p stamps, try $x = 1, 2, 3, \\dots$ until $38 - 5x$ is a multiple of $7$.',
              ),
              prose('At $x = 2$, $38 - 10 = 28 = 4 \\times 7$: two $5$p stamps and four $7$p stamps.'),
            ),
            ask('euc-stamps'),
            ask('euc-solvable-flow', 2),
            ask('euc-stamps', 2),
          ],
          skillCheck: [ask('euc-scale', 2), ask('euc-solvable-flow', 2), ask('euc-stamps', 2)],
        },
        {
          id: 'np-l5-general',
          title: 'All the Solutions',
          slides: [
            teach(
              prose(
                'From one solution of $ax + by = c$, add $b \\div h$ to $x$ and take $a \\div h$ from $y$. The left side goes up by $ab \\div h$ and down by the same, so it still makes $c$.',
              ),
              maths('\\begin{gathered} x = x_0 + \\tfrac{b}{h}t \\\\ y = y_0 - \\tfrac{a}{h}t \\end{gathered}'),
              prose(
                'That is every solution, for $t$ any whole number: those steps are the smallest that balance. $4x + 6y = 10$ has $x = 1, y = 1$ and $h = 2$, so every solution is $x = 1 + 3t$, $y = 1 - 2t$.',
              ),
            ),
            ask('euc-general'),
            ask('euc-list-table'),
            ask('euc-another'),
            teach(
              prose(
                'For the smallest positive $x$, step $x$ up or down by $b \\div h$ until it lands between $1$ and $b \\div h$.',
              ),
              prose(
                '$247x + 52y = 39$ has $x = -3$, $y = 15$. The steps are $52 \\div 13 = 4$ and $247 \\div 13 = 19$, so one step up gives $x = 1$, $y = -4$.',
              ),
            ),
            ask('euc-smallest'),
            ask('euc-general', 2),
            ask('euc-list-table', 2),
            teach(
              prose(
                'For both parts positive, start from the smallest positive $x$ and count the steps until $y$ reaches $0$ or below.',
              ),
              prose(
                '$3x + 5y = 41$: the smallest positive $x$ is $2$, with $y = 7$. Steps add $5$ to $x$ and take $3$ from $y$: $(2, 7)$, $(7, 4)$, $(12, 1)$, then $y = -2$. Three solutions.',
              ),
            ),
            ask('euc-count-positive'),
            ask('euc-smallest', 2),
          ],
          skillCheck: [ask('euc-general', 2), ask('euc-smallest', 2), ask('euc-count-positive', 2)],
        },
      ],
      levelCheck: [
        ask('euc-hcf', 2),
        ask('euc-same-hcf', 2),
        ask('euc-order-hcf', 2),
        ask('euc-remainder-tree', 2),
        ask('euc-slip', 2),
        ask('euc-count+choice', 2),
        ask('euc-rearrange', 2),
        ask('euc-back-table', 2),
        ask('euc-back-order', 2),
        ask('euc-solvable', 2),
        ask('euc-scale', 2),
        ask('euc-stamps', 2),
        ask('euc-general', 2),
        ask('euc-smallest', 2),
        ask('euc-count-positive+choice', 2),
      ],
    },
    {
      id: 'np-l6',
      title: 'Modular Arithmetic',
      lessons: [
        {
          id: 'np-l6-congruence',
          title: 'Congruence mod n',
          slides: [
            teach(
              prose(
                '$a \\equiv b \\pmod{n}$, read "$a$ is congruent to $b$ modulo $n$", means $n$ divides $a - b$.',
              ),
              maths('38 \\equiv 3 \\pmod{7}, \\quad \\text{since } 38 - 3 = 35 = 5 \\times 7'),
              prose(
                'Every whole number is congruent to exactly one of $0, 1, \\dots, n - 1$: its **residue**, the remainder you found in level 2. $38 = 5 \\times 7 + 3$, so the residue of $38$ modulo $7$ is $3$.',
              ),
            ),
            ask('cong-residue'),
            ask('cong-true'),
            ask('cong-flow'),
            teach(
              prose(
                'A negative number has a residue from $0$ to $n - 1$ too. Go **down** to the multiple of $n$ just below it, then count up.',
              ),
              maths('-17 = -20 + 3, \\quad \\text{so } -17 \\equiv 3 \\pmod{5}'),
              prose('Not $-2$: a residue is never negative. Check: $-17 - 3 = -20$, a multiple of $5$.'),
            ),
            ask('cong-negative'),
            ask('cong-class-table'),
            ask('cong-residue', 2),
            teach(
              prose(
                'Numbers with the same residue are congruent to each other. $38 \\equiv 3$ and $17 \\equiv 3 \\pmod{7}$, so $38 \\equiv 17 \\pmod{7}$: $38 - 17 = 21$.',
              ),
              prose(
                'Either side can be any whole number, a negative one included: $38 \\equiv -4 \\pmod{7}$, since $38 - (-4) = 42 = 6 \\times 7$.',
              ),
            ),
            ask('cong-true', 2),
            ask('cong-negative+choice', 2),
          ],
          skillCheck: [ask('cong-class-table', 2), ask('cong-negative', 2), ask('cong-flow', 2)],
        },
        {
          id: 'np-l6-arithmetic',
          title: 'Adding and Multiplying',
          slides: [
            teach(
              prose(
                'In level 2 you combined remainders: if $a$ and $b$ leave $3$ and $5$ on division by $7$, then $ab$ leaves the remainder of $15$, which is $1$. In the new notation, **reduce first, then combine**:',
              ),
              maths('\\begin{aligned} 346 &\\equiv 3, \\quad 59 \\equiv 3 \\\\ 346 \\times 59 &\\equiv 3 \\times 3 = 9 \\equiv 2 \\pmod{7} \\end{aligned}'),
              prose('No need to work out $346 \\times 59$ at all.'),
            ),
            ask('cong-from-residues'),
            ask('cong-combine-steps'),
            ask('cong-op-table'),
            teach(
              prose(
                'Why it works: $346 = 7j + 3$ and $59 = 7k + 3$ for whole numbers $j$ and $k$. Multiplying out,',
              ),
              maths('\\begin{aligned} 346 \\times 59 &= 49jk + 21j + 21k + 9 \\\\ &= 7(7jk + 3j + 3k) + 9 \\end{aligned}'),
              prose('Everything but the $9$ is a multiple of $7$, and $9 \\equiv 2$. Adding works the same way.'),
            ),
            ask('cong-arith-order'),
            ask('cong-from-residues+choice', 2),
            ask('cong-combine-steps', 2),
            teach(
              prose(
                'A table modulo $n$ shows every sum or product at once. Row $2$ of the multiplication table modulo $5$ reads $2, 4, 1, 3$: $2 \\times 3 = 6 \\equiv 1$.',
              ),
              prose(
                'Taking away can give a negative number; add $n$ to bring it back: $2 - 4 = -2 \\equiv 3 \\pmod{5}$.',
              ),
            ),
            ask('cong-op-table', 2),
            ask('cong-arith-order', 2),
          ],
          skillCheck: [ask('cong-combine-steps', 2), ask('cong-arith-order', 2), ask('cong-from-residues', 2)],
        },
        {
          id: 'np-l6-powers',
          title: 'Powers mod n',
          slides: [
            teach(
              prose(
                'A power is repeated multiplication, so reduce after every multiplication. The powers of $3$ modulo $7$:',
              ),
              maths('3, \\ 9 \\equiv 2, \\ 6, \\ 18 \\equiv 4, \\ 12 \\equiv 5, \\ 15 \\equiv 1'),
              prose(
                'Once a power reaches $1$, the next is $3$ again and the residues come round in a **cycle**, here of length $6$. A base bigger than $n$ is reduced first: $10 \\equiv 3 \\pmod{7}$, so the powers of $10$ run the same way.',
              ),
            ),
            ask('cong-power-table'),
            ask('cong-cycle'),
            ask('cong-power-table', 2),
            teach(
              prose(
                'The cycle turns a huge power into a small one. Modulo $7$ the powers of $2$ run $2, 4, 1$, a cycle of length $3$, and $2^3 \\equiv 1$.',
              ),
              maths('100 = 33 \\times 3 + 1, \\quad \\text{so } 2^{100} = (2^3)^{33} \\times 2 \\equiv 2 \\pmod{7}'),
              prose('Only the remainder of the power on division by the cycle length matters.'),
            ),
            ask('cong-big-power'),
            ask('cong-power-flow'),
            ask('cong-cycle+choice', 2),
            teach(
              prose(
                'When the cycle is long, **square repeatedly** instead. For $3^{13}$ modulo $17$, each power is the square of the one before:',
              ),
              maths('3^1 \\equiv 3, \\ 3^2 \\equiv 9, \\ 3^4 \\equiv 81 \\equiv 13, \\ 3^8 \\equiv 169 \\equiv 16'),
              prose('$13 = 8 + 4 + 1$, so $3^{13} \\equiv 16 \\times 13 \\times 3$. $16 \\times 13 = 208 \\equiv 4$, and $4 \\times 3 = 12$.'),
            ),
            ask('cong-square-tree'),
            ask('cong-big-power', 2),
          ],
          skillCheck: [ask('cong-big-power', 2), ask('cong-power-flow', 2), ask('cong-square-tree', 2)],
        },
        {
          id: 'np-l6-last-digits',
          title: 'Last Digits',
          slides: [
            teach(
              prose(
                'The last digit of a number is its residue modulo $10$. So the last digit of a product depends only on the last digits: $347 \\times 58$ ends like $7 \\times 8 = 56$, in $6$.',
              ),
              prose(
                "Level 2's tests for $2$, $5$ and $10$ look only at the last digit for the same reason: $10$ is a multiple of each, so everything but the last digit already is.",
              ),
            ),
            ask('cong-last-product'),
            ask('cong-last-square'),
            ask('cong-last-product+choice', 2),
            teach(
              prose('Last digits of powers come round in a cycle. The powers of $7$ end in'),
              maths('7, \\ 9, \\ 3, \\ 1, \\ 7, \\ 9, \\dots'),
              prose(
                'a cycle of length $4$. For $7^{123}$: $123 = 30 \\times 4 + 3$, so it ends like $7^3$, in $3$.',
              ),
            ),
            ask('cong-last-power'),
            ask('cong-last-tiles'),
            ask('cong-last-power+choice', 2),
            teach(
              prose(
                'The last two digits are the residue modulo $100$, so keep the last two digits of every number: $347 \\times 219$ ends like $47 \\times 19 = 893$, in $93$.',
              ),
              prose('Powers work the same way: the powers of $7$ end in $07, 49, 43, 01$ and then repeat.'),
            ),
            ask('cong-last-two', 2),
            ask('cong-last-tiles', 2),
          ],
          skillCheck: [ask('cong-last-power', 2), ask('cong-last-tiles', 2), ask('cong-last-two', 2)],
        },
        {
          id: 'np-l6-digit-sums',
          title: 'Why Digit Sums Work',
          slides: [
            teach(
              prose('$10 = 9 + 1$ and $100 = 99 + 1$, so both are congruent to $1$ modulo $9$. Then'),
              maths('472 = 4 \\times 100 + 7 \\times 10 + 2 \\equiv 4 + 7 + 2 = 13 \\equiv 4 \\pmod{9}'),
              prose(
                'A number leaves the same remainder as its digit sum on division by $9$, and on division by $3$ as well, since $9$ is a multiple of $3$.',
              ),
            ),
            ask('cong-ten-tiles'),
            ask('cong-digit-residue'),
            ask('cong-digit-order'),
            teach(
              prose(
                'That is why the tests from level 2 work: a number is divisible by $9$, or by $3$, exactly when its digit sum is. Level 2 stated the rule; this proves it.',
              ),
              prose(
                'Modulo $11$, $10 \\equiv -1$ and $100 \\equiv 1$, so a number is congruent to its digits added and taken away in turn: $726 \\equiv 7 - 2 + 6 = 11 \\equiv 0$, and $726 = 66 \\times 11$.',
              ),
            ),
            ask('cong-missing-digit'),
            ask('cong-ten-tiles', 2),
            ask('cong-digit-order', 2),
            teach(
              prose(
                '**Casting out nines** checks a calculation: replace each number by its digit sum modulo $9$. Is $37 \\times 24 = 898$?',
              ),
              maths('37 \\to 1, \\quad 24 \\to 6, \\quad 1 \\times 6 = 6, \\quad 898 \\to 25 \\to 7'),
              prose(
                '$6$ and $7$ differ, so $898$ is wrong; it is $888$. A pass proves less: a swap of two digits leaves the digit sum alone.',
              ),
            ),
            ask('cong-cast-flow'),
            ask('cong-digit-residue+choice', 2),
          ],
          skillCheck: [ask('cong-digit-order', 2), ask('cong-cast-flow', 2), ask('cong-missing-digit', 2)],
        },
      ],
      levelCheck: [
        ask('cong-negative', 2),
        ask('cong-class-table', 2),
        ask('cong-true', 2),
        ask('cong-combine-steps', 2),
        ask('cong-from-residues+choice', 2),
        ask('cong-arith-order', 2),
        ask('cong-power-table', 2),
        ask('cong-big-power', 2),
        ask('cong-square-tree', 2),
        ask('cong-last-power', 2),
        ask('cong-last-two', 2),
        ask('cong-last-square', 2),
        ask('cong-digit-order', 2),
        ask('cong-cast-flow', 2),
        ask('cong-missing-digit', 2),
      ],
    },
  ],
};
