/**
 * Geometry, level 2: Polygons.
 *
 * The angle sum of a polygon from its triangles, exterior angles and regular
 * polygons, and regular polygons meeting round a point (the owner's first
 * inspiration screenshot). Generators and figures are in
 * `generators/geometryPolygons.ts`.
 */
import type { Level } from '../../types';
import { extSvg, polySvg, regularSvg, splitSvg, tileSvg } from '../../generators/geometryPolygons';
import { ask, askAfter, diagram, display, prose, teach } from './blocks';

export const polygons: Level = {
  id: 'geo-l2',
  title: 'Polygons',
  lessons: [
    {
      id: 'geo-l2-sums',
      title: 'Angles in Polygons',
      slides: [
        teach(
          prose('A **polygon** is a flat shape with straight sides. Draw lines from one corner to every other corner and it splits into triangles.'),
          diagram(splitSvg({ angles: [120, 120, 120, 120, 120, 120], sides: [5, 5, 5, 5] })),
          prose('A hexagon has 6 sides and splits into 4 triangles. There are always two fewer triangles than sides, and each triangle holds $180^\\circ$, so'),
          display('\\text{angle sum} = (n - 2) \\times 180'),
          prose('For the hexagon, $n = 6$, so there are $6 - 2 = 4$ triangles:'),
          display('4 \\times 180 = 720'),
          prose('A quadrilateral ($n = 4$) makes $360^\\circ$ and a pentagon ($n = 5$) makes $540^\\circ$.'),
        ),
        ask('geo-poly-sum'),
        teach(
          prose('To find a missing angle, take the angles you know away from the angle sum. The angles of a quadrilateral add up to $360^\\circ$:'),
          diagram(polySvg({ angles: [85, 100, 95, 80], sides: [6, 5] }, ['85°', '100°', '95°', 'x'], [3])),
          display('85 + 100 + 95 = 280'),
          display('x = 360 - 280 = 80'),
          prose('When two angles are both marked $x$, they share what is left. With $110^\\circ$ and $70^\\circ$ known in a quadrilateral:'),
          display('2x = 360 - 180 = 180'),
          display('x = 180 \\div 2 = 90'),
          prose('A pentagon works the same way from $540^\\circ$, and a hexagon from $720^\\circ$.'),
        ),
        ask('geo-quad-missing'),
        ask('geo-poly-missing'),
        ask('geo-quad-missing+choice', 2),
        teach(
          prose('Backwards: from the angle sum, divide by $180$ to count the triangles, then add $2$ for the sides. An angle sum of $1440^\\circ$:'),
          display('1440 \\div 180 = 8'),
          display('8 + 2 = 10'),
          prose('So the polygon has 10 sides.'),
        ),
        ask('geo-poly-count'),
        ask('geo-poly-sum', 2),
        ask('geo-poly-missing+choice', 2),
        ask('geo-poly-count+choice', 2),
      ],
      skillCheck: [ask('geo-quad-missing', 2), ask('geo-poly-missing', 2), ask('geo-poly-count', 2)],
    },
    {
      id: 'geo-l2-exterior',
      title: 'Exterior and Interior Angles',
      slides: [
        teach(
          prose('Run each side of a polygon on past its corner. The angle between the run-on line and the next side is an **exterior angle**: how far you turn at that corner as you walk round.'),
          diagram(extSvg({ angles: [100, 110, 70, 80], sides: [6, 5] }, ['80°', '70°', '110°', 'x'], 3)),
          prose('Walking all the way round turns you through one full turn, so the exterior angles of **any** polygon add up to $360^\\circ$:'),
          display('80 + 70 + 110 = 260'),
          display('x = 360 - 260 = 100'),
        ),
        ask('geo-ext-sum'),
        ask('geo-ext-sum+choice', 2),
        teach(
          prose('A **regular** polygon has every side and every angle equal. Its $n$ exterior angles share $360^\\circ$ equally:'),
          display('\\text{exterior} = 360 \\div n'),
          prose('An interior and an exterior angle sit on a straight line, so'),
          display('\\text{interior} = 180 - \\text{exterior}'),
          diagram(regularSvg(5, { ext: '72°', int: '108°' })),
          prose('For a regular pentagon, each exterior angle is $72^\\circ$ and each interior angle $108^\\circ$:'),
          display('360 \\div 5 = 72 \\qquad 180 - 72 = 108'),
        ),
        ask('geo-reg-angle'),
        ask('geo-reg-table'),
        ask('geo-reg-angle+choice', 2),
        teach(
          prose('Backwards: the number of sides is how many exterior angles fit into $360^\\circ$. Each exterior angle $24^\\circ$:'),
          display('360 \\div 24 = 15'),
          prose('From an interior angle, find the exterior angle first. Each interior angle $150^\\circ$:'),
          display('180 - 150 = 30'),
          display('360 \\div 30 = 12'),
        ),
        ask('geo-reg-sides'),
        ask('geo-reg-table', 2),
        ask('geo-reg-sides+choice', 2),
      ],
      skillCheck: [ask('geo-ext-sum', 2), ask('geo-reg-angle', 2), ask('geo-reg-sides', 2)],
    },
    {
      id: 'geo-l2-relationships',
      title: 'Polygon Angle Relationships',
      slides: [
        teach(
          prose('Shapes fit round a point with no gap when their angles there add up to exactly $360^\\circ$.'),
          diagram(tileSvg([6, 6, 6], 30, 'angles')),
          prose('Each angle of a regular hexagon is $120^\\circ$, and three of them make $360^\\circ$, so three hexagons fit. So do six equilateral triangles ($6 \\times 60$) and four squares ($4 \\times 90$).'),
          prose('A regular pentagon\'s angle is $108^\\circ$. Three make $324^\\circ$, which leaves a gap:'),
          display('360 - 324 = 36'),
        ),
        ask('geo-tile-fit'),
        ask('geo-tile-gap'),
        askAfter(
          'geo-tile-fit',
          2,
          prose('Different shapes can fit together too. Add each shape\'s angle: a square and two regular octagons make'),
          display('90 + 135 + 135 = 360'),
        ),
        teach(
          prose('When a shape\'s angle is not given, work it out from its sides first, as in the last lesson. A regular pentagon, a square and a regular hexagon:'),
          display('180 - 360 \\div 5 = 108'),
          display('108 + 90 + 120 = 318'),
          display('x = 360 - 318 = 42'),
        ),
        ask('geo-tile-gap', 2),
        ask('geo-reg-angle+choice', 2),
        teach(
          prose('Sometimes the interior angle is described using the exterior angle. Call the exterior angle $x$. If the interior angle is 4 times as big, the two make a straight line:'),
          display('x + 4x = 180'),
          display('5x = 180'),
          display('x = 36'),
          prose('Then the sides:'),
          display('360 \\div 36 = 10'),
          prose('If the interior angle is $100^\\circ$ more instead:'),
          display('x + x + 100 = 180'),
          display('2x = 80'),
          display('x = 40'),
        ),
        ask('geo-reg-ratio'),
        ask('geo-reg-ratio', 2),
      ],
      skillCheck: [ask('geo-tile-fit', 2), ask('geo-tile-gap', 2), ask('geo-reg-ratio', 2)],
    },
  ],
  levelCheck: [
    ask('geo-poly-sum', 2),
    ask('geo-quad-missing', 2),
    ask('geo-poly-missing', 2),
    ask('geo-poly-count', 2),
    ask('geo-ext-sum', 2),
    ask('geo-reg-angle', 2),
    ask('geo-reg-sides', 2),
    ask('geo-reg-table', 2),
    ask('geo-tile-fit', 2),
    ask('geo-tile-gap', 2),
    ask('geo-reg-ratio', 2),
  ],
};
