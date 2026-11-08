/*
 * Checks a draft's citations against the local Open Australian Legal Corpus
 * (corpus.ts) and the procedural histories of tracked cases. A citation the
 * dataset doesn't have is "couldn't verify", not "fake", unless the court
 * never issued a judgment with that number.
 */
import {
  caseNamesMatch,
  extractCaseCitations,
  extractLegislation,
  extractQuotations,
  extractReportCitations,
  legislationKey,
  paragraphIndex,
  findQuote,
  type CaseCitation,
  type LegislationCitation,
} from './citations';

export interface CorpusDecision {
  title: string;
  url: string;
  paragraphs: number;
  /** The judgment's text, or null if it couldn't be downloaded. */
  text(): Promise<string | null>;
}

export interface CorpusAppeal {
  title: string;
  outcome: 'allowed' | 'dismissed' | null;
}

export interface CorpusLookup {
  cutoffDate: string;
  decision(key: string): CorpusDecision | null;
  /** Highest judgment number for a court in a year, or null if there are none. */
  highestNumber(court: string, year: number): number | null;
  isCourtCovered(court: string): boolean;
  appealsFrom(key: string): CorpusAppeal[];
  legislation(key: string): { title: string; url: string } | null;
  isJurisdictionCovered(jurisdiction: string): boolean;
}

/** Later stages of a tracked case whose history mentions the citation, e.g. "Closed, 11 Nov 2022". */
export type TrackedHistoryLookup = (citation: string) => Promise<string[]>;

export type Level = 'error' | 'warning' | 'unknown' | 'ok';

export interface CitationResult {
  kind: 'case' | 'report' | 'legislation';
  written: string;
  level: Level;
  findings: { level: Level; message: string }[];
  source: { title: string; url: string } | null;
  paragraphs: { number: number; text: string }[];
}

export interface CheckResult {
  results: CitationResult[];
  counts: Record<Level, number>;
  cutoffDate: string;
}

const LEVELS: Level[] = ['error', 'warning', 'unknown', 'ok'];

function result(kind: CitationResult['kind'], written: string, findings: CitationResult['findings'], extra: Partial<CitationResult> = {}): CitationResult {
  const level = LEVELS.find((l) => findings.some((f) => f.level === l)) ?? 'ok';
  return { kind, written, level, findings, source: null, paragraphs: [], ...extra };
}

const label = (c: CaseCitation) => `[${c.year}] ${c.court} ${c.number}`;

function missingCaseFinding(citation: CaseCitation, corpus: CorpusLookup) {
  const cutoffYear = Number(corpus.cutoffDate.slice(0, 4));
  const highest = corpus.highestNumber(citation.court, citation.year);
  if (citation.year > cutoffYear || (citation.year === cutoffYear && citation.number > (highest ?? 0))) {
    return { level: 'unknown' as const, message: `Too recent to check: the dataset runs to ${corpus.cutoffDate}. Check it by hand.` };
  }
  if (highest !== null && citation.number > highest) {
    return { level: 'error' as const, message: `No such judgment: ${citation.court} judgments for ${citation.year} only go up to ${highest}.` };
  }
  return { level: 'unknown' as const, message: `Couldn't verify: ${label(citation)} isn't in the dataset (it may be unpublished). Check it by hand.` };
}

