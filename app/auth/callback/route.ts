import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSafeRedirectPath } from '@/lib/auth/redirect';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get('code');
  const next = searchParams.get('next');

  const destinationPath = getSafeRedirectPath(next, '/dashboard');

  if (code) {
    try {
      const supabase = await createClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (!error) {
        return NextResponse.redirect(new URL(destinationPath, origin));
      }
    } catch {
      // Failure connecting to Supabase client
    }
  }

  // Redirect to login with error query parameter without exposing internal error details
  return NextResponse.redirect(new URL('/login?error=auth_callback', origin));
}
