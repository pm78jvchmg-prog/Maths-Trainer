/**
 * Vectors.
 *
 * One level today: vectors as components, through the scalar product and what
 * it says about direction. Split out of the old Vectors & Matrices course,
 * which was two subjects sharing a title — neither half reaches thirty lessons
 * while they share one, and a learner looking for matrices should not have to
 * know they live under a heading that starts with vectors.
 *
 * Lesson ids keep their `vm-` prefix so that progress recorded against the
 * combined course survives the split.
 *
 * The level closes with a level check: twelve questions, no teaching slides,
 * one attempt each.
 */
import type { Course, SlideRef } from '../types';

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

export const vectors: Course = {
  id: 'vectors',
  title: 'Vectors',
  blurb: 'Components, scalar multiples, magnitude, and the scalar product.',
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
            ask('vec-add'),
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
            ask('vec-scalar-k'),
            ask('vec-parallel'),
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
            ask('vec-scalar-combine'),
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
            ask('vec-angle'),
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
      ],
      levelCheck: [
        ask('vec-add', 2),
        ask('vec-notation', 2),
        ask('vec-journey', 2),
        ask('vec-scalar-combine', 2),
        ask('vec-scalar-k', 2),
        ask('vec-parallel', 2),
        ask('vec-magnitude', 2),
        ask('vec-distance', 2),
        ask('vec-unit', 2),
        ask('vec-dot', 2),
        ask('vec-perpendicular-k', 2),
        ask('vec-angle', 2),
      ],
    },
  ],
};
