/**
 * Vectors.
 *
 * Level 1 is vectors as components, through the scalar product and what
 * it says about direction. Split out of the old Vectors & Matrices course,
 * which was two subjects sharing a title — neither half reaches thirty lessons
 * while they share one, and a learner looking for matrices should not have to
 * know they live under a heading that starts with vectors.
 *
 * Lesson ids keep their `vm-` prefix so that progress recorded against the
 * combined course survives the split. Level 4, Vector Geometry, is `vm-l4`,
 * level 6, Lines in Vector Form, is `vm-l6`, level 8, Planes & the Cross
 * Product, is `vm-l8`, level 10 is `vm-l10` and level 12 is `vm-l12`: `vm-l2`, `vm-l3`, `vm-l5`,
 * `vm-l7`, `vm-l9` and `vm-l11` are the Matrices course's. Levels `vm-l13` to
 * `vm-l18` are this course's too, each written in a file of its own under
 * `./vectors/`; `vm-l19` onward is reserved for Matrices.
 *
 * Levels 13 to 16 are shown in Vectors Basics (see placement.ts): Adding and
 * Subtracting Vectors, Unit Vectors and i, j Notation, Vector Proofs in
 * Shapes, and Journeys and Bearings. Levels 17 and 18, Distances from Lines
 * and Planes and Angles and Intersections of Planes, stay on this card.
 *
 * Level 4 turns vectors into a way of saying where points are: position
 * vectors, a point part-way along a line, three points on one line, the
 * corners of a parallelogram, and last the same reasoning in terms of
 * $\mathbf{a}$ and $\mathbf{b}$ with no numbers at all.
 *
 * Level 6 writes a whole line as `r = a + t b`: its points, a line through
 * two points, whether a point is on it, how two lines sit relative to each
 * other and where they cross. It stays in two dimensions until skew lines
 * need a third.
 *
 * Level 8 is three-dimensional throughout: the cross product and what it is
 * for, perpendicular vectors and areas, then the equation of a plane from a
 * point and a normal, from three points, and where a line meets one.
 *
 * Level 10, Vectors in Mechanics (`vm-l10`), gives two-dimensional vectors a
 * physical meaning in i, j notation: position and velocity, speed and
 * direction, constant acceleration, forces and F = ma, and two particles that
 * may or may not collide. Units stay in the prose; no answer carries one.
 *
 * Level 12, The Angle Between Two Vectors (`vm-l12`), is three-dimensional
 * again: the scalar product and its sign, the angle from the cosine formula,
 * perpendicular vectors, then the angle between two lines, a line and a plane,
 * and two planes. Degrees stay in the prose; no answer carries them.
 *
 * Each level closes with a level check: twelve or fourteen questions, no
 * teaching slides, one attempt each.
 */
import type { Block, Course, SlideRef } from '../types';
import { level13 } from './vectors/level13';
import { level14 } from './vectors/level14';
import { level15 } from './vectors/level15';
import { level16 } from './vectors/level16';
import { level17 } from './vectors/level17';
import { level18 } from './vectors/level18';

const teach = (
  ...blocks: { kind: 'prose' | 'display'; text?: string; tex?: string }[]
): SlideRef => ({
  type: 'literal',
  slide: {
    kind: 'teach',
    body: blocks.map((b) =>
      b.kind === 'prose'
        ? ({ kind: 'prose', text: b.text ?? '' } as const)
        : ({ kind: 'display', tex: b.tex ?? '' } as const),
    ),
  },
});

const ask = (generatorId: string, difficulty = 1): SlideRef => ({
  type: 'generated',
  generatorId,
  difficulty,
});

const prose = (text: string) => ({ kind: 'prose' as const, text });
const maths = (tex: string) => ({ kind: 'display' as const, tex });

/**
 * A generated question with a worked example above it, on the same slide.
 * Used where one question needs a step the teaching slide before it did not
 * show, so the example sits right where it is needed.
 */
const askAfter = (lead: Block[], generatorId: string, difficulty = 1): SlideRef => ({
  type: 'generated',
  generatorId,
  difficulty,
  leadIn: lead,
});

