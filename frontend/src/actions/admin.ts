'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { CaseCandidate, CaseDetail } from '@/types/cases';

const API_URL = process.env.API_URL || 'http://localhost:3001/api';

export async function deleteCase(id: string) {
  await fetch(`${API_URL}/cases/${id}`, {
    method: 'DELETE',
  });
  revalidatePath('/admin');
  revalidatePath('/cases');
  revalidatePath('/dashboard');
}

export async function analyzeCase(id: string) {
  const response = await fetch(`${API_URL}/cases/${id}/analyze`, {
    method: 'POST',
  });

  if (!response.ok) {
    throw new Error('Failed to analyse case with LLM');
  }

  const result = await response.json();

  revalidatePath('/admin');
  revalidatePath('/cases');
  revalidatePath('/dashboard');
  redirect(`/cases/${result.case.slug}#ai-summary`);
}

export async function reviewLlmAnalysis(formData: FormData) {
  const analysisId = String(formData.get('analysisId') || '');
  const caseSlug = String(formData.get('caseSlug') || '');
  const decision = String(formData.get('decision') || '');
  const reviewerName = formData.get('reviewerName');
  const reviewerNotes = formData.get('reviewerNotes');

  const response = await fetch(`${API_URL}/llm-analyses/${analysisId}/review`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ decision, reviewerName, reviewerNotes }),
  });

  if (!response.ok) {
    throw new Error('Failed to save human review');
  }

  revalidatePath('/admin');
  revalidatePath('/cases');
  revalidatePath(`/cases/${caseSlug}`);
  revalidatePath('/dashboard');
  redirect(`/cases/${caseSlug}#llm-analysis`);
}

export async function updateSourceVerification(formData: FormData) {
  const sourceId = String(formData.get('sourceId') || '');
  const caseSlug = String(formData.get('caseSlug') || '');
  const payload = {
    verificationStatus: formData.get('verificationStatus'),
    sourceConfidence: formData.get('sourceConfidence'),
    verifiedBy: formData.get('verifiedBy'),
    archivedUrl: formData.get('archivedUrl'),
    retrievalNotes: formData.get('retrievalNotes'),
  };

  const response = await fetch(`${API_URL}/sources/${sourceId}/verification`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error('Failed to update source verification');
  }

  revalidatePath('/admin');
  revalidatePath('/cases');
  revalidatePath(`/cases/${caseSlug}`);
  revalidatePath('/dashboard');
  redirect(`/cases/${caseSlug}#sources`);
}

export async function getCandidates(status?: string): Promise<CaseCandidate[]> {
  const params = new URLSearchParams();
  if (status) params.append('status', status);

  const response = await fetch(`${API_URL}/candidates${params.toString() ? `?${params.toString()}` : ''}`, {
    cache: 'no-store',
  });

  if (!response.ok) {
    return [];
  }

  return response.json() as Promise<CaseCandidate[]>;
}

export async function getCaseById(id: string): Promise<CaseDetail | null> {
  const response = await fetch(`${API_URL}/cases/id/${id}`, {
    cache: 'no-store',
  });

  if (!response.ok) {
    return null;
  }

  return response.json() as Promise<CaseDetail>;
}

export async function createCandidate(formData: FormData) {
  const payload = {
    caseName: formData.get('caseName'),
    neutralCitation: formData.get('neutralCitation'),
    docketNumber: formData.get('docketNumber'),
    jurisdiction: formData.get('jurisdiction'),
    country: formData.get('country'),
    courtName: formData.get('courtName'),
    courtLevel: formData.get('courtLevel'),
    sourceTitle: formData.get('sourceTitle'),
    sourceUrl: formData.get('sourceUrl'),
    sourcePublisher: formData.get('sourcePublisher'),
    sourceType: formData.get('sourceType'),
    sourcePublishedAt: formData.get('sourcePublishedAt'),
    sourceConfidence: formData.get('sourceConfidence'),
    aiRelevanceStatus: formData.get('aiRelevanceStatus'),
    materialityLevel: formData.get('materialityLevel'),
    summaryShort: formData.get('summaryShort'),
    summaryLong: formData.get('summaryLong'),
    reviewerNotes: formData.get('reviewerNotes'),
  };

  const response = await fetch(`${API_URL}/candidates`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error('Failed to create triage candidate');
  }

  revalidatePath('/admin/triage');
  redirect('/admin/triage');
}

