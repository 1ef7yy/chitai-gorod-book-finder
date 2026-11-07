import { describe, expect, it } from 'vitest';
import { books, stock, stores, otherStore } from './data';
import { getExcerpt, readerPages } from './reader';
import { readerPageCount } from './reader-meta';

describe('local authentic reading samples', () => {
  it.each(books)('has a multi-page opening for $title without dropped text', book => {
    const excerpt = getExcerpt(book.id)!;
    const pages = readerPages(book.id);
    expect(pages.length).toBeGreaterThanOrEqual(3);
    expect(pages.length).toBeLessThanOrEqual(5);
    expect(pages.length).toBe(readerPageCount(book.id));
    expect(excerpt.text.split(/\s+/).length).toBeGreaterThan(400);
    expect(pages.join(' ').replace(/\s+/g, ' ').trim()).toBe(excerpt.text.replace(/\s+/g, ' ').trim());
    expect(excerpt.text).not.toMatch(/Главное меню|Источник —|Скрытые категории|Это произведение перешло/);
    expect(excerpt.source).toMatch(/^https:\/\/ru\.wikisource\.org\/wiki\//);
  });
  it('has available, unavailable and alternative-store scenarios', () => {
    expect(stores.every(s => stock('white-nights', s.id) === 0)).toBe(true);
    expect(stock('white-nights', otherStore.id)).toBeGreaterThan(0);
    expect(stores.every(s => stock('scarlet-sails', s.id) > 0)).toBe(true);
    expect(stock('missing', 'european')).toBe(0);
  });
});
