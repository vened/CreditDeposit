import type { Metadata } from 'next';

/** Only a configured public HTTPS origin may appear in search/social metadata. */
export function getSiteUrl(envValue: string | undefined): URL | null {
  if (!envValue?.trim()) return null;
  try {
    const url = new URL(envValue.trim());
    const host = url.hostname.toLowerCase().replace(/\.$/, '');
    if (url.protocol !== 'https:' || url.username || url.password || url.port ||
      !host.includes('.') || host === 'localhost' || host.endsWith('.localhost') ||
      host.endsWith('.local') || host.endsWith('.internal') ||
      /^[\d.]+$/.test(host) || host.includes(':')) return null;
    url.pathname = '/';
    url.search = '';
    url.hash = '';
    return url;
  } catch { return null; }
}

export const sitePaths = ['/', '/calculators/deposit', '/calculators/savings', '/calculators/loan', '/calculators/credit-card', '/methodology'] as const;

export function buildPageMetadata(path: string, title: string, description: string): Metadata {
  const site = getSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);
  const fullTitle = `${title} — Процент`;
  return {
    title: fullTitle, description,
    robots: { index: !!site, follow: !!site },
    openGraph: {
      type: 'website', locale: 'ru_RU', siteName: 'Процент', title: fullTitle, description,
      ...(site ? { url: new URL(path, site).href, images: [{ url: new URL('/share-image', site).href, width: 1200, height: 630, alt: 'Процент. Сначала посчитайте. Потом решайте.' }] } : {}),
    },
    ...(site ? { metadataBase: site, alternates: { canonical: new URL(path, site).href } } : {}),
  };
}
