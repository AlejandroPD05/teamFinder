import { describe, expect, it } from "vitest";
import {
  gameProfileFromForm,
  gameProfileSchema,
  profileCompletion,
  profileFromForm,
  profileSchema,
} from "@/lib/profile/schema";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";

function fd(entries: [string, string][]) {
  const f = new FormData();
  entries.forEach(([k, v]) => f.append(k, v));
  return f;
}

const baseProfile: [string, string][] = [
  ["display_name", "  Jugadora  "],
  ["languages_visibility", "public"],
  ["availability_visibility", "registered"],
  ["goals_visibility", "private"],
  ["voice_visibility", "registered"],
];

describe("profileSchema", () => {
  it("acepta un perfil vacío (nada obligatorio salvo el nombre)", () => {
    const r = profileSchema.safeParse(profileFromForm(fd(baseProfile)));
    expect(r.success).toBe(true);
    expect(r.data?.display_name).toBe("Jugadora");
    expect(r.data?.voice).toBeNull();
  });

  it("valida idiomas, objetivos y visibilidad contra las listas", () => {
    expect(profileSchema.safeParse(profileFromForm(fd([...baseProfile, ["languages", "xx"]]))).success).toBe(false);
    expect(profileSchema.safeParse(profileFromForm(fd([...baseProfile, ["goals", "ranked"], ["goals", "ranked"]]))).success).toBe(false);
    const bad = baseProfile.map(([k, v]) => (k === "goals_visibility" ? [k, "todos"] : [k, v])) as [string, string][];
    expect(profileSchema.safeParse(profileFromForm(fd(bad))).success).toBe(false);
  });

  it("rechaza nombres cortos o con etiquetas", () => {
    const withName = (n: string) => fd([["display_name", n], ...baseProfile.slice(1)]);
    expect(profileSchema.safeParse(profileFromForm(withName("a"))).success).toBe(false);
    expect(profileSchema.safeParse(profileFromForm(withName("<script>"))).success).toBe(false);
  });
});

describe("gameProfileSchema", () => {
  const base: [string, string][] = [["game_visibility", "registered"]];

  it("lee agentes con estado e ignora los que no se juegan", () => {
    const r = gameProfileSchema.safeParse(
      gameProfileFromForm(fd([...base, [`char:${A}`, "main"], [`char:${B}`, ""], ["flex", "on"]])),
    );
    expect(r.success).toBe(true);
    expect(r.data?.characters).toEqual([{ character_id: A, status: "main" }]);
    expect(r.data?.flex).toBe(true);
    expect(r.data?.rank_id).toBeNull();
  });

  it("el rol principal debe estar entre los roles", () => {
    const r = gameProfileSchema.safeParse(gameProfileFromForm(fd([...base, ["roles", A], ["primary_role", B]])));
    expect(r.success).toBe(false);
    const ok = gameProfileSchema.safeParse(gameProfileFromForm(fd([...base, ["roles", A], ["primary_role", A]])));
    expect(ok.success).toBe(true);
  });

  it("rechaza estados de agente desconocidos e ids no válidos", () => {
    expect(gameProfileSchema.safeParse(gameProfileFromForm(fd([...base, [`char:${A}`, "god"]]))).success).toBe(false);
    expect(gameProfileSchema.safeParse(gameProfileFromForm(fd([...base, ["rank_id", "1; drop"]]))).success).toBe(false);
  });
});

describe("profileCompletion", () => {
  it("cuenta lo que falta", () => {
    const c = profileCompletion({
      languages: ["es"],
      availability: [],
      goals: [],
      voice: null,
      rank_id: A,
      region_id: null,
      roles: 1,
      characters: 0,
    });
    expect(c.percent).toBe(38);
    expect(c.missing).toEqual(["Horarios", "Objetivos", "Comunicación", "Servidor", "Agentes"]);
  });

  it("no cuenta personajes en juegos sin ellos y usa la etiqueta del juego", () => {
    const base = { languages: ["es"], availability: ["night"], goals: ["ranked"], voice: "voice", rank_id: A, region_id: A, roles: 1 };
    expect(profileCompletion({ ...base, characters: null }).percent).toBe(100);
    expect(profileCompletion({ ...base, characters: 0, characterLabel: "Leyendas" }).missing).toEqual(["Leyendas"]);
  });
});
