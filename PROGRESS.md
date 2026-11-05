# PROGRESS

## Estado
2026-11-04 — Fases 1, 2 y 3 terminadas, fusionadas en `main` y desplegadas en https://teamfinder-seven.vercel.app (Supabase cloud `teamfinder`, pkzgwndwwoyeaozqdpqn, París; migraciones al día). Login con Discord verificado en producción.
Fase 4 (grupos) con el código terminado en la rama `fase-4-grupos`: lint, 76 tests (unit + BD, incluida la concurrencia en la última plaza) y 26 e2e en verde. Pendiente: aplicar `20261104040000_lobbies.sql` en cloud y fusionar. Fase 4 fusionada y desplegada.
Fase 5 (chat) con el código terminado en la rama `fase-5-chat`: chat en tiempo real solo para miembros, límite de ritmo, bandeja /mensajes con «sin leer». Fase 6 (confianza) con el código terminado en la rama `fase-6-confianza`: bloqueo, denuncias, panel de moderación, karma y borrado de cuenta. Fases 5 y 6 fusionadas y desplegadas (migraciones aplicadas en cloud).
Fase 7 (beta) con el código en la rama `fase-7-beta`: auditoría WCAG A/AA automática (axe) sin infracciones en 11 páginas, borradores de privacidad y normas marcados «pendiente de revisión legal», pie con enlaces y Discord opcional, 404 propio. Para cerrarla faltan las tareas del usuario de abajo y la prueba de un usuario real desde el móvil.

## Objetivo de la beta
Web para encontrar gente con la que hacer stack en VALORANT: perfil → búsqueda con filtros → publicaciones «busco dúo/trío/five» con solicitudes → sala con chat → karma tras jugar. Beta con cuentas reales, público hispanohablante en servidores EU.

## Fases
Cada fase se cierra con gate (`lint`, `test`, `build` en verde), commit y actualización de este archivo.

- [x] **Fase 1 — Base técnica.** Proyecto Next.js con tokens visuales, scripts y CI. Migraciones: perfil común separado de datos por juego; roles/agentes/rangos/modos/regiones de VALORANT como seed. Login Discord + enlace por correo, logout, rutas protegidas.
  - *Hecho cuando:* login con Discord funciona en local y en preview de Vercel; migraciones aplican desde cero; un test demuestra que un usuario no puede escribir el perfil de otro (RLS); CI en verde.
- [x] **Fase 2 — Perfil.** Común (nombre, avatar, idiomas, región, horarios, objetivos, voz) con visibilidad por campo (público / registrados / privado). VALORANT: rango «introducido manualmente», varios roles + etiqueta Flex, pool de agentes con estado (main, comfort, playable, flexible), botón «Conectar Riot — integración pendiente». Perfil público y perfiles incompletos con progreso.
  - *Hecho cuando:* crear/editar persiste; el servidor rechaza datos inválidos; otro usuario no ve campos privados; usable en móvil y con teclado.
- [x] **Fase 3 — Buscar jugadores.** Filtros combinables (rango mín–máx, región, rol, agente + estado, modo, idioma, horario, objetivo, voz), tarjetas, paginación, orden comprensible (actividad reciente, sin puntuación de compatibilidad), estado vacío con sugerencias.
  - *Hecho cuando:* tests de la lógica de filtros; filtros en la URL; carga < 2 s con datos de prueba.
- [x] **Fase 4 — Grupos y solicitudes.** Publicación con plazas, roles que faltan, rango, horario, región, idioma y objetivo. Solicitar / aceptar / rechazar; estados abierto, completo, cerrado; sin duplicados; plazas consistentes. Lista con filtros y sugerencias orientativas de jugadores para los roles que faltan.
  - *Hecho cuando:* e2e del flujo crear → solicitar → aceptar → completo; test de dos solicitudes simultáneas a la última plaza.
- [x] **Fase 5 — Sala con chat.** Chat en tiempo real solo para miembros del grupo (RLS), rate limit de mensajes. Bandeja en la cabecera con las salas activas.
  - *Hecho cuando:* dos navegadores chatean en tiempo real; un no miembro no puede leer ni escribir (test); el spam queda limitado.
