# Coach Personal con IA — Feature Spec

> **Status:** BORRADOR — _feature insignia para Fase 2 del growth roadmap.
> No implementar hasta completar Fase 1._
> **Pitch:** _"esta app te dice cómo tus hábitos afectan tus finanzas"._

## Por qué esto y no otra cosa

Habit Sumaq combina **finanzas + hábitos + tareas** en una sola app. Esa
intersección **es el moat** — ningún competidor (YNAB, Habitica, Notion,
Todoist) lo tiene. Hay que **explotarlo**.

El Coach con IA es la materialización de esa promesa: un reporte mensual
donde el LLM analiza la data del usuario y le devuelve insights que **nadie
más puede darle**.

---

## Concepto

Cada inicio de mes, el sistema genera automáticamente un reporte personal
para cada usuario premium con:

1. **Insights**: patrones detectados cruzando finanzas + hábitos + tareas.
2. **Recomendaciones**: acciones concretas para el mes siguiente.
3. **Logros**: rachas alcanzadas, mejoras vs mes anterior.
4. **Proyecciones** (opcional): si seguís así, ¿qué pasa al fin de año?

---

## Ejemplo del output

> 📊 **Coach personal — Octubre 2026**
>
> 🔍 **Insights:**
>
> - Gastaste **45% más** en delivery este mes ($420 vs $290 en septiembre).
>   Coincide con que **fallaste 8 días tu hábito de "Cocinar en casa"**.
> - Cuando registraste tu hábito de **ejercicio**, gastaste en promedio **18%
>   menos** en "Salidas" ese mismo día. Patrón consistente: cuando entrenás,
>   salís menos.
> - **Tu mejor semana del mes** fue la del 8-14: cumpliste el 92% de hábitos
>   Y tuviste el menor gasto discrecional ($85).
>
> 🎯 **Recomendaciones:**
>
> - Si recuperás el hábito "Cocinar en casa" en noviembre, proyectamos un
>   ahorro de ~$130.
> - Tu categoría "Salidas" superó el presupuesto el día 22 — antes de que
>   termine el mes próximo, configurá una alerta al 80%.
>
> 🏆 **Logro del mes:**
>
> - Tu racha más larga: 12 días consecutivos en "Leer 30 min" 📚

---

## Por qué es premium-worthy

1. **Único en el mercado**: la intersección hábitos + finanzas + tareas no
   existe en competidores.
2. **Genera urgencia recurrente**: _"ya viene el reporte de noviembre"_ → la
   gente abre la app a fin de mes esperándolo.
3. **Costo unitario ridículo**: ~$0.04-0.05 USD/mes por usuario premium.
4. **Margen brutal**: a $5/mes premium, esto cuesta < 1% del revenue.
5. **Factible solo / equipo chico**: no requiere infra exótica, solo cron
   job + LLM call + persistencia.

---

## Implementación técnica

### Backend (NestJS)

#### Schedule

- Cron job mensual: ejecuta el día 1 de cada mes a las 06:00 UTC.
- Por cada usuario premium activo:
  1. Recolecta datos del mes pasado (queries SQL a `transactions`,
     `habit_logs`, `tasks`, `chores`)
  2. Construye el prompt estructurado (ver "Prompt engineering" abajo)
  3. Llama a Claude API
  4. Persiste el reporte en `monthly_insights` table

#### Schema

```sql
CREATE TABLE monthly_insights (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  period_start  date NOT NULL,         -- primer día del mes analizado
  period_end    date NOT NULL,         -- último día del mes analizado
  insights      jsonb NOT NULL,        -- output estructurado del LLM
  raw_response  text,                  -- respuesta cruda para debugging
  generated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, period_start)
);

CREATE INDEX idx_monthly_insights_user_period
  ON monthly_insights (user_id, period_start DESC);
```

#### API endpoints

- `GET /me/insights/latest` → último reporte generado
- `GET /me/insights?from=YYYY-MM&to=YYYY-MM` → histórico
- `GET /me/insights/:periodStart` → un reporte específico
- `POST /admin/insights/regenerate` → trigger manual (para debugging y para
  permitir al usuario "regenerar" el reporte si cambió data crítica)

### Prompt engineering (esqueleto)

```typescript
const systemPrompt = `
Eres un coach financiero y de productividad. Analizás la data del usuario
del mes ${monthName} ${year} y devolvés un reporte estructurado en JSON con:

1. insights: array de objetos { type, message, severity }
   - type: "spending-pattern" | "habit-finance-link" | "best-week" | "anomaly"
   - severity: "info" | "warning" | "celebration"

2. recommendations: array de strings con acciones concretas.

3. achievements: array de strings con logros del mes.

4. projections: objeto opcional con { endOfYearSavings, riskCategories[] }

Datos del usuario (mes ${monthName}):
- Total ingresos: ${income}
- Total gastos: ${expenses}
- Por categoría: ${JSON.stringify(byCategory)}
- Hábitos: ${JSON.stringify(habitsSummary)}
- Comparativa vs mes anterior: ${JSON.stringify(monthComparison)}

Reglas:
- NO inventes datos. Si no hay suficiente data para una sección, omití la sección.
- Insights con números específicos (no "gastaste mucho" sino "gastaste 45% más").
- Tono cercano, motivador, en español neutral (NO voseo).
- Máximo 5 insights, 3 recomendaciones.

