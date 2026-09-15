# Rol

Actúa como **arquitecto de software senior y desarrollador full-stack senior especializado en aplicaciones web en tiempo real e integración con Twitch**.

Tu responsabilidad será diseñar e implementar una aplicación web real, mantenible y preparada para producción.

No quiero solamente una demostración ni un prototipo visual. Quiero construir la base de un producto que posteriormente pueda crecer con nuevas funcionalidades.

Antes de implementar, analiza cuidadosamente los requisitos, identifica decisiones técnicas importantes y propón una arquitectura coherente. Después implementa el proyecto siguiendo esa arquitectura.

---

# 1. Objetivo del producto

Quiero desarrollar una plataforma web para streamers de Twitch que permita crear y gestionar **eventos interactivos con su comunidad mediante el chat de Twitch**.

El primer y principal caso de uso será:

> **Sugerencias de juegos → votación → selección del juego ganador.**

Ejemplo:

El streamer quiere decidir qué juego jugar.

Primero activa un evento de sugerencias durante un tiempo determinado.

Los espectadores participan escribiendo en el chat de Twitch:

```text
!sugerir Elden Ring
```

El sistema recibe esos mensajes, procesa las sugerencias y construye una lista de juegos.

Cuando termina el tiempo de sugerencias, el streamer puede iniciar una segunda fase:

> Votación.

Los espectadores votan mediante el chat:

```text
!votar Elden Ring
```

Al terminar la votación, el sistema calcula los resultados y determina el juego ganador.

Los juegos deben quedar ordenados por cantidad de votos.

---

# 2. Conceptos importantes

Hay que separar claramente tres componentes:

## Dashboard

Es la aplicación web que utiliza el streamer para controlar el sistema.

Ejemplo:

```text
https://app.tusistema.com/dashboard
```

Desde aquí podrá:

- Crear eventos.
- Configurar duración.
- Iniciar eventos.
- Finalizar eventos.
- Ver sugerencias en tiempo real.
- Eliminar sugerencias.
- Iniciar votaciones.
- Ver votos en tiempo real.
- Resolver empates.
- Ver resultados.

---

## Backend

Es el cerebro de la aplicación.

Debe encargarse de:

- Autenticación.
- Integración con Twitch.
- Recepción de mensajes del chat.
- Procesamiento de comandos.
- Gestión de eventos.
- Gestión de rondas.
- Validación de reglas.
- Persistencia.
- Votaciones.
- Resultados.
- Comunicación en tiempo real con el frontend.

---

## Overlay

Debe existir un overlay web independiente que pueda cargarse como una URL.

Ejemplo:

```text
https://app.tusistema.com/overlay/{channelId}
```

El overlay únicamente representa visualmente el estado del evento.

Debe poder mostrar, por ejemplo:

- Evento activo.
- Tiempo restante.
- Cantidad de sugerencias.
- Lista de juegos.
- Votación.
- Cantidad de votos.
- Ranking.
- Ganador.

El overlay se podrá utilizar posteriormente como Browser Source en OBS.

### IMPORTANTE

**OBS NO forma parte del producto ni de la arquitectura interna.**

No desarrollar integración específica con OBS.

No crear plugins de OBS.

No crear APIs de OBS.

No asumir que OBS controla el sistema.

OBS simplemente puede consumir la URL pública del overlay como cualquier navegador.

---

# 3. Twitch Extension

## NO implementar Twitch Extension en esta primera versión.

No quiero utilizar Twitch Extensions para el MVP.

La interacción de los espectadores será exclusivamente mediante el **chat de Twitch**.

No implementar:

- Twitch Extension.
- Twitch Extension Panel.
- Twitch Extension Overlay.
- Extension Manager.
- Código específico para publicar una Twitch Extension.

La plataforma debe quedar diseñada de forma que una Extension pudiera agregarse en el futuro, pero no debe formar parte del MVP.

---

# 4. Autenticación

El streamer debe poder iniciar sesión utilizando su cuenta de Twitch mediante OAuth.

Flujo esperado:

```text
Usuario
   ↓
Login con Twitch
   ↓
Twitch OAuth
   ↓
Backend
   ↓
Usuario autenticado
   ↓
Dashboard
```

El sistema debe identificar correctamente:

- Twitch user ID.
- Twitch username/login.
- Canal asociado.

No almacenar contraseñas de Twitch.

Utilizar los mecanismos oficiales de Twitch para autenticación.

