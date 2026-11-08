import assert from 'node:assert/strict';
import test from 'node:test';
import {
  caseNamesMatch,
  extractCaseCitations,
  extractLegislation,
  extractQuotations,
  extractReportCitations,
  findQuote,
  neutralCitationIn,
  paragraphIndex,
  quoteAppearsIn,
} from '../src/citations';
import { appealOutcome, appealedFrom } from '../src/import-corpus';

test('extractCaseCitations reads the case name, citation and pinpoint', () => {
  const [citation] = extractCaseCitations('See, eg, Commissioner of Patents v Thaler [2022] FCAFC 62 at [113]-[115], where the Court held');
  assert.equal(citation?.key, '2022 FCAFC 62');
  assert.equal(citation?.caseName, 'Commissioner of Patents v Thaler');
  assert.deepEqual(citation?.pinpoint, { from: 113, to: 115 });
  assert.equal(citation?.written, 'Commissioner of Patents v Thaler [2022] FCAFC 62 at [113]-[115]');
});

test('extractCaseCitations drops citation signals and sentence openers from the case name', () => {
  assert.equal(extractCaseCitations('In Thaler v Commissioner of Patents [2021] FCA 879, Beach J held')[0]?.caseName, 'Thaler v Commissioner of Patents');
  assert.equal(extractCaseCitations('Re Smith [2020] NSWSC 1')[0]?.caseName, 'Re Smith');
  assert.equal(extractCaseCitations('applied by the Full Court in Kenny v Business Council [2015] FCAFC 75')[0]?.caseName, 'Kenny v Business Council');
  assert.equal(extractCaseCitations('*Deatons Pty Ltd v Flew* [1949] HCA 24')[0]?.caseName, 'Deatons Pty Ltd v Flew');
  assert.equal(extractCaseCitations('Century Insurance v NI Transport Board [1942] AC 509').length, 0);
  assert.equal(extractCaseCitations('as decided in [2020] NSWSC 1')[0]?.caseName, null);
});

test('a case name starts after the previous citation', () => {
  const text = 'Compare Mabo v Queensland (No 2) (1992) 175 CLR 1 and Re Hargreaves [2019] VSC 88.';
  assert.equal(extractCaseCitations(text)[0]?.caseName, 'Re Hargreaves');
});

test('extractReportCitations skips a parallel citation after a neutral citation', () => {
  const text = 'Campbelltown City Council v Vegan [2006] NSWCA 284; (2006) 67 NSWLR 372 and Mabo v Queensland (No 2) (1992) 175 CLR 1.';
  const reports = extractReportCitations(text, extractCaseCitations(text));
  assert.deepEqual(reports.map((r) => r.written), ['Mabo v Queensland (No 2) (1992) 175 CLR 1']);
});

test('extractLegislation offers shorter titles in case leading words were picked up', () => {
  const [act] = extractLegislation('Under the Federal Court of Australia Act 1976 (Cth), s 37M');
  assert.equal(act?.jurisdiction, 'Cth');
  assert.deepEqual(act?.candidates, ['Federal Court of Australia Act 1976', 'Court of Australia Act 1976', 'Australia Act 1976']);
  assert.equal(extractLegislation('s 2C of the Acts Interpretation Act 1901 (Cth)')[0]?.written, 'Acts Interpretation Act 1901 (Cth)');
  assert.equal(extractLegislation('Part IIIA of the Criminal Code Act 1983 (NT)')[0]?.written, 'Criminal Code Act 1983 (NT)');
  assert.ok(extractLegislation('Australian Consumer Law (Competition and Consumer Act 2010 (Cth))')[0]?.candidates.includes('Competition and Consumer Act 2010'));
  assert.equal(extractLegislation('provisions of the Births, Deaths and Marriages Registration Act 1995 (NSW)')[0]?.written, 'Births, Deaths and Marriages Registration Act 1995 (NSW)');
});

