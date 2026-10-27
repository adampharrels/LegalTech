import Link from 'next/link';
import { getCases } from '@/actions/cases';
import {
  addLifecycleStage,
  dismissLifecycleEvent,
  getLifecycleEvents,
  getLifecycleStages,
  verifyLifecycleEvent,
} from '@/actions/admin';
import EntryDate from '@/components/EntryDate';
import LifecycleStageTree from '@/components/LifecycleStageTree';
import { formatDate } from '@/lib/format';
import { LIFECYCLE_STAGE_TYPES, type LifecycleEvent, type LifecycleStageNode } from '@/types/cases';

function flattenWithDepth(nodes: LifecycleStageNode[], depth = 0): Array<{ node: LifecycleStageNode; depth: number }> {
  return nodes.flatMap((node) => [{ node, depth }, ...flattenWithDepth(node.children, depth + 1)]);
}

function SignalForms({ event, q, caseId }: { event: LifecycleEvent; q?: string; caseId?: string }) {
  const context = (
    <>
      <input type="hidden" name="eventId" value={event.id} />
      {q && <input type="hidden" name="q" value={q} />}
      {caseId && <input type="hidden" name="caseId" value={caseId} />}
    </>
  );

  return (
    <div className="actions">
      <form action={verifyLifecycleEvent} className="actions" style={{ marginTop: 0 }}>
        {context}
        <select name="lifecycleStatus" defaultValue={event.suggestedLifecycleStatus || ''} aria-label="Stage">
          {LIFECYCLE_STAGE_TYPES.map((status) => <option key={status}>{status}</option>)}
        </select>
        <button type="submit" className="btn">Confirm</button>
      </form>
      <form action={dismissLifecycleEvent}>
        {context}
        <button type="submit" className="btn-quiet">Dismiss</button>
      </form>
    </div>
  );
}

export default async function LifecyclePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; caseId?: string; error?: string }>;
}) {
  const params = await searchParams;
  const query = params.q?.trim();
  const searchResults = query ? await getCases({ query }) : [];
  const selectedCase = params.caseId ? searchResults.find((c) => c.id === params.caseId) : undefined;

  const { tree, latestStageId } = selectedCase
    ? await getLifecycleStages(selectedCase.id)
    : { tree: [], latestStageId: null };
  const flatStages = flattenWithDepth(tree);

  // Only split a case's signals out of the main list when its section is
  // actually shown; otherwise they would be hidden from both places.
  const pendingEvents = await getLifecycleEvents('Unverified');
  const pendingForCase = selectedCase ? pendingEvents.filter((e) => e.case.id === selectedCase.id) : [];
  const otherPending = selectedCase ? pendingEvents.filter((e) => e.case.id !== selectedCase.id) : pendingEvents;

  return (
    <>
      <div className="page-head">
        <h1>Lifecycle</h1>
        <p className="lede">Record where a case is up to, or confirm a change spotted in the news.</p>
      </div>

      {params.error && <p className="notice"><strong>Not saved.</strong> {params.error}</p>}

      <form action="/admin/lifecycle" className="inline-search">
        <input name="q" defaultValue={query || ''} placeholder="Find a case by name" aria-label="Find a case by name" />
        <button type="submit" className="btn">Find</button>
      </form>

      {query && !selectedCase && (
        searchResults.length === 0 ? (
          <p className="prose" style={{ marginTop: 24 }}>No cases match.</p>
        ) : (
          <ol className="entries" style={{ marginTop: 24 }}>
            {searchResults.map((c) => (
              <li key={c.id} className="entry has-status">
                <EntryDate value={c.filingDate} />
                <div>
                  <Link href={`/admin/lifecycle?q=${encodeURIComponent(query)}&caseId=${c.id}`} className="entry-title">{c.caseName}</Link>
                  <p className="entry-meta">{c.courtName}</p>
                </div>
                <div className="entry-status">{c.caseLifecycleStatus}</div>
              </li>
            ))}
          </ol>
        )
      )}

      {selectedCase && (
        <div className="article" style={{ marginTop: 32 }}>
          <section>
            <p className="label"><Link href={`/admin/lifecycle?q=${encodeURIComponent(query || '')}`}>Results</Link> / <span className="status">{selectedCase.caseLifecycleStatus}</span></p>
            <h3 style={{ marginTop: 4 }}><Link href={`/cases/${selectedCase.slug}`}>{selectedCase.caseName}</Link></h3>

            {pendingForCase.length > 0 && (
              <>
                <h2 className="label">Spotted in the news</h2>
                {pendingForCase.map((event) => (
                  <div key={event.id} style={{ marginBottom: 20 }}>
                    <p className="small muted" style={{ whiteSpace: 'pre-line' }}>{event.description || event.title}</p>
                    <SignalForms event={event} q={query} caseId={selectedCase.id} />
                  </div>
                ))}
              </>
            )}

            <h2 className="label">Procedural history</h2>
            <LifecycleStageTree nodes={tree} emptyMessage="No stages recorded yet." />
          </section>

          <aside>
            <h2 className="label" style={{ marginTop: 0 }}>Add a stage</h2>
            <form action={addLifecycleStage}>
              <input type="hidden" name="caseId" value={selectedCase.id} />
              <input type="hidden" name="q" value={query || ''} />
              <label className="field">
                <span>Stage</span>
                <select name="status" required>
                  {LIFECYCLE_STAGE_TYPES.map((status) => <option key={status}>{status}</option>)}
                </select>
              </label>
              <label className="field"><span>Date</span><input type="date" name="stageDate" required /></label>
              <label className="field">
                <span>Comes after</span>
                <select name="parentId" defaultValue={latestStageId || ''}>
                  <option value="">Nothing, it is the first stage</option>
                  {flatStages.map(({ node, depth }) => (
                    <option key={node.id} value={node.id}>
                      {' '.repeat(depth)}{node.status}, {formatDate(node.stageDate)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field"><span>Notes</span><textarea name="notes" rows={2} /></label>
              <button type="submit" className="btn">Add stage</button>
            </form>
          </aside>
        </div>
      )}

      <h2 className="label">Status changes to review ({otherPending.length})</h2>
      {otherPending.length === 0 ? (
        <p className="muted">None right now. The daily pipeline checks the newswire for settlements, dismissals, and closures.</p>
      ) : (
        <ol className="entries">
          {otherPending.map((event) => (
            <li key={event.id} className="entry">
              <EntryDate value={event.eventDate} />
              <div>
                <Link href={`/admin/lifecycle?q=${encodeURIComponent(event.case.caseName)}&caseId=${event.case.id}`} className="entry-title">{event.case.caseName}</Link>
                <p className="entry-meta">
                  <span className="status">{event.case.caseLifecycleStatus}</span> to <span className="status">{event.suggestedLifecycleStatus || 'unknown'}</span>
                </p>
                <p className="small muted" style={{ whiteSpace: 'pre-line' }}>{event.description || event.title}</p>
                <SignalForms event={event} />
              </div>
            </li>
          ))}
        </ol>
      )}
    </>
  );
}