---

# 5. Integración con Twitch Chat

El backend debe recibir mensajes del chat del canal del streamer.

Utilizar los mecanismos oficiales actuales de Twitch para eventos del chat, especialmente EventSub cuando corresponda.

El backend debe poder detectar comandos como:

```text
!sugerir Elden Ring
```

y:

```text
!votar Elden Ring
```

El procesamiento debe realizarse en el servidor.

El navegador del streamer NO debe conectarse directamente al chat de Twitch para procesar las reglas.

---

# 6. Concepto de evento

Un evento representa una interacción completa.

Para el MVP tendremos principalmente:

```text
GAME_SELECTION
```

Un evento tendrá como mínimo:

```text
id
channelId
type
status
createdAt
startedAt
endedAt
```

Pero quiero que el diseño sea extensible para poder agregar posteriormente otros tipos de eventos.

Ejemplos futuros:

```text
GAME_SELECTION
POLL
RAFFLE
CHALLENGE
QUESTION
PREDICTION
```

No implementar estos eventos adicionales todavía.

---

# 7. Concepto de ronda

El sistema debe utilizar el concepto de **ronda**.

Una ronda representa una ejecución concreta del proceso.

Por ejemplo:

```text
Evento
└── Ronda 1
    ├── Sugerencias
    └── Votación
```

Una nueva ronda debe reiniciar las reglas de participación.

Por ejemplo:

```text
Ronda 1
Carlos → puede sugerir una vez

Ronda 2
Carlos → vuelve a poder sugerir una vez
```

No reutilizar las restricciones de participación entre rondas.

---

# 8. Fase de sugerencias

El streamer podrá crear/iniciar una fase de sugerencias.

Debe poder establecer una duración.

Ejemplo:

```text
Duración: 60 segundos
```

Al iniciar:

```text
SUGGESTIONS_ACTIVE
```

Durante esta fase los espectadores podrán utilizar:

```text
!sugerir <juego>
```

Ejemplo:

```text
!sugerir Elden Ring
```

---

# 9. Reglas de sugerencias

Estas reglas son obligatorias.

## Regla 1 — Una sugerencia por usuario

Cada usuario puede realizar **una sola sugerencia por ronda**.

Ejemplo:

```text
Carlos → Elden Ring
```

Carlos ya no puede sugerir:

```text
!sugerir GTA V
```

durante esa misma ronda.

Debe rechazarse.

---

## Regla 2 — No puede cambiar su sugerencia

Si un usuario ya sugirió un juego, no puede modificarlo.

Ejemplo:

```text
Carlos → Elden Ring
```

No puede cambiarlo posteriormente a:

```text
GTA V
```

---

## Regla 3 — No duplicar juegos

Si un juego ya fue sugerido, no debe aparecer nuevamente.

Ejemplo:

```text
Carlos → Elden Ring
Pedro → Elden Ring
```

El resultado debe ser:

```text
Elden Ring
```

No:

```text
Elden Ring
Elden Ring
```

El sistema debe normalizar las entradas para evitar duplicados obvios.

Por ejemplo:

```text
Elden Ring
elden ring
ELDEN RING
  Elden Ring
```

deben considerarse el mismo juego.

Como mínimo implementar:

- case insensitive.
- trim.
- normalización de espacios.

No intentar resolver automáticamente todos los sinónimos posibles en el MVP.

Por ejemplo:

```text
GTA V
Grand Theft Auto V
```

pueden tratarse como entradas diferentes inicialmente.

---

# 10. Eliminación y veto de juegos

El streamer debe poder eliminar una sugerencia desde el Dashboard.

Ejemplo:

```text
Elden Ring
GTA V
Minecraft
```

El streamer elimina:

```text
GTA V
```

Entonces:

```text
GTA V
```

queda eliminado de las sugerencias y además debe quedar **vetado durante esa ronda**.

Esto es importante.

No basta con eliminar la sugerencia visualmente.

Debe existir un registro lógico de que el juego está vetado.

Si posteriormente otro usuario intenta:

```text
!sugerir GTA V
```

el sistema debe rechazarlo.

El veto solamente debe durar durante esa ronda.

Una nueva ronda debe comenzar sin los vetos de la ronda anterior.

---

# 11. Moderadores

Los moderadores NO tendrán privilegios especiales.

Para las reglas de este sistema:

```text
Streamer
   ↓
Administrador del evento

Moderador
   ↓
Espectador normal
```

