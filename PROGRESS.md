# PROGRESS

## Estado
Plan aprobado (2026-11-04). Siguiente: fase 1 — base técnica.

## Objetivo de la beta
Web para encontrar gente con la que hacer stack en VALORANT: perfil → búsqueda con filtros → publicaciones «busco dúo/trío/five» con solicitudes → sala con chat → karma tras jugar. Beta con cuentas reales, público hispanohablante en servidores EU.

## Fases
Cada fase se cierra con gate (`lint`, `test`, `build` en verde), commit y actualización de este archivo.

- [ ] **Fase 1 — Base técnica.** Proyecto Next.js con tokens visuales, scripts y CI. Migraciones: perfil común separado de datos por juego; roles/agentes/rangos/modos/regiones de VALORANT como seed. Login Discord + enlace por correo, logout, rutas protegidas.
  - *Hecho cuando:* login con Discord funciona en local y en preview de Vercel; migraciones aplican desde cero; un test demuestra que un usuario no puede escribir el perfil de otro (RLS); CI en verde.
- [ ] **Fase 2 — Perfil.** Común (nombre, avatar, idiomas, región, horarios, objetivos, voz) con visibilidad por campo (público / registrados / privado). VALORANT: rango «introducido manualmente», varios roles + etiqueta Flex, pool de agentes con estado (main, comfort, playable, flexible), botón «Conectar Riot — integración pendiente». Perfil público y perfiles incompletos con progreso.
  - *Hecho cuando:* crear/editar persiste; el servidor rechaza datos inválidos; otro usuario no ve campos privados; usable en móvil y con teclado.
- [ ] **Fase 3 — Buscar jugadores.** Filtros combinables (rango mín–máx, región, rol, agente + estado, modo, idioma, horario, objetivo, voz), tarjetas, paginación, orden comprensible (actividad reciente, sin puntuación de compatibilidad), estado vacío con sugerencias.
  - *Hecho cuando:* tests de la lógica de filtros; filtros en la URL; carga < 2 s con datos de prueba.
- [ ] **Fase 4 — Grupos y solicitudes.** Publicación con plazas, roles que faltan, rango, horario, región, idioma y objetivo. Solicitar / aceptar / rechazar; estados abierto, completo, cerrado; sin duplicados; plazas consistentes. Lista con filtros y sugerencias orientativas de jugadores para los roles que faltan.
  - *Hecho cuando:* e2e del flujo crear → solicitar → aceptar → completo; test de dos solicitudes simultáneas a la última plaza.
- [ ] **Fase 5 — Sala con chat.** Chat en tiempo real solo para miembros del grupo (RLS), rate limit de mensajes. Bandeja en la cabecera con las salas activas.
  - *Hecho cuando:* dos navegadores chatean en tiempo real; un no miembro no puede leer ni escribir (test); el spam queda limitado.
- [ ] **Fase 6 — Confianza y seguridad.** Bloquear y denunciar usuarios y mensajes (los bloqueados desaparecen de búsquedas y salas). Panel mínimo de moderación (rol admin). Karma: al cerrar un grupo, cada miembro valora una vez a cada compañero (+/− y etiquetas); se muestra el agregado con su regla explicada. Borrado de cuenta y rate limiting en acciones sensibles.
  - *Hecho cuando:* tests de bloqueo, valoración única y acceso al panel; el borrado de cuenta elimina los datos personales.
- [ ] **Fase 7 — Lanzamiento de la beta.** Auditoría de accesibilidad y móvil; e2e de flujos críticos en CI; borradores de privacidad y normas marcados «pendiente de revisión legal»; enlace al Discord; despliegue en producción.
  - *Hecho cuando:* un usuario real nuevo completa el recorrido entero en producción desde el móvil.

### Después de la beta (sin fecha)
RSO de Riot si aprueban la clave (rango y estadísticas verificados), mensajes privados, Clip Zone, insignias, enlaces sociales, otros juegos, bot de Discord.

## Decisiones
- 2026-11-04 — Proyecto creado a partir de `docs/PROMPT.md`.
- 2026-11-04 — Fase 1 = beta con cuentas reales (no demo local).
- 2026-11-04 — Stack: Next.js + TypeScript, Supabase (Postgres/Auth/Realtime), Vercel, npm. Login con Discord y correo.
- 2026-11-04 — Enfoque: buscador de stack, no plataforma tipo FACEIT. Descartados de la beta: cola automática, ELO y ligas.
- 2026-11-04 — Datos de VALORANT: sin scraping (tracker.gg no tiene API pública para VALORANT). Vía oficial: clave de producción de Riot + RSO con consentimiento; prohibido el *scouting* (ver stats de rivales). Hasta entonces, rango manual etiquetado.
- 2026-11-04 — UI en español con textos preparados para traducción. Público inicial: hispanohablantes en servidores EU.
- 2026-11-04 — Chat solo en salas de grupo en la beta; mensajes privados después.
- 2026-11-04 — Nombre provisional en un único archivo de configuración hasta que el usuario decida la marca.

## Acciones del usuario
- [ ] Crear proyecto en Supabase y aplicación OAuth en Discord; conectar el repo a Vercel (se pedirá en la fase 1).
- [ ] Instalar Docker para Supabase local, si no está.
- [ ] Solicitar clave de producción de Riot cuando haya una beta visible.

## Riesgos
- Riot rechaza la clave → el rango sigue siendo manual (ya contemplado).
- Abuso en plataforma social → la fase 6 va antes del lanzamiento.
- Límites de los planes gratuitos de Supabase/Vercel → suficientes para la beta; revisar al crecer.

## Pendiente de definir
- Nombre, dominio, logo e identidad final («DUELINK» y «TeamFinder» son provisionales).
- Textos legales definitivos (privacidad, normas, retención de datos).
- Subida/hosting de clips y límites (post-beta).
- Plataformas sociales enlazadas al inicio (post-beta).
- Reglas y controles de la sección de e-dating (post-beta).
- Financiación y costes.
