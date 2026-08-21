# Reglas de Negocio — Frontend

Reglas que el frontend debe conocer para construir la UI correctamente y prevenir errores antes de enviar requests.

---

## Cuentas

1. **Nombre único por usuario.** No pueden existir dos cuentas con el mismo nombre para el mismo usuario.
2. **Balance negativo** solo está permitido en cuentas tipo `credit_card`.
3. **`type` y `currency` no son editables** después de la creación.
4. **No se puede eliminar** una cuenta que tenga transacciones activas (no eliminadas).
5. **Archivar ≠ eliminar.** Una cuenta archivada sigue existiendo y sus transacciones son visibles, pero no debería mostrarse como opción para nuevas transacciones.
6. **El balance se calcula automáticamente** por el backend. No enviar balance en creación/edición.
7. **`initialBalance`** solo se usa al crear la cuenta. Después, el balance se gestiona exclusivamente mediante transacciones.

---

## Categorías

1. **Nombre único por usuario + tipo.** Puede existir "Alimentación" como EXPENSE y "Alimentación" como INCOME, pero no dos "Alimentación" EXPENSE.
2. **`type` no es editable.** Una categoría INCOME no puede cambiar a EXPENSE.
3. **Categorías por defecto** (`isDefault=true`) no se pueden eliminar ni modificar el tipo. Vienen precreadas para cada usuario.
4. **Soft delete.** Las categorías eliminadas dejan de aparecer en la lista pero las transacciones que las referencian mantienen el `categoryId`.

### Inline category creation

Cualquier formulario que tenga un `<select>` de categoría **DEBE** ofrecer creación inline ("+ Crear nueva categoría") junto al campo. La meta es que el usuario nunca tenga que abandonar el flujo en el que está (registrar una transacción, agregar un movimiento a un presupuesto, crear un servicio mensual, etc.) solo porque la categoría que necesita todavía no existe.

Reglas:

1. **Usar `<CategorySelectField>`** (`src/presentation/features/categories/CategorySelectField.tsx`) en vez de un `<Select>` crudo. Encapsula label + Select + botón "+ Crear nueva" + el `<CategoryForm>` modal + auto-select tras crear.
2. **Filtro por tipo es obligatorio.** El componente recibe `categoryType` y filtra el dropdown a ese tipo (INCOME o EXPENSE). Ese mismo `categoryType` se pasa al `defaultType` del `CategoryForm` para que el usuario no tenga que cambiarlo manualmente en el caso normal.
3. **Auto-select tras crear.** Una vez creada la categoría, debe quedar pre-seleccionada en el form padre (`field.onChange(created.id)`). El usuario no tiene que volver a abrir el dropdown.
4. **El modal no roba el contexto.** El `CategoryForm` se monta encima del form padre y al cerrarse el padre sigue intacto (con la nueva categoría seleccionada). No descartar el form padre cuando se abre el modal.
5. **El i18n key vive en `categories.createNew`**, no en el namespace del form padre — es un componente genérico, no propiedad de transacciones.

> Si vas a agregar un nuevo form que pickea categoría: usá `<CategorySelectField>` directamente. No copiar la lógica.

---

## Transacciones

### Tipos y su efecto

| Tipo       | Efecto en balance               | Requiere               |
| ---------- | ------------------------------- | ---------------------- |
| `INCOME`   | Suma a la cuenta                | —                      |
| `EXPENSE`  | Resta de la cuenta              | —                      |
| `TRANSFER` | Resta de origen, suma a destino | `destinationAccountId` |
| `DEBT`     | **Ninguno**                     | `reference`            |
| `LOAN`     | **Ninguno**                     | `reference`            |

### Reglas generales

1. **`amount` siempre positivo** (mín `0.01`). El backend maneja el signo según el tipo.
2. **Máximo 2 decimales** en `amount`.
3. **`type` no es editable** después de crear la transacción.
4. **Al editar `amount`**, el backend recalcula automáticamente el balance de la cuenta (revierte el monto anterior y aplica el nuevo).

