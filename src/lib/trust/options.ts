// Listas cerradas de confianza y seguridad. Deben coincidir con los enum/CHECK de la migración.
// Los textos están en messages/*.json (options.reportReasons, options.karmaTags, errors.trust). Sin traductor: lo
// importan componentes de cliente.

export const REPORT_REASONS = {
  spam: "spam",
  harassment: "harassment",
  sexual: "sexual",
  impersonation: "impersonation",
  cheating: "cheating",
  other: "other",
} as const;

export const KARMA_TAGS = {
  buen_companero: "buen_companero",
  comunicativo: "comunicativo",
  buen_ambiente: "buen_ambiente",
  puntual: "puntual",
} as const;
