'use server'

const API_URL = process.env.API_URL || 'http://localhost:3001/api';

export async function getCases(filters?: {
  jurisdiction?: string | string[];
  issueSlug?: string | string[];
  legalAreaSlug?: string | string[];
  query?: string;
  materialityScore?: string | string[];
  statusPublic?: string | string[];
  dateFrom?: string;
  dateTo?: string;
}) {
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
  appendParam('materialityScore', filters?.materialityScore);
  appendParam('statusPublic', filters?.statusPublic);
  appendParam('query', filters?.query);
  appendParam('dateFrom', filters?.dateFrom);
  appendParam('dateTo', filters?.dateTo);

  const url = `${API_URL}/cases${params.toString() ? `?${params.toString()}` : ''}`;
  const response = await fetch(url, { cache: 'no-store' });
  
  if (!response.ok) {
    return [];
  }
  
  return response.json();
}

export async function getCaseBySlug(slug: string) {
  const response = await fetch(`${API_URL}/cases/${slug}`, { cache: 'no-store' });
  if (!response.ok) {
    return null;
  }
  return response.json();
}

export async function getIssues() {
  const response = await fetch(`${API_URL}/issues`, { cache: 'no-store' });
  if (!response.ok) return [];
  return response.json();
}

export async function getLegalAreas() {
  const response = await fetch(`${API_URL}/legal-areas`, { cache: 'no-store' });
  if (!response.ok) return [];
  return response.json();
}
