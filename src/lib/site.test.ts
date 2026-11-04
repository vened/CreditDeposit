import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildPageMetadata, getSiteUrl } from './site';
import robots from '@/app/robots';
import sitemap from '@/app/sitemap';

afterEach(() => vi.unstubAllEnvs());
describe('public site URLs', () => {
  it.each([undefined, '', 'javascript:alert(1)', 'http://example.org', 'https://localhost:3000', 'https://127.0.0.1', 'https://[::1]', 'https://10.0.0.2', 'https://user:password@example.org', 'https://demo.local', 'not a URL'])('rejects unsafe or nonpublic configuration %s', value => {
    expect(getSiteUrl(value)).toBeNull();
  });
  it('normalizes a public HTTPS URL and removes query/hash', () => {
    expect(getSiteUrl(' https://procent.example.org/?debug=1#home ')?.href).toBe('https://procent.example.org/');
  });
  it('omits canonical and absolute social URLs when no domain exists', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', '');
    const metadata = buildPageMetadata('/calculators/deposit', 'Вклад', 'Доход вклада');
    expect(metadata.alternates).toBeUndefined();
    expect(metadata.metadataBase).toBeUndefined();
    expect(metadata.openGraph ?? {}).not.toHaveProperty('url');
    expect(metadata.openGraph ?? {}).not.toHaveProperty('images');
    expect(metadata.robots).toEqual({ index: false, follow: false });
  });
  it('builds an absolute canonical and image only from the configured domain', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://procent.example.org/');
    const metadata = buildPageMetadata('/calculators/deposit', 'Вклад', 'Доход вклада');
    expect(metadata.alternates?.canonical).toBe('https://procent.example.org/calculators/deposit');
    expect(metadata.openGraph).toHaveProperty('url', 'https://procent.example.org/calculators/deposit');
    expect(metadata.robots).toEqual({ index: true, follow: true });
  });
  it('blocks crawling and returns an empty sitemap without a domain', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', '');
    expect(robots()).toEqual({ rules: { userAgent: '*', disallow: '/' } });
    expect(sitemap()).toEqual([]);
  });
  it('publishes exactly the six content routes for a configured domain', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://procent.example.org/');
    expect(robots()).toEqual({ rules: { userAgent: '*', allow: '/' }, sitemap: 'https://procent.example.org/sitemap.xml' });
    expect(sitemap().map(item => item.url)).toEqual([
      'https://procent.example.org/', 'https://procent.example.org/calculators/deposit',
      'https://procent.example.org/calculators/savings', 'https://procent.example.org/calculators/loan',
      'https://procent.example.org/calculators/credit-card', 'https://procent.example.org/methodology',
    ]);
  });
});
