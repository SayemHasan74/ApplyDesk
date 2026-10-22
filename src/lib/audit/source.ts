import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import ts from 'typescript';

export function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => entry.isDirectory() ? sourceFiles(resolve(directory, entry.name)) : /\.tsx?$/.test(entry.name) && !/\.test\.ts$|test-/.test(entry.name) ? [resolve(directory, entry.name)] : []);
}
export function parseSource(path: string) { return ts.createSourceFile(path, readFileSync(path, 'utf8'), ts.ScriptTarget.Latest, true); }
export function walkSource(node: ts.Node, visit: (node: ts.Node) => void) { visit(node); ts.forEachChild(node, (child) => walkSource(child, visit)); }
function initializer(node: ts.Node, file: ts.SourceFile) {
  if (!ts.isIdentifier(node)) return node;
  let match: ts.Node = node;
  walkSource(file, (candidate) => {
    if (ts.isVariableDeclaration(candidate) && candidate.initializer && candidate.name.getText(file) === node.text && candidate.pos < node.pos) match = candidate.initializer;
  });
  return match;
}
function tenantText(node: ts.Node, file: ts.SourceFile, depth = 0): boolean {
  if (depth > 10) return false;
  const value = initializer(node, file);
  if (/\buserId\b/.test(value.getText(file))) return true;
  let scoped = false;
  walkSource(value, (child) => { if (ts.isSpreadAssignment(child) && tenantText(child.expression, file, depth + 1)) scoped = true; });
  return scoped;
}
export function tenantViolations(file: ts.SourceFile) {
  const failures: string[] = [];
  walkSource(file, (node) => {
    if (!ts.isCallExpression(node) || !ts.isPropertyAccessExpression(node.expression)) return;
    const name = node.expression.name.text;
    if (!/^(find(?:One(?:And(?:Update|Replace|Delete))?|ById(?:And(?:Update|Delete))?)?|update(?:One|Many)?|replaceOne|delete(?:One|Many)?|count(?:Documents)?|bulkWrite)$/.test(name)) return;
    const argument = node.arguments[0];
    if (!argument) { failures.push(name); return; }
    if (name !== 'bulkWrite') { if (!tenantText(argument, file)) failures.push(name); return; }
    let scoped = 0;
    walkSource(initializer(argument, file), (property) => {
      if (!ts.isPropertyAssignment(property) || !['filter', 'document'].includes(property.name.getText(file))) return;
      scoped++;
      if (!tenantText(property.initializer, file)) failures.push(`bulkWrite.${property.name.getText(file)}`);
    });
    if (!scoped) failures.push('bulkWrite.unresolved');
  });
  return failures;
}
