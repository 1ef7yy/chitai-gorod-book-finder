import { startTransition, useEffect, useRef } from 'react';
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowRight, Bell, BookOpen, Check, CheckCheck, Clock3, MapPin, Package, ShieldCheck } from 'lucide-react';
import { allStores, bookPrice, deliveryFee, findBook, formatLabel, formats, money, otherStore, stock, stores, type BookFormat } from './data';
import { Arrow, Back, Cover, DemoNote, Duration } from './components';
import { useSelection } from './state';
import { track } from './analytics';

export function Receive() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const { state, dispatch } = useSelection();
  const book = findBook(id);
  if (!book) return <Navigate to="/" replace />;
  const selected = state.formats[book.id] || (params.get('format') === 'pickup' ? 'pickup' : 'delivery');
  return <section className="receive-page container"><Back to={`/book/${book.id}`}>К книге</Back><span className="eyebrow">ВЫ УЖЕ ВЫБРАЛИ ИСТОРИЮ</span><h1 tabIndex={-1}>Как хотите получить книгу?</h1><p className="page-description">Можно читать с экрана, заказать доставку или зайти в магазин.</p><div className="receive-layout"><div className="format-options" role="radiogroup" aria-label="Способ получения">{formats.map(option => {
    const Icon = option.id === 'ebook' ? BookOpen : option.id === 'delivery' ? Package : MapPin;
    return <label className={`format-option ${selected === option.id ? 'selected' : ''}`} key={option.id}><input type="radio" name="format" value={option.id} checked={selected === option.id} onChange={() => { dispatch({ type: 'format', bookId: book.id, format: option.id }); track('format_selected', { book: book.id, format: option.id }); }} /><span className="format-icon"><Icon size={25} /></span><span><b>{option.label}</b><span>{option.description}</span><strong>{money(bookPrice(book, option.id))}{option.id === 'delivery' ? ` + ${money(deliveryFee)} доставка` : ''}</strong></span><span className="radio-dot">{selected === option.id && <span />}</span></label>;
  })}</div><aside className="order-summary"><h2>Выбранная книга</h2><div className="summary-book"><Cover book={book} decorative /><div><b>{book.title}</b><p>{book.author}</p><Duration book={book} /></div></div><p className="receive-hint">Подбор и отрывок доступны без регистрации. Оплата и бронирование в прототипе демонстрационные.</p><Link className="button button-primary" to={`/${selected === 'pickup' ? 'pickup' : 'checkout'}/${book.id}`} onClick={() => dispatch({ type: 'format', bookId: book.id, format: selected })}><Arrow>{selected === 'pickup' ? 'Выбрать магазин' : 'Продолжить'}</Arrow></Link></aside></div><DemoNote /></section>;
}

function StoreMap({ selected, showOther }: { selected: string; showOther: boolean }) {
  const pin = (id: string, x: number, y: number) => <g transform={`translate(${x} ${y})`}><circle r="21" fill={selected === id ? '#0755ef' : '#7c8a9b'} /><path d="M-8-5h6l2 3 2-3h6V7H2L0 9l-2-2h-6z" fill="white" /></g>;
  return <div className="store-map" aria-hidden="true"><svg viewBox="0 0 600 260" preserveAspectRatio="xMidYMid slice"><defs><pattern id="map-grid" width="90" height="70" patternUnits="userSpaceOnUse" patternTransform="rotate(-15)"><rect x="10" y="8" width="60" height="45" rx="7" fill="#e8ebe6" /></pattern></defs><rect width="600" height="260" fill="#f4f5ef" /><rect width="600" height="260" fill="url(#map-grid)" /><path d="M-30 190C120 40 210 310 390 90S620 230 660 35" stroke="#c7e2ee" strokeWidth="32" fill="none" /><ellipse cx="320" cy="130" rx="120" ry="95" fill="none" stroke="white" strokeWidth="12" /><path d="M90 0L510 260M0 80L600 190M360 0L240 260" stroke="white" strokeWidth="11" /><text x="270" y="120" fill="#7b837a" fontSize="15" fontFamily="sans-serif">Москва</text>{pin('european', 137, 158)}{pin('atrium', 450, 101)}{showOther && pin('riviera', 355, 220)}</svg><span>Схема расположения · Москва</span></div>;
}

