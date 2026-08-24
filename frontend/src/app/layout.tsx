import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";
import Header from "@/components/Header";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "AI Litigation Navigator",
  description: "Advanced intelligence platform for tracking AI-related litigation and tribunal decisions across global jurisdictions.",
  keywords: ["AI", "litigation", "legal tech", "court cases", "law"],
  authors: [{ name: "Adam Pharrels" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body>
        <div className="app-shell">
          <Header />
          <main className="container pt-4 pb-8" style={{ flex: 1 }}>
            {children}
          </main>
          
          <footer className="border-t mt-16" style={{ width: '100%' }}>
            <div className="container py-8">
              <div className="grid grid-cols-3 gap-8 mb-8">
                <div>
                  <h3 style={{ marginBottom: '0.5rem', fontSize: '0.875rem' }}>About</h3>
                  <p className="text-muted" style={{ fontSize: '0.75rem' }}>
                    AI Litigation Navigator tracks and analyses AI-related court cases across global jurisdictions.
                  </p>
                </div>
                <div>
                  <h3 style={{ marginBottom: '0.5rem', fontSize: '0.875rem' }}>Resources</h3>
                  <ul className="text-muted" style={{ fontSize: '0.75rem', listStyle: 'none', padding: 0 }}>
                    <li style={{ marginBottom: '0.25rem' }}><Link href="/" className="nav-link">Home</Link></li>
                    <li style={{ marginBottom: '0.25rem' }}><Link href="/cases" className="nav-link">Case Explorer</Link></li>
                    <li style={{ marginBottom: '0.25rem' }}><Link href="/dashboard" className="nav-link">Dashboard</Link></li>
                  </ul>
                </div>
                <div>
                  <h3 style={{ marginBottom: '0.5rem', fontSize: '0.875rem' }}>Development</h3>
                  <ul className="text-muted" style={{ fontSize: '0.75rem', listStyle: 'none', padding: 0 }}>
                    <li style={{ marginBottom: '0.25rem' }}><a href="https://github.com" className="nav-link">GitHub</a></li>
                    <li style={{ marginBottom: '0.25rem' }}><a href="#" className="nav-link">Documentation</a></li>
                    <li style={{ marginBottom: '0.25rem' }}><a href="#" className="nav-link">Issues</a></li>
                  </ul>
                </div>
              </div>
              <div className="border-t py-8 flex flex-col items-center justify-between" style={{ flexDirection: 'row', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                <p>&copy; 2026 AI Litigation Navigator. All rights reserved.</p>
                <p>Built with Next.js, Express, and Prisma</p>
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
