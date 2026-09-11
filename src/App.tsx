/**
 * App shell: category tabs, course map, lesson player.
 *
 * Screens are held in component state rather than the URL. That is deliberate:
 * routing a lesson through the address bar would hand the browser's back
 * gesture a way into the guided slides during a skill check, which is exactly
 * what the skill check is meant to prevent.
 */
import { useState } from 'react';
import { categories, lessonCount, checkCount } from './content/courses';
import { registry } from './content/registry';
import { LessonPlayer } from './ui/LessonPlayer';
import { useProgress } from './store/progress';
import { levelCheckLesson } from './content/types';
import type { Category, Course, Lesson } from './content/types';

/** Lessons plus level checks, which is what the progress count is out of. */
function playableIds(course: Course): string[] {
  return course.levels.flatMap((level) => {
    const check = levelCheckLesson(level);
    return [...level.lessons.map((lesson) => lesson.id), ...(check ? [check.id] : [])];
  });
}

function Catalogue({ onOpen }: { onOpen: (course: Course) => void }) {
  const records = useProgress((state) => state.lessons);
  const [openId, setOpenId] = useState(categories[0]?.id);
  const category: Category | undefined =
    categories.find((entry) => entry.id === openId) ?? categories[0];

  return (
    <div className="app">
      <div className="map">
        {/* One tab per category. Scrolls horizontally rather than wrapping, so
            the row stays one line tall however many categories exist. */}
        <div className="tabs" role="tablist">
          {categories.map((entry) => (
            <button
              key={entry.id}
              type="button"
              role="tab"
              aria-selected={entry.id === category?.id}
              className={`tab${entry.id === category?.id ? ' active' : ''}`}
              onClick={() => setOpenId(entry.id)}
            >
              {entry.title}
            </button>
          ))}
        </div>

        {category && (
          <>
            <header className="category-head">
              <h1 className="home-title">{category.title}</h1>
              <p className="course-blurb">{category.blurb}</p>
            </header>

            <div className="course-list">
              {category.courses.map((course) => {
                const ids = playableIds(course);
                const done = ids.filter((id) => records[id]).length;
                const total = lessonCount(course) + checkCount(course);

                return (
                  <button
                    key={course.id}
                    type="button"
                    className={`course-card${done === total ? ' complete' : ''}`}
                    onClick={() => onOpen(course)}
                  >
                    <div className="course-card-title">{course.title}</div>
                    <div className="course-card-blurb">{course.blurb}</div>
                    <div className="course-progress">
                      <span className="progress-pips">
                        {ids.map((id) => (
                          <span key={id} className={`pip${records[id] ? ' done' : ''}`} />
                        ))}
                      </span>
                      <span className="progress-count">
                        {done}/{total}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}
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

        {course.levels.map((level, levelIndex) => {
          const check = levelCheckLesson(level);

          return (
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
                          : `${lesson.slides.length} slides · ${lesson.skillCheck.length} skill check${lesson.skillCheck.length === 1 ? '' : 's'}`}
                      </span>
                    </span>
                  </button>
                );
              })}

              {check && (
                <button
                  type="button"
                  className="lesson-row check-row"
                  onClick={() => onOpen(check)}
                >
                  <span className={`node check${records[check.id] ? ' done' : ''}`}>
                    {records[check.id] ? '✓' : ''}
                  </span>
                  <span>
                    <span className="lesson-name">Level Check</span>
                    <br />
                    <span className="lesson-meta">
                      {records[check.id]
                        ? `Best ${records[check.id].bestCorrect}/${records[check.id].total}`
                        : `${check.skillCheck.length} questions · no worked examples`}
                    </span>
                  </span>
                </button>
              )}
            </section>
          );
        })}
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

  return <Catalogue onOpen={setCourse} />;
}
