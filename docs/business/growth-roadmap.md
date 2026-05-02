# Growth roadmap — Habit Sumaq

> **Status:** ACTIVO — _este es el plan vivo. Actualizar cuando cambian
> prioridades._

## Norte estratégico

- **Corto plazo**: cubrir costos (~$25/mes) → necesitamos ~10 usuarios pagos
  → asumiendo 5-8% de conversión free→premium, eso son **100-200 MAU**.
- **Mediano plazo**: percibir ganancias → 500-1000 MAU.
- **Largo plazo**: feature parity con apps líderes en LATAM (bank sync via
  Belvo, cuentas compartidas, mobile native si la PWA no alcanza).

## Estado actual (snapshot)

| Métrica            | Hoy           | Meta Fase 1 | Meta Fase 2  | Meta Fase 3  |
| ------------------ | ------------- | ----------- | ------------ | ------------ |
| MAU                | ~2            | 30-50       | 100-200      | 200-300      |
| D7 retention       | (sin medir)   | >25%        | >30%         | >35%         |
| Activation rate    | (sin medir)   | >50%        | >60%         | >65%         |
| MRR                | $0            | $0          | $0           | ~$50         |

---

## Fases

### 🚀 Fase 1 — Foundation para crecer (2-3 semanas)

**Objetivo:** instrumentar el producto para medir y reducir fricción de
onboarding para que más usuarios se enganchen.

**Trabajo:**

- [x] Doc `docs/business/pricing.md` con tiering mapeado
- [x] Doc `docs/business/growth-roadmap.md` (este doc)
- [x] Doc `docs/business/coach-ia-feature.md` con la spec del feature insignia
- [x] Doc `docs/business/twa-deployment.md` con el proceso PWA → APK
- [x] **Posthog setup** + 5 eventos críticos (`login_completed`,
      `transaction_created`, `habit_logged`, `report_viewed`, identify/reset)
- [ ] Onboarding mejorado: tutorial post-login + datos demo opcionales
- [ ] Templates de hábitos / categorías por arquetipo ("Estudiante",
      "Freelancer", "Pareja")
- [ ] Shareable streak cards (imagen exportable para postear)
- [ ] Web Push notifications básicas (recordatorios de hábito, registro de
      gasto)

**Métrica de éxito:** D7 retention >25%, activation rate >60% (signups con
≥1 transacción + ≥1 hábito en la primera semana).

#### Backlog técnico Fase 1+ (triaged)

Items que surgieron mientras laburábamos Fase 1. Priorizados por
**impacto / esfuerzo**, no por orden de aparición. Se agendan dentro de Fase 1
salvo el que diga lo contrario.

| Prio | Item                                          | Tipo    | Esfuerzo | Notas                                                                                                                                                                            |
| ---- | --------------------------------------------- | ------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | **Crear categoría inline en TransactionForm** | Feature | ~3-4h    | Frontend-only. El `Select` de categoría no tiene escape hatch hoy → agregar opción "+ Crear nueva" que abre el `CategoryForm` modal sobre el TransactionForm. Quick win.         |
| 2    | **Habit counter UX** (investigar)             | Polish  | 30min + 4h si hace falta | Feature ya existe (`Habit.targetCount` + `HabitLog.count`, `HabitForm` lo expone). Verificar si la UX de _incrementar el count_ al loguear está bien (vs solo checkbox). Si flojea, polish. |
| 3    | **Persistencia de secciones colapsadas en Tasks** | Bug     | ~5h (back+front) | `Section` entity no tiene `isCollapsed` → state es local → al refresh se pierde. Fix: nueva column en `sections` + endpoint PATCH + frontend con optimistic. Requiere coord backend. |
| 4    | **Date format unificado en forms**            | Bug     | ~6-10h   | 8 forms usan `<input type="date">` que ignora `userSettings.dateFormat` (HTML5 renderiza en locale del SO). Wire format está OK (`YYYY-MM-DD`), display NO. Fix proper: custom `<DatePicker>` component (ej. con `react-day-picker`) que reemplace todos los `type="date"`. Refactor mediano. |
| 5    | **Generar APK del PWA** (Bubblewrap)          | Ops     | 1-2h     | Documentado en [twa-deployment.md](twa-deployment.md). Falta ejecutar Bubblewrap en máquina del autor + subir a Play Store. Cuando haya momento.                                  |

