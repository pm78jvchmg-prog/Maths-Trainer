# Classical Mechanics: level plan

Written for the owner's Classical Mechanics outline (10 syllabus screenshots in
the project files, `classical-mechanics/`: 10 levels, 48 lessons). The owner
asked for the lesson list to be followed but the examples, diagrams and
formula layout to come from recent open physics textbooks instead, so every
lesson below names the source its approach is modelled on. Problems, numbers
and wording are our own; nothing is copied.

Placement: the Mechanics band, `position: 30`, after Kinematics (10) and
Forces and Newton's Laws (20). This is a default the owner can move.

It does not re-teach what those two courses have. Kinematics has motion
graphs, the suvat equations, vertical motion and calculus in t; Forces has
resolving, equilibrium, F = ma, connected particles, moments, 1D momentum and
impulse, and work, energy and power. Where the outline overlaps them, a lesson
starts from their result and goes further, and says so in a teaching line
("Kinematics, Constant Acceleration").

## Sources

Main text: **OpenStax, _University Physics_ Volumes 1 to 3** (Ling, Sanny,
Moebs; CC BY 4.0), cited below as UP1, UP2, UP3 with section numbers. Others:
OpenStax _College Physics 2e_ (CP, CC BY 4.0); David Tong, _Lectures on
Classical Dynamics_ (Cambridge, free online); MIT OpenCourseWare 8.03
_Vibrations and Waves_ (CC BY-NC-SA); the UK Highway Code's typical stopping
distances (Open Government Licence); Nagel and Schreckenberg's traffic
automaton (J. Phys. I France 2, 1992); Paterson and Zwick, _Overhang_ (Amer.
Math. Monthly 116, 2009).

The build container's network blocks openstax.org and libretexts.org pages,
so sections were located by search and drawn from their published structure
and worked-example style rather than read in full at build time.

## Levels

Slide kinds are abbreviated: expr (typed), choice, table, tree, flow, slider,
forces (free-body diagram), tiles.

### Level 1: Describing Motion (`clm-l1`)
Outline: Formula One Racing, Cellular Automaton, Kinematics in the City.

| Lesson | Source | Leans on |
| --- | --- | --- |
| Speeds and Units | UP1 1.3 Unit conversion, 2.3 Average velocity | expr, table, slider |
| Average Speed over a Race | UP1 2.3; CP 2.3 | tree, table, expr, flow |
| Closing Speeds | UP1 4.5 Relative motion (1D part) | expr, slider, tree |
| Stopping Distances | UP1 2.5 (braking on dry and wet roads, reaction time); Highway Code | expr, tree, flow |
| Stepping Through Time | Nagel and Schreckenberg; UP1 2.5 | table, tree, expr |

### Level 2: Motion in Two Dimensions (`clm-l2`)
Outline: The Kinematic Equations, Angular Kinematics, Projectile Motion.
Kinematics has no projectiles, so this is new ground.

| Lesson | Source | Leans on |
| --- | --- | --- |
| Launched Horizontally | UP1 4.3 | tree, slider, expr |
| Launched at an Angle | UP1 4.3 (time of flight, range, greatest height) | tree, flow, expr |
| Angular Speed | UP1 10.1 Rotational variables | expr, table |
| Angular Acceleration | UP1 10.2 Constant angular acceleration | tree, expr |
| Centripetal Acceleration | UP1 4.4 Uniform circular motion | expr, slider, choice |

### Level 3: Forces in Fluids and on Curves (`clm-l3`)
Outline: What are Forces?, The Three Laws of Motion, Weight and Scales,
Pressure, Buoyancy, Drag Forces, Banked Curve Problem. The laws and apparent
weight in a lift are Forces' levels 1 and 2, so this level takes the forces
Forces never meets.

| Lesson | Source | Leans on |
| --- | --- | --- |
| Pressure and Area | UP1 14.1 | expr, table, flow, slider |
| Pressure in a Fluid | UP1 14.2 (p = p0 + rho g h), 14.3 | tree, slider |
| Buoyancy | UP1 14.4 Archimedes' principle | tree, flow, forces |
| Drag and Terminal Speed | UP1 6.4 | expr, slider |
| Round a Bend | UP1 6.3 Centripetal force (flat and banked curves) | tree, forces, flow |

### Level 4: Energy (`clm-l4`)
Outline: Exploring Energy, Work-Energy Theorem, Conservation of Energy, Power,
Elastic Energy, Potential Energy, Drone Battery Problem. Work, KE, PE, the
work-energy principle and P = Fv are Forces level 6.

