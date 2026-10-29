'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MAIN_NAV_ITEMS } from './nav-items';
import { cn } from '@/lib/utils';

interface MainNavProps {
  className?: string;
}

export function MainNav({ className }: MainNavProps) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navegación principal"
      className={cn('flex items-center gap-1 sm:gap-2', className)}
    >
      {MAIN_NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive =
          item.href === '/dashboard'
            ? pathname === '/dashboard' || pathname.startsWith('/dashboard/')
            : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'group inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 dark:focus-visible:ring-zinc-300',
              isActive
                ? 'bg-zinc-900 text-zinc-50 shadow-xs dark:bg-zinc-100 dark:text-zinc-900'
                : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/80 dark:hover:text-zinc-100'
            )}
          >
            <Icon
              className={cn(
                'h-4 w-4 shrink-0 transition-transform group-hover:scale-105',
                isActive
                  ? 'text-zinc-50 dark:text-zinc-900'
                  : 'text-zinc-500 dark:text-zinc-400'
              )}
              aria-hidden="true"
            />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
