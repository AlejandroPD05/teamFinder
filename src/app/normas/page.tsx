import type { Metadata } from "next";
import Link from "next/link";
import { ContactEmail, LegalVersion, Section } from "../legal-parts";

export const metadata: Metadata = { title: "Normas de la comunidad", alternates: { canonical: "/normas" } };

// Normas basadas en las de los editores (Riot, EA, Valve) y en las de plataformas parecidas (Discord, Twitch, FACEIT,
// Reddit), con el procedimiento de avisos y sanciones del Reglamento de Servicios Digitales (arts. 14, 16 y 17).
// Solo prometen lo que la web hace hoy (restricciones temporales: migración 20261113000000).
export default function RulesPage() {
  return (
    <article className="mx-auto flex max-w-2xl flex-col gap-6">
      <h1 className="font-display text-3xl font-semibold">Normas de la comunidad</h1>
      <LegalVersion />
      <p className="text-sm text-muted">
        TeamFinder es una web de fans, gratuita y sin relación con Riot Games, Valve ni Electronic Arts. Al usarla aceptas
        estas normas. Además de ellas, siguen vigentes las condiciones de cada juego.
      </p>

      <Section title="Lo básico">
        <ul>
          <li>Respeta a todo el mundo, ganes o pierdas. Critica la jugada, nunca a la persona.</li>
          <li>Nada de acoso, insultos personales, amenazas ni mensajes repetidos que la otra persona no quiere.</li>
          <li>Nada de odio ni discriminación por origen, género, orientación, religión, discapacidad u otros rasgos.</li>
          <li>Nada de apoyo ni difusión de extremismo violento.</li>
        </ul>
      </Section>

      <Section title="Seguridad, contenido sexual y menores">
        <ul>
          <li>Prohibido el contenido sexual o con desnudos en perfiles, salas, clips y comentarios.</li>
          <li>
            Tolerancia cero con cualquier sexualización de menores: se elimina la cuenta, se guardan las pruebas y se avisa
            a las autoridades.
          </li>
          <li>No presiones a nadie para hablar en privado ni le pidas fotos o datos personales.</li>
          <li>Nada de contenido que promueva autolesiones o violencia gráfica.</li>
        </ul>
      </Section>

      <Section title="Privacidad de los demás">
        <ul>
          <li>No publiques datos de otras personas: nombre real, dirección, teléfono, centro de estudios, fotos o redes privadas.</li>
          <li>No publiques el ID de juego, Discord o Steam de alguien para señalarle o para que otros le acosen.</li>
          <li>Nunca pidas ni compartas contraseñas ni códigos de acceso. Nadie de TeamFinder te los pedirá.</li>
        </ul>
      </Section>

      <Section title="Identidad y cuentas">
        <ul>
          <li>
            No te hagas pasar por otra persona, por un jugador o equipo profesional, por Riot, Valve o EA, ni por el equipo
            de moderación.
          </li>
          <li>Una persona, una cuenta. No crees cuentas para saltarte una sanción o un bloqueo.</li>
        </ul>
      </Section>

      <Section title="Juego limpio">
        <ul>
          <li>No ofrezcas, pidas ni anuncies boosting, jugar en cuentas ajenas, smurfing ni derankear.</li>
          <li>No compartas, vendas, compres ni alquiles cuentas, y no lo anuncies.</li>
          <li>No vendas, enseñes ni promociones trampas, scripts, macros o exploits, ni busques grupo con tramposos.</li>
          <li>Nada de amaños ni de pactar resultados.</li>
          <li>Indica tu rango real. Aquí lo introduce cada jugador y no está verificado con el juego.</li>
        </ul>
      </Section>

      <Section title="Spam, estafas y dinero">
        <ul>
          <li>Nada de spam, cadenas, publicidad ni enlaces de afiliado o de referidos.</li>
          <li>Nada de phishing, malware ni enlaces acortados que lleven a otra cosa.</li>
          <li>Nada de enlaces ni códigos de apuestas, casinos o juego con skins.</li>
          <li>No vendas nada aquí: ni objetos, ni skins, ni servicios.</li>
        </ul>
      </Section>

      <Section title="Grupos y chat">
        <ul>
          <li>Cumple lo que publicas en tu grupo o tu perfil: idioma, horario, objetivo y si usas micro.</li>
          <li>Si te vas de un grupo, avisa. No entres y salgas de grupos para fastidiar.</li>
          <li>En la sala, sin gritos ni flood. Quien crea el grupo puede cerrarlo.</li>
        </ul>
      </Section>

      <Section title="Clips">
        <ul>
          <li>Publica solo clips tuyos o de otras personas con su permiso.</li>
          <li>
            No publiques clips que muestren datos personales de otros (nombres reales, caras, voces o chats privados sin
            permiso) ni que sirvan para humillar o señalar a un jugador.
          </li>
          <li>No publiques clips de trampas; denúncialas en los canales oficiales del juego.</li>
          <li>Nada de contenido sexual, de odio ni con música u otro material que no puedas usar.</li>
          <li>
            Los vídeos se quedan en YouTube, Twitch o Streamable y se rigen también por sus condiciones. Si se borran allí,
            dejan de verse aquí.
          </li>
          <li>Da emblemas y comenta de buena fe. No pidas emblemas ni pactes intercambiarlos.</li>
          <li>Si tu clip gana una semana, lo anunciamos en el Discord de la comunidad con su título, tu nombre visible y el enlace.</li>
        </ul>
      </Section>

      <Section title="Karma, ranking, misiones y cartas">
        <ul>
          <li>El karma solo admite reconocimientos positivos. No lo pidas, no lo cambies por nada y no uses cuentas falsas.</li>
          <li>Las cartas se consiguen solo con misiones. No se compran, no se venden ni se intercambian, tampoco fuera de la web.</li>
          <li>Hacer trampas en las misiones (cuentas falsas, grupos que no existen) supone perder las recompensas.</li>
          <li>
            El ranking semanal premia jugar grupos hasta el final y ser buen compañero. Pactar reconocimientos, crear grupos
            falsos o usar varias cuentas para subir supone perder los puestos y las insignias.
          </li>
          <li>
            Puedes enviar fanart para que sea una carta: solo obras tuyas, sin arte oficial retocado ni obras de otras personas.
            Puedes retirar tu permiso cuando quieras.
          </li>
        </ul>
      </Section>

      <Section title="Equipos y partidas">
        <ul>
          <li>
            El nombre y la descripción de un equipo siguen las mismas normas que tu nombre: sin insultos, odio, contenido
            sexual ni suplantar a equipos o clubes reales.
          </li>
          <li>El dueño del equipo responde de a quién invita y puede sacar a cualquiera. El chat del equipo se modera igual que el de los grupos.</li>
          <li>
            Las partidas que apuntas a mano son tu registro personal: apunta solo las tuyas y como fueron. No cuentan para el
            ranking ni para ningún rating, y no son datos oficiales del juego.
          </li>
        </ul>
      </Section>

      <Section title="Mensajes privados">
        <ul>
          <li>Escribe solo a quien quiera hablar contigo. Si no responde o te bloquea, déjalo estar.</li>
          <li>Nada de spam, publicidad, enlaces engañosos ni pedir datos personales o contraseñas.</li>
          <li>
            Puedes cerrar tus mensajes privados en tu perfil y denunciar cualquier mensaje que recibas. La denuncia incluye una
            copia del mensaje para que moderación pueda revisarlo.
          </li>
        </ul>
      </Section>

      <Section title="Denuncias">
        <ul>
          <li>Con cuenta, denuncia desde el perfil, el mensaje, el clip o el comentario. No sabrán quién ha denunciado.</li>
          <li>
            Sin cuenta, o para avisar de contenido ilegal o de un clip tuyo publicado sin permiso, escribe a <ContactEmail />{" "}
            con el enlace exacto, el motivo, tu nombre y tu correo, y una declaración de que lo que cuentas es cierto. Te
            responderemos con lo que se haya decidido.
          </li>
          <li>Las denuncias falsas o de represalia también se sancionan. No hagas campañas contra nadie.</li>
          <li>Si alguien corre peligro, avisa a emergencias (112). Si vemos una amenaza para la vida o la seguridad, la comunicaremos a las autoridades.</li>
        </ul>
      </Section>

      <Section title="Qué hace moderación">
        <p>Hoy modera una sola persona, que revisa cada denuncia y tiene en cuenta la gravedad y el historial. Según el caso:</p>
        <ul>
          <li>Archivar la denuncia si no hay infracción.</li>
          <li>Aviso y retirada del contenido: ocultar el clip o el comentario, o cerrar el grupo.</li>
          <li>
            Restricción temporal de 1 a 30 días: puedes seguir viendo la web, pero no crear grupos, pedir unirte, escribir en
            salas ni en privado, publicar clips o fanart, comentar ni dar emblemas. Te llega una notificación con la fecha de fin
            y el motivo.
          </li>
          <li>Eliminación de la cuenta en casos graves o si se repite.</li>
        </ul>
        <p>
          Eliminación directa, sin aviso previo, por sexualizar a menores, amenazas creíbles, publicar datos de otros,
          estafas o malware, vender cuentas, trampas o boosting, o crear cuentas para saltarse una sanción.
        </p>
        <p>
          Cuando apliquemos una medida te diremos cuál es, por qué hechos, qué norma has incumplido y cómo recurrirla, si
          tenemos cómo contactarte.
        </p>
      </Section>

      <Section title="Recurrir una decisión">
        <ul>
          <li>Tienes 6 meses para recurrir. Escribe a <ContactEmail /> desde el correo de tu cuenta, indicando la medida y por qué no estás de acuerdo.</li>
          <li>Te confirmaremos que lo hemos recibido y responderemos de forma motivada en un plazo razonable.</li>
          <li>Si la revisión te da la razón, se deshace la medida y se borra del historial.</li>
        </ul>
      </Section>

      <Section title="Edad">
        <p>
          Necesitas tener al menos <strong>16 años</strong>. Al entrar declaras que los tienes; no lo verificamos.
        </p>
      </Section>

      <Section title="Cambios">
        <p>
          Si cambiamos estas normas de forma importante, lo avisaremos en la web antes de aplicarlas. Consulta también la{" "}
          <Link href="/privacidad" className="underline underline-offset-4">
            política de privacidad
          </Link>
          .
        </p>
      </Section>
    </article>
  );
}
