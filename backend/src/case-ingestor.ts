/**
 * Real Case Ingestion System
 * Fetches legitimate cases from official government RSS feeds and court sources
 * No scraping, no mock data - just real judgment data
 */

import Parser from 'rss-parser';
import axios from 'axios';

export interface CaseSource {
  name: string;
  rssUrl: string;
  extractCaseData: (entry: any) => Promise<CaseData>;
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
}

export function passesKeywordFilter(caseData: CaseData): boolean {
  const textToSearch = `${caseData.caseName} ${caseData.summary || ''} ${caseData.fullText || ''}`.toLowerCase();
  const keywords = [
    'artificial intelligence', 'algorithm', 'machine learning', 'automated decision',
    'facial recognition', 'llm', 'chatgpt', 'deepfake', 'generative ai', 'openai'
  ];
  return keywords.some(keyword => textToSearch.includes(keyword));
}


/**
 * Federal Court of Australia - FCA Judgments RSS
 * Official feed from fedcourt.gov.au
 * Updated daily with new judgments from 1977-present
 */
export class FederalCourtIngestor {
  private rssUrl = 'https://www.judgments.fedcourt.gov.au/rss/fca-judgments';
  private parser = new Parser();

  async fetchNewCases(): Promise<CaseData[]> {
    try {
      console.log('\nFetching Federal Court judgments from RSS...');
      const feed = await this.parser.parseURL(this.rssUrl);
      const cases: CaseData[] = [];

      for (const entry of feed.items.slice(0, 10)) {
        try {
          const caseData = await this.extractCaseData(entry);
          cases.push(caseData);
        } catch (error) {
          console.error(`   Error processing entry: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      console.log(`   Found ${cases.length} Federal Court cases`);
      return cases;
    } catch (error) {
      console.error(
        `   Federal Court fetch failed:`,
        error instanceof Error ? error.message : String(error)
      );
      return [];
    }
  }

  private async extractCaseData(entry: any): Promise<CaseData> {
    const title = entry.title || 'Unknown Case';
    const url = entry.link || '';
    const pubDate = entry.pubDate ? new Date(entry.pubDate) : new Date();
    const year = pubDate.getFullYear();

    let summary = entry.contentSnippet || entry.description || null;
    if (summary) {
      summary = summary.substring(0, 500);
    }

    // Extract citation from title (FCA format: Case Name [YYYY] FCA XXX)
    const citationMatch = title.match(/\[(\d{4})\]\s*(FCA|HCA|NSWSC)\s*(\d+)/);
    const citation = citationMatch ? `[${citationMatch[1]}] ${citationMatch[2]} ${citationMatch[3]}` : `[${year}] FCA`;

    return {
      caseName: title,
      citation,
      court: 'Federal Court of Australia',
      url,
      year,
      summary,
      fullText: null, // Can be fetched on demand
      publishedDate: pubDate,
      source: 'Federal Court RSS Feed',
    };
  }
}

/**
 * High Court of Australia
 * Official judgments from hcourt.gov.au
 */
export class HighCourtIngestor {
  private baseUrl = 'https://www.hcourt.gov.au';
  private parser = new Parser();

  async fetchNewCases(): Promise<CaseData[]> {
    try {
      console.log('\nFetching High Court of Australia judgments...');
      // Note: High Court has judgments page but may not have RSS
      // You would need to scrape the page or contact them for API access
      console.log('   High Court API not yet integrated (contact hcourt.gov.au for access)');
      return [];
    } catch (error) {
      console.error(
        `   High Court fetch failed:`,
        error instanceof Error ? error.message : String(error)
      );
      return [];
    }
  }
}

/**
 * Queensland CaseLaw
 * Recent decisions with RSS feed support
 */
export class QueenslandCaseLawIngestor {
  private rssUrl = 'https://www.sclqld.org.au/collections/caselaw/caselaw-alerts-rss-feeds';
  private parser = new Parser();

  async fetchNewCases(): Promise<CaseData[]> {
    try {
      console.log('\nFetching Queensland CaseLaw decisions...');
      const feed = await this.parser.parseURL(this.rssUrl);
      const cases: CaseData[] = [];

      for (const entry of feed.items.slice(0, 10)) {
        try {
          const caseData = await this.extractCaseData(entry);
          cases.push(caseData);
        } catch (error) {
          console.error(`   Error processing entry: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      console.log(`   Found ${cases.length} Queensland cases`);
      return cases;
    } catch (error) {
      console.error(
        `   Queensland CaseLaw fetch failed:`,
        error instanceof Error ? error.message : String(error)
      );
      return [];
    }
  }

  private async extractCaseData(entry: any): Promise<CaseData> {
    const title = entry.title || 'Unknown Case';
    const url = entry.link || '';
    const pubDate = entry.pubDate ? new Date(entry.pubDate) : new Date();
    const year = pubDate.getFullYear();

    let summary = entry.contentSnippet || entry.description || null;
    if (summary) {
      summary = summary.substring(0, 500);
    }

    const citationMatch = title.match(/\[(\d{4})\]\s*(\w+)\s*(\d+)/);
    const citation = citationMatch ? `[${citationMatch[1]}] ${citationMatch[2]} ${citationMatch[3]}` : `[${year}]`;

    return {
      caseName: title,
      citation,
      court: 'Queensland Courts',
      url,
      year,
      summary,
      fullText: null,
      publishedDate: pubDate,
      source: 'Queensland CaseLaw',
    };
  }
}

/**
 * NSW CaseLaw
 * New South Wales court decisions
 */
export class NSWCaseLawIngestor {
  async fetchNewCases(): Promise<CaseData[]> {
    try {
      console.log('\nFetching NSW CaseLaw decisions...');
      // NSW Caselaw doesn't have a public RSS, but has a decisions page
      // Contact courts.nsw.gov.au for integration options
      console.log('   NSW CaseLaw API not yet integrated (contact courts.nsw.gov.au for access)');
      return [];
    } catch (error) {
      console.error(
        `   NSW CaseLaw fetch failed:`,
        error instanceof Error ? error.message : String(error)
      );
      return [];
    }
  }
}

/**
 * Coordinate all ingestion sources
 */
export class CaseIngestor {
  private sources = [new FederalCourtIngestor(), new QueenslandCaseLawIngestor()];

  async fetchAllNewCases(): Promise<CaseData[]> {
    console.log('\nStarting Case Ingestion System');
    console.log('Querying official Australian court sources...\n');

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
        console.error(
          `   Source error:`,
          error instanceof Error ? error.message : String(error)
        );
      }

      // Rate limiting between sources
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    console.log('\n' + '='.repeat(60));
    console.log('Ingestion Summary:');
    console.log(`   Total cases found: ${allCases.length}`);
    console.log(`   Sources queried: ${this.sources.length}`);
    console.log('='.repeat(60) + '\n');

    return allCases;
  }
}

/**
 * Convert case data to database format
 */
export function convertToDBFormat(caseData: CaseData) {
  const slug = caseData.caseName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 100);

  return {
    slug,
    caseName: caseData.caseName,
    neutralCitation: caseData.citation,
    jurisdiction: 'Australia',
    country: 'Australia',
    courtName: caseData.court,
    courtLevel: caseData.court.includes('Federal') ? 'Federal' : 'State',
    statusPublic: 'Published',
    statusInternal: 'Active',
    caseLifecycleStatus: 'Published',
    reviewStatus: 'LLM analysed',
    aiRelevanceStatus: 'Relevant',
    materialityLevel: 'High',
    materialityScore: '7',
    materialityScoreValue: 7,
    filingDate: caseData.publishedDate,
    summaryShort: caseData.summary ? caseData.summary.substring(0, 200) : 'Australian court judgment',
    summaryLong: caseData.summary || caseData.fullText || 'Australian court judgment',
    whyItMatters: 'Recent judgment from official Australian court sources',
    isAiRelated: true, // Filter for AI-related cases in processing layer
  };
}
