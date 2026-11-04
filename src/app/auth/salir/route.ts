import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Recuperación: sesión válida cuyo perfil ya no existe (cuenta borrada). Cierra la sesión y vuelve al login.
export async function GET() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return new NextResponse(null, { status: 303, headers: { Location: "/entrar?error=session" } });
}
