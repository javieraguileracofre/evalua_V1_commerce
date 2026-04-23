/**
 * Verifica que la clave en app/.env sea aceptada por Supabase REST (no 401).
 * Uso (desde la raiz del repo): node scripts/verify-supabase-key.cjs
 */
const fs = require("fs");
const path = require("path");

const envPath = path.join(__dirname, "..", "app", ".env");
if (!fs.existsSync(envPath)) {
  console.error("No existe", envPath);
  process.exit(1);
}

const env = {};
for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const eq = t.indexOf("=");
  if (eq === -1) continue;
  env[t.slice(0, eq).trim()] = t.slice(eq + 1).trim();
}

let url = (env.EXPO_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "").replace(/\/rest\/v1\/?$/i, "");
const jwt = (env.EXPO_PUBLIC_SUPABASE_ANON_JWT || "").trim();
const raw = jwt.length > 0 ? jwt : (env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "").trim();

if (!url || !raw) {
  console.error("Falta EXPO_PUBLIC_SUPABASE_URL o clave (ANON_JWT o ANON_KEY) en app/.env");
  process.exit(1);
}

const kind = raw.startsWith("eyJ") ? "JWT anon (legacy)" : "publishable / otra";

(async () => {
  const res = await fetch(`${url}/rest/v1/`, {
    headers: { apikey: raw, Authorization: `Bearer ${raw}` }
  });

  console.log(`Clave usada: ${kind}, longitud=${raw.length}`);
  console.log("GET /rest/v1/ -> HTTP", res.status);
  if (res.status === 401) {
    console.error(
      "\n401 = clave invalida. Copia la clave «anon» (eyJ...) en Supabase: Settings > API Keys > Legacy anon, service_role.\n" +
        "Pegala en app/.env como EXPO_PUBLIC_SUPABASE_ANON_JWT=... y vuelve a ejecutar este script."
    );
    process.exitCode = 1;
    return;
  }
  console.log("OK: la API acepta esta clave.");
  process.exitCode = 0;
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
