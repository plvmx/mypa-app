'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { useUser } from '@/contexts/UserContext';

interface NavItem {
  href: string;
  label: string;
  icon: ReactNode;
}

const NAV: NavItem[] = [
  {
    href: '/app',
    label: 'Projects',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6">
        <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      </svg>
    ),
  },
  {
    href: '/app/notes',
    label: 'Notes',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6">
        <path d="M4 5h16M4 12h16M4 19h10" strokeLinecap="round" />
      </svg>
    ),
  },
];

/**
 * Shared mobile shell: a header with the app name + sign-out, a scrollable
 * content area, and a fixed bottom navigation bar. Wraps every /app page.
 */
export default function MobileLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { signOut } = useUser();

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background/80 px-4 py-3 backdrop-blur">
        <span className="text-lg font-semibold tracking-tight">MyPA</span>
        <button
          type="button"
          onClick={() => signOut()}
          className="text-sm text-muted hover:text-foreground"
        >
          Sign out
        </button>
      </header>

      <main className="flex-1 px-4 pb-24 pt-4">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-10 mx-auto flex max-w-md items-stretch border-t border-border bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        {NAV.map((item) => {
          const active =
            item.href === '/app' ? pathname === '/app' : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-1 flex-col items-center gap-1 py-2 text-xs ${
                active ? 'text-accent' : 'text-muted'
              }`}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
