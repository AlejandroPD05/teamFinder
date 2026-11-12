"""Genera las cartas originales de CS2 (estilo pegatina sobre papel pintado). Arte propio: nada de Valve ni de terceros.

Uso: python tools/cs2-stickers.py  ->  public/cards/cs2/<slug>.svg (300x400).
"""
import pathlib

OUT = pathlib.Path(__file__).resolve().parent.parent / "public" / "cards" / "cs2"
INK = "#0b0c12"

# slug, nombre, color de la pegatina, color del papel pintado, dibujo (SVG centrado en 0,0, ~ -60..60)
STICKERS = [
    ("ace", "Ace", "#f5c451", "#2a2410",
     '<path d="M0,-58 C22,-30 52,-14 52,12 C52,32 34,42 18,38 C10,36 4,32 0,26 C-4,32 -10,36 -18,38 C-34,42 -52,32 -52,12 C-52,-14 -22,-30 0,-58 Z" fill="INK"/>'
     '<path d="M0,22 L-12,56 L12,56 Z" fill="INK"/>'),
    ("clutch", "Clutch", "#f25c54", "#2b1414",
     '<path d="M-38,-52 H38 M-38,52 H38" stroke="INK" stroke-width="10" stroke-linecap="round"/>'
     '<path d="M-30,-52 C-30,-10 30,10 30,52 M30,-52 C30,-10 -30,10 -30,52" stroke="INK" stroke-width="9" fill="none" stroke-linecap="round"/>'
     '<path d="M-14,40 H14 L0,22 Z" fill="INK"/>'),
    ("eco", "Ronda eco", "#7dd3a0", "#12261b",
     '<circle r="50" fill="none" stroke="INK" stroke-width="10"/>'
     '<path d="M14,-22 C4,-30 -20,-28 -20,-12 C-20,6 18,-2 18,16 C18,32 -8,34 -18,24 M0,-38 V38" stroke="INK" stroke-width="9" fill="none" stroke-linecap="round"/>'),
    ("entry", "Entry", "#60a5fa", "#111f33",
     '<rect x="-46" y="-56" width="56" height="112" rx="6" fill="none" stroke="INK" stroke-width="10"/>'
     '<path d="M-4,0 H52 M32,-20 L52,0 L32,20" stroke="INK" stroke-width="10" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'
     '<circle cx="-14" cy="4" r="5" fill="INK"/>'),
    ("francotirador", "Francotirador", "#b794f6", "#1f1630",
     '<circle r="50" fill="none" stroke="INK" stroke-width="9"/>'
     '<path d="M0,-60 V-18 M0,18 V60 M-60,0 H-18 M18,0 H60" stroke="INK" stroke-width="9" stroke-linecap="round"/>'
     '<circle r="6" fill="#f25c54"/>'),
    ("flash", "Flash", "#fde68a", "#2b2812",
     '<circle r="22" fill="INK"/>'
     '<path d="M0,-60 V-34 M0,34 V60 M-60,0 H-34 M34,0 H60 M-42,-42 L-25,-25 M25,25 L42,42 M42,-42 L25,-25 M-25,25 L-42,42" stroke="INK" stroke-width="9" stroke-linecap="round"/>'),
    ("humo", "Humo", "#cbd5e1", "#1b1f27",
     '<path d="M-48,22 C-66,22 -66,-6 -46,-8 C-48,-34 -16,-44 -4,-24 C4,-48 44,-44 40,-14 C62,-16 66,22 44,22 Z" fill="INK"/>'
     '<path d="M-30,40 H30 M-16,56 H16" stroke="INK" stroke-width="8" stroke-linecap="round"/>'),
    ("molotov", "Molotov", "#fb923c", "#2b1a0e",
     '<path d="M-20,-14 H20 V48 C20,56 14,60 8,60 H-8 C-14,60 -20,56 -20,48 Z" fill="INK"/>'
     '<rect x="-8" y="-34" width="16" height="22" fill="INK"/>'
     '<path d="M0,-38 C-14,-48 -6,-60 0,-66 C2,-56 16,-52 8,-40 C6,-36 2,-36 0,-38 Z" fill="#f25c54"/>'),
    ("kit-desactivacion", "Kit de desactivación", "#5eead4", "#0f2624",
     '<path d="M-40,-40 L28,28 M40,-40 L-28,28" stroke="INK" stroke-width="10" stroke-linecap="round"/>'
     '<circle cx="-36" cy="40" r="16" fill="none" stroke="INK" stroke-width="9"/>'
     '<circle cx="36" cy="40" r="16" fill="none" stroke="INK" stroke-width="9"/>'
     '<circle r="7" fill="INK"/>'),
    ("bomba", "Bomba plantada", "#f87171", "#2b1212",
     '<rect x="-50" y="-26" width="100" height="62" rx="8" fill="INK"/>'
     '<rect x="-38" y="-14" width="34" height="18" rx="3" fill="#7dd3a0"/>'
     '<g fill="#cbd5e1"><rect x="8" y="-14" width="10" height="10" rx="2"/><rect x="24" y="-14" width="10" height="10" rx="2"/><rect x="8" y="2" width="10" height="10" rx="2"/><rect x="24" y="2" width="10" height="10" rx="2"/></g>'
     '<path d="M30,-26 C30,-48 46,-54 54,-58" stroke="INK" stroke-width="7" fill="none" stroke-linecap="round"/>'),
    ("headshot", "Headshot", "#f472b6", "#2b1222",
     '<circle cy="-10" r="34" fill="INK"/>'
     '<path d="M-52,58 C-52,24 52,24 52,58" fill="INK"/>'
     '<circle cy="-10" r="16" fill="none" stroke="#f472b6" stroke-width="5"/>'
     '<path d="M0,-34 V-26 M0,6 V14 M-24,-10 H-16 M16,-10 H24" stroke="#f472b6" stroke-width="5" stroke-linecap="round"/>'),
    ("rush-b", "Rush B", "#a3e635", "#1c260c",
     '<path d="M-58,-30 L-34,0 L-58,30 M-36,-30 L-12,0 L-36,30" stroke="INK" stroke-width="10" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'
     '<path d="M8,-40 V40 H30 C46,40 52,30 52,20 C52,10 46,2 36,0 C44,-2 48,-10 48,-18 C48,-30 40,-40 26,-40 Z M20,-28 V-6 H26 C32,-6 36,-10 36,-17 C36,-24 32,-28 26,-28 Z M20,6 V28 H30 C36,28 40,24 40,17 C40,10 36,6 30,6 Z" fill="INK" fill-rule="evenodd"/>'),
]


