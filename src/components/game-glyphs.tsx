import type { SVGProps } from "react";

// Iconos propios de cada juego, dibujados para esta web (no son logotipos ni arte oficial): un objeto reconocible
// de cada juego. Mismo lenguaje que lucide (rejilla de 24, trazo redondeado) para convivir con el resto de iconos.

type GlyphProps = SVGProps<SVGSVGElement> & { strokeWidth?: number };

function Svg({ children, strokeWidth = 1.75, ...props }: GlyphProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {children}
    </svg>
  );
}

/** VALORANT: el dispositivo que se planta (spike), como un huso facetado con su núcleo. */
export function SpikeGlyph(props: GlyphProps) {
  return (
    <Svg {...props}>
      <path d="M12 2 16.5 7.5v9L12 22l-4.5-5.5v-9Z" />
      <path d="M7.5 9.5h9M7.5 14.5h9" />
      <path d="M12 9.5 13.5 12 12 14.5 10.5 12Z" fill="currentColor" stroke="none" />
      <path d="M12 2v3M12 19v3" />
    </Svg>
  );
}

/** CS2: un explosivo C4 genérico: tres cargas atadas, el detonador con su pantalla y el cable. */
export function C4Glyph(props: GlyphProps) {
  return (
    <Svg {...props}>
      <rect x="2" y="9" width="20" height="11" rx="1.5" />
      <path d="M8.5 9v11M15.5 9v11" />
      <rect x="9.75" y="11" width="4.5" height="3" rx="0.4" fill="currentColor" stroke="none" />
      <path d="M10.5 16.5h3" />
      <path d="M2 14.5h6.5M15.5 14.5H22" strokeDasharray="1.5 1.5" />
      <path d="M5 9c0-4 7-5 7-1.5S18 6 19 9" />
    </Svg>
  );
}

/** Apex Legends: emblema con cuernos que evoca el rango más alto (dibujo propio, no la insignia oficial). */
export function ApexGlyph(props: GlyphProps) {
  return (
    <Svg {...props}>
      <path d="M5 2.5c0 4 1.5 6.5 4 6.5M19 2.5c0 4-1.5 6.5-4 6.5" />
      <path d="M7 9h10l-1 7.5-4 5-4-5Z" />
      <path d="m9.3 12.4 1.9 1.1M14.7 12.4l-1.9 1.1" />
      <path d="M12 16.5v1.5" />
    </Svg>
  );
}

export const GAME_GLYPHS: Record<string, (props: GlyphProps) => React.JSX.Element> = {
  valorant: SpikeGlyph,
  cs2: C4Glyph,
  apex: ApexGlyph,
};
