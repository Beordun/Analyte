import zipfile
import xml.etree.ElementTree as ET
import glob
import os
import math
import json

BENCHMARKS = {
    "2G_RXLEV": {
        "name": "2G GSM RxLev",
        "unit": "dBm",
        "bins": [
            {"label": ">= -74 dBm (Excellent)", "min": -74.0, "max": float('inf')},
            {"label": "[-84, -74) dBm (Good)", "min": -84.0, "max": -74.0},
            {"label": "[-92, -84) dBm (Fair)", "min": -92.0, "max": -84.0},
            {"label": "[-105, -92) dBm (Poor)", "min": -105.0, "max": -92.0},
            {"label": "< -105 dBm (Critical/No Service)", "min": float('-inf'), "max": -105.0},
        ],
        "kpi_target": ">= -92 dBm",
        "target_min": -92.0
    },
    "2G_RXQUAL": {
        "name": "2G GSM RxQual",
        "unit": "BER scale",
        "bins": [
            {"label": "0 - 2 (Good/Clean)", "min": float('-inf'), "max": 2.0001},
            {"label": "3 - 5 (Fair/Degraded)", "min": 2.0001, "max": 5.0001},
            {"label": "6 - 7 (Poor/Interference)", "min": 5.0001, "max": float('inf')},
        ],
        "kpi_target": "<= 2 (RxQual 0-2)",
        "target_max": 2.0001
    },
    "3G_RSCP": {
        "name": "3G UMTS RSCP",
        "unit": "dBm",
        "bins": [
            {"label": ">= -75 dBm (Excellent)", "min": -75.0, "max": float('inf')},
            {"label": "[-85, -75) dBm (Good)", "min": -85.0, "max": -75.0},
            {"label": "[-95, -85) dBm (Fair)", "min": -95.0, "max": -85.0},
            {"label": "[-105, -95) dBm (Poor)", "min": -105.0, "max": -95.0},
            {"label": "< -105 dBm (Critical)", "min": float('-inf'), "max": -105.0},
        ],
        "kpi_target": ">= -95 dBm",
        "target_min": -95.0
    },
    "3G_ECLO": {
        "name": "3G UMTS Ec/No (Ec/Io)",
        "unit": "dB",
        "bins": [
            {"label": ">= -8 dB (Excellent)", "min": -8.0, "max": float('inf')},
            {"label": "[-12, -8) dB (Good)", "min": -12.0, "max": -8.0},
            {"label": "[-15, -12) dB (Fair)", "min": -15.0, "max": -12.0},
            {"label": "< -15 dB (Poor/Pilot Pollution)", "min": float('-inf'), "max": -15.0},
        ],
        "kpi_target": ">= -15 dB",
        "target_min": -15.0
    },
    "4G_RSRP": {
        "name": "4G LTE RSRP",
        "unit": "dBm",
        "bins": [
            {"label": ">= -75 dBm (Excellent)", "min": -75.0, "max": float('inf')},
            {"label": "[-85, -75) dBm (Good)", "min": -85.0, "max": -75.0},
            {"label": "[-95, -85) dBm (Fair)", "min": -95.0, "max": -85.0},
            {"label": "[-105, -95) dBm (Poor)", "min": -105.0, "max": -95.0},
            {"label": "< -105 dBm (Critical/Coverage Hole)", "min": float('-inf'), "max": -105.0},
        ],
        "kpi_target": ">= -95 dBm",
        "target_min": -95.0
    },
    "4G_RSRQ": {
        "name": "4G LTE RSRQ",
        "unit": "dB",
        "bins": [
            {"label": ">= -12 dB (Excellent)", "min": -12.0, "max": float('inf')},
            {"label": "[-15, -12) dB (Good)", "min": -15.0, "max": -12.0},
            {"label": "[-18, -15) dB (Fair)", "min": -18.0, "max": -15.0},
            {"label": "< -18 dB (Poor/Interference)", "min": float('-inf'), "max": -18.0},
        ],
        "kpi_target": ">= -15 dB",
        "target_min": -15.0
    },
    "4G_SINR": {
        "name": "4G LTE SINR",
        "unit": "dB",
        "bins": [
            {"label": ">= 15 dB (Excellent / High MCS)", "min": 15.0, "max": float('inf')},
            {"label": "[10, 15) dB (Good / Nominal)", "min": 10.0, "max": 15.0},
            {"label": "[5, 10) dB (Fair / Low MCS)", "min": 5.0, "max": 10.0},
            {"label": "< 5 dB (Poor / High BLER)", "min": float('-inf'), "max": 5.0},
        ],
        "kpi_target": ">= 10 dB",
        "target_min": 10.0
    }
}

def parse_xlsx_values(file_path):
    values = []
    with zipfile.ZipFile(file_path, 'r') as z:
        tree = ET.fromstring(z.read('xl/worksheets/sheet1.xml'))
        rows = tree.findall('.//{http://schemas.openxmlformats.org/spreadsheetml/2006/main}row')
        for r in rows[1:]: # skip header
            cells = r.findall('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}c')
            if cells:
                # The last cell in the row contains the metric value
                v_tag = cells[-1].find('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}v')
                if v_tag is not None and v_tag.text is not None:
                    try:
                        val = float(v_tag.text.strip())
                        values.append(val)
                    except ValueError:
                        pass
    return values

def analyze_dataset():
    files = sorted(glob.glob("KUBWA_TABLE VIEW/*.xlsx"))
    results = {}
    
    for f in files:
        fname = os.path.basename(f).replace('.xlsx', '')
        # Format can be OPERATOR_TECH METRIC e.g. 9MOBILE_2G RXLEV or MTN_4G RSRQ
        parts = fname.replace(' ', '_').split('_')
        operator = parts[0]
        metric_key = parts[1] + "_" + parts[2]
        
        values = parse_xlsx_values(f)
        if not values:
            continue
            
        values.sort()
        count = len(values)
        avg_val = sum(values) / count
        p10 = values[int(count * 0.10)]
        p50 = values[int(count * 0.50)]
        p90 = values[int(count * 0.90)]
        min_v = values[0]
        max_v = values[-1]
        
        cfg = BENCHMARKS.get(metric_key)
        bin_counts = {b["label"]: 0 for b in cfg["bins"]}
        target_pass_count = 0
        
        for val in values:
            # check bins
            for b in cfg["bins"]:
                if b["min"] <= val < b["max"]:
                    bin_counts[b["label"]] += 1
                    break
            # check KPI pass
            if "target_min" in cfg:
                if val >= cfg["target_min"]:
                    target_pass_count += 1
            elif "target_max" in cfg:
                if val <= cfg["target_max"]:
                    target_pass_count += 1
                    
        bin_percentages = {k: round((v / count) * 100, 2) for k, v in bin_counts.items()}
        pass_rate = round((target_pass_count / count) * 100, 2)
        
        if metric_key not in results:
            results[metric_key] = {}
            
        results[metric_key][operator] = {
            "sample_count": count,
            "mean": round(avg_val, 2),
            "min": round(min_v, 2),
            "max": round(max_v, 2),
            "p10": round(p10, 2),
            "p50": round(p50, 2),
            "p90": round(p90, 2),
            "pass_rate_pct": pass_rate,
            "bins_pct": bin_percentages,
            "bins_count": bin_counts
        }
        
    return results

if __name__ == "__main__":
    res = analyze_dataset()
    print(json.dumps(res, indent=2))
