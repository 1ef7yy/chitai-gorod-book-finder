// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';
import { books } from './data';
import { SelectionProvider, initialState, storageKey } from './state';

let root: Root;
let container: HTMLDivElement;
async function mount() {
  container = document.createElement('div'); document.body.append(container); root = createRoot(container);
  await act(async () => { root.render(<HashRouter><SelectionProvider><App /></SelectionProvider></HashRouter>); });
  await act(async () => { await vi.dynamicImportSettled(); });
}
async function remount() { await act(async () => root.unmount()); container.remove(); await mount(); }
async function click(el: Element | null | undefined) { if (!el) throw new Error('Expected an interactive element'); await act(async () => { (el as HTMLElement).click(); }); await act(async () => { await vi.dynamicImportSettled(); }); }
const button = (text: string) => Array.from(document.querySelectorAll('button')).find(el => el.textContent?.includes(text));
const link = (text: string) => Array.from(document.querySelectorAll('a')).find(el => el.textContent?.includes(text));
const heading = () => document.querySelector('h1')?.textContent;
const saved = () => JSON.parse(sessionStorage.getItem(storageKey)!);
const triplet = () => Array.from(document.querySelectorAll('.book-card h2')).map(el => el.textContent);
async function matching() { await act(async () => { await vi.advanceTimersByTimeAsync(2500); }); }
async function input(selector: string, text: string) {
  await act(async () => { const el = document.querySelector<HTMLInputElement>(selector)!; Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(el, text); el.dispatchEvent(new Event('input', { bubbles: true })); });
}
async function basics() {
  await click(link('Подобрать книгу'));
  expect((button('Продолжить') as HTMLButtonElement).disabled).toBe(true);
  await click(document.querySelector('input[value="medium"]'));
  await click(button('Продолжить'));
  await click(document.querySelector('input[value="escape"]'));
  await click(button('Продолжить'));
}
async function results() { await basics(); await click(button('Пропустить:')); await matching(); }
async function ebookFromCurrent() {
  await click(link('Купить'));
  await click(document.querySelector('input[value="ebook"]'));
  await click(link('Продолжить'));
  await click(button('Оплатить демозаказ'));
}
beforeEach(() => {
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  HTMLElement.prototype.scrollIntoView = vi.fn(); sessionStorage.clear(); window.history.replaceState(null, '', '/');
});
afterEach(async () => { if (root) await act(async () => root.unmount()); container?.remove(); vi.restoreAllMocks(); vi.useRealTimers(); });

