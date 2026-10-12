/** Small, deterministic formatters (no Intl, so tests and every platform agree). */

const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** 1284 → "1,284" */
export function formatCount(value: number): string {
  return String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export function greeting(date: Date = new Date()): string {
  const hour = date.getHours();
  if (hour < 5) return 'Good evening';
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

/** "THU" */
export const weekdayShort = (date: Date) => WEEKDAYS[date.getDay()];

/** "Thursday" */
export const weekdayName = (date: Date) => WEEKDAY_NAMES[date.getDay()];

/** "19:00" */
export function time24(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

/** "Today", "Tomorrow" or the weekday name. */
export function relativeDay(date: Date, now: Date = new Date()): string {
  const start = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((start(date) - start(now)) / 86_400_000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  return weekdayName(date);
}

/** ["Jonas", "Mira", "Erik"] → "Jonas, Mira and Erik" */
export function joinNames(names: readonly string[]): string {
  if (names.length <= 1) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

/** 0.943 → "94%" */
export const percent = (ratio: number) => `${Math.round(ratio * 100)}%`;

export const plural = (count: number, singular: string, pluralForm = `${singular}s`) =>
  `${formatCount(count)} ${count === 1 ? singular : pluralForm}`;

/** "Atraxa, Praetors' Voice" → "Atraxa"; "Edgar Markov" → "Edgar". */
export function shortDeckName(name: string): string {
  const beforeComma = name.split(',')[0].trim();
  return beforeComma === name.trim() ? (name.trim().split(/\s+/)[0] ?? name) : beforeComma;
}
