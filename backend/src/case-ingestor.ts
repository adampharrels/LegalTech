/**
 * Legal signal ingestion system.
 * Fetches official court, regulator, and guidance sources into one triage pipeline.
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import Parser from 'rss-parser';
import { parse as parseCsv } from 'csv-parse/sync';
import type { LifecycleStageType } from './lifecycle-stages';

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
  // Set by sources that only list AI-related matters, so ingestion can skip
  // the relevance screen for them. aiRole is normalised by the caller.
  preScreened?: { reason: string; aiRole: string };
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

  if (sourceType === 'Media coverage') {
    return 'Media';
  }

  if (sourceType && sourceType !== 'Court record') {
    return 'Regulator';
  }

  return 'Court';
}

const COURT_MENTION_PATTERNS: Array<[RegExp, string]> = [
  [/\bhigh court\b/i, 'High Court of Australia'],
  [/\bfederal court\b/i, 'Federal Court of Australia'],
  [/\bfamily court\b/i, 'Family Court of Australia'],
  [/\bvictorian supreme court\b|\bsupreme court of victoria\b/i, 'Supreme Court of Victoria'],
  [/\bnsw supreme court\b|\bsupreme court of new south wales\b/i, 'Supreme Court of New South Wales'],
  [/\bsupreme court of queensland\b|\bqueensland supreme court\b/i, 'Supreme Court of Queensland'],
  [/\bsupreme court of western australia\b/i, 'Supreme Court of Western Australia'],
  [/\bsupreme court of south australia\b/i, 'Supreme Court of South Australia'],
  [/\bcounty court\b/i, 'County Court of Victoria'],
  [/\bdistrict court\b/i, 'District Court'],
];

function extractCourtMention(text: string, fallback: string) {
  for (const [pattern, label] of COURT_MENTION_PATTERNS) {
    if (pattern.test(text)) {
      return label;
    }
  }

  return fallback;
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
      // The surrounding text usually starts with the link title itself.
      const textAfterTitle = parentText.startsWith(title) ? parentText.slice(title.length).trim() : parentText;
      const summary = truncate(textAfterTitle || null, 700);
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

export interface NewswireItem {
  headline: string;
  excerpt: string;
  matterName: string | null;
  matterUrl: string | null;
  articleUrl: string | null;
  publishedDate: Date;
}

function readNewswireCard(
  $card: cheerio.Cheerio<any>,
  pageUrl: string,
  selectors: { headline: string; excerpt: string; matter: string; date: string; source: string }
): NewswireItem | null {
  const headline = cleanText($card.find(selectors.headline).first().text());
  if (!headline) {
    return null;
  }

  const excerpt = cleanText($card.find(selectors.excerpt).first().text());
  const matterAnchor = $card.find(selectors.matter).first();
  const matterName = matterAnchor.length ? cleanText(matterAnchor.text()) : null;
  const matterHref = matterAnchor.attr('href');
  const matterUrl = matterHref ? makeAbsoluteUrl(pageUrl, matterHref) : null;
  const articleUrl = $card.find(selectors.source).first().attr('href') || null;
  const dateAttr = $card.find(selectors.date).first().attr('datetime');
  const publishedDate = dateAttr ? new Date(dateAttr) : extractDate(`${headline} ${excerpt}`);

  return {
    headline,
    excerpt,
    matterName,
    matterUrl,
    articleUrl,
    publishedDate: Number.isNaN(publishedDate.getTime()) ? new Date() : publishedDate,
  };
}

/**
 * Parse ClassActions.com.au's newswire page (hero card plus every article.nw-card)
 * into a flat, newest-first list of items. Used both for discovering new AI-related
 * matters and for checking whether an already-tracked matter has a reported update.
 */
