/**
 * Geometry, level 4: Scaling.
 *
 * Similar shapes, the scale factor between them, the lengths it gives and the
 * angles it leaves alone, perimeters and map scales. Generators and figures
 * are in `generators/geometryScaling.ts`.
 */
import type { Level } from '../../types';
import { similarSvg, unitFromSides } from '../../generators/geometryScaling';
import { triangleFromAngles } from '../../generators/geometryKit';
import { ask, diagram, display, prose, teach } from './blocks';

export const scaling: Level = {
  id: 'geo-l4',
  title: 'Scaling',
  lessons: [
    {
      id: 'geo-l4-shapes',
      title: 'Scaling Shapes',
      slides: [
        teach(
          prose('Two shapes are **similar** when one is an enlargement of the other: the same shape, with every length multiplied by the same number, the **scale factor** $k$.'),
          diagram(similarSvg(unitFromSides(4, 3, 5), 2, { sides: ['4 cm', '3 cm', '5 cm'] }, { sides: ['8 cm', '6 cm', '10 cm'] })),
          prose('Divide a length on the new shape by the matching length on the old one:'),
          display('k = 10 \\div 5 = 2'),
          prose('Every pair gives the same $k$:'),
          display('8 \\div 4 = 2 \\qquad 6 \\div 3 = 2'),
          prose('Scaling a $3\\text{ cm}$ side by $k = 2$ gives $6\\text{ cm}$:'),
          display('3 \\times 2 = 6'),
        ),
        ask('geo-scale-factor'),
        ask('geo-similar-which'),
        ask('geo-scale-table'),
        teach(
          prose('Scaling changes lengths but **never angles**. Similar triangles have the same three angles.'),
          diagram(similarSvg(triangleFromAngles(50, 70), 1.5, { angles: ['50°', '70°', ''] }, { angles: ['', '', 'x'], unknownAngle: 2 })),
          prose('The matching corner of the first triangle is'),
          display('x = 180 - 50 - 70 = 60'),
          prose('A scale factor need not be whole. From $4\\text{ cm}$ to $6\\text{ cm}$, and from $8\\text{ cm}$ to $4\\text{ cm}$:'),
          display('k = 6 \\div 4 = 1.5 \\qquad k = 4 \\div 8 = 0.5'),
          prose('A factor below $1$ makes the shape smaller.'),
        ),
        ask('geo-similar-angle'),
        ask('geo-scale-factor+choice', 2),
        ask('geo-scale-table', 2),
        ask('geo-similar-angle+choice', 2),
        ask('geo-similar-which', 2),
      ],
      skillCheck: [ask('geo-scale-factor', 2), ask('geo-similar-angle', 2), ask('geo-scale-table', 2)],
    },
    {
      id: 'geo-l4-lengths',
      title: 'Scaling Lengths',
      slides: [
        teach(
          prose('To find a missing side of similar shapes, find the scale factor from a pair of matching sides you know, then use it.'),
          diagram(similarSvg(unitFromSides(6, 5, 8), 1.5, { sides: ['6 cm', '', '8 cm'] }, { sides: ['x', '', '12 cm'] })),
          display('k = 12 \\div 8 = 1.5'),
          display('x = 6 \\times 1.5 = 9'),
          prose('Going back from the new shape to the old one, divide by $k$ instead. A new side of $9\\text{ cm}$ was $6\\text{ cm}$:'),
          display('9 \\div 1.5 = 6'),
        ),
        ask('geo-similar-side'),
        ask('geo-similar-tiles'),
        ask('geo-similar-side+choice', 2),
        teach(
          prose('The perimeter is lengths added together, so it scales by $k$ too. A triangle with a perimeter of $15\\text{ cm}$, enlarged by $k = 3$:'),
          display('15 \\times 3 = 45'),
          prose('Backwards: a new perimeter of $45\\text{ cm}$ and $k = 3$ gives back $15\\text{ cm}$:'),
          display('45 \\div 3 = 15'),
        ),
        ask('geo-similar-tiles', 2),
        ask('geo-scale-perim'),
        teach(
          prose('A **map** is a scale drawing. Its scale says what one centimetre stands for. If $1\\text{ cm}$ stands for $5\\text{ km}$, then $7\\text{ cm}$ on the map is $35\\text{ km}$ on the ground:'),
          display('7 \\times 5 = 35'),
          prose('Backwards, $45\\text{ km}$ on the ground is $9\\text{ cm}$ on the map:'),
          display('45 \\div 5 = 9'),
        ),
        ask('geo-map-scale'),
        ask('geo-scale-perim+choice', 2),
        ask('geo-map-scale+choice', 2),
      ],
      skillCheck: [ask('geo-similar-side', 2), ask('geo-scale-perim', 2), ask('geo-map-scale', 2)],
    },
  ],
  levelCheck: [
    ask('geo-scale-factor', 2),
    ask('geo-similar-which', 2),
    ask('geo-scale-table', 2),
    ask('geo-similar-angle', 2),
    ask('geo-similar-side', 2),
    ask('geo-similar-tiles', 2),
    ask('geo-scale-perim', 2),
    ask('geo-map-scale', 2),
    ask('geo-similar-side'),
    ask('geo-scale-factor'),
  ],
};
