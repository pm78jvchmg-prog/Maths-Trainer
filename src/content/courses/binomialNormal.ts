/**
 * Binomial and Normal Distributions.
 *
 * Level 1 is the binomial distribution: the four conditions for B(n, p),
 * P(X = r) from nCr and two powers, the probability table and cumulative
 * probabilities, the complement for "at least" and its cousins, and the mean
 * np and variance np(1 - p). Level 2 is the normal distribution: its curve
 * and the 68-95-99.7 rule, standardising to z, probabilities from Phi on
 * either side of the mean, working back from a probability to a value, and
 * finding mu or sigma from one known probability. Level 3 finds both from two
 * probabilities: two standardising equations solved simultaneously, the
 * equal-tails shortcut, and checking and using the pair once it is found.
 * Level 4 is the normal approximation to the binomial: why a long binomial
 * sum is worth replacing, when np and n(1 - p) are both above 5, the matching
 * N(np, np(1 - p)), the continuity correction, and the whole route to a
 * probability. Level 5 combines independent normals: aX + b, X + Y and
 * X - Y, aX + bY in general, a total of n copies against one copy times n,
 * and a probability from the combination, P(X > Y) among them.
 *
 * nCr belongs to Binomial Expansion (`be-l2-ncr`) and is pointed at, not
 * taught again. Independence belongs to the Probability course
 * (`pb-l2-independence`) and the mean and standard deviation of data to the
 * Data course; level 5 points at the first rather than teaching it. Later levels are in
 * `docs/roadmap/levels/binomial-normal.md`.
 *
 * Each level closes with a level check: fifteen questions, no teaching
 * slides, one attempt each.
 */
import type { Block, Course, SlideRef } from '../types';
import { barsSvg, normalSvg } from '../generators/binomialNormal';

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

/** Lines of working stacked in one display and aligned on their `&`. */
const working = (...lines: string[]) => maths(`\\begin{aligned} ${lines.join(' \\\\ ')} \\end{aligned}`);

/** Bars of B(n, p), with an optional normal curve, shaded run and boundary over them. */
const bars = (n: number, p: number, opts: Parameters<typeof barsSvg>[2]): Block => ({ kind: 'diagram', svg: barsSvg(n, p, opts) });

/** A two-column table, stacked so it never runs off a phone. */
const table = (head: [string, string], rows: [string, string][]): Block =>
  maths(`\\begin{array}{c|c} ${head[0]} & ${head[1]} \\\\ \\hline ${rows.map(([a, b]) => `${a} & ${b}`).join(' \\\\ ')} \\end{array}`);

const curve = (shade: [number, number] | undefined, verticals: number[], label: string): Block => ({
  kind: 'diagram',
  svg: normalSvg(0, 1, { xMin: -3.6, xMax: 3.6, shade, verticals, label }),
});

