'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Calculator, GitBranch, Box, ScanSearch } from 'lucide-react';
import { cn } from '@/lib/utils';

const LINKS = [
  { href: '/iv-calculator',     label: 'IV Calculator',     icon: Calculator },
  { href: '/breeding-planner',  label: 'Breeding Planner',  icon: GitBranch  },
  { href: '/pc-box',            label: 'PC Box',            icon: Box        },
  { href: '/screenshot-import', label: 'OCR Import',        icon: ScanSearch },
];

export default function Nav() {
  const pathname = usePathname();

  return (
    <header className="border-b border-border bg-card/60 backdrop-blur sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 flex items-center gap-1 h-14">
        <Link href="/iv-calculator" className="font-bold text-lg mr-6 text-primary">
          PokeMMO Breeder
        </Link>
        {LINKS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors',
              pathname.startsWith(href)
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent',
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}
      </div>
    </header>
  );
}
