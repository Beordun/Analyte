"""
Telecom RNO Training & Few-Shot In-Context Grounding Library.
Derived from the Kubwa Multi-Operator Drive Test Benchmark Dataset (22 Excel log tables).

This module prepares golden training pairs and few-shot exemplars so that any free/cheap LLM
(Groq Llama-3.3-70B, Google AI Studio Gemini Flash, Ollama DeepSeek-R1 / Qwen2.5) learns the exact
mathematical evaluation, root cause diagnosis, and physical/soft optimization action planning
of an expert Telecom RNO & Drive Test Specialist.
"""

import os
import json
from telecom_analytics import analyze_dataset, BENCHMARKS
from telecom_rag import generate_telecom_digest
from llm_client import generate_deterministic_expert_report

# 1. Structured Golden Training Examples (Few-Shot Prompts)
FEW_SHOT_RNO_EXEMPLARS = [
    {
        "id": "kubwa_multi_operator_benchmark_audit",
        "scenario": "Multi-Operator Cluster Drive Test Audit (2G/3G/4G Benchmark)",
        "input_context": {
            "cluster": "Kubwa, Abuja",
            "technologies": ["2G GSM", "3G UMTS", "4G LTE"],
            "operators": ["9MOBILE", "AIRTEL", "GLO", "MTN"],
            "benchmarks": {
                "2G_RxLev": ">= -92 dBm (Excellent >= -74, Good -84, Fair -92, Poor -105, Critical < -105)",
                "2G_RxQual": "0 - 2 (Clean) vs 3 - 5 (Degraded) vs 6 - 7 (Severe Interference)",
                "3G_RSCP": ">= -95 dBm (Excellent >= -75, Good -85, Fair -95)",
                "3G_EcNo": ">= -15 dB (Pilot Pollution < -15 dB)",
                "4G_RSRP": ">= -95 dBm (Coverage Hole < -105 dBm)",
                "4G_RSRQ": ">= -15 dB (Interference / CRS Collision < -18 dB)"
            },
            "kpi_pass_rates": {
                "9MOBILE": {"2G_RxLev": "97.56%", "2G_RxQual": "86.16%", "3G_RSCP": "99.38%", "3G_EcNo": "97.62%", "4G_RSRP": "N/A", "4G_RSRQ": "N/A"},
                "AIRTEL":  {"2G_RxLev": "87.11%", "2G_RxQual": "82.91%", "3G_RSCP": "99.90%", "3G_EcNo": "95.81%", "4G_RSRP": "55.73%", "4G_RSRQ": "50.42%"},
                "GLO":     {"2G_RxLev": "96.59%", "2G_RxQual": "88.89%", "3G_RSCP": "95.35%", "3G_EcNo": "95.60%", "4G_RSRP": "49.80%", "4G_RSRQ": "92.97%"},
                "MTN":     {"2G_RxLev": "95.87%", "2G_RxQual": "87.96%", "3G_RSCP": "99.15%", "3G_EcNo": "97.52%", "4G_RSRP": "63.10%", "4G_RSRQ": "71.00%"}
            }
        },
        "expected_rno_output": {
            "worst_performer": "AIRTEL (78.65% overall compliance)",
            "best_performer": "9MOBILE (95.18% overall compliance)",
            "primary_bottlenecks": [
                "Airtel 4G RSRP coverage failure in 44.27% of route (7.36% in critical coverage holes < -105 dBm).",
                "Airtel 4G RSRQ quality collapse failing 49.58% (17.69% in severe interference < -18 dB due to PCI Mod3 CRS collision).",
                "Airtel 2G RxLev weak signal failure (12.89% < -92 dBm)."
            ],
            "action_plan": {
                "physical_tweaks": [
                    "Airtel: Reduce antenna mechanical down-tilt by 1.5° - 2.0° on peripheral expressway eNodeBs.",
                    "Audit VSWR and feeder loss on BTS sectors with RxLev < -105 dBm."
                ],
                "soft_parameter_tuning": [
                    "Re-plan 4G Physical Cell IDs (PCIs) to eliminate all Modulo 3 and Modulo 6 CRS collisions.",
                    "Boost Reference Signal Power (RS Power) by +1.5 dB on macro eNodeBs.",
                    "Execute Automated Frequency Replanning (AFR) and enable Baseband Frequency Hopping on 2G."
                ]
            }
        }
    }
]

def build_training_dataset_jsonl(output_path="training_dataset_kubwa.jsonl"):
    """
    Exports structured prompt-completion pairs in OpenAI/Alpaca/JSONL fine-tuning format.
    """
    analytics_data = analyze_dataset()
    digest, ranking = generate_telecom_digest(analytics_data)
    expert_report = generate_deterministic_expert_report(digest, ranking, analytics_data)
    
    entries = [
        {
            "messages": [
                {
                    "role": "system",
                    "content": "You are a Senior Telecom Radio Network Optimization (RNO) & Drive Test Audit Specialist. Evaluate drive test table data with exact mathematical accuracy, identify the worst-performing operator, perform root cause analysis, and specify physical and soft parameter recommendations."
                },
                {
                    "role": "user",
                    "content": f"Analyze the following multi-operator drive test benchmark data from the Kubwa cluster and generate a comprehensive Senior RNO audit report:\n\n{digest}"
                },
                {
                    "role": "assistant",
                    "content": expert_report
                }
            ]
        }
    ]
    
    with open(output_path, "w", encoding="utf-8") as f:
        for entry in entries:
            f.write(json.dumps(entry) + "\n")
            
    print(f"[+] Training dataset saved: {os.path.abspath(output_path)}")
    return output_path

def get_few_shot_prompt_prefix():
    """
    Returns a formatted few-shot prompt section to ground any free/budget LLM.
    """
    ex = FEW_SHOT_RNO_EXEMPLARS[0]
    return f"""
=== FEW-SHOT EXPERT RNO REFERENCE (KUBWA CLUSTER GROUNDING) ===
SCENARIO: {ex['scenario']}
EXPECTED EVALUATION LOGIC:
1. Operator Ranking & Worst Performer: Identify the lowest scoring operator based on composite compliance across 2G/3G/4G. (e.g. {ex['expected_rno_output']['worst_performer']})
2. Root Cause Breakdown:
   - 4G RSRP < -95 dBm -> Coverage holes from aggressive downtilts or low RS power.
   - 4G RSRQ < -15 dB -> Inter-cell interference or PCI Mod3/Mod6 CRS collision.
   - 3G Ec/No < -15 dB with high RSCP -> 3G Pilot pollution (>3 active CPICH pilots).
   - 2G RxQual >= 3 -> Co-channel / Adjacent channel BCCH/TCH frequency collision.
3. Prescribe concrete physical actions (tilt up/down by specific degrees, azimuth re-orientation) and soft parameter changes (RS power boost, PCI replan, AFR).
==============================================================
"""

if __name__ == "__main__":
    build_training_dataset_jsonl()