No implementar privilegios especiales para moderadores en el MVP.

---

# 12. Finalización de sugerencias

Cuando termina el tiempo configurado:

### Caso A — Nadie participó

Si no existe ninguna sugerencia:

```text
Evento → CANCELLED
```

No debe iniciarse automáticamente la votación.

Mostrar al streamer algo como:

> No hubo sugerencias. El evento fue cancelado.

---

### Caso B — Existen sugerencias

El evento puede pasar a:

```text
SUGGESTIONS_FINISHED
```

y el streamer podrá iniciar la votación.

No iniciar automáticamente la votación a menos que posteriormente decidamos agregar esa opción.

---

# 13. Fase de votación

El streamer podrá iniciar la votación sobre las sugerencias existentes.

Ejemplo:

```text
Elden Ring
GTA V
Minecraft
Hades
```

Al iniciar:

```text
VOTING_ACTIVE
```

Los espectadores podrán utilizar:

```text
!votar <juego>
```

Por ejemplo:

```text
!votar Elden Ring
```

---

# 14. Reglas de votación

## Una votación por usuario

Cada usuario dispone de **un solo voto por ronda**.

Ejemplo:

```text
Carlos → Elden Ring
```

Carlos ya no puede votar nuevamente.

---

## El voto no puede modificarse

Si Carlos votó:

```text
Elden Ring
```

y posteriormente intenta:

```text
!votar GTA V
```

el sistema debe rechazar el segundo voto.

No cambiar el voto original.

---

# 15. Finalización de la votación

Cuando termina el tiempo:

El backend calcula el ranking.

Ejemplo:

```text
Elden Ring     25 votos
GTA V          18 votos
Minecraft      12 votos
Hades           5 votos
```

El resultado debe quedar ordenado de mayor a menor cantidad de votos.

El primer juego será el ganador.

---

# 16. Empates

En caso de empate por el primer lugar, el sistema NO debe elegir automáticamente un ganador.

Ejemplo:

```text
Elden Ring    15
GTA V         15
Minecraft      8
```

El sistema debe indicar:

```text
TIE
```

y permitir al streamer extender la votación.

El Dashboard debe ofrecer una acción similar a:

```text
Añadir 1 minuto
```

La extensión debe continuar la misma ronda de votación.

NO crear una nueva ronda.

NO borrar los votos existentes.

Los votos originales deben conservarse.

Ejemplo:

```text
Antes:

Elden Ring    15
GTA V         15

Extender +60 segundos

Nuevos votos:

Elden Ring    +3
GTA V         +1

Resultado:

Elden Ring    18
GTA V         16
```

Si después de la extensión continúa el empate, el sistema debe volver a permitir otra extensión.

No establecer un ganador automáticamente.

---

# 17. Estado del sistema

Diseñar una máquina de estados clara.

Como mínimo:

```text
DRAFT
   ↓
SUGGESTIONS_ACTIVE
   ↓
SUGGESTIONS_FINISHED
   ↓
VOTING_ACTIVE
   ↓
VOTING_FINISHED
   ↓
COMPLETED
```

Y estados alternativos:

```text
CANCELLED
```

En caso de empate:

```text
VOTING_FINISHED
      ↓
TIE
      ↓
VOTING_ACTIVE
```

o utilizar un modelo equivalente siempre que sea consistente y fácil de mantener.

No permitir transiciones inválidas.

Por ejemplo:

- No votar durante sugerencias.
- No sugerir después de finalizar sugerencias.
- No votar antes de iniciar votación.
- No modificar votos.
- No sugerir juegos después de terminar la fase.

Toda regla importante debe validarse en backend.

---

# 18. Tiempo y expiración

El servidor debe ser la autoridad respecto al tiempo.

No confiar únicamente en un contador JavaScript del navegador.

El frontend puede mostrar:

```text
00:42
```

pero el backend debe determinar si el evento sigue activo.

Utilizar timestamps reales:

```text
startedAt
endsAt
```

y calcular el estado basándose en ellos.

Esto debe funcionar aunque:

- El streamer cierre el Dashboard.
- Se recargue el navegador.
- El overlay se recargue.
- Existan varios clientes conectados.

---

# 19. Comunicación en tiempo real

El Dashboard y el Overlay deben actualizarse en tiempo real.

Por ejemplo:

