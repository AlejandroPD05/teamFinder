import { z } from "zod";
import { AVAILABILITY, CHARACTER_STATUS, GOALS, keys, LANGUAGES, VISIBILITY, VOICE } from "./options";

const visibility = z.enum(keys(VISIBILITY));
const uuid = z.uuid();
const optionalUuid = z.preprocess((v) => (v === "" || v == null ? null : v), uuid.nullable());
const unique = <T>(a: T[]) => new Set(a).size === a.length;

export const profileSchema = z.object({
  display_name: z
    .string()
    .trim()
    .min(2, "El nombre debe tener al menos 2 caracteres.")
    .max(32, "El nombre no puede pasar de 32 caracteres.")
    .regex(/^[^<>]+$/, "El nombre no puede contener < ni >."),
  languages: z.array(z.enum(keys(LANGUAGES))).max(6, "Elige como mucho 6 idiomas.").refine(unique),
  availability: z.array(z.enum(keys(AVAILABILITY))).refine(unique),
  goals: z.array(z.enum(keys(GOALS))).refine(unique),
  voice: z.preprocess((v) => (v === "" ? null : v), z.enum(keys(VOICE)).nullable()),
  languages_visibility: visibility,
  availability_visibility: visibility,
  goals_visibility: visibility,
  voice_visibility: visibility,
});

export const gameProfileSchema = z
  .object({
    rank_id: optionalUuid,
    region_id: optionalUuid,
    flex: z.boolean(),
    visibility,
    roles: z.array(uuid).max(4).refine(unique),
    primary_role: optionalUuid,
    characters: z
      .array(z.object({ character_id: uuid, status: z.enum(keys(CHARACTER_STATUS)) }))
      .max(40)
      .refine((a) => unique(a.map((c) => c.character_id)), "Agente repetido."),
  })
  .refine((v) => !v.primary_role || v.roles.includes(v.primary_role), {
    message: "El rol principal tiene que estar entre tus roles.",
    path: ["primary_role"],
  });

export type ProfileInput = z.infer<typeof profileSchema>;
export type GameProfileInput = z.infer<typeof gameProfileSchema>;

/** Convierte el FormData del formulario de perfil en un objeto validable. */
export function profileFromForm(fd: FormData) {
  return {
    display_name: fd.get("display_name"),
    languages: fd.getAll("languages"),
    availability: fd.getAll("availability"),
    goals: fd.getAll("goals"),
    voice: fd.get("voice") ?? "",
    languages_visibility: fd.get("languages_visibility"),
    availability_visibility: fd.get("availability_visibility"),
    goals_visibility: fd.get("goals_visibility"),
    voice_visibility: fd.get("voice_visibility"),
  };
}

/** Los agentes llegan como `char:<uuid>` = estado ("" = no lo juega). */
export function gameProfileFromForm(fd: FormData) {
  const characters: { character_id: string; status: string }[] = [];
  for (const [k, v] of fd.entries()) {
    if (k.startsWith("char:") && typeof v === "string" && v !== "") {
      characters.push({ character_id: k.slice(5), status: v });
    }
  }
  return {
    rank_id: fd.get("rank_id") ?? "",
    region_id: fd.get("region_id") ?? "",
    flex: fd.get("flex") === "on",
    visibility: fd.get("game_visibility"),
    roles: fd.getAll("roles"),
    primary_role: fd.get("primary_role") ?? "",
    characters,
  };
}

/** Porcentaje de perfil completado: ayuda a completarlo poco a poco. */
export function profileCompletion(p: {
  languages: string[];
  availability: string[];
  goals: string[];
  voice: string | null;
  rank_id: string | null;
  region_id: string | null;
  roles: number;
  characters: number;
}) {
  const checks = {
    Idiomas: p.languages.length > 0,
    Horarios: p.availability.length > 0,
    Objetivos: p.goals.length > 0,
    Comunicación: p.voice != null,
    Rango: p.rank_id != null,
    Servidor: p.region_id != null,
    Roles: p.roles > 0,
    Agentes: p.characters > 0,
  };
  const done = Object.values(checks).filter(Boolean).length;
  const missing = Object.entries(checks)
    .filter(([, ok]) => !ok)
    .map(([k]) => k);
  return { percent: Math.round((done / Object.keys(checks).length) * 100), missing };
}
