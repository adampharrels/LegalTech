'use client';

import type { CaseSummary } from '@/types/cases';

function csvCell(value: string | number | null | undefined) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

export default function ExportButton({ cases }: { cases: CaseSummary[] }) {
  const handleExport = () => {
    if (cases.length === 0) return;

    const headers = ['Case name', 'Jurisdiction', 'Court', 'Status', 'Review', 'AI relevance', 'Materiality', 'Filing date', 'Summary'];
    const rows = cases.map((c) => [
      c.caseName,
      c.jurisdiction,
      c.courtName,
      c.caseLifecycleStatus,
      c.reviewStatus,
      c.aiRelevanceStatus,
      c.materialityLevel,
      c.filingDate ? c.filingDate.slice(0, 10) : '',
      c.summaryShort,
    ].map(csvCell).join(','));

    const blob = new Blob([[headers.join(','), ...rows].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `ai_cases_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <button type="button" className="link" onClick={handleExport}>
      Export CSV
    </button>
  );
}