export const vectors: Course = {
  id: 'vectors',
  category: 'advanced-maths',
  position: 40,
  title: 'Vectors',
  // Its first levels are shown in Vectors Basics and its mechanics level in
  // Kinematics; see placement.ts.
  blurb: 'The scalar product, lines in vector form, the angles between them, then planes and the cross product.',
  levels: [
    {
      id: 'vm-l1',
      title: 'Vectors',
      lessons: [
        {
          id: 'vm-l1-components',
          title: 'Vectors and Components',
          slides: [
            teach(
              prose(
                'A **vector** has size and direction, where an ordinary number has only size. A displacement of 3 east and 2 north is a vector; the distance walked is not.',
              ),
              prose(
                'The usual way to write one is as a pair of components: how far across, then how far up.',
              ),
              maths('\\begin{pmatrix} 3 \\\\ 2 \\end{pmatrix} = 3\\mathbf{i} + 2\\mathbf{j}'),
              prose(
                'The column form and the $\\mathbf{i}$, $\\mathbf{j}$ form are the same object written two ways. $\\mathbf{i}$ and $\\mathbf{j}$ are the unit vectors one step across and one step up.',
              ),
              prose(
                'Because a vector is only a direction and a size, it has no position. The same vector describes a move from anywhere to anywhere three across and two up.',
              ),
            ),
            ask('vec-notation'),
            ask('vec-component'),
            ask('vec-notation'),
            teach(
              prose(
                'Vectors add component by component. The across-parts combine with each other and the up-parts with each other, and the two calculations never interact.',
              ),
              maths(
                '\\begin{pmatrix} 3 \\\\ 2 \\end{pmatrix} + \\begin{pmatrix} 5 \\\\ -4 \\end{pmatrix} = \\begin{pmatrix} 8 \\\\ -2 \\end{pmatrix}',
              ),
              prose(
                'Geometrically this is what happens when two displacements are made one after the other: go 3 across and 2 up, then 5 across and 4 down, and you have gone 8 across and 2 down.',
              ),
              prose(
                'Bracket each component before combining. A negative entry being subtracted is where the sign goes wrong, and the bracket removes the risk.',
              ),
              prose(
                'A journey described in words becomes vectors the same way. West is the negative of east and south is the negative of north, so 3 km west is a first component of $-3$.',
              ),
              prose(
                'What comes out is the **displacement** — where the journey ended up relative to where it started — not the distance travelled. The two legs can cancel; distances never do.',
              ),
            ),
            ask('vec-add-tree'),
            ask('vec-journey'),
            ask('vec-component'),
            teach(
              prose(
                'Subtraction follows the same rule, and it has a useful reading of its own.',
              ),
              maths('\\mathbf{b} - \\mathbf{a} = \\text{the vector from } \\mathbf{a} \\text{ to } \\mathbf{b}'),
              prose(
                'If $\\mathbf{a}$ and $\\mathbf{b}$ are positions of two points, then $\\mathbf{b} - \\mathbf{a}$ is the displacement taking you from the first to the second. The order matters: the other way round points backwards.',
              ),
              prose(
                'So "destination minus start" is worth remembering. Nearly every vector geometry question begins with it.',
              ),
            ),
            ask('vec-add+choice'),
            ask('vec-journey+choice'),
          ],
          skillCheck: [
            ask('vec-add', 2),
            ask('vec-journey', 2),
            ask('vec-notation', 2),
          ],
        },
        {
          id: 'vm-l1-scalars',
          title: 'Scalar Multiples',
          slides: [
            teach(
              prose(
                'Multiplying a vector by an ordinary number — a **scalar** — stretches it without turning it. Every component is multiplied.',
              ),
              maths('3\\begin{pmatrix} 2 \\\\ -1 \\end{pmatrix} = \\begin{pmatrix} 6 \\\\ -3 \\end{pmatrix}'),
              prose(
                'Multiplying only the top component is the characteristic error. A scalar changes the length of the whole vector, so it has to reach both entries.',
              ),
              prose(
                'A negative scalar reverses the direction as well as scaling: $-2\\mathbf{v}$ is twice as long as $\\mathbf{v}$ and points the opposite way.',
              ),
            ),
            askAfter(
              [
                prose(
                  'Two vectors are **parallel** when one is a scalar multiple of the other. To find the multiple, divide matching components: both have to give the same $k$.',
                ),
                maths(
                  '\\begin{aligned} \\begin{pmatrix} 6 \\\\ -4 \\end{pmatrix} &= k\\begin{pmatrix} 3 \\\\ -2 \\end{pmatrix} \\\\ k &= \\frac{6}{3} = 2, \\quad \\frac{-4}{-2} = 2 \\end{aligned}',
                ),
              ],
              'vec-scalar-k',
            ),
            askAfter(
              [
                prose(
                  'To test whether two vectors are parallel, do the same division. Against $3\\mathbf{i} - \\mathbf{j}$: $9\\mathbf{i} - 3\\mathbf{j}$ gives $\\frac{9}{3} = 3$ and $\\frac{-3}{-1} = 3$, the same, so it is parallel. $9\\mathbf{i} - \\mathbf{j}$ gives $3$ and $1$, so it is not.',
                ),
              ],
              'vec-parallel',
            ),
            ask('vec-scalar-k+choice'),
            teach(
              prose(
                'A **linear combination** scales two vectors and adds the results, which is the operation nearly every vector question is built from.',
              ),
              maths(
                '2\\begin{pmatrix} 1 \\\\ 4 \\end{pmatrix} - 3\\begin{pmatrix} 2 \\\\ 1 \\end{pmatrix} = \\begin{pmatrix} 2 \\\\ 8 \\end{pmatrix} - \\begin{pmatrix} 6 \\\\ 3 \\end{pmatrix} = \\begin{pmatrix} -4 \\\\ 5 \\end{pmatrix}',
              ),
              prose(
                'Scale each vector fully first, then combine. Adding first and scaling afterwards gives a different answer unless the two scalars happen to be equal.',
              ),
              prose(
                'Carry each sign through the scaling rather than saving it for the end. A negative scalar applied to a negative component is where this goes wrong.',
              ),
            ),
            ask('vec-scalar-combine'),
            ask('vec-add+choice'),
            ask('vec-scalar-combine-steps'),
            teach(
              prose(
                'Two vectors are **parallel** exactly when one is a scalar multiple of the other — the same multiple applied to every component.',
              ),
              maths('\\begin{pmatrix} 3 \\\\ -2 \\end{pmatrix} \\quad \\begin{pmatrix} 6 \\\\ -4 \\end{pmatrix} \\quad \\text{are parallel}'),
              prose(
                'The test is whether the ratio of the components is unchanged. Scaling only one component changes the direction, so the result is not parallel.',
              ),
              prose(
                'A negative multiple points the opposite way along the same line, and that still counts as parallel — the direction is reversed but the line is the same.',
              ),
            ),
            ask('vec-parallel'),
            ask('vec-add'),
          ],
          skillCheck: [
            ask('vec-scalar-combine', 2),
            ask('vec-parallel', 2),
            ask('vec-scalar-k', 2),
          ],
        },
        {
          id: 'vm-l1-magnitude',
          title: 'The Magnitude of a Vector',
          slides: [
            teach(
              prose(
                'The **magnitude** of a vector is its length, written with the modulus bars. The two components are the short sides of a right-angled triangle and the vector is its hypotenuse, so it comes from Pythagoras.',
              ),
              maths('\\left| \\mathbf{v} \\right| = \\sqrt{x^{2} + y^{2}}'),
              maths(
                '\\left| \\begin{pmatrix} 3 \\\\ 4 \\end{pmatrix} \\right| = \\sqrt{9 + 16} = \\sqrt{25} = 5',
              ),
              prose(
                'Both components are squared, so both signs disappear. A magnitude can never be negative, which is a useful check on the arithmetic.',
              ),
              prose(
                'Most magnitudes are not whole numbers. Leaving $\\sqrt{13}$ as it stands keeps the answer exact; a decimal is a rounded one, and rounding early spoils anything done afterwards.',
              ),
              prose(
                'The **distance between two points** is the same calculation with one step in front of it: find the vector from one to the other — destination minus start — and take its magnitude.',
              ),
              maths(
                'AB = \\left| \\begin{pmatrix} 5 \\\\ 1 \\end{pmatrix} - \\begin{pmatrix} 2 \\\\ -3 \\end{pmatrix} \\right| = \\left| \\begin{pmatrix} 3 \\\\ 4 \\end{pmatrix} \\right| = 5',
              ),
              prose(
                'Reaching for Pythagoras on the two coordinate pairs without subtracting first measures from the origin instead, which answers a different question.',
              ),
            ),
            ask('vec-magnitude'),
            ask('vec-magnitude-steps'),
            ask('vec-distance'),
            teach(
              prose(
                'A vector of magnitude 1 is called a **unit vector**, and dividing any vector by its own magnitude produces one pointing the same way.',
              ),
              maths('\\hat{\\mathbf{v}} = \\frac{\\mathbf{v}}{\\left| \\mathbf{v} \\right|}'),
              prose(
                'So $\\begin{pmatrix} 3 \\\\ 4 \\end{pmatrix}$ has magnitude 5, and dividing by 5 gives $\\begin{pmatrix} 0.6 \\\\ 0.8 \\end{pmatrix}$ — same direction, length 1.',
              ),
              prose(
                'This is how a direction is separated from a size, which is why unit vectors appear wherever only the direction matters.',
              ),
            ),
            ask('vec-unit'),
            ask('vec-distance+choice'),
            ask('vec-add'),
            teach(
              prose(
                'Scaling a vector scales its magnitude by the *size* of the scalar, sign ignored.',
              ),
              maths('\\left| k\\mathbf{v} \\right| = \\left| k \\right| \\left| \\mathbf{v} \\right|'),
              prose(
                'So $-3\\mathbf{v}$ is three times as long as $\\mathbf{v}$, not minus three times. Length has no sign.',
              ),
              prose(
                'What does *not* work is adding magnitudes. $\\left| \\mathbf{a} + \\mathbf{b} \\right|$ is almost never $\\left| \\mathbf{a} \\right| + \\left| \\mathbf{b} \\right|$ — they are equal only when the two vectors point the same way.',
              ),
            ),
            ask('vec-unit+choice'),
            ask('vec-add+choice'),
          ],
          skillCheck: [
            ask('vec-magnitude', 2),
            ask('vec-distance', 2),
            ask('vec-unit', 2),
          ],
        },
      ],
      levelCheck: [
        ask('vec-add', 2),
        ask('vec-notation', 2),
        ask('vec-component', 2),
        ask('vec-journey', 2),
        ask('vec-scalar-combine', 2),
        ask('vec-scalar-k', 2),
        ask('vec-parallel', 2),
        ask('vec-magnitude', 2),
        ask('vec-distance', 2),
        ask('vec-unit', 2),
      ],
    },
    {
      id: 'vm-l4',
      title: 'Vector Geometry',
      lessons: [
        {
          id: 'vm-l4-position',
          title: 'Position Vectors',
          slides: [
            teach(
              prose(
                'The **position vector** of a point is the vector from the origin $O$ to it. It carries the same two numbers as the point.',
              ),
              maths(
                'A\\left(3, 2\\right) \\implies \\mathbf{a} = \\overrightarrow{OA} = \\begin{pmatrix} 3 \\\\ 2 \\end{pmatrix}',
              ),
              prose(
                'Lower-case bold is the usual name: $\\mathbf{a}$ for $A$, $\\mathbf{p}$ for $P$.',
              ),
              prose(
                'The vector **between** two points is destination minus start. From $A$, go back to $O$, which is $-\\mathbf{a}$, then out to $B$, which is $\\mathbf{b}$.',
              ),
              maths('\\overrightarrow{AB} = -\\mathbf{a} + \\mathbf{b} = \\mathbf{b} - \\mathbf{a}'),
            ),
            ask('vec-between'),
            ask('vec-direction'),
            ask('vec-between-slider'),
            teach(
              prose(
                'On squared paper, $\\overrightarrow{AB}$ is how far you move from $A$ to reach $B$: across, then up. Counting squares and subtracting coordinates are the same calculation.',
              ),
              maths(
                'A\\left(-1, 4\\right), \\; B\\left(3, 1\\right) \\implies \\overrightarrow{AB} = \\begin{pmatrix} 3 - \\left(-1\\right) \\\\ 1 - 4 \\end{pmatrix} = \\begin{pmatrix} 4 \\\\ -3 \\end{pmatrix}',
              ),
              prose(
                'The same equation run the other way finds a point. Knowing one end and the journey between them gives the other end.',
              ),
              maths('\\mathbf{b} = \\mathbf{a} + \\overrightarrow{AB} \\qquad \\mathbf{a} = \\mathbf{b} - \\overrightarrow{AB}'),
            ),
            ask('vec-endpoint'),
            ask('vec-between+choice'),
            ask('vec-between-slider'),
            teach(
              prose(
                'Reversing a journey negates it: $\\overrightarrow{BA} = \\mathbf{a} - \\mathbf{b} = -\\overrightarrow{AB}$. The same length, pointing the other way.',
              ),
              prose(
                'Journeys chain. Going from $P$ to $Q$ and then on to $R$ ends in the same place as going straight from $P$ to $R$.',
              ),
              maths(
                '\\overrightarrow{PQ} + \\overrightarrow{QR} = \\left(\\mathbf{q} - \\mathbf{p}\\right) + \\left(\\mathbf{r} - \\mathbf{q}\\right) = \\mathbf{r} - \\mathbf{p} = \\overrightarrow{PR}',
              ),
              prose('Where the journey passed through cancels out. Only the start and the end are left.'),
            ),
            ask('vec-direction'),
            ask('vec-endpoint+choice'),
          ],
          skillCheck: [
            ask('vec-between', 2),
            ask('vec-endpoint', 2),
            ask('vec-direction', 2),
          ],
        },
        {
          id: 'vm-l4-ratio',
          title: 'Dividing a Line',
          slides: [
            teach(
              prose(
                'The **midpoint** of $AB$ is halfway along it: start at $A$ and go half of $\\overrightarrow{AB}$.',
              ),
              maths(
                '\\mathbf{m} = \\mathbf{a} + \\tfrac{1}{2}\\left(\\mathbf{b} - \\mathbf{a}\\right) = \\tfrac{1}{2}\\left(\\mathbf{a} + \\mathbf{b}\\right)',
              ),
              prose(
                'So each coordinate of the midpoint is the average of the two ends. Halfway between $\\left(2, 7\\right)$ and $\\left(8, -1\\right)$ is $\\left(5, 3\\right)$.',
              ),
              prose(
                'Halving $\\overrightarrow{AB}$ on its own says how far the midpoint is **from $A$**, not where it is. Adding $\\mathbf{a}$ is the step that places it.',
              ),
              prose(
                'Run it backwards to find an end: the second half of the line is the same journey as the first, so $\\mathbf{b} = \\mathbf{m} + \\overrightarrow{AM}$. With $A\\left(2, 7\\right)$ and $M\\left(5, 3\\right)$, $\\overrightarrow{AM} = \\begin{pmatrix} 3 \\\\ -4 \\end{pmatrix}$, so $B = \\left(8, -1\\right)$.',
              ),
            ),
            ask('vec-midpoint'),
            ask('vec-midpoint+choice'),
            teach(
              prose(
                'A ratio does the same job for any other point. $AP : PB = 2 : 3$ cuts $AB$ into $2 + 3 = 5$ equal parts, with 2 of them between $A$ and $P$.',
              ),
              maths(
                '\\overrightarrow{AP} = \\frac{2}{5}\\overrightarrow{AB} \\qquad \\overrightarrow{PB} = \\frac{3}{5}\\overrightarrow{AB}',
              ),
              prose(
                'The fraction is a part over the **whole**, 5. $\\frac{2}{3}$ compares $AP$ with $PB$: that is the answer when the question asks for $\\overrightarrow{AP} = \\lambda\\,\\overrightarrow{PB}$, part against part.',
              ),
              prose(
                'Direction counts too: $\\overrightarrow{PA}$ points back towards $A$, so $\\overrightarrow{PA} = -\\frac{2}{5}\\overrightarrow{AB}$.',
              ),
            ),
            ask('vec-section-fraction'),
            ask('vec-section-fraction+choice'),
            teach(
              prose(
                'Worked through, with $A\\left(1, 2\\right)$, $B\\left(10, -4\\right)$ and $AP : PB = 1 : 2$:',
              ),
              maths(
                '\\overrightarrow{AB} = \\begin{pmatrix} 9 \\\\ -6 \\end{pmatrix} \\implies \\overrightarrow{AP} = \\frac{1}{3}\\begin{pmatrix} 9 \\\\ -6 \\end{pmatrix} = \\begin{pmatrix} 3 \\\\ -2 \\end{pmatrix} \\implies P = \\left(4, 0\\right)',
              ),
              prose(
                'The first number of the ratio belongs to the part next to $A$. Read it backwards and you land on the point the same distance from the other end.',
              ),
            ),
            ask('vec-section'),
            ask('vec-section-tree'),
            ask('vec-ratio-slider'),
            ask('vec-ratio-slider'),
          ],
          skillCheck: [
            ask('vec-midpoint', 2),
            ask('vec-section', 2),
            ask('vec-section-fraction', 2),
          ],
        },
        {
          id: 'vm-l4-collinear',
          title: 'Parallel and Collinear',
          slides: [
            teach(
              prose(
                'Vectors Basics, "Scalar Multiples", met the test for **parallel** vectors: one is a scalar multiple of the other, with the same multiple on every component.',
              ),
              maths('\\begin{pmatrix} 6 \\\\ -4 \\end{pmatrix} = -2\\begin{pmatrix} -3 \\\\ 2 \\end{pmatrix}'),
              prose(
                'Parallel says two lines point the same way. It does not say they are the same line: opposite sides of a rectangle are parallel and never meet.',
              ),
            ),
            ask('vec-parallel'),
            ask('vec-scalar-k'),
            ask('vec-line-test'),
            teach(
              prose(
                'Three points are **collinear** when they lie on one straight line. The test puts two facts together.',
              ),
              maths('\\overrightarrow{AC} = k\\,\\overrightarrow{AB}'),
              prose(
                'That makes $AB$ and $AC$ parallel, and both start at $A$, so they cannot be two separate parallel lines. They are one line, through all three points.',
              ),
              prose(
                'For $A\\left(1, 1\\right)$, $B\\left(3, 2\\right)$ and $C\\left(7, 4\\right)$: $\\overrightarrow{AB} = \\begin{pmatrix} 2 \\\\ 1 \\end{pmatrix}$ and $\\overrightarrow{AC} = \\begin{pmatrix} 6 \\\\ 3 \\end{pmatrix} = 3\\overrightarrow{AB}$, so the three are collinear.',
              ),
            ),
            ask('vec-on-line'),
            ask('vec-line-test'),
            teach(
              prose(
                'The same fact finds a missing coordinate. If $C\\left(9, k\\right)$ is on the line through $A\\left(1, 1\\right)$ and $B\\left(3, 2\\right)$, the across components fix the multiple.',
              ),
              maths(
                '\\overrightarrow{AC} = \\begin{pmatrix} 8 \\\\ k - 1 \\end{pmatrix} = 4\\begin{pmatrix} 2 \\\\ 1 \\end{pmatrix} \\implies k - 1 = 4 \\implies k = 5',
              ),
              prose(
                'The multiple comes from the component you know, and then has to hold for the one you do not.',
              ),
            ),
            ask('vec-collinear-k'),
            ask('vec-on-line'),
            ask('vec-collinear-k+choice'),
          ],
          skillCheck: [
            ask('vec-collinear-k', 2),
            ask('vec-on-line', 2),
            ask('vec-line-test', 2),
          ],
        },
        {
          id: 'vm-l4-parallelogram',
          title: 'Parallelograms',
          slides: [
            teach(
              prose(
                'Two vectors are **equal** when they have the same components: the same length and the same direction, wherever they start.',
              ),
              prose(
                'In a parallelogram $ABCD$, lettered in order round the shape, opposite sides are equal and parallel. As vectors that is one equation, with both sides written going the same way round.',
              ),
              maths('\\overrightarrow{AB} = \\overrightarrow{DC}'),
              prose(
                'So a missing corner comes from one subtraction. $\\overrightarrow{DC}$ ends at $C$, so $D$ is $C$ with that journey taken off.',
              ),
              maths(
                'A\\left(1, 1\\right), \\; B\\left(5, 2\\right), \\; C\\left(6, 5\\right) \\implies D = C - \\overrightarrow{AB} = \\left(6, 5\\right) - \\begin{pmatrix} 4 \\\\ 1 \\end{pmatrix} = \\left(2, 4\\right)',
              ),
            ),
            ask('vec-fourth-vertex'),
            ask('vec-between+choice'),
            ask('vec-fourth-vertex-tree'),
            teach(
              prose(
                'To **prove** a quadrilateral is a parallelogram, one pair of opposite sides equal as vectors is enough. Equal vectors are parallel and the same length at once.',
              ),
              prose(
                'Parallel alone is not enough. If $\\overrightarrow{DC} = 2\\overrightarrow{AB}$, the two sides are parallel but one is twice as long, and the shape is a **trapezium**.',
              ),
              prose(
                'Any corner can be the missing one. Each is its neighbour plus the side opposite, written in the same direction round the shape.',
              ),
            ),
            ask('vec-quad-flow'),
            ask('vec-between'),
            teach(
              prose(
                'The diagonals of a parallelogram cut each other in half, so the midpoint of $AC$ is also the midpoint of $BD$.',
              ),
              maths(
                '\\tfrac{1}{2}\\left(\\mathbf{a} + \\mathbf{c}\\right) = \\tfrac{1}{2}\\left(\\mathbf{b} + \\mathbf{d}\\right)',
              ),
              prose(
                'With the corners above, both midpoints are $\\left(3.5, 3\\right)$. Finding where the diagonals cross is a midpoint question, and it doubles as a check on a corner you have just found.',
              ),
              prose(
                'Knowing one end and the midpoint finds the other end: go on from $M$ by the same journey again. With $A\\left(1, 5\\right)$ and $M\\left(3, 2\\right)$:',
              ),
              maths(
                '\\begin{aligned} \\overrightarrow{AM} &= \\begin{pmatrix} 2 \\\\ -3 \\end{pmatrix} \\\\ \\implies B &= \\left(3 + 2, \\; 2 - 3\\right) \\\\ &= \\left(5, -1\\right) \\end{aligned}',
              ),
            ),
            ask('vec-midpoint'),
            ask('vec-quad-flow'),
            ask('vec-midpoint+choice'),
          ],
          skillCheck: [
            ask('vec-fourth-vertex', 2),
            ask('vec-quad-flow', 2),
            ask('vec-midpoint', 2),
          ],
        },
        {
          id: 'vm-l4-paths',
          title: 'Vector Paths',
          slides: [
            teach(
              prose(
                'Vector geometry often has no coordinates at all. Two vectors are named, $\\overrightarrow{OA} = \\mathbf{a}$ and $\\overrightarrow{OB} = \\mathbf{b}$, and everything else is written in terms of them.',
              ),
              prose(
                'The method is to find a **route**: a chain of journeys you already know. Going along a known vector backwards is its negative.',
              ),
              maths('\\overrightarrow{AB} = \\overrightarrow{AO} + \\overrightarrow{OB} = -\\mathbf{a} + \\mathbf{b}'),
              prose(
                'Type $\\mathbf{a}$ and $\\mathbf{b}$ with the $a$ and $b$ keys. The route itself or its tidied form is accepted, so $\\frac{1}{2}\\left(\\mathbf{a} + \\mathbf{b}\\right)$ and $\\frac{1}{2}\\mathbf{a} + \\frac{1}{2}\\mathbf{b}$ both count.',
              ),
            ),
            ask('vec-direction'),
            ask('vec-path'),
            ask('vec-section-fraction'),
            teach(
              prose(
                'A point on $AB$ is reached the same way: out to $A$, then the right fraction of the way along $\\overrightarrow{AB}$. With $AP : PB = 1 : 2$:',
              ),
              maths(
                '\\overrightarrow{OP} = \\mathbf{a} + \\tfrac{1}{3}\\left(\\mathbf{b} - \\mathbf{a}\\right) = \\tfrac{2}{3}\\mathbf{a} + \\tfrac{1}{3}\\mathbf{b}',
              ),
              prose(
                'Starting from $B$ gives the same answer by another route, which makes a good check: $\\mathbf{b} + \\tfrac{2}{3}\\left(\\mathbf{a} - \\mathbf{b}\\right)$ tidies up to the same thing.',
              ),
              prose(
                'For any point on the line $AB$ the two coefficients add up to 1, as $\\tfrac{2}{3} + \\tfrac{1}{3}$ does here.',
              ),
            ),
            ask('vec-path-coefficients'),
            ask('vec-path-tree'),
            askAfter(
              [
                prose(
                  'A point beyond the segment works the same way. If $B$ is the midpoint of $AF$, then $\\overrightarrow{BF} = \\overrightarrow{AB}$, so',
                ),
                maths(
                  '\\overrightarrow{OF} = \\mathbf{b} + \\left(\\mathbf{b} - \\mathbf{a}\\right) = -\\mathbf{a} + 2\\mathbf{b}',
                ),
              ],
              'vec-path-coefficients',
            ),
            teach(
              prose(
                'Proofs in vector geometry usually end on the test for parallel vectors. Two vectors written in $\\mathbf{a}$ and $\\mathbf{b}$ are parallel when one is a multiple of the other, with the same multiple on both coefficients.',
              ),
              maths('6\\mathbf{a} - 4\\mathbf{b} = 2\\left(3\\mathbf{a} - 2\\mathbf{b}\\right)'),
              prose(
                'So those two are parallel. If they also share a point, the points are collinear, exactly as with numbers.',
              ),
            ),
            ask('vec-path-parallel'),
            ask('vec-line-test'),
          ],
          skillCheck: [
            ask('vec-path', 2),
            ask('vec-path-coefficients', 2),
            ask('vec-path-parallel', 2),
          ],
        },
      ],
      levelCheck: [
        ask('vec-between', 2),
        ask('vec-direction', 2),
        ask('vec-endpoint+choice', 2),
        ask('vec-midpoint', 2),
        ask('vec-section-fraction', 2),
        ask('vec-section', 2),
        ask('vec-on-line', 2),
        ask('vec-collinear-k', 2),
        ask('vec-line-test', 2),
        ask('vec-fourth-vertex', 2),
        ask('vec-quad-flow', 2),
        ask('vec-path', 2),
        ask('vec-path-parallel', 2),
        ask('vec-path-coefficients', 2),
      ],
    },
    level13,
    level14,
    level15,
    level16,
    {
      id: 'vm-l6',
      title: 'Lines in Vector Form',
      lessons: [
        {
          id: 'vm-l6-equation',
          title: 'The Vector Equation of a Line',
          slides: [
            teach(
              prose(
                'A straight line is fixed by a point on it and a direction along it. Start at the point, then move any multiple of the direction.',
              ),
              maths('\\mathbf{r} = \\mathbf{a} + t\\mathbf{b}'),
              prose(
                '$\\mathbf{a}$ is the position vector of a point on the line and $\\mathbf{b}$ is its **direction vector**. $t$ is a number you choose, called the **parameter**, and each value of $t$ gives one point $\\mathbf{r}$ on the line.',
              ),
              maths(
                '\\mathbf{r} = \\begin{pmatrix} 1 \\\\ 2 \\end{pmatrix} + t\\begin{pmatrix} 3 \\\\ -1 \\end{pmatrix}',
              ),
              prose(
                'With $t = 2$ that is $\\begin{pmatrix} 1 \\\\ 2 \\end{pmatrix} + \\begin{pmatrix} 6 \\\\ -2 \\end{pmatrix} = \\begin{pmatrix} 7 \\\\ 0 \\end{pmatrix}$, the point $\\left(7, 0\\right)$.',
              ),
            ),
            ask('line-point-at'),
            ask('line-t-slider'),
            ask('line-point-at-steps'),
            teach(
              prose(
                '$t$ counts direction vectors from the starting point. $t = 0$ is the starting point itself, $t = 1$ is one step along, and a negative $t$ goes back the other way.',
              ),
              prose(
                'Work a point out in two moves: multiply the direction by $t$, then add the start. Multiplying the start by $t$ as well is the usual slip.',
              ),
              maths('\\mathbf{a} + 3\\mathbf{b} \\ne 3\\left(\\mathbf{a} + \\mathbf{b}\\right)'),
              prose(
                'Any non-zero multiple of the direction points along the same line, so it is a direction vector too. For the line above, $\\begin{pmatrix} 6 \\\\ -2 \\end{pmatrix} = 2\\begin{pmatrix} 3 \\\\ -1 \\end{pmatrix}$ and $\\begin{pmatrix} -3 \\\\ 1 \\end{pmatrix} = -1\\begin{pmatrix} 3 \\\\ -1 \\end{pmatrix}$ both work. The start $\\begin{pmatrix} 1 \\\\ 2 \\end{pmatrix}$ is a position, not a direction.',
              ),
            ),
            ask('line-direction'),
            ask('line-t-slider'),
            teach(
              prose(
                'One line has many equations. Any point on it will do as the start, and any non-zero multiple of the direction still points along it.',
              ),
              maths(
                '\\mathbf{r} = \\begin{pmatrix} 7 \\\\ 0 \\end{pmatrix} + s\\begin{pmatrix} -6 \\\\ 2 \\end{pmatrix}',
              ),
              prose(
                'That is the line above again: $\\left(7, 0\\right)$ is its point at $t = 2$, and the new direction is $-2$ times the old one. A new letter, $s$, is a reminder that the two parameters count differently.',
              ),
            ),
            ask('line-same'),
            ask('line-direction'),
          ],
          skillCheck: [
            ask('line-point-at', 2),
            ask('line-direction', 2),
            ask('line-same', 2),
          ],
        },
        {
          id: 'vm-l6-two-points',
          title: 'A Line Through Two Points',
          slides: [
            teach(
              prose(
                'Two points fix a line. Start at one of them, and take the direction from the journey between them: destination minus start, as in Vector Geometry.',
              ),
              maths('\\mathbf{r} = \\mathbf{a} + t\\left(\\mathbf{b} - \\mathbf{a}\\right)'),
              prose('For $A\\left(1, 4\\right)$ and $B\\left(3, 1\\right)$:'),
              maths('\\overrightarrow{AB} = \\begin{pmatrix} 2 \\\\ -3 \\end{pmatrix}'),
              maths(
                '\\mathbf{r} = \\begin{pmatrix} 1 \\\\ 4 \\end{pmatrix} + t\\begin{pmatrix} 2 \\\\ -3 \\end{pmatrix}',
              ),
            ),
            ask('vec-between'),
            ask('line-through-two'),
            ask('vec-between+choice'),
            teach(
              prose(
                'With this equation $t = 0$ gives $A$ and $t = 1$ gives $B$. Other values reach the rest of the line: $t = 2$ is as far beyond $B$ again, and $t = -1$ is one step back behind $A$.',
              ),
              prose(
                'Starting at $B$, or heading along $\\overrightarrow{BA}$, gives another equation of the same line. To check one, test its start and its direction against the first:',
              ),
              maths(
                '\\mathbf{r} = \\begin{pmatrix} 3 \\\\ 1 \\end{pmatrix} + s\\begin{pmatrix} -2 \\\\ 3 \\end{pmatrix}',
              ),
              prose(
                '$\\left(3, 1\\right)$ is $B$, the point at $t = 1$, and $\\begin{pmatrix} -2 \\\\ 3 \\end{pmatrix} = -1\\begin{pmatrix} 2 \\\\ -3 \\end{pmatrix}$. Both pass, so it is the same line.',
              ),
            ),
            ask('line-same'),
            ask('line-two-points-at-tree'),
            ask('line-same'),
            teach(
              prose(
                'The direction has to be the journey **between** the points. $\\mathbf{b}$ on its own points from the origin to $B$, which is usually a different direction altogether.',
              ),
              prose(
                'A line **parallel** to another shares its direction, so only the starting point changes. Here is a line:',
              ),
              maths('\\mathbf{r} = \\begin{pmatrix} 0 \\\\ 5 \\end{pmatrix} + s\\begin{pmatrix} 2 \\\\ 1 \\end{pmatrix}'),
              prose('The line through $\\left(4, -1\\right)$ parallel to it borrows its direction and starts at $\\left(4, -1\\right)$:'),
              maths('\\mathbf{r} = \\begin{pmatrix} 4 \\\\ -1 \\end{pmatrix} + t\\begin{pmatrix} 2 \\\\ 1 \\end{pmatrix}'),
            ),
            ask('line-through-two+choice', 2),
            ask('line-two-points-at-tree'),
          ],
          skillCheck: [
            ask('line-through-two', 2),
            ask('line-two-points-at-tree', 2),
            ask('line-same', 2),
          ],
        },
        {
          id: 'vm-l6-on-line',
          title: 'Is the Point on the Line?',
          slides: [
            teach(
              prose(
                'To test whether a point is on a line, set the equation equal to it and look for a value of $t$ that works.',
              ),
              maths(
                '\\begin{pmatrix} 1 \\\\ 2 \\end{pmatrix} + t\\begin{pmatrix} 3 \\\\ -1 \\end{pmatrix} = \\begin{pmatrix} 10 \\\\ -1 \\end{pmatrix}',
              ),
              prose(
                'Each component is an equation of its own. Across, $1 + 3t = 10$, so $t = 3$. Up, $2 - t = -1$, so $t = 3$ as well.',
              ),
              prose(
                'One value of $t$ satisfies both, so $\\left(10, -1\\right)$ is on the line, three direction vectors from the start.',
              ),
            ),
            ask('line-find-t'),
            ask('line-t-slider'),
            ask('line-find-t+choice'),
            teach(
              prose(
                'A point off the line still gives a value of $t$ from each component. What gives it away is that the two values differ.',
              ),
              maths('1 + 3t = 7 \\implies t = 2'),
              maths('2 - t = 1 \\implies t = 1'),
              prose(
                'No single value of $t$ reaches $\\left(7, 1\\right)$, so it is not on the line. Solving one component and stopping would have missed that, so always check the other.',
              ),
            ),
            ask('line-contains'),
            ask('line-t-slider'),
            ask('line-contains'),
            teach(
              prose(
                'The same idea finds a missing coordinate. If $\\left(k, -3\\right)$ is on the line, the component you know fixes $t$.',
              ),
              maths('2 - t = -3 \\implies t = 5'),
              maths('k = 1 + 3 \\times 5 = 16'),
              prose('Find $t$ from the coordinate you have, then use it in the other component.'),
            ),
            ask('line-missing-coord'),
            ask('line-missing-coord+choice'),
          ],
          skillCheck: [
            ask('line-find-t', 2),
            ask('line-contains', 2),
            ask('line-missing-coord', 2),
          ],
        },
        {
          id: 'vm-l6-relation',
          title: 'Parallel, Intersecting or Skew',
          slides: [
            teach(
              prose(
                'Two lines are **parallel** when their directions are scalar multiples of each other. Compare the directions first, whatever else the question asks.',
              ),
              maths('\\begin{pmatrix} 6 \\\\ -4 \\end{pmatrix} = 2\\begin{pmatrix} 3 \\\\ -2 \\end{pmatrix}'),
              prose(
                'Parallel lines may still be one line written twice. Test whether a point of one lies on the other: if it does, they are the same line; if not, they never meet.',
              ),
            ),
            ask('lines-parallel-k'),
            ask('line-contains'),
            ask('lines-relation'),
            teach(
              prose(
                'In a plane, two lines that are not parallel always cross. In three dimensions they need not: one can pass above the other. Lines that are not parallel and never meet are **skew**.',
              ),
              prose(
                'A line in three dimensions works exactly as in two, with a third component. Two lines get two parameters, $\\lambda$ and $\\mu$, because where they meet each line can be at a different value of its own.',
              ),
            ),
            ask('lines-parallel-k+choice'),
            teach(
              prose(
                'To test for crossing, set the lines equal, solve two of the components for $\\lambda$ and $\\mu$, then check the third.',
              ),
              maths(
                '\\ell_1: \\; \\mathbf{r} = \\begin{pmatrix} 1 \\\\ 2 \\\\ 0 \\end{pmatrix} + \\lambda\\begin{pmatrix} 1 \\\\ 1 \\\\ 2 \\end{pmatrix}',
              ),
              maths(
                '\\ell_2: \\; \\mathbf{r} = \\begin{pmatrix} 3 \\\\ 0 \\\\ 1 \\end{pmatrix} + \\mu\\begin{pmatrix} 0 \\\\ 1 \\\\ 1 \\end{pmatrix}',
              ),
              prose(
                'In $x$, $1 + \\lambda = 3$, so $\\lambda = 2$. In $y$, $2 + \\lambda = \\mu$, so $\\mu = 4$. Then in $z$, $\\ell_1$ reaches $2 \\times 2 = 4$ but $\\ell_2$ reaches $1 + 4 = 5$. The third component disagrees, so these lines are skew.',
              ),
            ),
            ask('lines-third-tree'),
            ask('lines-relation+choice', 2),
            ask('lines-solve'),
            ask('lines-third-tree'),
          ],
          skillCheck: [
            ask('lines-relation', 2),
            ask('lines-third-tree', 2),
            ask('lines-parallel-k', 2),
          ],
        },
        {
          id: 'vm-l6-intersection',
          title: 'The Point of Intersection',
          slides: [
            teach(
              prose(
                'Where two lines cross, the same point is on both, so their equations are equal there, each line at its own parameter.',
              ),
              maths(
                '\\begin{gathered} \\begin{pmatrix} 1 \\\\ 1 \\end{pmatrix} + \\lambda\\begin{pmatrix} 2 \\\\ 1 \\end{pmatrix} \\\\ = \\begin{pmatrix} 5 \\\\ 0 \\end{pmatrix} + \\mu\\begin{pmatrix} 0 \\\\ 1 \\end{pmatrix} \\end{gathered}',
              ),
              prose(
                'Across, $1 + 2\\lambda = 5$, so $\\lambda = 2$. Up, $1 + \\lambda = \\mu$, so $\\mu = 3$. Two equations, two unknowns.',
              ),
            ),
            ask('lines-solve'),
            ask('lines-solve+choice'),
            ask('lines-meet-slider'),
            teach(
              prose(
                'The parameter is not the point. Put $\\lambda = 2$ back into the first line to find where they cross:',
              ),
              maths(
                '\\begin{pmatrix} 1 \\\\ 1 \\end{pmatrix} + 2\\begin{pmatrix} 2 \\\\ 1 \\end{pmatrix} = \\begin{pmatrix} 5 \\\\ 3 \\end{pmatrix}',
              ),
              prose(
                'Putting $\\mu = 3$ into the second line lands on $\\left(5, 3\\right)$ too, which is a free check. Each parameter belongs to its own line: $\\lambda$ in the second equation is the slip to avoid.',
              ),
            ),
            ask('lines-meet'),
            ask('lines-meet-tree'),
            ask('lines-meet-slider'),
            teach(
              prose(
                'In three dimensions the method is the same with one more step: solve two components, then check the third before trusting the point.',
              ),
              maths(
                '\\begin{gathered} \\begin{pmatrix} 1 \\\\ 0 \\\\ 2 \\end{pmatrix} + \\lambda\\begin{pmatrix} 1 \\\\ 1 \\\\ 1 \\end{pmatrix} \\\\ = \\begin{pmatrix} 0 \\\\ 3 \\\\ -3 \\end{pmatrix} + \\mu\\begin{pmatrix} 1 \\\\ 0 \\\\ 2 \\end{pmatrix} \\end{gathered}',
              ),
              prose(
                'In $y$, $\\lambda = 3$. In $x$, $1 + 3 = \\mu$, so $\\mu = 4$. Check $z$: the first line reaches $2 + 3 = 5$ and the second $-3 + 2 \\times 4 = 5$. They agree, so the lines meet, at $\\left(4, 3, 5\\right)$. Had they disagreed, the lines would be skew.',
              ),
            ),
            ask('lines-third-tree'),
            askAfter(
              [
                prose(
                  'Compare the directions before solving anything. If one is a multiple of the other, the lines are parallel: they never meet, unless they are the same line. Directions $\\begin{pmatrix} 2 \\\\ 1 \\end{pmatrix}$ and $\\begin{pmatrix} -4 \\\\ -2 \\end{pmatrix}$ are parallel, since $-4 = -2 \\times 2$ and $-2 = -2 \\times 1$.',
                ),
                prose(
                  'Then test a point. With starts $\\left(1, 3\\right)$ and $\\left(5, 4\\right)$, the journey between them is $\\begin{pmatrix} 4 \\\\ 1 \\end{pmatrix}$: $\\frac{4}{2} = 2$ but $\\frac{1}{1} = 1$, not a multiple of the direction. So they are parallel and separate. Had it been a multiple, they would be the same line.',
                ),
              ],
              'lines-relation+choice',
              2,
            ),
          ],
          skillCheck: [
            ask('lines-meet', 2),
            ask('lines-solve', 2),
            ask('lines-third-tree', 2),
          ],
        },
      ],
      levelCheck: [
        ask('line-point-at', 2),
        ask('line-direction', 2),
        ask('line-same', 2),
        ask('line-through-two', 2),
        ask('line-two-points-at-tree', 2),
        ask('line-find-t', 2),
        ask('line-contains', 2),
        ask('line-missing-coord+choice', 2),
        ask('lines-parallel-k', 2),
        ask('lines-relation', 2),
        ask('lines-third-tree', 2),
        ask('lines-solve', 2),
        ask('lines-meet', 2),
        ask('lines-meet-slider', 2),
      ],
    },
    {
      id: 'vm-l12',
      title: 'The Angle Between Two Vectors',
      lessons: [
        {
          id: 'vm-l1-dot',
          title: 'The Scalar Product',
          slides: [
            teach(
              prose(
                'There is a way to multiply two vectors that produces an ordinary number: multiply matching components and add the results. It is called the **scalar product**, or the dot product.',
              ),
              maths(
                '\\begin{pmatrix} 3 \\\\ 2 \\end{pmatrix} \\cdot \\begin{pmatrix} -4 \\\\ 6 \\end{pmatrix} = \\left(3\\right)\\left(-4\\right) + \\left(2\\right)\\left(6\\right) = 0',
              ),
              prose(
                'The result is one number, not a vector — which is where the name comes from. Stopping with two products is stopping halfway.',
              ),
              prose(
                'That example came out zero, and zero is the interesting case. It means the two vectors are perpendicular.',
              ),
            ),
            ask('vec-dot'),
            ask('vec-dot-steps'),
            ask('vec-method'),
            teach(
              prose('The sign of the scalar product describes the angle between the vectors.'),
              maths('\\mathbf{a} \\cdot \\mathbf{b} = \\left| \\mathbf{a} \\right| \\left| \\mathbf{b} \\right| \\cos\\theta'),
              prose(
                'Since the two magnitudes are positive, the sign of the product is the sign of $\\cos\\theta$: positive means the vectors point broadly the same way, negative means broadly opposite, and zero means exactly perpendicular.',
              ),
              prose(
                'Rearranging that formula gives the angle itself, which is the usual reason for computing a scalar product at all.',
              ),
            ),
            askAfter(
              [
                prose(
                  'Rearranged, $\\cos\\theta = \\frac{\\mathbf{a} \\cdot \\mathbf{b}}{|\\mathbf{a}| \\, |\\mathbf{b}|}$. For $\\begin{pmatrix} 2 \\\\ 1 \\end{pmatrix}$ and $\\begin{pmatrix} 1 \\\\ 3 \\end{pmatrix}$, work out the three pieces, then divide:',
                ),
                maths('\\begin{aligned} \\mathbf{a} \\cdot \\mathbf{b} &= 2 + 3 = 5 \\\\ |\\mathbf{a}| &= \\sqrt{5} \\\\ |\\mathbf{b}| &= \\sqrt{10} \\end{aligned}'),
                maths('\\begin{aligned} \\cos\\theta &= \\frac{5}{\\sqrt{5}\\sqrt{10}} = \\frac{5}{\\sqrt{50}} \\\\ &= \\frac{5}{5\\sqrt{2}} = \\frac{1}{\\sqrt{2}} \\end{aligned}'),
              ],
              'vec-angle',
            ),
            ask('vec-method'),
            ask('vec-angle+choice'),
            teach(
              prose(
                'So a missing component can be found by insisting the scalar product is zero.',
              ),
              maths(
                '\\begin{pmatrix} 3 \\\\ 4 \\end{pmatrix} \\cdot \\begin{pmatrix} 8 \\\\ k \\end{pmatrix} = 24 + 4k = 0 \\implies k = -6',
              ),
              prose(
                'Perpendicularity is the scalar product being zero, not the vectors being negatives of each other. Those are opposite directions, whose scalar product is as negative as it can get.',
              ),
              prose(
                'Check the answer by substituting it back. $24 + 4\\left(-6\\right) = 0$, so the two vectors really are at right angles.',
              ),
            ),
            ask('vec-perpendicular-k'),
            ask('vec-perpendicular-k+choice'),
          ],
          skillCheck: [
            ask('vec-dot', 2),
            ask('vec-perpendicular-k', 2),
            ask('vec-angle', 2),
          ],
        },
        {
          id: 'vm-l12-dot3d',
          title: 'The Scalar Product in 3D',
          slides: [
            teach(
              prose(
                'The scalar product works the same way in three dimensions: multiply matching components and add. There are three products now instead of two.',
              ),
              maths('\\mathbf{a} \\cdot \\mathbf{b} = a_x b_x + a_y b_y + a_z b_z'),
              maths(
                '\\mathbf{a} = \\begin{pmatrix} 2 \\\\ -1 \\\\ 3 \\end{pmatrix}, \\quad \\mathbf{b} = \\begin{pmatrix} 4 \\\\ 5 \\\\ -2 \\end{pmatrix}',
              ),
              maths('\\mathbf{a} \\cdot \\mathbf{b} = 8 - 5 - 6 = -3'),
              prose(
                'As in two dimensions, the sign describes the angle between them: positive is acute, negative is obtuse, and zero is a right angle. These two are at an obtuse angle.',
              ),
            ),
            ask('angle-dot3'),
            ask('angle-dot3-tree'),
            ask('angle-sign'),
            teach(
              prose(
                'In $\\mathbf{i}$, $\\mathbf{j}$, $\\mathbf{k}$ form a missing term is a zero component, so its product is zero:',
              ),
              maths('(3\\mathbf{i} - \\mathbf{k}) \\cdot (2\\mathbf{i} + 5\\mathbf{j} + 4\\mathbf{k})'),
              maths('= 6 + 0 - 4 = 2'),
              prose(
                'Working backwards, a known scalar product turns an unknown entry into an equation. If $\\left(2, k, 3\\right) \\cdot \\left(1, 4, -2\\right) = 8$:',
              ),
              maths('2 + 4k - 6 = 8 \\implies k = 3'),
            ),
            ask('angle-sign', 2),
            ask('angle-dot-k'),
            ask('angle-dot-k+choice'),
            teach(
              prose(
                'The scalar product behaves like ordinary multiplication. Order does not matter, numbers come outside, and it shares out over a sum:',
              ),
              maths('\\mathbf{a} \\cdot (\\mathbf{b} + \\mathbf{c}) = \\mathbf{a} \\cdot \\mathbf{b} + \\mathbf{a} \\cdot \\mathbf{c}'),
              prose('A vector dotted with itself is its length squared, $\\mathbf{a} \\cdot \\mathbf{a} = |\\mathbf{a}|^2$. So with $|\\mathbf{a}| = 3$, $|\\mathbf{b}| = 4$ and $\\mathbf{a} \\cdot \\mathbf{b} = 2$:'),
              maths('|\\mathbf{a} + \\mathbf{b}|^2'),
              maths('= |\\mathbf{a}|^2 + 2\\,\\mathbf{a} \\cdot \\mathbf{b} + |\\mathbf{b}|^2'),
              maths('= 9 + 4 + 16 = 29'),
            ),
            ask('angle-dot-algebra'),
            ask('angle-dot-algebra+choice'),
          ],
          skillCheck: [
            ask('angle-dot3', 2),
            ask('angle-sign', 2),
            ask('angle-dot-algebra', 2),
          ],
        },
        {
          id: 'vm-l12-cos',
          title: 'Finding the Angle',
          slides: [
            teach(
              prose(
                'Rearranging $\\mathbf{a} \\cdot \\mathbf{b} = |\\mathbf{a}||\\mathbf{b}|\\cos\\theta$ gives the angle between two vectors from their components:',
              ),
              maths('\\cos\\theta = \\frac{\\mathbf{a} \\cdot \\mathbf{b}}{|\\mathbf{a}| \\, |\\mathbf{b}|}'),
              prose(
                'Take $\\mathbf{a} = \\left(1, 2, 2\\right)$ and $\\mathbf{b} = \\left(2, 3, 6\\right)$. Both lengths are whole: ${|\\mathbf{a}| = \\sqrt{1 + 4 + 4} = 3}$ and ${|\\mathbf{b}| = \\sqrt{4 + 9 + 36} = 7}$.',
              ),
              maths('\\mathbf{a} \\cdot \\mathbf{b} = 2 + 6 + 12 = 20'),
              maths('\\cos\\theta = \\frac{20}{3 \\times 7} = \\frac{20}{21}'),
            ),
            ask('angle-dot3+choice'),
            ask('angle-cos'),
            ask('angle-cos-tree'),
            teach(
              prose('When the cosine is one of a few exact values, the angle is a whole number of degrees:'),
              maths('\\cos 60^\\circ = \\tfrac{1}{2}, \\quad \\cos 45^\\circ = \\tfrac{\\sqrt{2}}{2}'),
              maths('\\cos 30^\\circ = \\tfrac{\\sqrt{3}}{2}, \\quad \\cos 90^\\circ = 0'),
              prose(
                'A negative cosine gives the obtuse partner, $180^\\circ$ minus the acute angle: $-\\tfrac{1}{2}$ is $120^\\circ$.',
              ),
              prose(
                'For $\\left(1, 1, 0\\right)$ and $\\left(0, 1, 1\\right)$ the scalar product is $1$ and both lengths are $\\sqrt{2}$, so $\\cos\\theta = \\tfrac{1}{2}$ and $\\theta = 60^\\circ$.',
              ),
            ),
            ask('angle-degrees'),
            ask('angle-degrees+choice'),
            teach(
              prose(
                'The same formula works in any direction: three of $\\mathbf{a} \\cdot \\mathbf{b}$, $|\\mathbf{a}|$, $|\\mathbf{b}|$ and $\\theta$ fix the fourth. With $|\\mathbf{a}| = 4$, $|\\mathbf{b}| = 6$ and an angle of $120^\\circ$:',
              ),
              maths('\\mathbf{a} \\cdot \\mathbf{b} = 4 \\times 6 \\times \\cos 120^\\circ'),
              maths('= 24 \\times \\left(-\\tfrac{1}{2}\\right) = -12'),
            ),
            ask('angle-given'),
            ask('angle-sign', 2),
            ask('angle-given+choice'),
          ],
          skillCheck: [
            ask('angle-cos', 2),
            ask('angle-degrees', 2),
            ask('angle-given', 2),
          ],
        },
        {
          id: 'vm-l12-perpendicular',
          title: 'Perpendicular Vectors',
          slides: [
            teach(
              prose(
                'Two vectors are **perpendicular** exactly when their scalar product is zero, since $\\cos 90^\\circ = 0$. In three dimensions there are three products to cancel out:',
              ),
              maths(
                '\\begin{pmatrix} 2 \\\\ -1 \\\\ 3 \\end{pmatrix} \\cdot \\begin{pmatrix} 1 \\\\ 5 \\\\ 1 \\end{pmatrix}',
              ),
              maths('= 2 - 5 + 3 = 0'),
              prose(
                'A vector and its negative are not perpendicular. They point opposite ways, $180^\\circ$ apart, and their scalar product is as negative as it can be.',
              ),
              prose(
                'So two vectors are perpendicular, parallel (one a multiple of the other), or at an acute or obtuse angle.',
              ),
            ),
            ask('angle-perp-which'),
            ask('angle-relation-flow'),
            ask('angle-perp-which', 2),
            teach(
              prose(
                'Setting the scalar product to zero turns an unknown entry into an equation. For $\\left(3, k, -2\\right)$ and $\\left(4, 2, 5\\right)$:',
              ),
              maths('12 + 2k - 10 = 0'),
              maths('2k = -2 \\implies k = -1'),
              prose(
                'If $k$ is in both vectors, collect its terms first. For $\\left(k, 2, 1\\right)$ and $\\left(3, k, -5\\right)$:',
              ),
              maths('3k + 2k - 5 = 0 \\implies k = 1'),
            ),
            ask('angle-perp-k'),
            ask('angle-perp-k-tree', 2),
            ask('angle-relation-flow', 2),
            teach(
              prose(
                'A scalar product of zero simplifies anything built from perpendicular vectors. The middle term of $|\\mathbf{a} + \\mathbf{b}|^2$ disappears:',
              ),
              maths('|\\mathbf{a} + \\mathbf{b}|^2 = |\\mathbf{a}|^2 + |\\mathbf{b}|^2'),
              prose(
                'That is Pythagoras: $\\mathbf{a}$ and $\\mathbf{b}$ are the two shorter sides of a right-angled triangle, and $\\mathbf{a} + \\mathbf{b}$ is its hypotenuse.',
              ),
              prose(
                'The scalar product shares out over a sum, and $\\mathbf{a} \\cdot \\mathbf{a} = |\\mathbf{a}|^2$. With $|\\mathbf{a}| = 3$ and $\\mathbf{a}$ perpendicular to $\\mathbf{b}$:',
              ),
              maths('\\begin{aligned} \\mathbf{a} \\cdot (\\mathbf{a} + 4\\mathbf{b}) &= \\mathbf{a} \\cdot \\mathbf{a} + 4\\,\\mathbf{a} \\cdot \\mathbf{b} \\\\ &= 9 + 4(0) = 9 \\end{aligned}'),
            ),
            ask('angle-dot-algebra', 2),
            askAfter(
              [
                prose(
                  'When $\\mathbf{a} \\cdot \\mathbf{b}$ is not zero, the middle terms stay. Multiply out like brackets; $\\mathbf{a} \\cdot \\mathbf{b} = \\mathbf{b} \\cdot \\mathbf{a}$, so they combine. With $|\\mathbf{a}| = 3$, $|\\mathbf{b}| = 4$ and $\\mathbf{a} \\cdot \\mathbf{b} = 5$:',
                ),
                maths('|\\mathbf{a} - \\mathbf{b}|^2 = |\\mathbf{a}|^2 - 2\\,\\mathbf{a} \\cdot \\mathbf{b} + |\\mathbf{b}|^2'),
                maths('= 9 - 10 + 16 = 15'),
              ],
              'angle-dot-algebra+choice',
              2,
            ),
          ],
          skillCheck: [
            ask('angle-perp-k', 2),
            ask('angle-relation-flow', 2),
            ask('angle-perp-which', 2),
          ],
        },
        {
          id: 'vm-l12-lines',
          title: 'The Angle Between Two Lines',
          slides: [
            teach(
              prose(
                'The angle between two lines is the angle between their **directions**. In $\\mathbf{r} = \\mathbf{a} + \\lambda\\mathbf{d}$ that is $\\mathbf{d}$, the vector multiplying the parameter; $\\mathbf{a}$ only says where the line starts.',
              ),
              maths('\\cos\\theta = \\frac{\\mathbf{d}_1 \\cdot \\mathbf{d}_2}{|\\mathbf{d}_1| \\, |\\mathbf{d}_2|}'),
              prose(
                'Written as a general point, like $\\left(1 + 2t, \\, 3 - t, \\, 4t\\right)$, the direction is the coefficients of $t$: $\\left(2, -1, 4\\right)$.',
              ),
              prose(
                'Two crossing lines make two angles that add to $180^\\circ$. **The angle between them** means the acute one, so use the modulus of the scalar product.',
              ),
            ),
            ask('angle-line-direction'),
            ask('angle-setting-flow'),
            teach(
              prose(
                'Take directions $\\mathbf{d}_1 = \\left(1, 2, 2\\right)$ and $\\mathbf{d}_2 = \\left(-2, 3, -6\\right)$, of lengths $3$ and $7$:',
              ),
              maths('\\mathbf{d}_1 \\cdot \\mathbf{d}_2 = -2 + 6 - 12 = -8'),
              maths('\\cos\\theta = \\frac{|-8|}{3 \\times 7} = \\frac{8}{21}'),
              prose(
                'Without the modulus the cosine is negative, and the angle found is the obtuse one: the other angle where the lines cross.',
              ),
            ),
            ask('angle-lines-cos'),
            ask('angle-lines'),
            ask('angle-lines-cos-tree'),
            teach(
              prose(
                'A line through two points $A$ and $B$ has direction $\\overrightarrow{AB} = \\mathbf{b} - \\mathbf{a}$, end minus start.',
              ),
              prose(
                'For $A\\left(1, 2, 0\\right)$ and $B\\left(3, 1, 4\\right)$ that is $\\left(2, -1, 4\\right)$. Going from $B$ to $A$ instead reverses it, which changes no angle.',
              ),
            ),
            ask('angle-lines+choice'),
            ask('angle-line-direction', 2),
            ask('angle-setting-flow'),
          ],
          skillCheck: [
            ask('angle-lines', 2),
            ask('angle-lines-cos-tree', 2),
            ask('angle-line-direction', 2),
          ],
        },
      ],
      levelCheck: [
        ask('vec-dot', 2),
        ask('vec-perpendicular-k', 2),
        ask('vec-angle', 2),
        ask('angle-dot3', 2),
        ask('angle-sign', 2),
        ask('angle-dot-algebra', 2),
        ask('angle-cos-tree', 2),
        ask('angle-degrees', 2),
        ask('angle-relation-flow', 2),
        ask('angle-given', 2),
        ask('angle-perp-which', 2),
        ask('angle-perp-k', 2),
        ask('angle-lines-cos-tree', 2),
        ask('angle-lines', 2),
      ],
    },
    {
      id: 'vm-l8',
      title: 'Planes & the Cross Product',
      lessons: [
        {
          id: 'vm-l8-cross',
          title: 'The Cross Product',
          slides: [
            teach(
              prose(
                'The **cross product** $\\mathbf{a} \\times \\mathbf{b}$ of two vectors in three dimensions is another vector. Each of its components is built from the other two components of $\\mathbf{a}$ and $\\mathbf{b}$, cross-multiplied and subtracted.',
              ),
              maths(
                '\\mathbf{a} \\times \\mathbf{b} = \\begin{pmatrix} a_y b_z - a_z b_y \\\\ a_z b_x - a_x b_z \\\\ a_x b_y - a_y b_x \\end{pmatrix}',
              ),
              prose(
                'The letters follow the cycle $x \\to y \\to z \\to x$: the $x$ component starts from $y$, the $y$ component from $z$, and the $z$ component from $x$.',
              ),
              prose('For $\\mathbf{a} = \\left(1, 2, 3\\right)$ and $\\mathbf{b} = \\left(4, 0, -1\\right)$, one component at a time:'),
              maths(
                '\\begin{aligned} x&: \\ 2(-1) - 3(0) = -2 \\\\ y&: \\ 3(4) - 1(-1) = 13 \\\\ z&: \\ 1(0) - 2(4) = -8 \\end{aligned}',
              ),
              maths(
                '\\begin{pmatrix} 1 \\\\ 2 \\\\ 3 \\end{pmatrix} \\times \\begin{pmatrix} 4 \\\\ 0 \\\\ -1 \\end{pmatrix} = \\begin{pmatrix} -2 \\\\ 13 \\\\ -8 \\end{pmatrix}',
              ),
            ),
            ask('cross-product'),
            ask('cross-entry-steps'),
            ask('cross-product+choice'),
            teach(
              prose(
                'Working backwards: if one component of $\\mathbf{a} \\times \\mathbf{b}$ is known, an unknown entry turns that component into an equation.',
              ),
              prose(
                'Take $\\mathbf{a} = \\left(1, k, 2\\right)$ and $\\mathbf{b} = \\left(3, 1, 0\\right)$, with a $z$ component of $-5$. That component is $a_x b_y - a_y b_x$:',
              ),
              maths('1 \\times 1 - k \\times 3 = -5'),
              maths('1 - 3k = -5 \\implies k = 2'),
            ),
            ask('cross-unknown'),
            ask('cross-entry-steps', 2),
            teach(
              prose(
                'The order matters. Swapping the vectors swaps every pair of products, so every component changes sign. A scalar on either vector comes outside the whole product.',
              ),
              maths('\\mathbf{b} \\times \\mathbf{a} = -\\left(\\mathbf{a} \\times \\mathbf{b}\\right)'),
              maths('\\left(k\\mathbf{a}\\right) \\times \\mathbf{b} = k\\left(\\mathbf{a} \\times \\mathbf{b}\\right)'),
              prose(
                'A vector crossed with itself is $\\mathbf{0}$. The unit vectors go round the cycle $\\mathbf{i} \\to \\mathbf{j} \\to \\mathbf{k} \\to \\mathbf{i}$: forwards gives the third one, backwards gives its negative.',
              ),
              maths('\\mathbf{i} \\times \\mathbf{j} = \\mathbf{k}, \\quad \\mathbf{j} \\times \\mathbf{i} = -\\mathbf{k}'),
            ),
            ask('cross-rules'),
            ask('cross-unknown', 2),
            ask('cross-rules', 2),
          ],
          skillCheck: [
            ask('cross-product', 2),
            ask('cross-rules', 2),
            ask('cross-unknown', 2),
          ],
        },
        {
          id: 'vm-l8-perpendicular',
          title: 'What the Cross Product Is For',
          slides: [
            teach(
              prose(
                'The cross product $\\mathbf{a} \\times \\mathbf{b}$ is **perpendicular to both** $\\mathbf{a}$ and $\\mathbf{b}$. That is what it is for: given two directions, it finds a third at right angles to both.',
              ),
              prose(
                'The dot product checks it, since perpendicular vectors have a dot product of zero. With the example from the last lesson:',
              ),
              maths(
                '\\begin{pmatrix} -2 \\\\ 13 \\\\ -8 \\end{pmatrix} \\cdot \\begin{pmatrix} 1 \\\\ 2 \\\\ 3 \\end{pmatrix}',
              ),
              maths('= -2 + 26 - 24 = 0'),
              prose('Any non-zero multiple of $\\mathbf{a} \\times \\mathbf{b}$ is perpendicular to both as well.'),
            ),
            ask('cross-perpendicular'),
            ask('cross-product'),
            ask('cross-check-tree'),
            teach(
              prose(
                'The **length** of $\\mathbf{a} \\times \\mathbf{b}$ is the area of the parallelogram with sides $\\mathbf{a}$ and $\\mathbf{b}$.',
              ),
              maths('\\text{area} = \\left|\\mathbf{a} \\times \\mathbf{b}\\right|'),
              maths(
                '\\begin{pmatrix} 2 \\\\ 0 \\\\ 1 \\end{pmatrix} \\times \\begin{pmatrix} 0 \\\\ 2 \\\\ 2 \\end{pmatrix} = \\begin{pmatrix} -2 \\\\ -4 \\\\ 4 \\end{pmatrix}',
              ),
              maths('\\sqrt{4 + 16 + 16} = 6'),
              prose('So those two sides make a parallelogram of area $6$. Leaving out the square root is the usual slip.'),
            ),
            ask('cross-area-tree'),
            ask('cross-product+choice'),
            ask('cross-check-tree', 2),
            teach(
              prose('A triangle on the same two sides is half the parallelogram.'),
              maths('\\text{triangle} = \\tfrac{1}{2}\\left|\\mathbf{a} \\times \\mathbf{b}\\right|'),
              prose(
                'When the corners are given as points, the sides are journeys out of one corner: for triangle $ABC$, cross $\\overrightarrow{AB}$ with $\\overrightarrow{AC}$.',
              ),
              prose(
                'For $A\\left(1, 0, 0\\right)$, $B\\left(3, 0, 1\\right)$ and $C\\left(1, 2, 2\\right)$, $\\overrightarrow{AB} = \\left(2, 0, 1\\right)$ and $\\overrightarrow{AC} = \\left(0, 2, 2\\right)$: the two sides above. Their cross product $\\left(-2, -4, 4\\right)$ has length $6$, so the triangle has area $\\tfrac{1}{2} \\times 6 = 3$.',
              ),
            ),
            ask('cross-area'),
            ask('cross-perpendicular', 2),
          ],
          skillCheck: [
            ask('cross-area', 2),
            ask('cross-perpendicular', 2),
            ask('cross-check-tree', 2),
          ],
        },
        {
          id: 'vm-l8-plane',
          title: 'The Equation of a Plane',
          slides: [
            teach(
              prose(
                'A plane is fixed by one point on it and a **normal**: a vector perpendicular to the whole plane.',
              ),
              prose(
                'If $A$ is on the plane, the journey from $A$ to any other point $\\mathbf{r}$ of the plane is perpendicular to the normal $\\mathbf{n}$. So every point of the plane has the same dot product with $\\mathbf{n}$ as $A$ does:',
              ),
              maths('\\mathbf{r} \\cdot \\mathbf{n} = \\mathbf{a} \\cdot \\mathbf{n}'),
              prose('The right-hand side is a number, called $d$. Through $A\\left(1, 2, 3\\right)$ with normal $\\left(2, -1, 1\\right)$:'),
              maths('d = 1(2) + 2(-1) + 3(1)'),
              maths('= 2 - 2 + 3 = 3'),
            ),
            ask('plane-d'),
            ask('plane-on'),
            ask('plane-d', 2),
            teach(
              prose(
                'Writing $\\mathbf{r}$ as $\\left(x, y, z\\right)$ and multiplying out the dot product gives the **Cartesian** form. The normal\'s components become the coefficients.',
              ),
              maths('\\mathbf{r} \\cdot \\begin{pmatrix} 2 \\\\ -1 \\\\ 1 \\end{pmatrix} = 3'),
              maths('2x - y + z = 3'),
              prose('So the normal can be read straight off a Cartesian equation, and a missing term means a zero component.'),
            ),
            ask('plane-cartesian'),
            ask('plane-vector-form'),
            ask('plane-on', 2),
            teach(
              prose(
                'A point is on the plane exactly when its coordinates satisfy the equation. With one coordinate unknown, substituting leaves an equation to solve. For $\\left(4, k, 5\\right)$ on $2x - y + z = 3$:',
              ),
              maths('2(4) - k + 5 = 3'),
              maths('13 - k = 3 \\implies k = 10'),
            ),
            ask('plane-missing'),
            ask('plane-cartesian', 2),
          ],
          skillCheck: [
            ask('plane-d', 2),
            ask('plane-cartesian', 2),
            ask('plane-missing', 2),
          ],
        },
        {
          id: 'vm-l8-three-points',
          title: 'A Plane Through Three Points',
          slides: [
            teach(
              prose(
                'Three points not on one line fix a plane. The journeys between them lie in the plane, so their cross product is a normal to it.',
              ),
              maths('\\mathbf{n} = \\overrightarrow{AB} \\times \\overrightarrow{AC}'),
              prose(
                'Use the journeys, destination minus start, not the position vectors. $\\mathbf{a} \\times \\mathbf{b}$ is perpendicular to the lines from the origin, and those are not in the plane.',
              ),
            ),
            ask('plane-d'),
            ask('plane-on'),
            teach(
              prose('The whole route for $A\\left(1, 0, 2\\right)$, $B\\left(2, 1, 2\\right)$ and $C\\left(1, 2, 3\\right)$:'),
              maths(
                '\\overrightarrow{AB} = \\begin{pmatrix} 1 \\\\ 1 \\\\ 0 \\end{pmatrix}, \\quad \\overrightarrow{AC} = \\begin{pmatrix} 0 \\\\ 2 \\\\ 1 \\end{pmatrix}',
              ),
              maths(
                '\\mathbf{n} = \\begin{pmatrix} 1(1) - 0(2) \\\\ 0(0) - 1(1) \\\\ 1(2) - 1(0) \\end{pmatrix} = \\begin{pmatrix} 1 \\\\ -1 \\\\ 2 \\end{pmatrix}',
              ),
              maths('d = 1(1) - 1(0) + 2(2) = 5'),
              maths('x - y + 2z = 5'),
            ),
            ask('plane-three-normal'),
            ask('plane-three-normal+choice'),
            ask('plane-three-tree'),
            ask('plane-three-equation'),
            teach(
              prose(
                'Any non-zero multiple of the normal gives the same plane, so divide out a common factor: $2x - 4y + 6z = 10$ is the plane $x - 2y + 3z = 5$.',
              ),
              prose(
                'Then check with the points you did not use for $d$. All three have to satisfy the equation; if one does not, a sign has slipped.',
              ),
            ),
            ask('plane-three-equation', 2),
            ask('plane-three-tree', 2),
          ],
          skillCheck: [
            ask('plane-three-normal', 2),
            ask('plane-three-tree', 2),
            ask('plane-three-equation', 2),
          ],
        },
        {
          id: 'vm-l8-line-plane',
          title: 'Where a Line Meets a Plane',
          slides: [
            teach(
              prose(
                'Every point of a line $\\mathbf{r} = \\mathbf{a} + t\\mathbf{b}$ is $\\mathbf{a} + t\\mathbf{b}$ for some $t$. Put that into the plane\'s equation and solve for $t$.',
              ),
              maths(
                '\\mathbf{r} = \\begin{pmatrix} 1 \\\\ 0 \\\\ 2 \\end{pmatrix} + t\\begin{pmatrix} 1 \\\\ 1 \\\\ -1 \\end{pmatrix}',
              ),
              prose(
                'Its general point is $\\left(1 + t, \\, t, \\, 2 - t\\right)$. Into the plane $x + 2y + z = 9$:',
              ),
              maths('\\left(1 + t\\right) + 2t + \\left(2 - t\\right) = 9'),
              maths('3 + 2t = 9 \\implies t = 3'),
              prose(
                'Then $t = 3$ in the line gives the point, $\\left(4, 3, -1\\right)$. The value of $t$ is a step, not the answer.',
              ),
            ),
            ask('line-plane-t'),
            ask('line-plane-point'),
            ask('line-plane-t+choice', 2),
            teach(
              prose(
                'If the line\'s direction is perpendicular to the normal, $\\mathbf{b} \\cdot \\mathbf{n} = 0$, the $t$ terms cancel and there is nothing to solve. The line runs parallel to the plane.',
              ),
              prose(
                'Then either every point of the line is on the plane or none is. Test the starting point: if it satisfies the equation, the line lies in the plane; if not, the line never meets it.',
              ),
            ),
            ask('line-plane-relation'),
            ask('line-plane-parallel'),
            ask('line-plane-relation+choice', 2),
            teach(
              prose('In the form $\\mathbf{r} \\cdot \\mathbf{n} = d$, the substitution splits into two dot products:'),
              maths('\\mathbf{a} \\cdot \\mathbf{n} + t \\, \\mathbf{b} \\cdot \\mathbf{n} = d'),
              prose(
                'Two numbers and one equation in $t$. When $\\mathbf{b} \\cdot \\mathbf{n}$ is zero, this is the parallel case again.',
              ),
            ),
            ask('line-plane-point-tree'),
            ask('line-plane-parallel', 2),
          ],
          skillCheck: [
            ask('line-plane-point', 2),
            ask('line-plane-relation', 2),
            ask('line-plane-t', 2),
          ],
        },
        {
          id: 'vm-l12-planes',
          title: 'Lines and Planes',
          slides: [
            teach(
              prose(
                "A plane's normal $\\mathbf{n}$ is perpendicular to the whole plane. So a line's direction $\\mathbf{b}$ dotted with $\\mathbf{n}$ gives the angle $\\phi$ between the line and the **normal**, and the line meets the plane at $\\theta = 90^\\circ - \\phi$.",
              ),
              prose('Since $\\cos\\phi = \\sin\\theta$, that is one step:'),
              maths('\\sin\\theta = \\frac{|\\mathbf{b} \\cdot \\mathbf{n}|}{|\\mathbf{b}| \\, |\\mathbf{n}|}'),
              prose(
                'Direction $\\mathbf{b} = \\left(1, -1, 0\\right)$ against the plane ${y + z = 3}$, whose normal is $\\mathbf{n} = \\left(0, 1, 1\\right)$:',
              ),
              maths('\\begin{aligned} \\mathbf{b} \\cdot \\mathbf{n} &= 0 - 1 + 0 = -1 \\\\ |\\mathbf{b}| &= \\sqrt{2} \\\\ |\\mathbf{n}| &= \\sqrt{2} \\end{aligned}'),
              maths('\\sin\\theta = \\frac{|-1|}{\\sqrt{2}\\sqrt{2}} = \\frac{1}{2}'), prose('So $\\theta = 30^\\circ$.'),
            ),
            ask('angle-line-plane'),
            ask('angle-line-plane-tree'),
            askAfter(
              [
                prose(
                  'Two special cases: $\\mathbf{b}$ a multiple of $\\mathbf{n}$ means the line is perpendicular to the plane, and $\\mathbf{b} \\cdot \\mathbf{n} = 0$ means it is parallel. Direction $\\left(0, 2, 2\\right) = 2\\left(0, 1, 1\\right)$ is perpendicular to $y + z = 3$; direction $\\left(1, 1, -1\\right)$ gives $0 + 1 - 1 = 0$, so it is parallel.',
                ),
              ],
              'angle-line-plane-kind',
            ),
            teach(
              prose(
                'The angle between two planes is the angle between their normals, and like lines it is the acute one. For ${x + y = 4}$ and ${y + z = 1}$:',
              ),
              maths('\\cos\\theta = \\frac{(1, 1, 0) \\cdot (0, 1, 1)}{\\sqrt{2}\\sqrt{2}} = \\tfrac{1}{2}'),
              prose(
                'So $\\theta = 60^\\circ$. Two planes are perpendicular when their normals are, and parallel when one normal is a multiple of the other.',
              ),
            ),
            ask('angle-planes'),
            ask('angle-line-plane-kind', 2),
            teach(
              prose('Every angle in this level comes from the same formula; what changes is which vectors go into it.'),
              prose(
                '**Two lines**: their directions. **Two planes**: their normals. **A line and a plane**: the direction and the normal, then $90^\\circ$ minus the angle found.',
              ),
              prose('In every case the modulus of the scalar product gives the acute angle.'),
            ),
            ask('angle-setting-flow', 2),
            ask('angle-planes+choice', 2),
            ask('angle-setting-flow', 2),
          ],
          skillCheck: [
            ask('angle-line-plane', 2),
            ask('angle-planes', 2),
            ask('angle-line-plane-kind', 2),
          ],
        },
      ],
      levelCheck: [
        ask('cross-product', 2),
        ask('cross-entry-steps', 2),
        ask('cross-rules', 2),
        ask('cross-unknown', 2),
        ask('cross-perpendicular', 2),
        ask('cross-area', 2),
        ask('cross-check-tree', 2),
        ask('plane-d', 2),
        ask('plane-cartesian', 2),
        ask('plane-missing', 2),
        ask('plane-three-tree', 2),
        ask('plane-three-equation', 2),
        ask('line-plane-point', 2),
        ask('line-plane-relation', 2),
        ask('angle-line-plane', 2),
      ],
    },
    {
      id: 'vm-l10',
      title: 'Vectors in Mechanics',
      lessons: [
        {
          id: 'vm-l10-position',
          title: 'Position and Velocity',
          slides: [
            teach(
              prose(
                'In mechanics a **position vector** says where a particle is, measured from a fixed origin, with $\\mathbf{i}$ pointing east and $\\mathbf{j}$ north. Distances are in metres and times in seconds.',
              ),
              prose(
                'A constant **velocity** $\\mathbf{v}$ is the displacement every second. Starting from $\\mathbf{r}_0$, after $t$ seconds the particle is at',
              ),
              maths('\\mathbf{r} = \\mathbf{r}_0 + \\mathbf{v}t'),
              prose('Starting at $2\\mathbf{i} + \\mathbf{j}$ with velocity ${(3\\mathbf{i} - \\mathbf{j}) \\; \\mathrm{m\\,s^{-1}}}$, after $4$ seconds:'),
              maths('\\mathbf{r} = (2\\mathbf{i} + \\mathbf{j}) + 4(3\\mathbf{i} - \\mathbf{j})'),
              maths('= 14\\mathbf{i} - 3\\mathbf{j}'),
            ),
            ask('mech-position'),
            ask('mech-position-steps'),
            teach(
              prose(
                'To find **when** a particle is somewhere, set one component of $\\mathbf{r}$ equal to where it needs to be and solve for $t$. For $\\mathbf{r} = (-6\\mathbf{i} + 2\\mathbf{j}) + (2\\mathbf{i} + \\mathbf{j})t$ to reach $4\\mathbf{i} + 7\\mathbf{j}$:',
              ),
              maths('-6 + 2t = 4 \\implies t = 5'),
              prose('Then check the other component at the same time: $2 + 5 = 7$, as it should be.'),
              prose(
                '**Due north** of the origin means no distance east or west, so the $\\mathbf{i}$ component is $0$; due east means the $\\mathbf{j}$ component is $0$.',
              ),
            ),
            ask('mech-time-slider'),
            ask('mech-when'),
            ask('mech-time-slider', 2),
            ask('mech-when+choice'),
            teach(
              prose(
                'Working backwards: if a particle with constant velocity is at $\\mathbf{a}$ and then at $\\mathbf{b}$ a time $t$ later, the velocity is the displacement divided by that time.',
              ),
              maths('\\mathbf{v} = \\frac{\\mathbf{b} - \\mathbf{a}}{t}'),
              prose(
                'From $\\mathbf{i} + 5\\mathbf{j}$ to $7\\mathbf{i} - \\mathbf{j}$ in $3$ seconds is a displacement of $6\\mathbf{i} - 6\\mathbf{j}$, so $\\mathbf{v} = {(2\\mathbf{i} - 2\\mathbf{j}) \\; \\mathrm{m\\,s^{-1}}}$.',
              ),
            ),
            ask('mech-velocity-from'),
            ask('mech-velocity-from', 2),
          ],
          skillCheck: [
            ask('mech-position', 2),
            ask('mech-when', 2),
            ask('mech-velocity-from', 2),
          ],
        },
        {
          id: 'vm-l10-speed',
          title: 'Speed and Direction',
          slides: [
            teach(
              prose(
                '**Speed** is the magnitude of the velocity: how fast, with the direction left behind. It is never negative.',
              ),
              maths('\\text{speed} = |\\mathbf{v}|'),
              prose('A velocity of ${(3\\mathbf{i} - 4\\mathbf{j}) \\; \\mathrm{m\\,s^{-1}}}$ is a speed of'),
              maths('\\sqrt{3^2 + (-4)^2} = 5 \\; \\mathrm{m\\,s^{-1}}'),
              prose('At a constant speed, the distance travelled is the speed times the time: $5 \\; \\mathrm{m\\,s^{-1}}$ for $6$ seconds is $30$ metres.'),
            ),
            ask('mech-speed'),
            ask('mech-distance-tree'),
            askAfter(
              [
                prose(
                  'When the position is given as $\\mathbf{r} = \\mathbf{r}_0 + \\mathbf{v}t$, the velocity is the vector multiplying $t$. For $\\mathbf{r} = (\\mathbf{i} + 2\\mathbf{j}) + (6\\mathbf{i} - 8\\mathbf{j})t$, $\\mathbf{v} = 6\\mathbf{i} - 8\\mathbf{j}$, so the speed is $\\sqrt{36 + 64} = 10 \\; \\mathrm{m\\,s^{-1}}$.',
                ),
              ],
              'mech-speed+choice',
            ),
            teach(
              prose(
                'The other way round: a speed and a direction make a velocity. Divide the direction by its own length to get a **unit vector**, then multiply by the speed.',
              ),
              prose('At $10 \\; \\mathrm{m\\,s^{-1}}$ in the direction of $3\\mathbf{i} + 4\\mathbf{j}$, whose length is $5$:'),
              maths('\\mathbf{v} = \\frac{10}{5}(3\\mathbf{i} + 4\\mathbf{j})'),
              maths('= 6\\mathbf{i} + 8\\mathbf{j}'),
            ),
            ask('mech-velocity-from-speed'),
            ask('mech-distance-tree', 2),
            ask('mech-velocity-from-speed', 2),
            teach(
              prose(
                'The **direction** of motion is often given as the angle $\\theta$ it makes with $\\mathbf{i}$. The velocity is the hypotenuse of a right-angled triangle whose other sides are its components.',
              ),
              prose(
                'The $\\mathbf{j}$ component is opposite $\\theta$ and the $\\mathbf{i}$ component next to it, so for $4\\mathbf{i} + 3\\mathbf{j}$:',
              ),
              maths('\\tan\\theta = \\frac{3}{4}'),
            ),
            ask('mech-heading'),
            ask('mech-heading+choice', 2),
          ],
          skillCheck: [
            ask('mech-speed', 2),
            ask('mech-velocity-from-speed', 2),
            ask('mech-heading', 2),
          ],
        },
        {
          id: 'vm-l10-acceleration',
          title: 'Constant Acceleration',
          slides: [
            teach(
              prose(
                'A constant **acceleration** $\\mathbf{a}$ is the change in velocity every second. Starting with velocity $\\mathbf{u}$, after $t$ seconds the velocity is',
              ),
              maths('\\mathbf{v} = \\mathbf{u} + \\mathbf{a}t'),
              prose('Rearranged, the acceleration is the change in velocity divided by the time:'),
              maths('\\mathbf{a} = \\frac{\\mathbf{v} - \\mathbf{u}}{t}'),
              prose('Each component works on its own, exactly as with positions.'),
            ),
            ask('mech-suvat-v'),
            ask('mech-acceleration'),
            ask('mech-suvat-v+choice'),
            teach(
              prose(
                'A particle is moving **parallel to** $\\mathbf{i}$ when its velocity has no $\\mathbf{j}$ component. With $\\mathbf{u} = 3\\mathbf{i} - 6\\mathbf{j}$ and $\\mathbf{a} = \\mathbf{i} + 2\\mathbf{j}$, the $\\mathbf{j}$ component of the velocity is $-6 + 2t$:',
              ),
              maths('-6 + 2t = 0 \\implies t = 3'),
              prose('Parallel to $\\mathbf{i} + \\mathbf{j}$ means the two components are equal instead.'),
            ),
            ask('mech-parallel-time'),
            ask('mech-acceleration', 2),
            ask('mech-parallel-time+choice'),
            teach(
              prose('The **displacement** after $t$ seconds of constant acceleration is'),
              maths('\\mathbf{s} = \\mathbf{u}t + \\tfrac{1}{2}\\mathbf{a}t^2'),
              prose(
                'Two vectors, then their sum. With $\\mathbf{u} = 2\\mathbf{i} + \\mathbf{j}$, $\\mathbf{a} = \\mathbf{i} - \\mathbf{j}$ and $t = 4$: $\\mathbf{u}t = 8\\mathbf{i} + 4\\mathbf{j}$ and $\\tfrac{1}{2}\\mathbf{a}t^2 = 8\\mathbf{i} - 8\\mathbf{j}$, so $\\mathbf{s} = 16\\mathbf{i} - 4\\mathbf{j}$.',
              ),
            ),
            ask('mech-displacement-tree'),
            ask('mech-displacement-tree', 2),
          ],
          skillCheck: [
            ask('mech-suvat-v', 2),
            ask('mech-parallel-time', 2),
            ask('mech-displacement-tree', 2),
          ],
        },
        {
          id: 'vm-l10-forces',
          title: 'Forces as Vectors',
          slides: [
            teach(
              prose(
                'Forces are vectors, measured in newtons. Several forces on one particle have the same effect as their sum, the **resultant**.',
              ),
              maths('\\mathbf{R} = \\mathbf{F}_1 + \\mathbf{F}_2 + \\dots'),
              prose(
                'For $\\mathbf{F}_1 = 5\\mathbf{i} + 2\\mathbf{j}$ and $\\mathbf{F}_2 = \\mathbf{i} + 6\\mathbf{j}$, $\\mathbf{R} = 6\\mathbf{i} + 8\\mathbf{j}$, of magnitude $\\sqrt{36 + 64} = 10$ newtons.',
              ),
              prose(
                'A resultant **parallel to** $\\mathbf{i}$ has no $\\mathbf{j}$ component, so the $\\mathbf{j}$ components add to zero. With $\\mathbf{F}_1 = 2\\mathbf{i} + 3\\mathbf{j}$ and $\\mathbf{F}_2 = 4\\mathbf{i} + k\\mathbf{j}$: $3 + k = 0$, so $k = -3$. Parallel to $\\mathbf{j}$, it is the $\\mathbf{i}$ components that add to zero.',
              ),
            ),
            ask('mech-resultant'),
            ask('mech-resultant-tree'),
            ask('mech-force-k'),
            teach(
              prose(
                'A particle is in **equilibrium** when the resultant is zero. A missing force must then cancel all the others: it is their sum, reversed.',
              ),
              prose('With $\\mathbf{F}_1 = 3\\mathbf{i} - 2\\mathbf{j}$ and $\\mathbf{F}_2 = -\\mathbf{i} + 5\\mathbf{j}$, the sum is $2\\mathbf{i} + 3\\mathbf{j}$, so'),
              maths('\\mathbf{F}_3 = -2\\mathbf{i} - 3\\mathbf{j}'),
            ),
            ask('mech-equilibrium'),
            ask('mech-equilibrium+choice', 2),
            ask('mech-force-k+choice'),
            teach(
              prose(
                "Newton's second law holds for vectors: the resultant is the mass times the acceleration, and the two point the same way.",
              ),
              maths('\\mathbf{F} = m\\mathbf{a}'),
              prose(
                'A resultant of $(12\\mathbf{i} - 8\\mathbf{j})$ newtons on a $4$ kg particle gives $\\mathbf{a} = {(3\\mathbf{i} - 2\\mathbf{j}) \\; \\mathrm{m\\,s^{-2}}}$: divide each component by the mass.',
              ),
            ),
            ask('mech-fma'),
            askAfter(
              [
                prose(
                  'Given the acceleration, work back: $m\\mathbf{a}$ is the resultant, and a missing force is what is left once the known one is taken away. For $2$ kg, $\\mathbf{a} = 4\\mathbf{i} - \\mathbf{j}$ and $\\mathbf{F}_1 = 3\\mathbf{i} + 2\\mathbf{j}$:',
                ),
                maths('m\\mathbf{a} = 2(4\\mathbf{i} - \\mathbf{j}) = 8\\mathbf{i} - 2\\mathbf{j}'),
                maths('\\begin{aligned} \\mathbf{F}_2 &= (8\\mathbf{i} - 2\\mathbf{j}) - (3\\mathbf{i} + 2\\mathbf{j}) \\\\ &= 5\\mathbf{i} - 4\\mathbf{j} \\end{aligned}'),
              ],
              'mech-fma',
              2,
            ),
          ],
          skillCheck: [
            ask('mech-resultant-tree', 2),
            ask('mech-equilibrium', 2),
            ask('mech-fma', 2),
          ],
        },
        {
          id: 'vm-l10-two-particles',
          title: 'Two Particles',
          slides: [
            teach(
              prose(
                'With two particles $A$ and $B$, the position of $B$ **relative to** $A$ is the journey from $A$ to $B$ at that moment:',
              ),
              maths('\\mathbf{r}_B - \\mathbf{r}_A'),
              prose(
                'Find each position at the time asked, then subtract. The **distance** between them is the magnitude of that vector: if $B$ is $5\\mathbf{i} - 12\\mathbf{j}$ from $A$, they are $13$ metres apart.',
              ),
            ),
            ask('mech-relative'),
            ask('mech-apart-tree'),
            ask('mech-relative', 2),
            teach(
              prose(
                'Two particles **collide** only if they are in the same place at the **same time**: both components equal for one value of $t$.',
              ),
              prose(
                'So solve one component for $t$, then check the other at that time. For $\\mathbf{r}_A = (\\mathbf{i} + 2\\mathbf{j}) + (3\\mathbf{i} + \\mathbf{j})t$ and $\\mathbf{r}_B = (9\\mathbf{i} + 4\\mathbf{j}) + (-\\mathbf{i} + 2\\mathbf{j})t$:',
              ),
              maths('1 + 3t = 9 - t \\implies t = 2'),
              prose(
                'At $t = 2$ both $\\mathbf{j}$ components are $4$, so they collide, at $7\\mathbf{i} + 4\\mathbf{j}$.',
              ),
            ),
            ask('mech-meet-flow'),
            ask('mech-meet-time'),
            ask('mech-meet-point'),
            teach(
              prose(
                'That is stricter than two lines crossing. Their paths can cross with one particle arriving after the other has gone.',
              ),
              prose(
                'Keep $A$ as it was, and start $B$ at $9\\mathbf{i} + 5\\mathbf{j}$ instead. The $\\mathbf{i}$ components still match at $t = 2$, but then the $\\mathbf{j}$ components are $2 + 2 = 4$ for $A$ and $5 + 4 = 9$ for $B$. They differ, so there is no collision. If a component can never be equal, they never collide either.',
              ),
            ),
            ask('mech-meet-time+choice', 2),
            ask('mech-apart-tree', 2),
          ],
          skillCheck: [
            ask('mech-relative', 2),
            ask('mech-meet-time', 2),
            ask('mech-apart-tree', 2),
          ],
        },
      ],
      levelCheck: [
        ask('mech-position', 2),
        ask('mech-when', 2),
        ask('mech-velocity-from', 2),
        ask('mech-speed', 2),
        ask('mech-velocity-from-speed', 2),
        ask('mech-heading', 2),
        ask('mech-suvat-v', 2),
        ask('mech-parallel-time', 2),
        ask('mech-displacement-tree', 2),
        ask('mech-resultant-tree', 2),
        ask('mech-equilibrium', 2),
        ask('mech-fma', 2),
        ask('mech-meet-time', 2),
        ask('mech-apart-tree', 2),
      ],
    },
    level17,
    level18,
  ],
};
