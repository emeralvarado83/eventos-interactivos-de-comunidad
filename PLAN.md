# Plan — Plataforma de eventos interactivos para Twitch (MVP)

> **Progreso:** TODAS las fases completadas ✅ — Fase 1 (base), Fase 2 (modelo de datos), Fase 3 (Auth Twitch), Fases 4–8 (Socket.IO, API de eventos, sugerencias, votación, EventSub/chat, timers) y Fase 11 (tests Vitest). MVP funcional verificado end-to-end (19/19 checks E2E con PostgreSQL real: ciclo completo crear → sugerencias → veto → votación → ganador, empate → extensión → desempate, cancelación automática sin participación, autorización por canal y overlay público).
> Alcance acordado con el usuario: implementar por fases, una a la vez.

## Resumen de requisitos (ambos documentos)

- Plataforma para streamers: **Dashboard** (control), **Backend** (cerebro), **Overlay** (URL pública para OBS como Browser Source, sin integración OBS).
- Flujo principal: login Twitch → crear evento → fase de sugerencias → fase de votación → ranking → ganador, con empates y extensión de votación.
- **Corrección aplicada** (documento 2, prevalece sobre el maestro): **NO hay comandos `!sugerir`/`!votar`**. En `SUGGESTIONS_ACTIVE` cualquier mensaje de texto válido es una sugerencia; en `VOTING_ACTIVE` solo un número (posición en la lista) es un voto. Las posiciones de votación son **estables** (`VotingOption { position, gameId, gameName }`) aunque el ranking visual se reordene. El voto guarda el `gameId` real, no la posición.
- Sin Twitch Extension, sin privilegios para moderadores, multi-tenant por `channelId`, servidor como autoridad del tiempo, todo validado en backend.

## Decisiones tomadas (confirmadas con el usuario)

1. **Next.js integrado**: un solo proyecto Next.js (App Router) con **servidor Node personalizado** (`server.ts`) que monta Next + Socket.IO + listener de Twitch EventSub en el mismo proceso/puerto.
2. **PostgreSQL con Docker Compose** (`docker-compose.yml` en el repo).
3. El usuario **aún no tiene app de Twitch Developer** → el código queda listo y se documenta en el README cómo registrar la app y rellenar `.env` (Client ID, Secret, etc.).

## Stack

- Next.js 15 (App Router) + React 19 + TypeScript estricto.
- Servidor custom Node (`server.ts` con `tsx` en dev) que integra Socket.IO.
- PostgreSQL 16 (Docker) + Prisma ORM.
- Twitch: OAuth Authorization Code Flow (implementado a mano, sin librería pesada) + **EventSub `channel.chat.message` con transporte WebSocket** (funciona en localhost, no requiere URL pública; usa el user access token del streamer con scope `user:read:chat`).
- Sesión: JWT firmado en cookie httpOnly (con `jose`).
- Tests: Vitest (reglas de negocio en servicios puros).
- Estilos: Tailwind CSS.

## Estructura de carpetas

```
├── docker-compose.yml
├── .env.example
├── server.ts                    # servidor custom: Next + Socket.IO + EventSub
├── prisma/
│   └── schema.prisma
├── src/
│   ├── app/                     # Next.js App Router
│   │   ├── page.tsx             # landing / login
│   │   ├── dashboard/page.tsx   # dashboard del streamer
│   │   ├── overlay/[channelId]/page.tsx  # overlay público (fondo transparente)
│   │   └── api/
│   │       ├── auth/twitch/route.ts          # inicio OAuth
│   │       ├── auth/twitch/callback/route.ts # callback OAuth
│   │       ├── auth/logout/route.ts
│   │       └── events/...                    # crear/iniciar/finalizar/eliminar/extender
│   ├── lib/
│   │   ├── auth/                # sesión JWT, guard de autorización por canal
│   │   ├── twitch/              # cliente OAuth, EventSub WS, validación de tokens
│   │   ├── events/              # máquina de estados, servicios de evento/ronda
│   │   ├── suggestions/         # reglas de sugerencias (normalización, validación IGDB, veto)
│   │   ├── igdb/                # validación contra el catálogo IGDB (app token, caché, matching difuso)
│   │   ├── voting/              # reglas de votos, ranking, empate
│   │   ├── realtime/            # emisión Socket.IO (rooms por channelId)
│   │   ├── timers.ts            # temporizadores autoridad-servidor + rehidratación al arranque
│   │   └── db.ts                # Prisma client
│   └── hooks/                   # hooks React para socket y estado
└── tests/                       # Vitest: reglas críticas
```

