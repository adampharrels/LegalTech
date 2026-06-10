import { getCases, getIssues } from '@/actions/cases';
import { Activity, Globe, Scale, BookOpen } from 'lucide-react';

export default async function DashboardPage() {
  const cases = await getCases();
  const issuesList = await getIssues();
  
  const totalCases = cases.length;
  const activeCases = cases.filter(c => c.statusPublic === 'Active').length;
  const highMateriality = cases.filter(c => c.materialityScore === 'High').length;

  // Simple aggregation for jurisdictions
  const jurisdictionsMap = cases.reduce((acc, c) => {
    acc[c.jurisdiction] = (acc[c.jurisdiction] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const topJurisdictions = Object.entries(jurisdictionsMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-bold">Intelligence Dashboard</h1>
        <p className="text-muted-foreground w-full max-w-2xl">
          High-level metrics and trends in global AI litigation.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="glass-card p-6 rounded-2xl relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary/10 rounded-full blur-2xl group-hover:bg-primary/20 transition-all"></div>
          <div className="flex items-center gap-4 mb-4 relative z-10">
            <div className="p-3 bg-primary/20 rounded-lg text-primary">
              <Scale className="w-6 h-6" />
            </div>
            <h3 className="font-medium text-muted-foreground text-sm uppercase tracking-wider">Total Cases</h3>
          </div>
          <div className="text-4xl font-bold relative z-10">{totalCases}</div>
        </div>

        <div className="glass-card p-6 rounded-2xl relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-green-500/10 rounded-full blur-2xl group-hover:bg-green-500/20 transition-all"></div>
          <div className="flex items-center gap-4 mb-4 relative z-10">
            <div className="p-3 bg-green-500/20 rounded-lg text-green-500">
              <Activity className="w-6 h-6" />
            </div>
            <h3 className="font-medium text-muted-foreground text-sm uppercase tracking-wider">Active Disputes</h3>
          </div>
          <div className="text-4xl font-bold relative z-10">{activeCases}</div>
        </div>

        <div className="glass-card p-6 rounded-2xl relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-red-500/10 rounded-full blur-2xl group-hover:bg-red-500/20 transition-all"></div>
          <div className="flex items-center gap-4 mb-4 relative z-10">
            <div className="p-3 bg-red-500/20 rounded-lg text-red-500">
              <Globe className="w-6 h-6" />
            </div>
            <h3 className="font-medium text-muted-foreground text-sm uppercase tracking-wider">High Materiality</h3>
          </div>
          <div className="text-4xl font-bold relative z-10">{highMateriality}</div>
        </div>
        
        <div className="glass-card p-6 rounded-2xl relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl group-hover:bg-purple-500/20 transition-all"></div>
          <div className="flex items-center gap-4 mb-4 relative z-10">
            <div className="p-3 bg-purple-500/20 rounded-lg text-purple-500">
              <BookOpen className="w-6 h-6" />
            </div>
            <h3 className="font-medium text-muted-foreground text-sm uppercase tracking-wider">Issues Tracked</h3>
          </div>
          <div className="text-4xl font-bold relative z-10">{issuesList.length}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
        {/* Simple Bar Chart Representation for Jurisdictions */}
        <div className="glass-card p-6 rounded-2xl">
          <h3 className="text-xl font-semibold mb-6">Top Jurisdictions</h3>
          <div className="space-y-6">
            {topJurisdictions.map(([j, count]) => {
              const max = Math.max(...topJurisdictions.map(x => x[1]));
              const width = Math.max(15, (count / max) * 100);
              return (
                <div key={j} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{j}</span>
                    <span className="text-muted-foreground">{count} Case{count !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="w-full h-3 bg-secondary rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary bg-animated-gradient" 
                      style={{ width: `${width}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
            {topJurisdictions.length === 0 && (
              <p className="text-muted-foreground italic text-sm">No data available.</p>
            )}
          </div>
        </div>

        {/* Info Box */}
        <div className="glass-card p-6 rounded-2xl flex flex-col justify-center items-center text-center space-y-4">
           <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center text-primary mb-2">
              <Activity className="w-8 h-8" />
           </div>
           <h3 className="text-2xl font-bold">More Charts Coming Soon</h3>
           <p className="text-muted-foreground max-w-sm">
             We will be integrating a charting library to visualize case timelines and distribution of legal areas.
           </p>
        </div>
      </div>
    </div>
  );
}
