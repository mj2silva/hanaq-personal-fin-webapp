import { Metadata } from 'next';
import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { connection } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ConfigurationPanel } from '@/components/configuration/configuration-panel';

export const metadata: Metadata = {
  title: 'Configuración | Finanzas Personales',
  description: 'Gestión de categorías, tipo de cambio referencial y preferencias del sistema.',
};

async function ConfiguracionContent() {
  await connection();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const [{ data: categories, error: categoriesError }, { data: latestRate }, { data: settings }] =
    await Promise.all([
      supabase
        .from('categories')
        .select('*')
        .eq('user_id', user.id)
        .order('type', { ascending: true })
        .order('name', { ascending: true }),
      supabase
        .from('exchange_rates')
        .select('usd_to_pen_rate')
        .eq('user_id', user.id)
        .order('rate_date', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('user_settings')
        .select('onboarding_completed')
        .eq('user_id', user.id)
        .maybeSingle(),
    ]);

  if (categoriesError) {
    throw new Error('No se pudieron cargar las categorías.');
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl dark:text-zinc-50">
            Configuración
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Catálogos del sistema, tipo de cambio referencial USD/PEN y preferencias contables.
          </p>
        </div>
      </div>

      <ConfigurationPanel
        categories={categories ?? []}
        latestRate={latestRate?.usd_to_pen_rate ?? null}
        onboardingCompleted={settings?.onboarding_completed ?? false}
      />
    </div>
  );
}

export default function ConfiguracionPage() {
  return (
    <Suspense
      fallback={
        <div className="rounded-2xl border border-zinc-200/80 bg-white p-6 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">
          Cargando configuración...
        </div>
      }
    >
      <ConfiguracionContent />
    </Suspense>
  );
}
