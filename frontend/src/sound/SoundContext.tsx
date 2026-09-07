import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { MUSIC_TRACKS, SFX_CLIP_SECONDS, SFX_LIBRARY, type SfxKey } from './soundLibrary';
import { readStorageItem, writeStorageItem } from '../utils/storage.utils';

const MUSIC_ON_KEY = 'roeto:musicOn';
const SFX_ON_KEY = 'roeto:sfxOn';
const VOLUME_KEY = 'roeto:volume';

/**
 * Music defaults to off, sound effects to on. Music needs a real user
 * gesture to start (browsers block autoplay-with-sound) — defaulting it on
 * would just leave the toggle showing "on" while nothing actually plays
 * until the person interacts with it anyway, which is more confusing than
 * starting off and having the first press of the toggle be the gesture
 * that starts it. One-shot effects (roll/bust/win/lose) are always
 * triggered by a click already, so autoplay policy doesn't affect them.
 */
const DEFAULT_MUSIC_ON = false;
const DEFAULT_SFX_ON = true;
const DEFAULT_VOLUME = 0.6;

/** The underlying read is shared with PlayersContext/App.tsx via utils/storage.utils.ts — boolean parsing is specific to this file. */
function readStoredBoolean(key: string, fallback: boolean): boolean {
  const raw = readStorageItem(key);
  return raw === null ? fallback : raw === 'true';
}

function readStoredVolume(): number {
  const raw = readStorageItem(VOLUME_KEY);
  if (raw === null) return DEFAULT_VOLUME;
  const value = Number(raw);
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : DEFAULT_VOLUME;
}

interface SoundContextValue {
  musicOn: boolean;
  sfxOn: boolean;
  /** 0-1, shared by both music and sound effects. */
  volume: number;
  toggleMusic: () => void;
  toggleSfx: () => void;
  setVolume: (value: number) => void;
  /** No-ops silently if sound effects are off, or if `key`'s file is missing/blocked. */
  playSfx: (key: SfxKey) => void;
}

const SoundContext = createContext<SoundContextValue | null>(null);

export function SoundProvider({ children }: { children: ReactNode }) {
  const [musicOn, setMusicOnState] = useState(() => readStoredBoolean(MUSIC_ON_KEY, DEFAULT_MUSIC_ON));
  const [sfxOn, setSfxOnState] = useState(() => readStoredBoolean(SFX_ON_KEY, DEFAULT_SFX_ON));
  const [volume, setVolumeState] = useState(readStoredVolume);

  // Lazily built once and reused for the life of the app — see the
  // React-sanctioned "create once" ref pattern (a single Audio() element
  // kept looping, rather than a new one per play like playSfx below uses).
  const musicRef = useRef<HTMLAudioElement | null>(null);
  if (musicRef.current === null && typeof Audio !== 'undefined' && MUSIC_TRACKS[0]) {
    const audio = new Audio(MUSIC_TRACKS[0].src);
    audio.loop = true;
    musicRef.current = audio;
  }

  useEffect(() => {
    if (musicRef.current) musicRef.current.volume = volume;
  }, [volume]);

  useEffect(() => {
    const audio = musicRef.current;
    if (!audio) return;
    if (musicOn) {
      // Swallows the autoplay-policy rejection (or a missing file) rather
      // than throwing — music failing to start should never break the app.
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  }, [musicOn]);

  const toggleMusic = useCallback(() => {
    setMusicOnState((prev) => {
      const next = !prev;
      writeStorageItem(MUSIC_ON_KEY, String(next));
      return next;
    });
  }, []);

  const toggleSfx = useCallback(() => {
    setSfxOnState((prev) => {
      const next = !prev;
      writeStorageItem(SFX_ON_KEY, String(next));
      return next;
    });
  }, []);

  const setVolume = useCallback((value: number) => {
    const clamped = Math.min(1, Math.max(0, value));
    setVolumeState(clamped);
    writeStorageItem(VOLUME_KEY, String(clamped));
  }, []);

  const playSfx = useCallback(
    (key: SfxKey) => {
      if (!sfxOn || typeof Audio === 'undefined') return;
      const src = SFX_LIBRARY[key];
      if (!src) return;
      // A fresh Audio() per call (rather than one reused element) so two
      // overlapping plays of the same effect don't cut each other off.
      const audio = new Audio(src);
      audio.volume = volume;
      audio.play().catch(() => {});

      // roll/win only have longer source files available — see
      // SFX_CLIP_SECONDS's comment. Cutting them off after N seconds keeps
      // them feeling like short stings instead of playing the whole clip.
      const clipSeconds = SFX_CLIP_SECONDS[key];
      if (clipSeconds) {
        window.setTimeout(() => audio.pause(), clipSeconds * 1000);
      }
    },
    [sfxOn, volume],
  );

  const value = useMemo(
    () => ({ musicOn, sfxOn, volume, toggleMusic, toggleSfx, setVolume, playSfx }),
    [musicOn, sfxOn, volume, toggleMusic, toggleSfx, setVolume, playSfx],
  );

  return <SoundContext.Provider value={value}>{children}</SoundContext.Provider>;
}

export function useSound(): SoundContextValue {
  const ctx = useContext(SoundContext);
  if (!ctx) throw new Error('useSound() must be used within a <SoundProvider>');
  return ctx;
}
