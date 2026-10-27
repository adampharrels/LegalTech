'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/cases', label: 'Cases' },
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/admin/triage', label: 'Triage' },
  { href: '/admin/lifecycle', label: 'Lifecycle' },
  { href: '/admin', label: 'Admin' },
];

function isCurrent(pathname: string, href: string) {
  // /admin is the parent of Triage and Lifecycle, so it only matches itself.
  return href === '/admin' ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

export default function Header() {
  const pathname = usePathname();

  return (
    <header className="masthead">
      <div className="wrap masthead-inner">
        <Link href="/cases" className="wordmark">AI Litigation<em>Australia</em></Link>
        <nav>
          {LINKS.map((link) => (
            <Link key={link.href} href={link.href} aria-current={isCurrent(pathname, link.href) ? 'page' : undefined}>
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