Devolvé SOLO el JSON válido, sin markdown ni explicaciones.
`;
```

**Prompt caching**: el system prompt se cachea (mismo para todos los usuarios)
para abaratar el costo. El user prompt cambia por usuario.

### Frontend (Next.js)

#### Nuevas rutas

- `/coach` → último insight + acceso a histórico
- `/coach/[period]` → reporte específico (e.g. `/coach/2026-10`)

#### Componentes

- `<InsightCard>`: render de un insight individual con icono según `type` y
  color según `severity`
- `<RecommendationsList>`: lista numerada de recomendaciones
- `<AchievementsBanner>`: highlight de logros del mes
- `<CoachEmptyState>`: lo que ven los free users (preview + paywall)

#### Free vs Premium

- **Free**: ven la pantalla `/coach` con un **reporte demo estático** y un
  CTA _"Hacé que esto sea tuyo cada mes con Premium"_.
- **Premium**: ven sus reportes reales + histórico ilimitado.

---

## Costos estimados

Asumiendo Claude Sonnet (precios de referencia):

| Item                                  | Cálculo                            | Costo USD  |
| ------------------------------------- | ---------------------------------- | ---------- |
| Input tokens (resumen del mes)        | ~5,000 tokens × $3/1M              | $0.015     |
| Output tokens (reporte)               | ~1,500 tokens × $15/1M             | $0.0225    |
| Prompt caching savings                | ~50% del input cacheado            | -$0.0075   |
| **Total por usuario / mes**           |                                    | **~$0.03** |

Con 200 usuarios premium = **$6/mes** total.
A $5/mes de revenue por usuario premium = **margen ~99%**.

> Los precios se actualizan periódicamente. Verificar en el momento de
> implementar contra https://www.anthropic.com/pricing.

---

## Roadmap de implementación (cuando llegue Fase 2)

### Sprint 1 — Backend foundation (1-2 semanas)

- Migración `monthly_insights`
- Servicio `InsightsService` con la lógica de agregación
- Endpoint `POST /admin/insights/regenerate` para testing manual
- Cron job (NestJS Schedule module)

### Sprint 2 — LLM integration (1 semana)

- Cliente Claude API (con prompt caching para el system prompt)
- Validación del JSON de respuesta con Zod schema
- Manejo de errores y reintentos exponenciales
- Logs detallados para debugging del prompt

### Sprint 3 — Frontend (2 semanas)

- Página `/coach` + componentes
- Free demo state con reporte mock
- Premium gate con `<PremiumGate feature="coach-ia">`
- Tests unitarios + e2e (mock de la API de insights)

### Sprint 4 — Polish (1 semana)

- Email mensual con link al reporte (potente para retention)
- Push notification _"tu reporte de [mes] está listo"_
- Analytics events: `coach_report_viewed`, `coach_report_generated`,
  `coach_demo_seen`, `coach_upgrade_clicked`

---

## Riesgos & mitigaciones

| Riesgo                        | Mitigación                                                                                          |
| ----------------------------- | --------------------------------------------------------------------------------------------------- |
| LLM alucina números           | Validación post-respuesta: si los números no matchean con la query SQL, descartamos y reintentamos. |
| Prompt regression (modelo nuevo) | Suite de tests con fixtures de data + assertions sobre el output esperado.                       |
| Costo escala con usuarios     | A 1000+ users, evaluar Haiku para insights simples y Sonnet solo para correlaciones complejas.      |
| Privacidad                    | NUNCA mandamos a Claude IDs, nombres ni emails. Solo agregaciones numéricas. Documentar en privacy policy. |
| Mes con poca data             | El prompt instruye a omitir secciones sin data. Fallback a un mensaje "todavía no tenemos suficiente para insights, seguí registrando!". |

---

## Métricas de éxito

| Métrica            | Meta              | Cómo se calcula                                                                |
| ------------------ | ----------------- | ------------------------------------------------------------------------------ |
| **Adopción**       | >70%              | % de usuarios premium que abren su reporte en los 7 días posteriores a generarse |
| **Retention boost**| +15 pp            | D30 retention de premium con Coach vs sin Coach                                |
| **Conversión**     | >5%               | % de free users que ven el demo y upgradean en los 7 días siguientes           |
| **Cost / report**  | <$0.05            | Costo de Claude API por reporte generado                                       |

---

## Decisiones cerradas

- ✅ **Frecuencia mensual** (no semanal — sería ruido para el usuario y costo
  4× para nosotros).
- ✅ **Generación automática** vía cron, no on-demand (controla costo y
  genera urgencia).
- ✅ **Persiste el reporte** en DB, no se regenera al consultar (estabilidad
  + barato).
- ✅ **Free ve un demo estático**, no un reporte personal limitado (clean cut).

## Decisiones abiertas

- ❓ ¿Permitir regenerar el reporte una vez al mes (por user request)?
  Pro: control para el usuario. Contra: doble costo + posibles diferencias.
- ❓ ¿Reporte semanal opcional para Premium+? Add-on de $2/mes. Decidir si
  se vuelve un pull request real desde la base de usuarios.
- ❓ ¿Insights cross-mes ("últimos 3 meses")? Más caro, más valor. Evaluar
  con feedback temprano de Founders.