test('extractQuotations attributes a quote to the nearest citation on the same line', () => {
  const text = 'In X v Y [2020] FCA 1 the Court said “only a natural person can be an inventor” and Z v W [2021] FCA 2 differs.\nUnrelated “quote with no citation at all here”.';
  const quotes = extractQuotations(text, extractCaseCitations(text));
  assert.deepEqual(quotes.map((q) => q.citationIndex), [0, null]);
  // A short quote ("AI") mustn't throw the pairing of later straight quotes off.
  const straight = 'The "AI" tool. X v Y [2020] FCA 1 said "if the servant for his own purposes inflicts injury" at 5.';
  assert.deepEqual(extractQuotations(straight, extractCaseCitations(straight)).map((q) => q.text), ['if the servant for his own purposes inflicts injury']);
  // A quote far from any citation (here, the primary judge's words) isn't attributed to one.
  const far = `X v Y [2020] FCA 1 at [5]. ${'The reasons continue at length. '.repeat(6)}Her Honour found her to be "a victim of her own success" in the end.`;
  assert.equal(extractQuotations(far, extractCaseCitations(far))[0]?.citationIndex, null);
});

test('quoteAppearsIn ignores case, punctuation and ellipses, but not wording', () => {
  const judgment = 'The Court held that, under the Act, only a natural person can be an inventor. That is the end of it.';
  assert.equal(quoteAppearsIn('only a natural person can be an inventor', judgment), true);
  assert.equal(quoteAppearsIn('[t]he Court held that ... only a natural person can be an inventor', judgment), true);
  assert.equal(quoteAppearsIn('an AI system can be an inventor', judgment), false);
  // [1983] FCA 225 in the corpus was scanned with errors; an invented quote stays missing.
  const scanned = 'the activity af a competing trader which would otherwise be regariad az infringement can bring about a situation';
  assert.equal(findQuote('the activity of a competing trader which would otherwise be regarded as infringement can bring about a situation', scanned), 'close');
  assert.equal(findQuote('a sufficient connection between the employment and the wrongful act or omission', 'a sufficient connection between the position for which he was employed and his wrongful conduct'), null);
});

test('paragraphIndex follows the numbering and ignores numbered lists out of sequence', () => {
  const text = 'ORDERS\n1. The appeal be allowed.\n2. Costs.\nREASONS\n3 First paragraph.\n4 Second.\n1. a list item\n5 Third.';
  const index = paragraphIndex(text);
  assert.equal(index.size, 5);
  assert.equal(index.get(5), 'Third.');
  assert.equal(paragraphIndex('Judgment\n1YOUNG JA : I dealt with it.\n2That matter was stood over.\n3Orders.').size, 3);
  // Numbering that stops early (NSW judgments with "1." on every paragraph) can't be trusted.
  assert.equal(paragraphIndex(`1. First.\n1. Second.\n2. Third.\n${'Unnumbered reasons. '.repeat(20)}`).size, 0);
  // NSW [2023] NSWSC 708 in the corpus: runs of 10, 31 and 20, so no count can be trusted.
  const run = (length: number) => Array.from({ length }, (_, i) => `${i + 1} Text.`).join('\n');
  assert.equal(paragraphIndex([run(10), run(31), run(20)].join('\n')).size, 0);
  // [2016] NSWSC 1805: dozens of short runs before a run of 39.
  assert.equal(paragraphIndex([...Array.from({ length: 30 }, () => run(3)), run(39)].join('\n')).size, 0);
  const judgment = `ORDERS\n1. Appeal allowed.\n1 INTRODUCTION\n1. INTRODUCTION\n${Array.from({ length: 40 }, (_, i) => `${i + 1} Reasons.`).join('\n')}`;
  assert.equal(paragraphIndex(judgment).size, 40);
});

test('caseNamesMatch ignores party order and filler words', () => {
  assert.equal(caseNamesMatch('Thaler v Commissioner of Patents', 'Commissioner of Patents v Thaler [2022] FCAFC 62'), true);
  assert.equal(caseNamesMatch('Smith v Jones Pty Ltd', 'Commissioner of Patents v Thaler [2022] FCAFC 62'), false);
});

test('neutralCitationIn reads the citation at the end of a corpus title', () => {
  assert.equal(neutralCitationIn('Thaler v Commissioner of Patents [2021] FCA 879')?.key, '2021 FCA 879');
});

test('appealedFrom reads the cover page and stops before the cases cited', () => {
  const cover = 'Commissioner of Patents v Thaler [2022] FCAFC 62\nAppeal from: Thaler v Commissioner of Patents [2021] FCA 879\nFile number(s): VID 496 of 2021\nCases cited: Other v Case [2019] HCA 1';
  assert.deepEqual(appealedFrom(cover), ['2021 FCA 879']);
  assert.equal(appealOutcome('THE COURT ORDERS THAT:\n1. The appeal be allowed.'), 'allowed');
});
