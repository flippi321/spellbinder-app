import type { GameNight } from '@/types';
import { currentGameNightId, GAME_NIGHT_WINDOW_MS } from '@/utils/gameNight';

const startsAt = new Date('2026-10-15T19:00:00.000Z');
const night: GameNight = { id: 'gn1', playgroupId: 'pg', startsAt: startsAt.toISOString(), location: '', notes: null };
const at = (offsetMs: number) => new Date(startsAt.getTime() + offsetMs);

describe('currentGameNightId', () => {
  it('is null without a game night', () => {
    expect(currentGameNightId(null, startsAt)).toBeNull();
  });

  it.each([
    ['at the start', 0],
    ['two hours in', 2 * 60 * 60 * 1000],
    ['exactly 12 h after the start', GAME_NIGHT_WINDOW_MS],
    ['exactly 12 h before the start', -GAME_NIGHT_WINDOW_MS],
  ])('is the night %s', (_, offset) => {
    expect(currentGameNightId(night, at(offset))).toBe('gn1');
  });

  it.each([
    ['just over 12 h after the start', GAME_NIGHT_WINDOW_MS + 1],
    ['just over 12 h before the start', -GAME_NIGHT_WINDOW_MS - 1],
    ['a week later', 7 * 24 * 60 * 60 * 1000],
  ])('is null %s', (_, offset) => {
    expect(currentGameNightId(night, at(offset))).toBeNull();
  });

  it('defaults to now', () => {
    expect(currentGameNightId({ ...night, startsAt: new Date().toISOString() })).toBe('gn1');
  });
});
