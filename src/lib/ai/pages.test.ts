import { beforeEach, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
const mocks = vi.hoisted(() => ({ fetch: vi.fn(), extract: vi.fn() }));
vi.mock('../fetch/safe-fetch', () => ({ safeFetch: mocks.fetch, isLinkedIn: (url: string) => new URL(url).hostname.endsWith('linkedin.com') }));
vi.mock('../fetch/extract-page', () => ({ extractPage: mocks.extract }));
import { extractUrls, readInputPages } from './pages';

beforeEach(() => { vi.resetAllMocks(); mocks.fetch.mockResolvedValue({ finalUrl: 'https://example.com/final', html: 'page' }); mocks.extract.mockReturnValue({ text: 'Usable', jsonLd: [], ok: true }); });
it('extracts at most two distinct URLs and trims sentence punctuation', () => {
  expect(extractUrls('See https://one.com/path, https://two.com. https://three.com')).toEqual(['https://one.com/path', 'https://two.com']);
});
it('never fetches LinkedIn and returns screenshot guidance when all links fail', async () => {
  const result = await readInputPages('https://www.linkedin.com/jobs');
  expect(mocks.fetch).not.toHaveBeenCalled(); expect(result.fetchNotes).toContain('LinkedIn blocks automatic reading');
  mocks.fetch.mockRejectedValue(new Error('network'));
  expect((await readInputPages('https://example.com')).fetchNotes).toContain('paste');
});
it('accepts usable pages, records final sources and discards login walls', async () => {
  const result = await readInputPages('https://example.com');
  expect(result.sources).toEqual(['https://example.com/final']); expect(result.pages).toHaveLength(1);
  mocks.extract.mockReturnValue({ text: 'Log in', jsonLd: [], ok: false });
  expect((await readInputPages('https://example.com')).pages).toEqual([]);
});
