import 'server-only';
import { lookup } from 'node:dns';
import { request as httpRequest, type RequestOptions } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { isIP } from 'node:net';
import { isPublicIp } from './ip';

export function isLinkedIn(url: string) {
  return new URL(url).hostname.toLowerCase().replace(/\.+$/, '').endsWith('linkedin.com');
}
export function validateFetchUrl(value: string) {
  const url = new URL(value);
  const host = url.hostname.replace(/^\[|\]$/g, '');
  if (!['http:', 'https:'].includes(url.protocol) || !['', '80', '443'].includes(url.port)
    || url.username || url.password || !host.includes('.') || isLinkedIn(url.href)
    || (isIP(host) && !isPublicIp(host))) throw new Error('Page address is not allowed');
  return url;
}
export const publicLookup: NonNullable<RequestOptions['lookup']> = (host, options, callback) => {
  lookup(host, { all: true }, (error, addresses) => {
    if (error) return callback(error, '', 4);
    if (!addresses.length || addresses.some(({ address }) => !isPublicIp(address))) return callback(new Error('Non-public address'), '', 4);
    if (options.all) callback(null, addresses);
    else {
      const selected = addresses.find(({ family }) => !options.family || family === options.family) ?? addresses[0];
      callback(null, selected.address, selected.family);
    }
  });
};
function readHop(url: URL, signal: AbortSignal): Promise<{ location?: string; html?: string }> {
  return new Promise((resolve, reject) => {
    const request = (url.protocol === 'https:' ? httpsRequest : httpRequest)(url, {
      lookup: publicLookup, signal, agent: false, headers: {
        'Accept-Encoding': 'identity', Accept: 'text/html,application/xhtml+xml',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      },
    }, (response) => {
      response.on('error', reject);
      if ([301, 302, 303, 307, 308].includes(response.statusCode ?? 0) && response.headers.location) {
        response.destroy();
        return resolve({ location: response.headers.location });
      }
      const type = response.headers['content-type']?.split(';')[0].trim().toLowerCase();
      if ((response.statusCode ?? 500) >= 400 || !type || !['text/html', 'application/xhtml+xml', 'text/plain'].includes(type)
        || !['identity', undefined].includes(response.headers['content-encoding'])) {
        response.destroy();
        return reject(new Error('Page could not be read'));
      }
      const chunks: Buffer[] = [];
      let size = 0;
      response.on('data', (chunk: Buffer) => {
        size += chunk.length;
        if (size > 1_500_000) { request.destroy(new Error('Page is too large')); return; }
        chunks.push(chunk);
      });
      response.on('end', () => resolve({ html: Buffer.concat(chunks).toString('utf8') }));
      response.on('aborted', () => reject(new Error('Page transfer stopped')));
    });
    request.on('error', reject);
    request.end();
  });
}
export async function safeFetch(value: string) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    let url = validateFetchUrl(value);
    for (let hop = 0; hop <= 3; hop++) {
      const result = await readHop(url, controller.signal);
      if (!result.location) return { finalUrl: url.href, html: result.html ?? '' };
      if (hop === 3) throw new Error('Too many redirects');
      url = validateFetchUrl(new URL(result.location, url).href);
    }
    throw new Error('Page could not be read');
  } finally { clearTimeout(timer); }
}
