/**
 * Forces and Newton's Laws.
 *
 * Why things move, where Kinematics describes how. Level 1 is statics: a
 * force as a vector in i, j form with its magnitude and direction, the
 * resultant of two or three forces, resolving a force into parts at right
 * angles, equilibrium on a level surface with weight, normal reaction and
 * tension, and equilibrium on a slope with friction up to its limit, F <= mu R.
 * Level 2 is dynamics: F = ma along a line and with vectors, connected
 * particles on a tow bar and over a pulley, motion on a rough slope, Newton's
 * third law and the force between two touching bodies, and lifts.
 *
 * Vectors, right-angled trigonometry and Pythagoras are used here, not taught
 * again: each angle is given through a 3-4-5 or 7-24-25 triangle so the sine
 * and cosine are exact, and a lesson says how to read them off. g = 9.8 is
 * stated where weight first appears and in every question that needs it.
 * Several lessons will later draw their free-body diagrams with the `forces`
 * widget (see docs/roadmap/levels/forces.md); for now the diagrams are teach
 * figures. Each level closes with a level check: questions only, no teaching
 * slides, one attempt each.
 */
import type { Block, Course, SlideRef } from '../types';
import { A34, A43, arrowsSvg, hangingSvg, pulleySvg, slopeSvg } from '../generators/forces';

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
const diagram = (svg: string): Block => ({ kind: 'diagram', svg });

/** Lines of working stacked in one display and aligned on their `&`. */
const working = (...lines: string[]): Block => display(`\\begin{aligned} ${lines.join(' \\\\ ')} \\end{aligned}`);

