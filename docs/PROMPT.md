# Prompt maestro para OpenCode — Comunidad para encontrar jugadores de VALORANT

> **Objetivo de este documento:** servir como briefing funcional y prompt inicial para OpenCode, usando un modelo de programación con recursos limitados. Contiene las decisiones e ideas reunidas hasta ahora, separa lo acordado de lo que sigue abierto y evita que el agente invente integraciones o construya funcionalidades falsas.

---

## 1. Instrucciones principales para OpenCode

Actúa como **ingeniero de software senior, arquitecto pragmático y responsable de producto**. Tu tarea es convertir este briefing en una aplicación útil, mantenible y ampliable.

### Antes de modificar archivos

1. Inspecciona el repositorio actual: estructura, stack, dependencias, scripts, pruebas, convenciones, estado de Git y funcionalidades existentes.
2. Lee las instrucciones del repositorio (`AGENTS.md`, `README`, reglas locales y archivos de configuración relevantes).
3. **Aprovecha las skills globales y locales disponibles**: descubre cuáles son relevantes para el stack, UI/UX, accesibilidad, autenticación, base de datos, pruebas, seguridad y despliegue; lee las instrucciones pertinentes antes de actuar. No asumas que una skill está instalada ni inventes sus capacidades.
4. OpenCode puede disponer de agentes. Úsalos solo cuando aporten valor real: por ejemplo, uno para revisar arquitectura/seguridad y otro para investigar una integración o evaluar UX. Divide tareas con límites claros, pide resultados concretos y evita que varios agentes editen los mismos archivos simultáneamente. No delegues por delegar ni consumas recursos en exploraciones redundantes.
5. Resume brevemente qué existe, qué falta, los riesgos y un plan de implementación por fases. Si el repositorio ya contiene una aplicación, **adáptate a ella en vez de sustituirla sin motivo**.
6. No hagas cambios destructivos ni reemplaces configuraciones existentes sin comprenderlas. No expongas secretos, no añadas claves reales al repositorio y no ejecutes operaciones externas con consecuencias sin autorización.

### Forma de trabajar

- Prioriza una **primera versión vertical, funcional y coherente**, no una colección de pantallas estáticas.
- Mantén una lista de tareas y trabaja en incrementos pequeños verificables.
- Usa las herramientas y convenciones ya existentes cuando sean adecuadas. No impongas un framework, base de datos, servicio de autenticación ni proveedor nuevo sin inspeccionar primero el proyecto.
- Antes de añadir una dependencia, comprueba si la funcionalidad puede implementarse con lo existente y si la dependencia merece el coste.
- No inventes resultados de APIs, estadísticas oficiales, disponibilidad de integraciones, perfiles, usuarios ni datos de partidas. Los datos de demostración deben estar claramente marcados como ficticios.
- No simules persistencia, login, sincronización, ranking ni subida de vídeos como si fueran reales. Si algo no puede conectarse todavía, muestra un estado honesto y deja una interfaz preparada para completarlo.
- Escribe pruebas proporcionadas al riesgo y ejecuta los comandos de lint, typecheck y tests que existan. Informa de lo que no haya podido verificarse.
- No implementes todas las ideas futuras de una sola vez. Mantén una arquitectura que permita crecer, pero evita sobreingeniería.
- Si falta una decisión no esencial, elige la opción más simple, segura y reversible, documentándola. Pregunta solo cuando la decisión bloquee materialmente el trabajo.
- No des por finalizado el trabajo solo porque la aplicación compile: revisa los flujos principales, los estados vacíos, errores, accesibilidad básica y diseño móvil.

---

## 2. Visión del producto

Crear una **comunidad para encontrar compañeros con quienes jugar**, inicialmente centrada en **VALORANT**. En el futuro podrá ampliarse a otros videojuegos, pero no debe parecer una plataforma genérica desde el primer día: el producto, sus filtros y sus flujos iniciales deben resolver especialmente el problema de encontrar compañeros adecuados para jugar a VALORANT.

