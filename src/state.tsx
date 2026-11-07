import { createContext, useContext, useEffect, useReducer, type Dispatch, type ReactNode } from 'react';
import { allStores, books, moods, timeOptions, type BookFormat, type Mood } from './data';
import { emptyAnswers, hasMood, type Answers, type Feedback, type RecommendationProfile } from './recommend';

export const storageKey = 'chitai-selection-v2';
export interface Confirmation {
  mode: 'buy' | 'pickup'; format: BookFormat; bookId: string; storeId?: string;
  address?: string; number: string; createdAt: number; reserveUntil?: number;
}
export interface ReaderProgress { page: number; completed: boolean }
export interface SelectionState {
  answers: Answers; resultIds: string[]; hasResults: boolean;
  confirmation: Confirmation | null; storeId: string;
  formats: Record<string, BookFormat>; reader: Record<string, ReaderProgress>;
  readerSettings: { fontSize: number; theme: 'light' | 'dark' };
  feedback: Record<string, Feedback>; purchasedIds: string[]; reminders: string[];
  followupConsent: boolean; stockAlerts: string[]; deliveryAddress: string;
}
export const initialState: SelectionState = {
  answers: emptyAnswers, resultIds: [], hasResults: false, confirmation: null, storeId: 'european',
  formats: {}, reader: {}, readerSettings: { fontSize: 18, theme: 'light' },
  feedback: {}, purchasedIds: [], reminders: [], followupConsent: true, stockAlerts: [],
  deliveryAddress: 'Москва, ул. Примерная, 1',
};
type Action =
  | { type: 'answer'; payload: Partial<Answers> }
  | { type: 'results'; ids: string[] }
  | { type: 'store'; id: string }
  | { type: 'format'; bookId: string; format: BookFormat }
  | { type: 'confirm'; value: Confirmation }
  | { type: 'reader'; bookId: string; progress: ReaderProgress }
  | { type: 'reader-settings'; settings: Partial<SelectionState['readerSettings']> }
  | { type: 'feedback'; bookId: string; value: Feedback }
  | { type: 'reminder'; bookId: string }
  | { type: 'opt-out' }
  | { type: 'stock-alert'; bookId: string }
  | { type: 'address'; address: string }
  | { type: 'reset' };