export const binomialNormal: Course = {
  id: 'binomial-normal',
  category: 'statistics',
  position: 30,
  title: 'Binomial and Normal Distributions',
  blurb: 'Counting successes with B(n, p), then the bell curve: standardising, reading Phi, and working back to a value.',
  levels: [
    {
      id: 'bn-l1',
      title: 'The Binomial Distribution',
      lessons: [
        {
          id: 'bn-l1-model',
          title: 'When Is It Binomial?',
          slides: [
            teach(
              prose('A binomial distribution counts successes. It fits when all four of these hold:'),
              prose('**1.** A fixed number of trials, $n$. **2.** Each trial is a success or a failure. **3.** The chance of success, $p$, is the same every time. **4.** The trials are independent: one result tells you nothing about another.'),
              prose('Then $X$, the number of successes, is written'),
              maths('X \\sim B(n, p)'),
            ),
            ask('dist-binomial-conditions-flow'),
            ask('dist-binomial-name'),
            ask('dist-trials'),
            teach(
              prose('A fair dice is rolled $10$ times and $X$ is the number of sixes: $n = 10$ and $p = \\frac{1}{6}$.'),
              maths('X \\sim B(10, \\tfrac{1}{6})'),
              prose('If $X$ counts the rolls that are **not** a six, the "success" it counts has probability $1 - \\frac{1}{6} = \\frac{5}{6}$, so $X \\sim B(10, \\frac{5}{6})$.'),
            ),
            ask('dist-binomial-which-fails'),
            ask('dist-binomial-conditions-flow', 2),
            ask('dist-binomial-name', 2),
            teach(
              prose('Where it breaks: "until" means the number of trials is not fixed. Drawing without replacement changes $p$ from one draw to the next. Results that sway each other are not independent; the Probability course has more on independence.'),
            ),
            ask('dist-trials', 2),
            ask('dist-binomial-which-fails', 2),
          ],
          skillCheck: [ask('dist-binomial-name', 2), ask('dist-binomial-which-fails', 2), ask('dist-trials', 2)],
        },
        {
          id: 'bn-l1-formula',
          title: 'The Binomial Formula',
          slides: [
            teach(
              prose('For $X \\sim B(n, p)$, exactly $r$ successes means $r$ successes and $n - r$ failures, in some order.'),
              prose('One order has probability $p^r (1 - p)^{n - r}$, and there are $\\tbinom{n}{r}$ orders (that is ${}^{n}C_{r}$, from Binomial Expansion level 2).'),
              maths('P(X = r) = \\tbinom{n}{r} p^r (1 - p)^{n - r}'),
            ),
            ask('dist-pmf-factors'),
            ask('dist-pmf-form'),
            ask('dist-pmf'),
            teach(
              prose('$X \\sim B(4, 0.3)$. Find $P(X = 2)$.'),
              working('& P(X = 2)', '&= \\tbinom{4}{2} \\times 0.3^2 \\times 0.7^2', '&= 6 \\times 0.09 \\times 0.49', '&= 0.2646'),
            ),
            ask('dist-pmf-working'),
            ask('dist-pmf+choice'),
            ask('dist-pmf-factors', 2),
            teach(
              prose('Check the powers add up to $n$: the successes and the failures between them are every trial. And the power of $p$ always matches the $r$ in $\\tbinom{n}{r}$.'),
            ),
            ask('dist-pmf-form', 2),
            ask('dist-pmf-working', 2),
          ],
          skillCheck: [ask('dist-pmf', 2), ask('dist-pmf-form', 2), ask('dist-pmf-working', 2)],
        },
        {
          id: 'bn-l1-cumulative',
          title: 'The Table and P(X ≤ r)',
          slides: [
            teach(
              prose('The probability table lists $P(X = r)$ for every $r$ from $0$ to $n$. For $X \\sim B(3, 0.3)$:'),
              table(['r', 'P(X = r)'], [
                ['0', '0.343'],
                ['1', '0.441'],
                ['2', '0.189'],
                ['3', '0.027'],
              ]),
              prose('Every possible value is in the table, so the probabilities add up to $1$.'),
            ),
            ask('dist-table-fill'),
            ask('dist-cumulative'),
            ask('dist-cumulative-parts'),
            teach(
              prose('A cumulative probability adds up the table from the top: $P(X \\le r)$ is everything from $0$ to $r$.'),
              working('P(X \\le 1) &= P(X = 0)', '&\\quad + P(X = 1)', '&= 0.343 + 0.441', '&= 0.784'),
              prose('Fewer than $2$ is the same event: $P(X < 2) = P(X \\le 1)$.'),
            ),
            ask('dist-table-missing'),
            ask('dist-cumulative+choice'),
            ask('dist-table-fill', 2),
            teach(
              prose('A missing value in a table needs no formula: take the others away from $1$.'),
            ),
            ask('dist-cumulative-parts', 2),
            ask('dist-table-missing', 2),
          ],
          skillCheck: [ask('dist-cumulative', 2), ask('dist-table-fill', 2), ask('dist-table-missing', 2)],
        },
        {
          id: 'bn-l1-complement',
          title: 'At Least, At Most, Between',
          slides: [
            teach(
              prose('Turn the words into an inequality first:'),
              table(['\\text{words}', '\\text{inequality}'], [
                ['\\text{at most } 3', 'X \\le 3'],
                ['\\text{fewer than } 3', 'X \\le 2'],
                ['\\text{at least } 3', 'X \\ge 3'],
                ['\\text{more than } 3', 'X \\ge 4'],
              ]),
              prose('Tables and calculators give $P(X \\le r)$, so an "at least" is found from what is left over:'),
              maths('P(X \\ge 3) = 1 - P(X \\le 2)'),
            ),
            ask('dist-which-cumulative'),
            ask('dist-at-least'),
            ask('dist-at-least-working'),
            teach(
              prose('A range is one cumulative take away another. Everything up to the top of the range, less everything below it:'),
              working('& P(3 \\le X \\le 6)', '&= P(X \\le 6) - P(X \\le 2)'),
              prose('Check each end: $3$ is in the range, so only up to $2$ is taken away.'),
            ),
            ask('dist-between-form'),
            ask('dist-which-cumulative', 2),
            ask('dist-at-least+choice'),
            teach(
              prose('"At least one" is the quickest of all: the only way to miss it is no successes at all.'),
              working('P(X \\ge 1) &= 1 - P(X = 0)', '&= 1 - (1 - p)^n'),
            ),
            ask('dist-at-least-working', 2),
            ask('dist-between-form', 2),
          ],
          skillCheck: [ask('dist-at-least', 2), ask('dist-which-cumulative', 2), ask('dist-between-form', 2)],
        },
        {
          id: 'bn-l1-mean',
          title: 'Mean and Variance',
          slides: [
            teach(
              prose('On average, $n$ trials with a chance $p$ each give $np$ successes. That is the mean, or expected value:'),
              maths('E(X) = np'),
              prose('$X \\sim B(20, 0.3)$ has mean $20 \\times 0.3 = 6$.'),
            ),
            ask('dist-mean-variance'),
            ask('dist-mean-form'),
            ask('dist-spread-parts'),
            teach(
              prose('The variance measures the spread (the Data course has it for a list of numbers). For a binomial distribution it is'),
              maths('\\mathrm{Var}(X) = np(1 - p)'),
              prose('$X \\sim B(20, 0.3)$ has variance $6 \\times 0.7 = 4.2$, and standard deviation $\\sqrt{4.2}$.'),
            ),
            ask('dist-match-moments'),
            ask('dist-mean-variance', 2),
            ask('dist-mean-form', 2),
            teach(
              prose('Given the mean and the variance, divide one by the other: $\\frac{np(1 - p)}{np} = 1 - p$. That gives $p$, and then $n$ from $np$.'),
            ),
            ask('dist-from-moments'),
            ask('dist-spread-parts', 2),
          ],
          skillCheck: [ask('dist-mean-variance', 2), ask('dist-spread-parts', 2), ask('dist-from-moments', 2)],
        },
      ],
      levelCheck: [
        ask('dist-binomial-conditions-flow', 2),
        ask('dist-binomial-name', 2),
        ask('dist-trials', 2),
        ask('dist-binomial-which-fails', 2),
        ask('dist-pmf-factors', 2),
        ask('dist-pmf', 2),
        ask('dist-pmf-working', 2),
        ask('dist-table-fill', 2),
        ask('dist-cumulative', 2),
        ask('dist-table-missing', 2),
        ask('dist-which-cumulative', 2),
        ask('dist-at-least', 2),
        ask('dist-between-form', 2),
        ask('dist-mean-variance', 2),
        ask('dist-from-moments', 2),
      ],
    },
    {
      id: 'bn-l2',
      title: 'The Normal Distribution',
      lessons: [
        {
          id: 'bn-l2-curve',
          title: 'The Normal Curve',
          slides: [
            teach(
              prose('Heights, masses and times cluster round a middle value and thin out either side. The normal distribution models that: a bell-shaped curve, symmetric about its mean $\\mu$, with its spread set by the standard deviation $\\sigma$.'),
              curve(undefined, [0], 'A bell-shaped normal curve, symmetric about the mean'),
              prose('It is written with the **variance** $\\sigma^2$, not $\\sigma$:'),
              maths('X \\sim N(\\mu, \\sigma^2)'),
            ),
            ask('dist-normal-notation'),
            ask('dist-rule-slider'),
            ask('dist-rule-percent'),
            teach(
              prose('The area under the curve is the probability, and the whole area is $1$. Whatever $\\mu$ and $\\sigma$ are:'),
              curve([-1, 1], [-2, -1, 1, 2], 'A normal curve with the middle, within one standard deviation of the mean, shaded'),
              prose('About **68%** lies within $1$ standard deviation of the mean, **95%** within $2$ and **99.7%** within $3$.'),
            ),
            ask('dist-rule-flow'),
            ask('dist-normal-notation', 2),
            ask('dist-rule-slider', 2),
            teach(
              prose('The rest splits equally between the two tails. Outside $2$ standard deviations is $5\\%$, so $2.5\\%$ lies above $\\mu + 2\\sigma$ and $97.5\\%$ below it.'),
            ),
            ask('dist-rule-percent', 2),
            ask('dist-rule-flow', 2),
          ],
          skillCheck: [ask('dist-rule-percent', 2), ask('dist-rule-flow', 2), ask('dist-normal-notation', 2)],
        },
        {
          id: 'bn-l2-standardise',
          title: 'Standardising',
          slides: [
            teach(
              prose('Every normal distribution is the same curve, moved and stretched. Standardising measures a value in standard deviations from the mean:'),
              maths('z = \\frac{x - \\mu}{\\sigma}'),
              prose('$Z = \\frac{X - \\mu}{\\sigma}$ has the standard normal distribution, $Z \\sim N(0, 1)$.'),
            ),
            ask('dist-z-score'),
            ask('dist-z-form'),
            ask('dist-z-parts'),
            teach(
              prose('$X \\sim N(50, 16)$ has $\\sigma = \\sqrt{16} = 4$, not $16$.'),
              working('z &= \\frac{56 - 50}{4} = 1.5', 'x &= \\mu + z\\sigma', '&= 50 + (-2) \\times 4 = 42'),
              prose('A value below the mean has a negative $z$. Reading it backwards, $x = \\mu + z\\sigma$.'),
            ),
            ask('dist-z-working'),
            ask('dist-z-compare'),
            ask('dist-z-score+choice'),
            teach(
              prose('$z$ also compares results on different scales: the larger $z$ is further above its own mean, and so the better result against everyone else.'),
            ),
            ask('dist-z-form', 2),
            ask('dist-z-working', 2),
          ],
          skillCheck: [ask('dist-z-score', 2), ask('dist-z-form', 2), ask('dist-z-working', 2)],
        },
        {
          id: 'bn-l2-probability',
          title: 'Probabilities from Φ',
          slides: [
            teach(
              prose('$\\Phi(z)$ is the area under the standard normal curve to the left of $z$: $P(Z < z)$. Tables give it for positive $z$.'),
              curve([-3.6, 1.5], [1.5], 'The standard normal curve shaded to the left of z = 1.5'),
              prose('For $X \\sim N(\\mu, \\sigma^2)$, standardise first, then read $\\Phi$:'),
              maths('P(X < x) = \\Phi\\left(\\frac{x - \\mu}{\\sigma}\\right)'),
            ),
            ask('dist-tail-flow'),
            ask('dist-normal-prob'),
            ask('dist-normal-table'),
            teach(
              prose('Above is what is left: $P(Z > z) = 1 - \\Phi(z)$.'),
              prose('Below a negative $z$, use symmetry: the tail below $-z$ matches the tail above $z$.'),
              working('P(Z < -1.5) &= 1 - \\Phi(1.5)', '&= 1 - 0.9332', '&= 0.0668'),
            ),
            ask('dist-normal-between-form'),
            ask('dist-normal-prob', 2),
            ask('dist-tail-flow', 2),
            teach(
              prose('Between two values: the area below the top one, take away the area below the bottom one. With $\\Phi(0.5) = 0.6915$ and $\\Phi(1.5) = 0.9332$:'),
              working('& P(0.5 < Z < 1.5)', '&= 0.9332 - 0.6915', '&= 0.2417'),
            ),
            ask('dist-normal-table', 2),
            ask('dist-normal-between-form', 2),
          ],
          skillCheck: [ask('dist-normal-prob', 2), ask('dist-tail-flow', 2), ask('dist-normal-between-form', 2)],
        },
        {
          id: 'bn-l2-inverse',
          title: 'Working Back from a Probability',
          slides: [
            teach(
              prose('Sometimes the probability is known and the value is wanted: which mark do only the top $5\\%$ beat? Work backwards: find $z$ from the probability, then $x = \\mu + z\\sigma$.'),
              prose('These values of $z$ come up so often they are worth knowing:'),
              maths('\\begin{array}{c|c} \\Phi(z) & z \\\\ \\hline 0.95 & 1.645 \\\\ 0.975 & 1.96 \\\\ 0.99 & 2.326 \\\\ 0.995 & 2.576 \\end{array}'),
            ),
            ask('dist-critical-choice'),
            ask('dist-inverse-x'),
            ask('dist-inverse-form'),
            teach(
              prose('$X \\sim N(60, 25)$ and $P(X > a) = 0.05$. Then $P(X < a) = 0.95$, so $z = 1.645$:'),
              working('a &= 60 + 1.645 \\times 5', '&= 68.225'),
              prose('A lower tail gives a negative $z$ by symmetry: $P(X < a) = 0.05$ puts $a$ at $z = -1.645$.'),
            ),
            ask('dist-inverse-slider'),
            ask('dist-inverse-parts'),
            ask('dist-inverse-x', 2),
            teach(
              prose('The middle $95\\%$ leaves $2.5\\%$ in each tail, so it runs from $z = -1.96$ to $z = 1.96$: from $\\mu - 1.96\\sigma$ to $\\mu + 1.96\\sigma$.'),
            ),
            ask('dist-critical-choice', 2),
            ask('dist-inverse-form', 2),
          ],
          skillCheck: [ask('dist-inverse-x', 2), ask('dist-inverse-form', 2), ask('dist-critical-choice', 2)],
        },
        {
          id: 'bn-l2-unknown',
          title: 'Finding μ or σ',
          slides: [
            teach(
              prose('If $\\mu$ or $\\sigma$ is unknown, one probability pins it down. Turn the probability into $z$, then standardise with the unknown left in:'),
              maths('\\frac{x - \\mu}{\\sigma} = z'),
              prose('and solve that equation for whichever is missing.'),
            ),
            ask('dist-find-equation'),
            ask('dist-find-parameter'),
            ask('dist-find-working'),
            teach(
              prose('$X \\sim N(\\mu, 16)$ and $P(X < 62) = 0.9332$. $\\Phi(1.5) = 0.9332$, so $z = 1.5$:'),
              working('\\frac{62 - \\mu}{4} &= 1.5', '\\mu &= 62 - 1.5 \\times 4', '&= 56'),
              prose('Check the sign: a probability below $x$ of more than a half puts $x$ above the mean, so $z$ is positive.'),
            ),
            ask('dist-find-choice'),
            ask('dist-find-parameter', 2),
            ask('dist-find-equation', 2),
            teach(
              prose('For $\\sigma$ the same equation works: $X \\sim N(50, \\sigma^2)$ with $P(X > 58) = 0.0228$ and $\\Phi(2) = 0.9772$ gives $z = 2$, so $\\frac{58 - 50}{\\sigma} = 2$ and $\\sigma = 4$.'),
            ),
            ask('dist-find-working', 2),
            ask('dist-find-choice', 2),
          ],
          skillCheck: [ask('dist-find-parameter', 2), ask('dist-find-working', 2), ask('dist-find-equation', 2)],
        },
      ],
      levelCheck: [
        ask('dist-normal-notation', 2),
        ask('dist-rule-slider', 2),
        ask('dist-rule-percent', 2),
        ask('dist-rule-flow', 2),
        ask('dist-z-score', 2),
        ask('dist-z-parts', 2),
        ask('dist-z-compare', 2),
        ask('dist-normal-prob', 2),
        ask('dist-tail-flow', 2),
        ask('dist-normal-table', 2),
        ask('dist-inverse-x', 2),
        ask('dist-inverse-slider', 2),
        ask('dist-critical-choice', 2),
        ask('dist-find-parameter', 2),
        ask('dist-find-choice', 2),
      ],
    },
    {
      id: 'bn-l3',
      title: 'Finding Both μ and σ',
      lessons: [
        {
          id: 'bn-l3-one',
          title: 'Why One Probability Is Not Enough',
          slides: [
            teach(
              prose('In level 2 one probability was enough, because only one of $\\mu$ and $\\sigma$ was missing. Standardising gave one equation, and one equation fixes one unknown:'),
              maths('\\frac{x - \\mu}{\\sigma} = z'),
              prose('With both missing, that same equation has two unknowns in it.'),
            ),
            ask('dist-find-equation', 2),
            ask('dist-both-sign-flow'),
            ask('dist-both-standardise'),
            teach(
              prose('$P(X < 62) = 0.9332$ and $\\Phi(1.5) = 0.9332$, so $\\frac{62 - \\mu}{\\sigma} = 1.5$, or $62 = \\mu + 1.5\\sigma$. Every one of these pairs fits it:'),
              table(['\\sigma', '\\mu'], [
                ['2', '59'],
                ['4', '56'],
                ['10', '47'],
              ]),
              prose('One probability cannot choose between them.'),
            ),
            ask('dist-both-fits'),
            ask('dist-find-parameter', 2),
            ask('dist-both-sign-flow', 2),
            teach(
              prose('The sign of $z$ comes from the side of the mean. $P(X < x)$ more than a half puts $x$ above the mean, so $z$ is positive; less than a half puts it below, so $z$ is negative.'),
              prose('$P(X < 41) = 0.0228$ with $\\Phi(2) = 0.9772$: $1 - 0.9772 = 0.0228$, so $z = -2$ and $\\frac{41 - \\mu}{\\sigma} = -2$.'),
            ),
            ask('dist-both-standardise', 2),
            ask('dist-both-fits', 2),
          ],
          skillCheck: [ask('dist-both-sign-flow', 2), ask('dist-both-standardise', 2), ask('dist-both-fits', 2)],
        },
        {
          id: 'bn-l3-two',
          title: 'Two Probabilities, Two Equations',
          slides: [
            teach(
              prose('A second probability gives a second equation. Write each one as $x = \\mu + z\\sigma$. With $P(X < 41) = 0.0668$, $P(X > 81) = 0.3085$, $\\Phi(1.5) = 0.9332$ and $\\Phi(0.5) = 0.6915$:'),
              working('41 &= \\mu - 1.5\\sigma', '81 &= \\mu + 0.5\\sigma'),
              prose('Two equations in two unknowns: enough to find both.'),
            ),
            ask('dist-both-table'),
            ask('dist-both-equation'),
            ask('dist-both-pair'),
            teach(
              prose('A percentage point works the same way. $P(X > 90) = 0.05$ puts $90$ at $z = 1.645$, and $P(X < 30) = 0.025$ puts $30$ at $z = -1.96$:'),
              maths('\\begin{array}{c|c} \\Phi(z) & z \\\\ \\hline 0.95 & 1.645 \\\\ 0.975 & 1.96 \\\\ 0.99 & 2.326 \\\\ 0.995 & 2.576 \\end{array}'),
            ),
            ask('dist-both-equation', 2),
            ask('dist-both-sign-flow', 2),
            ask('dist-critical-choice', 2),
            teach(
              prose('A quick check: the larger value always has the larger $z$. If it does not, a sign has slipped.'),
            ),
            ask('dist-both-table', 2),
            ask('dist-both-pair', 2),
          ],
          skillCheck: [ask('dist-both-table', 2), ask('dist-both-equation', 2), ask('dist-both-pair', 2)],
        },
        {
          id: 'bn-l3-solve',
          title: 'Solving Simultaneously',
          slides: [
            teach(
              prose('Take one equation from the other and $\\mu$ cancels:'),
              working('81 &= \\mu + 0.5\\sigma', '41 &= \\mu - 1.5\\sigma', '40 &= 2\\sigma'),
              prose('So $\\sigma = 20$, and then $\\mu = 41 + 1.5 \\times 20 = 71$.'),
            ),
            ask('dist-both-working'),
            ask('dist-both-solve'),
            ask('dist-both-nodes-tree'),
            teach(
              prose('Both values can sit on one side of the mean. Nothing changes: $P(X < 56) = 0.6915$ and $P(X < 68) = 0.9772$ give'),
              working('68 &= \\mu + 2\\sigma', '56 &= \\mu + 0.5\\sigma', '12 &= 1.5\\sigma'),
              prose('so $\\sigma = 8$ and $\\mu = 56 - 0.5 \\times 8 = 52$.'),
            ),
            ask('dist-both-solve+choice', 2),
            ask('dist-both-working', 2),
            ask('dist-both-equation', 2),
            teach(
              prose('$\\sigma$ must come out positive. A negative one means a $z$ has the wrong sign: go back to which side of the mean each value is on.'),
            ),
            ask('dist-both-nodes-tree', 2),
            ask('dist-both-table', 2),
          ],
          skillCheck: [ask('dist-both-solve', 2), ask('dist-both-working', 2), ask('dist-both-nodes-tree', 2)],
        },
        {
          id: 'bn-l3-pattern',
          title: 'Pairs with a Pattern',
          slides: [
            teach(
              prose('When the two tails are the same size, the values sit the same distance either side of the mean, so $\\mu$ is their midpoint. With $P(X < 40.4) = 0.025$ and $P(X > 79.6) = 0.025$:'),
              working('\\mu &= \\frac{40.4 + 79.6}{2} = 60'),
              prose('Half the gap, $19.6$, is $1.96$ standard deviations, so $\\sigma = 19.6 \\div 1.96 = 10$.'),
            ),
            ask('dist-both-midpoint-slider'),
            ask('dist-both-symmetric'),
            ask('dist-both-half-gap'),
            teach(
              prose('A proportion is a probability written as a percentage. "$6.68\\%$ of bags weigh less than $495$ grams" means $P(X < 495) = 0.0668$, and from there it is the same method.'),
            ),
            ask('dist-both-proportion'),
            ask('dist-both-symmetric+choice', 2),
            ask('dist-both-midpoint-slider', 2),
            teach(
              prose('The midpoint shortcut needs equal tails. $P(X < a) = 0.05$ with $P(X > b) = 0.01$ is lopsided, so use the two equations instead.'),
            ),
            ask('dist-both-half-gap', 2),
            ask('dist-both-proportion', 2),
          ],
          skillCheck: [ask('dist-both-symmetric', 2), ask('dist-both-half-gap', 2), ask('dist-both-proportion', 2)],
        },
        {
          id: 'bn-l3-use',
          title: 'Checking and Using the Result',
          slides: [
            teach(
              prose('Check by putting $\\mu$ and $\\sigma$ back. With $\\mu = 71$ and $\\sigma = 20$:'),
              working('z &= \\frac{41 - 71}{20}', '&= -1.5'),
              working('P(X < 41) &= 1 - 0.9332', '&= 0.0668'),
              prose('which is the probability the question started from.'),
            ),
            ask('dist-both-check-table'),
            ask('dist-both-verify'),
            ask('dist-both-new-prob'),
            teach(
              prose('Once both are found it is an ordinary normal distribution, and any other probability follows. With $\\Phi(1) = 0.8413$:'),
              working('P(X > 91) &= P(Z > 1)', '&= 1 - 0.8413', '&= 0.1587'),
            ),
            ask('dist-both-chain-tree'),
            ask('dist-both-check-table', 2),
            ask('dist-both-new-prob+choice', 2),
            teach(
              prose('Two quick checks before trusting an answer: $\\sigma$ is positive, and the larger value has the larger probability below it.'),
            ),
            ask('dist-both-verify', 2),
            ask('dist-both-chain-tree', 2),
          ],
          skillCheck: [ask('dist-both-check-table', 2), ask('dist-both-new-prob', 2), ask('dist-both-chain-tree', 2)],
        },
      ],
      levelCheck: [
        ask('dist-both-sign-flow', 2),
        ask('dist-both-standardise', 2),
        ask('dist-both-fits', 2),
        ask('dist-both-table', 2),
        ask('dist-both-equation', 2),
        ask('dist-both-pair', 2),
        ask('dist-both-solve', 2),
        ask('dist-both-working', 2),
        ask('dist-both-nodes-tree', 2),
        ask('dist-both-symmetric', 2),
        ask('dist-both-midpoint-slider', 2),
        ask('dist-both-proportion', 2),
        ask('dist-both-check-table', 2),
        ask('dist-both-new-prob', 2),
        ask('dist-both-chain-tree', 2),
      ],
    },
    {
      id: 'bn-l4',
      title: 'Normal Approximation to the Binomial',
      lessons: [
        {
          id: 'bn-l4-why',
          title: 'Why Approximate?',
          slides: [
            teach(
              prose('$X \\sim B(100, 0.5)$. Worked out exactly, $P(X \\le 45)$ is a sum of $46$ terms, each with its own $\\tbinom{100}{k}$ and powers:'),
              working('& P(X = 0) + P(X = 1)', '&\\quad + \\dots + P(X = 45)'),
              prose('Draw each $P(X = r)$ as a bar one unit wide, centred on $r$. With $p$ near a half and $n$ large, the bars make a bell, centred on the mean $np$, and a normal curve fits over them:'),
              bars(40, 0.5, { from: 10, to: 30, curve: true, label: 'The bars of B(40, 0.5) from 10 to 30, with a bell-shaped normal curve over them' }),
            ),
            ask('dist-approx-sum'),
            ask('dist-approx-peak'),
            ask('dist-approx-bars'),
            teach(
              prose('Far from a half the bars pile up against one end and trail off in a long tail to the other. $B(20, 0.1)$ has its mean at $2$ and is skewed to the right:'),
              bars(20, 0.1, { from: 0, to: 12, label: 'The bars of B(20, 0.1), piled up near 0 with a long tail to the right' }),
              prose('No bell fits bars like these.'),
            ),
            ask('dist-approx-skew'),
            ask('dist-approx-sum', 2),
            ask('dist-approx-bars', 2),
            teach(
              prose('The more trials, the closer the bars come to a bell, even for a $p$ some way from a half. The next lesson makes "large enough" exact.'),
            ),
            ask('dist-approx-skew', 2),
            ask('dist-approx-peak', 2),
          ],
          skillCheck: [ask('dist-approx-sum', 2), ask('dist-approx-bars', 2), ask('dist-approx-peak', 2)],
        },
        {
          id: 'bn-l4-allowed',
          title: 'When It Is Allowed',
          slides: [
            teach(
              prose('A normal curve approximates $X \\sim B(n, p)$ well when $n$ is large and $p$ is not too close to $0$ or $1$. The usual test:'),
              maths('np > 5 \\quad \\text{and} \\quad n(1 - p) > 5'),
              prose('$np$ is the mean number of successes and $n(1 - p)$ the mean number of failures: both need room to spread out on either side.'),
            ),
            ask('dist-approx-valid'),
            ask('dist-approx-products'),
            ask('dist-approx-which-valid'),
            teach(
              prose('$X \\sim B(40, 0.1)$:'),
              working('np &= 40 \\times 0.1 = 4', 'n(1 - p) &= 40 \\times 0.9 = 36'),
              prose('$np$ is not above $5$, so the bars pile up against $0$ and the approximation is poor. Exactly $5$ fails too: the test is **above** $5$.'),
            ),
            ask('dist-approx-min-n'),
            ask('dist-approx-valid', 2),
            ask('dist-approx-products', 2),
            teach(
              prose('For the smallest $n$ that works, take the smaller of $p$ and $1 - p$: $n$ times it must clear $5$. With $p = 0.2$, $n \\times 0.2 > 5$ needs $n > 25$, so $n = 26$.'),
            ),
            ask('dist-approx-which-valid', 2),
            ask('dist-approx-min-n', 2),
          ],
          skillCheck: [ask('dist-approx-valid', 2), ask('dist-approx-which-valid', 2), ask('dist-approx-products', 2)],
        },
        {
          id: 'bn-l4-matching',
          title: 'The Matching Normal',
          slides: [
            teach(
              prose('The approximating normal has the same mean and the same variance as the binomial. For $X \\sim B(n, p)$:'),
              working('\\mu &= np', '\\sigma^2 &= np(1 - p)'),
              prose('so $X$ is approximated by'),
              maths('Y \\sim N(np, np(1 - p))'),
            ),
            ask('dist-approx-param'),
            ask('dist-approx-normal'),
            ask('dist-approx-moments-tree'),
            teach(
              prose('$X \\sim B(100, 0.2)$:'),
              working('\\mu &= 100 \\times 0.2 = 20', '\\sigma^2 &= 20 \\times 0.8 = 16', '\\sigma &= \\sqrt{16} = 4'),
              prose('So $Y \\sim N(20, 16)$. The second number is the variance, as always for a normal distribution.'),
            ),
            ask('dist-approx-build'),
            ask('dist-approx-param', 2),
            ask('dist-approx-normal', 2),
            teach(
              prose('Standardising divides by $\\sigma$, not by the variance, so take the square root before going on.'),
            ),
            ask('dist-approx-moments-tree', 2),
            ask('dist-approx-build', 2),
          ],
          skillCheck: [ask('dist-approx-param', 2), ask('dist-approx-normal', 2), ask('dist-approx-build', 2)],
        },
        {
          id: 'bn-l4-correction',
          title: 'The Continuity Correction',
          slides: [
            teach(
              prose('$X$ takes whole values and $Y$ is continuous. The bar for $X = r$ covers $Y$ from $r - 0.5$ to $r + 0.5$, so a whole bar is taken in or left out:'),
              bars(20, 0.5, {
                from: 4,
                to: 16,
                curve: true,
                shade: [4, 12],
                boundary: 12.5,
                label: 'Bars up to 12 shaded, with the curve cut at 12.5, the end of the bar at 12',
              }),
              table(['\\text{bars}', '\\text{curve}'], [
                ['X \\le r', 'Y < r + 0.5'],
                ['X \\ge r', 'Y > r - 0.5'],
              ]),
            ),
            ask('dist-cc-choice'),
            ask('dist-cc-line'),
            ask('dist-cc-boundary'),
            teach(
              prose('Turn words into whole numbers first. Fewer than $r$ is $X \\le r - 1$, so $Y < r - 0.5$; more than $r$ is $X \\ge r + 1$, so $Y > r + 0.5$.'),
              prose('Exactly $r$ is one whole bar, and a range runs from the start of its first bar to the end of its last:'),
              working('& P(X = r)', '&\\approx P(r - 0.5 < Y < r + 0.5)', '& P(a \\le X \\le b)', '&\\approx P(a - 0.5 < Y < b + 0.5)'),
            ),
            ask('dist-cc-flow'),
            ask('dist-cc-choice', 2),
            ask('dist-cc-line', 2),
            teach(
              prose('To check a correction, ask which bars are in: the boundary sits half a unit past the last bar in, never through the middle of one.'),
            ),
            ask('dist-cc-boundary', 2),
            ask('dist-cc-flow', 2),
          ],
          skillCheck: [ask('dist-cc-choice', 2), ask('dist-cc-line', 2), ask('dist-cc-boundary', 2)],
        },
        {
          id: 'bn-l4-route',
          title: 'The Whole Route',
          slides: [
            teach(
              prose('To approximate a binomial probability:'),
              prose('**1.** Check $np$ and $n(1 - p)$ are both above $5$. **2.** Write $Y \\sim N(np, np(1 - p))$ and find $\\sigma$. **3.** Apply the continuity correction. **4.** Standardise the boundary. **5.** Read $\\Phi$, taking the complement or a difference as needed.'),
            ),
            ask('dist-approx-plan'),
            ask('dist-approx-route-tree'),
            ask('dist-approx-prob'),
            teach(
              prose('$X \\sim B(100, 0.5)$: find $P(X \\le 45)$. Here $\\mu = 50$ and $\\sigma = 5$, and $\\Phi(0.9) = 0.8159$.'),
              working('P(X \\le 45) &\\approx P(Y < 45.5)', 'z &= \\frac{45.5 - 50}{5}', '&= -0.9', 'P(Z < -0.9) &= 1 - 0.8159', '&= 0.1841'),
            ),
            ask('dist-approx-standardise-steps'),
            ask('dist-approx-prob+choice'),
            ask('dist-approx-route-tree', 2),
            teach(
              prose('For exactly $r$, or a range, take one area from another. $P(X = 50) \\approx P(49.5 < Y < 50.5)$, where $z = \\pm 0.1$ and $\\Phi(0.1) = 0.5398$:'),
              working('& \\Phi(0.1) - (1 - \\Phi(0.1))', '&= 0.5398 - 0.4602', '&= 0.0796'),
            ),
            ask('dist-approx-plan', 2),
            ask('dist-approx-standardise-steps', 2),
          ],
          skillCheck: [ask('dist-approx-prob', 2), ask('dist-approx-route-tree', 2), ask('dist-approx-standardise-steps', 2)],
        },
      ],
      levelCheck: [
        ask('dist-approx-sum', 2),
        ask('dist-approx-bars', 2),
        ask('dist-approx-peak', 2),
        ask('dist-approx-valid', 2),
        ask('dist-approx-which-valid', 2),
        ask('dist-approx-min-n', 2),
        ask('dist-approx-param', 2),
        ask('dist-approx-normal', 2),
        ask('dist-approx-build', 2),
        ask('dist-cc-choice', 2),
        ask('dist-cc-line', 2),
        ask('dist-cc-boundary', 2),
        ask('dist-approx-prob', 2),
        ask('dist-approx-route-tree', 2),
        ask('dist-approx-standardise-steps', 2),
      ],
    },
    {
      id: 'bn-l5',
      title: 'Sums and Differences of Independent Normals',
      lessons: [
        {
          id: 'bn-l5-linear',
          title: 'Scaling and Shifting: aX + b',
          slides: [
            teach(
              prose('$X \\sim N(\\mu, \\sigma^2)$ and $W = aX + b$: every value of $X$ is multiplied by $a$, then moved by $b$. $W$ is normal too, with'),
              working('\\mathrm{E}(aX + b) &= a\\mathrm{E}(X) + b', '\\mathrm{Var}(aX + b) &= a^2\\,\\mathrm{Var}(X)'),
              prose('Adding $b$ slides the curve along and leaves its spread alone. Multiplying by $a$ stretches every distance from the mean by $a$, so $\\sigma$ is multiplied by $|a|$ and the variance by $a^2$.'),
            ),
            ask('dist-lin-moment'),
            ask('dist-lin-normal'),
            ask('dist-lin-spread-tree'),
            teach(
              prose('$X \\sim N(20, 9)$ and $W = 3X + 5$:'),
              working('\\mathrm{E}(W) &= 3 \\times 20 + 5 = 65', '\\mathrm{Var}(W) &= 3^2 \\times 9 = 81', '\\sigma_W &= \\sqrt{81} = 9'),
              prose('So $W \\sim N(65, 81)$: $\\sigma$ went from $3$ to $9$, three times as wide, and the $5$ played no part in it.'),
            ),
            ask('dist-lin-effect-flow'),
            ask('dist-lin-moment', 2),
            ask('dist-lin-normal', 2),
            teach(
              prose('A negative $a$ flips the curve over as well as stretching it. The variance still takes $a^2$, which is positive, and $\\sigma$ takes $|a|$: a spread is never negative.'),
            ),
            ask('dist-lin-spread-tree', 2),
            ask('dist-lin-effect-flow', 2),
          ],
          skillCheck: [ask('dist-lin-moment', 2), ask('dist-lin-normal', 2), ask('dist-lin-spread-tree', 2)],
        },
        {
          id: 'bn-l5-sum',
          title: 'X + Y and X − Y',
          slides: [
            teach(
              prose('For **independent** $X$ and $Y$ (Probability level 2, Independent Events), a sum or a difference of normals is normal, with'),
              working('\\mathrm{E}(X \\pm Y) &= \\mathrm{E}(X)', '&\\quad \\pm \\mathrm{E}(Y)', '\\mathrm{Var}(X \\pm Y) &= \\mathrm{Var}(X)', '&\\quad + \\mathrm{Var}(Y)'),
              prose('The means follow the sign. The variances **always add**.'),
            ),
            ask('dist-sum-moment'),
            ask('dist-sum-normal'),
            ask('dist-sum-table'),
            teach(
              prose('Why not $\\mathrm{Var}(X) - \\mathrm{Var}(Y)$? Taking $Y$ away does not take its uncertainty away. $X - Y$ is $X + (-1)Y$, and $(-1)^2 = 1$, so $\\mathrm{Var}(Y)$ is added.'),
              prose('If variances subtracted, two variables with the same spread would leave $X - Y$ with no spread at all, and that cannot be right.'),
            ),
            ask('dist-sum-var-tiles'),
            ask('dist-sum-moment+choice', 2),
            ask('dist-sum-normal', 2),
            teach(
              prose("An apple's mass is $X \\sim N(160, 36)$ and an orange's is $Y \\sim N(190, 64)$, in grams, independently:"),
              working('\\mathrm{E}(X - Y) &= 160 - 190', '&= -30', '\\mathrm{Var}(X - Y) &= 36 + 64', '&= 100'),
              prose('So $X - Y \\sim N(-30, 100)$, with $\\sigma = 10$.'),
            ),
            ask('dist-sum-table', 2),
            ask('dist-sum-var-tiles', 2),
          ],
          skillCheck: [ask('dist-sum-moment', 2), ask('dist-sum-normal', 2), ask('dist-sum-var-tiles', 2)],
        },
        {
          id: 'bn-l5-combination',
          title: 'aX + bY in General',
          slides: [
            teach(
              prose('Scale each variable first, then combine. For independent normals $X$ and $Y$:'),
              working('\\mathrm{E}(aX + bY) &= a\\mathrm{E}(X)', '&\\quad + b\\mathrm{E}(Y)', '\\mathrm{Var}(aX + bY) &= a^2\\,\\mathrm{Var}(X)', '&\\quad + b^2\\,\\mathrm{Var}(Y)'),
              prose('and $aX + bY$ is normal. A negative $b$ still adds its variance, since $b^2$ is positive, and a constant on the end moves only the mean.'),
            ),
            ask('dist-combo-moment'),
            ask('dist-combo-normal'),
            ask('dist-combo-var-steps'),
            teach(
              prose('$X \\sim N(30, 9)$ and $Y \\sim N(20, 16)$ are independent, and $W = 2X - 2Y + 5$:'),
              working('\\mathrm{E}(W) &= 2 \\times 30', '&\\quad - 2 \\times 20 + 5', '&= 25', '\\mathrm{Var}(W) &= 2^2 \\times 9', '&\\quad + (-2)^2 \\times 16', '&= 100'),
              prose('So $W \\sim N(25, 100)$, and $\\sigma_W = 10$.'),
            ),
            ask('dist-combo-build'),
            ask('dist-combo-moment+choice', 2),
            ask('dist-combo-normal', 2),
            teach(
              prose('Check the second number: $N(\\mu, \\sigma^2)$ holds the variance. Writing $\\sigma$ there, or $a\\,\\mathrm{Var}(X)$ without squaring the $a$, are the two usual slips.'),
            ),
            ask('dist-combo-var-steps', 2),
            ask('dist-combo-build', 2),
          ],
          skillCheck: [ask('dist-combo-moment', 2), ask('dist-combo-normal', 2), ask('dist-combo-build', 2)],
        },
        {
          id: 'bn-l5-totals',
          title: 'A Total of n Copies',
          slides: [
            teach(
              prose('A box holds four bags of flour, each $N(1000, 25)$ in grams, independently. Their total is four separate masses:'),
              maths('T = X_1 + X_2 + X_3 + X_4'),
              working('\\mathrm{E}(T) &= 4 \\times 1000 = 4000', '\\mathrm{Var}(T) &= 25 + 25 + 25 + 25', '&= 4 \\times 25 = 100'),
            ),
            ask('dist-total-moment'),
            ask('dist-total-normal'),
            ask('dist-total-table'),
            teach(
              prose('One bag weighed once, with the reading multiplied by $4$, is $4X$, and that is different: every error in the one reading is multiplied by $4$ too.'),
              working('\\mathrm{Var}(4X) &= 4^2 \\times 25 = 400'),
              prose('Four separate bags have errors that partly cancel, so $4\\sigma^2$ is less than $16\\sigma^2$. The means are both $4\\mu$.'),
            ),
            ask('dist-total-flow'),
            ask('dist-total-moment+choice', 2),
            ask('dist-total-normal', 2),
            teach(
              prose('Ask whether the $n$ values are separate. A total of $n$ copies has variance $n\\sigma^2$ and standard deviation $\\sigma\\sqrt{n}$; one value multiplied by $n$ has $n^2\\sigma^2$ and $n\\sigma$.'),
            ),
            ask('dist-total-table', 2),
            ask('dist-total-flow', 2),
          ],
          skillCheck: [ask('dist-total-moment', 2), ask('dist-total-normal', 2), ask('dist-total-flow', 2)],
        },
        {
          id: 'bn-l5-probability',
          title: 'A Probability from the Combination',
          slides: [
            teach(
              prose('Once a combination has its normal, a probability is found as in level 2: standardise with its own mean and $\\sigma$, then read $\\Phi$.'),
              prose('$X \\sim N(40, 9)$ and $Y \\sim N(30, 16)$ are independent, so $X + Y \\sim N(70, 25)$ and $\\sigma = 5$. With $\\Phi(1) = 0.8413$:'),
              working('z &= \\frac{75 - 70}{5} = 1', '& P(X + Y > 75)', '&= 1 - \\Phi(1)', '&= 0.1587'),
            ),
            ask('dist-combo-prob'),
            ask('dist-diff-plan'),
            ask('dist-bigger-prob'),
            teach(
              prose('Which is bigger? $P(X > Y)$ is $P(X - Y > 0)$. Let $D = X - Y$, find its normal, and standardise $0$.'),
              prose("An apple's mass is $X \\sim N(160, 36)$ and an orange's is $Y \\sim N(170, 64)$. Then $D \\sim N(-10, 100)$ and $\\sigma_D = 10$:"),
              working('z &= \\frac{0 - (-10)}{10} = 1', 'P(D > 0) &= 1 - \\Phi(1)', '&= 0.1587'),
            ),
            ask('dist-diff-route-tree'),
            ask('dist-combo-prob+choice', 2),
            ask('dist-bigger-prob', 2),
            teach(
              prose('Check the side: when $\\mathrm{E}(D)$ is below $0$, $P(D > 0)$ is under a half, and when it is above $0$, over a half. The mean of a sample, $\\bar{X}$, is a total divided by $n$, and it is the next level.'),
            ),
            ask('dist-diff-plan', 2),
            ask('dist-diff-route-tree', 2),
          ],
          skillCheck: [ask('dist-combo-prob', 2), ask('dist-bigger-prob', 2), ask('dist-diff-route-tree', 2)],
        },
      ],
      levelCheck: [
        ask('dist-lin-moment', 2),
        ask('dist-lin-normal', 2),
        ask('dist-lin-effect-flow', 2),
        ask('dist-sum-moment', 2),
        ask('dist-sum-var-tiles', 2),
        ask('dist-sum-table', 2),
        ask('dist-combo-moment', 2),
        ask('dist-combo-var-steps', 2),
        ask('dist-combo-build', 2),
        ask('dist-total-moment', 2),
        ask('dist-total-table', 2),
        ask('dist-total-flow', 2),
        ask('dist-combo-prob', 2),
        ask('dist-bigger-prob', 2),
        ask('dist-diff-route-tree', 2),
      ],
    },
  ],
};
