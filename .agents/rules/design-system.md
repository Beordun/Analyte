# Design System Rules — Telecom RNO RAG Dashboard

## Design Philosophy
**Light, clean, premium, engineering-grade UI** on a pure white canvas.
Every pixel should feel like professional RF monitoring software — high contrast
data readouts, soft low-opacity strokes, and generous whitespace driven by a strict
4-point grid.

---

## Background & Surfaces

- **Canvas / page background**: `#FFFFFF` (`--bg-primary`).
- **Secondary surfaces** (sidebar, cards, panels): near-white neutral (`#F8F9FB`).
- **Elevated cards / hover**: `#FFFFFF` base, `#F3F4F6` on hover.
- Backgrounds must be referenced via tokens — never raw hex in component CSS.

---

## Color Tokens (CSS Custom Properties)

All colors come from `--` variables defined in `:root` in `web/index.css`.

```
Background:   --bg-primary (#FFFFFF)  --bg-secondary (#F8F9FB)
Cards:        --bg-card (#FFFFFF)  --bg-card-hover (#F3F4F6)
Text:         --text-primary (#111827)  --text-secondary (#4B5563)  --text-muted (#9CA3AF)
Accent:       --accent-primary (#6366f1 indigo)  --accent-hover (#4F46E5)  --accent-glow (rgba(99,102,241,0.18))
Status:       --success (#10b981)  --warning (#f59e0b)  --danger (#ef4444)  --info (#3b82f6)
```

---

## Strokes & Borders (Soft, 0.5 Opacity)

All strokes, borders, and dividers must be **soft**:
- Width: `0.0625rem` (1px) — never heavier, except dashed dropzones at `0.125rem` (2px).
- Opacity: **0.5** (50% alpha) on a neutral ink tone, e.g. `rgba(17, 24, 39, 0.5)`.
- Stronger emphasis strokes use `rgba(17, 24, 39, 0.7)`; never full-opacity hard lines.
- Token: `--stroke-color` (0.5) and `--stroke-strong` (0.7).

---

## Typography — `tokens/typography.css`

The canonical typography source is **`tokens/typography.css`**
(generated from `design-tokens.tokens.json`). Do not re-declare type values inline.

- **Primary font**: `Roboto` — UI labels, body, headings (per `tokens/typography.css`).
- **Monospace font**: `JetBrains Mono` — all RF metric values, percentage readouts,
  KPI cell values, and code blocks. Never use system default fonts for data values.
- **Type scale**: 15 roles across Display, Headline, Title, Body, Label.
  All sizes/line-heights/letter-spacings are **REM** (base `1rem` = 16px).
- Consume via custom properties (`var(--type-display-large-size)`, etc.) or
  utility classes (`.type-display-large`, `.type-headline-small`, etc.).

### Font Weight Scale
- `400` — body text
- `500` — sub-labels
- `600` — table headers, nav items
- `700` — metric values, badge text
- `800` — critical alerts, section titles

---

## 4-Point Design Structure

All spacing, sizing, and offsets are multiples of **0.25rem (4px)**. No arbitrary values.

| Token | Value | Use |
|---|---|---|
| `--space-1` | `0.25rem` (4px)  | micro gaps, icon offsets |
| `--space-2` | `0.5rem` (8px)   | inline gaps, small padding |
| `--space-3` | `0.75rem` (12px)  | button gaps, chip padding |
| `--space-4` | `1rem` (16px)     | standard padding |
| `--space-5` | `1.25rem` (20px)  | card gaps |
| `--space-6` | `1.5rem` (24px)   | section padding |
| `--space-8` | `2rem` (32px)     | large block spacing |
| `--space-10` | `2.5rem` (40px)   | hero spacing |
| `--space-12` | `3rem` (48px)     | dropzone padding |
| `--space-16` | `4rem` (64px)     | page-level breathing room |
| `--space-20` | `5rem` (80px)     | — |
| `--space-24` | `6rem` (96px)     | — |

Spacing tokens are already declared in `tokens/typography.css`; reference them, do not duplicate.

---

## Border Radius Scale (REM)

| Token | Value | Use |
|---|---|---|
| `--radius-sm` | `0.5rem` (8px) | Input fields, small badges, chips |
| `--radius-md` | `0.75rem` (12px) | Cards, panels |
| `--radius-lg` | `1rem` (16px) | Modal containers, large panels |

---

## Operator Color Identity

Operator colors are fixed and canonical. Never change these mappings.

| Operator | Border Color | Background |
|---|---|---|
| **MTN** | `#f59e0b` (Gold/Amber) | `rgba(245, 158, 11, 0.15)` |
| **AIRTEL** | `#ef4444` (Red) | `rgba(239, 68, 68, 0.15)` |
| **GLO** | `#10b981` (Green/Emerald) | `rgba(16, 185, 129, 0.15)` |
| **9MOBILE** | `#84cc16` (Lime) | `rgba(132, 204, 22, 0.15)` |

Defined in `OPERATOR_COLORS` in `app.js` and used consistently across tables, line
charts, operator chips, and report highlights.

---

## Technology Pill Colors

| Technology | CSS Class | Color |
|---|---|---|
| 2G GSM | `.tech-2g` | Cyan / `#06b6d4` |
| 3G UMTS | `.tech-3g` | Purple / `#a855f7` |
| 4G LTE | `.tech-4g` | Indigo / `#6366f1` |

---

## Severity Colour Rules (Playbooks / Alerts)

| Severity | Color | CSS Class | Badge Class |
|---|---|---|---|
| CRITICAL | `#ef4444` (Red) | `.alert-danger` | `.sev-critical` |
| WARNING | `#f59e0b` (Amber) | `.alert-warning` | `.sev-warning` |
| OK | `#10b981` (Green) | `.alert-success` | `.sev-ok` |

Card glow when CRITICAL: `box-shadow: 0 0 1rem rgba(239,68,68,0.12)`
Card glow when WARNING: `box-shadow: 0 0 0.75rem rgba(245,158,11,0.08)`
Card when OK: `opacity: 0.65` (de-emphasised)

---

## Chart Design Rules (Chart.js)

- Chart type: **Line** with `tension: 0.35` (smooth cubic spline).
- Y-axis: always `0–100`, suffix `%` on tick labels.
- Grid lines: soft strokes — `rgba(17, 24, 39, 0.5)` at 0.5 opacity (subtle on white).
- Tick color: `#6b7280`.
- Legend: bottom-positioned, `Roboto` font `600 0.6875rem`.
- Tooltip: light `rgba(255, 255, 255, 0.95)` background, `JetBrains Mono` body font.
- Points: `radius: 0.3125rem`, `hoverRadius: 0.4375rem`, white border, operator color fill.
- Fill: always `false` — lines only, no area fill.
- `interaction.mode: 'index'` for simultaneous cross-hair tooltips.

---

## Spacing & Layout

- Main content padding: `1.5rem` (24px).
- Card gap in grids: `1.25rem` (20px).
- Charts grid: `repeat(2, 1fr)` on desktop, `1fr` on mobile.
- Playbooks grid: `repeat(2, 1fr)` on desktop, `1fr` on mobile.
- All transitions: `var(--transition)` = `all 0.2s cubic-bezier(0.4, 0, 0.2, 1)`.

---

## Micro-Animation Rules

- Nav item hover: subtle `background` fade + left accent bar via `::before` pseudo.
- Card hover: `translateY(-0.0625rem)` + `box-shadow` intensify.
- Buttons: `scale(0.98)` on `:active`.
- Loading spinner: `spin` keyframe, `0.8s linear infinite`.
- Chart render: Chart.js built-in `animation.duration: 800`.
