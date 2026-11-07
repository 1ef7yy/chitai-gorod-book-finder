import { readFile, writeFile } from 'node:fs/promises';

const excerpts = JSON.parse(await readFile(new URL('../src/reader-excerpts.json', import.meta.url), 'utf8'));
const counts = Object.fromEntries(Object.entries(excerpts).map(([id, sample]) => [id, sample.text.trim().split(/\s+/).length >= 900 ? 4 : 3]));
const source = '// Page counts for the local reader samples. Texts load only on the reader route.\n'
  + 'const counts: Record<string, number> = ' + JSON.stringify(counts, null, 2)
  + ';\nexport const readerPageCount = (id: string) => counts[id] || 0;\n';
await writeFile(new URL('../src/reader-meta.ts', import.meta.url), source);
console.log(`Updated page counts for ${Object.keys(counts).length} samples.`);