export function extractNewswireItems(html: string, pageUrl: string): NewswireItem[] {
  const $ = cheerio.load(html);
  const items: NewswireItem[] = [];

  const hero = readNewswireCard($('.nw-hero-content'), pageUrl, {
    headline: '.nw-hero-headline',
    excerpt: '.nw-hero-excerpt',
    matter: '.nw-hero-matter a',
    date: '.nw-hero-byline time',
    source: '.nw-hero-source a',
  });
  if (hero) {
    items.push(hero);
  }

  $('article.nw-card').each((_, element) => {
    const card = readNewswireCard($(element), pageUrl, {
      headline: '.nw-card-headline',
      excerpt: '.nw-card-excerpt',
      matter: '.nw-card-matter a',
      date: '.nw-card-date time',
      source: '.nw-card-source',
    });
    if (card) {
      items.push(card);
    }
  });

  return items;
}

/**
 * Collapse newswire items down to the newest mention of each matter.
 * A matter can be covered by dozens of press articles; callers only ever
 * want the latest one. Items without a matter link are kept individually.
 */
export function latestNewswireItemsByMatter(items: NewswireItem[], pageUrl: string): Map<string, NewswireItem> {
  const latest = new Map<string, NewswireItem>();

  for (const item of items) {
    const dedupeKey = item.matterUrl || `${pageUrl}#${item.headline}`;
    if (!latest.has(dedupeKey)) {
      latest.set(dedupeKey, item);
    }
  }

  return latest;
}

// Words that name the proceeding itself, as opposed to a step within it.
const PROCEEDING = String.raw`(?:class actions?|proceedings?|claims?|case|lawsuits?|suits?|actions?)`;
// A dismissed appeal, application, or motion is a step inside a case that
// usually carries on (and is often a win for the applicants), so a sentence
// about one never counts as the case itself being dismissed.
const INTERLOCUTORY_STEP = /\b(appeals?|applications?|motions?|bids?|challenges?|objections?)\b/i;
// Words that start a new clause. A failure word after one of these is about
// something else: "reached a settlement after the appeal was dismissed".
// "and" only counts when a new subject follows it, so "the settlement and
// distribution scheme was rejected" is still one phrase.
const CLAUSE_BREAK = String.raw`(?:after|before|but|when|while|although|though|because|since|once|and(?=\s+(?:the|a|an|its|their|his|her|it|they)\b))`;
// "the settlement of the class action was dismissed" is about the settlement.
// The optional "class" stops the match restarting at "action" inside "class action".
const NOT_AFTER_SETTLEMENT = String.raw`(?<!\bsettlements?\s+(?:of|in|for)\s+(?:the\s+|a\s+|an\s+)?(?:class\s+)?)`;
// "has not settled", "yet to be settled", "no settlement has been reached".
const SETTLEMENT_NEGATION = /\b(not|yet to|never|unable to|no)\b[^.]{0,25}\bsettle/i;
// Steps that can "conclude" or "close" without the proceeding ending:
// "the trial concluded", "registration for the class action has closed".
const NOT_A_CLOSURE = /\b(hearings?|trials?|submissions?|evidence|mediation|cross-examination|registrations?|opt-outs?|book-?builds?|sign-?ups?|deadlines?)\b/i;

type LifecycleRule = { status: LifecycleStageType; matches: (sentence: string) => boolean };

