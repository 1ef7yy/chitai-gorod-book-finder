import { useEffect, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Bookmark, Check, Minus, Moon, Plus, Sun } from 'lucide-react';
import { findBook, money } from './data';
import { getExcerpt, readerPages } from './reader';
import { useSelection } from './state';
import { Back, DemoNote, PurchaseActions } from './components';
import { track } from './analytics';

export function Reader() {
  const { id } = useParams();
  const { state, dispatch } = useSelection();
  const book = findBook(id);
  const pages = readerPages(id || '');
  const progress = state.reader[id || ''];
  const page = Math.min(progress?.page || 0, Math.max(0, pages.length - 1));
  const endRef = useRef<HTMLDivElement>(null);
  const opened = useRef('');
  const last = page === pages.length - 1;
  const complete = () => {
    if (!book || progress?.completed) return;
    dispatch({ type: 'reader', bookId: book.id, progress: { page, completed: true } });
    track('excerpt_completed', { book: book.id });
  };
  useEffect(() => {
    if (!book || opened.current === book.id) return;
    opened.current = book.id;
    track('excerpt_opened', { book: book.id });
  }, [book]);
  useEffect(() => {
    if (!last || progress?.completed || !endRef.current || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) complete();
    }, { threshold: 1 });
    observer.observe(endRef.current);
    return () => observer.disconnect();
  }, [last, page, progress?.completed, id]);
  if (!book || !pages.length) return <section className="not-found container"><h1 tabIndex={-1}>Не нашли этот отрывок</h1><Back to="/results">К подборке</Back></section>;
  const changePage = (next: number) => {
    dispatch({ type: 'reader', bookId: book.id, progress: { page: next, completed: false } });
    track('excerpt_page', { book: book.id, page: next + 1 });
    window.scrollTo({ top: 0, behavior: 'instant' });
  };
  return <section className={`reader-page ${state.readerSettings.theme === 'dark' ? 'reader-dark' : ''}`}>
    <div className="reader-container">
      <div className="reader-top"><Back to={state.resultIds.length ? '/results' : `/book/${book.id}`}>{state.resultIds.length ? 'К подборке' : 'К книге'}</Back><Link className="text-action" to={`/book/${book.id}`}>О книге</Link></div>
      <div className="reader-heading"><span className="eyebrow">НАЧАЛО ПРОИЗВЕДЕНИЯ</span><h1 tabIndex={-1}>{book.title}</h1><p>{book.author}</p></div>
      <div className="reader-toolbar" aria-label="Настройки чтения">
        <div><button aria-label="Уменьшить шрифт" disabled={state.readerSettings.fontSize <= 16} onClick={() => dispatch({ type: 'reader-settings', settings: { fontSize: state.readerSettings.fontSize - 2 } })}><Minus size={16} /></button><span aria-live="polite">{state.readerSettings.fontSize} px</span><button aria-label="Увеличить шрифт" disabled={state.readerSettings.fontSize >= 24} onClick={() => dispatch({ type: 'reader-settings', settings: { fontSize: state.readerSettings.fontSize + 2 } })}><Plus size={16} /></button></div>
        <button className="reader-theme" aria-pressed={state.readerSettings.theme === 'dark'} onClick={() => dispatch({ type: 'reader-settings', settings: { theme: state.readerSettings.theme === 'dark' ? 'light' : 'dark' } })}>{state.readerSettings.theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}Тёмная тема</button>
      </div>
      <div className="reader-bookmark"><Bookmark size={14} /><span>{progress?.completed ? 'Вы уже дошли до конца этого отрывка' : 'Закладка сохраняется в этой вкладке'}</span></div>
      <article className="reader-paper" style={{ fontSize: state.readerSettings.fontSize }} aria-label={`Страница ${page + 1} отрывка`}>
        {pages[page].split(/\n\s*\n/).filter(Boolean).map((paragraph, index) => <p key={`${page}-${index}`}>{paragraph}</p>)}
      </article>
      <div className="reader-page-controls"><button className="button button-outline" disabled={page === 0} onClick={() => changePage(page - 1)}><ArrowLeft size={16} />Назад</button><span aria-live="polite">Страница {page + 1} из {pages.length}</span><button className="button button-outline" disabled={last} onClick={() => changePage(page + 1)}>Дальше<ArrowRight size={16} /></button></div>
      {last && <div className="reader-end" id="reader-end" ref={endRef}><Bookmark size={22} /><h2>Здесь заканчивается отрывок</h2><p>Закладка останется на этом месте. Можно вернуться к подборке или выбрать, как получить книгу.</p><button className="button button-secondary" onClick={complete} disabled={progress?.completed}><Check size={16} />{progress?.completed ? 'Отрывок прочитан' : 'Я прочитал отрывок'}</button><a className="text-action" href={getExcerpt(book.id)!.source} target="_blank" rel="noreferrer">Полный текст на Викитеке ↗</a></div>}
      <a className="excerpt-source" href={getExcerpt(book.id)!.source} target="_blank" rel="noreferrer">Источник текста: Викитека ↗</a>
      <DemoNote>В демо доступны первые {pages.length} экранные страницы. Разбивка не соответствует печатному изданию.</DemoNote>
    </div>
    <div className="reader-purchase"><div><div><b>{book.title}</b><span>Бумажная книга · {money(book.price)}</span></div><PurchaseActions book={book} compact /></div></div>
  </section>;
}