El objetivo es ayudar a los usuarios a encontrar jugadores compatibles por rango, rol, agentes, modalidad, región, idioma, horarios y forma de jugar; formar dúos y equipos; construir un perfil social; compartir clips; participar en rankings y, más adelante, conectar también con personas con fines de amistad o e-dating.

### Principios del producto

- **VALORANT primero; otros juegos después.**
- Encontrar compañeros debe ser rápido, claro y filtrable.
- El rol y el pool de agentes son información importante, no etiquetas decorativas.
- Diferenciar los rankings comunitarios de los rangos oficiales del juego.
- La confianza, la privacidad, la moderación y la protección contra trampas son requisitos de producto.
- Diseñar para ampliar a otros juegos sin introducir desde el principio complejidad innecesaria.
- Empezar con recompensas digitales e insignias; no depender de premios físicos.
- No usar datos ficticios para sugerir que existe una integración oficial funcional.

---

## 3. Usuarios y casos de uso principales

1. Un jugador quiere encontrar un compañero para jugar competitivo en dúo.
2. Un jugador busca completar un equipo de cinco integrantes.
3. Un grupo habitual quiere encontrar a alguien que cubra el rol que le falta.
4. Un usuario quiere jugar con personas de un rango, región, idioma y horario determinados.
5. Un usuario quiere encontrar gente que juegue con un agente específico o que sea flexible con varios agentes.
6. Un usuario quiere presentar su perfil y enlazar sus redes o perfiles gaming.
7. Un usuario quiere compartir un clip, participar en categorías y ganar una insignia.
8. La comunidad quiere consultar rankings semanales, ganadores y logros anteriores.
9. En una fase posterior, usuarios adultos podrán buscar conexiones sociales o de e-dating según preferencias y consentimiento.
10. La comunidad quiere organizar partidas, eventos y feedback a través de un Discord propio.

---

## 4. Funcionalidades de VALORANT prioritarias

### 4.1 Perfil de jugador

El perfil debe contemplar, cuando corresponda:

- Nombre visible y avatar.
- Riot ID u otra identificación gaming que el usuario decida mostrar.
- Rango competitivo actual y, si se implementa, región/servidor.
- Idiomas.
- Horarios habituales y disponibilidad.
- Objetivos: competitivo/ranked, casual, entrenar/mejorar, jugar por diversión o conocer gente.
- Estilo de comunicación y preferencias de voz.
- Modos preferidos: DuoQ, TrioQ, FiveStack y otras opciones que se definan.
- Rol principal, roles secundarios y disposición a cambiar de rol.
- Pool de agentes y nivel de comodidad con cada uno.
- Enlaces sociales opcionales: Discord, Twitch, YouTube, Steam, PlayStation Network, Xbox y otras plataformas relevantes.
- Historial de actividad, clips, insignias y logros, cuando estén disponibles.
- Preferencias de privacidad: controlar qué campos son públicos, visibles solo para usuarios registrados o privados.

No todos los campos deben ser obligatorios. Permite perfiles incompletos y ofrece una forma clara de completarlos progresivamente.

### 4.2 Roles y flexibilidad

Usar los **cuatro roles oficiales de VALORANT** como base:

- Duelista.
- Iniciador.
- Controlador (también conocido informalmente como *smoker*).
- Centinela.

**Flex** es una etiqueta de flexibilidad, no un quinto rol oficial. Un usuario puede seleccionar varios roles y declarar si está dispuesto a cubrir posiciones distintas según el equipo.

La lista de roles y agentes debe poder actualizarse sin tener que rehacer la lógica de perfiles. Verifica el roster vigente al implementar listas oficiales; no mantengas una lista codificada como si fuera permanentemente completa.

### 4.3 Pool de agentes

El usuario debería poder clasificar los agentes que juega, por ejemplo:

- **Main:** agente principal.
- **Comfort pick:** agente con el que se siente especialmente cómodo.
- **Playable:** puede jugarlo si hace falta.
- **Flexible:** está dispuesto a cambiar de agente o rol según la composición.

