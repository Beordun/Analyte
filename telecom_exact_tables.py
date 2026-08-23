"""
Telecom RF Table Benchmark Engine.
Computes exact cumulative percentage metrics matching senior RNO drive test audit standards:
- 2G: Rx Level (>=-105, >=-92, >=-84, >=-74), RxQual (>=5, >=2)
- 3G: % 3G Coverage Reliability (RSCP >= -75dBm), 3G Quality - ECNO >= -15
- 4G: RSRP (>=-95, >=-85, >=-75), RSRQ (>=-12, >=-15, >=-18)
"""

import zipfile
import xml.etree.ElementTree as ET
import glob
import os
import json

def parse_xlsx_values_fast(file_path):
    """
    Extracts raw numerical measurement samples from any TEMS/NEMO xlsx table.
    """
    values = []
    if not os.path.exists(file_path):
        return values
    try:
        with zipfile.ZipFile(file_path, 'r') as z:
            if 'xl/worksheets/sheet1.xml' not in z.namelist():
                return values
            tree = ET.fromstring(z.read('xl/worksheets/sheet1.xml'))
            rows = tree.findall('.//{http://schemas.openxmlformats.org/spreadsheetml/2006/main}row')
            for r in rows[1:]: # skip header row
                cells = r.findall('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}c')
                if cells:
                    # Last column typically holds metric value in TEMS table views
                    v_tag = cells[-1].find('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}v')
                    if v_tag is not None and v_tag.text is not None:
                        try:
                            val = float(v_tag.text.strip())
                            values.append(val)
                        except ValueError:
                            pass
    except Exception as e:
        print(f"Error reading {file_path}: {e}")
    return values

