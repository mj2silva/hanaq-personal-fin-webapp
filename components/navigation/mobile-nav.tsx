'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MAIN_NAV_ITEMS } from './nav-items';
import { cn } from '@/lib/utils';

interface MobileNavProps {
  className?: string;
}

export function MobileNav({ className }: MobileNavProps) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navegación móvil"
      className={cn(
        'fixed bottom-0 left-0 right-0 z-40 border-t border-zinc-200/80 bg-white/95 px-2 py-1.5 backdrop-blur-md md:hidden dark:border-zinc-800 dark:bg-zinc-950/95',
        className
      )}
    >
      <div className="mx-auto flex max-w-lg items-center justify-around">
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
                'flex flex-1 flex-col items-center justify-center gap-1 rounded-xl py-1 text-[11px] font-medium transition-colors',
                isActive
                  ? 'text-zinc-950 dark:text-zinc-50 font-semibold'
                  : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
              )}
            >
              <div
                className={cn(
                  'flex h-7 w-12 items-center justify-center rounded-full transition-colors',
                  isActive
                    ? 'bg-zinc-100 text-zinc-950 dark:bg-zinc-800 dark:text-zinc-50'
                    : 'text-zinc-500 dark:text-zinc-400'
                )}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              </div>
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
