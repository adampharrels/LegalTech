import { acceptCandidate, createCandidate, getCandidates, rejectCandidate } from '@/actions/admin';
import EntryDate from '@/components/EntryDate';
import { summaryWithoutTitle } from '@/lib/format';

const REJECTION_REASONS = ['Not AI-related', 'Duplicate', 'Insufficient source', 'Wrong jurisdiction', 'Too speculative', 'Other'];
const SOURCE_CONFIDENCE_LEVELS = ['Official court source', 'Official regulator publication', 'Court-adjacent source', 'Secondary source', 'Unknown'];
const REVIEWED = ['Accepted', 'Rejected', 'Archived'];

function parseMatchedKeywords(value: string | null) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

export default async function TriagePage() {
  const candidates = await getCandidates();
  const open = candidates.filter((candidate) => !REVIEWED.includes(candidate.candidateStatus));
  const reviewed = candidates.filter((candidate) => REVIEWED.includes(candidate.candidateStatus));

  return (
    <>
      <div className="page-head">
        <h1>Triage</h1>
        <p className="lede">{open.length === 0 ? 'Nothing waiting for review.' : `${open.length} found by the pipeline, waiting for review.`}</p>
      </div>

      <div className="article">
        <section>
          {open.length > 0 && (
            <ol className="entries">
              {open.map((candidate) => {
                const keywords = parseMatchedKeywords(candidate.matchedKeywords);
                const summary = summaryWithoutTitle(candidate.summaryShort, candidate.caseName);

                return (
                  <li key={candidate.id} className="entry">
                    <EntryDate value={candidate.sourcePublishedAt} />
                    <div>
                      <span className="entry-title">{candidate.caseName}</span>
                      <p className="entry-meta">
                        {[candidate.courtName, candidate.sourcePublisher].filter(Boolean).join(' · ')}
                      </p>
                      {summary && <p className="entry-summary">{summary}</p>}
                      <details>
                        <summary>Why it was flagged</summary>
                        <dl className="facts" style={{ marginTop: 8 }}>
                          <div><dt>Screening</dt><dd>{candidate.llmScreeningStatus}{candidate.relevanceScore !== null ? ` (${Math.round(candidate.relevanceScore * 100)}%)` : ''}</dd></div>
                          {(candidate.relevanceReason || candidate.llmScreeningReason) && (
                            <div><dt>Reason</dt><dd>{candidate.relevanceReason || candidate.llmScreeningReason}</dd></div>
                          )}
                          <div><dt>Keywords</dt><dd>{keywords.join(', ') || 'None'}</dd></div>
                          <div><dt>Found by</dt><dd>{candidate.sourceAdapterName || 'Added by hand'}</dd></div>
                        </dl>
                      </details>
                      <div className="actions">
                        <form action={acceptCandidate}>
                          <input type="hidden" name="candidateId" value={candidate.id} />
                          <button type="submit" className="btn">Accept</button>
                        </form>
                        <form action={rejectCandidate} className="actions" style={{ marginTop: 0 }}>
                          <input type="hidden" name="candidateId" value={candidate.id} />
                          <select name="rejectionReason" aria-label="Reason" defaultValue="Not AI-related">
                            {REJECTION_REASONS.map((reason) => <option key={reason}>{reason}</option>)}
                          </select>
                          <button type="submit" className="btn-quiet">Reject</button>
                        </form>
                        {candidate.sourceUrl && (
                          <a href={candidate.sourceUrl} target="_blank" rel="noopener noreferrer" className="small">Read source</a>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </section>

        <aside>
          {reviewed.length > 0 && (
            <>
              <h2 className="label" style={{ marginTop: 0 }}>Recently reviewed</h2>
              <dl className="facts">
                {reviewed.slice(0, 12).map((candidate) => (
                  <div key={candidate.id}>
                    <dt>{candidate.candidateStatus}{candidate.rejectionReason ? ` · ${candidate.rejectionReason}` : ''}</dt>
                    <dd className="small">{candidate.caseName}</dd>
                  </div>
                ))}
              </dl>
            </>
          )}

          <details style={{ marginTop: 24 }}>
            <summary>Add a candidate by hand</summary>
            <form action={createCandidate} style={{ marginTop: 12 }}>
              <label className="field"><span>Name</span><input name="caseName" required /></label>
              <label className="field"><span>Court</span><input name="courtName" required /></label>
              <label className="field"><span>Source URL</span><input name="sourceUrl" type="url" /></label>
              <label className="field"><span>Source title</span><input name="sourceTitle" required /></label>
              <label className="field"><span>Note</span><textarea name="summaryShort" rows={2} /></label>
              <input type="hidden" name="jurisdiction" value="Australia" />
              <input type="hidden" name="country" value="Australia" />
              <label className="field">
                <span>Kind of source</span>
                <select name="sourceConfidence" defaultValue="Official court source">
                  {SOURCE_CONFIDENCE_LEVELS.map((level) => <option key={level}>{level}</option>)}
                </select>
              </label>
              <button type="submit" className="btn">Add</button>
            </form>
          </details>
        </aside>
      </div>
    </>
  );
}