## Modelo de datos (Prisma)

- **User**: `id`, `twitchId` (único), `login`, `displayName`, `accessToken` (cifrado/en reposo solo server), `refreshToken`, `tokenExpiresAt`.
- **Channel**: `id`, `twitchId` (único), `userId`.
- **Event**: `id`, `channelId`, `type` (`SUGGESTIONS` = Sugerencias, `VOTING` = Votación, `RAFFLE` = Sorteo), `status`, config de Sugerencias (`suggestionDurationSec`), config de Votación (`votingDurationSec`, `maxOptions` — default 10; limita las opciones importadas con origen `FROM_SUGGESTIONS`, `optionSource` = `MANUAL` | `FROM_SUGGESTIONS`), config del Sorteo (`registrationDurationSec` default 300, `maxParticipants` nullable = sin límite), `createdAt`, `startedAt`, `endedAt`. La configuración de cada tipo vive en sus propias columnas: cambiar de tipo no destruye la config del otro.
- **Round**: `id`, `eventId`, `number`, `phase` (`SUGGESTIONS`/`VOTING`/`FINISHED`), `phaseStartedAt`, `phaseEndsAt`.
- **Suggestion**: `id`, `roundId`, `twitchUserId`, `twitchLogin`, `gameName` (título oficial de IGDB si hubo match), `normalizedName`, `igdbGameId` (nullable; null si fail-open), `createdAt`. Único: `(roundId, twitchUserId)` y `(roundId, normalizedName)`.
- **SuggestionBan**: `id`, `roundId`, `normalizedName`, `createdAt`. Único: `(roundId, normalizedName)`.
- **EventOption** (votación manual): `id`, `eventId`, `position`, `label`, `createdAt`. Único: `(eventId, position)`. Editable en DRAFT; al iniciar la votación se copia a VotingOption.
- **VotingOption**: `id`, `roundId`, `position`, `gameName`. Único: `(roundId, position)`. Las opciones nacen de las EventOption del streamer (MANUAL) o de las sugerencias del último evento SUGGESTIONS completado (FROM_SUGGESTIONS).
- **Vote**: `id`, `roundId`, `votingOptionId`, `twitchUserId`, `createdAt`. Único: `(roundId, twitchUserId)`.
- **RaffleParticipant** (sorteos): `id`, `eventId`, `twitchUserId` (identidad real), `twitchLogin`, `isWinner`, `excludedFromRedraw` (ganadores previos no pueden volver a ganar), `createdAt`. Único: `(eventId, twitchUserId)`.

Las restricciones únicas en DB garantizan 1 sugerencia y 1 voto por usuario por ronda, y 1 participación por usuario por sorteo.

## Máquina de estados (Event.status)

```
Sugerencias (SUGGESTIONS):
DRAFT → SUGGESTIONS_ACTIVE → SUGGESTIONS_FINISHED → COMPLETED
COMPLETED → SUGGESTIONS_ACTIVE: nueva ronda.
Votación (VOTING):
DRAFT → VOTING_ACTIVE → VOTING_FINISHED → COMPLETED
                                      ↓
                                    TIE → VOTING_ACTIVE (extender +60s, misma ronda, votos se conservan)
Al cerrar la votación, el empate en cabeza (votos > 0) pasa a TIE; el resto de
resultados (ganador o "sin participación" si nadie votó) quedan en
VOTING_FINISHED como vista previa hasta que el streamer confirma con
"Finalizar evento" (→ COMPLETED).
COMPLETED → VOTING_ACTIVE: nueva ronda repitiendo las mismas opciones (votos a cero).
Sorteo (RAFFLE):
DRAFT → REGISTRATION_OPEN → REGISTRATION_CLOSED → DRAWING → COMPLETED
                                                              ↑          ↓
                                                (volver a sortear, excluyendo ganadores previos)
COMPLETED → REGISTRATION_OPEN: nuevo sorteo (borra participantes, misma config).
CANCELLED: desde DRAFT/REGISTRATION_*/SUGGESTIONS_*/VOTING_ACTIVE, automático si expira la fase
sin participación, y "Finalizar evento" desde COMPLETED.
```