export function Checkout({ mode }: { mode: 'buy' | 'pickup' }) {
  const { id } = useParams();
  const [params, setParams] = useSearchParams();
  const { state, dispatch } = useSelection();
  const navigate = useNavigate();
  const submitted = useRef(false);
  const book = findBook(id);
  const showOther = params.get('all') === '1';
  const area = params.get('area') === 'kurskaya' ? 'kurskaya' : 'kievskaya';
  const metro = area === 'kurskaya' ? 'Курская' : 'Киевская';
  useEffect(() => { submitted.current = false; }, [id, mode]);
  if (!book) return <Navigate to="/" replace />;
  const format: BookFormat = mode === 'pickup' ? 'pickup' : state.formats[book.id] === 'ebook' ? 'ebook' : 'delivery';
  const shops = [...(showOther ? allStores : stores)].sort((a, b) => Number(b.metro === metro) - Number(a.metro === metro));
  const available = shops.filter(store => stock(book.id, store.id) > 0);
  const store = available.find(shop => shop.id === state.storeId) || available[0];
  const total = bookPrice(book, format) + (format === 'delivery' ? deliveryFee : 0);
  const canSubmit = format === 'pickup' ? Boolean(store) : format === 'delivery' ? state.deliveryAddress.trim().length >= 5 : true;
  const submit = () => {
    if (submitted.current || !canSubmit) return;
    submitted.current = true;
    const now = Date.now();
    dispatch({ type: 'confirm', value: { mode, format, bookId: book.id, storeId: store?.id, address: format === 'delivery' ? state.deliveryAddress.trim() : undefined, number: `КН-${now.toString().slice(-6)}`, createdAt: now, reserveUntil: format === 'pickup' ? now + 3 * 86400000 : undefined } });
    track('order_confirmed', { book: book.id, format, total });
    navigate('/done', { replace: true });
  };
  return <section className="checkout-page container"><Back to={`/receive/${book.id}`}>Способ получения</Back><span className="eyebrow">ОФОРМЛЕНИЕ</span><h1 tabIndex={-1}>{format === 'pickup' ? 'Где вам удобнее забрать книгу?' : format === 'ebook' ? 'Электронная книга' : 'Книга с доставкой'}</h1><p className="page-description">{format === 'pickup' ? 'Наличие и время выдачи показаны для демонстрации.' : 'Проверьте выбранную книгу и сумму демозаказа.'}</p><div className="checkout-layout"><div className="checkout-main">
    {format === 'pickup' ? <><div className="checkout-section-title"><h2>Магазины в Москве</h2><span><MapPin size={14} />{showOther ? 'Все демомагазины' : 'Два магазина'}</span></div><div className="store-area"><label htmlFor="store-area">Рядом с каким метро искать?</label><select id="store-area" value={area} onChange={event => { const value = event.target.value; setParams(current => { current.set('area', value); return current; }); dispatch({ type: 'store', id: value === 'kurskaya' ? 'atrium' : 'european' }); }}><option value="kievskaya">Киевская</option><option value="kurskaya">Курская</option></select><span>Демонстрационный район, без геолокации</span></div><StoreMap selected={store?.id || ''} showOther={showOther} /><div className="store-options" role="radiogroup" aria-label="Магазин для самовывоза">{shops.map(option => {
      const count = stock(book.id, option.id);
      return <label key={option.id} className={`store-option ${store?.id === option.id ? 'selected' : ''} ${!count ? 'store-unavailable' : ''}`}><input type="radio" name="store" value={option.id} checked={store?.id === option.id} disabled={!count} onChange={() => dispatch({ type: 'store', id: option.id })} /><span className="radio-dot">{store?.id === option.id && <span />}</span><span className="store-option-copy"><b>Читай-город {option.name}</b>{option.metro === metro && <span className="store-nearby">Рядом с выбранным метро</span>}<span>{option.address} · {option.floor}</span><span className="metro"><i style={{ background: option.color }} />{option.metro}<span>Ежедневно {option.hours}</span></span><span className="store-stock">{count ? <><Check size={13} />Демо: {count} экз. · можно забрать сегодня после 14:00</> : 'Демо: нет в наличии'}</span></span></label>;
    })}</div>{!available.length && <div className="no-stock"><Bell size={26} /><h2>В этих магазинах книги пока нет</h2><p>Можно выбрать электронную версию, посмотреть другой магазин или отметить уведомление о появлении.</p><div><Link className="button button-primary" to={`/checkout/${book.id}`} onClick={() => dispatch({ type: 'format', bookId: book.id, format: 'ebook' })}>Электронная версия</Link><button className="button button-outline" onClick={() => { setParams(current => { current.set('all', '1'); return current; }); dispatch({ type: 'store', id: otherStore.id }); track('alternative_store', { book: book.id }); }}>Другой магазин</button></div><button className="text-action" disabled={state.stockAlerts.includes(book.id)} onClick={() => { dispatch({ type: 'stock-alert', bookId: book.id }); track('stock_alert', { book: book.id }); }}>{state.stockAlerts.includes(book.id) ? 'Демо: уведомление отмечено' : 'Сообщить, когда появится'}</button><p role="status">{state.stockAlerts.includes(book.id) ? 'Отметка сохранена в этой вкладке. Настоящее сообщение не отправится.' : ''}</p></div>}<DemoNote>Наличие и бронирование демонстрационные. Магазин не получит заявку.</DemoNote></> : <div className="payment-demo"><span className="payment-icon">{format === 'ebook' ? <BookOpen size={30} /> : <Package size={30} />}</span><span className="demo-badge">ДЕМОНСТРАЦИЯ</span><h2>{format === 'ebook' ? 'Читать можно будет по ссылке' : 'Куда доставить книгу?'}</h2>{format === 'delivery' ? <><label className="delivery-label" htmlFor="delivery-address">Адрес для демозаказа</label><input id="delivery-address" className="delivery-input" value={state.deliveryAddress} maxLength={250} onChange={event => dispatch({ type: 'address', address: event.target.value })} /><p>Можно оставить вымышленный адрес из примера. Заказ не отправится, личные данные не нужны.</p></> : <p>После демопокупки появится ссылка на книгу. В прототипе по ней открывается отрывок; полный текст доступен по ссылке на Викитеку.</p>}<div className="payment-facts"><span><CheckCheck size={18} />Деньги не спишутся</span><span><ShieldCheck size={18} />Данные карты не нужны</span></div></div>}
    </div><aside className="order-summary"><h2>Выбранная книга</h2><div className="summary-book"><Cover book={book} decorative /><div><b>{book.title}</b><p>{book.author}</p><Duration book={book} /></div></div><div className="summary-line"><span>{formatLabel(format)}</span><span>{money(bookPrice(book, format))}</span></div>{format === 'delivery' && <div className="summary-line"><span>Демонстрационная доставка</span><span>{money(deliveryFee)}</span></div>}{format === 'pickup' && store && <div className="summary-pickup"><MapPin size={16} /><span><b>{store.name}</b><span>{store.address}</span></span></div>}<div className="summary-total"><span>{format === 'pickup' ? 'К оплате в магазине' : 'Сумма демозаказа'}</span><b>{money(total)}</b></div><button className="button button-primary" disabled={!canSubmit} onClick={submit}><Arrow>{format === 'pickup' ? 'Забронировать' : 'Оплатить демозаказ'}</Arrow></button><p className="summary-footnote">{format === 'pickup' ? 'Настоящая бронь не создаётся.' : 'Реальная оплата не производится.'}</p><Link className="summary-switch" to={`/receive/${book.id}`}>Изменить способ получения<ArrowRight size={14} /></Link></aside></div></section>;
}

