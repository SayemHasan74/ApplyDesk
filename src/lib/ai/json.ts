import 'server-only';

export function extractJsonObject(text: string): unknown {
  const start = text.indexOf('{');
  if (start < 0) throw new Error('Missing JSON object');
  let depth = 0, quoted = false, escaped = false;
  for (let index = start; index < text.length; index++) {
    const char = text[index];
    if (quoted) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') quoted = false;
    } else if (char === '"') quoted = true;
    else if (char === '{') depth++;
    else if (char === '}' && --depth === 0) return JSON.parse(text.slice(start, index + 1)) as unknown;
  }
  throw new Error('Incomplete JSON object');
}