export async function acceptCandidate(formData: FormData) {
  const candidateId = String(formData.get('candidateId') || '');
  const reviewerNotes = formData.get('reviewerNotes');

  const response = await fetch(`${API_URL}/candidates/${candidateId}/accept`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reviewerNotes }),
  });

  if (!response.ok) {
    throw new Error('Failed to accept candidate');
  }

  const result = await response.json();
  revalidatePath('/admin/triage');
  revalidatePath('/admin');
  revalidatePath('/cases');
  revalidatePath('/dashboard');
  redirect(`/cases/${result.case.slug}`);
}

export async function rejectCandidate(formData: FormData) {
  const candidateId = String(formData.get('candidateId') || '');
  const rejectionReason = formData.get('rejectionReason');
  const reviewerNotes = formData.get('reviewerNotes');

  const response = await fetch(`${API_URL}/candidates/${candidateId}/reject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rejectionReason, reviewerNotes }),
  });

  if (!response.ok) {
    throw new Error('Failed to reject candidate');
  }

  revalidatePath('/admin/triage');
  redirect('/admin/triage');
}

export async function createBasicCase(formData: FormData) {
  const payload = {
    caseName: formData.get('caseName'),
    neutralCitation: formData.get('neutralCitation'),
    docketNumber: formData.get('docketNumber'),
    jurisdiction: formData.get('jurisdiction'),
    country: formData.get('country'),
    courtName: formData.get('courtName'),
    courtLevel: formData.get('courtLevel'),
    statusPublic: formData.get('statusPublic'),
    caseLifecycleStatus: formData.get('statusPublic'),
    materialityLevel: formData.get('materialityLevel'),
    materialityScore: formData.get('materialityLevel'),
    filingDate: formData.get('filingDate'),
    summaryShort: formData.get('summaryShort'),
    summaryLong: formData.get('summaryLong'),
    whyItMatters: formData.get('whyItMatters'),
    sourceTitle: formData.get('sourceTitle'),
    sourceUrl: formData.get('sourceUrl'),
    sourceType: formData.get('sourceType'),
    sourcePublisher: formData.get('sourcePublisher'),
    sourcePublishedAt: formData.get('sourcePublishedAt'),
    sourceConfidence: formData.get('sourceConfidence'),
  };

  const response = await fetch(`${API_URL}/cases`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (response.ok) {
    const created = await response.json();
    revalidatePath('/admin');
    revalidatePath('/cases');
    revalidatePath('/dashboard');
    redirect(`/cases/${created.slug}`);
  }
}

export async function updateCaseTracking(formData: FormData) {
  const caseId = String(formData.get('caseId') || '');
  const caseSlug = String(formData.get('caseSlug') || '');
  const payload = {
    caseLifecycleStatus: formData.get('caseLifecycleStatus'),
    filingDate: formData.get('filingDate'),
    decisionDate: formData.get('decisionDate'),
    outcome: formData.get('outcome'),
    summaryShort: formData.get('summaryShort'),
    summaryLong: formData.get('summaryLong'),
    whyItMatters: formData.get('whyItMatters'),
    aiRelevanceStatus: formData.get('aiRelevanceStatus'),
    materialityLevel: formData.get('materialityLevel'),
  };

  const response = await fetch(`${API_URL}/cases/${caseId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error('Failed to update case tracking state');
  }

  revalidatePath('/admin');
  revalidatePath(`/admin/cases/${caseId}`);
  revalidatePath('/cases');
  revalidatePath(`/cases/${caseSlug}`);
  revalidatePath('/dashboard');
  redirect(`/admin/cases/${caseId}`);
}

export async function addCaseDevelopment(formData: FormData) {
  const caseId = String(formData.get('caseId') || '');
  const caseSlug = String(formData.get('caseSlug') || '');
  const payload = {
    eventType: formData.get('eventType'),
    eventDate: formData.get('eventDate'),
    title: formData.get('title'),
    description: formData.get('description'),
    sourceUrl: formData.get('sourceUrl'),
    sourceTitle: formData.get('sourceTitle'),
    sourcePublisher: formData.get('sourcePublisher'),
    sourceType: formData.get('sourceType'),
    caseLifecycleStatus: formData.get('caseLifecycleStatus'),
    decisionDate: formData.get('decisionDate'),
    outcome: formData.get('outcome'),
    summaryShort: formData.get('summaryShort'),
    summaryLong: formData.get('summaryLong'),
    whyItMatters: formData.get('whyItMatters'),
  };

  const response = await fetch(`${API_URL}/cases/${caseId}/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error('Failed to add case development');
  }

  revalidatePath('/admin');
  revalidatePath(`/admin/cases/${caseId}`);
  revalidatePath('/cases');
  revalidatePath(`/cases/${caseSlug}`);
  revalidatePath('/dashboard');
  redirect(`/admin/cases/${caseId}`);
}
