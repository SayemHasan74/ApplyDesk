import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import ts from 'typescript';
import { expect, it } from 'vitest';

const root = resolve(process.cwd(), 'src');
function files(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => entry.isDirectory() ? files(resolve(directory, entry.name)) : /\.tsx?$/.test(entry.name) && !entry.name.endsWith('.test.ts') ? [resolve(directory, entry.name)] : []);
}
function source(path: string) { return ts.createSourceFile(path, readFileSync(path, 'utf8'), ts.ScriptTarget.Latest, true); }
function walk(node: ts.Node, visit: (node: ts.Node) => void) { visit(node); ts.forEachChild(node, (child) => walk(child, visit)); }
function exported(node: ts.Node) { return ts.canHaveModifiers(node) && ts.getModifiers(node)?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword); }

it('requires userId as the first parameter of every exported data function', () => {
  const failures: string[] = [];
  for (const path of files(resolve(root, 'lib/data'))) {
    const file = source(path);
    for (const node of file.statements) {
      if (ts.isFunctionDeclaration(node) && exported(node)) {
        if (node.parameters[0]?.name.getText(file) !== 'userId') failures.push(`${path}: ${node.name?.text}`);
      }
      if (ts.isVariableStatement(node) && exported(node)) for (const declaration of node.declarationList.declarations) {
        if (declaration.initializer && (ts.isArrowFunction(declaration.initializer) || ts.isFunctionExpression(declaration.initializer)) && declaration.initializer.parameters[0]?.name.getText(file) !== 'userId') failures.push(`${path}: ${declaration.name.getText(file)}`);
      }
      if (ts.isExportDeclaration(node)) failures.push(`${path}: data re-exports bypass this audit`);
    }
  }
  expect(failures).toEqual([]);
});
it('provides initialData to every list query, avoids effect fetches and limits session calls per tree level', () => {
  const failures: string[] = [];
  for (const path of files(root)) {
    const file = source(path);
    let sessionCalls = 0;
    walk(file, (node) => {
      if (!ts.isCallExpression(node)) return;
      const name = node.expression.getText(file);
      if (name === 'getUser') sessionCalls++;
      if (name === 'useQuery') {
        const arg = node.arguments[0];
        if (!arg || !ts.isObjectLiteralExpression(arg) || !arg.properties.some((property) => property.name?.getText(file) === 'initialData')) failures.push(`${path}: missing initialData`);
      }
      if (name === 'useEffect') walk(node, (child) => {
        if (ts.isCallExpression(child) && child.expression.getText(file) === 'fetch') failures.push(`${path}: effect fetch`);
      });
      if (/(?:page|layout)\.tsx$/.test(path) && name === 'fetch') failures.push(`${path}: page/layout fetch`);
    });
    if (/(?:page|layout)\.tsx$/.test(path) && sessionCalls > 1) failures.push(`${path}: repeated session read`);
  }
  expect(failures).toEqual([]);
});
it('uses withApi for all application APIs, with only the native Auth.js protocol exception', () => {
  const failures: string[] = [];
  for (const path of files(resolve(root, 'app/api'))) {
    if (!path.endsWith('route.ts')) continue;
    if (path.includes('[...nextauth]')) {
      expect(readFileSync(path, 'utf8')).toContain('export const { GET, POST } = handlers');
      continue;
    }
    const file = source(path);
    for (const node of file.statements) if (ts.isVariableStatement(node) && exported(node)) {
      for (const declaration of node.declarationList.declarations) if (/^(GET|POST|PATCH|DELETE|PUT)$/.test(declaration.name.getText(file))) {
        if (!declaration.initializer || !ts.isCallExpression(declaration.initializer) || declaration.initializer.expression.getText(file) !== 'withApi') failures.push(path);
      }
    }
  }
  expect(failures).toEqual([]);
});
it('restricts direct auth imports to the cached session helper', () => {
  const violations: string[] = [];
  for (const path of files(root)) {
    if (path === resolve(root, 'lib/auth/session.ts')) continue;
    const file = source(path);
    walk(file, (node) => {
      if (!ts.isImportDeclaration(node) || !ts.isStringLiteral(node.moduleSpecifier) || node.moduleSpecifier.text !== '@/auth') return;
      const bindings = node.importClause?.namedBindings;
      if (bindings && ts.isNamedImports(bindings) && bindings.elements.some((binding) => (binding.propertyName ?? binding.name).text === 'auth')) violations.push(path);
    });
  }
  expect(violations).toEqual([]);
});
