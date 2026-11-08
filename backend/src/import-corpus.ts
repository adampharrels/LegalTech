/*
 * Builds backend/data/corpus.db, the citation checker's index of the Open
 * Australian Legal Corpus (about 9.4 GB). Most people should download the
 * prebuilt index instead (npm run corpus:download). To build it:
 *
 *   npm run corpus:import                        # stream the corpus from Hugging Face
 *   npm run corpus:import -- path/to/corpus.jsonl # or read a downloaded copy
 *   add --full to also store judgment text, so quote checks work offline
 *
 * Builds into a temporary file and swaps it in at the end, so a failed import
 * never leaves the checker with half a database.
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { Readable } from 'node:stream';
import type { ReadableStream } from 'node:stream/web';
import { DatabaseSync } from 'node:sqlite';
import { legislationKey, neutralCitationIn, paragraphIndex } from './citations';
import { CORPUS_DB_PATH, CORPUS_REVISION, CORPUS_SCHEMA, CORPUS_URL } from './corpus';

/** Decisions an appeal judgment's cover page says it is an appeal from. */
export function appealedFrom(text: string): string[] {
  const header = text.slice(0, 8000);
  const heading = header.search(/(Appeal from|Decision under appeal)\s*:/i);
  if (heading === -1) return [];
  // Read up to the next cover page field, so the list of cases cited isn't included.
  const region = header.slice(heading, heading + 800).split(/\n\s*(?:File number|Judgment of|Date of|Catchwords|Legislation|Cases? cited|Legal Representatives|Parties|Counsel)/i)[0]!;
  return [...new Set([...region.matchAll(/\[\d{4}\]\s+[A-Z][A-Za-z0-9]{1,11}\s+\d{1,5}/g)].map((m) => neutralCitationIn(m[0])!.key))];
}

/** "allowed" or "dismissed", from the first statement of the orders. */
export const appealOutcome = (text: string) =>
  text.slice(0, 15000).match(/\bappeals?\s+(?:(?:be|is|are|was)\s+)?(allowed|dismissed)\b/i)?.[1]?.toLowerCase() ?? null;

/** Lines of the corpus with their byte positions, which the index keeps for downloading one judgment later. */
async function* lines(input: AsyncIterable<Buffer>) {
  let buffered = Buffer.alloc(0);
  let offset = 0;
  for await (const chunk of input) {
    buffered = Buffer.concat([buffered, chunk]);
    for (let end = buffered.indexOf(10); end !== -1; end = buffered.indexOf(10)) {
      yield { line: buffered.subarray(0, end).toString(), offset, length: end };
      offset += end + 1;
      buffered = buffered.subarray(end + 1);
    }
  }
}

async function main() {
  const full = process.argv.includes('--full');
  const file = process.argv.slice(2).find((arg) => !arg.startsWith('--'));
  const input = file
    ? fs.createReadStream(file, { highWaterMark: 1 << 20 })
    : Readable.fromWeb((await fetch(CORPUS_URL)).body as ReadableStream);

  const tempPath = `${CORPUS_DB_PATH}.building`;
  fs.mkdirSync(path.dirname(CORPUS_DB_PATH), { recursive: true });
  fs.rmSync(tempPath, { force: true });

  const db = new DatabaseSync(tempPath);
  db.exec(`PRAGMA journal_mode = OFF; PRAGMA synchronous = OFF; ${CORPUS_SCHEMA} BEGIN;`);
  const addDecision = db.prepare('INSERT OR REPLACE INTO decisions VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
  const addAppeal = db.prepare('INSERT OR IGNORE INTO appeals VALUES (?, ?, ?)');
  const addLegislation = db.prepare('INSERT OR REPLACE INTO legislation VALUES (?, ?, ?)');

  let count = 0;
  for await (const { line, offset, length } of lines(input as AsyncIterable<Buffer>)) {
    if (!line.trim()) continue;
    const doc = JSON.parse(line) as { type: string; citation: string; date: string | null; url: string; text: string };

    if (doc.type === 'decision') {
      const c = neutralCitationIn(doc.citation);
      if (!c) continue;
      const text = full ? zlib.gzipSync(doc.text) : null;
      addDecision.run(c.key, c.court, c.year, c.number, doc.citation, doc.date, doc.url, paragraphIndex(doc.text).size, offset, length, text);
      const outcome = appealOutcome(doc.text);
      for (const fromKey of appealedFrom(doc.text)) {
        // An appeal goes to a different court; a "(No 2)" decision of the same court isn't one.
        if (fromKey.split(' ')[1] !== c.court) addAppeal.run(fromKey, c.key, outcome);
      }
    } else if (doc.type.endsWith('legislation')) {
      // Titles end with the jurisdiction: "Corporations Act 2001 (Cth)".
      const [, title, jurisdiction] = doc.citation.match(/^(.*?)\s*\((\w+)\)$/) ?? [];
      if (title && jurisdiction) addLegislation.run(legislationKey(title, jurisdiction), doc.citation, doc.url);
    }

    if (++count % 1000 === 0) db.exec('COMMIT; BEGIN;');
    if (count % 20000 === 0) console.log(`   ${count} documents`);
  }

  db.exec(`
    COMMIT;
    INSERT INTO court_years SELECT court, year, MAX(number) FROM decisions GROUP BY court, year;
    INSERT INTO meta SELECT 'cutoff_date', MAX(date) FROM decisions WHERE date <= date('now');
    INSERT INTO meta VALUES ('revision', '${CORPUS_REVISION}');
    VACUUM;
  `);
  const cutoff = db.prepare("SELECT value FROM meta WHERE key = 'cutoff_date'").get()?.value;
  db.close();
  fs.renameSync(tempPath, CORPUS_DB_PATH);
  console.log(`Imported ${count} documents, up to ${cutoff}, into ${CORPUS_DB_PATH}.`);
}

if (require.main === module) {
  main().catch((error) => {
    console.error('Corpus import failed:', error);
    process.exit(1);
  });
}