Ejemplo meramente ilustrativo: Omen como main, Clove como comfort pick y Brimstone como playable. No tratar el ejemplo como perfil real.

El modelo de datos debe permitir que cada usuario tenga varios agentes y que el estado de preferencia se asocie a cada agente. Evitar que el sistema limite a cada usuario a un solo agente o rol.

### 4.4 Búsqueda de compañeros y filtros

Crear una búsqueda clara con filtros combinables, que puede incluir:

- Rango.
- Región/servidor.
- Rol deseado.
- Agente concreto.
- Main, comfort pick o flexibilidad del agente.
- Modo: DuoQ, TrioQ, FiveStack u otros que se añadan.
- Horarios y disponibilidad.
- Idioma.
- Objetivo de la sesión.
- Preferencias de voz/comunicación.
- Compatibilidad aproximada de nivel y estilo.

Resultados en tarjetas de jugador con información útil para decidir: nombre, rango, roles, agentes, objetivo, disponibilidad y acción para ver el perfil o contactar. Mostrar resultados vacíos con sugerencias para ampliar filtros.

Evitar filtros que no tengan datos reales detrás. Debe ser posible ordenar o filtrar con criterios comprensibles; no inventar una puntuación de compatibilidad sofisticada sin definir y probar cómo se calcula.

### 4.5 Grupos, partidas y equipos

- Crear una publicación o grupo que indique juego, modalidad, rango deseado, roles que faltan, horario, región, idioma y objetivo.
- Permitir solicitar unirse o expresar interés.
- Mostrar plazas ocupadas y vacantes.
- Ayudar a identificar qué roles necesita un equipo y sugerir jugadores que puedan cubrirlos.
- Permitir que un equipo guarde una plantilla habitual, si el alcance lo permite.
- No imponer una composición ideal: las sugerencias deben ser orientativas.
- Definir estados claros (abierto, completo, cerrado/cancelado) y evitar solicitudes duplicadas o inconsistentes.
- Añadir contacto/mensajería solo cuando exista una implementación real con sus controles de privacidad y abuso.

### 4.6 Historial de partidas y estadísticas

Se desea mostrar, cuando se disponga de datos fiables:

- Partidas jugadas.
- Mapa.
- Agente utilizado.
- Score y métricas de rendimiento pertinentes.
- Fecha y, si es posible, resultado de la partida.

**Restricción crítica:** no asumir que existe acceso oficial a todo el historial de partidas de VALORANT. Antes de programar sincronización automática, investigar la API oficial y sus políticas vigentes, permisos, condiciones de uso y limitaciones. No saltarse restricciones ni usar scraping no autorizado. Diferenciar claramente:

1. Datos oficiales obtenidos mediante una integración permitida.
2. Datos que el usuario introduce manualmente.
3. Resultados verificados de competiciones o colas propias.
4. Datos de demostración.

Si no hay integración permitida para un campo, no fingir que se sincroniza. El diseño debe poder mostrar “no conectado”, “sin datos disponibles” o permitir un registro manual claramente identificado.

---

## 5. Rankings y competición de la plataforma

Se quieren **dos sistemas distintos**, que no deben confundirse.

### 5.1 Ranking semanal comunitario

- Top 10 de usuarios de la semana.
- Cada ganador recibe una insignia digital visible en su perfil.
- Reinicio de la clasificación semanal sin borrar el historial de ganadores.
- Archivo permanente de temporadas/semanas y logros.
- Insignias diferenciadas para Top 1, Top 2–3 y Top 4–10, si resulta adecuado.
- Cada insignia debería registrar nombre del logro, puesto, periodo/temporada y fecha.
- Establecer un mínimo de actividad o partidas válidas para poder entrar en el Top 10.
- Medidas para reducir abuso, cuentas múltiples, boosting, votos coordinados y otras manipulaciones.
- Explicar de forma transparente cómo se calcula la clasificación.

Ejemplo de nombre de logro propuesto por el usuario: “Top 1 semanal del episodio 3 del acto 4”. Es solo un ejemplo de formato; no codificar ese periodo como dato actual.

### 5.2 Rating competitivo a largo plazo

