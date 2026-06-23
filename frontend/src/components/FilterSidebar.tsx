"use client";

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';
import type { Issue, LegalArea } from '@/types/cases';

export default function FilterSidebar({ issues, legalAreas }: { issues: Issue[], legalAreas: LegalArea[] }) {
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

  const sectionStyle = {
    padding: '1.25rem',
    marginBottom: '1.5rem',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '1rem'
  };

  const titleStyle = {
    fontSize: '0.875rem',
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    borderBottom: '1px solid var(--border-color)',
    paddingBottom: '0.75rem',
    margin: 0
  };

  const inputStyle = {
    width: '100%',
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid var(--border-color)',
    borderRadius: 'var(--radius-sm)',
    padding: '0.5rem 0.75rem',
    fontSize: '0.875rem',
    color: 'var(--text-primary)',
    outline: 'none'
  };

  const labelStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.875rem',
    cursor: 'pointer',
    color: 'var(--text-secondary)'
  };

  const checkboxStyle = {
    accentColor: 'var(--accent-primary)',
    width: '1rem',
    height: '1rem'
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {/* Search Query */}
      <div className="glass-panel" style={sectionStyle}>
        <h3 style={titleStyle}>Search</h3>
        <input 
          type="text" 
          placeholder="Search cases..." 
          style={inputStyle}
          defaultValue={searchParams.get('query') || ''}
          onBlur={(e) => handleSingleChange('query', e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSingleChange('query', e.currentTarget.value);
          }}
        />
      </div>

      {/* Date Range Filter */}
      <div className="glass-panel" style={sectionStyle}>
        <h3 style={titleStyle}>Sort By</h3>
        <select
          style={inputStyle}
          value={searchParams.get('sort') || 'newest'}
          onChange={(e) => handleSingleChange('sort', e.target.value)}
        >
          <option value="newest" style={{ color: '#000' }}>Newest filing</option>
          <option value="oldest" style={{ color: '#000' }}>Oldest filing</option>
          <option value="recently-updated" style={{ color: '#000' }}>Recently updated</option>
          <option value="name" style={{ color: '#000' }}>Case name</option>
        </select>
      </div>

      {/* Date Range Filter */}
      <div className="glass-panel" style={sectionStyle}>
        <h3 style={titleStyle}>Filing Date</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>From</label>
            <input 
              type="date" 
              style={inputStyle}
              value={searchParams.get('dateFrom') || ''}
              onChange={(e) => handleSingleChange('dateFrom', e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>To</label>
            <input 
              type="date" 
              style={inputStyle}
              value={searchParams.get('dateTo') || ''}
              onChange={(e) => handleSingleChange('dateTo', e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Jurisdiction Filter */}
      <div className="glass-panel" style={sectionStyle}>
        <h3 style={titleStyle}>Jurisdiction</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {['United States', 'Australia', 'European Union', 'United Kingdom'].map(jur => (
            <label key={jur} style={labelStyle} onMouseOver={(e) => e.currentTarget.style.color = 'var(--text-primary)'} onMouseOut={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}>
              <input 
                type="checkbox" 
                style={checkboxStyle}
                checked={isChecked('jurisdiction', jur)}
                onChange={(e) => handleCheck('jurisdiction', jur, e.target.checked)}
              />
              <span>{jur}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Status Filter */}
      <div className="glass-panel" style={sectionStyle}>
        <h3 style={titleStyle}>Case Status</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {['Active', 'Closed', 'Settled', 'Dismissed', 'Pending'].map(status => (
            <label key={status} style={labelStyle} onMouseOver={(e) => e.currentTarget.style.color = 'var(--text-primary)'} onMouseOut={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}>
              <input 
                type="checkbox" 
                style={checkboxStyle}
                checked={isChecked('statusPublic', status)}
                onChange={(e) => handleCheck('statusPublic', status, e.target.checked)}
              />
              <span>{status}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Materiality Score Filter */}
      <div className="glass-panel" style={sectionStyle}>
        <h3 style={titleStyle}>Materiality</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {['High', 'Medium', 'Low'].map(score => (
            <label key={score} style={labelStyle} onMouseOver={(e) => e.currentTarget.style.color = 'var(--text-primary)'} onMouseOut={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}>
              <input 
                type="checkbox" 
                style={checkboxStyle}
                checked={isChecked('materialityScore', score)}
                onChange={(e) => handleCheck('materialityScore', score, e.target.checked)}
              />
              <span>{score}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Issues Filter */}
      <div className="glass-panel" style={sectionStyle}>
        <h3 style={titleStyle}>Issues ({issues.length})</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '16rem', overflowY: 'auto' }}>
          {issues.map(issue => (
            <label key={issue.id} style={{ ...labelStyle, alignItems: 'flex-start' }} onMouseOver={(e) => e.currentTarget.style.color = 'var(--text-primary)'} onMouseOut={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}>
              <input 
                type="checkbox" 
                style={{ ...checkboxStyle, marginTop: '0.25rem', flexShrink: 0 }}
                checked={isChecked('issueSlug', issue.slug)}
                onChange={(e) => handleCheck('issueSlug', issue.slug, e.target.checked)}
              />
              <span style={{ lineHeight: 1.4 }}>{issue.name}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Legal Areas Filter */}
      <div className="glass-panel" style={sectionStyle}>
        <h3 style={titleStyle}>Legal Areas ({legalAreas.length})</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '16rem', overflowY: 'auto' }}>
          {legalAreas.map(area => (
            <label key={area.id} style={{ ...labelStyle, alignItems: 'flex-start' }} onMouseOver={(e) => e.currentTarget.style.color = 'var(--text-primary)'} onMouseOut={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}>
              <input 
                type="checkbox" 
                style={{ ...checkboxStyle, marginTop: '0.25rem', flexShrink: 0 }}
                checked={isChecked('legalAreaSlug', area.slug)}
                onChange={(e) => handleCheck('legalAreaSlug', area.slug, e.target.checked)}
              />
              <span style={{ lineHeight: 1.4 }}>{area.name}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Clear Filters */}
      <button
        onClick={() => router.push('/cases')}
        className="btn-secondary"
        style={{ width: '100%', marginTop: '1rem' }}
      >
        Clear All Filters
      </button>
    </div>
  );
}
