import { readFileSync, existsSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { runInNewContext } from 'node:vm';

const build = JSON.parse(readFileSync('.next/build-manifest.json', 'utf8'));
const paths = JSON.parse(readFileSync('.next/server/app-paths-manifest.json', 'utf8'));
let overBudget = false;
for (const [entry, file] of Object.entries(paths).sort(([a], [b]) => a.localeCompare(b))) {
  if (entry.includes('_global-error')) continue;
  const route = entry.replace(/\/\([^/]+\)/g, '').replace(/\/(?:page|route)$/, '') || '/';
  if (entry.endsWith('/route')) { console.info(`${route}: 0 kB client JS (server response)`); continue; }
  const manifestPath = `.next/server/${file.replace(/\.js$/, '_client-reference-manifest.js')}`;
  if (!existsSync(manifestPath)) throw new Error('Missing client-reference manifest; run npm run build first');
  const context = {};
  runInNewContext(readFileSync(manifestPath, 'utf8'), context);
  const manifest = Object.values(context.__RSC_MANIFEST)[0];
  const entries = Object.entries(manifest.entryJSFiles).filter(([key]) => key.endsWith('/layout') || key.endsWith('/page'));
  const files = [...new Set([...build.rootMainFiles, ...entries.flatMap(([, chunks]) => chunks)])];
  const bytes = files.reduce((total, path) => total + gzipSync(readFileSync(`.next/${path}`), { level: 9 }).length, 0);
  console.info(`${route}: ${(bytes / 1000).toFixed(1)} kB initial JS (gzip)`);
  if (entry.includes('(app)') && bytes > 170_000) overBudget = true;
}
console.info('Includes runtime, layout and page entries; excludes legacy polyfills, error-only entries and unopened lazy chunks. kB = 1000 bytes; gzip level 9.');
if (overBudget) process.exitCode = 1;
