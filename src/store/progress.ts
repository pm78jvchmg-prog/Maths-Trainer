/**
 * Progress, persisted on the device.
 *
 * Deliberately minimal: which lessons have been finished and how the skill
 * check went. No XP and no league — this is a single-player practice tool. The
 * daily streak is the one engagement mechanic, and it lives next door in
 * `streak.ts` rather than here, so that finishing a lesson and keeping a run
 * of days going stay separate concerns.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface LessonRecord {
  completedAt: number;
  bestCorrect: number;
  total: number;
  timesPlayed: number;
}

interface ProgressState {
  lessons: Record<string, LessonRecord>;
  /**
   * How many times each lesson's skill check or level check was left before
   * its summary, keyed like `lessons`.
   *
   * A record of walking away, not a score: kept out of `lessons` on purpose,
   * since a `LessonRecord` existing is what marks a lesson finished and feeds
   * mastery, and an abandoned run is neither. Nothing reads it for display,
   * a best, mastery or the streak. Saved progress from before it existed
   * loads without it, and the default shallow merge fills in `{}`.
   */
  abandoned: Record<string, number>;
  recordCompletion: (lessonId: string, score: { correct: number; total: number }) => void;
  recordAbandon: (lessonId: string) => void;
  reset: () => void;
}

export const useProgress = create<ProgressState>()(
  persist(
    (set) => ({
      lessons: {},
      abandoned: {},
      recordCompletion: (lessonId, score) =>
        set((state) => {
          const previous = state.lessons[lessonId];
          // A best is only meaningful against the assessment it was set on,
          // and content is edited daily, so a skill check or level check can
          // grow or shrink between plays. Rescaling a best across that change
          // reports a run that never happened in both directions: 12/12 on a
          // check that grew to 15 would read "Best 12/15", and 3/3 on one that
          // shrank to 2 would read a perfect "Best 2/2" for a run that scored
          // one. So a best set against a different total is retired, not
          // carried. Same total, and the best survives replays as it should.
          const comparable = previous?.total === score.total ? (previous?.bestCorrect ?? 0) : 0;
          return {
            lessons: {
              ...state.lessons,
              [lessonId]: {
                completedAt: Date.now(),
                bestCorrect: Math.min(score.total, Math.max(comparable, score.correct)),
                total: score.total,
                timesPlayed: (previous?.timesPlayed ?? 0) + 1,
              },
            },
          };
        }),
      recordAbandon: (lessonId) =>
        set((state) => ({
          abandoned: { ...state.abandoned, [lessonId]: (state.abandoned[lessonId] ?? 0) + 1 },
        })),
      reset: () => set({ lessons: {}, abandoned: {} }),
    }),
    { name: 'maths-trainer:v1' },
  ),
);
