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
  blurb: 'Equations for a rate: forming them, separating the variables, modelling cooling, limits and mixing, the integrating factor, and second-order equations.',
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
              prose('Integrating $\\frac{1}{100 - W}$ gives $-\\ln|100 - W|$: the inside differentiates to $-1$. Multiplying through by $-1$, and letting the constant absorb the sign,'),
              working('\\ln|100 - W| &= -kt + C', '100 - W &= Ae^{-kt}', 'W &= 100 - Ae^{-kt}'),
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
            ask('de-if-multiply-tree'),
            ask('de-if-read', 2),
            ask('de-if-product', 2),
            teach(
              prose(
                "So multiply $\\frac{dy}{dx} + Py = Q$ by a function $I$ whose derivative is $PI$. The left side becomes $I\\frac{dy}{dx} + I'y$, which is $\\frac{d}{dx}(Iy)$.",
              ),
              prose("For $P = \\frac{2}{x}$, $I = x^{2}$ works, since $(x^{2})' = 2x = \\frac{2}{x} \\times x^{2}$:"),
              working('x^{2}\\frac{dy}{dx} + 2xy &= 5x^{4}', '\\frac{d}{dx}(x^{2}y) &= 5x^{4}'),
            ),
            ask('de-if-divide', 2),
            ask('de-if-multiply-tree', 2),
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
            ),
            ask('de-if-factor'),
            ask('de-if-shape'),
            ask('de-if-lhs'),
            teach(
              prose(
                'For $P = \\frac{n}{x}$, with $x > 0$, $\\int P\\,dx = n\\ln x$. A multiple of a logarithm is the logarithm of a power, and $e$ undoes $\\ln$:',
              ),
              working('I &= e^{2\\ln x}', '&= e^{\\ln x^{2}}', '&= x^{2}'),
              prose('The same happens for $\\frac{n}{x + a}$, which gives $(x + a)^{n}$.'),
            ),
            ask('de-if-exponent-steps'),
            ask('de-if-factor', 2),
            ask('de-if-shape', 2),
            teach(
              prose('With the factor found, multiply every term by it. The left side is always $\\frac{d}{dx}(Iy)$ and the right side is $IQ$:'),
              working('\\frac{dy}{dx} + 3y &= 6', '\\frac{d}{dx}(ye^{3x}) &= 6e^{3x}'),
            ),
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
              working('\\frac{d}{dx}(x^{2}y) &= 5x^{4}', 'x^{2}y &= x^{5} + C'),
            ),
            ask('de-if-power-steps'),
            ask('de-if-powers-tree'),
            ask('de-if-cterm'),
            teach(
              prose('Divide by $x^{2}$, the constant too:'),
              display('y = x^{3} + \\frac{C}{x^{2}}'),
              prose(
                'In general, multiplying by $x^{n}$ adds $n$ to the power on the right, integrating adds one more, and dividing takes $n$ away again, leaving $C$ over $x^{n}$.',
              ),
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
            ask('de-if-fit'),
            teach(
              prose(
                'With $P = \\frac{n}{x}$ the condition is often at $x = 1$ or $x = 2$. At $x = 2$ the $C$ term is divided too. For $y = x^{3} + \\frac{C}{x^{2}}$ with $y(2) = 10$:',
              ),
              working('10 &= 8 + \\tfrac{C}{4}', 'C &= 8'),
            ),
            ask('de-if-value-tree'),
            ask('de-if-constant', 2),
            ask('de-if-condition-steps', 2),
            teach(
              prose(
                'A particular solution can be checked twice: it has to meet the condition, and put back into the equation it has to make both sides agree.',
              ),
            ),
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
            ask('de-aux-sub-steps', 2),
            ask('de-aux-tiles', 2),
            teach(
              prose(
                "An equation may come rearranged, as $y'' = 5y' - 6y$: bring every term to the left first. If every term is multiplied by $2$, the auxiliary equation is too, and its roots do not change.",
              ),
            ),
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
              prose('A second-order equation needs two constants, one for each solution.'),
            ),
            ask('de-real-general'),
            ask('de-real-roots-tree'),
            ask('de-real-which'),
            teach(
              prose('The whole method: the auxiliary equation, its roots, then the general solution. For $y\'\' - y\' - 6y = 0$,'),
              working('m^2 - m - 6 &= 0', '(m + 2)(m - 3) &= 0'),
              prose('The roots are $-2$ and $3$, so'),
              display('y = Ae^{-2x} + Be^{3x}'),
            ),
            ask('de-real-solve-steps'),
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
            ),
            ask('de-rep-general'),
            ask('de-rep-check-steps'),
            ask('de-rep-shape'),
            teach(
              prose("Why $xe^{px}$ works, checked by putting it in, as in Checking a Solution. For $y'' - 6y' + 9y = 0$ and $y = xe^{3x}$:"),
              working("y' &= (1 + 3x)e^{3x}", "y'' &= (6 + 9x)e^{3x}"),
              prose("Then $y'' - 6y' + 9y = (6 + 9x - 6 - 18x + 9x)e^{3x} = 0$."),
            ),
            ask('de-rep-which'),
            ask('de-rep-general', 2),
            ask('de-rep-check-steps', 2),
            teach(
              prose(
                'A repeated root shows as a perfect square: $b = -2p$ and $c = p^2$. For $y\'\' + 4y\' + 4y = 0$ the auxiliary equation is $(m + 2)^2 = 0$, so $y = (A + Bx)e^{-2x}$.',
              ),
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
              prose('For $y\'\' - 4y\' + 13y = 0$, $m = 2 \\pm 3i$, so $y = e^{2x}(A\\cos 3x + B\\sin 3x)$.'),
            ),
            ask('de-cx-general'),
            ask('de-cx-part'),
            ask('de-cx-which'),
            teach(
              prose('The quadratic formula gives $\\alpha$ and $\\beta$ at once:'),
              display('\\alpha = -\\frac{b}{2}, \\qquad \\beta = \\frac{\\sqrt{4c - b^2}}{2}'),
              prose('Completing the square does the same: $m^2 - 4m + 13 = (m - 2)^2 + 9$, so $\\alpha = 2$ and $\\beta = 3$.'),
            ),
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
            ask('de-ivp-constant'),
            ask('de-ivp-solve-tree'),
            ask('de-ivp-conditions-steps'),
            teach(
              prose(
                "At $x = 0$, $e^{0} = 1$, $\\cos 0 = 1$ and $\\sin 0 = 0$, so $y(0) = A$ for a repeated root and for complex roots. Then $y'(0)$ gives $B$.",
              ),
              prose("For $y = (A + Bx)e^{px}$, the product rule gives $y'(0) = pA + B$."),
              prose("For $y = e^{\\alpha x}(A\\cos \\beta x + B\\sin \\beta x)$, it gives $y'(0) = \\alpha A + \\beta B$."),
            ),
            ask('de-ivp-fit'),
            ask('de-ivp-constant', 2),
            ask('de-ivp-solve-tree', 2),
            teach(
              prose(
                'A particular solution can be checked twice: it meets both conditions, and put back into the equation it gives $0$.',
              ),
            ),
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
  ],
};