### TRANSFER

1. **`destinationAccountId` es requerido** y debe ser diferente de `accountId`.
2. **Ambas cuentas deben tener la misma moneda.** No hay conversión automática.
3. Al eliminar una transferencia, se revierten ambos balances (origen y destino).

### DEBT y LOAN

1. **`reference` es requerido.** Indica a quién le debemos (DEBT) o quién nos debe (LOAN). Ej: "Juan Pérez", "Empresa X".
2. **No afectan el balance** de la cuenta al crearse.
3. Se crean con `status=PENDING` y `remainingAmount=amount`.
4. **`reference` es opcional** para los otros tipos (INCOME, EXPENSE, TRANSFER) pero está disponible si se quiere registrar contexto.

### Liquidaciones (settle)

1. **Solo se pueden liquidar** transacciones DEBT o LOAN.
2. **Liquidación parcial:** se puede liquidar cualquier monto entre `0.01` y `remainingAmount`.
3. **DEBT → EXPENSE:** Liquidar una deuda crea un gasto que debita la cuenta de pago.
4. **LOAN → INCOME:** Liquidar un préstamo crea un ingreso que acredita la cuenta de cobro.
5. **`status` cambia a SETTLED** cuando `remainingAmount` llega a `0`.
6. **No se puede liquidar** una transacción que ya tiene `status=SETTLED`.
7. La liquidación **hereda** `categoryId` y `reference` del DEBT/LOAN original.
8. Si no se envía `description`, el backend genera una automáticamente (ej: "Pago de deuda: Almuerzo Juan").
9. Si no se envía `date`, usa la fecha actual.

### Restricciones de edición

1. **SETTLED bloquea edición.** Una transacción DEBT/LOAN con `status=SETTLED` no se puede modificar (PATCH).
2. Las liquidaciones (transacciones con `relatedTransactionId`) se comportan como EXPENSE/INCOME normales para edición.

### Date display

Cualquier surface que renderice una **fecha calendario** del usuario (fecha de transacción, movimiento, hábito, chore, etc.) **DEBE** respetar la preferencia `userSettings.dateFormat` (`DD/MM/YYYY` / `MM/DD/YYYY` / `YYYY-MM-DD`). Reglas:

1. **Single source of truth**: usar el hook `useDateFormat()` (`@/core/application/hooks/use-user-settings`) para leer la preferencia. No leer `useUserSettings().data?.dateFormat` manualmente — la cadena `settings?.dateFormat ?? 'YYYY-MM-DD'` ya vive dentro del hook.
2. **Render**: pasar el resultado a `formatDate(date, dateFormat)` (`@/lib/format`). El helper acepta tanto `YYYY-MM-DD` como ISO completo (`YYYY-MM-DDTHH:mm:ss.sssZ`) — no hace falta slicear antes.
3. **Prohibido**: `new Date(x).toLocaleDateString()` (lee la locale del navegador, ignora la pref del usuario), `${day}/${month}/${year}` hardcoded, o cualquier `Intl.DateTimeFormat` con shape de fecha calendario. Si no te respeta el `dateFormat`, está mal.

**Excepciones legítimas** (no son fechas calendario del usuario — no aplica la regla):

- **Labels de heatmap / calendar**: nombre corto de mes ("Apr"), letra de día ("M"), tooltip "Lunes, 3 de abril" — son labels de locale para visualización, no la fecha de un evento del usuario. Usar `Intl.DateTimeFormat(locale, { ... })` directamente.
- **Reloj en vivo**: `new Date().toLocaleTimeString()` para mostrar la hora actual es válido — no es una fecha de dato.
- **Período `YYYY-MM`** (servicios mensuales, presupuestos): usar `formatPeriodLabel(period, locale)`.

### Transaction display title

Cualquier surface que renderice una transacción (lista global, movimientos de presupuesto, historial de servicios, reportes, etc.) **DEBE** usar el helper `getTransactionDisplayTitle` (`src/lib/transaction-title.ts`) para el título. Tres capas, en orden:

1. `transaction.description` — lo que el usuario escribió.
2. Nombre de la categoría — "Comida", "Sueldo", "Servicios"…
3. Label localizado del tipo — `t('transactions.types.${type}')` ("Gasto", "Ingreso", "Transferencia"…).

Reglas:

1. **No renderizar un placeholder genérico** ("Sin descripción", "No description", "—") cuando hay categoría. La mayoría de las transacciones tienen una categoría que ya las nombra bien — usarla.
2. **El helper es locale-agnostic.** Recibe `getTypeLabel: (type) => string` para que el caller resuelva el `t(...)` y el helper quede trivialmente testeable.
3. **Surfaces que rendericen una lista de transacciones** deben tener acceso a las categorías (vía `useCategories()` + lookup `Map<id, category>`). Cargar las categorías una sola vez en el padre y reutilizar el lookup — no llamar `useCategories()` por card.

### Eliminación y cascadas

1. **Eliminar DEBT/LOAN:** Elimina automáticamente **todas** las liquidaciones asociadas y revierte sus efectos en balance.
2. **Eliminar una liquidación:** Revierte el balance Y restaura el `remainingAmount` del DEBT/LOAN original (puede volver a PENDING si estaba SETTLED).
3. **Eliminar INCOME/EXPENSE:** Revierte el efecto en balance.
4. **Eliminar TRANSFER:** Revierte ambos balances (origen y destino).

---

## Hábitos

1. **Nombre único por usuario.** No pueden existir dos hábitos activos con el mismo nombre.
2. **`targetCount` ≥ 1.** La cantidad objetivo debe ser al menos 1.
3. **Un log por hábito por fecha.** Si se envía un log para una fecha que ya tiene registro, se actualiza (upsert).
4. **No se pueden registrar logs en fechas futuras.**
5. **No se pueden registrar logs en hábitos archivados.** Desarchivar primero.
6. **`completed` se calcula automáticamente:** `count >= habit.targetCount`.
7. **`count` se limita a `targetCount`.** Si se envía un valor mayor, el backend lo guarda como `targetCount`. El frontend debería deshabilitar el check-in cuando `count >= targetCount`.
8. **Archivar ≠ eliminar.** Un hábito archivado mantiene su historial pero no aparece en el resumen diario.
9. **Eliminar un hábito elimina todos sus logs asociados.**
10. **Fechas como string `YYYY-MM-DD`.** El campo `date` de los logs se envía y recibe como string (no como `Date` ni ISO 8601 con hora). Esto evita errores de zona horaria.

### Estadísticas (computadas por el backend)

| Campo             | Descripción                                                   |
| ----------------- | ------------------------------------------------------------- |
| `currentStreak`   | Períodos consecutivos completados hasta hoy (o desde ayer si hoy no está completado) |
| `longestStreak`   | Máximo streak en los últimos 30 días                          |
| `completionRate`  | Porcentaje de días (daily) o semanas (weekly) completados en los últimos 30 días |
| `todayLog`        | Log de hoy, `null` si no existe                               |
| `periodCount`     | Conteo acumulado en el período actual: para DAILY es `todayLog.count`; para WEEKLY es la suma de counts de la semana (lunes a domingo) |
| `periodCompleted` | `true` si `periodCount >= targetCount`. Indica si la meta del período ya se cumplió |

### Progreso por período

- **Hábitos DAILY:** `periodCount` = count de hoy. Equivale a `todayLog?.count ?? 0`.
- **Hábitos WEEKLY:** `periodCount` = suma de counts de todos los logs de la semana ISO actual (lunes a domingo). Un hábito semanal puede tener `todayLog` null o con count 0 y aún así `periodCompleted = true` si la cuota semanal ya se cumplió en otros días.
- **Barra de progreso:** usar `Math.min(periodCount / periodTarget, 1)` para el cálculo visual.
- **Check-in habilitado:** permitir check-in solo si `periodCount < periodTarget` (para WEEKLY) o `todayLog.count < periodTarget` (para DAILY).

