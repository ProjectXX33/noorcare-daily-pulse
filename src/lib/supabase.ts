
import { createClient } from '@supabase/supabase-js';
import type { Tables } from '@/types';

// Use environment variables if available, otherwise use these defaults for development
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://your-project-url.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

// For production, we want to ensure these variables are properly set
if (import.meta.env.PROD && (!supabaseUrl || !supabaseAnonKey)) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient<Tables>(supabaseUrl, supabaseAnonKey);
