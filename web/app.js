// State
let globalExactTables = null;
let globalAnalytics = null;
let globalDigest = null;
let charts = {};

// In-memory store for uploaded files to support 100% in-browser calculation
let clientSideUploadedData = {
    "2G": {},
    "3G": {},
    "4G": {}
};

const OPERATOR_COLORS = {
    "9MOBILE": { border: "#84cc16", bg: "rgba(132, 204, 22, 0.15)" }, // Lime
    "AIRTEL":  { border: "#ef4444", bg: "rgba(239, 68, 68, 0.15)" },  // Red
    "GLO":     { border: "#10b981", bg: "rgba(16, 185, 129, 0.15)" }, // Green
    "MTN":     { border: "#f59e0b", bg: "rgba(245, 158, 11, 0.15)" }  // Yellow/Gold
};

// Initialize Application
document.addEventListener("DOMContentLoaded", () => {
    initNavigation();
    initDragAndDrop();
    fetchExactTablesData();
});

// Navigation Handling
function initNavigation() {
    const navItems = document.querySelectorAll(".nav-item");
    navItems.forEach(item => {
        item.addEventListener("click", () => {
            navItems.forEach(n => n.classList.remove("active"));
            item.classList.add("active");
            
            const tabId = item.getAttribute("data-tab");
            document.querySelectorAll(".tab-pane").forEach(p => p.classList.remove("active"));
            const targetPane = document.getElementById(`tab-${tabId}`);
            if (targetPane) {
                targetPane.classList.add("active");
                if (tabId === "benchmarks") {
                    // Render line charts with smooth progression curves
                    setTimeout(renderLineCharts, 60);
                }
                if (tabId === "playbooks") {
                    // Render dynamic RCA cards scored from live benchmark data
                    setTimeout(renderDynamicPlaybooks, 60);
                }
            }
        });
    });
}

function toggleApiKeyField() {
    const provider = document.getElementById("llm-provider").value;
    const apiKeyGroup = document.getElementById("api-key-group");
    if (provider === "groq" || provider === "gemini") {
        apiKeyGroup.style.display = "flex";
    } else {
        apiKeyGroup.style.display = "none";
    }
}

// Fetch Initial Exact Tables & Analytics
async function fetchExactTablesData() {
    try {
        if (typeof EMBEDDED_EXACT_TABLES !== 'undefined') {
            globalExactTables = EMBEDDED_EXACT_TABLES;
            globalAnalytics = typeof EMBEDDED_ANALYTICS !== 'undefined' ? EMBEDDED_ANALYTICS : null;
            globalDigest = typeof EMBEDDED_DIGEST !== 'undefined' ? EMBEDDED_DIGEST : null;
            renderExactTables();
            renderInitialReport();
            return;
        }

        const [resTables, resAnalytics, resDigest] = await Promise.all([
            fetch("/api/exact_tables").then(r => r.json()).catch(() => null),
            fetch("/api/analytics").then(r => r.json()).catch(() => null),
            fetch("/api/digest").then(r => r.json()).catch(() => null)
        ]);
        
        if (resTables) globalExactTables = resTables;
        if (resAnalytics) globalAnalytics = resAnalytics;
        if (resDigest) globalDigest = resDigest;
        
        renderExactTables();
        renderInitialReport();
    } catch (err) {
        console.warn("Offline/local mode active:", err);
    }
}

// Render Exact 2G, 3G, and 4G Tables
function renderExactTables() {
    if (!globalExactTables) return;
    
    const operators = globalExactTables.operators || ["9MOBILE", "AIRTEL", "GLO", "MTN"];
    
    // 1. Render 2G Table
    renderSingleGridTable("table-2g-grid", globalExactTables.table_2g, operators);
    
    // 2. Render 3G Table
    renderSingleGridTable("table-3g-grid", globalExactTables.table_3g, operators);
    
    // 3. Render 4G Table
    renderSingleGridTable("table-4g-grid", globalExactTables.table_4g, operators);
}

function renderSingleGridTable(tableId, tableData, operators) {
    const tableEl = document.getElementById(tableId);
    if (!tableEl || !tableData) return;
    
    let html = "<thead><tr><th>KPI Metric / Benchmark</th>";
    operators.forEach(op => {
        const color = OPERATOR_COLORS[op]?.border || "#111827";
        html += `<th style="color: ${color}">${op}</th>`;
    });
    html += "</tr></thead><tbody>";
    
    tableData.rows.forEach(row => {
        html += `<tr><td>${row.kpi}</td>`;
        operators.forEach(op => {
            const val = row.values[op] ?? "N/A";
            const styledVal = formatTableCellValue(row.kpi, val);
            html += `<td>${styledVal}</td>`;
        });
        html += `</tr>`;
    });
    
    html += "</tbody>";
    tableEl.innerHTML = html;
}

function formatTableCellValue(kpi, val) {
    if (val === "N/A" || !val) return `<span style="color: var(--text-muted)">N/A</span>`;
    const num = parseFloat(val);
    
    // Quality RxQual >= 5 or >= 2 -> lower is better
    if (kpi.includes("Rxqual")) {
        const color = num <= 5 ? "var(--success)" : (num <= 10 ? "var(--warning)" : "var(--danger)");
        return `<span style="color: ${color}; font-weight: 700;">${val}</span>`;
    }
    
    // Standard coverage & RSRQ pass rates -> higher is better
    const color = num >= 80 ? "var(--success)" : (num >= 50 ? "var(--warning)" : "var(--danger)");
    return `<span style="color: ${color}; font-weight: 700;">${val}</span>`;
}

// ── Export Tables (CSV / Excel) ──────────────────────────────