### Plan de recuperación del budget

`recovery.zeroSpendDays` y `recovery.halfSpendDays` vienen en **`null`** cuando ese plan no
entra en los días que quedan del mes. Se validan por separado: el de la mitad es el doble de
largo, así que se queda sin mes antes.

| Estado | Qué renderizar |
| ------ | -------------- |
| `zeroSpendDays: 0` | **Nada.** Estás en ritmo o adelantado; un plan de 0 días es ruido |
| ambos con número | "N días sin gastar **o** 2N días gastando la mitad" |
| solo `zeroSpendDays` | Solo esa cláusula — la de "o ... la mitad" se omite entera |
| ambos `null` | "El diario inicial ya no se recupera este mes" |
| `recovery: null` | Mes cerrado — nada |

Ojo: `0` y `null` son respuestas distintas y no se pueden colapsar.

### Objetivo por día (`periodTarget`)

El denominador que se renderiza es **siempre `periodTarget`**, nunca `habit.targetCount`.

- **DAILY:** `periodTarget` es el objetivo del día que se está mirando, no el default del hábito. El backend lo snapshotea en `habit_logs.targetCount` al escribir el log, así que un día terminado conserva su denominador: subir el objetivo del hábito de 3 a 4 no convierte los días ya completos en `3/4`.
- **WEEKLY:** `periodTarget` es el `targetCount` del hábito — el objetivo pertenece a la semana, no a un día.
- **Edición:** el denominador es editable inline (stepper) solo para hábitos **DAILY no archivados**. Ajustarlo re-envía el log de ese día con el count actual y el nuevo `targetCount`, por lo que se puede corregir un día pasado sin re-estampar el resto.
- **Bajar el objetivo trunca el count:** el backend aplica `Math.min(count, targetCount)`. La UI espeja ese cap en el optimistic update.
- **Heatmap:** cada celda se colorea contra el `targetCount` de su propio log; el prop `fallbackTarget` solo cubre días sin log. Esto depende de que `HabitLogResponseDto` exponga `targetCount` — sin ese campo en el wire, todas las celdas caen al default del hábito y el pasado se repinta.

### Vista diaria (`GET /habits/daily`)

- Solo muestra hábitos activos (no archivados).
- Incluye stats, el log de hoy y los campos `periodCount`/`periodCompleted` para cada hábito.
- Ideal como pantalla principal para check-in diario.

---

## Tareas — estados

`PENDING → IN_REVIEW → DONE`. Reemplaza al booleano `completed`, que necesitaba un tercer
valor: "la terminé pero la estoy validando".

**Control**: un solo checkbox por fila que **cicla** en ese orden. `IN_REVIEW` se pinta con
`indeterminate`, que significa literalmente "parcialmente hecho". El `aria-label` nombra el
estado al que **va a mover** el click, no en el que está, así que el próximo click nunca se
adivina.

**Agrupación**: cada sección lista pendientes → **En validación** (con su propio encabezado) →
hechas. El grupo del medio existe justamente para poder VER qué estás verificando; plegarlo
dentro de cualquiera de los vecinos anularía la feature.

**Lo que no se puede colapsar**: el cleanup semanal borra físicamente las tareas `DONE`. Una
tarea en validación tiene que sobrevivir ese barrido, así que `completedAt` se sella **solo**
al entrar a `DONE` y se limpia al salir — incluso volviendo a `IN_REVIEW`. El optimistic
update del hook espeja esa misma regla.

---

## Quehaceres (Chores)

