import { createClient } from '@supabase/supabase-js';
import { getPersistentUserId } from './auth';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Supabase URL or Anon Key is missing. Check your environment variables.'
  );
}

// Custom fetch to inject the x-user-id header on every request
const customFetch = (url: RequestInfo | URL, options?: RequestInit) => {
  const headers = new Headers(options?.headers);
  if (typeof window !== 'undefined') {
    const userId = getPersistentUserId();
    if (userId) {
      headers.set('x-user-id', userId);
    }
  }
  return fetch(url, { ...options, headers });
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    fetch: customFetch,
  },
});
