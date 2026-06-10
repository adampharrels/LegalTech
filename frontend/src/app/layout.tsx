import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

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
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} min-h-screen flex flex-col antialiased bg-animated-gradient selection:bg-primary/30 selection:text-white relative`}>
        {/* Background noise texture */}
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay pointer-events-none"></div>
        
        {/* Sticky header */}
        <Header />
        
        {/* Main content area */}
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-8 relative z-10">
          {children}
        </main>

        {/* Footer */}
        <footer className="w-full border-t border-border/50 mt-16 relative z-10">
          <div className="w-full max-w-7xl mx-auto px-4 py-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
              <div className="space-y-2">
                <h3 className="font-semibold text-sm">About</h3>
                <p className="text-xs text-muted-foreground">
                  AI Litigation Navigator tracks and analyzes AI-related court cases across global jurisdictions.
                </p>
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold text-sm">Resources</h3>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li><a href="/" className="hover:text-primary transition-colors">Home</a></li>
                  <li><a href="/cases" className="hover:text-primary transition-colors">Case Explorer</a></li>
                  <li><a href="/dashboard" className="hover:text-primary transition-colors">Dashboard</a></li>
                </ul>
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold text-sm">Development</h3>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li><a href="https://github.com" className="hover:text-primary transition-colors">GitHub</a></li>
                  <li><a href="#" className="hover:text-primary transition-colors">Documentation</a></li>
                  <li><a href="#" className="hover:text-primary transition-colors">Issues</a></li>
                </ul>
              </div>
            </div>
            <div className="pt-8 border-t border-border/50 flex flex-col sm:flex-row justify-between items-center text-xs text-muted-foreground">
              <p>&copy; 2026 AI Litigation Navigator. All rights reserved.</p>
              <p>Built with Next.js, Express, and Prisma</p>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
