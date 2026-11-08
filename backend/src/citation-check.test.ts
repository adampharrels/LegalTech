import assert from 'node:assert/strict';
import test from 'node:test';
import { checkDocument, type CorpusLookup } from './citation-check';

const JUDGMENT = 'Commissioner of Patents v Thaler [2022] FCAFC 62\n1 Introduction.\n2 The question is who can be an inventor.\n3 Only a natural person can be an inventor under the Act.';

const corpus: CorpusLookup = {
  cutoffDate: '2025-03-10',
  decision: (key) => (key === '2022 FCAFC 62' ? { title: 'Commissioner of Patents v Thaler [2022] FCAFC 62', url: 'https://example.test/62', paragraphs: 3, text: async () => JUDGMENT } : null),
  highestNumber: (court, year) => (court === 'FCAFC' && year === 2022 ? 230 : court === 'FCA' ? 1600 : null),
  isCourtCovered: (court) => court === 'FCA' || court === 'FCAFC',
  appealsFrom: (key) => (key === '2021 FCA 879' ? [{ title: 'Commissioner of Patents v Thaler [2022] FCAFC 62', outcome: 'allowed' }] : []),
  legislation: (key) => (key === 'patents act 1990|cth' ? { title: 'Patents Act 1990 (Cth)', url: 'https://example.test/act' } : null),
  isJurisdictionCovered: (j) => j === 'Cth',
};
const noHistory = async () => [];

async function check(text: string) {
  return (await checkDocument(text, corpus, noHistory)).results;
}

test('a real citation with a valid pinpoint and an accurate quote passes', async () => {
  const [result] = await check('Commissioner of Patents v Thaler [2022] FCAFC 62 at [3] held that “only a natural person can be an inventor under the Act”.');
  assert.equal(result?.level, 'ok');
  assert.equal(result?.paragraphs[0]?.number, 3);
});

test('a citation numbered past the last judgment of that year does not exist', async () => {
  const [result] = await check('Smith v Jones [2022] FCAFC 999');
  assert.equal(result?.level, 'error');
  assert.match(result!.findings[0]!.message, /only go up to 230/);
});

test('citations the dataset cannot settle are unknown, not errors', async () => {
  const results = await check('A v B [2022] FCAFC 100. C v D [2026] FCA 5. E v F [2020] VSC 10.');
  assert.deepEqual(results.map((r) => r.level), ['unknown', 'unknown', 'unknown']);
});

test('a quote is unverified when the judgment cannot be downloaded', async () => {
  const offline = { ...corpus, decision: (key: string) => { const d = corpus.decision(key); return d && { ...d, text: async () => null }; } };
  const [result] = (await checkDocument('Thaler [2022] FCAFC 62 at [3] said “only a natural person can be an inventor”.', offline, noHistory)).results;
  assert.equal(result?.level, 'unknown');
  assert.match(result!.findings.map((f) => f.message).join(' '), /Couldn't download/);
});

test('a wrong case name, pinpoint or quote is flagged', async () => {
  const [result] = await check('Smith v Jones [2022] FCAFC 62 at [40] said “an artificial intelligence system can be an inventor”.');
  const messages = result!.findings.map((f) => f.message).join(' ');
  assert.equal(result?.level, 'error');
  assert.match(messages, /Name doesn't match/);
  assert.match(messages, /Wrong pinpoint/);
  assert.match(messages, /Quote not found/);
});

test('a decision overturned on appeal is a warning, and legislation is looked up', async () => {
  const results = await check('Thaler v Commissioner of Patents [2021] FCA 879 is not good law under the Patents Act 1990 (Cth).');
  assert.equal(results[0]?.level, 'unknown'); // FCA 879 itself isn't in this fake dataset
  const appealed = await checkDocument('Thaler [2021] FCA 879', { ...corpus, decision: () => ({ title: 'Thaler v Commissioner of Patents [2021] FCA 879', url: '', paragraphs: 228, text: async () => null }) }, noHistory);
  assert.match(appealed.results[0]!.findings.map((f) => f.message).join(' '), /appeal allowed/);
  assert.equal(results[1]?.kind, 'legislation');
  assert.equal(results[1]?.level, 'ok');
});