def wallpaper(paper: str, color: str) -> str:
    """Papel pintado: rombos pequeños repetidos con poca opacidad."""
    tiles = []
    for row in range(0, 9):
        for col in range(0, 7):
            x = col * 48 + (24 if row % 2 else 0)
            y = row * 48
            tiles.append(f'<path d="M{x},{y - 6} L{x + 6},{y} L{x},{y + 6} L{x - 6},{y} Z"/>')
    return f'<rect width="300" height="400" fill="{paper}"/><g fill="{color}" opacity="0.14">{"".join(tiles)}</g>'


def sticker(color: str, art: str) -> str:
    """Pegatina troquelada: borde blanco grueso, sombra y el dibujo encima."""
    art = art.replace("INK", INK)
    return (
        '<g transform="translate(150 178)">'
        '<circle r="92" fill="#000" opacity="0.35" transform="translate(5 8)"/>'
        '<circle r="92" fill="#f8fafc"/>'
        f'<circle r="80" fill="{color}"/>'
        f'<g transform="rotate(-6)">{art}</g>'
        "</g>"
    )


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for slug, _name, color, paper, art in STICKERS:
        svg = (
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 400" width="300" height="400">'
            f"{wallpaper(paper, color)}{sticker(color, art)}</svg>"
        )
        (OUT / f"{slug}.svg").write_text(svg, encoding="utf-8")
    print(f"{len(STICKERS)} pegatinas en {OUT}")


if __name__ == "__main__":
    main()