def calculate_exact_telecom_tables(files_or_dir="KUBWA_TABLE VIEW"):
    """
    Scans files and computes exact cumulative tables for 2G, 3G, and 4G across all operators.
    """
    if isinstance(files_or_dir, str) and os.path.isdir(files_or_dir):
        files = glob.glob(os.path.join(files_or_dir, "*.xlsx"))
    elif isinstance(files_or_dir, list):
        files = files_or_dir
    else:
        files = glob.glob("KUBWA_TABLE VIEW/*.xlsx")
        
    # Categorize samples: data_store[tech][operator][metric] = list of float values
    # e.g. data_store['2G']['MTN']['RXLEV'] = [...]
    raw_data = {
        "2G": {},
        "3G": {},
        "4G": {}
    }
    
    operators_detected = set()
    
    for f in files:
        fname = os.path.basename(f).replace('.xlsx', '')
        parts = fname.replace(' ', '_').split('_')
        if len(parts) < 3:
            continue
        op = parts[0].upper()
        tech = parts[1].upper()
        metric = parts[2].upper()
        
        operators_detected.add(op)
        if tech not in raw_data:
            raw_data[tech] = {}
        if op not in raw_data[tech]:
            raw_data[tech][op] = {}
            
        vals = parse_xlsx_values_fast(f)
        raw_data[tech][op][metric] = vals

    # Ordered list of operators (standardized)
    ops_list = sorted(list(operators_detected))
    
    # ---------------- 2G GSM TABLE ----------------
    table_2g = {
        "title": "2G GSM Drive Test Coverage & Quality Benchmark",
        "operators": ops_list,
        "rows": [
            {
                "kpi": "2G - Rx Level (Outdoor Coverage) >=-105 (%)",
                "values": {}
            },
            {
                "kpi": "2G - Rx Level (Outdoor Coverage) >=-92 (%)",
                "values": {}
            },
            {
                "kpi": "2G - Rx Level (Incar Coverage) >=-84 (%)",
                "values": {}
            },
            {
                "kpi": "2G - Rx Level (Indoor Coverage) >=-74 (%)",
                "values": {}
            },
            {
                "kpi": "2G - Quality - Rxqual >= 5 (%)",
                "values": {}
            },
            {
                "kpi": "2G - Quality - Rxqual >= 2 (%)",
                "values": {}
            }
        ]
    }
    
    for op in ops_list:
        rxlev = raw_data.get("2G", {}).get(op, {}).get("RXLEV", [])
        rxqual = raw_data.get("2G", {}).get(op, {}).get("RXQUAL", [])
        
        n_lev = len(rxlev)
        n_qual = len(rxqual)
        
        # RxLev benchmarks
        p_105 = round((sum(1 for x in rxlev if x >= -105.0) / n_lev * 100), 2) if n_lev > 0 else "N/A"
        p_92  = round((sum(1 for x in rxlev if x >= -92.0) / n_lev * 100), 2) if n_lev > 0 else "N/A"
        p_84  = round((sum(1 for x in rxlev if x >= -84.0) / n_lev * 100), 2) if n_lev > 0 else "N/A"
        p_74  = round((sum(1 for x in rxlev if x >= -74.0) / n_lev * 100), 2) if n_lev > 0 else "N/A"
        
        # RxQual benchmarks (>= 5 and >= 2)
        p_q5  = round((sum(1 for x in rxqual if x >= 5.0) / n_qual * 100), 2) if n_qual > 0 else "N/A"
        p_q2  = round((sum(1 for x in rxqual if x >= 2.0) / n_qual * 100), 2) if n_qual > 0 else "N/A"
        
        table_2g["rows"][0]["values"][op] = f"{p_105}%" if p_105 != "N/A" else "N/A"
        table_2g["rows"][1]["values"][op] = f"{p_92}%" if p_92 != "N/A" else "N/A"
        table_2g["rows"][2]["values"][op] = f"{p_84}%" if p_84 != "N/A" else "N/A"
        table_2g["rows"][3]["values"][op] = f"{p_74}%" if p_74 != "N/A" else "N/A"
        table_2g["rows"][4]["values"][op] = f"{p_q5}%" if p_q5 != "N/A" else "N/A"
        table_2g["rows"][5]["values"][op] = f"{p_q2}%" if p_q2 != "N/A" else "N/A"

    # ---------------- 3G UMTS TABLE ----------------
    table_3g = {
        "title": "3G UMTS Drive Test Coverage Reliability & Quality Benchmark",
        "operators": ops_list,
        "rows": [
            {
                "kpi": "% 3G Coverage Reliability (RSCP >= - 75dBm)",
                "values": {}
            },
            {
                "kpi": "3G - Quality - ECNO >=-15 (%)",
                "values": {}
            }
        ]
    }
    
    for op in ops_list:
        rscp = raw_data.get("3G", {}).get(op, {}).get("RSCP", [])
        ecno = raw_data.get("3G", {}).get(op, {}).get("ECLO", [])
        
        n_rscp = len(rscp)
        n_ecno = len(ecno)
        
        p_rscp75 = round((sum(1 for x in rscp if x >= -75.0) / n_rscp * 100), 2) if n_rscp > 0 else "N/A"
        p_ecno15 = round((sum(1 for x in ecno if x >= -15.0) / n_ecno * 100), 2) if n_ecno > 0 else "N/A"
        
        table_3g["rows"][0]["values"][op] = f"{p_rscp75}%" if p_rscp75 != "N/A" else "N/A"
        table_3g["rows"][1]["values"][op] = f"{p_ecno15}%" if p_ecno15 != "N/A" else "N/A"

    # ---------------- 4G LTE TABLE ----------------
    table_4g = {
        "title": "4G LTE Drive Test Coverage & Quality Benchmark",
        "operators": ops_list,
        "rows": [
            {
                "kpi": "4G - Outdoor Coverage - RSRP >=-95 (%)",
                "values": {}
            },
            {
                "kpi": "4G - Incar Coverage - RSRP >=-85 (%)",
                "values": {}
            },
            {
                "kpi": "4G - Indoor Coverage - RSRP >=-75 (%)",
                "values": {}
            },
            {
                "kpi": "4G - Quality - RSRQ >=-12 (%)",
                "values": {}
            },
            {
                "kpi": "4G - Quality - RSRQ >=-15 (%)",
                "values": {}
            },
            {
                "kpi": "4G - Quality - RSRQ >=-18 (%)",
                "values": {}
            },
            {
                "kpi": "4G - Quality - SINR >= 15 (%)",
                "values": {}
            },
            {
                "kpi": "4G - Quality - SINR >= 10 (%)",
                "values": {}
            },
            {
                "kpi": "4G - Quality - SINR >= 5 (%)",
                "values": {}
            }
        ]
    }
    
    for op in ops_list:
        rsrp = raw_data.get("4G", {}).get(op, {}).get("RSRP", [])
        rsrq = raw_data.get("4G", {}).get(op, {}).get("RSRQ", [])
        sinr = raw_data.get("4G", {}).get(op, {}).get("SINR", [])
        
        n_rsrp = len(rsrp)
        n_rsrq = len(rsrq)
        n_sinr = len(sinr)
        
        p_rsrp95 = round((sum(1 for x in rsrp if x >= -95.0) / n_rsrp * 100), 2) if n_rsrp > 0 else "N/A"
        p_rsrp85 = round((sum(1 for x in rsrp if x >= -85.0) / n_rsrp * 100), 2) if n_rsrp > 0 else "N/A"
        p_rsrp75 = round((sum(1 for x in rsrp if x >= -75.0) / n_rsrp * 100), 2) if n_rsrp > 0 else "N/A"
        
        p_rsrq12 = round((sum(1 for x in rsrq if x >= -12.0) / n_rsrq * 100), 2) if n_rsrq > 0 else "N/A"
        p_rsrq15 = round((sum(1 for x in rsrq if x >= -15.0) / n_rsrq * 100), 2) if n_rsrq > 0 else "N/A"
        p_rsrq18 = round((sum(1 for x in rsrq if x >= -18.0) / n_rsrq * 100), 2) if n_rsrq > 0 else "N/A"

        p_sinr15 = round((sum(1 for x in sinr if x >= 15.0) / n_sinr * 100), 2) if n_sinr > 0 else "N/A"
        p_sinr10 = round((sum(1 for x in sinr if x >= 10.0) / n_sinr * 100), 2) if n_sinr > 0 else "N/A"
        p_sinr5  = round((sum(1 for x in sinr if x >= 5.0) / n_sinr * 100), 2) if n_sinr > 0 else "N/A"
        
        table_4g["rows"][0]["values"][op] = f"{p_rsrp95}%" if p_rsrp95 != "N/A" else "N/A"
        table_4g["rows"][1]["values"][op] = f"{p_rsrp85}%" if p_rsrp85 != "N/A" else "N/A"
        table_4g["rows"][2]["values"][op] = f"{p_rsrp75}%" if p_rsrp75 != "N/A" else "N/A"
        table_4g["rows"][3]["values"][op] = f"{p_rsrq12}%" if p_rsrq12 != "N/A" else "N/A"
        table_4g["rows"][4]["values"][op] = f"{p_rsrq15}%" if p_rsrq15 != "N/A" else "N/A"
        table_4g["rows"][5]["values"][op] = f"{p_rsrq18}%" if p_rsrq18 != "N/A" else "N/A"
        table_4g["rows"][6]["values"][op] = f"{p_sinr15}%" if p_sinr15 != "N/A" else "N/A"
        table_4g["rows"][7]["values"][op] = f"{p_sinr10}%" if p_sinr10 != "N/A" else "N/A"
        table_4g["rows"][8]["values"][op] = f"{p_sinr5}%" if p_sinr5 != "N/A" else "N/A"

    return {
        "operators": ops_list,
        "table_2g": table_2g,
        "table_3g": table_3g,
        "table_4g": table_4g
    }

if __name__ == "__main__":
    tables = calculate_exact_telecom_tables()
    print(json.dumps(tables, indent=2))
