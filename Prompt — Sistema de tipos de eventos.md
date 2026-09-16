Quiero implementar una nueva funcionalidad en el sistema de eventos. Actualmente solamente existe un tipo de evento: **“Sugerencias y votos”**. A partir de ahora, el sistema debe permitir seleccionar el tipo de evento que se desea crear y debe adaptar dinámicamente el dashboard y la configuración según el tipo seleccionado.

## OBJETIVO

Convertir el sistema actual en un sistema de eventos extensible, donde cada evento tenga un **tipo de evento (`event_type`)** y cada tipo pueda tener su propia configuración, comportamiento y textos en la interfaz.

Por ahora tendremos dos tipos:

1. **Sugerencias y votos**
2. **Sorteo**

Es importante implementar esto de forma escalable, porque posteriormente se agregarán otros tipos de eventos.

---

# 1. TIPO DE EVENTO

En **Configuración del evento**, agrega como **primera opción** una sección llamada:

**Tipo de evento**

Debe permitir seleccionar:

- Sugerencias y votos
- Sorteo

Actualmente el sistema asume automáticamente que todos los eventos son de “Sugerencias y votos”. Eso debe cambiar.

El tipo seleccionado debe guardarse junto con el evento.

Por ejemplo:

```text
event_type: suggestions_votes
```

o:

```text
event_type: raffle
```

No utilizar solamente el nombre visible como identificador. Utilizar valores internos estables (`suggestions_votes`, `raffle`) y mantener los textos visibles separados para facilitar futuras traducciones o modificaciones.

---

# 2. COMPATIBILIDAD CON LOS EVENTOS EXISTENTES

MUY IMPORTANTE:

No romper los eventos existentes.

Los eventos que ya fueron creados antes de implementar esta funcionalidad probablemente no tengan `event_type`.

Debemos establecer una estrategia de compatibilidad para que esos eventos continúen funcionando como:

```text
event_type = suggestions_votes
```

Es decir, si un evento antiguo no tiene tipo definido, debe tratarse como **Sugerencias y votos**.

No modificar ni eliminar la configuración existente de esos eventos.

---

# 3. DASHBOARD — EVENTO ACTUAL

Actualmente en la parte central del dashboard aparece algo similar a:

**Evento actual - Sugerencias y votos**

Esto actualmente está definido de forma fija porque solamente existe un tipo de evento.

Ahora debe ser dinámico.

Debe mostrar el tipo de evento configurado y guardado.

Ejemplo:

Si:

```text
event_type = suggestions_votes
```

mostrar:

**Evento actual - Sugerencias y votos**

Si:

```text
event_type = raffle
```

mostrar:

**Evento actual - Sorteo**

No dejar el texto “Sugerencias y votos” escrito de forma fija en el dashboard.

El nombre mostrado debe provenir del tipo de evento seleccionado.

---

# 4. ESTADO DEL EVENTO

Mantener el comportamiento actual.

Cuando se crea/configura un evento y todavía no se ha iniciado, debe continuar mostrando:

**Evento en preparación**

Y mantener exactamente el texto:

**Ajusta la configuración en el panel de la derecha e inicia el evento cuando estés listo.**

Este texto no depende del tipo de evento.

Debe seguir apareciendo tanto para:

- Sugerencias y votos
- Sorteo

---

# 5. BOTÓN DE INICIO

El botón de inicio debe adaptarse dinámicamente al tipo de evento.

Actualmente para Sugerencias y votos dice:

**Iniciar sugerencias**

Mantener ese texto para:

```text
event_type = suggestions_votes
```

Para el nuevo evento de Sorteo debe decir:

**Iniciar sorteo**

Por lo tanto:

```text
suggestions_votes → Iniciar sugerencias
raffle → Iniciar sorteo
```

No crear botones independientes ni duplicar innecesariamente el componente.

El botón debe utilizar la información del tipo de evento para determinar su texto y posteriormente su comportamiento.

---

# 6. CONFIGURACIÓN DE SUGERENCIAS Y VOTOS

Las opciones de configuración que actualmente existen para **Sugerencias y votos** son correctas.

NO modificarlas ni eliminarlas.

Cuando:

```text
event_type = suggestions_votes
```

la configuración existente debe mostrarse exactamente como funciona actualmente.

El objetivo es que la incorporación del nuevo tipo de evento no cambie el comportamiento actual.

---

# 7. NUEVO TIPO DE EVENTO: SORTEO

Cuando el usuario seleccione:

**Tipo de evento → Sorteo**

