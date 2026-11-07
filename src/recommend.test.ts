import { describe, expect, it } from 'vitest';
import { books, moods, timeOptions } from './data';
import { emptyAnswers, fitsTime, inRange, matchingMoods, rankedBooks, reason, recommend, searchBooks, type Answers } from './recommend';

const answers: Answers = { time: 'medium', moods: ['escape'], surprise: false, favorites: [] };
describe('recommendations for CJM', () => {
  it('keeps 24 different books and six in each volume band', () => {
    expect(new Set(books.map(b => b.id)).size).toBe(24);
    for (const time of timeOptions) expect(books.filter(b => inRange(b.hours, time.id))).toHaveLength(6);
  });
  it.each(timeOptions.flatMap(time => moods.map(mood => [time.id, mood.id] as const)))('respects volume and prioritizes %s / %s', (time, mood) => {
    const a: Answers = { ...answers, time, moods: [mood] };
    const result = recommend(a);
    expect(result).toHaveLength(3);
    expect(new Set(result.map(b => b.id)).size).toBe(3);
    expect(result.every(b => fitsTime(b.hours, time))).toBe(true);
    const count = books.filter(b => fitsTime(b.hours, time) && matchingMoods(b, a).length).length;
    expect(count).toBeGreaterThan(0);
    expect(result.filter(b => matchingMoods(b, a).length)).toHaveLength(Math.min(3, count));
  });
  it.each(timeOptions.flatMap(time => moods.flatMap((a, i) => moods.slice(i + 1).map(b => [time.id, a.id, b.id] as const))))('uses both selected feelings for %s / %s + %s', (time, first, second) => {
    const a: Answers = { ...answers, time, moods: [first, second] };
    const ranked = rankedBooks(a);
    const counts = ranked.map(b => matchingMoods(b, a).length);
    expect(counts).toEqual([...counts].sort((a, b) => b - a));
    expect(recommend(a)).toHaveLength(3);
  });
  it('supports surprise without moods and preserves optional experience', () => {
    expect(recommend({ ...emptyAnswers, time: 'short', surprise: true })).toHaveLength(3);
    expect(recommend({ ...emptyAnswers, time: 'short' })).toEqual([]);
    expect(reason(books[0], { ...emptyAnswers, time: 'short', surprise: true })).toContain('без фильтра по настроению');
  });
  it('keeps unambiguous volume boundaries', () => {
    for (const [n, yes, no] of [[2, 'short', 'medium'], [5, 'medium', 'long'], [10, 'long', 'epic']] as const) {
      expect(inRange(n, yes)).toBe(true); expect(inRange(n, no)).toBe(false);
    }
  });
  it('excludes read books and rotates the triplet when alternatives exist', () => {
    const first = recommend(answers), second = recommend(answers, first.map(b => b.id));
    expect(second.every(b => !first.some(p => p.id === b.id))).toBe(true);
    expect(recommend(answers, second.map(b => b.id)).map(b => b.id)).toEqual(first.map(b => b.id));
    const withFavorites = recommend({ ...answers, favorites: first.map(b => b.id) });
    expect(withFavorites.every(b => !first.some(p => p.id === b.id))).toBe(true);
  });
  it('does not bring purchased or rated books back, including after exhaustion', () => {
    const ids = books.filter(b => fitsTime(b.hours, 'medium')).map(b => b.id);
    expect(recommend(answers, [], { excludedIds: ids })).toEqual([]);
    const result = recommend(answers, [], { excludedIds: ids.slice(0, -2), feedback: { [ids[ids.length - 2]]: 'disliked' } });
    expect(result.map(b => b.id)).toEqual([ids[ids.length - 1]]);
  });
  it('uses positive feedback as experience and negative feedback to change ranking', () => {
    expect(recommend(answers)[0].id).toBe('scarlet-sails');
    expect(recommend(answers, [], { feedback: { 'white-nights': 'disliked' } })[0].id).toBe('dikanka');
    const profile = { feedback: { 'white-nights': 'liked' as const } };
    expect(reason(books.find(b => b.id === 'scarlet-sails')!, answers, profile)).toContain('Белые ночи');
  });
  it('does not claim a mood match or shared themes when none exist', () => {
    const book = books.find(b => b.id === 'ivan-ilyich')!;
    const a: Answers = { ...answers, moods: ['laugh'], favorites: ['dikanka'] };
    expect(reason(book, a)).toMatch(/^Другой вариант подходящего объёма/);
    expect(reason(book, a)).not.toContain('Диканьки');
  });
});
describe('search with typo correction', () => {
  it('finds a title and author, normalizes case and ё', () => {
    expect(searchBooks('  федор ДОСТОЕВСКИЙ ')).toHaveLength(4);
    expect(searchBooks('мертвые')[0].id).toBe('dead-souls');
    expect(searchBooks('грин паруса').map(b => b.id)).toEqual(['scarlet-sails']);
  });
  it('handles missing or mistaken letters without inventing results', () => {
    expect(searchBooks('достоевскии')).toHaveLength(4);
    expect(searchBooks('алые парус')[0].id).toBe('scarlet-sails');
    expect(searchBooks('такой книги нет')).toEqual([]);
    expect(searchBooks('кся')).toEqual([]);
  });
});