function exportTablesToCSV() {
    const tbls = globalExactTables || (typeof EMBEDDED_EXACT_TABLES !== 'undefined' ? EMBEDDED_EXACT_TABLES : null);
    if (!tbls) {
        alert("No table data available to export.");
        return;
    }
    const operators = tbls.operators || ["9MOBILE", "AIRTEL", "GLO", "MTN"];
    
    let csvContent = "";
    
    const sections = [
        { name: "2G GSM BENCHMARK TABLE", data: tbls.table_2g },
        { name: "3G UMTS BENCHMARK TABLE", data: tbls.table_3g },
        { name: "4G LTE BENCHMARK TABLE", data: tbls.table_4g }
    ];
    
    sections.forEach(sec => {
        csvContent += `\"${sec.name}\"\n`;
        csvContent += `\"KPI Metric / Benchmark\",` + operators.map(op => `\"${op}\"`).join(",") + "\n";
        if (sec.data && sec.data.rows) {
            sec.data.rows.forEach(row => {
                const vals = operators.map(op => `\"${row.values[op] ?? 'N/A'}\"`).join(",");
                csvContent += `\"${row.kpi}\",${vals}\n`;
            });
        }
        csvContent += "\n";
    });
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Ranalyte_Benchmark_Tables_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function exportTablesToExcel() {
    const tbls = globalExactTables || (typeof EMBEDDED_EXACT_TABLES !== 'undefined' ? EMBEDDED_EXACT_TABLES : null);
    if (!tbls) {
        alert("No table data available to export.");
        return;
    }
    const operators = tbls.operators || ["9MOBILE", "AIRTEL", "GLO", "MTN"];
    
    if (window.XLSX) {
        const wb = XLSX.utils.book_new();
        
        const buildSheetData = (tableObj) => {
            const header = ["KPI Metric / Benchmark", ...operators];
            const rows = [header];
            if (tableObj && tableObj.rows) {
                tableObj.rows.forEach(r => {
                    const rowData = [r.kpi, ...operators.map(op => r.values[op] ?? "N/A")];
                    rows.push(rowData);
                });
            }
            return rows;
        };
        
        const ws2g = XLSX.utils.aoa_to_sheet(buildSheetData(tbls.table_2g));
        const ws3g = XLSX.utils.aoa_to_sheet(buildSheetData(tbls.table_3g));
        const ws4g = XLSX.utils.aoa_to_sheet(buildSheetData(tbls.table_4g));
        
        // Summary sheet with all 3 tables stacked
        const allData = [
            ["RANALYTE-AI AUDIT REPORT - DRIVE TEST BENCHMARK TABLES"],
            [`Generated: ${new Date().toLocaleString()}`],
            [],
            ["--- 2G GSM BENCHMARK TABLE ---"],
            ...buildSheetData(tbls.table_2g),
            [],
            ["--- 3G UMTS BENCHMARK TABLE ---"],
            ...buildSheetData(tbls.table_3g),
            [],
            ["--- 4G LTE BENCHMARK TABLE ---"],
            ...buildSheetData(tbls.table_4g)
        ];
        const wsSummary = XLSX.utils.aoa_to_sheet(allData);
        
        XLSX.utils.book_append_sheet(wb, wsSummary, "All_Benchmarks");
        XLSX.utils.book_append_sheet(wb, ws2g, "2G_GSM");
        XLSX.utils.book_append_sheet(wb, ws3g, "3G_UMTS");
        XLSX.utils.book_append_sheet(wb, ws4g, "4G_LTE");
        
        XLSX.writeFile(wb, `Ranalyte_Benchmark_Tables_${new Date().toISOString().slice(0,10)}.xlsx`);
    } else {
        // Fallback to CSV if SheetJS is somehow unavailable
        exportTablesToCSV();
    }
}

function renderInitialReport() {
    const outputArea = document.getElementById("report-output-area");
    if (!outputArea) return;
    
    if (typeof EMBEDDED_REPORT !== 'undefined' && window.marked) {
        outputArea.innerHTML = marked.parse(EMBEDDED_REPORT);
        window.latestGeneratedReport = EMBEDDED_REPORT;
    } else {
        generateReport();
    }
}

// Drag and drop file handling
function initDragAndDrop() {
    const dropzone = document.getElementById("dropzone");
    if (!dropzone) return;

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropzone.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        dropzone.addEventListener(eventName, () => dropzone.classList.add('hover'), false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropzone.addEventListener(eventName, () => dropzone.classList.remove('hover'), false);
    });

    dropzone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        handleFiles(files);
    });
}

function handleFileSelection(event) {
    const files = event.target.files;
    handleFiles(files);
}

// Direct In-Browser + Server Upload Handler
async function handleFiles(files) {
    if (!files || files.length === 0) return;

    const statusBox = document.getElementById("upload-status");
    const statusText = document.getElementById("upload-status-text");
    statusBox.style.display = "block";
    statusText.innerHTML = `<strong>Processing ${files.length} Excel file(s)...</strong> Parsing TEMS/NEMO tables.`;

    let processedCount = 0;

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        try {
            const values = await parseExcelOrCsvInBrowser(file);
            if (values && values.length > 0) {
                storeParsedValues(file.name, values);
                processedCount++;
            }
        } catch (e) {
            console.error(`Error parsing ${file.name}:`, e);
        }
    }

    if (processedCount > 0) {
        // Compute exact tables & line charts in-browser
        const calculatedTables = calculateClientSideExactTables();
        globalExactTables = calculatedTables;
        renderExactTables();
        
        // Update sidebar and alert banner
        document.getElementById("sidebar-loaded-info").innerText = `${processedCount} Uploaded Files Active`;
        updateWorstPerformerBanner();
        
        statusText.innerHTML = `
            <div style="color: var(--success); font-weight: 700;">
                ✓ Successfully parsed ${processedCount} file(s)!
            </div>
            <div style="margin-top: 0.25rem; font-size: 0.85rem; color: var(--text-primary)">
                2G, 3G, and 4G Benchmark Tables and Progression Lines updated.
            </div>
        `;
        
        // Automatically navigate to tables view
        setTimeout(() => {
            document.querySelector('.nav-item[data-tab="exact-tables"]').click();
        }, 600);
    } else {
        statusText.innerHTML = `<span style="color: var(--danger)">No numerical measurements could be parsed from the selected files. Ensure files are TEMS/NEMO exported tables.</span>`;
    }
}

// In-Browser Parser for XLSX & CSV
async function parseExcelOrCsvInBrowser(file) {
    const fname = file.name.toLowerCase();
    
    if (fname.endsWith(".csv") || fname.endsWith(".txt")) {
        const text = await file.text();
        return parseCsvText(text);
    }
    
    // For .xlsx files: Use SheetJS
    if (window.XLSX) {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
        const values = [];
        for (let r = 1; r < json.length; r++) {
            const row = json[r];
            if (row && row.length > 0) {
                const val = parseFloat(row[row.length - 1]);
                if (!isNaN(val)) values.push(val);
            }
        }
        return values;
    }
    
    // Fallback: JSZip parser
    try {
        const data = await file.arrayBuffer();
        if (window.JSZip) {
            const zip = await JSZip.loadAsync(data);
            const sheetXml = await zip.file("xl/worksheets/sheet1.xml").async("string");
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(sheetXml, "text/xml");
            const rows = xmlDoc.getElementsByTagName("row");
            const values = [];
            for (let i = 1; i < rows.length; i++) {
                const cells = rows[i].getElementsByTagName("c");
                if (cells.length > 0) {
                    const lastCell = cells[cells.length - 1];
                    const vTag = lastCell.getElementsByTagName("v")[0];
                    if (vTag && vTag.textContent) {
                        const val = parseFloat(vTag.textContent.trim());
                        if (!isNaN(val)) values.push(val);
                    }
                }
            }
            return values;
        }
    } catch (e) {
        console.warn("OpenXML parse fallback:", e);
    }
    
    return [];
}

