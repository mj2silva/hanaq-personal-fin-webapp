'use client';

import { Suspense, useActionState } from 'react';
import { useSearchParams } from 'next/navigation';
import { login, type AuthActionState } from './actions';
import { AlertCircle, ArrowRight, Loader2, Lock, Mail, Wallet } from 'lucide-react';

function LoginFormContent() {
  const searchParams = useSearchParams();
  const [state, formAction, isPending] = useActionState<AuthActionState | null, FormData>(
    login,
    null
  );

  const callbackError = searchParams.get('error') === 'auth_callback'
    ? 'El enlace de autenticación no es válido o ha expirado. Inicia sesión nuevamente.'
    : null;

  const displayError = state?.error ?? callbackError;

  return (
    <div className="w-full rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-sm sm:p-8 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-8 flex flex-col items-center text-center">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-900 text-white shadow-md dark:bg-zinc-100 dark:text-zinc-900">
          <Wallet className="h-6 w-6" aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Finanzas Personales
        </h1>
        <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">
          Ingresa tus credenciales para acceder a tu panel
        </p>
      </div>

      {displayError && (
        <div
          role="alert"
          aria-live="polite"
          className="mb-6 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50/80 p-3.5 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300"
        >
          <AlertCircle
            className="mt-0.5 h-4 w-4 shrink-0 text-red-600 dark:text-red-400"
            aria-hidden="true"
          />
          <span className="leading-snug">{displayError}</span>
        </div>
      )}

      <form action={formAction} className="space-y-4">
        <div>
          <label
            htmlFor="email"
            className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300"
          >
            Correo electrónico
          </label>
          <div className="relative mt-1.5 rounded-lg shadow-xs">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-400 dark:text-zinc-500">
              <Mail className="h-4 w-4" aria-hidden="true" />
            </div>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              disabled={isPending}
              defaultValue={state?.email ?? ''}
              placeholder="tu@correo.com"
              aria-invalid={Boolean(displayError)}
              className="block w-full rounded-lg border border-zinc-300 bg-transparent py-2.5 pl-9 pr-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-zinc-100 dark:focus:ring-zinc-100"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300"
          >
            Contraseña
          </label>
          <div className="relative mt-1.5 rounded-lg shadow-xs">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-400 dark:text-zinc-500">
              <Lock className="h-4 w-4" aria-hidden="true" />
            </div>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              disabled={isPending}
              placeholder="••••••••"
              aria-invalid={Boolean(displayError)}
              className="block w-full rounded-lg border border-zinc-300 bg-transparent py-2.5 pl-9 pr-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-zinc-100 dark:focus:ring-zinc-100"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-zinc-900 py-2.5 px-4 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 dark:focus-visible:outline-zinc-100 cursor-pointer"
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              <span>Iniciando sesión...</span>
            </>
          ) : (
            <>
              <span>Ingresar</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </>
          )}
        </button>
      </form>
    </div>
  );
}

export function LoginForm() {
  return (
    <Suspense
      fallback={
        <div className="w-full rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-sm sm:p-8 dark:border-zinc-800 dark:bg-zinc-900 text-center text-sm text-zinc-500">
          Cargando formulario...
        </div>
      }
    >
      <LoginFormContent />
    </Suspense>
  );
}
