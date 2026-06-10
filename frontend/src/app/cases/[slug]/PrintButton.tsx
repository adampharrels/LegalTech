"use client";

import { Printer } from "lucide-react";

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors ml-auto print:hidden"
    >
      <Printer className="w-4 h-4 mr-2" />
      Print Case
    </button>
  );
}
