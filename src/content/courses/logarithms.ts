/**
 * Logarithms.
 *
 * Level 1 establishes the one idea everything else rests on — a logarithm is an
 * index — and the restriction that follows from it. Level 2 derives the three
 * laws from the index laws rather than presenting them as rules to memorise.
 * Level 3 uses them, which is where logarithms stop being notation and start
 * being the only way to get an unknown out of an index.
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

export const logarithms: Course = {
  id: 'logarithms',
  title: 'Logarithms',
  blurb: 'A logarithm is an index. Then the three laws, then solving with them.',
  levels: [
    {
      id: 'lg-l1',
      title: 'What a Logarithm Is',
      lessons: [
        {
          id: 'lg-l1-meaning',
          title: 'A Logarithm Is an Index',
          slides: [
            teach(
              prose(
                'Indices answer the question "what is $2^{5}$?". Logarithms answer it the other way round: "what power of 2 gives 32?"',
              ),
              prose(
                'The answer is 5, and the notation for that question is $\\log_{2}\\left(32\\right)$.',
              ),
              maths('\\log_{2}\\left(32\\right) = 5 \\iff 2^{5} = 32'),
              prose(
                'Those two statements carry exactly the same information. A logarithm **is** an index — the index you would have to use.',
              ),
              prose(
                'The small number is the **base**, and it stays the base in both forms. The logarithm is the index; the number inside the bracket is the result.',
              ),
            ),
            ask('log-to-index'),
            ask('log-from-index'),
            ask('log-evaluate'),
            teach(
              prose(
                'Converting between the two forms is the single most useful move in the topic, and it is worth doing automatically.',
              ),
              maths('\\log_{b}\\left(y\\right) = x \\iff b^{x} = y'),
              prose(
                'Read it as a sentence: the base, raised to the logarithm, gives the argument. Every log question can be attacked by writing that sentence down.',
              ),
              prose(
                'The usual confusion is which number goes where. The logarithm is never the result — it is the power. $\\log_{2}\\left(32\\right)$ is 5, not 32 and not 16.',
              ),
            ),
            ask('log-from-index'),
            ask('log-to-index'),
            ask('log-tree'),
            teach(
              prose('Two values come free, whatever the base.'),
              maths('\\log_{b}\\left(1\\right) = 0 \\qquad \\log_{b}\\left(b\\right) = 1'),
              prose(
                'Anything to the power zero is 1, which gives the first. Anything to the power one is itself, which gives the second. Both are worth recognising instantly rather than working out.',
              ),
              prose(
                'Base 10 is common enough that it is often written with no base at all, and base $e$ has a symbol of its own, $\\ln$. Level 3 is about that one.',
              ),
            ),
            ask('log-evaluate'),
            ask('log-tree'),
          ],
          skillCheck: [ask('log-to-index', 2), ask('log-to-index', 2), ask('log-evaluate', 2)],
        },
        {
          id: 'lg-l1-evaluate',
          title: 'Evaluating Logarithms',
          slides: [
            teach(
              prose(
                'To evaluate a logarithm, ask the question it is really asking: what power of the base gives this number?',
              ),
              maths('\\log_{3}\\left(81\\right) = ? \\iff 3^{?} = 81'),
              prose(
                'Counting up the powers of 3 gives 3, 9, 27, 81 — four steps, so the answer is 4.',
              ),
              prose(
                'Knowing the powers of 2 up to 1024, and the small powers of 3, 5 and 10, turns nearly every question of this kind into recall rather than work.',
              ),
              prose(
                'The answer is the index, not the number. Writing 81 instead of 4 is the slip to guard against, and it comes from reading the notation rather than the question.',
              ),
            ),
            ask('log-evaluate'),
            ask('log-evaluate+choice'),
            ask('log-chain-steps'),
            teach(
              prose('Sometimes the argument is not an obvious power, and breaking it up helps.'),
              maths('\\log_{2}\\left(4096\\right)'),
              prose(
                '4096 is easier to see as $1024 \\times 4$, which is $2^{10} \\times 2^{2} = 2^{12}$. So the answer is 12.',
              ),
              prose(
                'Splitting the argument into familiar powers beats counting up from the base as soon as the numbers get large.',
              ),
            ),
            ask('log-from-index'),
            ask('log-tree'),
            ask('log-chain-steps+choice'),
            teach(
              prose('Negative answers happen whenever the argument is smaller than 1.'),
              maths('\\log_{2}\\left(\\frac{1}{8}\\right) = -3'),
              prose(
                'Because $2^{-3} = \\frac{1}{8}$. A negative logarithm is perfectly ordinary — it says the index was negative, and nothing more.',
              ),
              prose(
                'So the sign of a logarithm says which side of 1 the argument lies on: positive above, zero at 1, negative below.',
              ),
            ),
            ask('log-from-index'),
            ask('log-tree'),
          ],
          skillCheck: [ask('log-evaluate', 2), ask('log-evaluate', 2), ask('log-evaluate', 2)],
        },
        {
          id: 'lg-l1-solve',
          title: 'Solving Simple Log Equations',
          slides: [
            teach(
              prose(
                'An equation with the unknown inside a logarithm is solved by converting to index form, which frees the unknown immediately.',
              ),
              maths('\\log_{3}\\left(x\\right) = 4 \\iff x = 3^{4} = 81'),
              prose('No manipulation is needed at all — the conversion does the whole job.'),
              prose(
                'Check which number becomes the index. It is the right-hand side, sitting above the base. Putting them the other way round gives $4^{3} = 64$, a different answer entirely.',
              ),
            ),
            ask('log-solve-simple'),
            ask('log-solve-simple+choice'),
            ask('log-from-index'),
            teach(
              prose('The same conversion works when it is the base that is unknown.'),
              maths('\\log_{x}\\left(125\\right) = 3 \\iff x^{3} = 125 \\iff x = 5'),
              prose('And when the logarithm itself is unknown, the equation is just an evaluation.'),
              maths('\\log_{2}\\left(64\\right) = x \\iff 2^{x} = 64 \\iff x = 6'),
              prose(
                'Three different-looking problems, one method: write the index form and read off whatever is missing.',
              ),
            ),
            ask('log-chain-steps'),
            ask('log-from-index'),
            ask('log-tree'),
            teach(
              prose('Always check the answer keeps the logarithm defined.'),
              prose(
                'The argument of a logarithm has to be positive, so a candidate that makes it zero or negative must be discarded rather than reported. That matters as soon as the argument is an expression rather than a bare $x$.',
              ),
              maths('\\log_{5}\\left(x\\right) = 2 \\implies x = 25'),
              prose(
                'Here 25 is positive, so there is nothing to discard. The next lesson is about why that check is not a formality.',
              ),
            ),
            ask('log-chain-steps+choice'),
            ask('log-tree'),
          ],
          skillCheck: [
            ask('log-solve-simple', 2),
            ask('log-solve-simple', 2),
            ask('log-solve-simple', 2),
          ],
        },
        {
          id: 'lg-l1-domain',
          title: 'What a Logarithm Cannot Do',
          slides: [
            teach(
              prose(
                'A logarithm asks what power of the base gives the argument. Since a positive base raised to any power stays positive, some arguments have no answer at all.',
              ),
              maths('2^{x} = 0 \\quad \\text{has no solution}'),
              prose(
                'No power of 2 is ever zero. It gets small — $2^{-10}$ is about a thousandth — but it never arrives. So $\\log_{2}\\left(0\\right)$ is undefined.',
              ),
              prose(
                'The same argument rules out negatives: no power of 2 is negative either, so $\\log_{2}\\left(-8\\right)$ is undefined too.',
              ),
              prose(
                'So the argument of a logarithm must be **strictly positive**. That is the domain of the function, and it is the one restriction worth memorising.',
              ),
            ),
            ask('log-domain'),
            ask('log-domain-flow'),
            ask('log-evaluate'),
            teach(
              prose('The base has restrictions too: it must be positive, and it must not be 1.'),
              maths('1^{x} = 1 \\quad \\text{for every } x'),
              prose(
                'Base 1 is useless because every power of 1 is 1. "What power of 1 gives 8?" has no answer, and "what power of 1 gives 1?" has infinitely many.',
              ),
              prose(
                'A negative base fails for a different reason: its powers alternate in sign, and they are not even defined for fractional indices.',
              ),
            ),
            ask('log-domain'),
            ask('log-domain-flow'),
            ask('log-tree'),
            teach(
              prose(
                'This is why solving a log equation ends with a check rather than an answer.',
              ),
              maths('\\log_{2}\\left(x - 3\\right) = 4 \\implies x - 3 = 16 \\implies x = 19'),
              prose(
                'Here $x - 3 = 16$ is positive, so 19 is genuinely a solution. But an equation can produce a candidate that makes an argument negative, and such a candidate is not a solution at all — it is an artefact of the algebra.',
              ),
              prose(
                'Substituting back into the original is the only reliable check, and it takes one line.',
              ),
            ),
            ask('log-evaluate'),
            ask('log-tree'),
          ],
          skillCheck: [ask('log-domain', 2), ask('log-domain', 2), ask('log-domain', 2)],
        },
      ],
      levelCheck: [
        ask('log-to-index', 2),
        ask('log-evaluate', 2),
        ask('log-solve-simple', 2),
        ask('log-domain', 2),
        ask('log-to-index', 2),
        ask('log-evaluate', 2),
        ask('log-solve-simple', 2),
        ask('log-domain', 2),
        ask('log-evaluate', 2),
        ask('log-solve-simple', 2),
        ask('log-domain', 2),
        ask('log-to-index', 2),
      ],
    },
    {
      id: 'lg-l2',
      title: 'The Laws of Logarithms',
      lessons: [
        {
          id: 'lg-l2-add',
          title: 'Adding and Subtracting',
          slides: [
            teach(
              prose(
                'The laws of logarithms come straight from the index laws, because a logarithm is an index.',
              ),
              prose('Multiplying powers adds their indices. So multiplying arguments adds their logarithms.'),
              maths('\\log_{b}\\left(m\\right) + \\log_{b}\\left(n\\right) = \\log_{b}\\left(mn\\right)'),
              prose(
                'Check it with numbers: $\\log_{2}\\left(8\\right) + \\log_{2}\\left(4\\right) = 3 + 2 = 5$, and $\\log_{2}\\left(32\\right) = 5$. The arguments multiplied, $8 \\times 4 = 32$, while the logarithms added.',
              ),
              prose(
                'This was the original purpose of logarithms. Before calculators they turned multiplication into addition, which is far easier by hand.',
              ),
            ),
            ask('log-arithmetic'),
            ask('log-combine'),
            ask('log-law-flow'),
            teach(
              prose('Dividing powers subtracts their indices, which gives the second law.'),
              maths(
                '\\log_{b}\\left(m\\right) - \\log_{b}\\left(n\\right) = \\log_{b}\\left(\\frac{m}{n}\\right)',
              ),
              prose(
                'The order matters in the same way as for ordinary subtraction: the first argument goes on top. Reversing it gives the reciprocal, whose logarithm is the negative of the right answer.',
              ),
              prose(
                'Adding the arguments is the error to guard against. $\\log\\left(8\\right) + \\log\\left(4\\right)$ is $\\log\\left(32\\right)$, not $\\log\\left(12\\right)$ — the logarithms add, and that is exactly why the arguments multiply.',
              ),
            ),
            ask('log-arithmetic'),
            ask('log-split'),
            ask('log-law-flow'),
            teach(
              prose('Both laws need the *same base* on every term. Without that nothing can be combined.'),
              maths('\\log_{2}\\left(8\\right) + \\log_{3}\\left(9\\right)'),
              prose(
                'That sum is $3 + 2 = 5$, but it cannot be written as a single logarithm of anything. Each term has to be evaluated on its own.',
              ),
              prose(
                'So the first thing to check on any combining question is whether the bases match. If they do not, the laws are simply not available.',
              ),
            ),
            ask('log-combine+choice'),
            ask('log-split'),
          ],
          skillCheck: [ask('log-arithmetic', 2), ask('log-arithmetic', 2), ask('log-combine', 2)],
        },
        {
          id: 'lg-l2-power',
          title: 'The Power Law',
          slides: [
            teach(
              prose(
                'The third law follows from the first. A power is a repeated product, so its logarithm is a repeated sum.',
              ),
              maths(
                '\\log_{b}\\left(m^{3}\\right) = \\log_{b}\\left(m \\times m \\times m\\right) = 3\\log_{b}\\left(m\\right)',
              ),
              prose('In general the index comes out to the front as a multiplier.'),
              maths('\\log_{b}\\left(m^{k}\\right) = k\\log_{b}\\left(m\\right)'),
              prose(
                'This is the most important of the three, because it is the one that lets logarithms solve equations: it turns an unknown *index* into an unknown *coefficient*, and ordinary algebra can reach a coefficient.',
              ),
            ),
            ask('log-power-rule'),
            ask('log-power-steps'),
            ask('log-split'),
            teach(
              prose('The index becomes a multiplier, not a power of the logarithm.'),
              maths('\\log_{2}\\left(8^{4}\\right) = 4\\log_{2}\\left(8\\right) = 4 \\times 3 = 12'),
              prose(
                'So the answer is 12, not $3^{4} = 81$. Check it directly: $8^{4} = 4096 = 2^{12}$.',
              ),
              prose(
                'The law also runs in reverse, turning a coefficient back into an index. That direction is used constantly when tidying an expression into a single logarithm.',
              ),
            ),
            ask('log-power-rule'),
            ask('log-power-steps+choice'),
            ask('log-combine'),
            teach(
              prose('Two useful consequences fall out at once.'),
              maths(
                '\\log_{b}\\left(\\frac{1}{m}\\right) = -\\log_{b}\\left(m\\right) \\qquad \\log_{b}\\left(\\sqrt{m}\\right) = \\frac{1}{2}\\log_{b}\\left(m\\right)',
              ),
              prose(
                'A reciprocal is a power of $-1$ and a square root is a power of $\\frac{1}{2}$, so neither needs a rule of its own. Both are the power law with a negative or fractional index.',
              ),
              prose(
                'Recognising roots and reciprocals as indices before starting is what makes these questions short.',
              ),
            ),
            ask('log-law-flow'),
            ask('log-combine+choice'),
          ],
          skillCheck: [ask('log-power-rule', 2), ask('log-power-rule', 2), ask('log-combine', 2)],
        },
        {
          id: 'lg-l2-combine',
          title: 'Into a Single Logarithm',
          slides: [
            teach(
              prose(
                'Questions often ask for an expression to be written as a single logarithm, because that is the form an equation can be solved from.',
              ),
              prose(
                'Work in this order: the power law first, to clear any coefficients, then addition and subtraction to merge what is left.',
              ),
              maths('2\\log\\left(3\\right) + \\log\\left(5\\right) = \\log\\left(9\\right) + \\log\\left(5\\right) = \\log\\left(45\\right)'),
              prose(
                'Clearing the coefficient first matters. Trying to merge $2\\log\\left(3\\right)$ with $\\log\\left(5\\right)$ directly has no law to justify it.',
              ),
              prose(
                'A coefficient in front of a logarithm is not a multiplier of the argument: $2\\log\\left(3\\right)$ is $\\log\\left(9\\right)$, not $\\log\\left(6\\right)$.',
              ),
            ),
            ask('log-combine'),
            ask('log-law-flow'),
            ask('log-combine+choice'),
            teach(
              prose('Subtraction and negative coefficients behave as expected once the coefficients are cleared.'),
              maths('3\\log\\left(2\\right) - \\log\\left(4\\right) = \\log\\left(8\\right) - \\log\\left(4\\right) = \\log\\left(2\\right)'),
              prose(
                'A subtracted term ends up in the denominator. A term with a negative coefficient first becomes the logarithm of a reciprocal, which amounts to the same thing.',
              ),
              prose(
                'Check numerically whenever the arguments are small. Here $\\log\\left(2\\right)$ is clearly right because $\\frac{8}{4} = 2$.',
              ),
            ),
            ask('log-split'),
            ask('log-law-flow'),
            ask('log-arithmetic'),
            teach(
              prose(
                'The reverse direction — splitting one logarithm into several — is the same three laws read backwards, and it appears just as often.',
              ),
              maths('\\log\\left(\\frac{m^{2}}{n}\\right) = 2\\log\\left(m\\right) - \\log\\left(n\\right)'),
              prose(
                'A product becomes a sum, a quotient becomes a difference, an index becomes a coefficient. Nothing new is needed.',
              ),
              prose(
                'What cannot be split is a sum *inside* a logarithm. $\\log\\left(m + n\\right)$ does not break up at all, and treating it as though it does is the most serious error in the topic.',
              ),
            ),
            ask('log-split'),
            ask('log-power-rule'),
          ],
          skillCheck: [ask('log-combine', 2), ask('log-combine', 2), ask('log-combine', 2)],
        },
        {
          id: 'lg-l2-equations',
          title: 'Using the Laws to Solve',
          slides: [
            teach(
              prose(
                'An equation with two logarithms needs the laws before the conversion: combine into one logarithm first, then convert to index form.',
              ),
              maths('\\log_{2}\\left(x\\right) - \\log_{2}\\left(5\\right) = 3'),
              maths('\\log_{2}\\left(\\frac{x}{5}\\right) = 3 \\iff \\frac{x}{5} = 2^{3} = 8 \\iff x = 40'),
              prose(
                'Combining first is what reduces two terms carrying the unknown to one. Converting each logarithm separately leaves two where there was one and gets nowhere.',
              ),
              prose(
                'Then check the answer keeps every argument positive. Here $x = 40$ is positive, so the equation is genuinely defined there.',
              ),
            ),
            ask('log-laws-equation'),
            ask('log-law-flow'),
            ask('log-power-steps'),
            teach(
              prose(
                'When the unknown appears twice inside logarithms, combining produces a product or a quotient — and often a quadratic.',
              ),
              maths('\\log\\left(x\\right) + \\log\\left(x + 3\\right) = \\log\\left(10\\right)'),
              prose(
                'Combining gives $\\log\\left(x\\left(x + 3\\right)\\right) = \\log\\left(10\\right)$, so $x^{2} + 3x = 10$, giving $x = 2$ or $x = -5$.',
              ),
              prose(
                'Here the domain check earns its place: $x = -5$ makes both original arguments negative, so it is not a solution. Only $x = 2$ survives.',
              ),
            ),
            ask('log-laws-equation'),
            ask('log-split'),
            ask('log-law-flow'),
            teach(
              prose(
                'When both sides are a single logarithm to the same base, the arguments must be equal — and the logarithms disappear entirely.',
              ),
              maths('\\log_{b}\\left(u\\right) = \\log_{b}\\left(v\\right) \\iff u = v'),
              prose(
                'It is valid because a logarithm takes each value only once, so two equal logarithms can only have come from equal arguments.',
              ),
              prose(
                'The full method, in order: clear coefficients, combine to one logarithm on each side, then either equate the arguments or convert to index form. Then check the domain.',
              ),
            ),
            ask('log-power-steps+choice'),
            ask('log-combine'),
          ],
          skillCheck: [
            ask('log-laws-equation', 2),
            ask('log-laws-equation', 2),
            ask('log-laws-equation', 2),
          ],
        },
      ],
      levelCheck: [
        ask('log-arithmetic', 2),
        ask('log-power-steps', 2),
        ask('log-combine', 2),
        ask('log-laws-equation', 2),
        ask('log-arithmetic', 2),
        ask('log-power-rule', 2),
        ask('log-combine', 2),
        ask('log-laws-equation', 2),
        ask('log-arithmetic', 2),
        ask('log-combine', 2),
        ask('log-laws-equation', 2),
        ask('log-power-rule', 2),
      ],
    },
    {
      id: 'lg-l3',
      title: 'Solving with Logarithms',
      lessons: [
        {
          id: 'lg-l3-exponential',
          title: 'Solving an Exponential Equation',
          slides: [
            teach(
              prose(
                'When both sides can be written as powers of one base, an equation like $2^{x} = 32$ needs no logarithms at all — match the indices.',
              ),
              prose(
                'But $2^{x} = 30$ cannot be done that way, because 30 is not a power of 2. This is what logarithms were built for.',
              ),
              maths('2^{x} = 30 \\implies x\\ln\\left(2\\right) = \\ln\\left(30\\right)'),
              prose(
                'Take logarithms of both sides, and the power law brings the unknown down from the index into a coefficient — where dividing can reach it.',
              ),
              maths('x = \\frac{\\ln\\left(30\\right)}{\\ln\\left(2\\right)}'),
            ),
            ask('log-solve-exponential'),
            ask('log-exponential-tiles'),
            ask('log-method-flow'),
            teach(
              prose(
                'Any base will do for the logarithms you take, provided the same one is used on both sides. The answer comes out the same.',
              ),
              maths(
                'x = \\frac{\\log_{10}\\left(30\\right)}{\\log_{10}\\left(2\\right)} = \\frac{\\ln\\left(30\\right)}{\\ln\\left(2\\right)}',
              ),
              prose(
                'That equality is the **change of base** rule, and it is why a calculator with only two logarithm buttons can compute a logarithm to any base at all.',
              ),
              maths('\\log_{a}\\left(c\\right) = \\frac{\\log_{b}\\left(c\\right)}{\\log_{b}\\left(a\\right)}'),
            ),
            ask('log-decay-slider'),
            ask('log-solve-exponential+choice'),
            ask('log-exponential-tiles'),
            teach(
              prose(
                'The answer is a quotient of logarithms, not the logarithm of a quotient. Those are different numbers.',
              ),
              maths('\\frac{\\ln\\left(30\\right)}{\\ln\\left(2\\right)} \\neq \\ln\\left(15\\right)'),
              prose(
                'The first is about 4.91 and the second about 2.71. Confusing them is the characteristic error here, and it comes from reading the fraction as though some law applied to it.',
              ),
              prose(
                'No law turns a quotient of logarithms into anything simpler. Leaving it as it stands *is* the exact answer.',
              ),
            ),
            ask('log-method-flow'),
            ask('log-decay-slider'),
          ],
          skillCheck: [
            ask('log-solve-exponential', 2),
            ask('log-solve-exponential', 2),
            ask('log-solve-exponential', 2),
          ],
        },
        {
          id: 'lg-l3-natural',
          title: 'Natural Logarithms',
          slides: [
            teach(
              prose(
                'One base matters more than all the others. The number $e$, about 2.718, is the base at which the exponential function is its own derivative.',
              ),
              prose(
                'Its logarithm has a name and a symbol of its own: the **natural logarithm**, written $\\ln$.',
              ),
              maths('\\ln\\left(x\\right) = \\log_{e}\\left(x\\right)'),
              prose(
                'Every law already met applies to it unchanged, because it is just a logarithm with a particular base. What makes it convenient is that it undoes $e^{x}$ exactly, with nothing left over.',
              ),
              maths('\\ln\\left(e^{y}\\right) = y \\qquad e^{\\ln\\left(y\\right)} = y'),
            ),
            ask('log-natural'),
            ask('log-natural+choice'),
            ask('log-exponential-tiles'),
            teach(
              prose(
                'So an equation built on $e$ is solved by taking natural logarithms, and the exponential simply vanishes.',
              ),
              maths('e^{3x} = 20 \\implies 3x = \\ln\\left(20\\right) \\implies x = \\frac{\\ln\\left(20\\right)}{3}'),
              prose(
                'Taking logarithms to base 10 would work too, but it would leave a $\\log\\left(e\\right)$ behind to deal with. Matching the base to the exponential is what keeps the working clean.',
              ),
              prose(
                'Divide the whole logarithm by the coefficient, not part of it: $\\frac{\\ln\\left(20\\right)}{3}$ is not $\\ln\\left(\\frac{20}{3}\\right)$.',
              ),
            ),
            ask('log-decay-slider'),
            ask('log-method-flow'),
            ask('log-exponential-tiles'),
            teach(
              prose(
                'A negative coefficient means decay rather than growth, and a negative answer is then ordinary.',
              ),
              maths('e^{-2x} = 5 \\implies x = \\frac{\\ln\\left(5\\right)}{-2}'),
              prose(
                'The quantity is falling, so reaching a value above 1 means going backwards in $x$. Nothing has gone wrong.',
              ),
              prose(
                'Leave the logarithm in place unless a decimal is asked for. $\\ln\\left(5\\right)$ is exact; 1.609 is rounded, and rounding early spoils everything done afterwards.',
              ),
            ),
            ask('log-solve-exponential'),
            ask('log-decay-slider'),
          ],
          skillCheck: [ask('log-natural', 2), ask('log-natural', 2), ask('log-natural', 2)],
        },
        {
          id: 'lg-l3-growth',
          title: 'Growth and Decay',
          slides: [
            teach(
              prose(
                'Anything that multiplies by a fixed factor each step grows exponentially, and asking when it passes a threshold is a logarithm question.',
              ),
              maths('N = N_{0} \\times r^{t}'),
              prose(
                'Here $N_{0}$ is the starting amount, $r$ the factor per step and $t$ the number of steps. Setting $N$ to the threshold and solving for $t$ needs a logarithm, because $t$ is an index.',
              ),
              maths('100 \\times 3^{t} > 10000 \\implies 3^{t} > 100'),
              prose(
                'Dividing by the starting amount first is always worth doing. It leaves the simplest possible exponential inequality.',
              ),
            ),
            ask('log-growth'),
            ask('log-growth+choice'),
            ask('log-decay-slider'),
            teach(
              prose('Then take logarithms and divide, exactly as before.'),
              maths('t > \\frac{\\ln\\left(100\\right)}{\\ln\\left(3\\right)} \\approx 4.19'),
              prose(
                'So the threshold is crossed during the fifth step. If only whole steps count, the answer is 5.',
              ),
              prose(
                'Rounding the wrong way is the characteristic error in every question of this shape. At $t = 4$ the quantity is still below the threshold, so 4 is not an answer — round *up*.',
              ),
            ),
            ask('log-method-flow'),
            ask('log-natural'),
            ask('log-decay-slider'),
            teach(
              prose(
                'Decay works the same way with a factor below 1, and the inequality reverses along the way.',
              ),
              maths('0.8^{t} < 0.1 \\implies t > \\frac{\\ln\\left(0.1\\right)}{\\ln\\left(0.8\\right)} \\approx 10.3'),
              prose(
                'Both logarithms are negative here, so their quotient is positive — and dividing the inequality by the negative $\\ln\\left(0.8\\right)$ is what flipped the sign.',
              ),
              prose(
                'Checking against the original inequality is the safest habit. Substituting the whole numbers either side of the exact value settles which one is wanted.',
              ),
            ),
            ask('log-exponential-tiles'),
            ask('log-method-flow'),
          ],
          skillCheck: [ask('log-growth', 2), ask('log-growth', 2), ask('log-growth', 2)],
        },
        {
          id: 'lg-l3-models',
          title: 'Reading a Model',
          slides: [
            teach(
              prose(
                'Exam questions rarely say "take logarithms". They describe a situation, and the work is deciding which equation it is.',
              ),
              prose(
                'Three things identify an exponential model: a starting value, a fixed multiplier per unit of time, and a question about when something is reached.',
              ),
              maths('P = 5000 \\times 1.04^{t}'),
              prose(
                'Read that as 5000 to begin with, growing by 4% a year, after $t$ years. A 4% increase is a multiplier of 1.04, not 0.04.',
              ),
              prose(
                'Getting the multiplier wrong is the most common error in these questions, and it happens before any logarithms are involved.',
              ),
            ),
            ask('log-growth', 2),
            ask('log-natural+choice', 2),
            ask('log-decay-slider', 2),
            teach(
              prose(
                'Once the model is written down the method is fixed: substitute, divide out the starting value, take logarithms, divide.',
              ),
              maths(
                '1.04^{t} = 1.6 \\implies t = \\frac{\\ln\\left(1.6\\right)}{\\ln\\left(1.04\\right)} \\approx 11.98',
              ),
              prose(
                'So it passes 8000 during the twelfth year. Whether the answer wanted is 11, 12, or "about 12 years" depends on exactly what was asked — read the question again before writing it down.',
              ),
              prose('A decay model is identical with a multiplier below 1: a 4% annual fall is a multiplier of 0.96.'),
            ),
            ask('log-solve-exponential', 2),
            ask('log-method-flow', 2),
            ask('log-growth+choice', 2),
            teach(
              prose('Two checks catch most mistakes in questions of this kind.'),
              prose(
                'First, is the answer the right size? A quantity growing at 4% a year takes about 18 years to double, so an answer of 2 years or 200 years for a 60% rise is wrong.',
              ),
              maths('t \\approx \\frac{\\ln\\left(2\\right)}{\\ln\\left(1.04\\right)} \\approx 17.7'),
              prose(
                'Second, is it the right sign? Growth towards a larger target gives a positive time; anything negative means the model or the target has been read backwards.',
              ),
            ),
            ask('log-decay-slider', 2),
            ask('log-method-flow', 2),
          ],
          skillCheck: [ask('log-growth', 2), ask('log-natural', 2), ask('log-solve-exponential', 2)],
        },
      ],
      levelCheck: [
        ask('log-solve-exponential', 2),
        ask('log-natural', 2),
        ask('log-growth', 2),
        ask('log-solve-exponential', 2),
        ask('log-natural', 2),
        ask('log-growth', 2),
        ask('log-solve-exponential', 2),
        ask('log-natural', 2),
        ask('log-growth', 2),
        ask('log-solve-exponential', 2),
        ask('log-natural', 2),
        ask('log-growth', 2),
      ],
    },
  ],
};
