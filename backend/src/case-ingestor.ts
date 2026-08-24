/**
 * Legal signal ingestion system.
 * Fetches official court, regulator, and guidance sources into one triage pipeline.
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import Parser from 'rss-parser';

export interface CaseSource {
  name: string;
  fetchNewCases: () => Promise<CaseData[]>;
}

export interface CaseData {
  caseName: string;
  citation: string;
  court: string;
  url: string;
  year: number;
  summary: string | null;
  fullText: string | null;
  publishedDate: Date;
  source: string;
  jurisdiction?: string;
  country?: string;
  courtLevel?: string;
  sourceType?: string;
  sourceConfidence?: string;
  sourceAdapterName?: string;
  sourceCategory?: string;
  extractionMethod?: string;
  fetchedAt?: Date;
}

export interface CandidateHints {
  aiRelevanceStatus?: string;
  materialityLevel?: string;
  summaryShort?: string;
  summaryLong?: string;
  reviewerNotes?: string;
  matchedKeywords?: string[];
  llmScreeningStatus?: string;
  llmScreeningReason?: string;
  aiRelevant?: boolean | null;
  relevanceScore?: number | null;
  relevanceReason?: string | null;
  aiRole?: string | null;
  duplicateCheckResult?: string;
  fetchedAt?: Date;
}

type RssSourceConfig = {
  name: string;
  rssUrl: string;
  court: string;
  source: string;
  jurisdiction?: string;
  country?: string;
  courtLevel?: string;
  sourceType?: string;
  sourceConfidence?: string;
  limit?: number;
};

type HtmlSourceConfig = {
  name: string;
  pageUrl: string;
  court: string;
  source: string;
  jurisdiction?: string;
  country?: string;
  courtLevel?: string;
  sourceType?: string;
  sourceConfidence?: string;
  limit?: number;
};

const AI_SIGNAL_PATTERNS = [
  { label: 'artificial intelligence', pattern: /\bartificial intelligence\b/i },
  { label: 'generative AI', pattern: /\bgenerative ai\b/i },
  { label: 'gen AI', pattern: /\bgen ai\b/i },
  { label: 'AI', pattern: /\bai\b/i },
  { label: 'algorithmic systems', pattern: /\balgorithm(ic)?\b/i },
  { label: 'machine learning', pattern: /\bmachine learning\b/i },
  { label: 'large language model', pattern: /\blarge language model\b/i },
  { label: 'LLM', pattern: /\bllm\b/i },
  { label: 'ChatGPT', pattern: /\bchatgpt\b/i },
  { label: 'OpenAI', pattern: /\bopenai\b/i },
  { label: 'Gemini', pattern: /\bgemini\b/i },
  { label: 'Copilot', pattern: /\bcopilot\b/i },
  { label: 'automated decision-making', pattern: /\bautomated decision/i },
  { label: 'automated system', pattern: /\bautomated system/i },
  { label: 'facial recognition', pattern: /\bfacial recognition\b/i },
  { label: 'biometric', pattern: /\bbiometric\b/i },
  { label: 'deepfake', pattern: /\bdeepfake\b/i },
  { label: 'nudifying tools', pattern: /\bnudify(ing)?\b/i },
  { label: 'data scraping', pattern: /\bdata scraping\b/i },
  { label: 'training data', pattern: /\btraining data\b/i },
  { label: 'Clearview', pattern: /\bclearview\b/i },
  { label: 'Metigy', pattern: /\bmetigy\b/i },
  { label: 'AI marketing', pattern: /\bai marketing\b/i },
];

export function getMatchedKeywords(caseData: CaseData): string[] {
  const textToSearch = `${caseData.caseName} ${caseData.summary || ''} ${caseData.fullText || ''}`;
  return AI_SIGNAL_PATTERNS
    .filter(({ pattern }) => pattern.test(textToSearch))
    .map(({ label }) => label);
}

export function passesKeywordFilter(caseData: CaseData): boolean {
  return getMatchedKeywords(caseData).length > 0;
}

function cleanText(value: unknown) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function truncate(value: string | null, length: number) {
  if (!value) {
    return null;
  }

  return value.length > length ? value.substring(0, length) : value;
}

function makeAbsoluteUrl(baseUrl: string, href: string | undefined) {
  if (!href) {
    return baseUrl;
  }

  try {
    return new URL(href, baseUrl).toString();
  } catch {
    return baseUrl;
  }
}

function extractNeutralCitation(title: string, fallbackYear: number) {
  const citationMatch = title.match(/\[(\d{4})\]\s*([A-Z][A-Z0-9]+)\s*(\d+)/);
  return citationMatch ? `[${citationMatch[1]}] ${citationMatch[2]} ${citationMatch[3]}` : `[${fallbackYear}]`;
}

function extractDate(text: string, fallback = new Date()) {
  const dateMatch = text.match(/\b(\d{1,2}\s+[A-Z][a-z]+\s+\d{4})\b/);
  if (!dateMatch?.[1]) {
    return fallback;
  }

  const parsed = new Date(dateMatch[1]);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

function dateFromRssEntry(entry: any) {
  const rawDate = entry.isoDate || entry.pubDate || entry.published || entry.updated;
  const parsed = rawDate ? new Date(rawDate) : new Date();
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function sourceLevel(sourceType: string | undefined, court: string) {
  if (sourceType && sourceType !== 'Court record') {
    return 'Regulator';
  }

  return court.includes('Federal') || court.includes('High Court') ? 'Federal' : 'State';
}

function sourceCategoryFromType(sourceType: string | undefined) {
  if (sourceType === 'Court guidance') {
    return 'Guidance';
  }

  if (sourceType && sourceType !== 'Court record') {
    return 'Regulator';
  }

  return 'Court';
}

class RssLegalSignalSource implements CaseSource {
  name: string;
  private parser = new Parser();

  constructor(private config: RssSourceConfig) {
    this.name = config.name;
  }

  async fetchNewCases(): Promise<CaseData[]> {
    try {
      console.log(`\nFetching ${this.name}...`);
      const feed = await this.parseFeed();
      const cases = feed.items.slice(0, this.config.limit || 10).map((entry: any) => this.extractCaseData(entry));
      console.log(`   Found ${cases.length} items`);
      return cases;
    } catch (error) {
      console.error(`   ${this.name} fetch failed:`, error instanceof Error ? error.message : String(error));
      return [];
    }
  }

  private async parseFeed() {
    try {
      return await this.parser.parseURL(this.config.rssUrl);
    } catch (error) {
      const discoveredFeedUrl = await this.findFeedUrl();
      if (!discoveredFeedUrl) {
        throw error;
      }

      return this.parser.parseURL(discoveredFeedUrl);
    }
  }

  private async findFeedUrl() {
    const response = await axios.get(this.config.rssUrl, { timeout: 15000 });
    const $ = cheerio.load(response.data);
    const href = $('a[href*="rss"], a[href*="feed"], link[type="application/rss+xml"]').first().attr('href');
    return href ? makeAbsoluteUrl(this.config.rssUrl, href) : null;
  }

  private extractCaseData(entry: any): CaseData {
    const title = cleanText(entry.title) || 'Unknown Legal Signal';
    const publishedDate = dateFromRssEntry(entry);
    const summary = truncate(cleanText(entry.contentSnippet || entry.description || entry.content || '') || null, 700);
    const sourceType = this.config.sourceType || 'Court record';
    const fetchedAt = new Date();

    return {
      caseName: title,
      citation: sourceType === 'Court record' ? extractNeutralCitation(title, publishedDate.getFullYear()) : '',
      court: this.config.court,
      url: makeAbsoluteUrl(this.config.rssUrl, entry.link),
      year: publishedDate.getFullYear(),
      summary,
      fullText: null,
      publishedDate,
      source: this.config.source,
      jurisdiction: this.config.jurisdiction || 'Australia',
      country: this.config.country || 'Australia',
      courtLevel: this.config.courtLevel || sourceLevel(sourceType, this.config.court),
      sourceType,
      sourceConfidence: this.config.sourceConfidence || 'Official court source',
      sourceAdapterName: this.name,
      sourceCategory: sourceCategoryFromType(sourceType),
      extractionMethod: 'RSS',
      fetchedAt,
    };
  }
}

class HtmlLegalSignalSource implements CaseSource {
  name: string;

  constructor(private config: HtmlSourceConfig) {
    this.name = config.name;
  }

  async fetchNewCases(): Promise<CaseData[]> {
    try {
      console.log(`\nFetching ${this.name}...`);
      const response = await axios.get(this.config.pageUrl, { timeout: 15000 });
      const cases = this.extractItems(response.data);
      console.log(`   Found ${cases.length} items`);
      return cases;
    } catch (error) {
      console.error(`   ${this.name} fetch failed:`, error instanceof Error ? error.message : String(error));
      return [];
    }
  }

  private extractItems(html: string) {
    const $ = cheerio.load(html);
    const seen = new Set<string>();
    const cases: CaseData[] = [];

    $('a[href]').each((_, element) => {
      if (cases.length >= (this.config.limit || 12)) {
        return false;
      }

      const title = cleanText($(element).text());
      if (title.length < 18 || title.length > 180) {
        return;
      }

      const href = $(element).attr('href');
      const url = makeAbsoluteUrl(this.config.pageUrl, href);
      if (seen.has(url)) {
        return;
      }

      const parentText = cleanText($(element).closest('article, li, div, section').text()) || title;
      const signalText = `${title} ${parentText}`;
      if (!AI_SIGNAL_PATTERNS.some(({ pattern }) => pattern.test(signalText))) {
        return;
      }

      const publishedDate = extractDate(parentText);
      const summary = truncate(parentText === title ? null : parentText, 700);
      const sourceType = this.config.sourceType || 'Regulator release';
      const fetchedAt = new Date();

      seen.add(url);
      cases.push({
        caseName: title,
        citation: '',
        court: this.config.court,
        url,
        year: publishedDate.getFullYear(),
        summary,
        fullText: parentText,
        publishedDate,
        source: this.config.source,
        jurisdiction: this.config.jurisdiction || 'Australia',
        country: this.config.country || 'Australia',
        courtLevel: this.config.courtLevel || 'Regulator',
        sourceType,
        sourceConfidence: this.config.sourceConfidence || 'Official regulator publication',
        sourceAdapterName: this.name,
        sourceCategory: sourceCategoryFromType(sourceType),
        extractionMethod: 'HTML',
        fetchedAt,
      });
    });

    return cases;
  }
}

class StaticLegalSignalSource implements CaseSource {
  name: string;

  constructor(name: string, private cases: CaseData[]) {
    this.name = name;
  }

  async fetchNewCases(): Promise<CaseData[]> {
    console.log(`\nLoading ${this.name}...`);
    console.log(`   Found ${this.cases.length} pinned items`);
    return this.cases;
  }
}

export class FederalCourtIngestor extends RssLegalSignalSource {
  constructor() {
    super({
      name: 'Federal Court judgments RSS',
      rssUrl: 'https://www.judgments.fedcourt.gov.au/rss/fca-judgments',
      court: 'Federal Court of Australia',
      source: 'Federal Court RSS Feed',
      courtLevel: 'Federal',
      sourceType: 'Court record',
    });
  }
}

export class QueenslandCaseLawIngestor extends RssLegalSignalSource {
  constructor() {
    super({
      name: 'Queensland CaseLaw alerts',
      rssUrl: 'https://www.sclqld.org.au/collections/caselaw/caselaw-alerts-rss-feeds',
      court: 'Queensland Courts',
      source: 'Queensland CaseLaw',
      courtLevel: 'State',
      sourceType: 'Court record',
    });
  }
}

export class HighCourtIngestor extends HtmlLegalSignalSource {
  constructor() {
    super({
      name: 'High Court judgments',
      pageUrl: 'https://www.hcourt.gov.au/cases-and-judgments/judgments',
      court: 'High Court of Australia',
      source: 'High Court of Australia judgments page',
      courtLevel: 'Federal',
      sourceType: 'Court record',
      sourceConfidence: 'Official court source',
      limit: 8,
    });
  }
}

export class ASICMediaReleaseIngestor extends HtmlLegalSignalSource {
  constructor() {
    super({
      name: 'ASIC media releases',
      pageUrl: 'https://www.asic.gov.au/newsroom/media-releases/',
      court: 'Australian Securities and Investments Commission',
      source: 'ASIC media releases',
      sourceType: 'Regulator release',
      sourceConfidence: 'Official regulator publication',
      limit: 12,
    });
  }
}

export class ACCCMediaReleaseIngestor extends HtmlLegalSignalSource {
  constructor() {
    super({
      name: 'ACCC media releases',
      pageUrl: 'https://www.accc.gov.au/about-us/media/media-releases?search=artificial%20intelligence&sort_by=search_api_relevance',
      court: 'Australian Competition and Consumer Commission',
      source: 'ACCC media releases',
      sourceType: 'Regulator release',
      sourceConfidence: 'Official regulator publication',
      limit: 12,
    });
  }
}

export class OAICMediaCentreIngestor extends HtmlLegalSignalSource {
  constructor() {
    super({
      name: 'OAIC media centre',
      pageUrl: 'https://www.oaic.gov.au/news/media-centre',
      court: 'Office of the Australian Information Commissioner',
      source: 'OAIC media centre',
      sourceType: 'Regulator decision',
      sourceConfidence: 'Official regulator publication',
      limit: 12,
    });
  }
}

export class ESafetyMediaReleaseIngestor extends HtmlLegalSignalSource {
  constructor() {
    super({
      name: 'eSafety media releases',
      pageUrl: 'https://www.esafety.gov.au/newsroom/media-releases',
      court: 'eSafety Commissioner',
      source: 'eSafety media releases',
      sourceType: 'Regulator release',
      sourceConfidence: 'Official regulator publication',
      limit: 12,
    });
  }
}

export class FederalCourtGuidanceIngestor extends StaticLegalSignalSource {
  constructor() {
    super('Federal Court AI practice guidance', [
      {
        caseName: 'Federal Court of Australia - Use of Generative Artificial Intelligence Practice Note',
        citation: '',
        court: 'Federal Court of Australia',
        url: 'https://www.fedcourt.gov.au/law-and-practice/practice-documents/practice-notes/gpn-ai',
        year: 2026,
        summary: 'General Practice Note on the use of generative artificial intelligence in Federal Court proceedings.',
        fullText: 'The practice note addresses disclosure, responsibilities, and risks when generative artificial intelligence is used in litigation.',
        publishedDate: new Date('2026-04-16T00:00:00.000Z'),
        source: 'Federal Court practice notes',
        jurisdiction: 'Australia',
        country: 'Australia',
        courtLevel: 'Federal',
        sourceType: 'Court guidance',
        sourceConfidence: 'Official court source',
        sourceAdapterName: 'Federal Court AI practice guidance',
        sourceCategory: 'Guidance',
        extractionMethod: 'Pinned',
        fetchedAt: new Date(),
      },
    ]);
  }
}

/**
 * Coordinate all ingestion sources.
 */