### 📈 Fase 2 — Killer feature + crecimiento (6-8 semanas)

**Objetivo:** tener UN feature que justifique pagar y que sea narrativa
única.

**Trabajo:**

- [ ] **Coach personal con IA** (ver [coach-ia-feature.md](coach-ia-feature.md))
- [ ] Vinculación Hábitos ↔ Finanzas (alimenta al Coach)
- [ ] Presupuestos por categoría con alertas (ya en backlog técnico)
- [ ] Export / import (free, generoso) — ver [pricing.md → Trust signals](pricing.md#trust-signals-qué-no-es-premium)
- [ ] TikTok content consistente (paralelo, ongoing)

**Métrica de éxito:** 100-200 MAU, retention D7 >30%.

### 💰 Fase 3 — Monetización (3-4 semanas, recién con 100+ MAU)

**Objetivo:** cubrir costos.

**Trabajo:**

- [ ] Stripe integration + webhook handlers
- [ ] `@RequirePremium()` decorator en backend
- [ ] `<PremiumGate>` + paywalls contextuales en frontend (NUNCA al login)
- [ ] Founder Lifetime program: pantalla de claim, conteo público
- [ ] Pricing page pública (`/upgrade`)
- [ ] Comunicación de lanzamiento: email a current users + post anunciando
      founder enrollment

**Métrica de éxito:** ~10 conversiones a $5/mes = $50 MRR (cubre costos +
margen para reinvertir en growth).

### 🏦 Fase 4 — Escalado (cuando lleguemos a 500-1000 MAU)

**Objetivo:** ganancias estables, feature parity con líderes.

**Backlog (por priorizar cuando llegue el momento):**

- Bank sync via Belvo (huge — requiere SAS legal en LATAM, KYC, ~3 meses)
- Cuentas compartidas (couple/family finance)
- Mobile native real (Expo + RN) si la PWA no alcanza
- Integraciones (Notion, Google Calendar, Apple Health para hábitos)
- Cupones / promos / referrals

---

## Stack de analytics

### Posthog (cloud free tier)

- Free hasta **1M events/mes** — más que suficiente para 200 MAU
- Funnels, retention, session replay out of the box
- TypeScript-first SDK
- GDPR-friendly

**Setup**: ver el siguiente PR (separado de este).

### Eventos a trackear

```ts
// Auth & onboarding
posthog.capture('signup_completed', { method: 'google' });
posthog.capture('login_completed', { method: 'google' });
posthog.capture('onboarding_step', {
  step: 'welcome' | 'first-account' | 'first-habit' | 'done',
});
posthog.capture('template_applied', { template: 'student' | 'freelancer' | 'couple' });

// Activación (primer uso real de cada módulo)
posthog.capture('first_account_created');
posthog.capture('first_transaction_created');
posthog.capture('first_habit_created');
posthog.capture('first_habit_logged');
posthog.capture('first_budget_created');

// Engagement recurrente
posthog.capture('transaction_created', {
  type: 'EXPENSE' | 'INCOME' | 'TRANSFER' | 'DEBT' | 'LOAN',
});
posthog.capture('habit_logged');
posthog.capture('task_completed');
posthog.capture('chore_completed');
posthog.capture('report_viewed', { type: 'finances' | 'routines' });
posthog.capture('streak_card_shared', { habit_id: '...', days: 30 });

// Monetización (Fase 3)
posthog.capture('paywall_seen', {
  feature: 'reports' | 'multi-currency' | 'coach-ia' | '...',
});
posthog.capture('upgrade_started', { plan: 'monthly' | 'annual' | 'lifetime' });
posthog.capture('upgrade_completed', { plan: '...' });
posthog.capture('founder_claimed');
posthog.capture('subscription_canceled', { reason: '...' });
```

### KPIs a vigilar semanalmente

| KPI                     | Meta             | Cómo se calcula                                                        |
| ----------------------- | ---------------- | ---------------------------------------------------------------------- |
| **D1 retention**        | >40%             | % de signups que vuelven al día siguiente                              |
| **D7 retention**        | >25%             | % que vuelven al día 7                                                 |
| **D30 retention**       | >15%             | % que vuelven al día 30                                                |
| **Activation rate**     | >60%             | % de signups con ≥1 transacción + ≥1 hábito en semana 1                |
| **WAU/MAU stickiness**  | >0.3             | Frecuencia de uso semanal                                              |
| **MRR** (Fase 3+)       | $50 inicial      | Revenue mensual recurrente                                             |
| **Conversión free→paid**| >5%              | % de free users que upgradean dentro de 30 días post-trial             |
| **Churn mensual**       | <5%              | % de subscribers que cancelan cada mes                                 |

> Con <50 MAU estos números son **ruido estadístico**. La meta de Fase 1 es
> establecer la baseline para cuando crezcamos.

---

## Estrategia de contenido (TikTok / Reels / Shorts)

### Plan inicial (vos solo + IA)

- **Producción**: el creator genera los videos con asistencia de IA (guion +
  edición). Empieza posteando, escala según funcionó.
- **Frecuencia**: 3 videos/semana mínimo (consistencia > perfección).
- **Plataformas**: TikTok primero, mismo contenido cross-posteado en
  Instagram Reels y YouTube Shorts.

### Reglas que funcionan en finanzas/productividad LATAM

1. **Hooks de dolor real, no features**:
   - ❌ "Mirá las nuevas tablas de Habit Sumaq"
   - ✅ "Cómo dejé de perder $200/mes en gastos hormiga"
   - ✅ "Mi pareja y yo registramos cada compra desde hace 6 meses, esto descubrimos"

2. **Antes/después visual**: caos del Excel vs pantalla de Habit Sumaq, en
   side-by-side de 5 segundos.

3. **15-30 segundos MAX**. Si no captás en los primeros 3 seg, perdiste.

4. **Engagement > vanity**: comentar en videos de creators del nicho
   ("Aprendamos Finanzas", "Sebastián De La Croix Finanzas", etc.) tiene
   mejor ROI que postear más videos propios.

### Templates de video iniciales (10 ideas)

1. "Pagué $X de servicios este mes, así los registro en 30 segundos"
2. "30 días registrando todo: descubrí que..."
3. "El hábito que me hizo ahorrar más sin querer"
4. "Cómo divido los gastos con mi pareja"
5. "El error que cometía con mis presupuestos (y cómo lo arreglé)"
6. "Mi rutina de revisión semanal de finanzas (3 minutos)"
7. "¿Sabés cuánto gastás en delivery? Yo no, hasta que hice esto"
8. "POV: tu app de finanzas también te muestra tus hábitos"
9. "El día que aprendí a separar gastos hormiga de gastos fijos"
10. "Por qué dejé de usar Excel para mis finanzas"

### Shareable streak cards (Fase 1)

Feature técnico que potencia el loop viral:

- Botón "Compartir mi racha" en cada hábito con racha ≥ 7 días
- Genera imagen 1080×1920 con: nombre del hábito, días seguidos, badge
  visual, branding sutil de Habit Sumaq
- Compartir directo a Instagram Stories / WhatsApp / X / Threads

> **Por qué importa**: cada vez que un usuario postea su racha, sus amigos
> preguntan "¿qué app es?" → tráfico orgánico de calidad.

---

## Costos operativos actuales

| Item              | Costo mensual | Provider                                          |
| ----------------- | ------------- | ------------------------------------------------- |
| Hosting frontend  | $0            | Vercel free tier (alcanza para 200 MAU)           |
| Hosting backend   | $10-20        | Railway (NestJS + Postgres)                       |
| Dominio           | $1.25         | $15/año amortizado                                |
| Posthog           | $0            | Free tier hasta 1M events/mes                     |
| **Total**         | **~$15-25**   |                                                   |

| Item                      | Costo único | Notas                                             |
| ------------------------- | ----------- | ------------------------------------------------- |
| Play Store fee            | $25         | Una vez en la vida (cuando publiquemos APK)       |
| Apple Developer (futuro)  | $99/año     | Solo si publicamos en App Store                   |

---

## Próximos pasos inmediatos

1. ✅ Doc de pricing y growth-roadmap (este PR)
2. ⏭️ Setup de Posthog + primeros eventos críticos (siguiente PR)
3. ⏭️ Templates de onboarding (siguiente sprint)
4. ⏭️ Shareable streak cards
5. ⏭️ Empezar a postear contenido en TikTok
