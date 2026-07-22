import assert from 'node:assert/strict';
import test from 'node:test';
import { CaseIngestor, convertToCandidateFormat, convertToDBFormat, passesKeywordFilter, type CaseData, type CaseSource } from './case-ingestor';

function makeCaseData(overrides: Partial<CaseData> = {}): CaseData {
  return {
    caseName: 'Example Pty Ltd v Platform Inc [2026] FCA 123',
    citation: '[2026] FCA 123',
    court: 'Federal Court of Australia',
    url: 'https://example.test/judgment',
    year: 2026,
    summary: 'A dispute about automated decision-making in a commercial platform.',
    fullText: null,
    publishedDate: new Date('2026-03-15T00:00:00.000Z'),
    source: 'Federal Court RSS Feed',
    ...overrides,
  };
}

test('passesKeywordFilter detects AI-related terms across case text', () => {
  assert.equal(passesKeywordFilter(makeCaseData()), true);
  assert.equal(
    passesKeywordFilter(makeCaseData({ summary: null, fullText: 'The pleadings refer to ChatGPT outputs.' })),
    true
  );
  assert.equal(
    passesKeywordFilter(makeCaseData({ summary: 'The regulator raised biometric and facial recognition concerns.' })),
    true
  );
});

test('passesKeywordFilter rejects unrelated cases', () => {
  const result = passesKeywordFilter(
    makeCaseData({
      caseName: 'Example Pty Ltd v Council',
      summary: 'A planning dispute about zoning approvals.',
      fullText: 'The proceeding concerns land use and administrative review.',
    })
  );

  assert.equal(result, false);
});

test('convertToDBFormat maps source data into a stable case record shape', () => {
  const converted = convertToDBFormat(makeCaseData());

  assert.equal(converted.slug, 'example-pty-ltd-v-platform-inc-2026-fca-123');
  assert.equal(converted.caseName, 'Example Pty Ltd v Platform Inc [2026] FCA 123');
  assert.equal(converted.neutralCitation, '[2026] FCA 123');
  assert.equal(converted.jurisdiction, 'Australia');
  assert.equal(converted.country, 'Australia');
  assert.equal(converted.courtLevel, 'Federal');
  assert.equal(converted.statusPublic, 'Published');
  assert.equal(converted.filingDate.toISOString(), '2026-03-15T00:00:00.000Z');
});

test('convertToDBFormat truncates long generated slugs', () => {
  const converted = convertToDBFormat(
    makeCaseData({
      caseName:
        'A Very Long Case Name With Many Parties And Additional Procedural Descriptors That Should Not Produce An Unbounded Slug',
    })
  );

  assert.equal(converted.slug.length, 100);
});

test('convertToCandidateFormat maps ingested cases into triage candidates', () => {
  const converted = convertToCandidateFormat(makeCaseData(), {
    aiRelevanceStatus: 'Relevant',
    materialityLevel: 'High',
    summaryShort: 'LLM summary',
    summaryLong: 'Long LLM summary',
    reviewerNotes: 'LLM screened.',
  });

  assert.equal(converted.caseName, 'Example Pty Ltd v Platform Inc [2026] FCA 123');
  assert.equal(converted.neutralCitation, '[2026] FCA 123');
  assert.equal(converted.candidateStatus, 'Needs human triage');
  assert.equal(converted.sourceConfidence, 'Official court source');
  assert.equal(converted.sourceTitle, 'Example Pty Ltd v Platform Inc [2026] FCA 123');
  assert.equal(converted.sourcePublisher, 'Federal Court RSS Feed');
  assert.equal(converted.aiRelevanceStatus, 'Relevant');
  assert.equal(converted.materialityLevel, 'High');
  assert.equal(converted.summaryShort, 'LLM summary');
  assert.equal(converted.reviewerNotes, 'LLM screened.');
});

test('convertToCandidateFormat preserves regulator source metadata', () => {
  const converted = convertToCandidateFormat(
    makeCaseData({
      caseName: 'Regulator publishes generative AI compliance action',
      citation: '',
      court: 'Australian Securities and Investments Commission',
      source: 'ASIC media releases',
      sourceType: 'Regulator release',
      sourceConfidence: 'Official regulator publication',
      courtLevel: 'Regulator',
    })
  );

  assert.equal(converted.neutralCitation, null);
  assert.equal(converted.courtName, 'Australian Securities and Investments Commission');
  assert.equal(converted.courtLevel, 'Regulator');
  assert.equal(converted.sourceType, 'Regulator release');
  assert.equal(converted.sourceConfidence, 'Official regulator publication');
});

test('CaseIngestor coordinates injected sources and deduplicates by case name and URL', async () => {
  const sourceCase = makeCaseData();
  const sources: CaseSource[] = [
    {
      name: 'Source A',
      fetchNewCases: async () => [sourceCase],
    },
    {
      name: 'Source B',
      fetchNewCases: async () => [sourceCase, makeCaseData({ caseName: 'Different AI matter', url: 'https://example.test/other' })],
    },
  ];

  const ingestor = new CaseIngestor(sources, 0);
  const cases = await ingestor.fetchAllNewCases();

  assert.equal(cases.length, 2);
  assert.equal(cases[0]?.caseName, sourceCase.caseName);
  assert.equal(cases[1]?.caseName, 'Different AI matter');
});