export const forces: Course = {
  id: 'forces',
  category: 'mechanics',
  // After Kinematics (10): motion is described first, then explained.
  position: 20,
  title: "Forces and Newton's Laws",
  blurb: 'Why things move: forces as vectors, resolving, equilibrium and friction, then F = ma, connected particles, slopes and lifts.',
  levels: [
    {
      id: 'fo-l1',
      title: 'Forces and Equilibrium',
      lessons: [
        {
          id: 'fo-l1-vectors',
          title: 'Forces as Vectors',
          slides: [
            teach(
              prose(
                'A **force** is a push or a pull. Its size is measured in **newtons** (N), and it acts in a direction, so a force is a vector.',
              ),
              prose(
                'In $\\mathbf{i}$, $\\mathbf{j}$ form, $\\mathbf{i}$ is one newton to the right and $\\mathbf{j}$ one newton up. So $\\mathbf{F} = (3\\mathbf{i} + 4\\mathbf{j})\\text{ N}$ pulls $3\\text{ N}$ to the right and $4\\text{ N}$ up at once.',
              ),
              diagram(arrowsSvg([{ to: [3, 4], name: 'F' }], { span: 6, grid: true, label: 'The force 3i + 4j drawn from the origin on a grid' })),
              prose('The two parts are at right angles, so the **magnitude** of the force, its size, comes from Pythagoras:'),
              display('|\\mathbf{F}| = \\sqrt{3^{2} + 4^{2}} = 5\\text{ N}'),
            ),
            ask('force-ij-tiles'),
            ask('force-magnitude'),
            ask('force-component-slider'),
            teach(
              prose(
                'The **direction** of a force is usually the angle it makes with $\\mathbf{i}$. The right-angled triangle under the arrow gives it: for $3\\mathbf{i} + 4\\mathbf{j}$, $\\tan\\theta = \\tfrac{4}{3}$, so $\\theta = 53.1^{\\circ}$.',
              ),
              prose(
                'A force pointing left makes an angle bigger than $90^{\\circ}$ with $\\mathbf{i}$: take the triangle\'s angle away from $180^{\\circ}$.',
              ),
              prose(
                'Going the other way, a force of $15\\text{ N}$ in the direction of $3\\mathbf{i} + 4\\mathbf{j}$ is that vector scaled up. The vector has length $5$, so multiply it by $\\tfrac{15}{5} = 3$:',
              ),
              display('\\mathbf{F} = 3(3\\mathbf{i} + 4\\mathbf{j}) = (9\\mathbf{i} + 12\\mathbf{j})\\text{ N}'),
            ),
            ask('force-direction'),
            ask('force-from-magnitude'),
            ask('force-ij-tiles', 2),
            teach(
              prose(
                'Pythagoras also runs backwards. If $\\mathbf{F} = (p\\mathbf{i} + 12\\mathbf{j})\\text{ N}$ has magnitude $13\\text{ N}$, then $p^{2} + 12^{2} = 13^{2}$, so $p^{2} = 25$ and $p = \\pm 5$. What else you are told picks the sign.',
              ),
              prose(
                'A force of size $F$ at an angle $\\alpha$ to $\\mathbf{i}$ has parts $F\\cos\\alpha$ across and $F\\sin\\alpha$ up. When you are given $\\tan\\alpha = \\tfrac{3}{4}$, draw the $3$, $4$, $5$ triangle: $\\sin\\alpha = 0.6$ and $\\cos\\alpha = 0.8$.',
              ),
            ),
            ask('force-component-slider', 2),
            ask('force-magnitude', 2),
          ],
          skillCheck: [ask('force-magnitude', 2), ask('force-ij-tiles', 2), ask('force-direction', 2)],
        },
        {
          id: 'fo-l1-resultant',
          title: 'Resultant Forces',
          slides: [
            teach(
              prose(
                'When several forces act on one particle, their combined effect is the **resultant**, $\\mathbf{R}$. Add the $\\mathbf{i}$ parts, then the $\\mathbf{j}$ parts:',
              ),
              display('(2\\mathbf{i} + 5\\mathbf{j}) + (4\\mathbf{i} - 3\\mathbf{j}) = 6\\mathbf{i} + 2\\mathbf{j}'),
              diagram(
                arrowsSvg(
                  [
                    { to: [2, 5], name: 'P', faint: true },
                    { from: [2, 5], to: [6, 2], name: 'Q', faint: true },
                    { to: [6, 2], name: 'R' },
                  ],
                  { span: 7, grid: true, label: 'Two forces drawn head to tail, and their resultant from the start of the first to the end of the second' },
                ),
              ),
              prose(
                'Drawn head to tail, the resultant runs from the start of the first force to the end of the last. Its magnitude is Pythagoras on its two parts, as before: here $\\sqrt{6^{2} + 2^{2}} = \\sqrt{40}$.',
              ),
            ),
            ask('force-resultant-tiles'),
            ask('force-resultant-tree'),
            ask('force-resultant-slider'),
            teach(
              prose('Three forces work the same way: one sum for the $\\mathbf{i}$ parts, one for the $\\mathbf{j}$ parts.'),
              prose(
                'Two forces at **right angles** to each other make a right-angled triangle with their resultant, which is the hypotenuse. Forces of $6\\text{ N}$ and $8\\text{ N}$ at right angles have a resultant of $\\sqrt{6^{2} + 8^{2}} = 10\\text{ N}$.',
              ),
            ),
            ask('force-perpendicular'),
            ask('force-resultant-tiles', 2),
            ask('force-perpendicular+choice', 2),
            teach(
              prose(
                'A resultant **parallel to $\\mathbf{i}$** has no $\\mathbf{j}$ part, so its $\\mathbf{j}$ sum is zero. That is often how an unknown is found:',
              ),
              working('\\mathbf{R} &= (3\\mathbf{i} + q\\mathbf{j}) + (5\\mathbf{i} - 2\\mathbf{j})', '&= 8\\mathbf{i} + (q - 2)\\mathbf{j}'),
              prose('So $q - 2 = 0$, and $q = 2$.'),
              prose(
                'Parallel to $\\mathbf{i} + 2\\mathbf{j}$ means the two parts are in the ratio $1 : 2$: the $\\mathbf{j}$ part is twice the $\\mathbf{i}$ part.',
              ),
            ),
            ask('force-parallel'),
            ask('force-resultant-tree', 2),
          ],
          skillCheck: [ask('force-resultant-tiles', 2), ask('force-parallel', 2), ask('force-resultant-tree', 2)],
        },
        {
          id: 'fo-l1-resolve',
          title: 'Resolving Forces',
          slides: [
            teach(
              prose(
                'A force $F$ at an angle $\\alpha$ above the horizontal does two jobs at once: it pulls across by $F\\cos\\alpha$ and up by $F\\sin\\alpha$. Splitting it like this is called **resolving**.',
              ),
              diagram(
                arrowsSvg(
                  [
                    { to: [4, 3], name: 'F' },
                    { to: [4, 0], faint: true },
                    { from: [4, 0], to: [4, 3], faint: true },
                  ],
                  { span: 5, axes: false, lines: [[[-4.5, 0], [0, 0]]], label: 'A force at an angle above the horizontal, with its horizontal and vertical parts drawn faint' },
                ),
              ),
              prose(
                'The part next to the angle takes the cosine and the part opposite takes the sine. With $\\sin\\alpha = 0.6$ and $\\cos\\alpha = 0.8$, a $10\\text{ N}$ force resolves into $8\\text{ N}$ across and $6\\text{ N}$ up.',
              ),
            ),
            ask('force-resolve-tiles'),
            ask('force-which-trig'),
            ask('force-component-slider', 2),
            teach(
              prose(
                'To combine several forces at angles, resolve each one, taking right and up as positive, and add down each direction. The total in a direction is the **net force** that way.',
              ),
              prose(
                'Take $20\\text{ N}$ at $\\alpha$ above the horizontal, where $\\cos\\alpha = 0.8$ and $\\sin\\alpha = 0.6$, with $5\\text{ N}$ to the left and $12\\text{ N}$ down:',
              ),
              working('\\rightarrow\\; &20(0.8) - 5 = 11', '\\uparrow\\; &20(0.6) - 12 = 0'),
              prose('Here the net force is $11\\text{ N}$ to the right and nothing vertically.'),
            ),
            ask('force-resolve-table'),
            ask('force-net-steps'),
            ask('force-resolve-tiles', 2),
            teach(
              prose(
                'An angle measured from the **vertical** swaps the two: the part next to the angle is now vertical, so it takes the cosine, and the horizontal part takes the sine.',
              ),
              prose(
                'On a slope inclined at $\\alpha$, the weight $W$ splits into $W\\sin\\alpha$ down the slope and $W\\cos\\alpha$ pressing into it. Draw the angle in, then ask which side is next to it.',
              ),
            ),
            ask('force-which-trig', 2),
            ask('force-resolve-table', 2),
          ],
          skillCheck: [ask('force-resolve-tiles', 2), ask('force-net-steps', 2), ask('force-resolve-table', 2)],
        },
        {
          id: 'fo-l1-equilibrium',
          title: 'Equilibrium',
          slides: [
            teach(
              prose(
                'Near the Earth, gravity pulls a particle of mass $m\\text{ kg}$ straight down with its **weight**, $W = mg$ newtons. Here $g = 9.8\\text{ m s}^{-2}$, and every question in this course takes $g = 9.8$.',
              ),
              prose(
                'A surface pushes back on a particle resting on it with the **normal reaction** $R$, at right angles to the surface. On a level floor with nothing else acting, $R = mg$.',
              ),
              diagram(
                arrowsSvg(
                  [
                    { to: [0, -3.6], name: 'W' },
                    { to: [0, 3.6], name: 'R' },
                    { to: [2.4, 1.8], name: 'P', faint: true },
                  ],
                  { span: 5, axes: false, lines: [[[-4.6, 0], [4.6, 0]]], dot: [0, 0], label: 'A particle on a level floor, with its weight down, the normal reaction up and a pull at an angle' },
                ),
              ),
              prose(
                'A pull $P$ upwards at an angle takes some of the load, so $R = mg - P\\sin\\alpha$. A push down at an angle adds to it.',
              ),
            ),
            ask('force-weight'),
            ask('force-normal-tree'),
            ask('force-weight+choice', 2),
            teach(
              prose(
                'A particle is in **equilibrium** when the forces on it add to zero. Resolve in two directions at right angles: each total must be zero.',
              ),
              prose(
                'A string pulls with a **tension** $T$ along the string, away from the particle. A missing force in equilibrium is minus the sum of all the others:',
              ),
              display('\\mathbf{F}_{3} = -(\\mathbf{F}_{1} + \\mathbf{F}_{2})'),
            ),
            ask('force-equilibrium-flow'),
            ask('force-equilibrium-tiles'),
            ask('force-normal-tree', 2),
            teach(
              prose(
                'A particle hanging on a string, held aside by a horizontal force $P$, has three forces on it: $T$, $P$ and its weight.',
              ),
              diagram(hangingSvg(A34)),
              prose(
                'With the string at $\\alpha$ to the vertical, resolve up and across. The vertical part of the tension holds up the weight, and its horizontal part balances $P$:',
              ),
              working('T\\cos\\alpha &= mg', 'T\\sin\\alpha &= P'),
            ),
            ask('force-hanging'),
            ask('force-equilibrium-tiles', 2),
          ],
          skillCheck: [ask('force-weight', 2), ask('force-normal-tree', 2), ask('force-equilibrium-tiles', 2)],
        },
        {
          id: 'fo-l1-friction',
          title: 'Slopes and Friction',
          slides: [
            teach(
              prose(
                'On a slope inclined at $\\alpha$, resolve along the slope and at right angles to it rather than across and up. The weight splits into $mg\\sin\\alpha$ down the slope and $mg\\cos\\alpha$ into it.',
              ),
              diagram(slopeSvg(A34)),
              prose(
                'On a **smooth** slope nothing else acts along it, so a particle needs a force up the slope to stay still. At right angles, $R = mg\\cos\\alpha$ when nothing else presses in.',
              ),
            ),
            ask('force-slope-tiles'),
            ask('force-slope-hold'),
            ask('force-slope-hold+choice', 2),
            teach(
              prose(
                'A **rough** surface also pushes along itself with **friction**, $F$, against the way the particle moves or would move. Friction only grows as far as it needs to, up to a limit:',
              ),
              display('F \\le \\mu R'),
              prose(
                '$\\mu$ is the **coefficient of friction**. A push smaller than $\\mu R$ is matched exactly and nothing moves. A push bigger than $\\mu R$ wins, and the particle slides with friction stuck at $\\mu R$.',
              ),
              prose('At exactly $\\mu R$ the particle is in **limiting equilibrium**, on the point of moving.'),
            ),
            ask('force-friction-flow'),
            ask('force-friction-tree'),
            ask('force-slope-tiles', 2),
            teach(
              prose(
                'On a rough slope, friction acts **up** the slope when the particle is about to slide down, and **down** it when the particle is about to be pushed up.',
              ),
              diagram(slopeSvg(A34, { friction: true, pull: 'along' })),
              prose(
                'In limiting equilibrium, find $R$ by resolving at right angles to the slope, set $F = \\mu R$, then resolve along the slope.',
              ),
            ),
            ask('force-limiting-slope'),
            ask('force-friction-tree', 2),
          ],
          skillCheck: [ask('force-slope-tiles', 2), ask('force-friction-tree', 2), ask('force-limiting-slope', 2)],
        },
      ],
      levelCheck: [
        ask('force-magnitude', 2),
        ask('force-ij-tiles', 2),
        ask('force-direction', 2),
        ask('force-resultant-tiles', 2),
        ask('force-parallel', 2),
        ask('force-resolve-tiles', 2),
        ask('force-resolve-table', 2),
        ask('force-net-steps', 2),
        ask('force-weight', 2),
        ask('force-normal-tree', 2),
        ask('force-equilibrium-tiles', 2),
        ask('force-hanging', 2),
        ask('force-slope-hold', 2),
        ask('force-limiting-slope', 2),
      ],
    },
    {
      id: 'fo-l2',
      title: "Newton's Laws",
      lessons: [
        {
          id: 'fo-l2-fma',
          title: 'F = ma',
          slides: [
            teach(
              prose(
                "**Newton's first law**: a particle stays at rest, or keeps moving in a straight line at a constant speed, unless a resultant force acts on it.",
              ),
              prose("**Newton's second law** says what a resultant force does: it accelerates the particle."),
              display('F = ma'),
              prose(
                '$F$ is the resultant force in newtons, $m$ the mass in kilograms and $a$ the acceleration in $\\text{m s}^{-2}$. A $12\\text{ N}$ resultant on a $4\\text{ kg}$ particle gives $a = 3\\text{ m s}^{-2}$.',
              ),
            ),
            ask('force-fma'),
            ask('force-newton1-flow'),
            ask('force-fma-slider'),
            teach(
              prose(
                'Usually more than one force acts. Take the direction of motion as positive and find the resultant first: a driving force $P$ against a resistance $R$ gives',
              ),
              display('P - R = ma'),
              prose(
                'If the resistance wins, $a$ comes out negative: the particle is slowing down. A rope lifting a crate works the same way upwards, with the weight as the force against it: $T - mg = ma$.',
              ),
            ),
            ask('force-resistance-tree'),
            ask('force-fma+choice', 2),
            ask('force-newton1-flow', 2),
            teach(
              prose(
                '$\\mathbf{F} = m\\mathbf{a}$ holds for vectors too. Add the forces to get the resultant, then divide each part by the mass.',
              ),
              prose('Forces of $(6\\mathbf{i} - 2\\mathbf{j})\\text{ N}$ and $(2\\mathbf{i} + 6\\mathbf{j})\\text{ N}$ act on a $4\\text{ kg}$ particle:'),
              working('\\mathbf{F} &= 8\\mathbf{i} + 4\\mathbf{j}', '\\mathbf{a} &= \\tfrac{1}{4}(8\\mathbf{i} + 4\\mathbf{j})', '&= 2\\mathbf{i} + \\mathbf{j}'),
            ),
            ask('force-fma-ij'),
            ask('force-resistance-tree', 2),
          ],
          skillCheck: [ask('force-fma', 2), ask('force-resistance-tree', 2), ask('force-fma-ij', 2)],
        },
        {
          id: 'fo-l2-connected',
          title: 'Connected Particles',
          slides: [
            teach(
              prose(
                'A car of mass $M$ tows a trailer of mass $m$ on a rigid tow bar, with driving force $D$ and resistances $r_{1}$ on the car and $r_{2}$ on the trailer. They move as one, with the same acceleration.',
              ),
              prose('Treated as one body, the tow bar is **internal**, pulling each way equally, so it drops out:'),
              display('D - r_{1} - r_{2} = (M + m)a'),
              prose(
                'Then look at the trailer alone to find the tension $T$ in the tow bar. Only $T$ and the trailer\'s own resistance act on it: $T - r_{2} = ma$.',
              ),
            ),
            ask('force-towing-tree'),
            ask('force-tow-bar-steps'),
            ask('force-towing-tree', 2),
            teach(
              prose(
                'Two particles on a light string over a smooth pulley also share one acceleration, and the tension is the same on both sides.',
              ),
              diagram(pulleySvg('hang')),
              prose(
                'The heavier one moves down. Write $F = ma$ for each particle in its own direction of motion, then add the two equations: $T$ drops out and leaves $a$.',
              ),
              working('m_{A}g - T &= m_{A}a', 'T - m_{B}g &= m_{B}a'),
            ),
            ask('force-pulley-tiles'),
            ask('force-pulley'),
            ask('force-pulley+choice', 2),
            teach(
              prose(
                'A particle on a table pulled over the edge by a hanging one: the table particle moves across, the hanging one down. Its weight is taken by the table, so only the tension and friction act along its motion.',
              ),
              diagram(pulleySvg('table')),
              prose('On a rough table the friction is $\\mu R = \\mu m_{A}g$, against the motion.'),
            ),
            ask('force-pulley-tiles', 2),
            ask('force-tow-bar-steps', 2),
          ],
          skillCheck: [ask('force-pulley', 2), ask('force-towing-tree', 2), ask('force-pulley-tiles', 2)],
        },
        {
          id: 'fo-l2-slope',
          title: 'Motion on a Slope',
          slides: [
            teach(
              prose(
                'On a slope, $F = ma$ goes along the slope. Resolve at right angles first for $R$, then add up the forces along it.',
              ),
              diagram(slopeSvg(A43, { friction: true })),
              prose(
                'Sliding down a smooth slope, only $mg\\sin\\alpha$ acts along it, so $a = g\\sin\\alpha$ whatever the mass. On a rough slope friction $\\mu R$ holds back, with $R = mg\\cos\\alpha$:',
              ),
              display('mg\\sin\\alpha - \\mu mg\\cos\\alpha = ma'),
              prose('Pulled up the slope by a force $P$ along it: $P - mg\\sin\\alpha - \\mu R = ma$.'),
            ),
            ask('force-slope-tiles', 2),
            ask('force-slope-accel'),
            ask('force-slope-tree'),
            teach(
              prose(
                'A particle released on a rough slope does not always move. Compare the force trying to move it along the slope with the most friction can give, $\\mu R$.',
              ),
              prose(
                'Bigger than $\\mu R$: it moves, and friction is $\\mu R$ against it. Smaller or equal: it stays put, and friction only matches the push.',
              ),
            ),
            ask('force-slope-flow'),
            ask('force-slope-accel+choice', 2),
            ask('force-slope-tree', 2),
            teach(
              prose(
                'A particle sent **up** a rough slope slows down: gravity and friction both act down the slope, against its motion. Its deceleration is',
              ),
              display('g(\\sin\\alpha + \\mu\\cos\\alpha)'),
              prose('Sliding down, the two pull opposite ways, so the acceleration is $g(\\sin\\alpha - \\mu\\cos\\alpha)$. The mass cancels in both.'),
            ),
            ask('force-slope-slider'),
            ask('force-slope-flow', 2),
          ],
          skillCheck: [ask('force-slope-accel', 2), ask('force-slope-tree', 2), ask('force-slope-flow', 2)],
        },
        {
          id: 'fo-l2-third',
          title: "Newton's Third Law",
          slides: [
            teach(
              prose(
                "**Newton's third law**: if $A$ exerts a force on $B$, then $B$ exerts a force on $A$ of the same size in the opposite direction.",
              ),
              prose(
                'The two forces of a pair act on **different** objects and are the **same kind** of force. A book on a table: the Earth pulls the book down, and the book pulls the Earth up. The table pushes the book up, and the book pushes the table down.',
              ),
              prose(
                'The book\'s weight and the table\'s push balance, but they are not a pair: both act on the book, and one is gravity while the other is contact.',
              ),
            ),
            ask('force-pair-choice'),
            ask('force-pair-flow'),
            ask('force-pair-choice', 2),
            teach(
              prose(
                'Two boxes pushed along together, $A$ behind $B$: treat them as one body to find the acceleration, since the force between them is internal.',
              ),
              prose(
                'Then take $B$ alone. The only force driving it forwards is the push from $A$, so $F = ma$ for $B$ gives that push. By the third law, $B$ pushes back on $A$ just as hard.',
              ),
              working('P &= (m_{A} + m_{B})a', 'R &= m_{B}a'),
            ),
            ask('force-push-tree'),
            ask('force-contact'),
            ask('force-pair-flow', 2),
            teach(
              prose(
                'With a resistance on each box, the whole body loses both resistances, and $B$ alone loses its own:',
              ),
              working('P - r_{A} - r_{B} &= (m_{A} + m_{B})a', 'R - r_{B} &= m_{B}a'),
            ),
            ask('force-push-tree', 2),
            ask('force-contact+choice', 2),
          ],
          skillCheck: [ask('force-pair-choice', 2), ask('force-push-tree', 2), ask('force-contact', 2)],
        },
        {
          id: 'fo-l2-lifts',
          title: 'Lifts',
          slides: [
            teach(
              prose(
                'A passenger standing in a lift has two forces on them: their weight $mg$ down and the reaction $R$ of the floor up. Taking upwards as positive:',
              ),
              display('R - mg = ma'),
              prose(
                'Speeding up on the way up, or slowing down on the way down, means the acceleration points up: $R$ is more than the weight, and the passenger feels heavier. Moving at a steady speed means $a = 0$, so $R = mg$ whichever way the lift goes.',
              ),
            ),
            ask('force-lift-flow'),
            ask('force-lift'),
            ask('force-lift-slider'),
            teach(
              prose(
                'A lift journey usually has three stages: speeding up, a steady speed, then slowing down. The acceleration changes sign between the first stage and the last.',
              ),
              prose(
                'Going up, the acceleration is positive then negative; going down it is negative then positive. Each stage has its own $R$ from $R = m(g + a)$.',
              ),
            ),
            ask('force-lift-table'),
            ask('force-lift+choice', 2),
            ask('force-lift-flow', 2),
            teach(
              prose(
                'The cable holds up the lift and the passenger together. As one body of mass $M + m$, the floor\'s push is internal, and $T - (M + m)g = (M + m)a$, so',
              ),
              display('T = (M + m)(g + a)'),
              prose('Then the passenger alone gives the floor\'s reaction, $R = m(g + a)$.'),
            ),
            ask('force-cable-tree'),
            ask('force-lift-table', 2),
          ],
          skillCheck: [ask('force-lift', 2), ask('force-lift-table', 2), ask('force-cable-tree', 2)],
        },
      ],
      levelCheck: [
        ask('force-fma', 2),
        ask('force-resistance-tree', 2),
        ask('force-fma-ij', 2),
        ask('force-towing-tree', 2),
        ask('force-pulley', 2),
        ask('force-pulley-tiles', 2),
        ask('force-tow-bar-steps', 2),
        ask('force-slope-accel', 2),
        ask('force-slope-tree', 2),
        ask('force-pair-choice', 2),
        ask('force-contact', 2),
        ask('force-lift', 2),
        ask('force-lift-table', 2),
        ask('force-cable-tree', 2),
      ],
    },
  ],
};
