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
 * and a probability from the combination, P(X > Y) among them. Level 6 is
 * the distribution of the sample mean: a total divided by n, Xbar ~ N(mu,
 * sigma^2 / n) with standard deviation sigma / sqrt(n), how that spread
 * shrinks with n, a probability for a sample mean, and working back to a
 * value or to the smallest n. Hypothesis Testing level 2 quotes the result
 * and tests with it; this level derives it and stops at the probability.
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
import { barsSvg, normalSvg, sampleMeanSvg } from '../generators/binomialNormal';

const teach = (...blocks: Block[]): SlideRef => ({
  type: 'literal',
  slide: { kind: 'teach', body: blocks },
});

const ask = (generatorId: string, difficulty = 1): SlideRef => ({
  type: 'generated',
  generatorId,
  difficulty,
});

/**
 * A question with a worked example set above it, on the same slide, so the
 * technique it asks is shown with numbers just before it is asked.
 */
const asking = (generatorId: string, difficulty: number, ...lead: Block[]): SlideRef => ({
  type: 'generated',
  generatorId,
  difficulty,
  leadIn: lead,
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

/** One value of X dashed, and the mean of each sample size in `ns` over it. */
const means = (mu: number, sigma: number, ns: number[], label: string): Block => ({ kind: 'diagram', svg: sampleMeanSvg(mu, sigma, ns, label) });

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
            asking(
              'dist-trials',
              1,
              prose('Trials can come in groups. $6$ matches with $4$ penalties in each is $6 \\times 4 = 24$ penalties, and every penalty is a trial, so $n = 24$.'),
            ),
            teach(
              prose('Where it breaks, one example for each condition:'),
              prose('**1.** A coin is tossed **until** it lands heads. The number of tosses is not fixed in advance, so condition 1 fails.'),
              prose('**2.** A dice is rolled $5$ times and $X$ is the total score. Each roll has six outcomes that all count, not a success or a failure, so condition 2 fails.'),
              prose('**3.** Counters are taken **without replacement** from $3$ red and $2$ blue. The first is red with chance $\\frac{3}{5}$; after a red, the next is red with chance $\\frac{2}{4}$. $p$ changes, so condition 3 fails.'),
              prose('**4.** Friends who always decide together: one going tells you the others go, so condition 4 fails. The Probability course has more on independence.'),
            ),
            ask('dist-binomial-which-fails'),
            ask('dist-binomial-conditions-flow', 2),
            asking(
              'dist-binomial-name',
              2,
              prose('A fair dice is rolled $10$ times. If $X$ counts the rolls that are **not** a six, the "success" it counts has probability $1 - \\frac{1}{6} = \\frac{5}{6}$, so $X \\sim B(10, \\frac{5}{6})$.'),
            ),
            teach(
              prose('Sometimes $p$ has to be read off the description. $7$ red and $13$ blue counters, each put back after it is drawn: $p = \\frac{7}{20} = 0.35$, the same on every draw.'),
              prose('$15\\%$ of bolts are faulty: $p = \\frac{15}{100} = 0.15$.'),
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
              prose('One order has probability $p^r (1 - p)^{n - r}$, and there are $\\tbinom{n}{r}$ orders (that is ${}^{n}C_{r}$, from Binomial Expansion, nCr and the General Term).'),
              maths('P(X = r) = \\tbinom{n}{r} p^r (1 - p)^{n - r}'),
              prose('$X \\sim B(4, 0.3)$: $P(X = 2)$ is $2$ successes and $2$ failures, in $\\tbinom{4}{2} = 6$ orders.'),
              working('& P(X = 2)', '&= \\tbinom{4}{2} \\times 0.3^2 \\times 0.7^2', '&= 6 \\times 0.09 \\times 0.49', '&= 0.2646'),
            ),
            ask('dist-pmf-factors'),
            ask('dist-pmf-form'),
            ask('dist-pmf'),
            teach(
              prose('Check the powers add up to $n$: the successes and the failures between them are every trial. And the power of $p$ always matches the $r$ in $\\tbinom{n}{r}$.'),
              prose('$X \\sim B(5, 0.2)$ and $P(X = 3)$: powers $3$ and $2$, which add up to $5$.'),
              working('& P(X = 3)', '&= \\tbinom{5}{3} \\times 0.2^3 \\times 0.8^2', '&= 10 \\times 0.008 \\times 0.64', '&= 0.0512'),
            ),
            ask('dist-pmf-working'),
            ask('dist-pmf+choice'),
            ask('dist-pmf-factors', 2),
            teach(
              prose('No successes at all is a single order, since $\\tbinom{n}{0} = 1$, so only the failures are left:'),
              working('P(X = 0) &= (1 - p)^n', '&= 0.7^4 = 0.2401', '&\\text{for } B(4, 0.3)'),
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
            asking(
              'dist-cumulative',
              1,
              prose('A cumulative probability adds up the table from the top: $P(X \\le r)$ is everything from $0$ to $r$. For $B(3, 0.3)$:'),
              working('P(X \\le 1) &= P(X = 0)', '&\\quad + P(X = 1)', '&= 0.343 + 0.441', '&= 0.784'),
              prose('Fewer than $2$ is the same event: $P(X < 2) = P(X \\le 1)$.'),
            ),
            ask('dist-cumulative-parts'),
            teach(
              prose('A missing value in a table needs no formula: the probabilities add up to $1$, so take the others away from $1$. With $P(X = 2)$ hidden in the $B(3, 0.3)$ table:'),
              working('\\text{the rest} &= 0.343 + 0.441', '&\\quad + 0.027 = 0.811', 'P(X = 2) &= 1 - 0.811', '&= 0.189'),
            ),
            ask('dist-table-missing'),
            ask('dist-cumulative+choice'),
            ask('dist-cumulative-parts', 2),
            teach(
              prose('The running totals can go in the table too. For $B(3, 0.3)$ each is the one above plus the next $P(X = r)$, and the last is always $1$:'),
              table(['r', 'P(X \\le r)'], [
                ['0', '0.343'],
                ['1', '0.784'],
                ['2', '0.973'],
                ['3', '1'],
              ]),
            ),
            ask('dist-table-fill', 2),
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
            asking(
              'dist-at-least',
              1,
              prose('$X \\sim B(5, 0.2)$. At least $2$ is everything except $X = 0$ and $X = 1$:'),
              working('P(X = 0) &= 0.8^5 = 0.32768', 'P(X = 1) &= 5 \\times 0.2 \\times 0.8^4', '&= 0.4096', 'P(X \\le 1) &= 0.32768 + 0.4096', '&= 0.73728', 'P(X \\ge 2) &= 1 - 0.73728', '&= 0.26272'),
            ),
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
              prose('For $X \\sim B(6, 0.3)$: $1 - 0.7^6 = 1 - 0.117649 = 0.882351$.'),
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
              prose('The variance measures the spread (the Data course has it for a list of numbers). For a binomial distribution it is'),
              maths('\\mathrm{Var}(X) = np(1 - p)'),
              prose('$X \\sim B(20, 0.3)$ has variance $6 \\times 0.7 = 4.2$, and standard deviation $\\sqrt{4.2}$.'),
            ),
            ask('dist-mean-variance'),
            ask('dist-mean-form'),
            ask('dist-spread-parts'),
            teach(
              prose('Given the mean and the variance, divide one by the other: $\\frac{np(1 - p)}{np} = 1 - p$. That gives $p$, and then $n$ from $np$. Mean $6$ and variance $4.2$:'),
              working('1 - p &= \\frac{4.2}{6} = 0.7', 'p &= 0.3', 'n &= \\frac{6}{0.3} = 20'),
            ),
            ask('dist-match-moments'),
            ask('dist-mean-variance', 2),
            ask('dist-mean-form', 2),
            teach(
              prose('A quick check: the variance $np(1 - p)$ is always smaller than the mean $np$, because $1 - p$ is less than $1$. For $B(20, 0.3)$, $4.2$ is less than $6$.'),
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
            teach(
              prose('The area under the curve is the probability, and the whole area is $1$. Whatever $\\mu$ and $\\sigma$ are:'),
              curve([-1, 1], [-2, -1, 1, 2], 'A normal curve with the middle, within one standard deviation of the mean, shaded'),
              prose('About **68%** lies within $1$ standard deviation of the mean, **95%** within $2$ and **99.7%** within $3$.'),
              prose('The rest splits equally between the two tails. Outside $1$ standard deviation is $100 - 68 = 32\\%$, so $16\\%$ lies above $\\mu + \\sigma$ and $16\\%$ below $\\mu - \\sigma$. Outside $2$ is $5\\%$: $2.5\\%$ in each tail.'),
            ),
            asking(
              'dist-rule-slider',
              1,
              prose('Heights are $N(170, 100)$, so $\\sigma = 10$. $99.7\\%$ lie within $3$ standard deviations, leaving $0.3\\%$ outside: $0.15\\%$ in each tail. So $0.15\\%$ lie below $170 - 3 \\times 10 = 140$.'),
            ),
            asking(
              'dist-rule-percent',
              1,
              prose('Between $\\mu$ and $\\mu + 2\\sigma$: $2.5\\%$ lies above $\\mu + 2\\sigma$, so $97.5\\%$ lies below it, and $50\\%$ lies below $\\mu$. That leaves $97.5 - 50 = 47.5\\%$ between them.'),
            ),
            ask('dist-rule-flow'),
            teach(
              prose('Every step of the rule, as the percentage lying **below** each point:'),
              table(['\\text{point}', '\\%\\text{ below}'], [
                ['\\mu - 3\\sigma', '0.15'],
                ['\\mu - 2\\sigma', '2.5'],
                ['\\mu - \\sigma', '16'],
                ['\\mu', '50'],
                ['\\mu + \\sigma', '84'],
                ['\\mu + 2\\sigma', '97.5'],
                ['\\mu + 3\\sigma', '99.85'],
              ]),
              prose('Between two points is one take away the other: from $\\mu - \\sigma$ to $\\mu + 2\\sigma$ is $97.5 - 16 = 81.5\\%$.'),
            ),
            ask('dist-normal-notation', 2),
            ask('dist-rule-slider', 2),
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
            asking(
              'dist-z-score',
              1,
              prose('$X \\sim N(50, 16)$ has $\\sigma = \\sqrt{16} = 4$, not $16$. A value below the mean has a negative $z$:'),
              working('z &= \\frac{56 - 50}{4} = \\frac{6}{4} = 1.5', 'z &= \\frac{44 - 50}{4} = \\frac{-6}{4} = -1.5'),
            ),
            ask('dist-z-form'),
            ask('dist-z-parts'),
            teach(
              prose('Reading it backwards, $z = \\frac{x - \\mu}{\\sigma}$ rearranges to $x = \\mu + z\\sigma$. For $X \\sim N(50, 16)$ and $z = 1.5$:'),
              working('x &= 50 + 1.5 \\times 4', '&= 50 + 6 = 56'),
            ),
            ask('dist-z-working'),
            asking(
              'dist-z-compare',
              1,
              prose('$z$ also compares results on different scales: the larger $z$ is further above its own mean, and so the better result against everyone else. $70$ in Maths, marked $N(60, 25)$, against $75$ in English, marked $N(65, 100)$:'),
              working('\\text{Maths: } z &= \\frac{70 - 60}{5} = 2', '\\text{English: } z &= \\frac{75 - 65}{10} = 1'),
              prose('Maths has the larger $z$, so it is the better result.'),
            ),
            ask('dist-z-score+choice'),
            teach(
              prose('A negative $z$ lands below the mean. For $X \\sim N(46, 16)$ and $z = -2$:'),
              working('x &= 46 + (-2) \\times 4', '&= 46 - 8 = 38'),
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
            asking(
              'dist-tail-flow',
              1,
              prose('Above is what is left: $P(Z > z) = 1 - \\Phi(z)$. Below a negative $z$, use symmetry: the tail below $-z$ matches the tail above $z$. With $\\Phi(1.5) = 0.9332$:'),
              working('P(Z > 1.5) &= 1 - 0.9332', '&= 0.0668', 'P(Z < -1.5) &= P(Z > 1.5)', '&= 0.0668', 'P(Z > -1.5) &= 1 - 0.0668', '&= 0.9332'),
            ),
            ask('dist-normal-prob'),
            ask('dist-normal-table'),
            teach(
              prose('Between two values: the area below the top one, take away the area below the bottom one. With $\\Phi(0.5) = 0.6915$ and $\\Phi(1.5) = 0.9332$:'),
              working('& P(0.5 < Z < 1.5)', '&= 0.9332 - 0.6915', '&= 0.2417'),
              prose('A negative bottom end is found by symmetry first, $P(Z < -0.5) = 1 - 0.6915 = 0.3085$:'),
              working('& P(-0.5 < Z < 1.5)', '&= 0.9332 - 0.3085', '&= 0.6247'),
            ),
            ask('dist-normal-between-form'),
            ask('dist-tail-flow', 2),
            ask('dist-normal-table', 2),
            teach(
              prose('Both ends below the mean: both areas come from symmetry. $P(Z < -0.5) = 0.3085$ and $P(Z < -1.5) = 1 - 0.9332 = 0.0668$:'),
              working('& P(-1.5 < Z < -0.5)', '&= 0.3085 - 0.0668', '&= 0.2417'),
              prose('The same as between $0.5$ and $1.5$: the curve is symmetric.'),
            ),
            ask('dist-normal-prob', 2),
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
            asking(
              'dist-inverse-x',
              1,
              prose('$X \\sim N(60, 25)$, so $\\sigma = 5$, and $P(X > a) = 0.05$. Then $P(X < a) = 0.95$, so $z = 1.645$:'),
              working('a &= \\mu + z\\sigma', '&= 60 + 1.645 \\times 5', '&= 68.225'),
            ),
            ask('dist-inverse-form'),
            teach(
              prose('A lower tail gives a negative $z$ by symmetry. $X \\sim N(60, 25)$ and $P(X < a) = 0.05$ puts $a$ at $z = -1.645$:'),
              working('a &= 60 + (-1.645) \\times 5', '&= 51.775'),
              prose('So the middle $90\\%$, which leaves $0.05$ in each tail, runs from $51.775$ to $68.225$.'),
            ),
            ask('dist-inverse-slider'),
            ask('dist-inverse-parts'),
            ask('dist-inverse-x', 2),
            teach(
              prose('The middle $95\\%$ leaves $2.5\\%$ in each tail, so it runs from $z = -1.96$ to $z = 1.96$. For $X \\sim N(60, 25)$:'),
              working('60 - 1.96 \\times 5 &= 50.2', '60 + 1.96 \\times 5 &= 69.8'),
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
              prose('and solve that equation for whichever is missing. $X \\sim N(\\mu, 16)$ and $P(X > 62) = 0.0668$, so $P(X < 62) = 0.9332 = \\Phi(1.5)$ and $z = 1.5$:'),
              working('\\frac{62 - \\mu}{4} &= 1.5', '\\mu &= 62 - 1.5 \\times 4', '&= 56'),
            ),
            ask('dist-find-equation'),
            ask('dist-find-parameter'),
            ask('dist-find-working'),
            teach(
              prose('Check the sign: $P(X < x)$ more than a half puts $x$ above the mean, so $z$ is positive; less than a half puts it below, so $z$ is negative.'),
              prose('For $\\sigma$: $X \\sim N(50, \\sigma^2)$ and $P(X < 42) = 0.0228$. That is under a half, and $1 - 0.0228 = 0.9772 = \\Phi(2)$, so $z = -2$:'),
              working('\\frac{42 - 50}{\\sigma} &= -2', '\\sigma &= \\frac{-8}{-2} = 4'),
            ),
            ask('dist-find-choice'),
            ask('dist-find-parameter', 2),
            ask('dist-find-equation', 2),
            teach(
              prose('For $\\mu$ with a negative $z$: $X \\sim N(\\mu, 16)$ and $P(X > 44) = 0.9772$. Then $P(X < 44) = 0.0228$, under a half, so $z = -2$:'),
              working('\\frac{44 - \\mu}{4} &= -2', '\\mu &= 44 - (-2) \\times 4', '&= 52'),
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
              prose('In The Normal Distribution one probability was enough, because only one of $\\mu$ and $\\sigma$ was missing. Standardising gave one equation, and one equation fixes one unknown:'),
              maths('\\frac{x - \\mu}{\\sigma} = z'),
              prose('With both missing, that same equation has two unknowns in it.'),
            ),
            ask('dist-find-equation', 2),
            asking(
              'dist-both-sign-flow',
              1,
              prose('The sign of $z$ comes from the side of the mean, as before. $P(X < 41) = 0.0228$ is under a half, so $41$ is below the mean. With $\\Phi(2) = 0.9772$:'),
              working('1 - 0.9772 &= 0.0228', 'z &= -2', '\\frac{41 - \\mu}{\\sigma} &= -2'),
            ),
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
              prose('An upper tail is turned round first. $P(X > 90) = 0.05$ means $P(X < 90) = 0.95 = \\Phi(1.645)$, over a half, so $z = 1.645$:'),
              maths('\\frac{90 - \\mu}{\\sigma} = 1.645'),
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
            asking(
              'dist-both-pair',
              1,
              prose('$P(X > 30) = 0.8413$ is over a half, so take two steps. The complement: $P(X < 30) = 1 - 0.8413 = 0.1587$. That is under a half, so $30$ is below the mean, and by symmetry $0.1587 = 1 - \\Phi(1)$:'),
              working('z &= -1', '30 &= \\mu - \\sigma'),
            ),
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
              prose('A proportion is a probability written as a percentage. "$6.68\\%$ of bags weigh less than $495$ grams, and $15.87\\%$ more than $520$ grams" means $P(X < 495) = 0.0668$ and $P(X > 520) = 0.1587$.'),
              prose('The tails are not equal, so the midpoint shortcut is out: use both equations. With $\\Phi(1.5) = 0.9332$ and $\\Phi(1) = 0.8413$, $z = -1.5$ at $495$ and $z = 1$ at $520$:'),
              working('520 &= \\mu + \\sigma', '495 &= \\mu - 1.5\\sigma', '25 &= 2.5\\sigma'),
              prose('So $\\sigma = 10$, and $\\mu = 520 - 10 = 510$.'),
            ),
            ask('dist-both-proportion'),
            ask('dist-both-symmetric+choice', 2),
            ask('dist-both-midpoint-slider', 2),
            teach(
              prose('Equal tails can be written either way round. $P(X > 15) = 0.8413$ means $P(X < 15) = 0.1587$, the same size as $P(X > 19) = 0.1587$. So $\\mu = \\frac{15 + 19}{2} = 17$, and with $\\Phi(1) = 0.8413$ half the gap, $2$, is $1$ standard deviation: $\\sigma = 2$.'),
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
            teach(
              prose('Once both are found it is an ordinary normal distribution, and any other probability follows. With $\\mu = 71$, $\\sigma = 20$ and $\\Phi(1) = 0.8413$:'),
              working('z &= \\frac{91 - 71}{20} = 1', 'P(X > 91) &= P(Z > 1)', '&= 1 - 0.8413', '&= 0.1587'),
            ),
            ask('dist-both-new-prob'),
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
            asking(
              'dist-approx-min-n',
              1,
              prose('For the smallest $n$ that works, take the smaller of $p$ and $1 - p$: $n$ times it must clear $5$. With $p = 0.2$:'),
              working('n \\times 0.2 &> 5', 'n &> \\frac{5}{0.2} = 25'),
              prose('$n = 25$ gives exactly $5$, which fails, so the smallest is $n = 26$.'),
            ),
            ask('dist-approx-valid', 2),
            ask('dist-approx-products', 2),
            teach(
              prose('When $p$ is above a half, the failures are the scarce ones. With $p = 0.9$, $1 - p = 0.1$ is the smaller: $n \\times 0.1 > 5$ needs $n > 50$, so $n = 51$.'),
              prose('When the division is not whole, round up: with $p = 0.45$, $\\frac{5}{0.45} = 11.1\\ldots$, so $n = 12$, and $12 \\times 0.45 = 5.4$ clears $5$.'),
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
            teach(
              prose('$X \\sim B(100, 0.5)$: find $P(X \\le 45)$. $np = 50$ and $n(1 - p) = 50$ are both above $5$. $\\mu = 50$, $\\sigma^2 = 50 \\times 0.5 = 25$, so $\\sigma = 5$, and $\\Phi(0.9) = 0.8159$.'),
              working('P(X \\le 45) &\\approx P(Y < 45.5)', 'z &= \\frac{45.5 - 50}{5}', '&= -0.9', 'P(Z < -0.9) &= 1 - 0.8159', '&= 0.1841'),
              prose('At least is the other side. $P(X \\ge 55) \\approx P(Y > 54.5)$, and $z = \\frac{54.5 - 50}{5} = 0.9$, so it is $1 - 0.8159 = 0.1841$.'),
            ),
            ask('dist-approx-route-tree'),
            ask('dist-approx-prob'),
            ask('dist-approx-standardise-steps'),
            teach(
              prose('For exactly $r$, or a range, take one area from another. $P(X = 50) \\approx P(49.5 < Y < 50.5)$, where $z = \\pm 0.1$ and $\\Phi(0.1) = 0.5398$:'),
              working('& \\Phi(0.1) - (1 - \\Phi(0.1))', '&= 0.5398 - 0.4602', '&= 0.0796'),
            ),
            ask('dist-approx-prob+choice'),
            ask('dist-approx-route-tree', 2),
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
            asking(
              'dist-lin-moment',
              1,
              prose('$X \\sim N(20, 9)$ and $W = 3X + 5$:'),
              working('\\mathrm{E}(W) &= 3 \\times 20 + 5 = 65', '\\mathrm{Var}(W) &= 3^2 \\times 9 = 81', '\\sigma_W &= \\sqrt{81} = 9'),
              prose('So $W \\sim N(65, 81)$: $\\sigma$ went from $3$ to $9$, three times as wide, and the $5$ played no part in it.'),
            ),
            ask('dist-lin-normal'),
            ask('dist-lin-spread-tree'),
            teach(
              prose('A negative $a$ flips the curve over as well as stretching it. The variance still takes $a^2$, which is positive, and $\\sigma$ takes $|a|$: a spread is never negative. $X \\sim N(20, 9)$ and $W = -2X + 1$:'),
              working('\\mathrm{E}(W) &= -2 \\times 20 + 1 = -39', '\\mathrm{Var}(W) &= (-2)^2 \\times 9 = 36', '\\sigma_W &= \\sqrt{36} = 6'),
            ),
            ask('dist-lin-effect-flow'),
            ask('dist-lin-moment', 2),
            ask('dist-lin-normal', 2),
            teach(
              prose('A change of units is an $aX + b$. A temperature $C \\sim N(20, 9)$ in degrees Celsius is $F = 1.8C + 32$ in Fahrenheit:'),
              working('\\mathrm{E}(F) &= 1.8 \\times 20 + 32 = 68', '\\mathrm{Var}(F) &= 1.8^2 \\times 9 = 29.16', '\\sigma_F &= \\sqrt{29.16} = 5.4'),
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
              prose('For **independent** $X$ and $Y$ (Probability, Independent Events), a sum or a difference of normals is normal, with'),
              working('\\mathrm{E}(X \\pm Y) &= \\mathrm{E}(X)', '&\\quad \\pm \\mathrm{E}(Y)', '\\mathrm{Var}(X \\pm Y) &= \\mathrm{Var}(X)', '&\\quad + \\mathrm{Var}(Y)'),
              prose('The means follow the sign. The variances **always add**.'),
            ),
            asking(
              'dist-sum-moment',
              1,
              prose("An apple's mass is $X \\sim N(160, 36)$ and an orange's is $Y \\sim N(190, 64)$, in grams, independently:"),
              working('\\mathrm{E}(X - Y) &= 160 - 190', '&= -30', '\\mathrm{Var}(X - Y) &= 36 + 64', '&= 100'),
              prose('So $X - Y \\sim N(-30, 100)$, with $\\sigma = 10$.'),
            ),
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
              prose('The apple and the orange together, $X + Y$, have the same variance as their difference:'),
              working('\\mathrm{E}(X + Y) &= 160 + 190', '&= 350', '\\mathrm{Var}(X + Y) &= 36 + 64', '&= 100'),
              prose('So $X + Y \\sim N(350, 100)$ and $X - Y \\sim N(-30, 100)$: only the mean changes.'),
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
            asking(
              'dist-combo-moment',
              1,
              prose('$X \\sim N(30, 9)$ and $Y \\sim N(20, 16)$ are independent, and $W = 2X - 2Y + 5$:'),
              working('\\mathrm{E}(W) &= 2 \\times 30', '&\\quad - 2 \\times 20 + 5', '&= 25', '\\mathrm{Var}(W) &= 2^2 \\times 9', '&\\quad + (-2)^2 \\times 16', '&= 100'),
              prose('So $W \\sim N(25, 100)$, and $\\sigma_W = 10$.'),
            ),
            ask('dist-combo-normal'),
            ask('dist-combo-var-steps'),
            teach(
              prose('Check the second number: $N(\\mu, \\sigma^2)$ holds the variance. $X \\sim N(10, 4)$ and $Y \\sim N(5, 9)$ are independent, and $W = 3X - Y + 2$:'),
              working('\\mathrm{E}(W) &= 3 \\times 10 - 5 + 2', '&= 27', '\\mathrm{Var}(W) &= 3^2 \\times 4', '&\\quad + (-1)^2 \\times 9', '&= 45'),
              prose('The two usual slips: $3 \\times 4 + 9 = 21$ forgets to square the $3$, and $36 - 9 = 27$ takes a variance away.'),
            ),
            ask('dist-combo-build'),
            ask('dist-combo-moment+choice', 2),
            ask('dist-combo-normal', 2),
            teach(
              prose('Standard deviations never combine directly: add the variances, then take the root. In $W = 2X - 2Y + 5$ above, $\\sigma_W = \\sqrt{100} = 10$, not $2 \\times 3 + 2 \\times 4 = 14$.'),
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
            teach(
              prose('One bag weighed once, with the reading multiplied by $4$, is $4X$, and that is different: every error in the one reading is multiplied by $4$ too.'),
              working('\\mathrm{Var}(T) &= 4 \\times 25 = 100', '\\sigma_T &= \\sqrt{100} = 10', '\\mathrm{Var}(4X) &= 4^2 \\times 25 = 400', '\\sigma_{4X} &= \\sqrt{400} = 20'),
              prose('Four separate bags have errors that partly cancel, so $4\\sigma^2$ is less than $16\\sigma^2$. The means are both $4\\mu$.'),
            ),
            ask('dist-total-table'),
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
              prose('Once a combination has its normal, a probability is found as in The Normal Distribution: standardise with its own mean and $\\sigma$, then read $\\Phi$.'),
              prose('$X \\sim N(40, 9)$ and $Y \\sim N(30, 16)$ are independent, so $X + Y \\sim N(70, 25)$ and $\\sigma = 5$. With $\\Phi(1) = 0.8413$:'),
              working('z &= \\frac{75 - 70}{5} = 1', '& P(X + Y > 75)', '&= 1 - \\Phi(1)', '&= 0.1587'),
            ),
            ask('dist-combo-prob'),
            teach(
              prose('Which is bigger? $P(X > Y)$ is $P(X - Y > 0)$. Let $D = X - Y$, find its normal, and standardise $0$.'),
              prose("An apple's mass is $X \\sim N(160, 36)$ and an orange's is $Y \\sim N(170, 64)$. Then $D \\sim N(-10, 100)$ and $\\sigma_D = 10$:"),
              working('z &= \\frac{0 - (-10)}{10} = 1', 'P(D > 0) &= 1 - \\Phi(1)', '&= 0.1587'),
            ),
            ask('dist-diff-plan'),
            ask('dist-bigger-prob'),
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
    {
      id: 'bn-l6',
      title: 'The Distribution of the Sample Mean',
      lessons: [
        {
          id: 'bn-l6-total',
          title: 'A Total Divided by n',
          slides: [
            teach(
              prose('Take a random sample of $n$ values of $X \\sim N(\\mu, \\sigma^2)$ and average them. The mean is the total over $n$:'),
              maths('\\bar{X} = \\frac{X_1 + X_2 + \\dots + X_n}{n} = \\frac{T}{n}'),
              prose('Sums and Differences of Independent Normals gave the total: $\\mathrm{E}(T) = n\\mu$ and $\\mathrm{Var}(T) = n\\sigma^2$. Dividing by $n$ is $aT$ with $a = \\frac{1}{n}$, so the mean is divided by $n$ and the variance by $n^2$:'),
              working('\\mathrm{E}(\\bar{X}) &= \\frac{n\\mu}{n} = \\mu', '\\mathrm{Var}(\\bar{X}) &= \\frac{n\\sigma^2}{n^2} = \\frac{\\sigma^2}{n}'),
            ),
            asking(
              'dist-mean-moment',
              1,
              prose('Bags of flour are $X \\sim N(1000, 100)$ in grams. A sample of $4$ bags has total $T \\sim N(4000, 400)$, so'),
              working('\\mathrm{E}(\\bar{X}) &= \\frac{4000}{4} = 1000', '\\mathrm{Var}(\\bar{X}) &= \\frac{400}{4^2} = 25'),
              prose('The mean of four bags has the same mean as one bag, and a quarter of the variance: $\\frac{100}{4} = 25$.'),
            ),
            ask('dist-mean-from-total-tree'),
            ask('dist-mean-table'),
            teach(
              prose('Why $n^2$ and not $n$? Dividing every value by $n$ shrinks every distance from the mean by $n$, and a variance is a squared distance. So the total\'s $n\\sigma^2$ is divided by $n^2$, which leaves $\\frac{\\sigma^2}{n}$.'),
            ),
            ask('dist-mean-scale-flow'),
            ask('dist-mean-moment+choice', 2),
            ask('dist-mean-from-total-tree', 2),
            teach(
              prose('The same bags, $X \\sim N(1000, 100)$, in a sample of $25$:'),
              working('\\mathrm{Var}(\\bar{X}) &= \\frac{100}{25} = 4', '\\sigma_{\\bar{X}} &= \\sqrt{4} = 2'),
              prose('Twenty-five bags pin the mean down far more tightly than four.'),
            ),
            ask('dist-mean-table', 2),
            ask('dist-mean-scale-flow', 2),
          ],
          skillCheck: [ask('dist-mean-moment', 2), ask('dist-mean-from-total-tree', 2), ask('dist-mean-scale-flow', 2)],
        },
        {
          id: 'bn-l6-normal',
          title: 'N(μ, σ²/n) and σ/√n',
          slides: [
            teach(
              prose('A mean of independent normals is normal too, so'),
              maths('\\bar{X} \\sim N\\left(\\mu, \\frac{\\sigma^2}{n}\\right)'),
              prose('Its standard deviation is the square root of that variance:'),
              maths('\\sigma_{\\bar{X}} = \\frac{\\sigma}{\\sqrt{n}}'),
              prose('Hypothesis Testing, Testing a Mean, quotes this result in its lesson The Sample Mean; this is where it comes from.'),
            ),
            ask('dist-xbar-normal'),
            ask('dist-xbar-build'),
            ask('dist-xbar-sd'),
            teach(
              prose('$X \\sim N(50, 36)$ and $n = 9$:'),
              working('\\mathrm{Var}(\\bar{X}) &= \\frac{36}{9} = 4', '\\sigma_{\\bar{X}} &= \\frac{6}{\\sqrt{9}} = 2'),
              prose('So $\\bar{X} \\sim N(50, 4)$. The bracket holds the variance, $4$, not the standard deviation, $2$.'),
              prose('Working back, $\\sigma = \\sigma_{\\bar{X}} \\sqrt{n}$: from $\\bar{X} \\sim N(50, 4)$ with $n = 9$, $\\sigma = 2 \\times \\sqrt{9} = 6$.'),
            ),
            ask('dist-xbar-slip-flow'),
            ask('dist-xbar-sd+choice', 2),
            ask('dist-xbar-normal', 2),
            teach(
              prose('The usual slip is $\\frac{\\sigma}{n}$. That divides the standard deviation by $n$, which is the variance divided by $n^2$: one step too far. It is $\\frac{\\sigma}{\\sqrt{n}}$.'),
              prose('Put the other way, one value spreads $\\sqrt{n}$ times as far as the mean of $n$.'),
            ),
            ask('dist-xbar-build', 2),
            ask('dist-xbar-slip-flow', 2),
          ],
          skillCheck: [ask('dist-xbar-normal', 2), ask('dist-xbar-build', 2), ask('dist-xbar-sd', 2)],
        },
        {
          id: 'bn-l6-spread',
          title: 'How the Spread Shrinks',
          slides: [
            teach(
              prose('$\\sigma_{\\bar{X}} = \\frac{\\sigma}{\\sqrt{n}}$ falls as the sample grows, but with $\\sqrt{n}$, not with $n$. For $\\sigma = 12$:'),
              table(['n', '\\sigma_{\\bar{X}}'], [['1', '12'], ['4', '6'], ['16', '3'], ['36', '2']]),
              means(100, 12, [4, 16], 'One value of X dashed, with the narrower, taller curves of the mean for samples of 4 and 16'),
              prose('The dashed curve is one value of $X$. The mean of $4$ and the mean of $16$ share its centre and are ever narrower.'),
            ),
            ask('dist-shrink-table'),
            teach(
              prose('Four times the sample halves the spread, since $\\sqrt{4n} = 2\\sqrt{n}$. Nine times the sample cuts it to a third: in the table, $n = 4$ to $n = 36$ takes $6$ to $2$.'),
              prose('Dividing $n$ does the reverse. With $\\sigma = 12$, $n = 64$ to $n = 4$ divides $n$ by $16$, so it multiplies $\\sigma_{\\bar{X}}$ by $\\sqrt{16} = 4$:'),
              working('\\frac{12}{\\sqrt{64}} &= 1.5', '\\frac{12}{\\sqrt{4}} &= 6 = 4 \\times 1.5'),
              prose('To divide $\\sigma_{\\bar{X}}$ by $k$, multiply $n$ by $k^2$. Doubling $n$ divides it by only $\\sqrt{2}$.'),
            ),
            ask('dist-shrink-factor'),
            ask('dist-shrink-flow'),
            ask('dist-shrink-factor', 2),
            teach(
              prose('The $n$ a target needs: $\\sigma = 10$, and $\\sigma_{\\bar{X}}$ is to be at most $3$.'),
              working('\\frac{10}{\\sqrt{n}} &\\le 3', '\\sqrt{n} &\\ge \\frac{10}{3}', 'n &\\ge \\frac{100}{9} = 11.1\\ldots'),
              prose('A sample size is whole, so the smallest is $12$. Round up, never to the nearest.'),
            ),
            ask('dist-shrink-n'),
            ask('dist-shrink-n+choice', 2),
            ask('dist-shrink-table', 2),
            ask('dist-shrink-flow', 2),
          ],
          skillCheck: [ask('dist-shrink-factor', 2), ask('dist-shrink-n', 2), ask('dist-shrink-flow', 2)],
        },
        {
          id: 'bn-l6-probability',
          title: 'A Probability for a Mean',
          slides: [
            teach(
              prose('A probability for $\\bar{X}$ is found as in The Normal Distribution, standardising with $\\sigma_{\\bar{X}}$ in place of $\\sigma$:'),
              maths('z = \\frac{\\bar{x} - \\mu}{\\sigma / \\sqrt{n}}'),
              prose('$X \\sim N(50, 36)$ and $n = 9$, so $\\sigma_{\\bar{X}} = 2$. With $\\Phi(1.5) = 0.9332$:'),
              working('z &= \\frac{53 - 50}{2} = 1.5', 'P(\\bar{X} > 53) &= 1 - 0.9332', '&= 0.0668'),
            ),
            ask('dist-xbar-prob'),
            ask('dist-xbar-route-tree'),
            ask('dist-xbar-standardise'),
            teach(
              prose('One value against the mean of nine, at the same $53$. For one value $z = \\frac{3}{6} = 0.5$, and with $\\Phi(0.5) = 0.6915$:'),
              working('P(X > 53) &= 1 - 0.6915', '&= 0.3085'),
              means(50, 6, [9], 'One value of X dashed, with the much narrower curve of the mean of 9'),
              prose('A single value strays that far about a third of the time; the mean of nine, about once in fifteen.'),
            ),
            ask('dist-one-vs-mean'),
            ask('dist-xbar-prob+choice', 2),
            ask('dist-xbar-route-tree', 2),
            teach(
              prose('Check which spread went in. Standardising with $\\sigma$ rather than $\\frac{\\sigma}{\\sqrt{n}}$ gives the answer for one value, not for the mean, and it is always nearer a half.'),
            ),
            ask('dist-xbar-standardise', 2),
            ask('dist-one-vs-mean', 2),
          ],
          skillCheck: [ask('dist-xbar-prob', 2), ask('dist-xbar-route-tree', 2), ask('dist-one-vs-mean', 2)],
        },
        {
          id: 'bn-l6-back',
          title: 'Working Back from a Mean',
          slides: [
            teach(
              prose('Working back is done as in The Normal Distribution, "Working Back from a Probability", with $\\sigma_{\\bar{X}}$. $\\bar{X} \\sim N(50, 4)$, so $\\sigma_{\\bar{X}} = 2$.'),
              prose('For $P(\\bar{X} > k) = 0.05$, $k$ sits $1.645$ standard deviations above the mean:'),
              working('k &= 50 + 1.645 \\times 2', '&= 53.29'),
            ),
            ask('dist-xbar-critical'),
            ask('dist-xbar-cutoff-tree'),
            teach(
              prose('How big a sample puts $\\bar{X}$ within $d$ of $\\mu$ with probability $0.95$? Each tail holds $0.025$, so $d$ must be at least $1.96$ standard deviations of $\\bar{X}$.'),
              prose('$\\sigma = 20$, and $P(\\mu - 5 < \\bar{X} < \\mu + 5) \\ge 0.95$, so $d = 5$:'),
              working('\\frac{5}{20 / \\sqrt{n}} &\\ge 1.96', '\\sqrt{n} &\\ge \\frac{1.96 \\times 20}{5} = 7.84', 'n &\\ge 7.84^2 = 61.4656'),
              prose('Round up to a whole $n$: the smallest is $62$.'),
            ),
            ask('dist-min-n'),
            ask('dist-min-n-flow'),
            ask('dist-xbar-critical+choice', 2),
            ask('dist-xbar-cutoff-tree', 2),
            teach(
              prose('$P(|\\bar{X} - \\mu| < d)$ says the same thing: $\\bar{X}$ within $d$ of $\\mu$, either side. For a middle $0.98$, each tail holds $0.01$, so $z = 2.326$. With $\\sigma = 8$ and $d = 2$:'),
              working('\\sqrt{n} &\\ge \\frac{2.326 \\times 8}{2} = 9.304', 'n &\\ge 9.304^2 = 86.564416'),
              prose('So the smallest is $87$. Hypothesis Testing, The z Statistic, standardises a sample mean in just this way to test a claimed $\\mu$.'),
            ),
            ask('dist-min-n', 2),
            ask('dist-min-n-flow', 2),
          ],
          skillCheck: [ask('dist-xbar-critical', 2), ask('dist-min-n', 2), ask('dist-min-n-flow', 2)],
        },
      ],
      levelCheck: [
        ask('dist-mean-moment', 2),
        ask('dist-mean-from-total-tree', 2),
        ask('dist-mean-scale-flow', 2),
        ask('dist-xbar-normal', 2),
        ask('dist-xbar-build', 2),
        ask('dist-xbar-sd', 2),
        ask('dist-shrink-factor', 2),
        ask('dist-shrink-n', 2),
        ask('dist-shrink-flow', 2),
        ask('dist-xbar-prob', 2),
        ask('dist-xbar-route-tree', 2),
        ask('dist-one-vs-mean', 2),
        ask('dist-xbar-critical', 2),
        ask('dist-xbar-cutoff-tree', 2),
        ask('dist-min-n', 2),
      ],
    },
  ],
};
