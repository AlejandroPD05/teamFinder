import type { Metadata } from "next";
import { DraftNotice, Section } from "../legal-draft";

export const metadata: Metadata = { title: "Normas de la comunidad" };

export default function RulesPage() {
  return (
    <article className="mx-auto flex max-w-2xl flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Normas de la comunidad</h1>
      <DraftNotice />

      <Section title="Lo básico">
        <ul>
          <li>Trata a los demás con respeto, ganes o pierdas.</li>
          <li>Nada de acoso, insultos, amenazas ni discursos de odio.</li>
          <li>Nada de contenido sexual, y menos aún sin consentimiento.</li>
          <li>No te hagas pasar por otra persona ni por un jugador profesional.</li>
          <li>No compartas datos personales de otros (nombre real, dirección, teléfono…).</li>
          <li>Nada de spam, publicidad ni enlaces sospechosos.</li>
          <li>No promociones trampas, boosting, smurfing ni compraventa de cuentas.</li>
        </ul>
      </Section>

      <Section title="Rango y datos">
        <p>
          El rango lo introduce cada jugador y se muestra como «introducido manualmente». Pon el tuyo real: mentir sobre tu
          rango arruina las partidas de los demás.
        </p>
      </Section>

      <Section title="Karma">
        <p>
          Tras cerrar un grupo, cada miembro puede valorar una vez a cada compañero durante 7 días, con una valoración
          positiva o negativa y hasta tres etiquetas. Se muestran los totales y las etiquetas más repetidas. Es reputación
          social: no es una sanción ni un ranking oficial. No pidas ni cambies valoraciones a cambio de nada.
        </p>
      </Section>

      <Section title="Bloquear y denunciar">
        <p>
          Puedes bloquear a cualquier jugador desde su perfil: dejaréis de veros en búsquedas y grupos, y en una sala
          compartida dejarás de ver sus mensajes. Puedes denunciar perfiles y mensajes concretos; la persona denunciada no
          sabe quién la denunció.
        </p>
        <p>
          El equipo de moderación revisa las denuncias. Las medidas contra cuentas (avisos, suspensiones) y la edad mínima
          para usar el servicio están <strong>pendientes</strong> de definir.
        </p>
      </Section>
    </article>
  );
}
