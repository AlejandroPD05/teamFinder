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

// Prioridad: URL fijada (producción) → URL del despliegue de Vercel (previews) → local.
export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  const vercel = process.env.VERCEL_URL;
  const url = explicit || (vercel ? `https://${vercel}` : "http://127.0.0.1:3000");
  return url.replace(/\/$/, "");
}