1. **Cadencia inmutable.** `intervalValue` y `intervalUnit` no son editables después de la creación. Para cambiar el ritmo, se borra el chore y se crea uno nuevo, o se mueve `nextDueDate` manualmente.
2. **`nextDueDate` editable manualmente** desde el form de edición. Sirve para "reanclar el ritmo" sin crear un log de done falso.
3. **Marcar como hecho** crea un `ChoreLog` con `doneAt` (default = hoy en TZ del usuario), avanza `lastDoneDate` y recalcula `nextDueDate` sumando el intervalo. Acepta una `note` opcional (≤ 500 chars).
4. **Saltear ciclo** avanza `nextDueDate` sin crear log. Útil para ciclos que no corresponden (mudanza, vacaciones).
5. **Estados derivados client-side** en la TZ del usuario:
   - `overdue` — `nextDueDate < hoy`
   - `upcoming` — `nextDueDate ∈ [hoy, hoy + 7d]`
   - `horizon` — `nextDueDate > hoy + 7d`
   El backend solo expone `isOverdue`; el resto se calcula con `getChoreStatus()` (`src/lib/chore-status.ts`).
6. **Archivado (`isActive=false`) ≠ eliminado.** Mantiene historial y puede desarchivarse.
7. **DELETE está bloqueado si el chore tiene logs** (error `CHRE_001`). Mostrar el CTA "Archivar" como alternativa.
8. **Categoría es free-text.** El form ofrece autocompletado con un `<datalist>` poblado desde las categorías ya usadas por el usuario, pero acepta cualquier string ≤ 50 chars.
9. **Las fechas (`startDate`, `nextDueDate`, `lastDoneDate`, `doneAt`) viajan como `YYYY-MM-DD`** directo al backend. Los chores no usan el helper `dateInputToBackendIso` — el backend acepta el día calendario nativo en estos endpoints.

---

## Recordatorios

Algo que hay que hacer **una vez**, opcionalmente en una fecha, opcionalmente a una hora.
Es el módulo que faltaba: ni Prioridades ni Tareas tienen campo de fecha, y Quehaceres es
recurrente por diseño (completarlo corre la próxima fecha).

### Las tres formas

| `remindDate` | `remindTime` | Significado |
| ------------ | ------------ | ----------- |
| null | null | Nota suelta. Se lista, **nunca alerta** — avisar de algo que el usuario todavía no agendó castiga anotar cosas. |
| definida | null | Toca ese día, a cualquier hora. |
| definida | definida | Toca ese día, **a partir de** esa hora. |

Hora sin fecha **no es una cuarta forma**: una hora sola no dice nada sobre cuándo pasa algo
que pasa una vez. El backend la rechaza (`RMDR_008`), el form deshabilita el campo de hora
mientras no haya fecha, y borrar la fecha borra la hora con ella.

### Estado vs. alerta

El estado de la lista es **solo por fecha**: `overdue` / `today` / `upcoming` / `undated` / `done`.
La hora gatilla la **alerta**, no el estado — un recordatorio de las 23:00 sigue siendo algo
que tenés que hacer hoy, y una lista que lo llamara "Próximo" hasta las 23:00 estaría mintiendo
sobre tu día.

La hora aplica **solo el día para el que se fijó**. Pasado ese día el recordatorio está
simplemente atrasado, todo el día. Si no fuera así, uno de las 23:00 de la semana pasada se
escondería cada mañana y reaparecería a las 23:00 — que es exactamente cómo se pierde.

### Orden de la lista

Por accionabilidad: `overdue` → `today` → `upcoming` → `undated` → `done`. Dentro del bucket,
por fecha ascendente, así que **el atrasado más viejo va primero** (el que más venís esquivando).
Los empates se rompen por hora, y los sin hora van antes porque vencen desde el arranque del día.

---

## Presupuestos

1. **Uno por (usuario, año-mes, moneda).** El backend rechaza un segundo con esa misma terna.
2. **`currency` es inmutable** después de crear. En edit el form no expone el campo.
3. **Solo movimientos explícitos cuentan en `spent`.** El budget NO lee todos los `EXPENSE` del mes — solo los que se loggean contra él vía `POST /budgets/:id/movements` (que setea `transactions.budgetId`). Esto deja al usuario separar "gastos discrecionales" del resto.
4. **Soft-delete nullifica `budgetId` en las transactions** del budget. Los gastos sobreviven como transacciones normales — la plata ya se movió, no se "deshace".
5. **El picker de fecha del movimiento se clampea al mes del budget** (`min` = 1 del mes, `max` = último día). El backend valida con `BDGT_003` por defensa.
6. **El picker de cuenta filtra por `currency === budget.currency`** — no hay conversión automática.

