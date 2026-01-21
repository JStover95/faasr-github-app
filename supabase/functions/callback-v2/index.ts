/**
 * Callback V2 Edge Function Entry Point
 *
 * @see design-docs/supabase.md - Index.ts isolation pattern
 */

import { handler } from "./handler.ts";

Deno.serve(handler);
