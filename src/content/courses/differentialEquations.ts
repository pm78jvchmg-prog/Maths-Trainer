/**
 * Differential Equations.
 *
 * An equation for a rate, and the function that has that rate. Level 1 forms
 * a first-order equation from words and solves it by separating the
 * variables: one constant in the general solution, a condition to fix it, and
 * growth and decay as `dy/dt = ky`. Level 2 models with them: Newton's
 * cooling, growth towards a limit, mixing tanks, what happens in the long
 * run, and checking a solution by putting it back in. Level 3 takes the
 * equations that do not separate, `dy/dx + Py = Q`, and solves them with an
 * integrating factor: the product rule read backwards, finding the factor,
 * a constant P, P = n/x, and particular solutions. Level 4 is second order:
 * `y'' + by' + cy = 0` through its auxiliary equation, with two real roots, a
 * repeated root and complex roots, then y(0) and y'(0) to fix both constants.
 * Level 5 puts a function on the right, `y'' + by' + cy = f(x)`: the
 * complementary function plus a particular integral, found by a trial
 * function for a polynomial, exponential or trigonometric right side, then
 * resonance, where the trial is multiplied by x, and initial conditions on
 * the whole solution. Level 6 reads the same equation as motion in t:
 * simple harmonic motion `ẍ = -ω²x`, its amplitude, period and greatest
 * speed, the phase form R cos(ωt - α), then damping `ẍ + kẋ + ω²x = 0` as
 * over-, critical and under-damping, and damped motion from its start.
 *
 * Integration and the exponential model are used here, not taught again:
 * `dy/dx = ky` read off a model belongs to Exponential Models' rate lesson,
 * and a model settling at a level to its "Models with a Limit". This course
 * starts from the equation and finds the model. Each level closes with a
 * level check: questions only, no teaching slides, one attempt each.
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

/**
 * A question with a worked example riding on it. A question may only ask what
 * the lesson has already worked through with numbers, and where the example
 * belongs just before one question, it goes on that question rather than on a
 * teach slide of its own: a lesson is capped at eleven slides.
 */
const asking = (generatorId: string, difficulty: number, ...leadIn: Block[]): SlideRef => ({
  type: 'generated',
  generatorId,
  difficulty,
  leadIn,
});

/** Separating with a factor of t, worked: needed wherever a general solution may carry one. */
const tFactorLead: Block[] = [
  prose('A factor of $t$ separates the same way. For $\\frac{dy}{dt} = -12t^{2}y$:'),
  working('\\int \\frac{1}{y}\\,dy &= \\int -12t^{2}\\,dt', '\\ln|y| &= -4t^{3} + C', 'y &= Ae^{-4t^{3}}'),
];

const figure = (options: Parameters<typeof plotSvg>[0]): Block => ({ kind: 'diagram', svg: plotSvg(options) });

