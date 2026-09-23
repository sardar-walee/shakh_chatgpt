import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  : null;

export async function ensureProfileExists(userId: string, fullName?: string, role?: string) {
  if (!supabase || !userId) return;
  try {
    const { data } = await supabase.from("profiles").select("id").eq("id", userId).maybeSingle();
    if (!data) {
      await supabase.from("profiles").upsert({
        id: userId,
        full_name: fullName || "User",
        role: role || "customer"
      }, { onConflict: "id" });
    }
  } catch (err) {
    console.warn("ensureProfileExists error:", err);
  }
}
