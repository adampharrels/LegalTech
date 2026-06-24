import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export default function Home() {
  return (
    <div className="flex flex-col relative overflow-hidden" style={{ minHeight: 'calc(100vh - 8rem)' }}>
      
      {/* Hero Section */}
      <div className="relative flex-col items-center justify-center py-20 flex" style={{ flex: 1 }}>
        <div className="orb-1"></div>
        <div className="orb-2"></div>

        <div className="max-w-4xl mx-auto text-center">
          <div className="flex justify-center mb-8">
            <div className="badge">
              <span className="badge-dot"></span>
              <span>AI LITIGATION TRACKER</span>
            </div>
          </div>

          <div className="mb-8">
            <h1 className="hero-title">
              AI <span className="text-gradient">Litigation</span> Navigator
            </h1>
            <p className="hero-subtitle">
              Track, analyse, and understand AI-related court cases and legal developments reshaping technology law worldwide.
            </p>
          </div>

          <div className="flex justify-center gap-8 mt-8">
            <div className="text-center">
              <div className="stat-value">50+</div>
              <div className="stat-label" style={{ fontSize: '0.875rem' }}>Active Cases</div>
            </div>
            <div className="text-center">
              <div className="stat-value">15</div>
              <div className="stat-label" style={{ fontSize: '0.875rem' }}>Legal Issues</div>
            </div>
            <div className="text-center">
              <div className="stat-value">12+</div>
              <div className="stat-label" style={{ fontSize: '0.875rem' }}>Jurisdictions</div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="relative py-12 border-t">
        <div className="container" style={{ maxWidth: '800px' }}>
          <div className="flex justify-center gap-4 mb-8">
            <Link href="/cases" className="btn-primary">
              <span>Explore Cases</span>
              <ArrowRight size={20} />
            </Link>
            <Link href="/dashboard" className="btn-secondary">
              <span>View Insights</span>
            </Link>
          </div>

          <div className="grid grid-cols-3 gap-6 mt-12 relative">
            <div className="glass-panel text-center">
              <div className="card-value">50+</div>
              <div className="card-label">Curated Cases</div>
            </div>
            <div className="glass-panel text-center">
              <div className="card-value">15</div>
              <div className="card-label">Legal Issues</div>
            </div>
            <div className="glass-panel text-center">
              <div className="card-value">Global</div>
              <div className="card-label">Jurisdictions</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
