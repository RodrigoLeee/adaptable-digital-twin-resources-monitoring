"""
Coleta os parquets gerados pelo OpenDC e constrói os datasets consolidados.

Saída:
  datasets/opendc_consolidated.csv      — todas as métricas por cenário
  datasets/opendc_consolidated.parquet
  datasets/opendc_ml_ready.csv          — features + targets para o modelo

Executar de dentro de src/opendc-simulation/:
  python scripts/collect_data.py
"""

import json
import sys
import pandas as pd
import numpy as np
from pathlib import Path

# ── Constantes ──────────────────────────────────────────────────────────────
PROJECT_ROOT  = Path(__file__).parent.parent
OUTPUT_DIR    = PROJECT_ROOT / "output" / "m7ixlarge_generated_workloads_experiment" / "raw-output"
DATASETS_DIR  = PROJECT_ROOT / "datasets"
PRICING_FILE  = PROJECT_ROOT / "pricing" / "pricing_metadata.json"

TOPOLOGY        = "m7i.xlarge"
N_HOSTS_TOPOLOGY = 100
MS_TO_S   = 1_000
MS_TO_H   = 3_600_000
J_TO_KWH  = 1 / 3_600_000

# Mapeamento: (índice OpenDC, nome lógico no CSV, pasta gerada, n_tasks esperado)
# O índice determina o subdiretório de saída: raw-output/{idx}/seed=0/
# O nome lógico é workload_0..6 — compatível com referência histórica
SCENARIOS = [
    (0, "workload_0", "01_min",                      10),
    (1, "workload_1", "02_very_low",                  25),
    (2, "workload_2", "03_low",                       50),
    (3, "workload_3", "04_medium",                   100),
    (4, "workload_4", "05_high",                     175),
    (5, "workload_5", "06_very_high",                250),
    (6, "workload_6", "07_max_experimental_useful",  350),
]

# Valores históricos de referência para validação visual
HISTORICAL_REF = {
    "workload_0": {"energy_total_kwh": 0.01978, "exec_mean_s": 0.090, "wait_mean_s": 0.375},
    "workload_1": {"energy_total_kwh": 0.02007, "exec_mean_s": 0.203, "wait_mean_s": 0.297},
    "workload_2": {"energy_total_kwh": 0.01622, "exec_mean_s": 0.221, "wait_mean_s": 0.494},
    "workload_3": {"energy_total_kwh": 0.01069, "exec_mean_s": 0.271, "wait_mean_s": 0.436},
    "workload_4": {"energy_total_kwh": 0.00884, "exec_mean_s": 0.295, "wait_mean_s": 0.467},
    "workload_5": {"energy_total_kwh": 0.00700, "exec_mean_s": 0.317, "wait_mean_s": 0.425},
    "workload_6": {"energy_total_kwh": 0.00709, "exec_mean_s": 0.358, "wait_mean_s": 0.543},
}

# ── Helpers ──────────────────────────────────────────────────────────────────

def load_pricing() -> float:
    if PRICING_FILE.exists():
        data = json.loads(PRICING_FILE.read_text(encoding="utf-8"))
        return float(data.get("price_usd_per_h", 0.1904))
    return 0.1904


def safe_get(df: pd.DataFrame, col: str, default=0):
    return df[col] if col in df.columns else pd.Series([default] * len(df))


