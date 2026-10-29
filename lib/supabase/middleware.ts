import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { Database } from '@/types/database.types';

export async function updateSession(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Faltan las variables de entorno de Supabase (NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY). Por favor, configure el archivo .env.local con las credenciales correspondientes.'
    );
  }

  let supabaseResponse = NextResponse.next({
    request,
  });

  let cacheHeaders: Record<string, string> = {};

  const supabase = createServerClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
          if (headers) {
            cacheHeaders = { ...cacheHeaders, ...headers };
            Object.entries(headers).forEach(([key, value]) =>
              supabaseResponse.headers.set(key, value)
            );
          }
        },
      },
    }
  );

  // IMPORTANT: Do not run code between createServerClient and
  // supabase.auth.getUser(). Calling getUser() refreshes the auth token if needed.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  const protectedRoutes = [
    '/dashboard',
    '/actividad',
    '/cuentas',
    '/mi-mes',
    '/configuracion',
  ];

  const isProtectedRoute = protectedRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
  const isAuthRoute = pathname === '/login' || pathname.startsWith('/login/');

  // Helper to construct redirect with cookies and anti-caching headers copied over
  const createRedirectResponse = (url: URL) => {
    const redirectResponse = NextResponse.redirect(url);
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value, cookie);
    });
    Object.entries(cacheHeaders).forEach(([key, value]) => {
      redirectResponse.headers.set(key, value);
    });
    return redirectResponse;
  };

  // If unauthenticated user tries to access a protected route, redirect to /login
  if (!user && isProtectedRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return createRedirectResponse(url);
  }

  // If authenticated user tries to access /login, redirect to /dashboard
  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return createRedirectResponse(url);
  }

  // If user accesses root route `/`
  if (pathname === '/') {
    const url = request.nextUrl.clone();
    url.pathname = user ? '/dashboard' : '/login';
    return createRedirectResponse(url);
  }

  return supabaseResponse;
}
