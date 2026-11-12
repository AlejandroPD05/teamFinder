import Image from "next/image";

type Member = { id: string; name: string; avatar: string | null };

/**
 * Miembros de un grupo apilados y, a continuación, las plazas libres como huecos. Al pasar por encima de la tarjeta
 * (`group`), los avatares se separan un poco. La lista accesible dice quién está y cuántas plazas quedan.
 */
export function AvatarGroup({ members, slots }: { members: Member[]; slots: number }) {
  const free = Math.max(0, slots - members.length);
  const shown = members.slice(0, 5);
  return (
    <div className="flex items-center">
      <ul aria-label={`Miembros: ${members.map((m) => m.name).join(", ") || "ninguno"}`} className="flex items-center">
        {shown.map((m, i) => (
          <li
            key={m.id}
            title={m.name}
            className={`relative size-8 rounded-full ring-2 ring-panel transition-[margin] duration-200 ease-out ${
              i ? "-ml-2.5 group-hover:-ml-1" : ""
            }`}
            style={{ zIndex: shown.length - i }}
          >
            {m.avatar ? (
              <Image src={m.avatar} alt="" width={32} height={32} className="size-8 rounded-full" />
            ) : (
              <span aria-hidden="true" className="flex size-8 items-center justify-center rounded-full bg-panel-hover text-xs font-semibold">
                {m.name.charAt(0).toUpperCase()}
              </span>
            )}
            <span className="sr-only">{m.name}</span>
          </li>
        ))}
      </ul>
      {Array.from({ length: Math.min(free, 5) }, (_, i) => (
        <span
          key={i}
          aria-hidden="true"
          className="-ml-2.5 size-8 rounded-full border border-dashed border-line-strong bg-bg/60 transition-[margin] duration-200 ease-out group-hover:-ml-1 first:ml-1"
        />
      ))}
      <span className="sr-only">
        {free} {free === 1 ? "plaza libre" : "plazas libres"}
      </span>
    </div>
  );
}
