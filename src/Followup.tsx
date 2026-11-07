import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { BellOff, Bookmark, Heart, MessageCircle, ThumbsDown } from 'lucide-react';
import { findBook } from './data';
import { Arrow, Back, Cover, DemoNote } from './components';
import { readerPageCount } from './reader-meta';
import { useSelection } from './state';
import { track } from './analytics';
import type { Feedback } from './recommend';

export function Followup() {
  const { id } = useParams();
  const book = findBook(id);
  const { state, dispatch } = useSelection();
  const navigate = useNavigate();
  if (!book || !state.purchasedIds.includes(book.id)) return <Navigate to="/" replace />;
  const answer = state.feedback[book.id];
  const choose = (value: Feedback) => {
    if (answer || !state.followupConsent) return;
    dispatch({ type: 'feedback', bookId: book.id, value });
    track('reading_feedback', { book: book.id, answer: value });
  };
  const next = () => {
    if (!state.answers.time) { navigate('/quiz/time'); return; }
    track('next_recommendations', { book: book.id });
    navigate('/matching');
  };
  const remind = () => {
    if (state.reminders.includes(book.id)) return;
    dispatch({ type: 'reminder', bookId: book.id });
    track('reading_reminder', { book: book.id });
  };
  const resume = () => {
    const saved = state.reader[book.id];
    const page = saved?.completed ? readerPageCount(book.id) - 1 : saved?.page || 0;
    dispatch({ type: 'reader', bookId: book.id, progress: { page, completed: saved?.completed || false } });
  };
  return <section className="followup-page container"><Back to="/done">К подтверждению</Back><div className="followup-card"><span className="followup-icon"><MessageCircle size={30} /></span><span className="eyebrow">ДЕМО: ПРОШЛО 5–7 ДНЕЙ</span>
    {!state.followupConsent ? <><h1 tabIndex={-1}>Больше не будем спрашивать</h1><p className="page-description">Вопросы о чтении отключены в этой вкладке. Вы по-прежнему можете подбирать книги.</p><Link className="button button-primary" to="/quiz/time"><Arrow>Подобрать книгу</Arrow></Link></> : <>
      <h1 tabIndex={-1}>{answer ? 'Спасибо, что рассказали' : `Как вам «${book.title}»?`}</h1>
      <div className="followup-book"><Cover book={book} decorative /><div><b>{book.title}</b><p>{book.author}</p></div></div>
      {!answer && <><p className="page-description">Удалось начать читать? Ответ поможет нам точнее подбирать следующие книги.</p><div className="feedback-options"><button onClick={() => choose('liked')}><Heart size={20} /><span>Читаю, нравится</span></button><button onClick={() => choose('not_started')}><Bookmark size={20} /><span>Не начал(а)</span></button><button onClick={() => choose('disliked')}><ThumbsDown size={20} /><span>Не моё</span></button></div></>}
      {answer === 'liked' && <div className="feedback-result"><h2>Подберём что-нибудь похожее</h2><p>Учтём темы этой книги в следующей подборке и не будем предлагать её снова.</p><button className="button button-primary" onClick={next}><Arrow>Показать похожие книги</Arrow></button></div>}
      {answer === 'disliked' && <div className="feedback-result"><h2>Попробуем другое</h2><p>Эту книгу больше не предложим. При следующем подборе снизим приоритет её тем.</p><button className="button button-primary" onClick={next}><Arrow>Новая подборка</Arrow></button><Link className="text-action" to="/quiz/mood">Хочу другое настроение</Link></div>}
      {answer === 'not_started' && <div className="feedback-result"><h2>Вернуться к книге можно позже</h2><p>Закладка сохранена. {state.reader[book.id]?.completed ? 'Вы остановились в конце отрывка.' : state.reader[book.id] ? `Вы остановились на странице ${state.reader[book.id].page + 1} отрывка.` : 'Начните с первых страниц, когда будет время.'}</p><Link className="button button-primary" to={`/read/${book.id}${state.reader[book.id]?.completed ? '?bookmark=end' : ''}`} onClick={resume}><Bookmark size={16} />Продолжить чтение</Link><button className="text-action" disabled={state.reminders.includes(book.id)} onClick={remind}>{state.reminders.includes(book.id) ? 'Демо: одно напоминание показано' : 'Показать напоминание с закладкой'}</button>{state.reminders.includes(book.id) && <div className="reminder-message" role="status"><Bookmark size={18} /><span>Вы откладывали «{book.title}». Книга и закладка ждут вас по кнопке «Продолжить чтение». Это единственное демонапоминание.</span></div>}</div>}
      <button className="opt-out" onClick={() => { dispatch({ type: 'opt-out' }); track('followup_opt_out'); }}><BellOff size={15} />Не спрашивать о чтении</button>
    </>}
    <DemoNote>Вопрос и напоминание показаны внутри сайта. Настоящий бот и рассылка не подключены.</DemoNote>
  </div></section>;
}
