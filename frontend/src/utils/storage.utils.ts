/**
 * Every part of this app that persists something to localStorage
 * (PlayersContext's sessions, App.tsx's active game id, SoundContext's
 * on/off/volume state) wraps every read/write in try/catch, since
 * localStorage can throw (private browsing, disabled, quota) —
 * persistence is always a convenience on top of in-memory state here,
 * never a requirement, so a failure just falls back silently. That
 * try/catch shell used to be reimplemented independently in all three
 * places; this is the one place it lives now. Parsing (JSON, boolean,
 * number) still happens in each caller, since that part genuinely
 * differs per caller.
 */

/** Raw string read for `key`, or null if it's missing or localStorage itself is unavailable. */
export function readStorageItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** Writes `value` for `key`, or removes the key entirely when `value` is null. No-ops silently on failure. */
export function writeStorageItem(key: string, value: string | null): void {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // Best-effort — see the file comment above.
  }
}
