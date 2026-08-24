import { getCaseBySlug } from '@/actions/cases';
import { formatDate, formatTrackingLabel } from '@/lib/caseTracking';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, BookOpen, Calendar, ExternalLink, Link as LinkIcon, Scale } from 'lucide-react';
import PrintButton from './PrintButton';

function currentPosition(status: string, courtName: string) {
  const normalised = status.toUpperCase();

  if (['ONGOING', 'ACTIVE', 'PENDING', 'PUBLISHED'].includes(normalised)) {
    return `The proceeding remains before ${courtName}.`;
  }

  if (normalised === 'JUDGMENT_DELIVERED' || normalised === 'DISMISSED') {
    return 'A judgment has been delivered. Check the outcome and timeline for the current procedural position.';
  }

  if (normalised === 'APPEAL_PENDING') {
    return 'The matter is now in an appeal phase.';
  }

  if (normalised === 'SETTLED') {
    return 'The matter has settled.';
  }

  if (normalised === 'DISCONTINUED') {
    return 'The proceeding has been discontinued.';
  }

  if (normalised === 'FINALISED' || normalised === 'CLOSED') {
    return 'The matter appears to be finalised.';
  }

  return 'The current procedural position has not been fully classified.';
}

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

  const latestEvent = caseData.events[0];
  const timelineEvents = [...caseData.events].sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime());
  const latestAnalysis = caseData.llmAnalyses[0];
  const hasJudgment = Boolean(caseData.decisionDate || caseData.outcome || ['JUDGMENT_DELIVERED', 'FINALISED', 'APPEAL_PENDING', 'SETTLED', 'DISCONTINUED'].includes(caseData.caseLifecycleStatus));
  const issueLabels = [
    ...caseData.legalAreas.map((item) => item.legalArea.name),
    ...caseData.issues.map((item) => item.issue.name),
  ];

  return (
    <div className="flex-col gap-8 pb-12" style={{ display: 'flex' }}>
      <div className="flex justify-between items-center" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <Link href="/cases" className="hover-text-primary" style={{ display: 'inline-flex', alignItems: 'center', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)', textDecoration: 'none' }}>
          <ArrowLeft size={16} style={{ marginRight: '0.5rem' }} />
          Back to Cases
        </Link>
        <PrintButton />
      </div>

      <section className="glass-panel surface-panel" style={{ padding: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1.5rem', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 28rem' }}>
            <span style={{ display: 'inline-flex', padding: '0.25rem 0.75rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', color: 'var(--accent-primary)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '1rem' }}>
              {formatTrackingLabel(caseData.caseLifecycleStatus)}
            </span>
            <h1 style={{ fontSize: '2.35rem', fontWeight: 700, lineHeight: 1.1, marginBottom: '1rem' }}>
              {caseData.caseName}
            </h1>
            <div className="text-muted" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.925rem' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}>
                <Scale size={18} />
                {caseData.courtName}
              </span>
              {caseData.neutralCitation && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}>
                  <BookOpen size={18} />
                  {caseData.neutralCitation}
                </span>
              )}
              {caseData.docketNumber && <span>{caseData.docketNumber}</span>}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(8rem, 1fr))', gap: '1rem', flex: '0 1 22rem' }}>
            <div>
              <div className="text-muted" style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>Filed</div>
              <div style={{ fontWeight: 700 }}>{formatDate(caseData.filingDate)}</div>
            </div>
            <div>
              <div className="text-muted" style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>Decision</div>
              <div style={{ fontWeight: 700 }}>{formatDate(caseData.decisionDate)}</div>
            </div>
          </div>
        </div>
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: '2rem', alignItems: 'start' }}>
        <main className="flex-col gap-8" style={{ display: 'flex' }}>
          <section className="glass-panel" style={{ padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem' }}>Case at a Glance</h2>
            <div style={{ display: 'grid', gap: '1.25rem' }}>
              <div>
                <h3 className="text-muted" style={{ fontSize: '0.8125rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.35rem' }}>What is this case about?</h3>
                <p style={{ lineHeight: 1.7 }}>{caseData.summaryShort}</p>
              </div>

              {issueLabels.length > 0 && (
                <div>
                  <h3 className="text-muted" style={{ fontSize: '0.8125rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.5rem' }}>AI issue</h3>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {issueLabels.slice(0, 6).map((label) => (
                      <span key={label} style={{ padding: '0.25rem 0.5rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', color: 'var(--accent-primary)', fontSize: '0.75rem', fontWeight: 600 }}>
                        {label}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h3 className="text-muted" style={{ fontSize: '0.8125rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.35rem' }}>Current position</h3>
                <p style={{ lineHeight: 1.7 }}>{currentPosition(caseData.caseLifecycleStatus, caseData.courtName)}</p>
              </div>
            </div>
          </section>

          <section className="glass-panel surface-panel" style={{ padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem' }}>Latest Development</h2>
            {latestEvent ? (
              <div>
                <div className="text-muted" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', marginBottom: '0.35rem' }}>
                  <Calendar size={16} />
                  {formatDate(latestEvent.eventDate)} - {formatTrackingLabel(latestEvent.eventType)}
                </div>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 700 }}>{latestEvent.title}</h3>
                {latestEvent.description && <p className="text-muted" style={{ marginTop: '0.5rem', lineHeight: 1.7 }}>{latestEvent.description}</p>}
              </div>
            ) : (
              <p className="text-muted">No later developments have been recorded yet.</p>
            )}
          </section>

          <section className="glass-panel" style={{ padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem' }}>Case Timeline</h2>
            <div style={{ display: 'grid', gap: '1rem' }}>
              {timelineEvents.length > 0 ? timelineEvents.map((event) => (
                <div key={event.id} style={{ display: 'grid', gridTemplateColumns: '8.5rem 1fr', gap: '1rem', alignItems: 'start' }}>
                  <div className="text-muted" style={{ fontSize: '0.875rem' }}>{formatDate(event.eventDate)}</div>
                  <div style={{ borderLeft: '2px solid var(--border-color)', paddingLeft: '1rem', paddingBottom: '0.75rem' }}>
                    <div style={{ fontWeight: 700 }}>{event.title}</div>
                    <div className="text-muted" style={{ fontSize: '0.8125rem', marginTop: '0.2rem' }}>{formatTrackingLabel(event.eventType)}</div>
                    {event.description && <p className="text-muted" style={{ marginTop: '0.35rem', lineHeight: 1.6 }}>{event.description}</p>}
                  </div>
                </div>
              )) : (
                <div style={{ display: 'grid', gridTemplateColumns: '8.5rem 1fr', gap: '1rem' }}>
                  <div className="text-muted" style={{ fontSize: '0.875rem' }}>{formatDate(caseData.filingDate)}</div>
                  <div style={{ borderLeft: '2px solid var(--border-color)', paddingLeft: '1rem' }}>
                    <div style={{ fontWeight: 700 }}>Proceedings recorded</div>
                    <div className="text-muted" style={{ fontSize: '0.8125rem', marginTop: '0.2rem' }}>No detailed timeline events added yet.</div>
                  </div>
                </div>
              )}
            </div>
          </section>

          <section className="glass-panel" style={{ padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem' }}>Judgment</h2>
            {hasJudgment ? (
              <div style={{ display: 'grid', gap: '1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem' }}>
                  <div>
                    <div className="text-muted" style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>Delivered</div>
                    <div style={{ fontWeight: 700 }}>{formatDate(caseData.decisionDate)}</div>
                  </div>
                  <div>
                    <div className="text-muted" style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>Outcome</div>
                    <div style={{ fontWeight: 700 }}>{caseData.outcome || 'Outcome not yet summarised'}</div>
                  </div>
                </div>
                {caseData.summaryLong && (
                  <div>
                    <h3 className="text-muted" style={{ fontSize: '0.8125rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.35rem' }}>What the court decided</h3>
                    <p style={{ lineHeight: 1.7 }}>{caseData.summaryLong}</p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-muted">No final judgment has been recorded.</p>
            )}
          </section>

          {caseData.whyItMatters && (
            <section className="glass-panel" style={{ padding: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem' }}>Why It Matters</h2>
              <p style={{ lineHeight: 1.7 }}>{caseData.whyItMatters}</p>
            </section>
          )}
        </main>

        <aside className="flex-col gap-6" style={{ display: 'flex' }}>
          {caseData.sources.length > 0 && (
            <section id="sources" className="glass-panel" style={{ padding: '1.5rem', scrollMarginTop: '2rem' }}>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ExternalLink size={16} />
                Official Sources
              </h2>
              <div style={{ display: 'grid', gap: '0.85rem' }}>
                {caseData.sources.map((source) => (
                  <a key={source.id} href={source.url} target="_blank" rel="noopener noreferrer" className="hover-text-accent" style={{ display: 'block', paddingBottom: '0.85rem', borderBottom: '1px solid rgba(255, 255, 255, 0.06)', textDecoration: 'none' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>{source.title}</div>
                    <div className="text-muted" style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>
                      {source.publisher || source.sourceType}
                    </div>
                  </a>
                ))}
              </div>
            </section>
          )}

          <section className="glass-panel" style={{ padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1rem' }}>Case Details</h2>
            <div style={{ display: 'grid', gap: '0.8rem', fontSize: '0.875rem' }}>
              <div>
                <span className="text-muted" style={{ display: 'block' }}>Jurisdiction</span>
                <span style={{ fontWeight: 600 }}>{caseData.jurisdiction}</span>
              </div>
              <div>
                <span className="text-muted" style={{ display: 'block' }}>Country</span>
                <span style={{ fontWeight: 600 }}>{caseData.country}</span>
              </div>
              <div>
                <span className="text-muted" style={{ display: 'block' }}>Court level</span>
                <span style={{ fontWeight: 600 }}>{caseData.courtLevel}</span>
              </div>
              <div>
                <span className="text-muted" style={{ display: 'block' }}>Last updated</span>
                <span style={{ fontWeight: 600 }}>{formatDate(caseData.lastUpdated)}</span>
              </div>
            </div>
          </section>

          {(caseData.relatedTo?.length > 0 || caseData.relatedFrom?.length > 0) && (
            <section className="glass-panel" style={{ padding: '1.5rem' }}>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <LinkIcon size={16} />
                Related Cases
              </h2>
              <div style={{ display: 'grid', gap: '0.75rem' }}>
                {caseData.relatedTo?.map((rc) => (
                  <Link key={rc.id} href={`/cases/${rc.relatedCase.slug}`} className="hover-text-accent" style={{ display: 'block', fontSize: '0.875rem', textDecoration: 'none', color: 'inherit' }}>
                    <div style={{ fontWeight: 600 }}>{rc.relatedCase.caseName}</div>
                    <div className="text-muted" style={{ fontSize: '0.75rem' }}>{rc.relationshipType}</div>
                  </Link>
                ))}
                {caseData.relatedFrom?.map((rc) => (
                  <Link key={rc.id} href={`/cases/${rc.case.slug}`} className="hover-text-accent" style={{ display: 'block', fontSize: '0.875rem', textDecoration: 'none', color: 'inherit' }}>
                    <div style={{ fontWeight: 600 }}>{rc.case.caseName}</div>
                    <div className="text-muted" style={{ fontSize: '0.75rem' }}>{rc.relationshipType}</div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {latestAnalysis && (
            <section id="ai-summary" className="glass-panel" style={{ padding: '1.5rem', scrollMarginTop: '2rem' }}>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1rem' }}>Analysis Audit</h2>
              <div className="text-muted" style={{ display: 'grid', gap: '0.4rem', fontSize: '0.8125rem' }}>
                <span>Model: {latestAnalysis.modelName}</span>
                <span>Prompt: {latestAnalysis.promptVersion}</span>
                <span>Reviewed: {latestAnalysis.humanDecision || latestAnalysis.status}</span>
              </div>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
