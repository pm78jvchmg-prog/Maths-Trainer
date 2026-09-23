/**
 * Exponents and Radicals.
 *
 * The three index laws first, derived by counting copies rather than stated as
 * rules to memorise; then the laws are pushed past whole numbers, where a
 * negative index has to mean a reciprocal and a fractional one has to mean a
 * root if the laws are to survive; then surds, which is that second idea used
 * in anger; then standard form, where powers of ten carry the size of very
 * large and very small numbers; then surds back inside expressions —
 * brackets, conjugates, equations and exact lengths; then equations with
 * the unknown in an index or under one, hidden quadratics, and substitution;
 * and last, growth and decay by repeated multiplication, a whole number of
 * steps at a time.
 *
 * Each level closes with a level check: twelve to fourteen questions, no
 * teaching slides, one attempt each.
 */
import type { Course, SlideRef } from '../types';

const teach = (
  ...blocks: { kind: 'prose' | 'display'; text?: string; tex?: string }[]
): SlideRef => ({
  type: 'literal',
  slide: {
    kind: 'teach',
    body: blocks.map((b) =>
      b.kind === 'prose'
        ? ({ kind: 'prose', text: b.text ?? '' } as const)
        : ({ kind: 'display', tex: b.tex ?? '' } as const),
    ),
  },
});

const ask = (generatorId: string, difficulty = 1): SlideRef => ({
  type: 'generated',
  generatorId,
  difficulty,
});

const prose = (text: string) => ({ kind: 'prose' as const, text });
const maths = (tex: string) => ({ kind: 'display' as const, tex });

/**
 * Lines of working stacked in one display and aligned on their `&`. A chain
 * of equals signs on one line runs off a phone screen after about three terms.
 */
const working = (...lines: string[]) =>
  maths(`\\begin{aligned} ${lines.join(' \\\\ ')} \\end{aligned}`);

