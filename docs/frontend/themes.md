# Temas y Paletas de Color

Habit Sumaq soporta tres modos de tema: `light`, `dark` y `system` (sigue la preferencia del OS).

El sistema de theming se basa en **CSS custom properties** consumidas por Tailwind CSS 4. Se define un set de variables semánticas que cambian según el tema activo.

---

## Implementación Técnica

### CSS Variables (en `globals.css`)

```css
@theme {
  /* Se definen los tokens semánticos como custom properties */
}

:root {
  /* Tema claro por defecto */
  --color-background: oklch(0.98 0.005 260);
  --color-foreground: oklch(0.15 0.02 260);
  /* ... demás variables */
}

.dark {
  --color-background: oklch(0.13 0.02 260);
  --color-foreground: oklch(0.93 0.01 260);
  /* ... demás variables */
}
```

### Aplicación del tema

La clase `dark` se aplica en el `<html>` vía `ThemeProvider`. Cuando `theme=system`, se escucha `prefers-color-scheme`.

---

## Paleta de Colores

La paleta usa **OKLCH** para mayor perceptual uniformity. Los colores se definen como variables semánticas (no como colores crudos en el JSX).

### Identidad de Marca

El color principal de Habit Sumaq es un **verde esmeralda** que evoca crecimiento, bienestar y naturaleza — alineado con el significado quechua de "sumaq" (hermoso, bueno).

---

### Tokens Semánticos

#### Superficies y Texto

| Token              | Uso                            | Claro                   | Oscuro                  |
| ------------------ | ------------------------------ | ----------------------- | ----------------------- |
| `background`       | Fondo principal de la app      | `oklch(0.98 0.005 260)` | `oklch(0.13 0.02 260)`  |
| `foreground`       | Texto principal                | `oklch(0.15 0.02 260)`  | `oklch(0.93 0.01 260)`  |
| `card`             | Fondo de cards y paneles       | `oklch(1.0 0 0)`        | `oklch(0.17 0.015 260)` |
| `card-foreground`  | Texto dentro de cards          | `oklch(0.15 0.02 260)`  | `oklch(0.93 0.01 260)`  |
| `muted`            | Fondos sutiles, hover states   | `oklch(0.95 0.005 260)` | `oklch(0.20 0.015 260)` |
| `muted-foreground` | Texto secundario, placeholders | `oklch(0.55 0.01 260)`  | `oklch(0.60 0.01 260)`  |

#### Bordes y Separadores

| Token    | Uso                                | Claro                   | Oscuro                  |
| -------- | ---------------------------------- | ----------------------- | ----------------------- |
| `border` | Bordes de inputs, cards, divisores | `oklch(0.90 0.005 260)` | `oklch(0.25 0.015 260)` |
| `input`  | Borde de inputs en reposo          | `oklch(0.88 0.005 260)` | `oklch(0.27 0.015 260)` |
| `ring`   | Outline de focus                   | `oklch(0.55 0.15 160)`  | `oklch(0.65 0.15 160)`  |

#### Colores de Acción (Primary)

| Token                | Uso                              | Claro                  | Oscuro                 |
| -------------------- | -------------------------------- | ---------------------- | ---------------------- |
| `primary`            | Botones principales, links, CTAs | `oklch(0.50 0.15 160)` | `oklch(0.65 0.15 160)` |
| `primary-foreground` | Texto sobre primary              | `oklch(1.0 0 0)`       | `oklch(0.10 0.02 160)` |
| `primary-hover`      | Hover de botones primary         | `oklch(0.45 0.15 160)` | `oklch(0.60 0.15 160)` |

#### Colores Secundarios

| Token                  | Uso                         | Claro                  | Oscuro                  |
| ---------------------- | --------------------------- | ---------------------- | ----------------------- |
| `secondary`            | Botones secundarios, badges | `oklch(0.93 0.01 260)` | `oklch(0.22 0.015 260)` |
| `secondary-foreground` | Texto sobre secondary       | `oklch(0.20 0.02 260)` | `oklch(0.90 0.01 260)`  |

#### Colores de Estado

