import Link from 'next/link';
import { Search, LayoutDashboard, Gavel } from 'lucide-react';

export default function Header() {
  return (
    <header className="sticky top-0 z-50 w-full glass border-b border-border transition-all duration-300 backdrop-blur-lg">
      <div className="w-full max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group shrink-0">
          <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
            <Gavel className="w-5 h-5 text-primary" />
          </div>
          <span className="font-bold text-base tracking-tighter text-foreground hidden sm:flex">
            AI<span className="text-primary mx-1">Litigation</span>Navigator
          </span>
          <span className="font-bold text-base tracking-tighter text-foreground sm:hidden">
            ALN
          </span>
        </Link>

        {/* Navigation */}
        <nav className="flex items-center gap-1 sm:gap-4">
          <Link 
            href="/cases" 
            className="text-sm font-medium text-muted-foreground hover:text-primary hover:bg-primary/5 px-3 py-2 rounded-md transition-all flex items-center gap-2"
          >
            <Search className="w-4 h-4" />
            <span className="hidden sm:inline">Cases</span>
          </Link>
          <Link 
            href="/dashboard" 
            className="text-sm font-medium text-muted-foreground hover:text-primary hover:bg-primary/5 px-3 py-2 rounded-md transition-all flex items-center gap-2"
          >
            <LayoutDashboard className="w-4 h-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </Link>
          <div className="h-4 w-px bg-border hidden sm:block mx-2"></div>
          <Link 
            href="/admin" 
            className="text-sm font-medium px-3 sm:px-4 py-2 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-all border border-primary/20 hover:border-primary/40"
          >
            <span className="hidden sm:inline">Admin</span>
            <span className="sm:hidden">+</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
