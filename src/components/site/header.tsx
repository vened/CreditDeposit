import Link from 'next/link';
import styles from './site.module.css';
export function SiteHeader() {
  return <><a className={styles.skip} href="#main-content">К содержанию</a><header className={styles.header}><Link className={styles.brand} href="/" aria-label="Процент — главная"><span aria-hidden="true">%</span>процент</Link><nav aria-label="Основная навигация"><Link href="/#calculators">Калькуляторы</Link><Link href="/methodology">Как считаем</Link><Link href="/#faq">Вопросы</Link></nav></header></>;
}