### Locked-day allowance (UX del dashboard)

El número grande del dashboard de Budget es **"Disponible hoy"**, NO "Disponible total". La distinción es load-bearing:

- **Hoy tiene un pool fijo** `A = (amount - spent_hasta_ayer) / daysRemainingIncludingToday`. Calculado al inicio del día calendario en la TZ del usuario y **bloqueado por todo el día**.
- **"Disponible hoy" = `A - spent_hoy`**. Cambia con cada movimiento que loggees hoy.
- **"Resto del mes" = `(amount - spent_hasta_ayer) - A`**. **NO cambia** cuando gastás hoy — eso es lo importante. El plan futuro no se re-spread en tiempo real.
- **Al cruzar la medianoche** en TZ del usuario, `A` se recalcula con el nuevo `spent_hasta_ayer`. Si gastaste menos que `A` viejo, el `A` nuevo es mayor (carryforward implícito). Si gastaste más, es menor (eats into future).
- **Overspend hoy** marca el headline en rojo pero NO recorta el plan futuro hasta mañana — es señal visual, no penalización inmediata.

Toda la matemática vive en `src/lib/budget-kpi.ts` (`getBudgetSpendBreakdown`, `getBudgetMonthHistory`, `getDailySpendHistory`). Pura, locale-agnostic, deriva todo de `budget.movements` + `budget.currentDate` (no lee reloj).

### Layout: cuándo aplica el modelo

| Estado del budget | Layout |
|---|---|
| Mes corriente, días restantes > 0 | **Locked-day** (hero "Disponible hoy" + breakdown desglosable) |
| Mes cerrado (`daysRemainingIncludingToday = 0`) | Simple — hero "Disponible" con `remaining`, `dailyAllowance = null` |
| Mes futuro (`currentDate` < primer día del budget) | Simple — el concepto de "hoy" no aplica |

### Breakdown desglosable

Cuando el budget está activo, el usuario puede expandir un panel con:
- **Promedio diario real** (hasta ayer, `spent_hasta_ayer / días_transcurridos`)
- **Objetivo diario original** (`amount / días_del_mes`)
- **Diff vs original** (signo + emoji para señalar si va por debajo/encima del plan)
- **Últimos 7 días** como mini bar chart, con línea de referencia en `A` y barra roja cuando ese día se pasó

---

## Servicios mensuales

1. **Nombre único por usuario para servicios activos.** No pueden existir dos servicios activos con el mismo nombre.
2. **`currency` es inmutable** después de la creación. En edit el form no expone el campo.
3. **`startPeriod` es inmutable** después de la creación. Solo sirve para marcar el primer período facturable.
4. **`estimatedAmount` y `dueDay` son opcionales.** `dueDay` (1-31) es solo informativo, se usa para ordenar/recordar — no dispara alertas automáticas.
5. **Pagar un servicio genera un `EXPENSE`** contra `accountIdOverride ?? defaultAccountId` y avanza `lastPaidPeriod` al período cubierto. El balance de la cuenta se actualiza.
6. **Saltear un mes avanza `lastPaidPeriod`** sin crear transacción. Útil para meses en los que el servicio no corrió (mudanza, vacaciones).
7. **Estados derivados del backend (en la timezone del usuario):**
   - `isOverdue` — `nextDuePeriod` < mes actual
   - `isPaidForCurrentMonth` — `lastPaidPeriod === mes actual`
   - Pendiente normal — ninguno de los dos
8. **Archivado (`isActive=false`) ≠ eliminado.** Mantiene historial de pagos y puede desarchivarse. No aparece en la vista "Activos".
9. **DELETE está bloqueado si el servicio tiene transacciones asociadas** (error `MSVC_001`). Mostrar el CTA "Archivar" como alternativa.
10. **El picker de cuenta en `PayMonthlyServiceForm` filtra por `currency === service.currency`** — no hay conversión automática.

