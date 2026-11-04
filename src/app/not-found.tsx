import Link from "next/link";

export default function NotFound() {
  return (
    <section className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">Página no encontrada</h1>
      <p className="text-muted">El enlace no existe, ha caducado o no tienes acceso.</p>
      <Link href="/" className="inline-flex min-h-11 items-center rounded-md border border-line px-4 text-sm hover:bg-panel-hover">
        Volver al inicio
      </Link>
    </section>
  );
}