- [x] **Fase 6 — Confianza y seguridad.** Bloquear y denunciar usuarios y mensajes (los bloqueados desaparecen de búsquedas y salas). Panel mínimo de moderación (rol admin). Karma: al cerrar un grupo, cada miembro valora una vez a cada compañero (+/− y etiquetas); se muestra el agregado con su regla explicada. Borrado de cuenta y rate limiting en acciones sensibles.
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
- 2026-11-04 — Next 16.4 con `cacheComponents` desactivado: todo depende de la sesión y simplifica el MVP. Reversible.
- 2026-11-04 — Catálogo por juego genérico (`game_roles`, `game_characters`, `game_ranks`, `game_modes`, `game_regions`); VALORANT entra por `seed.sql`. El rango guarda su procedencia (`manual` / `verified`).
- 2026-11-04 — El correo no se copia a `profiles`; solo vive en `auth.users`. Perfiles visibles solo para usuarios registrados hasta la visibilidad por campo (fase 2).
- 2026-11-04 — Visibilidad por campo: las tablas base solo las lee su dueño; terceros leen vistas (`profile_cards`, `game_profile_cards`, `player_*_cards`) que enmascaran según `public` / `registered` / `private`. Por defecto `registered`. Nombre y avatar siempre visibles (mínimo para una tarjeta). La visibilidad de VALORANT es una sola para todo el perfil de juego.
- 2026-11-04 — Región = servidor del juego (`game_profiles.region_id`), no un campo común. Horarios como 8 franjas fijas (entre semana / fin de semana × mañana, tarde, noche, madrugada) para poder filtrarlas.
- 2026-11-04 — Roles y pool se guardan con la función `save_game_profile` (transacción, siempre sobre `auth.uid()`); como mucho un rol principal.
- 2026-11-04 — Búsqueda solo con sesión (`/buscar` protegida): con la visibilidad por defecto «registrados», un anónimo apenas vería nada y así se reduce el scraping.
- 2026-11-04 — Búsqueda sobre la vista `player_search`, que ya aplica la visibilidad: filtrar por un campo oculto nunca devuelve a quien lo oculta. Orden: perfil actualizado más recientemente (no hay «última conexión» real todavía). Sin puntuación de compatibilidad.
- 2026-11-04 — Filtros en la URL con slugs legibles; valores desconocidos se descartan. «Agente + estado» se filtra con claves `id:estado`.
- 2026-11-04 — Modos preferidos (DuoQ/TrioQ/FiveStack) añadidos al perfil de juego (`game_profiles.mode_slugs`, validados contra `game_modes`); faltaban en la fase 2.
- 2026-11-04 — Datos ficticios solo locales para rendimiento: `supabase/dev/demo-players.sql` (1000 «Demo N», correos `@demo.invalid`). Nunca en cloud.
- 2026-11-04 — Grupos: toda escritura pasa por funciones de BD que bloquean la fila del grupo (`for update`); plazas = tamaño del modo; el creador ocupa la primera. Estados abierto → completo (automático) → cerrado (creador). Una solicitud viva por persona y grupo (índice único parcial).
- 2026-11-04 — Límites: 3 grupos abiertos por persona, 10 creados por hora, 10 solicitudes pendientes. Nota ≤ 140 y mensaje ≤ 200 caracteres.
- 2026-11-04 — Fechas de grupos en hora peninsular española (beta EU); el navegador envía su desfase para interpretar la hora local.
- 2026-11-04 — Sugerencias de jugadores para roles que faltan = enlace a `/buscar` con rol y modo (orientativo, sin puntuación).
- 2026-11-04 — Sesión válida sin perfil (cuenta borrada) → `/auth/salir` cierra sesión y vuelve al login.
- 2026-11-04 — Cabecera en móvil: marca y «Salir» arriba; navegación en una segunda fila.
- 2026-11-04 — Bloqueo bidireccional en búsqueda y grupos (el bloqueado no ve los grupos de quien le bloqueó ni puede pedir unirse); en una sala compartida, quien bloquea deja de ver los mensajes del bloqueado. El bloqueado no sabe que lo está.
- 2026-11-04 — Denuncias de usuario o de mensaje (se guarda copia del mensaje); 10 al día por persona. Las ven quien denuncia y moderación. Resolución «actuada / descartada» con registro en `moderation_log`.
- 2026-11-04 — Moderadores: tabla `app_admins`, alta solo por SQL desde el panel de Supabase. `/moderacion` da 404 a quien no lo es.
- 2026-11-04 — Karma: +1/−1 y hasta 3 etiquetas cerradas, una vez por compañero y grupo, solo en grupos cerrados y hasta 7 días después. Se muestran totales y etiquetas más repetidas, nunca quién votó. Visible solo con sesión.
- 2026-11-04 — Borrado de cuenta desde `/ajustes` (escribir BORRAR): borra `auth.users` y en cascada todo lo suyo; las denuncias se conservan anonimizadas.
- 2026-11-04 — Accesibilidad: test e2e con axe (WCAG 2.1 A/AA) sobre las páginas principales en escritorio y móvil; los enlaces dentro de texto van siempre subrayados. Es una comprobación automática: no sustituye a una revisión manual con lector de pantalla.
- 2026-11-04 — Discord: enlace solo si `NEXT_PUBLIC_DISCORD_INVITE_URL` es una invitación https de Discord; sin ella no se muestra nada.
- 2026-11-04 — Producción solo con Discord hasta tener SMTP propio: `NEXT_PUBLIC_EMAIL_LOGIN=off` oculta el acceso por correo y la acción del servidor lo rechaza. Local y CI siguen con correo (Mailpit).
- 2026-11-04 — Edad mínima provisional: 16 años (no verificada). Moderación: avisos, cierre de grupos y, en casos graves, eliminación de la cuenta; sin suspensiones temporales todavía.
- 2026-11-04 — Pentest (tests/db/security.test.ts). Corregido: escritura directa de perfiles de juego (rango «verificado» y fecha futura falsos), oráculo de bloqueo por RPC, miembros de grupos cerrados o con bloqueo visibles, enumeración anónima de usuarios, avatar con cualquier URL, nombres con caracteres invisibles o de inversión, funciones internas por RPC, escritura del catálogo, cabecera X-Powered-By y falta de CSP. Funciones auxiliares de RLS no expuestas viven en el esquema `private`. En Supabase cloud se desactivó el proveedor Email (la API ya no acepta altas por correo); al configurar SMTP hay que reactivarlo además de quitar `NEXT_PUBLIC_EMAIL_LOGIN`.
- 2026-11-05 — Rediseño «arena nocturna»: misma paleta, títulos en Chakra Petch, superficies con brillo y bordes finos, botón principal con esquina cortada, iconos de interfaz con lucide-react, logotipo geométrico propio (provisional).
- 2026-11-05 — Iconos de agentes y rangos: recursos de Riot Games usados bajo su política «Legal Jibber Jabber» (web de fans gratuita, sin logotipos de Riot/VALORANT, aviso literal en el pie). URLs de media.valorant-api.com guardadas como datos del catálogo (`icon_url`, `color`) y servidas por el optimizador de Next; si fallan, iniciales. Zona gris: la política prohíbe usar su IP en «apps», así que no publicar como app de tienda. Añadido el agente Hush (30 en total).
- 2026-11-05 — Karma solo positivo («reconocimientos», hasta 3 motivos). Las políticas de Riot para productos con su API prohíben evaluar o avergonzar a otros jugadores y permiten honrarlos; se eliminan el voto negativo y las etiquetas negativas. Las denuncias quedan como moderación de la conducta dentro de la web.
- 2026-11-05 — Multijuego: VALORANT, Counter-Strike 2 y Apex Legends. Juego activo en la cookie `tf_game` (selector en la cabecera, funciona sin JS); búsqueda, grupos y perfil usan el catálogo de ese juego. Cada juego tiene acento y brillos propios inspirados en su identidad (VALORANT coral `#ff6b6b` + azul marino, CS2 ámbar `#f5a524` + pizarra, Apex rojo `#e8453c` + azul marino), guardados como datos (`games.theme_*`). La base oscura, los paneles y el azul informativo son comunes (prompt §17); el usuario eligió «acentos inspirados», no colores oficiales. Todos los acentos superan 4,5:1 con `#0B0C12`.
- 2026-11-05 — Catálogos de CS2 y Apex (migración `20261105030000_cs2_apex.sql`). CS2: roles de comunidad (Entry, AWPer, IGL, Soporte, Lurker, Rifler, Ancla), sin personajes, rangos = bandas de CS Rating de Premier (umbrales de guías de comunidad, Valve no publica fuente oficial), modos Wingman/Premier/Competitivo. Apex: 5 clases, 28 leyendas (última Axle, T29), rangos de la ayuda oficial de EA (es-ES) con divisiones IV–I hasta Diamante, Maestro y Depredador supremo; modos Dúos/Tríos/Clasificatoria. Traducciones de clases sin verificar con el juego; EA anuncia cambios de clases en la T32 (≈feb 2027): revisar.
- 2026-11-05 — Sin iconos de CS2 ni Apex: Valve no tiene política para webs de fans y sus términos prohíben reutilizar sus materiales; EA permite contenido del juego en webs de fans sin ánimo de lucro, pero no recursos extraídos de los archivos (los únicos enlazables lo son). Se usan iniciales, iconos genéricos de rol y un punto de color por rango. Avisos en el pie: el literal que exige EA («This website is not endorsed by or affiliated with EA or its licensors.») y el habitual de Valve. Zona gris: la política de EA pide no mezclar su contenido con otras marcas; la web muestra Apex junto a otros juegos sin usar logos ni arte de EA.
- 2026-11-04 — Botón principal: fondo `#8B5CF6` con texto `#0B0C12` (4,6:1). Blanco sobre `#8B5CF6` no llega a AA (4,2:1).

