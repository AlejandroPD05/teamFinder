import Link from "next/link";
import { LEGAL } from "@/lib/legal";
import { titled } from "@/lib/i18n/metadata";
import { BindingNotice, ContactEmail, LegalVersion, Section } from "../legal-parts";

export const generateMetadata = titled("privacy", { alternates: { canonical: "/privacidad" } });

// Política de privacidad según el art. 13 RGPD (y 14 para los datos que llegan de Discord). Los plazos de conservación
// se cumplen con la purga automática de la migración 20261112020000_retention.sql.
const BASES: [string, string][] = [
  ["Tu cuenta: correo, identificador y, si entras con Discord, su nombre y avatar", "Contrato: prestarte el servicio que pides al registrarte (art. 6.1.b RGPD)."],
  ["Tu perfil y tus datos por juego (rango, roles, personajes, idiomas, horarios…)", "Contrato. Son opcionales y puedes borrarlos cuando quieras."],
  ["Grupos, solicitudes, chat, mensajes privados, notificaciones, karma, ranking semanal, clips, emblemas, comentarios, misiones y cartas", "Contrato: son las funciones de la web."],
  ["Equipos (nombre, miembros, invitaciones), su chat y sus quedadas (fecha, nota y quién va)", "Contrato: son funciones de la web que usas si quieres."],
  ["«Disponible ahora» (hasta cuándo y en qué modo)", "Contrato. Lo activas tú y caduca solo en 1 a 3 horas."],
  ["Enlace público de un grupo que compartes (resumen del grupo y tu nombre visible)", "Contrato: solo si lo compartes tú."],
  ["Tarjeta pública de tu perfil (nombre visible, avatar, rango, roles y mains de un juego)", "Consentimiento: solo si la activas en tu perfil, y solo si tu perfil de ese juego ya es público; la desactivas cuando quieras (art. 6.1.a)."],
  ["Plantillas de grupo que guardas", "Contrato: solo si las guardas tú."],
  ["Enlace de invitación y quién entró con él (tu código y, si llegaste con el de alguien, quién te invitó)", "Contrato: para que veas a quién has invitado y puedas invitarle a tus equipos."],
  ["Fiabilidad: salidas de grupos antes de que se cierren y respuesta a solicitudes, de los últimos 90 días", "Interés legítimo en que la gente sepa si un compañero suele terminar los grupos (art. 6.1.f). Solo se muestran porcentajes con datos suficientes, a usuarios con sesión; no es una sanción ni afecta a lo que puedes hacer."],
  ["Sugerencias que envías al buzón (tipo, texto y la página desde la que escribes)", "Interés legítimo en mejorar la web (art. 6.1.f). Si hay aviso en Discord, va solo el texto, sin tu nombre."],
  ["Notificaciones push (la dirección de suscripción de tu navegador)", "Consentimiento: solo si las activas en un dispositivo; se desactivan en Ajustes o en el navegador (art. 6.1.a)."],
  ["Partidas que apuntas a mano (fecha, modo, mapa, personaje, resultado y tus números)", "Contrato. Son opcionales; tú eliges quién las ve (por defecto, solo tú)."],
  ["Enlaces a tus redes (Twitch, YouTube, X)", "Contrato. Son opcionales; tú eliges quién los ve."],
  ["Resumen de avisos por correo", "Consentimiento: solo si lo activas en Ajustes, y lo puedes desactivar cuando quieras (art. 6.1.a)."],
  ["Fanart que envías (imagen, título, nombre artístico y la aceptación del permiso)", "Consentimiento: el permiso que das al enviarlo, que puedes retirar cuando quieras (art. 6.1.a)."],
  ["Bloqueos, denuncias (con copia del contenido denunciado), restricciones temporales y registro de moderación", "Interés legítimo en mantener la comunidad segura y defendernos de reclamaciones (art. 6.1.f)."],
  ["Registros técnicos de seguridad y límites anti-abuso", "Interés legítimo en la seguridad del servicio (art. 6.1.f)."],
  ["Correo con el enlace para entrar", "Contrato. No enviamos publicidad."],
  ["Atender tus derechos y guardar prueba de la respuesta", "Obligación legal (art. 6.1.c)."],
];

