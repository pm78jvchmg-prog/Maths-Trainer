/**
 * Classical Mechanics, level 1: Describing Motion.
 *
 * The outline's Formula One Racing, Cellular Automaton and Kinematics in the
 * City. Speeds in two units and race gaps; average speed over stages, and why
 * equal distances at two speeds do not average to their mean; relative
 * velocity along a line, closing speeds and overtaking; stopping distances
 * (after OpenStax University Physics 2.5 and the Highway Code's table); and
 * stepping motion forward in time, as a computer does, with the traffic
 * automaton of Nagel and Schreckenberg. Kinematics' suvat is used, not taught.
 */
import type { Level } from '../../types';
import { ask, display, prose, stacked, teach } from './blocks';

const STEP_RULE = 'x_{n+1} = x_{n} + v_{n}\\,\\Delta t \\qquad v_{n+1} = v_{n} + a\\,\\Delta t';

export const level1: Level = {
  id: 'clm-l1',
  title: 'Describing Motion',
  lessons: [
    {
      id: 'clm-l1-units',
      title: 'Speeds and Units',
      slides: [
        teach(
          prose(
            'Speed is distance over time. Physics works in metres and seconds, **metres per second**, $\\text{m s}^{-1}$. Road signs and race timing use **kilometres per hour**, $\\text{km h}^{-1}$.',
          ),
          prose('One metre each second is $3600\\text{ m}$ in an hour, which is $3.6\\text{ km}$. So'),
          display('1\\text{ m s}^{-1} = 3.6\\text{ km h}^{-1}'),
          prose('Divide by $3.6$ to go to $\\text{m s}^{-1}$. A car at $90\\text{ km h}^{-1}$:'),
          display('90 \\div 3.6 = 25\\text{ m s}^{-1}'),
          prose('Multiply to come back: a cyclist at $8\\text{ m s}^{-1}$ is doing $8 \\times 3.6 = 28.8\\text{ km h}^{-1}$.'),
        ),
        ask('clm-kmh-convert'),
        ask('clm-speed-table'),
        ask('clm-kmh-convert+choice', 2),
        teach(
          prose('A lap time is the lap length over the average speed, both in metres and seconds. A $5.4\\text{ km}$ lap at an average of $216\\text{ km h}^{-1}$:'),
          stacked('5.4\\text{ km} = 5400\\text{ m}', '216 \\div 3.6 = 60\\text{ m s}^{-1}', 't = 5400 \\div 60 = 90\\text{ s}'),
          prose('Backwards, the same lap in $90\\text{ s}$ averages $5400 \\div 90 = 60\\text{ m s}^{-1}$, which is $60 \\times 3.6 = 216\\text{ km h}^{-1}$.'),
        ),
        ask('clm-lap-time'),
        ask('clm-lap-time', 2),
        teach(
          prose(
            'Race gaps are given in seconds. Two cars at the same speed $v$, one crossing the line $t$ seconds after the other, are $d = vt$ apart: the second car still has that far to go.',
          ),
          prose('At $80\\text{ m s}^{-1}$, a gap of $0.3\\text{ s}$ is $80 \\times 0.3 = 24\\text{ m}$.'),
          prose('Given the speed in $\\text{km h}^{-1}$, convert first: $252\\text{ km h}^{-1}$ is $252 \\div 3.6 = 70\\text{ m s}^{-1}$, so the same gap is $70 \\times 0.3 = 21\\text{ m}$.'),
        ),
        ask('clm-gap-slider'),
        ask('clm-gap-slider', 2),
        ask('clm-speed-table', 2),
      ],
      skillCheck: [ask('clm-kmh-convert', 2), ask('clm-lap-time', 2), ask('clm-gap-slider', 2)],
    },
    {
      id: 'clm-l1-average',
      title: 'Average Speed over a Race',
      slides: [
        teach(
          prose('Over a journey in stages, the **average speed** is the total distance over the total time:'),
          display('\\bar{v} = \\frac{\\text{total distance}}{\\text{total time}}'),
          prose('A car drives $20\\text{ s}$ at $30\\text{ m s}^{-1}$, then $30\\text{ s}$ at $50\\text{ m s}^{-1}$:'),
          stacked('20 \\times 30 = 600', '30 \\times 50 = 1500', '\\bar{v} = \\frac{600 + 1500}{20 + 30} = 42'),
          prose(
            'Time spent stopped still counts. With a $10\\text{ s}$ pit stop between the two stints, $\\bar{v} = 2100 \\div 60 = 35\\text{ m s}^{-1}$. A stage missing its distance, time or speed gets it from $d = vt$.',
          ),
        ),
        ask('clm-stint-tree'),
        ask('clm-avg-table'),
        ask('clm-stint-tree', 2),
        teach(
          prose('The average is **not** the mean of the speeds unless the times are equal. Half a course at $30\\text{ m s}^{-1}$ and half at $60\\text{ m s}^{-1}$, each half $d$ long:'),
          stacked('\\bar{v} = \\frac{2d}{\\frac{d}{30} + \\frac{d}{60}}', '= \\frac{2 \\times 30 \\times 60}{30 + 60} = 40'),
          prose('Not $45$: the slower half takes twice as long, so it counts for more. Equal distances at $a$ and $b$ always give $\\frac{2ab}{a + b}$, and backwards'),
          display('b = \\frac{\\bar{v}a}{2a - \\bar{v}}'),
          prose('To average $40$ after a first half at $30$: $b = \\frac{40 \\times 30}{60 - 40} = 60$.'),
        ),
        ask('clm-equal-halves'),
        ask('clm-equal-halves+choice', 2),
        teach(
          prose('A race is two $1200\\text{ m}$ laps and lap 1 went at $30\\text{ m s}^{-1}$. To average $40$ over both, work with times:'),
          stacked('\\text{both laps: } 2400 \\div 40 = 60\\text{ s}', '\\text{lap 1: } 1200 \\div 30 = 40\\text{ s}', '\\text{lap 2: } 1200 \\div 20 = 60\\text{ m s}^{-1}'),
          prose('Doubling the target and taking away lap 1, $2 \\times 40 - 30 = 50$, is the trap: it treats the two laps as taking equal times.'),
        ),
        ask('clm-avg-flow'),
        ask('clm-avg-flow', 2),
        ask('clm-avg-table', 2),
      ],
      skillCheck: [ask('clm-stint-tree', 2), ask('clm-equal-halves', 2), ask('clm-avg-flow', 2)],
    },
    {
      id: 'clm-l1-relative',
      title: 'Closing Speeds',
      slides: [
        teach(
          prose(
            'Along a straight road, choose one direction as positive, so each velocity carries a sign. The **velocity of B relative to A** is what someone riding with A would measure:',
          ),
          display('v_{B} - v_{A}'),
          prose('East positive, A at $20\\text{ m s}^{-1}$ east and B at $15\\text{ m s}^{-1}$ west:'),
          display('v_{B} - v_{A} = -15 - 20 = -35'),
          prose('To A, B rushes past westwards at $35\\text{ m s}^{-1}$. Both east, A at $20$ and B at $25$: $25 - 20 = 5$, so B creeps ahead at $5\\text{ m s}^{-1}$.'),
        ),
        ask('clm-rel-velocity'),
        ask('clm-rel-velocity+choice', 2),
        teach(
          prose('Heading towards each other, a gap closes at the **sum** of the speeds. One chasing the other closes it at the **difference**.'),
          prose('Two cyclists $300\\text{ m}$ apart, riding towards each other at $4$ and $6\\text{ m s}^{-1}$:'),
          stacked('4 + 6 = 10', 't = 300 \\div 10 = 30\\text{ s}'),
          prose('They meet where the first has got to: $4 \\times 30 = 120\\text{ m}$ from its start. A police car at $30$ chasing a van at $20$ from $200\\text{ m}$ behind catches it after $200 \\div 10 = 20\\text{ s}$.'),
          prose('If one sets off late, the other rides alone first. Take that stretch off the gap, then close the rest together.'),
        ),
        ask('clm-meet-time'),
        ask('clm-meet-slider'),
        ask('clm-meet-time+choice', 2),
        teach(
          prose(
            'To overtake, a car gains on a lorry by both their lengths, plus any gap before and after. Relative to the lorry it moves at the difference of their speeds. A $4\\text{ m}$ car at $25\\text{ m s}^{-1}$ passing a $16\\text{ m}$ lorry at $20\\text{ m s}^{-1}$:',
          ),
          stacked('\\text{gain} = 4 + 16 = 20', '25 - 20 = 5', 't = 20 \\div 5 = 4\\text{ s}', 's = 25 \\times 4 = 100\\text{ m}'),
          prose('The last line is along the road: the car covers $100\\text{ m}$ to gain $20\\text{ m}$ on the lorry.'),
        ),
        ask('clm-overtake-tree'),
        ask('clm-overtake-tree', 2),
        ask('clm-meet-slider', 2),
      ],
      skillCheck: [ask('clm-rel-velocity', 2), ask('clm-meet-time', 2), ask('clm-overtake-tree', 2)],
    },
    {
      id: 'clm-l1-stopping',
      title: 'Stopping Distances',
      slides: [
        teach(
          prose(
            'A driver who sees a hazard takes a moment to react, and the car keeps its speed meanwhile. That stretch is the **thinking distance**: speed times reaction time. At $72\\text{ km h}^{-1}$ with a reaction time of $0.7\\text{ s}$:',
          ),
          stacked('72 \\div 3.6 = 20\\text{ m s}^{-1}', '20 \\times 0.7 = 14\\text{ m}'),
          prose('Backwards, $14\\text{ m}$ at $20\\text{ m s}^{-1}$ means a reaction time of $14 \\div 20 = 0.7\\text{ s}$.'),
        ),
        ask('clm-thinking'),
        ask('clm-thinking+choice', 2),
        teach(
          prose(
            "Then the brakes give a steady deceleration $a$ until the car stops. Kinematics' $v^{2} = u^{2} + 2as$, with $v = 0$ and acceleration $-a$, gives the **braking distance**:",
          ),
          display('d = \\frac{u^{2}}{2a}'),
          prose('From $20\\text{ m s}^{-1}$ at $8\\text{ m s}^{-2}$: $d = 400 \\div 16 = 25\\text{ m}$. Given the distance instead, $a = \\frac{u^{2}}{2d}$.'),
          prose(
            'Because $u$ is squared, twice the speed needs **four** times the braking distance. A car needing $18\\text{ m}$ at $60\\text{ km h}^{-1}$ needs $2^{2} \\times 18 = 72\\text{ m}$ at $120\\text{ km h}^{-1}$. In general, multiply by the ratio of the speeds, squared.',
          ),
        ),
        ask('clm-braking'),
        ask('clm-speed-squared+choice'),
        ask('clm-braking', 2),
        teach(
          prose('The **stopping distance** is the two added: thinking, then braking. At $20\\text{ m s}^{-1}$, with $0.7\\text{ s}$ to react and braking at $8\\text{ m s}^{-2}$:'),
          display('14 + 25 = 39\\text{ m}'),
          prose('A hazard $45\\text{ m}$ ahead is missed with $6\\text{ m}$ to spare. One $35\\text{ m}$ ahead is not.'),
        ),
        ask('clm-stopping-tree'),
        ask('clm-stop-flow'),
        ask('clm-stopping-tree', 2),
      ],
      skillCheck: [ask('clm-thinking', 2), ask('clm-braking', 2), ask('clm-stop-flow', 2)],
    },
    {
      id: 'clm-l1-steps',
      title: 'Stepping Through Time',
      slides: [
        teach(
          prose('A computer moves things forward in small **time steps** $\\Delta t$. Each step, the position moves on by the speed it had, then the speed changes by the acceleration:'),
          display(STEP_RULE),
          prose('From $x = 2$ and $v = 3$, with $a = 2$ and $\\Delta t = 1$:'),
          stacked('x_{1} = 2 + 3 \\times 1 = 5', 'v_{1} = 3 + 2 \\times 1 = 5', 'x_{2} = 5 + 5 \\times 1 = 10', 'v_{2} = 5 + 2 \\times 1 = 7'),
          prose('Each new row uses only the row above: the old speed moves the car, not the new one.'),
          prose('Backwards, positions $5$ and $10$ one second apart mean a velocity of $\\frac{10 - 5}{1} = 5\\text{ m s}^{-1}$ over that second.'),
        ),
        ask('clm-step-table'),
        ask('clm-step-velocity'),
        ask('clm-step-table', 2),
        teach(
          prose(
            'A **cellular automaton** models traffic the same way. The road is a row of numbered cells, and each car has a speed in cells per step. Every step, all at once, each car speeds up by one, but never past the limit, here $5$, and never further than the empty cells in front of it, the **gap**:',
          ),
          display('v_{\\text{new}} = \\min(v + 1,\\ 5,\\ \\text{gap})'),
          prose(
            'Then it moves on $v_{\\text{new}}$ cells. Car B in cell $7$ at speed $3$, with car A in cell $10$: the gap is $10 - 7 - 1 = 2$, so $v_{\\text{new}} = \\min(4, 5, 2) = 2$ and B moves to cell $9$. Car A, with a clear road at speed $5$, stays at $5$ and moves from $10$ to $15$.',
          ),
          prose('From this one rule come traffic jams that nobody caused (Nagel and Schreckenberg, 1992).'),
        ),
        ask('clm-traffic-table'),
        ask('clm-traffic-table', 2),
        teach(
          prose(
            'Stepping is not exact. From rest with $a = 2$ and $\\Delta t = 1$, the speeds used are $0$, $2$ and $4$, so three steps give $0 + 2 + 4 = 6\\text{ m}$. The true distance is',
          ),
          display('\\tfrac{1}{2} \\times 2 \\times 3^{2} = 9\\text{ m}'),
          prose('Stepping falls $3\\text{ m}$ short, because each step uses the speed from its start. Halve $\\Delta t$ and the shortfall halves.'),
          prose(
            'Positions read at equal steps also give the acceleration. Each step\'s velocity is its change in position over $\\Delta t$; the acceleration is the change in those velocities over $\\Delta t$. Positions $0, 1, 4, 9$ a second apart give velocities $1, 3, 5$, rising by $2$ each second, so $a = 2\\text{ m s}^{-2}$.',
          ),
        ),
        ask('clm-step-error-tree'),
        ask('clm-step-velocity+choice', 2),
        ask('clm-step-error-tree', 2),
      ],
      skillCheck: [ask('clm-step-table', 2), ask('clm-traffic-table', 2), ask('clm-step-error-tree', 2)],
    },
  ],
  levelCheck: [
    ask('clm-kmh-convert', 2),
    ask('clm-lap-time', 2),
    ask('clm-gap-slider', 2),
    ask('clm-stint-tree', 2),
    ask('clm-equal-halves', 2),
    ask('clm-avg-flow', 2),
    ask('clm-meet-time', 2),
    ask('clm-overtake-tree', 2),
    ask('clm-braking', 2),
    ask('clm-stopping-tree', 2),
    ask('clm-step-table', 2),
    ask('clm-traffic-table', 2),
  ],
};
