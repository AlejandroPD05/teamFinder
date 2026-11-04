export function DraftNotice() {
  return (
    <p role="note" className="rounded-md border border-danger/40 bg-panel p-3 text-sm">
      <strong>Borrador pendiente de revisión legal.</strong> Describe cómo funciona hoy la beta, pero no es un texto legal
      definitivo. Los campos marcados como «pendiente» los tiene que decidir el responsable del servicio.
    </p>
  );
}

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="flex flex-col gap-2 text-sm leading-relaxed text-text/90 [&_li]:ml-5 [&_li]:list-disc">{children}</div>
    </section>
  );
}
