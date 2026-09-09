/**
 * Progress, persisted on the device.
 *
 * Deliberately minimal: which lessons have been finished and how the skill
 * check went. No XP, no streak, no league — this is a single-player practice
 * tool, and a streak counter would only add a reason to feel bad about missing
 * a morning.
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
  recordCompletion: (lessonId: string, score: { correct: number; total: number }) => void;
  reset: () => void;
}

export const useProgress = create<ProgressState>()(
  persist(
    (set) => ({
      lessons: {},
      recordCompletion: (lessonId, score) =>
        set((state) => {
          const previous = state.lessons[lessonId];
          return {
            lessons: {
              ...state.lessons,
              [lessonId]: {
                completedAt: Date.now(),
                // Keep the best run, so replaying for practice can never make
                // your record look worse.
                bestCorrect: Math.max(previous?.bestCorrect ?? 0, score.correct),
                total: score.total,
                timesPlayed: (previous?.timesPlayed ?? 0) + 1,
              },
            },
          };
        }),
      reset: () => set({ lessons: {} }),
    }),
    { name: 'maths-trainer:v1' },
  ),
);