---

## Monedas y balance

1. **Las transferencias requieren misma moneda.** Si cuenta A es PEN y cuenta B es USD, no se puede transferir entre ellas.
2. **El balance se muestra con la moneda de la cuenta.** No hay conversión.
3. **Precisión:** todos los montos usan 2 decimales (`NUMERIC(15,2)` en DB).

---

## Favoritos en nav

Los favoritos manejan dos cosas:

- **Mobile bottom nav:** 4 slots elegibles por el usuario + Settings fijo al final. Cuando el usuario tiene menos de 4 favoritos guardados, los slots vacíos se renderizan como placeholders con un ícono de estrella (no son links — long-press abre el picker para asignar).
- **Desktop sidebar:** la sidebar sigue mostrando TODOS los módulos, pero los marcados como favorito muestran una ⭐ pequeña al lado del label. El layout no cambia.

### Reglas

1. **Cap duro: 4 favoritos máximo.** Backend lo enforza con `@ArrayMaxSize(4)` + SQL `CHECK`. Frontend deshabilita el botón "marcar como favorito" cuando se llegó al máximo (el usuario tiene que sacar uno primero).
2. **Settings NO es favoritable.** Está fijo en mobile (siempre como último slot) y en sidebar (siempre al pie). El registry de `nav-registry.ts` lo excluye explícitamente.
3. **Array vacío es válido.** Si el usuario saca todos sus favoritos, la mobile nav queda solo con el slot de Settings + 4 placeholders. UX honesta — "no marcaste nada todavía".
4. **Single source of truth:** `src/lib/nav-registry.ts`. Mapea cada `FavoriteKey` a su `{ href, labelKey, icon }`. Toda surface que renderice favoritos pasa por acá.
5. **Forward-compat con renames/removes:** `getNavEntries(keys)` filtra silenciosamente las keys que no estén en el registry. Un usuario con un favorito "ancient" que ya no existe simplemente ve ese slot como placeholder hasta que reconfigure — nada crashea.
6. **Persistencia:** `user_settings.favoriteKeys: string[]`. Sincroniza entre devices. Backend no valida el contenido contra un set conocido (las keys son free-form strings) — eso desacopla los repos. Si se agrega o renombra una ruta en frontend, no hace falta migration de backend.

### UX writes

| Path | Trigger |
|---|---|
| Mobile slot | Long-press → modal "Cambiar favorito" → pick → swap o replace |
| Sidebar item | Right-click → toggle on/off |
| Settings page | Sección "Favoritos del menú" con grid de toggles |

Los tres paths escriben al mismo `favoriteKeys`. La invalidación del query de settings refresca todos los consumers al instante.

---

## Configuración de usuario

1. **Auto-creación.** La configuración se crea automáticamente con valores por defecto la primera vez que se consulta (`GET`) o actualiza (`PATCH`). No es necesario un endpoint de creación.
2. **Relación 1:1 con usuario.** Cada usuario tiene exactamente una configuración.
3. **Todos los campos son opcionales** en el PATCH. Solo se modifican los campos enviados.
4. **`defaultCurrency`** indica la moneda sugerida al crear nuevas cuentas. No cambia la moneda de cuentas existentes.
5. **`theme: system`** significa que el frontend debe respetar la preferencia del sistema operativo (`prefers-color-scheme`).
6. **`dateFormat`** es una preferencia de presentación. El backend siempre envía fechas en ISO 8601 — el frontend debe formatearlas según esta configuración.
7. **`startOfWeek`** afecta calendarios y vistas semanales en el frontend.

---

## Autenticación

1. **Google OAuth es el único método de login.**
2. **Access token** se envía en header `Authorization: Bearer <token>`. Expira en 15 minutos.
3. **Refresh token** se maneja automáticamente via cookie `HttpOnly`. Expira en 7 días.
4. **Rate limit en refresh:** máximo 10 requests por 60 segundos.
5. Al hacer **logout**, el refresh token se revoca y la cookie se elimina.
