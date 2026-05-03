# Habit Timer — Feature Spec

> **Status:** BORRADOR — _feature de Fase 2 del growth roadmap, junto al Coach
> con IA. No implementar hasta completar Fase 1 (bugs + onboarding +
> shareable cards)._
> **Pitch:** _"Esta app cronometra cuánto leés y cuánto entrenás cada día. Al
> final del mes te dice cuántas horas dedicaste a cada hábito"._

## Por qué este feature

Hoy los hábitos se modelan con `targetCount` (repeticiones — "8 vasos de
agua", "3 series de flexiones"). Eso funciona para hábitos discretos pero
**no** para hábitos basados en **tiempo dedicado**:

- "Leer 30 minutos"
- "Ejercitar 45 minutos"
- "Meditar 10 minutos"
- "Estudiar 2 horas"
- "Hacer dibujo 30 minutos"

Para estos, la UX correcta no es _"clickeá +30 veces"_ sino **un cronómetro**
que mide el tiempo real dedicado.

### Por qué importa para growth

Es **content de TikTok puro**:

> _"Esta app me dice que leí 18 horas en abril. Sin tener que anotar nada."_

Combinado con el [Coach con IA](coach-ia-feature.md), genera narrativas
únicas tipo:

> _"En octubre dedicaste 12h a leer y 8h a ejercitar. Tus mejores días de
> productividad fueron los que combinaste ambos hábitos."_

Esa intersección **hábitos cronometrados → reportes con IA** no la tiene
nadie en el mercado.

---

## Concepto

Cada hábito puede operar en **uno de dos modos** (mutuamente excluyentes):

| Modo                      | Campos                       | UX en HabitCard                               |
| ------------------------- | ---------------------------- | --------------------------------------------- |
| **COUNT** (actual)        | `targetCount`                | Botones `+` / `-` para incrementar / decrementar |
| **DURATION** (nuevo)      | `targetDurationMinutes`      | Botón Iniciar / Detener cronómetro            |

Al crear o editar un hábito, el usuario elige el modo con un toggle. El
formulario expone solo los campos relevantes al modo seleccionado.

---

## UX

### HabitForm (crear / editar)

```
┌────────────────────────────────────────────┐
│  Nombre: [Leer 30 min                ]     │
│  Descripción: [...                   ]     │
│  Frecuencia: ( Diario  v )                 │
│                                            │
│  Modo:  ( ● Repeticiones  ○ Tiempo )       │
│                                            │
│  ▼ Si Repeticiones:                        │
│  Meta: [ 1 ] veces                         │
│                                            │
│  ▼ Si Tiempo:                              │
│  Meta: [ 30 ] minutos                      │
│                                            │
│  Color: [picker]                           │
│  [Cancelar]  [Crear]                       │
└────────────────────────────────────────────┘
```

### HabitCard — modo DURATION, timer detenido

```
┌────────────────────────────────────────────┐
│  📖 Leer 30 min                  ⋯         │
│  Diario                                    │
│                                            │
│  🔥 5  ·  15min / 30min        [▶ Iniciar] │
│  ▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░  50%          │
└────────────────────────────────────────────┘
```

### HabitCard — modo DURATION, timer corriendo

```
┌────────────────────────────────────────────┐
│  📖 Leer 30 min                  ⋯         │
│  Diario                       🔴 Recording │
│                                            │
│  🔥 5  ·  15min / 30min      00:07:42      │
│                              [⏸ Detener]   │
│  ▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░  50%          │
└────────────────────────────────────────────┘
```

- **Indicador visual** de que hay timer activo (pulse animation o badge "🔴")
- **Tiempo elapsed** en formato `HH:MM:SS` que ticka cada segundo
- Al detener: se calcula `durationMinutes = round((now - startTime) / 60_000)`
  y se loguea via `useLogHabit` (acumulativo con sesiones previas del día)

### Solo un timer activo a la vez (decisión de UX)

Diseñar para "varios timers en paralelo" complica la UI sin agregar valor
real para un solo usuario. Si el usuario intenta arrancar un segundo timer
mientras hay uno activo, **mostramos un confirm**:

> _"Hay un timer corriendo en 'Leer 30 min'. ¿Querés detenerlo y arrancar
> uno nuevo?"_

---

## Implementación técnica

### Backend (NestJS — repo `habit-sumaq-backend`)

#### Migration

```sql
ALTER TABLE habits
  ADD COLUMN target_duration_minutes INTEGER NULL;

ALTER TABLE habits
  ADD CONSTRAINT habits_mode_xor CHECK (
    (target_count IS NOT NULL AND target_duration_minutes IS NULL) OR
    (target_count IS NULL AND target_duration_minutes IS NOT NULL)
  );
```

> **Decisión**: NO usar un flag `has_timer` separado. El "modo" se deriva de
> qué columna está NOT NULL. La constraint `xor` garantiza consistencia.

```sql
ALTER TABLE habit_logs
  ADD COLUMN duration_minutes INTEGER NULL;

ALTER TABLE habit_logs
  ADD CONSTRAINT habit_logs_metric_xor CHECK (
    (count IS NOT NULL AND duration_minutes IS NULL) OR
    (count IS NULL AND duration_minutes IS NOT NULL)
  );
```

#### Schema updates

- `Habit`:
  - `targetCount: number | null` (antes obligatorio)
  - `targetDurationMinutes: number | null` (nuevo)
  - Computed: `mode: 'COUNT' | 'DURATION'` (derivado, no persistido)
- `HabitLog`:
  - `count: number | null` (antes obligatorio)
  - `durationMinutes: number | null` (nuevo)
- `CreateHabitInput`:
  - Discriminated union: `{ mode: 'COUNT'; targetCount } | { mode: 'DURATION'; targetDurationMinutes }`
- `HabitLogInput`:
  - Discriminated union: `{ count } | { durationMinutes }`

#### Endpoints

- `POST /habits` y `PATCH /habits/:id` aceptan el discriminated union.
- `POST /habits/:id/logs` acepta `count` o `durationMinutes`. El backend
  valida que el modo del log matchee el modo del hábito.
- `GET /habits` y `GET /habits/daily` devuelven los nuevos campos.

#### Tests

- Migration up/down idempotente
- Constraint xor falla con datos inconsistentes
- Endpoint POST log: 422 si el modo no matchea el hábito

### Frontend (web)

#### Entity + schema

```typescript
// src/core/domain/entities/habit.ts
export type HabitMode = 'COUNT' | 'DURATION';

export interface Habit {
  // ... existing fields ...
  targetCount: number | null;
  targetDurationMinutes: number | null;
  // Computed in the API layer or here from the two fields above:
  mode: HabitMode;
}

export interface HabitLog {
  // ... existing fields ...
  count: number | null;
  durationMinutes: number | null;
}
```

#### Active timer state

Persistido en **localStorage** para sobrevivir refresh / cierre de pestaña /
navegación a otra ruta. Estructura:

```typescript
interface ActiveTimer {
  habitId: string;
  habitName: string; // cached for UX (so we don't need to look up the habit)
  startedAt: number; // Date.now() ms
}
```

Solo un timer activo a la vez (singleton key `habit-sumaq:active-timer`).

#### Hook `useActiveTimer`

```typescript
// src/core/application/hooks/use-active-timer.ts
export function useActiveTimer(): {
  active: ActiveTimer | null;
  elapsedSeconds: number; // derivado, ticka cada segundo
  start: (habit: Habit) => void;
  stop: () => Promise<void>; // dispara useLogHabit y limpia localStorage
  cancel: () => void; // limpia localStorage sin loguear (descarta sesión)
};
```

- `start`: si ya hay otro activo, abre confirm (manejado en el componente
  llamador)
- `stop`: calcula `durationMinutes`, llama `useLogHabit.mutate`, limpia
  localStorage en `onSuccess`
- `cancel`: limpia localStorage sin loguear (para "mejor lo tiro")
- Implementación: `setInterval(1000)` solo cuando hay timer activo, usa
  `useSyncExternalStore` para reactividad

#### HabitCard

- Si `habit.mode === 'COUNT'` → comportamiento actual (botones +/-)
- Si `habit.mode === 'DURATION'`:
  - Si **no hay timer activo en este hábito** → botón `▶ Iniciar`
  - Si **hay timer activo en este hábito** → muestra elapsed en vivo +
    botón `⏸ Detener`
  - El display de progreso muestra `15min / 30min` (acumulativo del día)

#### HabitForm

- Toggle `mode: 'COUNT' | 'DURATION'` (radio o segmented control)
- Conditional rendering del input según mode
- `useFieldArray` o lógica simple de mostrar/ocultar
- Validación con discriminated union de Zod

#### Analytics events

```typescript
posthog.capture('habit_timer_started', { habitId, targetMinutes });
posthog.capture('habit_timer_stopped', { habitId, durationMinutes, target });
posthog.capture('habit_timer_canceled', { habitId, elapsedSeconds });
```

---

## Edge cases

| Caso                                     | Comportamiento                                                                                                              |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Refresh durante timer                    | Resume desde `startedAt` en localStorage. Elapsed sigue contando.                                                           |
| Cerrar pestaña + reabrir al día siguiente | Stale timer: si el timer lleva > 12h corriendo, mostrar prompt "¿Detener y loguear las primeras 30 min, o descartar?"        |
| Timer corriendo + cambio de día (medianoche) | El log se asocia al `startedAt.date`. Si el timer cruza medianoche, el día final lo decide la timezone del usuario.    |
| Timer en device A, abrir device B        | Device B no ve el timer (localStorage es per-device). **OK por ahora**. V2: sync en backend si lo piden los usuarios.       |
| Editar hábito mientras corre timer      | Si el usuario cambia el modo de DURATION → COUNT mientras hay timer, el timer se cancela automáticamente (toast warning).   |
| Eliminar hábito mientras corre timer    | Se cancela automáticamente.                                                                                                 |
| User intenta arrancar 2do timer          | Confirm: "Hay un timer corriendo en X. ¿Detenerlo y arrancar uno nuevo?"                                                    |
| Conexión cae al detener                  | Mostrar toast error + persistir el `durationMinutes` calculado en una cola local. Reintenta cuando vuelve la conexión.       |

---

## Roadmap de implementación (cuando llegue Fase 2)

### Sprint 1 — Backend (1-2 semanas)

- Migration con constraint xor
- Schema + DTO updates
- API endpoints
- Tests unitarios + integración

### Sprint 2 — Frontend foundation (1 semana)

- Entity + schema updates
- `useActiveTimer` hook con localStorage + tick
- HabitForm toggle + conditional fields

### Sprint 3 — HabitCard timer UX (1 semana)

- Botón Start / Stop / display elapsed
- Pulse animation + indicador visual
- Confirm para "ya hay timer corriendo"
- Stale timer prompt (>12h)

### Sprint 4 — Polish + analytics (3-5 días)

- Analytics events (Posthog)
- Tests e2e (start, stop, cancel, refresh durante timer)
- i18n: keys en es / en / pt

---

## Riesgos & mitigaciones

| Riesgo                                    | Mitigación                                                                                                          |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Timer drift por sleep del SO (móvil)      | Calculamos elapsed con `Date.now() - startedAt`, no acumulando ticks. Drift = 0.                                    |
| User olvida el timer corriendo            | Stale prompt > 12h + push notification "Tu timer de X lleva 6 horas, ¿lo paramos?" (Fase 2 tardía, requiere Web Push) |
| Cambios de zona horaria mientras corre    | El log se persiste con `startedAt` en UTC. Frontend convierte a la TZ del user para mostrar.                        |
| User reescribe el modo del hábito         | Histórico de logs queda intacto (ambas columnas son nullable). Reportes deben filtrar por modo o agregar ambos.     |
| Backend rechaza el log (ej. modo cambió)  | Toast error + el timer queda en localStorage para reintentar. Cancel manual disponible.                              |

---

## Métricas de éxito

| Métrica                | Meta            | Cómo se calcula                                                                          |
| ---------------------- | --------------- | ---------------------------------------------------------------------------------------- |
| **Adopción del modo**  | >20%            | % de hábitos creados nuevos que usan modo DURATION (vs COUNT)                            |
| **Sesiones por hábito** | >3 / semana    | Promedio de timer sessions registradas por hábito DURATION activo                        |
| **Tasa de completitud** | >50%           | % de timers que llegan a `>= targetDurationMinutes` antes de detenerse                   |
| **Retention boost**    | +5pp D7         | D7 retention de usuarios con ≥1 hábito DURATION vs sin                                   |

---

## Decisiones cerradas

- ✅ **Modo mutuamente excluyente** (COUNT xor DURATION). Simplifica modelo,
  schema y UX.
- ✅ **Solo un timer activo a la vez** (per-device). Multi-timer agrega
  complejidad sin valor para single-user.
- ✅ **localStorage para state activo**, no backend. V1 simple. V2 puede
  agregar sync.
- ✅ **No tracking automático** (estilo "abrió la app por 30 min" → loguea
  ejercicio). Demasiado intrusivo y poco preciso. El usuario controla
  start / stop manualmente.

## Decisiones abiertas

- ❓ ¿Permitir que un hábito tenga AMBOS modos a la vez? (ej. "30 vasos de
  agua y 30 min de meditación"). Por ahora **no** — viola el modelo
  mental. Si lo piden mucho, considerar.
- ❓ ¿Pause / Resume en mid-session? (V1: solo Start / Stop / Cancel. V2:
  Pause si hay demanda)
- ❓ ¿Notificación push cuando se alcanza el target? Requiere Web Push
  (Fase 1 backlog). Combinar con ese feature si llega antes.
- ❓ ¿Timer tipo "Pomodoro" (25min trabajo + 5min break repetido)? Es un
  feature distinto, probablemente merece su propio módulo. Backlog Fase 4.
