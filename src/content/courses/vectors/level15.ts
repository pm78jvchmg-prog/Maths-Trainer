/**
 * Vectors, level 15 (`vm-l15`): Journeys and Bearings.
 *
 * Shown last in Vectors Basics. Three-figure bearings and the back bearing; a
 * distance on a bearing as east and north components, and back again, with
 * the quadrant deciding the signs and the rule; journeys of several legs as a
 * sum of vectors; and a velocity plus a current or a wind.
 *
 * Every answer is exact: bearings whose angle to the north-south line is 30,
 * 45 or 60 degrees give surd components, and Pythagorean triples give whole
 * distances and speeds. Generators are in `generators/vectorBearings.ts`.
 */
import type { Level } from '../../types';
import { bearingSvg, readSvg } from '../../generators/vectorBearings';
import { ask, askAfter, diagram, display, prose, stacked, teach } from './blocks';

export const level15: Level = {
  id: 'vm-l15',
  title: 'Journeys and Bearings',
  lessons: [
    {
      id: 'vm-l15-bearings',
      title: 'Bearings',
      slides: [
        teach(
          prose(
            'A **bearing** gives a direction as an angle measured **clockwise from north**, always written with three figures: $045^\\circ$, never $45^\\circ$.',
          ),
          prose(
            'The compass points are $45^\\circ$ apart: north $000^\\circ$, north-east $045^\\circ$, east $090^\\circ$, south-east $135^\\circ$, south $180^\\circ$, south-west $225^\\circ$, west $270^\\circ$, north-west $315^\\circ$.',
          ),
          diagram(readSvg(2, 1, 35)),
          prose(
            'Here the angle is drawn from the south line, turning on clockwise. South is $180^\\circ$, so the bearing of $B$ from $A$ is',
          ),
          display('180^\\circ + 35^\\circ = 215^\\circ'),
          prose('An angle turning back anticlockwise is taken away. $40^\\circ$ anticlockwise from north is'),
          display('360^\\circ - 40^\\circ = 320^\\circ'),
          prose('Angles drawn from east ($090^\\circ$) or west ($270^\\circ$) work the same way.'),
        ),
        ask('vjour-compass'),
        ask('vjour-read'),
        ask('vjour-read+choice'),
        askAfter(
          [
            prose(
              'Turning changes a bearing: clockwise adds, anticlockwise takes away. A ship on $070^\\circ$ turning $50^\\circ$ anticlockwise is on $020^\\circ$. Past north, take off or add a full turn, $360^\\circ$:',
            ),
            stacked('300^\\circ + 80^\\circ = 380^\\circ', '380^\\circ - 360^\\circ = 020^\\circ'),
          ],
          'vjour-turn',
        ),
        teach(
          prose(
            'The bearing of $A$ from $B$ points the opposite way to the bearing of $B$ from $A$: half a turn, $180^\\circ$, round. It is called the **back bearing**.',
          ),
          diagram(bearingSvg(62)),
          prose('The bearing of $B$ from $A$ is $062^\\circ$, less than $180^\\circ$, so add:'),
          display('062^\\circ + 180^\\circ = 242^\\circ'),
          prose('From $300^\\circ$, adding would pass $360^\\circ$, so take $180^\\circ$ away instead:'),
          display('300^\\circ - 180^\\circ = 120^\\circ'),
        ),
        ask('vjour-back'),
        ask('vjour-compass', 2),
        ask('vjour-back+choice', 2),
        ask('vjour-turn', 2),
      ],
      skillCheck: [ask('vjour-read', 2), ask('vjour-back', 2), ask('vjour-turn', 2)],
    },
    {
      id: 'vm-l15-to-vector',
      title: 'From a Bearing to a Vector',
      slides: [
        teach(
          prose(
            'A leg of $d$ km on a bearing $\\theta$ makes a right-angled triangle with the north line. For $\\theta$ between $000^\\circ$ and $090^\\circ$:',
          ),
          display('\\text{east} = d\\sin\\theta \\qquad \\text{north} = d\\cos\\theta'),
          prose('The exact values you need:'),
          stacked(
            '\\sin 30^\\circ = \\cos 60^\\circ = \\tfrac{1}{2}',
            '\\sin 45^\\circ = \\cos 45^\\circ = \\tfrac{\\sqrt{2}}{2}',
            '\\sin 60^\\circ = \\cos 30^\\circ = \\tfrac{\\sqrt{3}}{2}',
          ),
          diagram(bearingSvg(60, 'A', 'B', '10 km')),
          prose('So $10$ km on $060^\\circ$ is'),
          stacked('\\text{east} = 10\\sin 60^\\circ = 5\\sqrt{3}', '\\text{north} = 10\\cos 60^\\circ = 5'),
        ),
        ask('vjour-components'),
        ask('vjour-one-component'),
        ask('vjour-half-slider'),
        teach(
          prose(
            'For any other bearing, find $\\alpha$, the angle between the leg and the north-south line. It gives the sizes:',
          ),
          display('\\text{east size} = d\\sin\\alpha \\qquad \\text{north size} = d\\cos\\alpha'),
          prose(
            'Then the quadrant gives the signs. $000^\\circ$ to $090^\\circ$ heads east and north, $090^\\circ$ to $180^\\circ$ east and south, $180^\\circ$ to $270^\\circ$ west and south, $270^\\circ$ to $360^\\circ$ west and north. West and south are negative.',
          ),
          prose('$10$ km on $210^\\circ$ is $30^\\circ$ past south, so $\\alpha = 30^\\circ$, heading west and south:'),
          stacked('\\text{east} = -10\\sin 30^\\circ = -5', '\\text{north} = -10\\cos 30^\\circ = -5\\sqrt{3}'),
        ),
        ask('vjour-signs'),
        ask('vjour-components', 2),
        ask('vjour-one-component+choice', 2),
        ask('vjour-half-slider', 2),
      ],
      skillCheck: [ask('vjour-components', 2), ask('vjour-one-component', 2), ask('vjour-signs', 2)],
    },
    {
      id: 'vm-l15-to-bearing',
      title: 'From a Vector to a Bearing',
      slides: [
        teach(
          prose(
            'Now the other way. A displacement of $6$ km east and $8$ km south: east and north are at right angles, so its length comes from Pythagoras.',
          ),
          display('d = \\sqrt{\\text{east}^2 + \\text{north}^2}'),
          stacked('d = \\sqrt{6^2 + 8^2}', '= \\sqrt{100} = 10'),
          prose(
            'For its direction, take $\\alpha$, the angle between the displacement and the north-south line. East is opposite $\\alpha$ and north is next to it, so with sizes only',
          ),
          display('\\tan\\alpha = \\frac{\\text{east size}}{\\text{north size}}'),
          prose('Here'),
          display('\\tan\\alpha = \\frac{6}{8} = \\frac{3}{4}'),
        ),
        ask('vjour-distance'),
        ask('vjour-alpha+choice'),
        ask('vjour-distance+choice', 2),
        teach(
          prose('The special angles: $\\tan 30^\\circ = \\frac{1}{\\sqrt{3}}$, $\\tan 45^\\circ = 1$ and $\\tan 60^\\circ = \\sqrt{3}$.'),
          prose('The quadrant then turns $\\alpha$ into a bearing:'),
          stacked(
            '\\text{east and north: } \\alpha',
            '\\text{east and south: } 180^\\circ - \\alpha',
            '\\text{west and south: } 180^\\circ + \\alpha',
            '\\text{west and north: } 360^\\circ - \\alpha',
          ),
          prose('$4$ km west and $4\\sqrt{3}$ km north:'),
          stacked(
            '\\tan\\alpha = \\frac{4}{4\\sqrt{3}} = \\frac{1}{\\sqrt{3}}',
            '\\alpha = 30^\\circ',
            '\\text{bearing} = 360^\\circ - 30^\\circ = 330^\\circ',
          ),
          prose(
            'When $\\alpha$ is not a special angle, $\\tan^{-1}$ on a calculator gives it. $3$ km west and $4$ km south has $\\alpha = 36.9^\\circ$, so its bearing is',
          ),
          display('180^\\circ + 36.9^\\circ = 216.9^\\circ'),
        ),
        ask('vjour-quadrant-flow'),
        ask('vjour-alpha'),
        ask('vjour-to-bearing'),
        ask('vjour-to-bearing+choice', 2),
        ask('vjour-quadrant-flow', 2),
      ],
      skillCheck: [ask('vjour-distance', 2), ask('vjour-to-bearing', 2), ask('vjour-quadrant-flow', 2)],
    },
    {
      id: 'vm-l15-legs',
      title: 'Journeys with Several Legs',
      slides: [
        teach(
          prose(
            'A journey of several legs is a sum of vectors: the legs join end to end, and the total is where you end up. Write each leg as (east, north) in km and add part by part.',
          ),
          display(
            '\\begin{pmatrix} 3 \\\\ 4 \\end{pmatrix} + \\begin{pmatrix} -5 \\\\ 2 \\end{pmatrix} + \\begin{pmatrix} 1 \\\\ -3 \\end{pmatrix} = \\begin{pmatrix} -1 \\\\ 3 \\end{pmatrix}',
          ),
          prose('How far you end from the start is the length of the total, by Pythagoras:'),
          stacked(
            '\\begin{pmatrix} 2 \\\\ 5 \\end{pmatrix} + \\begin{pmatrix} 4 \\\\ 3 \\end{pmatrix} = \\begin{pmatrix} 6 \\\\ 8 \\end{pmatrix}',
            '\\sqrt{6^2 + 8^2} = 10',
          ),
        ),
        ask('vjour-legs-total'),
        ask('vjour-trip-tree'),
        ask('vjour-legs-total', 2),
        teach(
          prose(
            'To head straight back to the start, go the opposite way to the total: its back bearing. A walker goes $6$ km north, then $6$ km west, so ends $6$ km west and $6$ km north of the start.',
          ),
          stacked(
            '\\tan\\alpha = \\frac{6}{6} = 1',
            '\\alpha = 45^\\circ',
            '\\text{out} = 360^\\circ - 45^\\circ = 315^\\circ',
            '\\text{back} = 315^\\circ - 180^\\circ = 135^\\circ',
          ),
          prose('It heads back on $135^\\circ$, and the distance back is'),
          display('\\sqrt{6^2 + 6^2} = 6\\sqrt{2}\\text{ km}'),
        ),
        ask('vjour-home'),
        ask('vjour-home+choice', 2),
        ask('vjour-trip-tree', 2),
        ask('vjour-distance+choice', 2),
      ],
      skillCheck: [ask('vjour-legs-total', 2), ask('vjour-trip-tree', 2), ask('vjour-home', 2)],
    },
    {
      id: 'vm-l15-currents',
      title: 'Currents and Wind',
      slides: [
        teach(
          prose(
            'A boat moves through the water, and the water moves too. Its velocity over the ground is the sum of its own velocity and the current. A plane in a wind works the same way. Take $\\mathbf{i}$ east and $\\mathbf{j}$ north.',
          ),
          display('\\mathbf{v} = \\mathbf{v}_{\\text{own}} + \\mathbf{v}_{\\text{current}}'),
          prose('A boat at $(4\\mathbf{i} + 3\\mathbf{j})\\text{ m s}^{-1}$ in a current of $(2\\mathbf{i} - 5\\mathbf{j})\\text{ m s}^{-1}$:'),
          stacked('(4 + 2)\\mathbf{i} + (3 - 5)\\mathbf{j}', '= 6\\mathbf{i} - 2\\mathbf{j}'),
          prose(
            'Its **speed over the ground** is the length of that sum. Heading due north at $12\\text{ m s}^{-1}$ with a current due east at $5\\text{ m s}^{-1}$, the two are at right angles:',
          ),
          display('\\sqrt{12^2 + 5^2} = \\sqrt{169} = 13'),
        ),
        ask('vjour-current'),
        ask('vjour-ground-speed'),
        ask('vjour-current', 2),
        ask('vjour-ground-speed+choice', 2),
        teach(
          prose(
            'To cross a river **straight**, the boat aims upstream so that part of its own velocity cancels the current. Its own speed $v$ is the hypotenuse, the current $c$ is opposite the aiming angle $\\alpha$, and what is left carries it across:',
          ),
          stacked('\\sin\\alpha = \\frac{c}{v}', '\\text{speed across} = \\sqrt{v^2 - c^2}'),
          prose('A river flows east at $3\\text{ m s}^{-1}$ and a boat moves at $6\\text{ m s}^{-1}$. To go due north:'),
          display('\\sin\\alpha = \\frac{3}{6} = \\frac{1}{2}'),
          prose('So $\\alpha = 30^\\circ$ upstream, west of north: a bearing of $330^\\circ$.'),
          prose(
            'With $\\sin 45^\\circ = \\frac{1}{\\sqrt{2}}$, a boat at $4\\sqrt{2}$ against a current of $4$ aims $45^\\circ$ upstream. A boat at $5\\text{ m s}^{-1}$ against a current of $3$ crosses at',
          ),
          display('\\sqrt{5^2 - 3^2} = 4\\text{ m s}^{-1}'),
        ),
        ask('vjour-steer'),
        ask('vjour-across'),
        ask('vjour-steer', 2),
        ask('vjour-across+choice', 2),
      ],
      skillCheck: [ask('vjour-current', 2), ask('vjour-ground-speed', 2), ask('vjour-across', 2)],
    },
  ],
  levelCheck: [
    ask('vjour-read', 2),
    ask('vjour-back', 2),
    ask('vjour-turn+choice', 2),
    ask('vjour-components', 2),
    ask('vjour-one-component+choice', 2),
    ask('vjour-half-slider', 2),
    ask('vjour-distance', 2),
    ask('vjour-to-bearing', 2),
    ask('vjour-legs-total', 2),
    ask('vjour-trip-tree', 2),
    ask('vjour-home+choice', 2),
    ask('vjour-current', 2),
    ask('vjour-across', 2),
    ask('vjour-steer', 2),
  ],
};
