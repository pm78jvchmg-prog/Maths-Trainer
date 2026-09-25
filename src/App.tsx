/**
 * App shell: category tabs, course map, lesson player.
 *
 * Screens are held in component state rather than the URL. That is deliberate:
 * routing a lesson through the address bar would hand the browser's back
 * gesture a way into the guided slides during a skill check, which is exactly
 * what the skill check is meant to prevent.
 *
 * One screen replacing another animates in the direction travelled, the same
 * way a slide does inside a lesson. `direction` is presentation only — nothing
 * reads it but a class name — and the screens themselves are still chosen by
 * the state below rather than by a route.
 */
import { useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { categories, lessonCount, checkCount } from './content/courses';
import { registry } from './content/registry';
import { LessonPlayer } from './ui/LessonPlayer';
import { useProgress } from './store/progress';
import { MAX_CHARGES, countedOn, localDay, resolveStreak, useStreak } from './store/streak';
import { MASTERED_AT, courseMastery, libraryProgress, masteryPercent, playables } from './store/mastery';
import { levelCheckLesson } from './content/types';
import type { Course, Lesson } from './content/types';

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
  const now = new Date();
  const today = localDay(now);
  const { streak, charges } = resolveStreak(streakState, today, now.getTime());
  // Not `lastPlayedDay === today`: after travelling west, today is a day
  // before the last play and already counted.
  const playedToday = countedOn(streakState, today, now.getTime());

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

/**
 * Where the home list was scrolled to when a course was opened, so coming back
 * lands on the same card rather than at the top of every course there is.
 * Module state rather than storage: it only has to outlive the course screen.
 */
let homeScroll = 0;

/**
 * The home list's two colour runs. The owner asked for one background running
 * from the first maths band to the last, deepening as the maths gets harder,
 * and a second, orange, run for the applied subjects.
 */
const MATHS_BANDS = ['algebra-fundamentals', 'advanced-algebra', 'advanced-maths'];
const BANDS = [
  { id: 'maths', holds: (id: string) => MATHS_BANDS.includes(id) },
  // Everything else, so a category added later cannot fall out of the list.
  { id: 'applied', holds: (id: string) => !MATHS_BANDS.includes(id) },
];

function Catalogue({ onOpen }: { onOpen: (course: Course) => void }) {
  const records = useProgress((state) => state.lessons);
  const list = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (list.current) list.current.scrollTop = homeScroll;
  }, []);

  return (
    <div className="app app-wide">
      <div
        className="map"
        ref={list}
        onScroll={(event) => {
          homeScroll = event.currentTarget.scrollTop;
        }}
      >
        <StreakBar />
        <LibraryLine />

        {/* Every category in one list, easiest first, each under its own
            heading. The owner asked for this in place of a tab strip, so the
            whole library is one scroll rather than five hidden panes. */}
        {BANDS.map((band) => (
          <div className={`band band-${band.id}`} key={band.id}>
          {categories
            .filter((category) => band.holds(category.id))
            .map((category) => (
            <section className={`category-section category-${category.id}`} key={category.id} aria-labelledby={`cat-${category.id}`}>
              <header className="category-head">
                <h2 className="category-title" id={`cat-${category.id}`}>
                  {category.title}
                </h2>
                <p className="category-blurb">{category.blurb}</p>
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
                      aria-label={`${course.title}: ${course.blurb}`}
                      onClick={() => onOpen(course)}
                    >
                      <div className="course-card-title">{course.title}</div>
                      <div className="course-progress">
                        {/* One pip per level, filled as far as the level is
                            finished. A pip per lesson ran to 47 on a card this
                            narrow, which was a smear rather than a count. */}
                        <span className="progress-pips">
                          {course.levels.map((level) => {
                            const check = levelCheckLesson(level);
                            const inLevel = check ? [...level.lessons, check] : level.lessons;
                            if (inLevel.length === 0) return null;
                            const finished = inLevel.filter((lesson) => records[lesson.id]).length;
                            return (
                              <span
                                key={level.id}
                                className="pip"
                                style={{ '--size': inLevel.length } as CSSProperties}
                              >
                                <span
                                  className="pip-fill"
                                  style={{ width: `${(finished / inLevel.length) * 100}%` }}
                                />
                              </span>
                            );
                          })}
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
            </section>
          ))}
          </div>
        ))}
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
    <div className="app app-wide">
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
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');
  const recordCompletion = useProgress((state) => state.recordCompletion);
  const recordAbandon = useProgress((state) => state.recordAbandon);
  const recordPlay = useStreak((state) => state.recordPlay);

  const openCourse = (next: Course) => {
    setDirection('forward');
    setCourse(next);
  };

  const openLesson = (next: Lesson) => {
    setDirection('forward');
    setLesson(next);
  };

  const leaveLesson = () => {
    setDirection('back');
    setLesson(null);
  };

  const screen = lesson ? (
    <LessonPlayer
      // Remount on lesson change so no session state survives between lessons.
      key={lesson.id}
      lesson={lesson}
      registry={registry}
      onExit={(abandoned) => {
        // A check left before its summary is counted and nothing more: no
        // best, no mastery, no streak, and nothing on screen reads it.
        if (abandoned) recordAbandon(lesson.id);
        leaveLesson();
      }}
      onComplete={(score) => {
        recordCompletion(lesson.id, score);
        // Finishing something is what counts as playing; opening a lesson and
        // backing out is not a day's practice.
        recordPlay();
        leaveLesson();
      }}
    />
  ) : course ? (
    <CourseMap
      course={course}
      onOpen={openLesson}
      onBack={() => {
        setDirection('back');
        setCourse(null);
      }}
    />
  ) : (
    <Catalogue onOpen={openCourse} />
  );

  // Keyed so the wrapper remounts on every change of screen, which is what
  // restarts the enter animation; a class alone would only play it once.
  const key = lesson ? `lesson:${lesson.id}` : course ? `course:${course.id}` : 'home';

  return (
    <div className={`screen enter-${direction}`} key={key}>
      {screen}
    </div>
  );
}