export function selectionReducer(state: SelectionState, action: Action): SelectionState {
  switch (action.type) {
    case 'answer': return { ...state, answers: { ...state.answers, ...action.payload }, resultIds: [], hasResults: false };
    case 'results': return { ...state, resultIds: action.ids, hasResults: true };
    case 'store': return { ...state, storeId: action.id };
    case 'format': return { ...state, formats: { ...state.formats, [action.bookId]: action.format } };
    case 'confirm': return { ...state, confirmation: action.value, purchasedIds: [...new Set([...state.purchasedIds, action.value.bookId])] };
    case 'reader': return { ...state, reader: { ...state.reader, [action.bookId]: { page: Math.max(0, action.progress.page), completed: Boolean(state.reader[action.bookId]?.completed || action.progress.completed) } } };
    case 'reader-settings': return { ...state, readerSettings: { ...state.readerSettings, ...action.settings } };
    case 'feedback': return state.followupConsent && !state.feedback[action.bookId] ? { ...state, feedback: { ...state.feedback, [action.bookId]: action.value } } : state;
    case 'reminder': return state.followupConsent ? { ...state, reminders: [...new Set([...state.reminders, action.bookId])] } : state;
    case 'opt-out': return { ...state, followupConsent: false };
    case 'stock-alert': return { ...state, stockAlerts: [...new Set([...state.stockAlerts, action.bookId])] };
    case 'address': return { ...state, deliveryAddress: action.address };
    case 'reset': return { ...state, answers: { ...emptyAnswers, moods: [], favorites: [] }, resultIds: [], hasResults: false };
  }
}
export const recommendationProfile = (state: SelectionState): RecommendationProfile => ({ feedback: state.feedback, excludedIds: state.purchasedIds });
function restore(): SelectionState {
  try {
    const raw: unknown = JSON.parse(sessionStorage.getItem(storageKey) || 'null');
    if (!raw || typeof raw !== 'object') return initialState;
    const s = raw as Partial<SelectionState>;
    const ids = new Set(books.map(b => b.id));
    const bookIds = (value: unknown, limit = 24) => Array.isArray(value) ? [...new Set(value.filter((id): id is string => typeof id === 'string' && ids.has(id)))].slice(0, limit) : [];
    const time = timeOptions.some(t => t.id === s.answers?.time) ? s.answers!.time : null;
    const selectedMoods = Array.isArray(s.answers?.moods) ? [...new Set(s.answers.moods.filter((id): id is Mood => moods.some(m => m.id === id)))].slice(0, 2) : [];
    const surprise = s.answers?.surprise === true;
    const answers: Answers = { time, moods: surprise ? [] : selectedMoods, surprise, favorites: bookIds(s.answers?.favorites, 3) };
    const formats = Object.fromEntries(Object.entries(s.formats || {}).filter(([id, format]) => ids.has(id) && ['ebook', 'delivery', 'pickup'].includes(format)));
    const reader = Object.fromEntries(Object.entries(s.reader || {}).filter(([id, p]) => ids.has(id) && p && Number.isInteger(p.page) && p.page >= 0 && p.page < 5).map(([id, p]) => [id, { page: p.page, completed: p.completed === true }]));
    const feedback = Object.fromEntries(Object.entries(s.feedback || {}).filter(([id, value]) => ids.has(id) && ['liked', 'not_started', 'disliked'].includes(value)));
    const c = s.confirmation;
    const validDate = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && Math.abs(value) < 8.6e15;
    const confirmation: Confirmation | null = c && ids.has(c.bookId) && ['ebook', 'delivery', 'pickup'].includes(c.format) && typeof c.number === 'string' && validDate(c.createdAt) && (c.format !== 'pickup' || allStores.some(store => store.id === c.storeId)) ? {
      bookId: c.bookId, format: c.format, mode: c.format === 'pickup' ? 'pickup' : 'buy', number: c.number.slice(0, 60), createdAt: c.createdAt,
      storeId: c.format === 'pickup' ? c.storeId : undefined,
      address: c.format === 'delivery' ? typeof c.address === 'string' ? c.address.slice(0, 250) : initialState.deliveryAddress : undefined,
      reserveUntil: c.format === 'pickup' ? validDate(c.reserveUntil) ? c.reserveUntil : c.createdAt + 3 * 86400000 : undefined,
    } : null;
    const valid = time !== null && hasMood(answers);
    return {
      ...initialState, answers, formats, reader, feedback, confirmation,
      storeId: allStores.some(store => store.id === s.storeId) ? s.storeId! : 'european',
      resultIds: valid ? bookIds(s.resultIds, 3).filter(id => !answers.favorites.includes(id)) : [], hasResults: valid && s.hasResults === true,
      readerSettings: { fontSize: [16, 18, 20, 22, 24].includes(s.readerSettings?.fontSize || 0) ? s.readerSettings!.fontSize : 18, theme: s.readerSettings?.theme === 'dark' ? 'dark' : 'light' },
      purchasedIds: bookIds([...bookIds(s.purchasedIds), ...(confirmation ? [confirmation.bookId] : [])]), reminders: bookIds(s.reminders), stockAlerts: bookIds(s.stockAlerts),
      followupConsent: s.followupConsent !== false,
      deliveryAddress: typeof s.deliveryAddress === 'string' ? s.deliveryAddress.slice(0, 250) : initialState.deliveryAddress,
    };
  } catch { return initialState; }
}
const SelectionContext = createContext<{ state: SelectionState; dispatch: Dispatch<Action> } | null>(null);
export function SelectionProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(selectionReducer, undefined, restore);
  useEffect(() => { try { sessionStorage.setItem(storageKey, JSON.stringify(state)); } catch { /* Можно пройти сценарий и без storage. */ } }, [state]);
  return <SelectionContext.Provider value={{ state, dispatch }}>{children}</SelectionContext.Provider>;
}
export function useSelection() {
  const context = useContext(SelectionContext);
  if (!context) throw new Error('SelectionProvider is required');
  return context;
}
