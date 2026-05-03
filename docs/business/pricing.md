# Pricing & Tiering — Habit Sumaq

> **Status:** BORRADOR — _no implementar hasta tener 100+ MAU activos._
> **Trigger de implementación:** llegamos a 100 usuarios activos mensuales con
> retención D7 ≥ 25% (ver [growth-roadmap.md](growth-roadmap.md)).

## Por qué este doc existe

Habit Sumaq nació gratis y todavía es gratis. La meta corto plazo es **cubrir
costos de infraestructura** (~$15-25 USD/mes: Railway + Vercel + dominio +
Play Store fee one-time). Cuando lleguemos a la masa crítica de usuarios,
monetizamos.

Este doc define **qué cobramos por qué** para que cuando ese momento llegue,
no improvisemos.

---

## Free tier (generoso pero finito)

La idea es que el usuario casual **se enganche, vea valor real**, y solo
choque con el paywall cuando ya esté usando la app en serio. **Nunca** un
paywall al login.

| Módulo                    | Cuota free                            |
| ------------------------- | ------------------------------------- |
| Cuentas                   | 1 cuenta, 1 moneda                    |
| Transacciones             | 50 / mes                              |
| Categorías                | 5 (3 gasto + 2 ingreso)               |
| Hábitos activos           | 3                                     |
| Prioridades (quick-tasks) | 15 / semana                           |
| Tareas                    | 1 sección                             |
| Quehaceres (chores)       | 3                                     |
| Presupuestos              | 1 mensual                             |
| Reportes                  | Solo dashboard de "Hoy"               |
| Histórico visible         | Últimos 30 días                       |
| Export / import           | ✅ Gratis (ver "Trust signals" abajo) |

---

## Premium tier (el unlock que justifica pagar)

| Feature                                | Detalle                                                            |
| -------------------------------------- | ------------------------------------------------------------------ |
| **Todo ilimitado**                     | Cuentas, transacciones, categorías, hábitos, etc.                  |
| **Multi-cuenta + multi-moneda**        | 3+ cuentas en distintas monedas (PEN/USD/EUR/etc.)                 |
| **Reportes completos**                 | Finanzas + Rutinas dashboards con histórico ilimitado              |
| **Deudas / Préstamos**                 | Módulo completo de tracking entre amigos / familia                 |
| **Servicios mensuales**                | Recurrentes (luz, internet, streaming) con archivado               |
| **Presupuestos por categoría**         | Con alertas al 80% y al overflow                                   |
| **Vinculación Hábitos ↔ Finanzas**     | El módulo que alimenta al Coach con IA                             |
| **Coach personal con IA**              | Reportes mensuales con insights generados con LLM                  |
| **Soporte prioritario**                | Email respondido en < 48h                                          |

---

## Pricing (LATAM-friendly)

Targets para LATAM. Equivalencias aproximadas en monedas locales:

| Plan                                       | USD       | PEN        | ARS         | MXN        | COP            |
| ------------------------------------------ | --------- | ---------- | ----------- | ---------- | -------------- |
| Mensual                                    | $5        | S/ 19      | $5,000      | $90        | $20,000        |
| Anual (2 meses gratis)                     | $40       | S/ 150     | $40,000     | $720       | $160,000       |
| **Lifetime — early-bird (primeros 100)**   | **$99**   | **S/ 370** | **$99,000** | **$1,800** | **$400,000**   |
| Lifetime (después de los 100)              | $199      | S/ 750     | $199,000    | $3,600     | $800,000       |

**Trial**: 14 días de premium completo al crear cuenta — **sin tarjeta**. Que
prueben el sabor del unlock antes de pedirles plata.

**Aviso**: las monedas locales se ajustan periódicamente según tipo de
cambio. La fuente de verdad es USD; las locales son referenciales.

---

## Programa Founder Lifetime

### Mecánica

Los **primeros 100 usuarios que opt-ineen explícitamente** después del
lanzamiento del programa obtienen **acceso premium gratis de por vida**.

### Por qué opt-in y no auto-grandfathering

