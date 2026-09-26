/**
 * Classical Mechanics, level 5: Momentum.
 *
 * The outline's Momentum in the Office, Impulse-Momentum Theorem, Rocket
 * Equation, Ideal Gas Law and Photon Problem. Momentum, impulse and
 * collisions in a line are Forces and Newton's Laws, Momentum and Impulse, so
 * this level goes on from them: impulse from a force-time graph (OpenStax
 * University Physics 9.2), bounces and restitution (9.4), collisions in two
 * dimensions (9.5), rockets (9.7), and the push of a stream of particles, of
 * a gas and of light (Volume 2, 2.1 to 2.2; Volume 3, 6.3).
 */
import type { Level } from '../../types';
import { classicalMomentumInternals } from '../../generators/classicalMomentum';
import { ask, diagram, display, prose, stacked, teach } from './blocks';

const pulse = classicalMomentumInternals.pulseSvg({ F: 800, rise: 3, flat: 0, fall: 3, thing: 'ball', m: 0.4 }, 800);

export const level5: Level = {
  id: 'clm-l5',
  title: 'Momentum',
  lessons: [
    {
      id: 'clm-l5-impulse',
      title: 'Force-Time Graphs',
      slides: [
        teach(
          prose('A steady force $F$ for a time $\\Delta t$ gives an **impulse** $J = F\\Delta t$. When a kick or a hit builds up and dies away, the impulse is the area under the force-time graph.'),
          diagram(pulse),
          prose('This pulse is a triangle, $800\\text{ N}$ high and $6\\text{ ms}$ wide. Time in seconds:'),
          stacked('J = \\tfrac{1}{2} \\times 800 \\times 0.006 = 2.4\\text{ N s}'),
          prose('A flat-topped pulse is a rectangle between two triangles. Rising over $2\\text{ ms}$ to $600\\text{ N}$, flat for $4\\text{ ms}$, falling over $2\\text{ ms}$:'),
          stacked('J = 600 \\times (0.001 + 0.004 + 0.001) = 3.6\\text{ N s}'),
        ),
        ask('clm-impulse-area'),
        ask('clm-impulse-area+choice', 2),
        teach(
          prose('Impulse is the change of momentum, $J = m\\Delta v$. The $2.4\\text{ N s}$ pulse on a $0.4\\text{ kg}$ football at rest sends it off at $2.4 \\div 0.4 = 6\\text{ m s}^{-1}$.'),
          prose('The average force is the change of momentum over the time. A $0.05\\text{ kg}$ tennis ball hits a wall at $20\\text{ m s}^{-1}$ and comes back at $15$, in $5\\text{ ms}$. Coming back is the other way, so the speeds add:'),
          stacked('\\Delta p = 0.05 \\times (20 + 15) = 1.75', 'F = \\frac{1.75}{0.005} = 350\\text{ N}'),
        ),
        ask('clm-impulse-tree'),
        ask('clm-avg-force'),
        ask('clm-avg-force+choice', 2),
        teach(
          prose('Backwards, the peak of a triangular pulse from its impulse $J$ and width $T$:'),
          display('J = \\tfrac{1}{2}F_{\\text{peak}}T \\qquad F_{\\text{peak}} = \\frac{2J}{T}'),
          prose('$2.4\\text{ N s}$ over $6\\text{ ms}$ needs $F_{\\text{peak}} = 4.8 \\div 0.006 = 800\\text{ N}$.'),
        ),
        ask('clm-peak-slider'),
        ask('clm-impulse-tree', 2),
        ask('clm-peak-slider', 2),
      ],
      skillCheck: [ask('clm-impulse-area', 2), ask('clm-impulse-tree', 2), ask('clm-avg-force', 2)],
    },
    {
      id: 'clm-l5-bounce',
      title: 'Bounce: Restitution',
      slides: [
        teach(
          prose('How bouncy a collision is is its **coefficient of restitution**: the speed they separate at over the speed they approached at. $e = 1$ loses no energy; $e = 0$ sticks.'),
          display('e = \\frac{\\text{speed of separation}}{\\text{speed of approach}}'),
          prose('A ball lands at $10\\text{ m s}^{-1}$ and leaves the floor at $7$: $e = 0.7$.'),
          prose('Dropped from $10\\text{ m}$, it lands at $v^{2} = 19.6 \\times 10 = 196$, so $14\\text{ m s}^{-1}$, and leaves at $0.7 \\times 14 = 9.8$. Height goes as speed squared, so it rises $e^{2}h$:'),
          stacked('h = 0.7^{2} \\times 10 = 4.9\\text{ m}'),
          prose('Backwards, from the heights: $e = \\sqrt{\\frac{4.9}{10}} = \\sqrt{0.49} = 0.7$. Usually the root does not come out exactly. Dropped from $2\\text{ m}$, bouncing to $1.3\\text{ m}$:'),
          stacked('e = \\sqrt{\\frac{1.3}{2}} = 0.8062\\ldots'),
          prose('So $e = 0.81$ to 2 decimal places.'),
        ),
        ask('clm-restitution'),
        ask('clm-bounce-height+choice'),
        ask('clm-bounce-tree'),
        teach(
          prose('Between two bodies, momentum gives one equation and restitution the other. A $2\\text{ kg}$ trolley at $6\\text{ m s}^{-1}$ hits a $1\\text{ kg}$ trolley at rest, $e = 0.5$:'),
          stacked('v_{B} - v_{A} = 0.5 \\times 6 = 3', '2v_{A} + 1(v_{A} + 3) = 12', '3v_{A} = 9', 'v_{A} = 3 \\qquad v_{B} = 6'),
        ),
        ask('clm-collision-flow'),
        ask('clm-restitution', 2),
        ask('clm-collision-flow', 2),
        teach(
          prose('Each bounce multiplies the height by $e^{2}$ again. From $10\\text{ m}$ with $e = 0.7$: $4.9\\text{ m}$, then $0.49 \\times 4.9 = 2.401\\text{ m}$, and so on, never quite stopping on paper.'),
        ),
        ask('clm-bounce-height', 2),
        ask('clm-bounce-tree', 2),
      ],
      skillCheck: [ask('clm-restitution', 2), ask('clm-bounce-tree', 2), ask('clm-collision-flow', 2)],
    },
    {
      id: 'clm-l5-2d',
      title: 'Collisions in Two Dimensions',
      slides: [
        teach(
          prose('Momentum is a vector. In a plane it has two parts, each kept separately in a collision:'),
          display('p_{x} = mv_{x} \\qquad p_{y} = mv_{y}'),
          prose('A $2\\text{ kg}$ puck with $v_{x} = 3$ and $v_{y} = -4$ has $p_{x} = 6$ and $p_{y} = -8$. Backwards, $v_{x} = \\frac{p_{x}}{m}$.'),
        ),
        ask('clm-momentum-table'),
        ask('clm-momentum-table', 2),
        teach(
          prose('Two bodies that stick share the total. A $3\\text{ kg}$ body east at $4\\text{ m s}^{-1}$ meets a $2\\text{ kg}$ body north at $4.5$:'),
          stacked('p_{x} = 3 \\times 4 = 12', 'p_{y} = 2 \\times 4.5 = 9', 'p = \\sqrt{12^{2} + 9^{2}} = 15', 'v = \\frac{15}{5} = 3\\text{ m s}^{-1}'),
          prose('They move off at $\\theta$ north of east, with $\\tan\\theta = \\frac{p_{y}}{p_{x}} = \\frac{9}{12} = 0.75$.'),
        ),
        ask('clm-merge-tree'),
        ask('clm-merge-angle'),
        ask('clm-merge-tree', 2),
        teach(
          prose('When one ball strikes an equal one at rest, the masses cancel and velocities add up like momenta. A ball at $12.5\\text{ m s}^{-1}$ east leaves with $4.5$ east and $6$ south, so the other takes the rest:'),
          stacked('v_{x} = 12.5 - 4.5 = 8', 'v_{y} = 0 - (-6) = 6', 'v = \\sqrt{8^{2} + 6^{2}} = 10'),
        ),
        ask('clm-glance-tree'),
        ask('clm-merge-angle+choice', 2),
        ask('clm-glance-tree', 2),
      ],
      skillCheck: [ask('clm-momentum-table', 2), ask('clm-merge-tree', 2), ask('clm-glance-tree', 2)],
    },
    {
      id: 'clm-l5-rocket',
      title: 'The Rocket Equation',
      slides: [
        teach(
          prose('A rocket pushes itself forward by throwing exhaust back. Each second it gives the burnt fuel a momentum of its mass times the exhaust speed $u$, and gets as much itself: the **thrust**.'),
          display('T = u \\times \\frac{\\Delta m}{\\Delta t}'),
          prose('Exhaust at $2000\\text{ m s}^{-1}$, burning $15\\text{ kg}$ a second: $T = 2000 \\times 15 = 30\\,000\\text{ N}$.'),
        ),
        ask('clm-rocket-thrust'),
        ask('clm-rocket-table'),
        teach(
          prose('On the pad, the weight pulls back. A $2000\\text{ kg}$ rocket with that thrust:'),
          stacked('T - mg = 30\\,000 - 19\\,600 = 10\\,400', 'a = \\frac{10\\,400}{2000} = 5.2\\text{ m s}^{-2}'),
          prose('Backwards in the table: $u = \\frac{T}{\\text{rate}}$ and the rate is $\\frac{T}{u}$.'),
        ),
        ask('clm-rocket-thrust+choice', 2),
        ask('clm-rocket-flow'),
        ask('clm-rocket-table', 2),
        teach(
          prose('As fuel burns the rocket gets lighter, so each kilogram thrown out speeds it up more. Adding up those small bursts gives the **rocket equation**, from mass $m_{0}$ down to $m_{1}$:'),
          display('\\Delta v = u\\ln\\frac{m_{0}}{m_{1}}'),
          prose('At $u = 3000\\text{ m s}^{-1}$, burning down to a quarter of its starting mass:'),
          stacked('\\Delta v = 3000\\ln 4'),
          prose('That is about $4159\\text{ m s}^{-1}$. Type it as $3000\\ln(4)$ with the ln key. Only the ratio of the masses matters.'),
        ),
        ask('clm-rocket-dv'),
        ask('clm-rocket-flow', 2),
        ask('clm-rocket-dv+choice', 2),
      ],
      skillCheck: [ask('clm-rocket-thrust', 2), ask('clm-rocket-table', 2), ask('clm-rocket-dv', 2)],
    },
    {
      id: 'clm-l5-gas',
      title: 'Gas Pressure and Light',
      slides: [
        teach(
          prose('A steady stream of hits makes a steady force: the momentum delivered each second. $100$ hailstones a second, each $0.004\\text{ kg}$ at $20\\text{ m s}^{-1}$, stopping dead:'),
          stacked('F = 100 \\times 0.004 \\times 20 = 8\\text{ N}'),
          prose('If each bounced straight back, its momentum would change by twice as much: $16\\text{ N}$. A gas pushes on its walls in exactly this way, with trillions of molecules.'),
        ),
        ask('clm-stream-force'),
        ask('clm-stream-force+choice', 2),
        teach(
          prose('Adding up all those molecules gives the **ideal gas law**, with $n$ moles at temperature $T$ in kelvin and $R = 8.3\\text{ J mol}^{-1}\\text{ K}^{-1}$:'),
          display('pV = nRT'),
          prose('$2$ moles at $300\\text{ K}$ in $10$ litres, which is $0.01\\text{ m}^{3}$:'),
          stacked('nRT = 2 \\times 8.3 \\times 300 = 4980', 'p = \\frac{4980}{0.01} = 498\\,000\\text{ Pa}', 'p = 498\\text{ kPa}'),
          prose('Backwards, $T = \\frac{pV}{nR}$. At $500\\text{ kPa}$ in the same $0.01\\text{ m}^{3}$, to 3 significant figures:'),
          stacked('pV = 500\\,000 \\times 0.01 = 5000', 'T = \\frac{5000}{2 \\times 8.3} = 301.20\\ldots', 'T = 301\\text{ K}'),
        ),
        ask('clm-gas-tree'),
        ask('clm-gas-tree', 2),
        teach(
          prose('Light carries momentum too: energy $E$ brings $\\frac{E}{c}$, with $c = 3 \\times 10^{8}\\text{ m s}^{-1}$. So a beam of power $P$ pushes on what absorbs it with $\\frac{P}{c}$, and on a mirror with $\\frac{2P}{c}$.'),
          prose('$300\\text{ W}$ absorbed gives $\\frac{300}{3 \\times 10^{8}} = 1 \\times 10^{-6}\\text{ N}$, one micronewton. $600\\text{ W}$ on a mirror gives $4$.'),
          prose('A solar sail of $100\\text{ m}^{2}$ in sunlight of $1200\\text{ W m}^{-2}$ gets $120\\,000\\text{ W}$; reflected, that is $800$ micronewtons. On $1\\text{ kg}$, $0.8\\text{ mm s}^{-2}$.'),
        ),
        ask('clm-light-force'),
        ask('clm-sail-flow'),
        ask('clm-light-force+choice', 2),
        ask('clm-sail-flow', 2),
      ],
      skillCheck: [ask('clm-stream-force', 2), ask('clm-gas-tree', 2), ask('clm-light-force', 2)],
    },
  ],
  levelCheck: [
    ask('clm-impulse-area', 2),
    ask('clm-impulse-tree', 2),
    ask('clm-avg-force', 2),
    ask('clm-bounce-tree', 2),
    ask('clm-collision-flow', 2),
    ask('clm-restitution', 2),
    ask('clm-merge-tree', 2),
    ask('clm-glance-tree', 2),
    ask('clm-rocket-flow', 2),
    ask('clm-rocket-dv', 2),
    ask('clm-gas-tree', 2),
    ask('clm-light-force', 2),
  ],
};
