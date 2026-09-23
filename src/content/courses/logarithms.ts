/**
 * Logarithms.
 *
 * Level 1 establishes the one idea everything else rests on — a logarithm is an
 * index — and the restriction that follows from it. Level 2 derives the three
 * laws from the index laws rather than presenting them as rules to memorise.
 * Level 3 uses them, which is where logarithms stop being notation and start
 * being the only way to get an unknown out of an index. Level 4 changes base:
 * the formula, what it cancels, solving with it, and choosing the base that
 * makes an answer exact. Level 5 draws the curve: its shape and key points,
 * its reflection y = a^x, what transformations do to it, and reading
 * solutions off it.
 *
 * Each level closes with a level check: twelve to fourteen questions, no
 * teaching slides, one attempt each.
 */
import type { Block, Course, SlideRef } from '../types';
import { logGraphSvg, type LogGraphOptions } from '../generators/logarithms';

const teach = (...blocks: Block[]): SlideRef => ({
  type: 'literal',
  slide: { kind: 'teach', body: blocks },
});

const ask = (generatorId: string, difficulty = 1): SlideRef => ({
  type: 'generated',
  generatorId,
  difficulty,
});

const prose = (text: string) => ({ kind: 'prose' as const, text });
const maths = (tex: string) => ({ kind: 'display' as const, tex });

/**
 * A figure for a teaching slide, drawn by the same helper the level-5
 * questions use, so the picture the learner is taught from is the one they are
 * then asked about.
 */
const graph = (opts: LogGraphOptions): Block => ({ kind: 'diagram', svg: logGraphSvg(opts) });

/** y = log_b(x - k) + c, to draw. */
const logf =
  (base: number, k = 0, c = 0) =>
  (x: number) =>
    Math.log(x - k) / Math.log(base) + c;

