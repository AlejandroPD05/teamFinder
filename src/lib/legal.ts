// Datos del responsable del servicio para los textos legales (art. 13 RGPD), facilitados por el propietario el
// 2026-11-12. Se pueden cambiar sin tocar el código con NEXT_PUBLIC_LEGAL_OWNER y NEXT_PUBLIC_CONTACT_EMAIL.
export const LEGAL = {
  owner: process.env.NEXT_PUBLIC_LEGAL_OWNER?.trim() || "Alejandro Prieto Diez",
  email: process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim() || "alejandroprietodiez05@gmail.com",
  /** Versión vigente de Normas y Privacidad y desde cuándo. */
  version: "1.1",
  updated: "13 de noviembre de 2026",
};
