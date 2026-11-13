import { useTranslations } from "next-intl";

/**
 * Esqueleto de una página de lista mientras llegan los datos (umbral de Doherty: la navegación responde al instante).
 * Se usa desde los `loading.tsx` de las páginas con más consultas.
 */
export function PageSkeleton({ rows = 4, filters = false }: { rows?: number; filters?: boolean }) {
  const t = useTranslations("common");
  return (
    <div aria-busy="true" className="flex flex-col gap-6">
      <p role="status" className="sr-only">
        {t("loading")}
      </p>
      <div className="flex flex-col gap-2">
        <div className="skeleton h-9 w-64 max-w-full" />
        <div className="skeleton h-4 w-96 max-w-full" />
      </div>
      {filters && <div className="skeleton h-14 w-full" />}
      <ul className="flex flex-col gap-3">
        {Array.from({ length: rows }, (_, i) => (
          <li key={i} className="skeleton h-24 w-full" style={{ animationDelay: `${i * 80}ms` }} />
        ))}
      </ul>
    </div>
  );
}
