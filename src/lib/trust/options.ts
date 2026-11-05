// Listas cerradas de confianza y seguridad. Deben coincidir con los enum/CHECK de la migración.

export const REPORT_REASONS = {
  spam: "Spam o publicidad",
  harassment: "Acoso o insultos",
  sexual: "Contenido sexual no deseado",
  impersonation: "Suplantación de identidad",
  cheating: "Trampas, boosting o smurfing",
  other: "Otro motivo",
} as const;

export const KARMA_TAGS = {
  buen_companero: "Buen compañero",
  comunicativo: "Comunicativo",
  buen_ambiente: "Buen ambiente",
  puntual: "Puntual",
} as const;

export const TRUST_ERRORS: Record<string, string> = {
  self: "No puedes hacerlo contigo mismo.",
  rate_limited: "Has llegado al límite por hoy. Inténtalo más tarde.",
  invalid: "No se ha podido identificar ese mensaje.",
  duplicate: "Ya has valorado a esta persona en este grupo.",
  not_closed: "Solo se valora cuando el grupo está cerrado (hasta 7 días después).",
  not_member: "Solo entre miembros del grupo.",
};

export const trustError = (hint?: string | null) =>
  (hint && TRUST_ERRORS[hint]) || "No se pudo completar la acción. Inténtalo de nuevo.";
