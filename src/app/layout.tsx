import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { TooltipProvider } from '@/components/ui/tooltip';
import Nav from '@/components/Nav';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'PokeMMO Breeder',
  description: 'IV Calculator, Breeding Chain Planner, and PC Box for PokeMMO',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground min-h-screen`}>
        <TooltipProvider>
          <Nav />
          <main className="max-w-6xl mx-auto px-4 py-6">
            {children}
          </main>
        </TooltipProvider>
      </body>
    </html>
  );
}