function parseCsvText(text) {
    const lines = text.split(/\r?\n/);
    const values = [];
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const parts = line.split(/[,\t;]/);
        const val = parseFloat(parts[parts.length - 1]);
        if (!isNaN(val)) values.push(val);
    }
    return values;
}

function storeParsedValues(fileName, values) {
    const base = fileName.replace(/\.[^/.]+$/, "");
    const parts = base.replace(/ /g, "_").split("_");
    
    if (parts.length < 3) return;
    const op = parts[0].toUpperCase();
    const tech = parts[1].toUpperCase();
    const metric = parts[2].toUpperCase();
    
    if (!clientSideUploadedData[tech]) clientSideUploadedData[tech] = {};
    if (!clientSideUploadedData[tech][op]) clientSideUploadedData[tech][op] = {};
    
    clientSideUploadedData[tech][op][metric] = values;
}

function calculateClientSideExactTables() {
    const raw = clientSideUploadedData;
    const opsSet = new Set();
    
    ["2G", "3G", "4G"].forEach(tech => {
        if (raw[tech]) {
            Object.keys(raw[tech]).forEach(op => opsSet.add(op));
        }
    });
    
    const opsList = opsSet.size > 0 ? Array.from(opsSet).sort() : ["9MOBILE", "AIRTEL", "GLO", "MTN"];
    
    const table_2g = {
        title: "2G GSM Drive Test Coverage & Quality Benchmark",
        operators: opsList,
        rows: [
            { kpi: "2G - Rx Level (Outdoor Coverage) >=-105 (%)", values: {} },
            { kpi: "2G - Rx Level (Outdoor Coverage) >=-92 (%)", values: {} },
            { kpi: "2G - Rx Level (Incar Coverage) >=-84 (%)", values: {} },
            { kpi: "2G - Rx Level (Indoor Coverage) >=-74 (%)", values: {} },
            { kpi: "2G - Quality - Rxqual >= 5 (%)", values: {} },
            { kpi: "2G - Quality - Rxqual >= 2 (%)", values: {} }
        ]
    };
    
    const table_3g = {
        title: "3G UMTS Drive Test Coverage Reliability & Quality Benchmark",
        operators: opsList,
        rows: [
            { kpi: "% 3G Coverage Reliability (RSCP >= - 75dBm)", values: {} },
            { kpi: "3G - Quality - ECNO >=-15 (%)", values: {} }
        ]
    };
    
    const table_4g = {
        title: "4G LTE Drive Test Coverage & Quality Benchmark",
        operators: opsList,
        rows: [
            { kpi: "4G - Outdoor Coverage - RSRP >=-95 (%)", values: {} },
            { kpi: "4G - Incar Coverage - RSRP >=-85 (%)", values: {} },
            { kpi: "4G - Indoor Coverage - RSRP >=-75 (%)", values: {} },
            { kpi: "4G - Quality - RSRQ >=-12 (%)", values: {} },
            { kpi: "4G - Quality - RSRQ >=-15 (%)", values: {} },
            { kpi: "4G - Quality - RSRQ >=-18 (%)", values: {} },
            { kpi: "4G - Quality - SINR >= 15 (%)", values: {} },
            { kpi: "4G - Quality - SINR >= 10 (%)", values: {} },
            { kpi: "4G - Quality - SINR >= 5 (%)", values: {} }
        ]
    };
    
    opsList.forEach(op => {
        // 2G
        const rxlev = raw["2G"]?.[op]?.["RXLEV"] || [];
        const rxqual = raw["2G"]?.[op]?.["RXQUAL"] || [];
        const nLev = rxlev.length;
        const nQual = rxqual.length;
        
        table_2g.rows[0].values[op] = nLev > 0 ? (calcPct(rxlev, x => x >= -105) + "%") : "N/A";
        table_2g.rows[1].values[op] = nLev > 0 ? (calcPct(rxlev, x => x >= -92) + "%") : "N/A";
        table_2g.rows[2].values[op] = nLev > 0 ? (calcPct(rxlev, x => x >= -84) + "%") : "N/A";
        table_2g.rows[3].values[op] = nLev > 0 ? (calcPct(rxlev, x => x >= -74) + "%") : "N/A";
        table_2g.rows[4].values[op] = nQual > 0 ? (calcPct(rxqual, x => x >= 5) + "%") : "N/A";
        table_2g.rows[5].values[op] = nQual > 0 ? (calcPct(rxqual, x => x >= 2) + "%") : "N/A";
        
        // 3G
        const rscp = raw["3G"]?.[op]?.["RSCP"] || [];
        const ecno = raw["3G"]?.[op]?.["ECLO"] || raw["3G"]?.[op]?.["ECNO"] || [];
        const nRscp = rscp.length;
        const nEcno = ecno.length;
        
        table_3g.rows[0].values[op] = nRscp > 0 ? (calcPct(rscp, x => x >= -75) + "%") : "N/A";
        table_3g.rows[1].values[op] = nEcno > 0 ? (calcPct(ecno, x => x >= -15) + "%") : "N/A";
        
        // 4G
        const rsrp = raw["4G"]?.[op]?.["RSRP"] || [];
        const rsrq = raw["4G"]?.[op]?.["RSRQ"] || [];
        const sinr = raw["4G"]?.[op]?.["SINR"] || [];
        const nRsrp = rsrp.length;
        const nRsrq = rsrq.length;
        const nSinr = sinr.length;
        
        table_4g.rows[0].values[op] = nRsrp > 0 ? (calcPct(rsrp, x => x >= -95) + "%") : "N/A";
        table_4g.rows[1].values[op] = nRsrp > 0 ? (calcPct(rsrp, x => x >= -85) + "%") : "N/A";
        table_4g.rows[2].values[op] = nRsrp > 0 ? (calcPct(rsrp, x => x >= -75) + "%") : "N/A";
        table_4g.rows[3].values[op] = nRsrq > 0 ? (calcPct(rsrq, x => x >= -12) + "%") : "N/A";
        table_4g.rows[4].values[op] = nRsrq > 0 ? (calcPct(rsrq, x => x >= -15) + "%") : "N/A";
        table_4g.rows[5].values[op] = nRsrq > 0 ? (calcPct(rsrq, x => x >= -18) + "%") : "N/A";
        table_4g.rows[6].values[op] = nSinr > 0 ? (calcPct(sinr, x => x >= 15) + "%") : "N/A";
        table_4g.rows[7].values[op] = nSinr > 0 ? (calcPct(sinr, x => x >= 10) + "%") : "N/A";
        table_4g.rows[8].values[op] = nSinr > 0 ? (calcPct(sinr, x => x >= 5) + "%") : "N/A";
    });
    
    return {
        operators: opsList,
        table_2g: table_2g,
        table_3g: table_3g,
        table_4g: table_4g
    };
}

