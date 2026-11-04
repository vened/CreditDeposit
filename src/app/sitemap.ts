import type { MetadataRoute } from 'next';
import { getSiteUrl, sitePaths } from '@/lib/site';
export default function sitemap(): MetadataRoute.Sitemap {
  const site = getSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);
  return site ? sitePaths.map(path => ({ url: new URL(path, site).href })) : [];
}
