/**
 * Classical Mechanics, level 4: Energy.
 *
 * The outline's Exploring Energy, Work-Energy Theorem, Conservation of
 * Energy, Power, Elastic Energy, Potential Energy and Drone Battery Problem.
 * Work, kinetic and gravitational energy and P = Fv are Forces and Newton's
 * Laws, Work, Energy and Power, so this level goes on from them: springs and
 * elastic energy (OpenStax University Physics 7.1, 8.1), energy carried
 * between springs, heights and speeds (8.3), loops and vertical circles (8.3
 * with 6.3), potential energy diagrams (8.4), and efficiency and batteries
 * (7.4; College Physics 7.6).
 */
import type { Level } from '../../types';
import { classicalEnergyInternals } from '../../generators/classicalEnergy';
import { ask, diagram, display, prose, stacked, teach } from './blocks';

/** The worked example's landscape: U in joules at x = 0 to 8 metres, total energy 7 J. */
const EXAMPLE = { U: [12, 9, 5, 2, 4, 1, 3, 11, 12], E: 7 };
const exampleSvg = classicalEnergyInternals.landscapeSvg(EXAMPLE, 'A potential energy curve dipping below a dashed total energy line at 7 joules between x = 1.5 and x = 6.5');

export const level4: Level = {
  id: 'clm-l4',
  title: 'Energy',
  lessons: [
    {
      id: 'clm-l4-elastic',
      title: 'Elastic Energy',
      slides: [
        teach(
          prose('A spring pulls back harder the further it is stretched. **Hooke’s law**: for a stiffness $k$ in $\\text{N m}^{-1}$ and a stretch $x$ in metres,'),
          display('F = kx'),
          prose('A spring with $k = 200$ stretched by $15\\text{ cm}$, which is $0.15\\text{ m}$:'),
          stacked('F = 200 \\times 0.15 = 30\\text{ N}'),
          prose('Backwards, $45\\text{ N}$ stretches it $x = 45 \\div 200 = 0.225\\text{ m}$, or $22.5\\text{ cm}$.'),
        ),
        ask('clm-hooke'),
        ask('clm-hooke+choice', 2),
        teach(
          prose('Stretching it takes work, stored as **elastic energy**. The force grows steadily from nothing to $kx$, so the work is the average force times the stretch:'),
          display('E = \\tfrac{1}{2}kx^{2} = \\tfrac{1}{2}Fx'),
          prose('The same spring at $0.15\\text{ m}$:'),
          stacked('E = \\tfrac{1}{2} \\times 200 \\times 0.15^{2} = 2.25\\text{ J}'),
          prose('Or from the force it takes, $E = \\tfrac{1}{2} \\times 30 \\times 0.15 = 2.25\\text{ J}$ again.'),
        ),
        ask('clm-spring-energy'),
        ask('clm-spring-table'),
        ask('clm-spring-energy+choice', 2),
        teach(
          prose('Backwards, the stretch that stores an energy comes from'),
          display('x^{2} = \\frac{2E}{k}'),
          prose('To store $4\\text{ J}$ with $k = 200$:'),
          stacked('x^{2} = \\frac{8}{200} = 0.04', 'x = 0.2\\text{ m}'),
          prose('And the stiffness from a force and its stretch is $k = \\frac{F}{x}$: $30\\text{ N}$ at $0.15\\text{ m}$ gives $200\\text{ N m}^{-1}$.'),
        ),
        ask('clm-spring-slider'),
        ask('clm-spring-table', 2),
        ask('clm-spring-slider', 2),
      ],
      skillCheck: [ask('clm-hooke', 2), ask('clm-spring-energy', 2), ask('clm-spring-table', 2)],
    },
    {
      id: 'clm-l4-heights',
      title: 'Springs and Heights',
      slides: [
        teach(
          prose('On a smooth path nothing takes energy away, so kinetic and potential energy only trade. Running down a drop $h$, the mass cancels:'),
          display('\\tfrac{1}{2}v^{2} = \\tfrac{1}{2}u^{2} + gh'),
          prose('From rest down $10\\text{ m}$:'),
          stacked('v^{2} = 2 \\times 9.8 \\times 10 = 196', 'v = 14\\text{ m s}^{-1}'),
          prose('Already moving at $21\\text{ m s}^{-1}$ and dropping $40\\text{ m}$:'),
          stacked('v^{2} = 21^{2} + 2 \\times 9.8 \\times 40 = 1225', 'v = 35\\text{ m s}^{-1}'),
        ),
        ask('clm-ramp-speed'),
        ask('clm-track-table'),
        ask('clm-ramp-speed+choice', 2),
        teach(
          prose('A squashed spring hands its energy on in the same way:'),
          display('\\tfrac{1}{2}kx^{2} = \\tfrac{1}{2}mv^{2} = mgh'),
          prose('A spring with $k = 1000$ squashed by $0.14\\text{ m}$ fires a $0.1\\text{ kg}$ ball straight up:'),
          stacked('E = \\tfrac{1}{2} \\times 1000 \\times 0.14^{2} = 9.8', 'v^{2} = \\frac{2 \\times 9.8}{0.1} = 196', 'v = 14', 'h = \\frac{9.8}{0.1 \\times 9.8} = 10\\text{ m}'),
        ),
        ask('clm-launch-tree'),
        ask('clm-track-table', 2),
        ask('clm-launch-tree', 2),
        teach(
          prose('And the other way: a $2\\text{ kg}$ trolley let go $10\\text{ m}$ up a smooth ramp runs into a buffer spring with $k = 9800$ at the foot.'),
          stacked('E = 2 \\times 9.8 \\times 10 = 196', 'v^{2} = \\frac{2 \\times 196}{2} = 196', 'v = 14', 'x^{2} = \\frac{2 \\times 196}{9800} = 0.04', 'x = 0.2\\text{ m}'),
        ),
        ask('clm-bumper-flow'),
        ask('clm-bumper-flow', 2),
      ],
      skillCheck: [ask('clm-ramp-speed', 2), ask('clm-launch-tree', 2), ask('clm-bumper-flow', 2)],
    },
    {
      id: 'clm-l4-loops',
      title: 'Loops and Vertical Circles',
      slides: [
        teach(
          prose('At the top of a loop of radius $r$, both the weight and the track’s push point down, towards the centre, and together they turn the car (Motion in Two Dimensions, Centripetal Acceleration):'),
          display('R + mg = \\frac{mv^{2}}{r}'),
          prose('Slower, the push is less. At the least speed it is zero and the weight alone does it, so $v^{2} = gr$. For $r = 20\\text{ m}$:'),
          stacked('v^{2} = 9.8 \\times 20 = 196', 'v = 14\\text{ m s}^{-1}'),
          prose('Starting from rest on a smooth track, it needs that speed $2r$ up, so it must start at least $2r + \\frac{r}{2} = 2.5r$ high: $50\\text{ m}$ for this loop.'),
        ),
        ask('clm-loop-top'),
        ask('clm-loop-top+choice', 2),
        teach(
          prose('Let go at $h$ above the bottom, it has $v^{2} = 2gh$ at the bottom and, $2r$ higher, $v^{2} = 2g(h - 2r)$ at the top. It gets round if that is at least $gr$.'),
          prose('A loop with $r = 4\\text{ m}$, from $12\\text{ m}$:'),
          stacked('v_{\\text{top}}^{2} = 19.6 \\times (12 - 8) = 78.4', 'gr = 9.8 \\times 4 = 39.2'),
          prose('So it gets round, and a $2\\text{ kg}$ car is pushed at the top by'),
          stacked('R = 2 \\times \\frac{78.4}{4} - 2 \\times 9.8 = 19.6\\text{ N}'),
        ),
        ask('clm-loop-flow'),
        ask('clm-loop-tree'),
        ask('clm-loop-flow', 2),
        teach(
          prose('A ball whirled on a string in a vertical circle works the same way, with tension in place of the push. At the bottom the string pulls up against the weight; at the top it pulls down with it:'),
          display('T_{\\text{bottom}} - mg = \\frac{mv^{2}}{r} \\qquad T_{\\text{top}} + mg = \\frac{mv^{2}}{r}'),
          prose('A $0.5\\text{ kg}$ ball on $1\\text{ m}$ of string, at $6\\text{ m s}^{-1}$ at the bottom and $4\\text{ m s}^{-1}$ at the top:'),
          stacked('T_{\\text{bottom}} = 0.5 \\times 36 + 4.9 = 22.9\\text{ N}', 'T_{\\text{top}} = 0.5 \\times 16 - 4.9 = 3.1\\text{ N}'),
        ),
        ask('clm-whirl-tension'),
        ask('clm-loop-tree', 2),
        ask('clm-whirl-tension+choice', 2),
      ],
      skillCheck: [ask('clm-loop-top', 2), ask('clm-loop-tree', 2), ask('clm-whirl-tension', 2)],
    },
    {
      id: 'clm-l4-diagrams',
      title: 'Potential Energy Diagrams',
      slides: [
        teach(
          prose('A graph of potential energy $U$ against position $x$ shows where a particle can go. Its total energy $E$ stays the same, drawn as a flat dashed line, and what is left over is kinetic:'),
          display('K = E - U'),
          diagram(exampleSvg),
          prose('Here $E = 7\\text{ J}$. At $x = 3$ the curve reads $U = 2$, so $K = 7 - 2 = 5\\text{ J}$.'),
          prose('$K$ cannot be negative, so where the curve rises to meet the dashed line the particle stops and turns back: here at $x = 1.5$ and $x = 6.5$. It is trapped in the valley between.'),
        ),
        ask('clm-pe-speed'),
        ask('clm-pe-turning'),
        ask('clm-pe-fastest'),
        teach(
          prose('It moves fastest where $K$ is largest, which is where $U$ is lowest: in the example at $x = 5$, with $K = 7 - 1 = 6\\text{ J}$.'),
          prose('For the speed, $K = \\tfrac{1}{2}mv^{2}$. A $0.75\\text{ kg}$ particle with $K = 6\\text{ J}$:'),
          stacked('v^{2} = \\frac{2 \\times 6}{0.75} = 16', 'v = 4\\text{ m s}^{-1}'),
        ),
        ask('clm-pe-speed', 2),
        ask('clm-pe-fastest+choice'),
        ask('clm-pe-turning', 2),
        teach(
          prose('The force pushes the particle downhill on the graph, as a ball rolls downhill. It is minus the slope:'),
          display('F = -\\frac{dU}{dx}'),
          prose('In the example, from $x = 2$ to $x = 3$ the curve falls from $5$ to $2$, a slope of $-3\\text{ J m}^{-1}$. So there $F = 3\\text{ N}$, pushing towards larger $x$. Where the curve rises, the force is negative.'),
        ),
        ask('clm-pe-force'),
        ask('clm-pe-force', 2),
      ],
      skillCheck: [ask('clm-pe-speed', 2), ask('clm-pe-turning', 2), ask('clm-pe-force', 2)],
    },
    {
      id: 'clm-l4-power',
      title: 'Efficiency and Batteries',
      slides: [
        teach(
          prose('Power is energy per second, in watts. A crane raising $50\\text{ kg}$ by $12\\text{ m}$ in $20\\text{ s}$:'),
          stacked('E = 50 \\times 9.8 \\times 12 = 5880\\text{ J}', 'P = \\frac{5880}{20} = 294\\text{ W}'),
        ),
        ask('clm-lift-power'),
        ask('clm-lift-power+choice', 2),
        teach(
          prose('No machine turns all its energy into useful work; the rest goes as heat and sound. **Efficiency** is the useful part:'),
          display('\\text{efficiency} = \\frac{E_{\\text{out}}}{E_{\\text{in}}} \\times 100\\%'),
          prose('$2000\\text{ J}$ in at $70\\%$ gives $0.7 \\times 2000 = 1400\\text{ J}$ out. Backwards, $490\\text{ J}$ out at $49\\%$ needed $490 \\div 0.49 = 1000\\text{ J}$ in.'),
          prose('A $70\\%$ efficient motor drawing $500\\text{ W}$ lifts $25\\text{ kg}$ by $10\\text{ m}$:'),
          stacked('E_{\\text{out}} = 25 \\times 9.8 \\times 10 = 2450', 'E_{\\text{in}} = 2450 \\div 0.7 = 3500', 't = \\frac{3500}{500} = 7\\text{ s}'),
        ),
        ask('clm-efficiency-table'),
        ask('clm-efficiency-table', 2),
        ask('clm-motor-tree'),
        teach(
          prose('Batteries are rated in watt hours: $1\\text{ Wh}$ is one watt for an hour, $3600\\text{ J}$. A drone with a $50\\text{ Wh}$ battery drawing $200\\text{ W}$ while it hovers:'),
          stacked('E = 50 \\times 3600 = 180\\,000\\text{ J}', 't = \\frac{180\\,000}{200} = 900\\text{ s}', '900 \\div 60 = 15\\text{ minutes}'),
        ),
        ask('clm-drone-flow'),
        ask('clm-motor-tree', 2),
        ask('clm-drone-flow', 2),
      ],
      skillCheck: [ask('clm-lift-power', 2), ask('clm-efficiency-table', 2), ask('clm-drone-flow', 2)],
    },
  ],
  levelCheck: [
    ask('clm-hooke', 2),
    ask('clm-spring-energy', 2),
    ask('clm-spring-table', 2),
    ask('clm-ramp-speed', 2),
    ask('clm-launch-tree', 2),
    ask('clm-bumper-flow', 2),
    ask('clm-loop-top', 2),
    ask('clm-loop-flow', 2),
    ask('clm-whirl-tension', 2),
    ask('clm-pe-speed', 2),
    ask('clm-efficiency-table', 2),
    ask('clm-motor-tree', 2),
  ],
};
