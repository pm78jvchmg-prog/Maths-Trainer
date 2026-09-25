/**
 * The streak view: tapping the streak on the home screen opens it.
 *
 * It says what the bar has no room for: the charges, the last five days
 * (played, covered by a charge, or missed with nothing left to cover it), the
 * longest run and how many lessons have been finished. Every number is read
 * through `streak.ts`, the same way the bar reads its own, so the two cannot
 * disagree. Nothing here is a points total: the lesson count is a count of
 * lessons, and it is shown here only, never on a lesson screen.
 *
 * A native modal `<dialog>`, like the leave-check prompt, so the list behind
 * it is inert and Escape closes it.
 */
import { useEffect, useId, useRef } from 'react';
import { categories } from '../content/courses';
import { libraryProgress } from '../store/mastery';
import { useProgress } from '../store/progress';
import { SyncDevices } from './SyncDevices';
import { lastReading } from './fullHeight';
import { MAX_CHARGES, bestStreak, localDay, recentDays, resolveStreak, useStreak } from '../store/streak';
import type { DayKind } from '../store/streak';

const WEEKDAYS = ['Su', 'M', 'Tu', 'W', 'Th', 'F', 'Sa'];

const DAY_SAID: Record<DayKind, string> = {
  played: 'played',
  charge: 'covered by a charge',
  missed: 'missed',
  today: 'not played yet',
};

/** A charge, drawn as a small battery. `full` fills it. */
export function ChargeIcon({ full, size = 22 }: { full: boolean; size?: number }) {
  return (
    <svg
      className={`charge-icon${full ? ' full' : ''}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <rect x="6" y="4" width="12" height="18" rx="2.5" className="charge-case" />
      <rect x="9.5" y="1.5" width="5" height="2.5" rx="1" className="charge-cap" />
      {full && <path d="M13 7.5 9.5 13.5h3l-1.5 5 4-6.5h-3z" className="charge-bolt" />}
    </svg>
  );
}

/**
 * How much of the library is behind you. Deliberately not a points total: it
 * counts topics, so it can stall or fall when content is added, and it says
 * what is left rather than what has been accumulated.
 */
function libraryText({ started, mastered, total }: { started: number; mastered: number; total: number }) {
  if (started === 0) return `${total} topics to explore`;
  if (mastered === 0) return `${started} of ${total} topics started`;
  return `${started} of ${total} topics started · ${mastered} mastered`;
}

export function StreakView({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const state = useStreak((s) => s);
  const lessons = useProgress((s) => s.lessons);

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  const close = () => {
    ref.current?.close();
    onClose();
  };

  const now = new Date();
  const today = localDay(now);
  const { streak, charges } = resolveStreak(state, today, now.getTime());
  const records = Object.values(lessons);
  // The day each lesson was last finished on is a day played, which covers
  // the days before the recent-days record was kept.
  const finishedOn = records.map((record) => localDay(new Date(record.completedAt)));
  const days = recentDays(state, today, now.getTime(), finishedOn);
  const completed = records.reduce((sum, record) => sum + record.timesPlayed, 0);

  return (
    <dialog
      ref={ref}
      className="leave-dialog streak-dialog"
      aria-labelledby={titleId}
      onCancel={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <div className="leave-sheet streak-sheet">
        <div className="streak-hero">
          <span className="streak-hero-flame" aria-hidden="true">
            &#128293;
          </span>
          <h2 className="streak-hero-count" id={titleId}>
            {streak}
            <span className="streak-hero-label"> day streak</span>
          </h2>
        </div>

        <div className="streak-charge-row" aria-label={`${charges} of ${MAX_CHARGES} charges banked`}>
          {Array.from({ length: MAX_CHARGES }, (_, index) => (
            <ChargeIcon key={index} full={index < charges} size={30} />
          ))}
        </div>
        <p className="streak-charge-note">
          A charge covers one missed day. You earn one each time you start a streak, and can bank {MAX_CHARGES}.
        </p>

        <ol className="streak-days" aria-label="The last five days">
          {days.map(({ day, kind }) => {
            const weekday = WEEKDAYS[new Date(`${day}T00:00:00Z`).getUTCDay()];
            return (
              <li key={day} className={`streak-day ${kind}`} aria-label={`${day === today ? 'Today' : weekday}, ${DAY_SAID[kind]}`}>
                <span className="streak-day-mark" aria-hidden="true">
                  {kind === 'played' && <span className="streak-day-flame">&#128293;</span>}
                  {kind === 'charge' && <ChargeIcon full size={18} />}
                </span>
                <span className="streak-day-name" aria-hidden="true">
                  {weekday}
                </span>
              </li>
            );
          })}
        </ol>

        <div className="streak-stats">
          <div className="streak-stat">
            <span className="streak-stat-value">{bestStreak(state, today, now.getTime())}</span>
            <span className="streak-stat-label">Max streak</span>
          </div>
          <div className="streak-stat">
            <span className="streak-stat-value">{completed.toLocaleString('en-GB')}</span>
            <span className="streak-stat-label">Lessons complete</span>
          </div>
        </div>

        {/* Moved here from under the streak bar at the owner's ask, so the home
            screen runs straight from the streak into the coloured list. */}
        <p className="library-line streak-library">{libraryText(libraryProgress(categories, lessons))}</p>
        <SyncDevices />

        {/* Temporary: what the phone reports about its screen, so the gap at
            the foot of an installed app can be fixed from a screenshot. Above
            Done, where the sheet cannot clip it. */}
        {lastReading && <p className="streak-reading">{lastReading}</p>}
        <button type="button" className="primary-button" onClick={close}>
          Done
        </button>
      </div>
    </dialog>
  );
}