- Los usuarios "actuales" (los pre-launch) pueden estar inactivos hace meses
  → no queremos quemar slots founder en gente que no usa la app.
- Crea un **momento de lanzamiento** con urgencia ("100 slots, primer come,
  primer servido").
- El que opt-inea activamente queda más enganchado (commitment device).
- Datos limpios: sabemos exactamente quiénes son los founders.

### Comunicación (cuando llegue el momento)

1. Email a usuarios activos: "Founder enrollment está abierto"
2. Pantalla in-app de claim: contador público de slots restantes
3. Post en redes sociales: "100 fundadores, lifetime gratis, mientras duren"
4. Una vez agotados → pricing normal

### Beneficios del Founder

- ✅ Premium completo gratis para siempre (incluyendo features futuros)
- ✅ Badge "Founder" visible en la UI
- ✅ Acceso a un canal privado de feedback temprano (Discord/Telegram)
- ✅ Crédito en una página pública de agradecimientos

---

## Trust signals (qué NO es premium)

Por estrategia, estas cosas son **gratis para todos**, incluso post-lanzamiento
del paywall:

- **Export CSV/JSON**: la gente paga subscriptions cuando confía que puede
  irse. No te encierres con sus datos. _Anti-lock-in es fuerza, no debilidad._
- **Histórico de últimos 30 días**: no le borramos nada al free user; solo no
  le mostramos analytics largos. La data sigue ahí.
- **Onboarding y templates básicos**: que el usuario pueda arrancar sin pagar
  ni dar tarjeta.

---

## Implementación técnica (referencia para Fase 3)

> Ver [growth-roadmap.md](growth-roadmap.md) para timing exacto.

### Backend (NestJS)

- Tabla `subscriptions` (`user_id`, `plan`, `status`, `current_period_end`,
  `is_founder`, `stripe_customer_id`, `stripe_subscription_id`)
- Stripe webhook handler (`POST /webhooks/stripe`) para los eventos:
  - `checkout.session.completed`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_failed`
- Decorator `@RequirePremium()` para gates de endpoints
- Endpoint `POST /me/claim-founder` con conteo atómico de slots
- Cron diario que verifica suscripciones expiradas y degrada a free

### Frontend (Next.js)

- `<PremiumGate feature="...">` wrapper para módulos premium
- `<UpgradeBanner>` contextual (en el módulo, NUNCA en login)
- Pantalla `/upgrade` con pricing cards + Stripe Checkout
- Pantalla `/founder` con conteo en vivo de slots disponibles
- Hook `usePremium()` que devuelve `{ isPremium, isFounder, expiresAt }`

### Eventos de analytics

Ver la tabla completa en [growth-roadmap.md → Eventos a trackear](growth-roadmap.md#eventos-a-trackear).
Mínimos para monetización:

- `paywall_seen` — _qué feature gateó_
- `upgrade_started` — _click en CTA de upgrade_
- `upgrade_completed` — _Stripe success_
- `founder_claimed`
- `subscription_canceled` — _con razón opcional_

---

## Decisiones cerradas

- ✅ **NO paywall al login**. El usuario se engancha con valor real primero.
- ✅ **Founder Lifetime opt-in explícito**, no auto-grandfathering.
- ✅ **Export gratis para todos**. Trust signal no negociable.
- ✅ **Trial de 14 días sin tarjeta**.
- ✅ **Pricing en USD como fuente de verdad**, conversiones locales referenciales.

## Decisiones abiertas

- ❓ ¿Plan "couple/family" para cuentas compartidas? Posible add-on $7-9/mes.
  Decidir cuando construyamos el feature de cuentas compartidas (Fase 4).
- ❓ ¿Cupones / promos? Para qué casos (referrals, estudiantes, etc.). Decidir
  cuando tengamos data de adquisición.
- ❓ ¿Pago con métodos LATAM (Mercado Pago, PayU, Yape, Plin)? Stripe cubre
  tarjetas pero hay un % de la audiencia que no las tiene. Evaluar después
  del primer mes post-lanzamiento.
