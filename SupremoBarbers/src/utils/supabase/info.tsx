// Vite exposes only variables prefixed with VITE_ to the browser. Keep the
// existing public project as a fallback so a fresh checkout does not crash at
// module import time when .env.local has not been created yet. Deployments can
// override these values with VITE_SUPABASE_PROJECT_ID and
// VITE_SUPABASE_ANON_KEY.
const defaultProjectId = 'soqbkzwdfsuuziwdpnls';
const defaultPublicAnonKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNvcWJrendkZnN1dXppd2RwbmxzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0MDAwMDAsImV4cCI6MjA4MDk3NjAwMH0.34Oix9UwT1SHnkJHT49sk9kk4iwwBKuz6GtA7januTI';

export const projectId =
  (import.meta.env.VITE_SUPABASE_PROJECT_ID as string | undefined)?.trim() ||
  defaultProjectId;
export const publicAnonKey =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() ||
  defaultPublicAnonKey;
