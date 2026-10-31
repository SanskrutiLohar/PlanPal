import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Environment variables for Supabase (client-side uses anon key only)
const supabaseUrl = (import.meta.env?.VITE_SUPABASE_URL as string) || '';
const supabaseAnonKey = (import.meta.env?.VITE_SUPABASE_ANON_KEY as string) || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  !supabaseUrl.includes('placeholder') &&
  supabaseUrl.startsWith('https://')
);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

/**
 * SQL Schema definition for Supabase PostgreSQL persistence (RLS enabled):
 * 
 * -- 1. Events Table
 * CREATE TABLE IF NOT EXISTS public.events (
 *   id TEXT PRIMARY KEY,
 *   user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
 *   title TEXT NOT NULL,
 *   form_data JSONB NOT NULL,
 *   plan JSONB NOT NULL,
 *   expenses JSONB DEFAULT '[]'::jsonb,
 *   tasks JSONB DEFAULT '[]'::jsonb,
 *   vendor_comparisons JSONB DEFAULT '[]'::jsonb,
 *   created_at TIMESTAMPTZ DEFAULT NOW(),
 *   updated_at TIMESTAMPTZ DEFAULT NOW()
 * );
 * 
 * -- 2. Enable Row Level Security
 * ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
 * 
 * -- 3. Row Level Security Policies
 * CREATE POLICY "Users can view their own events"
 *   ON public.events FOR SELECT
 *   USING (auth.uid() = user_id OR user_id IS NULL);
 * 
 * CREATE POLICY "Users can insert their own events"
 *   ON public.events FOR INSERT
 *   WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
 * 
 * CREATE POLICY "Users can update their own events"
 *   ON public.events FOR UPDATE
 *   USING (auth.uid() = user_id OR user_id IS NULL);
 * 
 * CREATE POLICY "Users can delete their own events"
 *   ON public.events FOR DELETE
 *   USING (auth.uid() = user_id OR user_id IS NULL);
 */
