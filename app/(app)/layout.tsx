import { Suspense } from 'react';
import Link from 'next/link';
import { connection } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { MainNav } from '@/components/navigation/main-nav';
import { MobileNav } from '@/components/navigation/mobile-nav';
import { UserMenu } from '@/components/navigation/user-menu';
import { Wallet } from 'lucide-react';

async function UserMenuSection() {
  await connection();

  let userEmail: string | null = null;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    userEmail = user?.email ?? null;
  } catch {
    userEmail = null;
  }

  return <UserMenu userEmail={userEmail} />;
}

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-zinc-50/50 text-zinc-900 antialiased dark:bg-zinc-950 dark:text-zinc-100">
      {/* Top Application Header */}
      <header className="sticky top-0 z-30 border-b border-zinc-200/80 bg-white/90 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-900/90">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo & Brand */}
          <div className="flex items-center gap-6">
            <Link
              href="/dashboard"
              className="flex items-center gap-2.5 font-semibold tracking-tight text-zinc-900 transition-opacity hover:opacity-90 dark:text-zinc-50"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-900 text-zinc-50 shadow-xs dark:bg-zinc-100 dark:text-zinc-900">
                <Wallet className="h-5 w-5" aria-hidden="true" />
              </div>
              <div className="flex flex-col md:hidden lg:flex">
                <span className="text-sm font-bold leading-tight">Finanzas Personales</span>
                <span className="text-[10px] text-zinc-500 font-normal leading-tight dark:text-zinc-400">ERP & Tesorería</span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <div className="hidden md:flex md:items-center">
              <MainNav />
            </div>
          </div>

          {/* User Controls & Logout (Suspended for instant shell prerendering) */}
          <Suspense fallback={<UserMenu userEmail={null} />}>
            <UserMenuSection />
          </Suspense>
        </div>
      </header>

      {/* Main Content View */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8 pb-24 md:pb-10">
        {children}
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <MobileNav />
    </div>
  );
}