```text
Espectador:
!sugerir Elden Ring
        ↓
Twitch
        ↓
Backend
        ↓
Base de datos
        ↓
WebSocket
        ├── Dashboard
        └── Overlay
```

Cuando aparece una nueva sugerencia, el Dashboard debe actualizarse sin refrescar.

Lo mismo para:

- Nuevos votos.
- Eliminación de sugerencias.
- Cambio de estado.
- Tiempo restante.
- Empates.
- Resultado final.

Puedes utilizar WebSockets o una tecnología equivalente.

---

# 20. Arquitectura tecnológica

Si no existe una razón fuerte para elegir otra tecnología, utilizar una arquitectura moderna basada en:

### Frontend

```text
Next.js
React
TypeScript
```

### Backend

Puede estar integrado inicialmente en el mismo proyecto si la arquitectura lo permite, o separado si es necesario.

Utilizar:

```text
Node.js
TypeScript
```

### Base de datos

```text
PostgreSQL
```

### ORM

Puedes utilizar un ORM moderno como:

```text
Prisma
```

o una alternativa equivalente si existe una razón técnica.

### Tiempo real

```text
WebSocket
```

o:

```text
Socket.IO
```

### Twitch

Utilizar APIs oficiales de Twitch:

```text
OAuth
EventSub
Twitch API
```

No utilizar scraping.

No utilizar soluciones no oficiales para leer el chat si existe una API oficial adecuada.

---

# 21. Modelo de datos

Diseñar correctamente las entidades.

Como punto de partida considerar:

```text
User
Channel
Event
Round
Suggestion
SuggestionBan
Vote
```

La estructura exacta queda a tu criterio como arquitecto, pero debe soportar todas las reglas descritas.

Conceptualmente:

```text
User
 │
 └── Channel
       │
       └── Event
             │
             └── Round
                  ├── Suggestions
                  ├── SuggestionBans
                  └── Votes
```

Debe existir una forma fiable de garantizar mediante la base de datos o backend que:

```text
1 usuario = 1 sugerencia por ronda
```

y:

```text
1 usuario = 1 voto por ronda
```

No depender únicamente de validaciones del frontend.

---

# 22. Dashboard del streamer

Crear inicialmente una interfaz sencilla pero profesional.

Debe incluir como mínimo:

## Dashboard principal

Mostrar:

```text
Estado del sistema
Evento actual
Ronda actual
```

y acciones relevantes.

---

## Crear evento

Permitir:

```text
Tipo de evento
Duración de sugerencias
Duración de votación
```

Podemos utilizar valores razonables por defecto.

---

## Evento activo

Mostrar:

```text
Estado
Tiempo restante
Número de participantes
Número de sugerencias
```

Lista:

```text
Elden Ring
GTA V
Minecraft
```

Cada sugerencia debe permitir:

```text
[Eliminar]
```

---

## Votación

Mostrar:

```text
Elden Ring      25
GTA V           18
Minecraft       12
```

Actualizar en tiempo real.

---

## Resultado

Mostrar claramente:

```text
🏆 GANADOR

Elden Ring

25 votos
```

y el ranking completo.

---

# 23. Overlay

Crear una página independiente:

```text
/overlay/{channelId}
```

Debe estar diseñada para poder utilizarse sobre un stream.

Características:

- Fondo transparente cuando corresponda.
- Interfaz visual limpia.
- No depender de navegación manual.
- Actualización en tiempo real.
- Mostrar únicamente información relevante.
- Debe reaccionar automáticamente al estado del evento.

Estados visuales mínimos:

### Sugerencias

```text
🎮 SUGERENCIAS

Tiempo restante: 00:42

12 juegos sugeridos
```

### Votación

```text
🗳️ ¿QUÉ JUGAMOS?

Elden Ring      18
GTA V           12
Minecraft        8

Tiempo: 00:31
```

### Resultado

```text
🏆 GANADOR

ELDEN RING

18 votos
```

### Sin evento

No mostrar nada o mostrar una pantalla completamente vacía/transparente.

---

# 24. Comandos del chat

MVP:

```text
!sugerir <juego>
!votar <juego>
```

El backend debe ignorar o rechazar comandos inválidos.

Ejemplos:

```text
!sugerir
```

```text
!votar
```

```text
!votar juego-que-no-existe
```

Las respuestas de error no deben generar spam excesivo en el chat.

Diseñar el sistema para poder añadir posteriormente más comandos.

---

# 25. Seguridad

No confiar nunca en datos enviados por el cliente.

