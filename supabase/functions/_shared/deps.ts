/**
 * Shared dependencies for Supabase Edge Functions
 *
 * This file centralizes imports of external packages used across Edge Functions.
 */

// GitHub App authentication
export { App } from "npm:@octokit/app@16.1.2";

// GitHub REST API client
export { Octokit } from "npm:@octokit/rest@22.0.1";

// JWT signing for GitHub App authentication
export { sign } from "npm:jsonwebtoken@^9.0.3";

// Supabase client for Auth Admin API
export {
  createClient,
  type SupabaseClient,
} from "jsr:@supabase/supabase-js@^2.90.1";