const date = (value: number) => new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' }).format(value);
export function Done() {
  const { state, dispatch } = useSelection();
  const navigate = useNavigate();
  const confirmation = state.confirmation;
  const book = findBook(confirmation?.bookId);
  if (!confirmation || !book) return <Navigate to="/" replace />;
  const pickup = confirmation.format === 'pickup';
  const store = allStores.find(s => s.id === confirmation.storeId);
  return <section className="done-page container"><div className="done-card"><span className="success-icon"><Check size={38} strokeWidth={1.5} /></span><span className="eyebrow">ПОДТВЕРЖДЕНИЕ</span><h1 tabIndex={-1}>{pickup ? 'Демобронь оформлена' : 'Демозаказ оформлен'}</h1><p className="page-description">{pickup ? 'Так выглядело бы подтверждение бронирования.' : 'Так выглядело бы подтверждение покупки.'}</p><span className="demo-badge">{pickup ? 'ДЕМОБРОНЬ' : 'ДЕМОЗАКАЗ'} {confirmation.number}</span><div className="done-book"><Cover book={book} decorative /><div><h2>{book.title}</h2><p>{book.author} · {formatLabel(confirmation.format)}</p><Duration book={book} /></div><span>{money(bookPrice(book, confirmation.format))}</span></div>
    {pickup && store && <div className="done-store"><MapPin size={21} /><div><b>Читай-город {store.name}</b><p>{store.address} · {store.floor}</p><span>Демо: выдача сегодня после 14:00 · бронь до {date(confirmation.reserveUntil ?? confirmation.createdAt + 3 * 86400000)} включительно</span><span>Ежедневно {store.hours} · м. {store.metro}</span></div></div>}
    {confirmation.format === 'delivery' && <div className="done-store"><Package size={21} /><div><b>Демонстрационная доставка</b><p>{confirmation.address}</p><span>Доставка: {money(deliveryFee)} · всего {money(book.price + deliveryFee)}</span></div></div>}
    {confirmation.format === 'ebook' && <div className="digital-access"><BookOpen size={22} /><div><b>Ссылка на электронную книгу</b><p>В демо откроется начало произведения.</p></div><Link className="button button-secondary" to={`/read/${book.id}`}>Открыть книгу</Link></div>}
    <div className="done-notice"><ShieldCheck size={19} /><p>{pickup ? 'Это учебный прототип: настоящая бронь не создана, магазин не получил заявку.' : 'Это учебный прототип: деньги не списаны, настоящий заказ не создан.'}</p></div>
    <div className="followup-preview"><Clock3 size={20} /><div><b>Через 5–7 дней спросим о книге</b><p>{state.followupConsent ? 'В прототипе этот этап можно посмотреть сразу. Сообщения за пределы страницы не отправляются.' : 'Вы отключили вопросы о чтении.'}</p></div>{state.followupConsent && <Link className="text-action" to={`/follow-up/${book.id}`}>Посмотреть вопрос<ArrowRight size={15} /></Link>}</div>
    <div className="done-actions"><Link className="button button-primary" to={state.resultIds.length ? '/results' : '/'}><Arrow>{state.resultIds.length ? 'К моей подборке' : 'На главную'}</Arrow></Link><button className="button button-outline" onClick={() => startTransition(() => { dispatch({ type: 'reset' }); navigate('/quiz/time'); })}>Подобрать ещё книгу</button></div><p className="done-last">Хорошего вам чтения.</p></div></section>;
}
