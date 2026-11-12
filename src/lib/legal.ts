// Datos del responsable del servicio para los textos legales (art. 13 RGPD), facilitados por el propietario el
// 2026-11-12. Se pueden cambiar sin tocar el código con NEXT_PUBLIC_LEGAL_OWNER y NEXT_PUBLIC_CONTACT_EMAIL.
export const LEGAL = {
  owner: process.env.NEXT_PUBLIC_LEGAL_OWNER?.trim() || "Alejandro Prieto Diez",
  email: process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim() || "alejandroprietodiez05@gmail.com",
  /** Fecha de la última revisión de Normas y Privacidad. */
  updated: "12 de noviembre de 2026",
};