export const exponentsRadicals: Course = {
  id: 'exponents-radicals',
  title: 'Exponents & Radicals',
  blurb: 'The index laws by counting copies, then roots, surds, standard form and growth.',
  levels: [
    {
      id: 'er-l1',
      title: 'The Index Laws',
      lessons: [
        {
          id: 'er-l1-multiply',
          title: 'Multiplying Powers',
          slides: [
            teach(
              prose(
                'An index — also called a power or an exponent — counts how many copies of something are multiplied together. $x^{4}$ is four copies of $x$.',
              ),
              maths('x^{4} = x \\times x \\times x \\times x'),
              prose(
                'So multiplying two powers of the same base is just putting two piles of copies together. $x^{2} \\times x^{3}$ is two copies followed by three more, which is five copies in all.',
              ),
              maths('x^{a} \\times x^{b} = x^{a + b}'),
              prose(
                'The base has to be the same for this to mean anything. $x^{3} \\times y^{4}$ cannot be combined at all, because there is no single pile to count.',
              ),
            ),
            ask('idx-multiply'),
            ask('idx-fill-multiply'),
            ask('idx-evaluate-order'),
            ask('idx-multiply+choice'),
            teach(
              prose(
                'The law is easy to state and easy to misapply. The exponents are added; the base is left alone.',
              ),
              prose(
                'Multiplying the exponents is the classic slip. $x^{5} \\times x^{2}$ is $x^{7}$, not $x^{10}$ — count the copies if you are unsure, and there are seven of them.',
              ),
              prose(
                'A base written with no index has an index of 1, which is easy to overlook: $x \\times x^{6} = x^{7}$, not $x^{6}$.',
              ),
            ),
            ask('idx-powers-tree'),
            ask('idx-fill-multiply'),
            teach(
              prose('Three or more powers work the same way — add all the exponents at once.'),
              maths('x^{2} \\times x^{3} \\times x^{4} = x^{9}'),
              prose(
                'And the law reads backwards just as well, which turns out to be the more useful direction later: $x^{9}$ can be split into $x^{4} \\times x^{5}$ whenever that helps.',
              ),
            ),
            ask('idx-evaluate-order+choice'),
            ask('idx-law-choose'),
          ],
          skillCheck: [ask('idx-multiply', 2), ask('idx-multiply', 2), ask('idx-multiply', 2)],
        },
        {
          id: 'er-l1-divide',
          title: 'Dividing Powers',
          slides: [
            teach(
              prose(
                'Division cancels copies instead of adding them. Written out in full, two of the $x$ on top of $\\frac{x^{5}}{x^{2}}$ cancel against the two underneath.',
              ),
              maths(
                '\\frac{x^{5}}{x^{2}} = \\frac{x \\times x \\times x \\times x \\times x}{x \\times x} = x^{3}',
              ),
              prose('So dividing powers of the same base subtracts the exponents.'),
              maths('\\frac{x^{a}}{x^{b}} = x^{a - b}'),
              prose(
                'The order matters: top exponent minus bottom one. Reversing them flips the sign of the answer, which is the most common error here.',
              ),
            ),
            ask('idx-divide'),
            ask('idx-fill-divide'),
            ask('idx-divide+choice'),
            teach(
              prose(
                'What if the bottom exponent is the larger one? Then the subtraction gives a negative number, and that is a perfectly good answer.',
              ),
              maths('\\frac{x^{2}}{x^{5}} = x^{-3}'),
              prose(
                'Cancelling by hand agrees: two copies cancel and three are left underneath, so the result is $\\frac{1}{x^{3}}$. A negative index means exactly that, a reciprocal, and there is a lesson on it shortly.',
              ),
              prose(
                'If the exponents are equal, everything cancels: $\\frac{x^{4}}{x^{4}} = x^{0} = 1$. Any non-zero base to the power zero is 1, which is the only value this law can consistently give.',
              ),
            ),
            ask('idx-evaluate-divide'),
            ask('idx-laws-steps'),
            ask('idx-fill-divide'),
            teach(
              prose(
                'The two laws so far are a pair. Multiplying adds, dividing subtracts, and both insist on the same base.',
              ),
              maths('x^{a} \\times x^{b} = x^{a + b} \\qquad \\frac{x^{a}}{x^{b}} = x^{a - b}'),
              prose(
                'Nothing here says anything about $\\frac{x^{5}}{y^{2}}$. Different bases do not cancel, and that fraction simply stays as it is.',
              ),
            ),
            ask('idx-evaluate-divide+choice'),
            ask('idx-law-choose'),
          ],
          skillCheck: [ask('idx-divide', 2), ask('idx-divide', 2), ask('idx-divide', 2)],
        },
        {
          id: 'er-l1-power-of-power',
          title: 'A Power of a Power',
          slides: [
            teach(
              prose(
                'A power raised to a power is a different situation again. $\\left(x^{3}\\right)^{4}$ means four copies of $x^{3}$ multiplied together.',
              ),
              maths('\\left(x^{3}\\right)^{4} = x^{3} \\times x^{3} \\times x^{3} \\times x^{3}'),
              prose(
                'Adding those four threes gives twelve — and adding four threes is the same as multiplying $3 \\times 4$. So here the exponents multiply.',
              ),
              maths('\\left(x^{a}\\right)^{b} = x^{ab}'),
              prose(
                'This is the law most often confused with the first, understandably: both involve one base and two exponents. The difference is whether the powers sit side by side or one is applied to the other.',
              ),
            ),
            ask('idx-power-of-power'),
            ask('idx-fill-power'),
            ask('idx-power-of-power+choice'),
            teach(
              prose('Hold the two cases side by side until the difference is automatic.'),
              maths('x^{2} \\times x^{3} = x^{5} \\qquad \\left(x^{2}\\right)^{3} = x^{6}'),
              prose(
                'Side by side, add. One raised to the other, multiply. Reading the brackets is the whole skill: $\\left(x^{2}\\right)^{3}$ has them, $x^{2} \\times x^{3}$ does not.',
              ),
              prose(
                'The outer power applies to everything inside the bracket, coefficients included: $\\left(3x^{2}\\right)^{2} = 9x^{4}$, not $3x^{4}$.',
              ),
            ),
            ask('idx-evaluate-power'),
            ask('idx-law-choose'),
            ask('idx-fill-power'),
            teach(
              prose(
                'Negative exponents need no special treatment here — multiply them as they stand and keep the sign.',
              ),
              maths('\\left(x^{-2}\\right)^{5} = x^{-10}'),
              prose(
                'Two negatives multiply to a positive in the usual way, so $\\left(x^{-3}\\right)^{-2} = x^{6}$.',
              ),
            ),
            ask('idx-evaluate-power+choice'),
            ask('idx-law-choose'),
          ],
          skillCheck: [
            ask('idx-power-of-power', 2),
            ask('idx-power-of-power', 2),
            ask('idx-power-of-power', 2),
          ],
        },
        {
          id: 'er-l1-coefficients',
          title: 'Terms with Coefficients',
          slides: [
            teach(
              prose(
                'Real expressions come with numbers in front. In $5x^{3}$ the 5 is the **coefficient** and the 3 is the index, and they obey different rules.',
              ),
              prose(
                'Multiplying two such terms splits into two separate jobs: multiply the coefficients, add the indices.',
              ),
              maths('4x^{2} \\times 3x^{5} = \\left(4 \\times 3\\right)x^{2 + 5} = 12x^{7}'),
              prose(
                'The jobs never mix. The coefficients are multiplied because they are numbers being multiplied; the indices are added because that is what multiplying powers does.',
              ),
              prose(
                'Adding the coefficients is the usual slip: $4x^{2} \\times 3x^{5}$ is $12x^{7}$, not $7x^{7}$.',
              ),
            ),
            ask('idx-multiply-terms'),
            ask('idx-fill-coefficient'),
            ask('idx-multiply-terms+choice'),
            teach(
              prose('Division splits the same way — divide the coefficients, subtract the indices.'),
              maths('\\frac{12x^{7}}{4x^{2}} = 3x^{5}'),
              prose(
                'A coefficient of 1 is never written, so $x^{4}$ and $1x^{4}$ are the same thing. That matters when dividing: $\\frac{x^{6}}{2x^{2}}$ is $\\frac{1}{2}x^{4}$, not $2x^{4}$.',
              ),
              prose(
                'Track the sign of the coefficient separately from the sign of the index. In $-3x^{-2}$ the minus in front belongs to the number and the minus in the index belongs to the power; neither has anything to do with the other.',
              ),
            ),
            ask('idx-evaluate-coefficient'),
            ask('idx-law-choose'),
            ask('idx-fill-coefficient'),
            teach(
              prose(
                'Addition is the odd one out. $3x^{2} + 4x^{2}$ is $7x^{2}$, because those are like terms — same base, same index — so the coefficients simply count them.',
              ),
              maths('3x^{2} + 4x^{2} = 7x^{2} \\qquad 3x^{2} \\times 4x^{2} = 12x^{4}'),
              prose(
                'But $3x^{2} + 4x^{3}$ does not simplify at all. Only multiplication and division have index laws; addition needs the terms to match exactly before anything can happen.',
              ),
            ),
            ask('idx-evaluate-coefficient+choice'),
            ask('idx-law-choose'),
          ],
          skillCheck: [
            ask('idx-multiply-terms', 2),
            ask('idx-multiply-terms', 2),
            ask('idx-multiply-terms', 2),
          ],
        },
        {
          id: 'er-l1-negative',
          title: 'Negative Indices',
          slides: [
            teach(
              prose(
                'Dividing threw up expressions like $x^{-3}$, and they need a meaning. Working $\\frac{x^{2}}{x^{5}}$ out by cancelling gives $\\frac{1}{x^{3}}$; working it out by the subtraction law gives $x^{-3}$. Both are right, so they are the same thing.',
              ),
              maths('x^{-n} = \\frac{1}{x^{n}}'),
              prose(
                'A negative index means a reciprocal — one over the positive power. It does not mean a negative answer. $2^{-3}$ is $\\frac{1}{8}$, a small positive number, not $-8$.',
              ),
              prose(
                'The rule runs both ways, which is how an index is lifted off the bottom of a fraction: $\\frac{1}{x^{4}} = x^{-4}$.',
              ),
            ),
            ask('idx-negative'),
            ask('idx-fill-negative'),
            ask('idx-negative+choice'),
            teach(
              prose('With a coefficient in front, only the part actually carrying the index moves.'),
              maths('5x^{-2} = \\frac{5}{x^{2}}'),
              prose(
                'The 5 never had a negative index, so it stays on top. Writing $\\frac{1}{5x^{2}}$ drags it down with the $x$, and that is the mistake to watch for.',
              ),
              prose(
                'If the coefficient is inside the bracket then it does carry the index and it does move: $\\left(5x\\right)^{-2} = \\frac{1}{25x^{2}}$. The brackets decide.',
              ),
            ),
            ask('idx-evaluate-divide'),
            ask('idx-law-choose'),
            ask('idx-fill-negative'),
            teach(
              prose('Negative indices obey every law already met, with no special cases.'),
              maths('x^{-2} \\times x^{-3} = x^{-5} \\qquad \\frac{x^{-2}}{x^{3}} = x^{-5}'),
              prose(
                'That is the point of allowing them. The three laws then hold for every whole number, positive or negative, rather than only for counting numbers — and the same argument is about to push them further still.',
              ),
            ),
            ask('idx-evaluate-divide+choice'),
            ask('idx-law-choose'),
          ],
          skillCheck: [ask('idx-negative', 2), ask('idx-negative', 2), ask('idx-negative', 2)],
        },
      ],
      levelCheck: [
        ask('idx-multiply', 2),
        ask('idx-divide', 2),
        ask('idx-power-of-power', 2),
        ask('idx-multiply-terms', 2),
        ask('idx-negative', 2),
        ask('idx-multiply', 2),
        ask('idx-divide', 2),
        ask('idx-power-of-power', 2),
        ask('idx-multiply-terms', 2),
        ask('idx-negative', 2),
        ask('idx-divide', 2),
        ask('idx-negative', 2),
      ],
    },
    {
      id: 'er-l2',
      title: 'Roots and Fractional Indices',
      lessons: [
        {
          id: 'er-l2-fractional',
          title: 'Roots as Indices',
          slides: [
            teach(
              prose(
                'Every index so far has been a whole number. Nothing in the laws demands that, and asking what $x^{\\frac{1}{2}}$ could possibly mean has exactly one consistent answer.',
              ),
              prose(
                'By the power-of-a-power law, $\\left(x^{\\frac{1}{2}}\\right)^{2} = x^{1} = x$. So $x^{\\frac{1}{2}}$ is the thing that gives $x$ when squared, which is the square root.',
              ),
              maths('x^{\\frac{1}{2}} = \\sqrt{x} \\qquad x^{\\frac{1}{3}} = \\sqrt[3]{x}'),
              prose('In general the number on the bottom of the fraction is the root.'),
              maths('x^{\\frac{1}{n}} = \\sqrt[n]{x}'),
            ),
            ask('idx-fractional'),
            ask('idx-fill-root'),
            ask('idx-fractional+choice'),
            teach(
              prose(
                'For actual numbers this becomes arithmetic you can do in your head, once the squares and cubes are familiar.',
              ),
              maths('9^{\\frac{1}{2}} = 3 \\qquad 27^{\\frac{1}{3}} = 3 \\qquad 16^{\\frac{1}{4}} = 2'),
              prose(
                'Read it as a question. What number, raised to the power on the bottom, gives the base? For $16^{\\frac{1}{4}}$ — what to the fourth power is 16, and the answer is 2.',
              ),
              prose(
                'The index is not a multiplier. $16^{\\frac{1}{2}}$ is 4, not 8: halving a number and taking its square root are different operations that happen to agree only at 0 and 4.',
              ),
            ),
            ask('idx-evaluate-roots'),
            ask('idx-root-flow'),
            ask('idx-fill-root'),
            teach(
              prose(
                'The same reading handles a root of a root, because the laws are still the laws.',
              ),
              maths(
                '\\sqrt{\\sqrt{x}} = \\left(x^{\\frac{1}{2}}\\right)^{\\frac{1}{2}} = x^{\\frac{1}{4}}',
              ),
              prose(
                'Converting to index form and multiplying is quicker than reasoning about nested roots directly, and that is the practical reason for writing roots as indices at all.',
              ),
            ),
            ask('idx-evaluate-roots+choice'),
            ask('idx-root-flow'),
          ],
          // Difficulty 1 here, deliberately: difficulty 2 brings in a numerator
          // above 1, which is the next lesson's material.
          skillCheck: [ask('idx-fractional'), ask('idx-fractional'), ask('idx-fractional')],
        },
        {
          id: 'er-l2-powers-of-roots',
          title: 'Powers of Roots',
          slides: [
            teach(
              prose(
                'A fractional index whose top is not 1 does two jobs at once. The bottom is still the root; the top is a power.',
              ),
              maths('x^{\\frac{m}{n}} = \\left(\\sqrt[n]{x}\\right)^{m}'),
              prose(
                'The two operations can be done in either order, so there is a choice — and one order is far easier. Take the root first.',
              ),
              maths('8^{\\frac{2}{3}} = \\left(\\sqrt[3]{8}\\right)^{2} = 2^{2} = 4'),
              prose(
                'Doing the power first gives $\\sqrt[3]{64}$, which is also 4 but needs the cube root of 64 rather than of 8. The numbers grow fast that way round, so the root goes first by habit.',
              ),
            ),
            ask('idx-fractional', 2),
            ask('idx-fill-fractional'),
            ask('idx-fractional+choice', 2),
            teach(
              prose(
                'Three short steps: read the root off the bottom, apply it, then raise what you get to the number on top.',
              ),
              maths('16^{\\frac{3}{4}} = \\left(\\sqrt[4]{16}\\right)^{3} = 2^{3} = 8'),
              prose(
                'Check the fraction is in lowest terms before starting. $8^{\\frac{2}{6}}$ is really $8^{\\frac{1}{3}} = 2$, and cancelling first saves the work.',
              ),
              prose(
                'Swapping the two numbers is the mistake to guard against: $\\frac{3}{4}$ means a fourth root and a cube, not a cube root and a fourth power.',
              ),
            ),
            ask('idx-index-form'),
            ask('idx-root-flow', 2),
            ask('idx-fill-fractional', 2),
            teach(
              prose(
                'A negative fractional index combines both of the extensions — take the reciprocal, and read the fraction as a root and a power.',
              ),
              maths('8^{-\\frac{2}{3}} = \\frac{1}{8^{\\frac{2}{3}}} = \\frac{1}{4}'),
              prose(
                'Deal with the minus sign first and what is left is the work just practised. Nothing new is required, which is the payoff for defining the negative and fractional cases so that the original laws survive intact.',
              ),
            ),
            ask('idx-index-form+choice', 2),
            ask('idx-root-flow', 2),
          ],
          skillCheck: [
            ask('idx-fractional', 2),
            ask('idx-index-form', 2),
            ask('idx-fractional', 2),
          ],
        },
        {
          id: 'er-l2-equations',
          title: 'Equations with Matching Bases',
          slides: [
            teach(
              prose(
                'An equation like $2^{n} = 32$ can be solved with nothing new at all, provided both sides can be written as powers of the same base.',
              ),
              maths('2^{n} = 32 = 2^{5} \\implies n = 5'),
              prose(
                'Once the bases match, the exponents must match. That single step is the whole method, and it is valid because a power function never takes the same value twice.',
              ),
              prose(
                'So all the work is in recognising 32 as a power of 2. Knowing the powers of 2 up to 1024, and the small powers of 3, 5 and 10, is what makes these quick.',
              ),
            ),
            ask('idx-equation'),
            ask('idx-match-base'),
            ask('idx-equation+choice'),
            teach(
              prose(
                'Sometimes the rewriting takes a step of its own. In $4^{n} = 64$ both sides are powers of 2, so rewrite and compare.',
              ),
              maths('4^{n} = 64 \\implies 2^{2n} = 2^{6} \\implies n = 3'),
              prose(
                'Checking directly agrees, since $4^{3} = 64$. Either route is fine; what matters is reaching a single shared base before comparing exponents.',
              ),
              prose(
                'When no common base exists — $2^{n} = 10$, say — this method simply stops, and logarithms take over. That is a course of its own.',
              ),
            ),
            ask('idx-evaluate-roots'),
            ask('idx-fractional', 2),
            ask('idx-match-base', 2),
            teach(
              prose('A negative or fractional answer is not a sign that something has gone wrong.'),
              maths('2^{n} = \\frac{1}{8} \\implies 2^{n} = 2^{-3} \\implies n = -3'),
              prose(
                'And $9^{n} = 3$ gives $n = \\frac{1}{2}$, because 3 is $9^{\\frac{1}{2}}$. The index laws were extended precisely so that cases like these would have answers, so the method reaches them too.',
              ),
            ),
            ask('idx-evaluate-roots+choice'),
            ask('idx-fractional+choice', 2),
          ],
          skillCheck: [ask('idx-equation', 2), ask('idx-equation', 2), ask('idx-equation', 2)],
        },
      ],
      levelCheck: [
        ask('idx-fractional', 2),
        ask('idx-equation', 2),
        ask('idx-index-form', 2),
        ask('idx-equation', 2),
        ask('idx-fractional', 2),
        ask('idx-index-form+choice', 2),
        ask('idx-fractional', 2),
        ask('idx-equation', 2),
        ask('idx-index-form', 2),
        ask('idx-equation', 2),
        ask('idx-fractional', 2),
        ask('idx-index-form', 2),
      ],
    },
    {
      id: 'er-l3',
      title: 'Surds',
      lessons: [
        {
          id: 'er-l3-simplify',
          title: 'Simplifying Surds',
          slides: [
            teach(
              prose(
                'A **surd** is a root that cannot be written exactly as a fraction — $\\sqrt{2}$, $\\sqrt{3}$, $\\sqrt{5}$. Left as a surd the value is exact; turned into a decimal it is rounded, and rounding early quietly spoils everything done afterwards.',
              ),
              prose(
                'Simplifying a surd means pulling out any square factor hiding under the root. It rests on one law: the root of a product splits into a product of roots.',
              ),
              maths('\\sqrt{ab} = \\sqrt{a} \\times \\sqrt{b}'),
              prose(
                'So to simplify $\\sqrt{72}$, hunt for the largest square number dividing 72, which is 36.',
              ),
              maths('\\sqrt{72} = \\sqrt{36 \\times 2} = \\sqrt{36} \\times \\sqrt{2} = 6\\sqrt{2}'),
            ),
            ask('rad-simplify'),
            ask('rad-fill-simplify'),
            ask('rad-simplify+choice'),
            teach(
              prose(
                'Only the square factor comes out, and it comes out as its root: in that example the 36 became 6, not 36.',
              ),
              prose(
                'Take the largest square factor or the job is only half done. Using 4 instead of 36 gives $\\sqrt{72} = 2\\sqrt{18}$, which is true but not finished, because $\\sqrt{18}$ still has a 9 in it.',
              ),
              maths('\\sqrt{72} = 2\\sqrt{18} = 2 \\times 3\\sqrt{2} = 6\\sqrt{2}'),
              prose(
                'The squares worth scanning for are 4, 9, 16, 25, 36, 49, 64, 81 and 100. Checking them from the largest downwards finds the answer in one pass.',
              ),
            ),
            ask('idx-evaluate-roots'),
            ask('rad-estimate'),
            ask('rad-fill-simplify', 2),
            teach(
              prose(
                'A surd is fully simplified when whatever remains under the root has no square factor left.',
              ),
              prose(
                '$\\sqrt{2}$, $\\sqrt{3}$, $\\sqrt{5}$, $\\sqrt{6}$, $\\sqrt{7}$ and $\\sqrt{10}$ are all as simple as they get. $\\sqrt{8}$ is not, because 4 divides 8.',
              ),
              prose(
                'A coefficient already in front is just multiplied by whatever comes out: $3\\sqrt{8} = 3 \\times 2\\sqrt{2} = 6\\sqrt{2}$.',
              ),
            ),
            ask('idx-evaluate-roots+choice'),
            ask('rad-estimate', 2),
          ],
          skillCheck: [ask('rad-simplify', 2), ask('rad-simplify', 2), ask('rad-simplify', 2)],
        },
        {
          id: 'er-l3-multiply',
          title: 'Multiplying Surds',
          slides: [
            teach(
              prose('Roots multiply straight across, and the law is just as useful backwards.'),
              maths('\\sqrt{a} \\times \\sqrt{b} = \\sqrt{ab}'),
              prose(
                'So $\\sqrt{3} \\times \\sqrt{5} = \\sqrt{15}$, and $\\sqrt{2} \\times \\sqrt{8} = \\sqrt{16} = 4$ — a pair of irrational numbers whose product is a whole number.',
              ),
              prose('Division behaves identically: $\\frac{\\sqrt{a}}{\\sqrt{b}} = \\sqrt{\\frac{a}{b}}$.'),
              prose(
                'Addition does not. $\\sqrt{9} + \\sqrt{16}$ is $3 + 4 = 7$, while $\\sqrt{25}$ is 5. This law holds for multiplication and division and for nothing else.',
              ),
            ),
            ask('rad-multiply'),
            ask('rad-fill-simplify'),
            ask('rad-multiply+choice'),
            teach(
              prose('A root multiplied by itself undoes itself, which is what a root means.'),
              maths('\\sqrt{m} \\times \\sqrt{m} = m'),
              prose(
                'Keep that firmly apart from the addition case: $\\sqrt{5} \\times \\sqrt{5} = 5$, but $\\sqrt{5} + \\sqrt{5} = 2\\sqrt{5}$.',
              ),
              prose(
                'With coefficients, the numbers and the roots are handled separately, exactly as they were with powers: $2\\sqrt{3} \\times 5\\sqrt{7} = 10\\sqrt{21}$.',
              ),
            ),
            ask('idx-evaluate-roots'),
            ask('rad-simplify'),
            ask('rad-fill-simplify', 2),
            teach(
              prose(
                'Multiply first and simplify afterwards. It is usually less work than simplifying each factor on the way in.',
              ),
              maths('\\sqrt{6} \\times \\sqrt{8} = \\sqrt{48} = \\sqrt{16 \\times 3} = 4\\sqrt{3}'),
              prose(
                'The product often hides a square factor even when neither surd did, so check the result before calling it finished.',
              ),
            ),
            ask('idx-evaluate-roots+choice'),
            ask('rad-simplify+choice', 2),
          ],
          skillCheck: [ask('rad-multiply', 2), ask('rad-multiply', 2), ask('rad-multiply', 2)],
        },
        {
          id: 'er-l3-add',
          title: 'Adding Like Surds',
          slides: [
            teach(
              prose(
                'Surds add only when the part under the root is identical. When it is, they behave exactly like like terms in algebra.',
              ),
              maths('3\\sqrt{5} + 4\\sqrt{5} = 7\\sqrt{5}'),
              prose(
                'Treat $\\sqrt{5}$ the way you would treat $x$: three of something plus four of the same something is seven of them, and the something itself never changes.',
              ),
              prose(
                'Adding the insides is the error to avoid. $3\\sqrt{5} + 4\\sqrt{5}$ is not $7\\sqrt{10}$, in just the way that $3x + 4x$ is not $7x^{2}$.',
              ),
            ),
            ask('rad-add'),
            ask('rad-fill-simplify'),
            ask('rad-add-steps'),
            teach(
              prose(
                'When the roots differ, nothing can be done — unless simplifying first makes them match.',
              ),
              maths('\\sqrt{8} + \\sqrt{18} = 2\\sqrt{2} + 3\\sqrt{2} = 5\\sqrt{2}'),
              prose(
                'Neither surd looked like a multiple of $\\sqrt{2}$ on the page, so a sum that appears impossible often only needs simplifying. Always simplify before concluding that two terms will not combine.',
              ),
              prose(
                'If they genuinely differ, as in $\\sqrt{2} + \\sqrt{3}$, the sum stays as it is. That is a complete answer, not an unfinished one.',
              ),
            ),
            ask('rad-simplify'),
            ask('rad-estimate'),
            ask('rad-fill-simplify', 2),
            teach(
              prose('Subtraction works the same way, and a coefficient of 1 is still a coefficient.'),
              maths('\\sqrt{7} + 5\\sqrt{7} = 6\\sqrt{7} \\qquad 5\\sqrt{7} - \\sqrt{7} = 4\\sqrt{7}'),
              prose(
                'Counting a bare surd as nothing rather than as one is a common slip, and it gives an answer that is short by exactly one.',
              ),
            ),
            ask('rad-simplify+choice', 2),
            ask('rad-estimate', 2),
          ],
          skillCheck: [ask('rad-add', 2), ask('rad-add', 2), ask('rad-add', 2)],
        },
        {
          id: 'er-l3-rationalise',
          title: 'Rationalising the Denominator',
          slides: [
            teach(
              prose(
                'A surd in the denominator is awkward — hard to compare, hard to add, and historically hard to divide by hand. Moving it to the top is called **rationalising the denominator**.',
              ),
              prose(
                'The trick is to multiply the fraction by $\\frac{\\sqrt{m}}{\\sqrt{m}}$, which is 1. The value therefore does not change; only the way it is written does.',
              ),
              maths('\\frac{1}{\\sqrt{3}} \\times \\frac{\\sqrt{3}}{\\sqrt{3}} = \\frac{\\sqrt{3}}{3}'),
              prose(
                'The denominator became 3 because $\\sqrt{3} \\times \\sqrt{3} = 3$, and the numerator picked up a $\\sqrt{3}$ in exchange.',
              ),
              prose(
                'Both forms are equal — about 0.577 either way. The second is simply the one everybody agrees to write down.',
              ),
            ),
            ask('rad-rationalise'),
            ask('rad-fill-rationalise'),
            ask('rad-multiply'),
            teach(
              prose('With a number on top, it comes along unchanged.'),
              maths('\\frac{5}{\\sqrt{2}} = \\frac{5\\sqrt{2}}{2}'),
              prose(
                'Two slips are worth naming. Multiplying only the bottom gives $\\frac{5}{2}$, which is a different number altogether. Multiplying only the top gives $\\frac{5\\sqrt{2}}{\\sqrt{2}}$, which has achieved nothing, since the root is still underneath.',
              ),
              prose(
                'Both halves have to be multiplied, because that is the only thing that makes the factor equal to 1.',
              ),
            ),
            ask('rad-simplify'),
            ask('rad-fill-rationalise', 2),
            ask('rad-multiply+choice'),
            teach(
              prose('Simplify the surd before rationalising where you can; the numbers stay smaller.'),
              maths(
                '\\frac{6}{\\sqrt{8}} = \\frac{6}{2\\sqrt{2}} = \\frac{3}{\\sqrt{2}} = \\frac{3\\sqrt{2}}{2}',
              ),
              prose(
                'Cancelling at the second step is what keeps this tidy. Rationalising $\\sqrt{8}$ directly works too, but it leaves an 8 underneath to cancel at the end instead.',
              ),
            ),
            ask('rad-rationalise', 2),
            ask('rad-simplify+choice', 2),
          ],
          skillCheck: [
            ask('rad-rationalise', 2),
            ask('rad-rationalise', 2),
            ask('rad-rationalise', 2),
          ],
        },
      ],
      levelCheck: [
        ask('rad-simplify', 2),
        ask('rad-multiply', 2),
        ask('rad-add', 2),
        ask('rad-rationalise', 2),
        ask('rad-simplify', 2),
        ask('rad-multiply', 2),
        ask('rad-add', 2),
        ask('rad-rationalise', 2),
        ask('rad-simplify', 2),
        ask('rad-multiply', 2),
        ask('rad-add', 2),
        ask('rad-rationalise', 2),
      ],
    },
    {
      id: 'er-l4',
      title: 'Standard Form',
      lessons: [
        {
          id: 'er-l4-large',
          title: 'Large Numbers',
          slides: [
            teach(
              prose(
                'Very large numbers are hard to read at a glance. **Standard form** writes them as a number from 1 up to (but not including) 10, times a power of ten.',
              ),
              maths('320\\,000 = 3.2 \\times 10^{5}'),
              prose(
                'The front number carries the digits and the power carries the size. $10^{5}$ is $100\\,000$, so $3.2 \\times 10^{5}$ is $3.2$ with the decimal point moved 5 places to the right.',
              ),
              prose(
                'Both parts have rules: the front number must be at least 1 and less than 10, and it must multiply a power of 10.',
              ),
            ),
            ask('sf-to-ordinary'),
            ask('sf-form-flow'),
            ask('sf-to-ordinary+choice'),
            teach(
              prose(
                'Going the other way, start from the digits. Put the point after the first one to get the front number, then count how many places it has to move to get back.',
              ),
              maths('4\\,700\\,000 \\quad\\to\\quad 4.7 \\quad\\to\\quad 4.7 \\times 10^{6}'),
              prose(
                'The point moves 6 places from $4.7$ to $4\\,700\\,000$, so the power is 6. A handy check: a number with 7 digits before the point always has power 6, one less than the count.',
              ),
            ),
            ask('sf-write-tiles'),
            ask('sf-power-slider'),
            ask('sf-write-tiles'),
            teach(
              prose(
                'A number can be the right size and still not be in standard form. $47 \\times 10^{5}$ equals $4\\,700\\,000$, but 47 is too big for a front number.',
              ),
              maths('47 \\times 10^{5} = 4.7 \\times 10 \\times 10^{5} = 4.7 \\times 10^{6}'),
              prose(
                'Making the front number ten times smaller means making the power ten times bigger, so the power goes up by one. The value never changes, only how it is written.',
              ),
            ),
            ask('sf-form-flow'),
            ask('sf-power-slider'),
          ],
          skillCheck: [
            ask('sf-write-tiles', 2),
            ask('sf-to-ordinary+choice', 2),
            ask('sf-to-ordinary', 2),
          ],
        },
        {
          id: 'er-l4-small',
          title: 'Small Numbers',
          slides: [
            teach(
              prose(
                'Small numbers use the same idea with a **negative** power. Level 1 showed that a negative index means a reciprocal, so $10^{-3}$ is $\\frac{1}{1000}$.',
              ),
              maths('4.5 \\times 10^{-3} = 4.5 \\div 1000 = 0.0045'),
              prose(
                'Dividing by $1000$ moves the point 3 places to the left, filling the gaps with zeros. A negative power always means a number smaller than 1.',
              ),
            ),
            ask('sf-small-to-ordinary'),
            ask('sf-small-power-slider'),
            ask('sf-small-to-ordinary+choice'),
            teach(
              prose(
                'To write a small number in standard form, find the first digit that is not zero and put the point after it. Then count the places back to where the point really is.',
              ),
              maths('0.00062 \\quad\\to\\quad 6.2 \\quad\\to\\quad 6.2 \\times 10^{-4}'),
              prose(
                'The point moves 4 places, so the power is $-4$. Another check: the first digit sits in the 4th decimal place, and the power is minus that position.',
              ),
            ),
            ask('sf-write-small-tiles'),
            ask('sf-form-flow', 2),
            ask('sf-small-power-slider'),
            teach(
              prose(
                'The sign of the power says which side of 1 the number is on: positive for numbers of 10 and over, negative for numbers under 1, and $10^{0} = 1$ for anything in between.',
              ),
              maths('6.2 \\times 10^{4} = 62\\,000 \\qquad 6.2 \\times 10^{-4} = 0.00062'),
              prose(
                'Getting the sign wrong turns a tiny number into a huge one, so check the answer against the question: a small number needs a negative power.',
              ),
            ),
            ask('sf-write-small-tiles'),
            ask('sf-form-flow', 2),
          ],
          skillCheck: [
            ask('sf-write-small-tiles', 2),
            ask('sf-small-to-ordinary+choice', 2),
            ask('sf-small-to-ordinary', 2),
          ],
        },
        {
          id: 'er-l4-multiply',
          title: 'Multiplying and Dividing',
          slides: [
            teach(
              prose(
                'Multiplication can be done in any order, so a product of two numbers in standard form splits into two easy products: the front numbers, and the powers of ten.',
              ),
              maths(
                '\\left(3 \\times 10^{4}\\right) \\times \\left(2 \\times 10^{6}\\right) = \\left(3 \\times 2\\right) \\times \\left(10^{4} \\times 10^{6}\\right) = 6 \\times 10^{10}',
              ),
              prose(
                'The powers are added, exactly as in level 1: $10^{4} \\times 10^{6} = 10^{10}$. Multiplying them is the slip to avoid.',
              ),
            ),
            ask('sf-split-tree'),
            ask('sf-multiply'),
            ask('sf-multiply+choice'),
            teach(
              prose(
                'Sometimes the front numbers multiply to 10 or more, and the answer is not in standard form yet.',
              ),
              maths(
                '\\left(3 \\times 10^{4}\\right) \\times \\left(5 \\times 10^{6}\\right) = 15 \\times 10^{10} = 1.5 \\times 10^{11}',
              ),
              prose(
                'Moving the point one place left makes 15 into 1.5, ten times smaller, so the power goes up by one to keep the value the same.',
              ),
            ),
            ask('sf-adjust-tiles'),
            ask('sf-split-tree'),
            ask('sf-adjust-tiles'),
            teach(
              prose('Dividing works the same way: divide the front numbers, and subtract the powers.'),
              maths('\\frac{8 \\times 10^{9}}{2 \\times 10^{3}} = \\frac{8}{2} \\times 10^{9 - 3} = 4 \\times 10^{6}'),
              prose(
                'Here the front number can come out less than 1: $\\frac{2}{5} = 0.4$. Then the point moves right, and the power goes **down** by one — $0.4 \\times 10^{6} = 4 \\times 10^{5}$.',
              ),
            ),
            ask('sf-divide'),
            ask('sf-divide+choice'),
          ],
          skillCheck: [
            ask('sf-multiply', 2),
            ask('sf-divide', 2),
            ask('sf-split-tree', 2),
          ],
        },
        {
          id: 'er-l4-add',
          title: 'Adding and Subtracting',
          slides: [
            teach(
              prose(
                'Adding is different: the front numbers can only be added when they count the same thing. With matching powers they do, like adding apples to apples.',
              ),
              maths('3.2 \\times 10^{4} + 1.5 \\times 10^{4} = 4.7 \\times 10^{4}'),
              prose(
                'Three point two lots of $10^{4}$ and one point five more makes four point seven lots. The power does not change, because nothing was multiplied.',
              ),
            ),
            ask('sf-add'),
            ask('sf-add-flow'),
            ask('sf-add+choice'),
            teach(
              prose(
                'When the powers differ, rewrite the smaller number with the larger power first. Its front number gets smaller to make up for the bigger power.',
              ),
              maths('5 \\times 10^{3} = 0.5 \\times 10^{4}'),
              maths('3.2 \\times 10^{4} + 5 \\times 10^{3} = 3.2 \\times 10^{4} + 0.5 \\times 10^{4} = 3.7 \\times 10^{4}'),
              prose(
                'Adding 3.2 and 5 to get $8.2 \\times 10^{4}$ is the mistake this step prevents: $5 \\times 10^{3}$ is 5000, nowhere near $50\\,000$.',
              ),
            ),
            ask('sf-common-power'),
            ask('sf-add-flow'),
            ask('sf-common-power'),
            teach(
              prose(
                'Adding can push the front number past 10, and subtracting can drop it below 1. Either way, finish by adjusting it back into standard form.',
              ),
              maths('6.2 \\times 10^{5} + 4.5 \\times 10^{5} = 10.7 \\times 10^{5} = 1.07 \\times 10^{6}'),
              maths('5.2 \\times 10^{5} - 4.7 \\times 10^{5} = 0.5 \\times 10^{5} = 5 \\times 10^{4}'),
            ),
            ask('sf-adjust-tiles'),
            ask('sf-adjust-tiles'),
          ],
          skillCheck: [
            ask('sf-add', 2),
            ask('sf-common-power', 2),
            ask('sf-add+choice', 2),
          ],
        },
        {
          id: 'er-l4-magnitude',
          title: 'Orders of Magnitude',
          slides: [
            teach(
              prose(
                'The power of ten in standard form is called the **order of magnitude**. It is the rough size of a number, before the detail of the front number.',
              ),
              prose(
                'So to compare numbers, compare the powers first. $1.2 \\times 10^{6}$ is bigger than $9.8 \\times 10^{5}$, even though 9.8 is bigger than 1.2: a million beats anything under a million.',
              ),
              prose('Only when the powers match do the front numbers decide.'),
            ),
            ask('sf-compare'),
            ask('sf-small-power-slider'),
            ask('sf-compare'),
            teach(
              prose(
                'How many times bigger one number is than another is a division, and with matching front numbers it is a pure power of ten.',
              ),
              maths('\\frac{4 \\times 10^{9}}{4 \\times 10^{5}} = 10^{4} = 10\\,000'),
              prose(
                'Each step up in the power is ten times bigger, so four steps is $10\\,000$ times — not 4 times, which is the easy slip.',
              ),
            ),
            ask('sf-times-bigger'),
            ask('sf-power-slider'),
            ask('sf-times-bigger+choice'),
            teach(
              prose(
                'Orders of magnitude make estimating quick. Round each front number to one significant figure, then multiply as usual.',
              ),
              maths(
                '\\left(3.9 \\times 10^{4}\\right) \\times \\left(2.1 \\times 10^{3}\\right) \\approx 4 \\times 2 \\times 10^{7} = 8 \\times 10^{7}',
              ),
              prose(
                'The exact answer is $8.19 \\times 10^{7}$. The estimate gets the power right and the front number close, which is usually all a check needs.',
              ),
            ),
            ask('sf-estimate'),
            ask('sf-estimate'),
          ],
          skillCheck: [
            ask('sf-compare', 2),
            ask('sf-times-bigger', 2),
            ask('sf-estimate', 2),
          ],
        },
      ],
      levelCheck: [
        ask('sf-to-ordinary', 2),
        ask('sf-write-small-tiles', 2),
        ask('sf-form-flow', 2),
        ask('sf-small-power-slider', 2),
        ask('sf-multiply', 2),
        ask('sf-divide+choice', 2),
        ask('sf-split-tree', 2),
        ask('sf-adjust-tiles', 2),
        ask('sf-add', 2),
        ask('sf-common-power', 2),
        ask('sf-add-flow', 2),
        ask('sf-compare', 2),
        ask('sf-times-bigger+choice', 2),
        ask('sf-estimate', 2),
      ],
    },
    {
      id: 'er-l5',
      title: 'Manipulating Surd Expressions',
      lessons: [
        {
          id: 'er-l5-bracket',
          title: 'Expanding a Bracket',
          slides: [
            teach(
              prose(
                'Level 3 simplified single surds. Now surds sit in brackets with whole numbers, and the aim is always one tidy shape: a whole number plus a multiple of one surd, like $7 + 3\\sqrt{2}$.',
              ),
              prose('A number outside a bracket multiplies **every** term inside it, exactly as in algebra.'),
              working('3(4 + 2\\sqrt{5}) &= 3 \\times 4 + 3 \\times 2\\sqrt{5}', '&= 12 + 6\\sqrt{5}'),
              prose(
                'Each term is a product, and level 3 settled how surds multiply: $\\sqrt{a} \\times \\sqrt{b} = \\sqrt{ab}$, and $\\sqrt{a} \\times \\sqrt{a} = a$ exactly.',
              ),
            ),
            ask('rad-expand-single'),
            ask('rad-product-flow'),
            ask('rad-expand-single+choice'),
            teach(
              prose(
                'A root outside the bracket multiplies each term too. When it meets the same root inside, the pair becomes a whole number, which moves to the front.',
              ),
              working('\\sqrt{3}(2\\sqrt{3} + 5) &= 2 \\times 3 + 5\\sqrt{3}', '&= 6 + 5\\sqrt{3}'),
              prose(
                'When the roots differ, multiply under one root and check for a square factor before moving on: $\\sqrt{6} \\times \\sqrt{3} = \\sqrt{18} = 3\\sqrt{2}$.',
              ),
            ),
            ask('rad-root-bracket-tree'),
            ask('rad-product-flow', 2),
            ask('rad-root-bracket-tree', 2),
            teach(
              prose(
                'With two brackets to expand, do each one, then collect: whole numbers with whole numbers, and multiples of the same surd with each other.',
              ),
              working(
                '&2(3 + \\sqrt{7}) + 4(1 - 2\\sqrt{7})',
                '&= 6 + 2\\sqrt{7} + 4 - 8\\sqrt{7}',
                '&= 10 - 6\\sqrt{7}',
              ),
              prose(
                'A minus in front of a bracket changes the sign of both its terms, just as it would in algebra.',
              ),
            ),
            ask('rad-collect'),
            ask('rad-collect', 2),
          ],
          skillCheck: [
            ask('rad-expand-single', 2),
            ask('rad-root-bracket-tree', 2),
            ask('rad-collect', 2),
          ],
        },
        {
          id: 'er-l5-double',
          title: 'Expanding Two Brackets',
          slides: [
            teach(
              prose(
                'Two brackets multiply the way they do in algebra: every term in the first times every term in the second, four products in all.',
              ),
              working('&(3 + \\sqrt{2})(4 + \\sqrt{2})', '&= 12 + 3\\sqrt{2} + 4\\sqrt{2} + 2'),
              prose(
                'The last product is $\\sqrt{2} \\times \\sqrt{2} = 2$, a whole number, so it joins the 12. The two middle terms are like surds and collect.',
              ),
              maths('= 14 + 7\\sqrt{2}'),
            ),
            ask('rad-expand-double'),
            ask('rad-product-flow'),
            ask('rad-expand-double+choice'),
            teach(
              prose(
                'Squaring a bracket is multiplying it by itself, so it has the same four products, and the two middle ones are equal.',
              ),
              working('&(3 + \\sqrt{5})^{2}', '&= 9 + 3\\sqrt{5} + 3\\sqrt{5} + 5', '&= 14 + 6\\sqrt{5}'),
              prose(
                'So a square is the first term squared, **twice** the product of the terms, and the second term squared. Writing $9 + 5$ and stopping is the classic slip: it loses the middle.',
              ),
            ),
            ask('rad-square-tree'),
            ask('rad-product-flow', 2),
            ask('rad-square-tree', 2),
            teach(
              prose('Now change one sign. The two middle products are equal and opposite, and cancel.'),
              working('&(3 + \\sqrt{5})(3 - \\sqrt{5})', '&= 9 - 3\\sqrt{5} + 3\\sqrt{5} - 5', '&= 4'),
              prose(
                'This is the **difference of two squares**, $(a + b)(a - b) = a^{2} - b^{2}$. With a surd as $b$ its square is whole, so no root survives. The next lesson puts that to work.',
              ),
            ),
            ask('rad-conjugate-product'),
            ask('rad-conjugate-product+choice'),
          ],
          skillCheck: [
            ask('rad-expand-double', 2),
            ask('rad-square-tree', 2),
            ask('rad-conjugate-product', 2),
          ],
        },
        {
          id: 'er-l5-conjugate',
          title: 'Rationalising with the Conjugate',
          slides: [
            teach(
              prose(
                'Level 3 cleared a root from a denominator by multiplying by that root. With two terms underneath that no longer works: $(2 + \\sqrt{3}) \\times \\sqrt{3} = 2\\sqrt{3} + 3$ still has a root in it.',
              ),
              prose(
                'Multiply instead by the **conjugate**: the same two terms with the sign between them changed. The bottom becomes a difference of two squares, which is whole.',
              ),
              working(
                '&\\frac{7}{3 + \\sqrt{2}} \\times \\frac{3 - \\sqrt{2}}{3 - \\sqrt{2}}',
                '&= \\frac{7(3 - \\sqrt{2})}{9 - 2} = 3 - \\sqrt{2}',
              ),
            ),
            ask('rad-pick-conjugate'),
            ask('rad-conjugate-product'),
            ask('rad-conjugate-tree'),
            teach(
              prose(
                'Work the top and the bottom separately. The bottom is always a whole number; the top is an ordinary single-bracket expansion.',
              ),
              working(
                '\\frac{12}{4 - \\sqrt{10}} &= \\frac{12(4 + \\sqrt{10})}{16 - 10}',
                '&= \\frac{48 + 12\\sqrt{10}}{6}',
                '&= 8 + 2\\sqrt{10}',
              ),
              prose(
                'Finish by dividing **both** terms on top by the bottom. Dividing only the whole number gives an easy, half-done answer.',
              ),
            ),
            ask('rad-binomial-rationalise-steps'),
            ask('rad-pick-conjugate', 2),
            ask('rad-binomial-rationalise'),
            teach(
              prose('The bottom can come out negative, when the surd part is the bigger square.'),
              working(
                '\\frac{2}{1 + \\sqrt{3}} &= \\frac{2(1 - \\sqrt{3})}{1 - 3}',
                '&= \\frac{2 - 2\\sqrt{3}}{-2}',
                '&= -1 + \\sqrt{3}',
              ),
              prose(
                'Dividing by a negative flips the sign of both terms. The answer is positive, as it must be: $\\sqrt{3}$ is about 1.73, so $-1 + \\sqrt{3}$ is about 0.73.',
              ),
            ),
            ask('rad-conjugate-tree', 2),
            ask('rad-conjugate-product+choice', 2),
          ],
          skillCheck: [
            ask('rad-binomial-rationalise', 2),
            ask('rad-conjugate-tree', 2),
            ask('rad-binomial-rationalise+choice', 2),
          ],
        },
        {
          id: 'er-l5-form',
          title: 'Equations and the Form a + b√c',
          slides: [
            teach(
              prose(
                'Surd answers are usually given in one standard shape, $a + b\\sqrt{c}$: a whole number plus a whole multiple of a single surd, with $c$ as small as it can be.',
              ),
              prose(
                'Getting there takes up to three checks, in this order: clear any root from a denominator, simplify any root hiding a square, then collect like surds.',
              ),
              working('&\\sqrt{12} + 5 - \\sqrt{3}', '&= 2\\sqrt{3} + 5 - \\sqrt{3}', '&= 5 + \\sqrt{3}'),
              prose(
                'Once it is in the form, $a$ and $b$ can be read off: here $a = 5$ and $b = 1$. A bare $\\sqrt{3}$ counts as $1\\sqrt{3}$, and a subtracted surd gives a negative $b$.',
              ),
            ),
            ask('rad-form-flow'),
            ask('rad-read-off'),
            ask('rad-form-flow', 2),
            teach(
              prose(
                'An equation with surd coefficients is solved the ordinary way: get $x$ on its own, then tidy the answer into the form.',
              ),
              working('x\\sqrt{3} &= 6 + 2\\sqrt{3}', 'x &= \\frac{6}{\\sqrt{3}} + \\frac{2\\sqrt{3}}{\\sqrt{3}}'),
              prose(
                'Divide each term by $\\sqrt{3}$ separately. The second is simply 2; the first is rationalised as in level 3, $\\frac{6\\sqrt{3}}{3} = 2\\sqrt{3}$. So $x = 2 + 2\\sqrt{3}$. If a number is added to the $x$ term, subtract it from both sides first.',
              ),
            ),
            ask('rad-divide-surd-steps'),
            ask('rad-surd-equation'),
            ask('rad-divide-surd-steps', 2),
            teach(
              prose(
                'When $x$ appears on both sides, gather the $x$ terms and factorise. What is left to divide by is a two-term surd, so the conjugate finishes the job.',
              ),
              working(
                'x\\sqrt{3} &= x + 4',
                'x(\\sqrt{3} - 1) &= 4',
                'x &= \\frac{4(\\sqrt{3} + 1)}{3 - 1}',
                '&= 2 + 2\\sqrt{3}',
              ),
            ),
            ask('rad-surd-equation+choice', 2),
            ask('rad-read-off', 2),
          ],
          skillCheck: [
            ask('rad-surd-equation', 2),
            ask('rad-read-off', 2),
            ask('rad-form-flow', 2),
          ],
        },
        {
          id: 'er-l5-geometry',
          title: 'Surds in Geometry',
          slides: [
            teach(
              prose(
                'Pythagoras is where surds turn up most naturally. A right-angled triangle with shorter sides 2 and 4 has a longest side of $\\sqrt{2^{2} + 4^{2}} = \\sqrt{20}$.',
              ),
              maths('\\sqrt{20} = \\sqrt{4 \\times 5} = 2\\sqrt{5}'),
              prose(
                'That is the **exact** length. A calculator gives 4.472…, which is rounded, and every step built on it inherits the rounding. Keep lengths as simplified surds until the very end.',
              ),
              prose('A size check still helps: $\\sqrt{20}$ is between 4 and 5, since $16 < 20 < 25$.'),
            ),
            ask('rad-pythag'),
            ask('rad-diagonal-slider'),
            ask('rad-pythag+choice'),
            teach(
              prose(
                'A perimeter adds side lengths, and a side such as $3 + \\sqrt{2}$ is two terms. Adding sides is collecting like terms.',
              ),
              working(
                '&2(3 + \\sqrt{2}) + 2(1 + 2\\sqrt{2})',
                '&= 6 + 2\\sqrt{2} + 2 + 4\\sqrt{2}',
                '&= 8 + 6\\sqrt{2}',
              ),
              prose(
                'That is the perimeter of a $3 + \\sqrt{2}$ by $1 + 2\\sqrt{2}$ rectangle. The whole numbers and the surds stay apart: $8 + 6\\sqrt{2}$ is not 14 of anything.',
              ),
            ),
            ask('rad-perimeter'),
            ask('rad-diagonal-slider', 2),
            ask('rad-perimeter', 2),
            teach(
              prose(
                'An area multiplies side lengths, so it is a bracket expansion, and a surd times the same surd turns whole.',
              ),
              working('&(2 + \\sqrt{3})(4 + \\sqrt{3})', '&= 8 + 2\\sqrt{3} + 4\\sqrt{3} + 3', '&= 11 + 6\\sqrt{3}'),
              prose(
                'A square is a bracket squared, so remember the doubled middle term. A triangle is half the base times the height, and a 2 in the base cancels the half.',
              ),
            ),
            ask('rad-rect-area'),
            ask('rad-rect-area', 2),
          ],
          skillCheck: [
            ask('rad-pythag', 2),
            ask('rad-perimeter', 2),
            ask('rad-rect-area', 2),
          ],
        },
      ],
      levelCheck: [
        ask('rad-expand-single', 2),
        ask('rad-root-bracket-tree', 2),
        ask('rad-collect', 2),
        ask('rad-expand-double+choice', 2),
        ask('rad-square-tree', 2),
        ask('rad-conjugate-product', 2),
        ask('rad-pick-conjugate', 2),
        ask('rad-binomial-rationalise', 2),
        ask('rad-conjugate-tree', 2),
        ask('rad-surd-equation', 2),
        ask('rad-read-off', 2),
        ask('rad-form-flow', 2),
        ask('rad-pythag', 2),
        ask('rad-rect-area', 2),
      ],
    },
    {
      id: 'er-l6',
      title: 'Index Equations & Substitution',
      lessons: [
        {
          id: 'er-l6-unlike',
          title: 'Equations with Unlike Bases',
          slides: [
            teach(
              prose(
                'Level 2 solved $2^{x} = 32$ by writing 32 as a power of 2. When the bases differ, as in $4^{x} = 32$, write **both** sides as powers of one number.',
              ),
              working('4^{x} &= (2^{2})^{x} = 2^{2x}', '32 &= 2^{5}'),
              prose(
                'So $2^{2x} = 2^{5}$. The bases match, so the indices are equal: $2x = 5$ and $x = \\frac{5}{2}$. A fraction on the right is a negative power, such as $\\frac{1}{8} = 2^{-3}$.',
              ),
            ),
            ask('ieq-base-flow'),
            ask('ieq-base-tiles'),
            ask('ieq-unlike'),
            teach(
              prose('A reciprocal is a negative index, so $\\frac{1}{9} = 3^{-2}$, and $27^{x} = \\frac{1}{9}$ becomes'),
              working('3^{3x} &= 3^{-2}', '3x &= -2', 'x &= -\\frac{2}{3}'),
              prose(
                'Negative and fractional answers are normal here. Check this one: the cube root of 27 is 3, and $3^{-2} = \\frac{1}{9}$.',
              ),
            ),
            ask('ieq-equate-tree'),
            ask('ieq-unlike+choice'),
            ask('ieq-base-flow'),
            teach(
              prose(
                'With an $x$ in both indices, rewrite both sides, multiplying out each index, then solve the linear equation that is left.',
              ),
              working('2^{x + 1} &= 8^{x - 1}', '2^{x + 1} &= 2^{3x - 3}', 'x + 1 &= 3x - 3', 'x &= 2'),
              prose('The 3 multiplies **both** terms of $x - 1$. Check: $2^{3} = 8$ and $8^{1} = 8$.'),
            ),
            ask('ieq-base-tiles', 2),
            ask('ieq-equate-tree', 2),
          ],
          skillCheck: [
            ask('ieq-unlike', 2),
            ask('ieq-base-flow', 2),
            ask('ieq-equate-tree', 2),
          ],
        },
        {
          id: 'er-l6-fractional',
          title: 'Fractional-Index Equations',
          slides: [
            teach(
              prose(
                'Now the unknown is the base: $x^{\\frac{3}{2}} = 8$. Raise both sides to the reciprocal power, $\\frac{2}{3}$. The indices multiply to 1, which leaves $x$.',
              ),
              working('x &= 8^{\\frac{2}{3}}', '&= (\\sqrt[3]{8})^{2} = 4'),
              prose(
                'Take the root first, as in level 2. If a number multiplies the power, as in $3x^{\\frac{3}{2}} = 24$, divide it off before anything else.',
              ),
            ),
            ask('ieq-undo-tree'),
            ask('ieq-frac-power'),
            ask('ieq-cross-slider'),
            teach(
              prose('A negative index has a negative reciprocal: the reciprocal of $-\\frac{1}{2}$ is $-2$.'),
              working('x^{-\\frac{1}{2}} &= \\frac{1}{4}', 'x &= \\left(\\frac{1}{4}\\right)^{-2}', '&= 4^{2} = 16'),
              prose('A negative power turns a fraction over, which is why the answer is bigger than 1.'),
            ),
            ask('ieq-reciprocal-tiles', 2),
            ask('ieq-frac-power+choice', 2),
            ask('ieq-undo-tree', 2),
            teach(
              prose(
                'An even number on **top** of the index hides the sign. $x^{\\frac{2}{3}} = 4$ says the cube root of $x$, squared, is 4, so that cube root is 2 or $-2$, and $x = 8$ or $x = -8$.',
              ),
              prose(
                'An even number **underneath** is an even root, which is never negative, so there only a positive $x$ works. And neither an even power nor an even root can equal a negative number: then there is no solution.',
              ),
            ),
            ask('ieq-sign-flow'),
            ask('ieq-sign-flow', 2),
          ],
          skillCheck: [
            ask('ieq-frac-power', 2),
            ask('ieq-undo-tree', 2),
            ask('ieq-sign-flow', 2),
          ],
        },
        {
          id: 'er-l6-hidden',
          title: 'Hidden Quadratics',
          slides: [
            teach(
              prose(
                'Some index equations are quadratics in disguise. In $9^{x} - 2(3^{x}) - 3 = 0$ the first term is $(3^{2})^{x} = (3^{x})^{2}$, so put $y = 3^{x}$.',
              ),
              working('y^{2} - 2y - 3 &= 0', '(y - 3)(y + 1) &= 0'),
              prose(
                'So $y = 3$ or $y = -1$. Now go back to $x$. $3^{x} = 3$ gives $x = 1$. But a power of a positive number is **always** positive, so $3^{x} = -1$ has no solution, and that root is rejected.',
              ),
            ),
            ask('ieq-quad-tiles'),
            ask('ieq-reject-flow'),
            ask('ieq-hidden-solve'),
            teach(
              prose('When both roots are positive powers, both give a solution.'),
              working('4^{x} - 5(2^{x}) + 4 &= 0', '(y - 1)(y - 4) &= 0'),
              prose(
                '$2^{x} = 4$ gives $x = 2$, and $2^{x} = 1$ gives $x = 0$, since any number to the power 0 is 1. A root of $y = 1$ is kept, not rejected.',
              ),
            ),
            ask('ieq-hidden-tree'),
            ask('ieq-hidden-solve+choice'),
            ask('ieq-reject-flow', 2),
            teach(
              prose(
                'The square term can be written other ways. With $y = 2^{x}$, each of these is $y^{2}$, because the index laws make them the same number.',
              ),
              maths('4^{x} = 2^{2x} = (2^{x})^{2}'),
              prose("Look for a term whose index is double another term's, over the same base."),
            ),
            ask('ieq-quad-tiles', 2),
            ask('ieq-hidden-tree', 2),
          ],
          skillCheck: [
            ask('ieq-hidden-solve', 2),
            ask('ieq-hidden-tree', 2),
            ask('ieq-quad-tiles', 2),
          ],
        },
        {
          id: 'er-l6-substitute',
          title: 'Substituting into Index Expressions',
          slides: [
            teach(
              prose(
                'To evaluate $3x^{\\frac{3}{2}}$ at $x = 4$, substitute, then deal with the index before multiplying by 3: powers come before multiplication.',
              ),
              working('3 \\times 4^{\\frac{3}{2}} &= 3 \\times (\\sqrt{4})^{3}', '&= 3 \\times 8 = 24'),
              prose(
                'Root first, then power, as in level 2. If $x$ is not a perfect square, $x^{\\frac{1}{2}}$ is a surd, and the value is not a whole number.',
              ),
            ),
            ask('ieq-term-steps'),
            ask('ieq-evaluate'),
            ask('ieq-kind-flow'),
            teach(
              prose('A negative index makes a fraction, not a negative number: $4^{-\\frac{1}{2}} = \\frac{1}{\\sqrt{4}} = \\frac{1}{2}$.'),
              working('3x^{\\frac{3}{2}} - x^{-\\frac{1}{2}} &= 24 - \\frac{1}{2}', '&= \\frac{47}{2}'),
              prose('Work each term out on its own, then combine them.'),
            ),
            ask('ieq-term-steps', 2),
            ask('ieq-evaluate+choice', 2),
            ask('ieq-kind-flow', 2),
            teach(
              prose(
                'So $x^{\\frac{2}{3}}$ is a whole number only when the cube root of $x$ is: $x$ has to be a perfect cube, such as 8, 27 or 64.',
              ),
              prose(
                'With a negative index there is a division: $12x^{-\\frac{1}{2}} = \\frac{12}{\\sqrt{x}}$ is whole when $\\sqrt{x}$ is a whole number that divides 12, such as $x = 9$.',
              ),
            ),
            ask('ieq-make-whole'),
            ask('ieq-make-whole', 2),
          ],
          skillCheck: [
            ask('ieq-evaluate', 2),
            ask('ieq-make-whole', 2),
            ask('ieq-kind-flow', 2),
          ],
        },
        {
          id: 'er-l6-surd-index',
          title: 'Surds and Indices Together',
          slides: [
            teach(
              prose(
                'A root is a fractional index, so an equation mixing roots and powers can be written with a single index, then solved as in lesson 2.',
              ),
              working('x\\sqrt{x} &= x^{1} \\times x^{\\frac{1}{2}} = x^{\\frac{3}{2}}', '\\sqrt[3]{x^{2}} &= x^{\\frac{2}{3}}'),
              prose('So $x\\sqrt{x} = 8$ is $x^{\\frac{3}{2}} = 8$, and $x = 8^{\\frac{2}{3}} = 4$.'),
            ),
            ask('ieq-single-index-tiles'),
            ask('ieq-cross-slider', 2),
            ask('ieq-single-index-tiles', 2),
            teach(
              prose(
                'Surds turn up on the other side too, where the unknown is in the index. Write the surd as a power of the base, adding the indices.',
              ),
              maths('8\\sqrt{2} = 2^{3} \\times 2^{\\frac{1}{2}} = 2^{\\frac{7}{2}}'),
              prose(
                'So $2^{x} = 8\\sqrt{2}$ gives $x = \\frac{7}{2}$. A surd underneath a fraction line is a negative index: $\\frac{1}{\\sqrt{3}} = 3^{-\\frac{1}{2}}$.',
              ),
            ),
            ask('ieq-surd-power'),
            ask('ieq-surd-base-tree'),
            ask('ieq-cross-slider', 2),
            teach(
              prose('When the left-hand base is itself a power, rewrite it too, then divide.'),
              working('4^{x} &= 2\\sqrt{2}', '2^{2x} &= 2^{\\frac{3}{2}}', 'x &= \\frac{3}{4}'),
            ),
            ask('ieq-surd-base-tree', 2),
            ask('ieq-surd-power+choice', 2),
          ],
          skillCheck: [
            ask('ieq-single-index-tiles', 2),
            ask('ieq-surd-power', 2),
            ask('ieq-surd-base-tree', 2),
          ],
        },
      ],
      levelCheck: [
        ask('ieq-unlike', 2),
        ask('ieq-base-tiles', 2),
        ask('ieq-equate-tree', 2),
        ask('ieq-frac-power', 2),
        ask('ieq-sign-flow', 2),
        ask('ieq-undo-tree', 2),
        ask('ieq-quad-tiles', 2),
        ask('ieq-hidden-solve', 2),
        ask('ieq-reject-flow', 2),
        ask('ieq-evaluate+choice', 2),
        ask('ieq-make-whole', 2),
        ask('ieq-single-index-tiles', 2),
        ask('ieq-surd-power', 2),
        ask('ieq-cross-slider', 2),
      ],
    },
    {
      id: 'er-l7',
      title: 'Growth by Repeated Multiplication',
      lessons: [
        {
          id: 'er-l7-multiplier',
          title: 'A Multiplier per Step',
          slides: [
            teach(
              prose(
                'Something multiplied by the same number at every step grows by repeated multiplication. Start with 3 cells that double every hour:',
              ),
              maths('3 \\to 6 \\to 12 \\to 24 \\to 48'),
              prose(
                'After 4 hours the 3 has been multiplied by 2 four times, which is $3 \\times 2^{4} = 48$. A start $a$ multiplied by $r$ at each of $n$ steps becomes',
              ),
              maths('V = a \\times r^{n}'),
            ),
            ask('grow-chain-tree'),
            ask('grow-term'),
            ask('grow-rule-tiles'),
            teach(
              prose(
                'Work out the power first, then multiply by the start. $3 \\times 2^{4}$ is $3 \\times 16 = 48$, while $(3 \\times 2)^{4} = 6^{4} = 1296$ is a different number entirely.',
              ),
              prose('How much it grew by is the end value take away the start:'),
              working('3 \\times 2^{4} - 3 &= 48 - 3', '&= 45'),
            ),
            ask('grow-evaluate'),
            ask('grow-chain-tree', 2),
            ask('grow-evaluate+choice', 2),
            teach(
              prose('Count the steps, not the time. Something that triples every 2 hours for 8 hours triples 4 times:'),
              working('8 \\div 2 &= 4', '5 \\times 3^{4} &= 405'),
              prose(
                'A table may also start part way in. If $V = 15$ at $n = 1$ and the multiplier is 3, step back once to the start, $15 \\div 3 = 5$, so $V = 5 \\times 3^{n}$.',
              ),
            ),
            ask('grow-term+choice', 2),
            ask('grow-rule-tiles', 2),
          ],
          skillCheck: [ask('grow-term', 2), ask('grow-rule-tiles', 2), ask('grow-evaluate', 2)],
        },
        {
          id: 'er-l7-percent',
          title: 'Percentage Change as a Multiplier',
          slides: [
            teach(
              prose(
                'A percentage change is a multiplier too. Going up 5% keeps all 100% and adds 5%, which makes 105%, so multiply by 1.05.',
              ),
              working('\\text{up } 5\\% &\\to \\times 1.05', '\\text{down } 20\\% &\\to \\times 0.8'),
              prose(
                'Going down 20% leaves 80%, so multiply by 0.8, not by 0.2. Multiplying by 0.2 would keep only a fifth.',
              ),
            ),
            ask('grow-pct-flow'),
            ask('grow-pct-value'),
            ask('grow-pct-tiles'),
            teach(
              prose('Over several years the multiplier is applied again each year, so two years at 5% is $1.05^{2}$.'),
              working('2000 \\times 1.05 &= 2100', '2100 \\times 1.05 &= 2205', '2000 \\times 1.05^{2} &= 2205'),
              prose(
                'Not 2200: the second 5% is worked out on 2100. To find when a value first passes a target, keep multiplying, one year at a time.',
              ),
            ),
            ask('grow-pct-slider'),
            ask('grow-pct-value+choice', 2),
            ask('grow-pct-tiles', 2),
            teach(
              prose(
                'The power of the multiplier is the overall change. $1.1^{2} = 1.21$, so two years of 10% growth is a 21% rise, not 20%.',
              ),
              prose(
                'So the multiplier for $n$ years is the yearly one to the power $n$, never the yearly one times $n$: $1.1 \\times 2 = 2.2$ would more than double the value.',
              ),
            ),
            ask('grow-pct-flow', 2),
            ask('grow-pct-slider', 2),
          ],
          skillCheck: [ask('grow-pct-value', 2), ask('grow-pct-flow', 2), ask('grow-pct-slider', 2)],
        },
        {
          id: 'er-l7-decay',
          title: 'Decay and Negative Indices',
          slides: [
            teach(
              prose(
                'Decay is repeated multiplication by a number less than 1. Halving multiplies by $\\frac{1}{2}$, so halving $n$ times multiplies by',
              ),
              maths('\\left(\\frac{1}{2}\\right)^{n} = \\frac{1}{2^{n}} = 2^{-n}'),
              prose(
                'A negative index is one over the power, so it makes a value smaller, never negative: $800 \\times 2^{-3} = \\frac{800}{8} = 100$.',
              ),
            ),
            ask('grow-decay-tiles'),
            ask('grow-trend-flow'),
            ask('grow-half-life'),
            teach(
              prose('The half-life is the time something takes to halve. With a half-life of 6 hours, 18 hours is 3 half-lives:'),
              working('18 \\div 6 &= 3', '160 \\times 2^{-3} &= 20'),
              prose(
                'To find when it first drops below a value, halve and count: $160 \\to 80 \\to 40 \\to 20$ is first below 30 after 3 halvings, which is 18 hours. On a graph, the half-life is where the curve comes down to half its starting height.',
              ),
            ),
            ask('grow-halflife-slider'),
            ask('grow-decay-tiles', 2),
            ask('grow-half-life+choice', 2),
            teach(
              prose('A quarter is two halvings and an eighth is three, so they take two and three half-lives.'),
              prose(
                'A negative index turns a fraction over: $\\left(\\frac{2}{3}\\right)^{-n} = \\left(\\frac{3}{2}\\right)^{n}$, which grows. What decides growth or decay is whether each step multiplies by more or less than 1.',
              ),
            ),
            ask('grow-halflife-slider', 2),
            ask('grow-trend-flow', 2),
          ],
          skillCheck: [ask('grow-half-life', 2), ask('grow-halflife-slider', 2), ask('grow-trend-flow', 2)],
        },
      ],
    },
  ],
};
