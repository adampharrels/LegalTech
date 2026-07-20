import Link from 'next/link';
import { acceptCandidate, createCandidate, getCandidates, rejectCandidate } from '@/actions/admin';

const inputStyle = {
  width: '100%',
  background: 'rgba(255, 255, 255, 0.05)',
  border: '1px solid var(--border-color)',
  borderRadius: 'var(--radius-sm)',
  padding: '0.5rem 0.75rem',
  fontSize: '0.875rem',
  color: 'var(--text-primary)',
  outline: 'none',
  marginBottom: '1rem'
};

const labelStyle = {
  display: 'block',
  fontSize: '0.875rem',
  fontWeight: 500,
  marginBottom: '0.25rem',
  color: 'var(--text-secondary)'
};

export default async function TriagePage() {
  const candidates = await getCandidates();
  const openCandidates = candidates.filter((candidate) => !['Accepted', 'Rejected'].includes(candidate.candidateStatus));
  const reviewedCandidates = candidates.filter((candidate) => ['Accepted', 'Rejected'].includes(candidate.candidateStatus));

  return (
    <div className="flex-col gap-8" style={{ display: 'flex', animation: 'fadeIn 0.5s ease-in-out' }}>
      <div className="flex justify-between items-center" style={{ gap: '1rem', flexWrap: 'wrap' }}>
        <div className="flex-col gap-2" style={{ display: 'flex' }}>
          <h1 style={{ fontSize: '2.25rem', fontWeight: 700 }}>Triage Queue</h1>
          <p className="text-muted" style={{ maxWidth: '46rem' }}>
            Review source discoveries before they become tracked AI litigation cases.
          </p>
        </div>
        <Link href="/admin" className="btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}>
          Admin
        </Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 0.8fr) minmax(320px, 1.4fr)', gap: '2rem', alignItems: 'start' }}>
        <section className="glass-panel surface-panel">
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '1.5rem' }}>Add Candidate</h2>
          <form action={createCandidate}>
            <label style={labelStyle}>Case Name</label>
            <input name="caseName" required style={inputStyle} placeholder="Potential case name" />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={labelStyle}>Neutral Citation</label>
                <input name="neutralCitation" style={inputStyle} placeholder="[2026] FCA 123" />
              </div>
              <div>
                <label style={labelStyle}>Docket Number</label>
                <input name="docketNumber" style={inputStyle} placeholder="Optional docket" />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={labelStyle}>Jurisdiction</label>
                <input name="jurisdiction" required style={inputStyle} placeholder="Australia" />
              </div>
              <div>
                <label style={labelStyle}>Country</label>
                <input name="country" required style={inputStyle} placeholder="Australia" />
              </div>
            </div>

            <label style={labelStyle}>Court Name</label>
            <input name="courtName" required style={inputStyle} placeholder="Federal Court of Australia" />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={labelStyle}>Court Level</label>
                <input name="courtLevel" style={inputStyle} placeholder="Federal" />
              </div>
              <div>
                <label style={labelStyle}>Source Date</label>
                <input name="sourcePublishedAt" type="date" style={inputStyle} />
              </div>
            </div>

            <label style={labelStyle}>Source URL</label>
            <input name="sourceUrl" type="url" style={inputStyle} placeholder="https://..." />

            <label style={labelStyle}>Source Title</label>
            <input name="sourceTitle" required style={inputStyle} placeholder="Judgment, complaint, docket entry..." />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={labelStyle}>Source Confidence</label>
                <select name="sourceConfidence" style={inputStyle}>
                  <option value="Official court source" style={{ color: '#000' }}>Official court source</option>
                  <option value="Court-adjacent source" style={{ color: '#000' }}>Court-adjacent source</option>
                  <option value="Secondary source" style={{ color: '#000' }}>Secondary source</option>
                  <option value="Unknown" style={{ color: '#000' }}>Unknown</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>AI Relevance</label>
                <select name="aiRelevanceStatus" style={inputStyle}>
                  <option value="Unknown" style={{ color: '#000' }}>Unknown</option>
                  <option value="Possibly relevant" style={{ color: '#000' }}>Possibly relevant</option>
                  <option value="Relevant" style={{ color: '#000' }}>Relevant</option>
                  <option value="Not relevant" style={{ color: '#000' }}>Not relevant</option>
                </select>
              </div>
            </div>

            <label style={labelStyle}>Materiality</label>
            <select name="materialityLevel" style={inputStyle}>
              <option value="Low" style={{ color: '#000' }}>Low</option>
              <option value="Medium" style={{ color: '#000' }}>Medium</option>
              <option value="High" style={{ color: '#000' }}>High</option>
            </select>

            <label style={labelStyle}>Short Note</label>
            <textarea name="summaryShort" rows={3} style={{ ...inputStyle, resize: 'vertical' }} placeholder="Why this source might matter..." />

            <label style={labelStyle}>Reviewer Notes</label>
            <textarea name="reviewerNotes" rows={3} style={{ ...inputStyle, resize: 'vertical' }} placeholder="Initial triage notes..." />

            <button type="submit" className="btn-primary" style={{ width: '100%' }}>
              Add Candidate
            </button>
          </form>
        </section>

        <section className="flex-col gap-4" style={{ display: 'flex' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Needs Triage ({openCandidates.length})</h2>
          {openCandidates.length === 0 ? (
            <div className="glass-panel surface-panel text-center text-muted" style={{ padding: '2rem' }}>No open candidates.</div>
          ) : openCandidates.map((candidate) => (
            <article key={candidate.id} className="glass-panel surface-panel" style={{ padding: '1.25rem' }}>
              <div className="flex justify-between" style={{ gap: '1rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <div>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 600 }}>{candidate.caseName}</h3>
                  <p className="text-muted" style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>
                    {candidate.courtName} · {candidate.jurisdiction}
                  </p>
                </div>
                <span style={{ padding: '0.25rem 0.5rem', background: 'rgba(6, 182, 212, 0.12)', color: 'var(--accent-primary)', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem' }}>
                  {candidate.candidateStatus}
                </span>
              </div>

              <div className="flex gap-2 mt-4" style={{ flexWrap: 'wrap' }}>
                <span style={{ padding: '0.25rem 0.5rem', background: 'rgba(255, 255, 255, 0.06)', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem' }}>{candidate.sourceConfidence}</span>
                <span style={{ padding: '0.25rem 0.5rem', background: 'rgba(255, 255, 255, 0.06)', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem' }}>{candidate.aiRelevanceStatus}</span>
                <span style={{ padding: '0.25rem 0.5rem', background: 'rgba(255, 255, 255, 0.06)', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem' }}>{candidate.materialityLevel}</span>
              </div>

              <p className="text-muted" style={{ fontSize: '0.875rem', marginTop: '1rem' }}>
                {candidate.summaryShort || 'No summary note provided.'}
              </p>

              {candidate.sourceUrl && (
                <a href={candidate.sourceUrl} target="_blank" rel="noopener noreferrer" className="hover-text-accent" style={{ display: 'inline-block', marginTop: '0.75rem', fontSize: '0.875rem', color: 'var(--accent-primary)' }}>
                  {candidate.sourceTitle}
                </a>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                <form action={acceptCandidate} className="flex-col gap-2" style={{ display: 'flex' }}>
                  <input type="hidden" name="candidateId" value={candidate.id} />
                  <textarea name="reviewerNotes" rows={2} style={{ ...inputStyle, resize: 'vertical', marginBottom: 0 }} placeholder="Acceptance note..." defaultValue={candidate.reviewerNotes || ''} />
                  <button type="submit" className="btn-primary" style={{ padding: '0.5rem 0.75rem', fontSize: '0.875rem' }}>
                    Accept as Case
                  </button>
                </form>

                <form action={rejectCandidate} className="flex-col gap-2" style={{ display: 'flex' }}>
                  <input type="hidden" name="candidateId" value={candidate.id} />
                  <select name="rejectionReason" style={{ ...inputStyle, marginBottom: 0 }}>
                    <option value="Not AI-related" style={{ color: '#000' }}>Not AI-related</option>
                    <option value="Duplicate" style={{ color: '#000' }}>Duplicate</option>
                    <option value="Insufficient source" style={{ color: '#000' }}>Insufficient source</option>
                    <option value="Wrong jurisdiction" style={{ color: '#000' }}>Wrong jurisdiction</option>
                    <option value="Too speculative" style={{ color: '#000' }}>Too speculative</option>
                    <option value="Other" style={{ color: '#000' }}>Other</option>
                  </select>
                  <textarea name="reviewerNotes" rows={2} style={{ ...inputStyle, resize: 'vertical', marginBottom: 0 }} placeholder="Rejection note..." />
                  <button type="submit" className="btn-secondary" style={{ padding: '0.5rem 0.75rem', fontSize: '0.875rem', color: '#ef4444' }}>
                    Reject
                  </button>
                </form>
              </div>
            </article>
          ))}

          {reviewedCandidates.length > 0 && (
            <section className="glass-panel surface-panel" style={{ marginTop: '1rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>Recent Decisions</h2>
              <div className="flex-col gap-3" style={{ display: 'flex' }}>
                {reviewedCandidates.slice(0, 8).map((candidate) => (
                  <div key={candidate.id} className="flex justify-between" style={{ gap: '1rem', alignItems: 'center', fontSize: '0.875rem' }}>
                    <span>{candidate.caseName}</span>
                    <span className="text-muted">{candidate.candidateStatus}{candidate.rejectionReason ? ` · ${candidate.rejectionReason}` : ''}</span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </section>
      </div>
    </div>
  );
}
