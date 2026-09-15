# 24. Interacción mediante el chat de Twitch

La interacción debe ser lo más sencilla posible para los espectadores.

**NO utilizar comandos como `!sugerir` o `!votar`.**

El sistema debe interpretar los mensajes del chat según la fase activa del evento.

---

## Fase de sugerencias

Mientras una ronda se encuentre en estado:

```text
SUGGESTIONS_ACTIVE
```

cualquier mensaje de texto válido enviado por un espectador debe interpretarse como una posible sugerencia de juego.

Ejemplo:

```text
Elden Ring
```

El sistema debe procesarlo como:

```text
Suggestion:
game = "Elden Ring"
user = usuario de Twitch
round = ronda actual
```

Otros ejemplos válidos:

```text
Minecraft
GTA V
Hades
Cyberpunk 2077
```

No es necesario escribir ningún comando especial.

---

## Validación de sugerencias

Cuando llega un mensaje:

```text
Elden Ring
```

el backend debe comprobar:

1. ¿Existe una ronda de sugerencias activa?
2. ¿El usuario ya realizó una sugerencia en esta ronda?
3. ¿El juego está actualmente vetado?
4. ¿El juego ya fue sugerido?
5. ¿El mensaje contiene una sugerencia válida?

Si alguna condición impide aceptar la sugerencia, no debe registrarse.

Las reglas de negocio deben validarse siempre en el backend.

---

# Fase de votación

Cuando la ronda se encuentre en:

```text
VOTING_ACTIVE
```

la interacción cambia.

Los espectadores deben votar escribiendo **únicamente el número correspondiente a la posición del juego en la lista de opciones**.

Ejemplo:

```text
1. Elden Ring
2. GTA V
3. Minecraft
4. Hades
5. Cyberpunk 2077
```

Si el espectador escribe:

```text
3
```

significa:

```text
Votar por Minecraft
```

No necesita escribir el nombre del juego.

---

## Reglas para los votos

Cuando llega un mensaje numérico:

```text
3
```

el backend debe:

1. Comprobar que existe una votación activa.
2. Comprobar que el usuario todavía no ha votado en esta ronda.
3. Interpretar `3` como la posición del juego dentro de las opciones de la ronda.
4. Obtener el `gameId` asociado a esa posición.
5. Registrar el voto utilizando el `gameId`.
6. No permitir que el usuario vuelva a votar.

---

# Importante: la posición no debe ser el identificador del voto

La posición es únicamente una referencia utilizada por el espectador.

Ejemplo:

```text
1. Elden Ring
2. GTA V
3. Minecraft
4. Hades
```

El espectador escribe:

```text
3
```

El backend debe resolver:

```text
position = 3
        ↓
gameId = ID_MINECRAFT
        ↓
Vote(gameId = ID_MINECRAFT)
```

El voto debe almacenar el identificador real del juego y no simplemente el número `3`.

Esto es especialmente importante porque el ranking de votos puede cambiar visualmente durante la votación.

---

# La posición de votación debe permanecer estable

Al comenzar la votación se establece un orden de opciones:

```text
1. Elden Ring
2. GTA V
3. Minecraft
4. Hades
```

Durante la votación los juegos pueden ordenarse visualmente según los votos recibidos:

```text
1. GTA V       10 votos
2. Minecraft    8 votos
3. Elden Ring   5 votos
4. Hades        2 votos
```

Sin embargo, **el número que utilizó el espectador debe continuar haciendo referencia a la posición original de la votación**.

Por tanto:

```text
3
```

seguirá significando:

```text
Elden Ring
```

si Elden Ring era originalmente la opción 3.

No modificar las posiciones de votación durante una ronda activa.

La UI puede mostrar el ranking actualizado de otra manera, pero debe conservarse una asignación estable:

```text
VotingOption
├── position
├── gameId
└── gameName
```

Ejemplo:

```text
position: 3
gameId: abc123
gameName: Elden Ring
```

---

# Mensajes que no deben interpretarse como votos

Durante la fase de votación, únicamente los mensajes que representen una posición válida deben procesarse como votos.

Por ejemplo, si existen 5 juegos:

```text
1
2
3
4
5
```

son posibles votos.

Mensajes como:

```text
Elden Ring
hola
vamos
10
0
-1
abc
```

no deben generar votos.

Los mensajes inválidos deben ignorarse sin generar errores innecesarios ni spam en el chat.

---

# Cambio de comportamiento según la fase

El significado de un mensaje depende de la fase actual.

Durante:

```text
SUGGESTIONS_ACTIVE
```

el mensaje:

```text
Elden Ring
```

puede convertirse en una sugerencia.

Durante:

```text
VOTING_ACTIVE
```

el mismo mensaje:

```text
Elden Ring
```

no genera un voto.

Durante:

```text
VOTING_ACTIVE
```

el mensaje:

```text
3
```

puede convertirse en un voto.

El backend debe determinar siempre el significado del mensaje basándose en el estado actual de la ronda.