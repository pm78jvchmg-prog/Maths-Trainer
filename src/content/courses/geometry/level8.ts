/**
 * Geometry, level 8: Volume.
 *
 * Cuboids and prisms, cylinders, the volume scale factor k³, and pyramids,
 * cones and spheres with their formulas given. Generators are in
 * `generators/geometryVolume.ts`, figures in `generators/geometrySolids.ts`.
 */
import type { Level } from '../../types';
import { coneSvg, cuboidSvg, cylinderSvg, prismSvg, pyramidSvg, sphereSvg } from '../../generators/geometrySolids';
import { ask, diagram, display, prose, teach } from './blocks';

export const volume: Level = {
  id: 'geo-l8',
  title: 'Volume',
  lessons: [
    {
      id: 'geo-l8-volume',
      title: 'Volume',
      slides: [
        teach(
          prose('**Volume** is the space inside a solid, counted in cubes. A cube with $1\\text{ cm}$ edges is $1\\text{ cm}^3,$ one **cubic centimetre**. A cuboid is layers of cubes: length times width times height.'),
          display('V = lwh'),
          diagram(cuboidSvg(5, 3, 4, { l: '5 cm', w: '3 cm', h: '4 cm' })),
          display('V = 5 \\times 3 \\times 4 = 60'),
          prose('Backwards: a volume of $60\\text{ cm}^3$ with two edges $5\\text{ cm}$ and $3\\text{ cm}.$ Divide by their product:'),
          display('x = 60 \\div 15 = 4'),
        ),
        ask('geo-cuboid-vol'),
        ask('geo-cuboid-vol+choice', 2),
        teach(
          prose('A **prism** is its end, the **cross-section**, stretched along its length. Its volume is the cross-section area times the length.'),
          display('V = A \\times L'),
          diagram(prismSvg(6, 4, 10, { a: '6 cm', b: '4 cm', L: '10 cm' })),
          display('A = \\tfrac{1}{2} \\times 6 \\times 4 = 12'),
          display('V = 12 \\times 10 = 120'),
          prose('Backwards: an end of $12\\text{ cm}^2$ and a volume of $120\\text{ cm}^3$ give a length of $120 \\div 12 = 10$.'),
        ),
        ask('geo-prism-vol'),
        ask('geo-prism-vol+choice', 2),
        teach(
          prose('As a tree: the two shorter sides multiplied, half of that for the triangle, then times the length. For $\\tfrac{1}{2} \\times 8 \\times 5 \\times 7$:'),
          display('8 \\times 5 = 40'),
          display('40 \\div 2 = 20'),
          display('20 \\times 7 = 140'),
        ),
        ask('geo-prismvol-tree'),
        ask('geo-prismvol-tree', 2),
      ],
      skillCheck: [ask('geo-cuboid-vol', 2), ask('geo-prism-vol', 2), ask('geo-prismvol-tree', 2)],
    },
    {
      id: 'geo-l8-cylinders',
      title: 'Cylinders and Scaling',
      slides: [
        teach(
          prose('A **cylinder** is a prism with a circle for its cross-section, so its volume is the circle times the height:'),
          display('V = \\pi r^2 h'),
          diagram(cylinderSvg(3, 7, { radius: '3 cm', height: '7 cm' })),
          display('\\pi \\times 3^2 = 9\\pi'),
          display('V = 9\\pi \\times 7 = 63\\pi'),
        ),
        ask('geo-cylinder-vol'),
        ask('geo-cylinder-tiles'),
        teach(
          prose('Given a diameter, halve it first. A diameter of $10\\text{ cm}$ and a height of $4\\text{ cm}$:'),
          diagram(cylinderSvg(5, 4, { diameter: '10 cm', height: '4 cm' })),
          display('r = 10 \\div 2 = 5'),
          display('V = \\pi \\times 25 \\times 4 = 100\\pi'),
        ),
        ask('geo-cylinder-vol+choice', 2),
        ask('geo-cylinder-tiles', 2),
        teach(
          prose('Enlarge a solid by a length scale factor $k$ and its volume grows by $k^3$, since volume is length times length times length. Doubling every length:'),
          display('2^3 = 8'),
          prose('So the volume is $8$ times as big. A solid of $5\\text{ cm}^3$ enlarged by $k = 3$:'),
          display('3^3 = 27 \\qquad 5 \\times 27 = 135'),
          prose('Backwards, the length factor is the **cube root** of the volume factor. A volume factor of $64$:'),
          display('k = \\sqrt[3]{64} = 4'),
        ),
        ask('geo-vol-factor'),
        ask('geo-vol-factor+choice', 2),
      ],
      skillCheck: [ask('geo-cylinder-vol', 2), ask('geo-cylinder-tiles', 2), ask('geo-vol-factor', 2)],
    },
    {
      id: 'geo-l8-pointed',
      title: 'Pyramids, Cones and Spheres',
      slides: [
        teach(
          prose('A pyramid holds a **third** of the prism with the same base and height:'),
          display('V = \\tfrac{1}{3} \\times \\text{base} \\times h'),
          diagram(pyramidSvg(6, 5, { s: '6 cm', height: '5 cm' })),
          display('\\text{base} = 6^2 = 36'),
          display('V = \\tfrac{1}{3} \\times 36 \\times 5 = 60'),
          prose('Backwards: three times the volume is the base times the height. A volume of $60$ on a base of $36$ gives $h = 180 \\div 36 = 5$.'),
        ),
        ask('geo-pyramid-vol'),
        ask('geo-pyramid-vol+choice', 2),
        teach(
          prose('A cone is a third of the cylinder around it:'),
          display('V = \\tfrac{1}{3}\\pi r^2 h'),
          diagram(coneSvg(3, 5, { radius: '3 cm', height: '5 cm' })),
          display('\\pi \\times 3^2 \\times 5 = 45\\pi'),
          display('V = \\tfrac{1}{3} \\times 45\\pi = 15\\pi'),
          prose('Given a diameter, halve it first.'),
        ),
        ask('geo-cone-vol'),
        ask('geo-cone-vol+choice', 2),
        teach(
          prose('The volume of a **sphere** of radius $r$ is'),
          display('V = \\tfrac{4}{3}\\pi r^3'),
          diagram(sphereSvg({ radius: '3 cm' })),
          display('r^3 = 3^3 = 27'),
          display('V = \\tfrac{4}{3} \\times 27\\pi = 36\\pi'),
          prose('A **hemisphere** is half a sphere, so half of that: $18\\pi$. With $r = 1.5$, $r^3 = 3.375$ and $V = 4.5\\pi$.'),
        ),
        ask('geo-sphere-vol'),
        ask('geo-sphere-tiles'),
        ask('geo-sphere-vol+choice', 2),
        ask('geo-sphere-tiles', 2),
      ],
      skillCheck: [ask('geo-pyramid-vol', 2), ask('geo-cone-vol', 2), ask('geo-sphere-vol', 2)],
    },
  ],
  levelCheck: [
    ask('geo-cuboid-vol', 2),
    ask('geo-prism-vol', 2),
    ask('geo-prismvol-tree', 2),
    ask('geo-cylinder-vol', 2),
    ask('geo-cylinder-tiles', 2),
    ask('geo-vol-factor', 2),
    ask('geo-pyramid-vol', 2),
    ask('geo-cone-vol', 2),
    ask('geo-sphere-vol', 2),
    ask('geo-sphere-tiles', 2),
  ],
};
