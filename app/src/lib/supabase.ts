import AsyncStorage from "@react-native-async-storage/async-storage";
import type { SupportedStorage } from "@supabase/supabase-js";
import { createClient } from "@supabase/supabase-js";

function normalizeEnv(value: string) {
  return value.trim().replace(/^["']|["']$/g, "");
}

function normalizeSupabaseUrl(url: string) {
  let u = normalizeEnv(url);
  if (!u) return u;
  u = u.replace(/\/+$/, "");
  u = u.replace(/\/rest\/v1\/?$/i, "");
  return u;
}

/** Evita AsyncStorage durante export estatico (Node sin `window`). */
function getAuthStorage(): SupportedStorage {
  if (typeof window === "undefined") {
    const memory: Record<string, string> = {};
    return {
      getItem: async (key) => memory[key] ?? null,
      setItem: async (key, value) => {
        memory[key] = value;
      },
      removeItem: async (key) => {
        delete memory[key];
      }
    };
  }
  return AsyncStorage;
}

const supabaseUrl = normalizeSupabaseUrl(process.env.EXPO_PUBLIC_SUPABASE_URL ?? "");
const jwtAnon = normalizeEnv(process.env.EXPO_PUBLIC_SUPABASE_ANON_JWT ?? "");
const genericAnon = normalizeEnv(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "");
/** Preferir JWT `anon` (eyJ...) si viene en ANON_JWT; la publishable a veces falla si está truncada. */
const supabaseAnonKey = jwtAnon.length > 0 ? jwtAnon : genericAnon;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Faltan EXPO_PUBLIC_SUPABASE_URL o EXPO_PUBLIC_SUPABASE_ANON_KEY / EXPO_PUBLIC_SUPABASE_ANON_JWT");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: getAuthStorage(),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false
  }
});
