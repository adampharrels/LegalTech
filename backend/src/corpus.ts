/*
 * Index of the Open Australian Legal Corpus (Isaacus, CC BY 4.0) in
 * backend/data/corpus.db: every decision's citation, title, link and paragraph
 * count, plus appeals and legislation titles. Judgment text is only needed to
 * check quotes; it comes from the database when it was imported with --full,
 * otherwise that one judgment is downloaded from the corpus file on Hugging
 * Face. The draft itself is never sent anywhere.
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { DatabaseSync } from 'node:sqlite';
import type { CorpusAppeal, CorpusDecision, CorpusLookup } from './citation-check';

export const CORPUS_DB_PATH = process.env.CORPUS_DB || path.join(__dirname, '..', 'data', 'corpus.db');

/** The corpus file at a fixed revision, so the byte offsets in the index stay valid. */
export const CORPUS_REVISION = 'ef45e3fec41a960919a31149eee6dab9aa39f725';
export const CORPUS_URL = `https://huggingface.co/datasets/isaacus/open-australian-legal-corpus/resolve/${CORPUS_REVISION}/corpus.jsonl`;

export const CORPUS_SCHEMA = `
  CREATE TABLE decisions (key TEXT PRIMARY KEY, court TEXT, year INTEGER, number INTEGER, title TEXT, date TEXT, url TEXT, paragraphs INTEGER, offset INTEGER, length INTEGER, text BLOB);
  CREATE TABLE appeals (from_key TEXT, appeal_key TEXT, outcome TEXT, PRIMARY KEY (from_key, appeal_key));
  CREATE TABLE legislation (key TEXT PRIMARY KEY, title TEXT, url TEXT);
  CREATE TABLE court_years (court TEXT, year INTEGER, highest INTEGER, PRIMARY KEY (court, year));
  CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT);
`;

// The corpus has in-force legislation for these jurisdictions only.
const LEGISLATION_JURISDICTIONS = ['cth', 'nsw', 'qld', 'wa', 'sa', 'tas'];

/** One document from the corpus file, by its position. */
async function downloadText(offset: number, length: number): Promise<string | null> {
  try {
    const response = await fetch(CORPUS_URL, { headers: { Range: `bytes=${offset}-${offset + length - 1}` }, signal: AbortSignal.timeout(20000) });
    return response.status === 206 ? (JSON.parse(await response.text()) as { text: string }).text : null;
  } catch {
    return null;
  }
}

export class SqliteCorpus implements CorpusLookup {
  readonly cutoffDate: string;
  readonly decisionCount: number;
  private readonly courts: Set<string>;

  constructor(private readonly db: DatabaseSync) {
    this.cutoffDate = String(this.get('SELECT value FROM meta WHERE key = ?', 'cutoff_date')?.value ?? 'unknown');
    this.decisionCount = Number(this.get('SELECT COUNT(*) AS n FROM decisions')?.n);
    this.courts = new Set(db.prepare('SELECT DISTINCT court FROM court_years').all().map((row) => String(row.court)));
  }

  private get(sql: string, ...params: (string | number)[]) {
    return this.db.prepare(sql).get(...params);
  }

  decision(key: string): CorpusDecision | null {
    const row = this.get('SELECT title, url, paragraphs, offset, length, text IS NOT NULL AS stored FROM decisions WHERE key = ?', key);
    if (!row) return null;
    let text: Promise<string | null> | undefined;
    return {
      title: String(row.title),
      url: String(row.url),
      paragraphs: Number(row.paragraphs),
      text: () => (text ??= row.stored
        ? Promise.resolve(zlib.gunzipSync(this.get('SELECT text FROM decisions WHERE key = ?', key)!.text as Uint8Array).toString())
        : downloadText(Number(row.offset), Number(row.length))),
    };
  }

  highestNumber(court: string, year: number): number | null {
    const row = this.get('SELECT highest FROM court_years WHERE court = ? AND year = ?', court, year);
    return row ? Number(row.highest) : null;
  }

  isCourtCovered(court: string): boolean {
    return this.courts.has(court);
  }

  appealsFrom(key: string): CorpusAppeal[] {
    const sql = 'SELECT d.title, a.outcome FROM appeals a JOIN decisions d ON d.key = a.appeal_key WHERE a.from_key = ? ORDER BY d.date';
    return this.db.prepare(sql).all(key) as unknown as CorpusAppeal[];
  }

  legislation(key: string): { title: string; url: string } | null {
    return (this.get('SELECT title, url FROM legislation WHERE key = ?', key) as { title: string; url: string } | undefined) ?? null;
  }

  isJurisdictionCovered(jurisdiction: string): boolean {
    return LEGISLATION_JURISDICTIONS.includes(jurisdiction.toLowerCase());
  }
}

let corpus: SqliteCorpus | null = null;

/** The local index, or null until it has been downloaded or imported. */
export function openCorpus(): SqliteCorpus | null {
  if (!corpus && fs.existsSync(CORPUS_DB_PATH)) corpus = new SqliteCorpus(new DatabaseSync(CORPUS_DB_PATH, { readOnly: true }));
  return corpus;
}
