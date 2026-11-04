import { Landing } from '@/components/site/landing';
import { buildPageMetadata } from '@/lib/site';
export const metadata = buildPageMetadata('/', 'Финансовые калькуляторы онлайн', 'Посчитайте доход вклада и накопительного счёта, платежи по кредиту и выгоду карты. Ручной ввод условий, понятная расшифровка, без регистрации.');
export default function Home() { return <Landing />; }
