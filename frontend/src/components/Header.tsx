import Link from 'next/link';
import { Search, LayoutDashboard, Gavel, ListChecks } from 'lucide-react';

export default function Header() {
  return (
    <header className="navbar" style={{ position: 'sticky', top: 0, zIndex: 50 }}>
      <div className="container flex justify-between items-center" style={{ padding: '0', height: '4rem' }}>
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2" style={{ textDecoration: 'none' }}>
          <div style={{ padding: '0.5rem', borderRadius: 'var(--radius-sm)', background: 'rgba(148, 163, 184, 0.12)', border: '1px solid var(--border-color)' }}>
            <Gavel size={20} color="var(--accent-primary)" />
          </div>
          <span style={{ fontWeight: 700, fontSize: '1rem' }}>
            AI<span style={{ color: 'var(--accent-primary)', margin: '0 0.25rem' }}>Litigation</span>Navigator
          </span>
        </Link>

        {/* Navigation */}
        <nav className="flex items-center gap-4">
          <Link 
            href="/cases" 
            className="flex items-center gap-2 nav-link"
            style={{ padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)' }}
          >
            <Search size={16} />
            <span>Cases</span>
          </Link>
          <Link 
            href="/dashboard" 
            className="flex items-center gap-2 nav-link"
            style={{ padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)' }}
          >
            <LayoutDashboard size={16} />
            <span>Dashboard</span>
          </Link>
          <div style={{ width: '1px', height: '1rem', background: 'var(--border-color)', margin: '0 0.5rem' }}></div>
          <Link 
            href="/admin/triage" 
            className="flex items-center gap-2 nav-link"
            style={{ padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)' }}
          >
            <ListChecks size={16} />
            <span>Triage</span>
          </Link>
          <Link 
            href="/admin" 
            style={{ 
              padding: '0.5rem 1rem', 
              borderRadius: 'var(--radius-sm)', 
              background: 'rgba(148, 163, 184, 0.1)', 
              color: 'var(--accent-primary)',
              border: '1px solid var(--border-color)',
              fontWeight: 500,
              fontSize: '0.875rem'
            }}
          >
            Admin
          </Link>
        </nav>
      </div>
    </header>
  );
}
