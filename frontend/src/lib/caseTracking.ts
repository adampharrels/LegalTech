export const lifecycleStatuses = [
  'ONGOING',
  'JUDGMENT_DELIVERED',
  'APPEAL_PENDING',
  'FINALISED',
  'SETTLED',
  'DISCONTINUED',
] as const;

export const eventTypes = [
  'PROCEEDINGS_FILED',
  'HEARING',
  'ORDER',
  'INTERLOCUTORY_JUDGMENT',
  'JUDGMENT',
  'APPEAL_FILED',
  'APPEAL_JUDGMENT',
  'SETTLEMENT',
  'DISCONTINUED',
  'OTHER',
] as const;

export function formatTrackingLabel(value: string | null | undefined) {
  if (!value) {
    return 'Unknown';
  }

  const legacyLabels: Record<string, string> = {
    Active: 'Ongoing',
    Pending: 'Ongoing',
    Published: 'Ongoing',
    Closed: 'Finalised',
    Dismissed: 'Judgment delivered',
    Settled: 'Settled',
  };

  if (legacyLabels[value]) {
    return legacyLabels[value];
  }

  return value
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function formatDate(value: string | null | undefined) {
  if (!value) {
    return 'Not yet';
  }

  return new Date(value).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function dateInputValue(value: string | null | undefined) {
  if (!value) {
    return '';
  }

  return new Date(value).toISOString().slice(0, 10);
}
