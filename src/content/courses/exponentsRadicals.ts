/**
 * Exponents and Radicals.
 *
 * The three index laws first, derived by counting copies rather than stated as
 * rules to memorise; then the laws are pushed past whole numbers, where a
 * negative index has to mean a reciprocal and a fractional one has to mean a
 * root if the laws are to survive; then surds, which is that second idea used
 * in anger.
 *
 * Each level closes with a level check: twelve questions, no teaching slides,
 * one attempt each.
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

export const exponentsRadicals: Course = {
  id: 'exponents-radicals',
  title: 'Exponents & Radicals',
  blurb: 'The index laws by counting copies, then roots, then surds.',
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
            ask('idx-order-of-operations'),
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
            ask('idx-multiply'),
            ask('idx-multiply'),
            teach(
              prose('Three or more powers work the same way — add all the exponents at once.'),
              maths('x^{2} \\times x^{3} \\times x^{4} = x^{9}'),
              prose(
                'And the law reads backwards just as well, which turns out to be the more useful direction later: $x^{9}$ can be split into $x^{4} \\times x^{5}$ whenever that helps.',
              ),
            ),
            ask('idx-multiply+choice'),
            ask('idx-multiply'),
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
            ask('idx-divide'),
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
            ask('idx-divide'),
            ask('idx-divide'),
            teach(
              prose(
                'The two laws so far are a pair. Multiplying adds, dividing subtracts, and both insist on the same base.',
              ),
              maths('x^{a} \\times x^{b} = x^{a + b} \\qquad \\frac{x^{a}}{x^{b}} = x^{a - b}'),
              prose(
                'Nothing here says anything about $\\frac{x^{5}}{y^{2}}$. Different bases do not cancel, and that fraction simply stays as it is.',
              ),
            ),
            ask('idx-divide+choice'),
            ask('idx-divide'),
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
            ask('idx-power-of-power'),
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
            ask('idx-multiply'),
            ask('idx-power-of-power'),
            teach(
              prose(
                'Negative exponents need no special treatment here — multiply them as they stand and keep the sign.',
              ),
              maths('\\left(x^{-2}\\right)^{5} = x^{-10}'),
              prose(
                'Two negatives multiply to a positive in the usual way, so $\\left(x^{-3}\\right)^{-2} = x^{6}$.',
              ),
            ),
            ask('idx-power-of-power+choice'),
            ask('idx-power-of-power'),
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
            ask('idx-multiply-terms'),
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
            ask('idx-multiply-terms'),
            ask('idx-multiply-terms'),
            teach(
              prose(
                'Addition is the odd one out. $3x^{2} + 4x^{2}$ is $7x^{2}$, because those are like terms — same base, same index — so the coefficients simply count them.',
              ),
              maths('3x^{2} + 4x^{2} = 7x^{2} \\qquad 3x^{2} \\times 4x^{2} = 12x^{4}'),
              prose(
                'But $3x^{2} + 4x^{3}$ does not simplify at all. Only multiplication and division have index laws; addition needs the terms to match exactly before anything can happen.',
              ),
            ),
            ask('idx-multiply-terms+choice'),
            ask('idx-multiply-terms'),
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
            ask('idx-negative'),
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
            ask('idx-negative'),
            ask('idx-negative'),
            teach(
              prose('Negative indices obey every law already met, with no special cases.'),
              maths('x^{-2} \\times x^{-3} = x^{-5} \\qquad \\frac{x^{-2}}{x^{3}} = x^{-5}'),
              prose(
                'That is the point of allowing them. The three laws then hold for every whole number, positive or negative, rather than only for counting numbers — and the same argument is about to push them further still.',
              ),
            ),
            ask('idx-negative+choice'),
            ask('idx-divide'),
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
            ask('idx-fractional'),
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
            ask('idx-fractional'),
            ask('idx-fractional'),
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
            ask('idx-fractional+choice'),
            ask('idx-fractional'),
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
            ask('idx-index-form'),
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
            ask('idx-fractional', 2),
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
            ask('idx-index-form', 2),
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
            ask('idx-equation'),
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
            ask('idx-equation'),
            ask('idx-equation'),
            teach(
              prose('A negative or fractional answer is not a sign that something has gone wrong.'),
              maths('2^{n} = \\frac{1}{8} \\implies 2^{n} = 2^{-3} \\implies n = -3'),
              prose(
                'And $9^{n} = 3$ gives $n = \\frac{1}{2}$, because 3 is $9^{\\frac{1}{2}}$. The index laws were extended precisely so that cases like these would have answers, so the method reaches them too.',
              ),
            ),
            ask('idx-equation+choice'),
            ask('idx-fractional', 2),
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
            ask('rad-simplify'),
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
            ask('rad-simplify'),
            ask('rad-simplify', 2),
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
            ask('rad-simplify+choice', 2),
            ask('rad-simplify', 2),
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
            ask('rad-multiply'),
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
            ask('rad-multiply'),
            ask('rad-multiply', 2),
            teach(
              prose(
                'Multiply first and simplify afterwards. It is usually less work than simplifying each factor on the way in.',
              ),
              maths('\\sqrt{6} \\times \\sqrt{8} = \\sqrt{48} = \\sqrt{16 \\times 3} = 4\\sqrt{3}'),
              prose(
                'The product often hides a square factor even when neither surd did, so check the result before calling it finished.',
              ),
            ),
            ask('rad-multiply+choice', 2),
            ask('rad-simplify'),
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
            ask('rad-add'),
            ask('rad-add+choice'),
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
            ask('rad-add'),
            ask('rad-add'),
            teach(
              prose('Subtraction works the same way, and a coefficient of 1 is still a coefficient.'),
              maths('\\sqrt{7} + 5\\sqrt{7} = 6\\sqrt{7} \\qquad 5\\sqrt{7} - \\sqrt{7} = 4\\sqrt{7}'),
              prose(
                'Counting a bare surd as nothing rather than as one is a common slip, and it gives an answer that is short by exactly one.',
              ),
            ),
            ask('rad-add+choice'),
            ask('rad-add'),
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
            ask('rad-multiply'),
            ask('rad-rationalise'),
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
            ask('rad-rationalise'),
            ask('rad-rationalise'),
            teach(
              prose('Simplify the surd before rationalising where you can; the numbers stay smaller.'),
              maths(
                '\\frac{6}{\\sqrt{8}} = \\frac{6}{2\\sqrt{2}} = \\frac{3}{\\sqrt{2}} = \\frac{3\\sqrt{2}}{2}',
              ),
              prose(
                'Cancelling at the second step is what keeps this tidy. Rationalising $\\sqrt{8}$ directly works too, but it leaves an 8 underneath to cancel at the end instead.',
              ),
            ),
            ask('rad-rationalise'),
            ask('rad-multiply'),
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
  ],
};