Transiciones validadas en una tabla explícita `allowedTransitions`; cualquier transición no listada lanza error. Los servicios además validan el `type` del evento (cada flujo solo arranca en su tipo).

## Flujos clave

- **OAuth**: `/api/auth/twitch` → redirect a Twitch (scopes: `user:read:chat`) → callback intercambia code por tokens → upsert User+Channel → cookie JWT de sesión → redirect a `/dashboard`.
- **EventSub**: al arrancar el servidor (y tras login/refresh), se abre conexión WebSocket a EventSub con el token del streamer y se suscribe a `channel.chat.message` (condition: `broadcaster_user_id` = `user_id` del streamer). Cada mensaje entrante se enruta al procesador de chat. Reconexión con backoff y resuscripción.
- **Procesamiento de chat** (según corrección):
  - Si fase = `SUGGESTIONS_ACTIVE` y el mensaje es texto válido (trim, 2–60 chars, no vacío): validar contra el catálogo IGDB (`src/lib/igdb/`, app access token con las mismas credenciales de la app de Twitch, límite 4 req/s con cola serializada y caché en memoria). Si IGDB encuentra el juego se guarda el título OFICIAL (canoniza typos; la similitud se mide contra título + nombres alternativos, umbral 0.6, y acepta palabras sueltas de franquicia); si no encuentra nada, rechazo silencioso; si IGDB falla (timeout/5xx), fail-open: se acepta el texto del usuario. Luego validar (usuario no sugirió, juego no vetado, no duplicado tras normalizar: lowercase + trim + colapsar espacios) → crear Suggestion → emitir por socket. Se desactiva con `IGDB_VALIDATION=off`.
  - Si fase = `VOTING_ACTIVE` y el mensaje es un entero dentro de `[1, n]` opciones: validar (usuario no votó) → resolver `position → VotingOption.id` → crear Vote → emitir ranking. Mensajes no numéricos o fuera de rango se ignoran silenciosamente.
  - En cualquier otra fase: ignorar.
- **Temporizadores**: al iniciar cada fase se persiste `phaseEndsAt` y se programa un `setTimeout`; al expirar, el servidor aplica la transición (fin de sugerencias → `SUGGESTIONS_FINISHED` o `CANCELLED` si no hay sugerencias; fin de votación → `VOTING_FINISHED` —o `TIE` si hay empate con votos—, o `CANCELLED` si nadie votó). Al arrancar el servidor se rehidratan timers desde `phaseEndsAt` de rondas activas. El frontend solo muestra el countdown calculado desde `phaseEndsAt`.
- **Empate**: al finalizar votación, si los 2+ primeros tienen los mismos votos (> 0) → estado `TIE`, sin ganador. Acción del dashboard "Añadir 1 minuto" → vuelve a `VOTING_ACTIVE` con nuevo `phaseEndsAt`, conservando votos y usuarios que ya votaron (siguen sin poder re-votar). Si nadie votó, no hay empate: `COMPLETED` sin ganador.
- **Veto**: eliminar sugerencia desde dashboard → borra Suggestion + crea SuggestionBan (misma ronda). Solo posible durante la fase de sugerencias. Opera sobre el nombre normalizado canónico, así que vetar "Elden Ring" cubre todos sus typos.

## API (route handlers de Next)

