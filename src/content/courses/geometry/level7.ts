/**
 * Geometry, level 7: Surface Area.
 *
 * Faces, edges and vertices, a cuboid face by face, the prism shortcut (two
 * ends plus the perimeter times the length), cylinders, and pyramids and cones
 * with their formulas given. Generators and figures are in
 * `generators/geometrySolids.ts`.
 */
import type { Level } from '../../types';
import { coneSvg, cuboidNetSvg, cuboidSvg, cylinderSvg, prismSvg, pyramidSvg } from '../../generators/geometrySolids';
import { ask, diagram, display, prose, teach } from './blocks';

export const surfaceArea: Level = {
  id: 'geo-l7',
  title: 'Surface Area',
  lessons: [
    {
      id: 'geo-l7-surface',
      title: 'Surface Area',
      slides: [
        teach(
          prose('A solid has flat **faces**, straight **edges** where two faces meet, and **vertices** (corners) where edges meet. Dashed lines are edges hidden at the back.'),
          diagram(cuboidSvg(5, 3, 3, {})),
          prose('A cuboid has 6 faces, 12 edges and 8 vertices.'),
          prose('A triangular prism has 5 faces (two triangles and three rectangles), 9 edges and 6 vertices. A square-based pyramid has 5 faces (a square and four triangles), 8 edges and 5 vertices.'),
        ),
        ask('geo-solid-count'),
        ask('geo-solid-count+choice', 2),
        teach(
          prose('The **surface area** is the total area of all the faces. Unfold a cuboid into its **net** and you see six rectangles, in three matching pairs.'),
          diagram(cuboidNetSvg(5, 3, 4, { l: '5 cm', w: '3 cm', h: '4 cm' })),
          prose('Find one front, one top and one side, then double their sum:'),
          display('\\text{front} = 5 \\times 4 = 20'),
          display('\\text{top} = 5 \\times 3 = 15'),
          display('\\text{side} = 3 \\times 4 = 12'),
          display('2 \\times (20 + 15 + 12) = 94'),
          prose('So the surface area is $94\\text{ cm}^2$.'),
        ),
        ask('geo-cuboid-faces'),
        ask('geo-cuboid-sa'),
        ask('geo-cuboid-faces', 2),
        teach(
          prose('A **cube** has six equal square faces. With edges of $4\\text{ cm}$:'),
          display('6 \\times 4^2 = 6 \\times 16 = 96'),
          prose('Backwards: a cube with a surface area of $150\\text{ cm}^2$. Divide by six for one face, then take the square root for its edge:'),
          display('150 \\div 6 = 25'),
          display('\\sqrt{25} = 5'),
        ),
        ask('geo-cuboid-sa+choice', 2),
      ],
      skillCheck: [ask('geo-solid-count', 2), ask('geo-cuboid-faces', 2), ask('geo-cuboid-sa', 2)],
    },
    {
      id: 'geo-l7-shortcut',
      title: 'Surface Area Shortcut',
      slides: [
        teach(
          prose('A **prism** has the same shape all the way through. Its surface is two ends, plus rectangles round the sides that together are the **perimeter of an end times the length**.'),
          diagram(prismSvg(4, 3, 10, { a: '4 cm', b: '3 cm', c: '5 cm', L: '10 cm' })),
          prose('The two triangle ends make one rectangle:'),
          display('2 \\times \\tfrac{1}{2} \\times 4 \\times 3 = 12'),
          display('(4 + 3 + 5) \\times 10 = 120'),
          display('A = 12 + 120 = 132'),
          prose('If the sloping side is not given, find it with Pythagoras first: $\\sqrt{4^2 + 3^2} = 5$.'),
        ),
        ask('geo-prism-sa'),
        ask('geo-shortcut-tree'),
        ask('geo-prism-sa+choice', 2),
        teach(
          prose('A **cylinder** is two circles and a curved side. Unrolled, the curved side is a rectangle as long as the circumference, $2\\pi r$, and as high as the cylinder.'),
          diagram(cylinderSvg(3, 8, { radius: '3 cm', height: '8 cm' })),
          display('\\text{circles} = 2 \\times \\pi \\times 3^2 = 18\\pi'),
          display('\\text{curved} = 2 \\times \\pi \\times 3 \\times 8 = 48\\pi'),
          display('A = 18\\pi + 48\\pi = 66\\pi'),
          prose('Given a diameter, halve it first.'),
        ),
        ask('geo-cylinder-sa'),
        ask('geo-cylinder-curved'),
        ask('geo-cylinder-sa+choice', 2),
        teach(
          prose('Backwards: a curved surface of $60\\pi\\text{ cm}^2$ with a radius of $5\\text{ cm}$. The curved surface is $2\\pi r h$:'),
          display('2 \\times 5 \\times h = 60'),
          display('h = 60 \\div 10 = 6'),
        ),
        ask('geo-cylinder-curved', 2),
        ask('geo-shortcut-tree', 2),
      ],
      skillCheck: [ask('geo-prism-sa', 2), ask('geo-cylinder-sa', 2), ask('geo-cylinder-curved', 2)],
    },
    {
      id: 'geo-l7-pyramids',
      title: 'Pyramids and Cones',
      slides: [
        teach(
          prose('A square-based pyramid is the square base and four equal triangles. Each triangle is half the base times its **slant height** $l$, the dashed line up the middle of a face.'),
          diagram(pyramidSvg(6, 4, { s: '6 cm', slant: '5 cm' })),
          display('\\text{base} = 6^2 = 36'),
          display('\\text{triangles} = 4 \\times \\tfrac{1}{2} \\times 6 \\times 5 = 60'),
          display('A = 36 + 60 = 96'),
          prose('Given the vertical height instead, the slant height is the hypotenuse of a triangle with the height and half the base. Height $4$ and half-base $3$ give $\\sqrt{3^2 + 4^2} = 5$.'),
        ),
        ask('geo-pyramid-sa'),
        ask('geo-pyramid-sa+choice', 2),
        teach(
          prose('The curved surface of a cone, with radius $r$ and slant height $l$, is'),
          display('\\text{curved} = \\pi r l'),
          prose('Add the circle on the bottom, $\\pi r^2$, for the total.'),
          diagram(coneSvg(3, 4, { radius: '3 cm', slant: '5 cm' })),
          display('\\pi \\times 3 \\times 5 = 15\\pi'),
          display('A = 15\\pi + 9\\pi = 24\\pi'),
        ),
        ask('geo-cone-sa'),
        ask('geo-cone-tiles'),
        ask('geo-cone-sa+choice', 2),
        teach(
          prose('Given the vertical height, find the slant height first. It is the hypotenuse of the radius and the height:'),
          diagram(coneSvg(6, 8, { radius: '6 cm', height: '8 cm' })),
          display('l = \\sqrt{6^2 + 8^2} = \\sqrt{100} = 10'),
          display('C = \\pi r l = 60\\pi \\qquad A = 60\\pi + 36\\pi = 96\\pi'),
          prose('Here $C$ is the curved surface. Given a diameter, halve it for the radius first.'),
        ),
        ask('geo-cone-tiles', 2),
      ],
      skillCheck: [ask('geo-pyramid-sa', 2), ask('geo-cone-sa', 2), ask('geo-cone-tiles', 2)],
    },
  ],
  levelCheck: [
    ask('geo-solid-count', 2),
    ask('geo-cuboid-faces', 2),
    ask('geo-cuboid-sa', 2),
    ask('geo-prism-sa', 2),
    ask('geo-shortcut-tree', 2),
    ask('geo-cylinder-sa', 2),
    ask('geo-cylinder-curved', 2),
    ask('geo-pyramid-sa', 2),
    ask('geo-cone-sa', 2),
    ask('geo-cone-tiles', 2),
  ],
};
