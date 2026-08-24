import Link from 'next/link';
import { getCases, getIssues, getLegalAreas } from '@/actions/cases';
import FilterSidebar from '@/components/FilterSidebar';
import ExportButton from './ExportButton';
import { ArrowRight, Calendar, MapPin, Scale } from 'lucide-react';

export default async function CasesPage({
  searchParams,
}: {
  searchParams: Promise<{
    query?: string;
    issueSlug?: string | string[];
    legalAreaSlug?: string | string[];
    jurisdiction?: string | string[];
    materialityScore?: string | string[];
    materialityLevel?: string | string[];
    statusPublic?: string | string[];
    caseLifecycleStatus?: string | string[];
    reviewStatus?: string | string[];
    aiRelevanceStatus?: string | string[];
    dateFrom?: string;
    dateTo?: string;
    sort?: string;
  }>;
}) {
  const params = await searchParams;
  const cases = await getCases(params);
  const issues = await getIssues();
  const legalAreas = await getLegalAreas();

  return (
    <div className="flex-col gap-8" style={{ display: 'flex' }}>
      <div className="flex justify-between items-center" style={{ flexWrap: 'wrap', gap: '1rem' }}>
        <div className="flex-col gap-2" style={{ display: 'flex' }}>
          <h1 style={{ fontSize: '2.25rem', fontWeight: 700 }}>Case Explorer</h1>
          <p className="text-muted" style={{ maxWidth: '42rem' }}>
            Browse and filter through our curated database of AI-related litigation and tribunal decisions.
          </p>
        </div>
        <ExportButton cases={cases} />
      </div>

      <div className="flex gap-8" style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        
        {/* Sidebar with Filters */}
        <aside style={{ width: '100%', maxWidth: '16rem', flexShrink: 0 }}>
          <FilterSidebar issues={issues} legalAreas={legalAreas} />
        </aside>

        {/* Main Content */}
        <div className="flex-col gap-4" style={{ display: 'flex', flex: 1, minWidth: '300px' }}>
          {cases.length === 0 ? (
            <div className="glass-panel flex-col items-center justify-center text-center gap-4" style={{ display: 'flex', padding: '3rem' }}>
              <Scale size={48} className="text-muted" style={{ opacity: 0.5 }} />
              <h3 style={{ fontSize: '1.125rem', fontWeight: 500 }}>No cases found</h3>
              <p className="text-muted">Try adjusting your filters or check back later.</p>
            </div>
          ) : (
            cases.map((c) => (
              <Link href={`/cases/${c.slug}`} key={c.id} style={{ display: 'block' }}>
                <div className="glass-panel surface-panel" style={{ marginBottom: '1rem', padding: '1.5rem', cursor: 'pointer' }}>
                  <div className="flex justify-between" style={{ alignItems: 'flex-start', gap: '1rem' }}>
                    <div>
                      <h2 className="hover-text-accent" style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {c.caseName}
                      </h2>
                      <div className="flex items-center gap-4 text-muted mt-4" style={{ fontSize: '0.875rem' }}>
                        {c.filingDate && (
                          <span className="flex items-center gap-2">
                            <Calendar size={16} />
                            {new Date(c.filingDate).toLocaleDateString()}
                          </span>
                        )}
                        <span className="flex items-center gap-2">
                          <MapPin size={16} />
                          {c.jurisdiction}
                        </span>
                        <span style={{ padding: '0.125rem 0.5rem', borderRadius: 'var(--radius-full)', background: 'rgba(255, 255, 255, 0.1)', fontSize: '0.75rem' }}>
                          {c.caseLifecycleStatus}
                        </span>
                        <span style={{ padding: '0.125rem 0.5rem', borderRadius: 'var(--radius-sm)', background: 'rgba(148, 163, 184, 0.1)', color: 'var(--accent-primary)', fontSize: '0.75rem' }}>
                          {c.reviewStatus}
                        </span>
                      </div>
                    </div>
                    <div style={{ width: '2.5rem', height: '2.5rem', borderRadius: 'var(--radius-sm)', background: 'rgba(148, 163, 184, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <ArrowRight size={20} color="var(--accent-primary)" />
                    </div>
                  </div>
                  <p className="text-muted mt-4" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {c.summaryShort}
                  </p>
                  
                  {c.issues.length > 0 && (
                    <div className="flex gap-2 mt-4" style={{ flexWrap: 'wrap' }}>
                      {c.issues.map((ci) => (
                        <span key={ci.issueId} style={{ padding: '0.25rem 0.5rem', borderRadius: 'var(--radius-sm)', background: 'rgba(148, 163, 184, 0.1)', color: 'var(--accent-primary)', fontSize: '0.75rem', fontWeight: 500, border: '1px solid var(--border-color)' }}>
                          {ci.issue.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
