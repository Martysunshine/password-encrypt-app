function readEnvVar(name: "VITE_SUPABASE_URL" | "VITE_SUPABASE_ANON_KEY"): string {
  const value = import.meta.env[name];
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const SUPABASE_URL = readEnvVar("VITE_SUPABASE_URL");
export const SUPABASE_ANON_KEY = readEnvVar("VITE_SUPABASE_ANON_KEY");
