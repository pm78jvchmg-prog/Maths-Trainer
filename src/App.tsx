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
import { MAX_CHARGES, localDay, resolveStreak, useStreak } from './store/streak';
import { MASTERED_AT, courseMastery, libraryProgress, masteryPercent, playables } from './store/mastery';
import { levelCheckLesson } from './content/types';
import type { Category, Course, Lesson } from './content/types';

/**
 * The daily streak, on the home screen.
 *
 * Read through `resolveStreak` rather than straight off the store, so a streak
 * that has already lapsed shows as lapsed before the learner plays, and a
 * charge a missed day has cost is shown as spent rather than still banked.
 * Reading spends nothing; the deduction is only written when the next play is
 * recorded.
 */
function StreakBar() {
  const streakState = useStreak((state) => state);
  const today = localDay(new Date());
  const { streak, charges } = resolveStreak(streakState, today);
  const playedToday = streakState.lastPlayedDay === today;

  // Kept short enough to stay on one line at 390px with a three-digit streak
  // beside it; the bar growing to two lines pushes the tab strip down the
  // screen for a line of text nobody reads twice.
  const label = (() => {
    if (streak === 0) return 'Start your streak today';
    return `day streak · ${playedToday ? 'done for today' : 'play today'}`;
  })();

  return (
    <div className="streak-bar">
      <span className="streak-flame" aria-hidden="true">
        &#128293;
      </span>
      {/* The count and the label are two elements so the number can be sized
          up, but they are one phrase: read out separately a screen reader
          runs them together as "5day streak". */}
      <span className="streak-said" aria-label={streak > 0 ? `${streak} ${label}` : label}>
        {streak > 0 && (
          <span className="streak-count" aria-hidden="true">
            {streak}
          </span>
        )}
        <span className="streak-label" aria-hidden="true">
          {label}
        </span>
      </span>
      <span
        className="streak-charges"
        title={`${charges} of ${MAX_CHARGES} charges banked, each covering one missed day`}
        aria-label={`${charges} of ${MAX_CHARGES} charges banked, each covering one missed day`}
      >
        {Array.from({ length: MAX_CHARGES }, (_, index) => (
          <span key={index} className={`charge${index < charges ? ' banked' : ''}`} />
        ))}
      </span>
    </div>
  );
}

/**
 * How much of the library is behind you.
 *
 * Deliberately not a points total: it counts topics, so it can stall or fall
 * when content is added, and it says what is left rather than what you have
 * accumulated.
 */
function LibraryLine() {
  const records = useProgress((state) => state.lessons);
  const { started, mastered, total } = libraryProgress(categories, records);

  const text = (() => {
    if (started === 0) return `${total} topics to explore`;
    if (mastered === 0) return `${started} of ${total} topics started`;
    return `${started} of ${total} topics started · ${mastered} mastered`;
  })();

  return <p className="library-line">{text}</p>;
}

function Catalogue({ onOpen }: { onOpen: (course: Course) => void }) {
  const records = useProgress((state) => state.lessons);
  const [openId, setOpenId] = useState(categories[0]?.id);
  const category: Category | undefined =
    categories.find((entry) => entry.id === openId) ?? categories[0];

  return (
    <div className="app">
      <div className="map">
        <StreakBar />
        <LibraryLine />

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
                const ids = playables(course).map((lesson) => lesson.id);
                const done = ids.filter((id) => records[id]).length;
                const total = lessonCount(course) + checkCount(course);
                const mastery = courseMastery(course, records);

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
                      {/* Lessons finished, then marks earned. The pair is the
                          point: you can finish every lesson in a course and
                          still be some way off knowing it. */}
                      <span className="progress-count">
                        {done}/{total}
                      </span>
                      {mastery.played > 0 && (
                        <span
                          className={`mastery${mastery.fraction >= MASTERED_AT ? ' mastered' : ''}`}
                        >
                          {masteryPercent(mastery)}%
                        </span>
                      )}
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
  const recordPlay = useStreak((state) => state.recordPlay);

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
          // Finishing something is what counts as playing; opening a lesson
          // and backing out is not a day's practice.
          recordPlay();
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