- `GET /api/auth/twitch`, `GET /api/auth/twitch/callback`, `POST /api/auth/logout`
- `GET /api/me` — usuario/canal actual
- `POST /api/events` — crear evento (duraciones con defaults: 60s sugerencias / 60s votación; `maxOptions` opcional, default 10; VOTING acepta `optionSource` y `options`)
- `PATCH /api/events/[id]` — editar configuración del tipo (solo en `DRAFT`)
- `GET /api/events/current` — evento activo del canal + ronda + sugerencias + votos
- `POST /api/events/[id]/start-suggestions`
- `POST /api/events/[id]/finish-suggestions` (también automático por timer)
- `POST /api/events/[id]/complete` (cierra el evento de sugerencias: SUGGESTIONS_FINISHED → COMPLETED)
- `POST /api/events/[id]/start-voting` (crea VotingOptions con posiciones estables desde EventOption o desde el último evento de sugerencias completado)
- `POST /api/events/[id]/finish-voting`
- `POST /api/events/[id]/extend-voting` (desde `TIE`, +60s)
- `POST /api/events/[id]/cancel`
- `POST /api/events/[id]/new-round` (nueva ronda de sugerencias)
- `POST /api/events/[id]/new-voting-round` (nueva ronda de votación con las mismas opciones)
- `POST /api/events/[id]/start-raffle` (abre la inscripción del sorteo)
- `POST /api/events/[id]/finish-registration` (cierra la inscripción; también automático por timer)
- `POST /api/events/[id]/draw` (elige ganador → animación de 5s → `COMPLETED`)
- `POST /api/events/[id]/redraw` (nuevo ganador excluyendo a los anteriores)
- `POST /api/events/[id]/new-raffle` (borra participantes y reabre la inscripción)
- `DELETE /api/suggestions/[id]` (eliminar + vetar)
- `GET /api/overlay/[channelId]` — estado público sanitizado para el overlay (sin auth)

Todo endpoint que muta verifica: sesión válida + que el evento pertenece al canal del usuario autenticado.

## Tiempo real (Socket.IO)

- Rooms por `channelId`. Dashboard se une autenticado (cookie de sesión en handshake); overlay se une solo-lectura a la room pública del canal.
- Eventos emitidos: `event:state` (snapshot completo: estado, fase, `phaseEndsAt`, sugerencias, ranking), `suggestion:added`, `suggestion:removed`, `vote:updated`, `event:tie`, `event:completed`, `event:cancelled`. Ante duda, el cliente puede pedir snapshot completo.

## Seguridad

- `TWITCH_CLIENT_SECRET` y tokens solo en servidor; cookie httpOnly + SameSite=Lax + `state` anti-CSRF en OAuth.
- Autorización por canal en cada mutación; validación de inputs (longitudes, tipos); rate limit básico en endpoints sensibles; mensajes de chat inválidos se ignoran sin responder al chat (sin spam).

## Alcance de esta ejecución: SOLO Fase 1 — Base del proyecto

El resto de fases (2–11) quedan como referencia para iteraciones futuras; **no se implementan ahora**.

Tareas de la Fase 1:

1. Scaffold del proyecto Next.js + TypeScript + Tailwind (App Router, `src/`).
2. Servidor Node personalizado `server.ts` (preparado para integrar Socket.IO después; en esta fase solo levanta Next).
3. `docker-compose.yml` con PostgreSQL 16.
4. `.env.example` con todas las variables necesarias (DB, Twitch OAuth, secreto de sesión).
5. Prisma inicializado (`prisma/schema.prisma` con datasource Postgres; el modelo de datos completo llega en la Fase 2).
6. Configuración base: `package.json` con scripts (`dev` con tsx para el server custom, `build`, `start`), `tsconfig` para el server, `.gitignore`.
7. `README.md` con instrucciones de setup (Docker, cómo registrar la app de Twitch Developer, variables de entorno).

Verificación de la Fase 1:

- `docker compose up -d` levanta PostgreSQL.
- `npm install` y `npm run dev` levantan la app en `http://localhost:3000` sin errores.
- `npm run build` compila correctamente.
