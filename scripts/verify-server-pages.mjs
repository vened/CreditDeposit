import assert from 'node:assert/strict';

// Checks the actual production/dev HTML boundary, including Next's automatic metadata.
const origin = process.env.VERIFY_ORIGIN || 'http://127.0.0.1:3000';
const publicOrigin = process.env.VERIFY_PUBLIC_ORIGIN;
const paths = ['/', '/calculators/deposit', '/calculators/savings', '/calculators/loan', '/calculators/credit-card', '/methodology'];
const titles = new Set();
const headings = new Set();
for (const path of paths) {
  const response = await fetch(new URL(path, origin));
  assert.equal(response.status, 200, path);
  const html = await response.text();
  const title = html.match(/<title>(.*?)<\/title>/s)?.[1];
  const h1s = [...html.matchAll(/<h1\b[^>]*>(.*?)<\/h1>/gs)];
  assert.ok(title && /[А-Яа-яЁё]/.test(title), `${path}: Russian title`);
  assert.ok(!titles.has(title), `${path}: unique title`);
  titles.add(title);
  assert.equal(h1s.length, 1, `${path}: exactly one H1`);
  const h1 = h1s[0][1].replace(/<[^>]*>/g, '');
  assert.ok(!headings.has(h1), `${path}: unique H1`);
  headings.add(h1);
  assert.equal([...html.matchAll(/<main\b/g)].length, 1, `${path}: one main`);
  assert.match(html, /<html lang="ru"/, `${path}: Russian document`);
  assert.match(html, /НДФЛ/, `${path}: tax assumption server text`);
  assert.match(html, /href="\/methodology/, `${path}: methodology link`);
  assert.doesNotMatch(html, /скачать|скачивани|экспорт|в разработке|Макет/, `${path}: no obsolete promises`);
  if (publicOrigin) {
    const canonical = new URL(path, publicOrigin).href;
    const renderedCanonical = html.match(/rel="canonical" href="([^"]+)"/)?.[1];
    assert.equal(renderedCanonical && new URL(renderedCanonical).href, canonical, `${path}: configured canonical`);
    assert.ok(html.includes(`property="og:image" content="${new URL('/share-image', publicOrigin).href}"`), `${path}: configured OG image`);
    assert.match(html, /name="robots" content="index, follow"/);
  } else {
    assert.doesNotMatch(html, /rel="canonical"/, `${path}: no canonical without domain`);
    assert.doesNotMatch(html, /property="og:(?:url|image)"/, `${path}: no automatically injected social URL`);
    assert.match(html, /name="robots" content="noindex, nofollow"/);
  }
  if (path === '/') {
    for (const calculator of paths.slice(1, 5)) assert.ok(html.includes(`href="${calculator}"`));
    assert.equal([...html.matchAll(/<details>/g)].length, 4, 'four native FAQ disclosures');
    assert.match(html, /101<!-- -->|101(?:\u00a0|&nbsp;)019,18/, 'engine example capital');
  }
  console.log(`PASS ${path}: ${title}; H1 ${h1}`);
}
const robots = await (await fetch(new URL('/robots.txt', origin))).text();
const sitemap = await (await fetch(new URL('/sitemap.xml', origin))).text();
if (publicOrigin) {
  assert.match(robots, /Allow: \//);
  assert.ok(robots.includes(new URL('/sitemap.xml', publicOrigin).href));
  assert.equal([...sitemap.matchAll(/<loc>/g)].length, 6);
} else {
  assert.match(robots, /Disallow: \//);
  assert.doesNotMatch(robots, /Sitemap:/);
  assert.doesNotMatch(sitemap, /<loc>/);
}
const image = await fetch(new URL('/share-image', origin));
assert.equal(image.status, 200);
assert.equal(image.headers.get('content-type'), 'image/png');
const bytes = Buffer.from(await image.arrayBuffer());
assert.equal(bytes.subarray(1, 4).toString(), 'PNG');
assert.equal(bytes.readUInt32BE(16), 1200);
assert.equal(bytes.readUInt32BE(20), 630);
console.log(`PASS robots/sitemap (${publicOrigin ? 'configured domain' : 'no domain'}); local OG PNG 1200×630, ${bytes.length} bytes`);
