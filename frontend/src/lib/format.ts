const dateFormat = new Intl.DateTimeFormat('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });

/** "29 Jul 2026"; empty string for a missing or invalid date. */
export function formatDate(value: string | Date | null | undefined) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : dateFormat.format(date);
}

const dayMonthFormat = new Intl.DateTimeFormat('en-AU', { day: 'numeric', month: 'short' });

/** ["29 Jul", "2026"] for the date gutter beside list entries. */
export function formatDateParts(value: string | Date | null | undefined): [string, string] | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : [dayMonthFormat.format(date), String(date.getFullYear())];
}

/**
 * A summary without a copy of the title at its start (scraped and news
 * summaries often begin with, or are only, the headline). Null when nothing
 * is left.
 */
export function summaryWithoutTitle(summary: string | null | undefined, title: string) {
  if (!summary) return null;
  const trimmed = summary.trim();
  const rest = trimmed.startsWith(title) ? trimmed.slice(title.length).trim() : trimmed;
  return rest || null;
}
