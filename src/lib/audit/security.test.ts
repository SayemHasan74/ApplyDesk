import { readFileSync } from 'node:fs';
import { resolve, relative } from 'node:path';
import { execFileSync } from 'node:child_process';
import ts from 'typescript';
import { expect, it } from 'vitest';
import { parseSource, sourceFiles, tenantViolations, walkSource } from './source';

const root = process.cwd(), src = resolve(root, 'src');
it('inventories every API route and requires withApi with only the native auth protocol exception', () => {
  const routes = sourceFiles(resolve(src, 'app/api')).filter((path) => path.endsWith('route.ts'));
  expect(routes.length).toBeGreaterThan(15);
  for (const path of routes) if (!path.includes('[...nextauth]')) expect(readFileSync(path, 'utf8'), relative(root, path)).toContain('withApi(');
});
it('checks tenant filters including aliased filters, bulk updates, deletes, replacements and insert documents', () => {
  const violations = ['data', 'actions'].flatMap((directory) => sourceFiles(resolve(src, `lib/${directory}`)).flatMap((path) => tenantViolations(parseSource(path)).map((name) => `${relative(root, path)}: ${name}`)));
  expect(violations).toEqual([]);
  const unsafe = ts.createSourceFile('unsafe.ts', 'model.updateOne({_id:id}, {$set:{userId}}); model.bulkWrite([{updateOne:{filter:{_id:id},update:{$set:{userId}}}}]);', ts.ScriptTarget.Latest, true);
  expect(tenantViolations(unsafe)).toEqual(['updateOne', 'bulkWrite.filter']);
});
it('keeps environment access server-only and accepts only code/request-id server logs', () => {
  const failures: string[] = [];
  for (const path of sourceFiles(src)) {
    const text = readFileSync(path, 'utf8'), file = parseSource(path);
    if (path !== resolve(src, 'lib/env.ts') && /process\s*\.\s*env/.test(text)) failures.push(`${path}: environment access`);
    if (/^['"]use client['"];/.test(text) && /(?:from|import\()\s*['"][^'"]*(?:\/env|\/crypto|\/db|\/auth\/session)['"]/.test(text)) failures.push(`${path}: client secret import`);
    walkSource(file, (node) => {
      if (!ts.isCallExpression(node) || !ts.isPropertyAccessExpression(node.expression) || node.expression.expression.getText(file) !== 'console') return;
      if (node.expression.name.text === 'log') failures.push(`${path}: console.log`);
      if (node.expression.name.text !== 'error') return;
      const [code, id] = node.arguments;
      if (node.arguments.length !== 2 || !code || !ts.isStringLiteral(code) || !/^\[[A-Z_]+\]$/.test(code.text) || !id || !/^(?:requestId|(?:crypto\.)?randomUUID\(\))$/.test(id.getText(file))) failures.push(`${path}: unsafe error log`);
    });
  }
  expect(failures).toEqual([]);
});
it('ignores local secret files but tracks the empty environment example', () => {
  for (const name of ['.env', '.env.local', '.env.production', '.env.audit']) expect(execFileSync('git', ['check-ignore', name], { encoding: 'utf8' }).trim()).toBe(name);
  expect(execFileSync('git', ['ls-files', '.env*'], { encoding: 'utf8' }).trim()).toBe('.env.example');
  expect(readFileSync('.env.example', 'utf8').split(/\r?\n/).filter((line) => line && !line.startsWith('#')).every((line) => /^[A-Z_]+=$/.test(line))).toBe(true);
});
it('keeps forbidden runtime APIs and suppression directives out of application sources', () => {
  const forbidden = /\b(?:SessionProvider|useSession|setInterval|unstable_cache|axios|moment|lodash)\b|next-auth\/react|use cache|export const revalidate|@ts-ignore|@ts-expect-error|eslint-disable/;
  expect(sourceFiles(src).filter((path) => forbidden.test(readFileSync(path, 'utf8')))).toEqual([]);
});