## Acciones del usuario
- [x] Aplicación OAuth de Discord «TeamFinder (dev)» (ID 1567553301656895589) con redirects local y de Supabase cloud; `supabase/.env` rellenado.
- [x] Repo privado en GitHub, proyecto Supabase cloud y Vercel conectado.
- [x] Supabase cloud: Discord activado y URL Configuration (Site URL `https://teamfinder-seven.vercel.app`; Redirect URLs `/auth/callback` de producción y `https://teamfinder-*-me-myself-and-i-8b2d.vercel.app/**`).
- [ ] SMTP propio en Supabase para reactivar el acceso por correo (el SMTP por defecto solo entrega a direcciones del equipo). Mientras, producción va solo con Discord (`NEXT_PUBLIC_EMAIL_LOGIN=off` en Vercel y proveedor Email desactivado en Supabase). Opción gratuita: Brevo (300 correos/día) u otro proveedor; requiere crear cuenta y pegar sus credenciales SMTP en Supabase → Authentication → Emails → SMTP; después quitar `NEXT_PUBLIC_EMAIL_LOGIN`.
- [x] Servidor de Discord «TeamFinder (beta)» con canales de información, buscar partida y desarrollo; invitación permanente https://discord.gg/aNafKfd6SN en `NEXT_PUBLIC_DISCORD_INVITE_URL` (Vercel, Production).
- [ ] Decidir los campos «pendiente» de privacidad y normas: responsable y contacto, plazo de conservación de denuncias, edad mínima y medidas contra cuentas (avisos/suspensiones). Revisión legal antes de abrir al público.
- [x] Moderador: la cuenta 1Cut1Kill está en `app_admins` (más moderadores: `insert into public.app_admins (user_id) values ('<uuid>');` en el SQL Editor).
- [ ] Prueba final: un usuario nuevo completa el recorrido entero en producción desde el móvil.
- [x] Docker instalado y en marcha.
- [x] Solicitada la clave de producción de Riot (2026-11-05, app 902996, «Pending Review»; URL verificada con `public/riot.txt`; demo pública en `/demo`). Si se aprueba: implementar RSO en menos de 30 días o se pierde la clave.

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
