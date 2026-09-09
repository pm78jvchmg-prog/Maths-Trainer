/**
 * App shell: course list, course map, lesson player.
 *
 * Screens are held in component state rather than the URL. That is deliberate:
 * routing a lesson through the address bar would hand the browser's back
 * gesture a way into the guided slides during a skill check, which is exactly
 * what the skill check is meant to prevent.
 */
import { useState } from 'react';
import { courses, lessonCount } from './content/courses';
import { registry } from './content/registry';
import { LessonPlayer } from './ui/LessonPlayer';
import { useProgress } from './store/progress';
import type { Course, Lesson } from './content/types';

function CourseList({ onOpen }: { onOpen: (course: Course) => void }) {
  const records = useProgress((state) => state.lessons);

  return (
    <div className="app">
      <div className="map">
        <h1 className="home-title">Practice</h1>

        {courses.map((course) => {
          const lessons = course.levels.flatMap((level) => level.lessons);
          const done = lessons.filter((lesson) => records[lesson.id]).length;

          return (
            <button
              key={course.id}
              type="button"
              className="course-card"
              onClick={() => onOpen(course)}
            >
              <div className="course-card-title">{course.title}</div>
              <div className="course-card-blurb">{course.blurb}</div>
              <div className="course-progress">
                <span className="progress-pips">
                  {lessons.map((lesson) => (
                    <span
                      key={lesson.id}
                      className={`pip${records[lesson.id] ? ' done' : ''}`}
                    />
                  ))}
                </span>
                <span>
                  {done}/{lessonCount(course)}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CourseMap({
  course,
  onOpen,
  onBack,
}: {
  course: Course;
  onOpen: (lesson: Lesson) => void;
  onBack: () => void;
}) {
  const records = useProgress((state) => state.lessons);

  return (
    <div className="app">
      <div className="map">
        <button type="button" className="back-link" onClick={onBack}>
          &#8249; All courses
        </button>
        <h1 className="course-title">{course.title}</h1>
        <p className="course-blurb">{course.blurb}</p>

        {course.levels.map((level, levelIndex) => (
          <section key={level.id}>
            <div className="level-banner">
              <div className="level-tag">LEVEL {levelIndex + 1}</div>
              <div className="level-name">{level.title}</div>
            </div>

            {level.lessons.map((lesson) => {
              const record = records[lesson.id];
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
  const [course, setCourse] = useState<Course | null>(null);
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const recordCompletion = useProgress((state) => state.recordCompletion);

  if (lesson) {
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

  if (course) {
    return <CourseMap course={course} onOpen={setLesson} onBack={() => setCourse(null)} />;
  }

  return <CourseList onOpen={setCourse} />;
}
