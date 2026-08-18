# Architecture Rules — Telecom RNO RAG Dashboard

## Project Overview
This is a **standalone, zero-dependency telecom drive test benchmark dashboard**.
The final output is a single self-contained HTML file: `Telecom_RNO_Dashboard.html`.

---

## Build Pipeline

1. **Source files** live in `web/` — never edit the final HTML directly.
   - `web/index.html` — DOM structure only, no inline logic
   - `web/index.css`  — all styles, CSS custom properties only (no Tailwind)
   - `web/app.js`     — all JavaScript logic, no inline scripts in HTML

2. **Build command** bundles source into the standalone file:
   ```
   "C:\Program Files (x86)\TEMS\TEMS Investigation 27\Application\python.exe" build_standalone_dashboard.py
   ```
   Always rebuild after editing any file in `web/`.

3. **Python runtime** — use TEMS Python 3.11, NOT system Python:
   ```
   C:\Program Files (x86)\TEMS\TEMS Investigation 27\Application\python.exe
   ```

---

## Data Layer

- **Primary data source**: `KUBWA_TABLE VIEW/` — 22 TEMS Investigation Excel
  sheets covering MTN, Airtel, Glo, and 9mobile operators.
- **Grounding dataset**: `training_dataset_kubwa.jsonl` — few-shot pairs for LLMs.
- **Exact table calculation**: `telecom_exact_tables.py` computes benchmark
  percentages server-side. `app.js` replicates the logic client-side for
  offline drag-and-drop operation.

---

## Module Responsibilities

| File | Responsibility |
|---|---|
| `build_standalone_dashboard.py` | Embeds CSS, JS, JSON into one HTML file |
| `telecom_exact_tables.py`       | Exact 2G/3G/4G benchmark % calculator (server) |
| `telecom_training_grounding.py` | Converts Kubwa sheets to JSONL for LLM grounding |
| `server.py`                     | Optional Flask dev server for live API mode |
| `web/app.js`                    | All UI logic: tabs, charts, drag-and-drop, reports |
| `web/index.html`                | Semantic HTML shell, tab layout, canvas placeholders |
| `web/index.css`                 | Design system tokens and component styles |
| `start_telecom_app.bat`         | Windows one-click launcher |

---

## Tab Architecture (in order)

| Tab ID         | Nav Label          | Purpose |
|---|---|---|
| `exact-tables` | 2G / 3G / 4G Tables | Primary benchmark grids |
| `upload-zone`  | Upload Excel Logs   | Drag-and-drop TEMS/NEMO files |
| `rag-report`   | Senior RNO Report   | LLM or built-in expert report |
| `benchmarks`   | Visual Progression  | Multi-operator line charts |
| `playbooks`    | RCA & Playbooks     | Dynamic root cause analysis engine |

---

## LLM Strategy (Free/Budget Only)

Priority order for report generation:
1. **Built-in engine** (`synthesizeClientSideRnoReport`) — always available, no key
2. **Groq API** — free tier, Llama-3.3-70B-Instant
3. **Google AI Studio** — free tier, Gemini 2.5 Flash
4. **Ollama** — 100% local, DeepSeek-R1 or similar

Never hard-code API keys. Always use the UI input field.
