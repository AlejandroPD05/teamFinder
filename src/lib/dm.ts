/** Mensajes privados: textos de error de las funciones de la base de datos (pista `hint`). */
const DM_ERRORS: Record<string, string> = {
  self: "No puedes escribirte a ti mismo.",
  unavailable: "Esta conversación no está disponible.",
  closed: "Esta persona no admite mensajes privados.",
  rate_limited: "Vas demasiado rápido. Espera un poco.",
  invalid: "El mensaje debe tener entre 1 y 1000 caracteres.",
  restricted: "Tu cuenta está restringida temporalmente: no puedes escribir hasta que termine.",
};

export const dmError = (hint?: string | null) =>
  (hint && DM_ERRORS[hint]) || "No se pudo completar. Inténtalo de nuevo.";

export const DM_MAX = 1000;
