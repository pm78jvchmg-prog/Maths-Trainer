/**
 * Integration.
 *
 * Level 1 builds integration as a question asked backwards — given a
 * derivative, what was differentiated? — which is where the constant of
 * integration comes from and why it cannot be dropped. Level 2 attaches limits
 * and turns the answer into a number, then into an area. Level 3 is the two
 * techniques that handle integrands the standard results cannot. Level 4 goes
 * back to area with a second curve in place of the axis: given limits, then
 * limits found where the curves meet, then curves that cross. Level 5 turns a
 * region about an axis and integrates the solid it sweeps out: set up, then
 * evaluated, then about the y-axis, then cones and hollow solids. Level 6
 * splits a fraction into partial fractions and integrates the parts to
 * logarithms: the split, the integral, limits and log laws, then top-heavy
 * fractions and repeated brackets. Level 7 takes a definite integral past the
 * ends the ordinary method can reach: infinite limits and unbounded
 * integrands, each put right by a limit, then which of them converge, then
 * integrals that have to be split to have one troublesome end per piece.
 * Level 8 goes back to where the area came from: rectangles under the curve,
 * their sum written in terms of the number of strips and taken to its limit,
 * an integral read off such a limit, which sums over- or under-estimate, and
 * the same area by the limit and by the antiderivative.
 *
 * Each level closes with a level check: twelve questions, no teaching slides,
 * one attempt each.
 */
