import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Процент — финансовые калькуляторы',
  description: 'Расчёты вкладов, накопительных счетов, кредитов и карты со счётом на ваших условиях.',
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ru"><body>{children}</body></html>;
}