const PLAZOS: [string, string][] = [
  ["Cuenta, perfil, clips, comentarios, karma y cartas", "Mientras exista tu cuenta. Al borrarla se elimina todo en ese momento."],
  ["Mensajes del chat de un grupo", "30 días desde que se cierra el grupo."],
  ["Mensajes privados", "Mientras existan las dos cuentas. Si una se borra, se borra la conversación entera."],
  ["Notificaciones", "60 días."],
  ["Partidas apuntadas a mano", "Hasta que las borres o borres tu cuenta."],
  ["Equipos y mensajes de equipo", "Mientras exista el equipo. Si su dueño lo borra o borra su cuenta, se borra con todo su chat."],
  ["Registro de correos de avisos enviados (fecha y número de avisos)", "30 días."],
  ["Quedadas de equipo y sus respuestas", "Hasta 30 días después de la fecha de la quedada."],
  ["Suscripciones push", "Hasta que las desactives, borres tu cuenta o el navegador las dé de baja."],
  ["Salidas de grupos (para la fiabilidad)", "90 días."],
  ["Sugerencias del buzón", "12 meses. Si borras tu cuenta, se quedan sin autor."],
  ["Plantillas de grupo y enlace de invitación", "Hasta que las borres o borres tu cuenta."],
  ["Puestos del ranking semanal (Top 10)", "Mientras exista tu cuenta: son insignias permanentes."],
  ["Fanart", "Hasta que lo retires o borres tu cuenta; entonces se borra también la imagen."],
  ["Restricciones temporales", "12 meses desde que terminan, para detectar reincidencias."],
  ["Denuncias archivadas sin medida", "6 meses desde que se resuelven."],
  ["Denuncias con medida y registro de moderación", "12 meses, para detectar reincidencias."],
  ["Denuncias con intervención de las autoridades", "Hasta que termine el procedimiento."],
  ["Solicitudes de derechos y su respuesta", "3 años, como prueba."],
  ["Registros técnicos de los proveedores", "Los plazos de cada proveedor (normalmente días o pocas semanas)."],
];

export default function PrivacyPage() {
  return (
    // Texto legal solo en español (la versión vinculante); en inglés se añade un aviso con un resumen.
    <article lang="es" className="mx-auto flex max-w-2xl flex-col gap-6">
      <BindingNotice page="privacy" />
      <h1 className="font-display text-3xl font-semibold">Privacidad</h1>
      <LegalVersion />

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
            <strong>Actividad:</strong> grupos, solicitudes, mensajes del chat de grupo, mensajes privados, equipos y su
            chat, partidas que apuntas a mano, reconocimientos de karma, clips (solo el enlace al vídeo), emblemas,
            comentarios, misiones, cartas, bloqueos y denuncias.
          </li>
          <li>
            <strong>Datos técnicos:</strong> los proveedores registran la dirección IP y el navegador de las peticiones por
            seguridad.
          </li>
        </ul>
        <p>
          No hay integración con Riot, Valve ni EA, ni leemos estadísticas de partidas: las partidas que ves son las que cada
          cual apunta a mano. No hay publicidad, analítica ni perfiles automáticos.
        </p>
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
          <li>Los mensajes de una sala solo los ven los miembros de ese grupo, y los de un equipo, solo sus miembros.</li>
          <li>El nombre, la descripción y los miembros de un equipo los ve cualquiera con cuenta.</li>
          <li>
            Si compartes un grupo, su enlace muestra a cualquiera (también sin cuenta) el modo, las plazas, los roles que buscáis,
            el rango, el servidor, la nota y tu nombre visible. Nada más.
          </li>
          <li>«Disponible ahora» lo ven quienes pueden ver tu perfil de ese juego.</li>
          <li>Del karma solo se publican el total y los motivos, nunca quién los dio.</li>
          <li>Los clips, emblemas y comentarios los ven los usuarios con cuenta, salvo quienes te hayan bloqueado o hayas bloqueado.</li>
          <li>Las denuncias solo las ven quien denuncia y moderación.</li>
        </ul>
      </Section>

      <Section title="Proveedores (encargados del tratamiento)">
        <ul>
          <li>Supabase: base de datos, autenticación, chat en tiempo real y almacenamiento de las imágenes de fanart. Datos alojados en la UE (París).</li>
          <li>Vercel: alojamiento de la web y registros de peticiones. Funciones en la UE (París).</li>
          <li>Brevo (Sendinblue SAS, Francia): envío del correo con el enlace para entrar y, si lo activas, del resumen de avisos.</li>
          <li>
            Si activas las notificaciones push, el aviso viaja cifrado por el servicio de push de tu navegador (Google, Mozilla,
            Apple o Microsoft, según el que uses), que no puede leer su contenido.
          </li>
        </ul>
        <p>
          Vercel y Supabase son empresas con matriz en EE. UU. y pueden acceder a datos desde fuera de la UE; esas
          transferencias se cubren con el Marco de Privacidad de Datos UE-EE. UU. o con cláusulas contractuales tipo de la
          Comisión Europea. Discord no es proveedor nuestro: es responsable de tu cuenta de Discord según su propia{" "}
          <a href="https://discord.com/privacy" target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">
            política de privacidad<span className="sr-only"> (se abre en otra pestaña)</span>
          </a>
          . Si un clip tuyo gana una semana, publicamos en el Discord de la comunidad su título, tu nombre visible y el enlace
          (interés legítimo en dar a conocer a los ganadores, art. 6.1.f); si no quieres que aparezca, escríbenos y lo
          retiramos.
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
