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
 * Level 7 solves numerically, starting from Numerical Methods' "Euler's
 * Method" rather than repeating it: Euler on this course's models, where the
 * estimates settle on the model's level unless the step is too long, the
 * improved Euler method, the midpoint formula, a second-order equation split
 * into two first-order ones with `z = dy/dx`, and how each error shrinks with h.
 * Level 8, Families of Solutions, is shown with the first two levels in
 * Differential Equations Basics: the general solution read as a family of
 * curves, the member a point picks out, the gradient `dy/dx = f(x, y)` gives
 * at a point, direction fields with their isoclines, and solutions followed
 * through a field to an equilibrium.
 * Level 9 goes back to separating the variables when the x side needs a
 * technique from Integration: a top that is a multiple of the derivative of
 * the bottom, partial fractions, tan, cot and sec², substitution and parts,
 * each recapped with numbers before it is asked, then particular solutions.
 * Level 10, "Models of Populations and Money", goes back to first order at
 * A-level pace: continuous interest, savings with money paid in or out, a
 * harvested population, a drug that halves in the blood, and a steady drip
 * that settles at a level. It is shown in Differential Equations Basics.
 *
 * Integration and the exponential model are used here, not taught again:
 * `dy/dx = ky` read off a model belongs to Exponential Models' rate lesson,
 * and a model settling at a level to its "Models with a Limit". This course
 * starts from the equation and finds the model. Each level closes with a
 * level check: questions only, no teaching slides, one attempt each.
 */
import type { Block, Course, SlideRef } from '../types';
import { plotSvg } from '../figures';
import { fieldSvg } from '../generators/deFamilies';

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

