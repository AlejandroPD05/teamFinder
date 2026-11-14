import { z } from "zod";

/** Código de un enlace de invitación (8 letras minúsculas o números). */
export const inviteCode = z.string().regex(/^[a-z0-9]{8}$/);