// Checked in order against every sentence; the first rule that matches any
// sentence wins. Each rule only looks within one sentence, so an unrelated
// clause elsewhere in the coverage can't combine with it.
const LIFECYCLE_RULES: LifecycleRule[] = [
  {
    status: 'Dismissed',
    matches: (sentence) => !INTERLOCUTORY_STEP.test(sentence) && (
      // The proceeding, then up to four words (never "settlement"), then the
      // verb: "the class action against Clearview AI was dismissed".
      new RegExp(String.raw`${NOT_AFTER_SETTLEMENT}\b${PROCEEDING}\s+(?:(?!settlement\b)[\w'-]+\s+){0,4}?(?:was|were|has been|have been|is|been)\s+(?:dismissed|discontinued|struck out|thrown out)\b`, 'i').test(sentence)
      // "dismissed the class action", but not "dismissed the proposed class
      // action settlement" - that is the settlement failing, not the case.
      || new RegExp(String.raw`\b(?:dismissed|discontinued|struck out|threw out)\s+(?:the|a|an|its|their)\s+(?:(?!settlements?\b)[\w-]+\s+){0,3}${PROCEEDING}\b(?!\s+settlement\b)`, 'i').test(sentence)
    ),
  },
  {
    // Checked before Settled so "the settlement was thrown out" isn't read as
    // a completed settlement. Maps to Active: the case goes back to being
    // litigated, it hasn't been dismissed.
    status: 'Settlement failed',
    // The failure has to be about the settlement itself, so both patterns
    // only allow a few words between them and never cross into a new clause.
    matches: (sentence) => (
      // "the in-principle settlement fell through", "settlement talks failed"
      new RegExp(String.raw`\bsettlement\s+(?:(?!${CLAUSE_BREAK}\b)[\w'-]+\s+){0,4}?(?:(?:was|were|has|have|had|is)\s+)?(?:been\s+)?(?:rejected|refused|thrown out|fell through|collapsed|not approved|abandoned|struck out|dismissed|fail(?:s|ed)?)\b`, 'i').test(sentence)
      // "the court rejected the settlement", "failed to reach a settlement"
      || new RegExp(String.raw`\b(?:rejected|refused|threw out|dismissed|abandoned|fail(?:s|ed)? to (?:reach|agree|finali[sz]e|approve))\s+(?:(?!${CLAUSE_BREAK}\b)[\w'-]+\s+){0,4}?settlement\b`, 'i').test(sentence)
    ),
  },
  {
    // A settlement has to be reached, agreed, or approved - talks,
    // negotiations, or mediation alone don't count.
    status: 'Settled',
    matches: (sentence) => !SETTLEMENT_NEGATION.test(sentence) && /\bsettled\b|\bin-principle settlement\b|\bsettlement\b[^.]{0,40}\b(approved|reached|agreed|finali[sz]ed|signed)\b|\b(reach(es|ed)?|agree[sd]?|approv(es|ed)|announc(es|ed)|finali[sz](es|ed))\b[^.]{0,40}\bsettlement\b/i.test(sentence),
  },
  {
    // The proceeding itself has to have ended - see NOT_A_CLOSURE.
    status: 'Closed',
    matches: (sentence) => !NOT_A_CLOSURE.test(sentence) && new RegExp(String.raw`\b(?:${PROCEEDING}|matter)\b[^.]{0,30}\b(?:has|have|was|were|is)?\s*(?:ended|concluded|closed|finali[sz]ed)\b`, 'i').test(sentence),
  },
];

/**
 * Best-effort read of whether a piece of newswire coverage reports a class
 * action reaching a stage worth proposing as a status change: settled,
 * dismissed, closed, or a settlement falling through. Returns null when no
 * such stage is mentioned. A human always confirms the result.
 */
export function detectLifecycleStage(text: string): LifecycleStageType | null {
  const sentences = text.split(/(?<=[.!?])\s+/);

  for (const rule of LIFECYCLE_RULES) {
    if (sentences.some((sentence) => rule.matches(sentence))) {
      return rule.status;
    }
  }

  return null;
}

export function extractClassActionsNewswireCases(
  html: string,
  pageUrl: string,
  sourceName: string,
  limit = 25
): CaseData[] {
  const items = extractNewswireItems(html, pageUrl);
  const latest = latestNewswireItemsByMatter(items, pageUrl);
  const cases: CaseData[] = [];
  const fetchedAt = new Date();

  for (const [matterUrl, item] of latest) {
    if (cases.length >= limit) {
      break;
    }

    const signalText = `${item.headline} ${item.excerpt} ${item.matterName || ''}`;
    if (!AI_SIGNAL_PATTERNS.some(({ pattern }) => pattern.test(signalText))) {
      continue;
    }

    cases.push({
      caseName: item.matterName || item.headline,
      citation: '',
      court: extractCourtMention(signalText, 'Class action matter (court not specified)'),
      url: item.matterUrl || matterUrl,
      year: item.publishedDate.getFullYear(),
      summary: truncate(item.excerpt || null, 700),
      fullText: truncate([item.headline, item.excerpt].filter(Boolean).join('\n\n') || null, 2000),
      publishedDate: item.publishedDate,
      source: sourceName,
      jurisdiction: 'Australia',
      country: 'Australia',
      courtLevel: 'Media',
      sourceType: 'Media coverage',
      sourceConfidence: 'Secondary source',
      sourceAdapterName: sourceName,
      sourceCategory: 'Media',
      extractionMethod: 'HTML',
      fetchedAt,
    });
  }

  return cases;
}

