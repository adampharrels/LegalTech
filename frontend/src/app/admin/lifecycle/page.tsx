import Link from 'next/link';
import { getCases } from '@/actions/cases';
import {
  addLifecycleStage,
  dismissLifecycleEvent,
  getLifecycleEvents,
  getLifecycleStages,
  verifyLifecycleEvent,
} from '@/actions/admin';
import { LIFECYCLE_STAGE_TYPES, type LifecycleStageNode } from '@/types/cases';
import LifecycleStageTree, { formatStageDate as formatDate } from '@/components/LifecycleStageTree';

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

const inputStyle = { ...selectStyle, marginBottom: 0 };

function flattenWithDepth(nodes: LifecycleStageNode[], depth = 0): Array<{ node: LifecycleStageNode; depth: number }> {
  return nodes.flatMap((node) => [{ node, depth }, ...flattenWithDepth(node.children, depth + 1)]);
}

export default async function LifecycleReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; caseId?: string }>;
}) {
  const params = await searchParams;
  const query = params.q?.trim();
  const searchResults = query ? await getCases({ query }) : [];
  const selectedCase = params.caseId ? searchResults.find((c) => c.id === params.caseId) : undefined;

  const { tree: stageTree, latestStageId } = selectedCase
    ? await getLifecycleStages(selectedCase.id)
    : { tree: [], latestStageId: null };
  const flatStages = flattenWithDepth(stageTree);

  // Only split a case's signals out of the global list when its panel is
  // actually shown; otherwise (e.g. a caseId the search doesn't return) they
  // would be hidden from both places.
  const pendingEvents = await getLifecycleEvents('Unverified');
  const pendingForSelectedCase = selectedCase ? pendingEvents.filter((e) => e.case.id === selectedCase.id) : [];
  const otherPendingEvents = selectedCase ? pendingEvents.filter((e) => e.case.id !== selectedCase.id) : pendingEvents;

  return (
    <div className="flex-col gap-8" style={{ display: 'flex' }}>
      <div className="flex justify-between items-center" style={{ gap: '1rem', flexWrap: 'wrap' }}>
        <div className="flex-col gap-2" style={{ display: 'flex' }}>
          <h1 style={{ fontSize: '2.25rem', fontWeight: 700 }}>Lifecycle Review</h1>
          <p className="text-muted" style={{ maxWidth: '46rem' }}>
            Look up a case, see its procedural history as a tree, and record a new stage.
            Newswire-detected changes wait here for confirmation before joining that tree.
          </p>
        </div>
        <Link href="/admin" className="btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}>
          Admin
        </Link>
      </div>

      <section className="glass-panel surface-panel" style={{ padding: '1.25rem' }}>
        <form style={{ display: 'flex', gap: '0.75rem' }}>
          <input name="q" defaultValue={query || ''} placeholder="Search for a case by name..." style={{ ...inputStyle, flex: 1 }} />
          <button type="submit" className="btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}>
            Search
          </button>
        </form>

        {query && (
          <div className="flex-col gap-2" style={{ display: 'flex', marginTop: '1rem' }}>
            {searchResults.length === 0 ? (
              <p className="text-muted" style={{ fontSize: '0.875rem' }}>No cases match &quot;{query}&quot;.</p>
            ) : (
              searchResults.map((c) => (
                <Link
                  key={c.id}
                  href={`/admin/lifecycle?q=${encodeURIComponent(query)}&caseId=${c.id}`}
                  className="hover-text-accent"
                  style={{
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-color)',
                    background: c.id === params.caseId ? 'rgba(148, 163, 184, 0.08)' : 'transparent',
                    display: 'block',
                  }}
                >
                  <span style={{ fontWeight: 600 }}>{c.caseName}</span>
                  <span className="text-muted" style={{ fontSize: '0.8125rem', marginLeft: '0.5rem' }}>{c.caseLifecycleStatus}</span>
                </Link>
              ))
            )}
          </div>
        )}
      </section>

      {selectedCase && (
        <section className="glass-panel surface-panel" style={{ padding: '1.25rem' }}>
          <div className="flex justify-between items-start" style={{ flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <Link href={`/cases/${selectedCase.slug}`} className="hover-text-accent" style={{ fontSize: '1.25rem', fontWeight: 600 }}>
                {selectedCase.caseName}
              </Link>
              <p className="text-muted" style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>
                Current status: {selectedCase.caseLifecycleStatus}
              </p>
            </div>
          </div>

          {pendingForSelectedCase.length > 0 && (
            <div className="flex-col gap-3" style={{ display: 'flex', marginTop: '1.25rem' }}>
              <h3 style={{ fontSize: '0.9375rem', fontWeight: 600 }}>Newswire-detected, awaiting confirmation</h3>
              {pendingForSelectedCase.map((event) => (
                <div key={event.id} style={{ padding: '0.875rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', background: 'rgba(255, 255, 255, 0.03)' }}>
                  <p className="text-muted" style={{ fontSize: '0.8125rem', whiteSpace: 'pre-line' }}>{event.description || event.title}</p>
                  <div className="flex gap-2" style={{ marginTop: '0.75rem', flexWrap: 'wrap' }}>
                    <form action={verifyLifecycleEvent} className="flex gap-2" style={{ display: 'flex' }}>
                      <input type="hidden" name="eventId" value={event.id} />
                      <select name="lifecycleStatus" style={{ ...selectStyle, width: 'auto' }} defaultValue={event.suggestedLifecycleStatus || ''}>
                        {LIFECYCLE_STAGE_TYPES.map((status) => (
                          <option key={status} value={status} style={{ color: '#000' }}>{status}</option>
                        ))}
                      </select>
                      <button type="submit" className="btn-primary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.8125rem' }}>
                        Confirm, add to tree
                      </button>
                    </form>
                    <form action={dismissLifecycleEvent}>
                      <input type="hidden" name="eventId" value={event.id} />
                      <button type="submit" className="btn-secondary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.8125rem', color: '#ef4444' }}>
                        Dismiss
                      </button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div style={{ marginTop: '1.25rem' }}>
            <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, marginBottom: '0.75rem' }}>Procedural history</h3>
            <LifecycleStageTree nodes={stageTree} emptyMessage="No stages recorded yet. Add the first one below." />
          </div>

          <div style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-color)' }}>
            <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, marginBottom: '0.75rem' }}>Add a stage</h3>
            <form action={addLifecycleStage} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '0.75rem', alignItems: 'end' }}>
              <input type="hidden" name="caseId" value={selectedCase.id} />
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Attach after</label>
                <select name="parentId" style={selectStyle} defaultValue={latestStageId || ''}>
                  <option value="" style={{ color: '#000' }}>None (start of tree)</option>
                  {flatStages.map(({ node, depth }) => (
                    <option key={node.id} value={node.id} style={{ color: '#000' }}>
                      {'—'.repeat(depth + 1)} {node.status} ({formatDate(node.stageDate)})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Status</label>
                <select name="status" style={selectStyle} required>
                  {LIFECYCLE_STAGE_TYPES.map((status) => (
                    <option key={status} value={status} style={{ color: '#000' }}>{status}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Date</label>
                <input type="date" name="stageDate" style={inputStyle} required />
              </div>
              <button type="submit" className="btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}>
                Add
              </button>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Notes (optional)</label>
                <textarea name="notes" rows={2} style={{ ...inputStyle, resize: 'vertical' }} placeholder="What happened, and where you read it..." />
              </div>
            </form>
          </div>
        </section>
      )}

      <section className="flex-col gap-4" style={{ display: 'flex' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>
          {selectedCase ? 'Other pending lifecycle signals' : 'Pending lifecycle signals'} ({otherPendingEvents.length})
        </h2>
        {otherPendingEvents.length === 0 ? (
          <div className="glass-panel surface-panel text-center text-muted" style={{ padding: '2rem' }}>
            Nothing pending. Run: npm run detect-lifecycle-signals
          </div>
        ) : (
          otherPendingEvents.map((event) => (
            <article key={event.id} className="glass-panel surface-panel" style={{ padding: '1.25rem' }}>
              <div className="flex justify-between" style={{ gap: '1rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <div>
                  <Link href={`/admin/lifecycle?q=${encodeURIComponent(event.case.caseName)}&caseId=${event.case.id}`} className="hover-text-accent" style={{ fontSize: '1.125rem', fontWeight: 600 }}>
                    {event.case.caseName}
                  </Link>
                  <p className="text-muted" style={{ fontSize: '0.875rem', marginTop: '0.25rem' }}>
                    Currently: {event.case.caseLifecycleStatus}
                    {event.suggestedLifecycleStatus ? ` -> Reported: ${event.suggestedLifecycleStatus}` : ''}
                  </p>
                </div>
                <span style={{ padding: '0.25rem 0.5rem', background: 'rgba(148, 163, 184, 0.1)', color: 'var(--accent-primary)', borderRadius: 'var(--radius-sm)', fontSize: '0.75rem' }}>
                  {formatDate(event.eventDate)}
                </span>
              </div>

              <p className="text-muted" style={{ fontSize: '0.875rem', marginTop: '1rem', whiteSpace: 'pre-line' }}>
                {event.description || event.title}
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                <form action={verifyLifecycleEvent} className="flex-col gap-2" style={{ display: 'flex' }}>
                  <input type="hidden" name="eventId" value={event.id} />
                  <select name="lifecycleStatus" style={selectStyle} defaultValue={event.suggestedLifecycleStatus || ''}>
                    {LIFECYCLE_STAGE_TYPES.map((status) => (
                      <option key={status} value={status} style={{ color: '#000' }}>{status}</option>
                    ))}
                  </select>
                  <button type="submit" className="btn-primary" style={{ padding: '0.5rem 0.75rem', fontSize: '0.875rem' }}>
                    Confirm and add to tree
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
          ))
        )}
      </section>
    </div>
  );
}
