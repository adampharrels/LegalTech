import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export default function Home() {
  return (
    <div className="flex flex-col min-h-[calc(100vh-8rem)] relative overflow-hidden">
      
      {/* Hero Section with Dark Gradient */}
      <div className="relative flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-20">
        
        {/* Animated Background Grid */}
        <div className="absolute inset-0 -z-10 opacity-20">
          <div className="absolute inset-0 bg-grid-pattern"></div>
        </div>

        {/* Subtle animated orbs in background */}
        <div className="absolute top-10 right-1/4 w-72 h-72 bg-primary/5 blur-3xl -z-10 animate-pulse"></div>
        <div className="absolute bottom-20 left-1/3 w-96 h-96 bg-blue-500/5 blur-3xl -z-10 animate-pulse animation-delay-2000"></div>

        <div className="max-w-5xl mx-auto text-center space-y-8">
          {/* Badge - More Subtle */}
          <div className="flex justify-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded text-xs font-mono text-muted-foreground border border-primary/20 bg-black/20">
              <span className="inline-block w-2 h-2 bg-primary rounded-full animate-pulse"></span>
              <span>AI LITIGATION TRACKER</span>
            </div>
          </div>

          {/* Main Heading - Bold and Clear */}
          <div className="space-y-4">
            <h1 className="text-6xl md:text-8xl font-black tracking-tighter text-white">
              AI <span className="text-gradient">Litigation</span> Navigator
            </h1>
            <p className="text-lg md:text-xl text-gray-400 max-w-3xl mx-auto font-light leading-relaxed">
              Track, analyze, and understand AI-related court cases and legal developments reshaping technology law worldwide.
            </p>
          </div>

          {/* Key Stats - Inline Simple */}
          <div className="flex justify-center gap-8 md:gap-12 pt-4 text-sm">
            <div>
              <div className="text-2xl font-bold text-primary">50+</div>
              <div className="text-gray-500">Active Cases</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-primary">15</div>
              <div className="text-gray-500">Legal Issues</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-primary">12+</div>
              <div className="text-gray-500">Jurisdictions</div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="relative px-4 sm:px-6 lg:px-8 py-12 border-t border-primary/10">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col sm:flex-row gap-6 w-full sm:w-auto mt-12 z-10">
        <Link 
          href="/cases" 
          className="group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full bg-primary px-10 py-4 text-base font-semibold text-primary-foreground shadow-[0_0_40px_rgba(6,182,212,0.4)] transition-all duration-300 hover:bg-primary/90 hover:scale-105 hover:shadow-[0_0_60px_rgba(6,182,212,0.6)]"
        >
          <span>Explore Cases</span>
          <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
        </Link>
        <Link 
          href="/dashboard" 
          className="group inline-flex items-center justify-center gap-2 rounded-full glass px-10 py-4 text-base font-semibold text-foreground transition-all duration-300 hover:bg-white/10 hover:scale-105 border border-white/10"
        >
          <span>View Insights</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl mt-20 relative z-10">
        <div className="glass-card p-6 rounded-2xl flex flex-col items-center text-center transition-all duration-300 hover:-translate-y-1 hover:border-primary/30">
          <div className="text-5xl font-bold text-foreground mb-2 drop-shadow-sm">50+</div>
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.2em]">Curated Cases</div>
        </div>
        <div className="glass-card p-6 rounded-2xl flex flex-col items-center text-center transition-all duration-300 hover:-translate-y-1 hover:border-primary/30">
          <div className="text-5xl font-bold text-foreground mb-2 drop-shadow-sm">15</div>
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.2em]">Legal Issues</div>
        </div>
        <div className="glass-card p-6 rounded-2xl flex flex-col items-center text-center transition-all duration-300 hover:-translate-y-1 hover:border-primary/30">
          <div className="text-5xl font-bold text-foreground mb-2 drop-shadow-sm">Global</div>
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.2em]">Jurisdictions</div>
        </div>
      </div>
        </div>
      </div>
    </div>
  );
}
