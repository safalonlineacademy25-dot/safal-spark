// Minimal `process.env` declaration for tool files. The MCP plugin bundles these
// files into a Deno Edge Function where `process.env` is available at runtime,
// but the Vite/TS type-check doesn't include Node types for src/**.
declare const process: { env: Record<string, string | undefined> };

export function getSupabaseEnv() {
  const url = process.env.SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRole) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }
  return { url, serviceRole };
}
