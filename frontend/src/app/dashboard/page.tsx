import { getCases, getIssues } from '@/actions/cases';
import { Activity, Globe, Scale, BookOpen } from 'lucide-react';

export default async function DashboardPage() {
  const cases = await getCases();
  const issuesList = await getIssues();
  
  const totalCases = cases.length;
  const activeCases = cases.filter((c) => c.statusPublic === 'Active').length;
  const highMateriality = cases.filter((c) => c.materialityScore === 'High').length;

  // Simple aggregation for jurisdictions
  const jurisdictionsMap = cases.reduce((acc: Record<string, number>, c) => {
    acc[c.jurisdiction] = (acc[c.jurisdiction] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const topJurisdictions = Object.entries(jurisdictionsMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <div className="flex-col gap-8" style={{ display: 'flex', animation: 'fadeIn 0.5s ease-in-out' }}>
      <div className="flex-col gap-2" style={{ display: 'flex' }}>
        <h1 style={{ fontSize: '2.25rem', fontWeight: 700 }}>Intelligence Dashboard</h1>
        <p className="text-muted" style={{ maxWidth: '42rem' }}>
          High-level metrics and trends in global AI litigation.
        </p>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
        <div className="glass-panel" style={{ position: 'relative', overflow: 'hidden' }}>
          <div className="flex items-center gap-4 mb-4">
            <div style={{ padding: '0.75rem', background: 'rgba(6, 182, 212, 0.2)', borderRadius: 'var(--radius-md)', color: 'var(--accent-primary)' }}>
              <Scale size={24} />
            </div>
            <h3 className="card-label">Total Cases</h3>
          </div>
          <div className="card-value">{totalCases}</div>
        </div>

        <div className="glass-panel" style={{ position: 'relative', overflow: 'hidden' }}>
          <div className="flex items-center gap-4 mb-4">
            <div style={{ padding: '0.75rem', background: 'rgba(34, 197, 94, 0.2)', borderRadius: 'var(--radius-md)', color: '#22c55e' }}>
              <Activity size={24} />
            </div>
            <h3 className="card-label">Active Disputes</h3>
          </div>
          <div className="card-value">{activeCases}</div>
        </div>

        <div className="glass-panel" style={{ position: 'relative', overflow: 'hidden' }}>
          <div className="flex items-center gap-4 mb-4">
            <div style={{ padding: '0.75rem', background: 'rgba(239, 68, 68, 0.2)', borderRadius: 'var(--radius-md)', color: '#ef4444' }}>
              <Globe size={24} />
            </div>
            <h3 className="card-label">High Materiality</h3>
          </div>
          <div className="card-value">{highMateriality}</div>
        </div>
        
        <div className="glass-panel" style={{ position: 'relative', overflow: 'hidden' }}>
          <div className="flex items-center gap-4 mb-4">
            <div style={{ padding: '0.75rem', background: 'rgba(168, 85, 247, 0.2)', borderRadius: 'var(--radius-md)', color: '#a855f7' }}>
              <BookOpen size={24} />
            </div>
            <h3 className="card-label">Issues Tracked</h3>
          </div>
          <div className="card-value">{issuesList.length}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem', marginTop: '2rem' }}>
        {/* Simple Bar Chart Representation for Jurisdictions */}
        <div className="glass-panel">
          <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1.5rem' }}>Top Jurisdictions</h3>
          <div className="flex-col gap-6" style={{ display: 'flex' }}>
            {topJurisdictions.map(([j, count]) => {
              const max = Math.max(...topJurisdictions.map((x) => x[1]));
              const width = Math.max(15, (count / max) * 100);
              return (
                <div key={j} className="flex-col gap-2" style={{ display: 'flex' }}>
                  <div className="flex justify-between" style={{ fontSize: '0.875rem' }}>
                    <span style={{ fontWeight: 500 }}>{j}</span>
                    <span className="text-muted">{count} Case{count !== 1 ? 's' : ''}</span>
                  </div>
                  <div style={{ width: '100%', height: '0.75rem', background: 'rgba(255, 255, 255, 0.05)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                    <div 
                      style={{ height: '100%', background: 'var(--accent-primary)', width: `${width}%`, borderRadius: 'var(--radius-full)' }}
                    ></div>
                  </div>
                </div>
              );
            })}
            {topJurisdictions.length === 0 && (
              <p className="text-muted" style={{ fontStyle: 'italic', fontSize: '0.875rem' }}>No data available.</p>
            )}
          </div>
        </div>

        {/* Info Box */}
        <div className="glass-panel flex-col items-center justify-center text-center gap-4" style={{ display: 'flex' }}>
           <div style={{ width: '4rem', height: '4rem', background: 'rgba(6, 182, 212, 0.2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-primary)' }}>
              <Activity size={32} />
           </div>
           <h3 style={{ fontSize: '1.5rem', fontWeight: 700 }}>More Charts Coming Soon</h3>
           <p className="text-muted" style={{ maxWidth: '24rem' }}>
             We will be integrating a charting library to visualize case timelines and distribution of legal areas.
           </p>
        </div>
      </div>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
