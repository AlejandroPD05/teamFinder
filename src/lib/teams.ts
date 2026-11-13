import { z } from "zod";
import { RESTRICTED_MESSAGE } from "./restrictions";

// Equipos persistentes (migración 20261117000000): por juego, con dueño, hasta 10 miembros y chat propio.

export const TEAM_MAX_MEMBERS = 10;

export const teamSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, "El nombre: al menos 3 caracteres.")
    .max(32, "El nombre: como mucho 32 caracteres.")
    .regex(/^[^<>]+$/, "El nombre no puede tener < ni >."),
  description: z
    .string()
    .trim()
    .max(200, "La descripción: como mucho 200 caracteres.")
    .regex(/^[^<>]*$/, "La descripción no puede tener < ni >."),
});

const TEAM_ERRORS: Record<string, string> = {
  limit_teams: "Ya tienes 3 equipos. Borra alguno para crear otro.",
  duplicate: "Ya existe un equipo con ese nombre en este juego (o esa persona ya está invitada).",
  self: "No puedes invitarte a ti mismo.",
  unavailable: "No se puede invitar a esta persona.",
  already_member: "Ya es del equipo.",
  full: `El equipo está completo (máximo ${TEAM_MAX_MEMBERS}, contando invitaciones pendientes).`,
  rate_limited: "Has llegado al límite por ahora. Prueba más tarde.",
  not_pending: "Esa invitación ya estaba respondida.",
  owner: "El dueño no puede salir: borra el equipo si quieres deshacerlo.",
  not_member: "Ya no eres de este equipo.",
  invalid: "El mensaje debe tener entre 1 y 500 caracteres.",
  restricted: RESTRICTED_MESSAGE,
};

export const teamError = (hint?: string | null) =>
  (hint && TEAM_ERRORS[hint]) || "No se pudo completar la acción. Inténtalo de nuevo.";
