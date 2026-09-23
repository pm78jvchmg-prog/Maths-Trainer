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
 * time.
 *
 * Surds and rationalising denominators are taught in Exponents & Radicals
 * (`er-l3`, `er-l5`), not here. Later levels are in the level plan in
 * `docs/roadmap/levels/number-proof.md`.
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
  ],
};
