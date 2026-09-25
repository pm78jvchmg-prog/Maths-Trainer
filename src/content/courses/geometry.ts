/**
 * Geometry.
 *
 * Shape geometry for the Fundamentals band: angles, polygons, lengths,
 * scaling, area, Pythagoras, surface area and volume. The level map follows
 * the owner's inspiration screenshots (project files, `geometry/`); the plan is
 * `docs/roadmap/levels/geometry.md`.
 *
 * The owner's rule for this course: every formula is given before it is used,
 * and every diagram labels the sides and angles its question needs. It is a
 * Fundamentals course, so it climbs gently and proves nothing.
 *
 * Each level is a file in `courses/geometry/`, written with the slide builders
 * in `geometry/blocks.ts`.
 */
import type { Course } from '../types';
import { angles } from './geometry/level1';
import { polygons } from './geometry/level2';
import { lengths } from './geometry/level3';
import { scaling } from './geometry/level4';
import { areas } from './geometry/level5';
import { pythagoras } from './geometry/level6';
import { surfaceArea } from './geometry/level7';
import { volume } from './geometry/level8';

export const geometry: Course = {
  id: 'geometry',
  category: 'algebra-fundamentals',
  // Just before Coordinate Geometry (80).
  position: 75,
  title: 'Geometry',
  blurb: 'Angles, polygons, perimeters and circles, similar shapes, areas, Pythagoras, surface area and volume.',
  levels: [angles, polygons, lengths, scaling, areas, pythagoras, surfaceArea, volume],
};
