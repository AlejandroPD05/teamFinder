# TeamFinder (nombre provisional)

Comunidad para encontrar compañeros con quienes jugar, empezando por VALORANT: perfiles con rango, roles y pool de agentes, búsqueda con filtros y grupos para DuoQ, TrioQ o FiveStack. Preparada para añadir otros juegos más adelante.

**Beta:** https://teamfinder-seven.vercel.app · **Comunidad:** https://discord.gg/aNafKfd6SN

El briefing completo está en [docs/PROMPT.md](docs/PROMPT.md) y el estado en [PROGRESS.md](PROGRESS.md).

## Requisitos

- Node 24+ y npm.
- Docker Desktop en marcha (Supabase local).

## Cómo arrancar

```bash
npm install
npx supabase start          # Postgres, Auth, Realtime y Mailpit en local
cp .env.example .env.local  # rellena las claves con `npx supabase status`
npm run dev                 # http://127.0.0.1:3000
```

Los correos de acceso en local no se envían: se ven en Mailpit (http://127.0.0.1:54324).

### Login con Discord (opcional en local)

1. Crea una aplicación en https://discord.com/developers/applications → OAuth2.
2. Añade el redirect `http://127.0.0.1:54321/auth/v1/callback`.
3. Copia `supabase/.env.example` a `supabase/.env` con el client ID y el secret.
4. `npx supabase stop && npx supabase start`.

Sin esto, el botón «Entrar con Discord» falla; el acceso por correo funciona igual.

## Comandos

| Comando | Qué hace |
| --- | --- |
| `npm run lint` | ESLint + tipos de rutas + `tsc --noEmit` |
| `npm run test` | Vitest: unitarios y RLS (necesita Supabase local) |
| `npm run build` | Build de producción |
| `npm run e2e` | Playwright en escritorio y móvil (necesita Supabase local) |
| `npm run db:types` | Regenera `src/lib/supabase/database.types.ts` |
| `npx supabase db reset` | Reaplica migraciones y `supabase/seed.sql` |

## Estructura

- `supabase/migrations/` — esquema y RLS (única forma de cambiar la BD).
- `supabase/seed.sql` — catálogo de VALORANT (roles, agentes, rangos, modos, regiones) como datos.
- `src/proxy.ts` — refresco de sesión y rutas protegidas.
- `src/lib/i18n/es.ts` — textos de la UI.
- `src/lib/config.ts` — nombre provisional y rutas protegidas.