la configuración específica de Sugerencias y votos debe ocultarse y deben aparecer las opciones correspondientes al sorteo.

Por ahora el sorteo tendrá estas configuraciones:

### Duración de inscripción

Permitir establecer cuánto tiempo permanecerá abierta la inscripción de participantes.

Debe existir una configuración para definir la duración.

La implementación puede utilizar las opciones de duración que mejor encajen con el diseño y arquitectura actual del proyecto, pero debe permitir configurar claramente el tiempo de inscripción.

Ejemplos:

- 1 minuto
- 5 minutos
- 10 minutos
- 15 minutos
- 30 minutos
- 1 hora

Si el sistema ya tiene un componente reutilizable para selección de duración, utilizarlo en lugar de crear uno nuevo.

---

### Número máximo de participantes

Agregar una configuración para establecer el número máximo de participantes.

Debe permitir:

**Sin límite**

o establecer un número máximo.

Por ejemplo:

- Sin límite
- 10
- 25
- 50
- 100
- 250
- 500

Si la arquitectura actual permite introducir un número personalizado de forma segura, también puede contemplarse.

El valor debe guardarse dentro de la configuración específica del evento de sorteo.

---

# 8. CONFIGURACIÓN ESPECÍFICA POR TIPO

La configuración del evento debe ser consciente del tipo seleccionado.

Conceptualmente:

```text
Evento
│
├── Información general
│
├── Tipo de evento
│   ├── Sugerencias y votos
│   └── Sorteo
│
└── Configuración específica
    │
    ├── Sugerencias y votos
    │   └── Configuración existente
    │
    └── Sorteo
        ├── Duración de inscripción
        └── Máximo de participantes
```

No mostrar configuraciones que no correspondan al tipo seleccionado.

---

# 9. MODELO DE DATOS

Revisar el modelo actual de eventos y agregar el campo necesario para identificar el tipo.

Por ejemplo:

```text
event_type
```

Valores iniciales:

```text
suggestions_votes
raffle
```

Si el proyecto utiliza TypeScript, crear un tipo/enum apropiado en lugar de utilizar strings arbitrarios por todo el código.

Por ejemplo conceptualmente:

```text
EventType.SUGGESTIONS_VOTES
EventType.RAFFLE
```

La implementación debe respetar las convenciones que ya utiliza el proyecto.

---

# 10. CONFIGURACIÓN DEL SORTEO

No mezclar la configuración del sorteo con las configuraciones de Sugerencias y votos de manera desordenada.

Utilizar la estructura de configuración que mejor encaje con la arquitectura existente.

Conceptualmente:

```text
event
├── event_type
├── status
├── name
└── settings
    └── raffle
        ├── registration_duration
        └── max_participants
```

Pero antes de modificar la estructura, revisar cómo está implementada actualmente la configuración de eventos y reutilizar el patrón existente siempre que sea posible.

NO crear una arquitectura paralela si el proyecto ya tiene una estructura adecuada.

---

# 11. UI DINÁMICA

La interfaz debe reaccionar inmediatamente al cambio de tipo de evento.

Ejemplo:

El usuario abre configuración.

Selecciona:

**Sorteo**

↓

La interfaz muestra las opciones del sorteo.

Si cambia nuevamente a:

**Sugerencias y votos**

↓

La interfaz vuelve a mostrar las opciones existentes de Sugerencias y votos.

El cambio de selección no debe requerir crear un evento nuevo.

---

# 12. GUARDADO

Cuando el usuario presione guardar:

- Guardar el tipo seleccionado.
- Guardar la configuración correspondiente a ese tipo.
- Mantener la configuración anterior de otros tipos si la arquitectura lo considera conveniente, pero no utilizarla mientras el evento tenga otro `event_type`.
- Actualizar el dashboard inmediatamente después de guardar.

Por ejemplo:

Usuario selecciona:

```text
Sorteo
```

Guarda.

El dashboard debe actualizarse a:

**Evento actual - Sorteo**

**Evento en preparación**

**Ajusta la configuración en el panel de la derecha e inicia el evento cuando estés listo.**

**Iniciar sorteo**

---

# 13. ARQUITECTURA EXTENSIBLE

NO implementar esta funcionalidad pensando únicamente en Sorteo.

La arquitectura debe permitir agregar posteriormente nuevos tipos como:

```text
suggestions_votes
raffle
poll
quiz
ranking
tournament
```

sin tener que reescribir completamente el dashboard.

La idea es que exista una relación clara:

```text
EventType
    ↓
Event configuration
    ↓
Event UI
    ↓
Event actions
```

Por ejemplo, conceptualmente:

```text
EventType.SUGGESTIONS_VOTES
    displayName: "Sugerencias y votos"
    startLabel: "Iniciar sugerencias"

EventType.RAFFLE
    displayName: "Sorteo"
    startLabel: "Iniciar sorteo"
```

Utilizar la arquitectura y patrones existentes del proyecto en lugar de introducir una abstracción innecesariamente compleja.

---

# 14. REVISAR EL PROYECTO ANTES DE IMPLEMENTAR

Antes de modificar código:

1. Revisar cómo está estructurado actualmente el evento.
2. Identificar dónde se define el modelo de evento.
3. Identificar dónde se guarda la configuración.
4. Identificar dónde se muestra “Evento actual - Sugerencias y votos”.
5. Identificar dónde se muestra “Iniciar sugerencias”.
6. Identificar el componente actual de configuración del evento.
7. Identificar cómo se maneja actualmente el estado “Evento en preparación”.
8. Identificar qué componentes pueden reutilizarse.
9. Identificar si existen tests relacionados con eventos.
10. Identificar todas las referencias al tipo actual de evento.

No comenzar creando componentes nuevos sin antes revisar la implementación existente.

---

# 15. NO ROMPER FUNCIONALIDAD EXISTENTE

Este punto es prioritario.

La funcionalidad actual de **Sugerencias y votos** debe continuar funcionando exactamente igual después de los cambios.

No modificar innecesariamente:

- lógica de sugerencias
- lógica de votos
- comandos existentes
- conexión con Twitch
- estado del evento
- dashboard existente
- estilos existentes
- componentes que no estén relacionados con esta funcionalidad

Realizar cambios mínimos y bien encapsulados.

---

# 16. TESTING

Después de implementar, comprobar al menos estos escenarios:

### Caso 1 — Evento existente

Un evento antiguo sin `event_type`.

Resultado esperado:

```text
Sugerencias y votos
```

y debe continuar funcionando.

### Caso 2 — Crear Sugerencias y votos

Seleccionar:

**Sugerencias y votos**

Guardar.

Resultado:

**Evento actual - Sugerencias y votos**

Botón:

**Iniciar sugerencias**

Configuración existente visible.

### Caso 3 — Crear Sorteo

Seleccionar:

**Sorteo**

Configurar:

- duración de inscripción
- máximo de participantes

Guardar.

Resultado:

**Evento actual - Sorteo**

Botón:

**Iniciar sorteo**

Configuración del sorteo visible.

### Caso 4 — Cambiar de tipo

Seleccionar Sorteo → guardar → comprobar dashboard.

Después cambiar a Sugerencias y votos → guardar → comprobar que el dashboard vuelve a mostrar:

**Evento actual - Sugerencias y votos**

Y que la configuración existente sigue intacta.

### Caso 5 — Recargar

Después de guardar un Sorteo, recargar completamente la aplicación.

El sistema debe seguir mostrando:

**Evento actual - Sorteo**

No debe volver automáticamente a Sugerencias y votos.

---

# 17. IMPORTANTE SOBRE EL ALCANCE

En esta implementación estamos agregando **el tipo de evento Sorteo y su configuración**, pero no necesariamente toda la lógica interna del sorteo todavía.

El objetivo de este cambio es:

1. Permitir seleccionar el tipo de evento.
2. Guardar el tipo.
3. Mostrar dinámicamente el tipo en el dashboard.
4. Mostrar la configuración correspondiente.
5. Adaptar el botón de inicio.
6. Agregar la configuración inicial del sorteo.
7. Mantener intacto Sugerencias y votos.
8. Dejar una base sólida para implementar posteriormente la lógica completa del sorteo.

Si parte de la lógica del sorteo ya existe en el proyecto, reutilizarla; de lo contrario, no inventar funcionalidades adicionales que no hayan sido solicitadas.

---

## RESULTADO ESPERADO

Al finalizar, el sistema debe dejar de pensar:

> “Todos los eventos son Sugerencias y votos”

y pasar a pensar:

> “Cada evento tiene un tipo y ese tipo determina su configuración, presentación y acciones.”

La implementación debe ser limpia, reutilizable, mantenible y preparada para agregar nuevos tipos de eventos en el futuro.

Antes de terminar, revisar el código modificado y eliminar cualquier lógica duplicada o solución temporal que pueda dificultar la incorporación de nuevos tipos de eventos.