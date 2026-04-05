/**
 * Shared Supabase Client
 * This ensures we only create ONE instance of the Supabase client
 * to avoid the "Multiple GoTrueClient instances" warning
 * 
 * Note: Worker polyfill is loaded in /index.html before any modules
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
        detectSessionInUrl: false,
        flowType: 'pkce',
        storage: undefined, // Disable storage to avoid Worker usage
      },
      realtime: {
        params: {
          eventsPerSecond: 2,
        },
      },
      global: {
        headers: {
          'x-client-info': 'supabase-js-web',
        },
      },
    });
    console.log('✅ Shared Supabase client initialized');
  }
  return supabaseInstance;
}

// Export for convenience
export const supabase = getSupabaseClient();