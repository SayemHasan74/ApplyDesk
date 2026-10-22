import 'server-only';
import { load } from 'cheerio';

function flatten(value: unknown, depth = 0): Record<string, unknown>[] {
  if (depth > 20 || !value || typeof value !== 'object') return [];
  if (Array.isArray(value)) return value.flatMap((entry) => flatten(entry, depth + 1));
  const object = value as Record<string, unknown>;
  const types = Array.isArray(object['@type']) ? object['@type'] : [object['@type']];
  const result: Record<string, unknown>[] = [];
  if (types.some((type) => ['JobPosting', 'Course', 'EducationalOccupationalCredential'].includes(String(type)))) {
    const keys = ['@type', 'title', 'name', 'hiringOrganization', 'provider', 'jobLocation', 'datePosted', 'validThrough', 'employmentType', 'baseSalary', 'url', 'description'];
    const kept = Object.fromEntries(keys.filter((key) => key in object).map((key) => [key, object[key]]));
    if (typeof kept.description === 'string') kept.description = kept.description.slice(0, 2000);
    result.push(kept);
  }
  return result.concat(flatten(object['@graph'], depth + 1));
}
export function extractPage(html: string, finalUrl: string) {
  const $ = load(html);
  const jsonLd: Record<string, unknown>[] = [];
  $('script[type="application/ld+json"]').each((_, element) => {
    try { jsonLd.push(...flatten(JSON.parse($(element).text()) as unknown)); }
    catch { /* Malformed publisher metadata is ignored; visible text remains available. */ }
  });
  for (const object of jsonLd) if (typeof object.url === 'string') {
    try { object.url = new URL(object.url, finalUrl).href; } catch { delete object.url; }
  }
  $('script, style, nav, footer, header, svg, form, noscript, iframe').remove();
  const text = $('body').text().replace(/\s+/g, ' ').trim().slice(0, 20_000);
  const ok = text.length >= 500 && !/(sign in|log in|captcha|verify you are human|enable javascript)/i.test(text.slice(0, 600));
  return { jsonLd, text, ok };
}
