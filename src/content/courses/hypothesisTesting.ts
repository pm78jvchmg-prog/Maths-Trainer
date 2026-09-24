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

const prose = (text: string): Block => ({ kind: 'prose', text });
const display = (tex: string): Block => ({ kind: 'display', tex });

/** Lines of working stacked in one display and aligned on their `&`. */
const working = (...lines: string[]): Block => display(`\\begin{aligned} ${lines.join(' \\\\ ')} \\end{aligned}`);

const figure = (options: Parameters<typeof plotSvg>[0]): Block => ({ kind: 'diagram', svg: plotSvg(options) });

/** A normal density with standard deviation `sd`, centred on zero. */
const density = (sd: number) => (x: number) => Math.exp(-(x * x) / (2 * sd * sd)) / (sd * Math.sqrt(2 * Math.PI));

const phi = density(1);

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
            ask('hyp-tails'),
            ask('hyp-expected'),
            teach(
              prose('If the suspicion names a direction, "more" or "fewer", the test is **one-tailed**: $H_1: p > 0.3$ or $H_1: p < 0.3$.'),
              prose('If it only says "different", a change either way counts and the test is **two-tailed**:'),
              display('H_1: p \\ne 0.3'),
              prose('The direction comes from the suspicion, decided before the data is seen, never from which way the sample falls.'),
            ),
            ask('hyp-claim-flow'),
            ask('hyp-tails', 2),
            ask('hyp-hypotheses-tiles', 2),
            teach(
              prose('If $H_0$ is true, a sample of $n$ should have about $np$ successes: $20 \\times 0.3 = 6$ seeds out of $20$.'),
              prose(
                'A count far from $np$ is a surprise. The **significance level**, $\\alpha$, says how unlikely a result must be, if $H_0$ is true, before we reject $H_0$. At the 5% level, $\\alpha = 0.05$.',
              ),
            ),
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
            ask('hyp-point-prob'),
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
            ask('hyp-point-prob', 2),
            ask('hyp-upper-tree', 2),
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
            ask('hyp-pvalue-choice'),
            ask('hyp-pvalue-table'),
            ask('hyp-pvalue'),
            teach(
              prose('Compare the p-value with the level. Below $\\alpha$, the result is too unlikely under the claim: reject $H_0$. Otherwise, do not reject it.'),
              display('0.0480 < 0.05'),
              prose('So at the 5% level there is evidence that more than 30% of the seeds germinate.'),
            ),
            ask('hyp-decision-flow'),
            ask('hyp-pvalue-choice', 2),
            ask('hyp-pvalue', 2),
            teach(
              prose('For $H_1: p < 0.3$ the p-value is the lower tail, $P(X \\le x)$, read straight from the table.'),
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
            ask('hyp-region-line'),
            ask('hyp-actual-level'),
            ask('hyp-region-choice'),
            teach(
              prose(
                'On a number line, put a filled dot on the critical value and shade outward: to the right for $X \\ge c$, to the left for $X \\le c$. A lower-tail region is the largest $c$ with $P(X \\le c)$ within the level.',
              ),
              prose('Check the value next to $c$ as well: it must fall outside the level, or $c$ is not the edge.'),
            ),
            ask('hyp-region-table'),
            ask('hyp-region-line', 2),
            ask('hyp-actual-level', 2),
            teach(
              prose(
                'The **actual significance level** is the probability of the critical region if $H_0$ is true: $P(X \\ge 10) = 0.0480$ here.',
              ),
              prose('A count only takes whole values, so the region cannot hold exactly 5%, and the actual level is usually a little below it.'),
            ),
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
            ask('hyp-two-flow'),
            ask('hyp-two-region-line'),
            teach(
              prose('For a p-value, find which side of $np$ the count lies and compare that one tail with $\\frac{\\alpha}{2}$.'),
              prose('$X \\sim B(20, 0.3)$ expects $6$. A count of $11$ is above it:'),
              working('P(X \\ge 11) &= 1 - 0.9829', '&= 0.0171'),
              prose('$0.0171 < 0.025$, so at the 5% level there is evidence that the proportion is not 30%.'),
            ),
            ask('hyp-two-level'),
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
            ask('hyp-mean-se'),
            ask('hyp-mean-spread-tree'),
            teach(
              prose('The standard deviation of $\\bar{X}$ is the square root of its variance, $\\frac{\\sigma}{\\sqrt{n}}$. With $\\sigma = 12$ and $n = 16$:'),
              working('\\frac{\\sigma^2}{n} &= \\frac{144}{16} = 9', '\\frac{\\sigma}{\\sqrt{n}} &= \\frac{12}{4} = 3'),
            ),
            ask('hyp-mean-spread-choice'),
            ask('hyp-mean-model-tiles', 2),
            ask('hyp-mean-se', 2),
            teach(
              prose('The spread moves with $\\sqrt{n}$, not with $n$: four times the sample halves the standard deviation of $\\bar{X}$. The dashed curve is one measurement; the solid one is the mean of four.'),
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
              prose('Standardising, from the Binomial & Normal Distributions course, measures a value in standard deviations from the mean:'),
              display('z = \\frac{x - \\mu}{\\sigma}'),
              prose('For a sample mean, the standard deviation is that of $\\bar{X}$:'),
              display('z = \\frac{\\bar{x} - \\mu}{\\sigma / \\sqrt{n}}'),
            ),
            ask('hyp-z-tiles'),
            ask('hyp-z'),
            ask('hyp-standardise-steps'),
            teach(
              prose('A bag of flour is claimed to average $500$ g, with $\\sigma = 12$ g. A sample of $16$ has mean $504.5$ g:'),
              working('\\bar{x} - \\mu &= 504.5 - 500 = 4.5', '\\frac{\\sigma}{\\sqrt{n}} &= \\frac{12}{4} = 3', 'z &= \\frac{4.5}{3} = 1.5'),
              prose('A sample mean below $\\mu$ gives a negative $z$.'),
            ),
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
            ask('hyp-z-region-choice'),
            ask('hyp-critical-table'),
            ask('hyp-critical-flow'),
            teach(
              prose('The direction in $H_1$ says which tail:'),
              working(
                'H_1: \\mu > \\mu_0 &: \\quad z > c',
                'H_1: \\mu < \\mu_0 &: \\quad z < -c',
                'H_1: \\mu \\ne \\mu_0 &: \\quad |z| > c',
              ),
            ),
            ask('hyp-critical-slider'),
            ask('hyp-z-region-choice', 2),
            ask('hyp-critical-table', 2),
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
            ask('hyp-mean-xbar'),
            ask('hyp-z-tree', 2),
            ask('hyp-mean-decision-flow', 2),
            teach(
              prose('The critical region can be written for $\\bar{x}$ itself: reject when $\\bar{x}$ is more than $c$ standard deviations of $\\bar{X}$ from $\\mu$. For the flour at 5%:'),
              working('\\bar{x} &> 500 + 1.645 \\times 3', '&= 504.935'),
            ),
            ask('hyp-conclusion-choice', 2),
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
            ask('hyp-n-choice'),
            ask('hyp-levels-flow'),
            teach(
              prose('A stricter level has a larger critical value: $2.326$ at 1% against $1.645$ at 5%, one-tailed. So a result significant at 1% is significant at 5%, and not the other way round.'),
            ),
            ask('hyp-n-table'),
            ask('hyp-false-alarms', 2),
            ask('hyp-n-choice', 2),
            teach(
              prose('The same gap $\\bar{x} - \\mu$ is more convincing in a bigger sample: $\\frac{\\sigma}{\\sqrt{n}}$ shrinks, so $z$ grows with $\\sqrt{n}$.'),
              working('n = 16: &\\quad z = \\frac{4.5}{12 / 4} = 1.5', 'n = 64: &\\quad z = \\frac{4.5}{12 / 8} = 3'),
              prose('Four times the sample, twice the $z$: the flour test that failed at 5% now passes at 1%.'),
            ),
            ask('hyp-levels-flow', 2),
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
            ask('hyp-beta-choice'),
            ask('hyp-beta-flow'),
            teach(
              prose('Two things change from a Type I error: the event is **outside** the region, and the model uses the **true** $p$, not the claimed one.'),
              prose('For a lower-tail region $X \\le c$, outside is $X \\ge c + 1$, which is one minus a cumulative:'),
              working('& P(X \\ge c + 1)', '&= 1 - P(X \\le c)'),
            ),
            ask('hyp-error-line', 2),
            ask('hyp-beta', 2),
            ask('hyp-beta-choice', 2),
            teach(
              prose('The level fixes the size, but not P(Type II): that depends on how far the truth is from the claim. A true $p$ close to $0.3$ is easy to miss:'),
              working('P(X \\le 9 \\mid p = 0.4) &= 0.7553', 'P(X \\le 9 \\mid p = 0.5) &= 0.4119'),
            ),
            ask('hyp-beta-flow', 2),
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
            ask('hyp-power-choice'),
            teach(
              prose('The further the truth is from the claim, the more likely the count lands in the region, so the power rises:'),
              display(
                '\\begin{array}{c|c|c} p & P(\\text{Type II}) & \\text{power} \\\\ \\hline 0.4 & 0.7553 & 0.2447 \\\\ 0.5 & 0.4119 & 0.5881 \\\\ 0.6 & 0.1275 & 0.8725 \\end{array}',
              ),
            ),
            ask('hyp-trade-table'),
            ask('hyp-power', 2),
            ask('hyp-power-pair-tree', 2),
            teach(
              prose(
                'At a fixed sample size the two errors trade against each other. A stricter level shrinks the region: fewer Type I errors, but less power. At 5% the seed test rejects when $X \\ge 10$, at 1% when $X \\ge 12$. With $p$ really $0.5$:',
              ),
              display('\\begin{array}{c|c|c} \\text{level} & \\alpha & \\beta \\\\ \\hline 5\\% & 0.0480 & 0.4119 \\\\ 1\\% & 0.0051 & 0.7483 \\end{array}'),
              prose('Only a bigger sample can cut both at once.'),
            ),
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
            ask('hyp-mean-beta'),
            ask('hyp-mean-miss-tree'),
            ask('hyp-beta-n-table'),
            teach(
              prose('If the mean is really $507.5$ g, a Type II error is $\\bar{x}$ falling short of the boundary. Standardise the boundary under the true mean:'),
              working('z &= \\frac{504.935 - 507.5}{3}', '&= -0.855'),
              working('& P(\\text{Type II})', '&= P(Z < -0.855)', '&= 1 - \\Phi(0.855)', '&= 0.1963'),
              prose('The dashed curve is $\\bar{X}$ under $H_0$, the solid one under the truth; the shaded part of it falls short of the line.'),
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
            ask('hyp-mean-error-choice'),
            ask('hyp-mean-beta', 2),
            ask('hyp-mean-miss-tree', 2),
            teach(
              prose('A bigger sample narrows both curves, so less of the truth\'s curve falls short. With $n = 64$ the standard deviation of $\\bar{X}$ is $1.5$:'),
              working('\\bar{x}_c &= 500 + 1.645 \\times 1.5', '&= 502.4675', 'z &= \\frac{502.4675 - 507.5}{1.5}', '&= -3.355'),
              working('& P(\\text{Type II})', '&= 1 - \\Phi(3.355)', '&= 0.0004'),
              prose('At a fixed level, P(Type II) falls as $n$ grows.'),
            ),
            ask('hyp-beta-n-table', 2),
            ask('hyp-mean-error-choice', 2),
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
  ],
};
