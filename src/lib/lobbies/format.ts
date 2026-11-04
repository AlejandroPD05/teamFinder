// Formato de fechas de grupos. La beta es para servidores EU: se muestran en hora peninsular española.
const fmt = new Intl.DateTimeFormat("es-ES", {
  timeZone: "Europe/Madrid",
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatStart(iso: string | null): string {
  if (!iso) return "Ahora";
  return `${fmt.format(new Date(iso))} (hora peninsular)`;
}

export const STATUS_LABEL = { open: "Abierto", full: "Completo", closed: "Cerrado" } as const;
export const REQUEST_LABEL = {
  pending: "Pendiente",
  accepted: "Aceptada",
  rejected: "Rechazada",
  withdrawn: "Retirada",
} as const;
