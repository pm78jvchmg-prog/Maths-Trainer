/**
 * Exponential Models.
 *
 * The continuous model y = Ae^(kt) as a thing in its own right. Level 1 reads
 * it: what A and the sign of k say, what it comes to at a whole time once
 * e^(ln b) = b does the work, how b^t is rewritten as e^(kt) with k = ln b, and
 * doubling time and half-life as (ln 2)/k. Level 2 uses it: A and k from two
 * points, models that settle at a level, the time to reach a value, the rate
 * as ky, and telling linear, exponential and bounded apart.
 *
 * Whole-step growth without e, solving N = N0 r^t by logarithms, linearising
 * and differentiating e^x all belong to other courses and are used here, not
 * taught again. Each level closes with a level check: questions only, no
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

export const exponentialModels: Course = {
  id: 'exponential-models',
  title: 'Exponential Models',
  blurb: 'The continuous model Ae^kt: reading it, doubling and half-life, fitting it, and models with a limit.',
  levels: [
    {
      id: 'em-l1',
      title: 'The Continuous Model',
      lessons: [
        {
          id: 'em-l1-reading',
          title: 'Reading the Model',
          slides: [
            teach(
              prose(
                'Many things that grow or decay smoothly are modelled by one formula, with $t$ for the time:',
              ),
              maths('y = Ae^{kt}'),
              prose(
                'At $t = 0$ the power is $0$ and $e^{0} = 1$, so $y = A$: the number in front is the start. $N = 250e^{0.04t}$ starts at 250.',
              ),
            ),
            ask('expm-read-flow'),
            ask('expm-start'),
            ask('expm-build-tiles'),
            teach(
              prose(
                'The sign of $k$ says which way it goes. A positive $k$ grows; a negative $k$ decays towards 0, but never reaches or passes it.',
              ),
              prose(
                'The size of $k$ is the continuous rate as a decimal. $k = 0.04$ is growth at 4% per unit of time, and $k = -0.15$ is decay at 15%.',
              ),
              working('250e^{0.04t} &\\to 250, \\ +4\\%', '80e^{-0.15t} &\\to 80, \\ -15\\%'),
            ),
            ask('expm-describe'),
            ask('expm-build-tiles', 2),
            ask('expm-read-flow', 2),
            teach(
              prose(
                'Doubling, halving and the rest are measured against the start. $N = 250e^{0.04t}$ has doubled when $N = 500$ and tripled when $N = 750$.',
              ),
              prose('A decay like $M = 80e^{-0.15t}$ has halved when $M = 40$ and is down to a quarter at $M = 20$.'),
            ),
            ask('expm-start', 2),
            ask('expm-describe', 2),
          ],
          skillCheck: [ask('expm-start', 2), ask('expm-build-tiles', 2), ask('expm-describe', 2)],
        },
        {
          id: 'em-l1-evaluate',
          title: 'Evaluating the Model',
          slides: [
            teach(
              prose(
                '$e$ and $\\ln$ undo each other, so $e^{\\ln b} = b$. A whole number in front of the $\\ln$ is a power:',
              ),
              working('e^{3\\ln 2} &= \\left(e^{\\ln 2}\\right)^{3}', '&= 2^{3} = 8'),
              prose('That is what makes a model with $\\ln$ in its power come out whole at a whole time.'),
            ),
            ask('expm-power-value'),
            ask('expm-power-value+choice', 2),
            teach(
              prose(
                'So $e^{t\\ln 2} = 2^{t}$, and a model $y = 5e^{t\\ln 2}$ is $5 \\times 2^{t}$: it doubles every unit of time.',
              ),
              working('t = 3: \\quad 5 \\times 2^{3} &= 5 \\times 8 = 40'),
              prose(
                'The power comes first, then the multiplication. A minus sign in the power divides instead: $e^{-t\\ln 2} = \\frac{1}{2^{t}}$.',
              ),
            ),
            ask('expm-evaluate'),
            ask('expm-evaluate+choice', 2),
            ask('expm-pass-slider'),
            teach(
              prose(
                'When $k$ is a log over a whole number, the model takes that long to multiply once. $e^{\\frac{\\ln 2}{4}t} = 2^{t/4}$ doubles every 4 units of time:',
              ),
              working('t = 12: \\quad 12 \\div 4 &= 3', '3 \\times 2^{3} &= 24'),
            ),
            ask('expm-at-time-tree'),
            ask('expm-at-time-tree', 2),
            ask('expm-pass-slider', 2),
          ],
          skillCheck: [ask('expm-evaluate', 2), ask('expm-at-time-tree', 2), ask('expm-power-value', 2)],
        },
        {
          id: 'em-l1-convert',
          title: 'From b^t to e^kt',
          slides: [
            teach(
              prose(
                'A model written as $A \\times b^{t}$ can always be written with $e$ instead. Since $b = e^{\\ln b}$,',
              ),
              working('b^{t} &= \\left(e^{\\ln b}\\right)^{t} = e^{t\\ln b}', '40 \\times 3^{t} &= 40e^{t\\ln 3}'),
              prose('So $k = \\ln b$. The start stays in front: only the part with $t$ changes shape.'),
            ),
            ask('expm-convert-tiles'),
            ask('expm-k-value'),
            ask('expm-multiplier-slider'),
            teach(
              prose(
                'Going back, $e^{k}$ is what one unit of time multiplies by. If $k$ is not a single log yet, make it one first:',
              ),
              working('2\\ln 3 &= \\ln 3^{2} = \\ln 9', '\\tfrac{1}{2}\\ln 25 &= \\ln 25^{1/2} = \\ln 5'),
              prose('So $e^{2t\\ln 3} = 9^{t}$. A minus sign turns it over: $e^{-t\\ln 4} = \\left(\\frac{1}{4}\\right)^{t}$, a decay.'),
            ),
            ask('expm-back'),
            ask('expm-multiplier-slider', 2),
            ask('expm-back', 2),
            teach(
              prose(
                'A model that multiplies by $b$ only every $h$ units of time is $b^{t/h}$, and its $k$ is divided by $h$:',
              ),
              working('2^{t/5} &= e^{\\frac{\\ln 2}{5}t}', '\\left(\\tfrac{1}{3}\\right)^{t} &= e^{-t\\ln 3}'),
            ),
            ask('expm-convert-tiles', 2),
            ask('expm-k-value+choice', 2),
          ],
          skillCheck: [ask('expm-convert-tiles', 2), ask('expm-k-value', 2), ask('expm-back', 2)],
        },
        {
          id: 'em-l1-doubling',
          title: 'Doubling Time and Half-Life',
          slides: [
            teach(
              prose(
                'The doubling time is how long a growing model takes to double. It doubles when $e^{kt} = 2$, so $kt = \\ln 2$:',
              ),
              maths('t = \\frac{\\ln 2}{k}'),
              prose('With $k = \\frac{\\ln 2}{5}$ that is $\\ln 2 \\div \\frac{\\ln 2}{5} = 5$. The same number sits under the $\\ln 2$ in $k$.'),
            ),
            ask('expm-doubling-slider'),
            ask('expm-doubling'),
            ask('expm-doubling-tiles'),
            teach(
              prose(
                'A decaying model has a half-life instead: $\\ln 2$ divided by the size of $k$. $e^{-\\frac{\\ln 2}{8}t}$ halves every 8 units of time.',
              ),
              prose(
                'Tripling works the same way with $\\ln 3$: a model that triples every 6 hours has $k = \\frac{\\ln 3}{6}$.',
              ),
            ),
            ask('expm-halflife-flow'),
            ask('expm-doubling-tiles', 2),
            ask('expm-doubling+choice'),
            teach(
              prose('Sometimes $k$ hides its $\\ln 2$. Write the log as a multiple of $\\ln 2$ first:'),
              working('k = \\frac{\\ln 8}{12} &= \\frac{3\\ln 2}{12}', '&= \\frac{\\ln 2}{4}'),
              prose('So the doubling time is 4. A quarter is two halvings, so falling to a quarter takes two half-lives.'),
            ),
            ask('expm-doubling-slider', 2),
            ask('expm-halflife-flow', 2),
          ],
          skillCheck: [ask('expm-doubling', 2), ask('expm-doubling-slider', 2), ask('expm-halflife-flow', 2)],
        },
      ],
      levelCheck: [
        ask('expm-read-flow', 2),
        ask('expm-start', 2),
        ask('expm-build-tiles', 2),
        ask('expm-describe', 2),
        ask('expm-power-value', 2),
        ask('expm-evaluate+choice', 2),
        ask('expm-at-time-tree', 2),
        ask('expm-pass-slider', 2),
        ask('expm-convert-tiles', 2),
        ask('expm-k-value', 2),
        ask('expm-back', 2),
        ask('expm-multiplier-slider', 2),
        ask('expm-doubling', 2),
        ask('expm-doubling-tiles', 2),
        ask('expm-halflife-flow', 2),
      ],
    },
    {
      id: 'em-l2',
      title: 'Fitting and Using Models',
      lessons: [
        {
          id: 'em-l2-fit',
          title: 'Fitting a Model to Two Points',
          slides: [
            teach(
              prose(
                'Two points pin a model $y = Ae^{kt}$ down. Divide one value by the other and $A$ cancels. With $y = 18$ at $t = 1$ and $y = 144$ at $t = 4$:',
              ),
              working('\\frac{144}{18} &= 8 = e^{3k}', 'e^{k} &= \\sqrt[3]{8} = 2'),
              prose('Three units of time multiplied by 8, so each one multiplies by 2, and $k = \\ln 2$.'),
            ),
            ask('expm-fit-tree'),
            ask('expm-fit-k'),
            ask('expm-fit-tiles'),
            teach(
              prose(
                'Then step back to the start. At $t = 1$ the value is $18$, and one step multiplied by 2 to get there, so $A = 18 \\div 2 = 9$ and $y = 9e^{t\\ln 2}$.',
              ),
              prose(
                'If the second value is smaller, the model decays: divide the first by the second, and $k$ is negative. Stepping back to the start then multiplies.',
              ),
            ),
            ask('expm-start-back'),
            ask('expm-fit-tree', 2),
            ask('expm-fit-k+choice', 2),
            teach(
              prose('Knowing $k$, one point is enough. For $y = Ae^{\\frac{\\ln 3}{2}t}$ with $y = 90$ at $t = 4$:'),
              working('e^{\\frac{\\ln 3}{2} \\times 4} &= e^{2\\ln 3} = 9', 'A &= 90 \\div 9 = 10'),
            ),
            ask('expm-fit-tiles', 2),
            ask('expm-start-back', 2),
          ],
          skillCheck: [ask('expm-fit-tree', 2), ask('expm-fit-k', 2), ask('expm-start-back', 2)],
        },
        {
          id: 'em-l2-bounded',
          title: 'Models with a Limit',
          slides: [
            teach(
              prose('Hot tea does not cool to 0°C: it cools towards the room. A model with a level $L$ adds a decaying term to it:'),
              maths('T = L + Be^{-kt}'),
              prose(
                'As $t$ grows, $e^{-kt}$ shrinks to 0, so $T$ settles at $L$. At $t = 0$ it is $L + B$. $T = 20 + 70e^{-0.1t}$ starts at 90°C and settles at 20°C.',
              ),
            ),
            ask('expm-limit-flow'),
            ask('expm-bounded-start'),
            ask('expm-cool-tiles'),
            teach(
              prose(
                'Something that rises towards a ceiling takes the term away instead. A drink from the fridge at 4°C in a room at 20°C is',
              ),
              maths('T = 20 - 16e^{-kt}'),
              prose('Either way, the number on its own is where it ends up, and the number by the $e$ is the gap it has to close.'),
            ),
            ask('expm-cool-tiles', 2),
            ask('expm-limit-flow', 2),
            ask('expm-bounded-start+choice', 2),
            teach(
              prose(
                'With $k = \\frac{\\ln 2}{5}$ the gap halves every 5 minutes. At $t = 15$ it has halved three times:',
              ),
              working('T &= 20 + 80e^{-\\frac{\\ln 2}{5} \\times 15}', '&= 20 + 80 \\div 2^{3} = 30'),
            ),
            ask('expm-cool-evaluate'),
            ask('expm-cool-evaluate+choice', 2),
          ],
          skillCheck: [ask('expm-bounded-start', 2), ask('expm-cool-tiles', 2), ask('expm-cool-evaluate', 2)],
        },
        {
          id: 'em-l2-reach',
          title: 'The Time to Reach a Value',
          slides: [
            teach(
              prose('To find when a model reaches a value, get the $e$ on its own, then take $\\ln$ of both sides:'),
              working(
                '5e^{\\frac{\\ln 2}{3}t} &= 40',
                'e^{\\frac{\\ln 2}{3}t} &= 8',
                '\\tfrac{\\ln 2}{3}t &= \\ln 8 = 3\\ln 2',
                't &= 9',
              ),
            ),
            ask('expm-reach-steps'),
            ask('expm-when'),
            ask('expm-reach-slider'),
            teach(
              prose(
                'In one line, the time is the log of how many times bigger (or smaller) the target is, divided by the size of $k$:',
              ),
              maths('t = \\ln 8 \\div \\frac{\\ln 2}{3} = 9'),
              prose('For a decay, compare the start with the target the other way up, so the log stays positive.'),
            ),
            ask('expm-reach-tiles'),
            ask('expm-reach-steps', 2),
            ask('expm-when+choice'),
            teach(
              prose(
                'A check: 8 is three doublings, and with a doubling time of 3 that is 9. For a model with a level, take the level off first: $20 + 80e^{-kt} = 30$ needs $80e^{-kt} = 10$.',
              ),
            ),
            ask('expm-reach-tiles', 2),
            ask('expm-reach-slider', 2),
          ],
          skillCheck: [ask('expm-reach-steps', 2), ask('expm-when', 2), ask('expm-reach-tiles', 2)],
        },
        {
          id: 'em-l2-rate',
          title: 'The Rate of Change',
          slides: [
            teach(
              prose('Differentiating $e^{kx}$ brings the $k$ down in front, so for $y = Ae^{kx}$'),
              maths('\\frac{dy}{dx} = kAe^{kx} = ky'),
              prose(
                'The rate is $k$ times the amount there is. That is what exponential means: the more there is, the faster it changes.',
              ),
            ),
            ask('expm-rate'),
            ask('expm-rate-tiles'),
            ask('expm-rate-match'),
            teach(
              prose(
                'So the rate at a moment uses the amount right then, not the start. For $N = 200e^{0.05t}$, when $N = 600$:',
              ),
              maths('\\frac{dN}{dt} = 0.05 \\times 600 = 30'),
              prose('A decaying model has a negative $k$, so its rate is negative.'),
            ),
            ask('expm-rate-at'),
            ask('expm-rate+choice'),
            ask('expm-rate-at+choice', 2),
            teach(
              prose('For a model with a level the constant differentiates to 0, and the rate is $k$ times the gap to the level:'),
              working('T &= 20 + 70e^{-0.1x}', '\\frac{dT}{dx} &= -7e^{-0.1x}', '&= -0.1(T - 20)'),
            ),
            ask('expm-rate-tiles', 2),
            ask('expm-rate-match', 2),
          ],
          skillCheck: [ask('expm-rate', 2), ask('expm-rate-at', 2), ask('expm-rate-tiles', 2)],
        },
        {
          id: 'em-l2-choose',
          title: 'Linear, Exponential or Bounded',
          slides: [
            teach(
              prose(
                'A table at equal steps of time says which model it follows. Equal gaps are linear, equal ratios are exponential, and gaps that shrink by the same factor are bounded:',
              ),
              working(
                '5,\\ 8,\\ 11,\\ 14 &: \\text{linear}',
                '5,\\ 10,\\ 20,\\ 40 &: \\text{exponential}',
                '100,\\ 60,\\ 40,\\ 30 &: \\text{bounded}',
              ),
              prose('The last one closes in on 20: its gaps to 20 are 80, 40, 20, 10.'),
            ),
            ask('expm-model-flow'),
            ask('expm-next-tree'),
            ask('expm-model-choice'),
            teach(
              prose(
                'A story says the same. The same amount added each time is linear. Multiplying by the same factor, or changing at a rate proportional to the amount, is exponential.',
              ),
              prose('Settling at a level, like a drink reaching room temperature or sales levelling off, is bounded.'),
            ),
            ask('expm-model-choice', 2),
            ask('expm-model-flow', 2),
            ask('expm-when', 2),
            teach(
              prose(
                'To carry a bounded table on, measure from the level, not from 0. Gaps of 40, 20, 10 above 20 make the next gap 5, so the next value is 25.',
              ),
            ),
            ask('expm-next-tree', 2),
            ask('expm-bounded-start+choice', 2),
          ],
          skillCheck: [ask('expm-model-flow', 2), ask('expm-next-tree', 2), ask('expm-model-choice', 2)],
        },
      ],
      levelCheck: [
        ask('expm-fit-tree', 2),
        ask('expm-fit-k', 2),
        ask('expm-limit-flow', 2),
        ask('expm-start-back', 2),
        ask('expm-cool-tiles', 2),
        ask('expm-cool-evaluate+choice', 2),
        ask('expm-reach-steps', 2),
        ask('expm-when', 2),
        ask('expm-reach-slider', 2),
        ask('expm-rate', 2),
        ask('expm-rate-match', 2),
        ask('expm-rate-at', 2),
        ask('expm-model-flow', 2),
        ask('expm-fit-tiles', 2),
        ask('expm-next-tree', 2),
      ],
    },
  ],
};
