import type { Metadata } from "next";
import Link from "next/link";
import { LEGAL } from "@/lib/legal";
import { ContactEmail, DraftNotice, Section } from "../legal-draft";

export const metadata: Metadata = { title: "Privacidad", alternates: { canonical: "/privacidad" } };

// Política de privacidad según el art. 13 RGPD (y 14 para los datos que llegan de Discord). Los plazos de conservación
// se cumplen con la purga automática de la migración 20261112020000_retention.sql.
const BASES: [string, string][] = [
  ["Tu cuenta: correo, identificador y, si entras con Discord, su nombre y avatar", "Contrato: prestarte el servicio que pides al registrarte (art. 6.1.b RGPD)."],
  ["Tu perfil y tus datos por juego (rango, roles, personajes, idiomas, horarios…)", "Contrato. Son opcionales y puedes borrarlos cuando quieras."],
  ["Grupos, solicitudes, chat, karma, clips, emblemas, comentarios, misiones y cartas", "Contrato: son las funciones de la web."],
  ["Bloqueos, denuncias (con copia del contenido denunciado) y registro de moderación", "Interés legítimo en mantener la comunidad segura y defendernos de reclamaciones (art. 6.1.f)."],
  ["Registros técnicos de seguridad y límites anti-abuso", "Interés legítimo en la seguridad del servicio (art. 6.1.f)."],
  ["Correo con el enlace para entrar", "Contrato. No enviamos publicidad."],
  ["Atender tus derechos y guardar prueba de la respuesta", "Obligación legal (art. 6.1.c)."],
];

const PLAZOS: [string, string][] = [
  ["Cuenta, perfil, clips, comentarios, karma y cartas", "Mientras exista tu cuenta. Al borrarla se elimina todo en ese momento."],
  ["Mensajes del chat de un grupo", "30 días desde que se cierra el grupo."],
  ["Denuncias archivadas sin medida", "6 meses desde que se resuelven."],
  ["Denuncias con medida y registro de moderación", "12 meses, para detectar reincidencias."],
  ["Denuncias con intervención de las autoridades", "Hasta que termine el procedimiento."],
  ["Solicitudes de derechos y su respuesta", "3 años, como prueba."],
  ["Registros técnicos de los proveedores", "Los plazos de cada proveedor (normalmente días o pocas semanas)."],
];