Inspiración general en plataformas competitivas como FACEIT/ESEA, sin copiar su marca ni asumir que sus reglas son transferibles.

Posibles elementos futuros:

- Rating propio de la plataforma, separado del rango oficial de VALORANT.
- Divisiones o ligas.
- Temporadas.
- Clasificación por región.
- Emparejamiento más equilibrado.
- Historial de evolución del rating.
- Rating independiente por juego y, si existe suficiente volumen, por modalidad.
- Reglas contra trampas, boosting, smurfing, multiaccount y resultados falsos.

**No implementar un rating competitivo real a partir de estadísticas no verificadas.** Para que una clasificación propia tenga credibilidad, debe definirse de dónde proceden los resultados y cómo se verifican. Si se crea una cola competitiva propia, diseñar primero reglas, registro de resultados, disputas, sanciones y auditoría. Mantener esta funcionalidad como futura hasta que haya un método viable de verificación.

---

## 6. Clip Zone: clips y premios comunitarios

Se desea una sección de clips llamada provisionalmente **Clip Zone**.

### Funciones previstas

- Publicar clips mediante subida compatible o enlaces admitidos, según lo que soporte de forma segura la infraestructura.
- Asociar cada clip a un juego y a una categoría.
- Mostrar clips destacados en una galería o feed.
- Permitir reacciones/votos y, si se implementan, comentarios.
- Mostrar autor, perfil, fecha y categoría.
- Moderar denuncias, contenido abusivo, spam, duplicados y uso indebido de contenido.
- Publicar ganadores semanales y mantener un archivo de ganadores.
- Anunciar ganadores en Discord en una fase de integración.

### Categorías iniciales propuestas

- **Ace of the Week:** jugada de ace.
- **Clutch Master:** clutch destacado.
- **Comedy Legend:** clip gracioso.
- **Highlight of the Week:** mejor jugada o momento destacado.
- **Community Favorite:** favorito de la comunidad.
- **Clip of the Year:** reconocimiento anual, como evolución futura.

Las categorías deben ser configurables y no depender de nombres de eventos codificados rígidamente.

### Votaciones justas

- Distinguir categorías subjetivas (clip gracioso/favorito) de categorías de habilidad (ace/clutch).
- No permitir que el ganador dependa exclusivamente de tener más seguidores o amigos.
- Considerar límites de voto, detección de actividad sospechosa, moderación y revisión cuando corresponda.
- Definir las reglas y el periodo de votación de forma visible.
- No entregar automáticamente premios oficiales del juego ni prometer premios físicos. En la primera etapa, las recompensas son insignias digitales de la propia plataforma.

### Privacidad, almacenamiento y derechos

- Limitar formatos y tamaños, validar archivos y proteger la subida.
- Preferir enlaces externos cuando sean más seguros o sostenibles; no dar por hecho que cualquier enlace o proveedor se puede reproducir dentro de la web.
- Respetar derechos de autor, condiciones de los proveedores y solicitudes de retirada.
- No exponer datos personales en metadatos o enlaces sin consentimiento.

---

## 7. Perfiles sociales, enlaces y Discord

### 7.1 Enlaces a plataformas

Permitir enlaces opcionales al perfil de Discord, Twitch, YouTube, Steam, Riot, PlayStation Network, Xbox y otras plataformas que resulten relevantes.

Distinguir entre:

- **Enlace manual:** el usuario añade una URL o identificador visible.
- **Cuenta verificada/integrada:** solo si se implementa una autenticación o API oficial y permitida.

No etiquetar un perfil como “verificado” solo porque el usuario haya escrito un nombre. Los enlaces deben validarse y presentarse con seguridad. La persona debe controlar su visibilidad y poder quitarlos.

### 7.2 Discord de la comunidad

La comunidad tendrá un Discord propio para organizar partidas, socializar, anunciar novedades y recoger feedback.

Estructura sugerida:

