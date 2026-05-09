// Graceful Supabase client. If env vars are missing, exports `null` and the rest of the
// app falls back to local-only mode (IndexedDB only). This lets the site run on Netlify
// before Supabase is configured.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase: SupabaseClient | null =
  url && anon ? createClient(url, anon, { auth: { persistSession: false } }) : null;

export const isCloudSyncEnabled = supabase !== null;
