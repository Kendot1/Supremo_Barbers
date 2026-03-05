/**
 * Shared Supabase Client
 * This ensures we only create ONE instance of the Supabase client
 * to avoid the "Multiple GoTrueClient instances" warning
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from './info';

const supabaseUrl = `https://${projectId}.supabase.co`;

// Singleton instance
let supabaseInstance: SupabaseClient | null = null;

/**
 * Get the shared Supabase client instance
 * This function ensures only one client is created
 */
export function getSupabaseClient(): SupabaseClient {
  if (!supabaseInstance) {
    supabaseInstance = createClient(supabaseUrl, publicAnonKey, {
      auth: {
        persistSession: false, // We handle auth separately
        autoRefreshToken: false,
      },
    });

  }
  return supabaseInstance;
}

// Export for convenience
export const supabase = getSupabaseClient();