const HALLUCINATION_DATABASE_PAGE = 'https://www.damiencharlotin.com/hallucinations/';
const HALLUCINATION_DATABASE_CSV = 'https://www.damiencharlotin.com/hallucinations/hallucinations/download.csv';
const HALLUCINATION_DATABASE_PUBLISHER = 'AI Hallucination Cases Database (Damien Charlotin, CC BY 4.0)';

type HallucinationDatabaseRow = Record<string, string | undefined>;

// The decision PDFs are named like "..._2026_QIRC_261_24_August_2026.pdf".
function citationFromFileName(url: string) {
  const fileName = decodeURIComponent(url.split('/').pop() || '').replace(/_/g, ' ');
  const match = fileName.match(/\b(\d{4}) ([A-Z][A-Za-z]{1,10}) (\d{1,5})\b/);
  return match ? `[${match[1]}] ${match[2]} ${match[3]}` : '';
}

/**
 * Parse the AI Hallucination Cases Database CSV into cases for one country.
 * Every row is a decision where a court or tribunal found AI-generated false
 * content (usually fabricated citations), so the rows are pre-screened as
 * AI-relevant. Licensed CC BY 4.0; the publisher name carries the attribution.
 */
export function extractHallucinationDatabaseCases(csvText: string, sourceName: string, country = 'Australia'): CaseData[] {
  const rows = parseCsv(csvText, { columns: true, skip_empty_lines: true, bom: true }) as HallucinationDatabaseRow[];
  const fetchedAt = new Date();
  const cases: CaseData[] = [];

  for (const row of rows) {
    const caseName = cleanText(row['Case Name']);
    const rawSource = cleanText(row['Source']);
    if (!caseName || !rawSource || !cleanText(row['State(s)']).includes(country)) {
      continue;
    }

    const url = makeAbsoluteUrl(HALLUCINATION_DATABASE_PAGE, rawSource);
    const parsedDate = new Date(cleanText(row['Date']));
    const publishedDate = Number.isNaN(parsedDate.getTime()) ? fetchedAt : parsedDate;
    const court = cleanText(row['Court']) || 'Court not specified';
    const outcome = cleanText(row['Outcome']);
    // "Fabricated: Case Law | The submissions cited..." - keep the description.
    const firstItem = cleanText(row['Hallucination Items']).split('||')[0]?.split('|').pop()?.trim() || '';
    const description = cleanText(row['Details']) || firstItem;

    cases.push({
      caseName,
      citation: citationFromFileName(url),
      court,
      url,
      year: publishedDate.getFullYear(),
      summary: truncate([outcome ? `Outcome: ${outcome}.` : null, description || null].filter(Boolean).join(' ') || null, 700),
      fullText: truncate(cleanText(row['Hallucination Items']) || null, 2000),
      publishedDate,
      source: HALLUCINATION_DATABASE_PUBLISHER,
      jurisdiction: country,
      country,
      courtLevel: /high court|federal|arta|administrative review|fair work/i.test(court) ? 'Federal' : 'State',
      sourceType: 'Database entry',
      sourceConfidence: 'Court-adjacent source',
      sourceAdapterName: sourceName,
      sourceCategory: 'Database',
      extractionMethod: 'CSV',
      fetchedAt,
      preScreened: {
        reason: 'Listed in the AI Hallucination Cases Database: the court or tribunal found AI-generated false content in material before it.',
        aiRole: 'GENERATIVE_AI',
      },
    });
  }

  return cases;
}

export class HallucinationDatabaseIngestor implements CaseSource {
  name = 'AI Hallucination Cases Database';

  constructor(private country = 'Australia') {}

  async fetchNewCases(): Promise<CaseData[]> {
    try {
      console.log(`\nFetching ${this.name}...`);
      const response = await axios.get(HALLUCINATION_DATABASE_CSV, { timeout: 30000, responseType: 'text' });
      const cases = extractHallucinationDatabaseCases(String(response.data), this.name, this.country);
      console.log(`   Found ${cases.length} ${this.country} items`);
      return cases;
    } catch (error) {
      console.error(`   ${this.name} fetch failed:`, error instanceof Error ? error.message : String(error));
      return [];
    }
  }
}