Todas las operaciones críticas deben validarse en backend.

Especialmente:

- Crear eventos.
- Iniciar eventos.
- Finalizar eventos.
- Eliminar sugerencias.
- Crear votos.
- Extender votaciones.
- Determinar ganador.

El usuario autenticado debe ser quien realmente controla su propio canal.

Un streamer no debe poder acceder a los eventos de otro streamer manipulando IDs.

Prestar especial atención a:

- autorización.
- autenticación.
- CSRF cuando corresponda.
- validación de inputs.
- rate limiting.
- protección contra spam.
- control de acceso.
- tokens de Twitch.
- secretos de aplicación.

Nunca exponer:

```text
TWITCH_CLIENT_SECRET
```

ni otros secretos en frontend.

---

# 26. Diseño para múltiples streamers

Aunque inicialmente lo utilice una sola persona durante el desarrollo, la arquitectura debe ser multi-tenant.

Ejemplo:

```text
Streamer A
 └── Canal A
      ├── Eventos
      └── Rondas

Streamer B
 └── Canal B
      ├── Eventos
      └── Rondas
```

Los datos de un canal jamás deben mezclarse con los de otro.

El `channelId`/Twitch user ID debe ser una parte fundamental de las relaciones y autorizaciones.

---

# 27. No sobreingenierizar

Quiero una arquitectura profesional, pero no quiero construir una infraestructura innecesariamente compleja para el MVP.

No agregar:

- Microservicios sin necesidad.
- Kubernetes.
- Arquitecturas distribuidas complejas.
- Colas innecesarias.
- Twitch Extensions.
- Integraciones con OBS.
- Sistemas de IA.
- Funcionalidades premium.
- Pagos.
- Analíticas avanzadas.

Primero hay que conseguir que el flujo principal funcione de extremo a extremo.

---

# 28. Prioridad absoluta

El flujo principal que debe funcionar es:

```text
Streamer inicia sesión con Twitch
        ↓
Streamer crea evento
        ↓
Inicia sugerencias
        ↓
Espectador escribe en Twitch:

!sugerir Elden Ring

        ↓
Twitch
        ↓
Backend
        ↓
Suggestion
        ↓
Dashboard actualizado
        ↓
Finaliza sugerencias
        ↓
Streamer inicia votación
        ↓
Espectador escribe:

!votar Elden Ring

        ↓
Backend
        ↓
Vote
        ↓
Ranking actualizado
        ↓
Finaliza votación
        ↓
Sistema determina ganador
        ↓
Dashboard + Overlay muestran resultado
```

Este flujo debe estar completamente funcional antes de implementar características secundarias.

---

# 29. Desarrollo por fases

Quiero que desarrolles el proyecto incrementalmente.

## Fase 1 — Arquitectura

Antes de escribir grandes cantidades de código:

1. Analiza los requisitos.
2. Define arquitectura.
3. Define entidades.
4. Define relaciones.
5. Define estados.
6. Define APIs.
7. Define flujo Twitch OAuth.
8. Define flujo EventSub.
9. Define comunicación en tiempo real.
10. Define estructura de carpetas.

Explica las decisiones importantes.

---

## Fase 2 — Base del proyecto

Implementar:

- Proyecto.
- TypeScript.
- Frontend.
- Backend.
- Base de datos.
- ORM.
- Variables de entorno.
- Configuración.
- Migraciones.

---

## Fase 3 — Twitch

Implementar:

- Login OAuth.
- Identificación del canal.
- Gestión segura de tokens.
- Suscripción a eventos de chat.
- Recepción de mensajes.

---

## Fase 4 — Motor de eventos

Implementar:

- Event.
- Round.
- Estados.
- Temporizadores.
- Transiciones.
- Reglas de negocio.

---

## Fase 5 — Sugerencias

Implementar todas las reglas descritas.

---

## Fase 6 — Votaciones

Implementar:

- Un voto por usuario.
- No modificar voto.
- Ranking.
- Empates.
- Extensión de votación.

---

## Fase 7 — Tiempo real

Implementar:

- WebSocket.
- Dashboard en tiempo real.
- Overlay en tiempo real.

---

## Fase 8 — UI

Construir:

- Dashboard.
- Gestión del evento.
- Sugerencias.
- Votaciones.
- Resultados.
- Overlay.

---

## Fase 9 — Testing

Crear pruebas para las reglas críticas.

Como mínimo probar:

### Sugerencias