- **Información:** `#bienvenida`, `#normas`, `#anuncios`, `#novedades-web`.
- **Buscar partida:** `#valorant`, `#busco-equipo`, canales de voz; `#otros-juegos` cuando se amplíe la plataforma.
- **Comunidad:** `#general`, `#clips-y-momentos`, `#presentaciones`, eventos.
- **Desarrollo:** `#sugerencias`, `#reportar-errores`, `#votaciones`, `#ideas-para-la-web`.

Las sugerencias y errores pueden llevar estados como pendiente, en desarrollo, completado o descartado. La comunidad debería poder votar y ver anuncios de cambios.

### 7.3 Integración web–Discord (futura)

Posibles pasos futuros: bot para anunciar clips ganadores, novedades, eventos y cambios; enlaces entre publicaciones web y canales; quizá utilidades de organización de partidas. No crear ni configurar un bot real sin credenciales, permisos y autorización. La primera versión puede limitarse a enlaces claros al Discord y a las invitaciones oficiales configuradas por el propietario.

---

## 8. Sección social y e-dating (fase posterior)

El usuario quiere que la plataforma pueda incluir más adelante una sección social diferenciada para conocer gente, amistad o e-dating, sin convertir toda la búsqueda de compañeros en una aplicación de citas.

Conceptos previstos:

- Cada persona puede indicar su género mediante opciones inclusivas y voluntarias.
- Cada persona puede elegir con quién desea conectar: hombres, mujeres, ambos u otras preferencias apropiadas.
- Distinguir claramente la búsqueda para jugar de las conexiones sociales/dating.
- Preferencias explícitas, consentimiento, privacidad, bloqueo y denuncia.
- Evitar mostrar información sensible sin permiso.
- No asumir que todo usuario busca una relación; el objetivo puede ser amistad o jugar.
- Si se implementa dating, **debe ser solo para adultos**, con controles razonables de edad y políticas de seguridad/moderación.
- No es prioridad para el primer lanzamiento, pero la arquitectura de usuarios/perfiles no debería impedir incorporarlo sin rehacer todo.

No crear ahora un sistema de citas completo ni recopilar datos sensibles innecesarios. Antes de desarrollar esta sección, definir requisitos legales, privacidad, consentimiento, moderación y seguridad.

---

## 9. Diseño y experiencia de usuario

La dirección visual sugerida hasta ahora es una estética gaming moderna, inicialmente oscura, con acentos morados y azules. Es una propuesta, no una identidad de marca definitiva.

### Principios visuales

- Priorizar claridad y rapidez sobre efectos decorativos.
- Diseño responsive, especialmente móvil.
- Navegación sencilla y jerarquía visual consistente.
- Tarjetas legibles para perfiles, grupos, clips y rankings.
- Filtros accesibles y fáciles de modificar.
- Estados claros: carga, vacío, error, éxito, no conectado y datos de demostración.
- Formularios con validación y mensajes útiles.
- Buen contraste, navegación por teclado, etiquetas accesibles y objetivos táctiles adecuados.
- Evitar animaciones excesivas o elementos que dificulten la lectura.

### Secciones/páginas candidatas

La estructura exacta puede adaptarse al repositorio y a la primera versión:

1. Inicio / panel principal.
2. Buscar jugadores.
3. Grupos o partidas.
4. Perfil público y edición del perfil.
5. Clip Zone.
6. Rankings y logros.
7. Comunidad / Discord.
8. Ajustes, privacidad y cuenta.
9. Administración/moderación, con acceso restringido.
10. Conecta (amistad/e-dating), solo en fase futura.

No es necesario que todas las páginas estén operativas en la primera entrega. Las que se presenten como funcionales deben tener acciones reales o indicar claramente que están pendientes.

---

## 10. Seguridad, privacidad y moderación

La plataforma es social y puede exponer a usuarios a abuso. Diseñar desde el principio para:

