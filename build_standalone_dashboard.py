import os
import json

from telecom_exact_tables import calculate_exact_telecom_tables
from telecom_analytics import analyze_dataset
from telecom_rag import generate_telecom_digest
from llm_client import generate_deterministic_expert_report

def generate_static_dashboard():
    print("[*] Performing exact 2G, 3G, 4G table calculations on drive test dataset...")
    exact_tables = calculate_exact_telecom_tables("KUBWA_TABLE VIEW")
    analytics_data = analyze_dataset()
    digest, ranking = generate_telecom_digest(analytics_data)
    report_md = generate_deterministic_expert_report(digest, ranking, analytics_data)
    
    exact_tables_json_str = json.dumps(exact_tables)
    analytics_json_str = json.dumps(analytics_data)
    digest_json_str = json.dumps({"digest": digest, "ranking": ranking})
    report_json_str = json.dumps(report_md)
    
    # Read template files
    with open("web/index.html", "r", encoding="utf-8") as f:
        html = f.read()
    with open("tokens/typography.css", "r", encoding="utf-8") as f:
        typography = f.read()
    with open("web/index.css", "r", encoding="utf-8") as f:
        css = f.read()
    with open("web/app.js", "r", encoding="utf-8") as f:
        js = f.read()
        
    # Replace external css link with embedded style
    embedded_html = html.replace('<link rel="stylesheet" href="/tokens/typography.css">', f'<style>\n{typography}\n</style>')
    embedded_html = embedded_html.replace('<link rel="stylesheet" href="/web/index.css">', f'<style>\n{css}\n</style>')
    
    # Inject data loader into app.js
    injected_js = f"""
    // Injected Exact Benchmark Tables and Audit Data
    const EMBEDDED_EXACT_TABLES = {exact_tables_json_str};
    const EMBEDDED_ANALYTICS = {analytics_json_str};
    const EMBEDDED_DIGEST = {digest_json_str};
    const EMBEDDED_REPORT = {report_json_str};

    {js}
    """
    
    embedded_html = embedded_html.replace('<script src="/web/app.js"></script>', f'<script>\n{injected_js}\n</script>')
    
    out_file = "Telecom_RNO_Dashboard.html"
    with open(out_file, "w", encoding="utf-8") as f:
        f.write(embedded_html)
        
    print(f"[+] Standalone Dashboard with Exact Tables generated successfully: {os.path.abspath(out_file)}")
    return os.path.abspath(out_file)

if __name__ == "__main__":
    generate_static_dashboard()
