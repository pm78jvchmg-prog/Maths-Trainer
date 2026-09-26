/**
 * Hypothesis Testing.
 *
 * Checking a claim against a sample. Level 1 tests a proportion with the
 * binomial model: the null and alternative hypotheses and which tail, the
 * test statistic and its model under `H_0`, the p-value read from quoted
 * cumulatives, the critical region and its actual significance level, and
 * two-tailed tests with the level halved. Level 2 tests a mean with the normal
 * model: the distribution of the sample mean, the z statistic, the critical
 * values 1.645, 1.96, 2.326 and 2.576, the decision in context, and the level
 * as the chance of rejecting a true `H_0`, with how the sample size moves the
 * verdict. Level 3 is the two errors: which mistake an outcome is, the size of
 * a test as P(Type I), P(Type II) and the power for a stated alternative, the
 * trade between the errors at a fixed sample size, and both errors in the test
 * of a mean, where a bigger sample shrinks P(Type II) at a fixed level.
 *
 * Level 4 tests a correlation: `H_0: \rho = 0` against a direction or none,
 * the critical value of the product-moment correlation coefficient read from
 * a quoted table, one- and two-tailed decisions, and how the sample size and
 * the level move the verdict, with rejecting read as association, not cause.
 * The table's values are always quoted, never taught to memorise.
 *
 * Level 5 compares two samples: the difference of two independent sample
 * means, normal with the means subtracted and the variances added, the
 * two-sample z statistic for `H_0: \mu_A = \mu_B` with known variances, the
 * tail from a suspicion that may name either group first, and the critical
 * difference itself. Then paired data: when two samples are matched, the
 * difference in each pair, its mean, and the test of `H_0: \mu_d = 0` with a
 * stated standard deviation of the differences.
 *
 * Binomial probabilities, the normal curve and standardising belong to the
 * Binomial & Normal Distributions course and nCr to Binomial Expansion's
 * second level: each is quoted once here, never taught again, and every
 * probability a question needs is quoted in its prompt. Each level closes
 * with a level check: questions only, no teaching slides, one attempt each.
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

/** A question with the setup it needs riding on it, shown above the prompt. */
const asking = (generatorId: string, difficulty: number, ...leadIn: Block[]): SlideRef => ({
  type: 'generated',
  generatorId,
  difficulty,
  leadIn,
});

const prose = (text: string): Block => ({ kind: 'prose', text });
const display = (tex: string): Block => ({ kind: 'display', tex });

/** Lines of working stacked in one display and aligned on their `&`. */
const working = (...lines: string[]): Block => display(`\\begin{aligned} ${lines.join(' \\\\ ')} \\end{aligned}`);

const figure = (options: Parameters<typeof plotSvg>[0]): Block => ({ kind: 'diagram', svg: plotSvg(options) });

const diagram = (svg: string): Block => ({ kind: 'diagram', svg });

/** A normal density with standard deviation `sd`, centred on zero. */
const density = (sd: number) => (x: number) => Math.exp(-(x * x) / (2 * sd * sd)) / (sd * Math.sqrt(2 * Math.PI));

const phi = density(1);

/** The density of r from a sample of n when rho = 0: proportional to (1 - r^2)^((n - 4)/2). */
function rDensity(n: number): (r: number) => number {
  const shape = (r: number) => (Math.abs(r) >= 1 ? 0 : (1 - r * r) ** ((n - 4) / 2));
  let area = 0;
  for (let i = 0; i < 400; i += 1) area += shape(-1 + (i + 0.5) / 200) / 200;
  return (r: number) => shape(r) / area;
}

const r10 = rDensity(10);

/** The 5% column of the critical values of r, n = 4 to 30, for a picture of how it falls. */
const PMCC_5 = [
  0.9, 0.8054, 0.7293, 0.6694, 0.6215, 0.5822, 0.5494, 0.5214, 0.4973, 0.4762, 0.4575, 0.4409, 0.4259, 0.4124, 0.4, 0.3887,
  0.3783, 0.3687, 0.3598, 0.3515, 0.3438, 0.3365, 0.3297, 0.3233, 0.3172, 0.3115, 0.3061,
];

/** A scatter diagram: marks on a grid, the same window as Data, Averages and Spread's. */
function scatterSvg(points: [number, number][], label: string): string {
  return plotSvg({
    xMin: -0.4,
    xMax: 10.4,
    yMin: -0.4,
    yMax: 10.4,
    height: 200,
    grid: true,
    curves: [],
    marks: points.map(([x, y]) => ({ x, y })),
    label,
  });
}