- Usuario puede sugerir una vez.
- Usuario no puede sugerir dos veces.
- Usuario no puede cambiar sugerencia.
- Duplicados.
- Normalización.
- Juego vetado.
- Eliminación.
- Nueva ronda permite volver a sugerir.

### Votos

- Usuario puede votar una vez.
- Usuario no puede votar dos veces.
- Usuario no puede cambiar voto.
- Ranking.
- Empate.
- Extensión.
- Votos originales permanecen.

### Eventos

- Estados válidos.
- Estados inválidos.
- Expiración.
- Evento sin sugerencias.
- Finalización.

---

# 30. Importante: no asumir decisiones que no estén definidas

Si encuentras una decisión funcional importante que no está especificada, antes de implementarla:

1. Identifica la decisión.
2. Explica las alternativas.
3. Recomienda una opción.
4. Si la decisión afecta significativamente a la arquitectura, pregúntame antes de continuar.

Pero NO detengas el desarrollo por decisiones menores.

Para decisiones pequeñas utiliza una opción razonable y documenta la decisión.

---

# 31. Código

El código debe:

- Ser TypeScript limpio.
- Estar modularizado.
- Tener nombres claros.
- Evitar duplicación.
- Separar UI, lógica de negocio e infraestructura.
- Validar inputs.
- Manejar errores correctamente.
- Utilizar tipos fuertes.
- Evitar `any` salvo casos justificados.
- No colocar secretos en el frontend.
- No colocar lógica crítica únicamente en React.

Las reglas de negocio deben estar centralizadas en servicios/backend y ser fáciles de probar.

---

# 32. Resultado esperado

Quiero terminar con una primera versión funcional donde pueda:

1. Entrar con Twitch.
2. Conectar mi canal.
3. Crear un evento.
4. Definir duración.
5. Iniciar sugerencias.
6. Escribir desde el chat de Twitch.
7. Ver cómo aparecen las sugerencias.
8. Eliminar una sugerencia.
9. Ver que el juego eliminado queda vetado.
10. Finalizar sugerencias.
11. Iniciar votación.
12. Votar desde el chat.
13. Ver los votos en tiempo real.
14. Finalizar votación.
15. Ver el ranking.
16. Detectar empates.
17. Añadir un minuto.
18. Determinar el ganador.
19. Mostrar el resultado en el Dashboard.
20. Mostrar el resultado en el Overlay.

---

# 33. Restricción conceptual importante

No confundas estos conceptos:

```text
Twitch
```

es la plataforma externa que proporciona identidad y chat.

```text
Nuestro backend
```

es el cerebro del producto.

```text
Nuestro Dashboard
```

es la herramienta de control del streamer.

```text
Nuestro Overlay
```

es una representación visual del estado.

```text
OBS
```

es simplemente un programa externo que puede mostrar nuestro Overlay.

```text
Twitch Extension
```

queda fuera del MVP.

La arquitectura debe respetar esta separación.

---

# 34. Forma de trabajo

No quiero que simplemente generes una gran cantidad de código de una sola vez.

Trabaja como un desarrollador senior:

1. Analiza.
2. Diseña.
3. Explica.
4. Implementa.
5. Ejecuta pruebas.
6. Corrige errores.
7. Verifica integración.
8. Continúa con la siguiente fase.

Después de cada fase importante, indica:

- Qué se implementó.
- Qué archivos se modificaron.
- Qué decisiones se tomaron.
- Cómo probarlo.
- Qué queda pendiente.

Prioriza siempre tener una aplicación funcional sobre añadir características innecesarias.

---

# Primera tarea

Comienza **únicamente con el análisis técnico y la arquitectura del proyecto**.

Antes de implementar el código, entrégame:

1. Arquitectura general.
2. Stack tecnológico recomendado.
3. Estructura de carpetas.
4. Modelo de datos.
5. Máquina de estados de eventos.
6. Flujo Twitch OAuth.
7. Flujo Twitch EventSub.
8. Flujo de mensajes del chat.
9. Flujo de sugerencias.
10. Flujo de votaciones.
11. Flujo de empate.
12. Diseño de comunicación WebSocket.
13. Endpoints/API necesarios.
14. Estrategia de seguridad.
15. Estrategia de testing.
16. Decisiones que necesitan confirmación antes de comenzar a programar.

**No comiences todavía a implementar todo el proyecto.**

Primero quiero revisar la arquitectura y aprobarla.