export default function PrivacyPage() {
  return (
    <article className="mx-auto flex max-w-2xl flex-col gap-6">
      <h1 className="font-display text-3xl font-semibold">Privacidad</h1>
      <DraftNotice />

      <Section title="Quién es el responsable">
        <p>
          Responsable del tratamiento: {LEGAL.owner ? <strong>{LEGAL.owner}</strong> : <strong>pendiente</strong>}, que
          gestiona TeamFinder como proyecto personal, gratuito y sin ánimo de lucro. Contacto para privacidad, denuncias y
          autoridades: <ContactEmail /> (en español o inglés). No hay delegado de protección de datos porque no es obligatorio
          en este caso.
        </p>
      </Section>

      <Section title="Qué datos tratamos y de dónde salen">
        <ul>
          <li>
            <strong>Cuenta:</strong> tu correo (si entras por correo) o, si entras con Discord, el identificador, el nombre y
            el avatar que nos pasa Discord, y el correo de tu cuenta de Discord. Tu correo no se muestra nunca.
          </li>
          <li>
            <strong>Perfil:</strong> lo que rellenas tú (idiomas, horarios, objetivos, comunicación, y por cada juego rango,
            servidor, roles, modos y personajes). El rango lo introduces tú: no está verificado con ningún juego.
          </li>
          <li>
            <strong>Actividad:</strong> grupos, solicitudes, mensajes del chat de grupo, reconocimientos de karma, clips
            (solo el enlace al vídeo), emblemas, comentarios, misiones, cartas, bloqueos y denuncias.
          </li>
          <li>
            <strong>Datos técnicos:</strong> los proveedores registran la dirección IP y el navegador de las peticiones por
            seguridad.
          </li>
        </ul>
        <p>No hay integración con Riot, Valve ni EA, ni leemos estadísticas de partidas. No hay publicidad, analítica ni perfiles automáticos.</p>
      </Section>

      <Section title="Para qué y con qué base legal">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-muted">
              <tr>
                <th scope="col" className="py-2 pr-4 font-medium">Tratamiento</th>
                <th scope="col" className="py-2 font-medium">Base legal</th>
              </tr>
            </thead>
            <tbody>
              {BASES.map(([what, why]) => (
                <tr key={what} className="border-t border-line align-top">
                  <td className="py-2 pr-4">{what}</td>
                  <td className="py-2">{why}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>Para usar la web hace falta una cuenta; lo demás es opcional. No tomamos decisiones automáticas que te afecten.</p>
      </Section>

      <Section title="Quién puede verlos">
        <ul>
          <li>Tu nombre y avatar son siempre visibles para identificarte en tarjetas, grupos y clips.</li>
          <li>Del resto de tu perfil decides tú, campo a campo: todo el mundo, solo usuarios con cuenta o solo tú.</li>
          <li>Los mensajes de una sala solo los ven los miembros de ese grupo.</li>
          <li>Del karma solo se publican el total y los motivos, nunca quién los dio.</li>
          <li>Los clips, emblemas y comentarios los ven los usuarios con cuenta, salvo quienes te hayan bloqueado o hayas bloqueado.</li>
          <li>Las denuncias solo las ven quien denuncia y moderación.</li>
        </ul>
      </Section>

      <Section title="Proveedores (encargados del tratamiento)">
        <ul>
          <li>Supabase: base de datos, autenticación y chat en tiempo real. Datos alojados en la UE (París).</li>
          <li>Vercel: alojamiento de la web y registros de peticiones. Funciones en la UE (París).</li>
          <li>Brevo (Sendinblue SAS, Francia): envío del correo con el enlace para entrar.</li>
        </ul>
        <p>
          Vercel y Supabase son empresas con matriz en EE. UU. y pueden acceder a datos desde fuera de la UE; esas
          transferencias se cubren con el Marco de Privacidad de Datos UE-EE. UU. o con cláusulas contractuales tipo de la
          Comisión Europea. Discord no es proveedor nuestro: es responsable de tu cuenta de Discord según su propia{" "}
          <a href="https://discord.com/privacy" target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">
            política de privacidad<span className="sr-only"> (se abre en otra pestaña)</span>
          </a>
          .
        </p>
      </Section>

      <Section title="Clips de otras webs">
        <p>
          Los reproductores de YouTube, Twitch o Streamable no se cargan hasta que pulsas «Ver clip». Al pulsarlo, esa web
          recibe tu dirección IP y puede usar sus propias cookies, según su política de privacidad.
        </p>
      </Section>

      <Section title="Cookies">
        <p>
          Solo usamos cookies técnicas: la de sesión (para mantenerte conectado de forma segura) y la del juego que eliges
          (<code>tf_game</code>). Son imprescindibles para el servicio que pides, así que no necesitan consentimiento. No hay
          cookies de publicidad ni de analítica.
        </p>
      </Section>

      <Section title="Cuánto tiempo los guardamos">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-muted">
              <tr>
                <th scope="col" className="py-2 pr-4 font-medium">Dato</th>
                <th scope="col" className="py-2 font-medium">Plazo</th>
              </tr>
            </thead>
            <tbody>
              {PLAZOS.map(([what, time]) => (
                <tr key={what} className="border-t border-line align-top">
                  <td className="py-2 pr-4">{what}</td>
                  <td className="py-2">{time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          Puedes borrar tu cuenta y todos tus datos cuando quieras desde{" "}
          <Link href="/ajustes" className="underline underline-offset-4">
            Ajustes
          </Link>
          . De las denuncias que te afecten se conserva solo lo imprescindible durante los plazos anteriores.
        </p>
      </Section>

      <Section title="Tus derechos">
        <p>
          Puedes acceder a tus datos, rectificarlos, borrarlos, oponerte o limitar su tratamiento y pedir su portabilidad.
          Gran parte lo puedes hacer tú: editar el perfil, borrar la cuenta o{" "}
          <Link href="/ajustes" className="underline underline-offset-4">
            descargar tus datos
          </Link>{" "}
          desde Ajustes. Para lo demás, escribe a <ContactEmail />. Es gratis y respondemos en un mes como máximo.
        </p>
        <p>
          Si no estás de acuerdo con la respuesta, puedes reclamar ante la Agencia Española de Protección de Datos en{" "}
          <a href="https://sedeagpd.gob.es" target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">
            sedeagpd.gob.es<span className="sr-only"> (se abre en otra pestaña)</span>
          </a>
          .
        </p>
      </Section>

      <Section title="Edad">
        <p>
          La web es para mayores de 16 años. Si sabemos que una cuenta es de alguien más joven, la eliminaremos con sus
          datos.
        </p>
      </Section>

      <Section title="Seguridad y cambios">
        <p>
          Los datos viajan cifrados, el acceso está limitado por permisos en la base de datos y los datos personales están
          ocultos por defecto. Si hubiera una brecha de seguridad, avisaríamos a la AEPD y, si hay riesgo para ti, también
          a ti. Si cambiamos esta política de forma importante, lo avisaremos en la web.
        </p>
      </Section>
    </article>
  );
}
