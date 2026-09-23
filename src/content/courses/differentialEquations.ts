/**
 * Differential Equations.
 *
 * An equation for a rate, and the function that has that rate. Level 1 forms
 * a first-order equation from words and solves it by separating the
 * variables: one constant in the general solution, a condition to fix it, and
 * growth and decay as `dy/dt = ky`. Level 2 models with them: Newton's
 * cooling, growth towards a limit, mixing tanks, what happens in the long
 * run, and checking a solution by putting it back in.
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

const figure = (options: Parameters<typeof plotSvg>[0]): Block => ({ kind: 'diagram', svg: plotSvg(options) });

export const differentialEquations: Course = {
  id: 'differential-equations',
  category: 'advanced-maths',
  // After Integration (30), Vectors (40) and Matrices (50) — and Exponential Models, whose model it solves for.
  position: 70,
  title: 'Differential Equations',
  blurb: 'Equations for a rate: forming them, separating the variables, and modelling cooling, limits and mixing.',
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
            ask('de-form-tiles'),
            ask('de-form-rate'),
            ask('de-form-flow'),
            teach(
              prose(
                'Take $k$ to be positive and put the direction in the sign. Something **decreasing** at a rate proportional to $\\sqrt{V}$ is',
              ),
              display('\\frac{dV}{dt} = -k\\sqrt{V}'),
              prose(
                'Read the other way: if $V > 0$ and $\\frac{dV}{dt} = k\\sqrt{V}$ is decreasing, then $k$ itself must be negative.',
              ),
            ),
            ask('de-form-sign'),
            ask('de-form-tiles', 2),
            ask('de-form-rate+choice', 2),
            teach(
              prose(
                '"Inversely proportional" divides instead: $\\frac{dh}{dt} = \\frac{k}{h}$. A rate proportional to the time passed is $kt$.',
              ),
              prose(
                'When the rate depends on a gap to a level, the sign of the bracket matters too. Above $20$, $y - 20$ is positive; below it, negative.',
              ),
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
              prose('Finally, tidy up: here, take $e$ to the power of each side to get $y$ on its own.'),
            ),
            ask('de-sep-steps'),
            ask('de-sep-tiles', 2),
            ask('de-sep-which', 2),
            teach(
              prose('Some separable equations are in disguise. Factorise, or use the laws of indices:'),
              working('xy + 3y &= y(x + 3)', 'e^{x + y} &= e^{x}e^{y}'),
              prose('A sum like $x + y$ has no such split, so it cannot be separated.'),
            ),
            ask('de-sep-steps', 2),
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
            ask('de-general-tiles', 2),
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
            ask('de-particular-tree'),
            ask('de-particular-value'),
            teach(
              prose('A rate written as a logarithm keeps the numbers whole. With $k = \\frac{\\ln 2}{3}$,'),
              display('e^{kt} = e^{\\frac{t}{3}\\ln 2} = 2^{\\frac{t}{3}}'),
              prose(
                'so $y$ doubles every $3$ units of time. If $y(6) = 20$, then going back two doublings, $A = 20 \\div 4 = 5$.',
              ),
            ),
            ask('de-particular-slider'),
            ask('de-general-implicit', 2),
            ask('de-particular-value+choice', 2),
            teach(
              prose('For a solution left as a power of $y$, find the constant before rearranging:'),
              working('y^{2} &= x^{2} + C, \\quad y(4) = 5', '25 &= 16 + C', 'C &= 9'),
              prose('Then $y = \\sqrt{x^{2} + 9}$, taking the positive root when $y > 0$.'),
            ),
            ask('de-general-tiles', 2),
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
              working('\\frac{dP}{dt} &= 0.04P, \\quad P(0) = 500', '\\ln P &= 0.04t + C', 'P &= 500e^{0.04t}'),
              prose('The start value is $A$, and the constant in the equation is the $k$ in the power.'),
            ),
            ask('de-growth-steps'),
            ask('de-growth-solution'),
            ask('de-growth-match'),
            teach(
              prose(
                'A rate "equal to 4% of its size" is $0.04$ times the size. For something falling, $k$ is negative: a mass decaying at 6% of itself a year has',
              ),
              display('\\frac{dM}{dt} = -0.06M'),
            ),
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
            ask('de-general-tiles', 2),
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
            ask('de-cool-steps'),
            ask('de-cool-value'),
            teach(
              prose('Separating and integrating gives the room temperature plus a gap that decays:'),
              working('\\ln|T - 20| &= -kt + C', 'T - 20 &= Ae^{-kt}', 'T &= 20 + 70e^{-kt}'),
              prose('for tea that starts at $90$°C. This is the model in Exponential Models\' "Models with a Limit", found from its equation.'),
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
            ask('de-general-tiles', 2),
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
            ask('de-limit-steps'),
            teach(
              prose('Integrating $\\frac{1}{100 - W}$ gives $-\\ln|100 - W|$: the inside differentiates to $-1$. Then'),
              working('-\\ln|100 - W| &= kt + C', '100 - W &= Ae^{-kt}', 'W &= 100 - Ae^{-kt}'),
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
            ask('de-limit-slider'),
            ask('de-limit-steps', 2),
            ask('de-limit-tiles', 2),
            teach(
              prose(
                'With $k = \\frac{\\ln 2}{h}$ the gap to the limit halves every $h$ units of time. Starting $80$ short of it, the gap is $40$, then $20$, then $10$.',
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
            ),
            ask('de-mix-tiles'),
            ask('de-mix-tree'),
            ask('de-mix-limit'),
            teach(
              prose(
                'Out: the tank is well mixed, so each litre leaving carries the tank\'s own concentration, $\\frac{S}{V}$ g. From a $200$ litre tank at $4$ litres a minute,',
              ),
              display('\\text{rate out} = 4 \\times \\frac{S}{200} = \\frac{S}{50}'),
              prose('so $\\frac{dS}{dt} = 12 - \\frac{S}{50}$.'),
            ),
            ask('de-mix-when'),
            ask('de-mix-tiles', 2),
            ask('de-mix-tree', 2),
            teach(
              prose('In the long run the salt stops changing, so the rates balance:'),
              working('12 - \\tfrac{S}{50} &= 0', 'S &= 600'),
              prose('That is $3$ g a litre in all $200$ litres: the tank ends up as salty as what flows in, whatever it started with.'),
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
            ask('de-long-equilibrium'),
            ask('de-long-slider'),
            ask('de-long-flow'),
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
            ask('de-long-flow', 2),
            ask('de-long-equilibrium', 2),
            ask('de-long-slider', 2),
            teach(
              prose(
                "Every model in this level has a stable level: the room for Newton's cooling, the limit for growth towards a limit, and the balance of rates for a mixing tank.",
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
            ask('de-verify-tree'),
            ask('de-verify-which'),
            teach(
              prose(
                'Numbers at one value of $x$ can rule a candidate out: if the two sides differ there, it is not a solution. Agreeing at one point proves nothing on its own.',
              ),
              prose('A candidate with an unknown in it can be made to work: choose the unknown so the two sides match term by term.'),
            ),
            ask('de-verify-constant'),
            ask('de-limit-steps', 2),
            ask('de-mix-tree', 2),
            teach(
              prose(
                'For $\\frac{dy}{dx} = 2(y - 5)$, try $y = Ae^{2x} + c$. The left side is $2Ae^{2x}$ and the right side is $2Ae^{2x} + 2c - 10$, so $c = 5$ and any $A$ works: that is the general solution.',
              ),
            ),
            ask('de-verify-which', 2),
            ask('de-verify-constant', 2),
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
  ],
};
