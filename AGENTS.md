# AGENTS.md

## Antes de tocar nada
- Lee `docs/PROMPT.md` (fuente de verdad) y `PROGRESS.md` (estado actual).
- Si algo de esta guía contradice `docs/PROMPT.md`, manda el prompt; avisa de la contradicción.
- La sección 17 de `docs/PROMPT.md` (29-10-2026) actualiza las anteriores: multijuego, estética, navegación y chat.

## Stack
- Por definir (el prompt no lo fija: stack, alojamiento, base de datos y auth siguen abiertos).
- Sin microservicios, arquitectura distribuida ni sistemas de eventos complejos en el MVP.

## Comandos
Por definir: se fijan en la fase 1.

## Reglas
- VALORANT es el juego de lanzamiento, no el límite: separa campos comunes de perfil (idioma, región, horarios, objetivos, comunicación, reputación) de los datos por juego (rangos, roles, agentes, modos, servidores). Roles, agentes y rangos van como datos de configuración, no codificados.
- Roles oficiales: Duelista, Iniciador, Controlador, Centinela. «Flex» es una etiqueta, no un quinto rol. Un usuario puede tener varios roles y varios agentes, cada uno con su estado (main, comfort pick, playable, flexible).
- Honestidad funcional: no simules login, persistencia, mensajería, ranking, sincronización ni subida de clips. Lo no conectado se muestra como «no conectado», «integración pendiente» o «introducido manualmente». Los datos de demo van marcados como ficticios.
- No inventes resultados de APIs, estadísticas, perfiles ni usuarios. No asumas acceso a la API de Riot ni hagas scraping: verifica antes documentación y condiciones oficiales.
- Rango oficial ≠ ranking comunitario ≠ rating propio. No calcules rating competitivo con estadísticas no verificadas. No inventes una puntuación de compatibilidad sin definir y probar cómo se calcula.
- Fuera de la primera versión: tarjetas coleccionables, economía, minijuegos, e-dating, integración Riot, estadísticas automáticas, competición PRO, bot de Discord. Deja puntos de extensión, no los implementes.
- El karma es reputación social, no sanción ni clasificación oficial. El e-dating, cuando llegue, será solo para adultos.
- Prioridad de la experiencia: elegir juego/modo → encontrar jugadores o búsquedas → conversar/unirse → jugar. No satures la pantalla inicial.
- Estética: fondo `#0B0C12`, paneles `#151722`, acento morado `#8B5CF6`, azul `#3B82F6`, texto `#E7E8EF`. Color intenso solo en acciones, estados activos e insignias. Responsive (móvil primero) y accesible: contraste, teclado, etiquetas, objetivos táctiles.
- «DUELINK» y «TeamFinder» no son marca aprobada: no fijes nombre, dominio ni logo sin decisión del usuario. No copies la marca ni el aspecto de VALORANT, FACEIT ni ESEA.
- Seguridad desde el diseño: validación cliente y servidor, control de acceso, bloqueo/denuncia, rate limiting y datos personales ocultos por defecto.
- Antes de añadir una dependencia, comprueba si hace falta y si compensa.
- No inventes datos, APIs ni requisitos que no estén en `docs/PROMPT.md`; pregunta.
- Sin secretos en el repo; usa `.env` (ignorado) y documenta las variables en `.env.example`.

## Gate antes de commitear
- `lint`, `test` y `build` en verde. Si falla, no se commitea.

## Forma de trabajar
- Fase a fase, según `PROGRESS.md`. Al cerrar una fase: gate, commit y actualizar `PROGRESS.md`.
- No des una función por hecha si solo es maqueta: revisa flujos, estados vacíos/error, accesibilidad y móvil.