def process_scenario(idx: int, name: str, seed_dir: Path, price_per_h: float) -> dict:
    df_host  = pd.read_parquet(seed_dir / "host.parquet")
    df_power = pd.read_parquet(seed_dir / "powerSource.parquet")
    df_svc   = pd.read_parquet(seed_dir / "service.parquet")
    df_task  = pd.read_parquet(seed_dir / "task.parquet")

    # ── Tempos (ms → s / h) ─────────────────────────────────────────────────
    wait_s  = ((df_task["schedule_time"] - df_task["submission_time"]) / MS_TO_S).clip(lower=0)
    exec_s  = ((df_task["finish_time"]   - df_task["schedule_time"])   / MS_TO_S).clip(lower=0)
    total_s = ((df_task["finish_time"]   - df_task["submission_time"]) / MS_TO_S).clip(lower=0)
    sim_duration_h = float(df_task["finish_time"].max()) / MS_TO_H

    # ── Energia ─────────────────────────────────────────────────────────────
    energy_total_kwh = float(df_power["energy_usage"].iloc[-1]) * J_TO_KWH

    # ── CPU ─────────────────────────────────────────────────────────────────
    cpu_util_mean_pct = float(df_host["cpu_utilization"].mean()) * 100 if "cpu_utilization" in df_host.columns else 0.0
    power_mean_w      = float(df_host["power_draw"].mean()) if "power_draw" in df_host.columns else 70.0

    # ── Hosts ativos ─────────────────────────────────────────────────────────
    n_hosts_active = int(df_task["host_name"].nunique()) if "host_name" in df_task.columns else N_HOSTS_TOPOLOGY

    # ── Métricas de serviço ───────────────────────────────────────────────────
    tasks_total     = int(safe_get(df_svc, "tasks_total").iloc[-1])     if "tasks_total"     in df_svc.columns else int(len(df_task))
    tasks_completed = int(safe_get(df_svc, "tasks_terminated").iloc[-1]) if "tasks_terminated" in df_svc.columns else int(len(df_task))
    tasks_pending_max = int(safe_get(df_svc, "tasks_pending").max())    if "tasks_pending"   in df_svc.columns else 0

    saturation_pct    = (tasks_pending_max / tasks_total * 100) if tasks_total > 0 else 0.0
    completion_rate_pct = (tasks_completed / tasks_total * 100) if tasks_total > 0 else 100.0

    # ── Derivadas ────────────────────────────────────────────────────────────
    estimated_cost_usd = n_hosts_active * sim_duration_h * price_per_h
    tasks_per_kwh      = tasks_completed / energy_total_kwh if energy_total_kwh > 0 else 0.0
    cost_per_task_usd  = estimated_cost_usd / tasks_completed if tasks_completed > 0 else 0.0

    # ── Carbon (opcional — pode não existir) ─────────────────────────────────
    carbon_emission_g = float(df_power["carbon_emission"].iloc[-1]) if "carbon_emission" in df_power.columns else 0.0

    return {
        "scenario":             name,
        "topology":             TOPOLOGY,
        "provider":             "AWS EC2",
        "instance_vcpus":       4,
        "instance_ram_gib":     16,
        "price_usd_per_h":      price_per_h,
        "seed":                 0,
        # Features ML
        "n_unique_tasks":       len(df_task),
        "n_hosts":              N_HOSTS_TOPOLOGY,
        "n_hosts_active":       n_hosts_active,
        "exec_mean_s":          round(float(exec_s.mean()), 6),
        "sim_duration_h":       round(sim_duration_h, 8),
        "sim_duration_s":       round(sim_duration_h * 3600, 4),
        # Targets ML
        "energy_total_kwh":     round(energy_total_kwh, 8),
        "wait_mean_s":          round(float(wait_s.mean()), 6),
        "wait_p95_s":           round(float(wait_s.quantile(0.95)), 6),
        "estimated_cost_usd":   round(estimated_cost_usd, 8),
        "cpu_util_mean_pct":    round(cpu_util_mean_pct, 6),
        "saturation_pct":       round(saturation_pct, 4),
        "completion_rate_pct":  round(completion_rate_pct, 4),
        # Análise
        "power_mean_w":         round(power_mean_w, 4),
        "total_time_mean_s":    round(float(total_s.mean()), 6),
        "tasks_total":          tasks_total,
        "tasks_completed":      tasks_completed,
        "tasks_per_kwh":        round(tasks_per_kwh, 2),
        "cost_per_task_usd":    round(cost_per_task_usd, 8),
        "carbon_emission_g":    round(carbon_emission_g, 4),
    }


# ── Main ─────────────────────────────────────────────────────────────────────

