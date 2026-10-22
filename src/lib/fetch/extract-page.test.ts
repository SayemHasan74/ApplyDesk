import { expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { extractPage } from './extract-page';

it('flattens arrays and graphs, keeps relevant types and fields, resolves metadata URLs', () => {
  const metadata = [{ '@graph': [{ '@type': 'JobPosting', title: 'Engineer', description: 'a'.repeat(3000), url: '/apply', ignored: 'secret' },
    { '@type': ['Thing', 'Course'], name: 'Cloud' }, { '@type': 'Organization', name: 'discard' }] }];
  const result = extractPage(`<body><script type="application/ld+json">${JSON.stringify(metadata)}</script><p>${'job content '.repeat(100)}</p><nav>remove navigation</nav><script>hidden</script></body>`, 'https://example.com/job');
  expect(result.ok).toBe(true);
  expect(result.jsonLd).toHaveLength(2);
  expect(result.jsonLd[0]).toMatchObject({ title: 'Engineer', url: 'https://example.com/apply', description: 'a'.repeat(2000) });
  expect(result.jsonLd[0]).not.toHaveProperty('ignored');
  expect(result.text).not.toContain('navigation'); expect(result.text).not.toContain('hidden');
});
it.each(['', '<body>Short text</body>', `<body>Sign in to continue ${'content '.repeat(100)}</body>`, `<body>Verify you are human ${'content '.repeat(100)}</body>`])('flags inaccessible/empty pages', (html) => {
  expect(extractPage(html, 'https://example.com').ok).toBe(false);
});
it('ignores malformed metadata while retaining visible text and bounds extraction', () => {
  const result = extractPage(`<script type="application/ld+json">{broken</script><body>${'a '.repeat(15000)}</body>`, 'https://example.com');
  expect(result.jsonLd).toEqual([]); expect(result.text).toHaveLength(20000);
});
