'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

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
  redirect(`/cases/${result.case.slug}#llm-analysis`);
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
    materialityScore: formData.get('materialityScore'),
    filingDate: formData.get('filingDate'),
    summaryShort: formData.get('summaryShort'),
    summaryLong: formData.get('summaryLong'),
    whyItMatters: formData.get('whyItMatters'),
    sourceTitle: formData.get('sourceTitle'),
    sourceUrl: formData.get('sourceUrl'),
    sourceType: formData.get('sourceType'),
    sourcePublisher: formData.get('sourcePublisher'),
    sourcePublishedAt: formData.get('sourcePublishedAt'),
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
