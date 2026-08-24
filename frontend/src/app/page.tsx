import Link from 'next/link';
import { ArrowRight, Database, FileSearch, ListChecks } from 'lucide-react';

export default function Home() {
  return (
    <div className="flex flex-col gap-8" style={{ minHeight: 'calc(100vh - 8rem)' }}>
      <section className="py-20">
        <div className="max-w-4xl">
          <div className="badge mb-8">
            <span className="badge-dot"></span>
            <span>LEGAL INTELLIGENCE WORKFLOW</span>
          </div>

          <h1 className="hero-title">AI Litigation Navigator</h1>
          <p className="hero-subtitle" style={{ margin: 0 }}>
            A curated tracker for AI-related court cases, regulator actions, and source-verified legal signals.
          </p>

          <div className="flex gap-4 mt-8" style={{ flexWrap: 'wrap' }}>
            <Link href="/cases" className="btn-primary">
              <span>Explore Cases</span>
              <ArrowRight size={18} />
            </Link>
            <Link href="/admin/triage" className="btn-secondary">
              <span>Review Triage Queue</span>
            </Link>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-3 gap-6">
        <div className="glass-panel surface-panel">
          <FileSearch size={20} color="var(--accent-primary)" />
          <h2 style={{ fontSize: '1rem', marginTop: '1rem', marginBottom: '0.5rem' }}>Source Discovery</h2>
          <p className="text-muted" style={{ fontSize: '0.875rem' }}>
            Court, regulator, and guidance sources are ingested as reviewable legal signals.
          </p>
        </div>
        <div className="glass-panel surface-panel">
          <ListChecks size={20} color="var(--accent-primary)" />
          <h2 style={{ fontSize: '1rem', marginTop: '1rem', marginBottom: '0.5rem' }}>Human Triage</h2>
          <p className="text-muted" style={{ fontSize: '0.875rem' }}>
            Candidates show matched keywords, extraction method, LLM screening, and duplicate evidence.
          </p>
        </div>
        <div className="glass-panel surface-panel">
          <Database size={20} color="var(--accent-primary)" />
          <h2 style={{ fontSize: '1rem', marginTop: '1rem', marginBottom: '0.5rem' }}>Curated Database</h2>
          <p className="text-muted" style={{ fontSize: '0.875rem' }}>
            Accepted records retain source verification, review status, and structured legal taxonomy.
          </p>
        </div>
      </section>

      <section className="glass-panel surface-panel" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
        <div>
          <div className="card-label">Coverage</div>
          <div className="card-value">Court + Regulator</div>
        </div>
        <div>
          <div className="card-label">Workflow</div>
          <div className="card-value">Triage First</div>
        </div>
        <div>
          <div className="card-label">Evidence</div>
          <div className="card-value">Auditable</div>
        </div>
      </section>
    </div>
  );
}
