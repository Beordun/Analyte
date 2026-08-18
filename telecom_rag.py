"""
Telecom RNO Knowledge Base & Retrieval-Augmented Generation (RAG) Engine.
Provides domain-specific RCA, standard 3GPP/vendor optimization playbooks,
and prompts tailored for free/low-cost LLMs (Groq, Gemini Free, Ollama, OpenRouter).
"""

TELECOM_RNO_PLAYBOOKS = {
    "2G_POOR_RXLEV": {
        "title": "2G GSM Weak Coverage & Coverage Hole Mitigation",
        "triggers": ["RxLev < -92 dBm", "High percentage in [-105, -92) dBm bin"],
        "root_causes": [
            "Excessive inter-site distance (ISD) or missing dominant server",
            "Improper antenna electrical/mechanical down-tilt causing beam undershoot",
            "Obstruction by high-rise terrain/structures or dense foliage",
            "Feeder line attenuation, loose jumper connectors, or faulty TMA/combiner"
        ],
        "recommendations": [
            "Adjust antenna mechanical tilt (reduce downtilt by 1-2 degrees) to extend coverage footprint.",
            "Verify TRX max transmission power (ensure BCCH is operating at max nominal 43-45 dBm).",
            "Audit VSWR and feeder loss on BTS cabinet and antenna connectors.",
            "Identify site candidates for new IBS (In-Building Solution) or small cell micro-sites."
        ]
    },
    "2G_POOR_RXQUAL": {
        "title": "2G GSM Co-Channel / Adjacent Channel Interference & RxQual Degradation",
        "triggers": ["RxQual >= 3", "High percentage of samples in 3-5 and 6-7 bins"],
        "root_causes": [
            "BCCH/TCH frequency collision (Co-channel C/I < 9 dB or Adjacent C/A < -9 dB)",
            "Overshooting cells polluting neighboring clusters without handover definition",
            "Improper BSIC allocation causing false handover attempts or decoding failure",
            "External wideband repeater interference or cross-polarization misalignment"
        ],
        "recommendations": [
            "Execute automated Frequency & BSIC replanning (AFR / AFP) to resolve co/adjacent collisions.",
            "Increase antenna down-tilt on overshooting sectors (2-4 degrees mechanical/electrical).",
            "Enable Dynamic Frequency Hopping (Synthesized/Baseband Hopping) and Discontinuous Transmission (DTX).",
            "Audit handover neighbor relations and remove unreciprocated or orphan neighbor pairs."
        ]
    },
    "3G_POOR_RSCP": {
        "title": "3G UMTS Weak Coverage & RSCP Attenuation",
        "triggers": ["RSCP < -95 dBm", "High samples in [-105, -95) dBm"],
        "root_causes": [
            "Cell breathing effect under heavy downlink data/voice traffic load",
            "Sub-optimal primary scrambling code (PSC) transmission power allocation",
            "High penetration loss in suburban building clusters"
        ],
        "recommendations": [
            "Check CPICH (Common Pilot Channel) power settings (recommended 30-33 dBm / ~10% of total cell power).",
            "Balance downlink power allocation between voice DCH and HSDPA power pools.",
            "Optimize antenna tilt & azimuth to focus main lobe energy into traffic hot-spots."
        ]
    },
    "3G_POOR_ECNO": {
        "title": "3G UMTS Pilot Pollution & Downlink Ec/No Degradation",
        "triggers": ["Ec/No < -15 dB", "Poor Ec/No despite acceptable RSCP >= -85 dBm"],
        "root_causes": [
            "Pilot Pollution: More than 3 strong CPICH pilots within active set window (difference < 3-5 dB)",
            "PSC Collision or PSC confusion in overlapping coverage zones",
            "Overshooting 3G NodeB sectors transmitting across multiple dominant server boundaries"
        ],
        "recommendations": [
            "Increase antenna down-tilt on secondary/interfering cells to eliminate pilot pollution.",
            "Tune Active Set parameters: Increase 1A/1B handover hysteresis and filter coefficients.",
            "Re-plan PSC assignments to guarantee safe reuse distance (> ISD * 3).",
            "Audit and enable CPICH power reduction on non-dominant overshooting sectors."
        ]
    },
    "4G_POOR_RSRP": {
        "title": "4G LTE Coverage Hole & RSRP Degradation",
        "triggers": ["RSRP < -95 dBm", "High samples in [-105, -95) and < -105 dBm"],
        "root_causes": [
            "Weak dominant reference signal (RS) due to terrain blockage or large cell radius",
            "Over-tilted eNodeB antennas causing localized coverage craters",
            "Misaligned azimuth heading or wrong cross-feeder installation at eNodeB"
        ],
        "recommendations": [
            "Verify RS Power (Reference Signal Power) in eNodeB configuration (typical 15.2 - 18.2 dBm/RE).",
            "Audit physical antenna azimuths and mechanical tilt against network design nominal values.",
            "Check for cross-feeder connections using MIMO correlation and PCI drive test verification.",
            "Recommend candidate site for carrier addition (e.g. L900/L800 low-band layer) for coverage layer expansion."
        ]
    },
    "4G_POOR_RSRQ": {
        "title": "4G LTE High Interference & RSRQ Degradation (SINR/RSRQ drop)",
        "triggers": ["RSRQ < -15 dB", "High samples in [-18, -15) and < -18 dB"],
        "root_causes": [
            "PCI Mod3 / Mod6 / Mod30 collision causing Reference Signal (CRS) overlap and interference",
            "High inter-cell interference from neighboring eNodeBs without Inter-Cell Interference Coordination (ICIC)",
            "Heavy network PRB (Physical Resource Block) loading on neighboring co-channel sectors",
            "Overshooting LTE sectors creating multiple overlapping dominant servers"
        ],
        "recommendations": [
            "Re-plan PCI (Physical Cell Identity) to eliminate Mod3 (CRS overlap) and Mod30 (PUCCH DMRS collision).",
            "Down-tilt overshooting eNodeB sectors to confine RF energy within designated coverage polygons.",
            "Activate eICIC / CoMP (Coordinated Multi-Point) or dynamic power control features.",
            "Tune A3 handover offset and time-to-trigger (TTT) to facilitate timely handover to cleaner target cells."
        ]
    }
}

