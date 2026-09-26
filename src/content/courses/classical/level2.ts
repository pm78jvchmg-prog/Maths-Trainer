/**
 * Classical Mechanics, level 2: Motion in Two Dimensions.
 *
 * The outline's The Kinematic Equations, Angular Kinematics and Projectile
 * Motion. Projectiles launched sideways and at an angle (OpenStax University
 * Physics 4.3), angular speed and belts (10.1), angular acceleration with the
 * suvat equations' turning twins (10.2), and centripetal acceleration (4.4).
 * Angular work counts in revolutions, where the numbers are whole; radians
 * per second are asked as a multiple of pi.
 */
import type { Level } from '../../types';
import { ask, display, prose, stacked, teach } from './blocks';

export const level2: Level = {
  id: 'clm-l2',
  title: 'Motion in Two Dimensions',
  lessons: [
    {
      id: 'clm-l2-horizontal',
      title: 'Launched Sideways',
      slides: [
        teach(
          prose(
            'A ball thrown **horizontally** moves two ways at once, and they do not affect each other. Sideways nothing pushes it, so its speed stays $u$. Downwards it starts at rest and falls with $g$, exactly like a dropped ball:',
          ),
          display('h = \\tfrac{1}{2}gt^{2} = 4.9t^{2} \\qquad R = ut'),
          prose('Thrown at $6\\text{ m s}^{-1}$ from $20\\text{ m}$ up. The square root does not come out exactly, so round where the question says, times to 2 decimal places and distances to 1:'),
          stacked('t^{2} = 20 \\div 4.9 = 4.0816\\ldots', 't = \\sqrt{4.0816\\ldots} = 2.0203\\ldots', 't = 2.02\\text{ s}', 'R = 6 \\times 2.02 = 12.1\\text{ m}'),
          prose('Throw it faster and it lands further out, but at the same moment.'),
        ),
        ask('clm-fall-time'),
        ask('clm-fall-time+choice', 2),
        ask('clm-horiz-slider'),
        teach(
          prose('As it falls it gains downward speed $v_{y} = gt$, while its sideways speed never changes. From the same $20\\text{ m}$, it lands with $v_{y} = 9.8 \\times 2.02 = 19.8\\text{ m s}^{-1}$, to 1 decimal place.'),
          prose('Backwards, for the launch speed: to land $12\\text{ m}$ out after $2.02\\text{ s}$ in the air needs $u = 12 \\div 2.02 = 5.94\\ldots$, which is $6\\text{ m s}^{-1}$ to the nearest half.'),
        ),
        ask('clm-horiz-tree'),
        ask('clm-horiz-slider', 2),
        teach(
          prose('To see whether it reaches a target, work out where it lands and compare. A ball rolls off a $5\\text{ m}$ wall at $6\\text{ m s}^{-1}$:'),
          stacked('t = \\sqrt{5 \\div 4.9} = 1.01\\text{ s}', 'R = 6 \\times 1.01 = 6.1\\text{ m}'),
          prose('So it gets past a mark $5\\text{ m}$ out, by $1.1\\text{ m}$, but not one $7\\text{ m}$ out.'),
        ),
        ask('clm-horiz-flow'),
        ask('clm-horiz-tree', 2),
        ask('clm-horiz-flow', 2),
      ],
      skillCheck: [ask('clm-fall-time', 2), ask('clm-horiz-tree', 2), ask('clm-horiz-flow', 2)],
    },
    {
      id: 'clm-l2-angle',
      title: 'Launched at an Angle',
      slides: [
        teach(
          prose('A launch at speed $u$ at an angle $\\alpha$ above the horizontal splits into a horizontal and a vertical part:'),
          display('u_{x} = u\\cos\\alpha \\qquad u_{y} = u\\sin\\alpha'),
          prose('Given $\\tan\\alpha = \\tfrac{3}{4}$, draw the $3, 4, 5$ triangle: $\\cos\\alpha = \\tfrac{4}{5}$ and $\\sin\\alpha = \\tfrac{3}{5}$. At $20\\text{ m s}^{-1}$:'),
          stacked('u_{x} = 20 \\times \\tfrac{4}{5} = 16', 'u_{y} = 20 \\times \\tfrac{3}{5} = 12'),
          prose('The $5, 12, 13$, the $8, 15, 17$ and the $7, 24, 25$ triangles work the same way.'),
        ),
        ask('clm-launch-table'),
        ask('clm-launch-table', 2),
        teach(
          prose('Up and down is vertical motion under gravity. It rises until $v_{y} = 0$, after $\\frac{u_{y}}{g}$, and over level ground takes as long again to come down. So'),
          display('T = \\frac{2u_{y}}{g} \\qquad H = \\frac{u_{y}^{2}}{2g} \\qquad R = u_{x}T'),
          prose('With $u_{x} = 10$ and $u_{y} = 15$, times to 2 decimal places and the height and range to 1:'),
          stacked('t_{\\text{top}} = 15 \\div 9.8 = 1.5306\\ldots = 1.53', 'T = 2 \\times 1.53 = 3.06', 'H = \\frac{15^{2}}{19.6} = 11.479\\ldots = 11.5', 'R = 10 \\times 3.06 = 30.6'),
        ),
        ask('clm-range-flow'),
        ask('clm-flight-tree'),
        ask('clm-max-height'),
        teach(
          prose('Given a speed and an angle, split it first. At $25\\text{ m s}^{-1}$ with $\\tan\\alpha = \\tfrac{4}{3}$, the $3, 4, 5$ triangle gives $\\sin\\alpha = \\tfrac{4}{5} = 0.8$ and $\\cos\\alpha = \\tfrac{3}{5} = 0.6$:'),
          stacked('u_{x} = 25 \\times 0.6 = 15', 'u_{y} = 25 \\times 0.8 = 20', 'T = \\frac{2 \\times 20}{9.8} = 4.0816\\ldots = 4.08', 'H = \\frac{20^{2}}{19.6} = 20.408\\ldots = 20.4', 'R = 15 \\times 4.08 = 61.2'),
        ),
        ask('clm-flight-tree', 2),
        ask('clm-max-height+choice', 2),
        ask('clm-range-flow', 2),
      ],
      skillCheck: [ask('clm-launch-table', 2), ask('clm-flight-tree', 2), ask('clm-range-flow', 2)],
    },
    {
      id: 'clm-l2-angular',
      title: 'Angular Speed',
      slides: [
        teach(
          prose(
            'A spinning object turns through an angle $\\theta$ measured in radians, and one full turn is $2\\pi$ radians. Its **angular speed** $\\omega$ is the angle turned each second, in $\\text{rad s}^{-1}$.',
          ),
          prose('Machines quote revolutions per minute. $1200$ revolutions a minute is $1200 \\div 60 = 20$ a second, and each is $2\\pi$ radians:'),
          display('\\omega = 20 \\times 2\\pi = 40\\pi\\text{ rad s}^{-1}'),
          prose('Backwards, $40\\pi\\text{ rad s}^{-1}$ is $40\\pi \\div 2\\pi = 20$ turns a second, which is $20 \\times 60 = 1200$ a minute.'),
        ),
        ask('clm-rpm-convert'),
        ask('clm-spin-table'),
        ask('clm-rpm-convert+choice', 2),
        teach(
          prose('A point on the rim, a distance $r$ from the centre, is carried $r$ along for every radian turned:'),
          display('v = r\\omega'),
          prose('A wheel of radius $0.35\\text{ m}$ at $20\\text{ rad s}^{-1}$: $v = 0.35 \\times 20 = 7\\text{ m s}^{-1}$. Backwards, $\\omega = v \\div r$, which rarely ends. A rim moving at $5\\text{ m s}^{-1}$ on that radius, to 1 decimal place:'),
          stacked('\\omega = 5 \\div 0.35 = 14.2857\\ldots', '\\omega = 14.3\\text{ rad s}^{-1}'),
        ),
        ask('clm-rim-speed'),
        ask('clm-rim-speed+choice', 2),
        teach(
          prose('A belt or chain that does not slip moves at the rim speed of both wheels it joins, so'),
          display('r_{1}\\omega_{1} = r_{2}\\omega_{2}'),
          prose(
            'A wheel of radius $0.1\\text{ m}$ at $30\\text{ rad s}^{-1}$ drives the belt at $0.1 \\times 30 = 3\\text{ m s}^{-1}$. That turns a $0.25\\text{ m}$ wheel at $3 \\div 0.25 = 12\\text{ rad s}^{-1}$. A point halfway out on that wheel moves at half its rim speed, $1.5\\text{ m s}^{-1}$.',
          ),
        ),
        ask('clm-gear-tree'),
        ask('clm-spin-table', 2),
        ask('clm-gear-tree', 2),
      ],
      skillCheck: [ask('clm-rpm-convert', 2), ask('clm-rim-speed', 2), ask('clm-gear-tree', 2)],
    },
    {
      id: 'clm-l2-angacc',
      title: 'Angular Acceleration',
      slides: [
        teach(
          prose(
            'When the rate of spin changes steadily, the **angular acceleration** $\\alpha$ is the change in $\\omega$ each second. Here we count in revolutions: $\\omega$ in $\\text{rev s}^{-1}$ and $\\alpha$ in $\\text{rev s}^{-2}$.',
          ),
          prose('Each suvat equation has a turning twin, with $\\theta$ for $s$, $\\omega$ for $v$ and $\\alpha$ for $a$:'),
          display('\\omega = \\omega_{0} + \\alpha t'),
          prose('A drum at $2\\text{ rev s}^{-1}$ speeding up at $0.5\\text{ rev s}^{-2}$ for $6\\text{ s}$ reaches $2 + 0.5 \\times 6 = 5\\text{ rev s}^{-1}$. Backwards, from $2$ to $5$ in $6\\text{ s}$ is $\\alpha = \\frac{5 - 2}{6} = 0.5$.'),
          prose('It rarely divides exactly. From $2$ to $9\\text{ rev s}^{-1}$ in $6\\text{ s}$, to 2 decimal places:'),
          stacked('\\alpha = \\frac{9 - 2}{6} = 1.1666\\ldots', '\\alpha = 1.17\\text{ rev s}^{-2}'),
        ),
        ask('clm-spin-up'),
        ask('clm-spin-up+choice', 2),
        teach(
          prose('The number of turns comes from the average rate, just as a distance does:'),
          display('\\theta = \\tfrac{1}{2}(\\omega_{0} + \\omega)t'),
          prose('The drum above averages $\\frac{2 + 5}{2} = 3.5\\text{ rev s}^{-1}$ for $6\\text{ s}$, so it makes $3.5 \\times 6 = 21$ turns.'),
        ),
        ask('clm-spin-turns-tree'),
        ask('clm-spin-turns-tree', 2),
        teach(
          prose('The other two twins:'),
          display('\\theta = \\omega_{0}t + \\tfrac{1}{2}\\alpha t^{2} \\qquad \\omega^{2} = \\omega_{0}^{2} + 2\\alpha\\theta'),
          prose('Pick the one without the quantity you are neither given nor asked for.'),
          prose('From $2\\text{ rev s}^{-1}$ at $0.5\\text{ rev s}^{-2}$ for $4\\text{ s}$: $\\theta = 2 \\times 4 + \\tfrac{1}{2} \\times 0.5 \\times 4^{2} = 12$ turns.'),
          prose('Given those $12$ turns instead of the time: $\\omega^{2} = 2^{2} + 2 \\times 0.5 \\times 12 = 16$, so $\\omega = 4$.'),
          prose('A wheel at $6\\text{ rev s}^{-1}$ slowing at $0.75\\text{ rev s}^{-2}$ until it stops: $0 = 6^{2} - 2 \\times 0.75\\theta$, so $\\theta = 36 \\div 1.5 = 24$ turns.'),
        ),
        ask('clm-spin-stop-slider'),
        ask('clm-spin-flow'),
        ask('clm-spin-stop-slider', 2),
        ask('clm-spin-flow', 2),
      ],
      skillCheck: [ask('clm-spin-up', 2), ask('clm-spin-turns-tree', 2), ask('clm-spin-flow', 2)],
    },
    {
      id: 'clm-l2-centripetal',
      title: 'Centripetal Acceleration',
      slides: [
        teach(
          prose(
            'Going round a circle at a steady speed is still accelerating, because the direction keeps changing. The acceleration points to the **centre**, and its size is',
          ),
          display('a = \\frac{v^{2}}{r}'),
          prose('A car at $10\\text{ m s}^{-1}$ round a roundabout of radius $20\\text{ m}$: $a = 100 \\div 20 = 5\\text{ m s}^{-2}$. Backwards, $v^{2} = ar = 5 \\times 20 = 100$, so $v = 10$.'),
          prose('Most do not come out exactly, so round as the question asks. At $9\\text{ m s}^{-1}$ round a radius of $7\\text{ m}$, to 1 decimal place:'),
          stacked('a = 81 \\div 7 = 11.571\\ldots', 'a = 11.6\\text{ m s}^{-2}'),
          prose('With the angular speed, $\\omega = \\frac{v}{r}$: that car turns at $10 \\div 20 = 0.5\\text{ rad s}^{-1}$, and $r = \\frac{v}{\\omega}$ gives the radius back.'),
        ),
        ask('clm-centripetal'),
        ask('clm-circle-table'),
        ask('clm-centripetal+choice', 2),
        teach(
          prose('For a set acceleration at a set speed, rearrange for the radius:'),
          display('r = \\frac{v^{2}}{a}'),
          prose('At $12\\text{ m s}^{-1}$, keeping to $4\\text{ m s}^{-2}$ needs $r = 144 \\div 4 = 36\\text{ m}$. Faster, the bend must be wider.'),
        ),
        ask('clm-radius-slider'),
        ask('clm-circle-table', 2),
        teach(
          prose('Ride designers quote accelerations in $g$, multiples of $9.8\\text{ m s}^{-2}$. At $14\\text{ m s}^{-1}$ round a loop of radius $10\\text{ m}$:'),
          stacked('a = \\frac{14^{2}}{10} = 19.6', '19.6 \\div 9.8 = 2'),
          prose('So the turning alone gives $2g$. Usually it does not come out whole: at $15\\text{ m s}^{-1}$ round a loop of radius $11\\text{ m}$, each to 1 decimal place,'),
          stacked('a = \\frac{15^{2}}{11} = 20.4545\\ldots = 20.5', '20.5 \\div 9.8 = 2.0918\\ldots = 2.1'),
          prose('So about $2.1g$.'),
        ),
        ask('clm-g-force-flow'),
        ask('clm-radius-slider', 2),
        ask('clm-g-force-flow', 2),
      ],
      skillCheck: [ask('clm-centripetal', 2), ask('clm-circle-table', 2), ask('clm-g-force-flow', 2)],
    },
  ],
  levelCheck: [
    ask('clm-fall-time', 2),
    ask('clm-horiz-tree', 2),
    ask('clm-horiz-flow', 2),
    ask('clm-launch-table', 2),
    ask('clm-flight-tree', 2),
    ask('clm-range-flow', 2),
    ask('clm-rpm-convert', 2),
    ask('clm-gear-tree', 2),
    ask('clm-spin-up', 2),
    ask('clm-spin-flow', 2),
    ask('clm-centripetal', 2),
    ask('clm-g-force-flow', 2),
  ],
};
