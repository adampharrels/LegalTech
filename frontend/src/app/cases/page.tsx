import Link from 'next/link';
import { getCases, getIssues, getLegalAreas } from '@/actions/cases';
import EntryDate from '@/components/EntryDate';
import { summaryWithoutTitle } from '@/lib/format';
import ExportButton from './ExportButton';

type SearchParams = {
  query?: string;
  caseLifecycleStatus?: string;
  issueSlug?: string;
  legalAreaSlug?: string;
  jurisdiction?: string;
  sort?: string;
};

const STATUSES = ['Active', 'Pending', 'Settled', 'Dismissed', 'Closed'];
const SORTS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'recently-updated', label: 'Recently updated' },
  { value: 'name', label: 'By name' },
];

export default async function CasesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const [cases, allCases, issues, legalAreas] = await Promise.all([
    getCases({ ...params, hideNotRelevant: true }),
    getCases({ hideNotRelevant: true }),
    getIssues(),
    getLegalAreas(),
  ]);
  // Only offer a jurisdiction filter once there is more than one to pick from.
  const jurisdictions = [...new Set(allCases.map((c) => c.jurisdiction))].sort();
  const isFiltered = Object.values(params).some(Boolean);

  return (
    <>
      <div className="page-head">
        <h1>Cases</h1>
        <p className="lede">Court and tribunal matters where AI is material.</p>
      </div>

      <div className="split">
        <form action="/cases" className="filters">
          <label className="field">
            <span>Search</span>
            <input type="search" name="query" defaultValue={params.query || ''} />
          </label>
          <label className="field">
            <span>Status</span>
            <select name="caseLifecycleStatus" defaultValue={params.caseLifecycleStatus || ''}>
              <option value="">Any</option>
              {STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
          </label>
          <label className="field">
            <span>Issue</span>
            <select name="issueSlug" defaultValue={params.issueSlug || ''}>
              <option value="">Any</option>
              {issues.map((issue) => <option key={issue.slug} value={issue.slug}>{issue.name}</option>)}
            </select>
          </label>
          <label className="field">
            <span>Area of law</span>
            <select name="legalAreaSlug" defaultValue={params.legalAreaSlug || ''}>
              <option value="">Any</option>
              {legalAreas.map((area) => <option key={area.slug} value={area.slug}>{area.name}</option>)}
            </select>
          </label>
          {jurisdictions.length > 1 && (
            <label className="field">
              <span>Jurisdiction</span>
              <select name="jurisdiction" defaultValue={params.jurisdiction || ''}>
                <option value="">Any</option>
                {jurisdictions.map((jurisdiction) => <option key={jurisdiction} value={jurisdiction}>{jurisdiction}</option>)}
              </select>
            </label>
          )}
          <label className="field">
            <span>Order</span>
            <select name="sort" defaultValue={params.sort || 'newest'}>
              {SORTS.map((sort) => <option key={sort.value} value={sort.value}>{sort.label}</option>)}
            </select>
          </label>
          <div className="actions">
            <button type="submit" className="btn">Apply</button>
            {isFiltered && <Link href="/cases" className="small">Clear</Link>}
          </div>
        </form>

        <section>
          <p className="small muted">
            {cases.length} {cases.length === 1 ? 'case' : 'cases'} · <ExportButton cases={cases} />
          </p>
          {cases.length === 0 ? (
            <p className="prose">No cases match these filters.</p>
          ) : (
            <ol className="entries">
              {cases.map((c) => {
                const summary = summaryWithoutTitle(c.summaryShort, c.caseName);
                return (
                <li key={c.id} className="entry has-status">
                  <EntryDate value={c.filingDate} />
                  <div>
                    <Link href={`/cases/${c.slug}`} className="entry-title">{c.caseName}</Link>
                    <p className="entry-meta">{c.courtName}</p>
                    {summary && <p className="entry-summary">{summary}</p>}
                  </div>
                  <div className="entry-status">{c.caseLifecycleStatus}</div>
                </li>
                );
              })}
            </ol>
          )}
        </section>
      </div>
    </>
  );
}
