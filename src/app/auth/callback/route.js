import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type');

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  if (token_hash && type) {
    await supabase.auth.verifyOtp({ token_hash, type });
  }

  if (code) {
    await supabase.auth.exchangeCodeForSession(code);
  }

  const origin = new URL(request.url).origin;
  return NextResponse.redirect(origin);
}
