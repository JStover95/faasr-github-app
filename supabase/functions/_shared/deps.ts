/**
 * Shared dependencies for Supabase Edge Functions
 *
 * This file centralizes imports of external packages used across Edge Functions.
 */

// GitHub App authentication
export { App } from "@octokit/app";

// GitHub REST API client
export { Octokit } from "@octokit/rest";

// JWT signing for GitHub App authentication
export * as jwt from "jsonwebtoken";

// Supabase client for Auth Admin API
export { createClient } from "@supabase/supabase-js";
