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
 * third law and the force between two touching bodies, and lifts. Level 3 is
 * connected particles on slopes: a pulley at the top of a slope with one
 * particle hanging, then with friction and the case where nothing moves, a
 * string over a peg with friction on both sides, the string going slack when
 * the hanging particle lands (Kinematics' v^2 = u^2 + 2as, kn-l2-more, used
 * rather than taught), and putting it together with a free-body diagram for
 * each particle and a check on the tension. Level 4 is moments: the moment of
 * a force about a point, its sense and the resultant of several, a uniform rod
 * on two supports, loads on a plank (and an unknown position or mass from a
 * given reaction), the point of tilting, and a ladder against a smooth wall
 * with friction at the foot.
 *
 * Level 5 is momentum and impulse: p = mv along a line with a sign and as an
 * i, j vector, conservation of momentum in a collision along a line, particles
 * that coalesce or are pushed apart from rest, impulse as the change in
 * momentum (a ball off a wall, equal and opposite impulses in a collision),
 * and Ft = mv - mu, with vectors and in stages. Its collisions are drawn before
 * and after with `collisionSvg`.
 *
 * Level 6 is work, energy and power: work done by a constant force (W = Fd,
 * F d cos(alpha) for a pull at an angle, mgh against gravity, none at right
 * angles), kinetic and potential energy and the one's gain as the other's
 * loss, the work-energy principle (the speed at the foot of a smooth slope or
 * after a drop, which Kinematics' kn-l2-more reached by suvat), work against
 * friction mu R d with the speed left or the stopping distance, and power as
 * Fv with a top speed and an acceleration up a hill. Its pictures are
 * `pullSvg`, `dropSvg` and `slopeSvg`; the `forces` kind shows no distance.
 *
 * Vectors, right-angled trigonometry and Pythagoras are used here, not taught
 * again: each angle is given through a 3-4-5 or 7-24-25 triangle so the sine
 * and cosine are exact, and a lesson says how to read them off. g = 9.8 is
 * stated where weight first appears and in every question that needs it.
 * Levels 1 and 2 draw their free-body diagrams as teach figures, and several
 * of their lessons will later ask them on the `forces` widget (see
 * docs/roadmap/levels/forces.md); level 3 asks them on the widget already.
 * Level 4 draws its rods, planks and ladders with `beamSvg` and `ladderSvg`,
 * since the widget puts every arrow on one box's centre. Each level closes with a level check: questions only, no teaching
 * slides, one attempt each.
 */
import type { Block, Course, SlideRef } from '../types';
import { A34, A43, DROP, FLAT, arrowsSvg, beamSvg, collisionSvg, dropSvg, hangingSvg, ladderSvg, pulleySvg, pullSvg, rigSvg, slopeSvg } from '../generators/forces';

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
/** Lines of working stacked and centred, for rows too varied to align in a phone's width. */
const stacked = (...lines: string[]): Block => display(`\\begin{gathered} ${lines.join(' \\\\ ')} \\end{gathered}`);

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
                'A force pointing left makes an angle bigger than $90^{\\circ}$ with $\\mathbf{i}$: take the triangle\'s angle away from $180^{\\circ}$. For $-3\\mathbf{i} + 4\\mathbf{j}$ the triangle is the same, $53.1^{\\circ}$, so the angle with $\\mathbf{i}$ is $180^{\\circ} - 53.1^{\\circ} = 126.9^{\\circ}$.',
              ),
              prose(
                'A force pointing below $\\mathbf{i}$ works the same way, reading the $\\mathbf{j}$ part as a length. For $4\\mathbf{i} - 3\\mathbf{j}$: $\\tan\\theta = \\tfrac{3}{4}$, so $\\theta = 36.9^{\\circ}$, measured below $\\mathbf{i}$. The angle between them is still $36.9^{\\circ}$. For $-4\\mathbf{i} - 3\\mathbf{j}$, pointing left as well, it is $180^{\\circ} - 36.9^{\\circ} = 143.1^{\\circ}$.',
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
              prose(
                'Run it backwards when the resultant is known. One force is $12\\text{ N}$ and the resultant is $13\\text{ N}$, so the other force $Q$ is a shorter side:',
              ),
              stacked('Q^{2} = 13^{2} - 12^{2}', '= 169 - 144 = 25', 'Q = \\sqrt{25} = 5\\text{ N}'),
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
                'Parallel to $\\mathbf{i} + 4\\mathbf{j}$ means the two parts are in the ratio $1 : 4$: the $\\mathbf{j}$ part is four times the $\\mathbf{i}$ part.',
              ),
              stacked('\\mathbf{R} = (\\mathbf{i} + 6\\mathbf{j}) + (p\\mathbf{i} + 6\\mathbf{j})', '= (1 + p)\\mathbf{i} + 12\\mathbf{j}', '12 = 4(1 + p)', '1 + p = 3', 'p = 2'),
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
            teach(
              prose(
                'Often you are given $\\tan\\alpha$ instead. Draw the right-angled triangle it describes and find the third side. For $\\tan\\alpha = \\tfrac{7}{24}$, the opposite side is $7$ and the adjacent $24$:',
              ),
              stacked('\\text{hypotenuse} = \\sqrt{7^{2} + 24^{2}} = 25', '\\sin\\alpha = \\tfrac{7}{25} = 0.28', '\\cos\\alpha = \\tfrac{24}{25} = 0.96'),
              prose(
                'An angle measured from the **vertical** swaps the two: the part next to the angle is now vertical, so it takes the cosine, and the horizontal part takes the sine. A $50\\text{ N}$ force at that $\\alpha$ to the vertical resolves into',
              ),
              stacked('\\uparrow\\;50\\cos\\alpha = 50 \\times 0.96 = 48', '\\rightarrow\\;50\\sin\\alpha = 50 \\times 0.28 = 14'),
              prose(
                'On a slope inclined at $\\alpha$, the weight $W$ splits into $W\\sin\\alpha$ down the slope and $W\\cos\\alpha$ pressing into it. Draw the angle in, then ask which side is next to it.',
              ),
            ),
            ask('force-resolve-tiles', 2),
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
                'A $5\\text{ kg}$ box weighs $5 \\times 9.8 = 49\\text{ N}$. Run it backwards for a mass: a weight of $49\\text{ N}$ means $m = 49 \\div 9.8 = 5\\text{ kg}$.',
              ),
              prose(
                'A pull $P$ upwards at an angle takes some of the load, so $R = mg - P\\sin\\alpha$. Pull that box with $20\\text{ N}$ at $\\alpha$ above the horizontal, where $\\sin\\alpha = 0.6$:',
              ),
              stacked('W = 5 \\times 9.8 = 49', '20\\sin\\alpha = 20 \\times 0.6 = 12', 'R = 49 - 12 = 37\\text{ N}'),
              prose('A push down at the same angle adds to it instead: $R = 49 + 12 = 61\\text{ N}$.'),
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
              prose('With $\\mathbf{F}_{1} = 3\\mathbf{i} - 2\\mathbf{j}$ and $\\mathbf{F}_{2} = -5\\mathbf{i} + 6\\mathbf{j}$:'),
              stacked('\\mathbf{F}_{1} + \\mathbf{F}_{2} = -2\\mathbf{i} + 4\\mathbf{j}', '\\mathbf{F}_{3} = (2\\mathbf{i} - 4\\mathbf{j})\\text{ N}'),
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
              prose('For $2\\text{ kg}$ with $\\cos\\alpha = 0.8$: $0.8T = 19.6$, so $T = 24.5\\text{ N}$.'),
              prose(
                'The weight is a force like any other. In $\\mathbf{i}$, $\\mathbf{j}$ form, with $\\mathbf{j}$ up, a $2\\text{ kg}$ particle\'s weight is $-19.6\\mathbf{j}$, and it goes into the sum. With $\\mathbf{F}_{1} = 3\\mathbf{i} + 5\\mathbf{j}$ and $\\mathbf{F}_{2} = -\\mathbf{i} + 4\\mathbf{j}$:',
              ),
              stacked('\\mathbf{F}_{1} + \\mathbf{F}_{2} - 19.6\\mathbf{j}', '= 2\\mathbf{i} - 10.6\\mathbf{j}', '\\mathbf{F}_{3} = (-2\\mathbf{i} + 10.6\\mathbf{j})\\text{ N}'),
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
                'On a **smooth** slope nothing else acts along it, so a particle needs a force up the slope to stay still. At right angles, $R = mg\\cos\\alpha$ when nothing else presses in. A $10\\text{ kg}$ particle, $\\sin\\alpha = 0.6$ and $\\cos\\alpha = 0.8$, held by $P$ along the slope:',
              ),
              stacked('W = 10 \\times 9.8 = 98', 'P = 98 \\times 0.6 = 58.8', 'R = 98 \\times 0.8 = 78.4'),
              prose(
                'Held by a **horizontal** $P$ instead, only $P\\cos\\alpha$ acts up the slope, and $P\\sin\\alpha$ presses into it as well:',
              ),
              stacked('P\\cos\\alpha = 98\\sin\\alpha', '0.8P = 58.8', 'P = 73.5', 'R = 98\\cos\\alpha + P\\sin\\alpha', '= 78.4 + 44.1 = 122.5'),
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
              prose('A $10\\text{ kg}$ box on a rough floor, $\\mu = 0.25$: $R = 98$ and $\\mu R = 0.25 \\times 98 = 24.5$. Pulled with $20\\text{ N}$, friction is $20$ and it stays put. Pulled with $30\\text{ N}$, it slides, with friction $24.5$.'),
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
                'In limiting equilibrium, find $R$ by resolving at right angles to the slope, set $F = \\mu R$, then resolve along the slope. A $10\\text{ kg}$ particle, $\\sin\\alpha = 0.6$, $\\cos\\alpha = 0.8$, $\\mu = 0.5$, with $P$ up the slope:',
              ),
              stacked('R = 98 \\times 0.8 = 78.4', '\\mu R = 0.5 \\times 78.4 = 39.2'),
              prose(
                'About to slide **down**, friction helps $P$: $P + 39.2 = 98 \\times 0.6 = 58.8$, so $P = 19.6\\text{ N}$. About to move **up**, friction is against $P$: $P = 58.8 + 39.2 = 98\\text{ N}$.',
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
              prose('A $1000\\text{ kg}$ car and $500\\text{ kg}$ trailer, $D = 2000$, $r_{1} = 200$, $r_{2} = 300$:'),
              stacked('2000 - 200 - 300 = 1500a', 'a = 1', 'T - 300 = 500 \\times 1', 'T = 800\\text{ N}'),
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
              prose('With $m_{A} = 3$ and $m_{B} = 1$:'),
              stacked('29.4 - T = 3a', 'T - 9.8 = a', '19.6 = 4a', 'a = 4.9', 'T = 9.8 + 4.9 = 14.7\\text{ N}'),
            ),
            ask('force-pulley-tiles'),
            teach(
              prose(
                'A particle on a table pulled over the edge by a hanging one: the table particle moves across, the hanging one down. Its weight is taken by the table, so on a smooth table only the tension acts along its motion. $A$, $6\\text{ kg}$, on the table; $B$, $2\\text{ kg}$, hanging:',
              ),
              diagram(pulleySvg('table')),
              stacked('A: \\; T = 6a', 'B: \\; 19.6 - T = 2a', '19.6 = 8a', 'a = 2.45', 'T = 6 \\times 2.45 = 14.7\\text{ N}'),
              prose(
                'On a rough table the friction is $\\mu R = \\mu m_{A}g$, against the motion. $A$ of $2\\text{ kg}$ with $\\mu = 0.5$ and $B$ of $3\\text{ kg}$: friction is $0.5 \\times 19.6 = 9.8$, so $T - 9.8 = 2a$ and $29.4 - T = 3a$.',
              ),
            ),
            ask('force-pulley'),
            ask('force-pulley+choice', 2),
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
              prose('A $10\\text{ kg}$ particle slides down with $\\sin\\alpha = 0.8$, $\\cos\\alpha = 0.6$ and $\\mu = 0.5$:'),
              stacked('R = 98 \\times 0.6 = 58.8', 'F = 0.5 \\times 58.8 = 29.4', '98 \\times 0.8 - 29.4 = 10a', '49 = 10a', 'a = 4.9'),
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
              prose(
                'A $10\\text{ kg}$ particle with $\\sin\\alpha = 0.6$, $\\cos\\alpha = 0.8$ and $\\mu = 0.5$: the push down the slope is $98 \\times 0.6 = 58.8$, and $\\mu R = 0.5 \\times 78.4 = 39.2$. $58.8$ is bigger, so it slides.',
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
              prose(
                'A push $P$ up the slope changes the contest: the net push is the difference between $P$ and $mg\\sin\\alpha$, and that is what friction has to match. $10\\text{ kg}$, $\\sin\\alpha = 0.8$, $\\cos\\alpha = 0.6$, $\\mu = 0.25$ and $P = 60\\text{ N}$:',
              ),
              stacked('mg\\sin\\alpha = 78.4 > 60', '78.4 - 60 = 18.4', '\\mu R = 0.25 \\times 58.8 = 14.7'),
              prose('$18.4$ is bigger than $14.7$, so it slides down the slope.'),
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
              prose(
                'A $60\\text{ kg}$ passenger, weight $588\\text{ N}$, in a lift going down and speeding up at $2\\text{ m s}^{-2}$. The acceleration points down, so with up positive $a = -2$:',
              ),
              stacked('R - 588 = 60 \\times (-2) = -120', 'R = 468\\text{ N}'),
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
              prose('The same $60\\text{ kg}$ passenger going up, speeding up at $1$, then steady, then slowing at $1.5$:'),
              stacked('R = 60(9.8 + 1) = 648', 'R = 60(9.8 + 0) = 588', 'R = 60(9.8 - 1.5) = 498'),
            ),
            ask('force-lift-table'),
            ask('force-lift+choice', 2),
            ask('force-lift-flow', 2),
            teach(
              prose(
                'The cable holds up the lift and the passenger together. As one body of mass $M + m$, the floor\'s push is internal, and $T - (M + m)g = (M + m)a$, so',
              ),
              display('T = (M + m)(g + a)'),
              prose('Then the passenger alone gives the floor\'s reaction, $R = m(g + a)$. A $500\\text{ kg}$ lift with that passenger, accelerating up at $1\\text{ m s}^{-2}$:'),
              stacked('T = 560 \\times 10.8 = 6048\\text{ N}', 'R = 60 \\times 10.8 = 648\\text{ N}'),
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
    {
      id: 'fo-l3',
      title: 'Connected Particles on Slopes',
      lessons: [
        {
          // Builds on fo-l2-connected (a pulley, one equation per particle) and fo-l2-slope (F = ma along a slope).
          id: 'fo-l3-incline',
          title: 'A Pulley at the Top of a Slope',
          slides: [
            teach(
              prose(
                'Particle $A$ lies on a slope. A light string runs from it up the slope, over a smooth pulley at the top, to particle $B$, which hangs down the far side.',
              ),
              diagram(rigSvg(A34, DROP)),
              prose(
                "Which way they move is a contest between two pulls along the string: $B$'s whole weight, $m_{B}g$, and the part of $A$'s weight down the slope, $m_{A}g\\sin\\alpha$.",
              ),
              prose('Whichever is bigger wins: its particle goes down and drags the other. If they are equal, nothing moves.'),
            ),
            ask('force-incline-way'),
            ask('force-incline-balance'),
            ask('force-incline-pick'),
            teach(
              prose(
                'Once you know the way, write $F = ma$ for each particle in its own direction of motion, as for two particles over a pulley in Connected Particles. If $B$ falls, $A$ first and then $B$:',
              ),
              working('T - m_{A}g\\sin\\alpha &= m_{A}a', 'm_{B}g - T &= m_{B}a'),
              prose('Add the two equations and $T$ drops out, leaving $a$. $A$\'s normal reaction plays no part: it acts at right angles to the motion.'),
              prose('$A$ of $5\\text{ kg}$ with $\\sin\\alpha = 0.6$, and $B$ of $11\\text{ kg}$. $A$\'s pull is $5 \\times 9.8 \\times 0.6 = 29.4$, $B$\'s is $107.8$, so $B$ falls:'),
              stacked('T - 29.4 = 5a', '107.8 - T = 11a', '78.4 = 16a', 'a = 4.9'),
              prose('Adding is the same as treating the two as one system: resultant $107.8 - 29.4 = 78.4$ on $16\\text{ kg}$. Then put $a$ back in for the tension. $B$\'s is the shorter: $T = 11(9.8 - 4.9) = 53.9\\text{ N}$.'),
            ),
            ask('force-incline-tiles'),
            ask('force-incline'),
            teach(
              prose(
                'If $A$ is the one that wins, everything turns round: $A$ slides down with $m_{A}g\\sin\\alpha - T = m_{A}a$, and $B$ rises with $T - m_{B}g = m_{B}a$.',
              ),
              prose('$A$ of $10\\text{ kg}$ with $\\sin\\alpha = 0.8$ pulls with $78.4$; $B$ of $2\\text{ kg}$ with $19.6$. So $A$ slides down:'),
              stacked('78.4 - T = 10a', 'T - 19.6 = 2a', '58.8 = 12a', 'a = 4.9', 'T = 2(9.8 + 4.9) = 29.4\\text{ N}'),
            ),
            ask('force-incline-system-tree'),
            ask('force-incline+choice'),
            ask('force-incline-way'),
          ],
          skillCheck: [ask('force-incline-tiles'), ask('force-incline'), ask('force-incline-system-tree')],
        },
        {
          // Friction on a slope is fo-l1-friction (F <= mu R) and fo-l2-slope (mu R against the motion).
          id: 'fo-l3-rough',
          title: 'Adding Friction',
          slides: [
            teach(
              prose(
                'On a rough slope friction acts on $A$ as well, along the slope. As in Motion on a Slope, it opposes the motion, so decide which way the system moves **first**, then draw friction against it.',
              ),
              prose(
                'Moving, friction is at its limit, $F = \\mu R$, with $R = m_{A}g\\cos\\alpha$ from resolving at right angles to the slope. If $B$ falls and drags $A$ up, with $F = \\mu R$, $A$ first and then $B$:',
              ),
              working('T - m_{A}g\\sin\\alpha - F &= m_{A}a', 'm_{B}g - T &= m_{B}a'),
              prose('$A$ of $5\\text{ kg}$, $\\sin\\alpha = 0.6$, $\\cos\\alpha = 0.8$, $\\mu = 0.5$; $B$ of $9\\text{ kg}$:'),
              stacked('R = 49 \\times 0.8 = 39.2', 'F = 19.6', 'T - 29.4 - 19.6 = 5a', '88.2 - T = 9a', '39.2 = 14a', 'a = 2.8', 'T = 9(9.8 - 2.8) = 63\\text{ N}'),
            ),
            ask('force-incline-system-tree', 2),
            ask('force-incline-fill', 2),
            ask('force-incline-tiles', 2),
            teach(
              prose(
                'The system may not move at all. Friction can give up to $\\mu R$, in whichever direction holds $A$ still. If the difference between the two pulls is no more than $\\mu R$, nothing moves.',
              ),
              prose(
                'Then the tension is just $B$\'s weight, and friction gives only what balances $A$: the difference between the pulls, not $\\mu R$. The same $A$ with $B$ of $4\\text{ kg}$:',
              ),
              stacked('\\text{pulls: }39.2 - 29.4 = 9.8', '\\mu R = 19.6, \\text{ more than } 9.8'),
              prose('So nothing moves: $T = 39.2\\text{ N}$, and friction is only $9.8\\text{ N}$, down the slope, since $B$ would drag $A$ up.'),
            ),
            ask('force-incline-way', 2),
            ask('force-incline-rest-steps'),
            teach(
              prose(
                'So a hanging mass holds $A$ still anywhere between $m_{A}(\\sin\\alpha - \\mu\\cos\\alpha)$, with $A$ about to slide down, and $m_{A}(\\sin\\alpha + \\mu\\cos\\alpha)$, with $A$ about to be pulled up.',
              ),
              prose(
                'For the same $A$: about to slide down, friction acts **up** the slope at its limit and helps $B$, so $m_{B}g = 29.4 - 19.6 = 9.8$ and $m_{B} = 1\\text{ kg}$. About to be pulled up, friction acts down: $m_{B}g = 29.4 + 19.6 = 49$ and $m_{B} = 5\\text{ kg}$.',
              ),
            ),
            ask('force-incline-balance', 2),
            ask('force-incline', 2),
            ask('force-incline-rest-steps', 2),
          ],
          skillCheck: [ask('force-incline', 2), ask('force-incline-system-tree', 2), ask('force-incline-rest-steps', 2)],
        },
        {
          id: 'fo-l3-peg',
          title: 'Over a Peg',
          slides: [
            teach(
              prose(
                'Two rough slopes meet at a ridge, with a smooth peg along the top. $A$ is on one slope and $B$ on the other, joined by a light string over the peg.',
              ),
              diagram(rigSvg(A43, A34)),
              prose(
                'Resolve for each particle on its own slope: $mg\\sin\\theta$ down that slope, $R = mg\\cos\\theta$ at right angles to it, and friction up to $\\mu R$. Each particle has its own $\\theta$, $\\mu$ and $R$.',
              ),
            ),
            ask('force-peg-table'),
            ask('force-incline-pick', 2),
            teach(
              prose(
                'The particle whose weight pulls harder down its slope goes down, but only if the difference beats **both** frictions together. $A$ is $2\\text{ kg}$ with $\\sin\\alpha = 0.6$, $\\cos\\alpha = 0.8$; $B$ is $5\\text{ kg}$ with $\\sin\\beta = 0.8$, $\\cos\\beta = 0.6$; $\\mu = 0.5$ on both:',
              ),
              stacked('A: \\; 19.6 \\times 0.6 = 11.76', 'F_{A} = 0.5 \\times 15.68 = 7.84', 'B: \\; 49 \\times 0.8 = 39.2', 'F_{B} = 0.5 \\times 29.4 = 14.7'),
              prose('The difference, $39.2 - 11.76 = 27.44$, beats $7.84 + 14.7 = 22.54$, so $B$ goes down. Moving, each friction is $\\mu R$ against its own particle\'s motion, $A$ first and then $B$:'),
              stacked('T - 11.76 - 7.84 = 2a', '39.2 - T - 14.7 = 5a', '4.9 = 7a', 'a = 0.7', 'T = 1.4 + 11.76 + 7.84 = 21\\text{ N}'),
            ),
            ask('force-peg-flow'),
            ask('force-peg-tiles'),
            ask('force-peg'),
            teach(
              prose(
                'If $A$ pulls harder instead, everything turns round: $A$ goes down its slope, $B$ goes up, and each friction swaps direction to stay against its particle\'s motion.',
              ),
              prose(
                'A rough table with a slope beyond its edge is the same thing with $\\alpha = 0$: none of $A$\'s weight acts along the table, and $R_{A} = m_{A}g$. $A$ of $6\\text{ kg}$ on the table with $\\mu = 0.5$ has friction $0.5 \\times 58.8 = 29.4$, so its equation is $T - 29.4 = 6a$.',
              ),
              diagram(rigSvg(FLAT, A34)),
            ),
            ask('force-peg+choice', 2),
            ask('force-peg-table', 2),
            ask('force-peg-tiles', 2),
          ],
          skillCheck: [ask('force-peg', 2), ask('force-peg-tiles', 2), ask('force-peg-flow', 2)],
        },
        {
          // The suvat equations are kn-l2-more (v^2 = u^2 + 2as) in Kinematics; used here, not taught again.
          id: 'fo-l3-slack',
          title: 'When the String Goes Slack',
          slides: [
            teach(
              prose(
                '$B$ starts a height $h$ above the ground and falls, pulling $A$ up the slope. When $B$ lands it stops, the string goes slack, and the tension drops to zero.',
              ),
              diagram(rigSvg(A34, DROP, { gap: true })),
              prose(
                'Up to that moment both move with the same acceleration $a$, from rest, through the same distance $h$. So $A$\'s speed as $B$ lands comes from $v^{2} = u^{2} + 2as$, from Kinematics:',
              ),
              display('v^{2} = 2ah'),
              prose(
                'Find $a$ first, from both equations. On a table ($\\alpha = 0$): $A$ of $8\\text{ kg}$ with $\\mu = 0.5$, so friction $0.5 \\times 78.4 = 39.2$; $B$ of $6\\text{ kg}$, $0.7\\text{ m}$ up:',
              ),
              stacked('T - 39.2 = 8a', '58.8 - T = 6a', '19.6 = 14a', 'a = 1.4', 'v^{2} = 2 \\times 1.4 \\times 0.7 = 1.96', 'v = 1.4\\text{ m s}^{-1}'),
            ),
            ask('force-incline', 2),
            ask('force-slack-speed'),
            ask('force-slack-speed+choice', 2),
            teach(
              prose(
                'After $B$ lands, $T = 0$ and $A$ goes on alone. On a table only friction acts along it. Carrying on from above, at $1.4\\text{ m s}^{-1}$:',
              ),
              stacked('8d = 39.2', 'd = 4.9', '0 = 1.96 - 2 \\times 4.9s', 's = 1.96 \\div 9.8 = 0.2\\text{ m}'),
              prose(
                'The question may be whether it reaches the pulley. If $A$ started $1\\text{ m}$ from it, it has $1 - 0.7 = 0.3\\text{ m}$ left when $B$ lands and slides only $0.2\\text{ m}$, so it stops short.',
              ),
              prose(
                'On a slope, gravity and friction both act down the slope, against its motion, so it slows with deceleration $g(\\sin\\alpha + \\mu\\cos\\alpha)$ until it stops.',
              ),
            ),
            ask('force-slack-distance-steps'),
            ask('force-slack-stages-tree'),
            ask('force-slack-flow'),
            teach(
              prose(
                'On a slope: $A$ of $5\\text{ kg}$, $\\sin\\alpha = 0.6$, $\\cos\\alpha = 0.8$, $\\mu = 0.5$; $B$ of $15\\text{ kg}$, $0.8\\text{ m}$ up. Taut, then slack:',
              ),
              stacked('T - 29.4 - 19.6 = 5a', '147 - T = 15a', '98 = 20a', 'a = 4.9', 'v^{2} = 2 \\times 4.9 \\times 0.8 = 7.84', 'd = 9.8(0.6 + 0.5 \\times 0.8) = 9.8', 's = 7.84 \\div 19.6 = 0.4'),
              prose(
                'The whole distance up the slope is $0.8 + 0.4 = 1.2\\text{ m}$. Then compare $mg\\sin\\alpha = 29.4$ with $\\mu R = 19.6$, as in Slopes and Friction: the pull is bigger, so $A$ slides back down.',
              ),
            ),
            ask('force-slack-stages-tree', 2),
            ask('force-slack-flow', 2),
          ],
          skillCheck: [ask('force-slack-speed', 2), ask('force-slack-stages-tree', 2), ask('force-slack-flow', 2)],
        },
        {
          id: 'fo-l3-together',
          title: 'Putting It Together',
          slides: [
            teach(
              prose('Every connected-particle question goes the same way:'),
              prose(
                '**1.** Draw the forces on each particle separately. **2.** Decide which way the system moves, and whether it moves at all. **3.** Write $F = ma$ for each particle in its own direction of motion. **4.** Add the equations for $a$, then find $T$.',
              ),
            ),
            ask('force-incline-pick'),
            ask('force-incline-fill', 2),
            ask('force-incline-tiles', 2),
            teach(
              prose(
                '**5.** Check the tension. If $B$ hangs and falls, it accelerates downwards, so the string pulls it up with **less** than its weight: $T < m_{B}g$.',
              ),
              prose(
                "And $A$ accelerates up the slope, so the tension must beat what holds it back: $T > m_{A}g\\sin\\alpha + F$. A tension outside that range has a slip in it, usually a sign in one of the equations.",
              ),
            ),
            ask('force-incline-check'),
            ask('force-incline-pick', 2),
            ask('force-peg+choice', 2),
            teach(
              prose(
                'The same steps work whatever the faces are: a slope with $B$ hanging, two slopes over a peg, or a table. Only step 1 changes, since each particle has its own weight component, reaction and friction.',
              ),
              prose(
                'If the string goes slack, $T = 0$ from then on: write $F = ma$ for the particle still moving, on its own. Say $A$ is going up at $2.8\\text{ m s}^{-1}$ when $B$ lands, with $\\sin\\alpha = 0.6$, $\\cos\\alpha = 0.8$ and $\\mu = 0.5$:',
              ),
              stacked('d = 9.8(0.6 + 0.5 \\times 0.8) = 9.8', '0 = 2.8^{2} - 2 \\times 9.8s', 's = 7.84 \\div 19.6 = 0.4\\text{ m}'),
            ),
            ask('force-incline-check', 2),
            ask('force-slack-speed', 2),
          ],
          skillCheck: [ask('force-incline-fill', 2), ask('force-incline-check', 2), ask('force-incline-pick', 2)],
        },
      ],
      levelCheck: [
        ask('force-incline-way', 2),
        ask('force-incline-tiles', 2),
        ask('force-incline', 2),
        ask('force-incline-system-tree', 2),
        ask('force-incline-balance', 2),
        ask('force-incline-rest-steps', 2),
        ask('force-peg-table', 2),
        ask('force-peg-tiles', 2),
        ask('force-peg', 2),
        ask('force-peg-flow', 2),
        ask('force-slack-speed', 2),
        ask('force-slack-stages-tree', 2),
        ask('force-slack-flow', 2),
        ask('force-incline-fill', 2),
        ask('force-incline-check', 2),
      ],
    },
    {
      id: 'fo-l4',
      title: 'Moments',
      lessons: [
        {
          id: 'fo-l4-moment',
          title: 'The Moment of a Force',
          slides: [
            teach(
              prose(
                'A force can **turn** something as well as move it: a spanner on a nut, a hand on a door. Its turning effect about a point is its **moment**:',
              ),
              display('\\text{moment} = F \\times d'),
              prose(
                'Here $d$ is the **perpendicular** distance from the point to the line of the force. A force in newtons and a distance in metres give a moment in newton metres, $\\text{N m}$.',
              ),
              diagram(
                beamSvg(4, {
                  supports: [{ x: 0, name: '' }],
                  arrows: [{ x: 3, dir: 'up', label: 'F' }],
                  label: 'A rod pivoted at its left end A, with a force F pushing straight up three quarters of the way along',
                }),
              ),
              prose('A force of $20\\text{ N}$ at right angles to the rod, $3\\text{ m}$ from the pivot, has moment $20 \\times 3 = 60\\text{ N m}$.'),
            ),
            ask('force-moment'),
            teach(
              prose(
                'A moment also has a **sense**: the way it turns, **clockwise** or **anticlockwise**. A downward force to the right of the pivot turns the rod clockwise; the same force to the left turns it anticlockwise, and an upward force the other way round.',
              ),
              prose(
                'To combine several moments about one point, pick a sense as positive, add the moments that way and take away the others. What is left is the **resultant moment**, and it turns the way of the bigger total. About a pivot $P$, $10\\text{ N}$ down $2\\text{ m}$ right of $P$ and $8\\text{ N}$ down $3\\text{ m}$ left of it:',
              ),
              stacked('\\text{clockwise: }10 \\times 2 = 20', '\\text{anticlockwise: }8 \\times 3 = 24', '\\text{resultant: }24 - 20 = 4\\text{ N m}'),
              prose('The anticlockwise total is bigger, so the resultant is $4\\text{ N m}$ anticlockwise.'),
            ),
            ask('force-moment-sense'),
            ask('force-moment-table'),
            ask('force-moment-sum-steps'),
            teach(
              prose(
                'A force at an angle $\\theta$ to the rod: split it into a part along the rod, $F\\cos\\theta$, and a part at right angles, $F\\sin\\theta$. The part along the rod passes through the pivot and does not turn it, so',
              ),
              display('\\text{moment} = F\\sin\\theta \\times d'),
              diagram(
                beamSvg(4, {
                  supports: [{ x: 0, name: '' }],
                  arrows: [{ x: 3, dir: { t: A34, lean: 1 }, label: 'F' }],
                  label: 'A rod pivoted at its left end A, with a force F pulling up and to the right at an angle theta to the rod',
                }),
              ),
              prose('$50\\text{ N}$ at $\\theta$ to the rod, with $\\sin\\theta = 0.6$, $2\\text{ m}$ from the pivot: $50 \\times 0.6 = 30$, so the moment is $30 \\times 2 = 60\\text{ N m}$.'),
            ),
            ask('force-moment', 2),
            ask('force-moment-table', 2),
            ask('force-moment-sense', 2),
            ask('force-moment-sum-steps', 2),
          ],
          skillCheck: [ask('force-moment', 2), ask('force-moment-sense', 2), ask('force-moment-sum-steps', 2)],
        },
        {
          id: 'fo-l4-rod',
          title: 'A Rod on Two Supports',
          slides: [
            teach(
              prose(
                'A **uniform** rod has its weight spread evenly, so its whole weight acts at the **middle**. Resting on two supports $C$ and $D$, it is pushed up by a reaction at each.',
              ),
              diagram(
                beamSvg(6, {
                  supports: [
                    { x: 1, name: 'C' },
                    { x: 5, name: 'D' },
                  ],
                  arrows: [
                    { x: 3, dir: 'down', label: 'W' },
                    { x: 1, dir: 'up', label: 'R_C' },
                    { x: 5, dir: 'up', label: 'R_D' },
                  ],
                  label: 'A rod AB on supports C and D, with its weight W down at the middle and reactions R C and R D up at the supports',
                }),
              ),
              prose(
                'The rod is in **equilibrium**, so two things hold: the forces balance, $R_{C} + R_{D} = W$, and the moments balance about **any** point.',
              ),
              prose(
                'Take moments about $C$: $R_{C}$ acts **through** it, so its moment is zero and it drops out. Measure every distance from $C$, not from $A$. A $6\\text{ m}$ rod of weight $300\\text{ N}$, $C$ $1\\text{ m}$ from $A$ and $D$ at $B$: the middle is $2\\text{ m}$ from $C$, and $CD = 5$.',
              ),
              stacked('R_{D} \\times 5 = 300 \\times 2 = 600', 'R_{D} = 120', 'R_{C} = 300 - 120 = 180\\text{ N}'),
            ),
            ask('force-rod'),
            ask('force-rod-tiles'),
            ask('force-rod-reactions-tree'),
            teach(
              prose(
                'The moment equation also runs backwards, for where a support is. A $4\\text{ m}$ rod of weight $200\\text{ N}$ with $C$ at $A$ has $R_{D} = 160\\text{ N}$; the middle is $2\\text{ m}$ from $C$:',
              ),
              stacked('160 \\times CD = 200 \\times 2 = 400', 'CD = 2.5\\text{ m}'),
              prose('$C$ is at $A$, so $D$ is $2.5\\text{ m}$ from $A$.'),
            ),
            ask('force-rod-slider'),
            teach(
              prose(
                'Both supports can be away from the ends. An $8\\text{ m}$ rod of weight $400\\text{ N}$, $C$ $1\\text{ m}$ from $A$ and $D$ $6\\text{ m}$ from $A$: the middle is $4 - 1 = 3\\text{ m}$ from $C$, and $CD = 5$.',
              ),
              stacked('R_{D} \\times 5 = 400 \\times 3 = 1200', 'R_{D} = 240', 'R_{C} = 400 - 240 = 160\\text{ N}'),
              prose('The support nearer the middle, $D$ here, always carries more of the weight.'),
            ),
            ask('force-rod+choice', 2),
            ask('force-rod-tiles', 2),
            ask('force-rod-reactions-tree', 2),
            ask('force-rod-slider', 2),
          ],
          skillCheck: [ask('force-rod', 2), ask('force-rod-tiles', 2), ask('force-rod-reactions-tree', 2)],
        },
        {
          id: 'fo-l4-plank',
          title: 'Loads on a Plank',
          slides: [
            teach(
              prose(
                'Put a person or a box on the plank and there is one more downward force, at the point where they stand. Taking moments about $C$, each weight has its own moment, force times its distance $d$ from $C$, and together they balance $R_{D}$\'s:',
              ),
              display('R_{D} \\times CD = Wd_{W} + Pd_{P}'),
              diagram(
                beamSvg(6, {
                  supports: [
                    { x: 0, name: 'C' },
                    { x: 6, name: 'D' },
                  ],
                  arrows: [
                    { x: 3, dir: 'down', label: 'W' },
                    { x: 4.5, dir: 'down', label: 'P' },
                    { x: 0, dir: 'up', label: 'R_C' },
                    { x: 6, dir: 'up', label: 'R_D' },
                  ],
                  label: 'A plank AB on supports at its ends, with its weight W at the middle, a person P nearer B, and reactions R C and R D',
                }),
              ),
              prose(
                'A $6\\text{ m}$ plank of weight $200\\text{ N}$ on supports at its ends, and a person of $600\\text{ N}$ $4.5\\text{ m}$ from $C$. The second reaction comes from resolving: the two reactions hold up **everything** on the plank.',
              ),
              stacked('R_{D} \\times 6 = 200 \\times 3 + 600 \\times 4.5', '= 600 + 2700 = 3300', 'R_{D} = 550', 'R_{C} = 800 - 550 = 250\\text{ N}'),
            ),
            ask('force-plank'),
            ask('force-plank-table'),
            ask('force-plank-tiles'),
            teach(
              prose(
                'As a check, take moments about $D$ as well: it should give the same $R_{C}$. For the plank above, the plank\'s weight is $3\\text{ m}$ from $D$ and the person $1.5\\text{ m}$:',
              ),
              stacked('R_{C} \\times 6 = 200 \\times 3 + 600 \\times 1.5', '= 1500', 'R_{C} = 250'),
              prose('The reaction is bigger at the support the person stands nearer.'),
            ),
            ask('force-plank+choice', 2),
            ask('force-plank-tiles', 2),
            teach(
              prose(
                'Run it backwards: given one reaction, find where someone stands or how heavy they are. Take moments about the **other** support, so the unknown reaction drops out and the only unknown is the one asked for.',
              ),
              prose('A $4\\text{ m}$ plank of weight $200\\text{ N}$ on supports at its ends. Someone $3\\text{ m}$ from $C$ makes $R_{D} = 250\\text{ N}$. About $C$:'),
              stacked('250 \\times 4 = 200 \\times 2 + P \\times 3', '1000 - 400 = 3P', 'P = 200\\text{ N}'),
              prose('A $300\\text{ N}$ person makes $R_{C} = 175\\text{ N}$ instead. About $D$, with $x$ their distance from $D$:'),
              stacked('175 \\times 4 = 200 \\times 2 + 300x', '700 - 400 = 300x', 'x = 1\\text{ m}'),
            ),
            ask('force-plank-unknown'),
            ask('force-plank-table', 2),
            ask('force-plank-unknown', 2),
          ],
          skillCheck: [ask('force-plank', 2), ask('force-plank-tiles', 2), ask('force-plank-unknown', 2)],
        },
        {
          id: 'fo-l4-tilt',
          title: 'On the Point of Tilting',
          slides: [
            teach(
              prose(
                'As someone walks along a plank past support $D$ towards $B$, their moment about $D$ grows. The plank\'s weight holds it down on the other side, and the reaction at $C$ shrinks.',
              ),
              diagram(
                beamSvg(8, {
                  supports: [
                    { x: 1, name: 'C' },
                    { x: 5, name: 'D' },
                  ],
                  arrows: [
                    { x: 4, dir: 'down', label: 'W' },
                    { x: 6.5, dir: 'down', label: 'P' },
                    { x: 5, dir: 'up', label: 'R_D' },
                  ],
                  label: 'A plank on supports C and D with a person P standing beyond D; the reaction at C has fallen to zero and only R D pushes up',
                }),
              ),
              prose(
                'On the **point of tilting** about $D$, the reaction at $C$ is **zero**: the plank is just lifting off it. So take moments about $D$, with $R_{C} = 0$. With $e$ how far past $D$ the person stands, and $d$ the distance from $D$ back to the middle:',
              ),
              display('P \\times e = W \\times d'),
              prose(
                'The $8\\text{ m}$ plank above weighs $200\\text{ N}$, and $D$ is $5\\text{ m}$ from $A$, $1\\text{ m}$ past the middle. A $400\\text{ N}$ person:',
              ),
              stacked('400e = 200 \\times 1', 'e = 0.5', '\\text{from } A: \\;5 + 0.5 = 5.5\\text{ m}'),
              prose('At that point the one support left carries **all** the weight: resolving, $R_{D} = 200 + 400 = 600\\text{ N}$.'),
            ),
            ask('force-tilt'),
            ask('force-tipping-tree'),
            teach(
              prose(
                'Walking the other way, towards $A$, the plank tilts about $C$ instead and $R_{D}$ falls to zero: take moments about $C$. Anything else on the plank between the supports adds its own moment on the side that holds the plank down.',
              ),
              prose(
                'A $6\\text{ m}$ plank of weight $300\\text{ N}$, $C$ $2\\text{ m}$ from $A$, $D$ $5\\text{ m}$ from $A$, a $150\\text{ N}$ box $2\\text{ m}$ right of $C$. A $600\\text{ N}$ person walks towards $A$:',
              ),
              stacked('600e = 300 \\times 1 + 150 \\times 2', '600e = 600', 'e = 1', '\\text{from } A: \\;2 - 1 = 1\\text{ m}', 'R_{C} = 300 + 150 + 600', '= 1050\\text{ N}'),
            ),
            ask('force-tilt-flow'),
            ask('force-tilt-slider'),
            ask('force-tilt-flow', 2),
            teach(
              prose(
                'The same idea gives the greatest load that can hang from the end: at that load the plank is on the point of tilting. With masses, $g$ appears on both sides and cancels.',
              ),
              prose(
                'The $8\\text{ m}$ plank again, now of mass $30\\text{ kg}$, with a load of mass $M$ hung from $B$, $3\\text{ m}$ past $D$:',
              ),
              stacked('Mg \\times 3 = 30g \\times 1', 'M = 10\\text{ kg}'),
            ),
            ask('force-tilt+choice', 2),
            ask('force-tilt-slider', 2),
            ask('force-tipping-tree', 2),
          ],
          skillCheck: [ask('force-tilt', 2), ask('force-tipping-tree', 2), ask('force-tilt-flow', 2)],
        },
        {
          id: 'fo-l4-ladder',
          title: 'A Ladder Against a Wall',
          slides: [
            teach(
              prose(
                'A ladder $AB$ rests with its foot $A$ on rough ground and its top $B$ against a **smooth** wall. Four forces act on it: its weight $W$ at the middle, the wall\'s push $S$, and at the foot the normal reaction $R$ and friction $F$.',
              ),
              diagram(ladderSvg(A43)),
              prose(
                'A smooth wall gives no friction, so $S$ is **horizontal**. The ladder would slide out at the foot, so friction points **towards** the wall.',
              ),
              prose(
                'Take moments about the foot $A$: $R$ and $F$ both act there and drop out. The perpendicular distances come from the angle $\\alpha$ with the ground: the height of $B$, $L\\sin\\alpha$, for $S$, and $\\tfrac{L}{2}\\cos\\alpha$ for the weight. Then resolve: horizontally $F = S$, vertically $R$ = the total weight.',
              ),
              prose('A $4\\text{ m}$ ladder of weight $200\\text{ N}$, with $\\sin\\alpha = 0.8$ and $\\cos\\alpha = 0.6$:'),
              stacked('S \\times 4\\sin\\alpha = 200 \\times 2\\cos\\alpha', '3.2S = 240', 'S = 75', 'F = S = 75\\text{ N}', 'R = 200\\text{ N}'),
            ),
            ask('force-ladder'),
            teach(
              prose(
                'A person on the ladder is one more weight, with its own moment about $A$: their distance up the ladder times $\\cos\\alpha$. Put $800\\text{ N}$ on the same ladder, $3\\text{ m}$ up from $A$:',
              ),
              stacked('S: \\; 4\\sin\\alpha = 3.2', 'W: \\; 2\\cos\\alpha = 1.2', 'P: \\; 3\\cos\\alpha = 1.8'),
              stacked('3.2S = 200 \\times 1.2 + 800 \\times 1.8', '= 240 + 1440 = 1680', 'S = 525', 'R = 1000'),
            ),
            ask('force-ladder-table'),
            ask('force-ladder-table', 2),
            teach(
              prose(
                'Friction can give at most $\\mu R$. The ladder stays put while $F \\le \\mu R$, so the least coefficient of friction that holds it is $\\mu = \\tfrac{F}{R}$. With the person above, $F = S = 525$:',
              ),
              display('\\mu = \\frac{525}{1000} = 0.525'),
              prose(
                'A person climbing adds to $R$, and adds even more to the moment about $A$ the higher they go, so a ladder that is safe at the bottom can slip near the top. With $\\mu = 0.6$, how far up can they go? On the point of slipping $F = 0.6 \\times 1000 = 600 = S$:',
              ),
              stacked('600 \\times 3.2 = 240 + 800 \\times 0.6s', '1920 - 240 = 480s', '1680 = 480s', 's = 3.5\\text{ m}'),
            ),
            ask('force-ladder-flow'),
            ask('force-ladder-limit-tree'),
            ask('force-ladder+choice', 2),
            ask('force-ladder-limit-tree', 2),
            ask('force-ladder-flow', 2),
          ],
          skillCheck: [ask('force-ladder', 2), ask('force-ladder-limit-tree', 2), ask('force-ladder-table', 2)],
        },
      ],
      levelCheck: [
        ask('force-moment', 2),
        ask('force-moment-sense', 2),
        ask('force-moment-sum-steps', 2),
        ask('force-rod', 2),
        ask('force-rod-reactions-tree', 2),
        ask('force-plank', 2),
        ask('force-plank-table', 2),
        ask('force-plank-unknown', 2),
        ask('force-tilt', 2),
        ask('force-tilt-flow', 2),
        ask('force-tipping-tree', 2),
        ask('force-ladder', 2),
        ask('force-ladder-limit-tree', 2),
        ask('force-ladder-flow', 2),
      ],
    },
    {
      id: 'fo-l5',
      title: 'Momentum and Impulse',
      lessons: [
        {
          id: 'fo-l5-momentum',
          title: 'Momentum',
          slides: [
            teach(
              prose(
                'The **momentum** of a moving particle is its mass times its velocity, $p = mv$. With mass in kilograms and velocity in $\\text{m s}^{-1}$, momentum is in $\\text{kg m s}^{-1}$.',
              ),
              prose(
                'Velocity has a direction, so momentum does too. Along a line, choose a positive direction and give each velocity a sign. With right positive, a $3\\text{ kg}$ trolley moving left at $4\\text{ m s}^{-1}$ has',
              ),
              diagram(collisionSvg([{ title: '', bodies: [{ name: 'A', mass: 3, v: -4 }] }], 'A 3 kg trolley moving left at 4 metres per second')),
              display('p = 3 \\times (-4) = -12\\text{ kg m s}^{-1}'),
            ),
            ask('force-momentum'),
            ask('force-momentum-table'),
            ask('force-momentum-slider'),
            teach(
              prose(
                'In two dimensions the velocity is a vector, and so is the momentum: multiply each component by the mass. A $2\\text{ kg}$ particle moving with velocity $(3\\mathbf{i} - 5\\mathbf{j})\\text{ m s}^{-1}$ has',
              ),
              working('\\mathbf{p} &= 2(3\\mathbf{i} - 5\\mathbf{j})', '&= (6\\mathbf{i} - 10\\mathbf{j})\\text{ kg m s}^{-1}'),
              prose(
                'If you are given a speed and a direction instead, find the velocity first: scale the direction vector to that length, as for a force in Forces as Vectors.',
              ),
            ),
            ask('force-momentum-tiles'),
            ask('force-momentum+choice', 2),
            ask('force-momentum-table', 2),
            teach(
              prose(
                'The total momentum of several particles on a line is the sum of their momenta, signs and all. Particles moving opposite ways partly cancel: $2 \\times 5 + 4 \\times (-3) = -2$.',
              ),
              prose('Run $p = mv$ backwards for a velocity, $v = \\tfrac{p}{m}$: its sign says which way the particle moves.'),
            ),
            ask('force-momentum-slider', 2),
            ask('force-momentum-tiles', 2),
          ],
          skillCheck: [ask('force-momentum', 2), ask('force-momentum-tiles', 2), ask('force-momentum-table', 2)],
        },
        {
          id: 'fo-l5-conservation',
          title: 'Conservation of Momentum',
          slides: [
            teach(
              prose(
                'When two particles collide, each pushes on the other. By the third law the two forces are equal and opposite, and they last exactly as long, so whatever momentum one gains the other loses.',
              ),
              prose(
                'So the **total momentum is conserved**: the same after the collision as before. With $u$ for velocities before and $v$ for after:',
              ),
              working('& m_{A}u_{A} + m_{B}u_{B}', '&= m_{A}v_{A} + m_{B}v_{B}'),
              diagram(
                collisionSvg(
                  [
                    { title: 'Before', bodies: [{ name: 'A', mass: 2, v: 6 }, { name: 'B', mass: 4, v: 0 }] },
                    { title: 'After', bodies: [{ name: 'A', mass: 2, v: -2 }, { name: 'B', mass: 4, v: 4 }] },
                  ],
                  'A 2 kg particle moving right at 6 hits a 4 kg particle at rest; afterwards A moves left at 2 and B right at 4',
                ),
              ),
            ),
            ask('force-collide-tiles'),
            ask('force-collide'),
            ask('force-collide-sum-tree'),
            teach(
              prose(
                'Signs do the work. Take right as positive: a particle moving left has a negative velocity, and so a negative momentum.',
              ),
              prose(
                'Draw an unknown velocity the positive way. If the answer comes out negative, the particle is moving the other way. In the first picture, total before is $2 \\times 6 = 12$ and total after is $2 \\times (-2) + 4 \\times 4 = 12$.',
              ),
            ),
            ask('force-collide-flow'),
            ask('force-collide-tiles', 2),
            ask('force-collide-sum-tree', 2),
            teach(
              prose(
                'A particle can be stopped dead by a collision, or bounce back. Work out its momentum after from the total, then read its direction from the sign: positive carries on, zero stops, negative reverses.',
              ),
            ),
            ask('force-collide+choice', 2),
            ask('force-collide-flow', 2),
          ],
          skillCheck: [ask('force-collide', 2), ask('force-collide-sum-tree', 2), ask('force-collide-flow', 2)],
        },
        {
          id: 'fo-l5-coalesce',
          title: 'Coalescing and Separating',
          slides: [
            teach(
              prose(
                'Particles that **coalesce** stick together and move on as one, with a single velocity $v$. Momentum is still conserved, so',
              ),
              working('& m_{A}u_{A} + m_{B}u_{B}', '&= (m_{A} + m_{B})v'),
              diagram(
                collisionSvg(
                  [
                    { title: 'Before', bodies: [{ name: 'A', mass: 3, v: 5 }, { name: 'B', mass: 2, v: -5 }] },
                    { title: 'After', bodies: [{ name: 'A+B', mass: 5, v: 1 }] },
                  ],
                  'A 3 kg particle moving right at 5 meets a 2 kg particle moving left at 5; stuck together they move right at 1',
                ),
              ),
              prose('Here $3 \\times 5 + 2 \\times (-5) = 5$, shared by $5\\text{ kg}$, so $v = 1\\text{ m s}^{-1}$.'),
            ),
            ask('force-coalesce'),
            ask('force-joint-steps'),
            ask('force-collide-flow', 2),
            teach(
              prose(
                'Run the other way: two bodies at rest pushed apart by a spring, an explosion or one pushing off the other. The total momentum before is zero, so it is zero after too:',
              ),
              display('0 = m_{A}v_{A} + m_{B}v_{B}'),
              prose(
                "Their momenta are equal and opposite. They move apart in opposite directions, and the lighter one moves faster: a cannon recoils slowly as its shell flies off.",
              ),
            ),
            ask('force-separate-table'),
            ask('force-separate-flow'),
            ask('force-joint-steps', 2),
            teach(
              prose(
                "The same equation finds a missing velocity or mass before the collision, given the common velocity after. Write it out in full, put in every number you know, and solve for what is left.",
              ),
            ),
            ask('force-coalesce', 2),
            ask('force-separate-table', 2),
          ],
          skillCheck: [ask('force-coalesce', 2), ask('force-separate-table', 2), ask('force-separate-flow', 2)],
        },
        {
          id: 'fo-l5-impulse',
          title: 'Impulse',
          slides: [
            teach(
              prose(
                'The **impulse** $I$ on a particle is the change in its momentum, after minus before. It is measured in newton seconds, $\\text{N s}$, the same unit as $\\text{kg m s}^{-1}$.',
              ),
              display('I = mv - mu'),
              prose(
                'A $0.5\\text{ kg}$ ball moving right at $6\\text{ m s}^{-1}$ hits a wall and bounces back at $4\\text{ m s}^{-1}$. With right positive, $I = 0.5 \\times (-4) - 0.5 \\times 6 = -5\\text{ N s}$: size $5\\text{ N s}$, pointing away from the wall. The velocity changes sign, so the speeds add.',
              ),
            ),
            ask('force-impulse'),
            ask('force-bounce-tree'),
            teach(
              prose(
                'Given the impulse, add it to the momentum before for the momentum after: $mv = mu + I$. An impulse the way the particle moves speeds it up; one against it slows it down, and a big enough one turns it round.',
              ),
              prose('A $2\\text{ kg}$ particle moving left at $3\\text{ m s}^{-1}$ gets an impulse of $10\\text{ N s}$ to the right. With right positive, $u = -3$:'),
              stacked('2v = 2 \\times (-3) + 10', '2v = 4', 'v = 2'),
              prose('Positive: it has turned round, and moves right at $2\\text{ m s}^{-1}$.'),
            ),
            ask('force-impulse-slider'),
            ask('force-impulse-slider', 2),
            ask('force-impulse', 2),
            ask('force-bounce-tree', 2),
            teach(
              prose(
                "In a collision, $A$ pushes $B$ exactly as hard and for exactly as long as $B$ pushes $A$. So the impulses on the two are **equal and opposite**, which is just why the total momentum does not change.",
              ),
              display('I_{B} = -I_{A}'),
              prose("Work out one particle's impulse from its change in momentum, then turn it round for the other."),
            ),
            ask('force-impulse-pair-tiles'),
            ask('force-impulse-pair-tiles', 2),
          ],
          skillCheck: [ask('force-impulse', 2), ask('force-bounce-tree', 2), ask('force-impulse-pair-tiles', 2)],
        },
        {
          // A dropped object's impact speed is Kinematics' kn-l2-more; work and energy come in a later level.
          id: 'fo-l5-force-time',
          title: 'Force and Time',
          slides: [
            teach(
              prose(
                'A constant force $F$ acting for a time $t$ gives an impulse $Ft$. From $F = ma$ with $a = \\tfrac{v - u}{t}$, that is the change in momentum:',
              ),
              display('Ft = mv - mu'),
              prose(
                'A force of $6\\text{ N}$ for $2\\text{ s}$ on a $3\\text{ kg}$ particle moving at $1\\text{ m s}^{-1}$: $6 \\times 2 = 3v - 3 \\times 1$, so $v = 5\\text{ m s}^{-1}$. Any one of $F$, $t$, $u$ and $v$ can be the unknown.',
              ),
            ),
            ask('force-ft'),
            ask('force-ft-flow'),
            ask('force-ft-table'),
            teach(
              prose(
                'With vectors the rule is the same, component by component. A force $\\mathbf{F}$ for $t$ seconds gives the impulse $\\mathbf{I} = \\mathbf{F}t$, and',
              ),
              display('\\mathbf{I} = m\\mathbf{v} - m\\mathbf{u}'),
              prose('So $m\\mathbf{v} = m\\mathbf{u} + \\mathbf{I}$: add the impulse to the momentum, then divide by the mass.'),
            ),
            ask('force-impulse-ij-tiles'),
            ask('force-ft+choice', 2),
            ask('force-impulse-ij-tiles', 2),
            teach(
              prose(
                'A force against the motion has the opposite sign to the velocity. It slows the particle, can stop it, and given long enough sends it back the other way. When forces act one after another, each stage starts from the velocity the last one left.',
              ),
            ),
            ask('force-ft-table', 2),
            ask('force-ft-flow', 2),
          ],
          skillCheck: [ask('force-ft', 2), ask('force-impulse-ij-tiles', 2), ask('force-ft-flow', 2)],
        },
      ],
      levelCheck: [
        ask('force-momentum', 2),
        ask('force-momentum-table', 2),
        ask('force-collide-tiles', 2),
        ask('force-collide', 2),
        ask('force-collide-flow', 2),
        ask('force-collide-sum-tree', 2),
        ask('force-coalesce', 2),
        ask('force-separate-flow', 2),
        ask('force-joint-steps', 2),
        ask('force-impulse', 2),
        ask('force-bounce-tree', 2),
        ask('force-impulse-pair-tiles', 2),
        ask('force-ft', 2),
        ask('force-ft-table', 2),
        ask('force-impulse-ij-tiles', 2),
      ],
    },
    {
      id: 'fo-l6',
      title: 'Work, Energy and Power',
      lessons: [
        {
          id: 'fo-l6-work',
          title: 'Work Done by a Force',
          slides: [
            teach(
              prose(
                'When a constant force moves an object a distance $d$ in the direction the force acts, the force does **work** $W = Fd$. With force in newtons and distance in metres, work is in **joules**, $\\text{J}$.',
              ),
              prose('A horizontal pull of $20\\text{ N}$ drags a crate $3\\text{ m}$ across a floor: $W = 20 \\times 3 = 60\\text{ J}$.'),
              prose('Run it backwards by dividing: $60\\text{ J}$ over $3\\text{ m}$ needs $F = 60 \\div 3 = 20\\text{ N}$, and $60\\text{ J}$ from a $20\\text{ N}$ force means $d = 60 \\div 20 = 3\\text{ m}$.'),
            ),
            ask('force-work-table'),
            ask('force-work-table', 2),
            teach(
              prose('A force at an angle $\\alpha$ to the motion does work only through its part along the motion, $F\\cos\\alpha$:'),
              display('W = Fd\\cos\\alpha'),
              diagram(pullSvg(A34)),
              prose(
                'A force at right angles to the motion does no work at all. On a box sliding along a level floor, the weight and the normal reaction do none.',
              ),
              prose('A rope with tension $30\\text{ N}$ at $\\alpha$ above the floor, $\\cos\\alpha = 0.8$, pulls a box $5\\text{ m}$:'),
              stacked('T\\cos\\alpha = 30 \\times 0.8 = 24', 'W = 24 \\times 5 = 120\\text{ J}'),
            ),
            ask('force-work'),
            ask('force-pull-work-flow'),
            ask('force-work+choice', 2),
            teach(
              prose(
                'Lifting a mass $m$ through a height $h$ at a steady speed takes a force $mg$ upwards, so the work done against gravity is $mgh$.',
              ),
              prose('A $5\\text{ kg}$ box lifted $2\\text{ m}$: $W = 5 \\times 9.8 \\times 2 = 98\\text{ J}$.'),
              prose('Up a slope, only the height gained counts. Pulled a distance $d$ up a slope at an angle $\\alpha$, the height is $d\\sin\\alpha$. The same box pulled $10\\text{ m}$ up a slope with $\\sin\\alpha = 0.6$:'),
              stacked('h = 10 \\times 0.6 = 6', 'W = 5 \\times 9.8 \\times 6 = 294\\text{ J}'),
              diagram(slopeSvg(A34, { pull: 'along' })),
            ),
            ask('force-lift-work-steps'),
            ask('force-lift-work-steps', 2),
            ask('force-pull-work-flow', 2),
          ],
          skillCheck: [ask('force-work', 2), ask('force-pull-work-flow', 2), ask('force-lift-work-steps', 2)],
        },
        {
          id: 'fo-l6-energy',
          title: 'Kinetic and Potential Energy',
          slides: [
            teach(
              prose(
                'A moving body has **kinetic energy** $\\tfrac{1}{2}mv^{2}$, in joules. The speed is squared, so doubling it makes the energy four times as big.',
              ),
              display('\\tfrac{1}{2} \\times 2 \\times 3^{2} = 9\\text{ J}'),
              prose('That is a $2\\text{ kg}$ trolley at $3\\text{ m s}^{-1}$. Its change in kinetic energy is after minus before, negative when it slows. Speeding up to $5\\text{ m s}^{-1}$, it gains $\\tfrac{1}{2} \\times 2 \\times 5^{2} - 9 = 25 - 9 = 16\\text{ J}$.'),
              prose('Run it backwards for a speed: double the energy, divide by the mass, then take the square root. The trolley with $25\\text{ J}$:'),
              stacked('v^{2} = \\frac{2 \\times 25}{2} = 25', 'v = \\sqrt{25} = 5\\text{ m s}^{-1}'),
            ),
            ask('force-ke'),
            ask('force-ke-change-tree'),
            ask('force-ke+choice', 2),
            teach(
              prose(
                'A body raised through a height $h$ gains **gravitational potential energy** $mgh$: exactly the work done lifting it. Coming back down, it loses the same amount.',
              ),
              display('\\text{PE} = mgh'),
              prose('A $2\\text{ kg}$ box lifted $3\\text{ m}$ gains $2 \\times 9.8 \\times 3 = 58.8\\text{ J}$. Backwards, a height is the energy over the weight: $58.8 \\div 19.6 = 3\\text{ m}$.'),
            ),
            ask('force-pe-slider'),
            ask('force-ke-change-tree', 2),
            teach(
              prose(
                'With no air resistance, the only force doing work on a falling body is its weight. So the potential energy it loses is exactly the kinetic energy it gains:',
              ),
              display('\\tfrac{1}{2}mv^{2} = \\tfrac{1}{2}mu^{2} + mgh'),
              diagram(dropSvg()),
              prose('A $2\\text{ kg}$ stone dropped from rest $10\\text{ m}$ up loses $2 \\times 9.8 \\times 10 = 196\\text{ J}$, all of it kinetic at the ground:'),
              stacked('\\tfrac{1}{2} \\times 2 \\times v^{2} = 196', 'v^{2} = 196', 'v = 14\\text{ m s}^{-1}'),
              prose('Thrown down at $7\\text{ m s}^{-1}$ from $7.5\\text{ m}$ instead, it starts with $49\\text{ J}$ and loses $147\\text{ J}$, so again $49 + 147 = 196$ and $v = 14$.'),
            ),
            ask('force-energy-swap-flow'),
            ask('force-pe-slider', 2),
            ask('force-energy-swap-flow', 2),
          ],
          skillCheck: [ask('force-ke', 2), ask('force-ke-change-tree', 2), ask('force-energy-swap-flow', 2)],
        },
        {
          // Impact speeds by suvat are Kinematics' kn-l2-more; energy is the other route to them.
          id: 'fo-l6-work-energy',
          title: 'The Work-Energy Principle',
          slides: [
            teach(
              prose('The **work-energy principle**: the total work done on a body by all the forces on it is its change in kinetic energy.'),
              display('\\text{work done} = \\tfrac{1}{2}mv^{2} - \\tfrac{1}{2}mu^{2}'),
              prose('On a smooth level floor only a push along it does work, so a push $F$ over a distance $d$ gives $Fd = \\tfrac{1}{2}mv^{2} - \\tfrac{1}{2}mu^{2}$. A $2\\text{ kg}$ box at $3\\text{ m s}^{-1}$ pushed by $8\\text{ N}$ for $5\\text{ m}$:'),
              stacked('\\tfrac{1}{2} \\times 2 \\times v^{2}', '= \\tfrac{1}{2} \\times 2 \\times 3^{2} + 8 \\times 5', '= 9 + 40 = 49', 'v^{2} = 49', 'v = 7'),
              prose('Backwards, for the distance: to take it from $3$ to $7\\text{ m s}^{-1}$ the push must do $49 - 9 = 40\\text{ J}$, so $8d = 40$ and $d = 5\\text{ m}$. Given the $5\\text{ m}$ instead, the force is $F = 40 \\div 5 = 8\\text{ N}$.'),
            ),
            ask('force-work-energy'),
            ask('force-work-energy-tiles'),
            ask('force-work-energy+choice', 2),
            teach(
              prose(
                'Down a smooth slope the normal reaction is at right angles to the motion and does no work; the weight does $mgh$, with $h$ the height dropped. So the speed at the foot depends on the height, not the angle.',
              ),
              prose(
                'A $2\\text{ kg}$ box moving at $7\\text{ m s}^{-1}$, $12.5\\text{ m}$ from the foot along a slope with $\\sin\\alpha = 0.6$:',
              ),
              stacked('h = 12.5 \\times 0.6 = 7.5', 'mgh = 2 \\times 9.8 \\times 7.5 = 147', '\\tfrac{1}{2}mv^{2} = 49 + 147 = 196', 'v^{2} = 196', 'v = 14'),
              prose(
                'Kinematics found speeds like this with $v^{2} = u^{2} + 2as$. Energy gets there without the acceleration: divide $\\tfrac{1}{2}mv^{2} = \\tfrac{1}{2}mu^{2} + mgh$ by $m$ and it is the same equation.',
              ),
              diagram(slopeSvg(A34)),
            ),
            ask('force-slope-speed-tree'),
            ask('force-slope-speed-tree', 2),
            teach(
              prose(
                'A resistance acts against the motion, so the work it does is negative. The kinetic energy gained is the work done by the pull less the work done against the resistance.',
              ),
              display('\\tfrac{1}{2}mv^{2} - \\tfrac{1}{2}mu^{2} = Pd - Rd'),
              prose('A $4\\text{ kg}$ trolley from rest, pulled by $30\\text{ N}$ for $10\\text{ m}$ against $10\\text{ N}$:'),
              stacked('300 - 100 = 200\\text{ J gained}', '\\tfrac{1}{2} \\times 4 \\times v^{2} = 200', 'v^{2} = 100', 'v = 10'),
            ),
            ask('force-net-work-steps'),
            ask('force-net-work-steps', 2),
            ask('force-work-energy-tiles', 2),
          ],
          skillCheck: [ask('force-work-energy', 2), ask('force-slope-speed-tree', 2), ask('force-net-work-steps', 2)],
        },
        {
          // Limiting friction, F = mu R, is fo-l1-friction.
          id: 'fo-l6-friction',
          title: 'Work Against Friction',
          slides: [
            teach(
              prose(
                'A body sliding on a rough surface meets friction at its limit, $F = \\mu R$, acting against the motion the whole way. So the work done against friction over a distance $d$ is',
              ),
              display('W = \\mu R d'),
              prose('On a level floor $R = mg$. On a slope at an angle $\\alpha$, $R = mg\\cos\\alpha$. A $5\\text{ kg}$ block sliding $4\\text{ m}$ on a level floor with $\\mu = 0.5$:'),
              stacked('R = 5 \\times 9.8 = 49', 'F = 0.5 \\times 49 = 24.5', 'W = 24.5 \\times 4 = 98\\text{ J}'),
            ),
            ask('force-friction-work'),
            ask('force-friction-work+choice', 2),
            teach(
              prose(
                'A body that slides to rest has used up all its kinetic energy against the resistance: the work done against it, $Fd$, equals the kinetic energy at the start. A $2\\text{ kg}$ parcel at $7\\text{ m s}^{-1}$ against $7\\text{ N}$:',
              ),
              stacked('\\tfrac{1}{2} \\times 2 \\times 7^{2} = 49', '7d = 49', 'd = 7\\text{ m}'),
              prose(
                'With friction, $F = \\mu mg$, so $\\mu mg d = \\tfrac{1}{2}mu^{2}$. With $\\mu = 0.25$: $F = 0.25 \\times 19.6 = 4.9$ and $d = 49 \\div 4.9 = 10\\text{ m}$. The mass is on both sides and cancels, so how far it slides does not depend on it.',
              ),
            ),
            ask('force-stopping-slider'),
            ask('force-stopping-flow'),
            ask('force-stopping-slider', 2),
            teach(
              prose(
                'If it does not stop, the kinetic energy left is what it started with less the work done against friction. A $2\\text{ kg}$ block at $14\\text{ m s}^{-1}$ slides $15\\text{ m}$ with $\\mu = 0.5$:',
              ),
              stacked('\\tfrac{1}{2} \\times 2 \\times 14^{2} = 196', '\\mu mgd = 0.5 \\times 19.6 \\times 15 = 147', '\\tfrac{1}{2} \\times 2 \\times v^{2} = 196 - 147 = 49', 'v = 7\\text{ m s}^{-1}'),
              prose(
                'With a pull as well, add the work done by the pull: $\\tfrac{1}{2}mv^{2} = \\tfrac{1}{2}mu^{2} + Pd - \\mu R d$. From rest, pulled by $9.8\\text{ N}$ for $10\\text{ m}$ with $\\mu = 0.25$: $0 + 98 - 49 = 49$, so again $v = 7$.',
              ),
            ),
            ask('force-rough-speed-tree'),
            ask('force-rough-speed-tree', 2),
            ask('force-stopping-flow', 2),
          ],
          skillCheck: [ask('force-friction-work', 2), ask('force-rough-speed-tree', 2), ask('force-stopping-flow', 2)],
        },
        {
          id: 'fo-l6-power',
          title: 'Power',
          slides: [
            teach(
              prose(
                '**Power** is the rate of doing work, in watts: $1\\text{ W}$ is $1\\text{ J}$ each second, and $1\\text{ kW} = 1000\\text{ W}$. A driving force $F$ moving at a speed $v$ does $Fv$ joules of work each second, so',
              ),
              display('P = Fv'),
              diagram(
                arrowsSvg(
                  [
                    { to: [3.6, 0], name: 'F' },
                    { to: [-3, 0], name: 'R', faint: true },
                  ],
                  {
                    span: 5,
                    axes: false,
                    lines: [
                      [
                        [-4.8, -0.6],
                        [4.8, -0.6],
                      ],
                    ],
                    dot: [0, 0],
                    label: 'A vehicle on a level road, the driving force forwards and the resistance backwards',
                  },
                ),
              ),
              prose('A driving force of $2000\\text{ N}$ at $15\\text{ m s}^{-1}$: $P = 2000 \\times 15 = 30\\,000\\text{ W}$. Backwards, $24\\,000\\text{ W}$ at $12\\text{ m s}^{-1}$ means $F = 24\\,000 \\div 12 = 2000\\text{ N}$, and $v = P \\div F$ the same way.'),
            ),
            ask('force-power'),
            ask('force-power-table'),
            ask('force-power+choice', 2),
            teach(
              prose(
                'At a constant power, the faster a vehicle goes the less driving force it has, $F = \\tfrac{P}{v}$. It speeds up until the driving force just balances the resistance: then it stops accelerating, at its **top speed** $v = \\tfrac{P}{R}$.',
              ),
              prose('A car working at $30\\,000\\text{ W}$ against $1500\\text{ N}$: at top speed $F = R = 1500$, so $v = 30\\,000 \\div 1500 = 20\\text{ m s}^{-1}$.'),
            ),
            ask('force-top-speed-flow'),
            ask('force-power-table', 2),
            teach(
              prose(
                "Below top speed, Newton's second law gives the acceleration: $\\tfrac{P}{v} - R = ma$. A $1000\\text{ kg}$ car at $30\\,000\\text{ W}$ against $1000\\text{ N}$, at $10\\text{ m s}^{-1}$:",
              ),
              stacked('F = 30\\,000 \\div 10 = 3000', '3000 - 1000 = 1000a', 'a = 2'),
              prose('Up a hill at an angle $\\alpha$, the part of the weight down the slope, $mg\\sin\\alpha$, has to be beaten as well:'),
              display('\\frac{P}{v} - R - mg\\sin\\alpha = ma'),
              prose('With $\\sin\\alpha = \\tfrac{1}{49}$, $mg\\sin\\alpha = 9800 \\div 49 = 200$, so $3000 - 1000 - 200 = 1000a$ and $a = 1.8$. Its top speed up the hill is where $F = 1000 + 200 = 1200$: $v = 30\\,000 \\div 1200 = 25\\text{ m s}^{-1}$.'),
            ),
            ask('force-power-accel-tree'),
            ask('force-top-speed-flow', 2),
            ask('force-power-accel-tree', 2),
          ],
          skillCheck: [ask('force-power', 2), ask('force-top-speed-flow', 2), ask('force-power-accel-tree', 2)],
        },
      ],
      levelCheck: [
        ask('force-work', 2),
        ask('force-pull-work-flow', 2),
        ask('force-lift-work-steps', 2),
        ask('force-ke', 2),
        ask('force-ke-change-tree', 2),
        ask('force-energy-swap-flow', 2),
        ask('force-work-energy', 2),
        ask('force-slope-speed-tree', 2),
        ask('force-work-energy-tiles', 2),
        ask('force-friction-work', 2),
        ask('force-rough-speed-tree', 2),
        ask('force-stopping-flow', 2),
        ask('force-power', 2),
        ask('force-power-accel-tree', 2),
        ask('force-top-speed-flow', 2),
      ],
    },
  ],
};