describe('CJM through rendered React screens', () => {
  it('supports two moods, limits the third, and changes mood without repeating other questions', async () => {
    await mount(); await basics();
    await click(link('Назад'));
    await click(document.querySelector('input[value="inspire"]'));
    await click(document.querySelector('input[value="think"]'));
    expect(document.querySelector('[role="status"]')?.textContent).toContain('одно-два настроения');
    expect((document.querySelector('input[value="think"]') as HTMLInputElement).checked).toBe(false);
    await click(button('Продолжить'));
    await click(document.querySelector('.search-book'));
    await click(button('Показать книги')); await matching();
    expect(triplet()).toHaveLength(3);
    await click(link('Не то настроение'));
    expect(heading()).toBe('Чего хочется от книги?');
    await click(document.querySelector('input[value="escape"]'));
    await click(button('Обновить подборку')); await matching();
    expect(saved().answers.favorites).toEqual(['white-nights']);
    expect(saved().answers.time).toBe('medium');
    expect(heading()).toBe('Ваша подборка готова');
  });
  it('supports surprise, typo correction, empty search, and optional experience', async () => {
    await mount(); await basics(); await click(link('Назад'));
    await click(button('Удиви меня')); await click(button('Продолжить'));
    await input('#book-search', 'алые парус');
    expect(document.querySelector('.search-book')?.textContent).toContain('Алые паруса');
    await input('#book-search', 'совсем неизвестная книга');
    expect(document.querySelector('.empty-search')).not.toBeNull();
    await click(button('Пропустить:')); expect(heading()).toBe('Подбираем книги…'); await matching();
    expect(triplet()).toHaveLength(3); expect(saved().answers).toMatchObject({ moods: [], surprise: true, favorites: [] });
  });
  it('changes all three results and preserves the current triplet on return', async () => {
    await mount(); await results();
    const first = triplet(); await click(button('Другие варианты')); await matching();
    const second = triplet(); expect(second.every(title => !first.includes(title))).toBe(true);
    await click(link('Читать отрывок'));
    await click(link('К подборке'));
    expect(triplet()).toEqual(second);
  });
  it('keeps reader page, font, dark theme and completion after reload', async () => {
    await mount(); await results(); await click(link('Читать отрывок'));
    expect(document.querySelector('.reader-paper')?.textContent?.length).toBeGreaterThan(600);
    await click(button('Увеличить шрифт') || document.querySelector('[aria-label="Увеличить шрифт"]'));
    await click(button('Тёмная тема'));
    await click(button('Дальше'));
    await remount();
    expect(document.querySelector('.reader-dark')).not.toBeNull();
    expect(document.querySelector<HTMLElement>('.reader-paper')?.style.fontSize).toBe('20px');
    expect(document.querySelector('.reader-page-controls')?.textContent).toContain('Страница 2');
    while (!(button('Дальше') as HTMLButtonElement).disabled) await click(button('Дальше'));
    await click(button('Я прочитал отрывок'));
    expect(button('Отрывок прочитан')).toBeDefined();
    expect(Object.values(saved().reader).some((p: unknown) => (p as {completed: boolean}).completed)).toBe(true);
  });
  it('reserves from the reader, persists store, and shows expiry and pickup time', async () => {
    await mount(); await results(); const first = triplet();
    await click(link('Читать отрывок')); await click(link('Взять в магазине'));
    expect(heading()).toBe('Как хотите получить книгу?');
    await click(link('Выбрать магазин'));
    await click(document.querySelector('input[value="atrium"]'));
    await remount(); expect((document.querySelector('input[value="atrium"]') as HTMLInputElement).checked).toBe(true);
    await click(button('Забронировать'));
    expect(heading()).toBe('Демобронь оформлена');
    expect(document.querySelector('.done-store')?.textContent).toContain('Земляной Вал, 33');
    expect(document.querySelector('.done-store')?.textContent).toContain('бронь до');
    await remount(); expect(document.querySelector('.done-store')?.textContent).toContain('после 14:00');
    await click(link('К моей подборке')); expect(triplet()).toEqual(first);
  });
  it('handles unavailable stores, one stock alert and an available alternative', async () => {
    window.history.replaceState(null, '', '/#/pickup/white-nights?area=kurskaya'); await mount();
    expect(document.querySelector('.no-stock')).not.toBeNull();
    expect((button('Забронировать') as HTMLButtonElement).disabled).toBe(true);
    await click(button('Сообщить, когда появится'));
    expect(document.querySelector('.no-stock [role="status"]')?.textContent).toContain('не отправится');
    await remount(); expect((button('уведомление отмечено') as HTMLButtonElement).disabled).toBe(true);
    await click(button('Другой магазин'));
    expect(window.location.hash).toContain('area=kurskaya');
    expect((document.querySelector('input[value="riviera"]') as HTMLInputElement).checked).toBe(true);
    await click(button('Забронировать'));
    expect(document.querySelector('.done-store')?.textContent).toContain('Автозаводская, 18');
  });
  it('offers electronic version from no-stock state and issues its reading link', async () => {
    window.history.replaceState(null, '', '/#/pickup/white-nights'); await mount();
    await click(link('Электронная версия'));
    expect(document.querySelectorAll('input')).toHaveLength(0);
    await click(button('Оплатить демозаказ'));
    expect(document.querySelector('.digital-access')).not.toBeNull();
    await click(link('Открыть книгу'));
    expect(heading()).toBe('Белые ночи');
  });
  it('validates demo delivery address and confirms the selected format', async () => {
    await mount(); await results(); await click(link('Купить')); await click(link('Продолжить'));
    await input('#delivery-address', ''); expect((button('Оплатить демозаказ') as HTMLButtonElement).disabled).toBe(true);
    await input('#delivery-address', 'Демонстрационный адрес, 5'); await click(button('Оплатить демозаказ'));
    expect(document.querySelector('.done-store')?.textContent).toContain('Демонстрационный адрес, 5');
    expect(document.querySelector('.done-notice')?.textContent).toContain('деньги не списаны');
  });
  it('learns from positive feedback and avoids the bought book in next results', async () => {
    await mount(); await results(); await ebookFromCurrent();
    const purchased = saved().confirmation.bookId;
    await click(link('Посмотреть вопрос')); await click(button('Читаю, нравится'));
    await remount(); expect(heading()).toBe('Спасибо, что рассказали');
    await click(button('Показать похожие книги')); await matching();
    expect(saved().resultIds).not.toContain(purchased);
    expect(document.querySelector('.result-filters')?.textContent).toContain('Учли ваши отзывы');
    expect(saved().feedback[purchased]).toBe('liked');
  });
  it('shows one reminder, restores the bookmark, and respects opt-out', async () => {
    await mount(); await results(); await click(link('Читать отрывок')); await click(button('Дальше'));
    await ebookFromCurrent(); await click(link('Посмотреть вопрос')); await click(button('Не начал(а)'));
    await click(button('Показать напоминание с закладкой')); await remount();
    expect((button('одно напоминание показано') as HTMLButtonElement).disabled).toBe(true);
    await click(link('Продолжить чтение'));
    expect(document.querySelector('.reader-page-controls')?.textContent).toContain('Страница 2');
    const id = saved().confirmation.bookId;
    await act(async () => { window.history.pushState(null, '', `/#/follow-up/${id}`); window.dispatchEvent(new PopStateEvent('popstate')); });
    await click(button('Не спрашивать о чтении')); await remount();
    expect(heading()).toBe('Больше не будем спрашивать');
    expect(saved().followupConsent).toBe(false);
  });
  it('records negative feedback and lets the reader change mood immediately', async () => {
    await mount(); await results(); await ebookFromCurrent();
    await click(link('Посмотреть вопрос')); await click(button('Не моё'));
    expect(saved().feedback[saved().confirmation.bookId]).toBe('disliked');
    await click(link('Хочу другое настроение'));
    expect(heading()).toBe('Чего хочется от книги?');
  });
  it('does not loop when the selected range is exhausted', async () => {
    const ids = books.filter(book => book.hours <= 5).map(book => book.id);
    sessionStorage.setItem(storageKey, JSON.stringify({ ...initialState, answers: { time: 'medium', moods: ['escape'], surprise: false, favorites: [] }, resultIds: [], hasResults: true, purchasedIds: ids }));
    window.history.replaceState(null, '', '/#/results'); await mount();
    expect(heading()).toBe('Нужны другие варианты'); expect(document.querySelector('.matching')).toBeNull();
    expect(link('Изменить время')).toBeDefined();
  });
  it('recovers from corrupt storage and works with unavailable storage', async () => {
    sessionStorage.setItem(storageKey, '{broken'); window.history.replaceState(null, '', '/#/quiz/books'); await mount();
    expect(heading()).toBe('Сколько времени есть на чтение?');
    await act(async () => root.unmount()); container.remove(); window.history.replaceState(null, '', '/');
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('Unavailable'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Unavailable'); });
    await mount(); await results(); expect(triplet()).toHaveLength(3);
  });
  it('cancels interrupted matching before running a new set of answers', async () => {
    await mount(); await basics(); await click(button('Пропустить:'));
    await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
    await click(link('Вернуться к ответам')); await click(link('Назад'));
    await click(document.querySelector('input[value="escape"]')); await click(document.querySelector('input[value="thrill"]'));
    await click(button('Продолжить')); await click(button('Пропустить:'));
    await act(async () => { await vi.advanceTimersByTimeAsync(1500); });
    expect(heading()).toBe('Подбираем книги…');
    await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
    expect(triplet()[0]).toBe('Игрок');
  });
  it('limits prior books to three and lets users replace one', async () => {
    await mount(); await basics();
    for (let i = 0; i < 3; i++) await click(document.querySelectorAll('.search-book')[i]);
    await input('#book-search', 'Олеся'); await click(document.querySelector('.search-book'));
    expect(document.querySelector('[role="status"]')?.textContent).toContain('до трёх книг');
    expect(document.querySelectorAll('.selected-chip')).toHaveLength(3);
    await click(document.querySelector('.selected-chip')); await click(document.querySelector('.search-book'));
    expect(saved().answers.favorites).toContain('olesya');
    expect(saved().answers.favorites).toHaveLength(3);
  });
  it('sorts shops by the chosen demo area and keeps it after reload', async () => {
    window.history.replaceState(null, '', '/#/pickup/scarlet-sails'); await mount();
    await act(async () => { const select = document.querySelector<HTMLSelectElement>('#store-area')!; select.value = 'kurskaya'; select.dispatchEvent(new Event('change', { bubbles: true })); });
    await remount();
    expect(document.querySelector('.store-option')?.textContent).toContain('Атриум');
    expect((document.querySelector('input[value="atrium"]') as HTMLInputElement).checked).toBe(true);
  });
  it('sanitizes partial stored orders and reader settings', async () => {
    sessionStorage.setItem(storageKey, JSON.stringify({ ...initialState, confirmation: { mode: 'broken', format: 'delivery', bookId: 'white-nights', number: 'ДЕМО', createdAt: Date.now(), address: { invalid: true } }, readerSettings: { fontSize: 900, theme: 'broken' } }));
    window.history.replaceState(null, '', '/#/done'); await mount();
    expect(heading()).toBe('Демозаказ оформлен');
    expect(document.querySelector('.done-store')?.textContent).toContain('ул. Примерная, 1');
    expect(saved().readerSettings).toEqual({ fontSize: 18, theme: 'light' });
  });
});
