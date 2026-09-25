/**
 * Geometry, level 3: Lengths.
 *
 * Perimeters, the circumference of a circle, and arc length (the owner's
 * second inspiration screenshot: an arc as a fraction of the circle, then the
 * angle that cuts it). Generators and figures are in
 * `generators/geometryLengths.ts`.
 */
import type { Level } from '../../types';
import { circleSvg, lShapeSvg, partCircleSvg, rectSvg, sectorSvg, triangleSidesSvg } from '../../generators/geometryLengths';
import { ask, diagram, display, prose, teach } from './blocks';

export const lengths: Level = {
  id: 'geo-l3',
  title: 'Lengths',
  lessons: [
    {
      id: 'geo-l3-perimeters',
      title: 'Perimeters',
      slides: [
        teach(
          prose('The **perimeter** of a shape is the distance all the way round it: add up the lengths of its sides.'),
          diagram(triangleSidesSvg(7, 9, 5, ['7 cm', '9 cm', '5 cm'])),
          display('5 + 7 + 9 = 21'),
          prose('The perimeter is $21\\text{ cm}$. A rectangle has two lengths and two widths, so an $8\\text{ cm}$ by $3\\text{ cm}$ rectangle has'),
          display('8 + 3 + 8 + 3 = 22'),
          prose('Matching marks on two sides mean they are the same length, so a side with a mark and no number has the length of its partner.'),
        ),
        ask('geo-perim-poly'),
        ask('geo-perim-poly+choice', 2),
        teach(
          prose('Backwards: a missing side from the perimeter. One length and one width make half the perimeter of a rectangle:'),
          diagram(rectSvg(9, 6, '9 cm', 'x')),
          prose('With a perimeter of $30\\text{ cm}$:'),
          display('9 + x = 30 \\div 2 = 15'),
          display('x = 15 - 9 = 6'),
          prose('An isosceles triangle with a perimeter of $32\\text{ cm}$ and a base of $10\\text{ cm}$: the two equal sides share what is left.'),
          display('2x = 32 - 10 = 22'),
          display('x = 22 \\div 2 = 11'),
        ),
        ask('geo-rect-missing'),
        ask('geo-rect-missing+choice', 2),
        teach(
          prose('In an L-shape every corner is a right angle, so a missing side comes from the sides opposite it.'),
          diagram(lShapeSvg({ W: 12, H: 9, a: 5, b: 4 }, { W: '12 cm', H: '9 cm', t: '7 cm', r: '5 cm', a: 'a', b: 'b' })),
          prose('The top and $a$ make the bottom, and the right side and $b$ make the left:'),
          display('a = 12 - 7 = 5 \\qquad b = 9 - 5 = 4'),
          prose('Then add all six sides:'),
          display('12 + 5 + 5 + 4 + 7 + 9 = 42'),
          prose('Given the top and the step, the bottom is their sum: $7 + 5 = 12$.'),
        ),
        ask('geo-lshape-sides'),
        ask('geo-perim-lshape'),
        ask('geo-lshape-sides', 2),
        ask('geo-perim-lshape+choice', 2),
      ],
      skillCheck: [ask('geo-perim-poly', 2), ask('geo-rect-missing', 2), ask('geo-perim-lshape', 2)],
    },
    {
      id: 'geo-l3-circumference',
      title: 'Circumference',
      slides: [
        teach(
          prose('The **radius** $r$ goes from the centre of a circle to its edge. The **diameter** $d$ goes right across through the centre, so it is two radii:'),
          diagram(circleSvg('r', '6 cm')),
          display('d = 2r = 2 \\times 6 = 12'),
          prose('Backwards, the radius is half the diameter. A diameter of $9\\text{ cm}$:'),
          display('r = 9 \\div 2 = 4.5'),
        ),
        ask('geo-circ-rd'),
        ask('geo-circ-rd+choice', 2),
        teach(
          prose('The **circumference** $C$ is the perimeter of a circle. It is $\\pi$ times the diameter, where $\\pi$ is a number a little over $3$:'),
          display('C = \\pi d = 2\\pi r'),
          prose('Leave the answer **in terms of** $\\pi$, using the $\\pi$ key. A radius of $5\\text{ cm}$:'),
          display('C = 2 \\times \\pi \\times 5 = 10\\pi'),
          prose('Backwards: a circumference of $18\\pi\\text{ cm}$ means the diameter is $18\\text{ cm}$, so the radius is $9\\text{ cm}$.'),
        ),
        ask('geo-circumference'),
        ask('geo-circ-back'),
        ask('geo-circumference+choice', 2),
        teach(
          prose('A **semicircle** is half a circle. Its perimeter is half the circumference plus the diameter across the bottom:'),
          diagram(partCircleSvg('semi', '6 cm')),
          display('\\tfrac{1}{2} \\times 2\\pi \\times 6 = 6\\pi'),
          display('P = 6\\pi + 12'),
          prose('A **quarter circle** has a quarter of the circumference and two radii. With a radius of $4\\text{ cm}$:'),
          display('\\tfrac{1}{4} \\times 2\\pi \\times 4 = 2\\pi'),
          display('P = 2\\pi + 8'),
        ),
        ask('geo-semi-perim'),
        ask('geo-circ-back+choice', 2),
        ask('geo-semi-perim', 2),
      ],
      skillCheck: [ask('geo-circumference', 2), ask('geo-circ-back', 2), ask('geo-semi-perim', 2)],
    },
    {
      id: 'geo-l3-arcs',
      title: 'Arc Length',
      slides: [
        teach(
          prose('A **sector** is a slice of a circle cut by two radii, and its curved edge is an **arc**. The angle at the centre says what fraction of the circle it is, out of $360^\\circ$:'),
          diagram(sectorSvg(90, { angle: '90°' })),
          display('\\frac{90}{360} = \\frac{1}{4}'),
          prose('So this sector is a quarter of the circle, and its arc is a quarter of the circumference.'),
        ),
        ask('geo-arc-fraction'),
        ask('geo-arc-fraction', 2),
        teach(
          prose('The **arc length** is that fraction of the circumference:'),
          display('\\text{arc} = \\frac{\\theta}{360} \\times 2\\pi r'),
          diagram(sectorSvg(60, { angle: '60°', radius: '6 cm', arc: 'x' })),
          prose('With $\\theta = 60^\\circ$ and $r = 6\\text{ cm}$, the whole circumference is $12\\pi$:'),
          display('x = \\frac{60}{360} \\times 12\\pi = \\frac{1}{6} \\times 12\\pi = 2\\pi'),
        ),
        ask('geo-arc-length'),
        ask('geo-arc-length+choice', 2),
        teach(
          prose('Backwards: an arc of $4\\pi\\text{ cm}$ with a radius of $12\\text{ cm}$. The whole circumference is $24\\pi$, so the arc is'),
          display('4\\pi \\div 24\\pi = \\frac{1}{6}'),
          prose('of the circle, and the angle is the same fraction of $360^\\circ$:'),
          display('\\frac{1}{6} \\times 360 = 60'),
          prose('The **perimeter of a sector** is its arc plus the two radii. That sector\'s perimeter is'),
          display('P = 4\\pi + 24'),
        ),
        ask('geo-arc-angle'),
        ask('geo-sector-perim'),
        ask('geo-arc-angle+choice', 2),
        ask('geo-sector-perim', 2),
      ],
      skillCheck: [ask('geo-arc-fraction', 2), ask('geo-arc-length', 2), ask('geo-arc-angle', 2)],
    },
  ],
  levelCheck: [
    ask('geo-perim-poly', 2),
    ask('geo-rect-missing', 2),
    ask('geo-lshape-sides', 2),
    ask('geo-perim-lshape', 2),
    ask('geo-circ-rd', 2),
    ask('geo-circumference', 2),
    ask('geo-circ-back', 2),
    ask('geo-semi-perim', 2),
    ask('geo-arc-fraction', 2),
    ask('geo-arc-length', 2),
    ask('geo-arc-angle', 2),
    ask('geo-sector-perim', 2),
  ],
};