export class CaseIngestor {
  private sources: CaseSource[];
  private sourceDelayMs: number;

  constructor(sources?: CaseSource[], sourceDelayMs = 1000) {
    this.sources = sources || [
      new FederalCourtIngestor(),
      new QueenslandCaseLawIngestor(),
      new HighCourtIngestor(),
      new ASICMediaReleaseIngestor(),
      new ACCCMediaReleaseIngestor(),
      new OAICMediaCentreIngestor(),
      new ESafetyMediaReleaseIngestor(),
      new FederalCourtGuidanceIngestor(),
    ];
    this.sourceDelayMs = sourceDelayMs;
  }

  async fetchAllNewCases(): Promise<CaseData[]> {
    console.log('\nStarting Legal Signal Ingestion System');
    console.log('Querying official court, regulator, and guidance sources...\n');

    const allCases: CaseData[] = [];
    const seen = new Set<string>();

    for (const source of this.sources) {
      try {
        const cases = await source.fetchNewCases();
        for (const c of cases) {
          const key = `${c.caseName}-${c.url}`;
          if (!seen.has(key)) {
            seen.add(key);
            allCases.push(c);
          }
        }
      } catch (error) {
        console.error(`   Source error:`, error instanceof Error ? error.message : String(error));
      }

      if (this.sourceDelayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, this.sourceDelayMs));
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('Ingestion Summary:');
    console.log(`   Total legal signals found: ${allCases.length}`);
    console.log(`   Sources queried: ${this.sources.length}`);
    console.log('='.repeat(60) + '\n');

    return allCases;
  }
}

