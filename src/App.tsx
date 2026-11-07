import { lazy, Suspense, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, Navigate, Route, Routes, useLocation, useNavigate, useNavigationType, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, BookOpen, Bookmark, Check, ChevronDown, Clock3, Compass, Heart, MapPin, Moon, RefreshCw, Search, Sparkles, Sun, X, Zap } from 'lucide-react';
import { books, findBook, money, moods, stores, stock, timeOptions, type Book, type Mood } from './data';
import { hasMood, matchingMoods, normalizeSearch, reason, recommend, searchBooks } from './recommend';
import { recommendationProfile, useSelection } from './state';
import { Arrow, Back, Brand, Cover, DemoNote, Duration, PurchaseActions } from './components';
import { Checkout, Done, Receive } from './Checkout';
import { Followup } from './Followup';
import { readerPageCount } from './reader-meta';
import { track } from './analytics';
const Reader = lazy(() => import('./Reader').then(module => ({ default: module.Reader })));
const moodIcons = { Sun, Zap, Moon, Compass, Heart, Sparkles };
function MoodIcon({ mood, size = 24 }: {
    mood: typeof moods[number];
    size?: number;
}) { const Icon = moodIcons[mood.icon]; return <Icon size={size} strokeWidth={1.7} aria-hidden="true"/>; }
function NavigationEffects() {
    const location = useLocation();
    const type = useNavigationType();
    const previous = useRef(location.pathname);
    const hasNavigated = useRef(false);
    const positions = useRef<Record<string, number>>({});
    const tracked = useRef('');
    useEffect(() => {
      const key = location.pathname + location.search;
      if (tracked.current === key) return;
      tracked.current = key;
      track('page_view', { path: location.pathname, source: new URLSearchParams(window.location.search).get('utm_source') || 'direct' });
    }, [location.pathname, location.search]);
    useLayoutEffect(() => {
        if (previous.current !== location.pathname) {
            positions.current[previous.current] = window.scrollY;
            hasNavigated.current = true;
        }
        previous.current = location.pathname;
        const frame = requestAnimationFrame(() => {
            if (location.pathname.startsWith('/read/') && new URLSearchParams(location.search).get('bookmark') === 'end') {
                document.getElementById('reader-end')?.scrollIntoView({ behavior: 'instant', block: 'center' });
            }
            else if (location.hash) {
                document.getElementById(location.hash.slice(1))?.scrollIntoView({ behavior: 'instant' });
            }
            else {
                if (hasNavigated.current)
                    document.querySelector<HTMLElement>('main h1')?.focus({ preventScroll: true });
                window.scrollTo({ top: type === 'POP' || location.pathname === '/results' ? positions.current[location.pathname] || 0 : 0, behavior: 'instant' });
            }
        });
        return () => cancelAnimationFrame(frame);
    }, [location.pathname, location.hash, location.search, type]);
    return null;
}
export function App() {
    const location = useLocation();
    const home = location.pathname === '/';
    return <div className="app">
    <a className="skip-link" href="#main" onClick={event => { event.preventDefault(); document.getElementById('main')?.focus(); }}>К содержимому</a>
    <div className="announcement"><Sparkles size={13} aria-hidden="true"/><span>Поможем выбрать, что почитать</span><span className="announcement-tail">Подбор книг по настроению</span></div>
    <header className="header"><div className="header-inner">
      <Brand />
      <nav aria-label="Основная навигация"><Link className={home || location.pathname.startsWith('/quiz') || location.pathname === '/results' ? 'active' : ''} to="/">Что почитать<span className="nav-new">новое</span></Link><Link to="/#how">Как это работает</Link><Link to="/#stores">Наши магазины</Link></nav>
      <span className="header-location"><MapPin size={16} aria-hidden="true"/>Москва</span>
    </div></header>
    <NavigationEffects />
    <main id="main" tabIndex={-1}>
      <Routes>
        <Route path="/" element={<Home />}/>
        <Route path="/quiz/:step" element={<Quiz />}/>
        <Route path="/matching" element={<Matching />}/>
        <Route path="/results" element={<Results />}/>
        <Route path="/book/:id" element={<BookPage />}/>
        <Route path="/read/:id" element={<Suspense fallback={<section className="matching container"><h1 tabIndex={-1}>Открываем отрывок…</h1></section>}><Reader /></Suspense>}/>
        <Route path="/receive/:id" element={<Receive />}/>
        <Route path="/follow-up/:id" element={<Followup />}/>
        <Route path="/checkout/:id" element={<Checkout mode="buy"/>}/>
        <Route path="/pickup/:id" element={<Checkout mode="pickup"/>}/>
        <Route path="/done" element={<Done />}/>
        <Route path="*" element={<NotFound />}/>
      </Routes>
    </main>
    <footer className="footer"><div className="footer-inner"><Brand /><p>Книги по вашему вкусу.</p><span>Учебный прототип · 2026<br />Неофициальная концепция для «Читай-города»</span></div></footer>
  </div>;
}
function Home() {
    const { state, dispatch } = useSelection();
    const navigate = useNavigate();
    const startMood = (mood: Mood) => { track('selection_started', { entry: 'mood' }); dispatch({ type: 'answer', payload: { moods: [mood], surprise: false } }); navigate('/quiz/time'); };
    return <>
    <section className="hero container">
      <div className="hero-copy"><span className="eyebrow"><span className="tiny-star">✦</span> ПОДБОР КНИГ ДЛЯ ВАС</span>
        <h1 tabIndex={-1}>Найдём книгу<br />под ваше<br /><span>настроение.</span></h1>
        <p className="hero-description">Ответьте на три вопроса.<br />Подберём три книги по настроению<br className="desktop-break"/> и времени на чтение.</p>
        <Link className="button button-primary hero-button" to="/quiz/time" onClick={() => track('selection_started', { entry: 'hero' })}><Arrow>Подобрать книгу</Arrow></Link>
        <div className="hero-meta"><Clock3 size={15} aria-hidden="true"/><span>1–2 минуты</span><i /><span>3 вопроса</span><i /><span>без регистрации</span></div>
        {state.confirmation && <Link className="resume-link order-resume" to="/done">Мой демозаказ <ArrowRight size={14}/></Link>}
        {state.resultIds.length > 0 && <Link className="resume-link" to="/results">Вернуться к моей подборке <ArrowRight size={14}/></Link>}
      </div>
      <div className="hero-art" aria-hidden="true">
        <div className="art-orbit"/><div className="art-circle"/><span className="art-spark spark-one">✧</span><span className="art-spark spark-two">✦</span>
        <span className="art-caption">НА ОДИН ВЕЧЕР<br />ИЛИ НА ЦЕЛУЮ<br /><b>НЕДЕЛЮ</b><span>↗</span></span>
        <div className="floating-book book-back"><Cover book={books[6]} decorative/></div>
        <div className="floating-book book-front"><Cover book={books[0]} decorative/></div>
        <div className="floating-book book-side"><Cover book={books[16]} decorative/></div>
        <div className="art-note"><span className="note-icon"><Heart size={20} fill="currentColor"/></span><span>Кажется, это <b>то самое.</b></span></div>
        <span className="art-handwritten">Меньше поиска.<br />Больше чтения.<span>↖</span></span>
      </div>
    </section>
    <section className="how-section" id="how"><div className="container">
      <div className="section-heading"><div><span className="eyebrow">КАК МЫ ПОДБИРАЕМ КНИГИ</span><h2>Что вам хочется почитать?</h2></div><p>Расскажите о своих предпочтениях.<br />Мы учтём их при подборе.</p></div>
      <div className="how-grid">
        <div className="how-card"><span className="step-number">01</span><span className="how-icon peach"><Clock3 size={25} strokeWidth={1.5}/></span><h3>В вашем ритме</h3><p>Один свободный вечер или целая неделя?<br />Найдём книгу под ваше время.</p></div>
        <div className="how-card"><span className="step-number">02</span><span className="how-icon lavender"><Sparkles size={25} strokeWidth={1.5}/></span><h3>Под ваше настроение</h3><p>Отвлечься, посмеяться или подумать.<br />Можно выбрать одно-два настроения.</p></div>
        <div className="how-card"><span className="step-number">03</span><span className="how-icon green"><BookOpen size={25} strokeWidth={1.5}/></span><h3>Сначала попробуйте</h3><p>Три рекомендации с объяснением и отрывком.<br />Почитайте отрывок перед покупкой.</p></div>
      </div>
    </div></section>
    <section className="mood-section container"><div className="section-heading"><div><span className="eyebrow">ПРИСЛУШАЙТЕСЬ К СЕБЕ</span><h2>Чего вам хочется сегодня?</h2></div><span className="small-caption">Можно начать с ощущения</span></div>
      <div className="mood-strip">{moods.map(mood => <button key={mood.id} className={`mood-pill ${mood.color}`} onClick={() => startMood(mood.id)}><MoodIcon mood={mood} size={22}/><span>{mood.noun}</span><ArrowRight size={16}/></button>)}</div>
    </section>
    <section className="store-section container" id="stores"><div className="store-banner"><div className="store-banner-copy"><span className="eyebrow"><MapPin size={14}/> САМОВЫВОЗ ИЗ МАГАЗИНА</span><h2>Выбрали онлайн.<br />Встретимся в книжном.</h2><p>Прочитайте отрывок, выберите книгу<br />и заберите её по пути домой.</p><Link to="/quiz/time" className="text-action"><Arrow>Найти свою книгу</Arrow></Link></div><div className="store-illustration" aria-hidden="true"><div className="store-roof">читай-город</div><div className="store-awning">{Array.from({ length: 7 }, (_, i) => <i key={i}/>)}</div><div className="store-window"><div className="window-books"><i /><i /><i /><i /><i /></div><span>ХОРОШИЕ<br />ИСТОРИИ<br />ЗДЕСЬ.</span></div><div className="store-door"><i /><span /></div><div className="store-ground"/><span className="store-pin"><MapPin size={24}/></span></div></div><p className="store-disclaimer">В прототипе показаны демонстрационные магазины Москвы.</p></section>
  </>;
}
const steps = ['time', 'mood', 'books'] as const;
function Quiz() {
  const { step } = useParams();
  const [params] = useSearchParams();
  const { state, dispatch } = useSelection();
  const [query, setQuery] = useState('');
  const [limitMessage, setLimitMessage] = useState('');
  const [moodLimit, setMoodLimit] = useState('');
  const navigate = useNavigate();
  const index = steps.indexOf(step as typeof steps[number]);
  const { answers } = state;
  const returnToResults = params.get('return') === 'results';
  const hits = query.trim() ? searchBooks(query) : [books[0], books[6], books[18]];
  const selected = books.filter(book => answers.favorites.includes(book.id));
  const fuzzy = query.trim() && hits.length > 0 && !hits.some(book => normalizeSearch(query).split(/\s+/).every(word => normalizeSearch(`${book.title} ${book.author}`).includes(word)));
  const toggle = (id: string) => {
    if (answers.favorites.includes(id)) {
      dispatch({ type: 'answer', payload: { favorites: answers.favorites.filter(value => value !== id) } }); setLimitMessage('');
    } else if (answers.favorites.length < 3) {
      dispatch({ type: 'answer', payload: { favorites: [...answers.favorites, id] } }); setLimitMessage('');
    } else setLimitMessage('Можно выбрать до трёх книг. Уберите одну, чтобы добавить другую.');
  };
  const toggleMood = (id: Mood) => {
    if (answers.moods.includes(id)) {
      dispatch({ type: 'answer', payload: { moods: answers.moods.filter(value => value !== id), surprise: false } }); setMoodLimit('');
    } else if (answers.moods.length < 2) {
      dispatch({ type: 'answer', payload: { moods: [...answers.moods, id], surprise: false } }); setMoodLimit('');
    } else setMoodLimit('Можно выбрать одно-два настроения. Снимите один вариант, чтобы добавить другой.');
  };
  if (index < 0) return <Navigate to="/quiz/time" replace />;
  if (index > 0 && !answers.time) return <Navigate to="/quiz/time" replace />;
  if (index > 1 && !hasMood(answers)) return <Navigate to="/quiz/mood" replace />;
  const nextDisabled = index === 0 ? !answers.time : index === 1 ? !hasMood(answers) : selected.length === 0;
  const next = () => {
    track('quiz_step', { step: index + 1, skipped: false, time: answers.time || '', moods: answers.surprise ? 'surprise' : answers.moods.join(','), favorites: answers.favorites.length });
    navigate(index === 0 ? '/quiz/mood' : index === 1 && !returnToResults ? '/quiz/books' : '/matching');
  };
  const title = ['Сколько времени есть на чтение?', 'Чего хочется от книги?', 'Какие книги вам понравились?'][index];
  const subtitle = ['Выберите ситуацию. Подберём подходящий объём, а в карточке укажем время на всю книгу.', 'Можно выбрать одно-два настроения или доверить выбор нам.', 'По ним мы лучше поймём ваш вкус. Этот шаг можно пропустить.'][index];
  return <section className="quiz-layout container">
    <aside className="quiz-aside"><Link className="aside-back" to="/"><ArrowLeft size={17} /> На главную</Link><span className="eyebrow">ВАША СЛЕДУЮЩАЯ ИСТОРИЯ</span><h2>Выберите книгу<br />под своё<br /><em>настроение.</em></h2><p>Ответьте на три вопроса.<br />Последний можно пропустить.</p><div className="aside-steps">{['Время на чтение', 'Настроение', 'Любимые истории'].map((label, i) => <div key={label} className={i === index ? 'current' : i < index ? 'complete' : ''}><span>{i < index ? <Check size={15} /> : i + 1}</span>{label}</div>)}</div><div className="aside-decoration"><BookOpen size={70} strokeWidth={0.8} /><span>У каждой книги<br />есть свой читатель.</span><span className="aside-star">✦</span></div></aside>
    <div className="quiz-card" key={step}><div className="quiz-progress"><span>ШАГ {index + 1} ИЗ 3</span><span>{['Время', 'Настроение', 'Ваш вкус'][index]}</span></div><div className="progress-track" aria-label={`Шаг ${index + 1} из 3`}>{steps.map((s, i) => <i key={s} className={i <= index ? 'filled' : ''} />)}</div>
      <h1 tabIndex={-1}>{title}</h1><p className="page-description">{subtitle}</p>
      {index === 0 && <div className="time-options" role="radiogroup" aria-label="Время на чтение">{timeOptions.map(option => <label className={`time-option ${answers.time === option.id ? 'selected' : ''}`} key={option.id}><input type="radio" name="time" value={option.id} checked={answers.time === option.id} onChange={() => dispatch({ type: 'answer', payload: { time: option.id } })} /><span className="time-symbol"><Clock3 size={23} strokeWidth={1.4} /></span><span className="option-copy"><b>{option.label}</b><span>{option.hint}</span></span><span className="radio-dot">{answers.time === option.id && <span />}</span></label>)}</div>}
      {index === 1 && <><div className="mood-options" role="group" aria-label="Что хочется от книги">{moods.map(mood => <label className={`mood-option ${answers.moods.includes(mood.id) ? 'selected' : ''}`} key={mood.id}><input type="checkbox" name="mood" value={mood.id} checked={answers.moods.includes(mood.id)} onChange={() => toggleMood(mood.id)} /><span className={`mood-icon ${mood.color}`}><MoodIcon mood={mood} /></span><b>{mood.label}</b><span>{mood.description}</span><span className="mood-check">{answers.moods.includes(mood.id) && <Check size={14} />}</span></label>)}</div><button className={`surprise-option ${answers.surprise ? 'selected' : ''}`} aria-pressed={answers.surprise} onClick={() => { dispatch({ type: 'answer', payload: { moods: [], surprise: !answers.surprise } }); setMoodLimit(''); }}><Sparkles size={20} /><span><b>Удиви меня</b><span>Подберите без фильтра по настроению</span></span>{answers.surprise && <Check size={18} />}</button><p className="limit-message" role="status">{moodLimit}</p></>}
      {index === 2 && <div className="experience"><label className="search-label" htmlFor="book-search">Название книги или имя автора</label><div className="search-field"><Search size={19} aria-hidden="true" /><input id="book-search" type="search" placeholder="Например, Достоевский или Алые паруса" value={query} onChange={event => setQuery(event.target.value)} autoComplete="off" /></div><div className="search-meta"><span>{fuzzy ? 'Возможно, вы искали эти книги' : query.trim() ? `Найдено: ${hits.length}` : 'Возможно, вы уже читали'}</span><span>{selected.length} из 3 выбрано</span></div>
        {selected.length > 0 && <div className="selected-books" aria-label="Выбранные книги">{selected.map(book => <button className="selected-chip" key={book.id} onClick={() => toggle(book.id)} aria-label={`Убрать «${book.title}»`}>{book.title}<X size={14} /></button>)}</div>}
        <div className="search-results">{hits.length ? hits.map(book => <button key={book.id} className={`search-book ${answers.favorites.includes(book.id) ? 'selected' : ''}`} aria-pressed={answers.favorites.includes(book.id)} onClick={() => toggle(book.id)}><Cover book={book} decorative /><span><b>{book.title}</b><span>{book.author}</span></span><span className="book-checkbox">{answers.favorites.includes(book.id) ? <Check size={15} /> : <span>+</span>}</span></button>) : <div className="empty-search"><Search size={28} /><b>Пока не нашли такую книгу</b><p>В прототипе небольшой каталог. Попробуйте другого автора или пропустите этот шаг.</p><button className="text-action" onClick={() => setQuery('')}>Показать предложенные книги</button></div>}</div><p className="limit-message" role="status">{limitMessage}</p>
      </div>}
      <div className="quiz-actions"><Back to={returnToResults ? '/results' : index === 0 ? '/' : `/quiz/${steps[index - 1]}`} /><button className="button button-primary" onClick={next} disabled={nextDisabled}><Arrow>{returnToResults ? 'Обновить подборку' : index === 2 ? 'Показать книги' : 'Продолжить'}</Arrow></button></div>
      {index === 2 ? <button className="skip-step" onClick={() => { dispatch({ type: 'answer', payload: { favorites: [] } }); track('quiz_step', { step: 3, skipped: true, time: answers.time || '', moods: answers.surprise ? 'surprise' : answers.moods.join(','), favorites: 0 }); navigate('/matching'); }}>Пропустить: подобрать по времени и настроению</button> : <p className="quiz-footnote"><Bookmark size={13} />Ваш выбор сохранится, если вернуться назад</p>}
    </div>
  </section>;
}
function Matching() {
  const { state, dispatch } = useSelection();
  const navigate = useNavigate();
  const request = useRef({ answers: state.answers, previous: state.resultIds, profile: recommendationProfile(state) });
  const valid = Boolean(state.answers.time && hasMood(state.answers));
  useEffect(() => {
    if (!valid) return;
    const timeout = window.setTimeout(() => {
      const results = recommend(request.current.answers, request.current.previous, request.current.profile);
      dispatch({ type: 'results', ids: results.map(b => b.id) });
      track('results_ready', { count: results.length });
      navigate('/results', { replace: true });
    }, 2500);
    return () => window.clearTimeout(timeout);
  }, [valid, dispatch, navigate]);
  if (!valid) return <Navigate to="/quiz/time" replace />;
  return <section className="matching container"><span className="matching-icon"><Sparkles size={35} strokeWidth={1.5} /></span><span className="eyebrow">УЧИТЫВАЕМ ВАШИ ОТВЕТЫ</span><h1 tabIndex={-1}>Подбираем книги…</h1><p className="page-description" role="status">Учитываем время, настроение и то, что вам близко.</p><div className="matching-tags"><span><Clock3 size={14} />{timeOptions.find(t => t.id === state.answers.time)?.label}</span><span><Heart size={14} />{state.answers.surprise ? 'Удиви меня' : state.answers.moods.map(id => moods.find(m => m.id === id)?.label).join(' + ')}</span></div><div className="skeleton-grid" aria-hidden="true">{[1, 2, 3].map(i => <div className="skeleton-card" key={i}><div /><span /><span /><span /></div>)}</div><Back to="/quiz/books">Вернуться к ответам</Back></section>;
}
function Results() {
  const { state } = useSelection();
  const navigate = useNavigate();
  const resultBooks = state.resultIds.map(findBook).filter((b): b is Book => Boolean(b));
  const profile = recommendationProfile(state);
  if (!state.answers.time || !hasMood(state.answers)) return <Navigate to="/quiz/time" replace />;
  if (!state.hasResults) return <Navigate to="/matching" replace />;
  return <section className="results-page container"><div className="results-top"><span className="eyebrow"><Sparkles size={15} /> ПОДОБРАНО ДЛЯ ВАС</span><Link to="/quiz/time" className="edit-answers">Изменить ответы <ArrowRight size={15} /></Link></div><h1 tabIndex={-1}>{resultBooks.length ? 'Ваша подборка готова' : 'Нужны другие варианты'}</h1><p className="page-description">{resultBooks.length === 3 ? 'Три книги с учётом ваших ответов. Можно сразу прочитать отрывок.' : resultBooks.length ? 'В небольшом демокаталоге осталось меньше трёх непрочитанных книг этого объёма.' : 'В этом диапазоне закончились книги, которые вы ещё не отмечали и не покупали. Попробуйте другое время.'}</p><div className="result-filters"><span><Clock3 size={14} />{timeOptions.find(t => t.id === state.answers.time)?.label}</span>{state.answers.surprise ? <span><Sparkles size={14} />Удиви меня</span> : state.answers.moods.map(id => <span key={id}><Heart size={14} />{moods.find(m => m.id === id)?.label}</span>)}{state.answers.favorites.length > 0 && <span><Bookmark size={14} />С учётом любимых книг</span>}{Object.keys(state.feedback).length > 0 && <span><Check size={14} />Учли ваши отзывы</span>}</div>
    {!state.answers.surprise && resultBooks.some(b => matchingMoods(b, state.answers).length === 0) && <p className="catalog-note">Точных совпадений по настроению меньше трёх. Добавили другие книги подходящего объёма и отметили это в объяснениях.</p>}
    <div className="book-grid">{resultBooks.map((book, index) => <article className="book-card" key={book.id}><Link to={`/book/${book.id}`} className={`book-card-art art-tone-${index}`} aria-label={`Подробнее о книге «${book.title}»`}><span className="book-card-number">0{index + 1}</span><Cover book={book} decorative /><span className="book-card-arrow"><ArrowRight size={20} /></span></Link><div className="book-card-content"><Duration book={book} /><h2><Link to={`/book/${book.id}`}>{book.title}</Link></h2><p className="book-author">{book.author}</p><p className="book-reason"><Sparkles size={16} /><span>{reason(book, state.answers, profile)}</span></p><div className="book-card-bottom"><span className="book-price">{money(book.price)}</span><Link className="text-action" to={`/book/${book.id}`}>О книге<ArrowRight size={15} /></Link></div><Link className="button button-secondary read-result" to={`/read/${book.id}`}><BookOpen size={17} />Читать отрывок</Link><PurchaseActions book={book} compact /></div></article>)}</div>
    <div className="results-bottom"><div><b>Хочется чего-то другого?</b><p>Можно сменить настроение, сохранив остальные ответы.</p></div><div className="result-alternatives"><button className="button button-secondary" onClick={() => { track('regenerate'); navigate('/matching', { replace: true }); }}><RefreshCw size={17} />Другие варианты</button><Link className="text-action" to="/quiz/mood?return=results" onClick={() => track('change_mood')}>Не то настроение<ArrowRight size={15} /></Link></div></div>{!resultBooks.length && <Link className="button button-primary" to="/quiz/time">Изменить время</Link>}<DemoNote />
  </section>;
}
function BookPage() {
    const { id } = useParams();
    const book = findBook(id);
    const { state } = useSelection();
    const [expanded, setExpanded] = useState(false);
    useEffect(() => setExpanded(false), [id]);
    if (!book)
        return <NotFound />;
    return <section className="book-page container"><Back to={state.resultIds.length ? '/results' : '/'}>{state.resultIds.length ? 'К моей подборке' : 'На главную'}</Back><div className="book-detail"><div className="book-detail-art"><Cover book={book}/><span className="detail-art-caption">Ваша следующая история</span></div><div className="book-detail-info"><span className="eyebrow">ПОЗНАКОМЬТЕСЬ С КНИГОЙ</span><h1 tabIndex={-1}>{book.title}</h1><p className="detail-author">{book.author}</p><div className="book-detail-meta"><Duration book={book}/><span>{book.pages} стр.</span><span>Бумажная книга</span></div><div className="detail-reason"><Sparkles size={20}/><div><b>Почему она в вашей подборке</b><p>{reason(book, state.answers, recommendationProfile(state))}</p></div></div><div className="annotation"><h2>О книге</h2><p>{book.description}</p></div><div className="genre-tags">{book.genres.map(genre => <span key={genre}>{genre}</span>)}</div><div className="purchase-block"><div><span className="detail-price">{money(book.price)}</span><span className="availability"><span />Демо: доступно к заказу</span></div><Link className="button button-secondary detail-read" to={`/read/${book.id}`}><BookOpen size={17}/>Читать отрывок · {readerPageCount(book.id)} страницы</Link><PurchaseActions book={book}/><p className="pickup-preview"><MapPin size={14}/>{stores.some(store => stock(book.id, store.id) > 0) ? 'Можно проверить наличие в магазинах Москвы' : 'В двух магазинах книги нет. Покажем другие способы получения.'}</p></div></div></div>
      <div className="excerpt-layout"><div className="excerpt-intro"><span className="eyebrow">ПРОЧИТАЙТЕ ОТРЫВОК</span><h2>Откроем<br />первую страницу?</h2><p>Прочитайте несколько строк,<br />чтобы понять, нравится ли вам стиль.</p><BookOpen size={35} strokeWidth={1.2}/></div><div className="excerpt-paper"><span className="paper-label">ОТРЫВОК ИЗ КНИГИ</span><p id="book-excerpt" className={expanded ? 'excerpt expanded' : 'excerpt'}>{book.excerpt}</p><button className="text-action" onClick={() => setExpanded(value => !value)} aria-expanded={expanded} aria-controls="book-excerpt">{expanded ? 'Свернуть отрывок' : 'Показать ещё'}<ChevronDown size={17} className={expanded ? 'rotated' : ''}/></button><a className="excerpt-source" href={book.source} target="_blank" rel="noreferrer">Источник текста: Викитека ↗</a></div></div><p className="reading-note"><Clock3 size={14}/>Длительность чтения приблизительная и зависит от вашего темпа.</p><DemoNote />
    </section>;
}
function NotFound() { return <section className="not-found container"><BookOpen size={55} strokeWidth={1}/><span className="eyebrow">СТРАНИЦА НЕ НАЙДЕНА</span><h1 tabIndex={-1}>Не удалось найти страницу</h1><p className="page-description">Проверьте ссылку или вернитесь на главную, чтобы подобрать книгу.</p><Link className="button button-primary" to="/"><Arrow>На главную</Arrow></Link></section>; }
