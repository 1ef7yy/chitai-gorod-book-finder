import { books, bookIntents, duration, moods, type Book, type Mood, type TimeRange } from './data';

export interface Answers { time: TimeRange | null; moods: Mood[]; surprise: boolean; favorites: string[] }
export type Feedback = 'liked' | 'not_started' | 'disliked';
export interface RecommendationProfile { feedback?: Record<string, Feedback>; excludedIds?: string[] }
export const emptyAnswers: Answers = { time: null, moods: [], surprise: false, favorites: [] };
export const hasMood = (answers: Answers) => answers.surprise || answers.moods.length > 0;
// Ситуация чтения ограничивает объём; оценка часов относится ко всей книге.
export function inRange(hours: number, range: TimeRange): boolean {
  return range === 'short' ? hours <= 2 : range === 'medium' ? hours > 2 && hours <= 5 : range === 'long' ? hours > 5 && hours <= 10 : hours > 10;
}
const ranges: TimeRange[] = ['short', 'medium', 'long', 'epic'];
// Более короткая книга тоже подходит для выходных или отпуска. Длиннее
// выбранного объёма не предлагаем; совпадения своего объёма получают приоритет.
export function fitsTime(hours: number, range: TimeRange): boolean {
  const maximum = { short: 2, medium: 5, long: 10, epic: Infinity }[range];
  return hours <= maximum;
}
function volumeBonus(book: Book, range: TimeRange): number {
  const band = ranges.findIndex(id => inRange(book.hours, id));
  return Math.max(0, 30 - 15 * (ranges.indexOf(range) - band));
}
export const matchingMoods = (book: Book, answers: Answers) => answers.surprise ? [] : answers.moods.filter(mood => bookIntents[book.id]?.includes(mood));
function likedBooks(answers: Answers, profile: RecommendationProfile) {
  const ids = new Set([...answers.favorites, ...Object.keys(profile.feedback || {}).filter(id => profile.feedback?.[id] === 'liked')]);
  return books.filter(book => ids.has(book.id));
}
export function rankedBooks(answers: Answers, profile: RecommendationProfile = {}): Book[] {
  if (!answers.time || !hasMood(answers)) return [];
  const liked = likedBooks(answers, profile);
  const disliked = books.filter(b => profile.feedback?.[b.id] === 'disliked');
  const excluded = new Set([...answers.favorites, ...(profile.excludedIds || []), ...Object.keys(profile.feedback || {})]);
  return books.filter(b => fitsTime(b.hours, answers.time!) && !excluded.has(b.id))
    .map((book, index) => ({ book, index, score:
      matchingMoods(book, answers).length * 100
      + volumeBonus(book, answers.time!)
      + liked.reduce((n, other) => n + other.genres.filter(g => book.genres.includes(g)).length * 8, 0)
      - disliked.reduce((n, other) => n + other.genres.filter(g => book.genres.includes(g)).length * 12, 0),
    }))
    .sort((a, b) => b.score - a.score || a.index - b.index).map(row => row.book);
}
export function recommend(answers: Answers, previous: string[] = [], profile: RecommendationProfile = {}): Book[] {
  const ranked = rankedBooks(answers, profile);
  return [...ranked.filter(b => !previous.includes(b.id)), ...ranked.filter(b => previous.includes(b.id))].slice(0, 3);
}
export function reason(book: Book, answers: Answers, profile: RecommendationProfile = {}): string {
  const matching = matchingMoods(book, answers).map(id => moods.find(m => m.id === id)!.noun);
  const similar = likedBooks(answers, profile).find(other => other.id !== book.id && other.genres.some(genre => book.genres.includes(genre)));
  const fragments = [matching.length ? `Если хочется ${matching.join(' и ')}` : answers.surprise ? 'Вариант без фильтра по настроению' : 'Другой вариант подходящего объёма'];
  if (answers.time && !inRange(book.hours, answers.time)) fragments.push('короткая альтернатива для выбранного времени');
  if (similar) fragments.push(`есть общие темы с книгой «${similar.title}»`);
  fragments.push(`${duration(book.hours)} на всю книгу`);
  return fragments.join(' · ');
}
export const normalizeSearch = (value: string) => value.toLocaleLowerCase('ru').replaceAll('ё', 'е').trim();
function distance(a: string, b: string): number {
  const rows = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) rows[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) rows[i][j] = Math.min(rows[i - 1][j] + 1, rows[i][j - 1] + 1, rows[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return rows[a.length][b.length];
}
export function searchBooks(query: string): Book[] {
  const words = normalizeSearch(query).split(/\s+/).filter(Boolean);
  return books.map(book => {
    const haystack = normalizeSearch(`${book.title} ${book.author}`);
    const tokens = haystack.split(/[\s.,!?«»()-]+/);
    const exact = words.every(word => haystack.includes(word));
    const fuzzy = words.every(word => haystack.includes(word) || word.length >= 4 && tokens.some(token => distance(word, token) <= (word.length >= 8 ? 2 : 1)));
    return { book, score: exact ? 2 : fuzzy ? 1 : 0 };
  }).filter(row => row.score > 0).sort((a, b) => b.score - a.score).map(row => row.book);
}