def generate_telecom_digest(analytics_data):
    """
    Transforms computed statistics into an executive digest suitable for LLM prompt ingestion.
    """
    summary = []
    summary.append("# DRIVE TEST BENCHMARK AUDIT & KPI REPORT")
    summary.append("## CLUSTER: KUBWA / MULTI-OPERATOR BENCHMARK\n")
    
    operators = ["9MOBILE", "AIRTEL", "GLO", "MTN"]
    
    # 1. Executive Benchmark Pass Rates
    summary.append("### 1. SUMMARY OF PASS RATES (COMPLIANCE TO RF TARGETS)")
    summary.append("| Operator | 2G RxLev (>= -92dBm) | 2G RxQual (0-2) | 3G RSCP (>= -95dBm) | 3G Ec/No (>= -15dB) | 4G RSRP (>= -95dBm) | 4G RSRQ (>= -15dB) |")
    summary.append("| :--- | :--- | :--- | :--- | :--- | :--- | :--- |")
    
    op_scores = {op: [] for op in operators}
    
    for op in operators:
        rxlev_p = analytics_data.get("2G_RXLEV", {}).get(op, {}).get("pass_rate_pct", "N/A")
        rxqual_p = analytics_data.get("2G_RXQUAL", {}).get(op, {}).get("pass_rate_pct", "N/A")
        rscp_p = analytics_data.get("3G_RSCP", {}).get(op, {}).get("pass_rate_pct", "N/A")
        ecno_p = analytics_data.get("3G_ECLO", {}).get(op, {}).get("pass_rate_pct", "N/A")
        rsrp_p = analytics_data.get("4G_RSRP", {}).get(op, {}).get("pass_rate_pct", "N/A")
        rsrq_p = analytics_data.get("4G_RSRQ", {}).get(op, {}).get("pass_rate_pct", "N/A")
        
        # Calculate composite score for ranking
        numeric_scores = [v for v in [rxlev_p, rxqual_p, rscp_p, ecno_p, rsrp_p, rsrq_p] if isinstance(v, (int, float))]
        avg_score = round(sum(numeric_scores) / len(numeric_scores), 2) if numeric_scores else 0
        op_scores[op] = avg_score
        
        summary.append(f"| **{op}** | {rxlev_p}% | {rxqual_p}% | {rscp_p}% | {ecno_p}% | {rsrp_p}% | {rsrq_p}% |")
        
    # Operator Ranking
    ranked_ops = sorted(op_scores.items(), key=lambda x: x[1], reverse=True)
    best_op, best_score = ranked_ops[0]
    worst_op, worst_score = ranked_ops[-1]
    
    summary.append(f"\n**Cluster Overall Ranking**:")
    for rank, (op, score) in enumerate(ranked_ops, 1):
        status = " (WORST PERFORMER)" if op == worst_op else (" (BEST PERFORMER)" if op == best_op else "")
        summary.append(f"{rank}. **{op}**: Composite Compliance Score = **{score}%**{status}")
        
    summary.append(f"\n**CRITICAL EVENT ALERT**: The worst-performing network provider in this drive test cluster is **{worst_op}** (Overall Compliance: {worst_score}%).")
    
    # 2. Detailed Technical Breakdown per Technology
    summary.append("\n### 2. DETAILED RF KPI ANALYSIS & BIN DISTRIBUTIONS")
    
    metrics = [
        ("2G GSM RxLev", "2G_RXLEV", "dBm"),
        ("2G GSM RxQual", "2G_RXQUAL", ""),
        ("3G UMTS RSCP", "3G_RSCP", "dBm"),
        ("3G UMTS Ec/No (Ec/Io)", "3G_ECLO", "dB"),
        ("4G LTE RSRP", "4G_RSRP", "dBm"),
        ("4G LTE RSRQ", "4G_RSRQ", "dB")
    ]
    
    for title, key, unit in metrics:
        data = analytics_data.get(key, {})
        if not data:
            continue
        summary.append(f"\n#### Metric: {title}")
        for op in operators:
            if op in data:
                op_data = data[op]
                summary.append(f"- **{op}** (Samples: {op_data['sample_count']}): Mean = {op_data['mean']}{unit}, p50 = {op_data['p50']}{unit}, p10 = {op_data['p10']}{unit}, Target Pass Rate = **{op_data['pass_rate_pct']}%**")
                summary.append(f"  * Bin Breakdown: {', '.join([f'{k}: {v}%' for k, v in op_data['bins_pct'].items()])}")
                
    return "\n".join(summary), ranked_ops

