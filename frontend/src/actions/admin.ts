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

export async function createBasicCase(formData: FormData) {
  const payload = {
    caseName: formData.get('caseName'),
    jurisdiction: formData.get('jurisdiction'),
    country: formData.get('country'),
    courtName: formData.get('courtName'),
    statusPublic: formData.get('statusPublic'),
    materialityScore: formData.get('materialityScore'),
    summaryShort: formData.get('summaryShort'),
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
