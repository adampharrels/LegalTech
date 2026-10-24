import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CaseIngestor,
  convertToCandidateFormat,
  convertToDBFormat,
  detectLifecycleStage,
  extractClassActionsNewswireCases,
  extractNewswireItems,
  getMatchedKeywords,
  latestNewswireItemsByMatter,
  passesKeywordFilter,
  type CaseData,
  type CaseSource,
} from './case-ingestor';

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

test('getMatchedKeywords returns readable evidence labels', () => {
  const matchedKeywords = getMatchedKeywords(
    makeCaseData({
      summary: 'The regulator raised biometric and facial recognition concerns about an automated system.',
    })
  );

  assert.deepEqual(matchedKeywords, ['automated system', 'facial recognition', 'biometric']);
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
    matchedKeywords: ['automated decision-making'],
    llmScreeningStatus: 'Relevant',
    llmScreeningReason: 'The dispute turns on automated decisions.',
    duplicateCheckResult: 'No duplicate found.',
    fetchedAt: new Date('2026-03-16T00:00:00.000Z'),
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
  assert.equal(converted.matchedKeywords, JSON.stringify(['automated decision-making']));
  assert.equal(converted.llmScreeningStatus, 'Relevant');
  assert.equal(converted.llmScreeningReason, 'The dispute turns on automated decisions.');
  assert.equal(converted.duplicateCheckResult, 'No duplicate found.');
  assert.equal(converted.fetchedAt?.toISOString(), '2026-03-16T00:00:00.000Z');
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
      sourceAdapterName: 'ASIC media releases',
      sourceCategory: 'Regulator',
      extractionMethod: 'HTML',
    })
  );

  assert.equal(converted.neutralCitation, null);
  assert.equal(converted.courtName, 'Australian Securities and Investments Commission');
  assert.equal(converted.courtLevel, 'Regulator');
  assert.equal(converted.sourceType, 'Regulator release');
  assert.equal(converted.sourceConfidence, 'Official regulator publication');
  assert.equal(converted.sourceAdapterName, 'ASIC media releases');
  assert.equal(converted.sourceCategory, 'Regulator');
  assert.equal(converted.extractionMethod, 'HTML');
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

function newswireFixture() {
  return `
    <html><body>
      <section class="nw-hero">
        <div class="nw-hero-content">
          <a href="#hero" class="nw-hero-headline">Sports concussion class action wins mediation date</a>
          <p class="nw-hero-excerpt">A concussion class action against a sporting league is scheduled for trial.</p>
          <div class="nw-hero-matter">Matter &rarr; <a href="/matters/concussion-class-action">Concussion Class Action</a></div>
          <div class="nw-hero-byline"><time datetime="2026-05-18">18 May 2026</time></div>
        </div>
      </section>
      <article class="nw-card">
        <div class="nw-card-date"><time datetime="2026-05-14">14 May 2026</time></div>
        <a href="https://example-news.test/clearview-trial" class="nw-card-source">Example News</a>
        <h2 class="nw-card-headline">Facial recognition class action heads to Federal Court trial</h2>
        <p class="nw-card-excerpt">The Federal Court will hear claims about Clearview's facial recognition scraping practices.</p>
        <div class="nw-card-matter">Matter: <a href="/matters/clearview-class-action">Clearview Facial Recognition Class Action</a></div>
      </article>
      <article class="nw-card">
        <div class="nw-card-date"><time datetime="2026-05-10">10 May 2026</time></div>
        <h2 class="nw-card-headline">Older report on the same Clearview facial recognition case</h2>
        <p class="nw-card-excerpt">Background on the Clearview matter before the trial date was set.</p>
        <div class="nw-card-matter">Matter: <a href="/matters/clearview-class-action">Clearview Facial Recognition Class Action</a></div>
      </article>
      <article class="nw-card">
        <div class="nw-card-date"><time datetime="2026-05-12">12 May 2026</time></div>
        <h2 class="nw-card-headline">Supermarket discount class action reaches settlement</h2>
        <p class="nw-card-excerpt">Shoppers will be compensated after a pricing class action settled out of court.</p>
        <div class="nw-card-matter">Matter: <a href="/matters/discount-class-action">Discount Pricing Class Action</a></div>
      </article>
    </body></html>
  `;
}

test('extractClassActionsNewswireCases keeps only AI-relevant matters, deduplicated to the newest mention', () => {
  const cases = extractClassActionsNewswireCases(
    newswireFixture(),
    'https://classactions.com.au/newswire',
    'ClassActions.com.au newswire'
  );

  assert.equal(cases.length, 1);
  const [clearviewCase] = cases;
  assert.equal(clearviewCase?.caseName, 'Clearview Facial Recognition Class Action');
  assert.equal(clearviewCase?.url, 'https://classactions.com.au/matters/clearview-class-action');
  assert.equal(clearviewCase?.court, 'Federal Court of Australia');
  assert.equal(clearviewCase?.publishedDate.toISOString(), '2026-05-14T00:00:00.000Z');
  assert.equal(clearviewCase?.sourceType, 'Media coverage');
  assert.equal(clearviewCase?.sourceCategory, 'Media');
  assert.equal(clearviewCase?.courtLevel, 'Media');
  assert.match(clearviewCase?.summary || '', /Clearview/);
});

