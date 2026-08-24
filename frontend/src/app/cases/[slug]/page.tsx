import { getCaseBySlug } from '@/actions/cases';
import { updateSourceVerification } from '@/actions/admin';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Calendar, MapPin, Scale, BookOpen, AlertTriangle, ExternalLink, Link as LinkIcon, CheckCircle2 } from 'lucide-react';
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

  const latestAnalysis = caseData.llmAnalyses[0];
  const parseSlugList = (value: string | null) => {
    if (!value) return [];
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
    } catch {
      return [];
    }
  };
  const generatedIssueSlugs = parseSlugList(latestAnalysis?.issueSlugs ?? null);
  const generatedLegalAreaSlugs = parseSlugList(latestAnalysis?.legalAreaSlugs ?? null);
  const unmatchedIssueSlugs = parseSlugList(latestAnalysis?.unmatchedIssues ?? null);
  const unmatchedLegalAreaSlugs = parseSlugList(latestAnalysis?.unmatchedLegalAreas ?? null);
  const hasAiSummary = Boolean(latestAnalysis || caseData.reviewStatus === 'LLM analysed' || caseData.reviewStatus === 'Human reviewed');
  const aiSummary = latestAnalysis?.summaryShort || caseData.summaryShort;
  const aiDetailedSummary = latestAnalysis?.summaryLong || caseData.summaryLong;
  const aiImportanceNote = latestAnalysis?.whyItMatters || caseData.whyItMatters;
  const verificationBadgeStyle = (status: string) => ({
    padding: '0.125rem 0.375rem',
    borderRadius: 'var(--radius-sm)',
    background: status === 'Verified' ? 'rgba(34, 197, 94, 0.12)' : status === 'Broken' ? 'rgba(239, 68, 68, 0.12)' : status === 'Needs checking' ? 'rgba(245, 158, 11, 0.12)' : 'rgba(255, 255, 255, 0.08)',
    color: status === 'Verified' ? '#22c55e' : status === 'Broken' ? '#ef4444' : status === 'Needs checking' ? '#f59e0b' : 'var(--text-secondary)',
    border: status === 'Verified' ? '1px solid rgba(34, 197, 94, 0.2)' : status === 'Broken' ? '1px solid rgba(239, 68, 68, 0.2)' : status === 'Needs checking' ? '1px solid rgba(245, 158, 11, 0.2)' : '1px solid var(--border-color)',
    fontSize: '0.6875rem',
    textTransform: 'uppercase' as const,
  });
  const sourceInputStyle = {
    width: '100%',
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-sm)',
    padding: '0.4rem 0.5rem',
    fontSize: '0.75rem',
    color: 'var(--text-primary)',
  };
  const sourceLabelStyle = {
    display: 'block',
    color: 'var(--text-secondary)',
    fontSize: '0.6875rem',
    marginBottom: '0.25rem',
  };

  return (
    <div className="flex-col gap-8 pb-12" style={{ display: 'flex' }}>
      <div className="flex justify-between items-center" style={{ display: 'flex' }}>
        <Link href="/cases" className="hover-text-primary" style={{ display: 'inline-flex', alignItems: 'center', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)', textDecoration: 'none' }}>
          <ArrowLeft size={16} style={{ marginRight: '0.5rem' }} />
          Back to Cases
        </Link>
        <PrintButton />
      </div>

      <div className="glass-panel" style={{ position: 'relative', overflow: 'hidden', padding: '2rem', borderRadius: 'var(--radius-md)' }}>
        <div className="flex gap-2 mb-6" style={{ flexWrap: 'wrap', position: 'relative', zIndex: 10 }}>
          <span style={{ padding: '0.25rem 0.75rem', background: 'rgba(148, 163, 184, 0.1)', color: 'var(--text-primary)', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>
            {caseData.caseLifecycleStatus}
          </span>
          {caseData.materialityLevel === 'High' && (
            <span style={{ padding: '0.25rem 0.75rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <AlertTriangle size={12} />
              High Materiality
            </span>
          )}
          <span style={{ padding: '0.25rem 0.75rem', background: 'rgba(148, 163, 184, 0.1)', border: '1px solid var(--border-color)', color: 'var(--accent-primary)', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }}>
            {caseData.reviewStatus}
          </span>
        </div>

        <h1 style={{ fontSize: '2.5rem', fontWeight: 700, marginBottom: '1rem', position: 'relative', zIndex: 10, lineHeight: 1.1 }}>
          {caseData.caseName}
        </h1>

        <div className="flex gap-6 text-muted" style={{ flexWrap: 'wrap', alignItems: 'center', position: 'relative', zIndex: 10 }}>
          {caseData.neutralCitation && (
            <div className="flex items-center gap-2">
              <BookOpen size={20} style={{ opacity: 0.7 }} />
              <span>{caseData.neutralCitation}</span>
            </div>
          )}
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

          {hasAiSummary && (
            <section id="ai-summary" className="glass-panel surface-panel flex-col gap-4" style={{ display: 'flex', padding: '1.5rem', borderRadius: 'var(--radius-md)', scrollMarginTop: '2rem' }}>
              <div className="flex justify-between items-center" style={{ gap: '1rem', flexWrap: 'wrap' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>AI Summary</h2>
                <span style={{ padding: '0.25rem 0.625rem', borderRadius: 'var(--radius-sm)', background: caseData.aiRelevanceStatus === 'Not relevant' ? 'rgba(239, 68, 68, 0.12)' : 'rgba(148, 163, 184, 0.1)', color: caseData.aiRelevanceStatus === 'Not relevant' ? '#ef4444' : 'var(--accent-primary)', border: caseData.aiRelevanceStatus === 'Not relevant' ? '1px solid rgba(239, 68, 68, 0.2)' : '1px solid var(--border-color)', fontSize: '0.75rem', fontWeight: 600 }}>
                  {caseData.aiRelevanceStatus}
                </span>
              </div>

              {latestAnalysis && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', padding: '0.75rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', background: 'rgba(255, 255, 255, 0.03)' }}>
                  <div>
                    <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem' }}>Model</span>
                    <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{latestAnalysis.modelName}</span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem' }}>Prompt Version</span>
                    <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{latestAnalysis.promptVersion}</span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem' }}>Analysed At</span>
                    <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{new Date(latestAnalysis.createdAt).toLocaleString()}</span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem' }}>Application Status</span>
                    <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{latestAnalysis.status}</span>
                  </div>
                </div>
              )}

              <div>
                <h3 style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>AI Case Summary</h3>
                <p style={{ lineHeight: 1.6 }}>{aiSummary}</p>
              </div>

              {aiDetailedSummary && (
                <div>
                  <h3 style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>AI Detailed Summary</h3>
                  <p className="text-muted" style={{ lineHeight: 1.6 }}>{aiDetailedSummary}</p>
                </div>
              )}

              {aiImportanceNote && (
                <div>
                  <h3 style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Why It Matters</h3>
                  <p className="text-muted" style={{ lineHeight: 1.6 }}>{aiImportanceNote}</p>
                </div>
              )}

              {latestAnalysis && <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                <div>
                  <h3 style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Generated Issues</h3>
                  <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
                    {generatedIssueSlugs.length > 0 ? generatedIssueSlugs.map((slug) => (
                      <span key={slug} style={{ padding: '0.25rem 0.5rem', background: 'rgba(148, 163, 184, 0.1)', color: 'var(--accent-primary)', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem' }}>
                        {slug}
                      </span>
                    )) : <span className="text-muted" style={{ fontSize: '0.875rem' }}>No issue tags generated.</span>}
                  </div>
                  {unmatchedIssueSlugs.length > 0 && (
                    <p className="text-muted" style={{ marginTop: '0.5rem', fontSize: '0.75rem' }}>Unmatched: {unmatchedIssueSlugs.join(', ')}</p>
                  )}
                </div>

                <div>
                  <h3 style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Generated Legal Areas</h3>
                  <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
                    {generatedLegalAreaSlugs.length > 0 ? generatedLegalAreaSlugs.map((slug) => (
                      <span key={slug} style={{ padding: '0.25rem 0.5rem', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem' }}>
                        {slug}
                      </span>
                    )) : <span className="text-muted" style={{ fontSize: '0.875rem' }}>No legal area tags generated.</span>}
                  </div>
                  {unmatchedLegalAreaSlugs.length > 0 && (
                    <p className="text-muted" style={{ marginTop: '0.5rem', fontSize: '0.75rem' }}>Unmatched: {unmatchedLegalAreaSlugs.join(', ')}</p>
                  )}
                </div>
              </div>}
            </section>
          )}

          <section className="flex-col gap-4" style={{ display: 'flex' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Summary</h2>
            <div className="glass-panel surface-panel text-muted" style={{ padding: '1.5rem', borderRadius: 'var(--radius-md)', lineHeight: 1.6 }}>
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
                <span style={{ color: 'var(--text-secondary)', display: 'block' }}>Lifecycle Status</span>
                <span style={{ fontWeight: 500 }}>{caseData.caseLifecycleStatus}</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-secondary)', display: 'block' }}>Review Status</span>
                <span style={{ fontWeight: 500 }}>{caseData.reviewStatus}</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-secondary)', display: 'block' }}>AI Relevance</span>
                <span style={{ fontWeight: 500 }}>{caseData.aiRelevanceStatus}</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-secondary)', display: 'block' }}>Materiality</span>
                <span style={{ fontWeight: 500 }}>{caseData.materialityLevel} ({caseData.materialityScoreValue}/10)</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-secondary)', display: 'block' }}>Country</span>
                <span style={{ fontWeight: 500 }}>{caseData.country}</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-secondary)', display: 'block' }}>Last Updated</span>
                <span style={{ fontWeight: 500 }}>{new Date(caseData.lastUpdated).toLocaleDateString()}</span>
              </div>
            </div>
          </section>

          {caseData.sources && caseData.sources.length > 0 && (
            <section id="sources" className="glass-panel flex-col gap-4" style={{ display: 'flex', padding: '1.5rem', borderRadius: 'var(--radius-md)', scrollMarginTop: '2rem' }}>
              <h3 style={{ fontWeight: 600, fontSize: '1.125rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                <ExternalLink size={16} />
                Sources
              </h3>
              <div className="flex-col gap-3" style={{ display: 'flex' }}>
                {caseData.sources.map((source) => (
                  <div key={source.id} style={{ display: 'grid', gap: '0.75rem', paddingBottom: '1rem', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                    <a href={source.url} target="_blank" rel="noopener noreferrer" className="hover-text-accent" style={{ display: 'block', fontSize: '0.875rem', textDecoration: 'none', color: 'inherit' }}>
                      <div style={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span>{source.title}</span>
                        {source.isPrimary && (
                          <span style={{ padding: '0.125rem 0.375rem', borderRadius: 'var(--radius-sm)', background: 'rgba(148, 163, 184, 0.1)', color: 'var(--accent-primary)', border: '1px solid var(--border-color)', fontSize: '0.6875rem', textTransform: 'uppercase' }}>
                            Primary
                          </span>
                        )}
                        <span style={verificationBadgeStyle(source.verificationStatus)}>
                          {source.verificationStatus}
                        </span>
                      </div>
                      <div className="text-muted flex justify-between mt-1" style={{ fontSize: '0.75rem', display: 'flex', justifyContent: 'space-between', marginTop: '0.25rem', gap: '0.75rem' }}>
                        <span>{source.publisher || source.sourceType}</span>
                        {source.publishedAt && <span>{new Date(source.publishedAt).toLocaleDateString()}</span>}
                      </div>
                    </a>

                    <div className="text-muted" style={{ display: 'grid', gap: '0.35rem', fontSize: '0.75rem' }}>
                      <span>Confidence: {source.sourceConfidence}</span>
                      {source.lastCheckedAt && <span>Last checked: {new Date(source.lastCheckedAt).toLocaleString()}</span>}
                      {source.verifiedBy && <span>Verified by: {source.verifiedBy}</span>}
                      {source.archivedUrl && (
                        <a href={source.archivedUrl} target="_blank" rel="noopener noreferrer" className="hover-text-accent" style={{ color: 'var(--accent-primary)' }}>
                          Archived copy
                        </a>
                      )}
                      {source.retrievalNotes && <span>{source.retrievalNotes}</span>}
                    </div>

                    <form action={updateSourceVerification} style={{ display: 'grid', gap: '0.5rem' }}>
                      <input type="hidden" name="sourceId" value={source.id} />
                      <input type="hidden" name="caseSlug" value={caseData.slug} />

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                        <div>
                          <label style={sourceLabelStyle}>Verification</label>
                          <select name="verificationStatus" defaultValue={source.verificationStatus} style={sourceInputStyle}>
                            <option value="Unverified" style={{ color: '#000' }}>Unverified</option>
                            <option value="Verified" style={{ color: '#000' }}>Verified</option>
                            <option value="Needs checking" style={{ color: '#000' }}>Needs checking</option>
                            <option value="Broken" style={{ color: '#000' }}>Broken</option>
                          </select>
                        </div>
                        <div>
                          <label style={sourceLabelStyle}>Confidence</label>
                          <select name="sourceConfidence" defaultValue={source.sourceConfidence} style={sourceInputStyle}>
                            <option value="Official court source" style={{ color: '#000' }}>Official court source</option>
                            <option value="Official regulator publication" style={{ color: '#000' }}>Official regulator publication</option>
                            <option value="Court-adjacent source" style={{ color: '#000' }}>Court-adjacent source</option>
                            <option value="Secondary source" style={{ color: '#000' }}>Secondary source</option>
                            <option value="Unknown" style={{ color: '#000' }}>Unknown</option>
                          </select>
                        </div>
                      </div>

                      <input name="verifiedBy" defaultValue={source.verifiedBy || ''} style={sourceInputStyle} placeholder="Reviewer name" />
                      <input name="archivedUrl" type="url" defaultValue={source.archivedUrl || ''} style={sourceInputStyle} placeholder="Archived URL" />
                      <textarea name="retrievalNotes" rows={2} defaultValue={source.retrievalNotes || ''} style={{ ...sourceInputStyle, resize: 'vertical' }} placeholder="Retrieval notes" />
                      <button type="submit" className="btn-secondary" style={{ display: 'inline-flex', justifyContent: 'center', alignItems: 'center', gap: '0.35rem', padding: '0.45rem 0.65rem', fontSize: '0.75rem' }}>
                        <CheckCircle2 size={14} />
                        Save Verification
                      </button>
                    </form>
                  </div>
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
                  <Link key={rc.id} href={`/cases/${rc.relatedCase.slug}`} className="hover-text-accent" style={{ display: 'block', fontSize: '0.875rem', textDecoration: 'none', color: 'inherit' }}>
                    <div style={{ fontWeight: 500 }}>{rc.relatedCase.caseName}</div>
                    <div className="text-muted" style={{ fontSize: '0.75rem' }}>{rc.relationshipType}</div>
                  </Link>
                ))}
                {caseData.relatedFrom?.map((rc) => (
                  <Link key={rc.id} href={`/cases/${rc.case.slug}`} className="hover-text-accent" style={{ display: 'block', fontSize: '0.875rem', textDecoration: 'none', color: 'inherit' }}>
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