| Lesson | Source | Leans on |
| --- | --- | --- |
| Elastic Energy | UP1 7.1 (spring work), 8.1 | expr, slider |
| Springs and Heights | UP1 8.3 Conservation of energy | tree, flow |
| Loops and Vertical Circles | UP1 8.3, 6.3 | tree, choice |
| Potential Energy Diagrams | UP1 8.4 | slider, choice |
| Efficiency and Batteries | UP1 7.4 Power; CP 7.6 | expr, table, flow |

### Level 5: Momentum (`clm-l5`)
Outline: Momentum in the Office, Impulse-Momentum Theorem, Rocket Equation,
Ideal Gas Law, Photon Problem. 1D collisions and impulse are Forces level 5.

| Lesson | Source | Leans on |
| --- | --- | --- |
| Force-Time Graphs | UP1 9.2 Impulse | slider, expr |
| Bounce: Restitution | UP1 9.4 Types of collisions | tree, expr |
| Collisions in Two Dimensions | UP1 9.5 | tree, table |
| The Rocket Equation | UP1 9.7 Rocket propulsion | expr, flow |
| Gas Pressure and Light | UP2 2.1-2.2 Molecular model of an ideal gas; UP3 6.3 (photon momentum) | tree, expr |

### Level 6: Frames of Reference (`clm-l6`)
Outline: Relativity on the Train, Center-of-Mass Frame, Rotating Frames,
Einstein's Theory of Relativity.

| Lesson | Source | Leans on |
| --- | --- | --- |
| Relative Velocity in a Plane | UP1 4.5 (river and wind) | tree, slider |
| The Centre-of-Mass Frame | UP1 9.6 Centre of mass | tree, table |
| Rotating Frames | UP1 6.3 (inertial and non-inertial frames) | expr, flow |
| Time Dilation | UP3 5.3 | expr, table |
| Length Contraction and Velocity Addition | UP3 5.4, 5.6 | tree, choice |

### Level 7: Statics (`clm-l7`)
Outline: Tower of Cards, Irregular Towers, Static Equilibrium, Rope Statics,
Body Statics, Plank Statics. Moments on rods, planks and ladders are Forces
level 4.

| Lesson | Source | Leans on |
| --- | --- | --- |
| Centre of Mass | UP1 9.6 | expr, slider |
| Stacking Blocks | Paterson and Zwick; UP1 12.2 | table, slider |
| Sliding or Toppling | UP1 12.2 | flow, tree |
| Rope Statics | UP1 12.2 (a load hung from a rope's middle) | tree, forces |
| Body Statics | UP1 12.2 (forearm and biceps) | tree, expr |

### Level 8: Springs (`clm-l8`)
| Lesson | Source | Leans on |
| --- | --- | --- |
| Springs Together | UP1 7.1, 15.1 | table, expr |
| Energy Landscapes | UP1 8.4 | slider, choice |
| Simple Harmonic Motion | UP1 15.1-15.2 | tree, expr |
| Pendulums | UP1 15.4 | expr, slider |
| The Large-Angle Pendulum | UP1 8.3, 15.4 | tree, flow |

### Level 9: Oscillations (`clm-l9`)
Outline: Vibrations in Molecules, Coupled Oscillations, Strings, Loaded
Strings, Firefly Problem.

| Lesson | Source | Leans on |
| --- | --- | --- |
| Vibrations in Molecules | MIT 8.03 (reduced mass) | expr, tree |
| Damping and Resonance | UP1 15.5-15.6 | expr, choice |
| Coupled Oscillators | Tong ch. 3; MIT 8.03 (normal modes) | tree, choice |
| Waves on a String | UP1 16.3 | expr, table |
| Standing Waves | UP1 16.6 | slider, tree |

### Level 10: General Considerations (`clm-l10`)
Outline: Natural Units, Lagrangian Mechanics.

| Lesson | Source | Leans on |
| --- | --- | --- |
| Dimensions | UP1 1.4 Dimensional analysis | choice, table |
| Formulas from Dimensions | UP1 1.4 | tiles, expr |
| Natural Units | Tong; UP1 1.2 | expr, choice |
| The Lagrangian | Tong ch. 2 | tiles, choice |
| Euler-Lagrange Equations | Tong ch. 2 | tiles, flow |

## Rules

Every lesson: a worked example before each kind of question it asks, 8 to 10
guided exercises, no family asked more than twice, at least three widget
kinds, answers exact (whole or a short decimal), g = 9.8 stated where used.
Lesson titles may change as a level is built; this file is updated with it.
