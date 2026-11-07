import excerpts from './reader-excerpts.json';

export function getExcerpt(id: string): { text: string; source: string } | undefined {
  return (excerpts as Record<string, { text: string; source: string }>)[id];
}
export function readerPages(id: string): string[] {
  const text = getExcerpt(id)?.text || '';
  if (!text) return [];
  const count = text.trim().split(/\s+/).length;
  const numberOfPages = count >= 900 ? 4 : 3;
  const perPage = Math.ceil(count / numberOfPages);
  const result: string[] = [];
  let page = '', words = 0;
  for (const token of text.split(/(\s+)/)) {
    page += token;
    if (/\S/.test(token)) words++;
    if (words >= perPage && result.length < numberOfPages - 1) {
      result.push(page.trim()); page = ''; words = 0;
    }
  }
  if (page.trim()) result.push(page.trim());
  return result;
}
