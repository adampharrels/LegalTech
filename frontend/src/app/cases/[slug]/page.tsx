import { getCaseBySlug } from '@/actions/cases';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Calendar, MapPin, Scale, BookOpen, AlertTriangle, ExternalLink, Link as LinkIcon } from 'lucide-react';
import PrintButton from './PrintButton';

export default async function CaseDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const caseData = await getCaseBySlug(slug);

  if (!caseData) {
    notFound();
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12 print:text-black">
      <div className="flex justify-between items-center print:hidden">
        <Link href="/cases" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Cases
        </Link>
        <PrintButton />
      </div>

      <div className="glass-card p-8 rounded-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/3"></div>
        
        <div className="flex flex-wrap gap-2 mb-6 relative z-10">
          <span className="px-3 py-1 bg-secondary text-secondary-foreground rounded-full text-xs font-semibold uppercase tracking-wider">
            {caseData.statusPublic}
          </span>
          {caseData.materialityScore === 'High' && (
            <span className="px-3 py-1 bg-red-500/10 border border-red-500/20 text-red-500 rounded-full text-xs font-semibold uppercase tracking-wider flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              High Materiality
            </span>
          )}
        </div>

        <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-4 relative z-10">
          {caseData.caseName}
        </h1>

        <div className="flex flex-wrap items-center gap-6 text-muted-foreground relative z-10">
          <div className="flex items-center gap-2">
            <Scale className="w-5 h-5 opacity-70" />
            <span>{caseData.courtName}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 opacity-70" />
            <span>{caseData.jurisdiction}</span>
          </div>
          {caseData.filingDate && (
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 opacity-70" />
              <span>Filed: {new Date(caseData.filingDate).toLocaleDateString()}</span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Why it Matters */}
          {caseData.whyItMatters && (
            <section className="glass-card p-6 border-l-4 border-l-primary rounded-xl">
              <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-primary" />
                Why it Matters
              </h2>
              <p className="text-foreground leading-relaxed">{caseData.whyItMatters}</p>
            </section>
          )}

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">Summary</h2>
            <div className="glass-card p-6 rounded-xl text-muted-foreground leading-relaxed">
              <p>{caseData.summaryLong || caseData.summaryShort}</p>
            </div>
          </section>
          
          {/* Extensibility for Events / Timeline */}
          {caseData.events.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">Timeline</h2>
              <div className="glass-card p-6 rounded-xl">
                <div className="space-y-6">
                  {caseData.events.map(event => (
                    <div key={event.id} className="flex gap-4 relative">
                      <div className="w-3 h-3 rounded-full bg-primary mt-1.5 shrink-0"></div>
                      <div>
                        <div className="text-sm text-primary font-medium">{new Date(event.eventDate).toLocaleDateString()}</div>
                        <div className="font-semibold">{event.title}</div>
                        {event.description && <div className="text-muted-foreground text-sm mt-1">{event.description}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}
        </div>

        <div className="space-y-6">
          <section className="glass-card p-6 rounded-xl space-y-4">
            <h3 className="font-semibold text-lg flex items-center gap-2 border-b border-border pb-2">
              <BookOpen className="w-4 h-4" />
              Classifications
            </h3>
            
            <div>
              <h4 className="text-sm text-muted-foreground mb-2">Legal Issues</h4>
              <div className="flex flex-wrap gap-2">
                {caseData.issues.map(ci => (
                  <span key={ci.issueId} className="px-2 py-1 bg-secondary text-secondary-foreground rounded text-xs">
                    {ci.issue.name}
                  </span>
                ))}
              </div>
            </div>

            <div className="pt-2">
              <h4 className="text-sm text-muted-foreground mb-2">Legal Areas</h4>
              <div className="flex flex-wrap gap-2">
                {caseData.legalAreas.map(cla => (
                  <span key={cla.legalAreaId} className="px-2 py-1 bg-secondary text-secondary-foreground rounded text-xs border border-border">
                    {cla.legalArea.name}
                  </span>
                ))}
              </div>
            </div>
          </section>

          <section className="glass-card p-6 rounded-xl space-y-4">
            <h3 className="font-semibold text-lg border-b border-border pb-2">Details</h3>
            <div className="space-y-3 text-sm">
              <div>
                <span className="text-muted-foreground block">Docket Number</span>
                <span className="font-medium">{caseData.docketNumber || 'N/A'}</span>
              </div>
              <div>
                <span className="text-muted-foreground block">Court Level</span>
                <span className="font-medium">{caseData.courtLevel}</span>
              </div>
              <div>
                <span className="text-muted-foreground block">Country</span>
                <span className="font-medium">{caseData.country}</span>
              </div>
            </div>
          </section>

          {caseData.sources && caseData.sources.length > 0 && (
            <section className="glass-card p-6 rounded-xl space-y-4 print:break-inside-avoid">
              <h3 className="font-semibold text-lg flex items-center gap-2 border-b border-border pb-2">
                <ExternalLink className="w-4 h-4" />
                Sources
              </h3>
              <div className="space-y-3">
                {caseData.sources.map((source: any) => (
                  <a key={source.id} href={source.url} target="_blank" rel="noopener noreferrer" className="block text-sm hover:text-primary transition-colors group">
                    <div className="font-medium group-hover:underline">{source.title}</div>
                    <div className="text-muted-foreground text-xs flex justify-between mt-1">
                      <span>{source.publisher || source.sourceType}</span>
                      {source.publishedAt && <span>{new Date(source.publishedAt).toLocaleDateString()}</span>}
                    </div>
                  </a>
                ))}
              </div>
            </section>
          )}

          {(caseData.relatedTo?.length > 0 || caseData.relatedFrom?.length > 0) && (
            <section className="glass-card p-6 rounded-xl space-y-4 print:break-inside-avoid">
              <h3 className="font-semibold text-lg flex items-center gap-2 border-b border-border pb-2">
                <LinkIcon className="w-4 h-4" />
                Related Cases
              </h3>
              <div className="space-y-3">
                {caseData.relatedTo?.map((rc: any) => (
                  <Link key={rc.id} href={`/cases/${rc.relatedCase.slug}`} className="block text-sm hover:text-primary transition-colors group">
                    <div className="font-medium group-hover:underline">{rc.relatedCase.caseName}</div>
                    <div className="text-muted-foreground text-xs">{rc.relationshipType}</div>
                  </Link>
                ))}
                {caseData.relatedFrom?.map((rc: any) => (
                  <Link key={rc.id} href={`/cases/${rc.case.slug}`} className="block text-sm hover:text-primary transition-colors group">
                    <div className="font-medium group-hover:underline">{rc.case.caseName}</div>
                    <div className="text-muted-foreground text-xs">{rc.relationshipType}</div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