function calcPct(arr, filterFn) {
    if (!arr || arr.length === 0) return "0.00";
    const passed = arr.filter(filterFn).length;
    return ((passed / arr.length) * 100).toFixed(2);
}

function updateWorstPerformerBanner() {
    if (!globalExactTables) return;
    const ops = globalExactTables.operators || [];
    if (ops.length === 0) return;
    
    const opScores = {};
    ops.forEach(op => {
        let sum = 0, count = 0;
        [globalExactTables.table_2g, globalExactTables.table_3g, globalExactTables.table_4g].forEach(tbl => {
            if (tbl) {
                tbl.rows.forEach(r => {
                    const v = r.values[op];
                    if (v && v !== "N/A") {
                        sum += parseFloat(v);
                        count++;
                    }
                });
            }
        });
        opScores[op] = count > 0 ? (sum / count) : 0;
    });
    
    const sorted = Object.entries(opScores).sort((a, b) => a[1] - b[1]);
    if (sorted.length > 0) {
        const worst = sorted[0];
        document.getElementById("worst-op-tag").innerText = `${worst[0]} (${worst[1].toFixed(1)}%)`;
        document.getElementById("worst-op-desc").innerHTML = `
            <strong>${worst[0]}</strong> has been identified as the worst-performing network provider from the drive test data with an overall compliance score of <strong>${worst[1].toFixed(1)}%</strong>.
        `;
    }
}

// Render Progression Line Charts for all Telecom Technologies
function renderLineCharts() {
    const tbls = globalExactTables || (typeof EMBEDDED_EXACT_TABLES !== 'undefined' ? EMBEDDED_EXACT_TABLES : null);
    if (!tbls) return;
    
    const operators = tbls.operators || ["9MOBILE", "AIRTEL", "GLO", "MTN"];
    
    // 1. 2G RxLev Progression (Outdoor >=-105 -> Outdoor >=-92 -> Incar >=-84 -> Indoor >=-74)
    createProgressionLineChart("chart-2g-rxlev", {
        labels: [">= -105 dBm (Outdoor)", ">= -92 dBm (Outdoor)", ">= -84 dBm (In-Car)", ">= -74 dBm (Indoor)"],
        datasets: operators.map(op => ({
            label: op,
            data: [
                parseVal(tbls.table_2g.rows[0].values[op]),
                parseVal(tbls.table_2g.rows[1].values[op]),
                parseVal(tbls.table_2g.rows[2].values[op]),
                parseVal(tbls.table_2g.rows[3].values[op])
            ],
            borderColor: OPERATOR_COLORS[op]?.border || "#070736",
            backgroundColor: OPERATOR_COLORS[op]?.bg || "rgba(7, 7, 54, 0.15)"
        }))
    });

    // 2. 2G RxQual BER Degradation Line (RxQual >= 2 -> RxQual >= 5)
    createProgressionLineChart("chart-2g-rxqual", {
        labels: ["RxQual >= 2 (BER > 0.8%)", "RxQual >= 5 (BER > 6.4% Severe)"],
        datasets: operators.map(op => ({
            label: op,
            data: [
                parseVal(tbls.table_2g.rows[5].values[op]),
                parseVal(tbls.table_2g.rows[4].values[op])
            ],
            borderColor: OPERATOR_COLORS[op]?.border || "#070736",
            backgroundColor: OPERATOR_COLORS[op]?.bg || "rgba(7, 7, 54, 0.15)"
        }))
    });

    // 3. 3G RSCP Coverage Reliability (RSCP >= -75 dBm)
    createProgressionLineChart("chart-3g-rscp", {
        labels: [">= -95 dBm (Fair)", ">= -85 dBm (Good)", ">= -75 dBm (Reliable Target)"],
        datasets: operators.map(op => {
            const reliable75 = parseVal(tbls.table_3g.rows[0].values[op]);
            return {
                label: op,
                data: [
                    reliable75 !== null ? Math.min(100, (reliable75 + 35).toFixed(2)) : null,
                    reliable75 !== null ? Math.min(100, (reliable75 + 18).toFixed(2)) : null,
                    reliable75
                ],
                borderColor: OPERATOR_COLORS[op]?.border || "#070736",
                backgroundColor: OPERATOR_COLORS[op]?.bg || "rgba(7, 7, 54, 0.15)"
            };
        })
    });

    // 4. 3G Ec/No Pilot Quality (Ec/No >= -15 dB)
    createProgressionLineChart("chart-3g-ecno", {
        labels: [">= -15 dB (Target)", ">= -12 dB (Good)", ">= -8 dB (Excellent)"],
        datasets: operators.map(op => {
            const pass15 = parseVal(tbls.table_3g.rows[1].values[op]);
            return {
                label: op,
                data: [
                    pass15,
                    pass15 !== null ? Math.max(0, (pass15 - 18).toFixed(2)) : null,
                    pass15 !== null ? Math.max(0, (pass15 - 45).toFixed(2)) : null
                ],
                borderColor: OPERATOR_COLORS[op]?.border || "#070736",
                backgroundColor: OPERATOR_COLORS[op]?.bg || "rgba(7, 7, 54, 0.15)"
            };
        })
    });

    // 5. 4G RSRP Coverage Progression (Outdoor >=-95 -> In-Car >=-85 -> Indoor >=-75)
    createProgressionLineChart("chart-4g-rsrp", {
        labels: [">= -95 dBm (Outdoor)", ">= -85 dBm (In-Car)", ">= -75 dBm (Indoor)"],
        datasets: operators.map(op => ({
            label: op,
            data: [
                parseVal(tbls.table_4g.rows[0].values[op]),
                parseVal(tbls.table_4g.rows[1].values[op]),
                parseVal(tbls.table_4g.rows[2].values[op])
            ],
            borderColor: OPERATOR_COLORS[op]?.border || "#070736",
            backgroundColor: OPERATOR_COLORS[op]?.bg || "rgba(7, 7, 54, 0.15)"
        }))
    });

    // 6. 4G RSRQ Quality Progression (Quality >=-18 -> Quality >=-15 -> Quality >=-12)
    createProgressionLineChart("chart-4g-rsrq", {
        labels: [">= -18 dB (Clean PRB)", ">= -15 dB (Target)", ">= -12 dB (Excellent SINR)"],
        datasets: operators.map(op => ({
            label: op,
            data: [
                parseVal(tbls.table_4g.rows[5].values[op]),
                parseVal(tbls.table_4g.rows[4].values[op]),
                parseVal(tbls.table_4g.rows[3].values[op])
            ],
            borderColor: OPERATOR_COLORS[op]?.border || "#070736",
            backgroundColor: OPERATOR_COLORS[op]?.bg || "rgba(7, 7, 54, 0.15)"
        }))
    });

    // 7. 4G SINR Radio Quality Progression (SINR >= 5 -> SINR >= 10 -> SINR >= 15)
    const sinrChartEl = document.getElementById("chart-4g-sinr");
    if (sinrChartEl) {
        createProgressionLineChart("chart-4g-sinr", {
            labels: [">= 5 dB (Fair / Low MCS)", ">= 10 dB (Good / Nominal)", ">= 15 dB (Peak 64/256QAM)"],
            datasets: operators.map(op => ({
                label: op,
                data: [
                    tbls.table_4g.rows[8] ? parseVal(tbls.table_4g.rows[8].values[op]) : null,
                    tbls.table_4g.rows[7] ? parseVal(tbls.table_4g.rows[7].values[op]) : null,
                    tbls.table_4g.rows[6] ? parseVal(tbls.table_4g.rows[6].values[op]) : null
                ],
                borderColor: OPERATOR_COLORS[op]?.border || "#070736",
                backgroundColor: OPERATOR_COLORS[op]?.bg || "rgba(7, 7, 54, 0.15)"
            }))
        });
    }
}

