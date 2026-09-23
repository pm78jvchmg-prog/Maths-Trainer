/**
 * Exponential Models.
 *
 * The continuous model y = Ae^(kt) as a thing in its own right. Level 1 reads
 * it: what A and the sign of k say, what it comes to at a whole time once
 * e^(ln b) = b does the work, how b^t is rewritten as e^(kt) with k = ln b, and
 * doubling time and half-life as (ln 2)/k. Level 2 uses it: A and k from two
 * points, models that settle at a level, the time to reach a value, the rate
 * as ky, and telling linear, exponential and bounded apart. Level 3 reads
 * the rate: k as a percentage of the amount, the average rate over a stretch
 * against the rate at a moment, the rate run backwards to k, the amount or the
 * time, and two models growing at the same rate. Level 4 compares models:
 * which is ahead at a whole time, when one overtakes another, a rising model
 * meeting a falling one, sums of exponentials and the term that wins, and the
 * gap between two models as a quadratic in u.
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
  category: 'advanced-algebra',
  position: 30,
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
    {
      id: 'em-l3',
      title: 'Rates in Models',
      lessons: [
        {
          id: 'em-l3-percent',
          title: 'The Rate as a Percentage',
          slides: [
            teach(
              prose(
                'The rate of $y = Ae^{kt}$ is $\\frac{dy}{dt} = ky$: a fixed fraction of whatever there is. Read as a percentage, $k = 0.05$ says the rate is 5% of the amount per unit of time.',
              ),
              maths('\\frac{dN}{dt} = 0.05N'),
              prose('So $0.05$ is 5%, $0.035$ is 3.5%, and a negative $k$ falls at that percentage instead of growing.'),
            ),
            ask('expm-percent-k'),
            ask('expm-percent-flow'),
            ask('expm-percent-tiles'),
            teach(
              prose('A sentence gives the model straight away. "Grows at 3% of its size per hour" is'),
              working('\\frac{dN}{dt} &= 0.03N', 'N &= Ae^{0.03t}'),
              prose(
                'It is 3% of its size **now**, not of the start. That is what makes it exponential rather than a straight line.',
              ),
            ),
            ask('expm-rate-words'),
            ask('expm-percent-tiles', 2),
            ask('expm-percent-flow', 2),
            teach(
              prose(
                'Read the other way, a model says its rate. $D = 300e^{-0.035t}$ falls at 3.5% of its current size per hour, so when $D = 200$ it is falling at',
              ),
              maths('0.035 \\times 200 = 7 \\text{ mg per hour}'),
            ),
            ask('expm-percent-k+choice', 2),
            ask('expm-rate-words', 2),
          ],
          skillCheck: [ask('expm-percent-k', 2), ask('expm-percent-tiles', 2), ask('expm-rate-words', 2)],
        },
        {
          id: 'em-l3-average',
          title: 'Average Rate over an Interval',
          slides: [
            teach(
              prose(
                'The **average rate** over a stretch is the change divided by the time it took. For $N = 5e^{\\frac{\\ln 2}{3}t}$ from $t = 3$ to $t = 9$:',
              ),
              working('N(3) &= 5 \\times 2 = 10', 'N(9) &= 5 \\times 2^{3} = 40', '\\frac{40 - 10}{9 - 3} &= 5'),
              prose('That is 5 per hour on average, though it grew more slowly at first and faster later.'),
            ),
            ask('expm-avg-tree'),
            ask('expm-avg-rate'),
            ask('expm-avg-reduce'),
            teach(
              prose('On a graph the average rate is the gradient of the **chord** joining the two points.'),
              prose(
                'A growing model gets steeper, so of two stretches the same length the later one has the bigger average rate. A decaying model flattens out, so its early stretches change fastest.',
              ),
            ),
            ask('expm-avg-compare'),
            ask('expm-avg-slider'),
            ask('expm-avg-reduce', 2),
            teach(
              prose('A falling model has a negative average rate. $M = 96e^{-t\\ln 2}$ goes from 96 to 12 between $t = 0$ and $t = 3$:'),
              maths('\\frac{12 - 96}{3 - 0} = -28'),
              prose('It lost 28 grams a day on average.'),
            ),
            ask('expm-avg-tree', 2),
            ask('expm-avg-slider', 2),
          ],
          skillCheck: [ask('expm-avg-rate', 2), ask('expm-avg-tree', 2), ask('expm-avg-slider', 2)],
        },
        {
          id: 'em-l3-instant',
          title: 'Average against Instantaneous',
          slides: [
            teach(
              prose(
                'The rate at one moment is $ky$, with $y$ at that moment: the gradient of the **tangent** there. For $N = 40e^{\\frac{\\ln 2}{5}t}$ at $t = 15$, $N = 40 \\times 2^{3} = 320$, so',
              ),
              maths('\\frac{dN}{dt} = \\frac{\\ln 2}{5} \\times 320 = 64\\ln 2'),
              prose('Keep the $\\ln 2$. It is exact, and typing it with the $\\ln$ key keeps it that way.'),
            ),
            ask('expm-instant'),
            ask('expm-instant-tiles'),
            ask('expm-which-rate'),
            teach(
              prose(
                'The chord averages a whole stretch; the tangent is one moment. A growing curve steepens, so at the end of a stretch it is changing faster than its average, and at the start slower.',
              ),
              prose('A decaying curve flattens, so it is the other way round: faster than its average at the start, slower at the end.'),
            ),
            ask('expm-rate-compare-flow'),
            ask('expm-instant+choice', 2),
            ask('expm-instant-tiles', 2),
            teach(
              prose('The numbers agree. For $N = 40e^{\\frac{\\ln 2}{5}t}$ from $t = 0$ to $t = 15$:'),
              working(
                '\\text{average} &= \\frac{320 - 40}{15} \\approx 18.7',
                '\\text{at } t = 0 &: \\ 8\\ln 2 \\approx 5.5',
                '\\text{at } t = 15 &: \\ 64\\ln 2 \\approx 44.4',
              ),
            ),
            ask('expm-rate-compare-flow', 2),
            ask('expm-which-rate', 2),
          ],
          skillCheck: [ask('expm-instant', 2), ask('expm-instant-tiles', 2), ask('expm-rate-compare-flow', 2)],
        },
        {
          id: 'em-l3-back',
          title: 'From the Rate Back',
          slides: [
            teach(
              prose('$\\frac{dy}{dt} = ky$ runs backwards too. Growing at 12 per hour when $N = 400$ means'),
              maths('k = \\frac{12}{400} = 0.03'),
              prose(
                'And knowing $k$, the amount is the rate divided by $k$: growing at 30 per hour with $k = 0.05$ means $N = 30 \\div 0.05 = 600$.',
              ),
            ),
            ask('expm-k-from-rate'),
            ask('expm-amount-from-rate+choice'),
            ask('expm-k-from-rate', 2),
            teach(
              prose(
                'To find **when** the rate reaches a value, divide by $k$ to get the amount, then solve for $t$ as before. For $N = 40e^{\\frac{\\ln 2}{5}t}$ and a rate of $64\\ln 2$:',
              ),
              working('N &= 64\\ln 2 \\div \\frac{\\ln 2}{5} = 320', 'e^{\\frac{\\ln 2}{5}t} &= 8 = 2^{3}', 't &= 15'),
            ),
            ask('expm-rate-reach-tree'),
            ask('expm-rate-solve-steps'),
            ask('expm-amount-from-rate', 2),
            teach(
              prose(
                'A decaying model works the same way, with the rate negative. $D = 160e^{-\\frac{\\ln 2}{2}t}$ has rate $-5\\ln 2$ when $D = 10$, which is $\\frac{1}{16}$ of the start: four halvings, so $t = 8$.',
              ),
            ),
            ask('expm-rate-solve-steps', 2),
            ask('expm-rate-reach-tree', 2),
          ],
          skillCheck: [ask('expm-k-from-rate', 2), ask('expm-rate-solve-steps', 2), ask('expm-rate-reach-tree', 2)],
        },
        {
          id: 'em-l3-two',
          title: 'Two Models at the Same Rate',
          slides: [
            teach(
              prose(
                'Two models, two rates. At $t = 0$ each rate is $k$ times its start, so a bigger start can lead at first. For $P = 800e^{0.02t}$ and $Q = 200e^{0.06t}$:',
              ),
              working('P\\text{: } 0.02 \\times 800 &= 16', 'Q\\text{: } 0.06 \\times 200 &= 12'),
              prose('$P$ is growing faster now. But in the long run the bigger $k$ always wins, whatever the starts, so $Q$ ends up faster.'),
            ),
            ask('expm-two-faster'),
            ask('expm-two-flow'),
            ask('expm-two-faster', 2),
            teach(
              prose(
                'They grow at the same rate when $k_1A_1e^{k_1t} = k_2A_2e^{k_2t}$. With $u = 2^{t/5}$, $P = 10e^{\\frac{2\\ln 2}{5}t} = 10u^{2}$ and $Q = 80e^{\\frac{\\ln 2}{5}t} = 80u$:',
              ),
              working('2 \\times 10u^{2} &= 1 \\times 80u', 'u &= 4 = 2^{2}', 't &= 10'),
              prose('The $\\frac{\\ln 2}{5}$ in each $k$ cancels, which is what leaves whole numbers.'),
            ),
            ask('expm-two-equal'),
            ask('expm-two-slider'),
            ask('expm-two-flow', 2),
            teach(
              prose(
                'Growing at the same rate is not being the same size. At $t = 10$, $P = 160$ and $Q = 320$: $Q$ is still bigger, but from here $P$ gains faster, and it draws level at $t = 15$.',
              ),
            ),
            ask('expm-two-equal+choice', 2),
            ask('expm-two-slider', 2),
          ],
          skillCheck: [ask('expm-two-faster', 2), ask('expm-two-equal', 2), ask('expm-two-slider', 2)],
        },
      ],
      levelCheck: [
        ask('expm-percent-tiles', 2),
        ask('expm-percent-k', 2),
        ask('expm-rate-words', 2),
        ask('expm-avg-tree', 2),
        ask('expm-avg-rate+choice', 2),
        ask('expm-avg-slider', 2),
        ask('expm-avg-compare', 2),
        ask('expm-instant', 2),
        ask('expm-instant-tiles', 2),
        ask('expm-rate-compare-flow', 2),
        ask('expm-k-from-rate', 2),
        ask('expm-rate-solve-steps', 2),
        ask('expm-amount-from-rate', 2),
        ask('expm-two-equal', 2),
        ask('expm-two-flow', 2),
      ],
    },
    {
      id: 'em-l4',
      title: 'Comparing Models',
      lessons: [
        {
          id: 'em-l4-ahead',
          title: 'Which Model Is Ahead',
          slides: [
            teach(
              prose(
                'To compare two models, write both in the same power. For $P = 40e^{\\frac{\\ln 2}{5}t}$ and $Q = 5e^{\\frac{2\\ln 2}{5}t}$, let $u = 2^{t/5}$: then $P = 40u$ and $Q = 5u^{2}$. At $t = 10$, $u = 2^{2} = 4$:',
              ),
              working('P(10) &= 40 \\times 4 = 160', 'Q(10) &= 5 \\times 4^{2} = 80'),
              prose('So $P$ is ahead by 80 at $t = 10$.'),
            ),
            ask('expm-lead-tree'),
            ask('expm-lead-which'),
            ask('expm-lead-gap'),
            teach(
              prose(
                'The start is not the whole story. At $t = 20$, $u = 2^{4} = 16$, so $P = 640$ and $Q = 5 \\times 256 = 1280$: $Q$ has overtaken.',
              ),
              prose('The model with the bigger $k$ always ends up ahead in the long run, however far behind it starts.'),
            ),
            ask('expm-lead-flow'),
            ask('expm-lead-which', 2),
            ask('expm-lead-tree', 2),
            teach(
              prose(
                'A decaying model is a negative power of $u$. $R = 320e^{-\\frac{\\ln 2}{5}t} = \\frac{320}{u}$, so at $t = 10$ it is $320 \\div 4 = 80$, level with $Q$.',
              ),
              prose('Counting $k$ with its sign, a falling model has the smaller $k$, so a rising one always ends up ahead of it.'),
            ),
            ask('expm-lead-flow', 2),
            ask('expm-lead-gap+choice', 2),
          ],
          skillCheck: [ask('expm-lead-gap', 2), ask('expm-lead-which', 2), ask('expm-lead-tree', 2)],
        },
        {
          id: 'em-l4-overtake',
          title: 'When One Overtakes Another',
          slides: [
            teach(
              prose('When does $Q = 5u^{2}$ catch $P = 40u$? Set them equal and divide by $5u$:'),
              working('5u^{2} &= 40u', 'u &= 8 = 2^{3}', '2^{t/5} &= 2^{3}', 't &= 15'),
              prose('Before $t = 15$, $P$ is bigger; after it, $Q$ is.'),
            ),
            ask('expm-overtake-tiles'),
            ask('expm-overtake-steps'),
            ask('expm-overtake-time'),
            teach(
              prose(
                'On a graph that moment is where the curves cross. The one with the bigger $k$ starts lower and ends higher, so they cross exactly once.',
              ),
              prose('Check a crossing by putting it back: at $t = 15$, $u = 8$, so $P = 320$ and $Q = 5 \\times 64 = 320$.'),
            ),
            ask('expm-overtake-slider'),
            ask('expm-overtake-steps', 2),
            ask('expm-overtake-tiles', 2),
            teach(
              prose(
                'When the powers of $u$ differ by 2, a square root is left at the end. For $A = 3e^{\\frac{3\\ln 2}{2}t} = 3u^{3}$ and $B = 48e^{\\frac{\\ln 2}{2}t} = 48u$, with $u = 2^{t/2}$:',
              ),
              working('3u^{3} &= 48u', 'u^{2} &= 16', 'u &= 4 = 2^{2}', 't &= 4'),
              prose('$u$ is a power of 2, so it is never negative: $u = -4$ is no use.'),
            ),
            ask('expm-overtake-time', 2),
            ask('expm-overtake-slider', 2),
          ],
          skillCheck: [ask('expm-overtake-steps', 2), ask('expm-overtake-time', 2), ask('expm-overtake-slider', 2)],
        },
        {
          id: 'em-l4-meet',
          title: 'Growth Meets Decay',
          slides: [
            teach(
              prose(
                'A rising and a falling model meet once. For $N = 5e^{\\frac{\\ln 2}{3}t}$ and $D = 320e^{-\\frac{\\ln 2}{3}t}$, set them equal and multiply both sides by $e^{\\frac{\\ln 2}{3}t}$, so the powers add:',
              ),
              working('5e^{\\frac{2\\ln 2}{3}t} &= 320', 'e^{\\frac{2\\ln 2}{3}t} &= 64 = 2^{6}', '\\frac{2t}{3} &= 6', 't &= 9'),
              prose('That is $e^{2kt} = \\frac{B}{A}$, the ratio of the starts. Both are 40 at $t = 9$.'),
            ),
            ask('expm-meet-tree'),
            ask('expm-meet-time'),
            ask('expm-meet-slider'),
            teach(
              prose(
                'In a picture, the curve that rises has the positive $k$ and the one that falls has the negative $k$. Where they cross is where they meet.',
              ),
              prose(
                'The $2$ in $e^{2kt}$ matters: $64$ is $u^{2}$ with $u = 2^{t/3}$, so $u = 8$ and $t = 9$, not the $t = 18$ that $u = 64$ would give.',
              ),
            ),
            ask('expm-meet-which'),
            ask('expm-meet-tree', 2),
            ask('expm-meet-slider', 2),
            teach(
              prose(
                'With different rates the powers still add. With $u = 3^{t}$, $S = 2e^{2t\\ln 3} = 2u^{2}$ and $R = 54e^{-t\\ln 3} = \\frac{54}{u}$:',
              ),
              working('2u^{3} &= 54', 'u^{3} &= 27', 'u &= 3', 't &= 1'),
              prose('Both are 18 then.'),
            ),
            ask('expm-meet-time+choice', 2),
            ask('expm-meet-which', 2),
          ],
          skillCheck: [ask('expm-meet-time', 2), ask('expm-meet-which', 2), ask('expm-meet-slider', 2)],
        },
        {
          id: 'em-l4-sum',
          title: 'Sums of Exponentials',
          slides: [
            teach(
              prose(
                'A sum of two exponentials starts at the sum of the starts, since each $e^{0} = 1$. $N = 60e^{\\frac{\\ln 2}{4}t} + 96e^{-\\frac{\\ln 2}{4}t}$ starts at $60 + 96 = 156$.',
              ),
              prose(
                'As $t$ grows the falling term shrinks towards 0 and the rising one takes over: for large $t$, $N \\approx 60e^{\\frac{\\ln 2}{4}t}$.',
              ),
            ),
            ask('expm-sum-tiles'),
            ask('expm-sum-flow'),
            ask('expm-sum-at'),
            teach(
              prose('To evaluate it, write both terms in $u = 2^{t/4}$: $N = 60u + \\frac{96}{u}$. At $t = 8$, $u = 4$:'),
              working('N(8) &= 60 \\times 4 + 96 \\div 4', '&= 240 + 24 = 264'),
            ),
            ask('expm-sum-tree'),
            ask('expm-sum-tiles', 2),
            ask('expm-sum-at+choice', 2),
            teach(
              prose(
                'When both terms grow, the bigger $k$ wins. When both decay, both head to 0, but the one with $k$ nearer 0 lasts longer: $5e^{-0.1t} + 20e^{-0.3t}$ ends up close to $5e^{-0.1t}$, though that term starts smaller.',
              ),
            ),
            ask('expm-sum-flow', 2),
            ask('expm-sum-tree', 2),
          ],
          skillCheck: [ask('expm-sum-tiles', 2), ask('expm-sum-at', 2), ask('expm-sum-flow', 2)],
        },
        {
          id: 'em-l4-gap',
          title: 'Differences and the Gap',
          slides: [
            teach(
              prose(
                'The gap between a model and a level is a difference: $P = 5e^{t\\ln 2}$ is 35 above $L = 5$ when $5 \\times 2^{t} = 40$, at $t = 3$.',
              ),
              prose(
                'Two models take more. With $u = 2^{t}$, $P = 3e^{2t\\ln 2} = 3u^{2}$ and $Q = 12e^{t\\ln 2} = 12u$, so $P - Q = 3u^{2} - 12u$: a quadratic in $u$.',
              ),
            ),
            ask('expm-diff-tree'),
            ask('expm-gap-flow'),
            ask('expm-gap-slider'),
            teach(
              prose('So $P - Q = 96$ is a quadratic in disguise, as in Quadratics level 7:'),
              working('3u^{2} - 12u - 96 &= 0', '3(u - 8)(u + 4) &= 0'),
              prose('$u = 2^{t}$ is never negative, so $u = -4$ is no use: $u = 8$ and $t = 3$.'),
            ),
            ask('expm-gap-steps'),
            ask('expm-diff-tree', 2),
            ask('expm-gap-slider', 2),
            teach(
              prose(
                'The gap can start negative. At $t = 0$, $u = 1$ and $P - Q = 3 - 12 = -9$, so $Q$ leads. They are level when $3u^{2} = 12u$, at $u = 4$, which is $t = 2$; after that the $u^{2}$ term runs away.',
              ),
            ),
            ask('expm-gap-steps', 2),
            ask('expm-gap-flow', 2),
          ],
          skillCheck: [ask('expm-gap-steps', 2), ask('expm-diff-tree', 2), ask('expm-gap-slider', 2)],
        },
      ],
      levelCheck: [
        ask('expm-lead-tree', 2),
        ask('expm-overtake-time', 2),
        ask('expm-meet-slider', 2),
        ask('expm-sum-tiles', 2),
        ask('expm-gap-steps', 2),
        ask('expm-lead-which', 2),
        ask('expm-overtake-tiles', 2),
        ask('expm-meet-tree', 2),
        ask('expm-sum-at', 2),
        ask('expm-gap-slider', 2),
        ask('expm-lead-gap', 2),
        ask('expm-overtake-steps', 2),
        ask('expm-meet-which', 2),
        ask('expm-sum-flow', 2),
        ask('expm-diff-tree', 2),
      ],
    },
  ],
};
