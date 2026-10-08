# Engineering Journal: Building Ranalyte AI

This journal documents the engineering hurdles, design dilemmas, and technical constraints I encountered while developing Ranalyte AI, alongside the alternative solutions I devised to overcome them.

---

## 1. The Dependency Bottleneck in Enterprise Environments

### The Problem
When building a telecom analytics platform, the initial instinct is to rely on standard data science libraries such as pandas, openpyxl, or numpy to ingest and process drive test spreadsheets. However, field engineers and RF audit teams often operate on locked-down enterprise laptops or specialised workstations bundled with TEMS Investigation.

When inspecting the environment, I discovered that neither pandas nor openpyxl was installed. Furthermore, the environment lacked administrator privileges and direct internet access to install external packages via pip. Relying on heavy external libraries meant that most field engineers would not even be able to start the application.

### The Alternative Solution
Instead of trying to force third-party dependencies into the environment, I looked into the internal structure of modern spreadsheet files. Because Microsoft Excel (.xlsx) files are essentially zipped collections of XML documents, I wrote a custom parser using only the Python standard library modules `zipfile` and `xml.etree.ElementTree`.

By streaming `xl/worksheets/sheet1.xml` directly and extracting values from the relevant cell tags, the parser achieved several major benefits:
- Zero external dependencies: The entire ingestion pipeline runs on standard Python 3.8 and even inside bundled vendor Python interpreters without installing a single package.
- Dramatically reduced memory footprint: Parsing XML directly avoided the large memory overhead that pandas dataframes introduce when handling tens of thousands of measurement samples.
- Instant startup: Execution time dropped because there are no heavy modules to import.

---

## 2. Inconsistent Drive Test File Formats and Column Structures

### The Problem
Drive test logs gathered during cluster audits are rarely uniform. Files coming from TEMS Investigation, Nemo Outdoor, and manual field exports frequently differ in their sheet layouts, column orders, and file naming conventions. Sometimes the metric value sits in column B, while in other exports it sits in the final column after latitude, longitude, and timestamp fields.

Attempting to enforce rigid columnar schemas caused the ingestion pipeline to fail whenever an engineer uploaded an export with slightly different table views.

### The Alternative Solution
I designed an adaptive heuristic parsing strategy:
- File pattern recognition: Implemented flexible filename tokenisation that extracts the operator name (MTN, Airtel, Glo, 9mobile), the cellular technology (2G, 3G, 4G), and the metric type regardless of spacing, hyphens, or underscores.
- Columnar value sniffing: Rather than assuming a hard-coded column index, the parser inspects cell structures to identify the primary numeric telemetry series. It automatically skips non-numeric metadata such as timestamps or string headers.
- Standardised metric mapping: Created a centralised benchmark configuration that maps diverse raw values into universal cumulative thresholds for 2G (RxLev, RxQual), 3G (RSCP, Ec/No), and 4G (RSRP, RSRQ, SINR).

---

## 3. Network Disconnection and LLM API Access in the Field

### The Problem
One of the core features requested for the platform was automated Senior RNO audit reports, complete with executive summaries, cluster diagnostics, and action plans. Standard approaches typically send telemetry data to commercial AI APIs such as OpenAI or Anthropic.

In practice, drive test audits frequently occur in remote areas with poor or absent mobile coverage, or behind restrictive corporate firewalls where commercial API endpoints are blocked. Furthermore, many telecom operators have strict confidentiality rules prohibiting the transmission of network performance data to external cloud servers.

### The Alternative Solution
To guarantee reliability under all field conditions, I architected a multi-tiered analysis engine:
- Built-in deterministic expert engine: I developed a domain-specific rule engine based on 3GPP specifications and standard telecom audit rubrics. This engine calculates coverage reliability, classifies interference patterns, generates executive summaries, and assigns engineering rankings completely offline, with zero external API calls and zero internet required.
- Multi-provider fallback: For environments with internet connectivity or local GPU resources, I added optional connectors for Groq (Llama 3.3), Google Gemini free tier, and local Ollama instances (DeepSeek-R1 or Llama 3).
- Retrieval-Augmented Generation (RAG) prompts: When an external model is used, the system passes pre-aggregated statistical digests and domain playbooks rather than raw rows. This keeps token usage minimal and prevents hallucinations.

---

## 4. Distributing Reports to Non-Technical Stakeholders

### The Problem
Once an audit is complete, the results must be shared with department managers, project directors, and client teams. These stakeholders rarely have Python installed and should not be expected to launch terminal commands, manage local ports, or start batch scripts simply to read a technical audit.

Exporting static PDF documents was also unsatisfactory because stakeholders wanted interactive tables, sortable columns, and dynamic distribution charts.

### The Alternative Solution
I created an automated dashboard compiler in `build_standalone_dashboard.py`.

This script reads the application template, inlines all typography and design tokens, injects the processed KPI datasets as JSON constants directly into the client-side JavaScript, and produces a single self-contained file (`Telecom_RNO_Dashboard.html`).

The resulting file can be sent as an email attachment and opened directly in any browser on any device. It preserves all interactive features, including Chart.js visualisations and tab navigation, with no web server or internet connection required.

---

## 5. Client-Side Processing Without Server Round-Trips

### The Problem
During testing, engineers wanted to drop multiple heavy spreadsheet workbooks into the interface and receive immediate feedback without waiting for server uploads or dealing with upload size limits.

### The Alternative Solution
I implemented a dual processing path in `web/app.js`. By integrating SheetJS and JSZip directly into the browser runtime, the client can parse Excel files locally in browser memory. The frontend computes cumulative pass rates, updates the 2G, 3G, and 4G tables, and recalculates the visual progression charts entirely client-side, while still allowing server-side persistence when the local backend is running.

---

## 6. UI Consistency and Design Token Integration

### The Problem
Early dashboard iterations had fragmented styling, mismatched colour schemes for operators, and hard-coded font properties. This made the application feel like a collection of disparate scripts rather than a cohesive engineering product.

### The Alternative Solution
I established a design token workflow. I mapped tokens from `design-tokens.tokens.json` into CSS custom properties in `tokens/typography.css` and `web/index.css`. This gave the dashboard a unified visual identity:
- Standardised brand colours for each operator (MTN Yellow, Airtel Red, Glo Green, 9mobile Lime).
- A clear typography scale using modern typefaces (Roboto and JetBrains Mono).
- Consistent elevation layers, card borders, and responsive grid layouts.

---

## Summary of Key Lessons Learned

1. Minimising dependencies is an engineering advantage: Relying on the Python standard library made the application robust, fast, and deployable in restricted environments where typical data science stacks fail.
2. Offline first is essential for field tools: Designing an offline deterministic rule engine guaranteed that engineers can produce complete audit reports anywhere, even with no network connection.
3. Single-file deliverables maximise adoption: Providing a standalone HTML export eliminated friction for business stakeholders and client presentations.
4. Hybrid architectures offer the best flexibility: Allowing both client-side in-browser calculation and server-side processing gave users speed, flexibility, and control.