// AI terms, litigation terms, and Australia: news coverage of an AI dispute
// usually appears well before the matter is easy to find in a court database.
const GOOGLE_NEWS_QUERY = '("artificial intelligence" OR "generative AI" OR ChatGPT OR deepfake OR "facial recognition" OR algorithm) '
  + '(court OR tribunal OR lawsuit OR "class action" OR judge) (Australia OR Australian) when:30d';

export interface GoogleNewsItem {
  title?: string;
  link?: string;
  isoDate?: string;
  source?: string;
}

/**
 * Turn one Google News RSS item into a case lead. Titles end with
 * " - Publisher", which is split off. Links are Google News redirect URLs;
 * they are stable enough to deduplicate on and open in a browser.
 */
export function googleNewsItemToCaseData(item: GoogleNewsItem, sourceName: string): CaseData | null {
  const rawTitle = cleanText(item.title);
  if (!rawTitle || !item.link) {
    return null;
  }

  const publisher = cleanText(item.source) || null;
  const headline = publisher && rawTitle.endsWith(` - ${publisher}`)
    ? rawTitle.slice(0, -(publisher.length + 3)).trim()
    : rawTitle;
  const parsedDate = item.isoDate ? new Date(item.isoDate) : new Date();
  const publishedDate = Number.isNaN(parsedDate.getTime()) ? new Date() : parsedDate;

  return {
    caseName: headline,
    citation: '',
    court: extractCourtMention(headline, 'Not specified (news report)'),
    url: item.link,
    year: publishedDate.getFullYear(),
    summary: null,
    fullText: headline,
    publishedDate,
    source: publisher ? `${publisher} (via Google News)` : 'Google News',
    jurisdiction: 'Australia',
    country: 'Australia',
    courtLevel: 'Media',
    sourceType: 'Media coverage',
    sourceConfidence: 'Secondary source',
    sourceAdapterName: sourceName,
    sourceCategory: 'Media',
    extractionMethod: 'RSS',
    fetchedAt: new Date(),
  };
}

export class GoogleNewsIngestor implements CaseSource {
  name = 'Google News search';
  private parser = new Parser<Record<string, unknown>, GoogleNewsItem>({ customFields: { item: ['source'] } });

  constructor(private query = GOOGLE_NEWS_QUERY, private limit = 20) {}

  async fetchNewCases(): Promise<CaseData[]> {
    try {
      console.log(`\nFetching ${this.name}...`);
      const url = `https://news.google.com/rss/search?q=${encodeURIComponent(this.query)}&hl=en-AU&gl=AU&ceid=AU:en`;
      const feed = await this.parser.parseURL(url);
      const cases = feed.items
        .map((item) => googleNewsItemToCaseData(item, this.name))
        .filter((caseData): caseData is CaseData => caseData !== null)
        .slice(0, this.limit);
      console.log(`   Found ${cases.length} items`);
      return cases;
    } catch (error) {
      console.error(`   ${this.name} fetch failed:`, error instanceof Error ? error.message : String(error));
      return [];
    }
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

export class ClassActionsNewswireIngestor implements CaseSource {
  name = 'ClassActions.com.au newswire';
  private pageUrl = 'https://classactions.com.au/newswire';

  constructor(private limit = 25) {}

  async fetchNewCases(): Promise<CaseData[]> {
    try {
      console.log(`\nFetching ${this.name}...`);
      const response = await axios.get(this.pageUrl, { timeout: 15000 });
      const cases = extractClassActionsNewswireCases(response.data, this.pageUrl, this.name, this.limit);
      console.log(`   Found ${cases.length} items`);
      return cases;
    } catch (error) {
      console.error(`   ${this.name} fetch failed:`, error instanceof Error ? error.message : String(error));
      return [];
    }
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
      new ClassActionsNewswireIngestor(),
      new HallucinationDatabaseIngestor(),
      new GoogleNewsIngestor(),
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
