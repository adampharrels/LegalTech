'use server'

import type { CheckOptions, CheckState } from '@/types/check';

const API_URL = process.env.API_URL || 'http://localhost:3001/api';

export async function getCheckOptions(): Promise<CheckOptions> {
  const response = await fetch(`${API_URL}/check/options`, { cache: 'no-store' });
  return response.json();
}

async function post(path: string, init: RequestInit) {
  const response = await fetch(`${API_URL}${path}`, { method: 'POST', ...init });
  const body = await response.json();
  return response.ok ? { body } : { error: String(body.error || 'Something went wrong. Try again.') };
}

export async function checkDraft(_previous: CheckState, formData: FormData): Promise<CheckState> {
  const file = formData.get('file');
  const court = String(formData.get('court') || '');
  const documentType = String(formData.get('documentType') || 'other');
  let text = String(formData.get('text') || '');
  let documentName = 'Pasted text';

  if (file instanceof File && file.size > 0) {
    const extracted = await post('/check/extract-text', { headers: { 'Content-Type': 'application/octet-stream', 'x-file-name': file.name }, body: await file.arrayBuffer() });
    if (extracted.error) return { text, court, documentType, error: extracted.error };
    text = extracted.body.text;
    documentName = file.name;
  }

  const checked = await post('/check', { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, court, documentType }) });
  if (checked.error) return { text, court, documentType, error: checked.error };

  return { text, court, documentType, report: { ...checked.body, documentName, court, documentType, checkedAt: new Date().toISOString() } };
}
