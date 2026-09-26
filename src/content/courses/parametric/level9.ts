/**
 * Parametric & Implicit, level 9: Modelling with Parametric Equations.
 *
 * Paths in context, with $t$ the time in seconds and distances in metres:
 * steady motion in a straight line (a drone, a boat) and a ball thrown with
 * gravity taken as $10$ m/s². Where it is at a time, when it gets somewhere,
 * the top of a throw, whether two boats collide, and the path with $t$
 * eliminated. Generators in `generators/paramModel.ts`.
 */
import type { Level } from '../../types';
import { ask, diagram, display, prose, teach } from './blocks';
import { motionSvg } from '../../generators/paramModel';

/** x = 4t, y = 20t - 5t^2, the worked ball of the level: lands at t = 4, x = 16, top (8, 20). */
const ball = (t: number): [number, number] => [4 * t, 20 * t - 5 * t * t];

export const level9: Level = {
  id: 'pi-l9',
  title: 'Modelling with Parametric Equations',
  lessons: [
    {
      id: 'pi-l9-position',
      title: 'Position at a Time',
      slides: [
        teach(
          prose(
            'In a model, $t$ is the time in seconds and distances are in metres. A drone flies so that after $t$ seconds it is at',
          ),
          display('x = 4 + 3t \\qquad y = 10 + 2t'),
          prose('$x$ is how far across it is and $y$ is its height. For where it is at $t = 5$, put $5$ into both equations:'),
          display('x = 4 + 3 \\times 5 = 19'),
          display('y = 10 + 2 \\times 5 = 20'),
          diagram(
            motionSvg((t) => [4 + 3 * t, 10 + 2 * t], {
              tMax: 7,
              xLo: -2,
              xHi: 28,
              yLo: -2,
              yHi: 26,
              marks: [
                [4, 10, '(4, 10)', 'below'],
                [19, 20, '(19, 20)', 'below'],
              ],
              label: 'The straight path of the drone, starting at (4, 10) and passing (19, 20) at t = 5',
            }),
          ),
          prose(
            'So it is at $(19, 20)$. At $t = 0$ every $t$ term is zero, so $(4, 10)$ is where it **starts**; each second it moves $3$ across and $2$ up. A boat works the same way, with $x$ and $y$ its position on a map.',
          ),
        ),
        ask('pmod-line-point'),
        ask('pmod-start'),
        ask('pmod-line-point+choice', 2),
        teach(
          prose('How far it has moved across is the change in $x$. For the drone, $x = 4$ at $t = 0$ and $x = 19$ at $t = 5$, so in the first $5$ seconds it moves'),
          display('19 - 4 = 15'),
          prose('metres across: $3$ metres a second for $5$ seconds.'),
          prose('Between two later times, take $x$ at the first from $x$ at the second. At $t = 2$ it has $x = 10$ and at $t = 6$ it has $x = 22$, so from $t = 2$ to $t = 6$ it moves'),
          display('22 - 10 = 12'),
          prose('metres across.'),
        ),
        ask('pmod-moved'),
        ask('pmod-start', 2),
        teach(
          prose(
            'A ball thrown from the ground moves across at a steady speed while gravity slows its climb. With gravity taken as $10$ metres per second squared, a ball thrown at $u$ metres per second across and $v$ metres per second up is at',
          ),
          display('x = ut \\qquad y = vt - 5t^{2}'),
          prose('The $5$ is half of the $10$. Take a ball at'),
          display('x = 4t \\qquad y = 20t - 5t^{2}'),
          prose('At $t = 3$, work out each part of $y$, then take one from the other:'),
          display('y = 20(3) - 5(3)^{2}'),
          display('= 60 - 45 = 15'),
          diagram(
            motionSvg(ball, {
              tMax: 4,
              xLo: -1.6,
              xHi: 17,
              yLo: -2.2,
              yHi: 24,
              marks: [
                [0, 0],
                [12, 15, '(12, 15)'],
              ],
              label: 'The curved path of the ball, rising from the origin and falling back to the ground, with the point (12, 15) at t = 3 marked',
            }),
          ),
          prose('Square the $3$ first, then multiply by $5$. Across, $x$ is $4 \\times 3$, which is $12$, so after $3$ seconds it is $12$ metres across and $15$ metres up.'),
        ),
        ask('pmod-height-tree'),
        ask('pmod-height-tree', 2),
      ],
      skillCheck: [ask('pmod-line-point', 2), ask('pmod-moved', 2), ask('pmod-height-tree', 2)],
    },
    {
      id: 'pi-l9-when',
      title: 'When and Where',
      slides: [
        teach(
          prose(
            'To find **when** something happens, set the coordinate you know equal to its value and solve for $t$. Then put that $t$ into the other equation for **where**.',
          ),
          prose('A drone is at'),
          display('x = 4 + 3t \\qquad y = 10 + 2t'),
          prose('When is it $30$ metres up?'),
          display('10 + 2t = 30'),
          display('2t = 20 \\qquad t = 10'),
          prose('Then put $t = 10$ into $x$:'),
          display('x = 4 + 3 \\times 10 = 34'),
          prose('so it is at $(34, 30)$.'),
          prose('A boat at'),
          display('x = 2 + 5t \\qquad y = 8 - t'),
          prose('reaches $x = 17$ when'),
          display('2 + 5t = 17'),
          display('5t = 15 \\qquad t = 3'),
          prose('and then $y$ is $8 - 3$, which is $5$.'),
        ),
        ask('pmod-reach-time'),
        ask('pmod-reach-tree'),
        ask('pmod-reach-time+choice', 2),
        teach(
          prose('A ball thrown from the ground lands when its height is $0$ again. For the ball at'),
          display('x = 4t \\qquad y = 20t - 5t^{2}'),
          prose('set $y$ to $0$:'),
          display('20t - 5t^{2} = 0'),
          display('5t(4 - t) = 0'),
          display('t = 0 \\quad \\text{or} \\quad t = 4'),
          diagram(
            motionSvg(ball, {
              tMax: 4,
              xLo: -1.6,
              xHi: 17,
              yLo: -2.2,
              yHi: 24,
              marks: [
                [0, 0],
                [16, 0, '(16, 0)'],
              ],
              label: 'The path of the ball from where it is thrown at the origin to where it lands at (16, 0)',
            }),
          ),
          prose(
            '$t = 0$ is the moment it is thrown, so it lands at $t = 4$. Across, $x$ is then $4 \\times 4$, which is $16$: it lands $16$ metres away.',
          ),
        ),
        ask('pmod-land-time'),
        ask('pmod-landing-tree'),
        ask('pmod-land-time+choice', 2),
        teach(
          prose('A rate can be negative. A drone whose height is'),
          display('y = 40 - 3t'),
          prose('is coming down. It is $19$ metres up when'),
          display('40 - 3t = 19'),
          display('3t = 21 \\qquad t = 7'),
          prose('The order never changes: $t$ first, from the coordinate you know, then the other coordinate at that $t$.'),
        ),
        ask('pmod-reach-tree', 2),
        ask('pmod-landing-tree', 2),
      ],
      skillCheck: [ask('pmod-reach-time', 2), ask('pmod-landing-tree', 2), ask('pmod-land-time', 2)],
    },
    {
      id: 'pi-l9-highest',
      title: 'The Highest Point',
      slides: [
        teach(
          prose(
            'At the top of its flight the ball stops rising for a moment: the tangent to its path is horizontal, so $\\frac{dy}{dt} = 0$, as in Parametric Curves. For the ball at',
          ),
          display('x = 4t \\qquad y = 20t - 5t^{2}'),
          prose('that gives'),
          display('\\frac{dy}{dt} = 20 - 10t'),
          display('20 - 10t = 0 \\qquad t = 2'),
          prose('Put $t = 2$ into $y$ for the greatest height:'),
          display('y = 20(2) - 5(2)^{2}'),
          display('= 40 - 20 = 20'),
          diagram(
            motionSvg(ball, {
              tMax: 4,
              xLo: -1.6,
              xHi: 17,
              yLo: -2.2,
              yHi: 24,
              marks: [[8, 20, '(8, 20)']],
              label: 'The path of the ball with its highest point, (8, 20), marked',
            }),
          ),
          prose('In general'),
          display('\\frac{dy}{dt} = v - 10t'),
          prose('so the top is at $t = \\frac{v}{10}$: halfway to landing.'),
        ),
        ask('pmod-top-time'),
        ask('pmod-top-slider'),
        ask('pmod-top'),
        teach(
          prose('Where the top is needs $x$ as well, at the same $t$. For $x = 4t$ at $t = 2$, $x = 8$, so the highest point is $(8, 20)$.'),
          prose('For a ball at'),
          display('x = 3t \\qquad y = 30t - 5t^{2}'),
          prose('the top comes when'),
          display('30 - 10t = 0 \\qquad t = 3'),
          display('x = 9 \\qquad y = 90 - 45 = 45'),
          prose('So its highest point is $(9, 45)$.'),
        ),
        ask('pmod-peak-tree'),
        ask('pmod-top-time+choice', 2),
        teach(
          prose('Thrown from a height of $h$ metres, the ball starts at $y = h$:'),
          display('y = h + vt - 5t^{2}'),
          prose(
            'The $h$ does not change $\\frac{dy}{dt}$, so the top comes at the same time; the height gains $h$. For',
          ),
          display('y = 15 + 20t - 5t^{2}'),
          prose('the top is still at $t = 2$, and'),
          display('y = 15 + 40 - 20 = 35'),
        ),
        ask('pmod-top', 2),
        ask('pmod-top-slider', 2),
        ask('pmod-peak-tree', 2),
      ],
      skillCheck: [ask('pmod-top', 2), ask('pmod-peak-tree', 2), ask('pmod-top-time', 2)],
    },
    {
      id: 'pi-l9-meet',
      title: 'Do the Paths Meet?',
      slides: [
        teach(
          prose(
            'Two boats **collide** only if they are at the same place at the same time. Find the time their $x$-coordinates agree, then check their $y$-coordinates at that same time.',
          ),
          prose('Boat A is at'),
          display('x = 1 + 3t \\qquad y = 2 + t'),
          prose('and boat B is at'),
          display('x = 9 + t \\qquad y = 14 - 2t'),
          prose('Set the $x$-coordinates equal:'),
          display('1 + 3t = 9 + t'),
          display('2t = 8 \\qquad t = 4'),
          prose('At $t = 4$, A has'),
          display('y = 2 + 4 = 6'),
          prose('and B has'),
          display('y = 14 - 2 \\times 4 = 6'),
          prose('Both are at $(13, 6)$ at the same moment: they collide.'),
        ),
        ask('pmod-meet-time'),
        ask('pmod-meet-tree'),
        ask('pmod-meet-time+choice', 2),
        teach(
          prose('If the $y$-coordinates differ at that time, the boats do not collide, even when their paths cross: they reach the crossing at different times.'),
          prose('A is at $x = 2t$, $y = 5 + t$ and B at $x = 6 + t$, $y = 3t$. Their $x$ agree when'),
          display('2t = 6 + t \\qquad t = 6'),
          prose('Then A has $y = 11$ and B has $y = 18$. Different places at that moment, so no collision.'),
        ),
        ask('pmod-meet-flow'),
        ask('pmod-meet-tree', 2),
        teach(
          prose(
            'Always check both coordinates at the **same** $t$. Matching $x$ alone only says the boats are level across at that moment; the $y$-coordinates decide whether they meet.',
          ),
        ),
        ask('pmod-meet-flow', 2),
      ],
      skillCheck: [ask('pmod-meet-time', 2), ask('pmod-meet-tree', 2), ask('pmod-meet-flow', 2)],
    },
    {
      id: 'pi-l9-path',
      title: 'The Path without t',
      slides: [
        teach(
          prose(
            'The path itself has an equation in $x$ and $y$ only. As in Parametric Curves, make $t$ the subject of the $x$ equation, then put it into the $y$ equation. For a boat at',
          ),
          display('x = 3 + 2t \\qquad y = 1 + 6t'),
          prose('make $t$ the subject, then substitute:'),
          display('t = \\frac{x - 3}{2}'),
          display('y = 1 + 6 \\times \\frac{x - 3}{2}'),
          display('y = 1 + 3(x - 3)'),
          display('y = 3x - 8'),
          prose('Check with the start, $(3, 1)$: at $x = 3$ the line gives $3 \\times 3 - 8$, which is $1$. Steady motion always gives a straight line.'),
        ),
        ask('pmod-line-path'),
        ask('pmod-path-flow'),
        ask('pmod-line-path+choice', 2),
        teach(
          prose('For a thrown ball, $x = ut$ gives $t = \\frac{x}{u}$. For the ball at'),
          display('x = 5t \\qquad y = 20t - 5t^{2}'),
          prose('make $t$ the subject, then substitute:'),
          display('t = \\frac{x}{5}'),
          display('y = 20 \\times \\frac{x}{5} - 5\\left(\\frac{x}{5}\\right)^{2}'),
          display('y = 4x - \\frac{5x^{2}}{25}'),
          display('y = 4x - \\frac{x^{2}}{5}'),
          prose('Square the whole of $\\frac{x}{5}$, then cancel. The path is a parabola.'),
        ),
        ask('pmod-ball-path'),
        ask('pmod-path-flow', 2),
        ask('pmod-ball-path+choice', 2),
        teach(
          prose(
            'The model only holds while the ball is in the air: from the throw at $t = 0$ until it lands. The ball above lands when',
          ),
          display('5t(4 - t) = 0'),
          prose('at $t = 4$, so'),
          display('0 \\le t \\le 4'),
          prose('Across, that is $x$ from $0$ up to $5 \\times 4$, which is $20$:'),
          display('0 \\le x \\le 20'),
          prose('Before $t = 0$ it had not been thrown, and after $t = 4$ the formula gives a negative height.'),
        ),
        ask('pmod-domain'),
        ask('pmod-domain', 2),
      ],
      skillCheck: [ask('pmod-line-path', 2), ask('pmod-ball-path', 2), ask('pmod-domain', 2)],
    },
  ],
  levelCheck: [
    ask('pmod-line-point', 2),
    ask('pmod-moved+choice', 2),
    ask('pmod-height-tree', 2),
    ask('pmod-reach-tree', 2),
    ask('pmod-land-time', 2),
    ask('pmod-landing-tree', 2),
    ask('pmod-top', 2),
    ask('pmod-peak-tree', 2),
    ask('pmod-top-slider', 2),
    ask('pmod-meet-time+choice', 2),
    ask('pmod-meet-flow', 2),
    ask('pmod-line-path', 2),
    ask('pmod-ball-path', 2),
    ask('pmod-domain', 2),
  ],
};