test('extractClassActionsNewswireCases respects the limit', () => {
  const cases = extractClassActionsNewswireCases(
    newswireFixture(),
    'https://classactions.com.au/newswire',
    'ClassActions.com.au newswire',
    0
  );

  assert.equal(cases.length, 0);
});

test('extractNewswireItems captures the article source link alongside the matter link', () => {
  const items = extractNewswireItems(newswireFixture(), 'https://classactions.com.au/newswire');
  const clearviewTrialItem = items.find((item) => item.headline.startsWith('Facial recognition'));

  assert.equal(clearviewTrialItem?.matterUrl, 'https://classactions.com.au/matters/clearview-class-action');
  assert.equal(clearviewTrialItem?.articleUrl, 'https://example-news.test/clearview-trial');
});

test('latestNewswireItemsByMatter keeps only the newest item per matter, in feed order', () => {
  const items = extractNewswireItems(newswireFixture(), 'https://classactions.com.au/newswire');
  const latest = latestNewswireItemsByMatter(items, 'https://classactions.com.au/newswire');

  assert.equal(latest.size, 3);
  const clearview = latest.get('https://classactions.com.au/matters/clearview-class-action');
  assert.equal(clearview?.headline, 'Facial recognition class action heads to Federal Court trial');
});

test('detectLifecycleStage reads settlement, dismissal, and closure language', () => {
  assert.equal(detectLifecycleStage('The parties have reached a settlement.'), 'Settled');
  assert.equal(detectLifecycleStage('The claim was dismissed by the court.'), 'Dismissed');
  assert.equal(detectLifecycleStage('The proceeding has concluded.'), 'Closed');
  assert.equal(detectLifecycleStage('A trial has been listed for next year.'), null);
});

test('detectLifecycleStage reads a failed settlement as Settlement failed, not Settled or Dismissed', () => {
  assert.equal(detectLifecycleStage('The court rejected the settlement reached by the parties.'), 'Settlement failed');
  assert.equal(
    detectLifecycleStage('The in-principle settlement fell through after the board withdrew approval.'),
    'Settlement failed'
  );
  assert.equal(detectLifecycleStage('The parties failed to reach a settlement at mediation.'), 'Settlement failed');
});

test('detectLifecycleStage still reads Dismissed when the case itself is dismissed after a failed settlement', () => {
  assert.equal(
    detectLifecycleStage('The proposed settlement was thrown out and the case was dismissed.'),
    'Dismissed'
  );
  assert.equal(detectLifecycleStage('The class action against Clearview AI was dismissed.'), 'Dismissed');
  assert.equal(detectLifecycleStage('The applicants discontinued the proceeding.'), 'Dismissed');
});

test('detectLifecycleStage does not treat a dismissed appeal, application, or settlement as the case being dismissed', () => {
  assert.equal(
    detectLifecycleStage('The appeal was dismissed, clearing the way for the class action to proceed.'),
    null
  );
  assert.equal(detectLifecycleStage('The strike-out application was dismissed.'), null);
  assert.equal(detectLifecycleStage('The class action settlement was dismissed.'), 'Settlement failed');
});

test('detectLifecycleStage needs a settlement to be reached, not just discussed or denied', () => {
  assert.equal(detectLifecycleStage('Parties enter settlement talks.'), null);
  assert.equal(detectLifecycleStage('The case has not settled and is listed for trial.'), null);
  assert.equal(detectLifecycleStage('No settlement has been reached.'), null);
  assert.equal(detectLifecycleStage('Clearview class action reaches settlement'), 'Settled');
  assert.equal(detectLifecycleStage('The court approved the settlement.'), 'Settled');
});

test('detectLifecycleStage does not treat a concluded step as the proceeding closing', () => {
  assert.equal(detectLifecycleStage('The hearing concluded on Friday.'), null);
  assert.equal(detectLifecycleStage('The trial in the class action concluded last week.'), null);
  assert.equal(detectLifecycleStage('Registration for the class action has closed.'), null);
  assert.equal(detectLifecycleStage('The matter has concluded.'), 'Closed');
});

test('detectLifecycleStage does not let an unrelated dismissal in a later sentence override a real settlement', () => {
  assert.equal(
    detectLifecycleStage('The parties have reached a settlement. The court separately dismissed an unrelated motion.'),
    'Settled'
  );
});
