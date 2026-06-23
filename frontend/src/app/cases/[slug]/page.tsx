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
    <div className="flex-col gap-8 pb-12" style={{ display: 'flex', animation: 'fadeIn 0.5s ease-in-out' }}>
      <div className="flex justify-between items-center" style={{ display: 'flex' }}>
        <Link href="/cases" style={{ display: 'inline-flex', alignItems: 'center', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)', textDecoration: 'none' }} onMouseOver={(e) => e.currentTarget.style.color = 'var(--text-primary)'} onMouseOut={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}>
          <ArrowLeft size={16} style={{ marginRight: '0.5rem' }} />
          Back to Cases
        </Link>
        <PrintButton />
      </div>

      <div className="glass-panel" style={{ position: 'relative', overflow: 'hidden', padding: '2rem', borderRadius: 'var(--radius-lg)' }}>
        <div style={{ position: 'absolute', top: 0, right: 0, width: '16rem', height: '16rem', background: 'rgba(6, 182, 212, 0.1)', borderRadius: '50%', filter: 'blur(3rem)', pointerEvents: 'none', transform: 'translate(30%, -50%)' }}></div>
        
        <div className="flex gap-2 mb-6" style={{ flexWrap: 'wrap', position: 'relative', zIndex: 10 }}>
          <span style={{ padding: '0.25rem 0.75rem', background: 'rgba(255, 255, 255, 0.1)', color: 'var(--text-primary)', borderRadius: 'var(--radius-full)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {caseData.statusPublic}
          </span>
          {caseData.materialityScore === 'High' && (
            <span style={{ padding: '0.25rem 0.75rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444', borderRadius: 'var(--radius-full)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <AlertTriangle size={12} />
              High Materiality
            </span>
          )}
        </div>

        <h1 style={{ fontSize: '3rem', fontWeight: 700, letterSpacing: '-0.025em', marginBottom: '1rem', position: 'relative', zIndex: 10, lineHeight: 1.1 }}>
          {caseData.caseName}
        </h1>

        <div className="flex gap-6 text-muted" style={{ flexWrap: 'wrap', alignItems: 'center', position: 'relative', zIndex: 10 }}>
          <div className="flex items-center gap-2">
            <Scale size={20} style={{ opacity: 0.7 }} />
            <span>{caseData.courtName}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin size={20} style={{ opacity: 0.7 }} />
            <span>{caseData.jurisdiction}</span>
          </div>
          {caseData.filingDate && (
            <div className="flex items-center gap-2">
              <Calendar size={20} style={{ opacity: 0.7 }} />
              <span>Filed: {new Date(caseData.filingDate).toLocaleDateString()}</span>
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
        <div className="flex-col gap-8" style={{ display: 'flex', flex: 2 }}>
          {/* Why it Matters */}
          {caseData.whyItMatters && (
            <section className="glass-panel" style={{ padding: '1.5rem', borderLeft: '4px solid var(--accent-primary)', borderRadius: 'var(--radius-md)' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertTriangle size={20} color="var(--accent-primary)" />
                Why it Matters
              </h2>
              <p style={{ lineHeight: 1.6 }}>{caseData.whyItMatters}</p>
            </section>
          )}

          <section className="flex-col gap-4" style={{ display: 'flex' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Summary</h2>
            <div className="glass-panel text-muted" style={{ padding: '1.5rem', borderRadius: 'var(--radius-md)', lineHeight: 1.6 }}>
              <p>{caseData.summaryLong || caseData.summaryShort}</p>
            </div>
          </section>
          
          {/* Extensibility for Events / Timeline */}
          {caseData.events.length > 0 && (
            <section className="flex-col gap-4" style={{ display: 'flex' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Timeline</h2>
              <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: 'var(--radius-md)' }}>
                <div className="flex-col gap-6" style={{ display: 'flex' }}>
                  {caseData.events.map((event) => (
                    <div key={event.id} className="flex gap-4" style={{ position: 'relative' }}>
                      <div style={{ width: '0.75rem', height: '0.75rem', borderRadius: '50%', background: 'var(--accent-primary)', marginTop: '0.375rem', flexShrink: 0 }}></div>
                      <div>
                        <div style={{ fontSize: '0.875rem', color: 'var(--accent-primary)', fontWeight: 500 }}>{new Date(event.eventDate).toLocaleDateString()}</div>
                        <div style={{ fontWeight: 600 }}>{event.title}</div>
                        {event.description && <div className="text-muted" style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>{event.description}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}
        </div>

        <div className="flex-col gap-6" style={{ display: 'flex', flex: 1 }}>
          <section className="glass-panel flex-col gap-4" style={{ display: 'flex', padding: '1.5rem', borderRadius: 'var(--radius-md)' }}>
            <h3 style={{ fontWeight: 600, fontSize: '1.125rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
              <BookOpen size={16} />
              Classifications
            </h3>
            
            <div>
              <h4 style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Legal Issues</h4>
              <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
                {caseData.issues.map((ci) => (
                  <span key={ci.issueId} style={{ padding: '0.25rem 0.5rem', background: 'rgba(255, 255, 255, 0.05)', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem' }}>
                    {ci.issue.name}
                  </span>
                ))}
              </div>
            </div>

            <div style={{ paddingTop: '0.5rem' }}>
              <h4 style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Legal Areas</h4>
              <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
                {caseData.legalAreas.map((cla) => (
                  <span key={cla.legalAreaId} style={{ padding: '0.25rem 0.5rem', background: 'rgba(255, 255, 255, 0.05)', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', border: '1px solid var(--border-color)' }}>
                    {cla.legalArea.name}
                  </span>
                ))}
              </div>
            </div>
          </section>

          <section className="glass-panel flex-col gap-4" style={{ display: 'flex', padding: '1.5rem', borderRadius: 'var(--radius-md)' }}>
            <h3 style={{ fontWeight: 600, fontSize: '1.125rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Details</h3>
            <div className="flex-col gap-3" style={{ display: 'flex', fontSize: '0.875rem' }}>
              <div>
                <span style={{ color: 'var(--text-secondary)', display: 'block' }}>Docket Number</span>
                <span style={{ fontWeight: 500 }}>{caseData.docketNumber || 'N/A'}</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-secondary)', display: 'block' }}>Court Level</span>
                <span style={{ fontWeight: 500 }}>{caseData.courtLevel}</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-secondary)', display: 'block' }}>Country</span>
                <span style={{ fontWeight: 500 }}>{caseData.country}</span>
              </div>
            </div>
          </section>

          {caseData.sources && caseData.sources.length > 0 && (
            <section className="glass-panel flex-col gap-4" style={{ display: 'flex', padding: '1.5rem', borderRadius: 'var(--radius-md)' }}>
              <h3 style={{ fontWeight: 600, fontSize: '1.125rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                <ExternalLink size={16} />
                Sources
              </h3>
              <div className="flex-col gap-3" style={{ display: 'flex' }}>
                {caseData.sources.map((source) => (
                  <a key={source.id} href={source.url} target="_blank" rel="noopener noreferrer" style={{ display: 'block', fontSize: '0.875rem', textDecoration: 'none', color: 'inherit' }} onMouseOver={(e) => e.currentTarget.style.color = 'var(--accent-primary)'} onMouseOut={(e) => e.currentTarget.style.color = 'inherit'}>
                    <div style={{ fontWeight: 500 }}>{source.title}</div>
                    <div className="text-muted flex justify-between mt-1" style={{ fontSize: '0.75rem', display: 'flex', justifyContent: 'space-between', marginTop: '0.25rem' }}>
                      <span>{source.publisher || source.sourceType}</span>
                      {source.publishedAt && <span>{new Date(source.publishedAt).toLocaleDateString()}</span>}
                    </div>
                  </a>
                ))}
              </div>
            </section>
          )}

          {(caseData.relatedTo?.length > 0 || caseData.relatedFrom?.length > 0) && (
            <section className="glass-panel flex-col gap-4" style={{ display: 'flex', padding: '1.5rem', borderRadius: 'var(--radius-md)' }}>
              <h3 style={{ fontWeight: 600, fontSize: '1.125rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                <LinkIcon size={16} />
                Related Cases
              </h3>
              <div className="flex-col gap-3" style={{ display: 'flex' }}>
                {caseData.relatedTo?.map((rc) => (
                  <Link key={rc.id} href={`/cases/${rc.relatedCase.slug}`} style={{ display: 'block', fontSize: '0.875rem', textDecoration: 'none', color: 'inherit' }} onMouseOver={(e) => e.currentTarget.style.color = 'var(--accent-primary)'} onMouseOut={(e) => e.currentTarget.style.color = 'inherit'}>
                    <div style={{ fontWeight: 500 }}>{rc.relatedCase.caseName}</div>
                    <div className="text-muted" style={{ fontSize: '0.75rem' }}>{rc.relationshipType}</div>
                  </Link>
                ))}
                {caseData.relatedFrom?.map((rc) => (
                  <Link key={rc.id} href={`/cases/${rc.case.slug}`} style={{ display: 'block', fontSize: '0.875rem', textDecoration: 'none', color: 'inherit' }} onMouseOver={(e) => e.currentTarget.style.color = 'var(--accent-primary)'} onMouseOut={(e) => e.currentTarget.style.color = 'inherit'}>
                    <div style={{ fontWeight: 500 }}>{rc.case.caseName}</div>
                    <div className="text-muted" style={{ fontSize: '0.75rem' }}>{rc.relationshipType}</div>
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