async function checkCase(citation: CaseCitation, quotes: string[], corpus: CorpusLookup, laterStages: string[]): Promise<CitationResult> {
  if (!corpus.isCourtCovered(citation.court)) {
    return result('case', citation.written, [{ level: 'unknown', message: `Not covered: the dataset doesn't include ${citation.court} decisions. Check it by hand.` }]);
  }
  const decision = corpus.decision(citation.key);
  if (!decision) return result('case', citation.written, [missingCaseFinding(citation, corpus)]);

  const findings: CitationResult['findings'] = [{ level: 'ok', message: 'Found.' }];
  const paragraphs: CitationResult['paragraphs'] = [];
  const text = citation.pinpoint || quotes.length > 0 ? await decision.text() : null;

  if (citation.caseName && !caseNamesMatch(citation.caseName, decision.title)) {
    findings.push({ level: 'warning', message: `Name doesn't match: this citation is "${decision.title}".` });
  }

  if (citation.pinpoint) {
    const { from, to } = citation.pinpoint;
    if (decision.paragraphs < 3) {
      findings.push({ level: 'unknown', message: "Couldn't read this judgment's paragraph numbers. Check the pinpoint by hand." });
    } else if (to > decision.paragraphs) {
      findings.push({ level: 'error', message: `Wrong pinpoint: this judgment has ${decision.paragraphs} paragraphs, so [${to}] doesn't exist.` });
    } else if (text) {
      const index = paragraphIndex(text);
      for (let n = from; n <= Math.min(to, from + 4); n++) paragraphs.push({ number: n, text: index.get(n)!.slice(0, 1200) });
    }
  }

  for (const quote of quotes) {
    const shown = `“${quote.length > 80 ? `${quote.slice(0, 80)}…` : quote}”`;
    if (text === null) {
      findings.push({ level: 'unknown', message: `Couldn't download the judgment to check this quote: ${shown}` });
    } else {
      const match = findQuote(quote, text);
      if (match === 'close') findings.push({ level: 'ok', message: `Quote matches, allowing for scanning errors in the judgment's text: ${shown}` });
      if (!match) findings.push({ level: 'error', message: `Quote not found in ${label(citation)}: ${shown}` });
    }
  }

  for (const appeal of corpus.appealsFrom(citation.key)) {
    const outcome = appeal.outcome === 'allowed' ? 'appeal allowed, so this decision was overturned at least in part'
      : appeal.outcome === 'dismissed' ? 'appeal dismissed' : 'check the outcome';
    findings.push({ level: appeal.outcome === 'dismissed' ? 'ok' : 'warning', message: `Appealed in ${appeal.title}: ${outcome}.` });
  }

  for (const stage of laterStages) findings.push({ level: 'ok', message: `Later in this case: ${stage}` });

  return result('case', citation.written, findings, { source: { title: decision.title, url: decision.url }, paragraphs });
}

function checkLegislation({ candidates, jurisdiction, written, year }: LegislationCitation, corpus: CorpusLookup): CitationResult {
  if (!corpus.isJurisdictionCovered(jurisdiction)) {
    return result('legislation', written, [{ level: 'unknown', message: `Not covered: the dataset doesn't include ${jurisdiction} legislation. Check it by hand.` }]);
  }
  const match = candidates.map((title) => corpus.legislation(legislationKey(title, jurisdiction))).find(Boolean);
  if (!match && year >= Number(corpus.cutoffDate.slice(0, 4))) {
    return result('legislation', written, [{ level: 'unknown', message: `Too recent to check: the dataset's legislation runs to ${corpus.cutoffDate}. Check it by hand.` }]);
  }
  if (!match) {
    return result('legislation', written, [{ level: 'warning', message: "Couldn't find an Act in force with this title. Check the name and year; it may have been repealed or renamed." }]);
  }
  const repealed = /\(Repealed\)/i.test(match.title);
  return result('legislation', written, [repealed ? { level: 'warning', message: 'Repealed.' } : { level: 'ok', message: 'Found.' }], { source: match });
}

export async function checkDocument(text: string, corpus: CorpusLookup, trackedHistory: TrackedHistoryLookup): Promise<CheckResult> {
  const cases = extractCaseCitations(text);
  const quotations = extractQuotations(text, cases);
  const checked: { start: number; result: CitationResult }[] = [];

  for (const [i, citation] of cases.entries()) {
    const quotes = quotations.filter((q) => q.citationIndex === i).map((q) => q.text);
    checked.push({ start: citation.start, result: await checkCase(citation, quotes, corpus, await trackedHistory(label(citation))) });
  }
  for (const report of extractReportCitations(text, cases)) {
    checked.push({ start: report.start, result: result('report', report.written, [{ level: 'unknown', message: "Law report citation: these can't be checked automatically yet. Check it by hand." }]) });
  }
  for (const act of extractLegislation(text)) {
    checked.push({ start: act.start, result: checkLegislation(act, corpus) });
  }

  // An Act or law report cited several times is listed once; each case citation is kept, since pinpoints differ.
  const seen = new Set<string>();
  const results = checked
    .sort((a, b) => a.start - b.start)
    .map((c) => c.result)
    .filter((r) => {
      if (r.kind === 'case') return true;
      if (seen.has(r.written)) return false;
      seen.add(r.written);
      return true;
    });
  const counts = { error: 0, warning: 0, unknown: 0, ok: 0 };
  for (const r of results) counts[r.level]++;
  return { results, counts, cutoffDate: corpus.cutoffDate };
}