- Autenticación y autorización robustas, si se implementan cuentas.
- Validación de datos en cliente y servidor.
- Protección de sesiones, contraseñas y secretos.
- Control de acceso a edición de perfiles, clips, reportes y administración.
- Bloquear y denunciar usuarios/contenido.
- Moderar spam, acoso, contenido sexual no consentido, suplantación y enlaces peligrosos.
- Rate limiting en acciones susceptibles de abuso.
- No exponer correo, identificadores privados, ubicación precisa ni otros datos personales por defecto.
- Consentimiento explícito para visibilidad de enlaces y preferencias sociales.
- Gestión adecuada de datos, borrado de cuenta y retención conforme a la legislación aplicable.
- Registro de acciones de moderación cuando sea necesario, sin registrar secretos o datos innecesarios.
- Si se añaden menores a la plataforma, evaluar riesgos y reglas específicas; la función de e-dating será exclusivamente para adultos.
- No inventar una política legal definitiva. Marcar los requisitos que necesitan revisión antes de un lanzamiento público.

---

## 11. Arquitectura funcional y ampliación a otros juegos

La aplicación comienza con VALORANT, pero debe poder añadir otros juegos sin duplicar todos los módulos.

Separar conceptualmente:

- Usuarios y perfiles.
- Catálogo de juegos.
- Datos específicos de cada juego (roles, agentes/personajes, rangos, modos).
- Preferencias y disponibilidad.
- Publicaciones de búsqueda, grupos y solicitudes.
- Clips, categorías, votos y moderación.
- Insignias, logros y rankings.
- Enlaces externos e integraciones.
- Ajustes de privacidad.
- Administración y auditoría.

Evitar tratar los agentes de VALORANT como si fueran campos universales de cualquier videojuego. Crear una configuración específica por juego o un modelo extensible para roles/personajes/rangos. Los roles y agentes deben poder actualizarse mediante datos de configuración.

No construir una arquitectura distribuida, microservicios o un sistema de eventos complejo sin necesidad demostrable. Para un MVP, preferir una solución simple y mantenible compatible con el stack existente.

---

## 12. Datos, integraciones y honestidad funcional

Antes de implementar una integración:

1. Verifica documentación oficial actual, condiciones de uso, permisos y límites.
2. Determina qué datos se pueden obtener legalmente y de forma fiable.
3. Documenta qué campos son automáticos, manuales o no disponibles.
4. Maneja fallos, desconexión, límites de uso y datos desactualizados.
5. No incluyas secretos ni tokens en el frontend o en el repositorio.

Esto es especialmente importante para Riot/VALORANT, historial de partidas, rangos, estadísticas, cuentas de terceros y Discord.

Si no hay credenciales o no existe acceso autorizado, construye la interfaz y el contrato de integración, pero presenta el estado real (“no conectado”, “integración pendiente”, “introducido manualmente”) en lugar de simular una conexión.

---

## 13. Priorización propuesta

### P0 — Base y primera experiencia útil

- Inspeccionar el repositorio y establecer cómo ejecutar y probar el proyecto.
- Diseñar una experiencia visual coherente centrada en VALORANT.
- Modelo de perfil de jugador con rol, agentes, rango, idioma, región/servidor, horarios, objetivo y modalidad.
- Buscar jugadores con filtros reales y estados vacíos.
- Ver perfiles y editar los propios campos.
- Crear publicaciones/grupos para encontrar DuoQ, TrioQ o FiveStack, con plazas y roles necesarios.
- Diseño responsive y accesibilidad básica.
- Persistencia real si la infraestructura disponible lo permite; si no, dejar claramente delimitado el prototipo y no fingir que guarda datos.
- Pruebas de los flujos críticos y documentación para ejecutar el proyecto.

### P1 — Comunidad y reconocimiento

- Insignias/logros con modelo de datos que permita guardar ganadores y periodos.
- Ranking semanal solo cuando existan datos fiables y reglas transparentes.
- Clip Zone con publicación, categorías, visualización y moderación básica.
- Votación segura y registro de ganadores.
- Enlaces sociales opcionales y controles de privacidad.
- Enlace al Discord oficial de la comunidad.
- Panel básico de administración/reportes si el producto ya permite contenido generado por usuarios.

### P2 — Integraciones y funciones competitivas

