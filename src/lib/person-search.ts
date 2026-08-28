export function personSearchTokens(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => /^\d+$/.test(token) ? token.replace(/^0+(?=\d)/, "") : token);
}

export function matchesPersonSearch(value: string, query: string) {
  const terms = personSearchTokens(query);
  if (!terms.length) return true;
  const indexed = personSearchTokens(value);
  return terms.every((term) => indexed.some((token) => token.includes(term)));
}
