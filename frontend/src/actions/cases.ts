'use server'

import type { CaseDetail, CaseSummary, Issue, LegalArea } from '@/types/cases';

const API_URL = process.env.API_URL || 'http://localhost:3001/api';
const TAXONOMY_CACHE_SECONDS = 3600;

export async function getCases(filters?: {
  jurisdiction?: string | string[];
  issueSlug?: string | string[];
  legalAreaSlug?: string | string[];
  query?: string;
  materialityScore?: string | string[];
  materialityLevel?: string | string[];
  statusPublic?: string | string[];
  caseLifecycleStatus?: string | string[];
  reviewStatus?: string | string[];
  aiRelevanceStatus?: string | string[];
  dateFrom?: string;
  dateTo?: string;
  sort?: string;
}): Promise<CaseSummary[]> {
  const params = new URLSearchParams();
  
  const appendParam = (key: string, value: string | string[] | undefined) => {
    if (!value) return;
    if (Array.isArray(value)) {
      params.append(key, value.join(','));
    } else {
      params.append(key, value);
    }
  };

  appendParam('jurisdiction', filters?.jurisdiction);
  appendParam('issueSlug', filters?.issueSlug);
  appendParam('legalAreaSlug', filters?.legalAreaSlug);
  appendParam('materialityLevel', filters?.materialityLevel || filters?.materialityScore);
  appendParam('caseLifecycleStatus', filters?.caseLifecycleStatus || filters?.statusPublic);
  appendParam('reviewStatus', filters?.reviewStatus);
  appendParam('aiRelevanceStatus', filters?.aiRelevanceStatus);
  appendParam('query', filters?.query);
  appendParam('dateFrom', filters?.dateFrom);
  appendParam('dateTo', filters?.dateTo);
  appendParam('sort', filters?.sort);

  const url = `${API_URL}/cases${params.toString() ? `?${params.toString()}` : ''}`;
  const response = await fetch(url, { cache: 'no-store' });
  
  if (!response.ok) {
    return [];
  }
  
  return response.json() as Promise<CaseSummary[]>;
}

export async function getCaseBySlug(slug: string): Promise<CaseDetail | null> {
  const response = await fetch(`${API_URL}/cases/${slug}`, { cache: 'no-store' });
  if (!response.ok) {
    return null;
  }
  return response.json() as Promise<CaseDetail>;
}

export async function getIssues(): Promise<Issue[]> {
  const response = await fetch(`${API_URL}/issues`, { next: { revalidate: TAXONOMY_CACHE_SECONDS } });
  if (!response.ok) return [];
  return response.json() as Promise<Issue[]>;
}

export async function getLegalAreas(): Promise<LegalArea[]> {
  const response = await fetch(`${API_URL}/legal-areas`, { next: { revalidate: TAXONOMY_CACHE_SECONDS } });
  if (!response.ok) return [];
  return response.json() as Promise<LegalArea[]>;
}
