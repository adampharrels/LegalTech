"use client";

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';

export default function FilterSidebar({ issues, legalAreas }: { issues: any[], legalAreas: any[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleCheck = useCallback(
    (name: string, value: string, checked: boolean) => {
      const params = new URLSearchParams(searchParams.toString());
      const currentValues = params.getAll(name);
      
      params.delete(name);
      
      if (checked) {
        currentValues.push(value);
      } else {
        const index = currentValues.indexOf(value);
        if (index > -1) currentValues.splice(index, 1);
      }
      
      currentValues.forEach(v => params.append(name, v));
      router.push(`/cases?${params.toString()}`);
    },
    [searchParams, router]
  );

  const handleSingleChange = (name: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(name, value);
    } else {
      params.delete(name);
    }
    router.push(`/cases?${params.toString()}`);
  };

  const isChecked = (name: string, value: string) => {
    return searchParams.getAll(name).includes(value);
  };

  return (
    <div className="space-y-6">
      {/* Search Query */}
      <div className="glass-card p-5 rounded-xl space-y-4">
        <h3 className="font-semibold text-sm uppercase tracking-wider border-b border-border pb-3">
          Search
        </h3>
        <input 
          type="text" 
          placeholder="Search cases..." 
          className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm"
          defaultValue={searchParams.get('query') || ''}
          onBlur={(e) => handleSingleChange('query', e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSingleChange('query', e.currentTarget.value);
          }}
        />
      </div>

      {/* Date Range Filter */}
      <div className="glass-card p-5 rounded-xl space-y-4">
        <h3 className="font-semibold text-sm uppercase tracking-wider border-b border-border pb-3">
          Filing Date
        </h3>
        <div className="space-y-3">
          <div className="flex flex-col space-y-1">
            <label className="text-xs text-muted-foreground">From</label>
            <input 
              type="date" 
              className="bg-background border border-border rounded-md px-3 py-1.5 text-sm"
              value={searchParams.get('dateFrom') || ''}
              onChange={(e) => handleSingleChange('dateFrom', e.target.value)}
            />
          </div>
          <div className="flex flex-col space-y-1">
            <label className="text-xs text-muted-foreground">To</label>
            <input 
              type="date" 
              className="bg-background border border-border rounded-md px-3 py-1.5 text-sm"
              value={searchParams.get('dateTo') || ''}
              onChange={(e) => handleSingleChange('dateTo', e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Jurisdiction Filter */}
      <div className="glass-card p-5 rounded-xl space-y-4">
        <h3 className="font-semibold text-sm uppercase tracking-wider border-b border-border pb-3">
          Jurisdiction
        </h3>
        <div className="space-y-3">
          {['United States', 'Australia', 'European Union', 'United Kingdom'].map(jur => (
            <label key={jur} className="flex items-center space-x-2 text-sm cursor-pointer hover:text-primary transition-colors">
              <input 
                type="checkbox" 
                className="rounded border-border text-primary focus:ring-primary/20 bg-background"
                checked={isChecked('jurisdiction', jur)}
                onChange={(e) => handleCheck('jurisdiction', jur, e.target.checked)}
              />
              <span>{jur}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Status Filter */}
      <div className="glass-card p-5 rounded-xl space-y-4">
        <h3 className="font-semibold text-sm uppercase tracking-wider border-b border-border pb-3">
          Case Status
        </h3>
        <div className="space-y-3">
          {['Active', 'Closed', 'Settled', 'Dismissed', 'Pending'].map(status => (
            <label key={status} className="flex items-center space-x-2 text-sm cursor-pointer hover:text-primary transition-colors">
              <input 
                type="checkbox" 
                className="rounded border-border text-primary focus:ring-primary/20 bg-background"
                checked={isChecked('statusPublic', status)}
                onChange={(e) => handleCheck('statusPublic', status, e.target.checked)}
              />
              <span>{status}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Materiality Score Filter */}
      <div className="glass-card p-5 rounded-xl space-y-4">
        <h3 className="font-semibold text-sm uppercase tracking-wider border-b border-border pb-3">
          Materiality
        </h3>
        <div className="space-y-3">
          {['High', 'Medium', 'Low'].map(score => (
            <label key={score} className="flex items-center space-x-2 text-sm cursor-pointer hover:text-primary transition-colors">
              <input 
                type="checkbox" 
                className="rounded border-border text-primary focus:ring-primary/20 bg-background"
                checked={isChecked('materialityScore', score)}
                onChange={(e) => handleCheck('materialityScore', score, e.target.checked)}
              />
              <span>{score}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Issues Filter */}
      <div className="glass-card p-5 rounded-xl space-y-4">
        <h3 className="font-semibold text-sm uppercase tracking-wider border-b border-border pb-3">
          Issues ({issues.length})
        </h3>
        <div className="space-y-2 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
          {issues.map(issue => (
            <label key={issue.id} className="flex items-start space-x-2 text-sm cursor-pointer hover:text-primary transition-colors py-0.5">
              <input 
                type="checkbox" 
                className="rounded border-border text-primary focus:ring-primary/20 bg-background mt-1 shrink-0"
                checked={isChecked('issueSlug', issue.slug)}
                onChange={(e) => handleCheck('issueSlug', issue.slug, e.target.checked)}
              />
              <span className="leading-snug">{issue.name}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Legal Areas Filter */}
      <div className="glass-card p-5 rounded-xl space-y-4">
        <h3 className="font-semibold text-sm uppercase tracking-wider border-b border-border pb-3">
          Legal Areas ({legalAreas.length})
        </h3>
        <div className="space-y-2 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
          {legalAreas.map(area => (
            <label key={area.id} className="flex items-start space-x-2 text-sm cursor-pointer hover:text-primary transition-colors py-0.5">
              <input 
                type="checkbox" 
                className="rounded border-border text-primary focus:ring-primary/20 bg-background mt-1 shrink-0"
                checked={isChecked('legalAreaSlug', area.slug)}
                onChange={(e) => handleCheck('legalAreaSlug', area.slug, e.target.checked)}
              />
              <span className="leading-snug">{area.name}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Clear Filters */}
      <button
        onClick={() => router.push('/cases')}
        className="w-full bg-secondary/50 hover:bg-secondary/70 text-foreground font-medium rounded-lg py-2 text-center transition-colors text-sm"
      >
        Clear All Filters
      </button>
    </div>
  );
}
