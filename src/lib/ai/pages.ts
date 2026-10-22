import 'server-only';
import { safeFetch, isLinkedIn } from '../fetch/safe-fetch';
import { extractPage } from '../fetch/extract-page';

export function extractUrls(text: string) {
  return [...new Set((text.match(/https?:\/\/[^\s<>"']+/gi) ?? []).map((value) => value.replace(/[),.;!?]+$/, '')))].slice(0, 2);
}
export async function readInputPages(text: string) {
  const urls = extractUrls(text);
  const results = await Promise.all(urls.map(async (url) => {
    try {
      if (isLinkedIn(url)) return { note: 'LinkedIn blocks automatic reading. Please paste the text or a screenshot.' };
      const page = await safeFetch(url);
      const extracted = extractPage(page.html, page.finalUrl);
      if (!extracted.ok) return { note: 'I could not read the linked page. Please paste its text or a screenshot.' };
      return { page: { url: page.finalUrl, ...extracted } };
    } catch {
      return { note: 'I could not read the linked page. Please paste its text or a screenshot.' };
    }
  }));
  const pages = results.flatMap((result) => result.page ? [result.page] : []);
  const blocked = results.flatMap((result) => result.note ? [result.note] : []);
  return { pages, urls, sources: pages.map(({ url }) => url), fetchNotes: !pages.length && urls.length ? [...new Set(blocked)].join(' ') : '' };
}
