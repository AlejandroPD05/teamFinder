import { LEGAL } from "@/lib/legal";

/** Aviso honesto: texto basado en la normativa, sin revisión de un abogado. */
export function DraftNotice() {
  return (
    <p role="note" className="rounded-md border border-warning bg-panel p-3 text-sm">
      <strong>Beta.</strong> Este texto se ha redactado a partir de la normativa española y europea (RGPD, LOPDGDD, LSSI y
      Reglamento de Servicios Digitales), pero no lo ha revisado un abogado. Última actualización: {LEGAL.updated}.
    </p>
  );
}

/** Correo de contacto del responsable, o «pendiente» mientras no esté configurado. */
export function ContactEmail() {
  return LEGAL.email ? (
    <a href={`mailto:${LEGAL.email}`} className="underline underline-offset-4">
      {LEGAL.email}
    </a>
  ) : (
    <strong>pendiente</strong>
  );
}

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="flex flex-col gap-2 text-sm leading-relaxed text-text [&_li]:ml-5 [&_li]:list-disc">{children}</div>
    </section>
  );
}