export const hypothesisTesting: Course = {
  id: 'hypothesis-testing',
  category: 'statistics',
  // After Probability (10), Data (20) and the Binomial & Normal Distributions (30) it tests with.
  position: 40,
  title: 'Hypothesis Testing',
  blurb: 'Testing a claim against a sample: hypotheses, p-values, critical regions, and tests of a proportion and of a mean.',
  levels: [
    {
      id: 'ht-l1',
      title: 'Testing a Proportion',
      lessons: [
        {
          id: 'ht-l1-hypotheses',
          title: 'Hypotheses and Tails',
          slides: [
            teach(
              prose('A **hypothesis test** checks a claim against data. A seed company claims 30% of its seeds germinate.'),
              prose('The claim is the **null hypothesis**, $H_0$. What someone suspects instead is the **alternative hypothesis**, $H_1$.'),
              display('H_0: p = 0.3, \\quad H_1: p > 0.3'),
              prose('Both are about $p$, the proportion in the whole population. The sample is the evidence, never part of a hypothesis.'),
            ),
            ask('hyp-hypotheses-tiles'),
            teach(
              prose('If the suspicion names a direction, "more" or "fewer", the test is **one-tailed**: $H_1: p > 0.3$ or $H_1: p < 0.3$.'),
              prose('If it only says "different", a change either way counts and the test is **two-tailed**:'),
              display('H_1: p \\ne 0.3'),
              prose('The direction comes from the suspicion, decided before the data is seen, never from which way the sample falls.'),
            ),
            ask('hyp-tails'),
            ask('hyp-claim-flow'),
            ask('hyp-hypotheses-tiles', 2),
            teach(
              prose('If $H_0$ is true, a sample of $n$ should have about $np$ successes: $20 \\times 0.3 = 6$ seeds out of $20$.'),
              prose('A sample of $20$ with $9$ germinating is $9 - 6 = 3$ more than $H_0$ expects.'),
              prose(
                'A count far from $np$ is a surprise. The **significance level**, $\\alpha$, says how unlikely a result must be, if $H_0$ is true, before we reject $H_0$. At the 5% level, $\\alpha = 0.05$.',
              ),
            ),
            ask('hyp-expected'),
            ask('hyp-tails', 2),
            ask('hyp-claim-flow', 2),
            ask('hyp-expected', 2),
          ],
          skillCheck: [ask('hyp-claim-flow', 2), ask('hyp-hypotheses-tiles', 2), ask('hyp-expected', 2)],
        },
        {
          id: 'ht-l1-statistic',
          title: 'The Test Statistic',
          slides: [
            teach(
              prose('The **test statistic** is the count $X$ of successes in the sample.'),
              prose('If $H_0$ is true, and the trials are independent with the same probability, $X$ is binomial with the claimed $p$:'),
              display('X \\sim B(20, 0.3)'),
              prose('The model always uses the claim, never the sample proportion.'),
            ),
            ask('hyp-statistic-choice'),
            ask('hyp-model-tiles'),
            teach(
              prose(
                'Binomial probabilities come from the Binomial & Normal Distributions course, with $\\binom{n}{r}$ from Binomial Expansion:',
              ),
              working('& P(X = r)', '&= \\binom{n}{r} p^r (1 - p)^{n - r}'),
              prose('Here they are always quoted as cumulatives, $P(X \\le k)$, the way a table gives them. "At least" and "more than" are one minus a cumulative:'),
              working('& P(X \\ge x)', '&= 1 - P(X \\le x - 1)'),
              working('& P(X > x)', '&= 1 - P(X \\le x)'),
            ),
            ask('hyp-upper-tree'),
            ask('hyp-model-tiles', 2),
            ask('hyp-statistic-choice', 2),
            teach(
              prose('A single value, or a stretch of values, is a difference of two cumulatives. For $X \\sim B(20, 0.3)$:'),
              working('& P(X = 9)', '&= P(X \\le 9) - P(X \\le 8)', '&= 0.9520 - 0.8867', '&= 0.0653'),
              working('& P(6 \\le X \\le 9)', '&= P(X \\le 9) - P(X \\le 5)', '&= 0.9520 - 0.4164', '&= 0.5356'),
            ),
            ask('hyp-point-prob'),
            ask('hyp-upper-tree', 2),
            ask('hyp-point-prob', 2),
          ],
          skillCheck: [ask('hyp-model-tiles', 2), ask('hyp-upper-tree', 2), ask('hyp-point-prob', 2)],
        },
        {
          id: 'ht-l1-pvalue',
          title: 'The p-value',
          slides: [
            teach(
              prose(
                'The **p-value** is the probability, if $H_0$ is true, of a result at least as extreme as the one seen, in the direction $H_1$ points.',
              ),
              prose('With $H_1: p > 0.3$ and $10$ seeds out of $20$ germinating, "at least as extreme" means $10$ or more:'),
              working('& P(X \\ge 10)', '&= 1 - P(X \\le 9)', '&= 1 - 0.9520', '&= 0.0480'),
            ),
            asking(
              'hyp-pvalue-choice',
              1,
              prose('For $H_1: p < 0.3$, fewer is more extreme. With $2$ seeds out of $20$, the p-value is the lower tail, read straight from the table:'),
              display('P(X \\le 2) = 0.0355'),
            ),
            ask('hyp-pvalue-table'),
            ask('hyp-pvalue'),
            teach(
              prose('Compare the p-value with the level. Below $\\alpha$, the result is too unlikely under the claim: reject $H_0$. Otherwise, do not reject it.'),
              display('0.0480 < 0.05'),
              prose('So at the 5% level there is evidence that more than 30% of the seeds germinate.'),
              prose('With $H_1: p < 0.3$ and $3$ seeds out of $20$, the p-value is $P(X \\le 3) = 0.1071$:'),
              display('0.1071 > 0.05'),
              prose('So do not reject $H_0$: there is not enough evidence at the 5% level that fewer than 30% germinate.'),
            ),
            ask('hyp-decision-flow'),
            ask('hyp-pvalue-choice', 2),
            ask('hyp-pvalue', 2),
            teach(
              prose('Which tail is the p-value? For $H_1: p > p_0$ it is $1 - P(X \\le x - 1)$; for $H_1: p < p_0$ it is $P(X \\le x)$, straight from the table.'),
              prose(
                'Conclude in the scenario\'s words, and never say $H_0$ has been proved: "not enough evidence" is not proof that the claim is true.',
              ),
            ),
            ask('hyp-pvalue-table', 2),
            ask('hyp-decision-flow', 2),
          ],
          skillCheck: [ask('hyp-pvalue', 2), ask('hyp-decision-flow', 2), ask('hyp-pvalue-choice', 2)],
        },
        {
          id: 'ht-l1-critical',
          title: 'Critical Regions',
          slides: [
            teach(
              prose(
                'The **critical region** is every value of $X$ that would lead to rejecting $H_0$, fixed before the data. For an upper tail it is $X \\ge c$, with $c$ the smallest value whose tail is within the level.',
              ),
              prose('For $X \\sim B(20, 0.3)$ at the 5% level:'),
              working(
                'P(X \\ge 9) &= 1 - 0.8867',
                '&= 0.1133',
                'P(X \\ge 10) &= 1 - 0.9520',
                '&= 0.0480',
              ),
              prose('$0.1133$ is above $0.05$ and $0.0480$ is within it, so the critical region is $X \\ge 10$, and $10$ is the **critical value**.'),
            ),
            asking(
              'hyp-actual-level',
              1,
              prose(
                'The **actual significance level** is the probability of the critical region if $H_0$ is true. For the seeds it is $P(X \\ge 10) = 0.0480$.',
              ),
              prose('A count only takes whole values, so the region cannot hold exactly 5%, and the actual level is usually a little below it.'),
            ),
            ask('hyp-region-table'),
            teach(
              prose('For $H_1: p < 0.3$ the region is $X \\le c$, with $c$ the **largest** value whose lower tail is within the level. Still with $B(20, 0.3)$ at 5%:'),
              working('P(X \\le 2) &= 0.0355', 'P(X \\le 3) &= 0.1071'),
              prose('$0.0355$ is within $0.05$ and $0.1071$ is not, so the region is $X \\le 2$. Always check the value next to $c$: it must fall outside the level.'),
              prose('On a number line, put a filled dot on the critical value and shade outward: to the right for $X \\ge c$, to the left for $X \\le c$.'),
            ),
            ask('hyp-region-line'),
            ask('hyp-region-choice'),
            ask('hyp-actual-level', 2),
            ask('hyp-region-line', 2),
            ask('hyp-region-choice', 2),
            ask('hyp-region-table', 2),
          ],
          skillCheck: [ask('hyp-region-line', 2), ask('hyp-actual-level', 2), ask('hyp-region-choice', 2)],
        },
        {
          id: 'ht-l1-two-tailed',
          title: 'Two-Tailed Tests',
          slides: [
            teach(
              prose('With $H_1: p \\ne 0.3$, evidence can come from either end. The level is split between the two tails, half in each:'),
              display('\\frac{\\alpha}{2} = \\frac{0.05}{2} = 0.025'),
            ),
            ask('hyp-two-tiles'),
            teach(
              prose('For a p-value, find which side of $np$ the count lies and compare that one tail with $\\frac{\\alpha}{2}$.'),
              prose('$X \\sim B(20, 0.3)$ expects $6$. A count of $11$ is above it:'),
              working('P(X \\ge 11) &= 1 - 0.9829', '&= 0.0171'),
              prose('$0.0171 < 0.025$, so at the 5% level there is evidence that the proportion is not 30%.'),
            ),
            ask('hyp-two-flow'),
            ask('hyp-two-tiles', 2),
            ask('hyp-two-flow', 2),
            teach(
              prose('A two-tailed critical region has two pieces, $X \\le a$ and $X \\ge b$, each tail within $\\frac{\\alpha}{2}$. For $B(20, 0.3)$ at 5%:'),
              working(
                'P(X \\le 1) &= 0.0076',
                'P(X \\le 2) &= 0.0355',
                'P(X \\ge 11) &= 0.0171',
                'P(X \\ge 10) &= 0.0480',
              ),
              prose('$0.0076$ and $0.0171$ are within $0.025$ and the next values in are not, so the region is $X \\le 1$ or $X \\ge 11$. The actual level adds both tails: $0.0076 + 0.0171 = 0.0247$.'),
            ),
            ask('hyp-two-region-line'),
            ask('hyp-two-level'),
            ask('hyp-two-region-line', 2),
            ask('hyp-two-level', 2),
          ],
          skillCheck: [ask('hyp-two-flow', 2), ask('hyp-two-region-line', 2), ask('hyp-two-level', 2)],
        },
      ],
      levelCheck: [
        ask('hyp-hypotheses-tiles', 2),
        ask('hyp-expected', 2),
        ask('hyp-claim-flow', 2),
        ask('hyp-upper-tree', 2),
        ask('hyp-point-prob', 2),
        ask('hyp-model-tiles', 2),
        ask('hyp-pvalue-table', 2),
        ask('hyp-pvalue', 2),
        ask('hyp-decision-flow', 2),
        ask('hyp-region-line', 2),
        ask('hyp-actual-level', 2),
        ask('hyp-region-choice', 2),
        ask('hyp-two-region-line', 2),
        ask('hyp-two-tiles', 2),
        ask('hyp-two-level', 2),
      ],
    },
    {
      id: 'ht-l2',
      title: 'Testing a Mean',
      lessons: [
        {
          id: 'ht-l2-sample-mean',
          title: 'The Sample Mean',
          slides: [
            teach(
              prose('A claim about a mean is tested with a normal model. If each measurement is $X \\sim N(\\mu, \\sigma^2)$, the mean of a random sample of $n$ is'),
              display('\\bar{X} \\sim N\\left(\\mu, \\frac{\\sigma^2}{n}\\right)'),
              prose('The same centre, and less spread: one unusual measurement is diluted by the rest of the sample.'),
            ),
            ask('hyp-mean-model-tiles'),
            teach(
              prose('The standard deviation of $\\bar{X}$ is the square root of its variance, $\\frac{\\sigma}{\\sqrt{n}}$. With $\\sigma = 12$ and $n = 16$:'),
              working('\\frac{\\sigma^2}{n} &= \\frac{144}{16} = 9', '\\frac{\\sigma}{\\sqrt{n}} &= \\frac{12}{4} = 3'),
            ),
            ask('hyp-mean-se'),
            ask('hyp-mean-spread-tree'),
            ask('hyp-mean-model-tiles', 2),
            teach(
              prose('The spread moves with $\\sqrt{n}$, not with $n$: four times the sample halves the standard deviation of $\\bar{X}$. With $\\sigma = 12$:'),
              working('n = 16: &\\quad \\frac{12}{\\sqrt{16}} = 3', 'n = 64: &\\quad \\frac{12}{\\sqrt{64}} = 1.5'),
              prose('The dashed curve is one measurement; the solid one is the mean of four.'),
              figure({
                xMin: -4,
                xMax: 4,
                yMin: 0,
                yMax: 0.85,
                curves: [{ f: density(1), dashed: true }, { f: density(0.5) }],
                verticals: [{ x: 0, dashed: true }],
                label: 'Two normal curves with the same centre, the narrower one for a sample mean',
              }),
            ),
            ask('hyp-mean-spread-choice'),
            ask('hyp-mean-se', 2),
            ask('hyp-mean-spread-tree', 2),
            ask('hyp-mean-spread-choice', 2),
          ],
          skillCheck: [ask('hyp-mean-se', 2), ask('hyp-mean-spread-tree', 2), ask('hyp-mean-spread-choice', 2)],
        },
        {
          id: 'ht-l2-z',
          title: 'The z Statistic',
          slides: [
            teach(
              prose('Standardising, from the Binomial & Normal Distributions course, measures a value in standard deviations from the mean. For a sample mean, divide by the standard deviation of $\\bar{X}$:'),
              display('z = \\frac{\\bar{x} - \\mu}{\\sigma / \\sqrt{n}}'),
              prose('A bag of flour is claimed to average $500$ g, with $\\sigma = 12$ g. A sample of $16$ has mean $504.5$ g:'),
              working('\\bar{x} - \\mu &= 504.5 - 500 = 4.5', '\\frac{\\sigma}{\\sqrt{n}} &= \\frac{12}{4} = 3', 'z &= \\frac{4.5}{3} = 1.5'),
            ),
            ask('hyp-z-tiles'),
            ask('hyp-z'),
            teach(
              prose('A sample mean below $\\mu$ gives a negative $z$. Another sample of $16$ bags has mean $496.4$ g:'),
              working('\\bar{x} - \\mu &= 496.4 - 500 = -3.6', 'z &= \\frac{-3.6}{3} = -1.2'),
            ),
            ask('hyp-standardise-steps'),
            ask('hyp-z-slider'),
            ask('hyp-z-tiles', 2),
            ask('hyp-z', 2),
            teach(
              prose('If $H_0$ is true, $z$ follows the standard normal curve. The further out it lands, the less likely the sample would be under the claim. The shaded tail holds the least likely 5%.'),
              figure({
                xMin: -3.5,
                xMax: 3.5,
                yMin: 0,
                yMax: 0.45,
                curves: [{ f: phi }],
                verticals: [{ x: 0, dashed: true }],
                shade: { f: phi, from: 1.645, to: 3.5 },
                label: 'The standard normal curve with its upper 5% tail shaded',
              }),
            ),
            ask('hyp-standardise-steps', 2),
            ask('hyp-z-slider', 2),
          ],
          skillCheck: [ask('hyp-z', 2), ask('hyp-standardise-steps', 2), ask('hyp-z-slider', 2)],
        },
        {
          id: 'ht-l2-critical',
          title: 'Critical Values of z',
          slides: [
            teach(
              prose('A **critical value** cuts off a tail holding the level. Four of them cover almost every test:'),
              display(
                '\\begin{array}{c|c|c} \\text{1 tail} & \\text{2 tails} & z \\\\ \\hline 5\\% & 10\\% & 1.645 \\\\ 2.5\\% & 5\\% & 1.96 \\\\ 1\\% & 2\\% & 2.326 \\\\ 0.5\\% & 1\\% & 2.576 \\end{array}',
              ),
              prose('A two-tailed test puts half the level in each tail, which is why each row holds two levels.'),
            ),
            ask('hyp-critical-slider'),
            teach(
              prose('The direction in $H_1$ says which tail. For the flour, $H_0: \\mu = 500$, at the 5% level:'),
              working(
                'H_1: \\mu > 500 &: \\quad z > 1.645',
                'H_1: \\mu < 500 &: \\quad z < -1.645',
                'H_1: \\mu \\ne 500 &: \\quad |z| > 1.96',
              ),
              prose('A lower tail is the same value made negative. Two tails hold 2.5% each, so they read the 1.96 row.'),
            ),
            ask('hyp-z-region-choice'),
            ask('hyp-critical-table'),
            ask('hyp-critical-flow'),
            teach(
              prose('A two-tailed test at 5% uses $1.96$, not $1.645$: each tail holds only 2.5%.'),
              figure({
                xMin: -3.5,
                xMax: 3.5,
                yMin: 0,
                yMax: 0.45,
                curves: [{ f: phi }],
                verticals: [{ x: 1.96, dashed: true }, { x: -1.96, dashed: true }],
                shade: { f: phi, from: 1.96, to: 3.5 },
                label: 'The standard normal curve with lines at plus and minus 1.96 and the upper 2.5% tail shaded',
              }),
            ),
            ask('hyp-z-region-choice', 2),
            ask('hyp-critical-table', 2),
            ask('hyp-critical-flow', 2),
            ask('hyp-critical-slider', 2),
          ],
          skillCheck: [ask('hyp-critical-table', 2), ask('hyp-critical-flow', 2), ask('hyp-z-region-choice', 2)],
        },
        {
          id: 'ht-l2-decision',
          title: 'The Decision in Context',
          slides: [
            teach(
              prose('Compare $z$ with the critical region. In it: reject $H_0$, since there is evidence at that level for $H_1$. Outside it: do not reject $H_0$, since there is not enough evidence.'),
              prose('For the flour, $z = 1.5$ against $z > 1.645$ at 5%: not in the region.'),
            ),
            ask('hyp-z-tree'),
            ask('hyp-mean-decision-flow'),
            ask('hyp-conclusion-choice'),
            teach(
              prose('Say what it means in the scenario\'s words, and never claim proof:'),
              prose('"There is not enough evidence at the 5% level that the mean mass of a bag of flour has increased."'),
              prose('A test weighs evidence against a claim. Not rejecting $H_0$ does not show the claim is true.'),
            ),
            ask('hyp-z-tree', 2),
            ask('hyp-mean-decision-flow', 2),
            ask('hyp-conclusion-choice', 2),
            teach(
              prose('The critical region can be written for $\\bar{x}$ itself: reject when $\\bar{x}$ is more than $c$ standard deviations of $\\bar{X}$ from $\\mu$. For the flour at 5%:'),
              working('\\bar{x} &> 500 + 1.645 \\times 3', '&= 504.935'),
              prose('If the mean is suspected to have fallen, subtract instead:'),
              working('\\bar{x} &< 500 - 1.645 \\times 3', '&= 495.065'),
            ),
            ask('hyp-mean-xbar'),
            ask('hyp-mean-xbar', 2),
          ],
          skillCheck: [ask('hyp-mean-decision-flow', 2), ask('hyp-conclusion-choice', 2), ask('hyp-mean-xbar', 2)],
        },
        {
          id: 'ht-l2-level-and-size',
          title: 'Significance and Sample Size',
          slides: [
            teach(
              prose('The significance level is the probability of rejecting $H_0$ when it is true. At 5%, one test in twenty of a true claim rejects it anyway.'),
              prose('So $200$ tests of a true claim at 5% are expected to give $200 \\times 0.05 = 10$ false alarms.'),
            ),
            ask('hyp-false-alarms'),
            teach(
              prose('A stricter level has a larger critical value: $2.326$ at 1% against $1.645$ at 5%, one-tailed, and $2.576$ against $1.96$ two-tailed. So a result significant at 1% is significant at 5%, and not the other way round.'),
              prose('A two-tailed test gives $z = 2.1$. At 5%, $2.1 > 1.96$: reject $H_0$. At 1%, $2.1 < 2.576$: do not reject.'),
            ),
            ask('hyp-levels-flow'),
            ask('hyp-false-alarms', 2),
            teach(
              prose('The same gap $\\bar{x} - \\mu$ is more convincing in a bigger sample: $\\frac{\\sigma}{\\sqrt{n}}$ shrinks, so $z$ grows with $\\sqrt{n}$.'),
              working('n = 16: &\\quad z = \\frac{4.5}{12 / 4} = 1.5', 'n = 64: &\\quad z = \\frac{4.5}{12 / 8} = 3'),
              prose('Four times the sample, twice the $z$: the flour test that failed at 5% now passes at 1%.'),
            ),
            ask('hyp-n-choice'),
            ask('hyp-n-table'),
            ask('hyp-levels-flow', 2),
            ask('hyp-n-choice', 2),
            ask('hyp-n-table', 2),
          ],
          skillCheck: [ask('hyp-false-alarms', 2), ask('hyp-levels-flow', 2), ask('hyp-n-table', 2)],
        },
      ],
      levelCheck: [
        ask('hyp-mean-model-tiles', 2),
        ask('hyp-mean-se', 2),
        ask('hyp-z', 2),
        ask('hyp-mean-spread-tree', 2),
        ask('hyp-z-tiles', 2),
        ask('hyp-standardise-steps', 2),
        ask('hyp-critical-table', 2),
        ask('hyp-z-region-choice', 2),
        ask('hyp-critical-slider', 2),
        ask('hyp-mean-decision-flow', 2),
        ask('hyp-mean-xbar', 2),
        ask('hyp-z-tree', 2),
        ask('hyp-false-alarms', 2),
        ask('hyp-levels-flow', 2),
        ask('hyp-n-table', 2),
      ],
    },
    {
      id: 'ht-l3',
      title: 'Type I and Type II Errors',
      lessons: [
        {
          id: 'ht-l3-two-mistakes',
          title: 'The Two Mistakes',
          slides: [
            teach(
              prose('A test decides from a sample, so it can be wrong. There are two ways, depending on whether $H_0$ is really true:'),
              display(
                '\\begin{array}{c|c|c} & H_0 \\text{ true} & H_0 \\text{ false} \\\\ \\hline \\text{reject} & \\text{Type I} & \\text{correct} \\\\ \\text{keep} & \\text{correct} & \\text{Type II} \\end{array}',
              ),
              prose('A **Type I error** rejects a true $H_0$: a false alarm. A **Type II error** keeps a false $H_0$: a real change missed.'),
            ),
            ask('hyp-error-choice'),
            ask('hyp-error-flow'),
            ask('hyp-error-tiles'),
            teach(
              prose('A Type I error needs $H_0$ to be true and $X$ to land in the critical region. For the seeds, with region $X \\ge 10$:'),
              display('\\text{Type I: } X \\ge 10 \\text{ when } p = 0.3'),
              prose('The region was chosen to hold at most the level when $H_0$ is true. So the probability of a Type I error is at most the significance level: at most $0.05$ at 5%.'),
            ),
            ask('hyp-error-line'),
            ask('hyp-error-choice', 2),
            ask('hyp-error-flow', 2),
            teach(
              prose('A Type II error needs $H_0$ to be false and $X$ to land outside the region, so the test keeps $H_0$ anyway. If the seeds really germinate at 50%:'),
              display('\\text{Type II: } X \\le 9 \\text{ when } p = 0.5'),
              prose('How likely that is depends on what $p$ really is, which the level does not control.'),
            ),
            ask('hyp-error-tiles', 2),
            ask('hyp-error-line'),
          ],
          skillCheck: [ask('hyp-error-flow', 2), ask('hyp-error-tiles', 2), ask('hyp-error-choice', 2)],
        },
        {
          id: 'ht-l3-size',
          title: 'The Size of a Test',
          slides: [
            teach(
              prose(
                'The probability of a Type I error is the probability of the critical region when $H_0$ is true. It is the **size** of the test: the actual significance level from Testing a Proportion.',
              ),
              prose('For the seeds, $X \\sim B(20, 0.3)$ under $H_0$ and the region is $X \\ge 10$:'),
              working('& P(\\text{Type I})', '&= P(X \\ge 10 \\mid p = 0.3)', '&= 1 - 0.9520', '&= 0.0480'),
            ),
            ask('hyp-size'),
            ask('hyp-size-choice'),
            ask('hyp-size-table'),
            teach(
              prose('A rule need not come from a level. Someone might decide in advance to reject when $X \\le 2$ or $X \\ge 11$. Its size is both tails added, under $H_0$:'),
              working('& P(X \\le 2) + P(X \\ge 11)', '&= 0.0355 + (1 - 0.9829)', '&= 0.0355 + 0.0171', '&= 0.0526'),
            ),
            ask('hyp-size-sum'),
            ask('hyp-size', 2),
            ask('hyp-size-choice', 2),
            teach(
              prose('A stricter level pushes the region further out, so the size falls with it. For the seeds, $1 - 0.9520 = 0.0480$ at 5% and $1 - 0.9949 = 0.0051$ at 1%:'),
              display('\\begin{array}{c|c|c} \\text{level} & \\text{region} & P(\\text{Type I}) \\\\ \\hline 5\\% & X \\ge 10 & 0.0480 \\\\ 1\\% & X \\ge 12 & 0.0051 \\end{array}'),
            ),
            ask('hyp-size-table', 2),
            ask('hyp-size-sum', 2),
          ],
          skillCheck: [ask('hyp-size', 2), ask('hyp-size-sum', 2), ask('hyp-size-table', 2)],
        },
        {
          id: 'ht-l3-type-two',
          title: 'Type II Errors',
          slides: [
            teach(
              prose('A Type II error happens when $H_0$ is false but $X$ lands outside the critical region. Its probability needs a stated alternative: what $p$ really is.'),
              prose('For the seeds, the region is $X \\ge 10$. If $p$ is really $0.5$, then $X \\sim B(20, 0.5)$ and'),
              working('& P(\\text{Type II})', '&= P(X \\le 9 \\mid p = 0.5)', '&= 0.4119'),
            ),
            ask('hyp-beta'),
            ask('hyp-beta-flow'),
            teach(
              prose('Two things change from a Type I error: the event is **outside** the region, and the model uses the **true** $p$, not the claimed one.'),
              prose('For a lower-tail region $X \\le c$, outside is $X \\ge c + 1$. With $H_1: p < 0.3$ the seed region is $X \\le 2$. If $p$ is really $0.1$:'),
              working('& P(\\text{Type II})', '&= P(X \\ge 3 \\mid p = 0.1)', '&= 1 - P(X \\le 2)', '&= 1 - 0.6769', '&= 0.3231'),
            ),
            ask('hyp-beta-choice'),
            ask('hyp-error-line', 2),
            ask('hyp-beta', 2),
            teach(
              prose('The level fixes the size, but not P(Type II): that depends on how far the truth is from the claim. A true $p$ close to $0.3$ is easy to miss:'),
              working('P(X \\le 9 \\mid p = 0.4) &= 0.7553', 'P(X \\le 9 \\mid p = 0.5) &= 0.4119'),
            ),
            ask('hyp-beta-flow', 2),
            ask('hyp-beta-choice', 2),
            ask('hyp-error-line', 2),
          ],
          skillCheck: [ask('hyp-beta', 2), ask('hyp-beta-flow', 2), ask('hyp-beta-choice', 2)],
        },
        {
          id: 'ht-l3-power',
          title: 'Power',
          slides: [
            teach(
              prose('The **power** of a test is the probability that it rejects $H_0$ when $H_0$ is false, for a stated alternative: the chance of catching a real change.'),
              display('\\text{power} = 1 - P(\\text{Type II})'),
              prose('For the seeds, with region $X \\ge 10$ and $p$ really $0.5$: $1 - 0.4119 = 0.5881$.'),
            ),
            ask('hyp-power'),
            ask('hyp-power-pair-tree'),
            teach(
              prose('The further the truth is from the claim, the more likely the count lands in the region, so the power rises:'),
              display(
                '\\begin{array}{c|c|c} p & P(\\text{Type II}) & \\text{power} \\\\ \\hline 0.4 & 0.7553 & 0.2447 \\\\ 0.5 & 0.4119 & 0.5881 \\\\ 0.6 & 0.1275 & 0.8725 \\end{array}',
              ),
            ),
            ask('hyp-power', 2),
            ask('hyp-power-pair-tree', 2),
            teach(
              prose(
                'At a fixed sample size the two errors trade against each other. A stricter level shrinks the region: fewer Type I errors, but less power. At 5% the seed test rejects when $X \\ge 10$, at 1% when $X \\ge 12$. With $p$ really $0.5$:',
              ),
              display('\\begin{array}{c|c|c} \\text{level} & \\alpha & \\beta \\\\ \\hline 5\\% & 0.0480 & 0.4119 \\\\ 1\\% & 0.0051 & 0.7483 \\end{array}'),
              prose('Only a bigger sample can cut both at once.'),
            ),
            ask('hyp-power-choice'),
            ask('hyp-trade-table'),
            ask('hyp-power-choice', 2),
            ask('hyp-trade-table', 2),
          ],
          skillCheck: [ask('hyp-power', 2), ask('hyp-power-pair-tree', 2), ask('hyp-trade-table', 2)],
        },
        {
          id: 'ht-l3-mean-errors',
          title: 'Errors in the Mean Test',
          slides: [
            teach(
              prose('For the flour, $H_0: \\mu = 500$ against $H_1: \\mu > 500$, with $\\sigma = 12$ and $n = 16$, so $\\bar{X}$ has standard deviation $3$. At 5% the test rejects when'),
              working('\\bar{x} &> 500 + 1.645 \\times 3', '&= 504.935'),
              prose('$\\bar{X}$ is continuous, so this region holds exactly 5% when $H_0$ is true: P(Type I) is the level itself.'),
            ),
            asking(
              'hyp-mean-beta',
              1,
              prose('If the flour\'s mean is really $507.5$ g, a Type II error is $\\bar{x}$ falling short of $504.935$. Standardise the boundary under the true mean:'),
              working('z &= \\frac{504.935 - 507.5}{3}', '&= -0.855'),
              working('& P(\\text{Type II})', '&= P(Z < -0.855)', '&= 1 - \\Phi(0.855)', '&= 0.1963'),
            ),
            ask('hyp-mean-miss-tree'),
            teach(
              prose('Where that $0.1963$ comes from: the dashed curve is $\\bar{X}$ under $H_0$, the solid one under the true mean $507.5$. The shaded part of the solid curve falls short of the line at $504.935$, so the test keeps $H_0$.'),
              figure({
                xMin: 492,
                xMax: 518,
                yMin: 0,
                yMax: 0.15,
                curves: [{ f: (x) => density(3)(x - 500), dashed: true }, { f: (x) => density(3)(x - 507.5) }],
                verticals: [{ x: 504.935, dashed: true }],
                shade: { f: (x) => density(3)(x - 507.5), from: 492, to: 504.935 },
                label: 'Two normal curves for the sample mean, centred on 500 and 507.5, with the part of the second below the critical value shaded',
              }),
            ),
            ask('hyp-mean-beta', 2),
            ask('hyp-mean-miss-tree', 2),
            teach(
              prose('A bigger sample narrows both curves, so less of the truth\'s curve falls short. With $n = 64$ the standard deviation of $\\bar{X}$ is $1.5$:'),
              working('\\bar{x}_c &= 500 + 1.645 \\times 1.5', '&= 502.4675', 'z &= \\frac{502.4675 - 507.5}{1.5}', '&= -3.355'),
              working('& P(\\text{Type II})', '&= 1 - \\Phi(3.355)', '&= 0.0004'),
              prose('At a fixed level, P(Type II) falls as $n$ grows, and a smaller sample raises it. P(Type I) stays at the level either way.'),
            ),
            ask('hyp-beta-n-table'),
            asking(
              'hyp-mean-error-choice',
              1,
              prose('A stricter level moves the boundary out. For the flour with $n = 16$ at 1%:'),
              working('\\bar{x}_c &= 500 + 2.326 \\times 3', '&= 506.978', 'z &= \\frac{506.978 - 507.5}{3}', '&= -0.174'),
              prose('P(Type II) $= 1 - \\Phi(0.174) = 0.4309$, up from $0.1963$ at 5%, while P(Type I) falls from $0.05$ to $0.01$. A looser level does the opposite.'),
            ),
            ask('hyp-beta-n-table', 2),
            asking(
              'hyp-mean-error-choice',
              2,
              prose('A true mean further from the claim is easier to catch. If the flour\'s mean is really $510$ g, at 5% with $n = 16$:'),
              working('z &= \\frac{504.935 - 510}{3}', '&= -1.688'),
              prose('P(Type II) $= 1 - \\Phi(1.688) = 0.0457$, down from $0.1963$. The region has not moved, so P(Type I) is unchanged.'),
            ),
          ],
          skillCheck: [ask('hyp-mean-beta', 2), ask('hyp-mean-miss-tree', 2), ask('hyp-beta-n-table', 2)],
        },
      ],
      levelCheck: [
        ask('hyp-error-flow', 2),
        ask('hyp-error-tiles', 2),
        ask('hyp-error-line', 2),
        ask('hyp-size', 2),
        ask('hyp-size-sum', 2),
        ask('hyp-size-table', 2),
        ask('hyp-beta', 2),
        ask('hyp-beta-flow', 2),
        ask('hyp-beta-choice', 2),
        ask('hyp-power', 2),
        ask('hyp-power-pair-tree', 2),
        ask('hyp-trade-table', 2),
        ask('hyp-mean-beta', 2),
        ask('hyp-mean-miss-tree', 2),
        ask('hyp-beta-n-table', 2),
      ],
    },
    {
      id: 'ht-l4',
      title: 'Testing a Correlation',
      lessons: [
        {
          id: 'ht-l4-hypotheses',
          title: 'Hypotheses about Rho',
          slides: [
            teach(
              prose('The **product-moment correlation coefficient**, $r$, measures how closely a sample\'s points follow a straight line. It runs from $-1$ to $1$, with $0$ for no linear link.'),
              diagram(
                scatterSvg(
                  [[1, 3], [2, 2], [3, 5], [4, 3], [4, 6], [5, 6], [6, 4], [7, 7], [8, 5], [9, 8]],
                  'Ten points rising from left to right, loosely around a line',
                ),
              ),
              prose('These ten points give $r = 0.7350$. It estimates $\\rho$ (rho), the correlation in the whole population the sample came from.'),
            ),
            asking(
              'hyp-rho-flow',
              1,
              prose('A test of correlation starts from none at all in the population:'),
              display('H_0: \\rho = 0'),
              prose('The suspicion gives $H_1$. Positive correlation is $\\rho > 0$ and negative is $\\rho < 0$, both one-tailed. A link either way is $\\rho \\ne 0$, two-tailed. The sign of $r$ plays no part.'),
            ),
            ask('hyp-rho-h1-table'),
            teach(
              prose('Both hypotheses are about $\\rho$. The sample\'s $r$ is the evidence, never part of a hypothesis.'),
              prose('The direction of $H_1$ comes from the suspicion, not from the sign of $r$. A suspected positive correlation is tested with $H_1: \\rho > 0$ even when the sample gives $r = -0.3100$:'),
              display('H_0: \\rho = 0, \\quad H_1: \\rho > 0'),
            ),
            ask('hyp-rho-tiles'),
            ask('hyp-rho-choice'),
            ask('hyp-rho-flow', 2),
            ask('hyp-rho-tiles', 2),
            ask('hyp-rho-choice', 2),
            ask('hyp-rho-h1-table', 2),
          ],
          skillCheck: [ask('hyp-rho-flow', 2), ask('hyp-rho-tiles', 2), ask('hyp-rho-choice', 2)],
        },
        {
          id: 'ht-l4-critical',
          title: 'The Critical Value',
          slides: [
            teach(
              prose('How far from $0$ must $r$ be to count? A table of **critical values** answers it: a row for $n$, the number of pairs, and a column for the one-tailed level.'),
              display(
                '\\small \\begin{array}{c|ccc} n & 10\\% & 5\\% & 2.5\\% \\\\ \\hline 9 & 0.4716 & 0.5822 & 0.6664 \\\\ 10 & 0.4428 & 0.5494 & 0.6319 \\\\ 11 & 0.4187 & 0.5214 & 0.6021 \\end{array}',
              ),
              prose('For $10$ pairs at the 5% level, the critical value is $0.5494$.'),
              prose('$n$ counts pairs, not values. Ten students, each giving a revision time and a mark, is $n = 10$, not $20$.'),
            ),
            ask('hyp-pmcc-lookup'),
            ask('hyp-pmcc-table'),
            ask('hyp-pmcc-flow'),
            teach(
              prose('Down a column the values fall: a bigger sample needs a weaker $r$ to be convincing.'),
              prose('Along a row they rise: a stricter level needs a stronger $r$.'),
              working('n = 10, \\; 5\\% &: \\quad 0.5494', 'n = 11, \\; 5\\% &: \\quad 0.5214', 'n = 10, \\; 2.5\\% &: \\quad 0.6319'),
            ),
            ask('hyp-pmcc-trend-choice'),
            ask('hyp-pmcc-lookup', 2),
            ask('hyp-pmcc-table', 2),
            teach(
              prose('Always count pairs before reading a row: $11$ plants, each measured for height and hours of sunlight, is the $n = 11$ row, $0.5214$ at 5%.'),
              prose('The table\'s own values are always quoted: finding the right row and column is the skill, not remembering the numbers.'),
            ),
            ask('hyp-pmcc-flow', 2),
            ask('hyp-pmcc-trend-choice', 2),
          ],
          skillCheck: [ask('hyp-pmcc-lookup', 2), ask('hyp-pmcc-table', 2), ask('hyp-pmcc-trend-choice', 2)],
        },
        {
          id: 'ht-l4-one-tailed',
          title: 'Testing One Way',
          slides: [
            teach(
              prose('With one tail, the whole level sits on the side $H_1$ points to. With $c$ the critical value from the table, reject $H_0$ when'),
              working('H_1: \\rho > 0 &: \\quad r > c', 'H_1: \\rho < 0 &: \\quad r < -c'),
            ),
            ask('hyp-rho-region-choice'),
            ask('hyp-rho-region-tiles'),
            ask('hyp-rho-decision-flow'),
            teach(
              prose('If $\\rho = 0$, the $r$ from $10$ pairs spreads around $0$ like this. The shaded tail holds the least likely 5%, beyond $0.5494$.'),
              figure({
                xMin: -1,
                xMax: 1,
                yMin: 0,
                yMax: r10(0) * 1.15,
                curves: [{ f: r10 }],
                verticals: [{ x: 0, dashed: true }],
                shade: { f: r10, from: 0.5494, to: 1 },
                label: 'How r from ten pairs spreads if there is no correlation, with the upper 5% shaded',
              }),
            ),
            ask('hyp-rho-critical-slider'),
            ask('hyp-rho-region-choice', 2),
            ask('hyp-rho-region-tiles', 2),
            teach(
              prose('An $r$ of the wrong sign never rejects, however large: $r = -0.8000$ is no evidence at all for $\\rho > 0$.'),
              prose('The ten points in the first lesson gave $r = 0.7350 > 0.5494$, so: "There is evidence at the 5% level of positive correlation."'),
            ),
            ask('hyp-rho-decision-flow', 2),
            ask('hyp-rho-critical-slider', 2),
          ],
          skillCheck: [ask('hyp-rho-decision-flow', 2), ask('hyp-rho-region-tiles', 2), ask('hyp-rho-critical-slider', 2)],
        },
        {
          id: 'ht-l4-two-tailed',
          title: 'Testing Either Way',
          slides: [
            teach(
              prose('With $H_1: \\rho \\ne 0$, correlation either way counts. The level is split, half in each tail, so a 5% test reads the 2.5% column. For $10$ pairs the critical region is'),
              display('r < -0.6319 \\; \\text{or} \\; r > 0.6319'),
            ),
            ask('hyp-rho-column'),
            ask('hyp-rho-two-tiles'),
            ask('hyp-rho-two-flow'),
            teach(
              prose('On a line from $-1$ to $1$ the region is both ends, each holding 2.5% if $\\rho = 0$.'),
              figure({
                xMin: -1,
                xMax: 1,
                yMin: 0,
                yMax: r10(0) * 1.15,
                curves: [{ f: r10 }, { f: (r) => (Math.abs(r) > 0.6319 ? r10(r) : NaN), accent: true, breaks: true }],
                verticals: [
                  { x: -0.6319, dashed: true },
                  { x: 0.6319, dashed: true },
                ],
                label: 'How r from ten pairs spreads if there is no correlation, with both tails beyond 0.6319 marked',
              }),
            ),
            ask('hyp-rho-two-table'),
            ask('hyp-rho-column', 2),
            ask('hyp-rho-two-tiles', 2),
            teach(
              prose('So compare $|r|$ with the value. $r = -0.7000$ rejects $H_0$ here just as $0.7000$ would.'),
              prose('The conclusion names no direction: "There is evidence at the 5% level of correlation between the two."'),
            ),
            ask('hyp-rho-two-flow', 2),
            ask('hyp-rho-two-table', 2),
          ],
          skillCheck: [ask('hyp-rho-two-flow', 2), ask('hyp-rho-two-tiles', 2), ask('hyp-rho-two-table', 2)],
        },
        {
          id: 'ht-l4-size-and-level',
          title: 'Sample Size and Level',
          slides: [
            teach(
              prose('The same $r$ can fail with one sample size and pass with another. Take $r = 0.5000$ against $H_1: \\rho > 0$ at 5%:'),
              working('n = 10 &: \\quad 0.5000 < 0.5494', 'n = 12 &: \\quad 0.5000 > 0.4973'),
              prose('Not enough evidence from $10$ pairs; evidence from $12$.'),
            ),
            ask('hyp-rho-shift-flow'),
            ask('hyp-rho-which-rejects'),
            ask('hyp-rho-n-slider'),
            teach(
              prose('A stricter level raises the bar. At $n = 12$, $r = 0.5000$ clears $0.4973$ at 5% but not $0.6581$ at 1%.'),
              prose('The dots are the 5% column for every $n$, falling; the line is at $0.5$. The first dot below the line is the smallest sample that would reject.'),
              figure({
                xMin: 3,
                xMax: 31,
                yMin: 0,
                yMax: 1,
                curves: [],
                marks: PMCC_5.map((y, i) => ({ x: i + 4, y })),
                horizontals: [0.5],
                label: 'The 5% critical values of r for n from 4 to 30, falling below a line at 0.5 from n = 12',
              }),
            ),
            ask('hyp-rho-shift-flow', 2),
            ask('hyp-rho-which-rejects', 2),
            teach(
              prose('Rejecting $H_0$ shows **association**, not cause. Ice-cream sales and sunburn are correlated because hot weather drives both.'),
              prose('So $r = 0.7350$ from ten pairs, above $0.5494$, says: "There is evidence at the 5% level of positive correlation." It does not say one causes the other.'),
              prose('And not rejecting never shows $\\rho = 0$, only that the evidence is not strong enough.'),
            ),
            ask('hyp-rho-cause-choice'),
            ask('hyp-rho-n-slider', 2),
            ask('hyp-rho-cause-choice', 2),
          ],
          skillCheck: [ask('hyp-rho-shift-flow', 2), ask('hyp-rho-n-slider', 2), ask('hyp-rho-cause-choice', 2)],
        },
      ],
      levelCheck: [
        ask('hyp-rho-tiles', 2),
        ask('hyp-rho-choice', 2),
        ask('hyp-rho-h1-table', 2),
        ask('hyp-pmcc-lookup', 2),
        ask('hyp-pmcc-trend-choice', 2),
        ask('hyp-pmcc-table', 2),
        ask('hyp-rho-decision-flow', 2),
        ask('hyp-rho-region-tiles', 2),
        ask('hyp-rho-critical-slider', 2),
        ask('hyp-rho-two-flow', 2),
        ask('hyp-rho-two-tiles', 2),
        ask('hyp-rho-two-table', 2),
        ask('hyp-rho-n-slider', 2),
        ask('hyp-rho-which-rejects', 2),
        ask('hyp-rho-cause-choice', 2),
      ],
    },
    {
      id: 'ht-l5',
      title: 'Comparing Two Samples',
      lessons: [
        {
          id: 'ht-l5-difference',
          title: 'Two Means, One Difference',
          slides: [
            teach(
              prose('Two machines fill bags of flour. A random sample is taken from each, independently, to see whether the machines differ.'),
              prose('From Testing a Mean, a sample mean is normal with variance $\\sigma^2 / n$. The difference of two independent sample means is normal too, with'),
              working('\\text{mean} &= \\mu_A - \\mu_B', '\\text{variance} &= \\frac{\\sigma_A^2}{n_A} + \\frac{\\sigma_B^2}{n_B}'),
              prose('The means subtract, but the variances **add**.'),
            ),
            asking(
              'hyp-diff-model-tiles',
              1,
              prose('Machine A\'s bags have mean $502$ g and standard deviation $12$ g; machine B\'s have mean $498$ g and standard deviation $16$ g. With $16$ bags from each:'),
              working('\\text{mean} &= 502 - 498 = 4', '\\text{variance} &= \\frac{144}{16} + \\frac{256}{16}', '&= 9 + 16 = 25'),
              display('\\bar{X}_A - \\bar{X}_B \\sim N(4, 25)'),
            ),
            ask('hyp-diff-var'),
            ask('hyp-diff-rule-flow'),
            teach(
              prose('Why add? Each sample mean wobbles on its own, and taking one wobble from another cannot cancel it out: the difference wobbles more than either.'),
              prose('The standard deviation is the square root of the variance, taken **after** adding:'),
              working('\\text{sd} &= \\sqrt{9 + 16}', '&= \\sqrt{25} = 5'),
              prose('Adding the standard deviations, $3$ and $4$, would give $7$, which is wrong: standard deviations never add.'),
            ),
            ask('hyp-diff-spread-tree'),
            ask('hyp-diff-var+choice', 2),
            ask('hyp-diff-rule-flow', 2),
            teach(
              prose('If B has the larger mean, the mean of the difference is negative. With $\\mu_A = 495$ g and $\\mu_B = 498$ g:'),
              working('\\text{mean} &= 495 - 498 = -3'),
              prose('The variance is still the sum, and is never negative.'),
            ),
            ask('hyp-diff-model-tiles', 2),
            ask('hyp-diff-spread-tree', 2),
          ],
          skillCheck: [ask('hyp-diff-model-tiles', 2), ask('hyp-diff-var', 2), ask('hyp-diff-spread-tree', 2)],
        },
        {
          id: 'ht-l5-z',
          title: 'The Two-Sample z Statistic',
          slides: [
            teach(
              prose('To test whether two machines differ, start from no difference at all:'),
              display('H_0: \\mu_A = \\mu_B'),
              prose('If $H_0$ is true, ${\\bar{X}_A - \\bar{X}_B}$ has mean $0$. So standardise the observed difference by its standard deviation:'),
              display('z = \\frac{\\bar{x}_A - \\bar{x}_B}{\\sqrt{\\dfrac{\\sigma_A^2}{n_A} + \\dfrac{\\sigma_B^2}{n_B}}}'),
            ),
            asking(
              'hyp-diff-z-tiles',
              1,
              prose('Sixteen bags are taken from each machine, in grams:'),
              display('\\begin{array}{c|ccc} & \\sigma & n & \\bar{x} \\\\ \\hline A & 12 & 16 & 506.1 \\\\ B & 16 & 16 & 497.6 \\end{array}'),
              working(
                '\\bar{x}_A - \\bar{x}_B &= 506.1 - 497.6 = 8.5',
                '\\text{sd} &= \\sqrt{\\frac{144}{16} + \\frac{256}{16}}',
                '&= \\sqrt{25} = 5',
                'z &= \\frac{8.5}{5} = 1.7',
              ),
            ),
            ask('hyp-diff-z'),
            ask('hyp-diff-stat-tree'),
            teach(
              prose('Keep the order ${A - B}$ throughout. If A\'s sample mean is the smaller, $z$ is negative. With ${\\bar{x}_A = 497.6}$ g and ${\\bar{x}_B = 503.1}$ g:'),
              working('\\bar{x}_A - \\bar{x}_B &= 497.6 - 503.1 = -5.5', 'z &= \\frac{-5.5}{5} = -1.1'),
              prose('If $H_0$ is true, $z$ follows the standard normal curve, so the critical values from Testing a Mean apply. The shaded tail is the upper 5%, beyond $1.645$.'),
              figure({
                xMin: -3.5,
                xMax: 3.5,
                yMin: 0,
                yMax: 0.45,
                curves: [{ f: phi }],
                verticals: [{ x: 0, dashed: true }],
                shade: { f: phi, from: 1.645, to: 3.5 },
                label: 'The standard normal curve with its upper 5% tail shaded',
              }),
            ),
            ask('hyp-diff-z-slider'),
            ask('hyp-diff-z+choice', 2),
            ask('hyp-diff-z-tiles', 2),
            ask('hyp-diff-stat-tree', 2),
            ask('hyp-diff-z-slider', 2),
          ],
          skillCheck: [ask('hyp-diff-z', 2), ask('hyp-diff-stat-tree', 2), ask('hyp-diff-z-slider', 2)],
        },
        {
          id: 'ht-l5-decision',
          title: 'Deciding in Context',
          slides: [
            teach(
              prose('The suspicion gives $H_1$, and the order ${A - B}$ fixes its sign. "A fills heavier bags than B" and "B fills lighter bags than A" are the same suspicion:'),
              display('H_1: \\mu_A > \\mu_B'),
              prose('"A is lighter", or "B is heavier", is ${H_1: \\mu_A < \\mu_B}$. "The machines differ" names no direction, so it is two-tailed, ${H_1: \\mu_A \\ne \\mu_B}$.'),
              prose('The critical values are the ones from Testing a Mean. At 5%, reject $H_0$ when'),
              working('\\mu_A > \\mu_B &: \\quad z > 1.645', '\\mu_A < \\mu_B &: \\quad z < -1.645', '\\mu_A \\ne \\mu_B &: \\quad |z| > 1.96'),
              prose('At 1% the values are $2.326$ for one tail and $2.576$ for two.'),
            ),
            ask('hyp-diff-hyp-tiles'),
            asking(
              'hyp-diff-decision-flow',
              1,
              prose('For the flour, ${z = 1.7}$ against ${H_1: \\mu_A > \\mu_B}$ at 5%. The critical region is ${z > 1.645}$, and $z$ is in it, so reject $H_0$:'),
              prose('"There is evidence at the 5% level that the mean mass of a bag is higher from machine A than from machine B."'),
              prose('Had $z$ fallen outside the region, the conclusion would be "not enough evidence", never proof that the machines are the same.'),
            ),
            ask('hyp-diff-conclusion-choice'),
            teach(
              prose('Given the samples instead of $z$, work $z$ out first, then decide. A two-tailed test at 5%, with $\\bar{x}_A - \\bar{x}_B = -11.2$ and standard deviation $5$:'),
              working('z &= \\frac{-11.2}{5} = -2.24', '|z| &= 2.24 > 1.96'),
              prose('Reject $H_0$: there is evidence at the 5% level that the mean mass of a bag differs between the machines.'),
            ),
            ask('hyp-diff-hyp-tiles', 2),
            ask('hyp-diff-decision-flow', 2),
            teach(
              prose('The critical region can be written for the difference itself. With standard deviation $5$, the 5% test of ${H_1: \\mu_A > \\mu_B}$ rejects when'),
              working('\\bar{x}_A - \\bar{x}_B &> 1.645 \\times 5', '&= 8.225'),
              prose('For ${H_1: \\mu_A < \\mu_B}$ the region is below $-8.225$. For two tails the upper value is'),
              working('1.96 \\times 5 &= 9.8'),
            ),
            ask('hyp-diff-crit'),
            ask('hyp-diff-conclusion-choice', 2),
            ask('hyp-diff-crit', 2),
          ],
          skillCheck: [ask('hyp-diff-decision-flow', 2), ask('hyp-diff-conclusion-choice', 2), ask('hyp-diff-crit', 2)],
        },
        {
          id: 'ht-l5-paired',
          title: 'Paired Data',
          slides: [
            teach(
              prose('Sometimes two samples are not independent. Five runners are timed over 400 m before and after a training programme: each "after" belongs with one "before".'),
              prose('Data like this is **paired**. Work with the difference in each pair:'),
              display('d = \\text{after} - \\text{before}'),
              display(
                '\\begin{array}{c|c|c} \\text{before} & \\text{after} & d \\\\ \\hline 62 & 59 & -3 \\\\ 58 & 57 & -1 \\\\ 71 & 66 & -5 \\\\ 65 & 65 & 0 \\\\ 60 & 56 & -4 \\end{array}',
              ),
              prose('A negative $d$ is a faster time. Take $d$ the way round the question says: before minus after would flip every sign.'),
            ),
            ask('hyp-paired-diff-table'),
            asking(
              'hyp-paired-design-choice',
              1,
              prose('Data is paired when each value in one sample is matched with one value in the other: the same person measured twice, the two halves of one plot, a pair of twins.'),
              prose('Two separate groups, such as runners from two different clubs, are **independent**: nothing links a value in one to a value in the other.'),
            ),
            asking(
              'hyp-paired-mean',
              1,
              prose('The mean difference $\\bar{d}$ is the total of the differences over the number of pairs. For the five runners:'),
              working('\\bar{d} &= \\frac{-3 - 1 - 5 + 0 - 4}{5}', '&= \\frac{-13}{5} = -2.6'),
            ),
            teach(
              prose('Why pair? Runners differ from each other far more than training changes any one of them. Comparing two separate groups, that spread would hide the effect.'),
              prose('Each difference compares a runner with themselves, so the spread between runners drops out and only the change is left.'),
              prose('So a paired test works with the differences, testing their population mean:'),
              display('H_0: \\mu_d = 0'),
              prose('Independent samples keep ${H_0: \\mu_A = \\mu_B}$ and the two-sample $z$.'),
            ),
            ask('hyp-paired-method-flow'),
            ask('hyp-paired-diff-table', 2),
            ask('hyp-paired-mean+choice', 2),
            ask('hyp-paired-design-choice', 2),
            ask('hyp-paired-method-flow', 2),
          ],
          skillCheck: [ask('hyp-paired-diff-table', 2), ask('hyp-paired-mean', 2), ask('hyp-paired-design-choice', 2)],
        },
        {
          id: 'ht-l5-paired-test',
          title: 'Testing Paired Differences',
          slides: [
            teach(
              prose('A paired test is a test of one mean, the mean difference $\\mu_d$, just as in Testing a Mean. With $n$ pairs, and the differences modelled with standard deviation $\\sigma_d$:'),
              display('z = \\frac{\\bar{d}}{\\sigma_d / \\sqrt{n}}'),
              prose('Sixteen runners train, with $d$ taken as after minus before. The differences have ${\\bar{d} = -2.6}$ s and ${\\sigma_d = 8}$ s:'),
              working('\\frac{\\sigma_d}{\\sqrt{n}} &= \\frac{8}{4} = 2', 'z &= \\frac{-2.6}{2} = -1.3'),
            ),
            ask('hyp-paired-z'),
            asking(
              'hyp-paired-h1-tiles',
              1,
              prose('$H_1$ comes from the suspicion and the way round $d$ is. Training is suspected to lower times, and with $d = \\text{after} - \\text{before}$ a lower time is a negative $d$:'),
              display('H_0: \\mu_d = 0 \\qquad H_1: \\mu_d < 0'),
              prose('At 5% the critical region is then ${z < -1.645}$. A suspected rise gives ${\\mu_d > 0}$, and a suspected change either way gives ${\\mu_d \\ne 0}$.'),
            ),
            ask('hyp-paired-stat-tree'),
            teach(
              prose('Then decide as in any z test. For the runners, ${z = -1.3}$ against ${z < -1.645}$ at 5%: not in the region. So do not reject $H_0$:'),
              prose('"There is not enough evidence at the 5% level that the training programme lowers the mean time to run 400 m."'),
              prose('Had $d$ been before minus after, every sign flips: ${H_1: \\mu_d > 0}$ and ${z = 1.3}$, with the same conclusion.'),
            ),
            ask('hyp-paired-decision-flow'),
            ask('hyp-paired-z+choice', 2),
            ask('hyp-paired-h1-tiles', 2),
            ask('hyp-paired-decision-flow', 2),
            ask('hyp-paired-stat-tree', 2),
          ],
          skillCheck: [ask('hyp-paired-z', 2), ask('hyp-paired-decision-flow', 2), ask('hyp-paired-h1-tiles', 2)],
        },
      ],
      levelCheck: [
        ask('hyp-diff-model-tiles', 2),
        ask('hyp-diff-var', 2),
        ask('hyp-diff-spread-tree', 2),
        ask('hyp-diff-z', 2),
        ask('hyp-diff-stat-tree', 2),
        ask('hyp-diff-z-slider', 2),
        ask('hyp-diff-hyp-tiles', 2),
        ask('hyp-diff-decision-flow', 2),
        ask('hyp-diff-conclusion-choice', 2),
        ask('hyp-diff-crit', 2),
        ask('hyp-paired-diff-table', 2),
        ask('hyp-paired-mean', 2),
        ask('hyp-paired-design-choice', 2),
        ask('hyp-paired-z', 2),
        ask('hyp-paired-decision-flow', 2),
      ],
    },
  ],
};
