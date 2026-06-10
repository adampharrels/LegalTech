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
    statusPublic?: string | string[];
    dateFrom?: string;
    dateTo?: string;
  }>;
}) {
  const params = await searchParams;
  const cases = await getCases(params);
  const issues = await getIssues() as any[];
  const legalAreas = await getLegalAreas() as any[];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-4xl font-bold">Case Explorer</h1>
          <p className="text-muted-foreground w-full max-w-2xl">
            Browse and filter through our curated database of AI-related litigation and tribunal decisions.
          </p>
        </div>
        <ExportButton cases={cases} />
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        
        {/* Sidebar with Filters */}
        <aside className="w-full lg:w-64 shrink-0">
          <FilterSidebar issues={issues} legalAreas={legalAreas} />
        </aside>

        {/* Main Content */}
        <div className="flex-1 space-y-4">
          {cases.length === 0 ? (
            <div className="glass-card p-12 rounded-xl text-center flex flex-col items-center">
              <Scale className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
              <h3 className="text-lg font-medium">No cases found</h3>
              <p className="text-muted-foreground">Try adjusting your filters or check back later.</p>
            </div>
          ) : (
            (cases as any[]).map((c: any) => (
              <Link href={`/cases/${c.slug}`} key={c.id}>
                <div className="glass-card p-6 rounded-xl transition-all hover:scale-[1.01] hover:border-primary/30 group mb-4">
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <h2 className="text-xl font-semibold group-hover:text-primary transition-colors">
                        {c.caseName}
                      </h2>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
                        {c.filingDate && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {new Date(c.filingDate).toLocaleDateString()}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {c.jurisdiction}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-secondary text-xs">
                          {c.statusPublic}
                        </span>
                      </div>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                      <ArrowRight className="w-5 h-5 text-primary group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                  <p className="text-muted-foreground mt-4 line-clamp-2">
                    {c.summaryShort}
                  </p>
                  
                  {c.issues.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-4">
                      {c.issues.map((ci: any) => (
                        <span key={ci.issueId} className="px-2 py-1 rounded-md bg-primary/10 text-primary text-xs font-medium border border-primary/20">
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
