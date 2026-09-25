/**
 * "Sync devices" on the home screen: pairing this device with another one.
 *
 * No accounts. One device shows a code, the other types it, and from then on
 * both keep the same progress (src/sync/sync.ts). Folded away to one quiet
 * line until tapped, since it is used once per device.
 */
import { useEffect, useState } from 'react';
import { joinWithCode, makePairingCode, syncNow, unpair, useSync } from '../sync/sync';

function ago(time: number, now: number): string {
  const minutes = Math.floor((now - time) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  return `${Math.floor(hours / 24)} d ago`;
}

/** Shown as ABCD-EFGH, which is easier to read across and type. */
const spaced = (code: string) => `${code.slice(0, 4)}-${code.slice(4)}`;

export function SyncDevices() {
  const { groupId, lastSynced, status } = useSync();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState<string | null>(null);
  const [typing, setTyping] = useState(false);
  const [typed, setTyped] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!open) return;
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, [open]);

  const summary = (() => {
    if (!groupId) return 'Sync devices';
    if (status === 'syncing') return 'Syncing…';
    if (status === 'offline') return 'Synced devices · offline, will catch up';
    return lastSynced ? `Synced devices · ${ago(lastSynced, now)}` : 'Synced devices';
  })();

  const showCode = async () => {
    setBusy(true);
    setMessage(null);
    try {
      setCode((await makePairingCode()).code);
      setTyping(false);
    } catch {
      setMessage('Could not reach the internet. Try again when online.');
    } finally {
      setBusy(false);
    }
  };

  const join = async () => {
    setBusy(true);
    setMessage(null);
    try {
      if (await joinWithCode(typed)) {
        setTyping(false);
        setTyped('');
        setMessage('Paired. Progress from both devices is now on each.');
      } else {
        setMessage('That code did not work. Check it, or show a new one on the other device.');
      }
    } catch {
      setMessage('Could not reach the internet. Try again when online.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="sync">
      <button
        type="button"
        className="sync-toggle"
        aria-expanded={open}
        onClick={() => {
          setOpen(!open);
          setNow(Date.now());
          if (!open && groupId) void syncNow();
        }}
      >
        <span aria-hidden="true">&#8645;</span> {summary}
      </button>

      {open && (
        <div className="sync-panel">
          {code ? (
            <>
              <p className="sync-text">On your other device, open Sync devices, tap Enter a code, and type:</p>
              <p className="sync-code">{spaced(code)}</p>
              <p className="sync-hint">Works once, for 15 minutes.</p>
            </>
          ) : typing ? (
            <form
              className="sync-form"
              onSubmit={(event) => {
                event.preventDefault();
                void join();
              }}
            >
              <input
                className="sync-input"
                value={typed}
                onChange={(event) => setTyped(event.target.value)}
                placeholder="ABCD-EFGH"
                autoCapitalize="characters"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                maxLength={12}
                aria-label="Code from your other device"
                autoFocus
              />
              <button type="submit" className="sync-button primary" disabled={busy || typed.trim() === ''}>
                Pair
              </button>
            </form>
          ) : (
            <p className="sync-text">
              {groupId
                ? 'This device shares its progress. To add another device, show a code here and type it there.'
                : 'Keep the same progress on your phone and tablet. Show a code on one, then enter it on the other.'}
            </p>
          )}

          {message && <p className="sync-message">{message}</p>}

          <div className="sync-actions">
            {!code && (
              <button type="button" className="sync-button" disabled={busy} onClick={() => void showCode()}>
                Show a code
              </button>
            )}
            {!typing && !code && (
              <button
                type="button"
                className="sync-button"
                disabled={busy}
                onClick={() => {
                  setTyping(true);
                  setMessage(null);
                }}
              >
                Enter a code
              </button>
            )}
            {(code || typing) && (
              <button
                type="button"
                className="sync-button"
                onClick={() => {
                  setCode(null);
                  setTyping(false);
                  setMessage(null);
                }}
              >
                Done
              </button>
            )}
            {groupId && !code && !typing && (
              <button
                type="button"
                className="sync-button quiet"
                onClick={() => {
                  unpair();
                  setMessage('This device has stopped syncing. Its progress is kept.');
                }}
              >
                Stop syncing here
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