- Integraciones oficiales permitidas para datos de Riot/VALORANT.
- Historial y estadísticas automáticas, únicamente para campos accesibles.
- Bot e integración web–Discord.
- Equipos persistentes, sugerencias de roles faltantes y herramientas avanzadas.
- Rating competitivo propio, ligas y temporadas, después de definir cómo verificar resultados y resolver disputas.

### P3 — Expansión social y otros juegos

- Catálogo de juegos adicionales.
- Adaptación de perfiles, roles, rangos y filtros por juego.
- Sección “Conecta” para amistad/e-dating de adultos, con controles de privacidad, consentimiento, bloqueo y denuncia.
- Eventos avanzados, reconocimientos anuales y posibles premios externos, si la comunidad y los recursos lo justifican.

**Estas prioridades son una propuesta para organizar el trabajo, no una orden de implementar todo de golpe.** Ajustarlas después de inspeccionar el proyecto y calcular el coste real.

---

## 14. Decisiones aún abiertas: no inventar respuestas

Estas decisiones no se han cerrado. No bloquees el análisis inicial por ellas; recomienda una opción simple con ventajas y riesgos, y pregunta solo si hace falta para avanzar:

- Nombre, dominio, logo e identidad final.
- Stack, alojamiento, base de datos y proveedor de autenticación (depende de lo que ya exista).
- Si la primera versión será una demo local, una beta con cuentas reales o un lanzamiento público.
- Método de verificación de resultados y reglas definitivas del ranking semanal.
- Si el rating competitivo será solo para una cola propia o se basará en resultados verificables de otro sistema permitido.
- Disponibilidad real de APIs y datos de VALORANT.
- Método de subida/hosting de clips y límites.
- Alcance exacto de mensajería y notificaciones.
- Qué plataformas sociales se enlazarán inicialmente.
- Reglas finales, opciones y controles de la sección de e-dating.
- Modelo de financiación, costes y posibles premios físicos futuros.

---

## 15. Entregables que debe producir OpenCode

Después de inspeccionar el repositorio:

1. **Diagnóstico corto**: stack detectado, estado actual, limitaciones y riesgos.
2. **Plan de fases**: qué se hará ahora, qué queda explícitamente fuera y por qué.
3. **Implementación funcional** de la primera fase acordada, siguiendo las convenciones existentes.
4. **Pruebas y comprobaciones** apropiadas al stack.
5. **Documentación** de cómo instalar, configurar, ejecutar y probar.
6. **Lista de decisiones pendientes** y recomendaciones, separando hechos comprobados de supuestos.
7. **Resumen final**: archivos principales modificados, funcionalidades reales, comandos ejecutados, resultados de pruebas y limitaciones conocidas.

No declares una función completada si solo tiene una maqueta visual. No afirmes que hay integración real sin haberla verificado.

---

## 16. Primera instrucción de ejecución

Empieza por inspeccionar el repositorio, las instrucciones del proyecto y las skills disponibles. Usa agentes solo si una tarea paralela bien delimitada aporta valor. Devuelve un diagnóstico y un plan breve antes de realizar cambios grandes.

Después, implementa la primera vertical funcional priorizando: **perfil de VALORANT → filtros de búsqueda de jugadores → resultados → creación/solicitud para un grupo**. Mantén la base extensible para Clip Zone, rankings, Discord, otros juegos y la futura sección social, pero no implementes prematuramente las funciones que dependen de integraciones, reglas o requisitos aún sin resolver.

---

## 17. Actualización de producto y dirección visual (29-10-2026)

### Visión del producto
La plataforma es una comunidad gaming multijuego cuyo núcleo es ayudar a cada persona a encontrar compañeros adecuados para jugar. VALORANT es el primer juego de lanzamiento, no el límite del producto. La arquitectura debe permitir añadir Rust (por ejemplo, búsqueda de grupo para un wipe), Escape from Tarkov, Apex Legends, Counter-Strike 2 y otros juegos más adelante, sin diseñar ni implementar todos a la vez.

