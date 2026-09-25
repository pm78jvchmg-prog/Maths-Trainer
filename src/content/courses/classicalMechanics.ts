/**
 * Classical Mechanics.
 *
 * Built from the owner's outline of ten levels, with the examples, diagrams
 * and formula layout modelled on open textbooks (OpenStax University Physics
 * above all) rather than on the outline's own lessons. The plan, with the
 * source behind each lesson, is docs/roadmap/levels/classical-mechanics.md.
 *
 * It follows Kinematics and Forces and Newton's Laws and does not teach their
 * content again: where the outline overlaps them, a lesson starts from their
 * result. Each level is written in a file of its own under `classical/`.
 */
import type { Course } from '../types';
import { level1 } from './classical/level1';

export const classicalMechanics: Course = {
  id: 'classical-mechanics',
  category: 'mechanics',
  // After Kinematics (10) and Forces (20), which it builds on.
  position: 30,
  title: 'Classical Mechanics',
  blurb: 'Physics of motion from open textbooks: speeds and stopping distances, closing speeds and stepping through time, with more to come.',
  levels: [level1],
};
