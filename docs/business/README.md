# Estrategia de negocio — Habit Sumaq

Esta carpeta documenta las decisiones estratégicas y de producto que NO son
contrato técnico (eso vive en [`docs/frontend/`](../frontend/)). Acá vive el
"por qué" y el "qué pensamos hacer", para que cuando llegue el momento de
implementar no estemos improvisando.

## Documentos

| Doc                                          | Propósito                                                       | Status      |
| -------------------------------------------- | --------------------------------------------------------------- | ----------- |
| [pricing.md](pricing.md)                     | Tiering free vs premium, pricing, programa Founder Lifetime     | BORRADOR    |
| [growth-roadmap.md](growth-roadmap.md)       | Fases para llegar a 100+ MAU, KPIs, content strategy, analytics | ACTIVO      |
| [coach-ia-feature.md](coach-ia-feature.md)   | Spec del feature insignia para Fase 2 (reportes mensuales con LLM) | BORRADOR |
| [twa-deployment.md](twa-deployment.md)       | Cómo empaquetar la PWA como APK / AAB para Play Store           | OPERACIONAL |

## Convenciones de status

- **BORRADOR**: estrategia mapeada, no implementada todavía. Cada doc define
  el "trigger" que activa la implementación (e.g. _"100+ MAU activos"_).
- **ACTIVO**: lineamientos vivos que se siguen hoy. Se actualizan cuando
  cambian prioridades.
- **OPERACIONAL**: instrucciones paso a paso para ejecutar cuando se
  necesite (e.g. publicar la PWA en Play Store).

## Cuándo actualizar

Cualquier cambio significativo de estrategia (pricing, features premium,
roadmap) debe reflejarse en el doc correspondiente **antes** de empezar la
implementación. El diff del doc sirve como "spec" estratégico y obliga a
pensar dos veces antes de cambiar de rumbo.

## Para nuevos contributors

Empezá por [`growth-roadmap.md`](growth-roadmap.md) — te da el contexto del
"dónde estamos" y "hacia dónde vamos". El resto de docs son referencia
puntual cuando estás implementando algo del roadmap.
