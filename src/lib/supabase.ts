import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

const isValidUrl = (url?: string) => {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return (parsed.protocol === "http:" || parsed.protocol === "https:") && !url.includes("YOUR_SUPABASE");
  } catch {
    return false;
  }
};

export const isSupabaseConfigured = Boolean(
  supabaseUrl && supabaseAnonKey && isValidUrl(supabaseUrl)
);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  : null;

