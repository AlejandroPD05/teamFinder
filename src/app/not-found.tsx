import Link from "next/link";

export default function NotFound() {
  return (
    <section className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center">
      <h1 className="font-display text-3xl font-semibold">Página no encontrada</h1>
      <p className="text-muted">El enlace no existe, ha caducado o no tienes acceso.</p>
      <Link href="/" className="btn-ghost">
        Volver al inicio
      </Link>
    </section>
  );
}
