/**
 * Classical Mechanics, level 8: Springs.
 *
 * Springs joined end to end and side by side (OpenStax University Physics
 * 7.1, 15.1), a spring's energy well and the speeds it gives (8.4, 15.2),
 * simple harmonic motion (15.1 to 15.2), the simple pendulum (15.4), and a
 * pendulum swung through a large angle, worked by energy (8.3). Hooke's law
 * and a spring's stored energy are Level 4.
 */
import type { Level } from '../../types';
import { ask, display, prose, stacked, teach } from './blocks';

export const level8: Level = {
  id: 'clm-l8',
  title: 'Springs',
  lessons: [
    {
      id: 'clm-l8-together',
      title: 'Springs Together',
      slides: [
        teach(
          prose('Springs side by side share the load and stretch the same, so their stiffnesses add. End to end, each carries the whole load and their stretches add, so the reciprocals add:'),
          display('k = k_{1} + k_{2} \\qquad \\frac{1}{k} = \\frac{1}{k_{1}} + \\frac{1}{k_{2}}'),
          prose('Springs of $60$ and $30\\text{ N m}^{-1}$: side by side $90$; end to end:'),
          stacked('k = \\frac{60 \\times 30}{60 + 30} = 20\\text{ N m}^{-1}'),
        ),
        ask('clm-spring-series'),
        ask('clm-spring-combo-table'),
        teach(
          prose('Build bigger arrangements a piece at a time. The $60$ and $30$ side by side make $90$; hung from a $45\\text{ N m}^{-1}$ spring:'),
          stacked('k = \\frac{90 \\times 45}{90 + 45} = 30\\text{ N m}^{-1}'),
          prose('Backwards, a $60$ end to end with an unknown spring makes $20$:'),
          stacked('\\frac{1}{k_{2}} = \\frac{1}{20} - \\frac{1}{60} = \\frac{1}{30}', 'k_{2} = 30'),
        ),
        ask('clm-spring-series+choice', 2),
        ask('clm-spring-combo-table', 2),
        teach(
          prose('A $20\\text{ N}$ load on springs of $4$ and $5\\text{ N cm}^{-1}$ end to end: each carries all $20\\text{ N}$.'),
          stacked('x_{1} = \\frac{20}{4} = 5 \\qquad x_{2} = \\frac{20}{5} = 4', 'x = 5 + 4 = 9\\text{ cm}'),
          prose('Side by side, springs of $4$ and $6\\text{ N cm}^{-1}$ under $50\\text{ N}$ make $10\\text{ N cm}^{-1}$ together, so both stretch $5\\text{ cm}$ and the first pulls $4 \\times 5 = 20\\text{ N}$.'),
        ),
        ask('clm-spring-stretch-tree'),
        ask('clm-spring-share-flow'),
        ask('clm-spring-stretch-tree', 2),
        ask('clm-spring-share-flow', 2),
      ],
      skillCheck: [ask('clm-spring-series', 2), ask('clm-spring-stretch-tree', 2), ask('clm-spring-share-flow', 2)],
    },
    {
      id: 'clm-l8-well',
      title: 'Energy in a Spring',
      slides: [
        teach(
          prose('A mass on a spring on a smooth floor trades energy between the spring, $\\tfrac{1}{2}kx^{2}$, and its motion. At the turning points $x = \\pm A$ it stops, so the whole energy is in the spring:'),
          display('E = \\tfrac{1}{2}kA^{2}'),
          prose('With $k = 200\\text{ N m}^{-1}$ and $E = 9\\text{ J}$:'),
          stacked('100A^{2} = 9', 'A = 0.3\\text{ m}'),
          prose('At any point the kinetic energy is what the spring does not hold: $K = E - \\tfrac{1}{2}kx^{2}$. At $x = 0.1\\text{ m}$ the spring holds $1\\text{ J}$, so $K = 8\\text{ J}$.'),
        ),
        ask('clm-spring-turning'),
        ask('clm-spring-energy-table'),
        ask('clm-spring-turning', 2),
        ask('clm-spring-energy-table', 2),
        teach(
          prose('So the speed at $x$ comes from the energy left over:'),
          display('\\tfrac{1}{2}mv^{2} = \\tfrac{1}{2}k(A^{2} - x^{2})'),
          prose('A $2\\text{ kg}$ mass, $k = 50\\text{ N m}^{-1}$, amplitude $0.5\\text{ m}$, at $x = 0.3\\text{ m}$:'),
          stacked('E = \\tfrac{1}{2} \\times 50 \\times 0.5^{2} = 6.25', 'U = \\tfrac{1}{2} \\times 50 \\times 0.3^{2} = 2.25', '\\tfrac{1}{2} \\times 2 \\times v^{2} = 4', 'v = 2\\text{ m s}^{-1}'),
        ),
        ask('clm-spring-speed'),
        ask('clm-spring-speed+choice', 2),
        ask('clm-spring-well-flow'),
        ask('clm-spring-well-flow', 2),
      ],
      skillCheck: [ask('clm-spring-turning', 2), ask('clm-spring-energy-table', 2), ask('clm-spring-speed', 2)],
    },
    {
      id: 'clm-l8-shm',
      title: 'Simple Harmonic Motion',
      slides: [
        teach(
          prose('A mass on a spring moves in **simple harmonic motion**: its acceleration is always towards the middle, in proportion to how far out it is. Its angular frequency depends only on the spring and the mass:'),
          display('\\omega = \\sqrt{\\frac{k}{m}}'),
          prose('$k = 50\\text{ N m}^{-1}$ and $m = 2\\text{ kg}$ give $\\omega = \\sqrt{25} = 5\\text{ rad s}^{-1}$. Backwards, $k = m\\omega^{2}$.'),
          prose('It is fastest in the middle and pulled hardest at the ends. With amplitude $A = 0.2\\text{ m}$:'),
          stacked('v_{\\max} = A\\omega = 0.2 \\times 5 = 1', 'a_{\\max} = A\\omega^{2} = 0.2 \\times 25 = 5'),
          prose('So $1\\text{ m s}^{-1}$ through the middle and $5\\text{ m s}^{-2}$ at the ends.'),
        ),
        ask('clm-shm-omega'),
        ask('clm-shm-omega+choice', 2),
        ask('clm-shm-tree'),
        ask('clm-shm-tree', 2),
        teach(
          prose('At a displacement $x$ the acceleration is $a = \\omega^{2}x$. With $\\omega = 5$, an acceleration of $2\\text{ m s}^{-2}$ happens at $x = \\frac{2}{25} = 0.08\\text{ m}$.'),
          prose('And from the two greatest values, back to the rest:'),
          stacked('\\omega = \\frac{a_{\\max}}{v_{\\max}} = \\frac{5}{1} = 5', 'A = \\frac{v_{\\max}^{2}}{a_{\\max}} = \\frac{1}{5} = 0.2'),
        ),
        ask('clm-shm-slider'),
        ask('clm-shm-table'),
        ask('clm-shm-slider', 2),
        ask('clm-shm-table', 2),
      ],
      skillCheck: [ask('clm-shm-omega', 2), ask('clm-shm-tree', 2), ask('clm-shm-table', 2)],
    },
    {
      id: 'clm-l8-pendulum',
      title: 'Pendulums',
      slides: [
        teach(
          prose('For small swings a pendulum is simple harmonic too, with the pull of gravity along the arc doing the spring’s job. Its angular frequency depends only on its length:'),
          display('\\omega = \\sqrt{\\frac{g}{L}}'),
          prose('With $g = 9.8$, a pendulum $2.45\\text{ m}$ long:'),
          stacked('\\omega = \\sqrt{\\frac{9.8}{2.45}} = \\sqrt{4} = 2\\text{ rad s}^{-1}'),
          prose('Backwards, $L = \\frac{g}{\\omega^{2}}$: for $\\omega = 1.4$, $L = \\frac{9.8}{1.96} = 5\\text{ m}$.'),
        ),
        ask('clm-pend-omega'),
        ask('clm-pend-omega+choice', 2),
        ask('clm-pend-table'),
        ask('clm-pend-slider'),
        ask('clm-pend-table', 2),
        ask('clm-pend-slider', 2),
        teach(
          prose('The period is $T = \\frac{2\\pi}{\\omega} = 2\\pi\\sqrt{\\frac{L}{g}}$, so it goes as the square root of the length. Four times as long swings twice as slowly: a $1\\text{ s}$ period becomes $2\\text{ s}$.'),
          prose('A pendulum clock ticks once a swing. Lengthen its pendulum and it ticks less often, so it runs slow; shorten it and it runs fast.'),
        ),
        ask('clm-pend-ratio-flow'),
        ask('clm-pend-ratio-flow', 2),
      ],
      skillCheck: [ask('clm-pend-omega', 2), ask('clm-pend-table', 2), ask('clm-pend-ratio-flow', 2)],
    },
    {
      id: 'clm-l8-swing',
      title: 'The Large-Angle Pendulum',
      slides: [
        teach(
          prose('A big swing is no longer simple harmonic, but energy still works. Let go at $\\theta$ to the vertical, the bob drops $L(1 - \\cos\\theta)$ to the bottom:'),
          display('h = L(1 - \\cos\\theta) \\qquad v = \\sqrt{2gh}'),
          prose('A pendulum $5\\text{ m}$ long let go at $60^\\circ$, where $\\cos 60^\\circ = 0.5$:'),
          stacked('h = 5(1 - 0.5) = 2.5\\text{ m}', 'v = \\sqrt{19.6 \\times 2.5} = 7\\text{ m s}^{-1}'),
          prose('Where the angle is given by its cosine, use it straight in: $\\cos\\theta = 0.8$ on a $12.5\\text{ m}$ rope drops $2.5\\text{ m}$ too.'),
          stacked('h = 12.5(1 - 0.8) = 2.5\\text{ m}'),
        ),
        ask('clm-swing-speed'),
        ask('clm-swing-speed+choice', 2),
        teach(
          prose('Backwards, the drop that gives a speed at the bottom:'),
          display('h = \\frac{v^{2}}{2g}'),
          prose('$2.8\\text{ m s}^{-1}$ needs a drop of $\\frac{7.84}{19.6} = 0.4\\text{ m}$, whatever the length of the rope.'),
        ),
        ask('clm-swing-slider'),
        ask('clm-swing-slider', 2),
        teach(
          prose('At the bottom the string holds the weight and also turns the bob, so it pulls harder than the weight:'),
          display('T = mg + \\frac{mv^{2}}{L}'),
          prose('A $2\\text{ kg}$ bob arriving at $7\\text{ m s}^{-1}$ on the $5\\text{ m}$ string:'),
          stacked('T = 19.6 + \\frac{2 \\times 49}{5} = 39.2\\text{ N}'),
          prose('Twice its weight: from $90^\\circ$ it would be three times.'),
        ),
        ask('clm-swing-tree'),
        ask('clm-swing-flow'),
        ask('clm-swing-tree', 2),
        ask('clm-swing-flow', 2),
      ],
      skillCheck: [ask('clm-swing-speed', 2), ask('clm-swing-tree', 2), ask('clm-swing-flow', 2)],
    },
  ],
  levelCheck: [
    ask('clm-spring-series', 2),
    ask('clm-spring-stretch-tree', 2),
    ask('clm-spring-share-flow', 2),
    ask('clm-spring-energy-table', 2),
    ask('clm-spring-speed', 2),
    ask('clm-shm-omega', 2),
    ask('clm-shm-tree', 2),
    ask('clm-shm-table', 2),
    ask('clm-pend-omega', 2),
    ask('clm-pend-ratio-flow', 2),
    ask('clm-swing-speed', 2),
    ask('clm-swing-tree', 2),
  ],
};
