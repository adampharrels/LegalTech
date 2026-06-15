"use client";

import { Printer } from "lucide-react";

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        fontSize: '0.875rem',
        fontWeight: 500,
        color: 'var(--text-secondary)',
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        marginLeft: 'auto'
      }}
      onMouseOver={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
      onMouseOut={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
      className="print-hidden"
    >
      <Printer size={16} style={{ marginRight: '0.5rem' }} />
      Print Case
    </button>
  );
}
