import { SiteHeader } from '@/components/site/header';
import { SiteFooter } from '@/components/site/footer';
import './globals.css';
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ru"><body><SiteHeader />{children}<SiteFooter /></body></html>;
}
