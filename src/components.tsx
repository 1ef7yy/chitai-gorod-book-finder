import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, BookOpen, Clock3, MapPin, ShieldCheck, ShoppingBag } from 'lucide-react';
import type { ReactNode } from 'react';
import { duration, type Book, type BookFormat } from './data';
import { useSelection } from './state';
import { track } from './analytics';

export function Brand() {
  return <Link className="brand" to="/" aria-label="Читай-город — на главную"><span className="brand-mark"><BookOpen size={25} strokeWidth={2.4} /></span><span>читай<span className="brand-break">город</span></span><span className="brand-dot">•</span></Link>;
}
export function Arrow({ children }: { children: ReactNode }) { return <>{children}<ArrowRight size={19} aria-hidden="true" /></>; }
export function Cover({ book, className = '', decorative = false }: { book: Book; className?: string; decorative?: boolean }) {
  return <img className={`cover ${className}`} src={book.cover} alt={decorative ? '' : `Обложка книги «${book.title}»`} width="320" height="460" draggable="false" />;
}
export function DemoNote({ children = 'Учебный прототип. Цены и наличие демонстрационные.' }: { children?: ReactNode }) { return <p className="demo-note"><ShieldCheck size={15} aria-hidden="true" />{children}</p>; }
export function Back({ to, children = 'Назад' }: { to: string; children?: ReactNode }) { return <Link className="back-link" to={to}><ArrowLeft size={17} aria-hidden="true" />{children}</Link>; }
export function Duration({ book }: { book: Book }) { return <span className="duration"><Clock3 size={14} aria-hidden="true" />{duration(book.hours)} на всю книгу</span>; }
export function PurchaseActions({ book, compact = false }: { book: Book; compact?: boolean }) {
  const { dispatch } = useSelection();
  const select = (format: BookFormat) => {
    dispatch({ type: 'format', bookId: book.id, format });
    track('purchase_intent', { book: book.id, format });
  };
  return <div className={`purchase-buttons ${compact ? 'compact-purchase' : ''}`}>
    <Link className="button button-primary" to={`/receive/${book.id}?format=delivery`} onClick={() => select('delivery')}><ShoppingBag size={17} />Купить</Link>
    <Link className="button button-outline" to={`/receive/${book.id}?format=pickup`} onClick={() => select('pickup')}><MapPin size={17} />Взять в магазине</Link>
  </div>;
}
