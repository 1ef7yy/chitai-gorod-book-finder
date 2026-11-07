// Локальные события для демонстрации воронки CJM. Сетевые запросы не выполняются.
export interface JourneyEvent { name: string; at: string; data: Record<string, string | number | boolean> }
export function track(name: string, data: JourneyEvent['data'] = {}) {
  try {
    const raw: unknown = JSON.parse(sessionStorage.getItem('chitai-events-v1') || '[]');
    const events = Array.isArray(raw) ? raw : [];
    sessionStorage.setItem('chitai-events-v1', JSON.stringify([...events.slice(-499), { name, at: new Date().toISOString(), data }]));
  } catch { /* Недоступная аналитика не прерывает подбор. */ }
}
