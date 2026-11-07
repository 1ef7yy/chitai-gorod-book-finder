import { describe, expect, it } from 'vitest';
import { initialState, selectionReducer, type SelectionState } from './state';

const state: SelectionState = {
  ...initialState,
  answers: { time: 'medium', moods: ['escape', 'inspire'], surprise: false, favorites: ['white-nights'] },
  resultIds: ['scarlet-sails', 'dikanka', 'olesya'], hasResults: true, storeId: 'atrium',
  confirmation: { mode: 'pickup', format: 'pickup', bookId: 'scarlet-sails', storeId: 'atrium', number: 'КН-123', createdAt: 123, reserveUntil: 456 },
  purchasedIds: ['scarlet-sails'],
};
describe('persistent CJM state', () => {
  it('keeps time and experience when changing moods, invalidates only results', () => {
    const next = selectionReducer(state, { type: 'answer', payload: { moods: ['think'] } });
    expect(next.answers).toEqual({ ...state.answers, moods: ['think'] });
    expect(next.resultIds).toEqual([]); expect(next.hasResults).toBe(false);
    expect(next.confirmation).toBe(state.confirmation);
    expect(state.answers.moods).toEqual(['escape', 'inspire']);
  });
  it('distinguishes an empty completed selection from a selection not run yet', () => {
    const next = selectionReducer(state, { type: 'results', ids: [] });
    expect(next.hasResults).toBe(true); expect(next.resultIds).toEqual([]);
  });
  it('records the reading position and never loses completion when moving back', () => {
    const done = selectionReducer(state, { type: 'reader', bookId: 'scarlet-sails', progress: { page: 3, completed: true } });
    const back = selectionReducer(done, { type: 'reader', bookId: 'scarlet-sails', progress: { page: 1, completed: false } });
    expect(back.reader['scarlet-sails']).toEqual({ page: 1, completed: true });
  });
  it('remembers purchases, feedback and preferences across a new questionnaire', () => {
    const profile = { ...state, feedback: { 'scarlet-sails': 'liked' as const } };
    const next = selectionReducer(profile, { type: 'reset' });
    expect(next.answers).toEqual(initialState.answers);
    expect(next.feedback).toEqual(profile.feedback);
    expect(next.purchasedIds).toEqual(['scarlet-sails']);
  });
  it('records one answer and one reminder, then respects global opt-out', () => {
    let next = selectionReducer(state, { type: 'feedback', bookId: 'scarlet-sails', value: 'not_started' });
    next = selectionReducer(next, { type: 'feedback', bookId: 'scarlet-sails', value: 'liked' });
    expect(next.feedback['scarlet-sails']).toBe('not_started');
    next = selectionReducer(next, { type: 'reminder', bookId: 'scarlet-sails' });
    next = selectionReducer(next, { type: 'reminder', bookId: 'scarlet-sails' });
    expect(next.reminders).toEqual(['scarlet-sails']);
    next = selectionReducer(next, { type: 'opt-out' });
    expect(selectionReducer(next, { type: 'reminder', bookId: 'olesya' })).toBe(next);
    expect(selectionReducer(next, { type: 'feedback', bookId: 'olesya', value: 'liked' })).toBe(next);
  });
  it('keeps stock notifications unique and stores format per book', () => {
    const a = selectionReducer(state, { type: 'stock-alert', bookId: 'white-nights' });
    const b = selectionReducer(a, { type: 'stock-alert', bookId: 'white-nights' });
    expect(b.stockAlerts).toEqual(['white-nights']);
    expect(selectionReducer(b, { type: 'format', bookId: 'white-nights', format: 'ebook' }).formats).toEqual({ 'white-nights': 'ebook' });
  });
});
