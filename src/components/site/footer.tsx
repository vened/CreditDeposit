import Link from 'next/link';
import styles from './site.module.css';
export function SiteFooter() {
  return <footer className={styles.footer}><Link className={styles.footerBrand} href="/">процент</Link><Link href="/methodology">Методика и допущения</Link><p>Расчёты по вашим условиям.<br />Доход до НДФЛ. Все суммы в рублях.</p></footer>;
}
