# Plataforma de eventos interactivos para Twitch

Plataforma web para que streamers de Twitch creen eventos interactivos (sugerencias y votaciones, sorteos) con participación de su audiencia en tiempo real. Proyecto Next.js integrado: el frontend y el backend viven en el mismo repositorio, servidos por un servidor Node personalizado (`server.ts`) sobre el que se integrarán Socket.IO y el listener de Twitch EventSub en fases futuras.

## Stack

- Next.js (App Router, `src/`) + React + TypeScript estricto
- Tailwind CSS
- Prisma + PostgreSQL 16 (Docker Compose)
- ESLint

## Requisitos

- Node.js 20 o superior
- Docker (con Docker Compose)

## Puesta en marcha

1. **Levantar la base de datos:**

   ```bash
   docker compose up -d
   ```

2. **Instalar dependencias:**

   ```bash
   npm install
   ```

3. **Configurar variables de entorno:** copia `.env.example` a `.env` y rellena los valores (ver la sección siguiente para obtener las credenciales de Twitch):

   ```bash
   cp .env.example .env
   ```

   Genera un valor para `SESSION_SECRET` con:

   ```bash
   openssl rand -base64 32
   ```

4. **Aplicar las migraciones de la base de datos:**

   ```bash
   npm run db:migrate
   ```

5. **Arrancar el servidor de desarrollo:**

   ```bash
   npm run dev
   ```

   La aplicación queda disponible en http://localhost:3000.

## Registro de la aplicación en Twitch

Para obtener el `TWITCH_CLIENT_ID` y `TWITCH_CLIENT_SECRET` del `.env`:

1. Entra en la consola de desarrolladores de Twitch: https://dev.twitch.tv/console e inicia sesión con tu cuenta de Twitch.
2. Ve a **Applications** (Aplicaciones) y pulsa **Register Your Application** (Registrar tu aplicación).
3. Rellena el formulario:
   - **Name**: el nombre de tu aplicación (por ejemplo, `sistema-sugerencias-votos`).
   - **OAuth Redirect URLs**: `http://localhost:3000/api/auth/twitch/callback`
   - **Category**: elige la categoría que mejor encaje (por ejemplo, *Broadcaster Suite* o *Other*).
4. Pulsa **Create** y luego **Manage** sobre la aplicación recién creada.
5. Copia el **Client ID** y ponlo en `TWITCH_CLIENT_ID` del `.env`.
6. Pulsa **New Secret** para generar un **Client Secret**, cópialo (solo se muestra una vez) y ponlo en `TWITCH_CLIENT_SECRET`.

## Scripts disponibles

| Script               | Comando                                          | Descripción                                       |
| -------------------- | ------------------------------------------------ | ------------------------------------------------- |
| `npm run dev`        | `tsx watch server.ts`                            | Servidor de desarrollo con recarga automática     |
| `npm run build`      | `next build`                                     | Compila la aplicación para producción             |
| `npm start`          | `cross-env NODE_ENV=production tsx server.ts`    | Arranca el servidor en modo producción            |
| `npm run lint`       | `eslint`                                         | Análisis estático del código                      |
| `npm run db:up`      | `docker compose up -d`                           | Levanta PostgreSQL en segundo plano               |
| `npm run db:migrate` | `prisma migrate dev`                             | Crea/aplica migraciones (a partir de la Fase 2)   |
| `npm run db:generate`| `prisma generate`                                | Regenera el cliente de Prisma                     |
| `npm test`           | `vitest run`                                     | Tests de las reglas de negocio (sin DB)           |

## Uso

1. Inicia sesión con Twitch desde la landing (`/`).
2. En `/dashboard` crea un evento (sugerencias, votación o sorteo), inícialo y contrólalo. Todo cambio se refleja en tiempo real vía Socket.IO.
3. Añade en OBS un **Browser Source** con la URL del overlay (`/overlay/<channelId>`, visible y copiable desde el dashboard). El fondo es transparente.
4. Participación del chat: durante las sugerencias, cualquier mensaje de texto válido es una sugerencia; durante la votación, un número (posición en la lista) es un voto; durante la inscripción de un sorteo, el comando `!participo` inscribe al espectador (una sola vez). Nunca se responde al chat.
5. Las sugerencias se validan contra el catálogo IGDB: los typos se canonizan al título oficial ("Elden Rign" → "Elden Ring", también abreviaturas como "GTA V") y lo que no sea un juego real se descarta silenciosamente. Si IGDB no responde, la sugerencia se acepta igual (fail-open). Se puede desactivar con `IGDB_VALIDATION=off`.

## Estructura relevante

- `server.ts` — servidor Node personalizado (HTTP + Next.js + Socket.IO + listener de Twitch EventSub en el mismo proceso).
- `prisma/schema.prisma` — modelo de datos completo (usuarios, canales, eventos, rondas, sugerencias, vetos, opciones de votación y votos) con migraciones en `prisma/migrations/`.
- `src/lib/db.ts` — cliente de Prisma con patrón singleton.
- `src/lib/auth/` — sesión JWT en cookie httpOnly, guards de autorización por canal y cifrado de tokens de Twitch en reposo.
- `src/lib/twitch/` — cliente OAuth y gestor de EventSub (WebSocket, suscripción `channel.chat.message`, refresco de tokens, reconexión con backoff).
- `src/lib/events/` — máquina de estados y servicio de eventos/rondas (transiciones, timers autoridad-servidor, snapshot).
- `src/lib/suggestions/` y `src/lib/voting/` — reglas de sugerencias (normalización, validación IGDB, veto) y de votación (posiciones estables, ranking, empate).
- `src/lib/igdb/` — cliente del catálogo IGDB (app access token, cola de 4 req/s, caché con TTL, matching difuso por similitud y nombres alternativos).
- `src/lib/raffle/` — reglas del sorteo (inscripción con `!participo`, selección aleatoria del ganador, re-sorteo con exclusión de ganadores previos).
- `src/lib/realtime/` — contratos compartidos y emisión Socket.IO (rooms por canal).
- `src/lib/chat/processor.ts` — enrutado de mensajes del chat a sugerencias/votos/participantes (sin respuestas al chat).
- `src/app/dashboard/` — panel de control del streamer; `src/app/overlay/[channelId]/` — overlay público para OBS.
- `tests/` — tests de Vitest sobre las reglas de negocio puras.
- `docker-compose.yml` — PostgreSQL 16 para desarrollo.
