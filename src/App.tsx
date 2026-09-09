/**
 * App shell.
 *
 * Two screens, held in component state rather than the URL. That is deliberate:
 * routing a lesson through the address bar would hand the browser's back
 * gesture a way into the guided slides during a skill check, which is exactly
 * what the skill check is meant to prevent.
 */
import { useState } from 'react';
import { complexNumbers } from './content/courses/complexNumbers';
import { registry } from './content/registry';
import { LessonPlayer } from './ui/LessonPlayer';
import { useProgress } from './store/progress';
import type { Lesson } from './content/types';

function CourseMap({ onOpen }: { onOpen: (lesson: Lesson) => void }) {
  const lessons = useProgress((state) => state.lessons);
  const course = complexNumbers;

  return (
    <div className="app">
      <div className="map">
        <h1 className="course-title">{course.title}</h1>
        <p className="course-blurb">{course.blurb}</p>

        {course.levels.map((level, levelIndex) => (
          <section key={level.id}>
            <div className="level-banner">
              <div className="level-tag">LEVEL {levelIndex + 1}</div>
              <div className="level-name">{level.title}</div>
            </div>

            {level.lessons.map((lesson) => {
              const record = lessons[lesson.id];
              return (
                <button
                  key={lesson.id}
                  type="button"
                  className="lesson-row"
                  onClick={() => onOpen(lesson)}
                >
                  <span className={`node${record ? ' done' : ''}`}>{record ? '✓' : ''}</span>
                  <span>
                    <span className="lesson-name">{lesson.title}</span>
                    <br />
                    <span className="lesson-meta">
                      {record
                        ? `Best ${record.bestCorrect}/${record.total} · played ${record.timesPlayed}×`
                        : `${lesson.slides.length} slides · 3 skill checks`}
                    </span>
                  </span>
                </button>
              );
            })}
          </section>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const recordCompletion = useProgress((state) => state.recordCompletion);

  if (!lesson) return <CourseMap onOpen={setLesson} />;

  return (
    <LessonPlayer
      // Remount on lesson change so no session state survives between lessons.
      key={lesson.id}
      lesson={lesson}
      registry={registry}
      onExit={() => setLesson(null)}
      onComplete={(score) => {
        recordCompletion(lesson.id, score);
        setLesson(null);
      }}
    />
  );
}
