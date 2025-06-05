/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

// Global function declarations
declare global {
  interface Window {
    recalculateOvertime: () => Promise<{ success: boolean; recordsUpdated: number; message: string; error?: string }>;
  }
}
