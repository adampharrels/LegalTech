export type Level = 'error' | 'warning' | 'unknown' | 'ok';

export interface CitationResult {
  kind: 'case' | 'report' | 'legislation';
  written: string;
  level: Level;
  findings: { level: Level; message: string }[];
  source: { title: string; url: string } | null;
  paragraphs: { number: number; text: string }[];
}

export interface Checklist {
  court: string;
  note: string;
  url: string;
  since: string;
  basis?: string;
  rules: string[];
}

export interface CheckOptions {
  courts: string[];
  documentTypes: Record<string, string>;
  dataset: { decisions: number; cutoffDate: string } | null;
}

export interface CheckState {
  text?: string;
  court?: string;
  documentType?: string;
  error?: string;
  report?: {
    documentName: string;
    court: string;
    documentType: string;
    checkedAt: string;
    cutoffDate: string;
    counts: Record<Level, number>;
    results: CitationResult[];
    checklist: Checklist | null;
  };
}
