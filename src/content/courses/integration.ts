/**
 * Integration.
 *
 * Level 1 builds integration as a question asked backwards — given a
 * derivative, what was differentiated? — which is where the constant of
 * integration comes from and why it cannot be dropped. Level 2 attaches limits
 * and turns the answer into a number, then into an area. Level 3 is the two
 * techniques that handle integrands the standard results cannot.
 *
 * Each level closes with a level check: twelve questions, no teaching slides,
 * one attempt each.
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

/**
 * A generated question with teaching prose above it, on the same slide.
 *
 * Used where the thread would otherwise break across a tap: the sentence that
 * sets a question up belongs with the question, not on a slide of its own the
 * learner has to carry over. Plain `ask` stays the default — a question that
 * needs no setting up should not be given one.
 */
const askAfter = (lead: Block[], generatorId: string, difficulty = 1): SlideRef => ({
  type: 'generated',
  generatorId,
  difficulty,
  leadIn: lead,
});

const prose = (text: string): Block => ({ kind: 'prose', text });
const maths = (tex: string): Block => ({ kind: 'display', tex });

/**
 * The region a slide is talking about, shaded where the area is the point.
 *
 * Integration is the one course with a direct visual payoff — an area — and
 * `plotSvg`'s `shade` option exists for exactly this.
 */
const graph = (
  opts: Omit<Parameters<typeof plotSvg>[0], 'label'> & { label?: string },
): Block => ({
  kind: 'diagram',
  svg: plotSvg({ label: 'A region under a curve', ...opts }),
});

