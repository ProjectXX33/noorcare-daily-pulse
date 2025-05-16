
import { createClient } from '@supabase/supabase-js';
import type { Tables } from '@/types';

// Use environment variables if available, otherwise use these defaults for development
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://csrtkebisqfffjgukkxu.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNzcnRrZWJpc3FmZmZqZ3Vra3h1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDczMDU1NDksImV4cCI6MjA2Mjg4MTU0OX0.i8ZPQ3PEb8s4k16fqzjpE0O4-iyX9SaA4PbsYOgl2Yo';

// For production, we want to ensure these variables are properly set
if (import.meta.env.PROD && (!supabaseUrl || !supabaseAnonKey)) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient<Tables>(supabaseUrl, supabaseAnonKey);
