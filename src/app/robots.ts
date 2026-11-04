import type { MetadataRoute } from 'next';
import { getSiteUrl } from '@/lib/site';
export default function robots(): MetadataRoute.Robots {
  const site = getSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);
  return site ? { rules: { userAgent: '*', allow: '/' }, sitemap: new URL('/sitemap.xml', site).href } : { rules: { userAgent: '*', disallow: '/' } };
}
