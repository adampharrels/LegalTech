import assert from 'node:assert/strict';
import test from 'node:test';
import { convertToDBFormat, passesKeywordFilter, type CaseData } from './case-ingestor';

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
