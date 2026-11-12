// Datos del responsable del servicio para los textos legales. Los decide el propietario (ver PROGRESS.md) y se
// configuran por variables de entorno: sin ellas, las páginas muestran «pendiente» en lugar de inventarlos.
export const LEGAL = {
  owner: process.env.NEXT_PUBLIC_LEGAL_OWNER?.trim() || null,
  email: process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim() || null,
  /** Fecha de la última revisión de Normas y Privacidad. */
  updated: "12 de noviembre de 2026",
};
