import type { Metadata } from "next";
import Link from "next/link";
import { APP_NAME } from "@/lib/config";
import { DraftNotice, Section } from "../legal-draft";

export const metadata: Metadata = { title: "Privacidad" };

export default function PrivacyPage() {
  return (
    <article className="mx-auto flex max-w-2xl flex-col gap-6">
      <h1 className="font-display text-3xl font-semibold">Privacidad</h1>
      <DraftNotice />

      <Section title="Responsable">
        <p>Responsable del tratamiento y contacto: <strong>pendiente</strong>.</p>
      </Section>

      <Section title="Qué datos guardamos">
        <ul>
          <li>
            <strong>Cuenta:</strong> tu correo electrónico (si entras por correo) o tu identificador, nombre y avatar de Discord
            (si entras con Discord). El correo no se muestra nunca en tu perfil.
          </li>
          <li>
            <strong>Perfil:</strong> lo que tú rellenas (idiomas, horarios, objetivos, comunicación, rango, servidor, roles, modos
            y agentes). El rango lo introduces tú: no está verificado con Riot.
          </li>
          <li>
            <strong>Actividad:</strong> grupos que creas, solicitudes, mensajes de las salas de grupo, valoraciones de karma,
            bloqueos y denuncias.
          </li>
        </ul>
        <p>No hay integración con Riot ni leemos estadísticas de partidas.</p>
      </Section>

      <Section title="Quién puede verlos">
        <ul>
          <li>Tu nombre y avatar son siempre visibles para identificarte en tarjetas y grupos.</li>
          <li>
            Cada dato de perfil tiene su visibilidad: público, solo usuarios registrados o solo tú. Por defecto, solo usuarios
            registrados. Se cambia en{" "}
            <Link href="/perfil/editar" className="text-accent-soft underline underline-offset-4">
              Editar perfil
            </Link>
            .
          </li>
          <li>Los mensajes de una sala solo los ven los miembros actuales de ese grupo.</li>
          <li>Del karma solo se publican totales y etiquetas; nunca quién votó.</li>
          <li>Las denuncias solo las ven quien denuncia y el equipo de moderación.</li>
        </ul>
      </Section>

      <Section title="Proveedores">
        <ul>
          <li>Supabase: base de datos y autenticación, alojadas en la UE (París).</li>
          <li>Vercel: alojamiento de la web.</li>
          <li>Discord: para entrar con tu cuenta de Discord y para el servidor de la comunidad.</li>
        </ul>
      </Section>

      <Section title="Cookies">
        <p>
          Solo usamos las cookies necesarias para mantener tu sesión iniciada. No usamos cookies de analítica ni de
          publicidad.
        </p>
      </Section>

      <Section title="Conservación y borrado">
        <p>
          Guardamos tus datos mientras tengas cuenta. Puedes borrarla cuando quieras en{" "}
          <Link href="/ajustes" className="text-accent-soft underline underline-offset-4">
            Ajustes
          </Link>
          : se eliminan tu perfil, tus datos de juego, tus grupos, tus mensajes y tus valoraciones. Las denuncias que hayas
          hecho se conservan sin tu identidad para que moderación pueda revisarlas. Plazos de conservación de esas denuncias:{" "}
          <strong>pendiente</strong>.
        </p>
      </Section>

      <Section title="Tus derechos">
        <p>
          Puedes consultar y corregir tus datos desde tu perfil y borrar tu cuenta desde Ajustes. Para el resto de derechos
          (acceso a una copia, oposición, reclamación) el canal de contacto está <strong>pendiente</strong>.
        </p>
      </Section>

      <p className="text-xs text-muted">{APP_NAME} es un nombre provisional. Última revisión del borrador: 4 de noviembre de 2026.</p>
    </article>
  );
}
