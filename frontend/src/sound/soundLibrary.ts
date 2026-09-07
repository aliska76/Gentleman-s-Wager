/**
 * The whole point of this file: adding, swapping, or removing a music
 * track or a sound effect is a one-line edit here, never a change to
 * SoundContext.tsx's playback logic or to whatever component triggers it.
 *
 * None of the actual audio files are checked into the repo — see
 * frontend/README.md's "Sound" section for exactly which files to add and
 * where. Until they exist, playback fails silently (see SoundContext.tsx);
 * the app never breaks because a sound file is missing.
 */

export interface Track {
  id: string;
  name: string;
  src: string;
}

/** Looped background music. Only the first track is played today — this stays an array so adding a second (for a menu to pick between, say) doesn't need a shape change. */
export const MUSIC_TRACKS: Track[] = [
  { id: 'theme', name: 'Scott Joplin — The Entertainer', src: '/audio/music/theme.mp3' },
];

export type SfxKey = 'roll' | 'bust' | 'win' | 'lose';

/** One-shot sound effects, keyed by when they play — see SettingsMenu/GameScreen for the trigger points. */
export const SFX_LIBRARY: Record<SfxKey, string> = {
  roll: '/audio/sfx/roll.mp3',
  bust: '/audio/sfx/bust-sigh.mp3',
  win: '/audio/sfx/win.mp3',
  lose: '/audio/sfx/lose.mp3',
};

/**
 * Optional hard cap (in seconds) on how much of a clip actually plays,
 * keyed the same as SFX_LIBRARY. `roll` and `win` only have longer source
 * files available (no short "sting" versions were found), so both are cut
 * off after their first second rather than playing in full — SoundContext
 * enforces this by pausing the clip once the timer fires. A key with no
 * entry here just plays to its natural end.
 */
export const SFX_CLIP_SECONDS: Partial<Record<SfxKey, number>> = {
  roll: 1,
  win: 1,
};
