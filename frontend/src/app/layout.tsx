import type { Metadata, Viewport } from 'next';
import { Newsreader, Source_Sans_3 } from 'next/font/google';
import './globals.css';
import Header from '@/components/Header';

const serif = Newsreader({ subsets: ['latin'], variable: '--font-serif', display: 'swap', style: ['normal', 'italic'] });
const sans = Source_Sans_3({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  title: 'AI Litigation',
  description: 'A tracker for AI-related court cases and regulator actions in Australia.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-AU" className={`${serif.variable} ${sans.variable}`}>
      <body>
        <Header />
        <main className="wrap">{children}</main>
        <footer className="wrap footer">
          Hallucination cases from the AI Hallucination Cases Database by Damien Charlotin (CC BY 4.0).
        </footer>
      </body>
    </html>
  );
}
