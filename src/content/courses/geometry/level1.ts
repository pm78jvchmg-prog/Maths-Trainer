/**
 * Geometry, level 1: Angles.
 *
 * The owner's level map has "Angles Made by Lines", "Parallel Lines" and
 * "Triangle Sides and Angles"; its Polygons level comes next here, since a
 * polygon's angle sum is built from the triangle's. Generators and figures are
 * in `generators/geometryAngles.ts`.
 */
import type { Level } from '../../types';
import { betweenSvg, crossSvg, kindSvg, lineSvg, parallelSvg, pointSvg, triangleSvg } from '../../generators/geometryAngles';
import { ask, askAfter, diagram, display, prose, teach } from './blocks';

export const angles: Level = {
  id: 'geo-l1',
  title: 'Angles',
  lessons: [
    {
      id: 'geo-l1-lines',
      title: 'Angles Made by Lines',
      slides: [
        teach(
          prose('Angles are measured in **degrees**. A full turn is $360^\\circ$, half a turn is $180^\\circ$, and a quarter turn, a **right angle**, is $90^\\circ$. A small square marks a right angle.'),
          prose('An angle is named by its size:'),
          prose('**acute**: less than $90^\\circ$'),
          prose('**right**: exactly $90^\\circ$'),
          prose('**obtuse**: between $90^\\circ$ and $180^\\circ$'),
          prose('**reflex**: more than $180^\\circ$'),
          diagram(kindSvg({ a: 130, from: 15 })),
          prose('This angle is $130^\\circ$, between $90^\\circ$ and $180^\\circ$, so it is obtuse.'),
        ),
        ask('geo-angle-kind'),
        ask('geo-angle-kind', 2),
        teach(
          prose('A **straight line** is half a turn, so the angles along it add up to $180^\\circ$.'),
          diagram(lineSvg({ sizes: [130, 50], ask: 1 })),
          display('x + 130 = 180'),
          display('x = 180 - 130 = 50'),
          prose('A **full turn** is $360^\\circ$, so the angles round a point add up to $360^\\circ$.'),
          diagram(pointSvg({ sizes: [150, 90, 120], ask: 2, start: 30 })),
          display('150 + 90 = 240'),
          display('x = 360 - 240 = 120'),
        ),
        ask('geo-line-angle'),
        ask('geo-point-angle'),
        ask('geo-line-angle+choice', 2),
        teach(
          prose('Angles can be written with a letter. Here $2x$ and $3x$ sit on a straight line:'),
          diagram(lineSvg({ sizes: [72, 108], ask: -1 }, ['2x', '3x'])),
          display('2x + 3x = 180'),
          display('5x = 180'),
          display('x = 180 \\div 5 = 36'),
          prose('Then each angle: $2 \\times 36 = 72^\\circ$ and $3 \\times 36 = 108^\\circ$. They add to $180^\\circ$, which checks the answer.'),
          prose('Round a point, the total is $360^\\circ$. Take any angle you know away first: with $x$, $2x$ and $90^\\circ$,'),
          display('3x = 360 - 90 = 270'),
          display('x = 90'),
        ),
        ask('geo-angle-algebra'),
        ask('geo-point-angle+choice', 2),
        ask('geo-angle-algebra', 2),
      ],
      skillCheck: [ask('geo-line-angle', 2), ask('geo-point-angle', 2), ask('geo-angle-algebra', 2)],
    },
    {
      id: 'geo-l1-parallel',
      title: 'Parallel Lines',
      slides: [
        teach(
          prose('Where two straight lines cross, the angles **opposite** each other are equal. These are **vertically opposite** angles.'),
          prose('Angles side by side on one line add up to $180^\\circ$. With one angle of $65^\\circ$:'),
          diagram(crossSvg({ sizes: [65, 115, 65, 115], given: [0, 1, 2, 3], ask: -1, start: 10 })),
          display('180 - 65 = 115'),
          prose('Three lines through one point: any three angles next to each other make a straight line, so they add up to $180^\\circ$.'),
        ),
        ask('geo-cross-angle'),
        ask('geo-cross-angle+choice', 2),
        teach(
          prose('Lines marked with the same arrows are **parallel**: they never meet. A line crossing both makes the same angles at each crossing.'),
          diagram(
            parallelSvg({ phi: 70 }, [
              { i: 2, label: '70°' },
              { i: 6, label: '70°' },
              { i: 4, label: '70°' },
              { i: 5, label: '110°' },
            ]),
          ),
          prose('**Corresponding** angles, in the same position at each crossing (an F shape), are equal.'),
          prose('**Alternate** angles, between the lines on opposite sides (a Z shape), are equal.'),
          prose('**Co-interior** angles, between the lines on the same side (a C shape), add up to $180^\\circ$:'),
          display('180 - 70 = 110'),
        ),
        ask('geo-parallel-name'),
        ask('geo-parallel-find'),
        ask('geo-parallel-name', 2),
        teach(
          prose('A triangle with one corner on the top line and two on the bottom line. The angles at $P$ outside it are $50^\\circ$ and $60^\\circ$.'),
          diagram(betweenSvg({ a: 50, b: 60 })),
          prose('Each bottom corner makes a Z shape with an angle at $P$, so it is equal to it:'),
          display('\\angle PAB = 50 \\qquad \\angle PBA = 60'),
          prose('The three angles at $P$ make a straight line:'),
          display('\\angle APB = 180 - 50 - 60 = 70'),
        ),
        ask('geo-parallel-triangle'),
        askAfter(
          'geo-parallel-find+choice',
          2,
          prose('When two angles make no F, Z or C shape, go through a third. At the crossing of the known angle, find the angle in the same position as $x$ (vertically opposite, or $180^\\circ$ take away). That one and $x$ are corresponding.'),
        ),
        ask('geo-parallel-triangle', 2),
      ],
      skillCheck: [ask('geo-cross-angle', 2), ask('geo-parallel-find', 2), ask('geo-parallel-triangle', 2)],
    },
    {
      id: 'geo-l1-triangles',
      title: 'Triangle Sides and Angles',
      slides: [
        teach(
          prose('The angles in a **triangle** add up to $180^\\circ$. (The last lesson showed why: between parallel lines, a triangle\'s three angles fit together on a straight line.)'),
          diagram(triangleSvg(50, 60, ['50°', '60°', 'x'], { unknown: 2 })),
          display('x = 180 - 50 - 60 = 70'),
          prose('A square in a corner means $90^\\circ$. With a right angle and $35^\\circ$, the third angle is $180 - 90 - 35 = 55^\\circ$.'),
        ),
        ask('geo-triangle-angle'),
        ask('geo-triangle-angle+choice', 2),
        teach(
          prose('Small marks on two sides show they are the same length. That triangle is **isosceles**, and the two angles at the ends of the third side are equal.'),
          diagram(triangleSvg(70, 70, ['x', '', '40°'], { unknown: 0, ticks: [[0, 2], [1, 2]] })),
          prose('The top angle is $40^\\circ$. The two equal angles share what is left:'),
          display('180 - 40 = 140'),
          display('x = 140 \\div 2 = 70'),
          prose('Backwards: two equal angles of $65^\\circ$ leave $180 - 65 - 65 = 50^\\circ$ at the top. With all three sides equal, the triangle is **equilateral** and every angle is $60^\\circ$.'),
        ),
        ask('geo-isosceles'),
        ask('geo-isosceles+choice', 2),
        teach(
          prose('Extend one side of a triangle and the angle outside, the **exterior angle**, equals the two inside angles opposite it added together.'),
          diagram(triangleSvg(50, 60, ['50°', '', '70°'], { extend: true, extLabel: 'x' })),
          display('x = 50 + 70 = 120'),
          prose('Backwards: an exterior angle of $120^\\circ$ with one opposite angle of $50^\\circ$ leaves'),
          display('120 - 50 = 70'),
        ),
        ask('geo-exterior-angle'),
        askAfter(
          'geo-triangle-algebra',
          1,
          prose('Angles of $x$, $2x$ and $3x$ in a triangle:'),
          display('6x = 180'),
          display('x = 30'),
          prose('The largest is $3 \\times 30 = 90^\\circ$.'),
        ),
        ask('geo-exterior-angle+choice', 2),
        askAfter(
          'geo-triangle-algebra',
          2,
          prose('With a known angle, take it away first. Angles of $2x$, $3x$ and $30^\\circ$:'),
          display('5x = 180 - 30 = 150'),
          display('x = 30'),
        ),
      ],
      skillCheck: [ask('geo-triangle-angle', 2), ask('geo-isosceles', 2), ask('geo-exterior-angle', 2)],
    },
  ],
  levelCheck: [
    ask('geo-angle-kind', 2),
    ask('geo-line-angle', 2),
    ask('geo-point-angle', 2),
    ask('geo-angle-algebra', 2),
    ask('geo-cross-angle', 2),
    ask('geo-parallel-name', 2),
    ask('geo-parallel-find', 2),
    ask('geo-parallel-triangle', 2),
    ask('geo-triangle-angle', 2),
    ask('geo-isosceles', 2),
    ask('geo-exterior-angle', 2),
    ask('geo-triangle-algebra', 2),
  ],
};
