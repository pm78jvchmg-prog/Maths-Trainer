/**
 * Classical Mechanics, level 10: General Considerations.
 *
 * The outline's Natural Units and Lagrangian Mechanics, led in by
 * dimensional analysis (OpenStax University Physics 1.4): the dimensions of a
 * quantity, formulas found and scaled from dimensions alone, natural units
 * built from a problem's own constants (Tong), the Lagrangian L = T - V, and
 * the Euler-Lagrange equation, which gives back Newton's second law (Tong,
 * ch. 2).
 */
import type { Level } from '../../types';
import { ask, display, prose, stacked, teach } from './blocks';

export const level10: Level = {
  id: 'clm-l10',
  title: 'General Considerations',
  lessons: [
    {
      id: 'clm-l10-dims',
      title: 'Dimensions',
      slides: [
        teach(
          prose('Every quantity in mechanics is built from mass, length and time, $\\mathsf{M}$, $\\mathsf{L}$ and $\\mathsf{T}$. Its **dimensions** $[x]$ follow from its definition. Speed is distance over time, acceleration is speed over time, force is mass times acceleration, and energy is force times distance:'),
          display('[v] = \\mathsf{L}\\,\\mathsf{T}^{-1} \\qquad [a] = \\mathsf{L}\\,\\mathsf{T}^{-2}'),
          display('[F] = \\mathsf{M}\\,\\mathsf{L}\\,\\mathsf{T}^{-2} \\qquad [E] = \\mathsf{M}\\,\\mathsf{L}^{2}\\,\\mathsf{T}^{-2}'),
          prose('Multiplying adds the powers and dividing takes them away. The power of $\\mathsf{T}$ in $\\frac{E}{v^{2}}$:'),
          stacked('-2 - 2 \\times (-1) = 0'),
        ),
        ask('clm-dim-power'),
        ask('clm-dim-table'),
        ask('clm-dim-power+choice', 2),
        ask('clm-dim-table', 2),
        teach(
          prose('Work through a combination one base at a time. A momentum $p = mv$ times a speed:'),
          stacked('[pv] = \\mathsf{M}\\,\\mathsf{L}\\,\\mathsf{T}^{-1} \\times \\mathsf{L}\\,\\mathsf{T}^{-1}', '[pv] = \\mathsf{M}\\,\\mathsf{L}^{2}\\,\\mathsf{T}^{-2}'),
          prose('That is an energy. SI units follow the dimensions, with kilograms for $\\mathsf{M}$, metres for $\\mathsf{L}$ and seconds for $\\mathsf{T}$, so its unit is $\\text{kg m}^{2}\\text{ s}^{-2}$, the joule.'),
        ),
        ask('clm-dim-flow'),
        ask('clm-dim-si-slider'),
        ask('clm-dim-flow', 2),
        ask('clm-dim-si-slider', 2),
      ],
      skillCheck: [ask('clm-dim-power', 2), ask('clm-dim-table', 2), ask('clm-dim-flow', 2)],
    },
    {
      id: 'clm-l10-formulas',
      title: 'Formulas from Dimensions',
      slides: [
        teach(
          prose('Both sides of a formula must have the same dimensions, which can find a formula on its own. Suppose a pendulum’s period $T$ depends on its mass, length and $g$ as $m^{a}\\ell^{b}g^{c}$. Match each base:'),
          stacked('\\mathsf{M}\\colon \\ a = 0', '\\mathsf{T}\\colon \\ {-2c} = 1 \\qquad c = -\\tfrac{1}{2}', '\\mathsf{L}\\colon \\ b + c = 0 \\qquad b = \\tfrac{1}{2}'),
          prose('So $T \\propto \\sqrt{\\ell / g}$, and the mass does not matter. Halves are written $0.5$ in answers.'),
        ),
        ask('clm-rayleigh-tree'),
        ask('clm-rayleigh-slider'),
        ask('clm-rayleigh-tree', 2),
        ask('clm-rayleigh-slider', 2),
        teach(
          prose('With two quantities, find each power from a base the other lacks, then check the last base. Can $m^{a}v^{b}$ be an energy, $\\mathsf{M}\\,\\mathsf{L}^{2}\\,\\mathsf{T}^{-2}$?'),
          stacked('\\mathsf{M}\\colon \\ a = 1', '\\mathsf{T}\\colon \\ {-b} = -2 \\qquad b = 2', '\\mathsf{L}\\colon \\ b = 2'),
          prose('The last base matches, so it can. A formula also says how things scale: with $T \\propto \\ell^{0.5}$, four times the length gives $4^{0.5} = 2$ times the period.'),
        ),
        ask('clm-rayleigh-flow'),
        ask('clm-dim-scale'),
        ask('clm-rayleigh-flow', 2),
        ask('clm-dim-scale+choice', 2),
      ],
      skillCheck: [ask('clm-rayleigh-tree', 2), ask('clm-rayleigh-flow', 2), ask('clm-dim-scale', 2)],
    },
    {
      id: 'clm-l10-natural',
      title: 'Natural Units',
      slides: [
        teach(
          prose('**Natural units** are chosen so that a problem’s own constants are $1$. For a mass on a spring, take the mass as the unit of mass and $\\tau = \\sqrt{m/k}$ as the unit of time; then $m\\ddot{x} = -kx$ becomes $\\ddot{x} = -x$.'),
          prose('Take $2\\text{ kg}$ on $50\\text{ N m}^{-1}$, with times in seconds:'),
          stacked('\\tau = \\sqrt{\\frac{2}{50}} = 0.2', '\\frac{3}{0.2} = 15'),
          prose('So $\\tau$ is $0.2\\text{ s}$, and $3\\text{ s}$ is $15$ of them. Any quantity’s unit is built from its dimensions: with units of $2\\text{ kg}$, $0.5\\text{ m}$ and $0.5\\text{ s}$, force, $\\mathsf{M}\\,\\mathsf{L}\\,\\mathsf{T}^{-2}$, has the unit:'),
          stacked('2 \\times 0.5 \\times 0.5^{-2} = 4'),
          prose('That is $4\\text{ N}$, so $12\\text{ N}$ is $3$ in natural units.'),
        ),
        ask('clm-natural-time'),
        ask('clm-natural-time+choice', 2),
        ask('clm-natural-table'),
        ask('clm-natural-table', 2),
        teach(
          prose('For a pendulum, set a length $\\ell$ and $g$ to $1$. The unit of time is $\\tau = \\sqrt{\\ell/g}$ and the unit of speed is $u = \\ell/\\tau$. With a length of $2.5\\text{ m}$ as the unit, rounding each to 3 significant figures and carrying the unrounded $\\tau$ into $u$:'),
          stacked('\\tau = \\sqrt{\\frac{2.5}{9.8}} = 0.5050\\ldots', '\\tau = 0.505\\text{ s}', 'u = \\frac{2.5}{0.5050\\ldots} = 4.9497\\ldots', 'u = 4.95\\text{ m s}^{-1}'),
          prose('For a spring with a length $\\ell$ as the unit, energy’s unit is $\\frac{m\\ell^{2}}{\\tau^{2}} = k\\ell^{2}$: $50\\text{ N m}^{-1}$ and $0.2\\text{ m}$ give $2\\text{ J}$.'),
        ),
        ask('clm-natural-tree'),
        ask('clm-natural-flow'),
        ask('clm-natural-tree', 2),
        ask('clm-natural-flow', 2),
      ],
      skillCheck: [ask('clm-natural-time', 2), ask('clm-natural-table', 2), ask('clm-natural-tree', 2)],
    },
    {
      id: 'clm-l10-lagrangian',
      title: 'The Lagrangian',
      slides: [
        teach(
          prose('The **Lagrangian** of a body is its kinetic energy take away its potential energy, with $\\dot{x}$ its speed:'),
          display('L = T - V \\qquad T = \\tfrac{1}{2}m\\dot{x}^{2}'),
          prose('On a spring $V = \\tfrac{1}{2}kx^{2}$. Take a $2\\text{ kg}$ mass on $100\\text{ N m}^{-1}$, $0.2\\text{ m}$ out and moving at $3\\text{ m s}^{-1}$, with energies in joules:'),
          stacked('T = \\tfrac{1}{2} \\times 2 \\times 3^{2} = 9', 'V = \\tfrac{1}{2} \\times 100 \\times 0.2^{2} = 2', 'L = 9 - 2 = 7'),
          prose('Under gravity $V = mgx$, with $x$ the height. A $1\\text{ kg}$ ball $2\\text{ m}$ up at $7\\text{ m s}^{-1}$ has $T = 24.5$ and $V = 19.6$, so its Lagrangian is $4.9\\text{ J}$.'),
        ),
        ask('clm-lag-value'),
        ask('clm-lag-tree'),
        ask('clm-lag-value+choice', 2),
        ask('clm-lag-tree', 2),
        teach(
          prose('Unlike the energy, $L$ changes as the body moves, and it can be negative. At a turning point $T = 0$, so $L = -V$: the spring above, stopped at $0.3\\text{ m}$, has $L = -4.5\\text{ J}$.'),
          prose('It takes its sign from the potential term. Written with $x$ and $\\dot{x}$, a spring gives $L = \\tfrac{1}{2}m\\dot{x}^{2} - \\tfrac{1}{2}kx^{2}$ and a thrown ball $L = \\tfrac{1}{2}m\\dot{x}^{2} - mgx$.'),
        ),
        ask('clm-lag-table'),
        ask('clm-lag-flow'),
        ask('clm-lag-table', 2),
        ask('clm-lag-flow', 2),
      ],
      skillCheck: [ask('clm-lag-value', 2), ask('clm-lag-tree', 2), ask('clm-lag-flow', 2)],
    },
    {
      id: 'clm-l10-euler',
      title: 'Euler-Lagrange Equations',
      slides: [
        teach(
          prose('The motion follows from $L$ alone, through the **Euler-Lagrange equation**:'),
          display('\\frac{d}{dt}\\frac{\\partial L}{\\partial \\dot{x}} = \\frac{\\partial L}{\\partial x}'),
          prose('With $T = \\tfrac{1}{2}m\\dot{x}^{2}$, the left side is the rate of change of the momentum $m\\dot{x}$ and the right side is the force, so this is Newton’s second law. At $x = 0.5$, a mass of $2$ on a spring of $8$ gives:'),
          stacked('L = \\tfrac{1}{2}(2)\\dot{x}^{2} - \\tfrac{1}{2}(8)x^{2}', '\\frac{\\partial L}{\\partial x} = -8x = -4', '2\\ddot{x} = -4 \\qquad \\ddot{x} = -2'),
          prose('A steady push adds a term such as $+6x$ to $L$ and $6$ to the force, giving $\\ddot{x} = 1$.'),
        ),
        ask('clm-el-accel'),
        ask('clm-el-tree'),
        ask('clm-el-accel+choice', 2),
        ask('clm-el-tree', 2),
        teach(
          prose('The equation for a spring, $2\\ddot{x} = -8x$, is the simple harmonic motion of Springs, Simple Harmonic Motion:'),
          stacked('\\ddot{x} = -4x \\qquad \\omega = \\sqrt{4} = 2'),
          prose('At each $x$ in turn, $\\frac{\\partial L}{\\partial x}$ gives the force and dividing by $m$ gives $\\ddot{x}$: at $x = -1$, the force is $8$ and $\\ddot{x} = 4$.'),
        ),
        ask('clm-el-table'),
        ask('clm-el-flow'),
        ask('clm-el-table', 2),
        ask('clm-el-flow', 2),
      ],
      skillCheck: [ask('clm-el-accel', 2), ask('clm-el-tree', 2), ask('clm-el-flow', 2)],
    },
  ],
  levelCheck: [
    ask('clm-dim-power', 2),
    ask('clm-dim-table', 2),
    ask('clm-dim-flow', 2),
    ask('clm-rayleigh-tree', 2),
    ask('clm-rayleigh-flow', 2),
    ask('clm-dim-scale', 2),
    ask('clm-natural-time', 2),
    ask('clm-natural-tree', 2),
    ask('clm-lag-value', 2),
    ask('clm-lag-flow', 2),
    ask('clm-el-accel', 2),
    ask('clm-el-flow', 2),
  ],
};