def create_rno_prompt(telecom_digest, ranked_ops):
    worst_op = ranked_ops[-1][0]
    best_op = ranked_ops[0][0]
    
    prompt = f"""You are a Senior Telecom Radio Network Optimization (RNO) & Drive Test Audit Specialist with 15+ years of tier-1 operator experience (Ericsson, Huawei, Nokia, 3GPP standards).

Analyze the following drive test benchmark summary from the Kubwa cluster and generate a professional, executive-ready, and technically rigorous RNO Audit & Optimization Report.

=== DRIVE TEST AUDIT DIGEST ===
{telecom_digest}

=== OPTIMIZATION PLAYBOOKS (KNOWLEDGE BASE) ===
- 2G RxLev Issues: Adjust electrical/mechanical tilts, check BCCH TX power (43-45 dBm), VSWR audit.
- 2G RxQual Issues: AFR/AFP frequency replanning, down-tilt overshooting cells, BSIC audit, activate Frequency Hopping/DTX.
- 3G RSCP & Ec/No Issues: CPICH power allocation check (10% / 30-33 dBm), pilot pollution resolution (eliminate >3 active pilots within 5dB), PSC re-allocation.
- 4G RSRP & RSRQ Issues: RS Power audit (15.2-18.2 dBm/RE), PCI Mod3/Mod6 collision elimination, overshooting tilt tuning, ICIC/eICIC enablement.

=== REQUIRED REPORT STRUCTURE ===
1. **EXECUTIVE SUMMARY**:
   - High-level overview of cluster RF health across 2G, 3G, and 4G.
   - Explicit identification and executive verdict on the **Worst-Performing Network Provider ({worst_op})** and the **Best Performer ({best_op})**.
   - Executive scorecard table comparing all operators.

2. **IN-DEPTH RF PERFORMANCE AUDIT PER TECHNOLOGY**:
   - **2G GSM Performance (RxLev & RxQual)**: Coverage vs. Quality analysis, identification of interference hotspots.
   - **3G UMTS Performance (RSCP & Ec/No)**: Coverage penetration vs. Pilot Pollution assessment.
   - **4G LTE Performance (RSRP & RSRQ)**: LTE coverage depth vs. Quality/Interference degradation (Highlight why 4G RSRP pass rates are low ~50-63%).

3. **ROOT CAUSE ANALYSIS (RCA)**:
   - Specific failure mechanisms driving poor KPIs for {worst_op} and other operators (e.g. coverage holes, pilot pollution, interference, CRS collision).

4. **CONCRETE ENGINEERING ACTION PLAN (PHYSICAL & PARAMETER TUNING)**:
   - Group recommendations into:
     a) **Immediate Low-Cost Physical Tweaks** (Tilt adjustment, Azimuth correction, Antenna heights, Connector/VSWR checks).
     b) **Soft Parameter / Radio Resource Tuning** (Power allocations, PCI/PSC/Frequency replanning, Handover hysteresis, Neighbor list cleanups).
     c) **Strategic Network Expansion** (New micro-sites, low-band carrier rollout e.g. L900/L800).

5. **CONCLUSION & REGULATORY COMPLIANCE ASSESSMENT**:
   - Compliance summary against standard QoS benchmarks.

Tone: Authoritative, senior engineering level, precise, data-backed with clear action items.
"""
    return prompt

if __name__ == "__main__":
    from telecom_analytics import analyze_dataset
    data = analyze_dataset()
    digest, ranking = generate_telecom_digest(data)
    print(digest)
    print("\n--- SAMPLE PROMPT GENERATED ---")
    prompt = create_rno_prompt(digest, ranking)
    print(prompt[:1000] + "...")
