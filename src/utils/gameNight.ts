import type { GameNight } from '@/types';

/** A game logged within this long of a game night's start counts as played at it. */
export const GAME_NIGHT_WINDOW_MS = 12 * 60 * 60 * 1000;

/** The game night happening around `now` (12 h either side of its start), if it's this one. */
export const currentGameNightId = (night: GameNight | null, now: Date = new Date()): string | null =>
  night && Math.abs(new Date(night.startsAt).getTime() - now.getTime()) <= GAME_NIGHT_WINDOW_MS ? night.id : null;
