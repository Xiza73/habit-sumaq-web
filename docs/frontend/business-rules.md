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
- **Barra de progreso:** usar `Math.min(periodCount / targetCount, 1)` para el cálculo visual.
- **Check-in habilitado:** permitir check-in solo si `periodCount < targetCount` (para WEEKLY) o `todayLog.count < targetCount` (para DAILY).

### Vista diaria (`GET /habits/daily`)

- Solo muestra hábitos activos (no archivados).
- Incluye stats, el log de hoy y los campos `periodCount`/`periodCompleted` para cada hábito.
- Ideal como pantalla principal para check-in diario.

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
