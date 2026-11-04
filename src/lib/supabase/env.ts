// Acceso estático a NEXT_PUBLIC_* para que Next los incruste en el cliente.
export function supabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (ver .env.example).",
    );
  }
  return { url, key };
}

// Prioridad: URL fijada (dominio propio) → en Vercel, dominio de producción o URL del despliegue
// (previews) → local. Las variables VERCEL_* las rellena Vercel solo.
export function siteUrl(env: NodeJS.ProcessEnv = process.env): string {
  const host =
    env.VERCEL_ENV === "production" ? env.VERCEL_PROJECT_PRODUCTION_URL || env.VERCEL_URL : env.VERCEL_URL;
  const url = env.NEXT_PUBLIC_SITE_URL || (host ? `https://${host}` : "http://127.0.0.1:3000");
  return url.replace(/\/$/, "");
}
