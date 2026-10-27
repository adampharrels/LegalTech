import Link from 'next/link';
import { getCases } from '@/actions/cases';
import { analyzeCase, createBasicCase, deleteCase } from '@/actions/admin';
import EntryDate from '@/components/EntryDate';

const STATUSES = ['Active', 'Pending', 'Settled', 'Dismissed', 'Closed'];
const SOURCE_CONFIDENCE_LEVELS = ['Official court source', 'Official regulator publication', 'Court-adjacent source', 'Secondary source', 'Unknown'];

export default async function AdminPage() {
  const cases = await getCases();

  return (
    <>
      <div className="page-head">
        <h1>Admin</h1>
        <p className="lede">Every case, including those marked not relevant.</p>
      </div>

      <div className="article">
        <section>
          <ol className="entries">
            {cases.map((c) => (
              <li key={c.id} className="entry">
                <EntryDate value={c.filingDate} />
                <div>
                  <Link href={`/cases/${c.slug}`} className="entry-title">{c.caseName}</Link>
                  <p className="entry-meta">
                    <span className="status">{c.caseLifecycleStatus}</span> · {c.reviewStatus} · {c.aiRelevanceStatus}
                  </p>
                  <div className="actions">
                    <form action={async () => {
                      'use server';
                      await analyzeCase(c.id);
                    }}>
                      <button type="submit" className="link">Summarise and tag</button>
                    </form>
                    <form action={async () => {
                      'use server';
                      await deleteCase(c.id);
                    }}>
                      <button type="submit" className="link">Delete</button>
                    </form>
                  </div>
                </div>
              </li>
            ))}
          </ol>
          {cases.length === 0 && <p className="prose">No cases yet.</p>}
        </section>

        <aside>
          <h2 className="label" style={{ marginTop: 0 }}>Add a case</h2>
          <form action={createBasicCase}>
            <label className="field"><span>Name</span><input name="caseName" required /></label>
            <label className="field"><span>Court</span><input name="courtName" required /></label>
            <label className="field"><span>Citation</span><input name="neutralCitation" placeholder="[2026] FCA 123" /></label>
            <label className="field"><span>Filed</span><input name="filingDate" type="date" /></label>
            <label className="field">
              <span>Status</span>
              <select name="statusPublic" defaultValue="Active">
                {STATUSES.map((status) => <option key={status}>{status}</option>)}
              </select>
            </label>
            <label className="field">
              <span>Materiality</span>
              <select name="materialityLevel" defaultValue="Medium">
                <option>High</option>
                <option>Medium</option>
                <option>Low</option>
              </select>
            </label>
            <label className="field"><span>Summary</span><textarea name="summaryShort" required rows={3} /></label>
            <label className="field"><span>Source URL</span><input name="sourceUrl" type="url" /></label>
            <details>
              <summary>More fields</summary>
              <div style={{ marginTop: 12 }}>
                <label className="field"><span>Jurisdiction</span><input name="jurisdiction" defaultValue="Australia" /></label>
                <label className="field"><span>Country</span><input name="country" defaultValue="Australia" /></label>
                <label className="field"><span>Court level</span><input name="courtLevel" placeholder="Federal, State, Tribunal" /></label>
                <label className="field"><span>Docket number</span><input name="docketNumber" /></label>
                <label className="field"><span>Longer summary</span><textarea name="summaryLong" rows={4} /></label>
                <label className="field"><span>Why it matters</span><textarea name="whyItMatters" rows={3} /></label>
                <label className="field"><span>Source title</span><input name="sourceTitle" /></label>
                <label className="field"><span>Source publisher</span><input name="sourcePublisher" /></label>
                <label className="field"><span>Source type</span><input name="sourceType" placeholder="Court record" /></label>
                <label className="field"><span>Source date</span><input name="sourcePublishedAt" type="date" /></label>
                <label className="field">
                  <span>Kind of source</span>
                  <select name="sourceConfidence" defaultValue="Official court source">
                    {SOURCE_CONFIDENCE_LEVELS.map((level) => <option key={level}>{level}</option>)}
                  </select>
                </label>
              </div>
            </details>
            <button type="submit" className="btn">Add case</button>
          </form>
        </aside>
      </div>
    </>
  );
}
