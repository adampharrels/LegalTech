import { addCaseDevelopment, getCaseById, updateCaseTracking } from '@/actions/admin';
import { dateInputValue, eventTypes, formatDate, formatTrackingLabel, lifecycleStatuses } from '@/lib/caseTracking';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ExternalLink } from 'lucide-react';

export default async function AdminCasePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const caseData = await getCaseById(id);

  if (!caseData) {
    notFound();
  }

  const inputStyle = {
    width: '100%',
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-sm)',
    padding: '0.5rem 0.75rem',
    fontSize: '0.875rem',
    color: 'var(--text-primary)',
    outline: 'none',
  };

  const labelStyle = {
    display: 'block',
    fontSize: '0.8125rem',
    fontWeight: 600,
    marginBottom: '0.35rem',
    color: 'var(--text-secondary)',
  };

  const fieldGroupStyle = {
    display: 'grid',
    gap: '1rem',
  };

  return (
    <div className="flex-col gap-8" style={{ display: 'flex' }}>
      <div className="flex justify-between items-center" style={{ gap: '1rem', flexWrap: 'wrap' }}>
        <Link href="/admin" className="hover-text-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none' }}>
          <ArrowLeft size={16} />
          Back to Admin
        </Link>
        <Link href={`/cases/${caseData.slug}`} className="btn-secondary" style={{ padding: '0.5rem 0.75rem', textDecoration: 'none' }}>
          <ExternalLink size={16} />
          View Public Page
        </Link>
      </div>

      <div className="flex-col gap-2" style={{ display: 'flex' }}>
        <span style={{ color: 'var(--accent-primary)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>
          Case
        </span>
        <h1 style={{ fontSize: '2rem', fontWeight: 700 }}>{caseData.caseName}</h1>
        <p className="text-muted">
          {caseData.courtName}{caseData.docketNumber ? ` - ${caseData.docketNumber}` : ''}
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: '2rem', alignItems: 'start' }}>
        <section className="glass-panel surface-panel" style={{ padding: '1.5rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.25rem' }}>Current Case State</h2>
          <form action={updateCaseTracking} style={{ display: 'grid', gap: '1rem' }}>
            <input type="hidden" name="caseId" value={caseData.id} />
            <input type="hidden" name="caseSlug" value={caseData.slug} />

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
              <div>
                <label style={labelStyle}>Status</label>
                <select name="caseLifecycleStatus" defaultValue={caseData.caseLifecycleStatus} style={inputStyle}>
                  {lifecycleStatuses.map((status) => (
                    <option key={status} value={status} style={{ color: '#000' }}>{formatTrackingLabel(status)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Materiality</label>
                <select name="materialityLevel" defaultValue={caseData.materialityLevel} style={inputStyle}>
                  {['High', 'Medium', 'Low'].map((level) => (
                    <option key={level} value={level} style={{ color: '#000' }}>{level}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
              <div>
                <label style={labelStyle}>Filed</label>
                <input name="filingDate" type="date" defaultValue={dateInputValue(caseData.filingDate)} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Decision</label>
                <input name="decisionDate" type="date" defaultValue={dateInputValue(caseData.decisionDate)} style={inputStyle} />
              </div>
            </div>

            <div>
              <label style={labelStyle}>Outcome</label>
              <input name="outcome" defaultValue={caseData.outcome || ''} style={inputStyle} placeholder="Applicant succeeded, application dismissed, settled..." />
            </div>

            <div>
              <label style={labelStyle}>What is this case about?</label>
              <textarea name="summaryShort" required rows={3} defaultValue={caseData.summaryShort} style={{ ...inputStyle, resize: 'vertical' }} />
            </div>

            <div>
              <label style={labelStyle}>Detailed summary</label>
              <textarea name="summaryLong" rows={6} defaultValue={caseData.summaryLong || ''} style={{ ...inputStyle, resize: 'vertical' }} />
            </div>

            <div>
              <label style={labelStyle}>Why does it matter for AI?</label>
              <textarea name="whyItMatters" rows={4} defaultValue={caseData.whyItMatters || ''} style={{ ...inputStyle, resize: 'vertical' }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
              <div>
                <label style={labelStyle}>AI relevance</label>
                <select name="aiRelevanceStatus" defaultValue={caseData.aiRelevanceStatus} style={inputStyle}>
                  {['Relevant', 'Not relevant', 'Unknown'].map((status) => (
                    <option key={status} value={status} style={{ color: '#000' }}>{status}</option>
                  ))}
                </select>
              </div>
            </div>

            <button type="submit" className="btn-primary" style={{ justifySelf: 'end' }}>
              Save Case
            </button>
          </form>
        </section>

        <section className="glass-panel surface-panel" style={{ padding: '1.5rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.25rem' }}>Add Case Development</h2>
          <form action={addCaseDevelopment} style={{ display: 'grid', gap: '1rem' }}>
            <input type="hidden" name="caseId" value={caseData.id} />
            <input type="hidden" name="caseSlug" value={caseData.slug} />

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem' }}>
              <div>
                <label style={labelStyle}>Type</label>
                <select name="eventType" defaultValue="JUDGMENT" style={inputStyle}>
                  {eventTypes.map((eventType) => (
                    <option key={eventType} value={eventType} style={{ color: '#000' }}>{formatTrackingLabel(eventType)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Date</label>
                <input name="eventDate" type="date" required style={inputStyle} />
              </div>
            </div>

            <div>
              <label style={labelStyle}>Title</label>
              <input name="title" required defaultValue="Judgment delivered" style={inputStyle} />
            </div>

            <div>
              <label style={labelStyle}>What happened?</label>
              <textarea name="description" rows={4} style={{ ...inputStyle, resize: 'vertical' }} />
            </div>

            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem', display: 'grid', gap: '1rem' }}>
              <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Update case status</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem' }}>
                <div>
                  <label style={labelStyle}>Status</label>
                  <select name="caseLifecycleStatus" defaultValue="JUDGMENT_DELIVERED" style={inputStyle}>
                    <option value="" style={{ color: '#000' }}>Leave unchanged</option>
                    {lifecycleStatuses.map((status) => (
                      <option key={status} value={status} style={{ color: '#000' }}>{formatTrackingLabel(status)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Decision date</label>
                  <input name="decisionDate" type="date" style={inputStyle} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Outcome</label>
                <input name="outcome" style={inputStyle} placeholder="Application dismissed, appeal allowed..." />
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem', display: 'grid', gap: '1rem' }}>
              <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Source</h3>
              <input name="sourceUrl" type="url" style={inputStyle} placeholder="https://..." />
              <input name="sourceTitle" style={inputStyle} placeholder="Judgment, order, docket entry..." />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem' }}>
                <input name="sourcePublisher" style={inputStyle} placeholder="Court or publisher" />
                <input name="sourceType" style={inputStyle} placeholder="Court record" />
              </div>
            </div>

            <button type="submit" className="btn-primary" style={{ justifySelf: 'end' }}>
              Add Event
            </button>
          </form>
        </section>
      </div>

      <section className="glass-panel" style={{ padding: '1.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem' }}>Case Timeline</h2>
        {caseData.events.length > 0 ? (
          <div style={fieldGroupStyle}>
            {caseData.events.map((event) => (
              <div key={event.id} style={{ display: 'grid', gridTemplateColumns: '9rem 1fr', gap: '1rem', paddingBottom: '1rem', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                <div className="text-muted" style={{ fontSize: '0.875rem' }}>{formatDate(event.eventDate)}</div>
                <div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <strong>{event.title}</strong>
                    <span style={{ padding: '0.125rem 0.5rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                      {formatTrackingLabel(event.eventType)}
                    </span>
                  </div>
                  {event.description && <p className="text-muted" style={{ marginTop: '0.35rem' }}>{event.description}</p>}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted">No developments have been added yet.</p>
        )}
      </section>
    </div>
  );
}