export const logarithms: Course = {
  id: 'logarithms',
  title: 'Logarithms',
  blurb: 'A logarithm is an index. Then the three laws, solving with them, changing base, and the graph.',
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
            ask('log-sum-tree'),
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
            ask('log-combine-steps'),
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
    {
      id: 'lg-l4',
      title: 'Change of Base',
      lessons: [
        {
          id: 'lg-l4-formula',
          title: 'The Change of Base Formula',
          slides: [
            teach(
              prose('Level 3 solved $2^{x} = 30$ by taking natural logarithms of both sides.'),
              maths('2^{x} = 30 \\implies x = \\frac{\\ln\\left(30\\right)}{\\ln\\left(2\\right)}'),
              prose(
                'But by definition $2^{x} = 30$ also says $x = \\log_{2}\\left(30\\right)$. So those are the same number, and nothing about 2 or 30 was special. That is the **change of base** formula.',
              ),
              maths('\\log_{a}\\left(b\\right) = \\frac{\\ln\\left(b\\right)}{\\ln\\left(a\\right)}'),
              prose(
                'The base sits low in $\\log_{a}$ and it stays low in the fraction: base underneath, argument on top.',
              ),
            ),
            ask('log-change-base'),
            ask('log-change-base-tiles'),
            ask('log-change-base+choice'),
            teach(
              prose(
                'Nothing in the formula needs $\\ln$. Any new base works, provided the same one is used top and bottom.',
              ),
              maths(
                '\\log_{a}\\left(b\\right) = \\frac{\\log_{c}\\left(b\\right)}{\\log_{c}\\left(a\\right)}',
              ),
              prose(
                'A calculator uses $e$ or 10 because those are the buttons it has. By hand, the best new base is one that makes both logarithms whole.',
              ),
              maths(
                '\\log_{8}\\left(64\\right) = \\frac{\\log_{2}\\left(64\\right)}{\\log_{2}\\left(8\\right)} = \\frac{6}{3} = 2',
              ),
            ),
            ask('log-quotient-reduce'),
            ask('log-change-base-slider'),
            ask('log-change-base-tiles'),
            teach(
              prose(
                'The fraction upside down is the one mistake worth guarding against, and there is a quick check for it.',
              ),
              maths('2^{4} = 16 < 20 < 32 = 2^{5} \\implies 4 < \\log_{2}\\left(20\\right) < 5'),
              prose(
                '$\\frac{\\ln\\left(20\\right)}{\\ln\\left(2\\right)} \\approx 4.32$ sits in that range. Upside down it would be about 0.23, nowhere near.',
              ),
              prose(
                'On a graph, $\\log_{2}\\left(20\\right)$ is where the curve $y = 2^{x}$ reaches the height 20.',
              ),
            ),
            ask('log-quotient-reduce+choice'),
            ask('log-change-base-slider'),
          ],
          skillCheck: [
            ask('log-change-base', 2),
            ask('log-quotient-reduce+choice', 2),
            ask('log-change-base+choice', 2),
          ],
        },
        {
          id: 'lg-l4-reciprocal',
          title: 'Reciprocals and Chains',
          slides: [
            teach(
              prose(
                'Swap the base and the argument, and the change of base formula turns upside down.',
              ),
              maths(
                '\\log_{a}\\left(b\\right) = \\frac{\\ln\\left(b\\right)}{\\ln\\left(a\\right)} \\qquad \\log_{b}\\left(a\\right) = \\frac{\\ln\\left(a\\right)}{\\ln\\left(b\\right)}',
              ),
              prose('So each is the reciprocal of the other, and their product is exactly 1.'),
              maths('\\log_{a}\\left(b\\right) \\times \\log_{b}\\left(a\\right) = 1'),
              prose(
                'For example $\\log_{2}\\left(8\\right) = 3$, so $\\log_{8}\\left(2\\right) = \\frac{1}{3}$ — and indeed $8^{1/3} = 2$.',
              ),
            ),
            ask('log-reciprocal'),
            ask('log-reciprocal+choice'),
            teach(
              prose(
                'The same cancellation runs further. When the argument of one logarithm is the base of the next, the shared number drops out.',
              ),
              maths(
                '\\log_{a}\\left(b\\right) \\times \\log_{b}\\left(c\\right) = \\frac{\\ln\\left(b\\right)}{\\ln\\left(a\\right)} \\times \\frac{\\ln\\left(c\\right)}{\\ln\\left(b\\right)} = \\log_{a}\\left(c\\right)',
              ),
              prose(
                'What is left runs from the outer base to the outer argument. With whole numbers it checks: $\\log_{2}\\left(4\\right) \\times \\log_{4}\\left(64\\right) = 2 \\times 3 = 6 = \\log_{2}\\left(64\\right)$.',
              ),
            ),
            ask('log-chain-reduce'),
            ask('log-chain-tiles'),
            ask('log-product-flow'),
            teach(
              prose(
                'A product does not care which order it is written in, so look for the shared number on either side of the $\\times$.',
              ),
              maths('\\log_{7}\\left(20\\right) \\times \\log_{3}\\left(7\\right) = \\log_{3}\\left(20\\right)'),
              prose(
                'If no number is both an argument and a base, nothing cancels and the product stays as two logarithms.',
              ),
            ),
            ask('log-chain-reduce+choice'),
            ask('log-product-flow'),
            ask('log-chain-tiles'),
          ],
          skillCheck: [
            ask('log-reciprocal', 2),
            ask('log-chain-reduce+choice', 2),
            ask('log-reciprocal+choice', 2),
          ],
        },
        {
          id: 'lg-l4-solve',
          title: 'Solving Index Equations',
          slides: [
            teach(
              prose(
                'By definition $a^{x} = b$ means $x = \\log_{a}\\left(b\\right)$, and the change of base formula turns that into something a calculator can do.',
              ),
              maths(
                '3^{x} = 50 \\implies x = \\log_{3}\\left(50\\right) = \\frac{\\ln\\left(50\\right)}{\\ln\\left(3\\right)}',
              ),
              prose(
                'Before calculating, bracket it: $3^{3} = 27$ and $3^{4} = 81$, so $x$ is between 3 and 4. An answer outside that range has gone wrong.',
              ),
            ),
            ask('log-between'),
            ask('log-change-base-slider'),
            teach(
              prose(
                'When there is more than $x$ in the index, the *whole index* equals the logarithm. Solve for the index first, then for $x$.',
              ),
              maths(
                '3^{x + 2} = 50 \\implies x + 2 = \\frac{\\ln\\left(50\\right)}{\\ln\\left(3\\right)} \\implies x = \\frac{\\ln\\left(50\\right)}{\\ln\\left(3\\right)} - 2',
              ),
              maths(
                '3^{4x} = 50 \\implies 4x = \\frac{\\ln\\left(50\\right)}{\\ln\\left(3\\right)} \\implies x = \\frac{\\ln\\left(50\\right)}{4\\ln\\left(3\\right)}',
              ),
            ),
            ask('log-solve-index'),
            ask('log-solve-index-tiles'),
            ask('log-between'),
            teach(
              prose(
                'With both, undo them in the reverse of the order they were built: take the constant off, then divide by the coefficient.',
              ),
              maths(
                '3^{4x + 2} = 50 \\implies x = \\frac{1}{4}\\left(\\frac{\\ln\\left(50\\right)}{\\ln\\left(3\\right)} - 2\\right)',
              ),
              prose(
                'The slip is taking the 2 off $\\ln\\left(50\\right)$ before dividing. The 2 was added to the index, not to a logarithm, so it comes off after the change of base.',
              ),
            ),
            ask('log-solve-index+choice'),
            ask('log-solve-index-tiles'),
            ask('log-change-base-slider'),
          ],
          skillCheck: [
            ask('log-solve-index', 2),
            ask('log-solve-index+choice', 2),
            ask('log-solve-index', 2),
          ],
        },
        {
          id: 'lg-l4-choosing',
          title: 'Choosing a Base',
          slides: [
            teach(
              prose(
                'Change of base works with any base, so the real question is which one makes the arithmetic easiest.',
              ),
              prose(
                'When the base and the argument are both powers of one smaller number, change to that number. Both logarithms come out whole and the answer is an exact fraction.',
              ),
              maths(
                '\\log_{8}\\left(32\\right) = \\frac{\\log_{2}\\left(32\\right)}{\\log_{2}\\left(8\\right)} = \\frac{5}{3}',
              ),
              prose(
                'Natural logarithms give $\\frac{\\ln\\left(32\\right)}{\\ln\\left(8\\right)}$ — the same number, but hiding that it is exactly $\\frac{5}{3}$.',
              ),
            ),
            ask('log-common-base-tiles'),
            ask('log-solve-common'),
            ask('log-quotient-reduce'),
            teach(
              prose(
                'The same idea solves an equation directly: write both sides as powers of the shared number and match the indices.',
              ),
              maths('8^{x} = 32 \\implies 2^{3x} = 2^{5} \\implies x = \\frac{5}{3}'),
              prose('A reciprocal on the right only makes the index negative.'),
              maths('8^{x} = \\frac{1}{4} \\implies 2^{3x} = 2^{-2} \\implies x = -\\frac{2}{3}'),
            ),
            ask('log-solve-common+choice'),
            ask('log-base-flow'),
            ask('log-common-base-tiles'),
            teach(
              prose(
                'When the numbers share no base — $\\log_{3}\\left(10\\right)$, say — no choice makes the logarithms whole. Change to $e$, use the calculator, and accept a decimal.',
              ),
              prose(
                'So there are three cases: an exact power, where the index is read off; a shared base, which gives an exact fraction; and everything else, which goes to base $e$.',
              ),
            ),
            ask('log-base-flow'),
            ask('log-quotient-reduce+choice'),
          ],
          skillCheck: [
            ask('log-solve-common', 2),
            ask('log-common-base-tiles', 2),
            ask('log-solve-common+choice', 2),
          ],
        },
      ],
      levelCheck: [
        ask('log-change-base', 2),
        ask('log-quotient-reduce+choice', 2),
        ask('log-change-base-tiles', 2),
        ask('log-reciprocal', 2),
        ask('log-chain-reduce+choice', 2),
        ask('log-product-flow', 2),
        ask('log-solve-index', 2),
        ask('log-between', 2),
        ask('log-solve-index-tiles', 2),
        ask('log-change-base-slider', 2),
        ask('log-solve-common', 2),
        ask('log-common-base-tiles', 2),
        ask('log-base-flow', 2),
        ask('log-chain-tiles', 2),
      ],
    },
    {
      id: 'lg-l5',
      title: 'Logarithmic Graphs',
      lessons: [
        {
          id: 'lg-l5-graph',
          title: 'The Graph of a Logarithm',
          slides: [
            teach(
              prose('Plot $y = \\log_{2} x$ from its easy points. Each doubling of $x$ adds 1 to the height.'),
              maths('(1, 0) \\quad (2, 1) \\quad (4, 2) \\quad (8, 3)'),
              graph({
                xMin: -0.6,
                xMax: 10,
                yMin: -3,
                yMax: 4,
                curves: [{ f: logf(2) }],
                marks: [
                  { x: 1, y: 0 },
                  { x: 2, y: 1 },
                  { x: 4, y: 2 },
                  { x: 8, y: 3 },
                ],
                labels: [{ x: 8, y: 3, text: '(8, 3)' }],
                label: 'The curve y = log base 2 of x through four marked points',
              }),
              prose(
                'Every point on $y = \\log_{a} x$ is $(a^{k}, k)$. Two are on every such curve: $(1, 0)$, because $a^{0} = 1$, and $(a, 1)$, because $a^{1} = a$.',
              ),
            ),
            ask('log-graph-read'),
            ask('log-graph-slider'),
            ask('log-graph-points-tiles'),
            teach(
              prose(
                'Left of $x = 1$ the heights go negative: $(\\frac{1}{2}, -1)$, $(\\frac{1}{4}, -2)$, and on without end.',
              ),
              prose(
                'The curve dives towards the $y$-axis but never meets it, because no power of 2 is 0 or less. The $y$-axis is a **vertical asymptote**.',
              ),
              maths('y = \\log_{a} x \\implies x > 0'),
              prose(
                'So a point with $x \\le 0$ is never on the curve. For any other point, check that the base to the power of the height gives $x$.',
              ),
            ),
            ask('log-on-curve-flow'),
            ask('log-graph-read+choice'),
            ask('log-graph-slider'),
            teach(
              prose(
                'A larger base climbs more slowly. $\\log_{10} x$ only reaches 2 at $x = 100$, where $\\log_{2} x$ is already past 6.',
              ),
              graph({
                xMin: -1,
                xMax: 20,
                yMin: -3,
                yMax: 5,
                curves: [{ f: logf(2), accent: true }, { f: logf(10) }],
                marks: [
                  { x: 2, y: 1 },
                  { x: 10, y: 1 },
                ],
                horizontals: [1],
                labels: [
                  { x: 2, y: 1, text: '(2, 1)' },
                  { x: 10, y: 1, text: '(10, 1)' },
                ],
                label: 'The curves y = log base 2 of x and y = log base 10 of x',
              }),
              prose(
                'Both pass through $(1, 0)$, and each meets the line $y = 1$ at its own base. That crossing is how a base is read off a graph.',
              ),
            ),
            ask('log-graph-points-tiles'),
            ask('log-on-curve-flow'),
          ],
          skillCheck: [
            ask('log-graph-read', 2),
            ask('log-graph-points-tiles', 2),
            ask('log-on-curve-flow', 2),
          ],
        },
        {
          id: 'lg-l5-inverse',
          title: 'Reflection in y = x',
          slides: [
            teach(
              prose(
                '$y = 2^{x}$ and $y = \\log_{2} x$ say the same thing about the same numbers, with $x$ and $y$ swapped.',
              ),
              maths('y = 2^{x} \\iff x = \\log_{2} y'),
              graph({
                xMin: -3,
                xMax: 8,
                yMin: -3,
                yMax: 6.28,
                height: 240,
                curves: [
                  { f: (x) => Math.pow(2, x), accent: true },
                  { f: logf(2) },
                  { f: (x) => x, dashed: true },
                ],
                marks: [
                  { x: 2, y: 4 },
                  { x: 4, y: 2 },
                ],
                labels: [
                  { x: 2, y: 4, text: '(2, 4)', place: 'above-left' },
                  { x: 4, y: 2, text: '(4, 2)', place: 'below-right' },
                ],
                label: 'The curves y = 2 to the x and y = log base 2 of x, reflected in the line y = x',
              }),
              prose(
                'So each curve is the other reflected in the line $y = x$. A point $(p, q)$ on one is $(q, p)$ on the other.',
              ),
            ),
            ask('log-inverse-point'),
            ask('log-graph-match'),
            ask('log-mirror-slider'),
            teach(
              prose('Functions that swap $x$ and $y$ like this are **inverses**: each undoes the other.'),
              maths('\\log_{a}\\left(a^{x}\\right) = x'),
              maths('a^{\\log_{a} x} = x'),
              prose(
                'The first holds for every $x$. The second only for $x > 0$, because the logarithm has to exist before it can be undone.',
              ),
            ),
            ask('log-undo-evaluate'),
            ask('log-inverse-point'),
            ask('log-graph-match'),
            teach(
              prose(
                'Every feature swaps too. $y = a^{x}$ passes through $(0, 1)$ and $(1, a)$, and $y = \\log_{a} x$ through $(1, 0)$ and $(a, 1)$.',
              ),
              prose(
                "The exponential flattens onto the $x$-axis on the left, a horizontal asymptote $y = 0$. Reflected, that is the logarithm's vertical asymptote $x = 0$.",
              ),
              prose(
                'And the exponential takes any $x$ but gives only positive $y$, so the logarithm takes only positive $x$ but gives any $y$.',
              ),
            ),
            ask('log-mirror-slider'),
            ask('log-undo-evaluate'),
          ],
          skillCheck: [
            ask('log-inverse-point', 2),
            ask('log-graph-match', 2),
            ask('log-undo-evaluate', 2),
          ],
        },
        {
          id: 'lg-l5-transform',
          title: 'Transforming the Graph',
          slides: [
            teach(
              prose(
                'A number added **outside** the logarithm moves every height: $y = \\log_{2} x + 3$ is the curve moved up 3.',
              ),
              prose(
                'A number added **inside** acts on $x$, and backwards: $y = \\log_{2}\\left(x - 3\\right)$ is the curve moved *right* 3.',
              ),
              graph({
                xMin: -1,
                xMax: 12,
                yMin: -3,
                yMax: 4,
                curves: [{ f: logf(2), dashed: true }, { f: logf(2, 3), accent: true }],
                verticals: [{ x: 3 }],
                label: 'The curve y = log base 2 of x, and the same curve moved 3 to the right',
              }),
              prose(
                'Only the inside change moves the asymptote. It sits where the bracket is zero: $x - 3 = 0$, so $x = 3$.',
              ),
            ),
            ask('log-transform-match'),
            ask('log-transform-slider'),
            ask('log-transform-tiles'),
            teach(
              prose('Multiplying works the same way round. Outside, $y = 3\\log_{2} x$ stretches every height by 3.'),
              prose(
                'Inside, $y = \\log_{2}\\left(3x\\right)$ reaches each height at a third of the old $x$: a horizontal stretch, scale factor $\\frac{1}{3}$.',
              ),
              prose(
                'Neither stretch moves the asymptote, since $3x = 0$ still means $x = 0$. But the inside one moves the intercept to $x = \\frac{1}{3}$.',
              ),
            ),
            ask('log-transform-flow'),
            ask('log-transform-match'),
            ask('log-transform-tiles'),
            teach(
              prose('Two facts pin down any transformed curve.'),
              prose(
                'The asymptote is where the inside of the logarithm is zero. The $x$-intercept is where the whole right-hand side is zero.',
              ),
              maths('y = \\log_{2}\\left(x - 3\\right) - 1'),
              maths('x - 3 = 0 \\implies x = 3'),
              maths('\\log_{2}\\left(x - 3\\right) = 1 \\implies x = 5'),
            ),
            ask('log-transform-slider'),
            ask('log-transform-flow'),
          ],
          skillCheck: [
            ask('log-transform-match', 2),
            ask('log-transform-tiles', 2),
            ask('log-transform-slider', 2),
          ],
        },
        {
          id: 'lg-l5-solve',
          title: 'Reading and Solving from a Graph',
          slides: [
            teach(
              prose(
                'To solve $\\log_{2} x = 3$ on a graph, draw the line $y = 3$ and read off where the curve crosses it.',
              ),
              graph({
                xMin: -0.6,
                xMax: 11,
                yMin: -3,
                yMax: 4.5,
                curves: [{ f: logf(2) }],
                horizontals: [3],
                marks: [{ x: 8, y: 3, hollow: true }],
                labels: [{ x: 8, y: 3, text: '(8, 3)' }],
                label: 'The curve y = log base 2 of x crossing the line y = 3',
              }),
              prose(
                'Index form gives the same point exactly: $x = 2^{3} = 8$. The curve always rises, so it is below the line left of 8 and above it to the right.',
              ),
              prose('It only exists for $x > 0$, so $\\log_{2} x < 3$ means $0 < x < 8$.'),
            ),
            ask('log-solve-graph'),
            ask('log-inequality-tiles'),
            ask('log-solve-graph+choice'),
            teach(
              prose('Where two curves meet their heights are equal, so set the two right-hand sides equal.'),
              maths('\\log_{2} x = \\log_{2}\\left(x - 3\\right) + 1'),
              maths('\\log_{2}\\left(\\frac{x}{x - 3}\\right) = 1'),
              maths('\\frac{x}{x - 3} = 2 \\implies x = 6'),
              prose(
                'Curves with different bases are simpler: they meet only at $(1, 0)$, and right of it the smaller base is higher.',
              ),
            ),
            ask('log-meet-slider'),
            ask('log-compare-bases'),
            ask('log-inequality-tiles'),
            teach(
              graph({
                xMin: -0.5,
                xMax: 12,
                yMin: -3,
                yMax: 4,
                curves: [{ f: logf(2), accent: true }, { f: logf(5) }],
                label: 'The curves y = log base 2 of x and y = log base 5 of x',
              }),
              prose(
                'Right of 1, base 2 needs a bigger power than base 5 to reach the same $x$, so $y = \\log_{2} x$ is higher.',
              ),
              prose(
                'Left of 1 both are negative, and the bigger size puts $y = \\log_{2} x$ further below. The order flips at the one point they share.',
              ),
            ),
            ask('log-compare-bases'),
            ask('log-meet-slider'),
          ],
          skillCheck: [
            ask('log-solve-graph', 2),
            ask('log-compare-bases', 2),
            ask('log-inequality-tiles', 2),
          ],
        },
      ],
      levelCheck: [
        ask('log-graph-read', 2),
        ask('log-graph-slider', 2),
        ask('log-on-curve-flow', 2),
        ask('log-graph-match', 2),
        ask('log-inverse-point', 2),
        ask('log-undo-evaluate', 2),
        ask('log-mirror-slider', 2),
        ask('log-transform-match', 2),
        ask('log-transform-tiles', 2),
        ask('log-transform-flow', 2),
        ask('log-solve-graph+choice', 2),
        ask('log-meet-slider', 2),
        ask('log-compare-bases', 2),
        ask('log-inequality-tiles', 2),
      ],
    },
  ],
};