/** A direction field: a short segment at each whole point. */
const field = (options: Parameters<typeof fieldSvg>[0]): Block => ({ kind: 'diagram', svg: fieldSvg(options) });

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
                '&\\quad + 3e^{x}(B\\cos 3x - A\\sin 3x)',
              ),
              working(
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
              working('\\cos x&: \\; -\\lambda + 3\\mu + 2\\lambda', '&= \\lambda + 3\\mu', '\\sin x&: \\; -\\mu - 3\\lambda + 2\\mu', '&= -3\\lambda + \\mu'),
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
                '&\\; + x(-2\\lambda\\sin 2x + 2\\mu\\cos 2x)',
                "y'' &= 2(-2\\lambda\\sin 2x + 2\\mu\\cos 2x)",
                '&\\; + x(-4\\lambda\\cos 2x - 4\\mu\\sin 2x)',
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
                '&\\quad + 2e^{-t}(B\\cos 2t - A\\sin 2t)',
              ),
              display('\\dot{x}(0) = -A + 2B'),
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
    {
      id: 'de-l7',
      title: 'Numerical Solutions',
      lessons: [
        {
          id: 'de-l7-model',
          title: 'Euler on a Model',
          slides: [
            teach(
              prose(
                "Euler's method is taught in Numerical Methods, Euler's Method: from a known point, walk a short step $h$ along the tangent.",
              ),
              working('y_{n+1} &= y_n + h\\,f(x_n, y_n)'),
              prose('For $\\frac{dy}{dx} = x + y$ from $(0, 1)$, with $h = 0.5$:'),
              working('f(0, 1) &= 0 + 1 = 1', 'y_1 &= 1 + 0.5 \\times 1', '&= 1.5'),
              prose('This level runs it on the models of this course, in $t$, and then goes further.'),
            ),
            asking(
              'de-num-model-tree',
              1,
              prose('A drink at 80°C cools in a room at 20°C. Its temperature, $x$°C after $t$ minutes, satisfies'),
              display('\\frac{dx}{dt} = -0.2(x - 20)'),
              prose('One step with $h = 2$: the bracket, the rate, $h$ times the rate, then add it on.'),
              working('x_0 - 20 &= 80 - 20 = 60', '\\frac{dx}{dt} &= -0.2 \\times 60 = -12', '2 \\times (-12) &= -24', 'x_1 &= 80 - 24 = 56'),
            ),
            asking(
              'de-num-model-recur',
              1,
              prose('Every step is the same sum, so collect it up once. With $h = 2$, $h$ times $-0.2$ is $-0.4$:'),
              working('x_{n+1} &= x_n - 0.4(x_n - 20)', '&= x_n - 0.4x_n + 8', '&= 0.6x_n + 8'),
              prose('Then each row is one multiplication and one addition. From $x_0 = 80$:'),
              working('x_1 &= 0.6 \\times 80 + 8 = 56', 'x_2 &= 0.6 \\times 56 + 8 = 41.6'),
              prose('$t = 4$ is two steps of $2$, so $x(4) \\approx 41.6$.'),
            ),
            ask('de-num-model-value'),
            teach(
              prose(
                'Run on, the estimates settle. For the same drink with $h = 1$, $h$ times $-0.2$ is $-0.2$, and the step collects up as',
              ),
              working('x_{n+1} &= x_n - 0.2(x_n - 20)', '&= 0.8x_n + 4'),
              prose('From $x_0 = 45$ the rows, to 2 decimal places, are'),
              working('x_1 &= 40.00', 'x_2 &= 36.00', 'x_3 &= 32.80', 'x_4 &= 30.24'),
              prose(
                'The gap to $20$ is multiplied by $0.8$ each step, so it dies away: the estimates settle on $20.00$, where the rate is zero, as the exact solution does. In the table, type $0.8 \\times$ Ans $+ 4$ into the calculator once, then press $=$ for each row.',
              ),
              prose('A tank model reads the same way. For $\\frac{dx}{dt} = 6 - 0.2x$ at $x = 10$:'),
              working('0.2 \\times 10 &= 2', '\\frac{dx}{dt} &= 6 - 2 = 4'),
            ),
            ask('de-num-model-iterate'),
            ask('de-num-model-tree', 2),
            ask('de-num-model-value+choice', 2),
            teach(
              prose('Too long a step spoils this. For $\\frac{dx}{dt} = -0.5(x - 20)$ with $h = 3$:'),
              working('x_{n+1} &= x_n - 1.5(x_n - 20)', '&= -0.5x_n + 30'),
              prose(
                'From $40$ the estimates run $10$, $25$, $17.5$: the multiplier $-0.5$ flips the gap each step and halves it, so they overshoot $20$ and swing in. With $h = 5$ the multiplier is $-1.5$, and they swing further out each time: $40$, $-10$, $65$.',
              ),
              prose('The multiplier $m$ of $x_n$ decides it:'),
              working('0 < m < 1 &: \\text{close in}', '-1 < m < 0 &: \\text{swing in}', 'm < -1 &: \\text{swing out}'),
            ),
            ask('de-num-model-flow'),
            ask('de-num-model-iterate', 2),
          ],
          skillCheck: [ask('de-num-model-tree', 2), ask('de-num-model-iterate', 2), ask('de-num-model-value', 2)],
        },
        {
          id: 'de-l7-improved',
          title: 'The Improved Euler Method',
          slides: [
            teach(
              prose(
                "Euler takes the gradient at the start of a step and keeps it all the way. The **improved Euler method** averages it with the gradient at the end. That needs $y$ at the end first, so an Euler step predicts it:",
              ),
              working('k_1 &= f(x_r, y_r)', 'k_2 &= f(x_{r+1}, y_r + hk_1)', 'y_{r+1} &= y_r + \\tfrac{h}{2}(k_1 + k_2)'),
              prose('Written as one formula:'),
              working(
                'y_{r+1} &= y_r + \\tfrac{h}{2}\\big[f(x_r, y_r)',
                '&\\quad + f(x_{r+1},',
                '&\\qquad y_r + hf(x_r, y_r))\\big]',
              ),
            ),
            asking(
              'de-num-heun-tree',
              1,
              prose('For $\\frac{dy}{dx} = x + y$ from $(0, 1)$ with $h = 0.2$:'),
              working(
                'k_1 &= f(0, 1) = 1',
                'y_0 + hk_1 &= 1 + 0.2 \\times 1 = 1.2',
                'k_2 &= f(0.2, 1.2) = 1.4',
                'y_1 &= 1 + 0.1(1 + 1.4)',
                '&= 1.24',
              ),
              prose('Euler alone stops at the prediction, $1.2$.'),
            ),
            ask('de-num-heun-tiles'),
            ask('de-num-heun-value'),
            teach(
              prose(
                'Two slips to avoid: $k_2$ is taken at the predicted $y$, not at $y_0$; and the sum of the gradients is multiplied by $\\frac{h}{2}$, not by $h$.',
              ),
              prose('For $\\frac{dy}{dx} = 2x - y$ from $(1, 3)$ with $h = 0.1$:'),
              working(
                'k_1 &= 2 - 3 = -1',
                'y_0 + hk_1 &= 3 - 0.1 = 2.9',
                'k_2 &= 2.2 - 2.9 = -0.7',
                'y_1 &= 3 + 0.05(-1.7)',
                '&= 2.915',
              ),
              prose('Taking $k_2$ at $y_0$ instead would give $f(1.1, 3) = -0.8$.'),
            ),
            ask('de-num-heun-flow'),
            ask('de-num-heun-tree', 2),
            ask('de-num-heun-value+choice', 2),
            teach(
              prose(
                'How much better is it? $\\frac{dy}{dx} = x + y$ from $(0, 1)$ has the exact solution $y = 2e^{x} - x - 1$, as The Integrating Factor finds. At $x = 0.2$:',
              ),
              working('\\text{exact} &= 1.2428\\ldots', '\\text{Euler} &= 1.2', '\\text{improved} &= 1.24'),
              prose(
                'Euler is out by about $0.04$, the improved method by about $0.003$: averaging the two gradients follows the bend of the curve.',
              ),
            ),
            ask('de-num-heun-tiles', 2),
            ask('de-num-heun-flow', 2),
          ],
          skillCheck: [ask('de-num-heun-tree', 2), ask('de-num-heun-value', 2), ask('de-num-heun-flow', 2)],
        },
        {
          id: 'de-l7-midpoint',
          title: 'The Midpoint Formula',
          slides: [
            teach(
              prose(
                'The **midpoint formula** takes its gradient in the middle of a double step: from $y_{r-1}$, across $2h$, with the gradient at $x_r$.',
              ),
              display('y_{r+1} = y_{r-1} + 2h\\,f(x_r, y_r)'),
              prose('It needs two values to begin. $y_0$ is given, and one Euler step finds $y_1$.'),
            ),
            asking(
              'de-num-mid-tree',
              1,
              prose('For $\\frac{dy}{dx} = x + y$ from $(0, 1)$ with $h = 0.2$:'),
              working('f(0, 1) &= 1', 'y_1 &= 1 + 0.2 \\times 1 = 1.2', 'f(0.2, 1.2) &= 1.4', 'y_2 &= 1 + 0.4 \\times 1.4', '&= 1.56'),
            ),
            ask('de-num-mid-tiles'),
            ask('de-num-mid-value'),
            teach(
              prose("Each step after that starts from the row before last. In a table, each row's gradient, then the next $y$:"),
              display(
                '\\begin{array}{c|c|c|c} n & x_n & y_n & f(x_n, y_n) \\\\ \\hline 0 & 0 & 1 & 1 \\\\ 1 & 0.2 & 1.2 & 1.4 \\\\ 2 & 0.4 & 1.56 & 1.96 \\\\ 3 & 0.6 & 1.984 & \\end{array}',
              ),
              working('y_3 &= y_1 + 2h\\,f(x_2, y_2)', '&= 1.2 + 0.4 \\times 1.96', '&= 1.984'),
              prose('The slip is to start from $y_2$: that is an Euler step twice as long.'),
            ),
            ask('de-num-mid-table'),
            ask('de-num-mid-tree', 2),
            ask('de-num-mid-value+choice', 2),
            teach(
              prose('Against the exact $y = 2e^{x} - x - 1$ at $x = 0.4$, with Euler taking two steps of $0.2$:'),
              working('\\text{exact} &= 1.5836\\ldots', '\\text{Euler} &= 1.48', '\\text{midpoint} &= 1.56'),
              prose(
                'Like the improved method, the midpoint formula follows the bend far better than Euler, for one gradient a step.',
              ),
            ),
            ask('de-num-mid-tiles', 2),
            ask('de-num-mid-table', 2),
          ],
          skillCheck: [ask('de-num-mid-tree', 2), ask('de-num-mid-table', 2), ask('de-num-mid-value', 2)],
        },
        {
          id: 'de-l7-second',
          title: 'Second-Order Equations Step by Step',
          slides: [
            teach(
              prose("Euler's method steps a first-order equation. A second-order one becomes two: call the gradient $z$."),
              working('z &= \\frac{dy}{dx}', '\\frac{dz}{dx} &= \\frac{d^2y}{dx^2}'),
              prose('For $\\frac{d^2y}{dx^2} + 3\\frac{dy}{dx} + 2y = x$, write $z$ in and keep $\\frac{dz}{dx}$ on the left:'),
              working('\\frac{dz}{dx} + 3z + 2y &= x', '\\frac{dz}{dx} &= x - 3z - 2y'),
              prose('So the pair is $\\frac{dy}{dx} = z$ and $\\frac{dz}{dx} = x - 3z - 2y$.'),
            ),
            ask('de-num-second-split'),
            teach(
              prose(
                'Step both together, each from the same row: $y$ moves by $h$ times $z$, and $z$ by $h$ times $\\frac{dz}{dx} = f(x, y, z)$.',
              ),
              working('y_{r+1} &= y_r + hz_r', 'z_{r+1} &= z_r + h\\,f(x_r, y_r, z_r)'),
              prose('With $y = 1$ and $\\frac{dy}{dx} = 0$ when $x = 0$, and $h = 0.1$:'),
              working('f(0, 1, 0) &= 0 - 0 - 2 = -2', 'y_1 &= 1 + 0.1 \\times 0 = 1', 'z_1 &= 0 + 0.1 \\times (-2)', '&= -0.2'),
            ),
            asking(
              'de-num-second-tree',
              1,
              prose('The second step starts from row 1:'),
              working(
                '\\frac{dz}{dx} &= f(0.1, 1, -0.2)',
                '&= 0.1 + 0.6 - 2',
                '&= -1.3',
                'y_2 &= 1 + 0.1 \\times (-0.2)',
                '&= 0.98',
                'z_2 &= -0.2 + 0.1 \\times (-1.3)',
                '&= -0.33',
              ),
            ),
            ask('de-num-second-table'),
            ask('de-num-second-value'),
            teach(
              prose('Both steps use row $r$: $y_{r+1}$ takes $z_r$, not the $z_{r+1}$ just found.'),
              prose(
                'If $\\frac{d^2y}{dx^2}$ has a number in front, divide by it first. For $2\\frac{d^2y}{dx^2} + 4\\frac{dy}{dx} + 6y = 2x$:',
              ),
              working('2\\frac{dz}{dx} &= 2x - 4z - 6y', '\\frac{dz}{dx} &= x - 2z - 3y'),
            ),
            ask('de-num-second-split', 2),
            ask('de-num-second-tree', 2),
            ask('de-num-second-value+choice', 2),
            ask('de-num-second-table', 2),
          ],
          skillCheck: [ask('de-num-second-split', 2), ask('de-num-second-tree', 2), ask('de-num-second-table', 2)],
        },
        {
          id: 'de-l7-accuracy',
          title: 'Step Size and Accuracy',
          slides: [
            teach(
              prose(
                'An exact solution shows how good an estimate is. $\\frac{dy}{dx} = y - x^{2} + 2x$ with $y = 0$ when $x = 0$ has $y = x^{2}$, as an integrating factor finds (The Integrating Factor). Putting it back in checks it:',
              ),
              working('\\frac{d}{dx}(x^{2}) &= 2x', 'x^{2} - x^{2} + 2x &= 2x'),
              prose('One step, $h = 0.2$, to $x = 0.2$, where the exact value is $0.04$. Euler gives $0$ and the improved method $0.036$. The error is the estimate minus the exact value:'),
              working('\\text{Euler} &: 0 - 0.04 = -0.04', '\\text{improved} &: 0.036 - 0.04', '&= -0.004'),
              prose('The improved estimate is closer: its error is smaller, ignoring the sign.'),
            ),
            ask('de-num-closer-flow'),
            teach(
              prose('Now halve the step. Euler with $h = 0.1$ takes two steps to $x = 0.2$:'),
              working('y_1 &= 0 + 0.1 \\times 0 = 0', 'f(0.1, 0) &= -0.01 + 0.2', '&= 0.19', 'y_2 &= 0 + 0.1 \\times 0.19', '&= 0.019'),
              prose(
                "Its error is $-0.021$, about half of $-0.04$. The improved method with $h = 0.1$ gives $0.0389475$, an error of about $-0.001$: a quarter of $-0.004$.",
              ),
              working('\\text{Euler: error} &\\propto h', '\\text{improved: error} &\\propto h^2'),
              prose(
                "So an error of $0.8$ becomes about $0.4$ with Euler and about $0.2$ with the improved method. Read it backwards too: errors of $0.8$ then $0.2$ as $h$ halves is a quarter, so the error follows $h^2$.",
              ),
            ),
            ask('de-num-halve-value'),
            ask('de-num-ratio-slider'),
            ask('de-num-order-choice'),
            teach(
              prose('From an estimate and the exact value, the next estimate can be foreseen. The exact $y(1)$ is $7$, and Euler with $h = 0.1$ gives $8.2$:'),
              working('\\text{error} &= 8.2 - 7 = 1.2'),
              prose('Halving $h$ to $0.05$ about halves it:'),
              working('\\text{error} &\\approx 0.6', 'y(1) &\\approx 7 + 0.6 = 7.6'),
              prose(
                "Cutting $h$ to a third divides Euler's error by about $3$ and the improved method's by about $9$. Errors of $0.9$ then $0.1$ as $h$ goes from $0.3$ to $0.1$:",
              ),
              working('\\frac{0.9}{0.1} &= 9 = 3^2'),
              prose('So that error follows $h^2$. The midpoint formula behaves like the improved method.'),
            ),
            ask('de-num-halve-value+choice', 2),
            ask('de-num-closer-flow', 2),
            ask('de-num-ratio-slider', 2),
            ask('de-num-order-choice', 2),
          ],
          skillCheck: [ask('de-num-halve-value', 2), ask('de-num-closer-flow', 2), ask('de-num-order-choice', 2)],
        },
      ],
      levelCheck: [
        ask('de-num-model-iterate', 2),
        ask('de-num-heun-tree', 2),
        ask('de-num-mid-table', 2),
        ask('de-num-second-split', 2),
        ask('de-num-halve-value', 2),
        ask('de-num-model-flow', 2),
        ask('de-num-heun-value', 2),
        ask('de-num-mid-tree', 2),
        ask('de-num-second-value', 2),
        ask('de-num-order-choice', 2),
        ask('de-num-model-value', 2),
        ask('de-num-heun-flow', 2),
        ask('de-num-mid-value', 2),
        ask('de-num-second-table', 2),
        ask('de-num-closer-flow', 2),
      ],
    },
    {
      id: 'de-l8',
      title: 'Families of Solutions',
      lessons: [
        {
          id: 'de-l8-family',
          title: 'A Family of Curves',
          slides: [
            teach(
              prose(
                'Solving $\\frac{dy}{dx} = 2x$ gives $y = x^{2} + C$. That is not one curve but a **family**: one **member** for each value of $C$.',
              ),
              figure({
                xMin: -2.5,
                xMax: 2.5,
                yMin: -3,
                yMax: 9,
                curves: [-2, 0, 2, 4].map((C) => ({ f: (x: number) => x * x + C })),
                verticals: [{ x: 0, dashed: false }],
                label: 'Four parabolas y = x squared + C, each the one below moved up by 2',
              }),
              prose(
                'At $x = 0$, $x^{2} = 0$, so each member crosses the $y$-axis at $y = C$. From $C = 1$ to $C = 4$, every height goes up by $4 - 1 = 3$: $C$ is **added on**, and the curve **moves up** by $3$. From $C = 4$ back to $C = 1$ it moves down by $3$.',
              ),
            ),
            ask('de-fam-read'),
            ask('de-fam-effect'),
            asking(
              'de-fam-equation',
              1,
              prose('Every member satisfies the same equation. Differentiate $y = x^{3} + C$:'),
              working('y &= x^{3} + C', '\\frac{dy}{dx} &= 3x^{2}'),
              prose('$C$ differentiates to $0$, so whichever member you take, $\\frac{dy}{dx} = 3x^{2}$.'),
            ),
            teach(
              prose(
                'In $y = Ae^{x}$ the constant **multiplies**. From $A = 1$ to $A = 3$ every height is multiplied by $3 \\div 1 = 3$: the curve is **stretched** from the $x$-axis, scale factor $3$.',
              ),
              figure({
                xMin: -2,
                xMax: 1.5,
                yMin: -0.5,
                yMax: 10,
                curves: [1, 2, 3].map((A) => ({ f: (x: number) => A * Math.exp(x) })),
                verticals: [{ x: 0, dashed: false }],
                label: 'Three curves y = A e to the x for A = 1, 2 and 3, crossing the y-axis at 1, 2 and 3',
              }),
              prose('At $x = 0$, $e^{0} = 1$, so $y = A$ there: $A$ is still where the member crosses the $y$-axis.'),
            ),
            asking(
              'de-fam-gap-tree',
              1,
              prose('Two members of $y = x^{2} + C$ at $x = 3$:'),
              working('C = 1&: \\; 9 + 1 = 10', 'C = 5&: \\; 9 + 5 = 14'),
              prose('The gap is $14 - 10 = 4$, the change in $C$. Added on, the gap is the same at every $x$.'),
            ),
            asking(
              'de-fam-equation',
              2,
              prose('With a multiplying constant, hide it inside $y$ again. For $y = Ae^{2x}$:'),
              working('\\frac{dy}{dx} &= 2Ae^{2x}', '&= 2y'),
              prose('The same trick for $y = Ax^{2}$ and $y = \\frac{C}{x}$:'),
              working('\\frac{dy}{dx} &= 2Ax = \\frac{2y}{x}', '\\frac{dy}{dx} &= -\\frac{C}{x^{2}} = -\\frac{y}{x}'),
            ),
            ask('de-fam-read', 2),
            teach(
              prose(
                'Multiplying, the gap between two members changes with $x$. For $y = Ax^{2}$, $A = 1$ and $A = 2$ are $9$ and $18$ at $x = 3$, a gap of $9$, but only $1$ and $2$ at $x = 1$.',
              ),
              prose(
                'The family $y = \\frac{C}{x}$ stretches the same way. At $x = 2$, $C = 4$ gives $2$ and $C = 10$ gives $5$: a gap of $3$, and every height times $10 \\div 4$.',
              ),
              figure({
                xMin: 0,
                xMax: 5,
                yMin: -0.5,
                yMax: 6,
                curves: [1, 2, 4].map((C) => ({ f: (x: number) => C / x })),
                label: 'Three curves y = C over x for C = 1, 2 and 4, each further from the axes than the last',
              }),
            ),
            ask('de-fam-effect', 2),
            ask('de-fam-gap-tree', 2),
          ],
          skillCheck: [ask('de-fam-equation', 2), ask('de-fam-effect', 2), ask('de-fam-gap-tree', 2)],
        },
        {
          id: 'de-l8-point',
          title: 'The Curve Through a Point',
          slides: [
            teach(
              prose(
                'A point picks out one member. For the member of $y = x^{2} + C$ through $(2, 7)$, put $x = 2$ and $y = 7$ in and solve for $C$:',
              ),
              working('7 &= 2^{2} + C', '7 &= 4 + C', 'C &= 3'),
              prose(
                'The member through $(2, 7)$ is $y = x^{2} + 3$. With a negative $x$, keep the brackets: through $(-1, 2)$ on $y = 3x + C$, $2 = -3 + C$, so $C = 5$.',
              ),
            ),
            ask('de-fam-point-steps'),
            ask('de-fam-member'),
            asking(
              'de-fam-through',
              1,
              prose(
                'On a graph, that member crosses the $y$-axis at its $C$. Through $(1, 5)$ on $y = 2x + C$: $5 = 2 + C$, so $C = 3$, and it crosses at $3$.',
              ),
            ),
            teach(
              prose('A multiplying constant is found by dividing. Through $(2, 12)$ on $y = Ax^{2}$:'),
              working('12 &= A \\times 2^{2} = 4A', 'A &= 3'),
              prose('Through $(3, 4)$ on $y = \\frac{C}{x}$, multiply instead:'),
              working('4 &= \\frac{C}{3}', 'C &= 12'),
              prose(
                'On $y = Ae^{2x}$, through $(0, 5)$ gives $5 = Ae^{0} = A$. Through $(1, 5e^{2})$ gives $5e^{2} = Ae^{2}$, so $A = 5$ as well.',
              ),
            ),
            ask('de-fam-member+choice', 2),
            ask('de-fam-point-steps', 2),
            asking(
              'de-fam-onpoint',
              1,
              prose(
                'Once the member is known, every other point on it follows. The member of $y = x^{2} + C$ through $(2, 7)$ is $y = x^{2} + 3$. At $x = 3$ it has $y = 9 + 3 = 12$, so $(3, 12)$ is on it too.',
              ),
            ),
            teach(
              prose(
                'Two members of $y = x^{2} + C$ never meet: at any point $C = y - x^{2}$ has just one value. So one point settles the member completely.',
              ),
              prose('Negative $x$ works the same way, minding the sign. Through $(-2, 1)$ on $y = x^{3} + C$:'),
              working('1 &= (-2)^{3} + C', '1 &= -8 + C', 'C &= 9'),
            ),
            ask('de-fam-through', 2),
            ask('de-fam-onpoint', 2),
          ],
          skillCheck: [ask('de-fam-member', 2), ask('de-fam-point-steps', 2), ask('de-fam-onpoint', 2)],
        },
        {
          id: 'de-l8-gradient',
          title: 'The Gradient at a Point',
          slides: [
            teach(
              prose(
                'An equation such as $\\frac{dy}{dx} = x + y$ gives the gradient at any point without being solved. At $(2, 3)$:',
              ),
              working('\\frac{dy}{dx} &= 2 + 3', '&= 5'),
              prose(
                'So the solution curve through $(2, 3)$ has gradient $5$ there. For $\\frac{dy}{dx} = 2xy$ at $(1, -3)$, the gradient is $2 \\times 1 \\times (-3) = -6$.',
              ),
            ),
            ask('de-fam-gradient'),
            asking(
              'de-fam-step-tree',
              1,
              prose(
                'Near the point, the curve runs along a short segment with that gradient. From $(2, 3)$ with gradient $5$, one unit right the segment rises by $5$, to height $3 + 5 = 8$.',
              ),
              prose('For $\\frac{dy}{dx} = 2x - y$ at $(1, 4)$:'),
              working('2x &= 2, \\quad -y = -4', '\\frac{dy}{dx} &= 2 - 4 = -2', 'y &= 4 - 2 = 2'),
            ),
            ask('de-fam-gradient+choice'),
            teach(
              prose('The sign says which way the curve heads: positive is **rising**, negative **falling** and zero **flat**. For $\\frac{dy}{dx} = x - 2y$:'),
              working('(4, 1)&: \\; 4 - 2 = 2', '(1, 3)&: \\; 1 - 6 = -5', '(2, 1)&: \\; 2 - 2 = 0'),
              field({
                xMin: 0,
                xMax: 5,
                yMin: 0,
                yMax: 4,
                f: (x: number, y: number) => x - 2 * y,
                at: [
                  [4, 1],
                  [1, 3],
                  [2, 1],
                ],
                marks: [
                  { x: 4, y: 1 },
                  { x: 1, y: 3 },
                  { x: 2, y: 1 },
                ],
                label: 'Three short segments: rising at (4, 1), falling steeply at (1, 3) and flat at (2, 1)',
              }),
            ),
            ask('de-fam-sign'),
            asking(
              'de-fam-step-tree',
              2,
              prose(
                'To go further, start again from the new point. For $\\frac{dy}{dx} = x + y$ from $(0, 1)$: the gradient is $1$, so one unit right is $(1, 2)$. There the gradient is $1 + 2 = 3$, so the next point is $(2, 5)$.',
              ),
            ),
            asking(
              'de-fam-gradpoint',
              1,
              prose('Going backwards, test each point. Where does $\\frac{dy}{dx} = x + 2y$ give $4$?'),
              working('(2, 1)&: \\; 2 + 2 = 4', '(1, 2)&: \\; 1 + 4 = 5'),
              prose('Only $(2, 1)$ gives $4$.'),
            ),
            teach(
              prose('The right side can be any expression in $x$ and $y$: put the point in the same way. For $\\frac{dy}{dx} = x^{2} - y$ at $(3, 2)$:'),
              working('\\frac{dy}{dx} &= 3^{2} - 2 = 7'),
              prose('For $\\frac{dy}{dx} = \\frac{2y}{x}$ at $(2, 3)$:'),
              working('\\frac{dy}{dx} &= \\frac{2 \\times 3}{2} = 3'),
              prose('A number on the end just adds on: $\\frac{dy}{dx} = x + y - 3$ at $(1, 1)$ gives $1 + 1 - 3 = -1$.'),
            ),
            ask('de-fam-gradpoint', 2),
            ask('de-fam-sign', 2),
          ],
          skillCheck: [ask('de-fam-gradient', 2), ask('de-fam-step-tree', 2), ask('de-fam-sign', 2)],
        },
        {
          id: 'de-l8-field',
          title: 'Direction Fields',
          slides: [
            teach(
              prose('Draw that short segment at every whole point and the picture is a **direction field**. This is the field of $\\frac{dy}{dx} = x$:'),
              field({
                xMin: -3,
                xMax: 3,
                yMin: -2,
                yMax: 2,
                f: (x: number) => x,
                label: 'The direction field of dy/dx = x: segments parallel up each vertical line, rising on the right and falling on the left',
              }),
              prose(
                'Up any vertical line $x$ is fixed, so the segments there are parallel: the gradient depends on $x$ alone. They rise right of the $y$-axis and fall left of it. For $\\frac{dy}{dx} = y$ the same happens along horizontal lines, rising above the $x$-axis.',
              ),
              prose(
                'A minus sign swaps the tilts: $\\frac{dy}{dx} = -x$ falls right of the $y$-axis. And $\\frac{dy}{dx} = x + y$ is flat where $x + y = 0$, along $y = -x$, rising above that line and falling below it.',
              ),
            ),
            ask('de-fam-field'),
            asking(
              'de-fam-gradient',
              1,
              prose(
                'Each segment is the gradient at its point. In the field of $\\frac{dy}{dx} = x + y$, the segment at $(1, 2)$ has gradient $1 + 2 = 3$: steep and rising. In the field of $\\frac{dy}{dx} = 2xy$, the one at $(1, -1)$ has gradient $-2$.',
              ),
            ),
            asking(
              'de-fam-flat',
              1,
              prose('Where the right side is zero, the segments are **flat**. For $\\frac{dy}{dx} = x + y$ on the line $x = 2$:'),
              working('2 + y &= 0', 'y &= -2'),
              prose('For $\\frac{dy}{dx} = 2x - y$ on $x = 1$, $2 - y = 0$, so $y = 2$.'),
            ),
            teach(
              prose('Joining the points where the gradient is the same gives an **isocline**. For $\\frac{dy}{dx} = x + y$ the gradient is $2$ where'),
              working('x + y &= 2', 'y &= -x + 2'),
              field({
                xMin: -3,
                xMax: 3,
                yMin: -2,
                yMax: 2,
                f: (x: number, y: number) => x + y,
                curves: [{ f: (x: number) => 2 - x, dashed: true }],
                label: 'The field of dy/dx = x + y with the dashed line y = -x + 2, along which every segment has the same slope',
              }),
              prose(
                'With $-y$, move $y$ over: $\\frac{dy}{dx} = 3x - y$ is $1$ where $y = 3x - 1$. A square or a number works the same: $\\frac{dy}{dx} = 2x + y - 1$ on $x = 1$ is flat where $y = -1$.',
              ),
            ),
            ask('de-fam-isocline'),
            ask('de-fam-gradient+choice'),
            asking(
              'de-fam-flat',
              2,
              prose('For $\\frac{dy}{dx} = x^{2} - y$ on the line $x = -1$:'),
              working('(-1)^{2} - y &= 0', 'y &= 1'),
            ),
            teach(
              prose(
                'To match a field to its equation, look for where it is flat and which way it tilts. $\\frac{dy}{dx} = x - y$ is flat along $y = x$, and below that line $x > y$, so the segments rise.',
              ),
              prose('$\\frac{dy}{dx} = xy$ is flat along both axes, and rises where $x$ and $y$ have the same sign:'),
              field({
                xMin: -3,
                xMax: 3,
                yMin: -2,
                yMax: 2,
                f: (x: number, y: number) => x * y,
                label: 'The field of dy/dx = xy: flat on both axes, rising top right and bottom left, falling in the other quarters',
              }),
              prose(
                '$\\frac{dy}{dx} = -xy$ tilts the other way in each quarter. $\\frac{dy}{dx} = x^{2}$ is never negative, so its field never falls, and neither does the field of $y^{2}$.',
              ),
            ),
            ask('de-fam-field', 2),
            asking(
              'de-fam-isocline',
              2,
              prose(
                'Isoclines can be curves. For $\\frac{dy}{dx} = xy$ the gradient is $6$ where $xy = 6$, so $y = \\frac{6}{x}$. For $\\frac{dy}{dx} = y - x^{2}$ it is $2$ where $y = x^{2} + 2$.',
              ),
            ),
          ],
          skillCheck: [ask('de-fam-field', 2), ask('de-fam-isocline', 2), ask('de-fam-flat', 2)],
        },
        {
          id: 'de-l8-follow',
          title: 'Following the Field',
          slides: [
            teach(
              prose(
                'A solution curve runs along the field, touching every segment it meets. Where the right side is zero for **every** $x$ at some height, the horizontal line there is a solution in its own right: an **equilibrium solution**.',
              ),
              prose('For $\\frac{dy}{dx} = (y - 1)(y - 3)$, $y = 1$ and $y = 3$ make it zero whatever $x$ is:'),
              field({
                xMin: 0,
                xMax: 4,
                yMin: -1,
                yMax: 5,
                f: (_x: number, y: number) => (y - 1) * (y - 3),
                horizontals: [1, 3],
                height: 240,
                label: 'The field of dy/dx = (y - 1)(y - 3) with dashed lines at y = 1 and y = 3 where every segment is flat',
              }),
              prose(
                'At $y = 2$ the right side is $(1)(-1) = -1$, so between the lines solutions fall. At $y = 0$ it is $(-1)(-3) = 3$, so below $1$ they rise. Either way they close in on $y = 1$. At $y = 4$ it is $(3)(1) = 3$: above $3$ they rise without limit.',
              ),
              prose('A lone factor $y$ counts too: $\\frac{dy}{dx} = y(y - 4)$ is zero at $y = 0$ and $y = 4$.'),
            ),
            ask('de-fam-equilibrium'),
            ask('de-fam-rise'),
            asking(
              'de-fam-level',
              1,
              prose(
                'No solution can cross an equilibrium line. So starting anywhere below $3$, a solution of $\\frac{dy}{dx} = (y - 1)(y - 3)$ levels off at $y = 1$: from below it rises to it, from between the lines it falls to it.',
              ),
            ),
            teach(
              prose('Following the field by hand means stepping along segments: one unit right, and up by the gradient. For $\\frac{dy}{dx} = x + y$ from $(0, 1)$:'),
              working('(0, 1)&: \\; \\text{gradient } 1', '(1, 2)&: \\; \\text{gradient } 3', '(2, 5)&'),
              prose(
                'For $\\frac{dy}{dx} = 2x - y$ at $(1, 4)$, the terms are $2$ and $-4$, the gradient is $-2$, and one unit right the height is $4 - 2 = 2$. Only the sign is needed to say which way: negative, so that solution is falling. For $\\frac{dy}{dx} = xy$ at $(2, 3)$ it is $6$, rising, and at $(0, 3)$ it is $0$, flat.',
              ),
            ),
            ask('de-fam-step-tree'),
            asking(
              'de-fam-equilibrium',
              2,
              prose(
                'Other shapes work the same. $\\frac{dy}{dx} = y^{2} - 4$ is zero at $y = 2$ and $y = -2$, and $\\frac{dy}{dx} = 2y(y - 3)$ at $y = 0$ and $y = 3$.',
              ),
              prose(
                'For $\\frac{dy}{dx} = x(y - 5)$, $y = 5$ is a solution, but $x = 0$ is not: it is a vertical line, not a height.',
              ),
            ),
            ask('de-fam-sign'),
            teach(
              prose(
                'With the second bracket turned round the flow turns round too. $\\frac{dy}{dx} = (y - 1)(3 - y)$ at $y = 2$ is $(1)(1) = 1$, so between the lines solutions rise to $3$. At $y = 4$ it is $(3)(-1) = -3$, so above $3$ they fall back to it.',
              ),
              field({
                xMin: 0,
                xMax: 4,
                yMin: -1,
                yMax: 5,
                f: (_x: number, y: number) => (y - 1) * (3 - y),
                horizontals: [1, 3],
                height: 240,
                label: 'The field of dy/dx = (y - 1)(3 - y): segments point towards y = 3 from both sides and away from y = 1',
              }),
              prose('Now every solution starting above $1$ settles at $y = 3$, and one starting below $1$ falls without limit.'),
            ),
            ask('de-fam-rise', 2),
            ask('de-fam-level', 2),
          ],
          skillCheck: [ask('de-fam-equilibrium', 2), ask('de-fam-rise', 2), ask('de-fam-level', 2)],
        },
      ],
      levelCheck: [
        ask('de-fam-read', 2),
        ask('de-fam-member', 2),
        ask('de-fam-gradient', 2),
        ask('de-fam-field', 2),
        ask('de-fam-equilibrium', 2),
        ask('de-fam-effect', 2),
        ask('de-fam-point-steps', 2),
        ask('de-fam-step-tree', 2),
        ask('de-fam-isocline', 2),
        ask('de-fam-rise', 2),
        ask('de-fam-equation', 2),
        ask('de-fam-through', 2),
        ask('de-fam-sign', 2),
        ask('de-fam-flat', 2),
        ask('de-fam-level', 2),
      ],
    },

    {
      id: 'de-l9',
      title: 'Separable Equations with Harder Integrals',
      lessons: [
        {
          id: 'de-l9-fprime',
          title: 'A Fraction Whose Top Is the Derivative',
          slides: [
            teach(
              prose(
                'Separating sometimes leaves a fraction on the $x$ side. As in Integration, Partial Fractions in Integration: when the top is a number times the derivative of the bottom, the integral is that number times the logarithm of the bottom.',
              ),
              display("\\int \\frac{f'(x)}{f(x)}\\,dx = \\ln|f(x)| + C"),
              prose('In $\\int \\frac{6x}{x^{2} + 4}\\,dx$ the bottom differentiates to $2x$, and $6x$ is $3$ times that:'),
              working('& \\int \\frac{6x}{x^{2} + 4}\\,dx', '& = 3\\ln(x^{2} + 4) + C'),
              prose(
                '$x^{2} + 4$ is always positive, so no modulus is needed. The same works with $e^{x}$: in $\\int \\frac{2e^{x}}{e^{x} + 1}\\,dx$ the bottom differentiates to $e^{x}$, and the top is $2$ times that:',
              ),
              working('& \\int \\frac{2e^{x}}{e^{x} + 1}\\,dx', '& = 2\\ln(e^{x} + 1) + C'),
            ),
            ask('de-hsep-fp-flow'),
            ask('de-hsep-fp-int'),
            ask('de-hsep-fp-int+choice'),
            teach(
              prose('In a differential equation, separate first. For $\\frac{dy}{dx} = \\frac{6xy}{x^{2} + 4}$:'),
              working('\\frac{1}{y}\\,dy &= \\frac{6x}{x^{2} + 4}\\,dx', '\\ln|y| &= 3\\ln(x^{2} + 4) + C'),
              prose('A number times a logarithm is the logarithm of a power:'),
              display('3\\ln(x^{2} + 4) = \\ln(x^{2} + 4)^{3}'),
              prose('so taking $e$ to the power of each side undoes the logarithms. $A$ stands for $\\pm e^{C}$:'),
              working('|y| &= e^{C}(x^{2} + 4)^{3}', 'y &= A(x^{2} + 4)^{3}'),
            ),
            ask('de-hsep-fp-steps'),
            ask('de-hsep-fp-general'),
            ask('de-hsep-fp-flow'),
            teach(
              prose(
                'Harder bottoms work the same way. $e^{2x} + 1$ differentiates to $2e^{2x}$, and $x^{2} + 2x + 5$ to $2x + 2$. Both bottoms are always positive.',
              ),
              prose('A negative multiple gives a negative power. For $\\frac{dy}{dx} = -\\frac{2xy}{x^{2} + 1}$:'),
              working('\\ln|y| &= -\\ln(x^{2} + 1) + C', 'y &= A(x^{2} + 1)^{-1}', 'y &= \\frac{A}{x^{2} + 1}'),
              prose('With $y$ on the bottom of the right side, $y$ goes with $dy$ on top. For $\\frac{dy}{dx} = \\frac{6x}{(x^{2} + 4)y}$:'),
              working('y\\,dy &= \\frac{6x}{x^{2} + 4}\\,dx', '\\tfrac{1}{2}y^{2} &= 3\\ln(x^{2} + 4) + C', 'y^{2} &= 6\\ln(x^{2} + 4) + C'),
            ),
            ask('de-hsep-fp-steps', 2),
            ask('de-hsep-fp-general', 2),
          ],
          skillCheck: [ask('de-hsep-fp-steps', 2), ask('de-hsep-fp-general', 2), ask('de-hsep-fp-int', 2)],
        },
        {
          id: 'de-l9-partial',
          title: 'Partial Fractions',
          slides: [
            teach(
              prose(
                'When the bottom factorises and the top is not a multiple of its derivative, split the fraction first, as in Integration, Partial Fractions in Integration. Cover up one bracket and put in the $x$ that makes it zero:',
              ),
              display('\\frac{5}{(x - 1)(x + 4)} = \\frac{A}{x - 1} + \\frac{B}{x + 4}'),
              prose('$x = 1$ for $A$, and $x = -4$ for $B$:'),
              display('A = \\frac{5}{1 + 4} = 1 \\qquad B = \\frac{5}{-4 - 1} = -1'),
              prose('Each piece integrates to a logarithm. $x - 1$ can be negative, so these keep their modulus:'),
              working('& \\int \\frac{5}{(x - 1)(x + 4)}\\,dx', '& = \\ln|x - 1| - \\ln|x + 4| + C'),
            ),
            ask('de-hsep-pf-cover-tree'),
            ask('de-hsep-pf-flow'),
            teach(
              prose('In an equation, separate, split, then integrate. For $\\frac{dy}{dx} = \\frac{5y}{(x - 1)(x + 4)}$:'),
              working('\\frac{1}{y}\\,dy &= \\frac{5}{(x - 1)(x + 4)}\\,dx'),
              prose('Split it by covering up, as before, then integrate:'),
              display('\\frac{1}{y}\\,dy = \\left(\\frac{1}{x - 1} - \\frac{1}{x + 4}\\right)dx'),
              display('\\ln|y| = \\ln\\left|x - 1\\right| - \\ln\\left|x + 4\\right| + C'),
              prose('Subtracting logarithms divides, so taking $e$ to the power of each side gives'),
              display('y = \\frac{A(x - 1)}{x + 4}'),
              prose('A factor of $x$ works the same way. For $\\frac{dy}{dx} = \\frac{3y}{x(x + 3)}$:'),
              working('\\frac{3}{x(x + 3)} &= \\frac{1}{x} - \\frac{1}{x + 3}', 'y &= \\frac{Ax}{x + 3}'),
            ),
            ask('de-hsep-pf-steps'),
            ask('de-hsep-pf-general'),
            ask('de-hsep-pf-flow'),
            teach(
              prose(
                'A top with an $x$ in it splits the same way, and the constants become powers. For $\\frac{dy}{dx} = \\frac{(3x + 4)y}{x^{2} + 2x}$, factorise the bottom to $x(x + 2)$, then cover up with $x = 0$ and $x = -2$:',
              ),
              display('A = \\frac{4}{2} = 2 \\qquad B = \\frac{-2}{-2} = 1'),
              display('\\ln|y| = 2\\ln|x| + \\ln\\left|x + 2\\right| + C \\qquad y = Ax^{2}(x + 2)'),
              prose('A negative constant puts its bracket on the bottom. From $\\ln|y| = \\ln\\left|x - 1\\right| - 2\\ln\\left|x + 3\\right| + C$:'),
              display('y = \\frac{A(x - 1)}{(x + 3)^{2}}'),
            ),
            ask('de-hsep-pf-cover-tree', 2),
            ask('de-hsep-pf-steps', 2),
            ask('de-hsep-pf-general', 2),
          ],
          skillCheck: [ask('de-hsep-pf-steps', 2), ask('de-hsep-pf-cover-tree', 2), ask('de-hsep-pf-general', 2)],
        },
        {
          id: 'de-l9-trig',
          title: 'Trigonometric Integrals',
          slides: [
            teach(
              prose(
                'Two trigonometric integrals come up again and again. $\\tan x$ differentiates to $\\sec^{2} x$, so $\\sec^{2}$ integrates to $\\tan$. With $2x$ inside, divide by the $2$ the chain rule brings out:',
              ),
              working('\\int 6\\sec^{2} 2x\\,dx &= 3\\tan 2x + C'),
              prose('And $\\tan x$ is a fraction whose top is minus the derivative of its bottom:'),
              working('& \\int \\tan x\\,dx = \\int \\frac{\\sin x}{\\cos x}\\,dx', '& = -\\ln|\\cos x| + C', '& = \\ln|\\sec x| + C'),
              prose(
                'In the same way $\\cot x = \\frac{\\cos x}{\\sin x}$ integrates to $\\ln|\\sin x|$. In $\\int 6\\tan 2x\\,dx$ the bottom, $\\cos 2x$, differentiates to $-2\\sin 2x$:',
              ),
              display('\\int 6\\tan 2x\\,dx = 3\\ln|\\sec 2x| + C'),
            ),
            ask('de-hsep-trig-flow'),
            ask('de-hsep-trig-int'),
            ask('de-hsep-trig-int+choice'),
            teach(
              prose('In an equation, for $\\frac{dy}{dx} = 3y\\tan x$:'),
              working('\\frac{1}{y}\\,dy &= 3\\tan x\\,dx', '\\ln|y| &= 3\\ln|\\sec x| + C', 'y &= A\\sec^{3} x'),
              prose('and for $\\frac{dy}{dx} = 4y\\sec^{2} 2x$:'),
              working('\\ln|y| &= 2\\tan 2x + C', 'y &= Ae^{2\\tan 2x}'),
              prose('A $\\cot$ gives a power of $\\sin$. For $\\frac{dy}{dx} = 2y\\cot x$:'),
              working('\\ln|y| &= 2\\ln|\\sin x| + C', 'y &= A\\sin^{2} x'),
            ),
            ask('de-hsep-trig-steps'),
            ask('de-hsep-trig-general'),
            ask('de-hsep-trig-flow'),
            teach(
              prose('A negative multiple of $\\ln|\\sec x|$ is a power of $\\cos x$, since $\\sec x = \\frac{1}{\\cos x}$. For $\\frac{dy}{dx} = -2y\\tan x$:'),
              working('\\ln|y| &= -2\\ln|\\sec x| + C', 'y &= A\\cos^{2} x'),
              prose('Dividing by $\\cos^{2} y$ gives $\\sec^{2} y$, which integrates to $\\tan y$. For $\\frac{dy}{dx} = 2x\\cos^{2} y$:'),
              working('\\sec^{2} y\\,dy &= 2x\\,dx', '\\tan y &= x^{2} + C', 'y &= \\arctan(x^{2} + C)'),
              prose('With $y$ on the bottom, $y\\,dy$ integrates to $\\tfrac{1}{2}y^{2}$. For $\\frac{dy}{dx} = \\frac{2\\sec^{2} x}{y}$:'),
              working('\\tfrac{1}{2}y^{2} &= 2\\tan x + C', 'y^{2} &= 4\\tan x + C'),
            ),
            ask('de-hsep-trig-steps', 2),
            ask('de-hsep-trig-general', 2),
          ],
          skillCheck: [ask('de-hsep-trig-steps', 2), ask('de-hsep-trig-general', 2), ask('de-hsep-trig-int', 2)],
        },
        {
          id: 'de-l9-subparts',
          title: 'Substitution and Parts',
          slides: [
            teach(
              prose(
                'When the $x$ side is a function of an inside times the derivative of that inside, substitute, as in Integration, Techniques of Integration. For $\\int 8x(x^{2} + 1)^{3}\\,dx$, let $u = x^{2} + 1$, so $du = 2x\\,dx$:',
              ),
              working('& \\int 8x(x^{2} + 1)^{3}\\,dx', '& = \\int 4u^{3}\\,du', '& = u^{4} + C', '& = (x^{2} + 1)^{4} + C'),
              prose('With $u = x^{2}$, $\\int 2xe^{x^{2}}\\,dx = e^{x^{2}} + C$. With $u = \\cos x$, $du = -\\sin x\\,dx$:'),
              working('& \\int 3\\sin x\\cos^{2} x\\,dx', '& = \\int -3u^{2}\\,du', '& = -\\cos^{3} x + C'),
            ),
            ask('de-hsep-sub-int'),
            ask('de-hsep-sub-int+choice'),
            teach(
              prose('When it is $x$ times $e^{x}$, $\\sin x$ or $\\cos x$, integrate by parts with $u = x$:'),
              display('\\int u\\frac{dv}{dx}\\,dx = uv - \\int v\\frac{du}{dx}\\,dx'),
              working('& \\int xe^{x}\\,dx = xe^{x} - \\int e^{x}\\,dx', '& = xe^{x} - e^{x} + C'),
              prose('Likewise, and with $v = -e^{-x}$ for $e^{-x}$:'),
              working(
                '& \\int x\\cos x\\,dx',
                '& \\quad = x\\sin x + \\cos x + C',
                '& \\int x\\sin x\\,dx',
                '& \\quad = -x\\cos x + \\sin x + C',
                '& \\int xe^{-x}\\,dx',
                '& \\quad = -xe^{-x} - e^{-x} + C',
              ),
              prose(
                'So a fraction whose bottom factorises means partial fractions, an inside with its derivative beside it means substitution, and $x$ times one of these means parts.',
              ),
            ),
            ask('de-hsep-parts-int'),
            ask('de-hsep-which'),
            ask('de-hsep-parts-int', 2),
            teach(
              prose('In an equation the $y$ side decides the last step. For $\\frac{dy}{dx} = \\frac{x\\cos x}{y}$:'),
              working('y\\,dy &= x\\cos x\\,dx', '\\tfrac{1}{2}y^{2} &= x\\sin x + \\cos x + C', 'y^{2} &= 2x\\sin x + 2\\cos x + C'),
              prose('For $\\frac{dy}{dx} = \\frac{xe^{x}}{e^{y}}$, multiply by $e^{y}$, then take $\\ln$:'),
              working('e^{y}\\,dy &= xe^{x}\\,dx', 'e^{y} &= xe^{x} - e^{x} + C', 'y &= \\ln(xe^{x} - e^{x} + C)'),
              prose('And for $\\frac{dy}{dx} = xye^{x}$:'),
              working('\\ln|y| &= xe^{x} - e^{x} + C', 'y &= Ae^{xe^{x} - e^{x}}'),
            ),
            ask('de-hsep-sp-steps'),
            ask('de-hsep-which', 2),
            ask('de-hsep-sp-steps', 2),
          ],
          skillCheck: [ask('de-hsep-sub-int', 2), ask('de-hsep-parts-int', 2), ask('de-hsep-sp-steps', 2)],
        },
        {
          id: 'de-l9-particular',
          title: 'Particular Solutions with Harder Integrals',
          slides: [
            teach(
              prose(
                'A condition fixes the constant, as in Differential Equations Basics, First-Order by Separation. For $\\frac{dy}{dx} = \\frac{4xy}{x^{2} + 1}$ with $y(1) = 12$:',
              ),
              working('y &= A(x^{2} + 1)^{2}', '12 &= A \\times 2^{2}', 'A &= 3'),
              prose('So the particular solution is $y = 3(x^{2} + 1)^{2}$. Then'),
              working('y(2) &= 3 \\times 5^{2} = 75', 'y(0) &= 3 \\times 1^{2} = 3'),
              prose('and $y(0)$ is where it crosses the $y$-axis.'),
            ),
            ask('de-hsep-through-tree'),
            ask('de-hsep-slider'),
            teach(
              prose('The same works whatever the integral was. For $\\frac{dy}{dx} = \\frac{5y}{(x - 1)(x + 4)}$ with $y(6) = 10$:'),
              working('y &= \\frac{A(x - 1)}{x + 4}', '10 &= \\frac{5A}{10}, \\quad A = 20', 'y(16) &= \\frac{20 \\times 15}{20} = 15'),
              prose(
                'For $\\frac{dy}{dx} = y\\tan x$, $y = A\\sec x$, with $\\sec 0 = 1$ and $\\sec\\frac{\\pi}{3} = 2$. If $y(0) = 5$, then $A = 5$, so $y(\\frac{\\pi}{3}) = 10$. With $\\sec^{2} x$ it would be $5 \\times 2^{2} = 20$.',
              ),
              prose('A reciprocal works too. For $\\frac{dy}{dx} = -\\frac{2xy}{x^{2} + 1}$ with $y(1) = 6$:'),
              working('y &= \\frac{A}{x^{2} + 1}', '6 &= \\frac{A}{2}, \\quad A = 12', 'y(0) &= 12'),
            ),
            ask('de-hsep-value'),
            ask('de-hsep-ivp-steps'),
            ask('de-hsep-slider', 2),
            teach(
              prose('A solution left as $y^{2}$ takes its condition the same way, for $C$. For $\\frac{dy}{dx} = \\frac{4x(x^{2} + 2)}{y}$ with $y(0) = 5$:'),
              working('y^{2} &= 2(x^{2} + 2)^{2} + C', '25 &= 8 + C, \\quad C = 17', 'y^{2} &= 2(x^{2} + 2)^{2} + 17'),
              prose(
                'For $\\frac{dy}{dx} = 2y\\cot x$, $y = A\\sin^{2} x$. With $y(\\frac{\\pi}{2}) = 8$, $A = 8$, and since $\\sin\\frac{\\pi}{6} = \\frac{1}{2}$, $y(\\frac{\\pi}{6}) = 8 \\times \\frac{1}{4} = 2$.',
              ),
              prose('A bottom of $e^{x} + 2$ is easy at $x = \\ln 4$, since $e^{\\ln 4} = 4$. With $y = 3(e^{x} + 2)^{2}$:'),
              working('y(\\ln 4) &= 3 \\times 6^{2} = 108'),
            ),
            ask('de-hsep-ivp-steps', 2),
            ask('de-hsep-value+choice', 2),
            ask('de-hsep-through-tree', 2),
          ],
          skillCheck: [ask('de-hsep-through-tree', 2), ask('de-hsep-value', 2), ask('de-hsep-ivp-steps', 2)],
        },
      ],
      levelCheck: [
        ask('de-hsep-fp-steps', 2),
        ask('de-hsep-pf-cover-tree', 2),
        ask('de-hsep-trig-int', 2),
        ask('de-hsep-sp-steps', 2),
        ask('de-hsep-through-tree', 2),
        ask('de-hsep-fp-general', 2),
        ask('de-hsep-pf-steps', 2),
        ask('de-hsep-trig-general', 2),
        ask('de-hsep-sub-int', 2),
        ask('de-hsep-value', 2),
        ask('de-hsep-fp-int', 2),
        ask('de-hsep-pf-general', 2),
        ask('de-hsep-trig-steps', 2),
        ask('de-hsep-parts-int', 2),
        ask('de-hsep-which', 2),
      ],
    },

    {
      id: 'de-l10',
      title: 'Models of Populations and Money',
      lessons: [
        {
          id: 'de-l10-interest',
          title: 'Continuous Interest',
          slides: [
            teach(
              prose(
                'Interest **compounded continuously** is added all the time, in proportion to the balance. At 5% a year the balance $A$ grows at $0.05$ of itself a year:',
              ),
              display('\\frac{dA}{dt} = 0.05A'),
              prose('This is growth, $\\frac{dy}{dt} = ky$, so the solution is the start value times $e^{kt}$. With £2,000 to start:'),
              display('A = 2000e^{0.05t}'),
              prose('A value that falls continuously has a negative rate. A car bought for £12,000 that loses 15% of its value a year has'),
              working('\\frac{dV}{dt} &= -0.15V', 'V &= 12000e^{-0.15t}'),
            ),
            ask('de-model-interest-tiles'),
            asking(
              'de-model-yearly',
              1,
              prose(
                'Banks often add interest once a year instead. At 5% a year that multiplies the balance by $1.05$ each year, so after $t$ years it is $1.05^{t}$ times the start.',
              ),
              prose('The continuous rate $k = \\ln 1.05$ gives exactly that, because $e^{t\\ln a} = a^{t}$. With £2,000 to start:'),
              working('\\frac{dA}{dt} &= (\\ln 1.05)A', 'A &= 2000e^{t\\ln 1.05}', '&= 2000 \\times 1.05^{t}', 'A(1) &= 2100', 'A(2) &= 2205'),
              prose('A continuous rate of $0.05$ does a little better: $e^{0.05}$ is about $1.0513$, a gain of about 5.13% a year.'),
            ),
            ask('de-model-yearly+choice', 2),
            teach(
              prose('A rate written as a logarithm keeps the numbers whole. With $k = \\frac{\\ln 2}{8}$,'),
              display('e^{kt} = e^{(t/8)\\ln 2} = 2^{t/8}'),
              prose('so the balance doubles every 8 years. £1,500 invested this way has doubled 3 times after 24 years:'),
              working('2^{3} &= 8', 'A(24) &= 1500 \\times 8', '&= 12000'),
              prose('In the same way $k = \\frac{\\ln 3}{h}$ triples the balance every $h$ years.'),
            ),
            ask('de-model-double-tree'),
            ask('de-model-interest-tiles', 2),
            ask('de-model-double-tree', 2),
            teach(
              prose(
                'To find **when** a level is reached, count the doublings. £500 doubling every 6 years reaches £4,000 once it is 8 times bigger:',
              ),
              working('4000 \\div 500 &= 8 = 2^{3}', 't &= 3 \\times 6 = 18'),
              prose(
                'A value that halves works the same way. A van bought for £16,000 with $\\frac{dV}{dt} = -\\frac{\\ln 2}{4}V$ halves every 4 years, so it is worth £4,000 after two halvings, at $t = 8$.',
              ),
            ),
            ask('de-model-reach-slider'),
            ask('de-model-reach-slider', 2),
          ],
          skillCheck: [ask('de-model-interest-tiles', 2), ask('de-model-double-tree', 2), ask('de-model-reach-slider', 2)],
        },
        {
          id: 'de-l10-saving',
          title: 'Saving and Spending',
          slides: [
            teach(
              prose(
                'Money paid in or taken out changes a balance as well as interest. Spread evenly through the year, it adds a constant to the rate. At 4% with £1,200 a year paid in:',
              ),
              display('\\frac{dA}{dt} = 0.04A + 1200'),
              prose('At 5% with £3,000 a year taken out:'),
              display('\\frac{dA}{dt} = 0.05A - 3000'),
              prose('Both at once add up: £3,000 a year in and £1,000 a year out is $+2000$.'),
            ),
            ask('de-model-save-tiles'),
            asking(
              'de-model-save-level',
              1,
              prose('A balance stays **level** when it is not changing, so the rate is zero. For $\\frac{dA}{dt} = 0.05A - 3000$:'),
              working('0.05A - 3000 &= 0', '0.05A &= 3000', 'A &= 60000'),
              prose('The interest on £60,000 is exactly the £3,000 taken out each year, so a fund that size can pay it out forever.'),
            ),
            ask('de-model-save-tiles', 2),
            teach(
              prose('Any other start moves away from that level. For $\\frac{dA}{dt} = 0.05A - 3000$ starting at £50,000:'),
              working('0.05 \\times 50000 - 3000 &= -500'),
              prose(
                'The rate is negative, so the balance falls. A smaller balance earns less interest, so it falls faster and faster until the fund **runs out**.',
              ),
              prose(
                'From £70,000 the rate is $+500$: the balance grows, earns more, and grows faster and faster. Only a start of exactly £60,000 stays level. The level is **unstable**, as in Long-Term Behaviour.',
              ),
            ),
            ask('de-model-save-flow'),
            ask('de-model-save-level+choice', 2),
            ask('de-model-save-flow', 2),
            teach(
              prose('To solve, take out the rate first: $3000 \\div 0.05 = 60000$. Then separate and integrate:'),
              display('\\frac{dA}{dt} = 0.05(A - 60000)'),
              working('\\ln|A - 60000| &= 0.05t + C', 'A - 60000 &= Be^{0.05t}'),
              prose('The constant is called $B$, since $A$ is the balance. Starting at £50,000, $B = 50000 - 60000 = -10000$:'),
              display('A = 60000 - 10000e^{0.05t}'),
            ),
            ask('de-model-save-steps'),
            ask('de-model-save-steps', 2),
          ],
          skillCheck: [ask('de-model-save-tiles', 2), ask('de-model-save-level', 2), ask('de-model-save-steps', 2)],
        },
        {
          id: 'de-l10-harvest',
          title: 'Harvesting a Population',
          slides: [
            teach(
              prose('Left alone, a population grows at a rate proportional to its size. Fish in a lake growing at 20% a year have'),
              display('\\frac{dP}{dt} = 0.2P'),
              prose('Catching 300 fish a year, spread through the year, takes a constant off the rate:'),
              display('\\frac{dP}{dt} = 0.2P - 300'),
              prose('Fish added from a hatchery count the other way: 300 caught and 100 released a year is $-200$.'),
            ),
            ask('de-model-harvest-tiles'),
            asking(
              'de-model-harvest-level',
              1,
              prose('The population stays the same size where the rate is zero, when growth exactly replaces the catch:'),
              working('0.2P - 300 &= 0', '0.2P &= 300', 'P &= 1500'),
            ),
            ask('de-model-harvest-tiles', 2),
            teach(
              prose('As with a fund paying out, any other start moves away from that level. Starting with 1200 fish:'),
              working('0.2 \\times 1200 - 300 &= -60'),
              prose(
                'The rate is negative, so the population shrinks. Fewer fish breed fewer, so it shrinks faster and faster until it **dies out**.',
              ),
              prose('From 1800 fish the rate is $+60$, and it grows faster and faster. Only a start of exactly $1500$ stays the same size.'),
            ),
            ask('de-model-harvest-flow'),
            ask('de-model-harvest-level+choice', 2),
            ask('de-model-harvest-flow', 2),
            teach(
              prose('A lake of 2000 fish growing at $\\frac{dP}{dt} = 0.2P$ gains $0.2 \\times 2000 = 400$ fish a year.'),
              prose(
                'Catch more than 400 a year and the rate is negative from the start, so the population shrinks and dies out. The largest catch it can bear without falling is 400 a year.',
              ),
              prose('Turned round: to supply 400 fish a year, the lake needs at least'),
              working('0.2P &= 400', 'P &= 400 \\div 0.2 = 2000'),
            ),
            ask('de-model-harvest-max'),
            ask('de-model-harvest-max', 2),
          ],
          skillCheck: [ask('de-model-harvest-tiles', 2), ask('de-model-harvest-flow', 2), ask('de-model-harvest-max', 2)],
        },
        {
          id: 'de-l10-drug',
          title: 'A Drug in the Bloodstream',
          slides: [
            teach(
              prose('The body removes a drug at a rate proportional to the amount in the blood. With $C$ mg left after $t$ hours,'),
              display('\\frac{dC}{dt} = -kC \\qquad C = C_{0}e^{-kt}'),
              prose(
                'The **half-life** is the time it takes to halve. A half-life of 3 hours means $k = \\frac{\\ln 2}{3}$, and then $e^{-kt} = 2^{-t/3}$.',
              ),
              prose('From 80 mg, after 9 hours it has halved 3 times:'),
              working('2^{3} &= 8', 'C(9) &= 80 \\div 8 = 10'),
            ),
            ask('de-model-halve-tree'),
            asking(
              'de-model-dose-when',
              1,
              prose('To find when it falls to a level, count the halvings. With a half-life of 4 hours, 160 mg is down to 20 mg when'),
              working('160 \\div 20 &= 8 = 2^{3}', 't &= 3 \\times 4 = 12'),
            ),
            ask('de-model-halve-tree', 2),
            teach(
              prose('Two readings give the half-life. 120 mg falls to 30 mg in 10 hours:'),
              working('120 \\div 30 &= 4 = 2^{2}', 'h &= 10 \\div 2 = 5', 'k &= \\frac{\\ln 2}{5}'),
              prose('Two halvings in 10 hours is one every 5 hours.'),
            ),
            ask('de-model-halflife-tree'),
            ask('de-model-dose-when+choice', 2),
            ask('de-model-halflife-tree', 2),
            teach(
              prose(
                'A second dose adds on top of what is left, and then the whole amount halves as before. Take 80 mg with a half-life of 4 hours, and another 80 mg at $t = 4$:',
              ),
              working('C(4) &= 80 \\div 2 = 40', '40 + 80 &= 120', 'C(8) &= 120 \\div 2 = 60'),
              figure({
                xMin: 0,
                xMax: 12,
                yMin: -5,
                yMax: 130,
                curves: [{ f: (t: number) => (t < 4 ? 80 * 2 ** (-t / 4) : 120 * 2 ** (-(t - 4) / 4)) }],
                label: 'A curve falling from 80 to 40, jumping up to 120 at the second dose, then falling again',
              }),
            ),
            ask('de-model-dose-slider'),
            ask('de-model-dose-slider', 2),
          ],
          skillCheck: [ask('de-model-halve-tree', 2), ask('de-model-halflife-tree', 2), ask('de-model-dose-slider', 2)],
        },
        {
          id: 'de-l10-drip',
          title: 'A Steady Drip',
          slides: [
            teach(
              prose(
                'A drip puts 12 mg of a drug into the blood an hour, and the body removes 20% of what is there an hour. In at a steady rate, out in proportion:',
              ),
              display('\\frac{dC}{dt} = 12 - 0.2C'),
              prose('Taking out the $0.2$ shows the level it heads for, since $12 \\div 0.2 = 60$:'),
              display('\\frac{dC}{dt} = 0.2(60 - C)'),
            ),
            ask('de-model-drip-tiles'),
            asking(
              'de-model-drip-level',
              1,
              prose('It settles where it stops changing, when what goes out balances what comes in:'),
              working('12 - 0.2C &= 0', '0.2C &= 12', 'C &= 60'),
              prose('Above $60$ more goes out than comes in, and below it less, so every start settles at $60$. This level is **stable**.'),
            ),
            ask('de-model-drip-tiles', 2),
            teach(
              prose(
                'Solve from the factored form. $\\frac{1}{60 - C}$ integrates to $-\\ln|60 - C|$, and the constant is $K$, since $C$ is taken:',
              ),
              working('-\\ln|60 - C| &= 0.2t + K', '60 - C &= Ae^{-0.2t}'),
              prose('Starting from $C(0) = 0$, $A = 60$:'),
              display('C = 60 - 60e^{-0.2t}'),
              prose('Starting from $C(0) = 100$ instead, $A = 60 - 100 = -40$:'),
              display('C = 60 + 40e^{-0.2t}'),
            ),
            ask('de-model-drip-steps'),
            ask('de-model-drip-level+choice', 2),
            ask('de-model-drip-steps', 2),
            teach(
              prose(
                'With $k = \\frac{\\ln 2}{h}$ the gap to the level halves every $h$ hours. For $\\frac{dC}{dt} = \\frac{\\ln 2}{3}(80 - C)$ from $C(0) = 0$, the gap starts at $80$:',
              ),
              working('C(3) &= 80 - 40 = 40', 'C(6) &= 80 - 20 = 60'),
              figure({
                xMin: 0,
                xMax: 12,
                yMin: -4,
                yMax: 90,
                curves: [{ f: (t: number) => 80 - 80 * 2 ** (-t / 3) }],
                horizontals: [80],
                label: 'A curve rising from 0 and levelling off under a dashed line at 80',
              }),
              prose('From above, the gap above the level halves the same way: from $C(0) = 120$, $C(3) = 80 + 20 = 100$.'),
            ),
            ask('de-model-drip-slider'),
            ask('de-model-drip-slider', 2),
          ],
          skillCheck: [ask('de-model-drip-tiles', 2), ask('de-model-drip-steps', 2), ask('de-model-drip-slider', 2)],
        },
      ],
      levelCheck: [
        ask('de-model-interest-tiles', 2),
        ask('de-model-save-level', 2),
        ask('de-model-harvest-flow', 2),
        ask('de-model-halflife-tree', 2),
        ask('de-model-drip-slider', 2),
        ask('de-model-double-tree', 2),
        ask('de-model-save-steps', 2),
        ask('de-model-harvest-tiles', 2),
        ask('de-model-dose-when', 2),
        ask('de-model-drip-steps', 2),
        ask('de-model-yearly', 2),
        ask('de-model-save-flow', 2),
        ask('de-model-harvest-max', 2),
        ask('de-model-dose-slider', 2),
        ask('de-model-drip-level', 2),
      ],
    },
  ],
};
