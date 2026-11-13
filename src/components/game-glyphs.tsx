import type { SVGProps } from "react";

// Iconos de cada juego, rellenos y con volumen (tonos de un mismo color con distinta opacidad; los huecos se recortan
// con `evenodd` para que se vea el fondo). Dibujados a mano para esta web a partir de referencias:
// - VALORANT: la spike, dibujo fiel permitido por la política «Legal Jibber Jabber» de Riot (no es un logotipo).
// - Apex Legends: el cráneo con cuernos del rango Depredador, contenido de fans sin ánimo de lucro (política de EA).
// - CS2: un C4 genérico (Valve no permite reutilizar su arte; no copia su modelo).

type GlyphProps = SVGProps<SVGSVGElement>;

function Svg({ children, ...props }: GlyphProps & { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 48 48" fill="currentColor" {...props}>
      {children}
    </svg>
  );
}

/** VALORANT: la spike — tapa facetada con asa, columna con núcleo luminoso, pistones laterales y patas en punta. */
export function SpikeGlyph(props: GlyphProps) {
  return (
    <Svg {...props}>
      {/* Asa */}
      <path d="M20 3.5h8a1 1 0 0 1 1 1V8h-2.5V6h-5v2H19V4.5a1 1 0 0 1 1-1Z" />
      {/* Tapa ancha: cara superior clara y canto inferior más oscuro */}
      <path d="M9 12.5 18.5 7.5h11l9.5 5Z" />
      <path d="M9 12.5h30l-4.75 4.5h-20.5Z" opacity="0.6" />
      {/* Columna con paneles laterales, parte baja facetada y núcleo */}
      <path d="M16 17h16v18H16Z" opacity="0.35" />
      <path d="M16 17h4.5v18H16ZM27.5 17H32v18h-4.5Z" opacity="0.75" />
      <path d="m20.5 28.5 3.5-2.25 3.5 2.25V35h-7Z" opacity="0.55" />
      <path d="M22.6 19.5h2.8v5.25h-2.8Z" />
      {/* Pistones */}
      <path d="M7.75 20.5h4.75V24H7.75ZM35.5 20.5h4.75V24H35.5Z" />
      <path d="M9.1 24h2v11.5h-2ZM36.9 24h2v11.5h-2ZM12.5 21.5H16V23h-3.5ZM32 21.5h3.5V23H32Z" opacity="0.7" />
      {/* Base y patas */}
      <path d="M14 35h20l-2 3.5H16Z" opacity="0.85" />
      <path d="m6.5 35.5 7 .5 1.5 3-5 2-1.5 4.5-1-4.5ZM41.5 35.5l-7 .5-1.5 3 5 2 1.5 4.5 1-4.5Z" />
    </Svg>
  );
}

/** CS2: un C4 genérico — tres cargas atadas con cinta, el detonador con pantalla y teclado, y los cables. */
export function C4Glyph(props: GlyphProps) {
  return (
    <Svg {...props}>
      {/* Cargas (los huecos entre ellas hacen de surco) */}
      <rect x="4" y="17" width="40" height="7" rx="2" opacity="0.5" />
      <rect x="4" y="25" width="40" height="7" rx="2" opacity="0.5" />
      <rect x="4" y="33" width="40" height="7" rx="2" opacity="0.5" />
      {/* Cinta */}
      <path d="M9.5 16h3.5v25H9.5ZM35 16h3.5v25H35Z" opacity="0.85" />
      {/* Detonador con la pantalla y nueve teclas recortadas */}
      <path
        fillRule="evenodd"
        d="M16 12.5h16a1.5 1.5 0 0 1 1.5 1.5v20a1.5 1.5 0 0 1-1.5 1.5H16a1.5 1.5 0 0 1-1.5-1.5V14a1.5 1.5 0 0 1 1.5-1.5ZM17.5 15v5.5h13V15ZM17.75 23v2.25h2.75V23Zm4.75 0v2.25h3V23Zm5 0v2.25h2.75V23Zm-9.75 4v2.25h2.75V27Zm4.75 0v2.25h3V27Zm5 0v2.25h2.75V27Zm-9.75 4v2.25h2.75V31Zm4.75 0v2.25h3V31Zm5 0v2.25h2.75V31Z"
      />
      {/* Cifras de la pantalla */}
      <path d="M19 16.75h2v2h-2Zm3 0h2v2h-2Zm3 0h2v2h-2Z" opacity="0.8" />
      {/* Cables */}
      <path
        d="M19 12.5c0-5-9.5-4.5-9.5 3.5M29 12.5c0-6 9.5-5 9.5 3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        opacity="0.9"
      />
    </Svg>
  );
}

/** Apex Legends: cráneo de carnero con cuernos enroscados, cresta y colmillos (rango Depredador). */
export function ApexGlyph(props: GlyphProps) {
  return (
    <Svg {...props}>
      {/* Cuernos */}
      <path
        d="M19.5 15C15.5 5.5 5.5 5.5 5 14c-.4 6.5 5 10.5 9 7.5M28.5 15c4-9.5 14-9.5 14.5-1 .4 6.5-5 10.5-9 7.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="4.25"
        strokeLinecap="round"
      />
      {/* Estrías de los cuernos */}
      <path
        d="M9 9.5l2.5 2.5M6.5 15.5h3.25M39 9.5 36.5 12M41.5 15.5h-3.25"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        opacity="0.45"
      />
      {/* Cresta */}
      <path d="m22.25 14 1.75-6 1.75 6Z" />
      {/* Cráneo con ojos, nariz y boca recortados */}
      <path
        fillRule="evenodd"
        d="M16.5 14h15l2.25 8.5-3.75 8.25-2.5 6.75L24 41l-3.5-3.5-2.5-6.75-3.75-8.25ZM18.5 21.25l4.25 2.1-1 2.4-3.6-1.6Zm11 0-4.25 2.1 1 2.4 3.6-1.6ZM22.9 28.25h.85v2.75h-.85Zm1.35 0h.85v2.75h-.85ZM20.75 32.5h6.5L26 35.5h-4Z"
      />
      {/* Colmillos */}
      <path d="m21.5 32.5 1 2.75.75-2.75Zm5 0-1 2.75-.75-2.75Z" opacity="0.9" />
    </Svg>
  );
}

export const GAME_GLYPHS: Record<string, (props: GlyphProps) => React.JSX.Element> = {
  valorant: SpikeGlyph,
  cs2: C4Glyph,
  apex: ApexGlyph,
};