export const integration: Course = {
  id: 'integration',
  title: 'Integration',
  blurb: 'Differentiation run backwards, then areas, then the two techniques.',
  levels: [
    {
      id: 'in-l1',
      title: 'Reversing Differentiation',
      lessons: [
        {
          id: 'in-l1-antiderivatives',
          title: 'What an Antiderivative Is',
          slides: [
            teach(
              prose(
                'Differentiation turns $x^{3}$ into $3x^{2}$. Integration is that question asked backwards: given $3x^{2}$, what was differentiated to produce it?',
              ),
              prose(
                'A function whose derivative is the one you started with is called an **antiderivative**. So $x^{3}$ is an antiderivative of $3x^{2}$.',
              ),
              prose(
                'But so is $x^{3} + 7$, and so is $x^{3} - 1000$. Differentiating wipes out a constant term completely, so every one of these has the same derivative.',
              ),
              maths('\\frac{d}{dx}\\left(x^{3} + k\\right) = 3x^{2}'),
              prose(
                'The question therefore has infinitely many answers, all differing only by a constant. The **indefinite integral** names them all at once, by writing an unknown constant into the answer.',
              ),
            ),
            askAfter(
              [prose('Start with the family itself. Three of these are the same curve moved up or down; one is a different curve altogether.')],
              'int-antiderivative-family',
            ),
            ask('int-power'),
            ask('int-antiderivative-family'),
            teach(
              prose(
                'That unknown is written $C$ and called the **constant of integration**. It is part of the answer, not decoration.',
              ),
              maths('\\int 3x^{2} \\, dx = x^{3} + C'),
              prose(
                'Read the notation left to right: the integral sign opens it, the function being integrated sits in the middle, and the $dx$ names the variable being integrated with respect to.',
              ),
              prose(
                'Leaving the $C$ out claims there is exactly one antiderivative, which is false. It is the single most commonly dropped mark in the topic.',
              ),
            ),
            askAfter(
              [prose('The same question again, now that the notation has a name.')],
              'int-antiderivative-family',
            ),
            ask('int-antiderivative-family'),
            teach(
              prose(
                'Every integral can be checked, which is unusual enough to be worth exploiting: differentiate your answer and see whether you get back what you started with.',
              ),
              maths(
                '\\int 8x^{3} \\, dx = 2x^{4} + C \\quad \\longrightarrow \\quad \\frac{d}{dx}\\left(2x^{4} + C\\right) = 8x^{3}',
              ),
              prose(
                'Most of mathematics offers no such check. Use it on every question in this course until the rules are automatic.',
              ),
            ),
            askAfter(
              [prose('Here is one to try that on. Work out the integral, then differentiate your answer in your head before you tap Check.')],
              'int-power',
            ),
            ask('int-power'),
          ],
          skillCheck: [
            ask('int-antiderivative-family', 2),
            ask('int-antiderivative-family', 2),
            ask('int-power'),
          ],
        },
        {
          id: 'in-l1-powers',
          title: 'Integrating Powers of x',
          slides: [
            teach(
              prose(
                'Differentiating a power multiplies by the index and then drops it by one. Reversing that gives a rule with the two steps in the opposite order: raise the index by one, then divide by the new index.',
              ),
              maths('\\int x^{n} \\, dx = \\frac{x^{n + 1}}{n + 1} + C'),
              prose(
                'For $x^{4}$: raising the index gives $x^{5}$, and dividing by the new index gives $\\frac{x^{5}}{5}$.',
              ),
              maths('\\int x^{4} \\, dx = \\frac{x^{5}}{5} + C'),
              prose(
                'Check by differentiating: the 5 coming off the index cancels the 5 underneath, leaving $x^{4}$. That cancellation is the entire reason the division is there.',
              ),
            ),
            ask('int-power'),
            ask('int-power'),
            ask('int-power+choice'),
            teach(
              prose(
                'A coefficient comes along for the ride, because a constant factor can be taken outside an integral.',
              ),
              maths('\\int 6x^{2} \\, dx = 6 \\times \\frac{x^{3}}{3} + C = 2x^{3} + C'),
              prose(
                'Divide by the *new* index, never the old one. $\\int 6x^{2} \\, dx$ is $2x^{3} + C$, not $3x^{3} + C$ — and differentiating the wrong answer gives $9x^{2}$, which catches it at once.',
              ),
              prose(
                'A constant on its own is the case worth noting: $5$ is really $5x^{0}$, so it integrates to $5x$. Constants do not vanish under integration the way they do under differentiation.',
              ),
            ),
            ask('int-power'),
            ask('int-power'),
            teach(
              prose('Two special cases are worth recognising on sight.'),
              maths('\\int 1 \\, dx = x + C \\qquad \\int x \\, dx = \\frac{x^{2}}{2} + C'),
              prose(
                'Both are just the rule with $n = 0$ and $n = 1$. Nothing is special about them except how often they turn up.',
              ),
            ),
            ask('int-power+choice'),
            ask('int-power'),
          ],
          skillCheck: [ask('int-power'), ask('int-power'), ask('int-power')],
        },
        {
          id: 'in-l1-sums',
          title: 'Sums and Coefficients',
          slides: [
            teach(
              prose(
                'An integral of a sum is the sum of the integrals. Each term can be handled on its own and the results added.',
              ),
              maths('\\int \\left(f + g\\right) \\, dx = \\int f \\, dx + \\int g \\, dx'),
              prose('So a polynomial is integrated term by term, the power rule applied to each.'),
              maths('\\int \\left(6x^{2} + 4x\\right) \\, dx = 2x^{3} + 2x^{2} + C'),
              prose(
                'One $C$ is enough however many terms there are. Each term would contribute its own constant, and a sum of constants is just another constant.',
              ),
            ),
            ask('int-sum'),
            ask('int-sum'),
            ask('int-sum+choice'),
            teach(
              prose('Subtraction behaves identically, since subtracting is adding a negative.'),
              maths('\\int \\left(10x^{4} - 3x^{2}\\right) \\, dx = 2x^{5} - x^{3} + C'),
              prose(
                'Keep each coefficient with its own term through the division. Mixing them up is easy once the indices differ, and writing the division out before simplifying prevents it.',
              ),
              prose(
                'The constant term is the one most often lost. In $\\int \\left(3x^{2} + 7\\right) \\, dx = x^{3} + 7x + C$ the 7 becomes $7x$ — it neither disappears nor merges into the $C$.',
              ),
            ),
            ask('int-sum'),
            ask('int-sum'),
            teach(
              prose(
                'Products and quotients have no such rule. Nothing says the integral of a product is the product of the integrals, and assuming it is a serious error.',
              ),
              maths('\\int x \\times x^{2} \\, dx = \\frac{x^{4}}{4} + C'),
              prose(
                'The way through is to simplify first: $x \\times x^{2}$ is $x^{3}$, and then the power rule applies. Multiply out, cancel, or rewrite until the integrand is a sum of powers.',
              ),
            ),
            ask('int-sum+choice'),
            ask('int-power'),
          ],
          skillCheck: [ask('int-sum', 2), ask('int-sum', 2), ask('int-sum', 2)],
        },
        {
          id: 'in-l1-negative',
          title: 'Negative Powers',
          slides: [
            teach(
              prose(
                'Nothing in the derivation of the power rule assumed the index was positive, and it holds for negative indices unchanged.',
              ),
              maths('\\int x^{-4} \\, dx = \\frac{x^{-3}}{-3} + C = -\\frac{1}{3x^{3}} + C'),
              prose(
                'Adding one to $-4$ gives $-3$, and the division is by $-3$. Both of those negatives are real and both have to be carried.',
              ),
              prose(
                'Rewriting a fraction as a negative power is usually the first move: $\\frac{1}{x^{4}}$ is $x^{-4}$, and only then does the rule apply.',
              ),
              prose(
                'Trying to integrate $\\frac{1}{x^{4}}$ while it is still written as a fraction is what leads to guessing. Convert, integrate, then convert back if a fraction is wanted.',
              ),
            ),
            ask('int-power', 2),
            ask('int-power', 2),
            ask('int-power+choice', 2),
            teach(
              prose(
                'There is exactly one index the rule cannot reach. Adding one to $-1$ gives zero, and the rule would divide by zero.',
              ),
              maths('\\int x^{-1} \\, dx = \\int \\frac{1}{x} \\, dx'),
              prose(
                'The answer is a logarithm — the one antiderivative in this family that is not a power at all.',
              ),
              maths('\\int \\frac{1}{x} \\, dx = \\ln|x| + C'),
              prose(
                'The modulus signs matter. $\\frac{1}{x}$ is defined for negative $x$ too, and $\\ln|x|$ covers both sides of zero where $\\ln x$ covers only one.',
              ),
            ),
            ask('int-power', 2),
            ask('int-power', 2),
            teach(
              prose(
                'So the complete picture is: every index goes through the power rule except $-1$, which goes to a logarithm.',
              ),
              maths(
                '\\int x^{n} \\, dx = \\frac{x^{n + 1}}{n + 1} + C \\quad \\left(n \\neq -1\\right)',
              ),
              prose(
                'Noticing that an index is $-1$ before starting saves a wasted attempt, so it is the first thing to check whenever an index is negative.',
              ),
            ),
            ask('int-power+choice', 2),
            ask('int-power', 2),
          ],
          skillCheck: [ask('int-power', 2), ask('int-power', 2), ask('int-power', 2)],
        },
        {
          id: 'in-l1-standard',
          title: 'Exponentials and Trigonometric Functions',
          slides: [
            teach(
              prose('Three more results come straight from reversing derivatives already known.'),
              maths('\\int e^{x} \\, dx = e^{x} + C'),
              prose(
                'The exponential is its own derivative, so it is its own antiderivative. Put a coefficient in the index and the chain rule brings that coefficient out in front when differentiating, so integration has to divide by it.',
              ),
              maths('\\int e^{kx} \\, dx = \\frac{e^{kx}}{k} + C'),
              prose(
                'Forgetting that division is the standard error, and differentiating the answer back exposes it at once — an extra factor of $k$ appears where none should be.',
              ),
            ),
            ask('int-exponential'),
            ask('int-exponential'),
            ask('int-exponential+choice'),
            teach(
              prose(
                'The trigonometric pair needs its signs kept straight, because they run opposite to the derivative pair.',
              ),
              maths('\\int \\sin(kx) \\, dx = -\\frac{\\cos(kx)}{k} + C'),
              maths('\\int \\cos(kx) \\, dx = \\frac{\\sin(kx)}{k} + C'),
              prose(
                'Under differentiation it is cosine that picks up the minus sign; under integration it is sine. Rather than memorising which way round it goes, differentiate your answer every time.',
              ),
              prose('The division by $k$ applies here too, for exactly the same chain-rule reason.'),
            ),
            ask('int-trig'),
            ask('int-trig'),
            teach(
              prose('These combine with everything already met, because integration splits over sums.'),
              maths(
                '\\int \\left(e^{2x} + \\sin(3x)\\right) \\, dx = \\frac{e^{2x}}{2} - \\frac{\\cos(3x)}{3} + C',
              ),
              prose(
                'Each term is handled by its own standard result and one $C$ covers the whole answer. From here on, most of integration is recognising which standard result a term belongs to.',
              ),
            ),
            ask('int-trig'),
            ask('int-exponential'),
          ],
          skillCheck: [ask('int-exponential', 2), ask('int-trig', 2), ask('int-trig', 2)],
        },
      ],
      levelCheck: [
        ask('int-antiderivative-family', 2),
        ask('int-power'),
        ask('int-power', 2),
        ask('int-sum', 2),
        ask('int-exponential', 2),
        ask('int-trig', 2),
        ask('int-sum', 2),
        ask('int-power'),
        ask('int-trig', 2),
        ask('int-exponential', 2),
        ask('int-power', 2),
        ask('int-antiderivative-family', 2),
      ],
    },
    {
      id: 'in-l2',
      title: 'Definite Integrals and Area',
      lessons: [
        {
          id: 'in-l2-definite',
          title: 'The Definite Integral',
          slides: [
            teach(
              prose(
                'Writing numbers on the integral sign changes the question entirely. An indefinite integral answers with a function; a **definite integral** answers with a number.',
              ),
              maths('\\int_{a}^{b} f(x) \\, dx = F(b) - F(a)'),
              prose(
                'Here $F$ is any antiderivative of $f$. Integrate as usual, substitute the top number, substitute the bottom number, subtract.',
              ),
              maths('\\int_{1}^{3} 6x^{2} \\, dx = \\left[2x^{3}\\right]_{1}^{3} = 54 - 2 = 52'),
              prose(
                'The square brackets with limits attached are standard notation for "this antiderivative, about to be evaluated at these two points".',
              ),
            ),
            ask('int-definite-power'),
            ask('int-definite-power'),
            ask('int-definite-power+choice'),
            teach(
              prose(
                'The constant of integration disappears, and not by being forgotten. Whatever $C$ is, it is added at the top and subtracted at the bottom.',
              ),
              maths('\\left(F(b) + C\\right) - \\left(F(a) + C\\right) = F(b) - F(a)'),
              prose(
                'So a definite integral genuinely does not need a $C$. This is the one place where leaving it out is correct.',
              ),
              prose(
                'Upper minus lower, in that order. Reversing the subtraction gives an answer of the right size with the wrong sign, which is the most common error in this whole level.',
              ),
            ),
            ask('int-definite-power'),
            ask('int-definite-power'),
            teach(
              prose('Bracket the lower value before subtracting it, especially when it is negative.'),
              maths('\\left[x^{2}\\right]_{-2}^{1} = 1 - \\left(4\\right) = -3'),
              prose(
                'Without the bracket the minus sign attaches to only part of the expression, and the answer comes out wrong by exactly twice the lower value. Writing the bracket costs nothing and removes the risk.',
              ),
            ),
            ask('int-definite-power+choice'),
            ask('int-definite-power'),
          ],
          skillCheck: [
            ask('int-definite-power', 2),
            ask('int-definite-power', 2),
            ask('int-definite-power', 2),
          ],
        },
        {
          id: 'in-l2-lines',
          title: 'Integrating a Straight Line',
          slides: [
            teach(
              prose(
                'A straight line is the simplest integrand with two terms, which makes it the right place to practise the arithmetic of limits.',
              ),
              maths(
                '\\int_{0}^{4} \\left(2x + 3\\right) \\, dx = \\left[x^{2} + 3x\\right]_{0}^{4} = 28 - 0 = 28',
              ),
              prose(
                'Both terms are integrated, the whole bracket is evaluated at each limit, and the two totals are subtracted once at the end.',
              ),
              prose(
                'Do not subtract term by term as you go. Evaluate the bracket at the top, evaluate it at the bottom, then subtract — one subtraction, done last.',
              ),
            ),
            ask('int-definite-sum'),
            ask('int-definite-sum'),
            ask('int-definite-sum+choice'),
            teach(
              prose('Negative limits and negative results are both perfectly ordinary here.'),
              maths(
                '\\int_{-1}^{2} \\left(4x - 6\\right) \\, dx = \\left[2x^{2} - 6x\\right]_{-1}^{2} = -4 - \\left(8\\right) = -12',
              ),
              prose(
                'At $x = -1$ the bracket gives $2 + 6 = 8$, and subtracting that from $-4$ gives $-12$. The bracket is doing real work in that step.',
              ),
              prose(
                'A negative answer is not a mistake. It means the line spent more of the interval below the axis than above it — the integral is a signed total.',
              ),
            ),
            ask('int-definite-sum'),
            ask('int-definite-sum'),
            teach(
              prose(
                'Whenever the integrand is a straight line a sanity check is available, because the region is a triangle or a trapezium and its area can be found without calculus.',
              ),
              maths('\\int_{0}^{4} 2x \\, dx = 16 \\qquad \\frac{1}{2} \\times 4 \\times 8 = 16'),
              prose(
                'The triangle has base 4 and height $2 \\times 4 = 8$. Agreement between the two methods is good evidence the limits were handled correctly.',
              ),
            ),
            ask('int-definite-sum+choice'),
            ask('int-definite-power'),
          ],
          skillCheck: [
            ask('int-definite-sum', 2),
            ask('int-definite-sum', 2),
            ask('int-definite-sum', 2),
          ],
        },
        {
          id: 'in-l2-area',
          title: 'Area Under a Curve',
          slides: [
            teach(
              prose(
                'So far the definite integral has been arithmetic on an antiderivative. Its meaning is geometric: it measures the area between the curve and the $x$-axis, between the two limits.',
              ),
              maths('\\text{area} = \\int_{a}^{b} y \\, dx'),
              prose(
                'This is why integration exists. Areas under straight lines can be found with triangles; areas under curves cannot, and before calculus there was no general method at all.',
              ),
              prose(
                'An area question is therefore a definite integral question with extra reading: identify the curve, identify the two $x$ values bounding the region, integrate between them.',
              ),
              prose(
                'The limits come from the question, and often from where the curve meets the axis — which means solving $y = 0$ first.',
              ),
            ),
            ask('int-area-under'),
            ask('int-area-under'),
            ask('int-area-under+choice'),
            teach(
              prose('The method in order: write the integral, integrate, evaluate at both limits, subtract.'),
              maths('\\int_{0}^{3} 3x^{2} \\, dx = \\left[x^{3}\\right]_{0}^{3} = 27 - 0 = 27'),
              // The area this integral computes: y = 3x^2, shaded from x = 0
              // to x = 3.
              graph({
                xMin: -0.3,
                xMax: 3.3,
                curves: [{ f: (x) => 3 * x * x }],
                shade: { f: (x) => 3 * x * x, from: 0, to: 3 },
                yMin: 0,
                yMax: 28,
                label: 'The area under y = 3x^2 between x = 0 and x = 3',
              }),
              prose(
                'With a lower limit of 0 the second term usually vanishes, which is why so many worked answers look short. Write the subtraction down anyway — skipping it is the habit that fails as soon as the lower limit moves.',
              ),
              prose(
                'Area is measured in square units, so an answer of 27 means 27 square units whatever the axes are labelled.',
              ),
            ),
            ask('int-area-under'),
            ask('int-area-under'),
            teach(
              prose(
                'Two warnings before the next lesson. First, this works only while the curve stays above the axis.',
              ),
              prose(
                'Second, "area under the curve" always means between the curve and the $x$-axis unless a question says otherwise. Area between two curves is a different calculation.',
              ),
              maths('\\int_{a}^{b} \\left(y_{1} - y_{2}\\right) \\, dx'),
              prose(
                'It is the same idea applied twice: integrate the upper curve, integrate the lower one, and the difference is what lies between them.',
              ),
            ),
            ask('int-area-under+choice'),
            ask('int-definite-power'),
          ],
          skillCheck: [ask('int-area-under', 2), ask('int-area-under', 2), ask('int-area-under', 2)],
        },
        {
          id: 'in-l2-properties',
          title: 'Properties of the Integral',
          slides: [
            teach(
              prose(
                'Two properties follow immediately from $F(b) - F(a)$, and both save real work.',
              ),
              prose(
                'Swapping the limits swaps which value is subtracted from which, so the result changes sign and nothing else about it changes.',
              ),
              maths('\\int_{b}^{a} f(x) \\, dx = -\\int_{a}^{b} f(x) \\, dx'),
              prose(
                'One consequence is worth noting: an integral from a point to itself is zero, because it equals its own negative.',
              ),
              maths('\\int_{a}^{a} f(x) \\, dx = 0'),
            ),
            ask('int-properties'),
            ask('int-definite-sum'),
            ask('int-properties'),
            teach(
              prose('The second property splits an interval at any point inside it.'),
              maths(
                '\\int_{a}^{c} f(x) \\, dx = \\int_{a}^{b} f(x) \\, dx + \\int_{b}^{c} f(x) \\, dx',
              ),
              prose(
                'Evaluating the right-hand side gives $\\left(F(b) - F(a)\\right) + \\left(F(c) - F(b)\\right)$, and the two copies of $F(b)$ cancel.',
              ),
              prose(
                'This is what makes it possible to handle a curve that changes behaviour partway along: split at the point where it changes and treat each piece separately.',
              ),
            ),
            ask('int-properties'),
            ask('int-properties'),
            teach(
              prose('Constants come out of an integral, and sums split into separate integrals.'),
              maths('\\int_{a}^{b} k f(x) \\, dx = k \\int_{a}^{b} f(x) \\, dx'),
              prose(
                'Products do not. No rule turns the integral of $fg$ into anything built from the integral of $f$ and the integral of $g$, and inventing one is a common and costly mistake.',
              ),
              prose(
                'These properties concern the limits and the linearity, not the function. They hold whatever $f$ is, which is why they can be used before knowing how to integrate it.',
              ),
            ),
            ask('int-properties'),
            ask('int-definite-sum'),
          ],
          skillCheck: [ask('int-properties', 2), ask('int-properties', 2), ask('int-properties', 2)],
        },
        {
          id: 'in-l2-below',
          title: 'Area Below the Axis',
          slides: [
            teach(
              prose(
                'Where a curve lies below the $x$-axis its $y$ values are negative, so the integral over that stretch comes out negative.',
              ),
              maths(
                '\\int_{0}^{2} \\left(x - 2\\right) \\, dx = \\left[\\frac{x^{2}}{2} - 2x\\right]_{0}^{2} = -2',
              ),
              prose(
                'An area of $-2$ is meaningless, because area is a measurement. What the integral gives is a **signed** total, counting anything below the axis as negative.',
              ),
              // y = x - 2 runs from -2 at x = 0 to 0 at x = 2: the whole
              // shaded region sits below the axis.
              graph({
                xMin: -0.3,
                xMax: 2.6,
                curves: [{ f: (x) => x - 2 }],
                shade: { f: (x) => x - 2, from: 0, to: 2 },
                yMin: -2.4,
                yMax: 0.6,
                label: 'The region between y = x - 2 and the axis, from x = 0 to x = 2, lying below it',
              }),
              prose('So for an area, take the size of the integral and drop the sign: here it is 2.'),
            ),
            ask('int-signed-area'),
            ask('int-definite-sum'),
            ask('int-signed-area'),
            teach(
              prose(
                'The real trap is a curve that crosses the axis inside the interval. Integrating straight through lets the positive and negative parts cancel.',
              ),
              maths('\\int_{-2}^{2} x^{3} \\, dx = 0'),
              // y = x^3 from -2 to 2: one lobe below the axis, one above,
              // matched in size — the cancellation the next line names.
              graph({
                xMin: -2.3,
                xMax: 2.3,
                curves: [{ f: (x) => x * x * x }],
                shade: { f: (x) => x * x * x, from: -2, to: 2 },
                yMin: -9,
                yMax: 9,
                label: 'y = x^3 shaded from x = -2 to x = 2: equal lobes above and below the axis',
              }),
              prose(
                'That zero is correct as a signed total and useless as an area: the two halves are equal in size and opposite in sign.',
              ),
              prose(
                'The fix is to split at the crossing point. Solve $y = 0$ to find it, integrate each piece separately, then add the sizes.',
              ),
            ),
            ask('int-signed-area'),
            ask('int-definite-sum'),
            teach(
              prose(
                'The full method for a total area: find where the curve meets the axis, split the interval there, integrate each piece, take the size of each result, add.',
              ),
              maths(
                '\\text{total area} = \\left|\\int_{a}^{c} y \\, dx\\right| + \\left|\\int_{c}^{b} y \\, dx\\right|',
              ),
              prose(
                'Read the question carefully to know which is wanted. "Evaluate the integral" asks for the signed value; "find the area" asks for the unsigned total. They are different numbers and both get asked.',
              ),
            ),
            ask('int-signed-area'),
            ask('int-signed-area'),
          ],
          skillCheck: [ask('int-signed-area', 2), ask('int-signed-area', 2), ask('int-signed-area', 2)],
        },
      ],
      levelCheck: [
        ask('int-definite-power', 2),
        ask('int-definite-sum', 2),
        ask('int-area-under', 2),
        ask('int-properties', 2),
        ask('int-signed-area', 2),
        ask('int-definite-power', 2),
        ask('int-definite-sum', 2),
        ask('int-area-under', 2),
        ask('int-properties', 2),
        ask('int-signed-area', 2),
        ask('int-definite-power', 2),
        ask('int-definite-sum', 2),
      ],
    },
    {
      id: 'in-l3',
      title: 'Techniques of Integration',
      lessons: [
        {
          id: 'in-l3-brackets',
          title: 'Brackets Raised to a Power',
          slides: [
            teach(
              prose(
                'A bracket raised to a power can be integrated without multiplying it out, provided what is inside the bracket is linear.',
              ),
              maths(
                '\\int \\left(2x + 3\\right)^{4} \\, dx = \\frac{\\left(2x + 3\\right)^{5}}{5} \\times \\frac{1}{2} + C',
              ),
              prose(
                'Two steps: treat the bracket as though it were $x$ and apply the power rule, then divide by the coefficient of $x$ inside it.',
              ),
              maths(
                '\\int \\left(ax + b\\right)^{n} \\, dx = \\frac{\\left(ax + b\\right)^{n + 1}}{a\\left(n + 1\\right)} + C',
              ),
              prose(
                'That second division is there because differentiating would produce a factor of $a$ by the chain rule. The integral cancels it in advance.',
              ),
            ),
            ask('int-linear-bracket'),
            ask('int-linear-bracket'),
            ask('int-linear-bracket+choice'),
            teach(
              prose('Differentiating the answer shows exactly why both divisions are needed.'),
              maths(
                '\\frac{d}{dx}\\left(\\frac{\\left(2x + 3\\right)^{5}}{10}\\right) = \\frac{5\\left(2x + 3\\right)^{4} \\times 2}{10} = \\left(2x + 3\\right)^{4}',
              ),
              prose(
                'The 5 from the index and the 2 from the chain rule together make the 10 that was divided by.',
              ),
              prose(
                'Missing the division by $a$ is the characteristic error here. It cannot show up when $a = 1$, which is why a question with a coefficient of 1 proves nothing about whether the method is understood.',
              ),
            ),
            ask('int-linear-bracket'),
            ask('int-linear-bracket'),
            teach(
              prose(
                'The shortcut needs the inside to be linear. $\\left(x^{2} + 1\\right)^{4}$ cannot be done this way, because differentiating it produces a factor of $2x$ rather than a constant, and a factor containing $x$ cannot be divided out.',
              ),
              maths(
                '\\int \\left(x^{2} + 1\\right)^{4} \\, dx \\neq \\frac{\\left(x^{2} + 1\\right)^{5}}{10}',
              ),
              prose(
                'There is no fix by adjusting the coefficient. Either multiply the bracket out, or use the substitution of the next lesson, when the rest of the integrand happens to supply the missing $x$.',
              ),
            ),
            ask('int-linear-bracket+choice'),
            ask('int-linear-bracket'),
          ],
          skillCheck: [
            ask('int-linear-bracket', 2),
            ask('int-linear-bracket', 2),
            ask('int-linear-bracket', 2),
          ],
        },
        {
          id: 'in-l3-substitution',
          title: 'Substitution',
          slides: [
            teach(
              prose(
                'Substitution is the chain rule run backwards. It works when the integrand contains some function of $x$ alongside the derivative of that function.',
              ),
              maths('\\int 6x\\left(x^{2} + 1\\right)^{3} \\, dx'),
              prose(
                'Inside the bracket is $x^{2} + 1$, whose derivative is $2x$ — and there is an $x$ sitting outside the bracket. That pairing is what makes the method available.',
              ),
              prose(
                'Put $u = x^{2} + 1$. Then $\\frac{du}{dx} = 2x$, so $2x \\, dx$ can be replaced by $du$, and $6x \\, dx$ by $3 \\, du$.',
              ),
              maths(
                '\\int 6x\\left(x^{2} + 1\\right)^{3} \\, dx = 3\\int u^{3} \\, du = \\frac{3u^{4}}{4} + C',
              ),
            ),
            ask('int-substitution'),
            ask('int-substitution'),
            ask('int-substitution+choice'),
            teach(
              prose('The last step is to convert back, because the original question was about $x$.'),
              maths('\\frac{3u^{4}}{4} + C = \\frac{3\\left(x^{2} + 1\\right)^{4}}{4} + C'),
              prose(
                'An answer left in terms of $u$ answers a different question. It is the most commonly dropped step, and it costs the whole mark.',
              ),
              prose(
                'Check by differentiating: the chain rule gives $\\frac{3 \\times 4\\left(x^{2} + 1\\right)^{3} \\times 2x}{4} = 6x\\left(x^{2} + 1\\right)^{3}$, which is where we started.',
              ),
            ),
            ask('int-substitution'),
            ask('int-substitution'),
            teach(
              prose(
                'Choosing $u$ is the only judgement involved. Look for an inner function whose derivative is already present in the integrand, up to a constant factor.',
              ),
              prose(
                'A constant factor is no obstacle — $6x$ when $\\frac{du}{dx} = 2x$ simply leaves a 3 outside. An $x$ left over afterwards is a different matter, and means the substitution has failed.',
              ),
              maths(
                '\\int 2x\\left(x^{2} + 5\\right)^{6} \\, dx = \\frac{\\left(x^{2} + 5\\right)^{7}}{7} + C',
              ),
              prose(
                'With practice the bracket-and-its-derivative shape becomes recognisable on sight, and the working compresses to a single line.',
              ),
            ),
            ask('int-substitution+choice'),
            ask('int-linear-bracket'),
          ],
          skillCheck: [
            ask('int-substitution', 2),
            ask('int-substitution', 2),
            ask('int-substitution', 2),
          ],
        },
        {
          id: 'in-l3-parts',
          title: 'Integration by Parts',
          slides: [
            teach(
              prose(
                'By parts handles a product of two unrelated functions — the case substitution cannot reach, because neither factor is the derivative of the other.',
              ),
              maths('\\int u \\frac{dv}{dx} \\, dx = uv - \\int v \\frac{du}{dx} \\, dx'),
              prose(
                'It is the product rule rearranged, and it does not so much evaluate the integral as trade it for a different one. The trade is only worth making if the new integral is easier.',
              ),
              prose(
                'So the choice of which factor to call $u$ is the whole method: choose $u$ to be the factor that gets simpler when differentiated.',
              ),
            ),
            ask('int-by-parts'),
            ask('int-by-parts'),
            ask('int-by-parts+choice'),
            teach(
              prose(
                'For $\\int xe^{2x} \\, dx$, differentiating $x$ gives 1, which removes the $x$ from the second integral entirely. So $u = x$.',
              ),
              maths(
                'u = x \\quad \\frac{dv}{dx} = e^{2x} \\quad \\frac{du}{dx} = 1 \\quad v = \\frac{e^{2x}}{2}',
              ),
              maths(
                '\\int xe^{2x} \\, dx = \\frac{xe^{2x}}{2} - \\int \\frac{e^{2x}}{2} \\, dx = \\frac{xe^{2x}}{2} - \\frac{e^{2x}}{4} + C',
              ),
              prose(
                'The remaining integral is a standard result with no $x$ in front of it, which is exactly the simplification being aimed for.',
              ),
            ),
            ask('int-by-parts'),
            ask('int-by-parts'),
            teach(
              prose(
                'Choosing the other way round makes matters worse, and it is worth seeing why. With $u = e^{2x}$, the new integral contains $\\frac{x^{2}}{2}$ — a higher power than before.',
              ),
              prose('Apply by parts again and the power rises again. The method runs forever.'),
              prose(
                'For a polynomial times an exponential or a trigonometric function, the polynomial is always $u$. It differentiates down to a constant in finitely many steps, and that is what makes the method terminate.',
              ),
              maths(
                '\\int x\\sin(3x) \\, dx = -\\frac{x\\cos(3x)}{3} + \\frac{\\sin(3x)}{9} + C',
              ),
            ),
            ask('int-by-parts+choice'),
            // The last slide of the level: every technique has now been
            // taught, so the last question is choosing between them rather
            // than running one that has already been named.
            ask('int-choose-method'),
          ],
          skillCheck: [ask('int-by-parts', 2), ask('int-by-parts', 2), ask('int-by-parts', 2)],
        },
      ],
      levelCheck: [
        ask('int-linear-bracket', 2),
        ask('int-substitution', 2),
        ask('int-by-parts', 2),
        ask('int-linear-bracket', 2),
        ask('int-substitution', 2),
        ask('int-by-parts', 2),
        ask('int-linear-bracket', 2),
        ask('int-substitution', 2),
        ask('int-by-parts', 2),
        ask('int-linear-bracket', 2),
        ask('int-substitution', 2),
        ask('int-by-parts', 2),
      ],
    },
  ],
};