| Token                    | Uso                         | Claro                  | Oscuro                 |
| ------------------------ | --------------------------- | ---------------------- | ---------------------- |
| `success`                | Ingresos, acciones exitosas | `oklch(0.55 0.15 145)` | `oklch(0.65 0.15 145)` |
| `success-foreground`     | Texto sobre success         | `oklch(1.0 0 0)`       | `oklch(0.10 0.02 145)` |
| `warning`                | Alertas, estados pendientes | `oklch(0.70 0.15 85)`  | `oklch(0.75 0.12 85)`  |
| `warning-foreground`     | Texto sobre warning         | `oklch(0.20 0.05 85)`  | `oklch(0.15 0.05 85)`  |
| `destructive`            | Gastos, errores, eliminar   | `oklch(0.55 0.2 25)`   | `oklch(0.65 0.18 25)`  |
| `destructive-foreground` | Texto sobre destructive     | `oklch(1.0 0 0)`       | `oklch(0.10 0.02 25)`  |
| `info`                   | Información, tooltips       | `oklch(0.55 0.12 240)` | `oklch(0.65 0.12 240)` |
| `info-foreground`        | Texto sobre info            | `oklch(1.0 0 0)`       | `oklch(0.10 0.02 240)` |

#### Colores de Dominio (Finanzas)

| Token      | Uso                          | Claro                  | Oscuro                 |
| ---------- | ---------------------------- | ---------------------- | ---------------------- |
| `income`   | Ingresos, préstamos cobrados | `oklch(0.55 0.15 145)` | `oklch(0.65 0.15 145)` |
| `expense`  | Gastos, deudas pagadas       | `oklch(0.55 0.2 25)`   | `oklch(0.65 0.18 25)`  |
| `transfer` | Transferencias entre cuentas | `oklch(0.55 0.12 240)` | `oklch(0.65 0.12 240)` |
| `debt`     | Deudas pendientes            | `oklch(0.60 0.15 50)`  | `oklch(0.68 0.12 50)`  |
| `loan`     | Préstamos pendientes         | `oklch(0.55 0.12 290)` | `oklch(0.65 0.12 290)` |

---

## Colores Predefinidos para Cuentas y Categorías

Los usuarios pueden elegir un color para sus cuentas y categorías. Ofrecer esta paleta predefinida:

```typescript
export const PRESET_COLORS = [
  { name: 'emerald', value: '#10b981' },
  { name: 'blue', value: '#3b82f6' },
  { name: 'violet', value: '#8b5cf6' },
  { name: 'rose', value: '#f43f5e' },
  { name: 'amber', value: '#f59e0b' },
  { name: 'cyan', value: '#06b6d4' },
  { name: 'pink', value: '#ec4899' },
  { name: 'lime', value: '#84cc16' },
  { name: 'orange', value: '#f97316' },
  { name: 'slate', value: '#64748b' },
  { name: 'teal', value: '#14b8a6' },
  { name: 'indigo', value: '#6366f1' },
] as const;
```

---

## Uso en Componentes

### Clases de Tailwind con tokens semánticos

```tsx
// Correcto — usa tokens semánticos
<div className="bg-background text-foreground">
  <button className="bg-primary text-primary-foreground hover:bg-primary-hover">
    Guardar
  </button>
  <span className="text-muted-foreground">Texto secundario</span>
</div>

// Incorrecto — colores hardcodeados
<div className="bg-white text-gray-900 dark:bg-gray-900 dark:text-white">
```

### Colores de transacción

```tsx
// Mapeo de tipo de transacción a clase de color
const transactionColorMap = {
  INCOME: 'text-income',
  EXPENSE: 'text-expense',
  TRANSFER: 'text-transfer',
  DEBT: 'text-debt',
  LOAN: 'text-loan',
} as const;
```

---

## Reglas

1. **Nunca usar colores hardcodeados** como `bg-white`, `text-gray-500`, `bg-slate-900`. Siempre usar tokens semánticos.
2. **Nunca usar `dark:` prefix** manualmente. Los tokens cambian automáticamente con la clase `.dark`.
3. **Accesibilidad:** Todos los pares fondo/texto deben cumplir WCAG AA (contraste mínimo 4.5:1 para texto normal, 3:1 para texto grande).
4. **Transiciones:** Usar `transition-colors duration-200` al cambiar entre temas para evitar un flash abrupto.
5. **El tema `system`** se resuelve en el cliente. Usar `ThemeProvider` que escucha `matchMedia('(prefers-color-scheme: dark)')`.
