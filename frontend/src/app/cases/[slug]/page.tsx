import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCaseBySlug } from '@/actions/cases';
import { updateSourceVerification } from '@/actions/admin';
import LifecycleStageTree from '@/components/LifecycleStageTree';
import { formatDate, summaryWithoutTitle } from '@/lib/format';

const VERIFICATION_STATUSES = ['Unverified', 'Verified', 'Needs checking', 'Broken'];
const SOURCE_CONFIDENCE_LEVELS = ['Official court source', 'Official regulator publication', 'Court-adjacent source', 'Secondary source', 'Unknown'];

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

export default async function CaseDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const caseData = await getCaseBySlug(slug);

  if (!caseData) {
    notFound();
  }

  // An LLM analysis, when there is one, replaces the scraped summary.
  const analysis = caseData.llmAnalyses[0];
  const summary = analysis?.summaryLong
    || summaryWithoutTitle(caseData.summaryLong || caseData.summaryShort, caseData.caseName)
    || 'No summary yet. Use Summarise and tag in Admin to write one.';
  const whyItMatters = analysis?.whyItMatters || caseData.whyItMatters;
  const issues = caseData.issues.map((ci) => ci.issue.name);
  const legalAreas = caseData.legalAreas.map((cla) => cla.legalArea.name);
  const related = [
    ...(caseData.relatedTo ?? []).map((link) => ({ id: link.id, type: link.relationshipType, case: link.relatedCase })),
    ...(caseData.relatedFrom ?? []).map((link) => ({ id: link.id, type: link.relationshipType, case: link.case })),
  ];

  return (
    <>
      <div className="page-head">
        <p className="label"><Link href="/cases">Cases</Link> / {caseData.courtName}</p>
        <h1 className="title">{caseData.caseName}</h1>
        <p className="muted">
          {[caseData.neutralCitation, caseData.filingDate && formatDate(caseData.filingDate)].filter(Boolean).join(' · ')}
          {(caseData.neutralCitation || caseData.filingDate) && ' · '}
          <span className="status">{caseData.caseLifecycleStatus}</span>
        </p>
      </div>

      <div className="article">
        <div>
          <h2 id="ai-summary" className="label">Summary</h2>
          <div className="prose">
            <p>{summary}</p>
          </div>
          {analysis && <p className="small muted">Summarised by {analysis.modelName}, {formatDate(analysis.createdAt)}.</p>}

          {whyItMatters && (
            <>
              <h2 className="label">Why it matters</h2>
              <div className="prose"><p>{whyItMatters}</p></div>
            </>
          )}

          {caseData.lifecycleStages.length > 0 && (
            <>
              <h2 className="label">Procedural history</h2>
              <LifecycleStageTree nodes={caseData.lifecycleStages} />
            </>
          )}

          {caseData.events.length > 0 && (
            <>
              <h2 className="label">Timeline</h2>
              <ol className="entries">
                {caseData.events.map((event) => (
                  <li key={event.id} className="entry">
                    <div className="entry-date">{formatDate(event.eventDate)}</div>
                    <div>
                      {event.title}
                      {event.description && <p className="entry-meta">{event.description}</p>}
                    </div>
                  </li>
                ))}
              </ol>
            </>
          )}

          {caseData.sources.length > 0 && (
            <>
              <h2 id="sources" className="label">Sources</h2>
              <ol className="entries">
                {caseData.sources.map((source) => (
                  <li key={source.id} className="entry">
                    <div className="entry-date">{formatDate(source.publishedAt) || 'Undated'}</div>
                    <div>
                      <a href={source.url} target="_blank" rel="noopener noreferrer" className="entry-title">{source.title}</a>
                      <p className="entry-meta">
                        {[source.publisher || source.sourceType, source.sourceConfidence].filter(Boolean).join(' · ')}
                        {' · '}<span className="status">{source.verificationStatus}</span>
                      </p>
                      {source.archivedUrl && (
                        <p className="small"><a href={source.archivedUrl} target="_blank" rel="noopener noreferrer">Archived copy</a></p>
                      )}
                      <details>
                        <summary>Verify this source</summary>
                        <form action={updateSourceVerification} className="form" style={{ marginTop: 12 }}>
                          <input type="hidden" name="sourceId" value={source.id} />
                          <input type="hidden" name="caseSlug" value={caseData.slug} />
                          <div className="form-grid">
                            <label className="field">
                              <span>Status</span>
                              <select name="verificationStatus" defaultValue={source.verificationStatus}>
                                {VERIFICATION_STATUSES.map((status) => <option key={status}>{status}</option>)}
                              </select>
                            </label>
                            <label className="field">
                              <span>Kind of source</span>
                              <select name="sourceConfidence" defaultValue={source.sourceConfidence}>
                                {SOURCE_CONFIDENCE_LEVELS.map((level) => <option key={level}>{level}</option>)}
                              </select>
                            </label>
                            <label className="field">
                              <span>Checked by</span>
                              <input name="verifiedBy" defaultValue={source.verifiedBy || ''} />
                            </label>
                            <label className="field">
                              <span>Archived URL</span>
                              <input name="archivedUrl" type="url" defaultValue={source.archivedUrl || ''} />
                            </label>
                          </div>
                          <label className="field">
                            <span>Notes</span>
                            <textarea name="retrievalNotes" rows={2} defaultValue={source.retrievalNotes || ''} />
                          </label>
                          <button type="submit" className="btn">Save</button>
                        </form>
                      </details>
                    </div>
                  </li>
                ))}
              </ol>
            </>
          )}
        </div>

        <aside>
          <dl className="facts">
            <Fact label="Court">{caseData.courtName}</Fact>
            {caseData.neutralCitation && <Fact label="Citation">{caseData.neutralCitation}</Fact>}
            {caseData.docketNumber && <Fact label="Docket">{caseData.docketNumber}</Fact>}
            <Fact label="Jurisdiction">{caseData.jurisdiction}</Fact>
            <Fact label="Issues">{issues.join(', ') || <span className="muted">Not tagged yet</span>}</Fact>
            <Fact label="Areas of law">{legalAreas.join(', ') || <span className="muted">Not tagged yet</span>}</Fact>
            <Fact label="Materiality">{caseData.materialityLevel}</Fact>
            <Fact label="Review">{caseData.reviewStatus}</Fact>
            <Fact label="Updated">{formatDate(caseData.lastUpdated)}</Fact>
          </dl>

          {related.length > 0 && (
            <>
              <h2 className="label">Related</h2>
              {related.map((link) => (
                <p key={link.id}>
                  <Link href={`/cases/${link.case.slug}`}>{link.case.caseName}</Link>
                  <br /><span className="small muted">{link.type}</span>
                </p>
              ))}
            </>
          )}
        </aside>
      </div>
    </>
  );
}
