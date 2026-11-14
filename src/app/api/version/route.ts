// Qué versión está sirviendo producción (el commit lo pone Vercel al desplegar). Lo usa la comprobación tras cada
// despliegue (.github/workflows/smoke.yml) para esperar a que la web nueva esté en marcha. Sin datos de nadie.
export function GET() {
  return Response.json(
    { commit: process.env.VERCEL_GIT_COMMIT_SHA ?? null },
    { headers: { "Cache-Control": "no-store" } },
  );
}
