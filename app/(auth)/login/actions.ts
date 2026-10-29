'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { validateLoginInput } from '@/lib/auth/validation';

export interface AuthActionState {
  error?: string | null;
  email?: string;
}

/**
 * Server Action to sign in a user with email and password.
 * Returns an error state object in Spanish on failure or redirects to /dashboard on success.
 */
export async function login(
  _prevState: AuthActionState | null,
  formData: FormData
): Promise<AuthActionState> {
  const validation = validateLoginInput(formData);
  if (!validation.isValid || !validation.email || !validation.password) {
    return {
      error: validation.error || 'Por favor, completa todos los campos requeridos.',
      email: validation.email || '',
    };
  }

  let isSuccess = false;
  let errorMessage: string | null = null;

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: validation.email,
      password: validation.password,
    });

    if (error) {
      if (error.status === 429) {
        errorMessage = 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.';
      } else if (error.status && error.status >= 500) {
        errorMessage = 'No pudimos conectar con el servicio. Inténtalo nuevamente.';
      } else {
        errorMessage = 'Credenciales inválidas. Por favor, verifica tu correo y contraseña.';
      }
    } else {
      isSuccess = true;
    }
  } catch {
    errorMessage = 'No pudimos conectar con el servicio. Inténtalo nuevamente.';
  }

  if (!isSuccess || errorMessage) {
    return {
      error: errorMessage ?? 'Credenciales inválidas. Por favor, verifica tu correo y contraseña.',
      email: validation.email,
    };
  }

  redirect('/dashboard');
}

/**
 * Server Action to sign out the current user and redirect to /login.
 */
export async function logout(): Promise<void> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signOut();
    if (error) {
      // Fall back to local scope sign out to ensure cookies are guaranteed cleared
      await supabase.auth.signOut({ scope: 'local' });
    }
  } catch {
    // Proceed to redirect even if network request fails
  }

  redirect('/login');
}
