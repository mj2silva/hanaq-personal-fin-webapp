'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { logout } from '@/app/(auth)/login/actions';
import { SETTINGS_NAV_ITEM } from './nav-items';
import { LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UserMenuProps {
  userEmail?: string | null;
  className?: string;
}

export function UserMenu({ userEmail, className }: UserMenuProps) {
  const pathname = usePathname();
  const isSettingsActive = pathname.startsWith(SETTINGS_NAV_ITEM.href);
  const SettingsIcon = SETTINGS_NAV_ITEM.icon;

  const displayInitial = userEmail ? userEmail.charAt(0).toUpperCase() : 'U';
  const truncatedEmail = userEmail ? (userEmail.length > 20 ? `${userEmail.slice(0, 18)}...` : userEmail) : 'Usuario';

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {/* Settings Link */}
      <Link
        href={SETTINGS_NAV_ITEM.href}
        aria-current={isSettingsActive ? 'page' : undefined}
        title={SETTINGS_NAV_ITEM.label}
        className={cn(
          'inline-flex h-9 w-9 items-center justify-center rounded-lg border text-sm font-medium transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 dark:focus-visible:ring-zinc-300',
          isSettingsActive
            ? 'border-zinc-900 bg-zinc-900 text-zinc-50 dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900'
            : 'border-zinc-200/80 bg-white text-zinc-600 hover:border-zinc-300 hover:bg-zinc-100 hover:text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:border-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-100'
        )}
      >
        <SettingsIcon className="h-4 w-4" aria-hidden="true" />
        <span className="sr-only">{SETTINGS_NAV_ITEM.label}</span>
      </Link>

      {/* User Info / Badge */}
      <div
        className="hidden items-center gap-2 rounded-lg border border-zinc-200/80 bg-zinc-50/80 px-2.5 py-1 text-xs sm:flex dark:border-zinc-800 dark:bg-zinc-900/80"
        title={userEmail ?? 'Usuario autenticado'}
      >
        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-200 font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
          {displayInitial}
        </div>
        <span className="max-w-[140px] truncate text-zinc-700 font-medium dark:text-zinc-300">
          {truncatedEmail}
        </span>
      </div>

      {/* Logout Action Form */}
      <form action={logout}>
        <button
          type="submit"
          title="Cerrar sesión"
          aria-label="Cerrar sesión"
          className={cn(
            'inline-flex h-9 items-center gap-1.5 rounded-lg border border-zinc-200/80 bg-white px-2.5 text-xs font-medium text-zinc-600 transition-colors',
            'hover:border-red-200 hover:bg-red-50/80 hover:text-red-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:border-red-900/50 dark:hover:bg-red-950/40 dark:hover:text-red-300',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500'
          )}
        >
          <LogOut className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span className="hidden sm:inline">Salir</span>
        </button>
      </form>
    </div>
  );
}