export const differentialEquations: Course = {
  id: 'differential-equations',
  category: 'advanced-maths',
  // After Integration (30), Vectors (40) and Matrices (50) — and Exponential Models, whose model it solves for.
  position: 70,
  title: 'Differential Equations',
  // Its first two levels are shown in Differential Equations Basics; see placement.ts.
  blurb: 'The integrating factor, second-order equations with and without a right side, and simple harmonic and damped motion.',
  levels: [
    {
      id: 'de-l1',
      title: 'First-Order by Separation',
      lessons: [
        {
          id: 'de-l1-forming',
          title: 'Forming a Differential Equation',
          slides: [
            teach(
              prose(
                'A **differential equation** says how fast something changes. The rate of change of $N$ over time is $\\frac{dN}{dt}$.',
              ),
              prose('"Proportional to" means a constant times. A population growing at a rate proportional to its size is'),
              display('\\frac{dN}{dt} = kN'),
              prose('The equation gives the rate directly: when $N = 200$ and $k = 0.1$, $N$ is rising by $20$ an hour.'),
            ),
            asking(
              'de-form-tiles',
              1,
              prose(
                'Take $k$ to be positive and put the direction in the sign. A mass $M$ **decreasing** at a rate proportional to the time $t$ that has passed is $\\frac{dM}{dt} = -kt$.',
              ),
              prose(
                'The other shapes work the same way: proportional to the square of $M$ is $kM^{2}$, to its square root $k\\sqrt{M}$, and inversely proportional to $M$ is $\\frac{k}{M}$.',
              ),
            ),
            ask('de-form-rate'),
            ask('de-form-flow'),
            teach(
              prose('Something **decreasing** at a rate proportional to $\\sqrt{V}$, with $k$ positive, is'),
              display('\\frac{dV}{dt} = -k\\sqrt{V}'),
              prose(
                'Read the other way: if $V > 0$ and $\\frac{dV}{dt} = k\\sqrt{V}$ is decreasing, then $k$ itself must be negative.',
              ),
              prose(
                'Inversely proportional to the square of $V$ is $\\frac{k}{V^{2}}$, and proportional to the product of $V$ and $t$ is $kVt$.',
              ),
            ),
            ask('de-form-sign'),
            ask('de-form-tiles', 2),
            ask('de-form-rate+choice', 2),
            teach(
              prose(
                'When the rate depends on a gap to a level, the sign of the bracket matters too. Take $\\frac{dy}{dt} = k(y - 20)$, with $y$ at $15$ and rising towards $20$:',
              ),
              working('y - 20 &= 15 - 20 = -5', '\\frac{dy}{dt} &= k \\times (-5)'),
              prose('$y$ is rising, so $\\frac{dy}{dt} > 0$. $k$ times a negative number is positive only when $k < 0$.'),
            ),
            ask('de-form-flow', 2),
            ask('de-form-sign', 2),
          ],
          skillCheck: [ask('de-form-tiles', 2), ask('de-form-sign', 2), ask('de-form-rate', 2)],
        },
        {
          id: 'de-l1-separate',
          title: 'Separating the Variables',
          slides: [
            teach(
              prose(
                'When the right-hand side is a function of $x$ **times** a function of $y$, the variables can be separated: every $y$ goes with $dy$, every $x$ with $dx$.',
              ),
              working('\\frac{dy}{dx} &= 6x^{2}y', '\\frac{1}{y}\\,dy &= 6x^{2}\\,dx'),
              prose('Divide by the $y$ factor, then multiply by $dx$.'),
            ),
            ask('de-sep-tiles'),
            ask('de-sep-which'),
            ask('de-sep-integrate'),
            teach(
              prose('Then integrate both sides. One constant is enough: a constant on each side would combine into one.'),
              working('\\int \\frac{1}{y}\\,dy &= \\int 6x^{2}\\,dx', '\\ln|y| &= 2x^{3} + C'),
              prose(
                'Then tidy up: here, take $e$ to the power of each side to get $y$ on its own. When a power of $y$ comes out, clear the fraction instead. For $\\frac{dy}{dx} = \\frac{2x}{y}$:',
              ),
              working('y\\,dy &= 2x\\,dx', '\\tfrac{1}{2}y^{2} &= x^{2} + C', 'y^{2} &= 2x^{2} + C'),
              prose('Twice an unknown constant is still an unknown constant, so it stays $C$.'),
            ),
            ask('de-sep-steps'),
            ask('de-sep-tiles', 2),
            teach(
              prose('Some separable equations are in disguise. Factorise, or use the laws of indices:'),
              working('x^{2}y + 4x^{2} &= x^{2}(y + 4)','xy + 3y &= y(x + 3)', 'e^{x + y} &= e^{x}e^{y}'),
              prose('A sum like $x + y$ has no such split, so it cannot be separated.'),
            ),
            ask('de-sep-which', 2),
            asking(
              'de-sep-steps',
              2,
              prose(
                'With $e^{y}$ on the right, divide by it: $\\frac{1}{e^{y}} = e^{-y}$, which integrates to $-e^{-y}$. For $\\frac{dy}{dx} = e^{x}e^{y}$:',
              ),
              working('e^{-y}\\,dy &= e^{x}\\,dx', '-e^{-y} &= e^{x} + C', 'e^{-y} &= C - e^{x}', '-y &= \\ln(C - e^{x})', 'y &= -\\ln(C - e^{x})'),
              prose('Multiply by $-1$ and write $-C$ as a new $C$, then take $\\ln$ and multiply by $-1$ again.'),
            ),
            ask('de-sep-integrate', 2),
          ],
          skillCheck: [ask('de-sep-tiles', 2), ask('de-sep-steps', 2), ask('de-sep-integrate', 2)],
        },
        {
          id: 'de-l1-general',
          title: 'The General Solution',
          slides: [
            teach(
              prose(
                'Integrating both sides gives the **general solution**: a whole family of answers, one for each value of the constant.',
              ),
              working('\\frac{dy}{dx} &= \\frac{3x^{2}}{y}', 'y\\,dy &= 3x^{2}\\,dx', '\\tfrac{1}{2}y^{2} &= x^{3} + C', 'y^{2} &= 2x^{3} + C'),
              prose('Doubling an unknown constant gives another unknown constant, so it can stay $C$.'),
            ),
            ask('de-general-tree'),
            ask('de-sep-integrate'),
            ask('de-general-implicit+choice'),
            teach(
              prose('The most important one is $\\frac{dy}{dt} = ky$:'),
              working('\\int \\frac{1}{y}\\,dy &= \\int k\\,dt', '\\ln|y| &= kt + C', 'y &= e^{kt + C} = e^{C}e^{kt}'),
              prose('$e^{C}$ is just a constant, called $A$, which can be negative too and so covers the $\\pm$ from $|y|$:'),
              display('y = Ae^{kt}'),
            ),
            ask('de-general-tiles'),
            ask('de-general-implicit', 2),
            ask('de-general-tree', 2),
            teach(
              prose('Each value of $A$ gives one curve. These are all solutions of $\\frac{dy}{dt} = 0.5y$:'),
              figure({
                xMin: 0,
                xMax: 3,
                yMin: -0.5,
                yMax: 9,
                curves: [1, 2, 3, 4].map((A) => ({ f: (t: number) => A * Math.exp(0.5 * t) })),
                label: 'Four rising curves, y = A e to the 0.5t for A from 1 to 4',
              }),
              prose('A condition such as "$y = 3$ when $t = 0$" picks one of them out. That is the next lesson.'),
            ),
            asking('de-general-tiles', 2, ...tFactorLead),
            ask('de-sep-integrate', 2),
          ],
          skillCheck: [ask('de-general-tiles', 2), ask('de-general-implicit', 2), ask('de-general-tree', 2)],
        },
        {
          id: 'de-l1-particular',
          title: 'A Particular Solution',
          slides: [
            teach(
              prose('A condition fixes the constant. Put it into the general solution and solve for the constant:'),
              working('y &= Ae^{3t}, \\quad y(0) = 5', '5 &= Ae^{0} = A', 'y &= 5e^{3t}'),
              prose('The result is the **particular solution**.'),
            ),
            ask('de-particular-steps'),
            teach(
              prose('A rate written as a logarithm keeps the numbers whole. With $k = \\frac{\\ln 2}{3}$,'),
              display('e^{kt} = e^{\\frac{t}{3}\\ln 2} = 2^{\\frac{t}{3}}'),
              prose(
                'so $y$ doubles every $3$ units of time. If $y(6) = 20$, then going back two doublings, $A = 20 \\div 4 = 5$.',
              ),
              prose(
                'A minus sign halves instead: $k = -\\frac{\\ln 2}{3}$ gives $e^{kt} = 2^{-\\frac{t}{3}}$. From $y(0) = 40$, after $6$ units $y = 40 \\div 4 = 10$.',
              ),
            ),
            ask('de-particular-tree'),
            ask('de-particular-value'),
            ask('de-particular-slider'),
            teach(
              prose(
                'For a solution left as a power of $y$, find the constant before rearranging. For $\\frac{dy}{dx} = \\frac{x}{y}$ with $y(4) = 5$ and $y > 0$:',
              ),
              working('y\\,dy &= x\\,dx', '\\tfrac{1}{2}y^{2} &= \\tfrac{1}{2}x^{2} + C', 'y^{2} &= x^{2} + C', '25 &= 16 + C', 'C &= 9'),
              prose('Then $y = \\sqrt{x^{2} + 9}$, taking the positive root since $y > 0$.'),
            ),
            ask('de-particular-value+choice', 2),
            asking('de-general-tiles', 2, ...tFactorLead),
            ask('de-particular-slider', 2),
          ],
          skillCheck: [ask('de-particular-steps', 2), ask('de-particular-value', 2), ask('de-particular-tree', 2)],
        },
        {
          id: 'de-l1-growth',
          title: 'Growth and Decay',
          slides: [
            teach(
              prose(
                'In Exponential Models, differentiating $y = Ae^{kt}$ gave $\\frac{dy}{dt} = ky$. Here it runs the other way: start from the equation and solve it.',
              ),
              working('\\frac{dP}{dt} &= 0.04P, \\quad P(0) = 500', '\\ln P &= 0.04t + C', 'P &= Ae^{0.04t}', 'P &= 500e^{0.04t}'),
              prose('The start value is $A$, and the constant in the equation is the $k$ in the power.'),
              prose(
                'A rate "equal to 4% of its size" is $0.04$ times the size. For something falling, $k$ is negative: a mass falling at 6% of its size a year has $\\frac{dM}{dt} = -0.06M$, and from $M(0) = 300$, $M = 300e^{-0.06t}$.',
              ),
            ),
            ask('de-growth-steps'),
            ask('de-growth-solution'),
            ask('de-growth-match'),
            ask('de-form-tiles', 2),
            ask('de-growth-match', 2),
            ask('de-growth-solution', 2),
            teach(
              prose(
                'With $k > 0$ the solution grows without limit; with $k < 0$ it decays towards $0$ but never reaches it. The start value sets the scale and nothing else.',
              ),
              figure({
                xMin: 0,
                xMax: 5,
                yMin: -0.5,
                yMax: 9,
                curves: [{ f: (t: number) => 3 * Math.exp(0.35 * t) }, { f: (t: number) => 8 * Math.exp(-0.5 * t), dashed: true }],
                label: 'A rising exponential curve and a dashed falling one that levels towards the axis',
              }),
            ),
            ask('de-growth-steps', 2),
            asking('de-general-tiles', 2, ...tFactorLead),
          ],
          skillCheck: [ask('de-growth-steps', 2), ask('de-growth-solution', 2), ask('de-growth-match', 2)],
        },
      ],
      levelCheck: [
        ask('de-form-tiles', 2),
        ask('de-sep-steps', 2),
        ask('de-general-implicit', 2),
        ask('de-particular-value', 2),
        ask('de-growth-match', 2),
        ask('de-form-sign', 2),
        ask('de-sep-tiles', 2),
        ask('de-general-tiles', 2),
        ask('de-particular-slider', 2),
        ask('de-growth-solution', 2),
        ask('de-sep-which', 2),
        ask('de-general-tree', 2),
        ask('de-particular-steps', 2),
        ask('de-form-rate', 2),
        ask('de-growth-steps', 2),
      ],
    },

    {
      id: 'de-l2',
      title: 'Modelling with Differential Equations',
      lessons: [
        {
          id: 'de-l2-cooling',
          title: "Newton's Law of Cooling",
          slides: [
            teach(
              prose(
                "**Newton's law of cooling**: an object's temperature changes at a rate proportional to the difference between it and its surroundings. For tea at $T$°C in a room at $20$°C,",
              ),
              display('\\frac{dT}{dt} = -k(T - 20)'),
              prose('Above $20$ the bracket is positive and the minus sign makes it cool. Below $20$ the same equation makes it warm up.'),
            ),
            ask('de-cool-tiles'),
            teach(
              prose('Separating and integrating gives the room temperature plus a gap that decays. For tea that starts at $90$°C:'),
              working(
                '\\frac{1}{T - 20}\\,dT &= -k\\,dt',
                '\\ln|T - 20| &= -kt + C',
                'T - 20 &= Ae^{-kt}',
                '90 - 20 &= A, \\quad A = 70',
                'T &= 20 + 70e^{-kt}',
              ),
              prose('This is the model in Exponential Models\' "Models with a Limit", found from its equation.'),
              figure({
                xMin: 0,
                xMax: 30,
                yMin: -4,
                yMax: 95,
                curves: [{ f: (t: number) => 20 + 70 * Math.exp(-0.1 * t) }],
                horizontals: [20],
                label: 'A cooling curve falling from 90 towards a dashed line at 20',
              }),
            ),
            ask('de-cool-steps'),
            asking(
              'de-cool-value',
              1,
              prose(
                'With $k = \\frac{\\ln 2}{5}$, $e^{-kt} = 2^{-\\frac{t}{5}}$: the gap to the room halves every $5$ minutes. Tea at $100$°C in a $20$°C room starts $80$ above it. After $10$ minutes, two halvings, the gap is $20$, so $T = 40$°C.',
              ),
              prose('A gap below the room, from something warming up, halves in just the same way.'),
            ),
            ask('de-cool-value+choice', 2),
            ask('de-cool-tiles', 2),
            teach(
              prose(
                'Two readings find $k$. The gap to the room shrinks by the same factor over each equal stretch of time. From $100$°C to $40$°C in $5$ minutes in a $20$°C room, the gap goes from $80$ to $20$:',
              ),
              working('e^{-5k} &= \\tfrac{20}{80} = \\tfrac{1}{4}', 'k &= \\frac{\\ln 4}{5}'),
            ),
            ask('de-cool-tree', 2),
            ask('de-particular-value', 2),
          ],
          skillCheck: [ask('de-cool-tiles', 2), ask('de-cool-tree', 2), ask('de-cool-value', 2)],
        },
        {
          id: 'de-l2-limit',
          title: 'Growth towards a Limit',
          slides: [
            teach(
              prose(
                'Learning a list of $100$ words: the more there are left, the faster they go in. With $W$ learned, $100 - W$ are left, so',
              ),
              display('\\frac{dW}{dt} = k(100 - W)'),
              prose('The rate shrinks as $W$ nears $100$, so $W$ levels off there rather than passing it.'),
            ),
            ask('de-limit-tiles'),
            ask('de-limit-flow'),
            teach(
              prose('Separate, then integrate. $\\frac{1}{100 - W}$ integrates to $-\\ln|100 - W|$: the inside differentiates to $-1$.'),
              working('\\frac{1}{100 - W}\\,dW &= k\\,dt', '-\\ln|100 - W| &= kt + C'),
              prose('Multiply through by $-1$, letting the constant absorb the sign, then take $e$ to the power of each side. Starting from $W = 10$, $A = 100 - 10 = 90$:'),
              working('\\ln|100 - W| &= -kt + C', '100 - W &= Ae^{-kt}', 'W &= 100 - 90e^{-kt}'),
              figure({
                xMin: 0,
                xMax: 12,
                yMin: -4,
                yMax: 110,
                curves: [{ f: (t: number) => 100 - 90 * Math.exp(-0.3 * t) }],
                horizontals: [100],
                label: 'A curve rising from 10 and levelling off under a dashed line at 100',
              }),
            ),
            ask('de-limit-steps'),
            ask('de-limit-slider'),
            ask('de-limit-steps', 2),
            ask('de-limit-tiles', 2),
            teach(
              prose(
                'With $k = \\frac{\\ln 2}{h}$ the gap to the limit halves every $h$ units of time. Starting $80$ short of it, the gap is $40$, then $20$, then $10$.',
              ),
              prose(
                'Starting above the limit works the same way, with a negative gap. For $\\frac{dP}{dt} = \\frac{\\ln 2}{4}(60 - P)$ and $P(0) = 100$: $A = 60 - 100 = -40$, so $P = 60 + 40e^{-kt}$. After $8$, two halvings, $P = 60 + 10 = 70$.',
              ),
              prose('An equation written out, like $\\frac{dP}{dt} = 60 - 0.2P$, is the same shape: $0.2(300 - P)$, with limit $300$.'),
            ),
            ask('de-limit-flow', 2),
            ask('de-limit-slider', 2),
          ],
          skillCheck: [ask('de-limit-tiles', 2), ask('de-limit-steps', 2), ask('de-limit-slider', 2)],
        },
        {
          id: 'de-l2-mixing',
          title: 'Mixing Tanks',
          slides: [
            teach(
              prose(
                'Salt water flows into a tank and the mixture flows out. The amount of salt $S$ changes at the rate it comes in minus the rate it goes out:',
              ),
              display('\\frac{dS}{dt} = \\text{rate in} - \\text{rate out}'),
              prose('In: $4$ litres a minute at $3$ g a litre is $12$ g a minute.'),
              prose(
                'Out: the tank is well mixed, so each litre leaving carries the tank\'s own concentration, $\\frac{S}{V}$ g. From a $200$ litre tank at $4$ litres a minute,',
              ),
              display('\\text{rate out} = 4 \\times \\frac{S}{200} = \\frac{S}{50}'),
              prose('so $\\frac{dS}{dt} = 12 - \\frac{S}{50}$.'),
            ),
            ask('de-mix-tiles'),
            ask('de-mix-tree'),
            ask('de-mix-when'),
            teach(
              prose('In the long run the salt stops changing, so the rates balance:'),
              working('12 - \\tfrac{S}{50} &= 0', 'S &= 600'),
              prose('That is $3$ g a litre in all $200$ litres: the tank ends up as salty as what flows in, whatever it started with.'),
            ),
            ask('de-mix-limit'),
            ask('de-mix-tiles', 2),
            ask('de-mix-tree', 2),
            teach(
              prose(
                'Fresh water flowing in as well brings no salt, but it does add to the flow out. A $100$ litre tank takes $2$ litres a minute at $6$ g a litre and $3$ litres a minute of fresh water, and $5$ litres a minute flow out:',
              ),
              working('\\text{rate in} &= 2 \\times 6 = 12', '\\text{rate out} &= 5 \\times \\tfrac{S}{100} = \\tfrac{S}{20}', '12 - \\tfrac{S}{20} &= 0', 'S &= 240'),
              prose('That is $2.4$ g a litre: the fresh water dilutes it below the $6$ g a litre flowing in.'),
            ),
            ask('de-mix-limit', 2),
            ask('de-mix-when+choice', 2),
          ],
          skillCheck: [ask('de-mix-tiles', 2), ask('de-mix-tree', 2), ask('de-mix-limit', 2)],
        },
        {
          id: 'de-l2-long',
          title: 'Long-Term Behaviour',
          slides: [
            teach(
              prose(
                'Where $\\frac{dy}{dt} = 0$, nothing changes: that value of $y$ is an **equilibrium**. For $\\frac{dy}{dt} = 0.5(40 - y)$ it is $y = 40$.',
              ),
              prose(
                'It is the level of Exponential Models\' "Models with a Limit", read straight off the equation without solving it.',
              ),
            ),
            teach(
              prose('Whether solutions settle there depends on the sign of the rate either side of it.'),
              prose(
                'For $0.5(40 - y)$, the rate is negative above $40$ and positive below: every solution is pushed towards $40$. It is **stable**.',
              ),
              prose('For $0.5(y - 40)$, the signs swap and every solution is pushed away. It is **unstable**, and $y$ runs off without limit.'),
              figure({
                xMin: 0,
                xMax: 6,
                yMin: -2,
                yMax: 80,
                curves: [
                  { f: (t: number) => 40 + 30 * Math.exp(-0.6 * t) },
                  { f: (t: number) => 40 - 30 * Math.exp(-0.6 * t) },
                ],
                horizontals: [40],
                label: 'Two curves closing in on a dashed line at 40, one from above and one from below',
              }),
            ),
            ask('de-long-equilibrium'),
            ask('de-long-slider'),
            ask('de-long-flow'),
            ask('de-long-equilibrium', 2),
            ask('de-long-flow', 2),
            ask('de-long-slider', 2),
            teach(
              prose(
                "Every model in this level has a stable level: the room for Newton's cooling, the limit for growth towards a limit, and the balance of rates for a mixing tank.",
              ),
              prose(
                'For a tank, set rate in equal to rate out. A $100$ litre tank taking $2$ litres a minute at $6$ g a litre plus $3$ litres a minute of fresh water, with $5$ litres a minute out, has $12 = 5 \\times \\frac{S}{100}$, so it settles at $S = 240$ g.',
              ),
            ),
            ask('de-mix-limit', 2),
            ask('de-limit-flow', 2),
          ],
          skillCheck: [ask('de-long-equilibrium', 2), ask('de-long-slider', 2), ask('de-long-flow', 2)],
        },
        {
          id: 'de-l2-verify',
          title: 'Checking a Solution',
          slides: [
            teach(
              prose(
                'To check a proposed solution, differentiate it, put it into both sides of the equation, and see whether they agree for every $x$. Is $y = 3x^{2}$ a solution of $x\\frac{dy}{dx} = 2y$?',
              ),
              working('x\\frac{dy}{dx} &= x \\times 6x = 6x^{2}', '2y &= 6x^{2}'),
              prose('They agree, so it is.'),
            ),
            ask('de-verify-steps'),
            teach(
              prose(
                'Numbers at one value of $x$ can rule a candidate out: if the two sides differ there, it is not a solution. Agreeing at one point proves nothing on its own.',
              ),
              prose(
                'Test $y = x^{3}$ in $x\\frac{dy}{dx} = 2y$ at $x = 1$: $\\frac{dy}{dx} = 3x^{2} = 3$, so the left side is $1 \\times 3 = 3$ and the right side is $2 \\times 1 = 2$. They differ, so $y = x^{3}$ is not a solution.',
              ),
            ),
            ask('de-verify-tree'),
            ask('de-verify-which'),
            teach(
              prose(
                'A candidate with an unknown in it can be made to work: choose the unknown so the two sides match term by term. For which $c$ is $y = 2e^{3x} + c$ a solution of $\\frac{dy}{dx} = 3y - 6$?',
              ),
              working('\\frac{dy}{dx} &= 6e^{3x}', '3y - 6 &= 6e^{3x} + 3c - 6'),
              prose('The $e^{3x}$ terms already match, so the rest must be $0$: $3c - 6 = 0$ and $c = 2$.'),
              prose(
                'A power works the same way. For $y = 3x^{p}$ in $x\\frac{dy}{dx} = 4y$, the left side is $3px^{p}$ and the right side $12x^{p}$, so $3p = 12$ and $p = 4$.',
              ),
            ),
            ask('de-verify-constant'),
            ask('de-verify-which', 2),
            asking(
              'de-verify-constant',
              2,
              prose(
                'For $y = mx + m$ in $\\frac{dy}{dx} = y + 3x$: the left side is $m$, and the right side is $mx + m + 3x = (m + 3)x + m$. That is $m$ at every $x$ only when the $x$ term vanishes: $m = -3$.',
              ),
            ),
          ],
          skillCheck: [ask('de-verify-steps', 2), ask('de-verify-tree', 2), ask('de-verify-which', 2)],
        },
      ],
      levelCheck: [
        ask('de-cool-tiles', 2),
        ask('de-limit-flow', 2),
        ask('de-mix-tiles', 2),
        ask('de-long-equilibrium', 2),
        ask('de-verify-steps', 2),
        ask('de-cool-tree', 2),
        ask('de-limit-steps', 2),
        ask('de-mix-tree', 2),
        ask('de-long-slider', 2),
        ask('de-verify-which', 2),
        ask('de-cool-value', 2),
        ask('de-limit-slider', 2),
        ask('de-mix-limit', 2),
        ask('de-long-flow', 2),
        ask('de-verify-constant', 2),
      ],
    },

    {
      id: 'de-l3',
      title: 'The Integrating Factor',
      lessons: [
        {
          id: 'de-l3-product',
          title: 'The Product Rule Backwards',
          slides: [
            teach(
              prose(
                'Not every equation separates. $\\frac{dy}{dx} + \\frac{2}{x}y = 5x^{2}$ cannot be split into a function of $x$ times a function of $y$.',
              ),
              prose('It is **linear**: it has the form'),
              display('\\frac{dy}{dx} + Py = Q'),
              prose(
                'with $P$ and $Q$ functions of $x$ alone. $\\frac{dy}{dx}$ has to stand on its own before $P$ and $Q$ are read, so divide by whatever multiplies it first.',
              ),
            ),
            ask('de-if-read'),
            ask('de-if-divide'),
            ask('de-if-product'),
            teach(
              prose('The product rule, with $y$ as one of the two factors:'),
              display('\\frac{d}{dx}(x^{2}y) = x^{2}\\frac{dy}{dx} + 2xy'),
              prose(
                "Read backwards: a left side of the form $I\\frac{dy}{dx} + I'y$ is the derivative of $Iy$, and it integrates in one step.",
              ),
            ),
            ask('de-if-read', 2),
            ask('de-if-product', 2),
            teach(
              prose(
                "So multiply $\\frac{dy}{dx} + Py = Q$ by a function $I$ whose derivative is $PI$. The left side becomes $I\\frac{dy}{dx} + I'y$, which is $\\frac{d}{dx}(Iy)$. That function is $I = e^{\\int P\\,dx}$, the **integrating factor**.",
              ),
              prose(
                "For $\\frac{dy}{dx} + \\frac{2}{x}y = 5x^{2}$: $\\int \\frac{2}{x}\\,dx = 2\\ln x$, so $I = e^{2\\ln x} = e^{\\ln x^{2}} = x^{2}$. Check: $(x^{2})' = 2x = \\frac{2}{x} \\times x^{2}$. Multiply every term by it, adding the powers on the right:",
              ),
              working('x^{2}\\frac{dy}{dx} + 2xy &= 5x^{4}', '\\frac{d}{dx}(x^{2}y) &= 5x^{4}'),
            ),
            ask('de-if-multiply-tree'),
            ask('de-if-divide', 2),
            asking(
              'de-if-multiply-tree',
              2,
              prose(
                'For a constant $P$ the factor is an exponential: $P = 2$ gives $I = e^{\\int 2\\,dx} = e^{2x}$, whose derivative is $2e^{2x}$. For $\\frac{dy}{dx} + 2y = 5e^{x}$:',
              ),
              working('e^{2x}\\frac{dy}{dx} + 2e^{2x}y &= 5e^{3x}', '\\frac{d}{dx}(ye^{2x}) &= 5e^{3x}'),
            ),
          ],
          skillCheck: [ask('de-if-read', 2), ask('de-if-product', 2), ask('de-if-multiply-tree', 2)],
        },
        {
          id: 'de-l3-factor',
          title: 'Finding the Factor',
          slides: [
            teach(
              prose("The function $I$ with $I' = PI$ is the **integrating factor**:"),
              display('I = e^{\\int P\\,dx}'),
              prose(
                'Leave out the constant of integration. $e^{C}$ only multiplies $I$, and any multiple of $I$ works just as well. For $P = 3$, $I = e^{3x}$.',
              ),
              prose('With the factor found, multiply every term by it. The left side is always $\\frac{d}{dx}(Iy)$ and the right side is $IQ$:'),
              working('\\frac{dy}{dx} + 3y &= 6', '\\frac{d}{dx}(ye^{3x}) &= 6e^{3x}'),
            ),
            ask('de-if-lhs'),
            teach(
              prose(
                'For $P = \\frac{n}{x}$, with $x > 0$, $\\int P\\,dx = n\\ln x$. A multiple of a logarithm is the logarithm of a power, and $e$ undoes $\\ln$:',
              ),
              working('I &= e^{2\\ln x}', '&= e^{\\ln x^{2}}', '&= x^{2}'),
              prose(
                'With $n = 1$ it is just $e^{\\ln x} = x$. The same happens for $\\frac{n}{x + a}$: $\\frac{3}{x + 1}$ integrates to $3\\ln(x + 1)$ and gives $(x + 1)^{3}$.',
              ),
            ),
            ask('de-if-factor'),
            ask('de-if-shape'),
            ask('de-if-exponent-steps'),
            ask('de-if-factor', 2),
            teach(
              prose(
                "When the top of $P$ is a multiple of the bottom's derivative, the integral is still a logarithm. For $P = \\frac{4x}{x^{2} + 1}$, the bottom differentiates to $2x$, and $4x$ is twice that:",
              ),
              working('\\int \\frac{4x}{x^{2} + 1}\\,dx &= 2\\ln(x^{2} + 1)', 'I &= e^{2\\ln(x^{2} + 1)}', '&= (x^{2} + 1)^{2}'),
            ),
            ask('de-if-shape', 2),
            ask('de-if-exponent-steps', 2),
            ask('de-if-lhs', 2),
          ],
          skillCheck: [ask('de-if-factor', 2), ask('de-if-exponent-steps', 2), ask('de-if-shape', 2)],
        },
        {
          id: 'de-l3-constant',
          title: 'A Constant P',
          slides: [
            teach(
              prose('With $P$ a constant $k$, the factor is $e^{kx}$. For $\\frac{dy}{dx} + 2y = 6e^{x}$, multiply through by $e^{2x}$ and integrate:'),
              working('\\frac{d}{dx}(ye^{2x}) &= 6e^{3x}', 'ye^{2x} &= 2e^{3x} + C'),
            ),
            ask('de-if-constp-steps'),
            ask('de-if-exponents-tree'),
            ask('de-if-integrate'),
            teach(
              prose('Then divide by the factor. Every term is divided, the constant as well:'),
              display('y = 2e^{x} + Ce^{-2x}'),
              prose('$Ce^{-2x}$ is not a constant any more. It dies away as $x$ grows, so every solution closes in on $2e^{x}$.'),
              figure({
                xMin: 0,
                xMax: 1.5,
                yMin: -1,
                yMax: 10,
                curves: [
                  { f: (x: number) => 2 * Math.exp(x) + 3 * Math.exp(-2 * x) },
                  { f: (x: number) => 2 * Math.exp(x), dashed: true },
                  { f: (x: number) => 2 * Math.exp(x) - 2 * Math.exp(-2 * x) },
                ],
                label: 'Two solution curves, one starting at 5 and one at 0, closing in on a dashed curve that starts at 2',
              }),
            ),
            ask('de-if-general'),
            ask('de-if-constp-steps', 2),
            ask('de-if-exponents-tree', 2),
            teach(
              prose('A constant $Q$ is the case $m = 0$ of $e^{mx}$. For $\\frac{dy}{dx} + 3y = 12$,'),
              working('\\frac{d}{dx}(ye^{3x}) &= 12e^{3x}', 'ye^{3x} &= 4e^{3x} + C', 'y &= 4 + Ce^{-3x}'),
              prose('The $4$ is where $\\frac{dy}{dx} = 0$: the level every solution settles at.'),
            ),
            ask('de-if-general', 2),
            ask('de-if-integrate', 2),
          ],
          skillCheck: [ask('de-if-constp-steps', 2), ask('de-if-general', 2), ask('de-if-integrate', 2)],
        },
        {
          id: 'de-l3-power',
          title: 'When the Factor Is a Power of x',
          slides: [
            teach(
              prose('For $P = \\frac{n}{x}$, with $x > 0$, the factor is $x^{n}$. For $\\frac{dy}{dx} + \\frac{2}{x}y = 5x^{2}$:'),
              working('\\frac{d}{dx}(x^{2}y) &= 5x^{4}', 'x^{2}y &= x^{5} + C', 'y &= x^{3} + \\frac{C}{x^{2}}'),
              prose('The last line divides by $x^{2}$, the constant too: $C$ divided by $x^{2}$ is $\\frac{C}{x^{2}}$, not $C$.'),
            ),
            ask('de-if-power-steps'),
            ask('de-if-powers-tree'),
            ask('de-if-cterm'),
            teach(
              prose(
                'In general, multiplying by $x^{n}$ adds $n$ to the power on the right, integrating adds one more, and dividing takes $n$ away again, leaving $C$ over $x^{n}$.',
              ),
              prose(
                'A negative $P$ gives a negative power. For $\\frac{dy}{dx} - \\frac{1}{x}y = 3x$: $\\int P\\,dx = -\\ln x$, so $I = e^{-\\ln x} = x^{-1} = \\frac{1}{x}$.',
              ),
              working('\\frac{d}{dx}\\left(\\frac{y}{x}\\right) &= 3', '\\frac{y}{x} &= 3x + C', 'y &= 3x^{2} + Cx'),
              prose('Dividing by $\\frac{1}{x}$ multiplies by $x$, the constant as well.'),
            ),
            ask('de-if-power-tiles'),
            ask('de-if-power-steps', 2),
            ask('de-if-powers-tree', 2),
            teach(
              prose(
                'These equations often come multiplied by $x$, as $x\\frac{dy}{dx} + 2y = 5x^{3}$. Divide by $x$ first: read as it stands, $P$ would look like $2$ and the factor like $e^{2x}$, which does not make a product.',
              ),
            ),
            ask('de-if-power-tiles', 2),
            ask('de-if-cterm', 2),
          ],
          skillCheck: [ask('de-if-power-steps', 2), ask('de-if-power-tiles', 2), ask('de-if-powers-tree', 2)],
        },
        {
          id: 'de-l3-particular',
          title: 'Particular Solutions',
          slides: [
            teach(
              prose('A condition fixes $C$. Find the general solution, divide by the factor, then put the condition in. For $\\frac{dy}{dx} + 3y = 12$ with $y(0) = 7$:'),
              working('y &= 4 + Ce^{-3x}', '7 &= 4 + C', 'C &= 3'),
              prose('So $y = 4 + 3e^{-3x}$.'),
            ),
            ask('de-if-constant'),
            ask('de-if-condition-steps'),
            teach(
              prose(
                'The whole solve, from the equation. For $\\frac{dy}{dx} + \\frac{2}{x}y = 5x^{2}$ with $y(2) = 10$, the factor is $x^{2}$:',
              ),
              working('\\frac{d}{dx}(x^{2}y) &= 5x^{4}', 'x^{2}y &= x^{5} + C', 'y &= x^{3} + \\frac{C}{x^{2}}'),
              prose('At $x = 2$ the $C$ term is divided too:'),
              working('10 &= 8 + \\tfrac{C}{4}', 'C &= 8'),
              prose(
                'So $y = x^{3} + \\frac{8}{x^{2}}$. It can be checked twice: it has to meet the condition, and put back into the equation it has to make both sides agree.',
              ),
            ),
            ask('de-if-fit'),
            ask('de-if-value-tree'),
            ask('de-if-condition-steps', 2),
            teach(
              prose(
                'With $P = -\\frac{n}{x}$ the factor is a negative power. For $\\frac{dy}{dx} - \\frac{2}{x}y = 2x^{2}$ with $y(1) = 5$: $I = e^{-2\\ln x} = x^{-2}$, so',
              ),
              working(
                '\\frac{d}{dx}\\left(\\frac{y}{x^{2}}\\right) &= 2',
                '\\frac{y}{x^{2}} &= 2x + C',
                'y &= 2x^{3} + Cx^{2}',
                '5 &= 2 + C, \\quad C = 3',
              ),
              prose('So $y = 2x^{3} + 3x^{2}$.'),
            ),
            ask('de-if-constant', 2),
            ask('de-if-fit', 2),
            ask('de-if-value-tree', 2),
          ],
          skillCheck: [ask('de-if-constant', 2), ask('de-if-condition-steps', 2), ask('de-if-fit', 2)],
        },
      ],
      levelCheck: [
        ask('de-if-read', 2),
        ask('de-if-factor', 2),
        ask('de-if-constp-steps', 2),
        ask('de-if-power-tiles', 2),
        ask('de-if-constant', 2),
        ask('de-if-product', 2),
        ask('de-if-exponent-steps', 2),
        ask('de-if-general', 2),
        ask('de-if-powers-tree', 2),
        ask('de-if-fit', 2),
        ask('de-if-multiply-tree', 2),
        ask('de-if-lhs', 2),
        ask('de-if-integrate', 2),
        ask('de-if-cterm', 2),
        ask('de-if-value-tree', 2),
      ],
    },
    {
      id: 'de-l4',
      title: 'Second-Order with Constant Coefficients',
      lessons: [
        {
          id: 'de-l4-auxiliary',
          title: 'The Auxiliary Equation',
          slides: [
            teach(
              prose(
                "A **second-order** equation has a second derivative in it. Write $y'$ for $\\frac{dy}{dx}$ and $y''$ for $\\frac{d^2y}{dx^2}$. This level solves",
              ),
              display("y'' + by' + cy = 0"),
              prose(
                "with $b$ and $c$ constants. Try $y = e^{mx}$: as in Differentiation's exponentials lesson, $y' = me^{mx}$ and $y'' = m^2e^{mx}$. Put them in and every term carries $e^{mx}$, which is never $0$, so",
              ),
              display('m^2 + bm + c = 0'),
              prose('This is the **auxiliary equation**: $y\'\'$ becomes $m^2$, $y\'$ becomes $m$ and $y$ becomes $1$.'),
            ),
            ask('de-aux-sub-steps'),
            ask('de-aux-tiles'),
            ask('de-aux-root'),
            teach(
              prose(
                'Each root $m$ gives a solution $e^{mx}$. Its discriminant, $b^2 - 4c$, decides the kind of root, just as in Quadratics:',
              ),
              prose('positive: two different real roots. Zero: one repeated root. Negative: two complex roots, as in Complex Numbers.'),
              working("y'' - 5y' + 6y &= 0", 'm^2 - 5m + 6 &= 0', '(m - 2)(m - 3) &= 0'),
              prose('Here $b^2 - 4c = 1$, and the roots are $2$ and $3$.'),
            ),
            ask('de-aux-case'),
            teach(
              prose("An equation may come rearranged: bring every term to the left first."),
              working("y'' &= 5y' - 6y", "y'' - 5y' + 6y &= 0", 'm^2 - 5m + 6 &= 0'),
              prose('If $y\'\'$ has a number in front, divide every term by it first. The roots do not change:'),
              working("2y'' - 8y' + 6y &= 0", "y'' - 4y' + 3y &= 0", 'm^2 - 4m + 3 &= 0'),
            ),
            ask('de-aux-sub-steps', 2),
            ask('de-aux-tiles', 2),
            ask('de-aux-root', 2),
            ask('de-aux-case', 2),
          ],
          skillCheck: [ask('de-aux-tiles', 2), ask('de-aux-root', 2), ask('de-aux-case', 2)],
        },
        {
          id: 'de-l4-real',
          title: 'Two Real Roots',
          slides: [
            teach(
              prose(
                'When the auxiliary equation has two different real roots $p$ and $q$, both $e^{px}$ and $e^{qx}$ are solutions. With $0$ on the right, a sum of multiples of solutions is a solution too, so the **general solution** is',
              ),
              display('y = Ae^{px} + Be^{qx}'),
              prose(
                "A second-order equation needs two constants, one for each solution. The whole method, for $y'' = y' + 6y$: bring every term to the left, then the auxiliary equation and its roots.",
              ),
              working("y'' - y' - 6y &= 0", 'm^2 - m - 6 &= 0', '(m + 2)(m - 3) &= 0'),
              prose('The roots are $-2$ and $3$, so $y = Ae^{-2x} + Be^{3x}$.'),
            ),
            ask('de-real-general'),
            ask('de-real-which'),
            ask('de-real-solve-steps'),
            teach(
              prose(
                'Every factorising uses one fact: the roots of $m^2 + bm + c = 0$ **add to $-b$** and **multiply to $c$**. For $y\'\' + y\' - 12y = 0$:',
              ),
              working('m^2 + m - 12 &= 0', 'p + q &= -1, \\quad pq = -12'),
              prose(
                'Two whole numbers adding to $-1$ and multiplying to $-12$ are $-4$ and $3$. So $(m + 4)(m - 3) = 0$ and $y = Ae^{-4x} + Be^{3x}$.',
              ),
            ),
            ask('de-real-roots-tree'),
            ask('de-real-general', 2),
            ask('de-real-roots-tree', 2),
            teach(
              prose(
                "A negative root gives a term that dies away. With no $y'$ term, as in $y'' - 9y = 0$, the roots are $\\pm 3$, so $y = Ae^{-3x} + Be^{3x}$: every solution with $B > 0$ ends up growing like $e^{3x}$.",
              ),
              figure({
                xMin: -1.5,
                xMax: 1.5,
                yMin: -4,
                yMax: 10,
                curves: [
                  { f: (x: number) => Math.exp(-3 * x) / 4 + Math.exp(3 * x) / 4 },
                  { f: (x: number) => Math.exp(-3 * x) / 4, dashed: true },
                  { f: (x: number) => Math.exp(3 * x) / 4, dashed: true },
                ],
                label: 'A solution curve dipping to a minimum, with dashed curves for its two exponential parts, one falling and one rising',
              }),
            ),
            ask('de-real-which', 2),
            ask('de-real-solve-steps', 2),
          ],
          skillCheck: [ask('de-real-general', 2), ask('de-real-roots-tree', 2), ask('de-real-solve-steps', 2)],
        },
        {
          id: 'de-l4-repeated',
          title: 'A Repeated Root',
          slides: [
            teach(
              prose(
                'When $b^2 = 4c$ the auxiliary equation has one root $p$, twice. $Ae^{px} + Be^{px}$ is only $(A + B)e^{px}$, one constant. The second solution is $xe^{px}$, so',
              ),
              working('y &= Ae^{px} + Bxe^{px}', '&= (A + Bx)e^{px}'),
              prose("For $y'' + 4y' + 4y = 0$:"),
              working('m^2 + 4m + 4 &= 0', '(m + 2)^2 &= 0'),
              prose('The root is $-2$, twice, so $y = (A + Bx)e^{-2x}$.'),
            ),
            ask('de-rep-general'),
            ask('de-rep-shape'),
            teach(
              prose("Why $xe^{px}$ works, checked by putting it in, as in Checking a Solution. For $y'' - 6y' + 9y = 0$ and $y = xe^{3x}$, by the product rule:"),
              working("y' &= e^{3x} + 3xe^{3x}", '&= (1 + 3x)e^{3x}', "y'' &= 3e^{3x} + 3(1 + 3x)e^{3x}", '&= (6 + 9x)e^{3x}'),
              prose("Then $y'' - 6y' + 9y = (6 + 9x - 6 - 18x + 9x)e^{3x} = 0$."),
            ),
            ask('de-rep-check-steps'),
            ask('de-rep-which'),
            ask('de-rep-general', 2),
            ask('de-rep-check-steps', 2),
            teach(
              prose(
                "A repeated root shows as a perfect square: $b = -2p$ and $c = p^2$. With a number in front of $y''$, divide by it first. For $2y'' + 20y' + 50y = 0$:",
              ),
              working("y'' + 10y' + 25y &= 0", '(m + 5)^2 &= 0'),
              prose('So $y = (A + Bx)e^{-5x}$.'),
            ),
            ask('de-rep-shape', 2),
            ask('de-rep-which', 2),
          ],
          skillCheck: [ask('de-rep-general', 2), ask('de-rep-check-steps', 2), ask('de-rep-shape', 2)],
        },
        {
          id: 'de-l4-complex',
          title: 'Complex Roots',
          slides: [
            teach(
              prose(
                'When $b^2 < 4c$ the roots are a complex pair $\\alpha \\pm \\beta i$, as in Quadratics with Complex Roots. The two exponentials combine into a cosine and a sine:',
              ),
              display('y = e^{\\alpha x}(A\\cos \\beta x + B\\sin \\beta x)'),
              prose("For $y'' - 4y' + 13y = 0$, complete the square in the auxiliary equation:"),
              working('m^2 - 4m + 13 &= 0', '(m - 2)^2 + 9 &= 0', '(m - 2)^2 &= -9', 'm &= 2 \\pm 3i'),
              prose('So $\\alpha = 2$, $\\beta = 3$, and $y = e^{2x}(A\\cos 3x + B\\sin 3x)$.'),
            ),
            ask('de-cx-general'),
            ask('de-cx-part'),
            teach(
              prose('The quadratic formula gives $\\alpha$ and $\\beta$ at once:'),
              display('\\alpha = -\\frac{b}{2}, \\qquad \\beta = \\frac{\\sqrt{4c - b^2}}{2}'),
              prose(
                'Going backwards, read the roots off a solution and rebuild the quadratic. $y = e^{-x}(A\\cos 3x + B\\sin 3x)$ has $m = -1 \\pm 3i$:',
              ),
              working('(m + 1)^2 + 9 &= 0', 'm^2 + 2m + 10 &= 0'),
              prose("so the equation is $y'' + 2y' + 10y = 0$."),
            ),
            ask('de-cx-which'),
            ask('de-cx-tree'),
            ask('de-cx-general', 2),
            ask('de-cx-part', 2),
            teach(
              prose(
                "With no $y'$ term, $\\alpha = 0$ and the exponential is $1$: $y'' + 9y = 0$ gives $y = A\\cos 3x + B\\sin 3x$, which oscillates for ever. A negative $\\alpha$ makes the oscillation die away.",
              ),
              figure({
                xMin: 0,
                xMax: 6,
                yMin: -1.2,
                yMax: 1.2,
                curves: [
                  { f: (x: number) => Math.exp(-0.5 * x) * Math.cos(3 * x) },
                  { f: (x: number) => Math.exp(-0.5 * x), dashed: true },
                  { f: (x: number) => -Math.exp(-0.5 * x), dashed: true },
                ],
                label: 'An oscillating curve whose swings shrink inside two dashed exponential curves',
              }),
            ),
            ask('de-cx-which', 2),
            ask('de-cx-tree', 2),
          ],
          skillCheck: [ask('de-cx-general', 2), ask('de-cx-part', 2), ask('de-cx-tree', 2)],
        },
        {
          id: 'de-l4-particular',
          title: 'Initial Conditions',
          slides: [
            teach(
              prose(
                "Two constants need two conditions, usually the **initial conditions** $y(0)$ and $y'(0)$: where the curve starts and its gradient there. For $y'' - 5y' + 6y = 0$ with $y(0) = 5$ and $y'(0) = 12$:",
              ),
              working("y &= Ae^{2x} + Be^{3x}", "y' &= 2Ae^{2x} + 3Be^{3x}"),
              prose('At $x = 0$ these give $A + B = 5$ and $2A + 3B = 12$, so $B = 2$, $A = 3$, and $y = 3e^{2x} + 2e^{3x}$.'),
            ),
            teach(
              prose(
                "At $x = 0$, $e^{0} = 1$, $\\cos 0 = 1$ and $\\sin 0 = 0$, so $y(0) = A$ for a repeated root and for complex roots. Then $y'(0)$ gives $B$, by the product rule.",
              ),
              prose("A repeated root: $y'' - 6y' + 9y = 0$ has $3$ twice. With $y(0) = 2$ and $y'(0) = 5$:"),
              working("y &= (A + Bx)e^{3x}", "y' &= Be^{3x} + 3(A + Bx)e^{3x}", "y'(0) &= B + 3A", '5 &= B + 6, \\quad B = -1'),
              prose("So $y = (2 - x)e^{3x}$. In general $y'(0) = pA + B$."),
            ),
            teach(
              prose("Complex roots: $y'' - 2y' + 10y = 0$ has $m = 1 \\pm 3i$. With $y(0) = 2$ and $y'(0) = 11$:"),
              working(
                'y &= e^{x}(A\\cos 3x + B\\sin 3x)',
                "y' &= e^{x}(A\\cos 3x + B\\sin 3x)",
                '&\\quad + e^{x}(-3A\\sin 3x + 3B\\cos 3x)',
                "y'(0) &= A + 3B",
                '11 &= 2 + 3B, \\quad B = 3',
              ),
              prose(
                "So $y = e^{x}(2\\cos 3x + 3\\sin 3x)$. In general $y'(0) = \\alpha A + \\beta B$. A particular solution can be checked twice: it meets both conditions, and put back into the equation it gives $0$.",
              ),
            ),
            ask('de-ivp-constant'),
            ask('de-ivp-solve-tree'),
            ask('de-ivp-conditions-steps'),
            ask('de-ivp-fit'),
            ask('de-ivp-constant', 2),
            ask('de-ivp-solve-tree', 2),
            ask('de-ivp-conditions-steps', 2),
            ask('de-ivp-fit', 2),
          ],
          skillCheck: [ask('de-ivp-constant', 2), ask('de-ivp-solve-tree', 2), ask('de-ivp-fit', 2)],
        },
      ],
      levelCheck: [
        ask('de-aux-tiles', 2),
        ask('de-real-general', 2),
        ask('de-rep-check-steps', 2),
        ask('de-cx-part', 2),
        ask('de-ivp-solve-tree', 2),
        ask('de-aux-case', 2),
        ask('de-real-which', 2),
        ask('de-rep-general', 2),
        ask('de-cx-tree', 2),
        ask('de-ivp-constant', 2),
        ask('de-aux-sub-steps', 2),
        ask('de-real-roots-tree', 2),
        ask('de-rep-shape', 2),
        ask('de-cx-which', 2),
        ask('de-ivp-conditions-steps', 2),
      ],
    },
    {
      id: 'de-l5',
      title: 'Non-Homogeneous Second-Order',
      lessons: [
        {
          id: 'de-l5-cf-pi',
          title: 'Complementary Function and Particular Integral',
          slides: [
            teach(
              prose("Now the right side is a function of $x$ rather than $0$:"),
              display("y'' + by' + cy = f(x)"),
              prose(
                'Its solution comes in two parts. The **complementary function** (CF) solves the equation with $0$ on the right, exactly as in the last level, and carries $A$ and $B$. A **particular integral** (PI) is any one function that gives $f(x)$.',
              ),
              prose(
                "To check a particular integral, differentiate it twice and put it in: the left side must come to $f(x)$. For $y'' + 3y' + 2y = 4x + 6$, check $y = 2x$:",
              ),
              working("y' &= 2, \\quad y'' = 0", "y'' + 3y' + 2y &= 0 + 6 + 4x"),
              prose('That is $4x + 6$, the right side, so $y = 2x$ is a particular integral.'),
            ),
            ask('de-nh-check-steps'),
            ask('de-nh-which-pi'),
            ask('de-nh-constant'),
            teach(
              prose(
                'Why the two add: the complementary function gives $0$ on the left and the particular integral gives $f(x)$, so their sum gives $0 + f(x)$. The **general solution** is',
              ),
              display('y = \\text{CF} + \\text{PI}'),
              prose(
                "For $y'' + 3y' + 2y = 12e^{x}$, $y = 2e^{x}$ gives $2e^{x} + 6e^{x} + 4e^{x} = 12e^{x}$. The roots of $m^2 + 3m + 2 = 0$ are $-1$ and $-2$, so",
              ),
              display('y = Ae^{-x} + Be^{-2x} + 2e^{x}'),
            ),
            ask('de-nh-general-flow'),
            ask('de-nh-check-steps', 2),
            ask('de-nh-which-pi', 2),
            teach(
              prose(
                "A constant right side has a constant particular integral: its derivatives are $0$, so only the $y$ term is left. For $y'' - 3y' + 2y = 4$, $2y = 4$ gives $y = 2$, and $y = Ae^{x} + Be^{2x} + 2$.",
              ),
            ),
            ask('de-nh-general-flow', 2),
            ask('de-nh-constant', 2),
          ],
          skillCheck: [ask('de-nh-check-steps', 2), ask('de-nh-general-flow', 2), ask('de-nh-constant', 2)],
        },
        {
          id: 'de-l5-polynomial',
          title: 'A Polynomial Right Side',
          slides: [
            teach(
              prose(
                'When $f(x)$ is a polynomial, try a polynomial of the same degree with unknown coefficients, then **compare coefficients**. For $y\'\' - 3y\' + 2y = 4x$, try $y = \\lambda x + \\mu$: $y\' = \\lambda$ and $y\'\' = 0$, so',
              ),
              working('-3\\lambda + 2(\\lambda x + \\mu) &= 4x', '2\\lambda x + (-3\\lambda + 2\\mu) &= 4x'),
              prose('The $x$ terms give $\\lambda = 2$, then the numbers give $\\mu = 3$: $y = 2x + 3$.'),
            ),
            ask('de-nh-poly-trial'),
            ask('de-nh-poly-tree'),
            ask('de-nh-poly-pi'),
            teach(
              prose(
                "A quadratic takes $y = \\lambda x^2 + \\mu x + \\nu$, and the top power comes first. For $y'' - y' - 2y = -2x^2 - 2x$:",
              ),
              prose('Collect the $x^2$ terms, the $x$ terms and the numbers, and compare each with the right side:'),
              working('-2\\lambda &= -2', '-2\\lambda - 2\\mu &= -2', '2\\lambda - \\mu - 2\\nu &= 0'),
              prose('So $\\lambda = 1$, then $\\mu = 0$, then $\\nu = 1$: $y = x^2 + 1$.'),
            ),
            ask('de-nh-poly-steps'),
            ask('de-nh-constant', 2),
            ask('de-nh-poly-trial', 2),
            teach(
              prose(
                "Keep every power below the top one, even when $f(x)$ has none of it. For $f(x) = 6x$ the trial is still $\\lambda x + \\mu$: the $y'$ term turns $\\lambda x$ into a number, and $\\mu$ is there to cancel it.",
              ),
            ),
            ask('de-nh-poly-pi', 2),
          ],
          skillCheck: [ask('de-nh-poly-tree', 2), ask('de-nh-poly-pi', 2), ask('de-nh-poly-steps', 2)],
        },
        {
          id: 'de-l5-exponential',
          title: 'An Exponential Right Side',
          slides: [
            teach(
              prose(
                "When $f(x) = Fe^{kx}$, try $y = \\lambda e^{kx}$. Then $y' = k\\lambda e^{kx}$ and $y'' = k^2\\lambda e^{kx}$, and every term carries $\\lambda e^{kx}$:",
              ),
              display('(k^2 + bk + c)\\lambda = F'),
              prose(
                "For $y'' - 5y' + 6y = 4e^{x}$, first check $k = 1$ is not a root of the auxiliary equation: $m^2 - 5m + 6 = (m - 2)(m - 3)$ has roots $2$ and $3$. Then $(1 - 5 + 6)\\lambda = 4$, so $\\lambda = 2$ and $y = 2e^{x}$.",
              ),
            ),
            ask('de-nh-exp-value'),
            ask('de-nh-exp-steps'),
            ask('de-nh-exp-flow'),
            teach(
              prose(
                'Then add the complementary function. The roots of $m^2 - 5m + 6 = 0$ are $2$ and $3$, so the general solution of $y\'\' - 5y\' + 6y = 4e^{x}$ is',
              ),
              display('y = Ae^{2x} + Be^{3x} + 2e^{x}'),
            ),
            ask('de-nh-exp-general'),
            ask('de-nh-exp-value', 2),
            ask('de-nh-exp-steps', 2),
            teach(
              prose(
                'The number $k^2 + bk + c$ is the auxiliary equation\'s left side at $m = k$. It is never $0$ here, because $k$ is not a root. When it is, $\\lambda e^{kx}$ is part of the complementary function and gives $0$: that is the last lesson of this level.',
              ),
            ),
            ask('de-nh-exp-flow', 2),
            ask('de-nh-exp-general', 2),
          ],
          skillCheck: [ask('de-nh-exp-value', 2), ask('de-nh-exp-steps', 2), ask('de-nh-exp-general', 2)],
        },
        {
          id: 'de-l5-trigonometric',
          title: 'A Trigonometric Right Side',
          slides: [
            teach(
              prose(
                "When $f(x)$ is a cosine or a sine of $\\omega x$, try both: $y = \\lambda\\cos \\omega x + \\mu\\sin \\omega x$. The $y'$ term turns a cosine into a sine, so a cosine alone on the right still needs a sine in the trial.",
              ),
              prose("For $y'' + 3y' + 2y = 10\\cos x$, differentiate the trial twice:"),
              working('y &= \\lambda\\cos x + \\mu\\sin x', "y' &= -\\lambda\\sin x + \\mu\\cos x", "y'' &= -\\lambda\\cos x - \\mu\\sin x"),
            ),
            ask('de-nh-trig-trial'),
            teach(
              prose("Put $y$, $y'$ and $y''$ into $y'' + 3y' + 2y$ and collect the cosines and the sines:"),
              working('\\cos x&: \\; -\\lambda + 3\\mu + 2\\lambda = \\lambda + 3\\mu', '\\sin x&: \\; -\\mu - 3\\lambda + 2\\mu = -3\\lambda + \\mu'),
              prose('Compare with $10\\cos x + 0\\sin x$:'),
              working('\\lambda + 3\\mu &= 10', '-3\\lambda + \\mu &= 0'),
              prose(
                'Solve them as simultaneous equations: the second gives $\\mu = 3\\lambda$, so $\\lambda + 9\\lambda = 10$, $\\lambda = 1$ and $\\mu = 3$. So $y = \\cos x + 3\\sin x$. With a sine on the right as well, compare the sines with its coefficient instead of $0$.',
              ),
            ),
            ask('de-nh-trig-part'),
            teach(
              prose(
                "A shortcut: $y'' = -\\omega^2 y$ for the trial, so $y''$ and $cy$ together give $Ky$ with $K = c - \\omega^2$, and $by'$ brings $M = b\\omega$.",
              ),
              prose("The two equations are always $K\\lambda + M\\mu$ equal to the cosine's coefficient, and $-M\\lambda + K\\mu$ equal to the sine's. Above, $K = 2 - 1 = 1$ and $M = 3$."),
            ),
            ask('de-nh-trig-tree'),
            ask('de-nh-trig-steps'),
            ask('de-nh-trig-trial', 2),
            asking(
              'de-nh-general-flow',
              2,
              prose(
                "The general solution adds the complementary function, as in Complementary Function and Particular Integral. For $y'' + 3y' + 2y = 10\\cos x$, $m^2 + 3m + 2 = (m + 1)(m + 2)$ has roots $-1$ and $-2$, so $y = Ae^{-x} + Be^{-2x} + \\cos x + 3\\sin x$.",
              ),
            ),
            ask('de-nh-trig-part', 2),
          ],
          skillCheck: [ask('de-nh-trig-tree', 2), ask('de-nh-trig-part', 2), ask('de-nh-trig-steps', 2)],
        },
        {
          id: 'de-l5-resonance',
          title: 'Resonance and Initial Conditions',
          slides: [
            teach(
              prose(
                "If $f(x)$ is already part of the complementary function, the usual trial gives $0$ on the left. Multiply it by $x$. For $y'' - 3y' + 2y = 3e^{x}$, the roots are $1$ and $2$, so try $y = \\lambda xe^{x}$:",
              ),
              working("y' &= \\lambda(1 + x)e^{x}", "y'' &= \\lambda(2 + x)e^{x}"),
              prose(
                'The $x$ terms cancel and $-\\lambda e^{x} = 3e^{x}$, so $y = -3xe^{x}$. For a repeated root multiply by $x^2$: $y\'\' - 4y\' + 4y = 6e^{2x}$ takes $\\lambda x^2e^{2x}$, which gives $2\\lambda e^{2x}$, so $y = 3x^2e^{2x}$.',
              ),
            ),
            ask('de-nh-res-flow'),
            ask('de-nh-res-value'),
            teach(
              prose(
                "The same happens to $y'' + \\omega^2 y$ with a cosine or sine of $\\omega x$ on the right. For $y'' + 4y = 8\\cos 2x$, try $y = x(\\lambda\\cos 2x + \\mu\\sin 2x)$. By the product rule:",
              ),
              working(
                "y' &= (\\lambda\\cos 2x + \\mu\\sin 2x)",
                '&\\quad + x(-2\\lambda\\sin 2x + 2\\mu\\cos 2x)',
                "y'' &= 2(-2\\lambda\\sin 2x + 2\\mu\\cos 2x)",
                '&\\quad + x(-4\\lambda\\cos 2x - 4\\mu\\sin 2x)',
              ),
              prose(
                "The last bracket times $x$ is $-4y$, so $y'' + 4y = 4\\mu\\cos 2x - 4\\lambda\\sin 2x$. Compare with $8\\cos 2x$: $\\mu = 2$, $\\lambda = 0$, and $y = 2x\\sin 2x$.",
              ),
            ),
            ask('de-nh-res-flow', 2),
            teach(
              prose('This is **resonance**: pushed at its own frequency, the swings grow without limit.'),
              figure({
                xMin: 0,
                xMax: 6,
                yMin: -13,
                yMax: 13,
                curves: [
                  { f: (x: number) => 2 * x * Math.sin(2 * x) },
                  { f: (x: number) => 2 * x, dashed: true },
                  { f: (x: number) => -2 * x, dashed: true },
                ],
                label: 'An oscillating curve whose swings grow steadily between two dashed straight lines',
              }),
            ),
            ask('de-nh-res-value', 2),
            teach(
              prose(
                "Initial conditions go on the **whole** general solution, particular integral included. For $y'' - 3y' + 2y = 4$ with $y(0) = 5$ and $y'(0) = 4$:",
              ),
              working('y &= Ae^{x} + Be^{2x} + 2', "y' &= Ae^{x} + 2Be^{2x}"),
              prose('At $x = 0$: $A + B + 2 = 5$ and $A + 2B = 4$, so $B = 1$, $A = 2$, and $y = 2e^{x} + e^{2x} + 2$.'),
            ),
            ask('de-nh-ivp-tree'),
            ask('de-nh-ivp-fit'),
            ask('de-nh-ivp-tree', 2),
          ],
          skillCheck: [ask('de-nh-res-value', 2), ask('de-nh-ivp-tree', 2), ask('de-nh-ivp-fit', 2)],
        },
      ],
      levelCheck: [
        ask('de-nh-check-steps', 2),
        ask('de-nh-poly-tree', 2),
        ask('de-nh-exp-value', 2),
        ask('de-nh-trig-steps', 2),
        ask('de-nh-res-flow', 2),
        ask('de-nh-which-pi', 2),
        ask('de-nh-poly-pi', 2),
        ask('de-nh-exp-general', 2),
        ask('de-nh-trig-part', 2),
        ask('de-nh-ivp-tree', 2),
        ask('de-nh-general-flow', 2),
        ask('de-nh-poly-steps', 2),
        ask('de-nh-exp-flow', 2),
        ask('de-nh-trig-tree', 2),
        ask('de-nh-ivp-fit', 2),
      ],
    },
    {
      id: 'de-l6',
      title: 'Simple Harmonic Motion',
      lessons: [
        {
          id: 'de-l6-equation',
          title: 'The Equation of SHM',
          slides: [
            teach(
              prose(
                'A particle moving along a line has **displacement** $x$ from a fixed point $O$ at time $t$. Dots mean rates in time: $\\dot{x} = \\frac{dx}{dt}$ is its velocity and $\\ddot{x} = \\frac{d^2x}{dt^2}$ its acceleration.',
              ),
              prose(
                'If its acceleration always points back to $O$ and grows in step with the distance from $O$, the motion is **simple harmonic motion** (SHM):',
              ),
              display('\\ddot{x} = -\\omega^2 x'),
              prose('Here $\\omega > 0$ is a constant. Written $\\ddot{x} + \\omega^2 x = 0$, it is last level\'s equation with no middle term.'),
            ),
            ask('de-shm-omega'),
            teach(
              prose(
                'Solve it as in Complex Roots. The auxiliary equation is $m^2 + \\omega^2 = 0$, so $m = \\pm \\omega i$: real part $0$ and imaginary part $\\omega$. With no real part there is no exponential, and',
              ),
              display('x = A\\cos \\omega t + B\\sin \\omega t'),
              prose(
                'For $\\ddot{x} + 9x = 0$: $m^2 = -9$, $\\omega = 3$ and $x = A\\cos 3t + B\\sin 3t$. With a number in front of $\\ddot{x}$, divide by it first: $2\\ddot{x} + 18x = 0$ is the same equation.',
              ),
            ),
            ask('de-shm-aux'),
            ask('de-shm-general'),
            ask('de-shm-omega', 2),
            ask('de-shm-aux', 2),
            teach(
              prose(
                'Any such $x$ can be checked by differentiating twice. For $x = 3\\cos 2t$, $\\dot{x} = -6\\sin 2t$ and $\\ddot{x} = -12\\cos 2t$, which is $-4x$: SHM with $\\omega = 2$.',
              ),
              prose('The motion swings between two points for ever, never dying down:'),
              figure({
                xMin: 0,
                xMax: 7,
                yMin: -4,
                yMax: 4,
                curves: [{ f: (t: number) => 3 * Math.cos(2 * t) }],
                label: 'A cosine wave of x against t swinging between 3 and minus 3 with the same height every time',
              }),
            ),
            ask('de-shm-verify-steps'),
            ask('de-shm-general', 2),
            ask('de-shm-verify-steps', 2),
          ],
          skillCheck: [ask('de-shm-omega', 2), ask('de-shm-aux', 2), ask('de-shm-verify-steps', 2)],
        },
        {
          id: 'de-l6-amplitude',
          title: 'Amplitude and Period',
          slides: [
            teach(
              prose(
                'Released from rest at $x = a$, the particle has $x(0) = a$ and $\\dot{x}(0) = 0$, so $A = a$ and $B = 0$:',
              ),
              display('x = a\\cos \\omega t'),
              prose(
                "It swings between $a$ and $-a$: the **amplitude** is $a$. One swing there and back takes $\\omega t$ through $2\\pi$, so the **period** is $\\frac{2\\pi}{\\omega}$. These are the amplitude and period of Functions & Transformations' waves.",
              ),
              prose(
                'Going back, a period of $\\frac{2\\pi}{5}$ means $\\omega = 5$, so the equation is $\\ddot{x} = -25x$, or $\\ddot{x} + 25x = 0$.',
              ),
            ),
            ask('de-shm-period'),
            teach(
              prose('Differentiate $x = a\\cos \\omega t$:'),
              display('\\dot{x} = -a\\omega \\sin \\omega t'),
              prose(
                'The sine is $\\pm 1$ exactly when the cosine is $0$, at the centre $O$, so the **greatest speed** is $a\\omega$, reached at $O$. The acceleration $-\\omega^2 x$ is greatest at the ends, where it has size $a\\omega^2$.',
              ),
              prose('For $\\ddot{x} = -9x$ released from rest at $x = 4$: period $\\frac{2\\pi}{3}$, greatest speed $12$, greatest acceleration $36$.'),
            ),
            ask('de-shm-speed'),
            ask('de-shm-motion-tree'),
            ask('de-shm-period', 2),
            teach(
              prose(
                'Passing through $O$ with velocity $V$ at $t = 0$ gives $x(0) = 0$ and $\\dot{x}(0) = V$. Then $A = 0$, and $\\dot{x}(0) = \\omega B$, so',
              ),
              display('x = \\frac{V}{\\omega}\\sin \\omega t'),
              prose(
                'In general $x(0)$ is $A$ and $\\dot{x}(0)$ is $\\omega B$. For $\\ddot{x} + 9x = 0$ with $x(0) = 2$ and $\\dot{x}(0) = 6$: $A = 2$, $3B = 6$, $B = 2$, so $x = 2\\cos 3t + 2\\sin 3t$.',
              ),
            ),
            ask('de-shm-release'),
            ask('de-shm-speed', 2),
            ask('de-shm-motion-tree', 2),
            ask('de-shm-release', 2),
          ],
          skillCheck: [ask('de-shm-period', 2), ask('de-shm-speed', 2), ask('de-shm-release', 2)],
        },
        {
          id: 'de-l6-phase',
          title: 'Phase',
          slides: [
            teach(
              prose(
                "$A\\cos \\omega t + B\\sin \\omega t$ is one wave in disguise, as in Trigonometric Identities' $R\\sin(x + \\alpha)$. For motion the cosine form is the usual one:",
              ),
              working('&R\\cos(\\omega t - \\alpha)', '&= R\\cos \\alpha \\cos \\omega t', '&\\quad + R\\sin \\alpha \\sin \\omega t'),
              prose('Compare the cosines and the sines: $R\\cos \\alpha = A$ and $R\\sin \\alpha = B$.'),
            ),
            teach(
              prose('Square and add, then divide one by the other:'),
              working('R &= \\sqrt{A^2 + B^2}', '\\tan \\alpha &= \\frac{B}{A}'),
              prose(
                'For $x = 3\\cos 2t + 4\\sin 2t$: $R = \\sqrt{9 + 16} = 5$ and $\\tan \\alpha = \\frac{4}{3}$, so $x = 5\\cos(2t - \\alpha)$. $R$ is the **amplitude**: the motion swings between $5$ and $-5$.',
              ),
            ),
            ask('de-shm-phase-steps'),
            ask('de-shm-phase-r'),
            ask('de-shm-phase-tan'),
            ask('de-shm-phase-tiles'),
            ask('de-shm-phase-steps', 2),
            ask('de-shm-phase-r', 2),
            teach(
              prose(
                '$\\alpha$ is the **phase**: the motion is at its greatest $x$ when $\\omega t = \\alpha$, a time $\\frac{\\alpha}{\\omega}$ after the start, rather than at $t = 0$. When $B$ is negative, so is $\\tan \\alpha$, and the peak came before $t = 0$.',
              ),
              figure({
                xMin: -0.5,
                xMax: 6.5,
                yMin: -6,
                yMax: 6,
                curves: [
                  { f: (t: number) => 3 * Math.cos(2 * t) + 4 * Math.sin(2 * t) },
                  { f: (t: number) => 5 * Math.cos(2 * t), dashed: true },
                ],
                label: 'A wave of height 5 whose peaks come a little after those of a dashed wave that peaks at t = 0',
              }),
            ),
            ask('de-shm-phase-tan', 2),
            ask('de-shm-phase-tiles', 2),
          ],
          skillCheck: [ask('de-shm-phase-r', 2), ask('de-shm-phase-tan', 2), ask('de-shm-phase-tiles', 2)],
        },
        {
          id: 'de-l6-damping',
          title: 'Damping',
          slides: [
            teach(
              prose(
                'A real spring slows down. A resistance in step with the speed adds a $\\dot{x}$ term, with $k > 0$:',
              ),
              display('\\ddot{x} + k\\dot{x} + \\omega^2 x = 0'),
              prose(
                'This is **damped** motion. Its auxiliary equation is $m^2 + km + \\omega^2 = 0$, and its discriminant $k^2 - 4\\omega^2$ sorts the roots by kind, as in The Auxiliary Equation.',
              ),
            ),
            teach(
              prose('Each kind of root is a kind of damping:'),
              prose('$k^2 > 4\\omega^2$: two negative real roots. **Over-damped**: $x$ creeps back to $0$ without swinging.'),
              prose('$k^2 = 4\\omega^2$: one repeated root. **Critically damped**: back to $0$ as fast as it can without swinging.'),
              prose('$k^2 < 4\\omega^2$: complex roots. **Under-damped**: it swings, and the swings die away.'),
              prose(
                'For $\\ddot{x} + 6\\dot{x} + 10x = 0$: $k^2 - 4\\omega^2 = 36 - 40 = -4$, negative, so it is under-damped.',
              ),
            ),
            ask('de-damp-case'),
            ask('de-damp-which'),
            teach(
              prose(
                'The swinging stops at critical damping, $k = 2\\omega$: that is the least $k$ with no oscillation. For $\\ddot{x} + k\\dot{x} + 25x = 0$, $\\omega = 5$, so $k = 10$. Then $D = 100 - 100 = 0$ and $m^2 + 10m + 25 = (m + 5)^2$: the root is $-5$, twice.',
              ),
              prose(
                'If $\\ddot{x}$ has a number in front, divide by it first: $2\\ddot{x} + k\\dot{x} + 50x = 0$ is $\\ddot{x} + \\frac{k}{2}\\dot{x} + 25x = 0$, so $\\frac{k}{2} = 10$ and $k = 20$.',
              ),
            ),
            ask('de-damp-least'),
            ask('de-damp-roots-tree'),
            ask('de-damp-case', 2),
            ask('de-damp-least', 2),
            ask('de-damp-roots-tree', 2),
            ask('de-damp-which', 2),
          ],
          skillCheck: [ask('de-damp-case', 2), ask('de-damp-least', 2), ask('de-damp-roots-tree', 2)],
        },
        {
          id: 'de-l6-damped',
          title: 'Damped Motion',
          slides: [
            teach(
              prose('The roots give the solution as in the last level, now in $t$. Under-damped, with roots $-p \\pm qi$:'),
              display('x = e^{-pt}(A\\cos qt + B\\sin qt)'),
              prose(
                'Over-damped, with roots $-r$ and $-s$: $x = Ae^{-rt} + Be^{-st}$. Critically damped, with $-r$ twice: $x = (A + Bt)e^{-rt}$.',
              ),
            ),
            ask('de-damp-general'),
            teach(
              prose(
                "The starting position and velocity fix $A$ and $B$, as in Initial Conditions. For $\\ddot{x} + 2\\dot{x} + 5x = 0$ the roots are $-1 \\pm 2i$. With $x(0) = 3$ and $\\dot{x}(0) = 1$, by the product rule:",
              ),
              working(
                'x &= e^{-t}(A\\cos 2t + B\\sin 2t)',
                '\\dot{x} &= -e^{-t}(A\\cos 2t + B\\sin 2t)',
                '&\\quad + e^{-t}(-2A\\sin 2t + 2B\\cos 2t)',
                '\\dot{x}(0) &= -A + 2B',
              ),
              prose('$x(0) = A = 3$, then $-3 + 2B = 1$, so $B = 2$ and $x = e^{-t}(3\\cos 2t + 2\\sin 2t)$. With roots $-p \\pm qi$, $\\dot{x}(0) = -pA + qB$.'),
            ),
            ask('de-damp-ivp-tree'),
            ask('de-damp-constant'),
            ask('de-damp-general', 2),
            teach(
              prose(
                'Every root has a negative real part, so every term carries a dying exponential: **$x \\to 0$ in every case**. The graph shows the kind. Under-damped, it crosses $0$ and the swings shrink inside $\\pm$ the exponential:',
              ),
              figure({
                xMin: 0,
                xMax: 6,
                yMin: -3.5,
                yMax: 3.5,
                curves: [
                  { f: (t: number) => Math.exp(-0.4 * t) * 3 * Math.cos(3 * t) },
                  { f: (t: number) => 3 * Math.exp(-0.4 * t), dashed: true },
                  { f: (t: number) => -3 * Math.exp(-0.4 * t), dashed: true },
                ],
                label: 'A wave whose swings shrink towards zero between two dashed exponential curves',
              }),
              prose(
                'Over- or critically damped, it dies away without crossing $0$. A negative $k$ pushes energy in, and the swings grow. So $\\ddot{x} + 2\\dot{x} + 17x = 0$, with $k^2 = 4 < 68 = 4\\omega^2$, swings, and $\\ddot{x} + 10\\dot{x} + 16x = 0$, with $k^2 = 100 > 64$, does not.',
              ),
            ),
            ask('de-damp-graph'),
            asking(
              'de-damp-ivp-tree',
              2,
              prose(
                'Critically damped, $x = (A + Bt)e^{-rt}$. For $\\ddot{x} + 4\\dot{x} + 4x = 0$, with $-2$ twice, $x(0) = 3$ and $\\dot{x}(0) = 1$:',
              ),
              working('\\dot{x} &= Be^{-2t} - 2(A + Bt)e^{-2t}', '\\dot{x}(0) &= B - 2A', '1 &= B - 6, \\quad B = 7'),
              prose(
                'Over-damped, $x = Ae^{-rt} + Be^{-st}$ gives $A + B = x(0)$ and $-rA - sB = \\dot{x}(0)$, solved together as in Initial Conditions.',
              ),
            ),
            ask('de-damp-constant', 2),
            ask('de-damp-graph', 2),
          ],
          skillCheck: [ask('de-damp-general', 2), ask('de-damp-ivp-tree', 2), ask('de-damp-graph', 2)],
        },
      ],
      levelCheck: [
        ask('de-shm-omega', 2),
        ask('de-shm-period', 2),
        ask('de-shm-phase-r', 2),
        ask('de-damp-case', 2),
        ask('de-damp-general', 2),
        ask('de-shm-aux', 2),
        ask('de-shm-motion-tree', 2),
        ask('de-shm-phase-steps', 2),
        ask('de-damp-least', 2),
        ask('de-damp-ivp-tree', 2),
        ask('de-shm-verify-steps', 2),
        ask('de-shm-release', 2),
        ask('de-shm-phase-tan', 2),
        ask('de-damp-roots-tree', 2),
        ask('de-damp-graph', 2),
      ],
    },
  ],
};
