/**
 * Classical Mechanics, level 9: Oscillations.
 *
 * Two masses on a spring and their reduced mass, the model of a vibrating
 * molecule (MIT 8.03); damping and resonance (OpenStax University Physics
 * 15.5 to 15.6); two masses coupled by a spring and their normal modes (Tong,
 * ch. 3); waves on a stretched string (16.3); and standing waves on a string
 * fixed at both ends (16.6). Simple harmonic motion is Level 8.
 */
import type { Level } from '../../types';
import { ask, display, prose, stacked, teach } from './blocks';

export const level9: Level = {
  id: 'clm-l9',
  title: 'Oscillations',
  lessons: [
    {
      id: 'clm-l9-molecule',
      title: 'Vibrations in Molecules',
      slides: [
        teach(
          prose('A molecule vibrates like two masses on a spring. Both move, about their centre of mass, and the pair swings as one body of the **reduced mass**:'),
          display('\\mu = \\frac{m_{1}m_{2}}{m_{1} + m_{2}} \\qquad \\omega = \\sqrt{\\frac{k}{\\mu}}'),
          prose('Masses of $2$ and $3\\text{ kg}$ on a spring of $30\\text{ N m}^{-1}$:'),
          stacked('\\mu = \\frac{2 \\times 3}{2 + 3} = 1.2', '\\omega = \\sqrt{\\frac{30}{1.2}} = 5\\text{ rad s}^{-1}'),
          prose('Backwards, from $\\mu = 1.2$ and one mass of $2$:'),
          stacked('\\frac{1}{m_{2}} = \\frac{1}{1.2} - \\frac{1}{2} = \\frac{1}{3}', 'm_{2} = 3'),
        ),
        ask('clm-reduced-mass'),
        ask('clm-reduced-table'),
        ask('clm-reduced-mass+choice', 2),
        ask('clm-reduced-table', 2),
        teach(
          prose('The spring’s stretch swings in simple harmonic motion, so the greatest speed of one mass relative to the other is $A\\omega$. A stretch amplitude of $0.1\\text{ m}$ at $\\omega = 5$ gives $0.5\\text{ m s}^{-1}$.'),
          prose('When one mass is nine or more times the other, $\\mu$ is within a tenth of the light one: $1$ and $9$ give $\\mu = 0.9$. The heavy one barely moves, as the chlorine in hydrogen chloride, $35$ times the hydrogen, barely does.'),
        ),
        ask('clm-molecule-tree'),
        ask('clm-molecule-flow'),
        ask('clm-molecule-tree', 2),
        ask('clm-molecule-flow', 2),
      ],
      skillCheck: [ask('clm-reduced-mass', 2), ask('clm-molecule-tree', 2), ask('clm-molecule-flow', 2)],
    },
    {
      id: 'clm-l9-damping',
      title: 'Damping and Resonance',
      slides: [
        teach(
          prose('Friction takes a little from every swing. With light damping the amplitude keeps the same fraction $r$ each cycle, so after $n$ cycles:'),
          display('A_{n} = A_{0}r^{n}'),
          prose('Starting at $40\\text{ cm}$ and keeping $0.8$ each cycle, after two cycles:'),
          stacked('A_{2} = 40 \\times 0.8^{2} = 25.6\\text{ cm}'),
          prose('The energy goes as the amplitude squared, $E = \\tfrac{1}{2}kA^{2}$. On a spring of $200\\text{ N m}^{-1}$, $0.5\\text{ m}$ holds $25\\text{ J}$; one cycle later, at $0.4\\text{ m}$, it holds $16\\text{ J}$.'),
        ),
        ask('clm-damp-decay'),
        ask('clm-damp-table'),
        ask('clm-damp-decay+choice', 2),
        ask('clm-damp-table', 2),
        teach(
          prose('Shake a lightly damped spring at $\\omega$ and it swings hardest when $\\omega$ matches its own natural frequency. That is **resonance**:'),
          display('\\omega = \\omega_{0} = \\sqrt{\\frac{k}{m}}'),
          prose('A spring of $50\\text{ N m}^{-1}$ shaken at $5\\text{ rad s}^{-1}$ resonates with a mass of:'),
          stacked('m = \\frac{50}{5^{2}} = 2\\text{ kg}'),
          prose('With $0.5\\text{ kg}$ on it instead, $\\omega_{0} = 10$, so the driver at $5$ is below resonance.'),
        ),
        ask('clm-resonance-slider'),
        ask('clm-resonance-flow'),
        ask('clm-resonance-slider', 2),
        ask('clm-resonance-flow', 2),
      ],
      skillCheck: [ask('clm-damp-decay', 2), ask('clm-damp-table', 2), ask('clm-resonance-flow', 2)],
    },
    {
      id: 'clm-l9-coupled',
      title: 'Coupled Oscillators',
      slides: [
        teach(
          prose('Two equal masses $m$, each tied to a wall by a spring $k$ and to each other by a middle spring $\\kappa$, have two **normal modes**. Moving in step, the middle spring keeps its length. Moving opposite ways, it stretches twice as far as each wall spring:'),
          display('\\omega_{1} = \\sqrt{\\frac{k}{m}} \\qquad \\omega_{2} = \\sqrt{\\frac{k + 2\\kappa}{m}}'),
          prose('With $m = 1$, $k = 16$ and $\\kappa = 4.5$:'),
          stacked('\\omega_{1} = \\sqrt{16} = 4', '\\omega_{2} = \\sqrt{16 + 9} = 5'),
          prose('Backwards, the middle spring for a wanted $\\omega_{2} = 5$:'),
          stacked('\\kappa = \\frac{m\\omega_{2}^{2} - k}{2}', '\\kappa = \\frac{5^{2} - 16}{2} = 4.5'),
        ),
        ask('clm-couple-modes'),
        ask('clm-couple-modes+choice', 2),
        ask('clm-couple-table'),
        ask('clm-couple-table', 2),
        teach(
          prose('Started in one mode, the pair stays in it: pulled the same way they swing at $\\omega_{1}$, pulled apart at $\\omega_{2}$.'),
          prose('Pull only one mass and both modes mix. The swinging passes from one mass to the other and back, a **beat** at the difference, here $1\\text{ rad s}^{-1}$:'),
          stacked('\\Delta\\omega = \\omega_{2} - \\omega_{1} = 5 - 4 = 1'),
        ),
        ask('clm-couple-tree'),
        ask('clm-couple-flow'),
        ask('clm-couple-tree', 2),
        ask('clm-couple-flow', 2),
      ],
      skillCheck: [ask('clm-couple-modes', 2), ask('clm-couple-tree', 2), ask('clm-couple-flow', 2)],
    },
    {
      id: 'clm-l9-waves',
      title: 'Waves on a String',
      slides: [
        teach(
          prose('A wave runs along a stretched string at a speed set by the tension $T$ and the mass per metre $\\mu$:'),
          display('v = \\sqrt{\\frac{T}{\\mu}} \\qquad v = f\\lambda'),
          prose('A string of $0.01\\text{ kg m}^{-1}$ at $400\\text{ N}$:'),
          stacked('v = \\sqrt{\\frac{400}{0.01}} = 200\\text{ m s}^{-1}'),
          prose('Backwards, $T = \\mu v^{2}$. Shaken at $50\\text{ Hz}$, the wavelength is $4\\text{ m}$:'),
          stacked('\\lambda = \\frac{v}{f} = \\frac{200}{50} = 4'),
          prose('Any one of $f$, $\\lambda$ and $v$ follows from the other two.'),
        ),
        ask('clm-wave-speed'),
        ask('clm-wave-table'),
        ask('clm-wave-speed+choice', 2),
        ask('clm-wave-table', 2),
        teach(
          prose('Weigh a piece to find $\\mu$. A $2\\text{ m}$ length weighing $0.02\\text{ kg}$:'),
          stacked('\\mu = \\frac{0.02}{2} = 0.01\\text{ kg m}^{-1}'),
          prose('The speed goes as the square root of the tension, so four times the tension doubles it, to $400\\text{ m s}^{-1}$:'),
          stacked('\\sqrt{4} = 2', 'v = 2 \\times 200 = 400'),
          prose('At the same frequency the wavelength doubles too, to $8\\text{ m}$.'),
        ),
        ask('clm-wave-tree'),
        ask('clm-wave-flow'),
        ask('clm-wave-tree', 2),
        ask('clm-wave-flow', 2),
      ],
      skillCheck: [ask('clm-wave-speed', 2), ask('clm-wave-table', 2), ask('clm-wave-tree', 2)],
    },
    {
      id: 'clm-l9-standing',
      title: 'Standing Waves',
      slides: [
        teach(
          prose('A string fixed at both ends vibrates in whole loops, and each loop is half a wavelength. With $n$ loops on a length $L$:'),
          display('\\lambda_{n} = \\frac{2L}{n} \\qquad f_{n} = \\frac{nv}{2L}'),
          prose('A string $0.6\\text{ m}$ long carrying waves at $240\\text{ m s}^{-1}$:'),
          stacked('\\lambda_{1} = 1.2', 'f_{1} = \\frac{240}{1.2} = 200', '\\lambda_{3} = \\frac{1.2}{3} = 0.4', 'f_{3} = 3 \\times 200 = 600'),
          prose('So the first harmonic is $200\\text{ Hz}$ and the third $600\\text{ Hz}$.'),
        ),
        ask('clm-standing-slider'),
        ask('clm-standing-freq'),
        ask('clm-standing-slider', 2),
        ask('clm-standing-freq+choice', 2),
        teach(
          prose('From the string itself: find the speed first, then the first harmonic, then any other as a whole number of times it.'),
          prose('A string $0.5\\text{ m}$ long, of $0.01\\text{ kg m}^{-1}$, at $400\\text{ N}$:'),
          stacked('v = \\sqrt{\\frac{400}{0.01}} = 200', 'f_{1} = \\frac{200}{2 \\times 0.5} = 200', 'f_{3} = 3 \\times 200 = 600'),
        ),
        ask('clm-standing-tree'),
        ask('clm-standing-table'),
        ask('clm-standing-tree', 2),
        ask('clm-standing-table', 2),
      ],
      skillCheck: [ask('clm-standing-freq', 2), ask('clm-standing-tree', 2), ask('clm-standing-table', 2)],
    },
  ],
  levelCheck: [
    ask('clm-reduced-mass', 2),
    ask('clm-molecule-tree', 2),
    ask('clm-molecule-flow', 2),
    ask('clm-damp-decay', 2),
    ask('clm-resonance-flow', 2),
    ask('clm-couple-modes', 2),
    ask('clm-couple-tree', 2),
    ask('clm-couple-flow', 2),
    ask('clm-wave-speed', 2),
    ask('clm-wave-flow', 2),
    ask('clm-standing-freq', 2),
    ask('clm-standing-table', 2),
  ],
};