def main():
    DATASETS_DIR.mkdir(parents=True, exist_ok=True)
    price_per_h = load_pricing()
    print(f"Preço EC2 m7i.xlarge: ${price_per_h}/h\n")

    rows = []
    missing = []
    for idx, name, wl_folder, expected_n in SCENARIOS:
        seed_dir = OUTPUT_DIR / str(idx) / "seed=0"
        if not seed_dir.exists():
            print(f"  ⚠  {name} (idx={idx}): saída não encontrada em {seed_dir}")
            missing.append(name)
            continue

        print(f"  Processando {name} (índice {idx})...")
        try:
            row = process_scenario(idx, name, seed_dir, price_per_h)
            rows.append(row)
            ref = HISTORICAL_REF.get(name, {})
            energy_ok = abs(row["energy_total_kwh"] - ref.get("energy_total_kwh", 0)) < 0.005 if ref else True
            print(
                f"    tasks={row['n_unique_tasks']:>3} | "
                f"energy={row['energy_total_kwh']:.5f} kWh {'✓' if energy_ok else '≠'}"
                f" ref={ref.get('energy_total_kwh', '?'):.5f} | "
                f"exec={row['exec_mean_s']:.3f}s | "
                f"wait={row['wait_mean_s']:.3f}s | "
                f"compl={row['completion_rate_pct']:.1f}%"
            )
        except Exception as exc:
            print(f"    ERRO: {exc}")
            missing.append(name)

    if not rows:
        print("\nNenhum dado encontrado. Execute a simulação primeiro:")
        print("  bash scripts/run_simulations.sh")
        sys.exit(1)

    df = pd.DataFrame(rows)

    # Validação básica
    assert len(df) > 0, "Dataset vazio"
    assert df["completion_rate_pct"].min() >= 99.0, "Completion rate abaixo de 99% em algum cenário!"
    assert df["n_unique_tasks"].is_monotonic_increasing, "Cenários fora de ordem crescente de tasks"

    # ── Salvar consolidated ──────────────────────────────────────────────────
    df.to_csv(DATASETS_DIR / "opendc_consolidated.csv", index=False)
    df.to_parquet(DATASETS_DIR / "opendc_consolidated.parquet", index=False)

    # ── Salvar ML-ready ─────────────────────────────────────────────────────
    ml_cols = [
        "scenario", "n_unique_tasks", "exec_mean_s", "sim_duration_h", "n_hosts",
        "energy_total_kwh", "cpu_util_mean_pct", "estimated_cost_usd",
        "wait_mean_s", "saturation_pct", "completion_rate_pct",
    ]
    df[ml_cols].to_csv(DATASETS_DIR / "opendc_ml_ready.csv", index=False)

    print(f"\n✅ Salvos {len(df)} cenários em datasets/")
    if missing:
        print(f"⚠  Cenários ausentes: {missing}")

    # Tabela de comparação
    print("\n─── Resultado × Referência histórica ───────────────────────────────────────")
    print(f"{'Cenário':<12} {'Tasks':>5} {'Energy (kWh)':>14} {'Exec (s)':>9} {'Wait (s)':>9} {'Compl%':>7}")
    for _, row in df.iterrows():
        ref = HISTORICAL_REF.get(row["scenario"], {})
        print(
            f"{row['scenario']:<12} "
            f"{row['n_unique_tasks']:>5} "
            f"{row['energy_total_kwh']:>14.5f} "
            f"{row['exec_mean_s']:>9.3f} "
            f"{row['wait_mean_s']:>9.3f} "
            f"{row['completion_rate_pct']:>7.1f}"
        )

    print("\n─── Referência histórica ────────────────────────────────────────────────────")
    for name, ref in HISTORICAL_REF.items():
        print(
            f"{name:<12} "
            f"      "
            f"{ref['energy_total_kwh']:>14.5f} "
            f"{ref['exec_mean_s']:>9.3f} "
            f"{ref['wait_mean_s']:>9.3f}"
        )


if __name__ == "__main__":
    main()
