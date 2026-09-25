/**
 * Classical Mechanics, level 7: Statics.
 *
 * The outline's Tower of Cards, Irregular Towers, Static Equilibrium, Rope
 * Statics and Body Statics. Moments on rods, planks and ladders are Forces
 * and Newton's Laws, so this level goes on from them: centres of mass
 * (OpenStax University Physics 9.6), stacking blocks over an edge (Paterson
 * and Zwick), sliding or tipping, a load on a rope, and the forearm and foot
 * as levers (12.2).
 */
import type { Level } from '../../types';
import { ask, display, prose, stacked, teach } from './blocks';

export const level7: Level = {
  id: 'clm-l7',
  title: 'Statics',
  lessons: [
    {
      id: 'clm-l7-com',
      title: 'Centre of Mass',
      slides: [
        teach(
          prose('A body balances on one point, its **centre of mass**. For masses along a line it is the average position, each weighted by its mass:'),
          display('\\bar{x} = \\frac{\\Sigma mx}{\\Sigma m}'),
          prose('A light rod $4\\text{ m}$ long with $3\\text{ kg}$ at end A and $1\\text{ kg}$ at the other end, measuring from A:'),
          stacked('\\bar{x} = \\frac{3 \\times 0 + 1 \\times 4}{3 + 1} = 1\\text{ m}'),
          prose('With $2\\text{ kg}$ at $0$, $3\\text{ kg}$ at $2\\text{ m}$ and $5\\text{ kg}$ at $6\\text{ m}$, add up $mx$ first:'),
          stacked('\\Sigma mx = 0 + 6 + 30 = 36', '\\bar{x} = \\frac{36}{10} = 3.6\\text{ m}'),
        ),
        ask('clm-com-rod'),
        ask('clm-com-rod+choice', 2),
        ask('clm-com-table'),
        ask('clm-com-slider'),
        teach(
          prose('In a plane, do the same for each coordinate. $1\\text{ kg}$ at $(0, 0)$, $2\\text{ kg}$ at $(3, 0)$ and $1\\text{ kg}$ at $(0, 4)$:'),
          stacked('M = 1 + 2 + 1 = 4', '\\bar{x} = \\frac{2 \\times 3}{4} = 1.5', '\\bar{y} = \\frac{1 \\times 4}{4} = 1'),
        ),
        ask('clm-com-2d-tree'),
        ask('clm-com-table', 2),
        ask('clm-com-slider', 2),
        ask('clm-com-2d-tree', 2),
      ],
      skillCheck: [ask('clm-com-rod', 2), ask('clm-com-table', 2), ask('clm-com-2d-tree', 2)],
    },
    {
      id: 'clm-l7-stack',
      title: 'Stacking Blocks',
      slides: [
        teach(
          prose('A block stays up while its centre of mass is over what holds it. In a stack, every block’s centre, and the centre of every block above it taken together, must sit over the block below.'),
          prose('Two identical blocks of length $L$ reach farthest when the top one overhangs by $\\frac{L}{2}$ and the pair by $\\frac{L}{4}$. With $n$ blocks the bottom one overhangs by $\\frac{L}{2n}$, so the reach is:'),
          display('d = \\frac{L}{2}\\left(1 + \\tfrac{1}{2} + \\tfrac{1}{3} + \\dots + \\tfrac{1}{n}\\right)'),
          prose('Blocks $24\\text{ cm}$ long: steps of $12$, $6$, $4$ and $3$, so reaches of $12$, $18$, $22$ and $25\\text{ cm}$.'),
        ),
        ask('clm-stack-table'),
        ask('clm-stack-slider'),
        ask('clm-stack-table', 2),
        ask('clm-stack-slider', 2),
        teach(
          prose('Unlike blocks: a $1\\text{ kg}$ block $20\\text{ cm}$ long on a $2\\text{ kg}$ block $30\\text{ cm}$ long. The top one overhangs the lower by half its length, $a = 10\\text{ cm}$, putting its centre over the lower block’s edge.'),
          prose('The lower block overhangs the table by $d$. Its centre is $15 - d$ inside the edge and the top block’s is $d$ beyond, so for the pair to balance on the edge:'),
          stacked('2(15 - d) = 1 \\times d', 'd = 10\\text{ cm}'),
          prose('The reach is $a + d = 20\\text{ cm}$.'),
        ),
        ask('clm-stack-tree'),
        ask('clm-stack-tree', 2),
        teach(
          prose('To check a stack, measure each centre from the edge below it. Two blocks $20\\text{ cm}$ long: the lower overhangs the table by $4$, the top overhangs the lower by $8$.'),
          prose('The top block’s centre is $10 - 8 = 2\\text{ cm}$ inside the lower block’s edge, so it stays on. From the table’s edge, beyond positive, the centres are at $4 - 10 = -6$ and $12 - 10 = 2$:'),
          stacked('\\bar{x} = \\frac{-6 + 2}{2} = -2'),
          prose('The pair’s centre is $2\\text{ cm}$ inside the table’s edge, so it stands.'),
        ),
        ask('clm-stack-flow'),
        ask('clm-stack-flow', 2),
      ],
      skillCheck: [ask('clm-stack-table', 2), ask('clm-stack-tree', 2), ask('clm-stack-flow', 2)],
    },
    {
      id: 'clm-l7-tip',
      title: 'Sliding or Toppling',
      slides: [
        teach(
          prose('Push a crate sideways and it either slides or tips over its front edge. It slides once the push beats the most friction, $\\mu W$.'),
          prose('It tips once the push’s moment about the front edge beats the weight’s. The weight acts half the base $b$ back from that edge, and the push at height $h$:'),
          display('Ph = W \\times \\frac{b}{2}'),
          prose('A $400\\text{ N}$ crate, base $60\\text{ cm}$, pushed at $100\\text{ cm}$, with $\\mu = 0.5$:'),
          stacked('P_{\\text{slide}} = 0.5 \\times 400 = 200\\text{ N}', 'M = 400 \\times 30 = 12\\,000\\text{ N cm}', 'P_{\\text{tip}} = \\frac{12\\,000}{100} = 120\\text{ N}'),
          prose('$120 < 200$, so as the push grows it tips first.'),
        ),
        ask('clm-tip-push'),
        ask('clm-tip-push+choice', 2),
        ask('clm-tip-tree'),
        ask('clm-slide-tip-flow'),
        teach(
          prose('It tips first when tipping needs the smaller push. The weight cancels, so it comes down to the height of the push:'),
          stacked('\\frac{Wb}{2h} < \\mu W', 'h > \\frac{b}{2\\mu}'),
          prose('With a $60\\text{ cm}$ base and $\\mu = 0.5$, a push above $\\frac{60}{2 \\times 0.5} = 60\\text{ cm}$ tips it; lower down it slides.'),
        ),
        ask('clm-tip-slider'),
        ask('clm-tip-tree', 2),
        ask('clm-slide-tip-flow', 2),
        ask('clm-tip-slider', 2),
      ],
      skillCheck: [ask('clm-tip-push', 2), ask('clm-tip-tree', 2), ask('clm-slide-tip-flow', 2)],
    },
    {
      id: 'clm-l7-rope',
      title: 'Rope Statics',
      slides: [
        teach(
          prose('A load hung from the middle of a rope pulls it into a V. Each half pulls along itself with the tension $T$, at an angle $\\theta$ below the horizontal. Only the upward parts hold the load:'),
          display('2T\\sin\\theta = W'),
          prose('Hooks $80\\text{ cm}$ apart and a sag of $30\\text{ cm}$: each half is the hypotenuse of a triangle with sides $40$ and $30$.'),
          stacked('l = \\sqrt{40^{2} + 30^{2}} = 50', '\\sin\\theta = \\frac{30}{50} = 0.6'),
          prose('For a $120\\text{ N}$ load:'),
          stacked('T = \\frac{120}{2 \\times 0.6} = 100\\text{ N}'),
        ),
        ask('clm-rope-tension'),
        ask('clm-rope-tension+choice', 2),
        ask('clm-rope-tree'),
        ask('clm-rope-tree', 2),
        teach(
          prose('A shallow sag makes $\\sin\\theta$ small and the tension large. A sag of $7$ on a half-span of $24$ gives $l = 25$ and $\\sin\\theta = 0.28$, so a $140\\text{ N}$ load pulls each half with $\\frac{140}{0.56} = 250\\text{ N}$.'),
          prose('Backwards, from a tension to the sag: $120\\text{ N}$ at $100\\text{ N}$ tension needs $\\sin\\theta = \\frac{120}{200} = 0.6$, a 3-4-5 triangle. On a half-span of $40$ the sag is $\\frac{3}{4} \\times 40 = 30\\text{ cm}$.'),
        ),
        ask('clm-rope-slider'),
        ask('clm-rope-flow'),
        ask('clm-rope-slider', 2),
        ask('clm-rope-flow', 2),
      ],
      skillCheck: [ask('clm-rope-tension', 2), ask('clm-rope-tree', 2), ask('clm-rope-flow', 2)],
    },
    {
      id: 'clm-l7-body',
      title: 'Body Statics',
      slides: [
        teach(
          prose('A forearm held level is a lever pivoting at the elbow. The biceps pulls up close to the joint, so it must pull far harder than the load. Take moments about the elbow, so the joint’s own force drops out.'),
          prose('$50\\text{ N}$ in the hand $32\\text{ cm}$ from the elbow, biceps $4\\text{ cm}$ from it:'),
          stacked('F \\times 4 = 50 \\times 32', 'F = 400\\text{ N}'),
          prose('Adding the forearm’s own $15\\text{ N}$ acting $16\\text{ cm}$ from the elbow:'),
          stacked('M = 1600 + 240 = 1840', 'F = \\frac{1840}{4} = 460\\text{ N}'),
          prose('Up and down balance too, so the upper arm pushes down on the forearm at the elbow with $460 - 50 - 15 = 395\\text{ N}$.'),
        ),
        ask('clm-biceps'),
        ask('clm-biceps+choice', 2),
        ask('clm-elbow-tree'),
        ask('clm-elbow-tree', 2),
        teach(
          prose('On tiptoe the foot pivots at the ankle: the floor pushes up on the ball of the foot in front, and the Achilles tendon pulls up at the heel behind.'),
          prose('A $600\\text{ N}$ person on one foot, ball $12\\text{ cm}$ in front of the ankle, tendon $5\\text{ cm}$ behind:'),
          stacked('T \\times 5 = 600 \\times 12', 'T = 1440\\text{ N}'),
          prose('On both feet each carries $300\\text{ N}$, so each tendon pulls $720\\text{ N}$.'),
        ),
        ask('clm-tiptoe'),
        ask('clm-tiptoe+choice', 2),
        teach(
          prose('Every one of these levers is $Fd = WL$, so any one of the four follows from the other three:'),
          stacked('F = \\frac{WL}{d} \\qquad W = \\frac{Fd}{L}', 'L = \\frac{Fd}{W} \\qquad d = \\frac{WL}{F}'),
        ),
        ask('clm-lever-table'),
        ask('clm-lever-table', 2),
      ],
      skillCheck: [ask('clm-biceps', 2), ask('clm-elbow-tree', 2), ask('clm-tiptoe', 2)],
    },
  ],
  levelCheck: [
    ask('clm-com-rod', 2),
    ask('clm-com-2d-tree', 2),
    ask('clm-stack-table', 2),
    ask('clm-stack-tree', 2),
    ask('clm-stack-flow', 2),
    ask('clm-tip-push', 2),
    ask('clm-slide-tip-flow', 2),
    ask('clm-rope-tension', 2),
    ask('clm-rope-flow', 2),
    ask('clm-biceps', 2),
    ask('clm-tiptoe', 2),
    ask('clm-lever-table', 2),
  ],
};
