'use client';

import { useAuth } from '@/app/components/AuthProvider';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Returns the Supabase client if the user is authenticated, null otherwise.
 * Use this in page components to decide which storage path to take:
 *   - supabase !== null → read/write Supabase
 *   - supabase === null → fallback to localStorage
 */
export function useSupabase(): SupabaseClient | null {
  const { user, supabase } = useAuth();
  return user ? supabase : null;
}
