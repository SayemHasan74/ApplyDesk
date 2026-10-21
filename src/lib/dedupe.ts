export function normalizeKey(value: string) {
  return value.toLowerCase().normalize('NFKD').replace(/[^\p{L}\p{N} ]/gu, '').replace(/ +/g, ' ').trim();
}

export function jobDedupeKey(company: string, role: string) {
  return `${normalizeKey(company)}|${normalizeKey(role)}`;
}

export function certDedupeKey(provider: string, name: string) {
  return `${normalizeKey(provider)}|${normalizeKey(name)}`;
}