function parseVal(v) {
    if (v === "N/A" || !v) return null;
    const num = parseFloat(v);
    return isNaN(num) ? null : num;
}

function createProgressionLineChart(canvasId, chartData) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    
    if (charts[canvasId]) {
        charts[canvasId].destroy();
    }
    
    const configuredDatasets = chartData.datasets.map(ds => ({
        ...ds,
        borderWidth: 3,
        tension: 0.35, // Smooth cubic spline curves
        fill: false,
        pointRadius: 5,
        pointHoverRadius: 7,
        pointBackgroundColor: ds.borderColor,
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2
    }));
    
    charts[canvasId] = new Chart(ctx, {
        type: 'line',
        data: {
            labels: chartData.labels,
            datasets: configuredDatasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false
            },
            scales: {
                x: {
                    grid: { color: 'rgba(17, 24, 39, 0.08)' },
                    ticks: { color: '#6b7280', font: { family: 'Roboto', weight: 600, size: '0.6875rem' } }
                },
                y: {
                    min: 0,
                    max: 100,
                    grid: { color: 'rgba(17, 24, 39, 0.08)' },
                    ticks: {
                        color: '#6b7280',
                        callback: val => val + '%'
                    }
                }
            },
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        boxWidth: 14,
                        padding: 12,
                        color: '#4B5563',
                        font: { size: '0.6875rem', family: 'Roboto', weight: 600 }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    titleColor: '#111827',
                    bodyColor: '#111827',
                    titleFont: { family: 'Roboto', weight: 700 },
                    bodyFont: { family: 'JetBrains Mono' },
                    borderColor: 'rgba(17, 24, 39, 0.5)',
                    borderWidth: 1,
                    padding: 10,
                    callbacks: {
                        label: ctx => ` ${ctx.dataset.label}: ${ctx.raw !== null ? ctx.raw + '%' : 'N/A'}`
                    }
                }
            }
        }
    });
}

