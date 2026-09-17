import Link from 'next/link';
import { dismissLifecycleEvent, getLifecycleEvents, verifyLifecycleEvent } from '@/actions/admin';

const LIFECYCLE_STATUSES = ['Active', 'Pending', 'Settled', 'Dismissed', 'Closed'];

const selectStyle = {
  width: '100%',
  background: 'rgba(255, 255, 255, 0.05)',
  border: '1px solid var(--border-color)',
  borderRadius: 'var(--radius-sm)',
  padding: '0.5rem 0.75rem',
  fontSize: '0.875rem',
  color: 'var(--text-primary)',
  outline: 'none',
};

export default async function LifecycleReviewPage() {
  const events = await getLifecycleEvents('Unverified');

  return (
    <div className="flex-col gap-8" style={{ display: 'flex' }}>
      <div className="flex justify-between items-center" style={{ gap: '1rem', flexWrap: 'wrap' }}>
        <div className="flex-col gap-2" style={{ display: 'flex' }}>
          <h1 style={{ fontSize: '2.25rem', fontWeight: 700 }}>Lifecycle Review</h1>
          <p className="text-muted" style={{ maxWidth: '46rem' }}>
            Newswire coverage that may report a status change on a case you already track.
            Nothing here has changed the case yet - confirm or dismiss each one.
          </p>
        </div>
        <Link href="/admin" className="btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}>
          Admin
        </Link>
      </div>

      {events.length === 0 ? (
        <div className="glass-panel surface-panel text-center text-muted" style={{ padding: '2rem' }}>
          No unverified lifecycle signals. Run the detector with: npm run detect-lifecycle-signals
        </div>
      ) : (
        <div className="flex-col gap-4" style={{ display: 'flex' }}>
          {events.map((event) => (
            <article key={event.id} className="glass-panel surface-panel" style={{ padding: '1.25rem' }}>
              <div className="flex justify-between" style={{ gap: '1rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <div>
                  <Link href={`/cases/${event.case.slug}`} className="hover-text-accent" style={{ fontSize: '1.125rem', fontWeight: 600 }}>
                    {event.case.caseName}
                  </Link>
                  <p className="text-muted" style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>
                    Currently: {event.case.caseLifecycleStatus}
                    {event.suggestedLifecycleStatus ? ` -> Reported: ${event.suggestedLifecycleStatus}` : ''}
                  </p>
                </div>
                <span style={{ padding: '0.25rem 0.5rem', background: 'rgba(148, 163, 184, 0.1)', color: 'var(--accent-primary)', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem' }}>
                  {new Date(event.eventDate).toLocaleDateString()}
                </span>
              </div>

              <p className="text-muted" style={{ fontSize: '0.875rem', marginTop: '1rem', whiteSpace: 'pre-line' }}>
                {event.description || event.title}
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                <form action={verifyLifecycleEvent} className="flex-col gap-2" style={{ display: 'flex' }}>
                  <input type="hidden" name="eventId" value={event.id} />
                  <select name="lifecycleStatus" style={selectStyle} defaultValue={event.suggestedLifecycleStatus || event.case.caseLifecycleStatus}>
                    {LIFECYCLE_STATUSES.map((status) => (
                      <option key={status} value={status} style={{ color: '#000' }}>{status}</option>
                    ))}
                  </select>
                  <button type="submit" className="btn-primary" style={{ padding: '0.5rem 0.75rem', fontSize: '0.875rem' }}>
                    Confirm and update case
                  </button>
                </form>

                <form action={dismissLifecycleEvent} className="flex-col gap-2" style={{ display: 'flex' }}>
                  <input type="hidden" name="eventId" value={event.id} />
                  <button type="submit" className="btn-secondary" style={{ padding: '0.5rem 0.75rem', fontSize: '0.875rem', color: '#ef4444', width: '100%' }}>
                    Dismiss, not a real change
                  </button>
                </form>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