import type { Block, Course, SlideRef } from '../types';
import { plotSvg } from '../figures';
import { betweenSvg, solidSvg, stripsSvg } from '../generators/integration';

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
            ask('int-term-tiles'),
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
            ask('int-power'),
            ask('int-check-answer'),
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
              [prose('Here is one to try that on. Differentiate what has been claimed before you decide.')],
              'int-check-answer',
            ),
            ask('int-term-tiles'),
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
            ask('int-term-tiles'),
            ask('int-power-tree'),
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
            ask('int-antiderivative-family'),
            ask('int-check-answer'),
            ask('int-term-tiles', 2),
            teach(
              prose('Two special cases are worth recognising on sight.'),
              maths('\\int 1 \\, dx = x + C \\qquad \\int x \\, dx = \\frac{x^{2}}{2} + C'),
              prose(
                'Both are just the rule with $n = 0$ and $n = 1$. Nothing is special about them except how often they turn up.',
              ),
            ),
            ask('int-antiderivative-family', 2),
            ask('int-check-answer'),
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
            ask('int-term-tiles'),
            ask('int-power-tree'),
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
            ask('int-sum-tree'),
            ask('int-constant-point'),
            ask('int-term-tiles', 2),
            teach(
              prose(
                'Products and quotients have no such rule. Nothing says the integral of a product is the product of the integrals, and assuming it is a serious error.',
              ),
              maths('\\int x \\times x^{2} \\, dx = \\frac{x^{4}}{4} + C'),
              prose(
                'The way through is to simplify first: $x \\times x^{2}$ is $x^{3}$, and then the power rule applies. Multiply out, cancel, or rewrite until the integrand is a sum of powers.',
              ),
            ),
            ask('int-power-tree', 2),
            ask('int-constant-point+choice', 2),
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
            ask('int-rewrite-power'),
            ask('int-which-rule'),
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
            ask('int-power+choice', 2),
            ask('int-check-answer', 2),
            ask('int-rewrite-power'),
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
            ask('int-which-rule'),
            ask('int-check-answer', 2),
          ],
          skillCheck: [ask('int-power', 2), ask('int-power', 2), ask('int-power', 2)],
        },
        {
          id: 'in-l1-roots',
          title: 'Roots and Fractional Powers',
          slides: [
            teach(
              prose(
                'The power rule was derived without assuming the index was a whole number, and it is not; a root is a fractional power, and the rule integrates it as soon as it is written that way.',
              ),
              maths('\\sqrt{x} = x^{1/2} \\qquad \\frac{1}{\\sqrt{x}} = x^{-1/2} \\qquad x\\sqrt{x} = x^{3/2}'),
              prose(
                'Then raise the index by one and divide by the new index, exactly as before; adding one to $\\frac{1}{2}$ gives $\\frac{3}{2}$, and dividing by $\\frac{3}{2}$ is multiplying by $\\frac{2}{3}$.',
              ),
              maths('\\int \\sqrt{x} \\, dx = \\int x^{1/2} \\, dx = \\frac{x^{3/2}}{3/2} + C = \\frac{2}{3}x^{3/2} + C'),
              prose(
                'Convert first, every time; trying to integrate a root while it is still written as a root is where the guessing starts, just as it was for fractions.',
              ),
            ),
            ask('int-root-power'),
            ask('int-rewrite-power', 2),
            ask('int-power'),
            teach(
              prose(
                'A root underneath a fraction is a negative fractional power and both negatives have to be carried: $\\frac{1}{\\sqrt{x}}$ is $x^{-1/2}$, adding one gives $\\frac{1}{2}$, and dividing by $\\frac{1}{2}$ doubles the coefficient.',
              ),
              maths('\\int \\frac{4}{\\sqrt{x}} \\, dx = \\int 4x^{-1/2} \\, dx = \\frac{4x^{1/2}}{1/2} + C = 8\\sqrt{x} + C'),
              prose(
                '$x$ multiplied by its own root is $x^{3/2}$, and $x$ under a root under a fraction is $x^{-3/2}$; adding one to $-\\frac{3}{2}$ gives $-\\frac{1}{2}$, and dividing by $-\\frac{1}{2}$ flips the sign.',
              ),
              maths('\\int \\frac{6}{x\\sqrt{x}} \\, dx = \\int 6x^{-3/2} \\, dx = \\frac{6x^{-1/2}}{-1/2} + C = -\\frac{12}{\\sqrt{x}} + C'),
              prose(
                'Either the index-form answer or the answer written back under a square root is accepted — the checker compares values, not the shape they are written in. So $\\frac{2}{3}x^{3/2}$ and $\\frac{2}{3}\\sqrt{x^{3}}$ are the same answer.',
              ),
            ),
            ask('int-root-power+choice', 2),
            ask('int-term-tiles', 2),
            ask('int-rewrite-power', 2),
            teach(
              prose(
                'Check by differentiating, as always: $-12x^{-1/2}$ differentiates to $6x^{-3/2}$, the minus from the index cancelling the minus in front, and when the signs are right the check says so at once.',
              ),
              prose(
                'The index that cannot be reached is still $-1$, and $-\\frac{1}{2}$ is not it; every fractional index goes through the power rule, and $x^{5/2}$ is no different from $x^{3/2}$ except in the arithmetic of the fraction.',
              ),
              prose(
                'The arithmetic is the whole difficulty here; write the division by the new index out as a fraction before simplifying, and the coefficient takes care of itself.',
              ),
            ),
            ask('int-power', 2),
            ask('int-term-tiles', 2),
          ],
          skillCheck: [
            ask('int-root-power', 2),
            ask('int-root-power+choice', 2),
            ask('int-root-power', 2),
          ],
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
            ask('int-trig'),
            ask('int-standard-tiles'),
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
            ask('int-exponential+choice'),
            ask('int-which-rule', 2),
            ask('int-trig', 2),
            teach(
              prose('These combine with everything already met, because integration splits over sums.'),
              maths(
                '\\int \\left(e^{2x} + \\sin(3x)\\right) \\, dx = \\frac{e^{2x}}{2} - \\frac{\\cos(3x)}{3} + C',
              ),
              prose(
                'Each term is handled by its own standard result and one $C$ covers the whole answer. From here on, most of integration is recognising which standard result a term belongs to.',
              ),
            ),
            ask('int-standard-tiles', 2),
            ask('int-which-rule', 2),
          ],
          skillCheck: [ask('int-exponential', 2), ask('int-trig', 2), ask('int-trig', 2)],
        },
      ],
      levelCheck: [
        ask('int-antiderivative-family', 2),
        ask('int-power'),
        ask('int-power', 2),
        ask('int-sum', 2),
        ask('int-root-power', 2),
        ask('int-exponential', 2),
        ask('int-trig', 2),
        ask('int-sum', 2),
        ask('int-root-power', 2),
        ask('int-power'),
        ask('int-trig', 2),
        ask('int-exponential', 2),
        ask('int-power', 2),
        ask('int-root-power', 2),
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
            ask('int-limits-tiles'),
            ask('int-definite-tree'),
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
            ask('int-definite-power+choice'),
            ask('int-power', 2),
            ask('int-limits-tiles', 2),
            teach(
              prose('Bracket the lower value before subtracting it, especially when it is negative.'),
              maths('\\left[x^{2}\\right]_{-2}^{1} = 1 - \\left(4\\right) = -3'),
              prose(
                'Without the bracket the minus sign attaches to only part of the expression, and the answer comes out wrong by exactly twice the lower value. Writing the bracket costs nothing and removes the risk.',
              ),
            ),
            ask('int-definite-tree', 2),
            ask('int-power+choice', 2),
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
            ask('int-limits-tiles'),
            ask('int-sum'),
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
            ask('int-definite-sum+choice'),
            ask('int-definite-steps'),
            ask('int-limits-tiles', 2),
            teach(
              prose(
                'Whenever the integrand is a straight line a sanity check is available, because the region is a triangle or a trapezium and its area can be found without calculus.',
              ),
              maths('\\int_{0}^{4} 2x \\, dx = 16 \\qquad \\frac{1}{2} \\times 4 \\times 8 = 16'),
              prose(
                'The triangle has base 4 and height $2 \\times 4 = 8$. Agreement between the two methods is good evidence the limits were handled correctly.',
              ),
            ),
            ask('int-sum+choice'),
            ask('int-definite-steps+choice', 2),
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
            ask('int-definite-tree'),
            ask('int-area-slider'),
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
            ask('int-area-under+choice'),
            ask('int-limits-tiles'),
            ask('int-definite-tree', 2),
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
            ask('int-area-slider', 2),
            ask('int-limits-tiles', 2),
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
            ask('int-limits-tiles'),
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
            ask('int-properties', 2),
            ask('int-definite-steps'),
            ask('int-definite-sum', 2),
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
            ask('int-limits-tiles', 2),
            ask('int-definite-steps+choice', 2),
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
            ask('int-definite-tree'),
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
            ask('int-signed-area', 2),
            ask('int-area-under'),
            ask('int-definite-sum', 2),
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
            ask('int-definite-tree', 2),
            ask('int-area-under+choice', 2),
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
            ask('int-bracket-tree'),
            ask('int-term-tiles', 2),
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
            ask('int-linear-bracket+choice'),
            ask('int-power', 2),
            ask('int-bracket-tree', 2),
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
            ask('int-term-tiles', 2),
            ask('int-power', 2),
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
            ask('int-substitution-tiles'),
            ask('int-bracket-tree'),
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
            ask('int-substitution+choice'),
            ask('int-linear-bracket', 2),
            ask('int-substitution-tiles', 2),
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
            ask('int-bracket-tree', 2),
            ask('int-linear-bracket', 2),
          ],
          skillCheck: [
            ask('int-substitution', 2),
            ask('int-substitution', 2),
            ask('int-substitution', 2),
          ],
        },
        {
          id: 'in-l3-shapes',
          title: 'Spotting the Substitution',
          slides: [
            teach(
              prose(
                'The last lesson used one shape, $x$ outside a bracket containing $x^{2}$; the pattern is more general: substitution works whenever the integrand contains a function of $x$ alongside its derivative, up to a constant factor.',
              ),
              maths('\\int 4x^{2}\\left(x^{3} + 1\\right)^{2} \\, dx'),
              prose(
                'Inside the bracket is $x^{3} + 1$, whose derivative is $3x^{2}$; the $x^{2}$ outside is that derivative up to the constant $3$, so $u = x^{3} + 1$, $\\frac{du}{dx} = 3x^{2}$, and $4x^{2} \\, dx = \\frac{4}{3} \\, du$.',
              ),
              maths(
                '\\int 4x^{2}\\left(x^{3} + 1\\right)^{2} \\, dx = \\frac{4}{3}\\int u^{2} \\, du = \\frac{4u^{3}}{9} + C = \\frac{4\\left(x^{3} + 1\\right)^{3}}{9} + C',
              ),
              prose(
                'The division by $3$ is the new step; it comes from $\\frac{du}{dx}$, so a cube inside the bracket means dividing by $3$ where a square meant dividing by $2$.',
              ),
            ),
            ask('int-substitution-general'),
            ask('int-substitution-tiles'),
            ask('int-choose-method'),
            teach(
              prose(
                'The bracket need not be a bracket: any function with its derivative alongside will do, and two cases turn up constantly.',
              ),
              maths('\\int xe^{x^{2}} \\, dx = \\frac{e^{x^{2}}}{2} + C'),
              prose(
                'Here $u = x^{2}$: the derivative $2x$ is there up to a factor of $2$, and $\\int e^{u} \\, du$ is just $e^{u}$.',
              ),
              maths('\\int \\cos(x)\\sin^{3}(x) \\, dx = \\frac{\\sin^{4}(x)}{4} + C'),
              prose(
                'Here $u = \\sin(x)$, because $\\cos(x)$ is its derivative, and a power of $\\sin(x)$ integrates like a power of $u$; with the roles swapped, $u = \\cos(x)$ has derivative $-\\sin(x)$, so a minus sign appears in the answer.',
              ),
            ),
            ask('int-substitution-general+choice', 2),
            ask('int-substitution', 2),
            ask('int-substitution-tiles', 2),
            teach(
              prose(
                'The test is always the same: pick the inner function, differentiate it, and look for that derivative in what is left over; a constant factor is no obstacle, a missing power of $x$ is fatal.',
              ),
              prose(
                '$\\int \\left(x^{3} + 1\\right)^{2} \\, dx$ has no $x^{2}$ outside the bracket, so substitution leaves an $x^{2}$ stranded and gains nothing; for that one, multiply the bracket out.',
              ),
              prose(
                'Which $u$ to try is the only judgement here, and the worked solutions on every question name it; if the substitution you choose leaves any $x$ behind, it was the wrong one.',
              ),
            ),
            ask('int-choose-method', 2),
            ask('int-substitution', 2),
          ],
          skillCheck: [
            ask('int-substitution-general', 2),
            ask('int-substitution-general+choice', 2),
            ask('int-substitution-general', 2),
          ],
        },
        {
          id: 'in-l3-definite-substitution',
          title: 'Substitution with Limits',
          slides: [
            teach(
              prose(
                'A definite integral by substitution can be done two ways and one is a trap; the safe way changes the limits along with the variable: once $u$ replaces $x$, the numbers on the integral sign must be $u$-values too.',
              ),
              maths('\\int_{0}^{2} 6x\\left(x^{2} + 1\\right)^{2} \\, dx'),
              prose(
                'Put $u = x^{2} + 1$, so $\\frac{du}{dx} = 2x$ and $6x \\, dx$ becomes $3 \\, du$; then convert the limits: at $x = 0$, $u = 1$; at $x = 2$, $u = 5$.',
              ),
              maths(
                '\\int_{0}^{2} 6x\\left(x^{2} + 1\\right)^{2} \\, dx = 3\\int_{1}^{5} u^{2} \\, du = \\left[u^{3}\\right]_{1}^{5} = 125 - 1 = 124',
              ),
              prose(
                'No converting back: the limits are now $u$-values and the answer is a number, so $x$ never reappears.',
              ),
            ),
            ask('int-definite-substitution'),
            ask('int-limits-change'),
            ask('int-definite-tree'),
            teach(
              prose(
                'The trap is to write the antiderivative in $u$ and then use the $x$ limits on it; the working looks fine and the number is wrong.',
              ),
              maths('\\left[u^{3}\\right]_{0}^{2} = 8 \\qquad \\left[u^{3}\\right]_{1}^{5} = 124'),
              prose(
                'The first is the error, the second the answer; two habits prevent it: write the new limits on the integral sign the moment $u$ appears, and check that the final bracket is a $u$ bracket with $u$ limits or an $x$ bracket with $x$ limits, never a mixture.',
              ),
              prose(
                'A negative constant inside the bracket changes nothing about the method: $x^{2} - 2$ at $x = 1$ is $-1$, and an odd power of a negative number is negative, so carry the sign through the subtraction.',
              ),
            ),
            ask('int-definite-substitution+choice', 2),
            ask('int-substitution', 2),
            ask('int-limits-change', 2),
            teach(
              prose(
                'Converting back is still allowed: leave the limits as $x$-values, write the antiderivative in terms of $x$, and substitute those; it is the same arithmetic in a different order.',
              ),
              maths('\\left[\\left(x^{2} + 1\\right)^{3}\\right]_{0}^{2} = 125 - 1 = 124'),
              prose(
                'Both routes must give the same number, which makes the pair a useful check when there is time; but do one or the other, because changing the variable without changing the limits is the error, and it is the one to watch for.',
              ),
            ),
            ask('int-definite-tree', 2),
            ask('int-substitution+choice', 2),
          ],
          skillCheck: [
            ask('int-definite-substitution', 2),
            ask('int-definite-substitution+choice', 2),
            ask('int-definite-substitution', 2),
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
            ask('int-parts-tiles'),
            ask('int-choose-method'),
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
            ask('int-by-parts+choice'),
            ask('int-substitution', 2),
            ask('int-parts-tiles', 2),
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
            ask('int-choose-method', 2),
            // The last slide of the level: every technique has now been
            // taught, so the last question is choosing between them rather
            // than running one that has already been named.
            ask('int-substitution', 2),
          ],
          skillCheck: [ask('int-by-parts', 2), ask('int-by-parts', 2), ask('int-by-parts', 2)],
        },
        {
          id: 'in-l3-parts-log',
          title: 'By Parts with a Logarithm',
          slides: [
            teach(
              prose(
                'The last lesson said the polynomial is always $u$; that rule has one famous exception, the logarithm: $\\ln x$ has no standard integral to be $\\frac{dv}{dx}$, but its derivative $\\frac{1}{x}$ is about as simple as a function gets.',
              ),
              maths('u = \\ln x \\quad \\frac{dv}{dx} = x \\quad \\frac{du}{dx} = \\frac{1}{x} \\quad v = \\frac{x^{2}}{2}'),
              prose(
                'So for $\\int x\\ln x \\, dx$ the logarithm is $u$ and the power of $x$ is the part to integrate, the opposite of the choice for $xe^{2x}$.',
              ),
              maths(
                '\\int x\\ln x \\, dx = \\frac{x^{2}}{2}\\ln x - \\int \\frac{x^{2}}{2} \\times \\frac{1}{x} \\, dx = \\frac{x^{2}}{2}\\ln x - \\frac{x^{2}}{4} + C',
              ),
              prose(
                'The $\\frac{1}{x}$ from differentiating the logarithm cancels a power of $x$ in the second integral, which is what makes it easy; every question here works the same way.',
              ),
            ),
            ask('int-parts-log'),
            ask('int-parts-tiles'),
            ask('int-by-parts'),
            teach(
              prose(
                'A higher power changes only the numbers: with $x^{n}$, $v$ is $\\frac{x^{n+1}}{n+1}$, and the second integral is $\\frac{1}{n+1}\\int x^{n} \\, dx$, which is $\\frac{x^{n+1}}{(n+1)^{2}}$.',
              ),
              maths('\\int x^{2}\\ln x \\, dx = \\frac{x^{3}}{3}\\ln x - \\frac{x^{3}}{9} + C'),
              prose(
                'The denominator of the second term is the square of the first: $3$ and $9$, $4$ and $16$; writing $\\frac{x^{3}}{3}$ for both is the common slip, and differentiating the answer catches it, because the $\\ln x$ terms cancel only when the second denominator is the square.',
              ),
              maths('\\int \\ln x \\, dx = x\\ln x - \\int x \\times \\frac{1}{x} \\, dx = x\\ln x - x + C'),
              prose(
                'Even $\\ln x$ on its own goes by parts, with the trick of taking $\\frac{dv}{dx} = 1$; nothing else integrates $\\ln x$, and the result is worth remembering as a standard one.',
              ),
            ),
            ask('int-parts-log+choice', 2),
            ask('int-choose-method', 2),
            ask('int-parts-tiles', 2),
            teach(
              prose(
                'Differentiate $x\\ln x - x$ to see that it works: the product rule gives $\\ln x + 1$, and the $-x$ takes the $1$ away.',
              ),
              prose(
                'So the choice of $u$ has two rules, not one: a polynomial is $u$ against an exponential or a trigonometric function; a logarithm is $u$ against anything; both say the same thing, choose the factor that differentiates into something simpler.',
              ),
              prose('These questions are only posed for $x > 0$, where $\\ln x$ is defined.'),
            ),
            ask('int-by-parts', 2),
            ask('int-choose-method', 2),
          ],
          skillCheck: [
            ask('int-parts-log', 2),
            ask('int-parts-log+choice', 2),
            ask('int-parts-log', 2),
          ],
        },
      ],
      levelCheck: [
        ask('int-linear-bracket', 2),
        ask('int-substitution', 2),
        ask('int-by-parts', 2),
        ask('int-definite-substitution', 2),
        ask('int-substitution-general', 2),
        ask('int-parts-log', 2),
        ask('int-linear-bracket', 2),
        ask('int-substitution', 2),
        ask('int-by-parts', 2),
        ask('int-definite-substitution', 2),
        ask('int-substitution-general', 2),
        ask('int-parts-log', 2),
        ask('int-linear-bracket', 2),
        ask('int-definite-substitution', 2),
        ask('int-substitution-general', 2),
      ],
    },
    {
      id: 'in-l4',
      title: 'Area Between Curves',
      lessons: [
        {
          id: 'in-l4-between',
          title: 'The Area Between Two Curves',
          slides: [
            teach(
              prose(
                'Level 2 found the area between a curve and the $x$-axis. Now put a second curve where the axis was: the region is bounded above by one curve and below by another.',
              ),
              // The worked example below: y = x^2 + 4 over y = 2x - 1, from
              // x = 0 to x = 3, where the gap x^2 - 2x + 5 integrates to 15.
              {
                kind: 'diagram',
                svg: betweenSvg({
                  xMin: -0.6,
                  xMax: 3.6,
                  yMin: -2.5,
                  yMax: 14,
                  top: (x) => x * x + 4,
                  bottom: (x) => 2 * x - 1,
                  from: 0,
                  to: 3,
                  verticals: [0, 3],
                  label: 'The region between y = x^2 + 4 above and y = 2x - 1 below, from x = 0 to x = 3',
                }),
              },
              prose(
                'The area under the top curve is the region plus everything under the bottom curve. Take away the area under the bottom curve and the region is what is left.',
              ),
              maths('\\text{area} = \\int_{a}^{b} \\left(\\text{top} - \\text{bottom}\\right) dx'),
            ),
            askAfter(
              [prose('First the idea exactly as stated: two areas under two curves, one subtracted from the other.')],
              'int-between-tree',
            ),
            ask('int-between-given'),
            ask('int-which-above'),
            teach(
              prose(
                'Subtracting two integrals works, but it is quicker to subtract the curves first and integrate once.',
              ),
              maths('\\left(x^{2} + 4\\right) - \\left(2x - 1\\right)'),
              maths('= x^{2} - 2x + 5'),
              prose(
                'The bracket round the bottom curve is the step that goes wrong. Every term of it changes sign: $-(2x - 1)$ is $-2x + 1$, not $-2x - 1$.',
              ),
              maths('\\int_{0}^{3} \\left(x^{2} - 2x + 5\\right) dx'),
              maths('= \\left[\\frac{x^{3}}{3} - x^{2} + 5x\\right]_{0}^{3} = 15'),
            ),
            ask('int-between-tiles'),
            ask('int-between-given+choice'),
            ask('int-between-tree', 2),
            teach(
              prose(
                'The method needs to know which curve is on top. When the equations do not make it obvious, try a value of $x$ inside the interval and compare the two heights.',
              ),
              prose(
                'The axis plays no part. If one or both curves dip below it, top minus bottom is still the height of the region at every $x$, and its integral is still the area.',
              ),
              prose(
                'Taken the wrong way round, the integral comes out negative: the right size with the wrong sign. A negative area is the signal to check which curve is on top.',
              ),
            ),
            ask('int-between-tiles', 2),
            ask('int-which-above'),
          ],
          skillCheck: [
            ask('int-between-given', 2),
            ask('int-between-tiles', 2),
            ask('int-between-given', 2),
          ],
        },
        {
          id: 'in-l4-meeting',
          title: 'Where the Curves Meet',
          slides: [
            teach(
              prose(
                'Often no limits are given. The question asks for the region **enclosed** by two curves, and that region runs from one meeting point to the other.',
              ),
              // y = 2x + 1 over y = 2x^2 - 3, meeting at x = -1 and x = 2; the
              // enclosed area, worked on the next slide, is 9.
              {
                kind: 'diagram',
                svg: betweenSvg({
                  xMin: -1.8,
                  xMax: 2.8,
                  yMin: -3.8,
                  yMax: 7.5,
                  top: (x) => 2 * x + 1,
                  bottom: (x) => 2 * x * x - 3,
                  from: -1,
                  to: 2,
                  marks: [
                    { x: -1, y: -1 },
                    { x: 2, y: 5 },
                  ],
                  label: 'The line y = 2x + 1 and the parabola y = 2x^2 - 3 enclosing a region between x = -1 and x = 2',
                }),
              },
              prose('Where the curves meet they have the same $y$, so the limits come from setting them equal.'),
              maths('2x^{2} - 3 = 2x + 1'),
              maths('2x^{2} - 2x - 4 = 0'),
              maths('2(x + 1)(x - 2) = 0'),
              prose('So they meet at $x = -1$ and $x = 2$, and those are the limits.'),
            ),
            askAfter(
              [prose('Find the limits first. Set the curves equal, gather everything on one side, and factorise.')],
              'int-meet-points',
            ),
            ask('int-meet-slider'),
            ask('int-setup-integral'),
            teach(
              prose(
                'With the limits found, the rest is the method from the last lesson. Test a value between them: at $x = 0$ the line gives $1$ and the parabola $-3$, so the line is on top.',
              ),
              maths('\\left(2x + 1\\right) - \\left(2x^{2} - 3\\right)'),
              maths('= -2x^{2} + 2x + 4'),
              maths('\\left[-\\frac{2x^{3}}{3} + x^{2} + 4x\\right]_{-1}^{2}'),
              maths('= \\frac{20}{3} - \\left(-\\frac{7}{3}\\right) = 9'),
            ),
            ask('int-enclosed-area'),
            ask('int-meet-points'),
            ask('int-setup-integral'),
            teach(
              prose(
                'Fractions in the middle of the working are normal here. The answers in this level are chosen to come out whole, so a fraction at the end means a slip somewhere.',
              ),
              prose(
                'The whole method, in order: set the curves equal and solve for the limits; test a point between them to see which is on top; integrate top minus bottom from one limit to the other.',
              ),
            ),
            ask('int-enclosed-area+choice'),
            ask('int-meet-slider'),
          ],
          skillCheck: [
            ask('int-enclosed-area', 2),
            ask('int-setup-integral'),
            ask('int-enclosed-area', 2),
          ],
        },
        {
          id: 'in-l4-parabolas',
          title: 'Two Parabolas, and a Shortcut',
          slides: [
            teach(
              prose(
                'Two parabolas can enclose a region too. Nothing in the method changes: their difference is again a single quadratic, and once it is simplified the question is the one from the last lesson.',
              ),
              // y = 3 - x^2 over y = 2x^2, meeting at x = -1 and x = 1, with
              // an enclosed area of 4.
              {
                kind: 'diagram',
                svg: betweenSvg({
                  xMin: -1.9,
                  xMax: 1.9,
                  yMin: -0.6,
                  yMax: 4.2,
                  top: (x) => 3 - x * x,
                  bottom: (x) => 2 * x * x,
                  from: -1,
                  to: 1,
                  label: 'The parabolas y = 3 - x^2 and y = 2x^2 enclosing a region between x = -1 and x = 1',
                }),
              },
              maths('2x^{2} = 3 - x^{2}, \\quad x = \\pm 1'),
              maths('\\int_{-1}^{1} \\left(3 - 3x^{2}\\right) dx'),
              maths('= \\left[3x - x^{3}\\right]_{-1}^{1} = 4'),
            ),
            ask('int-meet-points', 2),
            ask('int-parabolas-area'),
            ask('int-meet-slider', 2),
            teach(
              prose(
                'In every enclosed region so far, top minus bottom has been a quadratic that is zero at both limits. Any such quadratic can be written as $k(x - p)(q - x)$, where $p$ and $q$ are the meeting points, and its integral between them is always the same shape of number.',
              ),
              maths('\\int_{p}^{q} k(x - p)(q - x) \\, dx'),
              maths('= \\frac{k}{6}(q - p)^{3}'),
              prose(
                'Here $3 - 3x^{2} = 3(x + 1)(1 - x)$, so $k = 3$ and the width is $2$: the area is $\\frac{3}{6} \\times 2^{3} = 4$, as before.',
              ),
            ),
            askAfter(
              [prose('The shortcut, one piece at a time.')],
              'int-sixth-rule',
            ),
            ask('int-parabolas-area+choice', 2),
            ask('int-meet-slider', 2),
            teach(
              prose(
                'The $k$ in the rule is the coefficient in top minus bottom, upper curve first. Written the other way round it comes out negative, and so does the answer.',
              ),
              prose(
                'It applies only to a quadratic gap that is zero at both limits: a curve and a line, or two parabolas, enclosing a region. Use it as a check on the long way, or as the fast way when only the number is wanted. With limits that are not meeting points, integrate as usual.',
              ),
            ),
            askAfter(
              [prose('The same rule with nothing written down: work it out in your head.')],
              'int-sixth-rule+choice',
              2,
            ),
            ask('int-meet-points', 2),
          ],
          skillCheck: [
            ask('int-parabolas-area', 2),
            ask('int-sixth-rule+choice', 2),
            ask('int-parabolas-area', 2),
          ],
        },
        {
          id: 'in-l4-crossing',
          title: 'When the Curves Cross',
          slides: [
            teach(
              prose(
                'So far one curve has stayed on top. When the curves cross inside the interval they swap over: the first is higher on one side of the crossing, the second on the other.',
              ),
              // y = x^2 and y = x^2 - 2x + 2 cross at x = 1; from 0 to 2 the
              // two halves are equal and opposite.
              {
                kind: 'diagram',
                svg: betweenSvg({
                  xMin: -0.4,
                  xMax: 2.4,
                  yMin: -0.6,
                  yMax: 5,
                  top: (x) => x * x,
                  bottom: (x) => x * x - 2 * x + 2,
                  from: 0,
                  to: 2,
                  verticals: [0, 2],
                  marks: [{ x: 1, y: 1 }],
                  label: 'y = x^2 and y = x^2 - 2x + 2 crossing at x = 1, with the region between them from x = 0 to x = 2',
                }),
              },
              prose(
                'Integrating straight through then goes wrong. Here $x^{2} - \\left(x^{2} - 2x + 2\\right) = 2x - 2$, which is negative before the crossing and positive after it.',
              ),
              maths('\\int_{0}^{2} \\left(2x - 2\\right) dx'),
              maths('= \\left[x^{2} - 2x\\right]_{0}^{2} = 0'),
              prose('Zero, for a region that plainly has area. The two halves are the same size and opposite in sign.'),
            ),
            askAfter(
              [prose('What the integral straight through counts, and what the area counts.')],
              'int-net-between',
            ),
            ask('int-crossing-pieces'),
            ask('int-region-flow'),
            teach(
              prose(
                'The fix is the one from Area Below the Axis: split the interval at the crossing point, integrate the difference over each piece, and add the sizes.',
              ),
              maths('\\int_{0}^{1} \\left(2x - 2\\right) dx = -1'),
              maths('\\int_{1}^{2} \\left(2x - 2\\right) dx = 1'),
              prose(
                'So the area is $1 + 1 = 2$. To find a crossing point, solve $y_1 = y_2$ as before: a solution strictly inside the interval is where to split, and one outside it can be ignored.',
              ),
            ),
            ask('int-crossing-area'),
            ask('int-region-flow', 2),
            ask('int-crossing-pieces', 2),
            teach(
              prose(
                'Read the question for which number it wants. The integral from end to end is a **signed** total that counts the swapped stretch as negative; the area counts every piece as positive.',
              ),
              prose(
                'The full method: find where the curves meet; if a meeting point falls inside the interval, split there; integrate top minus bottom over each piece, or take the size of each result; add.',
              ),
            ),
            ask('int-crossing-area+choice', 2),
            ask('int-net-between', 2),
          ],
          skillCheck: [
            ask('int-crossing-area', 2),
            ask('int-crossing-area+choice', 2),
            ask('int-crossing-area', 2),
          ],
        },
      ],
      levelCheck: [
        ask('int-between-given', 2),
        ask('int-which-above', 2),
        ask('int-meet-points', 2),
        ask('int-enclosed-area', 2),
        ask('int-between-tree', 2),
        ask('int-setup-integral', 2),
        ask('int-parabolas-area', 2),
        ask('int-sixth-rule+choice', 2),
        ask('int-crossing-area', 2),
        ask('int-net-between', 2),
        ask('int-crossing-pieces', 2),
        ask('int-region-flow', 2),
        ask('int-between-tiles', 2),
        ask('int-enclosed-area+choice', 2),
      ],
    },
    {
      id: 'in-l5',
      title: 'Volumes of Revolution',
      lessons: [
        {
          id: 'in-l5-solids',
          title: 'Solids of Revolution',
          slides: [
            teach(
              prose(
                'Turn a flat region a full turn, $360^{\\circ}$, about the $x$-axis and it sweeps out a solid: a **solid of revolution**.',
              ),
              // y = sqrt(x) from 0 to 4, whose volume, worked in the next
              // lesson, is 8 pi.
              {
                kind: 'diagram',
                svg: solidSvg({
                  xMin: -0.4,
                  xMax: 4.6,
                  yMin: -2.6,
                  yMax: 2.6,
                  top: (x) => Math.sqrt(x),
                  from: 0,
                  to: 4,
                  axis: 'x',
                  edges: [{ f: (x) => Math.sqrt(x), from: 0, to: 4 }],
                  rims: [{ at: 4, radius: 2 }],
                  label: 'The region under y = square root of x from x = 0 to x = 4, and the solid it sweeps out about the x-axis',
                }),
              },
              prose(
                'Here the region under $y = \\sqrt{x}$ from $x = 0$ to $x = 4$ makes a rounded, bullet-shaped solid. The dashed curve is where the edge ends up half a turn later.',
              ),
              prose(
                'Cut the solid straight across at any $x$ and the cut face is a circle. Its radius is the height of the curve there, $y$.',
              ),
            ),
            ask('int-vol-shape'),
            ask('int-vol-slice'),
            ask('int-vol-disc-area'),
            teach(
              prose(
                'Slice the whole solid into thin discs. The disc at $x$ has area $\\pi y^{2}$, so one $\\delta x$ thick has volume about $\\pi y^{2} \\, \\delta x$.',
              ),
              maths('V \\approx \\sum \\pi y^{2} \\, \\delta x'),
              prose('As the slices get thinner the sum becomes an integral, exactly as a sum of thin strips became an area.'),
              maths('V = \\pi \\int_{a}^{b} y^{2} \\, dx'),
            ),
            ask('int-vol-setup'),
            ask('int-vol-integrand'),
            ask('int-vol-slice', 2),
            teach(
              prose(
                'Two slips to avoid. The radius is squared, so the integrand is $y^{2}$, not $y$. And $y^{2}$ means the whole of $y$ squared: $\\left(x + 3\\right)^{2}$ is $x^{2} + 6x + 9$, not $x^{2} + 9$.',
              ),
              prose(
                'The $\\pi$ is a constant, so it sits outside the integral, and it is usually left in the answer: $\\frac{26\\pi}{3}$ is exact, where $27.2$ is not.',
              ),
            ),
            ask('int-vol-integrand', 2),
            ask('int-vol-setup', 2),
          ],
          skillCheck: [
            ask('int-vol-setup', 2),
            ask('int-vol-integrand', 2),
            ask('int-vol-disc-area', 2),
          ],
        },
        {
          id: 'in-l5-x-axis',
          title: 'Rotating About the x-Axis',
          slides: [
            teach(
              prose('To find a volume, square the curve first, multiply it out, then integrate as usual.'),
              // y = x + 1 from 0 to 2, a frustum of volume 26 pi / 3.
              {
                kind: 'diagram',
                svg: solidSvg({
                  xMin: -0.4,
                  xMax: 2.6,
                  yMin: -3.6,
                  yMax: 3.6,
                  top: (x) => x + 1,
                  from: 0,
                  to: 2,
                  axis: 'x',
                  edges: [{ f: (x) => x + 1, from: 0, to: 2 }],
                  rims: [
                    { at: 0, radius: 1 },
                    { at: 2, radius: 3 },
                  ],
                  label: 'The region under y = x + 1 from x = 0 to x = 2, and the solid it sweeps out about the x-axis',
                }),
              },
              maths('V = \\pi \\int_{0}^{2} \\left(x + 1\\right)^{2} dx'),
              maths('= \\pi \\int_{0}^{2} \\left(x^{2} + 2x + 1\\right) dx'),
              maths('= \\pi \\left[\\frac{x^{3}}{3} + x^{2} + x\\right]_{0}^{2}'),
              maths('= \\frac{26\\pi}{3}'),
            ),
            ask('int-vol-square'),
            ask('int-vol-x-axis'),
            ask('int-vol-x-axis+choice'),
            teach(
              prose(
                'A square root in the curve is good news: squaring removes it, and what is left is often easier than any polynomial.',
              ),
              maths('y = \\sqrt{x}, \\quad y^{2} = x'),
              maths('\\pi \\int_{0}^{4} x \\, dx = \\pi \\left[\\frac{x^{2}}{2}\\right]_{0}^{4}'),
              maths('= 8\\pi'),
              prose('That is the volume of the bullet-shaped solid from the last lesson.'),
            ),
            ask('int-vol-root'),
            ask('int-vol-find-limit'),
            ask('int-vol-square', 2),
            teach(
              prose(
                'Working backwards: when the volume is given and a limit is not, leave the limit as a letter, integrate, and solve.',
              ),
              prose(
                'The region under $y = 2$ from $0$ to $h$ turns into a cylinder, and $\\pi \\int_{0}^{h} 4 \\, dx = 4\\pi h$. A volume of $20\\pi$ therefore means $h = 5$.',
              ),
              prose('Type $\\pi$ with its key, and a fraction with the fraction key: $\\frac{26\\pi}{3}$ is exactly how to leave it.'),
            ),
            ask('int-vol-root+choice'),
            ask('int-vol-find-limit', 2),
          ],
          skillCheck: [
            ask('int-vol-x-axis', 2),
            ask('int-vol-root+choice', 2),
            ask('int-vol-x-axis', 2),
          ],
        },
        {
          id: 'in-l5-y-axis',
          title: 'Rotating About the y-Axis',
          slides: [
            teach(
              prose(
                'Turn a region about the $y$-axis instead and the roles swap. The slices are stacked up the $y$-axis, and each radius is a distance across: an $x$ value.',
              ),
              // y = x^2 + 1 between y = 2 and y = 5, worked on the next slide:
              // 15 pi / 2.
              {
                kind: 'diagram',
                svg: solidSvg({
                  xMin: -2.6,
                  xMax: 2.6,
                  yMin: -0.5,
                  yMax: 5.6,
                  top: () => 5,
                  bottom: (x) => Math.max(2, x * x + 1),
                  from: 0,
                  to: 2,
                  axis: 'y',
                  edges: [{ f: (x) => x * x + 1, from: 1, to: 2 }],
                  rims: [
                    { at: 2, radius: 1 },
                    { at: 5, radius: 2 },
                  ],
                  label: 'The region between y = x^2 + 1, the y-axis and the lines y = 2 and y = 5, and the solid it sweeps out about the y-axis',
                }),
              },
              maths('V = \\pi \\int_{c}^{d} x^{2} \\, dy'),
              prose('The limits are heights now, and $x^{2}$ has to be written in terms of $y$ before integrating.'),
            ),
            ask('int-vol-rearrange'),
            ask('int-vol-y-radius'),
            ask('int-vol-axis-flow'),
            teach(
              prose(
                'The region in the picture lies between $y = x^{2} + 1$, the $y$-axis and the lines $y = 2$ and $y = 5$. Rearranging gives $x^{2} = y - 1$.',
              ),
              maths('V = \\pi \\int_{2}^{5} \\left(y - 1\\right) dy'),
              maths('= \\pi \\left[\\frac{y^{2}}{2} - y\\right]_{2}^{5}'),
              maths('= \\pi \\left(\\frac{15}{2} - 0\\right) = \\frac{15\\pi}{2}'),
            ),
            ask('int-vol-y-axis'),
            ask('int-vol-rearrange', 2),
            ask('int-vol-y-axis+choice'),
            teach(
              prose(
                'When the region is described by $x$ values, turn them into heights first: put each one into the curve.',
              ),
              prose(
                'Only $x^{2}$ is needed, never $x$ itself, so there is no square root to take. A line through the origin such as $y = \\frac{x}{2}$ turns into a cone standing on its tip, with $x = 2y$ and so $x^{2} = 4y^{2}$.',
              ),
            ),
            ask('int-vol-axis-flow', 2),
            ask('int-vol-y-radius', 2),
          ],
          skillCheck: [
            ask('int-vol-y-axis', 2),
            ask('int-vol-y-axis+choice', 2),
            ask('int-vol-rearrange', 2),
          ],
        },
        {
          id: 'in-l5-hollow',
          title: 'Cones and Hollow Solids',
          slides: [
            teach(
              prose(
                'A straight line through the origin turns into a cone, and integrating gives the formula you already know.',
              ),
              // y = x/2 from 0 to 4: a cone of radius 2 and height 4.
              {
                kind: 'diagram',
                svg: solidSvg({
                  xMin: -0.4,
                  xMax: 4.6,
                  yMin: -2.7,
                  yMax: 2.7,
                  top: (x) => x / 2,
                  from: 0,
                  to: 4,
                  axis: 'x',
                  edges: [{ f: (x) => x / 2, from: 0, to: 4 }],
                  rims: [{ at: 4, radius: 2 }],
                  label: 'The region under y = x/2 from x = 0 to x = 4, and the cone it sweeps out about the x-axis',
                }),
              },
              maths('\\pi \\int_{0}^{4} \\frac{x^{2}}{4} \\, dx = \\frac{16\\pi}{3}'),
              maths('\\frac{1}{3}\\pi r^{2} h = \\frac{1}{3}\\pi \\times 2^{2} \\times 4'),
              prose('The radius is the line\'s height at the wide end, and the third in the formula is the third from integrating $x^{2}$.'),
            ),
            ask('int-vol-cone'),
            ask('int-vol-cone-parts'),
            ask('int-vol-shape', 2),
            teach(
              prose(
                'Turn the region **between** two curves and the solid has a hole down it. Each slice is a washer: a disc of the outer radius with a disc of the inner radius taken out.',
              ),
              // Between y = 3 and y = x from 0 to 3: a cylinder with a cone
              // taken out, 27 pi - 9 pi = 18 pi.
              {
                kind: 'diagram',
                svg: solidSvg({
                  xMin: -0.4,
                  xMax: 3.6,
                  yMin: -3.8,
                  yMax: 3.8,
                  top: () => 3,
                  bottom: (x) => x,
                  from: 0,
                  to: 3,
                  axis: 'x',
                  edges: [
                    { f: () => 3, from: 0, to: 3 },
                    { f: (x) => x, from: 0, to: 3 },
                  ],
                  rims: [
                    { at: 0, radius: 3 },
                    { at: 3, radius: 3 },
                  ],
                  label: 'The region between y = 3 and y = x from x = 0 to x = 3, and the hollow solid it sweeps out about the x-axis',
                }),
              },
              maths('V = \\pi \\int_{a}^{b} \\left(y_1^{2} - y_2^{2}\\right) dx'),
              prose(
                'Here $y_1 = 3$ and $y_2 = x$: a cylinder with a cone taken out of it, $27\\pi - 9\\pi = 18\\pi$.',
              ),
            ),
            ask('int-vol-outer-inner'),
            ask('int-vol-washer'),
            ask('int-vol-cone+choice'),
            teach(
              prose(
                'The slip to avoid: $\\left(y_1 - y_2\\right)^{2}$ is not $y_1^{2} - y_2^{2}$. Square each curve, then subtract.',
              ),
              prose(
                'Both curves have to be on the same side of the axis, and $y_1$ is the one further from it. Test a value of $x$ between the limits if it is not obvious.',
              ),
            ),
            ask('int-vol-washer+choice', 2),
            ask('int-vol-outer-inner', 2),
          ],
          skillCheck: [
            ask('int-vol-washer', 2),
            ask('int-vol-cone', 2),
            ask('int-vol-washer+choice', 2),
          ],
        },
      ],
      levelCheck: [
        ask('int-vol-shape', 2),
        ask('int-vol-integrand', 2),
        ask('int-vol-x-axis', 2),
        ask('int-vol-find-limit', 2),
        ask('int-vol-setup', 2),
        ask('int-vol-square', 2),
        ask('int-vol-root', 2),
        ask('int-vol-y-radius', 2),
        ask('int-vol-axis-flow', 2),
        ask('int-vol-y-axis', 2),
        ask('int-vol-rearrange', 2),
        ask('int-vol-cone+choice', 2),
        ask('int-vol-outer-inner', 2),
        ask('int-vol-washer', 2),
      ],
    },
    {
      id: 'in-l6',
      title: 'Partial Fractions in Integration',
      lessons: [
        {
          id: 'in-l6-split',
          title: 'Splitting a Fraction',
          slides: [
            teach(
              prose('Adding two fractions puts them over a common bottom:'),
              maths('\\frac{2}{x + 1} + \\frac{3}{x + 2}'),
              maths('= \\frac{5x + 7}{(x + 1)(x + 2)}'),
              prose(
                '**Partial fractions** runs this backwards. The single fraction has no standard integral, but the two simple ones each have one.',
              ),
              prose(
                'To find the tops, write $5x + 7 = A(x + 2) + B(x + 1)$ and choose $x$ to make a bracket zero. $x = -1$ wipes out the $B$ term and leaves $2 = A$.',
              ),
            ),
            ask('int-pf-recombine'),
            ask('int-pf-pole-slider'),
            ask('int-pf-cover-up'),
            teach(
              prose(
                '**Cover-up** is that substitution done by eye. To find the top over $x + 1$, cover that bracket and put $x = -1$ into what is left:',
              ),
              maths('A = \\frac{5(-1) + 7}{(-1) + 2} = 2'),
              prose('Then cover $x + 2$ and put $x = -2$:'),
              maths('B = \\frac{5(-2) + 7}{(-2) + 1} = 3'),
            ),
            ask('int-pf-coefficients'),
            ask('int-pf-both-tree'),
            askAfter(
              [prose('Cover-up with the working taken away: find the numerator this calculation gives.')],
              'int-pf-cover-up+choice',
            ),
            teach(
              prose(
                'Signs are where cover-up goes wrong. The bracket $x + 3$ needs $x = -3$, and $x - 3$ needs $x = 3$.',
              ),
              prose('A top can come out negative, and the fraction may have no $x$ on top at all:'),
              maths('\\frac{2}{(x + 1)(x + 3)}'),
              maths('= \\frac{1}{x + 1} - \\frac{1}{x + 3}'),
              prose('Adding the two back up is always a quick check.'),
            ),
            ask('int-pf-pole-slider', 2),
            ask('int-pf-coefficients', 2),
          ],
          skillCheck: [
            ask('int-pf-coefficients', 2),
            ask('int-pf-cover-up+choice', 2),
            ask('int-pf-both-tree', 2),
          ],
        },
        {
          id: 'in-l6-integrate',
          title: 'Integrating the Split',
          slides: [
            teach(
              prose('A number over a linear bracket integrates to a logarithm, just as $\\frac{1}{x}$ does:'),
              maths('\\int \\frac{1}{x + a} \\, dx = \\ln|x + a| + C'),
              prose(
                'When the $x$ has a coefficient, divide by it, as for any linear bracket: $\\int \\frac{6}{2x + 1} \\, dx = 3\\ln|2x + 1| + C$.',
              ),
              prose(
                'Where $x > 0$ and every bracket is positive, the bars can be left off. Type $\\ln(2x + 1)$ with the $\\ln$ key.',
              ),
            ),
            ask('int-pf-log-term'),
            ask('int-pf-log-term+choice'),
            askAfter([prose('Before a fraction over two brackets can be integrated, it has to be split.')], 'int-pf-coefficients'),
            teach(
              prose('So a fraction over two brackets integrates in two moves: split it, then integrate each part.'),
              maths('\\int \\frac{5x + 7}{(x + 1)(x + 2)} \\, dx'),
              maths('= \\int \\left(\\frac{2}{x + 1} + \\frac{3}{x + 2}\\right) dx'),
              maths('= 2\\ln|x + 1|'),
              maths('+ 3\\ln|x + 2| + C'),
            ),
            ask('int-pf-integrate-tiles'),
            ask('int-pf-integrate'),
            askAfter(
              [prose('The split still rests on cover-up. Find the numerator this calculation gives.')],
              'int-pf-cover-up+choice',
            ),
            teach(
              prose('If the bottom comes multiplied out, factorise it first: $x^{2} + 3x + 2 = (x + 1)(x + 2)$.'),
              prose(
                'Check an answer by differentiating it: each logarithm gives back its own fraction, and together they add up to the one you started with.',
              ),
            ),
            ask('int-pf-integrate+choice', 2),
            ask('int-pf-integrate-tiles', 2),
          ],
          skillCheck: [
            ask('int-pf-integrate', 2),
            ask('int-pf-integrate+choice', 2),
            ask('int-pf-log-term', 2),
          ],
        },
        {
          id: 'in-l6-definite',
          title: 'Definite Integrals and Log Laws',
          slides: [
            teach(
              prose('With limits, put the numbers into the logarithms and subtract, as for any definite integral.'),
              maths('\\int_{0}^{1} \\frac{2x + 3}{(x + 1)(x + 2)} \\, dx'),
              maths('= \\left[\\ln|x + 1| + \\ln|x + 2|\\right]_{0}^{1}'),
              maths('= \\ln 2 + \\ln 3 - \\ln 1 - \\ln 2'),
              prose('That is $\\ln 3$, since $\\ln 1 = 0$. Taking one log from another divides inside them: $\\ln 6 - \\ln 2 = \\ln 3$.'),
            ),
            ask('int-pf-substitute'),
            ask('int-pf-find-limit'),
            ask('int-pf-definite'),
            teach(
              prose('An answer is usually left as a single logarithm. Three laws do the collapsing:'),
              maths('\\ln p + \\ln q = \\ln pq'),
              maths('\\ln p - \\ln q = \\ln\\frac{p}{q}'),
              maths('k\\ln p = \\ln p^{k}'),
              prose(
                'A number in front goes in as a power first, then the logs combine: $2\\ln 3 - \\ln 2 = \\ln 9 - \\ln 2 = \\ln\\frac{9}{2}$.',
              ),
            ),
            ask('int-pf-definite', 2),
            ask('int-pf-substitute', 2),
            ask('int-pf-find-limit', 2),
            teach(
              prose(
                'One shortcut skips the splitting altogether. When the top is a number times the derivative of the bottom, the integral is that number times the log of the bottom:',
              ),
              maths("\\int \\frac{f'(x)}{f(x)} \\, dx = \\ln|f(x)| + C"),
              prose(
                'In $\\int \\frac{x}{x^{2} + 1} \\, dx$ the derivative of the bottom is $2x$ and the top is half of it, so the answer is $\\frac{1}{2}\\ln(x^{2} + 1) + C$.',
              ),
            ),
            ask('int-pf-fprime'),
            ask('int-pf-fprime+choice'),
          ],
          skillCheck: [
            ask('int-pf-definite', 2),
            ask('int-pf-fprime', 2),
            ask('int-pf-substitute', 2),
          ],
        },
        {
          id: 'in-l6-forms',
          title: 'Top-Heavy Fractions and Repeated Brackets',
          slides: [
            teach(
              prose('Splitting needs the top lower in degree than the bottom. When it is not, divide first.'),
              maths('\\frac{x^{2} + 3x + 5}{(x + 1)(x + 2)}'),
              maths('= 1 + \\frac{3}{(x + 1)(x + 2)}'),
              maths('= 1 + \\frac{3}{x + 1} - \\frac{3}{x + 2}'),
              prose(
                'The bottom, $x^{2} + 3x + 2$, goes into the top once with $3$ left over, and only the leftover is split. The $1$ integrates to $x$.',
              ),
            ),
            ask('int-pf-divide'),
            ask('int-pf-top-heavy'),
            ask('int-pf-form-flow'),
            teach(
              prose('A repeated bracket needs one fraction for each power of it:'),
              maths('\\frac{3x + 5}{(x + 1)^{2}}'),
              maths('= \\frac{3}{x + 1} + \\frac{2}{(x + 1)^{2}}'),
              prose(
                'The first part integrates to a logarithm. The second is a power, $2(x + 1)^{-2}$, which integrates to $-\\frac{2}{x + 1}$ with no logarithm in it.',
              ),
            ),
            ask('int-pf-repeated'),
            ask('int-pf-repeated-integrate'),
            ask('int-pf-top-heavy+choice'),
            teach(
              prose(
                'Before splitting anything, ask in this order. Is the top lower in degree? Is it a number times the derivative of the bottom? Is a bracket repeated?',
              ),
              prose('The answers pick the method: divide first, the logarithm shortcut, or a split with one fraction for each power.'),
            ),
            ask('int-pf-form-flow', 2),
            ask('int-pf-repeated-integrate+choice', 2),
          ],
          skillCheck: [
            ask('int-pf-top-heavy', 2),
            ask('int-pf-repeated-integrate+choice', 2),
            ask('int-pf-divide', 2),
          ],
        },
      ],
      levelCheck: [
        ask('int-pf-coefficients', 2),
        ask('int-pf-log-term', 2),
        ask('int-pf-pole-slider', 2),
        ask('int-pf-integrate', 2),
        ask('int-pf-recombine', 2),
        ask('int-pf-cover-up', 2),
        ask('int-pf-integrate-tiles', 2),
        ask('int-pf-definite', 2),
        ask('int-pf-find-limit', 2),
        ask('int-pf-fprime+choice', 2),
        ask('int-pf-divide', 2),
        ask('int-pf-top-heavy', 2),
        ask('int-pf-form-flow', 2),
        ask('int-pf-repeated-integrate', 2),
      ],
    },
    {
      id: 'in-l7',
      title: 'Improper Integrals',
      lessons: [
        {
          id: 'in-l7-improper',
          title: 'What Makes an Integral Improper',
          slides: [
            teach(
              prose(
                'A definite integral needs two finite limits and an integrand that stays bounded between them. Break either rule and the integral is **improper**.',
              ),
              graph({
                xMin: -0.3,
                xMax: 6.3,
                yMin: -0.1,
                yMax: 1.6,
                curves: [{ f: (x) => 1 / (x * x), breaks: true }],
                shade: { f: (x) => 1 / (x * x), from: 1, to: 6.3 },
                label: 'The area under y = 1/x^2 from x = 1, running on to the right without end',
              }),
              maths('\\int_{1}^{\\infty} \\frac{1}{x^{2}} \\, dx'),
              prose(
                'Here the upper limit is infinite. In $\\int_{0}^{4} \\frac{1}{\\sqrt{x}} \\, dx$ both limits are finite, but the integrand is unbounded at $x = 0$.',
              ),
            ),
            ask('int-imp-which-flow'),
            ask('int-imp-problem-point'),
            ask('int-imp-spot'),
            teach(
              prose('To work one out, put $t$ in place of the troublesome end, integrate as usual, then let $t$ go to that end. So'),
              maths('\\int_{1}^{\\infty} \\frac{1}{x^{2}} \\, dx'),
              prose('stands for'),
              maths('\\lim_{t \\to \\infty} \\int_{1}^{t} \\frac{1}{x^{2}} \\, dx'),
              prose(
                'At a point where the integrand is unbounded, $t$ approaches it from inside the interval: $t \\to 0^{+}$ from the right, $t \\to 3^{-}$ from the left.',
              ),
            ),
            ask('int-imp-limit-tiles'),
            ask('int-imp-which-flow', 2),
            ask('int-imp-problem-point', 2),
            teach(
              prose(
                'Check the whole interval, ends included. $\\frac{1}{(x - 3)^{2}}$ is unbounded at $x = 3$, so it makes $\\int_{0}^{5}$ improper, and $\\int_{0}^{3}$ too, but not $\\int_{4}^{6}$.',
              ),
              prose('If the limit exists, the integral **converges** to it. If it does not, the integral **diverges**.'),
            ),
            ask('int-imp-spot', 2),
            ask('int-imp-limit-tiles', 2),
          ],
          skillCheck: [
            ask('int-imp-limit-tiles', 2),
            ask('int-imp-which-flow', 2),
            ask('int-imp-spot', 2),
          ],
        },
        {
          id: 'in-l7-infinite',
          title: 'An Infinite Limit',
          slides: [
            teach(
              prose('Take $\\int_{1}^{\\infty} \\frac{6}{x^{3}} \\, dx$. Put $t$ in place of $\\infty$ and integrate:'),
              maths('\\int_{1}^{t} 6x^{-3} \\, dx'),
              maths('= \\left[-\\frac{3}{x^{2}}\\right]_{1}^{t}'),
              maths('= 3 - \\frac{3}{t^{2}}'),
              prose('As $t$ grows, $\\frac{3}{t^{2}}$ shrinks to $0$, so the integral **converges** to $3$.'),
            ),
            ask('int-imp-work-steps'),
            ask('int-imp-power-tail'),
            ask('int-imp-tail-slider'),
            teach(
              prose('A decaying exponential works the same way, because $e^{-t} \\to 0$ as $t$ grows:'),
              maths('\\int_{0}^{\\infty} e^{-x/2} \\, dx'),
              maths('= \\left[-2e^{-x/2}\\right]_{0}^{\\infty}'),
              maths('= 0 - (-2) = 2'),
              prose('Writing $\\infty$ in the bracket is shorthand for the limit. At the bottom, $e^{0} = 1$.'),
            ),
            ask('int-imp-exp-tail'),
            ask('int-imp-power-tail+choice'),
            ask('int-imp-work-steps', 2),
            teach(
              prose(
                'Watch the signs. The antiderivative is negative, so its value at the lower limit is subtracted as a negative, and the answer comes out positive, as an area above the axis should.',
              ),
              prose(
                'In $\\int_{-\\infty}^{0} e^{2x} \\, dx$ the troublesome end is the lower one: put $t$ there and use $e^{2t} \\to 0$ as $t \\to -\\infty$.',
              ),
            ),
            ask('int-imp-exp-tail+choice', 2),
            ask('int-imp-tail-slider', 2),
          ],
          skillCheck: [
            ask('int-imp-power-tail', 2),
            ask('int-imp-exp-tail', 2),
            ask('int-imp-work-steps', 2),
          ],
        },
        {
          id: 'in-l7-converge',
          title: 'Converge or Diverge',
          slides: [
            teach(
              prose(
                'Not every improper integral has a value. $\\int_{1}^{t} \\frac{1}{x} \\, dx = \\ln t$, which grows without limit, so $\\int_{1}^{\\infty} \\frac{1}{x} \\, dx$ **diverges**.',
              ),
              prose('For $\\frac{1}{x^{p}}$ from $1$ to $\\infty$, integrating leaves $t^{1 - p}$, which dies away only when $1 - p$ is negative:'),
              maths('p > 1: \\text{ converges}'),
              maths('p \\le 1: \\text{ diverges}'),
            ),
            ask('int-imp-verdict'),
            ask('int-imp-root-tail'),
            ask('int-imp-p-flow'),
            teach(
              prose(
                'Fractional powers follow the same rule. $\\frac{1}{x\\sqrt{x}} = x^{-\\frac{3}{2}}$ has $p = \\frac{3}{2}$, so it converges, while $\\frac{1}{\\sqrt{x}}$ has $p = \\frac{1}{2}$ and diverges.',
              ),
              maths('\\int_{1}^{\\infty} x^{-\\frac{3}{2}} \\, dx = 2'),
              prose('An exponential converges on an infinite interval when it decays, and diverges when it grows.'),
            ),
            ask('int-imp-root-tail+choice', 2),
            ask('int-imp-tail-slider'),
            ask('int-imp-verdict'),
            teach(
              prose(
                '"Diverges" is a full answer, not a failure to find one. The quick test is what the antiderivative does at the troublesome end: settle to a number, or grow without limit.',
              ),
            ),
            ask('int-imp-p-flow'),
            ask('int-imp-power-tail', 2),
          ],
          skillCheck: [
            ask('int-imp-verdict'),
            ask('int-imp-root-tail', 2),
            ask('int-imp-p-flow'),
          ],
        },
        {
          id: 'in-l7-unbounded',
          title: 'Unbounded Integrands',
          slides: [
            teach(
              prose(
                '$\\frac{1}{\\sqrt{x}}$ is unbounded at $x = 0$, so $\\int_{0}^{9} \\frac{1}{\\sqrt{x}} \\, dx$ is improper at its lower limit. Put $t$ there:',
              ),
              graph({
                xMin: -0.3,
                xMax: 9.3,
                yMin: -0.1,
                yMax: 3,
                curves: [{ f: (x) => 1 / Math.sqrt(x), breaks: true }],
                shade: { f: (x) => Math.min(3, 1 / Math.sqrt(x)), from: 0.01, to: 9 },
                label: 'The area under y = 1/sqrt(x) from 0 to 9, rising without bound at x = 0',
              }),
              maths('\\int_{t}^{9} x^{-\\frac{1}{2}} \\, dx'),
              maths('= 6 - 2\\sqrt{t}'),
              prose('As $t \\to 0^{+}$, $2\\sqrt{t} \\to 0$, so the integral converges to $6$.'),
            ),
            ask('int-imp-root-pole'),
            ask('int-imp-pole-tree'),
            ask('int-imp-problem-point', 2),
            teach(
              prose(
                'At a pole the rule flips. For $\\frac{1}{x^{p}}$ from $0$ to $1$, the power after integrating, $1 - p$, has to be positive, so it converges only when $p < 1$.',
              ),
              prose(
                '$\\int_{t}^{1} \\frac{1}{x} \\, dx = -\\ln t$, which grows without limit as $t \\to 0$, so $\\frac{1}{x}$ diverges at $0$ just as it does at infinity.',
              ),
            ),
            ask('int-imp-p-flow', 2),
            ask('int-imp-root-pole+choice', 2),
            ask('int-imp-verdict', 2),
            teach(
              prose(
                'Cube roots work the same way: $\\int_{0}^{8} \\frac{1}{\\sqrt[3]{x^{2}}} \\, dx = \\left[3\\sqrt[3]{x}\\right]_{0}^{8} = 6$.',
              ),
              prose('A shifted root, such as $\\frac{1}{\\sqrt{x - 2}}$ from $2$, is unbounded at $x = 2$, and is handled with $t \\to 2^{+}$.'),
            ),
            ask('int-imp-pole-tree', 2),
            ask('int-imp-p-flow', 2),
          ],
          skillCheck: [
            ask('int-imp-root-pole', 2),
            ask('int-imp-pole-tree', 2),
            ask('int-imp-p-flow', 2),
          ],
        },
        {
          id: 'in-l7-split',
          title: 'Splitting an Improper Integral',
          slides: [
            teach(
              prose('With both limits infinite, split at any convenient point, so that each half has one infinite end:'),
              maths('\\int_{-\\infty}^{\\infty} e^{-|x|} \\, dx'),
              prose('is the sum of'),
              maths('\\int_{-\\infty}^{0} e^{x} \\, dx'),
              maths('+ \\int_{0}^{\\infty} e^{-x} \\, dx'),
              prose('Each half is $1$, so the whole is $2$.'),
            ),
            ask('int-imp-split-tiles'),
            ask('int-imp-two-sided'),
            ask('int-imp-halves-tree'),
            teach(
              prose('A point inside the interval where the integrand is unbounded is split the same way, at that point, so the trouble sits at one end of each half:'),
              maths('\\int_{-1}^{8} \\frac{1}{\\sqrt[3]{x^{2}}} \\, dx'),
              prose('Split at $0$. The left half is $3$ and the right half is $6$, so the integral is $9$.'),
            ),
            ask('int-imp-trap'),
            ask('int-imp-split-tiles', 2),
            ask('int-imp-two-sided', 2),
            teach(
              prose('The whole converges only if **both** halves do. One divergent half is enough to make it diverge.'),
              prose(
                'Never integrate straight across such a point. $\\int_{-1}^{1} \\frac{1}{x^{2}} \\, dx$ looks like $\\left[-\\frac{1}{x}\\right]_{-1}^{1} = -2$, a negative answer for a positive integrand, and in fact it diverges.',
              ),
            ),
            ask('int-imp-halves-tree', 2),
            ask('int-imp-trap', 2),
          ],
          skillCheck: [
            ask('int-imp-two-sided', 2),
            ask('int-imp-halves-tree', 2),
            ask('int-imp-trap', 2),
          ],
        },
      ],
      levelCheck: [
        ask('int-imp-which-flow', 2),
        ask('int-imp-problem-point', 2),
        ask('int-imp-limit-tiles', 2),
        ask('int-imp-power-tail', 2),
        ask('int-imp-work-steps', 2),
        ask('int-imp-exp-tail', 2),
        ask('int-imp-verdict', 2),
        ask('int-imp-root-tail', 2),
        ask('int-imp-p-flow', 2),
        ask('int-imp-root-pole+choice', 2),
        ask('int-imp-pole-tree', 2),
        ask('int-imp-split-tiles', 2),
        ask('int-imp-two-sided', 2),
        ask('int-imp-halves-tree', 2),
        ask('int-imp-trap', 2),
      ],
    },
    {
      id: 'in-l8',
      title: 'Integration as a Limit of a Sum',
      lessons: [
        {
          id: 'in-l8-strips',
          title: 'Area by Strips',
          slides: [
            teach(
              prose('To estimate the area under a curve, cut it into strips of equal width and treat each strip as a rectangle.'),
              {
                kind: 'diagram',
                svg: stripsSvg({
                  xMin: -0.6,
                  xMax: 6.6,
                  yMin: -3,
                  yMax: 40,
                  f: (x) => x * x + 1,
                  a: 0,
                  h: 2,
                  n: 3,
                  side: 'left',
                  label: 'Three rectangles under y = x^2 + 1, each as tall as the curve at its left edge',
                }),
              },
              prose(
                'Here $y = x^{2} + 1$ from $x = 0$ to $x = 6$ is cut into 3 strips of width $2$. Each rectangle takes its height from the curve at its **left** edge: $f(0) = 1$, $f(2) = 5$ and $f(4) = 17$.',
              ),
              maths('L_{3} = 2(1 + 5 + 17)'),
              maths('= 46'),
            ),
            ask('int-lim-which-sum'),
            ask('int-lim-sum-ends'),
            ask('int-lim-strip-tree'),
            teach(
              prose('Read the heights at the **right** edges instead and you get the right sum:'),
              maths('R_{3} = 2\\left[f(2) + f(4) + f(6)\\right]'),
              maths('= 2(5 + 17 + 37) = 118'),
              prose(
                'With $n$ strips of width $h = \\frac{b - a}{n}$, the left sum reads $f$ at $a, a + h, \\dots, b - h$ and the right sum at $a + h, \\dots, b$. The true area here is $78$, between the two.',
              ),
            ),
            ask('int-lim-rect-sum'),
            ask('int-lim-which-sum', 2),
            ask('int-lim-sum-ends', 2),
            teach(
              prose(
                'Both sums are estimates. More strips, each thinner, hug the curve more closely, so both sums close in on the true area. The next lesson takes that to its limit.',
              ),
            ),
            ask('int-lim-strip-tree', 2),
            ask('int-lim-rect-sum+choice', 2),
          ],
          skillCheck: [
            ask('int-lim-strip-tree', 2),
            ask('int-lim-rect-sum', 2),
            ask('int-lim-sum-ends', 2),
          ],
        },
        {
          id: 'in-l8-sums',
          title: 'Letting the Strips Shrink',
          slides: [
            teach(
              prose('With $n$ strips a sum has $n$ terms, so it needs two standard results:'),
              maths('\\sum_{k=1}^{n} k = \\frac{n(n+1)}{2}'),
              maths('\\sum_{k=1}^{n} k^{2} = \\frac{n(n+1)(2n+1)}{6}'),
              prose(
                'A number in front comes outside the sum, and a constant is added once per term: $\\sum_{k=1}^{n} (2k + 3) = n(n + 1) + 3n$.',
              ),
            ),
            ask('int-lim-sigma'),
            ask('int-lim-sigma+choice'),
            ask('int-lim-sum-in-n'),
            teach(
              prose(
                'Take $\\int_{0}^{2} 3x \\, dx$ with $n$ strips of width $\\frac{2}{n}$. Strip $k$ has right edge $\\frac{2k}{n}$, where the height is $\\frac{6k}{n}$. So',
              ),
              maths('R_{n} = \\sum_{k=1}^{n} \\frac{2}{n} \\cdot \\frac{6k}{n}'),
              maths('= \\frac{12}{n^{2}} \\cdot \\frac{n(n+1)}{2}'),
              maths('= 6\\left(1 + \\frac{1}{n}\\right)'),
            ),
            ask('int-lim-sum-limit-steps'),
            ask('int-lim-approach-slider'),
            ask('int-lim-sum-in-n', 2),
            teach(
              prose('As $n$ grows, $\\frac{1}{n} \\to 0$, so $R_{n} \\to 6$. The limit is the exact area:'),
              maths('\\int_{0}^{2} 3x \\, dx = 6'),
              prose('The left sums, $6\\left(1 - \\frac{1}{n}\\right)$, close in on the same value from below.'),
            ),
            ask('int-lim-sum-limit-steps', 2),
            ask('int-lim-approach-slider', 2),
          ],
          skillCheck: [
            ask('int-lim-sigma', 2),
            ask('int-lim-sum-in-n', 2),
            ask('int-lim-sum-limit-steps', 2),
          ],
        },
        {
          id: 'in-l8-read',
          title: 'Reading the Integral from the Sum',
          slides: [
            teach(
              prose('Every right sum has the same shape. With width $h = \\frac{b - a}{n}$ and right edges $a + kh$,'),
              maths('\\int_{a}^{b} f(x) \\, dx'),
              prose('is the limit, as $n \\to \\infty$, of'),
              maths('\\sum_{k=1}^{n} h \\, f(a + kh)'),
              prose('The width $h$ becomes the $dx$, and the sum stretches into the integral sign.'),
            ),
            ask('int-lim-identify-flow'),
            ask('int-lim-read-tiles'),
            ask('int-lim-which-integral'),
            teach(
              prose('Read this one piece by piece:'),
              maths('\\sum_{k=1}^{n} \\frac{3}{n}\\left(2 + \\frac{3k}{n}\\right)^{2}'),
              prose(
                'The width is $\\frac{3}{n}$, so $b - a = 3$. At $k = 0$ the bracket is $2$, so $a = 2$ and $b = 5$. The bracket is $x$, so the integrand is $x^{2}$:',
              ),
              maths('\\int_{2}^{5} x^{2} \\, dx'),
            ),
            ask('int-lim-sum-value'),
            ask('int-lim-read-tiles', 2),
            ask('int-lim-identify-flow', 2),
            teach(
              prose('Once the limit is an integral, evaluate it with the antiderivative. That is far quicker than simplifying the sum:'),
              maths('\\left[\\frac{x^{3}}{3}\\right]_{2}^{5}'),
              maths('= \\frac{125 - 8}{3} = 39'),
            ),
            ask('int-lim-which-integral', 2),
            ask('int-lim-sum-value+choice', 2),
          ],
          skillCheck: [
            ask('int-lim-read-tiles', 2),
            ask('int-lim-which-integral', 2),
            ask('int-lim-sum-value', 2),
          ],
        },
        {
          id: 'in-l8-bounds',
          title: 'Over or Under',
          slides: [
            teach(
              {
                kind: 'diagram',
                svg: stripsSvg({
                  xMin: -0.3,
                  xMax: 6.3,
                  yMin: -0.8,
                  yMax: 11,
                  f: (x) => (x * x) / 4 + 1,
                  a: 0,
                  h: 1,
                  n: 6,
                  side: 'left',
                  label: 'A rising curve with the left sum drawn under it, every rectangle below the curve',
                }),
              },
              prose(
                "Where $f$ rises, each strip's left edge is its lowest point, so every left rectangle sits below the curve: the left sum is an **under-estimate**. The right edge is the highest point, so the right sum is an **over-estimate**.",
              ),
              prose('Where $f$ falls, the two swap round.'),
            ),
            ask('int-lim-over-under'),
            ask('int-lim-bound-choice'),
            ask('int-lim-between-tiles'),
            teach(
              prose(
                "The sign of $f'(x)$ settles it. $f(x) = x^{2} - 6x + 11$ has $f'(x) = 2x - 6$, which is zero at $x = 3$. Before $x = 3$ it falls, and after it rises.",
              ),
              prose('Across a turning point some rectangles sit below the curve and some above, so neither sum is sure to be over or under.'),
            ),
            ask('int-lim-turn-slider'),
            ask('int-lim-over-under', 2),
            ask('int-lim-between-tiles', 2),
            teach(
              prose('For a rising $f$ the true area $A$ is trapped between the two sums:'),
              maths('L_{n} < A < R_{n}'),
              prose(
                'The gap between them is $h \\times \\left(f(b) - f(a)\\right)$, which shrinks to $0$ as the strips get thinner. Squeezed from both sides, the two sums share one limit: the integral.',
              ),
            ),
            ask('int-lim-bound-choice', 2),
            ask('int-lim-turn-slider', 2),
          ],
          skillCheck: [
            ask('int-lim-over-under', 2),
            ask('int-lim-between-tiles', 2),
            ask('int-lim-bound-choice', 2),
          ],
        },
        {
          id: 'in-l8-loop',
          title: 'Closing the Loop',
          slides: [
            teach(
              prose('Two routes now lead to the same area. For $\\int_{0}^{3} x^{2} \\, dx$ the right sum simplifies to'),
              maths('\\frac{9}{2}\\left(1 + \\frac{1}{n}\\right)\\left(2 + \\frac{1}{n}\\right)'),
              prose('which tends to $\\frac{9}{2} \\times 2 = 9$. The antiderivative gives the same:'),
              maths('\\left[\\frac{x^{3}}{3}\\right]_{0}^{3} = 9'),
            ),
            ask('int-lim-pieces-tree'),
            ask('int-lim-sum-value'),
            ask('int-lim-approach-slider'),
            teach(
              prose(
                'That is why integration works: the antiderivative is a shortcut to the limit of the sum. Both can be taken term by term.',
              ),
              prose(
                'For $\\int_{0}^{2} (3x^{2} + 5) \\, dx$ the $x^{2}$ term gives $3 \\times \\frac{8}{3} = 8$ and the constant gives $5 \\times 2 = 10$, so the integral is $18$.',
              ),
            ),
            ask('int-lim-sum-limit-steps', 2),
            ask('int-lim-pieces-tree', 2),
            ask('int-lim-which-integral', 2),
            teach(
              prose(
                'A limit of a sum is often the neatest way to state an area, and the antiderivative the quickest way to find it. Recognise the sum, write the integral, then evaluate.',
              ),
            ),
            ask('int-lim-sum-value', 2),
            ask('int-lim-between-tiles', 2),
          ],
          skillCheck: [
            ask('int-lim-pieces-tree', 2),
            ask('int-lim-sum-value', 2),
            ask('int-lim-sum-limit-steps', 2),
          ],
        },
      ],
      levelCheck: [
        ask('int-lim-which-sum', 2),
        ask('int-lim-sum-ends', 2),
        ask('int-lim-strip-tree', 2),
        ask('int-lim-rect-sum+choice', 2),
        ask('int-lim-sigma', 2),
        ask('int-lim-sum-in-n', 2),
        ask('int-lim-sum-limit-steps', 2),
        ask('int-lim-approach-slider', 2),
        ask('int-lim-identify-flow', 2),
        ask('int-lim-read-tiles', 2),
        ask('int-lim-sum-value', 2),
        ask('int-lim-over-under', 2),
        ask('int-lim-between-tiles', 2),
        ask('int-lim-turn-slider', 2),
        ask('int-lim-pieces-tree', 2),
      ],
    },
  ],
};