/**
 * Convert case data to database format.
 */
export function convertToDBFormat(caseData: CaseData) {
  const slug = caseData.caseName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 100);

  const sourceType = caseData.sourceType || 'Court record';

  return {
    slug,
    caseName: caseData.caseName,
    neutralCitation: caseData.citation,
    jurisdiction: caseData.jurisdiction || 'Australia',
    country: caseData.country || 'Australia',
    courtName: caseData.court,
    courtLevel: caseData.courtLevel || sourceLevel(sourceType, caseData.court),
    statusPublic: 'ONGOING',
    statusInternal: 'Active',
    caseLifecycleStatus: 'ONGOING',
    reviewStatus: 'LLM analysed',
    aiRelevanceStatus: 'Relevant',
    materialityLevel: 'High',
    materialityScore: '7',
    materialityScoreValue: 7,
    filingDate: caseData.publishedDate,
    summaryShort: caseData.summary ? caseData.summary.substring(0, 200) : 'Australian legal signal',
    summaryLong: caseData.summary || caseData.fullText || 'Australian legal signal',
    whyItMatters: 'Recent legal signal from official Australian sources',
    isAiRelated: true,
  };
}

/**
 * Convert fetched legal signal data into a triage candidate rather than a published case.
 */
export function convertToCandidateFormat(caseData: CaseData, hints: CandidateHints = {}) {
  const fallbackSummary = caseData.summary || caseData.fullText || null;
  const sourceType = caseData.sourceType || 'Court record';

  return {
    caseName: caseData.caseName,
    neutralCitation: caseData.citation || null,
    docketNumber: null,
    jurisdiction: caseData.jurisdiction || 'Australia',
    country: caseData.country || 'Australia',
    courtName: caseData.court,
    courtLevel: caseData.courtLevel || sourceLevel(sourceType, caseData.court),
    candidateStatus: 'Needs human triage',
    sourceConfidence: caseData.sourceConfidence || 'Official court source',
    sourceTitle: caseData.caseName,
    sourceUrl: caseData.url || null,
    sourcePublisher: caseData.source,
    sourceType,
    sourcePublishedAt: caseData.publishedDate,
    sourceAdapterName: caseData.sourceAdapterName || null,
    sourceCategory: caseData.sourceCategory || sourceCategoryFromType(sourceType),
    extractionMethod: caseData.extractionMethod || 'Manual',
    matchedKeywords: hints.matchedKeywords ? JSON.stringify(hints.matchedKeywords) : null,
    llmScreeningStatus: hints.llmScreeningStatus || 'Not screened',
    llmScreeningReason: hints.llmScreeningReason || null,
    aiRelevant: hints.aiRelevant ?? null,
    relevanceScore: hints.relevanceScore ?? null,
    relevanceReason: hints.relevanceReason ?? null,
    aiRole: hints.aiRole ?? null,
    duplicateCheckResult: hints.duplicateCheckResult || null,
    fetchedAt: hints.fetchedAt || caseData.fetchedAt || null,
    aiRelevanceStatus: hints.aiRelevanceStatus || 'Unknown',
    materialityLevel: hints.materialityLevel || 'Low',
    summaryShort: hints.summaryShort || (fallbackSummary ? fallbackSummary.substring(0, 200) : null),
    summaryLong: hints.summaryLong || fallbackSummary,
    reviewerNotes: hints.reviewerNotes || null,
  };
}
