/**
 * Browser-facing entry point for the canonical pure appointment rules.
 * The implementation lives inside the Edge Function directory so Supabase
 * can bundle it when the function is deployed in isolation.
 */
export * from "../supabase/functions/server/appointmentRules.ts";
