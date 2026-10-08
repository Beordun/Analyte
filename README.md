# Ranalyte AI: Telecom Drive Test Analytics and Audit Suite

Ranalyte AI is an engineering platform designed for radio network optimisation (RNO) engineers, audit teams, and mobile network operators. It processes cellular drive test logs, calculates standardised benchmark tables, and produces actionable technical reports for 2G, 3G, and 4G networks.

The application works completely offline by default, using built-in Python parsing and a deterministic engineering rule engine. You can also connect modern language models such as Groq, Google Gemini, or local Ollama instances when you require natural-language technical audits.

---

## Key Features

- **Automated Log Ingestion**: Ingests raw drive test spreadsheet files from TEMS Investigation and Nemo without requiring third-party software licences.
- **Standard Benchmark Tables**: Computes exact cumulative sample percentages and pass rates against standard radio frequency thresholds.
- **Multi-Operator Benchmarking**: Evaluates and compares performance across mobile operators such as MTN, Airtel, Glo, and 9mobile within target geographical clusters.
- **Senior RNO Engineering Reports**: Produces structured radio network health assessments, executive summaries, and prioritised action plans.
- **Root Cause Analysis (RCA) and Playbooks**: Links degraded key performance indicators directly to practical site remediation playbooks, including antenna tilt adjustments, pilot pollution reduction, and frequency replanning.
- **Visual Analytics**: Interactive distribution curves, histograms, and cumulative distribution function (CDF) charts powered by Chart.js.
- **Standalone Dashboard Export**: Generates a self-contained, single-file HTML report that can be shared by email and viewed in any web browser without a running web server.

---

## Supported Technologies and Metrics

Ranalyte AI analyses measurements across the principal cellular generations:

### 2G GSM
- **RxLev (Received Signal Level in dBm)**: Binned into standard coverage intervals (>= -74 dBm, -84 to -74 dBm, -92 to -84 dBm, -105 to -92 dBm, and < -105 dBm). Target benchmark: >= -92 dBm.
- **RxQual (Received Signal Quality on a 0 to 7 BER scale)**: Assesses speech clarity and radio frequency interference. Target benchmark: RxQual <= 2.

### 3G UMTS / WCDMA
- **RSCP (Received Signal Code Power in dBm)**: Evaluates pilot coverage across target cells. Target benchmark: >= -95 dBm.
- **Ec/No (Received Energy per Chip over Noise in dB)**: Detects downlink interference, cell breathing effects, and pilot pollution. Target benchmark: >= -15 dB.

### 4G LTE
- **RSRP (Reference Signal Received Power in dBm)**: Measures LTE coverage footprint. Target benchmark: >= -95 dBm.
- **RSRQ (Reference Signal Received Quality in dB)**: Assesses reference signal degradation and cluster interference. Target benchmark: >= -15 dB.
- **SINR (Signal to Interference plus Noise Ratio in dB)**: Determines radio channel efficiency and modulation coding schemes (MCS). Target benchmark: >= 10 dB.

---

## Architecture and Repository Structure

The project has been built to minimise external dependencies, relying on standard library components and browser technologies:

- `server.py`: Lightweight HTTP application server and REST endpoints.
- `telecom_exact_tables.py`: Cumulative percentage and benchmark table calculation engine.
- `telecom_analytics.py`: Metric parsing, statistical binning, and percentile calculations.
- `telecom_rag.py`: Domain knowledge base, RCA definitions, and prompt generation.
- `llm_client.py`: Multi-provider LLM interface (Built-in, Groq, Gemini, Ollama).
- `build_standalone_dashboard.py`: Builder script for generating the single-file offline HTML dashboard.
- `start_telecom_app.bat`: Windows batch launcher.
- `Telecom_RNO_Dashboard.html`: Compiled standalone dashboard ready for offline distribution.
- `design-tokens.tokens.json`: Design tokens defining colours, spacing, and typography.
- `tokens/typography.css`: Typography design system styles.
- `web/index.html`: Main application interface.
- `web/index.css`: Interface styling and layouts.
- `web/app.js`: Client-side state, chart rendering, and direct file parsing.
- `uploaded_logs/`: Directory for user-uploaded spreadsheet logs.

---

## System Requirements

- **Operating System**: Windows 10/11, Linux, or macOS.
- **Python**: Python 3.8 or later.
- **Dependencies**: No external Python packages are required. Log parsing relies entirely on standard Python modules (zipfile, xml.etree.ElementTree, http.server, and urllib).
- **Web Browser**: Any modern web browser (Google Chrome, Microsoft Edge, Mozilla Firefox, or Apple Safari).

---

## Quick Start

### 1. Launching the Local Server

#### On Windows
Double-click `start_telecom_app.bat` or run the following command in PowerShell or Command Prompt:

```cmd
start_telecom_app.bat
```

#### Using Python Directly
Run `server.py` using your installed Python interpreter:

```bash
python server.py
```

The application server will start at `http://localhost:8000`.

### 2. Opening the Application
Open your web browser and navigate to:

```
http://localhost:8000
```

---

## How to Use the Application

1. **Upload Drive Test Files**: Navigate to the **Upload Excel Logs** tab. Drag and drop your `.xlsx` drive test workbooks directly into the upload area. The files will be analysed immediately.
2. **Review KPI Tables**: Click the **2G / 3G / 4G Tables** tab to inspect cumulative distribution tables, coverage reliability metrics, and operator pass rates.
3. **Generate Engineering Reports**:
   - Open the **Senior RNO Report** tab.
   - Choose your preferred AI provider:
     - **Built-in Senior RNO Expert**: Runs completely offline with no API key required.
     - **Groq API**: High-speed inference using Llama 3 models (requires a free Groq API key).
     - **Google Gemini API**: Uses Gemini models (requires a Google AI Studio API key).
     - **Local Ollama**: Connects to an Ollama instance running on `http://localhost:11434`.
   - Optionally enter specific engineering focus instructions into the prompt box.
   - Click **Generate Senior RNO Audit Report**.
4. **Inspect Progression Charts**: Switch to the **Visual Progression** tab to examine cumulative performance curves and comparative charts.
5. **Consult Playbooks**: Open the **RCA & Playbooks** tab to review identified coverage holes, interference zones, and recommended mechanical or electrical site adjustments.

---

## Creating the Standalone Offline Dashboard

If you wish to share a complete report with clients or colleagues who do not have Python installed, you can compile a single-file dashboard:

```bash
python build_standalone_dashboard.py
```

This script reads the latest dataset, embeds the computed tables and styles into `Telecom_RNO_Dashboard.html`, and produces a single file that can be opened directly in any browser without an active server or internet connection.

---

## Data Privacy and Offline Operation

Ranalyte AI is built with privacy in mind:
- Spreadsheet files parsed by the built-in engine remain on your local machine.
- Client-side log parsing takes place directly within your web browser memory using SheetJS and JSZip.
- Remote artificial intelligence providers are only queried when you explicitly select them and provide an API key.

---

## Licence

This project is licensed under the MIT Licence. Please refer to your organisation policies when handling proprietary network telemetry and drive test records.