La experiencia debe evitar la saturación. No mostrar todas las funciones en la pantalla inicial ni dar el mismo peso a búsqueda, chat, PRO, cartas, clips y estadísticas. La prioridad de la primera experiencia es: elegir juego/modo → encontrar jugadores o búsquedas compatibles → conversar/unirse → jugar.

### Dirección estética acordada
- Estilo: mezcla de dark gaming premium, minimalismo elegante y algunos elementos sociales/coleccionables.
- Personalidad: exclusiva y elegante, con energía competitiva; evitar que parezca recargada o una copia visual de un juego concreto.
- Fondo principal global: `#0B0C12`.
- Paneles/tarjetas: `#151722`.
- Acento morado: `#8B5CF6`.
- Acento azul: `#3B82F6`.
- Texto principal: `#E7E8EF`.
- Mantener la base visual común entre juegos. La identidad del juego puede aparecer en iconos, etiquetas y contenido contextual, pero no cambiar el fondo base de toda la plataforma.
- Usar color intenso con moderación para acciones principales, estados activos, insignias y detalles. Priorizar contraste, legibilidad, responsive y accesibilidad.
- El nombre “DUELINK” mostrado en una maqueta visual es solo un nombre provisional, NO aprobado. No fijar marca, dominio ni logo final sin decisión del usuario.

### Organización principal sugerida
Navegación simple con cuatro zonas conceptuales:
1. **Jugar**: encontrar jugadores, filtros, crear búsquedas/grupos y descubrir equipos. Es la entrada prioritaria.
2. **Comunidad**: perfiles, karma/reconocimientos, clips y actividad comunitaria.
3. **Competir**: ligas, torneos, temporadas y funciones PRO cuando estén disponibles.
4. **Mi perfil**: preferencias, juegos, reputación, colecciones e historial.

No es obligatorio mostrar las cuatro como páginas completas en la primera iteración; adaptar la navegación al estado real del producto. Las funciones especializadas deben aparecer en contexto y no competir visualmente con la búsqueda.

### Chat y comunicación
- Priorizar mensajes privados entre jugadores y conversaciones grupales vinculadas a una búsqueda concreta.
- Ejemplos: “busco dúo para ranked ahora”, “grupo para el wipe del viernes”. La conversación debe mantener el contexto de la búsqueda y permitir coordinarse antes de jugar.
- Diseñar una bandeja de mensajes accesible desde cualquier zona de la web.
- Un chat general por juego/modo puede evaluarse después si existe demanda; no debe ser un requisito de la primera versión.
- Considerar desde el diseño bloqueo, denuncia, controles anti-spam y privacidad. No simular una mensajería funcional con una maqueta: etiquetar claramente los datos ficticios y diferenciar prototipo de función conectada a backend.

### Diseño multijuego
Separar los campos comunes de perfil (idioma, región, horarios, objetivos, disponibilidad, preferencias de comunicación y reputación general) de los datos específicos por juego (rangos, roles, agentes, mapas, servidores, wipes, modos y demás). Cada juego debe mostrar solo filtros relevantes. La arquitectura debe poder ampliarse con configuraciones por juego, sin que la primera versión tenga que implementar todo el catálogo.

### Reglas de implementación para la primera versión
- Mantener el alcance inicial: VALORANT, perfiles, filtros, resultados de búsqueda y publicaciones/grupos con solicitudes para unirse.
- Entregar una interfaz pulida que siga la dirección visual acordada, pero no confundir apariencia con funcionalidad: indicar claramente qué funciona, qué usa datos de demostración y qué requiere backend/integración.
- No implementar prematuramente tarjetas coleccionables, economía, minijuegos, e-dating, integración de Riot, estadísticas automáticas o competición PRO. Dejar puntos de extensión y documentar dependencias cuando sea útil.
- Las cartas/colecciones son una capa secundaria de retención, no el núcleo de la plataforma.
- El sistema de karma es reputación social, no un mecanismo de sanción ni una clasificación oficial del juego.
- Inspeccionar repositorio, `AGENTS.md`, stack, convenciones y skills antes de modificar. No reemplazar el stack sin motivo claro.
