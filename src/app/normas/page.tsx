import type { Metadata } from "next";
import { DraftNotice, Section } from "../legal-draft";

export const metadata: Metadata = { title: "Normas de la comunidad", alternates: { canonical: "/normas" } };

export default function RulesPage() {
  return (
    <article className="mx-auto flex max-w-2xl flex-col gap-6">
      <h1 className="font-display text-3xl font-semibold">Normas de la comunidad</h1>
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
          Tras cerrar un grupo, cada miembro puede reconocer una vez a cada compañero durante 7 días, con hasta tres
          motivos. Solo hay reconocimientos positivos: aquí no se puntúa mal a nadie. Se muestran el total y los motivos más
          repetidos. Es reputación
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
          El equipo de moderación revisa las denuncias. Según la gravedad puede avisar a la persona, cerrar grupos o, en
          casos graves o repetidos, eliminar la cuenta. No hay todavía suspensiones temporales automáticas.
        </p>
      </Section>

      <Section title="Edad mínima">
        <p>
          Para usar el servicio debes tener al menos <strong>16 años</strong>. Es una decisión provisional pendiente de
          revisión legal; por ahora no se verifica la edad.
        </p>
      </Section>
    </article>
  );
}
