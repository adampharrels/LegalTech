import Link from 'next/link';
import { getCases } from '@/actions/cases';
import { getCandidates, getLifecycleEvents } from '@/actions/admin';

function countBy(values: string[]) {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) || 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

function BarTable({ rows, empty }: { rows: Array<[string, number]>; empty: string }) {
  if (rows.length === 0) return <p className="muted">{empty}</p>;
  const max = Math.max(...rows.map(([, count]) => count));

  return (
    <table className="bars">
      <tbody>
        {rows.map(([name, count]) => (
          <tr key={name}>
            <td>{name}</td>
            <td className="bar-cell"><span className="bar" style={{ width: `${(count / max) * 100}%` }} /></td>
            <td className="num">{count}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default async function DashboardPage() {
  const [cases, candidates, pendingSignals] = await Promise.all([
    getCases({ hideNotRelevant: true }),
    getCandidates('Needs human triage'),
    getLifecycleEvents('Unverified'),
  ]);

  const active = cases.filter((c) => c.caseLifecycleStatus === 'Active').length;
  const byIssue = countBy(cases.flatMap((c) => c.issues.map((ci) => ci.issue.name)));
  const byCourt = countBy(cases.map((c) => c.courtName)).slice(0, 8);
  const byStatus = countBy(cases.map((c) => c.caseLifecycleStatus));

  return (
    <>
      <div className="page-head">
        <h1>Dashboard</h1>
      </div>

      <div className="stats">
        <div className="stat">
          <span className="stat-num">{cases.length}</span>
          <span className="stat-label label">Cases tracked</span>
        </div>
        <div className="stat">
          <span className="stat-num">{active}</span>
          <span className="stat-label label">Active</span>
        </div>
        <div className="stat">
          <span className="stat-num">{candidates.length}</span>
          <Link href="/admin/triage" className="stat-label label">Waiting for triage</Link>
        </div>
        <div className="stat">
          <span className="stat-num">{pendingSignals.length}</span>
          <Link href="/admin/lifecycle" className="stat-label label">Status changes to review</Link>
        </div>
      </div>

      <div className="columns">
        <section>
          <h2 className="label">By issue</h2>
          <BarTable rows={byIssue} empty="No cases tagged yet. Summarise a case in Admin to tag it." />
        </section>
        <section>
          <h2 className="label">By court</h2>
          <BarTable rows={byCourt} empty="No cases yet." />
          <h2 className="label">By status</h2>
          <BarTable rows={byStatus} empty="No cases yet." />
        </section>
      </div>
    </>
  );
}
