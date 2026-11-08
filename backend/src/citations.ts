/*
 * Finds the authorities cited in a draft: neutral citations (with the case
 * name and pinpoint), law report citations, legislation and quotations.
 * Plain text matching, so a confidential draft never leaves the machine.
 */

export interface CaseCitation {
  key: string; // "2022 FCAFC 62"
  year: number;
  court: string;
  number: number;
  caseName: string | null;
  pinpoint: { from: number; to: number } | null;
  written: string;
  start: number;
  end: number;
}

export interface Mention {
  written: string;
  start: number;
}

export interface LegislationCitation extends Mention {
  /** Possible titles, longest first, since words before the title can be picked up too. */
  candidates: string[];
  jurisdiction: string;
  year: number;
}

export interface Quotation {
  text: string;
  /** Index of the case citation the quote is attributed to. */
  citationIndex: number | null;
}

const NEUTRAL_CITATION = /\[(\d{4})\]\s+([A-Z][A-Za-z0-9]{1,11})\s+(\d{1,5})\b/g;
const PINPOINT = /^,?\s*at\s*\[(\d{1,4})\](?:\s*[-–—]\s*\[(\d{1,4})\])?/;
const REPORT_SERIES = 'CLR|FCR|NSWLR|ALR|ALJR|FLR|IPR|ACSR|ATR|IR|VR|Qd R|SASR|WAR|AC|QB|KB|Ch|WLR|All ER';
const REPORT_CITATION = new RegExp(`[([]\\d{4}[)\\]]\\s+(?:\\d{1,4}\\s+)?(?:${REPORT_SERIES})\\s+\\d{1,5}\\b`, 'g');
// "[1942] AC 509" looks like a neutral citation but is an English law report.
const IS_REPORT_SERIES = new RegExp(`^(?:${REPORT_SERIES})$`);
const LEGISLATION = /(?<!\S)((?:[A-Z(][\w'’()-]*\s+(?:(?:of|and|for|the|to|in|on|with)\s+)*){1,10})(Act|Regulations?|Rules|Ordinance|Code)\s+(\d{4})\s*\((Cth|NSW|Qld|WA|SA|Tas|Vic|ACT|NT)\)/g;
// Every quoted span, short ones included, so straight quotes stay paired; short ones are filtered out later.
const QUOTATION = /[“"]([^“”"]*)[”"]/g;
const CASE_NAME = /((?:Re|Ex parte)\s+[^.;:()[\]\n]{1,100}|(?:[A-Z(][^\s;:]*\s+(?:(?:of|and|for|the|in|de|t\/as|&)\s+)*){1,10}v\s+[^;:[\]\n]{1,120}?)[\s,]*$/;
const SIGNALS = /^(?:(?:See|Also|Cf|Compare|But|In|Following|Applying|Per|The|Under|By|As)\s+)+/;

export const citationKey = (year: number | string, court: string, number: number | string) =>
  `${year} ${court.toUpperCase()} ${Number(number)}`;

/** The neutral citation in a title such as "Thaler v Commissioner of Patents [2021] FCA 879". */
export function neutralCitationIn(title: string) {
  const match = [...title.matchAll(NEUTRAL_CITATION)].pop();
  if (!match) return null;
  const [, year, court, number] = match.map(String);
  return { key: citationKey(year!, court!, number!), year: Number(year), court: court!.toUpperCase(), number: Number(number) };
}

const ANY_CITATION = new RegExp(`${NEUTRAL_CITATION.source}|${REPORT_CITATION.source}`);

function caseNameBefore(text: string, at: number): string | null {
  // Only the text since the previous citation on the same line can name this case.
  const line = text.slice(Math.max(0, at - 200), at).split('\n').pop()!.split(ANY_CITATION).pop()!.replace(/[*_]/g, '');
  const name = line.match(CASE_NAME)?.[1]?.replace(SIGNALS, '').trim();
  // "the Full Court in Kenny v ..." names Kenny v ...
  return name?.replace(/^[^]*?\bin\s+(?=[A-Z][^]*\sv\s)/, '') || null;
}

export function extractCaseCitations(text: string): CaseCitation[] {
  return [...text.matchAll(NEUTRAL_CITATION)].filter((match) => !IS_REPORT_SERIES.test(match[2]!)).map((match) => {
    const start = match.index;
    let end = start + match[0].length;
    const pin = text.slice(end, end + 40).match(PINPOINT);
    if (pin) end += pin[0].length;
    const caseName = caseNameBefore(text, start);
    const [, year, court, number] = match.map(String);

    return {
      key: citationKey(year!, court!, number!),
      year: Number(year),
      court: court!.toUpperCase(),
      number: Number(number),
      caseName,
      pinpoint: pin ? { from: Number(pin[1]), to: Number(pin[2] ?? pin[1]) } : null,
      written: [caseName, text.slice(start, end)].filter(Boolean).join(' ').replace(/\s+/g, ' '),
      start,
      end,
    };
  });
}

/** Law report citations, except a parallel citation straight after a neutral one ("[2006] NSWCA 284; 66 NSWLR 1"). */
export function extractReportCitations(text: string, cases: CaseCitation[]): Mention[] {
  return [...text.matchAll(REPORT_CITATION)].filter((match) => !cases.some((c) => /^\s*[;,]\s*$/.test(text.slice(c.end, match.index))))
    .map((match) => ({ written: [caseNameBefore(text, match.index), match[0]].filter(Boolean).join(' '), start: match.index }));
}

export function extractLegislation(text: string): LegislationCitation[] {
  return [...text.matchAll(LEGISLATION)].map((match) => {
    const [, words, kind, year, jurisdiction] = match.map(String);
    // "Part IIIA of the Criminal Code Act" cites the Criminal Code Act.
    const tokens = words!.replace(/^.*\b(?:Part|Division|Schedule|Chapter)\s+\S+\s+(?:of|to)\s+(?:the\s+)?/, '').trim().split(/\s+/);
    // A title can open inside brackets: "Australian Consumer Law (Competition and Consumer Act 2010 (Cth))".
    const startsTitle = (token: string) => /^\(?[A-Z]/.test(token) && !SIGNALS.test(`${token.replace('(', '')} `);
    const candidates = tokens
      .map((token, i) => (startsTitle(token) ? `${tokens.slice(i).join(' ').replace(/^\(/, '')} ${kind} ${year}` : null))
      .filter((title): title is string => title !== null);
    return { written: `${candidates[0] ?? `${kind} ${year}`} (${jurisdiction})`, start: match.index, candidates, jurisdiction: jurisdiction!, year: Number(year) };
  });
}

/**
 * Quotations of four or more words, each attributed to a case cited right
 * before it ("X said “...”") or right after it ("“...” (X at [5])"). Quotes
 * further from any citation are left alone: in judgments they often come from
 * the evidence, a party or the primary judge rather than a cited case.
 */
export function extractQuotations(text: string, cases: CaseCitation[]): Quotation[] {
  return [...text.matchAll(QUOTATION)].filter((match) => match[1]!.length >= 25 && match[1]!.trim().split(/\s+/).length >= 4).map((match) => {
      const start = match.index;
      const end = start + match[0].length;
      const near = cases
        .map((c, i) => ({ c, i }))
        .filter(({ c }) => !text.slice(Math.min(c.start, start), Math.max(c.end, end)).includes('\n'));
      const before = near.filter(({ c }) => c.end <= start && start - c.end <= 150).pop();
      const after = near.find(({ c }) => c.start >= end && c.start - end <= 60);
      return { text: match[1]!.trim(), citationIndex: (before ?? after)?.i ?? null };
    });
}

export const normaliseForMatch = (value: string) =>
  value
    .toLowerCase()
    .replace(/[‘’`´]/g, "'")
    .replace(/\[(\w{1,3})\]/g, '$1') // "[t]he" in a quote stands for "The"
    .replace(/[^a-z0-9' ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** Whether a quote appears in a judgment. Ellipses split it into fragments that must appear in order. */
export function quoteAppearsIn(quote: string, documentText: string): boolean {
  const haystack = normaliseForMatch(documentText);
  let from = 0;
  for (const fragment of quote.split(/\.\.\.|…/).map(normaliseForMatch)) {
    if (fragment.split(' ').length < 3) continue; // too short to mean anything
    from = haystack.indexOf(fragment, from);
    if (from === -1) return false;
    from += fragment.length;
  }
  return true;
}

/**
 * A judgment's numbered paragraphs: the longest run counting up from 1, so
 * numbered orders, contents or lists don't break it. Empty when the numbering
 * can't be trusted, because another run follows the main one (some NSW
 * judgments lost their numbering in the corpus: "1.", "2.", "1." ...) or it
 * ends before the second half; a wrong count would report valid pinpoints as
 * wrong.
 */
export function paragraphIndex(documentText: string): Map<number, string> {
  // Some NSW judgments run the number into the text ("1YOUNG JA : ..."), so the space is optional.
  const markers = [...documentText.matchAll(/(?:^|\n)[ \t]*\[?(\d{1,4})\]?\.?[ \t]*(?=\S)/g)];
  const runs: RegExpExecArray[][] = [];
  for (const marker of markers) {
    const n = Number(marker[1]);
    if (n === 1) runs.push([marker]);
    else runs.findLast((run) => run.length === n - 1)?.push(marker);
  }
  const sequence = runs.reduce((longest, run) => (run.length > longest.length ? run : longest), []);
  const followed = runs.some((run) => run.length >= 5 && run[0]!.index > sequence.at(-1)!.index);
  if (sequence.length === 0 || followed || sequence.at(-1)!.index < documentText.length / 2) return new Map();

  return new Map(
    sequence.map((marker, i) => {
      const bodyStart = marker.index + marker[0].length;
      const bodyEnd = sequence[i + 1]?.index ?? bodyStart + 4000;
      return [i + 1, documentText.slice(bodyStart, bodyEnd).replace(/\s+/g, ' ').trim()];
    }),
  );
}

const NAME_FILLER = new Set(['the', 'and', 'for', 'pty', 'ltd', 'limited', 'inc', 'corporation', 'australia', 'anor', 'ors', 'matter', 'parte', 'liq']);
const nameWords = (name: string) => normaliseForMatch(name).split(' ').filter((w) => w.length >= 3 && !NAME_FILLER.has(w) && !/^\d+$/.test(w));

/** Whether a written case name matches the court's name for the decision. Ignores party order, which flips on appeal. */
export function caseNamesMatch(written: string, official: string): boolean {
  const words = nameWords(written);
  const officialWords = new Set(nameWords(official));
  return words.length === 0 || words.filter((w) => officialWords.has(w)).length / words.length >= 0.5;
}

/** "Corporations Act 2001", "Cth" -> "corporations act 2001|cth" */
export const legislationKey = (title: string, jurisdiction: string) =>
  `${normaliseForMatch(title.replace(/\(Repealed\)/i, ''))}|${jurisdiction.toLowerCase()}`;
