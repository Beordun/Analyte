# Code Style Rules — Telecom RNO RAG Dashboard

## JavaScript (`web/app.js`)

### General
- Use **vanilla ES6+** — no frameworks, no bundlers, no npm dependencies.
- Use `const` and `let` only. Never use `var`.
- All functions must be named (no anonymous arrow functions at the top level).
- Functions are grouped by feature area with a `// ── Section Name ───` comment header.

### Naming Conventions
- `camelCase` for all variables and functions.
- `SCREAMING_SNAKE_CASE` for module-level constants (e.g. `OPERATOR_COLORS`, `PLAYBOOK_DEFINITIONS`).
- DOM element IDs are `kebab-case` (e.g. `chart-2g-rxlev`, `report-output-area`).

### State Management
- Global state is held in module-level `let` variables: `globalExactTables`, `globalAnalytics`, `globalDigest`.
- Never store state in the DOM. Read from `globalExactTables` for all rendering.
- Chart instances are stored in the `charts` object keyed by canvas ID.

### Async / Fetch Pattern
- Always wrap `fetch()` calls in `try/catch`.
- If the server endpoint fails, fall back to the in-browser client-side engine silently.
- Never block the UI waiting for a fetch. Show a loading state and update on resolve.

### Tab Rendering
- Each tab has a dedicated render function called on `setTimeout(..., 60)` when the tab becomes active.
  - `renderExactTables()` — exact-tables tab
  - `renderLineCharts()` — benchmarks tab
  - `renderDynamicPlaybooks()` — playbooks tab
  - `generateReport()` — rag-report tab
- Destroy existing Chart.js instances before re-creating: `if (charts[id]) charts[id].destroy()`.

---

## HTML (`web/index.html`)

- HTML is **structure only** — zero inline styles, zero inline scripts.
- All sections are `<section id="tab-{name}" class="tab-pane">`.
- Canvas elements are **placeholders only** — never pre-size them in HTML.
- Use semantic elements: `<header>`, `<aside>`, `<nav>`, `<main>`, `<section>`.
- All interactive elements must have a unique `id` for testability.

---

## Python

- Use the **standard library only** for `build_standalone_dashboard.py` and `telecom_exact_tables.py`.
  No `pandas`, `openpyxl`, or third-party imports in these core files.
- Use `openpyxl` only in `telecom_training_grounding.py` where it is acceptable.
- Print status messages with `[*]` prefix for progress and `[+]` for success.
- All file paths use `pathlib.Path`.

---

## Git / File Hygiene

- Never commit `Telecom_RNO_Dashboard.html` — it is a build artifact, regenerate as needed.
- Never commit API keys or `.env` files.
- The `.agents/` folder **must** be committed — it contains project intelligence rules.