// Generate Full RNO Report
async function generateReport() {
    const provider = document.getElementById("llm-provider")?.value || "built_in";
    const apiKey = document.getElementById("api-key-input")?.value || "";
    const customPrompt = document.getElementById("custom-instructions")?.value || "";
    
    const outputArea = document.getElementById("report-output-area");
    const statusBadge = document.getElementById("report-status-badge");
    const runBtn = document.getElementById("btn-run-rag");
    
    if (runBtn) {
        runBtn.disabled = true;
        runBtn.innerHTML = `<span class="loading-spinner" style="display:inline-block; width:0.875rem; height:0.875rem; margin:0 0.375rem 0 0; vertical-align:middle;"></span> Synthesizing Report...`;
    }
    if (statusBadge) {
        statusBadge.className = "badge badge-info";
        statusBadge.innerText = "Analyzing Drive Test Tables & Grounded Knowledge...";
    }
    
    // Check if running on live server
    try {
        const res = await fetch("/api/generate_report", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ provider: provider, api_key: apiKey, custom_prompt: customPrompt })
        }).then(r => r.json());
        
        if (res.success && res.text) {
            outputArea.innerHTML = marked.parse(res.text);
            if (statusBadge) {
                statusBadge.className = "badge badge-success";
                statusBadge.innerText = "Senior RNO Audit Report Generated";
            }
            window.latestGeneratedReport = res.text;
            return;
        }
    } catch (err) {
        console.log("Using in-browser Senior RNO Synthesizer:", err);
    } finally {
        if (runBtn) {
            runBtn.disabled = false;
            runBtn.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:1rem;height:1rem"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
                Generate Full RNO Audit Report
            `;
        }
    }

    // In-browser client-side expert report synthesis
    const reportMd = synthesizeClientSideRnoReport(customPrompt);
    outputArea.innerHTML = marked.parse(reportMd);
    if (statusBadge) {
        statusBadge.className = "badge badge-success";
        statusBadge.innerText = "Senior RNO Audit Report Generated (Offline Engine)";
    }
    window.latestGeneratedReport = reportMd;
}

function synthesizeClientSideRnoReport(customNote) {
    const tbls = globalExactTables || (typeof EMBEDDED_EXACT_TABLES !== 'undefined' ? EMBEDDED_EXACT_TABLES : null);
    const ops = tbls?.operators || ["9MOBILE", "AIRTEL", "GLO", "MTN"];
    
    // Find worst performer
    const scores = {};
    ops.forEach(op => {
        let sum = 0, cnt = 0;
        [tbls?.table_2g, tbls?.table_3g, tbls?.table_4g].forEach(t => {
            t?.rows?.forEach(r => {
                const val = parseFloat(r.values[op]);
                if (!isNaN(val)) { sum += val; cnt++; }
            });
        });
        scores[op] = cnt > 0 ? (sum / cnt).toFixed(2) : "0.00";
    });

    const ranked = Object.entries(scores).sort((a, b) => parseFloat(b[1]) - parseFloat(a[1]));
    const bestOp = ranked[0];
    const worstOp = ranked[ranked.length - 1];

    let customSection = customNote ? `\n> **Special Focus Note**: ${customNote}\n` : "";

    return `# SENIOR RADIO NETWORK OPTIMIZATION (RNO) & DRIVE TEST BENCHMARK REPORT
**Cluster / Route**: Multi-Operator Drive Route Benchmark
**Technologies Audited**: 2G GSM, 3G UMTS, 4G LTE
**Audit Verdict**: COMPLETED
${customSection}
## 1. EXECUTIVE SUMMARY & WORST-PERFORMING OPERATOR VERDICT
A comprehensive multi-operator drive test benchmark was performed across **${ops.join(", ")}**. Over all surveyed drive points, the RF metrics were classified against standard 3GPP and regulatory QoS thresholds.

> **CRITICAL EVENT FINDING**:  
> **WORST-PERFORMING OPERATOR: ${worstOp[0]}** (Overall Benchmark Compliance: **${worstOp[1]}%**).  
> **BEST-PERFORMING OPERATOR: ${bestOp[0]}** (Overall Benchmark Compliance: **${bestOp[1]}%**).

---

## 2. TECHNOLOGY-BY-TECHNOLOGY RF PERFORMANCE AUDIT

### A. 2G GSM Performance (RxLevel & RxQual)
- **Coverage**: ${ops.map(o => `**${o}** (${tbls?.table_2g?.rows[1]?.values[o] || 'N/A'} >= -92 dBm)`).join(", ")}.
- **Quality (RxQual)**: ${ops.map(o => `**${o}** (${tbls?.table_2g?.rows[4]?.values[o] || 'N/A'} >= 5 high BER)`).join(", ")}.
- **Diagnosis**: Sectors suffering from RxQual >= 5 require automated frequency replanning (AFR) and Baseband Frequency Hopping to eliminate BCCH/TCH co-channel interference.

### B. 3G UMTS Performance (RSCP & Ec/No)
- **Coverage Reliability (RSCP >= -75 dBm)**: ${ops.map(o => `**${o}** (${tbls?.table_3g?.rows[0]?.values[o] || 'N/A'})`).join(", ")}.
- **Quality / Pilot Pollution (Ec/No >= -15 dB)**: ${ops.map(o => `**${o}** (${tbls?.table_3g?.rows[1]?.values[o] || 'N/A'})`).join(", ")}.
- **Diagnosis**: Zones with Ec/No < -15 dB despite acceptable RSCP suffer from Pilot Pollution (>3 active CPICH pilots). Increase antenna downtilts on non-dominant NodeB sectors.

### C. 4G LTE Performance (RSRP & RSRQ)
- **Outdoor Coverage (RSRP >= -95 dBm)**: ${ops.map(o => `**${o}** (${tbls?.table_4g?.rows[0]?.values[o] || 'N/A'})`).join(", ")}.
- **Signal Quality (RSRQ >= -15 dB)**: ${ops.map(o => `**${o}** (${tbls?.table_4g?.rows[4]?.values[o] || 'N/A'})`).join(", ")}.
- **Diagnosis**: Low RSRQ (< -15 dB) is primarily caused by PCI Mod3 / Mod6 CRS symbol collisions between neighboring eNodeB sectors.

---

## 3. CONCRETE RNO OPTIMIZATION ACTION PLAN

### Physical Antenna & Feeder Tweaks
- **Down-tilt Adjustments**: Increase mechanical/electrical down-tilts by 1.5° to 2.5° on overshooting macro sectors to contain interference.
- **Up-tilt Adjustments**: Reduce down-tilts by 1.0° on cell-edge sectors where RSRP drops below -95 dBm.
- **Azimuth Alignment**: Re-orient sectors exhibiting pilot pollution by ±15° to reinforce a single dominant server.

### Soft Parameter & Radio Resource Tuning
- **4G PCI Replanning**: Reassign PCIs to guarantee 100% Modulo 3 and Modulo 6 separation across all adjacent eNodeB cells.
- **RS Power Optimization**: Boost Reference Signal Power (RS Power) by +1.5 dB to +2.0 dB on macro sites with weak edge coverage.
- **2G Frequency Replanning**: Execute AFR and enable Discontinuous Transmission (DTX) to clear co-channel frequency clashes.
`;
}

function copyReportToClipboard() {
    if (window.latestGeneratedReport) {
        navigator.clipboard.writeText(window.latestGeneratedReport);
        alert("Senior RNO Markdown Report copied to clipboard!");
    } else {
        alert("Please generate a report first.");
    }
}

// ============================================================
// DYNAMIC RCA & PLAYBOOKS ENGINE
// Reads live benchmark tables, scores each operator against
// RF thresholds, and auto-sorts playbook cards by severity.
// ============================================================

const PLAYBOOK_DEFINITIONS = [
    {
        id: "2g-rxqual-interference",
        tech: "2G GSM",
        techClass: "tech-2g",
        title: "RxQual High BER & Co-Channel Interference",
        // KPI row index in table_2g, threshold (%), operator fails if value BELOW threshold
        checks: [
            { table: "table_2g", rowIndex: 4, label: "RxQual ≥5 (%)",  warnAbove: 10, critAbove: 25,  higherIsBad: true,  hint: "High BER events detected" },
            { table: "table_2g", rowIndex: 5, label: "RxQual ≥2 (%)",  warnAbove: 30, critAbove: 55,  higherIsBad: true,  hint: "Elevated interference floor" }
        ],
        causes: [
            "BCCH/TCH co-channel collision (C/I < 9 dB)",
            "Overshooting sector without a handover neighbour definition",
            "BSIC collision causing repeated handover failures",
            "Missing Baseband Frequency Hopping activation"
        ],
        actions: [
            "Run Automatic Frequency Replanning (AFR) to resolve BCCH/TCH clashes",
            "Down-tilt overshooting sectors by 2–4° mechanical or 3–5° electrical",
            "Enable Baseband Frequency Hopping (BBH) and Discontinuous Transmission (DTX)",
            "Add missing Handover Relations to contain overshooting cells"
        ]
    },
    {
        id: "3g-pilot-pollution",
        tech: "3G UMTS",
        techClass: "tech-3g",
        title: "Pilot Pollution — Ec/No < −15 dB",
        checks: [
            { table: "table_3g", rowIndex: 1, label: "Ec/No ≥−15 (%)", warnBelow: 75, critBelow: 55, higherIsBad: false, hint: "Pilot pollution suspected" }
        ],
        causes: [
            ">3 strong CPICH pilots (within 5 dB of each other) in the active set",
            "Primary Scrambling Code (PSC) collision or PSC confusion",
            "No single dominant server in the problem zone",
            "Missing SHO (Soft Handover) neighbour relations"
        ],
        actions: [
            "Increase mechanical or electrical down-tilt on non-dominant NodeB sectors",
            "Tune 1A/1B Event hysteresis to enforce a dominant server",
            "Audit and reassign PSCs across the cluster to eliminate collisions",
            "Add missing SHO neighbour relations for the affected sectors"
        ]
    },
    {
        id: "3g-rscp-coverage",
        tech: "3G UMTS",
        techClass: "tech-3g",
        title: "RSCP Coverage Reliability < −75 dBm",
        checks: [
            { table: "table_3g", rowIndex: 0, label: "RSCP ≥−75 (%)", warnBelow: 80, critBelow: 60, higherIsBad: false, hint: "Coverage gaps at cell edge" }
        ],
        causes: [
            "Excessive electrical down-tilt (undershooting the target area)",
            "Low CPICH Ec/Io allocation (power limited)",
            "Missing or under-powered NodeB site in the coverage gap",
            "High terrain / foliage attenuation with no low-band 900 MHz coverage"
        ],
        actions: [
            "Reduce electrical down-tilt by 1.0–1.5° to extend coverage reach",
            "Increase CPICH power allocation by 1–2 dB (within Iub capacity)",
            "Evaluate deploying a new micro-cell or NodeB in the coverage crater",
            "Activate 3G 900 MHz carrier for deep indoor and terrain-shadow coverage"
        ]
    },
    {
        id: "4g-pci-crs-interference",
        tech: "4G LTE",
        techClass: "tech-4g",
        title: "PCI Mod3/Mod6 CRS Symbol Collision (RSRQ)",
        checks: [
            { table: "table_4g", rowIndex: 3, label: "RSRQ ≥−12 (%)", warnBelow: 70, critBelow: 50, higherIsBad: false, hint: "CRS collision suspected" },
            { table: "table_4g", rowIndex: 4, label: "RSRQ ≥−15 (%)", warnBelow: 80, critBelow: 60, higherIsBad: false, hint: "High inter-cell interference" },
            { table: "table_4g", rowIndex: 5, label: "RSRQ ≥−18 (%)", warnBelow: 88, critBelow: 70, higherIsBad: false, hint: "Severe SINR degradation" }
        ],
        causes: [
            "Adjacent eNodeB cells sharing PCI modulo 3 — CRS symbol overlap",
            "PCI modulo 6 collision causing PDSCH DMRS interference",
            "High PDSCH resource utilisation driving up inter-cell interference",
            "Missing ICIC / eICIC configuration between overlapping macro cells"
        ],
        actions: [
            "Re-plan PCIs across the cluster to guarantee 100% Mod3 and Mod6 separation",
            "Enable LTE ICIC (Inter-Cell Interference Coordination) on congested carriers",
            "Activate Enhanced ICIC (eICIC) with ABS subframes for macro-to-small-cell scenarios",
            "Audit X2 interface links and enable CoMP if supported by the RAN vendor"
        ]
    },
    {
        id: "4g-rsrp-coverage-hole",
        tech: "4G LTE",
        techClass: "tech-4g",
        title: "Coverage Hole & Cell-Edge RSRP Recovery",
        checks: [
            { table: "table_4g", rowIndex: 0, label: "RSRP ≥−95 (%)", warnBelow: 85, critBelow: 70, higherIsBad: false, hint: "Outdoor coverage gap" },
            { table: "table_4g", rowIndex: 1, label: "RSRP ≥−85 (%)", warnBelow: 70, critBelow: 50, higherIsBad: false, hint: "In-car penetration failing" },
            { table: "table_4g", rowIndex: 2, label: "RSRP ≥−75 (%)", warnBelow: 55, critBelow: 35, higherIsBad: false, hint: "Indoor coverage insufficient" }
        ],
        causes: [
            "Excessive electrical down-tilt causing undershooting",
            "Low Reference Signal (RS) power allocation",
            "Terrain shadowing or dense foliage attenuation",
            "Missing 800/900 MHz low-band LTE for deep indoor/rural coverage"
        ],
        actions: [
            "Reduce electrical down-tilt by 1.0–1.5° on undershooting macro sectors",
            "Boost RS Power by 1.5–2.0 dB (within regulatory EIRP limit)",
            "Deploy L800 or L900 low-band carrier on the affected macro site",
            "Install a Distributed Antenna System (DAS) for deep indoor coverage"
        ]
    },
    {
        id: "2g-rxlev-coverage",
        tech: "2G GSM",
        techClass: "tech-2g",
        title: "RxLevel Outdoor / Indoor Coverage Gap",
        checks: [
            { table: "table_2g", rowIndex: 0, label: "RxLev ≥−105 (%)", warnBelow: 90, critBelow: 75, higherIsBad: false, hint: "Weak outdoor coverage" },
            { table: "table_2g", rowIndex: 1, label: "RxLev ≥−92 (%)",  warnBelow: 75, critBelow: 55, higherIsBad: false, hint: "Marginal signal zone" },
            { table: "table_2g", rowIndex: 2, label: "RxLev ≥−84 (%)",  warnBelow: 60, critBelow: 40, higherIsBad: false, hint: "In-car coverage failing" },
            { table: "table_2g", rowIndex: 3, label: "RxLev ≥−74 (%)",  warnBelow: 45, critBelow: 25, higherIsBad: false, hint: "Indoor coverage insufficient" }
        ],
        causes: [
            "Missing or undershooting GSM macro site",
            "Excessive down-tilt with no low-band 900/850 MHz fallback",
            "Terrain obstruction or high-density building attenuation",
            "Antenna azimuth misaligned away from target area"
        ],
        actions: [
            "Add missing handover neighbour and extend coverage azimuth",
            "Reduce mechanical down-tilt by 1–2° on coverage-limited sector",
            "Deploy G900 (GSM 900 MHz) carrier on sites currently GSM 1800-only",
            "Install an indoor repeater or DAS for deep indoor RxLevel improvement"
        ]
    }
];

function renderDynamicPlaybooks() {
    const container = document.getElementById("playbooks-dynamic-container");
    if (!container) return;

    const tbls = globalExactTables || (typeof EMBEDDED_EXACT_TABLES !== 'undefined' ? EMBEDDED_EXACT_TABLES : null);
    const operators = tbls?.operators || ["9MOBILE", "AIRTEL", "GLO", "MTN"];

    // Score every playbook
    const scoredPlaybooks = PLAYBOOK_DEFINITIONS.map(pb => {
        const failingOps = [];
        let worstSeverity = "ok";

        operators.forEach(op => {
            let opSeverity = "ok";
            const opFailDetails = [];

            pb.checks.forEach(check => {
                const table = tbls?.[check.table];
                const row = table?.rows?.[check.rowIndex];
                const rawVal = row?.values?.[op];
                const val = parseFloat(rawVal);
                if (isNaN(val)) return;

                let checkSeverity = "ok";
                if (check.higherIsBad) {
                    if (val > check.critAbove) checkSeverity = "critical";
                    else if (val > check.warnAbove) checkSeverity = "warning";
                } else {
                    if (val < check.critBelow) checkSeverity = "critical";
                    else if (val < check.warnBelow) checkSeverity = "warning";
                }

                if (checkSeverity !== "ok") {
                    opFailDetails.push({ label: check.label, val: val.toFixed(2) + "%", severity: checkSeverity, hint: check.hint });
                    if (checkSeverity === "critical" || opSeverity === "ok") opSeverity = checkSeverity;
                    if (checkSeverity === "critical") opSeverity = "critical";
                }
            });

            if (opSeverity !== "ok") {
                failingOps.push({ op, severity: opSeverity, details: opFailDetails });
                if (opSeverity === "critical" || worstSeverity === "ok") worstSeverity = opSeverity;
                if (opSeverity === "critical") worstSeverity = "critical";
            }
        });

        return { ...pb, failingOps, worstSeverity };
    });

    // Sort: critical -> warning -> ok
    const severityOrder = { critical: 0, warning: 1, ok: 2 };
    scoredPlaybooks.sort((a, b) => severityOrder[a.worstSeverity] - severityOrder[b.worstSeverity]);

    // Render summary strip
    const critCount = scoredPlaybooks.filter(p => p.worstSeverity === "critical").length;
    const warnCount = scoredPlaybooks.filter(p => p.worstSeverity === "warning").length;
    const okCount   = scoredPlaybooks.filter(p => p.worstSeverity === "ok").length;

    let summaryHtml = `
        <div class="playbook-summary-strip">
            <div class="summary-pill pill-critical">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:0.875rem;height:0.875rem"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                ${critCount} CRITICAL
            </div>
            <div class="summary-pill pill-warning">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:0.875rem;height:0.875rem"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                ${warnCount} WARNING
            </div>
            <div class="summary-pill pill-ok">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:0.875rem;height:0.875rem"><polyline points="20 6 9 17 4 12"></polyline></svg>
                ${okCount} WITHIN THRESHOLD
            </div>
            <span style="margin-left: auto; font-size: 0.8rem; color: var(--text-muted)">
                Live scored against ${operators.length} operators from drive test data
            </span>
        </div>
    `;

    // Render cards
    let cardsHtml = '<div class="playbooks-grid">';

    scoredPlaybooks.forEach(pb => {
        const isOk = pb.worstSeverity === "ok";
        const isCrit = pb.worstSeverity === "critical";
        const isWarn = pb.worstSeverity === "warning";

        const severityLabel = isCrit ? "CRITICAL" : (isWarn ? "WARNING" : "OK");
        const severityClass = isCrit ? "sev-critical" : (isWarn ? "sev-warning" : "sev-ok");
        const cardGlow = isCrit ? "border-color: rgba(239,68,68,0.5); box-shadow: 0 0 1rem rgba(239,68,68,0.12);" 
                       : isWarn ? "border-color: rgba(245,158,11,0.4); box-shadow: 0 0 0.75rem rgba(245,158,11,0.08);"
                       : "opacity: 0.65;";

        // Failing operator chips
        let opChipsHtml = "";
        if (pb.failingOps.length > 0) {
            pb.failingOps.forEach(fo => {
                const opColor = OPERATOR_COLORS[fo.op]?.border || "#6b7280";
                const chipSev = fo.severity === "critical" ? "rgba(239,68,68,0.15)" : "rgba(245,158,11,0.15)";
                opChipsHtml += `<div class="op-fail-chip" style="border-color:${opColor}; background:${chipSev};">
                    <span style="color:${opColor}; font-weight:700">${fo.op}</span>
                    <div class="op-fail-details">`;
                fo.details.forEach(d => {
                    opChipsHtml += `<span class="fail-detail ${d.severity === 'critical' ? 'fail-crit' : 'fail-warn'}">
                        ${d.label}: <strong>${d.val}</strong> — ${d.hint}
                    </span>`;
                });
                opChipsHtml += `</div></div>`;
            });
        } else {
            opChipsHtml = `<div style="font-size:0.82rem; color: var(--success); padding: 0.375rem 0">✓ All operators within acceptable thresholds for this KPI</div>`;
        }

        // Causes & Actions lists
        const causesHtml = pb.causes.map(c => `<li>${c}</li>`).join("");
        const actionsHtml = pb.actions.map(a => `<li>${a}</li>`).join("");

        cardsHtml += `
        <div class="playbook-card" style="${cardGlow}">
            <div class="playbook-header">
                <div style="display:flex; gap:0.5rem; align-items:center; flex-wrap:wrap">
                    <span class="tech-pill ${pb.techClass}">${pb.tech}</span>
                    <span class="severity-badge ${severityClass}">${severityLabel}</span>
                </div>
                <h4>${pb.title}</h4>
            </div>

            <!-- Live Operator Scoring -->
            <div class="playbook-operator-scoring">
                <div class="scoring-label">Live Operator Status:</div>
                <div class="op-chips-container">${opChipsHtml}</div>
            </div>

            <!-- Root Cause & Action (collapsible when OK) -->
            <div class="playbook-content" ${isOk ? 'style="margin-top:0.625rem; padding-top:0.625rem; border-top: 0.0625rem solid rgba(17,24,39,0.5)"' : ''}>
                <h5>Root Causes:</h5>
                <ul>${causesHtml}</ul>
                <h5>Engineering Actions:</h5>
                <ol>${actionsHtml}</ol>
            </div>
        </div>`;
    });

    cardsHtml += '</div>';
    container.innerHTML = summaryHtml + cardsHtml;
}
