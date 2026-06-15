"use client";

import { Download } from "lucide-react";

export default function ExportButton({ cases }: { cases: any[] }) {
  const handleExport = () => {
    if (!cases || cases.length === 0) return;

    const headers = [
      "Case Name",
      "Jurisdiction",
      "Court",
      "Status",
      "Materiality Score",
      "Filing Date",
      "Short Summary"
    ];

    const rows = cases.map(c => [
      `"${(c.caseName || '').replace(/"/g, '""')}"`,
      `"${c.jurisdiction || ''}"`,
      `"${c.courtName || ''}"`,
      `"${c.statusPublic || ''}"`,
      `"${c.materialityScore || ''}"`,
      c.filingDate ? `"${new Date(c.filingDate).toLocaleDateString()}"` : '""',
      `"${(c.summaryShort || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `ai_cases_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <button 
      onClick={handleExport}
      className="btn-secondary"
      style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
    >
      <Download size={16} />
      Export CSV
    </button>
  );
}
